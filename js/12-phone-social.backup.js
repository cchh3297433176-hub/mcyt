// js/12-phone-social.js
// 手机社交生态系统：账号隔离、朋友圈多模态互动、时差与自定义时钟、聊天表情包、屏幕那边的TA
// Android WebView 兼容版：关键交互统一走 touchend + click 去重，避免拆分文件后事件链互相干扰
// ============================================================

// ============================================================
// 1. 图床表情包库系统（内置猪猪分组，支持自由新建分类与图床批量导入）
// ============================================================
if (!window.G.stickerCategories) {
    window.G.stickerCategories = ['猪猪', '默认'];
}
if (!window.G.activeStickerCategory) {
    window.G.activeStickerCategory = '猪猪';
}
if (!window.G.stickerLibrary || !window.G.stickerLibrary.length) {
    window.G.stickerLibrary = [
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

function findStickerByKeyword(kw) {
    if (!kw || !window.G.stickerLibrary) return null;
    const cleanKw = kw.trim().toLowerCase();
    return window.G.stickerLibrary.find(s => s.desc.toLowerCase() === cleanKw || s.desc.toLowerCase().includes(cleanKw) || cleanKw.includes(s.desc.toLowerCase()));
}

// ============================================================
// 2. 时差推导与时区检测工具
// ============================================================
if (!window.G.clockConfig) {
    window.G.clockConfig = {
        mode: 'game',
        customCountry: '中国 (东八区)',
        customTimeStr: ''
    };
}

function detectPlayerTimezoneInfo() {
    const G = window.G;
    if (G.clockConfig && G.clockConfig.mode === 'device') {
        const now = new Date();
        const hrs = now.getHours();
        const mins = String(now.getMinutes()).padStart(2, '0');
        let timeName = '早晨 ☀️';
        if (hrs >= 11 && hrs < 18) timeName = '中午 🌤️';
        else if (hrs >= 18 || hrs < 5) timeName = '夜晚 🌙';
        return {
            country: '设备所在地区 (本地时区)',
            region: 'LOCAL',
            slotName: `${timeName} (${hrs}:${mins})`,
            day: G.day
        };
    }

    if (G.clockConfig && G.clockConfig.mode === 'custom' && G.clockConfig.customCountry) {
        return {
            country: G.clockConfig.customCountry,
            region: 'CUSTOM',
            slotName: G.clockConfig.customTimeStr || getTimeSlotName(G.timeSlot),
            day: G.day
        };
    }

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
【时区与时差真实环境】：
1. 玩家当前所在地：${pTz.country}，当前时刻为：第 ${pTz.day} 天【${pTz.slotName}】。
2. 海外MC主播（如 Dream/美、ThatMob/加法、Grox/美、Twixxel/美、xqree/欧洲、Whispy/美）：
   - 若玩家在亚洲/中国：玩家这边的「早晨/中午」对应海外主播的「深夜/凌晨甚至通宵未眠」；玩家这边的「夜晚」对应海外主播的「清晨刚醒/正午时分」。
   - 若玩家人设在欧美同区，则无大时差。
3. 请在对话/评论中，根据此真实时差合乎逻辑地反映出当时该角色是刚刚熬夜剪完片、还是大早刚爬起来。
`;
}

function openClockSettingsModal() {
    const G = window.G;
    const cfg = G.clockConfig || { mode: 'game', customCountry: '中国 (东八区)', customTimeStr: '' };
    const curTz = detectPlayerTimezoneInfo();

    openModal(`
        <h3>🕒 游戏时钟与时区管理</h3>
        <p style="font-size:12px;color:#666;line-height:1.6;">
            当前推导时区：<b>${curTz.country}</b> · <b>${curTz.slotName}</b><br>
            AI 会以此时间与海外主播换算真实时差，你可以在下方自定义。
        </p>

        <div class="form-group" style="margin-top:10px;">
            <label style="font-size:13px;font-weight:700;">选择时间同步模式：</label>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px;">
                <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                    <input type="radio" name="clockModeRadio" value="game" ${cfg.mode === 'game' ? 'checked' : ''}>
                    <span>🎮 跟随游戏内天数推进 (早/中/晚)</span>
                </label>
                <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                    <input type="radio" name="clockModeRadio" value="device" ${cfg.mode === 'device' ? 'checked' : ''}>
                    <span>📱 实时跟随真实手机设备时钟 (高沉浸)</span>
                </label>
                <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                    <input type="radio" name="clockModeRadio" value="custom" ${cfg.mode === 'custom' ? 'checked' : ''}>
                    <span>✍️ 手动固定国家与时间</span>
                </label>
            </div>
        </div>

        <div id="customClockInputsArea" style="${cfg.mode === 'custom' ? 'display:block;' : 'display:none;'}background:#f8faf8;padding:10px;border-radius:8px;border:1px solid #ddd;margin-top:8px;">
            <div class="form-group" style="margin-bottom:6px;">
                <label style="font-size:12px;">设定自己身处的国家 / 地区：</label>
                <input type="text" id="customCountryInput" value="${escapeHtml(cfg.customCountry || '中国 (东八区)')}" placeholder="如：美国洛杉矶 / 英国伦敦 / 中国北京">
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:12px;">设定固定时刻描述 (选填)：</label>
                <input type="text" id="customTimeStrInput" value="${escapeHtml(cfg.customTimeStr || '')}" placeholder="如：早晨 08:30 / 凌晨 02:00">
            </div>
        </div>

        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnSaveClockSettings">💾 保存时区设置</button>
        </div>
    `);

    document.querySelectorAll('input[name="clockModeRadio"]').forEach(r => {
        r.onchange = () => {
            document.getElementById('customClockInputsArea').style.display = (r.value === 'custom') ? 'block' : 'none';
        };
    });

    document.getElementById('btnSaveClockSettings').onclick = () => {
        const mode = document.querySelector('input[name="clockModeRadio"]:checked').value;
        const country = document.getElementById('customCountryInput').value.trim() || '中国 (东八区)';
        const timeStr = document.getElementById('customTimeStrInput').value.trim();

        window.G.clockConfig = {
            mode,
            customCountry: country,
            customTimeStr: timeStr
        };

        showToast('✅ 时钟时区设置已更新！', 'success', 1500);
        closeModal();
        autoSaveGame();
    };
}
window.openClockSettingsModal = openClockSettingsModal;

// ============================================================
// 3. 账号体系与拉黑逻辑（统一直接读写 window.G，彻底解决状态不一致）
// ============================================================
if (!window.G.currentAccountId) window.G.currentAccountId = 'main';
if (!window.G.altAccounts) window.G.altAccounts = [];
if (!window.G.blockedRecords) window.G.blockedRecords = [];

function isAccountBlockedByNpc(npcId, accId = null) {
    const G = window.G;
    const curAcc = accId || (G.currentAccountId || 'main');
    const token = `${npcId}_${curAcc}`;
    if (curAcc === 'main' && Array.isArray(G.blockedNpcs) && G.blockedNpcs.includes(npcId)) {
        return true;
    }
    return (G.blockedRecords || []).includes(token);
}

function setNpcBlockAccount(npcId, accId, block = true) {
    const G = window.G;
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
    const G = window.G;
    const curId = String(G.currentAccountId || 'main');
    if (curId === 'main') {
        return {
            id: 'main',
            isAlt: false,
            name: G.player?.ytName || '主播大号',
            avatar: G.player?.avatar || null,
            bio: 'YouTube 频道官方号'
        };
    }
    const found = (G.altAccounts || []).find(a => String(a.id) === curId);
    if (found) {
        return {
            id: found.id,
            isAlt: true,
            name: found.name,
            avatar: found.avatar || null,
            bio: found.bio || '私密小号'
        };
    }
    G.currentAccountId = 'main';
    return { id: 'main', isAlt: false, name: G.player?.ytName || '主播大号', avatar: G.player?.avatar, bio: '' };
}

function switchAccount(accId) {
    window.G.currentAccountId = String(accId);
    const acc = getActiveAccountInfo();
    showToast(`🔀 已切换账号为：${acc.name}`, 'info', 1800);
    renderSocialPanel();
    autoSaveGame();
}

function openAccountManagerModal() {
    const G = window.G;
    const mainAcc = { name: G.player?.ytName || '主播大号', id: 'main' };
    const currentId = G.currentAccountId || 'main';

    let altsHtml = '';
    (G.altAccounts || []).forEach(alt => {
        const isCurrentThisAlt = (currentId === alt.id);
        altsHtml += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f8faf8;border-radius:8px;margin-bottom:6px;border:1px solid #e2ece2;">
            <div style="display:flex;align-items:center;gap:8px;">
                <div style="font-size:20px;">${alt.avatar ? `<img src="${alt.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : '🎭'}</div>
                <div>
                    <div style="font-weight:700;font-size:13px;">${escapeHtml(alt.name)} <span style="font-size:10px;color:#2e7d32;background:#e8f5e9;padding:1px 4px;border-radius:4px;">小号</span></div>
                    <div style="font-size:10px;color:#888;">${escapeHtml(alt.bio || '无简介')}</div>
                </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
                ${isCurrentThisAlt ? '<span style="font-size:11px;color:#2e7d32;font-weight:700;padding:4px 6px;">● 使用中</span>' : `<button class="upload-btn account-switch-btn" data-account-id="${escapeHtml(String(alt.id))}" style="padding:4px 8px;font-size:11px;cursor:pointer;">使用</button>`}
                <button class="upload-btn account-delete-btn" data-account-id="${escapeHtml(String(alt.id))}" style="padding:4px 6px;font-size:11px;background:#e53935;cursor:pointer;">🗑️</button>
            </div>
        </div>`;
    });

    const isCurrentMain = (currentId === 'main');

    openModal(`
        <h3>🎭 账号中心与快速切换</h3>
        <p style="font-size:12px;color:#666;line-height:1.6;">每个账号拥有完全独立的私聊记录。某个小号被拉黑后，可继续注册新小号联系求情转圜！</p>
        
        <div style="margin:10px 0;border:1px solid #eee;border-radius:10px;padding:10px;background:#fff;">
            <div style="font-weight:700;font-size:13px;margin-bottom:8px;">👑 主播官方大号</div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f0f8f0;border-radius:8px;border:1px solid #d0ebd0;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="font-size:20px;">${G.player?.avatar ? `<img src="${G.player.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : '👑'}</div>
                    <div>
                        <div style="font-weight:700;font-size:13px;">${escapeHtml(mainAcc.name)} <span style="font-size:10px;color:#fff;background:var(--primary);padding:1px 6px;border-radius:4px;">大号</span></div>
                        <div style="font-size:10px;color:#666;">粉丝 ${G.player?.followers || 0} · 官方认证</div>
                    </div>
                </div>
                ${isCurrentMain ? '<span style="font-size:11px;color:#2e7d32;font-weight:700;padding:4px 6px;">● 使用中</span>' : `<button class="upload-btn account-switch-btn" data-account-id="main" style="padding:4px 8px;font-size:11px;cursor:pointer;">使用</button>`}
            </div>

            <div style="font-weight:700;font-size:13px;margin:12px 0 6px;">🎭 注册的小号列表</div>
            ${altsHtml || '<div style="font-size:12px;color:#999;padding:6px 0;">暂无小号，点击下方注册全新马甲</div>'}
        </div>

        <div class="btn-row" style="flex-direction:column;gap:8px;">
            <button class="btn-primary" id="btnRegisterNewAlt" style="width:100%;">➕ 注册新的自定义小号</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">关闭</button>
        </div>
    `);

    bindReliableTap(document.getElementById('btnRegisterNewAlt'), () => {
        closeModal();
        openCreateAltAccountModal();
    });

    document.querySelectorAll('.account-switch-btn').forEach(btn => {
        bindReliableTap(btn, () => {
            switchAccount(btn.dataset.accountId);
            openAccountManagerModal();
        });
    });
    document.querySelectorAll('.account-delete-btn').forEach(btn => {
        bindReliableTap(btn, () => deleteAltAccount(btn.dataset.accountId));
    });
}

function openCreateAltAccountModal() {
    openModal(`
        <h3>➕ 注册自定义小号</h3>
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

    bindReliableTap(document.getElementById('btnConfirmCreateAlt'), () => {
        const name = document.getElementById('altNameInput').value.trim();
        const bio = document.getElementById('altBioInput').value.trim();
        if (!name) { showToast('⚠️ 请填写小号名称', 'error'); return; }

        if (!window.G.altAccounts) window.G.altAccounts = [];
        const newAlt = {
            id: 'alt_' + Date.now(),
            name,
            bio: bio || '路人小号',
            avatar: null,
            createdAt: window.G.day || 1
        };
        window.G.altAccounts.push(newAlt);
        window.G.currentAccountId = newAlt.id;

        showToast(`🎉 小号「${name}」已登录！`, 'success', 2500);
        closeModal();
        renderSocialPanel();
        autoSaveGame();
    });
}

function deleteAltAccount(altId) {
    if (!confirm('确定要注销这个小号吗？')) return;
    window.G.altAccounts = (window.G.altAccounts || []).filter(a => a.id !== altId);
    if (window.G.currentAccountId === altId) window.G.currentAccountId = 'main';
    showToast('🗑️ 小号已注销', 'info');
    openAccountManagerModal();
    renderSocialPanel();
    autoSaveGame();
}

function getChatStorageKey(npcId, accId = null) {
    const curAccId = accId || (window.G.currentAccountId || 'main');
    return `${curAccId}_${npcId}`;
}

function getAccountChatHistory(npcId, accId = null) {
    if (!window.G.chatHistory) window.G.chatHistory = {};
    const key = getChatStorageKey(npcId, accId);
    if (!window.G.chatHistory[key]) {
        const targetAcc = accId || (window.G.currentAccountId || 'main');
        if (targetAcc === 'main' && Array.isArray(window.G.chatHistory[npcId])) {
            window.G.chatHistory[key] = window.G.chatHistory[npcId];
        } else {
            window.G.chatHistory[key] = [];
        }
    }
    return window.G.chatHistory[key];
}

function pushChatMessageSafe(npcId, msgObj, accId = null) {
    if (!msgObj._id) msgObj._id = 'cmsg_' + Date.now() + '_' + rand(1000, 9999);
    const list = getAccountChatHistory(npcId, accId);
    list.push(msgObj);
}

// ============================================================
// 4. 社交通用辅助与触屏长按判定（重构：长按与单击物理级隔离，确保点击秒开）
// ============================================================
if (!window.G.phoneNav) window.G.phoneNav = 'chats';
if (!window.G.chatActiveTab) window.G.chatActiveTab = 'direct';
if (!window.G.groups) window.G.groups = {};
if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
if (!window.G.friendRequests) window.G.friendRequests = [];
if (!window.G.groupInvites) window.G.groupInvites = [];
if (!window.G.momentsFilterNpcId) window.G.momentsFilterNpcId = null;
if (!window.G._chatShowFullHistory) window.G._chatShowFullHistory = {};
if (!window.G._behindScreenActive) window.G._behindScreenActive = {};

// Android WebView 兼容的长按/单击绑定。
// 某些 APK WebView 在 touchstart/touchend + click 混用时不会可靠地产生合成 click，
// 旧版因此出现“长按能用、轻触完全没反应”。这里在 touchend 上主动补发一次普通点击，
// 同时用 suppressNextClick 防止浏览器随后再派发 click 导致执行两次。
function bindLongPressEvent(el, onLongPress, onClick) {
    if (!el) return;
    const LONG_PRESS_MS = 480;
    const MOVE_TOLERANCE = 12;
    let pressTimer = null;
    let longPressed = false;
    let moved = false;
    let lastTouchTime = 0;
    let startX = 0, startY = 0;

    const clearTimer = () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    };

    const fireLongPress = () => {
        if (moved) return;
        longPressed = true;
        clearTimer();
        try { if (navigator && typeof navigator.vibrate === 'function') navigator.vibrate(35); } catch (_) {}
        if (typeof onLongPress === 'function') onLongPress();
    };

    // Android WebView 兼容：这里故意不调用 preventDefault，也不依赖 Pointer Events。
    // 轻触直接由 touchend 执行一次；随后系统产生的 click 仅作去重处理。
    el.addEventListener('touchstart', e => {
        longPressed = false;
        moved = false;
        const t = e.touches && e.touches[0];
        if (t) { startX = t.clientX; startY = t.clientY; }
        clearTimer();
        pressTimer = setTimeout(fireLongPress, LONG_PRESS_MS);
    }, { passive: true });

    el.addEventListener('touchmove', e => {
        const t = e.touches && e.touches[0];
        if (t && (Math.abs(t.clientX - startX) > MOVE_TOLERANCE || Math.abs(t.clientY - startY) > MOVE_TOLERANCE)) {
            moved = true;
            clearTimer();
        }
    }, { passive: true });

    el.addEventListener('touchend', () => {
        const wasLong = longPressed;
        clearTimer();
        if (!wasLong && !moved && typeof onClick === 'function') {
            lastTouchTime = Date.now();
            onClick();
        }
    }, { passive: true });

    el.addEventListener('touchcancel', () => {
        moved = true;
        clearTimer();
    }, { passive: true });

    // 非触摸环境，以及 Android WebView 产生的兼容 click。
    el.addEventListener('click', e => {
        if (Date.now() - lastTouchTime < 900 || longPressed) {
            return;
        }
        if (typeof onClick === 'function') onClick(e);
    });

    el.addEventListener('contextmenu', e => e.preventDefault());
}

function bindReliableTap(el, handler) {
    if (!el || typeof handler !== 'function') return;
    let lastTouchTime = 0;

    // 不依赖 Pointer Events；直接监听 Android 最稳定的 touchend。
    el.addEventListener('touchend', e => {
        if (e.changedTouches && e.changedTouches.length > 1) return;
        lastTouchTime = Date.now();
        handler(e);
    }, { passive: true });

    el.addEventListener('click', e => {
        if (Date.now() - lastTouchTime < 900) return;
        handler(e);
    });
}

function renderAvatarBadge(obj, size = 44) {
    const avatarUrl = (obj && obj.isPlayer) ? window.G.player?.avatar : (obj && obj.avatarUrl);
    const emoji = (obj && obj.isPlayer) ? '🧑' : ((obj && obj.avatarEmoji) || '👤');

    if (avatarUrl) {
        return `<img src="${avatarUrl}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block;">`;
    }
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#eaf2ea;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(size*0.45)}px;flex-shrink:0;">${emoji}</div>`;
}

// 💬 消息气泡长按操作
function showMessageActionSheet(msgId, targetType, targetId) {
    const list = targetType === 'single' ? getAccountChatHistory(targetId) : (window.G.groupChatHistory[targetId] || []);
    const msg = list.find(m => m._id === msgId);
    if (!msg || msg.from !== 'player') return;

    let displayPreview = msg.text;
    if (msg.sticker) displayPreview = `[表情: ${msg.sticker.desc}]`;
    else if (msg.sharedMoment) displayPreview = `[转发动态]: ${msg.sharedMoment.body || ''}`;

    openModal(`
        <h3>💬 消息操作</h3>
        <div style="background:#f4f7f4;padding:8px 12px;border-radius:8px;font-size:13px;color:#333;margin:8px 0 14px;word-break:break-word;">
            “${escapeHtml(displayPreview)}”
        </div>
        <div class="btn-row" style="flex-direction:column;gap:8px;">
            <button class="btn-primary" id="btnActionRecall" style="width:100%;background:#388e3c;">↩️ 撤 回（对方有概率看到）</button>
            ${!msg.sticker && !msg.sharedMoment ? `<button class="btn-primary" id="btnActionEdit" style="width:100%;background:#1976d2;">✏️ 编 辑（静默修改发错文字）</button>` : ''}
            <button class="btn-secondary" id="btnActionDelete" style="width:100%;color:#c62828;background:#ffebee;border-color:#ffcdd2;">🗑️ 删 除（无痕抹去）</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">取消</button>
        </div>
    `);

    document.getElementById('btnActionRecall').onclick = () => {
        closeModal();
        const origText = msg.text || (msg.sticker ? `[表情包: ${msg.sticker.desc}]` : '');
        const isSeenByNpc = Math.random() < 0.5;

        msg.from = 'action';
        msg.text = '你撤回了一条消息';
        msg._recalled = true;
        msg._originalText = origText;
        msg._seenByNpc = isSeenByNpc;
        delete msg.sticker;
        delete msg.sharedMoment;

        if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
        else renderGroupChatWindow(document.getElementById('socialTab'));

        if (isSeenByNpc) showToast('👀 提示：你撤回了一条消息，但对方好像已经看到了...', 'info', 2500);
        else showToast('↩️ 消息已撤回，对方没有看到', 'success', 2000);
        autoSaveGame();
    };

    const editBtn = document.getElementById('btnActionEdit');
    if (editBtn) {
        editBtn.onclick = () => {
            closeModal();
            openModal(`
                <h3>✏️ 编辑消息</h3>
                <p style="font-size:12px;color:#666;">修改已发送的文字（静默修改）：</p>
                <div class="form-group">
                    <textarea id="editMsgTextInput" rows="3" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;font-size:13px;">${escapeHtml(msg.text)}</textarea>
                </div>
                <div class="btn-row">
                    <button class="btn-secondary" onclick="closeModal()">取消</button>
                    <button class="btn-primary" id="confirmSaveEditMsg">💾 保存修改</button>
                </div>
            `);
            document.getElementById('confirmSaveEditMsg').onclick = () => {
                const newT = document.getElementById('editMsgTextInput').value.trim();
                if (!newT) { showToast('内容不能为空', 'error'); return; }
                msg.text = newT;
                closeModal();
                if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
                else renderGroupChatWindow(document.getElementById('socialTab'));
                showToast('✅ 消息已成功修改', 'success', 1500);
                autoSaveGame();
            };
        };
    }

    document.getElementById('btnActionDelete').onclick = () => {
        closeModal();
        const idx = list.findIndex(m => m._id === msgId);
        if (idx !== -1) list.splice(idx, 1);
        if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
        else renderGroupChatWindow(document.getElementById('socialTab'));
        showToast('🗑️ 消息已从历史中抹除', 'info', 1500);
        autoSaveGame();
    };
}
window.showMessageActionSheet = showMessageActionSheet;

// 社交主路由
function renderSocialPanel() {
    const container = (dom && dom.socialTab) || document.getElementById('socialTab');
    if (!container) return;
    if (typeof ensureNpcIntegrity === 'function') ensureNpcIntegrity();

    if (window.G.currentChatGroup) {
        renderGroupChatWindow(container);
        return;
    }
    if (window.G.currentChatNpc) {
        renderSingleChatWindow(container);
        return;
    }
    renderPhoneApp(container);
}

function renderPhoneApp(container) {
    const isMoments = (window.G.phoneNav === 'moments');
    let contentHtml = isMoments ? buildMomentsHTML() : buildChatListHTML();
    const activeAcc = getActiveAccountInfo();

    const html = `
    <div class="phone-app-wrap" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);height:82vh;max-height:850px;display:flex;flex-direction:column;">
        <div style="background:#f1f7f1;padding:6px 12px;border-bottom:1px solid #e0ebe0;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
            <div style="display:flex;align-items:center;gap:6px;">
                <span>${activeAcc.isAlt ? '🎭' : '👑'} 当前账号：<b>${escapeHtml(activeAcc.name)}</b></span>
                ${activeAcc.isAlt ? '<span style="font-size:10px;background:#ffe082;color:#795548;padding:1px 4px;border-radius:4px;font-weight:700;">小号模式</span>' : ''}
            </div>
            <div style="display:flex;gap:6px;">
                <button onclick="openClockSettingsModal()" style="border:1px solid #cce3cc;background:#fff;padding:2px 7px;border-radius:12px;font-size:11px;cursor:pointer;color:#555;">🕒 时钟设置</button>
                <button id="phoneAccountManagerBtn" style="border:1px solid #b8dbb8;background:#fff;padding:2px 7px;border-radius:12px;font-size:11px;cursor:pointer;color:#2e7d32;font-weight:700;">🔀 切号</button>
            </div>
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

    bindReliableTap(document.getElementById('phoneNavChatsBtn'), () => {
        window.G.phoneNav = 'chats';
        // 从朋友圈回到消息时，明确回到消息列表，不恢复一个旧的聊天窗口。
        window.G.currentChatNpc = null;
        window.G.currentChatGroup = null;
        renderSocialPanel();
    });
    bindReliableTap(document.getElementById('phoneNavMomentsBtn'), () => {
        window.G.phoneNav = 'moments';
        window.G.currentChatNpc = null;
        window.G.currentChatGroup = null;
        window.G.momentsFilterNpcId = null;
        renderSocialPanel();
    });

    // 顶部“切号”按钮在 Android WebView 中也不要依赖 inline onclick。
    bindReliableTap(container.querySelector('#phoneAccountManagerBtn'), openAccountManagerModal);

    if (!isMoments) {
        bindChatListEvents(container);
    } else {
        bindMomentsEvents(container);
    }
}

function buildChatListHTML() {
    const isDirect = (window.G.chatActiveTab !== 'group');
    const pendingCount = (window.G.friendRequests || []).length + (window.G.groupInvites || []).length;
    let itemsHtml = '';
    const currentAcc = getActiveAccountInfo();

    if (isDirect) {
        const npcList = Object.entries(window.G.npcs || {});
        if (!npcList.length) {
            itemsHtml += `
            <div style="text-align:center;color:#888;padding:45px 16px;font-size:13px;line-height:1.7;">
                <div style="font-size:36px;margin-bottom:8px;">📬</div>
                <b>通讯录空空如也</b><br>
                新人主播需要通过<b>录制视频</b>、<b>联机开播</b>积累粉丝热度。<br>
                随着你的频道声名鹊起，各路MC大主播与热情粉丝会主动递来好友申请！<br>
                <div style="margin-top:10px;">
                    <button class="upload-btn" onclick="openAddChatTargetModal()" style="padding:6px 14px;font-size:12px;">查看待处理好友申请 (${(window.G.friendRequests||[]).length})</button>
                </div>
            </div>`;
        } else {
            for (const [id, npc] of npcList) {
                const chatHist = getAccountChatHistory(id);
                const lastMsg = chatHist.length > 0 ? chatHist[chatHist.length - 1] : null;
                let purePreview = '新添加好友，快来打个招呼吧';
                if (lastMsg) {
                    if (lastMsg.sticker) purePreview = `[表情: ${lastMsg.sticker.desc}]`;
                    else if (lastMsg.sharedMoment) purePreview = `[转发动态]: ${lastMsg.sharedMoment.body || ''}`;
                    else purePreview = stripThought(lastMsg.text || '');
                } else if (npc.memorySummary) {
                    purePreview = `[记忆: ${stripThought(npc.memorySummary).slice(0, 15)}...]`;
                }

                const time = lastMsg ? (lastMsg.time || '') : '';
                const isLover = (window.G.player?.lovers || []).includes(npc.name);
                const isBlocked = isAccountBlockedByNpc(id, currentAcc.id);

                itemsHtml += `
                <div class="chat-item" data-id="${id}" style="display:flex;align-items:center;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:#fff;border:1px solid #f0f4f0;position:relative;">
                    <div class="chat-item-avatar-wrap" style="margin-right:12px;flex-shrink:0;">${renderAvatarBadge(npc, 44)}</div>
                    <div class="chat-item-text-wrap" style="flex:1;min-width:0;">
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
        const groupKeys = Object.keys(window.G.groups || {});
        if (!groupKeys.length) {
            itemsHtml += `
            <div style="text-align:center;color:#aaa;padding:40px 16px;font-size:13px;line-height:1.6;">
                暂无群聊。<br>
                粉丝增长后会收到后援粉丝群邀请，也可以自建专属群聊！
            </div>`;
        } else {
            for (const [gid, grp] of Object.entries(window.G.groups)) {
                const msgs = window.G.groupChatHistory[gid] || [];
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
            ${pendingCount > 0 ? `<span style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;background:#ff4757;border:2px solid #fff;border-radius:50%;display:block;pointer-events:none;"></span>` : ''}
        </div>
    </div>
    <div style="font-size:11px;color:#888;padding:6px 16px;background:#fcfdfc;border-bottom:1px dashed #eee;">
        💡 提示：轻触角色直接进入私聊；长按角色或头像可编辑TA的人设与资料
    </div>
    <div class="chat-list" style="flex:1;overflow-y:auto;padding:8px;">
        ${itemsHtml}
    </div>`;
}

function bindChatListEvents(container) {
    const btnDirect = document.getElementById('tabDirectBtn');
    const btnGroup = document.getElementById('tabGroupBtn');
    const addBtn = document.getElementById('addChatTargetBtn');

    bindReliableTap(btnDirect, () => {
        window.G.currentChatNpc = null;
        window.G.currentChatGroup = null;
        window.G.chatActiveTab = 'direct';
        renderSocialPanel();
    });
    bindReliableTap(btnGroup, () => {
        window.G.currentChatNpc = null;
        window.G.currentChatGroup = null;
        window.G.chatActiveTab = 'group';
        renderSocialPanel();
    });
    bindReliableTap(addBtn, openAddChatTargetModal);

    // 🌟 核心：为每个私聊联系人绑定清晰的“单击开聊”与“长按编辑人设”
    container.querySelectorAll('.chat-item').forEach(el => {
        const id = el.dataset.id;
        bindLongPressEvent(
            el,
            () => openEditNpcModal(id),
            () => openChat(id)
        );
    });

    container.querySelectorAll('.group-item').forEach(el => {
        const gid = el.dataset.gid;
        bindLongPressEvent(
            el,
            () => openGroupSettingsModal(gid),
            () => openGroupChat(gid)
        );
    });
}

// ============================================================
// 5. 朋友圈生态系统
// ============================================================
function buildMomentsHTML() {
    let feedItems = [...(window.G.feed || [])].reverse();
    let filterTitle = '🌟 动态朋友圈';

    if (window.G.momentsFilterNpcId) {
        const targetNpc = window.G.npcs[window.G.momentsFilterNpcId];
        const targetName = targetNpc ? targetNpc.name : window.G.momentsFilterNpcId;
        feedItems = feedItems.filter(f => f.npcId === window.G.momentsFilterNpcId || f.author === targetName);
        filterTitle = `🌟 ${escapeHtml(targetName)} 的朋友圈`;
    }

    let listHtml = '';
    if (!feedItems.length) {
        listHtml = `<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">暂无动态，点击右上角「✨ 刷新动态」或「📷 发动态」吧！</div>`;
    } else {
        for (const item of feedItems) {
            const isLiked = item.liked ? '❤️ 已赞' : '🤍 赞';
            const activeMomentAccount = getActiveAccountInfo();
            const isSelfPost = item.isPlayer === true || item.accountId === activeMomentAccount.id || item.author === activeMomentAccount.name || item.author === window.G.player?.ytName || (window.G.altAccounts || []).some(a => a.name === item.author);
            const displayAvatar = isSelfPost && item.avatar ? `<img src="${item.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : (item.avatar || '👤');

            let mediaHtml = '';
            if (item.image) {
                mediaHtml = `<div style="margin:8px 0;"><img src="${item.image}" style="max-width:200px;max-height:200px;border-radius:8px;object-fit:cover;border:1px solid #ddd;box-shadow:0 2px 6px rgba(0,0,0,0.1);"></div>`;
            }
            if (item.imageDesc) {
                mediaHtml += `<div style="margin:4px 0;background:#f0f4f0;padding:5px 8px;border-radius:6px;font-size:11px;color:#2e7d32;border:1px dashed #c8e6c9;">🖼️ [配图描述]: ${escapeHtml(item.imageDesc)}</div>`;
            }

            let commentsHtml = '';
            if (item.comments && item.comments.length) {
                commentsHtml = `<div style="margin-top:8px;background:#f8faf8;padding:8px 12px;border-radius:8px;font-size:12.5px;line-height:1.6;border:1px solid #edf2ed;">` +
                    item.comments.map(c => `<div style="margin-bottom:3px;"><b style="color:#2e7d32;">${escapeHtml(c.user)}</b>: <span>${escapeHtml(c.content)}</span></div>`).join('') +
                `</div>`;
            }

            listHtml += `
            <div class="moment-card" id="moment_entry_${item.id}" data-id="${item.id}" style="padding:14px;background:#fff;border-radius:10px;margin-bottom:10px;border:1px solid #eef2ee;position:relative;">
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
                    <div style="display:flex;gap:10px;">
                        <button class="moment-like-btn" data-id="${item.id}" style="border:none;background:none;cursor:pointer;color:#e53935;font-size:12px;">${isLiked} (${item.likes||0})</button>
                        <button class="moment-ai-cmt-btn" data-id="${item.id}" style="border:none;background:none;cursor:pointer;color:#1976d2;font-size:12px;font-weight:600;">💬 召唤好友互动</button>
                        <button class="moment-share-btn" data-id="${item.id}" style="border:none;background:none;cursor:pointer;color:#2e7d32;font-size:12px;font-weight:600;">↗️ 转发</button>
                    </div>
                    ${isSelfPost ? `
                    <div style="display:flex;gap:6px;">
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
        ${window.G.momentsFilterNpcId ? `<button id="clearMomentFilterBtn" style="border:1px solid #ccc;background:#fff;padding:2px 8px;border-radius:6px;font-size:11px;cursor:pointer;">查看全部</button>` : ''}
    </div>
    <div style="flex:1;overflow-y:auto;padding:10px;background:#f4f6f4;" id="momentsScrollContainer">
        ${listHtml}
    </div>`;
}

function bindMomentsEvents(container) {
    document.getElementById('clearMomentFilterBtn') && bindReliableTap(document.getElementById('clearMomentFilterBtn'), () => {
        window.G.momentsFilterNpcId = null;
        renderSocialPanel();
    });

    document.getElementById('btnCreateUserPost') && bindReliableTap(document.getElementById('btnCreateUserPost'), openCreateMomentPostModal);
    document.getElementById('btnAiRefreshFeed') && bindReliableTap(document.getElementById('btnAiRefreshFeed'), triggerGenerateFriendsFeed);

    container.querySelectorAll('.moment-avatar-click').forEach(el => {
        bindReliableTap(el, () => {
            const nid = el.dataset.npcid;
            if (nid && window.G.npcs[nid]) {
                window.G.momentsFilterNpcId = nid;
                renderSocialPanel();
            }
        });
    });

    container.querySelectorAll('.moment-like-btn').forEach(btn => {
        bindReliableTap(btn, () => {
            const id = parseInt(btn.dataset.id);
            const item = (window.G.feed || []).find(f => f.id === id);
            if (!item) return;
            item.liked = !item.liked;
            item.likes = (item.likes || 0) + (item.liked ? 1 : -1);
            renderSocialPanel();
            autoSaveGame();
        });
    });

    container.querySelectorAll('.moment-ai-cmt-btn').forEach(btn => {
        bindReliableTap(btn, async () => {
            const id = parseInt(btn.dataset.id);
            await triggerAiCommentForMoment(id);
        });
    });

    container.querySelectorAll('.moment-share-btn').forEach(btn => {
        bindReliableTap(btn, () => {
            const id = parseInt(btn.dataset.id);
            openShareMomentTargetModal(id);
        });
    });

    container.querySelectorAll('.moment-op-btn').forEach(btn => {
        bindReliableTap(btn, () => {
            const act = btn.dataset.act;
            const id = parseInt(btn.dataset.id);
            const itemIdx = (window.G.feed || []).findIndex(f => f.id === id);
            if (itemIdx === -1) return;
            const item = window.G.feed[itemIdx];

            if (act === 'del') {
                if (confirm('确定删除这条动态吗？')) {
                    window.G.feed.splice(itemIdx, 1);
                    showToast('🗑️ 动态已删除', 'info', 1200);
                    renderSocialPanel();
                    autoSaveGame();
                }
            } else if (act === 'recall') {
                const isSeen = Math.random() < 0.5;
                window.G.feed.splice(itemIdx, 1);
                if (isSeen) {
                    showToast('👀 你撤回了动态，但有好友在你撤回前正好看到了！', 'info', 3000);
                    addGlobalMemoryRecord(`【朋友圈动态撤回】：主角发布了关于“${item.body.slice(0, 20)}”的动态后又快速撤回，被部分好友看到。`);
                } else {
                    showToast('↩️ 动态已悄悄撤回，没人发现', 'success', 2000);
                }
                renderSocialPanel();
                autoSaveGame();
            } else if (act === 'edit') {
                openEditMomentModal(item);
            }
        });
    });
}

function openShareMomentTargetModal(momentId) {
    const item = (window.G.feed || []).find(f => f.id === momentId);
    if (!item) return;

    const npcs = Object.values(window.G.npcs || {});
    if (!npcs.length) {
        showToast('暂无好友可以转发', 'error');
        return;
    }

    let npcItems = npcs.map(n => `
        <div class="share-target-item" data-id="${n.id}" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:8px;background:#f9faf9;border:1px solid #eef2ee;margin-bottom:6px;cursor:pointer;">
            <div style="display:flex;align-items:center;gap:8px;">
                ${renderAvatarBadge(n, 32)}
                <span style="font-weight:700;font-size:13px;">${escapeHtml(n.name)}</span>
            </div>
            <button class="upload-btn" style="padding:3px 10px;font-size:11px;pointer-events:none;">发送</button>
        </div>
    `).join('');

    openModal(`
        <h3>↗️ 转发动态给好友</h3>
        <div style="font-size:12px;color:#666;background:#f0f4f0;padding:6px 10px;border-radius:6px;margin:8px 0;">
            <b>动态内容：</b>${escapeHtml(item.body.slice(0, 36))}...
        </div>
        <div style="max-height:220px;overflow-y:auto;margin:10px 0;">
            ${npcItems}
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">取消</button>
        </div>
    `);

    document.querySelectorAll('.share-target-item').forEach(el => {
        el.onclick = () => {
            const targetNpcId = el.dataset.id;
            const curAcc = getActiveAccountInfo();
            const targetNpc = window.G.npcs[targetNpcId];

            pushChatMessageSafe(targetNpcId, {
                from: 'player',
                senderAccount: curAcc.name,
                sharedMoment: {
                    id: item.id,
                    author: item.author,
                    body: item.body,
                    image: item.image || null
                },
                text: `[转发动态]: ${item.body.slice(0, 40)}`,
                time: new Date().toLocaleTimeString().slice(0, 5)
            });

            if (targetNpc) {
                targetNpc.memorySummary = (targetNpc.memorySummary || '') + `\n【好友私信互动】：主角转发了朋友圈动态“${item.body.slice(0, 20)}”给你，你可以此话题展开互动。`;
            }

            closeModal();
            showToast(`✅ 已将动态转发给 ${targetNpc ? targetNpc.name : '好友'}！`, 'success', 2000);
            openChat(targetNpcId);
            autoSaveGame();
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
            <label>配图形式选择 (竖排单选)</label>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px;background:#f8faf8;padding:8px 10px;border-radius:8px;border:1px solid #e5ebe5;">
                <label style="font-size:12.5px;display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="radio" name="postImgType" value="real" checked>
                    <span>1. 🖼️ 上传真实相册图片 (Gemini 等多模态 AI 识图)</span>
                </label>
                <label style="font-size:12.5px;display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="radio" name="postImgType" value="desc">
                    <span>2. 📝 仅文字描述图片 (极省 Token，无多模态可用)</span>
                </label>
                <label style="font-size:12.5px;display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="radio" name="postImgType" value="both">
                    <span>3. 🎨 真实相册图片 + 文字描述并存 (发照片展示，同时喂文字给无识图AI)</span>
                </label>
            </div>

            <div id="postImgRealArea" style="margin-top:8px;">
                <input type="file" id="postRealFileInput" accept="image/*" style="font-size:12px;">
                <div id="postImgPreview" style="margin-top:6px;"></div>
            </div>

            <div id="postImgDescArea" style="display:none;margin-top:8px;">
                <input type="text" id="postImgDescInput" placeholder="描绘图片内容，如：Verity西装黄色笑脸立绘截图">
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
            const v = r.value;
            const needReal = v === 'real' || v === 'both';
            const needDesc = v === 'desc' || v === 'both';
            document.getElementById('postImgRealArea').style.display = needReal ? 'block' : 'none';
            document.getElementById('postImgDescArea').style.display = needDesc ? 'block' : 'none';
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

        if (!window.G.feed) window.G.feed = [];
        window.G.feedIdCounter = (window.G.feedIdCounter || 0) + 1;

        const hasReal = imgType === 'real' || imgType === 'both';
        const hasDesc = imgType === 'desc' || imgType === 'both';

        const newPost = {
            id: Date.now(),
            author: curAcc.name,
            isPlayer: true,
            accountId: curAcc.id,
            avatar: curAcc.avatar,
            title: title,
            body: body,
            image: hasReal ? uploadedBase64 : null,
            imageDesc: hasDesc ? imgDesc : null,
            likes: 0,
            liked: false,
            comments: [],
            time: new Date().toLocaleTimeString().slice(0, 5)
        };

        window.G.feed.push(newPost);
        addGlobalMemoryRecord(`【玩家发朋友圈】：在第 ${window.G.day || 1} 天发布了动态：“${body}”${newPost.image ? '（附带了相册照片）' : ''}${newPost.imageDesc ? `（配图描述: ${newPost.imageDesc}）` : ''}`);

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
    const npcs = Object.values(window.G.npcs || {});
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

        if (!window.G.feed) window.G.feed = [];
        window.G.feed.push({
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
    const item = (window.G.feed || []).find(f => f.id === momentId);
    if (!item) return;

    const npcs = Object.values(window.G.npcs || {});
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

        const participantsDesc = selectedNpcs.map(n => `【${n.name}】(性格人设: ${n.persona}, 好感度: ${n.favor||0}/100)`).join('\n');

        const sysPrompt = `
你正在模拟 Minecraft 主播朋友圈动态下的真实多好友互动评论区。
${tzContext}

【动态发布者】：${item.author}
【动态文字内容】：“${item.body}” ${imgDescContext}
${existingCommentsText}

【本次参与互动的具体好友】：
${participantsDesc}

【核心演绎与好感度严谨规范（纯乙女守护与多模态视觉聚焦）】：
1. 好感度严格约束（杜绝不合逻辑的自来熟）：
   - 好感度 0~19：双方关系完全生疏！必须体现出距离感、冷淡、矜持或主播前辈的审视态度，绝不允许说“想我了”、“联机别迟到”等熟人自恋调侃！
   - 好感度 20~39：客套礼貌的同行朋友。
   - 好感度 40~59：熟络伙伴，方可自然打趣。
2. 视觉识图重点（若有配图）：
   - 必须凝视图片或其描述，看清细节、人物特征、配饰文字（如西装、面具、日文立绘等），结合画面针对性调侃，严禁只回抽象字眼！
3. 楼中楼接梗与互怼争吵（纯乙女安全合规）：
   - 后发言的好友接前一位好友的话展开吐槽争辩，绝不允许攻略角色搞同性恋爱！

【输出格式要求（每行一条，必须按此格式）】：
[COMMENT name=角色名字]评论正文（40字以内）[/COMMENT]
`;

        let userContent = null;
        if (hasRealImage) {
            userContent = [
                { type: 'text', text: `请好友们针对玩家发布的动态及图片发表评论：` },
                { type: 'image_url', image_url: { url: item.image } }
            ];
        } else {
            userContent = `请好友们针对玩家发布的动态发表评论：`;
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
            item.comments.push({ user: fallbackNpc.name, content: cleanBody.slice(0, 50) || '看到了你的动态。' });
            addedCount++;
        }

        renderSocialPanel();
        autoSaveGame();
        showToast(`💬 好友已在动态下留下评论！`, 'success', 2500);

    } catch(e) {
        console.error('朋友圈评论生成失败', e);
        showToast('❌ 互动生成失败：' + e.message, 'error');
    }
}

// ============================================================
// 6. 表情包抽屉与导入管理
// ============================================================
let _stickerDrawerOpen = false;

function buildStickerDrawerHTML() {
    const cats = window.G.stickerCategories || ['猪猪', '默认'];
    const activeCat = window.G.activeStickerCategory || cats[0];
    const stickers = (window.G.stickerLibrary || []).filter(s => s.category === activeCat);

    let tabsHtml = cats.map(c => `
        <button class="stk-tab-btn ${c === activeCat ? 'active' : ''}" data-cat="${escapeHtml(c)}" style="padding:4px 9px;font-size:11px;font-weight:700;border:1px solid ${c === activeCat ? 'var(--primary)' : '#ccc'};border-radius:6px;background:${c === activeCat ? '#eaf5ea' : '#fff'};color:${c === activeCat ? 'var(--primary)' : '#555'};cursor:pointer;white-space:nowrap;">
            ${escapeHtml(c)}
        </button>
    `).join('');

    let gridHtml = `
        <div class="stk-item-card" id="btnAddStickerTrigger" style="height:62px;border:1.5px dashed #aaa;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;background:#fafafa;">
            <span style="font-size:20px;color:#888;">➕</span>
            <span style="font-size:9.5px;color:#888;margin-top:2px;">添加</span>
        </div>
    `;

    stickers.forEach((stk) => {
        gridHtml += `
        <div class="stk-item-card stk-send-btn" data-url="${escapeHtml(stk.url)}" data-desc="${escapeHtml(stk.desc)}" style="height:62px;border:1px solid #e0e0e0;border-radius:6px;padding:2px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;cursor:pointer;background:#fff;overflow:hidden;" title="${escapeHtml(stk.desc)}">
            <img src="${stk.url}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">
        </div>
        `;
    });

    return `
    <div id="stickerDrawerContainer" style="background:#f4f6f4;border-top:1px solid #ddd;padding:6px 8px;height:165px;display:flex;flex-direction:column;box-sizing:border-box;">
        <div style="display:flex;align-items:center;gap:5px;overflow-x:auto;padding-bottom:5px;border-bottom:1px solid #e2e8e2;">
            ${tabsHtml}
            <button id="btnNewStickerCategory" title="新建分组" style="border:1px solid #bbb;background:#fff;padding:3px 7px;border-radius:6px;font-size:10.5px;cursor:pointer;white-space:nowrap;">✏️ 新分类</button>
        </div>
        <div style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(52px, 1fr));gap:6px;padding-top:6px;">
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
            window.G.activeStickerCategory = btn.dataset.cat;
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
        if (!window.G.stickerCategories.includes(val)) window.G.stickerCategories.push(val);
        window.G.activeStickerCategory = val;
        closeModal();
        if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
        else renderGroupChatWindow(document.getElementById('socialTab'));
        autoSaveGame();
    };
}

function openImportStickersModal(targetType, targetId) {
    const curCat = window.G.activeStickerCategory || '猪猪';
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

        if (!window.G.stickerLibrary) window.G.stickerLibrary = [];

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
                window.G.stickerLibrary.push({
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
            showToast('⚠️ 未识别到有效链接', 'error', 2500);
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
        if (!window.G.groupChatHistory[targetId]) window.G.groupChatHistory[targetId] = [];
        window.G.groupChatHistory[targetId].push(msg);
        renderGroupChatWindow(document.getElementById('socialTab'));
    }
    autoSaveGame();
}

// ============================================================
// 7. 加号互动菜单与共创视频
// ============================================================
function openChatActionMenuModal(targetType, targetId) {
    const isGroup = targetType === 'group';
    const title = isGroup ? '👥 群聊互动与共创' : `🤝 与 ${escapeHtml(window.G.npcs[targetId]?.name || '好友')} 的互动`;

    openModal(`
        <h3>${title}</h3>
        <p style="font-size:12px;color:#666;line-height:1.5;">选择与对方展开的合作形式：</p>
        <div class="btn-row" style="flex-direction:column;gap:8px;margin-top:10px;">
            <button class="btn-primary" id="actCollabVideoBtn" style="width:100%;background:#e53935;">🎬 邀请拍摄油管共创视频</button>
            <button class="btn-primary" id="actCollabStreamBtn" style="width:100%;background:#388e3c;">🔴 邀请连麦联机开播</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">取消</button>
        </div>
    `);

    document.getElementById('actCollabVideoBtn').onclick = () => {
        closeModal();
        openCollabVideoPublishModal(targetType, targetId);
    };

    document.getElementById('actCollabStreamBtn').onclick = () => {
        closeModal();
        handleInviteCollabStream(targetType, targetId);
    };
}
window.openChatActionMenuModal = openChatActionMenuModal;

function openCollabVideoPublishModal(targetType, targetId) {
    const isGroup = targetType === 'group';
    let participants = [];

    if (isGroup) {
        const grp = window.G.groups[targetId];
        participants = (grp.members || []).map(mid => window.G.npcs[mid]).filter(Boolean);
    } else {
        const npc = window.G.npcs[targetId];
        if (npc) participants.push(npc);
    }

    const partnerCheckboxes = participants.map((p) => `
        <label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;background:#f4f6f4;padding:4px 8px;border-radius:12px;margin:2px;">
            <input type="checkbox" class="collab-partner-check" value="${p.id}" checked>
            <span>${p.avatarEmoji || '👤'} ${escapeHtml(p.name)}</span>
        </label>
    `).join('');

    openModal(`
        <h3>🎬 发起共创视频拍摄</h3>
        <div style="font-size:12px;color:#666;margin-bottom:8px;">
            共创搭档：<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${partnerCheckboxes}</div>
        </div>
        <div class="form-group">
            <label>视频标题 <span class="required">*</span></label>
            <input type="text" id="collabVideoTitle" placeholder="起一个吸睛的爆款标题...">
        </div>
        <div class="form-group">
            <label>剪辑灵感 (简短点子)</label>
            <div style="display:flex;gap:6px;">
                <input type="text" id="collabVideoIdea" placeholder="如：下界连环整蛊陷阱、双人速通抢龙、红石机关大整蛊..." style="flex:1;">
                <button type="button" class="btn-secondary small" id="btnAiDraftVideo">🤖 AI生成</button>
            </div>
        </div>
        <div class="form-group">
            <label>视频脚本剧情 / 简介 <span class="required">*</span></label>
            <textarea id="collabVideoSummary" rows="3" placeholder="描述这期视频的核心高光击杀、互坑搞笑反转等..."></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnPublishCollabVideo">🚀 发布共创视频</button>
        </div>
    `);

    document.getElementById('btnAiDraftVideo').onclick = async () => {
        const idea = document.getElementById('collabVideoIdea').value.trim();
        const checkedBoxes = document.querySelectorAll('.collab-partner-check:checked');
        const partnerNames = Array.from(checkedBoxes).map(cb => window.G.npcs[cb.value]?.name).filter(Boolean);
        const partnerNamesStr = partnerNames.join('、') || '好友';

        showToast('🤖 AI 正在构思标题与高光...', 'info', 1500);
        try {
            const sys = `你是一名顶级 YouTube 游戏主播。玩家「${window.G.player?.ytName || '主角'}」正与搭档「${partnerNamesStr}」共同录制一期 Minecraft 合作视频。灵感为：${idea || '趣味竞技与互坑挑战'}。请生成吸睛标题与80字以内精彩高光简介。
[TITLE]标题[/TITLE]
[CONTENT]高光简介[/CONTENT]`;
            const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '请编写共创视频设定。' }], { maxTokens: 300, temperature: 0.9 });
            const tMatch = raw.match(/\[TITLE\]([\s\S]*?)\[\/TITLE\]/);
            const cMatch = raw.match(/\[CONTENT\]([\s\S]*?)\[\/CONTENT\]/);
            if (tMatch) document.getElementById('collabVideoTitle').value = tMatch[1].trim();
            if (cMatch) document.getElementById('collabVideoSummary').value = cMatch[1].trim();
            showToast('✅ 视频文案已生成！', 'success', 1200);
        } catch(e) {
            showToast('❌ AI 生成失败，请手动填写', 'error');
        }
    };

    document.getElementById('btnPublishCollabVideo').onclick = async () => {
        const title = document.getElementById('collabVideoTitle').value.trim();
        const summary = document.getElementById('collabVideoSummary').value.trim();
        const checkedBoxes = document.querySelectorAll('.collab-partner-check:checked');
        const partnerIds = Array.from(checkedBoxes).map(cb => cb.value);

        if (!title) { showToast('⚠️ 请输入视频标题', 'error'); return; }
        if (!summary) { showToast('⚠️ 请填写视频剧情高光', 'error'); return; }
        if (!partnerIds.length) { showToast('⚠️ 至少需要勾选一位搭档', 'error'); return; }

        if (window.G.actionPoints < 2) { showToast('⚠️ 行动点不足，需要 2 点行动点', 'error'); return; }
        window.G.actionPoints -= 2;

        const partnerNames = partnerIds.map(id => window.G.npcs[id]?.name).filter(Boolean);
        const fullTitle = `【共创】${title} (ft. ${partnerNames.join(' & ')})`;

        const videoObj = {
            title: fullTitle,
            desc: summary,
            isCollab: true,
            partners: partnerNames,
            views: rand(800, 3500) + partnerNames.length * 500,
            likes: rand(100, 800) + partnerNames.length * 80,
            day: window.G.day || 1,
            comments: []
        };

        if (!window.G.player.videos) window.G.player.videos = [];
        window.G.player.videos.push(videoObj);

        partnerIds.forEach(id => {
            const n = window.G.npcs[id];
            if (n) {
                n.favor = Math.min(100, (n.favor || 0) + rand(3, 7));
                n.memorySummary = (n.memorySummary || '') + `\n【合作拍摄】：与主角合拍了视频《${fullTitle}》，反响热烈。`;
            }
        });

        window.G.player.followers += rand(250, 900) + partnerNames.length * 150;
        window.G.player.money += rand(60, 180);

        closeModal();
        appendStory(`🎬 你与 ${partnerNames.join('、')} 联合拍摄发布了爆款共创视频《${fullTitle}》！好感度与播放量大涨！`, '🤜 合作共创');
        addGlobalMemoryRecord(`【共创发布】：主角与 ${partnerNames.join('、')} 合作发布了油管共创视频《${fullTitle}》。`);

        showToast(`🎉 共创视频发布成功！`, 'success', 2500);
        advanceTimeSlot();
        updateUI();
        autoSaveGame();
        renderSocialPanel();
    };
}

function handleInviteCollabStream(targetType, targetId) {
    const isGroup = targetType === 'group';
    let partnerNames = [];
    if (isGroup) {
        partnerNames = (window.G.groups[targetId]?.members || []).map(mid => window.G.npcs[mid]?.name).filter(Boolean);
    } else {
        const npc = window.G.npcs[targetId];
        if (npc) partnerNames.push(npc.name);
    }

    if (!partnerNames.length) { showToast('找不到联动搭档', 'error'); return; }

    window.G.pendingCollabPartners = partnerNames;
    showToast(`📺 已向 ${partnerNames.join('、')} 发出连麦邀请！切换至直播面板开启`, 'success', 2500);
    switchTab('stream');
}

// ============================================================
// 8. 私聊窗口与「屏幕那边的TA」动作感知（长按头像编辑人设）
// ============================================================
function jumpToMomentCard(momentId) {
    window.G.currentChatNpc = null;
    window.G.phoneNav = 'moments';
    window.G.momentsFilterNpcId = null;
    renderSocialPanel();

    setTimeout(() => {
        const card = document.getElementById(`moment_entry_${momentId}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.transition = 'box-shadow 0.3s ease';
            card.style.boxShadow = '0 0 0 3px var(--primary)';
            setTimeout(() => { card.style.boxShadow = 'none'; }, 2000);
        }
    }, 150);
}
window.jumpToMomentCard = jumpToMomentCard;

function renderSingleChatWindow(container) {
    const npcId = window.G.currentChatNpc;
    const npc = window.G.npcs[npcId];
    if (!npc) { closeChat(); return; }

    const activeAcc = getActiveAccountInfo();
    const isBlocked = isAccountBlockedByNpc(npcId, activeAcc.id);
    const chatHist = getAccountChatHistory(npcId);

    const sessionKey = getChatStorageKey(npcId);
    const showAll = !!window.G._chatShowFullHistory[sessionKey];
    const FOLD_LIMIT = 15;
    const hasMore = chatHist.length > FOLD_LIMIT && !showAll;
    const displayList = hasMore ? chatHist.slice(chatHist.length - FOLD_LIMIT) : chatHist;
    const isBehindScreenActive = !!window.G._behindScreenActive[npcId];

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
            messagesHtml += `
            <div style="margin:10px 14px;background:rgba(255,253,245,0.92);border:1px dashed #d7ccc8;border-radius:10px;padding:8px 12px;font-size:12px;color:#5d4037;line-height:1.6;box-shadow:0 1px 4px rgba(0,0,0,0.04);position:relative;">
                <div style="font-weight:700;font-size:11px;color:#8d6e63;margin-bottom:3px;display:flex;align-items:center;gap:4px;">
                    <span>👁️ 屏幕那边的 TA (${escapeHtml(npc.name)})</span>
                </div>
                <div>${escapeHtml(msg.text)}</div>
            </div>`;
        } else {
            const isSelf = msg.from === 'player';
            let bubbleContent = '';

            if (msg.sticker) {
                bubbleContent = `
                <div style="padding:0;display:inline-block;">
                    <img src="${msg.sticker.url}" alt="${escapeHtml(msg.sticker.desc)}" style="width:85px;height:85px;border-radius:8px;object-fit:cover;display:block;">
                </div>`;
            } else if (msg.sharedMoment) {
                const sm = msg.sharedMoment;
                bubbleContent = `
                <div onclick="jumpToMomentCard(${sm.id})" style="cursor:pointer;background:#fff;border-radius:8px;padding:8px;border:1px solid #e0e0e0;max-width:210px;">
                    <div style="font-weight:700;font-size:11px;color:#2e7d32;margin-bottom:3px;">🌟 朋友圈动态 · ${escapeHtml(sm.author)}</div>
                    <div style="font-size:12px;color:#333;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escapeHtml(sm.body)}</div>
                    ${sm.image ? `<img src="${sm.image}" style="width:100%;height:65px;object-fit:cover;border-radius:4px;margin-top:4px;">` : ''}
                    <div style="font-size:10px;color:#999;text-align:right;margin-top:4px;">点击查看完整动态 ❯</div>
                </div>`;
            } else {
                bubbleContent = isSelf ? escapeHtml(msg.text).replace(/\n/g, '<br>') : renderContentWithThoughts(msg.text);
            }

            messagesHtml += `
            <div class="chat-msg-row" data-msgid="${msg._id || ''}" data-from="${msg.from}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:10px;align-items:flex-start;">
                ${!isSelf ? `<div class="chat-npc-avatar-btn" data-npcid="${npcId}" style="margin-right:8px;flex-shrink:0;cursor:pointer;" title="单击看名片，长按编辑人设与资料">${renderAvatarBadge(npc, 34)}</div>` : ''}
                <div style="max-width:75%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                    ${isSelf && msg.senderAccount ? `<div style="font-size:10px;color:#888;margin-bottom:2px;">${escapeHtml(msg.senderAccount)}</div>` : ''}
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? ((msg.sticker || msg.sharedMoment) ? 'transparent' : '#95ec69') : ((msg.sticker || msg.sharedMoment) ? 'transparent' : '#fff')};color:#111;padding:${(msg.sticker || msg.sharedMoment) ? '0' : '8px 12px'};border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:${(msg.sticker || msg.sharedMoment) ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'};font-size:14px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;cursor:pointer;">
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
        <!-- 紧凑单行顶栏 -->
        <div style="padding:8px 12px;background:#fff;border-bottom:1px solid #e5ebe5;display:flex;justify-content:space-between;align-items:center;min-height:48px;box-sizing:border-box;">
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                <button onclick="closeChat()" style="border:none;background:none;font-size:19px;color:#333;cursor:pointer;padding:0 2px;">❮</button>
                <div id="singleChatHeaderProfileBtn" style="cursor:pointer;flex:1;min-width:0;" title="单击看名片，长按编辑TA的人设">
                    <div style="font-weight:700;font-size:14.5px;display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        <span style="overflow:hidden;text-overflow:ellipsis;">${escapeHtml(npc.name)}</span>
                        <span style="font-size:10.5px;color:#e53935;font-weight:normal;background:#ffebee;padding:1px 5px;border-radius:6px;flex-shrink:0;">❤️ ${npc.favor || 0}</span>
                    </div>
                    <div id="chatOnlineStatusText" style="font-size:10.5px;color:#2e7d32;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${isBlocked ? '<span style="color:#d32f2f;">⚠️ 已拉黑</span>' : '● 在线'} ${npc.memorySummary ? '· 🧠记忆' : ''}
                    </div>
                </div>
            </div>

            <!-- 右侧紧凑小图标区 -->
            <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                <button id="btnToggleBehindScreen" style="border:1px solid ${isBehindScreenActive ? '#8d6e63' : '#ccc'};background:${isBehindScreenActive ? '#efebe9' : '#fff'};width:30px;height:30px;border-radius:50%;font-size:15px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s ease;" title="${isBehindScreenActive ? '已开启屏幕那边的动作感知(点击关闭)' : '点击开启屏幕那边的动作感知'}">
                    👁️
                </button>
                <div id="singleChatHeaderAccountBtn" title="当前账号：${escapeHtml(activeAcc.name)} (点击切换)" style="cursor:pointer;display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;border:1.5px solid ${activeAcc.isAlt ? '#ffb300' : 'var(--primary)'};overflow:hidden;background:#fff;">
                    ${activeAcc.avatar ? `<img src="${activeAcc.avatar}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-size:14px;">${activeAcc.isAlt ? '🎭' : '👑'}</span>`}
                </div>
                <button id="triggerAIReplyBtn" title="让TA回复或主动发消息" style="border:none;background:#ff4757;color:#fff;width:32px;height:32px;border-radius:8px;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        ${isBlocked ? `
        <div style="background:#ffebee;color:#c62828;padding:5px 12px;font-size:11px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ffcdd2;">
            <span>🚫 你的当前账号已被对方拉黑拒收。</span>
            <button onclick="openAccountManagerModal()" style="border:none;background:#c62828;color:#fff;padding:2px 7px;border-radius:6px;font-size:10px;cursor:pointer;">切小号转圜</button>
        </div>` : ''}

        <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
            ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">当前账号与 TA 尚无对话，点击右上方 ⚡ 闪电按钮开启互动！</div>'}
        </div>

        ${_stickerDrawerOpen ? buildStickerDrawerHTML() : ''}

        <div style="padding:6px 8px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:5px;align-items:center;">
            <button id="chatActionInsertBtn" title="合作/拍共创视频" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
            <button id="chatToggleStickerBtn" title="发送表情包" style="border:1px solid #ccc;background:${_stickerDrawerOpen ? '#eaf5ea' : '#f8f9f8'};color:#555;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;">😊</button>
            <textarea id="singleChatInput" rows="1" placeholder="" style="flex:1;padding:7px 10px;border-radius:16px;border:1px solid #ddd;background:#f8faf8;font-size:13.5px;resize:none;outline:none;font-family:inherit;"></textarea>
            <button id="singleSendBtn" style="border:none;background:var(--primary);color:#fff;padding:6px 13px;border-radius:16px;font-size:12.5px;font-weight:700;cursor:pointer;">发送</button>
        </div>
    </div>
    `;
    container.innerHTML = html;

    const msgArea = document.getElementById('chatMessageArea');
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;

    if (_stickerDrawerOpen) {
        bindStickerDrawerEvents('single', npcId);
    }

    document.getElementById('btnToggleBehindScreen')?.addEventListener('click', () => {
        window.G._behindScreenActive[npcId] = !window.G._behindScreenActive[npcId];
        showToast(window.G._behindScreenActive[npcId] ? '👁️ 已开启「屏幕那边的TA」动作感知' : '已关闭线下动作感知', 'info', 1500);
        renderSingleChatWindow(container);
        autoSaveGame();
    });

    document.getElementById('chatToggleStickerBtn')?.addEventListener('click', () => {
        _stickerDrawerOpen = !_stickerDrawerOpen;
        renderSingleChatWindow(container);
    });

    document.getElementById('btnLoadMoreChatHist')?.addEventListener('click', () => {
        window.G._chatShowFullHistory[sessionKey] = true;
        renderSingleChatWindow(container);
    });

    document.getElementById('singleChatHeaderAccountBtn')?.addEventListener('click', openAccountManagerModal);

    // 绑定长按气泡触发撤回/编辑/删除
    container.querySelectorAll('.chat-msg-row[data-from="player"]').forEach(row => {
        const msgId = row.dataset.msgid;
        const bubble = row.querySelector('.self-bubble');
        if (bubble && msgId) {
            bindLongPressEvent(bubble, () => {
                showMessageActionSheet(msgId, 'single', npcId);
            });
        }
    });

    // 🌟 长按头像弹出编辑角色资料；单击查看角色名片
    container.querySelectorAll('.chat-npc-avatar-btn').forEach(btn => {
        bindLongPressEvent(
            btn,
            () => openEditNpcModal(npcId),
            () => openNpcProfileCardModal(npcId)
        );
    });

    const headerProfileBtn = document.getElementById('singleChatHeaderProfileBtn');
    if (headerProfileBtn) {
        bindLongPressEvent(
            headerProfileBtn,
            () => openEditNpcModal(npcId),
            () => openNpcProfileCardModal(npcId)
        );
    }

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

    document.getElementById('chatActionInsertBtn')?.addEventListener('click', () => {
        openChatActionMenuModal('single', npcId);
    });

    const triggerBtn = document.getElementById('triggerAIReplyBtn');
    if (triggerBtn) {
        triggerBtn.onclick = async () => {
            if (window.G.isGenerating) { showToast('⏳ TA 正在打字中...', 'info', 1500); return; }
            triggerBtn.style.opacity = '0.5';
            triggerBtn.style.pointerEvents = 'none';
            await triggerAIReplyForSingle(npcId);
            if (document.getElementById('triggerAIReplyBtn')) {
                document.getElementById('triggerAIReplyBtn').style.opacity = '1';
                document.getElementById('triggerAIReplyBtn').style.pointerEvents = 'auto';
            }
        };
    }
}

// 拆解气泡逻辑
function splitIntoChatBubbles(rawText) {
    if (!rawText) return [];
    let clean = stripThought(rawText).trim();
    if (!clean) return [];

    const bubbles = [];
    const msgTagRegex = /\[MSG\]([\s\S]*?)\[\/MSG\]/gi;
    let match;
    while ((match = msgTagRegex.exec(clean)) !== null) {
        const item = match[1].trim();
        if (item) bubbles.push(item);
    }

    if (bubbles.length > 0) return bubbles.slice(0, 5);

    clean = clean.replace(/\[\/?MSG\]/gi, '').trim();

    const lines = clean.split(/\n+/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
        return lines.slice(0, 5);
    }

    if (clean.length > 25) {
        const sentences = clean.split(/([。！？!?~～]+)/).filter(Boolean);
        let cur = '';
        for (let i = 0; i < sentences.length; i++) {
            cur += sentences[i];
            if (i % 2 === 1 || cur.length > 18) {
                if (cur.trim()) bubbles.push(cur.trim());
                cur = '';
            }
        }
        if (cur.trim()) bubbles.push(cur.trim());
        if (bubbles.length > 0) return bubbles.slice(0, 5);
    }

    return [clean];
}

// ⚡ 单人聊天 AI 回复触发
async function triggerAIReplyForSingle(npcId) {
    const npc = window.G.npcs[npcId];
    if (!npc) return;
    const activeAcc = getActiveAccountInfo();
    const isCurrentlyBlocked = isAccountBlockedByNpc(npcId, activeAcc.id);
    const isBehindScreenActive = !!window.G._behindScreenActive[npcId];

    if (isCurrentlyBlocked) {
        showToast('⚠️ 当前账号已被对方拉黑，无法接收回复。', 'error', 3000);
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
            if (m.sharedMoment) return `[对方转发了朋友圈动态给你: “${m.sharedMoment.body}”]`;
            const speaker = m.from === 'player' ? (m.senderAccount || '主角') : npc.name;
            return `${speaker}: ${m.sticker ? `[发送了表情包: ${m.sticker.desc}]` : stripThought(m.text || '')}`;
        }).join('\n');
    } else {
        recentContext = '（尚未开始对话，双方此前没有任何私聊记录）';
    }

    let npcMemoryContext = '';
    if (npc.memorySummary) npcMemoryContext += `【历史专属记忆与朋友圈互动】\n${npc.memorySummary}\n`;
    if (npc.knownGroupEvents) npcMemoryContext += `【群聊获悉事件】\n${npc.knownGroupEvents}\n`;

    const recentPlayerPosts = (window.G.feed || []).filter(f => f.isPlayer || f.author === window.G.player?.ytName).slice(-2);
    let playerMomentsContext = '';
    if (recentPlayerPosts.length > 0) {
        playerMomentsContext = '【玩家最近发的朋友圈动态（可自然在私信中提起）】：\n' +
            recentPlayerPosts.map(p => `• “${p.body}” ${p.image ? '(附带图片)' : ''}${p.imageDesc ? `(配图: ${p.imageDesc})` : ''}`).join('\n') + '\n';
    }

    const tzContext = formatNpcTimezoneContext(npc.name);
    const availableStickers = (window.G.stickerLibrary || []).slice(0, 20).map(s => s.desc).join('、');
    const curFavor = npc.favor || 0;

    let favorStageRule = '';
    if (curFavor < 20) {
        favorStageRule = `
【🚨 好感度极度生疏阶段警告（当前好感度: ${curFavor}/100）】：
1. 双方【刚刚认识或完全不熟】！你对玩家的态度必须保持【明显的冷淡、生疏、防备、距离感、或作为知名大主播对新人的冷漠审视】！
2. 绝对严禁【自来熟】！严禁说“你想我了”、“抢着点给我道早安”、“下午一起联机谁都不许迟到”等老熟人/情侣才会说的自恋调侃！
3. 玩家如果说你好，你只能冷淡简洁地回应“你好，有事？”或“请问你是？”；绝不要无端主动约对方联机或讨论合作！
`;
    } else if (curFavor < 40) {
        favorStageRule = `
【好感度阶段：点头之交（当前好感度: ${curFavor}/100）】：
客气、礼貌的同行关系，偶尔互相客套，但依然保持基本社交礼貌，不做过分亲密的玩笑。
`;
    } else if (curFavor < 60) {
        favorStageRule = `
【好感度阶段：熟络朋友（当前好感度: ${curFavor}/100）】：
已经比较熟悉，可以互相开玩笑、互怼、讨论视频灵感与日常。
`;
    } else {
        favorStageRule = `
【好感度阶段：知己/暧昧（当前好感度: ${curFavor}/100）】：
关系亲密，默契深厚，充满护短与偏袒。
`;
    }

    const behindScreenPrompt = isBehindScreenActive ? `
【屏幕那边的TA（线下第三人称动作感知）】：
玩家已开启线下动作感知。请在输出完聊天消息后，额外输出一个独立块 [BEHIND_SCREEN]...[/BEHIND_SCREEN]，细腻描写你在屏幕那边的真实线下动作、环境与心理小动作（30~60字）。
例如：
[BEHIND_SCREEN]靠在电竞椅上端起冰美式喝了一口，单手转动着鼠标，屏幕微光映在冷峻的脸上，等待着对话框的动静。[/BEHIND_SCREEN]
` : '';

    const sysPrompt = `
你正在扮演真实沉浸的 Minecraft 主播/好友「${npc.name}」（性格人设：${npc.persona || '一位同伴'}）。
${favorStageRule}
${tzContext}
${npcMemoryContext}
${playerMomentsContext}

【严禁出戏括号与纯净打字铁律】：
1. 聊天气泡内【绝对禁止】包含任何动作括号（如“（叹气）”、“（喝了一口水）”、“*微笑*”等）！把聊天框当成真实的微信打字，只输出纯粹口语化的消息文字！
2. 支持发送表情包斗图：若语境合适，可将其中一条消息写为 [STICKER:表情关键词]（可用关键词参考：${availableStickers}）。
3. 必须输出 2 到 4 条短消息气泡，每条用 [MSG]...[/MSG] 包裹，禁止 markdown 代码块：
[MSG]第一句话[/MSG]
[MSG]第二句话[/MSG]
${behindScreenPrompt}
`;

    try {
        window.G.isGenerating = true;
        if (typeof showLoading === 'function') showLoading();

        const rawReply = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: history.length > 0 ? '请根据当前聊天上下文连续发送多条纯打字回复。' : '请根据当前好感度做出初次打招呼或回应。' }
        ], { maxTokens: 550, temperature: 0.9 });

        if (typeof hideLoading === 'function') hideLoading();

        let cleanText = rawReply || '';
        let behindScreenActionText = '';

        const bsMatch = cleanText.match(/\[BEHIND_SCREEN\]([\s\S]*?)\[\/BEHIND_SCREEN\]/i);
        if (bsMatch) {
            behindScreenActionText = stripThought(bsMatch[1].trim());
            cleanText = cleanText.replace(/\[BEHIND_SCREEN\][\s\S]*?\[\/BEHIND_SCREEN\]/gi, '').trim();
        }

        const bubbles = splitIntoChatBubbles(cleanText);
        const finalBubbles = (bubbles && bubbles.length) ? bubbles : ['你好，有什么事吗？'];

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
            if (window.G.currentChatNpc === npcId && container) {
                renderSingleChatWindow(container);
            }

            if (i < finalBubbles.length - 1) {
                await new Promise(res => setTimeout(res, 500));
            }
        }

        if (behindScreenActionText && isBehindScreenActive) {
            pushChatMessageSafe(npcId, {
                from: 'behind_screen',
                text: behindScreenActionText,
                time: new Date().toLocaleTimeString().slice(0, 5)
            });
            const container = (dom && dom.socialTab) || document.getElementById('socialTab');
            if (window.G.currentChatNpc === npcId && container) {
                renderSingleChatWindow(container);
            }
        }

        autoSaveGame();
    } catch (e) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('私聊 AI 回复失败', e);
        showToast('❌ 回复失败，请检查网络或设置', 'error');
    } finally {
        window.G.isGenerating = false;
        const curStatusEl = document.getElementById('chatOnlineStatusText');
        const isNowBlocked = isAccountBlockedByNpc(npcId, activeAcc.id);
        if (curStatusEl) {
            curStatusEl.innerHTML = `${isNowBlocked ? '<span style="color:#d32f2f;">⚠️ TA已拉黑</span>' : '● 在线'} ${npc.memorySummary ? '· 🧠记忆' : ''}`;
        }
    }
}

