export class MapMigrations {
    constructor(mapCore) {
        this.mapCore = mapCore;
        this.migrationRoutes = new Map();
        this.currentMigrations = [];
        this.isVisible = true;
    }

    async initialize() {
        // 初始化迁徙相关功能
        console.log('初始化迁徙路线模块');
    }

    async updateToYear(year, migrationsData) {
        console.log(`更新到年份 ${year} 的迁徙路线`);
        this.clearMigrationRoutes();
        
        // 如果传入了迁徙数据，直接使用
        if (migrationsData && Array.isArray(migrationsData) && migrationsData.length > 0) {
            console.log(`使用传入的迁徙数据: ${migrationsData.length}条`);
            const migrations = this.processMigrationData(migrationsData, year);
            await this.updateMigrationRoutes(migrations);
        } else {
            // 否则尝试获取数据
            console.log('获取活跃的迁徙路线数据');
            const migrations = await this.getActiveMigrations(year);
            console.log(`获取到 ${migrations ? migrations.length : 0} 条迁徙路线`);
            await this.updateMigrationRoutes(migrations);
        }
    }

    processMigrationData(migrations, year) {
        console.log(`处理${migrations.length}条迁徙数据`);
        return migrations.filter(migration => {
            // 确保有年份信息
            migration.startYear = migration.startYear || migration.year || 0;
            migration.endYear = migration.endYear || migration.startYear;
            
            // 检查迁徙是否在当前年份或之前
            return (year >= migration.startYear && year <= migration.endYear);
        }).map(migration => this.extractMigrationRoute(migration));
    }

    extractMigrationRoute(migration) {
        console.log(`提取迁徙路线: ${migration.title || migration.name}`);
        console.log('迁徙路线详细数据:', JSON.stringify(migration, null, 2));
        console.log(`迁徙数据完整性检查:`, {
            id: migration.id,
            hasPath: !!migration.path,
            pathIsArray: Array.isArray(migration.path),
            pathLength: migration.path ? migration.path.length : 0,
            hasFrom: !!migration.from,
            hasTo: !!migration.to,
        });
        
        // 从路径字段中提取
        if (migration.path && Array.isArray(migration.path) && migration.path.length >= 2) {
            const startPoint = migration.path[0];
            const endPoint = migration.path[migration.path.length - 1];
            
            console.log(`路径点检查: 起点=${JSON.stringify(startPoint)}, 终点=${JSON.stringify(endPoint)}`);
            
            if (Array.isArray(startPoint) && startPoint.length >= 2 && 
                Array.isArray(endPoint) && endPoint.length >= 2) {
                console.log(`迁徙路径: 从[${startPoint}]到[${endPoint}]`);
                return {
                    ...migration,
                    id: migration.id || `migration-${Math.random().toString(36).substring(2)}`,
                    startLat: startPoint[0],
                    startLng: startPoint[1],
                    endLat: endPoint[0],
                    endLng: endPoint[1]
                };
            }
        }
        
        // 从起点和终点字段中提取
        if ((migration.from || migration.start) && (migration.to || migration.end)) {
            const start = migration.from || migration.start;
            const end = migration.to || migration.end;
            
            console.log(`起点/终点检查: 起点=${JSON.stringify(start)}, 终点=${JSON.stringify(end)}`);
            
            // 处理数组形式的坐标
            if (Array.isArray(start) && start.length >= 2 && Array.isArray(end) && end.length >= 2) {
                console.log(`迁徙: 从[${start}]到[${end}]`);
                return {
                    ...migration,
                    id: migration.id || `migration-${Math.random().toString(36).substring(2)}`,
                    startLat: start[0],
                    startLng: start[1],
                    endLat: end[0],
                    endLng: end[1]
                };
            }
            
            // 处理对象形式的坐标
            if (typeof start === 'object' && typeof end === 'object') {
                const startLat = start.lat !== undefined ? start.lat : 
                              start.latitude !== undefined ? start.latitude : null;
                const startLng = start.lng !== undefined ? start.lng : 
                              start.longitude !== undefined ? start.longitude : null;
                const endLat = end.lat !== undefined ? end.lat : 
                            end.latitude !== undefined ? end.latitude : null;
                const endLng = end.lng !== undefined ? end.lng : 
                            end.longitude !== undefined ? end.longitude : null;
                
                if (startLat !== null && startLng !== null && endLat !== null && endLng !== null) {
                    console.log(`迁徙: 从[${startLat},${startLng}]到[${endLat},${endLng}]`);
                    return {
                        ...migration,
                        id: migration.id || `migration-${Math.random().toString(36).substring(2)}`,
                        startLat: startLat,
                        startLng: startLng,
                        endLat: endLat,
                        endLng: endLng
                    };
                }
            }
        }
        
        // 如果有起点，但没有终点，尝试从location和destination中提取
        if (migration.location && migration.destination) {
            const startLocation = this.extractCoordinates(migration.location);
            const endLocation = this.extractCoordinates(migration.destination);
            
            if (startLocation && endLocation) {
                console.log(`迁徙(location/destination): 从[${startLocation.lat},${startLocation.lng}]到[${endLocation.lat},${endLocation.lng}]`);
                return {
                    ...migration,
                    id: migration.id || `migration-${Math.random().toString(36).substring(2)}`,
                    startLat: startLocation.lat,
                    startLng: startLocation.lng,
                    endLat: endLocation.lat,
                    endLng: endLocation.lng
                };
            }
        }
        
        // 如果迁徙事件有经纬度，尝试使用它们作为终点，并生成一个附近的起点
        if (migration.latitude !== undefined && migration.longitude !== undefined) {
            // 生成一个随机的起点（稍微偏移一些距离）
            const offset = 10; // 大约1000公里的偏移
            const randomDirection = Math.random() * Math.PI * 2;
            const startLat = migration.latitude + offset * Math.cos(randomDirection) / 111; // 每度纬度约111公里
            const startLng = migration.longitude + offset * Math.sin(randomDirection) / (111 * Math.cos(migration.latitude * Math.PI / 180));
            
            console.log(`迁徙(使用坐标为终点): 从[${startLat},${startLng}]到[${migration.latitude},${migration.longitude}]`);
            return {
                ...migration,
                id: migration.id || `migration-${Math.random().toString(36).substring(2)}`,
                startLat: startLat,
                startLng: startLng,
                endLat: migration.latitude,
                endLng: migration.longitude
            };
        }
        
        // 如果都没有，使用默认位置
        console.warn(`迁徙 "${migration.title || migration.name}" 没有完整的位置信息，使用默认位置`);
        return {
            ...migration,
            id: migration.id || `migration-${Math.random().toString(36).substring(2)}`,
            startLat: 40, // 默认位置（欧洲）
            startLng: 10,
            endLat: 35,
            endLng: 105 // 亚洲中部
        };
    }
    
