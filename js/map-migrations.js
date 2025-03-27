export class MapMigrations {
    constructor(mapCore) {
        this.mapCore = mapCore;
        this.migrationRoutes = new Map();
        this.currentMigrations = [];
    }

    async initialize() {
        // 初始化迁徙相关功能
    }

    async updateToYear(year) {
        this.clearMigrationRoutes();
        const migrations = await this.getActiveMigrations(year);
        await this.updateMigrationRoutes(migrations);
    }

    async updateMigrationRoutes(migrations) {
        this.currentMigrations = migrations;
        this.clearMigrationRoutes();

        migrations.forEach(migration => {
            const path = this.createMigrationPath(migration);
            this.migrationRoutes.set(migration.id, path);
            path.addTo(this.mapCore.map);
        });
    }

    createMigrationPath(migration) {
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
            '物种': '#10b981'
        };
        return colors[category] || '#6b7280';
    }

    createMigrationPopupContent(migration) {
        return `
            <div class="migration-popup">
                <h3 class="text-lg font-semibold">${migration.name}</h3>
                <div class="text-sm text-gray-600 mb-2">
                    ${this.formatYear(migration.startYear)} - ${this.formatYear(migration.endYear)}
                </div>
                <p class="text-gray-700">${migration.description}</p>
            </div>
        `;
    }

    formatYear(year) {
        const absYear = Math.abs(year);
        return year < 0 ? `公元前 ${absYear} 年` : `公元 ${year} 年`;
    }

    async getActiveMigrations(year) {
        // 从数据源获取特定年份的迁徙路线
        // 这里需要实现具体的数据获取逻辑
        return [];
    }

    clearMigrationRoutes() {
        this.migrationRoutes.forEach(route => {
            route.remove();
        });
        this.migrationRoutes.clear();
    }
} 