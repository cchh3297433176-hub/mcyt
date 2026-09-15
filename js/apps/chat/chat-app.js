/**
 * js/apps/chat/chat-app.js
 * 💬 微信独立 App（真机无缝全屏 + 聊天/动态/我的 三 Tab 架构 + 线下人设中枢 + 账号管理）
 * 包含：
 * 1. 界面：无缝沉浸式全屏微信 UI、三 Tab 底部导航（微信 / 动态 / 我）
 * 2. 聊天：单人私聊、多人讨论群、表情包抽屉、好友申请/建群中枢
 * 3. 动态：微信朋友圈动态流、发动态、NPC评论互动
 * 4. 我：个人名片与头像库更换、线下真实人设/地区编辑、大号小号马甲切换与专属头像摇号
 * 5. 引擎：跨地区/异地自动感知、好感度自动晋级恋人阶段、提示词动态装载接口
 */

(function() {
    'use strict';

    // 🐷 内置默认表情包源数据
    const DEFAULT_PIG_STICKERS = [
        {category:'猪猪',desc:'这只可爱的小猪就是我呀',url:'https://imgbed.heliar.top/i/QZNPVIKLzB8DiDL-.jpg'},
        {category:'猪猪',desc:'你给我老实点',url:'https://imgbed.heliar.top/i/KpiF2iLAUzHVDvjD.jpg'},
        {category:'猪猪',desc:'骂我的人看到我这样还忍心骂吗',url:'https://imgbed.heliar.top/i/TnIT9ii2FOss4Fke.jpg'},
        {category:'猪猪',desc:'这两只小猪就是我们呀',url:'https://imgbed.heliar.top/i/K0UZOCq2MYES8vga.jpg'},
        {category:'猪猪',desc:'悲愤离开',url:'https://imgbed.heliar.top/i/O7E9kWjlYBDg59W-.jpg'},
        {category:'猪猪',desc:'猪是必须要爱惜的',url:'https://imgbed.heliar.top/i/tiUgP49B0Tez99eI.jpg'},
        {category:'猪猪',desc:'而我只是一个QQ肠',url:'https://imgbed.heliar.top/i/G4YYaUbHaS62Acf-.jpg'},
        {category:'猪猪',desc:'小猪魔法',url:'https://imgbed.heliar.top/i/nEe02eA-RY7p7Ehl.jpg'},
        {category:'猪猪',desc:'wink一下',url:'https://imgbed.heliar.top/i/PSfpaNyQU1Pe2Qvm.jpg'},
        {category:'猪猪',desc:'再睡拱死你',url:'https://imgbed.heliar.top/i/2IqW2TDCBMsl81T9.jpg'},
        {category:'猪猪',desc:'忙着玩手机',url:'https://imgbed.heliar.top/i/AKsZ0ADV1nbpN6Xh.jpg'},
        {category:'猪猪',desc:'饶了这一次呗',url:'https://imgbed.heliar.top/i/cAIQytv_7rGo92is.jpg'},
        {category:'猪猪',desc:'气疯了你满意了吗！',url:'https://imgbed.heliar.top/i/ST0SkhSSAT0tNcJ7.jpg'},
        {category:'猪猪',desc:'熟睡中',url:'https://imgbed.heliar.top/i/pa6PWuk1W2T9sM_i.jpg'},
        {category:'猪猪',desc:'突然出现',url:'https://imgbed.heliar.top/i/rH-ZeZBzySvEydf1.jpg'},
        {category:'猪猪',desc:'你这样对我我会哭的呀',url:'https://imgbed.heliar.top/i/JVjz3snh4bQPeJPB.jpg'},
        {category:'猪猪',desc:'就这样萌萌的看着泥',url:'https://imgbed.heliar.top/i/wjHyOK7Nlrje2RMj.jpg'},
        {category:'猪猪',desc:'我发现躺着会很酥胡',url:'https://imgbed.heliar.top/i/iOZZUDJmk9i4oyjK.jpg'},
        {category:'猪猪',desc:'我把话放这了',url:'https://imgbed.heliar.top/i/QNTbRjWXRXJiFof8.jpg'},
        {category:'猪猪',desc:'猪的天啊',url:'https://imgbed.heliar.top/i/Iaai5e8mbqtCqciE.jpg'},
        {category:'猪猪',desc:'我素你的掌上明猪呀',url:'https://imgbed.heliar.top/i/9ro4rlqIzD9nH1uw.jpg'},
        {category:'猪猪',desc:'如果我是猪也该遇见属于我的恋猪癖了',url:'https://imgbed.heliar.top/i/JN_hGfK5CEHBb34K.jpg'},
        {category:'猪猪',desc:'你不要猪了吗',url:'https://imgbed.heliar.top/i/LSckmvTxPcjpX5sM.jpg'},
        {category:'猪猪',desc:'你这只猪到底想我没',url:'https://imgbed.heliar.top/i/EpozQFX0HEf6X9TF.jpg'},
        {category:'猪猪',desc:'两猪对视',url:'https://imgbed.heliar.top/i/OjuoWxmO7dtaCGGr.jpg'},
        {category:'猪猪',desc:'别想让我理你这只猪了',url:'https://imgbed.heliar.top/i/3Uy69MILiykjX2Yw.jpg'},
        {category:'猪猪',desc:'你这只猪又不理我',url:'https://imgbed.heliar.top/i/YKTyf0FsRqDaAUFv.jpg'}
    ];

    // ============================================================
    // 🖼️ 头像库索引与随机机制
    // ============================================================
    window._MCYT_AVATARS_POOL = [];

    async function initAvatarPool() {
        try {
            const resp = await fetch('avatars/list.json');
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
            if (picked.startsWith('http') || picked.startsWith('assets/') || picked.startsWith('data:') || picked.startsWith('avatars/')) {
                return picked;
            }
            return `avatars/${picked}`;
        }
        return 'assets/icons/chat.png';
    }
    window.getRandomAvatar = getRandomAvatar;

    let _activeBottomTab = 'chats';
    let _stickerDrawerOpen = false;

    // 微信风无缝沉浸式全屏样式
    function ensureChatShellStyles() {
        if (document.getElementById('wechat-fullscreen-style')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'wechat-fullscreen-style';
        styleEl.textContent = `
            .app-modal-layer.wechat-seamless-shell {
                background: #ededed !important;
                padding: 0 !important;
            }
            .app-modal-layer.wechat-seamless-shell .app-modal-head {
                display: none !important;
            }
            .app-modal-layer.wechat-seamless-shell .app-modal-body {
                padding: 0 !important;
                margin: 0 !important;
                background: #ededed !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                height: 100% !important;
                max-height: 100% !important;
                display: flex !important;
                flex-direction: column !important;
            }
            .app-modal-layer.wechat-seamless-shell .app-modal-foot {
                display: none !important;
            }
        `;
        document.head.appendChild(styleEl);
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
        if (!window.G.currentAccountId) window.G.currentAccountId = 'main';
        if (!window.G.altAccounts) window.G.altAccounts = [];
        if (!window.G.blockedRecords) window.G.blockedRecords = [];
        if (!window.G._behindScreenActive) window.G._behindScreenActive = {};
        if (!window.G._chatShowFullHistory) window.G._chatShowFullHistory = {};

        // 玩家基础信息及地区/线下人设保障
        if (!window.G.player) window.G.player = {};
        if (!window.G.player.avatar) window.G.player.avatar = getRandomAvatar();
        if (!window.G.player.region) window.G.player.region = '中国';
        if (!window.G.player.offlinePersona) {
            window.G.player.offlinePersona = window.G.player.persona || '全职MC创作者，作息昼夜颠倒，常在深夜剪视频，喜欢喝冰咖啡。';
        }

        for (const [id, npc] of Object.entries(window.G.npcs)) {
            if (!npc.id) npc.id = id;
            if (!npc.name) npc.name = id;
            if (npc.favor === undefined) npc.favor = 50;
            if (!npc.region) npc.region = (id.includes('dream') || id.includes('george') || id.includes('sapnap')) ? '美国' : '中国';
            if (!npc.summaryThreshold) npc.summaryThreshold = 10;
            if (!npc.keepRecent) npc.keepRecent = 5;
            if (!npc.avatarUrl) npc.avatarUrl = getRandomAvatar();
        }
    }

    function ensureStickersLoaded() {
        if (!window.G) window.G = {};
        if (!window.G.stickerCategories || !Array.isArray(window.G.stickerCategories)) window.G.stickerCategories = ['猪猪', '默认'];
        if (!window.G.stickerCategories.includes('猪猪')) window.G.stickerCategories.unshift('猪猪');
        if (!window.G.activeStickerCategory) window.G.activeStickerCategory = '猪猪';
        if (!window.G.stickerLibrary || !Array.isArray(window.G.stickerLibrary) || window.G.stickerLibrary.length === 0) {
            window.G.stickerLibrary = [...DEFAULT_PIG_STICKERS];
        } else {
            const hasPig = window.G.stickerLibrary.some(s => s && s.category === '猪猪');
            if (!hasPig) window.G.stickerLibrary.unshift(...DEFAULT_PIG_STICKERS);
        }
    }

    function getChatStorageKey(npcId, accId = null) {
        return `${accId || window.G.currentAccountId || 'main'}_${npcId}`;
    }

    function getAccountChatHistory(npcId, accId = null) {
        if (!window.G.chatHistory) window.G.chatHistory = {};
        const key = getChatStorageKey(npcId, accId);
        if (!window.G.chatHistory[key]) {
            const targetAcc = accId || window.G.currentAccountId || 'main';
            if (targetAcc === 'main' && Array.isArray(window.G.chatHistory[npcId])) {
                window.G.chatHistory[key] = window.G.chatHistory[npcId];
            } else {
                window.G.chatHistory[key] = [];
            }
        }
        return window.G.chatHistory[key];
    }

    function pushChatMessageSafe(npcId, msgObj, accId = null) {
        if (!msgObj._id) msgObj._id = 'cmsg_' + Date.now() + '_' + (Math.floor(Math.random() * 8999) + 1000);
        getAccountChatHistory(npcId, accId).push(msgObj);
    }

    function isAccountBlockedByNpc(npcId, accId = null) {
        const curAcc = accId || window.G.currentAccountId || 'main';
        const token = `${npcId}_${curAcc}`;
        if (curAcc === 'main' && Array.isArray(window.G.blockedNpcs) && window.G.blockedNpcs.includes(npcId)) return true;
        return (window.G.blockedRecords || []).includes(token);
    }

    function getActiveAccountInfo() {
        const curId = window.G.currentAccountId || 'main';
        if (curId === 'main') {
            return {
                id: 'main',
                isAlt: false,
                name: window.G.player?.ytName || '主播大号',
                avatar: window.G.player?.avatar || getRandomAvatar(),
                bio: 'YouTube 官方大号',
                region: window.G.player?.region || '中国'
            };
        }
        const found = (window.G.altAccounts || []).find(a => a.id === curId);
        if (found) {
            return {
                id: found.id,
                isAlt: true,
                name: found.name,
                avatar: found.avatar || getRandomAvatar(),
                bio: found.bio || '私密小号',
                region: found.region || window.G.player?.region || '中国'
            };
        }
        return { id: 'main', isAlt: false, name: window.G.player?.ytName || '主播大号', avatar: window.G.player?.avatar || getRandomAvatar(), bio: '', region: '中国' };
    }

    function renderAvatarBadge(obj, size = 46) {
        const url = (obj && obj.isPlayer) ? (getActiveAccountInfo().avatar) : (obj?.avatarUrl || getRandomAvatar());
        return `<div style="width:${size}px;height:${size}px;border-radius:6px;overflow:hidden;background:#e9e9e9;flex-shrink:0;box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.06);">
            <img src="${url}" draggable="false" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.onerror=null;this.src='assets/icons/chat.png';" />
        </div>`;
    }

    // ============================================================
    // 📱 微信 App 整体调度中枢（聊天 / 动态 / 我）
    // ============================================================
    function renderChatApp(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const appModal = document.getElementById('appModal');
        if (appModal) appModal.classList.add('wechat-seamless-shell');

        ensureNpcIntegrity();
        ensureStickersLoaded();

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
        const curAcc = getActiveAccountInfo();

        if (_activeBottomTab === 'chats') {
            const isDirect = window.G.chatActiveTab !== 'group';
            topBarHtml = `
                <div style="height:50px;background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;padding:0 14px;flex-shrink:0;">
                    <button onclick="closePhoneApp()" style="border:none;background:none;font-size:14px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>❮</span> <span>桌面</span>
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
                <div style="height:50px;background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;padding:0 14px;flex-shrink:0;">
                    <button onclick="closePhoneApp()" style="border:none;background:none;font-size:14px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>❮</span> <span>桌面</span>
                    </button>
                    <div style="font-size:15px;font-weight:600;color:#181818;">朋友圈</div>
                    <div style="display:flex;gap:6px;">
                        <button onclick="window.triggerGenerateFriendsFeed()" style="border:none;background:none;color:#07c160;font-size:13px;font-weight:600;cursor:pointer;">✨刷新</button>
                        <button onclick="window.openPostMomentModal()" style="border:none;background:none;font-size:18px;cursor:pointer;color:#181818;">📷</button>
                    </div>
                </div>
            `;
            mainContentHtml = buildMomentsHTML();
        } else if (_activeBottomTab === 'profile') {
            topBarHtml = `
                <div style="height:50px;background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;padding:0 14px;flex-shrink:0;">
                    <button onclick="closePhoneApp()" style="border:none;background:none;font-size:14px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>❮</span> <span>桌面</span>
                    </button>
                    <div style="font-size:15px;font-weight:600;color:#181818;">我 · 身份中心</div>
                    <div style="width:40px;"></div>
                </div>
            `;
            mainContentHtml = buildProfileTabHTML();
        }

        const bottomNavHtml = `
            <div style="height:52px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;justify-content:space-around;align-items:center;flex-shrink:0;box-sizing:border-box;">
                <button onclick="window.switchWechatBottomTab('chats')" style="border:none;background:none;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;color:${_activeBottomTab === 'chats' ? '#07c160' : '#7f7f7f'};">
                    <span style="font-size:19px;">💬</span>
                    <span style="font-size:10.5px;font-weight:${_activeBottomTab === 'chats' ? '600' : 'normal'};">微信</span>
                </button>
                <button onclick="window.switchWechatBottomTab('moments')" style="border:none;background:none;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;color:${_activeBottomTab === 'moments' ? '#07c160' : '#7f7f7f'};">
                    <span style="font-size:19px;">🌟</span>
                    <span style="font-size:10.5px;font-weight:${_activeBottomTab === 'moments' ? '600' : 'normal'};">动态</span>
                </button>
                <button onclick="window.switchWechatBottomTab('profile')" style="border:none;background:none;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;color:${_activeBottomTab === 'profile' ? '#07c160' : '#7f7f7f'};">
                    <span style="font-size:19px;">👤</span>
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
                    bindLongPressEvent(item, () => { window.openChat(id); }, () => { window.openEditNpcModal(id); });
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
    // 👤 Tab 3：「我」页面——人设中枢 + 切号与马甲管理
    // ============================================================
    function buildProfileTabHTML() {
        const curAcc = getActiveAccountInfo();
        const p = window.G.player || {};
        const offlinePersona = p.offlinePersona || p.persona || '';
        const curRegion = curAcc.region || p.region || '中国';

        let altsListHtml = '';
        const alts = window.G.altAccounts || [];
        alts.forEach(alt => {
            const isUsing = window.G.currentAccountId === alt.id;
            altsListHtml += `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9fafb;border-radius:8px;border:0.5px solid #e5e7eb;margin-bottom:6px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${alt.avatar || getRandomAvatar()}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';" />
                    <div>
                        <div style="font-size:13px;font-weight:600;color:#1f2937;">${escapeHtml(alt.name)} <span style="font-size:10px;background:#e5e7eb;padding:1px 4px;border-radius:3px;">小号</span></div>
                        <div style="font-size:11px;color:#6b7280;">地区：${escapeHtml(alt.region || '中国')} · ${escapeHtml(alt.bio || '无简介')}</div>
                    </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;">
                    <button type="button" onclick="window.rerollAltAvatar('${alt.id}')" style="border:none;background:#f3f4f6;color:#2563eb;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer;">🎲换图</button>
                    ${isUsing ? '<span style="font-size:11px;color:#059669;font-weight:600;">● 使用中</span>' : `<button type="button" onclick="window.switchToAccount('${alt.id}')" style="border:none;background:#07c160;color:#fff;padding:4px 9px;border-radius:4px;font-size:11px;cursor:pointer;">使用</button>`}
                    <button type="button" onclick="window.deleteAltAccountDirect('${alt.id}')" style="border:none;background:none;color:#ef4444;font-size:12px;cursor:pointer;padding:2px;">🗑️</button>
                </div>
            </div>
            `;
        });

        return `
        <div style="background:#f7f7f7;min-height:100%;padding-bottom:24px;box-sizing:border-box;">
            <!-- 当前激活账号名片 -->
            <div style="background:#ffffff;padding:16px;display:flex;align-items:center;gap:14px;border-bottom:0.5px solid #e0e0e0;">
                <div style="position:relative;flex-shrink:0;">
                    <img id="myWechatAvatar" src="${curAcc.avatar}" style="width:62px;height:62px;border-radius:8px;object-fit:cover;display:block;" onerror="this.src='assets/icons/chat.png';" />
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:17px;font-weight:600;color:#181818;display:flex;align-items:center;gap:6px;">
                        <span>${escapeHtml(curAcc.name)}</span>
                        ${curAcc.isAlt ? '<span style="font-size:10px;background:#e5e7eb;color:#374151;padding:1px 5px;border-radius:3px;">小号</span>' : '<span style="font-size:10px;background:#e8f5e9;color:#059669;padding:1px 5px;border-radius:3px;">主号</span>'}
                    </div>
                    <div style="font-size:12px;color:#888888;margin-top:3px;">
                        地区：${escapeHtml(curRegion)} · 身份：${escapeHtml(curAcc.bio || '创作者')}
                    </div>
                </div>
                <button type="button" onclick="window.rerollActiveAvatar()" style="border:1px solid #dcdcdc;background:#f9f9f9;color:#07c160;padding:5px 9px;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;">
                    🎲 换头像
                </button>
            </div>

            <!-- 🏠 线下真实人设设定（动态注入核心） -->
            <div style="margin-top:10px;background:#ffffff;padding:14px 16px;border-top:0.5px solid #e0e0e0;border-bottom:0.5px solid #e0e0e0;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <div style="font-size:14px;font-weight:600;color:#181818;">🏠 线下真实人设与地区</div>
                    <span style="font-size:11px;color:#999;">NPC 会在私聊与动作感知中呼应</span>
                </div>

                <div class="form-group" style="margin-bottom:8px;">
                    <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:3px;">你的常驻地区（用于异地恋/跨地区动态感知）：</label>
                    <input type="text" id="myPlayerRegionInput" value="${escapeHtml(curRegion)}" placeholder="如：中国、美国、英国..." style="width:100%;padding:7px 10px;border-radius:6px;border:1px solid #dcdcdc;background:#fafafa;font-size:13px;box-sizing:border-box;outline:none;">
                </div>

                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:3px;">现实生活作息与个性细节：</label>
                    <textarea id="myOfflinePersonaInput" rows="4" placeholder="例如：21岁大学生，白天上课摸鱼，深夜在寝室录MC，经常喝冰咖啡提神。性格外冷内热..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #dcdcdc;background:#fafafa;font-size:13px;line-height:1.5;box-sizing:border-box;resize:none;outline:none;font-family:inherit;">${escapeHtml(offlinePersona)}</textarea>
                </div>

                <div style="display:flex;justify-content:flex-end;margin-top:8px;">
                    <button type="button" onclick="window.savePlayerOfflineSettings()" style="border:none;background:#07c160;color:#ffffff;padding:6px 16px;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;">
                        💾 保存设定
                    </button>
                </div>
            </div>

            <!-- 🎭 账号切换与马甲管理（移至我的页面） -->
            <div style="margin-top:10px;background:#ffffff;padding:14px 16px;border-top:0.5px solid #e0e0e0;border-bottom:0.5px solid #e0e0e0;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                    <div style="font-size:14px;font-weight:600;color:#181818;">🎭 账号切换与小号管理</div>
                    <button type="button" onclick="window.openCreateAltAccountModalModern()" style="border:none;background:#eef2ff;color:#2563eb;padding:4px 9px;border-radius:4px;font-size:11.5px;font-weight:600;cursor:pointer;">
                        ➕ 注册新小号
                    </button>
                </div>

                <!-- 官方主号卡片 -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9fafb;border-radius:8px;border:0.5px solid #e5e7eb;margin-bottom:6px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <img src="${p.avatar || getRandomAvatar()}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';" />
                        <div>
                            <div style="font-size:13px;font-weight:600;color:#1f2937;">${escapeHtml(p.ytName || '主播大号')} <span style="font-size:10px;background:#d1fae5;color:#065f46;padding:1px 4px;border-radius:3px;">官方主号</span></div>
                            <div style="font-size:11px;color:#6b7280;">地区：${escapeHtml(p.region || '中国')} · 粉丝：${p.followers || 0}</div>
                        </div>
                    </div>
                    <div>
                        ${curAcc.id === 'main' ? '<span style="font-size:11px;color:#059669;font-weight:600;">● 使用中</span>' : `<button type="button" onclick="window.switchToAccount('main')" style="border:none;background:#07c160;color:#fff;padding:4px 9px;border-radius:4px;font-size:11px;cursor:pointer;">使用</button>`}
                    </div>
                </div>

                <!-- 注册的小号列表 -->
                ${altsListHtml}
            </div>
        </div>
        `;
    }

    // 随机更换并持久化当前激活头像
    window.rerollActiveAvatar = function() {
        const curId = window.G.currentAccountId || 'main';
        const newAvatar = getRandomAvatar();
        if (curId === 'main') {
            if (!window.G.player) window.G.player = {};
            window.G.player.avatar = newAvatar;
        } else {
            const alt = (window.G.altAccounts || []).find(a => a.id === curId);
            if (alt) alt.avatar = newAvatar;
        }
        const img = document.getElementById('myWechatAvatar');
        if (img) img.src = newAvatar;
        if (typeof showToast === 'function') showToast('🎲 头像已摇出新形象！', 'success', 1200);
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // 针对指定小号换头像
    window.rerollAltAvatar = function(altId) {
        const alt = (window.G.altAccounts || []).find(a => a.id === altId);
        if (alt) {
            alt.avatar = getRandomAvatar();
            renderChatApp();
            if (typeof showToast === 'function') showToast('🎲 小号头像已更新', 'success', 1000);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        }
    };

    // 切换账号
    window.switchToAccount = function(accId) {
        window.G.currentAccountId = accId;
        if (typeof showToast === 'function') showToast(`🔀 已切换为：${getActiveAccountInfo().name}`, 'info', 1500);
        renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // 删除小号
    window.deleteAltAccountDirect = function(altId) {
        if (!confirm('确定注销这个小号吗？')) return;
        window.G.altAccounts = (window.G.altAccounts || []).filter(a => a.id !== altId);
        if (window.G.currentAccountId === altId) window.G.currentAccountId = 'main';
        renderChatApp();
        if (typeof showToast === 'function') showToast('已删除小号', 'info', 1200);
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // 保存玩家设置
    window.savePlayerOfflineSettings = function() {
        const pInput = document.getElementById('myOfflinePersonaInput');
        const rInput = document.getElementById('myPlayerRegionInput');
        if (!window.G.player) window.G.player = {};
        if (pInput) {
            const val = pInput.value.trim();
            window.G.player.offlinePersona = val;
            window.G.player.persona = val;
        }
        if (rInput) {
            window.G.player.region = rInput.value.trim() || '中国';
        }
        if (typeof showToast === 'function') showToast('✅ 线下人设与地区已更新！', 'success', 1500);
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // 现代化注册小号弹窗（自动随机头像）
    window.openCreateAltAccountModalModern = function() {
        let assignedAvatar = getRandomAvatar();

        openModal(`
            <div class="chat-modern-modal-card" style="font-family:-apple-system,sans-serif;text-align:left;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;border-bottom:1.5px solid #eef2f7;padding-bottom:8px;margin-bottom:10px;">
                    ➕ 注册新小号
                </div>
                <div style="display:flex;align-items:center;gap:10px;background:#f8fafc;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:10px;">
                    <img id="altNewAvatarPreview" src="${assignedAvatar}" style="width:44px;height:44px;border-radius:6px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';" />
                    <div style="flex:1;">
                        <div style="font-size:12px;font-weight:600;color:#334155;">小号头像（图库自动抽选）</div>
                    </div>
                    <button type="button" id="btnRerollAltModalAvatar" style="border:1px solid #cbd5e1;background:#fff;color:#2563eb;padding:4px 8px;border-radius:5px;font-size:11.5px;cursor:pointer;">
                        🎲 换一张
                    </button>
                </div>
                <div class="form-group" style="margin-bottom:8px;">
                    <label style="font-size:12px;color:#475569;font-weight:600;display:block;margin-bottom:3px;">小号昵称 <span style="color:#ef4444;">*</span></label>
                    <input type="text" id="newAltNameInput" placeholder="如：路过的红石学徒" style="width:100%;padding:7px 9px;border-radius:6px;border:1px solid #cbd5e1;font-size:12.5px;box-sizing:border-box;outline:none;">
                </div>
                <div class="form-group" style="margin-bottom:8px;">
                    <label style="font-size:12px;color:#475569;font-weight:600;display:block;margin-bottom:3px;">所在地区</label>
                    <input type="text" id="newAltRegionInput" value="${escapeHtml(window.G.player?.region || '中国')}" style="width:100%;padding:7px 9px;border-radius:6px;border:1px solid #cbd5e1;font-size:12.5px;box-sizing:border-box;outline:none;">
                </div>
                <div class="form-group" style="margin-bottom:12px;">
                    <label style="font-size:12px;color:#475569;font-weight:600;display:block;margin-bottom:3px;">个性签名 / 简介</label>
                    <input type="text" id="newAltBioInput" placeholder="如：热爱MC建筑..." style="width:100%;padding:7px 9px;border-radius:6px;border:1px solid #cbd5e1;font-size:12.5px;box-sizing:border-box;outline:none;">
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #f1f5f9;padding-top:8px;">
                    <button type="button" class="btn-secondary" onclick="closeModal()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmCreateAlt" style="border:none;background:#2563eb;color:#ffffff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">注册并使用</button>
                </div>
            </div>
        `);

        document.getElementById('btnRerollAltModalAvatar').onclick = () => {
            assignedAvatar = getRandomAvatar();
            const prev = document.getElementById('altNewAvatarPreview');
            if (prev) prev.src = assignedAvatar;
        };

        document.getElementById('btnConfirmCreateAlt').onclick = () => {
            const name = document.getElementById('newAltNameInput').value.trim();
            if (!name) {
                if (typeof showToast === 'function') showToast('请填写小号昵称', 'error');
                return;
            }
            if (!window.G.altAccounts) window.G.altAccounts = [];
            const newAlt = {
                id: 'alt_' + Date.now(),
                name,
                avatar: assignedAvatar,
                region: document.getElementById('newAltRegionInput').value.trim() || '中国',
                bio: document.getElementById('newAltBioInput').value.trim() || '私密小号'
            };
            window.G.altAccounts.push(newAlt);
            window.G.currentAccountId = newAlt.id;
            closeModal();
            renderChatApp();
            if (typeof showToast === 'function') showToast(`🎉 小号「${name}」已上线！`, 'success', 2000);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
    };

    // ============================================================
    // 💬 聊天列表构建
    // ============================================================
    function buildChatListHTML() {
        const isDirect = window.G.chatActiveTab !== 'group';
        let itemsHtml = '';

        if (isDirect) {
            const npcList = Object.entries(window.G.npcs || {});
            if (!npcList.length) {
                itemsHtml += `
                <div style="text-align:center;color:#b2b2b2;padding:60px 16px;font-size:13px;line-height:1.8;">
                    <div style="font-size:38px;margin-bottom:8px;opacity:0.65;">💬</div>
                    <b>暂无聊天消息</b><br>
                    点击右上角 <b>+</b> 添加好友开启对话！
                </div>`;
            } else {
                for (const [id, npc] of npcList) {
                    const chatHist = getAccountChatHistory(id);
                    const lastMsg = chatHist.length > 0 ? chatHist[chatHist.length - 1] : null;
                    const purePreview = lastMsg ? (typeof stripThought === 'function' ? stripThought(lastMsg.text || '') : (lastMsg.text || '')) : (npc.memorySummary ? `[记忆: ${(typeof stripThought === 'function' ? stripThought(npc.memorySummary) : npc.memorySummary).slice(0, 15)}...]` : '成为好友，打个招呼吧');
                    const time = lastMsg ? (lastMsg.time || '') : '';
                    const isBlocked = isAccountBlockedByNpc(id);
                    
                    itemsHtml += `
                    <div class="chat-item" data-npc-id="${id}" style="display:flex;align-items:center;padding:12px 14px;background:#ffffff;cursor:pointer;border-bottom:0.5px solid #f0f0f0;user-select:none;-webkit-user-select:none;">
                        <div style="margin-right:12px;flex-shrink:0;">${renderAvatarBadge(npc, 48)}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-weight:500;font-size:15px;color:#181818;">
                                    ${escapeHtml(npc.name)}
                                    <span style="font-size:10.5px;color:#6b7280;margin-left:4px;">📍${escapeHtml(npc.region || '未知')}</span>
                                    ${isBlocked ? '<span style="font-size:10px;color:#fff;background:#fa5151;padding:1px 4px;border-radius:3px;margin-left:4px;">已拒收</span>' : ''}
                                </span>
                                <span style="font-size:11px;color:#b2b2b2;">${time}</span>
                            </div>
                            <div style="font-size:12.5px;color:#888888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px;">${escapeHtml(purePreview.slice(0, 32))}</div>
                        </div>
                    </div>`;
                }
            }
        } else {
            const groupKeys = Object.keys(window.G.groups || {});
            if (!groupKeys.length) {
                itemsHtml += `
                <div style="text-align:center;color:#b2b2b2;padding:60px 16px;font-size:13px;line-height:1.8;">
                    暂无群聊，点击右上角 <b>+</b> 建立主播讨论群！
                </div>`;
            } else {
                for (const [gid, grp] of Object.entries(window.G.groups)) {
                    const msgs = window.G.groupChatHistory[gid] || [];
                    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
                    const purePreview = lastMsg ? `${lastMsg.senderName || '成员'}: ${(typeof stripThought === 'function' ? stripThought(lastMsg.text || '') : (lastMsg.text || ''))}` : (grp.desc || '开启热烈讨论');
                    itemsHtml += `
                    <div class="group-item" data-group-id="${gid}" style="display:flex;align-items:center;padding:12px 14px;background:#ffffff;cursor:pointer;border-bottom:0.5px solid #f0f0f0;user-select:none;-webkit-user-select:none;">
                        <div style="margin-right:12px;flex-shrink:0;">${renderAvatarBadge(grp, 48)}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-weight:500;font-size:15px;color:#181818;">${escapeHtml(grp.name)} <span style="font-size:12px;color:#999;">(${(grp.members || []).length})</span></span>
                                <span style="font-size:11px;color:#b2b2b2;">${lastMsg ? (lastMsg.time || '') : ''}</span>
                            </div>
                            <div style="font-size:12.5px;color:#888888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px;">${escapeHtml(purePreview.slice(0, 32))}</div>
                        </div>
                    </div>`;
                }
            }
        }
        return itemsHtml;
    }

    // ============================================================
    // 🌟 朋友圈（动态流）构建
    // ============================================================
    function buildMomentsHTML() {
        const feedList = window.G.feed || [];
        if (!feedList.length) {
            return `
            <div style="text-align:center;color:#b2b2b2;padding:60px 16px;font-size:13px;line-height:1.8;">
                <div style="font-size:36px;margin-bottom:8px;opacity:0.65;">🍃</div>
                朋友圈静悄悄的<br>
                点击右上角<b>「✨刷新」</b>或<b>「📷」</b>发布属于你的动态吧！
            </div>`;
        }

        let cardsHtml = '';
        feedList.forEach(m => {
            const isSelf = m.isPlayer || (m.author === window.G.player?.ytName);
            const isLiked = !!m.liked;
            const comments = m.comments || [];

            let commentsBox = '';
            if (comments.length > 0) {
                const comLines = comments.map(c => `
                    <div style="font-size:12px;line-height:1.5;margin-bottom:3px;">
                        <span style="color:#576b95;font-weight:600;">${escapeHtml(c.name || '好友')}:</span>
                        <span style="color:#222;">${escapeHtml(c.text)}</span>
                    </div>
                `).join('');
                commentsBox = `<div style="background:#f4f5f7;border-radius:4px;padding:6px 8px;margin-top:6px;">${comLines}</div>`;
            }

            cardsHtml += `
            <div style="display:flex;gap:10px;padding:14px;border-bottom:0.5px solid #f0f0f0;">
                <div style="flex-shrink:0;">${renderAvatarBadge({ isPlayer: isSelf, avatarUrl: m.avatar }, 42)}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:14.5px;font-weight:600;color:#576b95;">${escapeHtml(m.author || '好友')}</div>
                    <div style="font-size:14px;color:#222;margin:5px 0 8px;line-height:1.5;word-break:break-word;">
                        ${escapeHtml(m.body || '').replace(/\n/g, '<br>')}
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:#b2b2b2;">
                        <span>${m.time || '刚刚'}</span>
                        <div style="display:flex;gap:10px;">
                            <button onclick="window.toggleMomentLike(${m.id})" style="border:none;background:none;color:${isLiked ? '#fa5151' : '#576b95'};cursor:pointer;font-size:12px;padding:0;">
                                ${isLiked ? '❤️ 取消' : '🤍 赞'} (${m.likes || 0})
                            </button>
                            <button onclick="window.addMomentComment(${m.id})" style="border:none;background:none;color:#576b95;cursor:pointer;font-size:12px;padding:0;">💬 评论</button>
                            <button onclick="window.triggerAiCommentForMoment(${m.id})" style="border:none;background:none;color:#07c160;cursor:pointer;font-size:12px;padding:0;">🤖 召唤互动</button>
                        </div>
                    </div>
                    ${commentsBox}
                </div>
            </div>`;
        });
        return cardsHtml;
    }

    // ============================================================
    // 💬 私聊窗口（沉浸全屏）
    // ============================================================
    function renderSingleChatWindow(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const npcId = window.G.currentChatNpc;
        const npc = window.G.npcs[npcId];
        if (!npc) { window.closeChat(); return; }

        const isBlocked = isAccountBlockedByNpc(npcId);
        const chatHist = getAccountChatHistory(npcId);

        const sessionKey = getChatStorageKey(npcId);
        const showAll = !!window.G._chatShowFullHistory[sessionKey];
        const FOLD_LIMIT = 15;
        const hasMore = chatHist.length > FOLD_LIMIT && !showAll;
        const displayList = hasMore ? chatHist.slice(chatHist.length - FOLD_LIMIT) : chatHist;
        const isBehindScreenActive = !!window.G._behindScreenActive[npcId];

        let messagesHtml = '';
        if (hasMore) {
            messagesHtml += `
            <div style="text-align:center;margin:4px 0 12px;">
                <button onclick="window.G._chatShowFullHistory['${sessionKey}'] = true; window.renderSingleChatWindow();" style="border:none;background:rgba(0,0,0,0.06);color:#555;padding:4px 12px;border-radius:12px;font-size:11px;cursor:pointer;">
                    📜 查看更早的消息
                </button>
            </div>`;
        }

        for (const msg of displayList) {
            if (msg.from === 'action') {
                messagesHtml += `
                <div style="text-align:center;margin:8px 0;">
                    <span style="display:inline-block;background:rgba(0,0,0,0.05);color:#888;padding:3px 10px;border-radius:4px;font-size:11.5px;max-width:85%;">${escapeHtml(msg.text || '')}</span>
                </div>`;
            } else if (msg.from === 'behind_screen') {
                messagesHtml += `
                <div style="margin:8px 12px;background:rgba(255,255,255,0.85);border-left:3px solid #b8a280;border-radius:4px;padding:8px 10px;font-size:12px;color:#6d5a43;line-height:1.5;">
                    <div style="font-weight:600;font-size:11px;color:#8d6e63;margin-bottom:2px;">👁️ 线下动作感知 (${escapeHtml(npc.name)})</div>
                    <div>${escapeHtml(msg.text || '')}</div>
                </div>`;
            } else {
                const isSelf = msg.from === 'player';
                let bubbleContent = '';

                if (msg.sticker) {
                    bubbleContent = `<div style="padding:0;display:inline-block;"><img src="${msg.sticker.url}" alt="${escapeHtml(msg.sticker.desc)}" style="width:85px;height:85px;border-radius:6px;object-fit:cover;display:block;"></div>`;
                } else {
                    bubbleContent = isSelf ? escapeHtml(msg.text || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(msg.text || '') : escapeHtml(msg.text || ''));
                }

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" data-from="${msg.from}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div onclick="window.openNpcProfileCardModal('${npcId}')" style="margin-right:8px;flex-shrink:0;cursor:pointer;">${renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? (msg.sticker ? 'transparent' : '#95ec69') : (msg.sticker ? 'transparent' : '#ffffff')};color:#111;padding:${msg.sticker ? '0' : '8px 12px'};border-radius:5px;box-shadow:${msg.sticker ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'};font-size:14.5px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;cursor:pointer;">
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
            <div style="padding:0 12px;height:50px;background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                    <button onclick="window.closeChat()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>❮</span> <span>微信</span>
                    </button>
                    <div onclick="window.openNpcProfileCardModal('${npcId}')" style="cursor:pointer;flex:1;min-width:0;margin-left:6px;">
                        <div style="font-weight:600;font-size:15px;color:#181818;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${escapeHtml(npc.name)} <span style="font-size:11px;color:#6b7280;font-weight:normal;">📍${escapeHtml(npc.region || '未知')}</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
                    <button onclick="window.toggleBehindScreen('${npcId}')" style="border:0.5px solid #ccc;background:${isBehindScreenActive ? '#dcdcdc' : '#ffffff'};width:30px;height:30px;border-radius:6px;font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="动作感知">👁️</button>
                    <button onclick="window.triggerAIReplyForSingle('${npcId}')" style="border:none;background:#07c160;color:#fff;width:30px;height:30px;border-radius:6px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;">⚡</button>
                </div>
            </div>

            ${isBlocked ? `
            <div style="background:#fff2f0;color:#fa5151;padding:6px 12px;font-size:11.5px;border-bottom:0.5px solid #ffccc7;flex-shrink:0;">
                <span>⚠️ 消息已被对方拒收</span>
            </div>` : ''}

            <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">打个招呼开启畅聊吧！</div>'}
            </div>

            ${_stickerDrawerOpen ? buildStickerDrawerHTML('single', npcId) : ''}

            <div style="padding:8px 10px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;gap:6px;align-items:center;flex-shrink:0;">
                <button onclick="window.toggleStickerDrawer('single', '${npcId}')" title="表情包" style="border:none;background:none;color:#555;width:30px;height:30px;font-size:19px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">😊</button>
                <textarea id="singleChatInput" rows="1" placeholder="发消息..." style="flex:1;padding:8px 10px;border-radius:5px;border:none;background:#ffffff;font-size:14px;resize:none;outline:none;font-family:inherit;box-shadow:inset 0 0 0 0.5px #dcdcdc;"></textarea>
                <button onclick="window.doSendSingleChat('${npcId}')" style="border:none;background:#07c160;color:#fff;padding:6px 13px;border-radius:4px;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;">发送</button>
            </div>
        </div>
        `;
        container.innerHTML = html;

        const msgArea = document.getElementById('chatMessageArea');
        if (msgArea) setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 50);

        container.querySelectorAll('.chat-bubble.self-bubble[data-msgid]').forEach(b => {
            const mid = b.dataset.msgid;
            if (!mid) return;
            if (typeof bindLongPressEvent === 'function') {
                bindLongPressEvent(b, null, () => { window.showMessageActionSheet(mid, 'single', npcId); });
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
    // 👥 群聊窗口（沉浸全屏）
    // ============================================================
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
                let bubbleContent = '';
                if (msg.sticker) {
                    bubbleContent = `<div style="padding:0;display:inline-block;"><img src="${msg.sticker.url}" alt="${escapeHtml(msg.sticker.desc)}" style="width:85px;height:85px;border-radius:6px;object-fit:cover;display:block;"></div>`;
                } else {
                    bubbleContent = isSelf ? escapeHtml(msg.text || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(msg.text || '') : escapeHtml(msg.text || ''));
                }

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" data-from="${msg.from}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: msg.senderAvatarUrl }, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${!isSelf ? `<div style="font-size:11px;color:#888;margin-bottom:2px;">${escapeHtml(msg.senderName || '成员')}</div>` : ''}
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? (msg.sticker ? 'transparent' : '#95ec69') : (msg.sticker ? 'transparent' : '#ffffff')};color:#111;padding:${msg.sticker ? '0' : '8px 12px'};border-radius:5px;box-shadow:${msg.sticker ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'};font-size:14.5px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;">
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
            <div style="padding:0 12px;height:50px;background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <button onclick="window.closeGroupChat()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>❮</span> <span>微信</span>
                    </button>
                    <div>
                        <div style="font-weight:600;font-size:15px;color:#181818;margin-left:6px;">${escapeHtml(grp.name)} <span style="font-size:12px;color:#888;">(${(grp.members || []).length})</span></div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button onclick="window.openGroupSettingsModal('${gid}')" style="border:0.5px solid #ccc;background:#ffffff;color:#333;padding:3px 8px;border-radius:4px;font-size:11.5px;cursor:pointer;">管理</button>
                    <button onclick="window.triggerGroupAIReply('${gid}')" title="触发接话" style="border:none;background:#07c160;color:#fff;width:30px;height:30px;border-radius:6px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;">⚡</button>
                </div>
            </div>

            <div id="groupMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">群里很安静，来开启话题吧！</div>'}
            </div>

            ${_stickerDrawerOpen ? buildStickerDrawerHTML('group', gid) : ''}

            <div style="padding:8px 10px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;gap:6px;align-items:center;flex-shrink:0;">
                <button onclick="window.toggleStickerDrawer('group', '${gid}')" title="表情包" style="border:none;background:none;color:#555;width:30px;height:30px;font-size:19px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">😊</button>
                <textarea id="groupChatInput" rows="1" placeholder="发消息..." style="flex:1;padding:8px 10px;border-radius:5px;border:none;background:#ffffff;font-size:14px;resize:none;outline:none;font-family:inherit;box-shadow:inset 0 0 0 0.5px #dcdcdc;"></textarea>
                <button onclick="window.doSendGroupChat('${gid}')" style="border:none;background:#07c160;color:#fff;padding:6px 13px;border-radius:4px;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;">发送</button>
            </div>
        </div>
        `;
        container.innerHTML = html;

        const msgArea = document.getElementById('groupMessageArea');
        if (msgArea) setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 50);

        container.querySelectorAll('.chat-bubble.self-bubble[data-msgid]').forEach(b => {
            const mid = b.dataset.msgid;
            if (!mid) return;
            if (typeof bindLongPressEvent === 'function') {
                bindLongPressEvent(b, null, () => { window.showMessageActionSheet(mid, 'group', gid); });
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
    // 🎨 聊天专属弹窗（淡蓝极简风格，带地区设置）
    // ============================================================
    window.openCreateCustomNpcModal = function() {
        let currentAssignedAvatar = getRandomAvatar();

        openModal(`
            <div class="chat-modern-modal-card" style="font-family:-apple-system,sans-serif;text-align:left;">
                <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #eef2f7;padding-bottom:10px;margin-bottom:12px;">
                    <div style="font-size:16px;font-weight:700;color:#1e3a8a;">✨ 添加新好友</div>
                    <span style="font-size:11px;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:10px;">图库自动分配</span>
                </div>

                <div style="display:flex;align-items:center;gap:12px;background:#f8fafc;padding:10px;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:12px;">
                    <img id="custNpcAvatarPreview" src="${currentAssignedAvatar}" style="width:52px;height:52px;border-radius:8px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';" />
                    <div style="flex:1;">
                        <div style="font-size:12.5px;font-weight:600;color:#334155;">已自动分配头像</div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">来自头像库抽选</div>
                    </div>
                    <button type="button" id="btnRerollAvatar" style="border:1px solid #cbd5e1;background:#ffffff;color:#2563eb;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
                        🎲 换一张
                    </button>
                </div>

                <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:12.5px;color:#475569;font-weight:600;display:block;margin-bottom:4px;">好友昵称 <span style="color:#ef4444;">*</span></label>
                    <input type="text" id="custNpcName" placeholder="如：梦境猎手" style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;box-sizing:border-box;outline:none;">
                </div>

                <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:12.5px;color:#475569;font-weight:600;display:block;margin-bottom:4px;">常驻地区（用于异地/生活习惯判定）</label>
                    <input type="text" id="custNpcRegion" value="美国" placeholder="如：美国、英国、中国、日本..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;box-sizing:border-box;outline:none;">
                </div>

                <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:12.5px;color:#475569;font-weight:600;display:block;margin-bottom:4px;">性格口吻与人设 <span style="color:#ef4444;">*</span></label>
                    <textarea id="custNpcPersona" rows="3" placeholder="如：高冷的大神主播，傲娇但很靠谱..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;box-sizing:border-box;outline:none;resize:none;"></textarea>
                </div>

                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12.5px;color:#475569;font-weight:600;display:block;margin-bottom:4px;">初始好感度 (0~100)</label>
                    <input type="number" id="custNpcFavor" value="50" min="0" max="100" style="width:100px;padding:6px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;">
                </div>

                <div style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #f1f5f9;padding-top:10px;">
                    <button type="button" class="btn-secondary" onclick="closeModal()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:6px 14px;border-radius:6px;font-size:12.5px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmCreateNpc" style="border:none;background:#2563eb;color:#ffffff;padding:6px 18px;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;">完成添加</button>
                </div>
            </div>
        `);

        document.getElementById('btnRerollAvatar').onclick = () => {
            currentAssignedAvatar = getRandomAvatar();
            const preview = document.getElementById('custNpcAvatarPreview');
            if (preview) preview.src = currentAssignedAvatar;
        };

        document.getElementById('btnConfirmCreateNpc').onclick = () => {
            const name = document.getElementById('custNpcName').value.trim();
            const persona = document.getElementById('custNpcPersona').value.trim();
            const region = document.getElementById('custNpcRegion').value.trim() || '美国';
            if (!name || !persona) {
                if (typeof showToast === 'function') showToast('⚠️ 昵称和人设为必填项', 'error');
                return;
            }
            const newId = 'custom_' + Date.now();
            ensureNpcIntegrity();
            window.G.npcs[newId] = {
                id: newId,
                name,
                persona,
                region,
                avatarUrl: currentAssignedAvatar,
                favor: parseInt(document.getElementById('custNpcFavor').value) || 50,
                skills: { building: 50, redstone: 50, pvp: 60, survival: 50, hunting: 50 },
                isCustom: true
            };
            if (typeof showToast === 'function') showToast(`🎉 成功添加好友「${name}」！`, 'success', 2000);
            closeModal();
            renderChatApp();
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
    };

    // 表情包抽屉构建
    function buildStickerDrawerHTML(targetType, targetId) {
        ensureStickersLoaded();
        const cats = window.G.stickerCategories || ['猪猪', '默认'];
        const activeCat = window.G.activeStickerCategory || cats[0];
        const stickers = (window.G.stickerLibrary || []).filter(s => s.category === activeCat);

        let tabsHtml = cats.map(c => `
            <button class="stk-tab-btn ${c === activeCat ? 'active' : ''}" onclick="window.switchStickerCategory('${escapeHtml(c)}', '${targetType}')" style="padding:4px 9px;font-size:11px;font-weight:600;border:0.5px solid ${c === activeCat ? '#07c160' : '#ccc'};border-radius:4px;background:${c === activeCat ? '#eaf5ea' : '#fff'};color:${c === activeCat ? '#07c160' : '#555'};cursor:pointer;white-space:nowrap;">
                ${escapeHtml(c)}
            </button>
        `).join('');

        let gridHtml = `
            <div class="stk-item-card" onclick="window.openImportStickersModal('${targetType}', '${targetId}')" style="height:60px;border:1px dashed #bbb;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;background:#f9f9f9;">
                <span style="font-size:18px;color:#888;">➕</span>
                <span style="font-size:9.5px;color:#888;margin-top:2px;">添加</span>
            </div>
        `;

        stickers.forEach(stk => {
            gridHtml += `
            <div class="stk-item-card" onclick="window.sendStickerMessage('${targetType}', '${targetId}', {desc: '${escapeHtml(stk.desc)}', url: '${escapeHtml(stk.url)}'})" style="height:60px;border:0.5px solid #e0e0e0;border-radius:4px;padding:2px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;cursor:pointer;background:#fff;" title="${escapeHtml(stk.desc)}">
                <img src="${stk.url}" style="width:100%;height:100%;object-fit:cover;border-radius:3px;">
            </div>
            `;
        });

        return `
        <div id="stickerDrawerContainer" style="background:#f7f7f7;border-top:0.5px solid #dcdcdc;padding:6px 8px;height:160px;display:flex;flex-direction:column;box-sizing:border-box;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:5px;overflow-x:auto;padding-bottom:5px;border-bottom:0.5px solid #e0e0e0;flex-shrink:0;">
                ${tabsHtml}
                <button onclick="window.openCreateStickerCategoryModal('${targetType}', '${targetId}')" style="border:0.5px solid #bbb;background:#fff;padding:3px 7px;border-radius:4px;font-size:10.5px;cursor:pointer;white-space:nowrap;">✏️ 新分组</button>
            </div>
            <div style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(52px, 1fr));gap:6px;padding-top:6px;">
                ${gridHtml}
            </div>
        </div>
        `;
    }

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
        if (bubbles.length > 0) return bubbles.slice(0, 5);
        const lines = clean.split(/\n+/).map(l => l.trim()).filter(Boolean);
        if (lines.length > 1) return lines.slice(0, 5);
        return [clean];
    }

    function findStickerByKeyword(kw) {
        if (!kw || !window.G.stickerLibrary) return null;
        const cleanKw = kw.trim().toLowerCase();
        return window.G.stickerLibrary.find(s => s.desc.toLowerCase().includes(cleanKw)) || null;
    }

    // ============================================================
    // 🤖 AI 智能回复：动态分析异地与恋人阶段模块
    // ============================================================
    window.triggerAIReplyForSingle = async function(npcId) {
        if (!window.G._behindScreenActive) window.G._behindScreenActive = {};
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        if (isAccountBlockedByNpc(npcId)) {
            if (typeof showToast === 'function') showToast('⚠️ 当前已被对方拒收', 'error', 2500);
            return;
        }

        const history = getAccountChatHistory(npcId);
        const isBehindScreenActive = !!window.G._behindScreenActive[npcId];
        const activeAcc = getActiveAccountInfo();

        let recentContext = history.length > 0 ? history.slice(-10).map(m => {
            if (m._recalled) return `[系统提示: 对方撤回了一条消息]`;
            if (m.from === 'action') return `[旁白: ${m.text}]`;
            if (m.from === 'behind_screen') return `[此前线下动作: ${m.text}]`;
            return `${m.from === 'player' ? activeAcc.name : npc.name}: ${m.sticker ? `[发送了表情: ${m.sticker.desc}]` : ((typeof stripThought === 'function') ? stripThought(m.text || '') : m.text)}`;
        }).join('\n') : '（双方此前没有任何对话）';

        let npcMemoryContext = '';
        if (npc.memorySummary) npcMemoryContext += `【专属互动记忆】：\n${npc.memorySummary}\n`;

        // 🌟 1. 动态地区分析：自动触发异地模块
        const playerRegion = activeAcc.region || window.G.player?.region || '中国';
        const npcRegion = npc.region || '美国';
        const isLongDistance = (playerRegion !== npcRegion);

        let distanceModuleText = '';
        if (isLongDistance) {
            distanceModuleText = `【🌟 动态情境：异地跨国羁绊】
你常驻在「${npcRegion}」，而对方常驻在「${playerRegion}」。你们隔着不同的地域，生活习惯和作息自然存在差异。
请将这种异地距离感自然融入对话中（偶尔打字互道早晚安、吐槽地域时差作息、打趣跨国联机延迟、思念等），切记自然流露，严禁机械报时！`;
        } else {
            distanceModuleText = `【🌟 动态情境：同城/同地域】
你们均生活在「${playerRegion}」，拥有相同的生活步调与日常圈子。`;
        }

        // 🌟 2. 动态关系阶段：自动触发恋人模块
        const curFavor = npc.favor || 0;
        let relationModuleText = '';
        if (curFavor >= 70) {
            relationModuleText = `【💖 动态阶段：恋人/深度心动】
当前你们的好感已达到亲密恋人阶段（${curFavor}/100）。对话中带有深厚的偏爱、占有欲、习惯性依赖、亲昵玩笑与温柔护短。`;
        } else if (curFavor >= 30) {
            relationModuleText = `【🤝 动态阶段：熟络同伴】
当前你们是默契的好朋友（好感：${curFavor}/100）。可以放开互损、聊MC技巧、分享生活趣事。`;
        } else {
            relationModuleText = `【🌱 动态阶段：初识客气】
你们刚刚结识（好感：${curFavor}/100）。言谈客气礼貌，保持基本的社交边界，带着一丝探索对方的好奇。`;
        }

        const behindScreenPrompt = isBehindScreenActive ? `\n【线下动作感知】：\n请在最后输出一个独立块 [BEHIND_SCREEN]...[/BEHIND_SCREEN]，细腻描写你在电脑屏幕那边的真实动作与微表情（30字内）。\n` : '';

        // 玩家线下真实人设
        const playerRealPersona = window.G.player?.offlinePersona || '全职MC创作者';

        const sysPrompt = `你正在扮演真实的 Minecraft 主播/好友「${npc.name}」（性格人设：${npc.persona || '同伴'}）。
正在与你对话的是：${activeAcc.name} ${activeAcc.isAlt ? '（小号身份）' : ''}。
【对方线下真实人设（请自然在对话中呼应，严禁机械念经）】：${playerRealPersona}

${relationModuleText}
${distanceModuleText}
${npcMemoryContext}

【真实微信打字规范】：
1. 像真人用手机微信打字一样，正文中【绝对禁止出现任何括号动作描写】！
2. 语言极简真实，输出 1 到 3 条短气泡，每条用 [MSG]...[/MSG] 包裹：
[MSG]打字内容[/MSG]
${behindScreenPrompt}`;

        try {
            window.G.isGenerating = true;
            if (typeof showLoading === 'function') showLoading();
            const rawReply = await callAI([{ role: 'system', content: sysPrompt }, { role: 'user', content: history.length > 0 ? '请回复。' : '请打招呼。' }], { maxTokens: 400, temperature: 0.9 });
            if (typeof hideLoading === 'function') hideLoading();

            let cleanText = rawReply || '';
            let behindScreenActionText = '';
            const bsMatch = cleanText.match(/\[BEHIND_SCREEN\]([\s\S]*?)\[\/BEHIND_SCREEN\]/i);
            if (bsMatch) {
                behindScreenActionText = (typeof stripThought === 'function') ? stripThought(bsMatch[1].trim()) : bsMatch[1].trim();
                cleanText = cleanText.replace(/\[BEHIND_SCREEN\][\s\S]*?\[\/BEHIND_SCREEN\]/gi, '').trim();
            }

            const bubbles = splitIntoChatBubbles(cleanText);
            const finalBubbles = (bubbles && bubbles.length) ? bubbles : ['在忙吗？'];

            for (let i = 0; i < finalBubbles.length; i++) {
                const bText = finalBubbles[i];
                pushChatMessageSafe(npcId, { from: 'npc', text: bText, time: new Date().toLocaleTimeString().slice(0, 5) });
                if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
                if (i < finalBubbles.length - 1) await new Promise(res => setTimeout(res, 400));
            }

            if (behindScreenActionText && isBehindScreenActive) {
                pushChatMessageSafe(npcId, { from: 'behind_screen', text: behindScreenActionText, time: new Date().toLocaleTimeString().slice(0, 5) });
                if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
            }
            if (typeof checkNpcMemorySummarize === 'function') await checkNpcMemorySummarize(npcId);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        } catch (e) {
            if (typeof hideLoading === 'function') hideLoading();
            console.error('回复失败', e);
            if (typeof showToast === 'function') showToast('❌ 回复失败', 'error');
        } finally {
            window.G.isGenerating = false;
        }
    };

    // ============================================================
    // 🌐 暴露全局接口
    // ============================================================
    window.renderChatApp = renderChatApp;
    window.renderSocialPanel = renderChatApp;
    window.renderSingleChatWindow = renderSingleChatWindow;
    window.renderGroupChatWindow = renderGroupChatWindow;
    window.ensureStickersLoaded = ensureStickersLoaded;
    ensureStickersLoaded();
    window.ensureNpcIntegrity = ensureNpcIntegrity;
    window.getChatStorageKey = getChatStorageKey;
    window.getAccountChatHistory = getAccountChatHistory;
    window.pushChatMessageSafe = pushChatMessageSafe;
    window.isAccountBlockedByNpc = isAccountBlockedByNpc;
    window.renderAvatarBadge = renderAvatarBadge;

    window.switchChatTab = function(tab) {
        window.G.chatActiveTab = tab;
        window.G.currentChatNpc = null;
        window.G.currentChatGroup = null;
        renderChatApp();
    };

    window.openChat = function(npcId) {
        if (!window.G.npcs || !window.G.npcs[npcId]) return;
        window.G.currentChatGroup = null;
        window.G.currentChatNpc = npcId;
        window.G.chatActiveTab = 'direct';
        renderChatApp();
    };

    window.closeChat = function() {
        window.G.currentChatNpc = null;
        renderChatApp();
    };

    window.openGroupChat = function(gid) {
        if (!window.G.groups || !window.G.groups[gid]) return;
        window.G.currentChatNpc = null;
        window.G.currentChatGroup = gid;
        window.G.chatActiveTab = 'group';
        renderChatApp();
    };

    window.closeGroupChat = function() {
        window.G.currentChatGroup = null;
        renderChatApp();
    };

    window.toggleBehindScreen = function(npcId) {
        if (!window.G._behindScreenActive) window.G._behindScreenActive = {};
        window.G._behindScreenActive[npcId] = !window.G._behindScreenActive[npcId];
        if (typeof showToast === 'function') showToast(window.G._behindScreenActive[npcId] ? '👁️ 已开启线下动作感知' : '已关闭线下动作感知', 'info', 1500);
        renderSingleChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.toggleStickerDrawer = function(type, id) {
        _stickerDrawerOpen = !_stickerDrawerOpen;
        if (type === 'single') renderSingleChatWindow();
        else renderGroupChatWindow();
    };

    window.doSendSingleChat = function(npcId) {
        const input = document.getElementById('singleChatInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;

        if (isAccountBlockedByNpc(npcId)) {
            pushChatMessageSafe(npcId, { from: 'player', text, time: new Date().toLocaleTimeString().slice(0, 5) });
            pushChatMessageSafe(npcId, { from: 'action', text: `❌ 消息已被拒收`, time: new Date().toLocaleTimeString().slice(0, 5) });
            input.value = '';
            renderSingleChatWindow();
            if (typeof showToast === 'function') showToast('⚠️ 消息已被对方拒收', 'error', 2500);
            return;
        }
        pushChatMessageSafe(npcId, {
            from: 'player',
            text,
            time: new Date().toLocaleTimeString().slice(0, 5)
        });
        input.value = '';
        renderSingleChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.doSendGroupChat = function(gid) {
        const input = document.getElementById('groupChatInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        if (!window.G.groupChatHistory[gid]) window.G.groupChatHistory[gid] = [];
        window.G.groupChatHistory[gid].push({
            _id: 'gmsg_' + Date.now() + '_' + (Math.floor(Math.random() * 899) + 100),
            from: 'player', senderName: getActiveAccountInfo().name,
            text, time: new Date().toLocaleTimeString().slice(0, 5)
        });
        input.value = '';
        renderGroupChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.switchStickerCategory = function(cat, type) {
        window.G.activeStickerCategory = cat;
        if (type === 'single') renderSingleChatWindow();
        else renderGroupChatWindow();
    };

    window.sendStickerMessage = function(targetType, targetId, stickerObj) {
        const msg = {
            _id: 'cstk_' + Date.now() + '_' + (Math.floor(Math.random() * 899) + 100),
            from: 'player',
            senderName: getActiveAccountInfo().name,
            sticker: stickerObj,
            text: `[表情: ${stickerObj.desc}]`,
            time: new Date().toLocaleTimeString().slice(0, 5)
        };
        if (targetType === 'single') {
            pushChatMessageSafe(targetId, msg);
            renderSingleChatWindow();
        } else {
            if (!window.G.groupChatHistory[targetId]) window.G.groupChatHistory[targetId] = [];
            window.G.groupChatHistory[targetId].push(msg);
            renderGroupChatWindow();
        }
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

})();
