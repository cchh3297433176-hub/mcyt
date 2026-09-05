// ============================================================
// CONFIG & STATE 
// ============================================================
const CONFIG = {
    DEFAULT_BASE_URL: 'https://api.deepseek.com/v1',
    DEFAULT_MODEL: 'deepseek-chat',
    MAX_TOKENS: 10000,
    TEMPERATURE: 0.85,
};

// ============================================================
// NPC 核心预设库（官方主播池，随玩家粉丝与热度逐步申请好友）
// ============================================================
const OFFICIAL_NPCS = {
    groxmc: {
        id: 'groxmc',
        name: 'Groxmc',
        gender: '男',
        persona: '骚话连篇但较自我中心，风趣幽默，和熟人合作时暴虐村民为卖点，口头禅：hey yo chill / Alright bet。直播风格风趣幽默。',
        appearance: '黑色西装打红色领带的黑色骷髅，气质冷峻帅气。',
        skin: '黑色西装打红色领带的黑色骷髅',
        category: '血腥抽象暴力、村民虐待',
        followers: 7420000,
        minFollowers: 30000, // 达到3万粉丝可能引起其关注
        catchphrase: 'hey yo chill',
        streamStyle: '风趣幽默，声音不大',
        avatarEmoji: '💀',
        initialFavor: 0,
        favor: 0,
        interactionCount: 0,
        works: ['《100万个村民模拟文明》', '《100万村民追猎》'],
        _confessed: false,
        _relationship: 'single',
        skills: { building: 95, redstone: 80, pvp: 25, survival: 95, hunting: 60 }
    },
    twixxel: {
        id: 'twixxel',
        name: 'Twixxel',
        gender: '男',
        persona: '性格温和，在关键时候给出方法。胆子不大，有点怕怪物，看见空房屋会住进去。',
        appearance: '通体纯黑色，仅有四个白色像素点眼睛和微笑嘴。',
        skin: '通体纯黑色，四个像素点眼睛',
        category: '伪实况、恐怖模组实况',
        followers: 1090000,
        minFollowers: 10000, // 达到1万粉丝可能关注
        catchphrase: 'Oh no...',
        streamStyle: '抽象风，偶尔段子',
        avatarEmoji: '👾',
        initialFavor: 0,
        favor: 0,
        interactionCount: 0,
        works: ['《I\'ve genuinely never been this scared》'],
        _confessed: false,
        _relationship: 'single',
        skills: { building: 60, redstone: 40, pvp: 50, survival: 85, hunting: 80 }
    },
    xqree: {
        id: 'xqree',
        name: 'xqree',
        gender: '男',
        persona: '外表温和，实际敢爱敢恨，对喜欢的人温柔有礼，声音好听被吓到就喘。',
        appearance: '穿着西装，戴俄罗斯遮耳帽，肤色为黑，眼睛白色。',
        skin: '西装遮耳帽黑皮白眼',
        category: '伪实况、二创',
        followers: 110000,
        minFollowers: 3000, // 新人早期容易结识
        catchphrase: 'Oh gosh...',
        streamStyle: '暂无直播',
        avatarEmoji: '🐰',
        initialFavor: 0,
        favor: 0,
        interactionCount: 0,
        works: ['《Falsity》系列'],
        _confessed: false,
        _relationship: 'single',
        skills: { building: 80, redstone: 55, pvp: 80, survival: 50, hunting: 50 }
    },
    dream: {
        id: 'dream',
        name: 'Dream',
        gender: '男',
        persona: '技术超群、自信张扬的速通者，天性神秘，享受掌控。',
        appearance: '白色笑脸面具，绿色上衣，黑色裤子。',
        skin: '白色笑脸面具绿色上衣',
        category: 'Manhunt、速通',
        followers: 35000000,
        minFollowers: 100000, // 顶级大主播，需要10万粉关注
        catchphrase: 'In this video...',
        streamStyle: '快节奏、高强度挑战',
        avatarEmoji: '🎭',
        initialFavor: 0,
        favor: 0,
        interactionCount: 0,
        works: ['《Minecraft Manhunt》系列'],
        _confessed: false,
        _relationship: 'single',
        minFollowersForDM: 500000,
        skills: { building: 90, redstone: 90, pvp: 100, survival: 100, hunting: 100 }
    },
    thatmob: {
        id: 'thatmob',
        name: 'ThatMob',
        gender: '男',
        persona: '20岁加拿大/法国人，随和健谈，带点傲娇。',
        appearance: '炭黑色皮肤、黑发、翠绿眼睛，绿色护目镜黑色战术夹克。',
        skin: '绿色护目镜黑色战术夹克',
        category: '恐怖模组、ARG',
        followers: 2400000,
        minFollowers: 20000,
        catchphrase: '',
        streamStyle: '随和健谈',
        avatarEmoji: '👽',
        initialFavor: 0,
        favor: 0,
        interactionCount: 0,
        works: ['《Verity》系列'],
        _confessed: false,
        _relationship: 'single',
        skills: { building: 60, redstone: 50, pvp: 40, survival: 75, hunting: 70 }
    },
    whispy: {
        id: 'whispy',
        name: 'Whispy',
        gender: '男',
        persona: '充满活力，好感度高了之后话唠且粘人，被称作小南瓜。真生气了会一声不吭。',
        appearance: '橙色南瓜头，粉色连帽衫。',
        skin: '橙色南瓜头粉色连帽衫',
        category: '恐怖模组创作者、《Verity》配音',
        followers: 210000,
        minFollowers: 5000,
        catchphrase: '',
        streamStyle: '高萌',
        avatarEmoji: '🎃',
        initialFavor: 0,
        favor: 0,
        interactionCount: 0,
        works: ['为 Verity 角色配音'],
        _confessed: false,
        _relationship: 'single',
        skills: { building: 55, redstone: 40, pvp: 35, survival: 70, hunting: 60 }
    }
};

