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
        
        // 确认关键功能可用
        setTimeout(() => {
            if (window.historyMapApp && window.historyMapApp.eventManager) {
                console.log('事件管理器正常可用');
            } else {
                console.warn('警告：事件管理器未正确初始化，部分功能可能不可用');
            }
        }, 1000);
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
    
    // 强制调整地图容器大小
    const enforceMapSize = () => {
        const mapContainer = document.getElementById('map-container');
        const mapElement = document.getElementById('map');
        
        if (mapContainer && mapElement) {
            const viewportHeight = window.innerHeight;
            const headerHeight = 100; // 估计的顶部高度
            const timelineHeight = 45; // 估计的时间轴高度
            
            const mapHeight = viewportHeight - headerHeight - timelineHeight;
            
            console.log(`设置地图高度: ${mapHeight}px (视口高度: ${viewportHeight}px)`);
            
            mapContainer.style.height = `${mapHeight}px`;
            mapElement.style.height = `${mapHeight}px`;
            
            // 确保地图元素有明确的尺寸
            mapElement.style.width = '100%';
            mapElement.style.minHeight = '400px';
            
            // 在开发者控制台显示实际高度
            setTimeout(() => {
                console.log(`地图容器实际尺寸: ${mapContainer.offsetWidth}x${mapContainer.offsetHeight}`);
                console.log(`地图实际尺寸: ${mapElement.offsetWidth}x${mapElement.offsetHeight}`);
            }, 100);
        }
    };
    
    // 立即调整地图大小
    enforceMapSize();
    
    // 检查并设置初始状态
    const updateSidebarTogglePosition = () => {
        const eventsList = document.getElementById('events-list');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        
        if (eventsList && sidebarToggle) {
            // 根据屏幕尺寸和侧边栏状态调整toggleBtn位置
            if (window.innerWidth > 1024) {
                // 大屏幕
                if (eventsList.classList.contains('collapsed')) {
                    sidebarToggle.style.left = '0';
                } else {
                    sidebarToggle.style.left = '300px';
                }
            } else {
                // 小屏幕
                if (eventsList.classList.contains('show-mobile')) {
                    sidebarToggle.style.left = '85%';
                } else {
                    sidebarToggle.style.left = '0';
                }
            }
        }
    };
    
    // 立即执行一次
    updateSidebarTogglePosition();
    
    // 监听窗口大小变化时重新调整地图大小
    window.addEventListener('resize', () => {
        console.log('窗口大小变化，重新调整地图大小');
        enforceMapSize();
        
        // 检查eventsList和mobileToggle
        if (eventsList) {
            const width = window.innerWidth;
            console.log('窗口大小变化:', width, 'x', window.innerHeight);
            
            if (width > 1024) {
                console.log('窗口变化为桌面尺寸，显示侧边栏');
                eventsList.classList.remove('-translate-x-full');
                eventsList.classList.remove('show-mobile');
            } else {
                console.log('窗口变化为移动端/平板尺寸，隐藏侧边栏');
                eventsList.classList.add('-translate-x-full');
                eventsList.classList.remove('show-mobile');
                if (mobileToggle && mobileToggle.querySelector('i')) {
                    mobileToggle.querySelector('i').textContent = 'menu';
                }
            }
        }
        
        // 更新sidebar-toggle位置
        updateSidebarTogglePosition();
        
        // 强制重新计算地图尺寸 - 多次尝试确保成功
        if (window.historyMapApp && window.historyMapApp.map) {
            console.log('立即重新计算地图尺寸');
            window.historyMapApp.map.invalidateSize(true);
            
            // 延迟执行以确保渲染完成后再次调整
            setTimeout(() => {
                if (window.historyMapApp && window.historyMapApp.map) {
                    console.log('延迟100ms重新计算地图尺寸');
                    window.historyMapApp.map.invalidateSize(true);
                }
            }, 100);
            
            // 再次延迟执行
            setTimeout(() => {
                if (window.historyMapApp && window.historyMapApp.map) {
                    console.log('延迟500ms重新计算地图尺寸');
                    window.historyMapApp.map.invalidateSize(true);
                }
            }, 500);
        }
    });
    
    // 确保地图在视图准备好时加载
    // 有时页面需要渲染时间，添加延迟初始化
    setTimeout(() => {
        enforceMapSize();
        if (window.historyMapApp && window.historyMapApp.map) {
            console.log('延迟重新计算地图尺寸');
            window.historyMapApp.map.invalidateSize(true);
        }
    }, 1000);
    
    // 更多的延迟尝试，确保地图在各种情况下都能正确显示
    setTimeout(() => {
        enforceMapSize();
        if (window.historyMapApp && window.historyMapApp.map) {
            console.log('延迟2秒重新计算地图尺寸');
            window.historyMapApp.map.invalidateSize(true);
        }
    }, 2000);
    
    // 移动端菜单控制
    const mobileToggle = document.getElementById('mobile-toggle');
    const eventsList = document.getElementById('events-list');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    if (mobileToggle && eventsList) {
        console.log('初始化移动端菜单控制');
        mobileToggle.addEventListener('click', () => {
            console.log('切换移动端菜单');
            eventsList.classList.toggle('-translate-x-full');
            eventsList.classList.toggle('show-mobile');
            
            // 更新Mobile-toggle图标
            mobileToggle.querySelector('i').textContent = 
                eventsList.classList.contains('-translate-x-full') ? 'menu' : 'close';
                
            // 更新sidebar-toggle图标旋转
            if (sidebarToggle && sidebarToggle.querySelector('i')) {
                if (eventsList.classList.contains('-translate-x-full')) {
                    sidebarToggle.querySelector('i').style.transform = '';
                } else {
                    sidebarToggle.querySelector('i').style.transform = 'rotate(180deg)';
                }
            }
            
            // 更新地图大小
            if (window.historyMapApp && window.historyMapApp.map) {
                setTimeout(() => {
                    window.historyMapApp.map.invalidateSize(true);
                }, 300);
            }
        });

        // 点击地图区域时自动关闭移动端菜单
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.addEventListener('click', () => {
                console.log('点击地图，检查是否需要关闭菜单');
                if (window.innerWidth <= 768) {
                    eventsList.classList.add('-translate-x-full');
                    eventsList.classList.remove('show-mobile');
                    mobileToggle.querySelector('i').textContent = 'menu';
                }
            });
        }

        // 侧边栏折叠按钮点击事件
        if (sidebarToggle && eventsList) {
            console.log('初始化侧边栏折叠按钮');
            sidebarToggle.addEventListener('click', () => {
                console.log('侧边栏切换按钮点击');
                
                // 切换侧边栏折叠状态
                eventsList.classList.toggle('collapsed');
                
                // 在移动设备上同时切换 -translate-x-full 和 show-mobile 类
                if (window.innerWidth <= 768) {
                    eventsList.classList.toggle('-translate-x-full');
                    eventsList.classList.toggle('show-mobile');
                    if (mobileToggle && mobileToggle.querySelector('i')) {
                        mobileToggle.querySelector('i').textContent = 
                            eventsList.classList.contains('-translate-x-full') ? 'menu' : 'close';
                    }
                }
                
                // 立即更新 sidebar-toggle 的位置
                updateSidebarTogglePosition();
                
                // 更新地图大小
                if (window.historyMapApp && window.historyMapApp.map) {
                    setTimeout(() => {
                        window.historyMapApp.map.invalidateSize();
                        
                        // 更新时间轴宽度
                        const timelineContainer = document.querySelector('.timeline-container');
                        const timelineOverlay = document.querySelector('.timeline-overlay');
                        if (timelineContainer) {
                            timelineContainer.style.transition = 'all 0.3s ease';
                            if (eventsList.classList.contains('collapsed')) {
                                timelineContainer.style.width = 'calc(100% - 40px)';
                                timelineContainer.style.left = '20px';
                                if (timelineOverlay) {
                                    timelineOverlay.style.width = '100%';
                                    timelineOverlay.style.left = '0';
                                }
                            } else {
                                if (window.innerWidth > 1024) {
                                    timelineContainer.style.width = 'calc(100% - 300px)';
                                    timelineContainer.style.marginLeft = '300px';
                                } else {
                                    timelineContainer.style.width = '100%';
                                    timelineContainer.style.left = '0';
                                }
                                if (timelineOverlay) {
                                    timelineOverlay.style.width = 'calc(100% - 300px)';
                                    timelineOverlay.style.left = 'auto';
                                }
                            }
                        }
                        
                        window.dispatchEvent(new Event('resize'));
                    }, 300);
                }
            });
        }

        // 立即设置初始状态
        if (window.innerWidth <= 768) {
            console.log('移动端视图：隐藏侧边栏');
            eventsList.classList.add('-translate-x-full');
            eventsList.classList.remove('show-mobile');
        } else {
            console.log('桌面视图：显示侧边栏');
            eventsList.classList.remove('-translate-x-full');
        }
    }

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

    // 监听全屏模式变化
    document.addEventListener('fullscreenchange', adjustTimelineInFullscreen);
    document.addEventListener('webkitfullscreenchange', adjustTimelineInFullscreen);
    document.addEventListener('mozfullscreenchange', adjustTimelineInFullscreen);
    document.addEventListener('MSFullscreenChange', adjustTimelineInFullscreen);
});

