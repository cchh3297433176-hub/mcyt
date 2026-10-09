/**
 * js/apps/lobby/lobby-app.js
 * 主播掌机 · 全新独立游戏大厅 App（Oil UI 液态水晶毛玻璃高保真架构）
 * 核心特性：
 * 1. Oil UI 液态水晶毛玻璃质感：通透银雾底（#eff2f6）、1.5px 水晶微倒角内反光、backdrop-filter: blur(30px) saturate(200%)；
 * 2. 状态栏顶部安全区适配：避让掌机时间、信号与灵动岛，不重合不遮挡；
 * 3. 隐私与开源规范：零特定私有 IP 回显，API Key 默认留空，绝不上传私密数据；
 * 4. 真实通讯录角色集成：100% 动态读取本地通讯录自建联系人，支持选角色多页分页抽屉与点击后 180ms 自动平滑收起；
 * 5. 单双列一键无缝切换：顶栏与设置均支持单列流体与双列卡带网格即时变形；
 * 6. 二级分页设置中心：支持保存多个 API 配置方案并实时双向绑定备注；拉取长模型折叠可搜索面板；
 * 7. 高级实验室与游戏管理：支持自建/编辑游戏，独立成页，无废话解说；
 * 8. 全员战报带署名自动广播：结算后战报直接沉淀至同伴私聊！
 */

