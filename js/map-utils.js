/**
 * 地图工具函数库
 * 用于处理GeoJSON数据，以及地图相关的操作
 */

const MapUtils = {
    /**
     * 存储地图文件年份映射 - 使用所有可用的地图文件
     */
    mapYears: [
        // 公元前地图
        { year: -123000, file: 'world_bc123000.geojson' },
        { year: -10000, file: 'world_bc10000.geojson' },
        { year: -8000, file: 'world_bc8000.geojson' },
        { year: -5000, file: 'world_bc5000.geojson' },
        { year: -4000, file: 'world_bc4000.geojson' },
        { year: -3000, file: 'world_bc3000.geojson' },
        { year: -2000, file: 'world_bc2000.geojson' },
        { year: -1500, file: 'world_bc1500.geojson' },
        { year: -1000, file: 'world_bc1000.geojson' },
        { year: -700, file: 'world_bc700.geojson' },
        { year: -500, file: 'world_bc500.geojson' },
        { year: -400, file: 'world_bc400.geojson' },
        { year: -323, file: 'world_bc323.geojson' },
        { year: -300, file: 'world_bc300.geojson' },
        { year: -200, file: 'world_bc200.geojson' },
        { year: -100, file: 'world_bc100.geojson' },
        { year: -1, file: 'world_bc1.geojson' },
        // 公元后地图
        { year: 100, file: 'world_100.geojson' },
        { year: 200, file: 'world_200.geojson' },
        { year: 300, file: 'world_300.geojson' },
        { year: 400, file: 'world_400.geojson' },
        { year: 500, file: 'world_500.geojson' },
        { year: 600, file: 'world_600.geojson' },
        { year: 700, file: 'world_700.geojson' },
        { year: 800, file: 'world_800.geojson' },
        { year: 900, file: 'world_900.geojson' },
        { year: 1000, file: 'world_1000.geojson' },
        { year: 1100, file: 'world_1100.geojson' },
        { year: 1200, file: 'world_1200.geojson' },
        { year: 1279, file: 'world_1279.geojson' },
        { year: 1300, file: 'world_1300.geojson' },
        { year: 1400, file: 'world_1400.geojson' },
        { year: 1492, file: 'world_1492.geojson' },
        { year: 1500, file: 'world_1500.geojson' },
        { year: 1530, file: 'world_1530.geojson' },
        { year: 1600, file: 'world_1600.geojson' },
        { year: 1650, file: 'world_1650.geojson' },
        { year: 1700, file: 'world_1700.geojson' },
        { year: 1715, file: 'world_1715.geojson' },
        { year: 1783, file: 'world_1783.geojson' },
        { year: 1800, file: 'world_1800.geojson' },
        { year: 1815, file: 'world_1815.geojson' },
        { year: 1880, file: 'world_1880.geojson' },
        { year: 1900, file: 'world_1900.geojson' },
        { year: 1914, file: 'world_1914.geojson' },
        { year: 1920, file: 'world_1920.geojson' },
        { year: 1930, file: 'world_1930.geojson' },
        { year: 1938, file: 'world_1938.geojson' },
        { year: 1945, file: 'world_1945.geojson' },
        { year: 1960, file: 'world_1960.geojson' },
        { year: 1994, file: 'world_1994.geojson' },
        { year: 2000, file: 'world_2000.geojson' },
        { year: 2010, file: 'world_2010.geojson' }
    ],
    
    /**
     * 本地历史地图路径
     */
    localHistoryMapPath: './maps/geojson/',
    
    /**
     * 查找最接近指定年份的地图数据文件
     * @param {number} year - 目标年份(负数表示公元前)
     * @returns {Object} 最接近的地图年份对象
     */
    findClosestMapFile: function(year) {
        console.log(`查找最接近年份 ${year} 的地图文件`);
        
        // 查找最接近的年份
        let closestYear = null;
        let minDiff = Infinity;
        
        for (const mapYear of this.mapYears) {
            const diff = Math.abs(mapYear.year - year);
            if (diff < minDiff) {
                minDiff = diff;
                closestYear = mapYear;
            }
        }
        
        if (!closestYear) {
            console.error(`未找到适合年份 ${year} 的地图文件`);
            // 返回最后一个地图作为默认值
            closestYear = this.mapYears[this.mapYears.length - 1];
        }
        
        console.log(`最接近的年份是: ${closestYear.year}，对应文件: ${closestYear.file}`);
        return closestYear;
    },
    
    /**
     * 加载GeoJSON数据
     * @param {string} filePath - GeoJSON文件完整路径
     * @returns {Promise} 返回解析后的GeoJSON数据的Promise
     */
    loadGeoJSON: async function(filePath) {
        console.log(`尝试加载GeoJSON文件: ${filePath}`);
        
        try {
            console.log(`发送请求到: ${filePath}`);
            const response = await fetch(filePath, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            if (!response.ok) {
                console.error(`HTTP错误: ${response.status} ${response.statusText}, URL: ${filePath}`);
                throw new Error(`HTTP error! status: ${response.status}, URL: ${filePath}`);
            }
            
            console.log(`获取到响应, Content-Type: ${response.headers.get('content-type')}`);
            const data = await response.json();
            console.log(`成功加载GeoJSON数据，包含 ${data.features ? data.features.length : '未知数量'} 个特征: ${filePath}`);
            
            if (!data || !data.features || data.features.length === 0) {
                console.warn(`GeoJSON数据无效或没有特征: ${filePath}`);
            } else {
                // 检查特征的属性，确保颜色信息存在
                const sampleFeature = data.features[0];
                console.log(`示例特征属性: ${JSON.stringify(sampleFeature.properties)}`);
            }
            
            return this.normalizeGeoJSON(data);
        } catch (error) {
            console.error(`加载GeoJSON文件 ${filePath} 失败:`, error);
            throw error;
        }
    },
    
    /**
     * 从本地路径加载指定年份的GeoJSON数据
     * @param {number} year - 目标年份
     * @returns {Promise} 返回解析后的GeoJSON数据的Promise
     */
    loadHistoricalMap: async function(year) {
        console.log(`尝试加载年份 ${year} 的历史地图`);
        
        try {
            // 找到最接近的地图文件
            const mapData = this.findClosestMapFile(year);
            
            // 尝试多个可能的路径加载地图
            const possiblePaths = [
                `${this.localHistoryMapPath}${mapData.file}`, // 配置的相对路径
                `./maps/geojson/${mapData.file}`,            // 相对于当前目录
                `./historical-basemaps/geojson/${mapData.file}`, // 备用相对路径
                `/maps/geojson/${mapData.file}`              // 根目录下的路径
            ];
            
            let data = null;
            let loadSuccess = false;
            
            // 尝试每个路径
            for (const path of possiblePaths) {
                try {
                    console.log(`尝试从路径加载GeoJSON: ${path}`);
                    data = await this.loadGeoJSON(path);
                    if (data && data.features && data.features.length > 0) {
                        console.log(`成功从路径加载地图: ${path}`);
                        loadSuccess = true;
                        break;
                    }
                } catch (error) {
                    console.warn(`从路径 ${path} 加载失败:`, error.message);
                    // 继续尝试下一个路径
                }
            }
            
            if (!loadSuccess) {
                console.warn(`未能从所有可能的路径加载地图，尝试加载备用地图`);
                return await this.loadFallbackMap();
            }
            
            console.log(`成功加载年份 ${mapData.year} 的历史地图，包含 ${data.features.length} 个特征`);
            return data;
        } catch (error) {
            console.error('加载历史地图时出错:', error);
            // 尝试加载备用地图
            return await this.loadFallbackMap();
        }
    },
    
    /**
     * 加载备用地图
     * @param {string} fileName - 原始文件名
     * @returns {Promise} 返回解析后的GeoJSON数据的Promise
     */
    loadFallbackMap: async function() {
        console.log('尝试加载备用地图数据');
        
        // 尝试加载不同年份的地图
        const fallbackYears = [1950, 2000, 1900, 1800, 0];
        
        for (const year of fallbackYears) {
            try {
                const mapData = this.findClosestMapFile(year);
                
                // 尝试不同的路径
                const possiblePaths = [
                    `${this.localHistoryMapPath}${mapData.file}`, // 配置的相对路径
                    `./maps/geojson/${mapData.file}`,            // 相对于当前目录
                    `./historical-basemaps/geojson/${mapData.file}`, // 备用相对路径
                    `/maps/geojson/${mapData.file}`              // 根目录下的路径
                ];
                
                for (const path of possiblePaths) {
                    try {
                        console.log(`尝试从备用路径加载地图: ${path}`);
                        const data = await this.loadGeoJSON(path);
                        
                        if (data && data.features && data.features.length > 0) {
                            console.log(`成功从备用路径加载地图: ${path}`);
                            return data;
                        }
                    } catch (error) {
                        console.warn(`从备用路径 ${path} 加载失败:`, error.message);
                        // 继续尝试下一条路径
                    }
                }
            } catch (error) {
                console.warn(`备用年份 ${year} 加载失败:`, error.message);
                // 继续尝试下一个备用年份
            }
        }
        
        console.error('所有备用地图加载失败，返回空GeoJSON数据');
        // 返回一个空的GeoJSON作为最后的备用
        return {
            type: 'FeatureCollection',
            features: []
        };
    },
    
    /**
     * 标准化不同格式的GeoJSON数据
     * @param {Object} data - GeoJSON数据
     * @returns {Object} 标准化后的GeoJSON数据
     */
    normalizeGeoJSON: function(data) {
        console.log('正在标准化GeoJSON数据');
        
        // 检查数据是否为有效的GeoJSON
        if (!data) {
            console.error('无效的GeoJSON数据');
            return this.getDefaultWorldMap();
        }
        
        // 如果已经是标准格式，直接返回
        if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
            console.log('数据已经是标准FeatureCollection格式');
            return data;
        }
        
        // 处理直接的Geometry对象
        if (data.type && (data.type === 'Polygon' || data.type === 'MultiPolygon')) {
            console.log('将Geometry对象转换为FeatureCollection');
            return {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    properties: {},
                    geometry: data
                }]
            };
        }
        
        // 处理直接的Feature对象
        if (data.type === 'Feature') {
            console.log('将Feature对象转换为FeatureCollection');
            return {
                type: 'FeatureCollection',
                features: [data]
            };
        }
        
        // 处理非标准格式
        if (Array.isArray(data)) {
            console.log('将数组转换为FeatureCollection');
            // 假设是Feature数组
            return {
                type: 'FeatureCollection',
                features: data.map(item => {
                    if (item.type === 'Feature') {
                        return item;
                    } else {
                        return {
                            type: 'Feature',
                            properties: item.properties || {},
                            geometry: item
                        };
                    }
                })
            };
        }
        
        // 如果无法识别格式，返回默认数据
        console.error('无法识别的GeoJSON格式');
        return this.getDefaultWorldMap();
    },
    
    /**
     * 获取默认的世界地图（简化版）
     */
    getDefaultWorldMap: function() {
        console.log('返回默认世界地图');
        
        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {
                        name: '默认世界地图',
                        description: '未能加载实际地图数据，这是一个简化的世界轮廓'
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [[
                            [-180, 85], [180, 85], [180, -85], [-180, -85], [-180, 85]
                        ]]
                    }
                }
            ]
        };
    },
    
    /**
     * 缓存GeoJSON到本地
     */
    cacheGeoJSONLocally: function(fileName, data) {
        // 这是一个模拟函数，实际实现需要考虑浏览器存储限制
        // 在真实应用中，可以使用localStorage、IndexedDB等
        console.log(`缓存GeoJSON文件 ${fileName} 到本地存储`);
        
        try {
            // 仅作为演示
            localStorage.setItem(`geoJSON_${fileName}`, JSON.stringify(data));
        } catch (error) {
            console.warn('缓存GeoJSON失败:', error);
        }
    },
    
    /**
     * 过滤指定时间范围内的事件
     * @param {Array} events - 事件数组
     * @param {number} year - 目标年份
     * @param {number} range - 范围(正负年数)
     * @returns {Array} 过滤后的事件数组
     */
    filterEventsByTimeRange: function(events, year, range) {
        return events.filter(event => {
            return Math.abs(event.year - year) <= range;
        });
    },
    
    /**
     * 过滤指定时间内活跃的迁徙路线
     * @param {Array} migrations - 迁徙路线数组
     * @param {number} year - 目标年份
     * @returns {Array} 过滤后的迁徙路线数组
     */
    filterActiveMigrations: function(migrations, year) {
        return migrations.filter(migration => {
            return migration.startYear <= year && migration.endYear >= year;
        });
    },
    
    /**
     * 根据时间计算迁徙路线的完成百分比
     * @param {Object} migration - 迁徙路线对象
     * @param {number} year - 目标年份
     * @returns {number} 完成百分比(0-1)
     */
    calculateMigrationProgress: function(migration, year) {
        if (year <= migration.startYear) return 0;
        if (year >= migration.endYear) return 1;
        
        const totalDuration = migration.endYear - migration.startYear;
        const elapsedTime = year - migration.startYear;
        return elapsedTime / totalDuration;
    },
    
    /**
     * 将迁徙路线转换为GeoJSON LineString
     * @param {Object} migration - 迁徙路线对象
     * @param {number} progress - 完成百分比(0-1)
     * @returns {Object} GeoJSON LineString对象
     */
    migrationToGeoJSON: function(migration, progress) {
        // 根据进度计算应该显示多少点
        const totalPoints = migration.path.length;
        const pointsToShow = Math.max(2, Math.ceil(totalPoints * progress));
        
        // 截取路径点
        const visiblePath = migration.path.slice(0, pointsToShow);
        
        return {
            type: "Feature",
            properties: {
                id: migration.id,
                name: migration.name,
                category: migration.category,
                description: migration.description,
                startYear: migration.startYear,
                endYear: migration.endYear
            },
            geometry: {
                type: "LineString",
                coordinates: visiblePath
            }
        };
    },
    
    /**
     * 将事件数据转换为GeoJSON点
     * @param {Array} events - 事件数组
     * @returns {Object} GeoJSON FeatureCollection
     */
    eventsToGeoJSON: function(events) {
        if (!events || !Array.isArray(events)) {
            console.warn('传入的事件数据无效');
            return {
                type: "FeatureCollection",
                features: []
            };
        }
        
        console.log(`转换 ${events.length} 个事件为GeoJSON格式`);
        
        const features = events.map(event => {
            // 检查位置信息是否有效
            if (!event.location || !Array.isArray(event.location) || event.location.length < 2) {
                console.warn(`事件 "${event.title || '未命名'}" 的位置信息无效，使用默认位置`);
                // 使用默认位置 (0,0)
                event.location = [0, 0];
            }
            
            // 处理年份格式化
            let yearDisplay = event.year;
            if (event.year < 0) {
                yearDisplay = `公元前 ${Math.abs(event.year)} 年`;
            } else {
                yearDisplay = `公元 ${event.year} 年`;
            }
            
            // 准备描述文本
            let description = event.description || '';
            if (event.endYear && event.endYear !== event.year) {
                description = `<p><strong>持续时间:</strong> ${yearDisplay} - ${
                    event.endYear < 0 
                        ? `公元前 ${Math.abs(event.endYear)} 年`
                        : `公元 ${event.endYear} 年`
                }</p>` + description;
            }
            
            return {
                type: "Feature",
                properties: {
                    id: event.id,
                    title: event.title,
                    year: event.year,
                    endYear: event.endYear,
                    description: description,
                    category: event.category,
                    importance: event.importance,
                    period: event.period,
                    yearDisplay: yearDisplay
                },
                geometry: {
                    type: "Point",
                    coordinates: [event.location[0], event.location[1]] // [经度, 纬度]
                }
            };
        });
        
        return {
            type: "FeatureCollection",
            features: features
        };
    },
    
    /**
     * 按类别为GeoJSON特征着色
     * @param {Object} feature - GeoJSON特征
     * @returns {Object} 样式对象
     */
    styleByCategory: function(feature) {
        if (!feature.properties) return {};
        
        // 颜色方案
        const colorMap = {
            // 事件类别颜色
            "农业": "#4CAF50",
            "技术": "#2196F3",
            "文明": "#9C27B0",
            "征服": "#F44336",
            "疾病": "#FF9800",
            "迁徙": "#795548",
            "探索": "#607D8B",
            "贸易": "#FFEB3B",
            "气候": "#00BCD4",
            "政治": "#3F51B5",
            "宗教": "#E91E63",
            "文化": "#673AB7",
            "生态": "#009688",
            "军事": "#F44336",
            "多领域": "#9E9E9E",
            
            // 物种类别
            "物种": "#8BC34A",
            "作物": "#8BC34A",
            "家畜": "#FFC107",
            "野生动物": "#FF5722",
            
            // 迁徙类别颜色
            "早期人类": "#8BC34A",
            "农业扩散": "#4CAF50",
            "人口迁徙": "#795548",
            "航海扩张": "#03A9F4",
            "帝国扩张": "#F44336",
            "疾病传播": "#FF9800",
            "殖民扩张": "#9C27B0",
            "强制迁移": "#E91E63",
            
            // 技术类别颜色
            "通信": "#2196F3",
            "交通": "#3F51B5",
            "能源": "#FF5722",
            "材料": "#009688",
            "医疗": "#E91E63",
            "冶金": "#607D8B",
            "计算": "#673AB7",
            "导航": "#00BCD4"
        };
        
        // 获取特征类别
        const category = feature.properties.category;
        
        // 设置默认颜色和透明度
        let fillColor = "#777777";
        let opacity = 0.8;
        let weight = 2;
        
        // 如果类别有对应的颜色，使用它
        if (category && colorMap[category]) {
            fillColor = colorMap[category];
        }
        
        // 根据重要性调整透明度
        if (feature.properties.importance) {
            opacity = 0.5 + (feature.properties.importance * 0.1);
        }
        
        return {
            fillColor: fillColor,
            weight: weight,
            opacity: opacity,
            color: fillColor,
            fillOpacity: opacity * 0.7
        };
    },
    
    /**
     * 创建事件弹出框内容
     * @param {Object} feature - GeoJSON特征
     * @returns {string} HTML内容
     */
    createEventPopupContent: function(feature) {
        const props = feature.properties;
        
        // 准备基本信息
        let popupContent = `
            <div class="event-popup">
                <h3>${props.title || '未命名事件'}</h3>
                <p><strong>时间:</strong> ${props.yearDisplay || '未知'}</p>
        `;
        
        // 添加类别
        if (props.category) {
            popupContent += `<p><strong>类别:</strong> ${props.category}</p>`;
        }
        
        // 添加描述
        if (props.description) {
            popupContent += `<p>${props.description}</p>`;
        }
        
        // 添加时期
        if (props.period) {
            popupContent += `<p><strong>时期:</strong> ${props.period}</p>`;
        }
        
        // 关闭容器
        popupContent += `</div>`;
        
        return popupContent;
    },
    
    /**
     * 创建迁徙路线弹出框内容
     * @param {Object} feature - GeoJSON特征
     * @returns {string} HTML内容
     */
    createMigrationPopupContent: function(feature) {
        const props = feature.properties;
        
        // 处理年份显示
        let startYearDisplay = props.startYear < 0 
            ? `公元前 ${Math.abs(props.startYear)} 年` 
            : `公元 ${props.startYear} 年`;
            
        let endYearDisplay = props.endYear < 0 
            ? `公元前 ${Math.abs(props.endYear)} 年` 
            : `公元 ${props.endYear} 年`;
        
        // 准备基本信息
        let popupContent = `
            <div class="migration-popup">
                <h3>${props.name || '未命名迁徙'}</h3>
                <p><strong>时间范围:</strong> ${startYearDisplay} - ${endYearDisplay}</p>
        `;
        
        // 添加类别
        if (props.category) {
            popupContent += `<p><strong>类别:</strong> ${props.category}</p>`;
        }
        
        // 添加人口规模
        if (props.group) {
            popupContent += `<p><strong>人口规模:</strong> ${props.group}</p>`;
        }
        
        // 添加描述
        if (props.description) {
            popupContent += `<p><strong>迁徙原因:</strong> ${props.description}</p>`;
        }
        
        // 添加影响
        if (props.impact) {
            popupContent += `<p><strong>影响:</strong> ${props.impact}</p>`;
        }
        
        // 添加文化特征
        if (props.culturalTraits) {
            popupContent += `<p><strong>文化特征:</strong> ${props.culturalTraits}</p>`;
        }
        
        // 添加携带技术
        if (props.technologies) {
            popupContent += `<p><strong>携带技术:</strong> ${props.technologies}</p>`;
        }
        
        // 添加时期
        if (props.period) {
            popupContent += `<p><strong>时期:</strong> ${props.period}</p>`;
        }
        
        // 关闭容器
        popupContent += `</div>`;
        
        return popupContent;
    },
    
    /**
     * 判断事件是否与当前年份相关
     * @param {Object} event - 事件对象
     * @param {number} currentYear - 当前年份
     * @returns {boolean} 事件是否与当前年份相关
     */
    isEventRelevantToYear: function(event, currentYear) {
        // 确保事件对象有效
        if (!event) {
            console.warn('事件对象为空');
            return false;
        }
        
        // 将数据打印到控制台帮助调试
        const eventTimeStr = event.startYear !== undefined ? 
            `${event.startYear}${event.endYear ? `-${event.endYear}` : ''}` : 
            `${event.year}${event.endYear ? `-${event.endYear}` : ''}`;
        console.log(`检查事件 "${event.title}" (${eventTimeStr}) 是否与年份 ${currentYear} 相关`);
        
        // 兼容性处理：有些事件可能使用startYear/endYear，有些可能使用year/endYear
        const eventStartYear = event.startYear !== undefined ? event.startYear : event.year;
        const eventEndYear = event.endYear;
        
        // 确保有有效的年份
        if (eventStartYear === undefined) {
            console.warn(`事件 "${event.title}" 没有有效的开始年份`);
            return false;
        }
        
        // 精确年份事件
        if (eventStartYear === currentYear) {
            console.log(`事件 "${event.title}" 精确匹配当前年份 ${currentYear}`);
            return true;
        }
        
        // 持续范围的事件
        if (eventEndYear !== undefined) {
            const isInRange = currentYear >= eventStartYear && currentYear <= eventEndYear;
            if (isInRange) {
                console.log(`事件 "${event.title}" 在时间范围内 ${eventStartYear} - ${eventEndYear}`);
            }
            return isInRange;
        }
        
        // 扩大重要历史事件的影响范围
        // 事件影响范围与其发生年代和重要性有关
        let impactRange = 100; // 默认影响范围
        
        // 如果事件有重要性评级，适当调整影响范围
        if (event.importance) {
            impactRange = impactRange * event.importance; // 重要事件影响更广
        }
        
        // 年代越久远，范围越大
        if (Math.abs(eventStartYear) > 1000) {
            // 远古事件的时间精度较低
            impactRange = impactRange * 2;
        }
        
        // 计算事件年份与当前年份的差距
        const yearDifference = Math.abs(eventStartYear - currentYear);
        const isRecentEnough = yearDifference <= impactRange;
        
        if (isRecentEnough) {
            console.log(`事件 "${event.title}" 在影响范围内 (${eventStartYear} ± ${impactRange}年)`);
            return true;
        }
        
        return false;
    },
    
    /**
     * 检查迁徙是否与当前年份相关
     * @param {Object} migration - 迁徙路线对象
     * @param {number} currentYear - 当前年份
     * @returns {boolean} 迁徙路线是否与当前年份相关
     */
    isMigrationRelevantToYear: function(migration, currentYear) {
        return currentYear >= migration.startYear && currentYear <= migration.endYear;
    },
    
    /**
     * 计算迁徙群体当前位置
     * @param {Object} migration - 迁徙路线对象
     * @param {number} progress - 完成百分比(0-1)
     * @returns {Array} 迁徙群体当前位置
     */
    calculateCurrentPosition: function(migration, progress) {
        if (!migration.route || migration.route.length < 2) {
            return null;
        }
        
        if (progress <= 0) {
            return migration.route[0];
        }
        
        if (progress >= 1) {
            return migration.route[migration.route.length - 1];
        }
        
        // 找到当前路段
        const totalSegments = migration.route.length - 1;
        const currentSegmentIndex = Math.floor(progress * totalSegments);
        const segmentProgress = (progress * totalSegments) - currentSegmentIndex;
        
        const startPoint = migration.route[currentSegmentIndex];
        const endPoint = migration.route[currentSegmentIndex + 1];
        
        // 线性插值计算当前位置
        const lat = startPoint[0] + (endPoint[0] - startPoint[0]) * segmentProgress;
        const lng = startPoint[1] + (endPoint[1] - startPoint[1]) * segmentProgress;
        
        return [lat, lng];
    },
    
    /**
     * 将迁徙路线转换为GeoJSON
     * @param {Object} migration - 迁徙路线对象
     * @param {number} progress - 完成百分比(0-1)
     * @returns {Object} GeoJSON LineString对象
     */
    convertMigrationToGeoJSON: function(migration, progress = 1) {
        if (!migration.route || migration.route.length < 2) {
            return null;
        }
        
        // 计算迁徙路线显示的部分
        const displayedRoute = [...migration.route];
        
        if (progress < 1) {
            const totalSegments = migration.route.length - 1;
            const currentSegmentIndex = Math.floor(progress * totalSegments);
            const segmentProgress = (progress * totalSegments) - currentSegmentIndex;
            
            const startPoint = migration.route[currentSegmentIndex];
            const endPoint = migration.route[currentSegmentIndex + 1];
            
            // 计算当前线段上的插值点
            const currentPoint = [
                startPoint[0] + (endPoint[0] - startPoint[0]) * segmentProgress,
                startPoint[1] + (endPoint[1] - startPoint[1]) * segmentProgress
            ];
            
            // 保留已经经过的部分，加上当前点
            displayedRoute.splice(currentSegmentIndex + 1, displayedRoute.length - currentSegmentIndex - 1, currentPoint);
        }
        
        // 创建GeoJSON LineString
        return {
            type: 'Feature',
            properties: {
                name: migration.group,
                description: migration.description
            },
            geometry: {
                type: 'LineString',
                coordinates: displayedRoute.map(point => [point[1], point[0]]) // GeoJSON使用[lng, lat]格式
            }
        };
    },
    
    /**
     * 格式化年份显示
     * @param {number} year - 年份
     * @returns {string} 格式化后的年份字符串
     */
    formatYear: function(year) {
        if (year <= 0) {
            return `公元前${Math.abs(year)}年`;
        } else {
            return `公元${year}年`;
        }
    }
};

// 将 MapUtils 添加到 window 对象，使其成为全局可访问
window.MapUtils = MapUtils;

// 导出 MapUtils 对象以便 ES 模块也能正确导入
export default MapUtils;