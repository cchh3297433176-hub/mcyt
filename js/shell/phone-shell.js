/**
 * js/shell/phone-shell.js
 * 📱 虚拟手机硬件外壳与操作系统驱动层
 * 职责：时钟、硬件电量、网络/蓝牙感知、壁纸加载、冷启动主题恢复、自动明暗反色引擎、
 *       手势解锁与 App 调度、桌面双页平滑滑屏手势、1:1 极简黑白日历、1:1 温暖纸质待办事项与人设智能生成
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

    // 4. Canvas 内存壁纸取色与明暗反色引擎（彻底修复跨域、异步黑屏与反色失效问题）
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
                    // 重点抓取顶部状态栏区域 (0, 0, 80, 24)
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
                    // 阈值设为 135，高于 135 视为浅色/亮色背景，需使用深色文字反色
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

    // 5. 全局主题颜色生效核心（修复纯白、纯黑、反色失效，支持图标文字及状态栏解耦）
    window.applyColorTheme = function (isLightBg) {
        try {
            const root = document.documentElement;
            const mode = window.currentThemeMode || localStorage.getItem('mcyt_phone_theme_mode') || 'auto';

            // 1. 状态栏文字、电量、时钟及图标反色
            if (mode === 'custom') {
                const customColor = localStorage.getItem('mcyt_phone_custom_color') || '#ff5c8a';
                root.style.setProperty('--status-color', customColor);
                root.style.setProperty('--lock-text-color', customColor);
                root.style.setProperty('--status-svg-fill', customColor);
                root.style.setProperty('--star-glow-color', customColor);
            } else if (mode === 'dark') {
                // 强制纯白质感（深底配白字）
                root.style.setProperty('--status-color', '#ffffff');
                root.style.setProperty('--lock-text-color', '#ffffff');
                root.style.setProperty('--status-svg-fill', '#ffffff');
                root.style.setProperty('--star-glow-color', 'rgba(255, 255, 255, 0.9)');
            } else if (mode === 'light') {
                // 强制黑巧深色（浅底配黑字）
                root.style.setProperty('--status-color', '#2e1a22');
                root.style.setProperty('--lock-text-color', '#2e1a22');
                root.style.setProperty('--status-svg-fill', '#2e1a22');
                root.style.setProperty('--star-glow-color', 'rgba(46, 26, 34, 0.65)');
            } else {
                // 自动模式：根据 isLightBg 严格判定
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

            // 2. 系统图标文字专属颜色同步
            const savedIconColor = localStorage.getItem('mcyt_icon_label_color') || '#ffffff';
            root.style.setProperty('--app-icon-label-color', savedIconColor);

            // 3. 主体粉色与主体白色自定义加载
            const customPink = localStorage.getItem('mcyt_custom_main_pink');
            const customWhite = localStorage.getItem('mcyt_custom_main_white');
            if (customPink) root.style.setProperty('--theme-main-pink', customPink);
            if (customWhite) {
                root.style.setProperty('--theme-main-white', customWhite);
                root.style.setProperty('--theme-sub-white', customWhite);
            }

            // 4. 状态栏三维独立属性恢复（勾线、填充底色、底图）
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

    // 8. 桌面双页滑屏手势驱动器
    let currentDesktopPage = 0;
    window.switchDesktopPage = function (pageIndex) {
        currentDesktopPage = pageIndex === 1 ? 1 : 0;
        const track = document.getElementById('desktopPagesTrack');
        const dots = document.querySelectorAll('.pagination-dot');

        if (track) {
            track.style.transform = `translateX(-${currentDesktopPage * 50}%)`;
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
            // 如果纵向滚动幅度更大，则放行原生垂直滚动
            if (Math.abs(diffY) > Math.abs(diffX)) {
                return;
            }
        }, { passive: true });

        viewport.addEventListener('touchend', function (e) {
            if (!isMoving || !e.changedTouches || !e.changedTouches.length) return;
            isMoving = false;
            const endX = e.changedTouches[0].clientX;
            const diffX = endX - startX;

            // 横向滑动位移超过 45px 触发切页
            if (diffX < -45 && currentDesktopPage === 0) {
                window.switchDesktopPage(1);
            } else if (diffX > 45 && currentDesktopPage === 1) {
                window.switchDesktopPage(0);
            }
        }, { passive: true });
    }

    // 9. 桌面组件管理：1:1 便签待办事项与极简黑白日历
    const DEFAULT_TODOS = [
        { id: 't1', text: '美团', done: false },
        { id: 't2', text: '抖音', done: false },
        { id: 't3', text: '10.17 妈妈生日', done: false },
        { id: 't4', text: '13040173313', done: false }
    ];

    function getStoredTodos() {
        try {
            const raw = localStorage.getItem('mcyt_desktop_todos');
            return raw ? JSON.parse(raw) : DEFAULT_TODOS;
        } catch (e) {
            return DEFAULT_TODOS;
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
                <div style="text-align:center;padding:12px;font-size:12px;color:#a49c95;">
                    暂无待办事项，点击右上角 ＋ 添加
                </div>
            `;
            return;
        }

        listWrap.innerHTML = todos.map((item, idx) => `
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

        // 动效：若已完成打勾，2秒后自动消失清理
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

    // 智能根据玩家人设与真实系统星期生成一日待办
    window.generateSmartDayTodos = function () {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 是周日，6 是周六
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

        // 读取当前玩家人设（从 G 中获取，或者读取本地玩家数据）
        let persona = '主播';
        let channelTrack = '游戏解说';
        try {
            if (window.G && window.G.player) {
                persona = window.G.player.persona || window.G.player.role || '主播';
                channelTrack = window.G.player.track || 'Minecraft';
            }
        } catch (_) {}

        let newGenerated = [];

        if (persona.includes('学生')) {
            if (isWeekend) {
                newGenerated = [
                    { id: 'g1', text: '完成高数与英语作业', done: false },
                    { id: 'g2', text: '复盘 MC 视频剪辑素材', done: false },
                    { id: 'g3', text: '晚上 20:00 准时开播连麦', done: false },
                    { id: 'g4', text: '去超市采购一周零食', done: false }
                ];
            } else {
                newGenerated = [
                    { id: 'g1', text: '上午 8:00 专业课签到', done: false },
                    { id: 'g2', text: '午休构思新视频脚本', done: false },
                    { id: 'g3', text: '图书馆自习 2 小时', done: false },
                    { id: 'g4', text: '晚上剪辑并发布游戏短视频', done: false }
                ];
            }
        } else if (persona.includes('打工') || persona.includes('职场')) {
            if (isWeekend) {
                newGenerated = [
                    { id: 'g1', text: '美美睡到自然醒', done: false },
                    { id: 'g2', text: '下午录制 2 期 YouTube 视频', done: false },
                    { id: 'g3', text: '整理下周工作周报', done: false },
                    { id: 'g4', text: '与公会伙伴直播联机', done: false }
                ];
            } else {
                newGenerated = [
                    { id: 'g1', text: '上午 9:30 项目晨会汇报', done: false },
                    { id: 'g2', text: '处理商务赞助商邮件回复', done: false },
                    { id: 'g3', text: '回复油管置顶高赞评论', done: false },
                    { id: 'g4', text: '晚上下班录制 Minecraft 实况', done: false }
                ];
            }
        } else {
            // 全职主播默认日常
            if (isWeekend) {
                newGenerated = [
                    { id: 'g1', text: '周六黄金档 19:30 万人开播', done: false },
                    { id: 'g2', text: '粉丝群发放专属表情包福利', done: false },
                    { id: 'g3', text: '与合作创作者联机录制共创', done: false },
                    { id: 'g4', text: '审核商单合同与提现', done: false }
                ];
            } else {
                newGenerated = [
                    { id: 'g1', text: '构思本周 YouTube 爆款大企划', done: false },
                    { id: 'g2', text: '录制 Minecraft 红石/生存素材', done: false },
                    { id: 'g3', text: '与剪辑师沟通片头特效节奏', done: false },
                    { id: 'g4', text: '朋友圈发布日常预告图', done: false }
                ];
            }
        }

        saveStoredTodos(newGenerated);
        window.renderDesktopTodos();
        if (typeof showToast === 'function') {
            showToast(`已根据 [${persona} · ${isWeekend ? '周末' : '工作日'}] 智能排布今日待办！`);
        }
    };

    // 1:1 极简黑白日历动态渲染（读取系统真实年月日）
    window.renderDesktopCalendar = function () {
        const monthTitle = document.getElementById('calMonthTitle');
        const yearTitle = document.getElementById('calYearTitle');
        const daysGrid = document.getElementById('calDaysGrid');
        if (!daysGrid) return;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0 - 11
        const currentDate = now.getDate();

        const monthNames = [
            'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
            'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
        ];

        if (monthTitle) monthTitle.textContent = monthNames[currentMonth];
        if (yearTitle) yearTitle.textContent = currentYear;

        // 获取当月第一天是周几（参考图是以周一 M 为首列）
        const firstDay = new Date(currentYear, currentMonth, 1);
        let firstDayIndex = firstDay.getDay(); // 0(周日) - 6(周六)
        // 转换成周一对应索引 0，周日对应索引 6
        firstDayIndex = (firstDayIndex + 6) % 7;

        // 获取当月总天数
        const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

        let cellsHtml = '';
        // 补足前面空白单元格
        for (let i = 0; i < firstDayIndex; i++) {
            cellsHtml += '<div class="calendar-day-cell"></div>';
        }

        // 渲染真实日期
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

    // 切换桌面挂载组件类型（待办 / 日历）
    window.toggleDesktopWidgetType = function () {
        const todoWidget = document.getElementById('desktopTodoWidget');
        const calWidget = document.getElementById('desktopCalendarWidget');
        if (!todoWidget || !calWidget) return;

        const isTodoVisible = todoWidget.style.display !== 'none';
        if (isTodoVisible) {
            todoWidget.style.display = 'none';
            calWidget.style.display = 'block';
            window.renderDesktopCalendar();
            localStorage.setItem('mcyt_active_widget_type', 'calendar');
        } else {
            todoWidget.style.display = 'block';
            calWidget.style.display = 'none';
            window.renderDesktopTodos();
            localStorage.setItem('mcyt_active_widget_type', 'todo');
        }
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

        // 初始化小组件显示状态
        const savedWidget = localStorage.getItem('mcyt_active_widget_type') || 'todo';
        const todoWidget = document.getElementById('desktopTodoWidget');
        const calWidget = document.getElementById('desktopCalendarWidget');
        if (savedWidget === 'calendar') {
            if (todoWidget) todoWidget.style.display = 'none';
            if (calWidget) calWidget.style.display = 'block';
            window.renderDesktopCalendar();
        } else {
            if (todoWidget) todoWidget.style.display = 'block';
            if (calWidget) calWidget.style.display = 'none';
            window.renderDesktopTodos();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootShell);
    } else {
        bootShell();
    }
})();
