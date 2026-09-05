// 行动处理与浏览器同人中心
// ============================================================
async function performAction(action, detail = '', useSearch = false) {
    if (G.isGenerating) { showToast('⏳ 正在生成剧情...'); return; }
    if (action === 'next') { advanceDayFree(); return; }

    // 核心重构：聊天与同人属于手机内置 App / 浏览器，0消耗行动点，不推进时段！
    if (action === 'chat' || action === 'dm' || action === 'friend' || action === 'fanclub') {
        switchTab('social');
        return;
    }
    if (action === 'fanart') {
        switchTab('browser');
        return;
    }

    if (action !== 'video' && G.actionPoints < 2) { showToast('⚠️ 行动点不足，需要2点推进时段', 'error'); return; }
    if (action !== 'video') G.actionPoints -= 2;

    switch (action) {
        case 'stream':
            switchTab('stream');
            showToast('📺 切换到直播页面', 'success', 1500);
            break;
        case 'video':
            openVideoModal();
            return;
        case 'collab':
            await handleCollab(detail, useSearch);
            break;
        case 'comment':
            await handleComment(detail, useSearch);
            break;
        case 'sub':
            await handleSubAction(detail, useSearch);
            break;
        default:
            await generateStory('🎮 行动', `玩家选择了「${action}」${detail ? '：'+detail : ''}`, useSearch);
    }
    if (action !== 'video') {
        advanceTimeSlot();
    }
    renderAllPanels();
    updateUI();
    checkAchievements();
}

function triggerRandomFriendRequest() {
    const fanTypes = [
        { name: 'RedstoneBoy_' + rand(10, 99), reason: '视频热心粉丝', persona: '超喜欢你的红石黑科技视频，希望能向你请教！' },
        { name: 'PixelBuilder' + rand(1, 99), reason: '建筑同好', persona: '也是一名MC建筑爱好者，看了你的实况特别想加好友一起交流！' },
        { name: 'SpeedRunnerMC', reason: '速通同行主播', persona: '经常在各大榜单看到你的名字，加个好友有机会联机切磋！' },
        { name: 'MikuCraft' + rand(100, 999), reason: '直播铁粉', persona: '从你开播第一天就在看直播的老粉，天天给你刷礼物！' },
        { name: 'EndCityWalker', reason: '探索模组玩家', persona: '性格比较随和，喜欢到处挖矿和探索遗迹的休闲玩家。' }
    ];
    const chosen = pick(fanTypes);
    if (Object.values(G.npcs).some(n => n.name === chosen.name) || (G.friendRequests || []).some(r => r.name === chosen.name)) return;
    
    receiveFriendRequest({
        name: chosen.name,
        fromReason: chosen.reason,
        persona: chosen.persona,
        avatarEmoji: pick(['🎮', '⛏️', '🏹', '🎨', '🌟', '👒', '🎧', '👾']),
        day: G.day
    });
}

async function handleCollab(detail, useSearch = false) {
    const availableNPCs = Object.values(G.npcs).filter(n => (n.favor || 0) >= 40);
    let npc = null;
    if (availableNPCs.length > 0) npc = pick(availableNPCs);
    let extra = 0;
    if (npc) {
        const skills = npc.skills || { building: 0, redstone: 0, pvp: 0, survival: 0, hunting: 0 };
        const avg = (skills.building + skills.redstone + skills.pvp + skills.survival + skills.hunting) / 5;
        extra = Math.floor(avg * 10);
        for (const sk of ['building', 'redstone', 'pvp', 'survival', 'hunting']) {
            G.player.skills[sk] = Math.min(100, (G.player.skills[sk] || 0) + rand(1, 2));
        }
        addMemoir('合作视频', `与 ${npc.name} 合作，收益加成 ${extra}`);
    }
    await generateStory('🤜 合作视频', `玩家与${npc ? npc.name : '好友'}合作拍摄了一期视频，${detail || '强强联合，效果炸裂'}`, useSearch);
    G.totalCollabs++;
    G.player.followers += rand(200, 800) + extra;
    G.player.money += rand(20, 60) + extra;
    G.player.likes += rand(30, 100) + extra;
    updateUI();
}

async function handleComment(detail, useSearch = false) {
    await generateStory('💭 评论互动', `玩家在其他视频下评论，${detail || '发表有趣观点，引发热议'}`, useSearch);
    G.player.followers += rand(20, 100);
    G.player.likes += rand(5, 20);
    updateUI();
}

async function handleSubAction(detail, useSearch = false) {
    await generateStory('🧘 皮下活动', `玩家选择进行皮下活动：${detail || '放松身心'}`, useSearch);
    const lower = (detail || '').toLowerCase();
    const isMinecraft = lower.includes('minecraft') || lower.includes('mc') || lower.includes('我的世界') || lower.includes('玩');
    if (isMinecraft && Math.random() < 0.12) {
        const npc = G.npcs.dream;
        if (npc) {
            const gain = rand(3, 6);
            npc.favor = Math.min(100, (npc.favor || 0) + gain);
            G.player.metDream = true;
            appendStory(`🎉 你在MC中偶遇了神秘大神 Dream！好感度 +${gain}！`, '👾 偶遇 Dream');
            showToast('🌟 你偶遇了 Dream！好感度增加！', 'success', 3000);
            updateUI();
        }
    }
    G.player.followers += rand(1, 10);
    updateUI();
}

// ============================================================
// 🌐 浏览器 App & AO3 同人中心
// ============================================================
if (!G.browserState) {
    G.browserState = {
        view: 'home', // 'home' | 'ao3' | 'ao3_read'
        activeWorkId: null,
        urlText: 'browser://bookmarks'
    };
}
if (!G.fanworks) G.fanworks = [];
if (!G.ao3User) {
    G.ao3User = {
        username: (G.player && G.player.ytName) || 'MC_CraftMaster',
        avatarEmoji: '📖'
    };
}

function getIsPlayerAo3MainAccount() {
    return G.ao3User && G.player && (G.ao3User.username.trim() === G.player.ytName.trim());
}