    // 从各种格式中提取坐标
    extractCoordinates(location) {
        if (!location) return null;
        
        // 数组格式 [lat, lng]
        if (Array.isArray(location) && location.length >= 2) {
            return { lat: location[0], lng: location[1] };
        }
        
        // 对象格式 {lat, lng} 或 {latitude, longitude}
        if (typeof location === 'object') {
            if (location.lat !== undefined && location.lng !== undefined) {
                return { lat: location.lat, lng: location.lng };
            }
            if (location.latitude !== undefined && location.longitude !== undefined) {
                return { lat: location.latitude, lng: location.longitude };
            }
        }
        
        // 字符串格式 "lat,lng"
        if (typeof location === 'string' && location.includes(',')) {
            const parts = location.split(',').map(p => parseFloat(p.trim()));
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                return { lat: parts[0], lng: parts[1] };
            }
        }
        
        return null;
    }

    async updateMigrationRoutes(migrations) {
        this.currentMigrations = migrations;
        this.clearMigrationRoutes();

        if (!this.isVisible) {
            console.log('迁徙路线已隐藏，不显示');
            return;
        }

        console.log(`更新${migrations.length}条迁徙路线`);
        migrations.forEach(migration => {
            if (migration.startLat && migration.startLng && migration.endLat && migration.endLng) {
                try {
                    const path = this.createMigrationPath(migration);
                    this.migrationRoutes.set(migration.id, path);
                    path.addTo(this.mapCore.map);
                } catch (e) {
                    console.error(`创建迁徙路线失败: ${e.message}`, migration);
                }
            } else {
                console.warn(`迁徙 "${migration.title || migration.name}" 缺少必要的坐标信息`);
            }
        });
    }

    createMigrationPath(migration) {
        console.log(`创建迁徙路径: ${migration.title || migration.name}`);
        const path = this.createCurvedPath(
            migration.startLat,
            migration.startLng,
            migration.endLat,
            migration.endLng
        );

        return L.polyline(path, {
            color: this.getMigrationColor(migration.category),
            weight: 2,
            opacity: 0.8,
            className: 'migration-path'
        }).bindPopup(() => this.createMigrationPopupContent(migration));
    }

    createCurvedPath(startLat, startLng, endLat, endLng) {
        const latlngs = [];
        const offsetX = endLng - startLng;
        const offsetY = endLat - startLat;
        const center = [startLat + offsetY / 2, startLng + offsetX / 2];
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        const curve = distance / 3;

        // 控制点的偏移量
        const qx = center[1] + curve * (offsetY > 0 ? -1 : 1);
        const qy = center[0] + curve * (offsetX > 0 ? 1 : -1);

        // 生成曲线路径点
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            const lat = this.quadraticBezier(startLat, qy, endLat, t);
            const lng = this.quadraticBezier(startLng, qx, endLng, t);
            latlngs.push([lat, lng]);
        }

        return latlngs;
    }

    quadraticBezier(p0, p1, p2, t) {
        const term1 = p0 * Math.pow(1 - t, 2);
        const term2 = 2 * p1 * t * (1 - t);
        const term3 = p2 * Math.pow(t, 2);
        return term1 + term2 + term3;
    }

    getMigrationColor(category) {
        const colors = {
            '人口': '#8b5cf6',
            '文化': '#ec4899',
            '技术': '#3b82f6',
            '物种': '#10b981',
            '迁徙': '#7c3aed'
        };
        return colors[category] || '#6b7280';
    }

    createMigrationPopupContent(migration) {
        const title = migration.title || migration.name || '未命名迁徙';
        const startYear = this.formatYear(migration.startYear || 0);
        const endYear = migration.endYear ? this.formatYear(migration.endYear) : startYear;
        const category = migration.category || '迁徙';
        const description = migration.description || `${title}发生于${startYear}至${endYear}之间`;
        
        // 添加更美观的弹窗内容
        return `
            <div class="custom-popup migration-popup">
                <div class="popup-header">
                    <h3 class="popup-title">
                        <span class="event-icon-mini ${category}">
                            <i class="material-icons-round">timeline</i>
                        </span>
                        ${title}
                    </h3>
                    <button class="popup-close" onclick="document.querySelector('.leaflet-popup-pane').innerHTML=''">
                        <i class="material-icons-round">close</i>
                    </button>
                </div>
                
                <div class="popup-content">
                    <div class="event-meta-info">
                        <div class="event-time">
                            <i class="material-icons-round">event</i>
                            <span>${startYear}${startYear !== endYear ? ` - ${endYear}` : ''}</span>
                        </div>
                        
                        <div class="event-category">
                            <i class="material-icons-round">label</i>
                            <span class="category-badge ${category}">${category}</span>
                        </div>
                    </div>
                    
                    <div class="event-description">
                        ${description}
                    </div>
                </div>
            </div>
        `;
    }

    formatYear(year) {
        const absYear = Math.abs(year);
        return year < 0 ? `公元前 ${absYear} 年` : `公元 ${year} 年`;
    }

    async getActiveMigrations(year) {
        try {
            console.log(`获取${year}年的迁徙数据`);
            // 尝试从data-loader.js导入函数
            const module = await import('./data-loader.js');
            if (module && module.getMigrationsForYear) {
                console.log('找到getMigrationsForYear函数');
                const migrations = await module.getMigrationsForYear(year);
                console.log(`从data-loader获取到${migrations.length}条迁徙数据`);
                
                // 打印前几条迁徙数据进行调试
                if(migrations.length > 0) {
                    console.log('迁徙数据示例:');
                    console.log(JSON.stringify(migrations[0], null, 2));
                }
                
                // 处理迁徙数据
                const processedMigrations = this.processMigrationData(migrations, year);
                console.log(`处理后的迁徙数据数量: ${processedMigrations.length}`);
                
                // 打印处理后的第一条数据
                if(processedMigrations.length > 0) {
                    console.log('处理后的迁徙数据示例:');
                    console.log(JSON.stringify(processedMigrations[0], null, 2));
                }
                
                return processedMigrations;
            }
        } catch (error) {
            console.error('获取迁徙数据失败:', error);
        }
        return [];
    }

    clearMigrationRoutes() {
        this.migrationRoutes.forEach(route => {
            route.remove();
        });
        this.migrationRoutes.clear();
    }
    
    // 添加显示/隐藏功能
    toggleMigrations(isVisible) {
        this.isVisible = isVisible;
        
        if (isVisible) {
            // 显示所有迁徙路线
            this.updateMigrationRoutes(this.currentMigrations);
        } else {
            // 隐藏所有迁徙路线
            this.clearMigrationRoutes();
        }
    }
} 