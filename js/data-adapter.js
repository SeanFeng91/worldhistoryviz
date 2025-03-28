/**
 * 数据适配器模块
 * 用于将原始数据格式转换为前端展示所需的格式
 */

/**
 * 将历史事件数据适配为前端需要的格式
 * @param {Array} events - 原始历史事件数据
 * @returns {Array} 适配后的历史事件数据
 */
export function adaptHistoricalEvents(events) {
    if (!events || !Array.isArray(events)) {
        console.warn('传入的事件数据无效');
        return [];
    }
    
    return events.map(event => {
        // 检查是否是新格式数据
        if (event.id && event.title && event.startYear !== undefined) {
            // 处理新格式数据
            // 转换位置信息
            let coordinates = [0, 0]; // 默认位置
            if (event.location) {
                if (typeof event.location === 'object' && event.location.lat !== undefined && event.location.lng !== undefined) {
                    coordinates = [event.location.lat, event.location.lng];
                } else if (Array.isArray(event.location) && event.location.length >= 2) {
                    coordinates = [event.location[0], event.location[1]];
                }
            }
            
            return {
                id: event.id,
                title: event.title,
                year: event.startYear,
                endYear: event.endYear || event.startYear,
                description: event.description || '',
                category: event.category || '其他',
                importance: event.importance || 3,
                coordinates: coordinates,
                location: coordinates,
                region: event.region || '',
                impact: event.impact || '',
                relatedTechnologies: event.relatedTechnologies || [],
                relatedSpecies: event.relatedSpecies || [],
                period: event.period || '',
                originalData: event
            };
        }
        
        // 处理旧格式数据
        // 解析年份
        const timeStr = event['发生时间'] || '';
        let startYear = 0, endYear = 0;
        
        if (timeStr.includes('约') || timeStr.includes('至')) {
            // 处理时间范围，如"约公元前10000年至前8000年"
            const parts = timeStr.replace(/约|公元/g, '').split('至');
            startYear = parseYearString(parts[0]);
            endYear = parts.length > 1 ? parseYearString(parts[1]) : startYear;
        } else {
            // 处理单一年份，如"1991年"
            startYear = parseYearString(timeStr);
            endYear = startYear;
        }
        
        // 转换位置信息
        let location = [0, 0]; // 默认位置
        if (event['发生地点'] && typeof event['发生地点'] === 'object') {
            location = [event['发生地点']['经度'], event['发生地点']['纬度']];
        }
        
        // 返回适配后的事件对象
        return {
            id: event['事件ID'],
            title: event['事件名称'],
            year: startYear,
            endYear: endYear,
            description: event['事件描述'],
            category: event['事件类型'],
            importance: event['历史重要性'],
            location: location,
            coordinates: location, // 添加兼容性字段
            relatedTechnologies: event['关联技术'] || [],
            relatedSpecies: event['关联物种'] || [],
            period: event['时期']
        };
    });
}

/**
 * 将迁徙数据适配为前端需要的格式
 * @param {Array} migrations - 原始迁徙数据
 * @returns {Array} 适配后的迁徙数据
 */
