/**
 * js/apps/theme/theme-app.js
 * 🎀 个性化与主题中心 App
 * 职责：壁纸选取与自由设备比例裁剪、保存/恢复默认壁纸、正等边三角形专业 HSV 色相盘、
 *       支持放大缩放的双黑边环水滴吸色器、仿 Win98 复古粉白甜心弹窗、多套配置方案管理与扩展字体
 */

(function () {
    'use strict';

    // 内部 HSV 拾色器全局状态
    let hsvState = {
        h: 61,   // 色相 0 ~ 360
        s: 82,   // 饱和度 0 ~ 100
        v: 89,   // 明度 0 ~ 100
        activeDrag: null // 'ring' | 'triangle' | null
    };

    // 暂存壁纸变量
    let pendingLockBg = null;
    let pendingDesktopBg = null;

    // 当前主题模式与环境底色状态
    let currentThemeMode = 'auto';
    let isCurrentPlateDark = true;

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

        currentThemeMode = localStorage.getItem('mcyt_phone_theme_mode') || 'auto';
        const savedCustomColor = localStorage.getItem('mcyt_phone_custom_color') || '#e0d826';
        hsvState = hexToHsv(savedCustomColor);

        pendingLockBg = localStorage.getItem('mcyt_custom_lock_bg');
        pendingDesktopBg = localStorage.getItem('mcyt_custom_desktop_bg');

        // 检测背景明度以确定色盘自适应状态
        detectBackgroundLuminanceForPlate();

        container.innerHTML = `
            <!-- 卡片 1：壁纸设置（本地相册导入 + 自定义裁剪） -->
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
                            确认保存当前壁纸
                        </button>
                        <button class="btn-secondary" style="flex:1;" onclick="window.restoreDefaultWallpapersOnly()">
                            恢复默认壁纸
                        </button>
                    </div>
                </div>
            </div>

            <!-- 卡片 2：色彩感知与指针单选模式 -->
            <div class="theme-setting-card">
                <div class="theme-setting-title">
                    <span>字体与状态栏颜色模式</span>
                </div>
                <div class="theme-setting-desc">
                    当背景过亮时自动反色变深，或指定固定风格。
                </div>

                <!-- 指针单选项 -->
                <div class="theme-pointer-group">
                    <div class="theme-pointer-item" onclick="window.onThemeModeRadioChange('auto')">
                        <input type="radio" name="themeModeRadio" id="modeAuto" value="auto" ${currentThemeMode === 'auto' ? 'checked' : ''}>
                        <label for="modeAuto">自动识别壁纸明暗反色</label>
                    </div>
                    <div class="theme-pointer-item" onclick="window.onThemeModeRadioChange('dark')">
                        <input type="radio" name="themeModeRadio" id="modeDark" value="dark" ${currentThemeMode === 'dark' ? 'checked' : ''}>
                        <label for="modeDark">强制纯白质感</label>
                    </div>
                    <div class="theme-pointer-item" onclick="window.onThemeModeRadioChange('light')">
                        <input type="radio" name="themeModeRadio" id="modeLight" value="light" ${currentThemeMode === 'light' ? 'checked' : ''}>
                        <label for="modeLight">强制黑巧深色</label>
                    </div>
                    <div class="theme-pointer-item" onclick="window.onThemeModeRadioChange('custom')">
                        <input type="radio" name="themeModeRadio" id="modeCustom" value="custom" ${currentThemeMode === 'custom' ? 'checked' : ''}>
                        <label for="modeCustom">自定义固定颜色</label>
                    </div>
                </div>

                <!-- 高级 HSV 色相环 + 绝对正等边三角形拾色面盘 -->
                <div id="themeHsvPickerWrap" style="display:${currentThemeMode === 'custom' ? 'block' : 'none'};">
                    <div class="hsv-picker-container ${isCurrentPlateDark ? 'theme-dark-plate' : 'theme-light-plate'}" id="hsvPickerContainer">
                        
                        <div class="hsv-wheel-box" id="hsvWheelBox">
                            <canvas id="hsvWheelCanvas" class="hsv-wheel-canvas" width="460" height="460"></canvas>
                            <div class="hsv-ring-handle" id="hsvRingHandle"></div>
                            <div class="hsv-triangle-handle" id="hsvTriangleHandle"></div>
                        </div>

                        <!-- 截图同款：水滴带加号吸色器按键 -->
                        <div class="hsv-tools-row">
                            <input type="file" id="pipetteImageInput" accept="image/*" style="display:none;" onchange="window.handlePipetteImageSelected(event)">
                            <button class="hsv-pipette-btn" title="导入参考图片吸色" onclick="document.getElementById('pipetteImageInput').click()">
                                <svg viewBox="0 0 24 24">
                                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                                    <path d="M12 11v4" stroke-linecap="round"></path>
                                    <path d="M10 13h4" stroke-linecap="round"></path>
                                </svg>
                            </button>
                        </div>

                        <!-- 底部 H / S / V 滑块与双向数字输入框 -->
                        <div class="hsv-slider-group">
                            <div class="hsv-slider-row">
                                <span class="hsv-slider-label">H</span>
                                <div class="hsv-slider-track-wrap">
                                    <input type="range" class="hsv-slider-input" id="sliderH" min="0" max="360" value="${hsvState.h}">
                                </div>
                                <input type="number" class="hsv-num-input" id="inputNumH" min="0" max="360" value="${hsvState.h}" onchange="window.onHsvNumInputChange('h', this.value)">
                            </div>

                            <div class="hsv-slider-row">
                                <span class="hsv-slider-label">S</span>
                                <div class="hsv-slider-track-wrap">
                                    <input type="range" class="hsv-slider-input" id="sliderS" min="0" max="100" value="${hsvState.s}">
                                </div>
                                <input type="number" class="hsv-num-input" id="inputNumS" min="0" max="100" value="${hsvState.s}" onchange="window.onHsvNumInputChange('s', this.value)">
                            </div>

                            <div class="hsv-slider-row">
                                <span class="hsv-slider-label">V</span>
                                <div class="hsv-slider-track-wrap">
                                    <input type="range" class="hsv-slider-input" id="sliderV" min="0" max="100" value="${hsvState.v}">
                                </div>
                                <input type="number" class="hsv-num-input" id="inputNumV" min="0" max="100" value="${hsvState.v}" onchange="window.onHsvNumInputChange('v', this.value)">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 单一主键：保存并应用设置 -->
                <div class="theme-action-bar">
                    <button class="btn-primary" style="width:100%;" onclick="window.saveAndApplyColorThemeOnly()">
                        保存并应用设置
                    </button>
                </div>
            </div>

            <!-- 卡片 3：多套主题配置方案管理器 -->
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
                <div class="profile-chip-list" id="themeProfileList">
                    <!-- 动态注入方案列表 -->
                </div>
            </div>

            <!-- 卡片 4：字体库与多格式导入（默认折叠） -->
            <div class="theme-setting-card">
                <div class="theme-collapsible-header" onclick="window.toggleFontLibraryCollapse()">
                    <div class="theme-setting-title" style="margin-bottom:0;">
                        <span>字体库与扩展导入</span>
                    </div>
                    <span class="theme-collapsible-arrow" id="fontCollapseArrow">▶</span>
                </div>

                <div id="fontLibraryBody" style="display:none;margin-top:12px;">
                    <div class="theme-setting-desc">
                        支持导入本地字体文件（.ttf/.otf/.woff），或者直接填入 CSS 代码与 HTML 外链。
                    </div>

                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <input type="file" id="themeFontFileInput" accept=".ttf,.otf,.woff,.woff2" style="display:none;" onchange="window.handleThemeFontUpload(event)">
                        
                        <button class="btn-secondary" style="width:100%;" onclick="document.getElementById('themeFontFileInput').click()">
                            选择本地字体文件
                        </button>

                        <div style="font-size:12px;font-weight:700;color:var(--text);margin-top:4px;">导入代码/外链格式（CSS 或 HTML）</div>
                        <input type="text" id="fontRemarkInput" placeholder="备注字体名称（如：像素甜心体）" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #ffd1dc;font-size:12px;outline:none;">
                        <input type="text" id="fontKeywordInput" placeholder="自动匹配关键词（如：title, status, all）" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #ffd1dc;font-size:12px;outline:none;">
                        
                        <textarea id="fontCodeInput" placeholder="粘贴 CSS (@import/@font-face) 或 HTML (<link rel='stylesheet'>) 代码..." style="width:100%;min-height:55px;padding:8px 10px;border-radius:8px;border:1px solid #ffd1dc;font-size:12px;outline:none;resize:none;"></textarea>
                        
                        <button class="btn-secondary" style="width:100%;border-color:var(--primary);" onclick="window.handleCodeFontImport()">
                            导入代码字体
                        </button>
                    </div>

                    <div id="installedFontsList" style="margin-top:12px;display:flex;flex-direction:column;gap:6px;">
                        <!-- 动态载入已导入字体列表 -->
                    </div>
                </div>
            </div>
        `;

        // 挂载色盘
        initHsvCanvasPicker();
        // 渲染配置方案
        renderProfileChips();
        // 渲染已安装字体列表
        renderInstalledFontsList();
    };

    // 2. 自适应环境背景色分析
    function detectBackgroundLuminanceForPlate() {
        const desktopBg = pendingDesktopBg || localStorage.getItem('mcyt_custom_desktop_bg');
        if (!desktopBg) {
            isCurrentPlateDark = true;
            return;
        }

        if (typeof window.analyzeImageLuminance === 'function') {
            window.analyzeImageLuminance(desktopBg, function (isLightBg) {
                isCurrentPlateDark = !isLightBg;
                const plate = document.getElementById('hsvPickerContainer');
                if (plate) {
                    if (isCurrentPlateDark) {
                        plate.classList.add('theme-dark-plate');
                        plate.classList.remove('theme-light-plate');
                    } else {
                        plate.classList.add('theme-light-plate');
                        plate.classList.remove('theme-dark-plate');
                    }
                }
            });
        }
    }

    // 3. 正等边三角形 HSV 拾色器绘制与触控交互核心
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
        const innerR = outerR - 30; // 加粗约 4px
        const triR = innerR - 10;   // 正等边三角形外接圆半径

        function getEquilateralTriangleVertices() {
            const cos30 = Math.cos(Math.PI / 6); // √3 / 2 ≈ 0.866025
            const sin30 = Math.sin(Math.PI / 6); // 0.5
            return {
                top: {
                    x: center - triR * cos30,
                    y: center - triR * sin30
                },
                bottom: {
                    x: center - triR * cos30,
                    y: center + triR * sin30
                },
                right: {
                    x: center + triR,
                    y: center
                }
            };
        }

        function renderColorWheel() {
            ctx.clearRect(0, 0, size, size);

            // 1. 绘制外层加粗 360 度色相圆环
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

            // 2. 绘制内部绝对正等边三角形
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

            // 2. 正等边三角形手柄
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

            // 3. 滑块与数字框同步
            const sH = document.getElementById('sliderH');
            const sS = document.getElementById('sliderS');
            const sV = document.getElementById('sliderV');
            const nH = document.getElementById('inputNumH');
            const nS = document.getElementById('inputNumS');
            const nV = document.getElementById('inputNumV');

            if (sH) sH.value = hsvState.h;
            if (sS) sS.value = hsvState.s;
            if (sV) sV.value = hsvState.v;

            if (nH) nH.value = hsvState.h;
            if (nS) nS.value = hsvState.s;
            if (nV) nV.value = hsvState.v;

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

            if (dist >= innerR - 8 && dist <= outerR + 8) {
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

    window.onHsvNumInputChange = function (channel, value) {
        let num = parseInt(value) || 0;
        if (channel === 'h') {
            num = Math.max(0, Math.min(360, num));
            hsvState.h = num;
        } else if (channel === 's') {
            num = Math.max(0, Math.min(100, num));
            hsvState.s = num;
        } else if (channel === 'v') {
            num = Math.max(0, Math.min(100, num));
            hsvState.v = num;
        }
        if (window.refreshHsvWheelCanvas) window.refreshHsvWheelCanvas();
    };

    function previewColorLive(hex) {
        const root = document.documentElement;
        root.style.setProperty('--status-color', hex);
        root.style.setProperty('--lock-text-color', hex);
        root.style.setProperty('--status-svg-fill', hex);
        root.style.setProperty('--star-glow-color', hex);
    }

    // 4. 水滴吸色器：自由平移缩放 + 双黑边环准星（截图二标准）
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
                双指/滚轮自由缩放拖动，轻触准星取色
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
        let panX = 0;
        let panY = 0;
        let pickedRgb = { r: 255, g: 255, b: 255 };

        const wrapRect = viewWrap.getBoundingClientRect();
        const initScale = Math.min(wrapRect.width / loadedImg.width, wrapRect.height / loadedImg.height, 1) * 0.95;
        currentScale = initScale;
        updateViewportTransform();

        function updateViewportTransform() {
            viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
        }

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
        let initialPinchDist = 0;
        let pinchBaseScale = 1;

        function getDistance(t1, t2) {
            const dx = t1.clientX - t2.clientX;
            const dy = t1.clientY - t2.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }

        viewWrap.addEventListener('touchstart', function (e) {
            if (e.touches.length === 1) {
                isDragging = true;
                startX = e.touches[0].clientX - panX;
                startY = e.touches[0].clientY - panY;
                sampleColorAtClientPoint(e.touches[0].clientX, e.touches[0].clientY);
            } else if (e.touches.length === 2) {
                isDragging = false;
                initialPinchDist = getDistance(e.touches[0], e.touches[1]);
                pinchBaseScale = currentScale;
            }
        }, { passive: true });

        viewWrap.addEventListener('touchmove', function (e) {
            if (e.touches.length === 1 && isDragging) {
                panX = e.touches[0].clientX - startX;
                panY = e.touches[0].clientY - startY;
                updateViewportTransform();
                sampleColorAtClientPoint(e.touches[0].clientX, e.touches[0].clientY);
            } else if (e.touches.length === 2) {
                const dist = getDistance(e.touches[0], e.touches[1]);
                const factor = dist / initialPinchDist;
                currentScale = Math.max(0.2, Math.min(8.0, pinchBaseScale * factor));
                updateViewportTransform();
            }
        }, { passive: true });

        viewWrap.addEventListener('touchend', function () {
            isDragging = false;
        }, { passive: true });

        viewWrap.addEventListener('wheel', function (e) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            currentScale = Math.max(0.2, Math.min(8.0, currentScale * delta));
            updateViewportTransform();
            sampleColorAtClientPoint(e.clientX, e.clientY);
        }, { passive: false });

        viewWrap.addEventListener('mousedown', function (e) {
            isDragging = true;
            startX = e.clientX - panX;
            startY = e.clientY - panY;
            sampleColorAtClientPoint(e.clientX, e.clientY);
        });

        window.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            panX = e.clientX - startX;
            panY = e.clientY - startY;
            updateViewportTransform();
            sampleColorAtClientPoint(e.clientX, e.clientY);
        });

        window.addEventListener('mouseup', function () {
            isDragging = false;
        });

        function cleanup() {
            overlay.remove();
            loadedImg.src = '';
        }

        document.getElementById('pipetteCancelBtn').onclick = cleanup;
        document.getElementById('pipetteConfirmBtn').onclick = function () {
            const hex = rgbToHex(pickedRgb.r, pickedRgb.g, pickedRgb.b);
            hsvState = hexToHsv(hex);
            if (window.refreshHsvWheelCanvas) window.refreshHsvWheelCanvas();
            previewColorLive(hex);
            cleanup();
            if (typeof showToast === 'function') showToast('已成功吸取并应用颜色');
        };
    }

    // 5. 核心：导入本地壁纸并调起智能真机比例裁剪器
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
                裁剪 ${typeLabel}（按屏幕比例自由调整）
            </div>
            <div class="crop-view-container" id="cropViewContainer">
                <div class="crop-image-viewport" id="cropViewport">
                    <canvas id="cropSourceCanvas"></canvas>
                </div>
                <div class="crop-frame-box" id="cropFrameBox"></div>
            </div>
            <div style="display:flex;gap:8px;width:100%;max-width:380px;margin-top:12px;">
                <button class="btn-secondary" style="flex:1;" id="cropCancelBtn">取消</button>
                <button class="btn-secondary" style="flex:1;" id="cropUseOriginalBtn">原图直接使用</button>
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

        // 动态计算当前真机的实际比例
        const screenW = window.innerWidth || 360;
        const screenH = window.innerHeight || 640;
        const targetRatio = screenW / screenH;

        // 计算裁剪取景框在容器里的尺寸
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

        // 缩放平移交互变量
        let currentScale = 1;
        let panX = 0;
        let panY = 0;

        // 居中自适应底图
        const initScale = Math.max(frameW / loadedImg.width, frameH / loadedImg.height);
        currentScale = initScale;
        updateTransform();

        function updateTransform() {
            viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
        }

        let isDragging = false;
        let startX = 0, startY = 0;
        let initialPinchDist = 0;
        let pinchBaseScale = 1;

        function getDistance(t1, t2) {
            const dx = t1.clientX - t2.clientX;
            const dy = t1.clientY - t2.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }

        viewContainer.addEventListener('touchstart', function (e) {
            if (e.touches.length === 1) {
                isDragging = true;
                startX = e.touches[0].clientX - panX;
                startY = e.touches[0].clientY - panY;
            } else if (e.touches.length === 2) {
                isDragging = false;
                initialPinchDist = getDistance(e.touches[0], e.touches[1]);
                pinchBaseScale = currentScale;
            }
        }, { passive: true });

        viewContainer.addEventListener('touchmove', function (e) {
            if (e.touches.length === 1 && isDragging) {
                panX = e.touches[0].clientX - startX;
                panY = e.touches[0].clientY - startY;
                updateTransform();
            } else if (e.touches.length === 2) {
                const dist = getDistance(e.touches[0], e.touches[1]);
                const factor = dist / initialPinchDist;
                currentScale = Math.max(initScale * 0.4, Math.min(initScale * 6.0, pinchBaseScale * factor));
                updateTransform();
            }
        }, { passive: true });

        viewContainer.addEventListener('touchend', function () {
            isDragging = false;
        }, { passive: true });

        viewContainer.addEventListener('wheel', function (e) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.92 : 1.08;
            currentScale = Math.max(initScale * 0.4, Math.min(initScale * 6.0, currentScale * delta));
            updateTransform();
        }, { passive: false });

        viewContainer.addEventListener('mousedown', function (e) {
            isDragging = true;
            startX = e.clientX - panX;
            startY = e.clientY - panY;
        });

        window.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            panX = e.clientX - startX;
            panY = e.clientY - startY;
            updateTransform();
        });

        window.addEventListener('mouseup', function () {
            isDragging = false;
        });

        function cleanup() {
            cropOverlay.remove();
            loadedImg.src = '';
        }

        function applyWallpaperData(base64) {
            const root = document.documentElement;
            if (targetType === 'lock') {
                pendingLockBg = base64;
                root.style.setProperty('--lock-bg-url', `url('${base64}')`);
                if (typeof showToast === 'function') showToast('锁屏壁纸已选定，请点击确认保存');
            } else if (targetType === 'desktop') {
                pendingDesktopBg = base64;
                root.style.setProperty('--desktop-bg-url', `url('${base64}')`);
                if (typeof showToast === 'function') showToast('桌面壁纸已选定，请点击确认保存');
            }
            const tip = document.getElementById('wallpaperStatusTip');
            if (tip) tip.textContent = '壁纸已就绪（待保存）';
            detectBackgroundLuminanceForPlate();
        }

        document.getElementById('cropCancelBtn').onclick = cleanup;

        document.getElementById('cropUseOriginalBtn').onclick = function () {
            applyWallpaperData(originalBase64);
            cleanup();
        };

        document.getElementById('cropConfirmBtn').onclick = function () {
            // 通过离屏 Canvas 根据取景框相对位置进行精确裁剪
            const fRect = frameBox.getBoundingClientRect();
            const cRect = canvas.getBoundingClientRect();

            // 反推原图坐标
            const srcX = (fRect.left - cRect.left) / currentScale;
            const srcY = (fRect.top - cRect.top) / currentScale;
            const srcW = fRect.width / currentScale;
            const srcH = fRect.height / currentScale;

            const outCanvas = document.createElement('canvas');
            outCanvas.width = 1080;
            outCanvas.height = Math.round(1080 / targetRatio);
            const outCtx = outCanvas.getContext('2d');

            outCtx.drawImage(
                canvas,
                srcX, srcY, srcW, srcH,
                0, 0, outCanvas.width, outCanvas.height
            );

            const croppedBase64 = outCanvas.toDataURL('image/jpeg', 0.92);
            applyWallpaperData(croppedBase64);
            cleanup();
            if (typeof showToast === 'function') showToast('壁纸已按屏幕比例裁剪并就绪！');
        };
    }

    // 确认保存壁纸
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
        if (tip) tip.textContent = '自定义壁纸已永久保存！';

        if (typeof showToast === 'function') {
            showToast('当前壁纸已永久保存！');
        }
    };

    // 恢复默认壁纸
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
        detectBackgroundLuminanceForPlate();

        if (typeof showToast === 'function') {
            showToast('已恢复为默认壁纸');
        }
    };

    // 6. 模式单选切换
    window.onThemeModeRadioChange = function (mode) {
        currentThemeMode = mode;
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

    // 7. 保存并应用颜色模式（单一主键）
    window.saveAndApplyColorThemeOnly = function () {
        localStorage.setItem('mcyt_phone_theme_mode', currentThemeMode);

        const curRgb = hsvToRgb(hsvState.h, hsvState.s, hsvState.v);
        const hex = rgbToHex(curRgb.r, curRgb.g, curRgb.b);
        localStorage.setItem('mcyt_phone_custom_color', hex);

        if (typeof window.applyColorTheme === 'function') {
            if (currentThemeMode === 'auto') {
                const targetLock = pendingLockBg || 'assets/system/default_lock.jpg';
                window.analyzeImageLuminance(targetLock, window.applyColorTheme);
            } else {
                window.applyColorTheme(currentThemeMode === 'light');
            }
        }

        if (typeof showToast === 'function') {
            showToast('颜色与个性模式已成功保存');
        }
    };

    // 8. 仿 Windows 复古粉白甜心弹窗（Win98 Pink Sweetheart）
    function openRetroPinkModal(title, bodyHTML, onConfirm, showCancel) {
        let overlay = document.getElementById('modal');
        let titleEl = document.getElementById('retroModalTitle');
        let bodyEl = document.getElementById('modalBody');
        let closeBtn = document.getElementById('modalClose');

        if (!overlay || !bodyEl) return;

        if (titleEl) titleEl.textContent = title || '系统提示';

        bodyEl.innerHTML = `
            ${bodyHTML}
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">
                ${showCancel ? `<button class="btn-secondary" id="retroModalCancelBtn" style="padding:6px 14px;">取消</button>` : ''}
                <button class="btn-primary" id="retroModalConfirmBtn" style="width:auto;padding:6px 18px;">确定</button>
            </div>
        `;

        overlay.classList.add('open');

        function closeModal() {
            overlay.classList.remove('open');
        }

        if (closeBtn) closeBtn.onclick = closeModal;
        const cancelBtn = document.getElementById('retroModalCancelBtn');
        if (cancelBtn) cancelBtn.onclick = closeModal;

        const confirmBtn = document.getElementById('retroModalConfirmBtn');
        if (confirmBtn) {
            confirmBtn.onclick = function () {
                if (typeof onConfirm === 'function') {
                    const result = onConfirm();
                    if (result === false) return;
                }
                closeModal();
            };
        }
    }

    // 9. 字体库折叠、多格式解析与关键词自动匹配
    window.toggleFontLibraryCollapse = function () {
        const body = document.getElementById('fontLibraryBody');
        const arrow = document.getElementById('fontCollapseArrow');
        if (!body || !arrow) return;
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            arrow.classList.add('open');
        } else {
            arrow.classList.remove('open');
        }
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
                    type: 'file',
                    keyword: 'all'
                });
                applyFontToScope(fontName, 'all');
                renderInstalledFontsList();
                if (typeof showToast === 'function') showToast('本地字体安装成功');
            }).catch(function () {
                if (typeof showToast === 'function') showToast('字体解析失败，请检查格式');
            });
        };
        reader.readAsArrayBuffer(file);
    };

    window.handleCodeFontImport = function () {
        const codeInput = document.getElementById('fontCodeInput');
        const remarkInput = document.getElementById('fontRemarkInput');
        const keywordInput = document.getElementById('fontKeywordInput');
        if (!codeInput) return;

        const rawCode = (codeInput.value || '').trim();
        const remark = (remarkInput && remarkInput.value.trim()) || '自定义代码字体';
        const keyword = (keywordInput && keywordInput.value.trim()) || 'all';

        if (!rawCode) {
            if (typeof showToast === 'function') showToast('请输入 CSS 或 HTML 字体代码');
            return;
        }

        let familyName = 'CodeFont_' + Date.now();

        if (rawCode.includes('<link') && rawCode.includes('href=')) {
            const match = rawCode.match(/href=["']([^"']+)["']/);
            if (match && match[1]) {
                const linkEl = document.createElement('link');
                linkEl.rel = 'stylesheet';
                linkEl.href = match[1];
                document.head.appendChild(linkEl);
            }
        } else {
            const styleEl = document.createElement('style');
            styleEl.innerHTML = rawCode;
            document.head.appendChild(styleEl);

            const famMatch = rawCode.match(/font-family:\s*['"]?([^'";\n]+)['"]?/i);
            if (famMatch && famMatch[1]) {
                familyName = famMatch[1].trim();
            }
        }

        saveFontRecord({
            id: 'font_' + Date.now(),
            name: remark,
            family: familyName,
            type: 'code',
            keyword: keyword,
            code: rawCode
        });

        applyFontToScope(familyName, keyword);
        renderInstalledFontsList();
        codeInput.value = '';
        if (typeof showToast === 'function') showToast('代码字体导入并匹配成功');
    };

    function saveFontRecord(fontItem) {
        let list = [];
        try {
            list = JSON.parse(localStorage.getItem('mcyt_installed_fonts') || '[]');
        } catch (e) { list = []; }
        list.push(fontItem);
        localStorage.setItem('mcyt_installed_fonts', JSON.stringify(list));
    }

    function renderInstalledFontsList() {
        const container = document.getElementById('installedFontsList');
        if (!container) return;

        let list = [];
        try {
            list = JSON.parse(localStorage.getItem('mcyt_installed_fonts') || '[]');
        } catch (e) { list = []; }

        if (list.length === 0) {
            container.innerHTML = `<div style="font-size:11px;color:var(--text2);text-align:center;">暂无自定义扩展字体</div>`;
            return;
        }

        container.innerHTML = list.map(item => `
            <div style="display:flex;justify-content:space-between;align-items:center;background:#fff8f9;padding:6px 10px;border-radius:8px;border:1px solid #ffeef2;">
                <div style="display:flex;flex-direction:column;">
                    <span style="font-size:12px;font-weight:700;color:#2e1a22;">${item.name}</span>
                    <span style="font-size:10px;color:var(--text2);">匹配: ${item.keyword} · 系列: ${item.family}</span>
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
            applyFontToScope(target.family, target.keyword);
            if (typeof showToast === 'function') showToast('已应用字体: ' + target.name);
        }
    };

    window.removeFontItem = function (id) {
        let list = JSON.parse(localStorage.getItem('mcyt_installed_fonts') || '[]');
        list = list.filter(x => x.id !== id);
        localStorage.setItem('mcyt_installed_fonts', JSON.stringify(list));
        renderInstalledFontsList();
    };

    function applyFontToScope(family, keyword) {
        const root = document.documentElement;
        if (!keyword || keyword === 'all') {
            root.style.setProperty('--app-font', `"${family}", -apple-system, sans-serif`);
        } else if (keyword === 'title') {
            const titles = document.querySelectorAll('.app-title-label, .app-head-title, .retro-pink-titlebar');
            titles.forEach(el => { el.style.fontFamily = `"${family}", sans-serif`; });
        } else if (keyword === 'status') {
            const statusEl = document.getElementById('statusBar');
            if (statusEl) statusEl.style.fontFamily = `"${family}", monospace`;
        } else {
            root.style.setProperty('--app-font', `"${family}", -apple-system, sans-serif`);
        }
    }

    // 10. 多配置预设管理器（Profiles）
    function getStoredProfiles() {
        try {
            return JSON.parse(localStorage.getItem('mcyt_theme_profiles') || '[]');
        } catch (e) { return []; }
    }

    function renderProfileChips() {
        const container = document.getElementById('themeProfileList');
        if (!container) return;

        const profiles = getStoredProfiles();
        const activeName = localStorage.getItem('mcyt_active_profile_name') || '';

        if (profiles.length === 0) {
            container.innerHTML = `<div style="font-size:11.5px;color:var(--text2);">暂无已存方案，点击上方“新建方案”以保存当前配置</div>`;
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
        const html = `
            <div style="font-size:13px;color:var(--text);margin-bottom:8px;font-weight:600;">
                请输入当前配置方案的备注名称：
            </div>
            <input type="text" id="profileNamePromptInput" value="甜心配色方案" style="width:100%;padding:8px 10px;border-radius:6px;border:1.5px solid #d48093;font-size:13px;outline:none;background:#fff;color:#2e1a22;">
        `;

        openRetroPinkModal('保存方案', html, function () {
            const input = document.getElementById('profileNamePromptInput');
            const name = (input && input.value || '').trim();
            if (!name) {
                if (typeof showToast === 'function') showToast('方案名称不能为空！');
                return false;
            }

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
            if (existingIdx >= 0) {
                profiles[existingIdx] = newProfile;
            } else {
                profiles.push(newProfile);
            }

            localStorage.setItem('mcyt_theme_profiles', JSON.stringify(profiles));
            localStorage.setItem('mcyt_active_profile_name', newProfile.name);
            renderProfileChips();

            if (typeof showToast === 'function') {
                showToast('方案 [' + newProfile.name + '] 已成功保存！');
            }
        }, true);
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
        if (appModalBody) {
            window.renderThemeApp(appModalBody);
        }

        if (typeof window.applyColorTheme === 'function') {
            if (currentThemeMode === 'auto') {
                const lock = target.lockBg || 'assets/system/default_lock.jpg';
                window.analyzeImageLuminance(lock, window.applyColorTheme);
            } else {
                window.applyColorTheme(currentThemeMode === 'light');
            }
        }

        if (typeof showToast === 'function') {
            showToast('已切换至方案: ' + target.name);
        }
    };

    window.deleteThemeProfile = function (profileName) {
        const html = `
            <div style="font-size:13px;color:var(--text);line-height:1.5;">
                确定要彻底删除配置方案 <strong>[${profileName}]</strong> 吗？
            </div>
        `;

        openRetroPinkModal('删除方案', html, function () {
            let profiles = getStoredProfiles();
            profiles = profiles.filter(p => p.name !== profileName);
            localStorage.setItem('mcyt_theme_profiles', JSON.stringify(profiles));

            if (localStorage.getItem('mcyt_active_profile_name') === profileName) {
                localStorage.removeItem('mcyt_active_profile_name');
            }
            renderProfileChips();

            if (typeof showToast === 'function') {
                showToast('已删除方案: ' + profileName);
            }
        }, true);
    };
})();
