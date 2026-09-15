/**
 * js/apps/chat/chat-profile.js
 * 👤 微信身份与人设中枢模块
 * 职责：
 * 1. 玩家三维人设档案（线上主播 / 线下现实作息 / MC游戏皮肤），默认纯净空白
 * 2. 国家与地区实时检索筛选器、时区偏移换算、中国真实时间跟随询问
 * 3. 账号多马甲管理：小号独立空白通讯录、小号注册/改名/换头像
 * 4. 专属双轨防丢持久化引擎（解决冷启动小号丢失问题）
 */

(function() {
    'use strict';

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
    // 💾 独立双轨持久化防丢引擎（彻底杜绝重启丢小号/丢人设）
    // ============================================================
    function syncAccountsToStorage() {
        try {
            if (window.G && window.G.altAccounts) {
                localStorage.setItem('mcyt_wechat_alt_accounts', JSON.stringify(window.G.altAccounts));
            }
            if (window.G && window.G.currentAccountId) {
                localStorage.setItem('mcyt_wechat_current_account_id', window.G.currentAccountId);
            }
            if (window.G && window.G.player) {
                const personaPayload = {
                    offlinePersona: window.G.player.offlinePersona || '',
                    onlinePersona: window.G.player.onlinePersona || '',
                    gameSkinPersona: window.G.player.gameSkinPersona || '',
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

        // 1. 恢复三维人设与地区
        try {
            const rawPersonas = localStorage.getItem('mcyt_wechat_player_personas');
            if (rawPersonas) {
                const pData = JSON.parse(rawPersonas);
                if (pData.offlinePersona !== undefined) window.G.player.offlinePersona = pData.offlinePersona;
                if (pData.onlinePersona !== undefined) window.G.player.onlinePersona = pData.onlinePersona;
                if (pData.gameSkinPersona !== undefined) window.G.player.gameSkinPersona = pData.gameSkinPersona;
                if (pData.region) window.G.player.region = pData.region;
                if (pData.regionCode) window.G.player.regionCode = pData.regionCode;
                if (pData.avatar) window.G.player.avatar = pData.avatar;
            }
        } catch (_) {}

        // 默认值：纯净为空，绝不强加默认人设
        if (window.G.player.offlinePersona === undefined) window.G.player.offlinePersona = '';
        if (window.G.player.onlinePersona === undefined) window.G.player.onlinePersona = '';
        if (window.G.player.gameSkinPersona === undefined) window.G.player.gameSkinPersona = '';
        if (!window.G.player.region) window.G.player.region = '中国 (China)';

        // 2. 恢复小号列表
        try {
            const rawAlts = localStorage.getItem('mcyt_wechat_alt_accounts');
            if (rawAlts) {
                const alts = JSON.parse(rawAlts);
                if (Array.isArray(alts)) window.G.altAccounts = alts;
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

    // 暴露初始化恢复函数
    window.restoreWechatProfileData = restoreAccountsFromStorage;
    restoreAccountsFromStorage();

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
                name: window.G.player?.ytName || '主播大号',
                avatar: window.G.player?.avatar || (typeof getRandomAvatar === 'function' ? getRandomAvatar() : 'assets/icons/chat.png'),
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
                bio: found.bio || '私密小号',
                region: found.region || '中国 (China)'
            };
        }
        return { id: 'main', isAlt: false, name: window.G.player?.ytName || '主播大号', avatar: window.G.player?.avatar || 'assets/icons/chat.png', bio: '', region: '中国 (China)' };
    }
    window.getActiveAccountInfo = getActiveAccountInfo;

    // ============================================================
    // 🖥️ 渲染「我」页面 HTML
    // ============================================================
    function buildProfileTabHTML() {
        const curAcc = getActiveAccountInfo();
        const p = window.G.player || {};
        const isAlt = curAcc.isAlt;

        let altsListHtml = '';
        const alts = window.G.altAccounts || [];
        alts.forEach(alt => {
            const isUsing = window.G.currentAccountId === alt.id;
            altsListHtml += `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9fafb;border-radius:8px;border:0.5px solid #e5e7eb;margin-bottom:6px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${alt.avatar || 'assets/icons/chat.png'}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';" />
                    <div>
                        <div style="font-size:13px;font-weight:600;color:#1f2937;">${escapeHtml(alt.name)} <span style="font-size:10px;background:#e5e7eb;padding:1px 4px;border-radius:3px;">小号</span></div>
                        <div style="font-size:11px;color:#6b7280;">地区：${escapeHtml(alt.region || '中国 (China)')}</div>
                    </div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;">
                    <button type="button" onclick="window.openChangeAvatarOptionsModal('${alt.id}')" style="border:1px solid #dcdcdc;background:#fff;color:#2563eb;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer;">换头像</button>
                    ${isUsing ? '<span style="font-size:11px;color:#059669;font-weight:600;">使用中</span>' : `<button type="button" onclick="window.switchToAccount('${alt.id}')" style="border:none;background:#07c160;color:#fff;padding:4px 9px;border-radius:4px;font-size:11px;cursor:pointer;">使用</button>`}
                    <button type="button" onclick="window.deleteAltAccountDirect('${alt.id}')" style="border:none;background:none;color:#ef4444;font-size:13px;cursor:pointer;padding:2px;">✕</button>
                </div>
            </div>
            `;
        });

        return `
        <div style="background:#f7f7f7;min-height:100%;padding-bottom:30px;box-sizing:border-box;">
            <!-- 当前激活名片 -->
            <div style="background:#ffffff;padding:16px;display:flex;align-items:center;gap:14px;border-bottom:0.5px solid #e0e0e0;">
                <div style="position:relative;flex-shrink:0;cursor:pointer;" onclick="window.openChangeAvatarOptionsModal('${curAcc.id}')">
                    <img id="myWechatAvatar" src="${curAcc.avatar}" style="width:62px;height:62px;border-radius:8px;object-fit:cover;display:block;" onerror="this.src='assets/icons/chat.png';" />
                    <span style="position:absolute;bottom:0;right:0;background:rgba(0,0,0,0.6);color:#fff;font-size:9px;padding:1px 3px;border-radius:2px;">修改</span>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="font-size:17px;font-weight:600;color:#181818;">${escapeHtml(curAcc.name)}</span>
                        <button type="button" onclick="window.openChangeAccountNameModal('${curAcc.id}')" style="border:none;background:none;color:#576b95;font-size:12px;cursor:pointer;padding:0;">[改名]</button>
                    </div>
                    <div style="font-size:12px;color:#888888;margin-top:4px;">
                        地区：${escapeHtml(curAcc.region || '中国 (China)')} · ${isAlt ? '小号模式 (通讯录独立)' : '主账号'}
                    </div>
                </div>
                <button type="button" onclick="window.openChangeAvatarOptionsModal('${curAcc.id}')" style="border:1px solid #dcdcdc;background:#f9f9f9;color:#07c160;padding:5px 9px;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;">
                    更换头像
                </button>
            </div>

            <!-- 常驻地区与时区设定 -->
            <div style="margin-top:10px;background:#ffffff;padding:14px 16px;border-top:0.5px solid #e0e0e0;border-bottom:0.5px solid #e0e0e0;">
                <div style="font-size:14px;font-weight:600;color:#181818;margin-bottom:6px;">常驻地区与时区设定</div>
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
                    <div>
                        <div style="font-size:13px;font-weight:600;color:#1f2937;" id="currentSelectedRegionText">${escapeHtml(curAcc.region || '中国 (China)')}</div>
                        <div style="font-size:11px;color:#6b7280;margin-top:2px;">与异地角色互动时将自动体现现实时差与作息</div>
                    </div>
                    <button type="button" onclick="window.openRegionSearchModal()" style="border:1px solid #cbd5e1;background:#fff;color:#2563eb;padding:5px 10px;border-radius:5px;font-size:12px;cursor:pointer;font-weight:500;">
                        选择地区
                    </button>
                </div>
            </div>

            <!-- 三位一体人设中枢 -->
            <div style="margin-top:10px;background:#ffffff;padding:14px 16px;border-top:0.5px solid #e0e0e0;border-bottom:0.5px solid #e0e0e0;">
                <div style="font-size:14px;font-weight:600;color:#181818;margin-bottom:4px;">人设档案系统（与全站通用共通）</div>
                <div style="font-size:11px;color:#888;margin-bottom:12px;">默认为空，完全按照你的设想自由填写</div>

                <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:12.5px;color:#374151;font-weight:600;display:block;margin-bottom:3px;">1. 线下人设 (现实生活作息/性格习惯)</label>
                    <textarea id="inpOfflinePersona" rows="2" placeholder="填写你的线下现实身份、日常作息习惯与性格特征..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #dcdcdc;background:#fafafa;font-size:12.5px;line-height:1.5;box-sizing:border-box;resize:none;outline:none;font-family:inherit;">${escapeHtml(p.offlinePersona || '')}</textarea>
                </div>

                <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:12.5px;color:#374151;font-weight:600;display:block;margin-bottom:3px;">2. 线上人设 (主播风格/皮套/创作赛道)</label>
                    <textarea id="inpOnlinePersona" rows="2" placeholder="填写你的主播赛道、直播口吻、观众粉丝互动风格..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #dcdcdc;background:#fafafa;font-size:12.5px;line-height:1.5;box-sizing:border-box;resize:none;outline:none;font-family:inherit;">${escapeHtml(p.onlinePersona || '')}</textarea>
                </div>

                <div class="form-group" style="margin-bottom:12px;">
                    <label style="font-size:12.5px;color:#374151;font-weight:600;display:block;margin-bottom:3px;">3. 游戏皮肤人设 (MC形象/像素设定/玩法偏好)</label>
                    <textarea id="inpGameSkinPersona" rows="2" placeholder="填写你在Minecraft中的像素皮肤形象、战斗或红石建筑风格..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #dcdcdc;background:#fafafa;font-size:12.5px;line-height:1.5;box-sizing:border-box;resize:none;outline:none;font-family:inherit;">${escapeHtml(p.gameSkinPersona || '')}</textarea>
                </div>

                <div style="display:flex;justify-content:flex-end;">
                    <button type="button" onclick="window.saveTriPersonas()" style="border:none;background:#07c160;color:#ffffff;padding:7px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">
                        保存人设设定
                    </button>
                </div>
            </div>

            <!-- 账号多马甲管理 -->
            <div style="margin-top:10px;background:#ffffff;padding:14px 16px;border-top:0.5px solid #e0e0e0;border-bottom:0.5px solid #e0e0e0;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                    <div>
                        <div style="font-size:14px;font-weight:600;color:#181818;">账号多马甲管理</div>
                        <div style="font-size:11px;color:#888;">小号初始通讯录为空，享有独立对话与名片</div>
                    </div>
                    <button type="button" onclick="window.openCreateAltAccountModalModern()" style="border:none;background:#eef2ff;color:#2563eb;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer;">
                        + 注册小号
                    </button>
                </div>

                <!-- 官方主号卡片 -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9fafb;border-radius:8px;border:0.5px solid #e5e7eb;margin-bottom:6px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <img src="${p.avatar || 'assets/icons/chat.png'}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';" />
                        <div>
                            <div style="font-size:13px;font-weight:600;color:#1f2937;">${escapeHtml(p.ytName || '主播大号')} <span style="font-size:10px;background:#d1fae5;color:#065f46;padding:1px 4px;border-radius:3px;">主号</span></div>
                            <div style="font-size:11px;color:#6b7280;">地区：${escapeHtml(p.region || '中国 (China)')}</div>
                        </div>
                    </div>
                    <div>
                        ${curAcc.id === 'main' ? '<span style="font-size:11px;color:#059669;font-weight:600;">使用中</span>' : `<button type="button" onclick="window.switchToAccount('main')" style="border:none;background:#07c160;color:#fff;padding:4px 9px;border-radius:4px;font-size:11px;cursor:pointer;">使用</button>`}
                    </div>
                </div>
                ${altsListHtml}
            </div>
        </div>
        `;
    }
    window.buildProfileTabHTML = buildProfileTabHTML;

    // 保存三维人设
    window.saveTriPersonas = function() {
        if (!window.G.player) window.G.player = {};
        window.G.player.offlinePersona = document.getElementById('inpOfflinePersona')?.value.trim() || '';
        window.G.player.onlinePersona = document.getElementById('inpOnlinePersona')?.value.trim() || '';
        window.G.player.gameSkinPersona = document.getElementById('inpGameSkinPersona')?.value.trim() || '';
        window.G.player.persona = window.G.player.offlinePersona;

        syncAccountsToStorage();

        if (typeof openModal === 'function') {
            openModal(`
                <div style="text-align:center;padding:12px 6px;">
                    <div style="font-size:16px;font-weight:700;color:#1e3a8a;margin-bottom:8px;">设置已保存</div>
                    <div style="font-size:13px;color:#475569;line-height:1.6;margin-bottom:14px;">
                        线上人设、线下作息与MC游戏皮肤均已成功写入并持久化，NPC在后续对话与互动中将自然呼应。
                    </div>
                    <button type="button" onclick="closeModal()" style="border:none;background:#2563eb;color:#fff;padding:7px 20px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">好的</button>
                </div>
            `);
        } else if (typeof showToast === 'function') {
            showToast('设定保存成功！', 'success', 1500);
        }
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // ============================================================
    // 🌐 国家与地区检索选择器
    // ============================================================
    window.openRegionSearchModal = function() {
        let currentList = [...PRESET_REGIONS];

        function renderList(list) {
            return list.map(item => `
                <div class="region-select-item" onclick="window.confirmPickRegion('${item.code}')" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:0.5px solid #e2e8f0;cursor:pointer;">
                    <div>
                        <div style="font-size:13.5px;font-weight:600;color:#1e293b;">${escapeHtml(item.name)}</div>
                        <div style="font-size:11px;color:#64748b;">时区代码: ${item.tz} (偏移: ${item.offset >= 0 ? '+' : ''}${item.offset}小时)</div>
                    </div>
                    <span style="color:#2563eb;font-size:12px;font-weight:600;">选择</span>
                </div>
            `).join('');
        }

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:8px;border-bottom:1.5px solid #eef2f7;padding-bottom:6px;">
                    选择常驻地区与时区
                </div>
                <div style="margin-bottom:10px;">
                    <input type="text" id="regionSearchInput" placeholder="输入国家名称或拼音关键词搜索..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;box-sizing:border-box;outline:none;">
                </div>
                <div id="regionListContainer" style="max-height:260px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:6px;background:#fff;">
                    ${renderList(currentList)}
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:10px;">
                    <button type="button" onclick="closeModal()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:5px 14px;border-radius:5px;font-size:12px;cursor:pointer;">关闭</button>
                </div>
            </div>
        `);

        document.getElementById('regionSearchInput').oninput = function(e) {
            const kw = e.target.value.trim().toLowerCase();
            const filtered = PRESET_REGIONS.filter(r => r.name.toLowerCase().includes(kw) || r.keywords.includes(kw));
            const cont = document.getElementById('regionListContainer');
            if (cont) cont.innerHTML = renderList(filtered) || '<div style="padding:20px;text-align:center;color:#999;font-size:12px;">无匹配国家/地区</div>';
        };
    };

    window.confirmPickRegion = function(code) {
        const item = PRESET_REGIONS.find(r => r.code === code);
        if (!item) return;

        closeModal();
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

        // 选中中国时弹出真实时间跟随确认
        if (item.code === 'CN') {
            setTimeout(() => {
                openModal(`
                    <div style="text-align:center;padding:12px 6px;">
                        <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:8px;">时间跟随提示</div>
                        <div style="font-size:13px;color:#475569;line-height:1.6;margin-bottom:14px;">
                            检测到你选择了中国，是否直接跟随手机真实系统时间？
                        </div>
                        <div style="display:flex;justify-content:center;gap:10px;">
                            <button type="button" onclick="window.setFollowTimeMode(false)" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:6px 14px;border-radius:6px;font-size:12.5px;cursor:pointer;">保持游戏进度</button>
                            <button type="button" onclick="window.setFollowTimeMode(true)" style="border:none;background:#2563eb;color:#fff;padding:6px 16px;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;">跟随真实时间</button>
                        </div>
                    </div>
                `);
            }, 180);
        } else {
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof showToast === 'function') showToast(`地区已设为：${item.name}`, 'success', 1500);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        }
    };

    window.setFollowTimeMode = function(followReal) {
        closeModal();
        if (!window.G.clockConfig) window.G.clockConfig = {};
        window.G.clockConfig.mode = followReal ? 'real' : 'game';
        if (typeof renderChatApp === 'function') renderChatApp();
        if (typeof showToast === 'function') showToast(followReal ? '已跟随真实系统时间' : '已保持游戏进度时间', 'success', 1500);
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // ============================================================
    // 🖼️ 头像更换（本地相册 / 图库抽取）与改名
    // ============================================================
    window.openChangeAvatarOptionsModal = function(targetAccountId) {
        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:12px;border-bottom:1.5px solid #eef2f7;padding-bottom:6px;">
                    更换头像
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <label style="display:block;border:1px solid #cbd5e1;background:#f8fafc;padding:10px 12px;border-radius:6px;cursor:pointer;text-align:center;">
                        <span style="font-size:13px;font-weight:600;color:#1e293b;">📁 从手机本地相册选取</span>
                        <input type="file" id="localAvatarFileInput" accept="image/*" style="display:none;">
                    </label>
                    <button type="button" onclick="window.pickFromAvatarLibrary('${targetAccountId}')" style="border:1px solid #cbd5e1;background:#f8fafc;padding:10px 12px;border-radius:6px;font-size:13px;font-weight:600;color:#1e293b;cursor:pointer;">
                        🎲 从头像库随机抽取
                    </button>
                </div>
                <div style="display:flex;justify-content:flex-end;margin-top:12px;">
                    <button type="button" onclick="closeModal()" style="border:none;background:none;color:#64748b;font-size:12px;cursor:pointer;">取消</button>
                </div>
            </div>
        `);

        document.getElementById('localAvatarFileInput').onchange = function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                const base64 = evt.target.result;
                window.applyNewAvatar(targetAccountId, base64);
                closeModal();
            };
            reader.readAsDataURL(file);
        };
    };

    window.pickFromAvatarLibrary = function(targetAccountId) {
        const randImg = (typeof getRandomAvatar === 'function') ? getRandomAvatar() : 'assets/icons/chat.png';
        window.applyNewAvatar(targetAccountId, randImg);
        closeModal();
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
        if (typeof showToast === 'function') showToast('头像更新成功！', 'success', 1200);
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.openChangeAccountNameModal = function(targetAccountId) {
        const curAcc = getActiveAccountInfo();
        const currentName = (targetAccountId === 'main') ? (window.G.player?.ytName || '') : curAcc.name;

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:10px;">修改名称</div>
                <input type="text" id="changeNameInput" value="${escapeHtml(currentName)}" style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;box-sizing:border-box;outline:none;">
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
                    <button type="button" onclick="closeModal()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmChangeName" style="border:none;background:#2563eb;color:#fff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">保存</button>
                </div>
            </div>
        `);

        document.getElementById('btnConfirmChangeName').onclick = () => {
            const val = document.getElementById('changeNameInput').value.trim();
            if (!val) return;
            if (targetAccountId === 'main') {
                if (!window.G.player) window.G.player = {};
                window.G.player.ytName = val;
            } else {
                const alt = (window.G.altAccounts || []).find(a => a.id === targetAccountId);
                if (alt) alt.name = val;
            }
            syncAccountsToStorage();
            closeModal();
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof showToast === 'function') showToast('名称已修改！', 'success', 1200);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
    };

    window.switchToAccount = function(accId) {
        window.G.currentAccountId = accId;
        syncAccountsToStorage();
        if (typeof renderChatApp === 'function') renderChatApp();
        if (typeof showToast === 'function') showToast(`已切换至：${getActiveAccountInfo().name}`, 'info', 1200);
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.deleteAltAccountDirect = function(altId) {
        if (!confirm('确定注销这个小号吗？')) return;
        window.G.altAccounts = (window.G.altAccounts || []).filter(a => a.id !== altId);
        if (window.G.currentAccountId === altId) window.G.currentAccountId = 'main';
        syncAccountsToStorage();
        if (typeof renderChatApp === 'function') renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.openCreateAltAccountModalModern = function() {
        let assignedAvatar = (typeof getRandomAvatar === 'function') ? getRandomAvatar() : 'assets/icons/chat.png';
        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:10px;">注册新小号</div>
                <div class="form-group" style="margin-bottom:8px;">
                    <label style="font-size:12px;color:#475569;display:block;margin-bottom:3px;">小号昵称</label>
                    <input type="text" id="newAltName" placeholder="输入小号名称..." style="width:100%;padding:7px 9px;border-radius:6px;border:1px solid #cbd5e1;font-size:12.5px;box-sizing:border-box;outline:none;">
                </div>
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;">
                    <button type="button" onclick="closeModal()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmAlt" style="border:none;background:#2563eb;color:#fff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">创建并使用</button>
                </div>
            </div>
        `);
        document.getElementById('btnConfirmAlt').onclick = () => {
            const name = document.getElementById('newAltName').value.trim();
            if (!name) return;
            const newId = 'alt_' + Date.now();
            if (!window.G.altAccounts) window.G.altAccounts = [];
            window.G.altAccounts.push({
                id: newId,
                name,
                avatar: assignedAvatar,
                region: window.G.player?.region || '中国 (China)',
                contacts: []
            });
            window.G.currentAccountId = newId;
            syncAccountsToStorage();
            closeModal();
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
    };

})();
