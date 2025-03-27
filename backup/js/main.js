/**
 * 《枪炮、病毒与钢铁》历史地图可视化 - 主脚本
 * 基于historical-basemaps项目实现历史地图、事件和迁徙路线的交互可视化
 */

import { getMapForYear, isEventRelevant, isMigrationRelevant, getKeyYears, findClosestMapFile } from './map-utils.js';
import { historyEvents } from './events-data.js';
import { migrations } from './migrations-data.js';

// 全局变量
let map;
let timelineSlider;
let currentYear = 0;
let currentGeoJSON;
let markersLayer;
let routesLayer;
let playInterval;
let playSpeed = 50; // 默认速度：每帧前进50年
let showEvents = true;
let showMigrations = true;
let jsonData = {}; // 存储从data目录加载的JSON数据

// 颜色映射 - 对应不同文明/地区
const colorMap = {
    'mesopotamia': '#f39c12', // 美索不达米亚 - 橙色
    'egypt': '#e74c3c',      // 埃及 - 红色
    'indus_valley': '#9b59b6', // 印度河流域 - 紫色
    'china': '#e67e22',       // 中国 - 橙红色
    'mesoamerica': '#27ae60', // 中美洲 - 绿色
    'andes': '#16a085',       // 安第斯 - 蓝绿色
    'europe': '#3498db',      // 欧洲 - 蓝色
    'africa': '#f1c40f',      // 非洲 - 黄色
    'oceania': '#1abc9c',     // 大洋洲 - 青色
    'north_america': '#2ecc71', // 北美洲 - 浅绿色
    'south_america': '#e67e22', // 南美洲 - 橙色
    'antarctica': '#bdc3c7',   // 南极洲 - 灰色
    'persian': '#d35400',     // 波斯 - 深橙色
    'greek': '#3498db',       // 希腊 - 蓝色
    'roman': '#c0392b',       // 罗马 - 深红色
    'byzantine': '#8e44ad',   // 拜占庭 - 深紫色
    'islamic': '#2c3e50',     // 伊斯兰 - 深蓝色
    'mongol': '#d35400',      // 蒙古 - 棕色
    'inca': '#27ae60',        // 印加 - 绿色
    'aztec': '#16a085',       // 阿兹特克 - 蓝绿色
    'maya': '#f39c12',        // 玛雅 - 橙色
    'default': '#95a5a6'      // 默认 - 灰色
};

// DOM 元素引用
const currentYearDisplay = document.getElementById('current-year');
const yearInput = document.getElementById('year-input');
const eventsList = document.getElementById('events-list');
const eventDetails = document.getElementById('event-details');
const playBtn = document.getElementById('play-btn');
const speedDropdown = document.getElementById('speed-dropdown');
const toggleEventsBtn = document.getElementById('toggle-events');
const toggleMigrationsBtn = document.getElementById('toggle-migrations');

// 时间轴常量
const TIME_SPAN = 2000; // 时间轴显示的年份跨度
const MIN_YEAR = -10000; // 最小年份
const MAX_YEAR = 2000;   // 最大年份

// 初始化函数
function init() {
    console.log('初始化世界历史可视化应用...');
    
    // 创建错误提示框
    createErrorBox();
    
    // 创建加载中提示
    createLoadingIndicator();
    
    // 初始化地图
    initMap();
    
    // 初始化时间轴
    initTimeline();
    
    // 初始化事件面板
    initEventsPanel();
    
    // 初始化控件
    initControls();
    
    // 初始化事件列表
    renderEventsList();
    
    // 初始化类别按钮
    initCategoryButtons();
    
    // 加载data目录中的JSON数据
    loadDataFiles();
    
    // 更新到默认年份
    updateToYear(currentYear);
    
    console.log('应用初始化完成');
}

// 创建错误提示框
function createErrorBox() {
    const errorBox = document.createElement('div');
    errorBox.id = 'error-box';
    errorBox.classList.add('error-box');
    errorBox.style.display = 'none';
    document.body.appendChild(errorBox);
}

// 创建加载中提示
function createLoadingIndicator() {
    const loader = document.createElement('div');
    loader.id = 'map-loader';
    loader.classList.add('map-loader');
    loader.innerHTML = `
        <div class="loader-spinner"></div>
        <div class="loader-text">加载地图中...</div>
    `;
    loader.style.display = 'none';
    
    // 修正为使用id为'map'的元素，而不是'map-container'
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        mapContainer.appendChild(loader);
    } else {
        console.error('找不到地图容器元素(id="map")');
    }
}

// 初始化地图
function initMap() {
    console.log('初始化地图...');
    
    // 创建地图，中心设在世界中心点
    map = L.map('map', {
        center: [30, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 8
    });
    
    // 添加浅色底图
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        opacity: 0.5
    }).addTo(map);
    
    // 创建标记和路线图层
    markersLayer = L.layerGroup().addTo(map);
    routesLayer = L.layerGroup().addTo(map);
    
    console.log('地图初始化完成');
}

// 初始化时间轴
function initTimeline() {
    console.log('初始化时间轴');
    
    try {
        const yearSlider = document.getElementById('year-slider');
        const yearInput = document.getElementById('year-input');
        const goToYearBtn = document.getElementById('go-to-year');
        
        // 设置时间范围
        if (yearSlider) {
            yearSlider.min = MIN_YEAR;
            yearSlider.max = MAX_YEAR;
            yearSlider.value = currentYear;
            
            // 监听滑块变化事件
            yearSlider.addEventListener('input', function(e) {
                const year = parseInt(e.target.value);
                updateYearDisplay(year);
            });
            
            yearSlider.addEventListener('change', function(e) {
                const year = parseInt(e.target.value);
                updateToYear(year);
            });
        }
        
        // 设置年份输入框
        if (yearInput && goToYearBtn) {
            // 跳转按钮点击事件
            goToYearBtn.addEventListener('click', function() {
                const inputYear = parseInt(yearInput.value);
                if (!isNaN(inputYear) && inputYear >= MIN_YEAR && inputYear <= MAX_YEAR) {
                    updateToYear(inputYear);
                    yearSlider.value = currentYear;
                }
            });
            
            // 输入框回车事件
            yearInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const inputYear = parseInt(this.value);
                    if (!isNaN(inputYear) && inputYear >= MIN_YEAR && inputYear <= MAX_YEAR) {
                        updateToYear(inputYear);
                        yearSlider.value = currentYear;
                    }
                }
            });
        }
        
        console.log('时间轴初始化完成');
    } catch (error) {
        console.error('初始化时间轴出错:', error);
        showErrorMessage('初始化时间轴失败');
    }
}

