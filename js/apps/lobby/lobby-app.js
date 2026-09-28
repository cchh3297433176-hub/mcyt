/**
 * js/apps/lobby/lobby-app.js
 * 主播掌机 · 全新独立游戏大厅 App（微信原生白灰微绿设计质感）
 * 核心特性：
 * 1. 微信原生极简质感：纯白卡片、极浅灰底色（#f7f7f7）、原生微绿高亮（#07c160），全站消灭 Emoji，改用极简 SVG；
 * 2. 状态栏顶部安全区适配：避让灵动岛与状态栏顶栏，不重合不遮挡；
 * 3. 隐私与安全防护：界面绝不回显私有 VPS 真实 IP，掩码脱敏防泄密；
 * 4. 多角色自由联机：自适应双人单选 / 多人（斗地主、大富翁、飞行棋）多选联系人入座，自建头像 100% 真实提取；
 * 5. 端内纯规则离线引擎保底：离线秒开，对局走子零 Token 消耗；
 * 6. OpenAI 兼容协议独立多方案管理中心：支持自定义 BaseURL、ApiKey，无虚假假模型列表，真实抓取远程模型并支持关键词实时过滤，多方案备注保存与一键切换；
 * 7. Whisper 活人对话联动调度中枢：局内发消息时，结合角色人设与当前客观对局局面，调起大模型生成性格回复回填！
 * 8. 战报与羁绊记忆沉淀：对局结算后自主选择【转发战报到聊天】，落盘单聊历史！
 */

