/**
 * js/apps/chat/chat-app.js
 * 💬 微信独立主应用（大号/小号好友绝对物理隔离 · 真机无缝全屏 · 真实API调用 · 高级单色矢量UI）
 * 
 * 🌟 核心特性：
 * 1. 账号隔离：大号与小号好友列表绝对独立，互不污染共享，小号建好友只在小号可见
 * 2. 自动纠偏与多重防丢持久化：自建联系人独立本地槽持久化，防止杀后台后数据丢失
 * 3. 角色名片：点击直接编辑长人设 + 纯白视窗阅读 + 点击头像上传更换
 * 4. 视觉与防遮挡：无缝全屏置顶，仿微信高保真简约矢量表情按钮
 */

(function() {
    'use strict';

    // 预留头像库专属子目录路径
    const AVATAR_SUBDIR = 'assets/avatars/';
    window._MCYT_AVATAR_SUBDIR = AVATAR_SUBDIR;

    // 自建联系人独立备份存储键（防止全局大存档覆写或重置丢失联系人）
    const CUSTOM_NPCS_BACKUP_KEY = 'mcyt_wechat_custom_npcs';

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

    // 自建联系人独立备份存取（防杀后台丢失核心机制）
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
                        // 补充可能丢失的字段
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

    // 强制消除外层粉色框中框，真正 100% 满屏微信质感
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
            .app-modal-layer.wechat-seamless-shell .app-modal-head {
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
            .app-modal-layer.wechat-seamless-shell .app-modal-foot {
                display: none !important;
            }
            .wechat-top-header {
                padding-top: 46px !important;
                height: 92px !important;
                background: #ededed !important;
                border-bottom: 0.5px solid #dcdcdc !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                padding-left: 14px !important;
                padding-right: 14px !important;
                flex-shrink: 0 !important;
                box-sizing: border-box !important;
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

        // 优先从持久化备份槽唤醒自建联系人，防止杀后台后被重置
        restoreCustomNpcsFromLocalBackup();

        if (typeof window.restoreWechatProfileData === 'function') {
            window.restoreWechatProfileData();
        }

        for (const [id, npc] of Object.entries(window.G.npcs)) {
            if (!npc.id) npc.id = id;
            if (!npc.name) npc.name = id;
            if (npc.favor === undefined) npc.favor = 50;
            if (!npc.region) npc.region = (id.includes('dream') || id.includes('george')) ? '美国 - 东部' : '中国';
            if (!npc.avatarUrl) npc.avatarUrl = getRandomAvatar();
            
            // 默认历史老 NPC 归属于主号
            if (!npc.ownerAccountId) {
                npc.ownerAccountId = 'main';
            }
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
    // ➕ 加号菜单：发起与添加
    // ============================================================
    window.openAddChatTargetModal = function() {
        const reqs = window.G.friendRequests || [];
        const grpInvs = window.G.groupInvites || [];
        const totalPending = reqs.length + grpInvs.length;

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:12px;border-bottom:1.5px solid #eef2f7;padding-bottom:8px;">
                    发起与添加
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <button type="button" onclick="closeModal(); window.openCreateCustomNpcModal();" style="border:1px solid #cbd5e1;background:#f8fafc;padding:12px;border-radius:8px;font-size:13px;font-weight:600;color:#1e293b;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;">
                        <span>添加新朋友</span>
                        <span style="color:#2563eb;">›</span>
                    </button>
                    <button type="button" onclick="closeModal(); window.openCreateGroupModal();" style="border:1px solid #cbd5e1;background:#f8fafc;padding:12px;border-radius:8px;font-size:13px;font-weight:600;color:#1e293b;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;">
                        <span>发起多人讨论群</span>
                        <span style="color:#07c160;">›</span>
                    </button>
                    <button type="button" onclick="closeModal(); window.openFriendRequestsListModal();" style="border:1px solid #cbd5e1;background:#f8fafc;padding:12px;border-radius:8px;font-size:13px;font-weight:600;color:#1e293b;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;">
                        <span>待处理好友与群邀请 ${totalPending > 0 ? `(${totalPending})` : ''}</span>
                        <span style="color:#e53e3e;">${totalPending > 0 ? `● ${totalPending}` : '›'}</span>
                    </button>
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:14px;">
                    <button type="button" onclick="closeModal()" style="border:none;background:none;color:#64748b;font-size:12.5px;cursor:pointer;">关闭</button>
                </div>
            </div>
        `);
    };

    // 👤 添加新朋友（修复初次创建消失与持久化问题）
    window.openCreateCustomNpcModal = function() {
        let currentAssignedAvatar = getRandomAvatar();
        let selectedNpcRegion = '美国 - 东部';
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;border-bottom:1.5px solid #eef2f7;padding-bottom:8px;margin-bottom:12px;">
                    添加新朋友
                </div>

                <div style="display:flex;align-items:center;gap:12px;background:#f8fafc;padding:10px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:12px;">
                    <img id="custNpcAvatarPreview" src="${currentAssignedAvatar}" style="width:50px;height:50px;border-radius:6px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';" />
                    <div style="flex:1;">
                        <div style="font-size:12.5px;font-weight:600;color:#334155;">已自动分配头像</div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">来自头像库抽选</div>
                    </div>
                    <button type="button" id="btnRerollAvatar" style="border:1px solid #cbd5e1;background:#ffffff;color:#2563eb;padding:5px 10px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">
                        换一张
                    </button>
                </div>

                <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:12.5px;color:#475569;font-weight:600;display:block;margin-bottom:3px;">朋友昵称 *</label>
                    <input type="text" id="custNpcName" placeholder="输入朋友昵称..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;box-sizing:border-box;outline:none;">
                </div>

                <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:12.5px;color:#475569;font-weight:600;display:block;margin-bottom:3px;">常驻地区与时区</label>
                    <div id="custNpcRegionTrigger" style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;background:#f9fafb;cursor:pointer;">
                        <span id="custNpcRegionVal" style="font-size:13px;color:#1e293b;">${selectedNpcRegion}</span>
                        <span style="font-size:11.5px;color:#2563eb;font-weight:500;">选择地区 ›</span>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12.5px;color:#475569;font-weight:600;display:block;margin-bottom:3px;">初始好感度</label>
                    <input type="number" id="custNpcFavor" value="50" min="0" max="100" style="width:90px;padding:6px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;">
                </div>

                <div style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #f1f5f9;padding-top:10px;">
                    <button type="button" onclick="closeModal()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmCreateNpc" style="border:none;background:#2563eb;color:#ffffff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">完成添加</button>
                </div>
            </div>
        `);

        document.getElementById('btnRerollAvatar').onclick = () => {
            currentAssignedAvatar = getRandomAvatar();
            const prev = document.getElementById('custNpcAvatarPreview');
            if (prev) prev.src = currentAssignedAvatar;
        };

        document.getElementById('custNpcRegionTrigger').onclick = () => {
            window.openPickNpcRegionModal((pickedRegion) => {
                selectedNpcRegion = pickedRegion;
                const el = document.getElementById('custNpcRegionVal');
                if (el) el.textContent = pickedRegion;
            });
        };

        document.getElementById('btnConfirmCreateNpc').onclick = () => {
            const name = document.getElementById('custNpcName').value.trim();
            if (!name) {
                if (typeof showToast === 'function') showToast('请填写好友昵称', 'error');
                return;
            }
            const newId = 'custom_' + Date.now();
            ensureNpcIntegrity();

            const newNpcObj = {
                id: newId,
                name,
                persona: '',
                region: selectedNpcRegion,
                avatarUrl: currentAssignedAvatar,
                favor: parseInt(document.getElementById('custNpcFavor').value) || 50,
                skills: { building: 50, redstone: 50, pvp: 60, survival: 50, hunting: 50 },
                ownerAccountId: curAcc.id,
                isCustom: true
            };

            window.G.npcs[newId] = newNpcObj;

            pushChatMessageSafe(newId, {
                from: 'action',
                text: `你与「${name}」已互加好友，开启畅聊吧。`,
                time: new Date().toLocaleTimeString().slice(0, 5)
            }, curAcc.id);

            // 🌟 立即触发全量与专属独立双重持久化
            syncCustomNpcsToLocalBackup();
            if (typeof autoSaveGame === 'function') autoSaveGame();

            closeModal();
            renderChatApp();
            if (typeof showToast === 'function') showToast(`成功添加好友！`, 'success', 2000);
        };
    };

    window.openPickNpcRegionModal = function(callback) {
        const PRESET_LIST = [
            '中国',
            '美国 - 东部',
            '美国 - 西部',
            '英国',
            '日本',
            '韩国',
            '加拿大',
            '澳大利亚',
            '德国',
            '法国'
        ];

        let itemsHtml = PRESET_LIST.map(item => `
            <div onclick="window.onSelectNpcRegionDone('${escapeHtml(item)}')" style="padding:10px 12px;border-bottom:0.5px solid #e2e8f0;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:13px;color:#1e293b;font-weight:500;">${escapeHtml(item)}</span>
                <span style="font-size:11.5px;color:#2563eb;">选择</span>
            </div>
        `).join('');

        window._npcRegionSelectCallback = callback;

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:8px;border-bottom:1.5px solid #eef2f7;padding-bottom:6px;">
                    选择朋友所在地区
                </div>
                <div style="max-height:240px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:6px;background:#fff;">
                    ${itemsHtml}
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:10px;">
                    <button type="button" onclick="closeModal()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:5px 14px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                </div>
            </div>
        `);
    };

    window.onSelectNpcRegionDone = function(regionName) {
        closeModal();
        if (typeof window._npcRegionSelectCallback === 'function') {
            window._npcRegionSelectCallback(regionName);
            window._npcRegionSelectCallback = null;
        }
    };

    // 👥 发起群聊
    window.openCreateGroupModal = function() {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        const npcs = Object.entries(window.G.npcs || {}).filter(([id, n]) => (n.ownerAccountId || 'main') === curAcc.id);
        if (!npcs.length) {
            if (typeof showToast === 'function') showToast('当前通讯录暂无好友，无法建群', 'error');
            return;
        }

        const memberCheckboxes = npcs.map(([id, n]) => `
            <label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;background:#f4f5f7;padding:4px 8px;border-radius:6px;margin:3px;cursor:pointer;">
                <input type="checkbox" class="new-grp-member-chk" value="${id}" checked>
                <span>${escapeHtml(n.name)}</span>
            </label>
        `).join('');

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;border-bottom:1.5px solid #eef2f7;padding-bottom:8px;margin-bottom:12px;">
                    发起多人讨论群
                </div>
                <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:12.5px;color:#475569;font-weight:600;display:block;margin-bottom:3px;">群聊名称 *</label>
                    <input type="text" id="newGrpName" placeholder="如：下界生存茶话会..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;box-sizing:border-box;outline:none;">
                </div>
                <div class="form-group" style="margin-bottom:12px;">
                    <label style="font-size:12px;color:#475569;display:block;margin-bottom:3px;">选择初始群成员：</label>
                    <div style="max-height:120px;overflow-y:auto;border:1px solid #e2e8f0;padding:6px;border-radius:6px;background:#fafafa;">
                        ${memberCheckboxes}
                    </div>
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #f1f5f9;padding-top:10px;">
                    <button type="button" onclick="closeModal()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmCreateGrp" style="border:none;background:#07c160;color:#ffffff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">立即创建</button>
                </div>
            </div>
        `);

        document.getElementById('btnConfirmCreateGrp').onclick = () => {
            const name = document.getElementById('newGrpName').value.trim();
            if (!name) {
                if (typeof showToast === 'function') showToast('请填写群聊名称', 'error');
                return;
            }
            const members = Array.from(document.querySelectorAll('.new-grp-member-chk:checked')).map(cb => cb.value);
            const gid = 'grp_' + Date.now();
            if (!window.G.groups) window.G.groups = {};
            window.G.groups[gid] = {
                id: gid,
                name,
                desc: '自由交流',
                avatarUrl: getRandomAvatar(),
                ownerAccountId: curAcc.id,
                members,
                activeMembers: members
            };
            if (!window.G.groupChatHistory[gid]) window.G.groupChatHistory[gid] = [];
            window.G.groupChatHistory[gid].push({
                from: 'action',
                text: `群聊「${name}」已创建`,
                time: new Date().toLocaleTimeString().slice(0, 5)
            });
            closeModal();
            window.openGroupChat(gid);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
    };

    // 📬 待处理申请弹窗
    window.openFriendRequestsListModal = function() {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        const reqs = (window.G.friendRequests || []).filter(r => (r.targetAltId || 'main') === curAcc.id);
        if (!reqs.length) {
            openModal(`
                <div style="text-align:center;padding:20px 10px;">
                    <div style="font-size:14px;color:#64748b;">暂无待处理的好友申请</div>
                    <button type="button" onclick="closeModal()" style="margin-top:14px;border:1px solid #cbd5e1;background:#fff;padding:5px 16px;border-radius:5px;font-size:12px;cursor:pointer;">知道了</button>
                </div>
            `);
            return;
        }

        let itemsHtml = reqs.map(r => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-bottom:0.5px solid #e2e8f0;">
                <div>
                    <div style="font-size:13px;font-weight:600;color:#1e293b;">${escapeHtml(r.name)}</div>
                    <div style="font-size:11px;color:#64748b;">理由：${escapeHtml(r.fromReason || '慕名而来')}</div>
                </div>
                <div style="display:flex;gap:6px;">
                    <button type="button" onclick="window.handleFriendRequestActionModern('${r._id}', 'accept')" style="border:none;background:#07c160;color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;">接受</button>
                    <button type="button" onclick="window.handleFriendRequestActionModern('${r._id}', 'reject')" style="border:none;background:#e5e7eb;color:#4b5563;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;">忽略</button>
                </div>
            </div>
        `).join('');

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:10px;">好友与群申请</div>
                <div style="max-height:220px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:6px;">${itemsHtml}</div>
                <div style="display:flex;justify-content:flex-end;margin-top:12px;">
                    <button type="button" onclick="closeModal()" style="border:none;background:none;color:#64748b;font-size:12px;cursor:pointer;">关闭</button>
                </div>
            </div>
        `);
    };

    window.handleFriendRequestActionModern = function(reqId, action) {
        const reqIdx = (window.G.friendRequests || []).findIndex(r => r._id === reqId);
        if (reqIdx === -1) return;
        const req = window.G.friendRequests[reqIdx];
        const targetOwnerId = req.targetAltId || 'main';

        if (action === 'accept') {
            ensureNpcIntegrity();
            const newId = req.npcOfficialId ? `${req.npcOfficialId}_${targetOwnerId}` : ('npc_' + Date.now());
            const newNpc = {
                id: newId,
                name: req.name || '好友',
                persona: req.persona || '',
                region: '美国 - 东部',
                avatarUrl: req.avatarUrl || getRandomAvatar(),
                favor: 50,
                ownerAccountId: targetOwnerId,
                isCustom: true,
                skills: { building: 50, redstone: 50, pvp: 50, survival: 50, hunting: 50 }
            };
            window.G.npcs[newId] = newNpc;
            pushChatMessageSafe(newId, {
                from: 'npc',
                text: `你好！我通过了你的好友验证，一起玩MC吧！`,
                time: new Date().toLocaleTimeString().slice(0, 5)
            }, targetOwnerId);
            window.G.friendRequests.splice(reqIdx, 1);
            syncCustomNpcsToLocalBackup();
            if (typeof showToast === 'function') showToast(`成功添加好友「${req.name}」！`, 'success', 1500);
        } else {
            window.G.friendRequests.splice(reqIdx, 1);
        }
        closeModal();
        renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // ============================================================
    // 📖 角色名片页：去括号优化 + 纯白放大镜 + 点击更换头像
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
                        <div style="font-size:16px;font-weight:700;color:#1e293b;">${escapeHtml(npc.name)}</div>
                        <div style="font-size:12px;color:#64748b;margin-top:2px;">地区：${escapeHtml(npc.region || '未知')} · 好感度：<span style="color:#ef4444;font-weight:600;">${npc.favor || 50}</span>/100</div>
                    </div>
                </div>

                <div style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;padding:10px 12px;margin-bottom:14px;cursor:pointer;" onclick="window.openEditNpcPersonaModal('${npcId}')">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:12.5px;font-weight:600;color:#334155;">角色人设档案</span>
                        <button type="button" onclick="event.stopPropagation(); window.openFullPersonaModal('${npcId}');" style="border:none;background:#2563eb;color:#ffffff;font-size:11px;cursor:pointer;padding:3px 8px;border-radius:4px;display:inline-flex;align-items:center;gap:4px;font-weight:600;">
                            <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:#ffffff;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
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

    // 🖼️ 点击更换头像（图片压缩 + 裁剪转Base64 + 持久化）
    window.triggerChangeNpcAvatar = function(npcId) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (re) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const size = 180;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');

                    let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
                    if (sWidth > sHeight) {
                        sx = (sWidth - sHeight) / 2;
                        sWidth = sHeight;
                    } else {
                        sy = (sHeight - sWidth) / 2;
                        sHeight = sWidth;
                    }

                    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, size, size);
                    const base64Url = canvas.toDataURL('image/jpeg', 0.85);

                    if (window.G.npcs && window.G.npcs[npcId]) {
                        window.G.npcs[npcId].avatarUrl = base64Url;
                        syncCustomNpcsToLocalBackup();
                        if (typeof autoSaveGame === 'function') autoSaveGame();

                        const preview = document.getElementById('npcCardAvatarDisplay');
                        if (preview) preview.src = base64Url;

                        if (typeof showToast === 'function') showToast('头像更新成功！', 'success', 1500);
                        if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
                    }
                };
                img.src = re.target.result;
            };
            reader.readAsDataURL(file);
        };
        fileInput.click();
    };

    window.openFullPersonaModal = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;height:70vh;display:flex;flex-direction:column;">
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:10px;flex-shrink:0;">
                    <div style="font-size:15px;font-weight:700;color:#1e3a8a;">「${escapeHtml(npc.name)}」完整人设档案</div>
                    <button type="button" onclick="window.openNpcProfileCardModal('${npcId}')" style="border:none;background:none;color:#64748b;font-size:12px;cursor:pointer;">‹ 返回名片</button>
                </div>
                <div style="flex:1;overflow-y:auto;background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;font-size:13px;line-height:1.7;color:#1e293b;white-space:pre-wrap;word-break:break-word;">
                    ${escapeHtml(npc.persona || '暂无详细人设文本，点击下方修改')}
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:10px;flex-shrink:0;">
                    <button type="button" onclick="window.openEditNpcPersonaModal('${npcId}')" style="border:none;background:#2563eb;color:#fff;padding:6px 14px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">修改人设</button>
                </div>
            </div>
        `);
    };

    window.openEditNpcPersonaModal = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;border-bottom:1.5px solid #eef2f7;padding-bottom:8px;margin-bottom:10px;">
                    编辑「${escapeHtml(npc.name)}」人设
                </div>
                <div style="font-size:11.5px;color:#64748b;margin-bottom:6px;">可粘贴大段角色性格、语气特点、背景经历与互动偏好：</div>
                <textarea id="editHugePersonaInput" rows="9" placeholder="在此输入或粘贴长篇人设设定..." style="width:100%;padding:10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;line-height:1.6;box-sizing:border-box;resize:none;outline:none;font-family:inherit;">${escapeHtml(npc.persona || '')}</textarea>
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
                    <button type="button" onclick="window.openNpcProfileCardModal('${npcId}')" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnSaveHugePersona" style="border:none;background:#07c160;color:#fff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">保存档案</button>
                </div>
            </div>
        `);

        document.getElementById('btnSaveHugePersona').onclick = () => {
            npc.persona = document.getElementById('editHugePersonaInput').value.trim();
            syncCustomNpcsToLocalBackup();
            window.openNpcProfileCardModal(npcId);
            if (typeof showToast === 'function') showToast('人设已保存更新！', 'success', 1500);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
    };

    // ============================================================
    // 💬 会话列表（大号与小号绝对物理隔离）
    // ============================================================
    function buildChatListHTML() {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', isAlt: false };
        const allNpcEntries = Object.entries(window.G.npcs || {});

        // 纠偏与归属归正
        allNpcEntries.forEach(([id, npc]) => {
            if (!npc.ownerAccountId || npc.ownerAccountId === 'main') {
                const keys = Object.keys(window.G.chatHistory || {});
                const isOnlyInAlt = keys.some(k => k.startsWith('alt_') && k.endsWith('_' + id) && window.G.chatHistory[k].length > 0);
                const isMainEmpty = !window.G.chatHistory['main_' + id] || window.G.chatHistory['main_' + id].length === 0;
                if (isOnlyInAlt && isMainEmpty) {
                    const matchKey = keys.find(k => k.startsWith('alt_') && k.endsWith('_' + id));
                    if (matchKey) {
                        npc.ownerAccountId = matchKey.replace('_' + id, '');
                    }
                }
            }
        });

        // 绝对隔离过滤
        const visibleNpcList = allNpcEntries.filter(([id, npc]) => {
            const owner = npc.ownerAccountId || 'main';
            return owner === curAcc.id;
        });

        if (!visibleNpcList.length) {
            return `
            <div style="text-align:center;color:#b2b2b2;padding:60px 16px;font-size:13px;line-height:1.8;">
                <div style="font-size:36px;margin-bottom:8px;opacity:0.65;">
                    <svg viewBox="0 0 24 24" style="width:36px;height:36px;fill:#b2b2b2;"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                </div>
                <b>${curAcc.isAlt ? `${escapeHtml(curAcc.name)} 通讯录为空` : '暂无聊天消息'}</b><br>
                ${curAcc.isAlt ? '小号拥有独立社交圈，点击右上角 + 添加属于你的专属好友！' : '点击右上角 + 开始交流！'}
            </div>`;
        }

        let itemsHtml = '';
        for (const [id, npc] of visibleNpcList) {
            const chatHist = getAccountChatHistory(id, curAcc.id);
            const lastMsg = chatHist.length > 0 ? chatHist[chatHist.length - 1] : null;
            const purePreview = lastMsg ? (typeof stripThought === 'function' ? stripThought(lastMsg.text || '') : lastMsg.text) : '打个招呼吧';
            const time = lastMsg ? (lastMsg.time || '') : '';
            const isBlocked = isAccountBlockedByNpc(id, curAcc.id);

            itemsHtml += `
            <div class="chat-item" data-npc-id="${id}" style="display:flex;align-items:center;padding:12px 14px;background:#ffffff;cursor:pointer;border-bottom:0.5px solid #f0f0f0;user-select:none;-webkit-user-select:none;">
                <div style="margin-right:12px;flex-shrink:0;">${renderAvatarBadge(npc, 48)}</div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:500;font-size:15px;color:#181818;">
                            ${escapeHtml(npc.name)}
                            <span style="font-size:10.5px;color:#888;margin-left:4px;">${escapeHtml(npc.region ? npc.region.split(' ')[0] : '')}</span>
                            ${isBlocked ? '<span style="font-size:10px;color:#fff;background:#fa5151;padding:1px 4px;border-radius:3px;margin-left:4px;">已拒收</span>' : ''}
                        </span>
                        <span style="font-size:11px;color:#b2b2b2;">${time}</span>
                    </div>
                    <div style="font-size:12.5px;color:#888888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px;">${escapeHtml(purePreview.slice(0, 32))}</div>
                </div>
            </div>`;
        }
        return itemsHtml;
    }

    function renderSingleChatWindow(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const npcId = window.G.currentChatNpc;
        const npc = window.G.npcs[npcId];
        if (!npc) { window.closeChat(); return; }

        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        const isBlocked = isAccountBlockedByNpc(npcId, curAcc.id);
        const chatHist = getAccountChatHistory(npcId, curAcc.id);

        let messagesHtml = '';
        for (const msg of chatHist) {
            if (msg.from === 'action') {
                messagesHtml += `
                <div style="text-align:center;margin:8px 0;">
                    <span style="display:inline-block;background:rgba(0,0,0,0.05);color:#888;padding:3px 10px;border-radius:4px;font-size:11.5px;max-width:85%;">${escapeHtml(msg.text || '')}</span>
                </div>`;
            } else if (msg.from === 'card_alt') {
                messagesHtml += `
                <div style="margin:10px 14px;background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;padding:10px;font-size:12.5px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
                    <div style="font-weight:600;color:#2563eb;margin-bottom:4px;">名片引荐</div>
                    <div>${escapeHtml(msg.text)}</div>
                </div>`;
            } else if (msg.type === 'sticker' && msg.stickerUrl) {
                const isSelf = msg.from === 'player';
                messagesHtml += `
                <div class="chat-msg-row" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:56%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        <img src="${escapeHtml(msg.stickerUrl)}" alt="${escapeHtml(msg.stickerDesc || '表情')}" style="width:110px;height:110px;object-fit:contain;border-radius:6px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else {
                const isSelf = msg.from === 'player';
                let bubbleContent = isSelf ? escapeHtml(msg.text || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(msg.text || '') : escapeHtml(msg.text || ''));

                messagesHtml += `
                <div class="chat-msg-row" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? '#95ec69' : '#ffffff'};color:#111;padding:8px 12px;border-radius:5px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:14.5px;line-height:1.5;word-break:break-word;">
                            ${bubbleContent}
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            }
        }

        const isBehindActive = !!window.G._behindScreenActive[npcId];
        if (typeof ensureStickersLoaded === 'function') ensureStickersLoaded();
        const stickerDrawerHtml = _stickerDrawerOpen ? buildChatStickerDrawerHTML('single', npcId) : '';

        const html = `
        <div style="background:#ededed;display:flex;flex-direction:column;height:100%;min-height:100%;overflow:hidden;font-family:-apple-system,sans-serif;">
            <div class="wechat-top-header">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                    <button onclick="window.closeChat()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>微信</span>
                    </button>
                    <div onclick="window.openNpcProfileCardModal('${npcId}')" style="cursor:pointer;font-weight:600;font-size:15px;color:#181818;margin-left:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${escapeHtml(npc.name)} <span style="font-size:11px;color:#888;font-weight:normal;">${escapeHtml(npc.region ? npc.region.split(' ')[0] : '')}</span>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button onclick="window.toggleBehindScreen('${npcId}')" style="border:0.5px solid #ccc;background:${isBehindActive ? '#dcdcdc' : '#fff'};color:#444;width:30px;height:30px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="动作感知">
                        <svg viewBox="0 0 24 24" style="width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button onclick="window.triggerAIReplyForSingle('${npcId}')" style="border:none;background:#07c160;color:#fff;width:30px;height:30px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                        <svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:currentColor;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
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
            <div style="padding:8px 10px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;gap:8px;align-items:center;flex-shrink:0;">
                <button onclick="window.toggleChatStickerDrawer('single','${npcId}')" title="表情包" style="border:none;background:none;width:28px;height:28px;cursor:pointer;flex-shrink:0;padding:0;display:flex;align-items:center;justify-content:center;">
                    <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#666666;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;">
                        <circle cx="12" cy="12" r="9.5"></circle>
                        <path d="M8 14.5c1 1.5 2.5 2.2 4 2.2s3-0.7 4-2.2"></path>
                        <circle cx="9" cy="9.5" r="1.2" fill="#666666" stroke="none"></circle>
                        <circle cx="15" cy="9.5" r="1.2" fill="#666666" stroke="none"></circle>
                    </svg>
                </button>
                <textarea id="singleChatInput" rows="1" placeholder="发消息..." style="flex:1;padding:8px 10px;border-radius:5px;border:none;background:#ffffff;font-size:14px;resize:none;outline:none;font-family:inherit;box-shadow:inset 0 0 0 0.5px #dcdcdc;"></textarea>
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

    function renderGroupChatWindow(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const gid = window.G.currentChatGroup;
        const grp = window.G.groups[gid];
        if (!grp) { window.closeGroupChat(); return; }
        const msgs = window.G.groupChatHistory[gid] || [];

        let messagesHtml = '';
        for (const msg of msgs) {
            if (msg.from === 'action') {
                messagesHtml += `
                <div style="text-align:center;margin:8px 0;">
                    <span style="display:inline-block;background:rgba(0,0,0,0.05);color:#888;padding:3px 10px;border-radius:4px;font-size:11px;">${escapeHtml(msg.text || '')}</span>
                </div>`;
            } else if (msg.type === 'sticker' && msg.stickerUrl) {
                const isSelf = msg.from === 'player';
                messagesHtml += `
                <div class="chat-msg-row" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: msg.senderAvatarUrl }, 38)}</div>` : ''}
                    <div style="max-width:56%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${!isSelf ? `<div style="font-size:11px;color:#888;margin-bottom:2px;">${escapeHtml(msg.senderName || '成员')}</div>` : ''}
                        <img src="${escapeHtml(msg.stickerUrl)}" alt="${escapeHtml(msg.stickerDesc || '表情')}" style="width:110px;height:110px;object-fit:contain;border-radius:6px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else {
                const isSelf = msg.from === 'player';
                let bubbleContent = isSelf ? escapeHtml(msg.text || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(msg.text || '') : escapeHtml(msg.text || ''));

                messagesHtml += `
                <div class="chat-msg-row" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: msg.senderAvatarUrl }, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${!isSelf ? `<div style="font-size:11px;color:#888;margin-bottom:2px;">${escapeHtml(msg.senderName || '成员')}</div>` : ''}
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? '#95ec69' : '#ffffff'};color:#111;padding:8px 12px;border-radius:5px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:14.5px;line-height:1.5;word-break:break-word;">
                            ${bubbleContent}
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            }
        }

        if (typeof ensureStickersLoaded === 'function') ensureStickersLoaded();
        const groupStickerDrawerHtml = _stickerDrawerOpen ? buildChatStickerDrawerHTML('group', gid) : '';

        const html = `
        <div style="background:#ededed;display:flex;flex-direction:column;height:100%;min-height:100%;overflow:hidden;font-family:-apple-system,sans-serif;">
            <div class="wechat-top-header">
                <div style="display:flex;align-items:center;gap:8px;">
                    <button onclick="window.closeGroupChat()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>微信</span>
                    </button>
                    <div>
                        <div style="font-weight:600;font-size:15px;color:#181818;margin-left:6px;">${escapeHtml(grp.name)} <span style="font-size:12px;color:#888;">${(grp.members || []).length}人</span></div>
                    </div>
                </div>
            </div>

            <div id="groupMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">群里很安静，来开启话题吧！</div>'}
            </div>

            ${groupStickerDrawerHtml}
            <div style="padding:8px 10px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;gap:8px;align-items:center;flex-shrink:0;">
                <button onclick="window.toggleChatStickerDrawer('group','${gid}')" title="表情包" style="border:none;background:none;width:28px;height:28px;cursor:pointer;flex-shrink:0;padding:0;display:flex;align-items:center;justify-content:center;">
                    <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#666666;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;">
                        <circle cx="12" cy="12" r="9.5"></circle>
                        <path d="M8 14.5c1 1.5 2.5 2.2 4 2.2s3-0.7 4-2.2"></path>
                        <circle cx="9" cy="9.5" r="1.2" fill="#666666" stroke="none"></circle>
                        <circle cx="15" cy="9.5" r="1.2" fill="#666666" stroke="none"></circle>
                    </svg>
                </button>
                <textarea id="groupChatInput" rows="1" placeholder="发消息..." style="flex:1;padding:8px 10px;border-radius:5px;border:none;background:#ffffff;font-size:14px;resize:none;outline:none;font-family:inherit;box-shadow:inset 0 0 0 0.5px #dcdcdc;"></textarea>
                <button onclick="window.doSendGroupChat('${gid}')" style="border:none;background:#07c160;color:#fff;padding:6px 13px;border-radius:4px;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;">发送</button>
            </div>
        </div>
        `;
        container.innerHTML = html;

        const msgArea = document.getElementById('groupMessageArea');
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

    // ============================================================
    // 🐷 表情包抽屉
    // ============================================================
    function buildChatStickerDrawerHTML(type, id) {
        const cats = window.G.stickerCategories || ['猪猪'];
        const active = window.G.activeStickerCategory || cats[0];
        const list = (window.G.stickerLibrary || []).filter(s => s.category === active);

        const tabsHtml = cats.map(c => `
            <span onclick="window.switchChatStickerCategory('${escapeHtml(c)}','${type}','${id}')" style="display:inline-block;padding:4px 10px;margin-right:6px;border-radius:12px;font-size:12px;cursor:pointer;flex-shrink:0;background:${c === active ? '#07c160' : '#e8e8e8'};color:${c === active ? '#fff' : '#666'};">${escapeHtml(c)}</span>
        `).join('');

        const gridHtml = list.length ? list.map(s => `
            <div onclick="window.sendChatSticker('${type}','${id}','${escapeHtml(s.url)}','${escapeHtml((s.desc || '').replace(/'/g, ''))}')" title="${escapeHtml(s.desc || '')}" style="width:64px;height:64px;cursor:pointer;border-radius:6px;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center;">
                <img src="${escapeHtml(s.url)}" style="width:100%;height:100%;object-fit:contain;" loading="lazy">
            </div>
        `).join('') : '<div style="color:#aaa;font-size:12px;padding:20px 0;width:100%;text-align:center;">该分类暂无表情</div>';

        return `
        <div id="chatStickerDrawer" style="background:#f7f7f7;border-top:0.5px solid #dcdcdc;flex-shrink:0;">
            <div style="display:flex;overflow-x:auto;padding:8px 10px 0;white-space:nowrap;">${tabsHtml}</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;padding:10px;max-height:180px;overflow-y:auto;">${gridHtml}</div>
        </div>`;
    }

    window.toggleChatStickerDrawer = function(type, id) {
        _stickerDrawerOpen = !_stickerDrawerOpen;
        if (type === 'single') renderSingleChatWindow();
        else renderGroupChatWindow();
    };

    window.switchChatStickerCategory = function(cat, type, id) {
        window.G.activeStickerCategory = cat;
        if (type === 'single') renderSingleChatWindow();
        else renderGroupChatWindow();
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
        }
        _stickerDrawerOpen = false;
        if (type === 'single') renderSingleChatWindow();
        else renderGroupChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // ============================================================
    // 🌐 暴露全局接口
    // ============================================================
    window.renderChatApp = renderChatApp;
    window.renderSocialPanel = renderChatApp;
    window.renderSingleChatWindow = renderSingleChatWindow;
    window.renderAvatarBadge = renderAvatarBadge;

    window.switchChatTab = function(tab) {
        window.G.chatActiveTab = tab;
        window.G.currentChatNpc = null;
        window.G.currentChatGroup = null;
        renderChatApp();
    };

    window.openChat = function(npcId) {
        if (!window.G.npcs || !window.G.npcs[npcId]) return;
        window.G.currentChatNpc = npcId;
        _stickerDrawerOpen = false;
        renderChatApp();
    };

    window.closeChat = function() {
        window.G.currentChatNpc = null;
        _stickerDrawerOpen = false;
        renderChatApp();
    };

    window.toggleBehindScreen = function(npcId) {
        if (!window.G._behindScreenActive) window.G._behindScreenActive = {};
        window.G._behindScreenActive[npcId] = !window.G._behindScreenActive[npcId];
        renderSingleChatWindow();
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
        input.value = '';
        renderGroupChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // 🤖 真实接入大模型 API：过滤思维链残留标签与出戏括号动作
    window.triggerAIReplyForSingle = async function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', region: '中国', name: '主播' };

        if (isAccountBlockedByNpc(npcId, curAcc.id)) {
            if (typeof showToast === 'function') showToast('当前账号已被对方拒收', 'error');
            return;
        }

        const history = getAccountChatHistory(npcId, curAcc.id);
        const pRegion = curAcc.region || '中国';
        const nRegion = npc.region || '美国 - 东部';
        const isDiffRegion = (pRegion !== nRegion);

        const recentDialogue = history.slice(-10).map(m => {
            const speaker = (m.from === 'player') ? curAcc.name : npc.name;
            return `${speaker}: ${m.text || ''}`;
        }).join('\n');

        const sysPrompt = (typeof window.buildCustomChatPrompt === 'function')
            ? window.buildCustomChatPrompt(npc, curAcc, history, { isDiffRegion, pRegion, nRegion })
            : `你正在扮演MC好友「${npc.name}」（人设：${npc.persona || '游戏同伴'}）。对方是「${curAcc.name}」。你常驻于${nRegion}，对方常驻于${pRegion}。
【打字纯净铁律】：
1. 像真人微信打字一样简明交流，正文中绝对禁止输出任何英文括号或中文括号动作描述（如(微笑)、(waves)、（思考））！
2. 严禁任何思维链碎碎念，直接输出对话正文。`;

        try {
            if (typeof showLoading === 'function') showLoading();
            
            const raw = await callAI([
                { role: 'system', content: sysPrompt },
                { role: 'user', content: recentDialogue ? `【最近对话】：\n${recentDialogue}\n\n请回复「${curAcc.name}」：` : '打个招呼吧。' }
            ], { maxTokens: 300, temperature: 0.85 });

            if (typeof hideLoading === 'function') hideLoading();

            let clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();
            clean = clean.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '').trim();

            if (clean) {
                pushChatMessageSafe(npcId, { from: 'npc', text: clean, time: new Date().toLocaleTimeString().slice(0, 5) }, curAcc.id);
                if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
                if (typeof autoSaveGame === 'function') autoSaveGame();
            }
        } catch(e) {
            if (typeof hideLoading === 'function') hideLoading();
            console.error('API 回复失败:', e);
            if (typeof showToast === 'function') showToast('回复失败，请检查AI配置', 'error');
        }
    };

})();
