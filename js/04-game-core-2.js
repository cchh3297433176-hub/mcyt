// js/04-game-core-2.js
// 🔧 [关键修复] 私聊进入 + 移除旁白按钮 + 保留表情包与屏幕那边的TA

// ============================================================
// ✅ [核心修复] openChat 确保私聊窗口强制打开
// ============================================================
function openChat(npcId) {
    if (!G.npcs || !G.npcs[npcId]) return;
    G.currentChatGroup = null;
    G.currentChatNpc = npcId;
    G.chatActiveTab = 'direct';
    G.phoneNav = 'chats';
    
    // 🔥 核心修复：不依赖 switchTab，直接强制渲染
    const container = (dom && dom.socialTab) || document.getElementById('socialTab');
    if (container) {
        renderSocialPanel();
    } else {
        // 回退：如果容器未准备好，先切 Tab 再渲染
        if (typeof switchTab === 'function') {
            switchTab('social');
        }
        setTimeout(() => renderSocialPanel(), 50);
    }
}

function closeChat() {
    G.currentChatNpc = null;
    renderSocialPanel();
}

// ============================================================
// ✅ [核心修复] openGroupChat 确保群聊窗口强制打开
// ============================================================
function openGroupChat(gid) {
    if (!G.groups || !G.groups[gid]) return;
    G.currentChatNpc = null;
    G.currentChatGroup = gid;
    G.chatActiveTab = 'group';
    G.phoneNav = 'chats';
    
    // 🔥 核心修复：不依赖 switchTab，直接强制渲染
    const container = (dom && dom.socialTab) || document.getElementById('socialTab');
    if (container) {
        renderSocialPanel();
    } else {
        if (typeof switchTab === 'function') {
            switchTab('social');
        }
        setTimeout(() => renderSocialPanel(), 50);
    }
}

function closeGroupChat() {
    G.currentChatGroup = null;
    renderSocialPanel();
}

// ============================================================
// ✅ [移除旁白按钮] openChatActionMenuModal 改为只保留共创和直播
// ============================================================
function openChatActionMenuModal(targetType, targetId) {
    const isGroup = targetType === 'group';
    const title = isGroup ? '👥 群聊互动与共创' : `🤝 与 ${escapeHtml(G.npcs[targetId]?.name || '好友')} 的互动`;

    openModal(`
        <h3>${title}</h3>
        <p style="font-size:12px;color:#666;line-height:1.5;">选择与对方展开的合作联动形式：</p>
        <div class="btn-row" style="flex-direction:column;gap:8px;margin-top:10px;">
            <button class="btn-primary" id="actCollabVideoBtn" style="width:100%;background:#e53935;">🎬 邀请一起录制拍视频 (油管共创)</button>
            <button class="btn-primary" id="actCollabStreamBtn" style="width:100%;background:#388e3c;">🔴 邀请一起联机开播 (连麦涨粉)</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">取消</button>
        </div>
    `);

    document.getElementById('actCollabVideoBtn').onclick = () => { closeModal(); openCollabVideoPublishModal(targetType, targetId); };
    document.getElementById('actCollabStreamBtn').onclick = () => { closeModal(); handleInviteCollabStream(targetType, targetId); };
}

