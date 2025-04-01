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
        this.mapEvents = new MapEvents(this);
        // 确保events引用指向mapEvents，解决category-btn筛选问题
        this.events = this.mapEvents;
        
        this.mapMigrations = new MapMigrations(this);
        this.mapFeatures = new MapFeatures(this);
        this.utils = new MapUtils();
        
        this.map = null;
        this.geoJSONLayer = null;
        this.currentGeoJSON = null;
        
        // 不再直接定义年份列表，而是从 MapUtils 引用
        console.log('MapCore 已初始化，events引用已创建');
    }

    async initialize() {
        console.log('开始初始化 MapCore...');
        try {
            // 检查地图容器
            const mapContainer = document.getElementById(this.mapContainer);
            if (!mapContainer) {
                throw new Error(`找不到地图容器: #${this.mapContainer}`);
            }
            console.log(`找到地图容器元素: #${this.mapContainer}，尺寸: ${mapContainer.clientWidth}x${mapContainer.clientHeight}`);

            // 初始化地图
            console.log('创建Leaflet地图实例...');
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
            console.log('Leaflet地图实例创建成功');
            
            // 设置地图边界，调整为更紧凑的边界
            // [-90, -180]到[90, 180]是地球的实际坐标范围
            const southWest = L.latLng(-90, -185);
            const northEast = L.latLng(90, 185);
            const bounds = L.latLngBounds(southWest, northEast);
            this.map.setMaxBounds(bounds);
            console.log('地图边界设置成功');

            // 添加底图，使用noWrap选项防止地图水平重复
            console.log('添加底图图层...');
            try {
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    noWrap: true,
                    bounds: bounds
                }).addTo(this.map);
                console.log('底图图层添加成功');
            } catch (tileError) {
                console.error('添加底图图层失败:', tileError);
                // 尝试使用备用底图
                try {
                    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors',
                        noWrap: true,
                        bounds: bounds
                    }).addTo(this.map);
                    console.log('备用底图图层添加成功');
                } catch (backupTileError) {
                    console.error('添加备用底图图层也失败:', backupTileError);
                    throw new Error('无法加载地图底图');
                }
            }
            
            // 添加缩放控件，但放在右下角
            console.log('添加缩放控件...');
            L.control.zoom({
                position: 'bottomright'
            }).addTo(this.map);
            console.log('缩放控件添加成功');

            // 监听缩放事件，确保地图视图始终保持在合适的显示范围内
            console.log('设置地图事件监听器...');
            this.map.on('zoom', () => {
                this.enforceMapConstraints();
            });
            
            // 监听拖动结束事件，确保地图边界正确
            this.map.on('moveend', () => {
                this.enforceMapConstraints();
            });
            console.log('地图事件监听器设置成功');

            // 加载初始GeoJSON数据
            console.log('加载初始GeoJSON数据...');
            try {
                await this.loadGeoJSON();
                console.log('初始GeoJSON数据加载成功');
            } catch (geoJSONError) {
                console.error('加载初始GeoJSON数据失败，但将继续初始化:', geoJSONError);
                // 不中断初始化过程
            }
            
            // 初始化子模块
            console.log('初始化地图子模块...');
            try {
                await Promise.all([
                    this.mapEvents.initialize(),
                    this.mapMigrations.initialize(),
                    this.mapFeatures.initialize()
                ]);
                console.log('地图子模块初始化成功');
            } catch (moduleError) {
                console.error('初始化地图子模块时出错，但将继续初始化:', moduleError);
                // 不中断初始化过程
            }
            
            // 确保地图初始视图是一个全球视图
            console.log('重置地图视图...');
            this.resetMapView();
            console.log('地图视图已重置');
            
            console.log('MapCore 初始化完成');
        } catch (error) {
            console.error('MapCore 初始化失败:', error);
            console.error('错误堆栈:', error.stack);
            throw error;
        }
    }

    /**
     * 将地图更新到指定年份的数据
     * @param {number} year - 要更新到的年份
     * @param {Object} data - 包含各种数据类型的对象
     */
    async updateToYear(year, data) {
        console.log(`MapCore: 更新到${year}年的数据`);
        this.currentYear = year;
        
        // 重新加载地图GeoJSON数据
        await this.loadGeoJSON();
        
        // 有传入数据时直接使用
        if (data) {
            console.log(`MapCore: 使用传入的数据更新到${year}年`);
            
            // 更新各模块数据
            try {
                // 同步更新各模块，减少地图重绘次数
                if (this.mapEvents) {
                    await this.mapEvents.updateToYear(year, data.allEvents);
                }
                
                if (this.mapMigrations) {
                    await this.mapMigrations.updateToYear(year, data.migrations);
                }
                
                if (this.mapFeatures) {
                    await this.mapFeatures.updateToYear(year, data);
                }
                
                console.log(`MapCore: 年份${year}的数据更新完成`);
            } catch (error) {
                console.error(`MapCore: 更新数据时出错:`, error);
            }
        } else {
            console.log(`MapCore: 没有提供数据更新，尝试调用callback`);
            // 如果没有传入数据，调用回调来获取数据
            if (this.yearChangeCallback) {
                this.yearChangeCallback(year);
            }
        }
    }

    // 使用 MapUtils 的方法，不再自己维护逻辑
    findClosestMapYear(year) {
        const mapData = this.utils.findClosestMapFile(year);
        return mapData.year;
    }
    
    // 使用 MapUtils 的命名转换方法
    yearToMapFilename(year) {
        const mapData = this.utils.findClosestMapFile(year);
        return mapData.file;
    }

    async loadGeoJSON() {
        try {
            // 直接使用 MapUtils 加载地图
            console.log(`尝试加载年份 ${this.currentYear} 的地图数据`);
            const geoJSONData = await this.utils.loadHistoricalMap(this.currentYear);
            
            if (!geoJSONData || !geoJSONData.features) {
                console.error('加载的地图数据无效，使用空地图数据');
                this.currentGeoJSON = { 
                    type: 'FeatureCollection', 
                    features: [] 
                };
            } else {
                this.currentGeoJSON = geoJSONData;
                console.log(`成功加载地图数据，包含 ${geoJSONData.features.length} 个特征`);
            }
            
            await this.updateGeoJSONLayer();
        } catch (error) {
            console.error('加载地图GeoJSON数据失败:', error);
            // 使用空地图数据
            this.currentGeoJSON = { 
                type: 'FeatureCollection', 
                features: [] 
            };
            await this.updateGeoJSONLayer();
        }
    }

    async updateGeoJSONLayer() {
        // 如果当前有图层，先移除
        if (this.geoJSONLayer) {
            this.map.removeLayer(this.geoJSONLayer);
        }

        // 确保有有效的GeoJSON数据
        if (!this.currentGeoJSON || !this.currentGeoJSON.features) {
            console.warn('没有有效的GeoJSON数据可显示');
            this.currentGeoJSON = { 
                type: 'FeatureCollection', 
                features: [] 
            };
        }

        // 创建新的GeoJSON图层
        try {
            this.geoJSONLayer = L.geoJSON(this.currentGeoJSON, {
                style: (feature) => this.styles.getGeoJSONStyle(feature),
                onEachFeature: (feature, layer) => this.styles.onEachFeature(feature, layer, this)
            }).addTo(this.map);
            
            // 保存引用，用于弹窗处理
            this.regionsLayer = this.geoJSONLayer;
            
            // 初始化图层交互
            this.initLayerInteractions();
        } catch (error) {
            console.error('创建GeoJSON图层失败:', error);
            // 创建一个空图层
            this.geoJSONLayer = L.geoJSON({
                type: 'FeatureCollection',
                features: []
            }).addTo(this.map);
            this.regionsLayer = this.geoJSONLayer;
        }
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

    /**
     * 时间轴区域准备就绪的回调函数
     * 此方法由TimelineManager调用，用于协调地图与时间轴的交互
     * @param {TimelineManager} timelineManager - 时间轴管理器实例
     */
    onTimelineAreaReady(timelineManager) {
        this.timelineManager = timelineManager;
        
        // 添加地图鼠标事件处理，在时间轴区域禁用地图拖动
        this.setupMapDragDisable();
        
        console.log('地图与时间轴交互协调已设置');
    }
    
    /**
     * 设置地图拖动禁用功能
     * 在时间轴区域禁用地图拖动，但不干扰时间轴内部控件的操作
     */
    setupMapDragDisable() {
        if (!this.timelineManager) {
            console.warn('无法设置地图拖动禁用：缺少时间轴管理器引用');
            return;
        }
        
        // 保存原始的地图拖动状态
        let mapDraggingEnabled = true;
        
        // 在拖动开始前检查鼠标位置
        this.map.on('mousedown', (e) => {
            // 检查点击位置是否在时间轴区域
            if (this.timelineManager.isPointInTimelineArea(
                e.originalEvent.clientX, 
                e.originalEvent.clientY
            )) {
                if (mapDraggingEnabled) {
                    // 禁用地图拖动
                    this.map.dragging.disable();
                    mapDraggingEnabled = false;
                }
            } else if (!mapDraggingEnabled) {
                // 如果不在时间轴区域，确保拖动已启用
                this.map.dragging.enable();
                mapDraggingEnabled = true;
            }
        });
        
        // 在鼠标释放时重新启用地图拖动
        document.addEventListener('mouseup', () => {
            if (!mapDraggingEnabled) {
                this.map.dragging.enable();
                mapDraggingEnabled = true;
            }
        });
        
        console.log('地图拖动禁用功能设置完成');
    }

    // 地图操作公共方法
    highlightEvent(eventId) {
        this.mapEvents.highlightEvent(eventId);
    }

    toggleEvents(isActive) {
        this.mapEvents.toggleEvents(isActive);
    }

    toggleMigrations(isActive) {
        this.mapMigrations.toggleMigrations(isActive);
    }

    toggleTechnologies(isActive) {
        this.mapFeatures.toggleTechnologies(isActive);
    }

    toggleSpecies(isActive) {
        this.mapFeatures.toggleSpecies(isActive);
    }

    toggleWars(isActive) {
        this.mapFeatures.toggleWars(isActive);
    }

    toggleDiseases(isActive) {
        this.mapFeatures.toggleDiseases(isActive);
    }

    toggleAgriculture(isActive) {
        this.mapFeatures.toggleAgriculture(isActive);
    }

    highlightSearchResults(results) {
        this.mapEvents.highlightSearchResults(results);
    }

    setFilterCategory(category) {
        this.mapEvents.setFilterCategory(category);
    }

    // 添加一个方法处理所有类型的地图弹窗
    setupPopupHandlers() {
        // 为GeoJSON图层添加弹窗处理
        if (this.regionsLayer) {
            this.regionsLayer.eachLayer(layer => {
                if (layer.feature && layer.feature.properties) {
                    const props = layer.feature.properties;
                    const name = props.name || props.NAME || props.Name || '未命名区域';
                    
                    // 创建更精美的弹窗内容
                    const popupContent = `
                        <div class="country-popup">
                            ${name}
                            ${props.population ? `<div style="font-size: 13px; font-weight: normal; opacity: 0.8; margin-top: 4px;">人口: ${Number(props.population).toLocaleString()}</div>` : ''}
                        </div>
                    `;
                    
                    // 不在点击时自动缩放到区域
                    layer.bindPopup(popupContent, {
                        closeButton: true,
                        className: 'custom-country-popup',
                        autoPan: false  // 阻止自动平移
                    });
                    
                    // 禁止点击时自动缩放
                    layer.on('click', (e) => {
                        // 阻止事件传播和默认行为
                        L.DomEvent.stopPropagation(e);
                        L.DomEvent.preventDefault(e);
                        
                        // 手动在当前位置显示弹窗，不改变视图
                        const popup = layer.getPopup();
                        popup.setLatLng(e.latlng).openOn(this.map);
                    });
                }
            });
        }
    }

    // 在加载地图完成后调用此方法
    initLayerInteractions() {
        // 设置弹窗处理器
        this.setupPopupHandlers();
        
        // 在地图上添加点击处理
        this.map.addEventListener('click', (e) => {
            // 只有在点击地图本身而不是标记或其他控件时才关闭弹窗
            // 检查点击的目标是否是地图本身
            if (e.originalEvent && e.originalEvent.target && 
                (e.originalEvent.target.classList.contains('leaflet-container') || 
                 e.originalEvent.target.classList.contains('leaflet-interactive'))) {
                // 关闭所有打开的弹窗
                const popupPane = document.querySelector('.leaflet-popup-pane');
                if (popupPane) {
                    popupPane.innerHTML = '';
                }
            }
        });
    }
} 