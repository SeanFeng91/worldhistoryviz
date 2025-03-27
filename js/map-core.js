import { MapStyles } from './map-styles.js';
import { MapEvents } from './map-events.js';
import { MapMigrations } from './map-migrations.js';
import { MapFeatures } from './map-features.js';
import { MapUtils } from './map-utils.js';

export class MapCore {
    constructor(options = {}) {
        this.mapContainer = options.mapContainer || 'map';
        this.defaultCenter = options.defaultCenter || [30, 110];
        this.defaultZoom = options.defaultZoom || 3;
        this.currentYear = options.initialYear || -10000;
        
        this.styles = new MapStyles();
        this.events = new MapEvents(this);
        this.migrations = new MapMigrations(this);
        this.features = new MapFeatures(this);
        this.utils = new MapUtils();
        
        this.map = null;
        this.geoJSONLayer = null;
        this.currentGeoJSON = null;
        
        // 所有可用的地图年份 - 与MapUtils.mapYears保持一致
        this.availableMapYears = [
            -123000, -10000, -8000, -5000, -4000, -3000, -2000, -1500, -1000, -700, -500, -400, -323, -300, -200, -100, -1,
            100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1279, 1300, 1400, 1492, 1500, 1530, 1600, 1650, 
            1700, 1715, 1783, 1800, 1815, 1880, 1900, 1914, 1920, 1930, 1938, 1945, 1960, 1994, 2000, 2010
        ];
    }

