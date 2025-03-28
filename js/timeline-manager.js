/**
 * 时间轴管理器模块
 * 负责管理时间轴和年份控制，以及处理时间轴区域内的所有事件
 */

/**
 * 时间轴管理器类
 */
export class TimelineManager {
    /**
     * 构造函数
     * @param {string|Object} options - 滑块ID或配置选项
     * @param {string} [yearInput] - 年份输入框ID
     * @param {number} [initialYear] - 初始年份
     */
    constructor(options, yearInput, initialYear) {
        // 检查参数类型,支持两种构造方式
        if (typeof options === 'string') {
            // 通过单独的参数构造
            this.yearSliderId = options;
            this.yearInputId = yearInput;
            this.minYear = -15000;
            this.maxYear = 2000;
            this.currentYear = initialYear || 1; // 使用公元1年作为默认初始年份,避免使用不存在的公元0年
        } else {
            // 通过选项对象构造
            options = options || {};
            this.yearSliderId = options.sliderId;
            this.yearInputId = options.inputId;
            this.minYear = options.minYear || -15000;
            this.maxYear = options.maxYear || 2000;
            this.currentYear = options.initialYear || 1; // 使用公元1年作为默认初始年份
        }
        
        // 设置时间轴容器ID
        this.container = 'timeline-container';
        
        this.isPlaying = false;
        this.playInterval = null;
        this.playSpeed = 50; // 默认每帧前进50年
        this.yearChangedCallback = null;
        
        // DOM元素
        this.yearSlider = null;
        this.yearDisplay = null;
        this.playBtn = null;
        this.timelineContainer = null;
        this.timelineOverlay = null;
        
        // 时间轴区域高度 - 用于处理事件
        this.timelineHeight = 140;
        
        // 时间段配置
        this.periods = [
            { start: -10000, end: -3000, name: "史前" },
            { start: -3000, end: -1000, name: "古代早期" },
            { start: -1000, end: 500, name: "古典时期" },
            { start: 500, end: 1400, name: "中世纪" },
            { start: 1400, end: 1700, name: "文艺复兴" },
            { start: 1700, end: 1900, name: "现代早期" },
            { start: 1900, end: 2000, name: "现代" }
        ];
        
        // 重要历史年份标记
        this.keyHistoricalYears = [
            { year: -3500, label: "苏美尔文明" },
            { year: -1345, label: "图坦卡蒙" },
            { year: -776, label: "奥运会起源" },
            { year: 1, label: "公元元年" },
            { year: 1492, label: "新大陆发现" },
            { year: 1776, label: "美国独立" },
            { year: 1945, label: "二战结束" },
            { year: 1969, label: "登月" }
        ];
    }
    
