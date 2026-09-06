// js/08-save-load.js
// 存档/读档/初始化模块（v1.607 全量数据保护、同人/油管防丢、开局表单防清空版）
// ============================================================
const CURRENT_APP_VERSION = '1.607';

let _gameInitialized = false;
let _skipStartChoiceOnce = false;

function initGame() {
    // 1. 优先安全锁存玩家填写的全新人设
    const newYtName = $('ytNameInput')?.value.trim() || 'MC_CraftMaster';
    const newAge = parseInt($('ageInput')?.value) || 18;
    const newPersona = $('personaInput')?.value.trim() || '';
    const newSkin = $('skinInput')?.value.trim() || '';
    const newCategory = $('categorySelect')?.value || '剧情';
    const idVal = document.querySelector('input[name="identity"]:checked')?.value || 'new';

    const skillVals = {};
    ['Building', 'Redstone', 'Pvp', 'Survival', 'Hunting'].forEach(k => {
        skillVals[k.toLowerCase()] = parseInt($('skill' + k)?.value) || 20;
    });

    // 2. 彻底抹去本地旧自动存档，防止重启后台又复活旧档！
    try {
        localStorage.removeItem('mcyt_autosave');
    } catch (_) {}

    // 3. 原地清空并深度重置全局运行态
    if (typeof resetGameState === 'function') {
        resetGameState(true);
    }

    _gameInitialized = true;
    window.G.phase = 'playing';

    // 4. 将全新人设与数据注入全局状态
    window.G.day = 1;
    window.G.timeSlot = 0;
    window.G.actionPoints = 6;
    window.G.maxActionPoints = 6;

    window.G.player.ytName = newYtName;
    window.G.player.age = newAge;
    window.G.player.persona = newPersona;
    window.G.player.skin = newSkin;
    window.G.player.category = newCategory;
    window.G.player.identity = idVal;

    if (idVal === 'fans') {
        window.G.player.followers = 5000;
        window.G.player.money = 200;
    } else if (idVal === 'veteran') {
        window.G.player.followers = 50000;
        window.G.player.money = 1000;
    } else {
        window.G.player.followers = 0;
        window.G.player.money = 50;
    }

    Object.assign(window.G.player.skills, skillVals);

    if (typeof detectPersonaStyle === 'function') {
        window.G.player.personaStyle = detectPersonaStyle(newPersona);
    }

    // 5. 清理旧剧情 DOM
    if (dom.storyArea) {
        dom.storyArea.innerHTML = '';
    }

    // 6. 视图流转
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

    // 7. 新人破冰好友申请
    window.G.npcs = {};
    window.G.friendRequests = [{
        _id: 'freq_init_' + Date.now(),
        name: '狂热苦力怕',
        fromReason: '粉丝日常来信',
        persona: '你的忠实小迷弟，特别喜欢看你录的MC视频！',
        avatarEmoji: '🟢',
        day: 1
    }];

    // 隐藏首页的“继续上次进度”横幅
    const banner = $('resumeBanner');
    if (banner) banner.style.display = 'none';

    updateUI();
    appendInitialWelcomeStory();
    switchTab('story');

    // 立即保存新开局状态到自动存档
    autoSaveGame();

    setTimeout(() => {
        if (typeof checkAndShowVersionNoticeModal === 'function') {
            checkAndShowVersionNoticeModal();
        }
    }, 400);
}

function appendInitialWelcomeStory() {
    const p = window.G.player;
    const text = `🎮 欢迎，${p.ytName}！\n\n` +
        `你是一位新晋 MC 主播，擅长 ${p.category} 赛道。\n` +
        `你的皮上形象是：${p.persona || '一位充满活力的主播'}，皮肤是：${p.skin || '经典装扮'}。\n\n` +
        `今天是你在 MC 油管世界的第 1 天，你是一名学生，正值暑假。\n` +
        `你有 6 个行动点（每2点推进一个时段），规划你的主播生涯吧！\n\n` +
        `💡 提示：新人主播在联系人列表中初始没有大主播好友，随着你提升粉丝热度与作品曝光，主播们与粉丝们会主动向你递来好友申请与粉丝群邀请！`;
    appendStory(text, '🎮 游戏开始');
}

// 自动存档与槽位读写
function autoSaveGame() {
    if (window._isAdminAuditing) return;
    if (!window.G || window.G.phase !== 'playing') return;
    try {
        const payload = serializeGameState();
        localStorage.setItem('mcyt_autosave', JSON.stringify({
            timestamp: new Date().toLocaleString(),
            day: window.G.day,
            version: CURRENT_APP_VERSION,
            data: payload
        }));
    } catch(e) {
        console.warn('自动存档写入失败', e);
        showToast('⚠️ 自动保存失败，建议立刻点击「备份」下载存档', 'error', 5000);
    }
}