// ============================================================
// 9. 角色编辑弹窗与名片弹窗
// ============================================================
function openEditNpcModal(npcId) {
    const npc = window.G.npcs[npcId];
    if (!npc) return;

    openModal(`
        <h3>✏️ 编辑角色资料与人设</h3>
        <p style="font-size:12px;color:#666;">可自由微调 TA 的姓名、头像、赛道及深层性格设定。</p>
        <div class="form-group">
            <label>角色姓名 <span class="required">*</span></label>
            <input type="text" id="editNpcNameInput" value="${escapeHtml(npc.name || '')}">
        </div>
        <div class="form-group">
            <label>角色头像</label>
            <div style="display:flex;align-items:center;gap:10px;">
                <div id="editNpcAvatarPreview" style="width:44px;height:44px;border-radius:50%;overflow:hidden;border:1.5px solid var(--primary);display:flex;align-items:center;justify-content:center;background:#eef3ee;">
                    ${renderAvatarBadge(npc, 44)}
                </div>
                <input type="file" id="editNpcAvatarFileInput" accept="image/*" style="font-size:12px;">
            </div>
        </div>
        <div class="form-group">
            <label>性格人设设定 (Prompt)</label>
            <textarea id="editNpcPersonaInput" rows="3" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;font-size:13px;">${escapeHtml(npc.persona || '')}</textarea>
        </div>
        <div class="form-group">
            <label>外貌/皮肤形象 (Skin)</label>
            <input type="text" id="editNpcSkinInput" value="${escapeHtml(npc.skin || npc.appearance || '')}" placeholder="如：黑色西装打红色领带的骷髅...">
        </div>
        <div class="form-group">
            <label>赛道方向与口头禅</label>
            <div style="display:flex;gap:6px;">
                <input type="text" id="editNpcCategoryInput" value="${escapeHtml(npc.category || '')}" placeholder="赛道分类" style="flex:1;">
                <input type="text" id="editNpcCatchphraseInput" value="${escapeHtml(npc.catchphrase || '')}" placeholder="经典口头禅" style="flex:1;">
            </div>
        </div>
        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnSaveNpcProfile">💾 保存修改</button>
        </div>
    `);

    let newAvatarUrl = npc.avatarUrl || null;
    const fileInp = document.getElementById('editNpcAvatarFileInput');
    if (fileInp) {
        fileInp.onchange = function() {
            const f = this.files && this.files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = ev => {
                newAvatarUrl = ev.target.result;
                document.getElementById('editNpcAvatarPreview').innerHTML = `<img src="${newAvatarUrl}" style="width:100%;height:100%;object-fit:cover;">`;
            };
            r.readAsDataURL(f);
        };
    }

    document.getElementById('btnSaveNpcProfile').onclick = () => {
        const name = document.getElementById('editNpcNameInput').value.trim();
        const persona = document.getElementById('editNpcPersonaInput').value.trim();
        const skin = document.getElementById('editNpcSkinInput').value.trim();
        const category = document.getElementById('editNpcCategoryInput').value.trim();
        const catchphrase = document.getElementById('editNpcCatchphraseInput').value.trim();

        if (!name) { showToast('⚠️ 角色姓名不能为空', 'error'); return; }

        npc.name = name;
        npc.persona = persona;
        npc.skin = skin;
        npc.appearance = skin;
        npc.category = category;
        npc.catchphrase = catchphrase;
        if (newAvatarUrl) npc.avatarUrl = newAvatarUrl;

        closeModal();
        showToast(`✅ 已更新「${name}」的角色档案与设定！`, 'success', 2000);
        renderSocialPanel();
        autoSaveGame();
    };
}
window.openEditNpcModal = openEditNpcModal;

