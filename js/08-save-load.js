// 存档/读档/初始化模块（v6.2.0 增强防丢与平滑迁移版）
// ============================================================
const CURRENT_APP_VERSION = '6.2.0'; // 递增版本号，确保更新后 100% 弹出全新更新公告

let _gameInitialized = false;
let _skipStartChoiceOnce = false;

function initGame() {
    _gameInitialized = true;
    G.phase = 'playing';

    // 表单数据绑定回填
    G.player.ytName = $('ytNameInput')?.value.trim() || 'MC_CraftMaster';
    G.player.age = parseInt($('ageInput')?.value) || 18;
    G.player.persona = $('personaInput')?.value.trim() || '';
    G.player.skin = $('skinInput')?.value.trim() || '';
    G.player.category = $('categorySelect')?.value || '剧情';

    const idVal = document.querySelector('input[name="identity"]:checked')?.value || 'new';
    G.player.identity = idVal;
    if (idVal === 'fans') {
        G.player.followers = Math.max(G.player.followers || 0, 5000);
        G.player.money = Math.max(G.player.money || 0, 200);
    } else if (idVal === 'veteran') {
        G.player.followers = Math.max(G.player.followers || 0, 50000);
        G.player.money = Math.max(G.player.money || 0, 1000);
    } else {
        if (!G.player.followers) G.player.followers = 0;
        if (!G.player.money) G.player.money = 50;
    }

    // 技能初值
    ['Building', 'Redstone', 'Pvp', 'Survival', 'Hunting'].forEach(k => {
        const val = parseInt($('skill' + k)?.value) || 20;
        G.player.skills[k.toLowerCase()] = val;
    });

    // 视图平滑流转：隐藏开局页，展示游戏主界面
    const setup = $('setupPage');
    const game = $('gamePage');
    if (setup) {
        setup.classList.remove('active');
        setup.style.display = 'none';
    }
    if (game) {
        game.classList.add('active');
        game.style.display = 'flex';
    }

    updateUI();
    if (!G.storyHistory || G.storyHistory.length === 0) {
        appendInitialWelcomeStory();
    }
    switchTab('story');
    autoSaveGame();

    // 唤起版本更新公告弹窗
    setTimeout(() => {
        if (typeof checkAndShowVersionNoticeModal === 'function') {
            checkAndShowVersionNoticeModal();
        }
    }, 400);
}

function appendInitialWelcomeStory() {
    const p = G.player;
    const text = `🎮 欢迎，${p.ytName}！\n\n` +
        `你是一位新晋 MC 主播，擅长 ${p.category} 赛道。\n` +
        `你的皮上形象是：${p.persona}，皮肤是：${p.skin}。\n\n` +
        `今天是你在 MC 油管世界的第 1 天，你是一名学生，正值暑假。\n` +
        `你有 6 个行动点（每2点推进一个时段），规划你的主播生涯吧！\n\n` +
        `💡 点击左侧功能图标开启日常活动，或进入聊天/同人/油管体验丰富互动！`;
    appendStory(text, '🎮 游戏开始');
}

// 自动存档与槽位读写
function autoSaveGame() {
    if (G.phase !== 'playing') return;
    try {
        const payload = serializeGameState();
        localStorage.setItem('mcyt_autosave', JSON.stringify({
            timestamp: new Date().toLocaleString(),
            day: G.day,
            version: CURRENT_APP_VERSION,
            data: payload
        }));
    } catch(e) {
        console.warn('自动存档写入失败', e);
    }
}

function getAutoSaveInfo() {
    try {
        const raw = localStorage.getItem('mcyt_autosave');
        return raw ? JSON.parse(raw) : null;
    } catch(e) {
        return null;
    }
}

function hasAnySaveData() {
    if (localStorage.getItem('mcyt_autosave')) return true;
    for (let i = 1; i <= 3; i++) {
        if (localStorage.getItem('mcyt_slot_' + i)) return true;
    }
    return false;
}