// 🛡️ 构建精简取证数据（仅在被封禁模式下裁剪最近 10 次生成与对话记录，保护用户隐私）
function buildAuditSanitizedPayload(originalPayload) {
    const cloned = JSON.parse(JSON.stringify(originalPayload));

    if (Array.isArray(cloned.storyHistory)) {
        cloned.storyHistory = cloned.storyHistory.slice(-10);
    }

    if (cloned.chatHistory && typeof cloned.chatHistory === 'object') {
        const trimmedChat = {};
        for (const [npcId, msgs] of Object.entries(cloned.chatHistory)) {
            if (Array.isArray(msgs)) {
                trimmedChat[npcId] = msgs.slice(-10);
            }
        }
        cloned.chatHistory = trimmedChat;
    }

    if (cloned.groupChatHistory && typeof cloned.groupChatHistory === 'object') {
        const trimmedGroup = {};
        for (const [grpId, msgs] of Object.entries(cloned.groupChatHistory)) {
            if (Array.isArray(msgs)) {
                trimmedGroup[grpId] = msgs.slice(-10);
            }
        }
        cloned.groupChatHistory = trimmedGroup;
    }

    return cloned;
}

// 打开备份/导出取证流程
function openBackupModal() {
    let payload, day, ytName;
    const isBanMode = !!(window.G && (window.G._isDeviceBanned || (window.G._securityAuditBox && Object.keys(window.G._securityAuditBox).length > 0)));

    if ((window.G && window.G.phase === 'playing') || (isBanMode && window.G && window.G.player)) {
        payload = serializeGameState();
        day = window.G.day || 1;
        ytName = window.G.player?.ytName || '主角';
    } else {
        const info = getAutoSaveInfo();
        if (info && info.data) {
            payload = info.data;
            day = info.day || 1;
            ytName = info.data.player?.ytName || '主角';
        } else if (isBanMode && window.G) {
            payload = serializeGameState();
            day = window.G.day || 1;
            ytName = window.G.player?.ytName || '主角';
        } else {
            showToast('⚠️ 未找到可导出的存档数据', 'error');
            return;
        }
    }

    let finalData = payload;
    if (isBanMode) {
        finalData = buildAuditSanitizedPayload(payload);
    }

    const exportPayload = {
        timestamp: new Date().toLocaleString(),
        day: day,
        version: CURRENT_APP_VERSION,
        data: finalData
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

// 🛡️ 导入落地：深度平滑合并 + 特赦令核验与消费
function _applyImportedStateData(stateData) {
    if (!stateData || (!stateData.player && !stateData.npcs)) {
        alert('❌ 存档数据损坏或为空，导入终止！');
        return;
    }

    let isPardonRedemption = false;
    let isIncomingBannedCard = false;

    if (typeof OtomeSecurityGuard !== 'undefined') {
        if (stateData._pardonCertificate) {
            const { success, nativeCleared } = OtomeSecurityGuard.tryRedeemPardonCertificate(stateData);
            if (success) {
                isPardonRedemption = true;

                delete stateData._pardonCertificate;
                delete stateData._isDeviceBanned;
                delete stateData._banReason;
                delete stateData._activeBanToken;
                delete stateData._activeBanTime;
                delete stateData._securityAuditBox;

                const lockMask = document.getElementById('otomeDeviceBanMask');
                if (lockMask) lockMask.remove();

                if (nativeCleared) {
                    alert('🎉 成功验证管理员特赦令！设备封锁已彻底解除，游戏已恢复正常。');
                } else {
                    alert('⚠️ 存档内的封锁已解除，但设备底层安全标记未能确认清除干净。\n请完全关闭 App 后重新打开确认；如果重新打开仍显示被封，请联系管理员。');
                }
            } else {
                alert('⚠️ 拦截到失效的特赦令！该卡是历史旧特赦，无法用于解除之后的全新违规！设备继续保持锁死。');
                return;
            }
        } else if (stateData._isDeviceBanned) {
            isIncomingBannedCard = true;
            window.G._isDeviceBanned = true;
            window.G._banReason = stateData._banReason;
            window.G._activeBanToken = stateData._activeBanToken;
            window.G._securityAuditBox = stateData._securityAuditBox;
            alert('⚠️ 检测到这是一张违规被锁定的取证卡！已加载全部历史，即将为您打开封锁审核界面。');
        }
    }

    if (!isIncomingBannedCard && !isPardonRedemption && _gameInitialized && !confirm('检测到已有游玩进度，导入将合并存档（自建角色、联系人通讯录、剧情与小号完整继承），确定导入吗？')) {
        return;
    }

    if (typeof resetGameState === 'function') {
        resetGameState(true);
    }

    applyDeserializedGameState(stateData);
    _gameInitialized = true;
    window.G.phase = 'playing';

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

    if (!isIncomingBannedCard) {
        autoSaveGame();
    }

    const npcCount = Object.keys(window.G.npcs || {}).length;
    const chatCount = Object.values(window.G.chatHistory || {}).reduce((acc, cur) => acc + (cur.length || 0), 0);
    const dayVal = window.G.day || 1;
    const nameVal = window.G.player?.ytName || '主角';

    if (stateData._isDeviceBanned) {
        showDeviceBanLockScreen();
    } else if (isPardonRedemption) {
    } else {
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
                        <div>📱 <b>账号生态</b>：大号与 ${(window.G.altAccounts||[]).length} 个小号数据已就绪</div>
                    </div>
                    <button class="btn-primary" onclick="closeModal()" style="width:100%;padding:10px;">进入游戏</button>
                </div>
            `);
        } else {
            alert(`✅ 存档导入成功！\n\n已为您还原：\n- 主播：${nameVal}\n- 进度：第 ${dayVal} 天\n- 联系人：${npcCount} 位\n- 对话记录：${chatCount} 条`);
        }
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
    if (typeof resetGameState === 'function') {
        resetGameState(true);
    }
    applyDeserializedGameState(info.data);
    _gameInitialized = true;
    window.G.phase = 'playing';

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
                <div class="choice-desc">在下方表单塑造你的专属主播</div>
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
        showToast('✨ 请填写或确认主播人设，点击下方开始游戏！', 'info', 2000);
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
    if (!window.G || window.G.phase !== 'playing') { showToast('⚠️ 游戏尚未开始', 'error'); return; }
    try {
        const payload = serializeGameState();
        localStorage.setItem('mcyt_slot_' + slotIndex, JSON.stringify({
            timestamp: new Date().toLocaleString(),
            day: window.G.day,
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
        if (typeof resetGameState === 'function') {
            resetGameState(true);
        }
        applyDeserializedGameState(parsed.data);
        _gameInitialized = true;
        window.G.phase = 'playing';

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
        if (!window._isAdminAuditing) {
            autoSaveGame();
        }
        window.G.phase = 'setup';
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
        } else if (banner) {
            banner.style.display = 'none';
        }
        showToast('🚪 已安全返回初始界面', 'info', 2000);
    }
}

// 🛡️ 全量数据打包
function serializeGameState() {
    const g = window.G;
    return {
        player: g.player,
        day: g.day,
        timeSlot: g.timeSlot,
        actionPoints: g.actionPoints,
        maxActionPoints: g.maxActionPoints,
        storyHistory: g.storyHistory,
        memorySummaries: g.memorySummaries,
        memoryConfig: g.memoryConfig,
        npcs: g.npcs,
        chatHistory: g.chatHistory,
        currentAccountId: g.currentAccountId || 'main',
        altAccounts: g.altAccounts || [],
        blockedNpcs: g.blockedNpcs || [],
        blockedRecords: g.blockedRecords || [],
        _isDeviceBanned: g._isDeviceBanned || false,
        _banReason: g._banReason || null,
        _activeBanToken: g._activeBanToken || null,
        _activeBanTime: g._activeBanTime || null,
        _securityAuditBox: g._securityAuditBox || null,
        _pardonCertificate: g._pardonCertificate || null,
        browserState: g.browserState,
        fanworks: g.fanworks,
        ao3User: g.ao3User,
        ytState: g.ytState,
        ytUser: g.ytUser,
        ytExternalVideos: g.ytExternalVideos,
        ytCustomChannels: g.ytCustomChannels,
        groups: g.groups,
        groupChatHistory: g.groupChatHistory,
        groupMemories: g.groupMemories,
        friendRequests: g.friendRequests,
        groupInvites: g.groupInvites || [],
        feed: g.feed,
        collections: g.collections,
        memoir: g.memoir,
        unlockedAchievements: g.unlockedAchievements,
        milestoneReached: g.milestoneReached,
        ai: g.ai,
        search: g.search,
        stickerCategories: g.stickerCategories,
        stickerLibrary: g.stickerLibrary,
        clockConfig: g.clockConfig,
        _behindScreenActive: g._behindScreenActive
    };
}

function applyDeserializedGameState(data) {
    if (!data) return;
    const g = window.G;

    if (data.player) g.player = Object.assign({}, g.player, data.player);
    if (data.day !== undefined) g.day = data.day;
    if (data.timeSlot !== undefined) g.timeSlot = data.timeSlot;
    if (data.actionPoints !== undefined) g.actionPoints = data.actionPoints;
    if (data.maxActionPoints !== undefined) g.maxActionPoints = data.maxActionPoints;
    if (Array.isArray(data.storyHistory)) g.storyHistory = data.storyHistory;

    if (!g.npcs) g.npcs = {};
    if (data.npcs && typeof data.npcs === 'object') {
        g.npcs = Object.assign({}, g.npcs, data.npcs);
    }

    if (!g.chatHistory) g.chatHistory = {};
    if (data.chatHistory) {
        for (const [k, v] of Object.entries(data.chatHistory)) {
            if (Array.isArray(v) && v.length) {
                g.chatHistory[k] = v;
            }
        }
    }

    g.currentAccountId = data.currentAccountId || 'main';
    g.altAccounts = Array.isArray(data.altAccounts) ? data.altAccounts : [];
    g.blockedNpcs = Array.isArray(data.blockedNpcs) ? data.blockedNpcs : [];
    g.blockedRecords = Array.isArray(data.blockedRecords) ? data.blockedRecords : [];

    g._isDeviceBanned = !!data._isDeviceBanned;
    g._banReason = data._banReason || null;
    g._activeBanToken = data._activeBanToken || null;
    g._activeBanTime = data._activeBanTime || null;
    g._securityAuditBox = data._securityAuditBox || null;
    g._pardonCertificate = data._pardonCertificate || null;

    if (g._isDeviceBanned) {
        try {
            localStorage.setItem('mcyt_device_banned_flag', 'true');
            if (g._activeBanToken) localStorage.setItem('mcyt_device_ban_token', g._activeBanToken);
            if (g._activeBanTime) localStorage.setItem('mcyt_device_ban_time', String(g._activeBanTime));
        } catch (_) {}
    }

    if (data.browserState) g.browserState = Object.assign({}, g.browserState, data.browserState);
    if (Array.isArray(data.fanworks)) g.fanworks = data.fanworks;
    if (data.ao3User) g.ao3User = Object.assign({}, g.ao3User, data.ao3User);

    if (data.ytState) g.ytState = Object.assign({}, g.ytState, data.ytState);
    if (data.ytUser) g.ytUser = Object.assign({}, g.ytUser, data.ytUser);
    if (Array.isArray(data.ytExternalVideos)) g.ytExternalVideos = data.ytExternalVideos;
    if (Array.isArray(data.ytCustomChannels)) g.ytCustomChannels = data.ytCustomChannels;

    if (!g.groups) g.groups = {};
    if (data.groups) g.groups = Object.assign({}, g.groups, data.groups);

    if (!g.groupChatHistory) g.groupChatHistory = {};
    if (data.groupChatHistory) {
        for (const [k, v] of Object.entries(data.groupChatHistory)) {
            if (Array.isArray(v) && v.length) {
                g.groupChatHistory[k] = v;
            }
        }
    }

    if (!g.groupMemories) g.groupMemories = {};
    if (data.groupMemories) g.groupMemories = Object.assign({}, g.groupMemories, data.groupMemories);

    if (Array.isArray(data.memorySummaries)) g.memorySummaries = data.memorySummaries;
    if (data.memoryConfig) g.memoryConfig = Object.assign({}, g.memoryConfig, data.memoryConfig);
    if (Array.isArray(data.friendRequests)) g.friendRequests = data.friendRequests;
    if (Array.isArray(data.groupInvites)) g.groupInvites = data.groupInvites;
    if (Array.isArray(data.feed)) g.feed = data.feed;
    if (data.collections) g.collections = data.collections;
    if (Array.isArray(data.memoir)) g.memoir = data.memoir;
    if (Array.isArray(data.unlockedAchievements)) g.unlockedAchievements = data.unlockedAchievements;
    if (data.milestoneReached) g.milestoneReached = data.milestoneReached;
    if (data.ai) g.ai = Object.assign({}, g.ai, data.ai);
    if (data.search) g.search = Object.assign({}, g.search, data.search);

    if (Array.isArray(data.stickerCategories)) g.stickerCategories = data.stickerCategories;
    if (Array.isArray(data.stickerLibrary)) g.stickerLibrary = data.stickerLibrary;
    if (data.clockConfig) g.clockConfig = Object.assign({}, g.clockConfig, data.clockConfig);
    if (data._behindScreenActive) g._behindScreenActive = Object.assign({}, g._behindScreenActive, data._behindScreenActive);
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