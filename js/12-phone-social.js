// js/12-phone-social.js
// 手机社交生态系统：账号隔离、朋友圈多模态互动、时差推导、聊天表情包图床系统、屏幕那边的TA动作感知
// ============================================================

// ============================================================
// 1. 图床表情包库系统（内置猪猪分组，支持自由新建分类与图床批量导入）
// ============================================================
if (!G.stickerCategories) {
    G.stickerCategories = ['猪猪', '默认'];
}
if (!G.activeStickerCategory) {
    G.activeStickerCategory = '猪猪';
}
if (!G.stickerLibrary || !G.stickerLibrary.length) {
    G.stickerLibrary = [
        { category: '猪猪', desc: '这只可爱的小猪就是我呀', url: 'https://imgbed.heliar.top/i/QZNPVIKLzB8DiDL-.jpg' },
        { category: '猪猪', desc: '你给我老实点', url: 'https://imgbed.heliar.top/i/KpiF2iLAUzHVDvjD.jpg' },
        { category: '猪猪', desc: '骂我的人看到我这样还忍心骂吗', url: 'https://imgbed.heliar.top/i/TnIT9ii2FOss4Fke.jpg' },
        { category: '猪猪', desc: '这两只小猪就是我们呀', url: 'https://imgbed.heliar.top/i/K0UZOCq2MYES8vga.jpg' },
        { category: '猪猪', desc: '悲愤离开', url: 'https://imgbed.heliar.top/i/O7E9kWjlYBDg59W-.jpg' },
        { category: '猪猪', desc: '猪是必须要爱惜的', url: 'https://imgbed.heliar.top/i/tiUgP49B0Tez99eI.jpg' },
        { category: '猪猪', desc: '而我只是一个QQ肠', url: 'https://imgbed.heliar.top/i/G4YYaUbHaS62Acf-.jpg' },
        { category: '猪猪', desc: '小猪魔法', url: 'https://imgbed.heliar.top/i/nEe02eA-RY7p7Ehl.jpg' },
        { category: '猪猪', desc: 'wink一下', url: 'https://imgbed.heliar.top/i/PSfpaNyQU1Pe2Qvm.jpg' },
        { category: '猪猪', desc: '再睡拱死你', url: 'https://imgbed.heliar.top/i/2IqW2TDCBMsl81T9.jpg' },
        { category: '猪猪', desc: '忙着玩手机', url: 'https://imgbed.heliar.top/i/AKsZ0ADV1nbpN6Xh.jpg' },
        { category: '猪猪', desc: '饶了这一次呗', url: 'https://imgbed.heliar.top/i/cAIQytv_7rGo92is.jpg' },
        { category: '猪猪', desc: '气疯了你满意了吗！', url: 'https://imgbed.heliar.top/i/ST0SkhSSAT0tNcJ7.jpg' },
        { category: '猪猪', desc: '熟睡中', url: 'https://imgbed.heliar.top/i/pa6PWuk1W2T9sM_i.jpg' },
        { category: '猪猪', desc: '突然出现', url: 'https://imgbed.heliar.top/i/rH-ZeZBzySvEydf1.jpg' },
        { category: '猪猪', desc: '你这样对我我会哭的呀', url: 'https://imgbed.heliar.top/i/JVjz3snh4bQPeJPB.jpg' },
        { category: '猪猪', desc: '就这样萌萌的看着泥', url: 'https://imgbed.heliar.top/i/wjHyOK7Nlrje2RMj.jpg' },
        { category: '猪猪', desc: '我发现躺着会很酥胡', url: 'https://imgbed.heliar.top/i/iOZZUDJmk9i4oyjK.jpg' },
        { category: '猪猪', desc: '我把话放这了', url: 'https://imgbed.heliar.top/i/QNTbRjWXRXJiFof8.jpg' },
        { category: '猪猪', desc: '猪的天啊', url: 'https://imgbed.heliar.top/i/Iaai5e8mbqtCqciE.jpg' },
        { category: '猪猪', desc: '我素你的掌上明猪呀', url: 'https://imgbed.heliar.top/i/9ro4rlqIzD9nH1uw.jpg' },
        { category: '猪猪', desc: '如果我是猪也该遇见属于我的恋猪癖了', url: 'https://imgbed.heliar.top/i/JN_hGfK5CEHBb34K.jpg' },
        { category: '猪猪', desc: '你不要猪了吗', url: 'https://imgbed.heliar.top/i/LSckmvTxPcjpX5sM.jpg' },
        { category: '猪猪', desc: '你这只猪到底想我没', url: 'https://imgbed.heliar.top/i/EpozQFX0HEf6X9TF.jpg' },
        { category: '猪猪', desc: '两猪对视', url: 'https://imgbed.heliar.top/i/OjuoWxmO7dtaCGGr.jpg' },
        { category: '猪猪', desc: '别想让我理你这只猪了', url: 'https://imgbed.heliar.top/i/3Uy69MILiykjX2Yw.jpg' },
        { category: '猪猪', desc: '你这只猪又不理我', url: 'https://imgbed.heliar.top/i/YKTyf0FsRqDaAUFv.jpg' }
    ];
}

// 检查某个文本是否命中表情包
function findStickerByKeyword(kw) {
    if (!kw || !G.stickerLibrary) return null;
    const cleanKw = kw.trim().toLowerCase();
    return G.stickerLibrary.find(s => s.desc.toLowerCase() === cleanKw || s.desc.toLowerCase().includes(cleanKw) || cleanKw.includes(s.desc.toLowerCase()));
}

// ============================================================
// 2. 时差推导与时区检测工具
// ============================================================
function detectPlayerTimezoneInfo() {
    const persona = ((G.player && G.player.persona) || '').toLowerCase();
    const skin = ((G.player && G.player.skin) || '').toLowerCase();
    const combined = persona + ' ' + skin;

    let country = '中国 (东八区)';
    let region = 'CN';

    if (combined.includes('美国') || combined.includes('美籍') || combined.includes('usa') || combined.includes('america') || combined.includes('洛杉矶') || combined.includes('纽约')) {
        country = '美国 (北美时区)';
        region = 'US';
    } else if (combined.includes('加拿大') || combined.includes('canada')) {
        country = '加拿大 (北美时区)';
        region = 'CA';
    } else if (combined.includes('英国') || combined.includes('uk') || combined.includes('伦敦') || combined.includes('英格兰')) {
        country = '英国 (欧洲时区)';
        region = 'UK';
    } else if (combined.includes('法国') || combined.includes('france') || combined.includes('巴黎')) {
        country = '法国 (欧洲时区)';
        region = 'FR';
    } else if (combined.includes('日本') || combined.includes('japan') || combined.includes('东京')) {
        country = '日本 (东九区)';
        region = 'JP';
    } else if (combined.includes('澳洲') || combined.includes('澳大利亚') || combined.includes('australia')) {
        country = '澳大利亚 (东十区)';
        region = 'AU';
    }

    const slotName = getTimeSlotName(G.timeSlot);
    return { country, region, slotName, day: G.day };
}

function formatNpcTimezoneContext(targetNpcName = '') {
    const pTz = detectPlayerTimezoneInfo();
    return `
【时区与时差上下文】：
1. 玩家当前所在地：${pTz.country}，当前游戏时段为：第 ${pTz.day} 天【${pTz.slotName}】。
2. 海外MC主播（如 Dream/美、ThatMob/加法、Grox/美、Twixxel/美、xqree/欧洲、Whispy/美）：
   - 若玩家在亚洲/中国：玩家这边的「早晨/中午」是海外主播那边的「深夜/凌晨/甚至通宵还未睡觉」；玩家这边的「夜晚」是海外主播那边的「清晨起床/正午刚开播」。
   - 若玩家人设本就在北美/欧洲同区，则基本没有大时差，为正常同区作息。
3. 对话/评论中请根据此真实时差自然体现角色当前的生理与作息状态（如刚熬夜剪完视频、刚睡醒迷糊等）。
`;
}

// ============================================================
// 3. 账号体系与拉黑逻辑
// ============================================================
if (!G.currentAccountId) G.currentAccountId = 'main';
if (!G.altAccounts) G.altAccounts = [];
if (!G.blockedRecords) G.blockedRecords = [];

function isAccountBlockedByNpc(npcId, accId = null) {
    const curAcc = accId || (G.currentAccountId || 'main');
    const token = `${npcId}_${curAcc}`;
    if (curAcc === 'main' && Array.isArray(G.blockedNpcs) && G.blockedNpcs.includes(npcId)) {
        return true;
    }
    return (G.blockedRecords || []).includes(token);
}

function setNpcBlockAccount(npcId, accId, block = true) {
    if (!G.blockedRecords) G.blockedRecords = [];
    const token = `${npcId}_${accId}`;
    if (block) {
        if (!G.blockedRecords.includes(token)) G.blockedRecords.push(token);
        if (accId === 'main') {
            if (!G.blockedNpcs) G.blockedNpcs = [];
            if (!G.blockedNpcs.includes(npcId)) G.blockedNpcs.push(npcId);
        }
    } else {
        G.blockedRecords = G.blockedRecords.filter(t => t !== token);
        if (accId === 'main' && G.blockedNpcs) {
            G.blockedNpcs = G.blockedNpcs.filter(id => id !== npcId);
        }
    }
}

function getActiveAccountInfo() {
    if (G.currentAccountId === 'main' || !G.currentAccountId) {
        return {
            id: 'main',
            isAlt: false,
            name: G.player.ytName || '主播大号',
            avatar: G.player.avatar || null,
            bio: 'YouTube 频道官方号'
        };
    }
    const found = (G.altAccounts || []).find(a => a.id === G.currentAccountId);
    if (found) {
        return {
            id: found.id,
            isAlt: true,
            name: found.name,
            avatar: found.avatar || null,
            bio: found.bio || '私密小号'
        };
    }
    return { id: 'main', isAlt: false, name: G.player.ytName || '主播大号', avatar: G.player.avatar, bio: '' };
}

function switchAccount(accId) {
    G.currentAccountId = accId;
    const acc = getActiveAccountInfo();
    showToast(`🔀 已切换账号为：${acc.name}`, 'info', 1800);
    renderSocialPanel();
    autoSaveGame();
}