    async initialize() {
        // 初始化地图
        this.map = L.map(this.mapContainer, {
            center: this.defaultCenter,
            zoom: this.defaultZoom,
            zoomControl: false,
            minZoom: 2,
            maxZoom: 8,
            // 禁止水平循环
            worldCopyJump: false,
            maxBoundsViscosity: 1.0,
            // 限制地图缩放范围
            bounceAtZoomLimits: true
        });
        
        // 设置地图边界，调整为更紧凑的边界
        // [-90, -180]到[90, 180]是地球的实际坐标范围
        const southWest = L.latLng(-90, -185);
        const northEast = L.latLng(90, 185);
        const bounds = L.latLngBounds(southWest, northEast);
        this.map.setMaxBounds(bounds);

        // 添加底图，使用noWrap选项防止地图水平重复
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            noWrap: true,
            bounds: bounds
        }).addTo(this.map);
        
        // 添加缩放控件，但放在右下角
        L.control.zoom({
            position: 'bottomright'
        }).addTo(this.map);

        // 监听缩放事件，确保地图视图始终保持在合适的显示范围内
        this.map.on('zoom', () => {
            this.enforceMapConstraints();
        });
        
        // 监听拖动结束事件，确保地图边界正确
        this.map.on('moveend', () => {
            this.enforceMapConstraints();
        });

        // 加载初始GeoJSON数据
        await this.loadGeoJSON();
        
        // 初始化子模块
        await Promise.all([
            this.events.initialize(),
            this.migrations.initialize(),
            this.features.initialize()
        ]);
        
        // 确保地图初始视图是一个全球视图
        this.resetMapView();
    }

    async updateToYear(year) {
        this.currentYear = year;
        
        // 更新地图数据
        await this.loadGeoJSON();
        
        // 更新各个子模块
        await Promise.all([
            this.events.updateToYear(year),
            this.migrations.updateToYear(year),
            this.features.updateToYear(year)
        ]);
    }

    // 找到最接近当前年份的可用地图
    findClosestMapYear(year) {
        // 对于公元前年份，转换为负数表示
        const normalizedYear = year < 0 ? year : year;
        
        // 找到最接近的年份
        return this.availableMapYears.reduce((prev, curr) => {
            return (Math.abs(curr - normalizedYear) < Math.abs(prev - normalizedYear)) ? curr : prev;
        });
    }
    
    // 将年份转换为地图文件名
    yearToMapFilename(year) {
        // 对于公元前的年份
        if (year < 0) {
            return `world_bc${Math.abs(year)}.geojson`;
        }
        // 对于公元后的年份
        return `world_${year}.geojson`;
    }

    async loadGeoJSON() {
        try {
            // 找到最接近当前年份的地图文件
            const closestYear = this.findClosestMapYear(this.currentYear);
            const mapFilename = this.yearToMapFilename(closestYear);
            const mapPath = `maps/geojson/${mapFilename}`;
            
            console.log(`加载地图文件: ${mapPath}, 对应年份: ${closestYear}`);
            
            // 先尝试使用MapUtils的方法加载，它有更健壮的错误处理
            try {
                const geoJSONData = await this.utils.loadHistoricalMap(this.currentYear);
                if (geoJSONData && geoJSONData.features && geoJSONData.features.length > 0) {
                    this.currentGeoJSON = geoJSONData;
                    await this.updateGeoJSONLayer();
                    return;
                }
            } catch (utilsError) {
                console.warn('使用MapUtils加载地图失败，尝试直接加载:', utilsError);
            }
            
            // 如果MapUtils方法失败，尝试直接加载
            const response = await fetch(mapPath);
            if (!response.ok) {
                throw new Error(`无法加载地图文件: ${mapPath}, 状态码: ${response.status}`);
            }
            this.currentGeoJSON = await response.json();
            await this.updateGeoJSONLayer();
        } catch (error) {
            console.error('加载地图GeoJSON数据失败:', error);
            throw error;
        }
    }

    async updateGeoJSONLayer() {
        if (this.geoJSONLayer) {
            this.map.removeLayer(this.geoJSONLayer);
        }

        this.geoJSONLayer = L.geoJSON(this.currentGeoJSON, {
            style: (feature) => this.styles.getGeoJSONStyle(feature),
            onEachFeature: (feature, layer) => this.styles.onEachFeature(feature, layer, this)
        }).addTo(this.map);
    }

    // 强制执行地图约束，确保地图视图在合理范围内
    enforceMapConstraints() {
        // 获取当前地图视图的边界
        const currentBounds = this.map.getBounds();
        const currentZoom = this.map.getZoom();
        
        // 获取当前中心点
        const center = this.map.getCenter();
        let lat = center.lat;
        let lng = center.lng;
        let needsUpdate = false;
        
        // 限制经度范围在[-180, 180]之间
        if (lng < -180) {
            lng = -180;
            needsUpdate = true;
        }
        if (lng > 180) {
            lng = 180;
            needsUpdate = true;
        }
        
        // 限制纬度范围在[-85, 85]之间，以避免墨卡托投影变形
        if (lat < -85) {
            lat = -85;
            needsUpdate = true;
        }
        if (lat > 85) {
            lat = 85;
            needsUpdate = true;
        }
        
        // 如果是小缩放级别（全球视图），确保可以看到整个世界地图
        if (currentZoom <= 2) {
            // 计算世界地图的理想中心，可能需要根据你的地图内容调整
            const idealCenter = [20, 0]; // 一个大致在全球中央的位置
            const viewportWidth = currentBounds.getEast() - currentBounds.getWest();
            
            // 如果视口宽度不足以看到整个世界，调整缩放级别
            if (viewportWidth < 360) {
                this.map.setZoom(2);
                needsUpdate = false; // 缩放会自动触发moveend，避免重复更新
            }
            
            // 如果需要更新视图位置
            if (needsUpdate) {
                this.map.setView([lat, lng], currentZoom, {animate: false});
            }
        } else if (needsUpdate) {
            // 对于其他缩放级别，如果需要更新，则更新中心点
            this.map.setView([lat, lng], currentZoom, {animate: false});
        }
    }
    
    // 重置地图视图到全球视图
    resetMapView() {
        this.map.setView(this.defaultCenter, this.defaultZoom, {animate: false});
        this.enforceMapConstraints();
    }

    // 其他核心方法...
} 