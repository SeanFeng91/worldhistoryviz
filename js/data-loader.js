/**
 * 数据加载模块
 * 用于加载所有可视化所需的数据
 */

import { 
    adaptHistoricalEvents, 
    adaptMigrations, 
    adaptTechnologies, 
    adaptSpecies,
    adaptCivilizations,
    adaptWars,
    adaptDiseases,
    adaptAgriculture
} from './data-adapter.js';

/**
 * 加载指定的JSON数据文件
 * @param {string} filename - 数据文件名
 * @returns {Promise} 包含解析后的JSON数据的Promise
 */
export async function loadJSONData(filename) {
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
        
        // 返回所有数据,并确保应用适配器到所有数据类型
        // 注意：迁移数据不通过适配器处理，直接使用原始数据
        return {
            allEvents, // 已经在loadAllEvents中应用了适配器
            migrations: migrations, // 不使用适配器，保留原始数据格式
            technologies: adaptTechnologies(technologies),
            species: adaptSpecies(species),
            civilizations: adaptCivilizations(civilizations),
            wars: adaptWars(wars),
            diseases: adaptDiseases(diseases),
            agriculture: adaptAgriculture(agriculture)
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
    try {
        // 加载事件索引
        const eventIndex = await loadJSONData('all_events.json');
        
        // 检查是否是事件索引格式
        if (eventIndex && eventIndex.categories && Array.isArray(eventIndex.categories)) {
            console.log('检测到事件索引格式，将整合所有分类事件');
            
            // 不再返回空数组，而是返回一个空的结构化对象
            // 实际事件会在loadAllData的其他分类中获取
            console.log('注意: 全局事件数组为空，将使用分类事件数据');
            return [];
        } else if (Array.isArray(eventIndex)) {
            // 如果是直接的事件数组，使用适配器
            console.log(`加载了${eventIndex.length}个事件数据`);
            return adaptHistoricalEvents(eventIndex);
        } else {
            console.warn('事件数据格式无效');
            return [];
        }
    } catch (error) {
        console.error('加载事件数据失败:', error);
        return [];
    }
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
            // 在范围内
            if (year >= startYear && year <= endYear) {
                return true;
            }
            
            // 对于范围边缘的事件，如果在range内也返回
            return Math.min(
                Math.abs(startYear - year), 
                Math.abs(endYear - year)
            ) <= range;
        }
        
        // 如果事件只有一个年份，检查与当前年份的差距是否在范围内
        if (startYear !== undefined) {
            return Math.abs(startYear - year) <= range;
        }
        
        return false;
    });
}

/**
 * 获取与年份相关的迁徙路线，直接返回原始数据，不经过适配器处理
 * @param {number} year - 年份
 * @returns {Promise<Array>} 相关迁徙路线数组的Promise
 */
export async function getMigrationsForYear(year) {
    try {
        console.log(`获取${year}年的迁徙数据`);
        // 直接加载全部迁徙数据
        const allMigrations = await loadJSONData('migrations.json');
        
        if (!allMigrations || !Array.isArray(allMigrations)) {
            console.warn('加载的迁徙数据无效');
            return [];
        }
        
        console.log(`加载了${allMigrations.length}条迁徙数据`);
        
        // 检查迁移数据的完整性，但不做适配转换
        allMigrations.forEach((migration, index) => {
            // 验证必要字段是否存在
            if (!migration.from || !migration.to || !migration.path) {
                console.warn(`迁移数据 ${migration.id || index} 缺少必要字段`);
            }
        });
        
        // 筛选符合年份条件的迁徙，原样返回
        const filteredMigrations = allMigrations.filter(migration => {
            // 确保迁徙数据有年份
            const startYear = migration.startYear !== undefined ? migration.startYear : (migration.year || 0);
            const endYear = migration.endYear !== undefined ? migration.endYear : startYear;
            
            // 检查年份是否在迁徙的时间范围内
            return year >= startYear && year <= endYear;
        });
        
        console.log(`筛选后得到${filteredMigrations.length}条迁徙数据`);
        
        // 如果有数据，打印第一条数据以便调试
        if (filteredMigrations.length > 0) {
            console.log(`第一条迁徙数据: ${JSON.stringify(filteredMigrations[0])}`);
        }
        
        return filteredMigrations;
    } catch (error) {
        console.error('获取迁徙数据失败:', error);
        return [];
    }
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