function renderBrowserPanel() {
    const container = document.getElementById('browserTab');
    if (!container) return;
    const st = G.browserState;

    let bodyHtml = '';
    if (st.view === 'home') {
        bodyHtml = `
        <div style="padding:16px 14px;background:#fff;border-bottom:1px solid #eee;">
            <div style="font-size:16px;font-weight:700;color:var(--text);">🌐 手机浏览器</div>
            <div style="font-size:12px;color:#888;margin-top:2px;">点击书签快速访问外部同人社区与论坛</div>
        </div>
        <div class="browser-bookmarks-grid">
            <div class="browser-bookmark-item" onclick="openAo3Home()">
                <div class="browser-bookmark-icon" style="background:#900;color:#fff;">📚</div>
                <div class="browser-bookmark-title">Archive of Our Own (AO3)</div>
            </div>
            <div class="browser-bookmark-item" onclick="showToast('💡 论坛正在维护升级中', 'info')">
                <div class="browser-bookmark-icon" style="background:#2b5278;color:#fff;">🎮</div>
                <div class="browser-bookmark-title">MC 官方论坛</div>
            </div>
            <div class="browser-bookmark-item" onclick="showToast('💡 维基百科已收录你的名录', 'info')">
                <div class="browser-bookmark-icon" style="background:#4a4a4a;color:#fff;">📖</div>
                <div class="browser-bookmark-title">MC Wiki 百科</div>
            </div>
            <div class="browser-bookmark-item" onclick="showToast('💡 热门趋势正在分析中', 'info')">
                <div class="browser-bookmark-icon" style="background:#e040fb;color:#fff;">🔥</div>
                <div class="browser-bookmark-title">油管热搜榜</div>
            </div>
        </div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:12px;padding:20px;text-align:center;">
            点击上方「AO3」图标，即可查看同人文、使用大号/小号创作或与读者书评互动！
        </div>
        `;
        st.urlText = 'browser://bookmarks';
    } else if (st.view === 'ao3') {
        bodyHtml = buildAo3HomeHTML();
        st.urlText = 'https://archiveofourown.org/tags/Minecraft_YT';
    } else if (st.view === 'ao3_read') {
        bodyHtml = buildAo3ReadHTML(st.activeWorkId);
        st.urlText = `https://archiveofourown.org/works/${st.activeWorkId || ''}`;
    }

    container.innerHTML = `
    <div class="browser-app-wrap">
        <div class="browser-header-bar">
            <button class="browser-nav-btn" onclick="handleBrowserBack()">❮</button>
            <div class="browser-url-box">
                <span>🔒</span>
                <span style="overflow:hidden;text-overflow:ellipsis;">${escapeHtml(st.urlText)}</span>
            </div>
            <button class="browser-nav-btn" onclick="renderBrowserPanel()" title="刷新">🔄</button>
            <button class="browser-nav-btn" onclick="G.browserState.view='home'; renderBrowserPanel();" title="主页">🏠</button>
        </div>
        <div class="browser-body">
            ${bodyHtml}
        </div>
    </div>
    `;

    bindBrowserPanelEvents(container);
}

function handleBrowserBack() {
    const st = G.browserState;
    if (st.view === 'ao3_read') {
        st.view = 'ao3';
        renderBrowserPanel();
    } else if (st.view === 'ao3') {
        st.view = 'home';
        renderBrowserPanel();
    } else {
        switchTab('story');
    }
}

function openAo3Home() {
    G.browserState.view = 'ao3';
    renderBrowserPanel();
}