function resumeAutoSave() {
    const info = getAutoSaveInfo();
    if (!info || !info.data) {
        showToast('⚠️ 未找到有效自动存档', 'error');
        return;
    }
    applyDeserializedGameState(info.data);
    _gameInitialized = true;
    G.phase = 'playing';

    const setup = $('setupPage');
    const game = $('gamePage');
    if (setup) {
        setup.classList.remove('active');
        setup.style.display = 'none';
    }
    if (game) {
        game.classList.add('active');
        game.style.display = 'flex';
    }

    updateUI();
    switchTab('story');
    showToast('✅ 进度已成功载入！', 'success');

    setTimeout(() => {
        if (typeof checkAndShowVersionNoticeModal === 'function') {
            checkAndShowVersionNoticeModal();
        }
    }, 400);
}

function showStartChoiceModal(skipCheck = false) {
    const autoInfo = getAutoSaveInfo();
    openModal(`
        <h3>🎮 欢迎来到 MC YouTube 模拟器</h3>
        <p style="font-size:13px;color:#666;">检测到你此前拥有保存的进度，请选择进入方式：</p>
        <div class="start-choice-grid">
            <div class="choice-card" id="choiceResumeGame">
                <span class="big-icon">▶️</span>
                <div class="choice-label">继续上次进度</div>
                <div class="choice-desc">${autoInfo ? `第 ${autoInfo.day} 天 · ${autoInfo.data?.player?.ytName || ''}` : '自动存档'}</div>
            </div>
            <div class="choice-card" id="choiceStartNewGame">
                <span class="big-icon">✨</span>
                <div class="choice-label">全新开局</div>
                <div class="choice-desc">重新塑造你的专属主播</div>
            </div>
        </div>
        <div class="btn-row" style="margin-top:10px;">
            <button class="btn-secondary" id="choiceOpenSlotList" style="width:100%;">📂 查看全部存档槽位</button>
        </div>
    `);

    document.getElementById('choiceResumeGame').onclick = () => {
        closeModal();
        resumeAutoSave();
    };

    document.getElementById('choiceStartNewGame').onclick = () => {
        closeModal();
        _skipStartChoiceOnce = true;
        initGame();
    };

    document.getElementById('choiceOpenSlotList').onclick = () => {
        closeModal();
        showSaveSlotsModal('load');
    };
}

function showSaveSlotsModal(mode = 'save') {
    const isSave = mode === 'save';
    let slotsHtml = '';

    for (let i = 1; i <= 3; i++) {
        let slotData = null;
        try {
            const raw = localStorage.getItem('mcyt_slot_' + i);
            if (raw) slotData = JSON.parse(raw);
        } catch(e) {}

        slotsHtml += `
        <div class="save-slot-item" data-slot="${i}">
            <div class="slot-info">
                <div class="slot-label">📁 存档槽位 ${i}</div>
                ${slotData ? `
                    <div class="slot-detail">第 ${slotData.day} 天 · ${escapeHtml(slotData.data?.player?.ytName || '')} · 粉丝 ${slotData.data?.player?.followers || 0}</div>
                    <div style="font-size:10px;color:#888;">保存时间：${slotData.timestamp}</div>
                ` : '<div class="slot-empty">（空存档位）</div>'}
            </div>
            <div style="display:flex;gap:6px;">
                ${isSave ? `
                    <button class="slot-action-btn" onclick="saveGameToSlot(${i})">写入保存</button>
                ` : `
                    <button class="slot-action-btn" ${slotData ? '' : 'disabled'} onclick="loadGameFromSlot(${i})">读取</button>
                `}
                ${slotData ? `<button class="slot-action-btn secondary" onclick="deleteSaveSlot(${i}, '${mode}')" style="padding:4px 8px;color:#c62828;">✕</button>` : ''}
            </div>
        </div>
        `;
    }

    openModal(`
        <h3>${isSave ? '💾 保存游戏存档' : '📂 读取已有存档'}</h3>
        <div style="max-height:60vh;overflow-y:auto;margin:10px 0;">
            ${slotsHtml}
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">关闭</button>
        </div>
    `);
}

