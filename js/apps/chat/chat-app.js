/**
 * js/apps/chat/chat-app.js
 * 💬 微信独立主应用（瘦身减负版 · 仿微信白灰绿质感 · 双语即时翻译 · 拟真语音条 · 三种发图模式 · 经典翻转卡片/微信框 · 真表情调用 · 撤回单次偷窥脱敏 · 长按引用与编辑 · Token统计 · 动态转发与名片推荐 · 加号聊天折叠设置与长消息折叠渲染 · 大小号好友物理隔离与申请红点）
 * ⚠️ 注：角色名片卡、资料设置、酒馆人设导出及头像更换等功能已完全拆分解耦至 chat-card.js
 */

(function() {
    'use strict';

    let _activeBottomTab = 'chats';
    window._stickerDrawerOpen = false;
    window._plusDrawerOpen = false;
    window._activeQuoteMessage = null;
    window._chatExpandAllMap = {}; // 记录哪些会话被用户主动临时展开了历史记录

    // 读取或初始化折叠配置
    function getChatCollapseConfig() {
        if (!window.G) window.G = {};
        if (!window.G.chatCollapseConfig) {
            try {
                const saved = localStorage.getItem('mcyt_chat_collapse_config');
                window.G.chatCollapseConfig = saved ? JSON.parse(saved) : { enabled: true, limit: 50 };
            } catch (_) {
                window.G.chatCollapseConfig = { enabled: true, limit: 50 };
            }
        }
        return window.G.chatCollapseConfig;
    }

    function saveChatCollapseConfig(cfg) {
        if (!window.G) window.G = {};
        window.G.chatCollapseConfig = cfg;
        try {
            localStorage.setItem('mcyt_chat_collapse_config', JSON.stringify(cfg));
        } catch (_) {}
    }

    // 微信"消息"主列表构建（严格按照当前账号隔离好友列表，支持备注名展示）
    function buildChatListHTML() {
        const isDirect = window.G.chatActiveTab !== 'group';
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };

        if (isDirect) {
            const npcList = Object.values(window.G.npcs || {}).filter(npc => {
                if (!npc.ownerAccountId || npc.ownerAccountId === 'all') return true;
                return npc.ownerAccountId === curAcc.id;
            });

            if (npcList.length === 0) {
                return `
                <div style="text-align:center;color:#b2b2b2;padding:60px 16px;font-size:13px;line-height:1.8;">
                    <b>暂无联系人</b><br>
                    当前账号「${escapeHtml(curAcc.name)}」暂未添加好友<br>
                    点击右上角「+」添加好友或通过名片认识新朋友
                </div>`;
            }

            const rows = npcList.map(npc => {
                const history = window.getAccountChatHistory(npc.id, curAcc.id);
                const last = history.length ? history[history.length - 1] : null;
                let preview = npc.signature ? escapeHtml(npc.signature) : '暂无消息，点击开始聊天';
                if (last) {
                    if (last.from === 'action') preview = String(last.text || '');
                    else if (last.type === 'voice') preview = `[语音] ${last.seconds || 3}"`;
                    else if (last.type === 'shared_moment') preview = '[分享了一条朋友圈动态]';
                    else if (last.type === 'contact_card') preview = '[推荐了名片]';
                    else if (last.type === 'moment_notice') preview = '[朋友圈更新提醒]';
                    else if (last.stickerUrl || last.type === 'sticker') preview = `[动画表情]`;
                    else if (last.type === 'image_flip' || last.type === 'image_text_only' || last.imageDesc) preview = `[图片描述: ${last.imageDesc || '图片'}]`;
                    else if (last.imageUrl || last.type === 'image') preview = '[图片]';
                    else preview = String(last.originalText || last.text || '').replace(/\n+/g, ' ').slice(0, 24) || '[消息]';
                    if (last.from === 'player') preview = '我：' + preview;
                }
                const timeLabel = last ? String(last.time || '').slice(0, 5) : '';
                const blocked = (typeof window.isAccountBlockedByNpc === 'function') ? window.isAccountBlockedByNpc(npc.id, curAcc.id) : false;
                const isDating = window.ChatPromptEngine && window.ChatPromptEngine.isNpcInDatingRelationship(npc);
                return { npc, last, preview, timeLabel, blocked, isDating };
            }).sort((a, b) => {
                const ta = a.last ? Number(String(a.last._id || '').split('_')[1]) || 0 : 0;
                const tb = b.last ? Number(String(b.last._id || '').split('_')[1]) || 0 : 0;
                return tb - ta;
            });

            return rows.map(({ npc, preview, timeLabel, blocked, isDating }) => {
                const displayName = npc.remark ? npc.remark : (npc.name || npc.id);
                return `
                <div class="chat-item" data-npc-id="${npc.id}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:0.5px solid #ededed;cursor:pointer;background:#fff;">
                    ${window.renderAvatarBadge(npc, 46)}
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div style="display:flex;align-items:center;gap:4px;overflow:hidden;">
                                <span style="font-size:14.5px;font-weight:500;color:#181818;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(displayName)}</span>
                                ${isDating ? `<span style="font-size:10px;background:#ffeef0;color:#ff4d4f;padding:1px 5px;border-radius:3px;font-weight:600;flex-shrink:0;">恋人</span>` : ''}
                            </div>
                            <span style="font-size:10.5px;color:#b2b2b2;flex-shrink:0;margin-left:6px;">${timeLabel}</span>
                        </div>
                        <div style="font-size:12px;color:${blocked ? '#fa5151' : '#999999'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${blocked ? '（已被对方拒收）' : escapeHtml(preview)}</div>
                    </div>
                </div>
                `;
            }).join('');
        }

        const groupList = Object.entries(window.G.groups || {}).map(([gid, g]) => Object.assign({ id: gid }, g));
        if (groupList.length === 0) {
            return `
            <div style="text-align:center;color:#b2b2b2;padding:60px 16px;font-size:13px;line-height:1.8;">
                <b>暂无群聊</b><br>
                点击右上角「+」发起群聊
            </div>`;
        }

        const groupRows = groupList.map(g => {
            const history = (window.G.groupChatHistory && window.G.groupChatHistory[g.id]) || [];
            const last = history.length ? history[history.length - 1] : null;
            let preview = '暂无消息';
            if (last) {
                if (last.from === 'action') preview = String(last.text || '');
                else if (last.type === 'voice') preview = `[语音] ${last.seconds || 3}"`;
                else if (last.type === 'shared_moment') preview = '[分享了一条朋友圈动态]';
                else if (last.type === 'contact_card') preview = '[推荐了名片]';
                else preview = String(last.text || '[消息]').replace(/\n+/g, ' ').slice(0, 24);
                if (last.senderName) preview = `${last.senderName}：${preview}`;
            }
            const timeLabel = last ? String(last.time || '').slice(0, 5) : '';
            return { g, preview, timeLabel, last };
        }).sort((a, b) => {
            const ta = a.last ? Number(String(a.last._id || '').split('_')[1]) || 0 : 0;
            const tb = b.last ? Number(String(b.last._id || '').split('_')[1]) || 0 : 0;
            return tb - ta;
        });

        return groupRows.map(({ g, preview, timeLabel }) => `
            <div class="group-item" data-group-id="${g.id}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:0.5px solid #ededed;cursor:pointer;background:#fff;">
                ${window.renderAvatarBadge(g, 46)}
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:14.5px;font-weight:500;color:#181818;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(g.name || g.id)}</span>
                        <span style="font-size:10.5px;color:#b2b2b2;flex-shrink:0;margin-left:6px;">${timeLabel}</span>
                    </div>
                    <div style="font-size:12px;color:#999999;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${escapeHtml(preview)}</div>
                </div>
            </div>
        `).join('');
    }

    // 微信 App 整体调度中枢
    function renderChatApp(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

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

        if (_activeBottomTab === 'chats') {
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
        } else if (_activeBottomTab === 'moments') {
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
        } else if (_activeBottomTab === 'profile') {
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
                <button onclick="window.switchWechatBottomTab('chats')" style="border:none;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:${_activeBottomTab === 'chats' ? '#07c160' : '#888888'};">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                    <span style="font-size:10.5px;font-weight:${_activeBottomTab === 'chats' ? '600' : 'normal'};">微信</span>
                </button>
                <button onclick="window.switchWechatBottomTab('moments')" style="border:none;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:${_activeBottomTab === 'moments' ? '#07c160' : '#888888'};">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3"/></svg>
                    <span style="font-size:10.5px;font-weight:${_activeBottomTab === 'moments' ? '600' : 'normal'};">动态</span>
                </button>
                <button onclick="window.switchWechatBottomTab('profile')" style="position:relative;border:none;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:${_activeBottomTab === 'profile' ? '#07c160' : '#888888'};">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    <span style="font-size:10.5px;font-weight:${_activeBottomTab === 'profile' ? '600' : 'normal'};">我</span>
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

        if (_activeBottomTab === 'chats') {
            container.querySelectorAll('.chat-item[data-npc-id]').forEach(item => {
                const id = item.dataset.npcId;
                if (typeof bindLongPressEvent === 'function') {
                    bindLongPressEvent(item, () => { window.openChat(id); }, () => {
                        if (typeof window.openNpcProfileCardModal === 'function') window.openNpcProfileCardModal(id);
                    });
                } else {
                    item.onclick = () => window.openChat(id);
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

    window.switchWechatBottomTab = function(tabName) {
        _activeBottomTab = tabName;
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
                <div class="wechat-action-item" onclick="window.openCreateGroupModal()">发起群聊</div>
                <div class="wechat-action-item" onclick="window.openSocialRequestsModal()">朋友与群邀请 ${reqCount > 0 ? `<span style="color:#fa5151;font-weight:600;">(${reqCount})</span>` : ''}</div>
                <div class="wechat-action-cancel" onclick="this.closest('.wechat-action-sheet-mask').remove()">取消</div>
            </div>
        `;
        document.body.appendChild(mask);
    };

    // 添加联系人
    window.openCreateCustomNpcModal = function() {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };

        if (typeof window.openWechatCleanModal === 'function') {
            window.openWechatCleanModal(`添加联系人`, `
                <div style="display:flex;flex-direction:column;gap:10px;text-align:left;">
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

    // ============================================================
    // 💬 单人私聊窗口渲染（带消息折叠与防卡顿优化）
    // ============================================================
    function renderSingleChatWindow(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

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

        // 聊天记录折叠逻辑处理
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
                    <button id="btnChatLightningTrigger" onclick="window.triggerAIReplyForSingle('${npcId}')" style="border:none;background:#07c160;color:#fff;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="生成回复">
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
        else if (msg.type === 'shared_moment') summaryText = `[朋友圈分享]`;
        else if (msg.type === 'contact_card') summaryText = `[名片] ${msg.contactCard?.name || ''}`;
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
        if (idx !== -1) return;

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
                renderSingleChatWindow();
            } else {
                if (!window.G.groupChatHistory[id]) window.G.groupChatHistory[id] = [];
                window.G.groupChatHistory[id].push(msgObj);
                if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
            }

            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        });
    };

    // 🤖 单人私聊 AI 回复触发（带跨时段与隔夜双时间戳感知）
    window.triggerAIReplyForSingle = async function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', region: '中国', name: '主播' };

        if (window.isAccountBlockedByNpc(npcId, curAcc.id)) {
            if (typeof showToast === 'function') showToast('当前账号已被对方拒收', 'error');
            return;
        }

        if (window._MCYT_CHAT_GENERATING[npcId]) {
            if (typeof showToast === 'function') showToast('对方正在回复中，请稍候', 'info', 1000);
            return;
        }

        window._MCYT_CHAT_GENERATING[npcId] = true;
        if (window.G.currentChatNpc === npcId) renderSingleChatWindow();

        let bannerTimer = setTimeout(() => {
            if (window._MCYT_CHAT_GENERATING[npcId]) {
                window.showGeneratingBanner(npc.remark || npc.name);
            }
        }, 3000);

        const history = window.getAccountChatHistory(npcId, curAcc.id);
        const isBehindActive = !!window.G._behindScreenActive[npcId];

        let lastMsgTime = '';
        let lastMsgTimestamp = null;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].from === 'player' || history[i].from === 'npc') {
                lastMsgTime = history[i].time || '';
                lastMsgTimestamp = history[i].timestamp || null;
                break;
            }
        }

        let peekNotice = '';
        let lastRecommendedAltCard = null;

        const recentDialogue = history.slice(-14).map(m => {
            const speaker = (m.from === 'player') ? curAcc.name : (npc.name);
            if (m.from === 'action' && m.recalledWasPeeked && !m.peekHandled && m.recalledText) {
                peekNotice += `\n【系统单次提醒】：对方刚才撤回了一条消息：“${m.recalledText}”，你在手机通知栏不经意瞄到了一眼。随口调侃一句或吐槽网速即可，严禁在后续多轮对话中反复抓着问。\n`;
                m.peekHandled = true;
                return `[系统]: 对方撤回了一条消息`;
            }
            if (m.type === 'voice') return `${speaker} [语音]: ${m.text || ''}`;
            if (m.type === 'shared_moment') return `${speaker} [分享了朋友圈动态]: ${m.sharedMoment?.author} 发的 “${m.sharedMoment?.body || ''}”；配图：${m.sharedMoment?.imageDesc || '无'}；评论区八卦：${m.sharedMoment?.commentsSummary || '暂无评论'}`;
            if (m.type === 'contact_card') {
                if (m.contactCard && m.contactCard.isAlt) {
                    lastRecommendedAltCard = m.contactCard;
                }
                return `${speaker} [推荐了名片]: ${m.contactCard?.name}（人设：${m.contactCard?.persona || 'MC同伴'}，签名：“${m.contactCard?.signature || '无'}”，身份：${m.contactCard?.isAlt ? '对方的小号' : '新朋友'}）`;
            }
            if (m.type === 'moment_notice') return `[系统提醒]: ${m.author} 刚发了一条新朋友圈动态`;
            if (m.originalText) return `${speaker}: ${m.originalText} (译: ${m.text || ''})`;
            if (m.imageDesc) return `${speaker} [发了张照片，画面描绘]: ${m.imageDesc}`;
            if (m.type === 'image' || m.imageUrl) return `${speaker} [发了张自拍/游戏截图]`;
            return `${speaker}: ${m.text || ''}`;
        }).join('\n');

        const promptCtx = (window.ChatPromptEngine && typeof window.ChatPromptEngine.buildWechatAIPromptContext === 'function')
            ? window.ChatPromptEngine.buildWechatAIPromptContext({
                npc,
                curAcc,
                recentDialogueText: recentDialogue + peekNotice,
                isBehindActive,
                lastMsgTime,
                lastMsgTimestamp
            })
            : {
                sysPrompt: `扮演MC好友「${npc.name}」，严禁句末加句号，严禁括号动作描写。`,
                userPrompt: recentDialogue ? `最近对话：\n${recentDialogue}\n\n回复：` : '打个招呼。'
            };

        try {
            const raw = await callAI([
                { role: 'system', content: promptCtx.sysPrompt },
                { role: 'user', content: promptCtx.userPrompt }
            ], { maxTokens: 450, temperature: 0.86, silent: true });

            let clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();
            clean = clean.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '').trim();

            if (lastRecommendedAltCard && lastRecommendedAltCard.isAlt) {
                const agreeKeywords = ['加了', '加上了', '去加', '同意', '通过', '搜了', '发申请', '加你小号', '加那个号', '扫了'];
                const hasAgreed = agreeKeywords.some(kw => clean.includes(kw));
                if (hasAgreed) {
                    if (!window.G.friendRequests) window.G.friendRequests = [];
                    const alreadySent = window.G.friendRequests.some(r => r.applicantNpcId === npc.id && r.targetAccountId === lastRecommendedAltCard.id);
                    if (!alreadySent) {
                        window.G.friendRequests.push({
                            id: 'freq_' + Date.now(),
                            applicantNpcId: npc.id,
                            targetAccountId: lastRecommendedAltCard.id,
                            name: npc.name,
                            region: npc.region || '中国',
                            persona: npc.persona || '你的好友',
                            signature: npc.signature || '',
                            favor: npc.favor || 50,
                            avatar: npc.avatarUrl || 'assets/icons/chat.png',
                            reason: `我是 ${npc.name}，你刚才把名片推给我啦，来加上！`,
                            time: new Date().toLocaleTimeString().slice(0, 5)
                        });
                    }
                }
            }

            const estInputTokens = Math.round((promptCtx.sysPrompt.length + promptCtx.userPrompt.length) * 1.35);
            const estOutputTokens = Math.round(clean.length * 1.35);
            window.recordTokenHistoryEntry({
                time: new Date().toLocaleTimeString().slice(0, 5),
                targetName: npc.remark || npc.name,
                type: '私聊',
                inTokens: estInputTokens,
                outTokens: estOutputTokens,
                totalTokens: estInputTokens + estOutputTokens
            });

            let behindText = '';
            const bsMatch = clean.match(/\[BEHIND_SCREEN\]([\s\S]*?)\[\/BEHIND_SCREEN\]/i);
            if (bsMatch) {
                behindText = bsMatch[1].trim();
                clean = clean.replace(/\[BEHIND_SCREEN\][\s\S]*?\[\/BEHIND_SCREEN\]/gi, '').trim();
            }

            const entities = window.parseAIReplyEntities(clean, npc.name);
            const finalEntities = (entities && entities.length) ? entities : [{ type: 'text', text: '在呢' }];

            for (let i = 0; i < finalEntities.length; i++) {
                const item = finalEntities[i];
                const time = new Date().toLocaleTimeString().slice(0, 5);

                if (item.type === 'moment_notice') {
                    window.pushChatMessageSafe(npcId, {
                        from: 'action',
                        type: 'moment_notice',
                        momentId: item.momentId,
                        author: item.author,
                        text: item.text,
                        time,
                        timestamp: Date.now()
                    }, curAcc.id);
                } else if (item.type === 'voice') {
                    window.pushChatMessageSafe(npcId, {
                        from: 'npc',
                        type: 'voice',
                        seconds: item.seconds || 3,
                        audioBg: item.audioBg || '',
                        text: item.text || '',
                        time,
                        timestamp: Date.now()
                    }, curAcc.id);
                } else if (item.type === 'sticker_entity') {
                    const resolved = window.resolveStickerImageUrl(item.category, item.desc);
                    if (resolved) {
                        window.pushChatMessageSafe(npcId, {
                            from: 'npc',
                            type: 'sticker',
                            stickerUrl: resolved.url,
                            stickerDesc: resolved.desc,
                            text: `[表情: ${resolved.desc}]`,
                            time,
                            timestamp: Date.now()
                        }, curAcc.id);
                    } else {
                        window.pushChatMessageSafe(npcId, {
                            from: 'npc',
                            type: 'text',
                            text: `[${item.desc || '表情'}]`,
                            time,
                            timestamp: Date.now()
                        }, curAcc.id);
                    }
                } else {
                    window.pushChatMessageSafe(npcId, {
                        from: 'npc',
                        type: 'text',
                        text: item.text || '',
                        originalText: item.originalText || null,
                        time,
                        timestamp: Date.now()
                    }, curAcc.id);
                }

                if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
                if (i < finalEntities.length - 1) {
                    await new Promise(r => setTimeout(r, 420));
                }
            }

            if (behindText && isBehindActive) {
                window.pushChatMessageSafe(npcId, {
                    from: 'behind_screen',
                    text: behindText,
                    time: new Date().toLocaleTimeString().slice(0, 5),
                    timestamp: Date.now()
                }, curAcc.id);
                if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
            }

            if (typeof autoSaveGame === 'function') autoSaveGame();
        } catch(e) {
            console.error('API 回复失败:', e);
            if (typeof showToast === 'function') showToast('回复失败，请检查AI配置', 'error');
        } finally {
            clearTimeout(bannerTimer);
            delete window._MCYT_CHAT_GENERATING[npcId];
            window.hideGeneratingBanner();
            if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
        }
    };

    function buildChatStickerDrawerHTML(type, id) {
        if (typeof ensureStickersLoaded === 'function') ensureStickersLoaded();
        const cats = window.G.stickerCategories || ['猪猪'];
        const active = window.G.activeStickerCategory || cats[0];
        const list = (window.G.stickerLibrary || []).filter(s => s && s.category === active);

        const tabsHtml = cats.map(c => `
            <span onclick="window.switchChatStickerCategory('${escapeHtml(c)}','${type}','${id}')" style="display:inline-block;padding:4px 10px;margin-right:6px;border-radius:12px;font-size:12px;cursor:pointer;flex-shrink:0;background:${c === active ? '#07c160' : '#e8e8e8'};color:${c === active ? '#fff' : '#666'};">${escapeHtml(c)}</span>
        `).join('');

        let cardsHtml = `
            <div class="wechat-sticker-card" onclick="window.openAddStickerChoiceModal('${type}','${id}')" title="添加新表情" style="border:1px dashed #bbb;background:#fafafa;">
                <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:#888888;stroke-width:2;stroke-linecap:round;">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </div>
        `;

        cardsHtml += list.map(s => `
            <div class="wechat-sticker-card" onclick="window.sendChatSticker('${type}','${id}','${escapeHtml(s.url)}','${escapeHtml((s.desc || '').replace(/'/g, ''))}')" title="${escapeHtml(s.desc || '')}">
                <img src="${escapeHtml(s.url)}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
            </div>
        `).join('');

        return `
        <div id="chatStickerDrawer" style="background:#f7f7f7;border-top:0.5px solid #dcdcdc;flex-shrink:0;animation:wechatSlideUp 0.18s ease-out;">
            <div style="display:flex;align-items:center;overflow-x:auto;padding:8px 10px 4px;white-space:nowrap;">
                ${tabsHtml}
                <button onclick="window.openCreateStickerCategoryModal('${type}','${id}')" style="border:0.5px solid #ccc;background:#fff;padding:3px 8px;border-radius:10px;font-size:11px;color:#555;cursor:pointer;margin-left:4px;white-space:nowrap;">+ 分组</button>
            </div>
            <div class="wechat-sticker-grid">
                ${cardsHtml}
            </div>
        </div>`;
    }
    window.buildChatStickerDrawerHTML = buildChatStickerDrawerHTML;

    window.toggleChatStickerDrawer = function(type, id) {
        window._stickerDrawerOpen = !window._stickerDrawerOpen;
        window._plusDrawerOpen = false;
        if (type === 'single') renderSingleChatWindow();
        else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
    };

    window.switchChatStickerCategory = function(cat, type, id) {
        window.G.activeStickerCategory = cat;
        if (type === 'single') renderSingleChatWindow();
        else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
    };

    window.openAddStickerChoiceModal = function(type, id) {
        const curCat = window.G.activeStickerCategory || '猪猪';
        window.openWechatCleanModal(`添加表情包`, `
            <div style="display:flex;flex-direction:column;gap:8px;">
                <label style="border:1px solid #dcdcdc;background:#f9f9f9;padding:12px;border-radius:6px;font-size:13px;font-weight:500;color:#333;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
                    <span>从手机相册导入本地表情</span>
                    <input type="file" id="localStickerFileInput" accept="image/*" style="display:none;">
                    <span style="color:#07c160;font-size:15px;">›</span>
                </label>
            </div>
        `, () => {});

        setTimeout(() => {
            const input = document.getElementById('localStickerFileInput');
            if (input) {
                input.onchange = (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const base64Data = evt.target.result;
                        document.querySelector('.wechat-clean-modal-mask')?.remove();
                        window.openStickerRemarkModal(base64Data, curCat, type, id);
                    };
                    reader.readAsDataURL(file);
                };
            }
        }, 30);
    };

    window.openStickerRemarkModal = function(base64Url, cat, type, id) {
        window.openWechatCleanModal('设置表情备注', `
            <div style="display:flex;justify-content:center;margin-bottom:12px;">
                <img src="${base64Url}" style="width:80px;height:80px;border-radius:6px;object-fit:contain;background:#f0f0f0;">
            </div>
            <input type="text" id="wcleanStickerDescInput" placeholder="输入表情情绪备注（如：开心、白眼）..." class="wechat-clean-input">
        `, () => {
            const desc = document.getElementById('wcleanStickerDescInput').value.trim() || '自定义表情';
            if (!window.G.stickerLibrary) window.G.stickerLibrary = [];
            window.G.stickerLibrary.push({ category: cat, desc, url: base64Url });
            if (typeof showToast === 'function') showToast('表情已添加', 'success', 1200);
            if (type === 'single') renderSingleChatWindow();
            else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        });
    };

    window.openCreateStickerCategoryModal = function(type, id) {
        window.openWechatCleanModal('新建表情分组', `
            <input type="text" id="wcleanNewCatInput" placeholder="输入分组名称..." class="wechat-clean-input">
        `, () => {
            const val = document.getElementById('wcleanNewCatInput').value.trim();
            if (!val) return false;
            if (!window.G.stickerCategories) window.G.stickerCategories = ['猪猪'];
            if (!window.G.stickerCategories.includes(val)) window.G.stickerCategories.push(val);
            window.G.activeStickerCategory = val;
            if (type === 'single') renderSingleChatWindow();
            else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        });
    };

    // 完整的 6 大功能加号抽屉面板
    function buildChatPlusDrawerHTML(type, id) {
        return `
        <div id="chatPlusDrawer" style="background:#f7f7f7;border-top:0.5px solid #dcdcdc;flex-shrink:0;animation:wechatSlideUp 0.18s ease-out;">
            <div class="wechat-plus-grid">
                <div class="wechat-plus-item" onclick="window.openChatSendImageModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#07c160;stroke-width:1.8;stroke-linecap:round;"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                    <span class="wechat-plus-label">发送图片</span>
                </div>
                <div class="wechat-plus-item" onclick="window.openRecommendContactModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#0284c7;stroke-width:1.8;stroke-linecap:round;"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                    </div>
                    <span class="wechat-plus-label">推荐名片</span>
                </div>
                <div class="wechat-plus-item" onclick="window._plusDrawerOpen=false; window.openChatCollapseSettingsModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#d97706;stroke-width:1.8;stroke-linecap:round;"><rect x="4" y="4" width="16" height="16" rx="2"></rect><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    </div>
                    <span class="wechat-plus-label">聊天折叠</span>
                </div>
                <div class="wechat-plus-item" onclick="window._plusDrawerOpen=false; window.openTokenMonitorModal()">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#8b5cf6;stroke-width:1.8;stroke-linecap:round;"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 3"></path></svg>
                    </div>
                    <span class="wechat-plus-label">Token 统计</span>
                </div>
                <div class="wechat-plus-item" onclick="window._plusDrawerOpen=false; window.openCollabVideoPublishModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#ff5252;stroke-width:1.8;stroke-linecap:round;"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2"></rect></svg>
                    </div>
                    <span class="wechat-plus-label">共创视频</span>
                </div>
                <div class="wechat-plus-item" onclick="window._plusDrawerOpen=false; window.handleInviteCollabStream('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#2563eb;stroke-width:1.8;stroke-linecap:round;"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>
                    </div>
                    <span class="wechat-plus-label">连麦开播</span>
                </div>
            </div>
        </div>`;
    }
    window.buildChatPlusDrawerHTML = buildChatPlusDrawerHTML;

    window.toggleChatPlusDrawer = function(type, id) {
        window._plusDrawerOpen = !window._plusDrawerOpen;
        window._stickerDrawerOpen = false;
        if (type === 'single') renderSingleChatWindow();
        else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
    };

    // 🗂️ 聊天记录自动折叠设置弹窗
    window.openChatCollapseSettingsModal = function(type, id) {
        const cfg = getChatCollapseConfig();

        window.openWechatCleanModal('聊天记录折叠', `
            <div style="text-align:left;font-size:13px;color:#333;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;border-bottom:0.5px solid #f0f0f0;margin-bottom:12px;">
                    <div>
                        <div style="font-weight:600;color:#181818;">开启早期消息折叠</div>
                        <div style="font-size:11.5px;color:#888;margin-top:2px;">仅显示最近消息，大幅减轻滑动卡顿</div>
                    </div>
                    <input type="checkbox" id="wcleanCollapseToggle" ${cfg.enabled ? 'checked' : ''} style="width:18px;height:18px;accent-color:#07c160;cursor:pointer;">
                </div>
                <div>
                    <label style="font-size:12px;color:#666;font-weight:600;display:block;margin-bottom:4px;">保留最近消息条数：</label>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input type="number" id="wcleanCollapseLimit" value="${cfg.limit || 50}" min="15" max="200" step="5" class="wechat-clean-input" style="width:100px;">
                        <span style="font-size:12px;color:#888;">条（推荐 30~60）</span>
                    </div>
                </div>
            </div>
        `, () => {
            const enabled = document.getElementById('wcleanCollapseToggle')?.checked ?? true;
            let limit = parseInt(document.getElementById('wcleanCollapseLimit')?.value) || 50;
            if (limit < 10) limit = 10;
            if (limit > 300) limit = 300;

            saveChatCollapseConfig({ enabled, limit });
            if (typeof showToast === 'function') showToast('折叠设置已生效', 'success', 1000);

            if (type === 'single') renderSingleChatWindow();
            else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
        });
    };

    // 📇 推荐名片选择弹窗
    window.openRecommendContactModal = function(type, id) {
        window._plusDrawerOpen = false;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };
        
        let allAccounts = [];
        if (typeof window.getWechatAccountsList === 'function') {
            allAccounts = window.getWechatAccountsList();
        } else if (Array.isArray(window.G.altAccounts)) {
            allAccounts = window.G.altAccounts;
        } else {
            try {
                const raw = localStorage.getItem('mcyt_wechat_accounts_v1') || localStorage.getItem('mcyt_alt_accounts');
                if (raw) allAccounts = JSON.parse(raw);
            } catch (_) {}
        }
        
        const mainAccName = window.G.player?.ytName || '主号';
        const hasMainInList = allAccounts.some(a => a.id === 'main');
        if (!hasMainInList) {
            allAccounts.unshift({
                id: 'main',
                name: mainAccName,
                avatar: window.G.player?.avatar || 'assets/icons/chat.png',
                signature: window.G.player?.signature || '',
                personaTag: '主账号'
            });
        }

        const candidateFriends = Object.values(window.G.npcs || {}).filter(n => {
            if (n.id === id) return false;
            if (!n.ownerAccountId || n.ownerAccountId === curAcc.id || n.ownerAccountId === 'all') return true;
            return false;
        });

        const otherMyAccounts = allAccounts.filter(a => a.id !== curAcc.id);

        let friendsHtml = candidateFriends.map(n => {
            const cardDisplayName = n.remark ? `${n.remark} (${n.name})` : n.name;
            return `
            <div onclick="window.doSendContactCardDirect('${type}', '${id}', '${n.id}', '${escapeHtml(n.name)}', '${escapeHtml(n.persona || '好友')}', '${escapeHtml(n.avatarUrl || '')}', false, '${escapeHtml(n.signature || '')}')" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid #f2f2f2;cursor:pointer;">
                <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
                    <div style="width:34px;height:34px;border-radius:4px;overflow:hidden;background:#eee;flex-shrink:0;">
                        <img src="${n.avatarUrl || 'assets/icons/chat.png'}" style="width:100%;height:100%;object-fit:cover;">
                    </div>
                    <div style="min-width:0;flex:1;">
                        <div style="font-size:13.5px;color:#181818;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(cardDisplayName)}</div>
                        ${n.signature ? `<div style="font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(n.signature)}</div>` : ''}
                    </div>
                </div>
                <span style="font-size:12px;color:#07c160;font-weight:600;flex-shrink:0;margin-left:8px;">发送 ›</span>
            </div>
        `;
        }).join('');

        let altsHtml = otherMyAccounts.map(a => `
            <div onclick="window.doSendContactCardDirect('${type}', '${id}', '${a.id}', '${escapeHtml(a.name)}', '我的身份（${escapeHtml(a.personaTag || (a.id === 'main' ? '主号' : '小号'))}）', '${escapeHtml(a.avatar || 'assets/icons/chat.png')}', true, '${escapeHtml(a.signature || '')}')" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid #f2f2f2;cursor:pointer;">
                <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
                    <div style="width:34px;height:34px;border-radius:4px;overflow:hidden;background:#eee;flex-shrink:0;">
                        <img src="${a.avatar || 'assets/icons/chat.png'}" style="width:100%;height:100%;object-fit:cover;">
                    </div>
                    <div style="min-width:0;flex:1;">
                        <div style="display:flex;align-items:center;gap:4px;">
                            <span style="font-size:13.5px;color:#181818;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(a.name)}</span>
                            <span style="font-size:10px;background:#e0f2fe;color:#0369a1;padding:1px 4px;border-radius:3px;flex-shrink:0;">${a.id === 'main' ? '我的主号' : '我的小号'}</span>
                        </div>
                        ${a.signature ? `<div style="font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(a.signature)}</div>` : ''}
                    </div>
                </div>
                <span style="font-size:12px;color:#07c160;font-weight:600;flex-shrink:0;margin-left:8px;">发送 ›</span>
            </div>
        `).join('');

        window.openWechatCleanModal('推荐名片', `
            <div style="text-align:left;">
                <div style="font-size:11.5px;color:#888;margin-bottom:6px;font-weight:600;">推荐我的其他小号：</div>
                <div style="margin-bottom:12px;">
                    ${altsHtml || '<div style="color:#bbb;font-size:12px;padding:4px 0;">暂无其他小号</div>'}
                </div>
                <div style="font-size:11.5px;color:#888;margin-bottom:6px;font-weight:600;">推荐当前通讯录好友：</div>
                <div style="max-height:160px;overflow-y:auto;">
                    ${friendsHtml || '<div style="text-align:center;color:#bbb;padding:16px 0;font-size:12px;">暂无可推荐的好友名片</div>'}
                </div>
            </div>
        `, () => {});
    };

    // 发送名片
    window.doSendContactCardDirect = function(type, targetId, cardId, name, persona, avatar, isAlt, signature) {
        document.querySelector('.wechat-clean-modal-mask')?.remove();
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };
        const time = new Date().toLocaleTimeString().slice(0, 5);

        const cardMsg = {
            from: 'player',
            isPlayer: true,
            senderName: curAcc.name,
            type: 'contact_card',
            text: `[推荐了名片: ${name}]`,
            contactCard: {
                id: cardId,
                name: name,
                persona: persona,
                avatar: avatar,
                isAlt: isAlt,
                signature: signature || ''
            },
            time,
            timestamp: Date.now()
        };

        if (type === 'single') {
            window.pushChatMessageSafe(targetId, cardMsg, curAcc.id);
            renderSingleChatWindow();
        } else {
            if (!window.G.groupChatHistory[targetId]) window.G.groupChatHistory[targetId] = [];
            window.G.groupChatHistory[targetId].push(cardMsg);
            if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
        }

        if (typeof showToast === 'function') showToast('名片已发送', 'success', 1200);
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
    };

    // 📊 最近 10 轮 Token 统计弹窗
    window.openTokenMonitorModal = function() {
        const list = window.getTokenHistoryList();
        if (list.length === 0) {
            window.openWechatCleanModal('Token 消耗明细', `
                <div style="text-align:center;color:#888;padding:24px 0;font-size:13px;">
                    暂无近期交互记录
                </div>
            `, () => {});
            return;
        }

        let rowsHtml = list.map((item, idx) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid #f0f0f0;font-size:12px;">
                <div>
                    <div style="font-weight:600;color:#181818;">#${idx + 1} [${item.type}] ${escapeHtml(item.targetName)}</div>
                    <div style="font-size:10.5px;color:#999;margin-top:2px;">时间: ${item.time}</div>
                </div>
                <div style="text-align:right;">
                    <div style="color:#07c160;font-weight:700;">总计: ${item.totalTokens}t</div>
                    <div style="font-size:10.5px;color:#888;">入:${item.inTokens} / 出:${item.outTokens}</div>
                </div>
            </div>
        `).join('');

        window.openWechatCleanModal('最近 10 轮 Token 统计', `
            <div style="max-height:260px;overflow-y:auto;padding-right:4px;">
                ${rowsHtml}
            </div>
            <div style="font-size:11px;color:#999;text-align:center;margin-top:10px;">仅保留历史最近 10 轮</div>
        `, () => {});
    };

    // 📷 聊天发图片（恢复完整的 3 种模式）
    window.openChatSendImageModal = function(type, id) {
        let chatSendMode = 'text_only';
        let uploadedChatImg = null;

        window.openWechatCleanModal('发送图片消息', `
            <div style="text-align:left;">
                <div style="font-size:12px;color:#666;margin-bottom:6px;font-weight:600;">选择发图模式：</div>
                <div style="display:flex;gap:6px;margin-bottom:12px;">
                    <button type="button" id="btnChatModeText" class="moment-mode-tab-btn active" onclick="window._switchChatSendMode('text_only')">① 文字代替图片</button>
                    <button type="button" id="btnChatModeReal" class="moment-mode-tab-btn" onclick="window._switchChatSendMode('real_only')">② 纯真实图片</button>
                    <button type="button" id="btnChatModeBoth" class="moment-mode-tab-btn" onclick="window._switchChatSendMode('real_with_desc')">③ 真实图+文字描绘</button>
                </div>

                <div id="panelChatTextOnly" style="display:block;">
                    <div style="font-size:11.5px;color:#888;margin-bottom:4px;">填写画面描绘（点击卡片翻转查看）：</div>
                    <textarea id="wchatFlipDescInput" rows="3" placeholder="例如：我在平原建造好的两层原木别墅、箱子里的整整一组下界合金锭..." class="wechat-clean-input" style="line-height:1.4;resize:none;"></textarea>
                </div>

                <div id="panelChatRealImg" style="display:none;">
                    <div style="margin-bottom:8px;">
                        <label style="border:1px dashed #07c160;background:#f6fbf8;color:#07c160;padding:10px;border-radius:6px;font-size:13px;font-weight:500;text-align:center;cursor:pointer;display:block;">
                            <span>从手机相册选择图片</span>
                            <input type="file" id="wchatFileInput" accept="image/*" style="display:none;">
                        </label>
                        <div id="wchatFilePreviewWrap" style="display:none;text-align:center;margin-top:8px;">
                            <img id="wchatFilePreview" src="" style="max-height:100px;border-radius:6px;object-fit:cover;">
                        </div>
                    </div>
                </div>

                <div id="panelChatExtraDesc" style="display:none;">
                    <div style="font-size:11.5px;color:#888;margin-bottom:4px;">向对方描述图片内容（极省Token）：</div>
                    <textarea id="wchatRealDescInput" rows="2" placeholder="向AI描述图片中的关键画面（如：我的血量只剩半颗心，正在被苦力怕追赶）" class="wechat-clean-input" style="line-height:1.4;resize:none;"></textarea>
                </div>
            </div>
        `, () => {
            const time = new Date().toLocaleTimeString().slice(0, 5);
            const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };
            let msgObj = null;

            if (chatSendMode === 'text_only') {
                const desc = document.getElementById('wchatFlipDescInput').value.trim();
                if (!desc) {
                    if (typeof showToast === 'function') showToast('请填写画面描绘', 'error');
                    return false;
                }
                msgObj = {
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
                    from: 'player',
                    isPlayer: true,
                    type: 'image',
                    imageUrl: uploadedChatImg,
                    imageDesc: null,
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
                const desc = document.getElementById('wchatRealDescInput').value.trim() || 'MC截图';
                msgObj = {
                    from: 'player',
                    isPlayer: true,
                    type: 'image',
                    imageUrl: uploadedChatImg,
                    imageDesc: desc,
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
            } else {
                if (!window.G.groupChatHistory[id]) window.G.groupChatHistory[id] = [];
                window.G.groupChatHistory[id].push(msgObj);
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

            [b1, b2, b3].forEach(b => {
                if (b) {
                    b.style.background = '#f0f0f0';
                    b.style.color = '#555';
                }
            });

            if (mode === 'text_only') {
                if (b1) { b1.style.background = '#07c160'; b1.style.color = '#fff'; }
                if (pText) pText.style.display = 'block';
                if (pReal) pReal.style.display = 'none';
                if (pDesc) pDesc.style.display = 'none';
            } else if (mode === 'real_only') {
                if (b2) { b2.style.background = '#07c160'; b2.style.color = '#fff'; }
                if (pText) pText.style.display = 'none';
                if (pReal) pReal.style.display = 'block';
                if (pDesc) pDesc.style.display = 'none';
            } else if (mode === 'real_with_desc') {
                if (b3) { b3.style.background = '#07c160'; b3.style.color = '#fff'; }
                if (pText) pText.style.display = 'none';
                if (pReal) pReal.style.display = 'block';
                if (pDesc) pDesc.style.display = 'block';
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

        if (type === 'single') {
            const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
            if (window.isAccountBlockedByNpc(id, curAcc.id)) {
                if (typeof showToast === 'function') showToast('对方已拒收你的消息', 'error');
                return;
            }
            window.pushChatMessageSafe(id, { from: 'player', isPlayer: true, type: 'sticker', stickerUrl: url, stickerDesc: desc, text: `[表情: ${desc}]`, time, timestamp: Date.now(), quote }, curAcc.id);
        } else {
            if (!window.G.groupChatHistory[id]) window.G.groupChatHistory[id] = [];
            window.G.groupChatHistory[id].push({ from: 'player', isPlayer: true, type: 'sticker', stickerUrl: url, stickerDesc: desc, text: `[表情: ${desc}]`, time, timestamp: Date.now(), quote });
            window.syncChatHistoryToLocalBackup();
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
        input.value = '';
        renderSingleChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.renderChatApp = renderChatApp;
    window.renderSocialPanel = renderChatApp;
    window.renderSingleChatWindow = renderSingleChatWindow;

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