function openAccountManagerModal() {
    const mainAcc = { name: G.player.ytName, id: 'main' };
    const currentId = G.currentAccountId || 'main';

    let altsHtml = '';
    (G.altAccounts || []).forEach(alt => {
        altsHtml += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f8faf8;border-radius:8px;margin-bottom:6px;border:1px solid #e2ece2;">
            <div style="display:flex;align-items:center;gap:8px;">
                <div style="font-size:20px;">${alt.avatar ? `<img src="${alt.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : '🎭'}</div>
                <div>
                    <div style="font-weight:700;font-size:13px;">${escapeHtml(alt.name)} <span style="font-size:10px;color:#2e7d32;background:#e8f5e9;padding:1px 4px;border-radius:4px;">小号</span></div>
                    <div style="font-size:10px;color:#888;">${escapeHtml(alt.bio || '无简介')}</div>
                </div>
            </div>
            <div style="display:flex;gap:6px;">
                ${currentId === alt.id ? '<span style="font-size:11px;color:#2e7d32;font-weight:700;padding:4px 6px;">● 当前使用</span>' : `<button class="upload-btn" onclick="switchAccount('${alt.id}');closeModal();" style="padding:4px 8px;font-size:11px;">使用</button>`}
                <button class="upload-btn" onclick="deleteAltAccount('${alt.id}')" style="padding:4px 6px;font-size:11px;background:#e53935;">🗑️</button>
            </div>
        </div>`;
    });

    openModal(`
        <h3>🎭 账号中心与快速切换</h3>
        <p style="font-size:12px;color:#666;line-height:1.6;">每个账号拥有完全独立的私聊记录。某个小号被拉黑后，可继续注册新小号联系骚扰或求情转圜！</p>
        
        <div style="margin:10px 0;border:1px solid #eee;border-radius:10px;padding:10px;background:#fff;">
            <div style="font-weight:700;font-size:13px;margin-bottom:8px;">👑 主播官方大号</div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f0f8f0;border-radius:8px;border:1px solid #d0ebd0;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="font-size:20px;">${G.player.avatar ? `<img src="${G.player.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : '👑'}</div>
                    <div>
                        <div style="font-weight:700;font-size:13px;">${escapeHtml(mainAcc.name)} <span style="font-size:10px;color:#fff;background:var(--primary);padding:1px 6px;border-radius:4px;">大号</span></div>
                        <div style="font-size:10px;color:#666;">粉丝 ${G.player.followers || 0} · 官方认证</div>
                    </div>
                </div>
                ${currentId === 'main' ? '<span style="font-size:11px;color:#2e7d32;font-weight:700;padding:4px 6px;">● 当前使用</span>' : `<button class="upload-btn" onclick="switchAccount('main');closeModal();" style="padding:4px 8px;font-size:11px;">使用</button>`}
            </div>

            <div style="font-weight:700;font-size:13px;margin:12px 0 6px;">🎭 注册的小号列表</div>
            ${altsHtml || '<div style="font-size:12px;color:#999;padding:6px 0;">暂无小号，点击下方注册全新马甲</div>'}
        </div>

        <div class="btn-row" style="flex-direction:column;gap:8px;">
            <button class="btn-primary" id="btnRegisterNewAlt" style="width:100%;">➕ 注册新的自定义小号</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">关闭</button>
        </div>
    `);

    document.getElementById('btnRegisterNewAlt').onclick = () => {
        closeModal();
        openCreateAltAccountModal();
    };
}

function openCreateAltAccountModal() {
    openModal(`
        <h3>➕ 注册自定义小号</h3>
        <p style="font-size:12px;color:#666;">为小号设定一个独立的马甲身份：</p>
        <div class="form-group">
            <label>小号名称 / ID <span class="required">*</span></label>
            <input type="text" id="altNameInput" placeholder="如：路过的红石学徒 / 匿名纯路人">
        </div>
        <div class="form-group">
            <label>小号个性签名</label>
            <input type="text" id="altBioInput" placeholder="如：只看不说话，热爱MC建筑...">
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="openAccountManagerModal()">返回</button>
            <button class="btn-primary" id="btnConfirmCreateAlt">完成注册并登录</button>
        </div>
    `);

    document.getElementById('btnConfirmCreateAlt').onclick = () => {
        const name = document.getElementById('altNameInput').value.trim();
        const bio = document.getElementById('altBioInput').value.trim();
        if (!name) { showToast('⚠️ 请填写小号名称', 'error'); return; }

        if (!G.altAccounts) G.altAccounts = [];
        const newAlt = {
            id: 'alt_' + Date.now(),
            name,
            bio: bio || '路人小号',
            avatar: null,
            createdAt: G.day
        };
        G.altAccounts.push(newAlt);
        G.currentAccountId = newAlt.id;

        showToast(`🎉 小号「${name}」注册成功并已登录！`, 'success', 2500);
        closeModal();
        renderSocialPanel();
        autoSaveGame();
    };
}

function deleteAltAccount(altId) {
    if (!confirm('确定要注销这个小号吗？注销后该小号的独立聊天记录也将清空。')) return;
    G.altAccounts = (G.altAccounts || []).filter(a => a.id !== altId);
    if (G.currentAccountId === altId) G.currentAccountId = 'main';
    showToast('🗑️ 小号已注销', 'info');
    openAccountManagerModal();
    autoSaveGame();
}

// 账号隔离聊天 Key
function getChatStorageKey(npcId, accId = null) {
    const curAccId = accId || (G.currentAccountId || 'main');
    return `${curAccId}_${npcId}`;
}

function getAccountChatHistory(npcId, accId = null) {
    if (!G.chatHistory) G.chatHistory = {};
    const key = getChatStorageKey(npcId, accId);
    if (!G.chatHistory[key]) {
        const targetAcc = accId || (G.currentAccountId || 'main');
        if (targetAcc === 'main' && Array.isArray(G.chatHistory[npcId])) {
            G.chatHistory[key] = G.chatHistory[npcId];
        } else {
            G.chatHistory[key] = [];
        }
    }
    return G.chatHistory[key];
}

function pushChatMessageSafe(npcId, msgObj, accId = null) {
    if (!msgObj._id) msgObj._id = 'cmsg_' + Date.now() + '_' + rand(1000, 9999);
    const list = getAccountChatHistory(npcId, accId);
    list.push(msgObj);
}

// ============================================================
// 4. 社交通用辅助与长按判定
// ============================================================
if (!G.phoneNav) G.phoneNav = 'chats';
if (!G.chatActiveTab) G.chatActiveTab = 'direct';
if (!G.groups) G.groups = {};
if (!G.groupChatHistory) G.groupChatHistory = {};
if (!G.friendRequests) G.friendRequests = [];
if (!G.groupInvites) G.groupInvites = [];
if (!G.momentsFilterNpcId) G.momentsFilterNpcId = null;
if (!G._chatShowFullHistory) G._chatShowFullHistory = {};
if (!G._behindScreenActive) G._behindScreenActive = {}; // 各 NPC 线下动作感知开关

function bindLongPressEvent(el, onLongPress, onClick) {
    if (!el) return;
    const LONG_PRESS_MS = 500;
    const MOVE_TOLERANCE = 10;
    let pressTimer = null;
    let longPressTriggered = false;
    let startX = 0, startY = 0;

    const clearTimer = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };

    const start = (x, y) => {
        longPressTriggered = false;
        startX = x; startY = y;
        clearTimer();
        pressTimer = setTimeout(() => {
            longPressTriggered = true;
            if (typeof onLongPress === 'function') onLongPress();
        }, LONG_PRESS_MS);
    };

    const move = (x, y) => {
        if (Math.abs(x - startX) > MOVE_TOLERANCE || Math.abs(y - startY) > MOVE_TOLERANCE) {
            clearTimer();
        }
    };

    const end = () => {
        clearTimer();
        if (!longPressTriggered) {
            if (typeof onClick === 'function') onClick();
        }
    };

    const cancel = () => { clearTimer(); };

    el.addEventListener('touchstart', e => {
        const t = e.touches[0];
        if (t) start(t.clientX, t.clientY);
    }, { passive: true });
    el.addEventListener('touchmove', e => {
        const t = e.touches[0];
        if (t) move(t.clientX, t.clientY);
    }, { passive: true });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', cancel);

    el.addEventListener('mousedown', e => start(e.clientX, e.clientY));
    el.addEventListener('mousemove', e => { if (pressTimer) move(e.clientX, e.clientY); });
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', cancel);
    el.addEventListener('contextmenu', e => e.preventDefault());
}

function renderAvatarBadge(obj, size = 44) {
    const avatarUrl = (obj && obj.isPlayer) ? G.player.avatar : (obj && obj.avatarUrl);
    const emoji = (obj && obj.isPlayer) ? '🧑' : ((obj && obj.avatarEmoji) || '👤');

    if (avatarUrl) {
        return `<img src="${avatarUrl}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block;">`;
    }
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#eaf2ea;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(size*0.45)}px;flex-shrink:0;">${emoji}</div>`;
}

// 社交主路由
function renderSocialPanel() {
    const container = (dom && dom.socialTab) || document.getElementById('socialTab');
    if (!container) return;
    if (typeof ensureNpcIntegrity === 'function') ensureNpcIntegrity();

    if (G.currentChatGroup) {
        renderGroupChatWindow(container);
        return;
    }
    if (G.currentChatNpc) {
        renderSingleChatWindow(container);
        return;
    }
    renderPhoneApp(container);
}

function renderPhoneApp(container) {
    const isMoments = G.phoneNav === 'moments';
    let contentHtml = isMoments ? buildMomentsHTML() : buildChatListHTML();
    const activeAcc = getActiveAccountInfo();

    const html = `
    <div class="phone-app-wrap" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);height:82vh;max-height:850px;display:flex;flex-direction:column;">
        <div style="background:#f1f7f1;padding:6px 12px;border-bottom:1px solid #e0ebe0;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
            <div style="display:flex;align-items:center;gap:6px;">
                <span>${activeAcc.isAlt ? '🎭' : '👑'} 当前账号：<b>${escapeHtml(activeAcc.name)}</b></span>
                ${activeAcc.isAlt ? '<span style="font-size:10px;background:#ffe082;color:#795548;padding:1px 4px;border-radius:4px;font-weight:700;">小号模式</span>' : ''}
            </div>
            <button onclick="openAccountManagerModal()" style="border:1px solid #b8dbb8;background:#fff;padding:2px 8px;border-radius:12px;font-size:11px;cursor:pointer;color:#2e7d32;font-weight:700;">🔀 切换/注册小号</button>
        </div>

        <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;">
            ${contentHtml}
        </div>
        <div style="height:54px;background:#fcfdfc;border-top:1px solid #eef2ee;display:flex;justify-content:space-around;align-items:center;padding:0 10px;flex-shrink:0;">
            <button id="phoneNavChatsBtn" style="border:none;background:none;font-size:12px;font-weight:700;color:${!isMoments ? 'var(--primary)' : '#888'};display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;">
                <span style="font-size:18px;">💬</span>
                <span>消息</span>
            </button>
            <button id="phoneNavMomentsBtn" style="border:none;background:none;font-size:12px;font-weight:700;color:${isMoments ? 'var(--primary)' : '#888'};display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;">
                <span style="font-size:18px;">🌟</span>
                <span>朋友圈</span>
            </button>
        </div>
    </div>
    `;
    container.innerHTML = html;

    document.getElementById('phoneNavChatsBtn').onclick = () => { G.phoneNav = 'chats'; renderSocialPanel(); };
    document.getElementById('phoneNavMomentsBtn').onclick = () => { G.phoneNav = 'moments'; G.momentsFilterNpcId = null; renderSocialPanel(); };

    if (!isMoments) {
        bindChatListEvents(container);
    } else {
        bindMomentsEvents(container);
    }
}

function buildChatListHTML() {
    const isDirect = G.chatActiveTab !== 'group';
    const pendingCount = (G.friendRequests || []).length + (G.groupInvites || []).length;
    let itemsHtml = '';
    const currentAcc = getActiveAccountInfo();

    if (isDirect) {
        const npcList = Object.entries(G.npcs || {});
        if (!npcList.length) {
            itemsHtml += `
            <div style="text-align:center;color:#888;padding:45px 16px;font-size:13px;line-height:1.7;">
                <div style="font-size:36px;margin-bottom:8px;">📬</div>
                <b>通讯录空空如也</b><br>
                新人主播需要通过<b>录制视频</b>、<b>联机开播</b>积累粉丝热度。<br>
                随着你的频道声名鹊起，各路MC大主播与热情粉丝会主动递来好友申请！<br>
                <div style="margin-top:10px;">
                    <button class="upload-btn" onclick="openAddChatTargetModal()" style="padding:6px 14px;font-size:12px;">查看待处理好友申请 (${(G.friendRequests||[]).length})</button>
                </div>
            </div>`;
        } else {
            for (const [id, npc] of npcList) {
                const chatHist = getAccountChatHistory(id);
                const lastMsg = chatHist.length > 0 ? chatHist[chatHist.length - 1] : null;
                const purePreview = lastMsg ? (lastMsg.sticker ? `[表情: ${lastMsg.sticker.desc}]` : stripThought(lastMsg.text || '')) : (npc.memorySummary ? `[记忆: ${stripThought(npc.memorySummary).slice(0, 15)}...]` : '新添加好友，快来打个招呼吧');
                const time = lastMsg ? (lastMsg.time || '') : '';
                const isLover = (G.player.lovers || []).includes(npc.name);
                const isBlocked = isAccountBlockedByNpc(id, currentAcc.id);

                itemsHtml += `
                <div class="chat-item" data-id="${id}" style="display:flex;align-items:center;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:#fff;border:1px solid #f0f4f0;position:relative;">
                    <div style="margin-right:12px;flex-shrink:0;">${renderAvatarBadge(npc, 44)}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-weight:700;font-size:14px;color:var(--text);">${escapeHtml(npc.name)} ${isLover ? '💕' : ''} ${isBlocked ? '<span style="font-size:10px;color:#fff;background:#e53935;padding:1px 5px;border-radius:4px;">已拉黑本号</span>' : ''}</span>
                            <span style="font-size:11px;color:#bbb;">${time}</span>
                        </div>
                        <div style="font-size:12px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px;">${escapeHtml(purePreview.slice(0, 30))}</div>
                    </div>
                </div>`;
            }
        }
    } else {
        const groupKeys = Object.keys(G.groups || {});
        if (!groupKeys.length) {
            itemsHtml += `
            <div style="text-align:center;color:#aaa;padding:40px 16px;font-size:13px;line-height:1.6;">
                暂无群聊。<br>
                粉丝增长后会收到后援粉丝群邀请，<br>也可以点击右上角 ➕ 自建专属主播交流群！
            </div>`;
        } else {
            for (const [gid, grp] of Object.entries(G.groups)) {
                const msgs = G.groupChatHistory[gid] || [];
                const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
                const purePreview = lastMsg ? `${lastMsg.senderName}: ${lastMsg.sticker ? `[表情: ${lastMsg.sticker.desc}]` : stripThought(lastMsg.text || '')}` : (grp.desc || '开启热烈讨论吧');
                itemsHtml += `
                <div class="group-item" data-gid="${gid}" style="display:flex;align-items:center;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:#fff;border:1px solid #f0f4f0;">
                    <div style="margin-right:12px;flex-shrink:0;">${renderAvatarBadge(grp, 44)}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-weight:700;font-size:14px;color:var(--text);">${escapeHtml(grp.name)} <span style="font-size:11px;color:#999;">(${(grp.members || []).length}人)</span></span>
                            <span style="font-size:11px;color:#bbb;">${lastMsg ? (lastMsg.time || '') : ''}</span>
                        </div>
                        <div style="font-size:12px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px;">${escapeHtml(purePreview.slice(0, 30))}</div>
                    </div>
                </div>`;
            }
        }
    }

    return `
    <div class="chat-header" style="padding:12px 16px;background:#f8fbf8;border-bottom:1px solid #eef3ee;display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;gap:6px;background:#e9f2e9;padding:3px;border-radius:8px;">
            <button id="tabDirectBtn" style="border:none;padding:6px 14px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;background:${isDirect ? '#fff' : 'transparent'};color:${isDirect ? 'var(--primary)' : '#666'};">👤 私聊</button>
            <button id="tabGroupBtn" style="border:none;padding:6px 14px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;background:${!isDirect ? '#fff' : 'transparent'};color:${!isDirect ? 'var(--primary)' : '#666'};">👥 群聊</button>
        </div>
        <div style="position:relative;">
            <button id="addChatTargetBtn" title="新建与好友/群邀请" style="border:none;background:var(--primary);color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
            ${pendingCount > 0 ? `<span style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;background:#ff4757;border:2px solid #fff;border-radius:50%;display:block;"></span>` : ''}
        </div>
    </div>
    <div style="font-size:11px;color:#888;padding:6px 16px;background:#fcfdfc;border-bottom:1px dashed #eee;">
        💡 提示：长按消息可撤回/编辑/删除；输入框旁支持发送表情包斗图
    </div>
    <div class="chat-list" style="flex:1;overflow-y:auto;padding:8px;">
        ${itemsHtml}
    </div>`;
}

function bindChatListEvents(container) {
    document.getElementById('tabDirectBtn').onclick = () => { G.chatActiveTab = 'direct'; renderSocialPanel(); };
    document.getElementById('tabGroupBtn').onclick = () => { G.chatActiveTab = 'group'; renderSocialPanel(); };
    document.getElementById('addChatTargetBtn').onclick = () => openAddChatTargetModal();

    container.querySelectorAll('.chat-item').forEach(el => {
        const id = el.dataset.id;
        bindLongPressEvent(el, () => openEditNpcModal(id), () => openChat(id));
    });

    container.querySelectorAll('.group-item').forEach(el => {
        const gid = el.dataset.gid;
        bindLongPressEvent(el, () => openGroupSettingsModal(gid), () => openGroupChat(gid));
    });
}

// ============================================================
// 5. 朋友圈生态系统
// ============================================================
function buildMomentsHTML() {
    let feedItems = [...(G.feed || [])].reverse();
    let filterTitle = '🌟 动态朋友圈';

    if (G.momentsFilterNpcId) {
        const targetNpc = G.npcs[G.momentsFilterNpcId];
        const targetName = targetNpc ? targetNpc.name : G.momentsFilterNpcId;
        feedItems = feedItems.filter(f => f.npcId === G.momentsFilterNpcId || f.author === targetName);
        filterTitle = `🌟 ${escapeHtml(targetName)} 的朋友圈`;
    }

    let listHtml = '';
    if (!feedItems.length) {
        listHtml = `<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">暂无动态，点击右上角「✨ 刷新动态」或「📷 发动态」吧！</div>`;
    } else {
        for (const item of feedItems) {
            const isLiked = item.liked ? '❤️ 已赞' : '🤍 赞';
            const isSelfPost = item.isPlayer || item.author === G.player.ytName || (G.altAccounts || []).some(a => a.name === item.author);
            const displayAvatar = isSelfPost && item.avatar ? `<img src="${item.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : (item.avatar || '👤');

            let mediaHtml = '';
            if (item.image) {
                mediaHtml = `<div style="margin:8px 0;"><img src="${item.image}" style="max-width:200px;max-height:200px;border-radius:8px;object-fit:cover;border:1px solid #ddd;box-shadow:0 2px 6px rgba(0,0,0,0.1);"></div>`;
            } else if (item.imageDesc) {
                mediaHtml = `<div style="margin:6px 0;background:#f0f4f0;padding:6px 10px;border-radius:6px;font-size:12px;color:#2e7d32;border:1px dashed #c8e6c9;">🖼️ [配图描述]: ${escapeHtml(item.imageDesc)}</div>`;
            }

            let commentsHtml = '';
            if (item.comments && item.comments.length) {
                commentsHtml = `<div style="margin-top:8px;background:#f8faf8;padding:8px 12px;border-radius:8px;font-size:12.5px;line-height:1.6;border:1px solid #edf2ed;">` +
                    item.comments.map(c => `<div style="margin-bottom:3px;"><b style="color:#2e7d32;">${escapeHtml(c.user)}</b>: <span>${escapeHtml(c.content)}</span></div>`).join('') +
                `</div>`;
            }

            listHtml += `
            <div class="moment-card" data-id="${item.id}" style="padding:14px;background:#fff;border-radius:10px;margin-bottom:10px;border:1px solid #eef2ee;position:relative;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                    <div style="font-size:20px;display:flex;align-items:center;cursor:pointer;" class="moment-avatar-click" data-npcid="${item.npcId||''}">${displayAvatar}</div>
                    <div style="flex:1;">
                        <div style="font-weight:700;font-size:13.5px;color:var(--text);">${escapeHtml(item.author)} ${isSelfPost ? '<span style="font-size:10px;color:#2e7d32;background:#e8f5e9;padding:1px 4px;border-radius:4px;">我</span>' : ''}</div>
                        <div style="font-size:10px;color:#bbb;">${item.time || ''}</div>
                    </div>
                </div>
                ${item.title ? `<div style="font-weight:700;font-size:14px;color:#111;margin-bottom:4px;">${escapeHtml(item.title)}</div>` : ''}
                <div style="font-size:13.5px;color:#222;line-height:1.6;margin-bottom:8px;">${escapeHtml(item.body)}</div>
                ${mediaHtml}
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;border-top:1px solid #f7f9f7;padding-top:6px;">
                    <div style="display:flex;gap:12px;">
                        <button class="moment-like-btn" data-id="${item.id}" style="border:none;background:none;cursor:pointer;color:#e53935;font-size:12px;">${isLiked} (${item.likes||0})</button>
                        <button class="moment-ai-cmt-btn" data-id="${item.id}" style="border:none;background:none;cursor:pointer;color:#1976d2;font-size:12px;font-weight:600;">💬 召唤好友互动</button>
                    </div>
                    ${isSelfPost ? `
                    <div style="display:flex;gap:8px;">
                        <button class="moment-op-btn" data-act="recall" data-id="${item.id}" style="border:none;background:none;color:#555;cursor:pointer;font-size:11px;">↩️撤回</button>
                        <button class="moment-op-btn" data-act="edit" data-id="${item.id}" style="border:none;background:none;color:#1976d2;cursor:pointer;font-size:11px;">✏️编辑</button>
                        <button class="moment-op-btn" data-act="del" data-id="${item.id}" style="border:none;background:none;color:#e53935;cursor:pointer;font-size:11px;">🗑️删除</button>
                    </div>` : ''}
                </div>
                ${commentsHtml}
            </div>`;
        }
    }

    return `
    <div style="padding:10px 14px;background:#f8fbf8;border-bottom:1px solid #eef3ee;display:flex;justify-content:space-between;align-items:center;gap:6px;">
        <span style="font-weight:700;font-size:15px;flex:1;">${filterTitle}</span>
        <button id="btnCreateUserPost" style="border:1px solid var(--primary);background:#f0f8f0;color:var(--primary);padding:4px 10px;border-radius:14px;font-size:12px;font-weight:700;cursor:pointer;">📷 发动态</button>
        <button id="btnAiRefreshFeed" style="border:none;background:var(--primary);color:#fff;padding:4px 10px;border-radius:14px;font-size:12px;font-weight:700;cursor:pointer;">✨ 刷新动态</button>
        ${G.momentsFilterNpcId ? `<button id="clearMomentFilterBtn" style="border:1px solid #ccc;background:#fff;padding:2px 8px;border-radius:6px;font-size:11px;cursor:pointer;">查看全部</button>` : ''}
    </div>
    <div style="flex:1;overflow-y:auto;padding:10px;background:#f4f6f4;">
        ${listHtml}
    </div>`;
}

function bindMomentsEvents(container) {
    document.getElementById('clearMomentFilterBtn')?.addEventListener('click', () => {
        G.momentsFilterNpcId = null;
        renderSocialPanel();
    });

    document.getElementById('btnCreateUserPost')?.addEventListener('click', openCreateMomentPostModal);
    document.getElementById('btnAiRefreshFeed')?.addEventListener('click', triggerGenerateFriendsFeed);

    container.querySelectorAll('.moment-avatar-click').forEach(el => {
        el.onclick = () => {
            const nid = el.dataset.npcid;
            if (nid && G.npcs[nid]) {
                G.momentsFilterNpcId = nid;
                renderSocialPanel();
            }
        };
    });

    container.querySelectorAll('.moment-like-btn').forEach(btn => {
        btn.onclick = () => {
            const id = parseInt(btn.dataset.id);
            const item = G.feed.find(f => f.id === id);
            if (!item) return;
            item.liked = !item.liked;
            item.likes = (item.likes || 0) + (item.liked ? 1 : -1);
            renderSocialPanel();
            autoSaveGame();
        };
    });

    container.querySelectorAll('.moment-ai-cmt-btn').forEach(btn => {
        btn.onclick = async () => {
            const id = parseInt(btn.dataset.id);
            await triggerAiCommentForMoment(id);
        };
    });

    container.querySelectorAll('.moment-op-btn').forEach(btn => {
        btn.onclick = () => {
            const act = btn.dataset.act;
            const id = parseInt(btn.dataset.id);
            const itemIdx = (G.feed || []).findIndex(f => f.id === id);
            if (itemIdx === -1) return;
            const item = G.feed[itemIdx];

            if (act === 'del') {
                if (confirm('确定删除这条动态吗？')) {
                    G.feed.splice(itemIdx, 1);
                    showToast('🗑️ 动态已删除', 'info', 1200);
                    renderSocialPanel();
                    autoSaveGame();
                }
            } else if (act === 'recall') {
                const isSeen = Math.random() < 0.5;
                G.feed.splice(itemIdx, 1);
                if (isSeen) {
                    showToast('👀 你撤回了动态，但有好友在你撤回前正好看到了！', 'info', 3000);
                    addGlobalMemoryRecord(`【朋友圈动态撤回】：主角发布了关于“${item.body.slice(0, 20)}”的动态后又快速撤回，但被部分好友偶然看到。`);
                } else {
                    showToast('↩️ 动态已悄悄撤回，没人发现', 'success', 2000);
                }
                renderSocialPanel();
                autoSaveGame();
            } else if (act === 'edit') {
                openEditMomentModal(item);
            }
        };
    });
}

function openCreateMomentPostModal() {
    const curAcc = getActiveAccountInfo();
    openModal(`
        <h3>📷 发朋友圈动态</h3>
        <p style="font-size:12px;color:#666;">当前发布身份：<b>${escapeHtml(curAcc.name)}</b></p>
        <div class="form-group">
            <label>动态标题 (可选)</label>
            <input type="text" id="postTitleInput" placeholder="起个简短有梗的标题...">
        </div>
        <div class="form-group">
            <label>动态正文 <span class="required">*</span></label>
            <textarea id="postBodyInput" rows="3" placeholder="分享今天的MC实况日常、吐槽或游戏截图心情..."></textarea>
        </div>
        <div class="form-group">
            <label>配图形式选择</label>
            <div style="display:flex;gap:6px;margin-bottom:6px;">
                <label style="font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer;">
                    <input type="radio" name="postImgType" value="real" checked> 🖼️ 上传相册真实图片 (Gemini等多模态识图)
                </label>
                <label style="font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer;">
                    <input type="radio" name="postImgType" value="desc"> 📝 用文字描述图片 (极省 Token)
                </label>
            </div>
            <div id="postImgRealArea">
                <input type="file" id="postRealFileInput" accept="image/*" style="font-size:12px;">
                <div id="postImgPreview" style="margin-top:6px;"></div>
            </div>
            <div id="postImgDescArea" style="display:none;">
                <input type="text" id="postImgDescInput" placeholder="如：一张被苦力怕炸穿的地牢遗迹惨状截图">
            </div>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnConfirmPublishPost">🚀 发布动态</button>
        </div>
    `);

    let uploadedBase64 = null;
    document.querySelectorAll('input[name="postImgType"]').forEach(r => {
        r.onchange = () => {
            const isReal = r.value === 'real';
            document.getElementById('postImgRealArea').style.display = isReal ? 'block' : 'none';
            document.getElementById('postImgDescArea').style.display = isReal ? 'none' : 'block';
        };
    });

    document.getElementById('postRealFileInput').onchange = function() {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedBase64 = e.target.result;
            document.getElementById('postImgPreview').innerHTML = `<img src="${uploadedBase64}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid #ccc;">`;
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('btnConfirmPublishPost').onclick = () => {
        const title = document.getElementById('postTitleInput').value.trim();
        const body = document.getElementById('postBodyInput').value.trim();
        const imgType = document.querySelector('input[name="postImgType"]:checked').value;
        const imgDesc = document.getElementById('postImgDescInput').value.trim();

        if (!body) { showToast('⚠️ 正文不能为空', 'error'); return; }

        if (!G.feed) G.feed = [];
        G.feedIdCounter = (G.feedIdCounter || 0) + 1;

        const newPost = {
            id: Date.now(),
            author: curAcc.name,
            isPlayer: true,
            avatar: curAcc.avatar,
            title: title,
            body: body,
            image: imgType === 'real' ? uploadedBase64 : null,
            imageDesc: imgType === 'desc' ? imgDesc : null,
            likes: 0,
            liked: false,
            comments: [],
            time: new Date().toLocaleTimeString().slice(0, 5)
        };

        G.feed.push(newPost);
        addGlobalMemoryRecord(`【玩家发朋友圈】：在第 ${G.day} 天发布了动态：“${body}”${newPost.image ? '（附带了一张相册照片/立绘截图）' : ''}${newPost.imageDesc ? `（配图描述: ${newPost.imageDesc}）` : ''}`);

        showToast('🎉 朋友圈发布成功！', 'success', 2000);
        closeModal();
        renderSocialPanel();
        autoSaveGame();
    };
}

function openEditMomentModal(item) {
    openModal(`
        <h3>✏️ 编辑动态</h3>
        <div class="form-group">
            <label>动态内容</label>
            <textarea id="editMomentBodyInput" rows="4" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;font-size:13px;">${escapeHtml(item.body)}</textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnSaveEditedMoment">💾 保存修改</button>
        </div>
    `);

    document.getElementById('btnSaveEditedMoment').onclick = () => {
        const newBody = document.getElementById('editMomentBodyInput').value.trim();
        if (!newBody) { showToast('内容不能为空', 'error'); return; }
        item.body = newBody;
        closeModal();
        renderSocialPanel();
        showToast('✅ 动态已更新', 'success', 1500);
        autoSaveGame();
    };
}

async function triggerGenerateFriendsFeed() {
    const npcs = Object.values(G.npcs || {});
    if (!npcs.length) {
        showToast('通讯录暂无好友，快去结识更多主播吧！', 'info', 2000);
        return;
    }

    showToast('✨ 正在刷新好友动态...', 'info', 1500);
    try {
        const pickedNpc = pick(npcs);
        const tzContext = formatNpcTimezoneContext(pickedNpc.name);

        const sys = `你正在扮演 Minecraft 主播/好友「${pickedNpc.name}」（人设：${pickedNpc.persona}）。
${tzContext}
请以你的口吻发一条简短生动的社交平台/朋友圈动态（60字以内）。
内容可以结合你当前所处时区的作息（如熬夜剪辑翻车、刚起床迷糊开箱、吐槽其他主播、或生活碎碎念）。只输出动态正文，严禁解释。`;

        const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '发一条新动态。' }], { maxTokens: 150, temperature: 0.95 });
        const clean = stripThought(raw).replace(/^["'“]|["'”]$/g, '').trim();

        if (!G.feed) G.feed = [];
        G.feed.push({
            id: Date.now(),
            author: pickedNpc.name,
            npcId: pickedNpc.id,
            avatar: pickedNpc.avatarUrl ? `<img src="${pickedNpc.avatarUrl}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : (pickedNpc.avatarEmoji || '👤'),
            body: clean,
            likes: rand(1, 15),
            liked: false,
            comments: [],
            time: new Date().toLocaleTimeString().slice(0, 5)
        });

        showToast(`🌟 ${pickedNpc.name} 刚更新了一条朋友圈！`, 'success', 2500);
        renderSocialPanel();
        autoSaveGame();
    } catch (e) {
        showToast('❌ 刷新失败，请检查网络设置', 'error');
    }
}