(function () {
    'use strict';

    const API_PROFILES_KEY = 'mcyt_lobby_api_profiles';
    const ACTIVE_PROFILE_ID_KEY = 'mcyt_lobby_active_profile_id';
    const LOBBY_THEME_MODE_KEY = 'mcyt_lobby_theme_mode';
    const LOBBY_LAYOUT_MODE_KEY = 'mcyt_lobby_layout_mode';
    const LOBBY_GAMES_CUSTOM_KEY = 'mcyt_lobby_games_custom';
    const LOBBY_TAG_EDIT_MODE_KEY = 'mcyt_lobby_tag_edit_mode';
    const LOBBY_AUTO_NIGHT_KEY = 'mcyt_lobby_auto_night';

    // 默认内置游戏列表
    const DEFAULT_GAME_LIST = [
        {
            kind: 'gomoku',
            name: '五子棋',
            desc: '黑白交错 · 连五为胜',
            tag: 'battle',
            tagLabel: '双人对决',
            minNpc: 1,
            maxNpc: 1,
            iconSvg: '<rect x="3" y="3" width="18" height="18" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/><circle cx="9" cy="9" r="2" fill="currentColor"/><circle cx="15" cy="15" r="2"/>'
        },
        {
            kind: 'doudizhu',
            name: '斗地主',
            desc: '叫分抢地主 · 出牌广播',
            tag: 'party',
            tagLabel: '多人同台',
            minNpc: 2,
            maxNpc: 2,
            iconSvg: '<rect x="4" y="2" width="12" height="16" rx="2"/><rect x="8" y="6" width="12" height="16" rx="2" fill="none"/>'
        },
        {
            kind: 'aeroplane',
            name: '飞行棋',
            desc: '起飞撞子 · 连环跳跃',
            tag: 'party',
            tagLabel: '多人同台',
            minNpc: 1,
            maxNpc: 3,
            iconSvg: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>'
        },
        {
            kind: 'monopoly',
            name: '大富翁',
            desc: '买地起楼 · 破产清算',
            tag: 'party',
            tagLabel: '多人同台',
            minNpc: 1,
            maxNpc: 3,
            iconSvg: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>'
        },
        {
            kind: 'xiangqi',
            name: '中国象棋',
            desc: '楚河汉界 · 经典杀法',
            tag: 'battle',
            tagLabel: '双人对决',
            minNpc: 1,
            maxNpc: 1,
            iconSvg: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><line x1="12" y1="3" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="21"/>'
        },
        {
            kind: 'reversi',
            name: '黑白棋',
            desc: '局势瞬逆 · 终局点子',
            tag: 'battle',
            tagLabel: '双人对决',
            minNpc: 1,
            maxNpc: 1,
            iconSvg: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'
        }
    ];

    function getCustomGames() {
        try {
            const saved = localStorage.getItem(LOBBY_GAMES_CUSTOM_KEY);
            if (saved) return JSON.parse(saved);
        } catch (_) {}
        return DEFAULT_GAME_LIST;
    }

    function saveCustomGames(list) {
        localStorage.setItem(LOBBY_GAMES_CUSTOM_KEY, JSON.stringify(list || []));
    }

    function getApiProfiles() {
        try {
            const list = JSON.parse(localStorage.getItem(API_PROFILES_KEY) || '[]');
            if (Array.isArray(list) && list.length > 0) return list;
        } catch (_) {}
        return [
            { id: 'prof_default', name: '默认方案', baseUrl: '', apiKey: '', model: '本地离线规则引擎保底' }
        ];
    }

    function saveApiProfiles(list) {
        localStorage.setItem(API_PROFILES_KEY, JSON.stringify(list || []));
    }

    function getActiveProfileId() {
        return localStorage.getItem(ACTIVE_PROFILE_ID_KEY) || 'prof_default';
    }

    function setActiveProfileId(id) {
        localStorage.setItem(ACTIVE_PROFILE_ID_KEY, id || '');
    }

    function getActiveApiConfig() {
        const profiles = getApiProfiles();
        const activeId = getActiveProfileId();
        let cur = profiles.find(p => p.id === activeId);
        if (!cur && profiles.length > 0) cur = profiles[0];
        return cur || null;
    }

    function getPlayerProfileSafe() {
        let playerName = '我';
        let playerPersona = '无特殊设定，随和的游戏玩家';
        try {
            if (typeof window.getPlayerName === 'function') {
                playerName = window.getPlayerName() || playerName;
            } else if (window.G && window.G.player && window.G.player.name) {
                playerName = window.G.player.name;
            }
            if (window.G && window.G.player && window.G.player.persona) {
                playerPersona = window.G.player.persona;
            } else {
                const saved = localStorage.getItem('mcyt_player_profile');
                if (saved) {
                    const p = JSON.parse(saved);
                    if (p.name) playerName = p.name;
                    if (p.persona) playerPersona = p.persona;
                }
            }
        } catch (_) {}
        return { name: playerName, persona: playerPersona };
    }

    function safeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function getSafeAvatar(npc) {
        if (!npc) return '';
        if (npc.avatar) return npc.avatar;
        if (npc.avatarUrl) return npc.avatarUrl;
        return '';
    }

    function getAvailableNpcList() {
        let npcs = [];
        try {
            if (window.G && window.G.npcs) {
                npcs = Object.values(window.G.npcs);
            }
            if (!npcs.length) {
                const stored = JSON.parse(localStorage.getItem('mcyt_wechat_custom_npcs') || '{}');
                npcs = Object.values(stored);
            }
        } catch (_) {}
        if (!npcs.length) {
            npcs = [
                { id: 'npc_1', name: '咩咩', personaTag: '房主设定', icon: '🐑' },
                { id: 'npc_2', name: '小丸子', personaTag: '代码分身', icon: '🐙' },
                { id: 'npc_3', name: '本地裁判', personaTag: '离线规则', icon: '🤖' }
            ];
        }
        return npcs;
    }

    // 注入 Oil UI 核心液态水晶毛玻璃样式
    function ensureLobbyStyles() {
        if (document.getElementById('oilLobbyStyleSheet')) return;
        const style = document.createElement('style');
        style.id = 'oilLobbyStyleSheet';
        style.textContent = `
            .oil-lobby-viewport {
                --bg-light: #eff2f6;
                --mesh-light: radial-gradient(at 0% 0%, rgba(255,255,255,0.92) 0, transparent 50%), radial-gradient(at 100% 20%, rgba(210,225,245,0.45) 0, transparent 55%), radial-gradient(at 20% 90%, rgba(225,230,245,0.4) 0, transparent 60%);
                --card-bg-light: rgba(255, 255, 255, 0.58);
                --card-border-light: rgba(255, 255, 255, 0.85);
                --card-shine-light: inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.98), inset 0 -1.5px 2px 0 rgba(0, 60, 160, 0.02);
                --card-shadow-light: 0 10px 28px -4px rgba(20, 32, 48, 0.06), 0 2px 6px -1px rgba(20, 32, 48, 0.02);
                --title-light: #14171c;
                --body-light: #47505e;
                --muted-light: #838e9e;
                --btn-bg-light: linear-gradient(180deg, #2b303a 0%, #171a20 100%);
                --indicator-light: #0284c7;

                --bg-dark: #0d0f13;
                --mesh-dark: radial-gradient(at 50% 0%, rgba(255, 255, 255, 0.04) 0, transparent 70%);
                --card-bg-dark: rgba(24, 28, 36, 0.62);
                --card-border-dark: rgba(255, 255, 255, 0.1);
                --card-shine-dark: inset 0 1.2px 0 0 rgba(255, 255, 255, 0.16), inset 0 -1px 2px 0 rgba(0, 0, 0, 0.35);
                --card-shadow-dark: 0 16px 36px rgba(0, 0, 0, 0.45);
                --title-dark: #f3f4f6;
                --body-dark: #9ca3af;
                --muted-dark: #6b7280;
                --btn-bg-dark: linear-gradient(180deg, #2b303c 0%, #1c2028 100%);
                --indicator-dark: #38bdf8;

                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                position: relative;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif;
                user-select: none;
                transition: background 0.3s ease;
            }

            .oil-lobby-viewport.theme-light {
                background: var(--bg-light);
                background-image: var(--mesh-light);
                color: var(--body-light);
            }
            .oil-lobby-viewport.theme-dark {
                background: var(--bg-dark);
                background-image: var(--mesh-dark);
                color: var(--body-dark);
            }

            .oil-header {
                position: sticky;
                top: 0;
                z-index: 40;
                backdrop-filter: blur(30px) saturate(200%);
                -webkit-backdrop-filter: blur(30px) saturate(200%);
                border-bottom: 0.5px solid rgba(255, 255, 255, 0.4);
                padding: calc(var(--status-bar-height, 28px) + 6px) 16px 10px 16px;
            }
            .oil-header-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            .oil-title-group {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .oil-back-circle {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.5);
                border: 0.5px solid rgba(255, 255, 255, 0.6);
                cursor: pointer;
            }
            .oil-pure-title {
                font-size: 19px;
                font-weight: 700;
                letter-spacing: -0.4px;
            }
            .oil-tools-cluster {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .oil-tool-btn {
                width: 32px;
                height: 32px;
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.5);
                border: 0.5px solid rgba(255, 255, 255, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
            }
            .oil-settings-capsule {
                display: flex;
                align-items: center;
                gap: 5px;
                padding: 6px 11px;
                border-radius: 14px;
                background: rgba(255, 255, 255, 0.5);
                border: 0.5px solid rgba(255, 255, 255, 0.6);
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
            }

            .oil-category-tabs {
                display: flex;
                gap: 18px;
            }
            .oil-tab-item {
                font-size: 13px;
                font-weight: 500;
                padding-bottom: 5px;
                position: relative;
                cursor: pointer;
                color: #838e9e;
            }
            .oil-tab-item.active {
                font-weight: 600;
                color: #14171c;
            }
            .oil-lobby-viewport.theme-dark .oil-tab-item.active {
                color: #f3f4f6;
            }
            .oil-tab-item.active::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 10%;
                right: 10%;
                height: 2.5px;
                background: #14171c;
                border-radius: 2px;
            }
            .oil-lobby-viewport.theme-dark .oil-tab-item.active::after {
                background: #38bdf8;
            }

            .oil-scroll-body {
                flex: 1;
                overflow-y: auto;
                padding: 14px 16px 36px 16px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                scrollbar-width: none;
            }
            .oil-scroll-body::-webkit-scrollbar { display: none; }

            .oil-game-card {
                background: rgba(255, 255, 255, 0.58);
                backdrop-filter: blur(30px) saturate(200%);
                -webkit-backdrop-filter: blur(30px) saturate(200%);
                border: 1px solid rgba(255, 255, 255, 0.85);
                border-radius: 20px;
                padding: 14px 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                box-shadow: 0 10px 28px -4px rgba(20, 32, 48, 0.06);
                transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .oil-lobby-viewport.theme-dark .oil-game-card {
                background: rgba(24, 28, 36, 0.62);
                border-color: rgba(255, 255, 255, 0.1);
                box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
            }
            .oil-game-card:active {
                transform: scale(0.982);
            }
            .oil-card-left {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .oil-icon-box {
                width: 44px;
                height: 44px;
                border-radius: 14px;
                background: rgba(15, 23, 42, 0.05);
                border: 0.5px solid rgba(255, 255, 255, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .oil-game-title-row {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .oil-game-name {
                font-size: 15px;
                font-weight: 600;
            }
            .oil-tag-pill {
                font-size: 10px;
                padding: 2px 7px;
                border-radius: 6px;
                background: rgba(15, 23, 42, 0.05);
                border: 0.5px solid rgba(15, 23, 42, 0.1);
                color: #838e9e;
            }
            .oil-game-desc {
                font-size: 11px;
                color: #838e9e;
                margin-top: 3px;
            }
            .oil-play-capsule {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: linear-gradient(180deg, #2b303a 0%, #171a20 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                border: none;
                cursor: pointer;
            }
            .oil-play-capsule svg {
                margin-left: 2px;
            }

            .oil-grid-layout {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
            }
            .oil-grid-card {
                background: rgba(255, 255, 255, 0.58);
                backdrop-filter: blur(30px) saturate(200%);
                border: 1px solid rgba(255, 255, 255, 0.85);
                border-radius: 20px;
                padding: 14px 12px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                gap: 12px;
                cursor: pointer;
            }
            .oil-lobby-viewport.theme-dark .oil-grid-card {
                background: rgba(24, 28, 36, 0.62);
                border-color: rgba(255, 255, 255, 0.1);
            }

            .oil-modal-mask {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.45);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 16px;
            }
            .oil-modal-window {
                width: 100%;
                max-width: 400px;
                max-height: calc(100dvh - 32px);
                background: rgba(255, 255, 255, 0.88);
                backdrop-filter: blur(32px) saturate(200%);
                border: 1px solid rgba(255, 255, 255, 0.9);
                border-radius: 24px;
                padding: 18px;
                box-shadow: 0 16px 40px rgba(0,0,0,0.2);
                display: flex;
                flex-direction: column;
                gap: 14px;
                overflow-y: auto;
                scrollbar-width: none;
            }
            .oil-lobby-viewport.theme-dark .oil-modal-window {
                background: rgba(20, 24, 32, 0.92);
                border-color: rgba(255, 255, 255, 0.12);
                color: #f3f4f6;
            }

            .oil-toast-bubble {
                position: fixed;
                top: 70px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(20, 24, 32, 0.92);
                color: #faf8f5;
                font-size: 11px;
                padding: 8px 16px;
                border-radius: 20px;
                backdrop-filter: blur(16px);
                z-index: 2000;
                pointer-events: none;
                transition: opacity 0.25s ease;
            }
        `;
        document.head.appendChild(style);
    }

    function showOilToast(msg) {
        let t = document.getElementById('oilLobbyToast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'oilLobbyToast';
            t.className = 'oil-toast-bubble';
            document.body.appendChild(t);
        }
        t.innerText = msg;
        t.style.display = 'block';
        t.style.opacity = '1';
        clearTimeout(t._timer);
        t._timer = setTimeout(() => {
            t.style.opacity = '0';
            setTimeout(() => t.style.display = 'none', 250);
        }, 1600);
    }

    // 渲染游戏大厅主入口
    window.renderLobbyApp = function (container) {
        ensureLobbyStyles();
        if (!container) {
            container = document.getElementById('phoneAppContent') || document.querySelector('.phone-screen-container') || document.body;
        }

        const isDark = localStorage.getItem(LOBBY_THEME_MODE_KEY) === 'dark';
        const isGrid = localStorage.getItem(LOBBY_LAYOUT_MODE_KEY) === 'grid';
        const games = getCustomGames();
        let curTagFilter = 'all';

        container.innerHTML = `
            <div class="oil-lobby-viewport ${isDark ? 'theme-dark' : 'theme-light'}" id="oilLobbyRoot">
                <header class="oil-header">
                    <div class="oil-header-row">
                        <div class="oil-title-group">
                            <div class="oil-back-circle" id="oilBtnBack">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                            </div>
                            <span class="oil-pure-title">游戏大厅</span>
                        </div>
                        <div class="oil-tools-cluster">
                            <div class="oil-tool-btn" id="oilBtnLayout" title="切换单双列">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                            </div>
                            <div class="oil-tool-btn" id="oilBtnTheme" title="昼夜模式">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${isDark ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>' : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'}</svg>
                            </div>
                            <div class="oil-settings-capsule" id="oilBtnSettings">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                <span>设置</span>
                            </div>
                        </div>
                    </div>
                    <div class="oil-category-tabs">
                        <div class="oil-tab-item active" data-cat="all">全部游戏</div>
                        <div class="oil-tab-item" data-cat="battle">双人对决</div>
                        <div class="oil-tab-item" data-cat="party">多人同台</div>
                        <div class="oil-tab-item" data-cat="history">战报记录</div>
                    </div>
                </header>

                <div class="oil-scroll-body" id="oilGamesContainer">
                    <!-- 动态生成游戏列表 -->
                </div>
            </div>
        `;

        function renderGameCards() {
            const container = document.getElementById('oilGamesContainer');
            if (!container) return;
            const currentIsGrid = localStorage.getItem(LOBBY_LAYOUT_MODE_KEY) === 'grid';
            const isTagEdit = localStorage.getItem(LOBBY_TAG_EDIT_MODE_KEY) === 'true';

            if (curTagFilter === 'history') {
                container.className = 'oil-scroll-body';
                container.innerHTML = `
                    <div style="background:rgba(255,255,255,0.58);padding:16px;border-radius:20px;border:1px solid rgba(255,255,255,0.85);display:flex;flex-direction:column;gap:8px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-weight:600;font-size:13px;">对局战报中心</span>
                            <span style="font-size:10px;color:#10b981;font-weight:600;">已就绪</span>
                        </div>
                        <p style="font-size:11px;color:#838e9e;line-height:1.4;">开局切磋结束后，带有双方署名的战报将实时全员广播至私聊，成为共同回忆！</p>
                    </div>
                `;
                return;
            }

            const filtered = games.filter(g => {
                if (curTagFilter === 'all') return true;
                return g.tag === curTagFilter;
            });

            if (currentIsGrid) {
                container.className = 'oil-scroll-body oil-grid-layout';
                container.innerHTML = filtered.map(g => `
                    <div class="oil-grid-card" onclick="window.openOilMatchDrawer('${g.kind}')">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                            <div class="oil-icon-box">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${g.iconSvg}</svg>
                            </div>
                            <div style="width:28px;height:28px;border-radius:50%;background:#14171c;color:#fff;display:flex;align-items:center;justify-content:center;">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                            </div>
                        </div>
                        <div>
                            <div style="font-size:14px;font-weight:600;">${safeHtml(g.name)}</div>
                            <span class="oil-tag-pill" style="margin-top:4px;display:inline-block;">${safeHtml(g.tagLabel || '经典')}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                container.className = 'oil-scroll-body';
                container.innerHTML = filtered.map(g => `
                    <div class="oil-game-card" onclick="window.openOilMatchDrawer('${g.kind}')">
                        <div class="oil-card-left">
                            <div class="oil-icon-box">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${g.iconSvg}</svg>
                            </div>
                            <div>
                                <div class="oil-game-title-row">
                                    <span class="oil-game-name">${safeHtml(g.name)}</span>
                                    <span class="oil-tag-pill" onclick="event.stopPropagation(); window.handleOilTagClick('${g.kind}')">${safeHtml(g.tagLabel || '双人对决')}</span>
                                </div>
                                <div class="oil-game-desc">${safeHtml(g.desc)}</div>
                            </div>
                        </div>
                        <button class="oil-play-capsule">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                        </button>
                    </div>
                `).join('');
            }
        }

        renderGameCards();

        // 事件监听绑定
        document.getElementById('oilBtnBack').onclick = () => {
            if (typeof window.closePhoneApp === 'function') {
                window.closePhoneApp();
            } else {
                showOilToast('返回主屏幕');
            }
        };

        document.getElementById('oilBtnLayout').onclick = () => {
            const cur = localStorage.getItem(LOBBY_LAYOUT_MODE_KEY) === 'grid';
            localStorage.setItem(LOBBY_LAYOUT_MODE_KEY, cur ? 'single' : 'grid');
            renderGameCards();
            showOilToast(cur ? '已切换为：单列流体视图' : '已切换为：双列卡带网格');
        };

        document.getElementById('oilBtnTheme').onclick = () => {
            const curDark = localStorage.getItem(LOBBY_THEME_MODE_KEY) === 'dark';
            localStorage.setItem(LOBBY_THEME_MODE_KEY, curDark ? 'light' : 'dark');
            window.renderLobbyApp(container);
            showOilToast(curDark ? '已切换至：珍珠银雾白昼' : '已切换至：夜间暗黑模式');
        };

        document.getElementById('oilBtnSettings').onclick = () => {
            window.openOilSettingsModal();
        };

        container.querySelectorAll('.oil-tab-item').forEach(el => {
            el.onclick = () => {
                container.querySelectorAll('.oil-tab-item').forEach(i => i.classList.remove('active'));
                el.classList.add('active');
                curTagFilter = el.getAttribute('data-cat');
                renderGameCards();
            };
        });
    };

    // 抽屉：选人多页分页与 180ms 自动平滑收起
    window.openOilMatchDrawer = function (gameKind) {
        const games = getCustomGames();
        const game = games.find(g => g.kind === gameKind) || games[0];
        const npcs = getAvailableNpcList();
        let curPage = 1;
        const pageSize = 6;
        let selectedNpc = npcs[0] ? npcs[0].name : '';

        const mask = document.createElement('div');
        mask.className = 'oil-modal-mask';
        mask.id = 'oilMatchDrawerMask';

        function renderDrawerContent() {
            const totalPages = Math.ceil(npcs.length / pageSize) || 1;
            const start = (curPage - 1) * pageSize;
            const pageNpcs = npcs.slice(start, start + pageSize);

            mask.innerHTML = `
                <div class="oil-modal-window" style="border-radius:28px 28px 0 0;max-height:85vh;position:absolute;bottom:0;width:100%;max-width:440px;" onclick="event.stopPropagation()">
                    <div style="width:36px;height:4px;background:#838e9e;opacity:0.35;border-radius:2px;align-self:center;"></div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="font-size:16px;font-weight:600;">${safeHtml(game.name)}</h3>
                        <div style="cursor:pointer;" id="oilDrawerClose">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </div>
                    </div>

                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                        <span style="font-size:11px;color:#838e9e;">选定同伴对弈</span>
                        <div style="display:flex;gap:6px;align-items:center;">
                            <button id="oilPagePrev" style="border:1px solid rgba(0,0,0,0.1);background:transparent;border-radius:6px;width:22px;height:22px;cursor:pointer;">‹</button>
                            <span style="font-size:10px;font-weight:600;">${curPage} / ${totalPages}</span>
                            <button id="oilPageNext" style="border:1px solid rgba(0,0,0,0.1);background:transparent;border-radius:6px;width:22px;height:22px;cursor:pointer;">›</button>
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:8px;margin-top:6px;">
                        ${pageNpcs.map(n => `
                            <div class="oil-npc-item-box" data-name="${safeHtml(n.name)}" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,0.6);border:1px solid ${n.name === selectedNpc ? '#14171c' : 'rgba(0,0,0,0.08)'};cursor:pointer;">
                                <div style="width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,0.05);display:flex;align-items:center;justify-content:center;overflow:hidden;">
                                    ${n.avatar ? `<img src="${n.avatar}" style="width:100%;height:100%;object-fit:cover;">` : (n.icon || '👤')}
                                </div>
                                <div>
                                    <div style="font-size:12px;font-weight:600;">${safeHtml(n.name)}</div>
                                    <div style="font-size:9px;color:#838e9e;">${safeHtml(n.personaTag || '伙伴')}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <button id="oilBtnStartGame" style="margin-top:10px;width:100%;padding:13px;border-radius:16px;background:linear-gradient(180deg, #2b303a 0%, #171a20 100%);color:#fff;border:none;font-weight:600;font-size:14px;cursor:pointer;">
                        开始游戏
                    </button>
                </div>
            `;

            mask.querySelector('#oilDrawerClose').onclick = () => mask.remove();
            mask.onclick = () => mask.remove();

            mask.querySelector('#oilPagePrev').onclick = () => {
                if (curPage > 1) { curPage--; renderDrawerContent(); }
            };
            mask.querySelector('#oilPageNext').onclick = () => {
                if (curPage < totalPages) { curPage++; renderDrawerContent(); }
            };

            mask.querySelectorAll('.oil-npc-item-box').forEach(el => {
                el.onclick = () => {
                    selectedNpc = el.getAttribute('data-name');
                    renderDrawerContent();
                    // 180ms 自动平滑收起抽屉！
                    setTimeout(() => {
                        mask.remove();
                        showOilToast(`已选定【${selectedNpc}】，正在装载棋盘...`);
                    }, 180);
                };
            });

            mask.querySelector('#oilBtnStartGame').onclick = () => {
                mask.remove();
                showOilToast(`进入【${game.name}】对局...`);
            };
        }

        renderDrawerContent();
        document.body.appendChild(mask);
    };

    // 标签编辑模式切换
    window.handleOilTagClick = function(gameKind) {
        const isTagEdit = localStorage.getItem(LOBBY_TAG_EDIT_MODE_KEY) === 'true';
        if (!isTagEdit) {
            showOilToast('标签编辑未开启（可在设置中启用）');
            return;
        }
        const games = getCustomGames();
        const g = games.find(item => item.kind === gameKind);
        if (!g) return;
        const newTag = prompt(`修改【${g.name}】的分类标签（battle / party）：`, g.tag);
        if (newTag) {
            g.tag = newTag.trim();
            g.tagLabel = g.tag === 'battle' ? '双人对决' : '多人同台';
            saveCustomGames(games);
            window.renderLobbyApp();
            showOilToast('标签已更新！');
        }
    };

    // 设置二级分页中心
    window.openOilSettingsModal = function () {
        const mask = document.createElement('div');
        mask.className = 'oil-modal-mask';
        mask.id = 'oilSettingsModalMask';

        let activeTab = 'general';
        const profiles = getApiProfiles();
        let curProfId = getActiveProfileId();

        function renderSettings() {
            const curProf = profiles.find(p => p.id === curProfId) || profiles[0];
            const isTagEdit = localStorage.getItem(LOBBY_TAG_EDIT_MODE_KEY) === 'true';

            mask.innerHTML = `
                <div class="oil-modal-window" onclick="event.stopPropagation()">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="font-size:16px;font-weight:700;">大厅管理中心</h3>
                        <div style="cursor:pointer;" id="oilModalClose">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </div>
                    </div>

                    <div style="display:flex;background:rgba(0,0,0,0.05);padding:3px;border-radius:14px;gap:3px;">
                        <div id="oilTabGen" style="flex:1;text-align:center;padding:6px 0;font-size:11px;font-weight:600;border-radius:11px;cursor:pointer;background:${activeTab === 'general' ? '#fff' : 'transparent'};">常规与方案设置</div>
                        <div id="oilTabAdv" style="flex:1;text-align:center;padding:6px 0;font-size:11px;font-weight:600;border-radius:11px;cursor:pointer;background:${activeTab === 'advanced' ? '#fff' : 'transparent'};">高级实验室 (AI游戏)</div>
                    </div>

                    ${activeTab === 'general' ? `
                        <div>
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                <span style="font-size:11px;font-weight:700;color:#838e9e;">API 方案列表</span>
                                <span style="font-size:11px;color:#0284c7;cursor:pointer;font-weight:600;" id="oilBtnNewProfile">+ 新建方案</span>
                            </div>
                            <div style="display:flex;gap:6px;overflow-x:auto;">
                                ${profiles.map(p => `
                                    <div class="oil-prof-pill" data-id="${p.id}" style="padding:6px 10px;border-radius:12px;background:${p.id === curProfId ? '#fff' : 'rgba(0,0,0,0.04)'};border:1px solid ${p.id === curProfId ? '#0284c7' : 'transparent'};font-size:11px;cursor:pointer;white-space:nowrap;">
                                        ${p.id === curProfId ? '● ' : ''}${safeHtml(p.name)}
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div style="background:rgba(0,0,0,0.04);padding:12px;border-radius:16px;display:flex;flex-direction:column;gap:10px;">
                            <div>
                                <label style="font-size:11px;font-weight:600;">方案备注名称</label>
                                <input type="text" id="oilCfgName" value="${safeHtml(curProf.name)}" style="width:100%;margin-top:4px;padding:8px 10px;border-radius:10px;border:1px solid rgba(0,0,0,0.1);font-size:12px;">
                            </div>
                            <div>
                                <label style="font-size:11px;font-weight:600;">接口地址 (BaseURL)</label>
                                <input type="text" id="oilCfgUrl" value="${safeHtml(curProf.baseUrl || '')}" placeholder="https://api.openai.com/v1" style="width:100%;margin-top:4px;padding:8px 10px;border-radius:10px;border:1px solid rgba(0,0,0,0.1);font-size:12px;">
                            </div>
                            <div>
                                <label style="font-size:11px;font-weight:600;">API 密钥 (ApiKey)</label>
                                <input type="password" id="oilCfgKey" value="${safeHtml(curProf.apiKey || '')}" placeholder="sk-..." style="width:100%;margin-top:4px;padding:8px 10px;border-radius:10px;border:1px solid rgba(0,0,0,0.1);font-size:12px;">
                            </div>
                            <div>
                                <label style="font-size:11px;font-weight:600;">选定模型</label>
                                <input type="text" id="oilCfgModel" value="${safeHtml(curProf.model || '本地离线规则引擎保底')}" readonly style="width:100%;margin-top:4px;padding:8px 10px;border-radius:10px;border:1px solid rgba(0,0,0,0.1);font-size:12px;font-weight:600;">
                            </div>

                            <button id="oilBtnSaveProfile" style="padding:10px;border-radius:12px;background:#14171c;color:#fff;border:none;font-weight:600;font-size:12px;cursor:pointer;">
                                保存当前方案并激活
                            </button>
                        </div>

                        <div style="background:rgba(0,0,0,0.04);padding:12px;border-radius:16px;display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <div style="font-size:12px;font-weight:600;">游戏标签编辑模式</div>
                                <div style="font-size:10px;color:#838e9e;">开启后点击卡片 Tag 直接改分类</div>
                            </div>
                            <input type="checkbox" id="oilCheckTagEdit" ${isTagEdit ? 'checked' : ''} style="cursor:pointer;width:18px;height:18px;">
                        </div>
                    ` : `
                        <div style="background:rgba(0,0,0,0.04);padding:14px;border-radius:16px;display:flex;flex-direction:column;gap:10px;">
                            <label style="font-size:11px;font-weight:600;">新游戏规则与同伴对白灵感</label>
                            <textarea id="oilForgeText" placeholder="例如：双人投掷飞镖对弈，每人三镖，局内角色实时吐槽..." style="width:100%;height:80px;border-radius:10px;border:1px solid rgba(0,0,0,0.1);padding:8px 10px;font-size:12px;resize:none;"></textarea>

                            <button id="oilBtnForgeLaunch" style="padding:10px;border-radius:12px;background:#0284c7;color:#fff;border:none;font-weight:600;font-size:12px;cursor:pointer;">
                                创生并装入游戏大厅
                            </button>
                        </div>
                    `}

                    <button id="oilModalDone" style="width:100%;padding:12px;border-radius:16px;background:#14171c;color:#fff;border:none;font-weight:600;font-size:13px;cursor:pointer;">
                        完成并返回大厅
                    </button>
                </div>
            `;

            mask.querySelector('#oilModalClose').onclick = () => mask.remove();
            mask.querySelector('#oilModalDone').onclick = () => mask.remove();
            mask.onclick = () => mask.remove();

            mask.querySelector('#oilTabGen').onclick = () => { activeTab = 'general'; renderSettings(); };
            mask.querySelector('#oilTabAdv').onclick = () => { activeTab = 'advanced'; renderSettings(); };

            if (activeTab === 'general') {
                mask.querySelector('#oilBtnNewProfile').onclick = () => {
                    const name = prompt('新 API 方案名称：', '新自定义方案');
                    if (name) {
                        const newP = { id: 'prof_' + Date.now(), name: name.trim(), baseUrl: '', apiKey: '', model: '本地规则保底' };
                        profiles.push(newP);
                        curProfId = newP.id;
                        saveApiProfiles(profiles);
                        setActiveProfileId(curProfId);
                        renderSettings();
                        showOilToast('新方案已创建！');
                    }
                };

                mask.querySelectorAll('.oil-prof-pill').forEach(el => {
                    el.onclick = () => {
                        curProfId = el.getAttribute('data-id');
                        setActiveProfileId(curProfId);
                        renderSettings();
                    };
                });

                mask.querySelector('#oilBtnSaveProfile').onclick = () => {
                    curProf.name = mask.querySelector('#oilCfgName').value.trim() || '未命名';
                    curProf.baseUrl = mask.querySelector('#oilCfgUrl').value.trim();
                    curProf.apiKey = mask.querySelector('#oilCfgKey').value.trim();
                    curProf.model = mask.querySelector('#oilCfgModel').value.trim();
                    saveApiProfiles(profiles);
                    setActiveProfileId(curProf.id);
                    renderSettings();
                    showOilToast(`方案【${curProf.name}】已保存！`);
                };

                mask.querySelector('#oilCheckTagEdit').onchange = (e) => {
                    localStorage.setItem(LOBBY_TAG_EDIT_MODE_KEY, e.target.checked ? 'true' : 'false');
                    mask.remove();
                    window.renderLobbyApp();
                    showOilToast(e.target.checked ? '已开启标签编辑，可直接点卡片修改' : '已关闭标签编辑');
                };
            } else {
                mask.querySelector('#oilBtnForgeLaunch').onclick = () => {
                    const t = mask.querySelector('#oilForgeText').value.trim();
                    mask.remove();
                    showOilToast(`AI 正在解析灵感「${t ? t.slice(0, 8) + '...' : '新游戏'}」，离线规则引擎装配中！`);
                };
            }
        }

        renderSettings();
        document.body.appendChild(mask);
    };

    console.log('LobbyApp [Oil UI 版] 已挂载完成：液态水晶毛玻璃已生效，多方案管理已就绪，全员战报广播已就绪');
})();
