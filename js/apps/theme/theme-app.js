/**
 * js/apps/theme/theme-app.js
 * 个性化与主题中心 App
 * 职责：本地壁纸自选与确认保存、专业正等边三角 HSV 拾色系统、水滴吸色器、底盘明暗自适应、
 *       粉色像素指针单选、本地/CSS/HTML 字体装载与关键词匹配、多套主题配置方案管理
 */

(function () {
    'use strict';

    // 内部 HSV 拾色器全局状态
    let hsvState = {
        h: 61,   // 对应截图标准色相
        s: 82,   // 饱和度
        v: 89,   // 明度
        activeDrag: null // 'ring' | 'triangle' | null
    };

    // 暂存壁纸变量（提供选取后确认保存机制）
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
            <!-- 卡片 1：壁纸设置（本地相册导入） -->
            <div class="theme-setting-card">
                <div class="theme-setting-title">
                    <span>壁纸设置（本地相册导入）</span>
                </div>
                <div class="theme-setting-desc">
                    选取手机相册照片装扮你的手机，点击保存后将永久生效。
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

                    <button class="btn-secondary" style="width:100%;border-color:var(--primary);font-weight:700;" onclick="window.confirmSaveWallpapersOnly()">
                        确认保存当前壁纸
                    </button>
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

                <!-- 指针项容器 -->
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

                <!-- 高级 HSV 色相环 + 正等边三角形拾色器面盘 -->
                <div id="themeHsvPickerWrap" style="display:${currentThemeMode === 'custom' ? 'block' : 'none'};">
                    <div class="hsv-picker-container ${isCurrentPlateDark ? 'theme-dark-plate' : 'theme-light-plate'}" id="hsvPickerContainer">
                        
                        <!-- 色相环与正等边三角形绘制容器 -->
                        <div class="hsv-wheel-box" id="hsvWheelBox">
                            <canvas id="hsvWheelCanvas" class="hsv-wheel-canvas" width="440" height="440"></canvas>
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

                        <!-- 底部 H / S / V 微调滑动条与双向数字输入 -->
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

                <!-- 统一保存与重置操作按钮区 -->
                <div class="theme-action-bar">
                    <button class="btn-primary" style="flex:2;" onclick="window.saveAndApplyAllThemes()">
                        保存并应用设置
                    </button>
                    <button class="btn-secondary" style="flex:1;" onclick="window.restoreDefaultWallpapersAndColor()">
                        恢复原样
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
                    <!-- 动态注入预设列表 -->
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
        const size = 440;
        const center = size / 2;
        const outerR = size / 2 - 10;
        const innerR = outerR - 26;
        const triR = innerR - 12;

        // 计算标准正等边三角形顶点（三边长度绝对相等）
        // 顶点 1：纯白 (S=0, V=100)；顶点 2：纯黑 (V=0)；顶点 3：纯色 Hue (S=100, V=100)
        function getEquilateralTriangleVertices() {
            return {
                top: {
                    x: center - triR * Math.cos(Math.PI / 6),
                    y: center - triR * Math.sin(Math.PI / 6)
                },
                bottom: {
                    x: center - triR * Math.cos(Math.PI / 6),
                    y: center + triR * Math.sin(Math.PI / 6)
                },
                right: {
                    x: center + triR,
                    y: center
                }
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

            // 2. 绘制内部正等边三角形
            const v = getEquilateralTriangleVertices();

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(v.top.x, v.top.y);
            ctx.lineTo(v.right.x, v.right.y);
            ctx.lineTo(v.bottom.x, v.bottom.y);
            ctx.closePath();
            ctx.clip();

            // 底层水平渐变：白 -> 纯色 Hue
            const pureRgb = hsvToRgb(hsvState.h, 100, 100);
            const horizGrad = ctx.createLinearGradient(v.top.x, center, v.right.x, center);
            horizGrad.addColorStop(0, '#ffffff');
            horizGrad.addColorStop(1, `rgb(${pureRgb.r},${pureRgb.g},${pureRgb.b})`);
            ctx.fillStyle = horizGrad;
            ctx.fillRect(0, 0, size, size);

            // 叠加垂直渐变：从底边纯黑向顶部透明过渡
            const vertGrad = ctx.createLinearGradient(center, v.top.y, center, v.bottom.y);
            vertGrad.addColorStop(0, 'rgba(0,0,0,0)');
            vertGrad.addColorStop(1, '#000000');
            ctx.fillStyle = vertGrad;
            ctx.fillRect(0, 0, size, size);

            ctx.restore();

            updateHandlesAndSliders();
        }

        // 更新手柄与输入框
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

            const curLeftX = v.top.x;
            const curRightX = v.right.x;
            const x = curLeftX + (curRightX - curLeftX) * sat * val;

            const topY = v.top.y + (v.right.y - v.top.y) * sat;
            const botY = v.bottom.y + (v.right.y - v.bottom.y) * sat;
            const y = topY + (botY - topY) * (1 - val);

            tHandle.style.left = `${x * scale}px`;
            tHandle.style.top = `${y * scale}px`;
            const curRgb = hsvToRgb(hsvState.h, hsvState.s, hsvState.v);
            tHandle.style.backgroundColor = `rgb(${curRgb.r},${curRgb.g},${curRgb.b})`;

            // 3. 同步滑块与数字输入框
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

            // 实时应用视觉
            const hex = rgbToHex(curRgb.r, curRgb.g, curRgb.b);
            previewColorLive(hex);
        }

        // 触控交互
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

        // 滑块输入监听
        const sH = document.getElementById('sliderH');
        const sS = document.getElementById('sliderS');
        const sV = document.getElementById('sliderV');
        if (sH) sH.addEventListener('input', (e) => { hsvState.h = parseInt(e.target.value) || 0; renderColorWheel(); });
        if (sS) sS.addEventListener('input', (e) => { hsvState.s = parseInt(e.target.value) || 0; updateHandlesAndSliders(); });
        if (sV) sV.addEventListener('input', (e) => { hsvState.v = parseInt(e.target.value) || 0; updateHandlesAndSliders(); });

        window.refreshHsvWheelCanvas = renderColorWheel;
        renderColorWheel();
    }

    // 数字输入框双向输入响应
    window.onHsvNumInputChange = function (channel, value) {
        let num = parseInt(value) || 0;
        if (channel === 'h') {
            num = Math.max(0, Math.min(360, num));
            hsvState.h = num;
            if (window.refreshHsvWheelCanvas) window.refreshHsvWheelCanvas();
        } else if (channel === 's') {
            num = Math.max(0, Math.min(100, num));
            hsvState.s = num;
            if (window.refreshHsvWheelCanvas) window.refreshHsvWheelCanvas();
        } else if (channel === 'v') {
            num = Math.max(0, Math.min(100, num));
            hsvState.v = num;
            if (window.refreshHsvWheelCanvas) window.refreshHsvWheelCanvas();
        }
    };

    // 实时预览色彩
    function previewColorLive(hex) {
        const root = document.documentElement;
        root.style.setProperty('--status-color', hex);
        root.style.setProperty('--lock-text-color', hex);
        root.style.setProperty('--status-svg-fill', hex);
        root.style.setProperty('--star-glow-color', hex);
    }

    // 4. 水滴吸色器（Pipette）实现：载入临时图、取色后彻底释放销毁
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
            <div style="color:#ffffff;font-size:13px;font-weight:600;margin-bottom:8px;">
                轻触或拖动准星吸取色彩
            </div>
            <div class="pipette-view-wrap" id="pipetteViewWrap">
                <canvas id="pipetteCanvas" class="pipette-canvas"></canvas>
                <div id="pipetteLoupe" class="pipette-loupe"></div>
            </div>
            <div style="display:flex;gap:12px;width:100%;max-width:320px;margin-top:12px;">
                <button class="btn-secondary" style="flex:1;" id="pipetteCancelBtn">取消</button>
                <button class="btn-primary" style="flex:1;" id="pipetteConfirmBtn">选取颜色</button>
            </div>
        `;

        const canvas = document.getElementById('pipetteCanvas');
        const loupe = document.getElementById('pipetteLoupe');
        const ctx = canvas.getContext('2d');

        // 计算等比自适应尺寸
        const maxW = window.innerWidth - 32;
        const maxH = window.innerHeight - 160;
        let w = loadedImg.width;
        let h = loadedImg.height;
        const scale = Math.min(maxW / w, maxH / h, 1);
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);

        let pickedRgb = { r: 255, g: 255, b: 255 };

        function sampleColor(clientX, clientY) {
            const rect = canvas.getBoundingClientRect();
            const x = Math.round(clientX - rect.left);
            const y = Math.round(clientY - rect.top);
            if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;

            const pixel = ctx.getImageData(x, y, 1, 1).data;
            pickedRgb = { r: pixel[0], g: pixel[1], b: pixel[2] };

            // 更新放大镜
            loupe.style.display = 'block';
            loupe.style.left = `${clientX}px`;
            loupe.style.top = `${clientY - 46}px`;
            loupe.style.borderColor = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
            loupe.style.backgroundColor = `rgb(${pixel[0]},${pixel[1]},${pixel[2]})`;
        }

        function onTouch(e) {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            sampleColor(clientX, clientY);
        }

        canvas.addEventListener('mousedown', onTouch);
        canvas.addEventListener('mousemove', (e) => { if (e.buttons === 1) onTouch(e); });
        canvas.addEventListener('touchstart', onTouch, { passive: true });
        canvas.addEventListener('touchmove', onTouch, { passive: true });

        // 退出与清理函数（彻底释放参考图内存）
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

    // 5. 本地壁纸上传与确认单独保存机制
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
                if (typeof showToast === 'function') showToast('锁屏壁纸已选定，请点击确认保存');
            } else if (targetType === 'desktop') {
                pendingDesktopBg = base64Data;
                root.style.setProperty('--desktop-bg-url', `url('${base64Data}')`);
                if (typeof showToast === 'function') showToast('桌面壁纸已选定，请点击确认保存');
            }

            const tip = document.getElementById('wallpaperStatusTip');
            if (tip) tip.textContent = '壁纸已就绪（待保存）';
            detectBackgroundLuminanceForPlate();
        };
        reader.readAsDataURL(file);
    };

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
        if (tip) tip.textContent = '自定义壁纸已生效并保存';

        if (typeof showToast === 'function') {
            showToast('当前壁纸已永久保存！');
        } else {
            alert('当前壁纸已永久保存！');
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

    // 7. 保存并应用所有设置
    window.saveAndApplyAllThemes = function () {
        localStorage.setItem('mcyt_phone_theme_mode', currentThemeMode);

        if (pendingLockBg) localStorage.setItem('mcyt_custom_lock_bg', pendingLockBg);
        if (pendingDesktopBg) localStorage.setItem('mcyt_custom_desktop_bg', pendingDesktopBg);

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
            showToast('主题与个性化设置已保存完毕');
        } else {
            alert('主题与个性化设置已保存完毕');
        }
    };

    // 8. 恢复默认出厂设置
    window.restoreDefaultWallpapersAndColor = function () {
        localStorage.removeItem('mcyt_custom_lock_bg');
        localStorage.removeItem('mcyt_custom_desktop_bg');
        localStorage.removeItem('mcyt_phone_theme_mode');
        localStorage.removeItem('mcyt_phone_custom_color');

        pendingLockBg = null;
        pendingDesktopBg = null;
        currentThemeMode = 'auto';

        const root = document.documentElement;
        root.style.setProperty('--lock-bg-url', `url('assets/system/default_lock.jpg')`);
        root.style.setProperty('--desktop-bg-url', `url('assets/system/default_desktop.jpg')`);

        if (typeof window.analyzeImageLuminance === 'function') {
            window.analyzeImageLuminance('assets/system/default_lock.jpg', window.applyColorTheme);
        }

        const appModalBody = document.getElementById('appModalBody');
        if (appModalBody) {
            window.renderThemeApp(appModalBody);
        }

        if (typeof showToast === 'function') {
            showToast('已恢复为出厂默认设置');
        } else {
            alert('已恢复为出厂默认设置');
        }
    };

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

    // 本地字体文件处理
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

    // CSS / HTML 代码字体导入
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

        // 如果是 HTML <link>
        if (rawCode.includes('<link') && rawCode.includes('href=')) {
            const match = rawCode.match(/href=["']([^"']+)["']/);
            if (match && match[1]) {
                const linkEl = document.createElement('link');
                linkEl.rel = 'stylesheet';
                linkEl.href = match[1];
                document.head.appendChild(linkEl);
            }
        } else {
            // 如果是纯 CSS
            const styleEl = document.createElement('style');
            styleEl.innerHTML = rawCode;
            document.head.appendChild(styleEl);

            // 尝试提取 font-family
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
            container.innerHTML = `<div style="font-size:11.5px;color:var(--text2);">暂无已存方案，点击上方“新建方案”以保存当前状态</div>`;
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
        const name = prompt('请输入当前配置方案的备注名称：', '甜心配色方案');
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

        // 重新刷新视图
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
        if (!confirm(`确定要删除方案 [${profileName}] 吗？`)) return;
        let profiles = getStoredProfiles();
        profiles = profiles.filter(p => p.name !== profileName);
        localStorage.setItem('mcyt_theme_profiles', JSON.stringify(profiles));

        if (localStorage.getItem('mcyt_active_profile_name') === profileName) {
            localStorage.removeItem('mcyt_active_profile_name');
        }
        renderProfileChips();
    };
})();