function openNpcProfileCardModal(npcId) {
    const npc = window.G.npcs[npcId];
    if (!npc) return;

    const favorStage = (typeof getFavorStage === 'function') ? getFavorStage(npc.favor || 0) : `好感 ${npc.favor || 0}`;

    openModal(`
        <div style="text-align:center;padding:6px 0;">
            <div style="margin:0 auto 8px;width:64px;height:64px;border-radius:50%;overflow:hidden;border:2px solid var(--primary);display:flex;align-items:center;justify-content:center;">
                ${renderAvatarBadge(npc, 64)}
            </div>
            <h3 style="margin:0 0 4px;font-size:17px;">${escapeHtml(npc.name)}</h3>
            <div style="font-size:12px;color:#e53935;font-weight:700;margin-bottom:8px;">${favorStage} (${npc.favor || 0}/100)</div>

            <div style="background:#f8faf8;border-radius:10px;padding:10px;font-size:12px;color:#444;text-align:left;line-height:1.6;border:1px solid #e8eee8;margin-bottom:12px;">
                <div><b>🎭 人设特征：</b>${escapeHtml(npc.persona || '一位主播好友')}</div>
                <div style="margin-top:4px;"><b>🎨 形象皮肤：</b>${escapeHtml(npc.skin || npc.appearance || '无特异装扮')}</div>
                <div style="margin-top:4px;"><b>🎬 主攻赛道：</b>${escapeHtml(npc.category || '剧情/实况')}</div>
                ${npc.catchphrase ? `<div style="margin-top:4px;"><b>💬 口头禅：</b>“${escapeHtml(npc.catchphrase)}”</div>` : ''}
                ${npc.memorySummary ? `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #d0ded0;color:#2e7d32;"><b>🧠 专属长久记忆：</b>${escapeHtml(npc.memorySummary)}</div>` : ''}
            </div>

            <div class="btn-row" style="flex-direction:column;gap:8px;">
                <button class="btn-primary" id="btnEditNpcFromCard" style="width:100%;">✏️ 编辑 TA 的人设资料</button>
                <button class="btn-secondary" id="btnViewNpcMomentsOnly" style="width:100%;">🌟 只看 TA 的朋友圈</button>
                <button class="btn-secondary" onclick="closeModal()" style="width:100%;">关闭</button>
            </div>
        </div>
    `);

    document.getElementById('btnEditNpcFromCard').onclick = () => {
        closeModal();
        openEditNpcModal(npcId);
    };

    document.getElementById('btnViewNpcMomentsOnly').onclick = () => {
        closeModal();
        window.G.currentChatNpc = null;
        window.G.phoneNav = 'moments';
        window.G.momentsFilterNpcId = npcId;
        renderSocialPanel();
    };
}
window.openNpcProfileCardModal = openNpcProfileCardModal;

// ============================================================
// 10. 群聊窗口与事件绑定
// ============================================================
function openGroupChat(gid) {
    if (!window.G.groups || !window.G.groups[gid]) return;
    window.G.currentChatNpc = null;
    window.G.currentChatGroup = gid;
    window.G.chatActiveTab = 'group';
    window.G.phoneNav = 'chats';
    renderSocialPanel();
}

function closeGroupChat() {
    window.G.currentChatGroup = null;
    renderSocialPanel();
}

function renderGroupChatWindow(container) {
    const gid = window.G.currentChatGroup;
    const grp = window.G.groups[gid];
    if (!grp) { closeGroupChat(); return; }
    const msgs = window.G.groupChatHistory[gid] || [];
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
                <div style="padding:0;display:inline-block;">
                    <img src="${msg.sticker.url}" alt="${escapeHtml(msg.sticker.desc)}" style="width:85px;height:85px;border-radius:8px;object-fit:cover;display:block;">
                </div>`;
            } else {
                bubbleContent = isSelf ? escapeHtml(msg.text).replace(/\n/g, '<br>') : renderContentWithThoughts(msg.text);
            }

            messagesHtml += `
            <div class="chat-msg-row" data-msgid="${msg._id || ''}" data-from="${msg.from}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:10px;align-items:flex-start;">
                ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: msg.senderAvatarUrl, avatarEmoji: msg.senderAvatar || '👤' }, 34)}</div>` : ''}
                <div style="max-width:75%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                    ${!isSelf ? `<div style="font-size:11px;color:#777;margin-bottom:2px;">${escapeHtml(msg.senderName)}</div>` : ''}
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? (msg.sticker ? 'transparent' : '#95ec69') : (msg.sticker ? 'transparent' : '#fff')};color:#111;padding:${msg.sticker ? '0' : '8px 12px'};border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:${msg.sticker ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'};font-size:14px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;cursor:pointer;">
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
                <button id="triggerGroupAIBtn" title="触发群成员回复" style="border:none;background:#ff4757;color:#fff;width:34px;height:34px;border-radius:8px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        <div id="groupMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
            ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">群里静悄悄的，点击 ➕ 拍共创视频或与群友斗图吧！</div>'}
        </div>

        ${_stickerDrawerOpen ? buildStickerDrawerHTML() : ''}

        <div style="padding:6px 8px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:5px;align-items:center;">
            <button id="groupActionInsertBtn" title="群合作/共创视频" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
            <button id="groupToggleStickerBtn" title="发送表情包" style="border:1px solid #ccc;background:${_stickerDrawerOpen ? '#eaf5ea' : '#f8f9f8'};color:#555;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;">😊</button>
            <textarea id="groupChatInput" rows="1" placeholder="" style="flex:1;padding:7px 10px;border-radius:16px;border:1px solid #ddd;background:#f8faf8;font-size:13.5px;resize:none;outline:none;font-family:inherit;"></textarea>
            <button id="groupSendBtn" style="border:none;background:var(--primary);color:#fff;padding:6px 13px;border-radius:16px;font-size:12.5px;font-weight:700;cursor:pointer;">发送</button>
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

    container.querySelectorAll('.chat-msg-row[data-from="player"]').forEach(row => {
        const msgId = row.dataset.msgid;
        const bubble = row.querySelector('.self-bubble');
        if (bubble && msgId) {
            bindLongPressEvent(bubble, () => {
                showMessageActionSheet(msgId, 'group', gid);
            });
        }
    });

    const input = document.getElementById('groupChatInput');
    const sendBtn = document.getElementById('groupSendBtn');

    const doSend = () => {
        const text = input.value.trim();
        if (!text) return;
        if (!window.G.groupChatHistory[gid]) window.G.groupChatHistory[gid] = [];
        window.G.groupChatHistory[gid].push({
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
        openChatActionMenuModal('group', gid);
    });

    document.getElementById('groupSettingsBtn')?.addEventListener('click', () => openGroupSettingsModal(gid));

    document.getElementById('triggerGroupAIBtn')?.addEventListener('click', async () => {
        if (window.G.isGenerating) { showToast('⏳ AI 正在组织群聊中...'); return; }
        showToast('⚡ 触发群聊讨论...', 'success', 1200);
        await triggerGroupAIReply(gid);
        renderGroupChatWindow(container);
    });
}