async function triggerAiCommentForMoment(momentId) {
    const item = (G.feed || []).find(f => f.id === momentId);
    if (!item) return;

    const npcs = Object.values(G.npcs || {});
    if (!npcs.length) { showToast('暂无可互动的好友'); return; }

    const candidateNpcs = npcs.filter(n => n.name !== item.author);
    const shuffled = (candidateNpcs.length ? candidateNpcs : npcs).sort(() => 0.5 - Math.random());
    const selectedNpcs = shuffled.slice(0, Math.min(3, rand(2, 3)));

    showToast(`🤖 ${selectedNpcs.map(n => n.name).join('、')} 正在围观动态...`, 'info', 1500);

    try {
        const tzContext = formatNpcTimezoneContext();
        const hasRealImage = !!item.image;
        const imgDescContext = item.imageDesc ? `（配图描述：${item.imageDesc}）` : '';

        let existingCommentsText = '';
        if (item.comments && item.comments.length) {
            existingCommentsText = '【此前已有评论】：\n' + item.comments.map(c => `${c.user}: ${c.content}`).join('\n') + '\n';
        }

        const participantsDesc = selectedNpcs.map(n => `【${n.name}】(性格人设: ${n.persona}, 好感度: ${n.favor||50})`).join('\n');

        const sysPrompt = `
你正在模拟 Minecraft 主播朋友圈动态下的真实多好友互动评论区。
${tzContext}

【动态发布者】：${item.author}
【动态文字内容】：“${item.body}” ${imgDescContext}
${existingCommentsText}

【本次参与互动的具体好友】：
${participantsDesc}

【核心演绎规则（纯乙女守护与多模态视觉聚焦）】：
1. 视觉识图重点（如果有上传图片）：
   - 你必须仔细凝视这张图片！看清画面的细节、人物立绘特征（如西装、领带、面具、表情、动作、日文字样如Verity等）。
   - 绝不允许只回复“可爱”或忽视图片，必须在评论中展现出你真的【看到了这张画】并结合画中元素调侃吐槽！
2. 楼中楼接梗与互怼争吵（纯乙女安全合规）：
   - 好友之间不要各说各话！第二位及后续的好友必须直接接前面的话、甚至争风吃醋或毒舌拆台（例如ThatMob傲娇说“没我可爱/去帮你报仇”，其他角色可以立刻嘲讽“就你那PVP技术送双杀去吧”）。
   - 严禁攻略角色之间发生搞基或同性恋爱（纯乙女红线），角色之间的争吵仅限【技术攀比、护短争宠、傲娇吃醋、毒舌吐槽】！
3. 时差自然体现：
   - 结合双方真实时差（如中国与欧美），在评论中自然带上当时的生活状态（通宵刚下播准备睡觉、刚起床迷糊等）。

【输出格式要求（每行一条，必须按此格式）】：
[COMMENT name=角色名字]评论正文（40字以内）[/COMMENT]
`;

        let userContent = null;
        if (hasRealImage) {
            userContent = [
                { type: 'text', text: `请好友们针对玩家发布的动态及这张图片进行生动评论与互怼接话：` },
                { type: 'image_url', image_url: { url: item.image } }
            ];
        } else {
            userContent = `请好友们针对玩家发布的动态进行生动评论与互怼接话：`;
        }

        const raw = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: userContent }
        ], { maxTokens: 450, temperature: 0.95 });

        if (!item.comments) item.comments = [];

        const re = /\[COMMENT(?:\s+name=|\s*:\s*)(["']?)([^\]"'\n]+)\1\]([\s\S]*?)(?:\[\/COMMENT\]|(?=\[COMMENT)|$)/gi;
        let match;
        let addedCount = 0;

        while ((match = re.exec(raw)) !== null) {
            const rawName = match[2].trim();
            const text = stripThought(match[3].replace(/\[\/?COMMENT[^\]]*\]/gi, '').trim());
            if (!text) continue;

            const matchedNpc = selectedNpcs.find(n => n.name === rawName || rawName.includes(n.name));
            const finalName = matchedNpc ? matchedNpc.name : rawName;

            item.comments.push({ user: finalName, content: text });

            if (matchedNpc) {
                matchedNpc.memorySummary = (matchedNpc.memorySummary || '') + `\n【朋友圈互动】：在动态“${item.body.slice(0, 18)}”下评论：“${text}”`;
            }
            addedCount++;
        }

        if (addedCount === 0 && raw.trim()) {
            const fallbackNpc = selectedNpcs[0] || npcs[0];
            const cleanBody = stripThought(raw.replace(/\[\/?COMMENT[^\]]*\]/gi, '').trim());
            item.comments.push({ user: fallbackNpc.name, content: cleanBody.slice(0, 50) || '噗，这动态太搞笑了！' });
            addedCount++;
        }

        renderSocialPanel();
        autoSaveGame();
        showToast(`💬 好友已在动态下热烈互动评论！`, 'success', 2500);

    } catch(e) {
        console.error('朋友圈评论生成失败', e);
        showToast('❌ 互动生成失败：' + e.message, 'error');
    }
}

