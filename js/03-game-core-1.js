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
// 🚨 纯乙女游戏红线保护：内置解封表单的全屏死锁层（彻底修复点不动与回滚问题）
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

    lockMask.innerHTML = `
        <div style="background: #fff; border-radius: 16px; padding: 22px; max-width: 430px; width: 100%; box-shadow: 0 12px 36px rgba(0,0,0,0.6); text-align: center; border: 2px solid #ef4444; max-height: 90vh; overflow-y: auto;">
            <div style="font-size: 48px; margin-bottom: 8px;">⚠️</div>
            <h2 style="color: #dc2626; margin: 0 0 10px; font-size: 19px; font-weight: 800;">设备与存档已被安全封锁</h2>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px; font-size: 13px; color: #991b1b; text-align: left; line-height: 1.6; margin-bottom: 14px;">
                <div><b>📜 封禁原因：</b>${escapeHtml(reasonText)}</div>
                ${offendingText ? `<div style="margin-top:4px;font-size:11px;color:#b91c1c;background:#fff;padding:4px 8px;border-radius:4px;word-break:break-word;"><b>触发原话：</b>${offendingText}</div>` : ''}
                <div style="margin-top: 6px; font-size: 12px; color: #7f1d1d; border-top: 1px dashed #fca5a5; padding-top: 6px;">
                    <b>平台正版声明：</b>本软件为抖音 <b>@鸢尾黎明</b> 老师作品的<b>二改版本</b>，为代入向纯乙女 Airp 游戏，严禁在攻略对象之间搞男同拉郎配对。
                </div>
            </div>
            <p style="font-size: 12px; color: #6b7280; line-height: 1.6; margin-bottom: 16px;">
                当前设备所有生成与游玩按键已被全面锁死。<br>
                <b>【全量取证机制】</b>：导出的记忆卡已<b>完整保留你被封前的所有历史对话与全部游戏记录</b>。<br>
                请点击下方按钮导出卡片并联系管理员审核，核验确属误判后将为你解除封禁。
            </p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <button id="lockExportBackupBtn" style="padding: 12px; font-size: 14px; font-weight: 700; border: none; border-radius: 10px; background: #dc2626; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <span>📥</span> 导出全量取证记忆卡 (发送给管理员)
                </button>
                <button id="toggleAdminUnlockFormBtn" style="padding: 10px; font-size: 13px; font-weight: 700; border: 1px solid #ccc; border-radius: 10px; background: #f9fafb; color: #374151; cursor: pointer;">
                    🔐 管理员密匙解锁入口
                </button>
            </div>

            <!-- 模糊占位符，绝不暴露真实密码 -->
            <div id="inlineAdminUnlockBox" style="display: none; margin-top: 14px; padding: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; text-align: left;">
                <div style="font-size: 12px; font-weight: 700; color: #344155; margin-bottom: 6px;">请输入管理员专属解封密匙：</div>
                <div style="display: flex; gap: 6px;">
                    <input type="password" id="inlineAdminKeyInput" placeholder="请输入管理员私密解封指令..." style="flex: 1; padding: 8px; border-radius: 8px; border: 1px solid #94a3b8; font-size: 13px;">
                    <button id="btnDoInlineUnlock" style="padding: 8px 14px; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer;">验证解锁</button>
                </div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">管理员核验通过后，输入密匙将彻底解除当前手机的设备封锁令并自动重启进入主界面。</div>
            </div>
        </div>
    `;
    lockMask.style.display = 'flex';

    document.getElementById('lockExportBackupBtn').onclick = () => {
        if (typeof openBackupModal === 'function') openBackupModal();
    };

    const toggleBtn = document.getElementById('toggleAdminUnlockFormBtn');
    const unlockBox = document.getElementById('inlineAdminUnlockBox');
    toggleBtn.onclick = () => {
        const isHidden = unlockBox.style.display === 'none';
        unlockBox.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            document.getElementById('inlineAdminKeyInput')?.focus();
        }
    };

    // 执行解锁验证并彻底清除状态、刷新进入游戏
    document.getElementById('btnDoInlineUnlock').onclick = () => {
        const inputKey = document.getElementById('inlineAdminKeyInput').value;
        if (!inputKey) { alert('请输入管理员密匙！'); return; }

        if (OtomeSecurityGuard.unlockDeviceWithKey(inputKey)) {
            alert('🎉 管理员密匙验证成功！正在彻底解除设备封锁并重启游戏...');
            // 彻底杀死遮罩并重启页面，让干净的状态生效
            window.location.reload();
        } else {
            alert('❌ 密匙错误！解锁失败，该设备保持锁定。');
        }
    };
}
window.showDeviceBanLockScreen = showDeviceBanLockScreen;

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