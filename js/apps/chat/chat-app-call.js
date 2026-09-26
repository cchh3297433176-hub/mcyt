/**
 * js/apps/chat/chat-app-call.js
 * 📞 主播掌机 · 微信原生音视频实时通话独立中枢（二次元/Live舞台升级 · 手势触控调位 · 表情智能识别 · 极简隐私按键版）
 * 🛡️ 微信原生极简质感，消灭多余打字框与廉价元素，100% 纯粹全双工对讲体验。
 * 🌟 核心升级：
 *  1. 彻底消灭丑陋大黑条：改为极窄高透明原生悬浮微胶囊，视界完全通透；
 *  2. 自定义舞台背景与立绘差分：支持图片、GIF 动图与视频，随角色回复智能识别表情切换；
 *  3. 手势触控舞台编辑模式：单指拖拽平移、角标拖拉平滑缩放，位置配组方案独立记忆；
 *  4. 极简白描双隐私按键：自拍画中画一键显隐 + 摄像头流一键静默，附带 3 秒白字自淡化 Toast；
 *  5. 完整抗噪滤波与全双工闭环：50 人声门限、170ms 连续确认、0.8 秒出声门限、1.5 秒接通免疫；
 *  6. 异步 TTS 序列锁（ttsSequenceId）：彻底根除由于网络延迟导致的旧对白重叠错位；
 *  7. 三模态视觉感知自由切换（外挂视觉 API / 主模型原生看图 / 纯对讲）；
 *  8. 第三人称具名客观记录自动落盘 IndexedDB，支持长按彻底物理抹除防记忆污染。
 */

