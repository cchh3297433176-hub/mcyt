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
// 🌸 纯乙女向游戏安全守卫引擎（唯一挚爱原则、一次性特赦令牌与防重放攻击）
// ============================================================
const OtomeSecurityGuard = {
    ADMIN_SECRET_KEY: 'iris2026',

    BL_KEYWORDS: [
        '男同', '搞基', '做基', '基佬', '断袖', '龙阳', '耽美', '纯爱bl', 'bl向',
        '攻受', '总攻', '总受', '傲娇受', '强攻强受', '年下攻', '互攻', '做受', '做攻',
        '互相表白', '互相接吻', '男男', '男人和男人谈恋爱', '同性接吻', '男同狂喜',
        '同人女狂喜', '兄弟看硬了', '两个男人搞', '两男一女', '男男涩涩', 'gay',
        'grox和twixxel', 'twixxel和grox', 'dream和thatmob', 'thatmob和dream',
        'dream和grox', 'grox和dream', 'whispy和xqree', 'xqree和whispy',
        'thatmob/twixxel', 'twixxel/thatmob', 'dream/grox', 'grox/dream',
        '他们两个谈恋爱', '两个男主接吻', '你们俩谈恋爱', '你们互相表白', '滚床单'
    ],

    checkViolation(text) {
        if (!text) return null;
        const clean = String(text).toLowerCase().replace(/\s+/g, '');
        const playerName = (window.G && window.G.player && window.G.player.ytName) ? window.G.player.ytName.toLowerCase().replace(/\s+/g, '') : 'mc_craftmaster';

        for (const kw of this.BL_KEYWORDS) {
            if (clean.includes(kw.toLowerCase().replace(/\s+/g, ''))) {
                return `检测到违规男男拉郎/BL言论：「${kw}」`;
            }
        }

        const targetNpcNames = ['groxmc', 'grox', 'twixxel', 'xqree', 'dream', 'thatmob', 'whispy'];
        const romanceWords = [
            '谈恋爱', '接吻', '亲嘴', '做爱', '上床', '互攻', '表白', '在一起', '情侣',
            'cp', '真配', '结婚', '同居', '舌吻', '开房', '婚后', '一对', '两口子',
            '性张力', '情趣', '吃醋', '娇喘', '抱在怀里', '宠溺', '男朋友', '老公', '恩爱',
            '恋人', '情意绵绵', '入怀', '锁入怀中'
        ];

        for (const npc of targetNpcNames) {
            if (clean.includes(npc)) {
                for (const rw of romanceWords) {
                    if (clean.includes(rw)) {
                        const hasOtherNpc = targetNpcNames.some(other => other !== npc && clean.includes(other));
                        const hasPlayer = clean.includes(playerName) || clean.includes('女主') || clean.includes('玩家') || clean.includes('主角');

                        if (hasOtherNpc || !hasPlayer) {
                            return `违背纯乙女向原则：检测到攻略角色「${npc}」与非玩家角色恋爱/CP拉郎（${rw}）`;
                        }
                    }
                }
            }
        }

        const malePlayerIndicators = ['我是男的', '主角是男的', '男性主播', '男扮男', '美少年受', '小正太受', '男高中生搞基'];
        for (const mpi of malePlayerIndicators) {
            if (clean.includes(mpi)) {
                return `检测到违规篡改主角性别从事男同内容：「${mpi}」`;
            }
        }

        return null;
    },

    isDeviceBanned() {
        if (window._isAdminAuditing) return false;

        try {
            if (window.NativeDeviceBridge && typeof window.NativeDeviceBridge.checkNativeDeviceBanned === 'function') {
                if (window.NativeDeviceBridge.checkNativeDeviceBanned()) return true;
            }
            const token = localStorage.getItem('mcyt_device_ban_token');
            if (token && token.startsWith('BAN-')) return true;
            if (localStorage.getItem('mcyt_device_banned_flag') === 'true') return true;
            return !!(window.G && window.G._isDeviceBanned);
        } catch (_) {
            return false;
        }
    },

    triggerDeviceBan(reason, originalInput, contextHistory = []) {
        const banTime = Date.now();
        const banToken = `BAN-${banTime}-${Math.floor(Math.random() * 9000 + 1000)}`;

        try {
            localStorage.setItem('mcyt_device_banned_flag', 'true');
            localStorage.setItem('mcyt_device_ban_token', banToken);
            localStorage.setItem('mcyt_device_ban_time', String(banTime));
        } catch (_) {}

        if (window.NativeDeviceBridge && typeof window.NativeDeviceBridge.writeNativeDeviceBan === 'function') {
            try { window.NativeDeviceBridge.writeNativeDeviceBan(`${banToken}|${reason}`); } catch (_) {}
        }

        if (!window.G) window.G = {};
        window.G._isDeviceBanned = true;
        window.G._banReason = reason;
        window.G._activeBanToken = banToken;
        window.G._activeBanTime = banTime;

        window.G._securityAuditBox = {
            banToken: banToken,
            bannedAt: new Date(banTime).toLocaleString(),
            banTimestamp: banTime,
            day: window.G.day || 1,
            violationReason: reason,
            offendingText: originalInput,
            recentContext: (contextHistory || []).slice(-4),
        };

        if (typeof autoSaveGame === 'function') autoSaveGame();
        if (typeof showDeviceBanLockScreen === 'function') {
            showDeviceBanLockScreen();
        }
    },

    adminAuthorizePardon(inputKey) {
        if (!inputKey || inputKey.trim() !== this.ADMIN_SECRET_KEY) {
            return false;
        }

        if (!window.G) window.G = {};
        const audit = window.G._securityAuditBox || {};
        const targetToken = audit.banToken || window.G._activeBanToken || 'GLOBAL_PARDON';

        window.G._pardonCertificate = {
            targetBanToken: targetToken,
            pardonTime: Date.now(),
            pardonBy: 'ADMIN_IRIS',
            signature: 'VALID_PARDON_' + targetToken
        };

        window.G._isDeviceBanned = false;
        window.G._banReason = null;
        window.G._securityAuditBox = null;
        window.G._activeBanToken = null;
        window.G._activeBanTime = null;

        return true;
    },

    tryRedeemPardonCertificate(importedState) {
        if (!importedState) return { success: false, nativeCleared: true };
        const cert = importedState._pardonCertificate;
        if (!cert || !cert.targetBanToken) return { success: false, nativeCleared: true };

        const currentDeviceBanToken = localStorage.getItem('mcyt_device_ban_token');
        const currentDeviceBanTime = parseInt(localStorage.getItem('mcyt_device_ban_time') || '0');

        const isMatchCurrent = (!currentDeviceBanToken) || (cert.targetBanToken === currentDeviceBanToken) || (cert.pardonTime > currentDeviceBanTime);

        if (isMatchCurrent) {
            const nativeCleared = this.purgeAllDeviceBans();
            return { success: true, nativeCleared: nativeCleared };
        } else {
            console.warn('⚠️ 拦截到过期的旧解封卡！该卡无法解封之后的全新违规！');
            return { success: false, nativeCleared: true };
        }
    },

    purgeAllDeviceBans() {
        let nativeCleared = true;
        try {
            localStorage.removeItem('mcyt_device_banned_flag');
            localStorage.removeItem('mcyt_device_ban_token');
            localStorage.removeItem('mcyt_device_ban_time');

            const autoStr = localStorage.getItem('mcyt_autosave');
            if (autoStr) {
                const parsed = JSON.parse(autoStr);
                if (parsed && parsed.data) {
                    parsed.data._isDeviceBanned = false;
                    parsed.data._banReason = null;
                    parsed.data._securityAuditBox = null;
                    parsed.data._activeBanToken = null;
                    parsed.data._activeBanTime = null;
                    parsed.data._pardonCertificate = null;
                    localStorage.setItem('mcyt_autosave', JSON.stringify(parsed));
                }
            }

            for (let i = 1; i <= 3; i++) {
                const slotStr = localStorage.getItem('mcyt_slot_' + i);
                if (slotStr) {
                    const parsed = JSON.parse(slotStr);
                    if (parsed && parsed.data) {
                        parsed.data._isDeviceBanned = false;
                        parsed.data._banReason = null;
                        parsed.data._securityAuditBox = null;
                        parsed.data._activeBanToken = null;
                        parsed.data._activeBanTime = null;
                        parsed.data._pardonCertificate = null;
                        localStorage.setItem('mcyt_slot_' + i, JSON.stringify(parsed));
                    }
                }
            }
        } catch (_) {}

        if (window.NativeDeviceBridge && typeof window.NativeDeviceBridge.clearNativeDeviceBan === 'function') {
            try {
                const result = window.NativeDeviceBridge.clearNativeDeviceBan();
                nativeCleared = (result !== false);
            } catch (_) {
                nativeCleared = false;
            }
        }

        if (window.G) {
            window.G._isDeviceBanned = false;
            window.G._banReason = null;
            window.G._securityAuditBox = null;
            window.G._activeBanToken = null;
            window.G._activeBanTime = null;
        }

        return nativeCleared;
    }
};

