/**
 * js/apps/chat/chat-app.js
 * 💬 微信独立主应用（真机无缝全屏 · 灵动岛防遮挡 · 海量人设全屏查看 · 群聊好友新建）
 * 包含模块：
 * 1. 界面：彻底消除外层粉色边距与边框，真正顶天立地全屏，顶栏下移避让灵动岛
 * 2. 关系网：修复加号弹窗，支持创建好友、自建多人讨论群、处理申请
 * 3. 角色人设：添加好友无简介干拢，名片页折叠人设预览 + 点击全屏查看海量人设 + 编辑长文本
 * 4. 头像机制：预留 assets/avatars/ 子目录头像库，新建与申请全自动随机抽选
 */

(function() {
    'use strict';

    // 预留头像库专属子目录路径
    const AVATAR_SUBDIR = 'assets/avatars/';
    window._MCYT_AVATAR_SUBDIR = AVATAR_SUBDIR;

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

    // 强制消除外层框中框，真正 100% 满屏微信质感
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

        if (typeof window.restoreWechatProfileData === 'function') {
            window.restoreWechatProfileData();
        }

        for (const [id, npc] of Object.entries(window.G.npcs)) {
            if (!npc.id) npc.id = id;
            if (!npc.name) npc.name = id;
            if (npc.favor === undefined) npc.favor = 50;
            if (!npc.region) npc.region = (id.includes('dream') || id.includes('george')) ? '美国 - 东部 (US East)' : '中国 (China)';
            if (!npc.avatarUrl) npc.avatarUrl = getRandomAvatar();
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
    // ➕ 加号菜单：添加好友、自建群聊、申请列表
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
                        <span>添加新朋友 (自定义NPC)</span>
                        <span style="color:#2563eb;">›</span>
                    </button>
                    <button type="button" onclick="closeModal(); window.openCreateGroupModal();" style="border:1px solid #cbd5e1;background:#f8fafc;padding:12px;border-radius:8px;font-size:13px;font-weight:600;color:#1e293b;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;">
                        <span>发起多人讨论群</span>
                        <span style="color:#07c160;">›</span>
                    </button>
                    <button type="button" onclick="closeModal(); window.openFriendRequestsListModal();" style="border:1px solid #cbd5e1;background:#f8fafc;padding:12px;border-radius:8px;font-size:13px;font-weight:600;color:#1e293b;cursor:pointer;text-align:left;display:flex;justify-content:space-between;align-items:center;">
                        <span>待处理好友与群邀请 (${totalPending})</span>
                        <span style="color:#e53e3e;">${totalPending > 0 ? `● ${totalPending}` : '›'}</span>
                    </button>
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:14px;">
                    <button type="button" onclick="closeModal()" style="border:none;background:none;color:#64748b;font-size:12.5px;cursor:pointer;">关闭</button>
                </div>
            </div>
        `);
    };

    // 👤 添加新朋友（移除简介输入，自动随机头像）
    window.openCreateCustomNpcModal = function() {
        let currentAssignedAvatar = getRandomAvatar();

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
                    <input type="text" id="custNpcName" placeholder="输入昵称..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;box-sizing:border-box;outline:none;">
                </div>

                <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:12.5px;color:#475569;font-weight:600;display:block;margin-bottom:3px;">常驻地区</label>
                    <input type="text" id="custNpcRegion" value="美国 - 东部 (US East)" placeholder="用于时差生活习惯感知..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;box-sizing:border-box;outline:none;">
                </div>

                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12.5px;color:#475569;font-weight:600;display:block;margin-bottom:3px;">初始好感度 (0~100)</label>
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

        document.getElementById('btnConfirmCreateNpc').onclick = () => {
            const name = document.getElementById('custNpcName').value.trim();
            const region = document.getElementById('custNpcRegion').value.trim() || '美国 - 东部 (US East)';
            if (!name) {
                if (typeof showToast === 'function') showToast('请填写好友昵称', 'error');
                return;
            }
            const newId = 'custom_' + Date.now();
            ensureNpcIntegrity();
            window.G.npcs[newId] = {
                id: newId,
                name,
                persona: '', // 初始人设为空，后续名片页长按/全屏编辑海量文本
                region,
                avatarUrl: currentAssignedAvatar,
                favor: parseInt(document.getElementById('custNpcFavor').value) || 50,
                skills: { building: 50, redstone: 50, pvp: 60, survival: 50, hunting: 50 },
                isCustom: true
            };
            closeModal();
            renderChatApp();
            if (typeof showToast === 'function') showToast(`🎉 已成功添加「${name}」！`, 'success', 2000);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
    };

    // 👥 发起群聊
    window.openCreateGroupModal = function() {
        const npcs = Object.entries(window.G.npcs || {});
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
                desc: '主播自由交流',
                avatarUrl: getRandomAvatar(),
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
        const reqs = window.G.friendRequests || [];
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

        if (action === 'accept') {
            ensureNpcIntegrity();
            const newId = req.npcOfficialId || ('npc_' + Date.now());
            window.G.npcs[newId] = {
                id: newId,
                name: req.name || '好友',
                persona: req.persona || '',
                region: '美国 - 东部 (US East)',
                avatarUrl: req.avatarUrl || getRandomAvatar(),
                favor: 50,
                skills: { building: 50, redstone: 50, pvp: 50, survival: 50, hunting: 50 }
            };
            pushChatMessageSafe(newId, {
                from: 'npc',
                text: `你好！我通过了你的好友验证，一起玩MC吧！`,
                time: new Date().toLocaleTimeString().slice(0, 5)
            });
            window.G.friendRequests.splice(reqIdx, 1);
            if (typeof showToast === 'function') showToast(`🎉 成功添加好友「${req.name}」！`, 'success', 1500);
        } else {
            window.G.friendRequests.splice(reqIdx, 1);
        }
        closeModal();
        renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // ============================================================
    // 📖 角色名片页：折叠预览 + 全屏查看海量人设 + 编辑
    // ============================================================
    window.openNpcProfileCardModal = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        const personaText = npc.persona || '';
        const previewPersona = personaText ? personaText.slice(0, 75) + (personaText.length > 75 ? '...' : '') : '暂无人设档案（点击编辑补充）';

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid #f1f5f9;padding-bottom:12px;margin-bottom:12px;">
                    <img src="${npc.avatarUrl || getRandomAvatar()}" style="width:54px;height:54px;border-radius:6px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';" />
                    <div style="flex:1;">
                        <div style="font-size:16px;font-weight:700;color:#1e293b;">${escapeHtml(npc.name)}</div>
                        <div style="font-size:12px;color:#64748b;margin-top:2px;">地区：${escapeHtml(npc.region || '未知')} · 好感度：<span style="color:#ef4444;font-weight:600;">${npc.favor || 50}</span>/100</div>
                    </div>
                </div>

                <!-- 折叠人设卡片 -->
                <div style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;padding:10px 12px;margin-bottom:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <span style="font-size:12px;font-weight:600;color:#334155;">角色人设档案</span>
                        <button type="button" onclick="window.openFullPersonaModal('${npcId}')" style="border:none;background:none;color:#2563eb;font-size:11.5px;cursor:pointer;padding:0;font-weight:600;">🔍 全屏查看</button>
                    </div>
                    <div style="font-size:12px;color:#64748b;line-height:1.5;white-space:pre-wrap;word-break:break-word;max-height:60px;overflow:hidden;">
                        ${escapeHtml(previewPersona)}
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;">
                    <button type="button" onclick="window.openEditNpcPersonaModal('${npcId}')" style="border:1px solid #cbd5e1;background:#fff;color:#1e293b;padding:8px;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;text-align:center;">
                        ✏️ 编辑海量长文本人设
                    </button>
                    <button type="button" onclick="closeModal(); window.openChat('${npcId}');" style="border:none;background:#07c160;color:#fff;padding:8px;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;text-align:center;">
                        发消息
                    </button>
                    <button type="button" onclick="closeModal()" style="border:none;background:none;color:#64748b;font-size:12px;cursor:pointer;margin-top:2px;">返回</button>
                </div>
            </div>
        `);
    };

    // 🔍 全屏查看海量长人设
    window.openFullPersonaModal = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;height:70vh;display:flex;flex-direction:column;">
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:10px;flex-shrink:0;">
                    <div style="font-size:15px;font-weight:700;color:#1e3a8a;">「${escapeHtml(npc.name)}」完整人设</div>
                    <button type="button" onclick="window.openNpcProfileCardModal('${npcId}')" style="border:none;background:none;color:#64748b;font-size:12px;cursor:pointer;">‹ 返回名片</button>
                </div>
                <div style="flex:1;overflow-y:auto;background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;font-size:13px;line-height:1.7;color:#1e293b;white-space:pre-wrap;word-break:break-word;">
                    ${escapeHtml(npc.persona || '暂无详细人设文本')}
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:10px;flex-shrink:0;">
                    <button type="button" onclick="window.openEditNpcPersonaModal('${npcId}')" style="border:none;background:#2563eb;color:#fff;padding:6px 14px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">修改人设</button>
                </div>
            </div>
        `);
    };

    // ✏️ 编辑海量长文本人设
    window.openEditNpcPersonaModal = function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;border-bottom:1.5px solid #eef2f7;padding-bottom:8px;margin-bottom:10px;">
                    编辑「${escapeHtml(npc.name)}」人设
                </div>
                <div style="font-size:11.5px;color:#64748b;margin-bottom:6px;">可粘贴海量角色性格、语气特点、过往经历与互动禁忌：</div>
                <textarea id="editHugePersonaInput" rows="10" placeholder="在此粘贴角色长篇人设设定..." style="width:100%;padding:10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;line-height:1.6;box-sizing:border-box;resize:none;outline:none;font-family:inherit;">${escapeHtml(npc.persona || '')}</textarea>
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
                    <button type="button" onclick="window.openNpcProfileCardModal('${npcId}')" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnSaveHugePersona" style="border:none;background:#07c160;color:#fff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">保存人设</button>
                </div>
            </div>
        `);

        document.getElementById('btnSaveHugePersona').onclick = () => {
            const val = document.getElementById('editHugePersonaInput').value;
            npc.persona = val;
            window.openNpcProfileCardModal(npcId);
            if (typeof showToast === 'function') showToast('角色长人设已更新保存！', 'success', 1500);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
    };

    // ============================================================
    // 💬 会话列表与单人/群聊窗口
    // ============================================================
    function buildChatListHTML() {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', isAlt: false };
        const isAlt = curAcc.isAlt;
        const allNpcList = Object.entries(window.G.npcs || {});

        let visibleNpcList = allNpcList;
        if (isAlt) {
            visibleNpcList = allNpcList.filter(([id]) => {
                const hist = getAccountChatHistory(id, curAcc.id);
                return hist && hist.length > 0;
            });
        }

        if (!visibleNpcList.length) {
            return `
            <div style="text-align:center;color:#b2b2b2;padding:60px 16px;font-size:13px;line-height:1.8;">
                <div style="font-size:36px;margin-bottom:8px;opacity:0.65;">💬</div>
                <b>${isAlt ? '小号通讯录空白' : '暂无聊天消息'}</b><br>
                ${isAlt ? '可通过主号名片引荐，或点击右上角 + 添加联系人！' : '点击右上角 + 开始交流！'}
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

        const html = `
        <div style="background:#ededed;display:flex;flex-direction:column;height:100%;min-height:100%;overflow:hidden;font-family:-apple-system,sans-serif;">
            <div class="wechat-top-header">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                    <button onclick="window.closeChat()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>微信</span>
                    </button>
                    <div onclick="window.openNpcProfileCardModal('${npcId}')" style="cursor:pointer;font-weight:600;font-size:15px;color:#181818;margin-left:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${escapeHtml(npc.name)} <span style="font-size:11px;color:#888;font-weight:normal;">(${escapeHtml(npc.region ? npc.region.split(' ')[0] : '')})</span>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button onclick="window.sendAltCardToNpc('${npcId}')" style="border:0.5px solid #ccc;background:#fff;color:#333;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer;">推小号</button>
                    <button onclick="window.triggerAIReplyForSingle('${npcId}')" style="border:none;background:#07c160;color:#fff;width:30px;height:30px;border-radius:6px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;">⚡</button>
                </div>
            </div>

            ${isBlocked ? `
            <div style="background:#fff2f0;color:#fa5151;padding:6px 12px;font-size:11.5px;border-bottom:0.5px solid #ffccc7;flex-shrink:0;">
                <span>⚠️ 当前账号消息已被对方拒收</span>
            </div>` : ''}

            <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">打个招呼开启畅聊吧！</div>'}
            </div>

            <div style="padding:8px 10px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;gap:6px;align-items:center;flex-shrink:0;">
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

        const html = `
        <div style="background:#ededed;display:flex;flex-direction:column;height:100%;min-height:100%;overflow:hidden;font-family:-apple-system,sans-serif;">
            <div class="wechat-top-header">
                <div style="display:flex;align-items:center;gap:8px;">
                    <button onclick="window.closeGroupChat()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>微信</span>
                    </button>
                    <div>
                        <div style="font-weight:600;font-size:15px;color:#181818;margin-left:6px;">${escapeHtml(grp.name)} <span style="font-size:12px;color:#888;">(${(grp.members || []).length})</span></div>
                    </div>
                </div>
            </div>

            <div id="groupMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">群里很安静，来开启话题吧！</div>'}
            </div>

            <div style="padding:8px 10px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;gap:6px;align-items:center;flex-shrink:0;">
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

    // 推荐小号名片
    window.sendAltCardToNpc = function(npcId) {
        const alts = window.G.altAccounts || [];
        if (!alts.length) {
            if (typeof showToast === 'function') showToast('你目前尚未注册任何小号', 'info');
            return;
        }

        let altOptions = alts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:10px;">推荐小号名片</div>
                <div style="font-size:12px;color:#666;margin-bottom:8px;">选择引荐给 TA 的小号：</div>
                <select id="selectAltToPush" style="width:100%;padding:8px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;margin-bottom:12px;">
                    ${altOptions}
                </select>
                <div style="display:flex;justify-content:flex-end;gap:8px;">
                    <button type="button" onclick="closeModal()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmPushAlt" style="border:none;background:#2563eb;color:#fff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">发送名片</button>
                </div>
            </div>
        `);

        document.getElementById('btnConfirmPushAlt').onclick = () => {
            const targetAltId = document.getElementById('selectAltToPush').value;
            const targetAlt = alts.find(a => a.id === targetAltId);
            if (!targetAlt) return;

            const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: '我', id: 'main' };
            pushChatMessageSafe(npcId, {
                from: 'card_alt',
                text: `${curAcc.name} 推送了小号「${targetAlt.name}」的名片给对方。`,
                time: new Date().toLocaleTimeString().slice(0, 5)
            }, curAcc.id);

            if (!window.G.friendRequests) window.G.friendRequests = [];
            window.G.friendRequests.push({
                _id: 'freq_alt_' + Date.now(),
                targetAltId: targetAlt.id,
                npcOfficialId: npcId,
                name: window.G.npcs[npcId]?.name || '好友',
                fromReason: `收到了名片引荐，添加你的小号「${targetAlt.name}」`,
                avatarUrl: window.G.npcs[npcId]?.avatarUrl
            });

            closeModal();
            renderSingleChatWindow();
            if (typeof showToast === 'function') showToast(`已将「${targetAlt.name}」名片发送给对方！`, 'success', 2000);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
    };

    // ============================================================
    // 🌐 暴露全局接口
    // ============================================================
    window.renderChatApp = renderChatApp;
    window.renderSocialPanel = renderChatApp;
    window.renderSingleChatWindow = renderSingleChatWindow;
    window.renderGroupChatWindow = renderGroupChatWindow;
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
        renderChatApp();
    };

    window.closeChat = function() {
        window.G.currentChatNpc = null;
        renderChatApp();
    };

    window.openGroupChat = function(gid) {
        if (!window.G.groups || !window.G.groups[gid]) return;
        window.G.currentChatGroup = gid;
        renderChatApp();
    };

    window.closeGroupChat = function() {
        window.G.currentChatGroup = null;
        renderChatApp();
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

    // 提示词占位调度
    window.triggerAIReplyForSingle = async function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', region: '中国 (China)', name: '主播' };

        if (isAccountBlockedByNpc(npcId, curAcc.id)) {
            if (typeof showToast === 'function') showToast('当前账号已被对方拒收', 'error');
            return;
        }

        const history = getAccountChatHistory(npcId, curAcc.id);
        const pRegion = curAcc.region || '中国 (China)';
        const nRegion = npc.region || '美国 - 东部 (US East)';
        const isDiffRegion = (pRegion !== nRegion);

        const sysPrompt = (typeof window.buildCustomChatPrompt === 'function')
            ? window.buildCustomChatPrompt(npc, curAcc, history, { isDiffRegion, pRegion, nRegion })
            : `你正在扮演MC好友「${npc.name}」（人设：${npc.persona || '游戏伙伴'}）。对方是「${curAcc.name}」。你常驻于${nRegion}，对方常驻于${pRegion}。像真实微信打字一样简明回复，严禁任何括号动作。`;

        try {
            if (typeof showLoading === 'function') showLoading();
            const raw = await callAI([{ role: 'system', content: sysPrompt }, { role: 'user', content: '请回复。' }], { maxTokens: 300 });
            if (typeof hideLoading === 'function') hideLoading();
            const clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();
            if (clean) {
                pushChatMessageSafe(npcId, { from: 'npc', text: clean, time: new Date().toLocaleTimeString().slice(0, 5) }, curAcc.id);
                if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
                if (typeof autoSaveGame === 'function') autoSaveGame();
            }
        } catch(e) {
            if (typeof hideLoading === 'function') hideLoading();
            if (typeof showToast === 'function') showToast('回复失败', 'error');
        }
    };

})();
