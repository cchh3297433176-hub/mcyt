// js/system/error-monitor.js
// 🐞 双模态悬浮球（运行排查日志 + AI 智能向导）
// 特性：智能多气泡聊天分段、Markdown优雅解析自动换行、透明底皮肤无死板背景色、粉白系统弹窗
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
    let currentModalTab = 'maruko';
    let orbElement = null;
    let badgeElement = null;
    let isDragging = false;
    let dragStartX = 0, dragStartY = 0;
    let initialOrbX = 0, initialOrbY = 0;
    let hasMoved = false;

    // 自定义粉白风格弹窗（彻底取代原生黑框 alert）
    function showRetroPinkAlert(title, message) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const retroModalTitle = document.getElementById('retroModalTitle');
        if (!modal || !modalBody) {
            if (typeof showToast === 'function') showToast(message, 'info');
            return;
        }

        if (retroModalTitle) retroModalTitle.textContent = title || '系统提示';
        modalBody.innerHTML = `
            <div style="font-size:12.5px;line-height:1.6;color:#2e1a22;padding:6px 2px;word-break:break-word;">
                ${escapeHtml(message)}
            </div>
            <div style="margin-top:14px;text-align:right;">
                <button class="retro-pink-btn" onclick="closeModal()" style="padding:0 14px;height:26px;font-size:12px;">确定</button>
            </div>
        `;
        modal.classList.add('open');
    }

    // 智能排版解析：清洗 Markdown 符号并支持优雅排版
    function formatAssistantText(rawText) {
        if (!rawText) return '';
        let str = String(rawText);
        // 清洗无意义的 markdown 标题井号
        str = str.replace(/^#{1,6}\s*/gm, '');
        // 转义 HTML
        str = escapeHtml(str);
        // 恢复支持加粗 **text** -> <strong>text</strong>
        str = str.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--primary,#ff5c8a);font-weight:750;">$1</strong>');
        // 换行替换
        str = str.replace(/\n/g, '<br>');
        return str;
    }

    // 拆分长消息为多个自然分段气泡（模拟微信分句发送，告别一大坨死板文字）
    function splitIntoBubbles(text) {
        if (!text) return [];
        // 按双换行或明显的序号分段
        const rawParagraphs = text.split(/\n{2,}/);
        const bubbles = [];

        rawParagraphs.forEach(p => {
            const trimmed = p.trim();
            if (!trimmed) return;
            // 如果某一段依然非常长且包含 1. 2. 列表，进行二次优雅微拆
            if (trimmed.length > 180 && /\d+\.\s+/.test(trimmed)) {
                const subParts = trimmed.split(/(?=\d+\.\s+)/);
                subParts.forEach(sp => {
                    const st = sp.trim();
                    if (st) bubbles.push(st);
                });
            } else {
                bubbles.push(trimmed);
            }
        });

        return bubbles.length ? bubbles : [text];
    }

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
        orbElement.style.backgroundColor = 'transparent';
        orbElement.classList.add('orb-transparent-skin');

        const innerIcon = orbElement.querySelector('.orb-inner-icon');

        if (config.shape === 'circle') {
            orbElement.style.borderRadius = '50%';
            if (innerIcon) innerIcon.style.display = 'flex';
        } else if (config.shape === 'squircle') {
            orbElement.style.borderRadius = Math.round(s * 0.28) + 'px';
            if (innerIcon) innerIcon.style.display = 'flex';
        } else if (config.shape === 'heart') {
            orbElement.style.clipPath = 'polygon(50% 15%, 80% 0%, 100% 25%, 100% 55%, 50% 95%, 0% 55%, 0% 25%, 20% 0%)';
            if (innerIcon) innerIcon.style.display = 'flex';
        } else if (config.shape === 'lasso' && config.lassoPath) {
            orbElement.style.clipPath = config.lassoPath;
            if (innerIcon) innerIcon.style.display = 'flex';
        } else if (config.shape === 'custom_img' && config.customImageData) {
            orbElement.style.borderRadius = '0';
            orbElement.style.backgroundImage = `url('${config.customImageData}')`;
            orbElement.style.backgroundSize = 'contain';
            orbElement.style.backgroundRepeat = 'no-repeat';
            orbElement.style.backgroundPosition = 'center';
            if (innerIcon) innerIcon.style.display = 'none';
        } else {
            orbElement.style.borderRadius = '50%';
            if (innerIcon) innerIcon.style.display = 'flex';
        }

        updateOrbBadge();
    }

    function initOrbDOM() {
        if (document.getElementById('debugFloatingOrb')) return;

        orbElement = document.createElement('div');
        orbElement.id = 'debugFloatingOrb';
        orbElement.className = 'debug-floating-orb orb-transparent-skin';

        orbElement.innerHTML = `
            <div class="orb-inner-icon" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                <img src="assets/system/orb_assistant.png" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" alt="向导" />
                <svg viewBox="0 0 24 24" style="display:none;width:24px;height:24px;fill:var(--primary,#ff5c8a);">
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

    // 双模态窗口渲染
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

        // 渲染对话气泡序列（支持助手多气泡自然呈现）
        let bubblesHTML = `
            <div style="display:flex;flex-direction:column;gap:4px;max-width:88%;">
                <div style="background:#fff;border:1px solid #ffd4e0;padding:8px 12px;border-radius:10px;font-size:12px;line-height:1.55;color:#2e1a22;white-space:pre-wrap;word-break:break-word;box-shadow:0 2px 6px rgba(216,27,96,0.03);">
                    ${formatAssistantText(greetingText)}
                </div>
            </div>
        `;

        history.forEach(m => {
            if (m.role === 'user') {
                bubblesHTML += `
                    <div style="display:flex;justify-content:flex-end;width:100%;">
                        <div style="background:var(--primary,#ff5c8a);color:#fff;padding:8px 12px;border-radius:10px;font-size:12px;line-height:1.5;max-width:85%;white-space:pre-wrap;word-break:break-word;box-shadow:0 2px 6px rgba(216,27,96,0.15);">
                            ${escapeHtml(m.content)}
                        </div>
                    </div>
                `;
            } else {
                const subBubbles = splitIntoBubbles(m.content);
                bubblesHTML += `
                    <div style="display:flex;flex-direction:column;gap:5px;max-width:90%;">
                        ${subBubbles.map(sub => `
                            <div style="background:#fff;border:1px solid #ffd4e0;padding:8px 12px;border-radius:10px;font-size:12px;line-height:1.55;color:#2e1a22;white-space:pre-wrap;word-break:break-word;box-shadow:0 2px 6px rgba(216,27,96,0.03);">
                                ${formatAssistantText(sub)}
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        });

        modalBody.innerHTML = `
            <div>
                <!-- 切换 Tab -->
                <div style="display:flex;gap:6px;margin-bottom:10px;">
                    <button class="retro-pink-btn" id="orbTabMarukoBtn" style="flex:1;height:28px;font-size:12px;${currentModalTab === 'maruko' ? 'background:var(--primary);color:#fff;' : ''}">
                        智能向导
                    </button>
                    <button class="retro-pink-btn" id="orbTabLogsBtn" style="flex:1;height:28px;font-size:12px;${currentModalTab === 'logs' ? 'background:var(--primary);color:#fff;' : ''}">
                        运行日志 ${errorLogs.length ? `(${errorLogs.length})` : ''}
                    </button>
                </div>

                <!-- 视图 1：智能向导多气泡对话区 -->
                <div id="orbViewMaruko" style="display:${currentModalTab === 'maruko' ? 'block' : 'none'};">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:11px;color:#7a505f;">
                        <span>随时提问功能与按键指南：</span>
                        <button class="retro-pink-btn" id="marukoResetMemoryBtn" title="开启新对话" style="width:24px;height:22px;padding:0;display:flex;align-items:center;justify-content:center;">
                            <svg style="width:13px;height:13px;fill:currentColor;" viewBox="0 0 24 24">
                                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                            </svg>
                        </button>
                    </div>

                    <div id="marukoDialogBox" style="height:240px;overflow-y:auto;background:#fff8fa;border:1px solid #ffd4e0;border-radius:8px;padding:10px 8px;display:flex;flex-direction:column;gap:8px;">
                        ${bubblesHTML}
                    </div>

                    <!-- 输入框彻底去除强塞的预置文字，空白留给用户输入 -->
                    <div style="display:flex;gap:6px;margin-top:8px;">
                        <input type="text" id="marukoInputText" placeholder="问问向导功能怎么用，或输入「带我去换壁纸」..." style="flex:1;padding:7px 10px;border-radius:8px;border:1px solid #ffccd9;font-size:12px;outline:none;background:#ffffff;">
                        <button class="retro-pink-btn" id="marukoSendBtn" style="width:54px;height:32px;font-size:12px;color:#ad1457;font-weight:750;">发送</button>
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

            // 用户气泡上屏
            dialogBox.innerHTML += `
                <div style="display:flex;justify-content:flex-end;width:100%;">
                    <div style="background:var(--primary,#ff5c8a);color:#fff;padding:8px 12px;border-radius:10px;font-size:12px;line-height:1.5;max-width:85%;white-space:pre-wrap;word-break:break-word;box-shadow:0 2px 6px rgba(216,27,96,0.15);">
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

                // 拆分为多个自然气泡连续展现
                const subBubbles = splitIntoBubbles(reply);
                dialogBox.innerHTML += `
                    <div style="display:flex;flex-direction:column;gap:5px;max-width:90%;">
                        ${subBubbles.map(sub => `
                            <div style="background:#fff;border:1px solid #ffd4e0;padding:8px 12px;border-radius:10px;font-size:12px;line-height:1.55;color:#2e1a22;white-space:pre-wrap;word-break:break-word;box-shadow:0 2px 6px rgba(216,27,96,0.03);">
                                ${formatAssistantText(sub)}
                            </div>
                        `).join('')}
                        ${goApp ? `<div style="padding:4px 8px;font-size:11px;color:var(--primary);font-weight:700;">✨ 正在为你跳转打开对应应用...</div>` : ''}
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
                    <div style="font-size:11px;color:#c62828;text-align:center;padding:4px;">
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

        const resetBtn = document.getElementById('marukoResetMemoryBtn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                if (window.MCYT_ASSISTANT_AGENT) window.MCYT_ASSISTANT_AGENT.clear();
                openDualOrbModal();
                if (typeof showToast === 'function') showToast('已开启新对话', 'info', 1000);
            };
        }

        const copyBtn = document.getElementById('copyAllErrorsBtn');
        if (copyBtn) {
            copyBtn.onclick = () => {
                if (errorLogs.length === 0) {
                    showRetroPinkAlert('提示', '当前暂无报错日志可复制。');
                    return;
                }
                const txt = errorLogs.map(e => `[${e.time}] [${e.type}] ${e.message} (${e.source}:${e.line})\n${e.stack || ''}`).join('\n\n');
                if (window.NativeBridge && window.NativeBridge.copyText) {
                    window.NativeBridge.copyText(txt);
                } else if (navigator.clipboard) {
                    navigator.clipboard.writeText(txt);
                }
                showRetroPinkAlert('复制成功', '报错排查日志已全部成功复制到剪贴板！');
            };
        }

        const exportBtn = document.getElementById('exportErrorFileBtn');
        if (exportBtn) {
            exportBtn.onclick = () => {
                if (errorLogs.length === 0) {
                    showRetroPinkAlert('提示', '当前暂无报错日志可导出。');
                    return;
                }
                const txt = errorLogs.map(e => `[${e.time}] [${e.type}] ${e.message} (${e.source}:${e.line})\n${e.stack || ''}`).join('\n\n');
                try {
                    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `mcyt_diagnostic_${Date.now()}.log`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showRetroPinkAlert('导出成功', '诊断排查文件 (.log) 已成功生成并触发下载保存！');
                } catch (e) {
                    showRetroPinkAlert('导出失败', e.message);
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

        overlay.querySelector('#cancelLassoBtn').onclick = () => overlay.remove();

        overlay.querySelector('#confirmLassoBtn').onclick = () => {
            if (points.length < 5) {
                if (typeof showToast === 'function') showToast('请画出稍微完整一些的形状哦', 'info');
                return;
            }
            const poly = points.map(p => `${((p.x / size) * 100).toFixed(1)}% ${((p.y / size) * 100).toFixed(1)}%`).join(', ');
            config.shape = 'lasso';
            config.lassoPath = `polygon(${poly})`;
            saveConfig();
            applyOrbStyle();
            overlay.remove();
            if (typeof showToast === 'function') showToast('专属随手画形状已生效', 'success');
        };
    }

    window.ErrorMonitor = {
        init: initOrbDOM,
        getConfig: () => Object.assign({}, config),
        setEnabled: (b) => { config.enabled = !!b; saveConfig(); applyOrbStyle(); },
        setSize: (s) => { config.size = Math.max(28, Math.min(84, parseInt(s) || 46)); saveConfig(); applyOrbStyle(); },
        setShape: (shape) => {
            config.shape = shape;
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
