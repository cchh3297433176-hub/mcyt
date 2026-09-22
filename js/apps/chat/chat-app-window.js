/**
 * js/apps/chat/chat-app-window.js
 * 💬 微信主应用 · 拆分分片 3/7：单人私聊窗口渲染（renderSingleChatWindow，仿群聊双层工具栏 · 顶栏闪电继续说 · 输入栏纯图标重说键 · 消息折叠 · 装扮与气泡/头像框自适应渲染）、
 *    微信内嵌全屏浏览器浮层（window.openWebPageLink）、
 *    重新生成回复的确认与执行（confirmRetryLastAIReply / doRetryLastAIReply）、
 *    🌟 微信原生直显大图与沉浸式大图文字查看器对接、拟真生活排版卡片（ui_card）渲染。
 * 🌟 存储升级：重说撤回逻辑接入 await syncChatHistoryToLocalBackup() 异步原子落盘。
 * 🌟 修复与升级：
 *  1. 我方头像全面接入 getPlayerAvatarSafe() 杜绝掉落回默认图标；
 *  2. 头像框全面接入 window.getStoredDecorFrames() 管道（全面兼容 IndexedDB 动态扩容池与全向微调 offset/scale）；
 *  3. 气泡全面接入 buildDecorBubbleHtml 管道，语音条与语音转文字全面融合入气泡排版容器，彻底解决九图挤压变形与外挂白框问题；
 *  4. 微信翻译全面改为 color: inherit，完美跟随气泡文字自定义颜色（支持双轨调色）。
 */

