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
     * 构造函数
     * @param {string} mapElementId - 地图容器ID
     */
    constructor(mapElementId = 'map') {
        this.mapElementId = mapElementId;
        this.map = null;
        this.currentGeoJSON = null;
        this.currentYear = 0;
        
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
    initialize() {
        console.log('初始化地图...');
        
        // 创建Leaflet地图实例
        this.map = L.map(this.mapElementId, {
            center: [30, 15], // 初始地图中心
            zoom: 2,         // 初始缩放级别
            minZoom: 2,      // 最小缩放级别
            maxZoom: 8,      // 最大缩放级别
            zoomControl: true, // 显示缩放控件
            attributionControl: true, // 显示归属控件
            worldCopyJump: false, // 禁止世界地图复制
            maxBounds: [[-90, -180], [90, 180]], // 限制地图可拖动范围
            maxBoundsViscosity: 1.0, // 完全限制在边界内
            fadeAnimation: true,      // 启用淡入淡出动画
            zoomAnimation: true,      // 启用缩放动画
            markerZoomAnimation: true // 启用标记缩放动画
        });
        
        // 判断当前主题
        const isDarkMode = document.body.classList.contains('dark');
        
        // 添加底图图层 - 使用更美观的地图源
        const lightStyleUrl = 'https://api.maptiler.com/maps/voyager/style.json?key=get_your_own_key';
        const darkStyleUrl = 'https://api.maptiler.com/maps/darkmatter/style.json?key=get_your_own_key';
        
        // 使用备选底图
        const lightTileUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        
        // 添加底图图层
        this.baseLayer = L.tileLayer(isDarkMode ? darkTileUrl : lightTileUrl, {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            minZoom: 0
        }).addTo(this.map);
        
        // 监听主题变化
        document.addEventListener('themeChanged', (e) => {
            const isDark = e.detail && e.detail.isDark;
            // 更新底图
            this.baseLayer.setUrl(isDark ? darkTileUrl : lightTileUrl);
        });
        
        // 创建图层组
        this.labelsLayer = L.layerGroup().addTo(this.map);
        
        // 确保所有专用图层也被初始化
        this.geojsonLayer = null; // 先设为null，后面会创建
        this.markersLayer = L.layerGroup().addTo(this.map);
        this.routesLayer = L.layerGroup().addTo(this.map);
        this.technologiesLayer = L.layerGroup().addTo(this.map);
        this.speciesLayer = L.layerGroup().addTo(this.map);
        this.organizationsLayer = L.layerGroup().addTo(this.map);
        this.warsLayer = L.layerGroup().addTo(this.map);
        this.diseasesLayer = L.layerGroup().addTo(this.map);
        this.agricultureLayer = L.layerGroup().addTo(this.map);
        
        // 重新初始化数组以确保清空
        this.eventMarkers = [];
        this.migrationRoutes = [];
        this.techMarkers = [];
        this.speciesMarkers = [];
        this.highlightedElements = [];
        this.labels = [];
        this.labelNames = new Set();
        this.warMarkers = [];
        this.diseaseMarkers = [];
        this.agricultureMarkers = [];
        
        // 添加GeoJSON区域边界
        this.loadGeoJSON();
        
        // 添加缩放事件监听器
        this.map.on('zoomend', () => {
            this.updateLabelsVisibility();
        });
        
        // 添加主题切换处理
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            // 短暂延迟以确保DOM类已更新
            setTimeout(() => {
                // 触发自定义事件
                document.dispatchEvent(new CustomEvent('themeChanged', {
                    detail: { isDark: document.body.classList.contains('dark') }
                }));
                
                // 通知地图刷新 - 这会触发重绘
                this.map.invalidateSize();
            }, 50);
        });
        
        console.log('地图初始化完成');
    }
    
    /**
     * 更新地图到指定年份
     * @param {number} year - 目标年份
     * @param {Object} data - 包含事件和迁徙数据的对象
     * @returns {Promise<void>} 
     */
    async updateToYear(year, data) {
        try {
            console.log(`更新地图到年份: ${year}`);
            this.currentYear = year;
            
            // 显示加载中指示器
            this.showLoader();
            
            // 加载指定年份的地图数据
            this.currentGeoJSON = await getMapForYear(year);
            
            // 更新GeoJSON图层
            this.updateGeoJSONLayer();
            
            // 如果有事件数据且启用了事件显示，则更新事件标记
            if (data.allEvents && this.showEvents) {
                this.updateEventMarkers(data.allEvents);
            }
            
            // 如果有迁徙数据且启用了迁徙显示，则更新迁徙路线
            if (data.migrations && this.showMigrations) {
                this.updateMigrationRoutes(data.migrations);
            }
            
            // 如果有技术发展数据且启用了技术显示，则更新技术标记
            if (data.technologies && this.showTechnologies) {
                this.updateTechnologicalDevelopments(data.technologies);
            }
            
            // 如果有物种数据且启用了物种显示，则更新物种标记
            if (data.species && this.showSpecies) {
                this.updateRegionalSpecies(data.species);
            }
            
            // 如果有文明数据且启用了社会组织显示，则更新社会组织标记
            if (data.civilizations && this.showOrganizations) {
                this.updateSocialOrganizations(data.civilizations);
            }
            
            // 如果有战争数据且启用了战争显示，则更新战争标记
            if (data.wars && this.showWars) {
                this.updateWars(data.wars);
            }
            
            // 如果有疾病数据且启用了疾病显示，则更新疾病标记
            if (data.diseases && this.showDiseases) {
                this.updateDiseases(data.diseases);
            }
            
            // 如果有农业数据且启用了农业显示，则更新农业标记
            if (data.agriculture && this.showAgriculture) {
                this.updateAgriculture(data.agriculture);
            }
            
            // 隐藏加载中指示器
            this.hideLoader();
            
            console.log(`地图已更新到年份: ${formatYear(year)}`);
        } catch (error) {
            console.error('更新地图时出错:', error);
            this.hideLoader();
            this.showError('更新地图时出错: ' + error.message);
        }
    }
    
    /**
     * 更新GeoJSON图层
     */
    updateGeoJSONLayer() {
        console.log('更新GeoJSON图层');
        
        // 保存当前GeoJSON数据
        this.currentGeoJSON = this.currentGeoJSON;
        
        // 清除现有图层
        if (this.geojsonLayer) {
            this.map.removeLayer(this.geojsonLayer);
        }
        
        // 清除现有标签
        this.clearRegionLabels();
        
        // 如果没有GeoJSON数据，则不添加新图层
        if (!this.currentGeoJSON) {
            console.warn('没有GeoJSON数据可显示');
            return;
        }
        
        // 保存唯一国家/区域名称集合，用于防止重复标签
        const uniqueNames = new Set();
        
        // 添加新图层
        this.geojsonLayer = L.geoJSON(this.currentGeoJSON, {
            style: (feature) => {
                // 设置区域样式
                return this.getRegionStyle(feature);
            },
            onEachFeature: (feature, layer) => {
                // 为每个区域添加交互
                this.addRegionInteraction(feature, layer);
                
                // 为满足条件的区域添加标签
                if (feature.properties && feature.properties.name) {
                    // 跳过"未命名区域"
                    if (feature.properties.name === "未命名区域" || 
                        feature.properties.name.includes("未命名")) {
                        return;
                    }
                    
                    // 只添加唯一的名称标签
                    if (!uniqueNames.has(feature.properties.name)) {
                        uniqueNames.add(feature.properties.name);
                        this.addLabelToFeature(feature);
                    }
                }
            }
        }).addTo(this.map);
        
        // 监听缩放事件，更新标签可见性
        this.map.on('zoomend', () => {
            this.updateLabelsVisibility();
        });
        
        console.log('GeoJSON图层更新完成');
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
                this.geojsonLayer.resetStyle(e.target);
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
        if (year === undefined) return '';
        return year < 0 ? `前${Math.abs(year)}` : `${year}`;
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
     * 更新技术发展标记
     * @param {Array} technologies - 技术发展数据数组
     */
    updateTechnologicalDevelopments(technologies) {
        // 清除现有的技术标记
        this.technologiesLayer.clearLayers();
        
        if (!technologies || !Array.isArray(technologies)) {
            console.warn('技术发展数据无效');
            return;
        }
        
        // 获取与当前年份相关的技术
        const relevantTechnologies = technologies.filter(tech => {
            return this.isTimeRangeRelevant(tech.year, tech.endYear || tech.year, this.currentYear);
        });
        
        if (relevantTechnologies.length === 0) {
            console.log(`年份 ${this.currentYear} 没有相关技术发展`);
            return;
        }
        
        // 添加技术标记
        relevantTechnologies.forEach(tech => {
            if (tech.location && tech.location.length === 2) {
                // 创建技术图标
                const marker = this.createCustomMarker(
                    [tech.location[1], tech.location[0]],
                    '技术',
                    tech.title
                );
            
            // 添加弹出框
                marker.bindPopup(this.createTechnologyPopup(tech));
                
                // 添加到技术图层
                this.technologiesLayer.addLayer(marker);
            }
        });
        
        console.log(`添加了 ${relevantTechnologies.length} 个技术发展标记`);
    }
    
    /**
     * 更新区域物种标记
     * @param {Array} species - 物种数据数组
     */
    updateRegionalSpecies(species) {
        // 清除现有的物种标记
        this.speciesLayer.clearLayers();
        
        if (!species || !Array.isArray(species)) {
            console.warn('物种数据无效');
            return;
        }
        
        // 获取与当前年份相关的物种
        const relevantSpecies = species.filter(s => {
            return this.isTimeRelevant(s.year, this.currentYear);
        });
        
        if (relevantSpecies.length === 0) {
            console.log(`年份 ${this.currentYear} 没有相关物种`);
            return;
        }
        
        // 添加物种标记
        relevantSpecies.forEach(species => {
            if (species.location && species.location.length === 2) {
                // 创建物种图标
                const marker = this.createCustomMarker(
                    [species.location[1], species.location[0]],
                    '农业',
                    species.title
                );
                
                // 添加弹出框
                marker.bindPopup(this.createSpeciesPopup(species));
                
                // 添加到物种图层
                this.speciesLayer.addLayer(marker);
            }
        });
        
        console.log(`添加了 ${relevantSpecies.length} 个物种标记`);
    }
    
    /**
     * 更新社会组织标记
     * @param {Array} organizations - 社会组织数据数组
     */
    updateSocialOrganizations(organizations) {
        // 清除现有的社会组织标记
        this.organizationsLayer.clearLayers();
        
        if (!organizations || !Array.isArray(organizations)) {
            console.warn('社会组织数据无效');
            return;
        }
        
        // 获取与当前年份相关的社会组织
        const relevantOrganizations = organizations.filter(org => {
            // 检查是否是新格式
            if (org.startYear !== undefined) {
                return this.isTimeRangeRelevant(org.startYear, org.endYear || org.startYear, this.currentYear);
            }
            
            // 旧格式处理
            if (org.形成时间) {
                return this.isTimeRelevant(this.parseYearString(org.形成时间), this.currentYear);
            }
            
            return false;
        });
        
        if (relevantOrganizations.length === 0) {
            console.log(`年份 ${this.currentYear} 没有相关社会组织`);
            return;
        }
        
        // 添加社会组织标记
        relevantOrganizations.forEach(org => {
            // 处理新格式
            if (org.location) {
                let lat, lng;
                
                // 检查 location 格式
                if (org.location.lat !== undefined && org.location.lng !== undefined) {
                    lat = org.location.lat;
                    lng = org.location.lng;
                } else if (Array.isArray(org.location) && org.location.length === 2) {
                    lng = org.location[0]; // GeoJSON 格式 [lng, lat]
                    lat = org.location[1];
                }
                
                if (lat !== undefined && lng !== undefined) {
                    // 创建社会组织图标
                    const marker = this.createCustomMarker(
                        [lat, lng],
                        '文明',
                        org.title || org.name || '未命名文明'
                    );
                    
                    // 添加弹出框
                    marker.bindPopup(`
                        <div class="popup-content">
                            <h3 class="text-lg font-bold">${org.title || org.name || '未命名文明'}</h3>
                            <p class="text-sm text-gray-600">时期: ${this.formatYear(org.startYear)} - ${this.formatYear(org.endYear || org.startYear)}</p>
                            <p class="mt-2">类型: ${org.category || org.type || '未知'}</p>
                            <p>地区: ${org.region || '未知'}</p>
                            <p class="mt-2">${org.description || ''}</p>
                        </div>
                    `);
                    
                    // 添加到社会组织图层
                    this.organizationsLayer.addLayer(marker);
                }
                return;
            }
            
            // 处理旧格式
            if (org.中心位置 && org.中心位置.coordinates) {
                const coordinates = org.中心位置.coordinates;
                // 创建社会组织图标
                const marker = this.createCustomMarker(
                    [coordinates[1], coordinates[0]],
                    '文明',
                    org.组织名称
                );
                
                // 添加弹出框
                marker.bindPopup(`
                    <div class="popup-content">
                        <h3 class="text-lg font-bold">${org.组织名称}</h3>
                        <p class="text-sm text-gray-600">形成时间: ${org.形成时间}</p>
                        <p class="mt-2">类型: ${org.组织类型}</p>
                        <p>人口规模: ${org.人口规模 || '未知'}</p>
                        <p class="mt-2">${org.特点描述}</p>
                    </div>
                `);
                
                // 添加到社会组织图层
                this.organizationsLayer.addLayer(marker);
            }
        });
        
        console.log(`添加了 ${relevantOrganizations.length} 个社会组织标记`);
    }
    
    /**
     * 创建技术弹出窗口内容
     * @param {Object} tech - 技术对象
     * @returns {string} HTML内容
     */
    createTechnologyPopup(tech) {
        // 本地年份格式化函数
        const formatYearLocal = (year) => {
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };
        
        return `
            <div class="popup-content">
                <h3 class="text-lg font-bold">${tech.title}</h3>
                <p class="text-sm text-gray-600">时间: ${formatYearLocal(tech.year)}</p>
                <p class="mt-2">${tech.description}</p>
                <p class="mt-2"><strong>影响:</strong> ${tech.impact || '未知'}</p>
            </div>
        `;
    }
    
    /**
     * 创建物种弹出窗口内容
     * @param {Object} species - 物种对象
     * @returns {string} HTML内容
     */
    createSpeciesPopup(species) {
        // 本地年份格式化函数
        const formatYearLocal = (year) => {
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };
        
        return `
            <div class="popup-content">
                <h3 class="text-lg font-bold">${species.title}</h3>
                <p class="text-sm text-gray-600">驯化时间: ${formatYearLocal(species.year)}</p>
                <p class="mt-2">类型: ${species.type || '未知'}</p>
                <p>用途: ${species.uses || '未知'}</p>
                <p class="mt-2"><strong>贡献:</strong> ${species.impact || '未知'}</p>
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
        
        // 创建自定义图标
        const icon = L.divIcon({
            className: `custom-icon ${category}`,
            html: `<div class="icon-inner" style="background-color: ${color};">${name.charAt(0)}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        return L.marker(latlng, { icon: icon });
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
     * 获取与当前年份相关的事件
     * @param {Array} events - 所有事件
     * @param {number} year - 当前年份
     * @returns {Array} 相关事件数组，每个事件增加了relevance属性
     */
    getRelevantEvents(events, year) {
        if (!events || !Array.isArray(events)) return [];
        
        console.log(`处理事件: 年份=${year}, 类别过滤=${this.filterCategory}`);
        
        // 计算每个事件的相关性并进行筛选
        return events.map(event => {
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
                let baseRange = 50; // 默认基础范围
                
                // 根据重要性增加范围（重要性1-5）
                let importanceMultiplier = event.importance || 1;
                let range = baseRange * importanceMultiplier;
                
                // 时间越久远，对范围要求越宽松（特别是对古代事件）
                if (Math.abs(startYear) > 1000) {
                    // 古代事件范围扩大
                    range = range * 1.5;
                }
                
                // 计算相关性，0-1之间
                relevance = Math.max(0, 1 - (distance / range));
                
                // 特殊处理非常重要的事件（重要性>=4）
                if (event.importance >= 4 && distance <= 200) {
                    // 确保重要事件的相关性至少有一个最低值
                    relevance = Math.max(relevance, 0.2);
                }
            }
            
            // 添加相关性属性
            return {...event, relevance};
        })
        .filter(event => {
            // 首先筛选相关性
            if (event.relevance <= 0.1) return false;
            
            // 然后按类别筛选
            if (this.filterCategory !== 'all') {
                return event.category === this.filterCategory;
            }
            
            return true;
        });
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
            
            // 如果有开始年份和结束年份，检查当前年份是否在这个范围内
            if (migration.startYear !== undefined && migration.endYear !== undefined) {
                const isActive = numericYear >= migration.startYear && numericYear <= migration.endYear;
                if (isActive) {
                    console.log(`匹配迁徙: ${migration.name || '未命名'}, ${migration.startYear}-${migration.endYear}`);
                }
                return isActive;
            }
            
            // 如果只有开始年份，假设迁徙持续100年
            if (migration.startYear !== undefined) {
                const isActive = numericYear >= migration.startYear && numericYear <= (migration.startYear + 100);
                if (isActive) {
                    console.log(`匹配迁徙(只有开始年份): ${migration.name || '未命名'}, ${migration.startYear}-${migration.startYear+100}`);
                }
                return isActive;
            }
            
            // 如果只有结束年份，假设迁徙提前100年开始
            if (migration.endYear !== undefined) {
                const isActive = numericYear >= (migration.endYear - 100) && numericYear <= migration.endYear;
                if (isActive) {
                    console.log(`匹配迁徙(只有结束年份): ${migration.name || '未命名'}, ${migration.endYear-100}-${migration.endYear}`);
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
                        const isActive = numericYear >= startYear && numericYear <= endYear;
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
     * 创建单个事件标记
     * @param {Object} feature - GeoJSON特征
     * @returns {Object} Leaflet标记对象
     */
    createEventMarker(feature) {
        if (!feature || !feature.geometry || !feature.geometry.coordinates) {
            console.error('特征缺少有效的坐标信息');
            return null;
        }
        
        try {
            // 创建标记位置 - GeoJSON坐标格式为[lng, lat]
            const latlng = L.latLng(
                feature.geometry.coordinates[1],  // lat
                feature.geometry.coordinates[0]   // lng
            );
            
            // 根据重要性调整标记大小
            const importance = feature.properties.importance || 1;
            const size = 24 + importance * 4;
            
            // 创建自定义HTML标记
            const icon = L.divIcon({
                className: 'custom-marker',
                html: this.createEventMarkerHTML(feature),
                iconSize: [size, size],
                iconAnchor: [size/2, size/2],
                popupAnchor: [0, -size/2 - 5]
            });
            
            // 创建标记
            const marker = L.marker(latlng, { 
                icon: icon,
                riseOnHover: true,
                riseOffset: 300,
                zIndexOffset: importance * 100
            });
            
            // 添加气泡
            marker.bindPopup(this.createEventPopupContent(feature));
            
            // 添加到地图
            marker.addTo(this.map);
            
            return marker;
        } catch (error) {
            console.error(`创建事件标记时出错:`, error);
            return null;
        }
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
        const relevantWars = wars.filter(war => {
            return this.isTimeRangeRelevant(war.startYear, war.endYear, this.currentYear);
        });
        
        console.log(`找到 ${relevantWars.length} 个相关战争`);
        
        // 应用类别筛选
        let filteredWars = relevantWars;
        if (this.filterCategory !== 'all') {
            filteredWars = relevantWars.filter(war => war.category === this.filterCategory);
            console.log(`应用类别筛选后剩余 ${filteredWars.length} 个战争`);
        }
        
        // 为每个战争创建标记
        filteredWars.forEach(war => {
            if (war.location && war.location.length === 2) {
                const [lng, lat] = war.location;
                const marker = this.createCustomMarker([lat, lng], 'war', war.title);
                
                // 创建弹出窗口内容
                const popupContent = this.createWarPopupContent(war);
                marker.bindPopup(popupContent);
                
                // 设置交互事件
                marker.on('mouseover', function() {
                    this.openPopup();
                });
                
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
        const relevantDiseases = diseases.filter(disease => {
            return this.isTimeRangeRelevant(disease.startYear, disease.endYear, this.currentYear);
        });
        
        console.log(`找到 ${relevantDiseases.length} 个相关疾病`);
        
        // 应用类别筛选
        let filteredDiseases = relevantDiseases;
        if (this.filterCategory !== 'all') {
            filteredDiseases = relevantDiseases.filter(disease => disease.category === this.filterCategory);
            console.log(`应用类别筛选后剩余 ${filteredDiseases.length} 个疾病`);
        }
        
        // 为每个疾病创建标记
        filteredDiseases.forEach(disease => {
            if (disease.location && disease.location.length === 2) {
                const [lng, lat] = disease.location;
                const marker = this.createCustomMarker([lat, lng], 'disease', disease.title);
                
                // 创建弹出窗口内容
                const popupContent = this.createDiseasePopupContent(disease);
                marker.bindPopup(popupContent);
                
                // 设置交互事件
                marker.on('mouseover', function() {
                    this.openPopup();
                });
                
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
        const relevantAgriculture = agriculture.filter(agri => {
            return this.isTimeRangeRelevant(agri.startYear, agri.endYear, this.currentYear);
        });
        
        console.log(`找到 ${relevantAgriculture.length} 个相关农业发展`);
        
        // 应用类别筛选
        let filteredAgriculture = relevantAgriculture;
        if (this.filterCategory !== 'all') {
            filteredAgriculture = relevantAgriculture.filter(agri => agri.category === this.filterCategory);
            console.log(`应用类别筛选后剩余 ${filteredAgriculture.length} 个农业发展`);
        }
        
        // 为每个农业发展创建标记
        filteredAgriculture.forEach(agri => {
            if (agri.location && agri.location.length === 2) {
                const [lng, lat] = agri.location;
                const marker = this.createCustomMarker([lat, lng], 'agriculture', agri.title);
                
                // 创建弹出窗口内容
                const popupContent = this.createAgriculturePopupContent(agri);
                marker.bindPopup(popupContent);
                
                // 设置交互事件
                marker.on('mouseover', function() {
                    this.openPopup();
                });
                
                // 添加到农业图层
                marker.addTo(this.agricultureLayer);
                
                // 保存引用以便后续清除
                this.agricultureMarkers.push(marker);
            }
        });
        
        console.log('农业数据更新完成');
    }
    
    /**
     * 创建战争弹出窗口内容
     * @param {Object} war - 战争对象
     * @returns {string} HTML内容
     */
    createWarPopupContent(war) {
        const formatYearLocal = (year) => {
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };

        return `
            <div class="popup-content">
                <h3>${war.title}</h3>
                <p class="time">${formatYearLocal(war.startYear)} - ${formatYearLocal(war.endYear)}</p>
                <p class="description">${war.description}</p>
                <div class="details">
                    <p><strong>参与方:</strong> ${war.participants || '未知'}</p>
                    <p><strong>结果:</strong> ${war.result || '未知'}</p>
                    <p><strong>伤亡:</strong> ${war.casualties || '未知'}</p>
                    <p><strong>重要性:</strong> ${war.importance || 3}/5</p>
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
        const formatYearLocal = (year) => {
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };

        return `
            <div class="popup-content">
                <h3>${disease.title}</h3>
                <p class="time">${formatYearLocal(disease.startYear)} - ${formatYearLocal(disease.endYear)}</p>
                <p class="description">${disease.description}</p>
                <div class="details">
                    <p><strong>病原体:</strong> ${disease.pathogen || '未知'}</p>
                    <p><strong>传播方式:</strong> ${disease.transmission || '未知'}</p>
                    <p><strong>影响范围:</strong> ${disease.affectedRegion || '未知'}</p>
                    <p><strong>死亡率:</strong> ${disease.mortalityRate || '未知'}</p>
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
        const formatYearLocal = (year) => {
            return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
        };

        return `
            <div class="popup-content">
                <h3>${agriculture.title}</h3>
                <p class="time">${formatYearLocal(agriculture.startYear)}</p>
                <p class="description">${agriculture.description}</p>
                <div class="details">
                    <p><strong>作物:</strong> ${agriculture.crops || '未知'}</p>
                    <p><strong>技术:</strong> ${agriculture.techniques || '未知'}</p>
                    <p><strong>影响:</strong> ${agriculture.impact || '未知'}</p>
                </div>
            </div>
        `;
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
} 