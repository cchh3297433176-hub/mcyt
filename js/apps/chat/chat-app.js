/**
 * js/apps/chat/chat-app.js
 * 💬 微信独立应用中枢（极简无缝全屏 · 灵动岛防遮挡 · 无彩色Emoji）
 * 包含模块：
 * 1. 界面：状态栏避让、单色极简微信三栏导航（微信 / 动态 / 我）
 * 2. 人设中枢（我）：三位一体人设（线上主播/线下现实/游戏皮肤）、本地相册换头像/图库随机、改名系统
 * 3. 地区引擎：搜索式国家/地区筛选器、真实时差换算、时间起点与跟随设置
 * 4. 社交隔离：小号独立空白通讯录、名片推荐互动机制
 */

(function() {
    'use strict';

    // 预置国家与时区字典（支持名称与关键词极速过滤）
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

    // 头像库动态池
    window._MCYT_AVATARS_POOL = [];
    async function initAvatarPool() {
        try {
            const resp = await fetch('avatars/list.json');
            if (resp.ok) {
                const list = await resp.json();
                if (Array.isArray(list) && list.length > 0) {
                    window._MCYT_AVATARS_POOL = list;
                    return;
                }
            }
        } catch (_) {}
        if (!window._MCYT_AVATARS_POOL || window._MCYT_AVATARS_POOL.length === 0) {
            window._MCYT_AVATARS_POOL = ['1.png', '2.png', '3.png', '4.png', '5.png', '6.png', '7.png', '8.png'];
        }
    }
    initAvatarPool();

    function getRandomAvatar() {
        const pool = window._MCYT_AVATARS_POOL;
        if (Array.isArray(pool) && pool.length > 0) {
            const picked = pool[Math.floor(Math.random() * pool.length)];
            if (picked.startsWith('http') || picked.startsWith('assets/') || picked.startsWith('data:') || picked.startsWith('avatars/')) {
                return picked;
            }
            return `avatars/${picked}`;
        }
        return 'assets/icons/chat.png';
    }
    window.getRandomAvatar = getRandomAvatar;

    let _activeBottomTab = 'chats';
    let _stickerDrawerOpen = false;

    // 沉浸式外壳样式（增加顶部 36px 避开灵动岛与信号栏，底部防下巴重叠）
    function ensureChatShellStyles() {
        if (document.getElementById('wechat-fullscreen-style')) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'wechat-fullscreen-style';
        styleEl.textContent = `
            .app-modal-layer.wechat-seamless-shell {
                background: #ededed !important;
                padding: 0 !important;
            }
            .app-modal-layer.wechat-seamless-shell .app-modal-head {
                display: none !important;
            }
            .app-modal-layer.wechat-seamless-shell .app-modal-body {
                padding: 0 !important;
                margin: 0 !important;
                background: #ededed !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                height: 100% !important;
                max-height: 100% !important;
                display: flex !important;
                flex-direction: column !important;
            }
            .app-modal-layer.wechat-seamless-shell .app-modal-foot {
                display: none !important;
            }
            .wechat-top-header {
                padding-top: 36px !important;
                height: 82px !important;
                box-sizing: border-box !important;
            }
        `;
        document.head.appendChild(styleEl);
    }
    ensureChatShellStyles();

    const originalClosePhoneApp = window.closePhoneApp;
    window.closePhoneApp = function() {
        const modal = document.getElementById('appModal');
        if (modal) modal.classList.remove('wechat-seamless-shell');
        if (typeof originalClosePhoneApp === 'function') originalClosePhoneApp();
    };

    function ensureNpcIntegrity() {
        if (!window.G) window.G = {};
        if (!window.G.npcs) window.G.npcs = {};
        if (!window.G.chatHistory) window.G.chatHistory = {};
        if (!window.G.groups) window.G.groups = {};
        if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
        if (!window.G.friendRequests) window.G.friendRequests = [];
        if (!window.G.groupInvites) window.G.groupInvites = [];
        if (!window.G.feed) window.G.feed = [];
        if (!window.G.currentAccountId) window.G.currentAccountId = 'main';
        if (!window.G.altAccounts) window.G.altAccounts = [];
        if (!window.G.blockedRecords) window.G.blockedRecords = [];
        if (!window.G._behindScreenActive) window.G._behindScreenActive = {};
        if (!window.G._chatShowFullHistory) window.G._chatShowFullHistory = {};

        // 玩家三维人设保障（默认全部为空字符串，绝不强加预设）
        if (!window.G.player) window.G.player = {};
        if (!window.G.player.avatar) window.G.player.avatar = getRandomAvatar();
        if (!window.G.player.region) window.G.player.region = '中国 (China)';
        if (!window.G.player.regionCode) window.G.player.regionCode = 'CN';
        if (window.G.player.onlinePersona === undefined) window.G.player.onlinePersona = '';
        if (window.G.player.offlinePersona === undefined) window.G.player.offlinePersona = '';
        if (window.G.player.gameSkinPersona === undefined) window.G.player.gameSkinPersona = '';

        for (const [id, npc] of Object.entries(window.G.npcs)) {
            if (!npc.id) npc.id = id;
            if (!npc.name) npc.name = id;
            if (npc.favor === undefined) npc.favor = 50;
            if (!npc.region) npc.region = (id.includes('dream') || id.includes('george')) ? '美国 - 东部 (US East)' : '中国 (China)';
            if (!npc.avatarUrl) npc.avatarUrl = getRandomAvatar();
        }
    }

    function getChatStorageKey(npcId, accId = null) {
        return `${accId || window.G.currentAccountId || 'main'}_${npcId}`;
    }

    function getAccountChatHistory(npcId, accId = null) {
        if (!window.G.chatHistory) window.G.chatHistory = {};
        const key = getChatStorageKey(npcId, accId);
        if (!window.G.chatHistory[key]) window.G.chatHistory[key] = [];
        return window.G.chatHistory[key];
    }

    function pushChatMessageSafe(npcId, msgObj, accId = null) {
        if (!msgObj._id) msgObj._id = 'cmsg_' + Date.now() + '_' + (Math.floor(Math.random() * 8999) + 1000);
        getAccountChatHistory(npcId, accId).push(msgObj);
    }

    function isAccountBlockedByNpc(npcId, accId = null) {
        const curAcc = accId || window.G.currentAccountId || 'main';
        const token = `${npcId}_${curAcc}`;
        if (curAcc === 'main' && Array.isArray(window.G.blockedNpcs) && window.G.blockedNpcs.includes(npcId)) return true;
        return (window.G.blockedRecords || []).includes(token);
    }

    function getActiveAccountInfo() {
        const curId = window.G.currentAccountId || 'main';
        if (curId === 'main') {
            return {
                id: 'main',
                isAlt: false,
                name: window.G.player?.ytName || '主播大号',
                avatar: window.G.player?.avatar || getRandomAvatar(),
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
                avatar: found.avatar || getRandomAvatar(),
                bio: found.bio || '私密小号',
                region: found.region || '中国 (China)'
            };
        }
        return { id: 'main', isAlt: false, name: window.G.player?.ytName || '主播大号', avatar: window.G.player?.avatar || getRandomAvatar(), bio: '', region: '中国 (China)' };
    }

    function renderAvatarBadge(obj, size = 46) {
        const url = (obj && obj.isPlayer) ? (getActiveAccountInfo().avatar) : (obj?.avatarUrl || getRandomAvatar());
        return `<div style="width:${size}px;height:${size}px;border-radius:6px;overflow:hidden;background:#e9e9e9;flex-shrink:0;box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.06);">
            <img src="${url}" draggable="false" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.onerror=null;this.src='assets/icons/chat.png';" />
        </div>`;
    }

    // ============================================================
    // 📱 微信 App 整体调度中枢（聊天 / 动态 / 我）
    // ============================================================
    function renderChatApp(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const appModal = document.getElementById('appModal');
        if (appModal) appModal.classList.add('wechat-seamless-shell');

        ensureNpcIntegrity();

        if (window.G.currentChatGroup) {
            renderGroupChatWindow(container);
            return;
        }
        if (window.G.currentChatNpc) {
            renderSingleChatWindow(container);
            return;
        }

        let mainContentHtml = '';
        let topBarHtml = '';
        const pendingCount = (window.G.friendRequests || []).length + (window.G.groupInvites || []).length;
        const isDirect = window.G.chatActiveTab !== 'group';

        if (_activeBottomTab === 'chats') {
            topBarHtml = `
                <div class="wechat-top-header" style="background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;padding-left:14px;padding-right:14px;flex-shrink:0;">
                    <button onclick="closePhoneApp()" style="border:none;background:none;font-size:14px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>桌面</span>
                    </button>
                    <div style="display:flex;gap:4px;background:#e2e2e2;padding:2px;border-radius:6px;">
                        <button type="button" onclick="window.switchChatTab('direct')" style="border:none;padding:4px 14px;border-radius:4px;font-size:12.5px;font-weight:600;cursor:pointer;background:${isDirect ? '#ffffff' : 'transparent'};color:${isDirect ? '#07c160' : '#666'};">私聊</button>
                        <button type="button" onclick="window.switchChatTab('group')" style="border:none;padding:4px 14px;border-radius:4px;font-size:12.5px;font-weight:600;cursor:pointer;background:${!isDirect ? '#ffffff' : 'transparent'};color:${!isDirect ? '#07c160' : '#666'};">群聊</button>
                    </div>
                    <div style="position:relative;">
                        <button onclick="window.openAddChatTargetModal()" title="添加与申请" style="border:none;background:transparent;width:32px;height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">
                            <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:#181818;stroke-width:2.2;stroke-linecap:round;">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                        ${pendingCount > 0 ? `<span style="position:absolute;top:2px;right:2px;width:8px;height:8px;background:#fa5151;border:1.5px solid #ededed;border-radius:50%;display:block;"></span>` : ''}
                    </div>
                </div>
            `;
            mainContentHtml = buildChatListHTML();
        } else if (_activeBottomTab === 'moments') {
            topBarHtml = `
                <div class="wechat-top-header" style="background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;padding-left:14px;padding-right:14px;flex-shrink:0;">
                    <button onclick="closePhoneApp()" style="border:none;background:none;font-size:14px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>桌面</span>
                    </button>
                    <div style="font-size:15px;font-weight:600;color:#181818;">朋友圈动态</div>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button onclick="window.triggerGenerateFriendsFeed()" style="border:none;background:none;color:#07c160;font-size:13px;font-weight:600;cursor:pointer;padding:0;">刷新</button>
                        <button onclick="window.openPostMomentModal()" style="border:none;background:none;font-size:14px;cursor:pointer;color:#181818;font-weight:600;padding:0;">发布</button>
                    </div>
                </div>
            `;
            mainContentHtml = buildMomentsHTML();
        } else if (_activeBottomTab === 'profile') {
            topBarHtml = `
                <div class="wechat-top-header" style="background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;padding-left:14px;padding-right:14px;flex-shrink:0;">
                    <button onclick="closePhoneApp()" style="border:none;background:none;font-size:14px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>桌面</span>
                    </button>
                    <div style="font-size:15px;font-weight:600;color:#181818;">我 · 身份中心</div>
                    <div style="width:40px;"></div>
                </div>
            `;
            mainContentHtml = buildProfileTabHTML();
        }

        // 单色轻量 SVG 底部导航
        const bottomNavHtml = `
            <div style="height:52px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;justify-content:space-around;align-items:center;flex-shrink:0;box-sizing:border-box;">
                <button onclick="window.switchWechatBottomTab('chats')" style="border:none;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:${_activeBottomTab === 'chats' ? '#07c160' : '#888888'};">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                    <span style="font-size:10.5px;font-weight:${_activeBottomTab === 'chats' ? '600' : 'normal'};">微信</span>
                </button>
                <button onclick="window.switchWechatBottomTab('moments')" style="border:none;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:${_activeBottomTab === 'moments' ? '#07c160' : '#888888'};">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3"/></svg>
                    <span style="font-size:10.5px;font-weight:${_activeBottomTab === 'moments' ? '600' : 'normal'};">动态</span>
                </button>
                <button onclick="window.switchWechatBottomTab('profile')" style="border:none;background:none;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;color:${_activeBottomTab === 'profile' ? '#07c160' : '#888888'};">
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:currentColor;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    <span style="font-size:10.5px;font-weight:${_activeBottomTab === 'profile' ? '600' : 'normal'};">我</span>
                </button>
            </div>
        `;

        container.innerHTML = `
            <div id="wechatAppRoot" style="display:flex;flex-direction:column;height:100%;width:100%;background:#ededed;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,sans-serif;box-sizing:border-box;">
                ${topBarHtml}
                <div style="flex:1;overflow-y:auto;background:#ffffff;">
                    ${mainContentHtml}
                </div>
                ${bottomNavHtml}
            </div>
        `;

        if (_activeBottomTab === 'chats') {
            container.querySelectorAll('.chat-item[data-npc-id]').forEach(item => {
                const id = item.dataset.npcId;
                if (typeof bindLongPressEvent === 'function') {
                    bindLongPressEvent(item, () => { window.openChat(id); }, () => { window.openEditNpcModal(id); });
                } else {
                    item.onclick = () => window.openChat(id);
                }
            });
        }
    }

    window.switchWechatBottomTab = function(tabName) {
        _activeBottomTab = tabName;
        window.G.currentChatNpc = null;
        window.G.currentChatGroup = null;
        renderChatApp();
    };

    // ============================================================
    // 👤 Tab 3：「我」页面——三位一体人设 + 检索国家 + 改名换头像
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
                    <img src="${alt.avatar || getRandomAvatar()}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';" />
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

            <!-- 常驻地区与时间跟随设置 -->
            <div style="margin-top:10px;background:#ffffff;padding:14px 16px;border-top:0.5px solid #e0e0e0;border-bottom:0.5px solid #e0e0e0;">
                <div style="font-size:14px;font-weight:600;color:#181818;margin-bottom:6px;">常驻地区与时区设定</div>
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
                    <div>
                        <div style="font-size:13px;font-weight:600;color:#1f2937;" id="currentSelectedRegionText">${escapeHtml(curAcc.region || '中国 (China)')}</div>
                        <div style="font-size:11px;color:#6b7280;margin-top:2px;">与异地角色互动时将自动计算并体现现实时差</div>
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

            <!-- 账号切换与独立小号管理 -->
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

                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f9fafb;border-radius:8px;border:0.5px solid #e5e7eb;margin-bottom:6px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <img src="${p.avatar || getRandomAvatar()}" style="width:36px;height:36px;border-radius:6px;object-fit:cover;" onerror="this.src='assets/icons/chat.png';" />
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

    // 保存三维人设并弹出粉白/系统提示弹窗
    window.saveTriPersonas = function() {
        if (!window.G.player) window.G.player = {};
        window.G.player.offlinePersona = document.getElementById('inpOfflinePersona')?.value.trim() || '';
        window.G.player.onlinePersona = document.getElementById('inpOnlinePersona')?.value.trim() || '';
        window.G.player.gameSkinPersona = document.getElementById('inpGameSkinPersona')?.value.trim() || '';
        window.G.player.persona = window.G.player.offlinePersona; // 保持向后兼容

        if (typeof openModal === 'function') {
            openModal(`
                <div style="text-align:center;padding:12px 6px;">
                    <div style="font-size:16px;font-weight:700;color:#1e3a8a;margin-bottom:8px;">设置已保存</div>
                    <div style="font-size:13px;color:#475569;line-height:1.6;margin-bottom:14px;">
                        线上人设、线下作息与MC游戏皮肤均已成功写入，NPC在后续对话与互动中将自然呼应。
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
    // 🌐 国家与地区搜索筛选弹窗
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
                    <input type="text" id="regionSearchInput" placeholder="输入国家名称或英文关键词搜索..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;box-sizing:border-box;outline:none;">
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

        // 如果选择中国，弹窗提示是否自动跟随真实系统时间
        if (item.code === 'CN') {
            setTimeout(() => {
                openModal(`
                    <div style="text-align:center;padding:12px 6px;">
                        <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:8px;">时间跟随提示</div>
                        <div style="font-size:13px;color:#475569;line-height:1.6;margin-bottom:14px;">
                            检测到你选择了中国，是否直接跟随真实系统时间？
                        </div>
                        <div style="display:flex;justify-content:center;gap:10px;">
                            <button type="button" onclick="window.setFollowTimeMode(false)" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:6px 14px;border-radius:6px;font-size:12.5px;cursor:pointer;">保持游戏推进</button>
                            <button type="button" onclick="window.setFollowTimeMode(true)" style="border:none;background:#2563eb;color:#fff;padding:6px 16px;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;">跟随真实时间</button>
                        </div>
                    </div>
                `);
            }, 180);
        } else {
            renderChatApp();
            if (typeof showToast === 'function') showToast(`地区已更新为：${item.name}`, 'success', 1500);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        }
    };

    window.setFollowTimeMode = function(followReal) {
        closeModal();
        if (!window.G.clockConfig) window.G.clockConfig = {};
        window.G.clockConfig.mode = followReal ? 'real' : 'game';
        renderChatApp();
        if (typeof showToast === 'function') showToast(followReal ? '已启用真实时间跟随' : '已保持游戏进度时间', 'success', 1500);
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // ============================================================
    // 🖼️ 头像更换选项（本地相册 / 图库随机）与改名
    // ============================================================
    window.openChangeAvatarOptionsModal = function(targetAccountId) {
        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:12px;border-bottom:1.5px solid #eef2f7;padding-bottom:6px;">
                    更换头像
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <label style="display:block;border:1px solid #cbd5e1;background:#f8fafc;padding:10px 12px;border-radius:6px;cursor:pointer;text-align:center;">
                        <span style="font-size:13px;font-weight:600;color:#1e293b;">从本地相册选取图片</span>
                        <input type="file" id="localAvatarFileInput" accept="image/*" style="display:none;">
                    </label>
                    <button type="button" onclick="window.pickFromAvatarLibrary('${targetAccountId}')" style="border:1px solid #cbd5e1;background:#f8fafc;padding:10px 12px;border-radius:6px;font-size:13px;font-weight:600;color:#1e293b;cursor:pointer;">
                        从头像库随机抽取
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
        const randImg = getRandomAvatar();
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
        renderChatApp();
        if (typeof showToast === 'function') showToast('头像更新成功！', 'success', 1200);
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // 改名弹窗
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
            if (!val) {
                if (typeof showToast === 'function') showToast('名称不能为空', 'error');
                return;
            }
            if (targetAccountId === 'main') {
                if (!window.G.player) window.G.player = {};
                window.G.player.ytName = val;
            } else {
                const alt = (window.G.altAccounts || []).find(a => a.id === targetAccountId);
                if (alt) alt.name = val;
            }
            closeModal();
            renderChatApp();
            if (typeof showToast === 'function') showToast('名称已修改！', 'success', 1200);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
    };

    // 账号切换
    window.switchToAccount = function(accId) {
        window.G.currentAccountId = accId;
        renderChatApp();
        if (typeof showToast === 'function') showToast(`已切换至：${getActiveAccountInfo().name}`, 'info', 1200);
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.deleteAltAccountDirect = function(altId) {
        if (!confirm('确定注销这个小号吗？')) return;
        window.G.altAccounts = (window.G.altAccounts || []).filter(a => a.id !== altId);
        if (window.G.currentAccountId === altId) window.G.currentAccountId = 'main';
        renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // 注册新小号（通讯录空白隔离）
    window.openCreateAltAccountModalModern = function() {
        let assignedAvatar = getRandomAvatar();
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
                contacts: [] // 初始通讯录独立空白
            });
            window.G.currentAccountId = newId;
            closeModal();
            renderChatApp();
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
    };

    // ============================================================
    // 💬 聊天列表构建（小号独立空白，主号享有好友）
    // ============================================================
    function buildChatListHTML() {
        const curAcc = getActiveAccountInfo();
        const isAlt = curAcc.isAlt;
        const allNpcList = Object.entries(window.G.npcs || {});

        // 小号只显示与自己有过私聊消息的联系人
        let visibleNpcList = allNpcList;
        if (isAlt) {
            visibleNpcList = allNpcList.filter(([id]) => {
                const hist = getAccountChatHistory(id, curAcc.id);
                return hist && hist.length > 0;
            });
        }

        if (!visibleNpcList.length) {
            return `
            <div style="text-align:center;color:#b2b2b2;padding:60px 16px;font-size:13px;line-height:1.8;">
                <div style="font-size:36px;margin-bottom:8px;opacity:0.65;">💬</div>
                <b>${isAlt ? '小号通讯录空白' : '暂无聊天消息'}</b><br>
                ${isAlt ? '可以通过主号名片引荐，或点击右上角 + 添加联系人！' : '点击右上角 + 开始交流！'}
            </div>`;
        }

        let itemsHtml = '';
        for (const [id, npc] of visibleNpcList) {
            const chatHist = getAccountChatHistory(id, curAcc.id);
            const lastMsg = chatHist.length > 0 ? chatHist[chatHist.length - 1] : null;
            const purePreview = lastMsg ? (typeof stripThought === 'function' ? stripThought(lastMsg.text || '') : lastMsg.text) : '打个招呼吧';
            const time = lastMsg ? (lastMsg.time || '') : '';
            const isBlocked = isAccountBlockedByNpc(id, curAcc.id);

            itemsHtml += `
            <div class="chat-item" data-npc-id="${id}" style="display:flex;align-items:center;padding:12px 14px;background:#ffffff;cursor:pointer;border-bottom:0.5px solid #f0f0f0;user-select:none;-webkit-user-select:none;">
                <div style="margin-right:12px;flex-shrink:0;">${renderAvatarBadge(npc, 48)}</div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:500;font-size:15px;color:#181818;">
                            ${escapeHtml(npc.name)}
                            <span style="font-size:10.5px;color:#888;margin-left:4px;">${escapeHtml(npc.region ? npc.region.split(' ')[0] : '')}</span>
                            ${isBlocked ? '<span style="font-size:10px;color:#fff;background:#fa5151;padding:1px 4px;border-radius:3px;margin-left:4px;">已拒收</span>' : ''}
                        </span>
                        <span style="font-size:11px;color:#b2b2b2;">${time}</span>
                    </div>
                    <div style="font-size:12.5px;color:#888888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px;">${escapeHtml(purePreview.slice(0, 32))}</div>
                </div>
            </div>`;
        }
        return itemsHtml;
    }

    // ============================================================
    // 🌟 朋友圈（动态流）构建
    // ============================================================
    function buildMomentsHTML() {
        const feedList = window.G.feed || [];
        if (!feedList.length) {
            return `
            <div style="text-align:center;color:#b2b2b2;padding:60px 16px;font-size:13px;line-height:1.8;">
                <div style="font-size:36px;margin-bottom:8px;opacity:0.65;">🍃</div>
                朋友圈动态空空如也<br>
                点击右上角<b>「刷新」</b>或<b>「发布」</b>分享日常吧！
            </div>`;
        }

        let cardsHtml = '';
        feedList.forEach(m => {
            const isSelf = m.isPlayer || (m.author === window.G.player?.ytName);
            const isLiked = !!m.liked;
            const comments = m.comments || [];

            let commentsBox = '';
            if (comments.length > 0) {
                const comLines = comments.map(c => `
                    <div style="font-size:12px;line-height:1.5;margin-bottom:3px;">
                        <span style="color:#576b95;font-weight:600;">${escapeHtml(c.name || '好友')}:</span>
                        <span style="color:#222;">${escapeHtml(c.text)}</span>
                    </div>
                `).join('');
                commentsBox = `<div style="background:#f4f5f7;border-radius:4px;padding:6px 8px;margin-top:6px;">${comLines}</div>`;
            }

            cardsHtml += `
            <div style="display:flex;gap:10px;padding:14px;border-bottom:0.5px solid #f0f0f0;">
                <div style="flex-shrink:0;">${renderAvatarBadge({ isPlayer: isSelf, avatarUrl: m.avatar }, 42)}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:14.5px;font-weight:600;color:#576b95;">${escapeHtml(m.author || '好友')}</div>
                    <div style="font-size:14px;color:#222;margin:5px 0 8px;line-height:1.5;word-break:break-word;">
                        ${escapeHtml(m.body || '').replace(/\n/g, '<br>')}
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:#b2b2b2;">
                        <span>${m.time || '刚刚'}</span>
                        <div style="display:flex;gap:10px;">
                            <button onclick="window.toggleMomentLike(${m.id})" style="border:none;background:none;color:${isLiked ? '#fa5151' : '#576b95'};cursor:pointer;font-size:12px;padding:0;">
                                ${isLiked ? '❤️ 取消' : '🤍 赞'} (${m.likes || 0})
                            </button>
                            <button onclick="window.addMomentComment(${m.id})" style="border:none;background:none;color:#576b95;cursor:pointer;font-size:12px;padding:0;">评论</button>
                            <button onclick="window.triggerAiCommentForMoment(${m.id})" style="border:none;background:none;color:#07c160;cursor:pointer;font-size:12px;padding:0;">互动</button>
                        </div>
                    </div>
                    ${commentsBox}
                </div>
            </div>`;
        });
        return cardsHtml;
    }

    // ============================================================
    // 💬 私聊窗口（沉浸避让状态栏）
    // ============================================================
    function renderSingleChatWindow(container) {
        if (!container) container = document.getElementById('appModalBody') || document.getElementById('socialTab');
        if (!container) return;

        const npcId = window.G.currentChatNpc;
        const npc = window.G.npcs[npcId];
        if (!npc) { window.closeChat(); return; }

        const curAcc = getActiveAccountInfo();
        const isBlocked = isAccountBlockedByNpc(npcId, curAcc.id);
        const chatHist = getAccountChatHistory(npcId, curAcc.id);

        let messagesHtml = '';
        for (const msg of chatHist) {
            if (msg.from === 'action') {
                messagesHtml += `
                <div style="text-align:center;margin:8px 0;">
                    <span style="display:inline-block;background:rgba(0,0,0,0.05);color:#888;padding:3px 10px;border-radius:4px;font-size:11.5px;max-width:85%;">${escapeHtml(msg.text || '')}</span>
                </div>`;
            } else if (msg.from === 'card_alt') {
                messagesHtml += `
                <div style="margin:10px 14px;background:#ffffff;border:1px solid #e0e0e0;border-radius:8px;padding:10px;font-size:12.5px;box-shadow:0 2px 6px rgba(0,0,0,0.04);">
                    <div style="font-weight:600;color:#2563eb;margin-bottom:4px;">名片推荐</div>
                    <div>${escapeHtml(msg.text)}</div>
                </div>`;
            } else {
                const isSelf = msg.from === 'player';
                let bubbleContent = isSelf ? escapeHtml(msg.text || '').replace(/\n/g, '<br>') : ((typeof renderContentWithThoughts === 'function') ? renderContentWithThoughts(msg.text || '') : escapeHtml(msg.text || ''));

                messagesHtml += `
                <div class="chat-msg-row" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                    ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge(npc, 38)}</div>` : ''}
                    <div style="max-width:74%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                        <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? '#95ec69' : '#ffffff'};color:#111;padding:8px 12px;border-radius:5px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:14.5px;line-height:1.5;word-break:break-word;">
                            ${bubbleContent}
                        </div>
                        <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                    </div>
                    ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 38)}</div>` : ''}
                </div>`;
            }
        }

        const html = `
        <div style="background:#ededed;display:flex;flex-direction:column;height:100%;min-height:100%;overflow:hidden;font-family:-apple-system,sans-serif;">
            <div class="wechat-top-header" style="background:#ededed;border-bottom:0.5px solid #dcdcdc;display:flex;justify-content:space-between;align-items:center;padding-left:14px;padding-right:14px;flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                    <button onclick="window.closeChat()" style="border:none;background:none;font-size:15px;color:#181818;cursor:pointer;padding:0;display:flex;align-items:center;gap:3px;font-weight:500;">
                        <span>‹</span> <span>微信</span>
                    </button>
                    <div style="font-weight:600;font-size:15px;color:#181818;margin-left:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${escapeHtml(npc.name)} <span style="font-size:11px;color:#888;font-weight:normal;">(${escapeHtml(npc.region ? npc.region.split(' ')[0] : '')})</span>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button onclick="window.sendAltCardToNpc('${npcId}')" style="border:0.5px solid #ccc;background:#fff;color:#333;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer;">推小号名片</button>
                    <button onclick="window.triggerAIReplyForSingle('${npcId}')" style="border:none;background:#07c160;color:#fff;width:30px;height:30px;border-radius:6px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;">⚡</button>
                </div>
            </div>

            ${isBlocked ? `
            <div style="background:#fff2f0;color:#fa5151;padding:6px 12px;font-size:11.5px;border-bottom:0.5px solid #ffccc7;flex-shrink:0;">
                <span>⚠️ 当前账号消息已被对方拒收</span>
            </div>` : ''}

            <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
                ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">打个招呼开启畅聊吧！</div>'}
            </div>

            <div style="padding:8px 10px;background:#f7f7f7;border-top:0.5px solid #dcdcdc;display:flex;gap:6px;align-items:center;flex-shrink:0;">
                <textarea id="singleChatInput" rows="1" placeholder="发消息..." style="flex:1;padding:8px 10px;border-radius:5px;border:none;background:#ffffff;font-size:14px;resize:none;outline:none;font-family:inherit;box-shadow:inset 0 0 0 0.5px #dcdcdc;"></textarea>
                <button onclick="window.doSendSingleChat('${npcId}')" style="border:none;background:#07c160;color:#fff;padding:6px 13px;border-radius:4px;font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;">发送</button>
            </div>
        </div>
        `;
        container.innerHTML = html;

        const msgArea = document.getElementById('chatMessageArea');
        if (msgArea) setTimeout(() => { msgArea.scrollTop = msgArea.scrollHeight; }, 50);

        const input = document.getElementById('singleChatInput');
        if (input) {
            input.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    window.doSendSingleChat(npcId);
                }
            };
        }
    }

    // 发送小号名片给角色
    window.sendAltCardToNpc = function(npcId) {
        const alts = window.G.altAccounts || [];
        if (!alts.length) {
            if (typeof showToast === 'function') showToast('你目前尚未注册任何小号', 'info');
            return;
        }

        let altOptions = alts.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:10px;">推荐我的小号名片</div>
                <div style="font-size:12px;color:#666;margin-bottom:8px;">选择要引荐给 TA 的小号：</div>
                <select id="selectAltToPush" style="width:100%;padding:8px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;margin-bottom:12px;">
                    ${altOptions}
                </select>
                <div style="display:flex;justify-content:flex-end;gap:8px;">
                    <button type="button" onclick="closeModal()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmPushAlt" style="border:none;background:#2563eb;color:#fff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">发送名片</button>
                </div>
            </div>
        `);

        document.getElementById('btnConfirmPushAlt').onclick = () => {
            const targetAltId = document.getElementById('selectAltToPush').value;
            const targetAlt = alts.find(a => a.id === targetAltId);
            if (!targetAlt) return;

            const curAcc = getActiveAccountInfo();
            pushChatMessageSafe(npcId, {
                from: 'card_alt',
                text: `${curAcc.name} 推送了马甲小号「${targetAlt.name}」的名片给对方。`,
                time: new Date().toLocaleTimeString().slice(0, 5)
            }, curAcc.id);

            // 对方收到名片后，NPC 主动给小号下发一条好友申请！
            if (!window.G.friendRequests) window.G.friendRequests = [];
            window.G.friendRequests.push({
                _id: 'freq_alt_' + Date.now(),
                targetAltId: targetAlt.id,
                npcOfficialId: npcId,
                name: window.G.npcs[npcId]?.name || '好友',
                fromReason: `收到了你的名片引荐，添加你的小号「${targetAlt.name}」`,
                avatarUrl: window.G.npcs[npcId]?.avatarUrl
            });

            closeModal();
            renderSingleChatWindow();
            if (typeof showToast === 'function') showToast(`已将「${targetAlt.name}」名片发送给对方！`, 'success', 2000);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
    };

    // ============================================================
    // 🌐 暴露全局操作接口
    // ============================================================
    window.renderChatApp = renderChatApp;
    window.renderSocialPanel = renderChatApp;
    window.renderSingleChatWindow = renderSingleChatWindow;
    window.ensureNpcIntegrity = ensureNpcIntegrity;
    window.getActiveAccountInfo = getActiveAccountInfo;

    window.openChat = function(npcId) {
        if (!window.G.npcs || !window.G.npcs[npcId]) return;
        window.G.currentChatNpc = npcId;
        renderChatApp();
    };

    window.closeChat = function() {
        window.G.currentChatNpc = null;
        renderChatApp();
    };

    window.doSendSingleChat = function(npcId) {
        const input = document.getElementById('singleChatInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        const curAcc = getActiveAccountInfo();

        if (isAccountBlockedByNpc(npcId, curAcc.id)) {
            pushChatMessageSafe(npcId, { from: 'player', text, time: new Date().toLocaleTimeString().slice(0, 5) }, curAcc.id);
            pushChatMessageSafe(npcId, { from: 'action', text: `消息已被拒收`, time: new Date().toLocaleTimeString().slice(0, 5) }, curAcc.id);
            input.value = '';
            renderSingleChatWindow();
            return;
        }

        pushChatMessageSafe(npcId, { from: 'player', text, time: new Date().toLocaleTimeString().slice(0, 5) }, curAcc.id);
        input.value = '';
        renderSingleChatWindow();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // 提示词占位框架：后续直接由独立 Prompt 仓库或文件挂载接管
    window.triggerAIReplyForSingle = async function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        const curAcc = getActiveAccountInfo();

        if (isAccountBlockedByNpc(npcId, curAcc.id)) {
            if (typeof showToast === 'function') showToast('当前账号已被对方拒收', 'error');
            return;
        }

        const history = getAccountChatHistory(npcId, curAcc.id);
        const pRegion = curAcc.region || '中国 (China)';
        const nRegion = npc.region || '美国 - 东部 (US East)';
        const isDiffRegion = (pRegion !== nRegion);

        // 如果外部提示词仓库挂载了构建器则调用外部，否则走内置基础管线
        const sysPrompt = (typeof window.buildCustomChatPrompt === 'function')
            ? window.buildCustomChatPrompt(npc, curAcc, history, { isDiffRegion, pRegion, nRegion })
            : `你正在扮演MC好友「${npc.name}」。对方是「${curAcc.name}」。你常驻于${nRegion}，对方常驻于${pRegion}。像真实微信打字一样简明回复，严禁任何括号动作。`;

        try {
            if (typeof showLoading === 'function') showLoading();
            const raw = await callAI([{ role: 'system', content: sysPrompt }, { role: 'user', content: '请回复。' }], { maxTokens: 300 });
            if (typeof hideLoading === 'function') hideLoading();
            const clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();
            if (clean) {
                pushChatMessageSafe(npcId, { from: 'npc', text: clean, time: new Date().toLocaleTimeString().slice(0, 5) }, curAcc.id);
                if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
                if (typeof autoSaveGame === 'function') autoSaveGame();
            }
        } catch(e) {
            if (typeof hideLoading === 'function') hideLoading();
            if (typeof showToast === 'function') showToast('回复失败', 'error');
        }
    };

})();
