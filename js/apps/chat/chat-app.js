/**
 * js/apps/chat/chat-app.js
 * 💬 聊天中心独立 App
 * 包含：单人私聊、多人讨论群、猪猪表情包抽屉、好友申请/群邀请中枢、
 *       多马甲小号切换、时区感知、动作感知与长时记忆提炼。
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

        for (const [id, npc] of Object.entries(window.G.npcs)) {
            if (!npc.id) npc.id = id;
            if (!npc.name) npc.name = id;
            if (npc.favor === undefined) npc.favor = 50;
            if (!npc.summaryThreshold) npc.summaryThreshold = 10;
            if (!npc.keepRecent) npc.keepRecent = 5;
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
            return { id: 'main', isAlt: false, name: (window.G.player && window.G.player.ytName) || '主播大号', avatar: (window.G.player && window.G.player.avatar) || null, bio: 'YouTube 频道官方号' };
        }
        const found = (window.G.altAccounts || []).find(a => a.id === window.G.currentAccountId);
        if (found) return { id: found.id, isAlt: true, name: found.name, avatar: found.avatar || null, bio: found.bio || '私密小号' };
        return { id: 'main', isAlt: false, name: (window.G.player && window.G.player.ytName) || '主播大号', avatar: (window.G.player && window.G.player.avatar) || null, bio: '' };
    }

    function detectPlayerTimezoneInfo() {
        const cfg = window.G.clockConfig || {};
        const mode = cfg.mode || 'game';
        let country = cfg.customCountry || '中国 (东八区 UTC+8)';
        let timeSlotDesc = (typeof getTimeSlotName === 'function') ? getTimeSlotName(window.G.timeSlot) : '白天';
        let timeStr = '';

        if (mode === 'real') {
            const now = new Date();
            const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            timeStr = `现实时间 ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')} · ${days[now.getDay()]}`;
        } else if (mode === 'custom') {
            timeStr = cfg.customTimeStr || `第 ${window.G.day || 1} 天 · 自定义时间`;
        } else {
            timeStr = `游戏第 ${window.G.day || 1} 天 · ${timeSlotDesc}`;
        }

        return { mode, country, timeStr, slotName: timeSlotDesc, day: window.G.day || 1 };
    }

    function formatNpcTimezoneContext() {
        const pTz = detectPlayerTimezoneInfo();
        return `\n【时区与时间上下文】：玩家当前所在地/时区：${pTz.country}，当前时间状态：${pTz.timeStr}。请自然体现真实时差、作息与生活互动反应。\n`;
    }

    function renderAvatarBadge(obj, size = 44) {
        const url = (obj && obj.isPlayer) ? (window.G.player && window.G.player.avatar) : (obj && obj.avatarUrl);
        const emoji = (obj && obj.isPlayer) ? '🧑' : ((obj && obj.avatarEmoji) || '👤');
        if (url) return `<img src="${url}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block;">`;
        return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#eaf2ea;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(size*0.45)}px;flex-shrink:0;">${emoji}</div>`;
    }

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
        const tz = detectPlayerTimezoneInfo();

        const contentHtml = buildChatListHTML();

        container.innerHTML = `
        <div class="chat-app-viewport" id="chatAppContainer" style="background:#fff;height:100%;min-height:480px;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">
            <div style="background:#f1f7f1;padding:6px 12px;border-bottom:1px solid #e0ebe0;display:flex;justify-content:space-between;align-items:center;font-size:12px;flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <span>${activeAcc.isAlt ? '🎭' : '👑'} 账号：<b>${escapeHtml(activeAcc.name)}</b></span>
                    ${activeAcc.isAlt ? '<span style="font-size:10px;background:#ffe082;color:#795548;padding:1px 4px;border-radius:4px;font-weight:700;">小号</span>' : ''}
                </div>
                <div style="display:flex;gap:5px;">
                    <button onclick="window.openClockSettingsModal()" style="border:1px solid #b8dbb8;background:#fff;padding:2px 7px;border-radius:12px;font-size:11px;cursor:pointer;color:#2e7d32;font-weight:700;">🕒 ${escapeHtml(tz.timeStr.slice(0, 10))}</button>
                    <button onclick="window.openAccountManagerModal()" style="border:1px solid #b8dbb8;background:#fff;padding:2px 8px;border-radius:12px;font-size:11px;cursor:pointer;color:#2e7d32;font-weight:700;">🔀 切换</button>
                </div>
            </div>

            <div class="chat-header" style="padding:10px 14px;background:#f8fbf8;border-bottom:1px solid #eef3ee;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                <div style="display:flex;gap:6px;background:#e9f2e9;padding:3px;border-radius:8px;">
                    <button type="button" onclick="window.switchChatTab('direct')" style="border:none;padding:5px 14px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;background:${isDirect ? '#fff' : 'transparent'};color:${isDirect ? 'var(--primary)' : '#666'};">👤 私聊</button>
                    <button type="button" onclick="window.switchChatTab('group')" style="border:none;padding:5px 14px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;background:${!isDirect ? '#fff' : 'transparent'};color:${!isDirect ? 'var(--primary)' : '#666'};">👥 群聊</button>
                </div>
                <div style="position:relative;">
                    <button onclick="window.openAddChatTargetModal()" title="新建与好友/群邀请" style="border:none;background:var(--primary);color:#fff;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
                    ${pendingCount > 0 ? `<span style="position:absolute;top:-3px;right:-3px;width:11px;height:11px;background:#ff4757;border:2px solid #fff;border-radius:50%;display:block;"></span>` : ''}
                </div>
            </div>
            
            <div style="font-size:11px;color:#888;padding:5px 14px;background:#fcfdfc;border-bottom:1px dashed #eee;flex-shrink:0;">
                💡 轻点进入聊天，长按卡片可编辑人设与专属配置
            </div>

            <div class="chat-list-container" style="flex:1;overflow-y:auto;padding:8px;">
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
                <div style="text-align:center;color:#888;padding:45px 16px;font-size:13px;line-height:1.7;">
                    <div style="font-size:36px;margin-bottom:8px;">📬</div>
                    <b>通讯录空空如也</b><br>
                    可以通过<b>发布视频</b>积累热度，或者点击右上角 ➕ 手动添加联系人！
                </div>`;
            } else {
                for (const [id, npc] of npcList) {
                    const chatHist = getAccountChatHistory(id);
                    const lastMsg = chatHist.length > 0 ? chatHist[chatHist.length - 1] : null;
                    const purePreview = lastMsg ? (typeof stripThought === 'function' ? stripThought(lastMsg.text || '') : (lastMsg.text || '')) : (npc.memorySummary ? `[记忆: ${(typeof stripThought === 'function' ? stripThought(npc.memorySummary) : npc.memorySummary).slice(0, 15)}...]` : '新添加好友，快来打个招呼吧');
                    const time = lastMsg ? (lastMsg.time || '') : '';
                    const isBlocked = isAccountBlockedByNpc(id, currentAcc.id);
                    
                    itemsHtml += `
                    <div class="chat-item" data-npc-id="${id}" style="display:flex;align-items:center;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:#fff;border:1px solid #f0f4f0;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;">
                        <div style="margin-right:12px;flex-shrink:0;">${renderAvatarBadge(npc, 44)}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-weight:700;font-size:14px;color:var(--text);">${escapeHtml(npc.name)} ${isBlocked ? '<span style="font-size:10px;color:#fff;background:#e53935;padding:1px 5px;border-radius:4px;">已拉黑</span>' : ''}</span>
                                <span style="font-size:11px;color:#bbb;">${time}</span>
                            </div>
                            <div style="font-size:12px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px;">${escapeHtml(purePreview.slice(0, 30))}</div>
                        </div>
                    </div>`;
                }
            }
        } else {
            const groupKeys = Object.keys(window.G.groups || {});
            if (!groupKeys.length) {
                itemsHtml += `
                <div style="text-align:center;color:#aaa;padding:40px 16px;font-size:13px;line-height:1.6;">
                    暂无群聊，可以点击右上角 ➕ 自建专属主播交流群！
                </div>`;
            } else {
                for (const [gid, grp] of Object.entries(window.G.groups)) {
                    const msgs = window.G.groupChatHistory[gid] || [];
                    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
                    const purePreview = lastMsg ? `${lastMsg.senderName || '成员'}: ${(typeof stripThought === 'function' ? stripThought(lastMsg.text || '') : (lastMsg.text || ''))}` : (grp.desc || '开启热烈讨论吧');
                    itemsHtml += `
                    <div class="group-item" data-group-id="${gid}" style="display:flex;align-items:center;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:#fff;border:1px solid #f0f4f0;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;">
                        <div style="margin-right:12px;flex-shrink:0;">${renderAvatarBadge(grp, 44)}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-weight:700;font-size:14px;color:var(--text);">${escapeHtml(grp.name)} <span style="font-size:11px;color:#999;">(${(grp.members || []).length}人)</span></span>
                                <span style="font-size:11px;color:#bbb;">${lastMsg ? (lastMsg.time || '') : ''}</span>
                            </div>
                            <div style="font-size:12px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px;">${escapeHtml(purePreview.slice(0, 30))}</div>
                        </div>
                    </div>`;
                }
            }
        }
        return itemsHtml;
    }

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
                    📜 点击展开更早的 ${chatHist.length - FOLD_LIMIT} 条记录
                </button>
            </div>`;
        }

        for (const msg of displayList) {
            if (msg.from === 'action') {
                messagesHtml += `
                <div style="text-align:center;margin:8px 0;">
                    <span style="display:inline-block;background:rgba(0,0,0,0.06);color:#666;padding:4px 10px;border-radius:12px;font-size:12px;max-width:85%;">${escapeHtml(msg.text || '')}</span>
                </div>`;
            } else if (msg.from === 'behind_screen') {
                messagesHtml += `
                <div style="margin:10px 14px;background:rgba(255,253,245,0.92);border:1px dashed #d7ccc8;border-radius:10px;padding:8px 12px;font-size:12px;color:#5d4037;line-height:1.6;box-shadow:0 1px 4px rgba(0,0,0,0.04);position:relative;">
                    <div style="font-weight:700;font-size:11px;color:#8d6e63;margin-bottom:3px;">👁️ 屏幕那边的 TA (${escapeHtml(npc.name)})</div>
                    <div>${escapeHtml(msg.text || '')}</div>
                </div>`;
            } else {
                const isSelf = msg.from === 'player';
                let bubbleContent = '';

                if (msg.sticker) {
                    bubbleContent = `<div style="padding:0;display:inline-block;"><img src="${msg.sticker.url}" alt="${escapeHtml(msg.sticker.desc)}" style="width:85px;height:85px;border-radius:8px;object-fit:cover;display:block;"></div>`;
                } else if (msg.sharedMoment) {
                    const sm = msg.sharedMoment;
                    bubbleContent = `
                    <div onclick="window.jumpToMomentCard(${sm.id})" style="cursor:pointer;background:#fff;border-radius:8px;padding:8px;border:1px solid #e0e0e0;max-width:210px;">
                        <div style="font-weight:700;font-size:11px;color:#2e7d32;margin-bottom:3px;">🌟 朋友圈动态 · ${escapeHtml(sm.author)}</div>
                        <div style="font-size:12px;color:#333;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escapeHtml(sm.body || '')}</div>
                        ${sm.image ? `<img src="${sm.image}" style="width:100%;height:65px;object-fit:cover;border-radius:4px;margin-top:4px;">` : ''}
                        <div style="font-size:10px;color:#999;text-align:right;margin-top:4px;">点击查看完整动态 ❯</div>
                    </div>`;
                } else {
                    bubbleContent = isSelf ? escapeHtml(msg.text || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(msg.text || '') : escapeHtml(msg.text || ''));
                }

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" data-from="${msg.from}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:10px;align-items:flex-start;">
                    ${!isSelf ? `<div onclick="window.openNpcProfileCardModal('${npcId}')" style="margin-right:8px;flex-shrink:0;cursor:pointer;">${renderAvatarBadge(npc, 34)}</div>` : ''}
                    <div style="max-width:75%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${isSelf && msg.senderAccount ? `<div style="font-size:10px;color:#888;margin-bottom:2px;">${escapeHtml(msg.senderAccount)}</div>` : ''}
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? ((msg.sticker || msg.sharedMoment) ? 'transparent' : '#95ec69') : ((msg.sticker || msg.sharedMoment) ? 'transparent' : '#fff')};color:#111;padding:${(msg.sticker || msg.sharedMoment) ? '0' : '8px 12px'};border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:${(msg.sticker || msg.sharedMoment) ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'};font-size:14px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;cursor:pointer;">
                            ${bubbleContent}
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: activeAcc.avatar }, 34)}</div>` : ''}
                </div>`;
            }
        }

        const html = `
        <div style="background:#f2f4f2;display:flex;flex-direction:column;height:100%;min-height:480px;overflow:hidden;">
            <div style="padding:8px 12px;background:#fff;border-bottom:1px solid #e5ebe5;display:flex;justify-content:space-between;align-items:center;min-height:48px;flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                    <button onclick="window.closeChat()" style="border:none;background:none;font-size:19px;color:#333;cursor:pointer;padding:0 2px;">❮</button>
                    <div onclick="window.openNpcProfileCardModal('${npcId}')" style="cursor:pointer;flex:1;min-width:0;">
                        <div style="font-weight:700;font-size:14.5px;display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            <span style="overflow:hidden;text-overflow:ellipsis;">${escapeHtml(npc.name)}</span>
                            <span style="font-size:10.5px;color:#e53935;font-weight:normal;background:#ffebee;padding:1px 5px;border-radius:6px;flex-shrink:0;">❤️ ${npc.favor || 0}</span>
                        </div>
                        <div id="chatOnlineStatusText" style="font-size:10.5px;color:#2e7d32;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${isBlocked ? '<span style="color:#d32f2f;">⚠️ 已拉黑</span>' : '● 在线'} ${npc.memorySummary ? '· 🧠记忆' : ''}
                        </div>
                    </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                    <button onclick="window.toggleBehindScreen('${npcId}')" style="border:1px solid ${isBehindScreenActive ? '#8d6e63' : '#ccc'};background:${isBehindScreenActive ? '#efebe9' : '#fff'};width:30px;height:30px;border-radius:50%;font-size:15px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="开启/关闭动作感知">👁️</button>
                    <button onclick="window.triggerAIReplyForSingle('${npcId}')" style="border:none;background:#ff4757;color:#fff;width:32px;height:32px;border-radius:8px;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(255,71,87,0.35);">⚡</button>
                </div>
            </div>

            ${isBlocked ? `
            <div style="background:#ffebee;color:#c62828;padding:5px 12px;font-size:11px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ffcdd2;flex-shrink:0;">
                <span>🚫 你的当前账号已被对方拉黑拒收。</span>
            </div>` : ''}

            <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">当前与 TA 尚无对话，点击右上方 ⚡ 开启互动！</div>'}
            </div>

            ${_stickerDrawerOpen ? buildStickerDrawerHTML('single', npcId) : ''}

            <div style="padding:6px 8px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:5px;align-items:center;flex-shrink:0;">
                <button onclick="window.openChatActionMenuModal('single', '${npcId}')" title="合作/拍共创视频" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">➕</button>
                <button onclick="window.toggleStickerDrawer('single', '${npcId}')" title="发送表情包" style="border:1px solid #ccc;background:${_stickerDrawerOpen ? '#eaf5ea' : '#f8f9f8'};color:#555;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">😊</button>
                <textarea id="singleChatInput" rows="1" placeholder="发送消息..." style="flex:1;padding:7px 10px;border-radius:16px;border:1px solid #ddd;background:#f8faf8;font-size:13.5px;resize:none;outline:none;font-family:inherit;"></textarea>
                <button onclick="window.doSendSingleChat('${npcId}')" style="border:none;background:var(--primary);color:#fff;padding:6px 13px;border-radius:16px;font-size:12.5px;font-weight:700;cursor:pointer;flex-shrink:0;">发送</button>
            </div>
        </div>
        `;
        container.innerHTML = html;

        const msgArea = document.getElementById('chatMessageArea');
        if (msgArea) {
            setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 50);
        }

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
                    <span style="display:inline-block;background:rgba(0,0,0,0.06);color:#666;padding:3px 10px;border-radius:12px;font-size:11px;">${escapeHtml(msg.text || '')}</span>
                </div>`;
            } else {
                const isSelf = msg.from === 'player';
                let bubbleContent = '';
                if (msg.sticker) {
                    bubbleContent = `<div style="padding:0;display:inline-block;"><img src="${msg.sticker.url}" alt="${escapeHtml(msg.sticker.desc)}" style="width:85px;height:85px;border-radius:8px;object-fit:cover;display:block;"></div>`;
                } else {
                    bubbleContent = isSelf ? escapeHtml(msg.text || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(msg.text || '') : escapeHtml(msg.text || ''));
                }

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" data-from="${msg.from}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:10px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: msg.senderAvatarUrl, avatarEmoji: msg.senderAvatar || '👤' }, 34)}</div>` : ''}
                    <div style="max-width:75%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${!isSelf ? `<div style="font-size:11px;color:#777;margin-bottom:2px;">${escapeHtml(msg.senderName || '成员')}</div>` : ''}
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? (msg.sticker ? 'transparent' : '#95ec69') : (msg.sticker ? 'transparent' : '#fff')};color:#111;padding:${msg.sticker ? '0' : '8px 12px'};border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:${msg.sticker ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'};font-size:14px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;">
                            ${bubbleContent}
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: activeAcc.avatar }, 34)}</div>` : ''}
                </div>`;
            }
        }

        const html = `
        <div style="background:#f2f4f2;display:flex;flex-direction:column;height:100%;min-height:480px;overflow:hidden;">
            <div style="padding:10px 14px;background:#fff;border-bottom:1px solid #e5ebe5;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <button onclick="window.closeGroupChat()" style="border:none;background:none;font-size:20px;color:#333;cursor:pointer;padding:0 4px;">❮</button>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="flex-shrink:0;">${renderAvatarBadge(grp, 38)}</div>
                        <div>
                            <div style="font-weight:700;font-size:15px;">${escapeHtml(grp.name)} <span style="font-size:12px;color:#888;">(${(grp.members || []).length})</span></div>
                            <div style="font-size:11px;color:#888;">${grp.desc ? escapeHtml(grp.desc.slice(0, 18)) : '群聊自由交流'}</div>
                        </div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button onclick="window.openGroupSettingsModal('${gid}')" style="border:1px solid #ddd;background:#fff;color:#555;padding:4px 8px;border-radius:8px;font-size:12px;cursor:pointer;">⚙️ 管理</button>
                    <button onclick="window.triggerGroupAIReply('${gid}')" title="触发群成员回复" style="border:none;background:#ff4757;color:#fff;width:36px;height:36px;border-radius:10px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(255,71,87,0.35);">⚡</button>
                </div>
            </div>

            <div id="groupMessageArea" style="flex:1;overflow-y:auto;padding:14px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">群里静悄悄的，点击 ➕ 开启多人共创吧！</div>'}
            </div>

            ${_stickerDrawerOpen ? buildStickerDrawerHTML('group', gid) : ''}

            <div style="padding:8px 10px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:8px;align-items:center;flex-shrink:0;">
                <button onclick="window.openChatActionMenuModal('group', '${gid}')" title="群合作/共创视频" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">➕</button>
                <button onclick="window.toggleStickerDrawer('group', '${gid}')" title="发送表情包" style="border:1px solid #ccc;background:${_stickerDrawerOpen ? '#eaf5ea' : '#f8f9f8'};color:#555;width:36px;height:36px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">😊</button>
                <textarea id="groupChatInput" rows="1" placeholder="以 [${escapeHtml(activeAcc.name)}] 在群里发言..." style="flex:1;padding:8px 12px;border-radius:18px;border:1px solid #ddd;background:#f8faf8;font-size:14px;resize:none;outline:none;font-family:inherit;"></textarea>
                <button onclick="window.doSendGroupChat('${gid}')" style="border:none;background:var(--primary);color:#fff;padding:8px 16px;border-radius:18px;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0;">发送</button>
            </div>
        </div>
        `;
        container.innerHTML = html;

        const msgArea = document.getElementById('groupMessageArea');
        if (msgArea) {
            setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 50);
        }

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

    function buildStickerDrawerHTML(targetType, targetId) {
        ensureStickersLoaded();
        const cats = window.G.stickerCategories || ['猪猪', '默认'];
        const activeCat = window.G.activeStickerCategory || cats[0];
        const stickers = (window.G.stickerLibrary || []).filter(s => s.category === activeCat);

        let tabsHtml = cats.map(c => `
            <button class="stk-tab-btn ${c === activeCat ? 'active' : ''}" onclick="window.switchStickerCategory('${escapeHtml(c)}', '${targetType}')" style="padding:4px 9px;font-size:11px;font-weight:700;border:1px solid ${c === activeCat ? 'var(--primary)' : '#ccc'};border-radius:6px;background:${c === activeCat ? '#eaf5ea' : '#fff'};color:${c === activeCat ? 'var(--primary)' : '#555'};cursor:pointer;white-space:nowrap;">
                ${escapeHtml(c)}
            </button>
        `).join('');

        let gridHtml = `
            <div class="stk-item-card" onclick="window.openImportStickersModal('${targetType}', '${targetId}')" style="height:62px;border:1.5px dashed #aaa;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;background:#fafafa;">
                <span style="font-size:20px;color:#888;">➕</span>
                <span style="font-size:9.5px;color:#888;margin-top:2px;">添加</span>
            </div>
        `;

        stickers.forEach((stk) => {
            gridHtml += `
            <div class="stk-item-card stk-send-btn" onclick="window.sendStickerMessage('${targetType}', '${targetId}', {desc: '${escapeHtml(stk.desc)}', url: '${escapeHtml(stk.url)}'})" style="height:62px;border:1px solid #e0e0e0;border-radius:6px;padding:2px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;cursor:pointer;background:#fff;overflow:hidden;" title="${escapeHtml(stk.desc)}">
                <img src="${stk.url}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">
            </div>
            `;
        });

        return `
        <div id="stickerDrawerContainer" style="background:#f4f6f4;border-top:1px solid #ddd;padding:6px 8px;height:165px;display:flex;flex-direction:column;box-sizing:border-box;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:5px;overflow-x:auto;padding-bottom:5px;border-bottom:1px solid #e2e8e2;flex-shrink:0;">
                ${tabsHtml}
                <button onclick="window.openCreateStickerCategoryModal('${targetType}', '${targetId}')" title="新建分组" style="border:1px solid #bbb;background:#fff;padding:3px 7px;border-radius:6px;font-size:10.5px;cursor:pointer;white-space:nowrap;">✏️ 新分类</button>
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
        if (lines.length === 1 && lines[0].length > 35) {
            const sentences = lines[0].split(/([。！？!?~～]+)/).filter(Boolean);
            let current = '';
            for (let i = 0; i < sentences.length; i++) {
                current += sentences[i];
                if (i % 2 === 1 || current.length > 20) {
                    if (current.trim()) bubbles.push(current.trim());
                    current = '';
                }
            }
            if (current.trim()) bubbles.push(current.trim());
            if (bubbles.length > 0) return bubbles.slice(0, 5);
        }
        return [clean];
    }

    function findStickerByKeyword(kw) {
        if (!kw || !window.G.stickerLibrary) return null;
        const cleanKw = kw.trim().toLowerCase();
        return window.G.stickerLibrary.find(s => s.desc.toLowerCase().includes(cleanKw)) || null;
    }

    // ================= 暴露到 window 兼容全系统 =================
    window.renderChatApp = renderChatApp;
    window.renderSocialPanel = renderChatApp;
    window.renderSingleChatWindow = renderSingleChatWindow;
    window.renderGroupChatWindow = renderGroupChatWindow;
    window.ensureStickersLoaded = ensureStickersLoaded;
    window.ensureNpcIntegrity = ensureNpcIntegrity;
    window.getChatStorageKey = getChatStorageKey;
    window.getAccountChatHistory = getAccountChatHistory;
    window.pushChatMessageSafe = pushChatMessageSafe;
    window.isAccountBlockedByNpc = isAccountBlockedByNpc;
    window.getActiveAccountInfo = getActiveAccountInfo;
    window.detectPlayerTimezoneInfo = detectPlayerTimezoneInfo;
    window.formatNpcTimezoneContext = formatNpcTimezoneContext;
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
        if (typeof showToast === 'function') showToast(window.G._behindScreenActive[npcId] ? '👁️ 已开启「屏幕那边的TA」动作感知' : '已关闭线下动作感知', 'info', 1500);
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
            pushChatMessageSafe(npcId, { from: 'action', text: `❌ 消息已被拒收。（已被拉黑）`, time: new Date().toLocaleTimeString().slice(0, 5) });
            input.value = '';
            renderSingleChatWindow();
            if (typeof showToast === 'function') showToast('⚠️ 对方开启了朋友验证，你已被拉黑', 'error', 3000);
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
            if (typeof showToast === 'function') showToast('⚠️ 当前账号已被对方拉黑，无法接收回复。', 'error', 3000);
            return;
        }

        const history = getAccountChatHistory(npcId);
        const statusEl = document.getElementById('chatOnlineStatusText');
        if (statusEl) statusEl.innerHTML = `<span style="color:#ff9800;">✍️ 对方正在打字...</span>`;

        let recentContext = history.length > 0 ? history.slice(-10).map(m => {
            if (m._recalled) return m._seenByNpc ? `[系统提示: 对方发了"${m._originalText}"，随后撤回了，但被你亲眼看到了]` : `[系统提示: 对方撤回了一条消息]`;
            if (m.from === 'action') return `[旁白: ${m.text}]`;
            if (m.from === 'behind_screen') return `[此前你屏幕那边的线下动作: ${m.text}]`;
            if (m.sharedMoment) return `[对方转发了朋友圈动态给你: "${m.sharedMoment.body}"]`;
            return `${m.from === 'player' ? (m.senderAccount || (window.G.player && window.G.player.ytName)) : npc.name}: ${m.sticker ? `[发送了表情包: ${m.sticker.desc}]` : ((typeof stripThought === 'function') ? stripThought(m.text || '') : m.text)}`;
        }).join('\n') : '（尚未开始对话，双方此前没有任何私聊记录）';

        let npcMemoryContext = '';
        if (npc.memorySummary) npcMemoryContext += `【历史专属记忆与朋友圈互动】\n${npc.memorySummary}\n`;
        if (npc.knownGroupEvents) npcMemoryContext += `【群聊获悉事件】\n${npc.knownGroupEvents}\n`;

        const recentPlayerPosts = (window.G.feed || []).filter(f => f.isPlayer || f.author === window.G.player?.ytName).slice(-2);
        let playerMomentsContext = '';
        if (recentPlayerPosts.length > 0) {
            playerMomentsContext = '【玩家最近发的朋友圈动态（可自然在私聊中提起）】：\n' + recentPlayerPosts.map(p => {
                let picDesc = '';
                if (p.imageMode === 'text_only' && p.imageDesc) picDesc = ` (配图描述: ${p.imageDesc})`;
                else if (p.imageMode === 'image_with_desc' && p.imageDesc) picDesc = ` (配图内容描述: ${p.imageDesc})`;
                else if (p.image) picDesc = ` (附带图片)`;
                return `• "${p.body}"${picDesc}`;
            }).join('\n') + '\n';
        }

        const tzContext = formatNpcTimezoneContext();
        const availableStickers = (window.G.stickerLibrary || []).slice(0, 20).map(s => s.desc).join('、');
        const curFavor = npc.favor || 0;

        let favorStageRule = '';
        if (curFavor < 20) favorStageRule = `【🚨 好感度极度生疏阶段警告】：双方【刚刚认识或完全不熟】！态度冷淡、生疏、防备！严禁自来熟和过度热情。`;
        else if (curFavor < 40) favorStageRule = `【点头之交】：客气、礼貌的同行关系，保持基本社交距离。`;
        else if (curFavor < 60) favorStageRule = `【熟络朋友】：已经比较熟悉，可以互相开玩笑、互怼。`;
        else favorStageRule = `【知己/暧昧】：关系亲密，默契深厚，充满护短与偏袒。`;

        const behindScreenPrompt = isBehindScreenActive ? `\n【屏幕那边的TA（线下第三人称动作感知）】：\n玩家已开启线下动作感知。请在输出完聊天消息后，额外输出一个独立块 [BEHIND_SCREEN]...[/BEHIND_SCREEN]，细腻描写你在屏幕那边的真实线下动作（30~60字）。\n` : '';

        const sysPrompt = `你正在扮演真实沉浸的 Minecraft 主播/好友「${npc.name}」（性格人设：${npc.persona || '同伴'}）。
玩家是一名女性主播（名字：${(window.G.player && window.G.player.ytName) || '主播'}，Live2D皮套：${(window.G.player && window.G.player.avatarLive2d) || '精美皮套'}，像素皮肤：${(window.G.player && window.G.player.skin) || 'MC皮肤'}）。
${favorStageRule}
${tzContext}
${npcMemoryContext}
${playerMomentsContext}

【严禁出戏括号与纯净打字铁律】：
1. 气泡内【绝对禁止】包含动作括号（如"*微笑*"）！把聊天框当成真实的微信打字！
2. 支持表情包斗图：语境合适可写 [STICKER:表情关键词]（参考：${availableStickers}）。
3. 输出 2 到 4 条短消息气泡，用 [MSG]...[/MSG] 包裹：
[MSG]第一句话[/MSG]
[MSG]第二句话[/MSG]
${behindScreenPrompt}`;

        try {
            window.G.isGenerating = true;
            if (typeof showLoading === 'function') showLoading();
            const rawReply = await callAI([{ role: 'system', content: sysPrompt }, { role: 'user', content: history.length > 0 ? '请连续发送多条回复。' : '请打招呼。' }], { maxTokens: 550, temperature: 0.9 });
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
                if (i < finalBubbles.length - 1) await new Promise(res => setTimeout(res, 500));
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
            const curStatusEl = document.getElementById('chatOnlineStatusText');
            if (curStatusEl) {
                curStatusEl.innerHTML = `${isAccountBlockedByNpc(npcId, activeAcc.id) ? '<span style="color:#d32f2f;">⚠️ TA已拉黑</span>' : '● 在线'} ${npc.memorySummary ? '· 🧠记忆' : ''}`;
            }
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

    // 弹窗与其它辅助方法
    window.switchAccount = function(accId) {
        window.G.currentAccountId = accId;
        if (typeof showToast === 'function') showToast(`🔀 已切换账号为：${getActiveAccountInfo().name}`, 'info', 1800);
        renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

})();