function saveGameToSlot(slotIndex) {
    if (G.phase !== 'playing') { showToast('⚠️ 游戏尚未开始', 'error'); return; }
    try {
        const payload = serializeGameState();
        localStorage.setItem('mcyt_slot_' + slotIndex, JSON.stringify({
            timestamp: new Date().toLocaleString(),
            day: G.day,
            version: CURRENT_APP_VERSION,
            data: payload
        }));
        showToast(`✅ 成功保存到槽位 ${slotIndex}！`, 'success');
        closeModal();
    } catch(e) {
        showToast('❌ 保存失败', 'error');
    }
}

function loadGameFromSlot(slotIndex) {
    try {
        const raw = localStorage.getItem('mcyt_slot_' + slotIndex);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        applyDeserializedGameState(parsed.data);
        _gameInitialized = true;
        G.phase = 'playing';

        const setup = $('setupPage');
        const game = $('gamePage');
        if (setup) {
            setup.classList.remove('active');
            setup.style.display = 'none';
        }
        if (game) {
            game.classList.add('active');
            game.style.display = 'flex';
        }

        updateUI();
        switchTab('story');
        closeModal();
        showToast(`✅ 槽位 ${slotIndex} 载入成功！`, 'success');

        setTimeout(() => {
            if (typeof checkAndShowVersionNoticeModal === 'function') {
                checkAndShowVersionNoticeModal();
            }
        }, 400);
    } catch(e) {
        showToast('❌ 读档失败', 'error');
    }
}

function deleteSaveSlot(slotIndex, mode) {
    if (confirm(`确定要清空槽位 ${slotIndex} 吗？`)) {
        localStorage.removeItem('mcyt_slot_' + slotIndex);
        showToast('🗑️ 槽位已清空', 'info');
        showSaveSlotsModal(mode);
    }
}

// 优雅返回主标题界面的函数，杜绝 WebView 刷新 404 与按键失灵
function confirmExitGame() {
    if (confirm('确认保存并退出当前游戏回到初始界面？')) {
        autoSaveGame();
        G.phase = 'setup';
        _gameInitialized = false;

        const setup = $('setupPage');
        const game = $('gamePage');
        if (game) {
            game.classList.remove('active');
            game.style.display = 'none';
        }
        if (setup) {
            setup.classList.add('active');
            setup.style.display = 'block';
        }

        // 重新激活初始界面的断点恢复横幅
        const autoInfo = getAutoSaveInfo();
        const banner = $('resumeBanner');
        if (banner && autoInfo && autoInfo.data) {
            const d = autoInfo.data;
            banner.style.display = 'block';
            banner.innerHTML = `
                <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px;">▶️ 检测到未完成的游戏进度</div>
                <div style="font-size:12px;color:#666;margin-bottom:10px;">第 ${d.day} 天 · ${d.player?.ytName || ''} · 粉丝 ${d.player?.followers || 0}</div>
                <button type="button" id="resumeAutoSaveBtn" style="padding:8px 18px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:var(--primary);color:#fff;cursor:pointer;">▶️ 继续上次进度</button>
            `;
            $('resumeAutoSaveBtn')?.addEventListener('click', resumeAutoSave);
        }
        showToast('🚪 已安全保存并返回初始界面', 'info', 2000);
    }
}

function serializeGameState() {
    return {
        player: G.player,
        day: G.day,
        timeSlot: G.timeSlot,
        actionPoints: G.actionPoints,
        maxActionPoints: G.maxActionPoints,
        storyHistory: G.storyHistory,
        memorySummaries: G.memorySummaries,
        memoryConfig: G.memoryConfig,
        npcs: G.npcs,
        chatHistory: G.chatHistory,
        groups: G.groups,
        groupChatHistory: G.groupChatHistory,
        groupMemories: G.groupMemories,
        friendRequests: G.friendRequests,
        feed: G.feed,
        fanworks: G.fanworks,
        ao3User: G.ao3User,
        ytUser: G.ytUser,
        ytExternalVideos: G.ytExternalVideos,
        ytCustomChannels: G.ytCustomChannels,
        collections: G.collections,
        memoir: G.memoir,
        unlockedAchievements: G.unlockedAchievements,
        milestoneReached: G.milestoneReached,
        ai: G.ai,
        search: G.search
    };
}

