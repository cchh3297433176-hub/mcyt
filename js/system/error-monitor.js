// js/system/error-monitor.js
// 🐞 双模态悬浮球（运行排查日志 + AI 智能向导）
// ============================================================

(function(window) {
    'use strict';

    const STORAGE_KEY_CONFIG = 'mc_yt_error_orb_config';
    const MAX_LOGS = 50;

    const defaultConfig = {
        enabled: true,
        size: 46,
        shape: 'circle',
        lassoPath: '',
        customImageData: '', // 保持长期持久化，切换形状时不丢
        position: { x: null, y: null }
    };

    let config = Object.assign({}, defaultConfig);
    try {
        const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
        if (saved) Object.assign(config, JSON.parse(saved));
    } catch (_) {}

    const errorLogs = [];
    let currentModalTab = 'maruko'; // 'maruko' | 'logs'
    let orbElement = null;
    let badgeElement = null;
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let initialOrbX = 0, initialOrbY = 0;
    let hasMoved = false;

    function saveConfig() {
        try { localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config)); } catch (_) {}
    }

    function getNowTimeStr() {
        const d = new Date();
        const pad = n => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
    }

    function recordError(type, message, source, lineno, colno, errorObj) {
        const time = getNowTimeStr();
        const stack = errorObj && errorObj.stack ? errorObj.stack : '';
        const item = {
            id: 'err_' + Date.now(),
            time, type,
            message: String(message || '未知异常'),
            source: source || 'inline',
            line: lineno || 0,
            col: colno || 0,
            stack
        };

        errorLogs.unshift(item);
        if (errorLogs.length > MAX_LOGS) errorLogs.pop();

        updateOrbBadge();
        shakeOrb();
    }

    window.addEventListener('error', function(event) {
        recordError('ScriptError', event.message, event.filename, event.lineno, event.colno, event.error);
    });

    window.addEventListener('unhandledrejection', function(event) {
        const reason = event.reason;
        const msg = (reason && (reason.message || reason.stack)) ? (reason.message || String(reason)) : 'Promise Rejection 未捕获异常';
        recordError('UnhandledPromise', msg, '', 0, 0, reason instanceof Error ? reason : null);
    });

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

    function applyOrbStyle() {
        if (!orbElement) return;
        const s = config.size;
        orbElement.style.width = s + 'px';
        orbElement.style.height = s + 'px';
        orbElement.style.display = config.enabled ? 'flex' : 'none';

        orbElement.style.clipPath = '';
        orbElement.style.borderRadius = '';
        orbElement.style.backgroundImage = '';
        orbElement.style.backgroundSize = '';
        orbElement.style.backgroundPosition = '';
        orbElement.style.backgroundColor = '';

        // 默认移除透明阴影抑制类
        orbElement.classList.remove('orb-transparent-skin');

        const innerIcon = orbElement.querySelector('.orb-inner-icon');

        if (config.shape === 'circle') {
            orbElement.style.borderRadius = '50%';
            orbElement.style.backgroundColor = 'var(--primary, #ff5c8a)';
            if (innerIcon) innerIcon.style.display = 'flex';
        } else if (config.shape === 'squircle') {
            orbElement.style.borderRadius = Math.round(s * 0.28) + 'px';
            orbElement.style.backgroundColor = 'var(--primary, #ff5c8a)';
            if (innerIcon) innerIcon.style.display = 'flex';
        } else if (config.shape === 'heart') {
            orbElement.style.clipPath = 'polygon(50% 15%, 80% 0%, 100% 25%, 100% 55%, 50% 95%, 0% 55%, 0% 25%, 20% 0%)';
            orbElement.style.backgroundColor = 'var(--primary, #ff5c8a)';
            if (innerIcon) innerIcon.style.display = 'flex';
        } else if (config.shape === 'lasso' && config.lassoPath) {
            orbElement.style.clipPath = config.lassoPath;
            orbElement.style.backgroundColor = 'var(--primary, #ff5c8a)';
            if (innerIcon) innerIcon.style.display = 'flex';
        } else if (config.shape === 'custom_img' && config.customImageData) {
            orbElement.classList.add('orb-transparent-skin');
            orbElement.style.borderRadius = '0';
            orbElement.style.backgroundColor = 'transparent';
            orbElement.style.backgroundImage = `url('${config.customImageData}')`;
            orbElement.style.backgroundSize = 'contain';
            orbElement.style.backgroundRepeat = 'no-repeat';
            orbElement.style.backgroundPosition = 'center';
            if (innerIcon) innerIcon.style.display = 'none';
        } else {
            orbElement.style.borderRadius = '50%';
            orbElement.style.backgroundColor = 'var(--primary, #ff5c8a)';
            if (innerIcon) innerIcon.style.display = 'flex';
        }

        updateOrbBadge();
    }

    function initOrbDOM() {
        if (document.getElementById('debugFloatingOrb')) return;

        orbElement = document.createElement('div');
        orbElement.id = 'debugFloatingOrb';
        orbElement.className = 'debug-floating-orb';

        // 默认内嵌图标：优先探测内部专属皮肤资产，支持优雅矢量兜底，拒绝 Emoji
        orbElement.innerHTML = `
            <div class="orb-inner-icon">
                <img src="assets/system/orb_assistant.png" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" alt="向导" />
                <svg viewBox="0 0 24 24" style="display:none;width:22px;height:22px;fill:#ffffff;">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm0-4h-2V7h2v5z"/>
                </svg>
            </div>
            <div class="orb-badge" id="debugOrbBadge" style="display:none;">0</div>
        `;

        document.body.appendChild(orbElement);
        badgeElement = orbElement.querySelector('#debugOrbBadge');

        applyOrbStyle();

        const s = config.size;
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        let posX = config.position.x;
        let posY = config.position.y;

        if (posX === null || posY === null || isNaN(posX) || isNaN(posY)) {
            posX = winW - s - 10;
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
            if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) hasMoved = true;

            const s = config.size;
            let nextX = Math.max(0, Math.min(window.innerWidth - s, initialOrbX + deltaX));
            let nextY = Math.max(36, Math.min(window.innerHeight - s - 12, initialOrbY + deltaY));

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

            let snapX = curX < midX ? 8 : (window.innerWidth - s - 8);
            let snapY = Math.max(42, Math.min(window.innerHeight - s - 42, curY));

            orbElement.style.left = snapX + 'px';
            orbElement.style.top = snapY + 'px';

            config.position = { x: snapX, y: snapY };
            saveConfig();

            if (!hasMoved) {
                openDualOrbModal();
            }
        };

        orbElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) onTouchStart(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });

        window.addEventListener('touchmove', (e) => {
            if (isDragging && e.touches.length === 1) onTouchMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });

        window.addEventListener('touchend', () => { if (isDragging) onTouchEnd(); });

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
    // 双模态向导与排查视窗
    // ============================================================
    function openDualOrbModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const retroModalTitle = document.getElementById('retroModalTitle');
        if (!modal || !modalBody) return;

        if (retroModalTitle) {
            retroModalTitle.textContent = currentModalTab === 'maruko' ? '智能系统向导' : `运行日志排查 (${errorLogs.length})`;
        }

        const history = window.MCYT_ASSISTANT_AGENT ? window.MCYT_ASSISTANT_AGENT.getHistory() : [];
        const greetingText = (window.MCYT_ASSISTANT_AGENT && typeof window.MCYT_ASSISTANT_AGENT.getGreeting === 'function')
            ? window.MCYT_ASSISTANT_AGENT.getGreeting()
            : '你好！我是你的手机系统智能向导。如果你对这部手机的任何按键、功能或独立 App 感到疑惑，随时问我，我可以直接为你解答或带路。';

        modalBody.innerHTML = `
            <div>
                <!-- 切换 Tab（纯粉白，无廉价 Emoji） -->
                <div style="display:flex;gap:6px;margin-bottom:10px;">
                    <button class="retro-pink-btn" id="orbTabMarukoBtn" style="flex:1;height:28px;font-size:12px;${currentModalTab === 'maruko' ? 'background:var(--primary);color:#fff;' : ''}">
                        智能向导
                    </button>
                    <button class="retro-pink-btn" id="orbTabLogsBtn" style="flex:1;height:28px;font-size:12px;${currentModalTab === 'logs' ? 'background:var(--primary);color:#fff;' : ''}">
                        运行日志 ${errorLogs.length ? `(${errorLogs.length})` : ''}
                    </button>
                </div>

                <!-- 视图 1：智能向导对话区 -->
                <div id="orbViewMaruko" style="display:${currentModalTab === 'maruko' ? 'block' : 'none'};">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:11px;color:#7a505f;">
                        <span>随时提问“如何更换壁纸”、“右上角锁屏怎么用”：</span>
                        <!-- 纯 SVG 刷新单图标，彻底去除多余汉字，对齐居中 -->
                        <button class="retro-pink-btn" id="marukoResetMemoryBtn" title="开启新对话" style="width:24px;height:22px;padding:0;display:flex;align-items:center;justify-content:center;">
                            <svg style="width:13px;height:13px;fill:currentColor;" viewBox="0 0 24 24">
                                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                            </svg>
                        </button>
                    </div>

                    <div id="marukoDialogBox" style="height:230px;overflow-y:auto;background:#fff8fa;border:1px solid #ffd4e0;border-radius:6px;padding:8px;display:flex;flex-direction:column;gap:8px;">
                        <div style="display:flex;gap:6px;align-items:flex-start;">
                            <div style="background:#fff;border:1px solid #ffd4e0;padding:6px 10px;border-radius:8px;font-size:12px;line-height:1.4;color:#2e1a22;max-width:92%;">
                                ${escapeHtml(greetingText)}
                            </div>
                        </div>
                        ${history.map(m => `
                            <div style="display:flex;gap:6px;align-items:flex-start;${m.role === 'user' ? 'justify-content:flex-end;' : ''}">
                                <div style="background:${m.role === 'user' ? 'var(--primary,#ff5c8a)' : '#fff'};color:${m.role === 'user' ? '#fff' : '#2e1a22'};border:${m.role === 'user' ? 'none' : '1px solid #ffd4e0'};padding:6px 10px;border-radius:8px;font-size:12px;line-height:1.4;max-width:88%;word-break:break-all;">
                                    ${escapeHtml(m.content)}
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="display:flex;gap:6px;margin-top:8px;">
                        <input type="text" id="marukoInputText" placeholder="问问向导功能怎么用，或输入「带我去换壁纸」..." style="flex:1;padding:6px 8px;border-radius:6px;border:1px solid #ffccd9;font-size:12px;outline:none;">
                        <button class="retro-pink-btn" id="marukoSendBtn" style="width:54px;height:30px;font-size:12px;color:#ad1457;font-weight:750;">发送</button>
                    </div>
                </div>

                <!-- 视图 2：运行排查日志区 -->
                <div id="orbViewLogs" style="display:${currentModalTab === 'logs' ? 'block' : 'none'};">
                    <div style="display:flex;gap:6px;margin-bottom:8px;">
                        <button class="retro-pink-btn" id="copyAllErrorsBtn" style="flex:1;height:28px;font-size:11px;">复制日志</button>
                        <button class="retro-pink-btn" id="exportErrorFileBtn" style="flex:1;height:28px;font-size:11px;">导出诊断文件</button>
                        <button class="retro-pink-btn" id="clearAllErrorsBtn" style="width:56px;height:28px;font-size:11px;background:#ffebee;color:#c62828;">清空</button>
                    </div>
                    <div style="height:240px;overflow-y:auto;padding-right:2px;">
                        ${renderLogsHTML()}
                    </div>
                </div>

                <div style="margin-top:10px;text-align:right;">
                    <button class="retro-pink-btn" onclick="closeModal()" style="width:70px;height:26px;font-size:11.5px;">关闭</button>
                </div>
            </div>
        `;

        modal.classList.add('open');
        bindDualModalEvents();
    }

    function renderLogsHTML() {
        if (errorLogs.length === 0) {
            return `
                <div style="text-align:center;padding:32px 12px;color:#7a505f;">
                    <div style="font-weight:700;font-size:13px;">当前系统运行平稳，暂无未捕获异常</div>
                </div>
            `;
        }
        return errorLogs.map((item, idx) => `
            <div style="border:1px solid #ffd4e0;background:#fff8fa;border-radius:6px;padding:8px;margin-bottom:6px;font-size:11.5px;">
                <div style="display:flex;justify-content:space-between;color:#ad1457;font-weight:750;border-bottom:1px dashed #ffd4e0;padding-bottom:3px;margin-bottom:4px;">
                    <span>#${errorLogs.length - idx} [${item.type}]</span>
                    <span style="color:#7a505f;font-weight:normal;">${item.time}</span>
                </div>
                <div style="color:#2e1a22;word-break:break-all;line-height:1.4;">${escapeHtml(item.message)}</div>
                ${item.source ? `<div style="color:#888;font-size:10px;margin-top:3px;">${escapeHtml(item.source)}:${item.line}</div>` : ''}
            </div>
        `).join('');
    }

    function bindDualModalEvents() {
        document.getElementById('orbTabMarukoBtn').onclick = () => {
            currentModalTab = 'maruko';
            openDualOrbModal();
        };
        document.getElementById('orbTabLogsBtn').onclick = () => {
            currentModalTab = 'logs';
            openDualOrbModal();
        };

        const input = document.getElementById('marukoInputText');
        const sendBtn = document.getElementById('marukoSendBtn');
        const dialogBox = document.getElementById('marukoDialogBox');

        const doSend = () => {
            const text = input ? input.value.trim() : '';
            if (!text) return;
            input.value = '';

            dialogBox.innerHTML += `
                <div style="display:flex;gap:6px;align-items:flex-start;justify-content:flex-end;">
                    <div style="background:var(--primary,#ff5c8a);color:#fff;padding:6px 10px;border-radius:8px;font-size:12px;line-height:1.4;max-width:88%;word-break:break-all;">
                        ${escapeHtml(text)}
                    </div>
                </div>
            `;
            dialogBox.scrollTop = dialogBox.scrollHeight;

            sendBtn.disabled = true;
            sendBtn.textContent = '...';

            window.MCYT_ASSISTANT_AGENT.ask(text, (reply, goApp) => {
                sendBtn.disabled = false;
                sendBtn.textContent = '发送';
                dialogBox.innerHTML += `
                    <div style="display:flex;gap:6px;align-items:flex-start;">
                        <div style="background:#fff;border:1px solid #ffd4e0;padding:6px 10px;border-radius:8px;font-size:12px;line-height:1.4;color:#2e1a22;max-width:88%;">
                            ${escapeHtml(reply)}
                            ${goApp ? `<div style="margin-top:4px;font-size:10px;color:var(--primary);font-weight:700;">正在为你跳转打开对应应用...</div>` : ''}
                        </div>
                    </div>
                `;
                dialogBox.scrollTop = dialogBox.scrollHeight;
                if (goApp) {
                    setTimeout(() => { if (typeof closeModal === 'function') closeModal(); }, 900);
                }
            }, (err) => {
                sendBtn.disabled = false;
                sendBtn.textContent = '发送';
                dialogBox.innerHTML += `
                    <div style="font-size:11px;color:#c62828;text-align:center;">
                        向导思考超时或异常：${escapeHtml(err.message)}
                    </div>
                `;
            });
        };

        if (sendBtn) sendBtn.onclick = doSend;
        if (input) {
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    doSend();
                }
            };
        }

        // 单图标刷新新对话
        const resetBtn = document.getElementById('marukoResetMemoryBtn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                if (window.MCYT_ASSISTANT_AGENT) window.MCYT_ASSISTANT_AGENT.clear();
                openDualOrbModal();
                if (typeof showToast === 'function') showToast('已开启新对话', 'info', 1000);
            };
        }

        // 复制日志（带明确弹窗提示）
        const copyBtn = document.getElementById('copyAllErrorsBtn');
        if (copyBtn) {
            copyBtn.onclick = () => {
                if (errorLogs.length === 0) {
                    alert('当前暂无报错日志可复制');
                    return;
                }
                const txt = errorLogs.map(e => `[${e.time}] [${e.type}] ${e.message} (${e.source}:${e.line})\n${e.stack || ''}`).join('\n\n');
                if (window.NativeBridge && window.NativeBridge.copyText) {
                    window.NativeBridge.copyText(txt);
                } else if (navigator.clipboard) {
                    navigator.clipboard.writeText(txt);
                }
                alert('报错日志已成功复制到剪贴板！');
            };
        }

        // 导出诊断文件（带弹窗提示与下载触发）
        const exportBtn = document.getElementById('exportErrorFileBtn');
        if (exportBtn) {
            exportBtn.onclick = () => {
                if (errorLogs.length === 0) {
                    alert('当前暂无报错日志可导出');
                    return;
                }
                const txt = errorLogs.map(e => `[${e.time}] [${e.type}] ${e.message} (${e.source}:${e.line})\n${e.stack || ''}`).join('\n\n');
                try {
                    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `mcyt_error_diagnostic_${Date.now()}.log`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    alert('诊断日志文件 (.log) 已成功生成并触发下载！');
                } catch (e) {
                    alert('导出失败: ' + e.message);
                }
            };
        }

        const clearBtn = document.getElementById('clearAllErrorsBtn');
        if (clearBtn) {
            clearBtn.onclick = () => {
                errorLogs.length = 0;
                updateOrbBadge();
                openDualOrbModal();
                if (typeof showToast === 'function') showToast('已清空运行日志', 'success');
            };
        }
    }

    // ============================================================
    // 内置手绘套索画板（绝不报 Script Error）
    // ============================================================
    function openLassoDrawer() {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(24,17,20,0.92);z-index:4000;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:16px;touch-action:none;';
        
        overlay.innerHTML = `
            <div style="color:#ffffff;font-size:13.5px;font-weight:700;margin-top:10px;">
                在屏幕上随手一笔画出闭合轮廓
            </div>
            <canvas id="lassoCanvas" style="background:#ffffff;border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,0.5);touch-action:none;"></canvas>
            <div style="display:flex;gap:12px;width:100%;max-width:320px;margin-bottom:14px;">
                <button class="btn-secondary" id="cancelLassoBtn" style="flex:1;padding:10px;">取消</button>
                <button class="btn-primary" id="confirmLassoBtn" style="flex:1;padding:10px;">应用形状</button>
            </div>
        `;

        document.body.appendChild(overlay);

        const canvas = overlay.querySelector('#lassoCanvas');
        const ctx = canvas.getContext('2d');
        const size = Math.min(window.innerWidth - 48, 280);
        canvas.width = size;
        canvas.height = size;

        ctx.strokeStyle = '#ff5c8a';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        let drawing = false;
        const points = [];

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: Math.max(0, Math.min(size, clientX - rect.left)),
                y: Math.max(0, Math.min(size, clientY - rect.top))
            };
        };

        const startDraw = (e) => {
            drawing = true;
            points.length = 0;
            ctx.clearRect(0, 0, size, size);
            const p = getPos(e);
            points.push(p);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
        };

        const moveDraw = (e) => {
            if (!drawing) return;
            const p = getPos(e);
            points.push(p);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
        };

        const endDraw = () => {
            if (!drawing) return;
            drawing = false;
            if (points.length > 2) {
                ctx.closePath();
                ctx.stroke();
            }
        };

        canvas.addEventListener('touchstart', startDraw, { passive: false });
        canvas.addEventListener('touchmove', moveDraw, { passive: false });
        canvas.addEventListener('touchend', endDraw);
        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', moveDraw);
        canvas.addEventListener('mouseup', endDraw);

        overlay.querySelector('#cancelLassoBtn').onclick = () => {
            document.body.removeChild(overlay);
        };

        overlay.querySelector('#confirmLassoBtn').onclick = () => {
            if (points.length < 5) {
                if (typeof showToast === 'function') showToast('请画出稍微完整一些的形状哦', 'info');
                return;
            }
            // 归一化为 CSS polygon 路径百分比
            const poly = points.map(p => `${((p.x / size) * 100).toFixed(1)}% ${((p.y / size) * 100).toFixed(1)}%`).join(', ');
            config.shape = 'lasso';
            config.lassoPath = `polygon(${poly})`;
            saveConfig();
            applyOrbStyle();
            document.body.removeChild(overlay);
            if (typeof showToast === 'function') showToast('专属随手画形状已生效', 'success');
        };
    }

    // ============================================================
    // API 暴露
    // ============================================================
    window.ErrorMonitor = {
        init: initOrbDOM,
        getConfig: () => Object.assign({}, config),
        setEnabled: (b) => { config.enabled = !!b; saveConfig(); applyOrbStyle(); },
        setSize: (s) => { config.size = Math.max(28, Math.min(84, parseInt(s) || 46)); saveConfig(); applyOrbStyle(); },
        setShape: (shape) => {
            config.shape = shape;
            // 切换形状时不抹除 customImageData，保留用户相册导入记录
            saveConfig();
            applyOrbStyle();
        },
        setCustomImage: (b64) => {
            config.shape = 'custom_img';
            config.customImageData = b64;
            saveConfig();
            applyOrbStyle();
        },
        openLogModal: openDualOrbModal,
        openLassoDrawer: openLassoDrawer,
        clearErrors: () => { errorLogs.length = 0; updateOrbBadge(); }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOrbDOM);
    } else {
        setTimeout(initOrbDOM, 50);
    }

})(window);
