// 存档 / 读档 功能
// ============================================================
const SAVE_SLOT_COUNT = 3;
const STORAGE_PREFIX = 'mc_yt_save_';
const AUTO_SAVE_KEY = 'mc_yt_autosave';

function getSaveSlotKey(slotIndex) {
    return STORAGE_PREFIX + slotIndex;
}

function getSaveSlotInfo(slotIndex) {
    const key = getSaveSlotKey(slotIndex);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
        const data = JSON.parse(raw);
        if (data && data.version && data.data) {
            return data;
        }
        return null;
    } catch (e) { return null; }
}

function buildSaveData() {
    return {
        version: '6.0',
        timestamp: Date.now(),
        data: {
            player: G.player,
            day: G.day,
            timeSlot: G.timeSlot,
            actionPoints: G.actionPoints,
            maxActionPoints: G.maxActionPoints,
            phase: G.phase,
            storyHistory: G.storyHistory,
            memorySummaries: G.memorySummaries,
            memorySummarySettings: G.memorySummarySettings,
            usedThemes: Array.from(G.usedThemes || []),
            totalVideos: G.totalVideos,
            totalStreams: G.totalStreams,
            totalCollabs: G.totalCollabs,
            totalDMs: G.totalDMs,
            npcs: G.npcs,
            chatHistory: G.chatHistory,
            _chatMsgId: G._chatMsgId,
            fanworks: G.fanworks,
            fanclubMessages: G.fanclubMessages,
            _fanworkId: G._fanworkId,
            _fanclubMsgId: G._fanclubMsgId,
            currentChatNpc: G.currentChatNpc,
            currentChatGroup: G.currentChatGroup,
            chatActiveTab: G.chatActiveTab,
            phoneNav: G.phoneNav,
            groups: G.groups,
            groupChatHistory: G.groupChatHistory,
            friendRequests: G.friendRequests,
            momentsFilterNpcId: G.momentsFilterNpcId,
            confessionState: G.confessionState,
            _lastBriefing: G._lastBriefing,
            collections: G.collections,
            memoir: G.memoir,
            _logId: G._logId,
            _npcDailyConfession: G._npcDailyConfession,
            feed: G.feed,
            feedIdCounter: G.feedIdCounter,
            unlockedAchievements: G.unlockedAchievements,
            sponsorOffers: G.sponsorOffers,
            sponsorCooldown: G.sponsorCooldown,
            milestoneReached: G.milestoneReached,
            _npcInitiatedToday: G._npcInitiatedToday,
            ai: G.ai,
        }
    };
}

function applySaveData(d) {
    G.player = d.player;
    G.day = d.day;
    G.timeSlot = d.timeSlot;
    G.actionPoints = d.actionPoints;
    G.maxActionPoints = d.maxActionPoints;
    G.phase = d.phase || 'playing';
    G.storyHistory = d.storyHistory || [];
    G.memorySummaries = d.memorySummaries || [];
    if (d.memorySummarySettings) Object.assign(G.memorySummarySettings, d.memorySummarySettings);
    G.usedThemes = new Set(d.usedThemes || []);
    G.totalVideos = d.totalVideos || 0;
    G.totalStreams = d.totalStreams || 0;
    G.totalCollabs = d.totalCollabs || 0;
    G.totalDMs = d.totalDMs || 0;
    G.npcs = d.npcs || {};
    G.chatHistory = d.chatHistory || {};
    G._chatMsgId = d._chatMsgId || 0;
    G.fanworks = d.fanworks || [];
    G.fanclubMessages = d.fanclubMessages || [];
    G._fanworkId = d._fanworkId || 0;
    G._fanclubMsgId = d._fanclubMsgId || 0;
    G.currentChatNpc = d.currentChatNpc || null;
    G.currentChatGroup = d.currentChatGroup || null;
    G.chatActiveTab = d.chatActiveTab || 'direct';
    G.phoneNav = d.phoneNav || 'chats';
    G.groups = d.groups || {};
    G.groupChatHistory = d.groupChatHistory || {};
    G.friendRequests = d.friendRequests || [];
    G.momentsFilterNpcId = d.momentsFilterNpcId || null;
    G.confessionState = d.confessionState || null;
    G._lastBriefing = d._lastBriefing || null;
    G.collections = d.collections || {};
    G.memoir = d.memoir || [];
    G._logId = d._logId || 0;
    G._npcDailyConfession = d._npcDailyConfession || {};
    G.feed = d.feed || [];
    G.feedIdCounter = d.feedIdCounter || 0;
    G.unlockedAchievements = d.unlockedAchievements || [];
    G.sponsorOffers = d.sponsorOffers || [];
    G.sponsorCooldown = d.sponsorCooldown || 0;
    G.milestoneReached = d.milestoneReached || [];
    G._npcInitiatedToday = d._npcInitiatedToday || {};
    if (d.ai) { Object.assign(G.ai, d.ai); persistAIConfig(); }
    G.currentStream = null;
    G.isGenerating = false;
}

