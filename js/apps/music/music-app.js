/**
 * js/apps/music/music-app.js
 * 🎵 独立微音音乐中枢 (WeMusic)
 * 职责：
 * 1. 纯正微信白灰微绿与极简线条原生视觉，彻底告别拼凑感。
 * 2. 黑胶唱片随音轨旋转（CSS spin 动效），微绿波形频谱条实时起伏。
 * 3. 完整的音频控制核心（HTML5 Audio），支持播放、暂停、上一曲、下一曲、进度条拖拽。
 * 4. 驱动桌面原生组件（Widget）实时数据同步与联动唤醒。
 * 5. 纯本地安全持久化（当前播放状态、默认精选曲目）。
 */

(function () {
    'use strict';

    // 默认内置演示音轨（免版权纯音乐与氛围流，开箱即用保活）
    const DEFAULT_PLAYLIST = [
        {
            id: 'm_demo_1',
            title: '海风与微光 (Sea Breeze)',
            artist: '主播掌机精选',
            album: '白昼流光',
            url: 'https://music.163.com/song/media/outer/url?id=1413585838.mp3',
            cover: 'assets/system/default_desktop.jpg',
            duration: 198
        },
        {
            id: 'm_demo_2',
            title: '午后雨落 (Afternoon Rain)',
            artist: '主播掌机精选',
            album: '独处时刻',
            url: 'https://music.163.com/song/media/outer/url?id=1384026889.mp3',
            cover: 'assets/system/default_lock.jpg',
            duration: 215
        },
        {
            id: 'm_demo_3',
            title: '星夜低语 (Whisper of Stars)',
            artist: '主播掌机精选',
            album: '深海共鸣',
            url: 'https://music.163.com/song/media/outer/url?id=1824045033.mp3',
            cover: 'tarot/images/slot_bg.png',
            duration: 184
        }
    ];

    class MusicPlayerEngine {
        constructor() {
            this.playlist = DEFAULT_PLAYLIST;
            this.currentIndex = 0;
            this.isPlaying = false;
            this.currentTime = 0;
            this.duration = 0;
            this.audio = new Audio();
            this.audio.preload = 'metadata';
            this.audio.crossOrigin = 'anonymous';

            this._initAudioEvents();
            this._loadSavedState();
        }

        _initAudioEvents() {
            this.audio.addEventListener('timeupdate', () => {
                this.currentTime = this.audio.currentTime;
                this.duration = this.audio.duration || this.currentTrack.duration || 0;
                this._notifyUpdate();
            });

            this.audio.addEventListener('ended', () => {
                this.next();
            });

            this.audio.addEventListener('play', () => {
                this.isPlaying = true;
                this._notifyUpdate();
                this._syncAndroidMediaSession();
            });

            this.audio.addEventListener('pause', () => {
                this.isPlaying = false;
                this._notifyUpdate();
            });

            this.audio.addEventListener('error', (e) => {
                console.warn('[WeMusic Audio Error]:', e);
                this.isPlaying = false;
                this._notifyUpdate();
            });
        }

        get currentTrack() {
            return this.playlist[this.currentIndex] || this.playlist[0];
        }

        _loadSavedState() {
            try {
                const savedIdx = localStorage.getItem('mcyt_wemusic_cur_idx');
                if (savedIdx !== null) {
                    const idx = parseInt(savedIdx, 10);
                    if (idx >= 0 && idx < this.playlist.length) this.currentIndex = idx;
                }
            } catch (_) {}
            this.audio.src = this.currentTrack.url;
        }

        _saveState() {
            try {
                localStorage.setItem('mcyt_wemusic_cur_idx', this.currentIndex.toString());
            } catch (_) {}
        }

        togglePlay() {
            if (this.isPlaying) {
                this.pause();
            } else {
                this.play();
            }
        }

        play(index = null) {
            if (index !== null && index !== this.currentIndex) {
                this.currentIndex = index;
                this.audio.src = this.currentTrack.url;
                this._saveState();
            }
            if (!this.audio.src || this.audio.src === '' || this.audio.src === window.location.href) {
                this.audio.src = this.currentTrack.url;
            }
            const p = this.audio.play();
            if (p && p.catch) {
                p.catch(err => {
                    console.warn('[WeMusic Play Failed]:', err);
                    this.isPlaying = false;
                    this._notifyUpdate();
                });
            }
        }

        pause() {
            this.audio.pause();
            this.isPlaying = false;
            this._notifyUpdate();
        }

        next() {
            this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
            this.audio.src = this.currentTrack.url;
            this._saveState();
            this.play();
        }

        prev() {
            this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
            this.audio.src = this.currentTrack.url;
            this._saveState();
            this.play();
        }

        seek(percent) {
            if (this.duration > 0) {
                this.audio.currentTime = this.duration * percent;
            }
        }

        _syncAndroidMediaSession() {
            if ('mediaSession' in navigator) {
                const track = this.currentTrack;
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: track.title,
                    artist: track.artist,
                    album: track.album || '微音',
                    artwork: [
                        { src: track.cover, sizes: '512x512', type: 'image/png' }
                    ]
                });
                navigator.mediaSession.setActionHandler('play', () => this.play());
                navigator.mediaSession.setActionHandler('pause', () => this.pause());
                navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
                navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
            }
        }

        _notifyUpdate() {
            if (typeof window.syncMusicWidgetState === 'function') {
                window.syncMusicWidgetState(this.getState());
            }
            if (typeof window.syncMusicAppUI === 'function') {
                window.syncMusicAppUI(this.getState());
            }
        }

        getState() {
            return {
                track: this.currentTrack,
                isPlaying: this.isPlaying,
                currentTime: this.currentTime,
                duration: this.duration || this.currentTrack.duration || 0,
                progress: (this.duration > 0) ? (this.currentTime / this.duration) : 0
            };
        }
    }

    window._weMusicEngine = new MusicPlayerEngine();

    // 格式化时间 mm:ss
    function formatTime(sec) {
        if (!sec || isNaN(sec)) return '00:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // ============================================================
    // 🎨 微音 App 纯微信白灰微绿原生主视口
    // ============================================================
    window.renderMusicApp = function (container) {
        if (!container) return;

        const state = window._weMusicEngine.getState();
        const track = state.track;

        container.innerHTML = `
            <div class="wemusic-container" style="
                background: #f7f7f7; height: 100%; display: flex; flex-direction: column;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                box-sizing: border-box; overflow: hidden; color: #222;
                padding-top: calc(var(--status-bar-height, 40px) + 2px);
            ">
                <!-- 顶栏标题与返回 -->
                <div style="height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; background: #ffffff; border-bottom: 0.5px solid #eeeeee;">
                    <div onclick="window.closePhoneApp()" style="display: flex; align-items: center; gap: 4px; font-size: 14px; color: #333; cursor: pointer;">
                        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                        <span>返回</span>
                    </div>
                    <div style="font-size: 15px; font-weight: 600; color: #111;">微音 · 听歌</div>
                    <div style="width: 44px;"></div>
                </div>

                <!-- 核心播放器视口 -->
                <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; align-items: center; padding: 24px 20px; box-sizing: border-box;">
                    
                    <!-- 黑胶唱片主体卡片（参考素材图优雅质感） -->
                    <div style="
                        width: 210px; height: 210px; border-radius: 50%;
                        background: radial-gradient(circle, #2a2a2a 0%, #151515 60%, #050505 100%);
                        box-shadow: 0 8px 24px rgba(0,0,0,0.18), inset 0 0 0 2px rgba(255,255,255,0.08);
                        display: flex; align-items: center; justify-content: center; position: relative; margin-top: 10px;
                    ">
                        <div id="wemusicVinylDisc" class="${state.isPlaying ? 'spin-anim' : ''}" style="
                            width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                            animation: wemusicSpin 14s linear infinite; ${state.isPlaying ? 'animation-play-state: running;' : 'animation-play-state: paused;'}
                        ">
                            <!-- 黑胶唱纹同心圆 -->
                            <div style="position: absolute; width: 175px; height: 175px; border-radius: 50%; border: 0.5px solid rgba(255,255,255,0.06);"></div>
                            <div style="position: absolute; width: 140px; height: 140px; border-radius: 50%; border: 0.5px solid rgba(255,255,255,0.06);"></div>
                            
                            <!-- 唱片中心插画 -->
                            <div style="width: 86px; height: 86px; border-radius: 50%; overflow: hidden; border: 3px solid #111; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                <img id="wemusicAppCover" src="${track.cover}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='tarot/images/slot_bg.png';" />
                            </div>
                        </div>
                    </div>

                    <!-- 歌曲元数据 -->
                    <div style="margin-top: 24px; text-align: center;">
                        <div id="wemusicAppTitle" style="font-size: 17px; font-weight: 600; color: #111; letter-spacing: 0.3px;">${track.title}</div>
                        <div id="wemusicAppArtist" style="font-size: 13px; color: #777; margin-top: 4px;">${track.artist}</div>
                    </div>

                    <!-- 动态跳动频谱线（纯 CSS 原生绘制，无大图拼凑） -->
                    <div style="display: flex; align-items: flex-end; justify-content: center; gap: 4px; height: 26px; margin: 20px 0 10px;" id="wemusicSpectrumBars">
                        ${[12, 18, 24, 15, 20, 10, 16, 22, 14, 19, 25, 11].map((h, i) => `
                            <div style="
                                width: 3px; border-radius: 2px; background: #07c160; height: ${state.isPlaying ? h : 4}px;
                                transition: height 0.25s ease;
                            "></div>
                        `).join('')}
                    </div>

                    <!-- 进度条与时间 -->
                    <div style="width: 100%; max-width: 300px; margin-top: 10px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #999; margin-bottom: 6px;">
                            <span id="wemusicAppCurTime">${formatTime(state.currentTime)}</span>
                            <span id="wemusicAppDurTime">${formatTime(state.duration)}</span>
                        </div>
                        <div id="wemusicAppProgressTrack" style="
                            width: 100%; height: 5px; background: #e5e5e5; border-radius: 3px; position: relative; cursor: pointer;
                        " onclick="window.seekWeMusic(event)">
                            <div id="wemusicAppProgressBar" style="
                                width: ${(state.progress * 100).toFixed(2)}%; height: 100%; background: #07c160; border-radius: 3px; position: relative;
                            ">
                                <div style="position: absolute; right: -5px; top: -3.5px; width: 12px; height: 12px; border-radius: 50%; background: #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.25);"></div>
                            </div>
                        </div>
                    </div>

                    <!-- 核心控制按钮栏（微信微绿圆钮，参考素材质感） -->
                    <div style="display: flex; align-items: center; justify-content: center; gap: 28px; margin-top: 26px;">
                        <!-- 上一首 -->
                        <div onclick="window._weMusicEngine.prev()" style="cursor: pointer; color: #333;">
                            <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: currentColor;"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                        </div>
                        <!-- 播放/暂停大圆钮 -->
                        <div id="wemusicAppPlayBtn" onclick="window._weMusicEngine.togglePlay()" style="
                            width: 56px; height: 56px; border-radius: 50%; background: #07c160;
                            display: flex; align-items: center; justify-content: center; color: #ffffff; cursor: pointer;
                            box-shadow: 0 4px 14px rgba(7, 193, 96, 0.35); transition: transform 0.15s ease;
                        ">
                            ${state.isPlaying ? `
                                <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: currentColor;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ` : `
                                <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: currentColor; margin-left: 2px;"><path d="M8 5v14l11-7z"/></svg>
                            `}
                        </div>
                        <!-- 下一首 -->
                        <div onclick="window._weMusicEngine.next()" style="cursor: pointer; color: #333;">
                            <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: currentColor;"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                        </div>
                    </div>

                </div>
            </div>
        `;

        if (!document.getElementById('wemusicSpinKeyframes')) {
            const style = document.createElement('style');
            style.id = 'wemusicSpinKeyframes';
            style.textContent = `
                @keyframes wemusicSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    };

    window.seekWeMusic = function (e) {
        const trackEl = document.getElementById('wemusicAppProgressTrack');
        if (!trackEl) return;
        const rect = trackEl.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        window._weMusicEngine.seek(percent);
    };

    window.syncMusicAppUI = function (state) {
        const playBtn = document.getElementById('wemusicAppPlayBtn');
        const disc = document.getElementById('wemusicVinylDisc');
        const curTime = document.getElementById('wemusicAppCurTime');
        const durTime = document.getElementById('wemusicAppDurTime');
        const pBar = document.getElementById('wemusicAppProgressBar');
        const titleEl = document.getElementById('wemusicAppTitle');
        const artistEl = document.getElementById('wemusicAppArtist');
        const coverEl = document.getElementById('wemusicAppCover');
        const specBars = document.querySelectorAll('#wemusicSpectrumBars div');

        if (titleEl) titleEl.textContent = state.track.title;
        if (artistEl) artistEl.textContent = state.track.artist;
        if (coverEl && coverEl.src !== state.track.cover) coverEl.src = state.track.cover;

        if (disc) {
            disc.style.animationPlayState = state.isPlaying ? 'running' : 'paused';
        }

        if (playBtn) {
            playBtn.innerHTML = state.isPlaying ? `
                <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: currentColor;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ` : `
                <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: currentColor; margin-left: 2px;"><path d="M8 5v14l11-7z"/></svg>
            `;
        }

        if (curTime) curTime.textContent = formatTime(state.currentTime);
        if (durTime) durTime.textContent = formatTime(state.duration);
        if (pBar) pBar.style.width = `${(state.progress * 100).toFixed(2)}%`;

        if (specBars && specBars.length) {
            specBars.forEach(bar => {
                bar.style.height = state.isPlaying ? `${Math.floor(Math.random() * 18 + 6)}px` : '4px';
            });
        }
    };
})();