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
    else if (d.apiKey || d.apiBaseUrl) { if (d.apiKey) G.ai.apiKey = d.apiKey; if (d.apiBaseUrl) G.ai.baseUrl = d.apiBaseUrl; persistAIConfig(); }
    G.currentStream = null;
    G.isGenerating = false;
}

// 重新将保存的剧情列表渲染回主屏幕（解决读档后页面空白的大 Bug）
function rebuildStoryDOM() {
    if (!dom.storyArea) return;
    dom.storyArea.innerHTML = '';
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

        dom.storyArea.appendChild(block);
    });
    dom.storyArea.scrollTop = dom.storyArea.scrollHeight;
}

// 自动存档核心：支持毫秒级同步写入，防止手机直接杀死 App 丢数据
function autoSaveGame(immediate = false) {
    if (G.phase === 'setup' || !G.player || !G.player.ytName) return;
    const doSave = () => {
        try {
            localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(buildSaveData()));
        } catch (e) { console.warn('自动存档失败', e); }
    };
    if (immediate) {
        doSave();
    } else {
        doSave(); // 手机环境直接立即同步落盘最稳妥
    }
}

// 监听手机切到后台、关闭屏幕瞬间，立刻强制把数据写入 localStorage
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        autoSaveGame(true);
    }
});
window.addEventListener('pagehide', () => autoSaveGame(true));
window.addEventListener('beforeunload', () => autoSaveGame(true));

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
        dom.setupPage.classList.remove('active');
        dom.gamePage.classList.add('active');
        
        // 完整重绘所有的历史剧情和对话
        rebuildStoryDOM();
        
        updateUI();
        switchTab('story');
        renderAllPanels();
        if (!silent) {
            showToast(`▶️ 已继续上次进度！第 ${G.day} 天`, 'success', 2500);
        }
        checkAchievements();
        checkMilestones();
        return true;
    } catch (e) {
        console.error('继续进度失败', e);
        if (!silent) showToast('❌ 继续进度失败，数据可能损坏', 'error');
        return false;
    }
}

function saveGameToSlot(slotIndex) {
    if (slotIndex < 1 || slotIndex > SAVE_SLOT_COUNT) { showToast('无效的存档位', 'error'); return false; }
    try {
        const saveData = buildSaveData();
        const key = getSaveSlotKey(slotIndex);
        localStorage.setItem(key, JSON.stringify(saveData));
        showToast(`✅ 已存档到存档位 ${slotIndex}`, 'success', 2000);
        return true;
    } catch (e) {
        console.error('存档失败', e);
        showToast('❌ 存档失败，请检查存储空间', 'error');
        return false;
    }
}

function loadGameFromSlot(slotIndex) {
    if (slotIndex < 1 || slotIndex > SAVE_SLOT_COUNT) { showToast('无效的存档位', 'error'); return false; }
    const saveData = getSaveSlotInfo(slotIndex);
    if (!saveData) { showToast(`❌ 存档位 ${slotIndex} 为空`, 'error'); return false; }
    try {
        applySaveData(saveData.data);
        dom.setupPage.classList.remove('active');
        dom.gamePage.classList.add('active');
        
        // 重绘主界面历史剧情
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
        console.error('读档失败', e);
        showToast('❌ 读档失败，数据可能已损坏', 'error');
        return false;
    }
}

function hasAnySaveData() {
    if (getAutoSaveInfo()) return true;
    for (let i = 1; i <= SAVE_SLOT_COUNT; i++) { if (getSaveSlotInfo(i)) return true; }
    return false;
}