    /**
     * 初始化时间轴
     * @param {Object} mapInstance - 地图实例，用于协调时间轴区域和地图交互
     */
    initialize(mapInstance) {
        console.log('初始化时间轴...');
        
        // 保存地图实例引用
        this.mapInstance = mapInstance;
        
        // 创建时间轴容器（如果不存在）
        this.createTimelineContainer();
        
        // 获取时间轴容器
        const container = document.getElementById('timeline-container');
        if (!container) {
            console.error(`找不到时间轴容器: #timeline-container`);
            return;
        }
        
        // 检查滑块元素是否存在，如果不存在则创建
        let sliderElement = document.getElementById(this.yearSliderId);
        if (!sliderElement) {
            console.log('找不到时间轴滑块元素，正在创建...');
            // 创建滑块元素
            sliderElement = document.createElement('input');
            sliderElement.id = this.yearSliderId;
            sliderElement.type = 'range';
            sliderElement.min = this.minYear;
            sliderElement.max = this.maxYear;
            sliderElement.value = this.currentYear;
            sliderElement.className = 'timeline-slider';
            
            // 将滑块添加到容器
            container.appendChild(sliderElement);
        }
        
        // 获取DOM元素
        if (this.yearSliderId) {
            this.yearSlider = document.getElementById(this.yearSliderId);
        } else {
            this.yearSlider = document.getElementById('year-slider');
        }
        
        if (this.yearInputId) {
            this.yearInput = document.getElementById(this.yearInputId);
        }
        
        this.yearDisplay = document.getElementById('year-display');
        this.playBtn = document.getElementById('play-btn');
        
        if (!this.yearSlider) {
            console.error('无法找到时间轴滑块元素');
            return;
        }
        
        // 设置初始值
        this.yearSlider.min = this.minYear;
        this.yearSlider.max = this.maxYear;
        this.yearSlider.value = this.currentYear;
        
        // 如果存在年份输入框,设置其值
        if (this.yearInput) {
            this.yearInput.value = this.currentYear;
            
            // 监听年份输入框变化
            this.yearInput.addEventListener('change', (e) => {
                let year = parseInt(e.target.value);
                // 确保年份在有效范围内
                if (isNaN(year)) year = this.currentYear;
                if (year < this.minYear) year = this.minYear;
                if (year > this.maxYear) year = this.maxYear;
                
                this.updateToYear(year);
            });
        }
        
        // 更新年份显示
        this.updateYearDisplay();
        
        // 创建时间刻度
        this.createTimelineTicks();
        
        // 添加时期标记
        this.addPeriodMarkers();
        
        // 添加关键历史年份标记
        this.addKeyYearMarkers();
        
        // 设置滑块事件处理
        this.setupSliderEvents();
        
        // 添加控制按钮
        this.createControls();
        
        // 设置时间轴区域的事件处理
        this.setupTimelineAreaEvents();
        
        // 设置容器直接拖动功能
        this.setupContainerDragging();
        
        // 隐藏滑块按钮
        this.hideSliderThumb();
        
        // 调试输出
        console.log('时间轴元素状态:', {
            container: this.timelineContainer ? 'OK' : 'Missing',
            yearSlider: this.yearSlider ? 'OK' : 'Missing',
            yearDisplay: this.yearDisplay ? 'OK' : 'Missing',
            playBtn: this.playBtn ? 'OK' : 'Missing',
            overlay: this.timelineOverlay ? 'OK' : 'Missing'
        });
        
        console.log('时间轴初始化完成');
    }
    
    /**
     * 设置滑块事件处理
     */
    setupSliderEvents() {
        // 监听滑块输入事件
        this.yearSlider.addEventListener('input', (e) => {
            const year = parseInt(e.target.value);
            this.updateYearDisplay(year);
            // 阻止事件冒泡，但不阻止滑块的默认行为
            e.stopPropagation();
        }, { passive: true });
        
        // 监听滑块变化事件
        this.yearSlider.addEventListener('change', (e) => {
            const year = parseInt(e.target.value);
            this.updateToYear(year);
            // 阻止事件冒泡，但不阻止滑块的默认行为
            e.stopPropagation();
        }, { passive: true });
    }
    
    /**
     * 设置时间轴区域的事件处理
     * 这是集中处理所有时间轴区域事件的地方
     */
    setupTimelineAreaEvents() {
        // 如果没有时间轴容器或遮罩层，则无法设置事件
        if (!this.timelineContainer || !this.timelineOverlay) {
            console.error('无法设置时间轴区域事件：缺少容器或遮罩层');
            return;
        }
        
        // 标记是否正在时间轴区域内拖动
        let isDraggingInTimeline = false;
        
        // 检查元素是否是滑块或其子元素
        const isSliderElement = (element) => {
            if (!element) return false;
            
            // 检查是否是滑块元素
            if (element.id === 'year-slider') return true;
            
            // 检查是否是时间轴控件
            if (element.closest && element.closest('.timeline-slider-container')) return true;
            if (element.closest && element.closest('.timeline-controls')) return true;
            
            return false;
        };
        
        // 检查点击是否发生在时间轴容器内
        const isInTimelineContainer = (e) => {
            const rect = this.timelineContainer.getBoundingClientRect();
            const x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : null);
            const y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : null);
            
            if (x === null || y === null) return false;
            
