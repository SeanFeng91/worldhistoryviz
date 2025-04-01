# 世界历史地图可视化项目

这是一个交互式世界历史地图可视化项目，展示了从史前到现代的重要历史事件、人口迁徙、技术发展、物种驯化和文明演变。通过直观的时间轴和地图界面，您可以探索人类历史的地理变迁。
![image.png](https://cloudflare-imgbed-1d8.pages.dev/file/1743496048122_image.png)

## 项目特点

- 📅 按时间轴浏览世界历史变迁
- 🌍 交互式地图界面，支持缩放和平移
- 📚 多种数据类型：历史事件、人口迁徙、技术发展、物种驯化、文明演变、战争和疾病
- 🌙 支持暗色模式和浅色模式，自动适应系统设置
- 📱 响应式设计，适配桌面和移动设备
- 🔍 分类筛选功能，快速查找感兴趣的历史内容

## 系统架构

### 架构概述

本项目采用模块化设计，将功能划分为不同的模块，每个模块负责特定的功能域。模块之间通过明确定义的接口进行通信，降低了耦合度，提高了代码的可维护性和可扩展性。

### 核心模块

#### 1. 应用核心 (`app.js` 和 `main.js`)

- 应用的入口点和核心协调器
- 初始化各个功能模块并协调它们之间的通信
- 处理全局状态和用户交互事件
- 提供错误处理和主题切换功能

#### 2. 数据处理模块 (`data-loader.js` 和 `data-adapter.js`)

- 负责加载和处理历史事件、迁徙路线等JSON数据
- 提供数据过滤、转换和适配功能
- 处理数据缓存和异步加载

#### 3. 地图核心模块 (`map-core.js`)

- 初始化和管理Leaflet地图实例
- 提供基础地图功能和配置
- 协调不同地图功能层的交互

#### 4. 地图功能模块
- **地图工具** (`map-utils.js`): 提供地图数据处理和样式工具
- **地图样式** (`map-styles.js`): 定义地图视觉风格和主题
- **地图事件** (`map-events.js`): 管理地图上的历史事件标记
- **地图迁徙** (`map-migrations.js`): 处理人口迁徙路线的显示
- **地图特性** (`map-features.js`): 提供额外的地图交互功能

#### 5. 时间轴管理器 (`timeline-manager.js`)

- 管理时间轴UI和年份控制
- 处理年份变化事件和播放控制
- 提供时间定位和导航功能

#### 6. 事件管理器 (`events-manager.js`)

- 管理事件列表显示和交互
- 处理事件筛选、搜索和排序
- 提供事件详情显示功能

#### 7. 用户界面模块 (`intro.js`)

- 提供应用介绍和引导功能
- 管理用户首次体验流程

### 数据流

1. 用户交互（如滑动时间轴）产生事件
2. 事件被相应的管理器捕获（如TimelineManager）
3. 管理器通知应用核心(`app.js`)
4. 应用核心协调其他模块更新状态：
   - 更新地图显示（通过MapCore）
   - 更新事件列表（通过MapEvents）
   - 更新迁徙路线（通过MapMigrations）
5. 各模块通过DataLoader获取所需数据
6. UI更新完成，呈现给用户

### 模块依赖关系

```
main.js
 └── app.js
      ├── data-loader.js
      │    └── data-adapter.js
      ├── map-core.js
      │    ├── map-utils.js
      │    ├── map-styles.js
      │    ├── map-events.js
      │    ├── map-migrations.js
      │    └── map-features.js
      ├── timeline-manager.js
      ├── events-manager.js
      └── intro.js
```

## 数据说明

项目包含多种历史数据，存储在 `data/` 目录下：

- `all_events.json`: 主要历史事件
- `migrations.json`: 人口迁徙路线
- `technologies.json`: 技术发展事件
- `species.json`: 物种驯化历史
- `civilizations.json`: 文明演变数据
- `wars.json`: 主要战争数据
- `diseases.json`: 疾病传播历史
- `agriculture.json`: 农业发展历史

## 部署指南

### 从 GitHub 部署到 Cloudflare Pages

#### 准备工作

1. 确保您有一个 Cloudflare 账号
2. 将项目推送到 GitHub 仓库

#### 部署步骤

1. 登录到 Cloudflare 控制面板
2. 前往 "Pages" 部分，点击 "连接到 Git"
3. 选择您的 GitHub 账号并授权 Cloudflare 访问
4. 选择您的历史地图仓库
5. 配置部署设置：
   - 构建设置: 无需设置 (静态网站)
   - 构建命令: 留空
   - 构建输出目录: 留空 (使用根目录)
6. 点击 "保存并部署"

#### 关键配置文件

项目已包含以下重要配置文件：

- `_headers`: 配置HTTP响应头，解决CORS问题
- `_redirects`: 确保单页应用的路由功能正常工作
- `404.html`: 自定义404错误页面
- `robots.txt`: 指导搜索引擎爬取规则

## 本地开发

1. 克隆仓库到本地
```bash
git clone https://github.com/yourusername/worldhistoryviz.git
cd worldhistoryviz
```

2. 安装并启动本地服务器（如http-server）：
```bash
npm install -g http-server
http-server -p 8080
```

3. 在浏览器中打开 [http://localhost:8080](http://localhost:8080)

## 扩展开发

### 添加新数据类型

1. 在 `data/` 目录中添加新的JSON数据文件
2. 在 `data-loader.js` 中添加相应的加载函数
3. 在 `app.js` 中更新数据加载流程
4. 根据需要在相应的管理器中添加处理新数据类型的函数

### 添加新视图或交互模式

1. 创建新的管理器模块（如 `analysis-view.js`）
2. 在 `app.js` 中集成该模块
3. 更新 HTML 添加必要的UI元素
4. 在 CSS 中添加相应的样式

### 自定义地图样式

修改 `js/map-styles.js` 中的样式配置，调整地图显示效果。

### 性能优化

- 大型GeoJSON文件可能影响性能，考虑使用简化版地图或预处理
- 项目已使用异步加载和懒加载技术减少初始加载时间
- 对频繁的用户输入事件使用节流和防抖技术
- 通过缓存机制避免重复加载相同的地图数据

## 许可证

MIT 