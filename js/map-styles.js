export class MapStyles {
    constructor() {
        this.defaultStyle = {
            weight: 1,
            opacity: 1,
            color: '#6b7280',
            fillOpacity: 0.3
        };
        
        // 存储已分配的颜色，避免相邻区域颜色相同
        this.colorCache = new Map();
        
        // 预定义的颜色数组，用于分配给不同区域
        this.colorPalette = [
            '#3b82f6', // 蓝色
            '#10b981', // 绿色
            '#f59e0b', // 橙色
            '#8b5cf6', // 紫色
            '#ec4899', // 粉色
            '#ef4444', // 红色
            '#14b8a6', // 青色
            '#f97316', // 深橙色
            '#6366f1', // 靛蓝色
            '#a855f7', // 淡紫色
            '#84cc16', // 酸橙色
            '#0284c7', // 浅蓝色
            '#ea580c', // 燃烧橙
            '#0891b2', // 青蓝色
            '#7c3aed', // 紫罗兰色
            '#059669', // 翡翠绿
            '#ca8a04', // 琥珀色
            '#c026d3', // 洋红色
            '#15803d', // 森林绿
            '#4f46e5'  // 靛青色
        ];
    }

    getGeoJSONStyle(feature) {
        return {
            ...this.defaultStyle,
            fillColor: this.getRegionColor(feature)
        };
    }

    getRegionColor(feature) {
        if (!feature || !feature.properties) {
            return '#6b7280'; // 默认灰色
        }
        
        // 尝试从属性中获取有用的信息来决定颜色
        const { type, name, id, ADMIN, NAME, name_en, admin } = feature.properties;
        
        // 如果有类型信息，使用预定义颜色
        const colors = {
            'civilization': '#8b5cf6',
            'empire': '#ec4899',
            'kingdom': '#3b82f6',
            'tribe': '#10b981',
            'republic': '#f59e0b',
            'state': '#14b8a6'
        };
        
        if (type && colors[type]) {
            return colors[type];
        }
        
        // 如果有ID，使用它来分配一致的颜色
        const regionId = id || ADMIN || NAME || name || name_en || admin;
        if (regionId) {
            // 检查是否已有缓存的颜色
            if (this.colorCache.has(regionId)) {
                return this.colorCache.get(regionId);
            }
            
            // 使用一致的方法为区域分配颜色
            const colorIndex = Math.abs(this.hashString(regionId)) % this.colorPalette.length;
            const color = this.colorPalette[colorIndex];
            
            // 缓存分配的颜色
            this.colorCache.set(regionId, color);
            return color;
        }
        
        // 如果没有有用的属性，返回随机颜色
        return this.getRandomColor();
    }
    
    // 简单的字符串散列函数，用于生成一致的数字
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // 转换为32位整数
        }
        return hash;
    }
    
    // 生成随机颜色
    getRandomColor() {
        return this.colorPalette[Math.floor(Math.random() * this.colorPalette.length)];
    }

    onEachFeature(feature, layer, mapCore) {
        layer.on({
            mouseover: (e) => this.highlightFeature(e, mapCore),
            mouseout: (e) => this.resetHighlight(e, mapCore),
            click: (e) => this.zoomToFeature(e, mapCore)
        });
    }

    highlightFeature(e, mapCore) {
        const layer = e.target;

        layer.setStyle({
            weight: 2,
            color: '#2563eb',
            fillOpacity: 0.5
        });

        layer.bringToFront();
        this.updateInfo(layer.feature, mapCore);
    }

    resetHighlight(e, mapCore) {
        const layer = e.target;
        layer.setStyle(this.getGeoJSONStyle(layer.feature));
        this.clearInfo(mapCore);
    }

    zoomToFeature(e, mapCore) {
        mapCore.map.fitBounds(e.target.getBounds());
    }

    updateInfo(feature, mapCore) {
        if (mapCore.info) {
            mapCore.info.update(feature.properties);
        }
    }

    clearInfo(mapCore) {
        if (mapCore.info) {
            mapCore.info.update();
        }
    }

    // 标记样式
    getMarkerStyle(category) {
        const styles = {
            'event': {
                className: 'event-marker',
                iconSize: [30, 30]
            },
            'migration': {
                className: 'migration-marker',
                iconSize: [24, 24]
            },
            'technology': {
                className: 'tech-marker',
                iconSize: [28, 28]
            },
            'species': {
                className: 'species-marker',
                iconSize: [26, 26]
            },
            'civilization': {
                className: 'civilization-marker',
                iconSize: [32, 32]
            }
        };

        return styles[category] || styles.event;
    }

    // 路径样式
    getPathStyle(category) {
        const styles = {
            'migration': {
                color: '#8b5cf6',
                weight: 2,
                opacity: 0.8
            },
            'trade': {
                color: '#10b981',
                weight: 2,
                opacity: 0.8,
                dashArray: '5,10'
            },
            'war': {
                color: '#ef4444',
                weight: 3,
                opacity: 0.8
            }
        };

        return styles[category] || styles.migration;
    }

    // 区域样式
    getAreaStyle(category) {
        const styles = {
            'civilization': {
                color: '#8b5cf6',
                fillColor: '#8b5cf6',
                fillOpacity: 0.2,
                weight: 1
            },
            'empire': {
                color: '#ec4899',
                fillColor: '#ec4899',
                fillOpacity: 0.2,
                weight: 1
            },
            'disease': {
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.15,
                weight: 1,
                dashArray: '3,6'
            }
        };

        return styles[category] || this.defaultStyle;
    }
} 