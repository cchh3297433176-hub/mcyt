// js/system/error-monitor.js
// 全局异常捕获、Win98 粉白报错日志管理与个性化报错悬浮球模块
// ============================================================

(function(window) {
    'use strict';

    const STORAGE_KEY_CONFIG = 'mc_yt_error_orb_config';
    const MAX_LOGS = 60;

    // 默认配置
    const defaultConfig = {
        enabled: true,
        size: 46, // px
        shape: 'circle', // 'circle' | 'squircle' | 'heart' | 'lasso' | 'custom_img'
        lassoPath: '', // clip-path polygon(...)
        customImageData: '', // base64 (PNG / GIF)
        position: { x: null, y: null } // 自动靠边
    };

    let config = Object.assign({}, defaultConfig);
    try {
        const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
        if (saved) Object.assign(config, JSON.parse(saved));
    } catch (_) {}

    const errorLogs = [];
    let orbElement = null;
    let badgeElement = null;
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let initialOrbX = 0, initialOrbY = 0;
    let hasMoved = false;

    function saveConfig() {
        try {
            localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
        } catch (_) {}
    }

    // 格式化时间戳
    function getNowTimeStr() {
        const d = new Date();
        const pad = n => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
    }

    // 记录错误
    function recordError(type, message, source, lineno, colno, errorObj) {
        const time = getNowTimeStr();
        const stack = errorObj && errorObj.stack ? errorObj.stack : '';
        const item = {
            id: 'err_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            time,
            type,
            message: String(message || '未知异常'),
            source: source || 'inline / eval',
            line: lineno || 0,
            col: colno || 0,
            stack
        };

        errorLogs.unshift(item);
        if (errorLogs.length > MAX_LOGS) errorLogs.pop();

        updateOrbBadge();
        shakeOrb();
    }

    // 全局错误监听
    window.addEventListener('error', function(event) {
        recordError(
            'ScriptError',
            event.message,
            event.filename,
            event.lineno,
            event.colno,
            event.error
        );
    });

    window.addEventListener('unhandledrejection', function(event) {
        const reason = event.reason;
        const msg = (reason && (reason.message || reason.stack)) ? (reason.message || String(reason)) : 'Promise Rejection 未捕获异常';
        recordError(
            'UnhandledPromise',
            msg,
            '',
            0,
            0,
            reason instanceof Error ? reason : null
        );
    });

    // 悬浮球轻微抖动提醒
    function shakeOrb() {
        if (!orbElement || !config.enabled) return;
        orbElement.classList.remove('orb-shake');
        void orbElement.offsetWidth;
        orbElement.classList.add('orb-shake');
    }

    function updateOrbBadge() {
        if (!badgeElement) return;
        const count = errorLogs.length;
        if (count > 0) {
            badgeElement.textContent = count > 99 ? '99+' : count;
            badgeElement.style.display = 'flex';
        } else {
            badgeElement.style.display = 'none';
        }
    }

    // 应用悬浮球样式与形状
    function applyOrbStyle() {
        if (!orbElement) return;
        const s = config.size;
        orbElement.style.width = s + 'px';
        orbElement.style.height = s + 'px';
        orbElement.style.display = config.enabled ? 'flex' : 'none';

        // 重置样式与裁剪
        orbElement.style.clipPath = '';
        orbElement.style.borderRadius = '';
        orbElement.style.backgroundImage = '';
        orbElement.style.backgroundSize = '';
        orbElement.style.backgroundPosition = '';
        orbElement.style.backgroundColor = '';

        const innerIcon = orbElement.querySelector('.orb-inner-icon');

        if (config.shape === 'circle') {
            orbElement.style.borderRadius = '50%';
            orbElement.style.backgroundColor = 'var(--primary, #ff5c8a)';
            if (innerIcon) innerIcon.style.display = 'block';
        } else if (config.shape === 'squircle') {
            orbElement.style.borderRadius = Math.round(s * 0.28) + 'px';
            orbElement.style.backgroundColor = 'var(--primary, #ff5c8a)';
            if (innerIcon) innerIcon.style.display = 'block';
        } else if (config.shape === 'heart') {
            orbElement.style.clipPath = 'polygon(50% 15%, 80% 0%, 100% 25%, 100% 55%, 50% 95%, 0% 55%, 0% 25%, 20% 0%)';
            orbElement.style.backgroundColor = 'var(--primary, #ff5c8a)';
            if (innerIcon) innerIcon.style.display = 'block';
        } else if (config.shape === 'lasso' && config.lassoPath) {
            orbElement.style.clipPath = config.lassoPath;
            orbElement.style.backgroundColor = 'var(--primary, #ff5c8a)';
            if (innerIcon) innerIcon.style.display = 'block';
        } else if (config.shape === 'custom_img' && config.customImageData) {
            orbElement.style.borderRadius = '12px';
            orbElement.style.backgroundColor = 'transparent';
            orbElement.style.backgroundImage = `url('${config.customImageData}')`;
            orbElement.style.backgroundSize = 'contain';
            orbElement.style.backgroundRepeat = 'no-repeat';
            orbElement.style.backgroundPosition = 'center';
            if (innerIcon) innerIcon.style.display = 'none';
        } else {
            orbElement.style.borderRadius = '50%';
            orbElement.style.backgroundColor = 'var(--primary, #ff5c8a)';
            if (innerIcon) innerIcon.style.display = 'block';
        }

        updateOrbBadge();
    }

    // 创建悬浮球 DOM
    function initOrbDOM() {
        if (document.getElementById('debugFloatingOrb')) return;

        orbElement = document.createElement('div');
        orbElement.id = 'debugFloatingOrb';
        orbElement.className = 'debug-floating-orb';

        orbElement.innerHTML = `
            <div class="orb-inner-icon">🐞</div>
            <div class="orb-badge" id="debugOrbBadge" style="display:none;">0</div>
        `;

        document.body.appendChild(orbElement);
        badgeElement = orbElement.querySelector('#debugOrbBadge');

        applyOrbStyle();

        // 恢复坐标或自适应默认右侧居中
        const s = config.size;
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        let posX = config.position.x;
        let posY = config.position.y;

        if (posX === null || posY === null || isNaN(posX) || isNaN(posY)) {
            posX = winW - s - 12;
            posY = Math.round(winH * 0.45);
        } else {
            posX = Math.max(6, Math.min(winW - s - 6, posX));
            posY = Math.max(48, Math.min(winH - s - 48, posY));
        }

        orbElement.style.left = posX + 'px';
        orbElement.style.top = posY + 'px';
        config.position = { x: posX, y: posY };

        bindOrbDragEvents();
    }

    // 拖拽与贴边吸附事件
    function bindOrbDragEvents() {
        if (!orbElement) return;

        const onTouchStart = (clientX, clientY) => {
            isDragging = true;
            hasMoved = false;
            dragStartX = clientX;
            dragStartY = clientY;
            initialOrbX = orbElement.offsetLeft;
            initialOrbY = orbElement.offsetTop;
            orbElement.style.transition = 'none';
        };

        const onTouchMove = (clientX, clientY) => {
            if (!isDragging) return;
            const deltaX = clientX - dragStartX;
            const deltaY = clientY - dragStartY;
            if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
                hasMoved = true;
            }

            let nextX = initialOrbX + deltaX;
            let nextY = initialOrbY + deltaY;

            const s = config.size;
            const maxW = window.innerWidth - s;
            const maxH = window.innerHeight - s;

            nextX = Math.max(0, Math.min(maxW, nextX));
            nextY = Math.max(36, Math.min(maxH - 12, nextY));

            orbElement.style.left = nextX + 'px';
            orbElement.style.top = nextY + 'px';
        };

        const onTouchEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            orbElement.style.transition = 'left 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28), top 0.2s ease';

            const s = config.size;
            const curX = orbElement.offsetLeft;
            const curY = orbElement.offsetTop;
            const midX = window.innerWidth / 2;

            // 左右自动贴边
            let snapX = curX < midX ? 8 : (window.innerWidth - s - 8);
            let snapY = Math.max(42, Math.min(window.innerHeight - s - 42, curY));

            orbElement.style.left = snapX + 'px';
            orbElement.style.top = snapY + 'px';

            config.position = { x: snapX, y: snapY };
            saveConfig();

            // 若只是轻触点击，未移动，则展开 Win98 报错视窗
            if (!hasMoved) {
                openErrorLogModal();
            }
        };

        orbElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                onTouchStart(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (isDragging && e.touches.length === 1) {
                onTouchMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });

        window.addEventListener('touchend', () => {
            if (isDragging) onTouchEnd();
        });

        // 鼠标兼容支持
        orbElement.addEventListener('mousedown', (e) => {
            onTouchStart(e.clientX, e.clientY);
            const moveHandler = (ev) => onTouchMove(ev.clientX, ev.clientY);
            const upHandler = () => {
                onTouchEnd();
                window.removeEventListener('mousemove', moveHandler);
                window.removeEventListener('mouseup', upHandler);
            };
            window.addEventListener('mousemove', moveHandler);
            window.addEventListener('mouseup', upHandler);
        });
    }

    // ============================================================
    // 仿 Win98 粉白甜心报错弹窗
    // ============================================================
    function openErrorLogModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const retroModalTitle = document.getElementById('retroModalTitle');
        if (!modal || !modalBody) return;

        if (retroModalTitle) {
            retroModalTitle.textContent = `🐞 系统报错调试日志 (${errorLogs.length})`;
        }

        let logsHTML = '';
        if (errorLogs.length === 0) {
            logsHTML = `
                <div style="text-align:center;padding:32px 12px;color:#7a505f;">
                    <div style="font-size:36px;margin-bottom:8px;">🌸</div>
                    <div style="font-weight:700;font-size:14px;">当前系统一切安好，零报错！</div>
                    <div style="font-size:11px;color:#999;margin-top:4px;">当有代码异常、未捕获 Promise 或 WebView 报错时会自动记录在此。</div>
                </div>
            `;
        } else {
            logsHTML = errorLogs.map((item, idx) => `
                <div style="border:1px solid #ffd4e0;background:#fff8fa;border-radius:6px;padding:9px;margin-bottom:8px;font-size:12px;box-shadow:inset 0 1px 2px rgba(216,27,96,0.03);">
                    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed #ffccd9;padding-bottom:4px;margin-bottom:5px;">
                        <span style="font-weight:750;color:#ad1457;font-family:monospace;">#${errorLogs.length - idx} [${item.type}]</span>
                        <span style="color:#7a505f;font-size:11px;font-family:monospace;">${item.time}</span>
                    </div>
                    <div style="color:#2e1a22;font-weight:600;word-break:break-all;line-height:1.4;margin-bottom:4px;">${escapeHtml(item.message)}</div>
                    ${item.source ? `<div style="font-size:11px;color:#888;word-break:break-all;font-family:monospace;">来源: ${escapeHtml(item.source)}:${item.line}:${item.col}</div>` : ''}
                    ${item.stack ? `<details style="margin-top:4px;"><summary style="cursor:pointer;color:var(--primary);font-size:11px;font-weight:600;">展开调用堆栈</summary><pre style="margin-top:4px;background:#2e1a22;color:#fce4ec;padding:6px;border-radius:4px;font-size:10.5px;max-height:110px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;">${escapeHtml(item.stack)}</pre></details>` : ''}
                </div>
            `).join('');
        }

        modalBody.innerHTML = `
            <div style="margin-bottom:10px;">
                <div style="display:flex;gap:6px;margin-bottom:12px;">
                    <button class="retro-pink-btn" id="copyAllErrorsBtn" style="flex:1;height:32px;font-size:12px;">📋 一键复制全部日志</button>
                    <button class="retro-pink-btn" id="exportErrorFileBtn" style="flex:1;height:32px;font-size:12px;">📤 导出日志文件</button>
                    <button class="retro-pink-btn" id="clearAllErrorsBtn" style="width:70px;height:32px;font-size:12px;background:#ffebee;color:#c62828;">🗑️ 清空</button>
                </div>
                <div style="max-height:55vh;overflow-y:auto;padding-right:2px;">
                    ${logsHTML}
                </div>
                <div style="margin-top:10px;text-align:right;">
                    <button class="retro-pink-btn" onclick="closeModal()" style="width:80px;height:30px;font-size:12px;">关闭</button>
                </div>
            </div>
        `;

        modal.classList.add('open');

        // 绑定复制
        const copyBtn = document.getElementById('copyAllErrorsBtn');
        if (copyBtn) {
            copyBtn.onclick = () => {
                if (errorLogs.length === 0) {
                    if (typeof showToast === 'function') showToast('当前没有可复制的日志', 'info');
                    return;
                }
                const formatted = formatErrorsForExport();
                doCopyText(formatted);
            };
        }

        // 绑定导出文件
        const exportBtn = document.getElementById('exportErrorFileBtn');
        if (exportBtn) {
            exportBtn.onclick = () => {
                if (errorLogs.length === 0) {
                    if (typeof showToast === 'function') showToast('当前没有可导出的日志', 'info');
                    return;
                }
                downloadErrorLogFile();
            };
        }

        // 绑定清空
        const clearBtn = document.getElementById('clearAllErrorsBtn');
        if (clearBtn) {
            clearBtn.onclick = () => {
                errorLogs.length = 0;
                updateOrbBadge();
                openErrorLogModal();
                if (typeof showToast === 'function') showToast('已清空所有错误日志', 'success');
            };
        }
    }

    // 格式化日志内容
    function formatErrorsForExport() {
        const header = `=== MC YouTube模拟器 错误诊断报告 ===\n生成时间: ${new Date().toLocaleString()}\n设备 Agent: ${navigator.userAgent}\n错误总数: ${errorLogs.length}\n======================================\n\n`;
        const body = errorLogs.map((item, idx) => {
            return `[#${errorLogs.length - idx}] ${item.time} [${item.type}]\n错误信息: ${item.message}\n来源: ${item.source}:${item.line}:${item.col}\n堆栈信息:\n${item.stack || '无'}\n--------------------------------------`;
        }).join('\n');
        return header + body;
    }

    // 文本复制执行
    function doCopyText(text) {
        if (window.NativeBridge && typeof window.NativeBridge.copyText === 'function') {
            try {
                window.NativeBridge.copyText(text);
                if (typeof showToast === 'function') showToast('✅ 已复制错误日志到剪贴板！', 'success');
                return;
            } catch (_) {}
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                if (typeof showToast === 'function') showToast('✅ 已复制错误日志到剪贴板！', 'success');
            }).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
            document.execCommand('copy');
            if (typeof showToast === 'function') showToast('✅ 已复制错误日志到剪贴板！', 'success');
        } catch (_) {
            if (typeof showToast === 'function') showToast('❌ 复制失败，请手动长按复制', 'error');
        }
        document.body.removeChild(ta);
    }

    // 导出并下载 .log 文本文件
    function downloadErrorLogFile() {
        const content = formatErrorsForExport();
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const fileName = `mcyt_error_log_${Date.now()}.log`;

        // 优先支持安卓环境的分享与下载
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'text/plain' })] })) {
            const file = new File([blob], fileName, { type: 'text/plain' });
            navigator.share({
                title: 'MCYT错误日志诊断文件',
                text: '这是运营模拟器抓取到的异常日志，请查收',
                files: [file]
            }).catch(() => standardBlobDownload(blob, fileName));
        } else {
            standardBlobDownload(blob, fileName);
        }
    }

    function standardBlobDownload(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        if (typeof showToast === 'function') showToast(`✅ 已生成并下载：${fileName}`, 'success');
    }

    // ============================================================
    // 简易套索手绘板模态视窗（用手势画形状 -> 生成 clip-path）
    // ============================================================
    function openLassoDrawerModal(onComplete) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const retroModalTitle = document.getElementById('retroModalTitle');
        if (!modal || !modalBody) return;

        if (retroModalTitle) retroModalTitle.textContent = '🎨 手绘套索画板';

        modalBody.innerHTML = `
            <div style="text-align:center;">
                <div style="font-size:12px;color:#7a505f;margin-bottom:8px;">用单指在下方框内一笔画出任意闭合轮廓：</div>
                <div style="display:flex;justify-content:center;margin-bottom:10px;">
                    <canvas id="lassoDrawCanvas" width="220" height="220" style="background:#fff3f6;border:2px dashed var(--primary);border-radius:12px;touch-action:none;cursor:crosshair;"></canvas>
                </div>
                <div style="display:flex;gap:8px;">
                    <button class="retro-pink-btn" id="clearLassoCanvasBtn" style="flex:1;height:32px;font-size:12px;">重画</button>
                    <button class="retro-pink-btn" id="confirmLassoCanvasBtn" style="flex:1;height:32px;font-size:12px;color:#2e7d32;font-weight:750;">应用形状</button>
                </div>
            </div>
        `;

        modal.classList.add('open');

        const canvas = document.getElementById('lassoDrawCanvas');
        const ctx = canvas.getContext('2d');
        let points = [];
        let drawing = false;

        ctx.strokeStyle = '#ff5c8a';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        function getCanvasPos(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
                y: Math.max(0, Math.min(rect.height, clientY - rect.top))
            };
        }

        const startDraw = (e) => {
            drawing = true;
            points = [];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const pos = getCanvasPos(e);
            points.push(pos);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        };

        const moveDraw = (e) => {
            if (!drawing) return;
            const pos = getCanvasPos(e);
            points.push(pos);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        };

        const endDraw = () => {
            if (!drawing) return;
            drawing = false;
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 92, 138, 0.2)';
            ctx.fill();
        };

        canvas.addEventListener('touchstart', startDraw, { passive: true });
        canvas.addEventListener('touchmove', moveDraw, { passive: true });
        canvas.addEventListener('touchend', endDraw);

        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', moveDraw);
        canvas.addEventListener('mouseup', endDraw);

        document.getElementById('clearLassoCanvasBtn').onclick = () => {
            points = [];
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        };

        document.getElementById('confirmLassoCanvasBtn').onclick = () => {
            if (points.length < 8) {
                if (typeof showToast === 'function') showToast('笔画太短啦，请画出一段完整的形状', 'info');
                return;
            }

            // 抽稀并归一化为百分比坐标多边形
            const step = Math.max(1, Math.floor(points.length / 32));
            const sampled = [];
            for (let i = 0; i < points.length; i += step) {
                const px = Math.round((points[i].x / canvas.width) * 100);
                const py = Math.round((points[i].y / canvas.height) * 100);
                sampled.push(`${px}% ${py}%`);
            }

            const polygonCss = `polygon(${sampled.join(', ')})`;
            config.shape = 'lasso';
            config.lassoPath = polygonCss;
            saveConfig();
            applyOrbStyle();

            if (typeof closeModal === 'function') closeModal();
            if (typeof onComplete === 'function') onComplete();
            if (typeof showToast === 'function') showToast('✅ 专属手绘套索形状已应用！', 'success');
        };
    }

    // 辅助转义
    function escapeHtml(str) {
        return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    // ============================================================
    // 暴露 API
    // ============================================================
    window.ErrorMonitor = {
        init: initOrbDOM,
        getConfig: () => Object.assign({}, config),
        setEnabled: (bool) => {
            config.enabled = !!bool;
            saveConfig();
            applyOrbStyle();
        },
        setSize: (size) => {
            config.size = Math.max(28, Math.min(84, parseInt(size) || 46));
            saveConfig();
            applyOrbStyle();
        },
        setShape: (shapeName) => {
            config.shape = shapeName;
            saveConfig();
            applyOrbStyle();
        },
        setCustomImage: (base64) => {
            config.shape = 'custom_img';
            config.customImageData = base64;
            saveConfig();
            applyOrbStyle();
        },
        openLassoDrawer: openLassoDrawerModal,
        openLogModal: openErrorLogModal,
        getErrors: () => [...errorLogs],
        clearErrors: () => {
            errorLogs.length = 0;
            updateOrbBadge();
        }
    };

    // 自动随页面初始化注入
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOrbDOM);
    } else {
        setTimeout(initOrbDOM, 50);
    }

})(window);