function rebuildStoryDOM() {
    const area = $('storyArea');
    if (!area) return;
    area.innerHTML = '';
    if (!G.storyHistory || !G.storyHistory.length) return;

    G.storyHistory.forEach(h => {
        const block = document.createElement('div');
        block.className = 'story-block';
        block.dataset.storyId = h._id || ('sb_' + Math.random());

        const meta = document.createElement('div');
        meta.className = 'meta';
        const timeStr = `第${h.day || G.day}天 · ${getTimeSlotName(h.time !== undefined ? h.time : G.timeSlot)}`;
        meta.innerHTML = `<span>${timeStr}</span><span class="tag">${escapeHtml(h.tag || '📖 剧情')}</span>` +
            (h.archived ? `<span class="tag archived-badge" style="background:#eee;color:#888;">🗄 已归档</span>` : '') +
            (h.truncated ? `<span class="tag" style="background:#fff3e0;color:#e65100;">⚠️ 可能被截断</span>` : '');
        block.appendChild(meta);

        const content = document.createElement('div');
        content.className = 'story-content';
        content.innerHTML = renderContentWithThoughts(h.text || '');
        block.appendChild(content);

        area.appendChild(block);
    });
    area.scrollTop = area.scrollHeight;
}

function autoSaveGame() {
    if (G.phase === 'setup' || !G.player || !G.player.ytName) return;
    try {
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(buildSaveData()));
    } catch (e) { console.warn('自动存档失败', e); }
}

window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') autoSaveGame();
});
window.addEventListener('pagehide', () => autoSaveGame());
window.addEventListener('beforeunload', () => autoSaveGame());

