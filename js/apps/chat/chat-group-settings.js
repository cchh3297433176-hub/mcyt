/**
 * js/apps/chat/chat-group-settings.js
 * ⚙️ 微信群聊资料中心与高级设置独立模块
 * 规范功能：
 * 1. 微信原生白灰微绿设计质感，消除所有复古土味 UI 与原生 select。
 * 2. 顶栏右侧三个点（···）呼出群资料，集成微绿细线矢量齿轮【群高级设置】。
 * 3. 群成员自由从朋友圈/自建 NPC 全局池中增删勾选，生态完全通用。
 * 4. 群高级设置：
 *    - API 调用模式切换（统一调用 vs 单独调用），配微绿轻量科普问号 ? 弹窗。
 *    - 角色连发多条消息开关。
 *    - 群聊记忆是否同步至私聊忆海隔离开关。
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
            apiMode: 'unified', // 'unified' (统一调用) | 'individual' (单独调用)
            allowMultiMsgs: true,
            syncToRememori: false
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
     * 👥 打开群聊信息与资料面板
     */
    window.openGroupSettingsModal = function(gid) {
        const group = window.G.groups && window.G.groups[gid];
        if (!group) return;

        const members = (group.members || []).map(mid => window.G.npcs[mid]).filter(Boolean);

        let membersGrid = members.map(m => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:52px;position:relative;">
                ${window.renderAvatarBadge(m, 44)}
                <span style="font-size:11px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;text-align:center;">${escapeHtml(m.name)}</span>
            </div>
        `).join('');

        // 添加成员按钮 (+)
        const addMemberBtn = `
            <div onclick="window.openAddGroupMemberModal('${gid}')" style="display:flex;flex-direction:column;align-items:center;gap:4px;width:52px;cursor:pointer;">
                <div style="width:44px;height:44px;border-radius:6px;border:1px dashed #bbb;background:#fafafa;display:flex;align-items:center;justify-content:center;color:#888;">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <span style="font-size:11px;color:#888;text-align:center;">添加</span>
            </div>
        `;

        window.openWechatCleanModal('聊天信息', `
            <div style="display:flex;flex-direction:column;gap:14px;text-align:left;">
                <!-- 群成员网格 -->
                <div style="padding-bottom:12px;border-bottom:0.5px solid #eeeeee;">
                    <div style="font-size:12px;color:#888;margin-bottom:10px;">群成员 (${members.length + 1}人)</div>
                    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start;">
                        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:52px;">
                            ${window.renderAvatarBadge({ isPlayer: true }, 44)}
                            <span style="font-size:11px;color:#666;text-align:center;">我</span>
                        </div>
                        ${membersGrid}
                        ${addMemberBtn}
                    </div>
                </div>

                <!-- 群名称 -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid #eeeeee;">
                    <span style="font-size:13.5px;color:#333;">群聊名称</span>
                    <span onclick="window.openEditGroupNameModal('${gid}')" style="font-size:13.5px;font-weight:500;color:#181818;cursor:pointer;display:flex;align-items:center;gap:4px;">
                        <span>${escapeHtml(group.name)}</span>
                        <svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:none;stroke:#07c160;stroke-width:2;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </span>
                </div>

                <!-- 🌟 群高级设置入口（原生矢量细线微绿齿轮，杜绝 Emoji） -->
                <div onclick="window.openGroupAdvancedSettingsModal('${gid}')" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:0.5px solid #eeeeee;cursor:pointer;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <svg viewBox="0 0 24 24" style="width:17px;height:17px;fill:none;stroke:#07c160;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                        <span style="font-size:13.5px;color:#181818;font-weight:500;">群聊高级设定</span>
                    </div>
                    <span style="color:#aaa;font-size:13px;">›</span>
                </div>

                <!-- 解散群聊 -->
                <div style="margin-top:6px;">
                    <button type="button" onclick="window.dismissGroup('${gid}')" style="width:100%;border:none;background:#fff1f0;color:#fa5151;padding:9px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">
                        解散并删除群聊
                    </button>
                </div>
            </div>
        `, () => {});
    };

    /**
     * ⚙️ 群聊高级设置浮层
     */
    window.openGroupAdvancedSettingsModal = function(gid) {
        document.querySelector('.wechat-clean-modal-mask')?.remove();
        const cfg = getGroupConfig(gid);

        window.openWechatCleanModal('群聊高级设定', `
            <div style="display:flex;flex-direction:column;gap:16px;text-align:left;">
                <!-- API 调用模式 -->
                <div>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                        <div style="display:flex;align-items:center;gap:5px;">
                            <span style="font-size:13.5px;font-weight:600;color:#181818;">API 调用机制</span>
                            <span onclick="window.showGroupApiModeHelp()" style="display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;background:#07c160;color:#ffffff;font-size:10px;font-weight:bold;cursor:pointer;" title="说明">?</span>
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <div id="apiModeOptUnified" onclick="window.selectGroupApiMode('unified')" style="border:${cfg.apiMode === 'unified' ? '1.5px solid #07c160' : '0.5px solid #ddd'};background:${cfg.apiMode === 'unified' ? '#f0faf4' : '#fff'};border-radius:6px;padding:10px 8px;cursor:pointer;text-align:center;">
                            <div style="font-size:12.5px;font-weight:600;color:#181818;">统一调用</div>
                            <div style="font-size:10.5px;color:#888;margin-top:3px;">单次生成全员·极省Token</div>
                        </div>
                        <div id="apiModeOptIndividual" onclick="window.selectGroupApiMode('individual')" style="border:${cfg.apiMode === 'individual' ? '1.5px solid #07c160' : '0.5px solid #ddd'};background:${cfg.apiMode === 'individual' ? '#f0faf4' : '#fff'};border-radius:6px;padding:10px 8px;cursor:pointer;text-align:center;">
                            <div style="font-size:12.5px;font-weight:600;color:#181818;">单独调用</div>
                            <div style="font-size:10.5px;color:#888;margin-top:3px;">多角色独立思考·细节更生动</div>
                        </div>
                    </div>
                </div>

                <!-- 角色连发多条消息 -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding-top:4px;border-top:0.5px solid #f0f0f0;">
                    <div>
                        <div style="font-size:13px;font-weight:500;color:#181818;">允许角色连续发言</div>
                        <div style="font-size:11px;color:#888;">情绪激动或吐槽时可连续发 2 条短消息</div>
                    </div>
                    <label style="position:relative;display:inline-block;width:38px;height:22px;">
                        <input type="checkbox" id="chkGroupMultiMsgs" ${cfg.allowMultiMsgs ? 'checked' : ''} style="opacity:0;width:0;height:0;">
                        <span style="position:absolute;cursor:pointer;inset:0;background:${cfg.allowMultiMsgs ? '#07c160' : '#ccc'};border-radius:22px;transition:.3s;">
                            <span style="position:absolute;height:18px;width:18px;left:${cfg.allowMultiMsgs ? '18px' : '2px'};bottom:2px;background:white;border-radius:50%;transition:.3s;"></span>
                        </span>
                    </label>
                </div>

                <!-- 群聊记忆隔离 -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:0.5px solid #f0f0f0;">
                    <div>
                        <div style="font-size:13px;font-weight:500;color:#181818;">群聊记忆同步至私聊忆海</div>
                        <div style="font-size:11px;color:#888;">关闭时水群内容不污染角色独立私聊档案</div>
                    </div>
                    <label style="position:relative;display:inline-block;width:38px;height:22px;">
                        <input type="checkbox" id="chkGroupSyncRememori" ${cfg.syncToRememori ? 'checked' : ''} style="opacity:0;width:0;height:0;">
                        <span style="position:absolute;cursor:pointer;inset:0;background:${cfg.syncToRememori ? '#07c160' : '#ccc'};border-radius:22px;transition:.3s;">
                            <span style="position:absolute;height:18px;width:18px;left:${cfg.syncToRememori ? '18px' : '2px'};bottom:2px;background:white;border-radius:50%;transition:.3s;"></span>
                        </span>
                    </label>
                </div>

                <div style="font-size:11px;color:#999;background:#f9f9f9;padding:8px 10px;border-radius:5px;line-height:1.45;">
                    💡 提示：修改设定后即刻生效，并自动安全保存至本地存储。
                </div>
            </div>
        `, () => {
            const chkMulti = document.getElementById('chkGroupMultiMsgs')?.checked ?? true;
            const chkSync = document.getElementById('chkGroupSyncRememori')?.checked ?? false;
            const currentSelectedMode = window._tempSelectedGroupApiMode || cfg.apiMode;

            saveGroupConfig(gid, {
                apiMode: currentSelectedMode,
                allowMultiMsgs: chkMulti,
                syncToRememori: chkSync
            });

            if (typeof showToast === 'function') showToast('群高级设置已保存', 'success', 1200);
            window.openGroupSettingsModal(gid);
        });

        window._tempSelectedGroupApiMode = cfg.apiMode;

        // 监听 Switch 点击动画
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
        setupSwitchToggle('chkGroupSyncRememori');
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
                    <p style="margin:0 0 10px;"><b>• 统一调用</b>：单次 API 请求一口气生成所有出场角色的回复。响应迅速，最节省 API 消耗额度。</p>
                    <p style="margin:0 0 10px;"><b>• 单独调用</b>：每个角色都会被单独调用一次 API 进行独立思考与回复，再统一整合进聊天流。<b>各角色的情绪与人设更具张力，但会成倍消耗 API 额度</b>，请根据预算酌情使用。</p>
                </div>
            `, () => {});
        }
    };

    /**
     * 👥 从朋友圈/全站 NPC 池中自由勾选添加新群成员
     */
    window.openAddGroupMemberModal = function(gid) {
        const group = window.G.groups && window.G.groups[gid];
        if (!group) return;
        document.querySelector('.wechat-clean-modal-mask')?.remove();

        const currentMembers = new Set(group.members || []);
        const allNpcKeys = Object.keys(window.G.npcs || {});
        const availableNpcs = allNpcKeys.map(k => window.G.npcs[k]).filter(Boolean);

        if (availableNpcs.length === 0) {
            if (typeof showToast === 'function') showToast('当前通讯录没有其他可用NPC', 'info');
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
                            <div style="font-size:11px;color:#888;">${escapeHtml(npc.persona?.slice(0, 16) || 'MC群友')}...</div>
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
            window.openGroupSettingsModal(gid);
            if (window.G.currentChatGroup === gid) window.renderGroupChatWindow();
        });
    };

    window.ChatGroupSettings = {
        getGroupConfig,
        saveGroupConfig
    };

    console.log('✅ ChatGroupSettings 微信群聊资料中心与高级设定模块已成功装载');
})();