// 社交申请中心、自建好友与自建群聊
function openAddChatTargetModal() {
    const reqs = window.G.friendRequests || [];
    const invites = window.G.groupInvites || [];
    let reqsHtml = '';

    if (!reqs.length && !invites.length) {
        reqsHtml = '<div style="font-size:12px;color:#888;padding:16px 0;text-align:center;">暂无待处理的好友申请或群邀请</div>';
    } else {
        reqs.forEach((r, idx) => {
            reqsHtml += `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 10px;background:#f9faf9;border-radius:8px;border:1px solid #eef2ee;margin-bottom:6px;">
                <div style="flex:1;min-width:0;margin-right:8px;">
                    <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.avatarEmoji || '👤'} ${escapeHtml(r.name)}</div>
                    <div style="font-size:11px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(r.fromReason || r.persona || '粉丝来信')}</div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                    <button class="upload-btn" onclick="handleFriendRequestAction(${idx}, true)" style="padding:4px 9px;font-size:11px;background:#2e7d32;color:#fff;border:none;border-radius:6px;cursor:pointer;">同意</button>
                    <button class="upload-btn" onclick="handleFriendRequestAction(${idx}, false)" style="padding:4px 9px;font-size:11px;background:#e53935;color:#fff;border:none;border-radius:6px;cursor:pointer;">拒绝</button>
                </div>
            </div>`;
        });

        invites.forEach((inv, idx) => {
            reqsHtml += `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 10px;background:#f0f7ff;border-radius:8px;border:1px solid #d0e5ff;margin-bottom:6px;">
                <div style="flex:1;min-width:0;margin-right:8px;">
                    <div style="font-weight:700;font-size:13px;color:#1565c0;">👥 ${escapeHtml(inv.groupName || '群聊邀请')}</div>
                    <div style="font-size:11px;color:#555;">${escapeHtml(inv.desc || '邀请你加入群聊')}</div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                    <button class="upload-btn" onclick="handleGroupInviteAction(${idx}, true)" style="padding:4px 9px;font-size:11px;background:#1976d2;color:#fff;border:none;border-radius:6px;cursor:pointer;">加入</button>
                    <button class="upload-btn" onclick="handleGroupInviteAction(${idx}, false)" style="padding:4px 9px;font-size:11px;background:#888;color:#fff;border:none;border-radius:6px;cursor:pointer;">忽略</button>
                </div>
            </div>`;
        });
    }

    openModal(`
        <h3>➕ 社交申请中心</h3>
        <p style="font-size:12px;color:#666;">处理主播们发来的好友申请与群邀请，或由你主动创建自定义角色与群聊：</p>
        
        <div style="display:flex;gap:8px;margin:10px 0;">
            <button class="btn-primary" id="btnOpenCreateCustomNpc" style="flex:1;font-size:12px;padding:8px 0;background:#2e7d32;">➕ 自建新角色好友</button>
            <button class="btn-primary" id="btnOpenCreateCustomGroup" style="flex:1;font-size:12px;padding:8px 0;background:#1976d2;">👥 建立新群聊</button>
        </div>

        <div style="font-weight:700;font-size:13px;margin:12px 0 6px;">📬 待处理申请与邀请 (${reqs.length + invites.length})</div>
        <div style="max-height:220px;overflow-y:auto;margin-bottom:12px;">${reqsHtml}</div>
        
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">关闭</button>
        </div>
    `);

    bindReliableTap(document.getElementById('btnOpenCreateCustomNpc'), () => {
        closeModal();
        openCreateCustomNpcModal();
    });

    bindReliableTap(document.getElementById('btnOpenCreateCustomGroup'), () => {
        closeModal();
        openCreateGroupModal();
    });
}
window.openAddChatTargetModal = openAddChatTargetModal;

