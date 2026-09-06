// js/03-game-core-1.js
// 核心游戏函数
// ============================================================
function appendStory(text, tag = '📖 剧情', extra = {}, opts = {}) {
    const id = 'sb_' + (G._storyBlockId = (G._storyBlockId || 0) + 1);
    const block = document.createElement('div');
    block.className = 'story-block';
    block.dataset.storyId = id;
    const meta = document.createElement('div');
    meta.className = 'meta';
    const timeStr = `第${G.day}天 · ${getTimeSlotName(G.timeSlot)}`;
    meta.innerHTML = `<span>${timeStr}</span><span class="tag">${tag}</span>` +
        (opts.truncated ? `<span class="tag" style="background:#fff3e0;color:#e65100;">⚠️ 可能被截断</span>` : '');
    block.appendChild(meta);
    const content = document.createElement('div');
    content.className = 'story-content';
    content.innerHTML = renderContentWithThoughts(text);
    block.appendChild(content);
    if (opts.onRegenerate) {
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'margin-top:8px;text-align:right;';
        const btn = document.createElement('button');
        btn.textContent = '🔄 重新生成';
        btn.style.cssText = 'padding:5px 12px;font-size:12px;font-weight:600;border:1px solid rgba(30,60,30,.15);border-radius:8px;background:#eaf5ea;color:var(--text);cursor:pointer;';
        btn.addEventListener('click', () => { btn.disabled = true; opts.onRegenerate(); });
        btnRow.appendChild(btn);
        block.appendChild(btnRow);
    }
    if (dom.storyArea) {
        dom.storyArea.appendChild(block);
        dom.storyArea.scrollTop = dom.storyArea.scrollHeight;
    }
    const historyEntry = { text, tag, day: G.day, time: G.timeSlot, truncated: !!opts.truncated, archived: false, _id: id, ...extra };
    G.storyHistory.push(historyEntry);
    extractThemes(stripThought(text));
    return { block, historyEntry };
}

function pushChat(npcId, msg) {
    if (!G.chatHistory[npcId]) G.chatHistory[npcId] = [];
    msg._id = 'chat_' + (G._chatMsgId = (G._chatMsgId || 0) + 1);
    G.chatHistory[npcId].push(msg);
    return msg;
}

function extractThemes(text) {
    const keywords = ['直播', '视频', '粉丝', '合作', '私信', '红石', '建筑', '生存', '追杀', '剧情', '休闲', '整活', '冒险', '探索',
        '战斗', '建造', '挖掘', '合成', '附魔', '下界', '末地', '村庄', '掠夺', '末影', '苦力怕', '僵尸', '骷髅', '蜘蛛',
        '岩浆', '水', '森林', '沙漠', '雪地', '丛林', '海洋', '洞穴', '矿山', '城堡', '农场', '牧场', '交易', '寻宝',
        '陷阱', '机关', '活塞', '粘液', '蜂蜜', '铁轨', '矿车', '船', '飞行', '药水', '附魔', '锻造', '钓鱼'
    ];
    for (const kw of keywords) { if (text.includes(kw)) G.usedThemes.add(kw); }
    if (G.usedThemes.size > 200) { const arr = Array.from(G.usedThemes);
        G.usedThemes = new Set(arr.slice(-150)); }
}

function showLoading() {
    const el = document.createElement('div');
    el.className = 'story-block loading-dots';
    el.id = 'loadingIndicator';
    el.innerHTML = `<span>●</span><span>●</span><span>●</span> <span style="margin-left:8px;">AI 正在编织剧情...</span>`;
    if (dom.storyArea) {
        dom.storyArea.appendChild(el);
        dom.storyArea.scrollTop = dom.storyArea.scrollHeight;
    }
}

function hideLoading() { const el = document.getElementById('loadingIndicator'); if (el) el.remove(); }

