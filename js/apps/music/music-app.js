/**
 * js/apps/music/music-app.js
 * 🎵 独立微音音乐中枢 (WeMusic) 视图与交互中心
 * 风格：网易云红黑质感 (#ec4141 标志云红、黑白灰纯净卡片、沉浸封面流、黑胶自转)
 * 职责：
 * 1. 首页推荐（真·随机网易云热门分类换一批、网易云 CDN 高清原图直连）。
 * 2. 进门优先检测网易云登录并弹出云红提示卡片（支持快速跳过体验游客模式）。
 * 3. 手机验证码登录弹窗（输入手机号、获取验证码、一键登录换取Cookie与真实资料）。
 * 4. 推荐歌单展示（联动 music-npc-playlists.js，支持每次刷新1~3人，多歌单轮询）。
 * 5. 沉浸播放视口（黑胶自转、歌词滚动与翻译、转发到私聊/群聊卡片）。
 * 6. 全局常驻微音黑胶悬浮球：支持全屏幕任意位置触摸/鼠标自由拖动、贴边吸附，悬浮球封面 100% 同步当前歌曲！
 * 7. 我的主页（网易云红色大卡片、自定义主页背景图、无缝调用主题装扮头像框换装池、个人签名编辑）。
 */

(function () {
    'use strict';

    // 默认内置演示音轨（全部接入真实网易云 CDN 高清原图）
    const DEFAULT_PLAYLIST = [
        {
            id: 'netease_1413585838',
            neteaseId: 1413585838,
            title: '海风与微光 (Sea Breeze)',
            artist: '主播掌机精选',
            album: '白昼流光',
            url: 'https://music.163.com/song/media/outer/url?id=1413585838.mp3',
            cover: 'https://p1.music.126.net/6y-5Y0C15jKEP4AET0BiDA==/109951164587635678.jpg?param=300y300',
            duration: 198,
            lyrics: [
                { time: 0, text: '海风吹拂过安静的岸礁', trans: 'The sea breeze caresses the quiet shore' },
                { time: 12, text: '远方的灯塔在夜色中闪烁微光', trans: 'The distant lighthouse flickers in the dark' },
                { time: 26, text: '像是在等待谁的归来', trans: 'As if waiting for someone to return' },
                { time: 42, text: '微弱而坚定的心跳与潮汐同频', trans: 'A gentle heartbeat resonates with the tide' },
                { time: 65, text: '今夜有你在身边，一切都很安心', trans: 'With you by my side tonight, all is at peace' }
            ]
        },
        {
            id: 'netease_1384026889',
            neteaseId: 1384026889,
            title: '午后雨落 (Afternoon Rain)',
            artist: '主播掌机精选',
            album: '独处时刻',
            url: 'https://music.163.com/song/media/outer/url?id=1384026889.mp3',
            cover: 'https://p2.music.126.net/1n0Z17T5p4BfW1-bJ3Z1gA==/109951164287349142.jpg?param=300y300',
            duration: 215,
            lyrics: [
                { time: 0, text: '雨滴敲打着窗沿', trans: 'Raindrops tap softly against the windowsill' },
                { time: 15, text: '咖啡升腾起暖暖的热气', trans: 'Warm steam rises gently from the coffee cup' },
                { time: 32, text: '时间仿佛在这一刻悄悄变慢', trans: 'Time seems to slow down at this quiet moment' },
                { time: 54, text: '不用去想外界的纷纷扰扰', trans: 'No need to care about the noise outside' },
                { time: 76, text: '只要静静听着雨声就好', trans: 'Just listening to the peaceful rhythm of rain' }
            ]
        },
        {
            id: 'netease_1824045033',
            neteaseId: 1824045033,
            title: '星夜低语 (Whisper of Stars)',
            artist: '主播掌机精选',
            album: '深海共鸣',
            url: 'https://music.163.com/song/media/outer/url?id=1824045033.mp3',
            cover: 'https://p1.music.126.net/vX3nQc1RkG3kGfF6gU8Z5A==/109951165768392104.jpg?param=300y300',
            duration: 184,
            lyrics: [
                { time: 0, text: '拉莱耶的星空沉入无垠深海', trans: 'The starry sky sinks deep into Rlyeh ocean' },
                { time: 14, text: '不可名状的旋律在心底悄然流淌', trans: 'Unspeakable melodies whisper within the soul' },
                { time: 30, text: '那是来自遥远梦境的呼唤', trans: 'A gentle call echoing from ancient dreams' },
                { time: 48, text: '悄悄钻进温暖的被窝里', trans: 'Snuggling secretly into the cozy blanket' },
                { time: 70, text: '为你守护每一场甜美的梦境', trans: 'Guarding every sweet dream softly for you' }
            ]
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
            this.userFavorites = [];
            this.showTranslation = true;
            this.isRefreshingExplore = false;

            this._loadFavorites();
            this._initAudioEvents();
            this._loadSavedState();
        }

        _loadFavorites() {
            try {
                const raw = localStorage.getItem('mcyt_wemusic_favorites');
                this.userFavorites = raw ? JSON.parse(raw) : [];
            } catch (_) {
                this.userFavorites = [];
            }
        }

        _saveFavorites() {
            try {
                localStorage.setItem('mcyt_wemusic_favorites', JSON.stringify(this.userFavorites));
            } catch (_) {}
        }

        isFavorite(trackId) {
            return this.userFavorites.some(t => t.id === trackId);
        }

        toggleFavorite(track) {
            const idx = this.userFavorites.findIndex(t => t.id === track.id);
            if (idx >= 0) {
                this.userFavorites.splice(idx, 1);
            } else {
                this.userFavorites.push(track);
            }
            this._saveFavorites();
            this._notifyUpdate();
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
                if (typeof window.showMusicFloatingWidget === 'function') {
                    window.showMusicFloatingWidget();
                }
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
        const track = this.currentTrack;
        if (track.neteaseId && window.weMusicApi && (!track.lyrics || track.lyrics.length === 0)) {
            window.weMusicApi.fetchTrackLyrics(track.neteaseId).then(lyrics => {
                if (lyrics && lyrics.length) {
                    track.lyrics = lyrics;
                    this._notifyUpdate();
                }
            }).catch(() => {});
        }
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
        const track = this.currentTrack;
        if (track.neteaseId && window.weMusicApi && (!track.lyrics || track.lyrics.length === 0)) {
            window.weMusicApi.fetchTrackLyrics(track.neteaseId).then(lyrics => {
                if (lyrics && lyrics.length) {
                    track.lyrics = lyrics;
                    this._notifyUpdate();
                }
            }).catch(() => {});
        }
                this._saveState();
            }
            if (!this.audio.src || this.audio.src === '' || this.audio.src === window.location.href) {
                this.audio.src = this.currentTrack.url;
        const track = this.currentTrack;
        if (track.neteaseId && window.weMusicApi && (!track.lyrics || track.lyrics.length === 0)) {
            window.weMusicApi.fetchTrackLyrics(track.neteaseId).then(lyrics => {
                if (lyrics && lyrics.length) {
                    track.lyrics = lyrics;
                    this._notifyUpdate();
                }
            }).catch(() => {});
        }
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

        playSpecificTrack(track) {
            const existingIdx = this.playlist.findIndex(t => t.id === track.id);
            if (existingIdx >= 0) {
                this.play(existingIdx);
            } else {
                this.playlist.unshift(track);
                this.play(0);
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
        const track = this.currentTrack;
        if (track.neteaseId && window.weMusicApi && (!track.lyrics || track.lyrics.length === 0)) {
            window.weMusicApi.fetchTrackLyrics(track.neteaseId).then(lyrics => {
                if (lyrics && lyrics.length) {
                    track.lyrics = lyrics;
                    this._notifyUpdate();
                }
            }).catch(() => {});
        }
            this._saveState();
            this.play();
        }

        prev() {
            this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
            this.audio.src = this.currentTrack.url;
        const track = this.currentTrack;
        if (track.neteaseId && window.weMusicApi && (!track.lyrics || track.lyrics.length === 0)) {
            window.weMusicApi.fetchTrackLyrics(track.neteaseId).then(lyrics => {
                if (lyrics && lyrics.length) {
                    track.lyrics = lyrics;
                    this._notifyUpdate();
                }
            }).catch(() => {});
        }
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
                    album: track.album || '网易云音乐',
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
            if (typeof window.syncMusicFloatingState === 'function') {
                window.syncMusicFloatingState(this.getState());
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
                progress: (this.duration > 0) ? (this.currentTime / this.duration) : 0,
                isFav: this.isFavorite(this.currentTrack.id),
                showTranslation: this.showTranslation
            };
        }

        /**
         * 真实真随机换一批
         */
        async refreshExploreTrulyRandom() {
            if (this.isRefreshingExplore) return;
            this.isRefreshingExplore = true;
            try {
                if (window.weMusicApi && typeof window.weMusicApi.fetchTrulyRandomTracks === 'function') {
                    const newTracks = await window.weMusicApi.fetchTrulyRandomTracks(6);
                    if (newTracks && newTracks.length > 0) {
                        this.playlist = newTracks;
                        this.currentIndex = 0;
                        this._saveState();
                        this._notifyUpdate();
                        if (typeof showToast === 'function') showToast('已从网易云随机池拉取全新 6 首热歌');
                    }
                }
            } catch (err) {
                console.warn('[WeMusic] 换一批失败:', err);
            } finally {
                this.isRefreshingExplore = false;
                const modalBody = document.getElementById('appModalBody');
                if (modalBody && typeof window.renderMusicApp === 'function') {
                    window.renderMusicApp(modalBody);
                }
            }
        }
    }

    window._weMusicEngine = new MusicPlayerEngine();
window.syncMusicAppUI = function (state) {
        const modalProgress = document.getElementById('wemusicModalProgressBar');
        const modalCurTime = document.getElementById('wemusicModalCurTime');
        const modalDurTime = document.getElementById('wemusicModalDurTime');
        const disc = document.getElementById('wemusicModalVinylDisc');

        if (modalCurTime) modalCurTime.textContent = formatTime(state.currentTime);
        if (modalDurTime) modalDurTime.textContent = formatTime(state.duration);
        if (modalProgress) modalProgress.style.width = `${(state.progress * 100).toFixed(2)}%`;
        if (disc) disc.style.animationPlayState = state.isPlaying ? 'running' : 'paused';

        const lyricBox = document.getElementById('wemusicLyricBox');
        if (lyricBox && state.track.lyrics && state.track.lyrics.length) {
            const curTime = state.currentTime;
            let activeIdx = 0;
            for (let i = 0; i < state.track.lyrics.length; i++) {
                if (curTime >= state.track.lyrics[i].time) {
                    activeIdx = i;
                } else {
                    break;
                }
            }
            const lines = lyricBox.querySelectorAll('.wemusic-lyric-line');
            lines.forEach((l, idx) => {
                if (idx === activeIdx) {
                    l.style.color = '#ec4141';
                    l.style.fontWeight = 'bold';
                    l.style.transform = 'scale(1.05)';
                    l.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    l.style.color = '#666';
                    l.style.fontWeight = 'normal';
                    l.style.transform = 'scale(1)';
                }
            });
        }
    };

    function formatTime(sec) {
        if (!sec || isNaN(sec)) return '00:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // ============================================================
    // 🌐 全局音乐悬浮球驱动系统（支持自由全屏幕手势拖动与智能贴边）
    // ============================================================
    window._isMusicCapsuleExpanded = false;
    let _floatPos = { x: null, y: null };

    window.initMusicFloatingDragEngine = function () {
        const floatEl = document.getElementById('wemusicFloatingWidget');
        if (!floatEl || floatEl._dragBound) return;
        floatEl._dragBound = true;

        let startX = 0, startY = 0;
        let initialX = 0, initialY = 0;
        let isDragging = false;
        let hasMoved = false;

        const onTouchStart = (e) => {
            const touch = (e.touches && e.touches[0]) || e;
            startX = touch.clientX;
            startY = touch.clientY;
            const rect = floatEl.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            isDragging = true;
            hasMoved = false;
            floatEl.style.transition = 'none';
        };

        const onTouchMove = (e) => {
            if (!isDragging) return;
            const touch = (e.touches && e.touches[0]) || e;
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            if (Math.hypot(dx, dy) > 5) {
                hasMoved = true;
            }

            let newX = initialX + dx;
            let newY = initialY + dy;

            // 限制在视口边界内
            const maxW = window.innerWidth - floatEl.offsetWidth - 6;
            const maxH = window.innerHeight - floatEl.offsetHeight - 40;
            newX = Math.max(6, Math.min(maxW, newX));
            newY = Math.max(40, Math.min(maxH, newY));

            floatEl.style.left = `${newX}px`;
            floatEl.style.top = `${newY}px`;
            floatEl.style.right = 'auto';

            if (e.cancelable) e.preventDefault();
        };

        const onTouchEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            floatEl.style.transition = 'all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';

            // 松手后自动吸附到左侧或右侧边缘
            const rect = floatEl.getBoundingClientRect();
            const winW = window.innerWidth;
            const snapLeft = (rect.left + rect.width / 2) < (winW / 2);

            const finalX = snapLeft ? 10 : (winW - rect.width - 10);
            floatEl.style.left = `${finalX}px`;

            try {
                localStorage.setItem('mcyt_wemusic_float_pos', JSON.stringify({ x: finalX, y: rect.top }));
            } catch (_) {}
        };

        // 仅在圆形黑胶上绑定点击防穿透
        const discEl = document.getElementById('wemusicFloatingDisc');
        if (discEl) {
            discEl.addEventListener('click', (e) => {
                if (hasMoved) {
                    e.stopPropagation();
                    return;
                }
                window.toggleMusicFloatingCapsule();
            });
        }

        floatEl.addEventListener('touchstart', onTouchStart, { passive: false });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);

        floatEl.addEventListener('mousedown', onTouchStart);
        window.addEventListener('mousemove', onTouchMove);
        window.addEventListener('mouseup', onTouchEnd);

        // 恢复持久化保存的坐标
        try {
            const raw = localStorage.getItem('mcyt_wemusic_float_pos');
            if (raw) {
                const pos = JSON.parse(raw);
                if (pos && typeof pos.y === 'number') {
                    floatEl.style.left = `${pos.x}px`;
                    floatEl.style.top = `${pos.y}px`;
                    floatEl.style.right = 'auto';
                }
            }
        } catch (_) {}
    };

    window.showMusicFloatingWidget = function () {
        const floatEl = document.getElementById('wemusicFloatingWidget');
        if (floatEl) {
            floatEl.style.display = 'flex';
            window.initMusicFloatingDragEngine();
            window.syncMusicFloatingState(window._weMusicEngine.getState());
        }
    };

    window.hideMusicFloatingWidget = function (e) {
        if (e) e.stopPropagation();
        const floatEl = document.getElementById('wemusicFloatingWidget');
        if (floatEl) {
            floatEl.style.display = 'none';
        }
    };

    window.toggleMusicFloatingCapsule = function () {
        const capsule = document.getElementById('wemusicFloatingCapsule');
        if (!capsule) return;
        window._isMusicCapsuleExpanded = !window._isMusicCapsuleExpanded;
        if (window._isMusicCapsuleExpanded) {
            capsule.style.opacity = '1';
            capsule.style.transform = 'scale(1) translateX(0)';
            capsule.style.pointerEvents = 'auto';
        } else {
            capsule.style.opacity = '0';
            capsule.style.transform = 'scale(0.85) translateX(15px)';
            capsule.style.pointerEvents = 'none';
        }
    };

    window.syncMusicFloatingState = function (state) {
        const discInner = document.getElementById('wemusicFloatDiscInner');
        const coverEl = document.getElementById('wemusicFloatCover');
        const titleEl = document.getElementById('wemusicFloatTitle');
        const playBtn = document.getElementById('wemusicFloatPlayBtn');
        const bars = document.querySelectorAll('#wemusicFloatBars div');

        // 悬浮球封面 100% 同步当前曲目
        if (coverEl && coverEl.src !== state.track.cover) {
            coverEl.src = state.track.cover;
        }
        if (titleEl) titleEl.textContent = state.track.title;

        if (discInner) {
            discInner.style.animationPlayState = state.isPlaying ? 'running' : 'paused';
        }

        if (playBtn) {
            playBtn.innerHTML = state.isPlaying ? `
                <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; fill: #ec4141;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ` : `
                <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; fill: #ec4141;"><path d="M8 5v14l11-7z"/></svg>
            `;
        }

        if (bars && bars.length) {
            bars.forEach(b => {
                b.style.background = '#ec4141';
                b.style.height = state.isPlaying ? `${Math.floor(Math.random() * 9 + 3)}px` : '3px';
            });
        }
    };

    // ============================================================
    // 🎨 网易云官方红黑视觉与装扮中心联动
    // ============================================================
    window._weMusicCurrentTab = 'explore';

    // 获取当前用户装扮头像框（联动主题中心）
    function getEquippedFrameUrl() {
        try {
            if (typeof window.getStoredDecorFrames === 'function') {
                const pool = window.getStoredDecorFrames();
                const active = pool.find(f => f.equipped || f.url === saved || f.img === saved);
                if (active) return (active.url || active.img);
            }
            const saved = localStorage.getItem('mcyt_decor_cur_frame');
            if (saved) return saved;
        } catch (_) {}
        return '';
    }

    // 获取网易云主页自定义背景图
    function getMusicProfileBanner() {
        return localStorage.getItem('mcyt_wemusic_profile_banner') || 'assets/system/default_desktop.jpg';
    }

    window.renderMusicApp = function (container) {
        if (!container) return;

        const state = window._weMusicEngine.getState();
        const tab = window._weMusicCurrentTab;

        let contentHTML = '';
        if (tab === 'explore') {
            contentHTML = window._renderMusicTabExplore(state);
        } else if (tab === 'playlists') {
            contentHTML = window._renderMusicTabPlaylists(state);
        } else {
            contentHTML = window._renderMusicTabMine(state);
        }

        container.innerHTML = `
            <div class="wemusic-container" style="
                background: #f8f9fa; height: 100%; display: flex; flex-direction: column;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                box-sizing: border-box; overflow: hidden; color: #222;
                padding-top: calc(var(--status-bar-height, 40px) + 2px);
            ">
                <!-- 网易云标志顶栏：云红点缀与流线药丸分段器 -->
                <div style="height: 50px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; background: #ffffff; border-bottom: 0.5px solid #f0f0f0;">
                    <div onclick="window.closePhoneApp()" style="display: flex; align-items: center; gap: 4px; font-size: 13.5px; color: #333; cursor: pointer; font-weight: 500;">
                        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                        <span>返回</span>
                    </div>

                    <!-- 网易云标志性红黑药丸导航条 -->
                    <div style="display: flex; background: #f2f3f5; border-radius: 20px; padding: 3px;">
                        <div onclick="window.switchMusicTab('explore')" style="padding: 4px 14px; font-size: 12px; font-weight: 600; border-radius: 16px; cursor: pointer; transition: all 0.2s ease; ${tab === 'explore' ? 'background:#ec4141; color:#fff; box-shadow: 0 2px 6px rgba(236,65,65,0.3);' : 'color:#666;'}">发现</div>
                        <div onclick="window.switchMusicTab('playlists')" style="padding: 4px 14px; font-size: 12px; font-weight: 600; border-radius: 16px; cursor: pointer; transition: all 0.2s ease; ${tab === 'playlists' ? 'background:#ec4141; color:#fff; box-shadow: 0 2px 6px rgba(236,65,65,0.3);' : 'color:#666;'}">角色歌单</div>
                        <div onclick="window.switchMusicTab('mine')" style="padding: 4px 14px; font-size: 12px; font-weight: 600; border-radius: 16px; cursor: pointer; transition: all 0.2s ease; ${tab === 'mine' ? 'background:#ec4141; color:#fff; box-shadow: 0 2px 6px rgba(236,65,65,0.3);' : 'color:#666;'}">我的</div>
                    </div>

                    <!-- 快速打开全屏黑胶播放页 -->
                    <div onclick="window.openMusicPlayerModal()" style="cursor: pointer; color: #ec4141; display: flex; align-items: center;">
                        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                    </div>
                </div>

                <!-- 视口内容区域 -->
                <div id="wemusicTabContent" style="flex: 1; overflow-y: auto; box-sizing: border-box; padding: 14px;">
                    ${contentHTML}
                </div>

                <!-- 底部吸底网易云极简微缩播放条 -->
                <div style="
                    height: 54px; background: rgba(255,255,255,0.98); border-top: 0.5px solid #ececec;
                    display: flex; align-items: center; justify-content: space-between; padding: 0 16px;
                    box-shadow: 0 -3px 12px rgba(0,0,0,0.04); cursor: pointer; backdrop-filter: blur(10px);
                " onclick="window.openMusicPlayerModal()">
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                        <div style="width: 38px; height: 38px; border-radius: 50%; overflow: hidden; background: #222; flex-shrink: 0; border: 1.5px solid #333;">
                            <img src="${state.track.cover}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://p1.music.126.net/6y-5Y0C15jKEP4AET0BiDA==/109951164587635678.jpg?param=300y300';" />
                        </div>
                        <div style="min-width: 0; flex: 1;">
                            <div style="font-size: 13px; font-weight: 600; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${state.track.title}</div>
                            <div style="font-size: 11px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${state.track.artist}</div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 14px;" onclick="event.stopPropagation()">
                        <div onclick="window._weMusicEngine.prev()" style="cursor: pointer; color: #444;">
                            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                        </div>
                        <div onclick="window._weMusicEngine.togglePlay()" style="
                            width: 34px; height: 34px; border-radius: 50%; background: #ec4141;
                            display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer;
                            box-shadow: 0 2px 8px rgba(236,65,65,0.35);
                        ">
                            ${state.isPlaying ? `
                                <svg viewBox="0 0 24 24" style="width: 17px; height: 17px; fill: currentColor;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ` : `
                                <svg viewBox="0 0 24 24" style="width: 17px; height: 17px; fill: currentColor; margin-left: 2px;"><path d="M8 5v14l11-7z"/></svg>
                            `}
                        </div>
                        <div onclick="window._weMusicEngine.next()" style="cursor: pointer; color: #444;">
                            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    window.switchMusicTab = function (tab) {
        window._weMusicCurrentTab = tab;
        const modalBody = document.getElementById('appModalBody');
        if (modalBody) window.renderMusicApp(modalBody);
    };

    // 1. 首页发现视口（网易云红色雷达 + 真随机换一批）
    window._renderMusicTabExplore = function (state) {
        const isLogged = window.weMusicApi && window.weMusicApi.isLoggedIn();
        const dismissed = window.weMusicApi && window.weMusicApi.hasDismissedLoginPrompt();

        let loginNoticeHTML = '';
        if (!isLogged && !dismissed) {
            loginNoticeHTML = `
                <div id="wemusicLoginBanner" style="
                    background: #ffffff; border-radius: 14px; padding: 14px; border: 0.5px solid #ffd0d0;
                    box-shadow: 0 2px 10px rgba(236,65,65,0.08); display: flex; flex-direction: column; gap: 8px;
                    border-left: 4px solid #ec4141;
                ">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="font-size: 13.5px; font-weight: bold; color: #111; display: flex; align-items: center; gap: 6px;">
                            <span style="color:#ec4141;">🎵</span>
                            <span>开启你的网易云音乐生态</span>
                        </div>
                        <span onclick="window.dismissMusicLoginBanner()" style="font-size: 12px; color: #999; cursor: pointer; padding: 2px 4px;">✕</span>
                    </div>
                    <div style="font-size: 11.5px; color: #666; line-height: 1.5;">
                        使用手机验证码直接连接网易云，同步每日私享推荐、专属角色心境歌单与红心收藏。
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                        <button onclick="window.openNeteaseLoginModal()" style="
                            background: #ec4141; color: #fff; border: none; border-radius: 14px;
                            padding: 5px 14px; font-size: 11.5px; font-weight: bold; cursor: pointer;
                        ">手机号登录</button>
                        <button onclick="window.dismissMusicLoginBanner()" style="
                            background: #f2f2f2; color: #666; border: none; border-radius: 14px;
                            padding: 5px 12px; font-size: 11.5px; cursor: pointer;
                        ">先随便听听 (游客)</button>
                    </div>
                </div>
            `;
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 14px;">
                ${loginNoticeHTML}

                <!-- 网易云标志性红黑流光大横幅 -->
                <div style="
                    background: linear-gradient(135deg, #ec4141, #c20c0c); border-radius: 16px; padding: 18px;
                    color: #ffffff; box-shadow: 0 4px 16px rgba(236,65,65,0.28); position: relative; overflow: hidden;
                ">
                    <div style="font-size: 11px; opacity: 0.85; letter-spacing: 0.5px;">DAILY RADAR · 每日私享雷达</div>
                    <div style="font-size: 18px; font-weight: bold; margin-top: 4px;">今日专属精选音轨</div>
                    <div style="font-size: 12px; opacity: 0.9; margin-top: 6px;">根据你的喜好与角色的双向羁绊，精选 3 首治愈旋律</div>
                    <button onclick="window._weMusicEngine.play(0)" style="
                        margin-top: 14px; background: #ffffff; color: #c20c0c; border: none; border-radius: 20px;
                        padding: 6px 16px; font-size: 12px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.12);
                    ">▶ 立即播放日推</button>
                </div>

                <div style="background: #ffffff; border-radius: 14px; padding: 14px; border: 0.5px solid #ececec;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <div style="font-size: 14px; font-weight: bold; color: #111;">热门私藏推荐</div>
                        <div style="
                            font-size: 11.5px; color: #ec4141; cursor: pointer; display: flex; align-items: center; gap: 3px;
                            background: #fdf1f1; padding: 4px 10px; border-radius: 14px; font-weight: 500;
                        " onclick="window._weMusicEngine.refreshExploreTrulyRandom()">
                            <svg viewBox="0 0 24 24" style="width: 12px; height: 12px; fill: currentColor;"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                            <span>真·随机换一批</span>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${window._weMusicEngine.playlist.map((track, idx) => `
                            <div style="
                                display: flex; align-items: center; justify-content: space-between; padding: 8px;
                                border-radius: 10px; cursor: pointer; transition: background 0.15s ease;
                                ${state.track.id === track.id ? 'background: #fff5f5;' : 'background: #fafafa;'}
                            " onclick="window._weMusicEngine.play(${idx})">
                                <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                                    <div style="width: 42px; height: 42px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: #eee;">
                                        <img src="${track.cover}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://p1.music.126.net/6y-5Y0C15jKEP4AET0BiDA==/109951164587635678.jpg?param=300y300';" />
                                    </div>
                                    <div style="min-width: 0; flex: 1;">
                                        <div style="font-size: 13px; font-weight: 600; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${track.title}</div>
                                        <div style="font-size: 11px; color: #888; margin-top: 2px;">${track.artist} · ${track.album}</div>
                                    </div>
                                </div>
                                <div style="color: ${state.track.id === track.id ? '#ec4141' : '#ccc'}; padding-left: 8px;">
                                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor;"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    };

    window.dismissMusicLoginBanner = function () {
        if (window.weMusicApi) window.weMusicApi.dismissLoginPrompt();
        const banner = document.getElementById('wemusicLoginBanner');
        if (banner) banner.style.display = 'none';
    };

    // 2. 角色专属歌单视口（联动 music-npc-playlists.js）
    window._renderMusicTabPlaylists = function (state) {
        const playlists = (typeof window.getNpcMusicPlaylists === 'function') ? window.getNpcMusicPlaylists() : [];

        return `
            <div style="display: flex; flex-direction: column; gap: 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-size: 14px; font-weight: bold; color: #111;">同伴的专属音轨</div>
                    <div style="
                        display: flex; align-items: center; gap: 4px; font-size: 11px; color: #ec4141;
                        background: #fdf1f1; padding: 4px 10px; border-radius: 12px; cursor: pointer; font-weight: 500;
                    " onclick="window.refreshNpcMusicPlaylists()">
                        <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; fill: currentColor;"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                        <span>刷新 1~3 位角色歌单</span>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${playlists.map((pl, pIdx) => `
                        <div style="background: #ffffff; border-radius: 14px; padding: 14px; border: 0.5px solid #ececec;">
                            <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 0.5px solid #f5f5f5;">
                                <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;" onclick="window.openNpcMusicProfileModal('${pl.npcId}')">
                                    <div style="width: 44px; height: 44px; border-radius: 50%; overflow: hidden; border: 1.5px solid #ec4141;">
                                        <img src="${pl.npcAvatar}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://p1.music.126.net/6y-5Y0C15jKEP4AET0BiDA==/109951164587635678.jpg?param=300y300';" />
                                    </div>
                                    <div>
                                        <div style="font-size: 13.5px; font-weight: bold; color: #111;">${pl.npcName}</div>
                                        <div style="font-size: 11px; color: #888; margin-top: 2px;">进入网易云个人主页 ➔</div>
                                    </div>
                                </div>
                                <button onclick="window.playNpcEntirePlaylist(${pIdx})" style="
                                    background: #ec4141; color: #fff; border: none; border-radius: 16px;
                                    padding: 5px 12px; font-size: 11px; font-weight: bold; cursor: pointer;
                                ">播放全部</button>
                            </div>

                            <div style="margin-top: 10px;">
                                <div style="font-size: 13px; font-weight: 600; color: #222;">${pl.playlistTitle}</div>
                                <div style="font-size: 11.5px; color: #777; margin-top: 3px; line-height: 1.4;">${pl.desc}</div>
                                <div style="display: flex; gap: 6px; margin-top: 8px;">
                                    ${pl.tags.map(tag => `<span style="font-size: 10px; background: #f5f5f5; color: #666; padding: 2px 6px; border-radius: 4px;"># ${tag}</span>`).join('')}
                                </div>
                            </div>

                            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
                                ${pl.tracks.map((track) => `
                                    <div style="
                                        display: flex; align-items: center; justify-content: space-between;
                                        background: #fafafa; border-radius: 8px; padding: 7px 10px; cursor: pointer;
                                    " onclick="window.playSpecificTrackDirectly(${JSON.stringify(track).replace(/"/g, '&quot;')})">
                                        <div style="font-size: 12px; color: #333; font-weight: 500;">🎵 ${track.title}</div>
                                        <div style="font-size: 11px; color: #ec4141; font-weight: 600;">播放</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    window.playSpecificTrackDirectly = function (track) {
        window._weMusicEngine.playSpecificTrack(track);
        if (typeof showToast === 'function') showToast(`正在播放：${track.title}`);
        window.openMusicPlayerModal();
    };

    window.playNpcEntirePlaylist = function (playlistIdx) {
        const playlists = (typeof window.getNpcMusicPlaylists === 'function') ? window.getNpcMusicPlaylists() : [];
        const pl = playlists[playlistIdx];
        if (pl && pl.tracks && pl.tracks.length) {
            window._weMusicEngine.playSpecificTrack(pl.tracks[0]);
            if (typeof showToast === 'function') showToast(`正在播放「${pl.npcName}」的专属歌单`);
            window.openMusicPlayerModal();
        }
    };

    // 角色网易云主页弹窗
    window.openNpcMusicProfileModal = function (npcId) {
        const playlists = (typeof window.getNpcMusicPlaylists === 'function') ? window.getNpcMusicPlaylists() : [];
        const pl = playlists.find(p => p.npcId === npcId) || playlists[0];

        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('retroModalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalClose = document.getElementById('modalClose');
        if (!modal || !modalBody) return;

        if (modalTitle) modalTitle.textContent = `${pl.npcName} 的网易云主页`;
        modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; padding: 10px 0;">
                <div style="width: 68px; height: 68px; border-radius: 50%; overflow: hidden; border: 2.5px solid #ec4141; box-shadow: 0 4px 14px rgba(236,65,65,0.25);">
                    <img src="${pl.npcAvatar}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://p1.music.126.net/6y-5Y0C15jKEP4AET0BiDA==/109951164587635678.jpg?param=300y300';" />
                </div>
                <div style="font-size: 16px; font-weight: bold; color: #111; margin-top: 8px;">${pl.npcName}</div>
                <div style="font-size: 11.5px; color: #777; margin-top: 3px; text-align: center; padding: 0 10px;">${pl.desc}</div>

                <div style="width: 100%; margin-top: 16px; border-top: 0.5px solid #eee; padding-top: 12px;">
                    <div style="font-size: 12.5px; font-weight: bold; color: #333; margin-bottom: 8px;">Ta 最近在听：</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${pl.tracks.map(t => `
                            <div style="display: flex; align-items: center; justify-content: space-between; background: #f8f8f8; padding: 8px 10px; border-radius: 8px;">
                                <div style="font-size: 12px; color: #222;">${t.title}</div>
                                <button onclick="window.playSpecificTrackDirectly(${JSON.stringify(t).replace(/"/g, '&quot;')}); document.getElementById('modalClose').click();" style="
                                    background: #ec4141; color: #fff; border: none; border-radius: 12px; padding: 3px 10px; font-size: 11px; cursor: pointer;
                                ">听听看</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        modal.classList.add('open');
        if (modalClose) modalClose.onclick = () => modal.classList.remove('open');
    };

    // 3. 我的界面（支持网易云红黑视觉 + 头像框换装池 + 背景图自定义）
    window._renderMusicTabMine = function (state) {
        let userName = '主播李敏';
        let userSign = '静听每一个治愈的心动瞬间';
        let userAvatar = 'https://p1.music.126.net/6y-5Y0C15jKEP4AET0BiDA==/109951164587635678.jpg?param=300y300';

        const isLogged = window.weMusicApi && window.weMusicApi.isLoggedIn();
        if (isLogged && window.weMusicApi.userInfo) {
            userName = window.weMusicApi.userInfo.nickname || userName;
            userSign = window.weMusicApi.userInfo.signature || userSign;
            userAvatar = window.weMusicApi.userInfo.avatarUrl || userAvatar;
        } else {
            try {
                if (window.G && window.G.player && window.G.player.name) userName = window.G.player.name;
            } catch (_) {}
        }

        const favCount = window._weMusicEngine.userFavorites.length;
        const bannerUrl = getMusicProfileBanner();
        const frameUrl = getEquippedFrameUrl();

        return `
            <div style="display: flex; flex-direction: column; gap: 14px;">
                <input type="file" id="musicBannerPicker" accept="image/*" style="display:none;" onchange="window.handleMusicBannerChange(event)" />

                <!-- 🌟 网易云专属个人主页卡片：支持自定义背景图 + 主题头像框换装 -->
                <div style="
                    border-radius: 16px; overflow: hidden; position: relative; border: 0.5px solid #ececec;
                    background: #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.04);
                ">
                    <!-- 顶部背景大图（点击直接更换） -->
                    <div style="
                        height: 90px; width: 100%; position: relative; cursor: pointer;
                        background: url('${bannerUrl}') center/cover no-repeat;
                    " onclick="document.getElementById('musicBannerPicker').click()">
                        <div style="
                            position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.5));
                            display: flex; align-items: flex-end; justify-content: flex-end; padding: 8px;
                        ">
                            <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(0,0,0,0.45); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center;"><svg viewBox="0 0 24 24" style="width: 15px; height: 15px; fill: #ffffff;"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div>
                        </div>
                    </div>

                    <!-- 个人资料与头像框层 -->
                    <div style="padding: 14px; position: relative; margin-top: -30px; display: flex; align-items: flex-end; justify-content: space-between;">
                        <div style="display: flex; align-items: flex-end; gap: 12px;">
                            <!-- 头像框容器：精准承载主题装扮中心已佩戴的头像框 -->
                            <div style="width: 60px; height: 60px; position: relative; flex-shrink: 0; cursor: pointer;" onclick="window.openMusicFrameDressModal()">
                                <div style="width: 100%; height: 100%; border-radius: 50%; overflow: hidden; background: #eee; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                                    <img src="${userAvatar}" style="width: 100%; height: 100%; object-fit: cover;" />
                                </div>
                                ${frameUrl ? `
                                    <img src="${frameUrl}" style="
                                        position: absolute; top: -14%; left: -14%; width: 128%; height: 128%;
                                        pointer-events: none; z-index: 2; object-fit: contain;
                                    " />
                                ` : ''}
                            </div>
                            <div style="margin-bottom: 2px;">
                                <div style="font-size: 15px; font-weight: bold; color: #111;">${userName}</div>
                                <div style="font-size: 11px; color: #888; margin-top: 2px;">${userSign}</div>
                            </div>
                        </div>

                        <!-- 换装与编辑按键 -->
                        <div style="display: flex; gap: 6px;">
                            <button onclick="window.openMusicFrameDressModal()" style="
                                background: #fdf1f1; border: 0.5px solid #ffd0d0; border-radius: 14px; padding: 4px 10px; font-size: 11px; color: #ec4141; font-weight: 500; cursor: pointer;
                            ">换装</button>
                            <button onclick="window.openMusicEditProfileModal()" style="
                                background: #f0f0f0; border: none; border-radius: 14px; padding: 4px 10px; font-size: 11px; color: #333; cursor: pointer;
                            ">编辑</button>
                        </div>
                    </div>
                </div>

                <!-- 网易云账号连接卡片 -->
                <div style="background: #ffffff; border-radius: 14px; padding: 14px; border: 0.5px solid #ececec;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 26px; height: 26px; border-radius: 50%; background: #ec4141; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 13px; font-weight: bold;">网</div>
                            <div>
                                <div style="font-size: 13px; font-weight: 600; color: #111;">网易云账号授权 (本地直连 0 服务器压力)</div>
                                <div style="font-size: 10.5px; color: ${isLogged ? '#ec4141' : '#888'}; margin-top: 1px;">
                                    ${isLogged ? `已连接：${userName}` : '未连接网易云账号'}
                                </div>
                            </div>
                        </div>
                        <button onclick="${isLogged ? 'window.logoutNeteaseAccount()' : 'window.openNeteaseLoginModal()'}" style="
                            background: ${isLogged ? '#555' : '#ec4141'}; color: #fff; border: none; border-radius: 14px; padding: 4px 12px; font-size: 11px; font-weight: bold; cursor: pointer;
                        ">${isLogged ? '退出' : '验证码登录'}</button>
                    </div>
                    <div style="font-size: 11px; color: #888; margin-top: 6px; line-height: 1.4;">
                        直接在手机本地安全直连网易云接口，同步红心歌单与专属身份。
                    </div>
                </div>

                <!-- 我喜欢的音乐列表 -->
                <div style="background: #ffffff; border-radius: 14px; padding: 14px; border: 0.5px solid #ececec;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="color: #ec4141; font-size: 16px;">❤</span>
                            <span style="font-size: 13.5px; font-weight: bold; color: #111;">我喜欢的音乐 (${favCount}首)</span>
                        </div>
                    </div>

                    ${favCount === 0 ? `
                        <div style="text-align: center; padding: 20px; font-size: 11.5px; color: #aaa;">在播放界面点亮小爱心，收藏你喜欢的旋律吧</div>
                    ` : `
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${window._weMusicEngine.userFavorites.map(t => `
                                <div style="display: flex; align-items: center; justify-content: space-between; background: #fafafa; padding: 8px 10px; border-radius: 8px;">
                                    <div style="font-size: 12px; color: #222; font-weight: 500;">${t.title} - ${t.artist}</div>
                                    <button onclick="window.playSpecificTrackDirectly(${JSON.stringify(t).replace(/"/g, '&quot;')})" style="
                                        background: #ec4141; color: #fff; border: none; border-radius: 10px; padding: 2px 8px; font-size: 10.5px; cursor: pointer;
                                    ">播放</button>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    };

    // 更换网易云个人主页背景图
    window.handleMusicBannerChange = function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (evt) {
            const base64 = evt.target.result;
            try {
                localStorage.setItem('mcyt_wemusic_profile_banner', base64);
            } catch (_) {}
            if (typeof showToast === 'function') showToast('已成功更换网易云主页背景！');
            const modalBody = document.getElementById('appModalBody');
            if (modalBody) window.renderMusicApp(modalBody);
        };
        reader.readAsDataURL(file);
    };

    // 🌟 头像框换装弹窗：无缝提取主题中心保存的高清原画头像框池
    window.openMusicFrameDressModal = function () {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('retroModalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalClose = document.getElementById('modalClose');
        if (!modal || !modalBody) return;

        let frames = [];
        try {
            if (typeof window.getStoredDecorFrames === 'function') {
                frames = window.getStoredDecorFrames();
            }
        } catch (_) {}

        if (modalTitle) modalTitle.textContent = '头像框换装中心';
        modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; padding: 10px 0; gap: 12px;">
                <div style="font-size: 12px; color: #666; line-height: 1.4;">
                    选择装扮中心保存的个性头像框，即时装配在网易云主页与聊天中心：
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-height: 240px; overflow-y: auto;">
                    <div onclick="window.equipMusicFrame('')" style="
                        border: 1px dashed #ccc; border-radius: 10px; padding: 10px 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;
                    ">
                        <span style="font-size: 16px;">🚫</span>
                        <span style="font-size: 11px; color: #666; margin-top: 4px;">无头像框</span>
                    </div>

                    ${frames.map(f => `
                        <div onclick="window.equipMusicFrame('${f.url || f.img}')" style="
                            background: #fafafa; border: 1px solid ${f.equipped ? '#ec4141' : '#eee'}; border-radius: 10px; padding: 8px; display: flex; flex-direction: column; align-items: center; cursor: pointer; position: relative;
                        ">
                            <div style="width: 44px; height: 44px; position: relative; margin-bottom: 4px;">
                                <div style="width: 100%; height: 100%; border-radius: 50%; background: #ddd;"></div>
                                <img src="${f.url || f.img}" style="position: absolute; inset: -10%; width: 120%; height: 120%; object-fit: contain;" />
                            </div>
                            <div style="font-size: 10.5px; color: #333; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60px;">${f.name || '头像框'}</div>
                            ${f.equipped ? '<span style="position: absolute; right: 4px; top: 4px; font-size: 9px; color: #ec4141; font-weight: bold;">✔</span>' : ''}
                        </div>
                    `).join('')}
                </div>

                <button onclick="document.getElementById('modalClose').click()" style="
                    background: #f5f5f5; color: #666; border: none; border-radius: 14px; padding: 6px 0; font-size: 11.5px; cursor: pointer; margin-top: 6px;
                ">关闭</button>
            </div>
        `;
        modal.classList.add('open');
        if (modalClose) modalClose.onclick = () => modal.classList.remove('open');
    };

    window.equipMusicFrame = function (frameImg) {
        try {
            if (typeof window.getStoredDecorFrames === 'function' && typeof window.saveStoredDecorFrames === 'function') {
                const pool = window.getStoredDecorFrames();
                pool.forEach(f => {
                    f.equipped = (f.img === frameImg);
                });
                window.saveStoredDecorFrames(pool);
            }
            if (frameImg) {
                localStorage.setItem('mcyt_decor_cur_frame', frameImg);
            } else {
                localStorage.removeItem('mcyt_decor_cur_frame');
            }
        } catch (_) {}

        if (typeof showToast === 'function') showToast(frameImg ? '已佩戴头像框！' : '已卸下头像框');
        const modalClose = document.getElementById('modalClose');
        if (modalClose) modalClose.click();
        const modalBody = document.getElementById('appModalBody');
        if (modalBody) window.renderMusicApp(modalBody);
    };

    window.openMusicEditProfileModal = function () {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('retroModalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalClose = document.getElementById('modalClose');
        if (!modal || !modalBody) return;

        let curName = '主播李敏';
        let curSign = '静听每一个治愈的心动瞬间';
        try {
            if (window.weMusicApi && window.weMusicApi.userInfo) {
                curName = window.weMusicApi.userInfo.nickname || curName;
                curSign = window.weMusicApi.userInfo.signature || curSign;
            } else if (window.G && window.G.player && window.G.player.name) {
                curName = window.G.player.name;
            }
        } catch (_) {}

        if (modalTitle) modalTitle.textContent = '编辑网易云个人名片';
        modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; padding: 10px 0; gap: 12px;">
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 12px; font-weight: 600; color: #333;">听歌昵称</label>
                    <input id="musicEditNameInput" type="text" value="${curName}" style="border: 0.5px solid #ccc; border-radius: 8px; padding: 8px 12px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box;" />
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 12px; font-weight: 600; color: #333;">听歌签名</label>
                    <input id="musicEditSignInput" type="text" value="${curSign}" style="border: 0.5px solid #ccc; border-radius: 8px; padding: 8px 12px; font-size: 13px; outline: none; width: 100%; box-sizing: border-box;" />
                </div>
                <div style="display: flex; gap: 10px; margin-top: 8px;">
                    <button onclick="document.getElementById('modalClose').click()" style="flex: 1; background: #f5f5f5; color: #666; border: none; border-radius: 16px; padding: 8px 0; font-size: 12px; cursor: pointer;">取消</button>
                    <button onclick="window.saveMusicProfileEdit()" style="flex: 2; background: #ec4141; color: #fff; border: none; border-radius: 16px; padding: 8px 0; font-size: 12px; font-weight: bold; cursor: pointer;">保存</button>
                </div>
            </div>
        `;
        modal.classList.add('open');
        if (modalClose) modalClose.onclick = () => modal.classList.remove('open');
    };

    window.saveMusicProfileEdit = function () {
        const nameInput = document.getElementById('musicEditNameInput');
        const signInput = document.getElementById('musicEditSignInput');
        if (!nameInput || !signInput) return;
        const newName = nameInput.value.trim() || '云音乐听友';
        const newSign = signInput.value.trim() || '静听每一个治愈的心动瞬间';

        if (!window.weMusicApi.userInfo) window.weMusicApi.userInfo = {};
        window.weMusicApi.userInfo.nickname = newName;
        window.weMusicApi.userInfo.signature = newSign;
        localStorage.setItem('mcyt_wemusic_user_info', JSON.stringify(window.weMusicApi.userInfo));

        if (typeof showToast === 'function') showToast('已保存网易云个人资料！');
        document.getElementById('modalClose').click();
        const modalBody = document.getElementById('appModalBody');
        if (modalBody) window.renderMusicApp(modalBody);
    };

    // 退出网易云账号
    window.logoutNeteaseAccount = function () {
        if (window.weMusicApi) {
            window.weMusicApi.logout();
            if (typeof showToast === 'function') showToast('已退出网易云登录');
            const modalBody = document.getElementById('appModalBody');
            if (modalBody) window.renderMusicApp(modalBody);
        }
    };

    // ============================================================
    // 📱 网易云手机验证码登录弹窗
    // ============================================================
    window.openNeteaseLoginModal = function () {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('retroModalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalClose = document.getElementById('modalClose');
        if (!modal || !modalBody) return;

        if (modalTitle) modalTitle.textContent = `网易云手机登录`;
        modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; padding: 10px 0; gap: 12px;">
                <div style="font-size: 12px; color: #666; line-height: 1.5;">
                    请输入网易云绑定的手机号，获取验证码后直接握手完成授权（手机本地直连，0服务器中转）。
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 11.5px; font-weight: 600; color: #333;">手机号码</label>
                    <input id="wemusicPhoneInput" type="tel" maxlength="11" placeholder="请输入11位手机号" style="
                        border: 0.5px solid #ccc; border-radius: 8px; padding: 8px 12px; font-size: 13px;
                        outline: none; -webkit-appearance: none; box-sizing: border-box; width: 100%;
                    " />
                </div>

                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 11.5px; font-weight: 600; color: #333;">短信验证码</label>
                    <div style="display: flex; gap: 8px;">
                        <input id="wemusicCaptchaInput" type="number" maxlength="6" placeholder="4或6位数字" style="
                            flex: 1; border: 0.5px solid #ccc; border-radius: 8px; padding: 8px 12px; font-size: 13px;
                            outline: none; -webkit-appearance: none; box-sizing: border-box;
                        " />
                        <button id="wemusicSendSmsBtn" onclick="window.doSendMusicCaptcha()" style="
                            background: #fdf1f1; color: #ec4141; border: 0.5px solid #ec4141; border-radius: 8px;
                            padding: 8px 12px; font-size: 11.5px; font-weight: bold; cursor: pointer; white-space: nowrap;
                        ">获取验证码</button>
                    </div>
                </div>

                <div id="wemusicLoginError" style="font-size: 11px; color: #ec4141; display: none;"></div>

                <div style="display: flex; gap: 10px; margin-top: 8px;">
                    <button onclick="document.getElementById('modalClose').click()" style="
                        flex: 1; background: #f5f5f5; color: #666; border: none; border-radius: 16px;
                        padding: 8px 0; font-size: 12px; cursor: pointer;
                    ">取消</button>
                    <button id="wemusicSubmitLoginBtn" onclick="window.doSubmitMusicLogin()" style="
                        flex: 2; background: #ec4141; color: #fff; border: none; border-radius: 16px;
                        padding: 8px 0; font-size: 12px; font-weight: bold; cursor: pointer;
                    ">验证并登录</button>
                </div>
            </div>
        `;
        modal.classList.add('open');
        if (modalClose) modalClose.onclick = () => modal.classList.remove('open');
    };

    window._smsCountdownTimer = null;

    window.doSendMusicCaptcha = async function () {
        const phoneInput = document.getElementById('wemusicPhoneInput');
        const sendBtn = document.getElementById('wemusicSendSmsBtn');
        const errDiv = document.getElementById('wemusicLoginError');
        if (!phoneInput || !sendBtn) return;

        const phone = phoneInput.value.trim();
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            if (errDiv) {
                errDiv.textContent = '请输入有效的11位中国大陆手机号码';
                errDiv.style.display = 'block';
            }
            return;
        }

        if (errDiv) errDiv.style.display = 'none';
        sendBtn.disabled = true;
        sendBtn.textContent = '发送中...';

        try {
            await window.weMusicApi.sendCaptcha(phone);
            if (typeof showToast === 'function') showToast('验证码已发送，请查收短信');

            let countdown = 60;
            sendBtn.textContent = `${countdown}s 后重发`;
            window._smsCountdownTimer = setInterval(() => {
                countdown--;
                if (countdown <= 0) {
                    clearInterval(window._smsCountdownTimer);
                    sendBtn.disabled = false;
                    sendBtn.textContent = '获取验证码';
                } else {
                    sendBtn.textContent = `${countdown}s 后重发`;
                }
            }, 1000);
        } catch (err) {
            sendBtn.disabled = false;
            sendBtn.textContent = '获取验证码';
            if (errDiv) {
                errDiv.textContent = err.message || '发送失败，请稍后重试';
                errDiv.style.display = 'block';
            }
        }
    };

    window.doSubmitMusicLogin = async function () {
        const phoneInput = document.getElementById('wemusicPhoneInput');
        const captchaInput = document.getElementById('wemusicCaptchaInput');
        const submitBtn = document.getElementById('wemusicSubmitLoginBtn');
        const errDiv = document.getElementById('wemusicLoginError');
        if (!phoneInput || !captchaInput || !submitBtn) return;

        const phone = phoneInput.value.trim();
        const captcha = captchaInput.value.trim();

        if (!phone || !captcha) {
            if (errDiv) {
                errDiv.textContent = '手机号与验证码不能为空';
                errDiv.style.display = 'block';
            }
            return;
        }

        if (errDiv) errDiv.style.display = 'none';
        submitBtn.disabled = true;
        submitBtn.textContent = '登录握手中...';

        try {
            const res = await window.weMusicApi.verifyCaptchaAndLogin(phone, captcha);
            if (typeof showToast === 'function') {
                showToast(`网易云登录成功！欢迎，${res.userInfo.nickname}`);
            }
            document.getElementById('modalClose').click();
            const modalBody = document.getElementById('appModalBody');
            if (modalBody) window.renderMusicApp(modalBody);
        } catch (err) {
            submitBtn.disabled = false;
            submitBtn.textContent = '验证并登录';
            if (errDiv) {
                errDiv.textContent = err.message || '登录失败，请核对验证码';
                errDiv.style.display = 'block';
            }
        }
    };

    // ============================================================
    // 🎧 沉浸全屏黑胶播放页
    // ============================================================
    window.openMusicPlayerModal = function () {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('retroModalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalClose = document.getElementById('modalClose');
        if (!modal || !modalBody) return;

        const state = window._weMusicEngine.getState();
        const track = state.track;

        if (modalTitle) modalTitle.textContent = `${track.title}`;
        modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; padding: 6px 0; max-height: 72vh; overflow-y: auto;">
                <div style="
                    width: 170px; height: 170px; border-radius: 50%;
                    background: radial-gradient(circle, #2a2a2a 0%, #151515 65%, #050505 100%);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.18), inset 0 0 0 2px rgba(255,255,255,0.08);
                    display: flex; align-items: center; justify-content: center; position: relative; margin-top: 6px;
                ">
                    <div id="wemusicModalVinylDisc" style="
                        width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center;
                        animation: wemusicSpin 14s linear infinite; ${state.isPlaying ? 'animation-play-state: running;' : 'animation-play-state: paused;'}
                    ">
                        <div style="position: absolute; width: 140px; height: 140px; border-radius: 50%; border: 0.5px solid rgba(255,255,255,0.06);"></div>
                        <div style="width: 70px; height: 70px; border-radius: 50%; overflow: hidden; border: 2.5px solid #111;">
                            <img src="${track.cover}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://p1.music.126.net/6y-5Y0C15jKEP4AET0BiDA==/109951164587635678.jpg?param=300y300';" />
                        </div>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 14px;">
                    <div style="font-size: 15px; font-weight: bold; color: #111;">${track.title}</div>
                    <div style="font-size: 12px; color: #888; margin-top: 2px;">${track.artist}</div>
                </div>

                <div id="wemusicLyricBox" style="
                    width: 100%; min-height: 90px; max-height: 120px; overflow-y: auto;
                    background: #f9f9f9; border-radius: 12px; padding: 12px 14px; margin-top: 12px;
                    display: flex; flex-direction: column; align-items: center; gap: 8px; box-sizing: border-box;
                ">
                    ${(track.lyrics && track.lyrics.length) ? track.lyrics.map((l, lIdx) => `
                        <div class="wemusic-lyric-line" style="text-align: center; font-size: 12px; transition: all 0.2s ease; color: ${lIdx === 0 ? '#ec4141; font-weight: bold;' : '#666;'};">
                            <div>${l.text}</div>
                            <div style="font-size: 10.5px; color: #999; margin-top: 2px; ${state.showTranslation ? '' : 'display:none;'}">${l.trans || ''}</div>
                        </div>
                    `).join('') : '<div style="font-size: 11.5px; color: #aaa;">纯音乐，静心聆听</div>'}
                </div>

                <div style="display: flex; align-items: center; justify-content: space-around; width: 100%; margin-top: 14px; padding: 0 10px;">
                    <div onclick="window._weMusicEngine.toggleFavorite(window._weMusicEngine.currentTrack); window.openMusicPlayerModal();" style="cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: ${state.isFav ? '#ec4141' : '#777'};">
                        <span>${state.isFav ? '❤️ 已收藏' : '🤍 收藏'}</span>
                    </div>

                    <div onclick="window.toggleMusicTranslation()" style="cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: #ec4141; background: #fdf1f1; padding: 3px 8px; border-radius: 10px;">
                        <span>译 ${state.showTranslation ? '开' : '关'}</span>
                    </div>

                    <div onclick="window.shareCurrentMusicToChat()" style="cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: #555;">
                        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: currentColor;"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92z"/></svg>
                        <span>分享到私聊</span>
                    </div>
                </div>

                <div style="width: 90%; margin-top: 14px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #999; margin-bottom: 4px;">
                        <span id="wemusicModalCurTime">${formatTime(state.currentTime)}</span>
                        <span id="wemusicModalDurTime">${formatTime(state.duration)}</span>
                    </div>
                    <div style="width: 100%; height: 4px; background: #e5e5e5; border-radius: 2px; position: relative; cursor: pointer;" onclick="window.seekWeMusic(event)">
                        <div id="wemusicModalProgressBar" style="width: ${(state.progress * 100).toFixed(2)}%; height: 100%; background: #ec4141; border-radius: 2px;"></div>
                    </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 16px;">
                    <div onclick="window._weMusicEngine.prev(); window.openMusicPlayerModal();" style="cursor: pointer; color: #444;">
                        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor;"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                    </div>
                    <div onclick="window._weMusicEngine.togglePlay(); window.openMusicPlayerModal();" style="
                        width: 48px; height: 48px; border-radius: 50%; background: #ec4141;
                        display: flex; align-items: center; justify-content: center; color: #ffffff; cursor: pointer;
                        box-shadow: 0 4px 12px rgba(236,65,65,0.35);
                    ">
                        ${state.isPlaying ? `
                            <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: currentColor;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        ` : `
                            <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: currentColor; margin-left: 2px;"><path d="M8 5v14l11-7z"/></svg>
                        `}
                    </div>
                    <div onclick="window._weMusicEngine.next(); window.openMusicPlayerModal();" style="cursor: pointer; color: #444;">
                        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor;"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                    </div>
                </div>

            </div>
        `;
        modal.classList.add('open');
        if (modalClose) modalClose.onclick = () => modal.classList.remove('open');
    };

    window.toggleMusicTranslation = function () {
        window._weMusicEngine.showTranslation = !window._weMusicEngine.showTranslation;
        window.openMusicPlayerModal();
    };

    window.shareCurrentMusicToChat = function () {
        const track = window._weMusicEngine.currentTrack;
        const modal = document.getElementById('modal');
        if (modal) modal.classList.remove('open');

        try {
            let activeNpcId = window.G?.currentChatNpcId;
            if (!activeNpcId && window.G?.customNpcs) {
                const npcs = Object.keys(window.G.customNpcs);
                if (npcs.length) activeNpcId = npcs[0];
            }
            if (activeNpcId && typeof window.pushChatMessageSafe === 'function') {
                const shareText = `[音乐分享] 🎵 《${track.title}》- ${track.artist}\n一起来听听这首歌吧~`;
                window.pushChatMessageSafe(activeNpcId, {
                    sender: 'player',
                    text: shareText,
                    type: 'music_card',
                    musicInfo: {
                        id: track.id,
                        title: track.title,
                        artist: track.artist,
                        cover: track.cover,
                        url: track.url
                    }
                });
                if (typeof showToast === 'function') showToast(`已将《${track.title}》分享到聊天私聊！`);
            } else {
                if (typeof showToast === 'function') showToast(`已生成《${track.title}》卡片！`);
            }
        } catch (e) {
            console.warn('[ShareMusic] 分享异常:', e);
        }
        window.openPhoneApp('chat');
    };
})();
