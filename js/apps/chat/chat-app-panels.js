/**
 * js/apps/chat/chat-app-panels.js
 * 💬 微信主应用 · 拆分分片 6/7：表情抽屉、设置抽屉（7大系统配置面板）、
 *    加号互动抽屉（单聊与群聊各自独立的聊天互动槽位，已接入发送图片/文字画片/音视频通话）、记忆/联网/排版/折叠/名片/Token等弹窗。
 * 🌟 升级特性：
 * 1. ⚙️ 设置抽屉（buildChatSettingsDrawerHTML）：聚焦纯系统排版（推荐名片、记忆设置、联网设置、拟真排版、聊天折叠、Token统计、共创视频）。
 * 2. ➕ 加号抽屉（buildChatPlusDrawerHTML）：
 *    - 群聊专享【发送图片、群转账、群收款、群待办、群接龙、群投票、群打卡】；
 *    - 单聊专享【发送图片、语音通话、视频通话、红包、转账、戳一戳、亲密度、情侣空间、特别关心】。
 * 3. 📷 发送图片统一弹窗（openChatSendImageModal）：
 *    - 支持本地图片导入、网络图片导入、文字画片（假图片，输入画面描述）发送；
 *    - 🌟 真实图片下方提供【是否使用识图API】选项（单选框/开关，默认开启），发送真实图片后若开启，自动后台调用识图接口生成画面分析！
 */

