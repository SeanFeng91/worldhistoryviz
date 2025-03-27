/**
 * 地图管理模块
 * 负责地图相关操作，如初始化、更新、添加标记和路线等
 */

import { 
    getMapForYear, 
    formatYear, 
    styleByCategory, 
    createEventPopupContent, 
    createMigrationPopupContent,
    eventsToGeoJSON,
    filterEventsByTimeRange,
    filterActiveMigrations,
    calculateMigrationProgress,
    migrationToGeoJSON
} from './map-exports.js';

import { 
    getEventsForYear, 
    getMigrationsForYear 
} from './data-loader.js';

/**
 * 地图管理器类
 * 封装地图的初始化和操作
 */
export class MapManager {
    /**
     * 地图管理器构造函数
     * @param {Object} options - 配置选项
     */
    constructor(options = {}) {
        // 地图元素ID
        this.mapElementId = options.mapContainer || 'map';
        
        // 地图参考
        this.map = null;
        
        // 当前年份
        this.currentYear = options.initialYear || 2000;
        
        // 默认的GeoJSON数据
        this.defaultGeoJSON = null;
        
        // 当前的GeoJSON数据
        this.currentGeoJSON = null;
        
        // 国家/地区颜色
        this.countryColors = {
            empire: '#7c3aed',       // 帝国 - 紫色
            kingdom: '#8b5cf6',      // 王国 - 亮紫色
            civilization: '#6366f1',  // 文明 - 靛蓝色
            tribe: '#4f46e5',        // 部落 - 蓝色
            area: '#3b82f6',         // 一般区域 - 亮蓝色
            nomadic: '#10b981',      // 游牧民族 - 绿色
            default: '#64748b'       // 默认 - 灰色
        };
        
        // 类别颜色
        this.categoryColors = {
            农业: '#10b981',    // 绿色
            技术: '#3b82f6',    // 蓝色
            文明: '#8b5cf6',    // 紫色
            征服: '#ef4444',    // 红色
            疾病: '#f59e0b',    // 黄色
            迁徙: '#7c3aed',    // 深紫色
            物种: '#14b8a6',    // 青绿色
            战争: '#dc2626',    // 深红色
            default: '#6b7280'  // 灰色
        };
        
        // 图层组
        this.geojsonLayer = null;
        this.markersLayer = null;
        this.eventMarkersLayer = null;
        this.routesLayer = null;
        this.labelsLayer = null;
        this.technologiesLayer = null;
        this.speciesLayer = null;
        this.organizationsLayer = null;
        this.warsLayer = null;
        this.diseasesLayer = null;
        this.agricultureLayer = null;
        
        // 标记引用
        this.eventMarkers = [];
        this.migrationRoutes = [];
        this.techMarkers = [];
        this.speciesMarkers = [];
        this.highlightedElements = [];
        this.labels = [];
        this.labelNames = new Set();
        this.events = [];
        this.warMarkers = [];
        this.diseaseMarkers = [];
        this.agricultureMarkers = [];
        
        // 显示控制
        this.showEvents = true;
        this.showMigrations = true;
        this.showTechnologies = false;
        this.showSpecies = false;
        this.showOrganizations = false;
        this.showWars = false;
        this.showDiseases = false;
        this.showAgriculture = false;
        
        // 类别筛选
        this.filterCategory = 'all';
        
        // 保持this上下文
        this.updateLabelsVisibility = this.updateLabelsVisibility.bind(this);
    }
    
    /**
     * 设置类别筛选
     * @param {string} category - 类别名称
     */
    setFilterCategory(category) {
        this.filterCategory = category || 'all';
        console.log(`地图管理器: 设置类别过滤器为 ${this.filterCategory}`);
    }
    
    /**
     * 获取国家/地区的颜色
     * @param {Object} feature - GeoJSON特征
     * @returns {string} 颜色十六进制代码
     */
    getCountryColor(feature) {
        if (!feature || !feature.properties) return this.countryColors.default;
        
        // 尝试从各种属性中提取类型或名称
        const props = feature.properties;
        const type = (props.TYPE || props.type || '').toLowerCase();
        const name = (props.NAME || props.name || '').toLowerCase();
        
        // 检查类型匹配
        if (type && this.countryColors[type]) {
            return this.countryColors[type];
        }
        
        // 检查名称中的关键词
        for (const [key, color] of Object.entries(this.countryColors)) {
            if (key === 'default') continue;
            
            if (name.includes(key)) {
                return color;
            }
        }
        
        // 使用不同的颜色为各个国家/地区添加一些变化
        // 使用名称的哈希值来确定颜色
        if (name) {
            const hash = this.simpleHash(name);
            const hue = hash % 360;
            return `hsl(${hue}, 70%, 60%)`;
        }
        
        return this.countryColors.default;
    }
    
    /**
     * 简单哈希函数
     * @param {string} str - 输入字符串
     * @returns {number} 哈希值
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash);
    }
    
    /**
     * 初始化地图
     */
    async initialize() {
        console.log('初始化地图...');
        
        try {
            // 检查地图容器是否存在
            const mapContainer = document.getElementById(this.mapElementId);
            if (!mapContainer) {
                console.error(`找不到地图容器元素: ${this.mapElementId}`);
                throw new Error(`找不到地图容器元素: ${this.mapElementId}`);
            }
            
            // 创建Leaflet地图实例
            this.map = L.map(this.mapElementId, {
                center: [30, 20],
                zoom: 2,
                minZoom: 2,
                maxZoom: 10,
                zoomControl: false,
                attributionControl: true
            });
            
            // 添加缩放控件到右上角
            L.control.zoom({
                position: 'topright'
            }).addTo(this.map);
            
            // 添加比例尺
            L.control.scale({
                imperial: false,
                position: 'bottomright'
            }).addTo(this.map);
            
            // 添加基础底图
            this.baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(this.map);
            
            // 创建事件标记的图层组
            this.eventsLayer = L.layerGroup().addTo(this.map);
            
            // 创建迁徙路线的图层组
            this.migrationsLayer = L.layerGroup().addTo(this.map);
            
            // 创建路线图层（用于存储所有路线）
            this.routesLayer = L.layerGroup().addTo(this.map);
            
            // 创建技术发展的图层组
            this.technologiesLayer = L.layerGroup().addTo(this.map);
            
            // 创建物种的图层组
            this.speciesLayer = L.layerGroup().addTo(this.map);
            
            // 创建社会组织的图层组
            this.organizationsLayer = L.layerGroup().addTo(this.map);
            
            // 创建战争的图层组
            this.warsLayer = L.layerGroup().addTo(this.map);
            
            // 创建疾病的图层组
            this.diseasesLayer = L.layerGroup().addTo(this.map);
            
            // 创建农业的图层组
            this.agricultureLayer = L.layerGroup().addTo(this.map);
            
            // 加载默认地图数据
            console.log('加载默认地图数据...');
            try {
                // 加载默认的世界地图（现代世界地图）
                const response = await fetch('./maps/geojson/world_2000.geojson');
                if (!response.ok) {
                    throw new Error(`加载默认地图失败: ${response.status}`);
                }
                
                this.defaultGeoJSON = await response.json();
                console.log('默认地图数据加载完成');
                
                // 初始化GeoJSON图层
                await this.updateGeoJSONLayer();
            } catch (geoError) {
                console.error('加载GeoJSON数据时出错:', geoError);
                this.showError('加载地图边界数据失败');
            }
            
            console.log('地图初始化完成');
        } catch (error) {
            console.error('初始化地图时出错:', error);
            this.showError('初始化地图失败: ' + error.message);
            throw error;
        }
    }
    
    /**
     * 更新地图到指定年份
     * @param {number} year - 年份
     * @param {Object} data - 数据对象
     */
    async updateToYear(year, data) {
        console.log(`更新地图到年份: ${year}`);
        
        if (!data) {
            console.warn('没有提供数据对象，无法更新地图内容');
            return;
        }
        
        // 更新当前年份
        this.currentYear = year;
        
        try {
            // 显示加载中动画
            this.showLoader();
            
            // 更新GeoJSON图层
            await this.updateGeoJSONLayer();
            
            // 添加事件标记
            if (data.allEvents) {
                console.log(`更新事件数据 (共${data.allEvents.length}条)`);
                this.updateEventMarkers(data.allEvents);
            }
            
            // 添加迁徙路线
            if (data.migrations) {
                console.log(`更新迁徙数据 (共${data.migrations.length}条)`);
                this.updateMigrationRoutes(data.migrations);
            }
            
            // 添加技术发展标记
            if (data.technologies) {
                console.log(`更新技术数据 (共${data.technologies.length}条)`);
                this.updateTechnologicalDevelopments(data.technologies);
            }
            
            // 添加物种标记
            if (data.species) {
                console.log(`更新物种数据 (共${data.species.length}条)`);
                this.updateSpecies(data.species);
            }
            
            // 添加社会组织标记
            if (data.civilizations) {
                console.log(`更新文明数据 (共${data.civilizations.length}条)`);
                this.updateSocialOrganizations(data.civilizations);
            }
            
            // 添加战争标记
            if (data.wars) {
                console.log(`更新战争数据 (共${data.wars.length}条)`);
                this.updateWars(data.wars);
            }
            
            // 添加疾病标记
            if (data.diseases) {
                console.log(`更新疾病数据 (共${data.diseases.length}条)`);
                this.updateDiseases(data.diseases);
            }
            
            // 添加农业标记
            if (data.agriculture) {
                console.log(`更新农业数据 (共${data.agriculture.length}条)`);
                this.updateAgriculture(data.agriculture);
            }
            
            // 隐藏加载中动画
            this.hideLoader();
            
            // 更新年份显示
            console.log(`地图已更新到年份: ${this.formatYear(year)}`);
        } catch (error) {
            console.error('更新地图年份时出错:', error);
            this.hideLoader();
            throw error;
        }
    }
    
    /**
     * 更新GeoJSON图层
     */
    async updateGeoJSONLayer() {
        console.log('更新GeoJSON图层');
        
        try {
            // 加载指定年份的地图数据
            this.currentGeoJSON = await this.getMapForYear(this.currentYear);
            
            // 清除现有GeoJSON图层
            if (this.geoJSONLayer) {
                this.map.removeLayer(this.geoJSONLayer);
            }
            
            // 添加新的GeoJSON图层
            if (this.currentGeoJSON) {
                this.geoJSONLayer = L.geoJSON(this.currentGeoJSON, {
                    style: this.getRegionStyle.bind(this),
                    onEachFeature: this.addRegionInteraction.bind(this)
                }).addTo(this.map);
                
                console.log(`成功更新GeoJSON图层，特征数: ${this.currentGeoJSON.features ? this.currentGeoJSON.features.length : 0}`);
            } else {
                console.warn(`未能为年份 ${this.currentYear} 获取GeoJSON数据`);
            }
        } catch (error) {
            console.error('更新GeoJSON图层时出错:', error);
            throw error;
        }
    }
    
    /**
     * 获取指定年份的地图数据
     * @param {number} year - 目标年份
     * @returns {Promise<Object>} GeoJSON数据对象
     */
    async getMapForYear(year) {
        console.log(`获取年份 ${year} 的地图数据`);
        
        try {
            // 根据年份选择最接近的地图文件
            const mapFile = this.selectMapFileForYear(year);
            console.log(`选择的地图文件: ${mapFile}`);
            
            // 加载GeoJSON文件
            if (mapFile) {
                const response = await fetch(mapFile);
                if (!response.ok) {
                    throw new Error(`加载地图文件失败: ${response.status}`);
                }
                
                const data = await response.json();
                console.log(`成功加载地图数据，特征数: ${data.features ? data.features.length : 0}`);
                return data;
            } else {
                // 如果找不到适合的地图文件，使用默认GeoJSON
                console.warn(`未找到年份 ${year} 对应的地图文件，使用默认地图`);
                return this.defaultGeoJSON;
            }
        } catch (error) {
            console.error(`获取年份 ${year} 的地图数据时出错:`, error);
            // 出错时返回默认GeoJSON
            return this.defaultGeoJSON;
        }
    }
    
