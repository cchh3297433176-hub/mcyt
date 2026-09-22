/**
 * js/apps/theme/theme-app.js
 * 🎀 个性化与主题中心 App（仿微信白灰微绿原生架构）
 * 职责：主体色彩定制、状态栏三维解耦、HSV 色相盘调控、桌面组件排版、
 *       壁纸裁剪、字体库扩展、主题方案管理器、
 *       🌟 双页签架构调度：调度 [手机主题] 与 [聊天装扮 (theme-chat-decor.js)]
 */

(function () {
    'use strict';

    let activeThemeTab = 'system'; // 'system' | 'chat_decor'

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

    let currentHsvTarget = 'status_text';

    const HSV_TARGET_NAMES = {
        status_text: '字体与状态栏指示颜色',
        icon_label: '桌面 App 标题文字颜色',
        status_fill: '状态栏填充底色',
        main_pink: '主体系统重点色彩',
        main_white: '主体背景基底底色'
    };

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
            return localStorage.getItem('mcyt_phone_custom_color') || '#07c160';
        } else if (targetKey === 'icon_label') {
            return localStorage.getItem('mcyt_icon_label_color') || '#222222';
        } else if (targetKey === 'status_fill') {
            const fill = localStorage.getItem('mcyt_statusbar_fill');
            return (fill && fill.startsWith('#')) ? fill : '#ffffff';
        } else if (targetKey === 'main_pink') {
            return localStorage.getItem('mcyt_custom_main_pink') || '#07c160';
        } else if (targetKey === 'main_white') {
            return localStorage.getItem('mcyt_custom_main_white') || '#ffffff';
        }
        return '#07c160';
    }

    function updateHsvVisibilityDom() {
        const wrap = document.getElementById('themeHsvPickerWrap');
        if (!wrap) return;
        if (currentHsvTarget === 'status_text') {
            wrap.style.display = (currentThemeMode === 'custom') ? 'block' : 'none';
        } else {
            wrap.style.display = 'block';
        }
    }

    function applyThemeModeDirect(mode) {
        const root = document.documentElement;
        if (mode === 'dark') {
            root.style.setProperty('--status-color', '#ffffff');
            root.style.setProperty('--lock-text-color', '#ffffff');
            root.style.setProperty('--status-svg-fill', '#ffffff');
            root.style.setProperty('--star-glow-color', 'rgba(255, 255, 255, 0.9)');
            if (typeof window.applyColorTheme === 'function') window.applyColorTheme(false);
        } else if (mode === 'light') {
            root.style.setProperty('--status-color', '#222222');
            root.style.setProperty('--lock-text-color', '#222222');
            root.style.setProperty('--status-svg-fill', '#222222');
            root.style.setProperty('--star-glow-color', 'rgba(0, 0, 0, 0.4)');
            if (typeof window.applyColorTheme === 'function') window.applyColorTheme(true);
        } else if (mode === 'auto') {
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

    // 主题中心主渲染函数（白灰微绿双Tab中枢）
    window.renderThemeApp = function (container) {
        if (!container) return;

        container.innerHTML = `
            <div class="theme-app-shell" style="background:#f7f7f7;min-height:100%;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#222;">
                <!-- 顶部微信原生双页签导航 -->
                <div style="background:#ffffff;border-bottom:1px solid #eeeeee;display:flex;position:sticky;top:0;z-index:20;">
                    <div id="themeTabSystem" onclick="window.switchThemeAppTab('system')" 
                         style="flex:1;text-align:center;padding:12px 0;font-size:14px;font-weight:${activeThemeTab === 'system' ? '700' : '500'};color:${activeThemeTab === 'system' ? '#07c160' : '#666666'};cursor:pointer;position:relative;transition:all 0.2s;">
                        📱 手机主题
                        ${activeThemeTab === 'system' ? '<div style="position:absolute;bottom:0;left:25%;width:50%;height:3px;background:#07c160;border-radius:3px 3px 0 0;"></div>' : ''}
                    </div>
                    <div id="themeTabChatDecor" onclick="window.switchThemeAppTab('chat_decor')" 
                         style="flex:1;text-align:center;padding:12px 0;font-size:14px;font-weight:${activeThemeTab === 'chat_decor' ? '700' : '500'};color:${activeThemeTab === 'chat_decor' ? '#07c160' : '#666666'};cursor:pointer;position:relative;transition:all 0.2s;">
                        💬 聊天装扮
                        ${activeThemeTab === 'chat_decor' ? '<div style="position:absolute;bottom:0;left:25%;width:50%;height:3px;background:#07c160;border-radius:3px 3px 0 0;"></div>' : ''}
                    </div>
                </div>

                <!-- 容器主体 -->
                <div id="themeAppSubContent" style="padding:12px;flex:1;display:flex;flex-direction:column;gap:12px;"></div>
            </div>
        `;

        const subContainer = document.getElementById('themeAppSubContent');
        if (activeThemeTab === 'system') {
            renderSystemThemeSubView(subContainer);
        } else {
            if (typeof window.renderChatDecorTheme === 'function') {
                window.renderChatDecorTheme(subContainer);
            } else {
                subContainer.innerHTML = `
                    <div style="background:#ffffff;border-radius:12px;padding:24px;text-align:center;color:#888;border:1px solid #eeeeee;">
                        <div style="font-size:14px;font-weight:600;color:#222;margin-bottom:6px;">聊天装扮模块加载中...</div>
                        <div style="font-size:12px;">请确保已加载 js/apps/theme/theme-chat-decor.js 脚本</div>
                    </div>
                `;
            }
        }
    };

    window.switchThemeAppTab = function (tabKey) {
        activeThemeTab = tabKey;
        const appModalBody = document.getElementById('appModalBody');
        if (appModalBody) {
            window.renderThemeApp(appModalBody);
        }
    };

    // 渲染第一页：手机主体与桌面设置（纯白卡片，消除粉白精致土）
    function renderSystemThemeSubView(container) {
        if (!container) return;

        currentThemeMode = localStorage.getItem('mcyt_phone_theme_mode') || 'auto';
        const curHex = getCurrentTargetHex(currentHsvTarget);
        hsvState = hexToHsv(curHex);

        pendingLockBg = localStorage.getItem('mcyt_custom_lock_bg');
        pendingDesktopBg = localStorage.getItem('mcyt_custom_desktop_bg');

        const sStrokeVal = localStorage.getItem('mcyt_statusbar_stroke') || 'none';

        const calEnabled = localStorage.getItem('mcyt_widget_calendar_enabled') !== 'false';
        const calPage = parseInt(localStorage.getItem('mcyt_widget_calendar_page') || '1', 10);

        const todoEnabled = localStorage.getItem('mcyt_widget_todo_enabled') !== 'false';
        const todoPage = parseInt(localStorage.getItem('mcyt_widget_todo_page') || '1', 10);

        let offsetSummary = '默认位置（未自定义）';
        try {
            const rawOffsets = localStorage.getItem('mcyt_desktop_block_offsets_v1');
            if (rawOffsets) {
                const off = JSON.parse(rawOffsets);
                const items = [];
                if (off.lock) items.push(`锁屏:${off.lock > 0 ? '+' : ''}${off.lock}px`);
                if (off.tarot) items.push(`塔罗:${off.tarot > 0 ? '+' : ''}${off.tarot}px`);
                if (off.calendar) items.push(`日历:${off.calendar > 0 ? '+' : ''}${off.calendar}px`);
                if (off.todo) items.push(`便签:${off.todo > 0 ? '+' : ''}${off.todo}px`);
                if (off.appGrid) items.push(`应用:${off.appGrid > 0 ? '+' : ''}${off.appGrid}px`);
                if (items.length) offsetSummary = items.join(' | ');
            }
        } catch (_) {}

        container.innerHTML = `
            <!-- 卡片 1：壁纸设置 -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                <div style="font-size:14px;font-weight:700;color:#222;margin-bottom:4px;">壁纸设置</div>
                <div style="font-size:12px;color:#888;margin-bottom:12px;">选取手机相册照片，导入时可按屏幕比例自由裁剪。</div>

                <div style="display:flex;flex-direction:column;gap:8px;">
                    <input type="file" id="localLockFileInput" accept="image/*" style="display:none;" onchange="window.handleWallpaperUpload(event, 'lock')">
                    <input type="file" id="localDesktopFileInput" accept="image/*" style="display:none;" onchange="window.handleWallpaperUpload(event, 'desktop')">

                    <div style="display:flex;gap:8px;">
                        <button style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid #e0e0e0;background:#f9f9f9;font-size:12px;color:#333;font-weight:600;cursor:pointer;" onclick="document.getElementById('localLockFileInput').click()">
                            选取锁屏壁纸
                        </button>
                        <button style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid #e0e0e0;background:#f9f9f9;font-size:12px;color:#333;font-weight:600;cursor:pointer;" onclick="document.getElementById('localDesktopFileInput').click()">
                            选取桌面壁纸
                        </button>
                    </div>

                    <div id="wallpaperStatusTip" style="font-size:11.5px;color:#888;text-align:center;margin:2px 0;">
                        ${pendingLockBg || pendingDesktopBg ? '已载入自定义壁纸' : '当前使用默认壁纸'}
                    </div>

                    <div style="display:flex;gap:8px;">
                        <button style="flex:2;padding:8px 12px;border-radius:8px;border:none;background:#07c160;color:#ffffff;font-size:12.5px;font-weight:600;cursor:pointer;" onclick="window.confirmSaveWallpapersOnly()">
                            保存当前壁纸
                        </button>
                        <button style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid #e0e0e0;background:#f9f9f9;color:#555;font-size:12px;cursor:pointer;" onclick="window.restoreDefaultWallpapersOnly()">
                            恢复默认
                        </button>
                    </div>
                </div>
            </div>

            <!-- 卡片 2：色彩与状态栏全局定制 -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                <div style="font-size:14px;font-weight:700;color:#222;margin-bottom:4px;">全层级色彩与状态栏</div>
                <div style="font-size:12px;color:#888;margin-bottom:12px;">专业 HSV 色轮微调与实时水滴取色。</div>

                <div style="margin-bottom:12px;position:relative;">
                    <label style="font-size:12px;font-weight:600;color:#555;display:block;margin-bottom:6px;">色盘调节目标：</label>
                    <div id="themeHsvTargetDropdownBtn" onclick="window.toggleThemeTargetDropdown()"
                         style="background:#f9f9f9;border:1px solid #e0e0e0;border-radius:8px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                        <span id="themeHsvTargetDropdownLabel" style="font-size:12.5px;color:#222;font-weight:600;">${HSV_TARGET_NAMES[currentHsvTarget]}</span>
                        <span style="font-size:10px;color:#888;">▼</span>
                    </div>
                    <div id="themeHsvTargetDropdownMenu" style="display:none;position:absolute;top:100%;left:0;right:0;background:#ffffff;border:1px solid #e5e5e5;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.08);margin-top:4px;z-index:30;flex-direction:column;overflow:hidden;">
                        ${Object.keys(HSV_TARGET_NAMES).map(k => `
                            <div style="padding:9px 12px;font-size:12.5px;color:#333;display:flex;justify-content:space-between;cursor:pointer;border-bottom:1px solid #f5f5f5;" onclick="window.selectHsvTarget('${k}')">
                                <span>${HSV_TARGET_NAMES[k]}</span>
                                ${k === currentHsvTarget ? '<span style="color:#07c160;font-weight:bold;">✓</span>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div id="statusBarExtraControls" style="display:${currentHsvTarget === 'status_fill' ? 'block' : 'none'};margin-bottom:12px;background:#f9f9f9;padding:10px;border-radius:8px;border:1px solid #e8e8e8;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                        <span style="font-size:12px;font-weight:600;color:#333;">底部分割线：</span>
                        <select id="statusBarStrokeSelect" style="padding:4px 8px;border-radius:6px;border:1px solid #ccc;font-size:11.5px;background:#fff;" onchange="window.updateStatusBarStroke(this.value)">
                            <option value="none" ${sStrokeVal === 'none' ? 'selected' : ''}>无分割线</option>
                            <option value="1px solid rgba(7, 193, 96, 0.35)" ${sStrokeVal.includes('7, 193, 96') ? 'selected' : ''}>原生微绿描边</option>
                            <option value="1px solid rgba(255, 255, 255, 0.45)" ${sStrokeVal.includes('255, 255, 255') ? 'selected' : ''}>纯白细线</option>
                            <option value="1px solid rgba(0, 0, 0, 0.12)" ${sStrokeVal.includes('0, 0, 0') ? 'selected' : ''}>浅灰细线</option>
                        </select>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <span style="font-size:12px;font-weight:600;color:#333;">专属底图或透明：</span>
                        <input type="file" id="statusBarBgFileInput" accept="image/*" style="display:none;" onchange="window.handleStatusBarBgUpload(event)">
                        <div style="display:flex;gap:6px;">
                            <button style="padding:3px 8px;font-size:11px;border-radius:6px;border:1px solid #e0e0e0;background:#fff;" onclick="window.updateStatusBarFill('transparent')">透明</button>
                            <button style="padding:3px 8px;font-size:11px;border-radius:6px;border:1px solid #e0e0e0;background:#fff;" onclick="document.getElementById('statusBarBgFileInput').click()">底图</button>
                            <button style="padding:3px 8px;font-size:11px;border-radius:6px;border:1px solid #ffdcd9;background:#fff;color:#fa5151;" onclick="window.clearStatusBarBg()">清除</button>
                        </div>
                    </div>
                </div>

                <div id="statusModeRadioWrap" style="display:${currentHsvTarget === 'status_text' ? 'block' : 'none'};margin-bottom:12px;">
                    <div style="display:flex;flex-direction:column;gap:6px;background:#f9f9f9;padding:8px 12px;border-radius:8px;border:1px solid #e8e8e8;">
                        <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">
                            <input type="radio" name="themeModeRadio" value="auto" ${currentThemeMode === 'auto' ? 'checked' : ''} onchange="window.onThemeModeRadioChange('auto')">
                            <span>自动识别壁纸明暗反色</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">
                            <input type="radio" name="themeModeRadio" value="dark" ${currentThemeMode === 'dark' ? 'checked' : ''} onchange="window.onThemeModeRadioChange('dark')">
                            <span>强制纯白质感（深底白字）</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">
                            <input type="radio" name="themeModeRadio" value="light" ${currentThemeMode === 'light' ? 'checked' : ''} onchange="window.onThemeModeRadioChange('light')">
                            <span>强制深黑质感（浅底黑字）</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">
                            <input type="radio" name="themeModeRadio" value="custom" ${currentThemeMode === 'custom' ? 'checked' : ''} onchange="window.onThemeModeRadioChange('custom')">
                            <span>自定义固定色彩（下方色盘）</span>
                        </label>
                    </div>
                </div>

                <!-- 正等边 HSV 色盘 -->
                <div id="themeHsvPickerWrap" style="margin-top:6px;display:${(currentHsvTarget === 'status_text' && currentThemeMode !== 'custom') ? 'none' : 'block'};">
                    <div style="background:#222222;border-radius:16px;padding:16px;width:100%;max-width:320px;margin:0 auto;box-sizing:border-box;">
                        <div class="hsv-wheel-box" id="hsvWheelBox" style="width:220px;height:220px;margin:0 auto 10px auto;position:relative;user-select:none;touch-action:none;">
                            <canvas id="hsvWheelCanvas" class="hsv-wheel-canvas" width="440" height="440" style="width:100%;height:100%;border-radius:50%;display:block;touch-action:none;"></canvas>
                            <div class="hsv-ring-handle" id="hsvRingHandle" style="position:absolute;width:22px;height:22px;border:2.5px solid #ffffff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.5);transform:translate(-50%,-50%);pointer-events:none;box-sizing:border-box;"></div>
                            <div class="hsv-triangle-handle" id="hsvTriangleHandle" style="position:absolute;width:18px;height:18px;border:2.5px solid #ffffff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.5);transform:translate(-50%,-50%);pointer-events:none;box-sizing:border-box;"></div>
                        </div>

                        <div style="display:flex;justify-content:space-between;align-items:center;padding:0 4px 10px 4px;">
                            <div id="currentHexBadge" style="font-size:12px;font-family:monospace;color:#fff;background:rgba(255,255,255,0.15);padding:2px 8px;border-radius:6px;">
                                ${curHex.toUpperCase()}
                            </div>
                            <input type="file" id="pipetteImageInput" accept="image/*" style="display:none;" onchange="window.handlePipetteImageSelected(event)">
                            <div style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick="document.getElementById('pipetteImageInput').click()" title="从照片吸色">
                                <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:#ffffff;stroke-width:1.8;">
                                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                                    <path d="M12 11v4" stroke-linecap="round"></path>
                                    <path d="M10 13h4" stroke-linecap="round"></path>
                                </svg>
                            </div>
                        </div>

                        <div style="display:flex;flex-direction:column;gap:10px;padding:0 4px;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="font-size:12px;color:#aaa;width:10px;font-weight:bold;">H</span>
                                <input type="range" id="sliderH" min="0" max="360" value="${hsvState.h}" style="flex:1;height:5px;border-radius:3px;appearance:none;outline:none;background:linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);">
                                <input type="number" id="inputValH" min="0" max="360" value="${hsvState.h}" onchange="window.onHsvManualInputChange('h', this.value)" style="width:40px;background:#333;color:#fff;border:1px solid #444;border-radius:4px;padding:2px 4px;font-size:11px;text-align:center;">
                            </div>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="font-size:12px;color:#aaa;width:10px;font-weight:bold;">S</span>
                                <input type="range" id="sliderS" min="0" max="100" value="${hsvState.s}" style="flex:1;height:5px;border-radius:3px;appearance:none;outline:none;">
                                <input type="number" id="inputValS" min="0" max="100" value="${hsvState.s}" onchange="window.onHsvManualInputChange('s', this.value)" style="width:40px;background:#333;color:#fff;border:1px solid #444;border-radius:4px;padding:2px 4px;font-size:11px;text-align:center;">
                            </div>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="font-size:12px;color:#aaa;width:10px;font-weight:bold;">V</span>
                                <input type="range" id="sliderV" min="0" max="100" value="${hsvState.v}" style="flex:1;height:5px;border-radius:3px;appearance:none;outline:none;">
                                <input type="number" id="inputValV" min="0" max="100" value="${hsvState.v}" onchange="window.onHsvManualInputChange('v', this.value)" style="width:40px;background:#333;color:#fff;border:1px solid #444;border-radius:4px;padding:2px 4px;font-size:11px;text-align:center;">
                            </div>
                        </div>
                    </div>
                </div>

                <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
                    <button style="width:100%;padding:9px;background:#07c160;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;" onclick="window.saveAndApplyColorThemeOnly()">
                        保存当前色彩
                    </button>
                    <button style="width:100%;padding:8px;background:#f9f9f9;color:#666;border:1px solid #e0e0e0;border-radius:8px;font-size:12px;cursor:pointer;" onclick="window.restoreAllDefaultColors()">
                        恢复全站默认主题色
                    </button>
                </div>
            </div>

            <!-- 卡片 3：桌面小组件与排版 -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                <div onclick="window.toggleWidgetsSettingsCollapse()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                    <div>
                        <div style="font-size:14px;font-weight:700;color:#222;">桌面小组件与排版</div>
                        <div style="font-size:12px;color:#888;">控制组件显示与手势自由排版</div>
                    </div>
                    <span id="widgetsCollapseArrow" style="font-size:12px;color:#07c160;font-weight:bold;">▶ 展开</span>
                </div>

                <div id="widgetsSettingsBody" style="display:none;margin-top:12px;">
                    <div style="display:flex;flex-direction:column;gap:10px;">
                        <!-- 组件 A：日历 -->
                        <div style="background:#f9f9f9;padding:10px;border-radius:8px;border:1px solid #eee;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                <span style="font-size:12.5px;font-weight:700;color:#222;">📅 极简日历</span>
                                <button style="padding:2px 8px;font-size:11px;border-radius:6px;border:1px solid #e0e0e0;background:#fff;${calEnabled ? 'color:#07c160;font-weight:bold;' : 'color:#999;'}" onclick="window.toggleWidgetEnabled('calendar')">
                                    ${calEnabled ? '● 已开启' : '○ 已关闭'}
                                </button>
                            </div>
                            <div style="display:flex;align-items:center;justify-content:space-between;">
                                <span style="font-size:11.5px;color:#888;">放置页码：</span>
                                <div style="display:flex;gap:6px;">
                                    <button style="padding:2px 8px;font-size:11px;border-radius:6px;border:1px solid ${calPage === 1 ? '#07c160' : '#ddd'};background:${calPage === 1 ? '#e8f7ed' : '#fff'};color:${calPage === 1 ? '#07c160' : '#555'};" onclick="window.setWidgetPage('calendar', 1)">第 1 页</button>
                                    <button style="padding:2px 8px;font-size:11px;border-radius:6px;border:1px solid ${calPage === 2 ? '#07c160' : '#ddd'};background:${calPage === 2 ? '#e8f7ed' : '#fff'};color:${calPage === 2 ? '#07c160' : '#555'};" onclick="window.setWidgetPage('calendar', 2)">第 2 页</button>
                                </div>
                            </div>
                        </div>

                        <!-- 组件 B：待办便签 -->
                        <div style="background:#f9f9f9;padding:10px;border-radius:8px;border:1px solid #eee;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                <span style="font-size:12.5px;font-weight:700;color:#222;">📝 待办便签</span>
                                <button style="padding:2px 8px;font-size:11px;border-radius:6px;border:1px solid #e0e0e0;background:#fff;${todoEnabled ? 'color:#07c160;font-weight:bold;' : 'color:#999;'}" onclick="window.toggleWidgetEnabled('todo')">
                                    ${todoEnabled ? '● 已开启' : '○ 已关闭'}
                                </button>
                            </div>
                            <div style="display:flex;align-items:center;justify-content:space-between;">
                                <span style="font-size:11.5px;color:#888;">放置页码：</span>
                                <div style="display:flex;gap:6px;">
                                    <button style="padding:2px 8px;font-size:11px;border-radius:6px;border:1px solid ${todoPage === 1 ? '#07c160' : '#ddd'};background:${todoPage === 1 ? '#e8f7ed' : '#fff'};color:${todoPage === 1 ? '#07c160' : '#555'};" onclick="window.setWidgetPage('todo', 1)">第 1 页</button>
                                    <button style="padding:2px 8px;font-size:11px;border-radius:6px;border:1px solid ${todoPage === 2 ? '#07c160' : '#ddd'};background:${todoPage === 2 ? '#e8f7ed' : '#fff'};color:${todoPage === 2 ? '#07c160' : '#555'};" onclick="window.setWidgetPage('todo', 2)">第 2 页</button>
                                </div>
                            </div>
                        </div>

                        <!-- 桌面排版模式入口 -->
                        <div style="background:#f2f9f5;border:1px dashed #b2e2c8;border-radius:8px;padding:10px;margin-top:4px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                <span style="font-size:12px;font-weight:700;color:#1b5e20;">📐 桌面各层手拖排版模式</span>
                            </div>
                            <div style="font-size:11px;color:#666;margin-bottom:8px;">
                                当前偏移：<span style="font-family:monospace;color:#07c160;">${offsetSummary}</span>
                            </div>
                            <div style="display:flex;gap:8px;">
                                <button style="flex:1.5;padding:7px;background:#07c160;color:#fff;border:none;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;" onclick="window.triggerDesktopCustomLayoutMode()">
                                    进入手势排版模式
                                </button>
                                <button style="flex:1;padding:7px;background:#fff;border:1px solid #ddd;border-radius:6px;font-size:11.5px;color:#555;cursor:pointer;" onclick="window.triggerResetDesktopBlockOffsets()">
                                    恢复默认
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 卡片 4：字体扩展库 -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                <div onclick="window.toggleFontLibraryCollapse()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                    <div>
                        <div style="font-size:14px;font-weight:700;color:#222;">系统字体扩展库</div>
                        <div style="font-size:12px;color:#888;">导入外部 CSS 或字体文件</div>
                    </div>
                    <span id="fontCollapseArrow" style="font-size:12px;color:#07c160;font-weight:bold;">▶ 展开</span>
                </div>

                <div id="fontLibraryBody" style="display:none;margin-top:12px;">
                    <div style="display:flex;gap:6px;margin-bottom:10px;">
                        <button style="flex:1;padding:6px;font-size:11px;border-radius:6px;border:1px solid #ddd;cursor:pointer;background:${currentFontFormat === 'html' ? '#07c160' : '#f9f9f9'};color:${currentFontFormat === 'html' ? '#fff' : '#444'};" onclick="window.switchFontFormat('html')">HTML 标签外链</button>
                        <button style="flex:1;padding:6px;font-size:11px;border-radius:6px;border:1px solid #ddd;cursor:pointer;background:${currentFontFormat === 'css' ? '#07c160' : '#f9f9f9'};color:${currentFontFormat === 'css' ? '#fff' : '#444'};" onclick="window.switchFontFormat('css')">CSS 片段</button>
                        <button style="flex:1;padding:6px;font-size:11px;border-radius:6px;border:1px solid #ddd;cursor:pointer;background:${currentFontFormat === 'local' ? '#07c160' : '#f9f9f9'};color:${currentFontFormat === 'local' ? '#fff' : '#444'};" onclick="window.switchFontFormat('local')">本地字体文件</button>
                    </div>

                    <div id="fontInputSection_html" style="display:${currentFontFormat === 'html' ? 'block' : 'none'};">
                        <input type="text" id="fontRemarkInput_html" placeholder="字体备注名称（如：思源宋体）" style="width:100%;box-sizing:border-box;margin-bottom:6px;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12px;outline:none;">
                        <textarea id="fontCodeInput_html" placeholder="粘贴完整的 HTML 标签代码" style="width:100%;box-sizing:border-box;min-height:70px;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:11px;outline:none;resize:none;font-family:monospace;"></textarea>
                        <button style="width:100%;margin-top:8px;padding:8px;background:#07c160;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;" onclick="window.handleUnifiedFontImport('html')">导入并全局应用</button>
                    </div>

                    <div id="fontInputSection_css" style="display:${currentFontFormat === 'css' ? 'block' : 'none'};">
                        <input type="text" id="fontRemarkInput_css" placeholder="字体备注名称" style="width:100%;box-sizing:border-box;margin-bottom:6px;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12px;outline:none;">
                        <textarea id="fontCodeInput_css" placeholder="粘贴 CSS @font-face 代码" style="width:100%;box-sizing:border-box;min-height:70px;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:11px;outline:none;resize:none;font-family:monospace;"></textarea>
                        <button style="width:100%;margin-top:8px;padding:8px;background:#07c160;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;" onclick="window.handleUnifiedFontImport('css')">导入并全局应用</button>
                    </div>

                    <div id="fontInputSection_local" style="display:${currentFontFormat === 'local' ? 'block' : 'none'};">
                        <input type="file" id="themeFontFileInput" accept=".ttf,.otf,.woff,.woff2" style="display:none;" onchange="window.handleThemeFontUpload(event)">
                        <button style="width:100%;padding:10px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#333;cursor:pointer;" onclick="document.getElementById('themeFontFileInput').click()">
                            选取本地字体文件 (.ttf / .otf / .woff)
                        </button>
                    </div>

                    <div id="installedFontsList" style="margin-top:12px;display:flex;flex-direction:column;gap:6px;"></div>
                </div>
            </div>

            <!-- 卡片 5：主题配置方案管理器 -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <div>
                        <div style="font-size:14px;font-weight:700;color:#222;">主题方案备份</div>
                        <div style="font-size:12px;color:#888;">保存当前的壁纸与色彩配置</div>
                    </div>
                    <button style="padding:4px 10px;font-size:11.5px;border-radius:6px;border:none;background:#07c160;color:#fff;font-weight:600;cursor:pointer;" onclick="window.openNewThemeProfileDialog()">
                        ＋ 新建方案
                    </button>
                </div>
                <div id="themeProfileList" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;"></div>
            </div>
        `;

        initHsvCanvasPicker();
        renderProfileChips();
        renderInstalledFontsList();
    }

    // 🌸 触发桌面手拖排版模式
    window.triggerDesktopCustomLayoutMode = function () {
        if (typeof window.closePhoneApp === 'function') window.closePhoneApp();
        setTimeout(() => {
            if (typeof window.enterDesktopBlockLayoutMode === 'function') {
                window.enterDesktopBlockLayoutMode();
            } else if (typeof showToast === 'function') {
                showToast('排版引擎加载中，请稍候...');
            }
        }, 160);
    };

    window.triggerResetDesktopBlockOffsets = function () {
        if (typeof window.resetDesktopBlockOffsets === 'function') {
            window.resetDesktopBlockOffsets();
        } else {
            localStorage.removeItem('mcyt_desktop_block_offsets_v1');
            if (typeof showToast === 'function') showToast('已恢复桌面默认排版');
        }
        const appModalBody = document.getElementById('appModalBody');
        if (appModalBody) {
            window.renderThemeApp(appModalBody);
            const b = document.getElementById('widgetsSettingsBody');
            const a = document.getElementById('widgetsCollapseArrow');
            if (b && a) { b.style.display = 'block'; a.textContent = '▼ 收起'; }
        }
    };

    window.toggleThemeTargetDropdown = function () {
        const menu = document.getElementById('themeHsvTargetDropdownMenu');
        if (menu) {
            menu.style.display = (menu.style.display === 'none') ? 'flex' : 'none';
        }
    };

    window.selectHsvTarget = function (targetKey) {
        window.onHsvTargetChange(targetKey);
        const label = document.getElementById('themeHsvTargetDropdownLabel');
        if (label) label.textContent = HSV_TARGET_NAMES[targetKey];
        const menu = document.getElementById('themeHsvTargetDropdownMenu');
        if (menu) menu.style.display = 'none';
    };

    window.toggleWidgetsSettingsCollapse = function () {
        const body = document.getElementById('widgetsSettingsBody');
        const arrow = document.getElementById('widgetsCollapseArrow');
        if (!body || !arrow) return;
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
        arrow.textContent = isHidden ? '▼ 收起' : '▶ 展开';
    };

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
            const b = document.getElementById('widgetsSettingsBody');
            const a = document.getElementById('widgetsCollapseArrow');
            if (b && a) { b.style.display = 'block'; a.textContent = '▼ 收起'; }
        }

        if (typeof showToast === 'function') {
            showToast(`已将${widgetKey === 'calendar' ? '日历组件' : '待办便签'}移至第 ${targetPage} 页`);
        }
    };

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

    window.onHsvManualInputChange = function (channel, val) {
        let num = parseInt(val, 10);
        if (isNaN(num)) num = 0;
        if (channel === 'h') {
            hsvState.h = Math.max(0, Math.min(360, num));
            if (window.refreshHsvWheelCanvas) window.refreshHsvWheelCanvas();
        } else if (channel === 's') {
            hsvState.s = Math.max(0, Math.min(100, num));
            if (window.updateHsvHandles) window.updateHsvHandles();
        } else if (channel === 'v') {
            hsvState.v = Math.max(0, Math.min(100, num));
            if (window.updateHsvHandles) window.updateHsvHandles();
        }
    };

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
        root.style.setProperty('--theme-main-pink', '#07c160');
        root.style.setProperty('--theme-main-white', '#ffffff');
        root.style.setProperty('--theme-sub-white', '#f7f7f7');
        root.style.setProperty('--app-icon-label-color', '#222222');
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

        applyThemeModeDirect(mode);
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

        if (typeof showToast === 'function') showToast(`[${HSV_TARGET_NAMES[currentHsvTarget]}] 色彩已永久保存！`);
    };

    function initHsvCanvasPicker() {
        const box = document.getElementById('hsvWheelBox');
        const canvas = document.getElementById('hsvWheelCanvas');
        const rHandle = document.getElementById('hsvRingHandle');
        const tHandle = document.getElementById('hsvTriangleHandle');
        if (!box || !canvas || !rHandle || !tHandle) return;

        const ctx = canvas.getContext('2d');
        const size = 440;
        const center = size / 2;
        const outerR = size / 2 - 8;
        const innerR = outerR - 34;
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
            const scale = (boxRect.width || 220) / size;

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
            const inH = document.getElementById('inputValH');
            const inS = document.getElementById('inputValS');
            const inV = document.getElementById('inputValV');

            if (sH) sH.value = hsvState.h;
            if (sS) {
                sS.value = hsvState.s;
                sS.style.background = `linear-gradient(to right, #ffffff, rgb(${pureRgb.r},${pureRgb.g},${pureRgb.b}))`;
            }
            if (sV) {
                sV.value = hsvState.v;
                sV.style.background = `linear-gradient(to right, #000000, rgb(${pureRgb.r},${pureRgb.g},${pureRgb.b}))`;
            }

            if (inH && document.activeElement !== inH) inH.value = hsvState.h;
            if (inS && document.activeElement !== inS) inS.value = hsvState.s;
            if (inV && document.activeElement !== inV) inV.value = hsvState.v;

            const hex = rgbToHex(curRgb.r, curRgb.g, curRgb.b);
            previewColorLive(hex);
        }

        window.updateHsvHandles = updateHandlesAndSliders;

        function onPointerDown(e) {
            if (e.cancelable) e.preventDefault();
            const rect = box.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const scale = size / rect.width;
            const px = (clientX - rect.left) * scale;
            const py = (clientY - rect.top) * scale;

            const dx = px - center;
            const dy = py - center;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist >= triR + 4 && dist <= outerR + 10) {
                hsvState.activeDrag = 'ring';
                updateRingFromPoint(dx, dy);
            } else {
                hsvState.activeDrag = 'triangle';
                updateTriangleFromPoint(px, py);
            }
        }

        function onPointerMove(e) {
            if (!hsvState.activeDrag) return;
            if (e.cancelable) e.preventDefault();
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

        box.addEventListener('touchstart', onPointerDown, { passive: false });
        window.addEventListener('touchmove', onPointerMove, { passive: false });
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

    // 水滴吸色
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
                <button class="btn-primary" style="flex:1;background:#07c160;border:none;" id="pipetteConfirmBtn">选取此颜色</button>
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
                <button class="btn-secondary" style="flex:1;" id="cropUseOriginalBtn">使用原图</button>
                <button class="btn-primary" style="flex:1.4;background:#07c160;border:none;" id="cropConfirmBtn">完成裁剪</button>
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
        const appModalBody = document.getElementById('appModalBody');
        if (appModalBody && activeThemeTab === 'system') {
            const body = document.getElementById('fontLibraryBody');
            const arrow = document.getElementById('fontCollapseArrow');
            if (body && arrow) { body.style.display = 'block'; arrow.textContent = '▼ 收起'; }
        }
    };

    window.handleUnifiedFontImport = function (formatType) {
        const codeInput = document.getElementById('fontCodeInput_' + formatType);
        const remarkInput = document.getElementById('fontRemarkInput_' + formatType);
        if (!codeInput) return;

        const rawCode = (codeInput.value || '').trim();
        const remark = (remarkInput && remarkInput.value.trim()) || '自定义字体';

        if (!rawCode) {
            if (typeof showToast === 'function') showToast('请输入对应的字体代码');
            return;
        }

        let familyName = '';
        let cssText = '';
        let linkHrefs = [];

        if (formatType === 'html') {
            const parser = new DOMParser();
            const doc = parser.parseFromString(rawCode, 'text/html');

            const links = doc.querySelectorAll('link[href]');
            links.forEach(l => linkHrefs.push(l.getAttribute('href')));

            const styleTags = doc.querySelectorAll('style');
            styleTags.forEach(s => { cssText += s.textContent + '\n'; });

            const match = cssText.match(/font-family:\s*["']?([^'";\n]+)["']?/i);
            if (match && match[1]) {
                familyName = match[1].trim();
            }
        } else {
            cssText = rawCode;
            const match = rawCode.match(/font-family:\s*["']?([^'";\n]+)["']?/i);
            if (match && match[1]) {
                familyName = match[1].trim();
            }
        }

        if (!familyName) {
            familyName = 'CustomFont_' + Date.now();
        }

        saveFontRecord({
            id: 'font_' + Date.now(),
            name: remark,
            family: familyName,
            type: formatType,
            code: cssText,
            linkHrefs: linkHrefs
        });

        applyGlobalFontForce(familyName, cssText, linkHrefs);
        renderInstalledFontsList();
        codeInput.value = '';
        if (typeof showToast === 'function') showToast(`字体 [${remark}] 已全局生效`, 'success');
    };

    window.handleThemeFontUpload = function (event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (evt) {
            const fontName = 'LocalFont_' + Date.now();
            const dataUrl = evt.target.result;
            const ext = (file.name.split('.').pop() || 'woff2').toLowerCase();
            const formatMap = { ttf: 'truetype', otf: 'opentype', woff: 'woff', woff2: 'woff2' };
            const fmt = formatMap[ext] || 'woff2';
            const cssText = `@font-face { font-family: "${fontName}"; src: url("${dataUrl}") format("${fmt}"); font-display: swap; }`;

            try {
                saveFontRecord({
                    id: 'font_' + Date.now(),
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    family: fontName,
                    type: 'local',
                    code: cssText,
                    linkHrefs: []
                });
                applyGlobalFontForce(fontName, cssText, []);
                renderInstalledFontsList();
                if (typeof showToast === 'function') showToast('本地字体安装并应用成功');
            } catch (err) {
                if (typeof showToast === 'function') showToast('字体文件过大，请换较小文件');
            }
        };
        reader.readAsDataURL(file);
    };

    function applyGlobalFontForce(familyName, cssText = '', linkHrefs = []) {
        const root = document.documentElement;
        root.style.setProperty('--app-font', `"${familyName}", -apple-system, sans-serif`);

        let linkContainer = document.getElementById('globalDynamicFontLinks');
        if (!linkContainer) {
            linkContainer = document.createElement('div');
            linkContainer.id = 'globalDynamicFontLinks';
            linkContainer.style.display = 'none';
            document.head.appendChild(linkContainer);
        }
        linkContainer.innerHTML = '';
        (linkHrefs || []).forEach(href => {
            if (!href) return;
            const linkEl = document.createElement('link');
            linkEl.rel = 'stylesheet';
            linkEl.href = href;
            linkEl.crossOrigin = 'anonymous';
            linkContainer.appendChild(linkEl);
        });

        let resourceStyle = document.getElementById('globalDynamicFontResourceTag');
        if (!resourceStyle) {
            resourceStyle = document.createElement('style');
            resourceStyle.id = 'globalDynamicFontResourceTag';
            document.head.appendChild(resourceStyle);
        }
        resourceStyle.textContent = cssText || '';

        let forceStyle = document.getElementById('globalDynamicFontStyleTag');
        if (!forceStyle) {
            forceStyle = document.createElement('style');
            forceStyle.id = 'globalDynamicFontStyleTag';
            document.head.appendChild(forceStyle);
        }
        forceStyle.textContent = `
            * {
                font-family: "${familyName}", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
            }
        `;

        try {
            localStorage.setItem('mcyt_active_font_family', familyName);
            localStorage.setItem('mcyt_active_font_code', cssText || '');
            localStorage.setItem('mcyt_active_font_links', JSON.stringify(linkHrefs || []));
        } catch (_) {}
    }

    function saveFontRecord(fontItem) {
        let list = [];
        try { list = JSON.parse(localStorage.getItem('mcyt_installed_fonts') || '[]'); } catch (e) { list = []; }
        list.push(fontItem);
        try {
            localStorage.setItem('mcyt_installed_fonts', JSON.stringify(list));
        } catch (e) {}
    }

    function renderInstalledFontsList() {
        const container = document.getElementById('installedFontsList');
        if (!container) return;

        let list = [];
        try { list = JSON.parse(localStorage.getItem('mcyt_installed_fonts') || '[]'); } catch (e) { list = []; }

        if (list.length === 0) {
            container.innerHTML = `<div style="font-size:11px;color:#999;text-align:center;">暂无自定义字体</div>`;
            return;
        }

        container.innerHTML = list.map(item => `
            <div style="display:flex;justify-content:space-between;align-items:center;background:#f9f9f9;padding:6px 10px;border-radius:6px;border:1px solid #eee;">
                <div style="display:flex;flex-direction:column;">
                    <span style="font-size:12px;font-weight:600;color:#222;">${item.name}</span>
                    <span style="font-size:10px;color:#888;">${item.family}</span>
                </div>
                <div style="display:flex;gap:6px;">
                    <button style="padding:2px 8px;font-size:10.5px;border-radius:4px;border:1px solid #ddd;background:#fff;cursor:pointer;" onclick="window.reapplyFontItem('${item.id}')">应用</button>
                    <button style="padding:2px 8px;font-size:10.5px;border-radius:4px;border:1px solid #ffdcd9;background:#fff;color:#fa5151;cursor:pointer;" onclick="window.removeFontItem('${item.id}')">删除</button>
                </div>
            </div>
        `).join('');
    }

    window.reapplyFontItem = function (id) {
        let list = JSON.parse(localStorage.getItem('mcyt_installed_fonts') || '[]');
        const target = list.find(x => x.id === id);
        if (target) {
            applyGlobalFontForce(target.family, target.code || '', target.linkHrefs || []);
            if (typeof showToast === 'function') showToast('已应用字体: ' + target.name);
        }
    };

    window.removeFontItem = function (id) {
        let list = JSON.parse(localStorage.getItem('mcyt_installed_fonts') || '[]');
        list = list.filter(x => x.id !== id);
        localStorage.setItem('mcyt_installed_fonts', JSON.stringify(list));
        renderInstalledFontsList();
    };

    // 配置方案管理器（仿微信原生无弹窗浮层输入）
    function getStoredProfiles() {
        try { return JSON.parse(localStorage.getItem('mcyt_theme_profiles') || '[]'); } catch (e) { return []; }
    }

    function renderProfileChips() {
        const container = document.getElementById('themeProfileList');
        if (!container) return;

        const profiles = getStoredProfiles();
        const activeName = localStorage.getItem('mcyt_active_profile_name') || '';

        if (profiles.length === 0) {
            container.innerHTML = `<div style="font-size:11.5px;color:#999;">暂无方案，点击上方“新建方案”保存</div>`;
            return;
        }

        container.innerHTML = profiles.map(p => `
            <div style="display:inline-flex;align-items:center;gap:6px;background:${p.name === activeName ? '#e8f7ed' : '#f9f9f9'};border:1px solid ${p.name === activeName ? '#07c160' : '#e0e0e0'};padding:4px 10px;border-radius:16px;cursor:pointer;" onclick="window.applyThemeProfile('${p.name}')">
                <span style="font-size:11.5px;font-weight:${p.name === activeName ? '700' : '500'};color:${p.name === activeName ? '#07c160' : '#333'};">${p.name}</span>
                <span style="font-size:10px;color:#999;cursor:pointer;" onclick="event.stopPropagation(); window.deleteThemeProfile('${p.name}')">✕</span>
            </div>
        `).join('');
    }

    // 仿微信居中浮层：新建主题方案
    window.openNewThemeProfileDialog = function () {
        let modal = document.getElementById('themeProfilePromptModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'themeProfilePromptModal';
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:12px;width:100%;max-width:300px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="font-size:14px;font-weight:700;color:#222;margin-bottom:8px;">新建主题方案</div>
                <input type="text" id="newProfileNameInput" placeholder="请输入方案名称" value="自定义主题方案" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12.5px;outline:none;margin-bottom:14px;">
                <div style="display:flex;gap:8px;">
                    <button style="flex:1;padding:8px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;" onclick="document.getElementById('themeProfilePromptModal').remove()">取消</button>
                    <button style="flex:1;padding:8px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;" onclick="window.confirmSaveNewProfileFromDialog()">保存</button>
                </div>
            </div>
        `;
    };

    window.confirmSaveNewProfileFromDialog = function () {
        const input = document.getElementById('newProfileNameInput');
        const name = input ? input.value.trim() : '';
        if (!name) return;

        const profiles = getStoredProfiles();
        const curRgb = hsvToRgb(hsvState.h, hsvState.s, hsvState.v);
        const hex = rgbToHex(curRgb.r, curRgb.g, curRgb.b);

        const newProfile = {
            name: name,
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

        const modal = document.getElementById('themeProfilePromptModal');
        if (modal) modal.remove();

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
        if (appModalBody && activeThemeTab === 'system') {
            const sub = document.getElementById('themeAppSubContent');
            if (sub) renderSystemThemeSubView(sub);
        }

        applyThemeModeDirect(currentThemeMode);
        if (typeof showToast === 'function') showToast('已切换至方案: ' + target.name);
    };

    window.deleteThemeProfile = function (profileName) {
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
        let actLinks = [];
        try { actLinks = JSON.parse(localStorage.getItem('mcyt_active_font_links') || '[]'); } catch (_) {}
        if (actFam) applyGlobalFontForce(actFam, actCode, actLinks);
    } catch (_) {}
})();