(function() {
    'use strict';

    // 抽屉展开状态全局管理
    window._settingsDrawerOpen = false;
    window._plusDrawerOpen = false;
    window._stickerDrawerOpen = false;
    window._stickerManageMode = false;

    // 🧠 角色独立记忆总结配置存取
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

    // 🧾 角色独立【拟真排版卡片】配置存取
    function getNpcUiCardConfig(id) {
        try {
            const raw = localStorage.getItem('mcyt_npc_uicard_configs');
            if (raw) {
                const map = JSON.parse(raw);
                if (map && map[id]) return map[id];
            }
        } catch (_) {}
        return {
            enabled: false,
            customPrompt: '在分享生活物件、购物结账、备忘清单、行程或收到电影票/小票时，生成美观仿真的生活卡片'
        };
    }
    window.getNpcUiCardConfig = getNpcUiCardConfig;

    function saveNpcUiCardConfig(id, cfg) {
        try {
            let map = {};
            const raw = localStorage.getItem('mcyt_npc_uicard_configs');
            if (raw) map = JSON.parse(raw) || {};
            map[id] = { ...getNpcUiCardConfig(id), ...cfg };
            localStorage.setItem('mcyt_npc_uicard_configs', JSON.stringify(map));
        } catch (_) {}
    }
    window.saveNpcUiCardConfig = saveNpcUiCardConfig;

    // ==========================================
    // ⚙️ 设置抽屉（纯系统/排版/配置模块，移除发送图片）
    // ==========================================
    function buildChatSettingsDrawerHTML(type, id) {
        return `
        <div id="chatSettingsDrawer" style="background:#f7f7f7;border-top:0.5px solid #dcdcdc;flex-shrink:0;animation:wechatSlideUp 0.18s ease-out;">
            <div class="wechat-plus-grid">
                <div class="wechat-plus-item" onclick="window.openRecommendContactModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#0284c7;stroke-width:1.8;stroke-linecap:round;"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                    </div>
                    <span class="wechat-plus-label">推荐名片</span>
                </div>
                <div class="wechat-plus-item" onclick="window._settingsDrawerOpen=false; window.openNpcMemorySettingsModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#10b981;stroke-width:1.8;stroke-linecap:round;"><path d="M12 2a9 9 0 0 0-9 9c0 3.6 2.1 6.7 5.2 8.1l.8 2.9 3-1.5c0 .3.5.5.8.5a9 9 0 0 0 9-9 9 9 0 0 0-9-9z"/><path d="M9.5 9h5"/><path d="M9.5 13h5"/></svg>
                    </div>
                    <span class="wechat-plus-label">记忆设置</span>
                </div>
                <div class="wechat-plus-item" onclick="window._settingsDrawerOpen=false; window.openNpcSearchSettingsModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#059669;stroke-width:1.8;stroke-linecap:round;"><circle cx="12" cy="12" r="9"></circle><path d="M3.6 9h16.8M3.6 15h16.8"></path><path d="M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18"></path></svg>
                    </div>
                    <span class="wechat-plus-label">联网设置</span>
                </div>
                <div class="wechat-plus-item" onclick="window._settingsDrawerOpen=false; window.openNpcUiCardSettingsModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#e11d48;stroke-width:1.8;stroke-linecap:round;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <span class="wechat-plus-label">拟真排版</span>
                </div>
                <div class="wechat-plus-item" onclick="window._settingsDrawerOpen=false; window.openChatCollapseSettingsModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#d97706;stroke-width:1.8;stroke-linecap:round;"><rect x="4" y="4" width="16" height="16" rx="2"></rect><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    </div>
                    <span class="wechat-plus-label">聊天折叠</span>
                </div>
                <div class="wechat-plus-item" onclick="window._settingsDrawerOpen=false; window.openTokenMonitorModal()">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#8b5cf6;stroke-width:1.8;stroke-linecap:round;"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 3"></path></svg>
                    </div>
                    <span class="wechat-plus-label">Token 统计</span>
                </div>
                <div class="wechat-plus-item" onclick="window._settingsDrawerOpen=false; window.openCollabVideoPublishModal('${type}','${id}')">
                    <div class="wechat-plus-icon-box">
                        <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#ff5252;stroke-width:1.8;stroke-linecap:round;"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2"></rect></svg>
                    </div>
                    <span class="wechat-plus-label">共创视频</span>
                </div>
            </div>
        </div>`;
    }
    window.buildChatSettingsDrawerHTML = buildChatSettingsDrawerHTML;

    window.toggleChatSettingsDrawer = function(type, id) {
        window._settingsDrawerOpen = !window._settingsDrawerOpen;
        window._plusDrawerOpen = false;
        window._stickerDrawerOpen = false;
        window._stickerManageMode = false;
        if (type === 'single' && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
        else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
    };

    // ==========================================
    // ➕ 加号抽屉（已加入语音通话与视频通话按键）
    // ==========================================
    function buildChatPlusDrawerHTML(type, id) {
        if (type === 'group') {
            // 群聊专属互动槽位
            return `
            <div id="chatPlusDrawer" style="background:#f7f7f7;border-top:0.5px solid #dcdcdc;flex-shrink:0;animation:wechatSlideUp 0.18s ease-out;">
                <div class="wechat-plus-grid">
                    <div class="wechat-plus-item" onclick="window.openChatSendImageModal('${type}','${id}')">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#07c160;stroke-width:1.8;stroke-linecap:round;"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        </div>
                        <span class="wechat-plus-label">发送图片</span>
                    </div>
                    <div class="wechat-plus-item" onclick="window.triggerChatFeaturePlaceholder('群转账')">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#f59e0b;stroke-width:1.8;stroke-linecap:round;"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
                        </div>
                        <span class="wechat-plus-label">群转账</span>
                    </div>
                    <div class="wechat-plus-item" onclick="window.triggerChatFeaturePlaceholder('群收款')">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#10b981;stroke-width:1.8;stroke-linecap:round;"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M9 12l2 2 4-4"></path></svg>
                        </div>
                        <span class="wechat-plus-label">群收款</span>
                    </div>
                    <div class="wechat-plus-item" onclick="window.triggerChatFeaturePlaceholder('群待办')">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#3b82f6;stroke-width:1.8;stroke-linecap:round;"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                        </div>
                        <span class="wechat-plus-label">群待办</span>
                    </div>
                    <div class="wechat-plus-item" onclick="window.triggerChatFeaturePlaceholder('群接龙')">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#ec4899;stroke-width:1.8;stroke-linecap:round;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1"></rect><path d="M9 12h6M9 16h6"></path></svg>
                        </div>
                        <span class="wechat-plus-label">群接龙</span>
                    </div>
                    <div class="wechat-plus-item" onclick="window.triggerChatFeaturePlaceholder('群投票')">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#8b5cf6;stroke-width:1.8;stroke-linecap:round;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                        </div>
                        <span class="wechat-plus-label">群投票</span>
                    </div>
                    <div class="wechat-plus-item" onclick="window.triggerChatFeaturePlaceholder('群打卡')">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#06b6d4;stroke-width:1.8;stroke-linecap:round;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        </div>
                        <span class="wechat-plus-label">群打卡</span>
                    </div>
                </div>
            </div>`;
        } else {
            // 单人私聊专属互动槽位（接入语音通话与视频通话）
            return `
            <div id="chatPlusDrawer" style="background:#f7f7f7;border-top:0.5px solid #dcdcdc;flex-shrink:0;animation:wechatSlideUp 0.18s ease-out;">
                <div class="wechat-plus-grid">
                    <div class="wechat-plus-item" onclick="window.openChatSendImageModal('${type}','${id}')">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#07c160;stroke-width:1.8;stroke-linecap:round;"><rect x="3" y="3" width="18" height="18" rx="3"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        </div>
                        <span class="wechat-plus-label">发送图片</span>
                    </div>

                    <!-- 📞 语音通话 -->
                    <div class="wechat-plus-item" onclick="window._plusDrawerOpen=false; if(window.startWechatCall) window.startWechatCall('${id}', 'voice');">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#07c160;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                        </div>
                        <span class="wechat-plus-label">语音通话</span>
                    </div>

                    <!-- 📹 视频通话 -->
                    <div class="wechat-plus-item" onclick="window._plusDrawerOpen=false; if(window.startWechatCall) window.startWechatCall('${id}', 'video');">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#0284c7;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;">
                                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                            </svg>
                        </div>
                        <span class="wechat-plus-label">视频通话</span>
                    </div>

                    <div class="wechat-plus-item" onclick="window.triggerChatFeaturePlaceholder('红包')">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#fa5151;stroke-width:1.8;stroke-linecap:round;"><rect x="4" y="2" width="16" height="20" rx="3"></rect><circle cx="12" cy="11" r="2.5"></circle><path d="M4 7c4 2 12 2 16 0"></path></svg>
                        </div>
                        <span class="wechat-plus-label">红包</span>
                    </div>
                    <div class="wechat-plus-item" onclick="window.triggerChatFeaturePlaceholder('转账')">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#f59e0b;stroke-width:1.8;stroke-linecap:round;"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
                        </div>
                        <span class="wechat-plus-label">转账</span>
                    </div>
                    <div class="wechat-plus-item" onclick="window.triggerChatFeaturePlaceholder('戳一戳')">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#07c160;stroke-width:1.8;stroke-linecap:round;"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                        </div>
                        <span class="wechat-plus-label">戳一戳</span>
                    </div>
                    <div class="wechat-plus-item" onclick="window.triggerChatFeaturePlaceholder('亲密度')">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#ec4899;stroke-width:1.8;stroke-linecap:round;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        </div>
                        <span class="wechat-plus-label">亲密度</span>
                    </div>
                    <div class="wechat-plus-item" onclick="window.triggerChatFeaturePlaceholder('特别关心')">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#eab308;stroke-width:1.8;stroke-linecap:round;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        </div>
                        <span class="wechat-plus-label">特别关心</span>
                    </div>
                    <div class="wechat-plus-item" onclick="window.triggerChatFeaturePlaceholder('情侣空间')">
                        <div class="wechat-plus-icon-box">
                            <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:none;stroke:#8b5cf6;stroke-width:1.8;stroke-linecap:round;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        </div>
                        <span class="wechat-plus-label">情侣空间</span>
                    </div>
                </div>
            </div>`;
        }
    }
    window.buildChatPlusDrawerHTML = buildChatPlusDrawerHTML;

    // 📷 全局统一图片与文字画片发送弹窗（支持群聊与单聊，配备是否使用识图API选项）
    window.openChatSendImageModal = function(type, id) {
        window._plusDrawerOpen = false;
        window._settingsDrawerOpen = false;
        document.querySelectorAll('.wechat-clean-modal-mask').forEach(el => el.remove());

        let pendingBase64 = null;

        const modalHtml = `
            <div style="display:flex;flex-direction:column;gap:12px;text-align:left;">
                <label style="border:1px dashed #07c160;background:#f6fbf8;padding:12px;border-radius:6px;font-size:13px;font-weight:500;color:#07c160;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
                    <span id="chatImagePickerLabel">📷 从手机相册选择真实图片</span>
                    <input type="file" id="localChatImageFileInput" accept="image/*" style="display:none;">
                    <span style="color:#07c160;font-size:15px;">›</span>
                </label>
                <div id="chatImagePreviewWrap" style="display:none;text-align:center;padding:4px 0;">
                    <img id="chatImagePreviewImg" src="" style="max-height:110px;border-radius:6px;object-fit:contain;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                </div>

                <!-- 🌟 核心选项：是否使用识图 API -->
                <div style="background:#f8f9fa;padding:8px 10px;border-radius:6px;border:1px solid #ebebeb;display:flex;align-items:center;justify-content:space-between;">
                    <div>
                        <div style="font-size:12px;font-weight:600;color:#181818;">启用识图 API 自动解析图片</div>
                        <div style="font-size:10.5px;color:#888;">发送后自动分析画面细节，AI 角色知晓图片具体内容</div>
                    </div>
                    <input type="checkbox" id="wcleanUseVisionChk" checked style="width:17px;height:17px;accent-color:#07c160;cursor:pointer;">
                </div>

                <div style="border-top:0.5px solid #eee;padding-top:10px;">
                    <div style="font-size:12px;color:#666;margin-bottom:4px;">或输入网络图片链接：</div>
                    <input type="text" id="wcleanWebImageUrlInput" placeholder="https://..." class="wechat-clean-input" style="font-size:12px;">
                </div>

                <div style="border-top:0.5px solid #eee;padding-top:10px;">
                    <div style="font-size:12.5px;color:#181818;font-weight:600;margin-bottom:4px;">或发送配图文字画片（假图片）：</div>
                    <textarea id="wcleanTextImageDescInput" rows="3" class="wechat-clean-input" placeholder="输入你想给对方展示的画面细节描述（如：阳光晒在木质书桌上，一杯热气腾腾的红茶）..." style="width:100%;resize:none;font-size:12px;line-height:1.45;"></textarea>
                    <div style="font-size:11px;color:#888;margin-top:4px;">聊天中将以相框卡片呈现，点击即可放大查看文字画面。</div>
                </div>
            </div>
        `;

        window.openWechatCleanModal('发送图片', modalHtml, () => {
            const urlVal = document.getElementById('wcleanWebImageUrlInput')?.value.trim();
            const descVal = document.getElementById('wcleanTextImageDescInput')?.value.trim();
            const useVision = document.getElementById('wcleanUseVisionChk')?.checked ?? true;

            // 1. 如果选择了本地真实图片
            if (pendingBase64) {
                window.doSendImageMessageDirect(type, id, {
                    type: 'image',
                    imageUrl: pendingBase64,
                    text: '[图片]',
                    useVision: useVision
                });
                return;
            }

            // 2. 如果填了网络图片
            if (urlVal) {
                window.doSendImageMessageDirect(type, id, {
                    type: 'image',
                    imageUrl: urlVal,
                    text: '[图片]',
                    useVision: useVision
                });
                return;
            }

            // 3. 如果填了假图片文字描绘
            if (descVal) {
                window.doSendImageMessageDirect(type, id, {
                    type: 'image_text_only',
                    imageDesc: descVal,
                    text: `[图片描述：${descVal}]`,
                    useVision: false
                });
                return;
            }

            if (typeof showToast === 'function') showToast('请选择相册图片或输入描述', 'info', 1200);
            return false;
        });

        setTimeout(() => {
            const fileInput = document.getElementById('localChatImageFileInput');
            const previewWrap = document.getElementById('chatImagePreviewWrap');
            const previewImg = document.getElementById('chatImagePreviewImg');
            const pickerLabel = document.getElementById('chatImagePickerLabel');

            if (fileInput) {
                fileInput.onchange = (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        pendingBase64 = evt.target.result;
                        if (previewImg) previewImg.src = pendingBase64;
                        if (previewWrap) previewWrap.style.display = 'block';
                        if (pickerLabel) pickerLabel.textContent = '已选图片：' + file.name;
                    };
                    reader.readAsDataURL(file);
                };
            }
        }, 30);
    };

    // 🚀 底层派发图片/文字画片消息（若勾选识图则自动在后台调用 Vision API，为后续 AI 闪电生成或交互提供画面内容）
    window.doSendImageMessageDirect = function(type, id, payload) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };
        const time = new Date().toLocaleTimeString().slice(0, 5);
        const timestamp = Date.now();

        const msgObj = {
            _id: (type === 'group' ? 'gmsg_' : 'msg_') + timestamp + '_' + Math.floor(Math.random() * 899 + 100),
            from: 'player',
            isPlayer: true,
            senderName: curAcc.name,
            senderAvatar: curAcc.avatar || 'assets/icons/chat.png',
            type: payload.type || 'image',
            text: payload.text || '[图片]',
            time,
            timestamp,
            useVision: !!payload.useVision,
            visionAnalyzed: false
        };

        if (payload.imageUrl) msgObj.imageUrl = payload.imageUrl;
        if (payload.imageDesc) msgObj.imageDesc = payload.imageDesc;

        if (type === 'single') {
            if (typeof window.pushChatMessageSafe === 'function') {
                window.pushChatMessageSafe(id, msgObj, curAcc.id);
            }
            if (typeof depositRememoriEvidence === 'function') {
                depositRememoriEvidence(id, curAcc.id, `${curAcc.name}[发送了${payload.type === 'image' ? '图片' : '文字画片'}]`);
            }
            if (typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
        } else {
            if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
            if (!window.G.groupChatHistory[id]) window.G.groupChatHistory[id] = [];
            window.G.groupChatHistory[id].push(msgObj);
            if (typeof window.syncGroupChatsToLocalBackup === 'function') window.syncGroupChatsToLocalBackup();
            if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
        }

        if (typeof showToast === 'function') showToast('已发送', 'success', 1000);
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();

        // 🌟 自动异步识图：若用户勾选了 useVision，后台立即调用视觉 API 生成文字分析并持久化保存
        if (msgObj.useVision && msgObj.imageUrl && typeof window.callVisionAPI === 'function') {
            (async () => {
                try {
                    const analyzed = await window.callVisionAPI(msgObj.imageUrl);
                    if (analyzed) {
                        msgObj.visionAnalyzed = true;
                        msgObj.imageDesc = analyzed;
                        console.log('[VisionAPI] 消息图片识图分析完成:', analyzed);
                        if (type === 'single') {
                            if (typeof window.syncChatHistoryToLocalBackup === 'function') window.syncChatHistoryToLocalBackup();
                            if (window.G.currentChatNpc === id && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
                        } else {
                            if (typeof window.syncGroupChatsToLocalBackup === 'function') window.syncGroupChatsToLocalBackup();
                            if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
                        }
                    }
                } catch (vErr) {
                    console.warn('[VisionAPI] 自动识图处理异常:', vErr);
                }
            })();
        }
    };

    // 槽位点击轻量提示
    window.triggerChatFeaturePlaceholder = function(name) {
        if (typeof showToast === 'function') {
            showToast(`「${name}」功能正在开发筹备中，敬请期待~`, 'info', 1500);
        }
    };

    window.toggleChatPlusDrawer = function(type, id) {
        window._plusDrawerOpen = !window._plusDrawerOpen;
        window._settingsDrawerOpen = false;
        window._stickerDrawerOpen = false;
        window._stickerManageMode = false;
        if (type === 'single' && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
        else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
    };

    // ==========================================
    // 😊 表情抽屉 HTML 构建与管理
    // ==========================================
    function buildChatStickerDrawerHTML(type, id) {
        if (typeof ensureStickersLoaded === 'function') ensureStickersLoaded();
        const cats = window.G.stickerCategories || ['猪猪'];
        const active = window.G.activeStickerCategory || cats[0];
        const list = (window.G.stickerLibrary || []).filter(s => s && s.category === active);
        const isManage = !!window._stickerManageMode;

        const tabsHtml = cats.map(c => `
            <span class="wechat-sticker-tab-pill" 
                  data-cat="${escapeHtml(c)}"
                  onclick="window.switchChatStickerCategory('${escapeHtml(c)}','${type}','${id}')" 
                  style="display:inline-block;padding:4px 10px;margin-right:6px;border-radius:12px;font-size:12px;cursor:pointer;flex-shrink:0;background:${c === active ? '#07c160' : '#e8e8e8'};color:${c === active ? '#fff' : '#666'};user-select:none;-webkit-user-select:none;">${escapeHtml(c)}</span>
        `).join('');

        let cardsHtml = '';
        if (!isManage) {
            cardsHtml += `
                <div class="wechat-sticker-card" onclick="window.openAddStickerChoiceModal('${type}','${id}')" title="添加新表情" style="border:1px dashed #bbb;background:#fafafa;cursor:pointer;">
                    <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:#888888;stroke-width:2;stroke-linecap:round;">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </div>
            `;
        }

        cardsHtml += list.map((s, idx) => {
            const rawUrl = s.url || '';
            const rawDesc = (s.desc || '').replace(/'/g, '');
            return `
            <div class="wechat-sticker-card wechat-sticker-item-box" 
                 data-idx="${idx}" 
                 data-cat="${escapeHtml(active)}" 
                 data-url="${escapeHtml(rawUrl)}"
                 data-desc="${escapeHtml(rawDesc)}"
                 onclick="window.onStickerCardClick(event, '${type}', '${id}', '${escapeHtml(rawUrl)}', '${escapeHtml(rawDesc)}', ${idx})" 
                 title="${escapeHtml(s.desc || '')}" 
                 style="position:relative;cursor:pointer;user-select:none;-webkit-user-select:none;">
                <img src="${escapeHtml(s.url)}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" loading="lazy" onerror="this.src='assets/icons/chat.png';">
                ${isManage ? `
                    <div class="sticker-delete-cross" 
                         onclick="window.deleteSingleStickerDirect(event, '${escapeHtml(active)}', ${idx}, '${type}', '${id}')" 
                         style="position:absolute;top:-5px;right:-5px;width:18px;height:18px;background:#fa5151;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;box-shadow:0 1px 4px rgba(0,0,0,0.3);z-index:2;line-height:1;border:1.5px solid #fff;">
                        ✕
                    </div>
                ` : ''}
            </div>
            `;
        }).join('');

        const manageToggleBtn = isManage ? `
            <button onclick="window.toggleStickerManageMode(false, '${type}', '${id}')" style="border:none;background:#07c160;padding:3px 10px;border-radius:10px;font-size:11px;color:#fff;cursor:pointer;margin-left:auto;font-weight:600;white-space:nowrap;">完成</button>
        ` : `
            <button onclick="window.toggleStickerManageMode(true, '${type}', '${id}')" style="border:0.5px solid #ccc;background:#fff;padding:3px 8px;border-radius:10px;font-size:11px;color:#666;cursor:pointer;margin-left:auto;white-space:nowrap;">管理</button>
        `;

        return `
        <div id="chatStickerDrawer" style="background:#f7f7f7;border-top:0.5px solid #dcdcdc;flex-shrink:0;animation:wechatSlideUp 0.18s ease-out;">
            <div style="display:flex;align-items:center;overflow-x:auto;padding:8px 10px 4px;white-space:nowrap;">
                ${tabsHtml}
                <button onclick="window.openCreateStickerCategoryModal('${type}','${id}')" style="border:0.5px solid #ccc;background:#fff;padding:3px 8px;border-radius:10px;font-size:11px;color:#555;cursor:pointer;margin-left:4px;white-space:nowrap;">+ 分组</button>
                ${manageToggleBtn}
            </div>
            <div class="wechat-sticker-grid" style="min-height:110px;max-height:190px;overflow-y:auto;padding:8px 10px 14px;">
                ${cardsHtml || '<div style="grid-column:span 4;text-align:center;color:#bbb;font-size:12px;padding:30px 0;">该分组暂无表情包</div>'}
            </div>
        </div>`;
    }
    window.buildChatStickerDrawerHTML = buildChatStickerDrawerHTML;

    window.toggleStickerManageMode = function(open, type, id) {
        window._stickerManageMode = (open === undefined) ? !window._stickerManageMode : !!open;
        if (type === 'single' && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
        else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
        bindStickerGestures(type, id);
    };

    window.onStickerCardClick = function(e, type, id, url, desc, idx) {
        if (window._stickerManageMode) {
            e.stopPropagation();
            return;
        }
        window.sendChatSticker(type, id, url, desc);
    };

    window.deleteSingleStickerDirect = function(e, cat, catIdx, type, id) {
        e.stopPropagation();
        if (!window.G.stickerLibrary) return;

        let curCount = -1;
        const globalIdx = window.G.stickerLibrary.findIndex(s => {
            if (s && s.category === cat) {
                curCount++;
                return curCount === catIdx;
            }
            return false;
        });

        if (globalIdx !== -1) {
            window.G.stickerLibrary.splice(globalIdx, 1);
            if (typeof showToast === 'function') showToast('已删除表情', 'info', 1000);
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            if (type === 'single' && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
            else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
            bindStickerGestures(type, id);
        }
    };

    function bindStickerGestures(type, id) {
        setTimeout(() => {
            const drawer = document.getElementById('chatStickerDrawer');
            if (!drawer) return;

            drawer.querySelectorAll('.wechat-sticker-item-box').forEach(card => {
                if (typeof bindLongPressEvent === 'function') {
                    bindLongPressEvent(card, null, () => {
                        window.toggleStickerManageMode(true, type, id);
                    });
                }
            });

            drawer.querySelectorAll('.wechat-sticker-tab-pill').forEach(pill => {
                const catName = pill.getAttribute('data-cat');
                if (!catName) return;
                if (typeof bindLongPressEvent === 'function') {
                    bindLongPressEvent(pill, null, () => {
                        window.confirmDeleteStickerCategory(catName, type, id);
                    });
                }
            });
        }, 30);
    }
    window.bindStickerGestures = bindStickerGestures;

    window.confirmDeleteStickerCategory = function(catName, type, id) {
        if (catName === '猪猪' || catName === '默认') {
            if (typeof showToast === 'function') showToast('默认分组不允许删除', 'info', 1200);
            return;
        }

        window.openWechatCleanModal('删除分组', `
            <div style="text-align:center;padding:12px 6px;font-size:13.5px;color:#333;line-height:1.5;">
                确定要删除分组「<b>${escapeHtml(catName)}</b>」及其下所有表情包吗？
            </div>
        `, () => {
            if (window.G.stickerCategories) {
                window.G.stickerCategories = window.G.stickerCategories.filter(c => c !== catName);
            }
            if (window.G.stickerLibrary) {
                window.G.stickerLibrary = window.G.stickerLibrary.filter(s => s.category !== catName);
            }
            window.G.activeStickerCategory = window.G.stickerCategories?.[0] || '猪猪';
            window._stickerManageMode = false;

            if (typeof showToast === 'function') showToast('分组已删除', 'success', 1200);
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            if (type === 'single' && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
            else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
            bindStickerGestures(type, id);
        });
    };

    window.toggleChatStickerDrawer = function(type, id) {
        window._stickerDrawerOpen = !window._stickerDrawerOpen;
        window._plusDrawerOpen = false;
        window._settingsDrawerOpen = false;
        window._stickerManageMode = false;
        if (type === 'single' && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
        else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
        if (window._stickerDrawerOpen) bindStickerGestures(type, id);
    };

    window.switchChatStickerCategory = function(cat, type, id) {
        window.G.activeStickerCategory = cat;
        if (type === 'single' && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
        else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
        bindStickerGestures(type, id);
    };

    window.openAddStickerChoiceModal = function(type, id) {
        const curCat = window.G.activeStickerCategory || '猪猪';
        window.openWechatCleanModal(`添加表情包（${escapeHtml(curCat)}）`, `
            <div style="display:flex;flex-direction:column;gap:10px;text-align:left;">
                <label style="border:1px solid #dcdcdc;background:#f9f9f9;padding:12px;border-radius:6px;font-size:13px;font-weight:500;color:#333;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
                    <span>从手机相册导入本地图片</span>
                    <input type="file" id="localStickerFileInput" accept="image/*" style="display:none;">
                    <span style="color:#07c160;font-size:15px;">›</span>
                </label>

                <div onclick="window.openUrlStickerImportModal('${escapeHtml(curCat)}','${type}','${id}')" style="border:1px solid #dcdcdc;background:#f9f9f9;padding:12px;border-radius:6px;font-size:13px;font-weight:500;color:#333;cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
                    <span>输入网络图片 / 图床链接导入</span>
                    <span style="color:#07c160;font-size:15px;">›</span>
                </div>
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

    window.openUrlStickerImportModal = function(cat, type, id) {
        document.querySelector('.wechat-clean-modal-mask')?.remove();

        window.openWechatCleanModal('图床/网络表情导入', `
            <div style="display:flex;flex-direction:column;gap:10px;text-align:left;">
                <div style="font-size:12px;color:#666;">输入图片 URL（支持一行一条批量填入）：</div>
                <textarea id="wcleanUrlStickerInput" rows="4" placeholder="https://example.com/sticker1.png&#10;https://example.com/sticker2.gif" class="wechat-clean-input" style="line-height:1.45;resize:none;font-size:12px;"></textarea>
                <input type="text" id="wcleanUrlStickerDesc" placeholder="统一表情情绪描述（选填，如：得意、大笑）..." class="wechat-clean-input">
                <div style="font-size:11px;color:#999;line-height:1.4;">提示：可直接填入 GitHub 图库、CDN 加速或任意图床链接，无需打包占用本地空间。</div>
            </div>
        `, () => {
            const val = document.getElementById('wcleanUrlStickerInput')?.value || '';
            const desc = document.getElementById('wcleanUrlStickerDesc')?.value.trim() || '网络表情';
            const urls = val.split('\n').map(u => u.trim()).filter(u => u.startsWith('http://') || u.startsWith('https://'));

            if (urls.length === 0) {
                if (typeof showToast === 'function') showToast('请输入有效的 http/https 图片链接', 'warning', 1500);
                return false;
            }

            if (!window.G.stickerLibrary) window.G.stickerLibrary = [];
            urls.forEach((u, i) => {
                const itemDesc = urls.length > 1 ? `${desc} ${i + 1}` : desc;
                window.G.stickerLibrary.push({ category: cat, desc: itemDesc, url: u });
            });

            if (typeof showToast === 'function') showToast(`成功导入 ${urls.length} 个表情`, 'success', 1200);
            if (type === 'single' && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
            else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
            bindStickerGestures(type, id);
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        });
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
            if (type === 'single' && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
            else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
            bindStickerGestures(type, id);
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
            if (type === 'single' && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
            else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
            bindStickerGestures(type, id);
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        });
    };

    // ==========================================
    // ⚙️ 业务弹窗模块（排版/联网/记忆/折叠/名片/Token）
    // ==========================================
    window.openNpcUiCardSettingsModal = function(type, id) {
        if (type === 'group') {
            window.openWechatCleanModal('群聊拟真排版', `
                <div style="text-align:left;font-size:13px;color:#333;line-height:1.6;">
                    <p style="margin:0 0 8px;">群聊环境下已<b>全自动开启生活排版解析</b>（小票、清单、电影票等自动渲染美化）。</p>
                    <p style="margin:0;font-size:11.5px;color:#888;">如需调整群聊 API 模式或成员偏好，可点击右上角三个点进入【群聊高级设定】。</p>
                </div>
            `, () => {});
            return;
        }

        const cfg = getNpcUiCardConfig(id);
        const npc = window.G.npcs ? window.G.npcs[id] : null;
        const npcDisplayName = npc ? (npc.remark || npc.name) : '当前好友';

        const modalBody = `
            <div style="text-align:left;font-size:13px;color:#333;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:0.5px solid #f0f0f0;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-weight:600;color:#181818;">开启拟真生活排版</span>
                        <button type="button" onclick="window.showUiCardIntroTooltip()" style="border:none;background:#e8f7ed;color:#07c160;width:18px;height:18px;border-radius:50%;font-size:11px;font-weight:bold;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;">?</button>
                    </div>
                    <input type="checkbox" id="wcleanUiCardToggle" ${cfg.enabled ? 'checked' : ''} style="width:18px;height:18px;accent-color:#07c160;cursor:pointer;">
                </div>

                <div style="display:flex;flex-direction:column;gap:12px;">
                    <div>
                        <label style="font-size:12px;color:#666;font-weight:600;display:block;margin-bottom:4px;">自定义卡片生成时机与偏好：</label>
                        <textarea id="wcleanUiCardPrompt" rows="3" class="wechat-clean-input" style="width:100%;line-height:1.4;resize:none;" placeholder="如：买东西时发热敏小票、备忘事项发手写便利贴、看电影发影票...">${escapeHtml(cfg.customPrompt || '')}</textarea>
                        <div style="font-size:11px;color:#888;margin-top:4px;">AI 将在符合日常语境时，使用安全 HTML/CSS 生成拟真便签、收据、清单或小票。</div>
                    </div>

                    <div style="font-size:11px;color:#999;background:#f9f9f9;padding:6px 10px;border-radius:4px;line-height:1.45;">
                        目标角色：<b>${escapeHtml(npcDisplayName)}</b><br>
                        机制：卡片仅用于对话呈现与长按引用，AI 记忆总结时会自动过滤标签提取纯文本，绝不污染记忆。
                    </div>
                </div>
            </div>
        `;

        window.openWechatCleanModal('拟真生活排版', modalBody, () => {
            const enabled = document.getElementById('wcleanUiCardToggle')?.checked ?? false;
            const customPrompt = document.getElementById('wcleanUiCardPrompt')?.value.trim() || '在分享生活物件、购物结账、备忘清单、行程或收到电影票/小票时，生成美观仿真的生活卡片';

            saveNpcUiCardConfig(id, { enabled, customPrompt });
            if (typeof showToast === 'function') showToast('拟真排版设置已更新', 'success', 1200);
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        });
    };

    window.showUiCardIntroTooltip = function() {
        const text = "开启后角色可在适当场景（如分享购物小票、手写便签、电影票根、账单、行程清单等）生成仿真物品卡片。提示：因需渲染美化样式与排版代码，开启后角色单次回复 Token 会显著增加，回复生成速度会略有下降。";
        if (typeof window.openWechatCleanModal === 'function') {
            window.openWechatCleanModal('拟真排版机制', `
                <div style="text-align:left;padding:8px 4px;font-size:13px;color:#333;line-height:1.6;">
                    ${escapeHtml(text)}
                </div>
            `, () => {});
        } else if (typeof showToast === 'function') {
            showToast(text, 'info', 4000);
        }
    };

    window.openNpcSearchSettingsModal = function(type, id) {
        if (type === 'group') {
            window.openWechatCleanModal('群聊联网检索', `
                <div style="font-size:13px;color:#333;line-height:1.6;text-align:left;">
                    <p style="margin:0 0 8px;">群聊环境下采用<b>系统全局联网通道</b>。当群内出现明确的实时事实检索意图时，将自动联动后台搜索服务。</p>
                    <p style="margin:0;font-size:11.5px;color:#888;">如需修改联网 API 密钥或搜索引擎通道，请前往手机「系统设置」-「联网搜索设置」。</p>
                </div>
            `, () => {});
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

                    <div style="font-size:11px;color:#999;background:#f9f9f9;padding:6px 10px;border-radius:4px;line-height:1.45;">
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

    window.openNpcMemorySettingsModal = function(type, id) {
        if (type === 'group') {
            if (typeof window.openGroupAdvancedSettingsModal === 'function') {
                window.openGroupAdvancedSettingsModal(id);
            } else {
                if (typeof showToast === 'function') showToast('群聊记忆隔离请在右上角群设置中调整', 'info', 1500);
            }
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

            if (type === 'single' && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
            else if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
        });
    };

    window.openRecommendContactModal = function(type, id) {
        window._settingsDrawerOpen = false;
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
            if (typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
        } else {
            if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
            if (!window.G.groupChatHistory[targetId]) window.G.groupChatHistory[targetId] = [];
            window.G.groupChatHistory[targetId].push(cardMsg);
            if (typeof window.syncGroupChatsToLocalBackup === 'function') window.syncGroupChatsToLocalBackup();
            if (typeof window.renderGroupChatWindow === 'function') window.renderGroupChatWindow();
        }

        if (typeof showToast === 'function') showToast('名片已发送', 'success', 1200);
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
    };

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

    console.log('✅ ChatAppPanels 微信抽屉架构升级成功：真实图片支持勾选启用识图API并异步解析');
})();
