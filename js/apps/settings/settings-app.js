// js/apps/settings/settings-app.js
// 📱 系统设置中心 App（AI大模型/多平台联网搜索/报错悬浮球定制/存储维护）
// ============================================================

(function(window) {
    'use strict';

    // 渲染系统设置主视窗
    function renderSettingsApp() {
        const body = document.getElementById('appModalBody');
        const title = document.getElementById('appModalTitle');
        if (!body) return;

        if (title) title.textContent = '系统设置';

        const orbCfg = window.ErrorMonitor ? window.ErrorMonitor.getConfig() : { enabled: true, size: 46, shape: 'circle' };
        const appVer = (typeof CURRENT_APP_VERSION !== 'undefined') ? CURRENT_APP_VERSION : '1.611';

        body.innerHTML = `
            <div class="settings-app-container" style="padding-bottom:28px;">
                
                <!-- 导航分段药丸 -->
                <div class="settings-nav-tabs" style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;padding-bottom:4px;">
                    <button class="settings-tab-btn active" data-tab="ai" style="flex:1;padding:8px 10px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;background:var(--primary);color:#fff;border:none;">🤖 AI 模型</button>
                    <button class="settings-tab-btn" data-tab="search" style="flex:1;padding:8px 10px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;background:#fff0f3;color:var(--text);border:1px solid #ffccd9;">🌐 联网搜索</button>
                    <button class="settings-tab-btn" data-tab="debug" style="flex:1;padding:8px 10px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;background:#fff0f3;color:var(--text);border:1px solid #ffccd9;">🐞 报错悬浮球</button>
                    <button class="settings-tab-btn" data-tab="system" style="flex:1;padding:8px 10px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;background:#fff0f3;color:var(--text);border:1px solid #ffccd9;">⚙️ 系统维护</button>
                </div>

                <!-- 分区分块 1：AI 模型 -->
                <div id="settingsTabContent_ai" class="settings-tab-content">
                    <div class="theme-setting-card">
                        <div class="theme-setting-title">
                            <span>🤖 大语言模型接口中枢</span>
                        </div>
                        <div class="theme-setting-desc">
                            配置 OpenAI 标准兼容协议（支持 DeepSeek、GPT-4o、Gemini、Claude 等），全站剧情与角色互动将由此驱动。
                        </div>
                        <div id="settingsAIModelMount"></div>
                    </div>
                </div>

                <!-- 分区分块 2：联网搜索 -->
                <div id="settingsTabContent_search" class="settings-tab-content" style="display:none;">
                    <div class="theme-setting-card">
                        <div class="theme-setting-title">
                            <span>🌐 实时联网检索中枢</span>
                        </div>
                        <div class="theme-setting-desc">
                            开启后生成剧情或视频时将探查真实 Minecraft 最新特性与主播资讯。
                        </div>
                        <div id="settingsSearchMount"></div>
                    </div>
                </div>

                <!-- 分区分块 3：悬浮报错球定制 -->
                <div id="settingsTabContent_debug" class="settings-tab-content" style="display:none;">
                    <div class="theme-setting-card">
                        <div class="theme-setting-title">
                            <span>🐞 运行时报错悬浮球</span>
                            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" id="orbMasterToggle" ${orbCfg.enabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);">
                                <span style="font-size:12px;font-weight:700;" id="orbToggleText">${orbCfg.enabled ? '已开启' : '已关闭'}</span>
                            </label>
                        </div>
                        <div class="theme-setting-desc">
                            在手机屏幕上展示一个高敏感度报错气泡。当发生代码异常或接口报错时，悬浮球会轻微抖动提醒，点击即可展开仿 Win98 甜心视窗，一键复制或分享诊断报告。
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
                                <div style="font-size:13px;font-weight:700;margin-bottom:8px;">悬浮球形状与样式</div>
                                <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
                                    <button class="btn-secondary orb-shape-btn ${orbCfg.shape === 'circle' ? 'active-shape' : ''}" data-shape="circle" style="padding:7px 4px;font-size:12px;">🔴 经典圆形</button>
                                    <button class="btn-secondary orb-shape-btn ${orbCfg.shape === 'squircle' ? 'active-shape' : ''}" data-shape="squircle" style="padding:7px 4px;font-size:12px;">🔲 软萌方圆</button>
                                    <button class="btn-secondary orb-shape-btn ${orbCfg.shape === 'heart' ? 'active-shape' : ''}" data-shape="heart" style="padding:7px 4px;font-size:12px;">💖 甜心爱心</button>
                                </div>
                            </div>

                            <!-- 高级外观：套索手绘与相册图片/GIF导入 -->
                            <div style="border-top:1px dashed #ffd4e0;padding-top:12px;display:flex;flex-direction:column;gap:8px;">
                                <button class="btn-secondary" id="openLassoDrawingBtn" style="width:100%;padding:9px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;">
                                    <span>🎨 随手画形状（手绘套索画板）</span>
                                </button>
                                <button class="btn-secondary" id="importCustomOrbImgBtn" style="width:100%;padding:9px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;">
                                    <span>🖼️ 从相册导入 PNG / GIF 专属动图</span>
                                </button>
                                <input type="file" id="orbImgFileInput" accept="image/png,image/gif,image/webp,image/jpeg" style="display:none;">
                            </div>
                        </div>

                        <!-- 立即查看当前报错日志 -->
                        <div style="margin-top:16px;border-top:1px dashed #ffd4e0;padding-top:12px;">
                            <button class="btn-primary" id="openLogViewDirectBtn" style="width:100%;padding:10px;font-size:13px;">
                                🐞 查看历史报错记录
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 分区分块 4：系统维护 -->
                <div id="settingsTabContent_system" class="settings-tab-content" style="display:none;">
                    <div class="theme-setting-card">
                        <div class="theme-setting-title">
                            <span>🧹 缓存与存储维护</span>
                        </div>
                        <div class="theme-setting-desc">
                            清理临时离屏 Canvas 内存碎片与调试临时状态，释放 WebView 内存。
                        </div>
                        <button class="btn-secondary" id="cleanAppCacheBtn" style="width:100%;padding:10px;font-weight:700;margin-bottom:8px;">
                            ✨ 深度清理临时缓存
                        </button>
                    </div>

                    <div class="theme-setting-card">
                        <div class="theme-setting-title">
                            <span>ℹ️ 软件与内核版本</span>
                        </div>
                        <div style="font-size:12px;color:var(--text);line-height:1.6;">
                            <div>当前应用版本：<b>v${appVer}</b></div>
                            <div>运行环境架构：<b>Android Native WebView / ES6+ 原生零依赖</b></div>
                            <div>安全门禁系统：<b>OtomeSecurityGuard v3.0</b></div>
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

        // 2. 挂载 AI 模型配置（复用并绑定 02 模块）
        const aiMount = document.getElementById('settingsAIModelMount');
        if (aiMount && typeof buildModelSettingsHTML === 'function') {
            aiMount.innerHTML = buildModelSettingsHTML('settingsApp_');
            if (typeof bindModelSettingsUI === 'function') {
                bindModelSettingsUI('settingsApp_');
            }
        }

        // 3. 挂载联网搜索配置（复用并绑定 02 模块）
        const searchMount = document.getElementById('settingsSearchMount');
        if (searchMount && typeof buildSearchSettingsHTML === 'function') {
            searchMount.innerHTML = buildSearchSettingsHTML('settingsApp_');
            if (typeof bindSearchSettingsUI === 'function') {
                bindSearchSettingsUI('settingsApp_');
            }
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
                if (typeof showToast === 'function') showToast(enabled ? '已启用报错悬浮球' : '已隐藏报错悬浮球', 'info');
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
                    if (typeof showToast === 'function') showToast('已切换形状预设', 'success', 1200);
                }
            };
        });

        // 手绘套索画板
        const lassoBtn = document.getElementById('openLassoDrawingBtn');
        if (lassoBtn && window.ErrorMonitor) {
            lassoBtn.onclick = () => {
                window.ErrorMonitor.openLassoDrawer(() => {
                    renderSettingsApp();
                    // 切换回 debug 面板
                    document.querySelector('.settings-tab-btn[data-tab="debug"]')?.click();
                });
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
                    if (typeof showToast === 'function') showToast('图片不能超过 2MB 哦', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (ev) => {
                    const base64 = ev.target.result;
                    window.ErrorMonitor.setCustomImage(base64);
                    if (typeof showToast === 'function') showToast('✅ 专属悬浮球皮肤已装载！', 'success');
                };
                reader.readAsDataURL(file);
            };
        }

        // 立即呼出 Win98 报错弹窗
        const logBtn = document.getElementById('openLogViewDirectBtn');
        if (logBtn && window.ErrorMonitor) {
            logBtn.onclick = () => window.ErrorMonitor.openLogModal();
        }

        // 清理缓存
        const cleanBtn = document.getElementById('cleanAppCacheBtn');
        if (cleanBtn) {
            cleanBtn.onclick = () => {
                if (window.ErrorMonitor) window.ErrorMonitor.clearErrors();
                if (typeof showToast === 'function') showToast('✨ 临时缓存与调试记录已深度清理完毕！', 'success');
            };
        }
    }

    // 拦截或绑定手机桌面 App 打开入口
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