function buildAo3HomeHTML() {
    const works = [...(G.fanworks || [])].reverse();
    const isMain = getIsPlayerAo3MainAccount();
    const currentAo3Name = (G.ao3User && G.ao3User.username) || G.player.ytName;

    let worksListHtml = '';
    if (!works.length) {
        worksListHtml = `
        <div style="text-align:center;padding:50px 20px;color:#888;">
            <div style="font-size:32px;margin-bottom:8px;">📖</div>
            <div style="font-weight:700;font-size:14px;">当前收藏夹空空如也</div>
            <div style="font-size:12px;margin-top:4px;">长按或点击右侧管理即可编辑/删除已有书籍。点击右上角 ➕ 开坑新书吧！</div>
            <button class="btn-primary" onclick="triggerFanCreationPrompt()" style="margin-top:14px;max-width:200px;display:inline-block;padding:8px 16px;font-size:13px;">🎲 随机生成粉丝同人文</button>
        </div>
        `;
    } else {
        worksListHtml = works.map(w => {
            const tags = (w.tags || []).slice(0, 4).map(t => `<span class="ao3-tag-badge">#${escapeHtml(t)}</span>`).join('');
            const chapterCount = (w.chapters && w.chapters.length) ? w.chapters.length : 1;
            const coverHtml = w.coverUrl 
                ? `<img src="${w.coverUrl}">` 
                : `<div style="font-size:24px;">${w.coverEmoji || '📖'}</div>`;

            const isAuthorMe = w.author === G.player.ytName;
            const authorBadge = isAuthorMe 
                ? `<span style="background:#ffefe8;color:#d84315;border:1px solid #ffccbc;border-radius:4px;padding:0 4px;font-size:10px;font-weight:700;">正主大号</span>` 
                : '';

            return `
            <div class="ao3-work-entry" data-work-id="${w._id}">
                <div class="ao3-work-cover">${coverHtml}</div>
                <div class="ao3-work-meta">
                    <div class="ao3-work-title">${escapeHtml(w.title)}</div>
                    <div class="ao3-work-author">by <span style="color:#900;font-weight:600;">${escapeHtml(w.author || '匿名粉')}</span> ${authorBadge}${w.pairing ? ` · CP: <b>${escapeHtml(w.pairing)}</b>` : ''}</div>
                    <div>${tags}</div>
                    <div class="ao3-work-summary">${escapeHtml(w.summary || '暂无简介')}</div>
                    <div class="ao3-stats-row">
                        <span>📖 ${chapterCount} 章</span>
                        <span>💚 ${w.kudos || 0} Kudos</span>
                        <span>💬 ${(w.reviews || []).length + (w.comments || 0)} 评论</span>
                        <button class="ao3-manage-book-btn" data-act-id="${w._id}">⚙️ 管理/长按</button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    return `
    <div class="ao3-site-container">
        <div class="ao3-topbar">
            <span class="ao3-logo-title">Archive of Our Own <sup>beta</sup></span>
            <div class="ao3-user-badge" id="ao3UserAccountBtn" title="点击切换/设置账号">
                <span>👤</span>
                <span>${escapeHtml(currentAo3Name)}</span>
                <span style="font-size:9px;opacity:0.85;">(${isMain ? '主播大号' : '小号'})</span>
            </div>
        </div>
        <div class="ao3-sub-nav">
            <span>标签：<b>MC YouTube (${(G.fanworks||[]).length} Works)</b></span>
            <div style="display:flex;gap:4px;">
                <button id="ao3RandomGenBtn" title="粉丝随机创作" style="background:#700;color:#fff;border:none;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer;">🎲 催粉发文</button>
                <button id="ao3NewBookBtn" title="自己开坑" style="background:#2e7d32;color:#fff;border:none;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer;">➕ 开坑新书</button>
            </div>
        </div>
        <div style="font-size:11px;color:#888;padding:5px 12px;background:#fff8ee;border-bottom:1px dashed #e8d8c8;">
            💡 提示：长按书籍卡片或点击「⚙️管理」可编辑小说人设、更换封面或删除书籍。
        </div>
        <div class="ao3-work-list">
            ${worksListHtml}
        </div>
    </div>
    `;
}

function openAo3Reader(id) {
    G.browserState.view = 'ao3_read';
    G.browserState.activeWorkId = id;
    renderBrowserPanel();
}

function buildAo3ReadHTML(id) {
    const work = (G.fanworks || []).find(w => w._id === id);
    if (!work) {
        return `<div style="padding:30px;text-align:center;color:#888;">找不到该作品 <button onclick="G.browserState.view='ao3';renderBrowserPanel();">返回列表</button></div>`;
    }

    if (!work.chapters || !work.chapters.length) {
        work.chapters = [{
            chapterNum: 1,
            title: work.title,
            content: work.content || '正文内容暂缺...',
            day: work.day || G.day
        }];
    }

    const totalChapters = work.chapters.length;
    const currentChapterIdx = (work.activeChapterIdx !== undefined && work.activeChapterIdx < totalChapters) 
        ? work.activeChapterIdx 
        : (totalChapters - 1);
    
    work.activeChapterIdx = currentChapterIdx;
    const chapter = work.chapters[currentChapterIdx] || work.chapters[0];

    const tagsHtml = (work.tags || []).map(t => `<span class="ao3-tag-badge">#${escapeHtml(t)}</span>`).join('');
    const coverHtml = work.coverUrl 
        ? `<img src="${work.coverUrl}" style="width:64px;height:90px;border-radius:4px;object-fit:cover;border:1px solid #ccc;float:right;margin-left:8px;">` 
        : '';

    let chapterOptions = '';
    work.chapters.forEach((c, idx) => {
        chapterOptions += `<option value="${idx}" ${idx === currentChapterIdx ? 'selected' : ''}>第 ${idx + 1} 章：${escapeHtml(c.title || `第${idx+1}章`)}</option>`;
    });

    const isFirstChapter = currentChapterIdx === 0;
    const isLastChapter = currentChapterIdx === totalChapters - 1;

    // 渲染评论区
    if (!work.reviews) work.reviews = [];
    let reviewsHtml = '';
    if (!work.reviews.length) {
        reviewsHtml = `<div style="text-align:center;color:#999;font-size:12px;padding:16px 0;">暂无书评，点击下方「🎲 生成读者书评」或发表你的感想吧！</div>`;
    } else {
        reviewsHtml = work.reviews.map((rev, rIdx) => {
            let repliesHtml = '';
            if (rev.replies && rev.replies.length) {
                repliesHtml = `<div class="ao3-replies-list">` + rev.replies.map(rep => `
                    <div class="ao3-reply-entry">
                        <span style="font-weight:700;color:${rep.isSelf ? '#2e7d32' : '#900'};">${escapeHtml(rep.author)}</span>
                        ${rep.isSelf ? '<span style="font-size:9px;background:#eaf5ea;color:#2e7d32;padding:1px 4px;border-radius:4px;margin-left:3px;">你</span>' : ''}：
                        <span>${escapeHtml(rep.text)}</span>
                        <div style="font-size:9px;color:#bbb;text-align:right;">${rep.time || ''}</div>
                    </div>
                `).join('') + `</div>`;
            }

            return `
            <div class="ao3-comment-item">
                <div class="ao3-comment-header">
                    <span class="ao3-comment-user">${escapeHtml(rev.author)}</span>
                    <span style="font-size:10px;color:#aaa;">${rev.time || ''}</span>
                </div>
                <div class="ao3-comment-text">${escapeHtml(rev.text)}</div>
                <div class="ao3-comment-actions">
                    <button class="btn-secondary small" onclick="openAo3ReplyModal('${work._id}', ${rIdx})">💬 回复</button>
                </div>
                ${repliesHtml}
            </div>
            `;
        }).join('');
    }

    const currentAo3Name = (G.ao3User && G.ao3User.username) || G.player.ytName;

    return `
    <div class="ao3-site-container" style="padding:14px;background:#fdfbf7;">
        <div style="border-bottom:2px solid #900;padding-bottom:12px;margin-bottom:12px;">
            ${coverHtml}
            <div style="font-size:10px;color:#900;letter-spacing:1px;font-weight:700;">ARCHIVE OF OUR OWN · FANWORK</div>
            <div style="font-size:20px;font-weight:700;color:#222;margin-top:4px;">${escapeHtml(work.title)}</div>
            <div style="font-size:12px;color:#666;margin:3px 0;">by <span style="color:#900;font-weight:700;">${escapeHtml(work.author || '匿名粉')}</span>${work.pairing ? ` · CP: <b>${escapeHtml(work.pairing)}</b>` : ''}</div>
            <div style="margin:6px 0;">${tagsHtml}</div>
            <div style="font-size:11px;color:#888;">
                共 ${totalChapters} 章 · 💚 Kudos ${work.kudos || 0} · 💬 ${work.reviews.length + (work.comments || 0)} 评论
            </div>
            ${work.summary ? `<div style="font-size:12px;color:#555;font-style:italic;background:#f5eee1;padding:8px 10px;border-left:3px solid #900;margin-top:10px;">${escapeHtml(work.summary)}</div>` : ''}
        </div>

        <!-- 章节上一章/下一章导航栏 -->
        <div class="ao3-chapter-nav-bar">
            <button class="ao3-nav-step-btn" id="ao3PrevChapterBtn" ${isFirstChapter ? 'disabled' : ''}>⬅️ 上一章</button>
            <select id="ao3ChapterSelect" style="font-size:12px;border-radius:6px;border:1px solid #ccc;padding:4px;background:#fff;max-width:48%;">
                ${chapterOptions}
            </select>
            <button class="ao3-nav-step-btn" id="ao3NextChapterBtn" ${isLastChapter ? 'disabled' : ''}>下一章 ➡️</button>
        </div>

        <div style="font-size:16px;font-weight:700;color:#900;margin:8px 0 12px;border-bottom:1px dashed #ddd;padding-bottom:4px;">
            第 ${currentChapterIdx + 1} 章：${escapeHtml(chapter.title || `第${currentChapterIdx+1}章`)}
        </div>

        <div style="font-size:14.5px;line-height:2.05;color:#1a1a1a;white-space:pre-wrap;word-break:break-word;font-family:Georgia,serif;padding:4px 2px;">
            ${escapeHtml(chapter.content)}
        </div>

        <div style="margin-top:20px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
            <button id="ao3UrgeBtn" style="background:#900;color:#fff;border:none;padding:7px 16px;border-radius:18px;font-size:12px;font-weight:700;cursor:pointer;">📢 催更续写第 ${totalChapters + 1} 章</button>
            <button id="ao3GiveKudosBtn" style="background:#fff;border:1px solid #900;color:#900;padding:7px 16px;border-radius:18px;font-size:12px;font-weight:700;cursor:pointer;">💚 投喂 Kudos (${work.kudos || 0})</button>
        </div>

        <!-- 评论互动区 -->
        <div class="ao3-comments-section">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <span style="font-size:15px;font-weight:700;color:#900;">💬 读者评论区 (${work.reviews.length})</span>
                <div style="display:flex;gap:6px;">
                    <button class="btn-secondary small" id="ao3GenCommentsBtn">🎲 生成书评</button>
                    <button class="btn-primary small" id="ao3PostMyCommentBtn" style="margin:0;padding:4px 10px;font-size:11px;">✍️ 我要写评</button>
                </div>
            </div>
            <div style="font-size:11px;color:#888;margin-bottom:10px;">
                当前评论身份：<b style="color:#2e7d32;">${escapeHtml(currentAo3Name)}</b> ${getIsPlayerAo3MainAccount() ? '（主播实名）' : '（小号）'}
            </div>
            <div id="ao3ReviewsListContainer">
                ${reviewsHtml}
            </div>
        </div>
    </div>
    `;
}

function bindBrowserPanelEvents(container) {
    document.getElementById('ao3UserAccountBtn')?.addEventListener('click', openAo3AccountSettingsModal);
    document.getElementById('ao3RandomGenBtn')?.addEventListener('click', triggerFanCreationPrompt);
    document.getElementById('ao3NewBookBtn')?.addEventListener('click', openCreateCustomBookModal);

    // 书架长按 / 点击管理
    container.querySelectorAll('.ao3-work-entry').forEach(el => {
        const wid = el.dataset.workId;
        const coverEl = el.querySelector('.ao3-work-cover');
        const titleEl = el.querySelector('.ao3-work-title');

        coverEl?.addEventListener('click', () => openAo3Reader(wid));
        titleEl?.addEventListener('click', () => openAo3Reader(wid));

        // 统一长按交互
        bindLongPressEvent(el, () => openAo3WorkActionModal(wid), null);
    });

    container.querySelectorAll('.ao3-manage-book-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            openAo3WorkActionModal(btn.dataset.actId);
        };
    });

    // 章节选择与翻页
    const chSelect = document.getElementById('ao3ChapterSelect');
    if (chSelect) {
        chSelect.onchange = () => {
            const work = (G.fanworks || []).find(w => w._id === G.browserState.activeWorkId);
            if (work) {
                work.activeChapterIdx = parseInt(chSelect.value) || 0;
                renderBrowserPanel();
            }
        };
    }

    document.getElementById('ao3PrevChapterBtn')?.addEventListener('click', () => {
        const work = (G.fanworks || []).find(w => w._id === G.browserState.activeWorkId);
        if (work && work.activeChapterIdx > 0) {
            work.activeChapterIdx--;
            renderBrowserPanel();
        }
    });

    document.getElementById('ao3NextChapterBtn')?.addEventListener('click', () => {
        const work = (G.fanworks || []).find(w => w._id === G.browserState.activeWorkId);
        if (work && work.activeChapterIdx < (work.chapters.length - 1)) {
            work.activeChapterIdx++;
            renderBrowserPanel();
        }
    });

    // 催更与点赞
    document.getElementById('ao3UrgeBtn')?.addEventListener('click', () => {
        urgeContinueBookChapter(G.browserState.activeWorkId);
    });

    document.getElementById('ao3GiveKudosBtn')?.addEventListener('click', () => {
        const work = (G.fanworks || []).find(w => w._id === G.browserState.activeWorkId);
        if (work) {
            work.kudos = (work.kudos || 0) + rand(1, 5);
            showToast('💚 已给作者投喂 Kudos！', 'success', 1500);
            renderBrowserPanel();
            autoSaveGame();
        }
    });

    // 书评系统：生成与自写
    document.getElementById('ao3GenCommentsBtn')?.addEventListener('click', () => {
        generateAo3ReviewsByAI(G.browserState.activeWorkId);
    });

    document.getElementById('ao3PostMyCommentBtn')?.addEventListener('click', () => {
        openAo3WriteCommentModal(G.browserState.activeWorkId);
    });
}

// 👤 AO3 账号与披皮小号设置弹窗
function openAo3AccountSettingsModal() {
    const currentAo3Name = (G.ao3User && G.ao3User.username) || G.player.ytName;
    const isMain = currentAo3Name.trim() === G.player.ytName.trim();

    openModal(`
        <h3>👤 AO3 账户设置</h3>
        <p style="font-size:12px;color:#666;line-height:1.6;">
            在同人社区，你可以选择使用<b>主播大号</b>实名发文/评论，或者换上<b>披皮小号</b>进行创作交流。
        </p>
        <div class="form-group">
            <label>当前 AO3 用户名 / 笔名</label>
            <input type="text" id="ao3UsernameInput" value="${escapeHtml(currentAo3Name)}" placeholder="输入你在 AO3 的账号昵称...">
        </div>
        <div style="background:#f7faf7;border:1px solid #dce8dc;padding:10px;border-radius:8px;font-size:12px;margin:8px 0;line-height:1.5;">
            <div><b>当前状态说明：</b></div>
            <div id="ao3NameStatusHint" style="margin-top:4px;color:${isMain ? '#2e7d32' : '#8a5a00'};">
                ${isMain 
                    ? '🌟 <b>主播大号模式</b>：名字与你的 YouTube 频道完全一致。AI 和读者将直接认出是你本人！发文或写评会引发粉丝全体震惊与狂欢！' 
                    : '🎭 <b>披皮小号模式</b>：名字与主播不同。读者不知道是你，但可能会因为神级操作或习惯细节产生“掉马怀疑”！'}
            </div>
        </div>
        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" id="ao3ResetToMainBtn">还原为主播大号</button>
            <button class="btn-primary" id="ao3SaveAccountBtn">保存设置</button>
        </div>
    `);

    const input = document.getElementById('ao3UsernameInput');
    const hint = document.getElementById('ao3NameStatusHint');

    input.oninput = () => {
        const val = input.value.trim();
        const eq = val === G.player.ytName.trim();
        hint.style.color = eq ? '#2e7d32' : '#8a5a00';
        hint.innerHTML = eq 
            ? '🌟 <b>主播大号模式</b>：名字与你的 YouTube 频道完全一致。AI 和读者将直接认出是你本人！'
            : '🎭 <b>披皮小号模式</b>：名字与主播不同。读者不知道是你，但可能偶发掉马怀疑。';
    };

    document.getElementById('ao3ResetToMainBtn').onclick = () => {
        input.value = G.player.ytName;
        input.dispatchEvent(new Event('input'));
    };

    document.getElementById('ao3SaveAccountBtn').onclick = () => {
        const val = input.value.trim();
        if (!val) { showToast('⚠️ 用户名不能为空', 'error'); return; }
        if (!G.ao3User) G.ao3User = {};
        G.ao3User.username = val;
        closeModal();
        showToast(`✅ AO3 账号已切换为「${val}」`, 'success', 2000);
        renderBrowserPanel();
        autoSaveGame();
    };
}

// ⚙️ 书籍管理弹窗：编辑设定 or 删除书籍
function openAo3WorkActionModal(workId) {
    const work = (G.fanworks || []).find(w => w._id === workId);
    if (!work) return;

    openModal(`
        <h3>📚 小说管理：《${escapeHtml(work.title)}》</h3>
        <p style="font-size:12px;color:#666;">你可以修改小说的人设标签、简介、封面，或将该作品移出书架。</p>
        <div class="btn-row" style="flex-direction:column;gap:8px;">
            <button class="btn-primary" id="actEditBookBtn" style="width:100%;">✏️ 编辑书籍信息与封面</button>
            <button class="btn-secondary" id="actDelBookBtn" style="width:100%;color:#c62828;border-color:#ffcdd2;">🗑️ 从书架中删除该书</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">取消</button>
        </div>
    `);

    document.getElementById('actEditBookBtn').onclick = () => {
        closeModal();
        openEditBookSettingsModal(workId);
    };

    document.getElementById('actDelBookBtn').onclick = () => {
        if (confirm(`确定要从 AO3 书架中删除《${work.title}》吗？`)) {
            const idx = G.fanworks.findIndex(w => w._id === workId);
            if (idx !== -1) G.fanworks.splice(idx, 1);
            if (G.browserState.activeWorkId === workId) {
                G.browserState.view = 'ao3';
                G.browserState.activeWorkId = null;
            }
            showToast('🗑️ 书籍已删除', 'success', 1500);
            closeModal();
            renderBrowserPanel();
            autoSaveGame();
        }
    };
}

// ✏️ 编辑书籍设定弹窗
function openEditBookSettingsModal(workId) {
    const work = (G.fanworks || []).find(w => w._id === workId);
    if (!work) return;

    openModal(`
        <h3>✏️ 编辑书籍设定</h3>
        <div class="form-group">
            <label>书籍名称 <span class="required">*</span></label>
            <input type="text" id="editBookTitle" value="${escapeHtml(work.title)}">
        </div>
        <div class="form-group">
            <label>涉及 CP / 关系</label>
            <input type="text" id="editBookPairing" value="${escapeHtml(work.pairing || '')}">
        </div>
        <div class="form-group">
            <label>标签 Tags（逗号隔开）</label>
            <input type="text" id="editBookTags" value="${escapeHtml((work.tags || []).join(', '))}">
        </div>
        <div class="form-group">
            <label>封面设置</label>
            <div style="display:flex;align-items:center;gap:10px;">
                <label class="upload-btn" style="cursor:pointer;padding:6px 12px;font-size:12px;">
                    📁 更换封面图
                    <input type="file" id="editCoverFileInput" accept="image/*" style="display:none;">
                </label>
                <input type="text" id="editCoverEmoji" value="${escapeHtml(work.coverEmoji || '📖')}" style="width:50px;text-align:center;">
                <div id="editCoverPreview" style="width:40px;height:56px;border:1px solid #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;background:#eee;overflow:hidden;font-size:20px;">
                    ${work.coverUrl ? `<img src="${work.coverUrl}" style="width:100%;height:100%;object-fit:cover;">` : (work.coverEmoji || '📖')}
                </div>
            </div>
        </div>
        <div class="form-group">
            <label>故事简介</label>
            <textarea id="editBookSummary" rows="3">${escapeHtml(work.summary || '')}</textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="saveEditBookBtn">💾 保存修改</button>
        </div>
    `);

    let newCoverUrl = work.coverUrl || '';
    document.getElementById('editCoverFileInput').onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            newCoverUrl = evt.target.result;
            document.getElementById('editCoverPreview').innerHTML = `<img src="${newCoverUrl}" style="width:100%;height:100%;object-fit:cover;">`;
            showToast('✅ 封面已选择', 'success', 1200);
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('saveEditBookBtn').onclick = () => {
        const t = document.getElementById('editBookTitle').value.trim();
        const p = document.getElementById('editBookPairing').value.trim();
        const tagStr = document.getElementById('editBookTags').value.trim();
        const em = document.getElementById('editCoverEmoji').value.trim() || '📖';
        const s = document.getElementById('editBookSummary').value.trim();

        if (!t) { showToast('⚠️ 标题不能为空', 'error'); return; }

        work.title = t;
        work.pairing = p;
        work.tags = tagStr ? tagStr.split(/[,，\s]+/).filter(Boolean) : [];
        work.coverUrl = newCoverUrl;
        work.coverEmoji = em;
        work.summary = s;

        closeModal();
        showToast('✅ 书籍信息已更新！', 'success');
        renderBrowserPanel();
        autoSaveGame();
    };
}

// 🎲 触发粉丝随机发文
async function triggerFanCreationPrompt() {
    if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }
    openModal(`
        <h3>🎲 粉丝同人创作</h3>
        <p style="font-size:12px;color:#666;">粉丝们正在 AO3 上为你创作同人小说，可指定灵感关键词或任由粉丝放飞：</p>
        <div class="form-group">
            <textarea id="fanPromptDetail" rows="2" placeholder="可选：例如「与 Dream 联机迷路」、「红石实验室大爆炸」、「和 Twixxel 一起露营」..."></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="confirmGenFanBtn">开始创作 (0消耗)</button>
        </div>
    `);

    document.getElementById('confirmGenFanBtn').onclick = async () => {
        const detail = document.getElementById('fanPromptDetail').value.trim();
        closeModal();
        await generateNewBookFromAI({
            themePrompt: detail,
            author: '狂热粉丝_' + rand(10, 99)
        });
    };
}