// 保持历史兼容的 DEFAULT_NPCS 镜像引用
const DEFAULT_NPCS = OFFICIAL_NPCS;

// ============================================================
// GLOBAL STATE
// ============================================================
let G = {
    ai: { baseUrl: '', apiKey: '', model: '' },
    savedModels: [],
    _pulledModels: {},
    search: { apiKey: '', enabled: false },
    player: {
        identity: 'new',
        age: 18,
        gender: '女',
        ytName: 'MC_CraftMaster',
        persona: '',
        skin: '',
        category: '剧情',
        followers: 0,
        likes: 0,
        money: 0,
        videos: [],
        streams: [],
        friends: [],
        dms: [],
        fanClubLevel: 0,
        energy: 100,
        isStudent: true,
        isVacation: true,
        skills: { building: 0, redstone: 0, pvp: 0, survival: 0, hunting: 0 },
        streamHistory: [],
        avatar: null,
        equipmentLevel: 1,
        metDream: false,
        lovers: [],
        personaStyle: 'neutral'
    },
    day: 1,
    timeSlot: 0,
    actionPoints: 6,
    maxActionPoints: 6,
    phase: 'setup',
    storyHistory: [],
    memorySummaries: [],
    memorySummarySettings: {
        enabled: false,
        threshold: 10,
        keepRecent: 5,
        modelProfileId: '',
    },
    usedThemes: new Set(),
    isGenerating: false,
    totalVideos: 0,
    totalStreams: 0,
    totalCollabs: 0,
    totalDMs: 0,
    currentStream: null,

    // 社交与通讯录机制（新档初始联系人为空，随粉丝热度与好友申请加入）
    npcs: {},
    chatHistory: {},
    _chatMsgId: 0,

    // 大小号系统
    currentAccountId: 'main', // 'main' 代表大号，其余为小号 id
    altAccounts: [], // 存储格式：[{ id: 'alt_xxx', name: '小号名字', avatar: '...', bio: '...' }]
    blockedNpcs: [], // 记录哪些 NPC 拉黑了大号（无法再用大号发消息）

    fanworks: [],
    fanclubMessages: [],
    _fanworkId: 0,
    _fanclubMsgId: 0,
    currentChatNpc: null,
    currentChatGroup: null,
    chatActiveTab: 'direct',
    phoneNav: 'chats',
    groups: {},
    groupChatHistory: {},
    friendRequests: [], // 待处理好友申请
    groupInvites: [],   // 待处理群聊邀请
    momentsFilterNpcId: null,
    confessionState: null,
    collections: {},
    _lastBriefing: null,
    memoir: [],
    _logId: 0,
    _npcDailyConfession: {},
    feed: [],
    feedIdCounter: 0,
    achievements: [],
    unlockedAchievements: [],
    sponsorOffers: [],
    sponsorCooldown: 0,
    milestoneReached: [],
    _npcInitiatedToday: {},
};