function updateUI() {
    if (typeof OtomeSecurityGuard !== 'undefined' && OtomeSecurityGuard.isDeviceBanned()) {
        showDeviceBanLockScreen();
        return;
    }

    if (dom.dayDisplay) dom.dayDisplay.textContent = G.day;
    if (dom.timeDisplay) dom.timeDisplay.textContent = getTimeSlotName(G.timeSlot);
    if (dom.apDisplay) dom.apDisplay.textContent = G.actionPoints;
    if (dom.apDots) {
        const dots = dom.apDots.querySelectorAll('.ap-dot');
        for (let i = 0; i < 6; i++) {
            if (dots[i]) dots[i].className = i < G.actionPoints ? 'ap-dot filled' : 'ap-dot spent';
        }
    }
    let followerEl = document.querySelector('.follower-badge');
    if (!followerEl) {
        followerEl = document.createElement('span');
        followerEl.className = 'follower-badge';
        document.querySelector('.game-header .right')?.appendChild(followerEl);
    }
    if (followerEl) followerEl.textContent = `❤️ ${G.player.followers}`;
    
    if (G.player.avatar && dom.headerAvatarImg) {
        dom.headerAvatarImg.src = G.player.avatar;
        dom.headerAvatarImg.style.display = 'block';
    } else if (dom.headerAvatarImg) {
        dom.headerAvatarImg.style.display = 'none';
        if (dom.headerAvatar) dom.headerAvatar.textContent = '👤';
    }
    autoSaveGame();
}

function switchTab(tab) {
    if (typeof OtomeSecurityGuard !== 'undefined' && OtomeSecurityGuard.isDeviceBanned()) {
        showDeviceBanLockScreen();
        return;
    }

    const map = {
        story: 'storyTab',
        stream: 'streamTab',
        dashboard: 'dashboardTab',
        shop: 'shopTab',
        social: 'socialTab',
        browser: 'browserTab',
        youtube: 'youtubeTab',
        data: 'dataTab',
        memoir: 'memoirTab',
        feed: 'feedTab',
        achievements: 'achievementsTab'
    };
    const targetId = map[tab];

    if (document.querySelector(`.tab-btn[data-tab="${tab}"]`)) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
    }

    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.toggle('active', el.id === targetId);
        if (el.id === targetId) {
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    });

    if (tab === 'dashboard') renderDashboard();
    if (tab === 'data') renderDataPanel();
    if (tab === 'stream') renderStreamPanel();
    if (tab === 'social') {
        if (!dom.socialTab) dom.socialTab = document.getElementById('socialTab');
        renderSocialPanel();
    }
    if (tab === 'browser') {
        if (typeof renderBrowserPanel === 'function') renderBrowserPanel();
    }
    if (tab === 'youtube') {
        if (typeof renderYouTubePanel === 'function') renderYouTubePanel();
    }
    if (tab === 'shop') renderShop();
    if (tab === 'memoir') renderMemoir();
    if (tab === 'feed' && typeof renderFeed === 'function') renderFeed();
    if (tab === 'achievements') renderAchievements();
}

function closeModal() { if (dom.modal) dom.modal.classList.remove('open'); }
if (dom.modalClose) dom.modalClose.addEventListener('click', closeModal);
if (dom.modal) dom.modal.addEventListener('click', (e) => { if (e.target === dom.modal) closeModal(); });

function openModal(html) {
    if (dom.modalBody && dom.modal) {
        dom.modalBody.innerHTML = html;
        dom.modal.classList.add('open');
    }
}