export function adaptMigrations(migrations) {
    if (!migrations || !Array.isArray(migrations)) {
        console.warn('传入的迁徙数据无效');
        return [];
    }
    
    return migrations.map(migration => {
        // 检查是否是新格式数据 (直接包含startYear和endYear字段)
        if (migration.startYear !== undefined) {
            // 处理新格式数据
            let startCoordinates = null;
            let endCoordinates = null;
            
            // 解析坐标
            if (migration.location && migration.endLocation) {
                // 使用location和endLocation字段
                if (migration.location.lat !== undefined && migration.location.lng !== undefined) {
                    startCoordinates = [migration.location.lat, migration.location.lng];
                }
                if (migration.endLocation.lat !== undefined && migration.endLocation.lng !== undefined) {
                    endCoordinates = [migration.endLocation.lat, migration.endLocation.lng];
                }
            } else if (migration.path && Array.isArray(migration.path) && migration.path.length >= 2) {
                // 从路径提取起点和终点
                startCoordinates = [migration.path[0].lat, migration.path[0].lng];
                endCoordinates = [migration.path[migration.path.length-1].lat, migration.path[migration.path.length-1].lng];
            }
            
            // 构建路径
            const path = [];
            if (migration.path && Array.isArray(migration.path)) {
                migration.path.forEach(point => {
                    if (point.lat !== undefined && point.lng !== undefined) {
                        path.push([point.lng, point.lat]);
                    }
                });
            }
            
            return {
                id: migration.id || `migration-${Math.random().toString(36).substring(2, 9)}`,
                name: migration.title || migration.name || '未命名迁徙',
                startYear: migration.startYear,
                endYear: migration.endYear || (migration.startYear + 100), // 默认持续100年
                path: path,
                route: path.map(p => [p[1], p[0]]),
                startCoordinates: startCoordinates,
                endCoordinates: endCoordinates,
                startLocation: migration.startLocation || migration.from || '未知起点',
                endLocation: migration.endLocation || migration.to || '未知终点',
                description: migration.description || migration.reason || '',
                group: migration.group || migration.population || '',
                category: migration.category || '人口迁徙',
                importance: migration.importance || 3,
                impact: migration.impact || migration.significance || '',
                originalData: migration
            };
        }
        
        // 旧格式数据处理
        // 解析年份
        const startTimeStr = migration['起始时间'] || '';
        const endTimeStr = migration['结束时间'] || '';
        const startYear = parseYearString(startTimeStr);
        const endYear = parseYearString(endTimeStr);
        
        // 提取起点和终点坐标
        let startCoordinates = null;
        let endCoordinates = null;
        
        if (migration['起点'] && typeof migration['起点'] === 'object') {
            startCoordinates = [migration['起点']['纬度'], migration['起点']['经度']];
        }
        
        if (migration['终点'] && typeof migration['终点'] === 'object') {
            endCoordinates = [migration['终点']['纬度'], migration['终点']['经度']];
        }
        
        // 构建路径
        const path = [];
        // 添加起点
        if (migration['起点']) {
            path.push([migration['起点']['经度'], migration['起点']['纬度']]);
        }
        
        // 添加路径点
        if (migration['路径点'] && Array.isArray(migration['路径点'])) {
            migration['路径点'].forEach(point => {
                path.push([point['经度'], point['纬度']]);
            });
        }
        
        // 添加终点
        if (migration['终点']) {
            path.push([migration['终点']['经度'], migration['终点']['纬度']]);
        }
        
        // 返回适配后的迁徙对象
        return {
            id: migration['迁徙ID'],
            name: migration['迁徙名称'],
            startYear: startYear,
            endYear: endYear,
            path: path, // 路径坐标数组
            route: path.map(p => [p[1], p[0]]), // 兼容旧格式，交换经纬度顺序
            startCoordinates: startCoordinates, // 起点坐标 [纬度, 经度]
            endCoordinates: endCoordinates, // 终点坐标 [纬度, 经度]
            startLocation: migration['起点位置名称'] || '未知起点',
            endLocation: migration['终点位置名称'] || '未知终点',
            description: migration['迁徙原因'],
            group: migration['人口规模'],
            category: migration['迁徙类型'] || '人口迁徙', // 为了颜色方案
            importance: migration['重要性'] || 3,
            culturalTraits: migration['文化特征'],
            technologies: migration['携带技术'],
            impact: migration['影响描述'],
            historicalSignificance: migration['历史意义'],
            relatedEvents: migration['关联事件'] || [],
            period: migration['时期'],
            originalData: migration // 保存原始数据以备查询
        };
    });
}

/**
 * 将技术发展数据适配为前端需要的格式
 * @param {Array} technologies - 原始技术数据
 * @returns {Array} 适配后的技术数据
 */
