import { loadAllData, getEventsForYear } from './data-loader.js';

export class MapEvents {
    constructor(mapCore) {
        this.mapCore = mapCore;
        this.eventMarkers = new Map();
        this.currentEvents = [];
        this.filterCategory = 'all';
        this.allEventsData = null;
    }

    async initialize() {
        // 加载所有事件数据
        try {
            console.log('开始加载事件数据');
            const allData = await loadAllData();
            this.allEventsData = {
                allEvents: allData.allEvents,
                migrations: allData.migrations,
                diseases: allData.diseases,
                wars: allData.wars,
                technologies: allData.technologies,
                civilizations: allData.civilizations,
                agriculture: allData.agriculture
            };
            console.log(`成功加载事件数据: ${this.allEventsData.allEvents.length}个事件`);
            
            // 初始加载当前年份的事件
            await this.updateToYear(this.mapCore.currentYear);
        } catch (error) {
            console.error('加载事件数据失败:', error);
        }
    }

    async updateToYear(year) {
        this.clearEventMarkers();
        const events = await this.getRelevantEvents(year);
        await this.updateEventMarkers(events);
        
        // 更新侧边栏事件列表
        this.updateEventsList(events);
    }

    setFilterCategory(category) {
        this.filterCategory = category;
        this.updateEventMarkers(this.currentEvents);
        
        // 更新侧边栏事件列表
        this.updateEventsList(this.currentEvents);
    }

    async updateEventMarkers(events) {
        this.currentEvents = events;
        this.clearEventMarkers();

        events.forEach(event => {
            if (this.filterCategory === 'all' || event.category === this.filterCategory) {
                // 检查事件是否有位置信息
                if (event.latitude && event.longitude) {
                    const marker = this.createEventMarker(event);
                    this.eventMarkers.set(event.id, marker);
                    marker.addTo(this.mapCore.map);
                }
            }
        });
    }

    updateEventsList(events) {
        // 获取事件容器元素
        const eventsContainer = document.getElementById('events-container');
        const noEventsMessage = document.getElementById('no-events-message');
        
        if (!eventsContainer) return;
        
        // 清空当前事件列表
        eventsContainer.innerHTML = '';
        
        // 筛选符合当前分类的事件
        const filteredEvents = events.filter(event => 
            this.filterCategory === 'all' || event.category === this.filterCategory
        );
        
        // 显示或隐藏"无事件"消息
        if (filteredEvents.length === 0) {
            if (noEventsMessage) noEventsMessage.classList.remove('hidden');
            return;
        } else {
            if (noEventsMessage) noEventsMessage.classList.add('hidden');
        }
        
        // 按重要性排序事件
        const sortedEvents = [...filteredEvents].sort((a, b) => 
            (b.importance || 0) - (a.importance || 0)
        );
        
        // 创建事件列表项
        sortedEvents.forEach(event => {
            const eventItem = this.createEventListItem(event);
            eventsContainer.appendChild(eventItem);
        });
    }
    
    createEventListItem(event) {
        const item = document.createElement('div');
        item.className = 'event-item bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow cursor-pointer';
        item.dataset.id = event.id;
        
        // 生成事件年份显示
        const yearDisplay = this.formatYear(event.startYear || event.year);
        
        item.innerHTML = `
            <div class="flex items-start">
                <div class="event-icon ${event.category} mr-3 mt-1">
                    <i class="material-icons-round">${this.getCategoryIcon(event.category)}</i>
                </div>
                <div class="flex-1">
                    <h3 class="text-md font-medium text-gray-900">${event.title || event.name}</h3>
                    <p class="text-xs text-gray-500">${yearDisplay}</p>
                    <p class="text-sm text-gray-700 mt-1 line-clamp-2">${event.description || ''}</p>
                </div>
            </div>
        `;
        
        // 添加点击事件
        item.addEventListener('click', () => {
            this.highlightEvent(event.id);
        });
        
        return item;
    }

