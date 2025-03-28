/**
 * 主入口文件 - 《枪炮、病毒与钢铁》历史地图可视化
 * 这是应用的唯一入口点，负责初始化所有模块
 */

import { App } from './app.js';

// 全局错误处理
window.addEventListener('error', function(event) {
    console.error('全局错误捕获:', event.error);
});

// 捕获未处理的Promise错误
window.addEventListener('unhandledrejection', function(event) {
    console.error('未处理的Promise错误:', event.reason);
    
    // 特别处理浏览器扩展错误
    const errorMessage = event.reason ? (event.reason.message || event.reason.toString()) : '';
    if (errorMessage.includes('Could not establish connection') || 
        errorMessage.includes('Receiving end does not exist')) {
        
        console.warn('这是一个浏览器扩展相关错误，不影响应用核心功能');
        
        // 防止错误传播
        event.preventDefault();
        event.stopPropagation();
        
        // 如果应用实例存在，强制继续初始化
        if (window.historyMapApp && !window.historyMapApp.isInitialized) {
            console.log('尝试继续初始化应用...');
            continueInitialization();
        }
    }
});

// 忽略浏览器扩展错误
function isExtensionError(error) {
    if (!error) return false;
    const errorStr = error.toString();
    return errorStr.includes('extension') || 
           errorStr.includes('Receiving end does not exist') ||
           errorStr.includes('Could not establish connection');
}

// 在出现浏览器扩展错误后继续初始化
async function continueInitialization() {
    try {
        // 检查应用实例
        if (!window.historyMapApp) {
            console.log('应用实例不存在，创建新实例');
            window.historyMapApp = new App();
        }
        
        // 如果已经初始化，则跳过
        if (window.historyMapApp.isInitialized) {
            console.log('应用已初始化，跳过');
            return;
        }
        
        // 设置主题
        window.historyMapApp.setupThemeToggle();
        
        // 强制初始化应用
        await window.historyMapApp.initialize();
        console.log('应用初始化成功 (延迟初始化)');
    } catch (retryError) {
        console.error('延迟初始化应用失败:', retryError);
        
        // 最后的尝试：刷新页面
        if (!window._hasAttemptedReload) {
            window._hasAttemptedReload = true;
            console.log('尝试刷新页面...');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            // 已经尝试过刷新，显示错误提示
            alert('应用无法正常初始化，请尝试使用无痕模式或禁用浏览器扩展后重试');
        }
    }
}

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM加载完成，初始化历史地图应用');
    
    // 检查CSS样式表是否加载
    const styleSheets = Array.from(document.styleSheets);
    const timelineCssLoaded = styleSheets.some(sheet => 
        sheet.href && sheet.href.includes('timeline.css')
    );
    console.log('时间轴CSS加载状态:', timelineCssLoaded ? '已加载' : '未加载');
    
    // 如果时间轴CSS未加载，尝试手动加载
    if (!timelineCssLoaded) {
        console.warn('时间轴CSS未检测到，尝试手动加载');
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/timeline.css';
        document.head.appendChild(link);
    }
    
    try {
        // 检查环境
        console.log('当前运行环境:', {
            url: window.location.href,
            userAgent: navigator.userAgent,
            screenSize: `${window.innerWidth}x${window.innerHeight}`
        });
        
        // 检查地图容器
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            throw new Error('找不到地图容器 (id="map")');
        }
        console.log(`找到地图容器: ${mapElement.offsetWidth}x${mapElement.offsetHeight}`);
        
        // 检查 Leaflet 是否加载
        if (typeof L === 'undefined') {
            throw new Error('Leaflet 库未加载');
        }
        console.log('Leaflet 版本:', L.version);
        
        // 实例化应用
        const app = new App();
        console.log('应用实例创建成功');
        
        // 将应用实例存储在全局变量中，方便其他模块访问
        window.historyMapApp = app;
        
        // 设置主题切换
        app.setupThemeToggle();
        console.log('主题设置完成');
        
        // 初始化应用
        console.log('开始初始化应用...');
        await app.initialize();
        
        console.log('应用初始化完成');
    } catch (error) {
        // 检查是否是浏览器扩展相关错误
        if (isExtensionError(error)) {
            console.warn('检测到浏览器扩展相关错误，应用将继续运行:', error);
            // 设置延迟，让潜在的错误传播完成
            setTimeout(() => {
                continueInitialization();
            }, 500);
        } else {
            console.error('应用初始化失败:', error);
            alert('应用加载失败，请刷新页面重试: ' + error.message);
        }
    }
}); 