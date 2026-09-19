/**
 * js/apps/chat/chat-app-panels.js
 * 💬 微信主应用 · 拆分分片 6/7：表情抽屉（buildChatStickerDrawerHTML 及分类/添加/备注/新建分类）、
 *    加号功能面板 8 大格子（buildChatPlusDrawerHTML）、记忆设置弹窗、联网设置弹窗、聊天折叠设置弹窗、
 *    推荐名片选择弹窗、发送名片、最近 Token 统计弹窗。
 * ⚠️ 拆分自 chat-app.js，包含加号面板入口与角色专属联网搜索配置弹窗。
 */

(function() {
    'use strict';

    // 🧠 角色独立记忆总结配置存取（与契约表 mcyt_npc_memory_configs 严格对齐）
    function getNpcMemoryConfig(id) {
        try {
            const raw = localStorage.getItem('mcyt_npc_memory_configs');
            if (raw) {
                const map = JSON.parse(raw);
                if (map && map[id]) return map[id];
            }
        } catch (_) {}
        return {
            enabled: true,
            keepRecent: 8,
            triggerCount: 20
        };
    }
    window.getNpcMemoryConfig = getNpcMemoryConfig;

    function saveNpcMemoryConfig(id, cfg) {
        try {
            let map = {};
            const raw = localStorage.getItem('mcyt_npc_memory_configs');
            if (raw) map = JSON.parse(raw) || {};
            map[id] = { ...getNpcMemoryConfig(id), ...cfg };
            localStorage.setItem('mcyt_npc_memory_configs', JSON.stringify(map));
            
            // 同步挂载到全局运行态，防止内存与持久层不一致
            if (!window.G) window.G = {};
            if (!window.G.npcMemoryConfigs) window.G.npcMemoryConfigs = {};
            window.G.npcMemoryConfigs[id] = map[id];
        } catch (_) {}
    }
    window.saveNpcMemoryConfig = saveNpcMemoryConfig;

    // 🌐 角色独立联网搜索配置存取
    function getNpcSearchConfig(id) {
        try {
            const raw = localStorage.getItem('mcyt_npc_search_configs');
            if (raw) {
                const map = JSON.parse(raw);
                if (map && map[id]) return map[id];
            }
        } catch (_) {}
        return {
            enabled: false,
            maxResults: 3,
            sendWebPage: true,
            forcedKeywords: '搜索, 查一下, 查查, 搜一下, 帮我找'
        };
    }
    window.getNpcSearchConfig = getNpcSearchConfig;

    function saveNpcSearchConfig(id, cfg) {
        try {
            let map = {};
            const raw = localStorage.getItem('mcyt_npc_search_configs');
            if (raw) map = JSON.parse(raw) || {};
            map[id] = { ...getNpcSearchConfig(id), ...cfg };
            localStorage.setItem('mcyt_npc_search_configs', JSON.stringify(map));
        } catch (_) {}
    }
    window.saveNpcSearchConfig = saveNpcSearchConfig;

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

    // 完整的 8 大功能加号抽屉面板（新增“联网设置”）
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
                <div class="wechat-plus-item" onclick="window._plusDrawerOpen=false; window.openNpcMemorySettingsModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#10b981;stroke-width:1.8;stroke-linecap:round;"><path d="M12 2a9 9 0 0 0-9 9c0 3.6 2.1 6.7 5.2 8.1l.8 2.9 3-1.5c0 .3.5.5.8.5a9 9 0 0 0 9-9 9 9 0 0 0-9-9z"/><path d="M9.5 9h5"/><path d="M9.5 13h5"/></svg>
                    </div>
                    <span class="wechat-plus-label">记忆设置</span>
                </div>
                <div class="wechat-plus-item" onclick="window._plusDrawerOpen=false; window.openNpcSearchSettingsModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#059669;stroke-width:1.8;stroke-linecap:round;"><circle cx="12" cy="12" r="9"></circle><path d="M3.6 9h16.8M3.6 15h16.8"></path><path d="M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18"></path></svg>
                    </div>
                    <span class="wechat-plus-label">联网设置</span>
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

    // 🌐 角色独立联网设置弹窗（带微绿问号科普说明）
    window.openNpcSearchSettingsModal = function(type, id) {
        if (type !== 'single') {
            if (typeof showToast === 'function') showToast('联网设置目前支持专属好友单人私聊', 'info', 1500);
            return;
        }

        const cfg = getNpcSearchConfig(id);
        const npc = window.G.npcs ? window.G.npcs[id] : null;
        const npcDisplayName = npc ? (npc.remark || npc.name) : '当前好友';

        const modalBody = `
            <div style="text-align:left;font-size:13px;color:#333;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:0.5px solid #f0f0f0;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-weight:600;color:#181818;">开启角色联网搜索</span>
                        <button type="button" onclick="window.showSearchIntroTooltip()" style="border:none;background:#e8f7ed;color:#07c160;width:18px;height:18px;border-radius:50%;font-size:11px;font-weight:bold;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;">?</button>
                    </div>
                    <input type="checkbox" id="wcleanSearchToggle" ${cfg.enabled ? 'checked' : ''} style="width:18px;height:18px;accent-color:#07c160;cursor:pointer;">
                </div>

                <div style="display:flex;flex-direction:column;gap:12px;">
                    <div>
                        <label style="font-size:12px;color:#666;font-weight:600;display:block;margin-bottom:4px;">联网检索条目上限：</label>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <input type="number" id="wcleanSearchMaxResults" value="${cfg.maxResults || 3}" min="1" max="5" step="1" class="wechat-clean-input" style="width:90px;">
                            <span style="font-size:11.5px;color:#888;">条（推荐 2~3 条，兼顾精准度与速度）</span>
                        </div>
                    </div>

                    <div style="display:flex;align-items:center;justify-content:space-between;padding:2px 0;">
                        <div>
                            <span style="font-size:12px;color:#666;font-weight:600;">发送搜索到的网页卡片</span>
                            <div style="font-size:11px;color:#888;margin-top:1px;">查到结果后将权威网页链接卡片同步发到聊天中</div>
                        </div>
                        <input type="checkbox" id="wcleanSearchSendPage" ${cfg.sendWebPage ? 'checked' : ''} style="width:17px;height:17px;accent-color:#07c160;cursor:pointer;">
                    </div>

                    <div>
                        <label style="font-size:12px;color:#666;font-weight:600;display:block;margin-bottom:4px;">自定义强制搜索关键词：</label>
                        <input type="text" id="wcleanSearchKeywords" value="${escapeHtml(cfg.forcedKeywords || '')}" placeholder="逗号或空格隔开，如：搜索, 查一下, 帮我找" class="wechat-clean-input" style="width:100%;">
                        <div style="font-size:11px;color:#888;margin-top:4px;">包含此类词必触发检索；未命中时由 AI 依据内容自主判断。</div>
                    </div>

                    <div style="font-size:11px;color:#999;background:#f9f9f9;padding:6px 10px;border-radius:4px;line-line:1.45;">
                        目标角色：<b>${escapeHtml(npcDisplayName)}</b><br>
                        规则：借助系统设置中心配置的联网通道实时检索，保持拟真生动的答复与资料参考。
                    </div>
                </div>
            </div>
        `;

        window.openWechatCleanModal('联网设置', modalBody, () => {
            const enabled = document.getElementById('wcleanSearchToggle')?.checked ?? false;
            let maxResults = parseInt(document.getElementById('wcleanSearchMaxResults')?.value) || 3;
            const sendWebPage = document.getElementById('wcleanSearchSendPage')?.checked ?? true;
            const forcedKeywords = document.getElementById('wcleanSearchKeywords')?.value.trim() || '搜索, 查一下, 查查, 搜一下, 帮我找';

            if (maxResults < 1) maxResults = 1;
            if (maxResults > 5) maxResults = 5;

            saveNpcSearchConfig(id, { enabled, maxResults, sendWebPage, forcedKeywords });
            if (typeof showToast === 'function') showToast('联网设置已更新', 'success', 1200);
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        });
    };

    // 💡 联网机制说明弹窗（严格控制在 150 字以内并包含降速提示）
    window.showSearchIntroTooltip = function() {
        const text = "开启后角色具备实时联网能力。当聊到实时资讯、生活百科、知识盲区或触发自定义关键词时，AI将自动调用底层引擎检索全网事实，并在需要时推送网页卡片。提示：因需执行多路实时网络抓取、解析与内容清洗，开启后角色回复速度会略有下降。";
        if (typeof window.openWechatCleanModal === 'function') {
            window.openWechatCleanModal('联网搜索机制', `
                <div style="text-align:left;padding:8px 4px;font-size:13px;color:#333;line-height:1.6;">
                    ${escapeHtml(text)}
                </div>
            `, () => {});
        } else if (typeof showToast === 'function') {
            showToast(text, 'info', 4000);
        }
    };

    // 🧠 角色独立记忆总结设置弹窗（带微绿问号科普）
    window.openNpcMemorySettingsModal = function(type, id) {
        if (type !== 'single') {
            if (typeof showToast === 'function') showToast('记忆设置目前支持专属好友单人私聊', 'info', 1500);
            return;
        }

        const cfg = getNpcMemoryConfig(id);
        const npc = window.G.npcs ? window.G.npcs[id] : null;
        const npcDisplayName = npc ? (npc.remark || npc.name) : '当前好友';

        const modalBody = `
            <div style="text-align:left;font-size:13px;color:#333;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:0.5px solid #f0f0f0;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-weight:600;color:#181818;">长效记忆自动凝练</span>
                        <button type="button" onclick="window.showMemoryIntroTooltip()" style="border:none;background:#e8f7ed;color:#07c160;width:18px;height:18px;border-radius:50%;font-size:11px;font-weight:bold;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;">?</button>
                    </div>
                    <input type="checkbox" id="wcleanMemToggle" ${cfg.enabled ? 'checked' : ''} style="width:18px;height:18px;accent-color:#07c160;cursor:pointer;">
                </div>

                <div style="display:flex;flex-direction:column;gap:12px;">
                    <div>
                        <label style="font-size:12px;color:#666;font-weight:600;display:block;margin-bottom:4px;">保留最新对话条数：</label>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <input type="number" id="wcleanMemKeepRecent" value="${cfg.keepRecent || 8}" min="4" max="30" step="1" class="wechat-clean-input" style="width:90px;">
                            <span style="font-size:11.5px;color:#888;">条（供 AI 读最新上下文，推荐 8~12 条）</span>
                        </div>
                    </div>

                    <div>
                        <label style="font-size:12px;color:#666;font-weight:600;display:block;margin-bottom:4px;">触发总结阈值：</label>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <input type="number" id="wcleanMemTriggerCount" value="${cfg.triggerCount || 20}" min="10" max="60" step="2" class="wechat-clean-input" style="width:90px;">
                            <span style="font-size:11.5px;color:#888;">条（满额自动提炼早期消息为客观事实）</span>
                        </div>
                    </div>

                    <div style="font-size:11px;color:#999;background:#f9f9f9;padding:6px 10px;border-radius:4px;line-height:1.45;">
                        目标角色：<b>${escapeHtml(npcDisplayName)}</b><br>
                        规则：将早期消息静默交由忆海提炼为第三人称具名事实，留足最新对话供 AI 保持连贯。
                    </div>
                </div>
            </div>
        `;

        window.openWechatCleanModal('记忆设置', modalBody, () => {
            const enabled = document.getElementById('wcleanMemToggle')?.checked ?? false;
            let keepRecent = parseInt(document.getElementById('wcleanMemKeepRecent')?.value) || 8;
            let triggerCount = parseInt(document.getElementById('wcleanMemTriggerCount')?.value) || 20;

            if (keepRecent < 4) keepRecent = 4;
            if (triggerCount <= keepRecent) triggerCount = keepRecent + 6;

            saveNpcMemoryConfig(id, { enabled, keepRecent, triggerCount });
            if (typeof showToast === 'function') showToast('记忆设置已更新', 'success', 1200);
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        });
    };

    // 💡 记忆科普提示（严格控制在 50 字以内）
    window.showMemoryIntroTooltip = function() {
        const text = "满额自动将早期对白凝练为第三人称客观事实，留足最新上下文，兼顾长期记忆与对话连贯。";
        if (typeof window.openWechatCleanModal === 'function') {
            window.openWechatCleanModal('记忆总结机制', `
                <div style="text-align:center;padding:12px 6px;font-size:13.5px;color:#333;line-height:1.6;">
                    ${escapeHtml(text)}
                </div>
            `, () => {});
        } else if (typeof showToast === 'function') {
            showToast(text, 'info', 3000);
        }
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
            if (typeof depositRememoriEvidence === 'function') {
                depositRememoriEvidence(targetId, curAcc.id, `${curAcc.name}[推荐了名片: ${name}]`);
            }
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
        const list = (typeof window.getTokenHistoryList === 'function') ? window.getTokenHistoryList() : [];
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

})();