// ============================================================
// ✅ [私聊窗口] 保留表情包按钮 + 屏幕那边的TA，移除旁白按钮
// ============================================================
function renderSingleChatWindow(container) {
    const npcId = window.G.currentChatNpc;
    const npc = window.G.npcs[npcId];
    if (!npc) { closeChat(); return; }

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
            <button id="btnLoadMoreChatHist" style="border:none;background:rgba(0,0,0,0.06);color:#555;padding:4px 12px;border-radius:12px;font-size:11px;cursor:pointer;">
                📜 点击展开更早的 ${chatHist.length - FOLD_LIMIT} 条记录
            </button>
        </div>`;
    }

    for (const msg of displayList) {
        if (msg.from === 'action') {
            messagesHtml += `
            <div style="text-align:center;margin:8px 0;">
                <span style="display:inline-block;background:rgba(0,0,0,0.06);color:#666;padding:4px 10px;border-radius:12px;font-size:12px;max-width:85%;">${escapeHtml(msg.text)}</span>
            </div>`;
        } else if (msg.from === 'behind_screen') {
            messagesHtml += `
            <div style="margin:10px 14px;background:rgba(255,253,245,0.92);border:1px dashed #d7ccc8;border-radius:10px;padding:8px 12px;font-size:12px;color:#5d4037;line-height:1.6;box-shadow:0 1px 4px rgba(0,0,0,0.04);position:relative;">
                <div style="font-weight:700;font-size:11px;color:#8d6e63;margin-bottom:3px;">👁️ 屏幕那边的 TA (${escapeHtml(npc.name)})</div>
                <div>${escapeHtml(msg.text)}</div>
            </div>`;
        } else {
            const isSelf = msg.from === 'player';
            let bubbleContent = '';

            if (msg.sticker) {
                bubbleContent = `<div style="padding:0;display:inline-block;"><img src="${msg.sticker.url}" alt="${escapeHtml(msg.sticker.desc)}" style="width:85px;height:85px;border-radius:8px;object-fit:cover;display:block;"></div>`;
            } else if (msg.sharedMoment) {
                const sm = msg.sharedMoment;
                bubbleContent = `
                <div onclick="jumpToMomentCard(${sm.id})" style="cursor:pointer;background:#fff;border-radius:8px;padding:8px;border:1px solid #e0e0e0;max-width:210px;">
                    <div style="font-weight:700;font-size:11px;color:#2e7d32;margin-bottom:3px;">🌟 朋友圈动态 · ${escapeHtml(sm.author)}</div>
                    <div style="font-size:12px;color:#333;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escapeHtml(sm.body)}</div>
                    ${sm.image ? `<img src="${sm.image}" style="width:100%;height:65px;object-fit:cover;border-radius:4px;margin-top:4px;">` : ''}
                    <div style="font-size:10px;color:#999;text-align:right;margin-top:4px;">点击查看完整动态 ❯</div>
                </div>`;
            } else {
                bubbleContent = isSelf ? escapeHtml(msg.text).replace(/\n/g, '<br>') : renderContentWithThoughts(msg.text);
            }

            messagesHtml += `
            <div class="chat-msg-row" data-msgid="${msg._id || ''}" data-from="${msg.from}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:10px;align-items:flex-start;">
                ${!isSelf ? `<div class="chat-npc-avatar-btn" data-npcid="${npcId}" style="margin-right:8px;flex-shrink:0;cursor:pointer;" title="单击看名片，长按编辑人设与资料">${renderAvatarBadge(npc, 34)}</div>` : ''}
                <div style="max-width:75%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                    ${isSelf && msg.senderAccount ? `<div style="font-size:10px;color:#888;margin-bottom:2px;">${escapeHtml(msg.senderAccount)}</div>` : ''}
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? ((msg.sticker || msg.sharedMoment) ? 'transparent' : '#95ec69') : ((msg.sticker || msg.sharedMoment) ? 'transparent' : '#fff')};color:#111;padding:${(msg.sticker || msg.sharedMoment) ? '0' : '8px 12px'};border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:${(msg.sticker || msg.sharedMoment) ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'};font-size:14px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;cursor:pointer;">
                        ${bubbleContent}
                    </div>
                    <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                </div>
                ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: activeAcc.avatar }, 34)}</div>` : ''}
            </div>`;
        }
    }

    const html = `
    <div style="background:#f2f4f2;border-radius:14px;display:flex;flex-direction:column;height:82vh;max-height:850px;box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden;">
        <div style="padding:8px 12px;background:#fff;border-bottom:1px solid #e5ebe5;display:flex;justify-content:space-between;align-items:center;min-height:48px;box-sizing:border-box;">
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                <button onclick="closeChat()" style="border:none;background:none;font-size:19px;color:#333;cursor:pointer;padding:0 2px;">❮</button>
                <div id="singleChatHeaderProfileBtn" style="cursor:pointer;flex:1;min-width:0;" title="单击看名片，长按编辑TA的人设">
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
                <button id="btnToggleBehindScreen" style="border:1px solid ${isBehindScreenActive ? '#8d6e63' : '#ccc'};background:${isBehindScreenActive ? '#efebe9' : '#fff'};width:30px;height:30px;border-radius:50%;font-size:15px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="${isBehindScreenActive ? '已开启屏幕那边的动作感知(点击关闭)' : '点击开启屏幕那边的动作感知'}">👁️</button>
                <div id="singleChatHeaderAccountBtn" title="当前账号：${escapeHtml(activeAcc.name)} (点击切换)" style="cursor:pointer;display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;border:1.5px solid ${activeAcc.isAlt ? '#ffb300' : 'var(--primary)'};overflow:hidden;background:#fff;">
                    ${activeAcc.avatar ? `<img src="${activeAcc.avatar}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-size:14px;">${activeAcc.isAlt ? '🎭' : '👑'}</span>`}
                </div>
                <button id="triggerAIReplyBtn" title="让TA回复或主动发消息" style="border:none;background:#ff4757;color:#fff;width:32px;height:32px;border-radius:8px;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        ${isBlocked ? `
        <div style="background:#ffebee;color:#c62828;padding:5px 12px;font-size:11px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ffcdd2;">
            <span>🚫 你的当前账号已被对方拉黑拒收。</span>
            <button onclick="openAccountManagerModal()" style="border:none;background:#c62828;color:#fff;padding:2px 7px;border-radius:6px;font-size:10px;cursor:pointer;">切小号转圜</button>
        </div>` : ''}

        <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
            ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">当前账号与 TA 尚无对话，点击右上方 ⚡ 闪电按钮开启互动！</div>'}
        </div>

        ${_stickerDrawerOpen ? buildStickerDrawerHTML() : ''}

        <div style="padding:6px 8px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:5px;align-items:center;">
            <button id="chatActionInsertBtn" title="合作/拍共创视频" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
            <button id="chatToggleStickerBtn" title="发送表情包" style="border:1px solid #ccc;background:${_stickerDrawerOpen ? '#eaf5ea' : '#f8f9f8'};color:#555;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;">😊</button>
            <textarea id="singleChatInput" rows="1" placeholder="" style="flex:1;padding:7px 10px;border-radius:16px;border:1px solid #ddd;background:#f8faf8;font-size:13.5px;resize:none;outline:none;font-family:inherit;"></textarea>
            <button id="singleSendBtn" style="border:none;background:var(--primary);color:#fff;padding:6px 13px;border-radius:16px;font-size:12.5px;font-weight:700;cursor:pointer;">发送</button>
        </div>
    </div>
    `;
    container.innerHTML = html;

    const msgArea = document.getElementById('chatMessageArea');
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;

    if (_stickerDrawerOpen) {
        bindStickerDrawerEvents('single', npcId);
    }

    document.getElementById('btnToggleBehindScreen')?.addEventListener('click', () => {
        window.G._behindScreenActive[npcId] = !window.G._behindScreenActive[npcId];
        showToast(window.G._behindScreenActive[npcId] ? '👁️ 已开启「屏幕那边的TA」动作感知' : '已关闭线下动作感知', 'info', 1500);
        renderSingleChatWindow(container);
        autoSaveGame();
    });

    document.getElementById('chatToggleStickerBtn')?.addEventListener('click', () => {
        _stickerDrawerOpen = !_stickerDrawerOpen;
        renderSingleChatWindow(container);
    });

    document.getElementById('btnLoadMoreChatHist')?.addEventListener('click', () => {
        window.G._chatShowFullHistory[sessionKey] = true;
        renderSingleChatWindow(container);
    });

    document.getElementById('singleChatHeaderAccountBtn')?.addEventListener('click', openAccountManagerModal);

    container.querySelectorAll('.chat-msg-row[data-from="player"]').forEach(row => {
        const msgId = row.dataset.msgid;
        const bubble = row.querySelector('.self-bubble');
        if (bubble && msgId) {
            bindLongPressEvent(bubble, () => { showMessageActionSheet(msgId, 'single', npcId); });
        }
    });

    container.querySelectorAll('.chat-npc-avatar-btn').forEach(btn => {
        bindLongPressEvent(btn, () => openEditNpcModal(npcId), () => openNpcProfileCardModal(npcId));
    });

    const headerProfileBtn = document.getElementById('singleChatHeaderProfileBtn');
    if (headerProfileBtn) {
        bindLongPressEvent(headerProfileBtn, () => openEditNpcModal(npcId), () => openNpcProfileCardModal(npcId));
    }

    const input = document.getElementById('singleChatInput');
    const sendBtn = document.getElementById('singleSendBtn');

    const doSend = () => {
        const text = input.value.trim();
        if (!text) return;

        if (isBlocked) {
            pushChatMessageSafe(npcId, { from: 'player', text, senderAccount: activeAcc.name, time: new Date().toLocaleTimeString().slice(0, 5) });
            pushChatMessageSafe(npcId, { from: 'action', text: `❌ 消息已发出，但被对方拒收了。（当前账号已被拉黑）`, time: new Date().toLocaleTimeString().slice(0, 5) });
            input.value = '';
            renderSingleChatWindow(container);
            showToast('⚠️ 对方开启了朋友验证，你已被拉黑', 'error', 3000);
            return;
        }

        pushChatMessageSafe(npcId, {
            from: 'player',
            text,
            senderAccount: activeAcc.isAlt ? `${activeAcc.name} (小号)` : activeAcc.name,
            time: new Date().toLocaleTimeString().slice(0, 5)
        });
        input.value = '';
        renderSingleChatWindow(container);
        autoSaveGame();
    };

    if (sendBtn) sendBtn.onclick = doSend;
    if (input) {
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
        };
    }

    document.getElementById('chatActionInsertBtn')?.addEventListener('click', () => {
        openChatActionMenuModal('single', npcId);
    });

    const triggerBtn = document.getElementById('triggerAIReplyBtn');
    if (triggerBtn) {
        triggerBtn.onclick = async () => {
            if (window.G.isGenerating) { showToast('⏳ TA 正在打字中...', 'info', 1500); return; }
            triggerBtn.style.opacity = '0.5';
            triggerBtn.style.pointerEvents = 'none';
            await triggerAIReplyForSingle(npcId);
            const btn2 = document.getElementById('triggerAIReplyBtn');
            if (btn2) { btn2.style.opacity = '1'; btn2.style.pointerEvents = 'auto'; }
        };
    }
}

