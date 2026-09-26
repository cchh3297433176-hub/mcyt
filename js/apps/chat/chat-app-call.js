/**
 * js/apps/chat/chat-app-call.js
 * 📞 主播掌机 · 微信原生音视频实时通话独立中枢（抗噪滤波升级 · 视频通话全双工闭环 · 三模态视觉感知开关版）
 * 🛡️ 微信原生极简质感，消灭多余打字框与廉价元素，100% 纯粹全双工对讲体验。
 * 🌟 核心特性：
 *  1. 深度抗噪滤波：人声门限提升至 50，连续 5 帧确认，0.8 秒最短有效出声门禁，压死环境风扇与杂音；
 *  2. 接通首 1.5 秒噪声免疫锁：杜绝开麦瞬间环境音误掐断角色的主动问候；
 *  3. 异步 TTS 序列锁（ttsSequenceId）：彻底根除由于 TTS 合成慢导致新旧对白串音错乱的 Bug；
 *  4. 视频通话全链路修复：加入超时兜底，彻底解决无回复、无字幕与死锁问题；
 *  5. 视觉三模态实时开关：支持【设置外挂视觉 API】/【主模型原生看图】/【关闭视觉】一键循环切换；
 *  6. 视频/语音双轨动态声波 HUD：微信原生微绿平滑动态声波条与实时倾听状态；
 *  7. 视频通话支持实时从摄像头抽帧直连独立识图 API 或直传多模态主模型；
 *  8. 专属极速口语 Prompt（剥离联网/表情包，短平快日常口语，细腻生活背景音）；
 *  9. 通话结束全自动归档为第三人称具名客观记录（IndexedDB 永久保存，支持长按彻底删除）。
 */