function handleFriendRequestAction(idx, accept) {
    const req = (window.G.friendRequests || [])[idx];
    if (!req) return;
    window.G.friendRequests.splice(idx, 1);

    if (accept) {
        const npcId = req.id || req.npcId || ('npc_' + Date.now() + '_' + rand(100, 999));
        if (!window.G.npcs) window.G.npcs = {};
        window.G.npcs[npcId] = {
            id: npcId,
            name: req.name,
            gender: req.gender || '男',
            persona: req.persona || '一位热情的MC主播同伴',
            avatarEmoji: req.avatarEmoji || '👤',
            avatarUrl: req.avatarUrl || null,
            skin: req.skin || '经典主播皮肤',
            category: req.category || '日常实况',
            favor: req.favor !== undefined ? req.favor : 15,
            works: req.works || [],
            isCustom: true
        };
        showToast(`🎉 已与「${req.name}」成为好友！`, 'success', 2500);
    } else {
        showToast(`已忽略该好友申请`, 'info', 1500);
    }
    closeModal();
    renderSocialPanel();
    autoSaveGame();
}
window.handleFriendRequestAction = handleFriendRequestAction;

function handleGroupInviteAction(idx, accept) {
    const inv = (window.G.groupInvites || [])[idx];
    if (!inv) return;
    window.G.groupInvites.splice(idx, 1);

    if (accept) {
        const gid = inv.groupId || ('grp_' + Date.now());
        if (!window.G.groups) window.G.groups = {};
        window.G.groups[gid] = {
            id: gid,
            name: inv.groupName || 'MC开播后援群',
            desc: inv.desc || '粉丝与主播交流聚集地',
            avatarEmoji: inv.avatarEmoji || '👥',
            members: inv.members || ['player']
        };
        if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
        if (!window.G.groupChatHistory[gid]) window.G.groupChatHistory[gid] = [];
        showToast(`🎉 成功加入群聊「${inv.groupName}」！`, 'success', 2500);
    } else {
        showToast(`已忽略群聊邀请`, 'info', 1500);
    }
    closeModal();
    renderSocialPanel();
    autoSaveGame();
}
window.handleGroupInviteAction = handleGroupInviteAction;

