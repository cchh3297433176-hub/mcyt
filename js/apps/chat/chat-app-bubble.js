/**
 * js/apps/chat/chat-app-bubble.js
 * 💬 微信主应用 · 拆分分片 4/7：消息气泡长按操作菜单（openBubbleActionSheet）、长按引用/取消引用、
 *    编辑消息、删除消息、撤回消息（单次偷窥脱敏）、语音输入弹窗。
 * ⚠️ 拆分自 chat-app.js，仅做物理搬家，不改动任何函数内部逻辑。
 */

(function() {
    'use strict';

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
        else if (msg.type === 'image_flip' || msg.type === 'image_text_only' || msg.imageDesc) summaryText = `[图片] ${msg.imageDesc || msg.text || ''}`;
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

            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        });
    };

})();
