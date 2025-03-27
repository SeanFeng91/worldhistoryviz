/**
 * 地图工具导出文件
 * 从MapUtils导出所需的所有函数
 */

// 导入MapUtils对象
import MapUtils from './map-utils.js';

// 导出所有需要的函数
export function getMapForYear(year) {
    return MapUtils.loadHistoricalMap(year);
}

export function isEventRelevant(event, currentYear) {
    return MapUtils.isEventRelevantToYear(event, currentYear);
}

export function isMigrationRelevant(migration, currentYear) {
    return MapUtils.isMigrationRelevantToYear(migration, currentYear);
}

export function getKeyYears() {
    return MapUtils.mapYears.map(item => item.year);
}

export function findClosestMapFile(year) {
    return MapUtils.findClosestMapFile(year);
}

export function formatYear(year) {
    return MapUtils.formatYear(year);
}

export function styleByCategory(feature) {
    return MapUtils.styleByCategory(feature);
}

export function createEventPopupContent(feature) {
    return MapUtils.createEventPopupContent(feature);
}

export function createMigrationPopupContent(feature) {
    return MapUtils.createMigrationPopupContent(feature);
}

export function eventsToGeoJSON(events) {
    return MapUtils.eventsToGeoJSON(events);
}

export function filterEventsByTimeRange(events, year, range) {
    return MapUtils.filterEventsByTimeRange(events, year, range);
}

export function filterActiveMigrations(migrations, year) {
    return MapUtils.filterActiveMigrations(migrations, year);
}

export function calculateMigrationProgress(migration, year) {
    return MapUtils.calculateMigrationProgress(migration, year);
}

export function migrationToGeoJSON(migration, progress) {
    return MapUtils.migrationToGeoJSON(migration, progress);
}

export function convertMigrationToGeoJSON(migration, progress) {
    return MapUtils.convertMigrationToGeoJSON(migration, progress);
}