/**
 * js/apps/theme/theme-app.js
 * 🎀 个性化与主题中心 App
 * 职责：本地相册壁纸导入与Base64持久化、本地字体加载、主题模式切换、粉色指针选中交互
 */

(function () {
    'use strict';

    // 1. 渲染个性化 App 内部主视图
    window.renderThemeApp = function (container) {
        if (!container) return;

        const currentMode = window.currentThemeMode || 'auto';
        const savedCustomColor = localStorage.getItem('mcyt_phone_custom_color') || '#ff5c8a';

        container.innerHTML = `
            <!-- 卡片 1：壁纸管理（本地相册直选，告别图床） -->
            <div class="theme-setting-card">
                <div class="theme-setting-title">
                    <span>🖼️ 壁纸设置（本地相册导入）</span>
                    <span style="font-size:11px;color:var(--primary);font-weight:bold;">无须图床</span>
                </div>
                <div class="theme-setting-desc">
                    点击直接选取手机相册照片，系统将自动转存并重新分析状态栏光影明暗。
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px;">
                    <!-- 隐藏的本地文件选择器 -->
                    <input type="file" id="localLockFileInput" accept="image/*" style="display:none;" onchange="window.handleWallpaperUpload(event, 'lock')">
                    <input type="file" id="localDesktopFileInput" accept="image/*" style="display:none;" onchange="window.handleWallpaperUpload(event, 'desktop')">

                    <div style="display:flex;gap:8px;">
                        <button class="btn-secondary" style="flex:1;" onclick="document.getElementById('localLockFileInput').click()">
                            📱 选取锁屏壁纸
                        </button>
                        <button class="btn-secondary" style="flex:1;" onclick="document.getElementById('localDesktopFileInput').click()">
                            🖥️ 选取桌面壁纸
                        </button>
                    </div>

                    <button class="btn-secondary small" style="background:#fff8f9;color:var(--text2);margin-top:2px;" onclick="window.restoreDefaultWallpapers()">
                        🔄 恢复默认包内壁纸
                    </button>
                </div>
            </div>

            <!-- 卡片 2：色彩感知与指针单选模式 -->
            <div class="theme-setting-card">
                <div class="theme-setting-title">
                    <span>🌓 字体与状态栏颜色模式</span>
                </div>
                <div class="theme-setting-desc">
                    当背景太白时自动变黑，或指定固定显示风格。下方选项已接入粉色指针指示。
                </div>

                <!-- 粉色指针指示的单选列表（消除生硬方框） -->
                <div class="radio-group" style="flex-direction:column;align-items:flex-start;gap:8px;padding:4px 0 10px 10px;">
                    <div style="display:flex;align-items:center;">
                        <input type="radio" name="themeModeRadio" id="modeAuto" value="auto" ${currentMode === 'auto' ? 'checked' : ''} onchange="window.onThemeModeRadioChange(this.value)">
                        <label for="modeAuto">🤖 自动识别壁纸明暗反色</label>
                    </div>
                    <div style="display:flex;align-items:center;">
                        <input type="radio" name="themeModeRadio" id="modeDark" value="dark" ${currentMode === 'dark' ? 'checked' : ''} onchange="window.onThemeModeRadioChange(this.value)">
                        <label for="modeDark">⚪ 强制纯白质感</label>
                    </div>
                    <div style="display:flex;align-items:center;">
                        <input type="radio" name="themeModeRadio" id="modeLight" value="light" ${currentMode === 'light' ? 'checked' : ''} onchange="window.onThemeModeRadioChange(this.value)">
                        <label for="modeLight">⚫ 强制黑巧深色</label>
                    </div>
                    <div style="display:flex;align-items:center;">
                        <input type="radio" name="themeModeRadio" id="modeCustom" value="custom" ${currentMode === 'custom' ? 'checked' : ''} onchange="window.onThemeModeRadioChange(this.value)">
                        <label for="modeCustom">🎨 自定义固定颜色</label>
                    </div>
                </div>

                <!-- 手动选色控件（仅自定义模式展开） -->
                <div id="themeCustomColorWrap" style="display:${currentMode === 'custom' ? 'flex' : 'none'};align-items:center;gap:10px;padding-top:6px;border-top:1px dashed #ffccd9;">
                    <input type="color" id="themeCustomColorPicker" value="${savedCustomColor}" style="width:36px;height:36px;border:none;border-radius:8px;cursor:pointer;background:none;" onchange="window.onCustomColorPickerChange(this.value)">
                    <span style="font-size:12px;color:var(--text2);">点此选取全局状态栏与时钟颜色</span>
                </div>
            </div>

            <!-- 卡片 3：本地 TTF/OTF 自定义字体 -->
            <div class="theme-setting-card">
                <div class="theme-setting-title">
                    <span>🔤 本地自定义字体</span>
                    <span style="font-size:11px;color:var(--primary);">.ttf / .otf</span>
                </div>
                <div class="theme-setting-desc">
                    一键把手机内的字体包装载进整个模拟器系统。
                </div>
                <input type="file" id="themeFontFileInput" accept=".ttf,.otf,.woff,.woff2" style="display:none;" onchange="window.handleThemeFontUpload(event)">
                <button class="btn-primary" style="font-size:13px;padding:10px;" onclick="document.getElementById('themeFontFileInput').click()">
                    📁 从手机选择字体文件
                </button>
            </div>
        `;
    };

    // 2. 本地相册壁纸选取处理（转 Base64 存入 localStorage）
    window.handleWallpaperUpload = function (event, targetType) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const base64Data = e.target.result;
            const root = document.documentElement;

            if (targetType === 'lock') {
                localStorage.setItem('mcyt_custom_lock_bg', base64Data);
                root.style.setProperty('--lock-bg-url', `url('${base64Data}')`);
                if (window.currentThemeMode === 'auto' && typeof window.analyzeImageLuminance === 'function') {
                    window.analyzeImageLuminance(base64Data, window.applyColorTheme);
                }
                if (typeof showToast === 'function') showToast('📱 锁屏壁纸已成功更新！');
            } else if (targetType === 'desktop') {
                localStorage.setItem('mcyt_custom_desktop_bg', base64Data);
                root.style.setProperty('--desktop-bg-url', `url('${base64Data}')`);
                if (typeof showToast === 'function') showToast('🖥️ 桌面壁纸已成功更新！');
            }
        };
        reader.readAsDataURL(file);
    };

    // 3. 恢复包内默认壁纸
    window.restoreDefaultWallpapers = function () {
        localStorage.removeItem('mcyt_custom_lock_bg');
        localStorage.removeItem('mcyt_custom_desktop_bg');

        const defaultLock = 'assets/system/default_lock.jpg';
        const defaultDesktop = 'assets/system/default_desktop.jpg';
        const root = document.documentElement;

        root.style.setProperty('--lock-bg-url', `url('${defaultLock}')`);
        root.style.setProperty('--desktop-bg-url', `url('${defaultDesktop}')`);

        if (window.currentThemeMode === 'auto' && typeof window.analyzeImageLuminance === 'function') {
            window.analyzeImageLuminance(defaultLock, window.applyColorTheme);
        }
        if (typeof showToast === 'function') showToast('🔄 已恢复为默认壁纸！');
    };

    // 4. 颜色模式切换处理
    window.onThemeModeRadioChange = function (mode) {
        window.currentThemeMode = mode;
        localStorage.setItem('mcyt_phone_theme_mode', mode);

        const wrap = document.getElementById('themeCustomColorWrap');
        if (wrap) {
            wrap.style.display = (mode === 'custom') ? 'flex' : 'none';
        }

        if (mode === 'auto') {
            const currentLockBg = localStorage.getItem('mcyt_custom_lock_bg') || 'assets/system/default_lock.jpg';
            if (typeof window.analyzeImageLuminance === 'function') {
                window.analyzeImageLuminance(currentLockBg, window.applyColorTheme);
            }
        } else if (mode === 'custom') {
            const picker = document.getElementById('themeCustomColorPicker');
            const color = (picker && picker.value) ? picker.value : '#ff5c8a';
            window.onCustomColorPickerChange(color);
        } else {
            if (typeof window.applyColorTheme === 'function') {
                window.applyColorTheme(mode === 'light');
            }
        }
    };

    // 5. 自定义拾色器变动
    window.onCustomColorPickerChange = function (hexColor) {
        localStorage.setItem('mcyt_phone_custom_color', hexColor);
        const root = document.documentElement;
        root.style.setProperty('--status-color', hexColor);
        root.style.setProperty('--lock-text-color', hexColor);
        root.style.setProperty('--status-svg-fill', hexColor);
        root.style.setProperty('--star-glow-color', hexColor);
    };

    // 6. 本地自定义字体加载
    window.handleThemeFontUpload = function (event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (evt) {
            const fontName = 'UserFont_' + Date.now();
            const fontFace = new FontFace(fontName, evt.target.result);
            fontFace.load().then(function (loaded) {
                document.fonts.add(loaded);
                document.documentElement.style.setProperty('--app-font', `"${fontName}", -apple-system, sans-serif`);
                if (typeof showToast === 'function') {
                    showToast('🎉 字体已成功替换！');
                } else {
                    alert('🎉 字体已成功替换！');
                }
            }).catch(function () {
                if (typeof showToast === 'function') {
                    showToast('⚠️ 字体文件解析失败，请检查格式');
                } else {
                    alert('字体文件解析失败，请检查格式');
                }
            });
        };
        reader.readAsArrayBuffer(file);
    };
})();
