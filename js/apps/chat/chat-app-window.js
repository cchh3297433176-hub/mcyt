/**
 * js/apps/chat/chat-app-window.js
 * 💬 微信主应用 · 拆分分片 3/7：单人私聊窗口渲染（renderSingleChatWindow，仿群聊双层工具栏 · 顶栏闪电继续说 · 输入栏纯图标重说键 · 消息折叠 · 装扮与气泡/头像框自适应渲染）、
 *    微信内嵌全屏浏览器浮层（window.openWebPageLink）、
 *    重新生成回复的确认与执行（confirmRetryLastAIReply / doRetryLastAIReply）、
 *    微信原生直显大图与沉浸式大图文字查看器对接、拟真生活排版卡片（ui_card）渲染。
 * 🌟 升级：
 *  1. 彻底解决录音静音与空语音：单次直接接管硬件流，杜绝并发冲突与松手竞态丢失；
 *  2. 离线 ASR 全透明诊断：未激活模型、模型装载中、推理中、转写完成全链路醒目 Toast 提醒，杜绝静默失败；
 *  3. 交互解耦：点击声波播放/暂停音频；点击末尾空白处/微标专门展开/收起转文字与背景音，绝对不误触发播放；
 *  4. 全语种支持：支持德语、英语、日语等外语原声（originalText）、中文翻译（text）与生活背景音（audioBg）清晰排版；
 *  5. 发送语音后不自动触发 AI 回复，严格遵循点击闪电才生成；
 *  6. 麦克风未收录到有效音频时轻量拦截与 Toast 提示，杜绝生成空语音。
 */

