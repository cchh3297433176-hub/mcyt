/**
 * js/apps/chat/chat-app-shell.js
 * 💬 微信主应用 · 拆分分片 2/7：整体调度中枢（renderChatApp 主渲染、底部Tab切换）、
 *    添加联系人相关入口（导入角色卡/新建自建角色/建群/好友与群邀请处理）、消息翻译/语音详情/名片翻转等直连开关。
 * ⚠️ 拆分自 chat-app.js，仅做物理搬家；window.renderChatApp 的导出位置从原文件末尾就地前移到函数定义后，
 *    行为完全不变（提前导出不影响任何调用方，因为所有调用都发生在页面加载完成之后）。
 */

(function() {
    'use strict';

    // 微信 App 整体调度中枢
    window.renderChatApp = function renderChatApp(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        // 🌟 每次唤起微信或刷新界面时，自动吸收从塔罗 App 跨页转发过来的牌阵
        if (window.ChatTarot && typeof window.ChatTarot.drainPendingTarotShares === 'function') {
            window.ChatTarot.drainPendingTarotShares();
        }

        const appModal = document.getElementById('appModal');
        if (appModal) appModal.classList.add('wechat-seamless-shell');

        const legacyWrap = document.querySelector('#socialTab .phone-app-wrap');
        if (legacyWrap) legacyWrap.remove();

        window.ensureNpcIntegrity();

        if (window.G.currentChatGroup) {
            if (typeof window.renderGroupChatWindow === 'function') {
                window.renderGroupChatWindow(container);
            }
            return;
        }
        if (window.G.currentChatNpc) {
            renderSingleChatWindow(container);
            return;
        }

        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        let mainContentHtml = '';
        let topBarHtml = '';

        const pendingFriendReqCount = (window.G.friendRequests || []).filter(r => (r.targetAccountId || 'main') === curAcc.id).length;
        const pendingCount = pendingFriendReqCount + (window.G.groupInvites || []).length;
        const isDirect = window.G.chatActiveTab !== 'group';

        if (window._activeBottomTab === 'chats') {
            topBarHtml = `
                <div class="wechat-top-header">
                    <button onclick="closePhoneApp()" style="border:none;background:none;font-size:14px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>桌面</span>
                    </button>
                    <div style="display:flex;gap:4px;background:#e2e2e2;padding:2px;border-radius:6px;">
                        <button type="button" onclick="window.switchChatTab('direct')" style="border:none;padding:4px 14px;border-radius:4px;font-size:12.5px;font-weight:600;cursor:pointer;background:${isDirect ? '#ffffff' : 'transparent'};color:${isDirect ? '#07c160' : '#666'};">私聊</button>
                        <button type="button" onclick="window.switchChatTab('group')" style="border:none;padding:4px 14px;border-radius:4px;font-size:12.5px;font-weight:600;cursor:pointer;background:${!isDirect ? '#ffffff' : 'transparent'};color:${!isDirect ? '#07c160' : '#666'};">群聊</button>
                    </div>
                    <div style="position:relative;">
                        <button onclick="window.openAddChatTargetModal()" title="添加好友与群聊" style="border:none;background:transparent;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">
                            <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:#181818;stroke-width:2.2;stroke-linecap:round;">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                        ${pendingCount > 0 ? `<span style="position:absolute;top:2px;right:2px;width:8px;height:8px;background:#fa5151;border:1.5px solid #ededed;border-radius:50%;display:block;"></span>` : ''}
                    </div>
                </div>
            `;
            mainContentHtml = buildChatListHTML();
        } else if (window._activeBottomTab === 'moments') {
            topBarHtml = `
                <div class="wechat-top-header">
                    <button onclick="closePhoneApp()" style="border:none;background:none;font-size:14px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>桌面</span>
                    </button>
                    <div style="font-size:15px;font-weight:600;color:#181818;">朋友圈动态</div>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button onclick="window.triggerGenerateFriendsFeed()" style="border:none;background:none;color:#07c160;font-size:13px;font-weight:600;cursor:pointer;padding:0;">刷新</button>
                        <button onclick="window.openPostMomentModal()" style="border:none;background:none;font-size:14px;cursor:pointer;color:#181818;font-weight:600;padding:0;">发布</button>
                    </div>
                </div>
            `;
            mainContentHtml = (typeof buildMomentsHTML === 'function') ? buildMomentsHTML() : '<div style="padding:40px;text-align:center;color:#999;">动态模块加载中...</div>';
        } else if (window._activeBottomTab === 'profile') {
            topBarHtml = `
                <div class="wechat-top-header">
                    <button onclick="closePhoneApp()" style="border:none;background:none;font-size:14px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>桌面</span>
                    </button>
                    <div style="font-size:15px;font-weight:600;color:#181818;">我 · 身份中心</div>
                    <div style="width:40px;"></div>
                </div>
            `;
            mainContentHtml = (typeof buildProfileTabHTML === 'function') ? buildProfileTabHTML() : '<div style="padding:40px;text-align:center;color:#999;">人设模块加载中...</div>';
        }

        const totalOtherReqCount = (window.G.friendRequests || []).filter(r => (r.targetAccountId || 'main') !== curAcc.id).length;

        const bottomNavHtml = `
            <div style="height:52px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;justify-content:space-around;align-items:center;flex-shrink:0;box-sizing:border-box;">
                <button onclick="window.switchWechatBottomTab('chats')" style="border:none;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:${window._activeBottomTab === 'chats' ? '#07c160' : '#888888'};">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                    <span style="font-size:10.5px;font-weight:${window._activeBottomTab === 'chats' ? '600' : 'normal'};">微信</span>
                </button>
                <button onclick="window.switchWechatBottomTab('moments')" style="border:none;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:${window._activeBottomTab === 'moments' ? '#07c160' : '#888888'};">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3"/></svg>
                    <span style="font-size:10.5px;font-weight:${window._activeBottomTab === 'moments' ? '600' : 'normal'};">动态</span>
                </button>
                <button onclick="window.switchWechatBottomTab('profile')" style="position:relative;border:none;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:${window._activeBottomTab === 'profile' ? '#07c160' : '#888888'};">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    <span style="font-size:10.5px;font-weight:${window._activeBottomTab === 'profile' ? '600' : 'normal'};">我</span>
                    ${totalOtherReqCount > 0 ? `<span style="position:absolute;top:0;right:8px;width:7px;height:7px;background:#fa5151;border-radius:50%;"></span>` : ''}
                </button>
            </div>
        `;

        container.innerHTML = `
            <div id="wechatAppRoot" style="display:flex;flex-direction:column;height:100%;width:100%;background:#ededed;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,sans-serif;box-sizing:border-box;">
                ${topBarHtml}
                <div style="flex:1;overflow-y:auto;background:#ffffff;">
                    ${mainContentHtml}
                </div>
                ${bottomNavHtml}
            </div>
        `;

        if (window._activeBottomTab === 'chats') {
            bindSwipeToDeleteEngine(container);

            container.querySelectorAll('.chat-item[data-npc-id]').forEach(item => {
                const id = item.dataset.npcId;
                if (typeof bindLongPressEvent === 'function') {
                    bindLongPressEvent(item, () => {
                        if (window._activeSwipedItem && window._activeSwipedItem.contains(item)) {
                            window._activeSwipedItem.style.transform = 'translateX(0px)';
                            window._activeSwipedItem = null;
                            return;
                        }
                        window.openChat(id);
                    }, () => {
                        if (typeof window.openNpcProfileCardModal === 'function') window.openNpcProfileCardModal(id);
                    });
                } else {
                    item.onclick = () => {
                        if (window._activeSwipedItem && window._activeSwipedItem.contains(item)) {
                            window._activeSwipedItem.style.transform = 'translateX(0px)';
                            window._activeSwipedItem = null;
                            return;
                        }
                        window.openChat(id);
                    };
                }
            });
            container.querySelectorAll('.group-item[data-group-id]').forEach(item => {
                const gid = item.dataset.groupId;
                if (typeof bindLongPressEvent === 'function') {
                    bindLongPressEvent(item, () => { window.openGroupChat(gid); }, () => {
                        if (typeof window.openGroupSettingsModal === 'function') window.openGroupSettingsModal(gid);
                    });
                } else {
                    item.onclick = () => window.openGroupChat(gid);
                }
            });
        }
    }
    window.renderSocialPanel = renderChatApp;

    window.switchWechatBottomTab = function(tabName) {
        window._activeBottomTab = tabName;
        window.G.currentChatNpc = null;
        window.G.currentChatGroup = null;
        renderChatApp();
    };

    window.openAddChatTargetModal = function() {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        const reqCount = (window.G.friendRequests || []).filter(r => (r.targetAccountId || 'main') === curAcc.id).length + (window.G.groupInvites || []).length;
        let mask = document.createElement('div');
        mask.className = 'wechat-action-sheet-mask';
        mask.innerHTML = `
            <div class="wechat-action-sheet-box">
                <div class="wechat-action-item" onclick="window.openCreateCustomNpcModal()">添加联系人</div>
                <div class="wechat-action-item" onclick="window.openImportCardEntry()">导入角色卡</div>
                <div class="wechat-action-item" onclick="window.openCreateGroupModal()">发起群聊</div>
                <div class="wechat-action-item" onclick="window.openSocialRequestsModal()">朋友与群邀请 ${reqCount > 0 ? `<span style="color:#fa5151;font-weight:600;">(${reqCount})</span>` : ''}</div>
                <div class="wechat-action-cancel" onclick="this.closest('.wechat-action-sheet-mask').remove()">取消</div>
            </div>
        `;
        document.body.appendChild(mask);
    };

    window.openImportCardEntry = function() {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        document.querySelector('.wechat-clean-modal-mask')?.remove();
        if (typeof window.openImportCharacterCardModal === 'function') {
            window.openImportCharacterCardModal((profile) => {
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
                if (typeof showToast === 'function') showToast(`已导入角色「${profile.name}」`, 'success', 1500);
                renderChatApp();
            });
        } else {
            if (typeof showToast === 'function') showToast('导入功能模块尚未加载', 'error');
        }
    };

    // 添加联系人
    window.openCreateCustomNpcModal = function() {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };

        if (typeof window.openWechatCleanModal === 'function') {
            window.openWechatCleanModal(`添加联系人`, `
                <div style="display:flex;flex-direction:column;gap:10px;text-align:left;">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:6px;border-bottom:0.5px solid #eee;">
                        <span style="font-size:11.5px;color:#888;">已有角色卡文件？</span>
                        <button type="button" onclick="window.openImportCardEntry()" style="border:none;background:#f0f9eb;color:#07c160;padding:4px 10px;border-radius:4px;font-size:11.5px;font-weight:600;cursor:pointer;">
                            导入角色卡
                        </button>
                    </div>
                    <div>
                        <label style="font-size:12px;color:#666;">联系人真实名字</label>
                        <input type="text" id="wcleanNewNpcName" placeholder="输入真实名字..." class="wechat-clean-input" style="margin-top:3px;">
                    </div>
                    <div>
                        <label style="font-size:12px;color:#666;">备注名 (选填)</label>
                        <input type="text" id="wcleanNewNpcRemark" placeholder="输入你想称呼的备注名..." maxlength="20" class="wechat-clean-input" style="margin-top:3px;">
                    </div>
                    <div>
                        <label style="font-size:12px;color:#666;">个性签名 (选填)</label>
                        <input type="text" id="wcleanNewNpcSignature" placeholder="输入个性签名..." maxlength="60" class="wechat-clean-input" style="margin-top:3px;">
                    </div>
                    <div>
                        <label style="font-size:12px;color:#666;">常驻地区</label>
                        <select id="wcleanNewNpcRegion" class="wechat-clean-input" style="margin-top:3px;">
                            <option value="中国">中国</option>
                            <option value="美国 - 东部">美国 - 东部</option>
                            <option value="美国 - 西部">美国 - 西部</option>
                            <option value="英国">英国</option>
                            <option value="日本">日本</option>
                            <option value="韩国">韩国</option>
                            <option value="加拿大">加拿大</option>
                            <option value="澳大利亚">澳大利亚</option>
                            <option value="德国">德国</option>
                            <option value="法国">法国</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size:12px;color:#666;">人设档案 / 说话风格</label>
                        <textarea id="wcleanNewNpcPersona" rows="3" placeholder="填写人设特征、性格习惯与聊天口吻..." class="wechat-clean-input" style="margin-top:3px;resize:none;line-height:1.4;"></textarea>
                    </div>
                </div>
            `, () => {
                const name = document.getElementById('wcleanNewNpcName').value.trim();
                if (!name) {
                    if (typeof showToast === 'function') showToast('请填写联系人名字', 'error');
                    return false;
                }
                const remark = document.getElementById('wcleanNewNpcRemark')?.value.trim() || '';
                const signature = document.getElementById('wcleanNewNpcSignature')?.value.trim() || '';
                const region = document.getElementById('wcleanNewNpcRegion').value;
                const persona = document.getElementById('wcleanNewNpcPersona').value.trim() || 'MC好友同伴。';
                const newId = 'custom_' + Date.now();

                if (!window.G.npcs) window.G.npcs = {};
                window.G.npcs[newId] = {
                    id: newId,
                    name: name,
                    remark: remark,
                    signature: signature,
                    region: region,
                    persona: persona,
                    favor: 50,
                    relationshipStage: 'friend',
                    avatarUrl: window.getRandomAvatar(),
                    isCustom: true,
                    ownerAccountId: curAcc.id
                };

                window.syncCustomNpcsToLocalBackup();
                if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                if (typeof showToast === 'function') showToast('联系人已添加', 'success', 1200);
                renderChatApp();
            });
        }
    };

    window.openCreateGroupModal = function() {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        const npcs = Object.values(window.G.npcs || {}).filter(n => !n.ownerAccountId || n.ownerAccountId === curAcc.id || n.ownerAccountId === 'all');
        
        if (npcs.length === 0) {
            if (typeof showToast === 'function') showToast('当前账号暂无可拉入群聊的好友', 'info');
            return;
        }

        const listHtml = npcs.map(n => {
            const showTitle = n.remark ? `${n.remark} (${n.name})` : n.name;
            return `
            <label style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:0.5px solid #f2f2f2;cursor:pointer;">
                <input type="checkbox" class="wclean-grp-chk" value="${n.id}" style="accent-color:#07c160;width:16px;height:16px;">
                ${window.renderAvatarBadge(n, 32)}
                <span style="font-size:13.5px;color:#181818;">${escapeHtml(showTitle)}</span>
            </label>
        `;
        }).join('');

        if (typeof window.openWechatCleanModal === 'function') {
            window.openWechatCleanModal('发起群聊', `
                <div style="display:flex;flex-direction:column;gap:8px;text-align:left;">
                    <input type="text" id="wcleanNewGroupName" placeholder="群聊名称..." class="wechat-clean-input">
                    <div style="font-size:12px;color:#888;margin-top:4px;">选择群成员：</div>
                    <div style="max-height:180px;overflow-y:auto;padding-right:4px;">
                        ${listHtml}
                    </div>
                </div>
            `, () => {
                const name = document.getElementById('wcleanNewGroupName').value.trim() || '我的MC小群';
                const chks = Array.from(document.querySelectorAll('.wclean-grp-chk:checked')).map(c => c.value);
                if (chks.length === 0) {
                    if (typeof showToast === 'function') showToast('请至少选择一位群成员', 'error');
                    return false;
                }

                const gid = 'group_' + Date.now();
                if (!window.G.groups) window.G.groups = {};
                window.G.groups[gid] = {
                    id: gid,
                    name: name,
                    members: chks,
                    avatarUrl: window.getRandomAvatar()
                };
                if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
                window.G.groupChatHistory[gid] = [];

                if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                if (typeof showToast === 'function') showToast('群聊已建立', 'success', 1200);
                window.G.chatActiveTab = 'group';
                renderChatApp();
            });
        }
    };

    window.openSocialRequestsModal = function() {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        const fReqs = (window.G.friendRequests || []).filter(r => (r.targetAccountId || 'main') === curAcc.id);
        const gInvs = window.G.groupInvites || [];

        if (fReqs.length === 0 && gInvs.length === 0) {
            window.openWechatCleanModal('申请与邀请', `<div style="text-align:center;color:#999;padding:20px 0;font-size:13px;">当前账号暂无新的申请或邀请</div>`, () => {});
            return;
        }

        let bodyHtml = '<div style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">';

        fReqs.forEach((r) => {
            bodyHtml += `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:#f9f9f9;border-radius:6px;">
                <div style="font-size:12.5px;color:#181818;min-width:0;flex:1;padding-right:6px;">
                    <b>${escapeHtml(r.name || '角色')}</b> 请求添加当前账号<br>
                    <span style="font-size:11px;color:#888;">${escapeHtml(r.reason || '通过名片推荐申请添加好友')}</span>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                    <button onclick="window.handleFriendRequestActionById('${r.id}', true)" style="border:none;background:#07c160;color:#fff;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">接受</button>
                    <button onclick="window.handleFriendRequestActionById('${r.id}', false)" style="border:none;background:#e5e5e5;color:#555;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">忽略</button>
                </div>
            </div>`;
        });

        gInvs.forEach((inv, idx) => {
            bodyHtml += `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:#f9f9f9;border-radius:6px;">
                <div style="font-size:12.5px;color:#181818;">
                    邀请加入群聊 <b>${escapeHtml(inv.groupName || 'MC开黑群')}</b>
                </div>
                <div style="display:flex;gap:6px;">
                    <button onclick="window.handleGroupInviteAction(${idx}, true)" style="border:none;background:#07c160;color:#fff;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">加入</button>
                    <button onclick="window.handleGroupInviteAction(${idx}, false)" style="border:none;background:#e5e5e5;color:#555;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">忽略</button>
                </div>
            </div>`;
        });

        bodyHtml += '</div>';

        window.openWechatCleanModal('新的申请与邀请', bodyHtml, () => {});
    };

    window.handleFriendRequestActionById = function(reqId, accept) {
        document.querySelector('.wechat-clean-modal-mask')?.remove();
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        const idx = (window.G.friendRequests || []).findIndex(r => r.id === reqId);
        if (idx === -1) return;

        const req = window.G.friendRequests[idx];
        if (accept) {
            const nid = req.applicantNpcId || ('npc_' + Date.now());
            if (!window.G.npcs) window.G.npcs = {};
            
            window.G.npcs[nid] = {
                id: nid,
                name: req.name || '新好友',
                remark: '',
                region: req.region || '中国',
                persona: req.persona || '通过名片添加的好友。',
                signature: req.signature || '',
                favor: req.favor || 50,
                relationshipStage: 'friend',
                avatarUrl: req.avatar || window.getRandomAvatar(),
                isCustom: true,
                ownerAccountId: curAcc.id
            };
            window.syncCustomNpcsToLocalBackup();
            if (typeof showToast === 'function') showToast('已添加到通讯录', 'success', 1200);
        }

        window.G.friendRequests.splice(idx, 1);
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        renderChatApp();
    };

    window.handleGroupInviteAction = function(idx, accept) {
        document.querySelector('.wechat-clean-modal-mask')?.remove();
        const inv = (window.G.groupInvites || [])[idx];
        if (inv) {
            if (accept) {
                const gid = 'group_inv_' + Date.now();
                if (!window.G.groups) window.G.groups = {};
                window.G.groups[gid] = {
                    id: gid,
                    name: inv.groupName || 'MC探险群',
                    members: inv.members || [],
                    avatarUrl: window.getRandomAvatar()
                };
                if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
                window.G.groupChatHistory[gid] = [];
                if (typeof showToast === 'function') showToast('已加入群聊', 'success', 1200);
            }
            window.G.groupInvites.splice(idx, 1);
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            renderChatApp();
        }
    };

    window.toggleMessageTranslationDirect = function(el, msgId) {
        const box = document.getElementById(`transBox_${msgId}`);
        const btn = document.getElementById(`transBtn_${msgId}`);
        if (!box) return;
        if (box.style.display === 'none' || !box.style.display) {
            box.style.display = 'block';
            if (btn) btn.textContent = '收起翻译';
        } else {
            box.style.display = 'none';
            if (btn) btn.textContent = '翻译';
        }
    };

    window.toggleVoiceMessageDetailsDirect = function(msgId) {
        const box = document.getElementById(`voiceDescBox_${msgId}`);
        if (!box) return;
        box.style.display = (box.style.display === 'none' || !box.style.display) ? 'block' : 'none';
    };

    window.toggleCardFlipDirect = function(msgId) {
        const card = document.getElementById(`flipCard_${msgId}`);
        if (!card) return;
        card.classList.toggle('is-flipped');
    };

    window.toggleChatHistoryExpand = function(key) {
        window._chatExpandAllMap[key] = !window._chatExpandAllMap[key];
        renderSingleChatWindow();
    };

})();