// ➕ 开坑自建书籍弹窗（支持绑定当前 AO3 账号）
function openCreateCustomBookModal() {
    const currentAo3Name = (G.ao3User && G.ao3User.username) || G.player.ytName;
    const isMain = getIsPlayerAo3MainAccount();

    openModal(`
        <h3>➕ AO3 开坑新书</h3>
        <div style="font-size:12px;color:#666;margin-bottom:8px;">
            发布账号：<b style="color:${isMain ? '#2e7d32' : '#8a5a00'};">${escapeHtml(currentAo3Name)}</b> ${isMain ? '（主播实名发布）' : '（小号发布）'}
        </div>
        <div class="form-group">
            <label>书籍名称 <span class="required">*</span></label>
            <input type="text" id="newBookTitle" placeholder="如：《下界回响：红石冒险录》">
        </div>
        <div class="form-group">
            <label>涉及 CP / 角色关系</label>
            <input type="text" id="newBookPairing" placeholder="如：${G.player.ytName} & Dream / 友情向">
        </div>
        <div class="form-group">
            <label>标签 Tags（用逗号隔开）</label>
            <input type="text" id="newBookTags" placeholder="如：冒险, 生存, 强强, 互损日常">
        </div>
        <div class="form-group">
            <label>封面设置（本地相册上传 / Emoji）</label>
            <div style="display:flex;align-items:center;gap:10px;">
                <label class="upload-btn" style="cursor:pointer;padding:6px 12px;font-size:12px;">
                    📁 选择本地封面图
                    <input type="file" id="newBookCoverFile" accept="image/*" style="display:none;">
                </label>
                <input type="text" id="newBookEmoji" value="📕" style="width:50px;text-align:center;">
                <div id="newBookCoverPreview" style="width:40px;height:56px;border:1px solid #ccc;border-radius:4px;display:flex;align-items:center;justify-content:center;background:#eee;overflow:hidden;font-size:20px;">📕</div>
            </div>
        </div>
        <div class="form-group">
            <label>故事简介与梗概 <span class="required">*</span></label>
            <textarea id="newBookSummary" rows="3" placeholder="写写这本书的主线设定，AI 将依据简介生成首章..."></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="startGenCustomBookBtn">🚀 启动 AI 生成第 1 章</button>
        </div>
    `);

    let loadedCoverUrl = '';
    document.getElementById('newBookCoverFile').onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            loadedCoverUrl = evt.target.result;
            document.getElementById('newBookCoverPreview').innerHTML = `<img src="${loadedCoverUrl}" style="width:100%;height:100%;object-fit:cover;">`;
            showToast('✅ 封面已载入', 'success', 1200);
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('startGenCustomBookBtn').onclick = async () => {
        const title = document.getElementById('newBookTitle').value.trim();
        const summary = document.getElementById('newBookSummary').value.trim();
        const pairing = document.getElementById('newBookPairing').value.trim();
        const tagsRaw = document.getElementById('newBookTags').value.trim();
        const coverEmoji = document.getElementById('newBookEmoji').value.trim() || '📕';

        if (!title) { showToast('⚠️ 请输入书籍名称', 'error'); return; }
        if (!summary) { showToast('⚠️ 请填写简介作为生成线索', 'error'); return; }

        const tags = tagsRaw ? tagsRaw.split(/[,，\s]+/).filter(Boolean) : ['原创同人'];
        closeModal();

        await generateNewBookFromAI({
            customTitle: title,
            customSummary: summary,
            pairing,
            tags,
            coverUrl: loadedCoverUrl,
            coverEmoji,
            author: currentAo3Name
        });
    };
}

