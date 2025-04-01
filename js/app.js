/**
 * 《枪炮、病毒与钢铁》历史地图可视化 - 主应用模块
 * 整合所有功能模块，并初始化应用
 */

import { loadAllData, getEventsForYear, getMigrationsForYear } from './data-loader.js';
import { TimelineManager } from './timeline-manager.js';
import { IntroManager } from './intro.js';
import { MapCore } from './map-core.js';
import { MapUtils } from './map-utils.js';

// 添加调试日志
console.log('CSS测试: 检查样式表是否正确加载');
document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    console.log(`样式表: ${link.href} - 状态: ${link.sheet ? '已加载' : '未加载'}`);
});

/**
 * 应用类
 * 负责协调各个模块的工作
 */
export class App {
    /**
     * 创建世界历史可视化应用实例
     * @param {Object} options - 配置选项
     * @param {string} options.mapContainer - 地图容器ID
     * @param {string} options.timelineContainer - 时间轴容器ID
     * @param {string} options.eventsListElement - 事件列表容器ID
     * @param {string} options.loaderElement - 加载指示器元素ID
     * @param {string} options.errorElement - 错误信息容器ID
     */
    constructor(options = {}) {
        console.log('初始化世界历史可视化应用...');
        
        // 保存元素引用
        this.mapContainer = options.mapContainer || 'map';
        this.timelineContainer = options.timelineContainer || 'timeline-container';
        this.eventsListElement = options.eventsListElement || 'events-list';
        this.loaderElement = options.loaderElement || 'app-loader';
        this.errorElement = options.errorElement || 'error-box';
        
        // 初始化数据和状态
        this.isLoading = false;
        this.isInitialized = false;
        this.allHistoricalEvents = [];
        this.allMigrations = [];
        this.allTechnologies = [];
        this.allSpecies = [];
        this.allCivilizations = [];
        this.allWars = [];
        this.allDiseases = [];
        this.allAgriculture = [];
        
        // 创建地图管理器
        this.mapCore = null;
        this.utils = new MapUtils();
        this.currentYear = -10000;
        this.isPlaying = false;
        this.playbackSpeed = 100; // 年/秒
        this.lastUpdateTime = 0;
        
        // 创建时间轴管理器
        this.timelineManager = new TimelineManager({
            sliderId: 'year-slider',
            inputId: 'year-input',
            minYear: -12000,  // 公元前12000年
            maxYear: 2023,    // 当前年份
            initialYear: 1    // 默认从公元1年开始
        });
        
        // 模块实例
        this.introManager = new IntroManager();
        
        // 侧边栏状态
        this.sidebarCollapsed = false;
        
        // 绑定事件处理方法
        this.handleYearChange = this.handleYearChange.bind(this);
        this.handleYearChanged = this.handleYearChanged.bind(this);
        this.handleViewEventDetails = this.handleViewEventDetails.bind(this);
        this.toggleSidebar = this.toggleSidebar.bind(this);
        this.handleViewToggle = this.handleViewToggle.bind(this);
        this.handleLayerToggle = this.handleLayerToggle.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        
        console.log('应用组件初始化完成');
    }
    
