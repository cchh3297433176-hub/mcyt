/**
 * js/apps/chat/chat-app.js
 * 💬 聊天中心独立 App（微信极简风格 + 头像库全自动随机生态）
 * 包含：单人私聊、多人讨论群、猪猪表情包抽屉、好友申请/群邀请中枢、
 *       多马甲小号切换、头像库自动索引与分配、现代清爽淡蓝弹窗。
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
    // 🖼️ 头像库全自动加载与随机分配机制
    // ============================================================
    window._MCYT_AVATARS_POOL = [];

    // 尝试异步读取由打包构建或仓库自动生成的 avatars/list.json
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
        // 优雅默认兜底：若暂未检测到外部 json，预置动态探测池
        if (!window._MCYT_AVATARS_POOL || window._MCYT_AVATARS_POOL.length === 0) {
            window._MCYT_AVATARS_POOL = [
                '1.png', '2.png', '3.png', '4.png', '5.png', '6.png', '7.png', '8.png'
            ];
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

    let _stickerDrawerOpen = false;

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

    function ensureNpcIntegrity() {
        if (!window.G) window.G = {};
        if (!window.G.npcs) window.G.npcs = {};
        if (!window.G.chatHistory) window.G.chatHistory = {};
        if (!window.G.groups) window.G.groups = {};
        if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
        if (!window.G.friendRequests) window.G.friendRequests = [];
        if (!window.G.groupInvites) window.G.groupInvites = [];
        if (!window.G.currentAccountId) window.G.currentAccountId = 'main';
        if (!window.G.altAccounts) window.G.altAccounts = [];
        if (!window.G.blockedRecords) window.G.blockedRecords = [];
        if (!window.G._behindScreenActive) window.G._behindScreenActive = {};
        if (!window.G._chatShowFullHistory) window.G._chatShowFullHistory = {};

        // 遍历所有 NPC：若缺失头像图片，自动从头像库分配一张
        for (const [id, npc] of Object.entries(window.G.npcs)) {
            if (!npc.id) npc.id = id;
            if (!npc.name) npc.name = id;
            if (npc.favor === undefined) npc.favor = 50;
            if (!npc.summaryThreshold) npc.summaryThreshold = 10;
            if (!npc.keepRecent) npc.keepRecent = 5;
            if (!npc.avatarUrl) {
                npc.avatarUrl = getRandomAvatar();
            }
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
        if (!window.G.currentAccountId || window.G.currentAccountId === 'main') {
            return { id: 'main', isAlt: false, name: (window.G.player && window.G.player.ytName) || '主播大号', avatar: (window.G.player && window.G.player.avatar) || getRandomAvatar(), bio: 'YouTube 官方大号' };
        }
        const found = (window.G.altAccounts || []).find(a => a.id === window.G.currentAccountId);
        if (found) return { id: found.id, isAlt: true, name: found.name, avatar: found.avatar || getRandomAvatar(), bio: found.bio || '私密小号' };
        return { id: 'main', isAlt: false, name: (window.G.player && window.G.player.ytName) || '主播大号', avatar: (window.G.player && window.G.player.avatar) || getRandomAvatar(), bio: '' };
    }

    // 微信风平滑圆角正方形头像组件
    function renderAvatarBadge(obj, size = 46) {
        const url = (obj && obj.isPlayer) ? ((window.G.player && window.G.player.avatar) || getRandomAvatar()) : ((obj && obj.avatarUrl) || getRandomAvatar());
        return `<div style="width:${size}px;height:${size}px;border-radius:6px;overflow:hidden;background:#e9e9e9;flex-shrink:0;box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.06);">
            <img src="${url}" draggable="false" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.onerror=null;this.src='assets/icons/chat.png';" />
        </div>`;
    }

    // ============================================================
    // 💬 微信极简风聊天主界面渲染
    // ============================================================
    function renderChatApp(container) {
        if (!container) {
            container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        }
        if (!container) return;

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

        const isDirect = window.G.chatActiveTab !== 'group';
        const pendingCount = (window.G.friendRequests || []).length + (window.G.groupInvites || []).length;
        const activeAcc = getActiveAccountInfo();

        const contentHtml = buildChatListHTML();

        container.innerHTML = `
        <div class="wechat-app-viewport" id="chatAppContainer" style="background:#ededed;height:100%;min-height:480px;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,sans-serif;box-sizing:border-box;">
            
            <!-- 微信风极简顶栏 -->
            <div style="height:48px;background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;padding:0 14px;flex-shrink:0;">
                <div style="display:flex;gap:4px;background:#e2e2e2;padding:2px;border-radius:6px;">
                    <button type="button" onclick="window.switchChatTab('direct')" style="border:none;padding:4px 12px;border-radius:4px;font-size:12.5px;font-weight:600;cursor:pointer;background:${isDirect ? '#ffffff' : 'transparent'};color:${isDirect ? '#07c160' : '#666'};transition:all 0.15s;">私聊</button>
                    <button type="button" onclick="window.switchChatTab('group')" style="border:none;padding:4px 12px;border-radius:4px;font-size:12.5px;font-weight:600;cursor:pointer;background:${!isDirect ? '#ffffff' : 'transparent'};color:${!isDirect ? '#07c160' : '#666'};transition:all 0.15s;">群聊</button>
                </div>

                <div style="font-size:15px;font-weight:600;color:#181818;letter-spacing:0.5px;">聊天</div>

                <!-- 微信经典极简深黑线条加号 -->
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

            <!-- 轻量身份与切换小条 -->
            <div style="background:#f7f7f7;padding:5px 14px;border-bottom:0.5px solid #e5e5e5;display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:#7f7f7f;flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:5px;">
                    <span>当前身份：<b style="color:#222;">${escapeHtml(activeAcc.name)}</b></span>
                    ${activeAcc.isAlt ? '<span style="font-size:9.5px;background:#ededed;color:#555;padding:1px 4px;border-radius:3px;">小号</span>' : ''}
                </div>
                <button onclick="window.openAccountManagerModal()" style="border:none;background:none;color:#576b95;font-size:11.5px;cursor:pointer;padding:0;font-weight:500;">切换账号 ❯</button>
            </div>

            <!-- 消息列表主体（白底优雅分割线） -->
            <div class="wechat-chat-list" style="flex:1;overflow-y:auto;background:#ffffff;">
                ${contentHtml}
            </div>
        </div>
        `;

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

    function buildChatListHTML() {
        const isDirect = window.G.chatActiveTab !== 'group';
        let itemsHtml = '';
        const currentAcc = getActiveAccountInfo();

        if (isDirect) {
            const npcList = Object.entries(window.G.npcs || {});
            if (!npcList.length) {
                itemsHtml += `
                <div style="text-align:center;color:#b2b2b2;padding:60px 16px;font-size:13px;line-height:1.8;">
                    <div style="font-size:38px;margin-bottom:8px;opacity:0.65;">💬</div>
                    <b>暂无聊天消息</b><br>
                    点击右上角 <b>+</b> 开启属于你的交流吧！
                </div>`;
            } else {
                for (const [id, npc] of npcList) {
                    const chatHist = getAccountChatHistory(id);
                    const lastMsg = chatHist.length > 0 ? chatHist[chatHist.length - 1] : null;
                    const purePreview = lastMsg ? (typeof stripThought === 'function' ? stripThought(lastMsg.text || '') : (lastMsg.text || '')) : (npc.memorySummary ? `[记忆: ${(typeof stripThought === 'function' ? stripThought(npc.memorySummary) : npc.memorySummary).slice(0, 15)}...]` : '成为好友，打个招呼吧');
                    const time = lastMsg ? (lastMsg.time || '') : '';
                    const isBlocked = isAccountBlockedByNpc(id, currentAcc.id);
                    
                    itemsHtml += `
                    <div class="chat-item" data-npc-id="${id}" style="display:flex;align-items:center;padding:12px 14px;background:#ffffff;cursor:pointer;border-bottom:0.5px solid #f0f0f0;user-select:none;-webkit-user-select:none;transition:background 0.1s;">
                        <div style="margin-right:12px;flex-shrink:0;">${renderAvatarBadge(npc, 48)}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-weight:500;font-size:15px;color:#181818;">${escapeHtml(npc.name)} ${isBlocked ? '<span style="font-size:10px;color:#fff;background:#fa5151;padding:1px 4px;border-radius:3px;margin-left:4px;">已拉黑</span>' : ''}</span>
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
                    <div class="group-item" data-group-id="${gid}" style="display:flex;align-items:center;padding:12px 14px;background:#ffffff;cursor:pointer;border-bottom:0.5px solid #f0f0f0;user-select:none;-webkit-user-select:none;transition:background 0.1s;">
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
    // 💬 私聊窗口渲染
    // ============================================================
    function renderSingleChatWindow(container) {
        if (!container) container = document.getElementById('chatAppContainer') || document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const npcId = window.G.currentChatNpc;
        const npc = window.G.npcs[npcId];
        if (!npc) { window.closeChat(); return; }

        const activeAcc = getActiveAccountInfo();
        const isBlocked = isAccountBlockedByNpc(npcId, activeAcc.id);
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
                <div style="margin:8px 12px;background:rgba(255,255,255,0.85);border-left:3px solid #b8a280;border-radius:4px;padding:8px 10px;font-size:12px;color:#6d5a43;line-height:1.5;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
                    <div style="font-weight:600;font-size:11px;color:#8d6e63;margin-bottom:2px;">👁️ 屏幕那边的动作感知 (${escapeHtml(npc.name)})</div>
                    <div>${escapeHtml(msg.text || '')}</div>
                </div>`;
            } else {
                const isSelf = msg.from === 'player';
                let bubbleContent = '';

                if (msg.sticker) {
                    bubbleContent = `<div style="padding:0;display:inline-block;"><img src="${msg.sticker.url}" alt="${escapeHtml(msg.sticker.desc)}" style="width:85px;height:85px;border-radius:6px;object-fit:cover;display:block;"></div>`;
                } else if (msg.sharedMoment) {
                    const sm = msg.sharedMoment;
                    bubbleContent = `
                    <div onclick="window.jumpToMomentCard(${sm.id})" style="cursor:pointer;background:#fff;border-radius:6px;padding:8px;border:0.5px solid #d9d9d9;max-width:210px;">
                        <div style="font-weight:600;font-size:11px;color:#576b95;margin-bottom:2px;">🌟 朋友圈动态 · ${escapeHtml(sm.author)}</div>
                        <div style="font-size:12px;color:#333;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escapeHtml(sm.body || '')}</div>
                        ${sm.image ? `<img src="${sm.image}" style="width:100%;height:65px;object-fit:cover;border-radius:4px;margin-top:4px;">` : ''}
                        <div style="font-size:10px;color:#999;text-align:right;margin-top:4px;">查看动态 ❯</div>
                    </div>`;
                } else {
                    bubbleContent = isSelf ? escapeHtml(msg.text || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(msg.text || '') : escapeHtml(msg.text || ''));
                }

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" data-from="${msg.from}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div onclick="window.openNpcProfileCardModal('${npcId}')" style="margin-right:8px;flex-shrink:0;cursor:pointer;">${renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${isSelf && msg.senderAccount ? `<div style="font-size:10px;color:#999;margin-bottom:2px;">${escapeHtml(msg.senderAccount)}</div>` : ''}
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? ((msg.sticker || msg.sharedMoment) ? 'transparent' : '#95ec69') : ((msg.sticker || msg.sharedMoment) ? 'transparent' : '#ffffff')};color:#111;padding:${(msg.sticker || msg.sharedMoment) ? '0' : '8px 12px'};border-radius:5px;box-shadow:${(msg.sticker || msg.sharedMoment) ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'};font-size:14.5px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;cursor:pointer;">
                            ${bubbleContent}
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: activeAcc.avatar }, 38)}</div>` : ''}
                </div>`;
            }
        }

        const html = `
        <div style="background:#ededed;display:flex;flex-direction:column;height:100%;min-height:480px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,sans-serif;">
            <div style="padding:0 12px;height:48px;background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                    <button onclick="window.closeChat()" style="border:none;background:none;font-size:19px;color:#181818;cursor:pointer;padding:0 4px;">❮</button>
                    <div onclick="window.openNpcProfileCardModal('${npcId}')" style="cursor:pointer;flex:1;min-width:0;">
                        <div style="font-weight:600;font-size:15px;color:#181818;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${escapeHtml(npc.name)}
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
                <span>⚠️ 你的当前账号已被对方拒收</span>
            </div>` : ''}

            <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">尚无对话，发句消息打个招呼吧！</div>'}
            </div>

            ${_stickerDrawerOpen ? buildStickerDrawerHTML('single', npcId) : ''}

            <div style="padding:8px 10px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;gap:6px;align-items:center;flex-shrink:0;">
                <button onclick="window.openChatActionMenuModal('single', '${npcId}')" title="合作拍视频" style="border:none;background:none;color:#555;width:30px;height:30px;font-size:19px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">➕</button>
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
    // 👥 群聊窗口渲染
    // ============================================================
    function renderGroupChatWindow(container) {
        if (!container) container = document.getElementById('chatAppContainer') || document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const gid = window.G.currentChatGroup;
        const grp = window.G.groups[gid];
        if (!grp) { window.closeGroupChat(); return; }
        const msgs = window.G.groupChatHistory[gid] || [];
        const activeAcc = getActiveAccountInfo();

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
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: activeAcc.avatar }, 38)}</div>` : ''}
                </div>`;
            }
        }

        const html = `
        <div style="background:#ededed;display:flex;flex-direction:column;height:100%;min-height:480px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,sans-serif;">
            <div style="padding:0 12px;height:48px;background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <button onclick="window.closeGroupChat()" style="border:none;background:none;font-size:19px;color:#181818;cursor:pointer;padding:0 4px;">❮</button>
                    <div>
                        <div style="font-weight:600;font-size:15px;color:#181818;">${escapeHtml(grp.name)} <span style="font-size:12px;color:#888;">(${(grp.members || []).length})</span></div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button onclick="window.openGroupSettingsModal('${gid}')" style="border:0.5px solid #ccc;background:#ffffff;color:#333;padding:3px 8px;border-radius:4px;font-size:11.5px;cursor:pointer;">管理</button>
                    <button onclick="window.triggerGroupAIReply('${gid}')" title="触发接话" style="border:none;background:#07c160;color:#fff;width:30px;height:30px;border-radius:6px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;">⚡</button>
                </div>
            </div>

            <div id="groupMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">群里静悄悄的，开启热烈讨论吧！</div>'}
            </div>

            ${_stickerDrawerOpen ? buildStickerDrawerHTML('group', gid) : ''}

            <div style="padding:8px 10px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;gap:6px;align-items:center;flex-shrink:0;">
                <button onclick="window.openChatActionMenuModal('group', '${gid}')" title="群合作" style="border:none;background:none;color:#555;width:30px;height:30px;font-size:19px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">➕</button>
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
    // 🎨 聊天专属：简约淡蓝现代弹窗（只改聊天内部，不影响其他系统）
    // ============================================================
    window.openCreateCustomNpcModal = function() {
        let currentAssignedAvatar = getRandomAvatar();

        openModal(`
            <div class="chat-modern-modal-card" style="font-family:-apple-system,sans-serif;text-align:left;">
                <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid #eef2f7;padding-bottom:10px;margin-bottom:12px;">
                    <div style="font-size:16px;font-weight:700;color:#1e3a8a;">✨ 添加自定义好友</div>
                    <span style="font-size:11px;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:10px;">图库自动分配</span>
                </div>

                <!-- 自动随机头像预览 + 换一张 -->
                <div style="display:flex;align-items:center;gap:12px;background:#f8fafc;padding:10px;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:12px;">
                    <img id="custNpcAvatarPreview" src="${currentAssignedAvatar}" style="width:52px;height:52px;border-radius:8px;object-fit:cover;box-shadow:0 2px 6px rgba(0,0,0,0.08);" onerror="this.src='assets/icons/chat.png';" />
                    <div style="flex:1;">
                        <div style="font-size:12.5px;font-weight:600;color:#334155;">已分配专属头像</div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">从头像库随机抽选</div>
                    </div>
                    <button type="button" id="btnRerollAvatar" style="border:1px solid #cbd5e1;background:#ffffff;color:#2563eb;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
                        🎲 换一张
                    </button>
                </div>

                <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:12.5px;color:#475569;font-weight:600;display:block;margin-bottom:4px;">好友昵称 <span style="color:#ef4444;">*</span></label>
                    <input type="text" id="custNpcName" placeholder="如：梦境猎手" style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;box-sizing:border-box;outline:none;">
                </div>

                <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:12.5px;color:#475569;font-weight:600;display:block;margin-bottom:4px;">人设与性格口吻 <span style="color:#ef4444;">*</span></label>
                    <textarea id="custNpcPersona" rows="3" placeholder="如：高冷的大神主播，傲娇但关键时刻靠谱..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;box-sizing:border-box;outline:none;resize:none;"></textarea>
                </div>

                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:12.5px;color:#475569;font-weight:600;display:block;margin-bottom:4px;">初始好感度 (0~100)</label>
                    <input type="number" id="custNpcFavor" value="50" min="0" max="100" style="width:100px;padding:6px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;">
                </div>

                <div style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #f1f5f9;padding-top:10px;">
                    <button type="button" class="btn-secondary" onclick="closeModal()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:6px 14px;border-radius:6px;font-size:12.5px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmCreateNpc" style="border:none;background:#2563eb;color:#ffffff;padding:6px 18px;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(37,99,235,0.25);">完成添加</button>
                </div>
            </div>
        `);

        // 🎲 换一张按钮点击交互
        document.getElementById('btnRerollAvatar').onclick = () => {
            currentAssignedAvatar = getRandomAvatar();
            const preview = document.getElementById('custNpcAvatarPreview');
            if (preview) preview.src = currentAssignedAvatar;
        };

        document.getElementById('btnConfirmCreateNpc').onclick = () => {
            const name = document.getElementById('custNpcName').value.trim();
            const persona = document.getElementById('custNpcPersona').value.trim();
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
                avatarUrl: currentAssignedAvatar,
                favor: parseInt(document.getElementById('custNpcFavor').value) || 50,
                skills: { building: 50, redstone: 50, pvp: 60, survival: 50, hunting: 50 },
                isCustom: true
            };
            if (typeof showToast === 'function') showToast(`🎉 成功结识「${name}」！`, 'success', 2000);
            closeModal();
            renderChatApp();
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
    };

    // 好友申请处理：自动从头像库分配
    window.handleFriendRequestAction = function(reqId, action) {
        if (!window.G.friendRequests) return;
        const reqIdx = window.G.friendRequests.findIndex(r => r._id === reqId);
        if (reqIdx === -1) return;
        const req = window.G.friendRequests[reqIdx];
        const pName = (window.G.player && window.G.player.ytName) || '主播';

        if (action === 'accept') {
            ensureNpcIntegrity();
            let finalNpc = null;
            if (req.npcOfficialId && typeof OFFICIAL_NPCS !== 'undefined' && OFFICIAL_NPCS[req.npcOfficialId]) {
                const def = OFFICIAL_NPCS[req.npcOfficialId];
                finalNpc = { ...def, id: req.npcOfficialId, favor: 50, avatarUrl: def.avatarUrl || getRandomAvatar() };
                window.G.npcs[req.npcOfficialId] = finalNpc;
            } else {
                const newId = 'npc_' + Date.now();
                finalNpc = {
                    id: newId,
                    name: req.name || '好友',
                    persona: req.persona || '热情的同伴',
                    avatarUrl: req.avatarUrl || getRandomAvatar(),
                    favor: 50,
                    skills: { building: 50, redstone: 50, pvp: 50, survival: 50, hunting: 50 },
                    isCustom: true
                };
                window.G.npcs[newId] = finalNpc;
            }

            pushChatMessageSafe(finalNpc.id, {
                from: 'npc',
                text: `你好！我通过了你的好友验证，以后可以一起录视频玩MC啦！`,
                time: new Date().toLocaleTimeString().slice(0, 5)
            });

            window.G.friendRequests.splice(reqIdx, 1);
            if (typeof showToast === 'function') showToast(`🎉 成功添加 ${finalNpc.name} 为好友！`, 'success', 2500);
            if (typeof addGlobalMemoryRecord === 'function') addGlobalMemoryRecord(`【结识好友】：${pName} 与主播「${finalNpc.name}」正式互加好友。`);
        } else {
            window.G.friendRequests.splice(reqIdx, 1);
            if (typeof showToast === 'function') showToast('已忽略该申请', 'info', 1200);
        }
        closeModal();
        renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // 表情包与其它辅助
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

        stickers.forEach((stk) => {
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

    // ================= 暴露全局接口 =================
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
    window.getActiveAccountInfo = getActiveAccountInfo;
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
        const activeAcc = getActiveAccountInfo();

        if (isAccountBlockedByNpc(npcId, activeAcc.id)) {
            pushChatMessageSafe(npcId, { from: 'player', text, senderAccount: activeAcc.name, time: new Date().toLocaleTimeString().slice(0, 5) });
            pushChatMessageSafe(npcId, { from: 'action', text: `❌ 消息已拒收（已被对方拉黑）`, time: new Date().toLocaleTimeString().slice(0, 5) });
            input.value = '';
            renderSingleChatWindow();
            if (typeof showToast === 'function') showToast('⚠️ 消息已被拒收', 'error', 2500);
            return;
        }
        pushChatMessageSafe(npcId, {
            from: 'player',
            text,
            senderAccount: activeAcc.isAlt ? `${activeAcc.name} (小号)` : activeAcc.name,
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
        const activeAcc = getActiveAccountInfo();
        if (!window.G.groupChatHistory[gid]) window.G.groupChatHistory[gid] = [];
        window.G.groupChatHistory[gid].push({
            _id: 'gmsg_' + Date.now() + '_' + (Math.floor(Math.random() * 899) + 100),
            from: 'player', senderName: activeAcc.name,
            text, time: new Date().toLocaleTimeString().slice(0, 5)
        });
        input.value = '';
        renderGroupChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.triggerAIReplyForSingle = async function(npcId) {
        if (!window.G._behindScreenActive) window.G._behindScreenActive = {};
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        const activeAcc = getActiveAccountInfo();
        const isCurrentlyBlocked = isAccountBlockedByNpc(npcId, activeAcc.id);
        const isBehindScreenActive = !!window.G._behindScreenActive[npcId];

        if (isCurrentlyBlocked) {
            if (typeof showToast === 'function') showToast('⚠️ 当前已被对方拉黑', 'error', 2500);
            return;
        }

        const history = getAccountChatHistory(npcId);

        let recentContext = history.length > 0 ? history.slice(-10).map(m => {
            if (m._recalled) return m._seenByNpc ? `[系统提示: 对方发了"${m._originalText}"，随后撤回，被你看到了]` : `[系统提示: 对方撤回了一条消息]`;
            if (m.from === 'action') return `[旁白: ${m.text}]`;
            if (m.from === 'behind_screen') return `[此前线下动作: ${m.text}]`;
            if (m.sharedMoment) return `[对方分享了动态: "${m.sharedMoment.body}"]`;
            return `${m.from === 'player' ? (m.senderAccount || (window.G.player && window.G.player.ytName)) : npc.name}: ${m.sticker ? `[发送了表情: ${m.sticker.desc}]` : ((typeof stripThought === 'function') ? stripThought(m.text || '') : m.text)}`;
        }).join('\n') : '（双方此前没有任何对话）';

        let npcMemoryContext = '';
        if (npc.memorySummary) npcMemoryContext += `【历史专属记忆】：\n${npc.memorySummary}\n`;
        if (npc.knownGroupEvents) npcMemoryContext += `【群聊获悉事件】：\n${npc.knownGroupEvents}\n`;

        const availableStickers = (window.G.stickerLibrary || []).slice(0, 20).map(s => s.desc).join('、');
        const curFavor = npc.favor || 0;

        let favorStageRule = '';
        if (curFavor < 20) favorStageRule = `【生疏防备阶段】：双方不熟，态度略带防备和距离感，严禁自来熟。`;
        else if (curFavor < 50) favorStageRule = `【熟络同伴】：日常朋友，可自然吐槽开玩笑。`;
        else favorStageRule = `【亲密挚友】：默契深厚，偏爱与偏袒。`;

        const behindScreenPrompt = isBehindScreenActive ? `\n【线下动作感知】：\n请在最后输出一个独立块 [BEHIND_SCREEN]...[/BEHIND_SCREEN]，细腻描摹你在屏幕那边的真实动作与微表情（30字内）。\n` : '';

        const sysPrompt = `你正在扮演 Minecraft 主播/好友「${npc.name}」（人设：${npc.persona || '游戏伙伴'}）。
玩家主播名字是「${(window.G.player && window.G.player.ytName) || '主播'}」。
${favorStageRule}
${npcMemoryContext}
【打字真实性原则】：
1. 像微信聊天一样纯文本打字，严禁出现任何动作括号描述（如"*笑*"、"（思考）"）！
2. 允许表情包斗图：语境契合时可写 [STICKER:表情关键词]（如：${availableStickers}）。
3. 输出 1 到 3 条短消息，用 [MSG]...[/MSG] 包裹：
[MSG]消息一[/MSG]
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
            const finalBubbles = (bubbles && bubbles.length) ? bubbles : ['你好。'];

            for (let i = 0; i < finalBubbles.length; i++) {
                const bText = finalBubbles[i];
                const stkMatch = bText.match(/\[STICKER:([^\]]+)\]/i);
                if (stkMatch) {
                    const stkObj = findStickerByKeyword(stkMatch[1]);
                    if (stkObj) pushChatMessageSafe(npcId, { from: 'npc', text: `[表情: ${stkObj.desc}]`, sticker: stkObj, time: new Date().toLocaleTimeString().slice(0, 5) });
                    else pushChatMessageSafe(npcId, { from: 'npc', text: bText.replace(/\[STICKER:[^\]]+\]/gi, '😏'), time: new Date().toLocaleTimeString().slice(0, 5) });
                } else {
                    pushChatMessageSafe(npcId, { from: 'npc', text: bText, time: new Date().toLocaleTimeString().slice(0, 5) });
                }
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
            console.error('私聊 AI 回复失败', e);
            if (typeof showToast === 'function') showToast('❌ 回复失败', 'error');
        } finally {
            window.G.isGenerating = false;
        }
    };

    window.switchStickerCategory = function(cat, type) {
        window.G.activeStickerCategory = cat;
        if (type === 'single') renderSingleChatWindow();
        else renderGroupChatWindow();
    };

    window.sendStickerMessage = function(targetType, targetId, stickerObj) {
        const curAcc = getActiveAccountInfo();
        const msg = {
            _id: 'cstk_' + Date.now() + '_' + (Math.floor(Math.random() * 899) + 100),
            from: 'player',
            senderName: curAcc.name, 
            senderAccount: curAcc.name,
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

    window.switchAccount = function(accId) {
        window.G.currentAccountId = accId;
        if (typeof showToast === 'function') showToast(`已切换身份为：${getActiveAccountInfo().name}`, 'info', 1800);
        renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

})();
