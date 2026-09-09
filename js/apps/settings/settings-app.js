// js/apps/settings/settings-app.js
// 📱 系统设置中心 App（AI大模型顶置/操作栏归位/方案默认折叠带粉边/向导精简模型/联网条数自定义/报错悬浮球定制/存储维护）
// ============================================================

(function(window) {
    'use strict';

    // 默认内置核心模型库
    const DEFAULT_MODEL_PRESETS = [
        'gpt-4o-mini',
        'gpt-4o',
        'chatgpt-4o-latest',
        'deepseek-chat',
        'deepseek-reasoner',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'gemini-1.5-pro-latest',
        'gemini-1.5-flash-latest',
        'gemini-2.5-flash',
        'qwen-plus',
        'qwen-max'
    ];

    let isProfileArchiveCollapsed = true; // 存档方案默认折叠状态

    // 获取当前 AI 配置
    function getSafeAIConfig() {
        const cfg = {
            baseUrl: 'https://api.openai.com/v1',
            apiKey: '',
            model: 'gpt-4o-mini',
            agentModel: 'follow_global',
            modelsList: [...DEFAULT_MODEL_PRESETS]
        };
        try {
            if (typeof loadAIConfig === 'function') loadAIConfig();
            if (window.G && window.G.ai) {
                Object.assign(cfg, window.G.ai);
            } else {
                const s = localStorage.getItem('mc_yt_ai_config') || localStorage.getItem('mcyt_ai_config');
                if (s) Object.assign(cfg, JSON.parse(s));
            }
        } catch (_) {}
        if (!Array.isArray(cfg.modelsList) || cfg.modelsList.length === 0) {
            cfg.modelsList = [...DEFAULT_MODEL_PRESETS];
        }
        return cfg;
    }

    // 获取当前联网搜索配置
    function getSafeSearchConfig() {
        const cfg = {
            enabled: false,
            provider: 'bing_local',
            keys: { bocha: '', metaso: '', tavily: '' },
            maxResults: 3
        };
        try {
            if (typeof loadSearchConfig === 'function') loadSearchConfig();
            if (window.G && window.G.search) {
                Object.assign(cfg, window.G.search);
                if (window.G.search.keys) Object.assign(cfg.keys, window.G.search.keys);
            } else {
                const s = localStorage.getItem('mc_yt_search_config');
                if (s) {
                    const parsed = JSON.parse(s);
                    Object.assign(cfg, parsed);
                    if (parsed.keys) Object.assign(cfg.keys, parsed.keys);
                }
            }
        } catch (_) {}
        return cfg;
    }

    function getAIProfiles() {
        try {
            return JSON.parse(localStorage.getItem('mcyt_ai_profiles') || '[]');
        } catch (_) {
            return [];
        }
    }

    function saveAIProfiles(list) {
        try {
            localStorage.setItem('mcyt_ai_profiles', JSON.stringify(list));
        } catch (_) {}
    }

    // 内置粉白系统输入弹窗（彻底废除浏览器原生 prompt）
    function openRetroInputModal(title, defaultVal, placeholder, onConfirm) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const retroModalTitle = document.getElementById('retroModalTitle');
        if (!modal || !modalBody) return;

        if (retroModalTitle) retroModalTitle.textContent = title || '输入内容';

        modalBody.innerHTML = `
            <div style="font-size:12.5px;color:#2e1a22;margin-bottom:8px;font-weight:700;">
                请输入新配置方案备注名称：
            </div>
            <input type="text" id="retroCustomInputVal" value="${escapeHtml(defaultVal || '')}" placeholder="${escapeHtml(placeholder || '')}" style="width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid #ffccd9;font-size:12px;outline:none;background:#fff;color:#2e1a22;">
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">
                <button class="retro-pink-btn" onclick="closeModal()" style="padding:0 12px;height:26px;font-size:11.5px;">取消</button>
                <button class="retro-pink-btn" id="retroCustomInputConfirmBtn" style="padding:0 16px;height:26px;font-size:11.5px;background:var(--primary);color:#fff;border:none;">确定</button>
            </div>
        `;

        modal.classList.add('open');

        const input = document.getElementById('retroCustomInputVal');
        if (input) {
            input.focus();
            input.select();
        }

        const confirmBtn = document.getElementById('retroCustomInputConfirmBtn');
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                const val = input ? input.value.trim() : '';
                if (typeof onConfirm === 'function') {
                    onConfirm(val);
                }
                closeModal();
            };
        }
    }

    // 内置粉白确认弹窗（彻底废除原生 confirm）
    function openRetroConfirmModal(title, msg, onConfirm) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const retroModalTitle = document.getElementById('retroModalTitle');
        if (!modal || !modalBody) return;

        if (retroModalTitle) retroModalTitle.textContent = title || '确认操作';

        modalBody.innerHTML = `
            <div style="font-size:12.5px;line-height:1.6;color:#2e1a22;padding:4px 0;">
                ${escapeHtml(msg)}
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">
                <button class="retro-pink-btn" onclick="closeModal()" style="padding:0 12px;height:26px;font-size:11.5px;">取消</button>
                <button class="retro-pink-btn" id="retroConfirmActionBtn" style="padding:0 16px;height:26px;font-size:11.5px;background:var(--primary);color:#fff;border:none;">确定</button>
            </div>
        `;

        modal.classList.add('open');

        const confirmBtn = document.getElementById('retroConfirmActionBtn');
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                if (typeof onConfirm === 'function') onConfirm();
                closeModal();
            };
        }
    }

    // 渲染系统设置主视窗
    function renderSettingsApp() {
        const body = document.getElementById('appModalBody');
        const title = document.getElementById('appModalTitle');
        if (!body) return;

        if (title) title.textContent = '系统设置';

        const orbCfg = window.ErrorMonitor ? window.ErrorMonitor.getConfig() : { enabled: true, size: 46, shape: 'circle' };
        const appVer = (typeof CURRENT_APP_VERSION !== 'undefined') ? CURRENT_APP_VERSION : '1.611';
        const aiCfg = getSafeAIConfig();
        const searchCfg = getSafeSearchConfig();
        const profiles = getAIProfiles();
        const activeProfileName = localStorage.getItem('mcyt_active_ai_profile_name') || '默认配置';

        body.innerHTML = `
            <div class="settings-app-container" style="padding-bottom:28px;">
                
                <!-- 导航分段药丸（全矢量 SVG） -->
                <div class="settings-nav-tabs" style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;padding-bottom:4px;">
                    <button class="settings-tab-btn active" data-tab="ai" style="flex:1;padding:8px 8px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;background:var(--primary);color:#fff;border:none;display:inline-flex;align-items:center;justify-content:center;gap:4px;">
                        <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24"><path d="M21 11.5v-1c0-.8-.7-1.5-1.5-1.5H18V7c0-2.2-1.8-4-4-4h-4c-2.2 0-4 1.8-4 4v2H4.5C3.7 9 3 9.7 3 10.5v1c0 .8.7 1.5 1.5 1.5H6v4c0 2.2 1.8 4 4 4h4c2.2 0 4-1.8 4-4v-4h1.5c.8 0 1.5-.7 1.5-1.5zM8 7c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2H8V7zm8 9c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2v-5h8v5zm-5.5-2.5c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1zm5 0c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1z"/></svg>
                        <span>AI 模型</span>
                    </button>
                    <button class="settings-tab-btn" data-tab="search" style="flex:1;padding:8px 8px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;background:#fff0f3;color:var(--text);border:1px solid #ffccd9;display:inline-flex;align-items:center;justify-content:center;gap:4px;">
                        <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                        <span>联网搜索</span>
                    </button>
                    <button class="settings-tab-btn" data-tab="debug" style="flex:1;padding:8px 8px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;background:#fff0f3;color:var(--text);border:1px solid #ffccd9;display:inline-flex;align-items:center;justify-content:center;gap:4px;">
                        <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>
                        <span>向导与日志</span>
                    </button>
                    <button class="settings-tab-btn" data-tab="system" style="flex:1;padding:8px 8px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;background:#fff0f3;color:var(--text);border:1px solid #ffccd9;display:inline-flex;align-items:center;justify-content:center;gap:4px;">
                        <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                        <span>系统维护</span>
                    </button>
                </div>

                <!-- 🌟 分区 1：AI 模型配置面板（大模型置顶，操作栏紧随其后，存档折叠在下方） -->
                <div id="settingsTabContent_ai" class="settings-tab-content">
                    
                    <!-- 1. 最顶层：接口参数中枢与模型配置 -->
                    <div class="theme-setting-card">
                        <div class="theme-setting-title">
                            <span>大语言模型接口参数</span>
                            <span style="font-size:11px;font-weight:normal;color:var(--primary);">当前方案: <b>${escapeHtml(activeProfileName)}</b></span>
                        </div>
                        <div class="theme-setting-desc">
                            标准 OpenAI 兼容协议（支持 DeepSeek、GPT-4o、Claude、Gemini 等）。
                        </div>

                        <div style="display:flex;flex-direction:column;gap:10px;">
                            <div>
                                <label style="font-size:12px;font-weight:700;color:var(--text);display:block;margin-bottom:4px;">接口地址 (Base URL)</label>
                                <input type="text" id="aiBaseUrlInput" value="${escapeHtml(aiCfg.baseUrl || '')}" placeholder="https://api.openai.com/v1" style="width:100%;padding:8px 10px;border:1px solid #ffccd9;border-radius:8px;font-size:12px;outline:none;">
                            </div>

                            <div>
                                <label style="font-size:12px;font-weight:700;color:var(--text);display:block;margin-bottom:4px;">API 密钥 (API Key)</label>
                                <input type="password" id="aiApiKeyInput" value="${escapeHtml(aiCfg.apiKey || '')}" placeholder="sk-..." style="width:100%;padding:8px 10px;border:1px solid #ffccd9;border-radius:8px;font-size:12px;outline:none;">
                            </div>

                            <!-- 游戏主模型上下分层排版 -->
                            <div>
                                <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:6px;">游戏主剧情模型</div>
                                
                                <!-- 上行：宽敞搜索/过滤框 + 右侧拉取按钮 -->
                                <div style="display:flex;gap:6px;margin-bottom:8px;">
                                    <input type="text" id="modelFilterKeywordInput" placeholder="🔍 搜索/过滤模型 (如 deepseek/gemini)..." style="flex:1;padding:7px 10px;border:1px solid #ffccd9;border-radius:8px;font-size:11.5px;outline:none;background:#fff8fa;">
                                    <button class="btn-secondary" id="fetchModelsBtn" style="padding:0 12px;font-size:11px;height:32px;white-space:nowrap;font-weight:700;">拉取可用模型</button>
                                </div>

                                <!-- 下行：100% 全宽模型选择下拉框，超长名称完整展现 -->
                                <div>
                                    <select id="aiModelSelect" style="width:100%;padding:8px 10px;border:1px solid #ffccd9;border-radius:8px;font-size:12px;background:#fff;outline:none;color:#2e1a22;">
                                        ${(aiCfg.modelsList || []).map(m => `<option value="${m}" ${m === aiCfg.model ? 'selected' : ''}>${m}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <!-- 智能向导专属模型（直接复用当前标注模型列表，不重复拉取） -->
                            <div style="border-top:1px dashed #ffd4e0;padding-top:10px;margin-top:2px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                    <label style="font-size:12px;font-weight:700;color:var(--text);">智能向导独立模型</label>
                                    <span style="font-size:10.5px;color:var(--text2);">可选专用快速小模型</span>
                                </div>
                                <select id="agentModelSelect" style="width:100%;padding:8px 10px;border:1px solid #ffccd9;border-radius:8px;font-size:12px;background:#fff;outline:none;color:#2e1a22;">
                                    <option value="follow_global" ${aiCfg.agentModel === 'follow_global' ? 'selected' : ''}>跟随全局主模型</option>
                                    ${(aiCfg.modelsList || []).map(m => `<option value="${m}" ${m === aiCfg.agentModel ? 'selected' : ''}>${m}</option>`).join('')}
                                </select>
                            </div>

                            <!-- 🌟 核心操作按钮栏（位于拉取模型下方） -->
                            <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:8px;margin-top:8px;">
                                <button class="btn-primary" id="updateCurrentProfileBtn" style="padding:9px;font-size:12px;">更新该保存</button>
                                <button class="btn-secondary" id="saveAsNewProfileBtn" style="padding:9px;font-size:12px;">另存为新方案</button>
                                <button class="btn-secondary" id="testAiConnectBtn" style="padding:9px;font-size:12px;">连通性测试</button>
                                <button class="btn-secondary" id="backupConfigModalBtn" style="padding:9px;font-size:12px;">配置备份与恢复</button>
                            </div>
                        </div>
                    </div>

                    <!-- 2. 下方：配置方案存档（默认折叠 + 精致粉色圆角边框） -->
                    <div class="theme-setting-card" style="background:#fff8fa;border:1.5px solid #ffccd9;border-radius:14px;box-shadow:none;">
                        <div class="theme-collapsible-header" id="profileArchiveHeader" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                            <div class="theme-setting-title" style="margin-bottom:0;font-size:13px;color:#ad1457;">
                                <span>已存配置方案 (${profiles.length + 1})</span>
                            </div>
                            <span id="profileArchiveArrow" style="font-size:11.5px;color:var(--primary);font-weight:700;">
                                ${isProfileArchiveCollapsed ? '▶ 点击展开' : '▼ 点击收起'}
                            </span>
                        </div>

                        <div id="profileArchiveBody" style="display:${isProfileArchiveCollapsed ? 'none' : 'block'};margin-top:10px;border-top:1px dashed #ffd4e0;padding-top:10px;">
                            <div class="theme-setting-desc" style="margin-bottom:8px;">
                                点击标签切换已保存的配置，点击 ✕ 彻底删除对应方案。
                            </div>
                            <div class="profile-chip-list" id="aiProfileChipContainer" style="display:flex;flex-wrap:wrap;gap:6px;">
                                <div class="profile-chip ${activeProfileName === '默认配置' ? 'active' : ''}" onclick="window.switchAIProfile('默认配置')" style="padding:4px 10px;border-radius:14px;font-size:11.5px;max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;">
                                    <span>默认配置</span>
                                </div>
                                ${profiles.map(p => `
                                    <div class="profile-chip ${p.name === activeProfileName ? 'active' : ''}" onclick="window.switchAIProfile('${escapeHtml(p.name)}')" style="padding:4px 10px;border-radius:14px;font-size:11.5px;max-width:140px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;">
                                        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.name)}</span>
                                        <span class="profile-chip-del" style="font-size:10px;opacity:0.75;" onclick="event.stopPropagation(); window.deleteAIProfile('${escapeHtml(p.name)}')">✕</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                </div>

                <!-- 分区 2：联网搜索中枢（含条数自定义与实时测试） -->
                <div id="settingsTabContent_search" class="settings-tab-content" style="display:none;">
                    <div class="theme-setting-card">
                        <div class="theme-setting-title">
                            <span>实时联网检索中枢</span>
                            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" id="searchEnableToggle" ${searchCfg.enabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);">
                                <span style="font-size:12px;font-weight:700;" id="searchEnableText">${searchCfg.enabled ? '已开启' : '已关闭'}</span>
                            </label>
                        </div>
                        <div class="theme-setting-desc">
                            开启后生成剧情或发布油管视频时将探查真实 Minecraft 资讯。
                        </div>

                        <div id="searchConfigBody" style="${searchCfg.enabled ? '' : 'opacity:0.45;pointer-events:none;'}">
                            <!-- 🌟 自定义搜索结果条数设置 -->
                            <div style="background:#fff8fa;border:1px solid #ffd4e0;border-radius:10px;padding:10px;margin-bottom:12px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                    <span style="font-size:12px;font-weight:700;color:var(--text);">搜索结果引用条数</span>
                                    <span id="searchResultCountVal" style="color:var(--primary);font-family:monospace;font-weight:700;">${searchCfg.maxResults || 3} 条</span>
                                </div>
                                <input type="range" id="searchResultCountSlider" min="1" max="10" value="${searchCfg.maxResults || 3}" style="width:100%;accent-color:var(--primary);">
                            </div>

                            <label style="font-size:12px;font-weight:700;color:var(--text);display:block;margin-bottom:6px;">搜索引擎渠道配置</label>
                            
                            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
                                <label style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid #ffccd9;border-radius:8px;background:${searchCfg.provider === 'bing_local' ? '#fff0f3' : '#fff'};cursor:pointer;">
                                    <input type="radio" name="searchProviderRadio" value="bing_local" ${searchCfg.provider === 'bing_local' ? 'checked' : ''} style="margin-top:2px;accent-color:var(--primary);">
                                    <div style="font-size:11.5px;">
                                        <div style="font-weight:700;color:#2e1a22;">Bing (Local 免Key直连)</div>
                                        <div style="color:#7a505f;font-size:10.5px;">无需配置 API Key，直连抓取，快速便捷。</div>
                                    </div>
                                </label>

                                <label style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid #ffccd9;border-radius:8px;background:${searchCfg.provider === 'bocha' ? '#fff0f3' : '#fff'};cursor:pointer;">
                                    <input type="radio" name="searchProviderRadio" value="bocha" ${searchCfg.provider === 'bocha' ? 'checked' : ''} style="margin-top:2px;accent-color:var(--primary);">
                                    <div style="font-size:11.5px;flex:1;">
                                        <div style="font-weight:700;color:#2e1a22;">博查搜索 (Bocha AI)</div>
                                        <input type="password" id="bochaKeyInput" value="${escapeHtml(searchCfg.keys?.bocha || '')}" placeholder="填入博查 API Key" style="width:100%;margin-top:4px;padding:5px 8px;border:1px solid #ffccd9;border-radius:6px;font-size:11px;outline:none;">
                                    </div>
                                </label>

                                <label style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid #ffccd9;border-radius:8px;background:${searchCfg.provider === 'metaso' ? '#fff0f3' : '#fff'};cursor:pointer;">
                                    <input type="radio" name="searchProviderRadio" value="metaso" ${searchCfg.provider === 'metaso' ? 'checked' : ''} style="margin-top:2px;accent-color:var(--primary);">
                                    <div style="font-size:11.5px;flex:1;">
                                        <div style="font-weight:700;color:#2e1a22;">秘塔 AI 搜索 (Metaso)</div>
                                        <input type="password" id="metasoKeyInput" value="${escapeHtml(searchCfg.keys?.metaso || '')}" placeholder="填入秘塔 API Key" style="width:100%;margin-top:4px;padding:5px 8px;border:1px solid #ffccd9;border-radius:6px;font-size:11px;outline:none;">
                                    </div>
                                </label>

                                <label style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid #ffccd9;border-radius:8px;background:${searchCfg.provider === 'tavily' ? '#fff0f3' : '#fff'};cursor:pointer;">
                                    <input type="radio" name="searchProviderRadio" value="tavily" ${searchCfg.provider === 'tavily' ? 'checked' : ''} style="margin-top:2px;accent-color:var(--primary);">
                                    <div style="font-size:11.5px;flex:1;">
                                        <div style="font-weight:700;color:#2e1a22;">Tavily 搜索 (国际通用)</div>
                                        <input type="password" id="tavilyKeyInput" value="${escapeHtml(searchCfg.keys?.tavily || '')}" placeholder="填入 Tavily API Key" style="width:100%;margin-top:4px;padding:5px 8px;border:1px solid #ffccd9;border-radius:6px;font-size:11px;outline:none;">
                                    </div>
                                </label>
                            </div>

                            <button class="btn-primary" id="saveSearchConfigBtn" style="width:100%;padding:9px;font-size:12px;">保存联网设置</button>

                            <!-- 联网搜索实时测试台 -->
                            <div style="margin-top:14px;border-top:1px dashed #ffd4e0;padding-top:12px;">
                                <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:6px;">搜索功能实时测试</div>
                                <div style="display:flex;gap:6px;">
                                    <input type="text" id="webSearchTestQueryInput" value="Minecraft 1.21 新特性" placeholder="输入测试搜索关键词..." style="flex:1;padding:7px 8px;border:1px solid #ffccd9;border-radius:6px;font-size:11px;outline:none;">
                                    <button class="btn-secondary" id="executeWebSearchTestBtn" style="padding:0 12px;font-size:11px;font-weight:700;">测试搜索</button>
                                </div>
                                <div id="webSearchTestResultBox" style="margin-top:8px;display:none;background:#fff8fa;border:1px solid #ffd4e0;border-radius:8px;padding:8px;font-size:11.5px;line-height:1.4;max-height:160px;overflow-y:auto;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 分区 3：悬浮向导与报错球定制 -->
                <div id="settingsTabContent_debug" class="settings-tab-content" style="display:none;">
                    <div class="theme-setting-card">
                        <div class="theme-setting-title">
                            <span>向导与报错悬浮球</span>
                            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" id="orbMasterToggle" ${orbCfg.enabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);">
                                <span style="font-size:12px;font-weight:700;" id="orbToggleText">${orbCfg.enabled ? '已开启' : '已关闭'}</span>
                            </label>
                        </div>
                        <div class="theme-setting-desc">
                            常驻屏幕边缘的智能向导与异常排查气泡。点击即可向 AI 助手提问游戏玩法，或查看代码报错日志。
                        </div>

                        <div id="orbConfigDetailBox" style="${orbCfg.enabled ? '' : 'opacity:0.45;pointer-events:none;'}">
                            <div style="margin-bottom:14px;border-top:1px dashed #ffd4e0;padding-top:12px;">
                                <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:6px;">
                                    <span>悬浮球尺寸</span>
                                    <span id="orbSizeValText" style="color:var(--primary);font-family:monospace;">${orbCfg.size}px</span>
                                </div>
                                <input type="range" id="orbSizeSlider" min="32" max="76" value="${orbCfg.size}" style="width:100%;accent-color:var(--primary);">
                            </div>

                            <div style="margin-bottom:14px;">
                                <div style="font-size:13px;font-weight:700;margin-bottom:8px;">形状与皮肤</div>
                                <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;">
                                    <button class="btn-secondary orb-shape-btn ${orbCfg.shape === 'circle' ? 'active-shape' : ''}" data-shape="circle" style="padding:7px 2px;font-size:11px;">圆形</button>
                                    <button class="btn-secondary orb-shape-btn ${orbCfg.shape === 'squircle' ? 'active-shape' : ''}" data-shape="squircle" style="padding:7px 2px;font-size:11px;">方圆</button>
                                    <button class="btn-secondary orb-shape-btn ${orbCfg.shape === 'heart' ? 'active-shape' : ''}" data-shape="heart" style="padding:7px 2px;font-size:11px;">心形</button>
                                    <button class="btn-secondary orb-shape-btn ${orbCfg.shape === 'custom_img' ? 'active-shape' : ''}" data-shape="custom_img" style="padding:7px 2px;font-size:11px;">相册皮肤</button>
                                </div>
                            </div>

                            <div style="border-top:1px dashed #ffd4e0;padding-top:12px;display:flex;flex-direction:column;gap:8px;">
                                <button class="btn-secondary" id="openLassoDrawingBtn" style="width:100%;padding:9px;font-weight:700;">
                                    随手画形状（手绘套索画板）
                                </button>
                                <button class="btn-secondary" id="importCustomOrbImgBtn" style="width:100%;padding:9px;font-weight:700;">
                                    从相册导入透明 PNG / 动图皮肤
                                </button>
                                <input type="file" id="orbImgFileInput" accept="image/png,image/gif,image/webp,image/jpeg" style="display:none;">
                            </div>
                        </div>

                        <div style="margin-top:16px;border-top:1px dashed #ffd4e0;padding-top:12px;">
                            <button class="btn-primary" id="openLogViewDirectBtn" style="width:100%;padding:10px;font-size:13px;">
                                打开向导与报错排查视窗
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 分区 4：系统维护 -->
                <div id="settingsTabContent_system" class="settings-tab-content" style="display:none;">
                    <div class="theme-setting-card">
                        <div class="theme-setting-title">
                            <span>缓存与内存维护</span>
                        </div>
                        <div class="theme-setting-desc">
                            清理临时离屏 Canvas 绘图内存碎片与调试状态，恢复手机流畅运行。
                        </div>
                        <button class="btn-secondary" id="cleanAppCacheBtn" style="width:100%;padding:10px;font-weight:700;margin-bottom:8px;">
                            深度清理临时缓存
                        </button>
                    </div>

                    <div class="theme-setting-card">
                        <div class="theme-setting-title">
                            <span>软件与运行环境</span>
                        </div>
                        <div style="font-size:12px;color:var(--text);line-height:1.6;">
                            <div>当前应用版本：<b>v${appVer}</b></div>
                            <div>核心架构：<b>原生 ES6+ / 零外部打包依赖</b></div>
                            <div>硬件感知中枢：<b>电量、时钟与网络已深度集成</b></div>
                        </div>
                    </div>
                </div>

            </div>
        `;

        bindSettingsAppEvents();
    }

    function bindSettingsAppEvents() {
        // Tab 切换
        document.querySelectorAll('.settings-tab-btn').forEach(btn => {
            btn.onclick = () => {
                const target = btn.dataset.tab;
                document.querySelectorAll('.settings-tab-btn').forEach(b => {
                    b.style.background = '#fff0f3';
                    b.style.color = 'var(--text)';
                    b.style.border = '1px solid #ffccd9';
                });
                btn.style.background = 'var(--primary)';
                btn.style.color = '#fff';
                btn.style.border = 'none';

                document.querySelectorAll('.settings-tab-content').forEach(c => c.style.display = 'none');
                const showBox = document.getElementById(`settingsTabContent_${target}`);
                if (showBox) showBox.style.display = 'block';
            };
        });

        // 折叠/展开方案存档
        const archiveHeader = document.getElementById('profileArchiveHeader');
        const archiveBody = document.getElementById('profileArchiveBody');
        const archiveArrow = document.getElementById('profileArchiveArrow');
        if (archiveHeader && archiveBody && archiveArrow) {
            archiveHeader.onclick = () => {
                isProfileArchiveCollapsed = !isProfileArchiveCollapsed;
                archiveBody.style.display = isProfileArchiveCollapsed ? 'none' : 'block';
                archiveArrow.textContent = isProfileArchiveCollapsed ? '▶ 点击展开' : '▼ 点击收起';
            };
        }

        const baseUrlInput = document.getElementById('aiBaseUrlInput');
        const apiKeyInput = document.getElementById('aiApiKeyInput');
        const modelSelect = document.getElementById('aiModelSelect');
        const filterInput = document.getElementById('modelFilterKeywordInput');
        const agentSelect = document.getElementById('agentModelSelect');

        let fullModelList = getSafeAIConfig().modelsList || [...DEFAULT_MODEL_PRESETS];

        function renderFilteredModelOptions(keyword = '') {
            if (!modelSelect) return;
            const kw = keyword.toLowerCase().trim();
            const filtered = fullModelList.filter(m => !kw || m.toLowerCase().includes(kw));

            const curVal = modelSelect.value;
            if (filtered.length === 0) {
                modelSelect.innerHTML = `<option value="">无匹配模型</option>`;
            } else {
                modelSelect.innerHTML = filtered.map(m => `
                    <option value="${m}" ${m === curVal ? 'selected' : ''}>${m}</option>
                `).join('');
            }
        }

        if (filterInput) {
            filterInput.oninput = () => {
                renderFilteredModelOptions(filterInput.value);
            };
        }

        const gatherCurrentAiData = () => {
            return {
                baseUrl: (baseUrlInput?.value || '').trim(),
                apiKey: (apiKeyInput?.value || '').trim(),
                model: (modelSelect?.value || '').trim() || 'gpt-4o-mini',
                agentModel: (agentSelect?.value || 'follow_global'),
                modelsList: [...fullModelList]
            };
        };

        // 🌟 1. 更新该保存（直接覆盖当前激活方案）
        const updateSaveBtn = document.getElementById('updateCurrentProfileBtn');
        if (updateSaveBtn) {
            updateSaveBtn.onclick = () => {
                const activeName = localStorage.getItem('mcyt_active_ai_profile_name') || '默认配置';
                const curData = gatherCurrentAiData();

                try {
                    if (window.G) {
                        if (!window.G.ai) window.G.ai = {};
                        Object.assign(window.G.ai, curData);
                    }
                    localStorage.setItem('mc_yt_ai_config', JSON.stringify(curData));
                    if (typeof persistAIConfig === 'function') persistAIConfig();

                    // 如果不是默认配置，同步更新进方案存档列表中
                    if (activeName !== '默认配置') {
                        const list = getAIProfiles();
                        const idx = list.findIndex(p => p.name === activeName);
                        if (idx >= 0) {
                            list[idx].config = curData;
                            list[idx].updatedAt = Date.now();
                            saveAIProfiles(list);
                        }
                    }

                    renderSettingsApp();
                    if (typeof showToast === 'function') showToast(`已更新保存方案 [${activeName}]`, 'success');
                } catch (e) {
                    if (typeof showToast === 'function') showToast('保存失败: ' + e.message, 'error');
                }
            };
        }

        // 🌟 2. 另存为新方案
        const saveAsBtn = document.getElementById('saveAsNewProfileBtn');
        if (saveAsBtn) {
            saveAsBtn.onclick = () => {
                openRetroInputModal('另存为新方案', '新 API 专线', '输入方案名称...', (name) => {
                    if (!name) {
                        if (typeof showToast === 'function') showToast('方案名称不能为空', 'error');
                        return;
                    }
                    const curData = gatherCurrentAiData();
                    const list = getAIProfiles();
                    const targetName = name.trim();

                    const existingIdx = list.findIndex(p => p.name === targetName);
                    const profileObj = {
                        name: targetName,
                        config: curData,
                        updatedAt: Date.now()
                    };

                    if (existingIdx >= 0) list[existingIdx] = profileObj;
                    else list.push(profileObj);

                    saveAIProfiles(list);
                    localStorage.setItem('mcyt_active_ai_profile_name', targetName);
                    renderSettingsApp();
                    if (typeof showToast === 'function') showToast(`新方案 [${targetName}] 已保存！`, 'success');
                });
            };
        }

        // 3. 连通性测试
        const testAiBtn = document.getElementById('testAiConnectBtn');
        if (testAiBtn) {
            testAiBtn.onclick = async () => {
                const data = gatherCurrentAiData();
                if (!data.apiKey) {
                    if (typeof showToast === 'function') showToast('请先输入 API 密钥', 'error');
                    return;
                }
                testAiBtn.disabled = true;
                testAiBtn.textContent = '测试中...';

                try {
                    const endpoint = (data.baseUrl.replace(/\/+$/, '')) + '/chat/completions';
                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${data.apiKey}`
                        },
                        body: JSON.stringify({
                            model: data.model,
                            messages: [{ role: 'user', content: 'hi' }],
                            max_tokens: 5
                        })
                    });

                    if (res.ok) {
                        if (typeof showToast === 'function') showToast('连接成功！大模型接口正常可用', 'success');
                    } else {
                        const errTxt = await res.text();
                        if (typeof showToast === 'function') showToast(`连接异常(${res.status}): ${errTxt.slice(0, 45)}`, 'error');
                    }
                } catch (err) {
                    if (typeof showToast === 'function') showToast('网络连接失败: ' + err.message, 'error');
                } finally {
                    testAiBtn.disabled = false;
                    testAiBtn.textContent = '连通性测试';
                }
            };
        }

        // 4. 拉取模型列表
        const fetchModelsBtn = document.getElementById('fetchModelsBtn');
        if (fetchModelsBtn) {
            fetchModelsBtn.onclick = async () => {
                const data = gatherCurrentAiData();
                if (!data.apiKey) {
                    if (typeof showToast === 'function') showToast('请先输入 API 密钥再拉取模型', 'error');
                    return;
                }

                fetchModelsBtn.disabled = true;
                fetchModelsBtn.textContent = '拉取中...';

                try {
                    const endpoint = (data.baseUrl.replace(/\/+$/, '')) + '/models';
                    const res = await fetch(endpoint, {
                        headers: { 'Authorization': `Bearer ${data.apiKey}` }
                    });

                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    const json = await res.json();
                    let list = [];
                    if (Array.isArray(json.data)) {
                        list = json.data.map(item => item.id).filter(Boolean);
                    } else if (Array.isArray(json)) {
                        list = json.map(item => item.id || item).filter(Boolean);
                    }

                    if (list.length > 0) {
                        list.sort();
                        fullModelList = Array.from(new Set([...list, ...DEFAULT_MODEL_PRESETS]));
                        renderFilteredModelOptions(filterInput ? filterInput.value : '');
                        
                        // 同步刷新向导模型列表
                        if (agentSelect) {
                            const curVal = agentSelect.value;
                            agentSelect.innerHTML = `
                                <option value="follow_global">跟随全局主模型</option>
                                ${fullModelList.map(m => `<option value="${m}" ${m === curVal ? 'selected' : ''}>${m}</option>`).join('')}
                            `;
                        }

                        if (typeof showToast === 'function') showToast(`成功发现 ${list.length} 个模型`, 'success');
                    } else {
                        if (typeof showToast === 'function') showToast('未在接口返回中解析到模型列表', 'info');
                    }
                } catch (err) {
                    if (typeof showToast === 'function') showToast('拉取模型失败: ' + err.message, 'error');
                } finally {
                    fetchModelsBtn.disabled = false;
                    fetchModelsBtn.textContent = '拉取可用模型';
                }
            };
        }

        // 5. 备份与恢复
        const backupBtn = document.getElementById('backupConfigModalBtn');
        if (backupBtn) {
            backupBtn.onclick = () => {
                openConfigBackupModal();
            };
        }

        // 6. 联网搜索配置
        const searchToggle = document.getElementById('searchEnableToggle');
        const searchToggleText = document.getElementById('searchEnableText');
        const searchConfigBody = document.getElementById('searchConfigBody');
        const saveSearchBtn = document.getElementById('saveSearchConfigBtn');
        const resultCountSlider = document.getElementById('searchResultCountSlider');
        const resultCountVal = document.getElementById('searchResultCountVal');

        if (resultCountSlider && resultCountVal) {
            resultCountSlider.oninput = () => {
                resultCountVal.textContent = resultCountSlider.value + ' 条';
            };
        }

        if (searchToggle) {
            searchToggle.onchange = () => {
                const checked = searchToggle.checked;
                if (searchToggleText) searchToggleText.textContent = checked ? '已开启' : '已关闭';
                if (searchConfigBody) {
                    searchConfigBody.style.opacity = checked ? '1' : '0.45';
                    searchConfigBody.style.pointerEvents = checked ? 'auto' : 'none';
                }
            };
        }

        if (saveSearchBtn) {
            saveSearchBtn.onclick = () => {
                const selectedRadio = document.querySelector('input[name="searchProviderRadio"]:checked');
                const provider = selectedRadio ? selectedRadio.value : 'bing_local';
                const searchObj = {
                    enabled: !!(searchToggle && searchToggle.checked),
                    provider: provider,
                    maxResults: parseInt(resultCountSlider?.value) || 3,
                    keys: {
                        bocha: document.getElementById('bochaKeyInput')?.value.trim() || '',
                        metaso: document.getElementById('metasoKeyInput')?.value.trim() || '',
                        tavily: document.getElementById('tavilyKeyInput')?.value.trim() || ''
                    }
                };

                try {
                    if (window.G) {
                        if (!window.G.search) window.G.search = {};
                        Object.assign(window.G.search, searchObj);
                    }
                    localStorage.setItem('mc_yt_search_config', JSON.stringify(searchObj));
                    if (typeof persistSearchConfig === 'function') persistSearchConfig();
                    if (typeof showToast === 'function') showToast('已保存联网检索设置', 'success');
                } catch (e) {
                    if (typeof showToast === 'function') showToast('保存失败: ' + e.message, 'error');
                }
            };
        }

        // 7. 联网搜索实时测试
        const testSearchBtn = document.getElementById('executeWebSearchTestBtn');
        const testSearchQuery = document.getElementById('webSearchTestQueryInput');
        const testSearchResultBox = document.getElementById('webSearchTestResultBox');

        if (testSearchBtn && testSearchQuery && testSearchResultBox) {
            testSearchBtn.onclick = async () => {
                const query = testSearchQuery.value.trim();
                if (!query) {
                    if (typeof showToast === 'function') showToast('请输入测试搜索关键词', 'error');
                    return;
                }

                if (typeof window.webSearch !== 'function') {
                    if (typeof showToast === 'function') showToast('底层搜索组件未就绪', 'error');
                    return;
                }

                testSearchBtn.disabled = true;
                testSearchBtn.textContent = '检索中...';
                testSearchResultBox.style.display = 'block';
                testSearchResultBox.innerHTML = '<span style="color:#7a505f;">正在向搜索引擎建立实时连接探查...</span>';

                const targetCount = parseInt(resultCountSlider?.value) || 3;

                try {
                    const res = await window.webSearch(query, targetCount);
                    const list = res.results || [];
                    if (list.length === 0) {
                        testSearchResultBox.innerHTML = '<span style="color:#c62828;">未检索到相关内容，或当前网络通道受限。</span>';
                    } else {
                        testSearchResultBox.innerHTML = list.map((item, idx) => `
                            <div style="border-bottom:1px dashed #ffd4e0;padding-bottom:4px;margin-bottom:4px;">
                                <div style="font-weight:700;color:var(--primary);">${idx + 1}. ${escapeHtml(item.title)}</div>
                                <div style="color:#2e1a22;font-size:11px;">${escapeHtml((item.content || '').slice(0, 100))}...</div>
                            </div>
                        `).join('') + (res.answer ? `<div style="margin-top:4px;color:#2e1a22;font-weight:600;">智能概述：${escapeHtml(res.answer)}</div>` : '');
                    }
                } catch (err) {
                    testSearchResultBox.innerHTML = `<span style="color:#c62828;">搜索探查失败: ${escapeHtml(err.message)}</span>`;
                } finally {
                    testSearchBtn.disabled = false;
                    testSearchBtn.textContent = '测试搜索';
                }
            };
        }

        // 8. 悬浮球设置
        const orbToggle = document.getElementById('orbMasterToggle');
        const orbToggleText = document.getElementById('orbToggleText');
        const detailBox = document.getElementById('orbConfigDetailBox');

        if (orbToggle && window.ErrorMonitor) {
            orbToggle.onchange = () => {
                const enabled = orbToggle.checked;
                window.ErrorMonitor.setEnabled(enabled);
                if (orbToggleText) orbToggleText.textContent = enabled ? '已开启' : '已关闭';
                if (detailBox) {
                    detailBox.style.opacity = enabled ? '1' : '0.45';
                    detailBox.style.pointerEvents = enabled ? 'auto' : 'none';
                }
                if (typeof showToast === 'function') showToast(enabled ? '已启用向导悬浮球' : '已隐藏向导悬浮球', 'info');
            };
        }

        const sizeSlider = document.getElementById('orbSizeSlider');
        const sizeText = document.getElementById('orbSizeValText');
        if (sizeSlider && window.ErrorMonitor) {
            sizeSlider.oninput = () => {
                const val = sizeSlider.value;
                if (sizeText) sizeText.textContent = val + 'px';
                window.ErrorMonitor.setSize(val);
            };
        }

        document.querySelectorAll('.orb-shape-btn').forEach(btn => {
            btn.onclick = () => {
                const shape = btn.dataset.shape;
                if (window.ErrorMonitor) {
                    window.ErrorMonitor.setShape(shape);
                    document.querySelectorAll('.orb-shape-btn').forEach(b => b.classList.remove('active-shape'));
                    btn.classList.add('active-shape');
                    if (typeof showToast === 'function') showToast('已应用外观样式', 'success', 1000);
                }
            };
        });

        const lassoBtn = document.getElementById('openLassoDrawingBtn');
        if (lassoBtn && window.ErrorMonitor) {
            lassoBtn.onclick = () => {
                if (typeof window.ErrorMonitor.openLassoDrawer === 'function') {
                    window.ErrorMonitor.openLassoDrawer();
                }
            };
        }

        const importImgBtn = document.getElementById('importCustomOrbImgBtn');
        const fileInput = document.getElementById('orbImgFileInput');
        if (importImgBtn && fileInput && window.ErrorMonitor) {
            importImgBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                if (file.size > 2 * 1024 * 1024) {
                    if (typeof showToast === 'function') showToast('图片请小于 2MB', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (ev) => {
                    const base64 = ev.target.result;
                    window.ErrorMonitor.setCustomImage(base64);
                    document.querySelectorAll('.orb-shape-btn').forEach(b => b.classList.remove('active-shape'));
                    document.querySelector('.orb-shape-btn[data-shape="custom_img"]')?.classList.add('active-shape');
                    if (typeof showToast === 'function') showToast('专属悬浮球皮肤装载完成', 'success');
                };
                reader.readAsDataURL(file);
            };
        }

        const logBtn = document.getElementById('openLogViewDirectBtn');
        if (logBtn && window.ErrorMonitor) {
            logBtn.onclick = () => window.ErrorMonitor.openLogModal();
        }

        const cleanBtn = document.getElementById('cleanAppCacheBtn');
        if (cleanBtn) {
            cleanBtn.onclick = () => {
                if (window.ErrorMonitor) window.ErrorMonitor.clearErrors();
                if (typeof showToast === 'function') showToast('临时缓存与调试记录已清理', 'success');
            };
        }
    }

    // 方案切换
    window.switchAIProfile = function(name) {
        if (name === '默认配置') {
            localStorage.setItem('mcyt_active_ai_profile_name', '默认配置');
            renderSettingsApp();
            if (typeof showToast === 'function') showToast('已切换至默认配置');
            return;
        }

        const profiles = getAIProfiles();
        const target = profiles.find(p => p.name === name);
        if (!target || !target.config) return;

        localStorage.setItem('mcyt_active_ai_profile_name', target.name);
        try {
            if (window.G) {
                if (!window.G.ai) window.G.ai = {};
                Object.assign(window.G.ai, target.config);
            }
            localStorage.setItem('mc_yt_ai_config', JSON.stringify(target.config));
            if (typeof persistAIConfig === 'function') persistAIConfig();
        } catch (_) {}

        renderSettingsApp();
        if (typeof showToast === 'function') showToast(`已切换至方案: ${target.name}`, 'success');
    };

    // 方案删除
    window.deleteAIProfile = function(name) {
        openRetroConfirmModal('删除方案', `确定要彻底删除配置方案 [${name}] 吗？`, () => {
            let list = getAIProfiles().filter(p => p.name !== name);
            saveAIProfiles(list);
            if (localStorage.getItem('mcyt_active_ai_profile_name') === name) {
                localStorage.setItem('mcyt_active_ai_profile_name', '默认配置');
            }
            renderSettingsApp();
            if (typeof showToast === 'function') showToast(`方案 [${name}] 已删除`);
        });
    };

    // 备份恢复弹窗
    function openConfigBackupModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const retroModalTitle = document.getElementById('retroModalTitle');
        if (!modal || !modalBody) return;

        if (retroModalTitle) retroModalTitle.textContent = '配置备份与恢复';

        const payload = {
            ai: getSafeAIConfig(),
            search: getSafeSearchConfig(),
            profiles: getAIProfiles(),
            timestamp: Date.now()
        };
        const exportJsonStr = JSON.stringify(payload, null, 2);

        modalBody.innerHTML = `
            <div style="font-size:12px;line-height:1.5;color:#2e1a22;">
                <div style="font-weight:700;margin-bottom:6px;">导出配置文本（复制备用）：</div>
                <textarea id="configExportArea" readonly style="width:100%;height:90px;font-family:monospace;font-size:10px;padding:6px;border:1px solid #ffd4e0;border-radius:6px;background:#fff8fa;outline:none;">${escapeHtml(exportJsonStr)}</textarea>
                
                <div style="margin-top:6px;display:flex;justify-content:flex-end;">
                    <button class="retro-pink-btn" id="copyConfigExportBtn" style="padding:0 10px;height:24px;font-size:11px;">复制到剪贴板</button>
                </div>

                <div style="font-weight:700;margin:10px 0 6px 0;">从备份文本导入恢复：</div>
                <textarea id="configImportArea" placeholder="在此粘贴备份的 JSON 配置文本..." style="width:100%;height:75px;font-family:monospace;font-size:10px;padding:6px;border:1px solid #ffd4e0;border-radius:6px;outline:none;"></textarea>
                
                <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
                    <button class="retro-pink-btn" onclick="closeModal()" style="padding:0 12px;height:26px;font-size:11.5px;">取消</button>
                    <button class="retro-pink-btn" id="applyConfigImportBtn" style="padding:0 16px;height:26px;font-size:11.5px;background:var(--primary);color:#fff;border:none;">确认导入恢复</button>
                </div>
            </div>
        `;

        modal.classList.add('open');

        document.getElementById('copyConfigExportBtn').onclick = () => {
            const area = document.getElementById('configExportArea');
            if (area) {
                if (window.NativeBridge && window.NativeBridge.copyText) {
                    window.NativeBridge.copyText(area.value);
                } else if (navigator.clipboard) {
                    navigator.clipboard.writeText(area.value);
                }
                if (typeof showToast === 'function') showToast('已复制配置备份');
            }
        };

        document.getElementById('applyConfigImportBtn').onclick = () => {
            const txt = (document.getElementById('configImportArea')?.value || '').trim();
            if (!txt) {
                if (typeof showToast === 'function') showToast('请先粘贴备份内容', 'error');
                return;
            }

            try {
                const parsed = JSON.parse(txt);
                if (parsed.ai) {
                    localStorage.setItem('mc_yt_ai_config', JSON.stringify(parsed.ai));
                    if (window.G) {
                        if (!window.G.ai) window.G.ai = {};
                        Object.assign(window.G.ai, parsed.ai);
                    }
                }
                if (parsed.search) {
                    localStorage.setItem('mc_yt_search_config', JSON.stringify(parsed.search));
                    if (window.G) {
                        if (!window.G.search) window.G.search = {};
                        Object.assign(window.G.search, parsed.search);
                    }
                }
                if (Array.isArray(parsed.profiles)) {
                    saveAIProfiles(parsed.profiles);
                }
                if (typeof closeModal === 'function') closeModal();
                renderSettingsApp();
                if (typeof showToast === 'function') showToast('配置已成功恢复！', 'success');
            } catch (err) {
                if (typeof showToast === 'function') showToast('解析失败，请确保格式正确', 'error');
            }
        };
    }

    const originOpenPhoneApp = window.openPhoneApp;
    window.openPhoneApp = function(appName) {
        if (appName === 'settings') {
            const modal = document.getElementById('appModal');
            if (modal) {
                renderSettingsApp();
                modal.classList.add('opened');
            }
            return;
        }
        if (typeof originOpenPhoneApp === 'function') {
            originOpenPhoneApp(appName);
        }
    };

    window.renderSettingsApp = renderSettingsApp;

})(window);
