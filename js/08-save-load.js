// 存档/读档/初始化模块（v1.502 全量数据保护与大小号系统兼容版）
// ============================================================
const CURRENT_APP_VERSION = '1.502';

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

    // 视图平滑流转
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

    // 新档初始化：初始通讯录为空，但为新手提供第一封来自粉丝的破冰申请
    if (!G.npcs || Object.keys(G.npcs).length === 0) {
        G.npcs = {};
        if (!G.friendRequests || G.friendRequests.length === 0) {
            G.friendRequests = [{
                _id: 'freq_init_' + Date.now(),
                name: '狂热苦力怕',
                fromReason: '粉丝日常来信',
                persona: '你的忠实小迷弟，特别喜欢看你录的MC视频！',
                avatarEmoji: '🟢',
                day: 1
            }];
        }
    }

    updateUI();
    if (!G.storyHistory || G.storyHistory.length === 0) {
        appendInitialWelcomeStory();
    }
    switchTab('story');
    autoSaveGame();

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
        `💡 提示：新人主播在联系人列表中初始没有大主播好友，随着你提升粉丝热度与作品曝光，主播们与粉丝们会主动向你递来好友申请与粉丝群邀请！`;
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
        showToast('⚠️ 自动保存失败，建议立刻点击「备份」下载存档', 'error', 5000);
    }
}

// 打开备份流程
function openBackupModal() {
    let payload, day, ytName;
    if (G.phase === 'playing') {
        payload = serializeGameState();
        day = G.day;
        ytName = G.player?.ytName;
    } else {
        const info = getAutoSaveInfo();
        if (!info || !info.data) {
            showToast('⚠️ 未找到可导出的存档数据', 'error');
            return;
        }
        payload = info.data;
        day = info.day;
        ytName = info.data.player?.ytName;
    }

    const exportPayload = {
        timestamp: new Date().toLocaleString(),
        day: day,
        version: CURRENT_APP_VERSION,
        data: payload
    };

    if (window.ImageBackup && typeof window.ImageBackup.startGenerateBackupWithModal === 'function') {
        window.ImageBackup.startGenerateBackupWithModal(exportPayload);
    } else {
        showToast('⚠️ 备份模块未就绪，请刷新重试', 'error');
    }
}

// 打开恢复流程（支持选取 .png 存档图、.json 文件）
function openRestoreModal() {
    let fileInput = document.getElementById('restoreJsonFileInputDynamic');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.id = 'restoreJsonFileInputDynamic';
        fileInput.type = 'file';
        fileInput.accept = '.json,image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        fileInput.addEventListener('change', function() {
            const file = this.files && this.files[0];
            if (!file) return;
            _restoreFromSelectedFile(file);
            this.value = '';
        });
    }
    fileInput.click();
}

// 从选中的文件恢复存档
function _restoreFromSelectedFile(file) {
    showToast('⏳ 正在读取存档文件...', 'info', 2000);

    const isImage = file.type.indexOf('image/') === 0 || file.name.toLowerCase().endsWith('.png') || file.name.toLowerCase().endsWith('.jpg');

    if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            const uint8 = new Uint8Array(arrayBuffer);
            try {
                if (window.ImageBackup && typeof window.ImageBackup.extractSaveFromPngBytes === 'function') {
                    const parsed = window.ImageBackup.extractSaveFromPngBytes(uint8);
                    const stateData = (parsed && parsed.data) ? parsed.data : parsed;
                    _applyImportedStateData(stateData);
                } else {
                    throw new Error('图片解析引擎未就绪');
                }
            } catch (err) {
                console.error('PNG 元数据解析失败，尝试旧版像素解析...', err);
                _fallbackOldImageRestore(file);
            }
        };
        reader.onerror = () => showToast('❌ 图片读取失败', 'error');
        reader.readAsArrayBuffer(file);
    } else {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result.trim();
                let parsed = JSON.parse(text);
                const stateData = (parsed && parsed.data) ? parsed.data : parsed;
                if (!stateData || (!stateData.player && !stateData.npcs)) {
                    throw new Error('JSON 中不包含有效的游戏数据');
                }
                _applyImportedStateData(stateData);
            } catch (err) {
                console.error('JSON 解析失败', err);
                alert('❌ 导入失败：' + err.message + '\n请确认选择的是正确的存档文件。');
            }
        };
        reader.onerror = () => showToast('❌ 文件读取失败', 'error');
        reader.readAsText(file, 'utf-8');
    }
}

