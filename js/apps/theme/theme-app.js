/**
 * js/apps/theme/theme-app.js
 * 🎀 个性化与主题中心 App
 * 职责：本地相册壁纸导入、专业级 HSV 色相环+三角拾色器、图二粉色像素指针单选、本地 TTF 字体装载、一键保存与重置
 */

(function () {
    'use strict';

    // 内部 HSV 拾色器全局状态
    let hsvState = {
        h: 330,  // 色相 0 ~ 360
        s: 64,   // 饱和度 0 ~ 100
        v: 100,  // 明度 0 ~ 100
        activeDrag: null // 'ring' | 'triangle' | null
    };

    // 暂存壁纸变量（用于提供“保存”与“取消/重置”能力）
    let pendingLockBg = null;
    let pendingDesktopBg = null;

    // --- HSV 工具算法函数集 ---
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
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
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

    // 1. 渲染个性化 App 内部主视图
    window.renderThemeApp = function (container) {
        if (!container) return;

        const currentMode = localStorage.getItem('mcyt_phone_theme_mode') || 'auto';
        const savedCustomColor = localStorage.getItem('mcyt_phone_custom_color') || '#ff5c8a';
        hsvState = hexToHsv(savedCustomColor);

        pendingLockBg = localStorage.getItem('mcyt_custom_lock_bg');
        pendingDesktopBg = localStorage.getItem('mcyt_custom_desktop_bg');

        container.innerHTML = `
            <!-- 卡片 1：壁纸管理（本地相册直选） -->
            <div class="theme-setting-card">
                <div class="theme-setting-title">
                    <span>🖼️ 壁纸设置（本地相册导入）</span>
                    <span style="font-size:11px;color:var(--primary);font-weight:bold;">无须图床</span>
                </div>
                <div class="theme-setting-desc">
                    选取手机相册照片装扮你的手机，点击保存后将永久生效。
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:10px;">
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

                    <div id="wallpaperStatusTip" style="font-size:11.5px;color:var(--text2);text-align:center;margin-top:2px;">
                        ${pendingLockBg ? '已载入自定义壁纸' : '当前使用默认包内壁纸'}
                    </div>
                </div>
            </div>

            <!-- 卡片 2：色彩感知与图二粉色指针单选模式 -->
            <div class="theme-setting-card">
                <div class="theme-setting-title">
                    <span>🌓 字体与状态栏颜色模式</span>
                </div>
                <div class="theme-setting-desc">
                    当背景太白时自动变黑，或指定固定显示风格。下方选项已接入粉色指针指示。
                </div>

                <!-- 图二标准指针项容器 -->
                <div class="theme-pointer-group">
                    <div class="theme-pointer-item" onclick="window.onThemeModeRadioChange('auto')">
                        <input type="radio" name="themeModeRadio" id="modeAuto" value="auto" ${currentMode === 'auto' ? 'checked' : ''}>
                        <label for="modeAuto">🤖 自动识别壁纸明暗反色</label>
                    </div>
                    <div class="theme-pointer-item" onclick="window.onThemeModeRadioChange('dark')">
                        <input type="radio" name="themeModeRadio" id="modeDark" value="dark" ${currentMode === 'dark' ? 'checked' : ''}>
                        <label for="modeDark">⚪ 强制纯白质感</label>
                    </div>
                    <div class="theme-pointer-item" onclick="window.onThemeModeRadioChange('light')">
                        <input type="radio" name="themeModeRadio" id="modeLight" value="light" ${currentMode === 'light' ? 'checked' : ''}>
                        <label for="modeLight">⚫ 强制黑巧深色</label>
                    </div>
                    <div class="theme-pointer-item" onclick="window.onThemeModeRadioChange('custom')">
                        <input type="radio" name="themeModeRadio" id="modeCustom" value="custom" ${currentMode === 'custom' ? 'checked' : ''}>
                        <label for="modeCustom">🎨 自定义固定颜色</label>
                    </div>
                </div>

                <!-- 图三同款：高级 HSV 色相环 + 三角形拾色器面盘 -->
                <div id="themeHsvPickerWrap" style="display:${currentMode === 'custom' ? 'block' : 'none'};">
                    <div class="hsv-picker-container">
                        <!-- 色相环与三角形绘制容器 -->
                        <div class="hsv-wheel-box" id="hsvWheelBox">
                            <canvas id="hsvWheelCanvas" class="hsv-wheel-canvas" width="420" height="420"></canvas>
                            <div class="hsv-ring-handle" id="hsvRingHandle"></div>
                            <div class="hsv-triangle-handle" id="hsvTriangleHandle"></div>
                        </div>

                        <!-- 底部 H / S / V 联动微调滑动条 -->
                        <div class="hsv-slider-group">
                            <div class="hsv-slider-row">
                                <span class="hsv-slider-label">H</span>
                                <div class="hsv-slider-track-wrap">
                                    <input type="range" class="hsv-slider-input" id="sliderH" min="0" max="360" value="${hsvState.h}">
                                </div>
                                <span class="hsv-slider-val" id="valH">${hsvState.h}</span>
                            </div>

                            <div class="hsv-slider-row">
                                <span class="hsv-slider-label">S</span>
                                <div class="hsv-slider-track-wrap">
                                    <input type="range" class="hsv-slider-input" id="sliderS" min="0" max="100" value="${hsvState.s}">
                                </div>
                                <span class="hsv-slider-val" id="valS">${hsvState.s}</span>
                            </div>

                            <div class="hsv-slider-row">
                                <span class="hsv-slider-label">V</span>
                                <div class="hsv-slider-track-wrap">
                                    <input type="range" class="hsv-slider-input" id="sliderV" min="0" max="100" value="${hsvState.v}">
                                </div>
                                <span class="hsv-slider-val" id="valV">${hsvState.v}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 统一保存与重置操作按钮区 -->
                <div class="theme-action-bar">
                    <button class="btn-primary" style="flex:2;" onclick="window.saveAndApplyAllThemes()">
                        💾 保存并应用设置
                    </button>
                    <button class="btn-secondary" style="flex:1;" onclick="window.restoreDefaultWallpapersAndColor()">
                        🔄 恢复原样
                    </button>
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
                <button class="btn-secondary" style="width:100%;" onclick="document.getElementById('themeFontFileInput').click()">
                    📁 从手机选择字体文件
                </button>
            </div>
        `;

        // 挂载色盘初始化
        initHsvCanvasPicker();
    };

    // 2. 专业级 HSV 拾色器绘制与触控交互核心
    function initHsvCanvasPicker() {
        const box = document.getElementById('hsvWheelBox');
        const canvas = document.getElementById('hsvWheelCanvas');
        const rHandle = document.getElementById('hsvRingHandle');
        const tHandle = document.getElementById('hsvTriangleHandle');
        if (!box || !canvas || !rHandle || !tHandle) return;

        const ctx = canvas.getContext('2d');
        const size = 420;
        const center = size / 2;
        const outerR = size / 2 - 8;
        const innerR = outerR - 26;
        const triR = innerR - 10;

        // 计算等边三角形三顶点 (顶部：纯白 S=0, V=100; 右侧：纯色 Hue; 底部：纯黑 V=0)
        function getTriangleVertices() {
            return {
                top: { x: center - triR * Math.cos(Math.PI / 6), y: center - triR * Math.sin(Math.PI / 6) },      // 纯白 S=0, V=100
                bottom: { x: center - triR * Math.cos(Math.PI / 6), y: center + triR * Math.sin(Math.PI / 6) },   // 纯黑 V=0
                right: { x: center + triR, y: center }                                                             // 纯色 S=100, V=100
            };
        }

        // 绘制完整 Canvas
        function renderColorWheel() {
            ctx.clearRect(0, 0, size, size);

            // 1. 绘制外层 360 度色相圆环
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

            // 2. 绘制内部三角形 (带当前色相 Hue 的明暗饱和度过渡)
            const v = getTriangleVertices();

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(v.top.x, v.top.y);
            ctx.lineTo(v.right.x, v.right.y);
            ctx.lineTo(v.bottom.x, v.bottom.y);
            ctx.closePath();
            ctx.clip();

            // 底层：白 -> 纯色 渐变
            const pureRgb = hsvToRgb(hsvState.h, 100, 100);
            const horizGrad = ctx.createLinearGradient(v.top.x, center, v.right.x, center);
            horizGrad.addColorStop(0, '#ffffff');
            horizGrad.addColorStop(1, `rgb(${pureRgb.r},${pureRgb.g},${pureRgb.b})`);
            ctx.fillStyle = horizGrad;
            ctx.fillRect(0, 0, size, size);

            // 叠加层：透明 -> 纯黑 渐变 (纵向明度过渡)
            const vertGrad = ctx.createLinearGradient(center, v.top.y, center, v.bottom.y);
            vertGrad.addColorStop(0, 'rgba(0,0,0,0)');
            vertGrad.addColorStop(1, '#000000');
            ctx.fillStyle = vertGrad;
            ctx.fillRect(0, 0, size, size);

            ctx.restore();

            // 更新手柄位置与滑动条
            updateHandlesAndSliders();
        }

        // 更新外圈手柄与内三角手柄
        function updateHandlesAndSliders() {
            const boxRect = box.getBoundingClientRect();
            const scale = boxRect.width / size;

            // 1. 色相环手柄
            const rad = (hsvState.h - 90) * Math.PI / 180;
            const ringMidR = (outerR + innerR) / 2;
            const ringX = (center + ringMidR * Math.cos(rad)) * scale;
            const ringY = (center + ringMidR * Math.sin(rad)) * scale;
            rHandle.style.left = `${ringX}px`;
            rHandle.style.top = `${ringY}px`;
            const pureRgb = hsvToRgb(hsvState.h, 100, 100);
            rHandle.style.backgroundColor = `rgb(${pureRgb.r},${pureRgb.g},${pureRgb.b})`;

            // 2. 三角形手柄 (根据 S, V 反推坐标)
            const v = getTriangleVertices();
            const sat = hsvState.s / 100;
            const val = hsvState.v / 100;

            // 水平位置由饱和度与明度决定
            const curLeftX = v.top.x;
            const curRightX = v.right.x;
            const x = curLeftX + (curRightX - curLeftX) * sat * val;

            // 垂直跨度与坐标
            const topY = v.top.y + (v.right.y - v.top.y) * sat;
            const botY = v.bottom.y + (v.right.y - v.bottom.y) * sat;
            const y = topY + (botY - topY) * (1 - val);

            tHandle.style.left = `${x * scale}px`;
            tHandle.style.top = `${y * scale}px`;
            const curRgb = hsvToRgb(hsvState.h, hsvState.s, hsvState.v);
            tHandle.style.backgroundColor = `rgb(${curRgb.r},${curRgb.g},${curRgb.b})`;

            // 3. 同步底部滑动条
            const sH = document.getElementById('sliderH');
            const sS = document.getElementById('sliderS');
            const sV = document.getElementById('sliderV');
            const vH = document.getElementById('valH');
            const vS = document.getElementById('valS');
            const vV = document.getElementById('valV');
            if (sH && vH) { sH.value = hsvState.h; vH.textContent = hsvState.h; }
            if (sS && vS) { sS.value = hsvState.s; vS.textContent = hsvState.s; }
            if (sV && vV) { sV.value = hsvState.v; vV.textContent = hsvState.v; }

            // 即时应用视觉预览
            const hex = rgbToHex(curRgb.r, curRgb.g, curRgb.b);
            previewColorLive(hex);
        }

        // 触控/鼠标事件监听
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

            if (dist >= innerR - 6 && dist <= outerR + 6) {
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
            const v = getTriangleVertices();
            // 归一化限制在三角形区域内
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

        // 联动滑动条改变事件
        const sH = document.getElementById('sliderH');
        const sS = document.getElementById('sliderS');
        const sV = document.getElementById('sliderV');
        if (sH) sH.addEventListener('input', (e) => { hsvState.h = parseInt(e.target.value); renderColorWheel(); });
        if (sS) sS.addEventListener('input', (e) => { hsvState.s = parseInt(e.target.value); updateHandlesAndSliders(); });
        if (sV) sV.addEventListener('input', (e) => { hsvState.v = parseInt(e.target.value); updateHandlesAndSliders(); });

        renderColorWheel();
    }

    // 实时预览颜色
    function previewColorLive(hex) {
        const root = document.documentElement;
        root.style.setProperty('--status-color', hex);
        root.style.setProperty('--lock-text-color', hex);
        root.style.setProperty('--status-svg-fill', hex);
        root.style.setProperty('--star-glow-color', hex);
    }

    // 3. 本地相册壁纸选取处理（存至临时 pending，待保存后统一持久化）
    window.handleWallpaperUpload = function (event, targetType) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const base64Data = e.target.result;
            const root = document.documentElement;

            if (targetType === 'lock') {
                pendingLockBg = base64Data;
                root.style.setProperty('--lock-bg-url', `url('${base64Data}')`);
                if (typeof showToast === 'function') showToast('📱 锁屏壁纸已选定，点击保存后生效！');
            } else if (targetType === 'desktop') {
                pendingDesktopBg = base64Data;
                root.style.setProperty('--desktop-bg-url', `url('${base64Data}')`);
                if (typeof showToast === 'function') showToast('🖥️ 桌面壁纸已选定，点击保存后生效！');
            }

            const tip = document.getElementById('wallpaperStatusTip');
            if (tip) tip.textContent = '壁纸已就绪（待保存）';
        };
        reader.readAsDataURL(file);
    };

    // 4. 模式切换处理
    window.onThemeModeRadioChange = function (mode) {
        window.currentThemeMode = mode;
        const wrap = document.getElementById('themeHsvPickerWrap');
        if (wrap) {
            wrap.style.display = (mode === 'custom') ? 'block' : 'none';
        }

        const radios = document.querySelectorAll('input[name="themeModeRadio"]');
        radios.forEach(r => { r.checked = (r.value === mode); });

        if (mode === 'auto') {
            const currentLock = pendingLockBg || localStorage.getItem('mcyt_custom_lock_bg') || 'assets/system/default_lock.jpg';
            if (typeof window.analyzeImageLuminance === 'function') {
                window.analyzeImageLuminance(currentLock, window.applyColorTheme);
            }
        } else if (mode === 'custom') {
            const curRgb = hsvToRgb(hsvState.h, hsvState.s, hsvState.v);
            previewColorLive(rgbToHex(curRgb.r, curRgb.g, curRgb.b));
        } else {
            if (typeof window.applyColorTheme === 'function') {
                window.applyColorTheme(mode === 'light');
            }
        }
    };

    // 5. 核心：保存并应用所有设置（永久持久化进 localStorage）
    window.saveAndApplyAllThemes = function () {
        const mode = window.currentThemeMode || 'auto';
        localStorage.setItem('mcyt_phone_theme_mode', mode);

        // 持久化壁纸
        if (pendingLockBg) {
            localStorage.setItem('mcyt_custom_lock_bg', pendingLockBg);
        }
        if (pendingDesktopBg) {
            localStorage.setItem('mcyt_custom_desktop_bg', pendingDesktopBg);
        }

        // 持久化自定义色彩
        const curRgb = hsvToRgb(hsvState.h, hsvState.s, hsvState.v);
        const hex = rgbToHex(curRgb.r, curRgb.g, curRgb.b);
        localStorage.setItem('mcyt_phone_custom_color', hex);

        // 重新调用外壳主题生效
        if (typeof window.applyColorTheme === 'function') {
            if (mode === 'auto') {
                const targetLock = pendingLockBg || 'assets/system/default_lock.jpg';
                window.analyzeImageLuminance(targetLock, window.applyColorTheme);
            } else {
                window.applyColorTheme(mode === 'light');
            }
        }

        if (typeof showToast === 'function') {
            showToast('🎉 个性化主题与壁纸已永久保存！');
        } else {
            alert('🎉 个性化主题与壁纸已永久保存！');
        }
    };

    // 6. 恢复原样重置核心
    window.restoreDefaultWallpapersAndColor = function () {
        localStorage.removeItem('mcyt_custom_lock_bg');
        localStorage.removeItem('mcyt_custom_desktop_bg');
        localStorage.removeItem('mcyt_phone_theme_mode');
        localStorage.removeItem('mcyt_phone_custom_color');

        pendingLockBg = null;
        pendingDesktopBg = null;
        window.currentThemeMode = 'auto';

        const root = document.documentElement;
        root.style.setProperty('--lock-bg-url', `url('assets/system/default_lock.jpg')`);
        root.style.setProperty('--desktop-bg-url', `url('assets/system/default_desktop.jpg')`);

        if (typeof window.analyzeImageLuminance === 'function') {
            window.analyzeImageLuminance('assets/system/default_lock.jpg', window.applyColorTheme);
        }

        // 重新渲染面板
        const appModalBody = document.getElementById('appModalBody');
        if (appModalBody) {
            window.renderThemeApp(appModalBody);
        }

        if (typeof showToast === 'function') {
            showToast('🔄 已全部恢复为出厂默认设置！');
        } else {
            alert('已全部恢复为出厂默认设置！');
        }
    };

    // 7. 本地自定义字体加载
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
                    showToast('🎉 本地字体装载成功！');
                } else {
                    alert('🎉 本地字体装载成功！');
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
