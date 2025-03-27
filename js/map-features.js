export class MapFeatures {
    constructor(mapCore) {
        this.mapCore = mapCore;
        this.techMarkers = new Map();
        this.speciesMarkers = new Map();
        this.civilizationMarkers = new Map();
        this.warMarkers = new Map();
        this.diseaseMarkers = new Map();
        this.agricultureMarkers = new Map();
    }

    async initialize() {
        // 初始化各类特征
    }

    async updateToYear(year) {
        await Promise.all([
            this.updateTechnologies(year),
            this.updateSpecies(year),
            this.updateCivilizations(year),
            this.updateWars(year),
            this.updateDiseases(year),
            this.updateAgriculture(year)
        ]);
    }

    // 技术发展相关
    async updateTechnologies(year) {
        this.clearTechMarkers();
        const technologies = await this.getRelevantTechnologies(year);
        technologies.forEach(tech => {
            const marker = this.createTechMarker(tech);
            this.techMarkers.set(tech.id, marker);
            marker.addTo(this.mapCore.map);
        });
    }

    // 物种分布相关
    async updateSpecies(year) {
        this.clearSpeciesMarkers();
        const species = await this.getRelevantSpecies(year);
        species.forEach(spec => {
            const marker = this.createSpeciesMarker(spec);
            this.speciesMarkers.set(spec.id, marker);
            marker.addTo(this.mapCore.map);
        });
    }

    // 文明发展相关
    async updateCivilizations(year) {
        this.clearCivilizationMarkers();
        const civilizations = await this.getRelevantCivilizations(year);
        civilizations.forEach(civ => {
            const marker = this.createCivilizationMarker(civ);
            this.civilizationMarkers.set(civ.id, marker);
            marker.addTo(this.mapCore.map);
        });
    }

    // 战争相关
    async updateWars(year) {
        this.clearWarMarkers();
        const wars = await this.getRelevantWars(year);
        wars.forEach(war => {
            const marker = this.createWarMarker(war);
            this.warMarkers.set(war.id, marker);
            marker.addTo(this.mapCore.map);
        });
    }

    // 疾病相关
    async updateDiseases(year) {
        this.clearDiseaseMarkers();
        const diseases = await this.getRelevantDiseases(year);
        diseases.forEach(disease => {
            const marker = this.createDiseaseMarker(disease);
            this.diseaseMarkers.set(disease.id, marker);
            marker.addTo(this.mapCore.map);
        });
    }

    // 农业相关
    async updateAgriculture(year) {
        this.clearAgricultureMarkers();
        const agriculture = await this.getRelevantAgriculture(year);
        agriculture.forEach(agri => {
            const marker = this.createAgricultureMarker(agri);
            this.agricultureMarkers.set(agri.id, marker);
            marker.addTo(this.mapCore.map);
        });
    }

    // 创建各类标记
    createCustomMarker(latlng, category, name) {
        const icon = L.divIcon({
            className: `feature-marker ${category}`,
            html: `<div class="feature-icon">
                    <i class="material-icons-round">${this.getCategoryIcon(category)}</i>
                  </div>`
        });

        return L.marker(latlng, {
            icon: icon,
            title: name
        });
    }

    // 清除各类标记
    clearTechMarkers() {
        this.techMarkers.forEach(marker => marker.remove());
        this.techMarkers.clear();
    }

    clearSpeciesMarkers() {
        this.speciesMarkers.forEach(marker => marker.remove());
        this.speciesMarkers.clear();
    }

    clearCivilizationMarkers() {
        this.civilizationMarkers.forEach(marker => marker.remove());
        this.civilizationMarkers.clear();
    }

    clearWarMarkers() {
        this.warMarkers.forEach(marker => marker.remove());
        this.warMarkers.clear();
    }

    clearDiseaseMarkers() {
        this.diseaseMarkers.forEach(marker => marker.remove());
        this.diseaseMarkers.clear();
    }

    clearAgricultureMarkers() {
        this.agricultureMarkers.forEach(marker => marker.remove());
        this.agricultureMarkers.clear();
    }

    // 工具方法
    getCategoryIcon(category) {
        const icons = {
            'technology': 'lightbulb',
            'species': 'pets',
            'civilization': 'account_balance',
            'war': 'gavel',
            'disease': 'coronavirus',
            'agriculture': 'grass'
        };
        return icons[category] || 'place';
    }

    formatYear(year) {
        const absYear = Math.abs(year);
        return year < 0 ? `公元前 ${absYear} 年` : `公元 ${year} 年`;
    }

    // 数据获取方法
    async getRelevantTechnologies(year) {
        // 实现从数据源获取技术数据的逻辑
        return [];
    }

    async getRelevantSpecies(year) {
        // 实现从数据源获取物种数据的逻辑
        return [];
    }

    async getRelevantCivilizations(year) {
        // 实现从数据源获取文明数据的逻辑
        return [];
    }

    async getRelevantWars(year) {
        // 实现从数据源获取战争数据的逻辑
        return [];
    }

    async getRelevantDiseases(year) {
        // 实现从数据源获取疾病数据的逻辑
        return [];
    }

    async getRelevantAgriculture(year) {
        // 实现从数据源获取农业数据的逻辑
        return [];
    }
} 