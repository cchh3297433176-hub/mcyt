/**
 * js/apps/chat/chat-app.js
 * 💬 微信独立主应用（大号/小号好友绝对物理隔离 · 真机无缝全屏 · 仿微信简约质感 · 动态Token统计 · 完善表情包与发图功能）
 */

(function() {
    'use strict';

    // 预留头像库专属子目录路径
    const AVATAR_SUBDIR = 'assets/avatars/';
    window._MCYT_AVATAR_SUBDIR = AVATAR_SUBDIR;

    // 自建联系人与聊天记录独立持久化槽（防切后台杀进程丢失）
    const CUSTOM_NPCS_BACKUP_KEY = 'mcyt_wechat_custom_npcs';
    const CHAT_HISTORY_BACKUP_KEY = 'mcyt_wechat_chathistory_v2';

    // 动态头像池
    window._MCYT_AVATARS_POOL = [];
    async function initAvatarPool() {
        try {
            const resp = await fetch(AVATAR_SUBDIR + 'list.json');
            if (resp.ok) {
                const list = await resp.json();
                if (Array.isArray(list) && list.length > 0) {
                    window._MCYT_AVATARS_POOL = list;
                    return;
                }
            }
        } catch (_) {}
        if (!window._MCYT_AVATARS_POOL || window._MCYT_AVATARS_POOL.length === 0) {
            window._MCYT_AVATARS_POOL = ['1.png', '2.png', '3.png', '4.png', '5.png', '6.png', '7.png', '8.png'];
        }
    }
    initAvatarPool();

    function getRandomAvatar() {
        const pool = window._MCYT_AVATARS_POOL;
        if (Array.isArray(pool) && pool.length > 0) {
            const picked = pool[Math.floor(Math.random() * pool.length)];
            if (picked.startsWith('http') || picked.startsWith('data:') || picked.startsWith('assets/')) {
                return picked;
            }
            return `${AVATAR_SUBDIR}${picked}`;
        }
        return 'assets/icons/chat.png';
    }
    window.getRandomAvatar = getRandomAvatar;

    let _activeBottomTab = 'chats';
    let _stickerDrawerOpen = false;
    let _plusDrawerOpen = false;

    // 💾 独立双轨持久化引擎：自建联系人 + 聊天记录（防杀后台丢失核心机制）
    function syncCustomNpcsToLocalBackup() {
        try {
            if (!window.G || !window.G.npcs) return;
            const customMap = {};
            for (const [id, npc] of Object.entries(window.G.npcs)) {
                if (npc && (npc.isCustom || id.startsWith('custom_') || id.startsWith('npc_'))) {
                    customMap[id] = npc;
                }
            }
            localStorage.setItem(CUSTOM_NPCS_BACKUP_KEY, JSON.stringify(customMap));
        } catch (e) {
            console.error('备份自建联系人失败:', e);
        }
    }

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
                        if (!window.G.npcs[id].ownerAccountId && npc.ownerAccountId) {
                            window.G.npcs[id].ownerAccountId = npc.ownerAccountId;
                        }
                        if (!window.G.npcs[id].avatarUrl && npc.avatarUrl) {
                            window.G.npcs[id].avatarUrl = npc.avatarUrl;
                        }
                    }
                }
            }
        } catch (e) {
            console.error('恢复自建联系人失败:', e);
        }
    }

    function syncChatHistoryToLocalBackup() {
        try {
            if (window.G && window.G.chatHistory) {
                localStorage.setItem(CHAT_HISTORY_BACKUP_KEY, JSON.stringify(window.G.chatHistory));
            }
        } catch (e) {
            console.error('备份聊天记录失败:', e);
        }
    }

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

    // 监听页面切入后台及关闭，即时落盘
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            syncChatHistoryToLocalBackup();
            syncCustomNpcsToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        }
    });
    window.addEventListener('beforeunload', () => {
        syncChatHistoryToLocalBackup();
        syncCustomNpcsToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
    });

    // 微信简约风格全屏外壳样式
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
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                background: #ededed !important;
                z-index: 1000 !important;
                overflow: hidden !important;
            }
            .app-modal-layer.wechat-seamless-shell .app-modal-head,
            .app-modal-layer.wechat-seamless-shell .app-modal-foot {
                display: none !important;
            }
            .app-modal-layer.wechat-seamless-shell .app-modal-body {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                height: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                background: #ededed !important;
                overflow: hidden !important;
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
            /* 微信简约操作气泡弹窗 */
            .wechat-action-sheet-mask {
                position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 9999;
                display: flex; align-items: flex-end; justify-content: center;
            }
            .wechat-action-sheet-box {
                background: #f7f7f7; width: 100%; max-width: 412px; border-radius: 12px 12px 0 0;
                overflow: hidden; padding-bottom: env(safe-area-inset-bottom, 10px);
                animation: wechatSlideUp 0.2s cubic-bezier(0.2, 0.9, 0.3, 1);
            }
            @keyframes wechatSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            .wechat-action-item {
                background: #ffffff; padding: 13px; text-align: center; font-size: 15px; color: #181818;
                border-bottom: 0.5px solid #f0f0f0; cursor: pointer; user-select: none;
            }
            .wechat-action-item:active { background: #ececec; }
            .wechat-action-item.danger { color: #fa5151; }
            .wechat-action-cancel {
                background: #ffffff; padding: 13px; text-align: center; font-size: 15px; color: #666;
                margin-top: 6px; cursor: pointer; user-select: none;
            }
            .wechat-action-cancel:active { background: #ececec; }
            /* 居中表情包抽屉 */
            .wechat-sticker-grid {
                display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
                padding: 10px 12px; max-height: 180px; overflow-y: auto; justify-items: center; align-items: center;
            }
            .wechat-sticker-card {
                width: 68px; height: 68px; border-radius: 8px; background: #ffffff;
                display: flex; align-items: center; justify-content: center; cursor: pointer;
                overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            }
            .wechat-sticker-card:active { transform: scale(0.94); }
            /* 扩展功能抽屉面板 */
            .wechat-plus-grid {
                display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
                padding: 16px 14px; max-height: 190px; overflow-y: auto; justify-items: center;
            }
            .wechat-plus-item {
                display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer;
            }
            .wechat-plus-icon-box {
                width: 54px; height: 54px; border-radius: 12px; background: #ffffff;
                border: 0.5px solid #dcdcdc; display: flex; align-items: center; justify-content: center;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            }
            .wechat-plus-item:active .wechat-plus-icon-box { background: #eaeaea; }
            .wechat-plus-label { font-size: 11px; color: #555555; }
        `;
    }
    ensureChatShellStyles();

    const originalClosePhoneApp = window.closePhoneApp;
    window.closePhoneApp = function() {
        const modal = document.getElementById('appModal');
        if (modal) modal.classList.remove('wechat-seamless-shell');
        if (typeof originalClosePhoneApp === 'function') originalClosePhoneApp();
    };

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

        // 恢复持久化备份
        restoreCustomNpcsFromLocalBackup();
        restoreChatHistoryFromLocalBackup();

        if (typeof window.restoreWechatProfileData === 'function') {
            window.restoreWechatProfileData();
        }

        for (const [id, npc] of Object.entries(window.G.npcs)) {
            if (!npc.id) npc.id = id;
            if (!npc.name) npc.name = id;
            if (npc.favor === undefined) npc.favor = 50;
            if (!npc.region) npc.region = (id.includes('dream') || id.includes('george')) ? '美国 - 东部' : '中国';
            if (!npc.avatarUrl) npc.avatarUrl = getRandomAvatar();
            if (!npc.ownerAccountId) npc.ownerAccountId = 'main';
        }
    }

    function getChatStorageKey(npcId, accId = null) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        return `${accId || curAcc.id || 'main'}_${npcId}`;
    }

    function getAccountChatHistory(npcId, accId = null) {
        if (!window.G.chatHistory) window.G.chatHistory = {};
        const key = getChatStorageKey(npcId, accId);
        if (!window.G.chatHistory[key]) window.G.chatHistory[key] = [];
        return window.G.chatHistory[key];
    }

    function pushChatMessageSafe(npcId, msgObj, accId = null) {
        if (!msgObj._id) msgObj._id = 'cmsg_' + Date.now() + '_' + (Math.floor(Math.random() * 8999) + 1000);
        getAccountChatHistory(npcId, accId).push(msgObj);
        syncChatHistoryToLocalBackup();
    }

    function isAccountBlockedByNpc(npcId, accId = null) {
        const curAcc = accId || ((typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo().id : 'main');
        const token = `${npcId}_${curAcc}`;
        if (curAcc === 'main' && Array.isArray(window.G.blockedNpcs) && window.G.blockedNpcs.includes(npcId)) return true;
        return (window.G.blockedRecords || []).includes(token);
    }

    function renderAvatarBadge(obj, size = 46) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { avatar: 'assets/icons/chat.png' };
        const url = (obj && obj.isPlayer) ? curAcc.avatar : (obj?.avatarUrl || getRandomAvatar());
        return `<div style="width:${size}px;height:${size}px;border-radius:6px;overflow:hidden;background:#e9e9e9;flex-shrink:0;box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.06);">
            <img src="${url}" draggable="false" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.onerror=null;this.src='assets/icons/chat.png';" />
        </div>`;
    }

    // 🧮 估算当前单人/群聊历史记录的 Token 占用
    function calculateHistoryTokens(history) {
        if (!Array.isArray(history) || history.length === 0) return 0;
        let charCount = 0;
        for (const m of history) {
            charCount += (m.text ? m.text.length : 0);
            if (m.sharedMoment?.body) charCount += m.sharedMoment.body.length;
        }
        // 中英文混合按 1.3 粗略乘数，预留基本上下文底模
        return Math.round(charCount * 1.3 + 120);
    }

    function formatTokenString(tokens) {
        if (tokens >= 1000) {
            return (tokens / 1000).toFixed(1) + 'k';
        }
        return tokens.toString();
    }

    // 🧩 核心：将 AI 回复拆分为自然多气泡
    function splitIntoChatBubbles(rawText) {
        if (!rawText) return [];
        const clean = (typeof stripThought === 'function') ? stripThought(rawText).trim() : rawText.trim();
        if (!clean) return [];

        const bubbles = [];
        const msgTagRegex = /\[MSG\]([\s\S]*?)\[\/MSG\]/gi;
        let match;
        while ((match = msgTagRegex.exec(clean)) !== null) {
            const item = match[1].trim();
            if (item) bubbles.push(item);
        }
        if (bubbles.length > 0) return bubbles.slice(0, 4);

        const lines = clean.split(/\n+/).map(l => l.trim()).filter(Boolean);
        if (lines.length > 1) return lines.slice(0, 4);

        if (lines.length === 1 && lines[0].length > 30) {
            const sentences = lines[0].split(/([。！？!?~～]+)/).filter(Boolean);
            let current = '';
            for (let i = 0; i < sentences.length; i++) {
                current += sentences[i];
                if (i % 2 === 1 || current.length > 22) {
                    if (current.trim()) bubbles.push(current.trim());
                    current = '';
                }
            }
            if (current.trim()) bubbles.push(current.trim());
            if (bubbles.length > 0) return bubbles.slice(0, 4);
        }
        return [clean];
    }

    // ============================================================
    // 📱 微信 App 整体调度中枢
    // ============================================================
    function renderChatApp(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const appModal = document.getElementById('appModal');
        if (appModal) appModal.classList.add('wechat-seamless-shell');

        ensureNpcIntegrity();

        if (window.G.currentChatGroup) {
            renderGroupChatWindow(container);
            return;
        }
        if (window.G.currentChatNpc) {
            renderSingleChatWindow(container);
            return;
        }

        let mainContentHtml = '';
        let topBarHtml = '';
        const pendingCount = (window.G.friendRequests || []).length + (window.G.groupInvites || []).length;
        const isDirect = window.G.chatActiveTab !== 'group';

        if (_activeBottomTab === 'chats') {
            topBarHtml = `
                <div class="wechat-top-header">
                    <button onclick="closePhoneApp()" style="border:none;background:none;font-size:14px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>桌面</span>
                    </button>
                    <div style="display:flex;gap:4px;background:#e2e2e2;padding:2px;border-radius:6px;">
                        <button type="button" onclick="window.switchChatTab('direct')" style="border:none;padding:4px 14px;border-radius:4px;font-size:12.5px;font-weight:600;cursor:pointer;background:${isDirect ? '#ffffff' : 'transparent'};color:${isDirect ? '#07c160' : '#666'};">私聊</button>
                        <button type="button" onclick="window.switchChatTab('group')" style="border:none;padding:4px 14px;border-radius:4px;font-size:12.5px;font-weight:600;cursor:pointer;background:${!isDirect ? '#ffffff' : 'transparent'};color:${!isDirect ? '#07c160' : '#666'};">群聊</button>
                    </div>
                    <div style="position:relative;">
                        <button onclick="window.openAddChatTargetModal()" title="添加好友与群聊" style="border:none;background:transparent;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">
                            <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:#181818;stroke-width:2.2;stroke-linecap:round;">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                        ${pendingCount > 0 ? `<span style="position:absolute;top:2px;right:2px;width:8px;height:8px;background:#fa5151;border:1.5px solid #ededed;border-radius:50%;display:block;"></span>` : ''}
                    </div>
                </div>
            `;
            mainContentHtml = buildChatListHTML();
        } else if (_activeBottomTab === 'moments') {
            topBarHtml = `
                <div class="wechat-top-header">
                    <button onclick="closePhoneApp()" style="border:none;background:none;font-size:14px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>桌面</span>
                    </button>
                    <div style="font-size:15px;font-weight:600;color:#181818;">朋友圈动态</div>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button onclick="window.triggerGenerateFriendsFeed()" style="border:none;background:none;color:#07c160;font-size:13px;font-weight:600;cursor:pointer;padding:0;">刷新</button>
                        <button onclick="window.openPostMomentModal()" style="border:none;background:none;font-size:14px;cursor:pointer;color:#181818;font-weight:600;padding:0;">发布</button>
                    </div>
                </div>
            `;
            mainContentHtml = (typeof buildMomentsHTML === 'function') ? buildMomentsHTML() : '<div style="padding:40px;text-align:center;color:#999;">动态模块加载中...</div>';
        } else if (_activeBottomTab === 'profile') {
            topBarHtml = `
                <div class="wechat-top-header">
                    <button onclick="closePhoneApp()" style="border:none;background:none;font-size:14px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>桌面</span>
                    </button>
                    <div style="font-size:15px;font-weight:600;color:#181818;">我 · 身份中心</div>
                    <div style="width:40px;"></div>
                </div>
            `;
            mainContentHtml = (typeof buildProfileTabHTML === 'function') ? buildProfileTabHTML() : '<div style="padding:40px;text-align:center;color:#999;">人设模块加载中...</div>';
        }

        const bottomNavHtml = `
            <div style="height:52px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;justify-content:space-around;align-items:center;flex-shrink:0;box-sizing:border-box;">
                <button onclick="window.switchWechatBottomTab('chats')" style="border:none;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:${_activeBottomTab === 'chats' ? '#07c160' : '#888888'};">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                    <span style="font-size:10.5px;font-weight:${_activeBottomTab === 'chats' ? '600' : 'normal'};">微信</span>
                </button>
                <button onclick="window.switchWechatBottomTab('moments')" style="border:none;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:${_activeBottomTab === 'moments' ? '#07c160' : '#888888'};">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3"/></svg>
                    <span style="font-size:10.5px;font-weight:${_activeBottomTab === 'moments' ? '600' : 'normal'};">动态</span>
                </button>
                <button onclick="window.switchWechatBottomTab('profile')" style="border:none;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:${_activeBottomTab === 'profile' ? '#07c160' : '#888888'};">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    <span style="font-size:10.5px;font-weight:${_activeBottomTab === 'profile' ? '600' : 'normal'};">我</span>
                </button>
            </div>
        `;

        container.innerHTML = `
            <div id="wechatAppRoot" style="display:flex;flex-direction:column;height:100%;width:100%;background:#ededed;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,sans-serif;box-sizing:border-box;">
                ${topBarHtml}
                <div style="flex:1;overflow-y:auto;background:#ffffff;">
                    ${mainContentHtml}
                </div>
                ${bottomNavHtml}
            </div>
        `;

        if (_activeBottomTab === 'chats') {
            container.querySelectorAll('.chat-item[data-npc-id]').forEach(item => {
                const id = item.dataset.npcId;
                if (typeof bindLongPressEvent === 'function') {
                    bindLongPressEvent(item, () => { window.openChat(id); }, () => { window.openNpcProfileCardModal(id); });
                } else {
                    item.onclick = () => window.openChat(id);
                }
            });
            container.querySelectorAll('.group-item[data-group-id]').forEach(item => {
                const gid = item.dataset.groupId;
                if (typeof bindLongPressEvent === 'function') {
                    bindLongPressEvent(item, () => { window.openGroupChat(gid); }, () => { window.openGroupSettingsModal(gid); });
                } else {
                    item.onclick = () => window.openGroupChat(gid);
                }
            });
        }
    }

    window.switchWechatBottomTab = function(tabName) {
        _activeBottomTab = tabName;
        window.G.currentChatNpc = null;
        window.G.currentChatGroup = null;
        renderChatApp();
    };

    // ============================================================
    // 📖 角色名片页：支持直接修改名字、地区、好感度
    // ============================================================
    window.openNpcProfileCardModal = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        const personaText = npc.persona || '';
        const previewPersona = personaText ? personaText.slice(0, 85) + (personaText.length > 85 ? '...' : '') : '暂无详细人设档案，点击此处补充';

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;margin-bottom:12px;">
                    <div style="position:relative;width:58px;height:58px;cursor:pointer;" onclick="window.triggerChangeNpcAvatar('${npcId}')" title="点击更换头像">
                        <img id="npcCardAvatarDisplay" src="${npc.avatarUrl || getRandomAvatar()}" style="width:100%;height:100%;border-radius:8px;object-fit:cover;box-shadow:0 2px 6px rgba(0,0,0,0.08);" onerror="this.src='assets/icons/chat.png';" />
                        <div style="position:absolute;bottom:0;right:0;background:rgba(0,0,0,0.55);border-radius:4px 0 8px 0;width:18px;height:18px;display:flex;align-items:center;justify-content:center;">
                            <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:#ffffff;"><path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>
                        </div>
                    </div>
                    <div style="flex:1;">
                        <!-- 可点击修改名字 -->
                        <div onclick="window.openEditNpcNameModal('${npcId}')" style="font-size:16px;font-weight:700;color:#1e293b;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="点击修改名字">
                            <span>${escapeHtml(npc.name)}</span>
                            <span style="font-size:11px;color:#07c160;">✎</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#64748b;margin-top:4px;">
                            <!-- 可点击修改地区 -->
                            <span onclick="window.openPickNpcRegionForCard('${npcId}')" style="cursor:pointer;background:#f0f2f5;padding:2px 6px;border-radius:4px;color:#334155;" title="点击切换地区">
                                📍 ${escapeHtml(npc.region || '中国')} ▾
                            </span>
                            <!-- 可点击修改好感度 -->
                            <span onclick="window.openEditNpcFavorModal('${npcId}')" style="cursor:pointer;background:#fff1f0;padding:2px 6px;border-radius:4px;color:#ef4444;font-weight:600;" title="点击修改好感度">
                                ❤️ ${npc.favor || 50}/100 ✎
                            </span>
                        </div>
                    </div>
                </div>

                <div style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;padding:10px 12px;margin-bottom:14px;cursor:pointer;" onclick="window.openEditNpcPersonaModal('${npcId}')">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:12.5px;font-weight:600;color:#334155;">角色人设档案</span>
                        <button type="button" onclick="event.stopPropagation(); window.openFullPersonaModal('${npcId}');" style="border:none;background:#2563eb;color:#ffffff;font-size:11px;cursor:pointer;padding:3px 8px;border-radius:4px;display:inline-flex;align-items:center;gap:4px;font-weight:600;">
                            <span>全屏查看</span>
                        </button>
                    </div>
                    <div style="font-size:12px;color:#64748b;line-height:1.5;white-space:pre-wrap;word-break:break-word;max-height:65px;overflow:hidden;">
                        ${escapeHtml(previewPersona)}
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;">
                    <button type="button" onclick="closeModal(); window.openChat('${npcId}');" style="border:none;background:#07c160;color:#fff;padding:9px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;text-align:center;">
                        发消息
                    </button>
                    <button type="button" onclick="closeModal()" style="border:none;background:none;color:#64748b;font-size:12px;cursor:pointer;margin-top:2px;">返回</button>
                </div>
            </div>
        `);
    };

    window.openEditNpcNameModal = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#181818;margin-bottom:10px;">更改角色名字</div>
                <input type="text" id="editNpcNewNameInput" value="${escapeHtml(npc.name)}" style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #ccc;font-size:14px;box-sizing:border-box;">
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                    <button type="button" onclick="window.openNpcProfileCardModal('${npcId}')" style="border:1px solid #ccc;background:#fff;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmSaveNpcName" style="border:none;background:#07c160;color:#fff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">保存</button>
                </div>
            </div>
        `);
        document.getElementById('btnConfirmSaveNpcName').onclick = () => {
            const val = document.getElementById('editNpcNewNameInput').value.trim();
            if (!val) return;
            npc.name = val;
            syncCustomNpcsToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            window.openNpcProfileCardModal(npcId);
            if (typeof showToast === 'function') showToast('名字已更新', 'success', 1200);
        };
    };

    window.openPickNpcRegionForCard = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        window.openPickNpcRegionModal((picked) => {
            npc.region = picked;
            syncCustomNpcsToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            window.openNpcProfileCardModal(npcId);
        });
    };

    window.openEditNpcFavorModal = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#181818;margin-bottom:10px;">调整好感度 (0~100)</div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <input type="range" id="favorRangeInput" min="0" max="100" value="${npc.favor || 50}" style="flex:1;">
                    <span id="favorNumDisplay" style="font-size:14px;font-weight:700;color:#ef4444;min-width:30px;">${npc.favor || 50}</span>
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
                    <button type="button" onclick="window.openNpcProfileCardModal('${npcId}')" style="border:1px solid #ccc;background:#fff;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmSaveNpcFavor" style="border:none;background:#07c160;color:#fff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">保存</button>
                </div>
            </div>
        `);
        const r = document.getElementById('favorRangeInput');
        const d = document.getElementById('favorNumDisplay');
        r.oninput = () => { d.textContent = r.value; };
        document.getElementById('btnConfirmSaveNpcFavor').onclick = () => {
            npc.favor = parseInt(r.value) || 0;
            syncCustomNpcsToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            window.openNpcProfileCardModal(npcId);
            if (typeof showToast === 'function') showToast('好感度已调整', 'success', 1200);
        };
    };

    // ============================================================
    // 💬 单人私聊窗口渲染
    // ============================================================
    function renderSingleChatWindow(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const npcId = window.G.currentChatNpc;
        const npc = window.G.npcs[npcId];
        if (!npc) { window.closeChat(); return; }

        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        const isBlocked = isAccountBlockedByNpc(npcId, curAcc.id);
        const chatHist = getAccountChatHistory(npcId, curAcc.id);
        const isBehindActive = !!window.G._behindScreenActive[npcId];

        // Token 占用估算
        const tokensCount = calculateHistoryTokens(chatHist);
        const tokenDisplay = formatTokenString(tokensCount);

        let messagesHtml = '';
        for (const msg of chatHist) {
            if (msg.from === 'action') {
                messagesHtml += `
                <div style="text-align:center;margin:8px 0;">
                    <span style="display:inline-block;background:rgba(0,0,0,0.05);color:#888;padding:3px 10px;border-radius:4px;font-size:11.5px;max-width:85%;">${escapeHtml(msg.text || '')}</span>
                </div>`;
            } else if (msg.from === 'behind_screen') {
                messagesHtml += `
                <div style="margin:8px 12px;background:#fefbf3;border-left:3px solid #d4a373;padding:7px 10px;border-radius:4px;font-size:12px;color:#7f5539;line-height:1.5;">
                    <span style="font-weight:600;">👁️ 屏幕那边的动作：</span>${escapeHtml(msg.text || '')}
                </div>`;
            } else if (msg.type === 'image' || msg.imageUrl) {
                const isSelf = msg.from === 'player';
                const imgSrc = msg.imageUrl || msg.url;
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:65%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" style="background:#fff;padding:3px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.06);cursor:pointer;">
                            <img src="${imgSrc}" style="max-width:180px;max-height:220px;border-radius:4px;object-fit:cover;display:block;" />
                            ${msg.imageDesc ? `<div style="font-size:11px;color:#666;padding:3px 4px;">${escapeHtml(msg.imageDesc)}</div>` : ''}
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else if (msg.type === 'sticker' && msg.stickerUrl) {
                const isSelf = msg.from === 'player';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:56%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        <img class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" src="${escapeHtml(msg.stickerUrl)}" alt="${escapeHtml(msg.stickerDesc || '表情')}" style="width:100px;height:100px;object-fit:contain;border-radius:6px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.05);cursor:pointer;">
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else {
                const isSelf = msg.from === 'player';
                let bubbleContent = isSelf ? escapeHtml(msg.text || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(msg.text || '') : escapeHtml(msg.text || ''));

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? '#95ec69' : '#ffffff'};color:#111;padding:8px 12px;border-radius:5px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:14.5px;line-height:1.5;word-break:break-word;cursor:pointer;">
                            ${bubbleContent}
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            }
        }

        const stickerDrawerHtml = _stickerDrawerOpen ? buildChatStickerDrawerHTML('single', npcId) : '';
        const plusDrawerHtml = _plusDrawerOpen ? buildChatPlusDrawerHTML('single', npcId) : '';

        const html = `
        <div style="background:#ededed;display:flex;flex-direction:column;height:100%;min-height:100%;overflow:hidden;font-family:-apple-system,sans-serif;">
            <div class="wechat-top-header">
                <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
                    <button onclick="window.closeChat()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:2px;font-weight:500;">
                        <span>‹</span> <span>微信</span>
                    </button>
                    <div onclick="window.openNpcProfileCardModal('${npcId}')" style="cursor:pointer;font-weight:600;font-size:15px;color:#181818;margin-left:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${escapeHtml(npc.name)}
                    </div>
                    <!-- Token 占用标签 -->
                    <span style="background:#e0e0e0;color:#666;font-size:10px;padding:1px 5px;border-radius:3px;margin-left:4px;font-weight:normal;white-space:nowrap;" title="历史上下文 Token 估算">
                        ${tokenDisplay}t
                    </span>
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                    <!-- 动作感知眼睛按钮 -->
                    <button onclick="window.toggleBehindScreen('${npcId}')" style="border:0.5px solid ${isBehindActive ? '#07c160' : '#ccc'};background:${isBehindActive ? '#d4f5dd' : '#fff'};color:${isBehindActive ? '#07c160' : '#555'};width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="${isBehindActive ? '动作感知：已开启' : '点击开启屏幕另外一边感知'}">
                        <svg viewBox="0 0 24 24" style="width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <!-- 闪电生成按钮 -->
                    <button onclick="window.triggerAIReplyForSingle('${npcId}')" style="border:none;background:#07c160;color:#fff;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="生成回复">
                        <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    </button>
                </div>
            </div>

            ${isBlocked ? `
            <div style="background:#fff2f0;color:#fa5151;padding:6px 12px;font-size:11.5px;border-bottom:0.5px solid #ffccc7;flex-shrink:0;">
                <span>⚠️ 当前账号消息已被对方拒收</span>
            </div>` : ''}

            <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">打个招呼开启畅聊吧！</div>'}
            </div>

            ${stickerDrawerHtml}
            ${plusDrawerHtml}

            <!-- 微信标准输入栏：左侧加号，输入框内右侧表情，右侧发送 -->
            <div style="padding:8px 10px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;gap:8px;align-items:center;flex-shrink:0;">
                <!-- 左侧加号按钮 -->
                <button onclick="window.toggleChatPlusDrawer('single','${npcId}')" title="更多功能" style="border:none;background:none;width:28px;height:28px;cursor:pointer;flex-shrink:0;padding:0;display:flex;align-items:center;justify-content:center;">
                    <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#555;stroke-width:1.8;stroke-linecap:round;"><circle cx="12" cy="12" r="9.5"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                </button>

                <!-- 输入框容器，内部右侧放置表情包图标 -->
                <div style="flex:1;position:relative;display:flex;align-items:center;">
                    <textarea id="singleChatInput" rows="1" placeholder="发消息..." style="width:100%;padding:8px 34px 8px 10px;border-radius:5px;border:none;background:#ffffff;font-size:14px;resize:none;outline:none;font-family:inherit;box-shadow:inset 0 0 0 0.5px #dcdcdc;box-sizing:border-box;"></textarea>
                    <button onclick="window.toggleChatStickerDrawer('single','${npcId}')" title="表情" style="position:absolute;right:6px;border:none;background:none;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">
                        <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:#666666;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;">
                            <circle cx="12" cy="12" r="9.5"></circle>
                            <path d="M8 14.5c1 1.5 2.5 2.2 4 2.2s3-0.7 4-2.2"></path>
                            <circle cx="9" cy="9.5" r="1.2" fill="#666666" stroke="none"></circle>
                            <circle cx="15" cy="9.5" r="1.2" fill="#666666" stroke="none"></circle>
                        </svg>
                    </button>
                </div>

                <!-- 发送按钮 -->
                <button onclick="window.doSendSingleChat('${npcId}')" style="border:none;background:#07c160;color:#fff;padding:6px 13px;border-radius:4px;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;">发送</button>
            </div>
        </div>
        `;
        container.innerHTML = html;

        const msgArea = document.getElementById('chatMessageArea');
        if (msgArea) setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 50);

        // 绑定气泡长按操作
        container.querySelectorAll('.chat-bubble[data-msgid]').forEach(el => {
            const mid = el.dataset.msgid;
            if (!mid) return;
            if (typeof bindLongPressEvent === 'function') {
                bindLongPressEvent(el, null, () => { window.showMessageActionSheet(mid, 'single', npcId); });
            }
        });

        const input = document.getElementById('singleChatInput');
        if (input) {
            input.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    window.doSendSingleChat(npcId);
                }
            };
        }
    }

    // ============================================================
    // 👥 群聊窗口渲染
    // ============================================================
    function renderGroupChatWindow(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const gid = window.G.currentChatGroup;
        const grp = window.G.groups[gid];
        if (!grp) { window.closeGroupChat(); return; }
        const msgs = window.G.groupChatHistory[gid] || [];
        const tokenDisplay = formatTokenString(calculateHistoryTokens(msgs));

        let messagesHtml = '';
        for (const msg of msgs) {
            if (msg.from === 'action') {
                messagesHtml += `
                <div style="text-align:center;margin:8px 0;">
                    <span style="display:inline-block;background:rgba(0,0,0,0.05);color:#888;padding:3px 10px;border-radius:4px;font-size:11px;">${escapeHtml(msg.text || '')}</span>
                </div>`;
            } else if (msg.type === 'image' || msg.imageUrl) {
                const isSelf = msg.from === 'player';
                const imgSrc = msg.imageUrl || msg.url;
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: msg.senderAvatarUrl }, 38)}</div>` : ''}
                    <div style="max-width:65%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${!isSelf ? `<div style="font-size:11px;color:#888;margin-bottom:2px;">${escapeHtml(msg.senderName || '成员')}</div>` : ''}
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" style="background:#fff;padding:3px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.06);cursor:pointer;">
                            <img src="${imgSrc}" style="max-width:180px;max-height:220px;border-radius:4px;object-fit:cover;display:block;" />
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else if (msg.type === 'sticker' && msg.stickerUrl) {
                const isSelf = msg.from === 'player';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: msg.senderAvatarUrl }, 38)}</div>` : ''}
                    <div style="max-width:56%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${!isSelf ? `<div style="font-size:11px;color:#888;margin-bottom:2px;">${escapeHtml(msg.senderName || '成员')}</div>` : ''}
                        <img class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" src="${escapeHtml(msg.stickerUrl)}" alt="${escapeHtml(msg.stickerDesc || '表情')}" style="width:100px;height:100px;object-fit:contain;border-radius:6px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.05);cursor:pointer;">
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else {
                const isSelf = msg.from === 'player';
                let bubbleContent = isSelf ? escapeHtml(msg.text || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(msg.text || '') : escapeHtml(msg.text || ''));

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: msg.senderAvatarUrl }, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${!isSelf ? `<div style="font-size:11px;color:#888;margin-bottom:2px;">${escapeHtml(msg.senderName || '成员')}</div>` : ''}
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? '#95ec69' : '#ffffff'};color:#111;padding:8px 12px;border-radius:5px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:14.5px;line-height:1.5;word-break:break-word;cursor:pointer;">
                            ${bubbleContent}
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            }
        }

        const groupStickerDrawerHtml = _stickerDrawerOpen ? buildChatStickerDrawerHTML('group', gid) : '';
        const groupPlusDrawerHtml = _plusDrawerOpen ? buildChatPlusDrawerHTML('group', gid) : '';

        const html = `
        <div style="background:#ededed;display:flex;flex-direction:column;height:100%;min-height:100%;overflow:hidden;font-family:-apple-system,sans-serif;">
            <div class="wechat-top-header">
                <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
                    <button onclick="window.closeGroupChat()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:2px;font-weight:500;">
                        <span>‹</span> <span>微信</span>
                    </button>
                    <div>
                        <div style="font-weight:600;font-size:15px;color:#181818;margin-left:4px;">${escapeHtml(grp.name)} <span style="font-size:12px;color:#888;">(${(grp.members || []).length})</span></div>
                    </div>
                    <span style="background:#e0e0e0;color:#666;font-size:10px;padding:1px 5px;border-radius:3px;margin-left:4px;" title="Token 消耗估算">${tokenDisplay}t</span>
                </div>
                <button onclick="window.triggerGroupAIReply('${gid}')" style="border:none;background:#07c160;color:#fff;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                    <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </button>
            </div>

            <div id="groupMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">群里很安静，来开启话题吧！</div>'}
            </div>

            ${groupStickerDrawerHtml}
            ${groupPlusDrawerHtml}

            <div style="padding:8px 10px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;gap:8px;align-items:center;flex-shrink:0;">
                <button onclick="window.toggleChatPlusDrawer('group','${gid}')" title="更多功能" style="border:none;background:none;width:28px;height:28px;cursor:pointer;flex-shrink:0;padding:0;display:flex;align-items:center;justify-content:center;">
                    <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#555;stroke-width:1.8;stroke-linecap:round;"><circle cx="12" cy="12" r="9.5"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                </button>
                <div style="flex:1;position:relative;display:flex;align-items:center;">
                    <textarea id="groupChatInput" rows="1" placeholder="发消息..." style="width:100%;padding:8px 34px 8px 10px;border-radius:5px;border:none;background:#ffffff;font-size:14px;resize:none;outline:none;font-family:inherit;box-shadow:inset 0 0 0 0.5px #dcdcdc;box-sizing:border-box;"></textarea>
                    <button onclick="window.toggleChatStickerDrawer('group','${gid}')" title="表情" style="position:absolute;right:6px;border:none;background:none;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">
                        <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:#666666;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;">
                            <circle cx="12" cy="12" r="9.5"></circle>
                            <path d="M8 14.5c1 1.5 2.5 2.2 4 2.2s3-0.7 4-2.2"></path>
                            <circle cx="9" cy="9.5" r="1.2" fill="#666666" stroke="none"></circle>
                            <circle cx="15" cy="9.5" r="1.2" fill="#666666" stroke="none"></circle>
                        </svg>
                    </button>
                </div>
                <button onclick="window.doSendGroupChat('${gid}')" style="border:none;background:#07c160;color:#fff;padding:6px 13px;border-radius:4px;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;">发送</button>
            </div>
        </div>
        `;
        container.innerHTML = html;

        const msgArea = document.getElementById('groupMessageArea');
        if (msgArea) setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 50);

        container.querySelectorAll('.chat-bubble[data-msgid]').forEach(el => {
            const mid = el.dataset.msgid;
            if (!mid) return;
            if (typeof bindLongPressEvent === 'function') {
                bindLongPressEvent(el, null, () => { window.showMessageActionSheet(mid, 'group', gid); });
            }
        });

        const input = document.getElementById('groupChatInput');
        if (input) {
            input.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    window.doSendGroupChat(gid);
                }
            };
        }
    }

    // ============================================================
    // 🎨 表情包抽屉：居中排列 + 自定义分组 + 本地图片导入备注
    // ============================================================
    function buildChatStickerDrawerHTML(type, id) {
        if (typeof ensureStickersLoaded === 'function') ensureStickersLoaded();
        const cats = window.G.stickerCategories || ['猪猪'];
        const active = window.G.activeStickerCategory || cats[0];
        const list = (window.G.stickerLibrary || []).filter(s => s && s.category === active);

        const tabsHtml = cats.map(c => `
            <span onclick="window.switchChatStickerCategory('${escapeHtml(c)}','${type}','${id}')" style="display:inline-block;padding:4px 10px;margin-right:6px;border-radius:12px;font-size:12px;cursor:pointer;flex-shrink:0;background:${c === active ? '#07c160' : '#e8e8e8'};color:${c === active ? '#fff' : '#666'};">${escapeHtml(c)}</span>
        `).join('');

        let cardsHtml = `
            <!-- 添加表情卡片 -->
            <div class="wechat-sticker-card" onclick="window.openAddStickerChoiceModal('${type}','${id}')" title="添加新表情" style="border:1px dashed #bbb;background:#fafafa;">
                <span style="font-size:22px;color:#888;">➕</span>
            </div>
        `;

        cardsHtml += list.map(s => `
            <div class="wechat-sticker-card" onclick="window.sendChatSticker('${type}','${id}','${escapeHtml(s.url)}','${escapeHtml((s.desc || '').replace(/'/g, ''))}')" title="${escapeHtml(s.desc || '')}">
                <img src="${escapeHtml(s.url)}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
            </div>
        `).join('');

        return `
        <div id="chatStickerDrawer" style="background:#f7f7f7;border-top:0.5px solid #dcdcdc;flex-shrink:0;animation:wechatSlideUp 0.18s ease-out;">
            <div style="display:flex;align-items:center;overflow-x:auto;padding:8px 10px 4px;white-space:nowrap;">
                ${tabsHtml}
                <button onclick="window.openCreateStickerCategoryModal('${type}','${id}')" style="border:0.5px solid #ccc;background:#fff;padding:3px 8px;border-radius:10px;font-size:11px;color:#555;cursor:pointer;margin-left:4px;white-space:nowrap;">+ 分组</button>
            </div>
            <div class="wechat-sticker-grid">
                ${cardsHtml}
            </div>
        </div>`;
    }

    window.toggleChatStickerDrawer = function(type, id) {
        _stickerDrawerOpen = !_stickerDrawerOpen;
        _plusDrawerOpen = false;
        if (type === 'single') renderSingleChatWindow();
        else renderGroupChatWindow();
    };

    window.switchChatStickerCategory = function(cat, type, id) {
        window.G.activeStickerCategory = cat;
        if (type === 'single') renderSingleChatWindow();
        else renderGroupChatWindow();
    };

    // ➕ 表情包添加选择弹窗（导入本地图片 / 批量图床）
    window.openAddStickerChoiceModal = function(type, id) {
        const curCat = window.G.activeStickerCategory || '猪猪';
        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#181818;margin-bottom:12px;">添加表情包到「${escapeHtml(curCat)}」</div>
                
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <label style="border:1px solid #cbd5e1;background:#f8fafc;padding:12px;border-radius:8px;font-size:13px;font-weight:600;color:#1e293b;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
                        <span>📁 从手机相册导入本地表情</span>
                        <input type="file" id="localStickerFileInput" accept="image/*" style="display:none;">
                        <span style="color:#07c160;">›</span>
                    </label>

                    <button type="button" onclick="window.openBatchImportStickerModal('${type}','${id}')" style="border:1px solid #cbd5e1;background:#f8fafc;padding:12px;border-radius:8px;font-size:13px;font-weight:600;color:#1e293b;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;">
                        <span>🌐 文本/图床链接批量导入</span>
                        <span style="color:#2563eb;">›</span>
                    </button>
                </div>

                <div style="display:flex;justify-content:flex-end;margin-top:14px;">
                    <button type="button" onclick="closeModal()" style="border:none;background:none;color:#64748b;font-size:12.5px;cursor:pointer;">取消</button>
                </div>
            </div>
        `);

        document.getElementById('localStickerFileInput').onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                const base64Data = evt.target.result;
                window.openStickerRemarkModal(base64Data, curCat, type, id);
            };
            reader.readAsDataURL(file);
        };
    };

    window.openStickerRemarkModal = function(base64Url, cat, type, id) {
        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#181818;margin-bottom:10px;">设置表情包备注</div>
                <div style="display:flex;justify-content:center;margin-bottom:10px;">
                    <img src="${base64Url}" style="width:90px;height:90px;border-radius:6px;object-fit:contain;background:#f0f0f0;">
                </div>
                <div class="form-group" style="margin-bottom:12px;">
                    <label style="font-size:12px;color:#555;display:block;margin-bottom:3px;">输入表情备注（用于关键词匹配与描述）：</label>
                    <input type="text" id="stickerDescInput" placeholder="如：小猪得意、疯狂点头..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #ccc;font-size:13px;box-sizing:border-box;">
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px;">
                    <button type="button" onclick="closeModal()" style="border:1px solid #ccc;background:#fff;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmSaveLocalSticker" style="border:none;background:#07c160;color:#fff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">完成添加</button>
                </div>
            </div>
        `);
        document.getElementById('btnConfirmSaveLocalSticker').onclick = () => {
            const desc = document.getElementById('stickerDescInput').value.trim() || '自定义表情';
            if (!window.G.stickerLibrary) window.G.stickerLibrary = [];
            window.G.stickerLibrary.push({ category: cat, desc, url: base64Url });
            if (typeof showToast === 'function') showToast('表情已成功收录！', 'success', 1500);
            closeModal();
            if (type === 'single') renderSingleChatWindow();
            else renderGroupChatWindow();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        };
    };

    window.openBatchImportStickerModal = function(type, id) {
        const curCat = window.G.activeStickerCategory || '猪猪';
        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#181818;margin-bottom:8px;">批量导入图床表情包</div>
                <div style="font-size:11.5px;color:#666;margin-bottom:6px;">格式：<b style="color:#07c160;">表情描述——图床链接</b>（每行一个）</div>
                <textarea id="importStickerBatchInput" rows="6" placeholder="可爱眨眼——https://...\n打呼噜——https://..." style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;font-size:12px;box-sizing:border-box;"></textarea>
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
                    <button type="button" onclick="closeModal()" style="border:1px solid #ccc;background:#fff;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmBatchImport" style="border:none;background:#07c160;color:#fff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">确认导入</button>
                </div>
            </div>
        `);
        document.getElementById('btnConfirmBatchImport').onclick = () => {
            const raw = document.getElementById('importStickerBatchInput').value.trim();
            if (!raw) return;
            const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
            let count = 0;
            if (!window.G.stickerLibrary) window.G.stickerLibrary = [];
            for (const line of lines) {
                if (line.includes('——')) {
                    const parts = line.split('——');
                    const desc = parts[0].trim();
                    const url = parts.slice(1).join('——').trim();
                    if (url.startsWith('http') || url.startsWith('data:')) {
                        window.G.stickerLibrary.push({ category: curCat, desc, url });
                        count++;
                    }
                }
            }
            if (typeof showToast === 'function') showToast(`🎉 成功导入 ${count} 个表情！`, 'success', 2000);
            closeModal();
            if (type === 'single') renderSingleChatWindow();
            else renderGroupChatWindow();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        };
    };

    window.openCreateStickerCategoryModal = function(type, id) {
        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#181818;margin-bottom:10px;">新建表情分组</div>
                <input type="text" id="newStickerCatInput" placeholder="输入分组名称..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #ccc;font-size:13px;box-sizing:border-box;">
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
                    <button type="button" onclick="closeModal()" style="border:1px solid #ccc;background:#fff;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmCreateCat" style="border:none;background:#07c160;color:#fff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">创建</button>
                </div>
            </div>
        `);
        document.getElementById('btnConfirmCreateCat').onclick = () => {
            const val = document.getElementById('newStickerCatInput').value.trim();
            if (!val) return;
            if (!window.G.stickerCategories) window.G.stickerCategories = ['猪猪'];
            if (!window.G.stickerCategories.includes(val)) window.G.stickerCategories.push(val);
            window.G.activeStickerCategory = val;
            closeModal();
            if (type === 'single') renderSingleChatWindow();
            else renderGroupChatWindow();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        };
    };

    // ============================================================
    // ➕ 加号扩展抽屉（仿朋友圈发图功能与合作入口）
    // ============================================================
    function buildChatPlusDrawerHTML(type, id) {
        return `
        <div id="chatPlusDrawer" style="background:#f7f7f7;border-top:0.5px solid #dcdcdc;flex-shrink:0;animation:wechatSlideUp 0.18s ease-out;">
            <div class="wechat-plus-grid">
                <!-- 发送图片 -->
                <div class="wechat-plus-item" onclick="window.openChatSendImageModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#07c160;stroke-width:1.8;stroke-linecap:round;"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                    <span class="wechat-plus-label">发送图片</span>
                </div>
                <!-- 合作拍摄 -->
                <div class="wechat-plus-item" onclick="_plusDrawerOpen=false; window.openCollabVideoPublishModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#ff5252;stroke-width:1.8;stroke-linecap:round;"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2"></rect></svg>
                    </div>
                    <span class="wechat-plus-label">共创视频</span>
                </div>
                <!-- 连麦开播 -->
                <div class="wechat-plus-item" onclick="_plusDrawerOpen=false; window.handleInviteCollabStream('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#2563eb;stroke-width:1.8;stroke-linecap:round;"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>
                    </div>
                    <span class="wechat-plus-label">连麦开播</span>
                </div>
            </div>
        </div>`;
    }

    window.toggleChatPlusDrawer = function(type, id) {
        _plusDrawerOpen = !_plusDrawerOpen;
        _stickerDrawerOpen = false;
        if (type === 'single') renderSingleChatWindow();
        else renderGroupChatWindow();
    };

    // 📷 发送图片弹窗（逻辑与发朋友圈一致）
    window.openChatSendImageModal = function(type, id) {
        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#181818;border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:12px;">
                    📷 发送图片
                </div>

                <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:12.5px;font-weight:600;display:block;margin-bottom:4px;">选择模式：</label>
                    <div style="display:flex;flex-direction:column;gap:5px;font-size:12.5px;">
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                            <input type="radio" name="chatImgMode" value="image_real" checked> 📷 选择图片（本地/URL）
                        </label>
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                            <input type="radio" name="chatImgMode" value="image_with_desc"> 🖼️ 图片 + 文字描述（AI知晓画面）
                        </label>
                    </div>
                </div>

                <div id="chatImgSelectWrap" style="background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:10px;">
                    <div style="display:flex;gap:6px;">
                        <input type="text" id="chatImgUrlInput" placeholder="输入图片 URL..." style="flex:1;padding:6px;font-size:12px;border:1px solid #ccc;border-radius:4px;">
                        <label style="border:1px solid #cbd5e1;background:#fff;color:#2563eb;padding:6px 10px;border-radius:4px;font-size:11.5px;cursor:pointer;white-space:nowrap;">
                            相册
                            <input type="file" id="chatImgFileInput" accept="image/*" style="display:none;">
                        </label>
                    </div>
                    <div id="chatImgPreviewBox" style="margin-top:8px;display:none;">
                        <img id="chatImgPreviewImg" style="max-height:85px;border-radius:4px;object-fit:cover;">
                    </div>
                </div>

                <div id="chatImgDescWrap" style="margin-bottom:12px;">
                    <label style="font-size:12px;display:block;margin-bottom:4px;">画面描述（选填，AI 回复时将识别到画面内容）：</label>
                    <input type="text" id="chatImgDescInput" placeholder="如：我的红石自动收割机截图..." style="width:100%;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:12.5px;box-sizing:border-box;">
                </div>

                <div style="display:flex;justify-content:flex-end;gap:8px;">
                    <button type="button" onclick="closeModal()" style="border:1px solid #ccc;background:#fff;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmSendChatImg" style="border:none;background:#07c160;color:#fff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">发送图片</button>
                </div>
            </div>
        `);

        let localImg = null;
        document.getElementById('chatImgFileInput').onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (re) => {
                localImg = re.target.result;
                const prev = document.getElementById('chatImgPreviewImg');
                const box = document.getElementById('chatImgPreviewBox');
                if (prev && box) {
                    prev.src = localImg;
                    box.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        };

        document.getElementById('btnConfirmSendChatImg').onclick = () => {
            const urlVal = document.getElementById('chatImgUrlInput').value.trim();
            const finalImg = localImg || urlVal;
            const desc = document.getElementById('chatImgDescInput').value.trim();

            if (!finalImg) {
                if (typeof showToast === 'function') showToast('请先选择本地图片或填写图片链接', 'error');
                return;
            }

            const time = new Date().toLocaleTimeString().slice(0, 5);
            const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };

            const msgObj = {
                from: 'player',
                type: 'image',
                imageUrl: finalImg,
                imageDesc: desc || null,
                text: desc ? `[图片: ${desc}]` : '[图片]',
                senderName: curAcc.name,
                time
            };

            if (type === 'single') {
                pushChatMessageSafe(id, msgObj, curAcc.id);
            } else {
                if (!window.G.groupChatHistory[id]) window.G.groupChatHistory[id] = [];
                window.G.groupChatHistory[id].push(msgObj);
            }

            _plusDrawerOpen = false;
            closeModal();
            if (type === 'single') renderSingleChatWindow();
            else renderGroupChatWindow();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        };
    };

    // ============================================================
    // 💬 消息操作浮层（简约高保真微信质感，彻底移除廉价 ⚙️ emoji）
    // ============================================================
    window.showMessageActionSheet = function(msgId, targetType, targetId) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        const list = targetType === 'single' ? getAccountChatHistory(targetId, curAcc.id) : (window.G.groupChatHistory[targetId] || []);
        const msg = list.find(m => m._id === msgId);
        if (!msg) return;

        const isPlayerMsg = (msg.from === 'player');
        let mask = document.createElement('div');
        mask.className = 'wechat-action-sheet-mask';
        mask.innerHTML = `
            <div class="wechat-action-sheet-box">
                <div class="wechat-action-item" id="wechatActionCopy">复制内容</div>
                ${isPlayerMsg ? `
                    <div class="wechat-action-item" id="wechatActionEdit">编辑消息</div>
                    <div class="wechat-action-item" id="wechatActionRecall">撤回消息</div>
                    <div class="wechat-action-item danger" id="wechatActionDelete">删除</div>
                ` : `
                    <div class="wechat-action-item danger" id="wechatActionDelete">删除该消息</div>
                `}
                <div class="wechat-action-cancel" id="wechatActionCancel">取消</div>
            </div>
        `;
        document.body.appendChild(mask);

        const closeSheet = () => { if (mask && mask.parentNode) mask.parentNode.removeChild(mask); };
        mask.onclick = (e) => { if (e.target === mask) closeSheet(); };
        mask.querySelector('#wechatActionCancel').onclick = closeSheet;

        mask.querySelector('#wechatActionCopy').onclick = () => {
            closeSheet();
            const textToCopy = msg.text || '';
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy);
            } else if (window.NativeBridge && window.NativeBridge.copyText) {
                window.NativeBridge.copyText(textToCopy);
            }
            if (typeof showToast === 'function') showToast('已复制到剪贴板', 'info', 1200);
        };

        if (isPlayerMsg) {
            mask.querySelector('#wechatActionRecall').onclick = () => {
                closeSheet();
                msg.from = 'action';
                msg.text = '你撤回了一条消息';
                syncChatHistoryToLocalBackup();
                if (targetType === 'single') renderSingleChatWindow();
                else renderGroupChatWindow();
                if (typeof showToast === 'function') showToast('已撤回', 'info', 1200);
                if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            };

            mask.querySelector('#wechatActionEdit').onclick = () => {
                closeSheet();
                openModal(`
                    <div style="text-align:left;font-family:-apple-system,sans-serif;">
                        <div style="font-size:15px;font-weight:700;color:#181818;margin-bottom:10px;">编辑消息</div>
                        <textarea id="wechatEditMsgInput" rows="4" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;font-size:13.5px;box-sizing:border-box;">${escapeHtml(msg.text || '')}</textarea>
                        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
                            <button type="button" onclick="closeModal()" style="border:1px solid #ccc;background:#fff;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                            <button type="button" id="btnConfirmSaveEditedMsg" style="border:none;background:#07c160;color:#fff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">保存</button>
                        </div>
                    </div>
                `);
                document.getElementById('btnConfirmSaveEditedMsg').onclick = () => {
                    const newText = document.getElementById('wechatEditMsgInput').value.trim();
                    if (!newText) return;
                    msg.text = newText;
                    syncChatHistoryToLocalBackup();
                    closeModal();
                    if (targetType === 'single') renderSingleChatWindow();
                    else renderGroupChatWindow();
                    if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                };
            };
        }

        mask.querySelector('#wechatActionDelete').onclick = () => {
            closeSheet();
            const idx = list.findIndex(m => m._id === msgId);
            if (idx !== -1) list.splice(idx, 1);
            syncChatHistoryToLocalBackup();
            if (targetType === 'single') renderSingleChatWindow();
            else renderGroupChatWindow();
            if (typeof showToast === 'function') showToast('已删除', 'info', 1000);
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        };
    };

    // ============================================================
    // 🤖 AI 真实回复生成：打字机延迟 + 多气泡顺序推送 + 动作感知
    // ============================================================
    window.triggerAIReplyForSingle = async function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', region: '中国', name: '主播' };

        if (isAccountBlockedByNpc(npcId, curAcc.id)) {
            if (typeof showToast === 'function') showToast('当前账号已被对方拒收', 'error');
            return;
        }

        const history = getAccountChatHistory(npcId, curAcc.id);
        const isBehindActive = !!window.G._behindScreenActive[npcId];
        const pRegion = curAcc.region || '中国';
        const nRegion = npc.region || '美国 - 东部';
        const isDiffRegion = (pRegion !== nRegion);

        const recentDialogue = history.slice(-10).map(m => {
            const speaker = (m.from === 'player') ? curAcc.name : npc.name;
            return `${speaker}: ${m.text || ''}`;
        }).join('\n');

        const behindPrompt = isBehindActive ? `\n【屏幕那边的真实动作感知】：\n已开启动作观察。请在回复正文最后，额外附带一段 [BEHIND_SCREEN]...[/BEHIND_SCREEN] 描述你在屏幕那一端的真实动作细节（20~40字）。\n` : '';

        const sysPrompt = `你正在扮演MC好友「${npc.name}」（人设：${npc.persona || '游戏同伴'}，常驻：${nRegion}，好感度：${npc.favor || 50}/100）。对方是「${curAcc.name}」（常驻：${pRegion}）。
【微信打字纯净铁律】：
1. 像真实微信聊天一样自然，可发送 1 到 3 句短消息，每句用 [MSG]...[/MSG] 包裹。
2. 气泡内绝对禁止包含任何英文括号或中文括号动作描述（如(微笑)、(waves)、（思考））！
3. 严禁任何思维链碎碎念，直接输出对话正文。
${behindPrompt}`;

        try {
            if (typeof showLoading === 'function') showLoading();
            
            const raw = await callAI([
                { role: 'system', content: sysPrompt },
                { role: 'user', content: recentDialogue ? `【最近对话】：\n${recentDialogue}\n\n请回复「${curAcc.name}」：` : '打个招呼吧。' }
            ], { maxTokens: 400, temperature: 0.85 });

            if (typeof hideLoading === 'function') hideLoading();

            let clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();
            clean = clean.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '').trim();

            // 提取幕后动作
            let behindText = '';
            const bsMatch = clean.match(/\[BEHIND_SCREEN\]([\s\S]*?)\[\/BEHIND_SCREEN\]/i);
            if (bsMatch) {
                behindText = bsMatch[1].trim();
                clean = clean.replace(/\[BEHIND_SCREEN\][\s\S]*?\[\/BEHIND_SCREEN\]/gi, '').trim();
            }

            const bubbles = splitIntoChatBubbles(clean);
            const finalBubbles = (bubbles && bubbles.length) ? bubbles : ['在呢。'];

            for (let i = 0; i < finalBubbles.length; i++) {
                const bText = finalBubbles[i];
                pushChatMessageSafe(npcId, { from: 'npc', text: bText, time: new Date().toLocaleTimeString().slice(0, 5) }, curAcc.id);
                if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
                if (i < finalBubbles.length - 1) {
                    await new Promise(r => setTimeout(r, 450));
                }
            }

            if (behindText && isBehindActive) {
                pushChatMessageSafe(npcId, { from: 'behind_screen', text: behindText, time: new Date().toLocaleTimeString().slice(0, 5) }, curAcc.id);
                if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
            }

            if (typeof autoSaveGame === 'function') autoSaveGame();
        } catch(e) {
            if (typeof hideLoading === 'function') hideLoading();
            console.error('API 回复失败:', e);
            if (typeof showToast === 'function') showToast('回复失败，请检查AI配置', 'error');
        }
    };

    window.toggleBehindScreen = function(npcId) {
        if (!window.G._behindScreenActive) window.G._behindScreenActive = {};
        window.G._behindScreenActive[npcId] = !window.G._behindScreenActive[npcId];
        const status = window.G._behindScreenActive[npcId];
        if (typeof showToast === 'function') showToast(status ? '👁️ 已开启「屏幕那边的TA」动作感知' : '已关闭线下动作感知', 'info', 1200);
        renderSingleChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.sendChatSticker = function(type, id, url, desc) {
        const time = new Date().toLocaleTimeString().slice(0, 5);
        if (type === 'single') {
            const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
            if (isAccountBlockedByNpc(id, curAcc.id)) {
                if (typeof showToast === 'function') showToast('对方已拒收你的消息', 'error');
                return;
            }
            pushChatMessageSafe(id, { from: 'player', type: 'sticker', stickerUrl: url, stickerDesc: desc, text: `[表情：${desc}]`, time }, curAcc.id);
        } else {
            if (!window.G.groupChatHistory[id]) window.G.groupChatHistory[id] = [];
            window.G.groupChatHistory[id].push({ from: 'player', type: 'sticker', stickerUrl: url, stickerDesc: desc, text: `[表情：${desc}]`, time });
            syncChatHistoryToLocalBackup();
        }
        _stickerDrawerOpen = false;
        if (type === 'single') renderSingleChatWindow();
        else renderGroupChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.doSendSingleChat = function(npcId) {
        const input = document.getElementById('singleChatInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };

        if (isAccountBlockedByNpc(npcId, curAcc.id)) {
            pushChatMessageSafe(npcId, { from: 'player', text, time: new Date().toLocaleTimeString().slice(0, 5) }, curAcc.id);
            pushChatMessageSafe(npcId, { from: 'action', text: `消息已被拒收`, time: new Date().toLocaleTimeString().slice(0, 5) }, curAcc.id);
            input.value = '';
            renderSingleChatWindow();
            return;
        }

        pushChatMessageSafe(npcId, { from: 'player', text, time: new Date().toLocaleTimeString().slice(0, 5) }, curAcc.id);
        input.value = '';
        renderSingleChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.doSendGroupChat = function(gid) {
        const input = document.getElementById('groupChatInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: '我' };
        if (!window.G.groupChatHistory[gid]) window.G.groupChatHistory[gid] = [];
        window.G.groupChatHistory[gid].push({
            _id: 'gmsg_' + Date.now() + '_' + (Math.floor(Math.random() * 899) + 100),
            from: 'player', senderName: curAcc.name,
            text, time: new Date().toLocaleTimeString().slice(0, 5)
        });
        syncChatHistoryToLocalBackup();
        input.value = '';
        renderGroupChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // ============================================================
    // 🌐 暴露全局接口
    // ============================================================
    window.renderChatApp = renderChatApp;
    window.renderSocialPanel = renderChatApp;
    window.renderSingleChatWindow = renderSingleChatWindow;
    window.renderGroupChatWindow = renderGroupChatWindow;
    window.renderAvatarBadge = renderAvatarBadge;

    window.openChat = function(npcId) {
        if (!window.G.npcs || !window.G.npcs[npcId]) return;
        window.G.currentChatNpc = npcId;
        _stickerDrawerOpen = false;
        _plusDrawerOpen = false;
        renderChatApp();
    };

    window.closeChat = function() {
        window.G.currentChatNpc = null;
        _stickerDrawerOpen = false;
        _plusDrawerOpen = false;
        renderChatApp();
    };

    window.openGroupChat = function(gid) {
        if (!window.G.groups || !window.G.groups[gid]) return;
        window.G.currentChatGroup = gid;
        _stickerDrawerOpen = false;
        _plusDrawerOpen = false;
        renderChatApp();
    };

    window.closeGroupChat = function() {
        window.G.currentChatGroup = null;
        _stickerDrawerOpen = false;
        _plusDrawerOpen = false;
        renderChatApp();
    };

})();
