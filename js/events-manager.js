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
        
        console.log('更新事件列表，事件数量:', events ? events.length : 0);
        
        // 清空事件列表
        if (this.eventsListElement) {
            this.eventsListElement.innerHTML = '';
            
            // 添加折叠按钮
            const toggleBtn = document.createElement('div');
            toggleBtn.id = 'sidebar-toggle';
            toggleBtn.className = 'sidebar-toggle';
            toggleBtn.innerHTML = `<i class="material-icons-round">chevron_left</i>`;
            this.eventsListElement.appendChild(toggleBtn);
            
        } else {
            console.warn('事件列表元素不存在');
            return;
        }
        
        // 获取与当前类别相关的事件
        const relevantEvents = this.filterEvents(events, year);
        console.log('过滤后的相关事件数量:', relevantEvents.length);
        
        // 显示年份范围
        this.updateYearRangeDisplay(year);
        
        // 添加事件列表标题
        const listHeader = document.createElement('div');
        listHeader.className = 'events-list-header';
        listHeader.innerHTML = `
            <h2 class="text-lg font-semibold text-gray-900">历史事件</h2>
            <p class="text-sm text-gray-500">当前年份: ${year < 0 ? `公元前 ${Math.abs(year)}` : `公元 ${year}`} 年</p>
        `;
        this.eventsListElement.appendChild(listHeader);
        
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
        
        // 限制显示的事件数量，每个类别最多显示5个，总共不超过30个
        const MAX_EVENTS_PER_CATEGORY = 5;
        const MAX_TOTAL_EVENTS = 30;
        let totalEventsAdded = 0;
        
        relevantEvents.forEach(event => {
            if (totalEventsAdded >= MAX_TOTAL_EVENTS) return;
            
            const category = event.category || '其他';
            if (categories[category] && categories[category].length < MAX_EVENTS_PER_CATEGORY) {
                categories[category].push(event);
                totalEventsAdded++;
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
            console.log('已添加事件列表到DOM');
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
     * 过滤事件列表
     * @param {Array} events - 事件数组
     * @param {number} year - 当前年份
     * @returns {Array} 过滤后的事件数组
     */
    filterEvents(events, year) {
        if (!events || !Array.isArray(events)) {
            console.warn('过滤事件: 无效的事件数组');
            return [];
        }
        
        console.log(`过滤事件: 年份=${year}, 类别=${this.currentCategory}, 重要性=${this.currentImportance}, 事件总数=${events.length}`);
        
        // 计算事件与当前年份的相关性并排序
        return events
            .map(event => {
                // 确保数据的一致性
                const startYear = event.startYear !== undefined ? event.startYear : event.year;
                const endYear = event.endYear !== undefined ? event.endYear : startYear;
                
                // 计算事件与当前年份的距离
                let distance = Infinity;
                
                // 如果事件在当前年份范围内，距离为0
                if (year >= startYear && year <= endYear) {
                    distance = 0;
                } else {
                    // 否则计算距离最近时间点的距离
                    distance = Math.min(
                        Math.abs(startYear - year),
                        Math.abs(endYear - year)
                    );
                }
                
                // 根据距离计算相关性
                let relevance = 1.0;
                if (distance > 0) {
                    // 根据时代调整相关性计算的时间尺度
                    // 远古时代使用更大的时间尺度
                    let timeScale = 100; // 默认为100年
                    
                    if (Math.abs(year) > 5000) {
                        timeScale = 1000; // 史前时代 >5000年前
                    } else if (Math.abs(year) > 2000) {
                        timeScale = 500;  // 古代 >2000年前
                    } else if (Math.abs(year) > 500) {
                        timeScale = 200;  // 中世纪 >500年前
                    }
                    
                    // 计算相关性，随距离增加而线性减少
                    relevance = Math.max(0, 1 - (distance / timeScale));
                    
                    // 提升重要事件的相关性
                    const importance = event.importance || 3;
                    if (importance >= 4) {
                        relevance = Math.min(1, relevance * 1.5); // 提升50%
                    }
                }
                
                return {
                    ...event,
                    relevance,
                    distance
                };
            })
            .filter(event => {
                // 根据相关性过滤 - 降低阈值使更多事件显示
                if (event.relevance < 0.05) return false;
                
                // 根据类别过滤
                if (this.currentCategory !== 'all' && event.category !== this.currentCategory) {
                    return false;
                }
                
                // 根据重要性过滤
                if (this.currentImportance !== 'all') {
                    const minImportance = parseInt(this.currentImportance);
                    if (event.importance < minImportance) {
                        return false;
                    }
                }
                
                return true;
            })
            .sort((a, b) => {
                // 首先按相关性降序排列
                const relevanceDiff = b.relevance - a.relevance;
                if (Math.abs(relevanceDiff) > 0.2) {
                    return relevanceDiff;
                }
                
                // 如果相关性接近，按重要性排序
                const importanceA = a.importance || 3;
                const importanceB = b.importance || 3;
                return importanceB - importanceA;
            });
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