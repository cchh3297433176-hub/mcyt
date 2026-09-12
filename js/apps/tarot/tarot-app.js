/**
 * js/apps/tarot/tarot-app.js
 * ✦ 塔罗星轨中心独立 App 模块
 * 职责：桌面 4 格大组件开关与抽卡模式控制、主系统 AI 接口凭证继承与 Profiles 切换、
 *       全功能塔罗占卜神殿调度（支持自由提问与大模型深度灵性解读）。
 */

(function () {
    'use strict';

    // 默认读取主系统大模型配置
    function getSystemAIConfig() {
        // 优先读取覆盖用户自选预设（若塔罗内单独切换过 Profile）
        const overrideUrl = localStorage.getItem('tarot_ai_base_url');
        const overrideKey = localStorage.getItem('tarot_ai_api_key');
        if (overrideUrl || overrideKey) {
            return {
                baseUrl: overrideUrl || 'https://api.openai.com/v1',
                apiKey: overrideKey || '',
                model: localStorage.getItem('tarot_ai_model') || 'gpt-4o-mini'
            };
        }

        try {
            // 真实主系统存储键名为 mc_yt_ai_config（mc 和 yt 之间有下划线），
            // 兼容旧键名 mcyt_ai_config 以防万一
            const raw = localStorage.getItem('mc_yt_ai_config') || localStorage.getItem('mcyt_ai_config');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && (parsed.apiKey || parsed.baseUrl)) {
                    return {
                        baseUrl: parsed.baseUrl || 'https://api.openai.com/v1',
                        apiKey: parsed.apiKey || '',
                        model: parsed.model || 'gpt-4o-mini'
                    };
                }
            }
        } catch (_) {}

        return {
            baseUrl: 'https://api.openai.com/v1',
            apiKey: '',
            model: 'gpt-4o-mini'
        };
    }

    // 获取系统设置里已保存的所有 Profiles（真实键名 mcyt_ai_profiles，
    // 结构为 [{ name, config: { baseUrl, apiKey, model } }]）
    function getSystemSavedProfiles() {
        try {
            const raw = localStorage.getItem('mcyt_ai_profiles');
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list) && list.length) return list;
            }
        } catch (_) {}
        return [];
    }

    window.renderTarotApp = function (container) {
        if (!container) return;

        const widgetEnabled = localStorage.getItem('mcyt_widget_tarot_enabled') !== 'false';
        const widgetMode = localStorage.getItem('mcyt_widget_tarot_mode') || 'single';
        const aiConfig = getSystemAIConfig();
        const savedProfiles = getSystemSavedProfiles();

        let profileOptionsHTML = `<option value="current">当前系统主配置 (${aiConfig.model || '未设定'})</option>`;
        savedProfiles.forEach((p, idx) => {
            const pModel = (p.config && p.config.model) || '未设定';
            profileOptionsHTML += `<option value="${idx}">预设：${p.name || ('配置 ' + (idx + 1))} (${pModel})</option>`;
        });

        container.innerHTML = `
            <div style="max-width: 480px; margin: 0 auto; padding-bottom: 24px;">
                
                <!-- 卡片 1：桌面组件控制台 -->
                <div class="theme-setting-card">
                    <div class="theme-setting-title">
                        <span>🔮 桌面星轨组件</span>
                        <button class="widget-page-btn ${widgetEnabled ? 'active' : ''}" id="tarotWidgetToggleBtn">
                            ${widgetEnabled ? '已开启' : '已关闭'}
                        </button>
                    </div>
                    <div class="theme-setting-desc">
                        在桌面第一页顶部展示 4 格宽的复古星象抽卡大组件。
                    </div>

                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ffd1dc;">
                        <div style="font-size: 12px; font-weight: 600; color: #4a2f38; margin-bottom: 6px;">组件默认抽卡模式：</div>
                        <div style="display: flex; gap: 8px;">
                            <button class="widget-page-btn ${widgetMode === 'single' ? 'active' : ''}" id="tarotModeSingleBtn" style="flex:1;">
                                单张每日指引
                            </button>
                            <button class="widget-page-btn ${widgetMode === 'triple' ? 'active' : ''}" id="tarotModeTripleBtn" style="flex:1;">
                                三张时间流
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 卡片 2：AI 解读凭证联动 -->
                <div class="theme-setting-card">
                    <div class="theme-setting-title">
                        <span>✨ AI 占卜大师配置</span>
                        <span style="font-size:10px; color:var(--primary); font-weight:normal;">自动同步主游戏接口</span>
                    </div>
                    <div class="theme-setting-desc">
                        塔罗深度解读直接调用大模型直连通道，无需重复填写密钥。
                    </div>

                    <div style="margin-top: 8px;">
                        <label style="font-size: 11.5px; color: #7a505f; font-weight: 600; display:block; margin-bottom:4px;">选择已保存的 API 预设：</label>
                        <select id="tarotProfileSelect" class="custom-theme-target-dropdown" style="padding: 6px 10px; font-size: 11.5px;">
                            ${profileOptionsHTML}
                        </select>
                    </div>

                    <div style="margin-top: 10px; font-size: 11px; color: #7a505f; background: #fff8fa; padding: 8px 10px; border-radius: 8px; border: 1px solid #ffd1dc;">
                        当前生效端点：<span id="tarotActiveEndpointText" style="font-family:monospace; color:#2e1a22;">${aiConfig.baseUrl}</span><br>
                        当前生效模型：<span id="tarotActiveModelText" style="font-weight:700; color:#b82350;">${aiConfig.model}</span>
                    </div>
                </div>

                <!-- 卡片 3：全功能占卜神殿入口 -->
                <div class="theme-setting-card" style="background: linear-gradient(135deg, #2a1b15 0%, #150f0c 100%); border: 1.5px solid #d4af37; color: #fce8a6;">
                    <div style="font-size: 14px; font-weight: 700; color: #f4d06f; margin-bottom: 6px; letter-spacing: 1px;">
                        ✦ 唤醒全功能占卜神殿
                    </div>
                    <div style="font-size: 12px; color: #d6ba8d; line-height: 1.5; margin-bottom: 12px;">
                        进入沉浸式全套 78 张塔罗神殿，支持六芒星、关系牌阵、自由提问与 AI 深度对话。
                    </div>
                    <button class="tarot-gold-btn" id="btnLaunchTarotWebview" style="width: 100%; padding: 10px; font-size: 12px; font-weight: 700;">
                        ✦ 开启沉浸占卜 ✦
                    </button>
                </div>

            </div>
        `;

        // 事件绑定：开关桌面组件
        const toggleBtn = document.getElementById('tarotWidgetToggleBtn');
        if (toggleBtn) {
            toggleBtn.onclick = function () {
                const nowEnabled = localStorage.getItem('mcyt_widget_tarot_enabled') !== 'false';
                const nextState = !nowEnabled;
                localStorage.setItem('mcyt_widget_tarot_enabled', nextState.toString());
                
                if (typeof window.renderDesktopTarotWidget === 'function') {
                    window.renderDesktopTarotWidget();
                }
                window.renderTarotApp(container);
                if (typeof showToast === 'function') {
                    showToast(nextState ? '已开启桌面塔罗大组件' : '已隐藏桌面塔罗大组件');
                }
            };
        }

        // 事件绑定：切换模式
        const btnSingle = document.getElementById('tarotModeSingleBtn');
        const btnTriple = document.getElementById('tarotModeTripleBtn');
        if (btnSingle) {
            btnSingle.onclick = function () {
                localStorage.setItem('mcyt_widget_tarot_mode', 'single');
                window.renderTarotApp(container);
                if (typeof showToast === 'function') showToast('已切换为：单张每日指引模式');
            };
        }
        if (btnTriple) {
            btnTriple.onclick = function () {
                localStorage.setItem('mcyt_widget_tarot_mode', 'triple');
                window.renderTarotApp(container);
                if (typeof showToast === 'function') showToast('已切换为：三张时间流模式');
            };
        }

        // 事件绑定：切换 API 预设
        const profileSelect = document.getElementById('tarotProfileSelect');
        if (profileSelect) {
            profileSelect.onchange = function () {
                const val = profileSelect.value;
                if (val === 'current') {
                    const cfg = getSystemAIConfig();
                    document.getElementById('tarotActiveEndpointText').textContent = cfg.baseUrl;
                    document.getElementById('tarotActiveModelText').textContent = cfg.model;
                } else {
                    const idx = parseInt(val, 10);
                    const p = savedProfiles[idx];
                    const pc = p && p.config;
                    if (pc) {
                        localStorage.setItem('tarot_ai_base_url', pc.baseUrl || '');
                        localStorage.setItem('tarot_ai_api_key', pc.apiKey || '');
                        localStorage.setItem('tarot_ai_model', pc.model || '');
                        document.getElementById('tarotActiveEndpointText').textContent = pc.baseUrl || '继承主系统';
                        document.getElementById('tarotActiveModelText').textContent = pc.model || '未设定';
                        if (typeof showToast === 'function') showToast(`已切换为【${p.name || pc.model}】预设`);
                    }
                }
            };
        }

        // 事件绑定：唤醒沉浸式占卜
        const btnLaunch = document.getElementById('btnLaunchTarotWebview');
        if (btnLaunch) {
            btnLaunch.onclick = function () {
                // 打开打包进 assets 的 tarot/index.html
                window.location.href = 'tarot/index.html';
            };
        }
    };
})();
