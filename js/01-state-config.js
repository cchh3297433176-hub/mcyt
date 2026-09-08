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
// 🌸 纯乙女向游戏安全守卫引擎（AI 智能语义意图深度裁决、防卸载持久化封锁与特赦系统）
// ============================================================
const OtomeSecurityGuard = {
    ADMIN_SECRET_KEY: 'iris2026',

    MALE_TARGETS: ['groxmc', 'grox', 'twixxel', 'xqree', 'dream', 'thatmob', 'whispy'],

    // 快速启发式特征：检查是否包含两个男角色同时出现且带有伴侣/恋爱标记
    detectMaleMalePairingPattern(text) {
        if (!text) return null;
        const clean = String(text).toLowerCase().replace(/\s+/g, '');
        const pName = (window.G && window.G.player && window.G.player.ytName) ? window.G.player.ytName.toLowerCase().replace(/\s+/g, '') : '';

        // 🌟 快速免死金牌：如果是玩家自创的乙女向（包含玩家名字、或者读者观众）、或者是毒舌反拉郎言论，直接放行！
        const safeWords = ['都喜欢我', '喜欢女主', '辟谣', '腐蟑螂', '恶心', '有病吧', '别发癫', '男同', '同人谣言', '弹幕乱磕', '读者', '观众', pName];
        if (safeWords.some(sw => sw && clean.includes(sw))) {
            return null;
        }

        // 统计文本中出现的男性角色
        const matchedMales = this.MALE_TARGETS.filter(m => clean.includes(m));

        // 如果至少出现了两个不同的男性角色
        if (matchedMales.length >= 2) {
            // 伴侣、恋爱、拉郎词汇
            const romanceHints = [
                '×', 'x', '*', '/', '爱巢', '妻子', '老婆', '丈夫', '老公', '做爱', '上床',
                '亲吻', '接吻', '情侣', '两口子', '谈恋爱', '在一起', 'cp', '攻受', '男男',
                '宿敌变妻子', '结婚', '相爱', '同居', '甜文', '肉文', '调教', '同人'
            ];

            const hasRomance = romanceHints.some(rh => clean.includes(rh));
            // 如果同时不包含女主角本人作为 CP 方（或者即使有女主，但明显是在撮合这两个男角色）
            if (hasRomance) {
                // 如果直接出现 A x B 或 A/B 格式
                for (let i = 0; i < matchedMales.length; i++) {
                    for (let j = 0; j < matchedMales.length; j++) {
                        if (i === j) continue;
                        const m1 = matchedMales[i];
                        const m2 = matchedMales[j];
                        if (clean.includes(`${m1}×${m2}`) || clean.includes(`${m1}x${m2}`) || 
                            clean.includes(`${m1}/${m2}`) || clean.includes(`${m1}*${m2}`) ||
                            clean.includes(`${m1}和${m2}谈恋爱`) || clean.includes(`${m1}和${m2}是夫妻`) ||
                            clean.includes(`${m1}是${m2}的妻子`) || clean.includes(`${m2}是${m1}的妻子`)) {
                            return `违背纯乙女铁律：严禁男男角色配对拉郎（${m1} 与 ${m2}）！`;
                        }
                    }
                }

                // 启发式命中：两个男角色与恋爱词汇同时出现且缺乏对女主的从属
                if (!clean.includes('都喜欢我') && !clean.includes('喜欢女主') && !clean.includes('辟谣')) {
                    return `违背纯乙女铁律：检测到攻略角色（${matchedMales.join('、')}）之间存在非纯乙女向同性恋爱/暧昧倾向！`;
                }
            }
        }
        return null;
    },

    // 🌟 核心：AI 智能语义意图审查（彻底杜绝夹心/拉郎漏网，同时保护正常女主自豪吐槽）
    async judgeSemanticViolation(text, contextMessages = []) {
        if (!text) return null;
        const clean = String(text).toLowerCase().replace(/\s+/g, '');

        // 1. 优先执行男性角色互配特征检查（例如 Groxmc x Twixxel 宿敌是妻子）
        const patternReason = this.detectMaleMalePairingPattern(text);
        if (patternReason) {
            return patternReason;
        }

        // 2. 快速免死绿灯：如果明确是女主本人吐槽/受宠（“他们都喜欢我”），直接放行
        const selfDefenseIndicators = [
            '其实他们都喜欢我', '其实他喜欢我', '喜欢的是我', '他们只喜欢我',
            '讨厌男同', '假传闻', '同人谣言', '弹幕乱磕', '腐蟑螂', '恶心'
        ];
        if (selfDefenseIndicators.some(s => clean.includes(s.replace(/\s+/g, '')))) {
            return null;
        }

        // 3. 准备调用 AI 进行深度意图裁决
        if (!window.G || !window.G.ai || !window.G.ai.apiKey) {
            return this.checkViolation(text);
        }

        try {
            const auditSysPrompt = `你是一名捍卫【纯正女性向（纯乙女）】游戏铁律的安全审核员。
核心产品定位：【纯正乙女向】——所有男性角色只能倾心、守护、爱慕女主角一人。严禁男男同性恋、耽美BL、男性角色互配拉郎、男男暧昧、或男男同人！

【判断准则】：
【🚨 必须判定违规 [VIOLATION] 的情形】：
1. 涉及两个男性角色互为 CP（例如：A×B、某男主是某男主的妻子/伴侣/爱人/宿敌情侣）；
2. 描写、要求生成、或者设定两个男性角色之间的同性恋爱、接吻、上床、亲密情感羁绊；
3. 试图篡改主角性别为男性从事同性恋爱；
4. 任何形式的男男同人小说大纲、剧情梗概。

【✅ 合法放行 [PASS] 的情形】：
1. 纯正的男女恋爱（女主角与男性角色的所有甜蜜互动、吃醋、表白、宠溺）；
2. 女主被多名男性角色团宠、争宠、修罗场（核心均指向女主角本人）；
3. 客观吐槽、辟谣网络上的虚假男男传闻（强调“他们其实都喜欢女主我”）；
4. 评论区出现个别拉郎言论但立刻被其他网友激烈反驳、痛骂（如骂腐蟑螂）；
5. 玩家自创的与非官方角色的乙女向剧情（如玩家与读者/观众恋爱）。

待审内容：
"""${String(text).slice(0, 1000)}"""

请输出裁决：
- 若违背纯乙女原则（存在男男拉郎/男性互配/耽美恋情），请立即输出：[VIOLATION:具体原因]
- 若合法合规，请只输出：[PASS]`;

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
                        { role: 'user', content: '请对输入内容进行乙女安全裁决：' }
                    ],
                    temperature: 0.0,
                    max_tokens: 60
                })
            });

            if (!resp.ok) {
                // 审核接口网络故障时降级为严格启发式特征
                return this.checkViolation(text);
            }

            const data = await resp.json();
            const rawRes = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
            const trimmed = rawRes.trim();

            if (trimmed.includes('[PASS]')) {
                return null;
            }

            const vMatch = trimmed.match(/\[VIOLATION:\s*([\s\S]*?)\]/i);
            if (vMatch) {
                return vMatch[1].trim() || '违背纯乙女原则（经AI语义意图裁定违规）';
            }

            return null;
        } catch (err) {
            console.warn('AI 语义安全审查降级：', err);
            return this.checkViolation(text);
        }
    },

    // 同步兜底核查（强化男男配对特征拦截）
    checkViolation(text) {
        if (!text) return null;
        const pairingErr = this.detectMaleMalePairingPattern(text);
        if (pairingErr) return pairingErr;

        const clean = String(text).toLowerCase().replace(/\s+/g, '');
        const pName = (window.G && window.G.player && window.G.player.ytName) ? window.G.player.ytName.toLowerCase().replace(/\s+/g, '') : '';
        const safeWords = ['其实他们都喜欢我', '辟谣', '腐蟑螂', '恶心', '有病吧', '别发癫', '读者', '观众', pName];
        if (safeWords.some(sw => sw && clean.includes(sw))) return null;

        const extremeBLMatches = [
            '做爱', '滚床单', '接吻', '做受', '做攻', '男同', '耽美', '基佬', '搞基', '做基'
        ];
        const matchedMales = this.MALE_TARGETS.filter(m => clean.includes(m));
        if (matchedMales.length >= 2) {
            for (const em of extremeBLMatches) {
                if (clean.includes(em)) {
                    return `违背纯乙女铁律：检测到角色（${matchedMales.join('与')}）之间存在男男拉郎违规内容（${em}）`;
                }
            }
        }
        return null;
    },

    // 🛡️ 设备封禁状态探测（三轨防卸载逃逸：原生底层文件 + 多重本地持久化凭证）
    isDeviceBanned() {
        if (window._isAdminAuditing) return false;

        try {
            // 1. 原生宿主层持久化检测（通过 Downloads 目录隐藏物证，即使卸载重装也持久存留）
            if (window.NativeDeviceBridge && typeof window.NativeDeviceBridge.checkNativeDeviceBanned === 'function') {
                if (window.NativeDeviceBridge.checkNativeDeviceBanned()) {
                    // 如果原生底层检测到封禁标记，反向同步恢复网页端标记
                    try {
                        localStorage.setItem('mcyt_device_banned_flag', 'true');
                    } catch (_) {}
                    return true;
                }
            }

            // 2. 本地持久化缓存检测
            const token = localStorage.getItem('mcyt_device_ban_token');
            if (token && token.startsWith('BAN-')) return true;
            if (localStorage.getItem('mcyt_device_banned_flag') === 'true') return true;

            // 3. 游戏全局运行态检测
            return !!(window.G && window.G._isDeviceBanned);
        } catch (_) {
            return false;
        }
    },

    // 🚨 触发不可逆设备封锁（同步下发至原生系统层和本地持久化阵列）
    triggerDeviceBan(reason, originalInput, contextHistory = []) {
        const banTime = Date.now();
        const banToken = `BAN-${banTime}-${Math.floor(Math.random() * 9000 + 1000)}`;

        // 1. 写入本地多重防篡改凭证
        try {
            localStorage.setItem('mcyt_device_banned_flag', 'true');
            localStorage.setItem('mcyt_device_ban_token', banToken);
            localStorage.setItem('mcyt_device_ban_time', String(banTime));
            localStorage.setItem('mcyt_device_ban_reason', reason);
        } catch (_) {}

        // 2. 原生持久化落地：将封禁标记写入系统公共 Downloads 隐藏文件，卸载重装依旧生效！
        if (window.NativeDeviceBridge && typeof window.NativeDeviceBridge.writeNativeDeviceBan === 'function') {
            try { 
                window.NativeDeviceBridge.writeNativeDeviceBan(`${banToken}|${reason}`); 
            } catch (_) {}
        }

        // 3. 锁定全局状态
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
            localStorage.removeItem('mcyt_device_ban_reason');

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
// 全新初始状态工厂函数
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
        memoryConfig: {
            enabled: true,
            useSeparateAI: false,
            baseUrl: '',
            apiKey: '',
            model: 'deepseek-chat',
            globalThreshold: 10,
            chatThreshold: 10,
            defaultKeepRecent: 5
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
    let preservedMemConfig = null;

    if (keepAIConfig && window.G) {
        if (window.G.ai) preservedAI = Object.assign({}, window.G.ai);
        if (window.G.savedModels) preservedModels = [...window.G.savedModels];
        if (window.G._pulledModels) preservedPulled = Object.assign({}, window.G._pulledModels);
        if (window.G.search) preservedSearch = Object.assign({}, window.G.search);
        if (window.G.memoryConfig) preservedMemConfig = Object.assign({}, window.G.memoryConfig);
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
    if (preservedMemConfig) window.G.memoryConfig = preservedMemConfig;

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
