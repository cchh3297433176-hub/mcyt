/**
 * js/apps/theme/theme-app.js
 * 🎀 个性化与主题中心 App
 * 职责：主体粉白可调节自定制、状态栏三维解耦（描边勾线/填充底色/底图）、
 *       全层级统一切换至正等边三角形专业 HSV 色盘与水滴准星吸色放大镜（彻底杜绝原生丑陋选色）、
 *       桌面组件自由多页穿梭与独立开关控制、壁纸自适应裁剪、一键全站色彩重置、
 *       多配置方案管理器、免费字体网引导与扩展字体导入
 */

(function () {
    'use strict';

    let hsvState = {
        h: 61,
        s: 82,
        v: 89,
        activeDrag: null
    };

    let pendingLockBg = null;
    let pendingDesktopBg = null;
    let currentThemeMode = 'auto';
    let currentFontFormat = 'html';

    // 当前通过 HSV 色相盘调节的目标对象：
    // 'status_text' (状态栏字体/系统状态图标)
    // 'icon_label'  (桌面App标题文字)
    // 'status_fill' (状态栏填充底色)
    // 'main_pink'   (主体核心草莓粉)
    // 'main_white'  (主体纯白底色/背景)
    let currentHsvTarget = 'status_text';

    function hsvToRgb(h, s, v) {
        s = s / 100;
        v = v / 100;
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        let r = 0, g = 0, b = 0;
        if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
        else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
        else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
        else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
        else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    function rgbToHex(r, g, b) {
        return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    function hexToHsv(hex) {
        if (!hex || typeof hex !== 'string') return { h: 61, s: 82, v: 89 };
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        if (isNaN(num)) return { h: 61, s: 82, v: 89 };
        const r = (num >> 16) / 255;
        const g = ((num >> 8) & 255) / 255;
        const b = (num & 255) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        let h = 0;

        if (diff !== 0) {
            if (max === r) h = ((g - b) / diff) % 6;
            else if (max === g) h = (b - r) / diff + 2;
            else h = (r - g) / diff + 4;
            h = Math.round(h * 60);
            if (h < 0) h += 360;
        }

        const s = max === 0 ? 0 : Math.round((diff / max) * 100);
        const v = Math.round(max * 100);
        return { h, s, v };
    }

    function getCurrentTargetHex(targetKey) {
        if (targetKey === 'status_text') {
            return localStorage.getItem('mcyt_phone_custom_color') || '#ff5c8a';
        } else if (targetKey === 'icon_label') {
            return localStorage.getItem('mcyt_icon_label_color') || '#ffffff';
        } else if (targetKey === 'status_fill') {
            const fill = localStorage.getItem('mcyt_statusbar_fill');
            return (fill && fill.startsWith('#')) ? fill : '#ff5c8a';
        } else if (targetKey === 'main_pink') {
            return localStorage.getItem('mcyt_custom_main_pink') || '#ff5c8a';
        } else if (targetKey === 'main_white') {
            return localStorage.getItem('mcyt_custom_main_white') || '#ffffff';
        }
        return '#ff5c8a';
    }

    // 控制色相盘容器何时可见（默认隐藏，除非处于自定义颜色）
    function updateHsvVisibilityDom() {
        const wrap = document.getElementById('themeHsvPickerWrap');
        if (!wrap) return;
        if (currentHsvTarget === 'status_text') {
            wrap.style.display = (currentThemeMode === 'custom') ? 'block' : 'none';
        } else {
            wrap.style.display = 'block';
        }
    }

    // 直接对系统 CSS 变量进行实时响应应用
    function applyThemeModeDirect(mode) {
        const root = document.documentElement;
        if (mode === 'dark') {
            // 纯白模式（针对深色壁纸，强制白色文本与图标）
            root.style.setProperty('--status-color', '#ffffff');
            root.style.setProperty('--lock-text-color', '#ffffff');
            root.style.setProperty('--status-svg-fill', '#ffffff');
            root.style.setProperty('--star-glow-color', 'rgba(255, 255, 255, 0.9)');
            if (typeof window.applyColorTheme === 'function') window.applyColorTheme(false);
        } else if (mode === 'light') {
            // 黑巧模式（针对浅色壁纸，强制黑巧文本与图标）
            root.style.setProperty('--status-color', '#1a1a1a');
            root.style.setProperty('--lock-text-color', '#1a1a1a');
            root.style.setProperty('--status-svg-fill', '#1a1a1a');
            root.style.setProperty('--star-glow-color', 'rgba(0, 0, 0, 0.4)');
            if (typeof window.applyColorTheme === 'function') window.applyColorTheme(true);
        } else if (mode === 'auto') {
            // 自动检测明暗反色
            const currentLock = pendingLockBg || localStorage.getItem('mcyt_custom_lock_bg') || 'assets/system/default_lock.jpg';
            if (typeof window.analyzeImageLuminance === 'function') {
                window.analyzeImageLuminance(currentLock, window.applyColorTheme);
            } else if (typeof window.applyColorTheme === 'function') {
                window.applyColorTheme(false);
            }
        } else if (mode === 'custom') {
            const hex = localStorage.getItem('mcyt_phone_custom_color') || rgbToHex(hsvToRgb(hsvState.h, hsvState.s, hsvState.v).r, hsvToRgb(hsvState.h, hsvState.s, hsvState.v).g, hsvToRgb(hsvState.h, hsvState.s, hsvState.v).b);
            previewColorLive(hex);
        }
    }

    window.renderThemeApp = function (container) {
        if (!container) return;

        currentThemeMode = localStorage.getItem('mcyt_phone_theme_mode') || 'auto';
        const curHex = getCurrentTargetHex(currentHsvTarget);
        hsvState = hexToHsv(curHex);

        pendingLockBg = localStorage.getItem('mcyt_custom_lock_bg');
        pendingDesktopBg = localStorage.getItem('mcyt_custom_desktop_bg');

        const sStrokeVal = localStorage.getItem('mcyt_statusbar_stroke') || 'none';

        // 读取组件独立开关与页码
        const calEnabled = localStorage.getItem('mcyt_widget_calendar_enabled') !== 'false';
        const calPage = parseInt(localStorage.getItem('mcyt_widget_calendar_page') || '1', 10);

        const todoEnabled = localStorage.getItem('mcyt_widget_todo_enabled') !== 'false';
        const todoPage = parseInt(localStorage.getItem('mcyt_widget_todo_page') || '1', 10);

        container.innerHTML = `
            <!-- 卡片 1：壁纸设置 -->
            <div class="theme-setting-card">
                <div class="theme-setting-title">
                    <span>壁纸设置（本地相册导入）</span>
                </div>
                <div class="theme-setting-desc">
                    选取手机相册照片，导入时可按当前屏幕比例自由平移缩放裁剪。
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:6px;">
                    <input type="file" id="localLockFileInput" accept="image/*" style="display:none;" onchange="window.handleWallpaperUpload(event, 'lock')">
                    <input type="file" id="localDesktopFileInput" accept="image/*" style="display:none;" onchange="window.handleWallpaperUpload(event, 'desktop')">

                    <div style="display:flex;gap:8px;">
                        <button class="btn-secondary" style="flex:1;" onclick="document.getElementById('localLockFileInput').click()">
                            选取锁屏壁纸
                        </button>
                        <button class="btn-secondary" style="flex:1;" onclick="document.getElementById('localDesktopFileInput').click()">
                            选取桌面壁纸
                        </button>
                    </div>

                    <div id="wallpaperStatusTip" style="font-size:11.5px;color:var(--text2);text-align:center;margin:4px 0 2px 0;">
                        ${pendingLockBg || pendingDesktopBg ? '已载入自定义壁纸' : '当前使用默认壁纸'}
                    </div>

                    <div style="display:flex;gap:8px;">
                        <button class="btn-primary" style="flex:2;" onclick="window.confirmSaveWallpapersOnly()">
                            保存当前壁纸
                        </button>
                        <button class="btn-secondary" style="flex:1;" onclick="window.restoreDefaultWallpapersOnly()">
                            恢复默认
                        </button>
                    </div>
                </div>
            </div>

            <!-- 卡片 2：色彩与状态栏全局专业定制（全线统一切换至 HSV 色盘） -->
            <div class="theme-setting-card">
                <div class="theme-setting-title">
                    <span>主题全层级色彩与状态栏定制</span>
                </div>
                <div class="theme-setting-desc">
                    下拉选择想要调节的目标，全线接入正等边专业 HSV 色相盘与水滴吸色准星。
                </div>

                <div style="margin-bottom:12px;">
                    <label style="font-size:11.5px;font-weight:700;color:var(--text2);display:block;margin-bottom:4px;">色盘当前调控目标：</label>
                    <select id="themeHsvTargetSelect" style="width:100%;padding:8px 10px;border-radius:10px;border:1px solid #ffd1dc;background:#fff8fa;font-size:12.5px;font-weight:600;color:var(--text);outline:none;" onchange="window.onHsvTargetChange(this.value)">
                        <option value="status_text" ${currentHsvTarget === 'status_text' ? 'selected' : ''}>字体与状态栏指示颜色</option>
                        <option value="icon_label" ${currentHsvTarget === 'icon_label' ? 'selected' : ''}>桌面 App 标题文字颜色</option>
                        <option value="status_fill" ${currentHsvTarget === 'status_fill' ? 'selected' : ''}>状态栏填充底色</option>
                        <option value="main_pink" ${currentHsvTarget === 'main_pink' ? 'selected' : ''}>主体核心色彩（草莓粉区）</option>
                        <option value="main_white" ${currentHsvTarget === 'main_white' ? 'selected' : ''}>主体纯白背景（纯白区）</option>
                    </select>
                </div>

                <div id="statusBarExtraControls" style="display:${currentHsvTarget === 'status_fill' ? 'block' : 'none'};margin-bottom:12px;background:#fff8fa;padding:10px;border-radius:12px;border:1px solid #ffeef2;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                        <span style="font-size:11.5px;font-weight:600;color:var(--text);">状态栏底部分割描边：</span>
                        <select id="statusBarStrokeSelect" style="padding:3px 6px;border-radius:6px;border:1px solid #ffd1dc;font-size:11px;" onchange="window.updateStatusBarStroke(this.value)">
                            <option value="none" ${sStrokeVal === 'none' ? 'selected' : ''}>无描边</option>
                            <option value="1px solid rgba(255, 92, 138, 0.35)" ${sStrokeVal.includes('255, 92, 138') ? 'selected' : ''}>柔粉描边</option>
                            <option value="1px solid rgba(255, 255, 255, 0.45)" ${sStrokeVal.includes('255, 255, 255') ? 'selected' : ''}>纯白描边</option>
                            <option value="1px solid rgba(0, 0, 0, 0.18)" ${sStrokeVal.includes('0, 0, 0') ? 'selected' : ''}>黑巧深色描边</option>
                        </select>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <span style="font-size:11.5px;font-weight:600;color:var(--text);">专属底图或快捷透明：</span>
                        <input type="file" id="statusBarBgFileInput" accept="image/*" style="display:none;" onchange="window.handleStatusBarBgUpload(event)">
                        <div style="display:flex;gap:4px;">
                            <button class="btn-secondary" style="padding:2px 6px;font-size:10.5px;" onclick="window.updateStatusBarFill('transparent')">完全透明</button>
                            <button class="btn-secondary" style="padding:2px 6px;font-size:10.5px;" onclick="document.getElementById('statusBarBgFileInput').click()">导入底图</button>
                            <button class="btn-secondary" style="padding:2px 6px;font-size:10.5px;color:#c92a2a;" onclick="window.clearStatusBarBg()">清图</button>
                        </div>
                    </div>
                </div>

                <div id="statusModeRadioWrap" style="display:${currentHsvTarget === 'status_text' ? 'block' : 'none'};margin-bottom:12px;">
                    <div class="theme-pointer-group">
                        <div class="theme-pointer-item" onclick="window.onThemeModeRadioChange('auto')">
                            <input type="radio" name="themeModeRadio" id="modeAuto" value="auto" ${currentThemeMode === 'auto' ? 'checked' : ''}>
                            <label for="modeAuto">自动识别壁纸明暗反色</label>
                        </div>
                        <div class="theme-pointer-item" onclick="window.onThemeModeRadioChange('dark')">
                            <input type="radio" name="themeModeRadio" id="modeDark" value="dark" ${currentThemeMode === 'dark' ? 'checked' : ''}>
                            <label for="modeDark">默认纯白质感（强制纯白）</label>
                        </div>
                        <div class="theme-pointer-item" onclick="window.onThemeModeRadioChange('light')">
                            <input type="radio" name="themeModeRadio" id="modeLight" value="light" ${currentThemeMode === 'light' ? 'checked' : ''}>
                            <label for="modeLight">默认黑巧质感（强制深黑）</label>
                        </div>
                        <div class="theme-pointer-item" onclick="window.onThemeModeRadioChange('custom')">
                            <input type="radio" name="themeModeRadio" id="modeCustom" value="custom" ${currentThemeMode === 'custom' ? 'checked' : ''}>
                            <label for="modeCustom">自定义固定颜色（色盘调配）</label>
                        </div>
                    </div>
                </div>

                <!-- 专业深灰底板正等边 HSV 色盘与水滴放大镜（根据模式默认隐藏） -->
                <div id="themeHsvPickerWrap" style="margin-top:6px;display:${(currentHsvTarget === 'status_text' && currentThemeMode !== 'custom') ? 'none' : 'block'};">
                    <div class="hsv-pixel-perfect-plate" style="background:#2b2b2b;border-radius:20px;padding:18px 16px;box-shadow:inset 0 2px 8px rgba(0,0,0,0.5), 0 6px 18px rgba(0,0,0,0.25);width:100%;max-width:320px;margin:0 auto;box-sizing:border-box;">
                        
                        <div class="hsv-wheel-box" id="hsvWheelBox" style="width:230px;height:230px;margin:0 auto 12px auto;position:relative;user-select:none;touch-action:none;">
                            <canvas id="hsvWheelCanvas" class="hsv-wheel-canvas" width="460" height="460" style="width:100%;height:100%;border-radius:50%;display:block;"></canvas>
                            <div class="hsv-ring-handle" id="hsvRingHandle" style="position:absolute;width:24px;height:24px;border:3px solid #ffffff;border-radius:50%;box-shadow:0 0 5px rgba(0,0,0,0.6);transform:translate(-50%,-50%);pointer-events:none;box-sizing:border-box;"></div>
                            <div class="hsv-triangle-handle" id="hsvTriangleHandle" style="position:absolute;width:20px;height:20px;border:3px solid #ffffff;border-radius:50%;box-shadow:0 0 5px rgba(0,0,0,0.6);transform:translate(-50%,-50%);pointer-events:none;box-sizing:border-box;"></div>
                        </div>

                        <div style="display:flex;justify-content:space-between;align-items:center;padding:0 8px 12px 8px;">
                            <div id="currentHexBadge" style="font-size:12px;font-family:monospace;color:#fff;background:rgba(255,255,255,0.15);padding:3px 8px;border-radius:6px;">
                                ${curHex.toUpperCase()}
                            </div>
                            <input type="file" id="pipetteImageInput" accept="image/*" style="display:none;" onchange="window.handlePipetteImageSelected(event)">
                            <div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick="document.getElementById('pipetteImageInput').click()" title="从相册图片精准吸色">
                                <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:#d0d0d0;stroke-width:1.8;">
                                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                                    <path d="M12 11v4" stroke-linecap="round"></path>
                                    <path d="M10 13h4" stroke-linecap="round"></path>
                                </svg>
                            </div>
                        </div>

                        <div style="display:flex;flex-direction:column;gap:12px;padding:0 6px;">
                            <div style="display:flex;align-items:center;gap:12px;">
                                <span style="font-size:13px;font-family:serif;color:#a0a0a0;width:12px;font-weight:bold;">H</span>
                                <div style="flex:1;position:relative;display:flex;align-items:center;">
                                    <input type="range" id="sliderH" min="0" max="360" value="${hsvState.h}" style="width:100%;height:6px;border-radius:3px;appearance:none;-webkit-appearance:none;outline:none;background:linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);">
                                </div>
                                <span id="textValH" style="font-size:13px;color:#a0a0a0;width:24px;text-align:right;font-family:monospace;">${hsvState.h}</span>
                            </div>

                            <div style="display:flex;align-items:center;gap:12px;">
                                <span style="font-size:13px;font-family:serif;color:#a0a0a0;width:12px;font-weight:bold;">S</span>
                                <div style="flex:1;position:relative;display:flex;align-items:center;">
                                    <input type="range" id="sliderS" min="0" max="100" value="${hsvState.s}" style="width:100%;height:6px;border-radius:3px;appearance:none;-webkit-appearance:none;outline:none;" id="sliderSTrack">
                                </div>
                                <span id="textValS" style="font-size:13px;color:#a0a0a0;width:24px;text-align:right;font-family:monospace;">${hsvState.s}</span>
                            </div>

                            <div style="display:flex;align-items:center;gap:12px;">
                                <span style="font-size:13px;font-family:serif;color:#a0a0a0;width:12px;font-weight:bold;">V</span>
                                <div style="flex:1;position:relative;display:flex;align-items:center;">
                                    <input type="range" id="sliderV" min="0" max="100" value="${hsvState.v}" style="width:100%;height:6px;border-radius:3px;appearance:none;-webkit-appearance:none;outline:none;" id="sliderVTrack">
                                </div>
                                <span id="textValV" style="font-size:13px;color:#a0a0a0;width:24px;text-align:right;font-family:monospace;">${hsvState.v}</span>
                            </div>
                        </div>

                    </div>
                </div>

                <div class="theme-action-bar" style="margin-top:14px;flex-direction:column;gap:8px;">
                    <button class="btn-primary" style="width:100%;" onclick="window.saveAndApplyColorThemeOnly()">
                        保存并应用当前色彩配置
                    </button>
                    <button class="btn-secondary" style="width:100%;font-size:12px;" onclick="window.restoreAllDefaultColors()">
                        ✨ 一键恢复全站默认主题色彩
                    </button>
                </div>
            </div>

            <!-- 🌟 卡片 3：桌面组件多页自由系统（默认折叠 + 精巧矮版选页按钮） -->
            <div class="theme-setting-card">
                <div class="theme-collapsible-header" onclick="window.toggleWidgetsSettingsCollapse()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                    <div class="theme-setting-title" style="margin-bottom:0;">
                        <span>桌面小组件与位置分配</span>
                    </div>
                    <span class="theme-collapsible-arrow" id="widgetsCollapseArrow" style="font-size:12px;color:var(--primary);font-weight:bold;">▶ 展开</span>
                </div>

                <div id="widgetsSettingsBody" style="display:none;margin-top:12px;">
                    <div class="theme-setting-desc">
                        自由决定每个小组件是否显示、以及挂载在桌面第 1 页还是第 2 页。
                    </div>

                    <div style="display:flex;flex-direction:column;gap:10px;">
                        <!-- 组件 A：极简黑白日历 -->
                        <div style="background:#fff8fa;padding:10px;border-radius:12px;border:1px solid #ffeef2;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                <span style="font-size:12.5px;font-weight:700;color:var(--text);">📅 极简黑白月历</span>
                                <button class="btn-secondary" style="padding:2px 8px;font-size:11px;${calEnabled ? 'color:var(--primary);font-weight:bold;' : 'color:#999;'}" onclick="window.toggleWidgetEnabled('calendar')">
                                    ${calEnabled ? '● 已开启' : '○ 已关闭'}
                                </button>
                            </div>
                            <div style="display:flex;align-items:center;justify-content:space-between;">
                                <span style="font-size:11px;color:var(--text2);">显示页面：</span>
                                <div style="display:flex;gap:6px;align-items:center;">
                                    <button class="widget-page-btn ${calPage === 1 ? 'active' : ''}" onclick="window.setWidgetPage('calendar', 1)">第 1 页</button>
                                    <button class="widget-page-btn ${calPage === 2 ? 'active' : ''}" onclick="window.setWidgetPage('calendar', 2)">第 2 页</button>
                                </div>
                            </div>
                        </div>

                        <!-- 组件 B：温暖米白待办便签 -->
                        <div style="background:#fff8fa;padding:10px;border-radius:12px;border:1px solid #ffeef2;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                <span style="font-size:12.5px;font-weight:700;color:var(--text);">📝 米白待办便签</span>
                                <button class="btn-secondary" style="padding:2px 8px;font-size:11px;${todoEnabled ? 'color:var(--primary);font-weight:bold;' : 'color:#999;'}" onclick="window.toggleWidgetEnabled('todo')">
                                    ${todoEnabled ? '● 已开启' : '○ 已关闭'}
                                </button>
                            </div>
                            <div style="display:flex;align-items:center;justify-content:space-between;">
                                <span style="font-size:11px;color:var(--text2);">显示页面：</span>
                                <div style="display:flex;gap:6px;align-items:center;">
                                    <button class="widget-page-btn ${todoPage === 1 ? 'active' : ''}" onclick="window.setWidgetPage('todo', 1)">第 1 页</button>
                                    <button class="widget-page-btn ${todoPage === 2 ? 'active' : ''}" onclick="window.setWidgetPage('todo', 2)">第 2 页</button>
                                </div>
                            </div>
                        </div>

                        <!-- 待办快捷动作 -->
                        <div style="display:flex;gap:8px;margin-top:2px;">
                            <button class="btn-secondary" style="flex:1;font-size:11.5px;" onclick="if(typeof window.generateSmartDayTodos==='function')window.generateSmartDayTodos();">
                                ✨ 智能生成一日待办
                            </button>
                            <button class="btn-secondary" style="flex:1;font-size:11.5px;" onclick="if(typeof window.promptAddTodoItem==='function')window.promptAddTodoItem();">
                                ＋ 新增一条待办
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 卡片 4：字体库与多格式扩展 -->
            <div class="theme-setting-card">
                <div class="theme-collapsible-header" onclick="window.toggleFontLibraryCollapse()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                    <div class="theme-setting-title" style="margin-bottom:0;">
                        <span>字体库与扩展导入</span>
                    </div>
                    <span class="theme-collapsible-arrow" id="fontCollapseArrow" style="font-size:12px;color:var(--primary);">▶ 展开</span>
                </div>

                <div id="fontLibraryBody" style="display:none;margin-top:12px;">
                    
                    <div style="background:#f4f9fd;border:1px solid #d0e7fa;border-radius:10px;padding:8px 12px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
                        <div style="display:flex;flex-direction:column;">
                            <span style="font-size:12px;font-weight:700;color:#1864ab;">🔤 免费商业字体大全</span>
                            <span style="font-size:10.5px;color:#495057;">开源可商用无版权字体网站（fonts.zeoseven.com）</span>
                        </div>
                        <a href="https://fonts.zeoseven.com/" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                            <button class="btn-secondary" style="padding:4px 10px;font-size:11px;background:#e7f5ff;border-color:#a5d8ff;color:#1971c2;">
                                访问网站 ↗
                            </button>
                        </a>
                    </div>

                    <div class="theme-setting-desc">
                        选择对应的导入格式。导入成功后，整部手机界面字体将即刻全面生效！
                    </div>

                    <div style="display:flex;gap:6px;margin-bottom:10px;">
                        <button class="btn-secondary font-fmt-btn ${currentFontFormat === 'html' ? 'btn-primary' : ''}" id="btnFmtHtml" style="flex:1;padding:6px;font-size:11px;" onclick="window.switchFontFormat('html')">HTML 标签外链</button>
                        <button class="btn-secondary font-fmt-btn ${currentFontFormat === 'css' ? 'btn-primary' : ''}" id="btnFmtCss" style="flex:1;padding:6px;font-size:11px;" onclick="window.switchFontFormat('css')">CSS 代码片段</button>
                        <button class="btn-secondary font-fmt-btn ${currentFontFormat === 'local' ? 'btn-primary' : ''}" id="btnFmtLocal" style="flex:1;padding:6px;font-size:11px;" onclick="window.switchFontFormat('local')">本地字体文件</button>
                    </div>

                    <div id="fontInputSection_html" style="display:${currentFontFormat === 'html' ? 'block' : 'none'};">
                        <input type="text" id="fontRemarkInput_html" placeholder="字体名称备注（如：长坂点宋体）" style="width:100%;margin-bottom:6px;padding:8px 10px;border-radius:8px;border:1px solid #ffd1dc;font-size:12px;outline:none;">
                        <textarea id="fontCodeInput_html" placeholder="粘贴完整的 HTML 代码，如：&#10;<link href='...' rel='stylesheet'>&#10;<style>body { font-family: '...'; }</style>" style="width:100%;min-height:75px;padding:8px 10px;border-radius:8px;border:1px solid #ffd1dc;font-size:11px;outline:none;resize:none;font-family:monospace;"></textarea>
                        <button class="btn-primary" style="width:100%;margin-top:8px;" onclick="window.handleUnifiedFontImport('html')">导入并强制全局应用</button>
                    </div>

                    <div id="fontInputSection_css" style="display:${currentFontFormat === 'css' ? 'block' : 'none'};">
                        <input type="text" id="fontRemarkInput_css" placeholder="字体名称备注（如：像素甜心）" style="width:100%;margin-bottom:6px;padding:8px 10px;border-radius:8px;border:1px solid #ffd1dc;font-size:12px;outline:none;">
                        <textarea id="fontCodeInput_css" placeholder="粘贴 CSS 代码，如：&#10;@import url('...');&#10;body { font-family: 'MyFont'; }" style="width:100%;min-height:75px;padding:8px 10px;border-radius:8px;border:1px solid #ffd1dc;font-size:11px;outline:none;resize:none;font-family:monospace;"></textarea>
                        <button class="btn-primary" style="width:100%;margin-top:8px;" onclick="window.handleUnifiedFontImport('css')">导入并强制全局应用</button>
                    </div>

                    <div id="fontInputSection_local" style="display:${currentFontFormat === 'local' ? 'block' : 'none'};">
                        <input type="file" id="themeFontFileInput" accept=".ttf,.otf,.woff,.woff2" style="display:none;" onchange="window.handleThemeFontUpload(event)">
                        <button class="btn-secondary" style="width:100%;padding:10px;" onclick="document.getElementById('themeFontFileInput').click()">
                            选取本地字体文件 (.ttf / .otf / .woff)
                        </button>
                    </div>

                    <div id="installedFontsList" style="margin-top:14px;display:flex;flex-direction:column;gap:6px;"></div>
                </div>
            </div>

            <!-- 卡片 5：主题方案管理器 -->
            <div class="theme-setting-card">
                <div class="theme-setting-title">
                    <span>主题配置方案</span>
                    <button class="btn-secondary" style="padding:3px 8px;font-size:11px;" onclick="window.promptSaveNewProfile()">
                        新建方案
                    </button>
                </div>
                <div class="theme-setting-desc">
                    保存当前的壁纸、色彩与字体配置，随时自由切换。
                </div>
                <div class="profile-chip-list" id="themeProfileList"></div>
            </div>
        `;

        initHsvCanvasPicker();
        renderProfileChips();
        renderInstalledFontsList();
    };

    // 折叠/展开小组件设置面板
    window.toggleWidgetsSettingsCollapse = function () {
        const body = document.getElementById('widgetsSettingsBody');
        const arrow = document.getElementById('widgetsCollapseArrow');
        if (!body || !arrow) return;
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
        arrow.textContent = isHidden ? '▼ 收起' : '▶ 展开';
    };

    // 组件开关与位置切换核心
    window.toggleWidgetEnabled = function (widgetKey) {
        const storageKey = `mcyt_widget_${widgetKey}_enabled`;
        const current = localStorage.getItem(storageKey) !== 'false';
        localStorage.setItem(storageKey, (!current).toString());

        if (typeof window.renderDesktopWidgetsLayout === 'function') {
            window.renderDesktopWidgetsLayout();
        }

        const appModalBody = document.getElementById('appModalBody');
        if (appModalBody) {
            window.renderThemeApp(appModalBody);
            // 保持展开状态
            const b = document.getElementById('widgetsSettingsBody');
            const a = document.getElementById('widgetsCollapseArrow');
            if (b && a) { b.style.display = 'block'; a.textContent = '▼ 收起'; }
        }

        if (typeof showToast === 'function') {
            showToast(`${widgetKey === 'calendar' ? '日历组件' : '待办便签'}已${!current ? '开启' : '关闭'}`);
        }
    };

    window.setWidgetPage = function (widgetKey, targetPage) {
        const storageKey = `mcyt_widget_${widgetKey}_page`;
        localStorage.setItem(storageKey, targetPage.toString());

        if (typeof window.renderDesktopWidgetsLayout === 'function') {
            window.renderDesktopWidgetsLayout();
        }

        const appModalBody = document.getElementById('appModalBody');
        if (appModalBody) {
            window.renderThemeApp(appModalBody);
            // 保持展开状态
            const b = document.getElementById('widgetsSettingsBody');
            const a = document.getElementById('widgetsCollapseArrow');
            if (b && a) { b.style.display = 'block'; a.textContent = '▼ 收起'; }
        }

        if (typeof showToast === 'function') {
            showToast(`已将${widgetKey === 'calendar' ? '日历组件' : '待办便签'}移至第 ${targetPage} 页`);
        }
    };

    // 切换当前色盘调谐目标
    window.onHsvTargetChange = function (newTarget) {
        currentHsvTarget = newTarget;

        const extraControls = document.getElementById('statusBarExtraControls');
        if (extraControls) {
            extraControls.style.display = (newTarget === 'status_fill') ? 'block' : 'none';
        }

        const modeRadioWrap = document.getElementById('statusModeRadioWrap');
        if (modeRadioWrap) {
            modeRadioWrap.style.display = (newTarget === 'status_text') ? 'block' : 'none';
        }

        const targetHex = getCurrentTargetHex(newTarget);
        hsvState = hexToHsv(targetHex);

        const badge = document.getElementById('currentHexBadge');
        if (badge) badge.textContent = targetHex.toUpperCase();

        updateHsvVisibilityDom();
        if (window.refreshHsvWheelCanvas) window.refreshHsvWheelCanvas();
    };

    // 状态栏边框与填充
    window.updateStatusBarStroke = function (val) {
        localStorage.setItem('mcyt_statusbar_stroke', val);
        document.documentElement.style.setProperty('--status-bar-stroke', val);
    };

    window.updateStatusBarFill = function (val) {
        localStorage.setItem('mcyt_statusbar_fill', val);
        document.documentElement.style.setProperty('--status-bar-fill', val);
        if (typeof showToast === 'function') showToast('状态栏已设为完全透明');
    };

    window.handleStatusBarBgUpload = function (event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            const base64 = e.target.result;
            localStorage.setItem('mcyt_statusbar_bg_img', base64);
            document.documentElement.style.setProperty('--status-bar-bg-img', `url('${base64}')`);
            if (typeof showToast === 'function') showToast('已成功应用状态栏背景底图');
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    window.clearStatusBarBg = function () {
        localStorage.removeItem('mcyt_statusbar_bg_img');
        document.documentElement.style.setProperty('--status-bar-bg-img', 'none');
        if (typeof showToast === 'function') showToast('已清除状态栏底图');
    };

    // 一键恢复全站默认主题色彩
    window.restoreAllDefaultColors = function () {
        localStorage.removeItem('mcyt_phone_theme_mode');
        localStorage.removeItem('mcyt_phone_custom_color');
        localStorage.removeItem('mcyt_icon_label_color');
        localStorage.removeItem('mcyt_statusbar_stroke');
        localStorage.removeItem('mcyt_statusbar_fill');
        localStorage.removeItem('mcyt_statusbar_bg_img');
        localStorage.removeItem('mcyt_custom_main_pink');
        localStorage.removeItem('mcyt_custom_main_white');

        const root = document.documentElement;
        root.style.setProperty('--theme-main-pink', '#ff5c8a');
        root.style.setProperty('--theme-main-white', '#ffffff');
        root.style.setProperty('--theme-sub-white', '#fff5f7');
        root.style.setProperty('--app-icon-label-color', '#ffffff');
        root.style.setProperty('--status-bar-stroke', 'none');
        root.style.setProperty('--status-bar-fill', 'transparent');
        root.style.setProperty('--status-bar-bg-img', 'none');

        currentThemeMode = 'auto';
        applyThemeModeDirect('auto');

        const appModalBody = document.getElementById('appModalBody');
        if (appModalBody) window.renderThemeApp(appModalBody);

        if (typeof showToast === 'function') showToast('已一键恢复全站默认配色！');
    };

    window.onThemeModeRadioChange = function (mode) {
        currentThemeMode = mode;
        localStorage.setItem('mcyt_phone_theme_mode', mode);
        const radios = document.querySelectorAll('input[name="themeModeRadio"]');
        radios.forEach(r => { r.checked = (r.value === mode); });

        // 即刻根据模式生效色彩
        applyThemeModeDirect(mode);

        // 仅在自定义模式下才展现色盘
        updateHsvVisibilityDom();
    };

    function previewColorLive(hex) {
        const root = document.documentElement;
        const badge = document.getElementById('currentHexBadge');
        if (badge) badge.textContent = hex.toUpperCase();

        if (currentHsvTarget === 'status_text') {
            root.style.setProperty('--status-color', hex);
            root.style.setProperty('--lock-text-color', hex);
            root.style.setProperty('--status-svg-fill', hex);
            root.style.setProperty('--star-glow-color', hex);
        } else if (currentHsvTarget === 'icon_label') {
            root.style.setProperty('--app-icon-label-color', hex);
        } else if (currentHsvTarget === 'status_fill') {
            root.style.setProperty('--status-bar-fill', hex);
        } else if (currentHsvTarget === 'main_pink') {
            root.style.setProperty('--theme-main-pink', hex);
        } else if (currentHsvTarget === 'main_white') {
            root.style.setProperty('--theme-main-white', hex);
            root.style.setProperty('--theme-sub-white', hex);
        }
    }

    window.saveAndApplyColorThemeOnly = function () {
        const curRgb = hsvToRgb(hsvState.h, hsvState.s, hsvState.v);
        const hex = rgbToHex(curRgb.r, curRgb.g, curRgb.b);

        if (currentHsvTarget === 'status_text') {
            localStorage.setItem('mcyt_phone_theme_mode', currentThemeMode);
            if (currentThemeMode === 'custom') {
                localStorage.setItem('mcyt_phone_custom_color', hex);
            }
            applyThemeModeDirect(currentThemeMode);
        } else if (currentHsvTarget === 'icon_label') {
            localStorage.setItem('mcyt_icon_label_color', hex);
        } else if (currentHsvTarget === 'status_fill') {
            localStorage.setItem('mcyt_statusbar_fill', hex);
        } else if (currentHsvTarget === 'main_pink') {
            localStorage.setItem('mcyt_custom_main_pink', hex);
        } else if (currentHsvTarget === 'main_white') {
            localStorage.setItem('mcyt_custom_main_white', hex);
        }

        if (typeof showToast === 'function') showToast(`[${document.getElementById('themeHsvTargetSelect').selectedOptions[0].text}] 色彩已永久保存！`);
    };

    // 正等边三角形 HSV 拾色器绘制
    function initHsvCanvasPicker() {
        const box = document.getElementById('hsvWheelBox');
        const canvas = document.getElementById('hsvWheelCanvas');
        const rHandle = document.getElementById('hsvRingHandle');
        const tHandle = document.getElementById('hsvTriangleHandle');
        if (!box || !canvas || !rHandle || !tHandle) return;

        const ctx = canvas.getContext('2d');
        const size = 460;
        const center = size / 2;
        const outerR = size / 2 - 8;
        const innerR = outerR - 36;
        const triR = innerR - 8;

        function getEquilateralTriangleVertices() {
            const cos30 = Math.cos(Math.PI / 6);
            const sin30 = Math.sin(Math.PI / 6);
            return {
                top: { x: center - triR * cos30, y: center - triR * sin30 },
                bottom: { x: center - triR * cos30, y: center + triR * sin30 },
                right: { x: center + triR, y: center }
            };
        }

        function renderColorWheel() {
            ctx.clearRect(0, 0, size, size);

            const step = 0.5;
            for (let deg = 0; deg < 360; deg += step) {
                const radStart = (deg - 90) * Math.PI / 180;
                const radEnd = (deg + step - 90) * Math.PI / 180;
                ctx.beginPath();
                ctx.arc(center, center, outerR, radStart, radEnd, false);
                ctx.arc(center, center, innerR, radEnd, radStart, true);
                ctx.closePath();
                const rgb = hsvToRgb(deg, 100, 100);
                ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
                ctx.fill();
            }

            const v = getEquilateralTriangleVertices();

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(v.top.x, v.top.y);
            ctx.lineTo(v.right.x, v.right.y);
            ctx.lineTo(v.bottom.x, v.bottom.y);
            ctx.closePath();
            ctx.clip();

            const pureRgb = hsvToRgb(hsvState.h, 100, 100);
            const horizGrad = ctx.createLinearGradient(v.top.x, center, v.right.x, center);
            horizGrad.addColorStop(0, '#ffffff');
            horizGrad.addColorStop(1, `rgb(${pureRgb.r},${pureRgb.g},${pureRgb.b})`);
            ctx.fillStyle = horizGrad;
            ctx.fillRect(0, 0, size, size);

            const vertGrad = ctx.createLinearGradient(center, v.top.y, center, v.bottom.y);
            vertGrad.addColorStop(0, 'rgba(0,0,0,0)');
            vertGrad.addColorStop(1, '#000000');
            ctx.fillStyle = vertGrad;
            ctx.fillRect(0, 0, size, size);

            ctx.restore();

            updateHandlesAndSliders();
        }

        function updateHandlesAndSliders() {
            const boxRect = box.getBoundingClientRect();
            const scale = (boxRect.width || 230) / size;

            const rad = (hsvState.h - 90) * Math.PI / 180;
            const ringMidR = (outerR + innerR) / 2;
            const ringX = (center + ringMidR * Math.cos(rad)) * scale;
            const ringY = (center + ringMidR * Math.sin(rad)) * scale;
            rHandle.style.left = `${ringX}px`;
            rHandle.style.top = `${ringY}px`;
            const pureRgb = hsvToRgb(hsvState.h, 100, 100);
            rHandle.style.backgroundColor = `rgb(${pureRgb.r},${pureRgb.g},${pureRgb.b})`;

            const v = getEquilateralTriangleVertices();
            const sat = hsvState.s / 100;
            const val = hsvState.v / 100;

            const leftX = v.top.x;
            const rightX = v.right.x;
            const x = leftX + (rightX - leftX) * sat * val;

            const curTopY = v.top.y + (v.right.y - v.top.y) * sat;
            const curBotY = v.bottom.y + (v.right.y - v.bottom.y) * sat;
            const y = curTopY + (curBotY - curTopY) * (1 - val);

            tHandle.style.left = `${x * scale}px`;
            tHandle.style.top = `${y * scale}px`;
            const curRgb = hsvToRgb(hsvState.h, hsvState.s, hsvState.v);
            tHandle.style.backgroundColor = `rgb(${curRgb.r},${curRgb.g},${curRgb.b})`;

            const sH = document.getElementById('sliderH');
            const sS = document.getElementById('sliderS');
            const sV = document.getElementById('sliderV');
            const txtH = document.getElementById('textValH');
            const txtS = document.getElementById('textValS');
            const txtV = document.getElementById('textValV');

            if (sH) sH.value = hsvState.h;
            if (sS) {
                sS.value = hsvState.s;
                sS.style.background = `linear-gradient(to right, #ffffff, rgb(${pureRgb.r},${pureRgb.g},${pureRgb.b}))`;
            }
            if (sV) {
                sV.value = hsvState.v;
                sV.style.background = `linear-gradient(to right, #000000, rgb(${pureRgb.r},${pureRgb.g},${pureRgb.b}))`;
            }

            if (txtH) txtH.textContent = hsvState.h;
            if (txtS) txtS.textContent = hsvState.s;
            if (txtV) txtV.textContent = hsvState.v;

            const hex = rgbToHex(curRgb.r, curRgb.g, curRgb.b);
            previewColorLive(hex);
        }

        function onPointerDown(e) {
            const rect = box.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const scale = size / rect.width;
            const px = (clientX - rect.left) * scale;
            const py = (clientY - rect.top) * scale;

            const dx = px - center;
            const dy = py - center;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist >= innerR - 10 && dist <= outerR + 10) {
                hsvState.activeDrag = 'ring';
                updateRingFromPoint(dx, dy);
            } else {
                hsvState.activeDrag = 'triangle';
                updateTriangleFromPoint(px, py);
            }
        }

        function onPointerMove(e) {
            if (!hsvState.activeDrag) return;
            const rect = box.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const scale = size / rect.width;
            const px = (clientX - rect.left) * scale;
            const py = (clientY - rect.top) * scale;

            if (hsvState.activeDrag === 'ring') {
                updateRingFromPoint(px - center, py - center);
            } else if (hsvState.activeDrag === 'triangle') {
                updateTriangleFromPoint(px, py);
            }
        }

        function onPointerUp() {
            hsvState.activeDrag = null;
        }

        function updateRingFromPoint(dx, dy) {
            let angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
            if (angle < 0) angle += 360;
            hsvState.h = Math.round(angle) % 360;
            renderColorWheel();
        }

        function updateTriangleFromPoint(px, py) {
            const v = getEquilateralTriangleVertices();
            let satRatio = (px - v.top.x) / (v.right.x - v.top.x);
            satRatio = Math.max(0, Math.min(1, satRatio));

            const curTopY = v.top.y + (v.right.y - v.top.y) * satRatio;
            const curBotY = v.bottom.y + (v.right.y - v.bottom.y) * satRatio;
            let valRatio = 1 - ((py - curTopY) / (curBotY - curTopY || 1));
            valRatio = Math.max(0, Math.min(1, valRatio));

            hsvState.s = Math.round(satRatio * 100);
            hsvState.v = Math.round(valRatio * 100);
            updateHandlesAndSliders();
        }

        box.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);

        box.addEventListener('touchstart', onPointerDown, { passive: true });
        window.addEventListener('touchmove', onPointerMove, { passive: true });
        window.addEventListener('touchend', onPointerUp, { passive: true });

        const sH = document.getElementById('sliderH');
        const sS = document.getElementById('sliderS');
        const sV = document.getElementById('sliderV');
        if (sH) sH.addEventListener('input', (e) => { hsvState.h = parseInt(e.target.value) || 0; renderColorWheel(); });
        if (sS) sS.addEventListener('input', (e) => { hsvState.s = parseInt(e.target.value) || 0; updateHandlesAndSliders(); });
        if (sV) sV.addEventListener('input', (e) => { hsvState.v = parseInt(e.target.value) || 0; updateHandlesAndSliders(); });

        window.refreshHsvWheelCanvas = renderColorWheel;
        renderColorWheel();
    }

    // 水滴吸色放大镜
    window.handlePipetteImageSelected = function (event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                openPipetteLoupeModal(img);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    function openPipetteLoupeModal(loadedImg) {
        let overlay = document.getElementById('pipetteOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'pipetteOverlay';
            overlay.className = 'pipette-overlay';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div style="color:#ffffff;font-size:13px;font-weight:600;margin-bottom:8px;text-align:center;">
                双指自由缩放拖动，轻触准星取色
            </div>
            <div class="pipette-view-wrap" id="pipetteViewWrap">
                <div class="pipette-canvas-viewport" id="pipetteViewport">
                    <canvas id="pipetteCanvas"></canvas>
                </div>
                <div id="pipetteReticle" class="pipette-reticle"></div>
            </div>
            <div style="display:flex;gap:12px;width:100%;max-width:320px;margin-top:12px;">
                <button class="btn-secondary" style="flex:1;" id="pipetteCancelBtn">取消</button>
                <button class="btn-primary" style="flex:1;" id="pipetteConfirmBtn">选取此颜色</button>
            </div>
        `;

        const viewWrap = document.getElementById('pipetteViewWrap');
        const viewport = document.getElementById('pipetteViewport');
        const canvas = document.getElementById('pipetteCanvas');
        const reticle = document.getElementById('pipetteReticle');
        const ctx = canvas.getContext('2d');

        canvas.width = loadedImg.width;
        canvas.height = loadedImg.height;
        ctx.drawImage(loadedImg, 0, 0);

        let currentScale = 1;
        let panX = 0, panY = 0;
        let pickedRgb = { r: 255, g: 255, b: 255 };

        const wrapRect = viewWrap.getBoundingClientRect();
        currentScale = Math.min(wrapRect.width / loadedImg.width, wrapRect.height / loadedImg.height, 1) * 0.95;
        viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;

        function sampleColorAtClientPoint(clientX, clientY) {
            const canvasRect = canvas.getBoundingClientRect();
            const relX = (clientX - canvasRect.left) / currentScale;
            const relY = (clientY - canvasRect.top) / currentScale;
            const pixelX = Math.round(relX);
            const pixelY = Math.round(relY);
            if (pixelX < 0 || pixelX >= canvas.width || pixelY < 0 || pixelY >= canvas.height) return;

            const p = ctx.getImageData(pixelX, pixelY, 1, 1).data;
            pickedRgb = { r: p[0], g: p[1], b: p[2] };

            reticle.style.display = 'block';
            reticle.style.left = `${clientX}px`;
            reticle.style.top = `${clientY}px`;
            reticle.style.backgroundColor = `rgb(${p[0]},${p[1]},${p[2]})`;
        }

        let isDragging = false;
        let startX = 0, startY = 0;

        viewWrap.addEventListener('touchstart', function (e) {
            if (e.touches.length === 1) {
                isDragging = true;
                startX = e.touches[0].clientX - panX;
                startY = e.touches[0].clientY - panY;
                sampleColorAtClientPoint(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        viewWrap.addEventListener('touchmove', function (e) {
            if (e.touches.length === 1 && isDragging) {
                panX = e.touches[0].clientX - startX;
                panY = e.touches[0].clientY - startY;
                viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
                sampleColorAtClientPoint(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        viewWrap.addEventListener('touchend', function () { isDragging = false; });

        document.getElementById('pipetteCancelBtn').onclick = () => overlay.remove();
        document.getElementById('pipetteConfirmBtn').onclick = function () {
            const hex = rgbToHex(pickedRgb.r, pickedRgb.g, pickedRgb.b);
            hsvState = hexToHsv(hex);
            if (window.refreshHsvWheelCanvas) window.refreshHsvWheelCanvas();
            previewColorLive(hex);
            overlay.remove();
            if (typeof showToast === 'function') showToast('已成功吸取并应用颜色');
        };
    }

    // 壁纸裁剪
    window.handleWallpaperUpload = function (event, targetType) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const rawBase64 = e.target.result;
            const img = new Image();
            img.onload = function () {
                openWallpaperCropModal(img, rawBase64, targetType);
            };
            img.src = rawBase64;
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    function openWallpaperCropModal(loadedImg, originalBase64, targetType) {
        let cropOverlay = document.getElementById('cropOverlay');
        if (!cropOverlay) {
            cropOverlay = document.createElement('div');
            cropOverlay.id = 'cropOverlay';
            cropOverlay.className = 'crop-overlay';
            document.body.appendChild(cropOverlay);
        }

        const typeLabel = targetType === 'lock' ? '锁屏壁纸' : '桌面壁纸';

        cropOverlay.innerHTML = `
            <div style="color:#ffffff;font-size:13.5px;font-weight:700;margin-bottom:6px;text-align:center;">
                裁剪 ${typeLabel}
            </div>
            <div class="crop-view-container" id="cropViewContainer">
                <div class="crop-image-viewport" id="cropViewport">
                    <canvas id="cropSourceCanvas"></canvas>
                </div>
                <div class="crop-frame-box" id="cropFrameBox"></div>
            </div>
            <div style="display:flex;gap:8px;width:100%;max-width:380px;margin-top:12px;">
                <button class="btn-secondary" style="flex:1;" id="cropCancelBtn">取消</button>
                <button class="btn-secondary" style="flex:1;" id="cropUseOriginalBtn">直接使用原图</button>
                <button class="btn-primary" style="flex:1.4;" id="cropConfirmBtn">完成裁剪</button>
            </div>
        `;

        const viewContainer = document.getElementById('cropViewContainer');
        const viewport = document.getElementById('cropViewport');
        const canvas = document.getElementById('cropSourceCanvas');
        const frameBox = document.getElementById('cropFrameBox');
        const ctx = canvas.getContext('2d');

        canvas.width = loadedImg.width;
        canvas.height = loadedImg.height;
        ctx.drawImage(loadedImg, 0, 0);

        const screenW = window.innerWidth || 360;
        const screenH = window.innerHeight || 640;
        const targetRatio = screenW / screenH;

        const contRect = viewContainer.getBoundingClientRect();
        const maxBoxW = contRect.width * 0.86;
        const maxBoxH = contRect.height * 0.88;

        let frameW = maxBoxW;
        let frameH = frameW / targetRatio;
        if (frameH > maxBoxH) {
            frameH = maxBoxH;
            frameW = frameH * targetRatio;
        }

        frameBox.style.width = `${Math.round(frameW)}px`;
        frameBox.style.height = `${Math.round(frameH)}px`;

        let currentScale = Math.max(frameW / loadedImg.width, frameH / loadedImg.height);
        let panX = 0, panY = 0;
        viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;

        let isDragging = false;
        let startX = 0, startY = 0;

        viewContainer.addEventListener('touchstart', function (e) {
            if (e.touches.length === 1) {
                isDragging = true;
                startX = e.touches[0].clientX - panX;
                startY = e.touches[0].clientY - panY;
            }
        }, { passive: true });

        viewContainer.addEventListener('touchmove', function (e) {
            if (e.touches.length === 1 && isDragging) {
                panX = e.touches[0].clientX - startX;
                panY = e.touches[0].clientY - startY;
                viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
            }
        }, { passive: true });

        viewContainer.addEventListener('touchend', function () { isDragging = false; });

        function applyWallpaperData(base64) {
            const root = document.documentElement;
            if (targetType === 'lock') {
                pendingLockBg = base64;
                root.style.setProperty('--lock-bg-url', `url('${base64}')`);
            } else if (targetType === 'desktop') {
                pendingDesktopBg = base64;
                root.style.setProperty('--desktop-bg-url', `url('${base64}')`);
            }
            const tip = document.getElementById('wallpaperStatusTip');
            if (tip) tip.textContent = '壁纸已就绪（请点击保存）';
        }

        document.getElementById('cropCancelBtn').onclick = () => cropOverlay.remove();
        document.getElementById('cropUseOriginalBtn').onclick = function () {
            applyWallpaperData(originalBase64);
            cropOverlay.remove();
        };

        document.getElementById('cropConfirmBtn').onclick = function () {
            const fRect = frameBox.getBoundingClientRect();
            const cRect = canvas.getBoundingClientRect();

            const srcX = (fRect.left - cRect.left) / currentScale;
            const srcY = (fRect.top - cRect.top) / currentScale;
            const srcW = fRect.width / currentScale;
            const srcH = fRect.height / currentScale;

            const outCanvas = document.createElement('canvas');
            outCanvas.width = 1080;
            outCanvas.height = Math.round(1080 / targetRatio);
            const outCtx = outCanvas.getContext('2d');

            outCtx.drawImage(canvas, srcX, srcY, srcW, srcH, 0, 0, outCanvas.width, outCanvas.height);
            const croppedBase64 = outCanvas.toDataURL('image/jpeg', 0.92);
            applyWallpaperData(croppedBase64);
            cropOverlay.remove();
            if (typeof showToast === 'function') showToast('壁纸裁剪完毕');
        };
    }

    window.confirmSaveWallpapersOnly = function () {
        if (pendingLockBg) localStorage.setItem('mcyt_custom_lock_bg', pendingLockBg);
        if (pendingDesktopBg) localStorage.setItem('mcyt_custom_desktop_bg', pendingDesktopBg);

        if (currentThemeMode === 'auto') {
            const target = pendingLockBg || 'assets/system/default_lock.jpg';
            if (typeof window.analyzeImageLuminance === 'function') {
                window.analyzeImageLuminance(target, window.applyColorTheme);
            }
        }

        const tip = document.getElementById('wallpaperStatusTip');
        if (tip) tip.textContent = '壁纸配置已保存！';
        if (typeof showToast === 'function') showToast('当前壁纸已永久保存');
    };

    window.restoreDefaultWallpapersOnly = function () {
        localStorage.removeItem('mcyt_custom_lock_bg');
        localStorage.removeItem('mcyt_custom_desktop_bg');
        pendingLockBg = null;
        pendingDesktopBg = null;

        const root = document.documentElement;
        root.style.setProperty('--lock-bg-url', `url('assets/system/default_lock.jpg')`);
        root.style.setProperty('--desktop-bg-url', `url('assets/system/default_desktop.jpg')`);

        if (currentThemeMode === 'auto' && typeof window.analyzeImageLuminance === 'function') {
            window.analyzeImageLuminance('assets/system/default_lock.jpg', window.applyColorTheme);
        }

        const tip = document.getElementById('wallpaperStatusTip');
        if (tip) tip.textContent = '当前使用默认壁纸';
        if (typeof showToast === 'function') showToast('已恢复为默认壁纸');
    };

    // 字体库
    window.toggleFontLibraryCollapse = function () {
        const body = document.getElementById('fontLibraryBody');
        const arrow = document.getElementById('fontCollapseArrow');
        if (!body || !arrow) return;
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
        arrow.textContent = isHidden ? '▼ 收起' : '▶ 展开';
    };

    window.switchFontFormat = function(fmt) {
        currentFontFormat = fmt;
        ['html', 'css', 'local'].forEach(k => {
            const sec = document.getElementById('fontInputSection_' + k);
            if (sec) sec.style.display = (k === fmt) ? 'block' : 'none';
        });
        document.querySelectorAll('.font-fmt-btn').forEach(b => {
            b.classList.remove('btn-primary');
            b.classList.add('btn-secondary');
        });
        const activeBtn = document.getElementById('btnFmt' + fmt.charAt(0).toUpperCase() + fmt.slice(1));
        if (activeBtn) {
            activeBtn.classList.remove('btn-secondary');
            activeBtn.classList.add('btn-primary');
        }
    };

    window.handleUnifiedFontImport = function (formatType) {
        const codeInput = document.getElementById('fontCodeInput_' + formatType);
        const remarkInput = document.getElementById('fontRemarkInput_' + formatType);
        if (!codeInput) return;

        const rawCode = (codeInput.value || '').trim();
        const remark = (remarkInput && remarkInput.value.trim()) || '自定义扩展字体';

        if (!rawCode) {
            if (typeof showToast === 'function') showToast('请输入对应的字体代码');
            return;
        }

        let familyName = '';

        if (formatType === 'html') {
            const parser = new DOMParser();
            const doc = parser.parseFromString(rawCode, 'text/html');

            const links = doc.querySelectorAll('link[href]');
            links.forEach(l => {
                const linkEl = document.createElement('link');
                linkEl.rel = 'stylesheet';
                linkEl.href = l.getAttribute('href');
                linkEl.crossOrigin = 'anonymous';
                document.head.appendChild(linkEl);
            });

            const styleTags = doc.querySelectorAll('style');
            let styleContent = '';
            styleTags.forEach(s => { styleContent += s.textContent + '\n'; });

            const match = styleContent.match(/font-family:\s*["']?([^'";\n]+)["']?/i);
            if (match && match[1]) {
                familyName = match[1].trim();
            }
        } else {
            const match = rawCode.match(/font-family:\s*["']?([^'";\n]+)["']?/i);
            if (match && match[1]) {
                familyName = match[1].trim();
            }
            const styleEl = document.createElement('style');
            styleEl.innerHTML = rawCode;
            document.head.appendChild(styleEl);
        }

        if (!familyName) {
            familyName = 'CustomFont_' + Date.now();
        }

        saveFontRecord({
            id: 'font_' + Date.now(),
            name: remark,
            family: familyName,
            type: formatType,
            code: rawCode
        });

        applyGlobalFontForce(familyName, rawCode);
        renderInstalledFontsList();
        codeInput.value = '';
        if (typeof showToast === 'function') showToast(`字体 [${remark}] 已全局生效！`, 'success');
    };

    window.handleThemeFontUpload = function (event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (evt) {
            const fontName = 'LocalFont_' + Date.now();
            const fontFace = new FontFace(fontName, evt.target.result);
            fontFace.load().then(function (loaded) {
                document.fonts.add(loaded);
                saveFontRecord({
                    id: 'font_' + Date.now(),
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    family: fontName,
                    type: 'local'
                });
                applyGlobalFontForce(fontName);
                renderInstalledFontsList();
                if (typeof showToast === 'function') showToast('本地字体安装并应用成功');
            }).catch(function () {
                if (typeof showToast === 'function') showToast('字体解析失败，请检查文件格式');
            });
        };
        reader.readAsArrayBuffer(file);
    };

    function applyGlobalFontForce(familyName, rawCode = '') {
        const root = document.documentElement;
        root.style.setProperty('--app-font', `"${familyName}", -apple-system, sans-serif`);

        let dynamicStyle = document.getElementById('globalDynamicFontStyleTag');
        if (!dynamicStyle) {
            dynamicStyle = document.createElement('style');
            dynamicStyle.id = 'globalDynamicFontStyleTag';
            document.head.appendChild(dynamicStyle);
        }

        dynamicStyle.innerHTML = `
            ${rawCode.includes('<style>') ? '' : (rawCode.startsWith('@') ? rawCode : '')}
            * {
                font-family: "${familyName}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
            }
        `;
        localStorage.setItem('mcyt_active_font_family', familyName);
        if (rawCode) localStorage.setItem('mcyt_active_font_code', rawCode);
    }

    function saveFontRecord(fontItem) {
        let list = [];
        try { list = JSON.parse(localStorage.getItem('mcyt_installed_fonts') || '[]'); } catch (e) { list = []; }
        list.push(fontItem);
        localStorage.setItem('mcyt_installed_fonts', JSON.stringify(list));
    }

    function renderInstalledFontsList() {
        const container = document.getElementById('installedFontsList');
        if (!container) return;

        let list = [];
        try { list = JSON.parse(localStorage.getItem('mcyt_installed_fonts') || '[]'); } catch (e) { list = []; }

        if (list.length === 0) {
            container.innerHTML = `<div style="font-size:11px;color:var(--text2);text-align:center;">暂无自定义字体</div>`;
            return;
        }

        container.innerHTML = list.map(item => `
            <div style="display:flex;justify-content:space-between;align-items:center;background:#fff8fa;padding:6px 10px;border-radius:8px;border:1px solid #ffeef2;">
                <div style="display:flex;flex-direction:column;">
                    <span style="font-size:12px;font-weight:700;color:#2e1a22;">${item.name}</span>
                    <span style="font-size:10px;color:var(--text2);">类型: ${item.type.toUpperCase()} · 系列: ${item.family}</span>
                </div>
                <div style="display:flex;gap:6px;">
                    <button class="btn-secondary" style="padding:2px 6px;font-size:10.5px;" onclick="window.reapplyFontItem('${item.id}')">应用</button>
                    <button class="btn-secondary" style="padding:2px 6px;font-size:10.5px;color:#c92a2a;" onclick="window.removeFontItem('${item.id}')">删除</button>
                </div>
            </div>
        `).join('');
    }

    window.reapplyFontItem = function (id) {
        let list = JSON.parse(localStorage.getItem('mcyt_installed_fonts') || '[]');
        const target = list.find(x => x.id === id);
        if (target) {
            applyGlobalFontForce(target.family, target.code || '');
            if (typeof showToast === 'function') showToast('已应用字体: ' + target.name);
        }
    };

    window.removeFontItem = function (id) {
        let list = JSON.parse(localStorage.getItem('mcyt_installed_fonts') || '[]');
        list = list.filter(x => x.id !== id);
        localStorage.setItem('mcyt_installed_fonts', JSON.stringify(list));
        renderInstalledFontsList();
    };

    // 配置方案管理器
    function getStoredProfiles() {
        try { return JSON.parse(localStorage.getItem('mcyt_theme_profiles') || '[]'); } catch (e) { return []; }
    }

    function renderProfileChips() {
        const container = document.getElementById('themeProfileList');
        if (!container) return;

        const profiles = getStoredProfiles();
        const activeName = localStorage.getItem('mcyt_active_profile_name') || '';

        if (profiles.length === 0) {
            container.innerHTML = `<div style="font-size:11.5px;color:var(--text2);">暂无方案，点击上方“新建方案”保存当前配置</div>`;
            return;
        }

        container.innerHTML = profiles.map(p => `
            <div class="profile-chip ${p.name === activeName ? 'active' : ''}" onclick="window.applyThemeProfile('${p.name}')">
                <span>${p.name}</span>
                <span class="profile-chip-del" onclick="event.stopPropagation(); window.deleteThemeProfile('${p.name}')">✕</span>
            </div>
        `).join('');
    }

    window.promptSaveNewProfile = function () {
        const name = prompt('请输入新配置方案的名称：', '甜心粉白方案');
        if (!name || !name.trim()) return;

        const profiles = getStoredProfiles();
        const curRgb = hsvToRgb(hsvState.h, hsvState.s, hsvState.v);
        const hex = rgbToHex(curRgb.r, curRgb.g, curRgb.b);

        const newProfile = {
            name: name.trim(),
            mode: currentThemeMode,
            customColor: hex,
            lockBg: pendingLockBg || localStorage.getItem('mcyt_custom_lock_bg'),
            desktopBg: pendingDesktopBg || localStorage.getItem('mcyt_custom_desktop_bg'),
            savedAt: Date.now()
        };

        const existingIdx = profiles.findIndex(p => p.name === newProfile.name);
        if (existingIdx >= 0) profiles[existingIdx] = newProfile;
        else profiles.push(newProfile);

        localStorage.setItem('mcyt_theme_profiles', JSON.stringify(profiles));
        localStorage.setItem('mcyt_active_profile_name', newProfile.name);
        renderProfileChips();
        if (typeof showToast === 'function') showToast('方案 [' + newProfile.name + '] 已保存！');
    };

    window.applyThemeProfile = function (profileName) {
        const profiles = getStoredProfiles();
        const target = profiles.find(p => p.name === profileName);
        if (!target) return;

        localStorage.setItem('mcyt_active_profile_name', target.name);
        currentThemeMode = target.mode || 'auto';
        localStorage.setItem('mcyt_phone_theme_mode', currentThemeMode);

        if (target.customColor) {
            localStorage.setItem('mcyt_phone_custom_color', target.customColor);
            hsvState = hexToHsv(target.customColor);
        }

        if (target.lockBg) {
            pendingLockBg = target.lockBg;
            localStorage.setItem('mcyt_custom_lock_bg', target.lockBg);
            document.documentElement.style.setProperty('--lock-bg-url', `url('${target.lockBg}')`);
        }
        if (target.desktopBg) {
            pendingDesktopBg = target.desktopBg;
            localStorage.setItem('mcyt_custom_desktop_bg', target.desktopBg);
            document.documentElement.style.setProperty('--desktop-bg-url', `url('${target.desktopBg}')`);
        }

        const appModalBody = document.getElementById('appModalBody');
        if (appModalBody) window.renderThemeApp(appModalBody);

        applyThemeModeDirect(currentThemeMode);
        if (typeof showToast === 'function') showToast('已切换至方案: ' + target.name);
    };

    window.deleteThemeProfile = function (profileName) {
        if (!confirm(`确定要删除方案 [${profileName}] 吗？`)) return;
        let profiles = getStoredProfiles().filter(p => p.name !== profileName);
        localStorage.setItem('mcyt_theme_profiles', JSON.stringify(profiles));
        if (localStorage.getItem('mcyt_active_profile_name') === profileName) {
            localStorage.removeItem('mcyt_active_profile_name');
        }
        renderProfileChips();
        if (typeof showToast === 'function') showToast('已删除方案: ' + profileName);
    };

    try {
        const actFam = localStorage.getItem('mcyt_active_font_family');
        const actCode = localStorage.getItem('mcyt_active_font_code') || '';
        if (actFam) applyGlobalFontForce(actFam, actCode);
    } catch (_) {}
})();
