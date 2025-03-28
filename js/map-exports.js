/**
 * 地图模块导出文件
 * 此文件将所有地图相关模块统一导出，方便其他文件引用
 */

// 导出核心模块
export { MapCore } from './map-core.js';
export { MapStyles } from './map-styles.js';
export { MapEvents } from './map-events.js';
export { MapMigrations } from './map-migrations.js';
export { MapFeatures } from './map-features.js';
export { MapUtils } from './map-utils.js';

// 导出工具函数
export {
    loadAllData,
    getEventsForYear,
    getMigrationsForYear
} from './data-loader.js';

// 导出管理器模块
export { TimelineManager } from './timeline-manager.js';
export { EventsManager } from './events-manager.js';
export { IntroManager } from './intro.js';

// 不再导出App类，应直接从app.js导入
// export { App } from './app.js';

// 不再为兼容旧版保留接口
// export { MapManager } from './map-manager.js';