/**
 * 《枪炮、病毒与钢铁》历史地图可视化 - 主应用模块
 * 整合所有功能模块，并初始化应用
 */

import { loadAllData } from './data-loader.js';
import { MapManager } from './map-manager.js';
import { TimelineManager } from './timeline-manager.js';
import { EventsManager } from './events-manager.js';
import { IntroManager } from './intro.js';

// 添加调试日志
console.log('CSS测试: 检查样式表是否正确加载');
document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    console.log(`样式表: ${link.href} - 状态: ${link.sheet ? '已加载' : '未加载'}`);
});

/**
 * 应用类
 * 负责协调各个模块的工作
 */
class HistoryMapApp {
    /**
     * 构造函数
     */
    constructor() {
        // 应用数据
        this.data = {};
        this.isLoading = false;
        
        // 模块实例
        this.mapManager = new MapManager('map');
        this.timelineManager = new TimelineManager({
            minYear: -10000,
            maxYear: 2000,
            initialYear: 0
        });
        this.eventsManager = new EventsManager('events-list', 'event-details');
        this.introManager = new IntroManager();
        
        // 侧边栏状态
        this.sidebarCollapsed = false;
        
        // 绑定事件处理方法
        this.handleYearChanged = this.handleYearChanged.bind(this);
        this.handleEventSelected = this.handleEventSelected.bind(this);
        this.handleToggleEvents = this.handleToggleEvents.bind(this);
        this.handleToggleMigrations = this.handleToggleMigrations.bind(this);
        this.handleToggleTechnologies = this.handleToggleTechnologies.bind(this);
        this.handleToggleSpecies = this.handleToggleSpecies.bind(this);
        this.handleToggleWars = this.handleToggleWars.bind(this);
        this.handleToggleDiseases = this.handleToggleDiseases.bind(this);
        this.handleToggleAgriculture = this.handleToggleAgriculture.bind(this);
        this.handleViewEventDetails = this.handleViewEventDetails.bind(this);
        this.toggleSidebar = this.toggleSidebar.bind(this);
    }
    
    /**
     * 初始化应用
     */
    async initialize() {
        console.log('初始化历史地图可视化应用...');
        
        try {
            // 显示加载中
            this.showLoader();
            
            // 创建界面元素
            this.createUIElements();
            
            // 初始化模块
            this.mapManager.initialize();
            this.timelineManager.initialize();
            
            // 设置回调
            this.timelineManager.setYearChangedCallback(this.handleYearChanged);
            this.eventsManager.setEventSelectedCallback(this.handleEventSelected);
            
            // 添加控件监听器
            this.addEventListeners();
            
            // 初始化类别筛选
            this.initCategoryFilters();
            
            // 加载数据
            await this.loadData();
            
            // 隐藏加载中
            this.hideLoader();
            
            // 更新到初始年份
            const initialYear = this.timelineManager.getCurrentYear();
            await this.handleYearChanged(initialYear);
            
            console.log('应用初始化完成');
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.hideLoader();
            this.showError('应用初始化失败: ' + error.message);
        }
    }
    
    /**
     * 创建UI元素
     */
    createUIElements() {
        // 创建错误提示框
        this.createErrorBox();
        
        // 创建加载指示器
        this.createLoadingIndicator();
    }
    
    /**
     * 创建错误提示框
     */
    createErrorBox() {
        if (!document.getElementById('error-box')) {
            const errorBox = document.createElement('div');
            errorBox.id = 'error-box';
            errorBox.classList.add('error-box');
            errorBox.style.display = 'none';
            document.body.appendChild(errorBox);
        }
    }
    