// ============================================================
// 🚨 纯乙女游戏红线保护：锁死遮罩、特赦解封卡导入与查房解密工作流
// ============================================================
function showDeviceBanLockScreen() {
    let lockMask = document.getElementById('otomeDeviceBanMask');
    if (!lockMask) {
        lockMask = document.createElement('div');
        lockMask.id = 'otomeDeviceBanMask';
        lockMask.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(15, 23, 15, 0.96); z-index: 9999999; display: flex;
            align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;
            backdrop-filter: blur(8px);
        `;
        document.body.appendChild(lockMask);
    }

    const audit = (window.G && window.G._securityAuditBox) || {};
    const reasonText = (window.G && window.G._banReason) || audit.violationReason || '违规在乙女向游戏中进行攻略对象拉郎/男男互动';
    const offendingText = audit.offendingText ? escapeHtml(audit.offendingText) : '';
    const banToken = (window.G && window.G._activeBanToken) || audit.banToken || '当前封锁令';

    lockMask.innerHTML = `
        <div style="background: #fff; border-radius: 16px; padding: 22px; max-width: 430px; width: 100%; box-shadow: 0 12px 36px rgba(0,0,0,0.6); text-align: center; border: 2px solid #ef4444; max-height: 90vh; overflow-y: auto;">
            <div style="font-size: 48px; margin-bottom: 8px;">⚠️</div>
            <h2 style="color: #dc2626; margin: 0 0 10px; font-size: 19px; font-weight: 800;">设备与存档已被安全封锁</h2>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px; font-size: 13px; color: #991b1b; text-align: left; line-height: 1.6; margin-bottom: 14px;">
                <div><b>📜 封禁原因：</b>${escapeHtml(reasonText)}</div>
                <div style="font-size: 11px; color: #991b1b; margin-top: 2px;"><b>封禁编号：</b>${escapeHtml(banToken)}</div>
                ${offendingText ? `<div style="margin-top:4px;font-size:11px;color:#b91c1c;background:#fff;padding:4px 8px;border-radius:4px;word-break:break-word;"><b>触发原话：</b>${offendingText}</div>` : ''}
                <div style="margin-top: 6px; font-size: 12px; color: #7f1d1d; border-top: 1px dashed #fca5a5; padding-top: 6px;">
                    <b>平台正版声明：</b>本软件为抖音 <b>@鸢尾黎明</b> 老师作品的<b>二改版本</b>，为代入向纯乙女 Airp 游戏，严禁在攻略对象之间搞男同拉郎配对。
                </div>
            </div>
            <div style="background: #f0fdf4; border: 1px dashed #86efac; border-radius: 10px; padding: 10px; font-size: 12px; color: #166534; line-height: 1.6; text-align: left; margin-bottom: 14px;">
                🛡️ <b>隐私保护声明：</b><br>导出的取证卡<b>仅保留最近十次聊天与生成记录</b>用于管理员核实，且<b>默认不包含您的 API Key</b>，请放心导出发送给管理员！
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <button id="lockExportBackupBtn" style="padding: 12px; font-size: 14px; font-weight: 700; border: none; border-radius: 10px; background: #dc2626; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <span>📤</span> 导出精简取证记忆卡 (发送给管理员)
                </button>
                <button id="lockImportPardonCardBtn" style="padding: 12px; font-size: 14px; font-weight: 700; border: none; border-radius: 10px; background: #16a34a; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <span>📥</span> 导入管理员解封卡 (解除封禁)
                </button>
                <button id="toggleAdminUnlockFormBtn" style="padding: 10px; font-size: 13px; font-weight: 700; border: 1px solid #ccc; border-radius: 10px; background: #f9fafb; color: #374151; cursor: pointer;">
                    🔐 管理员密匙核验入口
                </button>
            </div>

            <div id="inlineAdminUnlockBox" style="display: none; margin-top: 14px; padding: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; text-align: left;">
                <div style="font-size: 12px; font-weight: 700; color: #344155; margin-bottom: 6px;">请输入管理员专属解封密匙：</div>
                <div style="display: flex; gap: 6px;">
                    <input type="password" id="inlineAdminKeyInput" placeholder="请输入管理员私密解封指令..." style="flex: 1; padding: 8px; border-radius: 8px; border: 1px solid #94a3b8; font-size: 13px;">
                    <button id="btnDoInlineUnlock" style="padding: 8px 14px; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer;">验证并查房</button>
                </div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">管理员核验通过后将进入查房模式，可翻阅历史记录并签发针对本次封禁的专属特赦解密卡。</div>
            </div>
        </div>
    `;
    lockMask.style.display = 'flex';

    // 1. 导出取证卡按钮
    document.getElementById('lockExportBackupBtn').onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof openBackupModal === 'function') {
            openBackupModal();
        } else {
            alert('正在准备导出模块，请稍候重试...');
        }
    };

    // 2. 导入管理员解封卡按钮
    document.getElementById('lockImportPardonCardBtn').onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof openRestoreModal === 'function') {
            openRestoreModal();
        } else {
            alert('请稍候，正在唤起文件管理器...');
        }
    };

    // 3. 管理员密匙核验抽屉
    const toggleBtn = document.getElementById('toggleAdminUnlockFormBtn');
    const unlockBox = document.getElementById('inlineAdminUnlockBox');
    toggleBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isHidden = unlockBox.style.display === 'none';
        unlockBox.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            document.getElementById('inlineAdminKeyInput')?.focus();
        }
    };

    // 4. 管理员查房进入
    document.getElementById('btnDoInlineUnlock').onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const inputKey = document.getElementById('inlineAdminKeyInput').value;
        if (!inputKey) { alert('请输入管理员密匙！'); return; }

        if (inputKey.trim() === OtomeSecurityGuard.ADMIN_SECRET_KEY) {
            window._isAdminAuditing = true;
            lockMask.remove();

            _gameInitialized = true;
            G.phase = 'playing';

            const setup = $('setupPage');
            const game = $('gamePage');
            if (setup) { setup.classList.remove('active'); setup.style.display = 'none'; }
            if (game) { game.classList.add('active'); game.style.display = 'flex'; }

            let adminBanner = document.getElementById('adminAuditStatusBar');
            if (!adminBanner) {
                adminBanner = document.createElement('div');
                adminBanner.id = 'adminAuditStatusBar';
                adminBanner.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100vw; background: #166534;
                    color: #fff; z-index: 999999; padding: 8px 14px; font-size: 12px;
                    display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                `;
                document.body.appendChild(adminBanner);
            }

            adminBanner.innerHTML = `
                <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:16px;">🔍</span>
                    <span><b>管理员查房模式</b>：正在查房审核他人存档。</span>
                </div>
                <div style="display:flex;gap:8px;">
                    <button id="btnAdminConfirmUnlockAll" style="background:#22c55e;color:#fff;border:none;padding:5px 12px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">✅ 签发特赦卡并导出</button>
                    <button id="btnAdminExitAuditClean" style="background:#f59e0b;color:#fff;border:none;padding:5px 12px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">🚪 退出查房并清空</button>
                    <button id="btnAdminRejectBanKeep" style="background:#dc2626;color:#fff;border:none;padding:5px 12px;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer;">❌ 维持封禁</button>
                </div>
            `;

            // ✅ 签发特赦卡并导出
            document.getElementById('btnAdminConfirmUnlockAll').onclick = () => {
                OtomeSecurityGuard.adminAuthorizePardon(OtomeSecurityGuard.ADMIN_SECRET_KEY);
                OtomeSecurityGuard.purgeAllDeviceBans();

                alert('🎉 管理员特赦令已签发！现在为您打开导出弹窗，将导出的解密记忆卡发还给用户，用户在手机上导入即可解除封锁！\n\n导出完成后将自动退出查房，保证您的设备纯净。');
                openBackupModal();

                setTimeout(() => {
                    if (confirm('是否已完成特赦卡导出？点击「确定」将立即退出查房模式并重置设备，防止他人人设残留。')) {
                        exitAdminAuditingAndCleanup();
                    }
                }, 1500);
            };

            // 🚪 退出查房并清空
            document.getElementById('btnAdminExitAuditClean').onclick = () => {
                if (confirm('确定退出当前查房模式吗？退出将彻底清洗此存档数据，避免残留。')) {
                    exitAdminAuditingAndCleanup();
                }
            };

            // ❌ 确属违规维持锁死
            document.getElementById('btnAdminRejectBanKeep').onclick = () => {
                window._isAdminAuditing = false;
                adminBanner.remove();
                showDeviceBanLockScreen();
            };

            alert('🔍 密匙正确！已进入管理员查房模式。你现在可以点进私聊、同人、朋友圈任意查阅历史。查验完毕后点击顶部按钮签发特赦卡或安全退出！');
            updateUI();
            renderAllPanels();
        } else {
            alert('❌ 密匙错误！解锁失败，该设备保持锁定。');
        }
    };
}

