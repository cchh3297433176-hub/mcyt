/**
 * js/system/auth-engine.js
 * 🛡️ 主播掌机·QQ群白名单验证与反盗用风控前端中枢
 * 
 * 核心职责：
 * 1. 设备 UUID 生成与持久化保活（localStorage: mcyt_device_uuid）。
 * 2. 仿微信白灰微绿风格的【QQ号激活验证弹窗】。
 * 3. 向私有云鉴权端点 (http://121.43.122.253:8000/api/auth/verify) 上报 QQ 与 UUID 进行死锁绑定。
 * 4. 软硬件黑名单与冒领反制阻断：展示不可关闭的全屏微绿/告警 HUD，锁死一切操作。
 * 5. 鉴权状态本地快照保活与冷启动异步门禁（Gatekeeper）。
 */

(function () {
    'use strict';

    const AUTH_SERVER_URL = 'http://121.43.122.253:8000/api/auth/verify';
    const KEY_UUID = 'mcyt_device_uuid';
    const KEY_BOUND_QQ = 'mcyt_bound_qq';
    const KEY_AUTH_STATE = 'mcyt_auth_state_cache';

    // 1. 获取或生成标准硬件 UUID
    function getOrCreateDeviceUUID() {
        let uuid = localStorage.getItem(KEY_UUID);
        if (!uuid || uuid.trim().length < 10) {
            if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                uuid = crypto.randomUUID();
            } else {
                uuid = 'mcyt-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10);
            }
            localStorage.setItem(KEY_UUID, uuid);
        }
        return uuid;
    }

    const deviceUUID = getOrCreateDeviceUUID();

    // 2. 鉴权状态对象
    const AuthEngine = {
        uuid: deviceUUID,
        boundQQ: localStorage.getItem(KEY_BOUND_QQ) || '',
        isVerified: false,
        isBanned: false,

        // 读取本地缓存状态
        getSavedCache() {
            try {
                const raw = localStorage.getItem(KEY_AUTH_STATE);
                return raw ? JSON.parse(raw) : null;
            } catch (e) {
                return null;
            }
        },

        saveCache(data) {
            try {
                localStorage.setItem(KEY_AUTH_STATE, JSON.stringify(Object.assign({
                    time: Date.now()
                }, data)));
            } catch (e) {}
        },

        clearBoundQQ() {
            localStorage.removeItem(KEY_BOUND_QQ);
            localStorage.removeItem(KEY_AUTH_STATE);
            this.boundQQ = '';
            this.isVerified = false;
        },

        // 向服务器发起验证与绑定
        async verifyWithServer(qqNumber) {
            const payload = {
                qq: String(qqNumber).trim(),
                device_uuid: this.uuid,
                version: window.CURRENT_APP_VERSION || '1.611'
            };

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const res = await fetch(AUTH_SERVER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!res.ok) {
                    throw new Error(`HTTP_${res.status}`);
                }
                const data = await res.json();
                return data;
            } catch (err) {
                if (typeof window.recordSystemError === 'function') {
                    window.recordSystemError('AUTH_ENGINE', err, { qq: qqNumber, uuid: this.uuid });
                }
                return {
                    status: 'NETWORK_ERROR',
                    message: '无法连通鉴权服务器，请检查网络或稍后重试。'
                };
            }
        },

        // 统一展示微信质感全屏阻断 HUD（锁死界面，阻止进入掌机）
        showLockScreenHUD(options) {
            const { title, message, statusType, onRetry, showClearQQ } = options;

            let existingHud = document.getElementById('mcytAuthLockHUD');
            if (existingHud) existingHud.remove();

            const hud = document.createElement('div');
            hud.id = 'mcytAuthLockHUD';
            hud.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: #f7f7f7; z-index: 9999999; display: flex; flex-direction: column;
                align-items: center; justify-content: center; padding: 24px; box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif;
                user-select: none; -webkit-user-select: none;
            `;

            // 依据不同状态定制图标色调
            let iconSvg = '';
            if (statusType === 'BANNED' || statusType === 'DEVICE_BANNED') {
                iconSvg = `
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: #fee2e2; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                        <svg viewBox="0 0 24 24" style="width: 34px; height: 34px; stroke: #ef4444; stroke-width: 2.2; fill: none; stroke-linecap: round; stroke-linejoin: round;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                        </svg>
                    </div>
                `;
            } else if (statusType === 'IMPOSTOR_LOCKED') {
                iconSvg = `
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                        <svg viewBox="0 0 24 24" style="width: 34px; height: 34px; stroke: #f59e0b; stroke-width: 2.2; fill: none; stroke-linecap: round; stroke-linejoin: round;">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                `;
            } else {
                // 默认提示 / 待审核
                iconSvg = `
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: #e8f5e9; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                        <svg viewBox="0 0 24 24" style="width: 34px; height: 34px; stroke: #07c160; stroke-width: 2.2; fill: none; stroke-linecap: round; stroke-linejoin: round;">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                `;
            }

            hud.innerHTML = `
                ${iconSvg}
                <div style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 10px; text-align: center;">${title}</div>
                <div style="font-size: 13.5px; color: #4b5563; line-height: 1.6; text-align: center; max-width: 300px; margin-bottom: 24px;">${message}</div>
                
                <div style="width: 100%; max-width: 280px; display: flex; flex-direction: column; gap: 10px;">
                    ${onRetry ? `<button id="mcytAuthRetryBtn" style="width: 100%; height: 42px; border: none; border-radius: 8px; background: #07c160; color: #ffffff; font-size: 15px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center;">刷新重试</button>` : ''}
                    ${showClearQQ ? `<button id="mcytAuthClearBtn" style="width: 100%; height: 40px; border: 1px solid #d1d5db; border-radius: 8px; background: #ffffff; color: #374151; font-size: 14px; cursor: pointer;">换号重新激活</button>` : ''}
                </div>

                <div style="position: absolute; bottom: 20px; font-size: 11px; color: #9ca3af; text-align: center;">
                    设备凭证: <span style="font-family: monospace;">${deviceUUID.substring(0, 18)}...</span>
                </div>
            `;

            document.body.appendChild(hud);

            const retryBtn = document.getElementById('mcytAuthRetryBtn');
            if (retryBtn && onRetry) {
                retryBtn.onclick = () => {
                    retryBtn.textContent = '检测中...';
                    retryBtn.style.opacity = '0.7';
                    setTimeout(() => onRetry(), 300);
                };
            }

            const clearBtn = document.getElementById('mcytAuthClearBtn');
            if (clearBtn) {
                clearBtn.onclick = () => {
                    AuthEngine.clearBoundQQ();
                    hud.remove();
                    AuthEngine.showActivationModal();
                };
            }
        },

        // 呼出仿微信质感的输入 QQ 激活对话框
        showActivationModal() {
            let existing = document.getElementById('mcytAuthModalMask');
            if (existing) existing.remove();

            const mask = document.createElement('div');
            mask.id = 'mcytAuthModalMask';
            mask.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(0, 0, 0, 0.55); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
                z-index: 9999998; display: flex; align-items: center; justify-content: center;
                padding: 20px; box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", Arial, sans-serif;
            `;

            mask.innerHTML = `
                <div style="background: #ffffff; width: 100%; max-width: 320px; border-radius: 12px; overflow: hidden; box-shadow: 0 16px 36px rgba(0,0,0,0.22); animation: mcytAuthPop 0.22s ease-out;">
                    <div style="padding: 20px 20px 14px 20px; text-align: center;">
                        <div style="width: 48px; height: 48px; border-radius: 50%; background: #e8f5e9; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
                            <svg viewBox="0 0 24 24" style="width: 26px; height: 26px; stroke: #07c160; stroke-width: 2.2; fill: none; stroke-linecap: round; stroke-linejoin: round;">
                                <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z"></path>
                            </svg>
                        </div>
                        <div style="font-size: 16.5px; font-weight: 600; color: #181818; margin-bottom: 6px;">主播掌机·群成员激活</div>
                        <div style="font-size: 12.5px; color: #666666; line-height: 1.5;">
                            为保障内测权益，请绑定在群内已过审放行的群友纯数字 QQ 号。
                        </div>
                    </div>

                    <div style="padding: 0 20px 16px 20px;">
                        <input id="mcytAuthInputQQ" type="tel" maxlength="12" placeholder="请输入你的QQ号" style="
                            width: 100%; height: 44px; border: 1px solid #e0e0e0; border-radius: 8px;
                            padding: 0 12px; font-size: 15px; box-sizing: border-box; outline: none;
                            text-align: center; letter-spacing: 1px; transition: border-color 0.2s;
                            background: #fafafa;
                        " />
                        <div id="mcytAuthTipMsg" style="font-size: 11.5px; color: #ef4444; min-height: 16px; margin-top: 6px; text-align: center;"></div>
                    </div>

                    <div style="display: flex; border-top: 0.5px solid #f0f0f0;">
                        <button id="mcytAuthSubmitBtn" style="
                            flex: 1; height: 48px; border: none; background: #ffffff;
                            color: #07c160; font-size: 15px; font-weight: 600; cursor: pointer;
                        ">立即激活绑定</button>
                    </div>
                </div>
            `;

            document.body.appendChild(mask);

            const input = document.getElementById('mcytAuthInputQQ');
            const submitBtn = document.getElementById('mcytAuthSubmitBtn');
            const tipMsg = document.getElementById('mcytAuthTipMsg');

            if (input) {
                input.focus();
                input.oninput = () => {
                    input.value = input.value.replace(/[^\d]/g, '');
                    tipMsg.textContent = '';
                };
                input.onkeydown = (e) => {
                    if (e.key === 'Enter') submitBtn.click();
                };
            }

            submitBtn.onclick = async () => {
                const val = input.value.trim();
                if (!val || val.length < 5 || val.length > 12) {
                    tipMsg.textContent = '请输入合法的 5~12 位纯数字 QQ 号';
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = '校验激活中...';
                submitBtn.style.opacity = '0.6';

                const res = await AuthEngine.verifyWithServer(val);

                submitBtn.disabled = false;
                submitBtn.textContent = '立即激活绑定';
                submitBtn.style.opacity = '1';

                AuthEngine.handleVerifyResponse(res, val, mask);
            };
        },

        // 处理服务端校验响应结果
        handleVerifyResponse(res, qqVal, modalToClose) {
            const status = res.status || (res.code === 0 ? 'APPROVED' : 'ERROR');

            if (status === 'APPROVED') {
                // 审核通过并绑定成功
                this.boundQQ = qqVal;
                this.isVerified = true;
                localStorage.setItem(KEY_BOUND_QQ, qqVal);
                this.saveCache({ status: 'APPROVED', qq: qqVal });

                if (modalToClose) modalToClose.remove();

                const hud = document.getElementById('mcytAuthLockHUD');
                if (hud) hud.remove();

                if (typeof showToast === 'function') {
                    showToast('🎉 掌机身份验证成功！欢迎使用。', 'success');
                }
                return true;
            }

            if (status === 'PENDING') {
                if (modalToClose) modalToClose.remove();
                this.showLockScreenHUD({
                    title: '资格审核中 · 未放行',
                    message: `QQ: ${qqVal} 尚未获得放行许可。<br>请在官方群联系审核员发送：<br><b style="color:#07c160;">#通过 ${qqVal}</b> 即可解锁畅玩。`,
                    statusType: 'PENDING',
                    onRetry: async () => {
                        const re = await AuthEngine.verifyWithServer(qqVal);
                        AuthEngine.handleVerifyResponse(re, qqVal, null);
                    },
                    showClearQQ: true
                });
                return false;
            }

            if (status === 'IMPOSTOR_LOCKED') {
                if (modalToClose) modalToClose.remove();
                this.showLockScreenHUD({
                    title: 'QQ 账号已被其他设备绑定',
                    message: `检测到 QQ: ${qqVal} 已绑定到其他掌机硬件。<br>如果是你的账号被他人恶意抢注，请在群内联系管理员发送：<br><b style="color:#ef4444;">#撤销冒领 ${qqVal}</b><br>即可惩罚冒领者并释放账号重新绑定。`,
                    statusType: 'IMPOSTOR_LOCKED',
                    onRetry: async () => {
                        const re = await AuthEngine.verifyWithServer(qqVal);
                        AuthEngine.handleVerifyResponse(re, qqVal, null);
                    },
                    showClearQQ: true
                });
                return false;
            }

            if (status === 'BANNED' || status === 'BANNED_QQ') {
                if (modalToClose) modalToClose.remove();
                this.isBanned = true;
                this.showLockScreenHUD({
                    title: '账号已被吊销封禁',
                    message: `QQ: ${qqVal} 已被管理员列入吊销黑名单。<br>该账号已失去主播掌机内测资格。`,
                    statusType: 'BANNED',
                    onRetry: null,
                    showClearQQ: true
                });
                return false;
            }

            if (status === 'DEVICE_BANNED') {
                if (modalToClose) modalToClose.remove();
                this.isBanned = true;
                this.showLockScreenHUD({
                    title: '当前设备已被永久拉黑',
                    message: `该设备存在违规冒领或盗用行为，硬件 UUID 与 IP 已被系统风控死锁。<br>本掌机在此设备上已全面作废。`,
                    statusType: 'DEVICE_BANNED',
                    onRetry: null,
                    showClearQQ: false
                });
                return false;
            }

            // 其他网络错误或提示
            const tipMsg = document.getElementById('mcytAuthTipMsg');
            if (tipMsg) {
                tipMsg.textContent = res.message || '验证失败，请重试';
            } else {
                alert(res.message || '网络连接异常，请重试');
            }
            return false;
        },

        // 冷启动生命周期统一门禁拦截
        async enforceStartupGate() {
            // 1. 如果已有绑定的 QQ
            if (this.boundQQ) {
                // 读取本地缓存状态，提升冷启动流畅度
                const cache = this.getSavedCache();
                if (cache && cache.status === 'APPROVED' && cache.qq === this.boundQQ) {
                    this.isVerified = true;
                    // 后台静默校验状态（不阻塞主进程）
                    this.verifyWithServer(this.boundQQ).then(res => {
                        if (res.status === 'BANNED' || res.status === 'DEVICE_BANNED' || res.status === 'IMPOSTOR_LOCKED') {
                            AuthEngine.handleVerifyResponse(res, this.boundQQ, null);
                        }
                    });
                    return true;
                }

                // 无有效缓存，主动向服务器同步
                const res = await this.verifyWithServer(this.boundQQ);
                return this.handleVerifyResponse(res, this.boundQQ, null);
            }

            // 2. 首次进入或未绑定 QQ，阻断并弹出激活弹窗
            this.showActivationModal();
            return false;
        }
    };

    // 注入弹出动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes mcytAuthPop {
            0% { transform: scale(0.92); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    window.OtomeSecurityGuard = {
        isDeviceBanned: () => AuthEngine.isBanned,
        checkGate: () => AuthEngine.enforceStartupGate()
    };
    window.AuthEngine = AuthEngine;
})();
