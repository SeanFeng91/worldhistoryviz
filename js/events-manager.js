/**
 * 事件管理器模块
 * 负责管理历史事件的显示和交互
 */

/**
 * 事件管理器类
 */
export class EventsManager {
    /**
     * 构造函数
     * @param {string} eventsListId - 事件列表容器ID
     * @param {string} eventDetailsId - 事件详情容器ID
     */
    constructor(eventsListId, eventDetailsId) {
        this.eventsListElement = document.getElementById(eventsListId);
        this.eventDetailsElement = document.getElementById(eventDetailsId);
        this.eventSelectedCallback = null;
        this.events = [];
        this.currentCategory = 'all';
        this.currentImportance = 'all';
        this.currentYear = 0;
        
        // 初始化过滤器
        this.initFilters();
    }
    
    /**
     * 初始化事件过滤器
     */
    initFilters() {
        // 类别过滤器
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                this.updateEventsList(this.events, this.currentYear);
            });
        }
        
        // 重要性过滤器
        const importanceFilter = document.getElementById('importance-filter');
        if (importanceFilter) {
            importanceFilter.addEventListener('change', (e) => {
                this.currentImportance = e.target.value;
                this.updateEventsList(this.events, this.currentYear);
            });
        }
        
        // 初始化类别按钮
        this.initCategoryButtons();
    }
    
    /**
     * 初始化类别按钮
     */
    initCategoryButtons() {
        const buttons = document.querySelectorAll('.category-btn');
        if (buttons) {
            buttons.forEach(button => {
                button.addEventListener('click', () => {
                    // 移除所有按钮的激活状态
                    buttons.forEach(btn => btn.classList.remove('active'));
                    
                    // 添加当前按钮的激活状态
                    button.classList.add('active');
                    
                    // 更新当前类别
                    this.currentCategory = button.dataset.category;
                    
                    // 更新事件列表
                    this.updateEventsList(this.events, this.currentYear);
                    
                    // 更新类别过滤器下拉框的值
                    const categoryFilter = document.getElementById('category-filter');
                    if (categoryFilter) {
                        categoryFilter.value = this.currentCategory;
                    }
                });
            });
        }
    }
    
    /**
     * 设置事件选择回调
     * @param {Function} callback - 回调函数
     */
    setEventSelectedCallback(callback) {
        this.eventSelectedCallback = callback;
    }
    
    /**
     * 设置当前类别过滤器
     * @param {string} category - 类别名称
     */
    setCategory(category) {
        this.currentCategory = category || 'all';
        console.log(`事件管理器: 设置类别过滤器为 ${this.currentCategory}`);
    }
    
    /**
     * 更新事件列表
     * @param {Array} events - 事件数组
     * @param {number} year - 当前年份
     */
    updateEventsList(events, year) {
        this.events = events || [];
        this.currentYear = year;
        
        // 清空事件列表
        if (this.eventsListElement) {
            this.eventsListElement.innerHTML = '';
        }
        
        // 获取与当前类别相关的事件
        const relevantEvents = this.filterEvents(events, year);
        
        // 显示年份范围
        this.updateYearRangeDisplay(year);
        
        // 如果没有相关事件，显示提示信息
        if (relevantEvents.length === 0) {
            this.showEventListHelp();
            return;
        }
        
        // 创建事件列表容器
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'events-container';
        
        // 对事件按类别分组
        const categories = {
            '农业': [],
            '技术': [],
            '文明': [],
            '战争': [],
            '疾病': [],
            '迁徙': [],
            '物种': [],
            '其他': []
        };
        
        relevantEvents.forEach(event => {
            const category = event.category || '其他';
            if (categories[category]) {
                categories[category].push(event);
            } else {
                categories['其他'].push(event);
            }
        });
        
        // 创建类别分组
        Object.keys(categories).forEach(category => {
            const events = categories[category];
            if (events.length === 0) return;
            
            // 创建类别标题
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header';
            categoryHeader.innerHTML = `
                <div class="category-title">
                    <i class="material-icons-round ${this.getCategoryIconClass(category)}">${this.getCategoryIcon(category)}</i>
                    <span>${category}</span>
                    <span class="category-count">(${events.length})</span>
                </div>
            `;
            eventsContainer.appendChild(categoryHeader);
            
            // 添加该类别的事件卡片
            events.forEach(event => {
                const eventCard = this.createEventCard(event);
                eventsContainer.appendChild(eventCard);
            });
        });
        
        // 添加到DOM
        if (this.eventsListElement) {
            this.eventsListElement.appendChild(eventsContainer);
        }
    }
    
    /**
     * 显示事件列表帮助信息
     */
    showEventListHelp() {
        if (!this.eventsListElement) return;
        
        const messageContainer = document.createElement('div');
        messageContainer.className = 'no-events';
        
        messageContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center h-40 text-center">
                <i class="material-icons-round text-gray-400 text-4xl mb-3">info_outline</i>
                <p class="text-gray-500">选择您感兴趣的事件类别</p>
                <p class="text-gray-400 text-sm mt-2">点击地图上的图标查看更多详情</p>
            </div>
        `;
        
        this.eventsListElement.appendChild(messageContainer);
    }
    
    /**
     * 筛选事件
     * @param {Array} events - 事件数组
     * @param {number} year - 年份
     * @returns {Array} 筛选后的事件数组
     */
    filterEvents(events, year) {
        if (!events || !Array.isArray(events)) return [];
        
        console.log(`筛选事件，类别: ${this.currentCategory}`);
        
        let filtered = events;
        
        // 按类别筛选
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(event => {
                if (!event.category) return false;
                return event.category === this.currentCategory;
            });
        }
        
        // 按时间区间筛选
        filtered = filtered.filter(event => {
            const startYear = event.startYear !== undefined ? event.startYear : event.year;
            const endYear = event.endYear || startYear;
            
            const range = 100; // 默认范围
            
            // 如果事件在当前年份的区间内
            if (year >= startYear && year <= endYear) {
                return true;
            }
            
            // 如果事件接近当前年份
            if (Math.abs(startYear - year) <= range || Math.abs(endYear - year) <= range) {
                return true;
            }
            
            // 根据重要性扩大范围
            if (event.importance && event.importance >= 4) {
                const importanceRange = event.importance * 100;
                return Math.abs(startYear - year) <= importanceRange || Math.abs(endYear - year) <= importanceRange;
            }
            
            return false;
        });
        
        // 按重要性排序
        filtered.sort((a, b) => {
            // 首先按重要性降序排序
            if (b.importance !== a.importance) {
                return b.importance - a.importance;
            }
            
            // 然后按年份排序
            const aYear = a.startYear !== undefined ? a.startYear : a.year;
            const bYear = b.startYear !== undefined ? b.startYear : b.year;
            
            if (aYear !== bYear) {
                return aYear - bYear;
            }
            
            // 最后按名称排序，处理title为undefined的情况
            const aTitle = a.title || '';
            const bTitle = b.title || '';
            return aTitle.localeCompare(bTitle);
        });
        
        return filtered;
    }
    
    /**
     * 更新年份范围显示
     * @param {number} year - 当前年份
     */
    updateYearRangeDisplay(year) {
        const yearDisplay = document.getElementById('current-year-display');
        if (yearDisplay) {
            const yearText = year < 0 ? `公元前 ${Math.abs(year)} 年` : `公元 ${year} 年`;
            yearDisplay.textContent = yearText;
        }
    }
    
    /**
     * 获取类别图标
     * @param {string} category - 类别名
     * @returns {string} 图标名
     */
    getCategoryIcon(category) {
        const icons = {
            '农业': 'eco',
            '技术': 'construction',
            '文明': 'account_balance',
            '战争': 'gavel',
            '疾病': 'coronavirus',
            '迁徙': 'transfer_within_a_station',
            '物种': 'pets',
            '其他': 'info'
        };
        
        return icons[category] || 'info';
    }
    
    /**
     * 获取类别图标的CSS类
     * @param {string} category - 类别名
     * @returns {string} CSS类
     */
    getCategoryIconClass(category) {
        const classes = {
            '农业': 'text-green-700',
            '技术': 'text-blue-700',
            '文明': 'text-yellow-700',
            '战争': 'text-red-700',
            '疾病': 'text-orange-700',
            '迁徙': 'text-purple-700',
            '物种': 'text-teal-700',
            '其他': 'text-gray-700'
        };
        
        return classes[category] || 'text-gray-700';
    }
    
    /**
     * 创建事件卡片
     * @param {Object} event - 事件对象
     * @returns {HTMLElement} 事件卡片元素
     */
    createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.dataset.eventId = event.id;
        
        // 确定年份显示
        const startYear = event.startYear !== undefined ? event.startYear : event.year;
        const endYear = event.endYear;
        
        let yearText = '';
        if (startYear < 0 && endYear < 0) {
            yearText = `前${Math.abs(startYear)}${endYear !== startYear ? ` - 前${Math.abs(endYear)}` : ''}`;
        } else if (startYear < 0 && endYear >= 0) {
            yearText = `前${Math.abs(startYear)} - ${endYear}`;
        } else {
            yearText = `${startYear}${endYear !== startYear ? ` - ${endYear}` : ''}`;
        }
        
        card.innerHTML = `
            <div class="event-time">${yearText}</div>
            <div class="event-content">
                <div class="event-title">${event.title || '未命名事件'}</div>
                <div class="event-description">${event.description || '无描述'}</div>
            </div>
        `;
        
        // 添加点击事件
        card.addEventListener('click', () => {
            this.handleEventClick(event);
        });
        
        return card;
    }
    
    /**
     * 处理事件卡片点击
     * @param {Object} event - 事件对象
     */
    handleEventClick(event) {
        console.log('事件点击:', event);
        
        // 显示事件详情
        this.showEventDetails(event);
        
        // 调用回调
        if (this.eventSelectedCallback) {
            this.eventSelectedCallback(event.id);
        }
    }
    
    /**
     * 显示事件详情
     * @param {Object} event - 事件对象
     */
    showEventDetails(event) {
        if (!this.eventDetailsElement) return;
        
        // 显示详情面板
        this.eventDetailsElement.classList.remove('hidden');
        
        // 清空内容
        this.eventDetailsElement.innerHTML = '';
        
        if (event) {
            // 确定年份显示
            const startYear = event.startYear !== undefined ? event.startYear : event.year;
            const endYear = event.endYear;
            
            let yearText = '';
            if (startYear < 0 && endYear < 0) {
                yearText = `公元前 ${Math.abs(startYear)} 年${endYear !== startYear ? ` - 公元前 ${Math.abs(endYear)} 年` : ''}`;
            } else if (startYear < 0 && endYear >= 0) {
                yearText = `公元前 ${Math.abs(startYear)} 年 - 公元 ${endYear} 年`;
            } else {
                yearText = `公元 ${startYear} 年${endYear !== startYear ? ` - 公元 ${endYear} 年` : ''}`;
            }
            
            // 创建详情内容
            const detailsContent = document.createElement('div');
            detailsContent.className = 'event-details-content';
            
            detailsContent.innerHTML = `
                <div class="event-details-header">
                    <h3 class="event-details-title">${event.title || '未命名事件'}</h3>
                    <button class="close-details-btn">
                        <i class="material-icons-round">close</i>
                    </button>
                </div>
                
                <div class="event-details-meta">
                    <div class="event-details-time">
                        <i class="material-icons-round">event</i>
                        <span>${yearText}</span>
                    </div>
                    <div class="event-details-category">
                        <i class="material-icons-round ${this.getCategoryIconClass(event.category)}">${this.getCategoryIcon(event.category)}</i>
                        <span>${event.category || '未分类'}</span>
                    </div>
                    <div class="event-details-location">
                        <i class="material-icons-round">place</i>
                        <span>${event.region || '未知地点'}</span>
                    </div>
                </div>
                
                <div class="event-details-description">
                    <h4>描述</h4>
                    <p>${event.description || '无描述'}</p>
                </div>
                
                ${event.impact ? `
                <div class="event-details-impact">
                    <h4>影响</h4>
                    <p>${event.impact}</p>
                </div>
                ` : ''}
                
                <div class="event-details-importance">
                    <h4>历史重要性</h4>
                    <div class="importance-stars">
                        ${Array(5).fill(0).map((_, i) => 
                            `<i class="material-icons-round ${i < event.importance ? 'text-yellow-500' : 'text-gray-300'}">star</i>`
                        ).join('')}
                    </div>
                </div>
            `;
            
            this.eventDetailsElement.appendChild(detailsContent);
            
            // 添加关闭按钮事件
            const closeBtn = detailsContent.querySelector('.close-details-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.eventDetailsElement.classList.add('hidden');
                });
            }
        }
        
        // 添加关闭按钮事件
        const closeBtn = document.getElementById('close-details');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.eventDetailsElement.classList.add('hidden');
            });
        }
    }
    
    /**
     * 高亮指定年份的事件
     * @param {number} year - 年份
     */
    highlightEventsForYear(year) {
        this.currentYear = year;
        this.updateEventsList(this.events, year);
    }
} 