    /**
     * 初始化应用
     */
    async initialize() {
        console.log('初始化应用...');
        
        if (this.isInitialized) {
            console.warn('应用已经初始化，跳过');
            return;
        }
        
        try {
            // 创建UI元素
            console.log('创建UI元素...');
            this.createUIElements();
            
            // 初始化地图
            console.log('开始初始化地图...');
            await this.initializeMap();
            console.log('地图初始化完成');
            
            // 确认地图实例已创建
            if (!this.mapCore || !this.mapCore.map) {
                throw new Error('地图实例未正确创建');
            }
            
            // 初始化时间轴
            console.log('开始初始化时间轴...');
            this.timelineManager.initialize(this.mapCore); // 传入地图实例
            console.log('时间轴初始化完成');
            
            // 设置年份变化回调
            console.log('设置年份变化回调...');
            this.timelineManager.setYearChangeCallback(this.handleYearChange.bind(this));
            
            // 加载数据
            console.log('开始加载数据...');
            await this.loadInitialData();
            console.log('数据加载完成');
            
            // 确认数据已加载
            if (!this.data || !this.data.allEvents) {
                console.warn('数据可能未完全加载，但将继续初始化');
            }
            
            // 设置事件监听器
            console.log('设置事件监听器');
            this.setupEventListeners();
            
            // 初始化分类筛选功能 - 现在由MapEvents处理
            this.initCategoryFilters();
            
            // 标记初始化完成
            this.isInitialized = true;
            
            // 设置初始年份
            console.log('设置初始年份...');
            const initialYear = this.timelineManager.getCurrentYear();
            console.log(`初始年份为: ${initialYear}`);
            await this.updateYear(initialYear);
            
            // 确保全局应用对象存在
            if (!window.historyMapApp) {
                window.historyMapApp = {};
            }
            
            // 注册事件管理器到全局对象，确保按钮可以访问
            if (this.mapCore && this.mapCore.mapEvents) {
                window.historyMapApp.eventManager = this.mapCore.mapEvents;
                console.log('事件管理器已全局注册: window.historyMapApp.eventManager');
            }
        } catch (error) {
            console.error('初始化应用时出错:', error);
            console.error('错误堆栈:', error.stack);
            this.hideLoader();
            this.showError('初始化应用失败: ' + error.message);
            throw error; // 重新抛出错误，允许main.js捕获
        }

        // 确保全局应用对象存在
        if (!window.historyMapApp) {
            window.historyMapApp = {};
        }

        // 添加focusOnEvent方法，用于聚焦到特定事件
        if (!window.historyMapApp.focusOnEvent) {
            window.historyMapApp.focusOnEvent = function(eventId) {
                // 如果事件管理器可用，调用其方法
                if (window.historyMapApp.eventManager) {
                    window.historyMapApp.eventManager.highlightEvent(eventId);
                } else {
                    console.warn('事件管理器不可用，无法聚焦事件');
                }
            };
        }

        // 添加showEventDetails方法，用于显示事件详情
        if (!window.historyMapApp.showEventDetails) {
            window.historyMapApp.showEventDetails = function(eventId) {
                // 如果事件管理器可用，调用其方法
                if (window.historyMapApp.eventManager) {
                    window.historyMapApp.eventManager.showEventDetails(eventId);
                } else {
                    console.warn('事件管理器不可用，无法显示事件详情');
                }
            };
        }
    }
    