// 更新年份显示
function updateYearDisplay(year) {
    try {
        const yearDisplay = document.getElementById('year-display');
        if (!yearDisplay) {
            console.warn('未找到年份显示元素');
            return;
        }
        
        const yearInt = parseInt(year);
        
        if (isNaN(yearInt)) {
            console.warn(`无效的年份值: ${year}`);
            return;
        }
        
        if (yearInt < 0) {
            yearDisplay.textContent = `公元前 ${Math.abs(yearInt)} 年`;
        } else {
            yearDisplay.textContent = `公元 ${yearInt} 年`;
        }
    } catch (error) {
        console.error('更新年份显示时发生错误:', error);
    }
}

// 更新地图显示
async function updateMap(year) {
    try {
        console.log(`==== 开始更新地图，年份: ${year} ====`);
        currentYear = parseInt(year);
        
        // 更新页面上的年份输入框
        if (yearInput) {
            yearInput.value = currentYear;
        }
        
        // 清除现有图层
        clearMapLayers();
        
        // 显示加载中提示
        showLoadingIndicator(true);
        
        try {
            // 获取地图数据
            console.log(`正在获取年份 ${currentYear} 的地图数据...`);
            const geoJSON = await getMapForYear(currentYear);
            
            if (!geoJSON) {
                console.error(`无法为年份 ${currentYear} 加载地图数据`);
                showLoadingIndicator(false);
                showErrorMessage(`无法加载${formatYear(currentYear)}的地图数据，请稍后再试`);
                return;
            }
            
            // 保存当前GeoJSON数据
            currentGeoJSON = geoJSON;
            
            // 添加GeoJSON图层到地图
            console.log('添加GeoJSON图层到地图...');
            addGeoJSONLayer(geoJSON);
            
            // 更新事件和迁徙路线
            console.log('更新事件标记...');
            updateEvents();
            
            console.log('更新迁徙路线...');
            updateMigrations();
            
            // 更新事件列表
            console.log('更新事件列表...');
            renderEventsList();
            
            console.log(`地图已更新到${formatYear(currentYear)}`);
        } catch (error) {
            console.error('更新地图时发生错误:', error);
            showErrorMessage('更新地图时发生错误: ' + error.message);
        } finally {
            showLoadingIndicator(false);
            console.log(`==== 地图更新完成 ====`);
        }
    } catch (error) {
        console.error('更新地图的外层处理中发生错误:', error);
        showErrorMessage('更新地图时发生错误: ' + error.message);
        showLoadingIndicator(false);
    }
}

// 清除地图图层
function clearMapLayers() {
    console.log('清除现有地图图层');
    
    // 移除GeoJSON图层
    map.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON) {
            map.removeLayer(layer);
        }
    });
    
    // 清除标记和路线
    markersLayer.clearLayers();
    routesLayer.clearLayers();
}

// 添加GeoJSON图层到地图
function addGeoJSONLayer(geoJSON) {
    try {
        console.log(`添加GeoJSON图层，包含 ${geoJSON.features.length} 个特征`);
        
        // 检查GeoJSON数据是否有效
        if (!geoJSON || !geoJSON.features || !Array.isArray(geoJSON.features)) {
            console.error('无效的GeoJSON数据');
            showErrorMessage('地图数据格式错误');
            return;
        }
        
        // 记录一些数据示例用于调试
        const featureSample = geoJSON.features.slice(0, 3);
        console.log('GeoJSON特征示例:', featureSample);
        
        // 检查特征是否具有必要的属性
        const hasValidProperties = geoJSON.features.some(feature => 
            feature.properties && (
                feature.properties.type || 
                feature.properties.name || 
                feature.properties.NAME ||
                feature.properties.region || 
                feature.properties.category
            )
        );
        
        if (!hasValidProperties) {
            console.warn('GeoJSON数据缺少关键属性（type、name、region或category）');
        }
        
        // 创建GeoJSON图层
        const geoJSONLayer = L.geoJSON(geoJSON, {
            style: function(feature) {
                try {
                    const color = getCountryColor(feature);
                    // 减少日志输出，只显示颜色分配
                    // console.log(`为特征 "${feature.properties?.name || feature.properties?.NAME || '未命名'}" 设置颜色: ${color}`);
                    return {
                        fillColor: color,
                        weight: 1,
                        opacity: 0.8,
                        color: '#666',
                        fillOpacity: 0.6
                    };
                } catch (error) {
                    console.error('获取特征颜色时出错:', error);
                    return {
                        fillColor: '#AAAAAA',
                        weight: 1,
                        opacity: 0.8,
                        color: '#666',
                        fillOpacity: 0.6
                    };
                }
            },
            onEachFeature: function(feature, layer) {
                try {
                    // 检查是否有任何可用于显示的属性
                    const name = feature.properties?.NAME || 
                                feature.properties?.name || 
                                feature.properties?.SUBJECTO || 
                                feature.properties?.subject || 
                                '未命名区域';
                    
                    let popupContent = `<div class="map-popup">
                        <h3>${name}</h3>`;
                    
                    // 添加描述（如果有）
                    if (feature.properties?.description || feature.properties?.DESCRIPTION) {
                        popupContent += `<p>${feature.properties.description || feature.properties.DESCRIPTION}</p>`;
                    }
                    
                    // 添加其他可能有用的属性
                    if (feature.properties?.PARTOF) {
                        popupContent += `<p><strong>所属:</strong> ${feature.properties.PARTOF}</p>`;
                    }
                    
                    if (feature.properties?.type || feature.properties?.TYPE) {
                        popupContent += `<p><strong>类型:</strong> ${feature.properties.type || feature.properties.TYPE}</p>`;
                    }
                    
                    popupContent += `</div>`;
                    
                    layer.bindPopup(popupContent);
                    
                    layer.on('mouseover', function(e) {
                        this.setStyle({
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 0.8
                        });
                        this.bringToFront();
                    });
                    
                    layer.on('mouseout', function(e) {
                        this.setStyle({
                            weight: 1,
                            opacity: 0.8,
                            fillOpacity: 0.6
                        });
                    });
                } catch (error) {
                    console.error('设置特征弹出窗口时出错:', error);
                }
            }
        }).addTo(map);
        
        console.log('GeoJSON图层添加完成');
        return geoJSONLayer;
    } catch (error) {
        console.error('添加GeoJSON图层时发生错误:', error);
        showErrorMessage('地图数据加载错误: ' + error.message);
        return null;
    }
}

