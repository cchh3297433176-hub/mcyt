/**
 * js/apps/chat/chat-app-bubble.js
 * 💬 微信主应用 · 拆分分片 4/7：消息气泡长按操作菜单（openBubbleActionSheet）、长按引用/取消引用、
 *    编辑消息、删除消息、撤回消息（单次偷窥脱敏）、语音输入弹窗、
 *    以及原生微信直显图片 3D 平滑翻转查看背面文字引擎（彻底去除拍立得边框与右下角描述）。
 */

(function() {
    'use strict';

    // 🔄 微信原生直显图片 3D 平滑翻转引擎（正面纯净大图，背面文字描绘，无拍立得相纸与右下角浮字）
    window.toggleChatImageFlip = function(cardWrapper) {
        if (!cardWrapper) return;
        const flipper = cardWrapper.querySelector('.wechat-image-flipper-inner');
        if (!flipper) return;

        const isFlipped = cardWrapper.getAttribute('data-flipped') === 'true';
        if (isFlipped) {
            flipper.style.transform = 'rotateY(0deg)';
            cardWrapper.setAttribute('data-flipped', 'false');
        } else {
            flipper.style.transform = 'rotateY(180deg)';
            cardWrapper.setAttribute('data-flipped', 'true');
        }
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

    // 🖼️ 微信原生纯净直显图片气泡渲染器（支持真实图片或文字描绘翻转，去拍立得相框与右下角小字）
    window.renderWechatPureImageBubbleHTML = function(msg) {
        const descText = msg.imageDesc || msg.text || '';
        const hasRealImg = !!(msg.imageUrl || msg.url);
        const imgUrl = msg.imageUrl || msg.url || '';

        // 如果既无真实图片又无文字描述，兜底保护
        if (!hasRealImg && !descText) {
            return `<div style="padding:10px 14px;background:#ededed;border-radius:8px;font-size:13px;color:#888;">[空图片消息]</div>`;
        }

        // 正面渲染内容：若是纯文字描绘图，正面展示微信原生极简纯净画面微缩卡；若有真实图片，正面为纯净图片
        const frontContent = hasRealImg ? `
            <img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:8px;" onerror="this.onerror=null;this.src='assets/icons/chat.png';" />
        ` : `
            <div style="width:100%;height:100%;min-height:140px;background:linear-gradient(135deg, #f3f4f6, #e5e7eb);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;text-align:center;border-radius:8px;">
                <svg viewBox="0 0 24 24" style="width:32px;height:32px;fill:none;stroke:#9ca3af;stroke-width:1.8;margin-bottom:8px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span style="font-size:12px;color:#6b7280;font-weight:500;">点击翻转查看画面描写</span>
            </div>
        `;

        // 背面渲染内容：纯粹展示文字描述，带有原生微信白灰微绿的温润质感
        const backContent = `
            <div style="width:100%;height:100%;min-height:140px;background:#2c2c2c;color:#f3f3f3;padding:14px 16px;box-sizing:border-box;border-radius:8px;display:flex;flex-direction:column;justify-content:space-between;text-align:left;overflow-y:auto;">
                <div style="font-size:12.5px;line-height:1.5;color:#f9fafb;word-break:break-word;">
                    ${escapeHtml(descText || '暂无画面文字描述')}
                </div>
                <div style="font-size:10px;color:#9ca3af;text-align:right;margin-top:10px;letter-spacing:0.3px;">
                    点击翻回正面 ↺
                </div>
            </div>
        `;

        return `
            <div class="wechat-image-flipper-container" data-flipped="false" onclick="window.toggleChatImageFlip(this)" style="perspective:1000px;width:100%;max-width:210px;cursor:pointer;-webkit-user-select:none;user-select:none;">
                <div class="wechat-image-flipper-inner" style="position:relative;width:100%;transition:transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);transform-style:preserve-3d;border-radius:8px;">
                    <!-- 正面 -->
                    <div class="wechat-image-flipper-front" style="width:100%;-webkit-backface-visibility:hidden;backface-visibility:hidden;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);background:#fff;display:block;">
                        ${frontContent}
                    </div>
                    <!-- 背面 -->
                    <div class="wechat-image-flipper-back" style="position:absolute;top:0;left:0;width:100%;height:100%;-webkit-backface-visibility:hidden;backface-visibility:hidden;transform:rotateY(180deg);border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.12);">
                        ${backContent}
                    </div>
                </div>
            </div>
        `;
    };

})();