(function() {
    'use strict';

    // 通话运行态对象
    window._activeCallSession = null;

    // 全局 TTS 发音版本序列锁（防止网络延迟导致多句语音重叠/错位播放）
    let _globalCallTtsSequence = 0;

    const PRIVACY_STORAGE_KEY = 'mcyt_call_video_privacy_agreed';
    const VISION_MODE_STORAGE_KEY = 'mcyt_call_vision_mode'; // 'external' | 'direct' | 'off'

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

        // 初始化 Session 运行时状态并自增序列锁
        _globalCallTtsSequence++;

        const currentVisionMode = localStorage.getItem(VISION_MODE_STORAGE_KEY) || 'external';

        window._activeCallSession = {
            npcId,
            mode,
            facingMode: currentFacing,
            visionMode: currentVisionMode, // 'external' | 'direct' | 'off'
            startTime: Date.now(),
            connectTimestamp: Date.now(), // 用于接通初始防抖锁
            durationSeconds: 0,
            timerInterval: null,
            stream: localStream,
            transcript: [], // [{ role: 'player'|'npc'|'system', name: '', text: '', time: '' }]
            isAiReplying: false,
            currentAbortController: null,
            activeTtsSequenceId: _globalCallTtsSequence,
            // 真实音频采集与 VAD 音量检测
            audioContext: null,
            audioAnalyser: null,
            animFrameId: null,
            mediaRecorder: null,
            recordedChunks: [],
            isUserSpeaking: false,
            speakingStartTime: 0,
            consecutiveVoiceFrames: 0, // 连续语音帧滤波计数
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

        // 播报初始接通提示（预留 600ms 缓冲，确保音频通道与 UI 挂载完毕）
        const targetName = getNpcFullName(npcId);
        setTimeout(() => {
            if (!window._activeCallSession) return;
            appendCallSubtitle('system', '系统', `已接通与 ${targetName} 的${mode === 'video' ? '视频' : '语音'}电话`);
            // 角色主动打招呼
            triggerCallAIReply(true);
        }, 600);
    }

    // 硬件级音量分析器 + MediaRecorder 真实录制 + 抗噪滤波 + 2 秒极速静音发射
    function startHardwareAudioVAD(stream) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx || !stream) return;

            const ctx = new AudioCtx();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 128;
            analyser.smoothingTimeConstant = 0.45; // 平滑滤波
            source.connect(analyser);

            window._activeCallSession.audioContext = ctx;
            window._activeCallSession.audioAnalyser = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            // 🌟 强力抗噪：基础人声触发门槛调升至 50（有效压死所有背景风扇与底噪）
            const BASE_VOICE_THRESHOLD = 50;

            const checkAudioLoop = () => {
                if (!window._activeCallSession) return;
                analyser.getByteFrequencyData(dataArray);

                let sum = 0;
                for (let i = 0; i < 24; i++) {
                    sum += dataArray[i];
                }
                const avgVolume = sum / 24;

                // 更新界面音波条动态
                updateCallWaveBars(avgVolume);

                // 🌟 接通首 1.5 秒免疫锁：禁止开麦瞬间环境音误掐断角色的初次问候
                const timeSinceConnect = Date.now() - window._activeCallSession.connectTimestamp;
                if (timeSinceConnect < 1500) {
                    window._activeCallSession.animFrameId = requestAnimationFrame(checkAudioLoop);
                    return;
                }

                // 如果 AI 正在说话，需要更响亮明确的人声才触发打断（防环境杂音误打断）
                const currentThreshold = window._activeCallSession.isAiReplying 
                    ? (BASE_VOICE_THRESHOLD * 1.65) 
                    : BASE_VOICE_THRESHOLD;

                if (avgVolume > currentThreshold) {
                    window._activeCallSession.consecutiveVoiceFrames++;

                    // 🌟 必须连续 5 帧（约 170ms）超门槛才确认为真人出声，彻底过滤单点爆破杂音
                    if (window._activeCallSession.consecutiveVoiceFrames >= 5) {
                        // 用户出声确认：掐断正在说话的 AI 与旧 TTS
                        interruptAiReplyIfActive();

                        // 启动录制块收集
                        if (!window._activeCallSession.isUserSpeaking) {
                            window._activeCallSession.isUserSpeaking = true;
                            window._activeCallSession.speakingStartTime = Date.now();
                            setUserSpeakingHUDStatus(true);
                            startSessionMediaRecorder(stream);
                        }

                        // 重置 2 秒静音定时器
                        if (window._activeCallSession.silenceTimer) {
                            clearTimeout(window._activeCallSession.silenceTimer);
                            window._activeCallSession.silenceTimer = null;
                        }
                    }
                } else {
                    // 音量回落
                    window._activeCallSession.consecutiveVoiceFrames = 0;

                    if (window._activeCallSession.isUserSpeaking) {
                        if (!window._activeCallSession.silenceTimer) {
                            // 🌟 静音倒计时满 2 秒（2000ms），停顿自然干脆
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

    // 启动 MediaRecorder 片段采集
    function startSessionMediaRecorder(stream) {
        if (!window.MediaRecorder || !window._activeCallSession) return;
        window._activeCallSession.recordedChunks = [];

        try {
            let mimeType = '';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
            else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
            else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';

            const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
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

    // 校验文本是否属于背景杂音幻觉
    function isJunkNoiseText(text) {
        if (!text) return true;
        const cleaned = text.trim().replace(/[，。！？,.!?~、 \-_]/g, '');
        if (cleaned.length < 2) return true;
        // 典型 Whisper 杂音幻觉过滤
        const JUNK_PATTERNS = ['呃', '啊', '嗯', '哦', '哎', '谢谢收看', '感谢观看', 'you', 'the', '字幕', 'Bye', '不客气', '再见', 'hello'];
        if (JUNK_PATTERNS.includes(cleaned)) return true;
        return false;
    }

    // 用户停止说话满 2 秒，提交音频转文字并触发 AI
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

        // 🌟 强力时长与体积门限：出声小于 0.8 秒或音频数据小于 2000 字节，判定为瞬时杂音直接丢弃
        if (speakingDuration < 800 || !audioBlob || audioBlob.size < 2000) {
            setCallStatusText('通话连接稳定', '#07c160');
            return;
        }

        // 调用私有云端 faster-whisper ASR
        setCallStatusText('正在理解你的话语...', '#07c160');

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

        // 杂音幻觉过滤
        if (!recognizedText || isJunkNoiseText(recognizedText)) {
            console.log('[WechatCall] 过滤环境底噪或幻觉识别:', recognizedText);
            setCallStatusText('通话连接稳定', '#07c160');
            return;
        }

        const playerName = getPlayerFullName();
        appendCallSubtitle('player', playerName, recognizedText);

        // 🌟 视频通话画面感知调度
        let visualInsight = '';
        let base64DirectImg = null;

        if (session.mode === 'video' && session.visionMode !== 'off') {
            const base64Img = captureVideoFrameBase64();
            if (base64Img) {
                if (session.visionMode === 'external') {
                    // 模式 A：外挂独立视觉识图 API（带 3.5 秒极速超时保护，超时不卡死通话）
                    visualInsight = await inspectVisualFrameAsync(base64Img);
                } else if (session.visionMode === 'direct') {
                    // 模式 B：主模型原生识图，直接暂存 Base64 供组装 messages
                    base64DirectImg = base64Img;
                }
            }
        }

        // 触发角色思考回答
        triggerCallAIReply(false, recognizedText, visualInsight, base64DirectImg);
    }

    // 豆包式打断机制：用户出声瞬间掐断 AI 网络生成与旧 TTS 发音，并自增序列号
    function interruptAiReplyIfActive() {
        const session = window._activeCallSession;
        if (!session) return;

        // 序列号自增，废弃之前任何未完成的 TTS 异步操作
        _globalCallTtsSequence++;
        session.activeTtsSequenceId = _globalCallTtsSequence;

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

            setCallStatusText('对方正在倾听你说话...', '#38bdf8');
        }
    }

    // 动态波形指示器
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
        if (indicatorVoice) {
            indicatorVoice.style.opacity = isSpeaking ? '1' : '0.2';
        }
        const indicatorVideo = document.getElementById('callSpeakingWaveWrapVideo');
        if (indicatorVideo) {
            indicatorVideo.style.opacity = isSpeaking ? '1' : '0.35';
        }
        if (isSpeaking) {
            setCallStatusText('正在听你说...', '#38bdf8');
        }
    }

    function setCallStatusText(text, color = '#07c160') {
        const statusEl = document.getElementById('callAiStatusText');
        if (statusEl) {
            statusEl.textContent = text;
            statusEl.style.color = color;
        }
        const statusVideoEl = document.getElementById('callAiStatusTextVideo');
        if (statusVideoEl) {
            statusVideoEl.textContent = text;
            statusVideoEl.style.color = color;
        }
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

    // 🌟 视觉模式实时切换中枢
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
            if (typeof showToast === 'function') showToast('视觉模式: 调用设置中的独立识图 API', 'info', 1500);
        } else if (mode === 'direct') {
            textEl.textContent = '原生看图';
            iconWrap.style.color = '#38bdf8';
            iconWrap.style.borderColor = '#38bdf8';
            if (typeof showToast === 'function') showToast('视觉模式: 主模型多模态直接看图', 'info', 1500);
        } else {
            textEl.textContent = '不识图';
            iconWrap.style.color = '#999999';
            iconWrap.style.borderColor = '#666666';
            if (typeof showToast === 'function') showToast('视觉模式: 已关闭画面识别（纯对讲）', 'info', 1500);
        }
    }

    // 渲染全屏通话 HUD 界面（微信原生极简黑灰毛玻璃）
    function renderCallOverlay(npcId, mode, stream) {
        document.getElementById('wechatCallOverlayModal')?.remove();

        const npc = window.G.npcs[npcId];
        const npcAvatar = npc.avatarUrl || npc.avatar || 'assets/icons/chat.png';
        const targetName = getNpcFullName(npcId);
        const initialVisionMode = localStorage.getItem(VISION_MODE_STORAGE_KEY) || 'external';

        const overlay = document.createElement('div');
        overlay.id = 'wechatCallOverlayModal';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 100009;
            background: #111111; display: flex; flex-direction: column;
            overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            user-select: none; -webkit-user-select: none;
            animation: wechatCallFadeIn 0.22s cubic-bezier(0.1, 0.9, 0.2, 1);
        `;

        overlay.innerHTML = `
            <style>
                @keyframes wechatCallFadeIn { from { opacity: 0; transform: scale(1.02); } to { opacity: 1; transform: scale(1); } }
                @keyframes wechatCallWave { 0% { transform: scale(0.96); opacity: 0.7; } 50% { transform: scale(1.12); opacity: 0.15; } 100% { transform: scale(0.96); opacity: 0.7; } }
                .call-subtitle-item { transition: opacity 0.25s ease, transform 0.25s ease; }
                .call-subtitle-item.faded { opacity: 0.28 !important; }
            </style>

            <!-- 顶部原生状态排版 -->
            <div style="padding: 30px 20px 10px; display: flex; justify-content: space-between; align-items: center; z-index: 10; color: #ffffff;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #07c160;"></span>
                    <span style="font-size: 13.5px; font-weight: 500; letter-spacing: 0.3px; color: #e5e5e5;">${mode === 'video' ? '视频通话中' : '语音通话中'}</span>
                </div>
                <div id="wechatCallTimerText" style="font-size: 14.5px; font-weight: 600; font-variant-numeric: tabular-nums; color: #ffffff; letter-spacing: 0.5px;">00:00</div>
            </div>

            <!-- 主舞台视觉呈现 -->
            <div style="flex: 1; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden;">
                ${mode === 'video' ? `
                    <!-- 视频背景舞台 -->
                    <div style="position: absolute; inset: 0; background: radial-gradient(circle at center, #1f2937 0%, #0b0f19 100%); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <img src="${npcAvatar}" style="width: 86px; height: 86px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); object-fit: cover; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
                        <div style="color: #ffffff; font-size: 16px; font-weight: 600; margin-top: 14px; letter-spacing: 0.3px;">${escapeHtml(targetName)}</div>
                        <div id="callAiStatusTextVideo" style="font-size: 12px; color: #07c160; margin-top: 6px;">通话连接稳定</div>

                        <!-- 视频通话实时出声动态声波指示器 -->
                        <div id="callSpeakingWaveWrapVideo" style="display: flex; align-items: center; gap: 4px; height: 26px; margin-top: 12px; padding: 0 12px; border-radius: 14px; background: rgba(0,0,0,0.45); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); opacity: 0.35; transition: opacity 0.2s ease; border: 0.5px solid rgba(255,255,255,0.1);">
                            <span class="call-live-wave-bar" style="width: 3px; height: 4px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 6px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 8px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 6px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 4px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                        </div>
                    </div>

                    <!-- 本地画中画视窗（右上角微信质感圆角框） -->
                    <div style="position: absolute; top: 14px; right: 16px; width: 106px; height: 152px; border-radius: 12px; overflow: hidden; border: 1.5px solid rgba(255,255,255,0.3); box-shadow: 0 8px 24px rgba(0,0,0,0.5); z-index: 5; background: #000000;">
                        <video id="wechatCallLocalVideo" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);"></video>
                    </div>
                ` : `
                    <!-- 纯语音微信质感居中波纹头像 -->
                    <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
                        <div style="position: absolute; width: 145px; height: 145px; border-radius: 50%; background: rgba(7, 193, 96, 0.18); animation: wechatCallWave 3.2s infinite ease-in-out;"></div>
                        <img src="${npcAvatar}" style="position: relative; width: 110px; height: 110px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.85); object-fit: cover; box-shadow: 0 12px 35px rgba(0,0,0,0.65);">
                        <div style="color: #ffffff; font-size: 18px; font-weight: 600; margin-top: 16px; letter-spacing: 0.4px;">${escapeHtml(targetName)}</div>
                        <div id="callAiStatusText" style="font-size: 12.5px; color: #07c160; margin-top: 6px;">通话连接稳定</div>

                        <!-- 实时出声动态声波指示器 -->
                        <div id="callSpeakingWaveWrap" style="display: flex; align-items: center; gap: 4px; height: 30px; margin-top: 14px; opacity: 0.2; transition: opacity 0.2s ease;">
                            <span class="call-live-wave-bar" style="width: 3px; height: 4px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 6px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 8px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 6px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                            <span class="call-live-wave-bar" style="width: 3px; height: 4px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                        </div>
                    </div>
                `}

                <!-- 隐形画板：用于视频抽帧识图 -->
                <canvas id="wechatCallSnapshotCanvas" style="display:none;"></canvas>

                <!-- 底部磨砂流式字幕窗口（确保高 z-index 15，覆盖在视频之上） -->
                <div style="position: absolute; bottom: 10px; left: 18px; right: 18px; max-height: 155px; display: flex; flex-direction: column; z-index: 15;">
                    <div id="wechatCallSubtitleArea" style="overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding: 10px 14px; background: rgba(15, 15, 15, 0.72); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-radius: 14px; border: 0.5px solid rgba(255,255,255,0.12); box-shadow: 0 4px 20px rgba(0,0,0,0.45);">
                        <div style="text-align: center; color: rgba(255,255,255,0.45); font-size: 11px;">— 说话停顿 2 秒自动发送 · 随时开口可打断 —</div>
                    </div>
                </div>
            </div>

            <!-- 底部极简微信按键栏 -->
            <div style="padding: 24px 20px 38px; display: flex; justify-content: center; align-items: center; position: relative; z-index: 20;">
                
                <!-- 挂断红键（居中醒目） -->
                <button type="button" id="btnCallHangup" title="挂断" style="border: none; background: #fa5151; color: #ffffff; width: 68px; height: 68px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 6px 20px rgba(250, 81, 81, 0.45); -webkit-tap-highlight-color: transparent;">
                    <svg viewBox="0 0 24 24" style="width: 30px; height: 30px; fill: currentColor;"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C3.28 8.84 7.42 7 12 7c4.58 0 8.72 1.84 11.71 4.67.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                </button>

                <!-- 🌟 视频模式专属按键群：视觉模式切换 + 翻转镜头 -->
                ${mode === 'video' ? `
                <!-- 左侧：视觉模式切换胶囊 -->
                <div style="position: absolute; left: 30px;">
                    <button type="button" id="btnCallToggleVisionMode" title="切换视觉感知模式" style="border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.12); backdrop-filter: blur(8px); color: #ffffff; padding: 0 12px; height: 46px; border-radius: 23px; display: flex; align-items: center; gap: 6px; cursor: pointer; -webkit-tap-highlight-color: transparent;">
                        <div id="callVisionModeIconWrap" style="width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid #07c160; color: #07c160; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold;">●</div>
                        <span id="callVisionModeText" style="font-size: 11.5px; font-weight: 500; color: #ffffff;">外挂识图</span>
                    </button>
                </div>

                <!-- 右侧：翻转镜头按键 -->
                <div style="position: absolute; right: 30px;">
                    <button type="button" id="btnCallFlipCamera" title="翻转镜头" style="border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.12); backdrop-filter: blur(8px); color: #ffffff; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; -webkit-tap-highlight-color: transparent;">
                        <svg viewBox="0 0 24 24" style="width: 21px; height: 21px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><path d="M20 16v5h-5"/><path d="M4 8V3h5"/><path d="M4 14a8 8 0 0 0 14.54 3.46L20 21"/><path d="M20 10a8 8 0 0 0-14.54-3.46L4 3"/></svg>
                    </button>
                </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(overlay);

        // 初始化视觉按钮外观
        if (mode === 'video') {
            updateVisionModeUI(initialVisionMode);
        }

        // 挂载本地视频流
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

        if (mode === 'video') {
            overlay.querySelector('#btnCallFlipCamera')?.addEventListener('click', () => {
                flipCallCamera();
            });
            overlay.querySelector('#btnCallToggleVisionMode')?.addEventListener('click', () => {
                toggleCallVisionMode();
            });
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

    // 🌟 独立识图 API 调用（带 3.5 秒极速超时保护，超时不卡死通话）
    async function inspectVisualFrameAsync(base64Img) {
        try {
            let cfg = null;
            if (typeof window.getSafeVisionConfig === 'function') {
                cfg = window.getSafeVisionConfig();
            } else {
                const rawCfg = localStorage.getItem('mcyt_vision_api_config');
                if (rawCfg) cfg = JSON.parse(rawCfg);
            }

            if (!cfg || !cfg.apiKey || !cfg.baseUrl) {
                return '';
            }

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
                                { type: 'text', text: '请用一句极其简短的话（20字以内）客观描述画面中人物的动作、表情或镜头环境（如：用户正对着镜头笑、室内光线昏暗）：' },
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

    // 触发角色极速电话回复（超轻量专属 Prompt，支持多模态原生图文或外挂事实感知）
    async function triggerCallAIReply(isFirstGreeting = false, userSpoken = '', visualInsight = '', base64DirectImg = null) {
        const session = window._activeCallSession;
        if (!session) return;

        // 🌟 新一轮生成开启：自增序列锁并终止前置未完成的请求
        _globalCallTtsSequence++;
        const currentSequenceId = _globalCallTtsSequence;
        session.activeTtsSequenceId = currentSequenceId;

        // 停止之前的 TTS 播放与发音
        if (window.ttsEngine && typeof window.ttsEngine.stop === 'function') {
            window.ttsEngine.stop();
        } else if (window.speechSynthesis) {
            try { window.speechSynthesis.cancel(); } catch (_) {}
        }

        session.isAiReplying = true;
        const abortCtrl = new AbortController();
        session.currentAbortController = abortCtrl;

        setCallStatusText('对方正在说话...', '#07c160');

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
                if (abortCtrl.signal.aborted || session.activeTtsSequenceId !== currentSequenceId) return;
                const fallbackReply = isFirstGreeting ? `喂？${playerName}，能听到我说话吗？` : `嗯嗯，我在听呢！`;
                finishAiReply(npcId, npcName, fallbackReply, currentSequenceId);
            }, 600);
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
        } else if (base64DirectImg) {
            // 🌟 模式 B：主模型原生识图，直接向多模态主模型投递图片帧
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: `[当前视频画面事实感知帧] ${playerName}对你说: ${userSpoken || '(正在听你说话)'}` },
                    { type: 'image_url', image_url: { url: base64DirectImg } }
                ]
            });
        } else if (visualInsight) {
            // 🌟 模式 A：外挂视觉 API 解析出的事实文字注入
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

            if (abortCtrl.signal.aborted || session.activeTtsSequenceId !== currentSequenceId) {
                console.log('[CallAI] 回复已过期或被中止，废弃网络返回');
                return;
            }
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            const replyText = data?.choices?.[0]?.message?.content?.trim() || '喂？信号好像有点卡住了，能听到吗？';

            finishAiReply(npcId, npcName, replyText, currentSequenceId);
        } catch (err) {
            if (err.name === 'AbortError' || session.activeTtsSequenceId !== currentSequenceId) {
                console.log('[CallAI] 回复已被用户打断或序列已失效');
                return;
            }
            console.warn('[CallAI] 通话回复出错:', err);
            finishAiReply(npcId, npcName, isFirstGreeting ? `喂，${playerName}？能听到我说话吗？` : '嗯嗯，我在听呢！', currentSequenceId);
        }
    }

    // 完成角色回复：上字幕 + 播放 TTS（带 sequenceId 校验）
    function finishAiReply(npcId, npcName, text, sequenceId) {
        const session = window._activeCallSession;
        if (!session) return;
        
        // 序列锁门禁：如果不是当前最新一轮生成，绝对不上屏不发音
        if (sequenceId !== undefined && sequenceId !== session.activeTtsSequenceId) {
            console.log('[CallAI] 拦截到陈旧回复，已就地丢弃防串音');
            return;
        }

        session.isAiReplying = false;
        setCallStatusText('通话连接稳定', '#07c160');

        appendCallSubtitle('npc', npcName, text);

        // TTS 发音朗读
        const npc = window.G.npcs[npcId];
        const npcVoiceCfg = (npc && npc.chatSettings && npc.chatSettings.tts) || {};
        const isTtsEnabled = !!(npcVoiceCfg.enabled || (window.ttsEngine && window.ttsEngine.getConfig && window.ttsEngine.getConfig().enabled));

        if (isTtsEnabled && window.ttsEngine) {
            // 剥离掉背景音括号，仅朗读对白
            const speakPureText = text.replace(/\(.*?\)|（.*?）/g, '').trim() || text;
            
            window.ttsEngine.speak(speakPureText, npcVoiceCfg, () => {
                if (window._activeCallSession && window._activeCallSession.activeTtsSequenceId === sequenceId) {
                    setCallStatusText('通话连接稳定', '#07c160');
                }
            });
        }
    }

    // 挂断通话并做第三人称具名沉淀归档
    window.endWechatCall = async function() {
        const session = window._activeCallSession;
        if (!session) return;

        // 自增序列并物理掐断
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
            recordBody = `${playerName}与${targetName}进行了一次${modeLabel}，未产生有效对白已挂断。`;
        } else {
            const transcriptSnippet = validMsgs.map(m => `${m.name}: ${m.text}`).join('；');
            recordBody = `${playerName}与${targetName}进行了${modeLabel}（通话时长 ${durationStr}）。通话期间：${transcriptSnippet}`;
        }

        const time = new Date().toLocaleTimeString().slice(0, 5);
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };

        // 构造一条通话结束系统消息卡片（支持长按删除与防记忆污染）
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

    // 全局提供：删除单条通话记录并撤回记忆通道
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