// ============================================================
// 6. 表情包抽屉与导入管理弹窗（参考参考图设计）
// ============================================================
let _stickerDrawerOpen = false;

function buildStickerDrawerHTML() {
    const cats = G.stickerCategories || ['猪猪', '默认'];
    const activeCat = G.activeStickerCategory || cats[0];
    const stickers = (G.stickerLibrary || []).filter(s => s.category === activeCat);

    let tabsHtml = cats.map(c => `
        <button class="stk-tab-btn ${c === activeCat ? 'active' : ''}" data-cat="${escapeHtml(c)}" style="padding:4px 10px;font-size:12px;font-weight:700;border:1px solid ${c === activeCat ? 'var(--primary)' : '#ccc'};border-radius:6px;background:${c === activeCat ? '#eaf5ea' : '#fff'};color:${c === activeCat ? 'var(--primary)' : '#555'};cursor:pointer;white-space:nowrap;">
            ${escapeHtml(c)}
        </button>
    `).join('');

    let gridHtml = `
        <div class="stk-item-card" id="btnAddStickerTrigger" style="width:68px;height:84px;border:2px dashed #bbb;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;background:#fafafa;">
            <span style="font-size:24px;color:#888;">➕</span>
            <span style="font-size:10px;color:#888;margin-top:2px;">添加</span>
        </div>
    `;

    stickers.forEach((stk, idx) => {
        gridHtml += `
        <div class="stk-item-card stk-send-btn" data-url="${escapeHtml(stk.url)}" data-desc="${escapeHtml(stk.desc)}" style="width:68px;height:84px;border:1px solid #e0e0e0;border-radius:8px;padding:3px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;cursor:pointer;background:#fff;">
            <img src="${stk.url}" style="width:56px;height:56px;object-fit:cover;border-radius:6px;">
            <div style="font-size:9.5px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;text-align:center;margin-top:3px;">${escapeHtml(stk.desc)}</div>
        </div>
        `;
    });

    return `
    <div id="stickerDrawerContainer" style="background:#f4f6f4;border-top:1px solid #ddd;padding:8px 10px;height:180px;display:flex;flex-direction:column;box-sizing:border-box;">
        <div style="display:flex;align-items:center;gap:6px;overflow-x:auto;padding-bottom:6px;border-bottom:1px solid #e2e8e2;">
            ${tabsHtml}
            <button id="btnNewStickerCategory" title="新建分组" style="border:1px solid #bbb;background:#fff;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;">✏️ 新分类</button>
        </div>
        <div style="flex:1;overflow-y:auto;display:flex;flex-wrap:wrap;gap:8px;padding-top:8px;">
            ${gridHtml}
        </div>
    </div>
    `;
}