// 核心生成器：新建书籍与第一章（智能注入账号背景）
async function generateNewBookFromAI(params = {}) {
    if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }
    G.isGenerating = true;
    showLoading();

    try {
        const p = G.player;
        const authorName = params.author || (G.ao3User && G.ao3User.username) || p.ytName;
        const isAuthorMe = (authorName.trim() === p.ytName.trim());
        const npcNames = Object.values(G.npcs).map(n => n.name).join('、');

        let accountIdentityPrompt = '';
        if (isAuthorMe) {
            accountIdentityPrompt = `【重大背景】：本文是由著名 MC 主播「${p.ytName}」本人亲自以大号在 AO3 上实名开坑创作的！文章风格或字里行间带有正主主播的真实视角和生活痕迹。`;
        } else {
            accountIdentityPrompt = `【作者背景】：作者笔名为「${authorName}」，表面上是一名同人作者，但其实是主播「${p.ytName}」披着的小号。文风极其贴切，偶尔会流露出只有主播才知道的独门红石/探险习惯细节。`;
        }

        let promptGuide = '';
        if (params.customTitle) {
            promptGuide = `
            【书籍设定】
            书名：《${params.customTitle}》
            简介：${params.customSummary}
            关系/CP：${params.pairing || '自由发展'}
            标签：${(params.tags || []).join(', ')}
            请创作第 1 章节，字数 500-800 字。
            `;
        } else {
            promptGuide = `
            【随机同人创作】
            围绕主播「${p.ytName}」（人设：${p.persona}，赛道：${p.category}）。
            相关主播：${npcNames}。
            灵感线索：${params.themePrompt || '自由发挥，符合MC世界与主播生活趣味'}。
            `;
        }

        const sysPrompt = `
        你是一名热爱 Minecraft 主播圈的资深同人文作者，正在 AO3 网站发布小说。
        ${accountIdentityPrompt}
        ${promptGuide}
        请严格按以下标签输出：
        [TITLE]书籍标题[/TITLE]
        [PAIRING]CP关系或角色组合[/PAIRING]
        [TAGS]标签1, 标签2, 标签3[/TAGS]
        [SUMMARY]一段引人入胜的简介（100字左右）[/SUMMARY]
        [CHAPTER_TITLE]第1章标题[/CHAPTER_TITLE]
        [CONTENT]第1章正文内容（500-800字，行文细腻生动，画面感强烈）[/CONTENT]
        `;

        const raw = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: '请创作新书第1章。' }
        ], { maxTokens: 10000, temperature: 0.95 });

        hideLoading();

        const grab = (tag) => { const m = raw.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[/${tag}\\]`)); return m ? m[1].trim() : ''; };
        const title = params.customTitle || grab('TITLE') || 'MC世界奇幻之旅';
        const pairing = params.pairing || grab('PAIRING') || `${p.ytName} & 好友`;
        const tags = params.tags || (grab('TAGS') || '同人, MC, 冒险').split(/[,，、\s]+/).filter(Boolean);
        const summary = params.customSummary || grab('SUMMARY') || '在方块世界中展开的全新篇章。';
        const chTitle = grab('CHAPTER_TITLE') || '初遇与启程';
        const content = grab('CONTENT') || raw.trim();

        const workId = 'ao3_' + Date.now();
        const newWork = {
            _id: workId,
            title,
            pairing,
            tags,
            summary,
            author: authorName,
            coverUrl: params.coverUrl || null,
            coverEmoji: params.coverEmoji || pick(['📕', '📗', '📘', '📙', '📓', '📜']),
            kudos: rand(30, 260),
            comments: rand(2, 35),
            reviews: [],
            day: G.day,
            activeChapterIdx: 0,
            chapters: [{
                chapterNum: 1,
                title: chTitle,
                content: content,
                day: G.day
            }]
        };

        if (!G.fanworks) G.fanworks = [];
        G.fanworks.push(newWork);

        G.player.followers += rand(10, 50);
        G.player.likes += rand(5, 20);

        showToast(`🎉 成功在 AO3 上线新书《${title}》！`, 'success', 2500);
        appendStory(`🎨 AO3 上线了小说《${title}》（作者：${authorName}）！`, '🎨 同人新作');
        autoSaveGame();

        openAo3Reader(workId);

    } catch (e) {
        hideLoading();
        showToast('❌ 同人作品生成失败，请检查网络或配置', 'error');
    } finally {
        G.isGenerating = false;
        updateUI();
    }
}

// 📢 催更续写下一章（增加新的一章，并可随时回看）
async function urgeContinueBookChapter(workId) {
    const work = (G.fanworks || []).find(w => w._id === workId);
    if (!work) return;
    if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }

    G.isGenerating = true;
    showLoading();

    try {
        const nextChapterNum = work.chapters.length + 1;
        const lastChapter = work.chapters[work.chapters.length - 1];
        const lastSlice = (lastChapter && lastChapter.content) ? lastChapter.content.slice(-400) : '';

        const sysPrompt = `
        你正在 AO3 网站上续写 MC 同人小说《${work.title}》（作者：${work.author}，CP: ${work.pairing || '无'}，简介: ${work.summary}）。
        上一章结尾片段如下：
        “${lastSlice}”
        读者正在疯狂催更！请续写【第 ${nextChapterNum} 章】，承接前文剧情，生动推进情节。
        格式要求：
        [CHAPTER_TITLE]本章小标题[/CHAPTER_TITLE]
        [CONTENT]续写正文（500-800字）[/CONTENT]
        `;

        const raw = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: `请续写第 ${nextChapterNum} 章。` }
        ], { maxTokens: 10000, temperature: 0.95 });

        hideLoading();

        const grab = (tag) => { const m = raw.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[/${tag}\\]`)); return m ? m[1].trim() : ''; };
        const chTitle = grab('CHAPTER_TITLE') || `第 ${nextChapterNum} 章`;
        const content = grab('CONTENT') || raw.trim();

        work.chapters.push({
            chapterNum: nextChapterNum,
            title: chTitle,
            content: content,
            day: G.day
        });

        work.kudos = (work.kudos || 0) + rand(15, 60);
        work.comments = (work.comments || 0) + rand(3, 15);
        work.activeChapterIdx = work.chapters.length - 1;

        showToast(`🎉 成功催更！第 ${nextChapterNum} 章已发布！`, 'success', 2500);
        appendStory(`📖 小说《${work.title}》催更成功，更新了第 ${nextChapterNum} 章「${chTitle}」！`, '📢 同人更新');
        autoSaveGame();
        renderBrowserPanel();

    } catch (e) {
        hideLoading();
        showToast('❌ 催更续写失败，请稍后重试', 'error');
    } finally {
        G.isGenerating = false;
        updateUI();
    }
}