// 兼容旧版噪点图恢复兜底
function _fallbackOldImageRestore(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        if (window.ImageBackup && typeof window.ImageBackup.decodeDataUrlToSave === 'function') {
            window.ImageBackup.decodeDataUrlToSave(dataUrl, (err, res) => {
                if (err || !res) {
                    alert('❌ 该图片不包含可识别的存档数据！\n请确认选取的是本游戏导出的存档图片原图。');
                } else {
                    const stateData = (res && res.data) ? res.data : res;
                    _applyImportedStateData(stateData);
                }
            });
        } else {
            alert('❌ 无法识别该图片文件');
        }
    };
    reader.readAsDataURL(file);
}

// 🛡️ 导入落地：深度平滑合并 + 强弹窗提示
function _applyImportedStateData(stateData) {
    if (!stateData || (!stateData.player && !stateData.npcs)) {
        alert('❌ 存档数据损坏或为空，导入终止！');
        return;
    }

    if (_gameInitialized && !confirm('检测到已有游玩进度，导入将合并存档（自建角色、联系人通讯录、剧情与小号完整继承），确定导入吗？')) {
        return;
    }

    applyDeserializedGameState(stateData);
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
    autoSaveGame();

    const npcCount = Object.keys(G.npcs || {}).length;
    const chatCount = Object.values(G.chatHistory || {}).reduce((acc, cur) => acc + (cur.length || 0), 0);
    const dayVal = G.day || 1;
    const nameVal = G.player?.ytName || '主角';

    if (typeof openModal === 'function') {
        openModal(`
            <div style="text-align:center;padding:10px 0;">
                <div style="font-size:42px;margin-bottom:8px;">🎉</div>
                <h3 style="color:#16a34a;margin-bottom:10px;">存档导入成功！</h3>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;font-size:13px;color:#166534;line-height:1.8;text-align:left;margin-bottom:16px;">
                    <div>👤 <b>主播名称</b>：${escapeHtml(nameVal)}</div>
                    <div>📅 <b>游戏进度</b>：第 ${dayVal} 天</div>
                    <div>👥 <b>角色通讯录</b>：已完整找回 ${npcCount} 位联系人</div>
                    <div>💬 <b>聊天记忆</b>：已还原 ${chatCount} 条完整对话</div>
                    <div>📱 <b>账号生态</b>：大号与 ${(G.altAccounts||[]).length} 个小号数据已就绪</div>
                </div>
                <button class="btn-primary" onclick="closeModal()" style="width:100%;padding:10px;">进入游戏</button>
            </div>
        `);
    } else {
        alert(`✅ 存档导入成功！\n\n已为您还原：\n- 主播：${nameVal}\n- 进度：第 ${dayVal} 天\n- 联系人：${npcCount} 位\n- 对话记录：${chatCount} 条`);
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

// 🛡️ 全量数据打包：支持大小号生态、拉黑关系与邀请池
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
        currentAccountId: G.currentAccountId || 'main',
        altAccounts: G.altAccounts || [],
        blockedNpcs: G.blockedNpcs || [],
        groups: G.groups,
        groupChatHistory: G.groupChatHistory,
        groupMemories: G.groupMemories,
        friendRequests: G.friendRequests,
        groupInvites: G.groupInvites || [],
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

function applyDeserializedGameState(data) {
    if (!data) return;

    if (data.player) G.player = Object.assign({}, G.player, data.player);
    if (data.day !== undefined) G.day = data.day;
    if (data.timeSlot !== undefined) G.timeSlot = data.timeSlot;
    if (data.actionPoints !== undefined) G.actionPoints = data.actionPoints;
    if (data.maxActionPoints !== undefined) G.maxActionPoints = data.maxActionPoints;
    if (Array.isArray(data.storyHistory)) G.storyHistory = data.storyHistory;

    // 🛡️ 旧存档联系人与自建角色完整继承
    if (!G.npcs) G.npcs = {};
    if (data.npcs && typeof data.npcs === 'object') {
        G.npcs = Object.assign({}, G.npcs, data.npcs);
    }

    if (!G.chatHistory) G.chatHistory = {};
    if (data.chatHistory) {
        for (const [k, v] of Object.entries(data.chatHistory)) {
            if (Array.isArray(v) && v.length) {
                G.chatHistory[k] = v;
            }
        }
    }

    // 大小号与拉黑数据还原
    G.currentAccountId = data.currentAccountId || 'main';
    G.altAccounts = Array.isArray(data.altAccounts) ? data.altAccounts : [];
    G.blockedNpcs = Array.isArray(data.blockedNpcs) ? data.blockedNpcs : [];

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

    if (Array.isArray(data.memorySummaries)) G.memorySummaries = data.memorySummaries;
    if (data.memoryConfig) G.memoryConfig = Object.assign({}, G.memoryConfig, data.memoryConfig);
    if (Array.isArray(data.friendRequests)) G.friendRequests = data.friendRequests;
    if (Array.isArray(data.groupInvites)) G.groupInvites = data.groupInvites;
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
window.openBackupModal = openBackupModal;
window.openRestoreModal = openRestoreModal;