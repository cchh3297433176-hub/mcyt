// js/system/save-engine.js
// 📱 小手机系统底层存档引擎（全量数据序列化、冷启动自动恢复、特赦合规核验、记忆卡调度中枢）
// 🌟 存储架构升级（Phase 1 & 2）：群聊字典与群历史优先对接 IndexedDB (localforage)，杜绝配额溢出与旧快照污染
// ============================================================

(function(window) {
    'use strict';

    function getAppVersion() {
        return window.CURRENT_APP_VERSION || '1.611';
    }

    let _gameInitialized = false;

    function initGame() {
        const $ = window.$;
        const newYtName = $('ytNameInput')?.value.trim() || 'MC_CraftMaster';
        const newAge = parseInt($('ageInput')?.value) || 18;
        const newPersona = $('personaInput')?.value.trim() || '';
        const newLive2d = $('avatarLive2dInput')?.value.trim() || '';
        const newSkin = $('skinInput')?.value.trim() || '';
        const newAppearanceReal = $('appearanceRealInput')?.value.trim() || '';
        const newCategory = $('categorySelect')?.value || '剧情';
        const newPov = $('povSelect')?.value || 'second';
        const idVal = document.querySelector('input[name="identity"]:checked')?.value || 'new';

        const skillVals = {};
        ['Building', 'Redstone', 'Pvp', 'Survival', 'Hunting'].forEach(k => {
            skillVals[k.toLowerCase()] = parseInt($('skill' + k)?.value) || 20;
        });

        try {
            localStorage.removeItem('mcyt_autosave');
            localStorage.removeItem('mcyt_wechat_group_chats');
            localStorage.removeItem('mcyt_wechat_group_histories');
            if (typeof window.localforage !== 'undefined') {
                window.localforage.removeItem('mcyt_wechat_group_chats').catch(() => {});
                window.localforage.removeItem('mcyt_wechat_group_histories').catch(() => {});
            }
        } catch (_) {}

        if (typeof window.resetGameState === 'function') {
            window.resetGameState(true);
        }

        _gameInitialized = true;
        window.G.phase = 'playing';

        window.G.day = 1;
        window.G.timeSlot = 0;
        window.G.actionPoints = 6;
        window.G.maxActionPoints = 6;

        window.G.player.ytName = newYtName;
        window.G.player.age = newAge;
        window.G.player.persona = newPersona;
        window.G.player.avatarLive2d = newLive2d;
        window.G.player.skin = newSkin;
        window.G.player.appearanceReal = newAppearanceReal;
        window.G.player.category = newCategory;
        window.G.player.identity = idVal;
        window.G.player.pov = newPov;
        window.G.player._nameHistory = [newYtName];

        window.G.player.offlinePersona = newPersona;
        window.G.player.onlinePersona = newLive2d || newPersona;
        window.G.player.gameSkinPersona = newSkin || '默认MC皮肤形象';
        window.G.player.signature = '热爱MC的创作者';
        window.G.player.region = '中国 (China)';
        window.G.player.regionCode = 'CN';
        window.G.currentAccountId = 'main';
        window.G.altAccounts = [];

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

        if (typeof window.detectPersonaStyle === 'function') {
            window.G.player.personaStyle = window.detectPersonaStyle(newPersona);
        }

        if (window.dom && window.dom.storyArea) {
            window.dom.storyArea.innerHTML = '';
        }

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

        window.G.npcs = {};
        window.G.friendRequests = [{
            _id: 'freq_init_' + Date.now(),
            name: '狂热苦力怕',
            fromReason: '粉丝日常来信',
            persona: '你的忠实小迷弟，特别喜欢看你录的MC视频！',
            avatarEmoji: '🟢',
            day: 1
        }];

        const banner = $('resumeBanner');
        if (banner) banner.style.display = 'none';

        if (typeof window.updateUI === 'function') window.updateUI();
        appendInitialWelcomeStory();
        if (typeof window.switchTab === 'function') window.switchTab('story');

        autoSaveGame();

        setTimeout(() => {
            if (typeof window.checkAndShowVersionNoticeModal === 'function') {
                window.checkAndShowVersionNoticeModal();
            }
        }, 400);
    }

    function appendInitialWelcomeStory() {
        const p = window.G.player;
        const text = `🎮 欢迎，${p.ytName}！\n\n` +
            `你是一位新晋 MC 女主播，擅长 ${p.category} 赛道。\n` +
            `【🖥️ 线上虚拟皮套】：${p.avatarLive2d || '主播自主决定'}\n` +
            `【🎮 MC像素皮肤】：${p.skin || '主播自主选择'}\n` +
            `【🏠 线下真实样貌】：${p.appearanceReal || '自由定制'}\n` +
            `【🎭 性格人设风格】：${p.persona || '自然由用户自定义'}\n\n` +
            `今天是你在 MC 油管世界的第 1 天，你是一名学生，正值暑假。\n` +
            `你有 6 个行动点（每2点推进一个时段），规划你的主播生涯吧！\n\n` +
            `💡 提示：新人主播在联系人列表中初始没有大主播好友，随着你提升粉丝热度与作品曝光，主播们与粉丝们会主动向你递来好友申请与粉丝群邀请！`;
        if (typeof window.appendStory === 'function') {
            window.appendStory(text, '🎮 游戏开始');
        }
    }

    function sanitizeChatHistoryForPersist(historyMap) {
        if (!historyMap || typeof historyMap !== 'object') return {};
        const safeMap = {};
        for (const [key, msgList] of Object.entries(historyMap)) {
            if (!Array.isArray(msgList)) continue;
            const cleanedList = msgList.filter(m => {
                if (!m || typeof m !== 'object') return false;
                if (m.isGenerating === true || m._isPendingStream === true) return false;
                if (typeof m.text === 'string' && m.text.trim().length > 0) return true;
                if (m.type === 'sticker' || m.stickerUrl || m.sticker) return true;
                if (m.type === 'image_text_only' || m.imageDesc) return true;
                if (m.type === 'image' || m.imageUrl) return true;
                if (m.type === 'voice') return true;
                if (m.type === 'contact_card' || m.type === 'tarot_card') return true;
                if (m.from === 'action') return true;
                if (m._id || m.timestamp) return true;
                return false;
            });
            safeMap[key] = cleanedList;
        }
        return safeMap;
    }

    function autoSaveGame() {
        if (window._isAdminAuditing) return;
        if (!window.G || window.G.phase !== 'playing') return;
        try {
            const payload = serializeGameState();
            localStorage.setItem('mcyt_autosave', JSON.stringify({
                timestamp: new Date().toLocaleString(),
                day: window.G.day,
                version: getAppVersion(),
                data: payload
            }));
            
            if (typeof window.checkBackupReminderOnDayAdvance === 'function') {
                window.checkBackupReminderOnDayAdvance();
            }
        } catch(e) {
            console.warn('自动存档写入失败', e);
        }
    }

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

    function openBackupModal() {
        if (typeof window.openMemoryCardExportModal === 'function') {
            window.openMemoryCardExportModal();
        }
    }

    function openRestoreModal() {
        if (typeof window.openMemoryCardImportModal === 'function') {
            window.openMemoryCardImportModal();
        }
    }

    function _applyImportedStateData(stateData) {
        if (!stateData || (!stateData.player && !stateData.npcs)) {
            if (typeof window.showToast === 'function') window.showToast('存档数据损坏或为空', 'error');
            return;
        }

        let isIncomingBannedCard = false;
        if (typeof window.OtomeSecurityGuard !== 'undefined') {
            if (stateData._pardonCertificate) {
                const { success } = window.OtomeSecurityGuard.tryRedeemPardonCertificate(stateData);
                if (success) {
                    delete stateData._pardonCertificate;
                    delete stateData._isDeviceBanned;
                    delete stateData._banReason;
                    delete stateData._activeBanToken;
                    delete stateData._activeBanTime;
                    delete stateData._securityAuditBox;
                    const lockMask = document.getElementById('otomeDeviceBanMask');
                    if (lockMask) lockMask.remove();
                } else {
                    return;
                }
            } else if (stateData._isDeviceBanned) {
                isIncomingBannedCard = true;
                window._isAdminAuditing = true;
                window.G._isDeviceBanned = true;
                window.G._banReason = stateData._banReason;
                window.G._activeBanToken = stateData._activeBanToken;
                window.G._securityAuditBox = stateData._securityAuditBox;
            }
        }

        if (typeof window.resetGameState === 'function') {
            window.resetGameState(true);
        }

        applyDeserializedGameState(stateData);
        _gameInitialized = true;
        window.G.phase = 'playing';

        const setup = document.getElementById('setupPage');
        const game = document.getElementById('gamePage');
        if (setup) {
            setup.classList.remove('active');
            setup.style.display = 'none';
        }
        if (game) {
            game.classList.add('active');
            game.style.display = 'flex';
        }

        if (typeof window.renderAllPanels === 'function') window.renderAllPanels();
        if (typeof window.updateUI === 'function') window.updateUI();
        if (typeof window.switchTab === 'function') window.switchTab('story');

        if (!isIncomingBannedCard) {
            autoSaveGame();
        }

        if (stateData._isDeviceBanned && typeof window.showDeviceBanLockScreen === 'function') {
            window.showDeviceBanLockScreen();
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
        return !!localStorage.getItem('mcyt_autosave');
    }

    function resumeAutoSave() {
        const info = getAutoSaveInfo();
        if (!info || !info.data) {
            if (typeof window.showToast === 'function') window.showToast('⚠️ 未找到有效存档', 'error');
            return;
        }
        if (typeof window.resetGameState === 'function') {
            window.resetGameState(true);
        }
        applyDeserializedGameState(info.data);
        _gameInitialized = true;
        window.G.phase = 'playing';

        const setup = document.getElementById('setupPage');
        const game = document.getElementById('gamePage');
        if (setup) {
            setup.classList.remove('active');
            setup.style.display = 'none';
        }
        if (game) {
            game.classList.add('active');
            game.style.display = 'flex';
        }

        if (typeof window.updateUI === 'function') window.updateUI();
        if (typeof window.switchTab === 'function') window.switchTab('story');

        setTimeout(() => {
            if (typeof window.checkAndShowVersionNoticeModal === 'function') {
                window.checkAndShowVersionNoticeModal();
            }
        }, 400);
    }

    function confirmExitGame() {
        if (confirm('确认保存当前小手机进度并返回初始界面？')) {
            if (!window._isAdminAuditing) {
                autoSaveGame();
            }
            window.G.phase = 'setup';
            _gameInitialized = false;

            const setup = document.getElementById('setupPage');
            const game = document.getElementById('gamePage');
            if (game) {
                game.classList.remove('active');
                game.style.display = 'none';
            }
            if (setup) {
                setup.classList.add('active');
                setup.style.display = 'block';
            }

            if (typeof window.showToast === 'function') {
                window.showToast('🚪 进度已落盘并安全返回', 'info', 2000);
            }
        }
    }

    function serializeGameState() {
        const g = window.G;
        const safeChatHistory = sanitizeChatHistoryForPersist(g.chatHistory);
        const safeGroupChatHistory = sanitizeChatHistoryForPersist(g.groupChatHistory);

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
            chatHistory: safeChatHistory,
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
            groupChatHistory: safeGroupChatHistory,
            groupMemories: g.groupMemories,
            friendRequests: g.friendRequests,
            groupInvites: g.groupInvites || [],
            feed: g.feed,
            momentsNpcs: g.momentsNpcs || [],
            collections: g.collections,
            memoir: g.memoir,
            unlockedAchievements: g.unlockedAchievements,
            milestoneReached: g.milestoneReached,
            ai: g.ai,
            search: g.search,
            stickerCategories: g.stickerCategories,
            stickerLibrary: g.stickerLibrary,
            clockConfig: g.clockConfig,
            chatCollapseConfig: g.chatCollapseConfig,
            _behindScreenActive: g._behindScreenActive
        };
    }

    function applyDeserializedGameState(data) {
        if (!data) return;
        const g = window.G;

        if (data.player) {
            g.player = Object.assign({}, g.player, data.player);
            if (!g.player._nameHistory) {
                g.player._nameHistory = [g.player.ytName || 'MC_CraftMaster'];
            }
            if (!g.player.pov) g.player.pov = 'second';
            if (!g.player.avatarLive2d) g.player.avatarLive2d = '';
            if (!g.player.appearanceReal) g.player.appearanceReal = '';
            if (g.player.offlinePersona === undefined) g.player.offlinePersona = g.player.persona || '';
            if (g.player.onlinePersona === undefined) g.player.onlinePersona = g.player.avatarLive2d || '';
            if (g.player.gameSkinPersona === undefined) g.player.gameSkinPersona = g.player.skin || '';
            if (g.player.signature === undefined) g.player.signature = '';
            if (!g.player.region) g.player.region = '中国 (China)';
        }

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
        if (data.chatHistory && typeof data.chatHistory === 'object') {
            for (const [k, v] of Object.entries(data.chatHistory)) {
                if (Array.isArray(v) && v.length) {
                    g.chatHistory[k] = v;
                }
            }
        }

        g.currentAccountId = String(data.currentAccountId || 'main');
        g.altAccounts = Array.isArray(data.altAccounts)
            ? data.altAccounts.map(a => ({ ...a, id: String(a.id) }))
            : [];
        
        if (typeof window.restoreWechatProfileData === 'function') {
            window.restoreWechatProfileData();
        }

        g.blockedNpcs = Array.isArray(data.blockedNpcs) ? data.blockedNpcs : [];
        g.blockedRecords = Array.isArray(data.blockedRecords) ? data.blockedRecords : [];

        g._isDeviceBanned = !!data._isDeviceBanned;
        g._banReason = data._banReason || null;
        g._activeBanToken = data._activeBanToken || null;
        g._activeBanTime = data._activeBanTime || null;
        g._securityAuditBox = data._securityAuditBox || null;
        g._pardonCertificate = data._pardonCertificate || null;

        if (data.browserState) g.browserState = Object.assign({}, g.browserState, data.browserState);
        if (Array.isArray(data.fanworks)) g.fanworks = data.fanworks;
        if (data.ao3User) g.ao3User = Object.assign({}, g.ao3User, data.ao3User);

        if (data.ytState) g.ytState = Object.assign({}, g.ytState, data.ytState);
        if (data.ytUser) g.ytUser = Object.assign({}, g.ytUser, data.ytUser);
        if (Array.isArray(data.ytExternalVideos)) g.ytExternalVideos = data.ytExternalVideos;
        if (Array.isArray(data.ytCustomChannels)) g.ytCustomChannels = data.ytCustomChannels;

        // 🛡️ 群组字典恢复：优先从独立持久化 (IndexedDB) 恢复，主存档只做兜底
        if (!g.groups) g.groups = {};
        if (data.groups && typeof data.groups === 'object') {
            g.groups = Object.assign({}, data.groups, g.groups);
        }
        try {
            const rawLocalGroups = localStorage.getItem('mcyt_wechat_group_chats');
            if (rawLocalGroups) {
                const parsedLocalGroups = JSON.parse(rawLocalGroups);
                if (parsedLocalGroups && typeof parsedLocalGroups === 'object') {
                    g.groups = Object.assign({}, g.groups, parsedLocalGroups);
                }
            }
        } catch (_) {}

        // 异步以 IndexedDB 绝对权威覆写群组字典
        if (typeof window.localforage !== 'undefined') {
            window.localforage.getItem('mcyt_wechat_group_chats').then(idbGroups => {
                if (idbGroups && typeof idbGroups === 'object') {
                    g.groups = Object.assign({}, g.groups, idbGroups);
                    if (typeof window.renderChatApp === 'function' && window._activeBottomTab === 'chats') {
                        window.renderChatApp();
                    }
                }
            }).catch(() => {});
        }

        // 🛡️ 终极绝杀：群聊历史 100% 对齐单聊机制！
        // 主存档里的 groupChatHistory 仅作为兜底；
        // 独立持久化为绝对真源，优先从 IndexedDB (localforage) 加载
        if (!g.groupChatHistory) g.groupChatHistory = {};
        if (data.groupChatHistory && typeof data.groupChatHistory === 'object') {
            for (const [k, v] of Object.entries(data.groupChatHistory)) {
                if (Array.isArray(v) && v.length > 0) {
                    g.groupChatHistory[k] = v;
                }
            }
        }

        // 同步回退读取 localStorage
        try {
            const rawLocalHist = localStorage.getItem('mcyt_wechat_group_histories');
            if (rawLocalHist) {
                const parsedLocalHist = JSON.parse(rawLocalHist);
                if (parsedLocalHist && typeof parsedLocalHist === 'object') {
                    for (const gid in parsedLocalHist) {
                        const localMsgs = parsedLocalHist[gid];
                        if (Array.isArray(localMsgs) && localMsgs.length > 0) {
                            g.groupChatHistory[gid] = localMsgs;
                        }
                    }
                }
            }
        } catch (_) {}

        // 异步以绝对权威 IndexedDB 覆写就地校准群聊历史
        if (typeof window.localforage !== 'undefined') {
            window.localforage.getItem('mcyt_wechat_group_histories').then(idbHist => {
                if (idbHist && typeof idbHist === 'object') {
                    for (const gid in idbHist) {
                        const msgs = idbHist[gid];
                        if (Array.isArray(msgs) && msgs.length > 0) {
                            g.groupChatHistory[gid] = msgs;
                        }
                    }
                    if (g.currentChatGroup && typeof window.renderGroupChatWindow === 'function') {
                        window.renderGroupChatWindow();
                    }
                }
            }).catch(() => {});
        }

        if (!g.groupMemories) g.groupMemories = {};
        if (data.groupMemories) g.groupMemories = Object.assign({}, g.groupMemories, data.groupMemories);

        if (Array.isArray(data.memorySummaries)) g.memorySummaries = data.memorySummaries;
        if (data.memoryConfig) g.memoryConfig = Object.assign({}, g.memoryConfig, data.memoryConfig);
        if (Array.isArray(data.friendRequests)) g.friendRequests = data.friendRequests;
        if (Array.isArray(data.groupInvites)) g.groupInvites = data.groupInvites;
        if (Array.isArray(data.feed)) g.feed = data.feed;
        if (Array.isArray(data.momentsNpcs)) g.momentsNpcs = data.momentsNpcs;
        if (data.collections) g.collections = data.collections;
        if (Array.isArray(data.memoir)) g.memoir = data.memoir;
        if (Array.isArray(data.unlockedAchievements)) g.unlockedAchievements = data.unlockedAchievements;
        if (data.milestoneReached) g.milestoneReached = data.milestoneReached;
        if (data.ai) g.ai = Object.assign({}, g.ai, data.ai);
        if (data.search) g.search = Object.assign({}, g.search, data.search);

        if (Array.isArray(data.stickerCategories)) g.stickerCategories = data.stickerCategories;
        if (Array.isArray(data.stickerLibrary)) g.stickerLibrary = data.stickerLibrary;
        if (data.clockConfig) g.clockConfig = Object.assign({}, g.clockConfig, data.clockConfig);
        if (data.chatCollapseConfig) g.chatCollapseConfig = Object.assign({}, g.chatCollapseConfig, data.chatCollapseConfig);
        if (data._behindScreenActive) g._behindScreenActive = Object.assign({}, g._behindScreenActive, data._behindScreenActive);
    }

    function showSaveSlotsModal() {
        openBackupModal();
    }
    function showStartChoiceModal() {
        resumeAutoSave();
    }

    window.initGame = initGame;
    window.autoSaveGame = autoSaveGame;
    window.getAutoSaveInfo = getAutoSaveInfo;
    window.hasAnySaveData = hasAnySaveData;
    window.resumeAutoSave = resumeAutoSave;
    window.confirmExitGame = confirmExitGame;
    window.serializeGameState = serializeGameState;
    window.applyDeserializedGameState = applyDeserializedGameState;
    window._applyImportedStateData = _applyImportedStateData;
    window.buildAuditSanitizedPayload = buildAuditSanitizedPayload;
    window.openBackupModal = openBackupModal;
    window.openRestoreModal = openRestoreModal;
    window.showSaveSlotsModal = showSaveSlotsModal;
    window.showStartChoiceModal = showStartChoiceModal;

})(window);
