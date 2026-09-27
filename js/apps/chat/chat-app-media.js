/**
 * js/apps/chat/chat-app-media.js
 * 💬 微信主应用 · 拆分分片 7/7：聊天发图片（3 种模式 + 独立视觉识图勾选框）、隐藏屏幕对话框切换、发送表情、单聊文字发送、
 *    底部Tab入口（switchChatTab / openChat / closeChat）。
 * 🛡️ 微信原生白灰微绿设计，无红黑偏移阴影，清晰舒适护眼。
 */

(function() {
    'use strict';

    // 📷 聊天发图片（带真实图识图 AI 勾选开关）
    window.openChatSendImageModal = function(type, id) {
        let chatSendMode = 'text_only';
        let uploadedChatImg = null;

        window.openWechatCleanModal('发送图片消息', `
            <div style="text-align:left;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#222222;">
                <div style="font-size:12px;color:#555555;margin-bottom:6px;font-weight:600;">选择发图模式：</div>
                <div style="display:flex;gap:6px;margin-bottom:12px;">
                    <button type="button" id="btnChatModeText" class="moment-mode-tab-btn active" onclick="window._switchChatSendMode('text_only')">① 文字代替图片</button>
                    <button type="button" id="btnChatModeReal" class="moment-mode-tab-btn" onclick="window._switchChatSendMode('real_only')">② 纯真实图片</button>
                    <button type="button" id="btnChatModeBoth" class="moment-mode-tab-btn" onclick="window._switchChatSendMode('real_with_desc')">③ 真实图+文字描绘</button>
                </div>

                <div id="panelChatTextOnly" style="display:block;">
                    <div style="font-size:11.5px;color:#666666;margin-bottom:4px;">填写画面描绘（点击卡片翻转查看）：</div>
                    <textarea id="wchatFlipDescInput" rows="3" placeholder="例如：我在平原建造好的两层原木别墅、箱子里的整整一组下界合金锭..." class="wechat-clean-input" style="line-height:1.5;resize:none;color:#222;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:6px;padding:8px;box-sizing:border-box;width:100%;"></textarea>
                </div>

                <div id="panelChatRealImg" style="display:none;">
                    <div style="margin-bottom:8px;">
                        <label style="border:1px dashed #07c160;background:#f0f9eb;color:#07c160;padding:10px;border-radius:6px;font-size:13px;font-weight:600;text-align:center;cursor:pointer;display:block;">
                            <span>从手机相册选择图片</span>
                            <input type="file" id="wchatFileInput" accept="image/*" style="display:none;">
                        </label>
                        <div id="wchatFilePreviewWrap" style="display:none;text-align:center;margin-top:8px;">
                            <img id="wchatFilePreview" src="" style="max-height:100px;border-radius:6px;object-fit:cover;border:1px solid #e0e0e0;">
                        </div>
                    </div>
                </div>

                <div id="panelChatExtraDesc" style="display:none;">
                    <div style="font-size:11.5px;color:#666666;margin-bottom:4px;">向对方描述图片内容（极省 Token）：</div>
                    <textarea id="wchatRealDescInput" rows="2" placeholder="向AI描述图片中的关键画面（如：我的血量只剩半颗心，正在被苦力怕追赶）" class="wechat-clean-input" style="line-height:1.5;resize:none;color:#222;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:6px;padding:8px;box-sizing:border-box;width:100%;"></textarea>
                </div>

                <!-- 🌟 针对真实图片的识图 AI 勾选开关 -->
                <div id="panelChatVisionAiToggleWrap" style="display:none;margin-top:10px;padding:8px 10px;background:#f9f9f9;border-radius:6px;border:1px solid #eeeeee;">
                    <label style="display:flex;align-items:center;gap:7px;font-size:12px;color:#222222;font-weight:600;cursor:pointer;user-select:none;">
                        <input type="checkbox" id="wchatUseVisionAiToggle" checked style="width:15px;height:15px;accent-color:#07c160;">
                        <span>启用独立识图 AI 辅助解析画面</span>
                    </label>
                    <div style="font-size:10.5px;color:#888888;margin-top:2px;margin-left:22px;line-height:1.4;">
                        勾选后，系统将自动调用视觉模型提炼相片细节，免去手动打字描述。
                    </div>
                </div>
            </div>
        `, () => {
            const time = new Date().toLocaleTimeString().slice(0, 5);
            const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };
            const useVision = !!document.getElementById('wchatUseVisionAiToggle')?.checked;
            let msgObj = null;

            if (chatSendMode === 'text_only') {
                const desc = document.getElementById('wchatFlipDescInput').value.trim();
                if (!desc) {
                    if (typeof showToast === 'function') showToast('请填写画面描绘', 'error');
                    return false;
                }
                msgObj = {
                    _id: 'cmsg_' + Date.now() + '_' + Math.floor(Math.random() * 8999 + 1000),
                    from: 'player',
                    isPlayer: true,
                    type: 'image_flip',
                    imageDesc: desc,
                    imageUrl: 'assets/icons/chat.png',
                    text: `[图片描述: ${desc}]`,
                    senderName: curAcc.name,
                    time,
                    timestamp: Date.now(),
                    quote: window._activeQuoteMessage ? Object.assign({}, window._activeQuoteMessage) : null
                };
            } else if (chatSendMode === 'real_only') {
                if (!uploadedChatImg) {
                    if (typeof showToast === 'function') showToast('请从相册选择图片', 'error');
                    return false;
                }
                msgObj = {
                    _id: 'cmsg_' + Date.now() + '_' + Math.floor(Math.random() * 8999 + 1000),
                    from: 'player',
                    isPlayer: true,
                    type: 'image',
                    imageUrl: uploadedChatImg,
                    imageDesc: null,
                    useVision: useVision,
                    text: '[图片]',
                    senderName: curAcc.name,
                    time,
                    timestamp: Date.now(),
                    quote: window._activeQuoteMessage ? Object.assign({}, window._activeQuoteMessage) : null
                };
            } else if (chatSendMode === 'real_with_desc') {
                if (!uploadedChatImg) {
                    if (typeof showToast === 'function') showToast('请从相册选择图片', 'error');
                    return false;
                }
                const desc = document.getElementById('wchatRealDescInput').value.trim() || 'MC生活截图';
                msgObj = {
                    _id: 'cmsg_' + Date.now() + '_' + Math.floor(Math.random() * 8999 + 1000),
                    from: 'player',
                    isPlayer: true,
                    type: 'image',
                    imageUrl: uploadedChatImg,
                    imageDesc: desc,
                    useVision: useVision,
                    text: `[图片] ${desc}`,
                    senderName: curAcc.name,
                    time,
                    timestamp: Date.now(),
                    quote: window._activeQuoteMessage ? Object.assign({}, window._activeQuoteMessage) : null
                };
            }

            window._activeQuoteMessage = null;

            if (type === 'single') {
                window.pushChatMessageSafe(id, msgObj, curAcc.id);
                if (msgObj.imageDesc && typeof depositRememoriEvidence === 'function') {
                    depositRememoriEvidence(id, curAcc.id, `${curAcc.name}[发送了图片]: ${msgObj.imageDesc}`);
                }
            } else {
                if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
                if (!window.G.groupChatHistory[id]) window.G.groupChatHistory[id] = [];
                window.G.groupChatHistory[id].push(msgObj);
                if (typeof window.syncGroupChatsToLocalBackup === 'function') window.syncGroupChatsToLocalBackup();
            }

            window._plusDrawerOpen = false;
            if (type === 'single') renderSingleChatWindow();
            else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        });

        window._switchChatSendMode = function(mode) {
            chatSendMode = mode;
            const b1 = document.getElementById('btnChatModeText');
            const b2 = document.getElementById('btnChatModeReal');
            const b3 = document.getElementById('btnChatModeBoth');
            const pText = document.getElementById('panelChatTextOnly');
            const pReal = document.getElementById('panelChatRealImg');
            const pDesc = document.getElementById('panelChatExtraDesc');
            const pVisionToggle = document.getElementById('panelChatVisionAiToggleWrap');

            [b1, b2, b3].forEach(b => {
                if (b) {
                    b.style.background = '#f0f0f0';
                    b.style.color = '#555555';
                }
            });

            if (mode === 'text_only') {
                if (b1) { b1.style.background = '#07c160'; b1.style.color = '#fff'; }
                if (pText) pText.style.display = 'block';
                if (pReal) pReal.style.display = 'none';
                if (pDesc) pDesc.style.display = 'none';
                if (pVisionToggle) pVisionToggle.style.display = 'none';
            } else if (mode === 'real_only') {
                if (b2) { b2.style.background = '#07c160'; b2.style.color = '#fff'; }
                if (pText) pText.style.display = 'none';
                if (pReal) pReal.style.display = 'block';
                if (pDesc) pDesc.style.display = 'none';
                if (pVisionToggle) pVisionToggle.style.display = 'block';
            } else if (mode === 'real_with_desc') {
                if (b3) { b3.style.background = '#07c160'; b3.style.color = '#fff'; }
                if (pText) pText.style.display = 'none';
                if (pReal) pReal.style.display = 'block';
                if (pDesc) pDesc.style.display = 'block';
                if (pVisionToggle) pVisionToggle.style.display = 'block';
            }
        };

        setTimeout(() => {
            window._switchChatSendMode('text_only');

            const input = document.getElementById('wchatFileInput');
            const pWrap = document.getElementById('wchatFilePreviewWrap');
            const pImg = document.getElementById('wchatFilePreview');
            if (input) {
                input.onchange = (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        uploadedChatImg = evt.target.result;
                        if (pImg) pImg.src = uploadedChatImg;
                        if (pWrap) pWrap.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                };
            }
        }, 30);
    };

    window.toggleBehindScreen = function(npcId) {
        if (!window.G._behindScreenActive) window.G._behindScreenActive = {};
        window.G._behindScreenActive[npcId] = !window.G._behindScreenActive[npcId];
        const status = window.G._behindScreenActive[npcId];
        if (typeof showToast === 'function') showToast(status ? '已开启动作感知' : '已关闭动作感知', 'info', 1200);
        renderSingleChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.sendChatSticker = function(type, id, url, desc) {
        const time = new Date().toLocaleTimeString().slice(0, 5);
        const quote = window._activeQuoteMessage ? Object.assign({}, window._activeQuoteMessage) : null;
        window._activeQuoteMessage = null;

        const stickerMsg = {
            _id: 'cmsg_' + Date.now() + '_' + Math.floor(Math.random() * 8999 + 1000),
            from: 'player',
            isPlayer: true,
            type: 'sticker',
            stickerUrl: url,
            stickerDesc: desc,
            text: `[表情: ${desc}]`,
            time,
            timestamp: Date.now(),
            quote
        };

        if (type === 'single') {
            const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
            if (window.isAccountBlockedByNpc(id, curAcc.id)) {
                if (typeof showToast === 'function') showToast('对方已拒收你的消息', 'error');
                return;
            }
            window.pushChatMessageSafe(id, stickerMsg, curAcc.id);
        } else {
            if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
            if (!window.G.groupChatHistory[id]) window.G.groupChatHistory[id] = [];
            window.G.groupChatHistory[id].push(stickerMsg);
            if (typeof window.syncGroupChatsToLocalBackup === 'function') window.syncGroupChatsToLocalBackup();
        }
        window._stickerDrawerOpen = false;
        if (type === 'single') renderSingleChatWindow();
        else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.doSendSingleChat = function(npcId) {
        const input = document.getElementById('singleChatInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };

        const quote = window._activeQuoteMessage ? Object.assign({}, window._activeQuoteMessage) : null;
        window._activeQuoteMessage = null;

        if (window.isAccountBlockedByNpc(npcId, curAcc.id)) {
            window.pushChatMessageSafe(npcId, { from: 'player', isPlayer: true, text, time: new Date().toLocaleTimeString().slice(0, 5), timestamp: Date.now(), quote }, curAcc.id);
            window.pushChatMessageSafe(npcId, { from: 'action', text: `消息已被拒收`, time: new Date().toLocaleTimeString().slice(0, 5), timestamp: Date.now() }, curAcc.id);
            input.value = '';
            renderSingleChatWindow();
            return;
        }

        window.pushChatMessageSafe(npcId, { from: 'player', isPlayer: true, text, time: new Date().toLocaleTimeString().slice(0, 5), timestamp: Date.now(), quote }, curAcc.id);
        if (typeof depositRememoriEvidence === 'function') {
            depositRememoriEvidence(npcId, curAcc.id, `${curAcc.name}: ${text}`);
        }
        input.value = '';
        renderSingleChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.switchChatTab = function(tab) {
        window.G.chatActiveTab = (tab === 'direct' ? 'direct' : 'group');
        window.G.currentChatNpc = null;
        window.G.currentChatGroup = null;
        renderChatApp();
    };

    window.openChat = function(npcId) {
        if (!window.G.npcs || !window.G.npcs[npcId]) return;
        window.G.currentChatNpc = npcId;
        window._stickerDrawerOpen = false;
        window._plusDrawerOpen = false;
        window._activeQuoteMessage = null;
        renderChatApp();
    };

    window.closeChat = function() {
        window.G.currentChatNpc = null;
        window._stickerDrawerOpen = false;
        window._plusDrawerOpen = false;
        window._activeQuoteMessage = null;
        renderChatApp();
    };

})();