// 🛡️ 管理员查房彻底安全退出函数：清洗全部他人数据，防止新档串号
function exitAdminAuditingAndCleanup() {
    window._isAdminAuditing = false;
    const adminBanner = document.getElementById('adminAuditStatusBar');
    if (adminBanner) adminBanner.remove();

    // 彻底清空全局状态，仅保留网络模型配置
    if (typeof resetGameState === 'function') {
        resetGameState(true);
    }

    _gameInitialized = false;
    G.phase = 'setup';

    // 切换回开局设定页，并清空输入框
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

    if ($('ytNameInput')) $('ytNameInput').value = '';
    if ($('personaInput')) $('personaInput').value = '';
    if ($('skinInput')) $('skinInput').value = '';

    const banner = $('resumeBanner');
    if (banner) banner.style.display = 'none';

    showToast('✨ 已彻底清空查房数据，您可以全新开局或读取自己的存档！', 'success', 3500);
}

window.showDeviceBanLockScreen = showDeviceBanLockScreen;
window.exitAdminAuditingAndCleanup = exitAdminAuditingAndCleanup;

// ============================================================
// 每日视频自然增长
// ============================================================
function applyDailyVideoGrowth() {
    const videos = G.player.videos;
    if (videos.length === 0) return;
    const followers = G.player.followers;
    const baseFactor = 0.008;
    for (const v of videos) {
        const daysOld = G.day - v.day;
        let growth = followers * baseFactor * (1 / (daysOld + 1)) * (0.6 + Math.random() * 0.8);
        growth = Math.max(1, Math.floor(growth));
        growth += rand(0, 5);
        v.views = (v.views || 0) + growth;
        v.likes = (v.likes || 0) + Math.floor(growth * 0.02);
    }
}

