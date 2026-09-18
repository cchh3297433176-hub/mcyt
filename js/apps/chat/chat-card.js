/**
 * js/apps/chat/chat-card.js
 * 📇 微信名片与人设资料设置独立模块（已从 chat-app.js 解耦减负）
 * 职责：
 * 1. 角色极简原生名片卡（仅保留头像、姓名/备注、个性签名、地区与好感度）
 * 2. 独立齿轮“资料设置”白灰拟真弹窗（备注名、原名、签名、地区、恋爱状态、人设Prompt修改）
 * 3. 角色卡 PNG 导出入口（支持自定义文件名）、换头像与角色卡导入
 * 4. 推荐名片详情弹窗与添加通讯录
 */

(function() {
    'use strict';

    // 📇 极简原生微信名片卡
    function openNpcProfileCardModal(npcId) {
        if (!window.G || !window.G.npcs) return;
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        const isDating = window.ChatPromptEngine && window.ChatPromptEngine.isNpcInDatingRelationship(npc);
        const sigText = npc.signature ? escapeHtml(npc.signature) : '未设置个性签名';
        const hasRemark = !!(npc.remark && npc.remark.trim());
        const primaryName = hasRemark ? escapeHtml(npc.remark.trim()) : escapeHtml(npc.name || npc.id);
        const subNameHtml = hasRemark ? `<div style="font-size:12px;color:#888888;margin-top:2px;">原名：${escapeHtml(npc.name || '')}</div>` : '';
        const favorText = `${npc.favor || 50} (${isDating ? '恋人' : (npc.favor >= 80 ? '暧昧期' : '朋友')})`;

        let mask = document.createElement('div');
        mask.className = 'wechat-clean-modal-mask';
        mask.innerHTML = `
            <div class="wechat-clean-modal-card" style="max-width:320px;padding:20px 18px;position:relative;background:#ffffff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.12);box-sizing:border-box;">
                <button type="button" id="btnNpcCardGear" title="资料设置" style="position:absolute;top:14px;right:14px;border:none;background:none;width:30px;height:30px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;color:#707070;">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                </button>

                <div style="display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:0.5px solid #f0f0f0;margin-bottom:14px;padding-right:28px;">
                    <div style="position:relative;width:56px;height:56px;flex-shrink:0;cursor:pointer;" onclick="window.triggerChangeNpcAvatar('${npcId}')" title="点击更换头像">
                        <img id="npcCardAvatarDisplay" src="${npc.avatarUrl || (typeof getRandomAvatar === 'function' ? getRandomAvatar() : 'assets/icons/chat.png')}" style="width:100%;height:100%;border-radius:8px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';" />
                        <div style="position:absolute;bottom:0;right:0;background:rgba(0,0,0,0.45);border-radius:2px 0 8px 0;width:16px;height:16px;display:flex;align-items:center;justify-content:center;">
                            <svg viewBox="0 0 24 24" style="width:9px;height:9px;fill:#ffffff;"><path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>
                        </div>
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
        mask.querySelector('#btnNpcCardGear').onclick = () => {
            close();
            openNpcSettingsModal(npcId);
        };
    }
    window.openNpcProfileCardModal = openNpcProfileCardModal;

    // ⚙️ 角色资料设置弹窗（内含人设导出 PNG 按钮及命名弹窗）
    function openNpcSettingsModal(npcId) {
        if (!window.G || !window.G.npcs) return;
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        const isDating = window.ChatPromptEngine && window.ChatPromptEngine.isNpcInDatingRelationship(npc);
        const regionList = ['中国', '美国 - 东部', '美国 - 西部', '英国', '日本', '韩国', '加拿大', '澳大利亚', '德国', '法国'];

        const regionOptionsHtml = regionList.map(r => `
            <option value="${r}" ${npc.region === r ? 'selected' : ''}>${r}</option>
        `).join('');

        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal('资料设置', `
                <div style="display:flex;flex-direction:column;gap:11px;text-align:left;max-height:68vh;overflow-y:auto;padding-right:2px;">
                    <div>
                        <label style="font-size:11.5px;color:#777;font-weight:500;">备注名（仅自己在聊天与列表中显示）</label>
                        <input type="text" id="wcleanSetNpcRemark" value="${escapeHtml(npc.remark || '')}" placeholder="添加备注名..." maxlength="20" class="wechat-clean-input" style="margin-top:3px;">
                    </div>
                    <div>
                        <label style="font-size:11.5px;color:#777;font-weight:500;">角色真实名字</label>
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
                    <div>
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <label style="font-size:11.5px;color:#777;font-weight:500;">好感度 (0~100)</label>
                            <span id="wcleanSetFavorDisplay" style="font-size:13.5px;font-weight:700;color:#07c160;">${npc.favor || 50}</span>
                        </div>
                        <input type="range" id="wcleanSetFavorRange" min="0" max="100" value="${npc.favor || 50}" style="width:100%;margin-top:5px;accent-color:#07c160;">
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
                    <!-- 极简人设卡导出 -->
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
                const favorVal = parseInt(document.getElementById('wcleanSetFavorRange')?.value) || 0;

                npc.remark = remarkVal;
                npc.name = nameVal;
                npc.signature = sigVal;
                npc.region = regVal;
                npc.persona = personaVal;
                npc.favor = favorVal;

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
                    range.oninput = () => { display.textContent = range.value; };
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
                            const curF = parseInt(document.getElementById('wcleanSetFavorRange')?.value) || npc.favor || 0;
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
                    exportBtn.onclick = () => {
                        // 弹出简约命名弹窗
                        promptExportFilename(npc);
                    };
                }
            }, 30);
        }
    }
    window.openNpcSettingsModal = openNpcSettingsModal;

    // 命名并执行导出
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

    // 换头像
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
                    reader.onload = (evt) => {
                        npc.avatarUrl = evt.target.result;
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
        if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        const disp = document.getElementById('npcCardAvatarDisplay');
        if (disp) disp.src = npc.avatarUrl;
        if (typeof showToast === 'function') showToast('已更换头像', 'success', 1000);
    };

    // 查看名片详情弹窗
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
            isCustom: true,
            ownerAccountId: curAcc.id
        };

        if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        document.querySelector('.wechat-clean-modal-mask')?.remove();
        if (typeof showToast === 'function') showToast('联系人已添加', 'success', 1200);
        if (typeof window.renderChatApp === 'function') window.renderChatApp();
    }
    window.addContactFromCard = addContactFromCard;

    // 📥 导入角色卡弹窗处理
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
                    // 默认直接实例化自建角色
                    const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
                    if (!window.G) window.G = {};
                    if (!window.G.npcs) window.G.npcs = {};

                    const newId = 'custom_' + Date.now();
                    window.G.npcs[newId] = {
                        id: newId,
                        name: profile.name,
                        remark: '',
                        region: profile.region || '中国',
                        persona: profile.persona || 'MC同伴玩家。',
                        signature: profile.signature || '',
                        favor: 50,
                        relationshipStage: 'friend',
                        avatarUrl: profile.avatarUrl || (typeof getRandomAvatar === 'function' ? getRandomAvatar() : 'assets/icons/chat.png'),
                        isCustom: true,
                        ownerAccountId: curAcc.id
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
