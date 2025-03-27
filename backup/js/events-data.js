/**
 * 枪炮、病毒与钢铁中的关键历史事件数据
 * 数据结构包含:
 * - id: 唯一标识符
 * - year: 发生年份(负数表示公元前)
 * - title: 事件标题
 * - description: 事件详细描述
 * - location: [经度, 纬度]
 * - category: 事件类别(农业、技术、文明、征服、疾病、迁徙)
 * - importance: 重要性(1-5, 5为最重要)
 * - relatedEvents: 相关事件ID数组
 */
export const historyEvents = [
    {
        id: 1,
        year: -11000,
        title: "末次冰期结束",
        description: "约公元前11000年，末次冰期结束，全球气候变暖，为农业发展创造了条件。这一气候变化使得肥沃新月地带和其他地区开始出现适宜种植的环境。",
        location: [35.0, 30.0], // 中东地区
        category: "农业",
        importance: 5,
        relatedEvents: [2, 3]
    },
    {
        id: 2,
        year: -9000,
        title: "肥沃新月地带农业起源",
        description: "在肥沃新月地带(今伊拉克、叙利亚、土耳其南部地区)，人类开始驯化小麦、豌豆等作物，开创了农业文明的先河。这里拥有丰富的可驯化植物种类，成为人类最早的农业中心之一。",
        location: [44.0, 33.0], // 肥沃新月地带
        category: "农业",
        importance: 5,
        relatedEvents: [1, 4]
    },
    {
        id: 3,
        year: -8500,
        title: "动物驯化始于肥沃新月地带",
        description: "绵羊和山羊等动物开始在肥沃新月地带被驯化。这些动物为人类提供了肉类、奶制品、皮毛和力量，极大促进了农业社会的发展。",
        location: [42.0, 37.0], // 肥沃新月地带北部
        category: "农业",
        importance: 4,
        relatedEvents: [2, 4]
    },
    {
        id: 4,
        year: -8000,
        title: "家畜驯化扩展",
        description: "牛、猪等大型哺乳动物被驯化。这些动物不仅提供食物，还成为耕种和运输的重要工具，显著提高了农业生产效率。在《枪炮、病毒与钢铁》中，贾雷德·戴蒙德强调了欧亚大陆拥有的可驯化大型哺乳动物数量远超其他大陆，这成为欧亚文明发展的重要优势。",
        location: [40.0, 35.0], // 近东地区
        category: "农业",
        importance: 4,
        relatedEvents: [3, 7]
    },
    {
        id: 5,
        year: -7500,
        title: "中国开始种植水稻",
        description: "在长江流域，中国人开始种植水稻。水稻种植技术的出现使东亚成为世界另一个重要的农业发源地，形成了与西亚小麦文明不同的农业发展路径。",
        location: [114.0, 30.0], // 长江流域
        category: "农业",
        importance: 4,
        relatedEvents: [2, 6]
    },
    {
        id: 6,
        year: -7000,
        title: "美洲农业起源",
        description: "在墨西哥中部，当地人开始驯化玉米和南瓜等作物，这标志着美洲农业的起源。由于地理隔离，美洲的农业发展路径与欧亚大陆完全不同，缺乏可驯化的大型哺乳动物也限制了其发展速度。",
        location: [-100.0, 20.0], // 墨西哥中部
        category: "农业",
        importance: 4,
        relatedEvents: [2, 5]
    },
    {
        id: 7,
        year: -6000,
        title: "轮子的发明",
        description: "轮子在美索不达米亚被发明，显著改变了运输和农业生产方式。结合家畜的使用，轮式运输工具大大提高了货物运输效率和军事机动性，成为文明发展的关键技术之一。",
        location: [45.0, 33.0], // 美索不达米亚
        category: "技术",
        importance: 4,
        relatedEvents: [4, 8]
    },
    {
        id: 8,
        year: -5500,
        title: "冶金技术起源",
        description: "人类开始在近东地区使用铜矿石，后来发展出青铜冶炼技术。金属工具的出现大大提高了农业生产效率，也为武器制造提供了新的可能性。",
        location: [39.0, 37.0], // 小亚细亚
        category: "技术",
        importance: 4,
        relatedEvents: [7, 13]
    },
    {
        id: 9,
        year: -5000,
        title: "埃及文明形成",
        description: "尼罗河流域形成统一的埃及文明，开始建立复杂的社会和政治结构。尼罗河的定期泛滥为农业提供了肥沃土壤，使埃及成为古代世界最稳定的农业社会之一。",
        location: [31.0, 30.0], // 尼罗河流域
        category: "文明",
        importance: 4,
        relatedEvents: [2, 10]
    },
    {
        id: 10,
        year: -4500,
        title: "苏美尔文明兴起",
        description: "苏美尔文明在两河流域建立，发明了楔形文字。这是人类最早的城市文明之一，也是文字记录系统的起源地。苏美尔人的灌溉技术和社会组织模式对后来的文明产生了深远影响。",
        location: [46.0, 31.0], // 美索不达米亚南部
        category: "文明",
        importance: 5,
        relatedEvents: [9, 11]
    },
    {
        id: 11,
        year: -4000,
        title: "印度河流域文明形成",
        description: "哈拉帕文明在印度河流域兴起，发展出复杂的城市规划和排水系统。这一文明的兴起进一步证明了河流灌溉农业在早期文明发展中的核心作用。",
        location: [72.0, 27.0], // 印度河流域
        category: "文明",
        importance: 3,
        relatedEvents: [9, 10]
    },
    {
        id: 12,
        year: -3500,
        title: "文字系统发展",
        description: "苏美尔人发展楔形文字系统，埃及人创造象形文字。文字的出现使知识得以记录和传承，极大促进了文明的发展和复杂社会组织的形成。",
        location: [44.0, 32.0], // 美索不达米亚
        category: "技术",
        importance: 5,
        relatedEvents: [10, 14]
    },
    {
        id: 13,
        year: -3000,
        title: "青铜器时代全面到来",
        description: "青铜冶炼技术在欧亚大陆广泛传播，带来更先进的工具和武器。金属武器的出现改变了战争形态，也加速了社会分层。",
        location: [40.0, 40.0], // 小亚细亚和高加索地区
        category: "技术",
        importance: 4,
        relatedEvents: [8, 16]
    },
    {
        id: 14,
        year: -2700,
        title: "中国文明出现文字",
        description: "中国出现甲骨文，最早的汉字形式。中国文字系统的独立发展表明不同文明可以沿着不同路径解决类似问题，但地理连续性仍然限制了技术传播的范围和速度。",
        location: [117.0, 35.0], // 黄河流域
        category: "技术",
        importance: 4,
        relatedEvents: [12, 15]
    },
    {
        id: 15,
        year: -2200,
        title: "中国夏朝建立",
        description: "传统上认为中国第一个王朝夏朝建立，标志着中国早期国家形态的出现。尽管证据有限，这一时期的青铜器技术和政治组织确实达到了新的水平。",
        location: [112.0, 35.0], // 黄河中游
        category: "文明",
        importance: 3,
        relatedEvents: [14, 17]
    },
    {
        id: 16,
        year: -1200,
        title: "铁器时代开始",
        description: "铁器在小亚细亚地区开始广泛使用，随后传播到欧亚大陆其他地区。铁器的使用大大降低了金属工具的成本，使普通农民也能使用金属农具，提高了农业生产效率。",
        location: [36.0, 38.0], // 赫梯帝国地区
        category: "技术",
        importance: 5,
        relatedEvents: [13, 18]
    },
    {
        id: 17,
        year: -1000,
        title: "多区域文明成熟",
        description: "世界多个地区的文明达到成熟阶段，包括中国、印度、中东和地中海地区。文明间的交流开始增加，但仍受限于地理障碍。",
        location: [0.0, 30.0], // 象征性位置
        category: "文明",
        importance: 4,
        relatedEvents: [15, 19]
    },
    {
        id: 18,
        year: -500,
        title: "马其顿扩张与希腊化时代",
        description: "亚历山大大帝征服波斯帝国，将希腊文化传播到中亚和印度。这次大规模的文化和技术交流加速了欧亚大陆东西方的互动。",
        location: [25.0, 35.0], // 希腊
        category: "征服",
        importance: 4,
        relatedEvents: [17, 20]
    },
    {
        id: 19,
        year: -221,
        title: "中国统一",
        description: "秦始皇统一中国，建立中央集权制度。中国的统一加速了技术和文化在东亚地区的传播，也为后来的丝绸之路奠定了基础。",
        location: [108.0, 34.0], // 秦都咸阳
        category: "文明",
        importance: 4,
        relatedEvents: [17, 20]
    },
    {
        id: 20,
        year: 1,
        title: "欧亚大陆贸易路线成熟",
        description: "丝绸之路全面开通，连接中国、印度、中亚和罗马帝国。这些贸易路线不仅交换商品，也传播技术、疾病和思想，加速了欧亚大陆的整合过程。",
        location: [75.0, 40.0], // 中亚
        category: "迁徙",
        importance: 5,
        relatedEvents: [18, 19, 21]
    },
    {
        id: 21,
        year: 541,
        title: "查士丁尼瘟疫",
        description: "第一次记录详细的鼠疫大流行，在拜占庭帝国爆发并传播到整个地中海地区。这次疫情可能来自中亚或东亚，通过贸易路线传播，最终导致了欧洲人口锐减。",
        location: [28.0, 41.0], // 君士坦丁堡
        category: "疾病",
        importance: 4,
        relatedEvents: [20, 22]
    },
    {
        id: 22,
        year: 1347,
        title: "黑死病席卷欧亚",
        description: "黑死病从中亚传播到欧洲，导致欧洲人口减少约三分之一。书中指出，疾病是欧洲征服者最强大的武器之一，美洲和其他区域的原住民因缺乏免疫力而在后来的接触中大量死亡。",
        location: [15.0, 45.0], // 欧洲中部
        category: "疾病",
        importance: 5,
        relatedEvents: [21, 25]
    },
    {
        id: 23,
        year: 1492,
        title: "哥伦布抵达美洲",
        description: "欧洲与美洲的接触开始，生物交换和文化冲突随之而来。这次接触导致了史无前例的人口灾难，美洲原住民因欧亚疾病而大量死亡，展示了生物因素在人类历史中的决定性作用。",
        location: [-70.0, 20.0], // 加勒比地区
        category: "迁徙",
        importance: 5,
        relatedEvents: [24, 25]
    },
    {
        id: 24,
        year: 1521,
        title: "科尔特斯征服阿兹特克",
        description: "西班牙征服者科尔特斯击败阿兹特克帝国。这场征服展示了欧洲征服者如何利用技术优势、疾病和当地盟友的帮助征服美洲大国。",
        location: [-99.0, 19.0], // 墨西哥城
        category: "征服",
        importance: 4,
        relatedEvents: [23, 25]
    },
    {
        id: 25,
        year: 1600,
        title: "大规模人口迁移与交换",
        description: "欧洲人开始大规模移民美洲，非洲奴隶被强制带到新大陆。这一时期的人口迁移彻底改变了全球人口构成，也加速了文化和技术的全球传播。",
        location: [-40.0, 25.0], // 大西洋
        category: "迁徙",
        importance: 5,
        relatedEvents: [22, 23, 24]
    },
    {
        id: 26,
        year: 1750,
        title: "工业革命开始",
        description: "蒸汽机的发明和应用在英国引发工业革命。工业革命极大提高了欧洲的生产力和军事力量，进一步加剧了全球力量不平衡，最终导致欧洲殖民体系的全面建立。",
        location: [-2.0, 53.0], // 英国
        category: "技术",
        importance: 5,
        relatedEvents: [25, 27]
    },
    {
        id: 27,
        year: 1900,
        title: "全球殖民体系确立",
        description: "欧洲列强控制全球大部分地区，建立起全球性殖民体系。这是《枪炮、病毒与钢铁》所探讨问题的终点——为什么是欧洲人征服了美洲和其他地区，而不是相反。",
        location: [0.0, 0.0], // 象征性位置
        category: "征服",
        importance: 5,
        relatedEvents: [26]
    }
];

// 为了在非ES模块环境中也能使用
if (typeof window !== 'undefined') {
  window.historyEvents = historyEvents;
} 