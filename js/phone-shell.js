/**
 * js/shell/phone-shell.js
 * 📱 虚拟手机硬件外壳与操作系统驱动层 (修复锁屏点击、手势穿透与壁纸防崩)
 */

(function () {
    'use strict';

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

    // 2. 硬件电量与呼吸灯监听
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
        } catch (e) {
            // 忽略电量读取失败
        }
    }

    // 3. Canvas 内存取色（强力防报错包裹）
    window.currentThemeMode = localStorage.getItem('mcyt_phone_theme_mode') || 'auto';

    window.analyzeImageLuminance = function (imageUrl, callback) {
        if (!imageUrl) {
            if (typeof callback === 'function') callback(false);
            return;
        }
        try {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = function () {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 100;
                    canvas.height = 100;
                    ctx.drawImage(img, 0, 0, 100, 35, 0, 0, 100, 35);
                    const imgData = ctx.getImageData(0, 0, 100, 35).data;
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
                    if (typeof callback === 'function') callback(avgLuma > 145);
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

    window.applyColorTheme = function (isLightBg) {
        try {
            const root = document.documentElement;
            if (window.currentThemeMode === 'dark' || (!isLightBg && window.currentThemeMode === 'auto')) {
                root.style.setProperty('--status-color', '#ffffff');
                root.style.setProperty('--lock-text-color', '#ffffff');
                root.style.setProperty('--status-svg-fill', '#ffffff');
                root.style.setProperty('--star-glow-color', 'rgba(255, 255, 255, 0.9)');
            } else {
                root.style.setProperty('--status-color', '#2e1a22');
                root.style.setProperty('--lock-text-color', '#2e1a22');
                root.style.setProperty('--status-svg-fill', '#2e1a22');
                root.style.setProperty('--star-glow-color', 'rgba(46, 26, 34, 0.65)');
            }
        } catch (e) {}
    };

    // 4. 初始化壁纸
    function initPhoneWallpapers() {
        try {
            const savedLock = localStorage.getItem('mcyt_custom_lock_bg');
            const savedDesktop = localStorage.getItem('mcyt_custom_desktop_bg');
            const root = document.documentElement;

            if (savedLock && savedLock.startsWith('data:image')) {
                root.style.setProperty('--lock-bg-url', `url('${savedLock}')`);
                window.analyzeImageLuminance(savedLock, window.applyColorTheme);
            }
            if (savedDesktop && savedDesktop.startsWith('data:image')) {
                root.style.setProperty('--desktop-bg-url', `url('${savedDesktop}')`);
            }
        } catch (e) {}
    }

    // 5. 锁屏全屏手势与暴力解锁机制（杜绝任何挡道）
    function initLockGestures() {
        const screenLock = document.getElementById('screenLock');
        const lockBtn = document.getElementById('lockBtn');
        if (!screenLock) return;

        // 解锁核心执行函数
        window.unlockPhoneScreen = function () {
            screenLock.classList.add('unlocked');
            // 确保动画结束后 pointer-events 彻底关闭，绝不挡住桌面
            screenLock.style.pointerEvents = 'none';
        };

        // 重新锁屏函数
        window.lockPhoneScreen = function () {
            if (typeof window.closePhoneApp === 'function') {
                window.closePhoneApp();
            }
            screenLock.classList.remove('unlocked');
            screenLock.style.pointerEvents = 'auto';
        };

        // 全屏任意位置只要点击，立刻解锁！
        screenLock.addEventListener('click', function (e) {
            window.unlockPhoneScreen();
        });

        // 触屏滑动手势监听
        let touchStartY = 0;
        screenLock.addEventListener('touchstart', function (e) {
            if (e.touches && e.touches.length) {
                touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        screenLock.addEventListener('touchend', function (e) {
            if (e.changedTouches && e.changedTouches.length) {
                const touchEndY = e.changedTouches[0].clientY;
                // 上滑超过 30px 或者轻点一下，立刻解锁！
                if (touchStartY - touchEndY > 30 || Math.abs(touchStartY - touchEndY) < 10) {
                    window.unlockPhoneScreen();
                }
            }
        }, { passive: true });

        // 桌面顶部“锁定屏幕”按钮
        if (lockBtn) {
            lockBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                window.lockPhoneScreen();
            });
        }
    }

    // 6. 全屏 App 窗口生命周期调度
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

    // 7. 启动手机外壳服务
    function bootShell() {
        setInterval(updatePhoneClock, 1000);
        updatePhoneClock();
        bindPhoneBattery();
        initPhoneWallpapers();
        initLockGestures();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootShell);
    } else {
        bootShell();
    }
})();