// 💬 评论系统：AI 智能生成书评（大号认出 vs 小号疑云）
async function generateAo3ReviewsByAI(workId) {
    const work = (G.fanworks || []).find(w => w._id === workId);
    if (!work) return;
    if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }

    G.isGenerating = true;
    showLoading();

    try {
        const p = G.player;
        const isAuthorMain = (work.author.trim() === p.ytName.trim());

        let accountReactionsPrompt = '';
        if (isAuthorMain) {
            accountReactionsPrompt = `
            【注意重点】：这本书的作者就是主播「${p.ytName}」本人实名开号写的！
            读者评论中必须充满强烈的戏剧性反应：
            1. 读者在评论区集体尖叫：“卧槽？我没看错吧？作者是正主本人？！”
            2. “正主亲自下场产粮了！救命！你视频不更新原来是在背地里写这个？！”
            3. 催促主播开直播朗读自己的同人文。
            `;
        } else {
            accountReactionsPrompt = `
            【注意重点】：作者名叫「${work.author}」（其实是主播 ${p.ytName} 披的小号）。
            读者评论可以包括：
            1. 普通读者的疯狂夸奖与对 CP 的沉浸式嗑糖。
            2. 随机出现 1 位眼尖显微镜读者留言：“等一下……为什么文中这个探险走位习惯和说话口癖，跟主播 ${p.ytName} 昨晚直播里一模一样？作者你老实交代是不是皮下本体？！”产生掉马怀疑。
            `;
        }

        const currentCh = work.chapters[work.activeChapterIdx || 0] || work.chapters[0];
        const sysPrompt = `
        你正在模拟 AO3 网站《${work.title}》（CP: ${work.pairing || '无'}）评论区下的真实读者书评。
        ${accountReactionsPrompt}
        请生成 2 至 3 条读者长短不一的真实评论。
        格式要求（每条占一行）：
        [REVIEW name=读者昵称]评论正文内容[/REVIEW]
        `;

        const raw = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: `读者阅读完章节「${currentCh.title}」后的最新书评：` }
        ], { maxTokens: 800, temperature: 0.95 });

        hideLoading();

        if (!work.reviews) work.reviews = [];
        const re = /\[REVIEW\s+name=([^\]]+?)\]([\s\S]*?)\[\/REVIEW\]/g;
        let m;
        let count = 0;
        while ((m = re.exec(raw)) !== null) {
            work.reviews.unshift({
                id: 'rev_' + Date.now() + '_' + rand(100, 999),
                author: m[1].trim(),
                text: m[2].trim(),
                time: `第${G.day}天 ${new Date().toLocaleTimeString().slice(0, 5)}`,
                replies: []
            });
            count++;
        }

        if (count === 0 && raw.trim()) {
            work.reviews.unshift({
                id: 'rev_' + Date.now(),
                author: 'AO3_Reader_' + rand(10, 99),
                text: raw.trim().slice(0, 150),
                time: `第${G.day}天`,
                replies: []
            });
        }

        showToast('✅ 读者评论已刷新！', 'success', 1500);
        renderBrowserPanel();
        autoSaveGame();

    } catch (e) {
        hideLoading();
        showToast('❌ 评论生成失败', 'error');
    } finally {
        G.isGenerating = false;
    }
}