    /**
     * 根据年份选择对应的地图文件
     * @param {number} year - 目标年份
     * @returns {string} 地图文件路径
     */
    selectMapFileForYear(year) {
        // 所有可用的年份和对应的文件名
        const availableYears = [
            -123000, -10000, -8000, -5000, -4000, -3000, -2000, -1500, -1000, 
            -700, -500, -400, -323, -300, -200, -100, -1, 
            100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 
            1100, 1200, 1279, 1300, 1400, 1492, 1500, 1530, 1600, 
            1650, 1700, 1715, 1783, 1800, 1815, 1880, 1900, 1914, 
            1920, 1930, 1938, 1945, 1960, 1994, 2000, 2010
        ];
        
        // 找到最接近的年份
        let closestYear = availableYears[0];
        let minDiff = Math.abs(year - closestYear);
        
        for (let i = 1; i < availableYears.length; i++) {
            const diff = Math.abs(year - availableYears[i]);
            if (diff < minDiff) {
                minDiff = diff;
                closestYear = availableYears[i];
            }
        }
        
        // 构建文件名
        const yearPrefix = closestYear < 0 ? 'bc' + Math.abs(closestYear) : closestYear;
        const fileName = `./maps/geojson/world_${yearPrefix}.geojson`;
        
        return fileName;
    }
    
    /**
     * 获取区域样式
     * @param {Object} feature - GeoJSON特征
     * @returns {Object} 样式配置
     */
    getRegionStyle(feature) {
        // 默认样式
        const defaultStyle = {
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            color: '#64748b',
                    weight: 1,
            opacity: 0.8
        };
        
        // 根据属性计算填充颜色
        if (feature.properties) {
            // 如果有fill属性，使用它
            if (feature.properties.fill) {
                defaultStyle.fillColor = feature.properties.fill;
                defaultStyle.fillOpacity = feature.properties.fill_opacity || 0.2;
            } 
            // 如果有color或stroke属性，使用它
            if (feature.properties.color || feature.properties.stroke) {
                defaultStyle.color = feature.properties.color || feature.properties.stroke;
                defaultStyle.opacity = feature.properties.opacity || feature.properties.stroke_opacity || 0.8;
            }
            
            // 如果提供了weight属性，使用它
            if (feature.properties.weight || feature.properties.stroke_width) {
                defaultStyle.weight = feature.properties.weight || feature.properties.stroke_width;
            }
            
            // 如果是历史区域，使用特定样式
            if (feature.properties.type === 'historical') {
                return {
                    fillColor: feature.properties.fill || '#8b5cf6',
                    fillOpacity: feature.properties.fill_opacity || 0.2,
                    color: feature.properties.stroke || '#7c3aed',
                    weight: feature.properties.stroke_width || 1,
                    opacity: feature.properties.stroke_opacity || 0.8,
                    dashArray: '2,2'
                };
            }
            
            // 如果有自定义样式属性，应用它们
            if (feature.properties.style) {
                return {
                    ...defaultStyle,
                    ...feature.properties.style
                };
            }
            
            // 基于特征ID或名称应用不同颜色（如果没有指定颜色）
            if (!feature.properties.fill && !feature.properties.style) {
                const colorSeed = feature.id || feature.properties.name || JSON.stringify(feature.properties);
                defaultStyle.fillColor = this.getCountryColor(feature);
            }
        }
        
        return defaultStyle;
    }
    
