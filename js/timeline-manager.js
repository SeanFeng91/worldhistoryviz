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
        this.timelineHeight = 200;
        
        // 时间段配置 - 将在初始化时从事件数据动态生成
        this.periods = [];
        
        // 重要历史年份标记 - 将在初始化时从事件数据动态生成
        this.keyHistoricalYears = [];
        
        // 时间轴非线性转换参数
        this.useNonLinearScale = true;  // 是否使用非线性尺度
        this.scaleBreakpoint = 0;       // 转换断点，通常为公元0年
        this.bcScaleFactor = 0.3;       // 公元前的比例因子 (压缩，调小数值压缩更强)
        this.adScaleFactor = 1.0;       // 公元后的比例因子 (设为1.0表示线性，不进行缩放)
        
        // 时间轴内部范围，用于非线性转换
        this.sliderMinValue = 0;
        this.sliderMaxValue = 1000;
    }
    
    /**
     * 将实际年份转换为滑块值 (非线性转换)
     * @param {number} year - 实际历史年份
     * @returns {number} 滑块位置值
     */
    yearToSliderValue(year) {
        if (!this.useNonLinearScale) {
            return year; // 不使用非线性尺度时直接返回
        }
        
        // 计算整个时间范围
        const totalRange = this.maxYear - this.minYear;
        
        // 判断是公元前还是公元后
        if (year < this.scaleBreakpoint) {
            // 公元前年份 (压缩)
            const bcRange = this.scaleBreakpoint - this.minYear;
            const bcPosition = this.scaleBreakpoint - year; // 距离断点的距离
            // 使用对数缩放公元前部分
            const scaledPercent = Math.pow(bcPosition / bcRange, this.bcScaleFactor);
            const sliderValue = this.sliderMinValue + (1 - scaledPercent) * ((this.sliderMaxValue - this.sliderMinValue) / 2);
            console.log(`转换公元前年份: ${year} -> 滑块值: ${sliderValue}，百分比位置: ${(sliderValue - this.sliderMinValue) / (this.sliderMaxValue - this.sliderMinValue) * 100}%`);
            return sliderValue;
        } else {
            // 公元后年份 (线性)
            const adRange = this.maxYear - this.scaleBreakpoint;
            const adPosition = year - this.scaleBreakpoint; // 距离断点的距离
            // 线性映射公元后部分
            const scaledPercent = adPosition / adRange;
            const sliderValue = this.sliderMinValue + ((this.sliderMaxValue - this.sliderMinValue) / 2) + scaledPercent * ((this.sliderMaxValue - this.sliderMinValue) / 2);
            console.log(`转换公元后年份: ${year} -> 滑块值: ${sliderValue}，百分比位置: ${(sliderValue - this.sliderMinValue) / (this.sliderMaxValue - this.sliderMinValue) * 100}%`);
            return sliderValue;
        }
    }
    
    /**
     * 将滑块值转换为实际年份 (非线性转换的逆运算)
     * @param {number} value - 滑块位置值
     * @returns {number} 实际历史年份
     */
    sliderValueToYear(value) {
        if (!this.useNonLinearScale) {
            return value; // 不使用非线性尺度时直接返回
        }
        
        // 滑块中点值（对应公元0年）
        const midPoint = this.sliderMinValue + (this.sliderMaxValue - this.sliderMinValue) / 2;
        
        // 判断是公元前还是公元后
        if (value < midPoint) {
            // 公元前年份 (解压缩)
            const normalizedValue = (value - this.sliderMinValue) / (midPoint - this.sliderMinValue); // 归一化的值
            const bcRange = this.scaleBreakpoint - this.minYear;
            const bcPosition = bcRange * Math.pow(1 - normalizedValue, 1 / this.bcScaleFactor);
            const year = Math.round(this.scaleBreakpoint - bcPosition);
            console.log(`滑块值 ${value} (${normalizedValue * 100}%) -> 公元前年份: ${year}`);
            return year;
        } else {
            // 公元后年份 (线性)
            const normalizedValue = (value - midPoint) / (this.sliderMaxValue - midPoint); // 归一化的值
            const adRange = this.maxYear - this.scaleBreakpoint;
            const adPosition = adRange * normalizedValue;
            const year = Math.round(this.scaleBreakpoint + adPosition);
            console.log(`滑块值 ${value} (${(normalizedValue + 0.5) * 100}%) -> 公元后年份: ${year}`);
            return year;
        }
    }
    
    /**
     * 初始化时间轴
     * @param {Object} mapInstance - 地图实例，用于协调时间轴区域和地图交互
     */
    initialize(mapInstance) {
        console.log('初始化时间轴...');
        
        // 保存地图实例引用
        this.mapInstance = mapInstance;

        // 从事件数据生成时间段和关键历史年份
        this.generatePeriodsFromEvents();
        this.generateKeyYearsFromEvents();
        
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
            
            // 如果使用非线性尺度，使用内部范围
            if (this.useNonLinearScale) {
                sliderElement.min = this.sliderMinValue;
                sliderElement.max = this.sliderMaxValue;
                sliderElement.value = this.yearToSliderValue(this.currentYear);
            } else {
            sliderElement.min = this.minYear;
            sliderElement.max = this.maxYear;
            sliderElement.value = this.currentYear;
            }
            
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
        if (this.useNonLinearScale) {
            this.yearSlider.min = this.sliderMinValue;
            this.yearSlider.max = this.sliderMaxValue;
            this.yearSlider.value = this.yearToSliderValue(this.currentYear);
        } else {
        this.yearSlider.min = this.minYear;
        this.yearSlider.max = this.maxYear;
        this.yearSlider.value = this.currentYear;
        }
        
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
     * 从事件数据生成时间段
     * 根据事件中的重要时期自动生成时间段配置
     */
    generatePeriodsFromEvents() {
        // 如果已有全局事件数据，则使用它来生成时间段
        if (window.historyMapApp && window.historyMapApp.eventManager) {
            const eventManager = window.historyMapApp.eventManager;
            
            // 默认时间段配置，如果无法从事件中生成
            // const defaultPeriods = [
            //     { start: -15000, end: -3000, name: "史前" },
            //     { start: -3000, end: -1000, name: "古代早期" },
            //     { start: -1000, end: 500, name: "古典时期" },
            //     { start: 500, end: 1400, name: "中世纪" },
            //     { start: 1400, end: 1700, name: "文艺复兴" },
            //     { start: 1700, end: 1900, name: "现代早期" },
            //     { start: 1900, end: 2000, name: "现代" }
            // ];
            
            try {
                // 尝试获取文明类事件以确定时间段
                const allEvents = eventManager.getAllEvents();
                
                // 如果没有事件数据，使用默认配置
                if (!allEvents || allEvents.length === 0) {
                    console.log('没有找到事件数据，使用默认时间段');
                    this.periods = defaultPeriods;
                    return;
                }
                
                // 查找文明类事件
                const civilizationEvents = allEvents.filter(event => 
                    event.category === '文明'
                );
                
                // 如果没有足够的文明事件，使用默认配置
                if (civilizationEvents.length < 5) {
                    console.log('文明事件不足，使用默认时间段');
                    this.periods = defaultPeriods;
                    return;
                }
                
                // 根据文明事件的时间范围划分时期
                // 按开始年份排序
                civilizationEvents.sort((a, b) => a.startYear - b.startYear);
                
                // 生成基于文明的时期
                const periods = [];
                
                // 添加史前时期
                periods.push({
                    start: this.minYear,
                    end: civilizationEvents[0].startYear,
                    name: "史前"
                });
                
                // 早期文明
                const earlyEnd = civilizationEvents.find(e => e.startYear > -1000)?.startYear || -1000;
                periods.push({
                    start: civilizationEvents[0].startYear,
                    end: earlyEnd,
                    name: "早期文明"
                });
                
                // 古典时期
                const classicalEnd = civilizationEvents.find(e => e.startYear > 0)?.startYear || 500;
                periods.push({
                    start: earlyEnd,
                    end: classicalEnd,
                    name: "古典时期"
                });
                
                // 中世纪
                const medievalEnd = civilizationEvents.find(e => e.startYear > 1000)?.startYear || 1400;
                periods.push({
                    start: classicalEnd,
                    end: medievalEnd,
                    name: "中世纪"
                });
                
                // 近代
                const earlyModernEnd = civilizationEvents.find(e => e.startYear > 1700)?.startYear || 1900;
                periods.push({
                    start: medievalEnd,
                    end: earlyModernEnd,
                    name: "近代"
                });
                
                // 现代
                periods.push({
                    start: earlyModernEnd,
                    end: this.maxYear,
                    name: "现代"
                });
                
                this.periods = periods;
                console.log('根据文明事件生成的时间段:', this.periods);
            } catch (error) {
                console.error('生成时间段时出错:', error);
                this.periods = defaultPeriods;
            }
        } else {
            // 如果没有事件管理器，使用默认配置
            this.periods = [
                { start: -12000, end: -3000, name: "史前" },
                { start: -3000, end: -1000, name: "古代早期" },
                { start: -1000, end: 500, name: "古典时期" },
                { start: 500, end: 1400, name: "中世纪" },
                { start: 1400, end: 1700, name: "文艺复兴" },
                { start: 1700, end: 1900, name: "现代早期" },
                { start: 1900, end: 2025, name: "现代" }
            ];
        }
    }

    /**
     * 从事件数据生成关键历史年份
     * 根据重要程度选择典型事件标记在时间轴上
     */
    generateKeyYearsFromEvents() {
        // 如果已有全局事件数据，则使用它来生成关键年份
        if (window.historyMapApp && window.historyMapApp.eventManager) {
            const eventManager = window.historyMapApp.eventManager;
            
            // 默认关键年份，如果无法从事件中生成
            // const defaultKeyYears = [
            //     { year: -3500, label: "苏美尔文明" },
            //     { year: -1345, label: "图坦卡蒙" },
            //     { year: -776, label: "奥运会起源" },
            //     { year: 1, label: "公元元年" },
            //     { year: 1492, label: "新大陆发现" },
            //     { year: 1776, label: "美国独立" },
            //     { year: 1945, label: "二战结束" },
            //     { year: 1969, label: "登月" }
            // ];
            
            try {
                // 获取所有事件
                const allEvents = eventManager.getAllEvents();
                
                // 如果没有事件数据，使用默认配置
                if (!allEvents || allEvents.length === 0) {
                    console.log('没有找到事件数据，使用默认关键年份');
                    this.keyHistoricalYears = defaultKeyYears;
                    return;
                }
                
                // 按重要性排序
                const importantEvents = [...allEvents]
                    .filter(event => event.importance >= 4) // 只选择重要程度较高的事件
                    .sort((a, b) => b.importance - a.importance);
                
                // 最多选择12个关键年份，确保时间分布均匀
                const keyYears = [];
                
                // 先添加公元元年作为基准点
                keyYears.push({ year: 1, label: "公元元年" });
                
                // 添加最重要的事件（前10个）
                const topEvents = importantEvents.slice(0, 10);
                
                // 按时间排序
                topEvents.sort((a, b) => a.startYear - b.startYear);
                
                // 转换为关键年份格式
                topEvents.forEach(event => {
                    // 避免重复年份
                    if (!keyYears.some(ky => ky.year === event.startYear)) {
                        keyYears.push({
                            year: event.startYear,
                            label: event.title
                        });
                    }
                });
                
                // 如果事件不够，再根据时期添加一些
                if (keyYears.length < 8) {
                    // 根据时间段添加典型年份
                    this.periods.forEach(period => {
                        const midYear = Math.floor((period.start + period.end) / 2);
                        if (!keyYears.some(ky => Math.abs(ky.year - midYear) < 100)) {
                            keyYears.push({
                                year: midYear,
                                label: period.name
                            });
                        }
                    });
                }
                
                // 确保有足够的关键年份
                if (keyYears.length < 8) {
                    // 补充默认年份
                    defaultKeyYears.forEach(defaultYear => {
                        if (!keyYears.some(ky => ky.year === defaultYear.year)) {
                            keyYears.push(defaultYear);
                        }
                    });
                }
                
                // 最终按年份排序
                keyYears.sort((a, b) => a.year - b.year);
                
                // 限制最多12个关键年份
                this.keyHistoricalYears = keyYears.slice(0, 12);
                console.log('根据事件生成的关键历史年份:', this.keyHistoricalYears);
            } catch (error) {
                console.error('生成关键历史年份时出错:', error);
                this.keyHistoricalYears = defaultKeyYears;
            }
        } else {
            // 如果没有事件管理器，使用默认配置
            // this.keyHistoricalYears = [
            //     { year: -3500, label: "苏美尔文明" },
            //     { year: -1345, label: "图坦卡蒙" },
            //     { year: -776, label: "奥运会起源" },
            //     { year: 1, label: "公元元年" },
            //     { year: 1492, label: "新大陆发现" },
            //     { year: 1776, label: "美国独立" },
            //     { year: 1945, label: "二战结束" },
            //     { year: 1969, label: "登月" }
            // ];
        }
    }
    
    /**
     * 设置滑块事件处理
     */
    setupSliderEvents() {
        if (!this.yearSlider) return;
        
        this.yearSlider.addEventListener('input', (e) => {
            let year;
            
            if (this.useNonLinearScale) {
                const sliderValue = parseFloat(e.target.value);
                year = this.sliderValueToYear(sliderValue);
            } else {
                year = parseInt(e.target.value);
            }
            
            this.updateYearDisplay(year);
        });
        
        this.yearSlider.addEventListener('change', (e) => {
            let year;
            
            if (this.useNonLinearScale) {
                const sliderValue = parseFloat(e.target.value);
                year = this.sliderValueToYear(sliderValue);
            } else {
                year = parseInt(e.target.value);
            }
            
            this.updateToYear(year);
        });
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
        
        // 创建时间刻度容器
        const ticksContainer = document.createElement('div');
        ticksContainer.className = 'timeline-ticks';
        ticksContainer.id = 'timeline-ticks';
        sliderContainer.appendChild(ticksContainer);
        
        // 创建时期标记容器
        const periodMarkersContainer = document.createElement('div');
        periodMarkersContainer.className = 'timeline-period-markers';
        periodMarkersContainer.id = 'timeline-periods';
        sliderContainer.appendChild(periodMarkersContainer);
        
        // 创建滑块指示器
        const sliderIndicator = document.createElement('div');
        sliderIndicator.className = 'slider-indicator';
        sliderContainer.appendChild(sliderIndicator);
        
        // 创建滑块元素
        const yearSlider = document.createElement('input');
        yearSlider.id = this.yearSliderId || 'year-slider';
        this.yearSliderId = yearSlider.id; // 确保一致性
        yearSlider.className = 'timeline-slider';
        yearSlider.type = 'range';
        
        // 设置滑块范围
        if (this.useNonLinearScale) {
            yearSlider.min = this.sliderMinValue;
            yearSlider.max = this.sliderMaxValue;
            yearSlider.value = this.yearToSliderValue(this.currentYear);
        } else {
        yearSlider.min = this.minYear;
        yearSlider.max = this.maxYear;
        yearSlider.value = this.currentYear;
        }
        
        sliderContainer.appendChild(yearSlider);
        
        // 创建控制按钮容器
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'timeline-controls';
        
        // 创建并添加控制按钮
        // 后退按钮
        const backBtn = document.createElement('button');
        backBtn.className = 'timeline-control-btn';
        backBtn.innerHTML = '<i class="material-icons-round">fast_rewind</i>';
        backBtn.title = '后退100年';
        backBtn.setAttribute('data-action', 'rewind');
        
        // 播放/暂停按钮
        const playBtn = document.createElement('button');
        playBtn.id = 'play-btn';
        playBtn.className = 'timeline-control-btn';
        playBtn.innerHTML = '<i class="material-icons-round">play_arrow</i>';
        playBtn.title = '播放/暂停';
        playBtn.setAttribute('data-action', 'play');
        
        // 前进按钮
        const forwardBtn = document.createElement('button');
        forwardBtn.className = 'timeline-control-btn';
        forwardBtn.innerHTML = '<i class="material-icons-round">fast_forward</i>';
        forwardBtn.title = '前进100年';
        forwardBtn.setAttribute('data-action', 'forward');
        
        // 添加到控制区域
        controlsContainer.appendChild(backBtn);
        controlsContainer.appendChild(playBtn);
        controlsContainer.appendChild(forwardBtn);
        
        // 添加到容器
        timelineContainer.appendChild(yearDisplay);
        timelineContainer.appendChild(sliderContainer);
        timelineContainer.appendChild(controlsContainer);
        
        // 创建遮罩层（如果不存在）
        let overlay = document.querySelector('.timeline-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'timeline-overlay';
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
        
        // 保存DOM元素引用
        this.yearSlider = yearSlider;
        this.yearDisplay = yearDisplay;
        this.playBtn = playBtn;
        
        // 设置事件处理
        backBtn.addEventListener('click', () => {
            this.updateToYear(this.currentYear - 100);
        });
        
        forwardBtn.addEventListener('click', () => {
            this.updateToYear(this.currentYear + 100);
        });
        
        playBtn.addEventListener('click', () => {
            this.togglePlay();
        });
        
        console.log('时间轴容器创建完成');
    }
    
    /**
     * 创建时间刻度
     */
    createTimelineTicks() {
        // 获取时间轴滑块区域
        const sliderContainer = document.querySelector('.timeline-slider-container');
        if (!sliderContainer) return;
        
        // 创建刻度容器（如果不存在）
        let ticksContainer = document.querySelector('.timeline-ticks');
        if (!ticksContainer) {
            ticksContainer = document.createElement('div');
        ticksContainer.className = 'timeline-ticks';
            sliderContainer.appendChild(ticksContainer);
        } else {
            ticksContainer.innerHTML = ''; // 清空现有刻度
        }
        
        // 确定刻度间隔和位置
        let tickYears = [];
        
        if (this.useNonLinearScale) {
            // 对于非线性刻度，我们需要在视觉上均匀分布刻度
            
            // 公元前区域 - 主要刻度
            // 确保公元前区域有足够的刻度且分布更均匀
            const bcMajorIntervals = [-12000, -10000, -8000, -6000, -4000, -3000, -2000, -1000, -500, -200, -50];
            bcMajorIntervals.forEach(year => {
                if (year >= this.minYear && year < 0) {
                    tickYears.push({
                        year: year,
                        isMajor: true
                    });
                }
            });
            
            // 公元前区域 - 次要刻度，在-2000年到0年之间添加更多刻度
            const bcMinorIntervals = [-9000, -7000, -5000, -3500, -2500, -1500, -750, -350 , -125];
            bcMinorIntervals.forEach(year => {
                if (year >= this.minYear && year < 0) {
                    tickYears.push({
                        year: year,
                        isMajor: false
                    });
                }
            });
            
            // 特殊添加公元元年标记
            tickYears.push({
                year: 0,
                isMajor: true,
                special: true
            });
            
            // 公元后区域 - 主要刻度
            const adMajorIntervals = [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000];
            adMajorIntervals.forEach(year => {
                if (year <= this.maxYear) {
                    tickYears.push({
                        year: year,
                        isMajor: true
                    });
                }
            });
            
            // 公元后区域 - 次要刻度
            const adMinorIntervals = [100, 300, 500, 700, 900, 1100, 1300, 1500, 1700, 1900];
            adMinorIntervals.forEach(year => {
                if (year <= this.maxYear) {
                    tickYears.push({
                        year: year,
                        isMajor: false
                    });
                }
            });
        } else {
            // 线性刻度 - 简单均匀间隔
            const majorTickInterval = 2000;
            const minorTickInterval = 500;
            
            // 添加主要刻度
            for (let year = this.minYear; year <= this.maxYear; year += majorTickInterval) {
                tickYears.push({
                    year: year,
                    isMajor: true
                });
            }
            
            // 添加次要刻度
            for (let year = this.minYear; year <= this.maxYear; year += minorTickInterval) {
                if (year % majorTickInterval !== 0) { // 避免与主要刻度重复
                    tickYears.push({
                        year: year,
                        isMajor: false
                    });
                }
            }
        }
        
        // 为了确保标记不会重叠，对年份进行排序，然后检查相邻标记的距离
        tickYears.sort((a, b) => a.year - b.year);
        
        // 创建刻度元素
        tickYears.forEach((tickData, index) => {
            const tick = document.createElement('div');
            
            // 设置样式类
            tick.className = tickData.isMajor ? 'timeline-tick major' : 'timeline-tick minor';
            
            // 如果是特殊标记(公元元年)，添加特殊类
            if (tickData.special) {
                tick.classList.add('special');
            }
            
            // 计算位置
            let position;
            if (this.useNonLinearScale) {
                const sliderValue = this.yearToSliderValue(tickData.year);
                position = ((sliderValue - this.sliderMinValue) / (this.sliderMaxValue - this.sliderMinValue)) * 100;
            } else {
                position = ((tickData.year - this.minYear) / (this.maxYear - this.minYear)) * 100;
            }
            
            tick.style.left = `${position}%`;
            
            // 只为主要刻度添加标签
            if (tickData.isMajor) {
                const label = document.createElement('span');
                label.className = 'tick-label';
                
                // 设置标签文本
                label.textContent = this.formatTickYear(tickData.year);
                
                // 检查是否有足够的空间显示标签
                const nextMajorTickIndex = tickYears.findIndex((t, i) => i > index && t.isMajor);
                const hasSufficientSpace = nextMajorTickIndex === -1 || 
                    Math.abs(position - this.getTickPosition(tickYears[nextMajorTickIndex])) > 8;
                
                // 如果空间不足，可以缩小字体或隐藏某些标签
                // if (!hasSufficientSpace && tickData.year % 2000 !== 0 && !tickData.special) {
                //     label.classList.add('small');
                // }
                
                // 为不同时期的标签添加不同的类
                if (tickData.year < 0) {
                    label.classList.add('bc-label');
                } else if (tickData.year > 1700) {
                    label.classList.add('modern-label');
                }
                
                tick.appendChild(label);
            }
            
            ticksContainer.appendChild(tick);
        });
        
        // 添加CSS样式以改进时间刻度的外观
        this.addTimelineTicksStyles();
    }
    
    /**
     * 获取刻度的位置百分比
     * @param {Object} tickData - 刻度数据
     * @returns {number} 位置百分比
     */
    getTickPosition(tickData) {
        if (this.useNonLinearScale) {
            const sliderValue = this.yearToSliderValue(tickData.year);
            return ((sliderValue - this.sliderMinValue) / (this.sliderMaxValue - this.sliderMinValue)) * 100;
        } else {
            return ((tickData.year - this.minYear) / (this.maxYear - this.minYear)) * 100;
        }
    }
    
    /**
     * 添加时间刻度的CSS样式
     */
    addTimelineTicksStyles() {
        // 检查是否已经添加了样式
        if (document.getElementById('timeline-ticks-styles')) return;
        
        // 创建样式元素
        const style = document.createElement('style');
        style.id = 'timeline-ticks-styles';
        
        // 设置CSS规则
        style.textContent = `
            .timeline-slider-container {
                position: relative;
                overflow: visible;
            }

            .timeline-tick {
                position: absolute;
                height: 8px;
                width: 1px;
                background-color: rgba(100, 116, 139, 0.5);
                bottom: 0;
                transform: translateX(-50%);
            }
            
            .timeline-tick.major {
                height: 12px;
                width: 2px;
                background-color: rgba(71, 85, 105, 0.7);
            }
            
            .timeline-tick.special {
                height: 16px;
                width: 3px;
                background-color: rgba(59, 130, 246, 0.8);
            }
            
            .tick-label {
                position: absolute;
                bottom: -22px;
                transform: translateX(-50%);
                font-family: 'Noto Serif SC', 'Times New Roman', serif;
                font-size: 11px;
                color: #334155;
                white-space: nowrap;
                text-shadow: 0 0 2px rgba(255, 255, 255, 0.8);
            }
            
            .tick-label.small {
                font-size: 9px;
                opacity: 0.8;
                bottom: -18px;
            }
            
            .tick-label.bc-label {
                color: #64748b;
            }
            
            .tick-label.modern-label {
                color: #0f172a;
                font-weight: 600;
            }
            
            .dark .timeline-tick {
                background-color: rgba(148, 163, 184, 0.5);
            }
            
            .dark .timeline-tick.major {
                background-color: rgba(203, 213, 225, 0.7);
            }
            
            .dark .timeline-tick.special {
                background-color: rgba(96, 165, 250, 0.8);
            }
            
            .dark .tick-label {
                color: #e2e8f0;
                text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
            }
            
            .dark .tick-label.bc-label {
                color: #cbd5e1;
            }
            
            .dark .tick-label.modern-label {
                color: #f8fafc;
            }

            /* 滑块轨道蓝色渐变 */
            .timeline-slider::-webkit-slider-runnable-track {
                background: linear-gradient(to right, #60a5fa, #3b82f6);
            }
            
            .dark .timeline-slider::-webkit-slider-runnable-track {
                background: linear-gradient(to right, #3b82f6, #1d4ed8);
            }
            
            /* 时期标记与时间刻度重叠 */
            .timeline-period-markers {
                position: absolute;
                width: 100%;
                height: 6px;
                bottom: 8px;
                z-index: 0;
            }
            
            .period-marker {
                position: absolute;
                height: 6px;
                background-color: rgba(203, 213, 225, 0.5);
                border-radius: 4px;
                bottom: 0;
            }
            
            /* 不同时期的颜色 */
            .period-marker[data-period="史前"] {
                background-color: rgba(79, 70, 229, 0.4); /* 靛蓝色 */
            }
            
            .period-marker[data-period="早期文明"],
            .period-marker[data-period="古代早期"] {
                background-color: rgba(245, 158, 11, 0.4); /* 琥珀色 */
            }
            
            .period-marker[data-period="古典时期"] {
                background-color: rgba(16, 185, 129, 0.4); /* 翡翠绿 */
            }
            
            .period-marker[data-period="中世纪"] {
                background-color: rgba(59, 130, 246, 0.4); /* 蓝色 */
            }
            
            .period-marker[data-period="文艺复兴"],
            .period-marker[data-period="近代"] {
                background-color: rgba(236, 72, 153, 0.4); /* 粉红色 */
            }
            
            .period-marker[data-period="现代早期"],
            .period-marker[data-period="现代"] {
                background-color: rgba(239, 68, 68, 0.4); /* 红色 */
            }
            
            .period-label {
                position: absolute;
                top: -18px;
                width: 100%;
                text-align: center;
                font-size: 10px;
                color: #64748b;
                white-space: nowrap;
                font-family: 'Times New Roman', serif;
                letter-spacing: 0.5px;
            }
            
            .dark .period-marker {
                opacity: 0.5;
            }
            
            .dark .period-label {
                color: #94a3b8;
            }
        `;
        
        // 添加到文档头部
        document.head.appendChild(style);
    }
    
    /**
     * 格式化刻度年份
     * @param {number} year - 年份
     * @returns {string} 格式化后的年份字符串
     */
    formatTickYear(year) {
        if (year < 0) {
            // 公元前使用 B.C. 表示
            const absYear = Math.abs(year);
            return `${absYear} B.C.`;
        } else if (year === 0) {
            return "公元";
        } else if (year < 1000) {
            return `${year}`;
        } else {
            return `${year}`;
        }
    }
    
    /**
     * 添加时期标记
     */
    addPeriodMarkers() {
        // 获取时期标记容器
        const periodsContainer = document.getElementById('timeline-periods');
        if (!periodsContainer) return;
        
        // 清空现有标记
        periodsContainer.innerHTML = '';
        
        // 添加时期标记
        this.periods.forEach(period => {
            const marker = document.createElement('div');
            marker.className = 'period-marker';
            // 添加data-period属性，用于CSS样式区分不同时期
            marker.setAttribute('data-period', period.name);
            
            // 计算位置和宽度（考虑非线性尺度）
            let startPosition, endPosition;
            
            if (this.useNonLinearScale) {
                const startSliderValue = this.yearToSliderValue(period.start);
                const endSliderValue = this.yearToSliderValue(period.end);
                
                startPosition = ((startSliderValue - this.sliderMinValue) / (this.sliderMaxValue - this.sliderMinValue)) * 100;
                endPosition = ((endSliderValue - this.sliderMinValue) / (this.sliderMaxValue - this.sliderMinValue)) * 100;
            } else {
                startPosition = ((period.start - this.minYear) / (this.maxYear - this.minYear)) * 100;
                endPosition = ((period.end - this.minYear) / (this.maxYear - this.minYear)) * 100;
            }
            
            const width = endPosition - startPosition;
            
            marker.style.left = `${startPosition}%`;
            marker.style.width = `${width}%`;
            
            // 添加时期标签
            const label = document.createElement('span');
            label.className = 'period-label';
                label.textContent = period.name;
                marker.appendChild(label);
            
            // 为时期添加工具提示
            marker.title = `${period.name} (${this.formatYear(period.start)} - ${this.formatYear(period.end)})`;
            
            periodsContainer.appendChild(marker);
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
     * @param {number} year - 目标年份
     */
    updateToYear(year) {
        if (isNaN(year) || year < this.minYear || year > this.maxYear) {
            console.warn(`无效的年份值: ${year}`);
            return;
        }
        
        // 更新当前年份
        this.currentYear = year;
        
        // 更新滑块位置
        if (this.yearSlider) {
            if (this.useNonLinearScale) {
                this.yearSlider.value = this.yearToSliderValue(year);
            } else {
            this.yearSlider.value = year;
            }
        }
        
        // 更新输入框值
        if (this.yearInput) {
            this.yearInput.value = year;
        }
        
        // 更新年份显示
        this.updateYearDisplay();
        
        // 触发年份变化回调
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
            const absYear = Math.abs(year);
            if (absYear >= 10000) {
                return `公元前${Math.floor(absYear/1000)}千年`;
            } else {
                return `公元前${absYear}年`;
            }
        } else if (year === 0) {
            return `公元元年`;
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
            const formattedYear = this.formatYear(year);
            this.yearDisplay.textContent = formattedYear;
            
            // 根据年份长度调整样式
            const yearLength = formattedYear.length;
            if (yearLength > 8) {
                this.yearDisplay.style.fontSize = '16px';
            } else {
                this.yearDisplay.style.fontSize = '18px';
            }
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
        if (!sliderContainer) return;
        
        // 获取滑块指示器
        const sliderIndicator = sliderContainer.querySelector('.slider-indicator');
        
        // 添加点击事件：直接点击容器上的位置就跳转到对应年份
        sliderContainer.addEventListener('click', (e) => {
            // 获取容器的位置和宽度信息
            const rect = sliderContainer.getBoundingClientRect();
            
            // 计算点击位置相对于容器左边缘的距离占容器总宽度的比例
            const ratio = (e.clientX - rect.left) / rect.width;
            
            // 如果使用非线性尺度，需要转换
            let year;
            if (this.useNonLinearScale) {
                const sliderValue = this.sliderMinValue + ratio * (this.sliderMaxValue - this.sliderMinValue);
                year = this.sliderValueToYear(sliderValue);
            } else {
            // 计算对应的年份值
            const range = this.maxYear - this.minYear;
                year = Math.round(this.minYear + (ratio * range));
            }
            
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
            // 阻止默认行为和事件冒泡
            e.preventDefault();
            e.stopPropagation();
            
            // 设置拖动状态
            this.isTimelineDragging = true;
            
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
            
            // 如果使用非线性尺度，需要转换
            let year;
            if (this.useNonLinearScale) {
                const sliderValue = this.sliderMinValue + ratio * (this.sliderMaxValue - this.sliderMinValue);
                year = this.sliderValueToYear(sliderValue);
            } else {
            // 计算对应的年份值
            const range = this.maxYear - this.minYear;
                year = Math.round(this.minYear + (ratio * range));
            }
            
            // 更新年份显示（但不立即触发回调）
            this.updateYearDisplay(year);
            
            // 更新滑块位置
            if (this.yearSlider) {
                if (this.useNonLinearScale) {
                    this.yearSlider.value = this.yearToSliderValue(year);
                } else {
                this.yearSlider.value = year;
                }
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
            
            // 如果使用非线性尺度，需要转换
            let year;
            if (this.useNonLinearScale) {
                const sliderValue = this.sliderMinValue + ratio * (this.sliderMaxValue - this.sliderMinValue);
                year = this.sliderValueToYear(sliderValue);
            } else {
            // 计算对应的年份值
            const range = this.maxYear - this.minYear;
                year = Math.round(this.minYear + (ratio * range));
            }
            
            // 更新到新年份（触发回调）
            this.updateToYear(year);
            
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
} 