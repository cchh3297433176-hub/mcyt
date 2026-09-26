/**
 * js/apps/chat/chat-app-call.js
 * 📞 主播掌机 · 微信音视频实时通话独立中枢（仿豆包实时通话交互架构）
 * 🛡️ 微信原生白灰微绿极简设计，无伤眼怪异滤镜。
 * 🌟 核心特性：
 *  1. 语音电话与视频电话双模态全屏沉浸视讯 HUD；
 *  2. 前置摄像头与后置摄像头无缝平滑翻转切换（facingMode: user / environment）；
 *  3. 豆包式全双工语音监听（VAD）：说话实时字幕草稿，停顿 5 秒自动触发 AI 回答；
 *  4. 豆包式“开口即打断”：AI 正在生成或朗读时，用户中途插话瞬间掐断播音与请求，重回倾听态；
 *  5. 首次视频隐私门禁（本地抽帧不存云端、支持下次不再提醒，权限被拒友好引导设置）；
 *  6. 视频通话支持实时从摄像头抽帧直连独立识图 API，无缝事实感知注入；
 *  7. 专属极速口语 Prompt（剥离联网/表情包，超低延迟短句交互，细腻背景音描写）；
 *  8. 底部流式双轨字幕（最近对白高亮，历史对白平滑淡化且可自由滚动）；
 *  9. 通话结束全自动归档为第三人称具名客观记录（IndexedDB 永久保存）。
 */