function bindStickerDrawerEvents(targetType, targetId) {
    const drawer = document.getElementById('stickerDrawerContainer');
    if (!drawer) return;

    drawer.querySelectorAll('.stk-tab-btn').forEach(btn => {
        btn.onclick = () => {
            G.activeStickerCategory = btn.dataset.cat;
            if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
            else renderGroupChatWindow(document.getElementById('socialTab'));
        };
    });

    document.getElementById('btnNewStickerCategory')?.addEventListener('click', () => {
        openCreateStickerCategoryModal(targetType, targetId);
    });

    document.getElementById('btnAddStickerTrigger')?.addEventListener('click', () => {
        openImportStickersModal(targetType, targetId);
    });

    drawer.querySelectorAll('.stk-send-btn').forEach(btn => {
        btn.onclick = () => {
            const url = btn.dataset.url;
            const desc = btn.dataset.desc;
            sendStickerMessage(targetType, targetId, { desc, url });
        };
    });
}

function openCreateStickerCategoryModal(targetType, targetId) {
    openModal(`
        <div style="text-align:center;padding:10px 0;">
            <h3 style="margin-bottom:12px;">新建表情分类</h3>
            <div class="form-group">
                <input type="text" id="newStickerCatName" placeholder="输入分类名称..." style="width:100%;padding:10px;border-radius:10px;border:1px solid #ccc;font-size:14px;box-sizing:border-box;">
            </div>
            <div class="btn-row" style="margin-top:14px;">
                <button class="btn-secondary" onclick="closeModal()">取消</button>
                <button class="btn-primary" id="btnConfirmCreateStkCat" style="background:#b39ddb;">创建</button>
            </div>
        </div>
    `);

    document.getElementById('btnConfirmCreateStkCat').onclick = () => {
        const val = document.getElementById('newStickerCatName').value.trim();
        if (!val) { showToast('⚠️ 请输入分类名称', 'error'); return; }
        if (!G.stickerCategories.includes(val)) G.stickerCategories.push(val);
        G.activeStickerCategory = val;
        closeModal();
        if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
        else renderGroupChatWindow(document.getElementById('socialTab'));
        autoSaveGame();
    };
}

