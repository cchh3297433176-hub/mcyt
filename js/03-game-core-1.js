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
    
    // 头部头像展示更新：如果上传了头像则显示，否则保留默认
    if (G.player.avatar && dom.headerAvatarImg) {
        dom.headerAvatarImg.src = G.player.avatar;
        dom.headerAvatarImg.style.display = 'block';
    } else if (dom.headerAvatarImg) {
        dom.headerAvatarImg.style.display = 'none';
        if (dom.headerAvatar) dom.headerAvatar.textContent = '👤';
    }
    autoSaveGame();
}

// 核心修复：switchTab 健壮识别 socialTab 与 browserTab
function switchTab(tab) {
    const map = {
        story: 'storyTab',
        stream: 'streamTab',
        dashboard: 'dashboardTab',
        shop: 'shopTab',
        social: 'socialTab',
        browser: 'browserTab',
        data: 'dataTab',
        memoir: 'memoirTab',
        feed: 'feedTab',
        achievements: 'achievementsTab'
    };
    const targetId = map[tab];

    // 切换顶部按钮高亮（若顶部没有该按钮则保留原高亮）
    if (document.querySelector(`.tab-btn[data-tab="${tab}"]`)) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
    }

    // 切换右侧内容区块展示
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.toggle('active', el.id === targetId);
        if (el.id === targetId) {
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    });

    // 触发对应面板的渲染
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
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (activeTab === 'data') renderDataPanel();
    if (activeTab === 'dashboard') renderDashboard();
    if (activeTab === 'social' || document.getElementById('socialTab')?.style.display === 'block') renderSocialPanel();
    if (document.getElementById('browserTab')?.style.display === 'block' && typeof renderBrowserPanel === 'function') renderBrowserPanel();
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
// ============================================================