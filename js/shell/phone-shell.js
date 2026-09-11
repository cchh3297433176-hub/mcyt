/**
 * js/shell/phone-shell.js
 * 📱 虚拟手机硬件外壳与操作系统驱动层
 * 职责：时钟、硬件电量、网络/蓝牙感知、壁纸加载、冷启动主题恢复、自动明暗反色引擎、
 *       手势解锁与 App 调度、桌面双页平滑滑屏手势、组件流动态宿主系统（日历/待办）、
 *       桌面 App 图标与小组件全自由长按晃动编辑态、粉白仿Windows甜心弹窗、
 *       🌟 4 格宽专属复古星象塔罗大组件驱动引擎（图一三图层等比叠加、图二三卡背翻转、领悟启示彻底回归初始待机）。
 */

(function () {
    'use strict';

    window._phoneBatteryState = { level: 100, charging: false, supported: false };
    window._phoneNetworkState = { type: 'wifi', online: true, bluetooth: false };

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
            timeStr, hour, minute, timeSlotName, isLateNight,
            battery: Object.assign({}, window._phoneBatteryState),
            network: Object.assign({}, window._phoneNetworkState)
        };
    };

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
        } catch (e) {}
    }

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
                if (cellSvg) cellSvg.style.display = 'none';
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
                    if (battery.charging) star.classList.add('active');
                    else star.classList.remove('active');
                };
                applyBatteryState();
                battery.addEventListener('levelchange', applyBatteryState);
                battery.addEventListener('chargingchange', applyBatteryState);
            }
        } catch (e) {}
    }

    window.analyzeImageLuminance = function (imageUrl, callback) {
        if (!imageUrl) {
            if (typeof callback === 'function') callback(false);
            return;
        }
        try {
            const img = new Image();
            if (!imageUrl.startsWith('data:')) img.crossOrigin = "Anonymous";
            img.onload = function () {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 80; canvas.height = 80;
                    ctx.drawImage(img, 0, 0, 80, 24, 0, 0, 80, 24);
                    const imgData = ctx.getImageData(0, 0, 80, 24).data;
                    let totalLuminance = 0, count = 0;
                    for (let i = 0; i < imgData.length; i += 4) {
                        totalLuminance += 0.2126 * imgData[i] + 0.7152 * imgData[i+1] + 0.0722 * imgData[i+2];
                        count++;
                    }
                    const avgLuma = totalLuminance / (count || 1);
                    if (typeof callback === 'function') callback(avgLuma > 135);
                } catch (err) {
                    if (typeof callback === 'function') callback(false);
                }
            };
            img.onerror = function () { if (typeof callback === 'function') callback(false); };
            img.src = imageUrl;
        } catch (e) {
            if (typeof callback === 'function') callback(false);
        }
    };

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
            } else if (mode === 'light') {
                root.style.setProperty('--status-color', '#1a1a1a');
                root.style.setProperty('--lock-text-color', '#1a1a1a');
                root.style.setProperty('--status-svg-fill', '#1a1a1a');
            } else {
                const c = isLightBg ? '#1a1a1a' : '#ffffff';
                root.style.setProperty('--status-color', c);
                root.style.setProperty('--lock-text-color', c);
                root.style.setProperty('--status-svg-fill', c);
            }

            const savedIconColor = localStorage.getItem('mcyt_icon_label_color') || '#2e1a22';
            root.style.setProperty('--app-icon-label-color', savedIconColor);
        } catch (e) {}
    };

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

            if (savedMode === 'custom' || savedMode === 'dark') {
                window.applyColorTheme(false);
            } else if (savedMode === 'light') {
                window.applyColorTheme(true);
            } else {
                const target = (savedLock && savedLock.startsWith('data:image')) ? savedLock : 'assets/system/default_lock.jpg';
                window.analyzeImageLuminance(target, window.applyColorTheme);
            }
        } catch (e) {}
    }

    function initLockGestures() {
        const screenLock = document.getElementById('screenLock');
        const lockBtn = document.getElementById('lockBtn');
        if (!screenLock) return;

        window.unlockPhoneScreen = function () {
            screenLock.classList.add('unlocked');
            screenLock.style.pointerEvents = 'none';
        };

        window.lockPhoneScreen = function () {
            if (typeof window.closePhoneApp === 'function') window.closePhoneApp();
            screenLock.classList.remove('unlocked');
            screenLock.style.pointerEvents = 'auto';
        };

        screenLock.addEventListener('click', window.unlockPhoneScreen);

        let touchStartY = 0;
        screenLock.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length) touchStartY = e.touches[0].clientY;
        }, { passive: true });

        screenLock.addEventListener('touchend', (e) => {
            if (e.changedTouches && e.changedTouches.length) {
                if (touchStartY - e.changedTouches[0].clientY > 30 || Math.abs(touchStartY - e.changedTouches[0].clientY) < 10) {
                    window.unlockPhoneScreen();
                }
            }
        }, { passive: true });

        if (lockBtn) {
            lockBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.lockPhoneScreen();
            });
        }
    }

    let currentDesktopPage = 0;
    window.switchDesktopPage = function (pageIndex) {
        currentDesktopPage = pageIndex === 1 ? 1 : 0;
        const track = document.getElementById('desktopPagesTrack');
        const dots = document.querySelectorAll('.pagination-dot');
        if (track) track.style.transform = `translateX(-${currentDesktopPage * 100}%)`;
        dots.forEach((d, idx) => {
            if (idx === currentDesktopPage) d.classList.add('active');
            else d.classList.remove('active');
        });
    };

    function initDesktopSwipeGestures() {
        const viewport = document.getElementById('desktopPagesViewport');
        if (!viewport) return;

        let startX = 0, startY = 0, isMoving = false;

        viewport.addEventListener('touchstart', (e) => {
            if (window._isWidgetEditMode) return;
            if (e.touches && e.touches.length === 1) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                isMoving = true;
            }
        }, { passive: true });

        viewport.addEventListener('touchmove', (e) => {
            if (window._isWidgetEditMode || !isMoving || !e.touches || !e.touches.length) return;
            const diffX = e.touches[0].clientX - startX;
            const diffY = e.touches[0].clientY - startY;
            if (Math.abs(diffY) > Math.abs(diffX)) return;
        }, { passive: true });

        viewport.addEventListener('touchend', (e) => {
            if (window._isWidgetEditMode || !isMoving || !e.changedTouches || !e.changedTouches.length) return;
            isMoving = false;
            const diffX = e.changedTouches[0].clientX - startX;
            if (diffX < -45 && currentDesktopPage === 0) window.switchDesktopPage(1);
            else if (diffX > 45 && currentDesktopPage === 1) window.switchDesktopPage(0);
        }, { passive: true });
    }

    window.openRetroTodoInputModal = function (title, defaultVal, placeholder, onConfirm) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('retroModalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalClose = document.getElementById('modalClose');
        if (!modal || !modalBody) return;

        if (modalTitle) modalTitle.textContent = title || "新建待办事项";
        modalBody.innerHTML = `
            <div style="font-size:12.5px;color:#2e1a22;font-weight:600;margin-bottom:6px;">请输入待办内容：</div>
            <input type="text" id="retroTodoInputBox" class="retro-input-field" value="${defaultVal || ''}" placeholder="${placeholder || '例如：构思新一期视频脚本'}" />
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
                <button class="retro-pink-btn" id="retroTodoCancelBtn">取消</button>
                <button class="retro-pink-btn" id="retroTodoOkBtn" style="font-weight:bold;color:#b82350;">确认添加</button>
            </div>
        `;
        modal.classList.add('open');

        const inputEl = document.getElementById('retroTodoInputBox');
        if (inputEl) {
            setTimeout(() => inputEl.focus(), 80);
            inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirmAction(); });
        }

        function closeModalInternal() {
            modal.classList.remove('open');
            modalBody.innerHTML = '';
            if (modalClose) modalClose.onclick = null;
        }
        function confirmAction() {
            const val = inputEl ? inputEl.value.trim() : '';
            closeModalInternal();
            if (val && typeof onConfirm === 'function') onConfirm(val);
        }
        document.getElementById('retroTodoCancelBtn').onclick = closeModalInternal;
        document.getElementById('retroTodoOkBtn').onclick = confirmAction;
        if (modalClose) modalClose.onclick = closeModalInternal;
    };

    // ============================================================
    // 🌟 4 格宽专属复古星象塔罗大组件驱动引擎（图一二三精确复刻）
    // ============================================================
    const TAROT_BRIEF_DATA = [
        { name: '愚者', img: '0.jpg', up: '纯粹初心·无畏冒险·新的可能', rev: '鲁莽冲动·缺乏方向·自我怀疑' },
        { name: '魔术师', img: '1.jpg', up: '显化意志·创造充沛·万事俱备', rev: '才华受阻·沟通断层·缺乏自信' },
        { name: '女祭司', img: '2.jpg', up: '直觉敏锐·洞悉潜意识·静待时机', rev: '忽视内心·情绪波动·秘密浮现' },
        { name: '皇后', img: '3.jpg', up: '丰饶富足·温暖滋养·灵感涌动', rev: '灵感枯竭·过度依赖·自我忽视' },
        { name: '皇帝', img: '4.jpg', up: '秩序威严·掌控稳固·理性规划', rev: '固执僵化·控制过度·规则冲突' },
        { name: '教皇', img: '5.jpg', up: '智慧传承·良师指路·团队共鸣', rev: '墨守成规·认知偏差·非传统途径' },
        { name: '恋人', img: '6.jpg', up: '真诚共鸣·默契契合·重要抉择', rev: '关系隔阂·价值观碰撞·犹豫不决' },
        { name: '战车', img: '7.jpg', up: '意志克难·专注前行·凯旋在望', rev: '方向摇摆·缺乏耐力·用力过猛' },
        { name: '力量', img: '8.jpg', up: '以柔克刚·坚定包容·内在无畏', rev: '内心焦灼·自我怀疑·耐性耗尽' },
        { name: '隐士', img: '9.jpg', up: '深沉省思·向内探寻·明灯在前', rev: '过度孤立·拒绝指引·封闭自我' },
        { name: '命运之轮', img: '10.jpg', up: '顺势而为·契机转折·因果流转', rev: '抗拒变动·逆势对抗·需要打破循环' },
        { name: '正义', img: '11.jpg', up: '客观理性·责任清晰·真相大白', rev: '判断失衡·逃避担当·偏见干扰' },
        { name: '倒吊人', img: '12.jpg', up: '换位思考·主动沉淀·以退为进', rev: '无谓牺牲·原地固步·不愿放手' },
        { name: '死神', img: '13.jpg', up: '蜕变重生·告别过往·翻开新章', rev: '紧抓执念·拒绝结束·阻碍新生' },
        { name: '节制', img: '14.jpg', up: '平衡调和·从容自洽·融合贯通', rev: '节律失衡·焦躁激进·缺乏耐心' },
        { name: '恶魔', img: '15.jpg', up: '看清枷锁·觉察欲望·挣脱诱惑', rev: '重获自由·冲破束缚·重归理性' },
        { name: '高塔', img: '16.jpg', up: '打破虚妄·突发顿悟·彻底重塑', rev: '勉强维稳·缓慢耗损·隐患残留' },
        { name: '星星', img: '17.jpg', up: '希望之光·灵性能量·疗愈安宁', rev: '信念动摇·自我怀疑·迷失初衷' },
        { name: '月亮', img: '18.jpg', up: '潜意识探索·穿越迷茫·信任直觉', rev: '疑云散去·走出阴霾·真相清朗' },
        { name: '太阳', img: '19.jpg', up: '生机勃勃·明朗开朗·达成所愿', rev: '光芒被蔽·短暂延迟·调整心态' },
        { name: '审判', img: '20.jpg', up: '听从召唤·脱胎换骨·觉醒新生', rev: '抗拒召唤·沉溺自责·迟迟未决' },
        { name: '世界', img: '21.jpg', up: '阶段圆满·融会贯通·广阔宏图', rev: '功亏一篑·收尾迟滞·需补齐细节' }
    ];

    window._tarotCurrentCards = [];
    window._tarotIsSpinning = false;

    window.renderDesktopTarotWidget = function () {
        const container = document.getElementById('desktopTarotContainer');
        if (!container) return;

        const enabled = localStorage.getItem('mcyt_widget_tarot_enabled') !== 'false';
        if (!enabled) {
            container.innerHTML = '';
            return;
        }

        // 完美还原图一待机：三张画布等比例绝对重叠
        container.innerHTML = `
            <div class="desktop-tarot-slot" id="desktopTarotSlot" onclick="window.handleTarotSlotClick()">
                <div class="tarot-slot-overlay"></div>
                
                <!-- 阶段 1：待机同尺寸三图层等比叠加（完美复刻图一） -->
                <div class="tarot-stage-idle" id="tarotStageIdle">
                    <img src="tarot/images/slot_bg.png" class="tarot-layer-bg" alt="星图底板">
                    <img src="tarot/images/ring_galaxy.png" class="tarot-ring-galaxy" alt="星河光环">
                    <img src="tarot/images/sun_spark.png" class="tarot-sun-spark" alt="金芒太阳">
                </div>

                <!-- 阶段 2：抽卡结果形态（完美复刻图二与图三：图四底图 + 卡背阵列） -->
                <div class="tarot-stage-result" id="tarotStageResult">
                    <img src="tarot/images/crescent_frame.png" class="tarot-result-bg" alt="月牙画框">
                    <div class="tarot-result-content">
                        <div class="tarot-status-strip" id="tarotStatusStrip">✦ 轻触卡牌翻开牌面 ✦</div>
                        <div class="tarot-cards-row" id="tarotCardsRow"></div>
                        <button class="tarot-gold-btn" id="tarotGoldBtn" style="display:none;" onclick="window.showTarotCardMeaning(event)">✦ 查看启示 ✦</button>
                    </div>
                </div>
            </div>
        `;
    };

    window.handleTarotSlotClick = function () {
        if (window._isWidgetEditMode || window._tarotIsSpinning) return;

        const slot = document.getElementById('desktopTarotSlot');
        const idleStage = document.getElementById('tarotStageIdle');
        const resultStage = document.getElementById('tarotStageResult');
        if (!slot || !idleStage || !resultStage) return;

        // 如果已经在结果展示阶段，点击卡片空白处平滑重置回待机态
        if (resultStage.classList.contains('active')) {
            resultStage.classList.remove('active');
            idleStage.style.display = 'flex';
            setTimeout(() => { idleStage.style.opacity = '1'; }, 20);
            return;
        }

        // 开始星轨旋转动画
        window._tarotIsSpinning = true;
        slot.classList.add('tarot-spinning');

        // 读取牌阵模式：默认三张（时间流），或单张
        const mode = localStorage.getItem('mcyt_widget_tarot_spread') || 'triple';
        const cardCount = (mode === 'single') ? 1 : 3;

        // 随机抽取
        const pool = [...TAROT_BRIEF_DATA].sort(() => Math.random() - 0.5);
        window._tarotCurrentCards = pool.slice(0, cardCount).map(c => Object.assign({}, c, {
            reversed: Math.random() < 0.4,
            flipped: false
        }));

        setTimeout(() => {
            slot.classList.remove('tarot-spinning');
            idleStage.style.opacity = '0';
            
            setTimeout(() => {
                idleStage.style.display = 'none';

                const cardsRow = document.getElementById('tarotCardsRow');
                const strip = document.getElementById('tarotStatusStrip');
                const goldBtn = document.getElementById('tarotGoldBtn');

                if (strip) strip.textContent = '✦ 轻触卡牌翻开牌面 ✦';
                if (goldBtn) goldBtn.style.display = 'none';

                // 生成带有新卡背 (card_back.png) 的卡位
                if (cardsRow) {
                    cardsRow.innerHTML = window._tarotCurrentCards.map((c, i) => `
                        <div class="tarot-slot-card" id="slotCard-${i}" onclick="window.flipSlotCard(${i}, event)">
                            <div class="tarot-slot-card-inner">
                                <div class="tarot-card-face tarot-card-face-back"></div>
                                <div class="tarot-card-face tarot-card-face-front ${c.reversed ? 'reversed' : ''}">
                                    <img src="tarot/images/${c.img}" alt="${c.name}">
                                </div>
                            </div>
                        </div>
                    `).join('');
                }

                resultStage.classList.add('active');
                window._tarotIsSpinning = false;
            }, 260);
        }, 1800);
    };

    window.flipSlotCard = function (idx, e) {
        if (e) e.stopPropagation();
        const cardEl = document.getElementById('slotCard-' + idx);
        if (!cardEl || cardEl.classList.contains('flipped')) return;

        cardEl.classList.add('flipped');
        if (window._tarotCurrentCards[idx]) {
            window._tarotCurrentCards[idx].flipped = true;
        }

        // 检查是否全部翻转完成
        const allFlipped = window._tarotCurrentCards.every(c => c.flipped);
        if (allFlipped) {
            const strip = document.getElementById('tarotStatusStrip');
            const goldBtn = document.getElementById('tarotGoldBtn');
            if (strip) {
                const names = window._tarotCurrentCards.map(c => `${c.name}${c.reversed ? '(逆)' : ''}`).join(' · ');
                strip.textContent = `[ ${names} ]`;
            }
            if (goldBtn) {
                goldBtn.style.display = 'inline-flex';
            }
        }
    };

    // ✦ 领悟启示弹窗（升级为黑金灵性风格，关闭后彻底重置回初始待机态）
    window.showTarotCardMeaning = function (e) {
        if (e) e.stopPropagation();
        const cards = window._tarotCurrentCards;
        if (!cards || !cards.length) return;

        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modalContent');
        const modalTitle = document.getElementById('retroModalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalClose = document.getElementById('modalClose');
        if (!modal || !modalBody) return;

        // 换成黑金神秘弹窗皮肤
        if (modalContent) modalContent.className = 'modal-box mystic-dark-window';
        if (modalTitle) modalTitle.textContent = `✦ 星轨启示 · 命途推演 ✦`;

        const posNames = (cards.length === 1) ? ['今日核心启示'] : ['过去的影响', '当下的状态', '未来的趋势'];

        let meaningHTML = '';
        cards.forEach((c, idx) => {
            const orientStr = c.reversed ? '逆位' : '正位';
            const meaning = c.reversed ? c.rev : c.up;
            meaningHTML += `
                <div style="margin-bottom:12px; padding:10px 12px; background:rgba(212,175,55,0.06); border:1px solid rgba(212,175,55,0.3); border-radius:10px;">
                    <div style="font-size:13px; font-weight:700; color:#fce8a6; margin-bottom:4px;">
                        ${posNames[idx]} · ${c.name} (${orientStr})
                    </div>
                    <div style="font-size:12px; color:#dcd5cb; line-height:1.7;">
                        ${meaning}
                    </div>
                </div>
            `;
        });

        modalBody.innerHTML = `
            <div style="text-align:center; padding:4px;">
                ${meaningHTML}
                <div style="margin-top:10px; font-size:11px; color:#a69f92; letter-spacing:1px;">
                    倾听内心的声音，今日决策尽在你的掌控之中。
                </div>
            </div>
            <div style="display:flex; justify-content:center; margin-top:14px;">
                <button class="tarot-gold-btn" id="retroTarotKnowBtn" style="padding:6px 20px; font-size:12px;">✦ 领悟启示 ✦</button>
            </div>
        `;

        modal.classList.add('open');

        const closeAndReset = () => {
            modal.classList.remove('open');
            modalBody.innerHTML = '';
            if (modalContent) modalContent.className = 'modal-box retro-pink-window';
            if (modalClose) modalClose.onclick = null;

            // 🌟 领悟启示后彻底回归初始待机界面！
            const idleStage = document.getElementById('tarotStageIdle');
            const resultStage = document.getElementById('tarotStageResult');
            if (idleStage && resultStage) {
                resultStage.classList.remove('active');
                idleStage.style.display = 'flex';
                setTimeout(() => { idleStage.style.opacity = '1'; }, 20);
            }
        };

        document.getElementById('retroTarotKnowBtn').onclick = closeAndReset;
        if (modalClose) modalClose.onclick = closeAndReset;
    };

    window.renderDesktopWidgetsLayout = function () {
        window.renderDesktopTarotWidget();

        const slot1 = document.getElementById('page1WidgetSlot');
        const slot2 = document.getElementById('page2WidgetSlot');
        if (!slot1 || !slot2) return;

        const calEnabled = localStorage.getItem('mcyt_widget_calendar_enabled') !== 'false';
        const calPage = parseInt(localStorage.getItem('mcyt_widget_calendar_page') || '1', 10);
        const todoEnabled = localStorage.getItem('mcyt_widget_todo_enabled') !== 'false';
        const todoPage = parseInt(localStorage.getItem('mcyt_widget_todo_page') || '1', 10);

        const calendarHTML = `
            <div class="calendar-widget-card" id="desktopCalendarWidget" data-widget-type="calendar">
                <div class="calendar-widget-top">
                    <div class="calendar-month-title" id="calMonthTitle">SEPTEMBER</div>
                    <div class="calendar-year-title" id="calYearTitle">2026</div>
                </div>
                <div class="calendar-week-row">
                    <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div>
                </div>
                <div class="calendar-days-grid" id="calDaysGrid"></div>
                <div class="calendar-widget-notes">NOTES</div>
            </div>
        `;

        const todoHTML = `
            <div class="todo-widget-card" id="desktopTodoWidget" data-widget-type="todo">
                <div class="todo-widget-header">
                    <div class="todo-widget-count" id="todoWidgetCountText">0 条待办</div>
                    <div class="todo-widget-actions">
                        <button class="todo-icon-btn" onclick="window.generateSmartDayTodos()" title="智能排布今日待办">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                            </svg>
                        </button>
                        <button class="todo-icon-btn" onclick="window.promptAddTodoItem()" title="添加待办">
                            <svg viewBox="0 0 24 24">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="todo-list-wrap" id="todoWidgetList"></div>
            </div>
        `;

        slot1.innerHTML = '';
        slot2.innerHTML = '';

        let page1Count = 0;
        let page2Count = 0;

        if (calEnabled) {
            if (calPage === 2) { slot2.insertAdjacentHTML('beforeend', calendarHTML); page2Count++; }
            else { slot1.insertAdjacentHTML('beforeend', calendarHTML); page1Count++; }
        }

        if (todoEnabled) {
            if (todoPage === 2) { slot2.insertAdjacentHTML('beforeend', todoHTML); page2Count++; }
            else { slot1.insertAdjacentHTML('beforeend', todoHTML); page1Count++; }
        }

        if (page1Count === 1) slot1.classList.add('single-widget');
        else slot1.classList.remove('single-widget');

        if (page2Count === 1) slot2.classList.add('single-widget');
        else slot2.classList.remove('single-widget');

        if (calEnabled) window.renderDesktopCalendar();
        if (todoEnabled) window.renderDesktopTodos();

        bindDesktopInteractiveDragEngine();
    };

    window._isWidgetEditMode = false;

    function enterDesktopEditMode() {
        if (window._isWidgetEditMode) return;
        window._isWidgetEditMode = true;
        document.querySelectorAll('.calendar-widget-card, .todo-widget-card, .app-slot').forEach(el => {
            el.classList.add('widget-jiggle');
        });
        if (typeof showToast === 'function') showToast('已进入桌面编辑模式，拖拽图标或小组件可自由换位');
    }

    function exitDesktopEditMode() {
        if (!window._isWidgetEditMode) return;
        window._isWidgetEditMode = false;
        document.querySelectorAll('.calendar-widget-card, .todo-widget-card, .app-slot').forEach(el => {
            el.classList.remove('widget-jiggle');
            el.style.transform = '';
            el.style.opacity = '';
            el.style.zIndex = '';
        });
    }

    document.addEventListener('click', (e) => {
        if (!window._isWidgetEditMode) return;
        if (!e.target.closest('.calendar-widget-card') && !e.target.closest('.todo-widget-card') && !e.target.closest('.app-slot')) {
            exitDesktopEditMode();
        }
    });

    function saveDesktopAppOrder() {
        const p1Grid = document.querySelector('#page1WidgetSlot') ? document.querySelector('#page1WidgetSlot').parentElement.querySelector('.app-grid') : null;
        const p2Grid = document.querySelector('#page2WidgetSlot') ? document.querySelector('#page2WidgetSlot').parentElement.querySelector('.app-grid') : null;
        const layout = { page1: [], page2: [] };
        if (p1Grid) {
            p1Grid.querySelectorAll('.app-slot').forEach(slot => {
                const title = slot.querySelector('.app-title-label');
                if (title) layout.page1.push(title.textContent.trim());
            });
        }
        if (p2Grid) {
            p2Grid.querySelectorAll('.app-slot').forEach(slot => {
                const title = slot.querySelector('.app-title-label');
                if (title) layout.page2.push(title.textContent.trim());
            });
        }
        try { localStorage.setItem('mcyt_desktop_app_layout_v2', JSON.stringify(layout)); } catch (_) {}
    }

    function restoreDesktopAppOrder() {
        try {
            const raw = localStorage.getItem('mcyt_desktop_app_layout_v2');
            if (!raw) return;
            const layout = JSON.parse(raw);
            const p1Grid = document.querySelector('#page1WidgetSlot') ? document.querySelector('#page1WidgetSlot').parentElement.querySelector('.app-grid') : null;
            const p2Grid = document.querySelector('#page2WidgetSlot') ? document.querySelector('#page2WidgetSlot').parentElement.querySelector('.app-grid') : null;
            if (!p1Grid || !p2Grid) return;

            const allSlots = Array.from(document.querySelectorAll('.app-slot'));
            const map = {};
            allSlots.forEach(s => {
                const title = s.querySelector('.app-title-label');
                if (title) map[title.textContent.trim()] = s;
            });

            if (Array.isArray(layout.page1) && layout.page1.length) {
                layout.page1.forEach(name => { if (map[name]) p1Grid.appendChild(map[name]); });
            }
            if (Array.isArray(layout.page2) && layout.page2.length) {
                layout.page2.forEach(name => { if (map[name]) p2Grid.appendChild(map[name]); });
            }
        } catch (_) {}
    }

    function bindDesktopInteractiveDragEngine() {
        restoreDesktopAppOrder();

        const draggables = document.querySelectorAll('.calendar-widget-card, .todo-widget-card, .app-slot');

        draggables.forEach(item => {
            const isAppSlot = item.classList.contains('app-slot');
            let pressTimer = null, isDragging = false;
            let startX = 0, startY = 0;
            let ghostEl = null, ghostOriginLeft = 0, ghostOriginTop = 0;
            let lastTargetSlot = null, rafPending = false;
            let pendingClientX = 0, pendingClientY = 0;

            const captureFlip = (grid) => {
                const before = new Map();
                grid.querySelectorAll('.app-slot').forEach(el => before.set(el, el.getBoundingClientRect()));
                return () => {
                    before.forEach((prevRect, el) => {
                        const nowRect = el.getBoundingClientRect();
                        const dx = prevRect.left - nowRect.left;
                        const dy = prevRect.top - nowRect.top;
                        if (!dx && !dy) return;
                        el.style.transition = 'none';
                        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
                        requestAnimationFrame(() => {
                            el.style.transition = 'transform 0.22s ease';
                            el.style.transform = '';
                        });
                    });
                };
            };

            const createGhost = () => {
                const rect = item.getBoundingClientRect();
                const ghost = item.cloneNode(true);
                ghost.classList.remove('widget-jiggle');
                ghost.style.position = 'fixed';
                ghost.style.left = rect.left + 'px';
                ghost.style.top = rect.top + 'px';
                ghost.style.width = rect.width + 'px';
                ghost.style.height = rect.height + 'px';
                ghost.style.margin = '0';
                ghost.style.zIndex = '9999';
                ghost.style.pointerEvents = 'none';
                ghost.style.transform = 'scale(1.08)';
                ghost.style.opacity = '0.92';
                document.body.appendChild(ghost);
                ghostOriginLeft = rect.left;
                ghostOriginTop = rect.top;
                return ghost;
            };

            const cleanupVisuals = () => {
                if (ghostEl) { ghostEl.remove(); ghostEl = null; }
                item.style.transition = ''; item.style.transform = '';
                item.style.opacity = ''; item.style.zIndex = '';
                item.style.pointerEvents = ''; lastTargetSlot = null;
            };

            const onStart = (clientX, clientY) => {
                startX = clientX; startY = clientY; isDragging = false;
                pressTimer = setTimeout(() => {
                    enterDesktopEditMode();
                    if (navigator.vibrate) try { navigator.vibrate(40); } catch (_) {}
                }, 450);
            };

            const onMove = (clientX, clientY, event) => {
                const deltaX = clientX - startX;
                const deltaY = clientY - startY;

                if (!window._isWidgetEditMode) {
                    if (Math.hypot(deltaX, deltaY) > 8 && pressTimer) {
                        clearTimeout(pressTimer); pressTimer = null;
                    }
                    return;
                }
                if (event && event.cancelable) event.preventDefault();

                if (!isDragging) {
                    isDragging = true;
                    if (isAppSlot) {
                        ghostEl = createGhost();
                        item.style.opacity = '0.001';
                    } else {
                        item.style.zIndex = '9999'; item.style.opacity = '0.85';
                    }
                    item.style.pointerEvents = 'none';
                }

                if (isAppSlot && ghostEl) {
                    ghostEl.style.left = (ghostOriginLeft + deltaX) + 'px';
                    ghostEl.style.top = (ghostOriginTop + deltaY) + 'px';
                } else {
                    item.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.08)`;
                }

                const winW = window.innerWidth;
                if (clientX < 28 && currentDesktopPage === 1) window.switchDesktopPage(0);
                else if (clientX > winW - 28 && currentDesktopPage === 0) window.switchDesktopPage(1);

                if (isAppSlot) {
                    pendingClientX = clientX; pendingClientY = clientY;
                    if (!rafPending) {
                        rafPending = true;
                        requestAnimationFrame(() => {
                            rafPending = false;
                            if (!isDragging) return;
                            const under = document.elementFromPoint(pendingClientX, pendingClientY);
                            const targetSlot = under ? under.closest('.app-slot') : null;
                            const targetGrid = under ? under.closest('.app-grid') : null;

                            if (targetSlot && targetSlot !== item && targetSlot !== lastTargetSlot) {
                                const grid = targetSlot.closest('.app-grid');
                                if (grid) {
                                    const playFlip = captureFlip(grid);
                                    const siblings = Array.from(grid.querySelectorAll('.app-slot'));
                                    const itemIndex = siblings.indexOf(item);
                                    const targetIndex = siblings.indexOf(targetSlot);
                                    if (itemIndex !== -1 && itemIndex < targetIndex) targetSlot.after(item);
                                    else targetSlot.before(item);
                                    playFlip();
                                    lastTargetSlot = targetSlot;
                                }
                            } else if (targetGrid && !targetGrid.contains(item)) {
                                const playFlip = captureFlip(targetGrid);
                                targetGrid.appendChild(item);
                                playFlip();
                                lastTargetSlot = null;
                            }
                        });
                    }
                }
            };

            const onEnd = () => {
                if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
                if (!window._isWidgetEditMode || !isDragging) { cleanupVisuals(); return; }
                isDragging = false;

                if (item.classList.contains('calendar-widget-card') || item.classList.contains('todo-widget-card')) {
                    const wType = item.getAttribute('data-widget-type');
                    const targetPage = (currentDesktopPage === 0) ? 2 : 1;
                    localStorage.setItem(`mcyt_widget_${wType}_page`, targetPage.toString());
                    cleanupVisuals();
                    window.renderDesktopWidgetsLayout();
                    document.querySelectorAll('.calendar-widget-card, .todo-widget-card, .app-slot').forEach(el => el.classList.add('widget-jiggle'));
                    return;
                }
                if (isAppSlot) { cleanupVisuals(); saveDesktopAppOrder(); }
            };

            item.addEventListener('touchstart', (e) => { if (e.touches.length === 1) onStart(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
            item.addEventListener('touchmove', (e) => { if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY, e); }, { passive: false });
            item.addEventListener('touchend', onEnd);

            item.addEventListener('mousedown', (e) => {
                onStart(e.clientX, e.clientY);
                const mouseMove = (ev) => onMove(ev.clientX, ev.clientY, ev);
                const mouseUp = () => {
                    onEnd();
                    window.removeEventListener('mousemove', mouseMove);
                    window.removeEventListener('mouseup', mouseUp);
                };
                window.addEventListener('mousemove', mouseMove);
                window.addEventListener('mouseup', mouseUp);
            });
        });
    }

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
            return JSON.parse(raw);
        } catch (e) { return getCleanInitialTodos(); }
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
            listWrap.innerHTML = `<div style="text-align:center;padding:18px 4px;font-size:11px;color:#a49c95;">暂无待办，点击右上角 ＋ 添加</div>`;
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
        if (window._isWidgetEditMode) return;
        let todos = getStoredTodos();
        const target = todos.find(t => t.id === id);
        if (!target) return;
        target.done = !target.done;
        saveStoredTodos(todos);
        window.renderDesktopTodos();
        if (target.done) {
            setTimeout(() => {
                let fresh = getStoredTodos().filter(t => t.id !== id);
                saveStoredTodos(fresh);
                window.renderDesktopTodos();
            }, 1200);
        }
    };

    window.promptAddTodoItem = function () {
        if (window._isWidgetEditMode) return;
        window.openRetroTodoInputModal('📝 新建待办事项', '', '输入待办任务内容...', function (textVal) {
            const todos = getStoredTodos();
            todos.push({ id: 't_' + Date.now(), text: textVal, done: false });
            saveStoredTodos(todos);
            window.renderDesktopTodos();
        });
    };

    window.generateSmartDayTodos = function () {
        if (window._isWidgetEditMode) return;
        const now = new Date();
        const isWeekend = (now.getDay() === 0 || now.getDay() === 6);
        const newGenerated = [
            { id: 'g1', text: '构思 MC 视频大纲', done: false },
            { id: 'g2', text: '录制 Minecraft 生存素材', done: false },
            { id: 'g3', text: '沟通新视频片头特效', done: false }
        ];
        saveStoredTodos(newGenerated);
        window.renderDesktopTodos();
        if (typeof showToast === 'function') showToast('已排布今日待办！');
    };

    window.renderDesktopCalendar = function () {
        const monthTitle = document.getElementById('calMonthTitle');
        const yearTitle = document.getElementById('calYearTitle');
        const daysGrid = document.getElementById('calDaysGrid');
        if (!daysGrid) return;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const currentDate = now.getDate();
        const monthNames = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

        if (monthTitle) monthTitle.textContent = monthNames[currentMonth];
        if (yearTitle) yearTitle.textContent = currentYear;

        const firstDay = new Date(currentYear, currentMonth, 1);
        let firstDayIndex = (firstDay.getDay() + 6) % 7;
        const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

        let cellsHtml = '';
        for (let i = 0; i < firstDayIndex; i++) cellsHtml += '<div class="calendar-day-cell"></div>';
        for (let d = 1; d <= totalDays; d++) {
            cellsHtml += `<div class="calendar-day-cell ${d === currentDate ? 'today-cell' : ''}"><span>${d}</span></div>`;
        }
        daysGrid.innerHTML = cellsHtml;
    };

    window.openPhoneApp = function (appKey) {
        if (window._isWidgetEditMode) return;
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

        // 🌟 独立塔罗 App 入口：直接跳转至塔罗神殿
        if (appKey === 'tarot') {
            window.location.href = 'tarot/index.html';
            return;
        }

        const appMap = {
            chat: { title: '💬 聊天中心', desc: '单人私聊与多人群聊系统。' },
            moments: { title: '🌸 朋友圈', desc: '主播与 NPC 动态互动流。' },
            youtube: { title: '▶️ 油管视频', desc: '视频推荐流与发布共创。' },
            ao3: { title: '🎨 AO3 同人站', desc: '自建同人文与读者互动。' },
            streaming: { title: '🔴 直播推流', desc: '开播互动与弹幕分成。' },
            story: { title: '📖 主线频道', desc: '核心主线剧情卡片。' },
            shop: { title: '🛒 商务赞助', desc: '品牌代言接单与道具商店。' },
            contacts: { title: '📒 通讯录', desc: 'NPC 与群聊名录管理。' },
            backup: { title: '📤 相册备份', desc: 'PNG 隐写存档卡片双轨导出与恢复。' }
        };

        const target = appMap[appKey] || { title: '应用窗口', desc: '应用装载中...' };
        appModalTitle.textContent = target.title;
        appModalBody.innerHTML = `
            <div class="theme-setting-card">
                <div class="theme-setting-title">${target.title} 就绪</div>
                <div class="theme-setting-desc">${target.desc}</div>
            </div>
        `;
        appModal.classList.add('opened');
    };

    window.closePhoneApp = function () {
        const appModal = document.getElementById('appModal');
        if (appModal) appModal.classList.remove('opened');
    };

    function bootShell() {
        setInterval(updatePhoneClock, 1000);
        updatePhoneClock();
        bindPhoneNetworkAndBluetooth();
        bindPhoneBattery();
        initPhoneThemeAndWallpapers();
        initLockGestures();
        initDesktopSwipeGestures();
        window.renderDesktopWidgetsLayout();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootShell);
    else bootShell();
})();
