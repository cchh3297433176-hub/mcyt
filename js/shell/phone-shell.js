/**
 * js/shell/phone-shell.js
 * 📱 虚拟手机硬件外壳与操作系统驱动层
 * 职责：时钟、硬件电量、网络/蓝牙感知、壁纸加载、冷启动主题恢复、自动明暗反色引擎、
 *       手势解锁与 App 调度、桌面双页平滑滑屏手势、左日历右待办双组件并排渲染、
 *       纯净游戏向一日待办智能排布算法
 */

(function () {
    'use strict';

    // 全局硬件感知状态缓存
    window._phoneBatteryState = {
        level: 100,
        charging: false,
        supported: false
    };

    window._phoneNetworkState = {
        type: 'wifi',     // 'wifi' | 'cellular' | 'none'
        online: true,
        bluetooth: false
    };

    // 获取当前设备的时段分类名称与真实状态
    window.getPhoneDeviceState = function () {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const pad = (n) => String(n).padStart(2, '0');
        const timeStr = `${pad(hour)}:${pad(minute)}`;

        let timeSlotName = '白天';
        let isLateNight = false;

        if (hour >= 23 || hour < 5) {
            timeSlotName = '深夜/睡眠时段';
            isLateNight = true;
        } else if (hour >= 5 && hour < 8) {
            timeSlotName = '清晨';
        } else if (hour >= 8 && hour < 11) {
            timeSlotName = '上午';
        } else if (hour >= 11 && hour < 13) {
            timeSlotName = '中午';
        } else if (hour >= 13 && hour < 18) {
            timeSlotName = '下午';
        } else if (hour >= 18 && hour < 23) {
            timeSlotName = '傍晚/夜间';
        }

        return {
            timeStr,
            hour,
            minute,
            timeSlotName,
            isLateNight,
            battery: Object.assign({}, window._phoneBatteryState),
            network: Object.assign({}, window._phoneNetworkState)
        };
    };

    // 1. 系统时钟引擎
    function updatePhoneClock() {
        try {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const timeStr = `${h}:${m}`;

            const months = now.getMonth() + 1;
            const dates = now.getDate();
            const weeks = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const dateStr = `${months}月${dates}日 ${weeks[now.getDay()]}`;

            const sTime = document.getElementById('statusTimeText');
            const lClock = document.getElementById('lockClockText');
            const lDate = document.getElementById('lockDateText');
            if (sTime) sTime.textContent = timeStr;
            if (lClock) lClock.textContent = timeStr;
            if (lDate) lDate.textContent = dateStr;
        } catch (e) {
            console.warn('[Phone Clock Error]:', e);
        }
    }

    // 2. 真实网络与蓝牙状态嗅探
    function bindPhoneNetworkAndBluetooth() {
        const wifiSvg = document.getElementById('wifiSvg');
        const cellSvg = document.getElementById('statusCellularSvg');
        const btSvg = document.getElementById('statusBluetoothSvg');

        function updateNetworkDisplay() {
            const isOnline = navigator.onLine !== false;
            window._phoneNetworkState.online = isOnline;

            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            let isCellular = false;

            if (conn) {
                const type = conn.type;
                if (type === 'cellular' || type === 'wimax' || conn.effectiveType === '4g' || conn.effectiveType === '3g' || conn.effectiveType === '2g') {
                    isCellular = true;
                }
            }

            window._phoneNetworkState.type = isCellular ? 'cellular' : (isOnline ? 'wifi' : 'none');

            if (!isOnline) {
                if (wifiSvg) { wifiSvg.style.display = 'block'; wifiSvg.style.opacity = '0.35'; }
                if (cellSvg) { cellSvg.style.display = 'none'; }
            } else if (isCellular) {
                if (wifiSvg) wifiSvg.style.display = 'none';
                if (cellSvg) { cellSvg.style.display = 'block'; cellSvg.style.opacity = '1'; }
            } else {
                if (wifiSvg) { wifiSvg.style.display = 'block'; wifiSvg.style.opacity = '1'; }
                if (cellSvg) cellSvg.style.display = 'none';
            }
        }

        updateNetworkDisplay();
        window.addEventListener('online', updateNetworkDisplay);
        window.addEventListener('offline', updateNetworkDisplay);

        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn && typeof conn.addEventListener === 'function') {
            conn.addEventListener('change', updateNetworkDisplay);
        }

        try {
            if ('bluetooth' in navigator && btSvg) {
                if (typeof navigator.bluetooth.getAvailability === 'function') {
                    navigator.bluetooth.getAvailability().then(available => {
                        window._phoneNetworkState.bluetooth = !!available;
                        btSvg.style.display = available ? 'block' : 'none';
                    }).catch(() => {});
                }
            }
        } catch (_) {}
    }

    // 3. 硬件电量与呼吸灯监听
    async function bindPhoneBattery() {
        try {
            const core = document.getElementById('batteryCoreBar');
            const text = document.getElementById('batteryPercentText');
            const star = document.getElementById('chargingStarIcon');
            if (!core || !text || !star) return;

            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                const applyBatteryState = () => {
                    const level = Math.round(battery.level * 100);
                    text.textContent = `${level}%`;
                    core.style.width = `${level}%`;
                    
                    window._phoneBatteryState.level = level;
                    window._phoneBatteryState.charging = !!battery.charging;
                    window._phoneBatteryState.supported = true;

                    if (battery.charging) {
                        star.classList.add('active');
                    } else {
                        star.classList.remove('active');
                    }
                };
                applyBatteryState();
                battery.addEventListener('levelchange', applyBatteryState);
                battery.addEventListener('chargingchange', applyBatteryState);
            }
        } catch (e) {}
    }

    // 4. Canvas 内存壁纸取色引擎（稳定异步抓取与明暗反色）
    window.analyzeImageLuminance = function (imageUrl, callback) {
        if (!imageUrl) {
            if (typeof callback === 'function') callback(false);
            return;
        }
        try {
            const img = new Image();
            if (!imageUrl.startsWith('data:')) {
                img.crossOrigin = "Anonymous";
            }
            img.onload = function () {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 80;
                    canvas.height = 80;
                    ctx.drawImage(img, 0, 0, 80, 24, 0, 0, 80, 24);
                    const imgData = ctx.getImageData(0, 0, 80, 24).data;
                    let totalLuminance = 0;
                    let count = 0;
                    for (let i = 0; i < imgData.length; i += 4) {
                        const r = imgData[i];
                        const g = imgData[i + 1];
                        const b = imgData[i + 2];
                        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                        totalLuminance += luma;
                        count++;
                    }
                    const avgLuma = totalLuminance / (count || 1);
                    if (typeof callback === 'function') callback(avgLuma > 135);
                } catch (err) {
                    if (typeof callback === 'function') callback(false);
                }
            };
            img.onerror = function () {
                if (typeof callback === 'function') callback(false);
            };
            img.src = imageUrl;
        } catch (e) {
            if (typeof callback === 'function') callback(false);
        }
    };

    // 5. 全局主题颜色生效核心
    window.applyColorTheme = function (isLightBg) {
        try {
            const root = document.documentElement;
            const mode = window.currentThemeMode || localStorage.getItem('mcyt_phone_theme_mode') || 'auto';

            if (mode === 'custom') {
                const customColor = localStorage.getItem('mcyt_phone_custom_color') || '#ff5c8a';
                root.style.setProperty('--status-color', customColor);
                root.style.setProperty('--lock-text-color', customColor);
                root.style.setProperty('--status-svg-fill', customColor);
                root.style.setProperty('--star-glow-color', customColor);
            } else if (mode === 'dark') {
                root.style.setProperty('--status-color', '#ffffff');
                root.style.setProperty('--lock-text-color', '#ffffff');
                root.style.setProperty('--status-svg-fill', '#ffffff');
                root.style.setProperty('--star-glow-color', 'rgba(255, 255, 255, 0.9)');
            } else if (mode === 'light') {
                root.style.setProperty('--status-color', '#2e1a22');
                root.style.setProperty('--lock-text-color', '#2e1a22');
                root.style.setProperty('--status-svg-fill', '#2e1a22');
                root.style.setProperty('--star-glow-color', 'rgba(46, 26, 34, 0.65)');
            } else {
                if (isLightBg) {
                    root.style.setProperty('--status-color', '#2e1a22');
                    root.style.setProperty('--lock-text-color', '#2e1a22');
                    root.style.setProperty('--status-svg-fill', '#2e1a22');
                    root.style.setProperty('--star-glow-color', 'rgba(46, 26, 34, 0.65)');
                } else {
                    root.style.setProperty('--status-color', '#ffffff');
                    root.style.setProperty('--lock-text-color', '#ffffff');
                    root.style.setProperty('--status-svg-fill', '#ffffff');
                    root.style.setProperty('--star-glow-color', 'rgba(255, 255, 255, 0.9)');
                }
            }

            const savedIconColor = localStorage.getItem('mcyt_icon_label_color') || '#ffffff';
            root.style.setProperty('--app-icon-label-color', savedIconColor);

            const customPink = localStorage.getItem('mcyt_custom_main_pink');
            const customWhite = localStorage.getItem('mcyt_custom_main_white');
            if (customPink) root.style.setProperty('--theme-main-pink', customPink);
            if (customWhite) {
                root.style.setProperty('--theme-main-white', customWhite);
                root.style.setProperty('--theme-sub-white', customWhite);
            }

            const sStroke = localStorage.getItem('mcyt_statusbar_stroke') || 'none';
            const sFill = localStorage.getItem('mcyt_statusbar_fill') || 'transparent';
            const sBgImg = localStorage.getItem('mcyt_statusbar_bg_img') || 'none';
            root.style.setProperty('--status-bar-stroke', sStroke);
            root.style.setProperty('--status-bar-fill', sFill);
            root.style.setProperty('--status-bar-bg-img', sBgImg.startsWith('data:') ? `url('${sBgImg}')` : sBgImg);
        } catch (e) {
            console.warn('[ApplyColorTheme Error]:', e);
        }
    };

    // 6. 手机冷启动主题与壁纸恢复
    function initPhoneThemeAndWallpapers() {
        try {
            const root = document.documentElement;
            const savedLock = localStorage.getItem('mcyt_custom_lock_bg');
            const savedDesktop = localStorage.getItem('mcyt_custom_desktop_bg');
            const savedMode = localStorage.getItem('mcyt_phone_theme_mode') || 'auto';
            window.currentThemeMode = savedMode;

            if (savedLock && savedLock.startsWith('data:image')) {
                root.style.setProperty('--lock-bg-url', `url('${savedLock}')`);
            } else {
                root.style.setProperty('--lock-bg-url', `url('assets/system/default_lock.jpg')`);
            }

            if (savedDesktop && savedDesktop.startsWith('data:image')) {
                root.style.setProperty('--desktop-bg-url', `url('${savedDesktop}')`);
            } else {
                root.style.setProperty('--desktop-bg-url', `url('assets/system/default_desktop.jpg')`);
            }

            if (savedMode === 'custom') {
                window.applyColorTheme(false);
            } else if (savedMode === 'dark') {
                window.applyColorTheme(false);
            } else if (savedMode === 'light') {
                window.applyColorTheme(true);
            } else {
                const targetWallpaper = (savedLock && savedLock.startsWith('data:image')) ? savedLock : 'assets/system/default_lock.jpg';
                window.analyzeImageLuminance(targetWallpaper, window.applyColorTheme);
            }
        } catch (e) {
            console.warn('[Theme Init Error]:', e);
        }
    }

    // 7. 锁屏手势与解锁机制
    function initLockGestures() {
        const screenLock = document.getElementById('screenLock');
        const lockBtn = document.getElementById('lockBtn');
        if (!screenLock) return;

        window.unlockPhoneScreen = function () {
            screenLock.classList.add('unlocked');
            screenLock.style.pointerEvents = 'none';
        };

        window.lockPhoneScreen = function () {
            if (typeof window.closePhoneApp === 'function') {
                window.closePhoneApp();
            }
            screenLock.classList.remove('unlocked');
            screenLock.style.pointerEvents = 'auto';
        };

        screenLock.addEventListener('click', function () {
            window.unlockPhoneScreen();
        });

        let touchStartY = 0;
        screenLock.addEventListener('touchstart', function (e) {
            if (e.touches && e.touches.length) {
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        screenLock.addEventListener('touchend', function (e) {
            if (e.changedTouches && e.changedTouches.length) {
                const touchEndY = e.changedTouches[0].clientY;
                if (touchStartY - touchEndY > 30 || Math.abs(touchStartY - touchEndY) < 10) {
                    window.unlockPhoneScreen();
                }
            }
        }, { passive: true });

        if (lockBtn) {
            lockBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                window.lockPhoneScreen();
            });
        }
    }

    // 8. 桌面双页滑屏手势驱动器（按 100% 精确平移，消除拉伸腰斩）
    let currentDesktopPage = 0;
    window.switchDesktopPage = function (pageIndex) {
        currentDesktopPage = pageIndex === 1 ? 1 : 0;
        const track = document.getElementById('desktopPagesTrack');
        const dots = document.querySelectorAll('.pagination-dot');

        if (track) {
            track.style.transform = `translateX(-${currentDesktopPage * 100}%)`;
        }
        dots.forEach((d, idx) => {
            if (idx === currentDesktopPage) d.classList.add('active');
            else d.classList.remove('active');
        });
    };

    function initDesktopSwipeGestures() {
        const viewport = document.getElementById('desktopPagesViewport');
        if (!viewport) return;

        let startX = 0;
        let startY = 0;
        let isMoving = false;

        viewport.addEventListener('touchstart', function (e) {
            if (e.touches && e.touches.length === 1) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                isMoving = true;
            }
        }, { passive: true });

        viewport.addEventListener('touchmove', function (e) {
            if (!isMoving || !e.touches || !e.touches.length) return;
            const diffX = e.touches[0].clientX - startX;
            const diffY = e.touches[0].clientY - startY;
            if (Math.abs(diffY) > Math.abs(diffX)) {
                return;
            }
        }, { passive: true });

        viewport.addEventListener('touchend', function (e) {
            if (!isMoving || !e.changedTouches || !e.changedTouches.length) return;
            isMoving = false;
            const endX = e.changedTouches[0].clientX;
            const diffX = endX - startX;

            if (diffX < -45 && currentDesktopPage === 0) {
                window.switchDesktopPage(1);
            } else if (diffX > 45 && currentDesktopPage === 1) {
                window.switchDesktopPage(0);
            }
        }, { passive: true });
    }

    // 9. 桌面组件管理：彻底清除任何隐私！纯净安全待办事项
    function getCleanInitialTodos() {
        return [
            { id: 't_demo_1', text: '构思 MC 视频大纲', done: false },
            { id: 't_demo_2', text: '晚上 20:00 准时开播', done: false }
        ];
    }

    function getStoredTodos() {
        try {
            const raw = localStorage.getItem('mcyt_desktop_todos');
            if (!raw) return getCleanInitialTodos();
            const list = JSON.parse(raw);
            // 安全扫描拦截：彻底过滤清理之前可能遗留的私人信息缓存
            const sanitized = list.filter(item => {
                const txt = item.text || '';
                return !txt.includes('美团') && !txt.includes('抖音') && !txt.includes('13040') && !txt.includes('生日');
            });
            if (sanitized.length !== list.length) {
                localStorage.setItem('mcyt_desktop_todos', JSON.stringify(sanitized));
            }
            return sanitized;
        } catch (e) {
            return getCleanInitialTodos();
        }
    }

    function saveStoredTodos(list) {
        localStorage.setItem('mcyt_desktop_todos', JSON.stringify(list));
    }

    window.renderDesktopTodos = function () {
        const listWrap = document.getElementById('todoWidgetList');
        const countText = document.getElementById('todoWidgetCountText');
        if (!listWrap) return;

        const todos = getStoredTodos();
        const activeCount = todos.filter(t => !t.done).length;
        if (countText) countText.textContent = `${activeCount} 条待办`;

        if (todos.length === 0) {
            listWrap.innerHTML = `
                <div style="text-align:center;padding:18px 4px;font-size:11px;color:#a49c95;">
                    暂无待办，点击右上角 ＋ 添加
                </div>
            `;
            return;
        }

        listWrap.innerHTML = todos.map((item) => `
            <div class="todo-item-row ${item.done ? 'completed' : ''}" data-id="${item.id}">
                <div class="todo-check-circle" onclick="window.toggleTodoDone('${item.id}')"></div>
                <div class="todo-item-text" onclick="window.toggleTodoDone('${item.id}')">${item.text}</div>
            </div>
        `).join('');
    };

    window.toggleTodoDone = function (id) {
        let todos = getStoredTodos();
        const target = todos.find(t => t.id === id);
        if (!target) return;

        target.done = !target.done;
        saveStoredTodos(todos);
        window.renderDesktopTodos();

        // 优雅打勾动效：1.2秒后自动清除完成项
        if (target.done) {
            setTimeout(() => {
                let freshList = getStoredTodos();
                freshList = freshList.filter(t => t.id !== id);
                saveStoredTodos(freshList);
                window.renderDesktopTodos();
            }, 1200);
        }
    };

    window.promptAddTodoItem = function () {
        const text = prompt('添加新的待办事项：');
        if (!text || !text.trim()) return;

        const todos = getStoredTodos();
        todos.push({
            id: 't_' + Date.now(),
            text: text.trim(),
            done: false
        });
        saveStoredTodos(todos);
        window.renderDesktopTodos();
    };

    // 智能根据游戏人设与真实星期排布一日待办
    window.generateSmartDayTodos = function () {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

        let persona = '主播';
        try {
            if (window.G && window.G.player) {
                persona = window.G.player.persona || window.G.player.role || '主播';
            }
        } catch (_) {}

        let newGenerated = [];

        if (persona.includes('学生')) {
            if (isWeekend) {
                newGenerated = [
                    { id: 'g1', text: '整理 MC 建筑素材包', done: false },
                    { id: 'g2', text: '剪辑周六更新视频', done: false },
                    { id: 'g3', text: '晚上 20:00 粉丝连麦', done: false }
                ];
            } else {
                newGenerated = [
                    { id: 'g1', text: '构思红石新玩法脚本', done: false },
                    { id: 'g2', text: '晚自习后录制实况', done: false },
                    { id: 'g3', text: '回复频道置顶高赞', done: false }
                ];
            }
        } else if (persona.includes('打工') || persona.includes('职场')) {
            if (isWeekend) {
                newGenerated = [
                    { id: 'g1', text: '录制 2 期 YouTube 视频', done: false },
                    { id: 'g2', text: '与合作创作者联机', done: false },
                    { id: 'g3', text: '朋友圈发布更新动态', done: false }
                ];
            } else {
                newGenerated = [
                    { id: 'g1', text: '处理商务赞助商邮件', done: false },
                    { id: 'g2', text: '下班录制生存实况', done: false },
                    { id: 'g3', text: '审核粉丝群表情包', done: false }
                ];
            }
        } else {
            if (isWeekend) {
                newGenerated = [
                    { id: 'g1', text: '黄金档 19:30 直播开播', done: false },
                    { id: 'g2', text: '发放粉丝专属表情包', done: false },
                    { id: 'g3', text: '审核商单合同与提现', done: false }
                ];
            } else {
                newGenerated = [
                    { id: 'g1', text: '构思本周 YouTube 爆款', done: false },
                    { id: 'g2', text: '录制 Minecraft 生存素材', done: false },
                    { id: 'g3', text: '沟通新视频片头特效', done: false }
                ];
            }
        }

        saveStoredTodos(newGenerated);
        window.renderDesktopTodos();
        if (typeof showToast === 'function') {
            showToast(`已排布今日待办！(${persona} · ${isWeekend ? '周末' : '工作日'})`);
        }
    };

    // 1:1 极简黑白月历实时渲染（精准读取真实年月并高亮今天）
    window.renderDesktopCalendar = function () {
        const monthTitle = document.getElementById('calMonthTitle');
        const yearTitle = document.getElementById('calYearTitle');
        const daysGrid = document.getElementById('calDaysGrid');
        if (!daysGrid) return;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDate = now.getDate();

        const monthNames = [
            'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
            'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
        ];

        if (monthTitle) monthTitle.textContent = monthNames[currentMonth];
        if (yearTitle) yearTitle.textContent = currentYear;

        const firstDay = new Date(currentYear, currentMonth, 1);
        let firstDayIndex = firstDay.getDay();
        firstDayIndex = (firstDayIndex + 6) % 7; // 周一排首列

        const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

        let cellsHtml = '';
        for (let i = 0; i < firstDayIndex; i++) {
            cellsHtml += '<div class="calendar-day-cell"></div>';
        }

        for (let d = 1; d <= totalDays; d++) {
            const isToday = (d === currentDate);
            cellsHtml += `
                <div class="calendar-day-cell ${isToday ? 'today-cell' : ''}">
                    <span>${d}</span>
                </div>
            `;
        }

        daysGrid.innerHTML = cellsHtml;
    };

    // 10. 全屏 App 窗口生命周期调度
    window.openPhoneApp = function (appKey) {
        const appModal = document.getElementById('appModal');
        const appModalTitle = document.getElementById('appModalTitle');
        const appModalBody = document.getElementById('appModalBody');
        if (!appModal || !appModalTitle || !appModalBody) return;

        if (appKey === 'theme' && typeof window.renderThemeApp === 'function') {
            appModalTitle.textContent = "🎀 个性化与主题";
            window.renderThemeApp(appModalBody);
            appModal.classList.add('opened');
            return;
        }

        if (appKey === 'settings' && typeof window.renderSettingsApp === 'function') {
            window.renderSettingsApp();
            appModal.classList.add('opened');
            return;
        }

        const appMap = {
            chat: { title: '💬 聊天中心', desc: '单人私聊与多人群聊系统，正在迁移至独立 js/apps/chat/ 模块。' },
            moments: { title: '🌸 朋友圈', desc: '主播与 NPC 动态流与互动，正在迁移至独立 js/apps/moments/ 模块。' },
            youtube: { title: '▶️ 油管视频', desc: '视频推荐流与发布共创，正在迁移至独立 js/apps/youtube/ 模块。' },
            ao3: { title: '🎨 AO3 同人站', desc: '自建同人文与读者互动，正在迁移至独立 js/apps/ao3/ 模块。' },
            streaming: { title: '🔴 直播推流', desc: '开播互动与弹幕分成，正在迁移至独立 js/apps/streaming/ 模块。' },
            story: { title: '📖 主线频道', desc: '核心主线回合与剧情卡片，正在迁移至独立 js/apps/story/ 模块。' },
            shop: { title: '🛒 商务赞助', desc: '品牌代言接单与道具商店，正在迁移至独立 js/apps/sponsor-shop/ 模块。' },
            contacts: { title: '📒 通讯录', desc: 'NPC 与群聊名录管理。' },
            settings: { title: '⚙️ 系统设置', desc: 'AI 模型 Key 配置与时区同步。' },
            backup: { title: '📤 相册备份', desc: 'PNG 隐写存档卡片双轨导出与相册恢复。' }
        };

        const target = appMap[appKey] || { title: '应用窗口', desc: '应用正在装载中...' };
        appModalTitle.textContent = target.title;
        appModalBody.innerHTML = `
            <div class="theme-setting-card">
                <div class="theme-setting-title">${target.title} 就绪</div>
                <div class="theme-setting-desc">${target.desc}</div>
                <div style="margin-top: 14px; font-size: 11.5px; color: var(--primary); background: #fff0f3; padding: 8px 12px; border-radius: 8px; border: 1px dashed var(--primary2);">
                    💡 架构提示：当前处于独立 App 模块化重构过渡期，各 App 正在分批次迁入 js/apps/。
                </div>
            </div>
        `;
        appModal.classList.add('opened');
    };

    window.closePhoneApp = function () {
        const appModal = document.getElementById('appModal');
        if (appModal) appModal.classList.remove('opened');
    };

    // 11. 启动手机外壳核心服务
    function bootShell() {
        setInterval(updatePhoneClock, 1000);
        updatePhoneClock();
        bindPhoneNetworkAndBluetooth();
        bindPhoneBattery();
        initPhoneThemeAndWallpapers();
        initLockGestures();
        initDesktopSwipeGestures();

        // 🌟 核心升级：进入桌面同时渲染并排的左日历与右待办
        window.renderDesktopCalendar();
        window.renderDesktopTodos();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootShell);
    } else {
        bootShell();
    }
})();