function showSaveSlotsModal(mode, exitAfter = false) {
    const isSave = mode === 'save';
    const title = isSave ? (exitAfter ? '💾 保存后退出' : '💾 存档') : '📂 读档';
    const desc = isSave ? '选择一个存档位保存当前游戏进度。' : '选择一个存档位读取游戏进度。';
    const autoInfo = !isSave ? getAutoSaveInfo() : null;
    let autoHtml = '';
    if (autoInfo) {
        const d = autoInfo.data;
        autoHtml = `
        <div class="save-slot-item" id="autoSaveLoadItem" style="border-color:var(--primary);">
            <div class="slot-info">
                <div class="slot-label">⏱️ 自动存档（继续上次）</div>
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
        const detail = hasSave ? `第${info.data.day}天 · 粉丝 ${info.data.player.followers} · ${info.data.player.ytName}` :
            '暂无存档';
        const actionLabel = isSave ? (hasSave ? '覆盖' : '存档') : (hasSave ? '读档' : '空');
        const disabled = !isSave && !hasSave;
        slotsHtml += `
        <div class="save-slot-item" data-slot="${i}">
            <div class="slot-info">
                <div class="slot-label">📁 存档位 ${i}</div>
                <div class="slot-detail">${detail}</div>
                <div style="font-size:10px;color:var(--text2);">${timeStr}</div>
            </div>
            <button class="slot-action-btn ${disabled ? 'secondary' : ''}" data-slot="${i}" ${disabled ? 'disabled' : ''}>
                ${actionLabel}
            </button>
        </div>
        `;
    }
    const html = `
    <h3>${title}</h3>
    <p>${desc}</p>
    <div style="margin: 12px 0;">
        ${autoHtml}
        ${slotsHtml}
    </div>
    <div class="btn-row">
        <button class="btn-secondary" onclick="closeModal()">取消</button>
    </div>
    `;
    openModal(html);
    document.getElementById('autoSaveLoadBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        closeModal();
        resumeAutoSave();
    });
    document.querySelectorAll('.save-slot-item .slot-action-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const slot = parseInt(this.dataset.slot);
            if (!slot) return;
            if (isSave) {
                closeModal();
                if (saveGameToSlot(slot)) {
                    if (exitAfter) {
                        showToast('✅ 已保存，正在退出...', 'success', 1500);
                        setTimeout(() => { tryNativeExit(); }, 700);
                    } else {
                        setTimeout(() => showSaveSlotsModal('load'), 400);
                    }
                }
            } else {
                if (loadGameFromSlot(slot)) {
                    closeModal();
                }
            }
        });
    });
    document.querySelectorAll('.save-slot-item[data-slot]').forEach(item => {
        item.addEventListener('click', function() {
            const btn = this.querySelector('.slot-action-btn');
            if (btn && !btn.disabled) btn.click();
        });
    });
}

// ============================================================
// 退出游戏
// ============================================================
function tryNativeExit() {
    try { if (window.Android && typeof window.Android.exitApp === 'function') { window.Android.exitApp(); return true; } } catch (e) {}
    try { if (window.android && typeof window.android.exitApp === 'function') { window.android.exitApp(); return true; } } catch (e) {}
    try { if (window.ToApp && typeof window.ToApp.exit === 'function') { window.ToApp.exit(); return true; } } catch (e) {}
    try { if (window.toapp && typeof window.toapp.exitApp === 'function') { window.toapp.exitApp(); return true; } } catch (e) {}
    try { if (window.AndroidBridge && typeof window.AndroidBridge.exitApp === 'function') { window.AndroidBridge.exitApp(); return true; } } catch (e) {}
    try { if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.exitApp) { window.webkit.messageHandlers.exitApp.postMessage('exit'); return true; } } catch (e) {}
    try { window.close(); } catch (e) {}
    setTimeout(() => {
        showToast('⚠️ 未能自动退出，请使用系统返回键/最近任务关闭本应用', 'error', 4000);
    }, 500);
    return false;
}

function confirmExitGame() {
    autoSaveGame(true); // 退出弹窗前先强保一次
    const canSave = !!(G.player && G.player.ytName) && G.phase !== 'setup';
    openModal(`
        <h3 style="margin-bottom:10px;">🚪 退出游戏</h3>
        <p style="font-size:13px;color:#666;line-height:1.6;">
            ${canSave ? '系统已自动保存你的当前进度。是否手动写入额外存档位，或直接退出？' : '确定要退出吗？'}
        </p>
        <div class="btn-row" style="margin-top:14px;flex-direction:column;gap:8px;">
            ${canSave ? `<button class="btn-primary" id="exitSaveBtn" style="width:100%;">💾 写入存档位后退出</button>` : ''}
            <button class="btn-secondary" id="exitNoSaveBtn" style="width:100%;">🚪 直接退出应用</button>
            <button class="btn-secondary" id="exitCancelBtn" style="width:100%;">取消</button>
        </div>
    `);
    document.getElementById('exitSaveBtn')?.addEventListener('click', () => {
        closeModal();
        setTimeout(() => showSaveSlotsModal('save', true), 200);
    });
    document.getElementById('exitNoSaveBtn')?.addEventListener('click', () => {
        closeModal();
        tryNativeExit();
    });
    document.getElementById('exitCancelBtn')?.addEventListener('click', () => closeModal());
}

// ============================================================
// 启动检测：开机自动恢复进度
// ============================================================
function checkAutoResumeOnBoot() {
    const autoInfo = getAutoSaveInfo();
    if (autoInfo && autoInfo.data && autoInfo.data.player && autoInfo.data.player.ytName && autoInfo.data.phase === 'playing') {
        // 如果发现有未完成的游戏进度，直接秒恢复现场！
        setTimeout(() => {
            resumeAutoSave(true);
            showToast(`🎮 欢迎回来，${G.player.ytName}！已自动恢复进度`, 'success', 2500);
        }, 100);
        return true;
    }
    return false;
}

function showStartChoiceModal(fromBoot = false) {
    const html = `
    <h3>🎮 欢迎回来</h3>
    <p style="font-size:14px;color:var(--text);">选择你的冒险方式：</p>
    <div class="start-choice-grid">
        <div class="choice-card" id="choiceNew">
            <span class="big-icon">✨</span>
            <div class="choice-label">新记忆</div>
            <div class="choice-desc">开启一段全新的主播生涯</div>
        </div>
        <div class="choice-card" id="choiceLoad">
            <span class="big-icon">📂</span>
            <div class="choice-label">往日回忆</div>
            <div class="choice-desc">读取已保存的存档继续</div>
        </div>
    </div>
    <div style="margin-top:8px;font-size:12px;color:var(--text2);text-align:center;">
        ${G.ai.apiKey ? '✅ API Key 已配置' : '⚠️ 请先填写 API Key'}
    </div>
    `;
    openModal(html);
    document.getElementById('choiceNew').addEventListener('click', function() {
        closeModal();
        if (fromBoot) {
            _skipStartChoiceOnce = true;
            showToast('✨ 请填写你的人设信息，然后点击下方按钮开始新的冒险', 'success', 3500);
            setTimeout(() => { $('setupApiKeyInput')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 200);
        } else {
            initGame();
        }
    });
    document.getElementById('choiceLoad').addEventListener('click', function() {
        closeModal();
        showSaveSlotsModal('load');
    });
}
let _skipStartChoiceOnce = false;

// ============================================================
// 初始化新游戏
// ============================================================
let _gameInitialized = false;

function initGame() {
    applyAIConfigFromUI('setup');
    if (!G.ai.apiKey) { showToast('⚠️ 请先填入 API Key');
        $('setupApiKeyInput').focus(); return; }
    if (!G.ai.baseUrl) { showToast('⚠️ 请先填入 API Base URL');
        $('setupBaseUrlInput').focus(); return; }
    if (!G.ai.model) { showToast('⚠️ 请先选择或填写模型');
        $('setupModelInput').focus(); return; }
    const identity = getRadioValue('identityGroup') || 'new';
    const age = parseInt(dom.age.value) || 18;
    const ytName = dom.ytName.value.trim() || 'MC_CraftMaster';
    const persona = dom.persona.value.trim() || '一位充满活力的冒险家';
    const skin = dom.skin.value.trim() || '钻石甲，金色头盔';
    const category = dom.category.value || '剧情';
    const skillBuilding = parseInt(document.getElementById('skillBuildingNum').value) || 0;
    const skillRedstone = parseInt(document.getElementById('skillRedstoneNum').value) || 0;
    const skillPvp = parseInt(document.getElementById('skillPvpNum').value) || 0;
    const skillSurvival = parseInt(document.getElementById('skillSurvivalNum').value) || 0;
    const skillHunting = parseInt(document.getElementById('skillHuntingNum').value) || 0;
    let extraBuilding = 0,
        extraRedstone = 0,
        extraPvp = 0,
        extraSurvival = 0,
        extraHunting = 0;
    const lower = persona.toLowerCase();
    if (lower.includes('红石') || lower.includes('红石大神')) extraRedstone += 10;
    if (lower.includes('pvp') || lower.includes('战斗') || lower.includes('战神')) extraPvp += 10;
    if (lower.includes('建筑') || lower.includes('建造大师') || lower.includes('建筑师')) extraBuilding += 10;
    if (lower.includes('生存') || lower.includes('老生存')) extraSurvival += 10;
    if (lower.includes('追杀') || lower.includes('猎手')) extraHunting += 10;
    const finalSkills = {
        building: Math.min(100, skillBuilding + extraBuilding),
        redstone: Math.min(100, skillRedstone + extraRedstone),
        pvp: Math.min(100, skillPvp + extraPvp),
        survival: Math.min(100, skillSurvival + extraSurvival),
        hunting: Math.min(100, skillHunting + extraHunting),
    };
    const p = G.player;
    p.identity = identity;
    p.age = age;
    p.gender = '女';
    p.ytName = ytName;
    p.persona = persona;
    p.skin = skin;
    p.category = category;
    p.isStudent = age >= 12 && age <= 24;
    p.isVacation = true;
    p.personaStyle = detectPersonaStyle(persona);
    if (identity === 'new') { p.followers = rand(2, 20);
        p.money = rand(0, 50);
        p.likes = 0; } else if (identity === 'fans') { p.followers = rand(2000, 5000);
        p.money = rand(100, 500);
        p.likes = rand(50, 200);
        if (p.followers >= 1000) G.milestoneReached.push(1000); } else if (identity === 'veteran') { p.followers =
            rand(300000, 800000);
        p.money = rand(5000, 20000);
        p.likes = rand(5000, 20000);
        for (const sk of ['building', 'redstone', 'pvp', 'survival', 'hunting']) {
            finalSkills[sk] = Math.min(100, (finalSkills[sk] || 0) + rand(10, 30));
        }
        if (p.followers >= 1000) G.milestoneReached.push(1000);
        if (p.followers >= 10000) G.milestoneReached.push(10000);
        if (p.followers >= 100000) G.milestoneReached.push(100000); }
    p.skills = finalSkills;
    p.friends = [];
    p.videos = [];
    p.streams = [];
    p.dms = [];
    p.fanClubLevel = 0;
    p.streamHistory = [];
    if (!p.avatar) p.avatar = null;
    p.equipmentLevel = 1;
    p.metDream = false;
    p.lovers = [];
    for (const [id, npc] of Object.entries(G.npcs)) {
        npc.favor = npc.initialFavor || 0;
        npc._confessed = false;
        npc._relationship = 'single';
    }
    G.chatHistory = {};
    G._chatMsgId = 0;
    G.fanworks = [];
    G.fanclubMessages = [];
    G._fanworkId = 0;
    G._fanclubMsgId = 0;
    G.currentChatNpc = null;
    G.confessionState = null;
    G._lastBriefing = null;
    G.collections = {};
    G.memoir = [];
    G._logId = 0;
    G._npcDailyConfession = {};
    G.feed = [];
    G.feedIdCounter = 0;
    G.unlockedAchievements = [];
    G.sponsorOffers = [];
    G.sponsorCooldown = 0;
    G.milestoneReached = [];
    G._npcInitiatedToday = {};
    G.day = 1;
    G.timeSlot = 0;
    G.actionPoints = 6;
    G.maxActionPoints = 6;
    G.storyHistory = [];
    G.memorySummaries = [];
    G.usedThemes = new Set();
    G.totalVideos = 0;
    G.totalStreams = 0;
    G.totalCollabs = 0;
    G.totalDMs = 0;
    G.currentStream = null;
    G.phase = 'playing';
    dom.setupPage.classList.remove('active');
    dom.gamePage.classList.add('active');
    dom.storyArea.innerHTML = '';
    const intro =
        `🎬 欢迎，${p.ytName}！\n\n你是一位 ${identity === 'new' ? '新晋' : identity === 'fans' ? '小有名气的' : '经验丰富的老牌'} MC 主播，擅长 ${p.category} 赛道。\n你的皮上形象是：${p.persona}，皮肤是：${p.skin}。\n\n今天是你在 MC 油管世界的第 1 天，${p.isStudent ? '你是一名学生，正值暑假' : '你是一位自由创作者'}。\n你有 ${G.maxActionPoints} 个行动点（每2点推进一个时段），规划你的主播生涯吧！\n\n💡 点击「🔴 直播」Tab 开启直播，或使用下方按钮进行日常活动。\n\n👾 你注意到了多位知名主播，包括神秘大神 Dream、活力南瓜 Whispy 等。`;
    appendStory(intro, '🎮 游戏开始');
    addMemoir('游戏开始', `${p.ytName} 开始了主播生涯`);
    switchTab('story');
    updateUI();
    showToast('🎉 游戏已启动！', 'success', 2000);
    for (let i = 0; i < 3; i++) { generateFeedEvents(); }
    if (document.querySelector('.tab-btn.active')?.dataset.tab === 'feed') renderFeed();
    checkAchievements();
    _gameInitialized = true;
    autoSaveGame(true); // 开局立刻存一次
}

// 启动时挂载自动恢复检测
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        checkAutoResumeOnBoot();
    }, 150);
});
// ============================================================