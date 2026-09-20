/**
 * js/apps/chat/chat-group.js
 * 💬 微信多人群聊独立模块（群窗口渲染 · 去中心化双轨AI驱动 · 群持久化防丢门禁 · 群消息流转）
 * 🌟 重构升级：
 * 1. 彻底根治杀后台建群消失 Bug：建立双轨原子级持久化槽，冷启动自愈装载。
 * 2. 顶栏右上角纯正三个点（···），唤起群资料与原生矢量微绿齿轮高级设定。
 * 3. 顶栏⚡闪电定位为【推进群聊流转】：无论用户发不发消息，群友都能自然多线程互聊与接话。
 * 4. 支持统一调用（极省Token）与单独调用双轨调度，支持人数上下限抽取交错发言。
 * 5. 输入栏新增扩展交互图标（预留转账红包等未来功能）。
 */

(function() {
    'use strict';

    const GROUPS_STORAGE_KEY = 'mcyt_wechat_group_chats';
    const GROUP_HISTORY_STORAGE_KEY = 'mcyt_wechat_group_histories';

    // 🛡️ 群聊冷启动自动恢复与容灾自愈门禁
    function restoreGroupsFromStorage() {
        if (!window.G) window.G = {};
        if (!window.G.groups) window.G.groups = {};
        if (!window.G.groupChatHistory) window.G.groupChatHistory = {};

        try {
            const rawGroups = localStorage.getItem(GROUPS_STORAGE_KEY);
            if (rawGroups) {
                const parsed = JSON.parse(rawGroups);
                if (parsed && typeof parsed === 'object') {
                    window.G.groups = Object.assign({}, parsed, window.G.groups);
                }
            }
        } catch (e) {
            console.warn('⚠️ 读取群聊列表本地缓存失败:', e);
        }

        try {
            const rawHist = localStorage.getItem(GROUP_HISTORY_STORAGE_KEY);
            if (rawHist) {
                const parsedHist = JSON.parse(rawHist);
                if (parsedHist && typeof parsedHist === 'object') {
                    window.G.groupChatHistory = Object.assign({}, parsedHist, window.G.groupChatHistory);
                }
            }
        } catch (e) {
            console.warn('⚠️ 读取群聊记录本地缓存失败:', e);
        }
    }

    // 💾 群聊双轨持久化备份
    window.syncGroupChatsToLocalBackup = function() {
        try {
            if (window.G && window.G.groups) {
                localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(window.G.groups));
            }
            if (window.G && window.G.groupChatHistory) {
                localStorage.setItem(GROUP_HISTORY_STORAGE_KEY, JSON.stringify(window.G.groupChatHistory));
            }
        } catch (e) {
            console.warn('⚠️ 同步群聊到本地备份失败:', e);
        }
    };

    // 立即执行冷启动恢复
    restoreGroupsFromStorage();

    /**
     * 💬 多人群聊窗口主渲染
     */
    function renderGroupChatWindow(container, renderOpts = {}) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const gid = window.G.currentChatGroup;
        const group = window.G.groups && window.G.groups[gid];
        if (!group) { window.closeGroupChat(); return; }

        if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
        const history = window.G.groupChatHistory[gid] || [];
        const memberCount = (group.members || []).length + 1;
        const isGenerating = !!(window._MCYT_CHAT_GENERATING && window._MCYT_CHAT_GENERATING[gid]);

        const cfg = (window.ChatGroupSettings && typeof window.ChatGroupSettings.getGroupConfig === 'function')
            ? window.ChatGroupSettings.getGroupConfig(gid)
            : {};
        const groupTitles = cfg.titles || {};
        const groupAdmins = cfg.admins || [];

        const tokensCount = (typeof window.calculateHistoryTokens === 'function') ? window.calculateHistoryTokens(history) : 0;
        const tokenDisplay = (typeof window.formatTokenString === 'function') ? window.formatTokenString(tokensCount) : '0';

        let messagesHtml = '';
        for (const msg of history) {
            const isSelf = msg.from === 'player';
            const senderNpc = (!isSelf && msg.senderId) ? window.G.npcs[msg.senderId] : null;
            const senderName = isSelf ? '我' : (msg.senderName || senderNpc?.name || '群友');
            const avatarObj = isSelf ? { isPlayer: true } : (senderNpc || { avatarUrl: window.getRandomAvatar() });

            // 获取群头衔与管理徽标
            const title = (!isSelf && msg.senderId) ? groupTitles[msg.senderId] : (isSelf ? '群主' : '');
            const isAdmin = (!isSelf && msg.senderId) ? groupAdmins.includes(msg.senderId) : false;

            let quoteHtml = '';
            if (msg.quote) {
                quoteHtml = `
                <div class="wechat-quote-inline">
                    <span style="font-weight:600;">${escapeHtml(msg.quote.author || '好友')}:</span> ${escapeHtml(msg.quote.text || '')}
                </div>`;
            }

            if (msg.from === 'action') {
                messagesHtml += `
                <div style="text-align:center;margin:8px 0;">
                    <span style="display:inline-block;background:rgba(0,0,0,0.05);color:#888;padding:3px 10px;border-radius:4px;font-size:11.5px;max-width:85%;">${escapeHtml(msg.text || '')}</span>
                </div>`;
            } else if (msg.type === 'voice') {
                const seconds = Math.min(60, Math.max(1, parseInt(msg.seconds) || 3));
                const bubbleWidth = Math.min(220, 68 + seconds * 4.5);

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                    <div style="max-width:68%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${!isSelf ? `
                            <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
                                ${isAdmin ? `<span style="font-size:9px;background:#07c160;color:#fff;padding:0 3px;border-radius:3px;font-weight:600;">管</span>` : ''}
                                ${title ? `<span style="font-size:9px;background:#eef7ee;color:#07c160;padding:0 4px;border-radius:3px;font-weight:500;">${escapeHtml(title)}</span>` : ''}
                                <span style="font-size:11px;color:#888;">${escapeHtml(senderName)}</span>
                            </div>
                        ` : ''}
                        ${quoteHtml}
                        <div class="wechat-voice-bubble" onclick="window.toggleVoiceMessageDetailsDirect('${msg._id}')" style="width:${bubbleWidth}px;background:${isSelf ? '#95ec69' : '#ffffff'};color:${isSelf ? '#111' : '#222'};justify-content:${isSelf ? 'flex-end' : 'flex-start'};">
                            ${!isSelf ? `
                                <div class="wechat-voice-wave" style="color:#444;"><div class="wechat-voice-bar"></div><div class="wechat-voice-bar"></div><div class="wechat-voice-bar"></div></div>
                                <span style="font-size:13px;font-weight:600;margin-left:4px;">${seconds}"</span>
                            ` : `
                                <span style="font-size:13px;font-weight:600;margin-right:4px;">${seconds}"</span>
                                <div class="wechat-voice-wave" style="color:#222;transform:scaleX(-1);"><div class="wechat-voice-bar"></div><div class="wechat-voice-bar"></div><div class="wechat-voice-bar"></div></div>
                            `}
                        </div>
                        <div id="voiceDescBox_${msg._id}" style="display:none;margin-top:5px;background:#ffffff;border:0.5px solid #e0e0e0;border-radius:6px;padding:7px 10px;font-size:12px;color:#333;line-height:1.45;box-shadow:0 1px 3px rgba(0,0,0,0.04);max-width:240px;">
                            ${msg.audioBg ? `<div style="color:#888;font-size:11px;margin-bottom:3px;font-style:italic;">（${escapeHtml(msg.audioBg)}）</div>` : ''}
                            <div><span style="color:#07c160;font-weight:600;">转文字：</span>${escapeHtml(msg.text || '')}</div>
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                </div>`;
            } else if (msg.type === 'image_text_only' || (!msg.imageUrl && (msg.type === 'image' || msg.imageDesc))) {
                const desc = msg.imageDesc || msg.text || '画片描述';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                    <div style="max-width:68%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${!isSelf ? `
                            <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
                                ${isAdmin ? `<span style="font-size:9px;background:#07c160;color:#fff;padding:0 3px;border-radius:3px;font-weight:600;">管</span>` : ''}
                                ${title ? `<span style="font-size:9px;background:#eef7ee;color:#07c160;padding:0 4px;border-radius:3px;font-weight:500;">${escapeHtml(title)}</span>` : ''}
                                <span style="font-size:11px;color:#888;">${escapeHtml(senderName)}</span>
                            </div>
                        ` : ''}
                        ${quoteHtml}
                        <div class="wechat-desc-card">
                            <div style="font-size:10.5px;color:#07c160;font-weight:600;margin-bottom:3px;">📷 配图画面描述</div>
                            <div style="font-size:13px;color:#2c3e50;line-height:1.45;word-break:break-word;">${escapeHtml(desc)}</div>
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                </div>`;
            } else if (msg.type === 'sticker' || msg.stickerUrl) {
                const sUrl = msg.stickerUrl || 'assets/icons/chat.png';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                    <div style="max-width:68%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${!isSelf ? `
                            <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
                                ${isAdmin ? `<span style="font-size:9px;background:#07c160;color:#fff;padding:0 3px;border-radius:3px;font-weight:600;">管</span>` : ''}
                                ${title ? `<span style="font-size:9px;background:#eef7ee;color:#07c160;padding:0 4px;border-radius:3px;font-weight:500;">${escapeHtml(title)}</span>` : ''}
                                <span style="font-size:11px;color:#888;">${escapeHtml(senderName)}</span>
                            </div>
                        ` : ''}
                        ${quoteHtml}
                        <img src="${escapeHtml(sUrl)}" alt="${escapeHtml(msg.stickerDesc || '表情')}" style="width:100px;height:100px;object-fit:contain;border-radius:6px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                </div>`;
            } else {
                let text = isSelf ? escapeHtml(msg.text || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(msg.text || '') : escapeHtml(msg.text || ''));
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${!isSelf ? `
                            <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
                                ${isAdmin ? `<span style="font-size:9px;background:#07c160;color:#fff;padding:0 3px;border-radius:3px;font-weight:600;">管</span>` : ''}
                                ${title ? `<span style="font-size:9px;background:#eef7ee;color:#07c160;padding:0 4px;border-radius:3px;font-weight:500;">${escapeHtml(title)}</span>` : ''}
                                <span style="font-size:11px;color:#888;">${escapeHtml(senderName)}</span>
                            </div>
                        ` : ''}
                        ${quoteHtml}
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? '#95ec69' : '#ffffff'};color:#111;padding:8px 12px;border-radius:5px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:14.5px;line-height:1.5;word-break:break-word;">
                            ${text}
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                </div>`;
            }
        }

        const stickerDrawerHtml = window._stickerDrawerOpen ? window.buildChatStickerDrawerHTML('group', gid) : '';
        const plusDrawerHtml = window._plusDrawerOpen ? window.buildChatPlusDrawerHTML('group', gid) : '';

        let quotePreviewHtml = '';
        if (window._activeQuoteMessage) {
            quotePreviewHtml = `
            <div class="wechat-quote-bar">
                <div style="overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding-right:8px;">
                    引用 <b>${escapeHtml(window._activeQuoteMessage.author || '群友')}</b>: ${escapeHtml(window._activeQuoteMessage.text || '')}
                </div>
                <button type="button" onclick="window.cancelMessageQuote('group','${gid}')" style="border:none;background:none;color:#999;font-size:14px;cursor:pointer;padding:0 4px;">✕</button>
            </div>`;
        }

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
                    <span style="background:#e0e0e0;color:#666;font-size:10px;padding:1px 5px;border-radius:3px;margin-left:4px;font-weight:normal;white-space:nowrap;">
                        ${tokenDisplay}t
                    </span>
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
                    <!-- ⚡ 闪电推进群聊流转 -->
                    <button id="btnGroupLightningTrigger" onclick="window.triggerGroupAIReply('${gid}')" style="border:none;background:#07c160;color:#fff;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="推动群聊推进">
                        ${isGenerating ? `<div class="wechat-spin-ring"></div>` : `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`}
                    </button>
                    <!-- 微信原生三个点（···） -->
                    <button onclick="window.openGroupSettingsModal('${gid}')" style="border:none;background:none;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;" title="群资料与设置">
                        <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:#181818;stroke-width:2.2;stroke-linecap:round;"><circle cx="5" cy="12" r="1.2" fill="#181818"/><circle cx="12" cy="12" r="1.2" fill="#181818"/><circle cx="19" cy="12" r="1.2" fill="#181818"/></svg>
                    </button>
                </div>
            </div>

            <div id="groupChatMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">群聊开启啦，向大家打个招呼或点击右上角⚡推动聊天吧！</div>'}
            </div>

            ${quotePreviewHtml}
            ${stickerDrawerHtml}
            ${plusDrawerHtml}

            <!-- 微信标准输入栏 -->
            <div style="padding:8px 10px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;gap:7px;align-items:center;flex-shrink:0;">
                <button onclick="window.openVoiceInputModal('group','${gid}')" title="发送语音" style="border:none;background:none;width:28px;height:28px;cursor:pointer;flex-shrink:0;padding:0;display:flex;align-items:center;justify-content:center;color:#555;">
                    <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </button>

                <!-- 🌟 新增：未来扩展功能槽位（转账/红包） -->
                <button onclick="window.onGroupFeaturePlaceholderClick()" title="群互动功能" style="border:none;background:none;width:28px;height:28px;cursor:pointer;flex-shrink:0;padding:0;display:flex;align-items:center;justify-content:center;color:#e11d48;">
                    <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;">
                        <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                        <line x1="2" y1="10" x2="22" y2="10"></line>
                        <circle cx="12" cy="15" r="1.5" fill="currentColor"></circle>
                    </svg>
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
        if (msgArea && !renderOpts.keepScroll) {
            setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 50);
        }

        container.querySelectorAll('.chat-msg-row[data-msgid]').forEach(row => {
            const mid = row.dataset.msgid;
            if (!mid) return;
            if (typeof bindLongPressEvent === 'function') {
                bindLongPressEvent(row, null, () => {
                    window.openBubbleActionSheet(mid, 'group', gid);
                });
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

    // 🌟 新增：未来扩展功能点击提示
    window.onGroupFeaturePlaceholderClick = function() {
        if (typeof showToast === 'function') {
            showToast('转账、发红包等趣味交互正在紧密筹备中，敬请期待！', 'info', 2200);
        }
    };

    /**
     * 👥 群聊 AI 回复推进核心（支持统一调度 vs 单独调度，严格按发言人数抽取多角色）
     */
    window.triggerGroupAIReply = async function(gid) {
        const group = window.G.groups && window.G.groups[gid];
        if (!group) return;
        const members = (group.members || []).map(mid => window.G.npcs[mid]).filter(Boolean);
        if (members.length === 0) {
            if (typeof showToast === 'function') showToast('群内没有其他成员', 'info');
            return;
        }

        if (window._MCYT_CHAT_GENERATING && window._MCYT_CHAT_GENERATING[gid]) {
            if (typeof showToast === 'function') showToast('群友正在热烈聊天中...', 'info', 1000);
            return;
        }

        if (!window._MCYT_CHAT_GENERATING) window._MCYT_CHAT_GENERATING = {};
        window._MCYT_CHAT_GENERATING[gid] = true;
        if (window.G.currentChatGroup === gid) renderGroupChatWindow();

        let bannerTimer = setTimeout(() => {
            if (window._MCYT_CHAT_GENERATING && window._MCYT_CHAT_GENERATING[gid]) {
                window.showGeneratingBanner(group.name);
            }
        }, 2500);

        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: '我' };
        const cfg = (window.ChatGroupSettings && typeof window.ChatGroupSettings.getGroupConfig === 'function')
            ? window.ChatGroupSettings.getGroupConfig(gid)
            : { apiMode: 'unified', allowMultiMsgs: true, minSpeakers: 1, maxSpeakers: 3 };

        const history = (window.G.groupChatHistory && window.G.groupChatHistory[gid]) || [];
        const recentDialogue = history.slice(-10).map(m => `${m.senderName || '群友'}: ${m.text || ''}`).join('\n');

        try {
            const minSpk = Math.max(1, cfg.minSpeakers || 1);
            const maxSpk = Math.max(minSpk, Math.min(members.length, cfg.maxSpeakers || 3));
            // 随机抽取本次发言人数
            const targetCount = Math.floor(Math.random() * (maxSpk - minSpk + 1)) + minSpk;
            const shuffledMembers = [...members].sort(() => Math.random() - 0.5).slice(0, targetCount);

            if (cfg.apiMode === 'individual') {
                // 🌟 模式一：单独调用模式（按抽取的角色逐个调用独立 API）
                let rollingDialogue = recentDialogue;

                for (const member of shuffledMembers) {
                    const otherMembers = members.filter(m => m.id !== member.id);
                    const promptBundle = window.ChatPromptGroup.buildGroupSingleMemberPrompt({
                        group,
                        currentMember: member,
                        otherMembers,
                        recentDialogueText: rollingDialogue,
                        currentUserName: curAcc.name,
                        allowMultiMsgs: cfg.allowMultiMsgs,
                        groupConfig: cfg
                    });

                    const raw = await callAI([
                        { role: 'system', content: promptBundle.sysPrompt },
                        { role: 'user', content: promptBundle.userPrompt }
                    ], { maxTokens: 450, temperature: 0.88, silent: true });

                    let clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();

                    // 解析 [MSG]
                    const msgRegex = /\[MSG\]([\s\S]*?)\[\/MSG\]/gi;
                    let mMatch;
                    let foundAny = false;

                    while ((mMatch = msgRegex.exec(clean)) !== null) {
                        const txt = mMatch[1].trim();
                        if (txt) {
                            foundAny = true;
                            const newMsg = {
                                _id: 'gmsg_' + Date.now() + '_' + Math.floor(Math.random() * 899 + 100),
                                from: 'npc',
                                senderId: member.id,
                                senderName: member.name,
                                text: txt,
                                time: new Date().toLocaleTimeString().slice(0, 5)
                            };
                            window.G.groupChatHistory[gid].push(newMsg);
                            rollingDialogue += `\n${member.name}: ${txt}`;
                        }
                    }

                    if (!foundAny && clean) {
                        const pureTxt = clean.replace(/\[\/?MSG.*?\]/gi, '').trim();
                        if (pureTxt) {
                            window.G.groupChatHistory[gid].push({
                                _id: 'gmsg_' + Date.now() + '_' + Math.floor(Math.random() * 899 + 100),
                                from: 'npc',
                                senderId: member.id,
                                senderName: member.name,
                                text: pureTxt,
                                time: new Date().toLocaleTimeString().slice(0, 5)
                            });
                            rollingDialogue += `\n${member.name}: ${pureTxt}`;
                        }
                    }
                }
            } else {
                // 🌟 模式二：统一调用模式（单次 API 生成多角色发言）
                const promptBundle = window.ChatPromptGroup.buildGroupUnifiedPrompt({
                    group,
                    members: shuffledMembers.length > 0 ? shuffledMembers : members,
                    recentDialogueText: recentDialogue,
                    currentUserName: curAcc.name,
                    groupConfig: cfg
                });

                const raw = await callAI([
                    { role: 'system', content: promptBundle.sysPrompt },
                    { role: 'user', content: promptBundle.userPrompt }
                ], { maxTokens: 600, temperature: 0.86, silent: true });

                let clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();

                const msgRegex = /\[MSG sender="([^"]+)"\]([\s\S]*?)\[\/MSG\]/gi;
                let match;
                let found = false;

                while ((match = msgRegex.exec(clean)) !== null) {
                    found = true;
                    const senderName = match[1].trim();
                    const text = match[2].trim();
                    if (text) {
                        const matchedNpc = members.find(m => m.name === senderName) || shuffledMembers[0] || members[0];
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
                    const fallbackNpc = shuffledMembers[0] || members[Math.floor(Math.random() * members.length)];
                    window.G.groupChatHistory[gid].push({
                        _id: 'gmsg_' + Date.now() + '_' + Math.floor(Math.random() * 899 + 100),
                        from: 'npc',
                        senderId: fallbackNpc.id,
                        senderName: fallbackNpc.name,
                        text: clean.replace(/\[\/?MSG.*?\]/gi, '').trim(),
                        time: new Date().toLocaleTimeString().slice(0, 5)
                    });
                }
            }

            // 双轨存档与持久化保障
            window.syncGroupChatsToLocalBackup();
            if (typeof autoSaveGame === 'function') autoSaveGame();
            if (window.G.currentChatGroup === gid) renderGroupChatWindow();

        } catch (e) {
            console.error('群聊推进失败:', e);
            if (typeof showToast === 'function') showToast('群友接话失败，请检查网络或API', 'error');
        } finally {
            clearTimeout(bannerTimer);
            if (window._MCYT_CHAT_GENERATING) delete window._MCYT_CHAT_GENERATING[gid];
            if (typeof window.hideGeneratingBanner === 'function') window.hideGeneratingBanner();
            if (window.G.currentChatGroup === gid) renderGroupChatWindow();
        }
    };

    /**
     * 发送群消息
     */
    window.doSendGroupChat = function(gid) {
        const input = document.getElementById('groupChatInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: '我' };

        const quote = window._activeQuoteMessage ? Object.assign({}, window._activeQuoteMessage) : null;
        window._activeQuoteMessage = null;

        if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
        if (!window.G.groupChatHistory[gid]) window.G.groupChatHistory[gid] = [];

        window.G.groupChatHistory[gid].push({
            _id: 'gmsg_' + Date.now() + '_' + (Math.floor(Math.random() * 899) + 100),
            from: 'player',
            senderName: curAcc.name,
            text,
            time: new Date().toLocaleTimeString().slice(0, 5),
            timestamp: Date.now(),
            quote
        });

        window.syncGroupChatsToLocalBackup();
        input.value = '';
        renderGroupChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.openEditGroupNameModal = function(gid) {
        const group = window.G.groups && window.G.groups[gid];
        if (!group) return;
        document.querySelector('.wechat-clean-modal-mask')?.remove();
        window.openWechatCleanModal('修改群聊名称', `
            <input type="text" id="wcleanGroupNameInput" value="${escapeHtml(group.name)}" class="wechat-clean-input">
        `, () => {
            const val = document.getElementById('wcleanGroupNameInput').value.trim();
            if (!val) return false;
            group.name = val;
            window.syncGroupChatsToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            window.openGroupSettingsModal(gid);
            if (window.G.currentChatGroup === gid) renderGroupChatWindow();
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
                    <button type="button" class="wechat-clean-btn-cancel" onclick="this.closest('.wechat-clean-modal-mask')?.remove()">取消</button>
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

            window.syncGroupChatsToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            if (typeof showToast === 'function') showToast('群聊已解散', 'info', 1200);
            window.renderChatApp();
        };
    };

    window.renderGroupChatWindow = renderGroupChatWindow;
    window.openGroupChat = function(gid) {
        if (!window.G.groups || !window.G.groups[gid]) return;
        window.G.currentChatGroup = gid;
        window._stickerDrawerOpen = false;
        window._plusDrawerOpen = false;
        window._activeQuoteMessage = null;
        window.renderChatApp();
    };

    window.closeGroupChat = function() {
        window.G.currentChatGroup = null;
        window._stickerDrawerOpen = false;
        window._plusDrawerOpen = false;
        window._activeQuoteMessage = null;
        window.renderChatApp();
    };

    console.log('✅ ChatGroup 多人群聊独立模块已成功升级');
})();
