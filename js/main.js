/**
 * 主入口文件
 */

import { App } from './map-exports.js';

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM加载完成，初始化历史地图应用');
    
    try {
        // 实例化并初始化应用
        const app = new App();
        
        // 将应用实例存储在全局变量中，方便其他模块访问
        window.historyMapApp = app;
        
        // 初始化应用
        await app.initialize();
        
        console.log('应用初始化完成');
    } catch (error) {
        console.error('应用初始化失败:', error);
        alert('应用加载失败，请刷新页面重试');
    }
}); 