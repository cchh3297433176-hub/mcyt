/**
 * js/apps/chat/chat-app.js
 * 💬 微信独立主应用（彻底绝杀4号旧UI穿透 · 仿微信白灰绿质感 · 双语即时翻译 · 仿微信拟真语音条 · 发图三模态）
 */

(function() {
    'use strict';

    const AVATAR_SUBDIR = 'assets/avatars/';
    window._MCYT_AVATAR_SUBDIR = AVATAR_SUBDIR;

    const CUSTOM_NPCS_BACKUP_KEY = 'mcyt_wechat_custom_npcs';
    const CHAT_HISTORY_BACKUP_KEY = 'mcyt_wechat_chathistory_v2';

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
        const pool = window._MCYT_AVATARS_POOL;
        if (Array.isArray(pool) && pool.length > 0) {
            const picked = pool[Math.floor(Math.random() * pool.length)];
            if (picked.startsWith('http') || picked.startsWith('data:') || picked.startsWith('assets/')) {
                return picked;
            }
            return `${AVATAR_SUBDIR}${encodeURIComponent(picked).replace(/%2F/g, '/')}`;
        }
        return 'assets/icons/chat.png';
    }
    window.getRandomAvatar = getRandomAvatar;

    let _activeBottomTab = 'chats';
    let _stickerDrawerOpen = false;
    let _plusDrawerOpen = false;

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

            /* 微信拟真语音条样式 */
            .wechat-voice-bubble {
                display: flex; align-items: center; gap: 8px; min-height: 38px;
                padding: 8px 12px; border-radius: 5px; cursor: pointer; user-select: none;
                transition: background 0.15s, transform 0.1s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .wechat-voice-bubble:active { transform: scale(0.98); opacity: 0.9; }
            .wechat-voice-wave {
                display: flex; align-items: center; gap: 2px; height: 16px;
            }
            .wechat-voice-bar {
                width: 2.5px; background: currentColor; border-radius: 2px;
            }
            .wechat-voice-bar:nth-child(1) { height: 6px; }
            .wechat-voice-bar:nth-child(2) { height: 12px; }
            .wechat-voice-bar:nth-child(3) { height: 16px; }

            /* 微信双语即时翻译面板 */
            .wechat-translation-box {
                margin-top: 6px; padding-top: 6px; border-top: 0.5px dashed #d5d5d5;
                font-size: 13.5px; color: #222; line-height: 1.45; animation: wechatFadeIn 0.2s ease-out;
            }
            @keyframes wechatFadeIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
            .wechat-trans-tag {
                font-size: 10px; color: #999; margin-bottom: 2px; display: flex; align-items: center; gap: 4px;
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
        if (!window.G._activeTranslations) window.G._activeTranslations = {};
        if (!window.G._voicePlayingDesc) window.G._voicePlayingDesc = {};

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
            if (!npc.relationshipStage) npc.relationshipStage = (npc.isDating ? 'dating' : 'friend');
            if (!npc.avatarUrl || npc.avatarUrl === 'assets/icons/chat.png') {
                npc.avatarUrl = getRandomAvatar();
            }
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
        let url = (obj && obj.isPlayer) ? curAcc.avatar : (obj?.avatarUrl || getRandomAvatar());
        if (!url) url = 'assets/icons/chat.png';
        return `<div style="width:${size}px;height:${size}px;border-radius:6px;overflow:hidden;background:#e9e9e9;flex-shrink:0;box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.06);">
            <img src="${url}" draggable="false" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.onerror=null;this.src='assets/icons/chat.png';" />
        </div>`;
    }

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

    function formatTokenString(tokens) {
        if (tokens >= 1000) return (tokens / 1000).toFixed(1) + 'k';
        return tokens.toString();
    }

    /**
     * 高级气泡切分器（支持解析双语 [MSG original="..."] 与拟真语音 [VOICE seconds="..." audio_bg="..."]）
     */
    function parseAIReplyEntities(rawText) {
        if (!rawText) return [];
        const clean = (typeof stripThought === 'function') ? stripThought(rawText).trim() : rawText.trim();
        if (!clean) return [];

        const entities = [];

        // 1. 匹配拟真语音标签 [VOICE seconds="5" audio_bg="..."]正文[/VOICE]
        const voiceRegex = /\[VOICE(?:\s+seconds="?(\d+)"?)?(?:\s+audio_bg="?([^"]*)"?)?\]([\s\S]*?)\[\/VOICE\]/gi;
        let vMatch;
        let lastIdx = 0;
        let tempText = clean;

        while ((vMatch = voiceRegex.exec(clean)) !== null) {
            const sec = parseInt(vMatch[1]) || Math.min(60, Math.max(2, Math.round((vMatch[3] || '').length * 0.4)));
            const bg = (vMatch[2] || '').trim();
            const text = (vMatch[3] || '').trim();
            entities.push({
                type: 'voice',
                seconds: sec,
                audioBg: bg,
                text: text
            });
        }

        // 2. 匹配标准微信短消息标签（含双语）
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

        if (entities.length > 0) return entities.slice(0, 4);

        // 3. 兜底分段
        const lines = clean.split(/\n+/).map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) {
            return lines.slice(0, 3).map(l => ({ type: 'text', text: l }));
        }

        return [{ type: 'text', text: clean }];
    }

    // 微信"消息"主列表构建
    function buildChatListHTML() {
        const isDirect = window.G.chatActiveTab !== 'group';

        if (isDirect) {
            const npcList = Object.values(window.G.npcs || {});
            if (npcList.length === 0) {
                return `
                <div style="text-align:center;color:#b2b2b2;padding:60px 16px;font-size:13px;line-height:1.8;">
                    <b>暂无联系人</b><br>
                    点击右上角「+」添加好友，开启活人感对话！
                </div>`;
            }

            const rows = npcList.map(npc => {
                const history = getAccountChatHistory(npc.id);
                const last = history.length ? history[history.length - 1] : null;
                let preview = '暂无消息，点击开始聊天';
                if (last) {
                    if (last.type === 'voice') preview = `[语音] ${last.seconds || 3}"`;
                    else if (last.sharedMoment) preview = '[分享了一条动态]';
                    else if (last.stickerUrl) preview = '[表情]';
                    else if (last.imageUrl) preview = '[图片]';
                    else preview = String(last.originalText || last.text || '').replace(/\n+/g, ' ').slice(0, 24) || '[消息]';
                    if (last.from === 'player') preview = '我：' + preview;
                }
                const timeLabel = last ? String(last.time || '').slice(0, 5) : '';
                const blocked = (typeof isAccountBlockedByNpc === 'function') ? isAccountBlockedByNpc(npc.id) : false;
                const isDating = window.ChatPromptEngine && window.ChatPromptEngine.isNpcInDatingRelationship(npc);
                return { npc, last, preview, timeLabel, blocked, isDating };
            }).sort((a, b) => {
                const ta = a.last ? Number(String(a.last._id || '').split('_')[1]) || 0 : 0;
                const tb = b.last ? Number(String(b.last._id || '').split('_')[1]) || 0 : 0;
                return tb - ta;
            });

            return rows.map(({ npc, preview, timeLabel, blocked, isDating }) => `
                <div class="chat-item" data-npc-id="${npc.id}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:0.5px solid #ededed;cursor:pointer;background:#fff;">
                    ${renderAvatarBadge(npc, 46)}
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div style="display:flex;align-items:center;gap:4px;overflow:hidden;">
                                <span style="font-size:14.5px;font-weight:500;color:#181818;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(npc.name || npc.id)}</span>
                                ${isDating ? `<span style="font-size:10px;background:#ffeef0;color:#ff4d4f;padding:1px 5px;border-radius:3px;font-weight:600;flex-shrink:0;">恋人</span>` : ''}
                            </div>
                            <span style="font-size:10.5px;color:#b2b2b2;flex-shrink:0;margin-left:6px;">${timeLabel}</span>
                        </div>
                        <div style="font-size:12px;color:${blocked ? '#fa5151' : '#999999'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${blocked ? '（已被对方拉黑）' : escapeHtml(preview)}</div>
                    </div>
                </div>
            `).join('');
        }

        const groupList = Object.entries(window.G.groups || {}).map(([gid, g]) => Object.assign({ id: gid }, g));
        if (groupList.length === 0) {
            return `
            <div style="text-align:center;color:#b2b2b2;padding:60px 16px;font-size:13px;line-height:1.8;">
                <b>暂无群聊</b><br>
                点击右上角「+」发起群聊吧！
            </div>`;
        }

        const groupRows = groupList.map(g => {
            const history = (window.G.groupChatHistory && window.G.groupChatHistory[g.id]) || [];
            const last = history.length ? history[history.length - 1] : null;
            let preview = '暂无消息';
            if (last) {
                if (last.type === 'voice') preview = `[语音] ${last.seconds || 3}"`;
                else preview = String(last.text || '[消息]').replace(/\n+/g, ' ').slice(0, 24);
                if (last.senderName) preview = `${last.senderName}：${preview}`;
            }
            const timeLabel = last ? String(last.time || '').slice(0, 5) : '';
            return { g, preview, timeLabel, last };
        }).sort((a, b) => {
            const ta = a.last ? Number(String(a.last._id || '').split('_')[1]) || 0 : 0;
            const tb = b.last ? Number(String(b.last._id || '').split('_')[1]) || 0 : 0;
            return tb - ta;
        });

        return groupRows.map(({ g, preview, timeLabel }) => `
            <div class="group-item" data-group-id="${g.id}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:0.5px solid #ededed;cursor:pointer;background:#fff;">
                ${renderAvatarBadge(g, 46)}
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:14.5px;font-weight:500;color:#181818;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(g.name || g.id)}</span>
                        <span style="font-size:10.5px;color:#b2b2b2;flex-shrink:0;margin-left:6px;">${timeLabel}</span>
                    </div>
                    <div style="font-size:12px;color:#999999;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${escapeHtml(preview)}</div>
                </div>
            </div>
        `).join('');
    }

    // 微信 App 整体调度中枢
    function renderChatApp(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const appModal = document.getElementById('appModal');
        if (appModal) appModal.classList.add('wechat-seamless-shell');

        const legacyWrap = document.querySelector('#socialTab .phone-app-wrap');
        if (legacyWrap) legacyWrap.remove();

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

    window.openAddChatTargetModal = function() {
        const reqCount = (window.G.friendRequests || []).length + (window.G.groupInvites || []).length;
        let mask = document.createElement('div');
        mask.className = 'wechat-action-sheet-mask';
        mask.innerHTML = `
            <div class="wechat-action-sheet-box">
                <div class="wechat-action-item" onclick="window.openCreateCustomNpcModal()">添加 / 自建联系人</div>
                <div class="wechat-action-item" onclick="window.openCreateGroupModal()">发起群聊</div>
                <div class="wechat-action-item" onclick="window.openSocialRequestsModal()">新的朋友与群邀请 ${reqCount > 0 ? `<span style="color:#fa5151;font-weight:600;">(${reqCount})</span>` : ''}</div>
                <div class="wechat-action-cancel" onclick="this.closest('.wechat-action-sheet-mask').remove()">取消</div>
            </div>
        `;
        document.body.appendChild(mask);
    };

    window.openCreateCustomNpcModal = function() {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        openWechatCleanModal('添加自建联系人', `
            <div style="display:flex;flex-direction:column;gap:10px;text-align:left;">
                <div>
                    <label style="font-size:12px;color:#666;">联系人昵称</label>
                    <input type="text" id="wcleanNewNpcName" placeholder="例如：Technoblade / 派蒙" class="wechat-clean-input" style="margin-top:3px;">
                </div>
                <div>
                    <label style="font-size:12px;color:#666;">常驻地区 / 时区</label>
                    <select id="wcleanNewNpcRegion" class="wechat-clean-input" style="margin-top:3px;">
                        <option value="中国">中国</option>
                        <option value="美国 - 东部">美国 - 东部</option>
                        <option value="美国 - 西部">美国 - 西部</option>
                        <option value="英国">英国</option>
                        <option value="日本">日本</option>
                        <option value="韩国">韩国</option>
                        <option value="加拿大">加拿大</option>
                        <option value="澳大利亚">澳大利亚</option>
                        <option value="德国">德国</option>
                        <option value="法国">法国</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px;color:#666;">人设档案 / 说话风格</label>
                    <textarea id="wcleanNewNpcPersona" rows="4" placeholder="例如：性格高冷，Minecraft PVP技术天花板，毒舌但很讲义气..." class="wechat-clean-input" style="margin-top:3px;resize:none;line-height:1.4;"></textarea>
                </div>
            </div>
        `, () => {
            const name = document.getElementById('wcleanNewNpcName').value.trim();
            if (!name) {
                if (typeof showToast === 'function') showToast('请填写联系人昵称', 'error');
                return false;
            }
            const region = document.getElementById('wcleanNewNpcRegion').value;
            const persona = document.getElementById('wcleanNewNpcPersona').value.trim() || 'MC好友同伴。';
            const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
            const newId = 'custom_' + Date.now();

            if (!window.G.npcs) window.G.npcs = {};
            window.G.npcs[newId] = {
                id: newId,
                name: name,
                region: region,
                persona: persona,
                favor: 50,
                relationshipStage: 'friend',
                avatarUrl: getRandomAvatar(),
                isCustom: true,
                ownerAccountId: curAcc.id
            };

            syncCustomNpcsToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            if (typeof showToast === 'function') showToast('已成功添加联系人', 'success', 1200);
            renderChatApp();
        });
    };

    window.openCreateGroupModal = function() {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        const npcs = Object.values(window.G.npcs || {});
        if (npcs.length === 0) {
            if (typeof showToast === 'function') showToast('暂无可选联系人，请先添加', 'info');
            return;
        }

        const listHtml = npcs.map(n => `
            <label style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:0.5px solid #f2f2f2;cursor:pointer;">
                <input type="checkbox" class="wclean-grp-chk" value="${n.id}" style="accent-color:#07c160;width:16px;height:16px;">
                ${renderAvatarBadge(n, 32)}
                <span style="font-size:13.5px;color:#181818;">${escapeHtml(n.name)}</span>
            </label>
        `).join('');

        openWechatCleanModal('发起群聊', `
            <div style="display:flex;flex-direction:column;gap:8px;text-align:left;">
                <input type="text" id="wcleanNewGroupName" placeholder="群聊名称..." class="wechat-clean-input">
                <div style="font-size:12px;color:#888;margin-top:4px;">选择群成员：</div>
                <div style="max-height:180px;overflow-y:auto;padding-right:4px;">
                    ${listHtml}
                </div>
            </div>
        `, () => {
            const name = document.getElementById('wcleanNewGroupName').value.trim() || '我的MC小群';
            const chks = Array.from(document.querySelectorAll('.wclean-grp-chk:checked')).map(c => c.value);
            if (chks.length === 0) {
                if (typeof showToast === 'function') showToast('请至少选择一位群成员', 'error');
                return false;
            }

            const gid = 'group_' + Date.now();
            if (!window.G.groups) window.G.groups = {};
            window.G.groups[gid] = {
                id: gid,
                name: name,
                members: chks,
                avatarUrl: getRandomAvatar()
            };
            if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
            window.G.groupChatHistory[gid] = [];

            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            if (typeof showToast === 'function') showToast('群聊已建立', 'success', 1200);
            window.G.chatActiveTab = 'group';
            renderChatApp();
        });
    };

    window.openSocialRequestsModal = function() {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        const fReqs = window.G.friendRequests || [];
        const gInvs = window.G.groupInvites || [];

        if (fReqs.length === 0 && gInvs.length === 0) {
            openWechatCleanModal('申请与邀请', `<div style="text-align:center;color:#999;padding:20px 0;font-size:13px;">暂无新的申请或群邀请</div>`, () => {});
            return;
        }

        let bodyHtml = '<div style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">';

        fReqs.forEach((r, idx) => {
            bodyHtml += `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:#f9f9f9;border-radius:6px;">
                <div style="font-size:12.5px;color:#181818;">
                    <b>${escapeHtml(r.name || '玩家')}</b> 请求添加好友<br>
                    <span style="font-size:11px;color:#888;">${escapeHtml(r.reason || '想跟你一起玩MC')}</span>
                </div>
                <div style="display:flex;gap:6px;">
                    <button onclick="window.handleFriendRequestAction(${idx}, true)" style="border:none;background:#07c160;color:#fff;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">接受</button>
                    <button onclick="window.handleFriendRequestAction(${idx}, false)" style="border:none;background:#e5e5e5;color:#555;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">忽略</button>
                </div>
            </div>`;
        });

        gInvs.forEach((inv, idx) => {
            bodyHtml += `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:#f9f9f9;border-radius:6px;">
                <div style="font-size:12.5px;color:#181818;">
                    邀请加入群聊 <b>${escapeHtml(inv.groupName || 'MC开黑群')}</b>
                </div>
                <div style="display:flex;gap:6px;">
                    <button onclick="window.handleGroupInviteAction(${idx}, true)" style="border:none;background:#07c160;color:#fff;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">加入</button>
                    <button onclick="window.handleGroupInviteAction(${idx}, false)" style="border:none;background:#e5e5e5;color:#555;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">忽略</button>
                </div>
            </div>`;
        });

        bodyHtml += '</div>';

        openWechatCleanModal('新的申请与邀请', bodyHtml, () => {});
    };

    window.handleFriendRequestAction = function(idx, accept) {
        document.querySelector('.wechat-clean-modal-mask')?.remove();
        const req = (window.G.friendRequests || [])[idx];
        if (req) {
            if (accept) {
                const nid = 'npc_req_' + Date.now();
                if (!window.G.npcs) window.G.npcs = {};
                window.G.npcs[nid] = {
                    id: nid,
                    name: req.name || '新好友',
                    region: '中国',
                    persona: req.persona || '一位热情的游戏粉丝。',
                    favor: 50,
                    relationshipStage: 'friend',
                    avatarUrl: getRandomAvatar(),
                    isCustom: true
                };
                syncCustomNpcsToLocalBackup();
                if (typeof showToast === 'function') showToast('已添加新好友', 'success', 1200);
            }
            window.G.friendRequests.splice(idx, 1);
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            renderChatApp();
        }
    };

    window.handleGroupInviteAction = function(idx, accept) {
        document.querySelector('.wechat-clean-modal-mask')?.remove();
        const inv = (window.G.groupInvites || [])[idx];
        if (inv) {
            if (accept) {
                const gid = 'group_inv_' + Date.now();
                if (!window.G.groups) window.G.groups = {};
                window.G.groups[gid] = {
                    id: gid,
                    name: inv.groupName || 'MC探险群',
                    members: inv.members || [],
                    avatarUrl: getRandomAvatar()
                };
                if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
                window.G.groupChatHistory[gid] = [];
                if (typeof showToast === 'function') showToast('已加入群聊', 'success', 1200);
            }
            window.G.groupInvites.splice(idx, 1);
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            renderChatApp();
        }
    };

    // 角色名片页
    window.openNpcProfileCardModal = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        const isDating = window.ChatPromptEngine && window.ChatPromptEngine.isNpcInDatingRelationship(npc);
        const personaText = npc.persona || '';
        const previewPersona = personaText ? personaText.slice(0, 85) + (personaText.length > 85 ? '...' : '') : '暂无详细人设档案，点击此处补充';

        let mask = document.createElement('div');
        mask.className = 'wechat-clean-modal-mask';
        mask.innerHTML = `
            <div class="wechat-clean-modal-card" style="max-width:340px;padding:20px;">
                <div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid #f0f0f0;padding-bottom:14px;margin-bottom:12px;">
                    <div style="position:relative;width:56px;height:56px;cursor:pointer;" onclick="window.triggerChangeNpcAvatar('${npcId}')" title="点击更换头像">
                        <img id="npcCardAvatarDisplay" src="${npc.avatarUrl || getRandomAvatar()}" style="width:100%;height:100%;border-radius:6px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';" />
                        <div style="position:absolute;bottom:0;right:0;background:rgba(0,0,0,0.5);border-radius:2px 0 6px 0;width:16px;height:16px;display:flex;align-items:center;justify-content:center;">
                            <svg viewBox="0 0 24 24" style="width:10px;height:10px;fill:#ffffff;"><path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>
                        </div>
                    </div>
                    <div style="flex:1;">
                        <div onclick="window.openEditNpcNameModal('${npcId}')" style="font-size:16px;font-weight:600;color:#181818;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                            <span>${escapeHtml(npc.name)}</span>
                            <span style="font-size:11px;color:#07c160;">✎</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#666;margin-top:4px;flex-wrap:wrap;">
                            <span onclick="window.openPickNpcRegionForCard('${npcId}')" style="cursor:pointer;background:#f2f2f2;padding:2px 6px;border-radius:4px;color:#333;">
                                ${escapeHtml(npc.region || '中国')} ▾
                            </span>
                            <span onclick="window.openEditNpcFavorModal('${npcId}')" style="cursor:pointer;background:#f2f2f2;padding:2px 6px;border-radius:4px;color:#07c160;font-weight:600;">
                                好感 ${npc.favor || 50} ✎
                            </span>
                        </div>
                    </div>
                </div>

                <!-- 恋爱状态栏 -->
                <div style="display:flex;align-items:center;justify-content:space-between;background:#fbfbfb;border:0.5px solid #eaeaea;border-radius:6px;padding:8px 10px;margin-bottom:12px;">
                    <div style="font-size:12px;color:#444;">
                        当前关系：<b style="color:${isDating ? '#ff4d4f' : (npc.favor >= 80 ? '#fa8c16' : '#666')};">${isDating ? '恋人（交往中）' : (npc.favor >= 80 ? '暧昧试探期' : '普通朋友')}</b>
                    </div>
                    <button type="button" onclick="window.toggleNpcRelationshipStage('${npcId}')" style="border:none;background:${isDating ? '#fff1f0' : '#f0f9eb'};color:${isDating ? '#ff4d4f' : '#07c160'};padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;">
                        ${isDating ? '解除恋人' : '确立恋爱'}
                    </button>
                </div>

                <div style="background:#f8faf8;border-radius:6px;border:1px solid #e8ede8;padding:10px;margin-bottom:14px;cursor:pointer;" onclick="window.openEditNpcPersonaModal('${npcId}')">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:12px;font-weight:600;color:#333;">角色人设档案</span>
                        <span style="font-size:11px;color:#07c160;font-weight:500;">点击修改 ›</span>
                    </div>
                    <div style="font-size:12px;color:#666;line-height:1.5;white-space:pre-wrap;word-break:break-word;max-height:60px;overflow:hidden;">
                        ${escapeHtml(previewPersona)}
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;">
                    <button type="button" id="btnNpcCardSendMsg" style="border:none;background:#07c160;color:#fff;padding:9px;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;text-align:center;">
                        发消息
                    </button>
                    <button type="button" id="btnNpcCardBack" style="border:none;background:#f0f0f0;color:#555;padding:8px;border-radius:6px;font-size:13px;cursor:pointer;">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(mask);
        const close = () => { if (mask && mask.parentNode) mask.parentNode.removeChild(mask); };
        mask.querySelector('#btnNpcCardBack').onclick = close;
        mask.querySelector('#btnNpcCardSendMsg').onclick = () => {
            close();
            window.openChat(npcId);
        };
    };

    window.toggleNpcRelationshipStage = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        const isDating = window.ChatPromptEngine && window.ChatPromptEngine.isNpcInDatingRelationship(npc);

        if (isDating) {
            npc.relationshipStage = 'friend';
            npc.isDating = false;
            if (typeof showToast === 'function') showToast('已恢复为朋友关系，恋人模式关闭', 'info', 1200);
        } else {
            if ((npc.favor || 0) < 80) {
                if (typeof showToast === 'function') showToast('好感度需达到 80 且双方暧昧才可确立恋人', 'error', 1500);
                return;
            }
            npc.relationshipStage = 'dating';
            npc.isDating = true;
            if (typeof showToast === 'function') showToast('已正式确立恋爱关系！恋人专属规范生效', 'success', 1500);
        }

        syncCustomNpcsToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        document.querySelector('.wechat-clean-modal-mask')?.remove();
        window.openNpcProfileCardModal(npcId);
    };

    window.triggerChangeNpcAvatar = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        let mask = document.createElement('div');
        mask.className = 'wechat-action-sheet-mask';
        mask.innerHTML = `
            <div class="wechat-action-sheet-box">
                <label class="wechat-action-item" style="display:block;cursor:pointer;">
                    <span>从相册选择新头像</span>
                    <input type="file" id="localNpcAvatarInput" accept="image/*" style="display:none;">
                </label>
                <div class="wechat-action-item" onclick="window._randomNpcAvatar('${npcId}')">随机头像池挑选</div>
                <div class="wechat-action-cancel" onclick="this.closest('.wechat-action-sheet-mask').remove()">取消</div>
            </div>
        `;
        document.body.appendChild(mask);
        setTimeout(() => {
            const input = document.getElementById('localNpcAvatarInput');
            if (input) {
                input.onchange = (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        npc.avatarUrl = evt.target.result;
                        syncCustomNpcsToLocalBackup();
                        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                        document.querySelector('.wechat-action-sheet-mask')?.remove();
                        const disp = document.getElementById('npcCardAvatarDisplay');
                        if (disp) disp.src = npc.avatarUrl;
                        if (typeof showToast === 'function') showToast('头像已更换', 'success', 1200);
                    };
                    reader.readAsDataURL(file);
                };
            }
        }, 30);
    };

    window._randomNpcAvatar = function(npcId) {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        if (!Array.isArray(window._MCYT_AVATARS_POOL) || window._MCYT_AVATARS_POOL.length === 0) {
            initAvatarPool();
        }

        const newAvatar = getRandomAvatar();
        npc.avatarUrl = newAvatar;
        syncCustomNpcsToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        const disp = document.getElementById('npcCardAvatarDisplay');
        if (disp) disp.src = npc.avatarUrl;
        if (typeof showToast === 'function') showToast('已随机更换头像', 'success', 1200);
    };

    window.openEditNpcNameModal = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        openWechatCleanModal('更改角色名字', `
            <input type="text" id="wcleanNameInput" value="${escapeHtml(npc.name)}" class="wechat-clean-input">
        `, () => {
            const val = document.getElementById('wcleanNameInput').value.trim();
            if (!val) return false;
            npc.name = val;
            syncCustomNpcsToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            window.openNpcProfileCardModal(npcId);
            if (typeof showToast === 'function') showToast('名字已更新', 'success', 1200);
        });
    };

    window.openPickNpcRegionForCard = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        const list = ['中国', '美国 - 东部', '美国 - 西部', '英国', '日本', '韩国', '加拿大', '澳大利亚', '德国', '法国'];
        let optionsHtml = list.map(item => `
            <div class="wechat-action-item" onclick="window._setNpcRegionDirect('${npcId}', '${item}')">${item}</div>
        `).join('');

        let mask = document.createElement('div');
        mask.className = 'wechat-action-sheet-mask';
        mask.innerHTML = `
            <div class="wechat-action-sheet-box">
                <div style="max-height:260px;overflow-y:auto;">${optionsHtml}</div>
                <div class="wechat-action-cancel" onclick="this.closest('.wechat-action-sheet-mask').remove()">取消</div>
            </div>
        `;
        document.body.appendChild(mask);
    };

    window._setNpcRegionDirect = function(npcId, region) {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        const npc = window.G.npcs[npcId];
        if (npc) {
            npc.region = region;
            syncCustomNpcsToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            window.openNpcProfileCardModal(npcId);
        }
    };

    window.openEditNpcFavorModal = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        openWechatCleanModal('修改好感度 (0~100)', `
            <div style="display:flex;align-items:center;gap:12px;padding:6px 0;">
                <input type="range" id="wcleanFavorRange" min="0" max="100" value="${npc.favor || 50}" style="flex:1;">
                <span id="wcleanFavorDisplay" style="font-size:15px;font-weight:700;color:#07c160;min-width:32px;text-align:right;">${npc.favor || 50}</span>
            </div>
        `, () => {
            const r = document.getElementById('wcleanFavorRange');
            npc.favor = parseInt(r.value) || 0;
            if (npc.favor < 60 && npc.relationshipStage === 'dating') {
                npc.relationshipStage = 'friend';
                npc.isDating = false;
            }
            syncCustomNpcsToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            window.openNpcProfileCardModal(npcId);
            if (typeof showToast === 'function') showToast('好感度已调整', 'success', 1200);
        });
        setTimeout(() => {
            const r = document.getElementById('wcleanFavorRange');
            const d = document.getElementById('wcleanFavorDisplay');
            if (r && d) r.oninput = () => { d.textContent = r.value; };
        }, 30);
    };

    window.openEditNpcPersonaModal = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        openWechatCleanModal('编辑角色人设', `
            <textarea id="wcleanPersonaInput" rows="7" class="wechat-clean-input" style="line-height:1.5;resize:none;">${escapeHtml(npc.persona || '')}</textarea>
        `, () => {
            npc.persona = document.getElementById('wcleanPersonaInput').value.trim();
            syncCustomNpcsToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            window.openNpcProfileCardModal(npcId);
            if (typeof showToast === 'function') showToast('人设已更新', 'success', 1200);
        });
    };

    // 双语点击即时翻译切换
    window.toggleMessageTranslation = function(msgId) {
        if (!window.G._activeTranslations) window.G._activeTranslations = {};
        window.G._activeTranslations[msgId] = !window.G._activeTranslations[msgId];
        if (window.G.currentChatNpc) renderSingleChatWindow();
        else if (window.G.currentChatGroup) renderGroupChatWindow();
    };

    // 拟真语音条点击展开声学环境与文字
    window.toggleVoiceMessageDetails = function(msgId) {
        if (!window.G._voicePlayingDesc) window.G._voicePlayingDesc = {};
        window.G._voicePlayingDesc[msgId] = !window.G._voicePlayingDesc[msgId];
        if (window.G.currentChatNpc) renderSingleChatWindow();
        else if (window.G.currentChatGroup) renderGroupChatWindow();
    };

    // 单人私聊窗口渲染
    function renderSingleChatWindow(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const legacyWrap = document.querySelector('#socialTab .phone-app-wrap');
        if (legacyWrap) legacyWrap.remove();

        const npcId = window.G.currentChatNpc;
        const npc = window.G.npcs[npcId];
        if (!npc) { window.closeChat(); return; }

        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', region: '中国' };
        const isBlocked = isAccountBlockedByNpc(npcId, curAcc.id);
        const chatHist = getAccountChatHistory(npcId, curAcc.id);
        const isBehindActive = !!window.G._behindScreenActive[npcId];

        const tokensCount = calculateHistoryTokens(chatHist);
        const tokenDisplay = formatTokenString(tokensCount);

        let messagesHtml = '';
        for (const msg of chatHist) {
            const isSelf = msg.from === 'player';

            if (msg.from === 'action') {
                messagesHtml += `
                <div style="text-align:center;margin:8px 0;">
                    <span style="display:inline-block;background:rgba(0,0,0,0.05);color:#888;padding:3px 10px;border-radius:4px;font-size:11.5px;max-width:85%;">${escapeHtml(msg.text || '')}</span>
                </div>`;
            } else if (msg.from === 'behind_screen') {
                messagesHtml += `
                <div style="margin:8px 12px;background:#ffffff;border:1px dashed #dcdcdc;padding:8px 12px;border-radius:6px;font-size:12px;color:#555;line-height:1.5;">
                    <span style="font-weight:600;color:#181818;">动作感知：</span>${escapeHtml(msg.text || '')}
                </div>`;
            } else if (msg.type === 'voice') {
                // 拟真语音条
                const seconds = Math.min(60, Math.max(1, parseInt(msg.seconds) || 3));
                const bubbleWidth = Math.min(220, 68 + seconds * 4.5);
                const isOpenDesc = !!(window.G._voicePlayingDesc && window.G._voicePlayingDesc[msg._id]);

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        <div class="wechat-voice-bubble" onclick="window.toggleVoiceMessageDetails('${msg._id}')" style="width:${bubbleWidth}px;background:${isSelf ? '#95ec69' : '#ffffff'};color:${isSelf ? '#111' : '#222'};justify-content:${isSelf ? 'flex-end' : 'flex-start'};">
                            ${!isSelf ? `
                                <div class="wechat-voice-wave" style="color:#444;">
                                    <div class="wechat-voice-bar"></div><div class="wechat-voice-bar"></div><div class="wechat-voice-bar"></div>
                                </div>
                                <span style="font-size:13px;font-weight:600;margin-left:4px;">${seconds}"</span>
                            ` : `
                                <span style="font-size:13px;font-weight:600;margin-right:4px;">${seconds}"</span>
                                <div class="wechat-voice-wave" style="color:#222;transform:scaleX(-1);">
                                    <div class="wechat-voice-bar"></div><div class="wechat-voice-bar"></div><div class="wechat-voice-bar"></div>
                                </div>
                            `}
                        </div>

                        ${isOpenDesc ? `
                        <div style="margin-top:5px;background:#ffffff;border:0.5px solid #e0e0e0;border-radius:6px;padding:7px 10px;font-size:12px;color:#333;line-height:1.45;box-shadow:0 1px 3px rgba(0,0,0,0.04);max-width:240px;">
                            ${msg.audioBg ? `<div style="color:#888;font-size:11px;margin-bottom:3px;font-style:italic;">（${escapeHtml(msg.audioBg)}）</div>` : ''}
                            <div><span style="color:#07c160;font-weight:600;">转文字：</span>${escapeHtml(msg.text || '')}</div>
                        </div>
                        ` : ''}

                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else if (msg.type === 'image_text_only') {
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" style="background:${isSelf ? '#95ec69' : '#ffffff'};padding:8px 12px;border-radius:5px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:13.5px;line-height:1.5;cursor:pointer;border-left:3px solid #07c160;">
                            <div style="font-size:11px;color:#555;font-weight:600;margin-bottom:2px;">[画面描述]</div>
                            <div>${escapeHtml(msg.imageDesc || msg.text || '')}</div>
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else if (msg.type === 'image' || msg.imageUrl) {
                const imgSrc = msg.imageUrl || msg.url;
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:65%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" style="background:#fff;padding:3px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.06);cursor:pointer;">
                            <img src="${imgSrc}" style="max-width:180px;max-height:220px;border-radius:4px;object-fit:cover;display:block;" />
                            ${msg.imageDesc ? `<div style="font-size:11px;color:#666;padding:4px 6px;">${escapeHtml(msg.imageDesc)}</div>` : ''}
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else if (msg.type === 'sticker' && msg.stickerUrl) {
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
                // 普通文本气泡（带双语点击折叠翻译支持）
                const hasOriginal = !!msg.originalText;
                const isTransOpen = !!(window.G._activeTranslations && window.G._activeTranslations[msg._id]);
                const displayMainText = hasOriginal ? msg.originalText : msg.text;
                let bubbleBody = isSelf ? escapeHtml(displayMainText || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(displayMainText || '') : escapeHtml(displayMainText || ''));

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? '#95ec69' : '#ffffff'};color:#111;padding:8px 12px;border-radius:5px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:14.5px;line-height:1.5;word-break:break-word;cursor:pointer;">
                            <div>${bubbleBody}</div>

                            ${hasOriginal && isTransOpen ? `
                            <div class="wechat-translation-box">
                                <div class="wechat-trans-tag">
                                    <svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M5 8l6 6M11 8L5 14M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/></svg>
                                    <span>微信翻译</span>
                                </div>
                                <div>${escapeHtml(msg.text || '')}</div>
                            </div>
                            ` : ''}
                        </div>

                        <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
                            ${hasOriginal ? `
                            <span onclick="window.toggleMessageTranslation('${msg._id}')" style="font-size:10px;color:#07c160;cursor:pointer;user-select:none;">
                                ${isTransOpen ? '收起翻译' : '翻译'}
                            </span>
                            ` : ''}
                            <span style="font-size:10px;color:#bbb;">${msg.time || ''}</span>
                        </div>
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
                    <span style="background:#e0e0e0;color:#666;font-size:10px;padding:1px 5px;border-radius:3px;margin-left:4px;font-weight:normal;white-space:nowrap;">
                        ${tokenDisplay}t
                    </span>
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                    <button onclick="window.toggleBehindScreen('${npcId}')" style="border:0.5px solid ${isBehindActive ? '#07c160' : '#ccc'};background:${isBehindActive ? '#d4f5dd' : '#fff'};color:${isBehindActive ? '#07c160' : '#555'};width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="动作感知">
                        <svg viewBox="0 0 24 24" style="width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button id="btnChatLightningTrigger" onclick="window.triggerAIReplyForSingle('${npcId}')" style="border:none;background:#07c160;color:#fff;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="生成回复">
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

            <!-- 微信标准输入栏：支持极简拟真语音与文字输入 -->
            <div style="padding:8px 10px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;gap:8px;align-items:center;flex-shrink:0;">
                <button onclick="window.openVoiceInputModal('single','${npcId}')" title="发送语音" style="border:none;background:none;width:28px;height:28px;cursor:pointer;flex-shrink:0;padding:0;display:flex;align-items:center;justify-content:center;color:#555;">
                    <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </button>

                <button onclick="window.toggleChatPlusDrawer('single','${npcId}')" title="更多功能" style="border:none;background:none;width:28px;height:28px;cursor:pointer;flex-shrink:0;padding:0;display:flex;align-items:center;justify-content:center;">
                    <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#555;stroke-width:1.8;stroke-linecap:round;"><circle cx="12" cy="12" r="9.5"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                </button>

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

                <button onclick="window.doSendSingleChat('${npcId}')" style="border:none;background:#07c160;color:#fff;padding:6px 13px;border-radius:4px;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;">发送</button>
            </div>
        </div>
        `;
        container.innerHTML = html;

        const msgArea = document.getElementById('chatMessageArea');
        if (msgArea) setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 50);

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

    // 拟真语音输入弹窗
    window.openVoiceInputModal = function(type, id) {
        openWechatCleanModal('发送模拟语音消息', `
            <div style="display:flex;flex-direction:column;gap:10px;text-align:left;">
                <div style="font-size:12px;color:#666;">输入你想以语音说出的话（系统自动换算微信秒数）：</div>
                <textarea id="wcleanVoiceTextInput" rows="3" placeholder="例如：我刚回到家，今天真是累死我了..." class="wechat-clean-input" style="line-height:1.4;resize:none;"></textarea>
            </div>
        `, () => {
            const text = document.getElementById('wcleanVoiceTextInput').value.trim();
            if (!text) return false;
            const seconds = Math.min(60, Math.max(2, Math.round(text.length * 0.45)));
            const time = new Date().toLocaleTimeString().slice(0, 5);
            const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };

            const msgObj = {
                from: 'player',
                type: 'voice',
                seconds,
                text,
                senderName: curAcc.name,
                time
            };

            if (type === 'single') {
                pushChatMessageSafe(id, msgObj, curAcc.id);
                renderSingleChatWindow();
            } else {
                if (!window.G.groupChatHistory[id]) window.G.groupChatHistory[id] = [];
                window.G.groupChatHistory[id].push(msgObj);
                renderGroupChatWindow();
            }

            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        });
    };

    // 多人群聊窗口渲染
    function renderGroupChatWindow(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const gid = window.G.currentChatGroup;
        const group = window.G.groups && window.G.groups[gid];
        if (!group) { window.closeGroupChat(); return; }

        const history = (window.G.groupChatHistory && window.G.groupChatHistory[gid]) || [];
        const memberCount = (group.members || []).length + 1;

        let messagesHtml = '';
        for (const msg of history) {
            const isSelf = msg.from === 'player';
            const senderNpc = (!isSelf && msg.senderId) ? window.G.npcs[msg.senderId] : null;
            const senderName = isSelf ? '我' : (msg.senderName || senderNpc?.name || '群友');
            const avatarObj = isSelf ? { isPlayer: true } : (senderNpc || { avatarUrl: getRandomAvatar() });

            if (msg.type === 'voice') {
                const seconds = Math.min(60, Math.max(1, parseInt(msg.seconds) || 3));
                const bubbleWidth = Math.min(220, 68 + seconds * 4.5);
                const isOpenDesc = !!(window.G._voicePlayingDesc && window.G._voicePlayingDesc[msg._id]);

                messagesHtml += `
                <div class="chat-msg-row" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                    <div style="max-width:65%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${!isSelf ? `<div style="font-size:11px;color:#888;margin-bottom:2px;">${escapeHtml(senderName)}</div>` : ''}
                        <div class="wechat-voice-bubble" onclick="window.toggleVoiceMessageDetails('${msg._id}')" style="width:${bubbleWidth}px;background:${isSelf ? '#95ec69' : '#ffffff'};color:${isSelf ? '#111' : '#222'};justify-content:${isSelf ? 'flex-end' : 'flex-start'};">
                            ${!isSelf ? `
                                <div class="wechat-voice-wave" style="color:#444;"><div class="wechat-voice-bar"></div><div class="wechat-voice-bar"></div><div class="wechat-voice-bar"></div></div>
                                <span style="font-size:13px;font-weight:600;margin-left:4px;">${seconds}"</span>
                            ` : `
                                <span style="font-size:13px;font-weight:600;margin-right:4px;">${seconds}"</span>
                                <div class="wechat-voice-wave" style="color:#222;transform:scaleX(-1);"><div class="wechat-voice-bar"></div><div class="wechat-voice-bar"></div><div class="wechat-voice-bar"></div></div>
                            `}
                        </div>
                        ${isOpenDesc ? `
                        <div style="margin-top:5px;background:#ffffff;border:0.5px solid #e0e0e0;border-radius:6px;padding:7px 10px;font-size:12px;color:#333;line-height:1.45;box-shadow:0 1px 3px rgba(0,0,0,0.04);max-width:240px;">
                            ${msg.audioBg ? `<div style="color:#888;font-size:11px;margin-bottom:3px;font-style:italic;">（${escapeHtml(msg.audioBg)}）</div>` : ''}
                            <div><span style="color:#07c160;font-weight:600;">转文字：</span>${escapeHtml(msg.text || '')}</div>
                        </div>` : ''}
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                </div>`;
            } else if (msg.type === 'sticker' && msg.stickerUrl) {
                messagesHtml += `
                <div class="chat-msg-row" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                    <div style="max-width:65%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${!isSelf ? `<div style="font-size:11px;color:#888;margin-bottom:2px;">${escapeHtml(senderName)}</div>` : ''}
                        <img src="${escapeHtml(msg.stickerUrl)}" alt="${escapeHtml(msg.stickerDesc || '表情')}" style="width:100px;height:100px;object-fit:contain;border-radius:6px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                </div>`;
            } else if (msg.type === 'image' || msg.imageUrl) {
                const imgSrc = msg.imageUrl || msg.url;
                messagesHtml += `
                <div class="chat-msg-row" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                    <div style="max-width:65%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${!isSelf ? `<div style="font-size:11px;color:#888;margin-bottom:2px;">${escapeHtml(senderName)}</div>` : ''}
                        <div style="background:#fff;padding:3px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.06);">
                            <img src="${imgSrc}" style="max-width:180px;max-height:220px;border-radius:4px;object-fit:cover;display:block;" />
                            ${msg.imageDesc ? `<div style="font-size:11px;color:#666;padding:4px 6px;">${escapeHtml(msg.imageDesc)}</div>` : ''}
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                </div>`;
            } else {
                let text = isSelf ? escapeHtml(msg.text || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(msg.text || '') : escapeHtml(msg.text || ''));
                messagesHtml += `
                <div class="chat-msg-row" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${!isSelf ? `<div style="font-size:11px;color:#888;margin-bottom:2px;">${escapeHtml(senderName)}</div>` : ''}
                        <div style="background:${isSelf ? '#95ec69' : '#ffffff'};color:#111;padding:8px 12px;border-radius:5px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:14.5px;line-height:1.5;word-break:break-word;">
                            ${text}
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                </div>`;
            }
        }

        const stickerDrawerHtml = _stickerDrawerOpen ? buildChatStickerDrawerHTML('group', gid) : '';
        const plusDrawerHtml = _plusDrawerOpen ? buildChatPlusDrawerHTML('group', gid) : '';

        const html = `
        <div style="background:#ededed;display:flex;flex-direction:column;height:100%;min-height:100%;overflow:hidden;font-family:-apple-system,sans-serif;">
            <div class="wechat-top-header">
                <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
                    <button onclick="window.closeGroupChat()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:2px;font-weight:500;">
                        <span>‹</span> <span>微信</span>
                    </button>
                    <div style="font-weight:600;font-size:15px;color:#181818;margin-left:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${escapeHtml(group.name)} (${memberCount})
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
                    <button id="btnGroupLightningTrigger" onclick="window.triggerGroupAIReply('${gid}')" style="border:none;background:#07c160;color:#fff;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="生成群聊回复">
                        <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    </button>
                    <button onclick="window.openGroupSettingsModal('${gid}')" style="border:none;background:none;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">
                        <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:#181818;stroke-width:2;"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
                    </button>
                </div>
            </div>

            <div id="groupChatMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">群聊开启啦，向大家打个招呼吧！</div>'}
            </div>

            ${stickerDrawerHtml}
            ${plusDrawerHtml}

            <!-- 微信标准输入栏 -->
            <div style="padding:8px 10px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;gap:8px;align-items:center;flex-shrink:0;">
                <button onclick="window.openVoiceInputModal('group','${gid}')" title="发送语音" style="border:none;background:none;width:28px;height:28px;cursor:pointer;flex-shrink:0;padding:0;display:flex;align-items:center;justify-content:center;color:#555;">
                    <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </button>

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

        const msgArea = document.getElementById('groupChatMessageArea');
        if (msgArea) setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 50);

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

    // 群聊 AI 生成回复
    window.triggerGroupAIReply = async function(gid) {
        const group = window.G.groups && window.G.groups[gid];
        if (!group) return;
        const members = (group.members || []).map(mid => window.G.npcs[mid]).filter(Boolean);
        if (members.length === 0) {
            if (typeof showToast === 'function') showToast('群内没有其他成员', 'info');
            return;
        }

        const history = (window.G.groupChatHistory && window.G.groupChatHistory[gid]) || [];
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: '我' };

        const memberDesc = members.map(m => `「${m.name}」(人设:${m.persona || 'MC同伴'})`).join('、');
        const recentDialogue = history.slice(-8).map(m => `${m.senderName || '群友'}: ${m.text || ''}`).join('\n');

        const sysPrompt = `你正在模拟Minecraft多人微信群聊「${group.name}」。群内NPC成员有：${memberDesc}。
【微信群聊活人打字准则】：
1. 挑选 1 到 2 位群成员依次发言，每句用 [MSG sender="成员名字"]发言正文[/MSG]。
2. 绝对严禁在句尾加句号！句内优先用空格停顿！
3. 绝对严禁出现任何括号动作描写或思维链！`;

        const btn = document.getElementById('btnGroupLightningTrigger');
        if (btn) {
            btn.innerHTML = `<svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:#ffffff;animation:spin 1s linear infinite;"><circle cx="12" cy="12" r="9" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="28" stroke-dashoffset="14"></circle></svg>`;
            btn.disabled = true;
        }

        try {
            const raw = await callAI([
                { role: 'system', content: sysPrompt },
                { role: 'user', content: recentDialogue ? `【最近群聊记录】：\n${recentDialogue}\n\n请群友们接话：` : '群里有人在吗？' }
            ], { maxTokens: 400, temperature: 0.85 });

            let clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();
            const msgRegex = /\[MSG sender="([^"]+)"\]([\s\S]*?)\[\/MSG\]/gi;
            let match;
            let found = false;

            while ((match = msgRegex.exec(clean)) !== null) {
                found = true;
                const senderName = match[1].trim();
                const text = match[2].trim();
                if (text) {
                    const matchedNpc = members.find(m => m.name === senderName) || members[0];
                    window.G.groupChatHistory[gid].push({
                        _id: 'gmsg_' + Date.now() + '_' + Math.floor(Math.random() * 899 + 100),
                        from: 'npc',
                        senderId: matchedNpc.id,
                        senderName: matchedNpc.name,
                        text: text,
                        time: new Date().toLocaleTimeString().slice(0, 5)
                    });
                }
            }

            if (!found && clean) {
                const randomNpc = members[Math.floor(Math.random() * members.length)];
                window.G.groupChatHistory[gid].push({
                    _id: 'gmsg_' + Date.now() + '_' + Math.floor(Math.random() * 899 + 100),
                    from: 'npc',
                    senderId: randomNpc.id,
                    senderName: randomNpc.name,
                    text: clean.replace(/\[\/?MSG.*?\]/gi, '').trim(),
                    time: new Date().toLocaleTimeString().slice(0, 5)
                });
            }

            syncChatHistoryToLocalBackup();
            if (typeof autoSaveGame === 'function') autoSaveGame();
            if (window.G.currentChatGroup === gid) renderGroupChatWindow();
        } catch (e) {
            console.error('群聊回复生成失败:', e);
            if (typeof showToast === 'function') showToast('群聊回复失败', 'error');
        } finally {
            if (btn) {
                btn.innerHTML = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
                btn.disabled = false;
            }
        }
    };

    window.openGroupSettingsModal = function(gid) {
        const group = window.G.groups && window.G.groups[gid];
        if (!group) return;

        const members = (group.members || []).map(mid => window.G.npcs[mid]).filter(Boolean);
        let membersGrid = members.map(m => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:52px;">
                ${renderAvatarBadge(m, 44)}
                <span style="font-size:11px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;text-align:center;">${escapeHtml(m.name)}</span>
            </div>
        `).join('');

        openWechatCleanModal('群聊信息', `
            <div style="display:flex;flex-direction:column;gap:14px;text-align:left;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:0.5px solid #ededed;">
                    <span style="font-size:14px;color:#333;">群聊名称</span>
                    <span onclick="window.openEditGroupNameModal('${gid}')" style="font-size:14px;font-weight:600;color:#181818;cursor:pointer;display:flex;align-items:center;gap:3px;">
                        ${escapeHtml(group.name)} <span style="color:#07c160;font-size:11px;">✎</span>
                    </span>
                </div>
                <div>
                    <div style="font-size:12px;color:#888;margin-bottom:8px;">群成员 (${members.length + 1}人)</div>
                    <div style="display:flex;flex-wrap:wrap;gap:10px;">
                        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:52px;">
                            ${renderAvatarBadge({ isPlayer: true }, 44)}
                            <span style="font-size:11px;color:#666;text-align:center;">我</span>
                        </div>
                        ${membersGrid}
                    </div>
                </div>
                <div style="margin-top:10px;">
                    <button type="button" onclick="window.dismissGroup('${gid}')" style="width:100%;border:none;background:#fff1f0;color:#fa5151;padding:9px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">
                        解散并删除群聊
                    </button>
                </div>
            </div>
        `, () => {});
    };

    window.openEditGroupNameModal = function(gid) {
        const group = window.G.groups && window.G.groups[gid];
        if (!group) return;
        document.querySelector('.wechat-clean-modal-mask')?.remove();
        openWechatCleanModal('修改群聊名称', `
            <input type="text" id="wcleanGroupNameInput" value="${escapeHtml(group.name)}" class="wechat-clean-input">
        `, () => {
            const val = document.getElementById('wcleanGroupNameInput').value.trim();
            if (!val) return false;
            group.name = val;
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            window.openGroupSettingsModal(gid);
        });
    };

    window.dismissGroup = function(gid) {
        document.querySelector('.wechat-clean-modal-mask')?.remove();
        let mask = document.createElement('div');
        mask.className = 'wechat-clean-modal-mask';
        mask.innerHTML = `
            <div class="wechat-clean-modal-card">
                <div class="wechat-clean-modal-title">解散群聊</div>
                <div style="font-size:13px;color:#666;text-align:center;margin:8px 0 16px;">确定要解散该群聊并清空聊天记录吗？</div>
                <div class="wechat-clean-modal-btns">
                    <button type="button" class="wechat-clean-btn-cancel" onclick="this.closest('.wechat-action-sheet-mask')?.remove() || this.closest('.wechat-clean-modal-mask')?.remove()">取消</button>
                    <button type="button" class="wechat-clean-btn-confirm" style="background:#fa5151;" id="wcleanConfirmDismiss">确定解散</button>
                </div>
            </div>
        `;
        document.body.appendChild(mask);
        mask.querySelector('#wcleanConfirmDismiss').onclick = () => {
            mask.remove();
            delete window.G.groups[gid];
            if (window.G.groupChatHistory) delete window.G.groupChatHistory[gid];
            if (window.G.currentChatGroup === gid) window.G.currentChatGroup = null;
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            if (typeof showToast === 'function') showToast('群聊已解散', 'info', 1200);
            renderChatApp();
        };
    };

    function buildChatStickerDrawerHTML(type, id) {
        if (typeof ensureStickersLoaded === 'function') ensureStickersLoaded();
        const cats = window.G.stickerCategories || ['猪猪'];
        const active = window.G.activeStickerCategory || cats[0];
        const list = (window.G.stickerLibrary || []).filter(s => s && s.category === active);

        const tabsHtml = cats.map(c => `
            <span onclick="window.switchChatStickerCategory('${escapeHtml(c)}','${type}','${id}')" style="display:inline-block;padding:4px 10px;margin-right:6px;border-radius:12px;font-size:12px;cursor:pointer;flex-shrink:0;background:${c === active ? '#07c160' : '#e8e8e8'};color:${c === active ? '#fff' : '#666'};">${escapeHtml(c)}</span>
        `).join('');

        let cardsHtml = `
            <div class="wechat-sticker-card" onclick="window.openAddStickerChoiceModal('${type}','${id}')" title="添加新表情" style="border:1px dashed #bbb;background:#fafafa;">
                <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:#888888;stroke-width:2;stroke-linecap:round;">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
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

    window.openAddStickerChoiceModal = function(type, id) {
        const curCat = window.G.activeStickerCategory || '猪猪';
        openWechatCleanModal(`添加表情包到「${escapeHtml(curCat)}」`, `
            <div style="display:flex;flex-direction:column;gap:8px;">
                <label style="border:1px solid #dcdcdc;background:#f9f9f9;padding:12px;border-radius:6px;font-size:13px;font-weight:500;color:#333;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
                    <span>从手机相册导入本地表情</span>
                    <input type="file" id="localStickerFileInput" accept="image/*" style="display:none;">
                    <span style="color:#07c160;font-size:15px;">›</span>
                </label>
            </div>
        `, () => {});

        setTimeout(() => {
            const input = document.getElementById('localStickerFileInput');
            if (input) {
                input.onchange = (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const base64Data = evt.target.result;
                        document.querySelector('.wechat-clean-modal-mask')?.remove();
                        window.openStickerRemarkModal(base64Data, curCat, type, id);
                    };
                    reader.readAsDataURL(file);
                };
            }
        }, 30);
    };

    window.openStickerRemarkModal = function(base64Url, cat, type, id) {
        openWechatCleanModal('设置表情备注', `
            <div style="display:flex;justify-content:center;margin-bottom:12px;">
                <img src="${base64Url}" style="width:80px;height:80px;border-radius:6px;object-fit:contain;background:#f0f0f0;">
            </div>
            <input type="text" id="wcleanStickerDescInput" placeholder="输入表情关键词备注..." class="wechat-clean-input">
        `, () => {
            const desc = document.getElementById('wcleanStickerDescInput').value.trim() || '自定义表情';
            if (!window.G.stickerLibrary) window.G.stickerLibrary = [];
            window.G.stickerLibrary.push({ category: cat, desc, url: base64Url });
            if (typeof showToast === 'function') showToast('表情已添加', 'success', 1200);
            if (type === 'single') renderSingleChatWindow();
            else renderGroupChatWindow();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        });
    };

    window.openCreateStickerCategoryModal = function(type, id) {
        openWechatCleanModal('新建表情分组', `
            <input type="text" id="wcleanNewCatInput" placeholder="输入分组名称..." class="wechat-clean-input">
        `, () => {
            const val = document.getElementById('wcleanNewCatInput').value.trim();
            if (!val) return false;
            if (!window.G.stickerCategories) window.G.stickerCategories = ['猪猪'];
            if (!window.G.stickerCategories.includes(val)) window.G.stickerCategories.push(val);
            window.G.activeStickerCategory = val;
            if (type === 'single') renderSingleChatWindow();
            else renderGroupChatWindow();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        });
    };

    function buildChatPlusDrawerHTML(type, id) {
        return `
        <div id="chatPlusDrawer" style="background:#f7f7f7;border-top:0.5px solid #dcdcdc;flex-shrink:0;animation:wechatSlideUp 0.18s ease-out;">
            <div class="wechat-plus-grid">
                <div class="wechat-plus-item" onclick="window.openChatSendImageModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#07c160;stroke-width:1.8;stroke-linecap:round;"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                    <span class="wechat-plus-label">发送图片</span>
                </div>
                <div class="wechat-plus-item" onclick="_plusDrawerOpen=false; window.openCollabVideoPublishModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#ff5252;stroke-width:1.8;stroke-linecap:round;"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2"></rect></svg>
                    </div>
                    <span class="wechat-plus-label">共创视频</span>
                </div>
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

    window.openChatSendImageModal = function(type, id) {
        let localSelectedImg = null;

        openWechatCleanModal('发送图片', `
            <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;text-align:left;color:#333;">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="radio" name="wchatPicMode" value="text_only" checked style="accent-color:#07c160;">
                    <span>文字代替图片（节省 Token）</span>
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="radio" name="wchatPicMode" value="image_real" style="accent-color:#07c160;">
                    <span>本地相册图片</span>
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="radio" name="wchatPicMode" value="image_with_desc" style="accent-color:#07c160;">
                    <span>相册图片 + 文字描述</span>
                </label>
            </div>

            <div id="wchatImgLocalBox" style="display:none;margin-top:12px;background:#f9f9f9;padding:10px;border-radius:6px;border:1px solid #e2e8f0;">
                <label style="display:inline-block;padding:6px 12px;background:#ffffff;border:1px solid #ccc;border-radius:4px;font-size:12px;cursor:pointer;color:#333;">
                    从相册选择照片
                    <input type="file" id="wchatLocalFileInput" accept="image/*" style="display:none;">
                </label>
                <div id="wchatLocalPreviewWrap" style="margin-top:8px;display:none;">
                    <img id="wchatLocalPreviewImg" style="max-height:80px;border-radius:4px;object-fit:cover;">
                </div>
            </div>

            <div id="wchatImgDescBox" style="margin-top:12px;">
                <div style="font-size:12px;color:#666;margin-bottom:4px;">画面意象/内容描述：</div>
                <input type="text" id="wchatPicDescInput" placeholder="描述你发给对方的画面内容..." class="wechat-clean-input">
            </div>
        `, () => {
            const mode = document.querySelector('input[name="wchatPicMode"]:checked')?.value || 'text_only';
            const desc = document.getElementById('wchatPicDescInput').value.trim();

            if (mode === 'text_only') {
                if (!desc) {
                    if (typeof showToast === 'function') showToast('请填写画面描述', 'error');
                    return false;
                }
            } else {
                if (!localSelectedImg) {
                    if (typeof showToast === 'function') showToast('请先选择本地图片', 'error');
                    return false;
                }
            }

            const time = new Date().toLocaleTimeString().slice(0, 5);
            const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };

            let msgObj = null;
            if (mode === 'text_only') {
                msgObj = {
                    from: 'player',
                    type: 'image_text_only',
                    imageDesc: desc,
                    text: `[图片: ${desc}]`,
                    senderName: curAcc.name,
                    time
                };
            } else {
                msgObj = {
                    from: 'player',
                    type: 'image',
                    imageUrl: localSelectedImg,
                    imageDesc: (mode === 'image_with_desc') ? desc : null,
                    text: desc ? `[图片: ${desc}]` : '[图片]',
                    senderName: curAcc.name,
                    time
                };
            }

            if (type === 'single') {
                pushChatMessageSafe(id, msgObj, curAcc.id);
            } else {
                if (!window.G.groupChatHistory[id]) window.G.groupChatHistory[id] = [];
                window.G.groupChatHistory[id].push(msgObj);
            }

            _plusDrawerOpen = false;
            if (type === 'single') renderSingleChatWindow();
            else renderGroupChatWindow();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        });

        setTimeout(() => {
            const radios = document.querySelectorAll('input[name="wchatPicMode"]');
            const localBox = document.getElementById('wchatImgLocalBox');
            const fileInput = document.getElementById('wchatLocalFileInput');

            radios.forEach(r => {
                r.onchange = () => {
                    const v = r.value;
                    localBox.style.display = (v === 'image_real' || v === 'image_with_desc') ? 'block' : 'none';
                };
            });

            if (fileInput) {
                fileInput.onchange = (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        localSelectedImg = evt.target.result;
                        const pImg = document.getElementById('wchatLocalPreviewImg');
                        const pWrap = document.getElementById('wchatLocalPreviewWrap');
                        if (pImg && pWrap) {
                            pImg.src = localSelectedImg;
                            pWrap.style.display = 'block';
                        }
                    };
                    reader.readAsDataURL(file);
                };
            }
        }, 30);
    };

    // 🤖 私聊 AI 回复触发（全新装载活人感提示词引擎）
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

        // 整理最近 12 轮真实历史给上下文
        const recentDialogue = history.slice(-12).map(m => {
            const speaker = (m.from === 'player') ? curAcc.name : npc.name;
            if (m.type === 'voice') return `${speaker} [语音]: ${m.text || ''}`;
            if (m.originalText) return `${speaker}: ${m.originalText} (译: ${m.text || ''})`;
            return `${speaker}: ${m.text || ''}`;
        }).join('\n');

        // 调用独立的提示词中枢组装纯指令
        const promptCtx = (window.ChatPromptEngine && typeof window.ChatPromptEngine.buildWechatAIPromptContext === 'function')
            ? window.ChatPromptEngine.buildWechatAIPromptContext({
                npc,
                curAcc,
                recentDialogueText: recentDialogue,
                isBehindActive
            })
            : {
                sysPrompt: `扮演MC好友「${npc.name}」，严禁句末加句号，严禁括号动作描写。`,
                userPrompt: recentDialogue ? `最近对话：\n${recentDialogue}\n\n回复：` : '打个招呼。'
            };

        const btn = document.getElementById('btnChatLightningTrigger');
        if (btn) {
            btn.innerHTML = `<svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:#ffffff;animation:spin 1s linear infinite;"><circle cx="12" cy="12" r="9" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-dasharray="28" stroke-dashoffset="14"></circle></svg>`;
            btn.disabled = true;
        }

        try {
            const raw = await callAI([
                { role: 'system', content: promptCtx.sysPrompt },
                { role: 'user', content: promptCtx.userPrompt }
            ], { maxTokens: 450, temperature: 0.86 });

            let clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();
            clean = clean.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '').trim();

            let behindText = '';
            const bsMatch = clean.match(/\[BEHIND_SCREEN\]([\s\S]*?)\[\/BEHIND_SCREEN\]/i);
            if (bsMatch) {
                behindText = bsMatch[1].trim();
                clean = clean.replace(/\[BEHIND_SCREEN\][\s\S]*?\[\/BEHIND_SCREEN\]/gi, '').trim();
            }

            const entities = parseAIReplyEntities(clean);
            const finalEntities = (entities && entities.length) ? entities : [{ type: 'text', text: '在呢' }];

            for (let i = 0; i < finalEntities.length; i++) {
                const item = finalEntities[i];
                const time = new Date().toLocaleTimeString().slice(0, 5);

                if (item.type === 'voice') {
                    pushChatMessageSafe(npcId, {
                        from: 'npc',
                        type: 'voice',
                        seconds: item.seconds || 3,
                        audioBg: item.audioBg || '',
                        text: item.text || '',
                        time
                    }, curAcc.id);
                } else {
                    pushChatMessageSafe(npcId, {
                        from: 'npc',
                        type: 'text',
                        text: item.text || '',
                        originalText: item.originalText || null,
                        time
                    }, curAcc.id);
                }

                if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
                if (i < finalEntities.length - 1) {
                    await new Promise(r => setTimeout(r, 420));
                }
            }

            if (behindText && isBehindActive) {
                pushChatMessageSafe(npcId, {
                    from: 'behind_screen',
                    text: behindText,
                    time: new Date().toLocaleTimeString().slice(0, 5)
                }, curAcc.id);
                if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
            }

            if (typeof autoSaveGame === 'function') autoSaveGame();
        } catch(e) {
            console.error('API 回复失败:', e);
            if (typeof showToast === 'function') showToast('回复失败，请检查AI配置', 'error');
        } finally {
            if (btn) {
                btn.innerHTML = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
                btn.disabled = false;
            }
        }
    };

    window.toggleBehindScreen = function(npcId) {
        if (!window.G._behindScreenActive) window.G._behindScreenActive = {};
        window.G._behindScreenActive[npcId] = !window.G._behindScreenActive[npcId];
        const status = window.G._behindScreenActive[npcId];
        if (typeof showToast === 'function') showToast(status ? '已开启动作感知' : '已关闭动作感知', 'info', 1200);
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
            pushChatMessageSafe(id, { from: 'player', type: 'sticker', stickerUrl: url, stickerDesc: desc, text: `[表情: ${desc}]`, time }, curAcc.id);
        } else {
            if (!window.G.groupChatHistory[id]) window.G.groupChatHistory[id] = [];
            window.G.groupChatHistory[id].push({ from: 'player', type: 'sticker', stickerUrl: url, stickerDesc: desc, text: `[表情: ${desc}]`, time });
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

    window.renderChatApp = renderChatApp;
    window.renderSocialPanel = renderChatApp;
    window.renderSingleChatWindow = renderSingleChatWindow;
    window.renderGroupChatWindow = renderGroupChatWindow;
    window.renderAvatarBadge = renderAvatarBadge;

    window.switchChatTab = function(tab) {
        window.G.chatActiveTab = (tab === 'direct' ? 'direct' : 'group');
        window.G.currentChatNpc = null;
        window.G.currentChatGroup = null;
        renderChatApp();
    };

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