function openCreateCustomNpcModal() {
    openModal(`
        <h3>➕ 自定义添加新角色好友</h3>
        <p style="font-size:12px;color:#666;">创造一位全新的 MC 主播或搭档，即刻开始互动！</p>
        <div class="form-group">
            <label>角色姓名 <span class="required">*</span></label>
            <input type="text" id="newNpcNameInput" placeholder="例如：Skeppy / 某位主播好友...">
        </div>
        <div class="form-group">
            <label>性格人设特征 (Prompt) <span class="required">*</span></label>
            <textarea id="newNpcPersonaInput" rows="3" placeholder="例如：脾气火爆但非常重义气，热爱恶作剧整蛊，说话语速极快..."></textarea>
        </div>
        <div class="form-group">
            <label>外貌/皮肤外观 (Skin)</label>
            <input type="text" id="newNpcSkinInput" placeholder="例如：红色鸭舌帽与黑色连帽卫衣...">
        </div>
        <div class="form-group">
            <label>赛道与口头禅</label>
            <div style="display:flex;gap:6px;">
                <input type="text" id="newNpcCategoryInput" placeholder="如：整蛊/PvP" style="flex:1;">
                <input type="text" id="newNpcCatchphraseInput" placeholder="口头禅" style="flex:1;">
            </div>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="openAddChatTargetModal()">返回</button>
            <button class="btn-primary" id="btnConfirmCreateNpc">完成添加</button>
        </div>
    `);

    bindReliableTap(document.getElementById('btnConfirmCreateNpc'), () => {
        const name = document.getElementById('newNpcNameInput').value.trim();
        const persona = document.getElementById('newNpcPersonaInput').value.trim();
        const skin = document.getElementById('newNpcSkinInput').value.trim();
        const category = document.getElementById('newNpcCategoryInput').value.trim();
        const catchphrase = document.getElementById('newNpcCatchphraseInput').value.trim();

        if (!name) { showToast('⚠️ 请填写角色姓名', 'error'); return; }
        if (!persona) { showToast('⚠️ 请填写角色性格人设', 'error'); return; }

        const npcId = 'custom_' + Date.now();
        if (!window.G.npcs) window.G.npcs = {};
        window.G.npcs[npcId] = {
            id: npcId,
            name,
            gender: '男',
            persona,
            skin: skin || '经典主播装扮',
            appearance: skin || '经典主播装扮',
            category: category || 'MC实况',
            catchphrase,
            favor: 20,
            avatarEmoji: '👤',
            avatarUrl: null,
            works: [],
            isCustom: true
        };

        closeModal();
        showToast(`🎉 好友「${name}」已添加进通讯录！`, 'success', 2500);
        renderSocialPanel();
        autoSaveGame();
    });
}
window.openCreateCustomNpcModal = openCreateCustomNpcModal;