(function() {
    'use strict';

    // 辅助：获取形状圆角
    function getShapeBorderRadius(shape) {
        if (shape === 'circle') return '50%';
        if (shape === 'squircle') return '8px';
        if (shape === 'square') return '2px';
        return '8px';
    }

    // 辅助：统一获取全局/运行时头像框配置列表（优先接入 IndexedDB 运行态池）
    function getAvailableFramesList() {
        if (typeof window.getStoredDecorFrames === 'function') {
            const list = window.getStoredDecorFrames();
            if (Array.isArray(list) && list.length > 0) return list;
        }
        if (Array.isArray(window._decorFramesCache) && window._decorFramesCache.length > 0) {
            return window._decorFramesCache;
        }
        let framesList = [];
        try {
            framesList = JSON.parse(localStorage.getItem('mcyt_decor_frames') || '[]');
        } catch (_) {}
        const DEFAULT_FRAMES = [
            { id: 'frame_none', name: '无头像框', url: '', scale: 1.18, offsetX: 0, offsetY: 0, isBuiltin: true },
            { id: 'frame_gold_star', name: '金色之星', url: 'assets/decor/frames/frame_gold.png', scale: 1.18, offsetX: 0, offsetY: 0 },
            { id: 'frame_cat_ear', name: '猫耳软萌', url: 'assets/decor/frames/frame_cat.png', scale: 1.18, offsetX: 0, offsetY: 0 }
        ];
        return [...DEFAULT_FRAMES, ...framesList];
    }

    // 辅助：获取气泡样式字符串（回退兜底）
    function getDecorBubbleCss(bubbleId, isSelf) {
        let bubbles = [];
        try {
            if (typeof window.getStoredDecorBubbles === 'function') {
                bubbles = window.getStoredDecorBubbles();
            } else {
                const DEFAULT_BUBBLES = [
                    {
                        id: 'bubble_default',
                        userStyle: 'background-color: #95ec69; color: #000000; border-radius: 6px;',
                        npcStyle: 'background-color: #ffffff; color: #000000; border-radius: 6px; border: 1px solid #e7e7e7;'
                    }
                ];
                const stored = JSON.parse(localStorage.getItem('mcyt_decor_bubbles') || '[]');
                bubbles = [...DEFAULT_BUBBLES, ...stored];
            }
        } catch (_) {}

        const b = bubbles.find(x => x.id === bubbleId) || bubbles[0];
        if (!b) return isSelf ? 'background-color: #95ec69; color: #000;' : 'background-color: #ffffff; color: #000;';

        if (b.type === 'nine_slice') {
            const imgUrl = isSelf ? (b.userBorderImage || b.borderImage) : (b.npcBorderImage || b.userBorderImage || b.borderImage);
            const slice = isSelf ? (b.userSlice || b.slice || '30% 30% 30% 30%') : (b.npcSlice || b.userSlice || b.slice || '30% 30% 30% 30%');
            const padding = isSelf ? (b.userPadding || b.padding || '8px 12px') : (b.npcPadding || b.padding || '8px 12px');
            const borderWidth = isSelf ? (b.userBorderWidth || b.borderWidth || 14) : (b.npcBorderWidth || b.borderWidth || 14);
            const textColor = isSelf ? (b.userTextColor || b.textColor || '#111111') : (b.npcTextColor || b.textColor || '#222222');
            return `border-style: solid; border-width: ${borderWidth}px; border-image: url('${imgUrl}') ${slice} fill stretch; -webkit-border-image: url('${imgUrl}') ${slice} fill stretch; padding: ${padding}; background: transparent; color: ${textColor};`;
        } else {
            return isSelf ? (b.userStyle || 'background-color: #95ec69; color: #000;') : (b.npcStyle || 'background-color: #ffffff; color: #000;');
        }
    }

    // 辅助：统一渲染气泡内容（优先调用 theme-chat-bubble.js 提供的统一渲染器）
    function renderSafeBubbleHtml(contentHtml, isSelf, bubbleId, customClass = '') {
        if (typeof window.buildDecorBubbleHtml === 'function') {
            return window.buildDecorBubbleHtml(contentHtml, isSelf, bubbleId, customClass);
        }
        const fallbackCss = getDecorBubbleCss(bubbleId, isSelf);
        return `
            <div class="chat-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" style="width:fit-content;max-width:100%;display:inline-block;padding:8px 12px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:14.5px;line-height:1.5;word-break:break-word;${fallbackCss};">
                ${contentHtml}
            </div>
        `;
    }

    // 辅助：渲染带装扮与头像框的头像元素（精准遵循配置的 scale 与全向偏移 offsetX, offsetY）
    function renderDecorAvatarHtml(avatarUrl, shape, frameObjOrUrl, size = 38) {
        const rad = getShapeBorderRadius(shape);
        let frameUrl = '';
        let frameScale = 1.18;
        let offsetX = 0;
        let offsetY = 0;

        if (frameObjOrUrl && typeof frameObjOrUrl === 'object') {
            frameUrl = frameObjOrUrl.url || '';
            frameScale = (frameObjOrUrl.scale !== undefined) ? frameObjOrUrl.scale : 1.18;
            offsetX = frameObjOrUrl.offsetX || 0;
            offsetY = frameObjOrUrl.offsetY || 0;
        } else if (typeof frameObjOrUrl === 'string') {
            frameUrl = frameObjOrUrl;
        }

        return `
            <div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0;">
                <img src="${avatarUrl || 'assets/icons/chat.png'}" style="width:100%;height:100%;object-fit:cover;border-radius:${rad};display:block;" onerror="this.src='assets/icons/chat.png';" />
                ${frameUrl ? `
                    <img src="${frameUrl}" style="position:absolute;top:50%;left:50%;transform:translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${frameScale});width:100%;height:100%;pointer-events:none;" onerror="this.style.display='none';" />
                ` : ''}
            </div>
        `;
    }

    // 🌟 全局挂载直接展开/折叠语音详情函数
    window.toggleVoiceMessageDetailsDirect = function(msgId) {
        const box = document.getElementById('voiceDescBox_' + msgId);
        if (box) {
            const isHidden = (box.style.display === 'none' || getComputedStyle(box).display === 'none');
            box.style.display = isHidden ? 'block' : 'none';
        }
    };

    // 🌟 全局挂载直接展开/收起翻译函数
    window.toggleMessageTranslationDirect = function(btn, msgId) {
        const box = document.getElementById('transBox_' + msgId);
        if (box) {
            const isHidden = (box.style.display === 'none' || getComputedStyle(box).display === 'none');
            box.style.display = isHidden ? 'block' : 'none';
            if (btn) {
                btn.textContent = isHidden ? '收起翻译' : '翻译';
            }
        }
    };

    // 🌐 微信原生质感内嵌网页安全浏览器浮层（In-App Browser）
    window.openWebPageLink = function(url, pageTitle = '网页浏览') {
        if (!url || url === '#' || !url.startsWith('http')) {
            if (typeof showToast === 'function') showToast('无法打开非 HTTP 网页链接', 'info', 1500);
            return;
        }

        document.getElementById('wechatInAppBrowserModal')?.remove();

        const browserModal = document.createElement('div');
        browserModal.id = 'wechatInAppBrowserModal';
        browserModal.style.cssText = `
            position: fixed; inset: 0; z-index: 100000;
            background: #ffffff; display: flex; flex-direction: column;
            animation: wechatBrowserSlideUp 0.22s cubic-bezier(0.1, 0.9, 0.2, 1);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        browserModal.innerHTML = `
            <style>
                @keyframes wechatBrowserSlideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            </style>
            <div style="height: 48px; background: #f7f7f7; border-bottom: 0.5px solid #dcdcdc; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; flex-shrink: 0; user-select: none;">
                <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                    <button type="button" id="closeWechatBrowserBtn" style="border: none; background: none; font-size: 18px; color: #181818; cursor: pointer; padding: 4px 8px; display: flex; align-items: center; justify-content: center; line-height: 1;">✕</button>
                    <div style="display: flex; flex-direction: column; min-width: 0;">
                        <span id="wechatBrowserTitle" style="font-size: 13.5px; font-weight: 600; color: #181818; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 210px;">${escapeHtml(pageTitle)}</span>
                        <span style="font-size: 9.5px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 210px;">${escapeHtml(url)}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                    <button type="button" id="refreshWechatBrowserBtn" title="刷新" style="border: none; background: none; width: 30px; height: 30px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #555;">
                        <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    </button>
                    <button type="button" id="openExternalBrowserBtn" title="外部浏览器打开" style="border: none; background: none; width: 30px; height: 30px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #07c160;">
                        <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </button>
                </div>
            </div>

            <div id="browserProgressBar" style="height: 2px; width: 0%; background: #07c160; transition: width 0.3s ease; flex-shrink: 0;"></div>

            <div style="flex: 1; position: relative; width: 100%; height: 100%; overflow: hidden; background: #f2f2f2;">
                <iframe id="wechatBrowserIframe" src="${escapeHtml(url)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" style="width: 100%; height: 100%; border: none; background: #ffffff;"></iframe>
                
                <div id="browserCspTip" style="position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.72); backdrop-filter: blur(4px); color: #fff; padding: 6px 14px; border-radius: 18px; font-size: 11px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); pointer-events: auto; white-space: nowrap;">
                    <span>部分页面若受限无法完全展示</span>
                    <span id="fallbackOpenLinkBtn" style="color: #6ee7b7; font-weight: 600; cursor: pointer; text-decoration: underline;">唤起系统应用打开 ›</span>
                </div>
            </div>
        `;

        document.body.appendChild(browserModal);

        const iframe = browserModal.querySelector('#wechatBrowserIframe');
        const progressBar = browserModal.querySelector('#browserProgressBar');

        if (progressBar) {
            progressBar.style.width = '30%';
            setTimeout(() => { if (progressBar) progressBar.style.width = '75%'; }, 400);
        }

        if (iframe) {
            iframe.onload = () => {
                if (progressBar) {
                    progressBar.style.width = '100%';
                    setTimeout(() => { if (progressBar) progressBar.style.opacity = '0'; }, 300);
                }
            };
        }

        browserModal.querySelector('#closeWechatBrowserBtn')?.addEventListener('click', () => {
            browserModal.style.transform = 'translateY(100%)';
            browserModal.style.transition = 'transform 0.18s cubic-bezier(0.4, 0, 1, 1)';
            setTimeout(() => browserModal.remove(), 190);
        });

        browserModal.querySelector('#refreshWechatBrowserBtn')?.addEventListener('click', () => {
            if (iframe) {
                if (progressBar) {
                    progressBar.style.opacity = '1';
                    progressBar.style.width = '40%';
                }
                iframe.src = url;
            }
        });

        const triggerExternal = () => {
            try {
                const a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                a.remove();
            } catch (_) {
                window.location.href = url;
            }
        };

        browserModal.querySelector('#openExternalBrowserBtn')?.addEventListener('click', triggerExternal);
        browserModal.querySelector('#fallbackOpenLinkBtn')?.addEventListener('click', triggerExternal);
    };

    // ============================================================
    // 💬 单人私聊窗口渲染
    // ============================================================
    window.renderSingleChatWindow = function renderSingleChatWindow(container, renderOpts = {}) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        // 静默触发装扮池异步预热与保活，确保 IndexedDB 头像框与气泡随时最新
        const _reopenNpcId = window.G && window.G.currentChatNpc;
        if (typeof window.loadStoredDecorFramesAsync === 'function' && !window._mcytDecorFramesReady) {
            window.loadStoredDecorFramesAsync().then(() => {
                window._mcytDecorFramesReady = true;
                if (window.G && window.G.currentChatNpc === _reopenNpcId && document.body.contains(container)) {
                    renderSingleChatWindow(container, renderOpts);
                }
            });
        }
        if (typeof window.loadStoredDecorBubblesAsync === 'function' && !window._mcytDecorBubblesReady) {
            window.loadStoredDecorBubblesAsync().then(() => {
                window._mcytDecorBubblesReady = true;
                if (window.G && window.G.currentChatNpc === _reopenNpcId && document.body.contains(container)) {
                    renderSingleChatWindow(container, renderOpts);
                }
            });
        }

        if (window.ChatTarot && typeof window.ChatTarot.drainPendingTarotShares === 'function') {
            window.ChatTarot.drainPendingTarotShares();
        }

        const legacyWrap = document.querySelector('#socialTab .phone-app-wrap');
        if (legacyWrap) legacyWrap.remove();

        const npcId = window.G.currentChatNpc;
        const npc = window.G.npcs ? window.G.npcs[npcId] : null;
        if (!npc) { window.closeChat(); return; }

        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', region: '中国' };
        const isBlocked = (typeof window.isAccountBlockedByNpc === 'function') ? window.isAccountBlockedByNpc(npcId, curAcc.id) : false;
        const chatHist = window.getAccountChatHistory(npcId, curAcc.id) || [];
        const isBehindActive = !!(window.G._behindScreenActive && window.G._behindScreenActive[npcId]);

        const tokensCount = (typeof window.calculateHistoryTokens === 'function') ? window.calculateHistoryTokens(chatHist) : 0;
        const tokenDisplay = (typeof window.formatTokenString === 'function') ? window.formatTokenString(tokensCount) : '0';
        const isGenerating = !!(window._MCYT_CHAT_GENERATING && window._MCYT_CHAT_GENERATING[npcId]);

        const topHeaderTitle = (npc.remark && npc.remark.trim()) ? `${npc.remark.trim()} (${npc.name})` : (npc.name || npc.id);

        // 🌟 读取装扮配置（NPC专属装扮优先，平滑回退到全局装扮）
        const globalShape = localStorage.getItem('mcyt_active_avatar_shape') || 'circle';
        const globalBubbleId = localStorage.getItem('mcyt_active_decor_bubble') || 'bubble_default';
        const globalFrameId = localStorage.getItem('mcyt_active_decor_frame') || 'frame_none';

        const decor = (npc.chatSettings && npc.chatSettings.decor) || {};
        const npcShape = decor.avatarShape || globalShape;
        const npcBubbleId = decor.bubbleId || globalBubbleId; // 对方专属气泡
        const userBubbleId = globalBubbleId; // 我方默认使用全局气泡

        // 统一提取头像框池
        const framesList = getAvailableFramesList();

        const targetFrameId = decor.frameId !== undefined && decor.frameId !== null ? decor.frameId : globalFrameId;
        const targetFrameObj = (targetFrameId && targetFrameId !== 'frame_none') 
            ? (framesList.find(f => f.id === targetFrameId) || null) 
            : null;
        const userFrameObj = (globalFrameId && globalFrameId !== 'frame_none') 
            ? (framesList.find(f => f.id === globalFrameId) || null) 
            : null;

        const npcAvatarUrl = npc.avatarUrl || npc.avatar || 'assets/icons/chat.png';
        const userAvatarUrl = (typeof window.getPlayerAvatarSafe === 'function') 
            ? window.getPlayerAvatarSafe() 
            : ((typeof getPlayerAvatar === 'function' ? getPlayerAvatar() : null) || 'assets/icons/chat.png');

        const collapseCfg = (typeof getChatCollapseConfig === 'function') ? getChatCollapseConfig() : { enabled: true, limit: 50 };
        const chatKey = `single_${npcId}_${curAcc.id}`;
        const isExpanded = !!(window._chatExpandAllMap && window._chatExpandAllMap[chatKey]);

        let visibleMessages = chatHist;
        let collapseBannerHtml = '';

        if (collapseCfg && collapseCfg.enabled && chatHist.length > collapseCfg.limit) {
            if (!isExpanded) {
                const hiddenCount = chatHist.length - collapseCfg.limit;
                visibleMessages = chatHist.slice(-collapseCfg.limit);
                collapseBannerHtml = `
                    <div style="text-align:center;margin:12px 0 16px;">
                        <span onclick="window.toggleChatHistoryExpand('${chatKey}')" style="display:inline-flex;align-items:center;gap:5px;background:#ffffff;color:#555555;padding:5px 14px;border-radius:16px;font-size:11.5px;cursor:pointer;user-select:none;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:0.5px solid #e0e0e0;">
                            <svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:none;stroke:#07c160;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            <span>已折叠更早的 ${hiddenCount} 条消息 · 点击展开</span>
                        </span>
                    </div>
                `;
            } else {
                collapseBannerHtml = `
                    <div style="text-align:center;margin:10px 0 14px;">
                        <span onclick="window.toggleChatHistoryExpand('${chatKey}')" style="display:inline-flex;align-items:center;gap:5px;background:#ffffff;color:#888888;padding:4px 12px;border-radius:14px;font-size:11px;cursor:pointer;user-select:none;box-shadow:0 1px 2px rgba(0,0,0,0.04);border:0.5px solid #e8e8e8;">
                            <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:#888888;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;"><polyline points="18 15 12 9 6 15"></polyline></svg>
                            <span>收起早期折叠消息</span>
                        </span>
                    </div>
                `;
            }
        }

        let messagesHtml = collapseBannerHtml;
        for (const msg of visibleMessages) {
            const isSelf = (msg.from === 'player');
            const currentBubbleId = isSelf ? userBubbleId : npcBubbleId;

            // 头像与装扮挂载
            const currentAvatarHtml = isSelf
                ? renderDecorAvatarHtml(userAvatarUrl, globalShape, userFrameObj, 38)
                : renderDecorAvatarHtml(npcAvatarUrl, npcShape, targetFrameObj, 38);

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
                const tarotCardHtml = (window.ChatTarot && typeof window.ChatTarot.renderSharedTarotCardHTML === 'function')
                    ? window.ChatTarot.renderSharedTarotCardHTML(msg, npcId, false)
                    : `<div style="background:#fff;padding:8px 12px;border-radius:6px;font-size:12px;color:#666;">[塔罗牌阵: ${escapeHtml(msg.sharedTarot?.spreadName || '占卜')}]</div>`;

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:76%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        ${tarotCardHtml}
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else if (msg.type === 'ui_card') {
                const cardTypeLabel = msg.cardType || '生活便签';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:78%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <div class="wechat-ui-card-container" style="background:#ffffff;border:0.5px solid #e0e0e0;border-radius:8px;padding:12px 14px;box-shadow:0 2px 8px rgba(0,0,0,0.06);width:fit-content;max-width:270px;box-sizing:border-box;cursor:pointer;">
                            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:0.5px dashed #e5e5e5;padding-bottom:6px;margin-bottom:8px;font-size:11px;color:#888;">
                                <div style="display:flex;align-items:center;gap:4px;">
                                    <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:#07c160;stroke-width:2;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                    <span style="font-weight:600;color:#333;">${escapeHtml(cardTypeLabel)}</span>
                                </div>
                                <span style="font-size:10px;color:#aaa;">仿真物品</span>
                            </div>
                            <div class="wechat-ui-card-body" style="font-size:13px;line-height:1.45;color:#1f2937;">
                                ${msg.cardHtml || escapeHtml(msg.text || '')}
                            </div>
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:3px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else if (msg.type === 'web_page') {
                const wp = msg.webPage || {};
                const pageUrl = wp.url || '#';
                const pageTitle = wp.title || '权威检索结果';
                const pageSnippet = wp.snippet || '';
                const pageSource = wp.source || '全网检索';

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:76%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <div class="wechat-web-card" onclick="window.openWebPageLink('${escapeHtml(pageUrl)}', '${escapeHtml(pageTitle)}')" style="background:#ffffff;border:0.5px solid #e2e8f0;border-radius:8px;padding:10px 12px;box-shadow:0 1px 4px rgba(0,0,0,0.06);cursor:pointer;width:240px;box-sizing:border-box;">
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
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else if (msg.type === 'contact_card') {
                const card = msg.contactCard || {};
                const sigShow = card.signature ? `<div style="font-size:11px;color:#07c160;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">“${escapeHtml(card.signature)}”</div>` : '';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
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
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else if (msg.type === 'shared_moment') {
                const moment = msg.sharedMoment || {};
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
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
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else if (msg.from === 'behind_screen') {
                messagesHtml += `
                <div style="margin:8px 12px;background:#ffffff;border:1px dashed #dcdcdc;padding:8px 12px;border-radius:6px;font-size:12px;color:#555;line-height:1.5;">
                    <span style="font-weight:600;color:#181818;">动作感知：</span>${escapeHtml(msg.text || '')}
                </div>`;
            } else if (msg.type === 'voice') {
                // 🌟 语音消息彻底适配自定义气泡核心管道：
                // 1. 统一接入 renderSafeBubbleHtml，杜绝硬编码类名引起的白底透出与九宫格挤压变形；
                // 2. 语音转文字直接收归气泡内部，支持原生折叠与展开；
                // 3. 所有文字、声波、图标全面继承气泡字体颜色。
                const seconds = Math.min(60, Math.max(1, parseInt(msg.seconds) || 3));
                const voiceBarMinWidth = Math.min(180, Math.max(68, 56 + seconds * 4));

                const voiceBarInnerHtml = `
                    <div onclick="window.toggleVoiceMessageDetailsDirect('${msg._id}')" style="display:flex;align-items:center;justify-content:${isSelf ? 'flex-end' : 'flex-start'};gap:6px;cursor:pointer;user-select:none;min-height:22px;width:100%;">
                        ${!isSelf ? `
                            <div class="wechat-voice-wave" style="color:inherit;opacity:0.85;display:flex;align-items:center;gap:2.5px;">
                                <div class="wechat-voice-bar" style="background:currentColor;"></div>
                                <div class="wechat-voice-bar" style="background:currentColor;"></div>
                                <div class="wechat-voice-bar" style="background:currentColor;"></div>
                            </div>
                            <span style="font-size:13.5px;font-weight:600;color:inherit;margin-left:2px;letter-spacing:0.5px;">${seconds}"</span>
                        ` : `
                            <span style="font-size:13.5px;font-weight:600;color:inherit;margin-right:2px;letter-spacing:0.5px;">${seconds}"</span>
                            <div class="wechat-voice-wave" style="color:inherit;opacity:0.85;transform:scaleX(-1);display:flex;align-items:center;gap:2.5px;">
                                <div class="wechat-voice-bar" style="background:currentColor;"></div>
                                <div class="wechat-voice-bar" style="background:currentColor;"></div>
                                <div class="wechat-voice-bar" style="background:currentColor;"></div>
                            </div>
                        `}
                    </div>
                `;

                const voiceDetailHtml = (msg.text || msg.audioBg) ? `
                    <div id="voiceDescBox_${msg._id}" style="display:none;margin-top:6px;padding-top:6px;border-top:0.5px dashed currentColor;opacity:0.92;font-size:12.5px;line-height:1.45;color:inherit;word-break:break-word;">
                        ${msg.audioBg ? `<div style="font-size:11px;opacity:0.75;margin-bottom:3px;font-style:italic;">（${escapeHtml(msg.audioBg)}）</div>` : ''}
                        <div><span style="font-weight:600;opacity:0.85;">转文字：</span>${escapeHtml(msg.text || '')}</div>
                    </div>
                ` : '';

                const voiceContainerHtml = `
                    <div class="wechat-voice-bubble-wrapper" style="min-width:${voiceBarMinWidth}px;max-width:100%;color:inherit;">
                        ${voiceBarInnerHtml}
                        ${voiceDetailHtml}
                    </div>
                `;

                const renderedBubbleHtml = renderSafeBubbleHtml(voiceContainerHtml, isSelf, currentBubbleId, 'voice-bubble-cell');

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:76%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        ${renderedBubbleHtml}
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else if (msg.type === 'image' || msg.type === 'image_flip' || msg.type === 'image_text_only' || msg.imageUrl || msg.imageDesc) {
                const imageBubbleHtml = (typeof window.renderWechatPureImageBubbleHTML === 'function')
                    ? window.renderWechatPureImageBubbleHTML(msg)
                    : `<div style="padding:10px 14px;background:#fff;border-radius:8px;font-size:13px;color:#222;">“${escapeHtml(msg.imageDesc || msg.text || '图片')}”</div>`;

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:72%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        ${imageBubbleHtml}
                        <div style="font-size:10px;color:#bbb;margin-top:3px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else if (msg.type === 'sticker' || msg.stickerUrl) {
                const sUrl = msg.stickerUrl || 'assets/icons/chat.png';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:56%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <img class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" src="${escapeHtml(sUrl)}" alt="${escapeHtml(msg.stickerDesc || '表情')}" style="width:100px;height:100px;object-fit:contain;border-radius:6px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.05);cursor:pointer;">
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else {
                const hasOriginal = !!msg.originalText;
                const displayMainText = hasOriginal ? msg.originalText : msg.text;
                let bubbleBody = isSelf ? escapeHtml(displayMainText || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(displayMainText || '') : escapeHtml(displayMainText || ''));

                // 🌟 翻译区域彻底解绑死板灰色，全面使用 color: inherit 与半透明边框，完美同步气泡自选字色
                const transPartHtml = hasOriginal ? `
                    <div id="transBox_${msg._id}" style="display:none;margin-top:6px;padding-top:6px;border-top:0.5px dashed currentColor;opacity:0.92;font-size:13px;line-height:1.45;color:inherit;">
                        <div style="font-size:10px;opacity:0.65;margin-bottom:3px;display:flex;align-items:center;gap:3px;color:inherit;">
                            <svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M5 8l6 6M11 8L5 14M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/></svg>
                            <span>微信翻译</span>
                        </div>
                        <div style="color:inherit;word-break:break-word;">${escapeHtml(msg.text || '')}</div>
                    </div>
                ` : '';

                const bubbleInnerHtml = `<div>${bubbleBody}</div>${transPartHtml}`;
                const renderedBubbleHtml = renderSafeBubbleHtml(bubbleInnerHtml, isSelf, currentBubbleId);

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:78%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        ${renderedBubbleHtml}

                        <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
                            ${hasOriginal ? `
                            <span id="transBtn_${msg._id}" onclick="window.toggleMessageTranslationDirect(this, '${msg._id}')" style="font-size:10.5px;color:#07c160;cursor:pointer;user-select:none;">
                                翻译
                            </span>
                            ` : ''}
                            <span style="font-size:10px;color:#bbb;">${msg.time || ''}</span>
                        </div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            }
        }

        const stickerDrawerHtml = window._stickerDrawerOpen ? window.buildChatStickerDrawerHTML('single', npcId) : '';
        const settingsDrawerHtml = window._settingsDrawerOpen ? window.buildChatSettingsDrawerHTML('single', npcId) : '';
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

        let topHeaderDisplayHtml = escapeHtml(topHeaderTitle);
        if (isGenerating) {
            topHeaderDisplayHtml = `<span style="color:#07c160;font-size:14px;">对方正在输入中...</span>`;
        }

        const html = `
        <div style="background:#ededed;display:flex;flex-direction:column;height:100%;min-height:100%;overflow:hidden;font-family:-apple-system,sans-serif;">
            <div class="wechat-top-header">
                <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
                    <button onclick="window.closeChat()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:2px;font-weight:500;">
                        <span>‹</span> <span>微信</span>
                    </button>
                    <div onclick="if(typeof window.openNpcProfileCardModal==='function')window.openNpcProfileCardModal('${npcId}')" style="cursor:pointer;font-weight:600;font-size:15px;color:#181818;margin-left:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${topHeaderDisplayHtml}
                    </div>
                    <span style="background:#e0e0e0;color:#666;font-size:10px;padding:1px 5px;border-radius:3px;margin-left:4px;font-weight:normal;white-space:nowrap;">
                        ${tokenDisplay}t
                    </span>
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                    <button onclick="window.toggleBehindScreen('${npcId}')" style="border:0.5px solid ${isBehindActive ? '#07c160' : '#ccc'};background:${isBehindActive ? '#d4f5dd' : '#fff'};color:${isBehindActive ? '#07c160' : '#555'};width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="动作感知">
                        <svg viewBox="0 0 24 24" style="width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    
                    <button id="btnChatLightningTrigger" onclick="window.triggerAIReplyForSingle('${npcId}')" style="border:none;background:#07c160;color:#fff;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="让对方继续说话">
                        ${isGenerating ? `<div class="wechat-spin-ring"></div>` : `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`}
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

            ${quotePreviewHtml}
            ${stickerDrawerHtml}
            ${settingsDrawerHtml}
            ${plusDrawerHtml}

            <!-- 仿 QQ/群聊 双层输入区域 -->
            <div style="background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;flex-direction:column;padding:6px 10px 8px;flex-shrink:0;gap:6px;">
                <div style="display:flex;align-items:center;gap:6px;">
                    <textarea id="singleChatInput" rows="1" placeholder="发消息..." style="flex:1;padding:8px 12px;border-radius:6px;border:none;background:#ffffff;font-size:14px;resize:none;outline:none;font-family:inherit;box-shadow:inset 0 0 0 0.5px #dcdcdc;box-sizing:border-box;max-height:80px;"></textarea>
                    
                    <button id="btnSingleRegenerateReply" onclick="window.confirmRetryLastAIReply('${npcId}')" title="重新生成上一条回复" style="border:0.5px solid #dcdcdc;background:#ffffff;color:#444;width:34px;height:34px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;-webkit-tap-highlight-color:transparent;">
                        <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                    </button>

                    <button onclick="window.doSendSingleChat('${npcId}')" style="border:none;background:#07c160;color:#fff;padding:7px 14px;border-radius:5px;font-size:13.5px;font-weight:600;cursor:pointer;flex-shrink:0;">发送</button>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px;">
                    <div style="display:flex;align-items:center;gap:18px;">
                        <button onclick="window.openVoiceInputModal('single','${npcId}')" title="发送语音" style="border:none;background:none;cursor:pointer;padding:0;display:flex;align-items:color:#555;">
                            <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                        </button>

                        <button onclick="window.toggleChatSettingsDrawer('single','${npcId}')" title="系统设置与排版" style="border:none;background:none;cursor:pointer;padding:0;display:flex;align-items:center;color:#555;">
                            <svg viewBox="0 0 24 24" style="width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;">
                                <circle cx="12" cy="3" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </button>

                        <button onclick="window.toggleChatStickerDrawer('single','${npcId}')" title="表情" style="border:none;background:none;cursor:pointer;padding:0;display:flex;align-items:center;color:#555;">
                            <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;">
                                <circle cx="12" cy="12" r="9.5"></circle>
                                <path d="M8 14.5c1 1.5 2.5 2.2 4 2.2s3-0.7 4-2.2"></path>
                                <circle cx="9" cy="9.5" r="1.2" fill="#555" stroke="none"></circle>
                                <circle cx="15" cy="9.5" r="1.2" fill="#555" stroke="none"></circle>
                            </svg>
                        </button>
                    </div>

                    <div>
                        <button onclick="window.toggleChatPlusDrawer('single','${npcId}')" title="聊天互动与扩展" style="border:none;background:none;cursor:pointer;padding:0;display:flex;align-items:center;color:#555;">
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

        const msgArea = document.getElementById('chatMessageArea');
        if (msgArea && !renderOpts.keepScroll) {
            setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 50);
        }

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
    };

    // 重新生成回复确认弹窗
    window.confirmRetryLastAIReply = function(npcId) {
        if (window._MCYT_CHAT_GENERATING && window._MCYT_CHAT_GENERATING[npcId]) {
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
    window.doRetryLastAIReply = async function(npcId) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        const hist = window.getAccountChatHistory(npcId, curAcc.id);

        while (hist.length > 0) {
            const last = hist[hist.length - 1];
            if (last.from === 'player') break;
            hist.pop();
        }

        if (typeof window.syncChatHistoryToLocalBackup === 'function') {
            await window.syncChatHistoryToLocalBackup();
        }
        if (typeof autoSaveGame === 'function') autoSaveGame();
        renderSingleChatWindow();

        window.triggerAIReplyForSingle(npcId);
    };

})();