    /**
     * 创建加载指示器
     */
    createLoadingIndicator() {
        if (!document.getElementById('app-loader')) {
            const loader = document.createElement('div');
            loader.id = 'app-loader';
            loader.classList.add('loader');
            loader.innerHTML = `
                <div class="loader-spinner"></div>
                <div class="loader-text">加载应用中...</div>
            `;
            loader.style.display = 'none';
            document.body.appendChild(loader);
        }
        
        if (!document.getElementById('map-loader')) {
            const mapLoader = document.createElement('div');
            mapLoader.id = 'map-loader';
            mapLoader.classList.add('map-loader');
            mapLoader.innerHTML = `
                <div class="loader-spinner"></div>
                <div class="loader-text">加载地图中...</div>
            `;
            mapLoader.style.display = 'none';
            
            const mapContainer = document.getElementById('map');
            if (mapContainer) {
                mapContainer.appendChild(mapLoader);
            }
        }
    }
    
    /**
     * 添加事件监听器
     */
    addEventListeners() {
        // 切换事件显示按钮
        const toggleEventsBtn = document.getElementById('toggle-events');
        if (toggleEventsBtn) {
            toggleEventsBtn.addEventListener('click', this.handleToggleEvents);
        }
        
        // 切换迁徙路线按钮
        const toggleMigrationsBtn = document.getElementById('toggle-migrations');
        if (toggleMigrationsBtn) {
            toggleMigrationsBtn.addEventListener('click', this.handleToggleMigrations);
        }
        
        // 切换技术发展按钮
        const toggleTechnologiesBtn = document.getElementById('toggle-technologies');
        if (toggleTechnologiesBtn) {
            toggleTechnologiesBtn.addEventListener('click', this.handleToggleTechnologies);
        }
        
        // 切换物种按钮
        const toggleSpeciesBtn = document.getElementById('toggle-species');
        if (toggleSpeciesBtn) {
            toggleSpeciesBtn.addEventListener('click', this.handleToggleSpecies);
        }
        
        // 切换战争按钮
        const toggleWarsBtn = document.getElementById('toggle-wars');
        if (toggleWarsBtn) {
            toggleWarsBtn.addEventListener('click', this.handleToggleWars);
        }
        
        // 切换疾病按钮
        const toggleDiseasesBtn = document.getElementById('toggle-diseases');
        if (toggleDiseasesBtn) {
            toggleDiseasesBtn.addEventListener('click', this.handleToggleDiseases);
        }
        
        // 切换农业按钮
        const toggleAgricultureBtn = document.getElementById('toggle-agriculture');
        if (toggleAgricultureBtn) {
            toggleAgricultureBtn.addEventListener('click', this.handleToggleAgriculture);
        }
        
        // 帮助按钮
        const helpButton = document.getElementById('help-button');
        if (helpButton) {
            helpButton.addEventListener('click', () => {
                if (this.introManager) {
                    this.introManager.showIntro();
                }
            });
        }
        
        // 监听地图事件详情查看
        document.addEventListener('viewEventDetails', (e) => {
            if (e.detail) {
                // 支持同时使用eventId或id
                const eventId = e.detail.eventId || e.detail.id;
                if (eventId) {
                    this.handleViewEventDetails(eventId);
                }
            }
        });
        
        // 侧边栏切换按钮
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', this.toggleSidebar);
        }
    }
    
    /**
     * 切换侧边栏状态
     */
    toggleSidebar() {
        const sidebar = document.getElementById('events-list');
        const toggleButton = document.getElementById('sidebar-toggle');
        
        if (sidebar) {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            
            if (this.sidebarCollapsed) {
                sidebar.classList.add('collapsed');
                if (toggleButton) {
                    toggleButton.querySelector('i').textContent = 'chevron_right';
                }
            } else {
                sidebar.classList.remove('collapsed');
                if (toggleButton) {
                    toggleButton.querySelector('i').textContent = 'chevron_left';
                }
            }
            
            // 通知地图调整大小
            if (this.mapManager && this.mapManager.map) {
                setTimeout(() => {
                    this.mapManager.map.invalidateSize();
                }, 300);
            }
        }
    }
    
    /**
     * 加载数据
     */
    async loadData() {
        try {
            console.log('开始加载应用数据...');
            this.isLoading = true;
            
            // 加载所有数据
            this.data = await loadAllData();
            
            // 初始化事件管理器
            this.eventsManager.updateEventsList(this.data.allEvents, this.timelineManager.getCurrentYear());
            
            // 验证数据是否正确加载
            console.log('数据加载状态：', {
                '历史事件': this.data.allEvents?.length || 0,
                '迁徙路线': this.data.migrations?.length || 0,
                '技术发展': this.data.technologies?.length || 0,
                '物种': this.data.species?.length || 0,
                '文明': this.data.civilizations?.length || 0,
                '战争': this.data.wars?.length || 0,
                '疾病': this.data.diseases?.length || 0,
                '农业': this.data.agriculture?.length || 0
            });
            
            this.isLoading = false;
            console.log('应用数据加载完成');
        } catch (error) {
            this.isLoading = false;
            console.error('加载数据失败:', error);
            throw error;
        }
    }
    
    /**
     * 切换时间轴播放状态
     */
    togglePlay() {
        try {
            if (this.timelineManager.isPlaying) {
                console.log('暂停播放时间轴');
                this.timelineManager.stopPlayback();
            } else {
                console.log('开始播放时间轴');
                this.timelineManager.startPlayback();
            }
        } catch (error) {
            console.error('切换播放状态时出错:', error);
        }
    }
    
    /**
     * 处理年份变化事件
     * @param {number} year - 新的年份
     */
    async handleYearChanged(year) {
        console.log(`年份变化: ${year}`);
        
        try {
            // 更新地图
            await this.mapManager.updateToYear(year, this.data);
            
            // 更新事件列表
            this.eventsManager.updateEventsList(this.data.allEvents, year);
        } catch (error) {
            console.error('处理年份变化时出错:', error);
        }
    }
    
    /**
     * 处理事件选择
     * @param {string} eventId - 被选中的事件ID
     */
    handleEventSelected(eventId) {
        // 在地图上高亮显示选中的事件
        this.mapManager.highlightEvent(eventId);
    }
    
    /**
     * 处理查看事件详情
     * @param {string} eventId - 事件ID
     */
    handleViewEventDetails(eventId) {
        console.log(`查看事件详情: ${eventId}`);
        
        // 找到对应的事件
        const event = this.data.allEvents.find(e => e.id === eventId);
        if (!event) {
            console.warn(`未找到ID为 ${eventId} 的事件`);
            return;
        }
        
        // 在左侧事件列表中显示详情
        this.eventsManager.showEventDetails(event);
        
        // 在地图上高亮显示该事件
        this.mapManager.highlightEvent(eventId);
        
        // 确保侧边栏是打开的
        if (this.sidebarCollapsed) {
            this.toggleSidebar();
        }
    }
    
    /**
     * 处理切换事件显示
     * @param {Event} e - 事件对象
     */
    handleToggleEvents(e) {
        const showEvents = !e.currentTarget.classList.contains('active');
        this.mapManager.toggleEvents(showEvents);
        
        if (e.currentTarget) {
            e.currentTarget.classList.toggle('active', showEvents);
        }
    }
    
    /**
     * 处理切换迁徙路线显示
     * @param {Event} e - 事件对象
     */
    handleToggleMigrations(e) {
        const showMigrations = !e.currentTarget.classList.contains('active');
        this.mapManager.toggleMigrations(showMigrations);
        
        if (e.currentTarget) {
            e.currentTarget.classList.toggle('active', showMigrations);
        }
    }
    
    /**
     * 处理切换技术发展显示
     * @param {Event} e - 事件对象
     */
    handleToggleTechnologies(e) {
        const showTechnologies = !e.currentTarget.classList.contains('active');
        this.mapManager.toggleTechnologies(showTechnologies);
        
        if (e.currentTarget) {
            e.currentTarget.classList.toggle('active', showTechnologies);
        }
    }
    
    /**
     * 处理切换物种显示
     * @param {Event} e - 事件对象
     */
    handleToggleSpecies(e) {
        const showSpecies = !e.currentTarget.classList.contains('active');
        this.mapManager.toggleSpecies(showSpecies);
        
        if (e.currentTarget) {
            e.currentTarget.classList.toggle('active', showSpecies);
        }
    }
    
    /**
     * 处理切换战争显示
     * @param {Event} e - 事件对象
     */
    handleToggleWars(e) {
        const showWars = !e.currentTarget.classList.contains('active');
        this.mapManager.toggleWars(showWars);
        
        if (e.currentTarget) {
            e.currentTarget.classList.toggle('active', showWars);
        }
    }
    
    /**
     * 处理切换疾病显示
     * @param {Event} e - 事件对象
     */
    handleToggleDiseases(e) {
        const showDiseases = !e.currentTarget.classList.contains('active');
        this.mapManager.toggleDiseases(showDiseases);
        
        if (e.currentTarget) {
            e.currentTarget.classList.toggle('active', showDiseases);
        }
    }
    
    /**
     * 处理切换农业显示
     * @param {Event} e - 事件对象
     */
    handleToggleAgriculture(e) {
        const showAgriculture = !e.currentTarget.classList.contains('active');
        this.mapManager.toggleAgriculture(showAgriculture);
        
        if (e.currentTarget) {
            e.currentTarget.classList.toggle('active', showAgriculture);
        }
    }
    
    /**
     * 显示加载中指示器
     */
    showLoader() {
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.style.display = 'flex';
        }
    }
    
    /**
     * 隐藏加载中指示器
     */
    hideLoader() {
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }
    
    /**
     * 显示错误信息
     * @param {string} message - 错误信息
     */
    showError(message) {
        const errorBox = document.getElementById('error-box');
        if (errorBox) {
            errorBox.textContent = message;
            errorBox.style.display = 'block';
            
            // 5秒后自动隐藏
            setTimeout(() => {
                errorBox.style.display = 'none';
            }, 5000);
        }
    }
    
    /**
     * 初始化类别筛选
     */
    initCategoryFilters() {
        // 获取所有类别筛选按钮
        const categoryButtons = document.querySelectorAll('.category-btn');
        if (categoryButtons) {
            categoryButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const category = button.getAttribute('data-category');
                    console.log(`筛选类别: ${category}`);
                    
                    // 更新事件列表
                    this.eventsManager.setCategory(category);
                    
                    // 更新地图标记
                    this.mapManager.setFilterCategory(category);
                    
                    // 重新加载当前年份的全部数据，确保筛选正确应用
                    const currentYear = this.timelineManager.getCurrentYear();
                    // 更新事件列表
                    this.eventsManager.updateEventsList(this.data.allEvents, currentYear);
                    // 重新更新地图内容
                    this.mapManager.updateToYear(currentYear, this.data);
                    
                    // 更新按钮样式
                    categoryButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                });
            });
        }
    }
}

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 主题切换功能
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', function() {
            const icon = themeToggleBtn.querySelector('i');
            const isDark = !document.body.classList.contains('dark');
            
            if (document.body.classList.contains('dark')) {
                // 切换到亮色主题
                document.body.classList.remove('dark');
                icon.textContent = 'dark_mode';
                localStorage.setItem('theme', 'light');
            } else {
                // 切换到暗色主题
                document.body.classList.add('dark');
                icon.textContent = 'light_mode';
                localStorage.setItem('theme', 'dark');
            }
            
            // 触发主题变更事件
            document.dispatchEvent(new CustomEvent('themeChanged', {
                detail: { isDark: isDark }
            }));
        });

        // 检查用户的主题偏好
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.body.classList.add('dark');
            themeToggleBtn.querySelector('i').textContent = 'light_mode';
        }
    }

    // 创建并初始化应用
    window.historyMapApp = new HistoryMapApp();
    window.historyMapApp.initialize();
}); 