function openImportStickersModal(targetType, targetId) {
    const curCat = G.activeStickerCategory || '猪猪';
    openModal(`
        <h3>🖼️ 导入表情包到「${escapeHtml(curCat)}」</h3>
        <p style="font-size:12px;color:#666;line-height:1.5;">
            支持批量粘贴导入。格式规范为：<br>
            <b style="color:#2e7d32;">表情描述——图床链接</b>（每行一个）<br>
            <i>例如：微笑——https://imgbed.xxx/a.jpg</i>
        </p>
        <div class="form-group">
            <textarea id="importStickerBatchInput" rows="6" placeholder="这只可爱的小猪就是我呀——https://imgbed.heliar.top/i/QZNPVIKLzB8DiDL-.jpg&#10;你给我老实点——https://imgbed.heliar.top/i/KpiF2iLAUzHVDvjD.jpg" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;font-size:12px;font-family:monospace;box-sizing:border-box;"></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnConfirmBatchImport">批量导入</button>
        </div>
    `);

    document.getElementById('btnConfirmBatchImport').onclick = () => {
        const raw = document.getElementById('importStickerBatchInput').value.trim();
        if (!raw) { showToast('⚠️ 请输入表情内容与图床链接', 'error'); return; }

        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
        let count = 0;

        if (!G.stickerLibrary) G.stickerLibrary = [];

        for (const line of lines) {
            let desc = '';
            let url = '';
            if (line.includes('——')) {
                const parts = line.split('——');
                desc = parts[0].trim();
                url = parts.slice(1).join('——').trim();
            } else if (line.includes(':http')) {
                const idx = line.indexOf(':http');
                desc = line.slice(0, idx).trim();
                url = line.slice(idx + 1).trim();
            } else if (line.includes('http')) {
                const idx = line.indexOf('http');
                desc = line.slice(0, idx).replace(/[-—:：\s]+$/, '').trim() || '表情';
                url = line.slice(idx).trim();
            }

            if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/'))) {
                G.stickerLibrary.push({
                    category: curCat,
                    desc: desc || '萌系表情',
                    url: url
                });
                count++;
            }
        }

        if (count > 0) {
            showToast(`🎉 成功为「${curCat}」导入 ${count} 个表情包！`, 'success', 2500);
            closeModal();
            if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
            else renderGroupChatWindow(document.getElementById('socialTab'));
            autoSaveGame();
        } else {
            showToast('⚠️ 未识别到有效的链接，请检查格式', 'error', 2500);
        }
    };
}

function sendStickerMessage(targetType, targetId, stickerObj) {
    const curAcc = getActiveAccountInfo();
    const isSingle = targetType === 'single';

    const msg = {
        _id: 'cstk_' + Date.now() + '_' + rand(100, 999),
        from: 'player',
        senderAccount: curAcc.name,
        sticker: stickerObj,
        text: `[表情: ${stickerObj.desc}]`,
        time: new Date().toLocaleTimeString().slice(0, 5)
    };

    if (isSingle) {
        pushChatMessageSafe(targetId, msg);
        renderSingleChatWindow(document.getElementById('socialTab'));
    } else {
        if (!G.groupChatHistory[targetId]) G.groupChatHistory[targetId] = [];
        G.groupChatHistory[targetId].push(msg);
        renderGroupChatWindow(document.getElementById('socialTab'));
    }
    autoSaveGame();
}

// ============================================================
// 7. 私聊窗口与「屏幕那边的TA」动作感知
// ============================================================
function renderSingleChatWindow(container) {
    const npcId = G.currentChatNpc;
    const npc = G.npcs[npcId];
    if (!npc) { closeChat(); return; }

    const activeAcc = getActiveAccountInfo();
    const isBlocked = isAccountBlockedByNpc(npcId, activeAcc.id);
    const chatHist = getAccountChatHistory(npcId);

    const sessionKey = getChatStorageKey(npcId);
    const showAll = !!G._chatShowFullHistory[sessionKey];
    const FOLD_LIMIT = 15;
    const hasMore = chatHist.length > FOLD_LIMIT && !showAll;
    const displayList = hasMore ? chatHist.slice(chatHist.length - FOLD_LIMIT) : chatHist;
    const isBehindScreenActive = !!G._behindScreenActive[npcId];

    let messagesHtml = '';
    if (hasMore) {
        messagesHtml += `
        <div style="text-align:center;margin:4px 0 12px;">
            <button id="btnLoadMoreChatHist" style="border:none;background:rgba(0,0,0,0.06);color:#555;padding:4px 12px;border-radius:12px;font-size:11px;cursor:pointer;">
                📜 点击展开更早的 ${chatHist.length - FOLD_LIMIT} 条记录
            </button>
        </div>`;
    }

    for (const msg of displayList) {
        if (msg.from === 'action') {
            messagesHtml += `
            <div style="text-align:center;margin:8px 0;">
                <span style="display:inline-block;background:rgba(0,0,0,0.06);color:#666;padding:4px 10px;border-radius:12px;font-size:12px;max-width:85%;">${escapeHtml(msg.text)}</span>
            </div>`;
        } else if (msg.from === 'behind_screen') {
            // 👁️ 屏幕那边的TA · 独立剧场动作感知卡（居中淡雅卡片，不在气泡内出戏）
            messagesHtml += `
            <div style="margin:12px 14px;background:rgba(255,253,245,0.92);border:1px dashed #d7ccc8;border-radius:10px;padding:8px 12px;font-size:12px;color:#5d4037;line-height:1.6;box-shadow:0 1px 4px rgba(0,0,0,0.04);position:relative;">
                <div style="font-weight:700;font-size:11px;color:#8d6e63;margin-bottom:3px;display:flex;align-items:center;gap:4px;">
                    <span>👁️ 屏幕那边的 TA (${escapeHtml(npc.name)})</span>
                </div>
                <div>${escapeHtml(msg.text)}</div>
            </div>`;
        } else {
            const isSelf = msg.from === 'player';
            let bubbleContent = '';

            if (msg.sticker) {
                // 表情包气泡渲染
                bubbleContent = `
                <div style="padding:2px;">
                    <img src="${msg.sticker.url}" alt="${escapeHtml(msg.sticker.desc)}" style="max-width:140px;max-height:140px;border-radius:8px;object-fit:cover;display:block;">
                    <div style="font-size:9.5px;color:#888;margin-top:3px;text-align:center;">${escapeHtml(msg.sticker.desc)}</div>
                </div>`;
            } else {
                bubbleContent = isSelf ? escapeHtml(msg.text).replace(/\n/g, '<br>') : renderContentWithThoughts(msg.text);
            }

            messagesHtml += `
            <div class="chat-msg-row" data-msgid="${msg._id || ''}" data-from="${msg.from}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:10px;align-items:flex-start;">
                ${!isSelf ? `<div class="chat-npc-avatar-btn" style="margin-right:8px;flex-shrink:0;cursor:pointer;" title="点击查看名片与动态">${renderAvatarBadge(npc, 34)}</div>` : ''}
                <div style="max-width:75%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                    ${isSelf && msg.senderAccount ? `<div style="font-size:10px;color:#888;margin-bottom:2px;">${escapeHtml(msg.senderAccount)}</div>` : ''}
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? (msg.sticker ? 'transparent' : '#95ec69') : (msg.sticker ? 'transparent' : '#fff')};color:#111;padding:${msg.sticker ? '0' : '8px 12px'};border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:${msg.sticker ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'};font-size:14px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;">
                        ${bubbleContent}
                    </div>
                    <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                </div>
                ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: activeAcc.avatar }, 34)}</div>` : ''}
            </div>`;
        }
    }

    const html = `
    <div style="background:#f2f4f2;border-radius:14px;display:flex;flex-direction:column;height:82vh;max-height:850px;box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden;">
        <div style="padding:10px 14px;background:#fff;border-bottom:1px solid #e5ebe5;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
                <button onclick="closeChat()" style="border:none;background:none;font-size:20px;color:#333;cursor:pointer;padding:0 4px;">❮</button>
                <div id="singleChatHeaderProfileBtn" style="cursor:pointer;" title="点击查看TA的名片">
                    <div style="font-weight:700;font-size:15px;display:flex;align-items:center;gap:6px;">
                        <span>${escapeHtml(npc.name)}</span>
                        <span style="font-size:11px;color:#e53935;font-weight:normal;background:#ffebee;padding:1px 6px;border-radius:8px;">❤️ ${npc.favor || 0}</span>
                    </div>
                    <div id="chatOnlineStatusText" style="font-size:11px;color:#2e7d32;">
                        ${isBlocked ? '<span style="color:#d32f2f;">⚠️ TA已拉黑本账号</span>' : '● 在线'} ${npc.memorySummary ? '· 🧠专属记忆' : ''}
                    </div>
                </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
                <!-- 屏幕那边的TA 开关胶囊 -->
                <button id="btnToggleBehindScreen" style="border:1px solid ${isBehindScreenActive ? '#8d6e63' : '#ccc'};background:${isBehindScreenActive ? '#efebe9' : '#fff'};color:${isBehindScreenActive ? '#5d4037' : '#888'};padding:3px 7px;border-radius:12px;font-size:10.5px;font-weight:700;cursor:pointer;" title="开启后AI会生成TA在线下的动作心理描写">
                    👁️ 屏幕那边: ${isBehindScreenActive ? '开' : '关'}
                </button>
                <div id="singleChatHeaderAccountBtn" title="点击切换大号/小号" style="cursor:pointer;display:flex;align-items:center;background:#eef5ee;padding:3px 7px;border-radius:14px;border:1px solid #cce3cc;gap:3px;">
                    ${activeAcc.avatar ? `<img src="${activeAcc.avatar}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;">` : (activeAcc.isAlt ? '🎭' : '👑')}
                    <span style="font-size:10.5px;font-weight:700;color:#2e7d32;max-width:55px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(activeAcc.name)}</span>
                </div>
                <button id="triggerAIReplyBtn" title="让TA回复或主动发消息" style="border:none;background:#ff4757;color:#fff;width:34px;height:34px;border-radius:10px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        ${isBlocked ? `
        <div style="background:#ffebee;color:#c62828;padding:6px 12px;font-size:11px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ffcdd2;">
            <span>🚫 你的当前账号已被对方拉黑拒收。</span>
            <button onclick="openAccountManagerModal()" style="border:none;background:#c62828;color:#fff;padding:2px 8px;border-radius:6px;font-size:10px;cursor:pointer;">切其他小号骚扰/求原谅</button>
        </div>` : ''}

        <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:14px;">
            ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">当前账号与 TA 尚无对话，点击右上方 ⚡ 闪电按钮开启互动！</div>'}
        </div>

        <!-- 表情包抽屉 -->
        ${_stickerDrawerOpen ? buildStickerDrawerHTML() : ''}

        <div style="padding:8px 10px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:6px;align-items:center;">
            <button id="chatActionInsertBtn" title="合作/拍视频/旁白" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
            <button id="chatToggleStickerBtn" title="发送图床表情包" style="border:1px solid #ccc;background:${_stickerDrawerOpen ? '#eaf5ea' : '#f8f9f8'};color:#555;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">😊</button>
            <textarea id="singleChatInput" rows="1" placeholder="${activeAcc.isAlt ? `[小号 ${activeAcc.name}]...` : 'Message...'}" style="flex:1;padding:8px 12px;border-radius:18px;border:1px solid #ddd;background:#f8faf8;font-size:14px;resize:none;outline:none;font-family:inherit;"></textarea>
            <button id="singleSendBtn" style="border:none;background:var(--primary);color:#fff;padding:8px 14px;border-radius:18px;font-size:13px;font-weight:700;cursor:pointer;">发送</button>
        </div>
    </div>
    `;
    container.innerHTML = html;

    const msgArea = document.getElementById('chatMessageArea');
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;

    if (_stickerDrawerOpen) {
        bindStickerDrawerEvents('single', npcId);
    }

    // 切换 屏幕那边的TA 开关
    document.getElementById('btnToggleBehindScreen')?.addEventListener('click', () => {
        G._behindScreenActive[npcId] = !G._behindScreenActive[npcId];
        showToast(G._behindScreenActive[npcId] ? '👁️ 已开启「屏幕那边的TA」动作感知' : '已关闭线下动作感知', 'info', 1500);
        renderSingleChatWindow(container);
        autoSaveGame();
    });

    document.getElementById('chatToggleStickerBtn')?.addEventListener('click', () => {
        _stickerDrawerOpen = !_stickerDrawerOpen;
        renderSingleChatWindow(container);
    });

    document.getElementById('btnLoadMoreChatHist')?.addEventListener('click', () => {
        G._chatShowFullHistory[sessionKey] = true;
        renderSingleChatWindow(container);
    });

    document.getElementById('singleChatHeaderAccountBtn')?.addEventListener('click', openAccountManagerModal);

    container.querySelectorAll('.chat-msg-row[data-from="player"]').forEach(row => {
        const msgId = row.dataset.msgid;
        const bubble = row.querySelector('.self-bubble');
        if (bubble && msgId) {
            bindLongPressEvent(bubble, () => {
                if (typeof showMessageActionSheet === 'function') showMessageActionSheet(msgId, 'single', npcId);
            });
        }
    });

    const input = document.getElementById('singleChatInput');
    const sendBtn = document.getElementById('singleSendBtn');

    const doSend = () => {
        const text = input.value.trim();
        if (!text) return;

        if (isBlocked) {
            pushChatMessageSafe(npcId, {
                from: 'player',
                text,
                senderAccount: activeAcc.name,
                time: new Date().toLocaleTimeString().slice(0, 5)
            });
            pushChatMessageSafe(npcId, {
                from: 'action',
                text: `❌ 消息已发出，但被对方拒收了。（当前账号已被拉黑）`,
                time: new Date().toLocaleTimeString().slice(0, 5)
            });
            input.value = '';
            renderSingleChatWindow(container);
            showToast('⚠️ 对方开启了朋友验证，你已被拉黑', 'error', 3000);
            return;
        }

        pushChatMessageSafe(npcId, {
            from: 'player',
            text,
            senderAccount: activeAcc.isAlt ? `${activeAcc.name} (小号)` : activeAcc.name,
            time: new Date().toLocaleTimeString().slice(0, 5)
        });
        input.value = '';
        renderSingleChatWindow(container);
        autoSaveGame();
    };

    if (sendBtn) sendBtn.onclick = doSend;
    if (input) {
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                doSend();
            }
        };
    }

    const showCard = () => openNpcProfileCardModal(npcId);
    document.getElementById('singleChatHeaderProfileBtn')?.addEventListener('click', showCard);
    container.querySelectorAll('.chat-npc-avatar-btn').forEach(btn => btn.onclick = showCard);

    document.getElementById('chatActionInsertBtn')?.addEventListener('click', () => {
        if (typeof openChatActionMenuModal === 'function') openChatActionMenuModal('single', npcId);
    });

    const triggerBtn = document.getElementById('triggerAIReplyBtn');
    if (triggerBtn) {
        triggerBtn.onclick = async () => {
            if (G.isGenerating) { showToast('⏳ TA 正在打字中...', 'info', 1500); return; }
            triggerBtn.style.opacity = '0.6';
            triggerBtn.style.pointerEvents = 'none';
            await triggerAIReplyForSingle(npcId);
            if (document.getElementById('triggerAIReplyBtn')) {
                document.getElementById('triggerAIReplyBtn').style.opacity = '1';
                document.getElementById('triggerAIReplyBtn').style.pointerEvents = 'auto';
            }
        };
    }
}

