/**
 * 介绍页面模块
 * 为用户提供系统使用指南
 */

export class IntroManager {
    /**
     * 构造函数
     */
    constructor() {
        this.introActive = false;
        this.currentStep = 0;
        this.totalSteps = 5;
        this.introContainer = null;
        this.initialize();
    }
    
    /**
     * 初始化介绍页面
     */
    initialize() {
        // 创建介绍按钮
        const helpButton = document.createElement('button');
        helpButton.id = 'help-button';
        helpButton.className = 'control-btn';
        helpButton.innerHTML = '<i class="fas fa-question-circle"></i> 帮助';
        helpButton.addEventListener('click', () => this.showIntro());
        
        // 添加到控制栏
        const controlsContainer = document.querySelector('.map-controls');
        if (controlsContainer) {
            controlsContainer.appendChild(helpButton);
        } else {
            console.warn('未找到地图控制栏，无法添加帮助按钮');
        }
    }
    
    /**
     * 显示介绍页面
     */
    showIntro() {
        if (this.introActive) return;
        
        this.introActive = true;
        this.currentStep = 0;
        
        // 创建介绍容器
        this.introContainer = document.createElement('div');
        this.introContainer.className = 'intro-container';
        
        // 创建内容容器
        const contentBox = document.createElement('div');
        contentBox.className = 'intro-content';
        
        // 创建导航按钮
        const navButtons = document.createElement('div');
        navButtons.className = 'intro-nav';
        
        const prevButton = document.createElement('button');
        prevButton.textContent = '上一步';
        prevButton.addEventListener('click', () => this.prevStep());
        
        const nextButton = document.createElement('button');
        nextButton.textContent = '下一步';
        nextButton.addEventListener('click', () => this.nextStep());
        
        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.addEventListener('click', () => this.closeIntro());
        
        // 组装介绍面板
        navButtons.appendChild(prevButton);
        navButtons.appendChild(nextButton);
        navButtons.appendChild(closeButton);
        
        this.introContainer.appendChild(contentBox);
        this.introContainer.appendChild(navButtons);
        
        document.body.appendChild(this.introContainer);
        
        // 显示第一步
        this.showStep(0);
    }
    
    /**
     * 显示指定步骤
     * @param {number} step - 步骤索引
     */
    showStep(step) {
        if (!this.introContainer) return;
        
        const contentBox = this.introContainer.querySelector('.intro-content');
        if (!contentBox) return;
        
        // 根据步骤设置内容
        switch(step) {
            case 0:
                contentBox.innerHTML = `
                    <h2>欢迎使用全球历史地图</h2>
                    <p>这个交互式地图展示了人类历史的重要事件、迁徙路线、物种发展和技术创新。</p>
                    <p>本系统包含以下数据类型：</p>
                    <ul>
                        <li><strong>历史事件</strong>：重要历史事件，如农业革命、文明兴起等</li>
                        <li><strong>人类迁徙</strong>：主要人口迁移路线，如走出非洲、班图扩张等</li>
                        <li><strong>物种发展</strong>：关键动植物的驯化和传播历史</li>
                        <li><strong>技术发展</strong>：重要技术创新及其扩散</li>
                    </ul>
                `;
                break;
            case 1:
                contentBox.innerHTML = `
                    <h2>时间线控制</h2>
                    <p>页面底部的时间线让你可以浏览不同历史时期的地图：</p>
                    <ul>
                        <li>拖动滑块可以选择特定年份</li>
                        <li>输入框中可以直接输入年份</li>
                        <li>"跳转"按钮可以跳转到输入的年份</li>
                    </ul>
                    <p>地图会根据选定的年份自动更新，显示相关的历史事件和迁徙路线。</p>
                `;
                break;
            case 2:
                contentBox.innerHTML = `
                    <h2>地图交互方式</h2>
                    <p>你可以通过以下方式与地图交互：</p>
                    <ul>
                        <li><strong>缩放</strong>：使用鼠标滚轮或触控板进行缩放</li>
                        <li><strong>平移</strong>：点击并拖动地图</li>
                        <li><strong>点击区域</strong>：查看区域详细信息</li>
                        <li><strong>点击标记</strong>：查看事件详细信息</li>
                        <li><strong>点击路线</strong>：查看迁徙详细信息</li>
                    </ul>
                    <p>地图会根据缩放级别智能显示区域标签，避免标签重叠。</p>
                `;
                break;
            case 3:
                contentBox.innerHTML = `
                    <h2>事件和类别</h2>
                    <p>系统中的事件按类别进行了颜色编码：</p>
                    <ul>
                        <li><span style="color:#4CAF50">■</span> <strong>农业</strong>：农业发展相关事件</li>
                        <li><span style="color:#2196F3">■</span> <strong>技术</strong>：技术发明与创新</li>
                        <li><span style="color:#9C27B0">■</span> <strong>文明</strong>：文明兴起与发展</li>
                        <li><span style="color:#F44336">■</span> <strong>军事/征服</strong>：战争与征服</li>
                        <li><span style="color:#FF9800">■</span> <strong>疾病</strong>：疾病大流行</li>
                        <li><span style="color:#795548">■</span> <strong>迁徙</strong>：人口迁移</li>
                        <li><span style="color:#607D8B">■</span> <strong>探索</strong>：探险与发现</li>
                        <li><span style="color:#3F51B5">■</span> <strong>政治</strong>：政治变革</li>
                    </ul>
                    <p>重要性越高的事件，标记尺寸越大。</p>
                `;
                break;
            case 4:
                contentBox.innerHTML = `
                    <h2>数据源与使用提示</h2>
                    <p>本系统的数据来源于历史研究和考古发现，尽量保持准确，但古代数据存在不确定性。</p>
                    <p>使用提示：</p>
                    <ul>
                        <li>远古事件的年代可能不精确，系统会扩大其影响范围</li>
                        <li>一些事件跨越很长时间，会在整个时期内显示</li>
                        <li>迁徙路线会随时间逐渐展开，显示迁徙进程</li>
                        <li>点击事件可以查看其与技术、物种的关系</li>
                    </ul>
                    <p>祝您探索愉快！</p>
                `;
                break;
            default:
                contentBox.innerHTML = '';
        }
        
        // 更新当前步骤
        this.currentStep = step;
        
        // 更新导航按钮状态
        const prevButton = this.introContainer.querySelector('.intro-nav button:first-child');
        const nextButton = this.introContainer.querySelector('.intro-nav button:nth-child(2)');
        
        if (prevButton) {
            prevButton.disabled = (step === 0);
        }
        
        if (nextButton) {
            nextButton.textContent = (step === this.totalSteps - 1) ? '完成' : '下一步';
        }
    }
    
    /**
     * 显示下一步
     */
    nextStep() {
        if (this.currentStep < this.totalSteps - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.closeIntro();
        }
    }
    
    /**
     * 显示上一步
     */
    prevStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }
    
    /**
     * 关闭介绍页面
     */
    closeIntro() {
        if (this.introContainer && this.introContainer.parentNode) {
            this.introContainer.parentNode.removeChild(this.introContainer);
        }
        this.introActive = false;
        this.introContainer = null;
    }
}