// ============================================================
// 时间推进 & 下一天
// ============================================================
function advanceDayFree() {
    if (typeof OtomeSecurityGuard !== 'undefined' && OtomeSecurityGuard.isDeviceBanned()) {
        showDeviceBanLockScreen();
        return;
    }
    G.day++;
    G.actionPoints = G.maxActionPoints;
    G.timeSlot = 0;
    applyDailyVideoGrowth();
    const dailyGain = rand(10, 50);
    G.player.followers += dailyGain;
    if (G.player.isStudent && G.day % 7 === 0) G.player.isVacation = !G.player.isVacation;
    showDailyBriefing();
    showToast(`📅 第 ${G.day} 天开始！行动点已恢复`, 'success');
    setTimeout(() => {
        const greeting = `新的一天！今天是第 ${G.day} 天，${G.player.isVacation ? '暑假中' : '学习日'}。你有 ${G.maxActionPoints} 个行动点。`;
        appendStory(greeting, '🌅 新的一天');
    }, 300);
    addMemoir('新的一天', `第${G.day}天开始`);
    updateUI();
    applyLongTailEffect();
    renderAllPanels();
    checkMilestones();
    checkAchievements();
    generateSponsorOffer();
    generateFeedEvents();
    G._npcInitiatedToday = {};
}

function advanceTimeSlot() {
    if (typeof OtomeSecurityGuard !== 'undefined' && OtomeSecurityGuard.isDeviceBanned()) {
        showDeviceBanLockScreen();
        return false;
    }
    if (G.actionPoints < 2) { showToast('⚠️ 需要2行动点推进时段', 'error'); return false; }
    G.actionPoints -= 2;
    G.timeSlot = (G.timeSlot + 1) % 3;
    if (G.timeSlot === 0) {
        G.day++;
        G.actionPoints = G.maxActionPoints;
        applyDailyVideoGrowth();
        const dailyGain = rand(10, 50);
        G.player.followers += dailyGain;
        if (G.player.isStudent && G.day % 7 === 0) G.player.isVacation = !G.player.isVacation;
        showDailyBriefing();
        showToast(`📅 第 ${G.day} 天开始！行动点已恢复`, 'success');
        setTimeout(() => {
            const greeting = `新的一天！今天是第 ${G.day} 天，${G.player.isVacation ? '暑假中' : '学习日'}。你有 ${G.maxActionPoints} 个行动点。`;
            appendStory(greeting, '🌅 新的一天');
        }, 300);
        addMemoir('新的一天', `第${G.day}天开始`);
        G._npcInitiatedToday = {};
    } else {
        showToast(`⏰ 进入 ${getTimeSlotName(G.timeSlot)}`, 'success');
        setTimeout(() => appendStory(`时间来到 ${getTimeSlotName(G.timeSlot)}。`, '⏰ 时段推进'), 200);
    }
    updateUI();
    applyLongTailEffect();
    renderAllPanels();
    checkMilestones();
    checkAchievements();
    generateSponsorOffer();
    generateFeedEvents();
    return true;
}