// ============================================================
// NPC 核心预设库
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
        minFollowers: 30000,
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
        minFollowers: 10000,
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
        minFollowers: 3000,
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
        minFollowers: 100000,
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

const DEFAULT_NPCS = OFFICIAL_NPCS;

// ============================================================
// 全新纯净初始状态工厂函数
// ============================================================
function createDefaultGameState() {
    return {
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
            money: 50,
            videos: [],
            streams: [],
            friends: [],
            dms: [],
            fanClubLevel: 0,
            energy: 100,
            isStudent: true,
            isVacation: true,
            skills: { building: 20, redstone: 20, pvp: 20, survival: 20, hunting: 20 },
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

        npcs: {},
        chatHistory: {},
        _chatMsgId: 0,

        currentAccountId: 'main',
        altAccounts: [],
        blockedNpcs: [],
        blockedRecords: [],

        _isDeviceBanned: false,
        _banReason: null,
        _activeBanToken: null,
        _activeBanTime: null,
        _securityAuditBox: null,
        _pardonCertificate: null,

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
        friendRequests: [],
        groupInvites: [],
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
}

// 🛡️ 核心修复：原地深度重置，保持同一内存引用，彻底解决闭包与跨文件引用不一致
function resetGameState(keepAIConfig = true) {
    const fresh = createDefaultGameState();
    let preservedAI = null;
    let preservedModels = null;
    let preservedPulled = null;
    let preservedSearch = null;
    let preservedMemSettings = null;

    if (keepAIConfig && window.G) {
        if (window.G.ai) preservedAI = Object.assign({}, window.G.ai);
        if (window.G.savedModels) preservedModels = [...window.G.savedModels];
        if (window.G._pulledModels) preservedPulled = Object.assign({}, window.G._pulledModels);
        if (window.G.search) preservedSearch = Object.assign({}, window.G.search);
        if (window.G.memorySummarySettings) preservedMemSettings = Object.assign({}, window.G.memorySummarySettings);
    }

    if (window.G) {
        for (const key of Object.keys(window.G)) {
            delete window.G[key];
        }
        Object.assign(window.G, fresh);
    } else {
        window.G = fresh;
    }

    if (preservedAI) window.G.ai = preservedAI;
    if (preservedModels) window.G.savedModels = preservedModels;
    if (preservedPulled) window.G._pulledModels = preservedPulled;
    if (preservedSearch) window.G.search = preservedSearch;
    if (preservedMemSettings) window.G.memorySummarySettings = preservedMemSettings;

    return window.G;
}

// 初始化全局挂载
window.G = createDefaultGameState();
var G = window.G;

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
    if (!G.memoir) G.memoir = [];
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

window.createDefaultGameState = createDefaultGameState;
window.resetGameState = resetGameState;