// ⚡ 单人聊天 AI 回复触发（支持图床斗图、杜绝出戏括号、独立输出屏幕那边的TA）
async function triggerAIReplyForSingle(npcId) {
    const npc = G.npcs[npcId];
    if (!npc) return;
    const activeAcc = getActiveAccountInfo();
    const isCurrentlyBlocked = isAccountBlockedByNpc(npcId, activeAcc.id);
    const isMainBlocked = isAccountBlockedByNpc(npcId, 'main');
    const isBehindScreenActive = !!G._behindScreenActive[npcId];

    if (isCurrentlyBlocked) {
        showToast('⚠️ 当前账号已被对方拉黑，对方无法接收回复。', 'error', 3000);
        return;
    }

    const history = getAccountChatHistory(npcId);
    const statusEl = document.getElementById('chatOnlineStatusText');
    if (statusEl) statusEl.innerHTML = `<span style="color:#ff9800;">✍️ 对方正在打字...</span>`;

    let recentContext = '';
    if (history.length > 0) {
        recentContext = history.slice(-10).map(m => {
            if (m._recalled) {
                return m._seenByNpc
                    ? `[系统提示: 对方发了“${m._originalText}”，随后撤回了，但被你亲眼看到了]`
                    : `[系统提示: 对方撤回了一条消息]`;
            }
            if (m.from === 'action') return `[旁白: ${m.text}]`;
            if (m.from === 'behind_screen') return `[此前你屏幕那边的线下动作: ${m.text}]`;
            const speaker = m.from === 'player' ? (m.senderAccount || '主角') : npc.name;
            return `${speaker}: ${m.sticker ? `[发送了表情包: ${m.sticker.desc}]` : stripThought(m.text || '')}`;
        }).join('\n');
    } else {
        recentContext = '（尚未开始对话，请主动找对方开启有趣话题）';
    }

    let npcMemoryContext = '';
    if (npc.memorySummary) npcMemoryContext += `【历史专属记忆与朋友圈互动】\n${npc.memorySummary}\n`;
    if (npc.knownGroupEvents) npcMemoryContext += `【群聊获悉事件】\n${npc.knownGroupEvents}\n`;

    const recentPlayerPosts = (G.feed || []).filter(f => f.isPlayer || f.author === G.player.ytName).slice(-2);
    let playerMomentsContext = '';
    if (recentPlayerPosts.length > 0) {
        playerMomentsContext = '【玩家最近发的朋友圈动态（可自然在私信中提起吐槽）】：\n' +
            recentPlayerPosts.map(p => `• “${p.body}” ${p.image ? '(附带图片)' : ''}${p.imageDesc ? `(配图: ${p.imageDesc})` : ''}`).join('\n') + '\n';
    }

    const tzContext = formatNpcTimezoneContext(npc.name);

    // 收集可用表情关键词供 AI 选择斗图
    const availableStickers = (G.stickerLibrary || []).slice(0, 20).map(s => s.desc).join('、');

    const behindScreenPrompt = isBehindScreenActive ? `
【屏幕那边的TA（线下第三人称动作感知）】：
玩家已开启线下动作感知。请在输出完聊天消息后，额外输出一个独立块 [BEHIND_SCREEN]...[/BEHIND_SCREEN]，细腻描写你在屏幕那边的真实线下动作、环境与心理小动作（30~60字）。
例如：
[BEHIND_SCREEN]单手托腮靠在电竞椅上，另一只手有一搭没一搭地转着笔，屏幕冷光映在眼睛里，正盯着聊天框嘴角微微扬起。[/BEHIND_SCREEN]
` : '';

    const sysPrompt = `
你正在扮演真实沉浸的 Minecraft 主播/好友「${npc.name}」（性格人设：${npc.persona || '一位同伴'}，好感度：${npc.favor||50}/100）。
${tzContext}
${npcMemoryContext}
${playerMomentsContext}

【严禁出戏括号与纯净聊天铁律】：
1. 聊天气泡内【绝对禁止】包含任何动作括号（如“（叹气）”、“（喝了一口水）”、“*微笑*”等）！把聊天框当成真实的微信打字，只输出纯粹口语化的消息文字！
2. 支持发送表情包斗图：若语境合适，可将其中一条消息写为 [STICKER:表情关键词]（可用关键词参考：${availableStickers}）。
3. 连续发送 2 到 4 条短消息气泡，每条用 [MSG]...[/MSG] 包裹：
[MSG]第一句话[/MSG]
[MSG]第二句话[/MSG]
[MSG][STICKER:你给我老实点][/MSG]
${behindScreenPrompt}
`;

    try {
        G.isGenerating = true;
        if (typeof showLoading === 'function') showLoading();

        const rawReply = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: history.length > 0 ? '请根据当前聊天上下文连续发送多条纯打字回复。' : '请主动向对方发消息打个招呼。' }
        ], { maxTokens: 550, temperature: 0.9 });

        if (typeof hideLoading === 'function') hideLoading();

        let cleanText = rawReply;
        let behindScreenActionText = '';

        // 提取屏幕那边的动作感知
        const bsMatch = cleanText.match(/\[BEHIND_SCREEN\]([\s\S]*?)\[\/BEHIND_SCREEN\]/i);
        if (bsMatch) {
            behindScreenActionText = stripThought(bsMatch[1].trim());
            cleanText = cleanText.replace(/\[BEHIND_SCREEN\][\s\S]*?\[\/BEHIND_SCREEN\]/gi, '').trim();
        }

        const bubbles = splitIntoChatBubbles(cleanText);
        const finalBubbles = bubbles.length ? bubbles : ['在呢！刚在剪视频，怎么啦？'];

        for (let i = 0; i < finalBubbles.length; i++) {
            const bText = finalBubbles[i];
            const stkMatch = bText.match(/\[STICKER:([^\]]+)\]/i);

            if (stkMatch) {
                const stkObj = findStickerByKeyword(stkMatch[1]);
                if (stkObj) {
                    pushChatMessageSafe(npcId, {
                        from: 'npc',
                        text: `[表情: ${stkObj.desc}]`,
                        sticker: stkObj,
                        time: new Date().toLocaleTimeString().slice(0, 5)
                    });
                } else {
                    pushChatMessageSafe(npcId, {
                        from: 'npc',
                        text: bText.replace(/\[STICKER:[^\]]+\]/gi, '😏'),
                        time: new Date().toLocaleTimeString().slice(0, 5)
                    });
                }
            } else {
                pushChatMessageSafe(npcId, {
                    from: 'npc',
                    text: bText,
                    time: new Date().toLocaleTimeString().slice(0, 5)
                });
            }

            const container = (dom && dom.socialTab) || document.getElementById('socialTab');
            if (G.currentChatNpc === npcId && container) {
                renderSingleChatWindow(container);
            }

            if (i < finalBubbles.length - 1) {
                await new Promise(res => setTimeout(res, 600));
            }
        }

        // 开启了屏幕那边的TA时，追加剧场式动作感知
        if (behindScreenActionText && isBehindScreenActive) {
            pushChatMessageSafe(npcId, {
                from: 'behind_screen',
                text: behindScreenActionText,
                time: new Date().toLocaleTimeString().slice(0, 5)
            });
            const container = (dom && dom.socialTab) || document.getElementById('socialTab');
            if (G.currentChatNpc === npcId && container) {
                renderSingleChatWindow(container);
            }
        }

        autoSaveGame();
    } catch (e) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('私聊 AI 回复失败', e);
        showToast('❌ 回复失败，请检查网络或设置', 'error');
    } finally {
        G.isGenerating = false;
        const curStatusEl = document.getElementById('chatOnlineStatusText');
        const isNowBlocked = isAccountBlockedByNpc(npcId, activeAcc.id);
        if (curStatusEl) {
            curStatusEl.innerHTML = `${isNowBlocked ? '<span style="color:#d32f2f;">⚠️ TA已拉黑本账号</span>' : '● 在线'} ${npc.memorySummary ? '· 🧠专属记忆' : ''}`;
        }
    }
}