export function adaptTechnologies(technologies) {
    if (!technologies || !Array.isArray(technologies)) {
        console.warn('传入的技术数据无效');
        return [];
    }
    
    return technologies.map(tech => {
        // 首先检查是否是新格式数据（直接包含startYear和title字段）
        if (tech.title && tech.startYear !== undefined) {
            // 确保有year字段，防止undefined值
            const startYear = tech.startYear;
            const endYear = tech.endYear || startYear;
            
            // 确保位置信息格式正确
            let location;
            if (tech.location) {
                if (typeof tech.location === 'object' && tech.location.lat !== undefined) {
                    location = {lat: tech.location.lat, lng: tech.location.lng};
                } else if (Array.isArray(tech.location)) {
                    location = {lat: tech.location[0], lng: tech.location[1]};
                } else {
                    location = tech.location;  // 保持原始格式
                }
            } else {
                // 默认位置
                location = {lat: 0, lng: 0};
            }
            
            return {
                ...tech,
                year: startYear,  // 确保有year字段
                endYear: endYear,
                location: location,
                // 其他字段保持原样
                category: tech.category || '技术'
            };
        }
        
        // 处理旧格式数据（带有'发明时间'字段）
        const timeStr = tech['发明时间'] || '';
        let startYear = 0, endYear = 0;
        
        if (timeStr.includes('约') || timeStr.includes('至')) {
            // 处理时间范围
            const parts = timeStr.replace(/约|公元/g, '').split('至');
            startYear = parseYearString(parts[0]);
            endYear = parts.length > 1 ? parseYearString(parts[1]) : startYear;
        } else {
            // 处理单一年份
            startYear = parseYearString(timeStr);
            endYear = startYear;
        }
        
        // 转换位置信息
        let location = {lat: 0, lng: 0}; // 默认位置
        if (tech['发明地点'] && typeof tech['发明地点'] === 'object') {
            if (tech['发明地点']['纬度'] !== undefined && tech['发明地点']['经度'] !== undefined) {
                location = {
                    lat: tech['发明地点']['纬度'],
                    lng: tech['发明地点']['经度']
                };
            }
        }
        
        // 返回适配后的技术对象，确保必要字段都存在且有有效值
        return {
            id: tech['技术ID'] || tech.id || `tech-${Math.random().toString(36).substring(2, 9)}`,
            title: tech['技术名称'] || tech.title || '未命名技术',
            year: startYear,        // 确保有year字段
            startYear: startYear,   // 确保有startYear字段
            endYear: endYear,
            description: tech['技术描述'] || tech.description || '',
            category: tech['技术类型'] || tech.category || '技术',
            location: location,
            importance: tech['重要性'] || tech.importance || 3,
            impact: tech['影响描述'] || tech.impact || '',
            region: tech['地区'] || tech.region || ''
        };
    });
}

/**
 * 将物种数据适配为前端需要的格式
 * @param {Array} species - 原始物种数据
 * @returns {Array} 适配后的物种数据
 */
export function adaptSpecies(species) {
    if (!species || !Array.isArray(species)) {
        console.warn('传入的物种数据无效');
        return [];
    }
    
    return species.map(s => {
        // 处理新的数据格式
        // 检查是否是新格式数据
        if (s.title && s.startYear !== undefined) {
            // 确保位置数据格式正确
            let location = [0, 0]; // 默认位置
            if (s.location) {
                if (s.location.lng !== undefined && s.location.lat !== undefined) {
                    location = [s.location.lng, s.location.lat];
                } else if (Array.isArray(s.location) && s.location.length === 2) {
                    location = s.location;
                }
            }
            
            return {
                id: s.id || `species-${Math.random().toString(36).substr(2, 9)}`,
                title: s.title,
                scientificName: s.scientificName || '',
                year: s.startYear,
                endYear: s.endYear || s.startYear,
                type: s.category || '物种',
                location: location,
                domesticationStatus: s.domesticationStatus || '',
                distribution: s.region || s.distribution || '',
                uses: s.uses || '',
                impact: s.impact || '',
                relatedEvents: s.relatedEvents || [],
                period: s.period || '',
                description: s.description || '',
                importance: s.importance || 3,
                category: '物种', // 为了颜色方案
                // 保留原始数据以备查询
                originalData: s
            };
        }
        
        // 处理旧格式数据（如果有）
        // 解析年份
        const timeStr = s['驯化时间'] || '';
        const year = parseYearString(timeStr);
        
        // 转换位置信息
        let location = [0, 0]; // 默认位置
        if (s['驯化地点'] && typeof s['驯化地点'] === 'object') {
            location = [s['驯化地点']['经度'], s['驯化地点']['纬度']];
        }
        
        // 从旧格式提取物种名称
        let title = '';
        if (s['物种名称']) {
            if (typeof s['物种名称'] === 'object' && s['物种名称']['通用名']) {
                title = s['物种名称']['通用名'];
            } else if (typeof s['物种名称'] === 'string') {
                title = s['物种名称'];
            }
        } else {
            title = s['名称'] || '未命名物种';
        }
        
        // 返回适配后的物种对象
        return {
            id: s['物种ID'] || `species-${Math.random().toString(36).substr(2, 9)}`,
            title: title,
            scientificName: s['物种名称'] && s['物种名称']['学名'] ? s['物种名称']['学名'] : '',
            year: year,
            endYear: year, // 旧格式没有结束年份
            type: s['物种类型'] || '物种',
            location: location,
            domesticationStatus: s['驯化状态'] || '',
            distribution: s['分布区域'] || '',
            uses: s['用途'] || '',
            impact: s['对人类发展的贡献'] || '',
            relatedEvents: s['关联事件'] || [],
            period: s['时期'] || '',
            importance: s['重要性'] || 3,
            category: '物种', // 为了颜色方案
            // 保留原始数据以备查询
            originalData: s
        };
    });
}