(function() {
    'use strict';

    // 运行时单聊输入模式：'text' | 'voice'
    window._chatInputMode = window._chatInputMode || 'text';
    // 语音浮层开启状态
    window._voiceActionMenuOpen = false;

    // 录音状态控制与防抖锁
    let _isRecordingVoice = false;
    let _stopRequestedWhileStarting = false;
    let _voiceRecordStartTime = 0;
    let _speechRecognitionInstance = null;
    let _recognizedVoiceText = '';

    // 真实音频录制器（MediaRecorder）实例与缓冲块
    let _mediaRecorderInstance = null;
    let _audioRecordedChunks = [];
    let _activeRecordStream = null;

    // 音频实时播放实例状态（支持播放与波形反馈）
    let _currentPlayingAudio = null;
    let _currentPlayingMsgId = null;

    // 音量实时检测与 HUD 动画控制
    let _audioContextInstance = null;
    let _audioAnalyserInstance = null;
    let _waveAnimFrameId = null;

    // 辅助：获取形状圆角
    function getShapeBorderRadius(shape) {
        if (shape === 'circle') return '50%';
        if (shape === 'squircle') return '8px';
        if (shape === 'square') return '2px';
        return '8px';
    }

    // 微信原生录音 HUD 动态渲染与波形采集
    function showVoiceRecordingHUD(existingStream) {
        hideVoiceRecordingHUD();

        const hud = document.createElement('div');
        hud.id = 'wechatVoiceRecordingHUD';
        hud.style.cssText = `
            position: fixed; inset: 0; z-index: 100008;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0, 0, 0, 0.35); pointer-events: none;
            user-select: none; -webkit-user-select: none;
            animation: wechatHudFadeIn 0.16s cubic-bezier(0.1, 0.9, 0.2, 1);
        `;

        hud.innerHTML = `
            <style>
                @keyframes wechatHudFadeIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
                @keyframes wechatHudFadeOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.92); } }
            </style>
            <div id="hudBoxContent" style="width: 156px; height: 156px; border-radius: 18px; background: rgba(22, 22, 22, 0.86); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(0,0,0,0.35); border: 0.5px solid rgba(255,255,255,0.12); box-sizing: border-box; padding: 12px;">
                <div id="hudWaveIconGroup" style="display: flex; align-items: center; justify-content: center; gap: 14px; height: 60px; margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: rgba(7, 193, 96, 0.18);">
                        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: none; stroke: #07c160; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                            <line x1="12" y1="19" x2="12" y2="23"></line>
                            <line x1="8" y1="23" x2="16" y2="23"></line>
                        </svg>
                    </div>

                    <div style="display: flex; align-items: center; gap: 3.5px; height: 38px;">
                        <span class="wechat-wave-bar" style="width: 3.5px; height: 8px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                        <span class="wechat-wave-bar" style="width: 3.5px; height: 14px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                        <span class="wechat-wave-bar" style="width: 3.5px; height: 22px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                        <span class="wechat-wave-bar" style="width: 3.5px; height: 14px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                        <span class="wechat-wave-bar" style="width: 3.5px; height: 8px; background: #07c160; border-radius: 2px; transition: height 0.08s ease;"></span>
                    </div>
                </div>

                <div id="hudVoiceDuration" style="font-size: 15px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; margin-bottom: 4px;">1"</div>
                <div id="hudVoiceSubTip" style="font-size: 11.5px; color: #a0a0a0; font-weight: 500;">手指松开 发送</div>
            </div>
        `;

        document.body.appendChild(hud);

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx && existingStream) {
                _audioContextInstance = new AudioCtx();
                const source = _audioContextInstance.createMediaStreamSource(existingStream);
                _audioAnalyserInstance = _audioContextInstance.createAnalyser();
                _audioAnalyserInstance.fftSize = 64;
                source.connect(_audioAnalyserInstance);

                const dataArray = new Uint8Array(_audioAnalyserInstance.frequencyBinCount);
                const bars = hud.querySelectorAll('.wechat-wave-bar');

                const updateWaveBars = () => {
                    if (!_isRecordingVoice) return;
                    _audioAnalyserInstance.getByteFrequencyData(dataArray);

                    let sum = 0;
                    for (let i = 0; i < 16; i++) { sum += dataArray[i]; }
                    const avg = sum / 16;

                    const durationEl = document.getElementById('hudVoiceDuration');
                    if (durationEl) {
                        const curSec = Math.max(1, Math.round((Date.now() - _voiceRecordStartTime) / 1000));
                        durationEl.textContent = `${curSec}"`;
                    }

                    bars.forEach((bar, idx) => {
                        const factor = 1 + Math.sin(idx * 0.8 + Date.now() / 150) * 0.4;
                        const h = Math.min(36, Math.max(6, Math.round((avg / 255) * 36 * factor)));
                        bar.style.height = `${h}px`;
                    });

                    _waveAnimFrameId = requestAnimationFrame(updateWaveBars);
                };
                updateWaveBars();
            }
        } catch (_) {}
    }

    // 将 HUD 转为正在离线识别状态
    function setVoiceHudTranscribing(tip = '正在本地离线转文字...') {
        const hud = document.getElementById('wechatVoiceRecordingHUD');
        if (!hud) return;
        const iconGroup = document.getElementById('hudWaveIconGroup');
        const durationEl = document.getElementById('hudVoiceDuration');
        const tipEl = document.getElementById('hudVoiceSubTip');

        if (iconGroup) {
            iconGroup.innerHTML = `
                <div class="wechat-spin-ring" style="width:28px;height:28px;border-width:2.5px;border-color:#07c160;border-top-color:transparent;"></div>
            `;
        }
        if (durationEl) durationEl.textContent = '转文字中';
        if (tipEl) tipEl.textContent = tip;
    }

    function hideVoiceRecordingHUD() {
        if (_waveAnimFrameId) {
            cancelAnimationFrame(_waveAnimFrameId);
            _waveAnimFrameId = null;
        }
        if (_audioContextInstance) {
            try { _audioContextInstance.close(); } catch (_) {}
            _audioContextInstance = null;
        }
        const hud = document.getElementById('wechatVoiceRecordingHUD');
        if (hud) {
            hud.style.animation = 'wechatHudFadeOut 0.14s cubic-bezier(0.4, 0, 1, 1)';
            setTimeout(() => { hud.remove(); }, 120);
        }
    }

    // 辅助：统一获取全局/运行时头像框配置列表
    function getAvailableFramesList() {
        if (typeof window.getStoredDecorFrames === 'function') {
            const list = window.getStoredDecorFrames();
            if (Array.isArray(list) && list.length > 0) return list;
        }
        if (Array.isArray(window._decorFramesCache) && window._decorFramesCache.length > 0) {
            return window._decorFramesCache;
        }
        let framesList = [];
        try {
            framesList = JSON.parse(localStorage.getItem('mcyt_decor_frames') || '[]');
        } catch (_) {}
        const DEFAULT_FRAMES = [
            { id: 'frame_none', name: '无头像框', url: '', scale: 1.18, offsetX: 0, offsetY: 0, isBuiltin: true },
            { id: 'frame_gold_star', name: '金色之星', url: 'assets/decor/frames/frame_gold.png', scale: 1.18, offsetX: 0, offsetY: 0 },
            { id: 'frame_cat_ear', name: '猫耳软萌', url: 'assets/decor/frames/frame_cat.png', scale: 1.18, offsetX: 0, offsetY: 0 }
        ];
        return [...DEFAULT_FRAMES, ...framesList];
    }

    // 辅助：获取气泡样式字符串
    function getDecorBubbleCss(bubbleId, isSelf) {
        let bubbles = [];
        try {
            if (typeof window.getStoredDecorBubbles === 'function') {
                bubbles = window.getStoredDecorBubbles();
            } else {
                const DEFAULT_BUBBLES = [
                    {
                        id: 'bubble_default',
                        userStyle: 'background-color: #95ec69; color: #000000; border-radius: 6px;',
                        npcStyle: 'background-color: #ffffff; color: #000000; border-radius: 6px; border: 1px solid #e7e7e7;'
                    }
                ];
                const stored = JSON.parse(localStorage.getItem('mcyt_decor_bubbles') || '[]');
                bubbles = [...DEFAULT_BUBBLES, ...stored];
            }
        } catch (_) {}

        const b = bubbles.find(x => x.id === bubbleId) || bubbles[0];
        if (!b) return isSelf ? 'background-color: #95ec69; color: #000;' : 'background-color: #ffffff; color: #000;';

        if (b.type === 'nine_slice') {
            const imgUrl = isSelf ? (b.userBorderImage || b.borderImage) : (b.npcBorderImage || b.userBorderImage || b.borderImage);
            const slice = isSelf ? (b.userSlice || b.slice || '30% 30% 30% 30%') : (b.npcSlice || b.userSlice || b.slice || '30% 30% 30% 30%');
            const padding = isSelf ? (b.userPadding || b.padding || '8px 12px') : (b.npcPadding || b.padding || '8px 12px');
            const borderWidth = isSelf ? (b.userBorderWidth || b.borderWidth || 14) : (b.npcBorderWidth || b.borderWidth || 14);
            const textColor = isSelf ? (b.userTextColor || b.textColor || '#111111') : (b.npcTextColor || b.textColor || '#222222');
            return `border-style: solid; border-width: ${borderWidth}px; border-image: url('${imgUrl}') ${slice} fill stretch; -webkit-border-image: url('${imgUrl}') ${slice} fill stretch; padding: ${padding}; background: transparent; color: ${textColor};`;
        } else {
            return isSelf ? (b.userStyle || 'background-color: #95ec69; color: #000;') : (b.npcStyle || 'background-color: #ffffff; color: #000;');
        }
    }

    // 辅助：统一渲染气泡内容
    function renderSafeBubbleHtml(contentHtml, isSelf, bubbleId, customClass = '') {
        if (typeof window.buildDecorBubbleHtml === 'function') {
            return window.buildDecorBubbleHtml(contentHtml, isSelf, bubbleId, customClass);
        }
        const fallbackCss = getDecorBubbleCss(bubbleId, isSelf);
        return `
            <div class="chat-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" style="width:fit-content;max-width:100%;display:inline-block;padding:8px 12px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:14.5px;line-height:1.5;word-break:break-word;${fallbackCss};">
                ${contentHtml}
            </div>
        `;
    }

    // 辅助：渲染带装扮与头像框的头像元素
    function renderDecorAvatarHtml(avatarUrl, shape, frameObjOrUrl, size = 38) {
        const rad = getShapeBorderRadius(shape);
        let frameUrl = '';
        let frameScale = 1.18;
        let offsetX = 0;
        let offsetY = 0;

        if (frameObjOrUrl && typeof frameObjOrUrl === 'object') {
            frameUrl = frameObjOrUrl.url || '';
            frameScale = (frameObjOrUrl.scale !== undefined) ? frameObjOrUrl.scale : 1.18;
            offsetX = frameObjOrUrl.offsetX || 0;
            offsetY = frameObjOrUrl.offsetY || 0;
        } else if (typeof frameObjOrUrl === 'string') {
            frameUrl = frameObjOrUrl;
        }

        return `
            <div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0;">
                <img src="${avatarUrl || 'assets/icons/chat.png'}" style="width:100%;height:100%;object-fit:cover;border-radius:${rad};display:block;" onerror="this.src='assets/icons/chat.png';" />
                ${frameUrl ? `
                    <img src="${frameUrl}" style="position:absolute;top:50%;left:50%;transform:translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${frameScale});width:100%;height:100%;pointer-events:none;" onerror="this.style.display='none';" />
                ` : ''}
            </div>
        `;
    }

    // 全局统一语音播放中枢
    window.playVoiceMessageDirect = function(msgId) {
        const curNpcId = window.G && window.G.currentChatNpc;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        const hist = window.getAccountChatHistory(curNpcId, curAcc.id) || [];
        const msg = hist.find(m => m._id === msgId);
        if (!msg) return;

        const updateWaveIcon = (isPlaying) => {
            const waveEl = document.getElementById('voiceWaveIcon_' + msgId);
            if (waveEl) {
                if (isPlaying) {
                    waveEl.classList.add('wechat-voice-anim-playing');
                } else {
                    waveEl.classList.remove('wechat-voice-anim-playing');
                }
            }
        };

        if (_currentPlayingAudio && _currentPlayingMsgId === msgId) {
            try {
                _currentPlayingAudio.pause();
                _currentPlayingAudio.currentTime = 0;
            } catch (_) {}
            updateWaveIcon(false);
            _currentPlayingAudio = null;
            _currentPlayingMsgId = null;
            return;
        }

        if (_currentPlayingAudio) {
            try {
                _currentPlayingAudio.pause();
                _currentPlayingAudio.currentTime = 0;
            } catch (_) {}
            if (_currentPlayingMsgId) {
                const oldWave = document.getElementById('voiceWaveIcon_' + _currentPlayingMsgId);
                if (oldWave) oldWave.classList.remove('wechat-voice-anim-playing');
            }
            _currentPlayingAudio = null;
            _currentPlayingMsgId = null;
        }

        // 1. 优先播放真实录音文件
        if (msg.audioData) {
            try {
                const aud = new Audio(msg.audioData);
                _currentPlayingAudio = aud;
                _currentPlayingMsgId = msgId;
                updateWaveIcon(true);
                aud.onended = () => {
                    updateWaveIcon(false);
                    _currentPlayingAudio = null;
                    _currentPlayingMsgId = null;
                };
                aud.onerror = (e) => {
                    console.warn('[VoicePlayer] 播放失败:', e);
                    updateWaveIcon(false);
                    _currentPlayingAudio = null;
                    _currentPlayingMsgId = null;
                    if (typeof showToast === 'function') showToast('音频播放异常', 'info', 1200);
                };
                aud.play().catch(e => {
                    console.warn('[VoicePlayer] 播放受阻:', e);
                    updateWaveIcon(false);
                });
                return;
            } catch (err) {
                console.warn('[VoicePlayer] 初始化 Audio 失败:', err);
            }
        }

        if (msg.from === 'player') {
            if (typeof showToast === 'function') showToast('录音为空或损坏', 'info', 1000);
            return;
        }

        // 2. 如果是 NPC 发出的语音，且角色开启了 TTS
        const npc = window.G.npcs ? window.G.npcs[curNpcId] : null;
        const npcVoiceCfg = (npc && npc.chatSettings && npc.chatSettings.tts) || {};
        
        const isTtsEnabled = !!(npcVoiceCfg.enabled || (window.ttsEngine && window.ttsEngine.getConfig && window.ttsEngine.getConfig().enabled));
        if (msg.from !== 'player' && isTtsEnabled && window.ttsEngine) {
            updateWaveIcon(true);
            const speechText = msg.originalText || msg.text || '';
            window.ttsEngine.speak(speechText, npcVoiceCfg, () => {
                updateWaveIcon(false);
                _currentPlayingMsgId = null;
            });
            _currentPlayingMsgId = msgId;
        } else {
            if (typeof showToast === 'function') showToast('未开启 TTS 语音引擎', 'info', 1000);
        }
    };

    // 全局挂载：纯粹展开/折叠语音详情文本（绝对不触发任何播放）
    window.toggleVoiceMessageDetailsDirect = function(msgId) {
        const box = document.getElementById('voiceDescBox_' + msgId);
        const tag = document.getElementById('voiceToggleTag_' + msgId);
        if (box) {
            const isHidden = (box.style.display === 'none' || getComputedStyle(box).display === 'none');
            box.style.display = isHidden ? 'block' : 'none';
            if (tag) {
                tag.style.opacity = isHidden ? '1' : '0.65';
            }
        }
    };

    // 全局挂载直接展开/收起翻译函数
    window.toggleMessageTranslationDirect = function(btn, msgId) {
        const box = document.getElementById('transBox_' + msgId);
        if (box) {
            const isHidden = (box.style.display === 'none' || getComputedStyle(box).display === 'none');
            box.style.display = isHidden ? 'block' : 'none';
            if (btn) {
                btn.textContent = isHidden ? '收起翻译' : '翻译';
            }
        }
    };

    // 控制左下角语音纯图标弹出菜单
    window.toggleVoiceActionMenu = function(type, npcId) {
        window._voiceActionMenuOpen = !window._voiceActionMenuOpen;
        window.renderSingleChatWindow(null, { keepScroll: true });
    };

    // 切换至打字/语音模式
    window.switchChatVoiceMode = async function(mode, npcId) {
        window._voiceActionMenuOpen = false;
        window._chatInputMode = (mode === 'voice') ? 'voice' : 'text';
        window.renderSingleChatWindow(null, { keepScroll: true });
    };

    // 真实录音与 ASR 本地离线语音识别核心（零延迟单次硬件接管）
    window.startRealVoiceRecord = async function(npcId) {
        if (_isRecordingVoice) return;

        _isRecordingVoice = true;
        _stopRequestedWhileStarting = false;
        _voiceRecordStartTime = Date.now();
        _recognizedVoiceText = '';
        _audioRecordedChunks = [];

        // 立即展示录音 HUD，给予用户即时视觉反馈
        showVoiceRecordingHUD(null);

        const recordBtn = document.getElementById('btnVoiceRecordPress');
        if (recordBtn) {
            recordBtn.style.background = '#e5e5e5';
            recordBtn.setAttribute('data-recording', 'true');
        }

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('当前环境不支持麦克风录音');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            if (!_isRecordingVoice || _stopRequestedWhileStarting) {
                stream.getTracks().forEach(t => t.stop());
                hideVoiceRecordingHUD();
                return;
            }

            _activeRecordStream = stream;
            showVoiceRecordingHUD(stream);

            if (window.MediaRecorder) {
                let mimeType = '';
                if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
                else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
                else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';

                const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
                mr.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) {
                        _audioRecordedChunks.push(e.data);
                    }
                };
                mr.start(100);
                _mediaRecorderInstance = mr;
            }
        } catch (recErr) {
            console.error('[VoiceRecord] 硬件媒体录音启动失败:', recErr);
            _isRecordingVoice = false;
            hideVoiceRecordingHUD();
            if (typeof showToast === 'function') {
                showToast('请在手机或应用设置中允许麦克风权限', 'info', 2000);
            }
            return;
        }

        // 辅助双轨：系统级 Web Speech 兜底侦听
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
            try {
                const rec = new SpeechRec();
                rec.lang = 'zh-CN';
                rec.continuous = true;
                rec.interimResults = true;
                rec.onresult = (event) => {
                    let full = '';
                    for (let i = 0; i < event.results.length; ++i) {
                        full += event.results[i][0].transcript;
                    }
                    if (full.trim()) _recognizedVoiceText = full.trim();
                };
                rec.onerror = () => {};
                rec.start();
                _speechRecognitionInstance = rec;
            } catch (_) {}
        }
    };

    window.stopRealVoiceRecordAndSend = async function(npcId) {
        if (!_isRecordingVoice) {
            _stopRequestedWhileStarting = true;
            return;
        }
        _isRecordingVoice = false;

        const durationSeconds = Math.max(1, Math.min(60, Math.round((Date.now() - _voiceRecordStartTime) / 1000)));

        if (_speechRecognitionInstance) {
            try { _speechRecognitionInstance.stop(); } catch (_) {}
            _speechRecognitionInstance = null;
        }

        const recordBtn = document.getElementById('btnVoiceRecordPress');
        if (recordBtn) {
            recordBtn.style.background = '#ffffff';
            recordBtn.removeAttribute('data-recording');
        }

        let audioBase64Data = '';
        let recordedAudioBlob = null;

        if (_mediaRecorderInstance) {
            try {
                const mr = _mediaRecorderInstance;
                const recordWaitPromise = new Promise((resolve) => {
                    mr.onstop = () => {
                        const mime = mr.mimeType || 'audio/webm';
                        if (_audioRecordedChunks.length > 0) {
                            recordedAudioBlob = new Blob(_audioRecordedChunks, { type: mime });
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result || '');
                            reader.onerror = () => resolve('');
                            reader.readAsDataURL(recordedAudioBlob);
                        } else {
                            resolve('');
                        }
                    };
                    setTimeout(() => resolve(''), 1500);
                });

                if (mr.state !== 'inactive') {
                    mr.stop();
                }

                audioBase64Data = await recordWaitPromise;
            } catch (err) {
                console.error('[VoiceRecord] 音频收集失败:', err);
            }
            _mediaRecorderInstance = null;
            _audioRecordedChunks = [];
        }

        if (_activeRecordStream) {
            try {
                _activeRecordStream.getTracks().forEach(t => t.stop());
            } catch (_) {}
            _activeRecordStream = null;
        }

        if (durationSeconds <= 1 && (!audioBase64Data || audioBase64Data.length < 800)) {
            hideVoiceRecordingHUD();
            if (typeof showToast === 'function') showToast('说话时间太短或未收录到声音', 'info', 1500);
            return;
        }

        setVoiceHudTranscribing('正在本地离线转文字...');

        let finalText = _recognizedVoiceText ? _recognizedVoiceText.trim() : '';

        // 🌟 核心排查与全透视调用诊断
        if (window.mcytAsr && recordedAudioBlob) {
            try {
                const activeModel = await window.mcytAsr.getActiveModelMeta();
                if (!activeModel) {
                    // 🌟 抓到了！如果数据库里没有模型，直接给用户弹窗提醒！
                    console.warn('[VoiceRecord] 未找到已激活的本地 ASR 模型');
                    if (typeof showToast === 'function') {
                        showToast('未检测到离线模型，请在【系统设置】中导入', 'info', 2500);
                    }
                } else {
                    setVoiceHudTranscribing(`正在调用模型: ${activeModel.name || 'Whisper'}...`);
                    const asrResult = await window.mcytAsr.transcribe(recordedAudioBlob);
                    console.log('[VoiceRecord] 离线 ASR 识别结果:', asrResult);
                    if (asrResult && asrResult.trim()) {
                        finalText = asrResult.trim();
                    } else if (!finalText) {
                        if (typeof showToast === 'function') {
                            showToast('未检出清晰字词，已保留原声语音', 'info', 1800);
                        }
                    }
                }
            } catch (asrErr) {
                console.error('[VoiceRecord] 本地 ASR 离线转写异常:', asrErr);
                if (typeof showToast === 'function') {
                    showToast('ASR 推理异常: ' + (asrErr.message || '运行中断'), 'info', 3000);
                }
            }
        }

        hideVoiceRecordingHUD();

        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        const newMsg = {
            _id: 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 899 + 100),
            from: 'player',
            type: 'voice',
            seconds: durationSeconds,
            text: finalText || '（发送了一条语音）',
            audioData: audioBase64Data || '',
            time: new Date().toLocaleTimeString().slice(0, 5),
            timestamp: Date.now()
        };

        if (typeof window.pushChatMessageSafe === 'function') {
            window.pushChatMessageSafe(npcId, newMsg, curAcc.id);
        } else {
            const hist = window.getAccountChatHistory(npcId, curAcc.id);
            hist.push(newMsg);
        }

        if (typeof window.syncChatHistoryToLocalBackup === 'function') window.syncChatHistoryToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();

        window.renderSingleChatWindow();
    };

    // 微信原生质感内嵌网页安全浏览器浮层
    window.openWebPageLink = function(url, pageTitle = '网页浏览') {
        if (!url || url === '#' || !url.startsWith('http')) {
            if (typeof showToast === 'function') showToast('无法打开非 HTTP 网页链接', 'info', 1500);
            return;
        }

        document.getElementById('wechatInAppBrowserModal')?.remove();

        const browserModal = document.createElement('div');
        browserModal.id = 'wechatInAppBrowserModal';
        browserModal.style.cssText = `
            position: fixed; inset: 0; z-index: 100000;
            background: #ffffff; display: flex; flex-direction: column;
            animation: wechatBrowserSlideUp 0.22s cubic-bezier(0.1, 0.9, 0.2, 1);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        browserModal.innerHTML = `
            <style>
                @keyframes wechatBrowserSlideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            </style>
            <div style="height: 48px; background: #f7f7f7; border-bottom: 0.5px solid #dcdcdc; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; flex-shrink: 0; user-select: none;">
                <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                    <button type="button" id="closeWechatBrowserBtn" style="border: none; background: none; font-size: 18px; color: #181818; cursor: pointer; padding: 4px 8px; display: flex; align-items: center; justify-content: center; line-height: 1;">✕</button>
                    <div style="display: flex; flex-direction: column; min-width: 0;">
                        <span id="wechatBrowserTitle" style="font-size: 13.5px; font-weight: 600; color: #181818; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 210px;">${escapeHtml(pageTitle)}</span>
                        <span style="font-size: 9.5px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 210px;">${escapeHtml(url)}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                    <button type="button" id="refreshWechatBrowserBtn" title="刷新" style="border: none; background: none; width: 30px; height: 30px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #555;">
                        <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    </button>
                    <button type="button" id="openExternalBrowserBtn" title="外部浏览器打开" style="border: none; background: none; width: 30px; height: 30px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #07c160;">
                        <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </button>
                </div>
            </div>

            <div id="browserProgressBar" style="height: 2px; width: 0%; background: #07c160; transition: width 0.3s ease; flex-shrink: 0;"></div>

            <div style="flex: 1; position: relative; width: 100%; height: 100%; overflow: hidden; background: #f2f2f2;">
                <iframe id="wechatBrowserIframe" src="${escapeHtml(url)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" style="width: 100%; height: 100%; border: none; background: #ffffff;"></iframe>
                
                <div id="browserCspTip" style="position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.72); backdrop-filter: blur(4px); color: #fff; padding: 6px 14px; border-radius: 18px; font-size: 11px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); pointer-events: auto; white-space: nowrap;">
                    <span>部分页面若受限无法完全展示</span>
                    <span id="fallbackOpenLinkBtn" style="color: #6ee7b7; font-weight: 600; cursor: pointer; text-decoration: underline;">唤起系统应用打开 ›</span>
                </div>
            </div>
        `;

        document.body.appendChild(browserModal);

        const iframe = browserModal.querySelector('#wechatBrowserIframe');
        const progressBar = browserModal.querySelector('#browserProgressBar');

        if (progressBar) {
            progressBar.style.width = '30%';
            setTimeout(() => { if (progressBar) progressBar.style.width = '75%'; }, 400);
        }

        if (iframe) {
            iframe.onload = () => {
                if (progressBar) {
                    progressBar.style.width = '100%';
                    setTimeout(() => { if (progressBar) progressBar.style.opacity = '0'; }, 300);
                }
            };
        }

        browserModal.querySelector('#closeWechatBrowserBtn')?.addEventListener('click', () => {
            browserModal.style.transform = 'translateY(100%)';
            browserModal.style.transition = 'transform 0.18s cubic-bezier(0.4, 0, 1, 1)';
            setTimeout(() => browserModal.remove(), 190);
        });

        browserModal.querySelector('#refreshWechatBrowserBtn')?.addEventListener('click', () => {
            if (iframe) {
                if (progressBar) {
                    progressBar.style.opacity = '1';
                    progressBar.style.width = '40%';
                }
                iframe.src = url;
            }
        });

        const triggerExternal = () => {
            try {
                const a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                a.remove();
            } catch (_) {
                window.location.href = url;
            }
        };

        browserModal.querySelector('#openExternalBrowserBtn')?.addEventListener('click', triggerExternal);
        browserModal.querySelector('#fallbackOpenLinkBtn')?.addEventListener('click', triggerExternal);
    };

    // ============================================================
    // 💬 单人私聊窗口渲染
    // ============================================================
    window.renderSingleChatWindow = function renderSingleChatWindow(container, renderOpts = {}) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const _reopenNpcId = window.G && window.G.currentChatNpc;
        if (typeof window.loadStoredDecorFramesAsync === 'function' && !window._mcytDecorFramesReady) {
            window.loadStoredDecorFramesAsync().then(() => {
                window._mcytDecorFramesReady = true;
                if (window.G && window.G.currentChatNpc === _reopenNpcId && document.body.contains(container)) {
                    renderSingleChatWindow(container, renderOpts);
                }
            });
        }
        if (typeof window.loadStoredDecorBubblesAsync === 'function' && !window._mcytDecorBubblesReady) {
            window.loadStoredDecorBubblesAsync().then(() => {
                window._mcytDecorBubblesReady = true;
                if (window.G && window.G.currentChatNpc === _reopenNpcId && document.body.contains(container)) {
                    renderSingleChatWindow(container, renderOpts);
                }
            });
        }

        if (window.ChatTarot && typeof window.ChatTarot.drainPendingTarotShares === 'function') {
            window.ChatTarot.drainPendingTarotShares();
        }

        const legacyWrap = document.querySelector('#socialTab .phone-app-wrap');
        if (legacyWrap) legacyWrap.remove();

        const npcId = window.G.currentChatNpc;
        const npc = window.G.npcs ? window.G.npcs[npcId] : null;
        if (!npc) { window.closeChat(); return; }

        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', region: '中国' };
        const isBlocked = (typeof window.isAccountBlockedByNpc === 'function') ? window.isAccountBlockedByNpc(npcId, curAcc.id) : false;
        const chatHist = window.getAccountChatHistory(npcId, curAcc.id) || [];
        const isBehindActive = !!(window.G._behindScreenActive && window.G._behindScreenActive[npcId]);

        const tokensCount = (typeof window.calculateHistoryTokens === 'function') ? window.calculateHistoryTokens(chatHist) : 0;
        const tokenDisplay = (typeof window.formatTokenString === 'function') ? window.formatTokenString(tokensCount) : '0';
        const isGenerating = !!(window._MCYT_CHAT_GENERATING && window._MCYT_CHAT_GENERATING[npcId]);

        const topHeaderTitle = (npc.remark && npc.remark.trim()) ? `${npc.remark.trim()} (${npc.name})` : (npc.name || npc.id);

        const globalShape = localStorage.getItem('mcyt_active_avatar_shape') || 'circle';
        const globalBubbleId = localStorage.getItem('mcyt_active_decor_bubble') || 'bubble_default';
        const globalFrameId = localStorage.getItem('mcyt_active_decor_frame') || 'frame_none';

        const decor = (npc.chatSettings && npc.chatSettings.decor) || {};
        const npcShape = decor.avatarShape || globalShape;
        const npcBubbleId = decor.bubbleId || globalBubbleId;
        const userBubbleId = globalBubbleId;

        const framesList = getAvailableFramesList();

        const targetFrameId = decor.frameId !== undefined && decor.frameId !== null ? decor.frameId : globalFrameId;
        const targetFrameObj = (targetFrameId && targetFrameId !== 'frame_none') 
            ? (framesList.find(f => f.id === targetFrameId) || null) 
            : null;
        const userFrameObj = (globalFrameId && globalFrameId !== 'frame_none') 
            ? (framesList.find(f => f.id === globalFrameId) || null) 
            : null;

        const npcAvatarUrl = npc.avatarUrl || npc.avatar || 'assets/icons/chat.png';
        const userAvatarUrl = (typeof window.getPlayerAvatarSafe === 'function') 
            ? window.getPlayerAvatarSafe() 
            : ((typeof getPlayerAvatar === 'function' ? getPlayerAvatar() : null) || 'assets/icons/chat.png');

        const collapseCfg = (typeof getChatCollapseConfig === 'function') ? getChatCollapseConfig() : { enabled: true, limit: 50 };
        const chatKey = `single_${npcId}_${curAcc.id}`;
        const isExpanded = !!(window._chatExpandAllMap && window._chatExpandAllMap[chatKey]);

        let visibleMessages = chatHist;
        let collapseBannerHtml = '';

        if (collapseCfg && collapseCfg.enabled && chatHist.length > collapseCfg.limit) {
            if (!isExpanded) {
                const hiddenCount = chatHist.length - collapseCfg.limit;
                visibleMessages = chatHist.slice(-collapseCfg.limit);
                collapseBannerHtml = `
                    <div style="text-align:center;margin:12px 0 16px;">
                        <span onclick="window.toggleChatHistoryExpand('${chatKey}')" style="display:inline-flex;align-items:center;gap:5px;background:#ffffff;color:#555555;padding:5px 14px;border-radius:16px;font-size:11.5px;cursor:pointer;user-select:none;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:0.5px solid #e0e0e0;">
                            <svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:none;stroke:#07c160;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            <span>已折叠更早的 ${hiddenCount} 条消息 · 点击展开</span>
                        </span>
                    </div>
                `;
            } else {
                collapseBannerHtml = `
                    <div style="text-align:center;margin:10px 0 14px;">
                        <span onclick="window.toggleChatHistoryExpand('${chatKey}')" style="display:inline-flex;align-items:center;gap:5px;background:#ffffff;color:#888888;padding:4px 12px;border-radius:14px;font-size:11px;cursor:pointer;user-select:none;box-shadow:0 1px 2px rgba(0,0,0,0.04);border:0.5px solid #e8e8e8;">
                            <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:#888888;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;"><polyline points="18 15 12 9 6 15"></polyline></svg>
                            <span>收起早期折叠消息</span>
                        </span>
                    </div>
                `;
            }
        }

        let messagesHtml = collapseBannerHtml;
        for (const msg of visibleMessages) {
            const isSelf = (msg.from === 'player');
            const currentBubbleId = isSelf ? userBubbleId : npcBubbleId;

            const currentAvatarHtml = isSelf
                ? renderDecorAvatarHtml(userAvatarUrl, globalShape, userFrameObj, 38)
                : renderDecorAvatarHtml(npcAvatarUrl, npcShape, targetFrameObj, 38);

            let quoteHtml = '';
            if (msg.quote) {
                quoteHtml = `
                <div class="wechat-quote-inline">
                    <span style="font-weight:600;">${escapeHtml(msg.quote.author || '好友')}:</span> ${escapeHtml(msg.quote.text || '')}
                </div>`;
            }

            if (msg.from === 'action') {
                messagesHtml += `
                <div style="text-align:center;margin:8px 0;">
                    <span style="display:inline-block;background:rgba(0,0,0,0.05);color:#888;padding:3px 10px;border-radius:4px;font-size:11.5px;max-width:85%;">${escapeHtml(msg.text || '')}</span>
                </div>`;
            } else if (msg.type === 'moment_notice') {
                messagesHtml += `
                <div style="text-align:center;margin:10px 0;">
                    <div class="wechat-sys-notice-pill" onclick="window.openMomentArtCardPreview(${msg.momentId})">
                        <span>${escapeHtml(msg.author || '对方')} 发表了一条朋友圈动态</span>
                        <span class="link">查看 ›</span>
                    </div>
                </div>`;
            } else if (msg.type === 'shared_tarot') {
                const tarotCardHtml = (window.ChatTarot && typeof window.ChatTarot.renderSharedTarotCardHTML === 'function')
                    ? window.ChatTarot.renderSharedTarotCardHTML(msg, npcId, false)
                    : `<div style="background:#fff;padding:8px 12px;border-radius:6px;font-size:12px;color:#666;">[塔罗牌阵: ${escapeHtml(msg.sharedTarot?.spreadName || '占卜')}]</div>`;

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:76%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        ${tarotCardHtml}
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else if (msg.type === 'ui_card') {
                const cardTypeLabel = msg.cardType || '生活便签';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:78%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <div class="wechat-ui-card-container" style="background:#ffffff;border:0.5px solid #e0e0e0;border-radius:8px;padding:12px 14px;box-shadow:0 2px 8px rgba(0,0,0,0.06);width:fit-content;max-width:270px;box-sizing:border-box;cursor:pointer;">
                            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:0.5px dashed #e5e5e5;padding-bottom:6px;margin-bottom:8px;font-size:11px;color:#888;">
                                <div style="display:flex;align-items:center;gap:4px;">
                                    <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:#07c160;stroke-width:2;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                    <span style="font-weight:600;color:#333;">${escapeHtml(cardTypeLabel)}</span>
                                </div>
                                <span style="font-size:10px;color:#aaa;">仿真物品</span>
                            </div>
                            <div class="wechat-ui-card-body" style="font-size:13px;line-height:1.45;color:#1f2937;">
                                ${msg.cardHtml || escapeHtml(msg.text || '')}
                            </div>
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:3px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else if (msg.type === 'web_page') {
                const wp = msg.webPage || {};
                const pageUrl = wp.url || '#';
                const pageTitle = wp.title || '权威检索结果';
                const pageSnippet = wp.snippet || '';
                const pageSource = wp.source || '全网检索';

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:76%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <div class="wechat-web-card" onclick="window.openWebPageLink('${escapeHtml(pageUrl)}', '${escapeHtml(pageTitle)}')" style="background:#ffffff;border:0.5px solid #e2e8f0;border-radius:8px;padding:10px 12px;box-shadow:0 1px 4px rgba(0,0,0,0.06);cursor:pointer;width:240px;box-sizing:border-box;">
                            <div style="font-size:13.5px;font-weight:600;color:#181818;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;margin-bottom:5px;">
                                ${escapeHtml(pageTitle)}
                            </div>
                            ${pageSnippet ? `
                            <div style="font-size:11.5px;color:#666;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;text-overflow:ellipsis;margin-bottom:8px;">
                                ${escapeHtml(pageSnippet)}
                            </div>` : ''}
                            <div style="display:flex;align-items:center;justify-content:space-between;border-top:0.5px solid #f0f0f0;padding-top:6px;font-size:11px;color:#888;">
                                <div style="display:flex;align-items:center;gap:4px;min-width:0;flex:1;">
                                    <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:#07c160;stroke-width:2;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>
                                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(pageSource)}</span>
                                </div>
                                <span style="color:#07c160;font-weight:600;margin-left:8px;flex-shrink:0;">打开 ›</span>
                            </div>
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else if (msg.type === 'contact_card') {
                const card = msg.contactCard || {};
                const sigShow = card.signature ? `<div style="font-size:11px;color:#07c160;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">“${escapeHtml(card.signature)}”</div>` : '';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <div class="wechat-contact-card" onclick="if(typeof window.openContactCardDetailModal==='function')window.openContactCardDetailModal('${escapeHtml(card.id || '')}', '${escapeHtml(card.name || '')}', '${escapeHtml(card.persona || '')}', '${escapeHtml(card.avatar || '')}', '${escapeHtml(card.signature || '')}')">
                            <div style="font-size:11px;color:#888;margin-bottom:6px;border-bottom:0.5px solid #f0f0f0;padding-bottom:4px;">个人名片</div>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="width:42px;height:42px;border-radius:6px;overflow:hidden;background:#eee;flex-shrink:0;">
                                    <img src="${card.avatar || 'assets/icons/chat.png'}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='assets/icons/chat.png';">
                                </div>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:14px;font-weight:600;color:#181818;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(card.name || '好友')}</div>
                                    ${sigShow}
                                    <div style="font-size:11.5px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${escapeHtml(card.persona || 'MC同伴')}</div>
                                </div>
                            </div>
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else if (msg.type === 'shared_moment') {
                const moment = msg.sharedMoment || {};
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <div class="wechat-share-moment-card" onclick="window.openMomentArtCardPreview(${moment.id})">
                            <div style="font-size:11px;color:#888;margin-bottom:5px;display:flex;justify-content:space-between;">
                                <span>朋友圈分享</span>
                                <span style="color:#07c160;">查看详情 ›</span>
                            </div>
                            <div style="display:flex;gap:8px;align-items:center;">
                                <div style="width:38px;height:38px;border-radius:4px;overflow:hidden;background:#eee;flex-shrink:0;">
                                    <img src="${moment.avatar || 'assets/icons/chat.png'}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='assets/icons/chat.png';">
                                </div>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:12px;font-weight:600;color:#576b95;">${escapeHtml(moment.author || '好友')}</div>
                                    <div style="font-size:12.5px;color:#222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;">${escapeHtml(moment.body || '')}</div>
                                </div>
                            </div>
                            ${moment.imageDesc ? `<div style="font-size:11px;color:#666;margin-top:5px;background:#f9f9f9;padding:3px 6px;border-radius:3px;">[快照] ${escapeHtml(moment.imageDesc)}</div>` : ''}
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else if (msg.from === 'behind_screen') {
                messagesHtml += `
                <div style="margin:8px 12px;background:#ffffff;border:1px dashed #dcdcdc;padding:8px 12px;border-radius:6px;font-size:12px;color:#555;line-height:1.5;">
                    <span style="font-weight:600;color:#181818;">动作感知：</span>${escapeHtml(msg.text || '')}
                </div>`;
            } else if (msg.type === 'voice') {
                const seconds = Math.min(60, Math.max(1, parseInt(msg.seconds) || 3));
                const voiceBarMinWidth = Math.min(180, Math.max(82, 64 + seconds * 4));

                const voiceBarInnerHtml = `
                    <div style="display:flex;align-items:center;justify-content:${isSelf ? 'flex-end' : 'flex-start'};gap:8px;user-select:none;min-height:24px;width:100%;">
                        <div onclick="window.playVoiceMessageDirect('${msg._id}')" title="播放/暂停语音" style="display:flex;align-items:center;gap:6px;cursor:pointer;flex-shrink:0;">
                            ${!isSelf ? `
                                <div id="voiceWaveIcon_${msg._id}" class="wechat-voice-wave" style="color:inherit;opacity:0.9;display:flex;align-items:center;gap:2.5px;">
                                    <div class="wechat-voice-bar" style="background:currentColor;"></div>
                                    <div class="wechat-voice-bar" style="background:currentColor;"></div>
                                    <div class="wechat-voice-bar" style="background:currentColor;"></div>
                                </div>
                                <span style="font-size:13.5px;font-weight:600;color:inherit;margin-left:2px;letter-spacing:0.5px;">${seconds}"</span>
                            ` : `
                                <span style="font-size:13.5px;font-weight:600;color:inherit;margin-right:2px;letter-spacing:0.5px;">${seconds}"</span>
                                <div id="voiceWaveIcon_${msg._id}" class="wechat-voice-wave" style="color:inherit;opacity:0.9;transform:scaleX(-1);display:flex;align-items:center;gap:2.5px;">
                                    <div class="wechat-voice-bar" style="background:currentColor;"></div>
                                    <div class="wechat-voice-bar" style="background:currentColor;"></div>
                                    <div class="wechat-voice-bar" style="background:currentColor;"></div>
                                </div>
                            `}
                        </div>

                        <div onclick="window.toggleVoiceMessageDetailsDirect('${msg._id}')" title="展开/收起文字与环境音" style="flex:1;display:flex;align-items:center;justify-content:${isSelf ? 'flex-start' : 'flex-end'};cursor:pointer;min-width:24px;padding:2px 0;">
                            <span id="voiceToggleTag_${msg._id}" style="opacity:0.65;font-size:10.5px;border-radius:3px;border:0.5px solid currentColor;padding:1px 4px;line-height:1.1;pointer-events:none;">
                                ${msg.originalText ? '译' : '文'}
                            </span>
                        </div>
                    </div>
                `;

                const hasBilingual = !!(msg.originalText && msg.originalText !== msg.text);
                const voiceDetailHtml = `
                    <div id="voiceDescBox_${msg._id}" style="display:none;margin-top:6px;padding-top:6px;border-top:0.5px dashed currentColor;opacity:0.94;font-size:12.5px;line-height:1.45;color:inherit;word-break:break-word;">
                        ${msg.audioBg ? `<div style="font-size:11px;opacity:0.75;margin-bottom:4px;font-style:italic;">🎧 ${escapeHtml(msg.audioBg)}</div>` : ''}
                        
                        ${hasBilingual ? `
                            <div style="margin-bottom:3px;"><span style="font-weight:600;opacity:0.85;">母语原声: </span>${escapeHtml(msg.originalText)}</div>
                            <div><span style="font-weight:600;opacity:0.85;">中文翻译: </span>${escapeHtml(msg.text || '')}</div>
                        ` : `
                            <div><span style="font-weight:600;opacity:0.85;">转文字: </span>${escapeHtml(msg.text || '')}</div>
                        `}
                    </div>
                `;

                const voiceContainerHtml = `
                    <div class="wechat-voice-bubble-wrapper" style="min-width:${voiceBarMinWidth}px;max-width:100%;color:inherit;">
                        ${voiceBarInnerHtml}
                        ${voiceDetailHtml}
                    </div>
                `;

                const renderedBubbleHtml = renderSafeBubbleHtml(voiceContainerHtml, isSelf, currentBubbleId, 'voice-bubble-cell');

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:76%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        ${renderedBubbleHtml}
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else if (msg.type === 'image' || msg.type === 'image_flip' || msg.type === 'image_text_only' || msg.imageUrl || msg.imageDesc) {
                const imageBubbleHtml = (typeof window.renderWechatPureImageBubbleHTML === 'function')
                    ? window.renderWechatPureImageBubbleHTML(msg)
                    : `<div style="padding:10px 14px;background:#fff;border-radius:8px;font-size:13px;color:#222;">“${escapeHtml(msg.imageDesc || msg.text || '图片')}”</div>`;

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:72%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        ${imageBubbleHtml}
                        <div style="font-size:10px;color:#bbb;margin-top:3px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else if (msg.type === 'sticker' || msg.stickerUrl) {
                const sUrl = msg.stickerUrl || 'assets/icons/chat.png';
                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:56%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        <img class="chat-bubble ${isSelf ? 'self-bubble' : ''}" data-msgid="${msg._id || ''}" src="${escapeHtml(sUrl)}" alt="${escapeHtml(msg.stickerDesc || '表情')}" style="width:100px;height:100px;object-fit:contain;border-radius:6px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.05);cursor:pointer;">
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            } else {
                const hasOriginal = !!msg.originalText;
                const displayMainText = hasOriginal ? msg.originalText : msg.text;
                let bubbleBody = isSelf ? escapeHtml(displayMainText || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(displayMainText || '') : escapeHtml(displayMainText || ''));

                const transPartHtml = hasOriginal ? `
                    <div id="transBox_${msg._id}" style="display:none;margin-top:6px;padding-top:6px;border-top:0.5px dashed currentColor;opacity:0.92;font-size:13px;line-height:1.45;color:inherit;">
                        <div style="font-size:10px;opacity:0.65;margin-bottom:3px;display:flex;align-items:center;gap:3px;color:inherit;">
                            <svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M5 8l6 6M11 8L5 14M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/></svg>
                            <span>微信翻译</span>
                        </div>
                        <div style="color:inherit;word-break:break-word;">${escapeHtml(msg.text || '')}</div>
                    </div>
                ` : '';

                const bubbleInnerHtml = `<div>${bubbleBody}</div>${transPartHtml}`;
                const renderedBubbleHtml = renderSafeBubbleHtml(bubbleInnerHtml, isSelf, currentBubbleId);

                messagesHtml += `
                <div class="chat-msg-row" data-msgid="${msg._id || ''}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                    <div style="max-width:78%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        ${quoteHtml}
                        ${renderedBubbleHtml}

                        <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
                            ${hasOriginal ? `
                            <span id="transBtn_${msg._id}" onclick="window.toggleMessageTranslationDirect(this, '${msg._id}')" style="font-size:10.5px;color:#07c160;cursor:pointer;user-select:none;">
                                翻译
                            </span>
                            ` : ''}
                            <span style="font-size:10px;color:#bbb;">${msg.time || ''}</span>
                        </div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${currentAvatarHtml}</div>` : ''}
                </div>`;
            }
        }

        const stickerDrawerHtml = window._stickerDrawerOpen ? window.buildChatStickerDrawerHTML('single', npcId) : '';
        const settingsDrawerHtml = window._settingsDrawerOpen ? window.buildChatSettingsDrawerHTML('single', npcId) : '';
        const plusDrawerHtml = window._plusDrawerOpen ? window.buildChatPlusDrawerHTML('single', npcId) : '';

        let quotePreviewHtml = '';
        if (window._activeQuoteMessage) {
            quotePreviewHtml = `
            <div class="wechat-quote-bar">
                <div style="overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding-right:8px;">
                    引用 <b>${escapeHtml(window._activeQuoteMessage.author || '好友')}</b>: ${escapeHtml(window._activeQuoteMessage.text || '')}
                </div>
                <button type="button" onclick="window.cancelMessageQuote('single','${npcId}')" style="border:none;background:none;color:#999;font-size:14px;cursor:pointer;padding:0 4px;">✕</button>
            </div>`;
        }

        let topHeaderDisplayHtml = escapeHtml(topHeaderTitle);
        if (isGenerating) {
            topHeaderDisplayHtml = `<span style="color:#07c160;font-size:14px;">对方正在输入中...</span>`;
        }

        const isVoiceMode = (window._chatInputMode === 'voice');

        const inputCenterHtml = isVoiceMode ? `
            <div id="btnVoiceRecordPress" style="flex:1;height:36px;border-radius:6px;background:#ffffff;box-shadow:inset 0 0 0 0.5px #dcdcdc;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;">
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:#07c160;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;margin-right:6px;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                <span id="voiceRecordTipText" style="font-size:13.5px;font-weight:600;color:#333;">按住 说话</span>
            </div>
        ` : `
            <textarea id="singleChatInput" rows="1" placeholder="发消息..." style="flex:1;padding:8px 12px;border-radius:6px;border:none;background:#ffffff;font-size:14px;resize:none;outline:none;font-family:inherit;box-shadow:inset 0 0 0 0.5px #dcdcdc;box-sizing:border-box;max-height:80px;"></textarea>
        `;

        const voiceMenuPopoverHtml = window._voiceActionMenuOpen ? `
            <div id="wechatVoiceActionPopover" style="position:absolute;bottom:42px;left:0;z-index:999;background:#ffffff;border-radius:8px;box-shadow:0 4px 18px rgba(0,0,0,0.12);border:0.5px solid #e0e0e0;padding:6px;display:flex;align-items:center;gap:6px;animation:wechatPopIn 0.15s cubic-bezier(0.1, 0.9, 0.2, 1);">
                <style>
                    @keyframes wechatPopIn {
                        from { opacity:0; transform: translateY(8px) scale(0.95); }
                        to { opacity:1; transform: translateY(0) scale(1); }
                    }
                </style>
                <button type="button" onclick="window.switchChatVoiceMode('voice','${npcId}')" title="直接对讲发送语音条" style="border:none;background:${isVoiceMode ? '#e8f8ee' : '#f7f7f7'};color:${isVoiceMode ? '#07c160' : '#444'};width:38px;height:38px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                </button>

                <button type="button" onclick="window._voiceActionMenuOpen=false;window.openVoiceInputModal('single','${npcId}')" title="语音换算输入" style="border:none;background:#f7f7f7;color:#444;width:38px;height:38px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                </button>

                <button type="button" onclick="window.switchChatVoiceMode('text','${npcId}')" title="文字键盘打字" style="border:none;background:${!isVoiceMode ? '#e8f8ee' : '#f7f7f7'};color:${!isVoiceMode ? '#07c160' : '#444'};width:38px;height:38px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;">
                        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                        <line x1="6" y1="8" x2="6" y2="8"></line>
                        <line x1="10" y1="8" x2="10" y2="8"></line>
                        <line x1="14" y1="8" x2="14" y2="8"></line>
                        <line x1="18" y1="8" x2="18" y2="8"></line>
                        <line x1="7" y1="16" x2="17" y2="16"></line>
                    </svg>
                </button>
            </div>
        ` : '';

        const html = `
        <div style="background:#ededed;display:flex;flex-direction:column;height:100%;min-height:100%;overflow:hidden;font-family:-apple-system,sans-serif;">
            <div class="wechat-top-header">
                <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
                    <button onclick="window.closeChat()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:2px;font-weight:500;">
                        <span>‹</span> <span>微信</span>
                    </button>
                    <div onclick="if(typeof window.openNpcProfileCardModal==='function')window.openNpcProfileCardModal('${npcId}')" style="cursor:pointer;font-weight:600;font-size:15px;color:#181818;margin-left:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${topHeaderDisplayHtml}
                    </div>
                    <span style="background:#e0e0e0;color:#666;font-size:10px;padding:1px 5px;border-radius:3px;margin-left:4px;font-weight:normal;white-space:nowrap;">
                        ${tokenDisplay}t
                    </span>
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                    <button onclick="window.toggleBehindScreen('${npcId}')" style="border:0.5px solid ${isBehindActive ? '#07c160' : '#ccc'};background:${isBehindActive ? '#d4f5dd' : '#fff'};color:${isBehindActive ? '#07c160' : '#555'};width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="动作感知">
                        <svg viewBox="0 0 24 24" style="width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    
                    <button id="btnChatLightningTrigger" onclick="window.triggerAIReplyForSingle('${npcId}')" style="border:none;background:#07c160;color:#fff;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="让对方继续说话">
                        ${isGenerating ? `<div class="wechat-spin-ring"></div>` : `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`}
                    </button>
                </div>
            </div>

            ${isBlocked ? `
            <div style="background:#fff2f0;color:#fa5151;padding:6px 12px;font-size:11.5px;border-bottom:0.5px solid #ffccc7;flex-shrink:0;">
                <span>⚠️ 当前账号消息已被对方拒收</span>
            </div>` : ''}

            <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">打个招呼开启畅聊吧！</div>'}
            </div>

            ${quotePreviewHtml}
            ${stickerDrawerHtml}
            ${settingsDrawerHtml}
            ${plusDrawerHtml}

            <div style="background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;flex-direction:column;padding:6px 10px 8px;flex-shrink:0;gap:6px;">
                <div style="display:flex;align-items:center;gap:6px;">
                    ${inputCenterHtml}
                    
                    <button id="btnSingleRegenerateReply" onclick="window.confirmRetryLastAIReply('${npcId}')" title="重新生成上一条回复" style="border:0.5px solid #dcdcdc;background:#ffffff;color:#444;width:34px;height:34px;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;-webkit-tap-highlight-color:transparent;">
                        <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                    </button>

                    ${!isVoiceMode ? `
                    <button onclick="window.doSendSingleChat('${npcId}')" style="border:none;background:#07c160;color:#fff;padding:7px 14px;border-radius:5px;font-size:13.5px;font-weight:600;cursor:pointer;flex-shrink:0;">发送</button>
                    ` : ''}
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px;">
                    <div style="display:flex;align-items:center;gap:18px;">
                        <div style="position:relative;display:inline-flex;align-items:center;">
                            <button type="button" onclick="window.toggleVoiceActionMenu('single','${npcId}')" title="语音模式选择" style="border:none;background:none;cursor:pointer;padding:0;display:flex;align-items:center;color:${isVoiceMode ? '#07c160' : '#555'};">
                                <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                            </button>
                            ${voiceMenuPopoverHtml}
                        </div>

                        <button onclick="window.toggleChatSettingsDrawer('single','${npcId}')" title="系统设置与排版" style="border:none;background:none;cursor:pointer;padding:0;display:flex;align-items:center;color:#555;">
                            <svg viewBox="0 0 24 24" style="width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;">
                                <circle cx="12" cy="3" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                        </button>

                        <button onclick="window.toggleChatStickerDrawer('single','${npcId}')" title="表情" style="border:none;background:none;cursor:pointer;padding:0;display:flex;align-items:center;color:#555;">
                            <svg viewBox="0 0 24 24" style="width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;">
                                <circle cx="12" cy="12" r="9.5"></circle>
                                <path d="M8 14.5c1 1.5 2.5 2.2 4 2.2s3-0.7 4-2.2"></path>
                                <circle cx="9" cy="9.5" r="1.2" fill="#555" stroke="none"></circle>
                                <circle cx="15" cy="9.5" r="1.2" fill="#555" stroke="none"></circle>
                            </svg>
                        </button>
                    </div>

                    <div>
                        <button onclick="window.toggleChatPlusDrawer('single','${npcId}')" title="聊天互动与扩展" style="border:none;background:none;cursor:pointer;padding:0;display:flex;align-items:center;color:#555;">
                            <svg viewBox="0 0 24 24" style="width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;">
                                <circle cx="12" cy="12" r="9.5"></circle>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
        container.innerHTML = html;

        const msgArea = document.getElementById('chatMessageArea');
        if (msgArea && !renderOpts.keepScroll) {
            setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 50);
        }

        container.querySelectorAll('.chat-msg-row[data-msgid]').forEach(row => {
            const mid = row.dataset.msgid;
            if (!mid) return;
            if (typeof bindLongPressEvent === 'function') {
                bindLongPressEvent(row, null, () => {
                    window.openBubbleActionSheet(mid, 'single', npcId);
                });
            }
        });

        const input = document.getElementById('singleChatInput');
        if (input) {
            input.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    window.doSendSingleChat(npcId);
                }
            };
        }

        const voiceRecordBtn = document.getElementById('btnVoiceRecordPress');
        if (voiceRecordBtn) {
            let isTouchTriggered = false;

            const onRecordStart = async (e) => {
                if (e.type === 'touchstart') {
                    isTouchTriggered = true;
                } else if (e.type === 'mousedown' && isTouchTriggered) {
                    return;
                }
                e.preventDefault();
                const tip = document.getElementById('voiceRecordTipText');
                if (tip) tip.textContent = '松开 发送';
                await window.startRealVoiceRecord(npcId);
            };

            const onRecordEnd = (e) => {
                if (e.type === 'mouseup' && isTouchTriggered) {
                    isTouchTriggered = false;
                    return;
                }
                e.preventDefault();
                const tip = document.getElementById('voiceRecordTipText');
                if (tip) tip.textContent = '按住 说话';
                window.stopRealVoiceRecordAndSend(npcId);
            };

            voiceRecordBtn.addEventListener('mousedown', onRecordStart);
            voiceRecordBtn.addEventListener('mouseup', onRecordEnd);
            voiceRecordBtn.addEventListener('touchstart', onRecordStart, { passive: false });
            voiceRecordBtn.addEventListener('touchend', onRecordEnd, { passive: false });
        }
    };

    window.confirmRetryLastAIReply = function(npcId) {
        if (window._MCYT_CHAT_GENERATING && window._MCYT_CHAT_GENERATING[npcId]) {
            if (typeof showToast === 'function') showToast('对方正在回复中，请稍候', 'info', 1000);
            return;
        }

        if (typeof window.openWechatCleanModal === 'function') {
            window.openWechatCleanModal('重新生成', `
                <div style="text-align:center;padding:10px 0;font-size:13.5px;color:#333;">
                    确定要让对方重新生成上一条回复吗？
                </div>
            `, () => {
                window.doRetryLastAIReply(npcId);
            });
        }
    };

    window.doRetryLastAIReply = async function(npcId) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        const hist = window.getAccountChatHistory(npcId, curAcc.id);

        while (hist.length > 0) {
            const last = hist[hist.length - 1];
            if (last.from === 'player') break;
            hist.pop();
        }

        if (typeof window.syncChatHistoryToLocalBackup === 'function') {
            await window.syncChatHistoryToLocalBackup();
        }
        if (typeof autoSaveGame === 'function') autoSaveGame();
        renderSingleChatWindow();

        window.triggerAIReplyForSingle(npcId);
    };

})();
