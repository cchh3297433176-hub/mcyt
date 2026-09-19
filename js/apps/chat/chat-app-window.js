/**
 * js/apps/chat/chat-app-window.js
 * 💬 微信主应用 · 拆分分片 3/7：单人私聊窗口渲染（renderSingleChatWindow，含消息折叠、防卡顿优化与智能重说切换）、
 *    重新生成回复的确认与执行（confirmRetryLastAIReply / doRetryLastAIReply）。
 * ⚠️ 拆分自 chat-app.js，仅做物理搬家；window.renderSingleChatWindow 的导出位置从原文件末尾就地前移到函数定义处。
 */

(function() {
    'use strict';

    // 🌐 打开网页外链安全跳转
    window.openWebPageLink = function(url) {
        if (!url || url === '#' || !url.startsWith('http')) {
            if (typeof showToast === 'function') showToast('无法打开非 HTTP 网页链接', 'info', 1500);
            return;
        }
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (_) {
            window.location.href = url;
        }
    };

    // ============================================================
    // 💬 单人私聊窗口渲染（带消息折叠、防卡顿优化与智能重说切换）
    // ============================================================
    window.renderSingleChatWindow = function renderSingleChatWindow(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        // 吸收可能存在的待处理塔罗分享
        if (window.ChatTarot && typeof window.ChatTarot.drainPendingTarotShares === 'function') {
            window.ChatTarot.drainPendingTarotShares();
        }

        const legacyWrap = document.querySelector('#socialTab .phone-app-wrap');
        if (legacyWrap) legacyWrap.remove();

        const npcId = window.G.currentChatNpc;
        const npc = window.G.npcs[npcId];
        if (!npc) { window.closeChat(); return; }

        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', region: '中国' };
        const isBlocked = window.isAccountBlockedByNpc(npcId, curAcc.id);
        const chatHist = window.getAccountChatHistory(npcId, curAcc.id);
        const isBehindActive = !!window.G._behindScreenActive[npcId];

        const tokensCount = window.calculateHistoryTokens(chatHist);
        const tokenDisplay = window.formatTokenString(tokensCount);
        const isGenerating = !!window._MCYT_CHAT_GENERATING[npcId];

        const topHeaderTitle = (npc.remark && npc.remark.trim()) ? `${npc.remark.trim()} (${npc.name})` : (npc.name || npc.id);

        let lastDialogueMsg = null;
        for (let i = chatHist.length - 1; i >= 0; i--) {
            const m = chatHist[i];
            if (m.from === 'player' || m.from === 'npc') {
                lastDialogueMsg = m;
                break;
            }
        }
        const canRedo = !!(lastDialogueMsg && lastDialogueMsg.from === 'npc');

        const collapseCfg = getChatCollapseConfig();
        const chatKey = `single_${npcId}_${curAcc.id}`;
        const isExpanded = !!window._chatExpandAllMap[chatKey];

        let visibleMessages = chatHist;
        let collapseBannerHtml = '';

        if (collapseCfg.enabled && chatHist.length > collapseCfg.limit && !isExpanded) {
            const hiddenCount = chatHist.length - collapseCfg.limit;
            visibleMessages = chatHist.slice(-collapseCfg.limit);
            collapseBannerHtml = `
                <div style="text-align:center;margin:10px 0 16px;">
                    <span onclick="window.toggleChatHistoryExpand('${chatKey}')" style="display:inline-flex;align-items:center;gap:4px;background:#e5e5e5;color:#555;padding:4px 12px;border-radius:12px;font-size:11px;cursor:pointer;user-select:none;">
                        <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:currentColor;"><path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/></svg>
                        已折叠早前 ${hiddenCount} 条消息，点击展开
                    </span>
                </div>
            `;
        } else if (collapseCfg.enabled && chatHist.length > collapseCfg.limit && isExpanded) {
            collapseBannerHtml = `
                <div style="text-align:center;margin:8px 0 14px;">
                    <span onclick="window.toggleChatHistoryExpand('${chatKey}')" style="display:inline-flex;align-items:center;gap:4px;background:#e5e5e5;color:#888;padding:3px 10px;border-radius:12px;font-size:10.5px;cursor:pointer;user-select:none;">
                        收起早期历史消息
                    </span>
                </div>
            `;
        }

        let messagesHtml = collapseBannerHtml;
        for (const msg of visibleMessages) {
            const isSelf = (msg.from === 'player');

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
            } else if (msg.type === 'moment_notice') {
                messagesHtml += `
                <div style="text-align:center;margin:10px 0;">
                    <div class="wechat-sys-notice-pill" onclick="window.openMomentArtCardPreview(${msg.momentId})">
                        <span>${escapeHtml(msg.author || '对方')} 发表了一条朋友圈动态</span>
                        <span class="link">查看 ›</span>
                    </div>
                </div>`;
            } else if (msg.type === 'shared_tarot') {
                // 🔮 塔罗牌阵卡片（委托给独立模块 ChatTarot 渲染）
                const tarotCardHtml = (window.ChatTarot && typeof window.ChatTarot.renderSharedTarotCardHTML === 'function')
                    ? window.ChatTarot.renderSharedTarotCardHTML(msg, npcId, false)
                    : `<div style="background:#fff;padding:8px 12px;border-radius:6px;font-size:12px;color:#666;">[塔罗牌阵: ${escapeHtml(msg.sharedTarot?.spreadName || '占卜')}]</div>`;

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:76%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        ${tarotCardHtml}
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else if (msg.type === 'web_page') {
                // 🌐 纯正微信质感网页链接卡片（白灰微绿设计风格）
                const wp = msg.webPage || {};
                const pageUrl = wp.url || '#';
                const pageTitle = wp.title || '权威检索结果';
                const pageSnippet = wp.snippet || '';
                const pageSource = wp.source || '全网检索';

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:76%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <div class="wechat-web-card" onclick="window.openWebPageLink('${escapeHtml(pageUrl)}')" style="background:#ffffff;border:0.5px solid #e2e8f0;border-radius:8px;padding:10px 12px;box-shadow:0 1px 4px rgba(0,0,0,0.06);cursor:pointer;width:240px;box-sizing:border-box;">
                            <div style="font-size:13.5px;font-weight:600;color:#181818;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;margin-bottom:5px;">
                                ${escapeHtml(pageTitle)}
                            </div>
                            ${pageSnippet ? `
                            <div style="font-size:11.5px;color:#666;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;margin-bottom:8px;">
                                ${escapeHtml(pageSnippet)}
                            </div>` : ''}
                            <div style="display:flex;align-items:center;justify-content:space-between;border-top:0.5px solid #f0f0f0;padding-top:6px;font-size:11px;color:#888;">
                                <div style="display:flex;align-items:center;gap:4px;min-width:0;flex:1;">
                                    <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:#07c160;stroke-width:2;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(pageSource)}</span>
                                </div>
                                <span style="color:#07c160;font-weight:600;margin-left:8px;flex-shrink:0;">打开 ›</span>
                            </div>
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else if (msg.type === 'contact_card') {
                const card = msg.contactCard || {};
                const sigShow = card.signature ? `<div style="font-size:11px;color:#07c160;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">“${escapeHtml(card.signature)}”</div>` : '';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <div class="wechat-contact-card" onclick="if(typeof window.openContactCardDetailModal==='function')window.openContactCardDetailModal('${escapeHtml(card.id || '')}', '${escapeHtml(card.name || '')}', '${escapeHtml(card.persona || '')}', '${escapeHtml(card.avatar || '')}', '${escapeHtml(card.signature || '')}')">
                            <div style="font-size:11px;color:#888;margin-bottom:6px;border-bottom:0.5px solid #f0f0f0;padding-bottom:4px;">个人名片</div>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="width:42px;height:42px;border-radius:6px;overflow:hidden;background:#eee;flex-shrink:0;">
                                    <img src="${card.avatar || 'assets/icons/chat.png'}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='assets/icons/chat.png';">
                                </div>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:14px;font-weight:600;color:#181818;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(card.name || '好友')}</div>
                                    ${sigShow}
                                    <div style="font-size:11.5px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${escapeHtml(card.persona || 'MC同伴')}</div>
                                </div>
                            </div>
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else if (msg.type === 'shared_moment') {
                const moment = msg.sharedMoment || {};
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <div class="wechat-share-moment-card" onclick="window.openMomentArtCardPreview(${moment.id})">
                            <div style="font-size:11px;color:#888;margin-bottom:5px;display:flex;justify-content:space-between;">
                                <span>朋友圈分享</span>
                                <span style="color:#07c160;">查看详情 ›</span>
                            </div>
                            <div style="display:flex;gap:8px;align-items:center;">
                                <div style="width:38px;height:38px;border-radius:4px;overflow:hidden;background:#eee;flex-shrink:0;">
                                    <img src="${moment.avatar || 'assets/icons/chat.png'}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='assets/icons/chat.png';">
                                </div>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:12px;font-weight:600;color:#576b95;">${escapeHtml(moment.author || '好友')}</div>
                                    <div style="font-size:12.5px;color:#222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;">${escapeHtml(moment.body || '')}</div>
                                </div>
                            </div>
                            ${moment.imageDesc ? `<div style="font-size:11px;color:#666;margin-top:5px;background:#f9f9f9;padding:3px 6px;border-radius:3px;">[快照] ${escapeHtml(moment.imageDesc)}</div>` : ''}
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else if (msg.from === 'behind_screen') {
                messagesHtml += `
                <div style="margin:8px 12px;background:#ffffff;border:1px dashed #dcdcdc;padding:8px 12px;border-radius:6px;font-size:12px;color:#555;line-height:1.5;">
                    <span style="font-weight:600;color:#181818;">动作感知：</span>${escapeHtml(msg.text || '')}
                </div>`;
            } else if (msg.type === 'voice') {
                const seconds = Math.min(60, Math.max(1, parseInt(msg.seconds) || 3));
                const bubbleWidth = Math.min(220, 68 + seconds * 4.5);

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <div class="wechat-voice-bubble" onclick="window.toggleVoiceMessageDetailsDirect('${msg._id}')" style="width:${bubbleWidth}px;background:${isSelf ? '#95ec69' : '#ffffff'};color:${isSelf ? '#111' : '#222'};justify-content:${isSelf ? 'flex-end' : 'flex-start'};">
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

                        <div id="voiceDescBox_${msg._id}" style="display:none;margin-top:5px;background:#ffffff;border:0.5px solid #e0e0e0;border-radius:6px;padding:7px 10px;font-size:12px;color:#333;line-height:1.45;box-shadow:0 1px 3px rgba(0,0,0,0.04);max-width:240px;">
                            ${msg.audioBg ? `<div style="color:#888;font-size:11px;margin-bottom:3px;font-style:italic;">（${escapeHtml(msg.audioBg)}）</div>` : ''}
                            <div><span style="color:#07c160;font-weight:600;">转文字：</span>${escapeHtml(msg.text || '')}</div>
                        </div>

                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else if (msg.type === 'image_flip' || (isSelf && msg.imageDesc && !msg.imageUrl)) {
                const desc = msg.imageDesc || msg.text || '画片内容';
                const frontImg = msg.imageUrl || 'assets/icons/chat.png';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:72%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <div id="flipCard_${msg._id}" class="wechat-flip-card" onclick="window.toggleCardFlipDirect('${msg._id}')" style="perspective:1000px;cursor:pointer;">
                            <div class="flip-inner" style="width:190px;height:120px;position:relative;transition:transform 0.4s;transform-style:preserve-3d;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                                <div class="flip-front" style="position:absolute;inset:0;backface-visibility:hidden;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                                    <img src="${frontImg}" style="width:46px;height:46px;object-fit:contain;margin-bottom:6px;opacity:0.85;">
                                    <div style="font-size:11px;color:#07c160;font-weight:600;">[拍立得卡片 · 点击翻转]</div>
                                </div>
                                <div class="flip-back" style="position:absolute;inset:0;backface-visibility:hidden;background:linear-gradient(135deg, #1e293b, #334155);color:#fff;border-radius:8px;padding:12px;display:flex;align-items:center;justify-content:center;transform:rotateY(180deg);font-size:12.5px;line-height:1.45;text-align:center;">
                                    “${escapeHtml(desc)}”
                                </div>
                            </div>
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else if (!isSelf && (msg.type === 'image_text_only' || msg.imageDesc)) {
                const desc = msg.imageDesc || msg.text || '照片内容';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:flex-start;margin-bottom:12px;align-items:flex-start;">
                    <div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(npc, 38)}</div>
                    <div style="max-width:72%;display:flex;flex-direction:column;align-items:flex-start;">
                        ${quoteHtml}
                        <div style="background:#ffffff;border:1px solid #e2e8f0;border-left:3px solid #07c160;border-radius:6px;padding:8px 12px;box-shadow:0 1px 3px rgba(0,0,0,0.04);max-width:210px;">
                            <div style="font-size:10.5px;color:#07c160;font-weight:600;margin-bottom:3px;">📷 对方发送了一张照片</div>
                            <div style="font-size:13px;color:#2c3e50;line-height:1.45;word-break:break-word;">“${escapeHtml(desc)}”</div>
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                </div>`;
            } else if (msg.type === 'image' || msg.imageUrl) {
                const imgSrc = msg.imageUrl || msg.url || 'assets/icons/chat.png';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:65%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <div style="background:#fff;padding:3px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.06);cursor:pointer;" onclick="window.openMomentImagePreview('${imgSrc}', '${escapeHtml(msg.imageDesc || '')}')">
                            <img src="${imgSrc}" style="max-width:180px;max-height:220px;border-radius:4px;object-fit:cover;display:block;" />
                        </div>
                        ${msg.imageDesc ? `<div style="font-size:11px;color:#888;margin-top:2px;background:#f9f9f9;padding:2px 6px;border-radius:3px;">描绘: ${escapeHtml(msg.imageDesc)}</div>` : ''}
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else if (msg.type === 'sticker' || msg.stickerUrl) {
                const sUrl = msg.stickerUrl || 'assets/icons/chat.png';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:56%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <img class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" src="${escapeHtml(sUrl)}" alt="${escapeHtml(msg.stickerDesc || '表情')}" style="width:100px;height:100px;object-fit:contain;border-radius:6px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.05);cursor:pointer;">
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            } else {
                const hasOriginal = !!msg.originalText;
                const displayMainText = hasOriginal ? msg.originalText : msg.text;
                let bubbleBody = isSelf ? escapeHtml(displayMainText || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(displayMainText || '') : escapeHtml(displayMainText || ''));

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? '#95ec69' : '#ffffff'};color:#111;padding:8px 12px;border-radius:5px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:14.5px;line-height:1.5;word-break:break-word;cursor:pointer;">
                            <div>${bubbleBody}</div>

                            ${hasOriginal ? `
                            <div id="transBox_${msg._id}" style="display:none;margin-top:6px;padding-top:6px;border-top:0.5px dashed #d5d5d5;font-size:13px;color:#222;line-height:1.45;">
                                <div style="font-size:10px;color:#999;margin-bottom:2px;display:flex;align-items:center;gap:3px;">
                                    <svg viewBox="0 0 24 24" style="width:10px;height:10px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M5 8l6 6M11 8L5 14M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/></svg>
                                    <span>微信翻译</span>
                                </div>
                                <div>${escapeHtml(msg.text || '')}</div>
                            </div>
                            ` : ''}
                        </div>

                        <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
                            ${hasOriginal ? `
                            <span id="transBtn_${msg._id}" onclick="window.toggleMessageTranslationDirect(this, '${msg._id}')" style="font-size:10.5px;color:#07c160;cursor:pointer;user-select:none;">
                                翻译
                            </span>
                            ` : ''}
                            <span style="font-size:10px;color:#bbb;">${msg.time || ''}</span>
                        </div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            }
        }

        const stickerDrawerHtml = window._stickerDrawerOpen ? window.buildChatStickerDrawerHTML('single', npcId) : '';
        const plusDrawerHtml = window._plusDrawerOpen ? window.buildChatPlusDrawerHTML('single', npcId) : '';

        let quotePreviewHtml = '';
        if (window._activeQuoteMessage) {
            quotePreviewHtml = `
            <div class="wechat-quote-bar">
                <div style="overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding-right:8px;">
                    引用 <b>${escapeHtml(window._activeQuoteMessage.author || '好友')}</b>: ${escapeHtml(window._activeQuoteMessage.text || '')}
                </div>
                <button type="button" onclick="window.cancelMessageQuote('single','${npcId}')" style="border:none;background:none;color:#999;font-size:14px;cursor:pointer;padding:0 4px;">✕</button>
            </div>`;
        }

        let triggerBtnHtml = '';
        if (isGenerating) {
            triggerBtnHtml = `
            <button id="btnChatLightningTrigger" style="border:none;background:#07c160;color:#fff;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="正在输入...">
                <div class="wechat-spin-ring"></div>
            </button>`;
        } else if (canRedo) {
            triggerBtnHtml = `
            <button id="btnChatLightningTrigger" onclick="window.confirmRetryLastAIReply('${npcId}')" style="border:none;background:#07c160;color:#fff;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="重新生成回复">
                <svg viewBox="0 0 24 24" style="width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round;">
                    <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                </svg>
            </button>`;
        } else {
            triggerBtnHtml = `
            <button id="btnChatLightningTrigger" onclick="window.triggerAIReplyForSingle('${npcId}')" style="border:none;background:#07c160;color:#fff;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="生成回复">
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </button>`;
        }

        const html = `
        <div style="background:#ededed;display:flex;flex-direction:column;height:100%;min-height:100%;overflow:hidden;font-family:-apple-system,sans-serif;">
            <div class="wechat-top-header">
                <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
                    <button onclick="window.closeChat()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:2px;font-weight:500;">
                        <span>‹</span> <span>微信</span>
                    </button>
                    <div onclick="if(typeof window.openNpcProfileCardModal==='function')window.openNpcProfileCardModal('${npcId}')" style="cursor:pointer;font-weight:600;font-size:15px;color:#181818;margin-left:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${escapeHtml(topHeaderTitle)}
                    </div>
                    <span style="background:#e0e0e0;color:#666;font-size:10px;padding:1px 5px;border-radius:3px;margin-left:4px;font-weight:normal;white-space:nowrap;">
                        ${tokenDisplay}t
                    </span>
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                    <button onclick="window.toggleBehindScreen('${npcId}')" style="border:0.5px solid ${isBehindActive ? '#07c160' : '#ccc'};background:${isBehindActive ? '#d4f5dd' : '#fff'};color:${isBehindActive ? '#07c160' : '#555'};width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="动作感知">
                        <svg viewBox="0 0 24 24" style="width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    ${triggerBtnHtml}
                </div>
            </div>

            ${isBlocked ? `
            <div style="background:#fff2f0;color:#fa5151;padding:6px 12px;font-size:11.5px;border-bottom:0.5px solid #ffccc7;flex-shrink:0;">
                <span>⚠️ 当前账号消息已被对方拒收</span>
            </div>` : ''}

            <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">打个招呼开启畅聊吧！</div>'}
            </div>

            ${quotePreviewHtml}
            ${stickerDrawerHtml}
            ${plusDrawerHtml}

            <!-- 微信标准输入栏 -->
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

        container.querySelectorAll('.chat-msg-row[data-msgid]').forEach(row => {
            const mid = row.dataset.msgid;
            if (!mid) return;
            if (typeof bindLongPressEvent === 'function') {
                bindLongPressEvent(row, null, () => {
                    window.openBubbleActionSheet(mid, 'single', npcId);
                });
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

    // 重新生成回复确认弹窗
    window.confirmRetryLastAIReply = function(npcId) {
        if (window._MCYT_CHAT_GENERATING[npcId]) {
            if (typeof showToast === 'function') showToast('对方正在回复中，请稍候', 'info', 1000);
            return;
        }

        if (typeof window.openWechatCleanModal === 'function') {
            window.openWechatCleanModal('重新生成', `
                <div style="text-align:center;padding:10px 0;font-size:13.5px;color:#333;">
                    确定要让对方重新生成上一条回复吗？
                </div>
            `, () => {
                window.doRetryLastAIReply(npcId);
            });
        }
    };

    // 执行回溯并重新生成回复
    window.doRetryLastAIReply = function(npcId) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        const hist = window.getAccountChatHistory(npcId, curAcc.id);

        while (hist.length > 0) {
            const last = hist[hist.length - 1];
            if (last.from === 'player') break;
            hist.pop();
        }

        window.syncChatHistoryToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        renderSingleChatWindow();

        window.triggerAIReplyForSingle(npcId);
    };

})();