// 调整全屏模式下的时间轴
function adjustTimelineInFullscreen() {
    const timelineContainer = document.getElementById('timeline-container');
    if (!timelineContainer) return;
    
    // 检查是否处于全屏模式
    const isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    );
    
    console.log('全屏模式状态变化:', isFullscreen);
    
    // 添加/移除全屏标记
    if (isFullscreen) {
        document.body.classList.add('fullscreen');
        timelineContainer.style.width = '100%';
        timelineContainer.style.marginLeft = '0';
    } else {
        document.body.classList.remove('fullscreen');
        
        // 检查侧边栏状态
        const eventsList = document.getElementById('events-list');
        const isSidebarCollapsed = eventsList && (
            eventsList.classList.contains('collapsed') || 
            eventsList.classList.contains('-translate-x-full')
        );
        
        if (isSidebarCollapsed || window.innerWidth <= 1024) {
            timelineContainer.style.width = '100%';
            timelineContainer.style.marginLeft = '0';
        } else if (window.innerWidth > 1024) {
            timelineContainer.style.width = 'calc(100% - 300px)';
            timelineContainer.style.marginLeft = '300px';
        }
    }
    
    // 通知地图重新计算大小
    if (window.historyMapApp && window.historyMapApp.map) {
        setTimeout(() => {
            window.historyMapApp.map.invalidateSize(true);
        }, 300);
    }
} 