            return (
                x >= rect.left &&
                x <= rect.right &&
                y >= rect.top &&
                y <= rect.bottom
            );
        };
        
        // 1. 时间轴容器事件处理
        const stopEvents = (e) => {
            // 仅阻止事件冒泡，但不阻止默认行为
            e.stopPropagation();
            
            // 对于滑块元素，不应该阻止任何默认行为
            if (isSliderElement(e.target)) {
                return;
            }
            
            // 只有对于鼠标移动和拖动事件才阻止默认行为，防止地图拖动
            if (e.type === 'mousemove' || e.type.includes('drag')) {
                e.preventDefault();
            }
        };
        
        // 为时间轴容器添加事件监听
        const containerEvents = ['mousedown', 'mouseup', 'mousemove', 
                        'touchstart', 'touchmove', 'touchend',
                        'wheel', 'click', 'dblclick', 'contextmenu',
                        'dragstart', 'drag', 'dragend',
                        'pointerdown', 'pointermove', 'pointerup'];
        
        containerEvents.forEach(eventType => {
            this.timelineContainer.addEventListener(eventType, stopEvents, { passive: false });
        });
        
        // 2. 时间轴遮罩层事件处理
        this.timelineOverlay.addEventListener('mousedown', (e) => {
            // 如果是滑块元素，不干预其事件
            if (isSliderElement(e.target)) {
                return;
            }
            
            // 如果点击发生在时间轴容器内，不阻止事件
            if (isInTimelineContainer(e)) {
                return;
            }
            
            // 否则阻止事件冒泡到地图
            e.stopPropagation();
            isDraggingInTimeline = true;
        });
        
        // 添加document级别的mousemove事件处理，防止拖动地图
        document.addEventListener('mousemove', (e) => {
            if (isDraggingInTimeline) {
                // 如果是滑块元素，不干预其事件
                if (isSliderElement(e.target)) {
                    return;
                }
                
                // 如果在时间轴容器内移动，不阻止事件
                if (isInTimelineContainer(e)) {
                    return;
                }
                
                e.stopPropagation();
                // 阻止默认行为，防止拖动选择文本
                e.preventDefault();
            }
        }, { passive: false });
        
        // 监听mouseup事件，重置拖动状态
        document.addEventListener('mouseup', () => {
            isDraggingInTimeline = false;
        });
        
        // 触摸事件处理
        this.timelineOverlay.addEventListener('touchstart', (e) => {
            // 获取触摸位置
            const touch = e.touches[0];
            if (!touch) return;
            
            // 检查触摸的元素
            const touchElement = document.elementFromPoint(touch.clientX, touch.clientY);
            
            // 如果是滑块元素，不干预其事件
            if (isSliderElement(touchElement)) {
                return;
            }
            
            // 如果触摸发生在时间轴容器内，不阻止事件
            if (isInTimelineContainer(e)) {
                return;
            }
            
            // 否则阻止触摸事件冒泡到地图
            e.stopPropagation();
            isDraggingInTimeline = true;
        });
        
        // 添加document级别的touchmove事件处理
        document.addEventListener('touchmove', (e) => {
            if (isDraggingInTimeline) {
                const touch = e.touches[0];
                if (!touch) return;
                
                // 检查触摸的元素
                const touchElement = document.elementFromPoint(touch.clientX, touch.clientY);
                
                // 如果是滑块元素，不干预其事件
                if (isSliderElement(touchElement)) {
                    return;
                }
                
                // 如果在时间轴容器内移动，不阻止事件
                if (isInTimelineContainer(e)) {
                    return;
                }
                
                e.stopPropagation();
                e.preventDefault();
            }
        }, { passive: false });
        
        // 监听touchend事件，重置拖动状态
        document.addEventListener('touchend', () => {
            isDraggingInTimeline = false;
        });
        
        // 滚轮事件处理
        this.timelineOverlay.addEventListener('wheel', (e) => {
            // 如果是滑块元素，不干预其事件
            if (isSliderElement(e.target)) {
                return;
            }
            
            // 如果滚轮事件发生在时间轴容器内，不阻止事件
            if (isInTimelineContainer(e)) {
                return;
            }
            
            // 阻止滚轮事件冒泡到地图
            e.stopPropagation();
        });
        
        // 如果有地图实例，通知它时间轴区域已准备好
        if (this.mapInstance && typeof this.mapInstance.onTimelineAreaReady === 'function') {
            this.mapInstance.onTimelineAreaReady(this);
        }
        
        console.log('时间轴区域事件处理已初始化');
    }
    
    /**
     * 获取时间轴区域的边界信息
     * 提供给地图和其他组件使用，以协调交互
     */
    getTimelineAreaInfo() {
        if (!this.timelineContainer) return null;
        
        const rect = this.timelineContainer.getBoundingClientRect();
        return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            height: this.timelineHeight
        };
    }
    
    /**
     * 检查指定位置是否在时间轴区域内
     * @param {number} x - 客户端X坐标
     * @param {number} y - 客户端Y坐标
     * @returns {boolean} 是否在时间轴区域内
     */
    isPointInTimelineArea(x, y) {
        if (!this.timelineContainer) return false;
        
        const rect = this.timelineContainer.getBoundingClientRect();
        return (
            x >= rect.left &&
            x <= rect.right &&
            y >= rect.top &&
            y <= rect.bottom
        );
    }
    
    /**
     * 创建时间轴容器
     */
    createTimelineContainer() {
        console.log('创建时间轴容器');
        
        // 如果已存在时间轴容器，则不需要创建
        let timelineContainer = document.getElementById('timeline-container');
        if (timelineContainer) {
            console.log('时间轴容器已存在，无需重新创建');
            this.timelineContainer = timelineContainer;
            this.timelineOverlay = document.querySelector('.timeline-overlay');
            return;
        }
        
        // 创建悬浮于地图底部的时间轴容器
        timelineContainer = document.createElement('div');
        timelineContainer.id = 'timeline-container';
        timelineContainer.className = 'timeline-container';
        this.timelineContainer = timelineContainer;
        
        // 创建年份显示
        const yearDisplay = document.createElement('div');
        yearDisplay.id = 'year-display';
        yearDisplay.className = 'current-year-display';
        yearDisplay.textContent = this.formatYear(this.currentYear);
        
        // 创建滑块容器
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'timeline-slider-container';
        
        // 创建滑块
        const yearSlider = document.createElement('input');
        // 使用this.yearSliderId或默认值
        const sliderId = this.yearSliderId || 'year-slider';
        yearSlider.id = sliderId;
        // 更新this.yearSliderId以确保一致性
        this.yearSliderId = sliderId;
        yearSlider.className = 'timeline-slider';
        yearSlider.type = 'range';
        yearSlider.min = this.minYear;
        yearSlider.max = this.maxYear;
        yearSlider.value = this.currentYear;
        yearSlider.step = '10'; // 每次调整10年
        
        sliderContainer.appendChild(yearSlider);
        
        // 创建时间刻度容器
        const ticksContainer = document.createElement('div');
        ticksContainer.className = 'timeline-ticks-container';
        ticksContainer.id = 'timeline-ticks';
        
        // 创建时期标记容器
        const periodMarkersContainer = document.createElement('div');
        periodMarkersContainer.className = 'timeline-period-markers';
        periodMarkersContainer.id = 'timeline-periods';
        
        sliderContainer.appendChild(periodMarkersContainer);
        
        // 添加到容器
        timelineContainer.appendChild(yearDisplay);
        timelineContainer.appendChild(sliderContainer);
        
        // 创建遮罩层（如果不存在）
        let overlay = document.querySelector('.timeline-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'timeline-overlay';
            overlay.style.pointerEvents = 'auto';
        }
        this.timelineOverlay = overlay;
        
        // 添加到地图容器
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.appendChild(timelineContainer);
            mapElement.appendChild(overlay);
            console.log('时间轴添加到地图元素');
        } else {
            console.error('找不到地图元素，时间轴无法添加');
            document.body.appendChild(timelineContainer);
            document.body.appendChild(overlay);
        }
        
        console.log('时间轴容器创建完成');
    }
    
    /**
     * 创建时间刻度
     */
    createTimelineTicks() {
        const sliderContainer = document.querySelector('.timeline-slider-container');
        if (!sliderContainer) return;
        
        // 创建时间刻度容器
        const ticksContainer = document.createElement('div');
        ticksContainer.className = 'timeline-ticks';
        
        // 添加一个滑块指示器（垂直线），显示当前位置
        const sliderIndicator = document.createElement('div');
        sliderIndicator.className = 'slider-indicator';
        sliderIndicator.style.position = 'absolute';
        sliderIndicator.style.top = '0';
        sliderIndicator.style.height = '100%';
        sliderIndicator.style.width = '2px';
        sliderIndicator.style.backgroundColor = '#3b82f6';
        sliderIndicator.style.zIndex = '15';
        sliderIndicator.style.pointerEvents = 'none';
        sliderIndicator.style.transition = 'left 0.1s';
        
        // 初始位置
        const initialPercent = (this.currentYear - this.minYear) / (this.maxYear - this.minYear) * 100;
        sliderIndicator.style.left = `${initialPercent}%`;
        
        sliderContainer.appendChild(sliderIndicator);
        
        // 在滑块移动时更新指示器位置
        if (this.yearSlider) {
            this.yearSlider.addEventListener('input', (e) => {
                const percent = (parseInt(e.target.value) - this.minYear) / (this.maxYear - this.minYear) * 100;
                sliderIndicator.style.left = `${percent}%`;
            });
        }
        
        // 计算刻度间隔
        const range = this.maxYear - this.minYear;
        const majorInterval = 1000; // 每1000年一个主刻度
        const minorCount = 4; // 每个主刻度之间的小刻度数量
        
        // 添加刻度
        for (let year = this.minYear; year <= this.maxYear; year += majorInterval) {
            // 添加主刻度
            const majorTick = document.createElement('div');
            majorTick.className = 'timeline-tick major';
            
            // 计算位置百分比
            const position = ((year - this.minYear) / range) * 100;
            majorTick.style.left = `${position}%`;
            
            // 添加刻度标签
            const tickLabel = document.createElement('div');
            tickLabel.className = 'timeline-tick-label';
            tickLabel.textContent = this.formatTickYear(year);
            majorTick.appendChild(tickLabel);
            
            ticksContainer.appendChild(majorTick);
            
            // 添加小刻度
            const minorInterval = majorInterval / minorCount;
            for (let i = 1; i < minorCount; i++) {
                const minorYear = year + (i * minorInterval);
                if (minorYear <= this.maxYear) {
                    const minorTick = document.createElement('div');
                    minorTick.className = 'timeline-tick';
                    const minorPosition = ((minorYear - this.minYear) / range) * 100;
                    minorTick.style.left = `${minorPosition}%`;
                    ticksContainer.appendChild(minorTick);
                }
            }
        }
        
        sliderContainer.appendChild(ticksContainer);
    }
    
    /**
     * 添加时期标记
     */
    addPeriodMarkers() {
        const periodContainer = document.getElementById('timeline-periods');
        if (!periodContainer) return;
        
        const range = this.maxYear - this.minYear;
        
        this.periods.forEach(period => {
            const startPercent = ((period.start - this.minYear) / range) * 100;
            const endPercent = ((period.end - this.minYear) / range) * 100;
            const width = endPercent - startPercent;
            
            const marker = document.createElement('div');
            marker.className = 'period-marker';
            marker.style.left = `${startPercent}%`;
            marker.style.width = `${width}%`;
            
            // 添加时期标签
            if (width > 5) { // 仅为宽度足够的时期添加标签
                const label = document.createElement('div');
                label.className = 'period-marker-label';
                label.textContent = period.name;
                label.style.left = `${startPercent + (width / 2)}%`;
                marker.appendChild(label);
            }
            
            periodContainer.appendChild(marker);
        });
    }
    
    /**
     * 添加关键历史年份标记
     */
    addKeyYearMarkers() {
        const sliderContainer = document.querySelector('.timeline-slider-container');
        if (!sliderContainer) return;
        
        const range = this.maxYear - this.minYear;
        
        this.keyHistoricalYears.forEach(item => {
            // 仅在范围内添加
            if (item.year >= this.minYear && item.year <= this.maxYear) {
                const position = ((item.year - this.minYear) / range) * 100;
                
                const marker = document.createElement('div');
                marker.className = 'timeline-year-marker';
                marker.title = `${this.formatYear(item.year)}: ${item.label}`;
                marker.style.left = `${position}%`;
                
                // 点击跳转到该年份
                marker.addEventListener('click', () => {
                    this.updateToYear(item.year);
                });
                
                sliderContainer.appendChild(marker);
            }
        });
    }
    
    /**
     * 格式化刻度年份
     * @param {number} year - 年份
     * @returns {string} 格式化后的年份字符串
     */
    formatTickYear(year) {
        if (year < 0) {
            return `${Math.abs(year)}BC`;
        } else {
            return `${year}`;
        }
    }
    
    /**
     * 创建控制按钮
     */
    createControls() {
        // 查找或创建时间轴控制区域
        let controlsContainer = document.querySelector('.timeline-controls');
        if (!controlsContainer) {
            const timelineContainer = document.getElementById('timeline-container');
            if (!timelineContainer) return;
            
            controlsContainer = document.createElement('div');
            controlsContainer.className = 'timeline-controls';
            timelineContainer.appendChild(controlsContainer);
        } else {
            // 清空现有控件
            controlsContainer.innerHTML = '';
        }
        
        // 创建后退按钮
        const backBtn = document.createElement('button');
        backBtn.className = 'timeline-control-btn';
        backBtn.innerHTML = '<i class="material-icons-round">fast_rewind</i>';
        backBtn.addEventListener('click', () => {
            this.updateToYear(this.currentYear - 100);
        });
        
        // 创建播放/暂停按钮
        const playBtn = document.createElement('button');
        playBtn.id = 'play-btn';
        playBtn.className = 'timeline-control-btn';
        playBtn.innerHTML = '<i class="material-icons-round">play_arrow</i>';
        
        // 创建前进按钮
        const forwardBtn = document.createElement('button');
        forwardBtn.className = 'timeline-control-btn';
        forwardBtn.innerHTML = '<i class="material-icons-round">fast_forward</i>';
        forwardBtn.addEventListener('click', () => {
            this.updateToYear(this.currentYear + 100);
        });
        
        // 添加到控制区域
        controlsContainer.appendChild(backBtn);
        controlsContainer.appendChild(playBtn);
        controlsContainer.appendChild(forwardBtn);
        
        // 保存播放按钮引用
        this.playBtn = playBtn;
        
        // 设置播放按钮事件
        playBtn.addEventListener('click', () => {
            this.togglePlay();
        });
    }
    
    /**
     * 设置年份变化回调
     * @param {Function} callback - 回调函数
     */
    setYearChangeCallback(callback) {
        this.yearChangedCallback = callback;
    }
    
    /**
     * 更新到指定年份
     * @param {number} year - 新的年份
     */
    updateToYear(year) {
        if (year < this.minYear) year = this.minYear;
        if (year > this.maxYear) year = this.maxYear;
        
        this.currentYear = year;
        
        // 更新滑块位置
        if (this.yearSlider) {
            this.yearSlider.value = year;
        }
        
        // 更新滑块指示器位置
        const sliderContainer = document.querySelector('.timeline-slider-container');
        if (sliderContainer) {
            const sliderIndicator = sliderContainer.querySelector('.slider-indicator');
            if (sliderIndicator) {
                const percent = (year - this.minYear) / (this.maxYear - this.minYear) * 100;
                sliderIndicator.style.left = `${percent}%`;
            }
        }
        
        // 更新年份显示
        this.updateYearDisplay();
        
        // 触发回调
        if (this.yearChangedCallback) {
            this.yearChangedCallback(year);
        }
    }
    
    /**
     * 格式化年份
     * @param {number} year - 年份
     * @returns {string} 格式化后的年份字符串
     */
    formatYear(year) {
        if (year < 0) {
            return `公元前${Math.abs(year)}年`;
        } else {
            return `公元${year}年`;
        }
    }
    
    /**
     * 更新年份显示
     * @param {number} year - 年份
     */
    updateYearDisplay(year = this.currentYear) {
        if (this.yearDisplay) {
            this.yearDisplay.textContent = this.formatYear(year);
        }
    }
    
    /**
     * 切换播放状态
     */
    togglePlay() {
        // 如果有外部togglePlay回调，则调用它
        if (typeof window.historyMapApp !== 'undefined' && typeof window.historyMapApp.togglePlay === 'function') {
            window.historyMapApp.togglePlay();
            return;
        }
        
        // 否则自行处理
        if (this.isPlaying) {
            this.stopPlayback();
        } else {
            this.startPlayback();
        }
    }
    
    /**
     * 开始播放
     */
    startPlayback() {
        if (this.isPlaying) return;
        
        console.log('开始时间轴播放');
        this.isPlaying = true;
        
        // 更新按钮状态
        if (this.playBtn) {
            this.playBtn.innerHTML = '<i class="material-icons-round">pause</i>';
            this.playBtn.classList.add('playing');
        }
        
        // 设置播放间隔
        this.playInterval = setInterval(() => {
            // 计算下一个年份
            let nextYear = this.currentYear + this.playSpeed;
            
            // 如果超过最大年份，则循环回到最小年份
            if (nextYear > this.maxYear) {
                nextYear = this.minYear;
            }
            
            // 更新年份
            this.updateToYear(nextYear);
        }, 1000); // 每秒更新一次
    }
    
    /**
     * 停止播放
     */
    stopPlayback() {
        if (!this.isPlaying) return;
        
        console.log('停止时间轴播放');
        this.isPlaying = false;
        
        // 更新按钮状态
        if (this.playBtn) {
            this.playBtn.innerHTML = '<i class="material-icons-round">play_arrow</i>';
            this.playBtn.classList.remove('playing');
        }
        
        // 清除播放间隔
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }
    
    /**
     * 设置播放速度
     * @param {number} speed - 播放速度
     */
    setPlaySpeed(speed) {
        this.playSpeed = speed;
        
        // 如果正在播放，重启播放以应用新速度
        if (this.isPlaying) {
            this.stopPlayback();
            this.startPlayback();
        }
    }
    
    /**
     * 获取当前年份
     * @returns {number} 当前年份
     */
    getCurrentYear() {
        return this.currentYear;
    }
    
    /**
     * 设置容器直接拖动功能
     * 允许用户直接在滑块容器区域拖动来改变时间
     */
    setupContainerDragging() {
        // 获取滑块容器
        const sliderContainer = document.querySelector('.timeline-slider-container');
        if (!sliderContainer || !this.yearSlider) return;
        
        // 获取滑块指示器
        const sliderIndicator = sliderContainer.querySelector('.slider-indicator');
        
        // 添加点击事件：直接点击容器上的位置就跳转到对应年份
        sliderContainer.addEventListener('click', (e) => {
            // 忽略在滑块上的点击
            if (e.target === this.yearSlider) return;
            
            // 获取容器的位置和宽度信息
            const rect = sliderContainer.getBoundingClientRect();
            
            // 计算点击位置相对于容器左边缘的距离占容器总宽度的比例
            const ratio = (e.clientX - rect.left) / rect.width;
            
            // 计算对应的年份值
            const range = this.maxYear - this.minYear;
            const year = Math.round(this.minYear + (ratio * range));
            
            // 更新到新年份
            this.updateToYear(year);
            
            // 更新滑块指示器位置
            if (sliderIndicator) {
                sliderIndicator.style.left = `${ratio * 100}%`;
            }
        });
        
        // 将拖动状态变量提升为类实例属性，使其在所有方法中可访问
        this.isTimelineDragging = false;
        
        // 添加鼠标按下事件
        sliderContainer.addEventListener('mousedown', (e) => {
            // 忽略在滑块上的点击
            if (e.target === this.yearSlider) return;
            
            this.isTimelineDragging = true;
            
            // 阻止默认行为和事件冒泡
            e.preventDefault();
            e.stopPropagation();
            
            // 添加鼠标样式
            sliderContainer.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none'; // 防止文本选择
            
            // 记录开始拖动的位置
            this.dragStartX = e.clientX;
        });
        
        // 统一处理拖动逻辑的函数
        const handleDragMove = (e) => {
            if (!this.isTimelineDragging) return;
            
            // 获取容器的位置和宽度信息
            const rect = sliderContainer.getBoundingClientRect();
            
            // 限制拖动范围在容器内
            let clientX = e.clientX;
            if (clientX < rect.left) clientX = rect.left;
            if (clientX > rect.right) clientX = rect.right;
            
            // 计算拖动位置对应的比例
            const ratio = (clientX - rect.left) / rect.width;
            
            // 计算对应的年份值
            const range = this.maxYear - this.minYear;
            const year = Math.round(this.minYear + (ratio * range));
            
            // 更新年份显示（但不立即触发回调）
            this.updateYearDisplay(year);
            
            // 更新滑块位置
            if (this.yearSlider) {
                this.yearSlider.value = year;
            }
            
            // 更新滑块指示器位置
            if (sliderIndicator) {
                sliderIndicator.style.left = `${ratio * 100}%`;
            }
            
            // 阻止事件冒泡和默认行为
            e.stopPropagation();
            e.preventDefault();
        };
        
        // 统一处理拖动结束的函数
        const handleDragEnd = (e) => {
            // 如果不在拖动状态，直接返回
            if (!this.isTimelineDragging) return;
            
            // 立即设置拖动状态为false
            this.isTimelineDragging = false;
            
            // 获取容器的位置和宽度信息
            const rect = sliderContainer.getBoundingClientRect();
            
            // 限制拖动范围在容器内
            let clientX = e.clientX;
            if (clientX < rect.left) clientX = rect.left;
            if (clientX > rect.right) clientX = rect.right;
            
            // 计算最终位置对应的比例
            const ratio = (clientX - rect.left) / rect.width;
            
            // 计算对应的年份值
            const range = this.maxYear - this.minYear;
            const year = Math.round(this.minYear + (ratio * range));
            
            // 更新到新年份（触发回调）
            this.updateToYear(year);
            
            // 更新滑块指示器位置
            if (sliderIndicator) {
                sliderIndicator.style.left = `${ratio * 100}%`;
            }
            
            // 重置样式
            sliderContainer.style.cursor = '';
            document.body.style.userSelect = '';
            
            // 阻止事件冒泡和默认行为
            e.stopPropagation();
        };
        
        // 使用捕获模式添加事件监听器，确保它们先于其他事件处理程序执行
        document.addEventListener('mousemove', handleDragMove, { capture: true, passive: false });
        document.addEventListener('mouseup', handleDragEnd, { capture: true });
        
        // 添加鼠标样式
        sliderContainer.addEventListener('mouseover', () => {
            if (!this.isTimelineDragging) {
                sliderContainer.style.cursor = 'grab';
            }
        });
        
        sliderContainer.addEventListener('mouseout', () => {
            if (!this.isTimelineDragging) {
                sliderContainer.style.cursor = '';
            }
        });
        
        // 添加鼠标离开窗口和窗口失焦的处理
        document.addEventListener('mouseleave', () => {
            if (this.isTimelineDragging) {
                this.isTimelineDragging = false;
                sliderContainer.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
        
        window.addEventListener('blur', () => {
            if (this.isTimelineDragging) {
                this.isTimelineDragging = false;
                sliderContainer.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
        
        console.log('时间轴容器拖动功能已设置');
    }
    
    /**
     * 隐藏滑块按钮
     * 移除滑块拖动按钮但保留其功能
     */
    hideSliderThumb() {
        // 创建样式元素
        const style = document.createElement('style');
        style.textContent = `
            .timeline-slider::-webkit-slider-thumb {
                width: 1px !important;
                height: 1px !important;
                background: transparent !important;
                opacity: 0 !important;
                cursor: pointer;
            }
            
            .timeline-slider::-moz-range-thumb {
                width: 1px !important;
                height: 1px !important;
                background: transparent !important;
                opacity: 0 !important;
                cursor: pointer;
            }
            
            .slider-indicator {
                width: 4px !important;
                background-color: #3b82f6 !important;
                box-shadow: 0 0 5px rgba(59, 130, 246, 0.5) !important;
            }
        `;
        
        // 添加到文档头部
        document.head.appendChild(style);
        console.log('已隐藏滑块按钮');
    }
} 