// 获取国家颜色
function getCountryColor(feature) {
    // 添加调试信息
    // console.log('处理地图颜色，特征数据:', feature);
    
    // 检查feature对象是否有效
    if (!feature) {
        console.warn('特征对象为空');
        return '#AAAAAA';
    }
    
    // 检查特征属性
    if (!feature.properties) {
        console.warn('特征没有properties属性');
        return '#AAAAAA'; 
    }
    
    // 提取国家/地区/帝国名称 - historical-basemaps使用NAME或SUBJECTO字段
    const countryName = feature.properties.NAME || 
                      feature.properties.SUBJECTO || 
                      feature.properties.name || 
                      feature.properties.subject ||
                      feature.properties.COUNTRY ||
                      feature.properties.country;
    
    if (!countryName) {
        console.warn('无法确定地区名称，使用默认颜色');
        return '#AAAAAA';
    }
    
    // 使用国家/地区名称来确定颜色
    const lowerName = countryName.toLowerCase();
    
    // 亚洲国家/地区
    if (lowerName.includes('china') || lowerName.includes('qing') || lowerName.includes('han') || 
        lowerName.includes('中国') || lowerName.includes('清') || lowerName.includes('汉')) {
        return '#CD5C5C'; // 中国红色
    } 
    
    if (lowerName.includes('japan') || lowerName.includes('nihon') || lowerName.includes('日本')) {
        return '#FF6347'; // 日本红色
    }
    
    if (lowerName.includes('korea') || lowerName.includes('朝鲜') || lowerName.includes('韩国')) {
        return '#87CEEB'; // 朝鲜/韩国蓝色
    }
    
    if (lowerName.includes('india') || lowerName.includes('mughal') || lowerName.includes('maurya') || 
        lowerName.includes('印度')) {
        return '#FF8C00'; // 印度橙色
    }
    
    if (lowerName.includes('mongol') || lowerName.includes('蒙古')) {
        return '#D2691E'; // 蒙古棕色
    }
    
    if (lowerName.includes('persia') || lowerName.includes('iran') || lowerName.includes('波斯') || 
        lowerName.includes('伊朗')) {
        return '#DAA520'; // 波斯/伊朗金色
    }
    
    if (lowerName.includes('ottoman') || lowerName.includes('turkey') || lowerName.includes('奥斯曼') || 
        lowerName.includes('土耳其')) {
        return '#4682B4'; // 奥斯曼/土耳其蓝色
    }
    
    // 欧洲国家/地区
    if (lowerName.includes('roman') || lowerName.includes('rome') || lowerName.includes('罗马')) {
        return '#B22222'; // 罗马深红色
    }
    
    if (lowerName.includes('byzantine') || lowerName.includes('拜占庭')) {
        return '#9370DB'; // 拜占庭紫色
    }
    
    if (lowerName.includes('greek') || lowerName.includes('greece') || lowerName.includes('希腊')) {
        return '#6495ED'; // 希腊蓝色
    }
    
    if (lowerName.includes('british') || lowerName.includes('england') || lowerName.includes('britain') || 
        lowerName.includes('uk') || lowerName.includes('united kingdom') || lowerName.includes('英国')) {
        return '#1E90FF'; // 英国蓝色
    }
    
    if (lowerName.includes('france') || lowerName.includes('french') || lowerName.includes('法国')) {
        return '#3CB371'; // 法国绿色
    }
    
    if (lowerName.includes('germany') || lowerName.includes('german') || lowerName.includes('deutschland') || 
        lowerName.includes('德国')) {
        return '#808080'; // 德国灰色
    }
    
    if (lowerName.includes('spain') || lowerName.includes('spanish') || lowerName.includes('españa') || 
        lowerName.includes('西班牙')) {
        return '#FFA07A'; // 西班牙浅橙色
    }
    
    if (lowerName.includes('portugal') || lowerName.includes('portuguese') || lowerName.includes('葡萄牙')) {
        return '#32CD32'; // 葡萄牙绿色
    }
    
    if (lowerName.includes('russia') || lowerName.includes('russian') || lowerName.includes('ussr') || 
        lowerName.includes('soviet') || lowerName.includes('俄罗斯') || lowerName.includes('苏联')) {
        return '#DC143C'; // 俄罗斯/苏联红色
    }
    
    if (lowerName.includes('austria') || lowerName.includes('austrian') || lowerName.includes('奥地利')) {
        return '#D2B48C'; // 奥地利棕色
    }
    
    if (lowerName.includes('hungary') || lowerName.includes('hungarian') || lowerName.includes('匈牙利')) {
        return '#FFB6C1'; // 匈牙利粉色
    }
    
    if (lowerName.includes('habsburg') || lowerName.includes('austro-hungarian') || 
        lowerName.includes('奥匈帝国')) {
        return '#DEB887'; // 哈布斯堡/奥匈帝国浅棕色
    }
    
    // 美洲国家/地区
    if (lowerName.includes('usa') || lowerName.includes('united states') || lowerName.includes('america') || 
        lowerName.includes('美国')) {
        return '#4169E1'; // 美国蓝色
    }
    
    if (lowerName.includes('canada') || lowerName.includes('canadian') || lowerName.includes('加拿大')) {
        return '#CD5C5C'; // 加拿大红色
    }
    
    if (lowerName.includes('mexico') || lowerName.includes('mexican') || lowerName.includes('墨西哥')) {
        return '#228B22'; // 墨西哥绿色
    }
    
    if (lowerName.includes('brazil') || lowerName.includes('brazilian') || lowerName.includes('巴西')) {
        return '#32CD32'; // 巴西绿色
    }
    
    if (lowerName.includes('argentina') || lowerName.includes('阿根廷')) {
        return '#87CEFA'; // 阿根廷蓝色
    }
    
    // 非洲国家/地区
    if (lowerName.includes('egypt') || lowerName.includes('egyptian') || lowerName.includes('埃及')) {
        return '#FFD700'; // 埃及金色
    }
    
    if (lowerName.includes('ethiopia') || lowerName.includes('ethiopian') || lowerName.includes('埃塞俄比亚')) {
        return '#8B4513'; // 埃塞俄比亚棕色
    }
    
    // 使用一些基于国家首字母的默认颜色，确保相邻国家颜色不同
    const firstChar = lowerName.charAt(0);
    const colorPool = [
        '#FF6347', // 红色
        '#4682B4', // 蓝色
        '#2E8B57', // 绿色
        '#DAA520', // 金色
        '#9370DB', // 紫色
        '#FF8C00', // 橙色
        '#20B2AA', // 青色
        '#B22222', // 深红色
        '#8B4513', // 棕色
        '#483D8B'  // 靛蓝色
    ];
    
    // 使用首字母的ASCII码取余数来选择颜色
    const colorIndex = firstChar.charCodeAt(0) % colorPool.length;
    console.log(`为国家/地区 "${countryName}" 分配颜色: ${colorPool[colorIndex]}`);
    return colorPool[colorIndex];
}