/**
 * 解析年份字符串为数字
 * @param {string} yearStr - 年份字符串
 * @returns {number} 解析后的年份数字（负数表示公元前）
 */
function parseYearString(yearStr) {
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
 * 将疾病数据适配为前端需要的格式
 * @param {Array} diseases - 原始疾病数据
 * @returns {Array} 适配后的疾病数据
 */
export function adaptDiseases(diseases) {
    if (!diseases || !Array.isArray(diseases)) {
        console.warn('传入的疾病数据无效');
        return [];
    }
    
    return diseases.map(disease => {
        // 处理年份信息
        const startYear = disease.startYear || parseYearString(disease['开始年份'] || disease['发现年份'] || '');
        const endYear = disease.endYear || parseYearString(disease['结束年份'] || disease['控制年份'] || '');
        
        // 处理位置信息
        let location = [0, 0];
        if (disease.location) {
            if (typeof disease.location === 'object' && disease.location.lat !== undefined) {
                location = [disease.location.lat, disease.location.lng];
            } else if (Array.isArray(disease.location) && disease.location.length >= 2) {
                location = disease.location;
            }
        } else if (disease['起源地点'] && typeof disease['起源地点'] === 'object') {
            location = [disease['起源地点']['纬度'], disease['起源地点']['经度']];
        }
        
        return {
            id: disease.id || disease['疾病ID'] || `disease-${Math.random().toString(36).substring(2, 9)}`,
            name: disease.name || disease.title || disease['疾病名称'] || '未命名疾病',
            startYear: startYear,
            endYear: endYear || (startYear + 10), // 默认持续10年
            location: location,
            coordinates: location,
            description: disease.description || disease['描述'] || '',
            category: 'disease',
            importance: disease.importance || disease['重要性'] || 3,
            casualties: disease.casualties || disease['致死人数'] || '',
            impact: disease.impact || disease['影响'] || '',
            originalData: disease
        };
    });
}

/**
 * 将战争数据适配为前端需要的格式
 * @param {Array} wars - 原始战争数据
 * @returns {Array} 适配后的战争数据
 */
export function adaptWars(wars) {
    if (!wars || !Array.isArray(wars)) {
        console.warn('传入的战争数据无效');
        return [];
    }
    
    return wars.map(war => {
        // 处理年份信息
        const startYear = war.startYear || parseYearString(war['开始年份'] || '');
        const endYear = war.endYear || parseYearString(war['结束年份'] || '');
        
        // 处理位置信息
        let location = [0, 0];
        if (war.location) {
            if (typeof war.location === 'object' && war.location.lat !== undefined) {
                location = [war.location.lat, war.location.lng];
            } else if (Array.isArray(war.location) && war.location.length >= 2) {
                location = war.location;
            }
        } else if (war['主要战场'] && typeof war['主要战场'] === 'object') {
            location = [war['主要战场']['纬度'], war['主要战场']['经度']];
        }
        
        return {
            id: war.id || war['战争ID'] || `war-${Math.random().toString(36).substring(2, 9)}`,
            name: war.name || war.title || war['战争名称'] || '未命名战争',
            startYear: startYear,
            endYear: endYear || (startYear + 1), // 默认持续1年
            location: location,
            coordinates: location,
            description: war.description || war['描述'] || '',
            category: 'war',
            importance: war.importance || war['重要性'] || 3,
            participants: war.participants || war['参战方'] || '',
            outcome: war.outcome || war['结果'] || '',
            casualties: war.casualties || war['伤亡人数'] || '',
            impact: war.impact || war['影响'] || '',
            originalData: war
        };
    });
}

/**
 * 将文明/社会组织数据适配为前端需要的格式
 * @param {Array} civilizations - 原始文明数据
 * @returns {Array} 适配后的文明数据
 */
export function adaptCivilizations(civilizations) {
    if (!civilizations || !Array.isArray(civilizations)) {
        console.warn('传入的文明数据无效');
        return [];
    }
    
    return civilizations.map(civ => {
        // 处理年份信息
        const startYear = civ.startYear || parseYearString(civ['开始年份'] || civ['兴起年份'] || '');
        const endYear = civ.endYear || parseYearString(civ['结束年份'] || civ['衰亡年份'] || '');
        
        // 处理位置信息
        let location = [0, 0];
        if (civ.location) {
            if (typeof civ.location === 'object' && civ.location.lat !== undefined) {
                location = [civ.location.lat, civ.location.lng];
            } else if (Array.isArray(civ.location) && civ.location.length >= 2) {
                location = civ.location;
            }
        } else if (civ['中心位置'] && typeof civ['中心位置'] === 'object') {
            location = [civ['中心位置']['纬度'], civ['中心位置']['经度']];
        }
        
        return {
            id: civ.id || civ['文明ID'] || `civilization-${Math.random().toString(36).substring(2, 9)}`,
            name: civ.name || civ.title || civ['文明名称'] || '未命名文明',
            startYear: startYear,
            endYear: endYear || (startYear + 500), // 默认持续500年
            location: location,
            coordinates: location,
            description: civ.description || civ['描述'] || '',
            category: 'civilization',
            importance: civ.importance || civ['重要性'] || 3,
            characteristics: civ.characteristics || civ['特点'] || '',
            achievements: civ.achievements || civ['成就'] || '',
            impact: civ.impact || civ['影响'] || '',
            originalData: civ
        };
    });
}

/**
 * 将农业数据适配为前端需要的格式
 * @param {Array} agriculture - 原始农业数据
 * @returns {Array} 适配后的农业数据
 */
export function adaptAgriculture(agriculture) {
    if (!agriculture || !Array.isArray(agriculture)) {
        console.warn('传入的农业数据无效');
        return [];
    }
    
    return agriculture.map(agri => {
        // 处理年份信息
        const startYear = agri.startYear || parseYearString(agri['开始年份'] || agri['驯化年份'] || '');
        const endYear = agri.endYear || parseYearString(agri['结束年份'] || agri['普及年份'] || '');
        
        // 处理位置信息
        let location = [0, 0];
        if (agri.location) {
            if (typeof agri.location === 'object' && agri.location.lat !== undefined) {
                location = [agri.location.lat, agri.location.lng];
            } else if (Array.isArray(agri.location) && agri.location.length >= 2) {
                location = agri.location;
            }
        } else if (agri['起源地点'] && typeof agri['起源地点'] === 'object') {
            location = [agri['起源地点']['纬度'], agri['起源地点']['经度']];
        }
        
        return {
            id: agri.id || agri['农业ID'] || `agriculture-${Math.random().toString(36).substring(2, 9)}`,
            name: agri.name || agri.title || agri['作物/技术名称'] || '未命名农业技术',
            startYear: startYear,
            endYear: endYear || (startYear + 100), // 默认持续100年
            location: location,
            coordinates: location,
            description: agri.description || agri['描述'] || '',
            category: 'agriculture',
            importance: agri.importance || agri['重要性'] || 3,
            cropType: agri.cropType || agri['作物类型'] || '',
            impact: agri.impact || agri['影响'] || '',
            originalData: agri
        };
    });
} 