// 🛡️ 深度平滑合并与防丢保障反序列化
function applyDeserializedGameState(data) {
    if (!data) return;

    // 1. 基础标量数据应用
    if (data.player) G.player = Object.assign({}, G.player, data.player);
    if (data.day !== undefined) G.day = data.day;
    if (data.timeSlot !== undefined) G.timeSlot = data.timeSlot;
    if (data.actionPoints !== undefined) G.actionPoints = data.actionPoints;
    if (data.maxActionPoints !== undefined) G.maxActionPoints = data.maxActionPoints;
    if (Array.isArray(data.storyHistory)) G.storyHistory = data.storyHistory;

    // 2. 核心保护：NPC 字典平滑合并（保留老角色、默认角色与所有自建 NPC）
    if (!G.npcs) G.npcs = {};
    const defaultNpcs = (typeof DEFAULT_NPCS !== 'undefined') ? DEFAULT_NPCS : {};
    G.npcs = Object.assign({}, defaultNpcs, G.npcs, data.npcs || {});

    // 3. 核心保护：聊天记录防清空合并
    if (!G.chatHistory) G.chatHistory = {};
    if (data.chatHistory) {
        for (const [k, v] of Object.entries(data.chatHistory)) {
            if (Array.isArray(v) && v.length) {
                G.chatHistory[k] = v;
            }
        }
    }

    // 4. 群聊与公共记忆保护
    if (!G.groups) G.groups = {};
    if (data.groups) G.groups = Object.assign({}, G.groups, data.groups);

    if (!G.groupChatHistory) G.groupChatHistory = {};
    if (data.groupChatHistory) {
        for (const [k, v] of Object.entries(data.groupChatHistory)) {
            if (Array.isArray(v) && v.length) {
                G.groupChatHistory[k] = v;
            }
        }
    }

    if (!G.groupMemories) G.groupMemories = {};
    if (data.groupMemories) G.groupMemories = Object.assign({}, G.groupMemories, data.groupMemories);

    // 5. 记忆与社交动态保护
    if (Array.isArray(data.memorySummaries)) G.memorySummaries = data.memorySummaries;
    if (data.memoryConfig) G.memoryConfig = Object.assign({}, G.memoryConfig, data.memoryConfig);
    if (Array.isArray(data.friendRequests)) G.friendRequests = data.friendRequests;
    if (Array.isArray(data.feed)) G.feed = data.feed;
    if (Array.isArray(data.fanworks)) G.fanworks = data.fanworks;
    if (data.ao3User) G.ao3User = data.ao3User;
    if (data.ytUser) G.ytUser = data.ytUser;
    if (Array.isArray(data.ytExternalVideos)) G.ytExternalVideos = data.ytExternalVideos;
    if (Array.isArray(data.ytCustomChannels)) G.ytCustomChannels = data.ytCustomChannels;
    if (data.collections) G.collections = data.collections;
    if (Array.isArray(data.memoir)) G.memoir = data.memoir;
    if (Array.isArray(data.unlockedAchievements)) G.unlockedAchievements = data.unlockedAchievements;
    if (data.milestoneReached) G.milestoneReached = data.milestoneReached;
    if (data.ai) G.ai = Object.assign({}, G.ai, data.ai);
    if (data.search) G.search = Object.assign({}, G.search, data.search);
}

// 暴露全局
window.initGame = initGame;
window.resumeAutoSave = resumeAutoSave;
window.showStartChoiceModal = showStartChoiceModal;
window.showSaveSlotsModal = showSaveSlotsModal;
window.saveGameToSlot = saveGameToSlot;
window.loadGameFromSlot = loadGameFromSlot;
window.deleteSaveSlot = deleteSaveSlot;
window.confirmExitGame = confirmExitGame;
window.serializeGameState = serializeGameState;
window.applyDeserializedGameState = applyDeserializedGameState;
window.CURRENT_APP_VERSION = CURRENT_APP_VERSION;