// 更新事件标记
function updateEvents() {
    console.log(`更新事件标记，当前年份: ${currentYear}`);
    
    // 添加调试信息
    console.log('历史事件总数:', historyEvents ? historyEvents.length : 0);
    
    // 如果没有启用事件显示，则返回
    if (!showEvents) {
        console.log('事件显示已禁用');
        return;
    }
    
    // 清除现有标记
    markersLayer.clearLayers();
    
    // 检查historyEvents是否存在
    if (!historyEvents || !Array.isArray(historyEvents) || historyEvents.length === 0) {
        console.error('历史事件数据不可用或为空');
        showErrorMessage('历史事件数据加载失败');
        return;
    }
    
    // 筛选相关事件
    const relevantEvents = historyEvents.filter(event => {
        try {
            // 执行事件筛选
            const isRelevant = isEventRelevant(event, currentYear);
            return isRelevant;
        } catch (error) {
            console.error(`筛选事件 "${event.title}" 时出错:`, error);
            return false;
        }
    });
    
    console.log(`找到 ${relevantEvents.length} 个相关事件`);
    
    // 如果没有相关事件
    if (relevantEvents.length === 0) {
        console.log(`在年份 ${currentYear} 没有相关历史事件`);
        return;
    }
    
    // 为每个事件创建标记
    relevantEvents.forEach(event => {
        try {
            // 检查location对象及其经纬度属性
            if (!event.location) {
                console.warn(`事件 "${event.title}" 没有位置信息`);
                return;
            }
            
            // 处理不同格式的位置数据
            let lat, lng;
            
            // 在日志中输出事件位置数据结构，帮助调试
            console.log(`事件 "${event.title}" 的位置数据:`, event.location);
            
            // 如果location是数组格式 [lat, lng] 或 [lng, lat]
            if (Array.isArray(event.location)) {
                // 确保数组中有足够的元素
                if (event.location.length < 2) {
                    console.warn(`事件 "${event.title}" 的位置数组格式不正确:`, event.location);
                    return;
                }
                
                // 假设格式是 [lng, lat]，因为GeoJSON通常是这种格式
                lng = event.location[0];
                lat = event.location[1];
                
                // 但如果看起来像是 [lat, lng] 格式（避免纬度超出±90度范围）
                if (Math.abs(event.location[0]) <= 90 && Math.abs(event.location[1]) <= 180) {
                    lat = event.location[0];
                    lng = event.location[1];
                }
                
                console.log(`解析后的坐标: [${lat}, ${lng}]`);
            } 
            // 如果location是对象格式 {lat, lng} 或 {latitude, longitude}
            else if (typeof event.location === 'object') {
                lat = event.location.lat || event.location.latitude;
                lng = event.location.lng || event.location.longitude;
            }
            
            // 检查经纬度值是否有效
            if (typeof lat !== 'undefined' && typeof lng !== 'undefined' && 
                !isNaN(lat) && !isNaN(lng)) {
                
                // 确保经纬度值在合理范围内
                if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
                    console.warn(`事件 "${event.title}" 的坐标值超出合理范围: [${lat}, ${lng}]`);
                    return;
                }
                
                // 创建标记
                try {
                    // 确保使用正确的坐标顺序: [纬度, 经度]
                    const marker = L.marker([lat, lng], {
                        icon: createEventIcon(event.category || 'default')
                    });
                    
                    // 创建弹出框内容
                    const popupContent = `
                        <div class="event-popup">
                            <h3>${event.title}</h3>
                            <p class="event-year">${formatYear(event.year)}${event.endYear ? ` 至 ${formatYear(event.endYear)}` : ''}</p>
                            <p>${event.description}</p>
                            <p><strong>坐标:</strong> [${lat.toFixed(2)}, ${lng.toFixed(2)}]</p>
                        </div>
                    `;
                    
                    marker.bindPopup(popupContent);
                    
                    // 将marker添加到图层
                    markersLayer.addLayer(marker);
                    
                    // 给DOM元素添加数据属性
                    marker.on('add', function() {
                        const element = this.getElement();
                        if (element) {
                            element.setAttribute('data-category', event.category || 'default');
                        }
                    });
                    
                    console.log(`已添加事件标记: "${event.title}" 在位置 [${lat}, ${lng}]`);
                } catch (error) {
                    console.error(`为事件 "${event.title}" 创建标记时出错:`, error);
                }
            } else {
                console.warn(`事件 "${event.title}" 的位置坐标无效:`, event.location);
            }
        } catch (error) {
            console.error(`处理事件 "${event.title}" 时出错:`, error);
        }
    });
}

// 创建事件图标
function createEventIcon(category) {
    // 根据事件类别创建不同的图标
    const iconMap = {
        '农业': 'tree',
        '技术': 'cog',
        '文明': 'tower',
        '征服': 'fire',
        '疾病': 'plus',
        '迁徙': 'road',
        'default': 'info-sign'
    };
    
    const iconType = iconMap[category] || iconMap['default'];
    
    return L.divIcon({
        className: `event-icon ${category}`,
        html: `<i class="fas fa-${iconType}"></i>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

// 更新迁徙路线
function updateMigrations() {
    console.log(`更新迁徙路线，当前年份: ${currentYear}`);
    
    // 清除现有路线
    routesLayer.clearLayers();
    
    // 筛选相关迁徙路线
    const relevantMigrations = migrations.filter(migration => isMigrationRelevant(migration, currentYear));
    console.log(`找到 ${relevantMigrations.length} 条相关迁徙路线`);
    
    // 为每条迁徙路线创建线条
    relevantMigrations.forEach(migration => {
        // 确保路线数组存在且至少有两个点
        if (migration.route && migration.route.length >= 2) {
            // 验证所有坐标点都有效
            const validRoute = migration.route.every(point => 
                Array.isArray(point) && point.length === 2 && 
                typeof point[0] !== 'undefined' && typeof point[1] !== 'undefined');
            
            if (validRoute) {
                // 创建路线
                const route = L.polyline(migration.route, {
                    color: getMigrationColor(migration.category),
                    weight: 3,
                    opacity: 0.7,
                    dashArray: '5, 10'
                });
                
                // 创建弹出框内容
                const popupContent = `
                    <div class="migration-popup">
                        <h3>${migration.title}</h3>
                        <p class="migration-year">${formatYear(migration.startYear)}${migration.endYear ? ` 至 ${formatYear(migration.endYear)}` : ''}</p>
                        <p>${migration.description}</p>
                    </div>
                `;
                
                route.bindPopup(popupContent);
                routesLayer.addLayer(route);
                
                // 添加方向箭头
                addDirectionArrows(route, migration.title);
            } else {
                console.warn(`迁徙路线 "${migration.title}" 包含无效坐标点:`, migration.route);
            }
        }
    });
}

// 添加方向箭头
function addDirectionArrows(line, title) {
    const points = line.getLatLngs();
    if (points.length < 2) return;
    
    // 在每条线的中点添加一个箭头
    for (let i = 0; i < points.length - 1; i++) {
        // 确保两个点都有有效的经纬度
        if (isValidLatLng(points[i]) && isValidLatLng(points[i + 1])) {
            const midPoint = getMidPoint(points[i], points[i + 1]);
            const angle = getAngle(points[i], points[i + 1]);
            
            const arrowIcon = L.divIcon({
                className: 'migration-arrow',
                html: `<div style="transform: rotate(${angle}deg)">→</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            const marker = L.marker(midPoint, { icon: arrowIcon });
            marker.bindTooltip(title);
            routesLayer.addLayer(marker);
        }
    }
}