function openCreateGroupModal() {
    const npcs = Object.values(window.G.npcs || {});
    if (!npcs.length) {
        showToast('请先结识好友后再创建群聊', 'error');
        return;
    }

    const memberBoxes = npcs.map(n => `
        <label style="display:inline-flex;align-items:center;gap:4px;font-size:12.5px;background:#f8faf8;padding:4px 8px;border-radius:12px;margin:3px;border:1px solid #e0ebe0;cursor:pointer;">
            <input type="checkbox" class="create-group-member-check" value="${n.id}">
            <span>${n.avatarEmoji || '👤'} ${escapeHtml(n.name)}</span>
        </label>
    `).join('');

    openModal(`
        <h3>👥 建立新的群聊</h3>
        <div class="form-group">
            <label>群聊名称 <span class="required">*</span></label>
            <input type="text" id="newGroupNameInput" placeholder="例如：周末联机整蛊小分队...">
        </div>
        <div class="form-group">
            <label>群简介 (选填)</label>
            <input type="text" id="newGroupDescInput" placeholder="描述这个群的日常氛围与话题...">
        </div>
        <div class="form-group">
            <label>勾选拉入群聊的好友：</label>
            <div style="max-height:160px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:2px;padding:6px;border:1px solid #eee;border-radius:8px;">
                ${memberBoxes}
            </div>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="openAddChatTargetModal()">返回</button>
            <button class="btn-primary" id="btnConfirmCreateGroup">创建群聊</button>
        </div>
    `);

    bindReliableTap(document.getElementById('btnConfirmCreateGroup'), () => {
        const name = document.getElementById('newGroupNameInput').value.trim();
        const desc = document.getElementById('newGroupDescInput').value.trim();
        const checked = document.querySelectorAll('.create-group-member-check:checked');
        const memberIds = Array.from(checked).map(c => c.value);

        if (!name) { showToast('⚠️ 请填写群聊名称', 'error'); return; }
        if (!memberIds.length) { showToast('⚠️ 至少需要拉入一位好友', 'error'); return; }

        const gid = 'grp_' + Date.now();
        if (!window.G.groups) window.G.groups = {};
        window.G.groups[gid] = {
            id: gid,
            name,
            desc: desc || '日常探讨与开播分享',
            avatarEmoji: '👥',
            members: memberIds
        };

        if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
        window.G.groupChatHistory[gid] = [{
            _id: 'ginit_' + Date.now(),
            from: 'action',
            text: `群聊「${name}」已创建，你邀请了 ${memberIds.map(id => window.G.npcs[id]?.name).join('、')} 加入群聊。`,
            time: new Date().toLocaleTimeString().slice(0, 5)
        }];

        closeModal();
        showToast(`🎉 群聊「${name}」创建成功！`, 'success', 2500);
        window.G.chatActiveTab = 'group';
        renderSocialPanel();
        autoSaveGame();
    });
}
window.openCreateGroupModal = openCreateGroupModal;

