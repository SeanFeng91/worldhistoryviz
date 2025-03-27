/**
 * 《枪炮、病毒与钢铁》历史地图可视化 - 主应用模块
 * 整合所有功能模块，并初始化应用
 */

import { loadAllData, getEventsForYear, getMigrationsForYear } from './data-loader.js';
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
        this.mapManager = new MapManager({
            mapContainer: this.mapContainer,
            initialYear: 1  // 与时间轴初始年份保持一致
        });
        
        // 创建时间轴管理器
        this.timelineManager = new TimelineManager({
            container: this.timelineContainer,
            yearInput: 'year-input',
            yearSlider: 'year-slider',
            minYear: -12000,  // 公元前12000年
            maxYear: 2023,    // 当前年份
            initialYear: 1    // 默认从公元1年开始
        });
        
        // 模块实例
        this.eventsManager = new EventsManager('events-list', 'event-details');
        this.introManager = new IntroManager();
        
        // 侧边栏状态
        this.sidebarCollapsed = false;
        
        // 绑定事件处理方法
        this.handleYearChange = this.handleYearChange.bind(this);
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
            this.createUIElements();
            
            // 显示加载指示器
            this.showLoader();
            
            // 初始化地图
            console.log('初始化地图...');
            await this.mapManager.initialize();
            
            // 初始化时间轴
            console.log('初始化时间轴...');
            this.timelineManager.initialize();
            
            // 设置年份变化回调
            this.timelineManager.setYearChangeCallback(this.handleYearChange.bind(this));
            
            // 加载数据
            console.log('加载数据...');
            await this.loadData();
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 初始化事件管理器
            this.initializeEventsManager();
            
            // 标记初始化完成
            this.isInitialized = true;
            
            // 设置初始年份
            const initialYear = this.timelineManager.getCurrentYear();
            await this.updateToYear(initialYear);
            
            // 隐藏加载指示器
            this.hideLoader();
            
            console.log('应用初始化完成');
        } catch (error) {
            console.error('初始化应用时出错:', error);
            this.hideLoader();
            this.showError('初始化应用失败: ' + error.message);
        }
    }
    
    /**
     * 初始化事件管理器
     */
    initializeEventsManager() {
        console.log('初始化事件管理器...');
        
        // 创建事件管理器实例
        this.eventsManager = new EventsManager('events-list', 'event-details');
        
        // 设置事件选择回调
        this.eventsManager.setEventSelectedCallback((eventId) => {
            // 找到对应事件
            const event = this.data.allEvents.find(e => e.id === eventId);
            if (event) {
                // 在地图上高亮显示该事件
                this.mapManager.highlightEvent(event);
                // 显示详情
                this.showEventDetails(event);
            }
        });
        
        // 初始化类别筛选
        this.initCategoryFilters();
        
        console.log('事件管理器初始化完成');
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
    
    /**
     * 更新到指定年份
     * @param {number} year - 目标年份
     */
    async updateToYear(year) {
        console.log(`开始更新到年份 ${year}`);
        
        try {
            // 提取与当前年份相关的事件
            const relevantEvents = getEventsForYear(this.eventsData, year);
            console.log(`找到 ${relevantEvents.length} 个与年份 ${year} 相关的事件`);
            
            // 提取与当前年份相关的迁徙路线
            const activeMigrations = getMigrationsForYear(this.migrationsData, year);
            console.log(`找到 ${activeMigrations.length} 条与年份 ${year} 相关的迁徙路线`);
            
            // 准备传递给地图管理器的数据
            const mapData = {
                allEvents: relevantEvents,
                events: relevantEvents,  // 兼容旧版本
                migrations: activeMigrations,
                technologies: this.technologiesData,
                species: this.speciesData,
                civilizations: this.civilizationsData,
                wars: this.warsData,
                diseases: this.diseasesData,
                agriculture: this.agricultureData
            };
            
            // 更新地图
            await this.mapManager.updateToYear(year, mapData);
            
            // 更新事件列表
            if (this.eventsManager) {
                console.log('更新事件管理器的事件列表');
                this.eventsManager.updateEventsList(relevantEvents, year);
            }
            
            // 隐藏加载指示器
            this.hideLoader();
        } catch (error) {
            console.error(`处理年份变化时出错: ${error}`);
            this.hideLoader();
            this.showError(`无法加载年份 ${year} 的数据`);
        }
    }
    
    /**
     * 加载初始数据
     */
    async loadInitialData() {
        console.log('加载初始数据...');
        
        try {
            // 加载事件数据
            this.eventsData = await loadAllData();
            console.log(`加载了 ${this.eventsData.length} 个事件`);
            
            // 加载迁徙数据
            this.migrationsData = await getMigrationsForYear(this.timelineManager.getCurrentYear());
            console.log(`加载了 ${this.migrationsData.length} 条迁徙路线`);
            
            // 加载技术发展数据
            this.technologiesData = await getEventsForYear(this.timelineManager.getCurrentYear(), 'technology');
            console.log(`加载了 ${this.technologiesData.length} 个技术发展`);
            
            // 加载社会组织数据
            this.civilizationsData = await getEventsForYear(this.timelineManager.getCurrentYear(), 'civilization');
            console.log(`加载了 ${this.civilizationsData.length} 个文明/社会组织`);
            
            // 加载物种数据
            this.speciesData = await getEventsForYear(this.timelineManager.getCurrentYear(), 'species');
            console.log(`加载了 ${this.speciesData.length} 个物种记录`);
            
            // 加载战争数据
            this.warsData = await getEventsForYear(this.timelineManager.getCurrentYear(), 'war');
            console.log(`加载了 ${this.warsData.length} 个战争记录`);
            
            // 加载疾病数据
            this.diseasesData = await getEventsForYear(this.timelineManager.getCurrentYear(), 'disease');
            console.log(`加载了 ${this.diseasesData.length} 个疾病记录`);
            
            // 初始化事件管理器
            this.initEventsManager();
        } catch (error) {
            console.error('加载初始数据时出错:', error);
            throw error;
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
        console.log('设置事件监听器...');
        
        // 设置年份变化回调
        this.timelineManager.setYearChangeCallback(this.handleYearChange.bind(this));
        
        // 事件查看详情按钮
        document.querySelectorAll('.view-event-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.currentTarget.dataset.eventId;
                this.handleViewEventDetails(eventId);
            });
        });
        
        // 设置侧边栏折叠功能
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', this.toggleSidebar.bind(this));
        }
        
        // 监听地图图层控制按钮
        const layerControls = {
            'toggle-events': this.handleToggleEvents.bind(this),
            'toggle-migrations': this.handleToggleMigrations.bind(this),
            'toggle-technologies': this.handleToggleTechnologies.bind(this),
            'toggle-species': this.handleToggleSpecies.bind(this),
            'toggle-wars': this.handleToggleWars.bind(this),
            'toggle-diseases': this.handleToggleDiseases.bind(this),
            'toggle-agriculture': this.handleToggleAgriculture.bind(this)
        };
        
        Object.keys(layerControls).forEach(controlId => {
            const controlButton = document.getElementById(controlId);
            if (controlButton) {
                controlButton.addEventListener('click', layerControls[controlId]);
                
                // 确保按钮状态与地图图层状态一致
                const layerName = controlId.replace('toggle-', '');
                const isActive = this.mapManager[`show${layerName.charAt(0).toUpperCase() + layerName.slice(1)}`];
                controlButton.classList.toggle('active', isActive);
            }
        });
        
        console.log('事件监听器设置完成');
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
            this.showLoader('更新年份...');
            this.isLoading = true;
            
            // 更新数据
            await this.updateToYear(year);
            
            this.hideLoader();
            this.isLoading = false;
        } catch (error) {
            console.error('处理年份变化时出错:', error);
            this.hideLoader();
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
            console.log(`加载了 ${this.eventsData.length} 个事件`);
            console.log(`加载了 ${this.migrationsData.length} 条迁徙路线`);
            console.log(`加载了 ${this.technologiesData.length} 项技术发展`);
            console.log(`加载了 ${this.civilizationsData.length} 项文明数据`);
            console.log(`加载了 ${this.speciesData.length} 项物种数据`);
            console.log(`加载了 ${this.warsData.length} 项战争数据`);
            console.log(`加载了 ${this.diseasesData.length} 项疾病数据`);
            console.log(`加载了 ${this.agricultureData.length} 项农业数据`);
            
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
     * 处理事件标记的显示/隐藏
     */
    handleToggleEvents() {
        const toggleButton = document.getElementById('toggle-events');
        if (toggleButton) {
            toggleButton.classList.toggle('active');
            const isActive = toggleButton.classList.contains('active');
            
            // 更新地图
            this.mapManager.toggleEvents(isActive);
            
            console.log(`事件显示状态: ${isActive ? '显示' : '隐藏'}`);
        }
    }
    
    /**
     * 处理迁徙路线的显示/隐藏
     */
    handleToggleMigrations() {
        const toggleButton = document.getElementById('toggle-migrations');
        if (toggleButton) {
            toggleButton.classList.toggle('active');
            const isActive = toggleButton.classList.contains('active');
            
            // 更新地图
            this.mapManager.toggleMigrations(isActive);
            
            console.log(`迁徙路线显示状态: ${isActive ? '显示' : '隐藏'}`);
        }
    }
    
    /**
     * 处理技术发展的显示/隐藏
     */
    handleToggleTechnologies() {
        const toggleButton = document.getElementById('toggle-technologies');
        if (toggleButton) {
            toggleButton.classList.toggle('active');
            const isActive = toggleButton.classList.contains('active');
            
            // 更新地图
            this.mapManager.toggleTechnologies(isActive);
            
            console.log(`技术发展显示状态: ${isActive ? '显示' : '隐藏'}`);
        }
    }
    
    /**
     * 处理物种的显示/隐藏
     */
    handleToggleSpecies() {
        const toggleButton = document.getElementById('toggle-species');
        if (toggleButton) {
            toggleButton.classList.toggle('active');
            const isActive = toggleButton.classList.contains('active');
            
            // 更新地图
            this.mapManager.toggleSpecies(isActive);
            
            console.log(`物种显示状态: ${isActive ? '显示' : '隐藏'}`);
        }
    }
    
    /**
     * 处理战争的显示/隐藏
     */
    handleToggleWars() {
        const toggleButton = document.getElementById('toggle-wars');
        if (toggleButton) {
            toggleButton.classList.toggle('active');
            const isActive = toggleButton.classList.contains('active');
            
            // 更新地图
            this.mapManager.toggleWars(isActive);
            
            console.log(`战争显示状态: ${isActive ? '显示' : '隐藏'}`);
        }
    }
    
    /**
     * 处理疾病的显示/隐藏
     */
    handleToggleDiseases() {
        const toggleButton = document.getElementById('toggle-diseases');
        if (toggleButton) {
            toggleButton.classList.toggle('active');
            const isActive = toggleButton.classList.contains('active');
            
            // 更新地图
            this.mapManager.toggleDiseases(isActive);
            
            console.log(`疾病显示状态: ${isActive ? '显示' : '隐藏'}`);
        }
    }
    
    /**
     * 处理农业的显示/隐藏
     */
    handleToggleAgriculture() {
        const toggleButton = document.getElementById('toggle-agriculture');
        if (toggleButton) {
            toggleButton.classList.toggle('active');
            const isActive = toggleButton.classList.contains('active');
            
            // 更新地图
            this.mapManager.toggleAgriculture(isActive);
            
            console.log(`农业显示状态: ${isActive ? '显示' : '隐藏'}`);
        }
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
            this.mapManager.map.invalidateSize();
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
        if (this.mapManager) {
            this.mapManager.setView(viewType);
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
        if (this.mapManager) {
            this.mapManager.toggleLayer(layerType, isActive);
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
        if (this.mapManager) {
            this.mapManager.highlightSearchResults(results);
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