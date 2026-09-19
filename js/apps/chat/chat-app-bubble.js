/**
 * js/apps/chat/chat-app-bubble.js
 * 💬 微信主应用 · 拆分分片 4/7：消息气泡长按操作菜单（openBubbleActionSheet）、长按引用/取消引用、
 *    编辑消息、删除消息、撤回消息（单次偷窥脱敏）、语音输入弹窗、
 *    🌟 微信原生直显大图与沉浸式图文查看器（Lightbox Viewer，彻底去除小框翻转与抠滑，点击大图舒展呈现文字，再次点击秒退）。
 */

(function() {
    'use strict';

    // 🖼️ 微信原生沉浸式图文大图查看器（带高质感半透明遮罩与舒展画面文字排版，点击任意处秒退）
    window.openChatImageViewer = function(imgUrl, descText, titleText = '图片详情') {
        document.getElementById('wechatChatImageViewerModal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'wechatChatImageViewerModal';
        modal.style.cssText = `
            position: fixed; inset: 0; z-index: 100005;
            background: rgba(15, 15, 15, 0.88);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            padding: 20px 16px; box-sizing: border-box;
            animation: wechatFadeIn 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
            user-select: none; -webkit-user-select: none;
            touch-action: manipulation;
        `;

        const hasRealImg = !!imgUrl;
        const hasDesc = !!(descText && descText.trim());

        let imageContentHtml = '';
        if (hasRealImg) {
            imageContentHtml = `
                <div style="max-height: 54vh; max-width: 92vw; display: flex; align-items: center; justify-content: center; overflow: hidden; border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
                    <img src="${escapeHtml(imgUrl)}" style="max-height: 54vh; max-width: 92vw; object-fit: contain; display: block; border-radius: 8px;" onerror="this.src='assets/icons/chat.png';">
                </div>
            `;
        } else {
            imageContentHtml = `
                <div style="width: 220px; height: 160px; background: rgba(255,255,255,0.06); border: 1px dashed rgba(255,255,255,0.2); border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.3);">
                    <svg viewBox="0 0 24 24" style="width: 38px; height: 38px; fill: none; stroke: #9ca3af; stroke-width: 1.8;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span style="font-size: 12.5px; color: #9ca3af; font-weight: 500;">意境画面描绘</span>
                </div>
            `;
        }

        let descContentHtml = '';
        if (hasDesc) {
            descContentHtml = `
                <div style="width: 100%; max-width: 380px; margin-top: 14px; background: rgba(35, 35, 35, 0.75); border: 0.5px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 12px 14px; box-sizing: border-box; max-height: 28vh; overflow-y: auto; text-align: left; box-shadow: 0 4px 16px rgba(0,0,0,0.3);">
                    <div style="font-size: 11px; color: #07c160; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                        <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 2;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                        <span>画面细节</span>
                    </div>
                    <div style="font-size: 13px; line-height: 1.55; color: #f3f3f3; word-break: break-word; letter-spacing: 0.2px;">
                        ${escapeHtml(descText)}
                    </div>
                </div>
            `;
        }

        modal.innerHTML = `
            <style>
                @keyframes wechatFadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
                @keyframes wechatFadeOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.97); } }
            </style>
            <!-- 顶栏轻量提示与关闭 -->
            <div style="position: absolute; top: 18px; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; color: #bbb; font-size: 12px; pointer-events: none;">
                <span style="opacity: 0.85;">${escapeHtml(titleText)}</span>
                <span style="background: rgba(255,255,255,0.1); padding: 3px 8px; border-radius: 12px; font-size: 11px;">轻触任意位置退出</span>
            </div>

            <!-- 主图文卡片容器 -->
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                ${imageContentHtml}
                ${descContentHtml}
            </div>
        `;

        // 统一平滑退出逻辑：无论是点大图、文字区还是空白遮罩，即刻退出
        const exitViewer = () => {
            modal.style.animation = 'wechatFadeOut 0.16s cubic-bezier(0.4, 0, 1, 1)';
            setTimeout(() => { modal.remove(); }, 150);
        };

        modal.onclick = exitViewer;
        document.body.appendChild(modal);
    };

    // 辅助入口：通过消息实体唤起大图查看器
    window.openChatImageViewerByMsg = function(msg) {
        if (!msg) return;
        const imgUrl = msg.imageUrl || msg.url || '';
        const descText = msg.imageDesc || msg.text || '';
        const titleText = msg.senderName ? `${msg.senderName} 发送的图片` : '图片详情';
        window.openChatImageViewer(imgUrl, descText, titleText);
    };

    // 兼容历史调用：原 3D 翻转方法重定向至无感舒适的大图文字查看器
    window.toggleChatImageFlip = function(cardWrapper) {
        if (!cardWrapper) return;
        const imgUrl = cardWrapper.getAttribute('data-img-url') || '';
        const descText = cardWrapper.getAttribute('data-desc-text') || '';
        window.openChatImageViewer(imgUrl, descText, '图片详情');
    };

    // 气泡长按操作菜单
    window.openBubbleActionSheet = function(msgId, type, targetId) {
        const history = (type === 'single') ? window.getAccountChatHistory(targetId) : (window.G.groupChatHistory[targetId] || []);
        const msg = history.find(m => m._id === msgId);
        if (!msg) return;

        const isSelf = (msg.from === 'player');
        let mask = document.createElement('div');
        mask.className = 'wechat-action-sheet-mask';

        let itemsHtml = '';
        itemsHtml += `<div class="wechat-action-item" onclick="window.triggerQuoteMessage('${msgId}','${type}','${targetId}')">引用</div>`;
        itemsHtml += `<div class="wechat-action-item" onclick="window.doEditMessageContent('${msgId}','${type}','${targetId}')">编辑消息</div>`;

        if (isSelf) {
            itemsHtml += `<div class="wechat-action-item" onclick="window.doRecallMessageWithRandomPeek('${msgId}','${type}','${targetId}')">撤回消息</div>`;
        }
        itemsHtml += `<div class="wechat-action-item" style="color:#fa5151;" onclick="window.doDeleteMessage('${msgId}','${type}','${targetId}')">删除</div>`;

        mask.innerHTML = `
            <div class="wechat-action-sheet-box">
                ${itemsHtml}
                <div class="wechat-action-cancel" onclick="this.closest('.wechat-action-sheet-mask').remove()">取消</div>
            </div>
        `;
        document.body.appendChild(mask);
    };

    window.triggerQuoteMessage = function(msgId, type, targetId) {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        const history = (type === 'single') ? window.getAccountChatHistory(targetId) : (window.G.groupChatHistory[targetId] || []);
        const msg = history.find(m => m._id === msgId);
        if (!msg) return;

        let author = '我';
        if (msg.from !== 'player') {
            if (type === 'single') {
                const n = window.G.npcs[targetId];
                author = (n && n.remark) ? n.remark : (n?.name || '好友');
            } else {
                author = msg.senderName || '群友';
            }
        }

        let summaryText = msg.text || '';
        if (msg.type === 'voice') summaryText = `[语音 ${msg.seconds || 3}"] ${msg.text || ''}`;
        else if (msg.type === 'shared_tarot') summaryText = `[塔罗牌阵: ${msg.sharedTarot?.spreadName || '占卜'}]`;
        else if (msg.type === 'shared_moment') summaryText = `[朋友圈分享]`;
        else if (msg.type === 'contact_card') summaryText = `[名片] ${msg.contactCard?.name || ''}`;
        else if (msg.type === 'web_page') summaryText = `[链接] ${msg.webPage?.title || ''}`;
        else if (msg.type === 'image' || msg.type === 'image_flip' || msg.type === 'image_text_only' || msg.imageDesc) {
            summaryText = `[图片] ${msg.imageDesc || msg.text || ''}`;
        }
        else if (msg.type === 'sticker') summaryText = `[表情]`;

        window._activeQuoteMessage = {
            id: msgId,
            author,
            text: summaryText.slice(0, 48)
        };

        if (type === 'single') renderSingleChatWindow();
        else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();

        setTimeout(() => {
            const inp = document.getElementById(type === 'single' ? 'singleChatInput' : 'groupChatInput');
            if (inp) inp.focus();
        }, 60);
    };

    window.cancelMessageQuote = function(type, targetId) {
        window._activeQuoteMessage = null;
        if (type === 'single') renderSingleChatWindow();
        else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
    };

    window.doEditMessageContent = function(msgId, type, targetId) {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        const history = (type === 'single') ? window.getAccountChatHistory(targetId) : (window.G.groupChatHistory[targetId] || []);
        const msg = history.find(m => m._id === msgId);
        if (!msg) return;

        window.openWechatCleanModal('编辑消息', `
            <textarea id="wcleanEditMsgInput" rows="3" class="wechat-clean-input" style="line-height:1.4;resize:none;">${escapeHtml(msg.text || msg.imageDesc || '')}</textarea>
        `, () => {
            const val = document.getElementById('wcleanEditMsgInput').value.trim();
            if (!val) return false;
            msg.text = val;
            if (msg.imageDesc) msg.imageDesc = val;
            window.syncChatHistoryToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            if (type === 'single') renderSingleChatWindow();
            else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
        });
    };

    window.doDeleteMessage = function(msgId, type, targetId) {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        const history = (type === 'single') ? window.getAccountChatHistory(targetId) : (window.G.groupChatHistory[targetId] || []);
        const idx = history.findIndex(m => m._id === msgId);
        if (idx !== -1) {
            history.splice(idx, 1);
            window.syncChatHistoryToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            if (type === 'single') renderSingleChatWindow();
            else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
        }
    };

    window.doRecallMessageWithRandomPeek = function(msgId, type, targetId) {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        const history = (type === 'single') ? window.getAccountChatHistory(targetId) : (window.G.groupChatHistory[targetId] || []);
        const idx = history.findIndex(m => m._id === msgId);
        if (idx === -1) return;

        const targetMsg = history[idx];
        const now = Date.now();
        const elapsedSeconds = Math.round((now - (targetMsg.timestamp || (now - 5000))) / 1000);

        let peekChance = 0.15;
        if (window._MCYT_CHAT_GENERATING[targetId]) {
            peekChance = 0.85;
        } else if (elapsedSeconds > 25) {
            peekChance = 0.75;
        } else if (elapsedSeconds > 5) {
            peekChance = 0.40;
        }

        const wasPeeked = Math.random() < peekChance;

        history.splice(idx, 1, {
            _id: 'action_' + Date.now(),
            from: 'action',
            text: '你撤回了一条消息',
            recalledText: targetMsg.imageDesc ? `[快照描述: ${targetMsg.imageDesc}]` : (targetMsg.text || ''),
            recalledWasPeeked: wasPeeked,
            peekHandled: false,
            time: new Date().toLocaleTimeString().slice(0, 5),
            timestamp: Date.now()
        });

        if (wasPeeked && typeof showToast === 'function') {
            showToast('已撤回（对方在通知栏瞄到一眼）', 'info', 1500);
        } else if (typeof showToast === 'function') {
            showToast('已撤回', 'info', 1200);
        }

        window.syncChatHistoryToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        if (type === 'single') renderSingleChatWindow();
        else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
    };

    window.openVoiceInputModal = function(type, id) {
        window.openWechatCleanModal('发送语音消息', `
            <div style="display:flex;flex-direction:column;gap:10px;text-align:left;">
                <div style="font-size:12px;color:#666;">输入你想说出的话（自动换算微信秒数）：</div>
                <textarea id="wcleanVoiceTextInput" rows="3" placeholder="例如：我刚回到家，今天真是累死我了..." class="wechat-clean-input" style="line-height:1.4;resize:none;"></textarea>
            </div>
        `, () => {
            const text = document.getElementById('wcleanVoiceTextInput').value.trim();
            if (!text) return false;
            const seconds = Math.min(60, Math.max(2, Math.round(text.length * 0.45)));
            const time = new Date().toLocaleTimeString().slice(0, 5);
            const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };

            const msgObj = {
                from: 'player',
                type: 'voice',
                seconds,
                text,
                senderName: curAcc.name,
                time,
                timestamp: Date.now(),
                quote: window._activeQuoteMessage ? Object.assign({}, window._activeQuoteMessage) : null
            };
            window._activeQuoteMessage = null;

            if (type === 'single') {
                window.pushChatMessageSafe(id, msgObj, curAcc.id);
                depositRememoriEvidence(id, curAcc.id, `${curAcc.name}[语音]: ${text}`);
                renderSingleChatWindow();
            } else {
                if (!window.G.groupChatHistory[id]) window.G.groupChatHistory[id] = [];
                window.G.groupChatHistory[id].push(msgObj);
                if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
            }

            if (typeof window.autoSaveGame === 'function') autoSaveGame();
        });
    };

    // 🖼️ 微信原生纯净直显图片气泡渲染器（点击打开全屏大图+文字沉浸式查看器，彻底告别拍立得与小框滚动）
    window.renderWechatPureImageBubbleHTML = function(msg) {
        const descText = msg.imageDesc || msg.text || '';
        const hasRealImg = !!(msg.imageUrl || msg.url);
        const imgUrl = msg.imageUrl || msg.url || '';

        // 如果既无真实图片又无文字描述，兜底保护
        if (!hasRealImg && !descText) {
            return `<div style="padding:10px 14px;background:#ededed;border-radius:8px;font-size:13px;color:#888;">[空图片消息]</div>`;
        }

        const safeImgUrl = escapeHtml(imgUrl);
        const safeDescText = escapeHtml(descText).replace(/"/g, '&quot;');

        // 正面渲染内容：若有真实图片，正面为纯净图片；若是纯文字描绘图，展示微信原生极简温润微缩卡
        let bubbleContent = '';
        if (hasRealImg) {
            bubbleContent = `
                <div style="position:relative;width:100%;height:100%;border-radius:8px;overflow:hidden;">
                    <img src="${safeImgUrl}" style="width:100%;height:auto;max-height:220px;object-fit:cover;display:block;border-radius:8px;" onerror="this.onerror=null;this.src='assets/icons/chat.png';" />
                    ${descText ? `
                        <div style="position:absolute;bottom:4px;right:6px;background:rgba(0,0,0,0.65);color:#fff;font-size:9.5px;padding:2px 6px;border-radius:4px;backdrop-filter:blur(2px);display:flex;align-items:center;gap:3px;pointer-events:none;">
                            <svg viewBox="0 0 24 24" style="width:10px;height:10px;fill:none;stroke:#07c160;stroke-width:2;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                            <span>图文</span>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            bubbleContent = `
                <div style="width:100%;min-height:110px;background:linear-gradient(135deg, #ffffff, #f7f9fa);border:0.5px solid #e2e8f0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px;box-sizing:border-box;text-align:center;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
                    <svg viewBox="0 0 24 24" style="width:28px;height:28px;fill:none;stroke:#07c160;stroke-width:1.8;margin-bottom:6px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span style="font-size:12.5px;color:#181818;font-weight:600;">点击查看图片与描绘</span>
                    <span style="font-size:10px;color:#9ca3af;margin-top:2px;">沉浸式大图</span>
                </div>
            `;
        }

        return `
            <div class="wechat-image-lightbox-trigger" 
                 data-img-url="${safeImgUrl}" 
                 data-desc-text="${safeDescText}" 
                 onclick="window.openChatImageViewer('${safeImgUrl}', '${safeDescText}', '图片详情')" 
                 style="width:100%;max-width:210px;cursor:pointer;-webkit-user-select:none;user-select:none;box-shadow:0 1.5px 6px rgba(0,0,0,0.06);border-radius:8px;overflow:hidden;background:#fff;">
                ${bubbleContent}
            </div>
        `;
    };

})();