    /**
     * 为区域添加交互
     * @param {Object} feature - GeoJSON特征
     * @param {Object} layer - Leaflet图层
     */
    addRegionInteraction(feature, layer) {
        // 添加鼠标悬停效果
        layer.on({
            mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({
                    fillOpacity: 0.3,
                    weight: 2,
                    opacity: 1
                });
                
                layer.bringToFront();
                
                // 显示信息提示
                if (feature.properties && feature.properties.name) {
                    this.showRegionTooltip(feature, layer);
                }
            },
            mouseout: (e) => {
                this.geoJSONLayer.resetStyle(e.target);
                this.map.closePopup();
            },
            click: (e) => {
                // 点击显示区域详情
                if (feature.properties) {
                    this.showRegionPopup(feature, e.latlng);
                }
            }
        });
    }
    
    /**
     * 显示区域悬停提示
     * @param {Object} feature - GeoJSON特征
     * @param {Object} layer - Leaflet图层
     */
    showRegionTooltip(feature, layer) {
        const name = feature.properties.name;
        const period = feature.properties.period || '';
        const tooltipContent = `
            <div>
                <strong>${name}</strong>
                ${period ? `<div>${period}</div>` : ''}
            </div>
        `;
        
        layer.bindTooltip(tooltipContent, {
            direction: 'top',
            sticky: true,
            offset: [0, -10],
            opacity: 0.9,
            className: 'region-tooltip'
        }).openTooltip();
    }
    
    /**
     * 显示区域详情弹窗
     * @param {Object} feature - GeoJSON特征
     * @param {Object} latlng - 点击位置
     */
    showRegionPopup(feature, latlng) {
        const properties = feature.properties;
        
        // 检查是否有足够的信息显示
        if (!properties.name) return;
        
        let popupContent = `
            <div class="popup-header">
                <h3 class="popup-title">${properties.name}</h3>
                <button class="popup-close" onclick="this.parentNode.parentNode.parentNode._closeButton.click()">
                    <i class="material-icons-round">close</i>
                </button>
            </div>
            <div class="popup-content">
        `;
        
        // 添加时期信息
        if (properties.period) {
            popupContent += `<p><strong>时期:</strong> ${properties.period}</p>`;
        }
        
        // 添加描述信息
        if (properties.description) {
            popupContent += `<p>${properties.description}</p>`;
        }
        
        // 添加其他可能的属性
        if (properties.population) {
            popupContent += `<p><strong>人口:</strong> ${properties.population}</p>`;
        }
        
        if (properties.culture) {
            popupContent += `<p><strong>文化:</strong> ${properties.culture}</p>`;
        }
        
        if (properties.religion) {
            popupContent += `<p><strong>宗教:</strong> ${properties.religion}</p>`;
        }
        
        // 关闭内容div
        popupContent += `</div>`;
        
        // 如果有更多信息的链接
        if (properties.moreInfo) {
            popupContent += `
                <div class="popup-footer">
                    <button onclick="window.open('${properties.moreInfo}', '_blank')">
                        了解更多
                    </button>
                </div>
            `;
        }
        
        // 创建并打开弹窗
        L.popup({
            maxWidth: 300,
            className: 'custom-popup'
        })
        .setLatLng(latlng)
        .setContent(popupContent)
        .openOn(this.map);
    }
    
    /**
     * 清除区域标签
     */
    clearRegionLabels() {
        if (this.regionLabels) {
            this.regionLabels.forEach(label => {
                if (label._icon) {
                    this.map.removeLayer(label);
                }
            });
        }
        
        this.regionLabels = [];
    }
    
    /**
     * 为特征添加标签
     * @param {Object} feature - GeoJSON特征
     */
    addLabelToFeature(feature) {
        if (!feature.properties || !feature.properties.name) return;
        
        try {
            // 计算区域的中心点
            const layer = L.geoJSON(feature);
            const bounds = layer.getBounds();
            const center = bounds.getCenter();
            
            // 计算区域大小（用于缩放时显示/隐藏）
            const areaSize = this.calculateAreaSize(bounds);
            
            // 创建标签
            const label = L.marker(center, {
                icon: L.divIcon({
                    className: 'region-label',
                    html: feature.properties.name,
                    iconSize: [100, 40],
                    iconAnchor: [50, 20]
                }),
                interactive: false
            });
            
            // 存储区域大小用于缩放时的可见性控制
            label.areaSize = areaSize;
            
            // 添加到地图
            label.addTo(this.map);
            
            // 确保regionLabels数组已初始化
            if (!this.regionLabels) {
                this.regionLabels = [];
            }
            
            // 保存到标签数组中
            this.regionLabels.push(label);
        } catch (error) {
            console.error('为特征添加标签失败:', error);
        }
    }
    
    /**
     * 计算区域大小
     * @param {Object} bounds - Leaflet边界对象
     * @returns {number} 区域大小估计值
     */
    calculateAreaSize(bounds) {
        // 计算边界框对角线长度作为区域大小的估计
        const northEast = bounds.getNorthEast();
        const southWest = bounds.getSouthWest();
        const diagonalDistance = this.map.distance(
            [northEast.lat, northEast.lng],
            [southWest.lat, southWest.lng]
        );
        
        // 返回平方公里为单位的面积估计
        return diagonalDistance / 1000;
    }
    
    /**
     * 更新标签可见性
     */
    updateLabelsVisibility() {
        const currentZoom = this.map.getZoom();
        
        if (!this.regionLabels) return;
        
        this.regionLabels.forEach(label => {
            // 根据缩放级别和区域大小确定可见性
            let isVisible = false;
            
            // 大区域在低缩放级别显示
            if (label.areaSize > 500 && currentZoom >= 2) {
                isVisible = true;
            } 
            // 中等区域在中等缩放级别显示
            else if (label.areaSize > 100 && currentZoom >= 4) {
                isVisible = true;
            } 
            // 小区域在高缩放级别显示
            else if (currentZoom >= 6) {
                isVisible = true;
            }
            
            // 设置可见性
            if (isVisible && label._icon) {
                label._icon.style.display = '';
            } else if (label._icon) {
                label._icon.style.display = 'none';
            }
        });
    }
    
    /**
     * 更新事件标记
     * @param {Array} events - 事件数据数组
     */
    updateEventMarkers(events) {
        console.log(`更新事件标记... 当前类别过滤: ${this.filterCategory}`);
        
        // 清除现有的事件标记
        this.clearEventMarkers();
        
        if (!events || events.length === 0) {
            console.log('没有事件数据，跳过更新事件标记');
            return;
        }
        
        // 保存原始事件数据，供highlightEvent等方法使用
        this.events = events;
        
        // 获取所有事件并添加相关性属性，应用类别过滤
        const eventsWithRelevance = this.getRelevantEvents(events, this.currentYear);
        console.log(`处理 ${eventsWithRelevance.length} 个事件标记，类别过滤: ${this.filterCategory}`);
        
        // 创建GeoJSON特征集合
        const features = eventsWithRelevance.map(event => {
            // 获取事件坐标
            let coordinates = event.coordinates;
            
            // 如果没有coordinates字段但有location字段（新数据格式）
            if ((!coordinates || !Array.isArray(coordinates)) && event.location) {
                if (typeof event.location === 'object' && 'lat' in event.location && 'lng' in event.location) {
                    // 直接使用lat和lng属性创建坐标数组
                    coordinates = [event.location.lat, event.location.lng];
                }
            }
            
            // 如果仍然没有有效坐标，跳过此事件
            if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
                console.warn(`事件 "${event.title || event.name}" 缺少有效坐标`);
                return null;
            }
            
            // 处理时间字段：确保year属性存在，用于向后兼容
            const year = event.startYear !== undefined ? event.startYear : event.year;
            
            // 提取事件属性
            const properties = {
                id: event.id,
                name: event.title || event.name, // 适配两种数据格式
                title: event.title || event.name,
                category: event.category,
                description: event.description,
                year: year, // 使用startYear或year
                startYear: event.startYear,
                endYear: event.endYear,
                importance: event.importance || 1,
                impact: event.impact || event.historicalSignificance,
                relevance: event.relevance || 1.0
            };
            
            // 创建GeoJSON特征
            return {
                type: 'Feature',
                properties: properties,
                geometry: {
                    type: 'Point',
                    coordinates: [coordinates[1], coordinates[0]] // 注意：GeoJSON使用[经度，纬度]
                }
            };
        }).filter(Boolean);
        
        // 创建GeoJSON图层
        if (features.length > 0) {
            this.eventMarkersLayer = L.geoJSON({
                type: 'FeatureCollection',
                features: features
            }, {
            pointToLayer: (feature, latlng) => {
                // 根据重要性和相关性调整标记大小和不透明度
                const importance = feature.properties.importance || 1;
                const relevance = feature.properties.relevance || 1.0;
                
                // 忽略相关性太低的事件
                if (relevance < 0.1) return null; 
                
                // 标记大小基于重要性
                const size = 22 + importance * 3;
                
                // 创建自定义HTML标记
                const icon = L.divIcon({
                    className: 'custom-marker',
                    html: this.createEventMarkerHTML(feature, relevance),
                    iconSize: [size, size],
                    iconAnchor: [size/2, size/2],
                    popupAnchor: [0, -size/2 - 5]
                });
                
                // 创建标记
                const marker = L.marker(latlng, { 
                    icon: icon,
                    riseOnHover: true,
                    riseOffset: 300,
                    zIndexOffset: Math.round(importance * 100 * relevance) // 相关性高的显示在前面
                });
                
                // 添加气泡
                marker.bindPopup(this.createEventPopupContent(feature));
                
                // 添加到事件标记组
                this.eventMarkers.push(marker);
            
                return marker;
            }
            }).addTo(this.map);
            
            // 在地图上为重要事件添加额外的标题标签
            features
                .filter(feature => 
                    feature.properties.importance >= 4 && 
                    feature.properties.relevance >= 0.7)
                .forEach(feature => {
                    const latlng = L.latLng(
                        feature.geometry.coordinates[1], 
                        feature.geometry.coordinates[0]
                    );
                    
                    const labelContent = this.createEventLabelHTML(feature);
                    const labelIcon = L.divIcon({
                        className: 'event-label',
                        html: labelContent,
                        iconSize: [200, 40],
                        iconAnchor: [100, -20]
                    });
                    
                    const label = L.marker(latlng, { 
                        icon: labelIcon,
                        zIndexOffset: 1000
                    }).addTo(this.map);
                    
                    this.eventMarkers.push(label);
                });
        }
    }
    
    /**
     * 创建事件标记HTML
     * @param {Object} feature - GeoJSON特征
     * @param {number} relevance - 事件与当前时间的相关性 (0-1)
     * @returns {string} HTML字符串
     */
    createEventMarkerHTML(feature, relevance = 1.0) {
        const properties = feature.properties;
        const category = properties.category || '其他';
        const importance = properties.importance || 1;
        const eventId = properties.id || '';
        
        // 根据重要性和相关性调整标记大小和透明度
        const iconSize = 32 + importance * 3;
        const shadowBlur = 8 + importance * 2;
        
        // 确保相关性在有效范围内
        const opacity = Math.max(0.2, Math.min(1.0, relevance));
        
        // 根据类别选择图标
        const icons = {
            '农业': '<i class="fas fa-seedling"></i>',
            '技术': '<i class="fas fa-microchip"></i>',
            '文明': '<i class="fas fa-monument"></i>',
            '战争': '<i class="fas fa-gavel"></i>',
            '疾病': '<i class="fas fa-virus"></i>',
            '迁徙': '<i class="fas fa-people-arrows"></i>',
            '物种': '<i class="fas fa-paw"></i>',
            '其他': '<i class="fas fa-info"></i>'
        };
        
        const icon = icons[category] || icons['其他'];
        
        // 根据类别选择颜色
        const colors = {
            '农业': '#10b981',
            '技术': '#3b82f6',
            '文明': '#8b5cf6',
            '战争': '#ef4444',
            '疾病': '#f59e0b',
            '迁徙': '#7c3aed',
            '物种': '#14b8a6',
            '其他': '#6b7280'
        };
        
        const color = colors[category] || colors['其他'];
        
        // 构建HTML
        return `
            <div class="map-marker event-marker" data-event-id="${properties.id}" data-category="${category}" style="opacity: ${opacity};">
                <div class="marker-icon" style="width: ${iconSize}px; height: ${iconSize}px; 
                    background-color: ${color}; color: white; display: flex; 
                    align-items: center; justify-content: center; border-radius: 50%; 
                    box-shadow: 0 0 ${shadowBlur}px rgba(0, 0, 0, 0.3);">
                    ${icon}
                </div>
                <div class="marker-label" style="opacity: ${opacity >= 0.7 ? 1 : 0};">
                    <span>${properties.name || properties.title}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * 创建事件标签HTML
     * @param {Object} feature - GeoJSON特征
     * @returns {string} HTML字符串
     */
    createEventLabelHTML(feature) {
        const properties = feature.properties;
        const name = properties.name;
        
        // 格式化年份 - 优先使用startYear，其次是year
        let yearDisplay = '';
        const startYear = properties.startYear !== undefined ? properties.startYear : properties.year;
        const endYear = properties.endYear;
        
        if (startYear !== undefined && endYear !== undefined && startYear !== endYear) {
            yearDisplay = `(${this.formatYear(startYear)}-${this.formatYear(endYear)})`;
        } else if (startYear !== undefined) {
            yearDisplay = `(${this.formatYear(startYear)})`;
        }
        
        // 创建直接文字描边效果，没有白底方块
        return `
            <div class="event-title-text-outline">
                <span class="event-name">${name}</span>
                <span class="event-year">${yearDisplay}</span>
            </div>
        `;
    }
    
    /**
     * 格式化年份
     * @param {number} year - 年份
     * @returns {string} 格式化后的年份字符串
     */
    formatYear(year) {
        if (isNaN(year)) {
            return '未知年份';
        }
        
        if (year < 0) {
            return `公元前 ${Math.abs(year)} 年`;
        } else {
            return `公元 ${year} 年`;
        }
    }
    
    /**
     * 创建事件弹窗内容
     * @param {Object} feature - GeoJSON特征
     * @returns {string} HTML字符串
     */
    createEventPopupContent(feature) {
        const properties = feature.properties;
        
        // 格式化年份 - 优先使用startYear，其次是year
        let yearDisplay = '';
        const startYear = properties.startYear !== undefined ? properties.startYear : properties.year;
        const endYear = properties.endYear;
        
        if (startYear !== undefined && endYear !== undefined && startYear !== endYear) {
            yearDisplay = `${this.formatYear(startYear)} - ${this.formatYear(endYear)}`;
        } else if (startYear !== undefined) {
            yearDisplay = this.formatYear(startYear);
        } else {
            yearDisplay = '未知时间';
        }
        
        // 获取重要性星级
        const importanceStars = '★'.repeat(properties.importance || 0);
        
        // 构建详情内容
        return `
            <div class="event-popup">
                <h3 class="text-lg font-semibold text-gray-900">${properties.title || properties.name}</h3>
                
                <div class="flex justify-between items-center text-sm text-gray-600 mt-1 mb-2">
                    <div>
                        <i class="material-icons-round align-middle text-sm">event</i>
                        ${yearDisplay}
                    </div>
                    <div class="text-amber-500">
                        ${importanceStars}
                    </div>
                </div>
                
                <div class="text-sm text-gray-600 mt-2">
                    ${properties.description || '无详细描述'}
                </div>
                
                ${properties.impact ? `
                <div class="mt-2 pt-2 border-t border-gray-200">
                    <div class="text-xs font-medium text-gray-500">历史影响:</div>
                    <div class="text-sm text-gray-600">${properties.impact}</div>
                </div>
                ` : ''}
                
                <div class="mt-3 pt-2 border-t border-gray-200 text-right">
                    <button class="view-details-btn text-xs text-blue-500 hover:text-blue-700" 
                        onclick="document.dispatchEvent(new CustomEvent('viewEventDetails', {detail: {eventId: '${properties.id}'}}))">
                        查看完整详情
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * 更新迁徙路线
     * @param {Array} migrations - 迁徙数据数组
     */
    updateMigrationRoutes(migrations) {
        console.log('更新迁徙路线...');
        
        // 清除现有的迁徙路线
        this.clearMigrationRoutes();
        
        if (!migrations || migrations.length === 0) {
            console.log('没有迁徙数据，跳过更新迁徙路线');
            return;
        }
        
        // 输出迁徙数据结构以便调试
        console.log('迁徙数据示例:', migrations[0]);
        
        // 确保routesLayer存在
        if (!this.routesLayer) {
            this.routesLayer = L.layerGroup().addTo(this.map);
        } else {
            console.log('使用现有的routesLayer图层');
        }
        
        // 获取当前活跃的迁徙
        const activeMigrations = this.getActiveMigrations(migrations, this.currentYear);
        console.log(`找到 ${activeMigrations.length} 条活跃迁徙路线，当前年份: ${this.currentYear}`);
        
        if (activeMigrations.length === 0) {
            console.log('没有与当前年份相关的迁徙路线');
            return;
        }
        
        // 为每条迁徙路线创建曲线
        activeMigrations.forEach((migration, index) => {
            console.log(`处理迁徙路线 #${index}:`, migration.name || '未命名');
            
            // 检查迁徙是否有完整的起点和终点坐标
            if (!migration.startCoordinates || !migration.endCoordinates || 
                !Array.isArray(migration.startCoordinates) || !Array.isArray(migration.endCoordinates) ||
                migration.startCoordinates.length < 2 || migration.endCoordinates.length < 2) {
                
                console.warn(`迁徙路线 "${migration.name || '未命名'}" 坐标数据不完整:`, 
                    migration.startCoordinates, migration.endCoordinates);
                return;
            }
            
            // 提取起点和终点
            const startLat = migration.startCoordinates[0];
            const startLng = migration.startCoordinates[1];
            const endLat = migration.endCoordinates[0];
            const endLng = migration.endCoordinates[1];
            
            // 再次检查坐标值是否有效
            if (typeof startLat !== 'number' || typeof startLng !== 'number' || 
                typeof endLat !== 'number' || typeof endLng !== 'number' ||
                isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
                
                console.warn(`迁徙路线 "${migration.name || '未命名'}" 坐标值无效，跳过`);
                return;
            }
            
            try {
                // 创建曲线控制点
                const curvedPath = this.createCurvedPath(startLat, startLng, endLat, endLng);
                
                // 为迁徙计算适当的颜色
                const color = this.getMigrationColor(migration.category);
                
                // 创建路径
                const path = L.polyline(curvedPath, {
                    color: color,
                        weight: 3,
                    opacity: 0.7,
                    lineJoin: 'round',
                    dashArray: '6, 8',
                    className: 'migration-path'
                });
                
                // 添加到路由图层
                path.addTo(this.routesLayer);
                
                // 添加箭头指示方向
                if (curvedPath.length > 0) {
                    const arrowOffset = Math.floor(curvedPath.length / 2); // 在曲线中间位置添加箭头
                    if (arrowOffset < curvedPath.length) {
                        const arrowPoint = curvedPath[arrowOffset];
                        
                        const arrowIcon = L.divIcon({
                            className: 'migration-arrow',
                            html: `<i class="material-icons-round" style="color: ${color};">arrow_forward</i>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        });
                        
                        const arrowMarker = L.marker(arrowPoint, { icon: arrowIcon });
                        arrowMarker.addTo(this.routesLayer);
                        
                        // 存储箭头引用以便后续清除
                        this.migrationRoutes.push(arrowMarker);
                    }
                }
                
                // 添加气泡信息
                path.bindPopup(this.createMigrationPopupContent(migration));
                
                // 存储路径引用以便后续清除
                this.migrationRoutes.push(path);
                
                // 为重要迁徙添加标签
                if (migration.importance >= 4 && curvedPath.length > 0) {
                    const labelOffset = Math.floor(curvedPath.length / 3); // 在曲线三分之一处添加标签
                    if (labelOffset < curvedPath.length) {
                        const labelPoint = curvedPath[labelOffset];
                        
                        const labelIcon = L.divIcon({
                            className: 'migration-label',
                            html: `<div class="migration-label-text">${migration.name || '未命名迁徙'}</div>`,
                            iconSize: [150, 30],
                            iconAnchor: [75, 15]
                        });
                        
                        const label = L.marker(labelPoint, { icon: labelIcon });
                        label.addTo(this.routesLayer);
                        
                        // 存储标签引用以便后续清除
                        this.migrationRoutes.push(label);
                    }
                }
            } catch (error) {
                console.error(`处理迁徙路线时出错:`, error, migration);
            }
        });
    }
    
    /**
     * 创建曲线路径点数组
     * @param {number} startLat - 起点纬度
     * @param {number} startLng - 起点经度
     * @param {number} endLat - 终点纬度
     * @param {number} endLng - 终点经度
     * @returns {Array} 路径点数组
     */
    createCurvedPath(startLat, startLng, endLat, endLng) {
        // 确保所有坐标为有效数字
        if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
            console.warn('创建曲线路径时遇到无效坐标:', startLat, startLng, endLat, endLng);
            // 返回一个安全的默认直线路径
            return [
                [0, 0],
                [1, 1]
            ];
        }
        
        // 计算中间控制点
        const center = [(startLat + endLat) / 2, (startLng + endLng) / 2];
        
        // 计算垂直于起点-终点连线的方向
        const dx = endLng - startLng;
        const dy = endLat - startLat;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // 如果起点和终点几乎重合，则返回一个小圆圈
        if (dist < 0.1) {
            console.log('起点和终点几乎重合，创建一个小圆圈');
            const circle = [];
            const steps = 10;
            const radius = 0.1;
            for (let i = 0; i <= steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                circle.push([
                    startLat + Math.sin(angle) * radius,
                    startLng + Math.cos(angle) * radius
                ]);
            }
            return circle;
        }
        
        // 控制弯曲程度，距离越远弯曲越大
        const curvature = Math.min(0.2, dist / 30);
        
        // 创建垂直于线段的偏移
        const offsetX = -dy * curvature;
        const offsetY = dx * curvature;
        
        // 计算控制点
        const controlPoint = [center[0] + offsetX, center[1] + offsetY];
        
        // 使用二次贝塞尔曲线生成路径点
        const points = [];
        const steps = 30; // 平滑度
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            
            // 二次贝塞尔曲线公式: B(t) = (1-t)²*P0 + 2(1-t)t*P1 + t²*P2
            // 其中 P0 是起点，P1 是控制点，P2 是终点
            const lat = (1 - t) * (1 - t) * startLat + 2 * (1 - t) * t * controlPoint[0] + t * t * endLat;
            const lng = (1 - t) * (1 - t) * startLng + 2 * (1 - t) * t * controlPoint[1] + t * t * endLng;
            
            points.push([lat, lng]);
        }
        
        return points;
    }
    
    /**
     * 获取迁徙类别对应的颜色
     * @param {string} category - 迁徙类别
     * @returns {string} 颜色代码
     */
    getMigrationColor(category) {
        const colors = {
            '人口迁徙': '#7c3aed',
            '文化传播': '#8b5cf6',
            '技术扩散': '#3b82f6',
            '商业贸易': '#10b981',
            '军事入侵': '#ef4444',
            '疾病传播': '#f59e0b'
        };
        
        return colors[category] || '#6b7280';
    }
    
    /**
     * 创建迁徙弹窗内容
     * @param {Object} migration - 迁徙数据
     * @returns {string} HTML字符串
     */
    createMigrationPopupContent(migration) {
        // 格式化年份
        const formatYear = (year) => {
            if (year === undefined) return '未知';
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };
        
        // 构建年份显示
        let yearDisplay = '';
        if (migration.startYear !== undefined && migration.endYear !== undefined) {
            yearDisplay = `${formatYear(migration.startYear)} 至 ${formatYear(migration.endYear)}`;
        } else if (migration.startYear !== undefined) {
            yearDisplay = `始于 ${formatYear(migration.startYear)}`;
        } else if (migration.endYear !== undefined) {
            yearDisplay = `止于 ${formatYear(migration.endYear)}`;
        } else {
            yearDisplay = '时间不详';
        }
        
        // 获取重要性星级
        const importanceStars = '★'.repeat(migration.importance || 0);
        
        return `
            <div class="migration-popup">
                <h3 class="text-lg font-semibold text-gray-900">${migration.name}</h3>
                
                <div class="flex justify-between items-center text-sm text-gray-600 mt-1 mb-2">
                    <div>
                        <i class="material-icons-round align-middle text-sm">event</i>
                        ${yearDisplay}
                    </div>
                    <div class="text-amber-500">
                        ${importanceStars}
                    </div>
                </div>
                
                <div class="flex items-center gap-1 mb-2">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        ${migration.category || '未分类'}
                    </span>
                </div>
                
                <div class="flex items-center gap-2 text-sm text-gray-700 mb-1">
                    <i class="material-icons-round text-green-600">play_arrow</i>
                    <strong>起点:</strong> ${migration.startLocation}
                </div>
                
                <div class="flex items-center gap-2 text-sm text-gray-700 mb-2">
                    <i class="material-icons-round text-red-600">flag</i>
                    <strong>终点:</strong> ${migration.endLocation}
                </div>
                
                <div class="text-sm text-gray-600">
                    ${migration.description || '无详细描述'}
                </div>
                
                ${migration.historicalSignificance ? `
                <div class="mt-2 pt-2 border-t border-gray-200">
                    <div class="text-xs font-medium text-gray-500">历史意义:</div>
                    <div class="text-sm text-gray-600">${migration.historicalSignificance}</div>
                </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 更新技术发展
     * @param {Array} technologies - 技术数据数组
     */
    updateTechnologicalDevelopments(technologies) {
        console.log(`更新技术发展数据，当前年份：${this.currentYear}`);
        
        // 清除现有技术标记
        this.clearTechMarkers();
        
        if (!technologies || !Array.isArray(technologies)) {
            console.warn('无效的技术数据');
            return;
        }
        
        // 找出当前年份相关的技术发展
        const relevantTechnologies = technologies.filter(tech => {
            // 兼容不同的数据格式
            const startYear = tech.startYear || tech.year;
            const endYear = tech.endYear || startYear;
            
            // 时间范围判断
            if (startYear <= this.currentYear && endYear >= this.currentYear) {
                return true;
            }
            
            // 对于重要技术，在一定范围内也显示
            if (tech.importance >= 4 && Math.abs(startYear - this.currentYear) <= 500) {
                return true;
            }
            
            // 对于一般技术，在较小范围内显示
            return Math.abs(startYear - this.currentYear) <= 200;
        });
        
        console.log(`找到 ${relevantTechnologies.length} 项相关技术`);
        
        // 应用类别筛选
        let filteredTechnologies = relevantTechnologies;
        if (this.filterCategory !== 'all' && this.filterCategory !== '技术') {
            filteredTechnologies = relevantTechnologies.filter(tech => tech.category === this.filterCategory);
            console.log(`应用类别筛选后剩余 ${filteredTechnologies.length} 项技术`);
        }
        
        // 为每项技术创建标记
        filteredTechnologies.forEach(tech => {
            let coordinates;
            
            // 处理不同格式的location
            if (tech.location) {
                if (Array.isArray(tech.location) && tech.location.length === 2) {
                    // 处理数组格式的坐标 [lng, lat]
                    coordinates = [tech.location[1], tech.location[0]];
                } else if (typeof tech.location === 'object' && tech.location.lat !== undefined && tech.location.lng !== undefined) {
                    // 处理对象格式的坐标 {lat, lng}
                    coordinates = [tech.location.lat, tech.location.lng];
                }
            }
            
            // 如果坐标有效，创建标记
            if (coordinates && coordinates.length === 2) {
                const marker = this.createCustomMarker(coordinates, '技术', tech.title);
                
                // 创建弹出窗口内容
                const popupContent = this.createTechnologyPopup(tech);
                marker.bindPopup(popupContent);
                
                // 添加到技术图层
                marker.addTo(this.technologiesLayer);
                
                // 保存引用
                this.techMarkers.push(marker);
            } else {
                console.warn(`技术 ${tech.title} 的位置数据无效`);
            }
        });
        
        console.log('技术发展数据更新完成');
    }
    
    /**
     * 更新区域物种标记
     * @param {Array} species - 物种数据数组
     */
    updateRegionalSpecies(species) {
        console.log(`更新物种数据，当前年份: ${this.currentYear}`);
        
        // 清除现有的物种标记
        this.clearSpeciesMarkers();
        
        if (!species || !Array.isArray(species)) {
            console.warn('物种数据无效或为空');
            return;
        }
        
        // 获取与当前年份相关的物种
        const relevantSpecies = this.getRelevantSpecies(species, this.currentYear);
        
        console.log(`找到 ${relevantSpecies.length} 个相关物种`);
        
        // 应用类别筛选
        let filteredSpecies = relevantSpecies;
        if (this.filterCategory !== 'all' && this.filterCategory !== '物种') {
            filteredSpecies = relevantSpecies.filter(sp => sp.category === this.filterCategory);
            console.log(`应用类别筛选后剩余 ${filteredSpecies.length} 个物种`);
        }
        
        // 添加物种标记
        filteredSpecies.forEach(sp => {
            if (sp.location) {
                // 确保location是有效的坐标
                let coordinates;
                if (Array.isArray(sp.location) && sp.location.length === 2) {
                    // 如果location是数组格式 [lng, lat]
                    coordinates = [sp.location[1], sp.location[0]];
                } else if (sp.location.lat !== undefined && sp.location.lng !== undefined) {
                    // 如果location是对象格式 {lat, lng}
                    coordinates = [sp.location.lat, sp.location.lng];
                } else {
                    console.warn(`物种 ${sp.title} 的位置格式无效:`, sp.location);
                    return;
                }
                
                // 创建物种图标
                const marker = this.createCustomMarker(coordinates, '物种', sp.title);
                
                // 添加弹出框
                marker.bindPopup(this.createSpeciesPopup(sp));
                
                // 设置交互事件
                marker.on('mouseover', function() {
                    this.openPopup();
                });
                
                // 添加到物种图层
                marker.addTo(this.speciesLayer);
                
                // 保存引用以便后续清除
                this.speciesMarkers.push(marker);
            }
        });
        
        console.log(`添加了 ${filteredSpecies.length} 个物种标记`);
    }
    
    /**
     * 添加社会组织标记
     * @param {Array} civilizations - 文明/社会组织数据数组
     */
    updateSocialOrganizations(civilizations) {
        // 清除现有的社会组织标记
        this.organizationsLayer.clearLayers();
        
        if (!civilizations || !Array.isArray(civilizations)) {
            console.warn('文明/社会组织数据无效');
            return;
        }
        
        // 获取与当前年份相关的社会组织
        const relevantCivilizations = this.getRelevantCivilizations(civilizations, this.currentYear);
        
        if (relevantCivilizations.length === 0) {
            console.log(`年份 ${this.currentYear} 没有相关社会组织`);
            return;
        }
        
        // 添加社会组织标记
        relevantCivilizations.forEach(civ => {
            if (civ.location && civ.location.lat !== undefined && civ.location.lng !== undefined) {
                // 使用统一的标记创建方法
                const marker = this.createCustomMarker(
                    [civ.location.lat, civ.location.lng],
                    civ.category || '文明',
                    civ.title
                );
                
                // 创建并绑定弹窗
                marker.bindPopup(this.createCivilizationPopup(civ));
                
                // 添加到组织图层
                this.organizationsLayer.addLayer(marker);
            }
        });
        
        console.log(`添加了 ${relevantCivilizations.length} 个社会组织标记`);
    }
    
    /**
     * 获取文明类别对应的图标
     * @param {string} category - 文明类别
     * @returns {string} 图标名称
     */
    getCivilizationIcon(category) {
        const icons = {
            '文明': 'account_balance',
            '帝国': 'stars',
            '王国': 'brightness_7',
            '部落': 'group',
            '城邦': 'location_city',
            '联盟': 'handshake',
            '宗教组织': 'church'
        };
        
        return icons[category] || 'account_balance';
    }
    
    /**
     * 创建文明弹窗内容
     * @param {Object} civ - 文明数据
     * @returns {string} 弹窗HTML内容
     */
    createCivilizationPopup(civ) {
        // 格式化年份
        const formatYear = (year) => {
            if (year === undefined) return '未知';
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };
        
        // 构建年份显示
        let yearDisplay = '';
        if (civ.startYear !== undefined && civ.endYear !== undefined) {
            yearDisplay = `${formatYear(civ.startYear)} - ${formatYear(civ.endYear)}`;
        } else if (civ.startYear !== undefined) {
            yearDisplay = `始于 ${formatYear(civ.startYear)}`;
        } else if (civ.endYear !== undefined) {
            yearDisplay = `止于 ${formatYear(civ.endYear)}`;
        }
        
        // 构建弹窗内容
        return `
            <div class="civilization-popup">
                <h3 class="popup-title">${civ.title}</h3>
                <div class="popup-time">${yearDisplay}</div>
                <div class="popup-region">${civ.region || ''}</div>
                <p class="popup-description">${civ.description || ''}</p>
                <div class="popup-impact">
                    <strong>历史影响:</strong> ${civ.impact || ''}
                </div>
            </div>
        `;
    }
    
    /**
     * 创建技术弹出窗口内容
     * @param {Object} tech - 技术对象
     * @returns {string} HTML内容
     */
    createTechnologyPopup(tech) {
        // 格式化年份
        const formatYear = (year) => {
            if (year === undefined) return '未知';
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };
        
        // 构建年份显示
        let yearDisplay = '';
        const techYear = tech.year || tech.startYear;
        const techEndYear = tech.endYear;
        
        if (techYear !== undefined && techEndYear !== undefined && techYear !== techEndYear) {
            yearDisplay = `${formatYear(techYear)} - ${formatYear(techEndYear)}`;
        } else if (techYear !== undefined) {
            yearDisplay = formatYear(techYear);
        } else {
            yearDisplay = '未知时间';
        }
        
        // 构建弹窗内容
        return `
            <div class="civilization-popup">
                <h3 class="popup-title">${tech.title}</h3>
                <div class="popup-time">${yearDisplay}</div>
                <div class="popup-region">${tech.region || tech.location?.name || ''}</div>
                <p class="popup-description">${tech.description || ''}</p>
                <div class="popup-impact">
                    <strong>历史影响:</strong> ${tech.impact || ''}
                </div>
            </div>
        `;
    }
    
    /**
     * 创建物种弹出窗口内容
     * @param {Object} species - 物种对象
     * @returns {string} HTML内容
     */
    createSpeciesPopup(species) {
        // 格式化年份
        const formatYear = (year) => {
            if (year === undefined) return '未知';
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };
        
        // 构建年份显示
        const year = species.year || species.startYear;
        const yearDisplay = year !== undefined ? formatYear(year) : '未知时间';
        
        // 构建弹窗内容
        return `
            <div class="civilization-popup">
                <h3 class="popup-title">${species.title}</h3>
                <div class="popup-time">驯化时间: ${yearDisplay}</div>
                <div class="popup-region">${species.region || species.location?.name || ''}</div>
                <p class="popup-description">${species.description || ''}</p>
                <div class="popup-details">
                    <p><strong>类型:</strong> ${species.type || '未知'}</p>
                    <p><strong>用途:</strong> ${species.uses || '未知'}</p>
                </div>
                <div class="popup-impact">
                    <strong>历史贡献:</strong> ${species.impact || ''}
                </div>
            </div>
        `;
    }
    
    /**
     * 创建战争弹出窗口内容
     * @param {Object} war - 战争对象
     * @returns {string} HTML内容
     */
    createWarPopupContent(war) {
        // 格式化年份
        const formatYear = (year) => {
            if (year === undefined) return '未知';
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };
        
        // 构建年份显示
        let yearDisplay = '';
        if (war.startYear !== undefined && war.endYear !== undefined) {
            yearDisplay = `${formatYear(war.startYear)} - ${formatYear(war.endYear)}`;
        } else if (war.startYear !== undefined) {
            yearDisplay = formatYear(war.startYear);
        } else {
            yearDisplay = '未知时间';
        }
        
        // 构建弹窗内容
        return `
            <div class="civilization-popup">
                <h3 class="popup-title">${war.title}</h3>
                <div class="popup-time">${yearDisplay}</div>
                <div class="popup-region">${war.region || war.location?.name || ''}</div>
                <p class="popup-description">${war.description || ''}</p>
                <div class="popup-details">
                    <p><strong>参与方:</strong> ${war.participants || '未知'}</p>
                    <p><strong>结果:</strong> ${war.result || '未知'}</p>
                    <p><strong>伤亡:</strong> ${war.casualties || '未知'}</p>
                </div>
                <div class="popup-impact">
                    <strong>历史影响:</strong> ${war.impact || ''}
                </div>
            </div>
        `;
    }
    
    /**
     * 创建疾病弹出窗口内容
     * @param {Object} disease - 疾病对象
     * @returns {string} HTML内容
     */
    createDiseasePopupContent(disease) {
        // 格式化年份
        const formatYear = (year) => {
            if (year === undefined) return '未知';
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };
        
        // 构建年份显示
        let yearDisplay = '';
        if (disease.startYear !== undefined && disease.endYear !== undefined) {
            yearDisplay = `${formatYear(disease.startYear)} - ${formatYear(disease.endYear)}`;
        } else if (disease.startYear !== undefined) {
            yearDisplay = formatYear(disease.startYear);
        } else {
            yearDisplay = '未知时间';
        }
        
        // 构建弹窗内容
        return `
            <div class="civilization-popup">
                <h3 class="popup-title">${disease.title}</h3>
                <div class="popup-time">${yearDisplay}</div>
                <div class="popup-region">${disease.region || disease.location?.name || ''}</div>
                <p class="popup-description">${disease.description || ''}</p>
                <div class="popup-details">
                    <p><strong>死亡人数:</strong> ${disease.deaths || '未知'}</p>
                    <p><strong>传播方式:</strong> ${disease.transmission || '未知'}</p>
                </div>
                <div class="popup-impact">
                    <strong>历史影响:</strong> ${disease.impact || ''}
                </div>
            </div>
        `;
    }
    
    /**
     * 创建农业弹出窗口内容
     * @param {Object} agriculture - 农业对象
     * @returns {string} HTML内容
     */
    createAgriculturePopupContent(agriculture) {
        // 格式化年份
        const formatYear = (year) => {
            if (year === undefined) return '未知';
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };
        
        // 构建年份显示
        let yearDisplay = '';
        if (agriculture.startYear !== undefined && agriculture.endYear !== undefined) {
            yearDisplay = `${formatYear(agriculture.startYear)} - ${formatYear(agriculture.endYear)}`;
        } else if (agriculture.startYear !== undefined) {
            yearDisplay = formatYear(agriculture.startYear);
        } else {
            yearDisplay = '未知时间';
        }
        
        // 构建弹窗内容
        return `
            <div class="civilization-popup">
                <h3 class="popup-title">${agriculture.title}</h3>
                <div class="popup-time">${yearDisplay}</div>
                <div class="popup-region">${agriculture.region || agriculture.location?.name || ''}</div>
                <p class="popup-description">${agriculture.description || ''}</p>
                <div class="popup-details">
                    <p><strong>作物类型:</strong> ${agriculture.crops || '未知'}</p>
                    <p><strong>耕作方式:</strong> ${agriculture.technique || '未知'}</p>
                </div>
                <div class="popup-impact">
                    <strong>历史影响:</strong> ${agriculture.impact || ''}
                </div>
            </div>
        `;
    }
    
    /**
     * 创建自定义标记
     * @param {Array} latlng - 经纬度坐标 [lat, lng]
     * @param {string} category - 类别
     * @param {string} name - 名称
     * @returns {L.Marker} Leaflet标记对象
     */
    createCustomMarker(latlng, category, name) {
        // 根据类别获取颜色
        const color = this.categoryColors[category] || this.categoryColors.default;
        
        // 检查name是否有效，如果无效则提供默认值
        const displayName = name || '未知';
        
        // 获取类别对应的图标
        const icon = this.getCategoryIcon(category);
        
        // 创建自定义图标
        const divIcon = L.divIcon({
            className: `custom-icon ${category}`,
            html: `<div class="icon-inner" style="background-color: ${color};" title="${displayName}">
                    <i class="material-icons-round">${icon}</i>
                  </div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });
        
        const marker = L.marker(latlng, { icon: divIcon });

        // 添加工具提示
        marker.bindTooltip(displayName, {
            permanent: false,
            direction: 'top',
            className: 'custom-tooltip',
            opacity: 0.9
        });
        
        return marker;
    }
    
    /**
     * 获取类别对应的Material Icons图标
     * @param {string} category - 事件类别
     * @returns {string} 图标名称
     */
    getCategoryIcon(category) {
        const icons = {
            '技术': 'lightbulb',
            '文明': 'account_balance',
            '帝国': 'public',
            '王国': 'brightness_7',
            '部落': 'group',
            '城邦': 'location_city',
            '联盟': 'handshake',
            '宗教组织': 'church',
            '战争': 'gavel',
            '迁徙': 'trending_flat',
            '疾病': 'coronavirus',
            '农业': 'eco',
            '物种': 'pets'
        };
        
        return icons[category] || 'place';
    }
    
    /**
     * 判断时间是否相关
     * @param {number} time - 时间（年份）
     * @param {number} currentYear - 当前年份
     * @param {number} range - 范围（年）
     * @returns {boolean} 是否相关
     */
    isTimeRelevant(time, currentYear, range = 100) {
        if (time === undefined || time === null) return false;
        return Math.abs(time - currentYear) <= range;
    }
    
    /**
     * 判断时间范围是否相关
     * @param {number} startTime - 开始时间
     * @param {number} endTime - 结束时间
     * @param {number} currentYear - 当前年份
     * @param {number} buffer - 缓冲范围（年）
     * @returns {boolean} 是否相关
     */
    isTimeRangeRelevant(startTime, endTime, currentYear, buffer = 50) {
        if (startTime === undefined || endTime === undefined) return false;
        // 添加缓冲区，使得临近的事件也能显示
        return (currentYear >= startTime - buffer) && (currentYear <= endTime + buffer);
    }
    
    /**
     * 解析年份字符串
     * @param {string} yearStr - 年份字符串
     * @returns {number} 年份数值
     */
    parseYearString(yearStr) {
        if (!yearStr) return 0;
        
        // 移除"约"、"公元"等词
        const cleanStr = yearStr.replace(/约|公元/g, '').trim();
        
        // 处理公元前
        if (cleanStr.includes('前')) {
            const year = parseInt(cleanStr.replace(/前|年/g, '').trim());
            return isNaN(year) ? 0 : -year;
        }
        
        // 处理普通年份
        const year = parseInt(cleanStr.replace(/年/g, '').trim());
        return isNaN(year) ? 0 : year;
    }
    
    /**
     * 显示或隐藏事件标记
     * @param {boolean} show - 是否显示事件
     */
    toggleEvents(show) {
        this.showEvents = show;
        if (show) {
            this.map.addLayer(this.markersLayer);
        } else {
            this.map.removeLayer(this.markersLayer);
        }
    }
    
    /**
     * 显示或隐藏迁徙路线
     * @param {boolean} show - 是否显示迁徙
     */
    toggleMigrations(show) {
        this.showMigrations = show;
        if (show) {
            this.map.addLayer(this.routesLayer);
        } else {
            this.map.removeLayer(this.routesLayer);
        }
    }
    
    /**
     * 高亮显示事件
     * @param {string} eventId - 事件ID
     */
    highlightEvent(eventId) {
        if (!eventId) return;
        
        console.log(`高亮显示事件: ${eventId}`);
        
        // 清除现有高亮
        this.clearHighlights();
        
        // 在所有事件标记中查找匹配的事件
        const markerElement = document.querySelector(`.map-marker[data-event-id="${eventId}"]`);
        if (markerElement) {
            // 添加高亮样式
            markerElement.classList.add('highlighted');
            
            // 查找对应的Leaflet标记并打开其弹窗
            this.eventMarkers.forEach(marker => {
                if (marker.getElement && marker.getElement()) {
                    const element = marker.getElement();
                    if (element.querySelector(`.map-marker[data-event-id="${eventId}"]`)) {
                        // 将地图中心移动到标记位置
                        const latlng = marker.getLatLng();
                        this.map.flyTo(latlng, Math.max(this.map.getZoom(), 5), {
                            duration: 1.5,
                            easeLinearity: 0.25
                        });
                        
                        // 打开标记弹窗
                        marker.openPopup();
                        
                        // 添加脉冲效果
                        this.addPulseEffect(latlng);
                        
                        return;
                    }
                }
            });
        } else {
            console.warn(`未找到事件ID为 ${eventId} 的标记`);
            
            // 尝试从数据中找到事件并动态创建标记
            if (this.events && Array.isArray(this.events)) {
                const event = this.events.find(e => e.id === eventId);
                if (event) {
                    let coordinates;
                    
                    // 处理不同格式的坐标
                    if (event.location) {
                        if (Array.isArray(event.location) && event.location.length >= 2) {
                            coordinates = [event.location[1], event.location[0]]; // [lng, lat] for GeoJSON
                        } else if (typeof event.location === 'object' && 'lat' in event.location && 'lng' in event.location) {
                            coordinates = [event.location.lng, event.location.lat]; // [lng, lat] for GeoJSON
                        }
                    } else if (event.coordinates && Array.isArray(event.coordinates) && event.coordinates.length >= 2) {
                        coordinates = [event.coordinates[1], event.coordinates[0]]; // [lng, lat] for GeoJSON
                    }
                    
                    if (coordinates) {
                        console.log(`找到事件数据，正在创建临时标记: ${event.title}`);
                        
                        // 创建临时事件标记
                        const tempFeature = {
                            type: "Feature",
                            properties: {
                                id: event.id,
                                title: event.title || event.name,
                                year: event.startYear || event.year,
                                endYear: event.endYear,
                                description: event.description,
                                category: event.category,
                                importance: event.importance || 3
                            },
                            geometry: {
                                type: "Point",
                                coordinates: coordinates
                            }
                        };
                        
                        // 添加临时标记
                        const marker = this.createEventMarker(tempFeature);
                        if (marker) {
                            // 保存到事件标记列表
                            this.eventMarkers.push(marker);
                            
                            // 高亮显示
                            const latlng = marker.getLatLng();
                            this.map.flyTo(latlng, Math.max(this.map.getZoom(), 5), {
                                duration: 1.5,
                                easeLinearity: 0.25
                            });
                            
                            // 打开弹窗
                            marker.openPopup();
                            
                            // 添加脉冲效果
                            this.addPulseEffect(latlng);
                        }
                    } else {
                        console.error(`找不到事件数据或位置信息无效: ${eventId}`);
                    }
                } else {
                    console.error(`找不到ID为 ${eventId} 的事件数据`);
                }
            }
        }
    }
    
    /**
     * 清除高亮显示
     */
    clearHighlights() {
        // 移除所有标记的高亮样式
        document.querySelectorAll('.map-marker.highlighted').forEach(element => {
            element.classList.remove('highlighted');
        });
        
        // 移除任何临时添加的高亮元素
        this.highlightedElements.forEach(element => {
            if (this.map.hasLayer(element)) {
                this.map.removeLayer(element);
            }
        });
        
        // 清空高亮元素数组
        this.highlightedElements = [];
    }
    
    /**
     * 显示加载中指示器
     */
    showLoader() {
        const loader = document.getElementById('map-loader');
        if (loader) {
            loader.style.display = 'flex';
        }
    }
    
    /**
     * 隐藏加载中指示器
     */
    hideLoader() {
        const loader = document.getElementById('map-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
    
    /**
     * 显示错误信息
     * @param {string} message - 错误信息
     */
    showError(message) {
        const errorBox = document.getElementById('error-box');
        if (errorBox) {
            errorBox.textContent = message;
            errorBox.style.display = 'block';
            
            // 5秒后自动隐藏
            setTimeout(() => {
                errorBox.style.display = 'none';
            }, 5000);
        }
    }
    
    /**
     * 清除事件标记
     */
    clearEventMarkers() {
        // 移除所有事件标记
        this.eventMarkers.forEach(marker => {
            if (this.map.hasLayer(marker)) {
                this.map.removeLayer(marker);
            }
        });
        
        // 清空事件标记数组
        this.eventMarkers = [];
    }
    
    /**
     * 清除迁徙路线
     */
    clearMigrationRoutes() {
        // 首先尝试清除routesLayer的内容
        if (this.routesLayer) {
            this.routesLayer.clearLayers();
        }
        
        // 然后确保移除所有单独保存的迁徙路线
        if (this.migrationRoutes && this.migrationRoutes.length > 0) {
            this.migrationRoutes.forEach(route => {
                if (route && this.map.hasLayer(route)) {
                    this.map.removeLayer(route);
                }
            });
        }
        
        // 清空迁徙路线数组
        this.migrationRoutes = [];
        
        console.log('已清除所有迁徙路线');
    }
    
    /**
     * 清除技术标记
     */
    clearTechMarkers() {
        // 移除所有技术标记
        this.techMarkers.forEach(marker => {
            if (this.map.hasLayer(marker)) {
                this.map.removeLayer(marker);
            }
        });
        
        // 清空技术标记数组
        this.techMarkers = [];
    }
    
    /**
     * 清除物种标记
     */
    clearSpeciesMarkers() {
        // 移除所有物种标记
        this.speciesMarkers.forEach(marker => {
            if (this.map.hasLayer(marker)) {
                this.map.removeLayer(marker);
            }
        });
        
        // 清空物种标记数组
        this.speciesMarkers = [];
    }
    
    /**
     * 加载GeoJSON数据
     */
    async loadGeoJSON() {
        try {
            console.log('加载GeoJSON数据...');
            
            // 尝试加载当前年份的地图数据，默认使用0年（公元元年）
            this.currentGeoJSON = await getMapForYear(this.currentYear || 0);
            
            // 更新GeoJSON图层
            this.updateGeoJSONLayer();
            
            console.log('GeoJSON数据加载完成');
        } catch (error) {
            console.error('加载GeoJSON数据时出错:', error);
            this.showError('加载地图数据时出错: ' + error.message);
        }
    }
    
    /**
     * 获取与当前年份相关的事件数组
     * @param {Array} events - 所有事件数组
     * @param {number} year - 当前年份
     * @returns {Array} 相关事件数组，每个事件增加了relevance属性
     */
    getRelevantEvents(events, year) {
        if (!events || !Array.isArray(events)) return [];
        
        console.log(`处理事件: 年份=${year}, 类别过滤=${this.filterCategory}`);
        console.log(`事件总数: ${events.length}`);
        
        // 时间范围扩大，对远古年份特殊处理
        const isAncientTime = Math.abs(year) > 2000;
        const baseTimeBuffer = isAncientTime ? 2000 : 500;
        
        // 计算每个事件的相关性并进行筛选
        const relevantEvents = events.map(event => {
            // 确保兼容新旧数据格式
            const startYear = event.startYear !== undefined ? event.startYear : event.year;
            const endYear = event.endYear || startYear;
            
            let relevance = 0; // 默认不相关
            
            // 如果事件在当前年份的区间内，完全相关
            if (year >= startYear && year <= endYear) {
                relevance = 1.0;
            } else {
                // 根据距离当前年份的远近计算相关性
                const closestYear = (Math.abs(startYear - year) < Math.abs(endYear - year)) 
                    ? startYear : endYear;
                const distance = Math.abs(closestYear - year);
                
                // 设置基础可见范围
                let baseRange = isAncientTime ? 1000 : 200; // 增加基础范围
                
                // 根据重要性增加范围（重要性1-5）
                let importanceMultiplier = Math.max(1, event.importance || 1);
                let range = baseRange * importanceMultiplier;
                
                // 时间越久远，对范围要求越宽松（特别是对古代事件）
                if (Math.abs(startYear) > 1000) {
                    // 古代事件范围扩大
                    const ancientFactor = Math.abs(startYear) > 10000 ? 4 : 
                                         (Math.abs(startYear) > 5000 ? 3 : 2);
                    range = range * ancientFactor;
                }
                
                // 计算相关性，0-1之间
                relevance = Math.max(0, 1 - (distance / range));
                
                // 特殊处理非常重要的事件
                if (event.importance >= 3 && distance <= range * 1.5) {
                    // 确保重要事件的相关性至少有一个最低值
                    relevance = Math.max(relevance, 0.3);
                }
            }
            
            // 添加相关性属性
            return {...event, relevance};
        })
        .filter(event => {
            // 首先筛选相关性 - 降低阈值，让更多事件显示
            const threshold = isAncientTime ? 0.05 : 0.1;
            if (event.relevance <= threshold) return false;
            
            // 然后按类别筛选
            if (this.filterCategory !== 'all') {
                return event.category === this.filterCategory;
            }
            
            return true;
        });
        
        console.log(`筛选后相关事件数: ${relevantEvents.length}`);
        return relevantEvents;
    }
    
    /**
     * 获取与当前年份活跃的迁徙路线
     * @param {Array} migrations - 迁徙数组
     * @param {number} year - 年份
     * @returns {Array} 活跃的迁徙数组
     */
    getActiveMigrations(migrations, year) {
        if (!migrations || !Array.isArray(migrations)) {
            console.warn('传入的迁徙数据无效');
            return [];
        }
        
        // 确保year是数字
        const numericYear = Number(year);
        if (isNaN(numericYear)) {
            console.warn(`无效的年份: ${year}`);
            return [];
        }
        
        console.log(`正在搜索${numericYear}年活跃的迁徙路线，共${migrations.length}条路线`);
        
        // 记录每个迁徙的年份范围，方便调试
        migrations.forEach((m, i) => {
            if (i < 5) { // 只打印前5个以避免日志过多
                console.log(`迁徙 #${i}: ${m.name || '未命名'}, 年份范围: ${m.startYear || '?'} - ${m.endYear || '?'}`);
            }
        });
        
        // 为远古年份设置更宽松的时间范围
        const timeBuffer = Math.abs(numericYear) > 2000 ? 2000 : 500;
        
        const activeMigrations = migrations.filter(migration => {
            // 首先验证迁徙数据有效性
            if (!migration) {
                console.warn('发现无效的迁徙数据项');
                return false;
            }
            
            // 确保坐标数据存在
            if (!migration.startCoordinates || !migration.endCoordinates) {
                // 不显示警告，因为这个检查在后面还会做
                return false;
            }
            
            // 如果有开始年份和结束年份，检查当前年份是否在这个范围内(使用缓冲区)
            if (migration.startYear !== undefined && migration.endYear !== undefined) {
                // 时间匹配使用缓冲区，对非常古老的年份进行特殊处理
                const isActive = (numericYear >= migration.startYear - timeBuffer) && 
                                  (numericYear <= migration.endYear + timeBuffer);
                if (isActive) {
                    console.log(`匹配迁徙: ${migration.name || '未命名'}, ${migration.startYear}-${migration.endYear}`);
                }
                return isActive;
            }
            
            // 如果只有开始年份，假设迁徙持续较长时间
            if (migration.startYear !== undefined) {
                const duration = Math.abs(migration.startYear) > 10000 ? 5000 : 1000; // 古代迁徙持续更长
                const isActive = (numericYear >= migration.startYear - timeBuffer) && 
                                 (numericYear <= migration.startYear + duration + timeBuffer);
                if (isActive) {
                    console.log(`匹配迁徙(只有开始年份): ${migration.name || '未命名'}, ${migration.startYear}-${migration.startYear+duration}`);
                }
                return isActive;
            }
            
            // 如果只有结束年份，假设迁徙提前较长时间开始
            if (migration.endYear !== undefined) {
                const duration = Math.abs(migration.endYear) > 10000 ? 5000 : 1000; // 古代迁徙持续更长
                const isActive = (numericYear >= migration.endYear - duration - timeBuffer) && 
                                 (numericYear <= migration.endYear + timeBuffer);
                if (isActive) {
                    console.log(`匹配迁徙(只有结束年份): ${migration.name || '未命名'}, ${migration.endYear-duration}-${migration.endYear}`);
                }
                return isActive;
            }
            
            // 如果有原始数据的时间范围，尝试解析
            if (migration.originalData && migration.originalData.timeFrame) {
                const timeStr = migration.originalData.timeFrame;
                if (timeStr.includes('至')) {
                    const [startStr, endStr] = timeStr.split('至');
                    const startYear = this.parseYearString(startStr);
                    const endYear = this.parseYearString(endStr);
                    if (startYear !== 0 && endYear !== 0) {
                        const isActive = (numericYear >= startYear - timeBuffer) && 
                                         (numericYear <= endYear + timeBuffer);
                        if (isActive) {
                            console.log(`匹配迁徙(原始数据): ${migration.name || '未命名'}, ${startYear}-${endYear}`);
                        }
                        return isActive;
                    }
                }
            }
            
            // 如果没有明确的年份范围，默认排除
            return false;
        });
        
        console.log(`找到${activeMigrations.length}条活跃的迁徙路线`);
        return activeMigrations;
    }
    
    /**
     * 获取与当前年份相关的技术发展
     * @param {Array} technologies - 技术发展数组
     * @param {number} year - 当前年份
     * @returns {Array} 相关的技术发展数组
     */
    getRelevantTechnologies(technologies, year) {
        if (!technologies || !Array.isArray(technologies)) return [];
        
        // 检查年份参数
        const numericYear = Number(year);
        if (isNaN(numericYear)) {
            console.warn(`无效的年份: ${year}`);
            return [];
        }
        
        console.log(`搜索${numericYear}年相关的技术发展，共${technologies.length}个技术项`);
        
        // 为远古年份设置更宽松的时间范围
        const timeBuffer = Math.abs(numericYear) > 2000 ? 1000 : 200;
        
        const relevantTechnologies = technologies.filter(tech => {
            if (!tech) return false;
            
            // 确保必要的数据存在
            if (!tech.year && !tech.startYear) {
                return false;
            }
            
            // 使用开始年份或普通年份
            const techStartYear = tech.startYear !== undefined ? tech.startYear : tech.year;
            const techEndYear = tech.endYear || techStartYear;
            
            // 检查技术出现的年份是否在当前年份之前
            return (numericYear >= techStartYear - timeBuffer) && (numericYear <= techEndYear + timeBuffer);
        });
        
        console.log(`找到${relevantTechnologies.length}个相关技术发展`);
        return relevantTechnologies;
    }
    
    /**
     * 获取与当前年份相关的物种
     * @param {Array} species - 物种数组
     * @param {number} year - 当前年份
     * @returns {Array} 相关的物种数组
     */
    getRelevantSpecies(species, year) {
        if (!species || !Array.isArray(species)) return [];
        
        const numericYear = Number(year);
        if (isNaN(numericYear)) return [];
        
        // 为远古年份设置更宽松的时间范围
        const timeBuffer = Math.abs(numericYear) > 10000 ? 5000 : 
                          (Math.abs(numericYear) > 5000 ? 2000 : 1000);
        
        const relevantSpecies = species.filter(sp => {
            if (!sp) return false;
            
            // 确保必要的数据存在
            if (!sp.appearYear && !sp.startYear) return false;
            
            // 使用开始年份
            const appearYear = sp.appearYear || sp.startYear;
            const extinctYear = sp.extinctYear || sp.endYear || null;
            
            // 检查物种是否存在于当前年份
            if (extinctYear === null) {
                // 物种没有灭绝
                return numericYear >= appearYear - timeBuffer;
            } else {
                // 物种已灭绝
                return (numericYear >= appearYear - timeBuffer) && (numericYear <= extinctYear + timeBuffer);
            }
        });
        
        return relevantSpecies;
    }
    
    /**
     * 获取与当前年份相关的文明
     * @param {Array} civilizations - 文明数据
     * @param {number} year - 年份
     * @returns {Array} 相关文明
     */
    getRelevantCivilizations(civilizations, year) {
        if (!civilizations || !Array.isArray(civilizations)) {
            console.warn('传入的文明数据无效');
            return [];
        }
        
        // 计算时间缓冲区 - 对于古老文明，使用较大时间范围
        let buffer = 0;
        if (year < -3000) {
            buffer = 500; // 远古时期使用更宽松的缓冲
        } else if (year < -1000) {
            buffer = 300; // 古代文明使用中等缓冲
        } else if (year < 500) {
            buffer = 200; // 经典时期使用较小缓冲
        } else if (year < 1500) {
            buffer = 100; // 中世纪使用小缓冲
        } else {
            buffer = 50;  // 近现代使用最小缓冲
        }
        
        // 筛选当前年份相关的文明
        return civilizations.filter(civ => {
            // 检查文明是否有明确的时间范围 (startYear和endYear)
            if (civ.startYear !== undefined && civ.endYear !== undefined) {
                // 如果在时间范围内，直接返回
                if (year >= civ.startYear && year <= civ.endYear) {
                    return true;
                }
                
                // 检查是否在缓冲区内
                if (year >= civ.startYear - buffer && year <= civ.endYear + buffer) {
                    // 根据离时间范围的距离计算不透明度
                    let opacity = 1.0;
                    if (year < civ.startYear) {
                        opacity = 1.0 - (civ.startYear - year) / buffer;
                    } else if (year > civ.endYear) {
                        opacity = 1.0 - (year - civ.endYear) / buffer;
                    }
                    
                    // 存储不透明度值用于渲染
                    civ._opacity = Math.max(0.1, opacity);
                    return true;
                }
            } else if (civ.startYear !== undefined) {
                // 如果只有开始年份，检查当前年份是否在开始年份之后
                if (year >= civ.startYear) {
                    return true;
                }
                
                // 检查是否在缓冲区内
                if (year >= civ.startYear - buffer) {
                    // 计算不透明度
                    civ._opacity = 1.0 - (civ.startYear - year) / buffer;
                    return true;
                }
            } else if (civ.year !== undefined) {
                // 如果只有单一年份，检查当前年份是否接近
                return Math.abs(year - civ.year) <= buffer;
            }
            
            return false;
        });
    }
    
    /**
     * 获取与当前年份相关的战争
     * @param {Array} wars - 战争数组
     * @param {number} year - 当前年份
     * @returns {Array} 相关的战争数组
     */
    getRelevantWars(wars, year) {
        if (!wars || !Array.isArray(wars)) return [];
        
        const numericYear = Number(year);
        if (isNaN(numericYear)) return [];
        
        // 时间缓冲
        const timeBuffer = 50;
        
        const relevantWars = wars.filter(war => {
            if (!war) return false;
            
            // 确保必要的数据存在
            if (!war.startYear) return false;
            
            const endYear = war.endYear || war.startYear;
            
            // 检查战争是否发生在当前年份
            return (numericYear >= war.startYear - timeBuffer) && (numericYear <= endYear + timeBuffer);
        });
        
        return relevantWars;
    }
    
    /**
     * 获取与当前年份相关的疾病
     * @param {Array} diseases - 疾病数组
     * @param {number} year - 当前年份
     * @returns {Array} 相关的疾病数组
     */
    getRelevantDiseases(diseases, year) {
        if (!diseases || !Array.isArray(diseases)) return [];
        
        const numericYear = Number(year);
        if (isNaN(numericYear)) return [];
        
        // 时间缓冲
        const timeBuffer = 50;
        
        const relevantDiseases = diseases.filter(disease => {
            if (!disease) return false;
            
            // 确保必要的数据存在
            if (!disease.outbreakYear && !disease.startYear) return false;
            
            // 使用爆发年份或开始年份
            const outbreakYear = disease.outbreakYear || disease.startYear;
            const endYear = disease.endYear || outbreakYear + 5; // 默认持续5年
            
            // 检查疾病爆发是否发生在当前年份
            return (numericYear >= outbreakYear - timeBuffer) && (numericYear <= endYear + timeBuffer);
        });
        
        return relevantDiseases;
    }
    
    /**
     * 获取与当前年份相关的农业发展
     * @param {Array} agriculture - 农业发展数组
     * @param {number} year - 当前年份
     * @returns {Array} 相关的农业发展数组
     */
    getRelevantAgriculture(agriculture, year) {
        if (!agriculture || !Array.isArray(agriculture)) return [];
        
        const numericYear = Number(year);
        if (isNaN(numericYear)) return [];
        
        // 为远古年份设置更宽松的时间范围
        const timeBuffer = Math.abs(numericYear) > 5000 ? 2000 : 1000;
        
        const relevantAgriculture = agriculture.filter(ag => {
            if (!ag) return false;
            
            // 确保必要的数据存在
            if (!ag.startYear && !ag.year) return false;
            
            // 使用开始年份或普通年份
            const startYear = ag.startYear !== undefined ? ag.startYear : ag.year;
            const endYear = ag.endYear || (startYear + 1000); // 假设农业技术持续很长时间
            
            // 检查农业发展是否发生在当前年份
            return (numericYear >= startYear - timeBuffer) && (numericYear <= endYear + timeBuffer);
        });
        
        return relevantAgriculture;
    }
    
    /**
     * 添加脉冲效果到指定位置
     * @param {Object} latlng - 坐标位置
     */
    addPulseEffect(latlng) {
        // 创建一个临时的脉冲效果
        const pulseIcon = L.divIcon({
            className: 'pulse-marker',
            html: '<div class="pulse-circle"></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
        
        const pulseMarker = L.marker(latlng, { 
            icon: pulseIcon,
            zIndexOffset: 1000
        }).addTo(this.map);
        
        // 将脉冲标记添加到高亮列表
        this.highlightedElements.push(pulseMarker);
        
        // 3秒后移除脉冲效果
        setTimeout(() => {
            if (this.map.hasLayer(pulseMarker)) {
                this.map.removeLayer(pulseMarker);
                
                // 从高亮列表中移除
                const index = this.highlightedElements.indexOf(pulseMarker);
                if (index !== -1) {
                    this.highlightedElements.splice(index, 1);
                }
            }
        }, 3000);
    }
    
    /**
     * 更新战争数据
     * @param {Array} wars - 战争数据数组
     */
    updateWars(wars) {
        console.log(`更新战争数据，当前年份: ${this.currentYear}`);
        
        // 清除现有战争标记
        this.clearWarMarkers();
        
        if (!wars || !Array.isArray(wars)) {
            console.warn('战争数据无效或为空');
            return;
        }
        
        // 获取当前年份相关的战争
        const relevantWars = this.getRelevantWars(wars, this.currentYear);
        
        console.log(`找到 ${relevantWars.length} 个相关战争`);
        
        // 应用类别筛选
        let filteredWars = relevantWars;
        if (this.filterCategory !== 'all' && this.filterCategory !== '战争') {
            filteredWars = relevantWars.filter(war => war.category === this.filterCategory);
            console.log(`应用类别筛选后剩余 ${filteredWars.length} 个战争`);
        }
        
        // 为每个战争创建标记
        filteredWars.forEach(war => {
            if (war.location) {
                // 确保location是有效的坐标
                let coordinates;
                if (Array.isArray(war.location) && war.location.length === 2) {
                    // 如果location是数组格式 [lng, lat]
                    coordinates = [war.location[1], war.location[0]];
                } else if (war.location.lat !== undefined && war.location.lng !== undefined) {
                    // 如果location是对象格式 {lat, lng}
                    coordinates = [war.location.lat, war.location.lng];
                } else {
                    console.warn(`战争 ${war.title} 的位置格式无效:`, war.location);
                    return;
                }
                
                const marker = this.createCustomMarker(coordinates, '战争', war.title);
                
                // 创建弹出窗口内容
                const popupContent = this.createWarPopupContent(war);
                marker.bindPopup(popupContent);
                
                // 添加到战争图层
                marker.addTo(this.warsLayer);
                
                // 保存引用以便后续清除
                this.warMarkers.push(marker);
            }
        });
        
        console.log('战争数据更新完成');
    }
    
    /**
     * 更新疾病数据
     * @param {Array} diseases - 疾病数据数组
     */
    updateDiseases(diseases) {
        console.log(`更新疾病数据，当前年份: ${this.currentYear}`);
        
        // 清除现有疾病标记
        this.clearDiseaseMarkers();
        
        if (!diseases || !Array.isArray(diseases)) {
            console.warn('疾病数据无效或为空');
            return;
        }
        
        // 获取当前年份相关的疾病
        const relevantDiseases = this.getRelevantDiseases(diseases, this.currentYear);
        
        console.log(`找到 ${relevantDiseases.length} 个相关疾病`);
        
        // 应用类别筛选
        let filteredDiseases = relevantDiseases;
        if (this.filterCategory !== 'all' && this.filterCategory !== '疾病') {
            filteredDiseases = relevantDiseases.filter(disease => disease.category === this.filterCategory);
            console.log(`应用类别筛选后剩余 ${filteredDiseases.length} 个疾病`);
        }
        
        // 为每个疾病创建标记
        filteredDiseases.forEach(disease => {
            if (disease.location) {
                // 确保location是有效的坐标
                let coordinates;
                if (Array.isArray(disease.location) && disease.location.length === 2) {
                    // 如果location是数组格式 [lng, lat]
                    coordinates = [disease.location[1], disease.location[0]];
                } else if (disease.location.lat !== undefined && disease.location.lng !== undefined) {
                    // 如果location是对象格式 {lat, lng}
                    coordinates = [disease.location.lat, disease.location.lng];
                } else {
                    console.warn(`疾病 ${disease.title} 的位置格式无效:`, disease.location);
                    return;
                }
                
                const marker = this.createCustomMarker(coordinates, '疾病', disease.title);
                
                // 创建弹出窗口内容
                const popupContent = this.createDiseasePopupContent(disease);
                marker.bindPopup(popupContent);
                
                // 添加到疾病图层
                marker.addTo(this.diseasesLayer);
                
                // 保存引用以便后续清除
                this.diseaseMarkers.push(marker);
            }
        });
        
        console.log('疾病数据更新完成');
    }
    
    /**
     * 更新农业数据
     * @param {Array} agriculture - 农业数据数组
     */
    updateAgriculture(agriculture) {
        console.log(`更新农业数据，当前年份: ${this.currentYear}`);
        
        // 清除现有农业标记
        this.clearAgricultureMarkers();
        
        if (!agriculture || !Array.isArray(agriculture)) {
            console.warn('农业数据无效或为空');
            return;
        }
        
        // 获取当前年份相关的农业
        const relevantAgriculture = this.getRelevantAgriculture(agriculture, this.currentYear);
        
        console.log(`找到 ${relevantAgriculture.length} 个相关农业发展`);
        
        // 应用类别筛选
        let filteredAgriculture = relevantAgriculture;
        if (this.filterCategory !== 'all' && this.filterCategory !== '农业') {
            filteredAgriculture = relevantAgriculture.filter(agri => agri.category === this.filterCategory);
            console.log(`应用类别筛选后剩余 ${filteredAgriculture.length} 个农业发展`);
        }
        
        // 为每个农业发展创建标记
        filteredAgriculture.forEach(agri => {
            if (agri.location) {
                // 确保location是有效的坐标
                let coordinates;
                if (Array.isArray(agri.location) && agri.location.length === 2) {
                    // 如果location是数组格式 [lng, lat]
                    coordinates = [agri.location[1], agri.location[0]];
                } else if (agri.location.lat !== undefined && agri.location.lng !== undefined) {
                    // 如果location是对象格式 {lat, lng}
                    coordinates = [agri.location.lat, agri.location.lng];
                } else {
                    console.warn(`农业发展 ${agri.title} 的位置格式无效:`, agri.location);
                    return;
                }
                
                const marker = this.createCustomMarker(coordinates, '农业', agri.title);
                
                // 创建弹出窗口内容
                const popupContent = this.createAgriculturePopupContent(agri);
                marker.bindPopup(popupContent);
                
                // 添加到农业图层
                marker.addTo(this.agricultureLayer);
                
                // 保存引用以便后续清除
                this.agricultureMarkers.push(marker);
            }
        });
        
        console.log('农业数据更新完成');
    }
    
    /**
     * 更新物种数据
     * @param {Array} species - 物种数据数组
     */
    updateSpecies(species) {
        console.log(`更新物种数据，当前年份: ${this.currentYear}`);
        
        // 清除现有物种标记
        this.clearSpeciesMarkers();
        
        if (!species || !Array.isArray(species)) {
            console.warn('物种数据无效或为空');
            return;
        }
        
        // 获取当前年份相关的物种
        const relevantSpecies = this.getRelevantSpecies(species, this.currentYear);
        
        console.log(`找到 ${relevantSpecies.length} 个相关物种`);
        
        // 应用类别筛选
        let filteredSpecies = relevantSpecies;
        if (this.filterCategory !== 'all' && this.filterCategory !== '物种') {
            filteredSpecies = relevantSpecies.filter(sp => sp.category === this.filterCategory);
            console.log(`应用类别筛选后剩余 ${filteredSpecies.length} 个物种`);
        }
        
        // 为每个物种创建标记
        filteredSpecies.forEach(sp => {
            if (sp.location) {
                // 确保location是有效的坐标
                let coordinates;
                if (Array.isArray(sp.location) && sp.location.length === 2) {
                    // 如果location是数组格式 [lng, lat]
                    coordinates = [sp.location[1], sp.location[0]];
                } else if (sp.location.lat !== undefined && sp.location.lng !== undefined) {
                    // 如果location是对象格式 {lat, lng}
                    coordinates = [sp.location.lat, sp.location.lng];
                } else {
                    console.warn(`物种 ${sp.title} 的位置格式无效:`, sp.location);
                    return;
                }
                
                const marker = this.createCustomMarker(coordinates, '物种', sp.title);
                
                // 创建弹出窗口内容
                const popupContent = this.createSpeciesPopup(sp);
                marker.bindPopup(popupContent);
                
                // 添加到物种图层
                marker.addTo(this.speciesLayer);
                
                // 保存引用以便后续清除
                this.speciesMarkers.push(marker);
            }
        });
        
        console.log('物种数据更新完成');
    }
    
    /**
     * 清除战争标记
     */
    clearWarMarkers() {
        // 清除所有已保存的战争标记
        if (this.warMarkers && this.warMarkers.length > 0) {
            this.warMarkers.forEach(marker => {
                if (marker) {
                    this.warsLayer.removeLayer(marker);
                }
            });
        }
        
        this.warMarkers = [];
    }
    
    /**
     * 清除疾病标记
     */
    clearDiseaseMarkers() {
        // 清除所有已保存的疾病标记
        if (this.diseaseMarkers && this.diseaseMarkers.length > 0) {
            this.diseaseMarkers.forEach(marker => {
                if (marker) {
                    this.diseasesLayer.removeLayer(marker);
                }
            });
        }
        
        this.diseaseMarkers = [];
    }
    
    /**
     * 清除农业标记
     */
    clearAgricultureMarkers() {
        // 清除所有已保存的农业标记
        if (this.agricultureMarkers && this.agricultureMarkers.length > 0) {
            this.agricultureMarkers.forEach(marker => {
                if (marker) {
                    this.agricultureLayer.removeLayer(marker);
                }
            });
        }
        
        this.agricultureMarkers = [];
    }
    
    /**
     * 切换战争显示
     * @param {boolean} show - 是否显示
     */
    toggleWars(show) {
        this.showWars = show;
        
        if (show) {
            this.map.addLayer(this.warsLayer);
        } else {
            this.map.removeLayer(this.warsLayer);
        }
        
        console.log(`战争显示: ${show ? '开启' : '关闭'}`);
    }
    
    /**
     * 切换疾病显示
     * @param {boolean} show - 是否显示
     */
    toggleDiseases(show) {
        this.showDiseases = show;
        
        if (show) {
            this.map.addLayer(this.diseasesLayer);
        } else {
            this.map.removeLayer(this.diseasesLayer);
        }
        
        console.log(`疾病显示: ${show ? '开启' : '关闭'}`);
    }
    
    /**
     * 切换农业显示
     * @param {boolean} show - 是否显示
     */
    toggleAgriculture(show) {
        this.showAgriculture = show;
        
        if (show) {
            this.map.addLayer(this.agricultureLayer);
        } else {
            this.map.removeLayer(this.agricultureLayer);
        }
        
        console.log(`农业显示: ${show ? '开启' : '关闭'}`);
    }
    
    /**
     * 获取GeoJSON要素的样式
     * @param {Object} feature - GeoJSON要素
     * @returns {Object} 样式对象
     */
    getGeoJSONStyle(feature) {
        // 默认样式
        const defaultStyle = {
            weight: 1,
            opacity: 0.5,
            color: '#666',
            fillOpacity: 0.3,
            fillColor: '#888'
        };
        
        // 如果feature有properties和style属性，使用这些属性
        if (feature.properties && feature.properties.style) {
            return { ...defaultStyle, ...feature.properties.style };
        }
        
        return defaultStyle;
    }
    
    /**
     * 为每个要素添加交互功能
     * @param {Object} feature - GeoJSON要素
     * @param {Object} layer - Leaflet图层
     */
    onEachFeature(feature, layer) {
        if (!feature.properties) {
            return;
        }
        
        // 添加弹出窗口
        if (feature.properties.name || feature.properties.description) {
            let popupContent = '';
            
            if (feature.properties.name) {
                popupContent += `<h3>${feature.properties.name}</h3>`;
            }
            
            if (feature.properties.description) {
                popupContent += `<p>${feature.properties.description}</p>`;
            }
            
            // 添加年份信息（如果有）
            if (feature.properties.year || feature.properties.startYear || feature.properties.endYear) {
                let yearInfo = '';
                
                if (feature.properties.year) {
                    yearInfo = `${this.formatYear(feature.properties.year)}`;
                } else if (feature.properties.startYear && feature.properties.endYear) {
                    yearInfo = `${this.formatYear(feature.properties.startYear)} - ${this.formatYear(feature.properties.endYear)}`;
                } else if (feature.properties.startYear) {
                    yearInfo = `${this.formatYear(feature.properties.startYear)} 开始`;
                } else if (feature.properties.endYear) {
                    yearInfo = `至 ${this.formatYear(feature.properties.endYear)}`;
                }
                
                if (yearInfo) {
                    popupContent += `<p><em>${yearInfo}</em></p>`;
                }
            }
            
            if (popupContent) {
                layer.bindPopup(popupContent);
            }
        }
        
        // 添加悬停效果
        layer.on({
            mouseover: (e) => {
                const layer = e.target;
                layer.setStyle({
                    weight: 3,
                    color: '#f00',
                    fillOpacity: 0.5
                });
                
                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                    layer.bringToFront();
                }
                
                this.updateInfo(feature);
            },
            mouseout: (e) => {
                this.geoJSONLayer.resetStyle(e.target);
                this.map.closePopup();
            },
            click: (e) => {
                this.map.fitBounds(e.target.getBounds());
                
                if (feature.properties && feature.properties.name) {
                    console.log(`点击了区域: ${feature.properties.name}`);
                }
            }
        });
    }
    
    /**
     * 更新信息面板
     * @param {Object} feature - GeoJSON要素
     */
    updateInfo(feature) {
        if (this.infoPanel && feature.properties) {
            const info = document.getElementById(this.infoPanel);
            if (info) {
                let content = '';
                
                if (feature.properties.name) {
                    content += `<h4>${feature.properties.name}</h4>`;
                }
                
                if (feature.properties.description) {
                    content += `<p>${feature.properties.description}</p>`;
                }
                
                info.innerHTML = content || '点击地图以获取信息';
                info.style.display = 'block';
            }
        }
    }
    
    /**
     * 清除信息面板
     */
    clearInfo() {
        if (this.infoPanel) {
            const info = document.getElementById(this.infoPanel);
            if (info) {
                info.innerHTML = '点击地图以获取信息';
            }
        }
    }
    
    /**
     * 将地图焦点设置到指定坐标
     * @param {number} lat - 纬度
     * @param {number} lng - 经度
     * @param {number} zoomLevel - 缩放级别（可选，默认为12）
     */
    focusOnLocation(lat, lng, zoomLevel = 12) {
        if (isNaN(lat) || isNaN(lng)) {
            console.error('无效的坐标值:', lat, lng);
            return;
        }
        
        console.log(`将地图焦点设置到坐标: [${lat}, ${lng}], 缩放级别: ${zoomLevel}`);
        
        try {
            // 将地图视图设置到指定位置和缩放级别
            this.map.setView([lat, lng], zoomLevel);
            
            // 添加临时标记以突出显示位置
            const marker = L.circleMarker([lat, lng], {
                radius: 8,
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.8,
                weight: 2
            }).addTo(this.map);
            
            // 在标记上添加弹出窗口
            marker.bindPopup(`坐标: [${lat.toFixed(4)}, ${lng.toFixed(4)}]`).openPopup();
            
            // 设置标记闪烁动画
            const blink = () => {
                marker.setStyle({ opacity: 0.2, fillOpacity: 0.1 });
                setTimeout(() => {
                    marker.setStyle({ opacity: 1, fillOpacity: 0.8 });
                }, 300);
            };
            
            // 执行几次闪烁动画
            for (let i = 0; i < 3; i++) {
                setTimeout(blink, i * 600);
            }
            
            // 3秒后移除临时标记
            setTimeout(() => {
                this.map.removeLayer(marker);
            }, 3000);
        } catch (error) {
            console.error('设置地图焦点时出错:', error);
        }
    }
    
    /**
     * 显示或隐藏技术发展
     * @param {boolean} show - 是否显示技术
     */
    toggleTechnologies(show) {
        this.showTechnologies = show;
        if (show) {
            this.map.addLayer(this.technologiesLayer);
        } else {
            this.map.removeLayer(this.technologiesLayer);
        }
    }
    
    /**
     * 显示或隐藏物种
     * @param {boolean} show - 是否显示物种
     */
    toggleSpecies(show) {
        this.showSpecies = show;
        if (show) {
            this.map.addLayer(this.speciesLayer);
        } else {
            this.map.removeLayer(this.speciesLayer);
        }
    }
    
    /**
     * 显示或隐藏战争
     * @param {boolean} show - 是否显示战争
     */
    toggleWars(show) {
        this.showWars = show;
        if (show) {
            this.map.addLayer(this.warsLayer);
        } else {
            this.map.removeLayer(this.warsLayer);
        }
    }
    
    /**
     * 显示或隐藏疾病
     * @param {boolean} show - 是否显示疾病
     */
    toggleDiseases(show) {
        this.showDiseases = show;
        if (show) {
            this.map.addLayer(this.diseasesLayer);
        } else {
            this.map.removeLayer(this.diseasesLayer);
        }
    }
    
    /**
     * 显示或隐藏农业
     * @param {boolean} show - 是否显示农业
     */
    toggleAgriculture(show) {
        this.showAgriculture = show;
        if (show) {
            this.map.addLayer(this.agricultureLayer);
        } else {
            this.map.removeLayer(this.agricultureLayer);
        }
    }
} 