(function() {
    'use strict';

    // 通话运行态对象
    window._activeCallSession = null;

    // 全局 TTS 发音版本序列锁（防止网络延迟导致多句语音重叠/错位播放）
    let _globalCallTtsSequence = 0;

    const PRIVACY_STORAGE_KEY = 'mcyt_call_video_privacy_agreed';
    const VISION_MODE_STORAGE_KEY = 'mcyt_call_vision_mode'; // 'external' | 'direct' | 'off'

    // 安全 HTML 转义辅助函数
    function escapeHtml(str) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 格式化秒数为 00:00
    function formatCallTimer(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    // 获取角色全名
    function getNpcFullName(npcId) {
        if (!window.G || !window.G.npcs) return '好友';
        const n = window.G.npcs[npcId];
        if (!n) return '好友';
        return n.remark ? `${n.remark}(${n.name})` : (n.name || '好友');
    }

    // 获取玩家全名
    function getPlayerFullName() {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };
        return curAcc.name || '我';
    }

    // 🌟 3 秒淡化极简白小字轻提示
    function showCallHudTip(text) {
        const tipEl = document.getElementById('wechatCallHudNoticeTip');
        if (!tipEl) return;
        tipEl.textContent = text;
        tipEl.style.opacity = '1';
        tipEl.style.transform = 'translate(-50%, 0)';

        if (window._callHudTipTimer) clearTimeout(window._callHudTipTimer);
        window._callHudTipTimer = setTimeout(() => {
            tipEl.style.opacity = '0';
            tipEl.style.transform = 'translate(-50%, 8px)';
        }, 3000);
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
                    <li>若您配置了视觉识图，画面抽帧仅用于单次客观理解，解析后即刻销毁。</li>
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

    // 🌟 获取角色生效的视频舞台方案配置
    function getNpcActiveStageProfile(npcId) {
        if (!window.G || !window.G.npcs) return null;
        const npc = window.G.npcs[npcId];
        if (!npc || !npc.chatSettings || !npc.chatSettings.videoStage) return null;
        const vs = npc.chatSettings.videoStage;
        if (!Array.isArray(vs.profiles) || vs.profiles.length === 0) return null;
        const prof = vs.profiles.find(p => p.id === vs.activeProfileId) || vs.profiles[0];
        if (!prof.position) prof.position = { x: 0, y: 0, scale: 1.0 };
        return prof;
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
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
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

        _globalCallTtsSequence++;

        const currentVisionMode = localStorage.getItem(VISION_MODE_STORAGE_KEY) || 'external';

        window._activeCallSession = {
            npcId,
            mode,
            facingMode: currentFacing,
            visionMode: currentVisionMode,
            startTime: Date.now(),
            connectTimestamp: Date.now(),
            durationSeconds: 0,
            timerInterval: null,
            stream: localStream,
            transcript: [],
            isAiReplying: false,
            currentAbortController: null,
            activeTtsSequenceId: _globalCallTtsSequence,
            // 🌟 视频通话隐私与手势编辑状态
            isPipWindowVisible: true,    // 右上角自拍画中画显隐
            isCameraMuted: false,       // 摄像头视频流静默状态
            isAdjustingStage: false,    // 是否处于手势微调模式
            currentExpression: 'default', // 当前呈现的表情差分
            // 真实音频采集与 VAD 音量检测
            audioContext: null,
            audioAnalyser: null,
            animFrameId: null,
            mediaRecorder: null,
            recordedChunks: [],
            isUserSpeaking: false,
            speakingStartTime: 0,
            consecutiveVoiceFrames: 0,
            silenceTimer: null
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

        // 启动抗噪麦克风音量监听与 VAD 全双工通道
        startHardwareAudioVAD(localStream);

        // 播报初始接通提示并打招呼
        const targetName = getNpcFullName(npcId);
        setTimeout(() => {
            if (!window._activeCallSession) return;
            appendCallSubtitle('system', '系统', `已接通与 ${targetName} 的${mode === 'video' ? '视频' : '语音'}通话`);
            triggerCallAIReply(true);
        }, 600);
    }

    // 硬件级音量分析器 + MediaRecorder 真实录制 + 抗噪滤波
    function startHardwareAudioVAD(stream) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx || !stream) return;

            const ctx = new AudioCtx();
            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }

            const audioTracks = stream.getAudioTracks();
            if (!audioTracks || audioTracks.length === 0) return;
            const audioStream = new MediaStream(audioTracks);

            const source = ctx.createMediaStreamSource(audioStream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.45;
            source.connect(analyser);

            window._activeCallSession.audioContext = ctx;
            window._activeCallSession.audioAnalyser = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const BASE_VOICE_THRESHOLD = 50;

            const checkAudioLoop = () => {
                if (!window._activeCallSession) return;
                analyser.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < 24; i++) {
                    sum += dataArray[i];
                }
                const avgVolume = sum / 24;

                updateCallWaveBars(avgVolume);

                const timeSinceConnect = Date.now() - window._activeCallSession.connectTimestamp;
                if (timeSinceConnect < 1500) {
                    window._activeCallSession.animFrameId = requestAnimationFrame(checkAudioLoop);
                    return;
                }

                const currentThreshold = window._activeCallSession.isAiReplying 
                    ? (BASE_VOICE_THRESHOLD * 1.65) 
                    : BASE_VOICE_THRESHOLD;

                if (avgVolume > currentThreshold) {
                    window._activeCallSession.consecutiveVoiceFrames++;

                    if (window._activeCallSession.consecutiveVoiceFrames >= 5) {
                        interruptAiReplyIfActive();

                        if (!window._activeCallSession.isUserSpeaking) {
                            window._activeCallSession.isUserSpeaking = true;
                            window._activeCallSession.speakingStartTime = Date.now();
                            setUserSpeakingHUDStatus(true);
                            startSessionMediaRecorder(stream);
                        }

                        if (window._activeCallSession.silenceTimer) {
                            clearTimeout(window._activeCallSession.silenceTimer);
                            window._activeCallSession.silenceTimer = null;
                        }
                    }
                } else {
                    window._activeCallSession.consecutiveVoiceFrames = 0;

                    if (window._activeCallSession.isUserSpeaking) {
                        if (!window._activeCallSession.silenceTimer) {
                            window._activeCallSession.silenceTimer = setTimeout(() => {
                                handleUserFinishSpokenAudio();
                            }, 2000);
                        }
                    }
                }

                window._activeCallSession.animFrameId = requestAnimationFrame(checkAudioLoop);
            };

            checkAudioLoop();
        } catch (err) {
            console.warn('[WechatCall] Web Audio API 初始化失败:', err);
        }
    }

    // 启动 MediaRecorder 片段采集（纯音频轨分离）
    function startSessionMediaRecorder(stream) {
        if (!window.MediaRecorder || !window._activeCallSession) return;
        window._activeCallSession.recordedChunks = [];

        try {
            const audioTracks = stream.getAudioTracks();
            if (!audioTracks || audioTracks.length === 0) return;
            const audioOnlyStream = new MediaStream(audioTracks);

            let mimeType = '';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
            else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
            else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';

            const mr = mimeType ? new MediaRecorder(audioOnlyStream, { mimeType }) : new MediaRecorder(audioOnlyStream);
            mr.ondataavailable = (e) => {
                if (e.data && e.data.size > 0 && window._activeCallSession) {
                    window._activeCallSession.recordedChunks.push(e.data);
                }
            };
            mr.start(100);
            window._activeCallSession.mediaRecorder = mr;
        } catch (e) {
            console.warn('[WechatCall] MediaRecorder 启动失败:', e);
        }
    }

    function isJunkNoiseText(text) {
        if (!text) return true;
        const cleaned = text.trim().replace(/[，。！？,.!?~、 \-_]/g, '');
        if (cleaned.length < 2) return true;
        const JUNK_PATTERNS = ['呃', '啊', '嗯', '哦', '哎', '谢谢收看', '感谢观看', 'you', 'the', '字幕', 'Bye', '不客气', '再见', 'hello'];
        if (JUNK_PATTERNS.includes(cleaned)) return true;
        return false;
    }

    // 用户停止说话满 2 秒，转文字并触发思考
    async function handleUserFinishSpokenAudio() {
        const session = window._activeCallSession;
        if (!session) return;

        const speakingDuration = Date.now() - session.speakingStartTime;

        session.isUserSpeaking = false;
        if (session.silenceTimer) {
            clearTimeout(session.silenceTimer);
            session.silenceTimer = null;
        }
        setUserSpeakingHUDStatus(false);

        let audioBlob = null;
        if (session.mediaRecorder && session.mediaRecorder.state !== 'inactive') {
            const waitChunkPromise = new Promise((resolve) => {
                session.mediaRecorder.onstop = () => {
                    const mime = session.mediaRecorder.mimeType || 'audio/webm';
                    if (session.recordedChunks.length > 0) {
                        resolve(new Blob(session.recordedChunks, { type: mime }));
                    } else {
                        resolve(null);
                    }
                };
                try { session.mediaRecorder.stop(); } catch (_) { resolve(null); }
                setTimeout(() => resolve(null), 600);
            });
            audioBlob = await waitChunkPromise;
            session.mediaRecorder = null;
        }

        if (speakingDuration < 800 || !audioBlob || audioBlob.size < 2000) {
            setCallStatusText('通话连接稳定', '#07c160');
            return;
        }

        setCallStatusText('正在转文字中...', '#07c160');

        let recognizedText = '';
        if (window.mcytAsr && typeof window.mcytAsr.transcribe === 'function') {
            try {
                const asrRes = await window.mcytAsr.transcribe(audioBlob);
                if (asrRes && asrRes.trim()) {
                    recognizedText = asrRes.trim();
                }
            } catch (err) {
                console.warn('[WechatCall] 云端 ASR 转写异常:', err);
            }
        }

        if (!recognizedText || isJunkNoiseText(recognizedText)) {
            setCallStatusText('通话连接稳定', '#07c160');
            return;
        }

        const playerName = getPlayerFullName();
        appendCallSubtitle('player', playerName, recognizedText);

        // 视频通话视觉感知调度（若摄像头被静默，则不捕获画面）
        let visualInsight = '';
        let base64DirectImg = null;

        if (session.mode === 'video' && session.visionMode !== 'off' && !session.isCameraMuted) {
            setCallStatusText('正在感知视频画面...', '#38bdf8');
            const base64Img = captureVideoFrameBase64();
            if (base64Img) {
                if (session.visionMode === 'external') {
                    visualInsight = await inspectVisualFrameAsync(base64Img);
                } else if (session.visionMode === 'direct') {
                    base64DirectImg = base64Img;
                }
            }
        }

        triggerCallAIReply(false, recognizedText, visualInsight, base64DirectImg);
    }

    function interruptAiReplyIfActive() {
        const session = window._activeCallSession;
        if (!session) return;

        _globalCallTtsSequence++;
        session.activeTtsSequenceId = _globalCallTtsSequence;

        if (session.isAiReplying) {
            session.isAiReplying = false;

            if (session.currentAbortController) {
                try { session.currentAbortController.abort(); } catch (_) {}
                session.currentAbortController = null;
            }

            if (window.ttsEngine && typeof window.ttsEngine.stop === 'function') {
                window.ttsEngine.stop();
            } else if (window.speechSynthesis) {
                try { window.speechSynthesis.cancel(); } catch (_) {}
            }

            setCallStatusText('对方正在倾听你说话...', '#38bdf8');
        }
    }

    function updateCallWaveBars(volume) {
        const bars = document.querySelectorAll('.call-live-wave-bar');
        if (bars.length === 0) return;

        bars.forEach((bar, idx) => {
            const factor = 1 + Math.sin(idx * 0.7 + Date.now() / 120) * 0.5;
            const h = Math.min(26, Math.max(3, Math.round((volume / 255) * 26 * factor)));
            bar.style.height = `${h}px`;
        });
    }

    function setUserSpeakingHUDStatus(isSpeaking) {
        const indicatorVoice = document.getElementById('callSpeakingWaveWrap');
        if (indicatorVoice) indicatorVoice.style.opacity = isSpeaking ? '1' : '0.2';
        const indicatorVideo = document.getElementById('callSpeakingWaveWrapVideo');
        if (indicatorVideo) indicatorVideo.style.opacity = isSpeaking ? '1' : '0.35';
        if (isSpeaking) setCallStatusText('正在听你说...', '#38bdf8');
    }

    function setCallStatusText(text, color = '#07c160') {
        const statusEl = document.getElementById('callAiStatusText');
        if (statusEl) { statusEl.textContent = text; statusEl.style.color = color; }
        const statusVideoEl = document.getElementById('callAiStatusTextVideo');
        if (statusVideoEl) { statusVideoEl.textContent = text; statusVideoEl.style.color = color; }
    }

    // 翻转前后摄像头
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
                    videoEl.style.transform = (nextFacing === 'user') ? 'scaleX(-1)' : 'none';
                    videoEl.play().catch(() => {});
                }

                showCallHudTip(nextFacing === 'user' ? '已切至前置镜头' : '已切至后置镜头');
            }
        } catch (err) {
            console.warn('[WechatCall] 翻转镜头失败:', err);
            showCallHudTip('无法切换镜头');
        } finally {
            setTimeout(() => {
                if (flipBtn) flipBtn.style.transform = 'none';
            }, 350);
        }
    }

    // 视觉感知模式循环切换
    function toggleCallVisionMode() {
        const session = window._activeCallSession;
        if (!session || session.mode !== 'video') return;

        const modes = ['external', 'direct', 'off'];
        const currentIdx = modes.indexOf(session.visionMode);
        const nextMode = modes[(currentIdx + 1) % modes.length];
        session.visionMode = nextMode;
        localStorage.setItem(VISION_MODE_STORAGE_KEY, nextMode);

        updateVisionModeUI(nextMode);
    }

    function updateVisionModeUI(mode) {
        const textEl = document.getElementById('callVisionModeText');
        const iconWrap = document.getElementById('callVisionModeIconWrap');
        if (!textEl || !iconWrap) return;

        if (mode === 'external') {
            textEl.textContent = '外挂识图';
            iconWrap.style.color = '#07c160';
            iconWrap.style.borderColor = '#07c160';
            showCallHudTip('视觉感知: 外挂独立识图 API');
        } else if (mode === 'direct') {
            textEl.textContent = '原生看图';
            iconWrap.style.color = '#38bdf8';
            iconWrap.style.borderColor = '#38bdf8';
            showCallHudTip('视觉感知: 主模型多模态看图');
        } else {
            textEl.textContent = '不识图';
            iconWrap.style.color = '#999999';
            iconWrap.style.borderColor = '#666666';
            showCallHudTip('视觉感知: 已关闭（纯语言通话）');
        }
    }

    // 🌟 画中画自拍视窗显隐切换
    function toggleCallPipWindow() {
        const session = window._activeCallSession;
        if (!session || session.mode !== 'video') return;

        session.isPipWindowVisible = !session.isPipWindowVisible;
        const pipBox = document.getElementById('wechatCallPipContainer');
        const btnPip = document.getElementById('btnCallTogglePip');

        if (pipBox) {
            pipBox.style.display = session.isPipWindowVisible ? 'block' : 'none';
        }
        if (btnPip) {
            btnPip.style.opacity = session.isPipWindowVisible ? '1' : '0.45';
        }

        showCallHudTip(session.isPipWindowVisible ? '自拍视窗已开启' : '自拍视窗已隐藏');
    }

    // 🌟 摄像头视频流静默切换
    function toggleCallCameraMute() {
        const session = window._activeCallSession;
        if (!session || session.mode !== 'video' || !session.stream) return;

        session.isCameraMuted = !session.isCameraMuted;
        const videoTracks = session.stream.getVideoTracks();
        videoTracks.forEach(t => { t.enabled = !session.isCameraMuted; });

        const btnMute = document.getElementById('btnCallToggleCameraMute');
        const muteSvg = document.getElementById('svgCameraMuteStatus');

        if (btnMute) {
            btnMute.style.background = session.isCameraMuted ? 'rgba(250,81,81,0.3)' : 'rgba(255,255,255,0.12)';
            btnMute.style.borderColor = session.isCameraMuted ? '#fa5151' : 'rgba(255,255,255,0.25)';
        }
        if (muteSvg) {
            muteSvg.style.color = session.isCameraMuted ? '#fa5151' : '#ffffff';
        }

        const pipVideo = document.getElementById('wechatCallLocalVideo');
        if (pipVideo) {
            pipVideo.style.opacity = session.isCameraMuted ? '0.15' : '1';
        }

        showCallHudTip(session.isCameraMuted ? '摄像头已关闭，画面已静默' : '摄像头已恢复');
    }

    // 🌟 表情智能识别转换引擎（基于文本情绪特征自动驱动差分立绘）
    function detectEmotionFromText(text) {
        if (!text) return 'default';
        const t = text.toLowerCase();

        if (/害羞|脸红|唔|讨厌|笨蛋|心跳|喜欢你|爱死你|么么|mua|别看我/i.test(t)) return 'shy';
        if (/哈哈|嘻嘻|开心|高兴|太棒了|好呀|笑|真好|太好玩/i.test(t)) return 'smile';
        if (/生气|可恶|气死|愤怒|闭嘴|哼|揍你|烦死|找打/i.test(t)) return 'angry';
        if (/难过|伤心|呜呜|哭|心疼|对不起|抱歉|委屈|失落|叹气/i.test(t)) return 'sad';
        if (/为什么|怎么会|思考|我想想|原来如此|难道|如果|琢磨/i.test(t)) return 'think';
        if (/才不是|才没有|哼，谁管你|才不稀罕|别误会|傲娇/i.test(t)) return 'tsundere';
        if (/什么？！|哇！|真的吗|天哪|震惊|不可思议|呀！/i.test(t)) return 'surprised';

        return 'default';
    }

    // 更新舞台立绘表情渲染
    function updateLiveSpriteExpression(exprId) {
        const session = window._activeCallSession;
        if (!session || session.mode !== 'video') return;

        const prof = getNpcActiveStageProfile(session.npcId);
        if (!prof || !prof.sprites) return;

        session.currentExpression = exprId;
        const spriteWrap = document.getElementById('wechatCallSpriteDisplayWrap');
        if (!spriteWrap) return;

        // 若当前表情无对应差分，则优雅回退至 default 表情
        const targetSrc = prof.sprites[exprId] || prof.sprites['default'] || '';
        if (!targetSrc) return;

        const isVideo = targetSrc.startsWith('data:video') || targetSrc.endsWith('.mp4') || targetSrc.endsWith('.webm');
        
        spriteWrap.style.transition = 'opacity 0.22s ease';
        spriteWrap.style.opacity = '0.35';

        setTimeout(() => {
            if (isVideo) {
                spriteWrap.innerHTML = `<video src="${targetSrc}" muted loop autoplay playsinline style="width:100%;height:100%;object-fit:contain;pointer-events:none;"></video>`;
            } else {
                spriteWrap.innerHTML = `<img src="${targetSrc}" style="width:100%;height:100%;object-fit:contain;pointer-events:none;" onerror="this.src='assets/icons/chat.png';">`;
            }
            spriteWrap.style.opacity = '1';
        }, 150);
    }

    // 🌟 手势触控舞台编辑模式（单指拖拽平移，角标触控缩放，方案独立持久化）
    function toggleStageAdjustMode() {
        const session = window._activeCallSession;
        if (!session || session.mode !== 'video') return;

        session.isAdjustingStage = !session.isAdjustingStage;
        const box = document.getElementById('wechatCallSpriteTransformBox');
        const handle = document.getElementById('wechatCallResizeHandle');
        const btnAdjust = document.getElementById('btnCallToggleAdjustStage');

        if (!box) return;

        if (session.isAdjustingStage) {
            box.style.border = '1.5px dashed #07c160';
            box.style.background = 'rgba(7, 193, 96, 0.08)';
            if (handle) handle.style.display = 'block';
            if (btnAdjust) {
                btnAdjust.style.background = '#07c160';
                btnAdjust.style.borderColor = '#07c160';
            }
            showCallHudTip('已进入手势调整：单指拖拽位移，右下角手柄缩放');
        } else {
            box.style.border = 'none';
            box.style.background = 'transparent';
            if (handle) handle.style.display = 'none';
            if (btnAdjust) {
                btnAdjust.style.background = 'rgba(255,255,255,0.12)';
                btnAdjust.style.borderColor = 'rgba(255,255,255,0.25)';
            }
            // 保存当前位置
            saveStageProfileTransform();
            showCallHudTip('舞台位置与缩放已保存');
        }
    }

    // 绑定触摸手势事件
    function initTouchGestureControls(box, handle, prof) {
        if (!box || !prof) return;

        let startX = 0, startY = 0;
        let initPosX = prof.position.x || 0;
        let initPosY = prof.position.y || 0;
        let isDragging = false;

        box.addEventListener('touchstart', (e) => {
            const session = window._activeCallSession;
            if (!session || !session.isAdjustingStage) return;
            if (e.target === handle) return; // 避开缩放手柄

            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            initPosX = prof.position.x || 0;
            initPosY = prof.position.y || 0;
            isDragging = true;
            e.stopPropagation();
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            prof.position.x = initPosX + dx;
            prof.position.y = initPosY + dy;

            applySpriteTransform(box, prof.position);
            e.preventDefault();
        }, { passive: false });

        window.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                saveStageProfileTransform();
            }
        });

        // 🌟 右下角触控缩放手柄
        if (handle) {
            let resizeStartX = 0;
            let initScale = prof.position.scale || 1.0;
            let isResizing = false;

            handle.addEventListener('touchstart', (e) => {
                const session = window._activeCallSession;
                if (!session || !session.isAdjustingStage) return;

                const touch = e.touches[0];
                resizeStartX = touch.clientX;
                initScale = prof.position.scale || 1.0;
                isResizing = true;
                e.stopPropagation();
            }, { passive: false });

            window.addEventListener('touchmove', (e) => {
                if (!isResizing) return;
                const touch = e.touches[0];
                const dx = touch.clientX - resizeStartX;
                const newScale = Math.min(2.5, Math.max(0.4, initScale + (dx / 200)));

                prof.position.scale = parseFloat(newScale.toFixed(2));
                applySpriteTransform(box, prof.position);
                e.preventDefault();
            }, { passive: false });

            window.addEventListener('touchend', () => {
                if (isResizing) {
                    isResizing = false;
                    saveStageProfileTransform();
                }
            });
        }
    }

    function applySpriteTransform(el, pos) {
        if (!el || !pos) return;
        el.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${pos.scale})`;
    }

    // 将位置与缩放保存至当前方案并持久化
    function saveStageProfileTransform() {
        const session = window._activeCallSession;
        if (!session) return;
        const npc = window.G && window.G.npcs ? window.G.npcs[session.npcId] : null;
        if (!npc) return;

        if (typeof window.syncCustomNpcsToLocalBackup === 'function') {
            window.syncCustomNpcsToLocalBackup();
        }
        if (typeof window.autoSaveGame === 'function') {
            window.autoSaveGame();
        }
    }

    // 渲染全屏通话界面（消灭大黑条，悬浮超薄微胶囊，自适应舞台立绘）
    function renderCallOverlay(npcId, mode, stream) {
        document.getElementById('wechatCallOverlayModal')?.remove();

        const npc = window.G.npcs[npcId];
        const npcAvatar = npc.avatarUrl || npc.avatar || 'assets/icons/chat.png';
        const targetName = getNpcFullName(npcId);
        const initialVisionMode = localStorage.getItem(VISION_MODE_STORAGE_KEY) || 'external';

        // 获取视频舞台方案
        const stageProf = getNpcActiveStageProfile(npcId);
        const hasCustomBg = !!(stageProf && stageProf.backgroundUrl);
        const hasCustomSprite = !!(stageProf && stageProf.sprites && Object.keys(stageProf.sprites).length > 0);

        const overlay = document.createElement('div');
        overlay.id = 'wechatCallOverlayModal';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 100009;
            background: #0d0f12; display: flex; flex-direction: column;
            overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            user-select: none; -webkit-user-select: none;
            animation: wechatCallFadeIn 0.22s cubic-bezier(0.1, 0.9, 0.2, 1);
        `;

        overlay.innerHTML = `
            <style>
                @keyframes wechatCallFadeIn { from { opacity: 0; transform: scale(1.01); } to { opacity: 1; transform: scale(1); } }
                @keyframes wechatCallWave { 0% { transform: scale(0.96); opacity: 0.7; } 50% { transform: scale(1.12); opacity: 0.15; } 100% { transform: scale(0.96); opacity: 0.7; } }
                .call-subtitle-item { transition: opacity 0.25s ease, transform 0.25s ease; }
                .call-subtitle-item.faded { opacity: 0.28 !important; }
            </style>

            <!-- 🌟 顶部原生极窄悬浮微胶囊（彻底消灭大黑条，完全透光无阻挡） -->
            <div style="position: absolute; top: 16px; left: 16px; z-index: 25; display: flex; align-items: center; gap: 8px; padding: 4px 10px; border-radius: 20px; background: rgba(0,0,0,0.38); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 0.5px solid rgba(255,255,255,0.12); box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #07c160;"></span>
                <span style="font-size: 11.5px; font-weight: 500; color: #f0f0f0; letter-spacing: 0.2px;">${mode === 'video' ? '视频通话' : '语音通话'}</span>
                <span style="color: rgba(255,255,255,0.25); font-size: 10px;">|</span>
                <span id="wechatCallTimerText" style="font-size: 11.5px; font-weight: 600; font-variant-numeric: tabular-nums; color: #ffffff;">00:00</span>
            </div>

            <!-- 主舞台视觉呈现 -->
            <div style="flex: 1; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden;">
                ${mode === 'video' ? `
                    <!-- 🌟 视频通话背景舞台（支持自定义图片/视频或原生深灰光晕） -->
                    <div id="wechatCallStageBgContainer" style="position: absolute; inset: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; z-index: 1;">
                        ${hasCustomBg ? `
                            ${stageProf.bgType === 'video' ? `
                                <video src="${stageProf.backgroundUrl}" muted loop autoplay playsinline style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;"></video>
                            ` : `
                                <img src="${stageProf.backgroundUrl}" style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;">
                            `}
                        ` : `
                            <div style="width: 100%; height: 100%; background: radial-gradient(circle at center, #1e2638 0%, #0a0d14 100%);"></div>
                        `}
                    </div>

                    <!-- 🌟 角色立绘展示舞台（触控拖拽容器 + 表情差分） -->
                    ${hasCustomSprite ? `
                        <div id="wechatCallSpriteTransformBox" style="position: absolute; width: 280px; height: 380px; z-index: 4; display: flex; align-items: center; justify-content: center; transform-origin: center center; cursor: move; touch-action: none; transition: transform 0.05s linear;">
                            <div id="wechatCallSpriteDisplayWrap" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                                <!-- 差分立绘将动态灌入 -->
                            </div>
                            <!-- 缩放控制触控把手 -->
                            <div id="wechatCallResizeHandle" style="display: none; position: absolute; right: -8px; bottom: -8px; width: 22px; height: 22px; border-radius: 50%; background: #07c160; border: 2px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.5); cursor: nwse-resize; touch-action: none;"></div>
                        </div>
                    ` : `
                        <!-- 未配置立绘时，呈现原生微光大头像 -->
                        <div style="position: relative; z-index: 4; display: flex; flex-direction: column; align-items: center;">
                            <img src="${npcAvatar}" style="width: 90px; height: 90px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.25); object-fit: cover; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
                            <div style="color: #ffffff; font-size: 16px; font-weight: 600; margin-top: 14px;">${escapeHtml(targetName)}</div>
                        </div>
                    `}

                    <!-- 状态与动态声波胶囊（居中悬浮） -->
                    <div style="position: absolute; top: 56px; z-index: 6; display: flex; flex-direction: column; align-items: center;">
                        <div id="callAiStatusTextVideo" style="font-size: 11px; color: #07c160; background: rgba(0,0,0,0.3); padding: 2px 10px; border-radius: 10px; backdrop-filter: blur(8px);">通话连接稳定</div>
                        <div id="callSpeakingWaveWrapVideo" style="display: flex; align-items: center; gap: 4px; height: 22px; margin-top: 6px; padding: 0 10px; border-radius: 12px; background: rgba(0,0,0,0.35); backdrop-filter: blur(8px); opacity: 0.35; transition: opacity 0.2s ease; border: 0.5px solid rgba(255,255,255,0.08);">
                            <span class="call-live-wave-bar" style="width: 3px; height: 4px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 6px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 8px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 6px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 4px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                        </div>
                    </div>

                    <!-- 🌟 本地画中画视窗（右上角微信圆角自拍浮窗，支持独立隐藏） -->
                    <div id="wechatCallPipContainer" style="position: absolute; top: 14px; right: 14px; width: 94px; height: 136px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.25); box-shadow: 0 8px 24px rgba(0,0,0,0.6); z-index: 10; background: #000000; transition: all 0.2s ease;">
                        <video id="wechatCallLocalVideo" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);"></video>
                    </div>
                ` : `
                    <!-- 纯语音通话原生波纹头像 -->
                    <div style="position: relative; display: flex; flex-direction: column; align-items: center; z-index: 5;">
                        <div style="position: absolute; width: 140px; height: 140px; border-radius: 50%; background: rgba(7, 193, 96, 0.18); animation: wechatCallWave 3.2s infinite ease-in-out;"></div>
                        <img src="${npcAvatar}" style="position: relative; width: 106px; height: 106px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.85); object-fit: cover; box-shadow: 0 12px 35px rgba(0,0,0,0.65);">
                        <div style="color: #ffffff; font-size: 18px; font-weight: 600; margin-top: 16px;">${escapeHtml(targetName)}</div>
                        <div id="callAiStatusText" style="font-size: 12px; color: #07c160; margin-top: 6px;">通话连接稳定</div>

                        <div id="callSpeakingWaveWrap" style="display: flex; align-items: center; gap: 4px; height: 28px; margin-top: 14px; opacity: 0.2; transition: opacity 0.2s ease;">
                            <span class="call-live-wave-bar" style="width: 3px; height: 4px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 6px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 8px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 6px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 4px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                        </div>
                    </div>
                `}

                <canvas id="wechatCallSnapshotCanvas" style="display:none;"></canvas>

                <!-- 🌟 底部磨砂流式字幕窗口 -->
                <div style="position: absolute; bottom: 8px; left: 16px; right: 16px; max-height: 140px; display: flex; flex-direction: column; z-index: 15;">
                    <div id="wechatCallSubtitleArea" style="overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding: 8px 12px; background: rgba(10, 12, 16, 0.65); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-radius: 12px; border: 0.5px solid rgba(255,255,255,0.1); box-shadow: 0 4px 18px rgba(0,0,0,0.4);">
                        <div style="text-align: center; color: rgba(255,255,255,0.4); font-size: 10.5px;">— 停顿 2 秒自动发送 · 随时开口可打断 —</div>
                    </div>
                </div>

                <!-- 🌟 3 秒淡化极简白小字通知浮层 -->
                <div id="wechatCallHudNoticeTip" style="position: absolute; bottom: 156px; left: 50%; transform: translate(-50%, 8px); background: rgba(20, 20, 20, 0.78); backdrop-filter: blur(10px); color: #ffffff; font-size: 11.5px; padding: 5px 14px; border-radius: 16px; border: 0.5px solid rgba(255,255,255,0.15); pointer-events: none; opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease; z-index: 30; white-space: nowrap;">
                    提示
                </div>
            </div>

            <!-- 底部按键中枢 -->
            <div style="padding: 16px 20px 32px; display: flex; justify-content: center; align-items: center; position: relative; z-index: 20;">
                
                <!-- 挂断红键（居中） -->
                <button type="button" id="btnCallHangup" title="挂断" style="border: none; background: #fa5151; color: #ffffff; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 6px 20px rgba(250, 81, 81, 0.45); -webkit-tap-highlight-color: transparent;">
                    <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: currentColor;"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.28 8.84 7.42 7 12 7c4.58 0 8.72 1.84 11.71 4.67.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                </button>

                ${mode === 'video' ? `
                    <!-- 🌟 视频模式左侧按键群：视觉模式胶囊 + 显隐自拍画中画 + 摄像头静默 -->
                    <div style="position: absolute; left: 16px; display: flex; align-items: center; gap: 8px;">
                        <!-- 视觉模式切换胶囊 -->
                        <button type="button" id="btnCallToggleVisionMode" title="切换视觉模式" style="border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); color: #ffffff; padding: 0 10px; height: 42px; border-radius: 21px; display: flex; align-items: center; gap: 5px; cursor: pointer; -webkit-tap-highlight-color: transparent;">
                            <div id="callVisionModeIconWrap" style="width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid #07c160; color: #07c160; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold;">●</div>
                            <span id="callVisionModeText" style="font-size: 11px; font-weight: 500; color: #ffffff;">外挂识图</span>
                        </button>

                        <!-- 🌟 纯图标：显隐自拍画中画（小窗口图标） -->
                        <button type="button" id="btnCallTogglePip" title="自拍窗口显隐" style="border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); color: #ffffff; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; -webkit-tap-highlight-color: transparent;">
                            <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><rect x="2" y="3" width="20" height="14" rx="2"/><rect x="12" y="9" width="8" height="6" rx="1"/></svg>
                        </button>

                        <!-- 🌟 纯图标：静默摄像头视频流（摄像头图标） -->
                        <button type="button" id="btnCallToggleCameraMute" title="摄像头画面静默" style="border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); color: #ffffff; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; -webkit-tap-highlight-color: transparent;">
                            <svg id="svgCameraMuteStatus" viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                        </button>
                    </div>

                    <!-- 🌟 视频模式右侧按键群：手势舞台微调 + 翻转镜头 -->
                    <div style="position: absolute; right: 16px; display: flex; align-items: center; gap: 8px;">
                        <!-- 纯图标：手势调位开关（十字移动手势图标） -->
                        <button type="button" id="btnCallToggleAdjustStage" title="手势触控调位" style="border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); color: #ffffff; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; -webkit-tap-highlight-color: transparent;">
                            <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
                        </button>

                        <!-- 纯图标：前后摄像头翻转 -->
                        <button type="button" id="btnCallFlipCamera" title="翻转镜头" style="border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.1); backdrop-filter: blur(8px); color: #ffffff; width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; -webkit-tap-highlight-color: transparent;">
                            <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><path d="M20 16v5h-5"/><path d="M4 8V3h5"/><path d="M4 14a8 8 0 0 0 14.54 3.46L20 21"/><path d="M20 10a8 8 0 0 0-14.54-3.46L4 3"/></svg>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(overlay);

        if (mode === 'video') {
            updateVisionModeUI(initialVisionMode);

            // 挂载本地视频
            if (stream) {
                const videoEl = document.getElementById('wechatCallLocalVideo');
                if (videoEl) {
                    videoEl.srcObject = stream;
                    videoEl.play().catch(() => {});
                }
            }

            // 初始化舞台立绘与触控手势
            if (hasCustomSprite && stageProf) {
                const box = document.getElementById('wechatCallSpriteTransformBox');
                const handle = document.getElementById('wechatCallResizeHandle');
                applySpriteTransform(box, stageProf.position);
                initTouchGestureControls(box, handle, stageProf);
                updateLiveSpriteExpression('default');
            }
        }

        // 绑定事件
        overlay.querySelector('#btnCallHangup')?.addEventListener('click', () => {
            endWechatCall();
        });

        if (mode === 'video') {
            overlay.querySelector('#btnCallFlipCamera')?.addEventListener('click', () => {
                flipCallCamera();
            });
            overlay.querySelector('#btnCallToggleVisionMode')?.addEventListener('click', () => {
                toggleCallVisionMode();
            });
            overlay.querySelector('#btnCallTogglePip')?.addEventListener('click', () => {
                toggleCallPipWindow();
            });
            overlay.querySelector('#btnCallToggleCameraMute')?.addEventListener('click', () => {
                toggleCallCameraMute();
            });
            overlay.querySelector('#btnCallToggleAdjustStage')?.addEventListener('click', () => {
                toggleStageAdjustMode();
            });
        }
    }

    // 抓取摄像头单帧 Base64
    function captureVideoFrameBase64() {
        const video = document.getElementById('wechatCallLocalVideo');
        const canvas = document.getElementById('wechatCallSnapshotCanvas');
        if (!video || !canvas) return null;

        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;

        canvas.width = Math.min(480, vw);
        canvas.height = Math.round(canvas.width * (vh / vw));
        const ctx = canvas.getContext('2d');
        try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.7);
        } catch (e) {
            console.warn('[WechatCall] 画面抓帧失败:', e);
            return null;
        }
    }

    // 独立识图 API 调用
    async function inspectVisualFrameAsync(base64Img) {
        try {
            let cfg = null;
            if (typeof window.getSafeVisionConfig === 'function') {
                cfg = window.getSafeVisionConfig();
            } else {
                const rawCfg = localStorage.getItem('mcyt_vision_api_config');
                if (rawCfg) cfg = JSON.parse(rawCfg);
            }

            if (!cfg || !cfg.apiKey || !cfg.baseUrl) return '';

            const abortCtrl = new AbortController();
            const timeoutId = setTimeout(() => abortCtrl.abort(), 3500);

            const res = await fetch(`${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
                method: 'POST',
                signal: abortCtrl.signal,
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
                                { type: 'text', text: '请用一句极其简短的话（20字以内）客观描述画面中人物的动作、表情或镜头环境：' },
                                { type: 'image_url', image_url: { url: base64Img } }
                            ]
                        }
                    ],
                    max_tokens: 60
                })
            });

            clearTimeout(timeoutId);
            if (!res.ok) return '';
            const data = await res.json();
            return data?.choices?.[0]?.message?.content?.trim() || '';
        } catch (_) {
            return '';
        }
    }

    // 追加字幕
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
            font-size: 12.5px; line-height: 1.45;
            color: ${isSystem ? '#aaa' : (isPlayer ? '#a7f3d0' : '#ffffff')};
            word-break: break-word;
        `;

        if (isSystem) {
            item.innerHTML = `<span style="font-size:11px;color:#888;">[${time}] ${escapeHtml(text)}</span>`;
        } else {
            item.innerHTML = `
                <span style="font-weight:600;color:${isPlayer ? '#34d399' : '#38bdf8'};">${escapeHtml(name)}: </span>
                <span>${escapeHtml(text)}</span>
            `;
        }

        area.appendChild(item);

        const allItems = area.querySelectorAll('.call-subtitle-item');
        if (allItems.length > 2) {
            for (let i = 0; i < allItems.length - 2; i++) {
                allItems[i].classList.add('faded');
            }
        }
        area.scrollTop = area.scrollHeight;
    }

    // 触发角色思考回复
    async function triggerCallAIReply(isFirstGreeting = false, userSpoken = '', visualInsight = '', base64DirectImg = null) {
        const session = window._activeCallSession;
        if (!session) return;

        _globalCallTtsSequence++;
        const currentSequenceId = _globalCallTtsSequence;
        session.activeTtsSequenceId = currentSequenceId;

        if (window.ttsEngine && typeof window.ttsEngine.stop === 'function') {
            window.ttsEngine.stop();
        } else if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (_) {}
        }

        session.isAiReplying = true;
        const abortCtrl = new AbortController();
        session.currentAbortController = abortCtrl;

        setCallStatusText('正在思考回复中...', '#07c160');

        const npcId = session.npcId;
        const npc = window.G.npcs[npcId];
        const npcName = getNpcFullName(npcId);
        const playerName = getPlayerFullName();

        let aiConfig = null;
        try {
            aiConfig = JSON.parse(localStorage.getItem('mc_yt_ai_config') || '{}');
        } catch (_) {}

        if (!aiConfig || !aiConfig.apiKey) {
            setTimeout(() => {
                if (abortCtrl.signal.aborted || session.activeTtsSequenceId !== currentSequenceId) return;
                const fallbackReply = isFirstGreeting ? `喂？${playerName}，能听到我说话吗？` : `嗯嗯，我在听呢！`;
                finishAiReply(npcId, npcName, fallbackReply, currentSequenceId);
            }, 600);
            return;
        }

        const systemPrompt = `【当前处于微信${session.mode === 'video' ? '视频通话' : '语音电话'}连线中】
你正在扮演【${npc.name}】（人设：${npc.persona || '好友'}），正与【${playerName}】进行实时通话。

【严苛通话回复规则】：
1. 像真实打电话一样对话！单次回复短平快，字数严格控制在 1~3 句话（不超过 50 字）；
2. 绝对禁止长篇大论，严禁 Markdown 排版与表格；
3. 允许自然带出括号背景音如 "(轻笑一声)"、"(微风沙沙声)"；
4. 保持性格口吻。`;

        const messages = [{ role: 'system', content: systemPrompt }];

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
        } else if (base64DirectImg) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: `[当前视频画面事实感知帧] ${playerName}对你说: ${userSpoken || '(正在听你说话)'}` },
                    { type: 'image_url', image_url: { url: base64DirectImg } }
                ]
            });
        } else if (visualInsight) {
            messages.push({
                role: 'system',
                content: `[当前摄像头画面客观事实: ${visualInsight}]`
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

            if (abortCtrl.signal.aborted || session.activeTtsSequenceId !== currentSequenceId) return;
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            const replyText = data?.choices?.[0]?.message?.content?.trim() || '喂？信号好像有点卡住了，能听到吗？';

            finishAiReply(npcId, npcName, replyText, currentSequenceId);
        } catch (err) {
            if (err.name === 'AbortError' || session.activeTtsSequenceId !== currentSequenceId) return;
            console.warn('[CallAI] 通话回复出错:', err);
            finishAiReply(npcId, npcName, isFirstGreeting ? `喂，${playerName}？能听到我说话吗？` : '嗯嗯，我在听呢！', currentSequenceId);
        }
    }

    // 完成角色回复：智能切换立绘表情 + 上字幕 + TTS
    function finishAiReply(npcId, npcName, text, sequenceId) {
        const session = window._activeCallSession;
        if (!session) return;
        
        if (sequenceId !== undefined && sequenceId !== session.activeTtsSequenceId) return;

        session.isAiReplying = false;

        // 🌟 智能表情识别驱动立绘变化
        if (session.mode === 'video') {
            const emotion = detectEmotionFromText(text);
            updateLiveSpriteExpression(emotion);
        }

        appendCallSubtitle('npc', npcName, text);

        const npc = window.G.npcs[npcId];
        const npcVoiceCfg = (npc && npc.chatSettings && npc.chatSettings.tts) || {};
        const isTtsEnabled = !!(npcVoiceCfg.enabled || (window.ttsEngine && window.ttsEngine.getConfig && window.ttsEngine.getConfig().enabled));

        if (isTtsEnabled && window.ttsEngine) {
            setCallStatusText('对方正在讲话...', '#07c160');
            const speakPureText = text.replace(/\(.*?\)|（.*?）/g, '').trim() || text;
            
            window.ttsEngine.speak(speakPureText, npcVoiceCfg, () => {
                if (window._activeCallSession && window._activeCallSession.activeTtsSequenceId === sequenceId) {
                    setCallStatusText('通话连接稳定', '#07c160');
                }
            });
        } else {
            setCallStatusText('通话连接稳定', '#07c160');
        }
    }

    // 挂断通话并沉淀归档
    window.endWechatCall = async function() {
        const session = window._activeCallSession;
        if (!session) return;

        _globalCallTtsSequence++;

        clearInterval(session.timerInterval);
        if (session.silenceTimer) clearTimeout(session.silenceTimer);

        if (session.animFrameId) {
            cancelAnimationFrame(session.animFrameId);
            session.animFrameId = null;
        }

        if (session.audioContext) {
            try { session.audioContext.close(); } catch (_) {}
            session.audioContext = null;
        }

        if (session.currentAbortController) {
            try { session.currentAbortController.abort(); } catch (_) {}
        }
        if (window.ttsEngine && typeof window.ttsEngine.stop === 'function') {
            window.ttsEngine.stop();
        } else if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (_) {}
        }

        if (session.stream) {
            try { session.stream.getTracks().forEach(t => t.stop()); } catch (_) {}
        }

        const durationSec = session.durationSeconds;
        const durationStr = formatCallTimer(durationSec);
        const npcId = session.npcId;
        const modeLabel = (session.mode === 'video') ? '视频通话' : '语音电话';
        const targetName = getNpcFullName(npcId);
        const playerName = getPlayerFullName();

        const overlay = document.getElementById('wechatCallOverlayModal');
        if (overlay) {
            overlay.style.transition = 'opacity 0.2s ease';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 200);
        }

        const validMsgs = session.transcript.filter(t => t.role !== 'system');
        let recordBody = '';

        if (validMsgs.length === 0) {
            recordBody = `${playerName}与${targetName}进行了一次${modeLabel}，未产生有效对白已挂断。`;
        } else {
            const transcriptSnippet = validMsgs.map(m => `${m.name}: ${m.text}`).join('；');
            recordBody = `${playerName}与${targetName}进行了${modeLabel}（通话时长 ${durationStr}）。通话期间：${transcriptSnippet}`;
        }

        const time = new Date().toLocaleTimeString().slice(0, 5);
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };

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

        if (typeof renderSingleChatWindow === 'function') {
            renderSingleChatWindow();
        }
    };

    // 删除单条通话记录
    window.deleteCallRecordMessage = async function(msgId, npcId) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        const hist = window.getAccountChatHistory(npcId, curAcc.id);
        const idx = hist.findIndex(m => m._id === msgId);

        if (idx !== -1) {
            hist.splice(idx, 1);
            if (typeof window.syncChatHistoryToLocalBackup === 'function') {
                await window.syncChatHistoryToLocalBackup();
            }
            if (typeof window.autoSaveGame === 'function') {
                window.autoSaveGame();
            }
            if (typeof showToast === 'function') showToast('已删除通话记录', 'success', 1000);
            if (typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
        }
    };

})();
