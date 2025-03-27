/**
 * 此文件用于兼容旧版本代码
 * 将原有的 MapManager 类重定向到新的模块化结构
 */

import { MapCore } from './map-core.js';

// 为保持向后兼容性，将 MapManager 映射为 MapCore
export class MapManager extends MapCore {
    constructor(options = {}) {
        super(options);
        console.warn('MapManager 已被废弃，请使用 MapCore 及其相关模块。');
    }
} 