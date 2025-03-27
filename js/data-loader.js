/**
 * 数据加载模块
 * 用于加载所有可视化所需的数据
 */

import { adaptHistoricalEvents, adaptMigrations, adaptTechnologies, adaptSpecies } from './data-adapter.js';

/**
 * 加载指定的JSON数据文件
 * @param {string} filename - 数据文件名
 * @returns {Promise} 包含解析后的JSON数据的Promise
 */
async function loadJSONData(filename) {
    console.log(`正在加载数据文件：${filename}`);
    try {
        // 使用相对路径加载数据文件，适应不同部署环境
        const response = await fetch(`./data/${filename}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log(`成功加载 ${filename}，包含 ${Array.isArray(data) ? data.length : '未知数量'} 条记录`);
        return data;
    } catch (error) {
        console.error(`加载 ${filename} 失败:`, error);
        // 返回空数组作为默认值
        return [];
    }
}

/**
 * 加载所有应用数据
 * @returns {Promise<Object>} 包含所有数据的对象
 */
export async function loadAllData() {
    try {
        // 加载各种数据
        console.log('开始加载所有数据...');
        
        const [
            allEvents,
            migrations,
            technologies,
            species,
            civilizations,
            wars,
            diseases,
            agriculture
        ] = await Promise.all([
            loadAllEvents(),
            loadMigrations(),
            loadTechnologies(),
            loadSpecies(),
            loadCivilizations(),
            loadWars(),
            loadDiseases(),
            loadAgriculture()
        ]);
        
        console.log('所有数据加载完成');
        
        // 返回所有数据
        return {
            allEvents,
            migrations: adaptMigrations(migrations),
            technologies: adaptTechnologies(technologies),
            species: adaptSpecies(species),
            civilizations,
            wars,
            diseases,
            agriculture
        };
    } catch (error) {
        console.error('加载数据时出错:', error);
        throw error;
    }
}

/**
 * 加载所有历史事件数据
 * @returns {Promise<Array>} 历史事件数组
 */
async function loadAllEvents() {
    return loadJSONData('all_events.json');
}

/**
 * 加载迁徙数据
 * @returns {Promise<Array>} 迁徙数据数组
 */
async function loadMigrations() {
    return loadJSONData('migrations.json');
}

/**
 * 加载技术发展数据
 * @returns {Promise<Array>} 技术发展数据数组
 */
async function loadTechnologies() {
    return loadJSONData('technologies.json');
}

/**
 * 加载物种数据
 * @returns {Promise<Array>} 物种数据数组
 */
async function loadSpecies() {
    return loadJSONData('species.json');
}

/**
 * 加载文明数据
 * @returns {Promise<Array>} 文明数据数组
 */
async function loadCivilizations() {
    return loadJSONData('civilizations.json');
}

/**
 * 加载战争数据
 * @returns {Promise<Array>} 战争数据数组
 */
async function loadWars() {
    return loadJSONData('wars.json');
}

/**
 * 加载疾病数据
 * @returns {Promise<Array>} 疾病数据数组
 */
async function loadDiseases() {
    return loadJSONData('diseases.json');
}

/**
 * 加载农业数据
 * @returns {Promise<Array>} 农业数据数组
 */
async function loadAgriculture() {
    return loadJSONData('agriculture.json');
}

/**
 * 获取与年份相关的事件
 * @param {Array} events - 事件数组
 * @param {number} year - 年份
 * @param {number} range - 年份范围
 * @returns {Array} 相关事件数组
 */
export function getEventsForYear(events, year, range = 100) {
    if (!events || !Array.isArray(events)) {
        console.warn('传入的事件数据无效');
        return [];
    }
    
    return events.filter(event => {
        // 先标准化时间字段
        const startYear = event.startYear !== undefined ? event.startYear : event.year;
        const endYear = event.endYear;
        
        // 如果事件有开始和结束年份，检查当前年份是否在该范围内
        if (startYear !== undefined && endYear !== undefined) {
            return year >= startYear && year <= endYear;
        }
        
        // 如果事件只有一个年份，检查与当前年份的差距是否在范围内
        if (startYear !== undefined) {
            return Math.abs(startYear - year) <= range;
        }
        
        return false;
    });
}

/**
 * 获取与年份相关的迁徙路线
 * @param {Array} migrations - 迁徙路线数组
 * @param {number} year - 年份
 * @returns {Array} 相关迁徙路线数组
 */
export function getMigrationsForYear(migrations, year) {
    if (!migrations || !Array.isArray(migrations)) {
        console.warn('传入的迁徙数据无效');
        return [];
    }
    
    return migrations.filter(migration => {
        return migration.startYear <= year && migration.endYear >= year;
    });
}

/**
 * 获取与特定事件相关的事件
 * @param {Array} events - 事件数组
 * @param {string} eventId - 事件ID
 * @returns {Array} 相关事件数组
 */
export function getRelatedEvents(events, eventId) {
    if (!events || !Array.isArray(events)) {
        console.warn('传入的事件数据无效');
        return [];
    }
    
    // 找到目标事件
    const targetEvent = events.find(event => event.id === eventId);
    if (!targetEvent || !targetEvent.relatedEvents || !Array.isArray(targetEvent.relatedEvents)) {
        return [];
    }
    
    // 返回所有相关事件
    return events.filter(event => targetEvent.relatedEvents.includes(event.id));
}

/**
 * 按类别过滤事件
 * @param {Array} events - 事件数组
 * @param {string} category - 类别
 * @returns {Array} 过滤后的事件数组
 */
export function filterEventsByCategory(events, category) {
    if (!events || !Array.isArray(events)) {
        console.warn('传入的事件数据无效');
        return [];
    }
    
    if (!category) {
        return events;
    }
    
    return events.filter(event => event.category === category);
}

/**
 * 按重要性排序事件
 * @param {Array} events - 事件数组
 * @param {boolean} descending - 是否降序排序
 * @returns {Array} 排序后的事件数组
 */
export function sortEventsByImportance(events, descending = true) {
    if (!events || !Array.isArray(events)) {
        console.warn('传入的事件数据无效');
        return [];
    }
    
    return [...events].sort((a, b) => {
        const importanceA = a.importance || 0;
        const importanceB = b.importance || 0;
        return descending ? importanceB - importanceA : importanceA - importanceB;
    });
}

/**
 * 按年份排序事件
 * @param {Array} events - 事件数组
 * @param {boolean} ascending - 是否升序排序
 * @returns {Array} 排序后的事件数组
 */
export function sortEventsByYear(events, ascending = true) {
    if (!events || !Array.isArray(events)) {
        console.warn('传入的事件数据无效');
        return [];
    }
    
    return [...events].sort((a, b) => {
        // 获取事件的开始年份，优先使用startYear，其次是year
        const yearA = a.startYear !== undefined ? a.startYear : (a.year || 0);
        const yearB = b.startYear !== undefined ? b.startYear : (b.year || 0);
        return ascending ? yearA - yearB : yearB - yearA;
    });
}

/**
 * 加载分类数据
 * @returns {Promise} 包含分类数据的Promise
 */
export async function loadCategories() {
    try {
        const dataIndex = await loadJSONData('index.json');
        if (dataIndex && dataIndex.categories) {
            return dataIndex.categories;
        }
        return [];
    } catch (error) {
        console.error('加载分类数据失败:', error);
        return [];
    }
}