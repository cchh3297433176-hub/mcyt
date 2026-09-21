/**
 * js/apps/chat/chat-group.js
 * 💬 微信多人群聊独立模块（仿QQ上下分层工具栏 · 具体角色输入提示 · 多角色2~5条交错发言 · 群斗图与配图 · 朋友圈轻量NPC生态协同）
 * 🌟 存储架构升级（Phase 1 & 2）：
 * 1. 群聊历史对白（mcyt_wechat_group_histories）全面接入 IndexedDB！
 * 2. 群基础信息字典（mcyt_wechat_group_chats）全面接入 IndexedDB！
 * 均具备旧版 localStorage 自动无损迁移与防绞杀指针就地保活机制。
 */

(function() {
    'use strict';

    const GROUPS_STORAGE_KEY = 'mcyt_wechat_group_chats';
    const GROUP_HISTORY_STORAGE_KEY = 'mcyt_wechat_group_histories';

    // 🛡️ 辅助：localforage 统一获取器
    function getStorageDriver() {
        if (typeof window.localforage !== 'undefined') {
            return window.localforage;
        }
        return null;
    }

    // 🛡️ 群聊冷启动自动恢复（群列表与群历史双轨无损迁移至 IndexedDB）
    async function restoreGroupsFromStorage() {
        if (!window.G) window.G = {};
        if (!window.G.groups) window.G.groups = {};
        if (!window.G.groupChatHistory) window.G.groupChatHistory = {};

        const storage = getStorageDriver();

        // 1. 群列表基础字典：优先 IndexedDB，无感迁移旧版 localStorage
        let loadedGroups = null;
        if (storage) {
            try {
                loadedGroups = await storage.getItem(GROUPS_STORAGE_KEY);
            } catch (err) {
                console.warn('⚠️ 从 IndexedDB 读取群聊列表失败:', err);
            }
        }
        if (!loadedGroups) {
            try {
                const rawGroups = localStorage.getItem(GROUPS_STORAGE_KEY);
                if (rawGroups) {
                    loadedGroups = JSON.parse(rawGroups);
                    if (loadedGroups && storage) {
                        storage.setItem(GROUPS_STORAGE_KEY, loadedGroups).catch(e => {
                            console.warn('⚠️ 自动迁移群列表至 IndexedDB 失败:', e);
                        });
                    }
                }
            } catch (e) {
                console.warn('⚠️ 读取群聊列表 localStorage 缓存失败:', e);
            }
        }
        if (loadedGroups && typeof loadedGroups === 'object') {
            window.G.groups = Object.assign({}, loadedGroups, window.G.groups);
        }

        // 2. 群历史记录：优先 IndexedDB，无感迁移旧版 localStorage
        let loadedHist = null;
        if (storage) {
            try {
                loadedHist = await storage.getItem(GROUP_HISTORY_STORAGE_KEY);
            } catch (err) {
                console.warn('⚠️ 从 IndexedDB 读取群聊历史失败:', err);
            }
        }
        if (!loadedHist) {
            try {
                const rawHist = localStorage.getItem(GROUP_HISTORY_STORAGE_KEY);
                if (rawHist) {
                    loadedHist = JSON.parse(rawHist);
                    if (loadedHist && storage) {
                        storage.setItem(GROUP_HISTORY_STORAGE_KEY, loadedHist).catch(e => {
                            console.warn('⚠️ 自动迁移群历史至 IndexedDB 失败:', e);
                        });
                    }
                }
            } catch (e) {
                console.warn('⚠️ 读取群聊记录 localStorage 缓存失败:', e);
            }
        }
        if (loadedHist && typeof loadedHist === 'object') {
            for (const gid in loadedHist) {
                const storedList = loadedHist[gid];
                if (!Array.isArray(storedList)) continue;
                
                // 🌟 纯净装载：就地赋给运行态，保持绝对权威
                window.G.groupChatHistory[gid] = storedList;
            }
        }
    }
    window.restoreGroupsFromStorage = restoreGroupsFromStorage;

    // 💾 群聊双轨持久化备份（群基础字典与群历史全面接入 IndexedDB 异步原子落盘）
    window.syncGroupChatsToLocalBackup = async function() {
        try {
            if (!window.G) return;
            const storage = getStorageDriver();

            // 1. 群基础字典落盘至 IndexedDB（兜底兼容 localStorage）
            if (window.G.groups && typeof window.G.groups === 'object') {
                if (storage) {
                    await storage.setItem(GROUPS_STORAGE_KEY, window.G.groups);
                } else {
                    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(window.G.groups));
                }
            }

            // 2. 群历史对白落盘至 IndexedDB（兜底兼容 localStorage）
            if (window.G.groupChatHistory && typeof window.G.groupChatHistory === 'object') {
                if (storage) {
                    await storage.setItem(GROUP_HISTORY_STORAGE_KEY, window.G.groupChatHistory);
                } else {
                    localStorage.setItem(GROUP_HISTORY_STORAGE_KEY, JSON.stringify(window.G.groupChatHistory));
                }
            }
        } catch (e) {
            console.warn('⚠️ 同步群聊到本地备份失败:', e);
        }
    };

    // 初始化静默自恢复
    restoreGroupsFromStorage().catch(err => console.warn('初始化群聊恢复异常:', err));

    // 🔍 辅助：安全打开大图/假图片查看器
    window.openGroupImageViewerSafe = function(imgSrc, textDesc) {
        if (typeof window.openChatImageViewer === 'function') {
            window.openChatImageViewer(imgSrc || '', textDesc || '');
            return;
        }

        document.querySelectorAll('.group-image-viewer-mask').forEach(el => el.remove());
        const mask = document.createElement('div');
        mask.className = 'group-image-viewer-mask';
        mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:999999;padding:20px;box-sizing:border-box;animation:wechatFadeIn 0.15s ease-out;';

        let innerContent = '';
        if (imgSrc && imgSrc !== 'assets/icons/chat.png') {
            innerContent = `<img src="${escapeHtml(imgSrc)}" style="max-width:92%;max-height:80vh;border-radius:6px;object-fit:contain;box-shadow:0 8px 30px rgba(0,0,0,0.5);">`;
        } else {
            innerContent = `
                <div style="background:#ffffff;border-radius:12px;padding:24px 20px;max-width:320px;width:100%;box-shadow:0 12px 32px rgba(0,0,0,0.3);position:relative;">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;color:#07c160;font-size:13px;font-weight:600;">
                        <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:#07c160;stroke-width:2;stroke-linecap:round;"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        <span>画面详情预览</span>
                    </div>
                    <div style="font-size:14.5px;color:#222;line-height:1.6;max-height:55vh;overflow-y:auto;word-break:break-word;">
                        ${escapeHtml(textDesc || '')}
                    </div>
                    <div style="text-align:center;font-size:11.5px;color:#999;margin-top:16px;">轻触任意空白区域关闭</div>
                </div>
            `;
        }

        mask.innerHTML = innerContent;
        mask.onclick = () => mask.remove();
        document.body.appendChild(mask);
    };

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
        if (!window.G.groupChatHistory[gid]) window.G.groupChatHistory[gid] = [];
        const history = window.G.groupChatHistory[gid];
        
        const formalCount = (group.members || []).length;
        const momentNpcCount = (group.momentNpcs || []).length;
        const memberCount = formalCount + momentNpcCount + 1;

        const isGenerating = !!(window._MCYT_CHAT_GENERATING && window._MCYT_CHAT_GENERATING[gid]);
        const generatingSpeaker = window._MCYT_GROUP_CURRENT_SPEAKER?.[gid] || '';

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
            let senderNpc = null;
            let avatarObj = null;

            if (isSelf) {
                avatarObj = { isPlayer: true };
            } else {
                if (msg.senderId && window.G.npcs && window.G.npcs[msg.senderId]) {
                    senderNpc = window.G.npcs[msg.senderId];
                    avatarObj = senderNpc;
                } else if (msg.senderId && group.momentNpcs) {
                    const matchedMnpc = group.momentNpcs.find(m => m.id === msg.senderId || m.name === msg.senderName);
                    if (matchedMnpc) {
                        avatarObj = { avatarUrl: matchedMnpc.avatar || matchedMnpc.avatarUrl, name: matchedMnpc.name };
                    }
                }
                if (!avatarObj) {
                    avatarObj = { avatarUrl: msg.senderAvatar || 'assets/icons/chat.png', name: msg.senderName || '群友' };
                }
            }

            const senderName = isSelf ? '我' : (msg.senderName || senderNpc?.name || '群友');
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
                <div style="text-align:center;margin:10px 0;">
                    <span style="display:inline-block;background:rgba(0,0,0,0.06);color:#888888;padding:3px 10px;border-radius:4px;font-size:11.5px;max-width:85%;line-height:1.4;">${escapeHtml(msg.text || '')}</span>
                </div>`;
                continue;
            }

            let textImgDesc = '';
            let rawMsgText = msg.text || '';
            if (msg.type === 'image_text_only' || msg.imageDesc) {
                textImgDesc = msg.imageDesc || msg.text || '';
                textImgDesc = textImgDesc.replace(/^\[图片描述：|\]$/g, '').trim();
            } else if (typeof rawMsgText === 'string') {
                const imgTextTagMatch = rawMsgText.match(/\[IMAGE_TEXT(?::\s*|\s+)?([\s\S]*?)\]([\s\S]*?)(?:\[\/IMAGE_TEXT\]|$)/i);
                if (imgTextTagMatch) {
                    textImgDesc = (imgTextTagMatch[2] || imgTextTagMatch[1] || '').trim();
                } else if (rawMsgText.startsWith('[图片描述：') && rawMsgText.endsWith(']')) {
                    textImgDesc = rawMsgText.slice(6, -1).trim();
                }
            }

            const senderHeaderHtml = !isSelf ? `
                <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
                    ${isAdmin ? `<span style="font-size:9px;background:#07c160;color:#fff;padding:0 3px;border-radius:3px;font-weight:600;">管</span>` : ''}
                    ${title ? `<span style="font-size:9px;background:#eef7ee;color:#07c160;padding:0 4px;border-radius:3px;font-weight:500;">${escapeHtml(title)}</span>` : ''}
                    <span style="font-size:11px;color:#888;">${escapeHtml(senderName)}</span>
                </div>
            ` : '';

            if (msg.type === 'voice') {
                const seconds = Math.min(60, Math.max(1, parseInt(msg.seconds) || 3));
                const bubbleWidth = Math.min(220, 68 + seconds * 4.5);

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                    <div style="max-width:68%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${senderHeaderHtml}
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
            }
            else if (msg.imageUrl && (msg.type === 'image' || msg.text === '[图片]')) {
                const safeImgUrl = escapeHtml(msg.imageUrl);
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                    <div style="max-width:68%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${senderHeaderHtml}
                        ${quoteHtml}
                        <div style="border-radius:6px;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.08);cursor:pointer;line-height:0;" 
                             onclick="window.openGroupImageViewerSafe('${safeImgUrl.replace(/'/g, "\\'")}', '')">
                            <img src="${safeImgUrl}" style="max-width:180px;max-height:220px;object-fit:cover;display:block;" loading="lazy" onerror="this.src='assets/icons/chat.png';">
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                </div>`;
            }
            else if (textImgDesc) {
                const safeDesc = escapeHtml(textImgDesc);
                const descAttr = safeDesc.replace(/'/g, "\\'");
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                    <div style="max-width:68%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${senderHeaderHtml}
                        ${quoteHtml}
                        <div class="wechat-fake-image-card" onclick="window.openGroupImageViewerSafe('', '${descAttr}')" style="background:#ffffff;border:0.5px solid #dcdcdc;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);cursor:pointer;width:170px;user-select:none;-webkit-user-select:none;transition:transform 0.15s ease;">
                            <div style="height:88px;background:linear-gradient(135deg, #e8f5e9 0%, #f0fdf4 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;border-bottom:0.5px solid #eef2ee;">
                                <svg viewBox="0 0 24 24" style="width:34px;height:34px;fill:none;stroke:#07c160;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                <span style="position:absolute;bottom:4px;right:6px;background:rgba(0,0,0,0.45);color:#fff;font-size:9.5px;padding:1px 5px;border-radius:4px;backdrop-filter:blur(2px);">配图画面</span>
                            </div>
                            <div style="padding:7px 9px;">
                                <div style="font-size:12px;color:#333333;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;word-break:break-word;">
                                    ${safeDesc}
                                </div>
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:5px;font-size:10px;color:#07c160;font-weight:500;">
                                    <span>轻触查看大图</span>
                                    <span>›</span>
                                </div>
                            </div>
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                </div>`;
            }
            else if (msg.type === 'sticker' || msg.stickerUrl) {
                const sUrl = msg.stickerUrl || 'assets/icons/chat.png';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                    <div style="max-width:68%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${senderHeaderHtml}
                        ${quoteHtml}
                        <img src="${escapeHtml(sUrl)}" alt="${escapeHtml(msg.stickerDesc || '表情')}" style="width:100px;height:100px;object-fit:contain;border-radius:6px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                </div>`;
            }
            else {
                let text = isSelf ? escapeHtml(msg.text || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(msg.text || '') : escapeHtml(msg.text || ''));
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${window.renderAvatarBadge(avatarObj, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${senderHeaderHtml}
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
        const settingsDrawerHtml = window._settingsDrawerOpen ? window.buildChatSettingsDrawerHTML('group', gid) : '';
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

        let headerTitleHtml = `${escapeHtml(group.name)} (${memberCount})`;
        if (isGenerating) {
            const speakerName = generatingSpeaker ? `${generatingSpeaker} ` : '';
            headerTitleHtml = `<span style="color:#07c160;font-size:14px;">${escapeHtml(speakerName)}正在输入中...</span>`;
        }

        const html = `
        <div style="background:#ededed;display:flex;flex-direction:column;height:100%;min-height:100%;overflow:hidden;font-family:-apple-system,sans-serif;">
            <div class="wechat-top-header">
                <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
                    <button onclick="window.closeGroupChat()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:2px;font-weight:500;">
                        <span>‹</span> <span>微信</span>
                    </button>
                    <div style="font-weight:600;font-size:15px;color:#181818;margin-left:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${headerTitleHtml}
                    </div>
                    <span style="background:#e0e0e0;color:#666;font-size:10px;padding:1px 5px;border-radius:3px;margin-left:4px;font-weight:normal;white-space:nowrap;">
                        ${tokenDisplay}t
                    </span>
                </div>
                <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
                    <button id="btnGroupLightningTrigger" onclick="window.triggerGroupAIReply('${gid}')" style="border:none;background:#07c160;color:#fff;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="推动群聊推进">
                        ${isGenerating ? `<div class="wechat-spin-ring"></div>` : `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`}
                    </button>
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
            ${settingsDrawerHtml}
            ${plusDrawerHtml}

            <!-- 仿 QQ 式双层输入区域 -->
            <div style="background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;flex-direction:column;padding:6px 10px 8px;flex-shrink:0;gap:6px;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <textarea id="groupChatInput" rows="1" placeholder="发消息..." style="flex:1;padding:8px 12px;border-radius:6px;border:none;background:#ffffff;font-size:14px;resize:none;outline:none;font-family:inherit;box-shadow:inset 0 0 0 0.5px #dcdcdc;box-sizing:border-box;max-height:80px;"></textarea>
                    
                    <button id="btnGroupRegenerateReply" onclick="window.regenerateLastGroupAIReply('${gid}')" title="撤回上一轮群发言并让大家重新接话" style="border:0.5px solid #dcdcdc;background:#ffffff;color:#444;padding:7px 11px;border-radius:5px;font-size:13px;font-weight:500;cursor:pointer;flex-shrink:0;display:flex;align-items:center;gap:3px;-webkit-tap-highlight-color:transparent;">
                        <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                        <span>重说</span>
                    </button>

                    <button onclick="window.doSendGroupChat('${gid}')" style="border:none;background:#07c160;color:#fff;padding:7px 14px;border-radius:5px;font-size:13.5px;font-weight:600;cursor:pointer;flex-shrink:0;">发送</button>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px;">
                    <div style="display:flex;align-items:center;gap:18px;">
                        <button onclick="window.openVoiceInputModal('group','${gid}')" title="发送语音" style="border:none;background:none;cursor:pointer;padding:0;display:flex;align-items:center;color:#555;">
                            <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                        </button>

                        <button onclick="window.toggleChatSettingsDrawer('group','${gid}')" title="系统设置与排版" style="border:none;background:none;cursor:pointer;padding:0;display:flex;align-items:center;color:#555;">
                            <svg viewBox="0 0 24 24" style="width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </button>

                        <button onclick="window.toggleChatStickerDrawer('group','${gid}')" title="表情" style="border:none;background:none;cursor:pointer;padding:0;display:flex;align-items:center;color:#555;">
                            <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;">
                                <circle cx="12" cy="12" r="9.5"></circle>
                                <path d="M8 14.5c1 1.5 2.5 2.2 4 2.2s3-0.7 4-2.2"></path>
                                <circle cx="9" cy="9.5" r="1.2" fill="#555" stroke="none"></circle>
                                <circle cx="15" cy="9.5" r="1.2" fill="#555" stroke="none"></circle>
                            </svg>
                        </button>
                    </div>

                    <div>
                        <button onclick="window.toggleChatPlusDrawer('group','${gid}')" title="群聊天扩展" style="border:none;background:none;cursor:pointer;padding:0;display:flex;align-items:center;color:#555;">
                            <svg viewBox="0 0 24 24" style="width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;">
                                <circle cx="12" cy="12" r="9.5"></circle>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </div>
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

    if (!window._MCYT_GROUP_CURRENT_SPEAKER) window._MCYT_GROUP_CURRENT_SPEAKER = {};

    function findStickerUrlByDesc(cat, desc) {
        if (!window.G.stickerLibrary || !Array.isArray(window.G.stickerLibrary) || window.G.stickerLibrary.length === 0) {
            return 'assets/icons/chat.png';
        }
        const lib = window.G.stickerLibrary;
        const safeDesc = (desc || '').trim();

        if (cat) {
            const catList = lib.filter(s => s && s.category === cat);
            if (catList.length > 0) {
                if (safeDesc) {
                    const matched = catList.find(s => s.desc && (s.desc.includes(safeDesc) || safeDesc.includes(s.desc)));
                    if (matched) return matched.url;

                    const words = safeDesc.split(/[\s，,。！!？?~、\-—_]+/);
                    for (const w of words) {
                        if (w && w.length >= 2) {
                            const kwMatch = catList.find(s => s.desc && (s.desc.includes(w) || w.includes(s.desc)));
                            if (kwMatch) return kwMatch.url;
                        }
                    }
                }
                const randomInCat = catList[Math.floor(Math.random() * catList.length)];
                return randomInCat ? randomInCat.url : 'assets/icons/chat.png';
            }
        }

        if (safeDesc) {
            const crossMatch = lib.find(s => s.desc && (s.desc.includes(safeDesc) || safeDesc.includes(s.desc)));
            if (crossMatch) return crossMatch.url;

            const words = safeDesc.split(/[\s，,。！!？?~、\-—_]+/);
            for (const w of words) {
                if (w && w.length >= 2) {
                    const kwMatch = lib.find(s => s.desc && s.desc.includes(w));
                    if (kwMatch) return kwMatch.url;
                }
            }
        }

        const randomGlobal = lib[Math.floor(Math.random() * lib.length)];
        return randomGlobal ? randomGlobal.url : 'assets/icons/chat.png';
    }

    /**
     * 👥 群聊 AI 回复推进核心
     */
    window.triggerGroupAIReply = async function(gid) {
        const group = window.G.groups && window.G.groups[gid];
        if (!group) return;

        const formalMembers = (group.members || []).map(mid => window.G.npcs[mid]).filter(Boolean);
        const momentNpcs = (group.momentNpcs || []).map(mn => ({
            id: mn.id,
            name: mn.name,
            persona: mn.persona,
            avatarUrl: mn.avatar || mn.avatarUrl || 'assets/icons/chat.png',
            isMomentNpc: true
        }));

        const allAvailableSpeakers = [...formalMembers, ...momentNpcs];

        if (allAvailableSpeakers.length === 0) {
            if (typeof showToast === 'function') showToast('群内没有其他成员或NPC', 'info');
            return;
        }

        if (window._MCYT_CHAT_GENERATING && window._MCYT_CHAT_GENERATING[gid]) {
            if (typeof showToast === 'function') showToast('群友正在热烈聊天中...', 'info', 1000);
            return;
        }

        if (!window._MCYT_CHAT_GENERATING) window._MCYT_CHAT_GENERATING = {};
        window._MCYT_CHAT_GENERATING[gid] = true;

        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: '我' };
        const cfg = (window.ChatGroupSettings && typeof window.ChatGroupSettings.getGroupConfig === 'function')
            ? window.ChatGroupSettings.getGroupConfig(gid)
            : { apiMode: 'unified', allowMultiMsgs: true, minSpeakers: 1, maxSpeakers: 3, allowStickers: true };

        const history = window.getGroupChatHistorySafe(gid);
        const recentDialogue = history.slice(-12).map(m => {
            if (m.from === 'action') return `[系统提示]: ${m.text}`;
            if (m.type === 'image_text_only' || m.imageDesc) return `${m.senderName || '群友'}: [配图描述: ${m.imageDesc || m.text}]`;
            return `${m.senderName || '群友'}: ${m.text || ''}`;
        }).join('\n');

        try {
            const minSpk = Math.max(1, cfg.minSpeakers || 1);
            const maxSpk = Math.max(minSpk, Math.min(allAvailableSpeakers.length, cfg.maxSpeakers || 3));
            const targetCount = Math.floor(Math.random() * (maxSpk - minSpk + 1)) + minSpk;
            const shuffledMembers = [...allAvailableSpeakers].sort(() => Math.random() - 0.5).slice(0, targetCount);

            window._MCYT_GROUP_CURRENT_SPEAKER[gid] = shuffledMembers.map(m => m.name).slice(0, 2).join('、');
            if (window.G.currentChatGroup === gid) renderGroupChatWindow();

            if (cfg.apiMode === 'individual') {
                let rollingDialogue = recentDialogue;

                for (const member of shuffledMembers) {
                    window._MCYT_GROUP_CURRENT_SPEAKER[gid] = member.name;
                    if (window.G.currentChatGroup === gid) renderGroupChatWindow();

                    const otherMembers = allAvailableSpeakers.filter(m => m.id !== member.id);
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
                    ], { maxTokens: 600, temperature: 0.88, silent: true });

                    let clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();

                    const entityRegex = /\[(MSG|STICKER|IMAGE_TEXT)([\s\S]*?)\]([\s\S]*?)\[\/\1\]|\[STICKER\s+([^\]]+)\]/gi;
                    let match;
                    let foundAny = false;

                    while ((match = entityRegex.exec(clean)) !== null) {
                        foundAny = true;
                        const tag = match[1] || 'STICKER';

                        if (tag === 'MSG') {
                            const txt = match[3].trim();
                            if (txt) {
                                window.pushGroupChatMessageSafe(gid, {
                                    from: 'npc',
                                    senderId: member.id,
                                    senderName: member.name,
                                    senderAvatar: member.avatarUrl,
                                    text: txt
                                });
                                rollingDialogue += `\n${member.name}: ${txt}`;
                            }
                        } else if (tag === 'STICKER') {
                            const fullAttr = (match[2] || '') + (match[4] || '');
                            const catMatch = fullAttr.match(/category=["']([^"']+)["']/i);
                            const descMatch = fullAttr.match(/desc=["']([^"']+)["']/i);
                            const cat = catMatch ? catMatch[1] : '猪猪';
                            const desc = descMatch ? descMatch[1] : (match[3]?.trim() || '表情');
                            const sUrl = findStickerUrlByDesc(cat, desc);

                            window.pushGroupChatMessageSafe(gid, {
                                from: 'npc',
                                senderId: member.id,
                                senderName: member.name,
                                senderAvatar: member.avatarUrl,
                                type: 'sticker',
                                stickerUrl: sUrl,
                                stickerDesc: desc
                            });
                            rollingDialogue += `\n${member.name}: [发了表情: ${desc}]`;
                        } else if (tag === 'IMAGE_TEXT') {
                            const imgDesc = match[3].trim();
                            if (imgDesc) {
                                window.pushGroupChatMessageSafe(gid, {
                                    from: 'npc',
                                    senderId: member.id,
                                    senderName: member.name,
                                    senderAvatar: member.avatarUrl,
                                    type: 'image_text_only',
                                    imageDesc: imgDesc,
                                    text: `[图片描述：${imgDesc}]`
                                });
                                rollingDialogue += `\n${member.name}: [分享了图片: ${imgDesc.slice(0, 20)}...]`;
                            }
                        }
                    }

                    if (!foundAny && clean) {
                        const pureTxt = clean.replace(/\[\/?(MSG|STICKER|IMAGE_TEXT).*?\]/gi, '').trim();
                        if (pureTxt) {
                            window.pushGroupChatMessageSafe(gid, {
                                from: 'npc',
                                senderId: member.id,
                                senderName: member.name,
                                senderAvatar: member.avatarUrl,
                                text: pureTxt
                            });
                            rollingDialogue += `\n${member.name}: ${pureTxt}`;
                        }
                    }
                }
            } else {
                const promptBundle = window.ChatPromptGroup.buildGroupUnifiedPrompt({
                    group,
                    members: shuffledMembers.length > 0 ? shuffledMembers : allAvailableSpeakers,
                    recentDialogueText: recentDialogue,
                    currentUserName: curAcc.name,
                    groupConfig: cfg
                });

                const raw = await callAI([
                    { role: 'system', content: promptBundle.sysPrompt },
                    { role: 'user', content: promptBundle.userPrompt }
                ], { maxTokens: 900, temperature: 0.88, silent: true });

                let clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();

                const tagRegex = /\[(MSG|STICKER|IMAGE_TEXT)([\s\S]*?)\]([\s\S]*?)\[\/\1\]|\[STICKER\s+([^\]]+)\]/gi;
                let match;
                let found = false;

                while ((match = tagRegex.exec(clean)) !== null) {
                    found = true;
                    const tagType = match[1] || 'STICKER';
                    const attr = (match[2] || '') + (match[4] || '');
                    const content = match[3] ? match[3].trim() : '';

                    const senderMatch = attr.match(/sender=["']([^"']+)["']/i);
                    const senderName = senderMatch ? senderMatch[1].trim() : '';
                    const matchedNpc = allAvailableSpeakers.find(m => m.name === senderName) || shuffledMembers[0] || allAvailableSpeakers[0];

                    if (tagType === 'MSG' && content) {
                        window.pushGroupChatMessageSafe(gid, {
                            from: 'npc',
                            senderId: matchedNpc.id,
                            senderName: matchedNpc.name,
                            senderAvatar: matchedNpc.avatarUrl,
                            text: content
                        });
                    } else if (tagType === 'STICKER') {
                        const catMatch = attr.match(/category=["']([^"']+)["']/i);
                        const descMatch = attr.match(/desc=["']([^"']+)["']/i);
                        const cat = catMatch ? catMatch[1] : '抽象';
                        const desc = descMatch ? descMatch[1] : (content || '群友表情');
                        const sUrl = findStickerUrlByDesc(cat, desc);

                        window.pushGroupChatMessageSafe(gid, {
                            from: 'npc',
                            senderId: matchedNpc.id,
                            senderName: matchedNpc.name,
                            senderAvatar: matchedNpc.avatarUrl,
                            type: 'sticker',
                            stickerUrl: sUrl,
                            stickerDesc: desc
                        });
                    } else if (tagType === 'IMAGE_TEXT' && content) {
                        window.pushGroupChatMessageSafe(gid, {
                            from: 'npc',
                            senderId: matchedNpc.id,
                            senderName: matchedNpc.name,
                            senderAvatar: matchedNpc.avatarUrl,
                            type: 'image_text_only',
                            imageDesc: content,
                            text: `[图片描述：${content}]`
                        });
                    }
                }

                if (!found && clean) {
                    const fallbackNpc = shuffledMembers[0] || allAvailableSpeakers[Math.floor(Math.random() * allAvailableSpeakers.length)];
                    window.pushGroupChatMessageSafe(gid, {
                        from: 'npc',
                        senderId: fallbackNpc.id,
                        senderName: fallbackNpc.name,
                        senderAvatar: fallbackNpc.avatarUrl,
                        text: clean.replace(/\[\/?(MSG|STICKER|IMAGE_TEXT).*?\]/gi, '').trim()
                    });
                }
            }

        } catch (e) {
            console.error('群聊推进失败:', e);
            if (typeof showToast === 'function') showToast('群友接话失败，请检查网络或API', 'error');
        } finally {
            delete window._MCYT_GROUP_CURRENT_SPEAKER[gid];
            if (window._MCYT_CHAT_GENERATING) delete window._MCYT_CHAT_GENERATING[gid];

            await window.syncGroupChatsToLocalBackup();
            if (typeof autoSaveGame === 'function') autoSaveGame();
            if (window.G.currentChatGroup === gid) renderGroupChatWindow();
        }
    };

    /**
     * 🔄 群聊专属：重说上一轮发言
     */
    window.regenerateLastGroupAIReply = async function(gid) {
        if (!gid) gid = window.G.currentChatGroup;
        if (!gid) return;

        if (window._MCYT_CHAT_GENERATING && window._MCYT_CHAT_GENERATING[gid]) {
            if (typeof showToast === 'function') showToast('群友正在发言中，请稍候...', 'info');
            return;
        }

        const hist = window.getGroupChatHistorySafe(gid);
        if (!hist || hist.length === 0) {
            if (typeof showToast === 'function') showToast('当前暂无发言记录可重新生成', 'info');
            return;
        }

        let removeCount = 0;
        for (let i = hist.length - 1; i >= 0; i--) {
            if (hist[i].from === 'npc') {
                removeCount++;
            } else if (hist[i].from === 'action') {
                continue;
            } else {
                break;
            }
        }

        if (removeCount === 0) {
            if (typeof showToast === 'function') showToast('末尾没有角色回复，直接推动即可', 'info');
            window.triggerGroupAIReply(gid);
            return;
        }

        while (removeCount > 0 && hist.length > 0) {
            const last = hist[hist.length - 1];
            if (last.from === 'npc') {
                hist.pop();
                removeCount--;
            } else if (last.from === 'action') {
                hist.pop();
            } else {
                break;
            }
        }

        await window.syncGroupChatsToLocalBackup();
        renderGroupChatWindow();
        if (typeof showToast === 'function') showToast('正在重新组织群聊接话...', 'info', 1000);
        window.triggerGroupAIReply(gid);
    };

    window.doSendGroupChat = async function(gid) {
        const input = document.getElementById('groupChatInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: '我' };

        const quote = window._activeQuoteMessage ? Object.assign({}, window._activeQuoteMessage) : null;
        window._activeQuoteMessage = null;

        let msgPayload = {
            from: 'player',
            senderName: curAcc.name,
            text,
            quote
        };

        if (text.startsWith('[图片描述：') && text.endsWith(']')) {
            msgPayload.type = 'image_text_only';
            msgPayload.imageDesc = text.slice(6, -1).trim();
        }

        window.pushGroupChatMessageSafe(gid, msgPayload);
        await window.syncGroupChatsToLocalBackup();

        if (typeof autoSaveGame === 'function') autoSaveGame();
        input.value = '';
        renderGroupChatWindow();
    };

    window.renderGroupChatWindow = renderGroupChatWindow;
    
    window.openGroupChat = async function(gid) {
        if (!window.G.groups || !window.G.groups[gid]) return;
        window.G.currentChatGroup = gid;
        window._stickerDrawerOpen = false;
        window._settingsDrawerOpen = false;
        window._plusDrawerOpen = false;
        window._activeQuoteMessage = null;

        await restoreGroupsFromStorage();

        window.renderChatApp();
    };

    window.closeGroupChat = function() {
        window.G.currentChatGroup = null;
        window._stickerDrawerOpen = false;
        window._settingsDrawerOpen = false;
        window._plusDrawerOpen = false;
        window._activeQuoteMessage = null;
        window.renderChatApp();
    };

    console.log('✅ ChatGroup 多人群聊独立模块已成功升级（群基础字典与群历史 IndexedDB 驱动）');
})();
