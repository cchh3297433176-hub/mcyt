// js/system/error-monitor.js
// 🐞 双模态悬浮球（报错日志排查 + 🐙丸子导引小助手）
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
        customImageData: '',
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

    function initOrbDOM() {
        if (document.getElementById('debugFloatingOrb')) return;

        orbElement = document.createElement('div');
        orbElement.id = 'debugFloatingOrb';
        orbElement.className = 'debug-floating-orb';

        orbElement.innerHTML = `
            <div class="orb-inner-icon">🐙</div>
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
    // 仿 Win98 双模态悬浮弹窗（向导丸子 + 报错日志）
    // ============================================================
    function openDualOrbModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const retroModalTitle = document.getElementById('retroModalTitle');
        if (!modal || !modalBody) return;

        if (retroModalTitle) {
            retroModalTitle.textContent = currentModalTab === 'maruko' ? '🐙 小手机向导 · 丸子' : `🐞 报错日志 (${errorLogs.length})`;
        }

        const history = window.MCYT_ASSISTANT_AGENT ? window.MCYT_ASSISTANT_AGENT.getHistory() : [];
        const greetingText = (window.MCYT_ASSISTANT_AGENT && typeof window.MCYT_ASSISTANT_AGENT.getGreeting === 'function')
            ? window.MCYT_ASSISTANT_AGENT.getGreeting()
            : '咕噜噜！我是创作者咩咩救下的小章鱼分身丸子~ 这部手机里有什么按键搞不懂，或者想去哪个 App，尽管告诉我，我带你过去！';

        modalBody.innerHTML = `
            <div>
                <!-- 双模态切换 Tab -->
                <div style="display:flex;gap:6px;margin-bottom:10px;">
                    <button class="retro-pink-btn" id="orbTabMarukoBtn" style="flex:1;height:28px;font-size:12px;${currentModalTab === 'maruko' ? 'background:var(--primary);color:#fff;' : ''}">
                        🐙 向导丸子
                    </button>
                    <button class="retro-pink-btn" id="orbTabLogsBtn" style="flex:1;height:28px;font-size:12px;${currentModalTab === 'logs' ? 'background:var(--primary);color:#fff;' : ''}">
                        🐞 报错日志 ${errorLogs.length ? `(${errorLogs.length})` : ''}
                    </button>
                </div>

                <!-- 视图 1：向导丸子纯白话对话区 -->
                <div id="orbViewMaruko" style="display:${currentModalTab === 'maruko' ? 'block' : 'none'};">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:11px;color:#7a505f;">
                        <span>你可以问我“怎么换壁纸”、“右上角的锁怎么用”：</span>
                        <button class="retro-pink-btn" id="marukoResetMemoryBtn" style="height:20px;padding:0 6px;font-size:10px;">🔄 新对话</button>
                    </div>

                    <div id="marukoDialogBox" style="height:230px;overflow-y:auto;background:#fff8fa;border:1px solid #ffd4e0;border-radius:6px;padding:8px;display:flex;flex-direction:column;gap:8px;">
                        <div style="display:flex;gap:6px;align-items:flex-start;">
                            <span style="font-size:18px;">🐙</span>
                            <div id="marukoGreetingBubble" style="background:#fff;border:1px solid #ffd4e0;padding:6px 10px;border-radius:8px;font-size:12px;line-height:1.4;color:#2e1a22;max-width:85%;">
                                ${escapeHtml(greetingText)}
                            </div>
                        </div>
                        ${history.map(m => `
                            <div style="display:flex;gap:6px;align-items:flex-start;${m.role === 'user' ? 'justify-content:flex-end;' : ''}">
                                ${m.role === 'assistant' ? `<span style="font-size:18px;">🐙</span>` : ''}
                                <div style="background:${m.role === 'user' ? 'var(--primary,#ff5c8a)' : '#fff'};color:${m.role === 'user' ? '#fff' : '#2e1a22'};border:${m.role === 'user' ? 'none' : '1px solid #ffd4e0'};padding:6px 10px;border-radius:8px;font-size:12px;line-height:1.4;max-width:85%;word-break:break-all;">
                                    ${escapeHtml(m.content)}
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="display:flex;gap:6px;margin-top:8px;">
                        <input type="text" id="marukoInputText" placeholder="问问丸子功能怎么用，或输入「带我去换壁纸」..." style="flex:1;padding:6px 8px;border-radius:6px;border:1px solid #ffccd9;font-size:12px;outline:none;">
                        <button class="retro-pink-btn" id="marukoSendBtn" style="width:54px;height:30px;font-size:12px;color:#ad1457;font-weight:750;">发送</button>
                    </div>
                </div>

                <!-- 视图 2：硬核报错日志排查区 -->
                <div id="orbViewLogs" style="display:${currentModalTab === 'logs' ? 'block' : 'none'};">
                    <div style="display:flex;gap:6px;margin-bottom:8px;">
                        <button class="retro-pink-btn" id="copyAllErrorsBtn" style="flex:1;height:28px;font-size:11px;">📋 一键复制日志</button>
                        <button class="retro-pink-btn" id="exportErrorFileBtn" style="flex:1;height:28px;font-size:11px;">📤 导出诊断文件</button>
                        <button class="retro-pink-btn" id="clearAllErrorsBtn" style="width:60px;height:28px;font-size:11px;background:#ffebee;color:#c62828;">🗑️ 清空</button>
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
                    <div style="font-size:32px;margin-bottom:6px;">🌸</div>
                    <div style="font-weight:700;font-size:13px;">当前运行平稳，零报错！</div>
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
        // Tab 切换
        document.getElementById('orbTabMarukoBtn').onclick = () => {
            currentModalTab = 'maruko';
            openDualOrbModal();
        };
        document.getElementById('orbTabLogsBtn').onclick = () => {
            currentModalTab = 'logs';
            openDualOrbModal();
        };

        // 向导发送
        const input = document.getElementById('marukoInputText');
        const sendBtn = document.getElementById('marukoSendBtn');
        const dialogBox = document.getElementById('marukoDialogBox');

        const doSend = () => {
            const text = input ? input.value.trim() : '';
            if (!text) return;
            input.value = '';

            dialogBox.innerHTML += `
                <div style="display:flex;gap:6px;align-items:flex-start;justify-content:flex-end;">
                    <div style="background:var(--primary,#ff5c8a);color:#fff;padding:6px 10px;border-radius:8px;font-size:12px;line-height:1.4;max-width:85%;word-break:break-all;">
                        ${escapeHtml(text)}
                    </div>
                </div>
            `;
            dialogBox.scrollTop = dialogBox.scrollHeight;

            sendBtn.disabled = true;
            sendBtn.textContent = '⏳';

            window.MCYT_ASSISTANT_AGENT.ask(text, (reply, goApp) => {
                sendBtn.disabled = false;
                sendBtn.textContent = '发送';
                dialogBox.innerHTML += `
                    <div style="display:flex;gap:6px;align-items:flex-start;">
                        <span style="font-size:18px;">🐙</span>
                        <div style="background:#fff;border:1px solid #ffd4e0;padding:6px 10px;border-radius:8px;font-size:12px;line-height:1.4;color:#2e1a22;max-width:85%;">
                            ${escapeHtml(reply)}
                            ${goApp ? `<div style="margin-top:4px;font-size:10px;color:var(--primary);font-weight:700;">✨ 正在为你打开该应用...</div>` : ''}
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
                        小丸子刚才思考卡壳啦：${escapeHtml(err.message)}
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

        // 新对话清空内存并更新为最新的问候语
        const resetBtn = document.getElementById('marukoResetMemoryBtn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                if (window.MCYT_ASSISTANT_AGENT) window.MCYT_ASSISTANT_AGENT.clear();
                openDualOrbModal();
                if (typeof showToast === 'function') showToast('已开启全新对话', 'info', 1000);
            };
        }

        // 绑定日志工具
        const copyBtn = document.getElementById('copyAllErrorsBtn');
        if (copyBtn) {
            copyBtn.onclick = () => {
                if (errorLogs.length === 0) { if (typeof showToast === 'function') showToast('暂无日志可复制', 'info'); return; }
                const txt = errorLogs.map(e => `[${e.time}] [${e.type}] ${e.message} (${e.source}:${e.line})`).join('\n');
                if (window.NativeBridge && window.NativeBridge.copyText) {
                    window.NativeBridge.copyText(txt);
                } else if (navigator.clipboard) {
                    navigator.clipboard.writeText(txt);
                }
                if (typeof showToast === 'function') showToast('✅ 已复制报错日志', 'success');
            };
        }

        const clearBtn = document.getElementById('clearAllErrorsBtn');
        if (clearBtn) {
            clearBtn.onclick = () => {
                errorLogs.length = 0;
                updateOrbBadge();
                openDualOrbModal();
                if (typeof showToast === 'function') showToast('已清空所有日志', 'success');
            };
        }
    }

    // ============================================================
    // API 暴露
    // ============================================================
    window.ErrorMonitor = {
        init: initOrbDOM,
        getConfig: () => Object.assign({}, config),
        setEnabled: (b) => { config.enabled = !!b; saveConfig(); applyOrbStyle(); },
        setSize: (s) => { config.size = Math.max(28, Math.min(84, parseInt(s) || 46)); saveConfig(); applyOrbStyle(); },
        setShape: (shape) => { config.shape = shape; saveConfig(); applyOrbStyle(); },
        setCustomImage: (b64) => { config.shape = 'custom_img'; config.customImageData = b64; saveConfig(); applyOrbStyle(); },
        openLogModal: openDualOrbModal,
        clearErrors: () => { errorLogs.length = 0; updateOrbBadge(); }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOrbDOM);
    } else {
        setTimeout(initOrbDOM, 50);
    }

})(window);