// 安全 DOM 索引助手
const $ = id => document.getElementById(id);
const dom = {
    get setupPage() { return $('setupPage'); },
    get gamePage() { return $('gamePage'); },
    get identityGroup() { return $('identityGroup'); },
    get age() { return $('ageInput'); },
    get ytName() { return $('ytNameInput'); },
    get persona() { return $('personaInput'); },
    get skin() { return $('skinInput'); },
    get category() { return $('categorySelect'); },
    get startBtn() { return $('startGameBtn'); },
    get dayDisplay() { return $('dayDisplay'); },
    get timeDisplay() { return $('timeDisplay'); },
    get apDisplay() { return $('apDisplay'); },
    get apDots() { return $('apDots'); },
    get storyArea() { return $('storyArea'); },
    get streamContainer() { return $('streamContainer'); },
    get dashboardTab() { return $('dashboardTab'); },
    get shopTab() { return $('shopTab'); },
    get socialTab() { return $('socialTab'); },
    get dataTab() { return $('dataTab'); },
    get memoirTab() { return $('memoirTab'); },
    get achievementsTab() { return $('achievementsTab'); },
    get modal() { return $('modal'); },
    get modalBody() { return $('modalBody'); },
    get modalClose() { return $('modalClose'); },
    get toast() { return $('toast'); },
    get storyTab() { return $('storyTab'); },
    get headerAvatarImg() { return $('headerAvatarImg'); },
    get avatarPreview() { return $('avatarPreview'); },
    get avatarFileInput() { return $('avatarFileInput'); },
    get uploadAvatarBtn() { return $('uploadAvatarBtn'); },
    get saveGameBtn() { return $('saveGameBtn'); },
    get loadGameBtn() { return $('loadGameBtn'); },
};

// ============================================================
// UTILITY
// ============================================================
function getTimeSlotName(slot) { return ['早晨 ☀️', '中午 🌤️', '夜晚 🌙'][slot] || '早晨'; }

function showToast(msg, type = 'error', duration = 3000) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show ' + (type === 'success' ? 'success' : '');
    clearTimeout(t._hide);
    t._hide = setTimeout(() => { t.className = 'toast'; }, duration);
}

function getRadioValue(groupId) {
    const el = document.getElementById(groupId);
    if (!el) return null;
    const checked = el.querySelector('input:checked');
    return checked ? checked.value : null;
}

