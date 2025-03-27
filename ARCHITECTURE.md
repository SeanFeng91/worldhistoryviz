# 世界历史地图可视化 - 架构文档

## 系统架构概述

本项目采用模块化设计，将功能划分为不同的模块，每个模块负责特定的功能域。模块之间通过明确定义的接口进行通信，降低了耦合度，提高了代码的可维护性和可扩展性。

## 核心模块说明

### 1. 应用核心 (app.js)

应用的入口点和核心协调器，负责：

- 初始化各个功能模块
- 协调模块间的通信
- 管理全局状态
- 处理用户交互事件

### 2. 数据加载器 (data-loader.js)

负责所有数据的加载和处理：

- 加载历史事件、迁徙路线等JSON数据
- 提供数据筛选、排序等实用函数
- 错误处理和数据格式化
- 异步数据加载的状态管理

### 3. 地图工具库 (map-utils.js)

提供与地图和GeoJSON数据处理相关的工具函数：

- 加载和处理GeoJSON数据
- 根据年份查找合适的历史地图
- 格式化坐标和地图数据
- 提供样式和格式化函数

### 4. 地图管理器 (map-manager.js)

管理地图的显示和交互：

- 初始化Leaflet地图
- 更新地图到特定年份
- 添加和管理标记、路线等图层
- 处理地图交互事件

### 5. 时间轴管理器 (timeline-manager.js)

管理时间轴和年份控制：

- 初始化时间轴UI组件
- 处理年份变化事件
- 管理播放控制功能
- 同步UI与当前年份状态

### 6. 事件管理器 (events-manager.js)

管理历史事件的显示和交互：

- 渲染事件列表
- 处理事件筛选和排序
- 显示事件详情
- 管理事件选择和高亮

## 数据流

![数据流图](data-flow.png)

1. 用户交互（如滑动时间轴）产生事件
2. 事件被相应的管理器捕获（如TimelineManager）
3. 管理器通知应用核心(app.js)
4. 应用核心协调其他模块更新状态：
   - 通知MapManager更新地图
   - 通知EventsManager更新事件列表
5. 各管理器使用DataLoader获取所需数据
6. 各管理器使用MapUtils中的工具函数处理数据
7. UI更新完成

## 模块依赖关系

```
app.js
 ├── data-loader.js
 ├── map-utils.js
 ├── map-manager.js (依赖于 map-utils.js, data-loader.js)
 ├── timeline-manager.js (依赖于 map-utils.js)
 └── events-manager.js (依赖于 data-loader.js, map-utils.js)
```

## 关键类和对象

### MapManager

```javascript
class MapManager {
  constructor(mapElementId);
  initialize();
  updateToYear(year, data);
  toggleEvents(show);
  toggleMigrations(show);
  highlightEvent(eventId);
}
```

### TimelineManager

```javascript
class TimelineManager {
  constructor(options);
  initialize();
  setYearChangedCallback(callback);
  updateToYear(year);
  togglePlay();
  getCurrentYear();
}
```

### EventsManager

```javascript
class EventsManager {
  constructor(eventsListId, eventDetailsId);
  setEventSelectedCallback(callback);
  updateEventsList(events, year);
  filterByCategory(category);
  highlightEventsForYear(year);
}
```

### 主应用类

```javascript
class HistoryMapApp {
  constructor();
  initialize();
  loadData();
  handleYearChanged(year);
  handleEventSelected(eventId);
}
```

## 扩展指南

### 添加新数据类型

1. 在 `data/` 目录中添加新的JSON数据文件
2. 在 `data-loader.js` 中添加相应的加载函数
3. 在 `app.js` 中更新数据加载过程
4. 必要时在相应的管理器中添加处理新数据类型的函数

### 添加新视图或交互模式

1. 创建新的管理器模块（例如 `analytics-manager.js`）
2. 在 `app.js` 中集成该模块
3. 更新 HTML 添加必要的UI元素
4. 在 CSS 中添加相应的样式

### 自定义地图样式

修改 `map-manager.js` 中的 `updateGeoJSONLayer()` 方法，调整地图样式选项。

## 性能考虑

- 大型GeoJSON文件可能影响性能，考虑使用简化版地图或预处理
- 使用了异步加载和懒加载技术减少初始加载时间
- 使用节流和防抖技术处理频繁的用户输入事件
- 使用缓存机制避免重复加载相同的地图数据 