// 验证是否为有效的经纬度点
function isValidLatLng(point) {
    return point && typeof point.lat === 'number' && typeof point.lng === 'number' && 
           !isNaN(point.lat) && !isNaN(point.lng);
}

// 获取两点之间的中点
function getMidPoint(p1, p2) {
    // 确保两个点的经纬度都有效
    if (!isValidLatLng(p1) || !isValidLatLng(p2)) {
        console.warn('尝试计算中点，但提供了无效的坐标:', p1, p2);
        return [0, 0]; // 返回一个默认值，避免错误
    }
    
    return [
        (p1.lat + p2.lat) / 2,
        (p1.lng + p2.lng) / 2
    ];
}

// 获取两点之间的角度
function getAngle(p1, p2) {
    // 确保两个点的经纬度都有效
    if (!isValidLatLng(p1) || !isValidLatLng(p2)) {
        console.warn('尝试计算角度，但提供了无效的坐标:', p1, p2);
        return 0; // 返回一个默认值，避免错误
    }
    
    return (Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * 180 / Math.PI) + 90;
}

// 获取迁徙路线颜色
function getMigrationColor(category) {
    // 根据迁徙类别设置颜色
    const colorMap = {
        '早期人类': '#FF4500',     // 橙红色
        '农业扩散': '#4CAF50',     // 绿色
        '人口迁徙': '#9932CC',     // 紫色
        '航海扩张': '#1E90FF',     // 蓝色
        '帝国扩张': '#8B0000',     // 深红色
        '疾病传播': '#FF9800',     // 橙色
        '殖民扩张': '#B8860B',     // 暗金色
        '强制迁移': '#FF5722',     // 深橙色
        'default': '#708090'       // 默认灰色
    };
    
    return colorMap[category] || colorMap['default'];
}

