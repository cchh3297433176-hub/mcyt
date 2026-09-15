/**
 * js/apps/chat/chat-app.js
 * 💬 微信独立主应用（会话调度中枢 · 灵动岛防遮挡 · 轻量无冗余）
 * 包含：
 * 1. 微信顶天立地沉浸式容器调度、单色极简底部导航（微信 / 动态 / 我）
 * 2. 私聊与群聊会话流、动作感知悬浮、表情包抽屉
 * 3. 跨小号会话隔离、名片推荐互动机制
 */

(function() {
    'use strict';

    let _activeBottomTab = 'chats';
    let _stickerDrawerOpen = false;

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

        // 触发人设与账号持久化恢复
        if (typeof window.restoreWechatProfileData === 'function') {
            window.restoreWechatProfileData();
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
        const url = (obj && obj.isPlayer) ? curAcc.avatar : (obj?.avatarUrl || (typeof getRandomAvatar === 'function' ? getRandomAvatar() : 'assets/icons/chat.png'));
        return `<div style="width:${size}px;height:${size}px;border-radius:6px;overflow:hidden;background:#e9e9e9;flex-shrink:0;box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.06);">
            <img src="${url}" draggable="false" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.onerror=null;this.src='assets/icons/chat.png';" />
        </div>`;
    }

    // ============================================================
    // 📱 微信 App 整体调度
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
                <div class="wechat-top-header" style="background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;padding-left:14px;padding-right:14px;flex-shrink:0;">
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
                <div class="wechat-top-header" style="background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;padding-left:14px;padding-right:14px;flex-shrink:0;">
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
            mainContentHtml = (typeof buildMomentsHTML === 'function') ? buildMomentsHTML() : '<div style="padding:40px;text-align:center;color:#999;">动态模块装载中...</div>';
        } else if (_activeBottomTab === 'profile') {
            topBarHtml = `
                <div class="wechat-top-header" style="background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;padding-left:14px;padding-right:14px;flex-shrink:0;">
                    <button onclick="closePhoneApp()" style="border:none;background:none;font-size:14px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>桌面</span>
                    </button>
                    <div style="font-size:15px;font-weight:600;color:#181818;">我 · 身份中心</div>
                    <div style="width:40px;"></div>
                </div>
            `;
            // 调用独立人设模块输出界面
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
                    bindLongPressEvent(item, () => { window.openChat(id); }, () => { window.openEditNpcModal(id); });
                } else {
                    item.onclick = () => window.openChat(id);
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

    // 微信会话列表（小号隔离显示）
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
                ${isAlt ? '可以通过主号名片引荐，或点击右上角 + 添加联系人！' : '点击右上角 + 开始交流！'}
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

    // 私聊窗口
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
                    <div style="font-weight:600;color:#2563eb;margin-bottom:4px;">名片推荐</div>
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
            <div class="wechat-top-header" style="background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;padding-left:14px;padding-right:14px;flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                    <button onclick="window.closeChat()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>微信</span>
                    </button>
                    <div style="font-weight:600;font-size:15px;color:#181818;margin-left:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${escapeHtml(npc.name)} <span style="font-size:11px;color:#888;font-weight:normal;">(${escapeHtml(npc.region ? npc.region.split(' ')[0] : '')})</span>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button onclick="window.sendAltCardToNpc('${npcId}')" style="border:0.5px solid #ccc;background:#fff;color:#333;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer;">推小号名片</button>
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
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:10px;">推荐我的小号名片</div>
                <div style="font-size:12px;color:#666;margin-bottom:8px;">选择要引荐给 TA 的小号：</div>
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
                text: `${curAcc.name} 推送了马甲小号「${targetAlt.name}」的名片给对方。`,
                time: new Date().toLocaleTimeString().slice(0, 5)
            }, curAcc.id);

            // 对方收到名片后，NPC 主动给该小号派发好友申请！
            if (!window.G.friendRequests) window.G.friendRequests = [];
            window.G.friendRequests.push({
                _id: 'freq_alt_' + Date.now(),
                targetAltId: targetAlt.id,
                npcOfficialId: npcId,
                name: window.G.npcs[npcId]?.name || '好友',
                fromReason: `收到了你的名片引荐，添加你的小号「${targetAlt.name}」`,
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

    // 提示词占位调度：未来直接由独立 Prompt 仓库装载
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
            : `你正在扮演MC好友「${npc.name}」。对方是「${curAcc.name}」。你常驻于${nRegion}，对方常驻于${pRegion}。像真实微信打字一样简明回复，严禁任何括号动作。`;

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
