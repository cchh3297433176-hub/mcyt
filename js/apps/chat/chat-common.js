/**
 * js/apps/chat/chat-common.js
 * 💬 微信基础公共库：头像池加载 · 持久化双轨防丢备份（防空冲刷保护） · 微信通用样式注入 · 原生对话框/操作表 · Token监控池 · 
 *    🌟 表情包自注册插件引擎（window.registerStickerPack，支持各分组独立文件按需载入，彻底解耦零Token膨胀） · 
 *    AI实体解析器 · 酒馆 PNG 人设卡封装与导入解析引擎
 */

(function() {
    'use strict';

    const AVATAR_SUBDIR = 'assets/avatars/';
    const STICKER_SUBDIR = 'assets/stickers/';
    window._MCYT_AVATAR_SUBDIR = AVATAR_SUBDIR;
    window._MCYT_STICKER_SUBDIR = STICKER_SUBDIR;

    const CUSTOM_NPCS_BACKUP_KEY = 'mcyt_wechat_custom_npcs';
    const CHAT_HISTORY_BACKUP_KEY = 'mcyt_wechat_chathistory_v2';
    const TOKEN_HISTORY_STORAGE_KEY = 'mcyt_chat_token_history_v1';
    const MOMENTS_FEED_BACKUP_KEY = 'mcyt_wechat_feed_backup_v2';

    // 默认保底安全头像池
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

    // ============================================================
    // 🎭 表情包自注册驱动引擎：各分组只需放置独立 list.js 即可无感挂载
    // ============================================================
    window.registerStickerPack = function(categoryName, stickerList) {
        if (!categoryName || !Array.isArray(stickerList)) return;
        if (!window.G) window.G = {};
        if (!Array.isArray(window.G.stickerCategories)) window.G.stickerCategories = ['猪猪'];
        if (!Array.isArray(window.G.stickerLibrary)) window.G.stickerLibrary = [];

        // 自动注入分组标签
        if (!window.G.stickerCategories.includes(categoryName)) {
            window.G.stickerCategories.unshift(categoryName);
        }

        const existingUrls = new Set(
            window.G.stickerLibrary
                .filter(s => s && s.category === categoryName)
                .map(s => s.url)
        );

        stickerList.forEach(item => {
            if (item && item.url && !existingUrls.has(item.url)) {
                window.G.stickerLibrary.push({
                    category: categoryName,
                    desc: item.desc || categoryName,
                    url: item.url,
                    localUrl: item.local || null
                });
                existingUrls.add(item.url);
            }
        });

        if (!window.G.activeStickerCategory) {
            window.G.activeStickerCategory = categoryName;
        }
    };

    // 动态扫描并加载子目录中的表情包分组（根据 assets/stickers/index.json 自动引入）
    function loadExternalStickerPacks() {
        // 先吸收先于本文件加载的挂起数据
        if (window._MCYT_PENDING_STICKERS && typeof window._MCYT_PENDING_STICKERS === 'object') {
            for (const [cat, list] of Object.entries(window._MCYT_PENDING_STICKERS)) {
                window.registerStickerPack(cat, list);
            }
            window._MCYT_PENDING_STICKERS = {};
        }

        // 读取表情目录索引并加载各自分组的 list.js
        fetch(STICKER_SUBDIR + 'index.json?t=' + Date.now())
            .then(res => res.json())
            .then(packNames => {
                if (Array.isArray(packNames)) {
                    packNames.forEach(name => {
                        const script = document.createElement('script');
                        script.src = `${STICKER_SUBDIR}${encodeURIComponent(name)}/list.js?t=${Date.now()}`;
                        document.head.appendChild(script);
                    });
                }
            })
            .catch(() => {
                // 兜底尝试加载默认的常见分组
                ['小狗', '抽象'].forEach(name => {
                    const s = document.createElement('script');
                    s.src = `${STICKER_SUBDIR}${encodeURIComponent(name)}/list.js`;
                    document.head.appendChild(s);
                });
            });
    }
    loadExternalStickerPacks();

    function ensureStickersLoaded() {
        if (!window.G) window.G = {};
        if (!Array.isArray(window.G.stickerCategories)) window.G.stickerCategories = ['小狗', '抽象', '猪猪'];
        if (!Array.isArray(window.G.stickerLibrary)) window.G.stickerLibrary = [];
        if (!window.G.activeStickerCategory) window.G.activeStickerCategory = window.G.stickerCategories[0] || '小狗';
    }
    window.ensureStickersLoaded = ensureStickersLoaded;

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

    // 💾 硬核三轨防丢保护引擎（增设 Quota 防爆降级与防空覆盖回写门禁）
    function syncCustomNpcsToLocalBackup() {
        try {
            if (!window.G || !window.G.npcs || typeof window.G.npcs !== 'object') return;
            const keys = Object.keys(window.G.npcs);
            
            if (keys.length === 0) {
                const existing = localStorage.getItem(CUSTOM_NPCS_BACKUP_KEY);
                if (existing && existing.length > 10) {
                    console.warn('检测到当前角色内存为空，阻止空冲刷覆盖联系人备份');
                    return;
                }
            }

            const customMap = {};
            for (const [id, npc] of Object.entries(window.G.npcs)) {
                if (npc) {
                    customMap[id] = npc;
                }
            }
            try {
                localStorage.setItem(CUSTOM_NPCS_BACKUP_KEY, JSON.stringify(customMap));
            } catch (quotaErr) {
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
            if (!window.G || !window.G.chatHistory || typeof window.G.chatHistory !== 'object') return;
            const keys = Object.keys(window.G.chatHistory);
            
            if (keys.length === 0) {
                const existing = localStorage.getItem(CHAT_HISTORY_BACKUP_KEY);
                if (existing && existing.length > 10) {
                    console.warn('检测到当前聊天记录内存为空，阻止空冲刷覆盖记录备份');
                    return;
                }
            }

            try {
                localStorage.setItem(CHAT_HISTORY_BACKUP_KEY, JSON.stringify(window.G.chatHistory));
            } catch (quotaErr) {
                console.warn('聊天记录体积过大，尝试做轻量保护保存');
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

    // 朋友圈动态防丢独立持久化槽
    function syncMomentsFeedToLocalBackup() {
        try {
            if (!window.G || !Array.isArray(window.G.feed)) return;

            if (window.G.feed.length === 0) {
                const existing = localStorage.getItem(MOMENTS_FEED_BACKUP_KEY);
                if (existing && existing.length > 10) {
                    console.warn('检测到当前动态内存为空，阻止空冲刷覆盖朋友圈备份');
                    return;
                }
            }

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
            if (Array.isArray(savedFeed) && savedFeed.length > 0) {
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

            .wechat-sys-notice-pill {
                display: inline-flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.06);
                color: #666666; font-size: 11px; padding: 3px 10px; border-radius: 12px;
                margin: 6px auto; max-width: 90%; cursor: pointer; text-align: center;
            }
            .wechat-sys-notice-pill span.link { color: #576b95; font-weight: 600; }

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

            .chat-swipe-item {
                position: relative;
                width: 100%;
                overflow: hidden;
                background: #fff;
                user-select: none;
            }
            .chat-swipe-content {
                position: relative;
                z-index: 2;
                background: #fff;
                transition: transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 14px;
                border-bottom: 0.5px solid #ededed;
                cursor: pointer;
            }
            .chat-swipe-actions {
                position: absolute;
                top: 0;
                right: 0;
                bottom: 0;
                z-index: 1;
                display: flex;
                height: 100%;
            }
            .chat-swipe-delete-btn {
                background: #fa5151;
                color: #ffffff;
                width: 72px;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14.5px;
                font-weight: 500;
                cursor: pointer;
                border: none;
                padding: 0;
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
        
        ensureStickersLoaded();

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

    function parseAIReplyEntities(rawText, npcName) {
        if (!rawText) return [];
        let clean = (typeof stripThought === 'function') ? stripThought(rawText).trim() : rawText.trim();
        if (!clean) return [];

        const entities = [];

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

        const tokenRegex = /\[VOICE(?:\s+seconds=["']?(\d+)["']?)?(?:\s+audio_bg=["']?([^"']*)["']?)?\]([\s\S]*?)\[\/VOICE\]|\[STICKER(?:\s+category=["']?([^"'\]\s]*)["']?)?(?:\s+desc=["']?([^"'\]\s]*)["']?)?\s*\]|\[MSG(?:\s+original=(?:"([\s\S]*?)"|'([\s\S]*?)'|([^\]\s]+)))?\]([\s\S]*?)\[\/MSG\]/gi;

        let match;
        while ((match = tokenRegex.exec(clean)) !== null) {
            if (match[0].startsWith('[VOICE')) {
                const sec = parseInt(match[1]) || Math.min(60, Math.max(2, Math.round((match[3] || '').length * 0.45)));
                entities.push({
                    type: 'voice',
                    seconds: sec,
                    audioBg: (match[2] || '').trim(),
                    text: (match[3] || '').trim()
                });
            }
            else if (match[0].startsWith('[STICKER')) {
                const cat = (match[4] || '小狗').trim();
                const desc = (match[5] || '开心').trim();
                entities.push({
                    type: 'sticker_entity',
                    category: cat,
                    desc: desc
                });
            }
            else if (match[0].startsWith('[MSG')) {
                const original = (match[6] || match[7] || match[8] || '').trim();
                let innerText = (match[9] || '').trim();

                const nestedStickerRegex = /\[STICKER(?:\s+category=["']?([^"'\]\s]*)["']?)?(?:\s+desc=["']?([^"'\]\s]*)["']?)?\s*\]/gi;
                if (nestedStickerRegex.test(innerText)) {
                    let lastIdx = 0;
                    nestedStickerRegex.lastIndex = 0;
                    let stMatch;
                    while ((stMatch = nestedStickerRegex.exec(innerText)) !== null) {
                        const beforeText = innerText.substring(lastIdx, stMatch.index).trim();
                        if (beforeText) {
                            entities.push({
                                type: 'text',
                                text: beforeText,
                                originalText: original || null
                            });
                        }
                        entities.push({
                            type: 'sticker_entity',
                            category: (stMatch[1] || '小狗').trim(),
                            desc: (stMatch[2] || '开心').trim()
                        });
                        lastIdx = nestedStickerRegex.lastIndex;
                    }
                    const afterText = innerText.substring(lastIdx).trim();
                    if (afterText) {
                        entities.push({
                            type: 'text',
                            text: afterText,
                            originalText: null
                        });
                    }
                } else {
                    innerText = innerText.replace(/\[STICKER[^\]]*\]/gi, '').trim();
                    if (innerText || original) {
                        entities.push({
                            type: 'text',
                            text: innerText || original,
                            originalText: original || null
                        });
                    }
                }
            }
        }

        if (entities.length > 0) {
            return entities.slice(0, 8);
        }

        let sanitized = clean;
        const msgLooseRegex = /\[MSG(?:\s+original=(?:"([\s\S]*?)"|'([\s\S]*?)'|([^\]\s]+)))?\]([\s\S]*?)(?:\[\/MSG\]|$)/gi;
        let looseMatch;
        while ((looseMatch = msgLooseRegex.exec(clean)) !== null) {
            const orig = (looseMatch[1] || looseMatch[2] || looseMatch[3] || '').trim();
            const body = (looseMatch[4] || '').replace(/\[\/MSG\]/gi, '').trim();
            if (body || orig) {
                entities.push({
                    type: 'text',
                    text: body || orig,
                    originalText: orig || null
                });
            }
        }

        if (entities.length > 0) {
            return entities.slice(0, 8);
        }

        const nakedStickerRegex = /\[STICKER(?:\s+category=["']?([^"'\]\s]*)["']?)?(?:\s+desc=["']?([^"'\]\s]*)["']?)?\s*\]/gi;
        if (nakedStickerRegex.test(sanitized)) {
            let lastIdx = 0;
            nakedStickerRegex.lastIndex = 0;
            let nMatch;
            while ((nMatch = nakedStickerRegex.exec(sanitized)) !== null) {
                const textPart = sanitized.substring(lastIdx, nMatch.index).trim();
                if (textPart) {
                    entities.push({ type: 'text', text: textPart });
                }
                entities.push({
                    type: 'sticker_entity',
                    category: (nMatch[1] || '小狗').trim(),
                    desc: (nMatch[2] || '开心').trim()
                });
                lastIdx = nakedStickerRegex.lastIndex;
            }
            const tailPart = sanitized.substring(lastIdx).trim();
            if (tailPart) {
                entities.push({ type: 'text', text: tailPart });
            }
            if (entities.length > 0) return entities.slice(0, 8);
        }

        const pureText = sanitized
            .replace(/\[\/?(?:MSG|VOICE|STICKER|FAVOR|BEHIND_SCREEN)[^\]]*\]/gi, '')
            .trim();

        const lines = pureText.split(/\n+/).map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) {
            return lines.slice(0, 5).map(l => ({ type: 'text', text: l }));
        }

        return [{ type: 'text', text: pureText || '在呢' }];
    }
    window.parseAIReplyEntities = parseAIReplyEntities;

    function resolveStickerImageUrl(category, desc) {
        const lib = window.G.stickerLibrary || [];
        const found = lib.find(s => s && (s.category === category || !category) && (s.desc === desc || (s.desc && s.desc.includes(desc))));
        if (found && (found.url || found.localUrl)) {
            return { url: found.localUrl || found.url, desc: found.desc };
        }

        const catFallback = lib.find(s => s && s.category === category);
        if (catFallback && (catFallback.url || catFallback.localUrl)) {
            return { url: catFallback.localUrl || catFallback.url, desc: catFallback.desc };
        }

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

    function crc32(buf) {
        let table = window._crc32Table;
        if (!table) {
            table = new Uint8Array(256);
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
        chunk[4] = 0x74; chunk[5] = 0x45; chunk[6] = 0x58; chunk[7] = 0x74;

        let offset = 8;
        chunk.set(keyBytes, offset);
        offset += keyBytes.length;
        chunk[offset++] = 0;
        chunk.set(textBytes, offset);
        offset += textBytes.length;

        const crcData = chunk.subarray(4, 8 + dataLen);
        view.setUint32(offset, crc32(crcData));
        return chunk;
    }

    function showExportedCardModal(dataUrl, filename) {
        let mask = document.createElement('div');
        mask.className = 'wechat-clean-modal-mask';
        mask.style.zIndex = '10006';
        mask.innerHTML = `
            <div class="wechat-clean-modal-card" style="max-width:300px;text-align:center;padding:18px 16px;">
                <div class="wechat-clean-modal-title" style="margin-bottom:8px;">角色卡已生成</div>
                <div style="font-size:12px;color:#888;margin-bottom:12px;line-height:1.4;">
                    若未自动下载，可长按下方图片保存至相册
                </div>
                <div style="width:160px;height:160px;margin:0 auto 14px;border-radius:10px;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.12);background:#f2f2f2;border:1px solid #e8e8e8;">
                    <img src="${dataUrl}" alt="角色卡" style="width:100%;height:100%;object-fit:cover;display:block;" />
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <a href="${dataUrl}" download="${escapeHtml(filename)}" id="btnForceDownloadLink" style="display:block;text-decoration:none;border:none;background:#07c160;color:#fff;padding:8px 0;border-radius:6px;font-size:13.5px;font-weight:600;text-align:center;">
                        保存到设备
                    </a>
                    <button type="button" id="btnCloseCardExportModal" style="border:none;background:#f2f2f2;color:#555;padding:7px 0;border-radius:6px;font-size:13px;cursor:pointer;">
                        完成
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(mask);
        const close = () => { if (mask && mask.parentNode) mask.parentNode.removeChild(mask); };
        mask.querySelector('#btnCloseCardExportModal').onclick = close;
        mask.querySelector('#btnForceDownloadLink').onclick = () => {
            setTimeout(close, 400);
        };
    }

    async function exportTavernCharacterPng(npc, customFilename = null) {
        if (!npc) return;

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

        const avatarUrl = npc.avatarUrl || getRandomAvatar();
        const img = new Image();
        if (!avatarUrl.startsWith('data:')) {
            img.crossOrigin = 'anonymous';
        }
        img.src = avatarUrl;

        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = () => {
                img.removeAttribute('crossOrigin');
                img.src = 'assets/icons/chat.png';
                img.onload = resolve;
                img.onerror = resolve;
            };
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 400;
        const ctx = canvas.getContext('2d');
        
        let arrayBuf;
        try {
            ctx.drawImage(img, 0, 0);
            const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
            if (blob) {
                arrayBuf = await blob.arrayBuffer();
            }
        } catch (canvasErr) {
            console.warn('Canvas 导出受阻，采用纯净离线头像重绘:', canvasErr);
        }

        if (!arrayBuf) {
            const fallbackCanvas = document.createElement('canvas');
            fallbackCanvas.width = 400;
            fallbackCanvas.height = 400;
            const fCtx = fallbackCanvas.getContext('2d');
            fCtx.fillStyle = '#07c160';
            fCtx.fillRect(0, 0, 400, 400);
            fCtx.fillStyle = '#ffffff';
            fCtx.font = 'bold 64px sans-serif';
            fCtx.textAlign = 'center';
            fCtx.textBaseline = 'middle';
            fCtx.fillText((npc.name || 'MC').substring(0, 4), 200, 200);
            const fBlob = await new Promise(res => fallbackCanvas.toBlob(res, 'image/png'));
            arrayBuf = await fBlob.arrayBuffer();
        }

        const srcBytes = new Uint8Array(arrayBuf);

        let insertPos = 8;
        const view = new DataView(srcBytes.buffer);
        const ihdrLen = view.getUint32(8);
        insertPos = 8 + 4 + 4 + ihdrLen + 4;

        const textChunk = createPngTextChunk('chara', base64Json);

        const out = new Uint8Array(srcBytes.length + textChunk.length);
        out.set(srcBytes.subarray(0, insertPos), 0);
        out.set(textChunk, insertPos);
        out.set(srcBytes.subarray(insertPos), insertPos + textChunk.length);

        const outBlob = new Blob([out], { type: 'image/png' });
        
        let baseName = (customFilename && customFilename.trim()) ? customFilename.trim() : `${npc.name || 'character'}_人设卡`;
        if (!baseName.toLowerCase().endsWith('.png')) {
            baseName += '.png';
        }
        const finalFilename = baseName.replace(/[\\/:*?"<>|]/g, '_');

        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result;

            try {
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = finalFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } catch (_) {}

            showExportedCardModal(dataUrl, finalFilename);
        };
        reader.readAsDataURL(outBlob);
    }
    window.exportTavernCharacterPng = exportTavernCharacterPng;

    function parsePngTextChunks(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        if (view.getUint32(0) !== 0x89504E47 || view.getUint32(4) !== 0x0D0A1A0A) {
            return null;
        }

        let offset = 8;
        const chunks = {};

        while (offset < arrayBuffer.byteLength) {
            if (offset + 8 > arrayBuffer.byteLength) break;
            const length = view.getUint32(offset);
            const typeCode = [
                String.fromCharCode(view.getUint8(offset + 4)),
                String.fromCharCode(view.getUint8(offset + 5)),
                String.fromCharCode(view.getUint8(offset + 6)),
                String.fromCharCode(view.getUint8(offset + 7))
            ].join('');

            const chunkDataOffset = offset + 8;
            if (chunkDataOffset + length > arrayBuffer.byteLength) break;

            if (typeCode === 'tEXt') {
                const dataBytes = new Uint8Array(arrayBuffer, chunkDataOffset, length);
                let nullIdx = -1;
                for (let i = 0; i < dataBytes.length; i++) {
                    if (dataBytes[i] === 0) {
                        nullIdx = i;
                        break;
                    }
                }
                if (nullIdx !== -1) {
                    const key = new TextDecoder('latin1').decode(dataBytes.subarray(0, nullIdx));
                    const val = new TextDecoder('utf-8').decode(dataBytes.subarray(nullIdx + 1));
                    chunks[key] = val;
                }
            }

            offset += 4 + 4 + length + 4;
        }
        return chunks;
    }

    async function parseTavernCardFromFile(file) {
        if (!file) return null;
        const fileName = file.name || '';
        const isPng = file.type === 'image/png' || fileName.toLowerCase().endsWith('.png');
        const isJson = file.type === 'application/json' || fileName.toLowerCase().endsWith('.json');

        if (isJson) {
            const text = await file.text();
            let parsed = null;
            try {
                parsed = JSON.parse(text);
            } catch (_) {
                throw new Error('JSON 文件格式无效');
            }
            return extractTavernCardProfile(parsed, null);
        }

        if (isPng) {
            const buf = await file.arrayBuffer();
            const chunks = parsePngTextChunks(buf);
            if (!chunks) {
                throw new Error('不是标准的 PNG 格式图片');
            }

            let rawDataStr = chunks['chara'] || chunks['ccv3'];
            if (!rawDataStr) {
                throw new Error('未在图片中检测到酒馆角色卡数据');
            }

            let jsonStr = '';
            try {
                jsonStr = decodeURIComponent(escape(atob(rawDataStr)));
            } catch (_) {
                try {
                    jsonStr = atob(rawDataStr);
                } catch (_) {
                    jsonStr = rawDataStr;
                }
            }

            let parsed = null;
            try {
                parsed = JSON.parse(jsonStr);
            } catch (_) {
                throw new Error('角色卡数据解析失败');
            }

            const avatarDataUrl = await new Promise((res) => {
                const r = new FileReader();
                r.onload = () => res(r.result);
                r.onerror = () => res(null);
                r.readAsDataURL(file);
            });

            return extractTavernCardProfile(parsed, avatarDataUrl);
        }

        throw new Error('请选择 .png 角色卡或 .json 文件');
    }
    window.parseTavernCardFromFile = parseTavernCardFromFile;

    function extractTavernCardProfile(dataObj, avatarUrl = null) {
        if (!dataObj || typeof dataObj !== 'object') return null;

        const data = dataObj.data || dataObj;
        const name = (data.name || dataObj.name || '新角色').trim();
        const persona = (data.description || dataObj.description || data.persona || dataObj.persona || '').trim();
        const personality = data.personality || dataObj.personality || '';

        let region = '中国';
        if (personality.includes('美国 - 东部') || personality.includes('美国东部')) region = '美国 - 东部';
        else if (personality.includes('美国 - 西部') || personality.includes('美国西部')) region = '美国 - 西部';
        else if (personality.includes('英国')) region = '英国';
        else if (personality.includes('日本')) region = '日本';
        else if (personality.includes('韩国')) region = '韩国';
        else if (personality.includes('加拿大')) region = '加拿大';
        else if (personality.includes('澳大利亚')) region = '澳大利亚';
        else if (personality.includes('德国')) region = '德国';
        else if (personality.includes('法国')) region = '法国';

        let signature = '';
        const sigMatch = personality.match(/个性签名[:：\s]*([^；;\n]+)/i) || personality.match(/签名[:：\s]*([^；;\n]+)/i);
        if (sigMatch && sigMatch[1]) {
            signature = sigMatch[1].trim();
        }

        return {
            name: name,
            persona: persona || 'MC同伴玩家。',
            region: region,
            signature: signature,
            avatarUrl: avatarUrl || (typeof getRandomAvatar === 'function' ? getRandomAvatar() : 'assets/icons/chat.png')
        };
    }

})();
