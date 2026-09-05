// 存档/读档/初始化模块（v6.4.0 纯图片备份防丢与平滑迁移版）
// ============================================================
const CURRENT_APP_VERSION = '6.4.0'; // 递增版本号，确保更新后 100% 弹出全新更新公告

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
        const isQuota = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
        showToast(
            isQuota
                ? '⚠️ 本地存储空间已满！请立刻点击「📤 备份」导出图片备份到相册，避免数据丢失'
                : '⚠️ 自动保存失败，建议立刻点击「📤 备份」保存到相册',
            'error',
            5000
        );
    }
}

// 📤 打开备份弹窗：纯图片导出，彻底告别卡顿与下载失效
function openBackupModal() {
    let payload, day, ytName;
    if (G.phase === 'playing') {
        payload = serializeGameState();
        day = G.day;
        ytName = G.player?.ytName;
    } else {
        const info = getAutoSaveInfo();
        if (!info || !info.data) {
            showToast('⚠️ 未找到可导出的存档', 'error');
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

    openModal(`
        <h3>📤 图片存档导出</h3>
        <p style="font-size:12px;color:#666;line-height:1.6;">
            在 APK 运行环境中，文件下载与剪贴板经常失效。本游戏采用<b>像素级图片备份</b>技术，把全部数据无损储存在图片像素中。
        </p>
        <div style="text-align:center;margin:15px 0;">
            <button class="btn-primary" id="genImageBackupBtn" style="width:100%;padding:12px;font-size:14px;">🖼️ 生成备份图片</button>
        </div>
        <div id="imageBackupContainer" style="display:none;margin-top:10px;text-align:center;">
            <div style="font-size:12px;color:#d32f2f;font-weight:700;margin-bottom:8px;background:#ffebee;padding:6px;border-radius:6px;">
                👇 请长按下方图片 → 保存到手机相册！
            </div>
            <div style="width:200px;height:200px;margin:0 auto;border:2px dashed #90caf9;padding:4px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#fafafa;">
                <img id="backupImage" style="max-width:100%;max-height:100%;object-fit:contain;image-rendering:pixelated;-webkit-user-select:auto!important;user-select:auto!important;" alt="备份图片">
            </div>
            <div id="imageBackupInfo" style="font-size:11px;color:#666;margin-top:6px;"></div>
            <p style="font-size:11px;color:#888;margin-top:4px;">⚠️ 注意：保存或发送请使用原图，切勿截图或压缩画质</p>
        </div>
        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">关 闭</button>
        </div>
    `);

    document.getElementById('genImageBackupBtn')?.addEventListener('click', () => {
        showToast('⏳ 正在生成备份图片...', 'info', 2000);
        setTimeout(() => {
            try {
                let dataUrl = '';
                if (window.ImageBackup && typeof window.ImageBackup.encodeBackupToImage === 'function') {
                    dataUrl = window.ImageBackup.encodeBackupToImage(JSON.stringify(exportPayload));
                } else if (window.ImageBackup && typeof window.ImageBackup.encodeSaveToImage === 'function') {
                    dataUrl = window.ImageBackup.encodeSaveToImage(exportPayload);
                } else {
                    throw new Error('未加载到图片备份核心');
                }

                const img = document.getElementById('backupImage');
                const container = document.getElementById('imageBackupContainer');
                const infoEl = document.getElementById('imageBackupInfo');
                if (img) img.src = dataUrl;
                if (container) container.style.display = 'block';
                if (infoEl) {
                    infoEl.textContent = `第 ${day || 1} 天 · 主播：${ytName || '主播'} · 生成完毕`;
                }
                showToast('✅ 备份图已就绪！长按图片保存到相册', 'success', 3500);
            } catch (e) {
                console.error('生成备份图片失败', e);
                showToast('❌ 生成失败：' + e.message, 'error', 4000);
            }
        }, 50);
    });
}

// 📥 打开恢复弹窗：纯图片从相册导入恢复
function openRestoreModal() {
    openModal(`
        <h3>📥 图片存档恢复</h3>
        <p style="font-size:12px;color:#666;line-height:1.6;">
            从手机相册中选取此前保存的备份图片，即可自动解析并恢复全部游戏进度、自建角色与聊天记录：
        </p>
        <div style="text-align:center;margin:18px 0;">
            <button class="btn-primary" id="restoreImagePickBtn" style="width:100%;padding:12px;font-size:14px;">🖼️ 从相册选择备份图片</button>
        </div>
        <input type="file" id="restoreImageFileInput" accept="image/*" class="file-input" style="display:none;">
        <div id="restoreImagePreviewContainer" style="display:none;text-align:center;margin-bottom:8px;">
            <img id="restoreImagePreview" style="max-width:160px;max-height:160px;border:2px solid #90caf9;border-radius:8px;" alt="待恢复图片">
            <div style="font-size:11px;color:#666;margin-top:4px;" id="restoreImageFileName"></div>
        </div>
        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">关 闭</button>
        </div>
    `);

    document.getElementById('restoreImagePickBtn')?.addEventListener('click', () => {
        $('restoreImageFileInput')?.click();
    });

    document.getElementById('restoreImageFileInput')?.addEventListener('change', function() {
        const file = this.files[0];
        if (!file) return;
        _restoreFromImageFile(file);
        this.value = '';
    });
}

// 从图片文件恢复存档的核心解析逻辑
function _restoreFromImageFile(file) {
    if (!window.ImageBackup) {
        showToast('⚠️ 图片备份模块未就绪', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        const preview = document.getElementById('restoreImagePreview');
        const container = document.getElementById('restoreImagePreviewContainer');
        const nameEl = document.getElementById('restoreImageFileName');
        if (preview) preview.src = dataUrl;
        if (container) container.style.display = 'block';
        if (nameEl) nameEl.textContent = file.name;
        _decodeAndImportImage(dataUrl);
    };
    reader.onerror = () => showToast('❌ 读取相册图片失败', 'error');
    reader.readAsDataURL(file);
}

// 解码图片并导入存档
async function _decodeAndImportImage(dataUrl) {
    showToast('⏳ 正在解码相册图片...', 'info', 2000);
    try {
        let stateObj = null;
        if (typeof window.ImageBackup.decodeImageToBackup === 'function') {
            const rawStr = await window.ImageBackup.decodeImageToBackup(dataUrl);
            stateObj = JSON.parse(rawStr);
        } else if (typeof window.ImageBackup.decodeDataUrlToSave === 'function') {
            stateObj = await new Promise((resolve, reject) => {
                window.ImageBackup.decodeDataUrlToSave(dataUrl, (err, res) => err ? reject(err) : resolve(res));
            });
        } else if (typeof window.ImageBackup.decodeImageToSave === 'function') {
            const img = new Image();
            img.src = dataUrl;
            await new Promise(r => { img.onload = r; });
            stateObj = window.ImageBackup.decodeImageToSave(img);
        }

        const stateData = (stateObj && stateObj.data) ? stateObj.data : stateObj;
        if (!stateData || (!stateData.player && !stateData.npcs)) {
            throw new Error('图片中不包含有效的游戏数据');
        }

        closeModal();
        setTimeout(() => {
            _applyImportedStateData(stateData);
        }, 200);
    } catch (e) {
        console.error('图片解码失败', e);
        showToast('❌ 解码失败：' + e.message + '（请确认保存的是相册原图）', 'error', 5000);
    }
}

// 🛡️ 导入落地的深度平滑合并
function _applyImportedStateData(stateData) {
    if (_gameInitialized && !confirm('导入将与当前游戏进度合并（自建角色/群聊/剧情等以备份为准），确认导入吗？')) {
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
    showToast('✅ 存档导入成功！自建角色与群聊已完整找回', 'success', 3000);
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

function applyDeserializedGameState(data) {
    if (!data) return;

    if (data.player) G.player = Object.assign({}, G.player, data.player);
    if (data.day !== undefined) G.day = data.day;
    if (data.timeSlot !== undefined) G.timeSlot = data.timeSlot;
    if (data.actionPoints !== undefined) G.actionPoints = data.actionPoints;
    if (data.maxActionPoints !== undefined) G.maxActionPoints = data.maxActionPoints;
    if (Array.isArray(data.storyHistory)) G.storyHistory = data.storyHistory;

    if (!G.npcs) G.npcs = {};
    const defaultNpcs = (typeof DEFAULT_NPCS !== 'undefined') ? DEFAULT_NPCS : {};
    G.npcs = Object.assign({}, defaultNpcs, G.npcs, data.npcs || {});

    if (!G.chatHistory) G.chatHistory = {};
    if (data.chatHistory) {
        for (const [k, v] of Object.entries(data.chatHistory)) {
            if (Array.isArray(v) && v.length) {
                G.chatHistory[k] = v;
            }
        }
    }

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