    /**
     * 初始化地图
     */
    async initializeMap() {
        try {
            console.log('创建地图核心实例...');
            this.mapCore = new MapCore({
                mapContainer: this.mapContainer,
                initialYear: this.currentYear
            });
            
            console.log('地图容器ID:', this.mapContainer);
            console.log('初始年份:', this.currentYear);
            
            // 确认地图容器存在
            const mapContainerElement = document.getElementById(this.mapContainer);
            if (!mapContainerElement) {
                throw new Error(`找不到地图容器元素，ID: ${this.mapContainer}`);
            }
            
            console.log('调用地图核心初始化方法...');
            await this.mapCore.initialize();
            console.log('地图核心初始化完成');
            
            // 确认地图实例已创建
            if (!this.mapCore.map) {
                throw new Error('Leaflet地图实例未创建');
            }
            
            console.log('地图初始化成功');
        } catch (error) {
            console.error('初始化地图时出错:', error);
            console.error('错误堆栈:', error.stack);
            throw error;
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
                    
                    // 更新按钮样式
                    categoryButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    
                    // 设置事件过滤类别 - 直接设置到MapCore的events实例
                    if (this.mapCore && this.mapCore.events) {
                        this.mapCore.events.setFilterCategory(category);
                        
                        // 重新加载当前年份的全部数据，确保筛选正确应用
                        const currentYear = this.timelineManager.getCurrentYear();
                        this.updateYear(currentYear);
                    }
                });
            });
        }
    }
    
    /**
     * 更新到指定年份
     * @param {number} year - 目标年份
     */
    async updateYear(year) {
        console.log(`开始更新到年份 ${year}`);
        
        try {
            // 确保有完整数据对象传给MapCore
            const dataToUpdate = {
                allEvents: this.eventsData || [],
                migrations: this.migrationsData || [],
                technologies: this.technologiesData || [],
                civilizations: this.civilizationsData || [],
                species: this.speciesData || [],
                wars: this.warsData || [],
                diseases: this.diseasesData || [],
                agriculture: this.agricultureData || []
            };
            
            console.log(`准备更新年份，迁移数据数量: ${dataToUpdate.migrations.length}条`);
            
            // 让MapCore统一管理事件显示和更新
            // MapCore内部会通过MapEvents管理所有事件，包括在地图上显示和在侧边栏显示
            await this.mapCore.updateToYear(year, dataToUpdate);
        } catch (error) {
            console.error(`处理年份变化时出错: ${error}`);
            this.showError(`无法加载年份 ${year} 的数据`);
        }
    }
    
    /**
     * 加载初始数据
     */
    async loadInitialData() {
        console.log('正在加载初始数据...');
        
        try {
            // 加载数据，但不显示加载指示器
            await this.loadData();
            
            // 设置初始年份
            const initialYear = this.timelineManager.getCurrentYear();
            console.log(`设置初始年份: ${initialYear}`);
            
            // 添加调试日志，查看迁移数据
            console.log(`初始化时迁移数据数量: ${this.migrationsData ? this.migrationsData.length : 0}条`);
            
            // 准备数据对象
            const dataToUpdate = {
                allEvents: this.eventsData || [],
                migrations: this.migrationsData || [],
                technologies: this.technologiesData || [],
                civilizations: this.civilizationsData || [],
                species: this.speciesData || [],
                wars: this.warsData || [],
                diseases: this.diseasesData || [],
                agriculture: this.agricultureData || []
            };
            
            // 直接调用一次updateToYear，而不是等待handleYearChange
            await this.mapCore.updateToYear(initialYear, dataToUpdate);
            
            // 隐藏加载指示器
            this.hideLoader();
            
            // 只在初始化完成后启动年份变化处理逻辑
            this.timelineManager.setYearChangeCallback((year) => this.handleYearChange(year));
            
            console.log('初始数据加载完成');
        } catch (error) {
            console.error('加载初始数据时出错:', error);
            this.hideLoader();
            this.showError('无法加载初始数据');
        }
    }
    
    /**
     * 初始化事件管理器
     */
    initEventsManager() {
        console.log('初始化事件管理器...');
        
        // 创建事件管理器实例
        this.eventsManager = new EventsManager('events-list', 'event-details');
        
        // 更新事件列表
        if (this.eventsData && this.eventsData.length > 0) {
            // 使用初始年份更新事件列表
            this.eventsManager.updateEventsList(this.eventsData, this.timelineManager.getCurrentYear());
        } else {
            console.warn('没有可显示的事件数据');
        }
        
        console.log('事件管理器初始化完成');
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        console.log('设置事件监听器');
        
        // 不在这里设置年份变化监听，而是在初始化完成后才添加
        // 这样可以避免初始加载过程中的重复刷新
        
        // 设置视图切换
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleViewToggle(e));
        });
        
        // 设置图层切换
        document.querySelectorAll('.layer-toggle').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleLayerToggle(e));
        });
        
        // 设置搜索功能
        const searchForm = document.querySelector('#search-form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        }
        
        // 不再设置侧边栏切换，改由main.js统一管理
        // const sidebarToggle = document.querySelector('#sidebar-toggle');
        // if (sidebarToggle) {
        //     sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        // }
        
        // 设置播放按钮
        const playButton = document.querySelector('#timeline-play');
        if (playButton) {
            playButton.addEventListener('click', () => this.togglePlayback());
        }
        
        // 其他事件监听器
        this.setupThemeToggle();
    }
    
    /**
     * 处理年份变化
     * @param {number} year - 新的年份值
     */
    async handleYearChange(year) {
        console.log(`年份变化: ${year}`);
        
        if (this.isLoading) {
            console.log('正在加载中，忽略年份变化');
            return;
        }
        
        try {
            this.isLoading = true;
            
            // 更新数据
            await this.updateYear(year);
            
            this.isLoading = false;
        } catch (error) {
            console.error('处理年份变化时出错:', error);
            this.isLoading = false;
            this.showError('更新年份失败: ' + error.message);
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
            errorBox.className = 'error-container hidden';
            errorBox.innerHTML = `
                <div class="error-box">
                    <h3>错误</h3>
                    <p id="error-message">发生了一个错误</p>
                    <button class="btn" onclick="this.parentNode.parentNode.classList.add('hidden')">确定</button>
                </div>
            `;
            document.body.appendChild(errorBox);
            this.errorElement = 'error-message';
        }
    }
    
    /**
     * 创建加载指示器
     */
    createLoadingIndicator() {
        if (!document.getElementById('app-loader')) {
            const loader = document.createElement('div');
            loader.id = 'app-loader';
            loader.className = 'loading-indicator hidden';
            loader.innerHTML = `
                <div class="spinner"></div>
                <p id="loading-text">正在加载...</p>
            `;
            document.body.appendChild(loader);
            this.loaderElement = 'app-loader';
        }
    }
    
    /**
     * 显示加载指示器
     * @param {string} message - 加载信息
     */
    showLoader(message = '正在加载...') {
        console.log('显示加载指示器:', message);
        this.isLoading = true;
        
        const loader = document.getElementById(this.loaderElement);
        if (loader) {
            const textElement = document.getElementById('loading-text');
            if (textElement) {
                textElement.textContent = message;
            }
            loader.classList.remove('hidden');
        }
    }
    
    /**
     * 隐藏加载指示器
     */
    hideLoader() {
        console.log('隐藏加载指示器');
        this.isLoading = false;
        
        const loader = document.getElementById(this.loaderElement);
        if (loader) {
            loader.classList.add('hidden');
        }
    }
    
    /**
     * 显示错误信息
     * @param {string} message - 错误信息
     */
    showError(message) {
        console.error('应用错误:', message);
        
        const errorContainer = document.getElementById('error-box');
        if (errorContainer) {
            const errorMessage = document.getElementById(this.errorElement);
            if (errorMessage) {
                errorMessage.textContent = message;
            }
            errorContainer.classList.remove('hidden');
        } else {
            // 如果没有找到错误元素，则使用alert
            alert('错误: ' + message);
        }
    }
    
    /**
     * 加载数据
     */
    async loadData() {
        console.log('开始加载数据...');
        
        try {
            // 导入数据加载模块
            const dataLoader = await import('./data-loader.js');
            
            // 加载所有数据
            this.data = await dataLoader.loadAllData();
            console.log('所有数据加载完成');
            
            // 设置各类数据的引用
            this.eventsData = this.data.allEvents || [];
            this.migrationsData = this.data.migrations || [];
            this.technologiesData = this.data.technologies || [];
            this.civilizationsData = this.data.civilizations || [];
            this.speciesData = this.data.species || [];
            this.warsData = this.data.wars || [];
            this.diseasesData = this.data.diseases || [];
            this.agricultureData = this.data.agriculture || [];
            
            // 打印加载的数据量
            // console.log(`加载了 ${this.eventsData.length} 个事件`);
            // console.log(`加载了 ${this.migrationsData.length} 条迁徙路线`);
            // console.log(`加载了 ${this.technologiesData.length} 项技术发展`);
            // console.log(`加载了 ${this.civilizationsData.length} 项文明数据`);
            // console.log(`加载了 ${this.speciesData.length} 项物种数据`);
            // console.log(`加载了 ${this.warsData.length} 项战争数据`);
            // console.log(`加载了 ${this.diseasesData.length} 项疾病数据`);
            // console.log(`加载了 ${this.agricultureData.length} 项农业数据`);
            
            return this.data;
        } catch (error) {
            console.error('加载数据时出错:', error);
            this.showError('加载数据失败: ' + error.message);
            throw error;
        }
    }
    
    /**
     * 切换时间轴播放状态
     */
    togglePlayback() {
        this.isPlaying = !this.isPlaying;
        
        if (this.isPlaying) {
            this.lastUpdateTime = Date.now();
            this.playButton.innerHTML = '<i class="material-icons-round">pause</i>';
            this.animate();
        } else {
            this.playButton.innerHTML = '<i class="material-icons-round">play_arrow</i>';
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
            await this.mapCore.updateToYear(year, this.data);
        } catch (error) {
            console.error('处理年份变化时出错:', error);
        }
    }
    
    /**
     * 处理查看事件详情
     * @param {string} eventId - 事件ID
     */
    handleViewEventDetails(eventId) {
        console.log(`查看事件详情: ${eventId}`);
        
        // 在地图上高亮显示该事件
        this.mapCore.highlightEvent(eventId);
    }
    
    /**
     * 切换侧边栏显示状态
     */
    toggleSidebar() {
        const sidebar = document.getElementById('events-list');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            console.log('侧边栏状态切换');
            
            // 更新地图尺寸，确保地图控件位置正确
            setTimeout(() => {
                this.mapCore.map.invalidateSize();
                // 触发resize事件，确保时间轴和其他组件也能重新调整
                window.dispatchEvent(new Event('resize'));
                
                // 通知时间轴容器需要更新宽度
                const timelineContainer = document.querySelector('.timeline-container');
                const timelineOverlay = document.querySelector('.timeline-overlay');
                if (timelineContainer) {
                    timelineContainer.style.transition = 'all 0.3s ease';
                    if (sidebar.classList.contains('collapsed')) {
                        timelineContainer.style.width = 'calc(100% - 40px)';
                        timelineContainer.style.left = '20px';
                        if (timelineOverlay) {
                            timelineOverlay.style.width = '100%';
                            timelineOverlay.style.left = '0';
                        }
                    } else {
                        timelineContainer.style.width = 'calc(100% - 340px)';
                        timelineContainer.style.left = 'auto';
                        if (timelineOverlay) {
                            timelineOverlay.style.width = 'calc(100% - 300px)';
                            timelineOverlay.style.left = 'auto';
                        }
                    }
                }
            }, 300); // 等待过渡动画完成
        }
    }
    
    /**
     * 处理视图切换
     * @param {Event} e - 事件对象
     */
    handleViewToggle(e) {
        if (!e || !e.currentTarget) return;
        
        console.log('切换视图');
        const viewType = e.currentTarget.getAttribute('data-view');
        
        if (!viewType) {
            console.warn('未指定视图类型');
            return;
        }
        
        console.log(`切换到视图: ${viewType}`);
        
        // 更新按钮状态
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
        
        // 更新地图视图
        if (this.mapCore) {
            this.mapCore.setView(viewType);
        }
    }
    
    /**
     * 处理图层切换
     * @param {Event} e - 事件对象
     */
    handleLayerToggle(e) {
        if (!e || !e.currentTarget) return;
        
        const layerType = e.currentTarget.getAttribute('data-layer');
        
        if (!layerType) {
            console.warn('未指定图层类型');
            return;
        }
        
        console.log(`切换图层: ${layerType}`);
        
        // 更新按钮状态
        e.currentTarget.classList.toggle('active');
        const isActive = e.currentTarget.classList.contains('active');
        
        // 更新地图图层
        if (this.mapCore) {
            this.mapCore.toggleLayer(layerType, isActive);
        }
    }
    
    /**
     * 处理搜索
     * @param {Event} e - 事件对象
     */
    handleSearch(e) {
        if (e) e.preventDefault();
        
        const searchInput = document.getElementById('search-input');
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            console.log('搜索词为空，忽略搜索请求');
            return;
        }
        
        console.log(`执行搜索: ${searchTerm}`);
        
        // 从所有历史事件中搜索
        const results = this.allHistoricalEvents.filter(event => {
            const title = event.title || '';
            const description = event.description || '';
            const location = event.location || '';
            
            // 简单的关键词匹配
            return title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   location.toLowerCase().includes(searchTerm.toLowerCase());
        });
        
        console.log(`搜索结果: 找到 ${results.length} 条匹配事件`);
        
        // 更新事件列表
        this.updateEventsList(results);
        
        // 在地图上标记结果
        if (this.mapCore) {
            this.mapCore.highlightSearchResults(results);
        }
    }

    animate() {
        if (!this.isPlaying) return;

        const now = Date.now();
        const deltaTime = now - this.lastUpdateTime;
        this.lastUpdateTime = now;

        const yearChange = Math.floor((deltaTime / 1000) * this.playbackSpeed);
        let newYear = this.currentYear + yearChange;

        // 检查是否到达终点
        if (newYear > 2023) {
            newYear = -10000;
        }

        this.updateYear(newYear);
        requestAnimationFrame(() => this.animate());
    }
    
    /**
     * 主题切换功能
     * 为了被main.js调用而提供
     */
    setupThemeToggle() {
        const themeToggleBtn = document.getElementById('theme-toggle');
        if (!themeToggleBtn) return;
        
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

    /**
     * 切换迁移路径显示
     * @param {boolean} visible - 是否显示
     */
    toggleMigrations(visible) {
        console.log(`${visible ? '显示' : '隐藏'}迁移路径`);
        if (this.mapCore && this.mapCore.migrations) {
            this.mapCore.migrations.toggleMigrations(visible);
        }
    }
} 