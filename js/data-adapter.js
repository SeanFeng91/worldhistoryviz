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
        // 解析年份
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
        let location = [0, 0]; // 默认位置
        if (tech['发明地点'] && typeof tech['发明地点'] === 'object') {
            location = [tech['发明地点']['经度'], tech['发明地点']['纬度']];
        }
        
        // 返回适配后的技术对象
        return {
            id: tech['技术ID'],
            title: tech['技术名称'],
            year: startYear,
            endYear: endYear,
            description: tech['技术描述'],
            category: tech['技术类型'],
            location: location,
            diffusion: tech['技术扩散'],
            impact: tech['影响描述'],
            relatedEvents: tech['关联事件'] || [],
            period: tech['时期']
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