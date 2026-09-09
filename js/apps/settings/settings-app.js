// js/apps/settings/settings-app.js
// 📱 系统设置中心 App（AI大模型/多平台联网搜索/报错悬浮球定制/存储维护）
// ============================================================

(function(window) {
    'use strict';

    // 默认大模型配置（若底层未初始化则安全兜底）
    function getSafeAIConfig() {
        const cfg = {
            baseUrl: 'https://api.openai.com/v1',
            apiKey: '',
            model: 'gpt-4o-mini',
            modelsList: ['gpt-4o-mini', 'gpt-4o', 'deepseek-chat', 'deepseek-reasoner', 'claude-3-5-sonnet-20241022']
        };
        try {
            if (typeof loadAIConfig === 'function') {
                const loaded = loadAIConfig();
                if (loaded) Object.assign(cfg, loaded);
            } else {
                const s = localStorage.getItem('mcyt_ai_config');
                if (s) Object.assign(cfg, JSON.parse(s));
            }
        } catch (_) {}
        return cfg;
    }

    function getSafeSearchConfig() {
        const cfg = {
            enabled: false,
            provider: 'bing_free', // 'bing_free' | 'bocha' | 'metaso' | 'tavily'
            bochaKey: '',
            metasoKey: '',
            tavilyKey: '',
            maxResults: 3
        };
        try {
            if (typeof loadSearchConfig === 'function') {
                const loaded = loadSearchConfig();
                if (loaded) Object.assign(cfg, loaded);
            } else {
                const s = localStorage.getItem('mcyt_search_config');
                if (s) Object.assign(cfg, JSON.parse(s));
            }
        } catch (_) {}
        return cfg;
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

        body.innerHTML = `
            <div class="settings-app-container" style="padding-bottom:28px;">
                
                <!-- 导航分段药丸（全矢量 SVG，无廉价 Emoji） -->
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

                <!-- 分区分块 1：AI 模型（完整内置渲染，杜绝丢失） -->
                <div id="settingsTabContent_ai" class="settings-tab-content">
                    <div class="theme-setting-card">
                        <div class="theme-setting-title">
                            <span>大语言模型接口配置</span>
                        </div>
                        <div class="theme-setting-desc">
                            支持 OpenAI 标准兼容协议（如 DeepSeek、GPT-4o、Gemini、Claude 代理中转等），全站剧情与角色互动将由此驱动。
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

                            <div>
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                    <label style="font-size:12px;font-weight:700;color:var(--text);">当前选用模型</label>
                                    <button class="btn-secondary" id="fetchModelsBtn" style="padding:3px 8px;font-size:11px;height:24px;">拉取可用模型</button>
                                </div>
                                <div style="display:flex;gap:6px;">
                                    <input type="text" id="aiModelInput" value="${escapeHtml(aiCfg.model || 'gpt-4o-mini')}" placeholder="输入或从右侧列表选择" style="flex:1;padding:8px 10px;border:1px solid #ffccd9;border-radius:8px;font-size:12px;outline:none;">
                                    <select id="aiModelSelect" style="width:110px;padding:6px;border:1px solid #ffccd9;border-radius:8px;font-size:11.5px;background:#fff;outline:none;">
                                        ${(aiCfg.modelsList || []).map(m => `<option value="${m}" ${m === aiCfg.model ? 'selected' : ''}>${m}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <div style="display:flex;gap:8px;margin-top:4px;">
                                <button class="btn-secondary" id="testAiConnectBtn" style="flex:1;padding:9px;font-size:12px;">连通性测试</button>
                                <button class="btn-primary" id="saveAiConfigBtn" style="flex:1;padding:9px;font-size:12px;">保存配置</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 分区分块 2：联网搜索（四大引擎完整集成） -->
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
                            开启后，在生成剧情或发布视频时可探查最新 Minecraft 游戏资讯与实时话题。
                        </div>

                        <div id="searchConfigBody" style="${searchCfg.enabled ? '' : 'opacity:0.45;pointer-events:none;'}">
                            <label style="font-size:12px;font-weight:700;color:var(--text);display:block;margin-bottom:6px;">选择搜索引擎渠道</label>
                            
                            <!-- 渠道单选卡片 -->
                            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
                                <label style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid #ffccd9;border-radius:8px;background:${searchCfg.provider === 'bing_free' ? '#fff0f3' : '#fff'};cursor:pointer;">
                                    <input type="radio" name="searchProviderRadio" value="bing_free" ${searchCfg.provider === 'bing_free' ? 'checked' : ''} style="margin-top:2px;accent-color:var(--primary);">
                                    <div style="font-size:11.5px;">
                                        <div style="font-weight:700;color:#2e1a22;">Bing (Local 免Key直连)</div>
                                        <div style="color:#7a505f;font-size:10.5px;">无需配置 API Key，通过本地协议直连检索，轻量便捷。</div>
                                    </div>
                                </label>

                                <label style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid #ffccd9;border-radius:8px;background:${searchCfg.provider === 'bocha' ? '#fff0f3' : '#fff'};cursor:pointer;">
                                    <input type="radio" name="searchProviderRadio" value="bocha" ${searchCfg.provider === 'bocha' ? 'checked' : ''} style="margin-top:2px;accent-color:var(--primary);">
                                    <div style="font-size:11.5px;flex:1;">
                                        <div style="font-weight:700;color:#2e1a22;">博查搜索 (Bocha AI)</div>
                                        <input type="password" id="bochaKeyInput" value="${escapeHtml(searchCfg.bochaKey || '')}" placeholder="填写博查 API Key" style="width:100%;margin-top:4px;padding:5px 8px;border:1px solid #ffccd9;border-radius:6px;font-size:11px;outline:none;">
                                    </div>
                                </label>

                                <label style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid #ffccd9;border-radius:8px;background:${searchCfg.provider === 'metaso' ? '#fff0f3' : '#fff'};cursor:pointer;">
                                    <input type="radio" name="searchProviderRadio" value="metaso" ${searchCfg.provider === 'metaso' ? 'checked' : ''} style="margin-top:2px;accent-color:var(--primary);">
                                    <div style="font-size:11.5px;flex:1;">
                                        <div style="font-weight:700;color:#2e1a22;">秘塔 AI 搜索 (Metaso)</div>
                                        <input type="password" id="metasoKeyInput" value="${escapeHtml(searchCfg.metasoKey || '')}" placeholder="填写秘塔 API Key" style="width:100%;margin-top:4px;padding:5px 8px;border:1px solid #ffccd9;border-radius:6px;font-size:11px;outline:none;">
                                    </div>
                                </label>

                                <label style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid #ffccd9;border-radius:8px;background:${searchCfg.provider === 'tavily' ? '#fff0f3' : '#fff'};cursor:pointer;">
                                    <input type="radio" name="searchProviderRadio" value="tavily" ${searchCfg.provider === 'tavily' ? 'checked' : ''} style="margin-top:2px;accent-color:var(--primary);">
                                    <div style="font-size:11.5px;flex:1;">
                                        <div style="font-weight:700;color:#2e1a22;">Tavily 搜索 (国际通用)</div>
                                        <input type="password" id="tavilyKeyInput" value="${escapeHtml(searchCfg.tavilyKey || '')}" placeholder="填写 Tavily API Key" style="width:100%;margin-top:4px;padding:5px 8px;border:1px solid #ffccd9;border-radius:6px;font-size:11px;outline:none;">
                                    </div>
                                </label>
                            </div>

                            <button class="btn-primary" id="saveSearchConfigBtn" style="width:100%;padding:9px;font-size:12px;">保存联网设置</button>
                        </div>
                    </div>
                </div>

                <!-- 分区分块 3：悬浮向导与报错球定制 -->
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
                            常驻在屏幕边缘的智能向导与异常监控球。点击即可随时向 AI 助手提问游戏按键用法，或查看代码报错堆栈。
                        </div>

                        <div id="orbConfigDetailBox" style="${orbCfg.enabled ? '' : 'opacity:0.45;pointer-events:none;'}">
                            <!-- 大小滑动条 -->
                            <div style="margin-bottom:14px;border-top:1px dashed #ffd4e0;padding-top:12px;">
                                <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:6px;">
                                    <span>悬浮球尺寸</span>
                                    <span id="orbSizeValText" style="color:var(--primary);font-family:monospace;">${orbCfg.size}px</span>
                                </div>
                                <input type="range" id="orbSizeSlider" min="32" max="76" value="${orbCfg.size}" style="width:100%;accent-color:var(--primary);">
                            </div>

                            <!-- 预设外形 -->
                            <div style="margin-bottom:14px;">
                                <div style="font-size:13px;font-weight:700;margin-bottom:8px;">形状与皮肤</div>
                                <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;">
                                    <button class="btn-secondary orb-shape-btn ${orbCfg.shape === 'circle' ? 'active-shape' : ''}" data-shape="circle" style="padding:7px 2px;font-size:11px;">圆形</button>
                                    <button class="btn-secondary orb-shape-btn ${orbCfg.shape === 'squircle' ? 'active-shape' : ''}" data-shape="squircle" style="padding:7px 2px;font-size:11px;">方圆</button>
                                    <button class="btn-secondary orb-shape-btn ${orbCfg.shape === 'heart' ? 'active-shape' : ''}" data-shape="heart" style="padding:7px 2px;font-size:11px;">心形</button>
                                    <button class="btn-secondary orb-shape-btn ${orbCfg.shape === 'custom_img' ? 'active-shape' : ''}" data-shape="custom_img" style="padding:7px 2px;font-size:11px;">相册皮肤</button>
                                </div>
                            </div>

                            <!-- 高级外观：套索手绘与相册专属皮肤导入 -->
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

                        <!-- 立即呼出悬浮球弹窗 -->
                        <div style="margin-top:16px;border-top:1px dashed #ffd4e0;padding-top:12px;">
                            <button class="btn-primary" id="openLogViewDirectBtn" style="width:100%;padding:10px;font-size:13px;">
                                打开向导与报错排查视窗
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 分区分块 4：系统维护 -->
                <div id="settingsTabContent_system" class="settings-tab-content" style="display:none;">
                    <div class="theme-setting-card">
                        <div class="theme-setting-title">
                            <span>缓存与内存维护</span>
                        </div>
                        <div class="theme-setting-desc">
                            清理临时离屏 Canvas 绘图内存碎片与调试状态，恢复流畅运行。
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
                            <div>核心框架：<b>原生 ES6+ / 零外部打包依赖</b></div>
                            <div>状态感知：<b>硬件电量、时钟与网络深度感知中枢已挂载</b></div>
                        </div>
                    </div>
                </div>

            </div>
        `;

        bindSettingsAppEvents();
    }

    function bindSettingsAppEvents() {
        // 1. Tab 切换
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

        // 2. AI 模型配置保存与拉取
        const saveAiBtn = document.getElementById('saveAiConfigBtn');
        const fetchModelsBtn = document.getElementById('fetchModelsBtn');
        const testAiBtn = document.getElementById('testAiConnectBtn');
        const modelSelect = document.getElementById('aiModelSelect');
        const modelInput = document.getElementById('aiModelInput');

        if (modelSelect && modelInput) {
            modelSelect.onchange = () => {
                modelInput.value = modelSelect.value;
            };
        }

        const getGatheredAiConfig = () => {
            const baseUrl = (document.getElementById('aiBaseUrlInput')?.value || '').trim();
            const apiKey = (document.getElementById('aiApiKeyInput')?.value || '').trim();
            const model = (modelInput?.value || '').trim() || 'gpt-4o-mini';
            return { baseUrl, apiKey, model };
        };

        if (saveAiBtn) {
            saveAiBtn.onclick = () => {
                const data = getGatheredAiConfig();
                try {
                    localStorage.setItem('mcyt_ai_config', JSON.stringify(data));
                    if (typeof persistAIConfig === 'function') persistAIConfig();
                    if (typeof showToast === 'function') showToast('已成功保存 AI 模型配置', 'success');
                } catch (e) {
                    if (typeof showToast === 'function') showToast('保存失败: ' + e.message, 'error');
                }
            };
        }

        if (testAiBtn) {
            testAiBtn.onclick = async () => {
                const data = getGatheredAiConfig();
                if (!data.apiKey) {
                    if (typeof showToast === 'function') showToast('请先填写 API 密钥', 'error');
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
                        if (typeof showToast === 'function') showToast('连接成功！接口与模型可用', 'success');
                    } else {
                        const errTxt = await res.text();
                        if (typeof showToast === 'function') showToast(`连接异常(${res.status}): ${errTxt.slice(0, 40)}`, 'error');
                    }
                } catch (err) {
                    if (typeof showToast === 'function') showToast('网络连接失败: ' + err.message, 'error');
                } finally {
                    testAiBtn.disabled = false;
                    testAiBtn.textContent = '连通性测试';
                }
            };
        }

        if (fetchModelsBtn) {
            fetchModelsBtn.onclick = async () => {
                const data = getGatheredAiConfig();
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
                        modelSelect.innerHTML = list.map(m => `<option value="${m}">${m}</option>`).join('');
                        modelSelect.value = list[0];
                        modelInput.value = list[0];
                        if (typeof showToast === 'function') showToast(`成功拉取到 ${list.length} 个可用模型`, 'success');
                    } else {
                        if (typeof showToast === 'function') showToast('未在接口返回中找到可用模型列表', 'info');
                    }
                } catch (err) {
                    if (typeof showToast === 'function') showToast('拉取模型失败: ' + err.message, 'error');
                } finally {
                    fetchModelsBtn.disabled = false;
                    fetchModelsBtn.textContent = '拉取可用模型';
                }
            };
        }

        // 3. 联网配置保存
        const searchToggle = document.getElementById('searchEnableToggle');
        const searchToggleText = document.getElementById('searchEnableText');
        const searchConfigBody = document.getElementById('searchConfigBody');
        const saveSearchBtn = document.getElementById('saveSearchConfigBtn');

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
                const provider = selectedRadio ? selectedRadio.value : 'bing_free';
                const searchObj = {
                    enabled: !!(searchToggle && searchToggle.checked),
                    provider: provider,
                    bochaKey: document.getElementById('bochaKeyInput')?.value.trim() || '',
                    metasoKey: document.getElementById('metasoKeyInput')?.value.trim() || '',
                    tavilyKey: document.getElementById('tavilyKeyInput')?.value.trim() || '',
                    maxResults: 3
                };

                try {
                    localStorage.setItem('mcyt_search_config', JSON.stringify(searchObj));
                    if (typeof persistSearchConfig === 'function') persistSearchConfig();
                    if (typeof showToast === 'function') showToast('已保存联网检索设置', 'success');
                } catch (e) {
                    if (typeof showToast === 'function') showToast('保存失败: ' + e.message, 'error');
                }
            };
        }

        // 4. 报错悬浮球交互控制
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

        // 手绘套索画板
        const lassoBtn = document.getElementById('openLassoDrawingBtn');
        if (lassoBtn && window.ErrorMonitor) {
            lassoBtn.onclick = () => {
                if (typeof window.ErrorMonitor.openLassoDrawer === 'function') {
                    window.ErrorMonitor.openLassoDrawer();
                } else {
                    if (typeof showToast === 'function') showToast('正在装载套索工具...', 'info');
                }
            };
        }

        // 导入相册自定义 PNG/GIF
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

        // 打开弹窗
        const logBtn = document.getElementById('openLogViewDirectBtn');
        if (logBtn && window.ErrorMonitor) {
            logBtn.onclick = () => window.ErrorMonitor.openLogModal();
        }

        // 清理缓存
        const cleanBtn = document.getElementById('cleanAppCacheBtn');
        if (cleanBtn) {
            cleanBtn.onclick = () => {
                if (window.ErrorMonitor) window.ErrorMonitor.clearErrors();
                if (typeof showToast === 'function') showToast('临时缓存与调试记录已深度清理', 'success');
            };
        }
    }

    // 绑定手机桌面 App 打开入口
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