// ✍️ 用户自己发表书评弹窗
function openAo3WriteCommentModal(workId) {
    const currentAo3Name = (G.ao3User && G.ao3User.username) || G.player.ytName;
    openModal(`
        <h3>✍️ 发表书评</h3>
        <p style="font-size:12px;color:#666;">以 <b>${escapeHtml(currentAo3Name)}</b> 的身份为本书留下你的评语：</p>
        <div class="form-group">
            <textarea id="myAo3CommentInput" rows="3" placeholder="写下你的想法、对剧情的吐槽或催更..."></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="confirmPostAo3Comment">发表评论</button>
        </div>
    `);

    document.getElementById('confirmPostAo3Comment').onclick = () => {
        const text = document.getElementById('myAo3CommentInput').value.trim();
        if (!text) { showToast('⚠️ 评论内容不能为空', 'error'); return; }

        const work = (G.fanworks || []).find(w => w._id === workId);
        if (work) {
            if (!work.reviews) work.reviews = [];
            work.reviews.unshift({
                id: 'rev_' + Date.now(),
                author: currentAo3Name,
                text,
                time: `第${G.day}天 ${new Date().toLocaleTimeString().slice(0, 5)}`,
                replies: []
            });
            closeModal();
            showToast('✅ 评论发表成功！', 'success');
            renderBrowserPanel();
            autoSaveGame();
        }
    };
}