// ============================================================
// 8. 群聊窗口（群聊带表情包，杜绝线下动作出戏）
// ============================================================
function openGroupChat(gid) {
    G.currentChatGroup = gid;
    renderSocialPanel();
}

function closeGroupChat() {
    G.currentChatGroup = null;
    renderSocialPanel();
}

function renderGroupChatWindow(container) {
    const gid = G.currentChatGroup;
    const grp = G.groups[gid];
    if (!grp) { closeGroupChat(); return; }
    const msgs = G.groupChatHistory[gid] || [];
    const activeAcc = getActiveAccountInfo();

    let messagesHtml = '';
    for (const msg of msgs) {
        if (msg.from === 'action') {
            messagesHtml += `
            <div style="text-align:center;margin:8px 0;">
                <span style="display:inline-block;background:rgba(0,0,0,0.06);color:#666;padding:3px 10px;border-radius:12px;font-size:11px;">${escapeHtml(msg.text)}</span>
            </div>`;
        } else {
            const isSelf = msg.from === 'player';
            let bubbleContent = '';

            if (msg.sticker) {
                bubbleContent = `
                <div style="padding:2px;">
                    <img src="${msg.sticker.url}" alt="${escapeHtml(msg.sticker.desc)}" style="max-width:140px;max-height:140px;border-radius:8px;object-fit:cover;display:block;">
                    <div style="font-size:9.5px;color:#888;margin-top:3px;text-align:center;">${escapeHtml(msg.sticker.desc)}</div>
                </div>`;
            } else {
                bubbleContent = isSelf ? escapeHtml(msg.text).replace(/\n/g, '<br>') : renderContentWithThoughts(msg.text);
            }

            messagesHtml += `
            <div class="chat-msg-row" data-msgid="${msg._id || ''}" data-from="${msg.from}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:10px;align-items:flex-start;">
                ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: msg.senderAvatarUrl, avatarEmoji: msg.senderAvatar || '👤' }, 34)}</div>` : ''}
                <div style="max-width:75%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                    ${!isSelf ? `<div style="font-size:11px;color:#777;margin-bottom:2px;">${escapeHtml(msg.senderName)}</div>` : ''}
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? (msg.sticker ? 'transparent' : '#95ec69') : (msg.sticker ? 'transparent' : '#fff')};color:#111;padding:${msg.sticker ? '0' : '8px 12px'};border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:${msg.sticker ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'};font-size:14px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;">
                        ${bubbleContent}
                    </div>
                    <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                </div>
                ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: activeAcc.avatar }, 34)}</div>` : ''}
            </div>`;
        }
    }

    const html = `
    <div style="background:#f2f4f2;border-radius:14px;display:flex;flex-direction:column;height:82vh;max-height:850px;box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden;">
        <div style="padding:10px 14px;background:#fff;border-bottom:1px solid #e5ebe5;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
                <button onclick="closeGroupChat()" style="border:none;background:none;font-size:20px;color:#333;cursor:pointer;padding:0 4px;">❮</button>
                <div>
                    <div style="font-weight:700;font-size:15px;">${escapeHtml(grp.name)} <span style="font-size:12px;color:#888;">(${(grp.members || []).length})</span></div>
                    <div style="font-size:11px;color:#888;">${grp.desc ? escapeHtml(grp.desc.slice(0, 18)) : '群聊自由交流'}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button id="groupSettingsBtn" style="border:1px solid #ddd;background:#fff;color:#555;padding:4px 8px;border-radius:8px;font-size:12px;cursor:pointer;">⚙️ 管理</button>
                <button id="triggerGroupAIBtn" title="触发群成员回复" style="border:none;background:#ff4757;color:#fff;width:36px;height:36px;border-radius:10px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        <div id="groupMessageArea" style="flex:1;overflow-y:auto;padding:14px;">
            ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">群里静悄悄的，点击 ➕ 拍共创视频或与群友斗图吧！</div>'}
        </div>

        <!-- 表情包抽屉 -->
        ${_stickerDrawerOpen ? buildStickerDrawerHTML() : ''}

        <div style="padding:8px 10px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:6px;align-items:center;">
            <button id="groupActionInsertBtn" title="群合作/共创视频/旁白" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
            <button id="groupToggleStickerBtn" title="发送表情包" style="border:1px solid #ccc;background:${_stickerDrawerOpen ? '#eaf5ea' : '#f8f9f8'};color:#555;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">😊</button>
            <textarea id="groupChatInput" rows="1" placeholder="以 [${escapeHtml(activeAcc.name)}] 在群里发言..." style="flex:1;padding:8px 12px;border-radius:18px;border:1px solid #ddd;background:#f8faf8;font-size:14px;resize:none;outline:none;font-family:inherit;"></textarea>
            <button id="groupSendBtn" style="border:none;background:var(--primary);color:#fff;padding:8px 14px;border-radius:18px;font-size:13px;font-weight:700;cursor:pointer;">发送</button>
        </div>
    </div>
    `;
    container.innerHTML = html;

    const msgArea = document.getElementById('groupMessageArea');
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;

    if (_stickerDrawerOpen) {
        bindStickerDrawerEvents('group', gid);
    }

    document.getElementById('groupToggleStickerBtn')?.addEventListener('click', () => {
        _stickerDrawerOpen = !_stickerDrawerOpen;
        renderGroupChatWindow(container);
    });

    const input = document.getElementById('groupChatInput');
    const sendBtn = document.getElementById('groupSendBtn');

    const doSend = () => {
        const text = input.value.trim();
        if (!text) return;
        if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
        G.groupChatHistory[gid].push({
            _id: 'gmsg_' + Date.now() + '_' + rand(100, 999),
            from: 'player',
            senderName: activeAcc.name,
            text,
            time: new Date().toLocaleTimeString().slice(0, 5)
        });
        input.value = '';
        renderGroupChatWindow(container);
        autoSaveGame();
    };

    if (sendBtn) sendBtn.onclick = doSend;
    if (input) {
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                doSend();
            }
        };
    }

    document.getElementById('groupActionInsertBtn')?.addEventListener('click', () => {
        if (typeof openChatActionMenuModal === 'function') openChatActionMenuModal('group', gid);
    });

    document.getElementById('groupSettingsBtn')?.addEventListener('click', () => openGroupSettingsModal(gid));

    document.getElementById('triggerGroupAIBtn')?.addEventListener('click', async () => {
        if (G.isGenerating) { showToast('⏳ AI 正在组织群聊中...'); return; }
        showToast('⚡ 触发群聊讨论...', 'success', 1200);
        await triggerGroupAIReply(gid);
        renderGroupChatWindow(container);
    });
}

function openChat(npcId) { G.currentChatNpc = npcId; renderSocialPanel(); }
function closeChat() { G.currentChatNpc = null; renderSocialPanel(); }

// ============================================================
// 暴露全局
// ============================================================
window.renderSocialPanel = renderSocialPanel;
window.openChat = openChat;
window.closeChat = closeChat;
window.openGroupChat = openGroupChat;
window.closeGroupChat = closeGroupChat;
window.openAccountManagerModal = openAccountManagerModal;
window.switchAccount = switchAccount;
window.deleteAltAccount = deleteAltAccount;
window.triggerGenerateFriendsFeed = triggerGenerateFriendsFeed;
window.detectPlayerTimezoneInfo = detectPlayerTimezoneInfo;
window.formatNpcTimezoneContext = formatNpcTimezoneContext;
window.getAccountChatHistory = getAccountChatHistory;
window.isAccountBlockedByNpc = isAccountBlockedByNpc;
window.openCreateMomentPostModal = openCreateMomentPostModal;
window.triggerAiCommentForMoment = triggerAiCommentForMoment;