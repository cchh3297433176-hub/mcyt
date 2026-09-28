/**
 * js/apps/chat/chat-profile.js
 * 👤 微信身份与人设中枢模块
 * 职责：
 * 1. 玩家三维人设档案（线上主播 / 线下现实作息 / MC游戏皮肤）与个性签名
 * 2. assets/avatars/ 头像子目录架构，支持本地相册选取头像与图库随机
 * 3. 国家与地区实时检索筛选器、时区偏移换算、中国真实时间跟随询问
 * 4. 账号多马甲管理：小号独立通讯录、小号注册/改名/个性签名/换头像、小号新好友申请红点提示
 * 5. 专属双轨防丢持久化引擎与微信原生风格弹窗（解决改名重启失效Bug）
 */

(function() {
    'use strict';

    // 预留头像库专属子目录路径
    const AVATAR_SUBDIR = 'assets/avatars/';

    // 预置国家与时区字典（支持名称、拼音缩写与关键词极速过滤）
    const PRESET_REGIONS = [
        { name: '中国 (China)', code: 'CN', tz: 'UTC+8', offset: 8, keywords: 'zhongguo zg 中国 china' },
        { name: '美国 - 东部 (US East)', code: 'US_EST', tz: 'UTC-5', offset: -5, keywords: 'meiguo mg 美国 usa 纽约 波士顿' },
        { name: '美国 - 西部 (US West)', code: 'US_PST', tz: 'UTC-8', offset: -8, keywords: 'meiguo mg 美国 usa 洛杉矶 旧金山' },
        { name: '英国 (United Kingdom)', code: 'UK', tz: 'UTC+0', offset: 0, keywords: 'yingguo yg 英国 uk 伦敦' },
        { name: '日本 (Japan)', code: 'JP', tz: 'UTC+9', offset: 9, keywords: 'riben rb 日本 japan 东京' },
        { name: '韩国 (South Korea)', code: 'KR', tz: 'UTC+9', offset: 9, keywords: 'hanguo hg 韩国 seoul 首尔' },
        { name: '加拿大 (Canada)', code: 'CA', tz: 'UTC-5', offset: -5, keywords: 'jianada jnd 加拿大 toronto 多伦多' },
        { name: '澳大利亚 (Australia)', code: 'AU', tz: 'UTC+10', offset: 10, keywords: 'aodaliya adly 澳大利亚 sydney 悉尼' },
        { name: '德国 (Germany)', code: 'DE', tz: 'UTC+1', offset: 1, keywords: 'deguo dg 德国 berlin 柏林' },
        { name: '法国 (France)', code: 'FR', tz: 'UTC+1', offset: 1, keywords: 'faguo fg 法国 paris 巴黎' }
    ];

    // ============================================================
    // 💾 独立双轨持久化防丢引擎（彻底杜绝重启丢小号/丢人设/改名还原）
    // ============================================================
    function syncAccountsToStorage() {
        try {
            if (!window.G) window.G = {};
            if (window.G.altAccounts) {
                localStorage.setItem('mcyt_wechat_alt_accounts', JSON.stringify(window.G.altAccounts));
            }
            if (window.G.currentAccountId) {
                localStorage.setItem('mcyt_wechat_current_account_id', window.G.currentAccountId);
            }
            if (window.G.player) {
                const personaPayload = {
                    ytName: window.G.player.ytName || window.G.player.name || '',
                    name: window.G.player.ytName || window.G.player.name || '',
                    offlinePersona: window.G.player.offlinePersona || '',
                    onlinePersona: window.G.player.onlinePersona || '',
                    gameSkinPersona: window.G.player.gameSkinPersona || '',
                    signature: window.G.player.signature || '',
                    region: window.G.player.region || '中国 (China)',
                    regionCode: window.G.player.regionCode || 'CN',
                    avatar: window.G.player.avatar || ''
                };
                localStorage.setItem('mcyt_wechat_player_personas', JSON.stringify(personaPayload));
            }
        } catch (_) {}
    }

    function restoreAccountsFromStorage() {
        if (!window.G) window.G = {};
        if (!window.G.player) window.G.player = {};

        // 1. 恢复三维人设、个性签名、昵称与地区（若持久层存在，强制覆盖防还原）
        try {
            const rawPersonas = localStorage.getItem('mcyt_wechat_player_personas');
            if (rawPersonas) {
                const pData = JSON.parse(rawPersonas);
                if (pData.ytName) {
                    window.G.player.ytName = pData.ytName;
                    window.G.player.name = pData.ytName;
                    if (Array.isArray(window.G.player._nameHistory) && !window.G.player._nameHistory.includes(pData.ytName)) {
                        window.G.player._nameHistory.push(pData.ytName);
                    }
                }
                if (pData.offlinePersona !== undefined) window.G.player.offlinePersona = pData.offlinePersona;
                if (pData.onlinePersona !== undefined) window.G.player.onlinePersona = pData.onlinePersona;
                if (pData.gameSkinPersona !== undefined) window.G.player.gameSkinPersona = pData.gameSkinPersona;
                if (pData.signature !== undefined) window.G.player.signature = pData.signature;
                if (pData.region) window.G.player.region = pData.region;
                if (pData.regionCode) window.G.player.regionCode = pData.regionCode;
                if (pData.avatar) window.G.player.avatar = pData.avatar;
            }
        } catch (_) {}

        if (window.G.player.offlinePersona === undefined) window.G.player.offlinePersona = window.G.player.persona || '';
        if (window.G.player.onlinePersona === undefined) window.G.player.onlinePersona = window.G.player.avatarLive2d || '';
        if (window.G.player.gameSkinPersona === undefined) window.G.player.gameSkinPersona = window.G.player.skin || '';
        if (window.G.player.signature === undefined) window.G.player.signature = '';
        if (!window.G.player.region) window.G.player.region = '中国 (China)';

        // 2. 恢复小号列表
        try {
            const rawAlts = localStorage.getItem('mcyt_wechat_alt_accounts');
            if (rawAlts) {
                const alts = JSON.parse(rawAlts);
                if (Array.isArray(alts)) {
                    window.G.altAccounts = alts;
                }
            }
        } catch (_) {}
        if (!window.G.altAccounts) window.G.altAccounts = [];

        // 3. 恢复当前激活账号 ID
        const savedCurId = localStorage.getItem('mcyt_wechat_current_account_id');
        if (savedCurId) {
            window.G.currentAccountId = savedCurId;
        } else if (!window.G.currentAccountId) {
            window.G.currentAccountId = 'main';
        }
    }

    window.restoreWechatProfileData = restoreAccountsFromStorage;
    window.syncWechatProfileData = syncAccountsToStorage;
    restoreAccountsFromStorage();

    // 计算某个账号未处理的好友申请数量
    function getAccountPendingReqCount(accId) {
        if (!window.G || !Array.isArray(window.G.friendRequests)) return 0;
        return window.G.friendRequests.filter(r => {
            const target = r.targetAccountId || 'main';
            return target === accId;
        }).length;
    }

    // ============================================================
    // 👤 当前激活账号信息读取
    // ============================================================
    function getActiveAccountInfo() {
        restoreAccountsFromStorage();
        const curId = window.G.currentAccountId || 'main';
        if (curId === 'main') {
            return {
                id: 'main',
                isAlt: false,
                name: window.G.player?.ytName || window.G.player?.name || '主播大号',
                avatar: window.G.player?.avatar || (typeof getRandomAvatar === 'function' ? getRandomAvatar() : 'assets/icons/chat.png'),
                signature: window.G.player?.signature || '',
                bio: '官方主账号',
                region: window.G.player?.region || '中国 (China)'
            };
        }
        const found = (window.G.altAccounts || []).find(a => a.id === curId);
        if (found) {
            return {
                id: found.id,
                isAlt: true,
                name: found.name,
                avatar: found.avatar || (typeof getRandomAvatar === 'function' ? getRandomAvatar() : 'assets/icons/chat.png'),
                signature: found.signature || '',
                bio: found.bio || '小号',
                region: found.region || '中国 (China)'
            };
        }
        return {
            id: 'main',
            isAlt: false,
            name: window.G.player?.ytName || window.G.player?.name || '主播大号',
            avatar: window.G.player?.avatar || 'assets/icons/chat.png',
            signature: '',
            bio: '',
            region: '中国 (China)'
        };
    }
    window.getActiveAccountInfo = getActiveAccountInfo;

    // ============================================================
    // 🖥️ 渲染「我」页面 HTML（带小号红点提示）
    // ============================================================
    function buildProfileTabHTML() {
        const curAcc = getActiveAccountInfo();
        const p = window.G.player || {};
        const isAlt = curAcc.isAlt;

        let altsListHtml = '';
        const alts = window.G.altAccounts || [];
        alts.forEach(alt => {
            const isUsing = window.G.currentAccountId === alt.id;
            const altSig = alt.signature ? escapeHtml(alt.signature) : '未设置个性签名';
            const pendingCount = getAccountPendingReqCount(alt.id);

            altsListHtml += `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9fafb;border-radius:8px;border:0.5px solid #e5e7eb;margin-bottom:6px;">
                <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
                    <div style="position:relative;width:38px;height:38px;flex-shrink:0;">
                        <img src="${alt.avatar || 'assets/icons/chat.png'}" style="width:100%;height:100%;border-radius:6px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';" />
                        ${pendingCount > 0 ? `
                        <span style="position:absolute;top:-4px;right:-4px;background:#fa5151;color:#fff;font-size:9.5px;font-weight:700;padding:1px 5px;border-radius:9px;border:1.5px solid #fff;line-height:1.1;">
                            ${pendingCount}
                        </span>` : ''}
                    </div>
                    <div style="min-width:0;flex:1;">
                        <div style="font-size:13px;font-weight:600;color:#1f2937;display:flex;align-items:center;gap:4px;">
                            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;">${escapeHtml(alt.name)}</span>
                            <span style="font-size:10px;background:#e5e7eb;color:#4b5563;padding:1px 4px;border-radius:3px;font-weight:normal;">小号</span>
                            ${pendingCount > 0 ? `<span style="font-size:10px;color:#fa5151;font-weight:500;">新申请</span>` : ''}
                        </div>
                        <div style="font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;">
                            ${altSig}
                        </div>
                    </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                    <button type="button" onclick="window.openChangeAvatarOptionsModal('${alt.id}')" style="border:1px solid #dcdcdc;background:#fff;color:#576b95;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer;">换头像</button>
                    <button type="button" onclick="window.openChangeSignatureModal('${alt.id}')" style="border:1px solid #dcdcdc;background:#fff;color:#576b95;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer;">签名</button>
                    ${isUsing ? '<span style="font-size:11px;color:#07c160;font-weight:600;padding:0 4px;">使用中</span>' : `<button type="button" onclick="window.switchToAccount('${alt.id}')" style="border:none;background:#07c160;color:#fff;padding:4px 9px;border-radius:4px;font-size:11px;cursor:pointer;">使用</button>`}
                    <button type="button" onclick="window.confirmDeleteAltAccount('${alt.id}', '${escapeHtml(alt.name)}')" style="border:none;background:none;color:#fa5151;font-size:14px;cursor:pointer;padding:2px 4px;">✕</button>
                </div>
            </div>
            `;
        });

        const currentSigText = curAcc.signature ? escapeHtml(curAcc.signature) : '未设置个性签名';
        const mainPendingCount = getAccountPendingReqCount('main');

        return `
        <div style="background:#ededed;min-height:100%;padding-bottom:30px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,sans-serif;">
            <!-- 当前激活名片 -->
            <div style="background:#ffffff;padding:16px;border-bottom:0.5px solid #e0e0e0;">
                <div style="display:flex;align-items:center;gap:14px;">
                    <div style="position:relative;flex-shrink:0;cursor:pointer;" onclick="window.openChangeAvatarOptionsModal('${curAcc.id}')">
                        <img id="myWechatAvatar" src="${curAcc.avatar}" style="width:62px;height:62px;border-radius:8px;object-fit:cover;display:block;" onerror="this.src='assets/icons/chat.png';" />
                        <span style="position:absolute;bottom:0;right:0;background:rgba(0,0,0,0.55);color:#fff;font-size:9px;padding:1px 4px;border-radius:2px;">修改</span>
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span style="font-size:17px;font-weight:600;color:#181818;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(curAcc.name)}</span>
                            <button type="button" onclick="window.openChangeAccountNameModal('${curAcc.id}')" style="border:none;background:none;color:#576b95;font-size:12px;cursor:pointer;padding:0;">[改名]</button>
                        </div>
                        <div style="font-size:12px;color:#888888;margin-top:4px;">
                            地区：${escapeHtml(curAcc.region || '中国 (China)')} · ${isAlt ? '小号模式' : '官方大号'}
                        </div>
                    </div>
                    <button type="button" onclick="window.openChangeAvatarOptionsModal('${curAcc.id}')" style="border:1px solid #e0e0e0;background:#f7f7f7;color:#07c160;padding:5px 9px;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;flex-shrink:0;">
                        换头像
                    </button>
                </div>

                <!-- 个性签名展示条 -->
                <div onclick="window.openChangeSignatureModal('${curAcc.id}')" style="margin-top:12px;padding-top:10px;border-top:0.5px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
                    <div style="font-size:12.5px;color:#555;display:flex;align-items:center;gap:6px;min-width:0;flex:1;">
                        <span style="color:#999;flex-shrink:0;">签名</span>
                        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${curAcc.signature ? '#333' : '#aaa'};">${currentSigText}</span>
                    </div>
                    <span style="color:#c7c7cc;font-size:13px;flex-shrink:0;margin-left:8px;">›</span>
                </div>
            </div>

            <!-- 常驻地区与时区设定 -->
            <div style="margin-top:10px;background:#ffffff;padding:14px 16px;border-top:0.5px solid #e0e0e0;border-bottom:0.5px solid #e0e0e0;">
                <div style="font-size:14px;font-weight:600;color:#181818;margin-bottom:8px;">常驻地区与时区设定</div>
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f7f7f7;border-radius:6px;">
                    <div>
                        <div style="font-size:13px;font-weight:600;color:#1f2937;" id="currentSelectedRegionText">${escapeHtml(curAcc.region || '中国 (China)')}</div>
                    </div>
                    <button type="button" onclick="window.openRegionSearchModal()" style="border:1px solid #dcdcdc;background:#fff;color:#576b95;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;font-weight:500;">
                        选择地区
                    </button>
                </div>
            </div>

            <!-- 三维人设系统 -->
            <div style="margin-top:10px;background:#ffffff;padding:14px 16px;border-top:0.5px solid #e0e0e0;border-bottom:0.5px solid #e0e0e0;">
                <div style="font-size:14px;font-weight:600;color:#181818;margin-bottom:12px;">人设档案系统</div>

                <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:12.5px;color:#374151;font-weight:600;display:block;margin-bottom:3px;">1. 线下人设 (现实生活作息/性格习惯)</label>
                    <textarea id="inpOfflinePersona" rows="2" placeholder="填写你的线下现实身份、日常作息习惯与性格特征..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;background:#fafafa;font-size:12.5px;line-height:1.5;box-sizing:border-box;resize:none;outline:none;font-family:inherit;">${escapeHtml(p.offlinePersona || '')}</textarea>
                </div>

                <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:12.5px;color:#374151;font-weight:600;display:block;margin-bottom:3px;">2. 线上人设 (主播风格/皮套/创作赛道)</label>
                    <textarea id="inpOnlinePersona" rows="2" placeholder="填写你的主播赛道、直播口吻、观众粉丝互动风格..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;background:#fafafa;font-size:12.5px;line-height:1.5;box-sizing:border-box;resize:none;outline:none;font-family:inherit;">${escapeHtml(p.onlinePersona || '')}</textarea>
                </div>

                <div class="form-group" style="margin-bottom:12px;">
                    <label style="font-size:12.5px;color:#374151;font-weight:600;display:block;margin-bottom:3px;">3. 游戏皮肤人设 (MC形象/像素设定/玩法偏好)</label>
                    <textarea id="inpGameSkinPersona" rows="2" placeholder="填写你在Minecraft中的像素皮肤形象、战斗或红石建筑风格..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;background:#fafafa;font-size:12.5px;line-height:1.5;box-sizing:border-box;resize:none;outline:none;font-family:inherit;">${escapeHtml(p.gameSkinPersona || '')}</textarea>
                </div>

                <div style="display:flex;justify-content:flex-end;">
                    <button type="button" onclick="window.saveTriPersonas()" style="border:none;background:#07c160;color:#ffffff;padding:7px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">
                        保存设定
                    </button>
                </div>
            </div>

            <!-- 账号多马甲管理 -->
            <div style="margin-top:10px;background:#ffffff;padding:14px 16px;border-top:0.5px solid #e0e0e0;border-bottom:0.5px solid #e0e0e0;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                    <div style="font-size:14px;font-weight:600;color:#181818;">多账号管理</div>
                    <button type="button" onclick="window.openCreateAltAccountModalModern()" style="border:none;background:#ededed;color:#576b95;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer;">
                        + 注册小号
                    </button>
                </div>

                <!-- 主号项 -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9fafb;border-radius:8px;border:0.5px solid #e5e7eb;margin-bottom:6px;">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
                        <div style="position:relative;width:38px;height:38px;flex-shrink:0;">
                            <img src="${p.avatar || 'assets/icons/chat.png'}" style="width:100%;height:100%;border-radius:6px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';" />
                            ${mainPendingCount > 0 ? `<span style="position:absolute;top:-4px;right:-4px;background:#fa5151;color:#fff;font-size:9.5px;font-weight:700;padding:1px 5px;border-radius:9px;border:1.5px solid #fff;line-height:1.1;">${mainPendingCount}</span>` : ''}
                        </div>
                        <div style="min-width:0;flex:1;">
                            <div style="font-size:13px;font-weight:600;color:#1f2937;display:flex;align-items:center;gap:4px;">
                                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;">${escapeHtml(p.ytName || p.name || '主播大号')}</span>
                                <span style="font-size:10px;background:#e8f8f0;color:#07c160;padding:1px 4px;border-radius:3px;">主号</span>
                                ${mainPendingCount > 0 ? `<span style="font-size:10px;color:#fa5151;font-weight:500;">新申请</span>` : ''}
                            </div>
                            <div style="font-size:11px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;">
                                ${p.signature ? escapeHtml(p.signature) : '未设置个性签名'}
                            </div>
                        </div>
                    </div>
                    <div>
                        ${curAcc.id === 'main' ? '<span style="font-size:11px;color:#07c160;font-weight:600;padding:0 4px;">使用中</span>' : `<button type="button" onclick="window.switchToAccount('main')" style="border:none;background:#07c160;color:#fff;padding:4px 9px;border-radius:4px;font-size:11px;cursor:pointer;">使用</button>`}
                    </div>
                </div>
                ${altsListHtml}
            </div>
        </div>
        `;
    }
    window.buildProfileTabHTML = buildProfileTabHTML;

    // ============================================================
    // 微信拟真通用对话框助手（纯正微信白灰绿质感）
    // ============================================================
    function showWechatStyleModal(htmlContent) {
        const exist = document.getElementById('wechatProfileInnerModal');
        if (exist) exist.remove();

        const mask = document.createElement('div');
        mask.id = 'wechatProfileInnerModal';
        mask.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);z-index:999999;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,sans-serif;';
        mask.innerHTML = `
            <div style="background:#ffffff;border-radius:12px;width:100%;max-width:320px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.18);animation:wechatPopIn 0.2s cubic-bezier(0.16,1,0.3,1);">
                ${htmlContent}
            </div>
        `;
        document.body.appendChild(mask);
    }

    function closeWechatStyleModal() {
        const exist = document.getElementById('wechatProfileInnerModal');
        if (exist) exist.remove();
    }
    window.closeWechatStyleModal = closeWechatStyleModal;

    // 保存三维人设
    window.saveTriPersonas = function() {
        if (!window.G.player) window.G.player = {};
        window.G.player.offlinePersona = document.getElementById('inpOfflinePersona')?.value.trim() || '';
        window.G.player.onlinePersona = document.getElementById('inpOnlinePersona')?.value.trim() || '';
        window.G.player.gameSkinPersona = document.getElementById('inpGameSkinPersona')?.value.trim() || '';
        window.G.player.persona = window.G.player.offlinePersona;

        syncAccountsToStorage();

        showWechatStyleModal(`
            <div style="padding:24px 20px 20px;text-align:center;">
                <div style="font-size:16px;font-weight:600;color:#181818;margin-bottom:8px;">设置已保存</div>
                <div style="font-size:13px;color:#888;line-height:1.5;margin-bottom:20px;">
                    人设档案已更新并自动持久化。
                </div>
                <button type="button" onclick="window.closeWechatStyleModal()" style="width:100%;padding:10px 0;background:#07c160;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;">
                    确定
                </button>
            </div>
        `);

        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // ✍️ 修改个性签名弹窗
    window.openChangeSignatureModal = function(targetAccountId) {
        let oldSig = '';
        if (targetAccountId === 'main') {
            oldSig = window.G.player?.signature || '';
        } else {
            const alt = (window.G.altAccounts || []).find(a => a.id === targetAccountId);
            oldSig = alt?.signature || '';
        }

        showWechatStyleModal(`
            <div style="padding:20px 18px 16px;">
                <div style="font-size:15px;font-weight:600;color:#181818;margin-bottom:12px;">设置个性签名</div>
                <textarea id="wechatSigInput" maxlength="60" rows="3" placeholder="填写个签，展现你的专属特色..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;background:#f7f7f7;font-size:13px;box-sizing:border-box;outline:none;resize:none;font-family:inherit;line-height:1.4;">${escapeHtml(oldSig)}</textarea>
                <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
                    <button type="button" onclick="window.closeWechatStyleModal()" style="padding:7px 16px;border:none;background:#f2f2f2;color:#333;border-radius:6px;font-size:13px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmSigSave" style="padding:7px 18px;border:none;background:#07c160;color:#fff;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">完成</button>
                </div>
            </div>
        `);

        document.getElementById('btnConfirmSigSave').onclick = () => {
            const val = document.getElementById('wechatSigInput').value.trim();
            if (targetAccountId === 'main') {
                if (!window.G.player) window.G.player = {};
                window.G.player.signature = val;
            } else {
                const alt = (window.G.altAccounts || []).find(a => a.id === targetAccountId);
                if (alt) alt.signature = val;
            }
            syncAccountsToStorage();
            window.closeWechatStyleModal();
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
    };

    // 🌐 国家与地区检索选择器
    window.openRegionSearchModal = function() {
        let currentList = [...PRESET_REGIONS];

        function renderList(list) {
            return list.map(item => `
                <div class="region-select-item" onclick="window.confirmPickRegion('${item.code}')" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:0.5px solid #f0f0f0;cursor:pointer;">
                    <div>
                        <div style="font-size:13.5px;font-weight:500;color:#181818;">${escapeHtml(item.name)}</div>
                        <div style="font-size:11px;color:#888;margin-top:2px;">时区: ${item.tz}</div>
                    </div>
                    <span style="color:#07c160;font-size:13px;font-weight:600;">选择</span>
                </div>
            `).join('');
        }

        showWechatStyleModal(`
            <div style="text-align:left;">
                <div style="padding:14px 16px;border-bottom:0.5px solid #eee;font-size:15px;font-weight:600;color:#181818;display:flex;align-items:center;justify-content:space-between;">
                    <span>选择地区</span>
                    <span onclick="window.closeWechatStyleModal()" style="font-size:14px;color:#888;cursor:pointer;">关闭</span>
                </div>
                <div style="padding:10px 14px;background:#fff;">
                    <input type="text" id="regionSearchInput" placeholder="输入国家名称快速搜索..." style="width:100%;padding:7px 10px;border-radius:6px;border:1px solid #e0e0e0;background:#f7f7f7;font-size:12.5px;box-sizing:border-box;outline:none;">
                </div>
                <div id="regionListContainer" style="max-height:240px;overflow-y:auto;background:#fff;">
                    ${renderList(currentList)}
                </div>
            </div>
        `);

        document.getElementById('regionSearchInput').oninput = function(e) {
            const kw = e.target.value.trim().toLowerCase();
            const filtered = PRESET_REGIONS.filter(r => r.name.toLowerCase().includes(kw) || r.keywords.includes(kw));
            const cont = document.getElementById('regionListContainer');
            if (cont) cont.innerHTML = renderList(filtered) || '<div style="padding:24px;text-align:center;color:#999;font-size:12px;">无匹配结果</div>';
        };
    };

    window.confirmPickRegion = function(code) {
        const item = PRESET_REGIONS.find(r => r.code === code);
        if (!item) return;

        window.closeWechatStyleModal();
        const curAcc = getActiveAccountInfo();
        if (curAcc.isAlt) {
            const alt = (window.G.altAccounts || []).find(a => a.id === curAcc.id);
            if (alt) alt.region = item.name;
        } else {
            if (!window.G.player) window.G.player = {};
            window.G.player.region = item.name;
            window.G.player.regionCode = item.code;
        }

        syncAccountsToStorage();

        if (item.code === 'CN') {
            setTimeout(() => {
                showWechatStyleModal(`
                    <div style="padding:22px 18px 18px;text-align:center;">
                        <div style="font-size:15px;font-weight:600;color:#181818;margin-bottom:8px;">时间跟随设置</div>
                        <div style="font-size:13px;color:#888;line-height:1.5;margin-bottom:18px;">
                            是否让聊天内时间直接跟随现实真实系统时间？
                        </div>
                        <div style="display:flex;gap:10px;">
                            <button type="button" onclick="window.setFollowTimeMode(false)" style="flex:1;padding:8px 0;background:#f2f2f2;color:#333;border:none;border-radius:6px;font-size:13px;cursor:pointer;">保持游戏进度</button>
                            <button type="button" onclick="window.setFollowTimeMode(true)" style="flex:1;padding:8px 0;background:#07c160;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">跟随真实时间</button>
                        </div>
                    </div>
                `);
            }, 120);
        } else {
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof autoSaveGame === 'function') autoSaveGame();
        }
    };

    window.setFollowTimeMode = function(followReal) {
        window.closeWechatStyleModal();
        if (!window.G.clockConfig) window.G.clockConfig = {};
        window.G.clockConfig.mode = followReal ? 'real' : 'game';
        if (typeof renderChatApp === 'function') renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // 🖼️ 头像更换与改名（仿微信 ActionSheet 质感）
    window.openChangeAvatarOptionsModal = function(targetAccountId) {
        showWechatStyleModal(`
            <div style="text-align:center;padding:18px 16px;">
                <div style="font-size:15px;font-weight:600;color:#181818;margin-bottom:14px;">更换头像</div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <label style="display:block;background:#f7f7f7;padding:11px 0;border-radius:6px;cursor:pointer;text-align:center;">
                        <span style="font-size:13.5px;font-weight:500;color:#181818;">从手机相册选取</span>
                        <input type="file" id="localAvatarFileInput" accept="image/*" style="display:none;">
                    </label>
                    <button type="button" onclick="window.pickFromAvatarLibrary('${targetAccountId}')" style="border:none;background:#f7f7f7;padding:11px 0;border-radius:6px;font-size:13.5px;font-weight:500;color:#181818;cursor:pointer;">
                        从头像库随机抽取
                    </button>
                </div>
                <button type="button" onclick="window.closeWechatStyleModal()" style="margin-top:12px;width:100%;border:none;background:none;color:#888;font-size:13px;padding:6px 0;cursor:pointer;">
                    取消
                </button>
            </div>
        `);

        document.getElementById('localAvatarFileInput').onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                const base64 = evt.target.result;
                window.applyNewAvatar(targetAccountId, base64);
                window.closeWechatStyleModal();
            };
            reader.readAsDataURL(file);
        };
    };

    window.pickFromAvatarLibrary = function(targetAccountId) {
        const randImg = (typeof getRandomAvatar === 'function') ? getRandomAvatar() : `${AVATAR_SUBDIR}1.png`;
        window.applyNewAvatar(targetAccountId, randImg);
        window.closeWechatStyleModal();
    };

    window.applyNewAvatar = function(targetAccountId, imgUrl) {
        if (targetAccountId === 'main') {
            if (!window.G.player) window.G.player = {};
            window.G.player.avatar = imgUrl;
        } else {
            const alt = (window.G.altAccounts || []).find(a => a.id === targetAccountId);
            if (alt) alt.avatar = imgUrl;
        }
        syncAccountsToStorage();
        if (typeof renderChatApp === 'function') renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // 改名弹窗（彻底同步至 ytName / name / 历史库与本地双轨持久化）
    window.openChangeAccountNameModal = function(targetAccountId) {
        const curAcc = getActiveAccountInfo();
        const currentName = (targetAccountId === 'main') ? (window.G.player?.ytName || window.G.player?.name || '') : curAcc.name;

        showWechatStyleModal(`
            <div style="padding:20px 18px 16px;">
                <div style="font-size:15px;font-weight:600;color:#181818;margin-bottom:12px;">修改昵称</div>
                <input type="text" id="changeNameInput" value="${escapeHtml(currentName)}" maxlength="20" style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;background:#f7f7f7;font-size:13px;box-sizing:border-box;outline:none;">
                <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
                    <button type="button" onclick="window.closeWechatStyleModal()" style="padding:7px 16px;border:none;background:#f2f2f2;color:#333;border-radius:6px;font-size:13px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmChangeName" style="padding:7px 18px;border:none;background:#07c160;color:#fff;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">保存</button>
                </div>
            </div>
        `);

        document.getElementById('btnConfirmChangeName').onclick = () => {
            const val = document.getElementById('changeNameInput').value.trim();
            if (!val) return;
            if (targetAccountId === 'main') {
                if (!window.G.player) window.G.player = {};
                window.G.player.ytName = val;
                window.G.player.name = val;
                if (!Array.isArray(window.G.player._nameHistory)) {
                    window.G.player._nameHistory = [val];
                } else if (!window.G.player._nameHistory.includes(val)) {
                    window.G.player._nameHistory.push(val);
                }
            } else {
                const alt = (window.G.altAccounts || []).find(a => a.id === targetAccountId);
                if (alt) alt.name = val;
            }
            syncAccountsToStorage();
            window.closeWechatStyleModal();
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof autoSaveGame === 'function') autoSaveGame();
            if (typeof showToast === 'function') showToast('昵称已修改并保存', 'success', 1000);
        };
    };

    window.switchToAccount = function(accId) {
        window.G.currentAccountId = accId;
        syncAccountsToStorage();
        if (typeof renderChatApp === 'function') renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.confirmDeleteAltAccount = function(altId, altName) {
        showWechatStyleModal(`
            <div style="padding:22px 18px 18px;text-align:center;">
                <div style="font-size:15px;font-weight:600;color:#181818;margin-bottom:8px;">注销小号</div>
                <div style="font-size:13px;color:#888;line-height:1.5;margin-bottom:18px;">
                    确定注销小号「${altName}」吗？注销后该号的独立通讯录与会话记录将被清空。
                </div>
                <div style="display:flex;gap:10px;">
                    <button type="button" onclick="window.closeWechatStyleModal()" style="flex:1;padding:8px 0;background:#f2f2f2;color:#333;border:none;border-radius:6px;font-size:13px;cursor:pointer;">取消</button>
                    <button type="button" onclick="window.doExecuteDeleteAlt('${altId}')" style="flex:1;padding:8px 0;background:#fa5151;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">确认注销</button>
                </div>
            </div>
        `);
    };

    window.doExecuteDeleteAlt = function(altId) {
        window.G.altAccounts = (window.G.altAccounts || []).filter(a => a.id !== altId);
        if (window.G.currentAccountId === altId) window.G.currentAccountId = 'main';
        syncAccountsToStorage();
        window.closeWechatStyleModal();
        if (typeof renderChatApp === 'function') renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // 注册小号
    window.openCreateAltAccountModalModern = function() {
        let assignedAvatar = (typeof getRandomAvatar === 'function') ? getRandomAvatar() : `${AVATAR_SUBDIR}1.png`;
        showWechatStyleModal(`
            <div style="padding:20px 18px 16px;">
                <div style="font-size:15px;font-weight:600;color:#181818;margin-bottom:14px;">注册小号</div>
                <div style="margin-bottom:10px;">
                    <label style="font-size:12px;color:#666;display:block;margin-bottom:4px;">小号昵称</label>
                    <input type="text" id="newAltName" placeholder="输入小号昵称..." maxlength="20" style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;background:#f7f7f7;font-size:13px;box-sizing:border-box;outline:none;">
                </div>
                <div style="margin-bottom:14px;">
                    <label style="font-size:12px;color:#666;display:block;margin-bottom:4px;">个性签名 (选填)</label>
                    <input type="text" id="newAltSignature" placeholder="输入个性签名..." maxlength="60" style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;background:#f7f7f7;font-size:13px;box-sizing:border-box;outline:none;">
                </div>
                <div style="display:flex;justify-content:flex-end;gap:10px;">
                    <button type="button" onclick="window.closeWechatStyleModal()" style="padding:7px 16px;border:none;background:#f2f2f2;color:#333;border-radius:6px;font-size:13px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmAlt" style="padding:7px 18px;border:none;background:#07c160;color:#fff;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">创建并使用</button>
                </div>
            </div>
        `);

        document.getElementById('btnConfirmAlt').onclick = () => {
            const name = document.getElementById('newAltName').value.trim();
            const signature = document.getElementById('newAltSignature').value.trim();
            if (!name) return;
            const newId = 'alt_' + Date.now();
            if (!window.G.altAccounts) window.G.altAccounts = [];
            window.G.altAccounts.push({
                id: newId,
                name,
                avatar: assignedAvatar,
                signature: signature,
                region: window.G.player?.region || '中国 (China)',
                contacts: []
            });
            window.G.currentAccountId = newId;
            syncAccountsToStorage();
            window.closeWechatStyleModal();
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
    };

})();