function setRadioValue(groupId, val) {
    const el = document.getElementById(groupId);
    if (!el) return;
    const inputs = el.querySelectorAll('input');
    inputs.forEach(inp => { inp.checked = (inp.value === val); });
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getFavorStage(favor) {
    if (favor >= 100) return '💖 挚爱/宿命';
    if (favor >= 80) return '💞 唯一/宿命';
    if (favor >= 60) return '💗 心动偏袒';
    if (favor >= 40) return '💕 暗生情愫';
    if (favor >= 20) return '🤝 友好';
    return '👋 陌生疏离';
}

function addMemoir(event, details = '') {
    const entry = { id: G._logId++, day: G.day, event: event, details: details, timestamp: new Date().toLocaleString() };
    G.memoir.push(entry);
    if (G.memoir.length > 100) G.memoir = G.memoir.slice(-100);
}

function detectPersonaStyle(personaText) {
    const lower = (personaText || '').toLowerCase();
    if (lower.includes('害羞') || lower.includes('安静') || lower.includes('内向') || lower.includes('社恐') ||
        lower.includes('腼腆') || lower.includes('沉默') || lower.includes('寡言')) {
        return 'introvert';
    }
    if (lower.includes('嚣张') || lower.includes('自信') || lower.includes('自大') || lower.includes('狂') ||
        lower.includes('张扬') || lower.includes('霸气') || lower.includes('狂妄')) {
        return 'arrogant';
    }
    if (lower.includes('温柔') || lower.includes('柔和') || lower.includes('温暖') || lower.includes('体贴')) {
        return 'gentle';
    }
    if (lower.includes('幽默') || lower.includes('搞笑') || lower.includes('有趣') || lower.includes('逗') ||
        lower.includes('欢乐')) {
        return 'humorous';
    }
    if (lower.includes('外向') || lower.includes('活泼') || lower.includes('开朗') || lower.includes('热情') ||
        lower.includes('阳光')) {
        return 'extrovert';
    }
    return 'neutral';
}

const ACHIEVEMENTS = [
    { id: 'fans_1k', name: '✨ 初露锋芒', desc: '粉丝达到 1,000', icon: '✨', reward: 1000, category: 'fans', check: () => G.player.followers >= 1000 },
    { id: 'fans_5k', name: '🌟 小有名气', desc: '粉丝达到 5,000', icon: '🌟', reward: 10000, category: 'fans', check: () => G.player.followers >= 5000 },
    { id: 'fans_10k', name: '🔥 圈内新星', desc: '粉丝达到 10,000', icon: '🔥', reward: 15000, category: 'fans', check: () => G.player.followers >= 10000 },
    { id: 'fans_100k', name: '👑 成名在望', desc: '粉丝达到 100,000', icon: '👑', reward: 20000, category: 'fans', check: () => G.player.followers >= 100000 },
    { id: 'fans_1m', name: '💎 百万大咖', desc: '粉丝达到 1,000,000', icon: '💎', reward: 50000, category: 'fans', check: () => G.player.followers >= 1000000 },
    { id: 'fans_5m', name: '🚀 五百万霸主', desc: '粉丝达到 5,000,000', icon: '🚀', reward: 1000000, category: 'fans', check: () => G.player.followers >= 5000000 },
    { id: 'fans_10m', name: '🌍 千万传奇', desc: '粉丝达到 10,000,000', icon: '🌍', reward: 10000000, category: 'fans', check: () => G.player.followers >= 10000000 },
    { id: 'video_1', name: '🎬 首次发布', desc: '发布第 1 个视频', icon: '🎬', reward: 100, category: 'video', check: () => G.player.videos.length >= 1 },
    { id: 'video_10', name: '📹 辛勤创作者', desc: '发布第 10 个视频', icon: '📹', reward: 1000, category: 'video', check: () => G.player.videos.length >= 10 },
    { id: 'video_50', name: '🎥 高产大户', desc: '发布第 50 个视频', icon: '🎥', reward: 1500, category: 'video', check: () => G.player.videos.length >= 50 },
    { id: 'video_100', name: '🏅 百部巨匠', desc: '发布第 100 个视频', icon: '🏅', reward: 10000, category: 'video', check: () => G.player.videos.length >= 100 },
    { id: 'stream_1', name: '🔴 首次开播', desc: '完成第一次直播', icon: '🔴', reward: 500, category: 'stream', check: () => G.player.streamHistory.length >= 1 },
    { id: 'stream_10', name: '📡 直播常客', desc: '累计直播 10 次', icon: '📡', reward: 1000, category: 'stream', check: () => G.player.streamHistory.length >= 10 },
    { id: 'stream_50', name: '📺 直播狂人', desc: '累计直播 50 次', icon: '📺', reward: 10000, category: 'stream', check: () => G.player.streamHistory.length >= 50 },
    { id: 'friend_1', name: '🤝 初次交友', desc: '结交第 1 位好友', icon: '🤝', reward: 100, category: 'social', check: () => G.player.friends.length >= 1 },
    { id: 'friend_5', name: '👥 社交达人', desc: '结交第 5 位好友', icon: '👥', reward: 300, category: 'social', check: () => G.player.friends.length >= 5 },
    { id: 'friend_10', name: '🌈 人脉广博', desc: '结交第 10 位好友', icon: '🌈', reward: 800, category: 'social', check: () => G.player.friends.length >= 10 },
    { id: 'love_1', name: '💕 怦然心动', desc: '首次确立恋爱关系', icon: '💕', reward: 52000, category: 'social', check: () => G.player.lovers.length >= 1 },
    { id: 'love_5', name: '🥰 大家都是我的翅膀', desc: '任意恋爱关系大于5', icon: '🥰', reward: 114514, category: 'social', check: () => G.player.lovers.length >= 5 },
];

const MILESTONES = [
    { value: 1000, label: '1,000 粉丝', icon: '🌟' },
    { value: 10000, label: '10,000 粉丝', icon: '🔥' },
    { value: 100000, label: '100,000 粉丝', icon: '👑' },
    { value: 500000, label: '500,000 粉丝', icon: '💎' },
    { value: 1000000, label: '1,000,000 粉丝', icon: '🚀' },
    { value: 5000000, label: '5,000,000 粉丝', icon: '🌍' },
    { value: 10000000, label: '10,000,000 粉丝', icon: '🏆' },
];

const SPONSOR_TYPES = [
    { id: 'modpack', name: '🎮 模组包推广', desc: '推广一个热门MC模组包', reward: 3000, risk: 0.05 },
    { id: 'pc_brand', name: '💻 电脑品牌合作', desc: '推广一款游戏本', reward: 8000, risk: 0.03 },
    { id: 'snack', name: '🍿 零食饮料品牌', desc: '推广一款能量饮料', reward: 2000, risk: 0.02 },
    { id: 'peripheral', name: '🎧 外设品牌', desc: '推广键盘/鼠标/耳机', reward: 5000, risk: 0.04 },
    { id: 'server', name: '🖥️ 服务器托管', desc: '推广MC服务器托管服务', reward: 6000, risk: 0.06 },
];
// ============================================================