// 💬 用户回复指定书评
function openAo3ReplyModal(workId, reviewIdx) {
    const work = (G.fanworks || []).find(w => w._id === workId);
    if (!work || !work.reviews || !work.reviews[reviewIdx]) return;
    const targetRev = work.reviews[reviewIdx];
    const currentAo3Name = (G.ao3User && G.ao3User.username) || G.player.ytName;

    openModal(`
        <h3>💬 回复 @${escapeHtml(targetRev.author)}</h3>
        <div style="font-size:12px;color:#555;background:#f5eee1;padding:8px;border-radius:6px;margin-bottom:10px;">
            原评：“${escapeHtml(targetRev.text)}”
        </div>
        <div class="form-group">
            <textarea id="myAo3ReplyInput" rows="2" placeholder="回复该读者..."></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="confirmPostAo3Reply">发送回复</button>
        </div>
    `);

    document.getElementById('confirmPostAo3Reply').onclick = () => {
        const text = document.getElementById('myAo3ReplyInput').value.trim();
        if (!text) { showToast('⚠️ 回复内容不能为空', 'error'); return; }

        if (!targetRev.replies) targetRev.replies = [];
        targetRev.replies.push({
            author: currentAo3Name,
            text,
            isSelf: true,
            time: `${new Date().toLocaleTimeString().slice(0, 5)}`
        });

        closeModal();
        showToast('✅ 已回复该读者！', 'success');
        renderBrowserPanel();
        autoSaveGame();
    };
}

// 暴露全局
window.renderBrowserPanel = renderBrowserPanel;
window.openAo3Home = openAo3Home;
window.openAo3Reader = openAo3Reader;
window.triggerFanCreationPrompt = triggerFanCreationPrompt;
window.openCreateCustomBookModal = openCreateCustomBookModal;
window.urgeContinueBookChapter = urgeContinueBookChapter;
window.openAo3AccountSettingsModal = openAo3AccountSettingsModal;
window.openAo3WorkActionModal = openAo3WorkActionModal;
window.openEditBookSettingsModal = openEditBookSettingsModal;
window.generateAo3ReviewsByAI = generateAo3ReviewsByAI;
window.openAo3WriteCommentModal = openAo3WriteCommentModal;
window.openAo3ReplyModal = openAo3ReplyModal;
// ============================================================