// 渲染事件列表
function renderEventsList() {
    console.log('渲染事件列表');
    
    try {
        const eventsContainer = document.getElementById('events-list');
        
        // 如果找不到容器，记录错误并返回
        if (!eventsContainer) {
            console.error('找不到事件列表容器元素');
            return;
        }
        
        // 清空当前内容
        eventsContainer.innerHTML = '';
        
        // 检查historyEvents是否存在
        if (!historyEvents || !Array.isArray(historyEvents)) {
            console.error('历史事件数据不可用');
            eventsContainer.innerHTML = '<p class="error">事件数据加载失败</p>';
            return;
        }
        
        console.log(`筛选当前世纪(${currentYear}年)的事件...`);
        
        // 筛选当前世纪的事件(从当前整百年到下一个整百年)
        const centuryStart = currentYear;
        const centuryEnd = currentYear + 99;
        
        // 筛选当前世纪的事件和前后各50年可能相关的事件
        const relevantEvents = historyEvents.filter(event => {
            const eventYear = event.year;
            
            // 当前世纪内的事件
            if (eventYear >= centuryStart && eventYear <= centuryEnd) {
                return true;
            }
            
            // 检查相邻时期但可能相关的重要事件
            if (event.importance >= 4) {
                // 对于非常重要的事件，扩大相关区间
                const importanceRange = event.importance * 50; // 重要性从1-5，范围从50-250年
                
                if (Math.abs(eventYear - centuryStart) <= importanceRange || 
                    Math.abs(eventYear - centuryEnd) <= importanceRange) {
                    return true;
                }
            }
            
            return false;
        });
        
        console.log(`找到 ${relevantEvents.length} 个相关事件`);
        
        // 按年份排序
        relevantEvents.sort((a, b) => a.year - b.year);
        
        // 如果没有事件，显示消息
        if (relevantEvents.length === 0) {
            eventsContainer.innerHTML = `<p class="no-events">没有找到${formatYear(centuryStart)}至${formatYear(centuryEnd)}的历史事件</p>`;
            return;
        }
        
        // 显示相关事件
        const eventsHTML = relevantEvents.map(event => {
            const yearDisplay = formatYear(event.year);
            const inCurrentCentury = event.year >= centuryStart && event.year <= centuryEnd;
            const itemClass = inCurrentCentury ? 'event-item current-century' : 'event-item';
            
            return `
                <div class="${itemClass}" data-event-id="${event.id}" data-year="${event.year}">
                    <div class="event-header">
                        <span class="event-year">${yearDisplay}</span>
                        <h3 class="event-title">${event.title}</h3>
                    </div>
                    <div class="event-description">${event.description}</div>
                    <div class="event-footer">
                        <span class="event-category">${event.category}</span>
                        <span class="event-importance">重要性: ${'★'.repeat(event.importance || 1)}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        eventsContainer.innerHTML = eventsHTML;
        
        // 添加事件点击处理
        const eventItems = eventsContainer.querySelectorAll('.event-item');
        eventItems.forEach(item => {
            item.addEventListener('click', function() {
                const eventId = parseInt(this.getAttribute('data-event-id'));
                const event = historyEvents.find(e => e.id === eventId);
                if (event) {
                    displayEventDetails(event);
                }
            });
        });
        
        console.log('事件列表渲染完成');
    } catch (error) {
        console.error('渲染事件列表时出错:', error);
    }
}

// 格式化年份显示
function formatYear(year) {
    return year < 0 ? `公元前${Math.abs(year)}年` : `公元${year}年`;
}

// 显示加载中提示
function showLoadingIndicator(show) {
    const loader = document.getElementById('map-loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

// 显示错误消息
function showErrorMessage(message) {
    console.error(message);
    const errorBox = document.getElementById('error-box');
    if (errorBox) {
        errorBox.textContent = message;
        errorBox.style.display = 'block';
        
        // 5秒后自动隐藏
        setTimeout(() => {
            errorBox.style.display = 'none';
        }, 5000);
    }
}

// 初始化事件面板
function initEventsPanel() {
    const panel = document.getElementById('events-panel');
    if (panel) {
        // 创建事件标题
        const panelHeader = document.createElement('div');
        panelHeader.classList.add('panel-header');
        panelHeader.innerHTML = `
            <h3>历史事件</h3>
            <span id="year-info" class="year-info" style="display: none;"></span>
        `;
        panel.appendChild(panelHeader);
        
        // 创建事件列表容器
        const eventsList = document.createElement('div');
        eventsList.id = 'events-list';
        eventsList.classList.add('events-list-container');
        panel.appendChild(eventsList);
    }
}

// 初始化控件
function initControls() {
    // 年份输入框
    yearInput.addEventListener('change', function() {
        let year = parseInt(this.value);
        
        // 确保年份在有效范围内
        year = Math.max(-10000, Math.min(2000, year));
        
        updateToYear(year);
    });
    
    // 年份递增/递减按钮
    document.getElementById('year-decrement-10').addEventListener('click', function() {
        updateToYear(currentYear - 10);
    });
    
    document.getElementById('year-decrement').addEventListener('click', function() {
        updateToYear(currentYear - 1);
    });
    
    document.getElementById('year-increment').addEventListener('click', function() {
        updateToYear(currentYear + 1);
    });
    
    document.getElementById('year-increment-10').addEventListener('click', function() {
        updateToYear(currentYear + 10);
    });
    
    // 跳转到指定年份按钮
    document.getElementById('go-to-year-btn').addEventListener('click', function() {
        const year = parseInt(yearInput.value);
        if (!isNaN(year)) {
            updateToYear(year);
        }
    });
    
    // 播放/暂停按钮
    playBtn.addEventListener('click', function() {
        if (playInterval) {
            // 停止播放
            clearInterval(playInterval);
            playInterval = null;
            playBtn.innerHTML = '<i class="bi bi-play-fill"></i> 播放时间线';
        } else {
            // 开始播放
            playBtn.innerHTML = '<i class="bi bi-pause-fill"></i> 暂停';
            playInterval = setInterval(function() {
                if (currentYear < 2000) {
                    updateToYear(currentYear + playSpeed);
                } else {
                    // 到达最大年份，停止播放
                    clearInterval(playInterval);
                    playInterval = null;
                    playBtn.innerHTML = '<i class="bi bi-play-fill"></i> 播放时间线';
                }
            }, 1000);
        }
    });
    
    // 播放速度下拉菜单
    document.querySelectorAll('#speed-dropdown .dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 更新播放速度
            playSpeed = parseInt(this.dataset.speed);
            
            // 更新活动项
            document.querySelectorAll('#speed-dropdown .dropdown-item').forEach(i => {
                i.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
    
    // 缩放时间按钮
    document.getElementById('zoom-in-time-btn').addEventListener('click', function() {
        // 缩小时间范围（增加精度）
        const min = parseInt(timelineSlider.min);
        const max = parseInt(timelineSlider.max);
        const range = max - min;
        const center = currentYear;
        
        // 将范围缩小为原来的一半，并保持当前年份居中
        const newMin = Math.max(-10000, center - range / 4);
        const newMax = Math.min(2000, center + range / 4);
        
        timelineSlider.min = newMin;
        timelineSlider.max = newMax;
        timelineSlider.value = currentYear;
        
        // 更新年份范围显示
        document.querySelector('.timeline-years div:first-child').textContent = formatYear(newMin).replace('年', '');
        document.querySelector('.timeline-years div:last-child').textContent = formatYear(newMax).replace('年', '');
    });
    
    document.getElementById('zoom-out-time-btn').addEventListener('click', function() {
        // 扩大时间范围（减少精度）
        const min = parseInt(timelineSlider.min);
        const max = parseInt(timelineSlider.max);
        const range = max - min;
        const center = currentYear;
        
        // 将范围扩大为原来的两倍，并保持当前年份居中
        const newMin = Math.max(-10000, center - range);
        const newMax = Math.min(2000, center + range);
        
        timelineSlider.min = newMin;
        timelineSlider.max = newMax;
        timelineSlider.value = currentYear;
        
        // 更新年份范围显示
        document.querySelector('.timeline-years div:first-child').textContent = formatYear(newMin).replace('年', '');
        document.querySelector('.timeline-years div:last-child').textContent = formatYear(newMax).replace('年', '');
    });
    
    document.getElementById('reset-zoom-btn').addEventListener('click', function() {
        // 重置为完整时间范围
        timelineSlider.min = -10000;
        timelineSlider.max = 2000;
        timelineSlider.value = currentYear;
        
        // 更新年份范围显示
        document.querySelector('.timeline-years div:first-child').textContent = '公元前10000年';
        document.querySelector('.timeline-years div:last-child').textContent = '公元2000年';
    });
    
    // 切换事件显示
    toggleEventsBtn.addEventListener('click', function() {
        // 修复ID不一致问题
        const toggleEventsBtn = document.getElementById('toggle-events');
        if (!toggleEventsBtn) {
            console.error('找不到事件切换按钮(id="toggle-events")');
            return;
        }
        
        showEvents = !showEvents;
        updateEvents();
        
        // 更新按钮样式
        if (showEvents) {
            toggleEventsBtn.classList.add('active');
        } else {
            toggleEventsBtn.classList.remove('active');
        }
    });
    
    // 切换迁徙路线显示
    toggleMigrationsBtn.addEventListener('click', function() {
        // 修复ID不一致问题
        const toggleMigrationsBtn = document.getElementById('toggle-migrations');
        if (!toggleMigrationsBtn) {
            console.error('找不到迁徙路线切换按钮(id="toggle-migrations")');
            return;
        }
        
        showMigrations = !showMigrations;
        updateMigrations();
        
        // 更新按钮样式
        if (showMigrations) {
            toggleMigrationsBtn.classList.add('active');
        } else {
            toggleMigrationsBtn.classList.remove('active');
        }
    });
}

// 更新到指定年份
function updateToYear(year) {
    // 确保年份在有效范围内
    if (year < MIN_YEAR) year = MIN_YEAR;
    if (year > MAX_YEAR) year = MAX_YEAR;
    
    console.log(`更新到年份: ${year}`);
    
    // 更新当前年份
    currentYear = year;
    
    // 更新年份显示
    updateYearDisplay(year);
    
    // 更新年份输入框
    const yearInput = document.getElementById('year-input');
    if (yearInput) {
        yearInput.value = year;
    }
    
    // 更新地图
    updateMap(year);
    
    // 更新事件显示
    updateEvents();
    
    // 更新迁徙路线
    updateMigrations();
    
    // 更新从JSON数据加载的图层
    updateDataLayersOnMap();
    
    // 高亮当前年份的事件
    highlightEventsForYear();
    
    console.log(`年份更新完成: ${year}`);
}

// 高亮当前年份的事件
function highlightEventsForYear() {
    try {
        // 获取与当前年份相关的事件
        const relevantEvents = historyEvents.filter(event => {
            // 使用正确的isEventRelevant函数
            return isEventRelevant(event, currentYear);
        });
        
        // 移除所有事件项的高亮
        const allEventItems = document.querySelectorAll('.event-item');
        allEventItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // 为相关事件添加高亮
        relevantEvents.forEach(event => {
            const eventItem = document.getElementById(`event-${event.id}`);
            if (eventItem) {
                eventItem.classList.add('active');
                
                // 滚动到第一个高亮的事件
                if (event === relevantEvents[0]) {
                    eventItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        });
        
        // 更新事件详情
        if (relevantEvents.length > 0) {
            displayEventDetails(relevantEvents[0]);
        } else {
            // 如果没有相关事件，显示默认消息
            if (eventDetails) {
                eventDetails.innerHTML = `<p class="text-center text-muted">在${formatYear(currentYear)}没有发生重要事件</p>`;
            }
        }
    } catch (error) {
        console.error('高亮当前年份事件时发生错误:', error);
    }
}

// 显示事件详情
function displayEventDetails(event) {
    eventDetails.innerHTML = `
        <h5>${event.title}</h5>
        <div class="mb-2">
            <span class="badge bg-primary">${formatYear(event.year)}</span>
            <span class="badge bg-secondary">${event.category}</span>
        </div>
        <p>${event.description}</p>
        ${event.link ? `<a href="${event.link}" target="_blank" class="btn btn-sm btn-outline-primary">了解更多</a>` : ''}
    `;
}

// 处理类别按钮切换
function initCategoryButtons() {
    const categoryButtons = document.querySelectorAll('.category-btn');
    
    categoryButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除其他按钮的active类
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            
            // 添加当前按钮的active类
            this.classList.add('active');
            
            // 获取选中的类别
            const category = this.getAttribute('data-category');
            
            // 根据选中的类别筛选显示事件
            filterEventsByCategory(category);
        });
    });
}

// 根据类别筛选地图上的事件
function filterEventsByCategory(category) {
    const allEventMarkers = document.querySelectorAll('.leaflet-marker-icon');
    
    allEventMarkers.forEach(marker => {
        if (category === 'all') {
            marker.style.display = 'block';
        } else {
            const markerCategory = marker.getAttribute('data-category');
            marker.style.display = (markerCategory === category) ? 'block' : 'none';
        }
    });
}

// 加载data目录中的JSON数据文件
async function loadDataFiles() {
    showLoadingIndicator(true);
    try {
        console.log('加载data目录中的JSON数据...');
        
        // 需要加载的数据文件列表
        const dataFiles = [
            'human_migrations.json',
            'technological_developments.json',
            'regional_species.json',
            'social_organizations.json'
        ];
        
        // 并行加载所有数据文件
        const promises = dataFiles.map(filename => 
            fetch(`data/${filename}`)
                .then(response => {
                    if (!response.ok) {
                        console.warn(`加载 ${filename} 失败: ${response.status} ${response.statusText}`);
                        return { [filename.replace('.json', '')]: [] }; // 返回空数组作为默认值
                    }
                    return response.json()
                        .then(data => {
                            console.log(`成功加载 ${filename}`);
                            return { [filename.replace('.json', '')]: data };
                        })
                        .catch(error => {
                            console.warn(`解析 ${filename} 失败:`, error);
                            return { [filename.replace('.json', '')]: [] }; // 解析失败时返回空数组
                        });
                })
                .catch(error => {
                    console.warn(`请求 ${filename} 出错:`, error);
                    return { [filename.replace('.json', '')]: [] }; // 网络错误时返回空数组
                })
        );
        
        // 等待所有数据加载完成
        const results = await Promise.all(promises);
        
        // 合并所有数据到jsonData对象
        results.forEach(result => {
            Object.assign(jsonData, result);
        });
        
        console.log('JSON数据加载完成');
        console.log(`加载了 ${Object.keys(jsonData).length} 个数据集`);
        
        // 更新地图显示
        updateDataLayersOnMap();
    } catch (error) {
        console.error('加载JSON数据时出错:', error);
        showErrorMessage(`无法加载数据文件: ${error.message}`);
    } finally {
        showLoadingIndicator(false);
    }
}

// 根据当前年份在地图上显示JSON数据
function updateDataLayersOnMap() {
    console.log(`更新JSON数据图层，当前年份: ${currentYear}`);
    
    try {
        // 清除之前的数据标记
        if (!markersLayer) {
            markersLayer = L.layerGroup().addTo(map);
        } else {
            markersLayer.clearLayers();
        }
        
        // 显示技术发展数据
        if (jsonData.technological_developments) {
            displayTechnologicalDevelopments();
        }
        
        // 显示物种分布数据
        if (jsonData.regional_species) {
            displayRegionalSpecies();
        }
        
        // 显示社会组织数据
        if (jsonData.social_organizations) {
            displaySocialOrganizations();
        }
        
        // 显示人类迁徙数据（除了已有的迁徙路线外）
        if (jsonData.human_migrations) {
            displayHumanMigrations();
        }
        
        console.log('JSON数据图层更新完成');
    } catch (error) {
        console.error('更新数据图层时出错:', error);
    }
}

// 显示技术发展数据
function displayTechnologicalDevelopments() {
    const techData = jsonData.technological_developments;
    if (!Array.isArray(techData)) return;
    
    techData.forEach(tech => {
        // 判断技术是否在当前时间范围内
        if (tech.发明时间 && isTimeRelevant(tech.发明时间, currentYear)) {
            // 创建技术图标标记
            if (tech.发明地点 && tech.发明地点.coordinates) {
                const coordinates = tech.发明地点.coordinates;
                const marker = L.marker([coordinates[1], coordinates[0]], {
                    icon: createCustomIcon('技术', tech.技术名称)
                });
                
                // 添加弹出信息
                marker.bindPopup(`
                    <div class="popup-content">
                        <h3 class="text-lg font-bold">${tech.技术名称}</h3>
                        <p class="text-sm text-gray-600">时间: ${formatYear(tech.发明时间)}</p>
                        <p class="mt-2">${tech.技术描述}</p>
                        <p class="mt-2"><strong>影响:</strong> ${tech.影响描述}</p>
                    </div>
                `);
                
                // 添加到地图
                markersLayer.addLayer(marker);
            }
        }
    });
}

// 显示地区物种数据
function displayRegionalSpecies() {
    const speciesData = jsonData.regional_species;
    if (!Array.isArray(speciesData)) return;
    
    speciesData.forEach(species => {
        // 判断物种驯化是否在当前时间范围内
        if (species.驯化时间 && isTimeRelevant(species.驯化时间, currentYear)) {
            // 如果有驯化地点坐标
            if (species.驯化地点 && species.驯化地点.coordinates) {
                const coordinates = species.驯化地点.coordinates;
                const marker = L.marker([coordinates[1], coordinates[0]], {
                    icon: createCustomIcon('农业', species.物种名称)
                });
                
                // 添加弹出信息
                marker.bindPopup(`
                    <div class="popup-content">
                        <h3 class="text-lg font-bold">${species.物种名称}</h3>
                        <p class="text-sm text-gray-600">驯化时间: ${formatYear(species.驯化时间)}</p>
                        <p class="mt-2">类型: ${species.物种类型}</p>
                        <p>用途: ${species.用途}</p>
                        <p class="mt-2"><strong>贡献:</strong> ${species.对人类发展的贡献}</p>
                    </div>
                `);
                
                // 添加到地图
                markersLayer.addLayer(marker);
            }
        }
    });
}

// 显示社会组织数据
function displaySocialOrganizations() {
    const socialData = jsonData.social_organizations;
    if (!Array.isArray(socialData)) return;
    
    socialData.forEach(org => {
        // 判断组织是否在当前时间范围内
        if (org.形成时间 && isTimeRelevant(org.形成时间, currentYear)) {
            // 如果有中心位置坐标
            if (org.中心位置 && org.中心位置.coordinates) {
                const coordinates = org.中心位置.coordinates;
                const marker = L.marker([coordinates[1], coordinates[0]], {
                    icon: createCustomIcon('文明', org.组织名称)
                });
                
                // 添加弹出信息
                marker.bindPopup(`
                    <div class="popup-content">
                        <h3 class="text-lg font-bold">${org.组织名称}</h3>
                        <p class="text-sm text-gray-600">形成时间: ${formatYear(org.形成时间)}</p>
                        <p class="mt-2">类型: ${org.组织类型}</p>
                        <p>人口规模: ${org.人口规模 || '未知'}</p>
                        <p class="mt-2">${org.特点描述}</p>
                    </div>
                `);
                
                // 添加到地图
                markersLayer.addLayer(marker);
            }
        }
    });
}

// 显示人类迁徙数据
function displayHumanMigrations() {
    const migrationData = jsonData.human_migrations;
    if (!Array.isArray(migrationData)) return;
    
    migrationData.forEach(migration => {
        // 判断迁徙是否在当前时间范围内
        if (migration.起始时间 && migration.结束时间 && 
            isTimeRangeRelevant(migration.起始时间, migration.结束时间, currentYear)) {
            
            // 如果有路径点
            if (migration.路径点 && Array.isArray(migration.路径点) && migration.路径点.length >= 2) {
                const pathCoordinates = migration.路径点.map(point => {
                    if (Array.isArray(point) && point.length === 2) {
                        return [point[1], point[0]]; // 转换为[lat, lng]格式
                    }
                    if (point.coordinates && Array.isArray(point.coordinates) && point.coordinates.length === 2) {
                        return [point.coordinates[1], point.coordinates[0]];
                    }
                    return null;
                }).filter(point => point !== null);
                
                if (pathCoordinates.length >= 2) {
                    // 创建路径线
                    const pathLine = L.polyline(pathCoordinates, {
                        color: getMigrationColor(migration.迁徙原因 || '人口迁徙'),
                        weight: 3,
                        opacity: 0.8,
                        dashArray: '8, 4'
                    });
                    
                    // 添加弹出信息
                    pathLine.bindPopup(`
                        <div class="popup-content">
                            <h3 class="text-lg font-bold">${migration.迁徙名称}</h3>
                            <p class="text-sm text-gray-600">时间: ${formatYear(migration.起始时间)} - ${formatYear(migration.结束时间)}</p>
                            <p class="mt-2">人口规模: ${migration.人口规模 || '未知'}</p>
                            <p>原因: ${migration.迁徙原因}</p>
                            <p class="mt-2"><strong>影响:</strong> ${migration.影响描述}</p>
                        </div>
                    `);
                    
                    // 添加方向箭头
                    addDirectionArrows(pathLine, migration.迁徙名称);
                    
                    // 添加到地图
                    markersLayer.addLayer(pathLine);
                }
            }
        }
    });
}

// 创建自定义图标
function createCustomIcon(category, name) {
    // 根据类别选择合适的图标和颜色
    let iconClass = 'info-sign';
    let borderColor = '#4a89dc';
    
    switch(category) {
        case '技术':
            iconClass = 'cog';
            borderColor = '#2196F3';
            break;
        case '农业':
            iconClass = 'tree';
            borderColor = '#4CAF50';
            break;
        case '文明':
            iconClass = 'tower';
            borderColor = '#9C27B0';
            break;
        case '迁徙':
            iconClass = 'road';
            borderColor = '#795548';
            break;
    }
    
    return L.divIcon({
        className: `event-icon ${category}`,
        html: `<i class="fas fa-${iconClass}" title="${name}"></i>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

// 判断时间点是否与当前年份相关
function isTimeRelevant(time, currentYear) {
    // 将可能的字符串转换为数字
    const timeValue = typeof time === 'string' ? parseInt(time.replace(/[^-\d]/g, '')) : time;
    const year = parseInt(currentYear);
    
    if (isNaN(timeValue)) return false;
    
    // 判断时间点是否在当前年份的500年范围内
    return Math.abs(timeValue - year) <= 500;
}

// 判断时间范围是否与当前年份相关
function isTimeRangeRelevant(startTime, endTime, currentYear) {
    // 将可能的字符串转换为数字
    const startValue = typeof startTime === 'string' ? parseInt(startTime.replace(/[^-\d]/g, '')) : startTime;
    const endValue = typeof endTime === 'string' ? parseInt(endTime.replace(/[^-\d]/g, '')) : endTime;
    const year = parseInt(currentYear);
    
    if (isNaN(startValue) || isNaN(endValue)) return false;
    
    // 判断当前年份是否在时间范围内或接近时间范围的200年内
    return (year >= startValue - 200 && year <= endValue + 200);
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', init);

// 导出函数供全局使用
window.updateMap = updateMap; 