function getAutoSaveInfo() {
    try {
        const raw = localStorage.getItem(AUTO_SAVE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (data && data.version && data.data) return data;
        return null;
    } catch (e) { return null; }
}

function resumeAutoSave(silent = false) {
    const saveData = getAutoSaveInfo();
    if (!saveData) {
        if (!silent) showToast('❌ 没有可继续的进度', 'error');
        return false;
    }
    try {
        applySaveData(saveData.data);
        $('setupPage')?.classList.remove('active');
        $('gamePage')?.classList.add('active');
        rebuildStoryDOM();
        updateUI();
        switchTab('story');
        renderAllPanels();
        if (!silent) showToast(`▶️ 已继续上次进度！第 ${G.day} 天`, 'success', 2500);
        checkAchievements();
        checkMilestones();
        return true;
    } catch (e) {
        console.error('继续进度失败', e);
        if (!silent) showToast('❌ 数据损坏', 'error');
        return false;
    }
}

function saveGameToSlot(slotIndex) {
    if (slotIndex < 1 || slotIndex > SAVE_SLOT_COUNT) { showToast('无效的存档位', 'error'); return false; }
    try {
        const saveData = buildSaveData();
        localStorage.setItem(getSaveSlotKey(slotIndex), JSON.stringify(saveData));
        showToast(`✅ 已保存到存档位 ${slotIndex}`, 'success', 2000);
        return true;
    } catch (e) {
        showToast('❌ 存档失败', 'error');
        return false;
    }
}

function loadGameFromSlot(slotIndex) {
    if (slotIndex < 1 || slotIndex > SAVE_SLOT_COUNT) { showToast('无效的存档位', 'error'); return false; }
    const saveData = getSaveSlotInfo(slotIndex);
    if (!saveData) { showToast(`❌ 存档位 ${slotIndex} 为空`, 'error'); return false; }
    try {
        applySaveData(saveData.data);
        $('setupPage')?.classList.remove('active');
        $('gamePage')?.classList.add('active');
        rebuildStoryDOM();
        addMemoir('读档', `从存档位 ${slotIndex} 读取`);
        updateUI();
        switchTab('story');
        renderAllPanels();
        showToast(`📂 读档成功！第 ${G.day} 天`, 'success', 3000);
        checkAchievements();
        checkMilestones();
        return true;
    } catch (e) {
        showToast('❌ 读档失败', 'error');
        return false;
    }
}

function hasAnySaveData() {
    if (getAutoSaveInfo()) return true;
    for (let i = 1; i <= SAVE_SLOT_COUNT; i++) { if (getSaveSlotInfo(i)) return true; }
    return false;
}

function showSaveSlotsModal(mode) {
    const isSave = mode === 'save';
    const title = isSave ? '💾 存档管理' : '📂 读取存档';
    const autoInfo = !isSave ? getAutoSaveInfo() : null;
    let autoHtml = '';
    if (autoInfo) {
        const d = autoInfo.data;
        autoHtml = `
        <div class="save-slot-item" id="autoSaveLoadItem" style="border-color:var(--primary);">
            <div class="slot-info">
                <div class="slot-label">⏱️ 自动存档（断点续玩）</div>
                <div class="slot-detail">第${d.day}天 · 粉丝 ${d.player?.followers || 0} · ${d.player?.ytName || ''}</div>
                <div style="font-size:10px;color:var(--text2);">${new Date(autoInfo.timestamp).toLocaleString()}</div>
            </div>
            <button class="slot-action-btn" id="autoSaveLoadBtn">继续</button>
        </div>`;
    }
    let slotsHtml = '';
    for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
        const info = getSaveSlotInfo(i);
        const hasSave = info !== null;
        const timeStr = hasSave ? new Date(info.timestamp).toLocaleString() : '空存档位';
        const detail = hasSave ? `第${info.data.day}天 · 粉丝 ${info.data.player.followers} · ${info.data.player.ytName}` : '暂无存档';
        const actionLabel = isSave ? (hasSave ? '覆盖' : '存档') : (hasSave ? '读档' : '空');
        const disabled = !isSave && !hasSave;
        slotsHtml += `
        <div class="save-slot-item" data-slot="${i}">
            <div class="slot-info">
                <div class="slot-label">📁 存档位 ${i}</div>
                <div class="slot-detail">${detail}</div>
                <div style="font-size:10px;color:var(--text2);">${timeStr}</div>
            </div>
            <button class="slot-action-btn ${disabled ? 'secondary' : ''}" data-slot="${i}" ${disabled ? 'disabled' : ''}>${actionLabel}</button>
        </div>`;
    }
    openModal(`
        <h3>${title}</h3>
        <div style="margin: 12px 0;">${autoHtml}${slotsHtml}</div>
        <div class="btn-row"><button class="btn-secondary" onclick="closeModal()">取消</button></div>
    `);
    document.getElementById('autoSaveLoadBtn')?.addEventListener('click', () => {
        closeModal();
        resumeAutoSave();
    });
    document.querySelectorAll('.save-slot-item .slot-action-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const slot = parseInt(this.dataset.slot);
            if (!slot) return;
            if (isSave) {
                saveGameToSlot(slot);
                closeModal();
            } else {
                loadGameFromSlot(slot);
                closeModal();
            }
        });
    });
}

// ============================================================
// 核心改造：退出游戏直接静默保存，并立刻返回初始创建人设页面
// ============================================================
function confirmExitGame() {
    autoSaveGame(); // 离开前静默把当前进度存好，下次可在初始页一键恢复
    G.phase = 'setup';
    closeModal();
    // 切换回 setup 初始开局页
    $('gamePage')?.classList.remove('active');
    $('setupPage')?.classList.add('active');
    // 重新刷新初始页的自动存档横幅
    const autoInfo = getAutoSaveInfo();
    const banner = $('resumeBanner');
    if (banner && autoInfo && autoInfo.data) {
        const d = autoInfo.data;
        banner.style.display = 'block';
        banner.innerHTML = `
            <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px;">▶️ 检测到上次未完成的生涯</div>
            <div style="font-size:12px;color:#666;margin-bottom:10px;">第 ${d.day} 天 · ${d.player?.ytName || ''} · 粉丝 ${d.player?.followers || 0}</div>
            <button type="button" id="resumeAutoSaveBtn" style="padding:8px 18px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:var(--primary);color:#fff;cursor:pointer;">▶️ 继续上次进度</button>
        `;
        $('resumeAutoSaveBtn')?.addEventListener('click', resumeAutoSave);
    }
    showToast('🚪 已退出并返回初始创建界面', 'success', 2000);
}

