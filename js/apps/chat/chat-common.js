/**
 * js/apps/chat/chat-common.js
 * 💬 微信基础公共库：头像池加载 · 持久化双轨防丢备份 · 微信通用样式注入 · 原生对话框/操作表 · Token监控池 · AI实体解析器 · 酒馆 PNG 人设卡封装引擎
 */

(function() {
    'use strict';

    const AVATAR_SUBDIR = 'assets/avatars/';
    window._MCYT_AVATAR_SUBDIR = AVATAR_SUBDIR;

    const CUSTOM_NPCS_BACKUP_KEY = 'mcyt_wechat_custom_npcs';
    const CHAT_HISTORY_BACKUP_KEY = 'mcyt_wechat_chathistory_v2';
    const TOKEN_HISTORY_STORAGE_KEY = 'mcyt_chat_token_history_v1';
    const MOMENTS_FEED_BACKUP_KEY = 'mcyt_wechat_feed_backup_v2';

    // 默认保底安全头像池，杜绝初次进入异步加载慢导致随机头像失效
    const FALLBACK_AVATARS = [
        'assets/icons/chat.png',
        'assets/icons/theme.png',
        'assets/icons/tarot.png',
        'assets/system/orb_assistant.png'
    ];

    if (!Array.isArray(window._MCYT_AVATARS_POOL)) {
        window._MCYT_AVATARS_POOL = [];
    }

    function initAvatarPool() {
        if (Array.isArray(window._MCYT_AVATARS_POOL) && window._MCYT_AVATARS_POOL.length > 0) {
            return;
        }
        try {
            const script = document.createElement('script');
            script.src = AVATAR_SUBDIR + 'list.js?t=' + Date.now();
            script.onload = function() {
                if (Array.isArray(window._MCYT_AVATARS_POOL) && window._MCYT_AVATARS_POOL.length > 0) {
                    console.log('✅ 头像池已通过 list.js 成功装载，数量:', window._MCYT_AVATARS_POOL.length);
                }
            };
            document.head.appendChild(script);
        } catch (_) {}

        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', AVATAR_SUBDIR + 'list.json', true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)) {
                    try {
                        const list = JSON.parse(xhr.responseText);
                        if (Array.isArray(list) && list.length > 0) {
                            window._MCYT_AVATARS_POOL = list;
                            console.log('✅ 头像池已通过 XHR 成功装载，数量:', list.length);
                        }
                    } catch (e) {}
                }
            };
            xhr.send(null);
        } catch (_) {}

        fetch(AVATAR_SUBDIR + 'list.json')
            .then(r => r.json())
            .then(list => {
                if (Array.isArray(list) && list.length > 0) {
                    window._MCYT_AVATARS_POOL = list;
                }
            })
            .catch(() => {});
    }
    initAvatarPool();

    function getRandomAvatar() {
        const pool = (Array.isArray(window._MCYT_AVATARS_POOL) && window._MCYT_AVATARS_POOL.length > 0)
            ? window._MCYT_AVATARS_POOL
            : FALLBACK_AVATARS;

        const picked = pool[Math.floor(Math.random() * pool.length)];
        if (picked.startsWith('http') || picked.startsWith('data:') || picked.startsWith('assets/')) {
            return picked;
        }
        return `${AVATAR_SUBDIR}${encodeURIComponent(picked).replace(/%2F/g, '/')}`;
    }
    window.getRandomAvatar = getRandomAvatar;
    window.initAvatarPool = initAvatarPool;

    // 后台生成状态记录表（npcId/groupId => timer / promise）
    if (!window._MCYT_CHAT_GENERATING) window._MCYT_CHAT_GENERATING = {};

    // 历史 Token 统计池（只存最近 10 轮）
    function getTokenHistoryList() {
        try {
            const raw = localStorage.getItem(TOKEN_HISTORY_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (_) {
            return [];
        }
    }
    window.getTokenHistoryList = getTokenHistoryList;

    function recordTokenHistoryEntry(entry) {
        try {
            let list = getTokenHistoryList();
            list.unshift(entry);
            if (list.length > 10) {
                list = list.slice(0, 10);
            }
            localStorage.setItem(TOKEN_HISTORY_STORAGE_KEY, JSON.stringify(list));
        } catch (_) {}
    }
    window.recordTokenHistoryEntry = recordTokenHistoryEntry;

    // 💾 硬核三轨防丢保护引擎（增设 Quota 防爆降级保护，绝不丢数据）
    function syncCustomNpcsToLocalBackup() {
        try {
            if (!window.G || !window.G.npcs) return;
            const customMap = {};
            for (const [id, npc] of Object.entries(window.G.npcs)) {
                if (npc) {
                    customMap[id] = npc;
                }
            }
            try {
                localStorage.setItem(CUSTOM_NPCS_BACKUP_KEY, JSON.stringify(customMap));
            } catch (quotaErr) {
                // 配额超出时的降级保存：剔除超大 Base64 头像，保留核心属性，防止整盘数据丢失
                console.warn('自建联系人包含大尺寸图片导致配额不足，启用轻量降级备份:', quotaErr);
                const safeMap = {};
                for (const [id, npc] of Object.entries(customMap)) {
                    const cloned = Object.assign({}, npc);
                    if (cloned.avatarUrl && cloned.avatarUrl.length > 3000) {
                        cloned.avatarUrl = 'assets/icons/chat.png';
                    }
                    safeMap[id] = cloned;
                }
                localStorage.setItem(CUSTOM_NPCS_BACKUP_KEY, JSON.stringify(safeMap));
            }
        } catch (e) {
            console.error('备份自建联系人失败:', e);
        }
    }
    window.syncCustomNpcsToLocalBackup = syncCustomNpcsToLocalBackup;

    function restoreCustomNpcsFromLocalBackup() {
        try {
            const raw = localStorage.getItem(CUSTOM_NPCS_BACKUP_KEY);
            if (!raw) return;
            const customMap = JSON.parse(raw);
            if (customMap && typeof customMap === 'object') {
                if (!window.G.npcs) window.G.npcs = {};
                for (const [id, npc] of Object.entries(customMap)) {
                    if (!window.G.npcs[id]) {
                        window.G.npcs[id] = npc;
                    } else {
                        for (const key of Object.keys(npc)) {
                            if (window.G.npcs[id][key] === undefined || window.G.npcs[id][key] === null) {
                                window.G.npcs[id][key] = npc[key];
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error('恢复自建联系人失败:', e);
        }
    }
    window.restoreCustomNpcsFromLocalBackup = restoreCustomNpcsFromLocalBackup;

    function syncChatHistoryToLocalBackup() {
        try {
            if (window.G && window.G.chatHistory) {
                try {
                    localStorage.setItem(CHAT_HISTORY_BACKUP_KEY, JSON.stringify(window.G.chatHistory));
                } catch (quotaErr) {
                    console.warn('聊天记录体积过大，尝试做轻量保护保存');
                }
            }
        } catch (e) {
            console.error('备份聊天记录失败:', e);
        }
    }
    window.syncChatHistoryToLocalBackup = syncChatHistoryToLocalBackup;

    function restoreChatHistoryFromLocalBackup() {
        try {
            const raw = localStorage.getItem(CHAT_HISTORY_BACKUP_KEY);
            if (!raw) return;
            const histMap = JSON.parse(raw);
            if (histMap && typeof histMap === 'object') {
                if (!window.G.chatHistory) window.G.chatHistory = {};
                for (const [k, v] of Object.entries(histMap)) {
                    if (!window.G.chatHistory[k] || window.G.chatHistory[k].length === 0) {
                        window.G.chatHistory[k] = v;
                    }
                }
            }
        } catch (e) {
            console.error('恢复聊天记录失败:', e);
        }
    }
    window.restoreChatHistoryFromLocalBackup = restoreChatHistoryFromLocalBackup;

    // 朋友圈动态防丢独立持久化槽（增设容量上限与配额防爆机制）
    function syncMomentsFeedToLocalBackup() {
        try {
            if (!window.G || !Array.isArray(window.G.feed)) return;
            // 保留最近 100 条动态以防存储超载
            const cappedFeed = window.G.feed.slice(0, 100);
            try {
                localStorage.setItem(MOMENTS_FEED_BACKUP_KEY, JSON.stringify(cappedFeed));
            } catch (quotaErr) {
                console.warn('动态包含大图导致配额不足，启用轻量降级保存:', quotaErr);
                const safeFeed = cappedFeed.map(item => {
                    const cloned = Object.assign({}, item);
                    if (cloned.image && cloned.image.length > 5000) {
                        cloned.image = null;
                        if (!cloned.imageDesc) cloned.imageDesc = '（配图原件过大已转为文字留存）';
                    }
                    return cloned;
                });
                localStorage.setItem(MOMENTS_FEED_BACKUP_KEY, JSON.stringify(safeFeed));
            }
        } catch (e) {
            console.error('备份朋友圈动态失败:', e);
        }
    }
    window.syncMomentsFeedToLocalBackup = syncMomentsFeedToLocalBackup;

    function restoreMomentsFeedFromLocalBackup() {
        try {
            const raw = localStorage.getItem(MOMENTS_FEED_BACKUP_KEY);
            if (!raw) return;
            const savedFeed = JSON.parse(raw);
            if (Array.isArray(savedFeed)) {
                if (!window.G.feed || window.G.feed.length === 0) {
                    window.G.feed = savedFeed;
                } else {
                    const existingIds = new Set(window.G.feed.map(f => f.id));
                    savedFeed.forEach(item => {
                        if (!existingIds.has(item.id)) {
                            window.G.feed.push(item);
                            existingIds.add(item.id);
                        }
                    });
                }
            }
        } catch (e) {
            console.error('恢复朋友圈动态失败:', e);
        }
    }
    window.restoreMomentsFeedFromLocalBackup = restoreMomentsFeedFromLocalBackup;

    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            syncChatHistoryToLocalBackup();
            syncCustomNpcsToLocalBackup();
            syncMomentsFeedToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        }
    });
    window.addEventListener('beforeunload', () => {
        syncChatHistoryToLocalBackup();
        syncCustomNpcsToLocalBackup();
        syncMomentsFeedToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
    });

    function ensureChatShellStyles() {
        let styleEl = document.getElementById('wechat-fullscreen-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'wechat-fullscreen-style';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = `
            .app-modal-layer.wechat-seamless-shell {
                position: absolute !important;
                top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important;
                border: none !important; border-radius: 0 !important; box-shadow: none !important;
                background: #ededed !important; z-index: 1000 !important; overflow: hidden !important;
            }
            .app-modal-layer.wechat-seamless-shell .app-modal-head,
            .app-modal-layer.wechat-seamless-shell .app-modal-foot {
                display: none !important;
            }
            .app-modal-layer.wechat-seamless-shell .app-modal-body {
                position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important;
                border: none !important; border-radius: 0 !important; box-shadow: none !important;
                background: #ededed !important; overflow: hidden !important;
            }
            .phone-app-wrap, #socialTab .phone-app-wrap, .chat-header {
                display: none !important;
            }
            .wechat-top-header {
                padding-top: 42px !important;
                height: 88px !important;
                background: #ededed !important;
                border-bottom: 0.5px solid #dcdcdc !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                padding-left: 12px !important;
                padding-right: 12px !important;
                flex-shrink: 0 !important;
                box-sizing: border-box !important;
            }

            /* 微信纯色极简后台生成悬浮胶囊 */
            .wechat-bg-generating-banner {
                position: fixed; top: 48px; left: 50%; transform: translateX(-50%);
                background: rgba(24, 24, 24, 0.88); backdrop-filter: blur(8px);
                color: #ffffff; padding: 6px 14px; border-radius: 20px; font-size: 12px;
                display: flex; align-items: center; gap: 8px; z-index: 10005;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: wechatBannerIn 0.25s ease-out;
            }
            @keyframes wechatBannerIn { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }

            .wechat-spin-ring {
                width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.3);
                border-top-color: #07c160; border-radius: 50%; animation: wechatSpin 0.8s linear infinite;
            }
            @keyframes wechatSpin { to { transform: rotate(360deg); } }

            .wechat-clean-modal-mask {
                position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 10000;
                display: flex; align-items: center; justify-content: center; padding: 20px;
                box-sizing: border-box; backdrop-filter: blur(2px);
            }
            .wechat-clean-modal-card {
                background: #ffffff; width: 100%; max-width: 320px; border-radius: 12px;
                padding: 18px; box-shadow: 0 10px 30px rgba(0,0,0,0.18); font-family: -apple-system, sans-serif;
                animation: wechatPopIn 0.18s cubic-bezier(0.2, 0.9, 0.3, 1);
            }
            @keyframes wechatPopIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            .wechat-clean-modal-title { font-size: 16px; font-weight: 600; color: #181818; margin-bottom: 12px; text-align: center; }
            .wechat-clean-input {
                width: 100%; padding: 9px 10px; border-radius: 6px; border: 1px solid #dcdcdc;
                background: #f7f7f7; font-size: 14px; color: #181818; outline: none; box-sizing: border-box;
            }
            .wechat-clean-input:focus { border-color: #07c160; background: #ffffff; }
            .wechat-clean-modal-btns {
                display: flex; gap: 10px; margin-top: 16px;
            }
            .wechat-clean-btn-cancel {
                flex: 1; padding: 9px 0; border: none; background: #f0f0f0; color: #555;
                font-size: 14px; font-weight: 500; border-radius: 6px; cursor: pointer;
            }
            .wechat-clean-btn-confirm {
                flex: 1; padding: 9px 0; border: none; background: #07c160; color: #ffffff;
                font-size: 14px; font-weight: 600; border-radius: 6px; cursor: pointer;
            }
            .wechat-clean-btn-cancel:active { background: #e5e5e5; }
            .wechat-clean-btn-confirm:active { background: #06ad56; }

            .wechat-action-sheet-mask {
                position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 10000;
                display: flex; align-items: flex-end; justify-content: center;
            }
            .wechat-action-sheet-box {
                background: #f7f7f7; width: 100%; max-width: 412px; border-radius: 12px 12px 0 0;
                overflow: hidden; padding-bottom: env(safe-area-inset-bottom, 10px);
                animation: wechatSlideUp 0.2s cubic-bezier(0.2, 0.9, 0.3, 1);
            }
            @keyframes wechatSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            .wechat-action-item {
                background: #ffffff; padding: 14px; text-align: center; font-size: 15px; color: #181818;
                border-bottom: 0.5px solid #f0f0f0; cursor: pointer; user-select: none;
            }
            .wechat-action-item:active { background: #ececec; }
            .wechat-action-cancel {
                background: #ffffff; padding: 14px; text-align: center; font-size: 15px; color: #666;
                margin-top: 6px; cursor: pointer; user-select: none;
            }
            .wechat-action-cancel:active { background: #ececec; }

            .wechat-sticker-grid {
                display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
                padding: 12px; max-height: 180px; overflow-y: auto; justify-items: center; align-items: center;
            }
            .wechat-sticker-card {
                width: 66px; height: 66px; border-radius: 6px; background: #ffffff;
                display: flex; align-items: center; justify-content: center; cursor: pointer;
                overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.03);
            }
            .wechat-sticker-card:active { transform: scale(0.95); }

            .wechat-plus-grid {
                display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
                padding: 16px 14px; max-height: 190px; overflow-y: auto; justify-items: center;
            }
            .wechat-plus-item {
                display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer;
            }
            .wechat-plus-icon-box {
                width: 52px; height: 52px; border-radius: 12px; background: #ffffff;
                border: 0.5px solid #dcdcdc; display: flex; align-items: center; justify-content: center;
            }
            .wechat-plus-item:active .wechat-plus-icon-box { background: #eaeaea; }
            .wechat-plus-label { font-size: 11px; color: #555555; }

            /* 微信拟真语音条 */
            .wechat-voice-bubble {
                display: flex; align-items: center; gap: 8px; min-height: 38px;
                padding: 8px 12px; border-radius: 5px; cursor: pointer; user-select: none;
                transition: background 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .wechat-voice-wave { display: flex; align-items: center; gap: 2px; height: 16px; }
            .wechat-voice-bar { width: 2.5px; background: currentColor; border-radius: 2px; }
            .wechat-voice-bar:nth-child(1) { height: 6px; }
            .wechat-voice-bar:nth-child(2) { height: 12px; }
            .wechat-voice-bar:nth-child(3) { height: 16px; }

            /* 微信朋友圈拍立得质感画片卡片 */
            .wechat-photo-card {
                background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;
                padding: 10px; max-width: 240px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                cursor: pointer; transition: transform 0.15s ease;
            }
            .wechat-photo-card:active { transform: scale(0.98); }
            .wechat-photo-art-box {
                width: 100%; height: 130px; border-radius: 6px;
                background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #0f172a 100%);
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                padding: 12px; box-sizing: border-box; color: #f8fafc; text-align: center;
                position: relative; overflow: hidden; box-shadow: inset 0 0 20px rgba(0,0,0,0.3);
            }
            .wechat-photo-art-badge {
                position: absolute; top: 6px; left: 6px; background: rgba(7, 193, 96, 0.85);
                color: #ffffff; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px;
            }
            .wechat-photo-art-text {
                font-size: 13px; line-height: 1.45; font-weight: 500; text-shadow: 0 1px 3px rgba(0,0,0,0.6);
                overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;
            }

            /* 微信朋友圈转发卡片与名片卡片 */
            .wechat-share-moment-card {
                background: #ffffff; border: 1px solid #e0e0e0; border-radius: 6px;
                padding: 10px 12px; width: 220px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                cursor: pointer; user-select: none;
            }
            .wechat-share-moment-card:active { background: #f7f7f7; }
            .wechat-contact-card {
                background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;
                padding: 10px 12px; width: 220px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                cursor: pointer; user-select: none;
            }
            .wechat-contact-card:active { background: #f8fafc; }

            /* 微信聊天中的系统级提示条 */
            .wechat-sys-notice-pill {
                display: inline-flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.06);
                color: #666666; font-size: 11px; padding: 3px 10px; border-radius: 12px;
                margin: 6px auto; max-width: 90%; cursor: pointer; text-align: center;
            }
            .wechat-sys-notice-pill span.link { color: #576b95; font-weight: 600; }

            /* 微信引用条 */
            .wechat-quote-bar {
                display: flex; align-items: center; justify-content: space-between;
                background: #e9e9e9; padding: 5px 10px; font-size: 11.5px; color: #666;
                border-left: 3px solid #07c160; border-top: 0.5px solid #dcdcdc;
            }
            .wechat-quote-inline {
                background: rgba(0, 0, 0, 0.05); border-left: 2px solid #07c160;
                padding: 3px 6px; border-radius: 2px; font-size: 11.5px; color: #666;
                margin-bottom: 5px; line-height: 1.35; word-break: break-word;
            }

            .moment-mode-tab-btn {
                flex: 1; padding: 6px 4px; border: none; background: #f0f0f0; color: #555;
                font-size: 11.5px; font-weight: 500; border-radius: 4px; cursor: pointer;
            }
            .moment-mode-tab-btn.active {
                background: #07c160 !important; color: #ffffff !important; font-weight: 600;
            }
        `;
    }
    ensureChatShellStyles();

    const originalClosePhoneApp = window.closePhoneApp;
    window.closePhoneApp = function() {
        const modal = document.getElementById('appModal');
        if (modal) modal.classList.remove('wechat-seamless-shell');
        if (typeof originalClosePhoneApp === 'function') originalClosePhoneApp();
    };

    function openWechatCleanModal(title, innerContentHtml, onConfirm = null) {
        let mask = document.createElement('div');
        mask.className = 'wechat-clean-modal-mask';
        mask.innerHTML = `
            <div class="wechat-clean-modal-card">
                <div class="wechat-clean-modal-title">${escapeHtml(title)}</div>
                <div class="wechat-clean-modal-body">${innerContentHtml}</div>
                <div class="wechat-clean-modal-btns">
                    <button type="button" class="wechat-clean-btn-cancel" id="wcleanCancel">取消</button>
                    <button type="button" class="wechat-clean-btn-confirm" id="wcleanConfirm">确定</button>
                </div>
            </div>
        `;
        document.body.appendChild(mask);
        const close = () => { if (mask && mask.parentNode) mask.parentNode.removeChild(mask); };
        mask.querySelector('#wcleanCancel').onclick = close;
        mask.querySelector('#wcleanConfirm').onclick = () => {
            if (typeof onConfirm === 'function') {
                const ret = onConfirm(mask);
                if (ret !== false) close();
            } else {
                close();
            }
        };
    }
    window.openWechatCleanModal = openWechatCleanModal;

    function ensureNpcIntegrity() {
        if (!window.G) window.G = {};
        if (!window.G.npcs) window.G.npcs = {};
        if (!window.G.chatHistory) window.G.chatHistory = {};
        if (!window.G.groups) window.G.groups = {};
        if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
        if (!window.G.friendRequests) window.G.friendRequests = [];
        if (!window.G.groupInvites) window.G.groupInvites = [];
        if (!window.G.feed) window.G.feed = [];
        if (!window.G._behindScreenActive) window.G._behindScreenActive = {};
        if (!window.G._chatShowFullHistory) window.G._chatShowFullHistory = {};
        if (!window.G.stickerCategories) window.G.stickerCategories = ['猪猪'];
        if (!window.G.stickerLibrary) window.G.stickerLibrary = [];

        restoreCustomNpcsFromLocalBackup();
        restoreChatHistoryFromLocalBackup();
        restoreMomentsFeedFromLocalBackup();

        if (typeof window.restoreWechatProfileData === 'function') {
            window.restoreWechatProfileData();
        }

        for (const [id, npc] of Object.entries(window.G.npcs)) {
            if (!npc.id) npc.id = id;
            if (!npc.name) npc.name = id;
            if (npc.favor === undefined) npc.favor = 50;
            if (!npc.region) npc.region = (id.includes('dream') || id.includes('george')) ? '美国 - 东部' : '中国';
            if (!npc.relationshipStage) npc.relationshipStage = (npc.isDating ? 'dating' : 'friend');
            if (!npc.avatarUrl || npc.avatarUrl === 'assets/icons/chat.png') {
                npc.avatarUrl = getRandomAvatar();
            }
            if (!npc.ownerAccountId) npc.ownerAccountId = 'main';
        }
    }
    window.ensureNpcIntegrity = ensureNpcIntegrity;

    function getChatStorageKey(npcId, accId = null) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        return `${accId || curAcc.id || 'main'}_${npcId}`;
    }
    window.getChatStorageKey = getChatStorageKey;

    function getAccountChatHistory(npcId, accId = null) {
        if (!window.G.chatHistory) window.G.chatHistory = {};
        const key = getChatStorageKey(npcId, accId);
        if (!window.G.chatHistory[key]) window.G.chatHistory[key] = [];
        return window.G.chatHistory[key];
    }
    window.getAccountChatHistory = getAccountChatHistory;

    function pushChatMessageSafe(npcId, msgObj, accId = null) {
        if (!msgObj._id) msgObj._id = 'cmsg_' + Date.now() + '_' + (Math.floor(Math.random() * 8999) + 1000);
        if (!msgObj.timestamp) msgObj.timestamp = Date.now();
        getAccountChatHistory(npcId, accId).push(msgObj);
        syncChatHistoryToLocalBackup();
    }
    window.pushChatMessageSafe = pushChatMessageSafe;

    function isAccountBlockedByNpc(npcId, accId = null) {
        const curAcc = accId || ((typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo().id : 'main');
        const token = `${npcId}_${curAcc}`;
        if (curAcc === 'main' && Array.isArray(window.G.blockedNpcs) && window.G.blockedNpcs.includes(npcId)) return true;
        return (window.G.blockedRecords || []).includes(token);
    }
    window.isAccountBlockedByNpc = isAccountBlockedByNpc;

    function renderAvatarBadge(obj, size = 46) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { avatar: 'assets/icons/chat.png' };
        let url = (obj && obj.isPlayer) ? curAcc.avatar : (obj?.avatarUrl || getRandomAvatar());
        if (!url) url = 'assets/icons/chat.png';
        return `<div style="width:${size}px;height:${size}px;border-radius:6px;overflow:hidden;background:#e9e9e9;flex-shrink:0;box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.06);">
            <img src="${url}" draggable="false" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.onerror=null;this.src='assets/icons/chat.png';" />
        </div>`;
    }
    window.renderAvatarBadge = renderAvatarBadge;

    function calculateHistoryTokens(history) {
        if (!Array.isArray(history) || history.length === 0) return 0;
        let charCount = 0;
        for (const m of history) {
            charCount += (m.text ? m.text.length : 0);
            if (m.originalText) charCount += m.originalText.length;
            if (m.sharedMoment?.body) charCount += m.sharedMoment.body.length;
        }
        return Math.round(charCount * 1.3 + 120);
    }
    window.calculateHistoryTokens = calculateHistoryTokens;

    function formatTokenString(tokens) {
        if (tokens >= 1000) return (tokens / 1000).toFixed(1) + 'k';
        return tokens.toString();
    }
    window.formatTokenString = formatTokenString;

    /**
     * 解析 AI 回复中的表情包/语音/双语/发动态实体及动态提醒
     */
    function parseAIReplyEntities(rawText, npcName) {
        if (!rawText) return [];
        let clean = (typeof stripThought === 'function') ? stripThought(rawText).trim() : rawText.trim();
        if (!clean) return [];

        const entities = [];

        // 提取偶发动态标签 [POST_MOMENT text="..." img_desc="..."]
        const postMomentRegex = /\[POST_MOMENT\s+text="([^"]+)"(?:\s+img_desc="([^"]*)")?\]/i;
        const pMatch = postMomentRegex.exec(clean);
        if (pMatch) {
            const momentBody = (pMatch[1] || '').trim();
            const momentImgDesc = (pMatch[2] || '').trim();
            if (momentBody) {
                if (!window.G.feed) window.G.feed = [];
                const matchedNpc = Object.values(window.G.npcs || {}).find(n => n.name === npcName);
                const momentId = Date.now() + Math.floor(Math.random() * 899 + 100);
                const newMoment = {
                    id: momentId,
                    author: npcName,
                    avatar: matchedNpc?.avatarUrl || getRandomAvatar(),
                    isPlayer: false,
                    body: momentBody,
                    imageMode: momentImgDesc ? 'photo_art' : 'none',
                    image: null,
                    imageDesc: momentImgDesc || null,
                    time: '刚刚',
                    liked: false,
                    likes: 0,
                    comments: []
                };
                window.G.feed.unshift(newMoment);
                syncMomentsFeedToLocalBackup();

                entities.push({
                    type: 'moment_notice',
                    momentId: momentId,
                    author: npcName,
                    text: `对方发表了一条朋友圈动态`
                });
            }
            clean = clean.replace(postMomentRegex, '').trim();
        }

        // 1. 拟真语音 [VOICE seconds="..." audio_bg="..."]正文[/VOICE]
        const voiceRegex = /\[VOICE(?:\s+seconds="?(\d+)"?)?(?:\s+audio_bg="?([^"]*)"?)?\]([\s\S]*?)\[\/VOICE\]/gi;
        let vMatch;
        while ((vMatch = voiceRegex.exec(clean)) !== null) {
            const sec = parseInt(vMatch[1]) || Math.min(60, Math.max(2, Math.round((vMatch[3] || '').length * 0.45)));
            entities.push({
                type: 'voice',
                seconds: sec,
                audioBg: (vMatch[2] || '').trim(),
                text: (vMatch[3] || '').trim()
            });
        }

        // 2. 真实表情包调用标签 [STICKER category="..." desc="..."]
        const stickerRegex = /\[STICKER(?:\s+category="([^"]*)")?(?:\s+desc="([^"]*)")?\]/gi;
        let sMatch;
        while ((sMatch = stickerRegex.exec(clean)) !== null) {
            const cat = (sMatch[1] || '猪猪').trim();
            const desc = (sMatch[2] || '开心').trim();
            entities.push({
                type: 'sticker_entity',
                category: cat,
                desc: desc
            });
        }

        // 3. 标准消息或双语 [MSG original="..."]正文[/MSG]
        const msgRegex = /\[MSG(?:\s+original="([^"]+)")?\]([\s\S]*?)\[\/MSG\]/gi;
        let mMatch;
        while ((mMatch = msgRegex.exec(clean)) !== null) {
            const original = (mMatch[1] || '').trim();
            const text = (mMatch[2] || '').trim();
            if (text || original) {
                entities.push({
                    type: 'text',
                    text: text || original,
                    originalText: original || null
                });
            }
        }

        if (entities.length > 0) return entities.slice(0, 5);

        const lines = clean.split(/\n+/).map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) {
            return lines.slice(0, 3).map(l => ({ type: 'text', text: l }));
        }

        return [{ type: 'text', text: clean }];
    }
    window.parseAIReplyEntities = parseAIReplyEntities;

    function resolveStickerImageUrl(category, desc) {
        const lib = window.G.stickerLibrary || [];
        const found = lib.find(s => s && (s.category === category || !category) && (s.desc === desc || (s.desc && s.desc.includes(desc))));
        if (found && found.url) return { url: found.url, desc: found.desc };

        const catFallback = lib.find(s => s && s.category === category);
        if (catFallback && catFallback.url) return { url: catFallback.url, desc: catFallback.desc };

        return null;
    }
    window.resolveStickerImageUrl = resolveStickerImageUrl;

    function showGeneratingBanner(targetName) {
        let el = document.getElementById('wechatGeneratingBanner');
        if (!el) {
            el = document.createElement('div');
            el.id = 'wechatGeneratingBanner';
            el.className = 'wechat-bg-generating-banner';
            document.body.appendChild(el);
        }
        el.innerHTML = `
            <div class="wechat-spin-ring"></div>
            <span>「${escapeHtml(targetName)}」正在输入中...</span>
        `;
    }
    window.showGeneratingBanner = showGeneratingBanner;

    function hideGeneratingBanner() {
        const el = document.getElementById('wechatGeneratingBanner');
        if (el) el.remove();
    }
    window.hideGeneratingBanner = hideGeneratingBanner;

    // ============================================================
    // 📇 酒馆（Tavern）规范角色卡 PNG 导出引擎
    // 特性：底图采用头像，将静态人设编码至 PNG tEXt 数据块，绝不含聊天记录与好感度
    // ============================================================
    function crc32(buf) {
        let table = window._crc32Table;
        if (!table) {
            table = new Uint32Array(256);
            for (let i = 0; i < 256; i++) {
                let c = i;
                for (let k = 0; k < 8; k++) {
                    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                }
                table[i] = c;
            }
            window._crc32Table = table;
        }
        let crc = 0 ^ (-1);
        for (let i = 0; i < buf.length; i++) {
            crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
        }
        return (crc ^ (-1)) >>> 0;
    }

    function createPngTextChunk(keyword, text) {
        const keyBytes = new TextEncoder().encode(keyword);
        const textBytes = new TextEncoder().encode(text);
        const dataLen = keyBytes.length + 1 + textBytes.length;
        const chunk = new Uint8Array(4 + 4 + dataLen + 4);

        const view = new DataView(chunk.buffer);
        view.setUint32(0, dataLen);
        chunk[4] = 0x74; chunk[5] = 0x45; chunk[6] = 0x58; chunk[7] = 0x74; // 'tEXt'

        let offset = 8;
        chunk.set(keyBytes, offset);
        offset += keyBytes.length;
        chunk[offset++] = 0; // null separator
        chunk.set(textBytes, offset);
        offset += textBytes.length;

        const crcData = chunk.subarray(4, 8 + dataLen);
        view.setUint32(offset, crc32(crcData));
        return chunk;
    }

    async function exportTavernCharacterPng(npc, customFilename = null) {
        if (!npc) return;

        // 严格过滤静态人设档案，绝不导出聊天记录与好感度
        const tavernData = {
            name: npc.name || 'NPC',
            description: npc.persona || '',
            personality: `常驻地区: ${npc.region || '中国'}；个性签名: ${npc.signature || ''}`,
            scenario: `MC生活与日常交流。当前备注: ${npc.remark || '无'}。`,
            first_mes: `你好，我是 ${npc.name}。`,
            mes_example: '',
            creator_notes: '由 MC YouTube 模拟器 6.0 导出',
            system_prompt: '',
            post_history_instructions: '',
            alternate_greetings: [],
            character_book: null,
            tags: ['Minecraft', 'MCYT', npc.region || 'MC玩家'],
            spec: 'chara_card_v2',
            spec_version: '2.0',
            data: {
                name: npc.name || 'NPC',
                description: npc.persona || '',
                personality: `地区: ${npc.region || '中国'}；签名: ${npc.signature || ''}`,
                scenario: `MC生活与日常交流。备注名: ${npc.remark || '无'}。`,
                first_mes: `你好，我是 ${npc.name}。`,
                mes_example: '',
                creator_notes: '由 MC YouTube 模拟器 6.0 导出',
                system_prompt: '',
                post_history_instructions: '',
                alternate_greetings: [],
                tags: ['Minecraft', 'MCYT']
            }
        };

        const jsonStr = JSON.stringify(tavernData);
        const base64Json = btoa(unescape(encodeURIComponent(jsonStr)));

        // 获取底图并转为 PNG ArrayBuffer
        const avatarUrl = npc.avatarUrl || getRandomAvatar();
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = avatarUrl;

        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => {
                img.src = 'assets/icons/chat.png';
                img.onload = resolve;
                img.onerror = reject;
            };
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 400;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const arrayBuf = await blob.arrayBuffer();
        const srcBytes = new Uint8Array(arrayBuf);

        // 寻找 IHDR 之后的位置注入 tEXt chunk
        let insertPos = 8;
        const view = new DataView(srcBytes.buffer);
        const ihdrLen = view.getUint32(8);
        insertPos = 8 + 4 + 4 + ihdrLen + 4; // 8 byte magic + 4 len + 4 type + data + 4 crc

        const textChunk = createPngTextChunk('chara', base64Json);

        const out = new Uint8Array(srcBytes.length + textChunk.length);
        out.set(srcBytes.subarray(0, insertPos), 0);
        out.set(textChunk, insertPos);
        out.set(srcBytes.subarray(insertPos), insertPos + textChunk.length);

        const outBlob = new Blob([out], { type: 'image/png' });
        const downloadUrl = URL.createObjectURL(outBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = (customFilename || `${npc.name || 'character'}_人设卡`).replace(/[\\/:*?"<>|]/g, '_') + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 2000);
    }
    window.exportTavernCharacterPng = exportTavernCharacterPng;

})();
