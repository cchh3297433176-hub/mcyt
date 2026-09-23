/**
 * js/apps/chat/chat-card.js
 * 📇 微信名片与人设资料设置独立模块
 * 职责：
 * 1. 角色极简原生名片卡（仅保留必要信息，头像精准保活）
 * 2. 右上角「装扮中心」：支持【我的装扮】与【对方装扮】双轨分流
 * 3. 头像框缩略图折叠栏试穿预览（点击试穿，再次点击卸下）
 * 4. 彻底消除杂乱 emoji，保持原生微信极简白灰微绿
 * 5. 🌟 角色专属 TTS 语音音色配置：增加【一键拉取并点选 CloneTTS 音色】按钮
 */

(function() {
    'use strict';

    function formatFavorNumber(val) {
        const num = parseFloat(val) || 0;
        return Number.isInteger(num) ? num.toString() : num.toFixed(1);
    }

    function getShapeBorderRadius(shape) {
        if (shape === 'circle') return '50%';
        if (shape === 'squircle') return '8px';
        if (shape === 'square') return '2px';
        return '8px';
    }

    // 辅助获取装扮池
    function getStoredFramesList() {
        return (typeof window.getStoredDecorFrames === 'function')
            ? window.getStoredDecorFrames()
            : [{ id: 'frame_none', name: '无头像框', url: '', scale: 1.15 }];
    }

    function getStoredBubblesList() {
        return (typeof window.getStoredDecorBubbles === 'function')
            ? window.getStoredDecorBubbles()
            : [{ id: 'bubble_default', name: '原生微信白灰微绿', type: 'css' }];
    }

    // 📇 极简微信名片卡
    function openNpcProfileCardModal(npcId) {
        if (!window.G || !window.G.npcs) return;
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        const isDating = window.ChatPromptEngine && window.ChatPromptEngine.isNpcInDatingRelationship(npc);
        const sigText = npc.signature ? escapeHtml(npc.signature) : '未设置个性签名';
        const hasRemark = !!(npc.remark && npc.remark.trim());
        const primaryName = hasRemark ? escapeHtml(npc.remark.trim()) : escapeHtml(npc.name || npc.id);
        const subNameHtml = hasRemark ? `<div style="font-size:12px;color:#888888;margin-top:2px;">原名：${escapeHtml(npc.name || '')}</div>` : '';
        const curFavor = parseFloat(npc.favor !== undefined ? npc.favor : 50);
        const favorText = `${formatFavorNumber(curFavor)} (${isDating ? '恋人' : (curFavor >= 80 ? '暧昧期' : '朋友')})`;

        const decor = (npc.chatSettings && npc.chatSettings.decor) || {};
        const globalShape = localStorage.getItem('mcyt_active_avatar_shape') || 'circle';
        const avatarShape = decor.avatarShape || globalShape;
        const borderRadius = getShapeBorderRadius(avatarShape);

        let frameUrl = '';
        let frameScale = 1.18;
        const frames = getStoredFramesList();

        if (decor.frameId && decor.frameId !== 'frame_none') {
            const f = frames.find(x => x.id === decor.frameId);
            if (f && f.url) { frameUrl = f.url; frameScale = f.scale || 1.18; }
        } else if (!decor.frameId) {
            const globalFrameId = localStorage.getItem('mcyt_active_decor_frame') || 'frame_none';
            const f = frames.find(x => x.id === globalFrameId);
            if (f && f.url) { frameUrl = f.url; frameScale = f.scale || 1.18; }
        }

        const avatarSrc = npc.avatarUrl || npc.avatar || 'assets/icons/chat.png';

        let mask = document.createElement('div');
        mask.className = 'wechat-clean-modal-mask';
        mask.innerHTML = `
            <div class="wechat-clean-modal-card" style="max-width:320px;padding:20px 18px;position:relative;background:#ffffff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.12);box-sizing:border-box;">
                <div style="position:absolute;top:14px;right:14px;display:flex;align-items:center;gap:6px;">
                    <button type="button" id="btnNpcCardDecor" title="装扮设置" style="border:none;background:none;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;color:#07c160;">
                        <svg viewBox="0 0 24 24" style="width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;">
                            <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>
                        </svg>
                    </button>
                    <button type="button" id="btnNpcCardGear" title="资料设置" style="border:none;background:none;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;color:#707070;">
                        <svg viewBox="0 0 24 24" style="width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                </div>

                <div style="display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:0.5px solid #f0f0f0;margin-bottom:14px;padding-right:65px;">
                    <div style="position:relative;width:56px;height:56px;flex-shrink:0;cursor:pointer;" onclick="window.triggerChangeNpcAvatar('${npcId}')" title="更换头像">
                        <img id="npcCardAvatarDisplay" src="${avatarSrc}" style="width:100%;height:100%;border-radius:${borderRadius};object-fit:cover;display:block;" onerror="this.src='assets/icons/chat.png';" />
                        ${frameUrl ? `<img src="${frameUrl}" style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%) scale(${frameScale});width:100%;height:100%;pointer-events:none;" onerror="this.style.display='none';" />` : ''}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:16.5px;font-weight:600;color:#181818;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${primaryName}
                        </div>
                        ${subNameHtml}
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:18px;font-size:13px;color:#222;">
                    <div style="display:flex;align-items:flex-start;gap:10px;">
                        <span style="color:#888;flex-shrink:0;min-width:44px;">签名</span>
                        <span style="color:${npc.signature ? '#333' : '#aaa'};line-height:1.45;word-break:break-word;flex:1;">${sigText}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="color:#888;flex-shrink:0;min-width:44px;">地区</span>
                        <span style="color:#333;font-weight:500;">${escapeHtml(npc.region || '中国')}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="color:#888;flex-shrink:0;min-width:44px;">好感</span>
                        <span style="color:#07c160;font-weight:600;">${favorText}</span>
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;">
                    <button type="button" id="btnNpcCardSendMsg" style="border:none;background:#07c160;color:#fff;padding:9px;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;text-align:center;">
                        发消息
                    </button>
                    <button type="button" id="btnNpcCardBack" style="border:none;background:#f2f2f2;color:#555;padding:8px;border-radius:6px;font-size:13px;cursor:pointer;">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(mask);
        const close = () => { if (mask && mask.parentNode) mask.parentNode.removeChild(mask); };

        mask.querySelector('#btnNpcCardBack').onclick = close;
        mask.querySelector('#btnNpcCardSendMsg').onclick = () => {
            close();
            if (typeof window.openChat === 'function') window.openChat(npcId);
        };
        mask.querySelector('#btnNpcCardDecor').onclick = () => {
            close();
            openNpcDecorModal(npcId);
        };
        mask.querySelector('#btnNpcCardGear').onclick = () => {
            close();
            openNpcSettingsModal(npcId);
        };
    }
    window.openNpcProfileCardModal = openNpcProfileCardModal;

    // 🎨 装扮弹窗
    function openNpcDecorModal(npcId) {
        if (!window.G || !window.G.npcs) return;
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        if (!npc.chatSettings) npc.chatSettings = {};
        if (!npc.chatSettings.decor) npc.chatSettings.decor = {};

        let activeDecorTarget = 'npc';

        const frames = getStoredFramesList();
        const bubbles = getStoredBubblesList();

        let npcShape = npc.chatSettings.decor.avatarShape || 'inherit';
        let npcFrameId = npc.chatSettings.decor.frameId !== undefined ? npc.chatSettings.decor.frameId : 'inherit';
        let npcBubbleId = npc.chatSettings.decor.bubbleId !== undefined ? npc.chatSettings.decor.bubbleId : 'inherit';

        let userShape = localStorage.getItem('mcyt_active_avatar_shape') || 'circle';
        let userFrameId = localStorage.getItem('mcyt_active_decor_frame') || 'frame_none';
        let userBubbleId = localStorage.getItem('mcyt_active_decor_bubble') || 'bubble_default';

        const userAvatar = (typeof window.getPlayerAvatarSafe === 'function') ? window.getPlayerAvatarSafe() : 'assets/icons/chat.png';
        const npcAvatar = npc.avatarUrl || npc.avatar || 'assets/icons/chat.png';

        let mask = document.createElement('div');
        mask.className = 'wechat-clean-modal-mask';

        function renderDecorModalInner() {
            const isUser = (activeDecorTarget === 'user');
            const curAvatar = isUser ? userAvatar : npcAvatar;
            const curShape = isUser ? userShape : (npcShape === 'inherit' ? userShape : npcShape);
            const curFrameId = isUser ? userFrameId : (npcFrameId === 'inherit' ? userFrameId : npcFrameId);
            const curBubbleId = isUser ? userBubbleId : (npcBubbleId === 'inherit' ? userBubbleId : npcBubbleId);

            const curFrameObj = frames.find(f => f.id === curFrameId);
            const curFrameUrl = (curFrameObj && curFrameObj.url) ? curFrameObj.url : '';
            const curFrameScale = (curFrameObj && curFrameObj.scale) ? curFrameObj.scale : 1.18;

            mask.innerHTML = `
                <div class="wechat-clean-modal-card" style="max-width:340px;padding:16px;position:relative;background:#ffffff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.14);box-sizing:border-box;max-height:88vh;display:flex;flex-direction:column;">
                    <div style="font-size:14.5px;font-weight:600;color:#181818;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                        <span>装扮设置</span>
                        <button type="button" id="btnDecorModalX" style="border:none;background:#f2f2f2;border-radius:50%;width:22px;height:22px;color:#777;cursor:pointer;font-size:12px;">✕</button>
                    </div>

                    <div style="display:flex;background:#f2f2f2;border-radius:8px;padding:2px;margin-bottom:12px;">
                        <button type="button" id="tabTargetNpc" style="flex:1;padding:6px 0;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer;background:${!isUser ? '#ffffff' : 'transparent'};color:${!isUser ? '#07c160' : '#666'};">
                            角色「${escapeHtml(npc.name || 'NPC')}」
                        </button>
                        <button type="button" id="tabTargetUser" style="flex:1;padding:6px 0;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer;background:${isUser ? '#ffffff' : 'transparent'};color:${isUser ? '#07c160' : '#666'};">
                            我方（用户自身）
                        </button>
                    </div>

                    <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding-right:2px;">
                        <div style="background:#f7f7f7;border-radius:8px;padding:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                            <div style="position:relative;width:54px;height:54px;">
                                <img src="${curAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:${getShapeBorderRadius(curShape)};display:block;" onerror="this.src='assets/icons/chat.png';" />
                                ${curFrameUrl ? `<img src="${curFrameUrl}" style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%) scale(${curFrameScale});width:100%;height:100%;pointer-events:none;" />` : ''}
                            </div>
                            <span style="font-size:11px;color:#777;margin-top:6px;">${curFrameUrl ? (curFrameObj.name || '已选框') : '未穿戴头像框'}</span>
                        </div>

                        <div>
                            <div style="font-size:12px;font-weight:600;color:#444;margin-bottom:6px;">头像形状：</div>
                            <div style="display:flex;gap:6px;">
                                ${!isUser ? `<button type="button" class="opt-shape-btn" data-val="inherit" style="flex:1;padding:6px 0;font-size:11px;border-radius:6px;border:1px solid ${npcShape === 'inherit' ? '#07c160' : '#e0e0e0'};background:${npcShape === 'inherit' ? '#e8f7ed' : '#fff'};color:${npcShape === 'inherit' ? '#07c160' : '#444'};cursor:pointer;">跟随全局</button>` : ''}
                                <button type="button" class="opt-shape-btn" data-val="circle" style="flex:1;padding:6px 0;font-size:11px;border-radius:6px;border:1px solid ${(isUser ? userShape : npcShape) === 'circle' ? '#07c160' : '#e0e0e0'};background:${(isUser ? userShape : npcShape) === 'circle' ? '#e8f7ed' : '#fff'};color:${(isUser ? userShape : npcShape) === 'circle' ? '#07c160' : '#444'};cursor:pointer;">正圆</button>
                                <button type="button" class="opt-shape-btn" data-val="squircle" style="flex:1;padding:6px 0;font-size:11px;border-radius:6px;border:1px solid ${(isUser ? userShape : npcShape) === 'squircle' ? '#07c160' : '#e0e0e0'};background:${(isUser ? userShape : npcShape) === 'squircle' ? '#e8f7ed' : '#fff'};color:${(isUser ? userShape : npcShape) === 'squircle' ? '#07c160' : '#444'};cursor:pointer;">圆角方</button>
                                <button type="button" class="opt-shape-btn" data-val="square" style="flex:1;padding:6px 0;font-size:11px;border-radius:6px;border:1px solid ${(isUser ? userShape : npcShape) === 'square' ? '#07c160' : '#e0e0e0'};background:${(isUser ? userShape : npcShape) === 'square' ? '#e8f7ed' : '#fff'};color:${(isUser ? userShape : npcShape) === 'square' ? '#07c160' : '#444'};cursor:pointer;">直角方</button>
                            </div>
                        </div>

                        <div>
                            <div onclick="window.toggleCardDecorFramesCollapse()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;margin-bottom:6px;">
                                <span style="font-size:12px;font-weight:600;color:#444;">头像框（点击试穿，再次点击脱下）：</span>
                                <span id="cardDecorFramesArrow" style="font-size:11px;color:#07c160;font-weight:bold;">▼ 收起</span>
                            </div>

                            <div id="cardDecorFramesGrid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(64px, 1fr));gap:8px;">
                                ${!isUser ? `
                                    <div class="opt-frame-card" data-val="inherit" style="background:${npcFrameId === 'inherit' ? '#e8f7ed' : '#f9f9f9'};border:1px solid ${npcFrameId === 'inherit' ? '#07c160' : '#eee'};border-radius:8px;padding:6px 2px;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
                                        <div style="width:36px;height:36px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;font-size:10px;color:#777;margin-bottom:4px;">默认</div>
                                        <span style="font-size:10px;color:#333;">跟随全局</span>
                                    </div>
                                ` : ''}

                                ${frames.map(f => {
                                    const isSelected = (isUser ? userFrameId : npcFrameId) === f.id;
                                    const sVal = f.scale || 1.18;
                                    return `
                                        <div class="opt-frame-card" data-val="${f.id}" style="position:relative;background:${isSelected ? '#e8f7ed' : '#f9f9f9'};border:1px solid ${isSelected ? '#07c160' : '#eee'};border-radius:8px;padding:6px 2px;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
                                            <div style="position:relative;width:36px;height:36px;margin-bottom:4px;">
                                                <img src="${curAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" onerror="this.src='assets/icons/chat.png';" />
                                                ${f.url ? `<img src="${f.url}" style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%) scale(${sVal});width:100%;height:100%;pointer-events:none;" />` : ''}
                                            </div>
                                            <span style="font-size:10px;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:56px;text-align:center;">${escapeHtml(f.name)}</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <div>
                            <div style="font-size:12px;font-weight:600;color:#444;margin-bottom:6px;">气泡样式：</div>
                            <div style="display:flex;flex-direction:column;gap:6px;">
                                ${!isUser ? `
                                    <button type="button" class="opt-bubble-btn" data-val="inherit" style="padding:7px 10px;font-size:11.5px;border-radius:6px;border:1px solid ${npcBubbleId === 'inherit' ? '#07c160' : '#e0e0e0'};background:${npcBubbleId === 'inherit' ? '#e8f7ed' : '#fff'};color:${npcBubbleId === 'inherit' ? '#07c160' : '#444'};cursor:pointer;text-align:left;display:flex;justify-content:space-between;">
                                        <span>跟随全局装扮</span>
                                        ${npcBubbleId === 'inherit' ? '<span style="color:#07c160;font-weight:bold;">✓</span>' : ''}
                                    </button>
                                ` : ''}
                                ${bubbles.map(b => {
                                    const isBSelected = (isUser ? userBubbleId : npcBubbleId) === b.id;
                                    return `
                                        <button type="button" class="opt-bubble-btn" data-val="${b.id}" style="padding:7px 10px;font-size:11.5px;border-radius:6px;border:1px solid ${isBSelected ? '#07c160' : '#e0e0e0'};background:${isBSelected ? '#e8f7ed' : '#fff'};color:${isBSelected ? '#07c160' : '#444'};cursor:pointer;text-align:left;display:flex;justify-content:space-between;">
                                            <span>${escapeHtml(b.name)}</span>
                                            ${isBSelected ? '<span style="color:#07c160;font-weight:bold;">✓</span>' : ''}
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;margin-top:12px;">
                        <button type="button" id="btnSaveDecorChoice" style="flex:1;padding:8px;background:#07c160;border:none;border-radius:6px;color:#fff;font-size:12.5px;font-weight:600;cursor:pointer;">保存装扮</button>
                        <button type="button" id="btnCancelDecorChoice" style="flex:1;padding:8px;background:#f2f2f2;border:none;border-radius:6px;color:#555;font-size:12.5px;cursor:pointer;">返回名片</button>
                    </div>
                </div>
            `;

            mask.querySelector('#tabTargetNpc').onclick = () => { activeDecorTarget = 'npc'; renderDecorModalInner(); };
            mask.querySelector('#tabTargetUser').onclick = () => { activeDecorTarget = 'user'; renderDecorModalInner(); };

            mask.querySelectorAll('.opt-shape-btn').forEach(btn => {
                btn.onclick = () => {
                    const val = btn.getAttribute('data-val');
                    if (isUser) userShape = val;
                    else npcShape = val;
                    renderDecorModalInner();
                };
            });

            mask.querySelectorAll('.opt-frame-card').forEach(card => {
                card.onclick = () => {
                    const val = card.getAttribute('data-val');
                    if (isUser) {
                        userFrameId = (userFrameId === val) ? 'frame_none' : val;
                    } else {
                        npcFrameId = (npcFrameId === val) ? 'frame_none' : val;
                    }
                    renderDecorModalInner();
                };
            });

            mask.querySelectorAll('.opt-bubble-btn').forEach(btn => {
                btn.onclick = () => {
                    const val = btn.getAttribute('data-val');
                    if (isUser) userBubbleId = val;
                    else npcBubbleId = val;
                    renderDecorModalInner();
                };
            });

            mask.querySelector('#btnDecorModalX').onclick = () => { mask.remove(); openNpcProfileCardModal(npcId); };
            mask.querySelector('#btnCancelDecorChoice').onclick = () => { mask.remove(); openNpcProfileCardModal(npcId); };

            mask.querySelector('#btnSaveDecorChoice').onclick = () => {
                localStorage.setItem('mcyt_active_avatar_shape', userShape);
                localStorage.setItem('mcyt_active_decor_frame', userFrameId);
                localStorage.setItem('mcyt_active_decor_bubble', userBubbleId);

                npc.chatSettings.decor = {
                    avatarShape: npcShape === 'inherit' ? null : npcShape,
                    frameId: npcFrameId === 'inherit' ? null : npcFrameId,
                    bubbleId: npcBubbleId === 'inherit' ? null : npcBubbleId
                };

                if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
                if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                if (typeof showToast === 'function') showToast('装扮配置已保存');

                mask.remove();
                openNpcProfileCardModal(npcId);
                if (window.G.currentChatNpc === npcId && typeof window.renderSingleChatWindow === 'function') {
                    window.renderSingleChatWindow();
                }
            };
        }

        window.toggleCardDecorFramesCollapse = function () {
            const grid = document.getElementById('cardDecorFramesGrid');
            const arrow = document.getElementById('cardDecorFramesArrow');
            if (!grid || !arrow) return;
            const isHidden = (grid.style.display === 'none');
            grid.style.display = isHidden ? 'grid' : 'none';
            arrow.textContent = isHidden ? '▼ 收起' : '▶ 展开';
        };

        renderDecorModalInner();
        document.body.appendChild(mask);
    }
    window.openNpcDecorModal = openNpcDecorModal;

    // ⚙️ 角色资料设置弹窗（含一键选择 CloneTTS 音色菜单）
    function openNpcSettingsModal(npcId) {
        if (!window.G || !window.G.npcs) return;
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        const isDating = window.ChatPromptEngine && window.ChatPromptEngine.isNpcInDatingRelationship(npc);
        const regionList = ['中国', '美国 - 东部', '美国 - 西部', '英国', '西班牙', '日本', '韩国', '加拿大', '澳大利亚', '德国', '法国', '俄罗斯 - 莫斯科', '意大利', '新加坡', '泰国'];

        const regionOptionsHtml = regionList.map(r => `
            <option value="${r}" ${npc.region === r ? 'selected' : ''}>${r}</option>
        `).join('');

        if (!npc.chatSettings) {
            npc.chatSettings = {
                minMsgs: 1,
                maxMsgs: 3,
                voiceFreq: 'rare',
                disableTimezone: false,
                disableBilingual: false,
                tts: { voice: '', speed: 1.0 }
            };
        }
        const minMsgs = Math.max(1, parseInt(npc.chatSettings.minMsgs) || 1);
        const maxMsgs = Math.max(minMsgs, parseInt(npc.chatSettings.maxMsgs) || 3);
        const voiceFreq = npc.chatSettings.voiceFreq || 'rare';
        const disableTimezone = !!npc.chatSettings.disableTimezone;
        const disableBilingual = !!npc.chatSettings.disableBilingual;
        const curFavor = parseFloat(npc.favor !== undefined ? npc.favor : 50);

        const curTtsVoice = (npc.chatSettings.tts && npc.chatSettings.tts.voice) || '';
        const curTtsSpeed = (npc.chatSettings.tts && npc.chatSettings.tts.speed) || 1.0;

        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal('资料设置', `
                <div style="display:flex;flex-direction:column;gap:11px;text-align:left;max-height:68vh;overflow-y:auto;padding-right:2px;">
                    <div>
                        <label style="font-size:11.5px;color:#777;font-weight:500;">备注名</label>
                        <input type="text" id="wcleanSetNpcRemark" value="${escapeHtml(npc.remark || '')}" placeholder="添加备注名..." maxlength="20" class="wechat-clean-input" style="margin-top:3px;">
                    </div>
                    <div>
                        <label style="font-size:11.5px;color:#777;font-weight:500;">角色名字</label>
                        <input type="text" id="wcleanSetNpcName" value="${escapeHtml(npc.name || '')}" placeholder="输入角色真实名字..." maxlength="20" class="wechat-clean-input" style="margin-top:3px;">
                    </div>
                    <div>
                        <label style="font-size:11.5px;color:#777;font-weight:500;">个性签名</label>
                        <input type="text" id="wcleanSetNpcSignature" value="${escapeHtml(npc.signature || '')}" placeholder="角色的个性签名..." maxlength="60" class="wechat-clean-input" style="margin-top:3px;">
                    </div>
                    <div>
                        <label style="font-size:11.5px;color:#777;font-weight:500;">常驻地区</label>
                        <select id="wcleanSetNpcRegion" class="wechat-clean-input" style="margin-top:3px;">
                            ${regionOptionsHtml}
                        </select>
                    </div>

                    <div style="background:#f8f9fa;border-radius:8px;padding:10px 12px;border:0.5px solid #eee;display:flex;flex-direction:column;gap:10px;">
                        <div style="font-size:12px;font-weight:600;color:#181818;">聊天偏好与输出控制</div>

                        <div>
                            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:#666;margin-bottom:5px;">
                                <span>单次发送条数</span>
                                <span style="font-weight:600;color:#07c160;"><span id="wcleanMinMsgsLabel">${minMsgs}</span> 条 ~ <span id="wcleanMaxMsgsLabel">${maxMsgs}</span> 条</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="font-size:11px;color:#888;">最少</span>
                                <input type="range" id="wcleanMinMsgsRange" min="1" max="5" value="${minMsgs}" style="flex:1;accent-color:#07c160;">
                                <span style="font-size:11px;color:#888;">最多</span>
                                <input type="range" id="wcleanMaxMsgsRange" min="1" max="8" value="${maxMsgs}" style="flex:1;accent-color:#07c160;">
                            </div>
                        </div>

                        <div>
                            <div style="font-size:11.5px;color:#666;margin-bottom:5px;">语音发送频率</div>
                            <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;" id="voiceFreqSelectorGroup">
                                <button type="button" class="voice-freq-btn" data-val="never" style="padding:5px 0;border-radius:5px;font-size:11.5px;cursor:pointer;border:1px solid ${voiceFreq === 'never' ? '#07c160' : '#e0e0e0'};background:${voiceFreq === 'never' ? '#f0f9eb' : '#fff'};color:${voiceFreq === 'never' ? '#07c160' : '#444'};font-weight:${voiceFreq === 'never' ? '600' : 'normal'};">从不</button>
                                <button type="button" class="voice-freq-btn" data-val="rare" style="padding:5px 0;border-radius:5px;font-size:11.5px;cursor:pointer;border:1px solid ${voiceFreq === 'rare' ? '#07c160' : '#e0e0e0'};background:${voiceFreq === 'rare' ? '#f0f9eb' : '#fff'};color:${voiceFreq === 'rare' ? '#07c160' : '#444'};font-weight:${voiceFreq === 'rare' ? '600' : 'normal'};">偶尔</button>
                                <button type="button" class="voice-freq-btn" data-val="often" style="padding:5px 0;border-radius:5px;font-size:11.5px;cursor:pointer;border:1px solid ${voiceFreq === 'often' ? '#07c160' : '#e0e0e0'};background:${voiceFreq === 'often' ? '#f0f9eb' : '#fff'};color:${voiceFreq === 'often' ? '#07c160' : '#444'};font-weight:${voiceFreq === 'often' ? '600' : 'normal'};">经常</button>
                                <button type="button" class="voice-freq-btn" data-val="voice_only" style="padding:5px 0;border-radius:5px;font-size:11.5px;cursor:pointer;border:1px solid ${voiceFreq === 'voice_only' ? '#07c160' : '#e0e0e0'};background:${voiceFreq === 'voice_only' ? '#f0f9eb' : '#fff'};color:${voiceFreq === 'voice_only' ? '#07c160' : '#444'};font-weight:${voiceFreq === 'voice_only' ? '600' : 'normal'};">全语音</button>
                            </div>
                            <input type="hidden" id="wcleanSetVoiceFreqVal" value="${voiceFreq}">
                        </div>

                        <!-- 🌟 角色专属 TTS 语音音色设置（带一键点选菜单） -->
                        <div style="border-top:0.5px solid #eee;padding-top:8px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                                <div style="font-size:11.5px;font-weight:600;color:#333;">专属 TTS 语音音色</div>
                                <button type="button" id="btnPickTtsVoiceDirect" style="border:1px solid #07c160;background:#f0faf4;color:#07c160;font-size:11px;padding:2px 8px;border-radius:4px;cursor:pointer;font-weight:600;">选择音色 ▾</button>
                            </div>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <input type="text" id="wcleanSetNpcTtsVoice" value="${escapeHtml(curTtsVoice)}" placeholder="音色名/Voice ID (可点击右上角选择)" class="wechat-clean-input" style="flex:1;font-size:12px;">
                                <input type="number" id="wcleanSetNpcTtsSpeed" value="${curTtsSpeed}" step="0.1" min="0.5" max="2.0" placeholder="语速" class="wechat-clean-input" style="width:64px;font-size:12px;text-align:center;" title="语速倍率">
                            </div>
                        </div>

                        <div style="border-top:0.5px solid #eee;padding-top:8px;display:flex;flex-direction:column;gap:7px;">
                            <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;font-size:12px;color:#333;">
                                <span>关闭时差计算（作息完全步调一致）</span>
                                <input type="checkbox" id="wcleanSetDisableTimezone" ${disableTimezone ? 'checked' : ''} style="width:16px;height:16px;accent-color:#07c160;cursor:pointer;">
                            </label>
                            <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;font-size:12px;color:#333;">
                                <span>关闭双语对话（纯中文交流）</span>
                                <input type="checkbox" id="wcleanSetDisableBilingual" ${disableBilingual ? 'checked' : ''} style="width:16px;height:16px;accent-color:#07c160;cursor:pointer;">
                            </label>
                        </div>
                    </div>

                    <div>
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <label style="font-size:11.5px;color:#777;font-weight:500;">好感度 (0~100)</label>
                            <span id="wcleanSetFavorDisplay" style="font-size:13.5px;font-weight:700;color:#07c160;">${formatFavorNumber(curFavor)}</span>
                        </div>
                        <input type="range" id="wcleanSetFavorRange" min="0" max="100" step="0.5" value="${curFavor}" style="width:100%;margin-top:5px;accent-color:#07c160;">
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;background:#f9f9f9;padding:8px 10px;border-radius:6px;border:0.5px solid #eee;">
                        <span style="font-size:12px;color:#444;">恋爱关系：<b style="color:${isDating ? '#ff4d4f' : '#666'};">${isDating ? '恋人（交往中）' : '普通关系'}</b></span>
                        <button type="button" id="btnToggleDatingInSettings" style="border:none;background:${isDating ? '#fff1f0' : '#f0f9eb'};color:${isDating ? '#ff4d4f' : '#07c160'};padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;">
                            ${isDating ? '解除恋爱' : '确立恋爱'}
                        </button>
                    </div>
                    <div>
                        <label style="font-size:11.5px;color:#777;font-weight:500;">人设档案 / 说话风格</label>
                        <textarea id="wcleanSetNpcPersona" rows="4" placeholder="填写人设特征、性格习惯与聊天口吻..." class="wechat-clean-input" style="margin-top:3px;resize:none;line-height:1.45;">${escapeHtml(npc.persona || '')}</textarea>
                    </div>
                    <div style="border-top:0.5px solid #f0f0f0;padding-top:10px;margin-top:4px;">
                        <button type="button" id="btnExportTavernPngCard" style="width:100%;border:1px solid #dcdcdc;background:#ffffff;color:#181818;padding:8px 10px;border-radius:6px;font-size:12.5px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                            <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:#07c160;stroke-width:2;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            <span>导出人设卡</span>
                        </button>
                    </div>
                </div>
            `, () => {
                const remarkVal = document.getElementById('wcleanSetNpcRemark')?.value.trim() || '';
                const nameVal = document.getElementById('wcleanSetNpcName')?.value.trim();
                if (!nameVal) {
                    if (typeof showToast === 'function') showToast('角色名字不能为空', 'error');
                    return false;
                }
                const sigVal = document.getElementById('wcleanSetNpcSignature')?.value.trim() || '';
                const regVal = document.getElementById('wcleanSetNpcRegion')?.value || '中国';
                const personaVal = document.getElementById('wcleanSetNpcPersona')?.value.trim() || 'MC好友同伴。';
                const favorVal = parseFloat(document.getElementById('wcleanSetFavorRange')?.value) || 0;

                const curMin = parseInt(document.getElementById('wcleanMinMsgsRange')?.value) || 1;
                const curMax = parseInt(document.getElementById('wcleanMaxMsgsRange')?.value) || 3;
                const finalMax = Math.max(curMin, curMax);
                const curVoiceFreq = document.getElementById('wcleanSetVoiceFreqVal')?.value || 'rare';

                const curDisableTimezone = !!document.getElementById('wcleanSetDisableTimezone')?.checked;
                const curDisableBilingual = !!document.getElementById('wcleanSetDisableBilingual')?.checked;

                const ttsVoice = document.getElementById('wcleanSetNpcTtsVoice')?.value.trim() || '';
                const ttsSpeed = parseFloat(document.getElementById('wcleanSetNpcTtsSpeed')?.value) || 1.0;

                npc.remark = remarkVal;
                npc.name = nameVal;
                npc.signature = sigVal;
                npc.region = regVal;
                npc.persona = personaVal;
                npc.favor = favorVal;

                const existingDecor = (npc.chatSettings && npc.chatSettings.decor) || {};
                npc.chatSettings = {
                    minMsgs: curMin,
                    maxMsgs: finalMax,
                    voiceFreq: curVoiceFreq,
                    disableTimezone: curDisableTimezone,
                    disableBilingual: curDisableBilingual,
                    tts: { voice: ttsVoice, speed: ttsSpeed },
                    decor: existingDecor
                };

                if (npc.favor < 60 && npc.relationshipStage === 'dating') {
                    npc.relationshipStage = 'friend';
                    npc.isDating = false;
                }

                if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
                if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                if (typeof showToast === 'function') showToast('资料已保存', 'success', 1200);

                openNpcProfileCardModal(npcId);
                if (window.G.currentChatNpc === npcId && typeof window.renderSingleChatWindow === 'function') {
                    window.renderSingleChatWindow();
                } else if (typeof window.renderChatApp === 'function') {
                    window.renderChatApp();
                }
            });

            setTimeout(() => {
                const range = document.getElementById('wcleanSetFavorRange');
                const display = document.getElementById('wcleanSetFavorDisplay');
                if (range && display) {
                    range.oninput = () => { display.textContent = formatFavorNumber(range.value); };
                }

                const minRange = document.getElementById('wcleanMinMsgsRange');
                const maxRange = document.getElementById('wcleanMaxMsgsRange');
                const minLabel = document.getElementById('wcleanMinMsgsLabel');
                const maxLabel = document.getElementById('wcleanMaxMsgsLabel');

                if (minRange && maxRange && minLabel && maxLabel) {
                    minRange.oninput = () => {
                        let minV = parseInt(minRange.value) || 1;
                        let maxV = parseInt(maxRange.value) || 3;
                        if (minV > maxV) { maxRange.value = minV; maxLabel.textContent = minV; }
                        minLabel.textContent = minV;
                    };
                    maxRange.oninput = () => {
                        let minV = parseInt(minRange.value) || 1;
                        let maxV = parseInt(maxRange.value) || 3;
                        if (maxV < minV) { minRange.value = maxV; minLabel.textContent = maxV; }
                        maxLabel.textContent = maxV;
                        minLabel.textContent = minRange.value;
                    };
                }

                const freqBtns = document.querySelectorAll('.voice-freq-btn');
                const freqHidden = document.getElementById('wcleanSetVoiceFreqVal');
                freqBtns.forEach(btn => {
                    btn.onclick = () => {
                        freqBtns.forEach(b => {
                            b.style.border = '1px solid #e0e0e0';
                            b.style.background = '#fff';
                            b.style.color = '#444';
                            b.style.fontWeight = 'normal';
                        });
                        btn.style.border = '1px solid #07c160';
                        btn.style.background = '#f0f9eb';
                        btn.style.color = '#07c160';
                        btn.style.fontWeight = '600';
                        if (freqHidden) freqHidden.value = btn.getAttribute('data-val');
                    };
                });

                // 🌟 绑定一键点选 CloneTTS 音色
                const btnPickVoice = document.getElementById('btnPickTtsVoiceDirect');
                const voiceInput = document.getElementById('wcleanSetNpcTtsVoice');
                if (btnPickVoice && voiceInput && window.ttsEngine) {
                    btnPickVoice.onclick = () => {
                        window.ttsEngine.openVoicePickerModal(voiceInput.value.trim(), (pickedId) => {
                            voiceInput.value = pickedId;
                            if (typeof showToast === 'function') showToast(`已选用音色: ${pickedId}`, 'success', 1000);
                        });
                    };
                }

                const datingBtn = document.getElementById('btnToggleDatingInSettings');
                if (datingBtn) {
                    datingBtn.onclick = () => {
                        const currentlyDating = window.ChatPromptEngine && window.ChatPromptEngine.isNpcInDatingRelationship(npc);
                        if (currentlyDating) {
                            npc.relationshipStage = 'friend';
                            npc.isDating = false;
                            if (typeof showToast === 'function') showToast('已恢复为朋友关系', 'info', 1000);
                        } else {
                            const curF = parseFloat(document.getElementById('wcleanSetFavorRange')?.value) || npc.favor || 0;
                            if (curF < 80) {
                                if (typeof showToast === 'function') showToast('好感度需达到 80 才可确立恋人', 'error', 1500);
                                return;
                            }
                            npc.relationshipStage = 'dating';
                            npc.isDating = true;
                            if (typeof showToast === 'function') showToast('已确立恋爱关系！', 'success', 1200);
                        }
                        if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
                        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                        document.querySelector('.wechat-clean-modal-mask')?.remove();
                        openNpcSettingsModal(npcId);
                    };
                }

                const exportBtn = document.getElementById('btnExportTavernPngCard');
                if (exportBtn) {
                    exportBtn.onclick = () => { promptExportFilename(npc); };
                }
            }, 30);
        }
    }
    window.openNpcSettingsModal = openNpcSettingsModal;

    function promptExportFilename(npc) {
        const defaultName = (npc.remark && npc.remark.trim()) ? npc.remark.trim() : (npc.name || 'NPC');
        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal('导出角色卡命名', `
                <div style="text-align:left;">
                    <div style="font-size:12px;color:#666;margin-bottom:6px;">请设置导出文件名：</div>
                    <input type="text" id="wcleanExportCardFilename" value="${escapeHtml(defaultName)}_人设卡" placeholder="输入文件名称..." class="wechat-clean-input" maxlength="40">
                </div>
            `, async () => {
                const fname = document.getElementById('wcleanExportCardFilename')?.value.trim() || `${defaultName}_人设卡`;
                if (typeof window.exportTavernCharacterPng === 'function') {
                    if (typeof showToast === 'function') showToast('正在生成角色卡...', 'info', 1000);
                    await window.exportTavernCharacterPng(npc, fname);
                } else {
                    if (typeof showToast === 'function') showToast('导出引擎未装载', 'error');
                }
            });
        }
    }

    function triggerChangeNpcAvatar(npcId) {
        if (!window.G || !window.G.npcs) return;
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        let mask = document.createElement('div');
        mask.className = 'wechat-action-sheet-mask';
        mask.innerHTML = `
            <div class="wechat-action-sheet-box">
                <label class="wechat-action-item" style="display:block;cursor:pointer;">
                    <span>从相册选择新头像</span>
                    <input type="file" id="localNpcAvatarInput" accept="image/*" style="display:none;">
                </label>
                <div class="wechat-action-item" onclick="window._randomNpcAvatar('${npcId}')">随机头像池挑选</div>
                <div class="wechat-action-cancel" onclick="this.closest('.wechat-action-sheet-mask').remove()">取消</div>
            </div>
        `;
        document.body.appendChild(mask);
        setTimeout(() => {
            const input = document.getElementById('localNpcAvatarInput');
            if (input) {
                input.onchange = (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (evt) => {
                        const rawData = evt.target.result;
                        const compressed = (typeof window.compressAvatarDataUrl === 'function')
                            ? await window.compressAvatarDataUrl(rawData, 128, 0.82)
                            : rawData;

                        npc.avatarUrl = compressed;
                        npc.avatar = compressed;
                        if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
                        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                        document.querySelector('.wechat-action-sheet-mask')?.remove();
                        const disp = document.getElementById('npcCardAvatarDisplay');
                        if (disp) disp.src = npc.avatarUrl;
                        if (typeof showToast === 'function') showToast('头像已更换', 'success', 1200);
                    };
                    reader.readAsDataURL(file);
                };
            }
        }, 30);
    }
    window.triggerChangeNpcAvatar = triggerChangeNpcAvatar;

    window._randomNpcAvatar = function(npcId) {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        if (!window.G || !window.G.npcs) return;
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        if (!Array.isArray(window._MCYT_AVATARS_POOL) || window._MCYT_AVATARS_POOL.length === 0) {
            if (typeof window.initAvatarPool === 'function') window.initAvatarPool();
        }

        const newAvatar = (typeof getRandomAvatar === 'function') ? getRandomAvatar() : 'assets/icons/chat.png';
        npc.avatarUrl = newAvatar;
        npc.avatar = newAvatar;
        if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        const disp = document.getElementById('npcCardAvatarDisplay');
        if (disp) disp.src = npc.avatarUrl;
        if (typeof showToast === 'function') showToast('已更换头像', 'success', 1000);
    };

    function openContactCardDetailModal(id, name, persona, avatar, signature) {
        const exists = !!(window.G && window.G.npcs && window.G.npcs[id]);

        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal('名片详情', `
                <div style="text-align:center;padding:10px 0;">
                    <div style="width:60px;height:60px;border-radius:8px;overflow:hidden;margin:0 auto 10px;background:#eee;">
                        <img src="${avatar || 'assets/icons/chat.png'}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='assets/icons/chat.png';">
                    </div>
                    <div style="font-size:16px;font-weight:600;color:#181818;">${escapeHtml(name)}</div>
                    ${signature ? `<div style="font-size:12px;color:#07c160;margin-top:4px;">“${escapeHtml(signature)}”</div>` : ''}
                    <div style="font-size:12px;color:#888;margin:6px 0 14px;line-height:1.4;">${escapeHtml(persona || 'MC同伴')}</div>
                    ${exists ? `<div style="font-size:12px;color:#07c160;font-weight:500;">已在通讯录中</div>` : `
                    <button type="button" onclick="window.addContactFromCard('${escapeHtml(id)}','${escapeHtml(name)}','${escapeHtml(persona)}','${escapeHtml(avatar)}','${escapeHtml(signature || '')}')" style="border:none;background:#07c160;color:#fff;padding:8px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">添加至通讯录</button>
                    `}
                </div>
            `, () => {});
        }
    }
    window.openContactCardDetailModal = openContactCardDetailModal;

    function addContactFromCard(id, name, persona, avatar, signature) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        if (!window.G) window.G = {};
        if (!window.G.npcs) window.G.npcs = {};
        
        const newNpcId = id || ('contact_' + Date.now());
        window.G.npcs[newNpcId] = {
            id: newNpcId,
            name: name,
            remark: '',
            region: '中国',
            persona: persona || '名片推荐好友',
            signature: signature || '',
            favor: 50,
            relationshipStage: 'friend',
            avatarUrl: avatar || (typeof getRandomAvatar === 'function' ? getRandomAvatar() : 'assets/icons/chat.png'),
            avatar: avatar || (typeof getRandomAvatar === 'function' ? getRandomAvatar() : 'assets/icons/chat.png'),
            isCustom: true,
            ownerAccountId: curAcc.id,
            chatSettings: {
                minMsgs: 1,
                maxMsgs: 3,
                voiceFreq: 'rare',
                disableTimezone: false,
                disableBilingual: false,
                tts: { voice: '', speed: 1.0 }
            }
        };

        if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        document.querySelector('.wechat-clean-modal-mask')?.remove();
        if (typeof showToast === 'function') showToast('联系人已添加', 'success', 1200);
        if (typeof window.renderChatApp === 'function') window.renderChatApp();
    }
    window.addContactFromCard = addContactFromCard;

    function openImportCharacterCardModal(onSuccess = null) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.png,image/png,.json,application/json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        fileInput.onchange = async (e) => {
            const file = e.target.files && e.target.files[0];
            fileInput.remove();
            if (!file) return;

            if (typeof showToast === 'function') showToast('正在解析角色卡...', 'info', 1000);

            try {
                if (typeof window.parseTavernCardFromFile !== 'function') {
                    throw new Error('解析引擎未装载');
                }
                const profile = await window.parseTavernCardFromFile(file);
                if (!profile || !profile.name) {
                    throw new Error('角色卡未能成功识别');
                }

                if (typeof onSuccess === 'function') {
                    onSuccess(profile);
                } else {
                    const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
                    if (!window.G) window.G = {};
                    if (!window.G.npcs) window.G.npcs = {};

                    const newId = 'custom_' + Date.now();
                    const finalAvatar = profile.avatarUrl || (typeof getRandomAvatar === 'function' ? getRandomAvatar() : 'assets/icons/chat.png');

                    window.G.npcs[newId] = {
                        id: newId,
                        name: profile.name,
                        remark: '',
                        region: profile.region || '中国',
                        persona: profile.persona || 'MC同伴玩家。',
                        signature: profile.signature || '',
                        favor: 50,
                        relationshipStage: 'friend',
                        avatarUrl: finalAvatar,
                        avatar: finalAvatar,
                        isCustom: true,
                        ownerAccountId: curAcc.id,
                        chatSettings: {
                            minMsgs: 1,
                            maxMsgs: 3,
                            voiceFreq: 'rare',
                            disableTimezone: false,
                            disableBilingual: false,
                            tts: { voice: '', speed: 1.0 }
                        }
                    };

                    if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
                    if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                    if (typeof showToast === 'function') showToast(`已成功导入角色「${profile.name}」`, 'success', 1500);
                    if (typeof window.renderChatApp === 'function') window.renderChatApp();
                }
            } catch (err) {
                console.error('导入角色卡失败:', err);
                if (typeof showToast === 'function') showToast(err.message || '导入失败', 'error', 2000);
            }
        };

        fileInput.click();
    }
    window.openImportCharacterCardModal = openImportCharacterCardModal;

})();