    createEventMarker(event) {
        const icon = L.divIcon({
            className: 'event-marker',
            html: this.createEventMarkerHTML(event),
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        return L.marker([event.latitude, event.longitude], {
            icon: icon,
            title: event.title || event.name
        }).bindPopup(() => this.createEventPopupContent(event));
    }

    createEventMarkerHTML(event) {
        return `
            <div class="event-icon ${event.category}">
                <i class="material-icons-round">${this.getCategoryIcon(event.category)}</i>
            </div>
        `;
    }

    createEventPopupContent(event) {
        const yearDisplay = this.formatYear(event.startYear || event.year);
        const endYearDisplay = event.endYear ? ` - ${this.formatYear(event.endYear)}` : '';
        
        return `
            <div class="event-popup">
                <h3 class="text-lg font-semibold">${event.title || event.name}</h3>
                <div class="text-sm text-gray-600 mb-2">
                    ${yearDisplay}${endYearDisplay}
                </div>
                <p class="text-gray-700">${event.description || ''}</p>
            </div>
        `;
    }

    getCategoryIcon(category) {
        const icons = {
            '农业': 'grass',
            '技术': 'precision_manufacturing',
            '文明': 'account_balance',
            '征服': 'gavel',
            '疾病': 'coronavirus',
            '迁徙': 'timeline'
        };
        return icons[category] || 'event';
    }

    formatYear(year) {
        if (year === undefined) return '年份未知';
        const absYear = Math.abs(year);
        return year < 0 ? `公元前 ${absYear} 年` : `公元 ${year} 年`;
    }

    async getRelevantEvents(year) {
        // 检查数据是否已加载
        if (!this.allEventsData) {
            console.warn('事件数据尚未加载');
            return [];
        }
        
        // 从各种数据源获取与当前年份相关的事件
        const events = this.allEventsData.allEvents ? getEventsForYear(this.allEventsData.allEvents, year, 100) : [];
        const wars = this.allEventsData.wars ? getEventsForYear(this.allEventsData.wars, year, 50) : [];
        const diseases = this.allEventsData.diseases ? getEventsForYear(this.allEventsData.diseases, year, 50) : [];
        const technologies = this.allEventsData.technologies ? getEventsForYear(this.allEventsData.technologies, year, 100) : [];
        const migrations = this.allEventsData.migrations ? getEventsForYear(this.allEventsData.migrations, year, 50) : [];
        const civilizations = this.allEventsData.civilizations ? getEventsForYear(this.allEventsData.civilizations, year, 100) : [];
        const agriculture = this.allEventsData.agriculture ? getEventsForYear(this.allEventsData.agriculture, year, 50) : [];
        
        // 处理位置信息，确保所有事件都有latitude和longitude字段
        const processedEvents = this.processLocationData([
            ...events,
            ...this.processWarEvents(wars),
            ...this.processDiseaseEvents(diseases),
            ...this.processTechEvents(technologies),
            ...this.processMigrationEvents(migrations),
            ...this.processCivilizationEvents(civilizations),
            ...this.processAgricultureEvents(agriculture)
        ]);
        
        console.log(`找到与${year}年相关的事件: ${processedEvents.length}个`);
        return processedEvents;
    }

    // 处理战争事件
    processWarEvents(wars) {
        return wars.map(war => {
            // 位置信息处理
            const { latitude, longitude, location } = this.extractLocationInfo(war);
            
            return {
                ...war,
                id: war.id || `war-${Math.random().toString(36).substring(2, 9)}`,
                title: war.title || war.name || '未命名战争',
                category: '征服',
                description: war.description || `${war.title || war.name}发生于${this.formatYear(war.startYear || war.year)}`,
                location: location,
                latitude: latitude,
                longitude: longitude
            };
        });
    }

    // 处理疾病事件
    processDiseaseEvents(diseases) {
        return diseases.map(disease => {
            // 位置信息处理
            const { latitude, longitude, location } = this.extractLocationInfo(disease);
            
            return {
                ...disease,
                id: disease.id || `disease-${Math.random().toString(36).substring(2, 9)}`,
                title: disease.title || disease.name || '未命名疾病',
                category: '疾病',
                description: disease.description || `${disease.title || disease.name}爆发于${this.formatYear(disease.startYear || disease.year)}`,
                location: location,
                latitude: latitude, 
                longitude: longitude
            };
        });
    }

    // 处理技术事件
    processTechEvents(technologies) {
        return technologies.map(tech => {
            // 位置信息处理
            const { latitude, longitude, location } = this.extractLocationInfo(tech);
            
            return {
                ...tech,
                id: tech.id || `tech-${Math.random().toString(36).substring(2, 9)}`,
                title: tech.title || tech.name || '未命名技术',
                category: '技术',
                description: tech.description || `${tech.title || tech.name}出现于${this.formatYear(tech.startYear || tech.year)}`,
                location: location,
                latitude: latitude,
                longitude: longitude
            };
        });
    }

    // 处理迁徙事件
    processMigrationEvents(migrations) {
        return migrations.map(migration => {
            // 位置信息处理
            const { latitude, longitude, location } = this.extractLocationInfo(migration);
            
            return {
                ...migration,
                id: migration.id || `migration-${Math.random().toString(36).substring(2, 9)}`,
                title: migration.title || migration.name || '未命名迁徙',
                category: '迁徙',
                description: migration.description || `${migration.title || migration.name}发生于${this.formatYear(migration.startYear || migration.year)}`,
                location: location,
                latitude: latitude,
                longitude: longitude
            };
        });
    }

    // 处理文明事件
    processCivilizationEvents(civilizations) {
        return civilizations.map(civ => {
            // 位置信息处理
            const { latitude, longitude, location } = this.extractLocationInfo(civ);
            
            return {
                ...civ,
                id: civ.id || `civ-${Math.random().toString(36).substring(2, 9)}`,
                title: civ.title || civ.name || '未命名文明',
                category: '文明',
                description: civ.description || `${civ.title || civ.name}形成于${this.formatYear(civ.startYear || civ.year)}`,
                location: location,
                latitude: latitude,
                longitude: longitude
            };
        });
    }

    // 处理农业事件
    processAgricultureEvents(agriculture) {
        return agriculture.map(agri => {
            // 位置信息处理
            const { latitude, longitude, location } = this.extractLocationInfo(agri);
            
            return {
                ...agri,
                id: agri.id || `agri-${Math.random().toString(36).substring(2, 9)}`,
                title: agri.title || agri.name || '未命名农业发展',
                category: '农业',
                description: agri.description || `${agri.title || agri.name}发生于${this.formatYear(agri.startYear || agri.year)}`,
                location: location,
                latitude: latitude,
                longitude: longitude
            };
        });
    }

    // 处理位置数据，确保所有事件都有latitude和longitude字段
    processLocationData(events) {
        // 默认位置分配 - 按类别分配不同区域
        const defaultLocations = {
            '农业': [30, 110], // 中国
            '技术': [40, 15],  // 欧洲
            '文明': [35, 35],  // 中东
            '征服': [45, 25],  // 东欧
            '疾病': [20, 80],  // 南亚
            '迁徙': [25, 0]    // 西非
        };
        
        // 跟踪已分配的位置，避免重叠
        const usedLocations = new Map();
        
        return events.map(event => {
            // 首先检查是否已有经纬度字段
            if (event.latitude !== undefined && event.longitude !== undefined) {
                return event; // 已有经纬度
            }
            
            // 检查location字段
            if (event.location) {
                if (Array.isArray(event.location) && event.location.length >= 2) {
                    // 数组形式的location: [lat, lng]
                    event.latitude = event.location[0];
                    event.longitude = event.location[1];
                    return event;
                } else if (typeof event.location === 'object') {
                    // 对象形式的location: {lat, lng}
                    if (event.location.lat !== undefined && event.location.lng !== undefined) {
                        event.latitude = event.location.lat;
                        event.longitude = event.location.lng;
                        return event;
                    }
                    // 对象形式的location: {latitude, longitude}
                    if (event.location.latitude !== undefined && event.location.longitude !== undefined) {
                        event.latitude = event.location.latitude;
                        event.longitude = event.location.longitude;
                        return event;
                    }
                }
            }
            
            // 检查coordinates字段
            if (event.coordinates) {
                if (Array.isArray(event.coordinates) && event.coordinates.length >= 2) {
                    event.latitude = event.coordinates[0];
                    event.longitude = event.coordinates[1];
                    return event;
                }
            }
            
            // 没有位置信息，使用默认位置
            console.warn(`事件缺少位置信息，使用默认位置: ${event.title || event.name}`);
            
            // 按类别分配默认位置
            let baseLocation = defaultLocations[event.category] || [0, 0];
            
            // 为避免事件堆叠，添加小的随机偏移
            const locationKey = `${event.category}-${event.id}`;
            let offset = usedLocations.get(locationKey) || 0;
            
            // 增加偏移量并保存
            offset += 1;
            usedLocations.set(locationKey, offset);
            
            // 添加偏移，最多偏移5度
            const maxOffset = 5;
            const latOffset = (Math.random() * 2 - 1) * Math.min(offset, maxOffset);
            const lngOffset = (Math.random() * 2 - 1) * Math.min(offset, maxOffset);
            
            event.latitude = baseLocation[0] + latOffset;
            event.longitude = baseLocation[1] + lngOffset;
            event.location = [event.latitude, event.longitude];
            event.isDefaultLocation = true; // 标记为使用默认位置
            
            return event;
        });
    }

    clearEventMarkers() {
        this.eventMarkers.forEach(marker => {
            marker.remove();
        });
        this.eventMarkers.clear();
    }

    highlightEvent(eventId) {
        const marker = this.eventMarkers.get(eventId);
        if (marker) {
            marker.openPopup();
            this.mapCore.map.setView(marker.getLatLng(), 6);
        }
    }

    // 从事件数据中提取位置信息的通用方法
    extractLocationInfo(item) {
        let latitude = null;
        let longitude = null;
        
        // 先尝试使用标准字段
        if (item.latitude !== undefined && item.longitude !== undefined) {
            latitude = item.latitude;
            longitude = item.longitude;
            console.log(`事件 "${item.title || item.name}" 使用标准坐标: lat=${latitude}, lng=${longitude}`);
            return { latitude, longitude, location: [latitude, longitude] };
        } 
        
        // 尝试从location对象获取
        if (item.location) {
            // 如果location是坐标数组 [lat, lng] 或 [lng, lat]
            if (Array.isArray(item.location)) {
                // 假设格式是 [lat, lng]，如果值看起来像经度（大约在-180到180之间），则可能是[lng, lat]
                if (item.location.length >= 2) {
                    if (Math.abs(item.location[0]) <= 90 && Math.abs(item.location[1]) <= 180) {
                        latitude = item.location[0];
                        longitude = item.location[1];
                    } else {
                        // 可能是[lng, lat]格式，交换一下
                        latitude = item.location[1];
                        longitude = item.location[0];
                    }
                    console.log(`事件 "${item.title || item.name}" 使用数组坐标: lat=${latitude}, lng=${longitude}`);
                    return { latitude, longitude, location: [latitude, longitude] };
                }
            }
            // 如果location是对象，如 {lat, lng} 或 {latitude, longitude}
            else if (typeof item.location === 'object') {
                // 尝试 {lat, lng} 格式
                if (item.location.lat !== undefined && item.location.lng !== undefined) {
                    latitude = item.location.lat;
                    longitude = item.location.lng;
                    console.log(`事件 "${item.title || item.name}" 使用对象坐标(lat/lng): lat=${latitude}, lng=${longitude}`);
                    return { latitude, longitude, location: [latitude, longitude] };
                }
                // 尝试 {latitude, longitude} 格式
                else if (item.location.latitude !== undefined && item.location.longitude !== undefined) {
                    latitude = item.location.latitude;
                    longitude = item.location.longitude;
                    console.log(`事件 "${item.title || item.name}" 使用对象坐标(latitude/longitude): lat=${latitude}, lng=${longitude}`);
                    return { latitude, longitude, location: [latitude, longitude] };
                }
                // 尝试 {经度, 纬度} 或其他中文字段格式
                else if (item.location['纬度'] !== undefined && item.location['经度'] !== undefined) {
                    latitude = item.location['纬度'];
                    longitude = item.location['经度'];
                    console.log(`事件 "${item.title || item.name}" 使用中文对象坐标: lat=${latitude}, lng=${longitude}`);
                    return { latitude, longitude, location: [latitude, longitude] };
                }
            }
            // 如果location是字符串，可能是格式如 "lat,lng"
            else if (typeof item.location === 'string' && item.location.includes(',')) {
                const parts = item.location.split(',').map(part => parseFloat(part.trim()));
                if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    latitude = parts[0];
                    longitude = parts[1];
                    console.log(`事件 "${item.title || item.name}" 使用字符串坐标: lat=${latitude}, lng=${longitude}`);
                    return { latitude, longitude, location: [latitude, longitude] };
                }
            }
        }
        
        // 尝试从coordinates字段获取
        if (item.coordinates) {
            if (Array.isArray(item.coordinates) && item.coordinates.length >= 2) {
                // 假设格式是 [lat, lng]
                latitude = item.coordinates[0];
                longitude = item.coordinates[1];
                console.log(`事件 "${item.title || item.name}" 使用coordinates数组: lat=${latitude}, lng=${longitude}`);
                return { latitude, longitude, location: [latitude, longitude] };
            } else if (typeof item.coordinates === 'object') {
                // 尝试对象格式
                if (item.coordinates.lat !== undefined && item.coordinates.lng !== undefined) {
                    latitude = item.coordinates.lat;
                    longitude = item.coordinates.lng;
                    console.log(`事件 "${item.title || item.name}" 使用coordinates对象: lat=${latitude}, lng=${longitude}`);
                    return { latitude, longitude, location: [latitude, longitude] };
                }
            }
        }
        
        // 尝试从geometry字段获取 (GeoJSON格式)
        if (item.geometry && item.geometry.type === 'Point' && 
            Array.isArray(item.geometry.coordinates) && item.geometry.coordinates.length >= 2) {
            // GeoJSON使用[lng, lat]格式
            longitude = item.geometry.coordinates[0];
            latitude = item.geometry.coordinates[1];
            console.log(`事件 "${item.title || item.name}" 使用GeoJSON Point格式: lat=${latitude}, lng=${longitude}`);
            return { latitude, longitude, location: [latitude, longitude] };
        }
        
        // 尝试从发生地点字段获取
        if (item['发生地点']) {
            if (typeof item['发生地点'] === 'object') {
                if (item['发生地点']['纬度'] !== undefined && item['发生地点']['经度'] !== undefined) {
                    latitude = item['发生地点']['纬度'];
                    longitude = item['发生地点']['经度'];
                    console.log(`事件 "${item.title || item.name}" 使用发生地点字段: lat=${latitude}, lng=${longitude}`);
                    return { latitude, longitude, location: [latitude, longitude] };
                }
            }
        }
        
        // 对于迁徙事件，尝试从特定字段获取
        if (item.category === '迁徙' || item.type === 'migration') {
            // 尝试从起点获取
            if (item.from || item.startLocation || item['起点']) {
                const startPoint = item.from || item.startLocation || item['起点'];
                if (typeof startPoint === 'object') {
                    if (startPoint.lat !== undefined && startPoint.lng !== undefined) {
                        latitude = startPoint.lat;
                        longitude = startPoint.lng;
                    } else if (startPoint['纬度'] !== undefined && startPoint['经度'] !== undefined) {
                        latitude = startPoint['纬度'];
                        longitude = startPoint['经度'];
                    }
                    if (latitude !== null && longitude !== null) {
                        console.log(`迁徙事件 "${item.title || item.name}" 使用起点: lat=${latitude}, lng=${longitude}`);
                        return { latitude, longitude, location: [latitude, longitude] };
                    }
                }
            }
            
            // 尝试从路径获取第一个点
            if (item.path && Array.isArray(item.path) && item.path.length > 0) {
                const firstPoint = item.path[0];
                if (Array.isArray(firstPoint) && firstPoint.length >= 2) {
                    // 可能是[lng, lat]顺序
                    if (Math.abs(firstPoint[0]) <= 90 && Math.abs(firstPoint[1]) <= 180) {
                        latitude = firstPoint[0];
                        longitude = firstPoint[1];
                    } else {
                        latitude = firstPoint[1];
                        longitude = firstPoint[0];
                    }
                    console.log(`迁徙事件 "${item.title || item.name}" 使用路径第一点: lat=${latitude}, lng=${longitude}`);
                    return { latitude, longitude, location: [latitude, longitude] };
                } else if (typeof firstPoint === 'object') {
                    if (firstPoint.lat !== undefined && firstPoint.lng !== undefined) {
                        latitude = firstPoint.lat;
                        longitude = firstPoint.lng;
                        console.log(`迁徙事件 "${item.title || item.name}" 使用路径第一点对象: lat=${latitude}, lng=${longitude}`);
                        return { latitude, longitude, location: [latitude, longitude] };
                    }
                }
            }
            
            // 尝试从route字段获取
            if (item.route && Array.isArray(item.route) && item.route.length > 0) {
                const firstPoint = item.route[0];
                if (Array.isArray(firstPoint) && firstPoint.length >= 2) {
                    latitude = firstPoint[0];
                    longitude = firstPoint[1];
                    console.log(`迁徙事件 "${item.title || item.name}" 使用route第一点: lat=${latitude}, lng=${longitude}`);
                    return { latitude, longitude, location: [latitude, longitude] };
                }
            }
        }
        
        // 返回空结果，将由调用方处理缺少位置的情况
        return { latitude: null, longitude: null, location: null };
    }
} 