(function() {
    'use strict';

    // 通话运行态对象
    window._activeCallSession = null;

    const PRIVACY_STORAGE_KEY = 'mcyt_call_video_privacy_agreed';

    // 格式化秒数为 00:00
    function formatCallTimer(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    // 辅助：获取角色全名
    function getNpcFullName(npcId) {
        if (!window.G || !window.G.npcs) return '好友';
        const n = window.G.npcs[npcId];
        if (!n) return '好友';
        return n.remark ? `${n.remark}(${n.name})` : (n.name || '好友');
    }

    // 辅助：获取玩家全名
    function getPlayerFullName() {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };
        return curAcc.name || '我';
    }

    // 检查首次使用视频电话隐私协议
    function checkVideoPrivacyPermission(onApproved) {
        const agreed = localStorage.getItem(PRIVACY_STORAGE_KEY);
        if (agreed === 'true') {
            onApproved();
            return;
        }

        const modalHtml = `
            <div style="text-align:left;font-size:13px;line-height:1.6;color:#333;">
                <div style="font-weight:600;font-size:14.5px;color:#181818;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                    <svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:none;stroke:#07c160;stroke-width:2;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <span>视频通话隐私安全声明</span>
                </div>
                <p style="margin:0 0 8px;">
                    主播掌机基于 <b>100% 纯本地运行架构</b>。开启视频通话将调用您的设备摄像头：
                </p>
                <ul style="margin:0 0 10px;padding-left:18px;color:#555;font-size:12px;">
                    <li>视频画面<b>仅在手机本地临时渲染</b>，掌机云端服务器绝不录制、绝不抓取或存储您的面容隐私；</li>
                    <li>若您配置了视觉识图 AI，画面抽帧仅用于单次客观理解，解析后即刻销毁。</li>
                </ul>
                <div style="background:#f7f7f7;padding:8px 10px;border-radius:6px;border:0.5px solid #eee;margin-top:6px;">
                    <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#222;cursor:pointer;user-select:none;">
                        <input type="checkbox" id="wcleanCallPrivacyDontRemind" checked style="width:16px;height:16px;accent-color:#07c160;">
                        <span>我已知晓并同意，下次不再提醒</span>
                    </label>
                </div>
            </div>
        `;

        if (typeof window.openWechatCleanModal === 'function') {
            window.openWechatCleanModal('视频权限与隐私说明', modalHtml, () => {
                const dontRemind = !!document.getElementById('wcleanCallPrivacyDontRemind')?.checked;
                if (dontRemind) {
                    localStorage.setItem(PRIVACY_STORAGE_KEY, 'true');
                }
                onApproved();
            });
        } else {
            localStorage.setItem(PRIVACY_STORAGE_KEY, 'true');
            onApproved();
        }
    }

    // 友好权限被拒弹窗引导
    function showPermissionDeniedGuide(mediaType = '摄像头') {
        const guideHtml = `
            <div style="text-align:left;font-size:13px;color:#333;line-height:1.5;">
                <p style="margin:0 0 8px;font-weight:600;color:#fa5151;">无法获取${mediaType}权限</p>
                <p style="margin:0 0 6px;color:#666;">系统或应用已拒绝掌机访问您的${mediaType}设备。您可以按照以下步骤开启：</p>
                <ol style="margin:0;padding-left:18px;font-size:12px;color:#555;">
                    <li>打开手机系统【设置】›【应用管理】；</li>
                    <li>找到【主播掌机】应用；</li>
                    <li>点击【权限管理】，将【相机】与【麦克风】设置为“允许”后返回重试。</li>
                </ol>
            </div>
        `;
        if (typeof window.openWechatCleanModal === 'function') {
            window.openWechatCleanModal('权限开启指引', guideHtml, () => {});
        } else if (typeof showToast === 'function') {
            showToast(`请在手机应用设置中开启${mediaType}权限`, 'warning', 3000);
        }
    }

    // 主入口：发起通话
    window.startWechatCall = function(npcId, mode = 'voice') {
        if (window._activeCallSession) {
            if (typeof showToast === 'function') showToast('当前正在通话中', 'info', 1000);
            return;
        }

        const npc = window.G && window.G.npcs ? window.G.npcs[npcId] : null;
        if (!npc) {
            if (typeof showToast === 'function') showToast('未找到通话目标', 'error', 1200);
            return;
        }

        if (mode === 'video') {
            checkVideoPrivacyPermission(() => {
                initCallSession(npcId, 'video');
            });
        } else {
            initCallSession(npcId, 'voice');
        }
    };

    // 初始化通话视讯层
    async function initCallSession(npcId, mode) {
        let localStream = null;
        const currentFacing = 'user'; // 默认前置镜头

        try {
            const constraints = {
                audio: true,
                video: (mode === 'video') ? { facingMode: currentFacing, width: { ideal: 640 }, height: { ideal: 480 } } : false
            };
            localStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            console.warn('[WechatCall] 媒体流获取失败:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                showPermissionDeniedGuide(mode === 'video' ? '摄像头与麦克风' : '麦克风');
            } else {
                if (typeof showToast === 'function') showToast(`启动失败: ${err.message || '硬件被占用'}`, 'error', 2500);
            }
            return;
        }

        // 初始化 Session 运行时状态
        window._activeCallSession = {
            npcId,
            mode,
            facingMode: currentFacing,
            startTime: Date.now(),
            durationSeconds: 0,
            timerInterval: null,
            stream: localStream,
            isMuted: false,
            transcript: [], // [{ role: 'player'|'npc'|'system', name: '', text: '', time: '' }]
            isAiReplying: false,
            currentAbortController: null,
            // 豆包式 VAD 监听状态
            speechRecognizer: null,
            silenceTimer: null,
            currentUserDraft: ''
        };

        renderCallOverlay(npcId, mode, localStream);

        // 启动计时器
        window._activeCallSession.timerInterval = setInterval(() => {
            if (!window._activeCallSession) return;
            window._activeCallSession.durationSeconds++;
            const timerEl = document.getElementById('wechatCallTimerText');
            if (timerEl) {
                timerEl.textContent = formatCallTimer(window._activeCallSession.durationSeconds);
            }
        }, 1000);

        // 启动持续语音活动识别与 5 秒停顿判定
        startContinuousVADListener();

        // 播报初始接通提示
        const targetName = getNpcFullName(npcId);
        setTimeout(() => {
            appendCallSubtitle('system', '系统', `已接通与 ${targetName} 的${mode === 'video' ? '视频' : '语音'}电话`);
            // 角色主动打招呼
            triggerCallAIReply(true);
        }, 500);
    }

    // 豆包式全双工语音监听（持续识别 + 5秒静音自动发射 + 实时打断）
    function startContinuousVADListener() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            console.warn('[WechatCall] 当前浏览器环境不支持 Web Speech API，可使用底部文本框实时通话');
            return;
        }

        try {
            const rec = new SpeechRec();
            rec.lang = 'zh-CN';
            rec.continuous = true;
            rec.interimResults = true;

            rec.onresult = (event) => {
                if (!window._activeCallSession) return;

                // 🌟 1. 只要检测到用户出声，立刻打断正在说话的 AI！
                interruptAiReplyIfActive();

                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    interimTranscript += event.results[i][0].transcript;
                }

                if (interimTranscript.trim()) {
                    window._activeCallSession.currentUserDraft = interimTranscript.trim();
                    updateUserSpeakingDraftHUD(window._activeCallSession.currentUserDraft);

                    // 🌟 2. 5 秒静音检测（防抖倒计时：5 秒内没有新字词输入，自动提交并让 AI 回复）
                    if (window._activeCallSession.silenceTimer) {
                        clearTimeout(window._activeCallSession.silenceTimer);
                    }

                    window._activeCallSession.silenceTimer = setTimeout(() => {
                        const finalSpoken = window._activeCallSession.currentUserDraft;
                        if (finalSpoken && finalSpoken.trim()) {
                            window._activeCallSession.currentUserDraft = '';
                            clearUserSpeakingDraftHUD();
                            handleUserCallSpoken(finalSpoken.trim());
                        }
                    }, 5000); // 5000ms 停顿触发
                }
            };

            rec.onerror = (e) => {
                console.warn('[WechatCall] VAD 侦听通知:', e);
            };

            rec.onend = () => {
                // 如果通话仍未结束且未手动静音，自动重启监听保持常驻
                if (window._activeCallSession && !window._activeCallSession.isMuted) {
                    try { rec.start(); } catch (_) {}
                }
            };

            rec.start();
            window._activeCallSession.speechRecognizer = rec;
        } catch (err) {
            console.warn('[WechatCall] 启动持续语音识别失败:', err);
        }
    }

    // 豆包式打断机制：掐断网络生成与 TTS 发音
    function interruptAiReplyIfActive() {
        const session = window._activeCallSession;
        if (!session) return;

        if (session.isAiReplying) {
            session.isAiReplying = false;

            // 1. 中止 fetch 请求
            if (session.currentAbortController) {
                try { session.currentAbortController.abort(); } catch (_) {}
                session.currentAbortController = null;
            }

            // 2. 中止 TTS 播放发音
            if (window.ttsEngine && typeof window.ttsEngine.stop === 'function') {
                window.ttsEngine.stop();
            } else if (window.speechSynthesis) {
                try { window.speechSynthesis.cancel(); } catch (_) {}
            }

            const statusEl = document.getElementById('callAiStatusText');
            if (statusEl) {
                statusEl.textContent = '对方正在倾听你说话...';
                statusEl.style.color = '#38bdf8';
            }
        }
    }

    // 实时呈现用户正在说话的动态草稿
    function updateUserSpeakingDraftHUD(draftText) {
        let draftEl = document.getElementById('callUserDraftBox');
        const area = document.getElementById('wechatCallSubtitleArea');
        if (!area) return;

        if (!draftEl) {
            draftEl = document.createElement('div');
            draftEl.id = 'callUserDraftBox';
            draftEl.style.cssText = `
                font-size: 13px; line-height: 1.45; color: #a7f3d0; opacity: 0.9;
                border-left: 2px solid #07c160; padding-left: 6px; margin-top: 4px;
                animation: wechatCallFadeIn 0.15s ease-out; word-break: break-word;
            `;
            area.appendChild(draftEl);
        }

        const playerName = getPlayerFullName();
        draftEl.innerHTML = `
            <span style="font-weight:600;color:#34d399;">${escapeHtml(playerName)} (说话中...): </span>
            <span>${escapeHtml(draftText)}</span>
        `;
        area.scrollTop = area.scrollHeight;
    }

    function clearUserSpeakingDraftHUD() {
        document.getElementById('callUserDraftBox')?.remove();
    }

    // 翻转前后摄像头核心实现
    async function flipCallCamera() {
        const session = window._activeCallSession;
        if (!session || session.mode !== 'video') return;

        const nextFacing = (session.facingMode === 'user') ? 'environment' : 'user';
        const flipBtn = document.getElementById('btnCallFlipCamera');

        if (flipBtn) {
            flipBtn.style.transform = 'rotate(180deg)';
            flipBtn.style.transition = 'transform 0.3s ease';
        }

        try {
            const newConstraints = {
                audio: false,
                video: { facingMode: nextFacing, width: { ideal: 640 }, height: { ideal: 480 } }
            };
            const newVideoStream = await navigator.mediaDevices.getUserMedia(newConstraints);
            const newVideoTrack = newVideoStream.getVideoTracks()[0];

            if (newVideoTrack && session.stream) {
                const oldVideoTrack = session.stream.getVideoTracks()[0];
                if (oldVideoTrack) {
                    session.stream.removeTrack(oldVideoTrack);
                    oldVideoTrack.stop();
                }

                session.stream.addTrack(newVideoTrack);
                session.facingMode = nextFacing;

                const videoEl = document.getElementById('wechatCallLocalVideo');
                if (videoEl) {
                    videoEl.srcObject = session.stream;
                    // 后置镜头不需要镜像反转，前置需要
                    videoEl.style.transform = (nextFacing === 'user') ? 'scaleX(-1)' : 'none';
                }

                if (typeof showToast === 'function') {
                    showToast(nextFacing === 'user' ? '已切至前置镜头' : '已切至后置镜头', 'info', 1000);
                }
            }
        } catch (err) {
            console.warn('[WechatCall] 翻转镜头失败:', err);
            if (typeof showToast === 'function') showToast('无法切换镜头', 'warning', 1200);
        } finally {
            setTimeout(() => {
                if (flipBtn) flipBtn.style.transform = 'none';
            }, 350);
        }
    }

    // 渲染全屏通话 HUD 界面
    function renderCallOverlay(npcId, mode, stream) {
        document.getElementById('wechatCallOverlayModal')?.remove();

        const npc = window.G.npcs[npcId];
        const npcAvatar = npc.avatarUrl || npc.avatar || 'assets/icons/chat.png';
        const targetName = getNpcFullName(npcId);

        const overlay = document.createElement('div');
        overlay.id = 'wechatCallOverlayModal';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 100009;
            background: #1a1a1a; display: flex; flex-direction: column;
            overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            user-select: none; -webkit-user-select: none;
            animation: wechatCallFadeIn 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
        `;

        overlay.innerHTML = `
            <style>
                @keyframes wechatCallFadeIn { from { opacity: 0; transform: scale(1.02); } to { opacity: 1; transform: scale(1); } }
                @keyframes wechatCallWave { 0% { transform: scale(0.96); opacity: 0.8; } 50% { transform: scale(1.08); opacity: 0.3; } 100% { transform: scale(0.96); opacity: 0.8; } }
                .call-subtitle-item { transition: opacity 0.25s ease, transform 0.25s ease; }
                .call-subtitle-item.faded { opacity: 0.35 !important; }
            </style>

            <!-- 顶部状态栏信息 -->
            <div style="padding: 28px 16px 12px; display: flex; justify-content: space-between; align-items: center; z-index: 10; color: #ffffff;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #07c160;"></span>
                    <span style="font-size: 13.5px; font-weight: 500; letter-spacing: 0.3px;">${mode === 'video' ? '视频通话中' : '语音通话中'}</span>
                </div>
                <div id="wechatCallTimerText" style="font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; color: #eeeeee;">00:00</div>
            </div>

            <!-- 主视觉画面区域 -->
            <div style="flex: 1; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden;">
                ${mode === 'video' ? `
                    <!-- 对方画面占位/视讯投影底图 -->
                    <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, #2c3e50 0%, #000000 100%); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <img src="${npcAvatar}" style="width: 90px; height: 90px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.25); object-fit: cover; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
                        <div style="color: #ffffff; font-size: 15px; font-weight: 600; margin-top: 12px; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${escapeHtml(targetName)}</div>
                        <div id="callAiStatusText" style="font-size: 12px; color: #07c160; margin-top: 4px;">通话连接稳定</div>
                    </div>

                    <!-- 本地自拍画面（右上角浮窗） -->
                    <div style="position: absolute; top: 12px; right: 14px; width: 104px; height: 146px; border-radius: 10px; overflow: hidden; border: 1.5px solid rgba(255,255,255,0.35); box-shadow: 0 4px 16px rgba(0,0,0,0.4); z-index: 5; background: #000;">
                        <video id="wechatCallLocalVideo" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);"></video>
                    </div>
                ` : `
                    <!-- 纯语音通话居中波纹头像 -->
                    <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
                        <div style="position: absolute; width: 140px; height: 140px; border-radius: 50%; background: rgba(7, 193, 96, 0.15); animation: wechatCallWave 3s infinite ease-in-out;"></div>
                        <img src="${npcAvatar}" style="position: relative; width: 110px; height: 110px; border-radius: 50%; border: 2.5px solid rgba(255,255,255,0.7); object-fit: cover; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
                        <div style="color: #ffffff; font-size: 17px; font-weight: 600; margin-top: 16px; letter-spacing: 0.4px;">${escapeHtml(targetName)}</div>
                        <div id="callAiStatusText" style="font-size: 12px; color: #a0a0a0; margin-top: 6px;">正在与对方实时畅聊...</div>
                    </div>
                `}

                <!-- 隐形画板：用于视频抽帧识图 -->
                <canvas id="wechatCallSnapshotCanvas" style="display:none;"></canvas>

                <!-- 底部磨砂流式字幕窗口（仅展示最近对白，前序淡化，可手势翻看） -->
                <div style="position: absolute; bottom: 8px; left: 14px; right: 14px; max-height: 165px; display: flex; flex-direction: column; z-index: 6;">
                    <div id="wechatCallSubtitleArea" style="overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; background: rgba(18, 18, 18, 0.65); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-radius: 12px; border: 0.5px solid rgba(255,255,255,0.12); box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                        <div style="text-align: center; color: rgba(255,255,255,0.4); font-size: 11px;">— 实时双轨字幕已启动 · 停顿5秒自动发送 —</div>
                    </div>
                </div>
            </div>

            <!-- 底部交互控制抽屉与快速说话栏 -->
            <div style="padding: 10px 16px 24px; background: rgba(12, 12, 12, 0.88); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-top: 0.5px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 12px; z-index: 10;">
                
                <!-- 快捷打字输入栏（支持直接发送跳过 5 秒等待） -->
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="text" id="wechatCallTextInput" placeholder="直接说话或输入文字（回车即发）..." style="flex: 1; height: 36px; border-radius: 18px; border: none; background: rgba(255,255,255,0.12); color: #ffffff; padding: 0 14px; font-size: 13.5px; outline: none; box-sizing: border-box;">
                    <button type="button" id="btnSendCallText" style="border: none; background: #07c160; color: #fff; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;">
                        <svg viewBox="0 0 24 24" style="width: 17px; height: 17px; fill: currentColor;"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>

                <!-- 核心通话功能键（麦克风静音 / 挂断红键 / 翻转镜头） -->
                <div style="display: flex; justify-content: space-around; align-items: center; padding-top: 4px;">
                    <!-- 麦克风静音 -->
                    <button type="button" id="btnCallToggleMute" title="静音麦克风" style="border: none; background: rgba(255,255,255,0.14); color: #fff; width: 50px; height: 50px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;">
                        <svg id="callMuteIcon" viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                    </button>

                    <!-- 挂断红键 -->
                    <button type="button" id="btnCallHangup" title="挂断" style="border: none; background: #fa5151; color: #ffffff; width: 62px; height: 62px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 16px rgba(250, 81, 81, 0.45);">
                        <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: currentColor;"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.28 8.84 7.42 7 12 7c4.58 0 8.72 1.84 11.71 4.67.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                    </button>

                    <!-- 摄像头前后切换 (视频模式生效) -->
                    <button type="button" id="btnCallFlipCamera" title="翻转前后摄像头" style="border: none; background: rgba(255,255,255,0.14); color: #fff; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; ${mode !== 'video' ? 'opacity:0.3;pointer-events:none;' : ''}">
                        <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><path d="M20 16v5h-5"/><path d="M4 8V3h5"/><path d="M4 14a8 8 0 0 0 14.54 3.46L20 21"/><path d="M20 10a8 8 0 0 0-14.54-3.46L4 3"/></svg>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // 如果是视频通话，挂载本地流至 video
        if (mode === 'video' && stream) {
            const videoEl = document.getElementById('wechatCallLocalVideo');
            if (videoEl) {
                videoEl.srcObject = stream;
            }
        }

        // 绑定事件
        overlay.querySelector('#btnCallHangup')?.addEventListener('click', () => {
            endWechatCall();
        });

        overlay.querySelector('#btnCallToggleMute')?.addEventListener('click', () => {
            toggleCallMute();
        });

        overlay.querySelector('#btnCallFlipCamera')?.addEventListener('click', () => {
            flipCallCamera();
        });

        const sendBtn = overlay.querySelector('#btnSendCallText');
        const inputEl = overlay.querySelector('#wechatCallTextInput');

        const doSend = () => {
            const val = inputEl?.value.trim();
            if (!val) return;
            inputEl.value = '';
            // 清理语音定时器与草稿
            if (window._activeCallSession && window._activeCallSession.silenceTimer) {
                clearTimeout(window._activeCallSession.silenceTimer);
            }
            clearUserSpeakingDraftHUD();
            handleUserCallSpoken(val);
        };

        sendBtn?.addEventListener('click', doSend);
        inputEl?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doSend();
            }
        });
    }

    // 静音切换
    function toggleCallMute() {
        if (!window._activeCallSession || !window._activeCallSession.stream) return;
        const tracks = window._activeCallSession.stream.getAudioTracks();
        if (tracks.length > 0) {
            const willMute = !window._activeCallSession.isMuted;
            tracks[0].enabled = !willMute;
            window._activeCallSession.isMuted = willMute;
            const btn = document.getElementById('btnCallToggleMute');
            if (btn) {
                btn.style.background = willMute ? '#fa5151' : 'rgba(255,255,255,0.14)';
            }
            if (typeof showToast === 'function') {
                showToast(willMute ? '麦克风已静音' : '麦克风已开启', 'info', 1000);
            }
        }
    }

    // 抓取当前本地摄像头单帧
    function captureVideoFrameBase64() {
        const video = document.getElementById('wechatCallLocalVideo');
        const canvas = document.getElementById('wechatCallSnapshotCanvas');
        if (!video || !canvas || video.videoWidth === 0) return null;

        canvas.width = Math.min(480, video.videoWidth);
        canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.7);
    }

    // 用户说话处理
    async function handleUserCallSpoken(userText) {
        if (!window._activeCallSession) return;
        const playerName = getPlayerFullName();

        // 记入字幕与记录
        appendCallSubtitle('player', playerName, userText);

        // 如果是视频通话，抓取一帧
        let visualInsight = '';
        if (window._activeCallSession.mode === 'video') {
            const base64Img = captureVideoFrameBase64();
            if (base64Img) {
                visualInsight = await inspectVisualFrameAsync(base64Img);
            }
        }

        // 触发 AI 回复
        triggerCallAIReply(false, userText, visualInsight);
    }

    // 独立识图 API 调用（如有配置）
    async function inspectVisualFrameAsync(base64Img) {
        try {
            const rawCfg = localStorage.getItem('mcyt_vision_api_config');
            if (!rawCfg) return '';
            const cfg = JSON.parse(rawCfg);
            if (!cfg.apiKey || !cfg.baseUrl) return '';

            const res = await fetch(`${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cfg.apiKey}`
                },
                body: JSON.stringify({
                    model: cfg.model || 'glm-4v-flash',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: '请用一句极其简短的话（20字以内）客观描述画面中人物的动作、表情或镜头环境（如：用户正对着镜头笑、室内光线昏暗）：' },
                                { type: 'image_url', image_url: { url: base64Img } }
                            ]
                        }
                    ],
                    max_tokens: 60
                })
            });

            if (!res.ok) return '';
            const data = await res.json();
            return data?.choices?.[0]?.message?.content?.trim() || '';
        } catch (_) {
            return '';
        }
    }

    // 流式追加字幕并管理淡化状态
    function appendCallSubtitle(role, name, text) {
        const area = document.getElementById('wechatCallSubtitleArea');
        if (!area || !window._activeCallSession) return;

        const time = new Date().toLocaleTimeString().slice(0, 5);
        window._activeCallSession.transcript.push({ role, name, text, time });

        const isPlayer = (role === 'player');
        const isSystem = (role === 'system');

        const item = document.createElement('div');
        item.className = 'call-subtitle-item';
        item.style.cssText = `
            font-size: 13px; line-height: 1.45;
            color: ${isSystem ? '#999' : (isPlayer ? '#a7f3d0' : '#ffffff')};
            word-break: break-word;
        `;

        if (isSystem) {
            item.innerHTML = `<span style="font-size:11px;">[${time}] ${escapeHtml(text)}</span>`;
        } else {
            item.innerHTML = `
                <span style="font-weight:600;color:${isPlayer ? '#34d399' : '#38bdf8'};">${escapeHtml(name)}: </span>
                <span>${escapeHtml(text)}</span>
            `;
        }

        area.appendChild(item);

        // 管理淡化：仅保持最新的 2~3 条高亮，更早的消息淡化
        const allItems = area.querySelectorAll('.call-subtitle-item');
        if (allItems.length > 2) {
            for (let i = 0; i < allItems.length - 2; i++) {
                allItems[i].classList.add('faded');
            }
        }

        // 平滑滚动到底部
        area.scrollTop = area.scrollHeight;
    }

    // 触发角色极速电话回复（超轻量专属 Prompt，剥离联网/表情包）
    async function triggerCallAIReply(isFirstGreeting = false, userSpoken = '', visualInsight = '') {
        const session = window._activeCallSession;
        if (!session) return;

        session.isAiReplying = true;
        const abortCtrl = new AbortController();
        session.currentAbortController = abortCtrl;

        const statusEl = document.getElementById('callAiStatusText');
        if (statusEl) {
            statusEl.textContent = '对方正在说话...';
            statusEl.style.color = '#07c160';
        }

        const npcId = session.npcId;
        const npc = window.G.npcs[npcId];
        const npcName = getNpcFullName(npcId);
        const playerName = getPlayerFullName();

        // 提取 AI 配置
        let aiConfig = null;
        try {
            aiConfig = JSON.parse(localStorage.getItem('mc_yt_ai_config') || '{}');
        } catch (_) {}

        if (!aiConfig || !aiConfig.apiKey) {
            setTimeout(() => {
                if (abortCtrl.signal.aborted) return;
                const fallbackReply = isFirstGreeting ? `喂？${playerName}，能听到我说话吗？` : `嗯嗯，我在听呢！`;
                finishAiReply(npcId, npcName, fallbackReply);
            }, 800);
            return;
        }

        // 极速通话 Prompt 构造
        const systemPrompt = `【当前处于微信${session.mode === 'video' ? '视频通话' : '语音电话'}连线中】
你正在扮演【${npc.name}】（人设：${npc.persona || '好友'}），正与【${playerName}】进行实时通话。

【严苛通话回复规则】：
1. 像真实打电话一样对话！单次回复必须短平快，字数严格控制在 1~3 句话（不超过 50 字）；
2. 绝对禁止生成长篇大论，绝对禁止输出 Markdown 复杂排版、表格、代码块；
3. 绝对不要发送表情包代码，不需要联网检索事实；
4. 允许在句首或句尾自然带出括号式的电话环境背景音描写，如 "(微风吹拂的沙沙声)"、"(电话那头隐约传来翻书声)"；
5. 必须保持角色的语气性格口吻。`;

        const messages = [{ role: 'system', content: systemPrompt }];

        // 注入最近 6 轮通话上下文
        const recent = session.transcript.filter(t => t.role !== 'system').slice(-6);
        recent.forEach(r => {
            messages.push({
                role: r.role === 'player' ? 'user' : 'assistant',
                content: r.text
            });
        });

        if (isFirstGreeting) {
            messages.push({
                role: 'user',
                content: `(电话刚接通，请你先开口向${playerName}自然打个招呼)`
            });
        } else if (visualInsight) {
            messages.push({
                role: 'system',
                content: `[当前视频画面事实感知: ${visualInsight}]`
            });
        }

        try {
            const baseUrl = (aiConfig.baseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
            const model = aiConfig.model || 'deepseek-chat';

            const resp = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                signal: abortCtrl.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${aiConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.8,
                    max_tokens: 120
                })
            });

            if (abortCtrl.signal.aborted) return;
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            const replyText = data?.choices?.[0]?.message?.content?.trim() || '喂？信号好像有点卡住了，能听到吗？';

            finishAiReply(npcId, npcName, replyText);
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('[CallAI] 回复已被用户中途插话打断');
                return;
            }
            console.warn('[CallAI] 通话回复出错:', err);
            finishAiReply(npcId, npcName, '喂？我这边刚刚网络闪了一下，你还在吗？');
        }
    }

    // 完成角色回复：上字幕 + 播放 TTS
    function finishAiReply(npcId, npcName, text) {
        if (!window._activeCallSession) return;
        window._activeCallSession.isAiReplying = false;

        const statusEl = document.getElementById('callAiStatusText');
        if (statusEl) {
            statusEl.textContent = '通话连接稳定';
            statusEl.style.color = '#07c160';
        }

        appendCallSubtitle('npc', npcName, text);

        // TTS 发音朗读
        const npc = window.G.npcs[npcId];
        const npcVoiceCfg = (npc && npc.chatSettings && npc.chatSettings.tts) || {};
        const isTtsEnabled = !!(npcVoiceCfg.enabled || (window.ttsEngine && window.ttsEngine.getConfig && window.ttsEngine.getConfig().enabled));

        if (isTtsEnabled && window.ttsEngine) {
            // 剥离掉背景音括号，仅朗读对白
            const speakPureText = text.replace(/\(.*?\)|（.*?）/g, '').trim() || text;
            window.ttsEngine.speak(speakPureText, npcVoiceCfg, () => {});
        }
    }

    // 挂断通话并做第三人称具名沉淀归档
    window.endWechatCall = async function() {
        const session = window._activeCallSession;
        if (!session) return;

        clearInterval(session.timerInterval);
        if (session.silenceTimer) clearTimeout(session.silenceTimer);

        // 中止识别器
        if (session.speechRecognizer) {
            try { session.speechRecognizer.stop(); } catch (_) {}
            session.speechRecognizer = null;
        }

        // 中断任何网络请求与播放
        if (session.currentAbortController) {
            try { session.currentAbortController.abort(); } catch (_) {}
        }
        if (window.ttsEngine && typeof window.ttsEngine.stop === 'function') {
            window.ttsEngine.stop();
        } else if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (_) {}
        }

        // 停止媒体流硬件
        if (session.stream) {
            try {
                session.stream.getTracks().forEach(t => t.stop());
            } catch (_) {}
        }

        const durationSec = session.durationSeconds;
        const durationStr = formatCallTimer(durationSec);
        const npcId = session.npcId;
        const modeLabel = (session.mode === 'video') ? '视频通话' : '语音电话';
        const targetName = getNpcFullName(npcId);
        const playerName = getPlayerFullName();

        // 移除 HUD
        const overlay = document.getElementById('wechatCallOverlayModal');
        if (overlay) {
            overlay.style.transition = 'opacity 0.2s ease';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
        }

        // 整理第三人称客观纪要
        const validMsgs = session.transcript.filter(t => t.role !== 'system');
        let recordBody = '';

        if (validMsgs.length === 0) {
            recordBody = `${playerName}与${targetName}进行了一次${modeLabel}，未产生对白已挂断。`;
        } else {
            const transcriptSnippet = validMsgs.map(m => `${m.name}: ${m.text}`).join('；');
            recordBody = `${playerName}与${targetName}进行了${modeLabel}（通话时长 ${durationStr}）。通话期间：${transcriptSnippet}`;
        }

        const time = new Date().toLocaleTimeString().slice(0, 5);
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };

        // 构造一条通话结束系统消息卡片
        const callEndMessage = {
            _id: 'call_rec_' + Date.now() + '_' + Math.floor(Math.random() * 899 + 100),
            from: 'action',
            type: 'call_record',
            text: `[${modeLabel}已结束 通话时长 ${durationStr}]\n${recordBody}`,
            callMode: session.mode,
            callDuration: durationStr,
            callSummary: recordBody,
            time,
            timestamp: Date.now()
        };

        if (typeof window.pushChatMessageSafe === 'function') {
            window.pushChatMessageSafe(npcId, callEndMessage, curAcc.id);
        } else {
            const hist = window.getAccountChatHistory(npcId, curAcc.id);
            hist.push(callEndMessage);
        }

        // 同步落盘
        if (typeof window.syncChatHistoryToLocalBackup === 'function') {
            await window.syncChatHistoryToLocalBackup();
        }
        if (typeof window.autoSaveGame === 'function') {
            window.autoSaveGame();
        }

        window._activeCallSession = null;

        if (typeof showToast === 'function') {
            showToast(`${modeLabel}已结束，记录已沉淀`, 'info', 1500);
        }

        // 刷新聊天窗口
        if (typeof renderSingleChatWindow === 'function') {
            renderSingleChatWindow();
        }
    };

})();