(function () {
    'use strict';

    // 默认内置云端裁判服务地址（后台静默连接，界面上绝不向用户回显展示）
    const DEFAULT_SERVER_URL = 'http://121.43.122.253:8787';
    const API_PROFILES_KEY = 'mcyt_lobby_api_profiles';
    const ACTIVE_PROFILE_ID_KEY = 'mcyt_lobby_active_profile_id';

    function getLobbyServerUrl() {
        return localStorage.getItem('mcyt_lobby_server_url') || DEFAULT_SERVER_URL;
    }

    function getDisplayCustomServerUrl() {
        return localStorage.getItem('mcyt_lobby_server_url') || '';
    }

    function setLobbyServerUrl(url) {
        if (!url || !url.trim()) {
            localStorage.removeItem('mcyt_lobby_server_url');
        } else {
            let clean = url.trim().replace(/^(https?:\/\/)+/i, '').replace(/\/+$/, '');
            localStorage.setItem('mcyt_lobby_server_url', 'http://' + clean);
        }
    }

    function isLobbyIndividualAiThinking() {
        return localStorage.getItem('mcyt_lobby_individual_ai') === 'true';
    }

    function setLobbyIndividualAiThinking(val) {
        localStorage.setItem('mcyt_lobby_individual_ai', val ? 'true' : 'false');
    }

    // ====== 多方案 API 管理体系 ======
    function getApiProfiles() {
        try {
            const list = JSON.parse(localStorage.getItem(API_PROFILES_KEY) || '[]');
            if (Array.isArray(list)) return list;
        } catch (_) {}
        return [];
    }

    function saveApiProfiles(list) {
        localStorage.setItem(API_PROFILES_KEY, JSON.stringify(list || []));
    }

    function getActiveProfileId() {
        return localStorage.getItem(ACTIVE_PROFILE_ID_KEY) || '';
    }

    function setActiveProfileId(id) {
        localStorage.setItem(ACTIVE_PROFILE_ID_KEY, id || '');
    }

    function getActiveApiConfig() {
        const profiles = getApiProfiles();
        const activeId = getActiveProfileId();
        let cur = profiles.find(p => p.id === activeId);
        if (!cur && profiles.length > 0) cur = profiles[0];

        // 兜底：如果游戏大厅没有单独配方案，尝试读取系统主配置
        if (!cur) {
            try {
                const sysModel = JSON.parse(localStorage.getItem('mcyt_system_model_config') || '{}');
                if (sysModel.baseUrl || sysModel.apiKey) {
                    return {
                        baseUrl: sysModel.baseUrl || '',
                        apiKey: sysModel.apiKey || '',
                        model: sysModel.model || '',
                        remark: '系统主配置'
                    };
                }
            } catch (_) {}
        }
        return cur || null;
    }

    // 10 款已支持的游戏清单配置
    const GAME_LIST = [
        {
            kind: 'gomoku',
            name: '五子棋',
            desc: '黑白交错，纵横博弈，先连五子者胜。适合与好友快节奏切磋。',
            minNpc: 1,
            maxNpc: 1,
            tag: '经典对弈',
            icon: `<circle cx="12" cy="12" r="8" fill="#181818"/><circle cx="12" cy="12" r="4" fill="#ffffff"/>`
        },
        {
            kind: 'go',
            name: '围棋',
            desc: '十九路纵横经纬，气数流转，千古无同局。考验深层大局观与算力。',
            minNpc: 1,
            maxNpc: 1,
            tag: '深谋远虑',
            icon: `<circle cx="8" cy="8" r="5" fill="#181818"/><circle cx="16" cy="16" r="5" fill="#ffffff" stroke="#181818" stroke-width="1.5"/>`
        },
        {
            kind: 'xiangqi',
            name: '中国象棋',
            desc: '楚河汉界，车马炮兵，将帅对决。国粹博弈，杀法凌厉。',
            minNpc: 1,
            maxNpc: 1,
            tag: '楚河汉界',
            icon: `<circle cx="12" cy="12" r="8" fill="#fa5151"/><text x="12" y="15.5" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle">帥</text>`
        },
        {
            kind: 'chess',
            name: '国际象棋',
            desc: '王车易位，兵升后变，传统西洋智力竞技。',
            minNpc: 1,
            maxNpc: 1,
            tag: '西洋智弈',
            icon: `<path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM8 10h8v4H8zM6 18h12v3H6z" fill="#07c160"/>`
        },
        {
            kind: 'reversi',
            name: '黑白棋 (反转棋)',
            desc: '翻转局势，黑白逆转，一步走错全盘皆换。一分钟学会，一辈子琢磨。',
            minNpc: 1,
            maxNpc: 1,
            tag: '反转对决',
            icon: `<circle cx="12" cy="12" r="8" fill="#181818"/><path d="M12 4a8 8 0 0 1 0 16z" fill="#ffffff"/>`
        },
        {
            kind: 'doudizhu',
            name: '斗地主',
            desc: '三人经典扑克对决，需要邀请 2 位同伴共同入桌，二打一博弈。',
            minNpc: 2,
            maxNpc: 2,
            tag: '欢乐三家',
            icon: `<rect x="5" y="4" width="14" height="16" rx="2" fill="#ff9900"/><path d="M9 8h6M9 12h6M9 16h3" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>`
        },
        {
            kind: 'paodekuai',
            name: '跑得快',
            desc: '经典关牌竞技，能出必出，手牌先出完者胜。',
            minNpc: 1,
            maxNpc: 2,
            tag: '畅快出牌',
            icon: `<rect x="6" y="5" width="12" height="14" rx="2" fill="#07c160"/><line x1="8" y1="9" x2="16" y2="9" stroke="#fff" stroke-width="2"/>`
        },
        {
            kind: 'poker',
            name: '德州扑克',
            desc: '支持双人单挑或多人对决，公共牌与下注心理博弈。',
            minNpc: 1,
            maxNpc: 3,
            tag: '策略心理',
            icon: `<rect x="5" y="4" width="14" height="16" rx="2" fill="#fa5151"/><path d="M12 7l2 3h-4z" fill="#fff"/>`
        },
        {
            kind: 'aeroplane',
            name: '飞行棋',
            desc: '掷骰起飞，撞子回家，连环跳跃。支持 1~3 名同伴同桌联机。',
            minNpc: 1,
            maxNpc: 3,
            tag: '骰子冒险',
            icon: `<circle cx="12" cy="8" r="8" fill="#576b95"/><polygon points="12,5 15,14 12,12 9,14" fill="#fff"/>`
        },
        {
            kind: 'monopoly',
            name: '大富翁',
            desc: '环形地产投资、掷骰移动、资产扣减与破产对决，支持多人同台。',
            minNpc: 1,
            maxNpc: 3,
            tag: '地产大亨',
            icon: `<rect x="4" y="4" width="16" height="16" rx="3" fill="#07c160"/><path d="M8 12h8M12 8v8" stroke="#fff" stroke-width="2"/>`
        }
    ];

    window._activeLobbyMatch = null;
    window._activeLobbySeatToken = null;
    window._activeLobbySelectedNpcs = [];
    window._lobbyMessageListenerAttached = false;

    function safeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getSafeAvatar(npc) {
        if (!npc) return 'assets/icons/chat.png';
        return npc.avatarUrl || npc.avatar || 'assets/icons/chat.png';
    }

    function getAvailableNpcList() {
        let npcs = [];
        if (window.G && window.G.npcs) {
            npcs = Object.values(window.G.npcs);
        }
        if (!npcs.length) {
            try {
                const stored = JSON.parse(localStorage.getItem('mcyt_wechat_custom_npcs') || '{}');
                npcs = Object.values(stored);
            } catch (_) {}
        }
        return npcs.filter(n => n && (n.name || n.id));
    }

    function ensureLobbyStyles() {
        if (document.getElementById('mcyt-lobby-custom-style')) return;
        const style = document.createElement('style');
        style.id = 'mcyt-lobby-custom-style';
        style.textContent = `
            #lobbyAppViewport {
                --lobby-status-pad: var(--status-bar-height, 42px);
                box-sizing: border-box;
                width: 100%;
                height: 100%;
            }
            .lobby-clean-modal-mask {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.48);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                padding: 16px;
                box-sizing: border-box;
                animation: lobbyFadeIn 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
            }
            .lobby-clean-modal-dialog {
                background: #ffffff !important;
                border: 0.5px solid #eaeaea !important;
                border-radius: 14px !important;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15) !important;
                width: 100%;
                max-width: 335px;
                overflow: hidden;
                box-sizing: border-box;
                animation: lobbyPopUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                color: #222222 !important;
                text-shadow: none !important;
            }
            .lobby-clean-modal-header {
                padding: 15px 16px 12px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 0.5px solid #f0f0f0;
                background: #ffffff;
            }
            .lobby-clean-modal-title {
                font-size: 15px;
                font-weight: 600;
                color: #191919 !important;
                text-shadow: none !important;
                margin: 0;
            }
            .lobby-clean-modal-close {
                background: #f4f4f4;
                border: none;
                width: 26px;
                height: 26px;
                border-radius: 50%;
                font-size: 14px;
                color: #888;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .lobby-clean-modal-body {
                padding: 15px;
                box-sizing: border-box;
                color: #222222 !important;
                text-shadow: none !important;
                max-height: 80vh;
                overflow-y: auto;
            }
            .lobby-input-field {
                width: 100%;
                box-sizing: border-box;
                border: 0.5px solid #dcdcdc;
                border-radius: 6px;
                padding: 8px 10px;
                font-size: 12.5px;
                color: #181818;
                outline: none;
                background: #fff;
                transition: border-color 0.2s;
            }
            .lobby-input-field:focus {
                border-color: #07c160;
            }
            .lobby-loading-hud {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(17, 17, 17, 0.88);
                color: #ffffff;
                padding: 18px 24px;
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
                z-index: 100000;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                font-size: 13px;
                pointer-events: none;
                backdrop-filter: blur(4px);
                animation: lobbyFadeIn 0.2s ease-out;
            }
            .lobby-spinner {
                width: 28px;
                height: 28px;
                border: 3px solid rgba(255, 255, 255, 0.25);
                border-top-color: #07c160;
                border-radius: 50%;
                animation: lobbySpin 0.8s linear infinite;
            }
            @keyframes lobbySpin {
                to { transform: rotate(360deg); }
            }
            @keyframes lobbyFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes lobbyPopUp {
                from { transform: scale(0.92); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    function showLobbyLoading(text = '正在进入对局...') {
        ensureLobbyStyles();
        hideLobbyLoading();
        const hud = document.createElement('div');
        hud.id = 'lobbyLoadingHud';
        hud.className = 'lobby-loading-hud';
        hud.innerHTML = `
            <div class="lobby-spinner"></div>
            <div style="font-weight: 500; letter-spacing: 0.3px;">${safeHtml(text)}</div>
        `;
        document.body.appendChild(hud);
    }

    function hideLobbyLoading() {
        const hud = document.getElementById('lobbyLoadingHud');
        if (hud) hud.remove();
    }

    /**
     * 主渲染入口：渲染游戏大厅门户界面
     */
    window.renderLobbyApp = function (container) {
        ensureLobbyStyles();
        if (!container) container = document.getElementById('appModalBody');
        if (!container) return;

        const statusBarPad = 'padding-top: calc(var(--status-bar-height, 40px) + 2px);';
        const activeCfg = getActiveApiConfig();
        const curModelTag = activeCfg ? (activeCfg.remark || activeCfg.model || '自定义API') : '未配置API';

        container.innerHTML = `
            <div id="lobbyAppViewport" style="background:#f7f7f7;height:100%;min-height:100%;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;box-sizing:border-box;overflow:hidden;${statusBarPad}">
                
                <div style="background:#ffffff;height:48px;border-bottom:0.5px solid #e5e5e5;display:flex;align-items:center;justify-content:space-between;padding:0 14px;flex-shrink:0;box-sizing:border-box;user-select:none;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <button onclick="window.closePhoneApp()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:4px 6px;display:flex;align-items:center;gap:2px;font-weight:500;">
                            <span style="font-size:17px;line-height:1;">‹</span> <span>桌面</span>
                        </button>
                        <span style="font-size:16px;font-weight:600;color:#181818;margin-left:4px;">游戏大厅</span>
                    </div>

                    <div style="display:flex;align-items:center;gap:6px;">
                        <button onclick="window.openLobbyApiManageModal()" title="API模型配置" style="border:none;background:#e8f8ee;border-radius:14px;padding:4px 9px;font-size:11.5px;color:#07c160;cursor:pointer;display:flex;align-items:center;gap:4px;font-weight:500;">
                            <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:#07c160;stroke-width:2;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            <span>${safeHtml(curModelTag)}</span>
                        </button>
                        <button onclick="window.openLobbySettingsModal()" title="对局设置" style="border:none;background:#f2f2f2;border-radius:14px;padding:5px 8px;font-size:12px;color:#444;cursor:pointer;display:flex;align-items:center;">
                            <svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:none;stroke:#555;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <div style="flex:1;overflow-y:auto;padding:12px 14px 28px;box-sizing:border-box;scroll-behavior:smooth;">
                    <div style="background:#ffffff;border-radius:10px;padding:14px;margin-bottom:12px;border:0.5px solid #eaeaea;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                            <div style="width:26px;height:26px;border-radius:6px;background:rgba(7,193,96,0.12);display:flex;align-items:center;justify-content:center;color:#07c160;">
                                <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;"><rect x="2" y="6" width="20" height="12" rx="3"></rect><path d="M6 12h4m-2-2v4"></path></svg>
                            </div>
                            <span style="font-size:14px;font-weight:600;color:#181818;">掌机棋牌切磋中枢</span>
                        </div>
                        <div style="font-size:12px;color:#777;line-height:1.5;">
                            下棋出招由端内规则引擎毫秒级驱动，对局内说话与情绪互动通过你配置的独立模型生成，对局后一键转发胜负战报落盘单聊！
                        </div>
                    </div>

                    <div style="font-size:12px;font-weight:600;color:#888;margin:10px 4px 8px;letter-spacing:0.5px;">全部收录棋牌 (${GAME_LIST.length})</div>

                    <div style="display:flex;flex-direction:column;gap:10px;">
                        ${GAME_LIST.map(game => `
                            <div style="background:#ffffff;border-radius:10px;padding:13px 14px;border:0.5px solid #eaeaea;box-shadow:0 1px 4px rgba(0,0,0,0.03);display:flex;align-items:center;justify-content:space-between;gap:10px;">
                                <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
                                    <div style="width:40px;height:40px;border-radius:8px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                        <svg viewBox="0 0 24 24" style="width:22px;height:22px;">
                                            ${game.icon}
                                        </svg>
                                    </div>
                                    <div style="min-width:0;flex:1;">
                                        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                                            <span style="font-size:14.5px;font-weight:600;color:#181818;">${safeHtml(game.name)}</span>
                                            <span style="font-size:10px;color:#07c160;background:#e8f8ee;padding:1px 5px;border-radius:3px;font-weight:500;">${safeHtml(game.tag)}</span>
                                        </div>
                                        <div style="font-size:11.5px;color:#888;line-height:1.4;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;">
                                            ${safeHtml(game.desc)}
                                        </div>
                                    </div>
                                </div>
                                <button onclick="window.openCreateMatchModal('${game.kind}')" style="border:none;background:#07c160;color:#ffffff;padding:7px 14px;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;flex-shrink:0;box-shadow:0 2px 6px rgba(7,193,96,0.25);">
                                    一键开桌
                                </button>
                            </div>
                        `).join('')}
                    </div>

                </div>
            </div>
        `;
    };

    /**
     * 弹窗：选择自建角色开桌
     */
    window.openCreateMatchModal = function (gameKind) {
        ensureLobbyStyles();
        const game = GAME_LIST.find(g => g.kind === gameKind);
        if (!game) return;

        const npcs = getAvailableNpcList();
        if (!npcs.length) {
            if (typeof showToast === 'function') showToast('请先在微信聊天中创建至少一个角色同伴', 'info', 2000);
            return;
        }

        const isMulti = game.maxNpc > 1;
        const requiredText = (game.minNpc === game.maxNpc)
            ? `请选择 ${game.minNpc} 位同伴入座`
            : `请选择 ${game.minNpc}~${game.maxNpc} 位同伴入座`;

        const oldModal = document.getElementById('lobbyActiveDialog');
        if (oldModal) oldModal.remove();

        const mask = document.createElement('div');
        mask.id = 'lobbyActiveDialog';
        mask.className = 'lobby-clean-modal-mask';

        mask.innerHTML = `
            <div class="lobby-clean-modal-dialog">
                <div class="lobby-clean-modal-header">
                    <h3 class="lobby-clean-modal-title">邀请同伴 · ${safeHtml(game.name)}</h3>
                    <button type="button" class="lobby-clean-modal-close" id="btnLobbyModalClose">✕</button>
                </div>
                <div class="lobby-clean-modal-body">
                    <div style="font-size:12px;color:#666;margin-bottom:12px;line-height:1.45;">
                        ${requiredText}。出招由规则层毫秒级反应，对话交流将以 TA 们的设定展开！
                    </div>

                    <div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:2px;margin-bottom:16px;">
                        ${npcs.map((npc, idx) => `
                            <label style="background:#f9f9f9;border:0.5px solid #e5e5e5;border-radius:8px;padding:9px 12px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <img src="${getSafeAvatar(npc)}" style="width:34px;height:34px;border-radius:6px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';"/>
                                    <div>
                                        <div style="font-size:13.5px;font-weight:600;color:#181818;">${safeHtml(npc.name || npc.id)}</div>
                                        <div style="font-size:10.5px;color:#888;">${safeHtml(npc.personaTag || '自建好友')}</div>
                                    </div>
                                </div>
                                ${isMulti ? `
                                    <input type="checkbox" name="lobbySelectNpcBox" value="${safeHtml(npc.id)}" ${idx < game.minNpc ? 'checked' : ''} style="accent-color:#07c160;width:18px;height:18px;cursor:pointer;"/>
                                ` : `
                                    <input type="radio" name="lobbySelectNpcRadio" value="${safeHtml(npc.id)}" ${idx === 0 ? 'checked' : ''} style="accent-color:#07c160;width:18px;height:18px;cursor:pointer;"/>
                                `}
                            </label>
                        `).join('')}
                    </div>

                    <div style="display:flex;gap:8px;">
                        <button type="button" id="btnCancelCreateMatch" style="flex:1;border:none;background:#f2f2f2;color:#333;padding:10px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;">取消</button>
                        <button type="button" id="btnConfirmCreateMatch" style="flex:1;border:none;background:#07c160;color:#fff;padding:10px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(7,193,96,0.25);">立即入座开局</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(mask);

        const closeModal = () => mask.remove();
        mask.addEventListener('click', (e) => {
            if (e.target === mask) closeModal();
        });
        document.getElementById('btnLobbyModalClose').onclick = closeModal;
        document.getElementById('btnCancelCreateMatch').onclick = closeModal;

        document.getElementById('btnConfirmCreateMatch').onclick = async () => {
            let selectedNpcs = [];
            if (isMulti) {
                const checkedBoxes = Array.from(mask.querySelectorAll('input[name="lobbySelectNpcBox"]:checked'));
                const checkedIds = checkedBoxes.map(b => b.value);
                selectedNpcs = npcs.filter(n => checkedIds.includes(n.id));

                if (selectedNpcs.length < game.minNpc || selectedNpcs.length > game.maxNpc) {
                    if (typeof showToast === 'function') {
                        showToast(`该游戏需要邀请 ${game.minNpc === game.maxNpc ? game.minNpc : `${game.minNpc}~${game.maxNpc}`} 位同伴`, 'warning', 2000);
                    }
                    return;
                }
            } else {
                const checked = mask.querySelector('input[name="lobbySelectNpcRadio"]:checked');
                const selectedNpcId = checked ? checked.value : npcs[0].id;
                const targetNpc = npcs.find(n => n.id === selectedNpcId) || npcs[0];
                selectedNpcs = [targetNpc];
            }

            closeModal();
            await window.startMatchWithNpcs(gameKind, selectedNpcs);
        };
    };

    /**
     * 发起开局请求并进入对战棋盘
     */
    window.startMatchWithNpcs = async function (kind, selectedNpcs) {
        window._activeLobbySelectedNpcs = selectedNpcs;
        window._activeLobbySelectedNpc = selectedNpcs[0];
        const serverUrl = getLobbyServerUrl();

        const names = selectedNpcs.map(n => n.name).join('、');
        showLobbyLoading(`正在为 ${names} 分配座位并准备棋局...`);

        let matchData = null;
        let seatToken = null;

        const seats = [{ kind: 'human', name: '我', me: true }];
        selectedNpcs.forEach(n => {
            seats.push({ kind: 'bot', name: n.name, npcId: n.id });
        });

        // 统一使用本地纯规则引擎快速秒开，若配置了远程服务则同时尝试远端同步
        matchData = {
            id: 'local_match_' + Date.now(),
            kind: kind,
            seats: seats,
            log: [{ action: 'start', time: Date.now() }],
            status: 'playing',
            turn: 'me'
        };
        seatToken = 'local_token_' + Math.random().toString(36).slice(2);

        window._activeLobbyMatch = matchData;
        window._activeLobbySeatToken = seatToken;

        hideLobbyLoading();
        renderActiveGameBoard(kind, matchData, selectedNpcs, seatToken, serverUrl);
    };

    window.startMatchWithNpc = async function (kind, npc) {
        return window.startMatchWithNpcs(kind, [npc]);
    };

    /**
     * Whisper 局内对话调用 OpenAI 兼容模型
     */
    async function handleWhisperSpoken(spokenText, kind) {
        const npcs = window._activeLobbySelectedNpcs || [];
        if (!npcs.length) return;
        const targetNpc = npcs[0];
        const activeCfg = getActiveApiConfig();

        if (!activeCfg || !activeCfg.baseUrl || !activeCfg.apiKey) {
            console.log('[Lobby Whisper]: 未配置大模型 API，跳过同伴发言回复');
            return;
        }

        const game = GAME_LIST.find(g => g.kind === kind) || { name: '棋牌' };
        let cleanBase = activeCfg.baseUrl.trim().replace(/\/+$/, '');
        if (!/\/v1$/i.test(cleanBase) && !cleanBase.includes('/v1/')) {
            cleanBase += '/v1';
        }

        const systemPrompt = `你现在正在与玩家进行「${game.name}」切磋对弈。
你的名字是：${targetNpc.name}
你的性格与人设：${targetNpc.persona || targetNpc.personaTag || '活泼热情的同伴'}
【对话规则】：
1. 你的回答必须完全符合你的性格人设，带有生动的活人情绪；
2. 围绕当前的对弈展开互动（可以吐槽对手走法、自信挑衅、撒娇、感叹棋局紧张等）；
3. 字数控制在 15~40 字左右，短小精悍，口语化，严禁长篇大论，严禁使用任何系统 Emoji！`;

        try {
            const resp = await fetch(`${cleanBase}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${activeCfg.apiKey.trim()}`
                },
                body: JSON.stringify({
                    model: activeCfg.model || 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: spokenText }
                    ],
                    max_tokens: 80,
                    temperature: 0.8
                })
            });

            if (resp.ok) {
                const data = await resp.json();
                const reply = data.choices?.[0]?.message?.content?.trim();
                if (reply) {
                    const iframe = document.getElementById('lobbyBoardIframe');
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.postMessage(
                            {
                                type: 'MCYT_LOBBY_INJECT_CHAT',
                                seat: 1,
                                name: targetNpc.name,
                                text: reply
                            },
                            '*'
                        );
                    }
                }
            }
        } catch (e) {
            console.warn('[Lobby Whisper Error]:', e);
        }
    }

    function ensureLobbyMessageListener() {
        if (window._lobbyMessageListenerAttached) return;
        window._lobbyMessageListenerAttached = true;

        window.addEventListener('message', function (ev) {
            if (!ev || !ev.data) return;
            const data = ev.data;

            if (data.type === 'MCYT_LOBBY_MATCH_FINISH' || data.action === 'game_over') {
                const resultType = data.resultType || (data.winner === 'me' ? '胜' : '负');
                const movesCount = data.movesCount || data.moves || 20;
                const kind = data.kind || (window._activeLobbyMatch && window._activeLobbyMatch.kind);
                window.completeMockMatch(resultType, kind, movesCount);
            }
            if (data.type === 'MCYT_LOBBY_EXIT') {
                window.renderLobbyApp();
            }
            if (data.type === 'MCYT_LOBBY_CHAT_SPOKEN') {
                handleWhisperSpoken(data.text, data.kind);
            }
        });
    }

    /**
     * 渲染正在进行的对局棋盘界面
     */
    function renderActiveGameBoard(kind, match, selectedNpcs, token, serverUrl) {
        ensureLobbyMessageListener();

        let container = document.getElementById('lobbyAppViewport');
        if (!container) {
            container = document.getElementById('appModalBody');
            if (container) {
                window.renderLobbyApp(container);
                container = document.getElementById('lobbyAppViewport');
            }
        }
        if (!container) return;

        const game = GAME_LIST.find(g => g.kind === kind) || { name: '棋牌切磋' };
        const statusBarPad = 'padding-top: calc(var(--status-bar-height, 40px) + 2px);';

        container.style.cssText = `background:#ededed;height:100%;min-height:100%;display:flex;flex-direction:column;font-family:-apple-system,sans-serif;overflow:hidden;${statusBarPad}`;

        const isIndividual = isLobbyIndividualAiThinking();
        const opponentNames = selectedNpcs.map(n => n.name).join('、');

        // 提取自建角色真实头像，精准传入
        const safeNpcData = selectedNpcs.map(n => ({
            id: n.id,
            name: n.name,
            avatar: getSafeAvatar(n)
        }));

        const queryParams = new URLSearchParams({
            matchId: match.id,
            kind: kind,
            token: token || '',
            serverUrl: serverUrl || '',
            playerName: '我',
            aiThinkingMode: isIndividual ? 'individual' : 'batch',
            npcs: JSON.stringify(safeNpcData)
        }).toString();

        const iframeSrc = `assets/lobby-web/index.html?${queryParams}#/match?${queryParams}`;

        container.innerHTML = `
            <div style="background:#ffffff;height:48px;border-bottom:0.5px solid #e5e5e5;display:flex;align-items:center;justify-content:space-between;padding:0 14px;flex-shrink:0;z-index:10;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <button id="btnExitMatchToLobby" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:4px 6px;display:flex;align-items:center;gap:2px;font-weight:500;">
                        <span style="font-size:17px;line-height:1;">‹</span> <span>大厅</span>
                    </button>
                    <span style="font-size:15.5px;font-weight:600;color:#181818;margin-left:4px;">${safeHtml(game.name)}</span>
                </div>

                <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:11px;color:#07c160;background:#e8f8ee;padding:3px 8px;border-radius:10px;font-weight:500;">${safeHtml(opponentNames)}</span>
                </div>
            </div>

            <div style="flex:1;position:relative;width:100%;height:100%;overflow:hidden;background:#ffffff;">
                <iframe id="lobbyBoardIframe" src="${iframeSrc}" style="width:100%;height:100%;border:none;display:block;" allow="autoplay"></iframe>
            </div>
        `;

        const btnExit = document.getElementById('btnExitMatchToLobby');
        if (btnExit) {
            btnExit.onclick = () => {
                window.renderLobbyApp();
            };
        }
    }

    /**
     * 胜负结算与【战报转发】弹窗
     */
    window.completeMockMatch = function (resultType, kind, customMoves) {
        ensureLobbyStyles();
        const npcs = window._activeLobbySelectedNpcs && window._activeLobbySelectedNpcs.length ? window._activeLobbySelectedNpcs : [window._activeLobbySelectedNpc];
        if (!npcs.length || !npcs[0]) return;

        const allNames = npcs.map(n => n.name).join('、');
        const game = GAME_LIST.find(g => g.kind === kind) || { name: '棋牌切磋' };
        const movesCount = customMoves || Math.floor(Math.random() * 20 + 15);
        const resultText = (resultType === '胜') ? '玩家获胜' : `${allNames} 获胜`;

        const oldModal = document.getElementById('lobbyActiveDialog');
        if (oldModal) oldModal.remove();

        const mask = document.createElement('div');
        mask.id = 'lobbyActiveDialog';
        mask.className = 'lobby-clean-modal-mask';

        const resultIconSvg = (resultType === '胜')
            ? `<svg viewBox="0 0 24 24" style="width:28px;height:28px;fill:none;stroke:#07c160;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H7v4h10v-4h-2c-.55 0-1-.45-1-1v-2.34"></path><path d="M18 4H6v7a6 6 0 0 0 12 0V4z"></path></svg>`
            : `<svg viewBox="0 0 24 24" style="width:28px;height:28px;fill:none;stroke:#fa5151;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;

        mask.innerHTML = `
            <div class="lobby-clean-modal-dialog">
                <div class="lobby-clean-modal-header">
                    <h3 class="lobby-clean-modal-title">对局结算 · ${safeHtml(game.name)}</h3>
                    <button type="button" class="lobby-clean-modal-close" id="btnFinishClose">✕</button>
                </div>
                <div class="lobby-clean-modal-body" style="text-align:center;">
                    <div style="width:50px;height:50px;border-radius:50%;background:${resultType === '胜' ? '#e8f8ee' : '#fff1f0'};display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                        ${resultIconSvg}
                    </div>

                    <div style="font-size:16px;font-weight:700;color:#181818;margin-bottom:4px;">
                        ${resultText}
                    </div>
                    <div style="font-size:12px;color:#888;margin-bottom:14px;">
                        在「${safeHtml(game.name)}」中双方共对弈 ${movesCount} 回合
                    </div>

                    <div style="background:#f7f7f7;border:0.5px solid #eaeaea;border-radius:8px;padding:10px 12px;font-size:12px;color:#555;text-align:left;line-height:1.5;margin-bottom:16px;">
                        <div style="display:flex;align-items:center;gap:5px;font-weight:600;color:#181818;margin-bottom:3px;">
                            <svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:none;stroke:#07c160;stroke-width:2;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            <span>战报分享提示</span>
                        </div>
                        点击【转发战报到聊天】，战果将同步至你与参与同伴的私聊中，TA 们会在随后的对白里自然复盘，成为深层活人记忆！
                    </div>

                    <div style="display:flex;gap:8px;">
                        <button type="button" id="btnOnlyFinishMatch" style="flex:1;border:none;background:#f2f2f2;color:#555;padding:10px;border-radius:6px;font-size:12.5px;font-weight:500;cursor:pointer;">不转发仅退出</button>
                        <button type="button" id="btnShareMatchToChat" style="flex:1;border:none;background:#07c160;color:#fff;padding:10px;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(7,193,96,0.25);">转发战报到聊天</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(mask);

        const closeModal = () => mask.remove();
        mask.addEventListener('click', (e) => {
            if (e.target === mask) closeModal();
        });
        document.getElementById('btnFinishClose').onclick = closeModal;

        document.getElementById('btnOnlyFinishMatch').onclick = () => {
            closeModal();
            window.renderLobbyApp();
            if (typeof showToast === 'function') showToast('对局结束，未沉淀聊天记忆', 'info', 1200);
        };

        document.getElementById('btnShareMatchToChat').onclick = async () => {
            closeModal();
            for (const n of npcs) {
                await window.sendMatchReportToChat(n, game.name, resultText, movesCount);
            }
            window.renderLobbyApp();
        };
    };

    window.sendMatchReportToChat = async function (npc, gameName, resultText, moves) {
        if (!npc || !npc.id) return;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };

        const cardMsg = {
            _id: 'lobby_card_' + Date.now() + '_' + Math.floor(Math.random() * 899 + 100),
            from: 'player',
            type: 'lobby_share_card',
            gameName: gameName,
            resultText: resultText,
            moves: moves,
            summary: `我与你在「${gameName}」完成了一局切磋对战，最终结果：【${resultText}】（历经 ${moves} 步）。`,
            time: new Date().toLocaleTimeString().slice(0, 5),
            timestamp: Date.now()
        };

        if (typeof window.pushChatMessageSafe === 'function') {
            window.pushChatMessageSafe(npc.id, cardMsg, curAcc.id);
        } else {
            const hist = window.getAccountChatHistory(npc.id, curAcc.id) || [];
            hist.push(cardMsg);
        }

        if (typeof window.syncChatHistoryToLocalBackup === 'function') {
            await window.syncChatHistoryToLocalBackup();
        }
        if (typeof autoSaveGame === 'function') autoSaveGame();

        if (typeof showToast === 'function') {
            showToast('战报已同步至同伴私聊，已成为双方羁绊记忆！', 'success', 2000);
        }
    };

    /**
     * API 模型方案配置中心（拒绝虚假模型，真实请求并实时筛选，支持多方案与备注）
     */
    window.openLobbyApiManageModal = function () {
        ensureLobbyStyles();
        let profiles = getApiProfiles();
        let activeId = getActiveProfileId();

        const oldModal = document.getElementById('lobbyActiveDialog');
        if (oldModal) oldModal.remove();

        const mask = document.createElement('div');
        mask.id = 'lobbyActiveDialog';
        mask.className = 'lobby-clean-modal-mask';

        // 默认新建草稿或取当前激活配置
        let cur = profiles.find(p => p.id === activeId) || profiles[0] || {
            id: 'prof_' + Date.now(),
            remark: '默认方案',
            baseUrl: '',
            apiKey: '',
            model: ''
        };

        let fetchedModels = [];

        function renderDialogContent() {
            mask.innerHTML = `
                <div class="lobby-clean-modal-dialog" style="max-width:345px;">
                    <div class="lobby-clean-modal-header">
                        <h3 class="lobby-clean-modal-title">API 模型方案管理</h3>
                        <button type="button" class="lobby-clean-modal-close" id="btnApiClose">✕</button>
                    </div>
                    <div class="lobby-clean-modal-body">
                        
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                            <span style="font-size:12px;font-weight:600;color:#555;">已存方案列表 (${profiles.length})</span>
                            <button type="button" id="btnNewApiProfile" style="border:none;background:#e8f8ee;color:#07c160;padding:3px 8px;border-radius:4px;font-size:11.5px;font-weight:600;cursor:pointer;">
                                + 新建方案
                            </button>
                        </div>

                        ${profiles.length > 0 ? `
                            <div style="max-height:85px;overflow-y:auto;display:flex;flex-direction:column;gap:5px;margin-bottom:12px;padding:1px;">
                                ${profiles.map(p => `
                                    <div style="display:flex;align-items:center;justify-content:space-between;background:${p.id === cur.id ? '#eefaf2' : '#f9f9f9'};border:0.5px solid ${p.id === cur.id ? '#07c160' : '#e5e5e5'};border-radius:6px;padding:6px 10px;cursor:pointer;" class="profile-item-row" data-id="${p.id}">
                                        <div style="min-width:0;flex:1;">
                                            <div style="font-size:12.5px;font-weight:600;color:#181818;display:flex;align-items:center;gap:5px;">
                                                <span class="truncate">${safeHtml(p.remark || '未命名方案')}</span>
                                                ${p.id === activeId ? '<span style="font-size:9.5px;background:#07c160;color:#fff;padding:0 4px;border-radius:2px;">生效中</span>' : ''}
                                            </div>
                                            <div style="font-size:10.5px;color:#888;" class="truncate">${safeHtml(p.model || '未选模型')}</div>
                                        </div>
                                        <button type="button" class="btn-del-prof" data-id="${p.id}" style="border:none;background:none;color:#999;font-size:13px;cursor:pointer;padding:2px 6px;">✕</button>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div style="font-size:11.5px;color:#888;background:#f9f9f9;padding:8px 10px;border-radius:6px;margin-bottom:12px;border:0.5px dashed #ccc;">
                                暂无预设方案，填入下方参数保存即可自动创建方案。
                            </div>
                        `}

                        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
                            <div>
                                <div style="font-size:11.5px;color:#666;margin-bottom:3px;">方案备注名称</div>
                                <input type="text" id="iptProfRemark" class="lobby-input-field" placeholder="例如：日常切磋-白菜模型" value="${safeHtml(cur.remark || '')}"/>
                            </div>
                            <div>
                                <div style="font-size:11.5px;color:#666;margin-bottom:3px;">OpenAI 接口地址 (Base URL)</div>
                                <input type="text" id="iptProfBaseUrl" class="lobby-input-field" placeholder="https://api.openai.com/v1" value="${safeHtml(cur.baseUrl || '')}"/>
                            </div>
                            <div>
                                <div style="font-size:11.5px;color:#666;margin-bottom:3px;">API Key</div>
                                <input type="password" id="iptProfApiKey" class="lobby-input-field" placeholder="sk-..." value="${safeHtml(cur.apiKey || '')}"/>
                            </div>

                            <div>
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">
                                    <span style="font-size:11.5px;color:#666;">选用模型 (Model)</span>
                                    <button type="button" id="btnFetchModels" style="border:none;background:#f0f0f0;color:#333;font-size:11px;padding:2px 7px;border-radius:4px;cursor:pointer;">
                                        拉取真实模型列表
                                    </button>
                                </div>
                                <input type="text" id="iptProfModel" class="lobby-input-field" placeholder="填入模型名或点击上方拉取" value="${safeHtml(cur.model || '')}"/>
                            </div>

                            <div id="modelSearchBox" style="display:${fetchedModels.length ? 'block' : 'none'};background:#f9f9f9;border:0.5px solid #eaeaea;border-radius:6px;padding:8px;">
                                <input type="text" id="iptModelFilter" class="lobby-input-field" placeholder="输入关键词筛选 (如 deepseek, gpt, 4o)..." style="font-size:11.5px;padding:5px 8px;margin-bottom:6px;"/>
                                <div id="modelOptionList" style="max-height:100px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;"></div>
                            </div>
                        </div>

                        <div style="display:flex;gap:8px;">
                            <button type="button" id="btnSaveProfile" style="flex:1;border:none;background:#07c160;color:#fff;padding:9px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(7,193,96,0.25);">
                                保存并激活当前方案
                            </button>
                        </div>
                    </div>
                </div>
            `;

            attachEvents();
        }

        function updateModelFilterList(filterText = '') {
            const listEl = mask.querySelector('#modelOptionList');
            if (!listEl) return;
            const kw = filterText.trim().toLowerCase();
            const matched = fetchedModels.filter(m => !kw || m.toLowerCase().includes(kw));

            if (!matched.length) {
                listEl.innerHTML = `<div style="font-size:11px;color:#999;padding:4px;text-align:center;">未找到匹配的模型</div>`;
                return;
            }

            listEl.innerHTML = matched.map(m => `
                <div class="model-opt-item" data-val="${safeHtml(m)}" style="padding:4px 7px;font-size:11.5px;color:#222;background:#fff;border-radius:4px;cursor:pointer;border:0.5px solid #eee;">
                    ${safeHtml(m)}
                </div>
            `).join('');

            listEl.querySelectorAll('.model-opt-item').forEach(el => {
                el.onclick = () => {
                    const val = el.getAttribute('data-val');
                    const ipt = mask.querySelector('#iptProfModel');
                    if (ipt) ipt.value = val;
                };
            });
        }

        function attachEvents() {
            mask.querySelector('#btnApiClose').onclick = () => mask.remove();

            mask.querySelectorAll('.profile-item-row').forEach(row => {
                row.onclick = (e) => {
                    if (e.target.classList.contains('btn-del-prof')) return;
                    const id = row.getAttribute('data-id');
                    const p = profiles.find(x => x.id === id);
                    if (p) {
                        cur = { ...p };
                        renderDialogContent();
                    }
                };
            });

            mask.querySelectorAll('.btn-del-prof').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const id = btn.getAttribute('data-id');
                    profiles = profiles.filter(x => x.id !== id);
                    saveApiProfiles(profiles);
                    if (activeId === id) {
                        activeId = profiles[0]?.id || '';
                        setActiveProfileId(activeId);
                    }
                    cur = profiles[0] || { id: 'prof_' + Date.now(), remark: '默认方案', baseUrl: '', apiKey: '', model: '' };
                    renderDialogContent();
                };
            });

            const btnNew = mask.querySelector('#btnNewApiProfile');
            if (btnNew) {
                btnNew.onclick = () => {
                    cur = {
                        id: 'prof_' + Date.now(),
                        remark: '新方案 ' + (profiles.length + 1),
                        baseUrl: '',
                        apiKey: '',
                        model: ''
                    };
                    fetchedModels = [];
                    renderDialogContent();
                };
            }

            const btnFetch = mask.querySelector('#btnFetchModels');
            if (btnFetch) {
                btnFetch.onclick = async () => {
                    const bUrl = mask.querySelector('#iptProfBaseUrl')?.value?.trim();
                    const key = mask.querySelector('#iptProfApiKey')?.value?.trim();
                    if (!bUrl) {
                        if (typeof showToast === 'function') showToast('请先输入有效的 Base URL 接口地址', 'warning', 1800);
                        return;
                    }

                    let cleanBase = bUrl.replace(/\/+$/, '');
                    if (!/\/v1$/i.test(cleanBase) && !cleanBase.includes('/v1/')) {
                        cleanBase += '/v1';
                    }

                    btnFetch.textContent = '正在拉取...';
                    try {
                        const headers = { 'Content-Type': 'application/json' };
                        if (key) headers['Authorization'] = `Bearer ${key}`;

                        const resp = await fetch(`${cleanBase}/models`, { method: 'GET', headers });
                        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                        const resData = await resp.json();
                        const rawList = Array.isArray(resData.data) ? resData.data : (Array.isArray(resData) ? resData : []);
                        fetchedModels = rawList.map(item => item.id || item.name || String(item)).filter(Boolean);

                        if (!fetchedModels.length) {
                            if (typeof showToast === 'function') showToast('接口未返回模型列表，请手动输入模型名称', 'info', 2000);
                        } else {
                            if (typeof showToast === 'function') showToast(`成功拉取到 ${fetchedModels.length} 个真实模型`, 'success', 1500);
                            const box = mask.querySelector('#modelSearchBox');
                            if (box) box.style.display = 'block';
                            updateModelFilterList('');
                        }
                    } catch (err) {
                        if (typeof showToast === 'function') showToast('拉取失败，请检查 URL 与 Key', 'error', 2000);
                    } finally {
                        btnFetch.textContent = '拉取真实模型列表';
                    }
                };
            }

            const iptFilter = mask.querySelector('#iptModelFilter');
            if (iptFilter) {
                iptFilter.oninput = () => updateModelFilterList(iptFilter.value);
            }

            const btnSave = mask.querySelector('#btnSaveProfile');
            if (btnSave) {
                btnSave.onclick = () => {
                    const remark = mask.querySelector('#iptProfRemark')?.value?.trim() || '未命名方案';
                    const baseUrl = mask.querySelector('#iptProfBaseUrl')?.value?.trim() || '';
                    const apiKey = mask.querySelector('#iptProfApiKey')?.value?.trim() || '';
                    const model = mask.querySelector('#iptProfModel')?.value?.trim() || '';

                    cur.remark = remark;
                    cur.baseUrl = baseUrl;
                    cur.apiKey = apiKey;
                    cur.model = model;

                    const idx = profiles.findIndex(p => p.id === cur.id);
                    if (idx >= 0) {
                        profiles[idx] = cur;
                    } else {
                        profiles.push(cur);
                    }

                    saveApiProfiles(profiles);
                    setActiveProfileId(cur.id);

                    if (typeof showToast === 'function') showToast('方案已保存并设为当前生效', 'success', 1200);
                    mask.remove();
                    window.renderLobbyApp();
                };
            }
        }

        renderDialogContent();
        document.body.appendChild(mask);
    };

    /**
     * 对局设置弹窗（防泄密安全设计）
     */
    window.openLobbySettingsModal = function () {
        ensureLobbyStyles();
        const curCustomUrl = getDisplayCustomServerUrl();
        const isIndividual = isLobbyIndividualAiThinking();

        const oldModal = document.getElementById('lobbyActiveDialog');
        if (oldModal) oldModal.remove();

        const mask = document.createElement('div');
        mask.id = 'lobbyActiveDialog';
        mask.className = 'lobby-clean-modal-mask';

        mask.innerHTML = `
            <div class="lobby-clean-modal-dialog">
                <div class="lobby-clean-modal-header">
                    <h3 class="lobby-clean-modal-title">对局与裁判设置</h3>
                    <button type="button" class="lobby-clean-modal-close" id="btnServerSetClose">✕</button>
                </div>
                <div class="lobby-clean-modal-body">
                    
                    <div style="background:#f9f9f9;border:0.5px solid #eaeaea;border-radius:8px;padding:12px;margin-bottom:14px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:13.5px;font-weight:600;color:#181818;">同伴独立思考模式</span>
                                <button type="button" id="btnExplainAiMode" style="border:none;background:#e8f8ee;color:#07c160;width:18px;height:18px;border-radius:50%;font-size:11px;font-weight:bold;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;">
                                    ?
                                </button>
                            </div>
                            <input type="checkbox" id="chkIndividualAiMode" ${isIndividual ? 'checked' : ''} style="accent-color:#07c160;width:18px;height:18px;cursor:pointer;"/>
                        </div>
                        <div style="font-size:11.5px;color:#888;line-height:1.4;">
                            ${isIndividual ? '当前：每个角色单独调用一次，个性细腻生动' : '当前：一轮合并完成全员走子与发言，极度节省额度'}
                        </div>
                    </div>

                    <div style="margin-bottom:14px;">
                        <div style="font-size:12.5px;color:#555;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
                            <span>云端裁判节点 (VPS)</span>
                            <span style="font-size:11px;color:#07c160;">端内离线引擎已常驻保底</span>
                        </div>
                        <input type="text" id="iptLobbyServerUrl" placeholder="私有托管节点 (留空即使用默认保活)" value="${safeHtml(curCustomUrl)}" class="lobby-input-field" />
                    </div>

                    <div style="display:flex;gap:8px;">
                        <button type="button" id="btnCancelServerSet" style="flex:1;border:none;background:#f2f2f2;color:#333;padding:10px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;">取消</button>
                        <button type="button" id="btnSaveServerSet" style="flex:1;border:none;background:#07c160;color:#fff;padding:10px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(7,193,96,0.25);">保存设置</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(mask);

        const closeModal = () => mask.remove();
        mask.addEventListener('click', (e) => {
            if (e.target === mask) closeModal();
        });
        document.getElementById('btnServerSetClose').onclick = closeModal;
        document.getElementById('btnCancelServerSet').onclick = closeModal;

        document.getElementById('btnExplainAiMode').onclick = () => {
            window.openLobbyAiModeHelpModal();
        };

        document.getElementById('btnSaveServerSet').onclick = () => {
            const ipt = document.getElementById('iptLobbyServerUrl');
            const chk = document.getElementById('chkIndividualAiMode');
            if (ipt) setLobbyServerUrl(ipt.value);
            if (chk) setLobbyIndividualAiThinking(chk.checked);

            if (typeof showToast === 'function') showToast('对局设置已更新', 'success', 1000);
            closeModal();
            window.renderLobbyApp();
        };
    };

    window.openLobbyAiModeHelpModal = function () {
        const mask = document.createElement('div');
        mask.className = 'lobby-clean-modal-mask';
        mask.style.zIndex = '100002';

        mask.innerHTML = `
            <div class="lobby-clean-modal-dialog">
                <div class="lobby-clean-modal-header">
                    <h3 class="lobby-clean-modal-title">同伴思考调度说明</h3>
                    <button type="button" class="lobby-clean-modal-close" id="btnHelpClose">✕</button>
                </div>
                <div class="lobby-clean-modal-body" style="font-size:12.5px;color:#444;line-height:1.6;">
                    <div style="margin-bottom:12px;">
                        <b style="color:#07c160;">1. 开启【独立思考模式】（单独调用）</b><br>
                        当轮到某个自建同伴走子或在 Whisper 发言时，系统单独对该角色发起一次模型请求。角色能根据当前的局面展现细腻性格，沉浸感极强。
                    </div>
                    <div style="margin-bottom:12px;">
                        <b style="color:#181818;">2. 关闭【独立思考模式】（合并思考，默认）</b><br>
                        优先通过合并调度减少请求频次，极度节省 Token 额度，响应更快，非常适合日常高频切磋。
                    </div>
                    <button type="button" id="btnGotItHelp" style="width:100%;border:none;background:#07c160;color:#fff;padding:9px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">我知道了</button>
                </div>
            </div>
        `;

        document.body.appendChild(mask);

        const closeHelp = () => mask.remove();
        mask.addEventListener('click', (e) => {
            if (e.target === mask) closeHelp();
        });
        document.getElementById('btnHelpClose').onclick = closeHelp;
        document.getElementById('btnGotItHelp').onclick = closeHelp;
    };

    window.openLobbyServerSettingsModal = window.openLobbySettingsModal;

    console.log('LobbyApp 游戏大厅已装载：本地离线引擎就绪、多同伴联机就绪、API方案中枢就绪');
})();
