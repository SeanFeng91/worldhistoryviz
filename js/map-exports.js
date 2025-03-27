/**
 * 地图模块导出文件
 * 此文件将所有地图相关模块统一导出，方便其他文件引用
 */

// 导出核心模块
export { MapCore } from './map-core.js';

// 导出地图事件模块
export { 
    addEventMarkers,
    createEventPopupContent,
    filterEventsByTimeRange,
    highlightEvent,
    getRelevantEvents,
    toggleEventMarkers
} from './map-events.js';

// 导出地图迁移模块
export {
    addMigrationRoutes,
    createMigrationPopupContent,
    filterActiveMigrations,
    calculateMigrationProgress,
    toggleMigrationRoutes
} from './map-migrations.js';

// 导出地图特性模块
export {
    addFeatureMarkers,
    createFeaturePopupContent,
    getRelevantFeatures,
    toggleFeatureMarkers
} from './map-features.js';

// 导出地图样式模块
export {
    getMapStyle,
    styleByCategory,
    getCountryColor,
    getCategoryIcon,
    createCustomMarker
} from './map-styles.js';

// 导出地图工具模块
export {
    formatYear,
    getMapForYear,
    loadGeoJSON,
    loadHistoricalMap,
    convertCoordinates,
    calculateDistance,
    isTimeRangeRelevant,
    parseYearString,
    eventsToGeoJSON,
    migrationToGeoJSON
} from './map-utils.js';

// 导出主应用
export { App } from './app.js';

// 为兼容保留旧版接口
export { MapManager } from './map-manager.js';