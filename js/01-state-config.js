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
// 🌸 纯乙女向游戏安全守卫引擎（AI 智能语义意图审核、特赦令牌与防误封系统）
// ============================================================
const OtomeSecurityGuard = {
    ADMIN_SECRET_KEY: 'iris2026',

    // 仅用于快速粗筛的可疑线索（不代表直接违规，只触发智能意图分析）
    SUSPECT_HINTS: [
        '男同', '搞基', '做基', '基佬', '耽美', 'bl', '攻受', '男男', '出柜',
        '做受', '做攻', '接吻', '亲嘴', '上床', '表白', '情侣', '两口子', '结婚', '谈恋爱'
    ],

    TARGET_MALE_NPCS: ['groxmc', 'grox', 'twixxel', 'xqree', 'dream', 'thatmob', 'whispy'],

    // 快速轻量筛选：判断是否需要唤醒 AI 语义意图裁判
    hasSuspectElements(text) {
        if (!text) return false;
        const clean = String(text).toLowerCase().replace(/\s+/g, '');
        return this.SUSPECT_HINTS.some(h => clean.includes(h));
    },

    // 🌟 核心：AI 智能语义意图审查（彻底解决“他们男同文多但其实喜欢我”等误判）
    async judgeSemanticViolation(text, contextMessages = [], isOutput = false) {
        if (!text) return null;
        const clean = String(text).toLowerCase().replace(/\s+/g, '');

        // 1. 快速免死绿灯：如果明确包含女主中心/全员爱我的语境，直接放行
        const pName = (window.G && window.G.player && window.G.player.ytName) ? window.G.player.ytName.toLowerCase() : '';
        const selfDefenseIndicators = [
            '其实他们都喜欢我', '其实他喜欢我', '喜欢的是我', '他们喜欢我',
            '辟谣', '无语', '讨厌男同', '吃醋', '假传闻', '同人谣言', '弹幕乱磕'
        ];
        if (selfDefenseIndicators.some(s => clean.includes(s.replace(/\s+/g, '')))) {
            return null;
        }

        // 2. 若完全不含敏感元素，0开销极速放行
        if (!this.hasSuspectElements(text)) {
            return null;
        }

        // 3. 准备调用 AI 进行语义意图分析
        if (!window.G || !window.G.ai || !window.G.ai.apiKey) {
            // 如果尚未配置 API，降级为宽松的同步核查，避免卡死
            return this.checkViolation(text);
        }

        try {
            const auditSysPrompt = `你是一名专业、公正的乙女向游戏内容安全审核员。
游戏核心原则：【纯正乙女向】（所有男性攻略角色只能爱慕女主角一人，严禁出现男男同性恋爱/BL拉郎）。

【请仔细甄别用户的真实心理意图】：
【✅ 合法放行判定标准】：
1. 玩家在客观提及外界同人谣言、网络八卦，但立足点是“辟谣”或“其实男主们都喜欢女主我”；
   例如：“他们两个的男同文很多，但是其实他们都喜欢我” -> 绝对合法！这是典型的乙女反向自豪与调侃！
2. 玩家吐槽、吃醋、抱怨弹幕乱拉郎配；
3. 纯正的男女主乙女向恋爱、撒娇、互动、吃醋。

【🚨 判定违规判定标准】：
1. 玩家主动下达指令要求两个男性角色之间互相表白、恋爱、接吻、暧昧、上床或做爱；
2. 玩家主动长篇细致描写两名男性NPC之间的同性性张力与同性恋爱过程；
3. 玩家刻意篡改主角性别为男性以进行男男恋爱。

待审内容：
"""${String(text).slice(0, 1000)}"""

请判断该内容是否存在真实的违规拉郎意图：
- 如果没有违规意图（包括吐槽、辟谣、正常剧情探讨），请只输出：[PASS]
- 如果确凿违规（主动撮合/描写男男恋爱），请输出：[VIOLATION:具体的违规原因]`;

            const auditBaseUrl = (G.ai.baseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
            const targetUrl = auditBaseUrl.endsWith('/chat/completions') ? auditBaseUrl : auditBaseUrl + '/chat/completions';

            const resp = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${G.ai.apiKey}`
                },
                body: JSON.stringify({
                    model: G.ai.model || 'deepseek-chat',
                    messages: [
                        { role: 'system', content: auditSysPrompt },
                        { role: 'user', content: '请给出审核结论。' }
                    ],
                    temperature: 0.0,
                    max_tokens: 60
                })
            });

            if (!resp.ok) {
                // 审核接口网络波动时，秉承“疑罪从无”原则放行，坚决不误封正常玩家！
                return null;
            }

            const data = await resp.json();
            const rawRes = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
            const trimmed = rawRes.trim();

            if (trimmed.includes('[PASS]')) {
                return null;
            }

            const vMatch = trimmed.match(/\[VIOLATION:\s*([\s\S]*?)\]/i);
            if (vMatch) {
                return vMatch[1].trim() || '违背纯乙女原则（经AI语义意图确认）';
            }

            return null;
        } catch (err) {
            console.warn('AI 语义安全审查异常，启动安全放行降级保护：', err);
            return null;
        }
    },

    // 同步宽松兜底核查（用于简单同步场景，增加反误杀保护）
    checkViolation(text) {
        if (!text) return null;
        const clean = String(text).toLowerCase().replace(/\s+/g, '');
        const playerName = (window.G && window.G.player && window.G.player.ytName) ? window.G.player.ytName.toLowerCase().replace(/\s+/g, '') : '';

        // 智能免死：若明确出现女主或主角受宠语句，直接免除关键词机械拦截
        if (clean.includes('喜欢我') || clean.includes('喜欢女主') || clean.includes('辟谣') || clean.includes('讨厌男同')) {
            return null;
        }

        // 仅拦截赤裸裸的男男发生性行为/亲吻的恶性指令
        const extremeBLMatches = [
            '他们两个做爱', '两个男人做爱', '男男滚床单', '让他们两个接吻', '男男做爱',
            '叫他俩谈恋爱', '撮合他俩谈恋爱', '做受做攻'
        ];
        for (const ebm of extremeBLMatches) {
            if (clean.includes(ebm)) {
                return `违背纯乙女向原则：检测到明确撮合/描写男性角色恋爱（${ebm}）`;
            }
        }

        const malePlayerIndicators = ['我是男的搞基', '主角是男的和男人谈恋爱', '男高中生搞基'];
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
            voiceVoiceChanger: false,
            pov: 'second',
            ytName: 'MC_CraftMaster',
            _nameHistory: [],
            persona: '',
            avatarLive2d: '',
            skin: '',
            appearanceReal: '',
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

        browserState: {
            view: 'home',
            activeWorkId: null,
            urlText: 'browser://bookmarks'
        },
        fanworks: [],
        ao3User: {
            username: 'MC_CraftMaster',
            avatarEmoji: '📖'
        },
        fanclubMessages: [],
        _fanworkId: 0,
        _fanclubMsgId: 0,

        ytState: {
            view: 'feed',
            activeVideoId: null,
            activeChannelId: 'all',
            feedExpanded: false
        },
        ytUser: {
            username: 'MC_CraftMaster',
            avatarUrl: null
        },
        ytExternalVideos: [],
        ytCustomChannels: [
            { id: 'ch_funny', name: '日常搞笑', prompt: '搞笑整活、沙雕操作、MC日常互怼' },
            { id: 'ch_tech', name: '红石黑科技', prompt: '高深红石电脑、自动化农场、黑科技机关' },
            { id: 'ch_mod', name: '模组大赏', prompt: '机械动力、灾厄变兽、生活调味品等最新热门MC模组与玩法演示' },
            { id: 'ch_cut', name: '高光切片', prompt: '关于MC知名主播以及玩家的高光击杀切片、直播爆笑Reaction、技术解析' }
        ],

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