function renderAllPanels() {
    if (typeof OtomeSecurityGuard !== 'undefined' && OtomeSecurityGuard.isDeviceBanned()) {
        showDeviceBanLockScreen();
        return;
    }
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (activeTab === 'data') renderDataPanel();
    if (activeTab === 'dashboard') renderDashboard();
    if (activeTab === 'social' || document.getElementById('socialTab')?.style.display === 'block') renderSocialPanel();
    if (document.getElementById('browserTab')?.style.display === 'block' && typeof renderBrowserPanel === 'function') renderBrowserPanel();
    if (document.getElementById('youtubeTab')?.style.display === 'block' && typeof renderYouTubePanel === 'function') renderYouTubePanel();
    if (activeTab === 'shop') renderShop();
    if (activeTab === 'memoir') renderMemoir();
    if (activeTab === 'stream') renderStreamPanel();
    if (activeTab === 'achievements') renderAchievements();
}

// ============================================================
// 每日简报
// ============================================================
function showDailyBriefing() {
    if (!G._lastBriefing) {
        G._lastBriefing = {
            followers: G.player.followers,
            money: G.player.money,
            likes: G.player.likes,
            views: G.player.videos.reduce((s, v) => s + v.views, 0),
        };
    }
    const last = G._lastBriefing;
    const curr = {
        followers: G.player.followers,
        money: G.player.money,
        likes: G.player.likes,
        views: G.player.videos.reduce((s, v) => s + v.views, 0),
    };
    const delta = {
        followers: curr.followers - last.followers,
        money: curr.money - last.money,
        likes: curr.likes - last.likes,
        views: curr.views - last.views,
    };
    G._lastBriefing = { ...curr };
    let videoReports = '';
    const allVideos = G.player.videos;
    if (allVideos.length === 0) {
        videoReports = '还没有视频，快去发布吧！';
    } else {
        const sorted = [...allVideos].sort((a, b) => b.day - a.day);
        const displayVideos = sorted.slice(0, 10);
        videoReports = displayVideos.map(v => {
            const prev = v._prevViews || 0;
            const current = v.views || 0;
            const change = current - prev;
            v._prevViews = current;
            return `「${v.title}」: ${change >= 0 ? '+' : ''}${change} 播放量`;
        }).join('\n');
        if (sorted.length > 10) {
            videoReports += `\n... 还有 ${sorted.length - 10} 个视频`;
        }
    }
    const html = `
    <h3>📊 每日简报 - 第 ${G.day} 天</h3>
    <div style="margin: 10px 0;">
        <p><strong>粉丝：</strong>${delta.followers >= 0 ? '+' : ''}${delta.followers}</p>
        <p><strong>金币：</strong>${delta.money >= 0 ? '+' : ''}${delta.money}</p>
        <p><strong>点赞：</strong>${delta.likes >= 0 ? '+' : ''}${delta.likes}</p>
        <p><strong>总观看：</strong>${delta.views >= 0 ? '+' : ''}${delta.views}</p>
    </div>
    <div style="border-top:1px solid rgba(30, 60, 30, 0.1);padding-top:8px;">
        <p style="font-weight:600;">📹 视频播放量变化（最近10条）</p>
        <pre style="font-size:12px;color:var(--text2);white-space:pre-wrap;margin-top:4px;">${videoReports}</pre>
    </div>
    <div class="btn-row">
        <button class="btn-secondary" onclick="closeModal()">确认</button>
    </div>
    `;
    openModal(html);
}

