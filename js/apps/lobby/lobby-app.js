/**
 * js/apps/lobby/lobby-app.js
 * 主播掌机 · 全新独立游戏大厅 App（微信原生白灰微绿设计质感）
 * 核心特性：
 * 1. 微信原生极简质感：纯白卡片、极浅灰底色（#f7f7f7）、原生微绿高亮（#07c160），全站消灭 Emoji，改用极简 SVG；
 * 2. 状态栏顶部安全区适配：完美避让灵动岛与电量/时间顶栏，不重合不遮挡；
 * 3. 隐私与安全防护：彻底移除硬编码 VPS IP，默认启用掌机本地离线对战引擎，防扫描防攻击；
 * 4. 多角色自由联机：自适应双人单选 / 多人（斗地主、大富翁、飞行棋）多选联系人入座；
 * 5. AI 调度模式自由切换：支持【独立思考模式（单独调用）】与【合并思考模式（一轮推理完成全员）】，额度灵活可控；
 * 6. 战报与羁绊记忆沉淀：对局结束后可自主选择【转发战报到聊天】，生成专属战报卡片（lobby_share_card），落盘单聊历史！
 */

(function () {
    'use strict';

    // 本地内置引擎缺省标识（不暴露任何真实 VPS IP）
    const DEFAULT_SERVER_URL = '';

    function getLobbyServerUrl() {
        return localStorage.getItem('mcyt_lobby_server_url') || DEFAULT_SERVER_URL;
    }

    function setLobbyServerUrl(url) {
        if (!url) {
            localStorage.removeItem('mcyt_lobby_server_url');
        } else {
            localStorage.setItem('mcyt_lobby_server_url', url.trim().replace(/\/+$/, ''));
        }
    }

    // AI 思考模式：true 为每个角色单独调用一次，false 为一轮合并思考全部代替
    function isLobbyIndividualAiThinking() {
        return localStorage.getItem('mcyt_lobby_individual_ai') === 'true';
    }

    function setLobbyIndividualAiThinking(val) {
        localStorage.setItem('mcyt_lobby_individual_ai', val ? 'true' : 'false');
    }

    // 10 款已支持的游戏清单配置（完全对齐纯规则层引擎，无 Emoji，全 SVG）
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

    // 当前活跃对局与房间状态
    window._activeLobbyMatch = null;
    window._activeLobbySeatToken = null;
    window._activeLobbySelectedNpcs = [];
    window._lobbyMessageListenerAttached = false;

    /**
     * 辅助防 XSS 工具函数
     */
    function safeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * 获取用户所有自建联系人池（唯一真实角色源）
     */
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

    /**
     * 注入游戏大厅专属纯净微信白灰微绿样式
     */
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
                padding: 20px;
                box-sizing: border-box;
                animation: lobbyFadeIn 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
            }
            .lobby-clean-modal-dialog {
                background: #ffffff !important;
                border: 0.5px solid #eaeaea !important;
                border-radius: 14px !important;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15) !important;
                width: 100%;
                max-width: 325px;
                overflow: hidden;
                box-sizing: border-box;
                animation: lobbyPopUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                color: #222222 !important;
                text-shadow: none !important;
            }
            .lobby-clean-modal-header {
                padding: 16px 16px 12px 18px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 0.5px solid #f0f0f0;
                background: #ffffff;
            }
            .lobby-clean-modal-title {
                font-size: 15.5px;
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
                padding: 16px;
                box-sizing: border-box;
                color: #222222 !important;
                text-shadow: none !important;
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
                width: 30px;
                height: 30px;
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

        container.innerHTML = `
            <div id="lobbyAppViewport" style="background:#f7f7f7;height:100%;min-height:100%;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;box-sizing:border-box;overflow:hidden;${statusBarPad}">
                
                <!-- 微信原生白灰微绿顶栏 -->
                <div style="background:#ffffff;height:48px;border-bottom:0.5px solid #e5e5e5;display:flex;align-items:center;justify-content:space-between;padding:0 14px;flex-shrink:0;box-sizing:border-box;user-select:none;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <button onclick="window.closePhoneApp()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:4px 6px;display:flex;align-items:center;gap:2px;font-weight:500;">
                            <span style="font-size:17px;line-height:1;">‹</span> <span>桌面</span>
                        </button>
                        <span style="font-size:16px;font-weight:600;color:#181818;margin-left:4px;">游戏大厅</span>
                    </div>

                    <!-- 右上角：对局设置（替换原先暴露IP的按钮） -->
                    <button onclick="window.openLobbySettingsModal()" title="对局设置" style="border:none;background:#f2f2f2;border-radius:14px;padding:5px 10px;font-size:12px;color:#444;cursor:pointer;display:flex;align-items:center;gap:5px;">
                        <svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:none;stroke:#555;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        <span>对局设置</span>
                    </button>
                </div>

                <!-- 游戏大厅内容区 -->
                <div style="flex:1;overflow-y:auto;padding:12px 14px 28px;box-sizing:border-box;scroll-behavior:smooth;">
                    
                    <!-- 顶部特色标语卡片 -->
                    <div style="background:#ffffff;border-radius:10px;padding:14px;margin-bottom:12px;border:0.5px solid #eaeaea;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                            <div style="width:26px;height:26px;border-radius:6px;background:rgba(7,193,96,0.12);display:flex;align-items:center;justify-content:center;color:#07c160;">
                                <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;"><rect x="2" y="6" width="20" height="12" rx="3"></rect><path d="M6 12h4m-2-2v4"></path></svg>
                            </div>
                            <span style="font-size:14px;font-weight:600;color:#181818;">掌机棋牌切磋中枢</span>
                        </div>
                        <div style="font-size:12px;color:#777;line-height:1.5;">
                            你可以挑选任意棋牌与你的自建同伴同台竞技，对局结束后支持一键将胜负战报转发到单聊，成为你们之间鲜活的真实回忆！
                        </div>
                    </div>

                    <!-- 游戏列表标题 -->
                    <div style="font-size:12px;font-weight:600;color:#888;margin:10px 4px 8px;letter-spacing:0.5px;">全部收录棋牌 (${GAME_LIST.length})</div>

                    <!-- 游戏卡片网格流 -->
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
     * 弹窗：选择自建角色开桌（支持单人/多人自由勾选）
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
                    <div style="font-size:12.5px;color:#666;margin-bottom:12px;line-height:1.45;">
                        ${requiredText}。TA 们将作为 AI 对手入座，出招与交流会根据各自的性格展开！
                    </div>

                    <div style="max-height:210px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:2px;margin-bottom:16px;">
                        ${npcs.map((npc, idx) => `
                            <label style="background:#f9f9f9;border:0.5px solid #e5e5e5;border-radius:8px;padding:9px 12px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <img src="${npc.avatarUrl || npc.avatar || 'assets/icons/chat.png'}" style="width:34px;height:34px;border-radius:6px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';"/>
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

        const closeModal = () => {
            mask.remove();
        };

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
     * 发起开局请求并进入对战棋盘（支持单人/多同伴联机）
     */
    window.startMatchWithNpcs = async function (kind, selectedNpcs) {
        window._activeLobbySelectedNpcs = selectedNpcs;
        window._activeLobbySelectedNpc = selectedNpcs[0]; // 兼容主要单人沉淀
        const serverUrl = getLobbyServerUrl();

        const names = selectedNpcs.map(n => n.name).join('、');
        showLobbyLoading(`正在为 ${names} 分配座位并准备棋局...`);

        let matchData = null;
        let seatToken = null;

        // 构造入座席位：玩家 + 多个 AI 同伴
        const seats = [
            { kind: 'human', name: '我', me: true }
        ];
        selectedNpcs.forEach(n => {
            seats.push({ kind: 'ai', name: n.name, npcId: n.id });
        });

        if (serverUrl) {
            try {
                const ctrl = new AbortController();
                const timeoutId = setTimeout(() => ctrl.abort(), 4500);

                const resp = await fetch(`${serverUrl}/api/games`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kind, seats }),
                    signal: ctrl.signal
                });
                clearTimeout(timeoutId);

                if (resp.ok) {
                    const data = await resp.json();
                    matchData = data.match;
                    seatToken = data.token;
                }
            } catch (netErr) {
                console.warn('[Lobby Server]: 节点未就绪或未配置，自动无缝启动掌机本地内置引擎');
            }
        }

        // 掌机内置引擎离线兜底
        if (!matchData) {
            matchData = {
                id: 'local_match_' + Date.now(),
                kind: kind,
                seats: seats,
                log: [{ action: 'start', time: Date.now() }],
                status: 'playing',
                turn: 'me'
            };
            seatToken = 'local_token_' + Math.random().toString(36).slice(2);
        }

        window._activeLobbyMatch = matchData;
        window._activeLobbySeatToken = seatToken;

        hideLobbyLoading();
        renderActiveGameBoard(kind, matchData, selectedNpcs, seatToken, serverUrl);
    };

    /**
     * 兼容单同伴旧调用
     */
    window.startMatchWithNpc = async function (kind, npc) {
        return window.startMatchWithNpcs(kind, [npc]);
    };

    /**
     * 绑定视口消息通信
     */
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

        const params = new URLSearchParams({
            matchId: match.id,
            kind: kind,
            token: token || '',
            serverUrl: serverUrl || '',
            playerName: '我',
            aiThinkingMode: isIndividual ? 'individual' : 'batch',
            npcs: JSON.stringify(selectedNpcs.map(n => ({ id: n.id, name: n.name, avatar: n.avatarUrl || n.avatar || '' })))
        });

        const iframeSrc = `assets/lobby-web/index.html#/match?${params.toString()}`;

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

                <div id="lobbyFallbackPrompt" style="display:none;position:absolute;top:0;left:0;right:0;bottom:0;background:#f7f7f7;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;box-sizing:border-box;">
                    <div style="font-size:15px;font-weight:600;color:#181818;margin-bottom:8px;">本地棋盘正在初始化</div>
                    <div style="font-size:12px;color:#777;line-height:1.5;margin-bottom:16px;">
                        若本地棋盘静态资源构建中，你可以先提前体验战报沉淀与复盘：
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button onclick="window.completeMockMatch('胜', '${kind}')" style="border:none;background:#07c160;color:#fff;padding:8px 14px;border-radius:6px;font-size:12.5px;font-weight:600;">模拟我方获胜</button>
                        <button onclick="window.completeMockMatch('负', '${kind}')" style="border:none;background:#fa5151;color:#fff;padding:8px 14px;border-radius:6px;font-size:12.5px;font-weight:600;">模拟对方获胜</button>
                    </div>
                </div>
            </div>
        `;

        const btnExit = document.getElementById('btnExitMatchToLobby');
        if (btnExit) {
            btnExit.onclick = () => {
                if (confirm('正在对局中，确定要退出当前棋盘返回大厅吗？')) {
                    window.renderLobbyApp();
                }
            };
        }

        const iframe = document.getElementById('lobbyBoardIframe');
        const fallback = document.getElementById('lobbyFallbackPrompt');
        let loaded = false;
        if (iframe) {
            iframe.onload = () => {
                loaded = true;
            };
            setTimeout(() => {
                if (!loaded && fallback) {
                    fallback.style.display = 'flex';
                }
            }, 3000);
        }
    }

    /**
     * 胜负结算与【战报转发】弹窗（极简纯 SVG 风格，彻底移除 Emoji）
     */
    window.completeMockMatch = function (resultType, kind, customMoves) {
        ensureLobbyStyles();
        const npcs = window._activeLobbySelectedNpcs && window._activeLobbySelectedNpcs.length ? window._activeLobbySelectedNpcs : [window._activeLobbySelectedNpc];
        if (!npcs.length || !npcs[0]) return;

        const mainNpc = npcs[0];
        const allNames = npcs.map(n => n.name).join('、');
        const game = GAME_LIST.find(g => g.kind === kind) || { name: '棋牌切磋' };
        const movesCount = customMoves || Math.floor(Math.random() * 20 + 15);
        const resultText = (resultType === '胜') ? '玩家获胜' : `${allNames} 获胜`;

        const oldModal = document.getElementById('lobbyActiveDialog');
        if (oldModal) oldModal.remove();

        const mask = document.createElement('div');
        mask.id = 'lobbyActiveDialog';
        mask.className = 'lobby-clean-modal-mask';

        // 极简 SVG 胜负图标
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
                    <div style="width:52px;height:52px;border-radius:50%;background:${resultType === '胜' ? '#e8f8ee' : '#fff1f0'};display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                        ${resultIconSvg}
                    </div>

                    <div style="font-size:16.5px;font-weight:700;color:#181818;margin-bottom:4px;">
                        ${resultText}
                    </div>
                    <div style="font-size:12px;color:#888;margin-bottom:14px;">
                        在「${safeHtml(game.name)}」中双方共对弈 ${movesCount} 回合
                    </div>

                    <div style="background:#f7f7f7;border:0.5px solid #eaeaea;border-radius:8px;padding:10px 12px;font-size:12px;color:#555;text-align:left;line-height:1.5;margin-bottom:16px;">
                        <div style="display:flex;align-items:center;gap:5px;font-weight:600;color:#181818;margin-bottom:3px;">
                            <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:#07c160;stroke-width:2;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
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

        const closeModal = () => {
            mask.remove();
        };

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

    /**
     * 将战报作为 lobby_share_card 消息写入单聊历史
     */
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
     * 对局设置弹窗（含同伴思考模式开关与问号说明、私密节点配置，全极简 SVG）
     */
    window.openLobbySettingsModal = function () {
        ensureLobbyStyles();
        const curUrl = getLobbyServerUrl();
        const isIndividual = isLobbyIndividualAiThinking();

        const oldModal = document.getElementById('lobbyActiveDialog');
        if (oldModal) oldModal.remove();

        const mask = document.createElement('div');
        mask.id = 'lobbyActiveDialog';
        mask.className = 'lobby-clean-modal-mask';

        mask.innerHTML = `
            <div class="lobby-clean-modal-dialog">
                <div class="lobby-clean-modal-header">
                    <h3 class="lobby-clean-modal-title">对局与调度设置</h3>
                    <button type="button" class="lobby-clean-modal-close" id="btnServerSetClose">✕</button>
                </div>
                <div class="lobby-clean-modal-body">
                    
                    <!-- 同伴思考调度模式 -->
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

                    <!-- 裁判节点网络配置 -->
                    <div style="margin-bottom:14px;">
                        <div style="font-size:12.5px;color:#555;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
                            <span>裁判节点地址</span>
                            <span style="font-size:11px;color:#888;">留空则使用内置离线引擎</span>
                        </div>
                        <input type="text" id="iptLobbyServerUrl" placeholder="本地内置引擎 (离线保活)" value="${safeHtml(curUrl)}" style="width:100%;box-sizing:border-box;border:0.5px solid #dcdcdc;border-radius:6px;padding:9px 10px;font-size:13px;outline:none;" />
                    </div>

                    <div style="display:flex;gap:8px;">
                        <button type="button" id="btnCancelServerSet" style="flex:1;border:none;background:#f2f2f2;color:#333;padding:10px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;">取消</button>
                        <button type="button" id="btnSaveServerSet" style="flex:1;border:none;background:#07c160;color:#fff;padding:10px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(7,193,96,0.25);">保存设置</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(mask);

        const closeModal = () => {
            mask.remove();
        };

        mask.addEventListener('click', (e) => {
            if (e.target === mask) closeModal();
        });
        document.getElementById('btnServerSetClose').onclick = closeModal;
        document.getElementById('btnCancelServerSet').onclick = closeModal;

        // 点击 ? 问号弹出极简说明
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

    /**
     * 思考模式详细说明弹窗
     */
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
                        当轮到某个自建同伴走子时，系统会单独对该角色发起一次模型请求。角色能根据当前的胜负局面展开最真实的性格反应与私密心声，沉浸感与活人感极强，但多次请求会消耗相对较多的 API 额度。
                    </div>
                    <div style="margin-bottom:12px;">
                        <b style="color:#181818;">2. 关闭【独立思考模式】（合并思考，默认）</b><br>
                        每轮对局由一次模型推理同时完成桌上所有 AI 同伴的走子与对话裁决。极度节省 Token 额度，网络开销极小，响应更快，非常适合学生党与预算有限的体验场景。
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

    // 兼容旧接口名
    window.openLobbyServerSettingsModal = window.openLobbySettingsModal;

    console.log('LobbyApp 游戏大厅已装载：本地离线引擎就绪、多同伴联机就绪、调度设置就绪');
})();
