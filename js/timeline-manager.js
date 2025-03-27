/**
 * 时间轴管理器模块
 * 负责管理时间轴和年份控制
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
        
        this.isPlaying = false;
        this.playInterval = null;
        this.playSpeed = 50; // 默认每帧前进50年
        this.yearChangedCallback = null;
        
        // DOM元素
        this.yearSlider = null;
        this.yearDisplay = null;
        this.playBtn = null;
        
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
     */
    initialize() {
        console.log('初始化时间轴...');
        
        // 创建时间轴容器（如果不存在）
        this.createTimelineContainer();
        
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
        
        // 监听滑块输入事件
        this.yearSlider.addEventListener('input', (e) => {
            const year = parseInt(e.target.value);
            this.updateYearDisplay(year);
        });
        
        // 监听滑块变化事件
        this.yearSlider.addEventListener('change', (e) => {
            const year = parseInt(e.target.value);
            this.updateToYear(year);
        });
        
        // 添加控制按钮
        this.createControls();
        
        console.log('时间轴初始化完成');
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
            return;
        }
        
        // 创建悬浮于地图底部的时间轴容器
        timelineContainer = document.createElement('div');
        timelineContainer.id = 'timeline-container';
        timelineContainer.className = 'timeline-container';
        
        // 阻止事件冒泡，防止地图拖动
        timelineContainer.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        timelineContainer.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        });
        
        timelineContainer.addEventListener('wheel', (e) => {
            e.stopPropagation();
        });
        
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
        yearSlider.id = 'year-slider';
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
        
        // 添加到地图容器
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.appendChild(timelineContainer);
            
            // 调整时间轴遮罩层
            const overlay = document.querySelector('.timeline-overlay');
            if (overlay) {
                // 激活遮罩层以捕获时间轴区域外的点击事件
                overlay.addEventListener('mousedown', (e) => {
                    // 检查点击位置是否在时间轴内
                    const timelineRect = timelineContainer.getBoundingClientRect();
                    if (e.clientY < timelineRect.top) {
                        // 如果点击位置在时间轴上方，允许事件传递到地图
                        return true;
                    } else {
                        // 否则阻止事件传递
                        e.stopPropagation();
                    }
                });
            }
            
            console.log('时间轴添加到地图元素');
        } else {
            console.error('找不到地图元素，时间轴无法添加');
            document.body.appendChild(timelineContainer);
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
} 