function checkAutoResumeOnBoot() {
    const autoInfo = getAutoSaveInfo();
    if (autoInfo && autoInfo.data && autoInfo.data.player && autoInfo.data.player.ytName && autoInfo.data.phase === 'playing') {
        setTimeout(() => {
            resumeAutoSave(true);
            showToast(`🎮 欢迎回来，${G.player.ytName}！已自动恢复进度`, 'success', 2500);
        }, 100);
        return true;
    }
    return false;
}

let _skipStartChoiceOnce = false;
let _gameInitialized = false;

function initGame() {
    applyAIConfigFromUI('setup');
    if (!G.ai.apiKey) { showToast('⚠️ 请先填入 API Key'); $('setupApiKeyInput')?.focus(); return; }
    if (!G.ai.baseUrl) { showToast('⚠️ 请先填入 API Base URL'); $('setupBaseUrlInput')?.focus(); return; }
    if (!G.ai.model) { showToast('⚠️ 请先选择或填写模型'); $('setupModelInput')?.focus(); return; }

    const identity = getRadioValue('identityGroup') || 'new';
    const age = parseInt($('ageInput')?.value) || 18;
    const ytName = $('ytNameInput')?.value.trim() || 'MC_CraftMaster';
    const persona = $('personaInput')?.value.trim() || '一位充满活力的冒险家';
    const skin = $('skinInput')?.value.trim() || '钻石甲，金色头盔';
    const category = $('categorySelect')?.value || '剧情';

    const skillBuilding = parseInt($('skillBuildingNum')?.value) || 20;
    const skillRedstone = parseInt($('skillRedstoneNum')?.value) || 20;
    const skillPvp = parseInt($('skillPvpNum')?.value) || 20;
    const skillSurvival = parseInt($('skillSurvivalNum')?.value) || 20;
    const skillHunting = parseInt($('skillHuntingNum')?.value) || 20;

    const p = G.player;
    p.identity = identity;
    p.age = age;
    p.gender = '女';
    p.ytName = ytName;
    p.persona = persona;
    p.skin = skin;
    p.category = category;
    p.skills = { building: skillBuilding, redstone: skillRedstone, pvp: skillPvp, survival: skillSurvival, hunting: skillHunting };
    p.followers = identity === 'new' ? 10 : (identity === 'fans' ? 3000 : 500000);
    p.money = identity === 'new' ? 20 : (identity === 'fans' ? 200 : 8000);
    p.likes = 0;
    p.videos = [];
    p.streams = [];
    p.streamHistory = [];
    p.friends = [];
    p.lovers = [];

    G.day = 1;
    G.timeSlot = 0;
    G.actionPoints = 6;
    G.storyHistory = [];
    G.memorySummaries = [];
    G.usedThemes = new Set();
    G.chatHistory = {};
    G.groups = {};
    G.groupChatHistory = {};
    G.friendRequests = [];
    G.memoir = [];
    G.phase = 'playing';

    $('setupPage')?.classList.remove('active');
    $('gamePage')?.classList.add('active');
    
    const area = $('storyArea');
    if (area) area.innerHTML = '';
    appendStory(`🎬 欢迎，${p.ytName}！\n\n你开启了全新的主播生涯。作为一名 ${p.category} 赛道的创作者，今天是你探索 MC 油管世界的第一天！`, '🎮 游戏开始');
    addMemoir('游戏开始', `${p.ytName} 开启了主播生涯`);
    updateUI();
    switchTab('story');
    showToast('🎉 新冒险已开启！', 'success', 2000);
    _gameInitialized = true;
    autoSaveGame();
}

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        checkAutoResumeOnBoot();
    }, 150);
});
// ============================================================