function applyLongTailEffect() {
    const videos = G.player.videos;
    for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        if (Math.random() < 0.05) {
            const boost = rand(100, 800);
            v.views = (v.views || 0) + boost;
            appendStory(`📈 你的旧视频「${v.title}」被算法推荐，播放量突然增加了 ${boost}！`, '📈 长尾效应');
            addMemoir('长尾效应', `「${v.title}」播放量 +${boost}`);
            if (v.collection) updateCollectionStats(v.collection);
        }
    }
}

function updateCollectionStats(collectionName) {
    const col = G.collections[collectionName];
    if (!col) return;
    let totalViews = 0,
        totalLikes = 0,
        totalComments = 0;
    col.videos.forEach(idx => {
        const v = G.player.videos[idx];
        if (v) {
            totalViews += v.views || 0;
            totalLikes += v.likes || 0;
            totalComments += (v.comments ? v.comments.length : 0);
        }
    });
    col.totalViews = totalViews;
    col.totalLikes = totalLikes;
    col.totalComments = totalComments;
    col.videoCount = col.videos.length;
}

// ============================================================
// 动态系统 (Feed)
// ============================================================
function addFeedItem(data) {
    const item = {
        id: G.feedIdCounter++,
        day: G.day,
        time: data.time || new Date().toLocaleString(),
        author: data.author || '系统',
        avatar: data.avatar || '📰',
        body: data.body || '',
        type: data.type || 'public',
        npcId: data.npcId || null,
        likes: 0,
        liked: false,
        comments: [],
        public: data.type === 'public',
    };
    G.feed.push(item);
    if (G.feed.length > 200) G.feed = G.feed.slice(-200);
}

function generateFeedEvents() {
    if (G.day % 2 !== 0 && G.day % 3 !== 0) return;
    const npcs = Object.values(G.npcs);
    const npc = pick(npcs);
    if (npc && Math.random() < 0.6) {
        const msgs = [
            `${npc.name} 刚刚发布了一个新视频：「${pick(['末地大冒险', '红石黑科技', '生存挑战', '建筑大师', '恐怖模组实况'])}」！`,
            `${npc.name} 正在直播中，快来围观！`,
            `${npc.name} 在动态中分享了一张有趣的MC截图。`,
            `${npc.name} 发起了「${pick(['建筑大赛', '红石挑战', 'PvP锦标赛', '生存马拉松'])}」活动！`,
            `${npc.name} 表示最近在筹备一个大项目，敬请期待！`,
        ];
        const body = pick(msgs);
        addFeedItem({
            author: npc.name,
            avatar: npc.avatarEmoji || '👤',
            body: body,
            type: 'public',
            npcId: npc.id,
        });
    }
    if (G.player.videos.length > 0 && Math.random() < 0.4) {
        const v = pick(G.player.videos);
        const msgs = [
            `粉丝们正在热议你的视频「${v.title}」！`,
            `「${v.title}」获得了 ${rand(100, 500)} 个新点赞！`,
            `有粉丝在动态中分享了你的视频「${v.title}」并配文：太棒了！`,
            `「${v.title}」被推荐到了热门首页！`,
        ];
        addFeedItem({
            author: '系统',
            avatar: '📢',
            body: pick(msgs),
            type: 'public',
        });
    }
}

function checkMilestones() {
    const followers = G.player.followers;
    for (const ms of MILESTONES) {
        if (followers >= ms.value && !G.milestoneReached.includes(ms.value)) {
            G.milestoneReached.push(ms.value);
            triggerMilestone(ms);
        }
    }
}

function triggerMilestone(ms) {
    appendStory(`🎉 粉丝里程碑达成！你达到了 ${ms.label}！`, '🏆 里程碑');
    addMemoir('里程碑', `粉丝达到 ${ms.label}`);
    showToast(`🎉 粉丝达到 ${ms.label}！`, 'success', 4000);
    const bonus = Math.floor(ms.value * 0.001);
    G.player.money += bonus;
    appendStory(`💰 获得里程碑奖励 ${bonus} 金币！`, '💰 奖励');
    checkAchievements();
}

function getNextMilestone() {
    const followers = G.player.followers;
    for (const ms of MILESTONES) {
        if (followers < ms.value) return ms.label;
    }
    return '已达成所有里程碑！';
}