// ============================================================
// ✅ [群聊窗口] 保留表情包按钮，移除旁白按钮
// ============================================================
function renderGroupChatWindow(container) {
    const gid = G.currentChatGroup;
    const grp = G.groups[gid];
    if (!grp) { closeGroupChat(); return; }
    const msgs = G.groupChatHistory[gid] || [];
    const activeAcc = getActiveAccountInfo();

    let messagesHtml = '';
    for (const msg of msgs) {
        if (msg.from === 'action') {
            messagesHtml += `
            <div style="text-align:center;margin:8px 0;">
                <span style="display:inline-block;background:rgba(0,0,0,0.06);color:#666;padding:3px 10px;border-radius:12px;font-size:11px;">${escapeHtml(msg.text)}</span>
            </div>`;
        } else {
            const isSelf = msg.from === 'player';
            let bubbleContent = '';
            if (msg.sticker) {
                bubbleContent = `<div style="padding:0;display:inline-block;"><img src="${msg.sticker.url}" alt="${escapeHtml(msg.sticker.desc)}" style="width:85px;height:85px;border-radius:8px;object-fit:cover;display:block;"></div>`;
            } else {
                bubbleContent = isSelf ? escapeHtml(msg.text).replace(/\n/g, '<br>') : renderContentWithThoughts(msg.text);
            }

            messagesHtml += `
            <div class="chat-msg-row" data-msgid="${msg._id || ''}" data-from="${msg.from}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:10px;align-items:flex-start;">
                ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: msg.senderAvatarUrl, avatarEmoji: msg.senderAvatar || '👤' }, 34)}</div>` : ''}
                <div style="max-width:75%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                    ${!isSelf ? `<div style="font-size:11px;color:#777;margin-bottom:2px;">${escapeHtml(msg.senderName)}</div>` : ''}
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? (msg.sticker ? 'transparent' : '#95ec69') : (msg.sticker ? 'transparent' : '#fff')};color:#111;padding:${msg.sticker ? '0' : '8px 12px'};border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:${msg.sticker ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'};font-size:14px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;">
                        ${bubbleContent}
                    </div>
                    <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                </div>
                ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: activeAcc.avatar }, 34)}</div>` : ''}
            </div>`;
        }
    }

    const html = `
    <div style="background:#f2f4f2;border-radius:14px;display:flex;flex-direction:column;height:82vh;max-height:850px;box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden;">
        <div style="padding:10px 14px;background:#fff;border-bottom:1px solid #e5ebe5;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
                <button onclick="closeGroupChat()" style="border:none;background:none;font-size:20px;color:#333;cursor:pointer;padding:0 4px;">❮</button>
                <div>
                    <div style="font-weight:700;font-size:15px;">${escapeHtml(grp.name)} <span style="font-size:12px;color:#888;">(${(grp.members || []).length})</span></div>
                    <div style="font-size:11px;color:#888;">${grp.desc ? escapeHtml(grp.desc.slice(0, 18)) : '群聊自由交流'}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button id="groupSettingsBtn" style="border:1px solid #ddd;background:#fff;color:#555;padding:4px 8px;border-radius:8px;font-size:12px;cursor:pointer;">⚙️ 管理</button>
                <button id="triggerGroupAIBtn" title="触发群成员回复" style="border:none;background:#ff4757;color:#fff;width:36px;height:36px;border-radius:10px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        <div id="groupMessageArea" style="flex:1;overflow-y:auto;padding:14px;">
            ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">群里静悄悄的，点击 ➕ 可发起群成员拍视频或多人开播！<br>长按自己发出的消息可撤回、编辑或删除</div>'}
        </div>

        ${_stickerDrawerOpen ? buildStickerDrawerHTML() : ''}

        <div style="padding:8px 10px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:8px;align-items:center;">
            <button id="groupActionInsertBtn" title="群合作/共创视频" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
            <button id="groupToggleStickerBtn" title="发送表情包" style="border:1px solid #ccc;background:${_stickerDrawerOpen ? '#eaf5ea' : '#f8f9f8'};color:#555;width:36px;height:36px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;">😊</button>
            <textarea id="groupChatInput" rows="1" placeholder="以 [${escapeHtml(activeAcc.name)}] 在群里发言..." style="flex:1;padding:8px 12px;border-radius:18px;border:1px solid #ddd;background:#f8faf8;font-size:14px;resize:none;outline:none;font-family:inherit;"></textarea>
            <button id="groupSendBtn" style="border:none;background:var(--primary);color:#fff;padding:8px 16px;border-radius:18px;font-size:13px;font-weight:700;cursor:pointer;">发送</button>
        </div>
    </div>
    `;
    container.innerHTML = html;

    const msgArea = document.getElementById('groupMessageArea');
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;

    if (_stickerDrawerOpen) {
        bindStickerDrawerEvents('group', gid);
    }

    document.getElementById('groupToggleStickerBtn')?.addEventListener('click', () => {
        _stickerDrawerOpen = !_stickerDrawerOpen;
        renderGroupChatWindow(container);
    });

    container.querySelectorAll('.chat-msg-row[data-from="player"]').forEach(row => {
        const msgId = row.dataset.msgid;
        const bubble = row.querySelector('.self-bubble');
        if (bubble && msgId) {
            bindLongPressEvent(bubble, () => { showMessageActionSheet(msgId, 'group', gid); });
        }
    });

    const input = document.getElementById('groupChatInput');
    const sendBtn = document.getElementById('groupSendBtn');

    const doSend = () => {
        const text = input.value.trim();
        if (!text) return;
        if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
        G.groupChatHistory[gid].push({
            _id: 'gmsg_' + Date.now() + '_' + rand(100, 999),
            from: 'player', senderName: activeAcc.name,
            text, time: new Date().toLocaleTimeString().slice(0, 5)
        });
        input.value = '';
        renderGroupChatWindow(container);
        autoSaveGame();
    };

    if (sendBtn) sendBtn.onclick = doSend;
    if (input) {
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
        };
    }

    document.getElementById('groupActionInsertBtn')?.addEventListener('click', () => {
        openChatActionMenuModal('group', gid);
    });
    document.getElementById('groupSettingsBtn')?.addEventListener('click', () => openGroupSettingsModal(gid));

    const triggerGrpBtn = document.getElementById('triggerGroupAIBtn');
    if (triggerGrpBtn) {
        triggerGrpBtn.onclick = async () => {
            if (G.isGenerating) { showToast('⏳ AI 正在组织群聊中...'); return; }
            showToast('⚡ 触发群聊讨论...', 'success', 1200);
            await triggerGroupAIReply(gid);
            renderGroupChatWindow(container);
        };
    }
}

// 导出全局
window.openChat = openChat;
window.closeChat = closeChat;
window.openGroupChat = openGroupChat;
window.closeGroupChat = closeGroupChat;