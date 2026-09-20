/**
 * js/apps/chat/chat-group-settings.js
 * ⚙️ 微信群聊资料中心与高级设置独立模块
 * 规范功能：
 * 1. 微信原生白灰微绿设计质感，消除所有复古土味 UI 与原生 select。
 * 2. 聊天信息原生弹窗：右上角坚固渲染微绿矢量齿轮与关闭叉号（✕），彻底移除底部多余的取消/确定按钮。
 * 3. 点击齿轮秒开【群聊高级设定】，点击叉号秒关。
 * 4. 基础资料：群头像（含相册导入、网络URL与🎲一键随机头像，即时落盘与全生态刷新）、群名称、群介绍/公告、解散群聊。
 * 5. 高级设定：群成员网格、接话人数范围、朋友圈轻量 NPC 折叠栏（含添加与折叠）、群管理员任命、仿QQ专属群头衔。
 * 6. 默认角色始终允许发表情包（已剔除冗余手动开关）。
 */

(function() {
    'use strict';

    const GROUP_SETTINGS_STORAGE_KEY = 'mcyt_group_chat_configs';

    // 读取群独立配置
    function getGroupConfig(gid) {
        let store = {};
        try {
            const raw = localStorage.getItem(GROUP_SETTINGS_STORAGE_KEY);
            if (raw) store = JSON.parse(raw);
        } catch (_) {}
        return store[gid] || {
            apiMode: 'unified',
            allowMultiMsgs: true,
            syncToRememori: false,
            minSpeakers: 1,
            maxSpeakers: 3,
            allowStickers: true,
            admins: [],
            titles: {},
            momentNpcs: []
        };
    }

    // 保存群独立配置
    function saveGroupConfig(gid, cfg) {
        let store = {};
        try {
            const raw = localStorage.getItem(GROUP_SETTINGS_STORAGE_KEY);
            if (raw) store = JSON.parse(raw);
        } catch (_) {}
        store[gid] = Object.assign(getGroupConfig(gid), cfg);
        try {
            localStorage.setItem(GROUP_SETTINGS_STORAGE_KEY, JSON.stringify(store));
        } catch (_) {}
    }

    /**
     * 👥 打开群聊信息与基础资料面板（图一：独立专属白灰微绿卡片，免去通用弹窗的底部按钮干扰）
     */
    window.openGroupSettingsModal = function(gid) {
        // 先清理可能残存的旧弹窗遮罩
        document.querySelectorAll('.wechat-clean-modal-mask, .group-info-modal-mask').forEach(el => el.remove());

        const group = window.G.groups && window.G.groups[gid];
        if (!group) return;

        const groupAvatar = group.avatar || 'assets/icons/chat.png';

        const mask = document.createElement('div');
        mask.className = 'group-info-modal-mask';
        mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;box-sizing:border-box;animation:wechatFadeIn 0.18s ease-out;';

        mask.innerHTML = `
            <div class="group-info-modal-card" style="background:#ffffff;border-radius:14px;width:100%;max-width:330px;box-shadow:0 12px 36px rgba(0,0,0,0.22);overflow:hidden;display:flex;flex-direction:column;position:relative;animation:wechatScaleUp 0.18s ease-out;">
                
                <!-- 顶栏：居中标题 + 右侧齿轮与关闭叉号 -->
                <div style="position:relative;height:52px;display:flex;align-items:center;justify-content:center;border-bottom:0.5px solid #f2f2f2;padding:0 16px;">
                    <span style="font-size:16px;font-weight:600;color:#181818;">聊天信息</span>
                    
                    <div style="position:absolute;right:14px;top:0;height:100%;display:flex;align-items:center;gap:14px;">
                        <!-- ⚙️ 微绿矢量齿轮（直通群聊高级设定） -->
                        <div id="btnGroupHeaderGear" title="群聊高级设定" style="cursor:pointer;display:flex;align-items:center;justify-content:center;color:#07c160;padding:2px;-webkit-tap-highlight-color:transparent;">
                            <svg viewBox="0 0 24 24" style="width:23px;height:23px;fill:none;stroke:#07c160;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </div>

                        <!-- ✕ 优雅细线关闭叉号 -->
                        <div id="btnGroupHeaderClose" title="关闭" style="cursor:pointer;display:flex;align-items:center;justify-content:center;color:#888;padding:2px;-webkit-tap-highlight-color:transparent;">
                            <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:#666666;stroke-width:2.2;stroke-linecap:round;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </div>
                    </div>
                </div>

                <!-- 内容主体 -->
                <div style="padding:16px;display:flex;flex-direction:column;gap:14px;max-height:70vh;overflow-y:auto;">
                    <!-- 群头像修改 -->
                    <div onclick="window.openEditGroupAvatarModal('${gid}')" style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:0.5px solid #f2f2f2;cursor:pointer;">
                        <span style="font-size:14.5px;color:#181818;font-weight:500;">群头像</span>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <img id="modalGroupAvatarPreview" src="${escapeHtml(groupAvatar)}" style="width:46px;height:46px;border-radius:8px;object-fit:cover;background:#eee;box-shadow:0 1px 3px rgba(0,0,0,0.06);" onerror="this.src='assets/icons/chat.png';">
                            <span style="color:#b2b2b2;font-size:16px;">›</span>
                        </div>
                    </div>

                    <!-- 群聊名称 -->
                    <div onclick="window.openEditGroupNameModal('${gid}')" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:0.5px solid #f2f2f2;cursor:pointer;">
                        <span style="font-size:14.5px;color:#181818;font-weight:500;">群聊名称</span>
                        <div style="font-size:14.5px;color:#181818;display:flex;align-items:center;gap:6px;">
                            <span style="max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;">${escapeHtml(group.name)}</span>
                            <svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:none;stroke:#07c160;stroke-width:2.2;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </div>
                    </div>

                    <!-- 群介绍/公告 -->
                    <div style="display:flex;flex-direction:column;gap:6px;padding:6px 0;border-bottom:0.5px solid #f2f2f2;">
                        <div style="display:flex;align-items:center;justify-content:space-between;">
                            <span style="font-size:14.5px;color:#181818;font-weight:500;">群介绍/公告</span>
                            <span onclick="window.openEditGroupDescModal('${gid}')" style="font-size:13px;color:#07c160;cursor:pointer;font-weight:500;">编辑</span>
                        </div>
                        <div style="font-size:12.5px;color:#777;line-height:1.5;background:#f9f9f9;padding:10px 12px;border-radius:6px;min-height:50px;word-break:break-word;">
                            ${escapeHtml(group.description || '暂无群介绍，点击上方编辑完善群公告。')}
                        </div>
                    </div>

                    <!-- 解散并删除群聊 -->
                    <div style="margin-top:10px;padding-bottom:4px;">
                        <button type="button" onclick="window.dismissGroup('${gid}')" style="width:100%;border:none;background:#fff1f0;color:#fa5151;padding:10px;border-radius:8px;font-size:13.5px;font-weight:600;cursor:pointer;">
                            解散并删除群聊
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(mask);

        // 绑定齿轮与叉号事件
        mask.querySelector('#btnGroupHeaderGear').onclick = (e) => {
            e.stopPropagation();
            mask.remove();
            window.openGroupAdvancedSettingsModal(gid);
        };

        mask.querySelector('#btnGroupHeaderClose').onclick = (e) => {
            e.stopPropagation();
            mask.remove();
        };

        // 点击外部遮罩直接关闭
        mask.onclick = (e) => {
            if (e.target === mask) mask.remove();
        };
    };

    /**
     * ⚙️ 群聊高级设定弹窗（图二）
     */
    window.openGroupAdvancedSettingsModal = function(gid) {
        document.querySelectorAll('.wechat-clean-modal-mask, .group-info-modal-mask').forEach(el => el.remove());
        const group = window.G.groups && window.G.groups[gid];
        if (!group) return;
        const cfg = getGroupConfig(gid);

        if (!group.momentNpcs) group.momentNpcs = cfg.momentNpcs || [];
        const momentNpcs = group.momentNpcs || [];

        const members = (group.members || []).map(mid => window.G.npcs[mid]).filter(Boolean);
        const totalMemberCount = members.length + 1;

        const membersGrid = members.map(m => {
            const isAdmin = (cfg.admins || []).includes(m.id);
            const title = (cfg.titles || {})[m.id];
            return `
            <div style="display:flex;flex-direction:column;align-items:center;gap:3px;width:54px;position:relative;">
                ${window.renderAvatarBadge(m, 44)}
                <span style="font-size:11px;color:#555;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;text-align:center;">${escapeHtml(m.name)}</span>
                ${isAdmin ? `<span style="position:absolute;top:-4px;right:2px;background:#07c160;color:#fff;font-size:9px;padding:0 3px;border-radius:3px;transform:scale(0.85);font-weight:600;">管</span>` : ''}
                ${title ? `<span style="font-size:9px;background:#eef7ee;color:#07c160;padding:1px 3px;border-radius:3px;transform:scale(0.85);max-width:54px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(title)}</span>` : ''}
            </div>
            `;
        }).join('');

        const addMemberBtn = `
            <div onclick="window.openAddGroupMemberModal('${gid}')" style="display:flex;flex-direction:column;align-items:center;gap:3px;width:54px;cursor:pointer;">
                <div style="width:44px;height:44px;border-radius:6px;border:1px dashed #c0c0c0;background:#fafafa;display:flex;align-items:center;justify-content:center;color:#888;">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <span style="font-size:11px;color:#888;text-align:center;">添加</span>
            </div>
        `;

        const removeMemberBtn = `
            <div onclick="window.openRemoveGroupMemberModal('${gid}')" style="display:flex;flex-direction:column;align-items:center;gap:3px;width:54px;cursor:pointer;">
                <div style="width:44px;height:44px;border-radius:6px;border:1px dashed #c0c0c0;background:#fafafa;display:flex;align-items:center;justify-content:center;color:#888;">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <span style="font-size:11px;color:#888;text-align:center;">移除</span>
            </div>
        `;

        const adminCheckboxesHtml = members.map(m => {
            const isAdm = (cfg.admins || []).includes(m.id);
            return `
            <label style="display:inline-flex;align-items:center;gap:5px;background:#f4f4f4;padding:4px 8px;border-radius:4px;font-size:12px;cursor:pointer;">
                <input type="checkbox" class="wclean-admin-check" value="${m.id}" ${isAdm ? 'checked' : ''} style="accent-color:#07c160;">
                <span>${escapeHtml(m.name)}</span>
            </label>
            `;
        }).join('') || '<span style="font-size:11px;color:#999;">群内暂无可指派成员</span>';

        const titleInputsHtml = members.map(m => {
            const currentTitle = (cfg.titles || {})[m.id] || '';
            return `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:0.5px dashed #eee;">
                <span style="font-size:12px;color:#333;width:75px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.name)}</span>
                <input type="text" class="wclean-title-input wechat-clean-input" data-npcid="${m.id}" value="${escapeHtml(currentTitle)}" placeholder="如：后宫一号/首席红石/鸽王" style="flex:1;padding:4px 8px;font-size:12px;">
            </div>
            `;
        }).join('') || '<div style="font-size:11px;color:#999;">暂无可配置头衔的成员</div>';

        let momentNpcCardsHtml = '';
        if (momentNpcs.length > 0) {
            momentNpcCardsHtml = momentNpcs.map((mn, idx) => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:#ffffff;border:0.5px solid #eee;border-radius:6px;margin-bottom:5px;">
                    <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
                        <img src="${mn.avatar || 'assets/icons/chat.png'}" style="width:30px;height:30px;border-radius:4px;object-fit:cover;flex-shrink:0;" onerror="this.src='assets/icons/chat.png';">
                        <div style="min-width:0;flex:1;">
                            <div style="font-size:12.5px;font-weight:600;color:#222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(mn.name)}</div>
                            <div style="font-size:10.5px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(mn.persona || '朋友圈轻量NPC')}</div>
                        </div>
                    </div>
                    <button type="button" onclick="window.removeGroupMomentNpc('${gid}', ${idx})" style="border:none;background:#fee2e2;color:#ef4444;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer;flex-shrink:0;">移出</button>
                </div>
            `).join('');
        } else {
            momentNpcCardsHtml = `<div style="text-align:center;color:#aaa;padding:10px 0;font-size:11.5px;">暂未添加朋友圈 NPC，点击右上角【＋】可直接添加</div>`;
        }

        window.openWechatCleanModal('群聊高级设定', `
            <div style="display:flex;flex-direction:column;gap:16px;text-align:left;max-height:430px;overflow-y:auto;padding-right:4px;">
                
                <!-- 群成员网格 -->
                <div style="border-bottom:0.5px solid #f0f0f0;padding-bottom:12px;">
                    <div style="font-size:13px;color:#666;margin-bottom:10px;font-weight:500;">群成员 (${totalMemberCount}人)</div>
                    <div style="display:flex;flex-wrap:wrap;gap:12px 10px;align-items:flex-start;">
                        <div style="display:flex;flex-direction:column;align-items:center;gap:3px;width:54px;position:relative;">
                            ${window.renderAvatarBadge({ isPlayer: true }, 44)}
                            <span style="font-size:11px;color:#555;text-align:center;">我</span>
                            <span style="position:absolute;top:-4px;right:2px;background:#f59e0b;color:#fff;font-size:9px;padding:0 3px;border-radius:3px;transform:scale(0.85);font-weight:600;">主</span>
                        </div>
                        ${membersGrid}
                        ${addMemberBtn}
                        ${removeMemberBtn}
                    </div>
                </div>

                <!-- 每次接话角色人数范围 -->
                <div style="border-bottom:0.5px solid #f0f0f0;padding-bottom:12px;">
                    <div style="font-size:14px;font-weight:600;color:#181818;margin-bottom:4px;">每次接话角色人数范围</div>
                    <div style="font-size:11.5px;color:#888;margin-bottom:8px;">系统将随机抽取角色交错接话（每人连发2~5条）：</div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:13px;color:#555;">最少</span>
                        <input type="number" id="wcleanMinSpeakers" value="${cfg.minSpeakers || 1}" min="1" max="5" class="wechat-clean-input" style="width:65px;padding:5px 8px;font-size:13px;text-align:center;">
                        <span style="font-size:13px;color:#555;">人 ~ 最多</span>
                        <input type="number" id="wcleanMaxSpeakers" value="${cfg.maxSpeakers || 3}" min="1" max="6" class="wechat-clean-input" style="width:65px;padding:5px 8px;font-size:13px;text-align:center;">
                        <span style="font-size:13px;color:#555;">人</span>
                    </div>
                </div>

                <!-- 朋友圈 NPC 折叠管理栏 -->
                <div style="border-bottom:0.5px solid #f0f0f0;padding-bottom:12px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <div>
                            <div style="font-size:14px;font-weight:600;color:#181818;">朋友圈 NPC (${momentNpcs.length}人)</div>
                            <div style="font-size:11px;color:#888;">仅具备头像、名字与一条简短人设的轻量圈友</div>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div onclick="window.openAddGroupMomentNpcModal('${gid}')" title="添加朋友圈NPC" style="width:26px;height:26px;border-radius:4px;border:1px dashed #07c160;background:#f0faf4;color:#07c160;display:flex;align-items:center;justify-content:center;cursor:pointer;">
                                <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:#07c160;stroke-width:2.2;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </div>
                            <div id="btnToggleMomentNpcCollapse" onclick="window.toggleGroupMomentNpcCollapse()" title="展开/收起" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#888;">
                                <svg id="iconMomentNpcArrow" viewBox="0 0 24 24" style="width:15px;height:15px;fill:currentColor;transform:rotate(0deg);transition:transform .2s;"><path d="M7 10l5 5 5-5z"/></svg>
                            </div>
                        </div>
                    </div>

                    <div id="groupMomentNpcCollapseBody" style="display:none;margin-top:10px;background:#f9f9f9;padding:8px;border-radius:6px;">
                        ${momentNpcCardsHtml}
                    </div>
                </div>

                <!-- 设置群管理员 -->
                <div style="border-bottom:0.5px solid #f0f0f0;padding-bottom:12px;">
                    <div style="font-size:14px;font-weight:600;color:#181818;margin-bottom:4px;">设置群管理员</div>
                    <div style="font-size:11.5px;color:#888;margin-bottom:8px;">任命后会有群系统灰字提示，角色会知晓并在适当时刻起哄维护纪律：</div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;">
                        ${adminCheckboxesHtml}
                    </div>
                </div>

                <!-- 专属群头衔设置 -->
                <div style="border-bottom:0.5px solid #f0f0f0;padding-bottom:12px;">
                    <div style="font-size:14px;font-weight:600;color:#181818;margin-bottom:4px;">群成员专属头衔（仿QQ群头衔）</div>
                    <div style="font-size:11.5px;color:#888;margin-bottom:8px;">换新时产生系统通知，当事角色随口吐槽，吵架时也会拿头衔互损：</div>
                    <div style="display:flex;flex-direction:column;gap:4px;">
                        ${titleInputsHtml}
                    </div>
                </div>

                <!-- API 调用模式 -->
                <div>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                        <span style="font-size:14px;font-weight:600;color:#181818;">API 调用机制</span>
                        <span onclick="window.showGroupApiModeHelp()" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:#07c160;color:#ffffff;font-size:10px;font-weight:bold;cursor:pointer;" title="说明">?</span>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <div id="apiModeOptUnified" onclick="window.selectGroupApiMode('unified')" style="border:${cfg.apiMode === 'unified' ? '1.5px solid #07c160' : '0.5px solid #ddd'};background:${cfg.apiMode === 'unified' ? '#f0faf4' : '#fff'};border-radius:6px;padding:10px 8px;cursor:pointer;text-align:center;">
                            <div style="font-size:12.5px;font-weight:600;color:#181818;">统一调用</div>
                            <div style="font-size:10.5px;color:#888;margin-top:3px;">单次生成交错对话·极省Token</div>
                        </div>
                        <div id="apiModeOptIndividual" onclick="window.selectGroupApiMode('individual')" style="border:${cfg.apiMode === 'individual' ? '1.5px solid #07c160' : '0.5px solid #ddd'};background:${cfg.apiMode === 'individual' ? '#f0faf4' : '#fff'};border-radius:6px;padding:10px 8px;cursor:pointer;text-align:center;">
                            <div style="font-size:12.5px;font-weight:600;color:#181818;">单独调用</div>
                            <div style="font-size:10.5px;color:#888;margin-top:3px;">多角色独立思考·细节更生动</div>
                        </div>
                    </div>
                </div>

                <!-- 角色自由连发 -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding-top:4px;border-top:0.5px solid #f0f0f0;">
                    <div>
                        <div style="font-size:13px;font-weight:500;color:#181818;">允许角色自由连发 (2~5条)</div>
                        <div style="font-size:11px;color:#888;">依据人设性格连发多条短消息，自然穿插互回</div>
                    </div>
                    <label style="position:relative;display:inline-block;width:38px;height:22px;">
                        <input type="checkbox" id="chkGroupMultiMsgs" ${cfg.allowMultiMsgs !== false ? 'checked' : ''} style="opacity:0;width:0;height:0;">
                        <span style="position:absolute;cursor:pointer;inset:0;background:${cfg.allowMultiMsgs !== false ? '#07c160' : '#ccc'};border-radius:22px;transition:.3s;">
                            <span style="position:absolute;height:18px;width:18px;left:${cfg.allowMultiMsgs !== false ? '18px' : '2px'};bottom:2px;background:white;border-radius:50%;transition:.3s;"></span>
                        </span>
                    </label>
                </div>
            </div>
        `, () => {
            let minSpk = parseInt(document.getElementById('wcleanMinSpeakers')?.value) || 1;
            let maxSpk = parseInt(document.getElementById('wcleanMaxSpeakers')?.value) || 3;
            if (minSpk < 1) minSpk = 1;
            if (maxSpk < minSpk) maxSpk = minSpk;

            const selectedAdmins = Array.from(document.querySelectorAll('.wclean-admin-check:checked')).map(cb => cb.value);

            const newTitles = {};
            document.querySelectorAll('.wclean-title-input').forEach(inp => {
                const nid = inp.dataset.npcid;
                const val = inp.value.trim();
                if (nid && val) newTitles[nid] = val;
            });

            const chkMulti = document.getElementById('chkGroupMultiMsgs')?.checked ?? true;
            const currentSelectedMode = window._tempSelectedGroupApiMode || cfg.apiMode;

            const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: '我' };
            const oldAdmins = cfg.admins || [];
            const oldTitles = cfg.titles || {};

            if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
            if (!window.G.groupChatHistory[gid]) window.G.groupChatHistory[gid] = [];

            selectedAdmins.forEach(mid => {
                if (!oldAdmins.includes(mid)) {
                    const mName = window.G.npcs[mid]?.name || '群成员';
                    window.G.groupChatHistory[gid].push({
                        _id: 'sys_' + Date.now() + '_' + Math.floor(Math.random() * 899 + 100),
                        from: 'action',
                        text: `"${curAcc.name}" 设置 "${mName}" 为群管理员`,
                        time: new Date().toLocaleTimeString().slice(0, 5)
                    });
                }
            });

            Object.keys(newTitles).forEach(mid => {
                if (newTitles[mid] !== oldTitles[mid]) {
                    const mName = window.G.npcs[mid]?.name || '群成员';
                    window.G.groupChatHistory[gid].push({
                        _id: 'sys_' + Date.now() + '_' + Math.floor(Math.random() * 899 + 100),
                        from: 'action',
                        text: `"${mName}" 获得了专属群头衔 "${newTitles[mid]}"`,
                        time: new Date().toLocaleTimeString().slice(0, 5)
                    });
                }
            });

            saveGroupConfig(gid, {
                apiMode: currentSelectedMode,
                allowMultiMsgs: chkMulti,
                allowStickers: true,
                minSpeakers: minSpk,
                maxSpeakers: maxSpk,
                admins: selectedAdmins,
                titles: newTitles,
                momentNpcs: group.momentNpcs || []
            });

            window.syncGroupChatsToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            if (typeof showToast === 'function') showToast('群高级设置已更新', 'success', 1200);
            window.openGroupSettingsModal(gid);
            if (window.G.currentChatGroup === gid && typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
        });

        window._tempSelectedGroupApiMode = cfg.apiMode;

        const setupSwitchToggle = (inputId) => {
            const input = document.getElementById(inputId);
            if (!input) return;
            input.onchange = () => {
                const track = input.nextElementSibling;
                const thumb = track.firstElementChild;
                if (input.checked) {
                    track.style.background = '#07c160';
                    thumb.style.left = '18px';
                } else {
                    track.style.background = '#ccc';
                    thumb.style.left = '2px';
                }
            };
        };
        setupSwitchToggle('chkGroupMultiMsgs');
    };

    window.toggleGroupMomentNpcCollapse = function() {
        const body = document.getElementById('groupMomentNpcCollapseBody');
        const arrow = document.getElementById('iconMomentNpcArrow');
        if (!body) return;
        const isCollapsed = body.style.display === 'none';
        if (isCollapsed) {
            body.style.display = 'block';
            if (arrow) arrow.style.transform = 'rotate(180deg)';
        } else {
            body.style.display = 'none';
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
    };

    window.openAddGroupMomentNpcModal = function(gid) {
        const group = window.G.groups && window.G.groups[gid];
        if (!group) return;
        if (!group.momentNpcs) group.momentNpcs = [];

        const curAddedNames = new Set(group.momentNpcs.map(n => n.name));
        const pool = window.G.momentsNpcs || [];

        const candidateListHtml = pool.map((n, idx) => {
            const isAdded = curAddedNames.has(n.name);
            return `
            <label style="display:flex;align-items:center;justify-content:space-between;padding:8px;border-bottom:0.5px solid #eee;cursor:pointer;">
                <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
                    <img src="${n.avatar || 'assets/icons/chat.png'}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;flex-shrink:0;">
                    <div style="min-width:0;flex:1;">
                        <div style="font-size:13px;font-weight:600;color:#181818;">${escapeHtml(n.name)}</div>
                        <div style="font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(n.persona || '日常互动圈友')}</div>
                    </div>
                </div>
                <input type="checkbox" class="wclean-mnpc-pick" value="${idx}" ${isAdded ? 'checked disabled' : ''} style="width:17px;height:17px;accent-color:#07c160;">
            </label>
            `;
        }).join('');

        window.openWechatCleanModal('添加朋友圈 NPC', `
            <div style="display:flex;flex-direction:column;gap:12px;text-align:left;">
                <div style="font-size:12.5px;color:#666;font-weight:500;">从朋友圈已有圈友池勾选：</div>
                <div style="max-height:160px;overflow-y:auto;background:#fafafa;border-radius:6px;padding:2px 6px;">
                    ${candidateListHtml || '<div style="text-align:center;color:#aaa;padding:12px 0;font-size:12px;">朋友圈暂无圈友</div>'}
                </div>

                <div style="border-top:0.5px solid #eee;padding-top:10px;">
                    <div style="font-size:12.5px;color:#181818;font-weight:600;margin-bottom:6px;">或者直接自行创作：</div>
                    <input type="text" id="wcleanNewMnpcName" placeholder="NPC 名字（如：矿坑幽灵、佛系老农）" class="wechat-clean-input" style="margin-bottom:6px;font-size:12px;">
                    <input type="text" id="wcleanNewMnpcPersona" placeholder="简短性格人设（如：爱抬杠的红石萌新，说话幽默）" class="wechat-clean-input" style="font-size:12px;">
                </div>
            </div>
        `, () => {
            const checkedIndexes = Array.from(document.querySelectorAll('.wclean-mnpc-pick:checked:not(:disabled)')).map(c => parseInt(c.value));
            let addedCount = 0;
            checkedIndexes.forEach(idx => {
                const target = pool[idx];
                if (target && !group.momentNpcs.some(m => m.name === target.name)) {
                    group.momentNpcs.push({
                        id: 'mnpc_' + Date.now() + '_' + Math.floor(Math.random() * 899 + 100),
                        name: target.name,
                        persona: target.persona,
                        avatar: target.avatar || 'assets/icons/chat.png'
                    });
                    addedCount++;
                }
            });

            const customName = document.getElementById('wcleanNewMnpcName')?.value.trim();
            const customPersona = document.getElementById('wcleanNewMnpcPersona')?.value.trim() || '活跃的MC圈友';
            if (customName && !group.momentNpcs.some(m => m.name === customName)) {
                const avatar = (typeof getRandomAvatar === 'function') ? getRandomAvatar() : 'assets/icons/chat.png';
                group.momentNpcs.push({
                    id: 'mnpc_' + Date.now() + '_' + Math.floor(Math.random() * 899 + 100),
                    name: customName,
                    persona: customPersona,
                    avatar
                });
                addedCount++;
            }

            if (addedCount > 0) {
                window.syncGroupChatsToLocalBackup();
                if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                if (typeof showToast === 'function') showToast(`已添加 ${addedCount} 位朋友圈 NPC`, 'success', 1000);
            }

            window.openGroupAdvancedSettingsModal(gid);
            setTimeout(() => {
                const body = document.getElementById('groupMomentNpcCollapseBody');
                const arrow = document.getElementById('iconMomentNpcArrow');
                if (body) body.style.display = 'block';
                if (arrow) arrow.style.transform = 'rotate(180deg)';
            }, 30);
        });
    };

    window.removeGroupMomentNpc = function(gid, idx) {
        const group = window.G.groups && window.G.groups[gid];
        if (!group || !group.momentNpcs) return;
        group.momentNpcs.splice(idx, 1);
        window.syncGroupChatsToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        window.openGroupAdvancedSettingsModal(gid);
        setTimeout(() => {
            const body = document.getElementById('groupMomentNpcCollapseBody');
            const arrow = document.getElementById('iconMomentNpcArrow');
            if (body) body.style.display = 'block';
            if (arrow) arrow.style.transform = 'rotate(180deg)';
        }, 30);
    };

    window.selectGroupApiMode = function(mode) {
        window._tempSelectedGroupApiMode = mode;
        const optUni = document.getElementById('apiModeOptUnified');
        const optInd = document.getElementById('apiModeOptIndividual');
        if (optUni && optInd) {
            if (mode === 'unified') {
                optUni.style.border = '1.5px solid #07c160';
                optUni.style.background = '#f0faf4';
                optInd.style.border = '0.5px solid #ddd';
                optInd.style.background = '#fff';
            } else {
                optInd.style.border = '1.5px solid #07c160';
                optInd.style.background = '#f0faf4';
                optUni.style.border = '0.5px solid #ddd';
                optUni.style.background = '#fff';
            }
        }
    };

    window.showGroupApiModeHelp = function() {
        if (typeof window.openWechatCleanModal === 'function') {
            window.openWechatCleanModal('API 调用说明', `
                <div style="font-size:13px;line-height:1.6;color:#333;text-align:left;padding:4px 0;">
                    <p style="margin:0 0 10px;"><b>• 统一调用</b>：单次 API 请求生成交错对话，角色与 NPC 自然穿插，响应迅速，最省 Token 额度。</p>
                    <p style="margin:0 0 10px;"><b>• 单独调用</b>：依据发言人数设定，独立调用大模型推进各角色思路，角色个性极强，但成倍消耗 API 额度。</p>
                </div>
            `, () => {});
        }
    };

    // 🎲 应用新群头像并同步刷新列表
    function applyNewGroupAvatar(gid, newAvatarUrl) {
        const group = window.G.groups && window.G.groups[gid];
        if (!group || !newAvatarUrl) return;

        group.avatar = newAvatarUrl;
        window.syncGroupChatsToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();

        // 1. 同步更新图一正在显示的头像
        const modalPreview = document.getElementById('modalGroupAvatarPreview');
        if (modalPreview) modalPreview.src = newAvatarUrl;

        // 2. 刷新聊天窗口
        if (window.G.currentChatGroup === gid && typeof window.renderGroupChatWindow === 'function') {
            window.renderGroupChatWindow();
        }

        // 3. 刷新微信会话主列表里的群头像
        if (typeof window.renderChatApp === 'function' && !window.G.currentChatGroup) {
            window.renderChatApp();
        }
    }

    // 🎲 编辑群头像
    window.openEditGroupAvatarModal = function(gid) {
        const group = window.G.groups && window.G.groups[gid];
        if (!group) return;
        document.querySelectorAll('.wechat-clean-modal-mask, .group-info-modal-mask').forEach(el => el.remove());

        const randomAvatars = [
            'assets/icons/chat.png',
            'assets/icons/theme.png',
            'assets/icons/tarot.png',
            'assets/icons/settings.png'
        ];

        window.openWechatCleanModal('更换群头像', `
            <div style="display:flex;flex-direction:column;gap:12px;text-align:left;">
                <button type="button" id="btnGroupRandomAvatar" style="border:1px dashed #07c160;background:#f0faf4;color:#07c160;padding:10px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                    <span>🎲 随机生成精选群头像</span>
                </button>

                <label style="border:1px solid #dcdcdc;background:#f9f9f9;padding:12px;border-radius:6px;font-size:13px;font-weight:500;color:#333;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
                    <span>从手机相册选择新头像</span>
                    <input type="file" id="groupAvatarFileInput" accept="image/*" style="display:none;">
                    <span style="color:#07c160;font-size:15px;">›</span>
                </label>

                <div style="font-size:12px;color:#666;">或输入网络图片链接：</div>
                <input type="text" id="wcleanGroupAvatarUrlInput" placeholder="https://..." value="${escapeHtml(group.avatar || '')}" class="wechat-clean-input">
            </div>
        `, () => {
            const urlVal = document.getElementById('wcleanGroupAvatarUrlInput')?.value.trim();
            if (urlVal) {
                applyNewGroupAvatar(gid, urlVal);
            }
            window.openGroupSettingsModal(gid);
        });

        setTimeout(() => {
            const btnRand = document.getElementById('btnGroupRandomAvatar');
            if (btnRand) {
                btnRand.onclick = () => {
                    let newAvatar = '';
                    if (typeof window.getRandomAvatar === 'function') {
                        newAvatar = window.getRandomAvatar();
                    } else {
                        newAvatar = randomAvatars[Math.floor(Math.random() * randomAvatars.length)];
                    }
                    applyNewGroupAvatar(gid, newAvatar);
                    if (typeof showToast === 'function') showToast('已随机更换群头像', 'success', 1000);
                    document.querySelector('.wechat-clean-modal-mask')?.remove();
                    window.openGroupSettingsModal(gid);
                };
            }

            const fileInput = document.getElementById('groupAvatarFileInput');
            if (fileInput) {
                fileInput.onchange = (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        applyNewGroupAvatar(gid, evt.target.result);
                        if (typeof showToast === 'function') showToast('群头像已更新', 'success', 1200);
                        window.openGroupSettingsModal(gid);
                    };
                    reader.readAsDataURL(file);
                };
            }
        }, 30);
    };

    // 编辑群介绍/公告
    window.openEditGroupDescModal = function(gid) {
        const group = window.G.groups && window.G.groups[gid];
        if (!group) return;
        document.querySelectorAll('.wechat-clean-modal-mask, .group-info-modal-mask').forEach(el => el.remove());

        window.openWechatCleanModal('修改群介绍/公告', `
            <textarea id="wcleanGroupDescInput" rows="4" class="wechat-clean-input" style="width:100%;resize:none;line-height:1.45;" placeholder="输入群介绍或群公告...">${escapeHtml(group.description || '')}</textarea>
        `, () => {
            const val = document.getElementById('wcleanGroupDescInput')?.value.trim();
            group.description = val || '';
            if (typeof window.syncGroupChatsToLocalBackup === 'function') window.syncGroupChatsToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            window.openGroupSettingsModal(gid);
        });
    };

    // 移除正式群角色
    window.openRemoveGroupMemberModal = function(gid) {
        const group = window.G.groups && window.G.groups[gid];
        if (!group) return;
        document.querySelectorAll('.wechat-clean-modal-mask, .group-info-modal-mask').forEach(el => el.remove());

        const currentMembers = (group.members || []).map(mid => window.G.npcs[mid]).filter(Boolean);
        if (currentMembers.length === 0) {
            if (typeof showToast === 'function') showToast('群内没有其他成员可移除', 'info');
            return;
        }

        let listHtml = currentMembers.map(npc => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid #f2f2f2;">
                <div style="display:flex;align-items:center;gap:10px;">
                    ${window.renderAvatarBadge(npc, 36)}
                    <span style="font-size:13.5px;font-weight:600;color:#181818;">${escapeHtml(npc.name)}</span>
                </div>
                <div>
                    <input type="checkbox" class="wechat-remove-member-checkbox" value="${npc.id}" style="width:18px;height:18px;accent-color:#fa5151;cursor:pointer;">
                </div>
            </div>
        `).join('');

        window.openWechatCleanModal('移除群成员', `
            <div style="max-height:280px;overflow-y:auto;padding-right:4px;">
                ${listHtml}
            </div>
        `, () => {
            const checkedBoxes = document.querySelectorAll('.wechat-remove-member-checkbox:checked');
            let removedCount = 0;
            checkedBoxes.forEach(box => {
                group.members = group.members.filter(id => id !== box.value);
                removedCount++;
            });

            if (removedCount > 0) {
                if (typeof window.syncGroupChatsToLocalBackup === 'function') window.syncGroupChatsToLocalBackup();
                if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                if (typeof showToast === 'function') showToast(`已移出 ${removedCount} 位成员`, 'info');
            }
            window.openGroupAdvancedSettingsModal(gid);
            if (window.G.currentChatGroup === gid && typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
        });
    };

    // 添加正式群角色
    window.openAddGroupMemberModal = function(gid) {
        const group = window.G.groups && window.G.groups[gid];
        if (!group) return;
        document.querySelectorAll('.wechat-clean-modal-mask, .group-info-modal-mask').forEach(el => el.remove());

        const currentMembers = new Set(group.members || []);
        const allNpcKeys = Object.keys(window.G.npcs || {});
        const availableNpcs = allNpcKeys.map(k => window.G.npcs[k]).filter(Boolean);

        if (availableNpcs.length === 0) {
            if (typeof showToast === 'function') showToast('当前通讯录没有其他可用角色', 'info');
            return;
        }

        let listHtml = availableNpcs.map(npc => {
            const isAlreadyIn = currentMembers.has(npc.id);
            return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid #f2f2f2;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        ${window.renderAvatarBadge(npc, 36)}
                        <div>
                            <div style="font-size:13.5px;font-weight:600;color:#181818;">${escapeHtml(npc.name)}</div>
                            <div style="font-size:11px;color:#888;">${escapeHtml(npc.persona?.slice(0, 16) || 'MC同伴')}...</div>
                        </div>
                    </div>
                    <div>
                        <input type="checkbox" class="wechat-group-member-checkbox" value="${npc.id}" ${isAlreadyIn ? 'checked disabled' : ''} style="width:18px;height:18px;accent-color:#07c160;cursor:pointer;">
                    </div>
                </div>
            `;
        }).join('');

        window.openWechatCleanModal('添加群成员', `
            <div style="max-height:280px;overflow-y:auto;padding-right:4px;">
                ${listHtml}
            </div>
        `, () => {
            const checkedBoxes = document.querySelectorAll('.wechat-group-member-checkbox:checked:not(:disabled)');
            let addedCount = 0;
            checkedBoxes.forEach(box => {
                if (!group.members.includes(box.value)) {
                    group.members.push(box.value);
                    addedCount++;
                }
            });

            if (addedCount > 0) {
                if (typeof window.syncGroupChatsToLocalBackup === 'function') window.syncGroupChatsToLocalBackup();
                if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                if (typeof showToast === 'function') showToast(`已成功添加 ${addedCount} 位新成员`, 'success');
            }
            window.openGroupAdvancedSettingsModal(gid);
            if (window.G.currentChatGroup === gid && typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
        });
    };

    window.ChatGroupSettings = {
        getGroupConfig,
        saveGroupConfig
    };

    console.log('✅ ChatGroupSettings 微信群聊资料中心与高级设定模块已成功装载');
})();
