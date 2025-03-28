export class MapStyles {
    constructor() {
        this.defaultStyle = {
            weight: 1,
            opacity: 1,
            color: '#6b7280',
            fillOpacity: 0.3
        };
        
        // 存储已分配的颜色，避免相邻区域颜色相同
        // 改进为长期缓存，即使年代变化也能保持颜色一致
        this.colorCache = new Map();
        
        // 扩展预定义的颜色数组，增加更多区分度
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
            '#4f46e5',  // 靛青色
            '#9d174d', // 深红色
            '#374151', // 深灰色
            '#065f46', // 深绿色
            '#92400e', // 棕色
            '#4338ca', // 深紫色
            '#0e7490', // 深青色
            '#b45309', // 赭石色
            '#7f1d1d', // 暗红色
            '#1e3a8a', // 海军蓝
            '#1e40af'  // 皇家蓝
        ];

        // 为特定国家/地区预定义颜色，确保重要区域始终保持相同颜色
        this.predefinedColors = {
            '中国': '#e11d48',
            '中华': '#e11d48', 
            '华夏': '#e11d48',
            '汉': '#e11d48',
            '唐': '#e11d48',
            '宋': '#e11d48',
            '元': '#e11d48',
            '明': '#e11d48',
            '清': '#e11d48',
            'China': '#e11d48',
            '罗马': '#f97316',
            '罗马帝国': '#f97316',
            'Rome': '#f97316',
            'Roman': '#f97316',
            'Byzantine': '#fb7185', // 拜占庭
            '埃及': '#ca8a04',
            'Egypt': '#ca8a04',
            '印度': '#a855f7',
            'India': '#a855f7',
            '日本': '#fcd34d',
            'Japan': '#fcd34d',
            '美国': '#60a5fa',
            'United States': '#60a5fa',
            'USA': '#60a5fa',
            '英国': '#1e40af',
            'United Kingdom': '#1e40af',
            'Britain': '#1e40af',
            '法国': '#3b82f6',
            'France': '#3b82f6',
            '德国': '#6b7280',
            'Germany': '#6b7280',
            '俄罗斯': '#7c3aed',
            'Russia': '#7c3aed',
            '西班牙': '#f0abfc',
            'Spain': '#f0abfc',
            '葡萄牙': '#c084fc',
            'Portugal': '#c084fc'
        };
        
        // 统一区域名称映射表，将相似名称映射到统一标识符
        this.regionAliases = {
            // 中国地区
            'Chinese Empire': '中国',
            'Ming Dynasty': '中国',
            'Qing Dynasty': '中国',
            'Tang Dynasty': '中国',
            'Han Dynasty': '中国',
            'Song Dynasty': '中国',
            'Yuan Dynasty': '中国',
            'Republic of China': '中国',
            'People\'s Republic of China': '中国',
            '中华人民共和国': '中国',
            '中华民国': '中国',
            
            // 罗马相关
            'Roman Empire': '罗马',
            'Roman Republic': '罗马',
            'Eastern Roman Empire': 'Byzantine',
            'Byzantine Empire': 'Byzantine',
            '拜占庭帝国': 'Byzantine',
            
            // 其他主要国家
            'United States of America': '美国',
            'Great Britain': '英国',
            'British Empire': '英国',
            'USSR': '俄罗斯',
            'Soviet Union': '俄罗斯',
            '苏联': '俄罗斯',
            'Kingdom of France': '法国',
            'French Republic': '法国',
            'Prussian Empire': '德国',
            'German Empire': '德国'
        };
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
        const { type, name, id, ADMIN, NAME, NAME_LONG, name_en, admin, SOVEREIGNT } = feature.properties;
        
        // 首先尝试从预定义的政治区域类型获取颜色
        const typeColors = {
            'civilization': '#8b5cf6',
            'empire': '#ec4899',
            'kingdom': '#3b82f6',
            'tribe': '#10b981',
            'republic': '#f59e0b',
            'state': '#14b8a6'
        };
        
        if (type && typeColors[type]) {
            return typeColors[type];
        }
        
        // 获取区域标识符
        const regionName = name || NAME || NAME_LONG || admin || ADMIN || name_en || SOVEREIGNT || '';
        
        // 检查是否有预定义颜色
        for (const [key, color] of Object.entries(this.predefinedColors)) {
            if (regionName.includes(key)) {
                return color;
            }
        }
        
        // 尝试规范化区域名称，处理别名
        const normalizedName = this.normalizeRegionName(regionName);
        
        // 如果有规范化名称的预定义颜色，使用它
        if (this.predefinedColors[normalizedName]) {
            return this.predefinedColors[normalizedName];
        }
        
        // 创建一个唯一的区域ID
        const regionId = id || normalizedName || 
                         this.createHashFromProperties(feature.properties);
        
        // 检查是否已有缓存的颜色
        if (this.colorCache.has(regionId)) {
            return this.colorCache.get(regionId);
        }
        
        // 使用一致的方法为区域分配颜色
        const colorIndex = Math.abs(this.hashString(regionId)) % this.colorPalette.length;
        const color = this.colorPalette[colorIndex];
        
        // 缓存分配的颜色
        this.colorCache.set(regionId, color);
        // console.log(`为区域 "${regionName}" (ID: ${regionId}) 分配颜色: ${color}`);
        
        return color;
    }
    
    // 规范化区域名称，处理别名
    normalizeRegionName(name) {
        if (!name) return '';
        
        // 检查别名映射
        for (const [alias, standard] of Object.entries(this.regionAliases)) {
            if (name.includes(alias)) {
                return standard;
            }
        }
        
        return name;
    }
    
    // 从属性创建一个唯一哈希值
    createHashFromProperties(properties) {
        // 组合多个属性创建更稳定的哈希值
        const relevantProps = [];
        
        for (const key of ['name', 'NAME', 'id', 'admin', 'ADMIN', 'name_en', 'SOVEREIGNT']) {
            if (properties[key]) {
                relevantProps.push(properties[key]);
            }
        }
        
        return relevantProps.join('-') || 'unknown-region';
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
        // 添加弹出框显示区域信息
        if (feature.properties) {
            const props = feature.properties;
            const name = props.name || props.NAME || props.ADMIN || props.NAME_LONG || '未命名区域';
            
            let popupContent = `<div class="region-popup">
                <h3>${name}</h3>`;
            
            // 添加其他可能有用的属性
            if (props.type) {
                popupContent += `<p><strong>类型:</strong> ${props.type}</p>`;
            }
            
            if (props.description) {
                popupContent += `<p>${props.description}</p>`;
            }
            
            if (props.SOVEREIGNT && props.SOVEREIGNT !== name) {
                popupContent += `<p><strong>主权国家:</strong> ${props.SOVEREIGNT}</p>`;
            }
            
            popupContent += '</div>';
            
            layer.bindPopup(popupContent);
        }

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