function openGroupSettingsModal(gid) {
    const grp = window.G.groups[gid];
    if (!grp) return;

    openModal(`
        <h3>⚙️ 群聊管理 - ${escapeHtml(grp.name)}</h3>
        <div class="form-group">
            <label>群聊名称</label>
            <input type="text" id="editGroupNameInput" value="${escapeHtml(grp.name)}">
        </div>
        <div class="form-group">
            <label>群简介</label>
            <textarea id="editGroupDescInput" rows="2">${escapeHtml(grp.desc || '')}</textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnSaveGroupInfo">保存群设置</button>
        </div>
    `);

    document.getElementById('btnSaveGroupInfo').onclick = () => {
        const name = document.getElementById('editGroupNameInput').value.trim();
        const desc = document.getElementById('editGroupDescInput').value.trim();
        if (!name) { showToast('群名称不能为空', 'error'); return; }
        grp.name = name;
        grp.desc = desc;
        closeModal();
        renderSocialPanel();
        showToast('✅ 群设置已保存', 'success');
        autoSaveGame();
    };
}
window.openGroupSettingsModal = openGroupSettingsModal;

async function triggerGroupAIReply(gid) {
    const grp = window.G.groups[gid];
    if (!grp) return;

    try {
        window.G.isGenerating = true;
        const members = (grp.members || []).map(mid => window.G.npcs[mid]).filter(Boolean);
        const memberNames = members.map(m => m.name).join('、');
        const msgs = (window.G.groupChatHistory[gid] || []).slice(-6).map(m => `${m.senderName}: ${m.text}`).join('\n');

        const sys = `你正在扮演MC玩家群聊「${grp.name}」里的群成员（${memberNames}）。
请根据群聊最新发言，随机挑1到2位成员做出生动接地气的简短回复。每条格式：
[GMSG name=成员名字]内容[/GMSG]`;

        const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: msgs || '大家在群里聊点什么吧。' }], { maxTokens: 250, temperature: 0.9 });
        const re = /\[GMSG(?:\s+name=|\s*:\s*)(["']?)([^\]"'\n]+)\1\]([\s\S]*?)(?:\[\/GMSG\]|$)/gi;
        let match;

        while ((match = re.exec(raw)) !== null) {
            const mName = match[2].trim();
            const text = stripThought(match[3].replace(/\[\/?GMSG[^\]]*\]/gi, '').trim());
            if (!text) continue;

            const matchedMember = members.find(m => m.name === mName) || { name: mName, avatarEmoji: '👤' };
            if (!window.G.groupChatHistory[gid]) window.G.groupChatHistory[gid] = [];
            window.G.groupChatHistory[gid].push({
                _id: 'gmsg_' + Date.now() + '_' + rand(100, 999),
                from: 'npc',
                senderName: matchedMember.name,
                senderAvatar: matchedMember.avatarEmoji,
                senderAvatarUrl: matchedMember.avatarUrl,
                text,
                time: new Date().toLocaleTimeString().slice(0, 5)
            });
        }
        autoSaveGame();
    } catch(e) {
        console.error('群聊生成失败', e);
    } finally {
        window.G.isGenerating = false;
    }
}

function openChat(npcId) {
    if (!window.G.npcs || !window.G.npcs[npcId]) return;
    window.G.currentChatGroup = null;
    window.G.currentChatNpc = npcId;
    window.G.chatActiveTab = 'direct';
    window.G.phoneNav = 'chats';
    renderSocialPanel();
}
function closeChat() { window.G.currentChatNpc = null; renderSocialPanel(); }

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
window.openChatActionMenuModal = openChatActionMenuModal;
window.openCollabVideoPublishModal = openCollabVideoPublishModal;
window.handleInviteCollabStream = handleInviteCollabStream;
window.openShareMomentTargetModal = openShareMomentTargetModal;
window.jumpToMomentCard = jumpToMomentCard;
window.showMessageActionSheet = showMessageActionSheet;
window.openEditNpcModal = openEditNpcModal;
window.openNpcProfileCardModal = openNpcProfileCardModal;
window.openAddChatTargetModal = openAddChatTargetModal;
window.handleFriendRequestAction = handleFriendRequestAction;
window.handleGroupInviteAction = handleGroupInviteAction;
window.openCreateCustomNpcModal = openCreateCustomNpcModal;
window.openCreateGroupModal = openCreateGroupModal;