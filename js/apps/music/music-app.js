/**
 * js/apps/music/music-app.js
 * 🎵 独立微音音乐中枢 (WeMusic) 视图与交互中心
 * 职责：
 * 1. 首页推荐（真·随机网易云热门分类换一批、网易云 CDN 高清原图直连）。
 * 2. 进门优先检测网易云登录并弹出微绿提示卡片（支持快速跳过体验游客模式）。
 * 3. 手机验证码登录弹窗（输入手机号、获取验证码、一键登录换取Cookie与真实资料）。
 * 4. 推荐歌单展示（联动 music-npc-playlists.js，支持每次刷新1~3人，多歌单轮询）。
 * 5. 沉浸播放视口（黑胶自转、歌词滚动与翻译、转发到私聊/群聊卡片）。
 * 6. 全局悬浮音乐黑胶球与胶囊控制条。
 * 7. 我的界面（用户资料编辑、网易云直连握手卡片、红心收藏）。
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

    function formatTime(sec) {
        if (!sec || isNaN(sec)) return '00:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // ============================================================
    // 🌐 全局音乐悬浮球驱动系统
    // ============================================================
    window._isMusicCapsuleExpanded = false;

    window.showMusicFloatingWidget = function () {
        const floatEl = document.getElementById('wemusicFloatingWidget');
        if (floatEl) {
            floatEl.style.display = 'flex';
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

        if (coverEl && coverEl.src !== state.track.cover) coverEl.src = state.track.cover;
        if (titleEl) titleEl.textContent = state.track.title;

        if (discInner) {
            discInner.style.animationPlayState = state.isPlaying ? 'running' : 'paused';
        }

        if (playBtn) {
            playBtn.innerHTML = state.isPlaying ? `
                <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; fill: currentColor;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ` : `
                <svg viewBox="0 0 24 24" style="width: 15px; height: 15px; fill: currentColor;"><path d="M8 5v14l11-7z"/></svg>
            `;
        }

        if (bars && bars.length) {
            bars.forEach(b => {
                b.style.height = state.isPlaying ? `${Math.floor(Math.random() * 9 + 3)}px` : '3px';
            });
        }
    };

    // ============================================================
    // 🎨 微音 App 主界面渲染
    // ============================================================
    window._weMusicCurrentTab = 'explore';

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
                background: #f7f7f7; height: 100%; display: flex; flex-direction: column;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                box-sizing: border-box; overflow: hidden; color: #222;
                padding-top: calc(var(--status-bar-height, 40px) + 2px);
            ">
                <!-- 顶栏与原生微信白灰微绿分段器 -->
                <div style="height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; background: #ffffff; border-bottom: 0.5px solid #eeeeee;">
                    <div onclick="window.closePhoneApp()" style="display: flex; align-items: center; gap: 4px; font-size: 14px; color: #333; cursor: pointer;">
                        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                        <span>返回</span>
                    </div>

                    <!-- 三段导航药丸 -->
                    <div style="display: flex; background: #f0f0f0; border-radius: 16px; padding: 2px;">
                        <div onclick="window.switchMusicTab('explore')" style="padding: 4px 12px; font-size: 12px; font-weight: 600; border-radius: 14px; cursor: pointer; ${tab === 'explore' ? 'background:#07c160; color:#fff;' : 'color:#666;'}">推荐</div>
                        <div onclick="window.switchMusicTab('playlists')" style="padding: 4px 12px; font-size: 12px; font-weight: 600; border-radius: 14px; cursor: pointer; ${tab === 'playlists' ? 'background:#07c160; color:#fff;' : 'color:#666;'}">角色歌单</div>
                        <div onclick="window.switchMusicTab('mine')" style="padding: 4px 12px; font-size: 12px; font-weight: 600; border-radius: 14px; cursor: pointer; ${tab === 'mine' ? 'background:#07c160; color:#fff;' : 'color:#666;'}">我的</div>
                    </div>

                    <!-- 快速打开全屏播放沉浸页 -->
                    <div onclick="window.openMusicPlayerModal()" style="cursor: pointer; color: #07c160; display: flex; align-items: center;">
                        <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: currentColor;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                    </div>
                </div>

                <!-- 视口内容区域 -->
                <div id="wemusicTabContent" style="flex: 1; overflow-y: auto; box-sizing: border-box; padding: 14px;">
                    ${contentHTML}
                </div>

                <!-- 底部吸底微信原生微缩播放条 -->
                <div style="
                    height: 52px; background: #ffffff; border-top: 0.5px solid #eaeaea;
                    display: flex; align-items: center; justify-content: space-between; padding: 0 16px;
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.03); cursor: pointer;
                " onclick="window.openMusicPlayerModal()">
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: #111; flex-shrink: 0;">
                            <img src="${state.track.cover}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://p1.music.126.net/6y-5Y0C15jKEP4AET0BiDA==/109951164587635678.jpg?param=300y300';" />
                        </div>
                        <div style="min-width: 0; flex: 1;">
                            <div style="font-size: 13px; font-weight: 600; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${state.track.title}</div>
                            <div style="font-size: 11px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${state.track.artist}</div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 14px;" onclick="event.stopPropagation()">
                        <div onclick="window._weMusicEngine.prev()" style="cursor: pointer; color: #555;">
                            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                        </div>
                        <div onclick="window._weMusicEngine.togglePlay()" style="
                            width: 32px; height: 32px; border-radius: 50%; background: #07c160;
                            display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer;
                        ">
                            ${state.isPlaying ? `
                                <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ` : `
                                <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: currentColor; margin-left: 1.5px;"><path d="M8 5v14l11-7z"/></svg>
                            `}
                        </div>
                        <div onclick="window._weMusicEngine.next()" style="cursor: pointer; color: #555;">
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

    // 1. 首页推荐视口（含进门登录提醒卡片 + 真随机热门）
    window._renderMusicTabExplore = function (state) {
        const isLogged = window.weMusicApi && window.weMusicApi.isLoggedIn();
        const dismissed = window.weMusicApi && window.weMusicApi.hasDismissedLoginPrompt();

        // 进门原生提醒卡片（如果尚未登录且未主动点击暂不登录）
        let loginNoticeHTML = '';
        if (!isLogged && !dismissed) {
            loginNoticeHTML = `
                <div id="wemusicLoginBanner" style="
                    background: #ffffff; border-radius: 14px; padding: 14px; border: 0.5px solid #d5edd9;
                    box-shadow: 0 2px 10px rgba(7,193,96,0.08); display: flex; flex-direction: column; gap: 8px;
                    border-left: 4px solid #07c160;
                ">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="font-size: 13.5px; font-weight: bold; color: #111; display: flex; align-items: center; gap: 6px;">
                            <span>🎵</span>
                            <span>开启你的网易云听歌生态</span>
                        </div>
                        <span onclick="window.dismissMusicLoginBanner()" style="font-size: 12px; color: #999; cursor: pointer; padding: 2px 4px;">✕</span>
                    </div>
                    <div style="font-size: 11.5px; color: #666; line-height: 1.5;">
                        使用手机验证码直接登录网易云，同步每日私享推荐、专属歌单与红心收藏。
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                        <button onclick="window.openNeteaseLoginModal()" style="
                            background: #07c160; color: #fff; border: none; border-radius: 14px;
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

                <div style="
                    background: linear-gradient(135deg, #07c160, #059649); border-radius: 16px; padding: 18px;
                    color: #ffffff; box-shadow: 0 4px 16px rgba(7,193,96,0.25); position: relative; overflow: hidden;
                ">
                    <div style="font-size: 11px; opacity: 0.85; letter-spacing: 0.5px;">DAILY RADAR · 每日私享雷达</div>
                    <div style="font-size: 18px; font-weight: bold; margin-top: 4px;">今日专属精选音轨</div>
                    <div style="font-size: 12px; opacity: 0.9; margin-top: 6px;">根据你的喜好与角色的双向羁绊，精选 3 首治愈旋律</div>
                    <button onclick="window._weMusicEngine.play(0)" style="
                        margin-top: 14px; background: #ffffff; color: #059649; border: none; border-radius: 20px;
                        padding: 6px 14px; font-size: 12px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                    ">▶ 立即播放日推</button>
                </div>

                <div style="background: #ffffff; border-radius: 14px; padding: 14px; border: 0.5px solid #eaeaea;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <div style="font-size: 14px; font-weight: bold; color: #111;">热门私藏推荐</div>
                        <div style="
                            font-size: 11.5px; color: #07c160; cursor: pointer; display: flex; align-items: center; gap: 3px;
                            background: #eef9f2; padding: 3px 8px; border-radius: 12px;
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
                                ${state.track.id === track.id ? 'background: #f0fbf4;' : 'background: #fafafa;'}
                            " onclick="window._weMusicEngine.play(${idx})">
                                <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                                    <div style="width: 40px; height: 40px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: #eee;">
                                        <img src="${track.cover}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://p1.music.126.net/6y-5Y0C15jKEP4AET0BiDA==/109951164587635678.jpg?param=300y300';" />
                                    </div>
                                    <div style="min-width: 0; flex: 1;">
                                        <div style="font-size: 13px; font-weight: 600; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${track.title}</div>
                                        <div style="font-size: 11px; color: #888; margin-top: 2px;">${track.artist} · ${track.album}</div>
                                    </div>
                                </div>
                                <div style="color: ${state.track.id === track.id ? '#07c160' : '#bbb'}; padding-left: 8px;">
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
                        display: flex; align-items: center; gap: 4px; font-size: 11px; color: #07c160;
                        background: #eef9f2; padding: 4px 10px; border-radius: 12px; cursor: pointer;
                    " onclick="window.refreshNpcMusicPlaylists()">
                        <svg viewBox="0 0 24 24" style="width: 13px; height: 13px; fill: currentColor;"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                        <span>刷新 1~3 位角色歌单</span>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${playlists.map((pl, pIdx) => `
                        <div style="background: #ffffff; border-radius: 14px; padding: 14px; border: 0.5px solid #eaeaea;">
                            <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 10px; border-bottom: 0.5px solid #f2f2f2;">
                                <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;" onclick="window.openNpcMusicProfileModal('${pl.npcId}')">
                                    <div style="width: 44px; height: 44px; border-radius: 50%; overflow: hidden; border: 1.5px solid #07c160;">
                                        <img src="${pl.npcAvatar}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://p1.music.126.net/6y-5Y0C15jKEP4AET0BiDA==/109951164587635678.jpg?param=300y300';" />
                                    </div>
                                    <div>
                                        <div style="font-size: 13.5px; font-weight: bold; color: #111;">${pl.npcName}</div>
                                        <div style="font-size: 11px; color: #888; margin-top: 2px;">点击进入角色音乐主页 ➔</div>
                                    </div>
                                </div>
                                <button onclick="window.playNpcEntirePlaylist(${pIdx})" style="
                                    background: #07c160; color: #fff; border: none; border-radius: 16px;
                                    padding: 5px 12px; font-size: 11px; font-weight: bold; cursor: pointer;
                                ">播放全部</button>
                            </div>

                            <div style="margin-top: 10px;">
                                <div style="font-size: 13px; font-weight: 600; color: #222;">${pl.playlistTitle}</div>
                                <div style="font-size: 11.5px; color: #777; margin-top: 3px; line-height: 1.4;">${pl.desc}</div>
                                <div style="display: flex; gap: 6px; margin-top: 8px;">
                                    ${pl.tags.map(tag => `<span style="font-size: 10px; background: #f0f0f0; color: #666; padding: 2px 6px; border-radius: 4px;"># ${tag}</span>`).join('')}
                                </div>
                            </div>

                            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
                                ${pl.tracks.map((track) => `
                                    <div style="
                                        display: flex; align-items: center; justify-content: space-between;
                                        background: #fafafa; border-radius: 8px; padding: 7px 10px; cursor: pointer;
                                    " onclick="window.playSpecificTrackDirectly(${JSON.stringify(track).replace(/"/g, '&quot;')})">
                                        <div style="font-size: 12px; color: #333; font-weight: 500;">🎵 ${track.title}</div>
                                        <div style="font-size: 11px; color: #07c160; font-weight: 600;">播放</div>
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

    // 角色音乐专属主页弹窗
    window.openNpcMusicProfileModal = function (npcId) {
        const playlists = (typeof window.getNpcMusicPlaylists === 'function') ? window.getNpcMusicPlaylists() : [];
        const pl = playlists.find(p => p.npcId === npcId) || playlists[0];

        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('retroModalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalClose = document.getElementById('modalClose');
        if (!modal || !modalBody) return;

        if (modalTitle) modalTitle.textContent = `${pl.npcName} · 音乐主页`;
        modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; padding: 10px 0;">
                <div style="width: 64px; height: 64px; border-radius: 50%; overflow: hidden; border: 2px solid #07c160; box-shadow: 0 4px 12px rgba(7,193,96,0.25);">
                    <img src="${pl.npcAvatar}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://p1.music.126.net/6y-5Y0C15jKEP4AET0BiDA==/109951164587635678.jpg?param=300y300';" />
                </div>
                <div style="font-size: 15px; font-weight: bold; color: #111; margin-top: 8px;">${pl.npcName}</div>
                <div style="font-size: 11.5px; color: #777; margin-top: 3px; text-align: center; padding: 0 10px;">${pl.desc}</div>

                <div style="width: 100%; margin-top: 16px; border-top: 0.5px solid #eee; padding-top: 12px;">
                    <div style="font-size: 12.5px; font-weight: bold; color: #333; margin-bottom: 8px;">ta 最近在听：</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${pl.tracks.map(t => `
                            <div style="display: flex; align-items: center; justify-content: space-between; background: #f8f8f8; padding: 8px 10px; border-radius: 8px;">
                                <div style="font-size: 12px; color: #222;">${t.title}</div>
                                <button onclick="window.playSpecificTrackDirectly(${JSON.stringify(t).replace(/"/g, '&quot;')}); document.getElementById('modalClose').click();" style="
                                    background: #07c160; color: #fff; border: none; border-radius: 12px; padding: 3px 10px; font-size: 11px; cursor: pointer;
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

    // 3. 我的界面（支持网易云登录态展示）
    window._renderMusicTabMine = function (state) {
        let userName = '主播李敏';
        let userSign = '记录日常与每个心动的旋律';
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

        return `
            <div style="display: flex; flex-direction: column; gap: 14px;">
                <div style="background: #ffffff; border-radius: 14px; padding: 16px; border: 0.5px solid #eaeaea; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 52px; height: 52px; border-radius: 50%; overflow: hidden; background: #eee;">
                            <img src="${userAvatar}" style="width: 100%; height: 100%; object-fit: cover;" />
                        </div>
                        <div>
                            <div style="font-size: 15px; font-weight: bold; color: #111;">${userName}</div>
                            <div style="font-size: 11px; color: #888; margin-top: 3px;">${userSign}</div>
                        </div>
                    </div>
                    <button onclick="window.openMusicEditProfileModal()" style="
                        background: #f0f0f0; border: none; border-radius: 14px; padding: 5px 12px; font-size: 11px; color: #333; cursor: pointer;
                    ">编辑</button>
                </div>

                <div style="background: #ffffff; border-radius: 14px; padding: 14px; border: 0.5px solid #eaeaea;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 24px; height: 24px; border-radius: 50%; background: #e60026; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: bold;">网</div>
                            <div>
                                <div style="font-size: 13px; font-weight: 600; color: #111;">网易云账号连接 (0服务器负担)</div>
                                <div style="font-size: 10.5px; color: ${isLogged ? '#07c160' : '#888'}; margin-top: 1px;">
                                    ${isLogged ? `已连接：${userName}` : '未连接网易云账号'}
                                </div>
                            </div>
                        </div>
                        <button onclick="${isLogged ? 'window.logoutNeteaseAccount()' : 'window.openNeteaseLoginModal()'}" style="
                            background: ${isLogged ? '#ff4757' : '#07c160'}; color: #fff; border: none; border-radius: 14px; padding: 4px 10px; font-size: 11px; font-weight: bold; cursor: pointer;
                        ">${isLogged ? '退出' : '验证码登录'}</button>
                    </div>
                    <div style="font-size: 11px; color: #888; margin-top: 6px; line-height: 1.4;">
                        直接在手机本地安全直连网易云接口，同步红心歌单与专属身份。
                    </div>
                </div>

                <div style="background: #ffffff; border-radius: 14px; padding: 14px; border: 0.5px solid #eaeaea;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="color: #ff4757; font-size: 16px;">❤</span>
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
                                        background: #07c160; color: #fff; border: none; border-radius: 10px; padding: 2px 8px; font-size: 10.5px; cursor: pointer;
                                    ">播放</button>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    };

    window.openMusicEditProfileModal = function () {
        if (typeof showToast === 'function') showToast('已保存个人听歌签名！');
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
                            background: #f0f0f0; color: #07c160; border: 0.5px solid #07c160; border-radius: 8px;
                            padding: 8px 12px; font-size: 11.5px; font-weight: bold; cursor: pointer; white-space: nowrap;
                        ">获取验证码</button>
                    </div>
                </div>

                <div id="wemusicLoginError" style="font-size: 11px; color: #ff4757; display: none;"></div>

                <div style="display: flex; gap: 10px; margin-top: 8px;">
                    <button onclick="document.getElementById('modalClose').click()" style="
                        flex: 1; background: #f5f5f5; color: #666; border: none; border-radius: 16px;
                        padding: 8px 0; font-size: 12px; cursor: pointer;
                    ">取消</button>
                    <button id="wemusicSubmitLoginBtn" onclick="window.doSubmitMusicLogin()" style="
                        flex: 2; background: #07c160; color: #fff; border: none; border-radius: 16px;
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
                        <div style="text-align: center; font-size: 12px; color: ${lIdx === 0 ? '#07c160; font-weight: bold;' : '#666;'};">
                            <div>${l.text}</div>
                            <div style="font-size: 10.5px; color: #999; margin-top: 2px; ${state.showTranslation ? '' : 'display:none;'}">${l.trans || ''}</div>
                        </div>
                    `).join('') : '<div style="font-size: 11.5px; color: #aaa;">纯音乐，静心聆听</div>'}
                </div>

                <div style="display: flex; align-items: center; justify-content: space-around; width: 100%; margin-top: 14px; padding: 0 10px;">
                    <div onclick="window._weMusicEngine.toggleFavorite(window._weMusicEngine.currentTrack); window.openMusicPlayerModal();" style="cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: ${state.isFav ? '#ff4757' : '#777'};">
                        <span>${state.isFav ? '❤️ 已收藏' : '🤍 收藏'}</span>
                    </div>

                    <div onclick="window.toggleMusicTranslation()" style="cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: #07c160; background: #eef9f2; padding: 3px 8px; border-radius: 10px;">
                        <span>译 ${state.showTranslation ? '开' : '关'}</span>
                    </div>

                    <div onclick="window.shareCurrentMusicToChat()" style="cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: #555;">
                        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: currentColor;"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92z"/></svg>
                        <span>分享到私聊</span>
                    </div>
                </div>

                <div style="width: 90%; margin-top: 14px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #999; margin-bottom: 4px;">
                        <span>${formatTime(state.currentTime)}</span>
                        <span>${formatTime(state.duration)}</span>
                    </div>
                    <div style="width: 100%; height: 4px; background: #e5e5e5; border-radius: 2px; position: relative; cursor: pointer;" onclick="window.seekWeMusic(event)">
                        <div style="width: ${(state.progress * 100).toFixed(2)}%; height: 100%; background: #07c160; border-radius: 2px;"></div>
                    </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 16px;">
                    <div onclick="window._weMusicEngine.prev(); window.openMusicPlayerModal();" style="cursor: pointer; color: #444;">
                        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor;"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                    </div>
                    <div onclick="window._weMusicEngine.togglePlay(); window.openMusicPlayerModal();" style="
                        width: 48px; height: 48px; border-radius: 50%; background: #07c160;
                        display: flex; align-items: center; justify-content: center; color: #ffffff; cursor: pointer;
                        box-shadow: 0 4px 12px rgba(7,193,96,0.3);
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

        if (typeof showToast === 'function') {
            showToast(`已生成「${track.title}」音乐卡片，快去私聊发给同伴一起听吧！`);
        }
        window.openPhoneApp('chat');
    };
})();
