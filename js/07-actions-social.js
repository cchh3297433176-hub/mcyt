// js/07-actions-social.js
// 行动处理与外部社区（AO3 同人中心 & YouTube 油管中心 - 严格拟真沉浸、严禁打破第四面墙版）
// ============================================================
async function performAction(action, detail = '', useSearch = false) {
    if (G.isGenerating) { showToast('⏳ 正在生成剧情...'); return; }
    if (action === 'next') { advanceDayFree(); return; }

    if (action === 'chat' || action === 'dm' || action === 'friend' || action === 'fanclub') {
        switchTab('social');
        return;
    }
    if (action === 'fanart') {
        switchTab('browser');
        return;
    }
    if (action === 'youtube' || action === 'yt' || action === 'comment') {
        switchTab('youtube');
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
        view: 'home',
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
            <div style="font-weight:700;font-size:14px;">当前书架空空如也</div>
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

            const isViolationDraft = !!w._isViolationDraft;
            const violationBadge = isViolationDraft 
                ? `<span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;border-radius:4px;padding:1px 5px;font-size:10px;font-weight:800;margin-left:4px;">🚨 违规待审取证稿</span>`
                : '';

            return `
            <div class="ao3-work-entry" data-work-id="${w._id}" style="${isViolationDraft ? 'border-left:4px solid #dc2626;background:#fffbfb;' : ''}">
                <div class="ao3-work-cover">${coverHtml}</div>
                <div class="ao3-work-meta">
                    <div class="ao3-work-title">${escapeHtml(w.title)} ${violationBadge}</div>
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
            🌸 <b>纯乙女向原则</b>：所有恋爱与CP仅限指向女主本人，严禁男男拉郎或角色与非玩家配对！
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

    container.querySelectorAll('.ao3-work-entry').forEach(el => {
        const wid = el.dataset.workId;
        const coverEl = el.querySelector('.ao3-work-cover');
        const titleEl = el.querySelector('.ao3-work-title');

        coverEl?.addEventListener('click', () => openAo3Reader(wid));
        titleEl?.addEventListener('click', () => openAo3Reader(wid));
        bindLongPressEvent(el, () => openAo3WorkActionModal(wid), null);
    });

    container.querySelectorAll('.ao3-manage-book-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            openAo3WorkActionModal(btn.dataset.actId);
        };
    });

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

    document.getElementById('ao3GenCommentsBtn')?.addEventListener('click', () => {
        generateAo3ReviewsByAI(G.browserState.activeWorkId);
    });

    document.getElementById('ao3PostMyCommentBtn')?.addEventListener('click', () => {
        openAo3WriteCommentModal(G.browserState.activeWorkId);
    });
}

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
                    ? '🌟 <b>主播大号模式</b>：名字与你的 YouTube 频道完全一致。AI 和读者将直接认出是你本人！' 
                    : '🎭 <b>披皮小号模式</b>：名字与主播不同。读者不知道是你，但可能会因为神级操作产生“掉马怀疑”！'}
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
        const tagStr = document.getElementById('editBookTags').value.trim();
        const em = document.getElementById('editCoverEmoji').value.trim() || '📖';
        const s = document.getElementById('editBookSummary').value.trim();

        if (!t) { showToast('⚠️ 标题不能为空', 'error'); return; }

        if (typeof OtomeSecurityGuard !== 'undefined') {
            const vReason = OtomeSecurityGuard.checkViolation(t + '\n' + tagStr + '\n' + s);
            if (vReason) {
                work.title = t;
                work.summary = s;
                work._isViolationDraft = true;
                autoSaveGame();

                closeModal();
                OtomeSecurityGuard.triggerDeviceBan(vReason, `[AO3修改书籍] 《${t}》 | 简介: ${s}`);
                return;
            }
        }

        work.title = t;
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

async function triggerFanCreationPrompt() {
    if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }
    openModal(`
        <h3>🎲 粉丝同人创作</h3>
        <p style="font-size:12px;color:#666;">粉丝们正在 AO3 上为你创作同人小说（纯乙女向）：</p>
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

function openCreateCustomBookModal() {
    const currentAo3Name = (G.ao3User && G.ao3User.username) || G.player.ytName;
    const isMain = getIsPlayerAo3MainAccount();
    const pName = G.player.ytName;

    const maleNpcs = ['ThatMob', 'Twixxel', 'Groxmc', 'Dream', 'xqree', 'Whispy'];
    const pairingOptions = `
        <option value="全员向 / 友情向">全员向 / 友情向 (无固定CP)</option>
        ${maleNpcs.map(n => `<option value="${n} × ${escapeHtml(pName)}">${n} × ${escapeHtml(pName)} (独宠专一向)</option>`).join('')}
    `;

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
            <label>涉及 CP / 核心关系 <span style="font-size:11px;color:#2e7d32;">(🌸纯乙女原则：仅限女主)</span></label>
            <select id="newBookPairingSelect" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;background:#fff;font-size:13px;">
                ${pairingOptions}
            </select>
        </div>
        <div class="form-group">
            <label>标签 Tags（用逗号隔开）</label>
            <input type="text" id="newBookTags" placeholder="如：冒险, 团宠, 甜文, 互宠日常">
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
            <textarea id="newBookSummary" rows="3" placeholder="写写这本书的主线设定（纯乙女向，严禁描写男主与非玩家角色恋爱）..."></textarea>
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
        const pairing = document.getElementById('newBookPairingSelect').value;
        const tagsRaw = document.getElementById('newBookTags').value.trim();
        const coverEmoji = document.getElementById('newBookEmoji').value.trim() || '📕';

        if (!title) { showToast('⚠️ 请输入书籍名称', 'error'); return; }
        if (!summary) { showToast('⚠️ 请填写简介作为生成线索', 'error'); return; }

        if (typeof OtomeSecurityGuard !== 'undefined') {
            const vReason = OtomeSecurityGuard.checkViolation(title + '\n' + pairing + '\n' + tagsRaw + '\n' + summary);
            if (vReason) {
                const workId = 'ao3_banned_' + Date.now();
                const capturedViolationDraft = {
                    _id: workId,
                    _isViolationDraft: true,
                    title: title,
                    pairing: pairing,
                    tags: tagsRaw ? tagsRaw.split(/[,，\s]+/).filter(Boolean) : ['违规取证'],
                    summary: summary,
                    author: currentAo3Name,
                    coverUrl: loadedCoverUrl || null,
                    coverEmoji: coverEmoji,
                    kudos: 0,
                    comments: 0,
                    reviews: [],
                    day: G.day || 1,
                    activeChapterIdx: 0,
                    chapters: [{
                        chapterNum: 1,
                        title: '【违规草稿梗概未过审】',
                        content: `【涉嫌违规被安全系统拦截的原作大纲】：\n\n书名：《${title}》\nCP关系：${pairing}\n标签：${tagsRaw}\n简介/梗概：\n${summary}\n\n⚠️ 该书籍在向 AI 发送生成请求前已被纯乙女安全守卫拦截并锁定为物证。`,
                        day: G.day || 1
                    }]
                };

                if (!G.fanworks) G.fanworks = [];
                G.fanworks.push(capturedViolationDraft);
                if (typeof autoSaveGame === 'function') autoSaveGame();

                closeModal();
                const fullOffendingProof = `[AO3开坑草稿物证]\n书名：《${title}》\nCP设定：${pairing}\n简介内容：${summary}`;
                OtomeSecurityGuard.triggerDeviceBan(vReason, fullOffendingProof);
                return;
            }
        }

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

async function generateNewBookFromAI(params = {}) {
    if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }
    G.isGenerating = true;

    try {
        const p = G.player;
        const authorName = params.author || (G.ao3User && G.ao3User.username) || p.ytName;
        const isAuthorMe = (authorName.trim() === p.ytName.trim());
        const npcNames = Object.values(G.npcs).map(n => n.name).join('、');

        let accountIdentityPrompt = '';
        if (isAuthorMe) {
            accountIdentityPrompt = `【重大背景】：本文是由著名 MC 主播「${p.ytName}」本人亲自以大号在 AO3 上实名开坑创作的！`;
        } else {
            accountIdentityPrompt = `【作者背景】：作者笔名为「${authorName}」，表面上是一名同人作者，但其实是主播「${p.ytName}」披着的小号。`;
        }

        let promptGuide = '';
        if (params.customTitle) {
            promptGuide = `
            【书籍设定】
            书名：《${params.customTitle}》
            简介：${params.customSummary}
            关系/CP：${params.pairing || '独宠女主向'}
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
        【唯一挚爱纯乙女约束】：所有角色只能对女主角「${p.ytName}」产生爱意或友谊。严禁描写男男同性恋、BL拉郎、或攻略对象与其他任何非玩家角色的恋爱暧昧！
        请严格按以下标签输出：
        [TITLE]书籍标题[/TITLE]
        [PAIRING]CP关系或组合[/PAIRING]
        [TAGS]标签1, 标签2, 标签3[/TAGS]
        [SUMMARY]一段引人入胜的简介（100字左右）[/SUMMARY]
        [CHAPTER_TITLE]第1章标题[/CHAPTER_TITLE]
        [CONTENT]第1章正文内容（500-800字，行文细腻生动，画面感强烈）[/CONTENT]
        `;

        const raw = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: '请创作新书第1章。' }
        ], { maxTokens: 10000, temperature: 0.95 });

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
        showToast('❌ 同人作品生成失败：' + e.message, 'error');
    } finally {
        G.isGenerating = false;
        updateUI();
    }
}

async function urgeContinueBookChapter(workId) {
    const work = (G.fanworks || []).find(w => w._id === workId);
    if (!work) return;
    if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }

    G.isGenerating = true;

    try {
        const nextChapterNum = work.chapters.length + 1;
        const lastChapter = work.chapters[work.chapters.length - 1];
        const lastSlice = (lastChapter && lastChapter.content) ? lastChapter.content.slice(-400) : '';

        const sysPrompt = `
        你正在 AO3 网站上续写 MC 同人小说《${work.title}》（作者：${work.author}，CP: ${work.pairing || '无'}，简介: ${work.summary}）。
        【乙女绝对规范】：坚守纯正乙女女主唯一定位，严禁攻略角色之间发生同性恋爱！
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
        showToast('❌ 催更续写失败：' + e.message, 'error');
    } finally {
        G.isGenerating = false;
        updateUI();
    }
}

async function generateAo3ReviewsByAI(workId) {
    const work = (G.fanworks || []).find(w => w._id === workId);
    if (!work) return;
    if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }

    G.isGenerating = true;

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
            1. 普通读者的夸赞与沉浸式讨论。
            2. 随机出现 1 位读者怀疑是不是正主主播开的小号。
            `;
        }

        const currentCh = work.chapters[work.activeChapterIdx || 0] || work.chapters[0];
        const sysPrompt = `
        你正在模拟 AO3 网站《${work.title}》（CP: ${work.pairing || '无'}）评论区下的真实读者书评。
        ${accountReactionsPrompt}
        请生成 3 至 4 条读者长短不一的真实评论。表情只能使用标准 Emoji。
        格式要求（每行一条）：
        [REVIEW name=读者昵称]评论正文内容[/REVIEW]
        `;

        const raw = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: `读者阅读完章节「${currentCh.title}」后的最新书评：` }
        ], { maxTokens: 800, temperature: 0.95 });

        if (!work.reviews) work.reviews = [];
        const re = /\[REVIEW\s+name=([^\]]+?)\]([\s\S]*?)(?:\[\/REVIEW\]|$)/gi;
        let m;
        let count = 0;
        while ((m = re.exec(raw)) !== null) {
            const cleanAuthor = m[1].replace(/\[\/?REVIEW[^\]]*\]/gi, '').replace(/^name=/i, '').trim();
            const cleanText = m[2].replace(/\[\/?REVIEW[^\]]*\]/gi, '').trim();
            if (cleanText) {
                work.reviews.unshift({
                    id: 'rev_' + Date.now() + '_' + rand(100, 999),
                    author: cleanAuthor || getRandomRealisticNetName(),
                    text: cleanText,
                    time: `第${G.day}天 ${new Date().toLocaleTimeString().slice(0, 5)}`,
                    replies: []
                });
                count++;
            }
        }

        if (count === 0 && raw.trim()) {
            const fallback = raw.replace(/\[\/?REVIEW[^\]]*\]/gi, '').trim();
            work.reviews.unshift({
                id: 'rev_' + Date.now(),
                author: getRandomRealisticNetName(),
                text: fallback.slice(0, 150) || '太好看了，作者大大快催更！🔥',
                time: `第${G.day}天`,
                replies: []
            });
        }

        showToast('✅ 读者评论已刷新！', 'success', 1500);
        renderBrowserPanel();
        autoSaveGame();

    } catch (e) {
        showToast('❌ 评论生成失败：' + e.message, 'error');
    } finally {
        G.isGenerating = false;
    }
}

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

        if (typeof OtomeSecurityGuard !== 'undefined') {
            const vReason = OtomeSecurityGuard.checkViolation(text);
            if (vReason) {
                const work = (G.fanworks || []).find(w => w._id === workId);
                if (work) {
                    if (!work.reviews) work.reviews = [];
                    work.reviews.unshift({
                        id: 'rev_viol_' + Date.now(),
                        author: currentAo3Name + ' (🚨违规物证)',
                        text: text,
                        time: `第${G.day}天`,
                        replies: []
                    });
                    autoSaveGame();
                }

                closeModal();
                OtomeSecurityGuard.triggerDeviceBan(vReason, `[AO3发表评论物证] ${text}`);
                return;
            }
        }

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

        if (typeof OtomeSecurityGuard !== 'undefined') {
            const vReason = OtomeSecurityGuard.checkViolation(text);
            if (vReason) {
                if (!targetRev.replies) targetRev.replies = [];
                targetRev.replies.push({
                    author: currentAo3Name + ' (🚨违规回复)',
                    text: text,
                    isSelf: true,
                    time: '待审取证'
                });
                autoSaveGame();

                closeModal();
                OtomeSecurityGuard.triggerDeviceBan(vReason, `[AO3回复读者物证] 针对原评「${targetRev.text}」回复: ${text}`);
                return;
            }
        }

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

// ============================================================
// 真实的 MC 游戏圈网友昵称生成池
// ============================================================
function getRandomRealisticNetName() {
    const realisticNames = [
        'DreamWasTakenFan', 'George_Goggles', 'Techno_NeverDies', 'Enderman_007',
        'Redstone_Wired', 'DiamondPickaxe99', 'Speedrun_Hunter', 'Creeper_AwMan',
        'Minecrafter_Alex', 'Blocky_Surfer', 'NetheriteGod_X', 'PixelKnight_22',
        '末影猫猫', '红石研究所长', '纯路人被封面吸引', '吃瓜第一线烤肉人',
        'MC十年老萌新', 'TNT炸穿地壳', '我的肝在隐隐作痛', '今晚下界不见不散',
        '全自动烤鸡机', '下界合金骨灰粉', '建筑党绝不认输', '速通查成分现场',
        '看直播笑到打鸣', '小狗还在原地等我', '盾牌时灵时不灵', '带善人小骷髅'
    ];
    return pick(realisticNames);
}

// ============================================================
// ▶️ 油管 (YouTube) App 独立平台系统
// ============================================================
if (!G.ytState) {
    G.ytState = {
        view: 'feed',
        activeVideoId: null,
        activeChannelId: 'all'
    };
}
if (!G.ytUser) {
    G.ytUser = {
        username: (G.player && G.player.ytName) || 'MC_CraftMaster',
        avatarUrl: null
    };
}
if (!G.ytExternalVideos) G.ytExternalVideos = [];
if (!G.ytCustomChannels) {
    G.ytCustomChannels = [
        { id: 'ch_funny', name: '日常搞笑', prompt: '搞笑整活、沙雕操作、MC日常互怼' },
        { id: 'ch_tech', name: '红石黑科技', prompt: '高深红石电脑、自动化农场、黑科技机关' }
    ];
}

function getIsPlayerYtMainAccount() {
    return G.ytUser && G.player && (G.ytUser.username.trim() === G.player.ytName.trim());
}

function renderYouTubePanel() {
    const container = document.getElementById('youtubeTab');
    if (!container) return;
    const st = G.ytState;

    if (!G.ytExternalVideos.length) {
        initDefaultYtFeed();
    }

    let bodyHtml = '';
    if (st.view === 'feed') {
        bodyHtml = buildYtFeedHTML();
    } else if (st.view === 'channel') {
        bodyHtml = buildYtChannelHTML();
    } else if (st.view === 'watch') {
        bodyHtml = buildYtWatchHTML(st.activeVideoId);
    }

    const currentYtName = (G.ytUser && G.ytUser.username) || G.player.ytName;
    const isMain = getIsPlayerYtMainAccount();
    const avatarSrc = (isMain && G.player.avatar) ? G.player.avatar : (G.ytUser.avatarUrl || G.player.avatar || '');

    container.innerHTML = `
    <div class="yt-app-wrap">
        <div class="yt-topbar">
            <div class="yt-logo" onclick="G.ytState.view='feed';renderYouTubePanel();" style="cursor:pointer;">
                <span class="yt-play-icon">▶</span>
                <span>YouTube</span>
            </div>
            <div class="yt-topbar-actions">
                <button class="yt-icon-btn" id="ytRefreshFeedBtn" title="刷新视频推荐">🔄</button>
                <div class="yt-user-pill" id="ytUserAccountBtn" title="点击进入个人中心/发视频/切换账号">
                    <div class="yt-user-avatar-wrap">
                        ${avatarSrc ? `<img src="${avatarSrc}">` : '<span>🧑</span>'}
                    </div>
                    <span>${escapeHtml(currentYtName)}</span>
                    <span style="font-size:9px;color:${isMain ? '#2e7d32' : '#888'};">(${isMain ? '主号' : '小号'})</span>
                </div>
            </div>
        </div>
        <div class="yt-body">
            ${bodyHtml}
        </div>
    </div>
    `;

    bindYtPanelEvents(container);
}

function initDefaultYtFeed() {
    const preset = [
        {
            _id: 'yt_ext_1',
            title: '【Dream】MC 终极追杀挑战：四人猎人围捕反杀！',
            author: 'Dream',
            authorId: 'dream',
            views: '382万',
            time: '1天前',
            duration: '28:45',
            thumbnailEmoji: '⚔️',
            summary: '这是一场惊心动魄的末地决战！在仅剩半颗心时利用潜影盒与末影珍珠实现不可思议的绝地翻盘！',
            comments: []
        },
        {
            _id: 'yt_ext_2',
            title: 'Whispy 的快乐生存：如何在一小时内造出自动化南瓜农场？',
            author: 'Whispy',
            authorId: 'whispy',
            views: '45万',
            time: '3天前',
            duration: '14:20',
            thumbnailEmoji: '🎃',
            summary: '超简单的红石侦测器结构，即使是生存萌新也能闭着眼睛搭出来！',
            comments: []
        },
        {
            _id: 'yt_ext_3',
            title: '路人MC迷：盘点最近油管上升最快的新星MC主播TOP5！',
            author: 'MineCraft_Daily',
            authorId: null,
            views: '12万',
            time: '5小时前',
            duration: '09:12',
            thumbnailEmoji: '🏆',
            summary: `深度分析了新晋主播 ${G.player.ytName} 和同行们的视频技术风格与快速涨粉密码。`,
            comments: []
        }
    ];
    G.ytExternalVideos = preset;
}

function buildYtFeedHTML() {
    const activeChId = G.ytState.activeChannelId || 'all';

    let chipsHtml = `
    <button class="yt-chip-btn ${activeChId === 'all' ? 'active' : ''}" data-chid="all">全部推荐</button>
    `;
    (G.ytCustomChannels || []).forEach(ch => {
        chipsHtml += `<button class="yt-chip-btn ${activeChId === ch.id ? 'active' : ''}" data-chid="${ch.id}">${escapeHtml(ch.name)}</button>`;
    });
    chipsHtml += `<button class="yt-add-chip-btn" id="ytAddNewChannelBtn" title="创建新频道分区">➕</button>`;

    const myPublishedVideos = (G.player.videos || []).map(v => ({
        _id: 'yt_my_' + (v.title || v.day),
        isPlayer: true,
        title: v.title,
        author: G.player.ytName,
        views: (v.views || 100) + '次观看',
        time: `第${v.day}天发布`,
        duration: '12:30',
        thumbnailEmoji: '🎬',
        thumbnailUrl: v.coverUrl || null,
        summary: v.desc || '精彩实况分享！',
        rawVideoRef: v
    }));

    let allCards = [...myPublishedVideos, ...(G.ytExternalVideos || [])];

    if (activeChId !== 'all') {
        const curCh = (G.ytCustomChannels || []).find(c => c.id === activeChId);
        if (curCh) {
            allCards = allCards.filter(c => c.channelId === activeChId || (c.title && c.title.includes(curCh.name)) || (c.summary && c.summary.includes(curCh.name)));
            if (!allCards.length) {
                allCards = (G.ytExternalVideos || []).filter(c => c.channelId === activeChId);
            }
        }
    }

    let feedHtml = '';
    if (!allCards.length) {
        feedHtml = `
        <div style="text-align:center;padding:50px 20px;color:#888;">
            <div style="font-size:32px;margin-bottom:8px;">📺</div>
            <div style="font-weight:700;font-size:14px;">该频道暂无推送视频</div>
            <div style="font-size:12px;margin-top:4px;">点击右上角 🔄 图标，AI 将根据该频道设定为你立刻生成专属视频流！</div>
        </div>
        `;
    } else {
        allCards.forEach(v => {
            const npcObj = v.authorId ? G.npcs[v.authorId] : null;
            let avatarHtml = '<span>👤</span>';
            if (v.isPlayer) {
                avatarHtml = G.player.avatar ? `<img src="${G.player.avatar}">` : '<span>🧑</span>';
            } else if (npcObj && npcObj.avatarUrl) {
                avatarHtml = `<img src="${npcObj.avatarUrl}">`;
            } else if (npcObj && npcObj.avatarEmoji) {
                avatarHtml = `<span>${npcObj.avatarEmoji}</span>`;
            }

            const thumbContent = v.thumbnailUrl 
                ? `<img src="${v.thumbnailUrl}">` 
                : `<span>${v.thumbnailEmoji || '🎮'}</span>`;

            feedHtml += `
            <div class="yt-feed-card" data-vid="${v._id}">
                <div class="yt-feed-thumbnail">
                    ${thumbContent}
                    <span class="yt-duration-badge">${v.duration || '10:00'}</span>
                </div>
                <div class="yt-feed-info">
                    <div class="yt-feed-avatar">${avatarHtml}</div>
                    <div class="yt-feed-meta">
                        <div class="yt-feed-title">${escapeHtml(v.title)}</div>
                        <div class="yt-feed-submeta">
                            <span>${escapeHtml(v.author)}</span>
                            ${v.isPlayer ? '<b style="color:#2e7d32;margin-left:4px;">● 你的频道</b>' : ''}
                            · <span>${v.views}</span> · <span>${v.time}</span>
                        </div>
                    </div>
                </div>
            </div>
            `;
        });
    }

    return `
    <div class="yt-subnav">
        ${chipsHtml}
    </div>
    <div class="yt-video-feed">
        ${feedHtml}
    </div>
    `;
}

function buildYtChannelHTML() {
    const isMain = getIsPlayerYtMainAccount();
    const p = G.player;
    const currentName = (G.ytUser && G.ytUser.username) || p.ytName;
    const avatar = (isMain && p.avatar) ? p.avatar : (G.ytUser.avatarUrl || p.avatar || '');

    const myVideos = (p.videos || []).slice().reverse();
    let videoListHtml = '';
    if (!myVideos.length) {
        videoListHtml = `<div style="text-align:center;color:#888;padding:20px 0;font-size:12px;">频道暂无视频，点击下方按钮上传吧！</div>`;
    } else {
        videoListHtml = myVideos.map((v, i) => `
            <div class="yt-feed-card" data-vid="yt_my_${v.title||i}" style="margin-bottom:10px;">
                <div class="yt-feed-info" style="align-items:center;">
                    <div style="font-size:24px;width:40px;height:40px;background:#eee;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">🎬</div>
                    <div class="yt-feed-meta">
                        <div class="yt-feed-title">${escapeHtml(v.title)}</div>
                        <div class="yt-feed-submeta">第${v.day}天 · 👁️ ${v.views||0} 观看 · 👍 ${v.likes||0} 点赞</div>
                    </div>
                    <button class="btn-secondary small" style="margin-left:auto;">观摩</button>
                </div>
            </div>
        `).join('');
    }

    const liveHistory = (p.streamHistory || []).slice().reverse();
    let liveListHtml = '';
    if (!liveHistory.length) {
        liveListHtml = `<div style="text-align:center;color:#888;padding:20px 0;font-size:12px;">暂无历史直播记录，去左侧「📹直播」开播吧！</div>`;
    } else {
        liveListHtml = liveHistory.map((lh, idx) => `
            <div class="yt-feed-card" data-live-idx="${idx}" style="margin-bottom:10px;">
                <div class="yt-feed-info" style="align-items:center;">
                    <div style="font-size:24px;width:40px;height:40px;background:#ffebee;color:#d32f2f;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">🔴</div>
                    <div class="yt-feed-meta">
                        <div class="yt-feed-title">${escapeHtml(lh.title || `第${lh.day}天精彩实况直播`)}</div>
                        <div class="yt-feed-submeta">第${lh.day}天 · 👥 巅峰观众 ${lh.maxViewers||lh.viewers||0} · 收益 💰${lh.moneyEarned||0}</div>
                    </div>
                    <button class="btn-secondary small" style="margin-left:auto;">回放文字</button>
                </div>
            </div>
        `).join('');
    }

    return `
    <div style="background:#fff;padding:16px 14px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:12px;">
        <div style="width:54px;height:54px;border-radius:50%;overflow:hidden;background:#ddd;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:24px;">
            ${avatar ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
        </div>
        <div style="flex:1;">
            <div style="font-size:16px;font-weight:800;color:#0f0f0f;">${escapeHtml(currentName)}</div>
            <div style="font-size:11px;color:#606060;margin-top:2px;">
                ${isMain ? `粉丝数：<b>${p.followers}</b> · 累计点赞：${p.likes}` : '披皮小号 · 用于潜水围观'}
            </div>
        </div>
        <button class="btn-secondary small" onclick="G.ytState.view='feed';renderYouTubePanel();">返回首页</button>
    </div>

    <div style="padding:10px 14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0 6px;">
            <span style="font-size:14px;font-weight:700;color:#0f0f0f;">📹 频道已发视频 (${myVideos.length})</span>
            <button class="btn-primary small" onclick="openPublishVideoModal()" style="margin:0;padding:4px 10px;">➕ 发布新视频</button>
        </div>
        ${videoListHtml}

        <div style="font-size:14px;font-weight:700;color:#0f0f0f;margin:18px 0 6px;">🔴 历史直播录播回放 (${liveHistory.length})</div>
        ${liveListHtml}
    </div>
    `;
}

function cleanYtUsername(rawUser) {
    if (!rawUser) return getRandomRealisticNetName();
    let name = rawUser.replace(/\[\/?COMMENT[^\]]*\]/gi, '')
                      .replace(/^user\s*=\s*/i, '')
                      .replace(/['"]/g, '')
                      .replace(/[@#]/g, '')
                      .trim();
    if (!name || name.startsWith('YouTuber_') || name.startsWith('MC_Viewer_')) {
        return getRandomRealisticNetName();
    }
    return name;
}

// 🛡️ 严格清洗第四面墙出戏词汇（杜绝任何乙女概念泄露至评论正文）
function cleanYtCommentText(rawText) {
    if (!rawText) return '';
    let text = rawText.replace(/\[\/?COMMENT[^\]]*\]/gi, '')
                      .replace(/\[\/?user[^\]]*\]/gi, '')
                      .replace(/^user\s*=\s*[^\s\n]+[:：\s]*/i, '')
                      .replace(/user\s*=\s*[a-zA-Z0-9_\u4e00-\u9fa5]+/gi, '')
                      .trim();

    // 过滤第四面墙关键词，平滑替换为真实游戏实况术语
    text = text.replace(/乙女向/g, 'MC解密剧情')
               .replace(/乙女/g, '沉浸微电影')
               .replace(/男主们/g, '大主播们')
               .replace(/男主/g, '搭档大主播')
               .replace(/女主视角/g, '第一人称实况')
               .replace(/女主/g, '主播')
               .replace(/女主角/g, '主播')
               .replace(/攻略难度/g, '通关通关难度')
               .replace(/鸢尾老师/g, 'UP主')
               .replace(/鸢尾黎明/g, '优秀制作团队')
               .replace(/预约/g, '追更');

    return text;
}

function buildYtWatchHTML(videoId) {
    let video = null;
    let isLivePlayback = false;
    let liveData = null;

    if (videoId && videoId.startsWith('live_')) {
        isLivePlayback = true;
        const lIdx = parseInt(videoId.replace('live_', ''));
        liveData = (G.player.streamHistory || []).slice().reverse()[lIdx];
        video = {
            _id: videoId,
            title: liveData ? (liveData.title || `第${liveData.day}天直播录播`) : '直播回放',
            author: G.player.ytName,
            views: (liveData ? (liveData.maxViewers || 500) : 1000) + '次观看',
            time: `第${liveData ? liveData.day : G.day}天直播`,
            summary: liveData ? `【直播实况记录】：本场直播累计获得金币 ${liveData.moneyEarned||0}，涨粉 ${liveData.fansGained||0}！${liveData.summaryText || '全程互动火爆，观众刷屏热烈！'}` : '精彩直播内容。',
            comments: liveData ? (liveData.danmakuList || []) : []
        };
    } else {
        video = (G.ytExternalVideos || []).find(v => v._id === videoId);
        if (!video) {
            const myV = (G.player.videos || []).find(v => ('yt_my_' + (v.title || v.day)) === videoId);
            if (myV) {
                video = {
                    _id: videoId,
                    title: myV.title,
                    author: G.player.ytName,
                    views: (myV.views || 0) + '次观看',
                    time: `第${myV.day}天`,
                    summary: myV.desc || '主播原创实况精选。',
                    comments: myV.comments || []
                };
            }
        }
    }

    if (!video) {
        return `<div style="padding:40px;text-align:center;color:#888;">找不到该视频 <button onclick="G.ytState.view='feed';renderYouTubePanel();">返回首页</button></div>`;
    }

    if (!video.comments) video.comments = [];

    let commentsHtml = '';
    if (!video.comments.length) {
        commentsHtml = `<div style="text-align:center;color:#999;font-size:12px;padding:20px 0;">视频刚发布，快点击下方「🎲 生成更多AI评论」或抢沙发！</div>`;
    } else {
        commentsHtml = video.comments.map((c, cIdx) => {
            let repliesHtml = '';
            if (c.replies && c.replies.length) {
                repliesHtml = `<div class="ao3-replies-list" style="border-left-color:#cc0000;">` + c.replies.map(rep => {
                    const cleanRepAuthor = cleanYtUsername(rep.author);
                    const cleanRepText = cleanYtCommentText(rep.text);
                    return `
                    <div class="ao3-reply-entry" style="background:#f4f4f4;">
                        <span style="font-weight:700;color:${rep.isSelf ? '#2e7d32' : '#0f0f0f'};">@${escapeHtml(cleanRepAuthor)}</span>：
                        <span>${escapeHtml(cleanRepText)}</span>
                        <div style="font-size:9px;color:#aaa;text-align:right;">${rep.time || ''}</div>
                    </div>`;
                }).join('') + `</div>`;
            }

            const cleanAuthor = cleanYtUsername(c.user || c.author);
            const cleanText = cleanYtCommentText(c.content || c.text || '');

            return `
            <div class="ao3-comment-item" style="border-color:#eee;">
                <div class="ao3-comment-header">
                    <span style="font-weight:700;font-size:12px;color:#0f0f0f;">@${escapeHtml(cleanAuthor)}</span>
                    <span style="font-size:10px;color:#aaa;">${c.time || ''}</span>
                </div>
                <div class="ao3-comment-text">${escapeHtml(cleanText)}</div>
                <div class="ao3-comment-actions">
                    <button class="btn-secondary small" onclick="openYtReplyCommentModal('${video._id}', ${cIdx})">💬 回复</button>
                </div>
                ${repliesHtml}
            </div>
            `;
        }).join('');
    }

    const currentYtName = (G.ytUser && G.ytUser.username) || G.player.ytName;

    return `
    <div class="yt-player-container">
        <div class="yt-screen-mock">
            ${isLivePlayback ? '<span class="yt-live-tag">● 录播回放</span>' : ''}
            <div style="font-size:11px;color:#aaa;">▶ 正在播放模拟视频流</div>
            <div class="yt-screen-content">
                ${escapeHtml(video.summary)}
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#888;">
                <span>04:20 / 12:45</span>
                <span>HD 1080P 60FPS</span>
            </div>
        </div>

        <div class="yt-player-details">
            <div class="yt-player-title">${escapeHtml(video.title)}</div>
            <div class="yt-player-stats">
                <span>${video.views}</span>
                <span>${video.time}</span>
                <span>#YouTube #游戏频道</span>
            </div>

            <div class="yt-author-bar">
                <div style="width:36px;height:36px;border-radius:50%;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden;">
                    ${video.author === G.player.ytName && G.player.avatar ? `<img src="${G.player.avatar}" style="width:100%;height:100%;object-fit:cover;">` : '🎮'}
                </div>
                <div>
                    <div style="font-weight:700;font-size:13px;color:#0f0f0f;">${escapeHtml(video.author)}</div>
                    <div style="font-size:10px;color:#606060;">订阅者 145万</div>
                </div>
                <button class="btn-primary small" style="margin-left:auto;background:#0f0f0f;color:#fff;border-radius:18px;">订阅</button>
            </div>

            <div class="yt-action-pills">
                <button class="yt-pill-btn" id="ytLikeVideoBtn">👍 点赞</button>
                <button class="yt-pill-btn" onclick="showToast('🔗 视频链接已复制到剪贴板', 'success', 1500)">↗️ 分享</button>
                <button class="yt-pill-btn" id="ytAddMoreCommentsBtn">🎲 生成更多AI评论</button>
            </div>
        </div>

        <div style="padding:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-weight:700;font-size:14px;color:#0f0f0f;">评论 (${video.comments.length})</span>
                <button class="btn-primary small" id="ytWriteMyCommentBtn" style="margin:0;">✍️ 我要发言</button>
            </div>
            <div style="font-size:11px;color:#888;margin-bottom:10px;">
                发言身份：<b style="color:#2e7d32;">${escapeHtml(currentYtName)}</b> ${getIsPlayerYtMainAccount() ? '（官方认证大号）' : '（路人小号）'}
            </div>
            <div id="ytCommentsContainer">
                ${commentsHtml}
            </div>
        </div>
    </div>
    `;
}

function bindYtPanelEvents(container) {
    document.getElementById('ytRefreshFeedBtn')?.addEventListener('click', () => {
        refreshYtExternalFeedByAI();
    });

    document.getElementById('ytUserAccountBtn')?.addEventListener('click', () => {
        openYtUserQuickMenuModal();
    });

    container.querySelectorAll('.yt-chip-btn').forEach(btn => {
        btn.onclick = () => {
            const chid = btn.dataset.chid;
            G.ytState.activeChannelId = chid;
            renderYouTubePanel();
        };
    });

    document.getElementById('ytAddNewChannelBtn')?.addEventListener('click', () => {
        openCreateCustomChannelModal();
    });

    container.querySelectorAll('.yt-feed-card[data-vid]').forEach(card => {
        card.onclick = () => {
            G.ytState.view = 'watch';
            G.ytState.activeVideoId = card.dataset.vid;
            renderYouTubePanel();
        };
    });

    container.querySelectorAll('.yt-feed-card[data-live-idx]').forEach(card => {
        card.onclick = () => {
            G.ytState.view = 'watch';
            G.ytState.activeVideoId = 'live_' + card.dataset.liveIdx;
            renderYouTubePanel();
        };
    });

    document.getElementById('ytLikeVideoBtn')?.addEventListener('click', function() {
        this.classList.toggle('liked');
        showToast('👍 已为视频点赞！', 'success', 1200);
    });

    document.getElementById('ytAddMoreCommentsBtn')?.addEventListener('click', () => {
        generateMoreYtCommentsByAI(G.ytState.activeVideoId);
    });

    document.getElementById('ytWriteMyCommentBtn')?.addEventListener('click', () => {
        openYtWriteCommentModal(G.ytState.activeVideoId);
    });
}

function openYtUserQuickMenuModal() {
    const isMain = getIsPlayerYtMainAccount();
    const currentName = (G.ytUser && G.ytUser.username) || G.player.ytName;

    openModal(`
        <h3>👤 个人中心与快捷操作</h3>
        <p style="font-size:12px;color:#666;">当前登录身份：<b style="color:${isMain ? '#2e7d32' : '#b26a00'};">${escapeHtml(currentName)}</b> ${isMain ? '（认证主号）' : '（小号）'}</p>
        <div class="btn-row" style="flex-direction:column;gap:8px;margin:12px 0;">
            <button class="btn-primary" id="menuGoChannelBtn" style="width:100%;">📺 我的主页与频道作品</button>
            <button class="btn-primary" id="menuPublishVideoBtn" style="width:100%;background:#e53935;">➕ 发布新视频</button>
            <button class="btn-secondary" id="menuSwitchAccountBtn" style="width:100%;">🎭 切换大号 / 小号模式</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">返回</button>
        </div>
    `);

    document.getElementById('menuGoChannelBtn').onclick = () => {
        closeModal();
        G.ytState.view = 'channel';
        renderYouTubePanel();
    };

    document.getElementById('menuPublishVideoBtn').onclick = () => {
        closeModal();
        openPublishVideoModal();
    };

    document.getElementById('menuSwitchAccountBtn').onclick = () => {
        closeModal();
        openYtAccountModal();
    };
}

function openCreateCustomChannelModal() {
    openModal(`
        <h3>➕ 创建新频道分区</h3>
        <p style="font-size:12px;color:#666;">设定你感兴趣的专属分区，AI 将为你精准推送对应赛道的视频！</p>
        <div class="form-group">
            <label>频道分类名称 <span class="required">*</span></label>
            <input type="text" id="newChannelName" placeholder="如：日常搞笑 / 美食探店 / 恐怖实况 / 科技数码">
        </div>
        <div class="form-group">
            <label>频道推送内容设定 (Prompt 线索) <span class="required">*</span></label>
            <textarea id="newChannelPrompt" rows="3" placeholder="描述该频道应推送什么样的视频（如：整蛊挑战、沙雕搞笑日常、探店试吃、数码评测等，无需拘泥于MC）"></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="confirmCreateChannelBtn">创建并刷新推送</button>
        </div>
    `);

    document.getElementById('confirmCreateChannelBtn').onclick = async () => {
        const name = document.getElementById('newChannelName').value.trim();
        const promptText = document.getElementById('newChannelPrompt').value.trim();

        if (!name) { showToast('⚠️ 频道名称不能为空', 'error'); return; }
        if (!promptText) { showToast('⚠️ 请填写频道内容设定', 'error'); return; }

        if (typeof OtomeSecurityGuard !== 'undefined') {
            const vReason = OtomeSecurityGuard.checkViolation(name + '\n' + promptText);
            if (vReason) {
                closeModal();
                OtomeSecurityGuard.triggerDeviceBan(vReason, `[创建油管分区物证] 分区名: ${name} | 内容设定: ${promptText}`);
                return;
            }
        }

        const newId = 'ch_' + Date.now();
        if (!G.ytCustomChannels) G.ytCustomChannels = [];
        G.ytCustomChannels.push({
            id: newId,
            name,
            prompt: promptText
        });

        G.ytState.activeChannelId = newId;
        closeModal();
        showToast(`🎉 频道「${name}」已创建！正在生成专属推送...`, 'success', 2000);
        
        await refreshYtExternalFeedByAI();
    };
}

function openYtAccountModal() {
    const currentName = (G.ytUser && G.ytUser.username) || G.player.ytName;
    const isMain = currentName.trim() === G.player.ytName.trim();

    openModal(`
        <h3>👤 油管账户切换</h3>
        <p style="font-size:12px;color:#666;line-height:1.6;">
            你可以使用主播<b>官方主号</b>带蓝标认证发言，或者切换为<b>路人小号</b>潜水、整活或围观其他主播。
        </p>
        <div class="form-group">
            <label>当前登录账号昵称</label>
            <input type="text" id="ytAccountNameInput" value="${escapeHtml(currentName)}" placeholder="输入账号名称...">
        </div>
        <div style="background:#f7faf7;border:1px solid #dce8dc;padding:10px;border-radius:8px;font-size:12px;margin:8px 0;line-height:1.5;">
            <div><b>身份状态：</b></div>
            <div id="ytAccountDesc" style="margin-top:4px;color:${isMain ? '#2e7d32' : '#b26a00'};">
                ${isMain 
                    ? '🌟 <b>主播大号模式</b>：发布视频直接计入你的官方频道！' 
                    : '🕶️ <b>披皮小号模式</b>：以路人普通观众身份潜水与评论。'}
            </div>
        </div>
        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" id="ytResetMainAccount">还原主号</button>
            <button class="btn-primary" id="ytSaveAccountBtn">保存设置</button>
        </div>
    `);

    const input = document.getElementById('ytAccountNameInput');
    const desc = document.getElementById('ytAccountDesc');

    input.oninput = () => {
        const val = input.value.trim();
        const eq = val === G.player.ytName.trim();
        desc.style.color = eq ? '#2e7d32' : '#b26a00';
        desc.innerHTML = eq 
            ? '🌟 <b>主播大号模式</b>：发布视频直接计入你的官方频道！' 
            : '🕶️ <b>披皮小号模式</b>：以路人普通观众身份潜水与评论。';
    };

    document.getElementById('ytResetMainAccount').onclick = () => {
        input.value = G.player.ytName;
        input.dispatchEvent(new Event('input'));
    };

    document.getElementById('ytSaveAccountBtn').onclick = () => {
        const val = input.value.trim();
        if (!val) { showToast('⚠️ 昵称不能为空', 'error'); return; }
        if (!G.ytUser) G.ytUser = {};
        G.ytUser.username = val;
        closeModal();
        showToast(`✅ 已切换为「${val}」登录`, 'success', 1500);
        renderYouTubePanel();
        autoSaveGame();
    };
}

async function refreshYtExternalFeedByAI() {
    if (G.isGenerating) { showToast('⏳ 正在搜索刷新中...'); return; }
    G.isGenerating = true;

    try {
        const activeChId = G.ytState.activeChannelId || 'all';
        const curCh = (G.ytCustomChannels || []).find(c => c.id === activeChId);

        const contactsList = Object.values(G.npcs).map(n => `【${n.name}】(${n.persona || 'MC主播'})`).join('、');

        let categoryPrompt = '';
        if (curCh) {
            categoryPrompt = `
            【当前专区限定】：该专区为「${curCh.name}」，内容设定要求为：${curCh.prompt}。
            所有推荐视频必须紧密贴合该专区的主题（不仅限于MC，根据设定自由呈现）！
            `;
        } else {
            categoryPrompt = `
            【内容主题】：Minecraft 我的世界实况专区，兼顾趣味娱乐与大神操作。
            `;
        }

        const sysPrompt = `
        你正在模拟 YouTube 游戏与生活视频推荐流。
        ${categoryPrompt}
        玩家通讯录中的主播与NPC好友包括：${contactsList}。
        【要求】：
        1. 这是一个真实的 Minecraft YouTube 创作者圈子！严禁出现任何“乙女向/恋爱游戏预告”等打破第四面墙的设定！所有视频必须是真正的游戏实况、挑战、微电影、建筑或日常记录！
        2. 随机挑选 1 到 2 位上述通讯录中的好友主播发布的新视频，同时搭配 1 到 2 位路人高手的视频。
        3. 总共输出 3 条热门推荐视频，格式必须严格如下（每条以 [VIDEO] 开头，[/VIDEO] 结尾）：
        [VIDEO]
        TITLE: 视频爆款吸睛标题
        AUTHOR: 主播名字或地道网名
        VIEWS: 播放量（如：85万次观看）
        TIME: 发布时间（如：2小时前）
        SUMMARY: 视频核心内容与高光描述（80字左右）
        [/VIDEO]
        `;

        const raw = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: '请刷新3条热门推荐视频。' }
        ], { maxTokens: 900, temperature: 0.95 });

        const newCards = [];
        const blocks = raw.split('[VIDEO]').slice(1);
        blocks.forEach((b, idx) => {
            const clean = b.replace('[/VIDEO]', '');
            const title = (clean.match(/TITLE:\s*(.+)/i) || [])[1] || '精彩热门实况分享';
            let author = (clean.match(/AUTHOR:\s*(.+)/i) || [])[1] || getRandomRealisticNetName();
            author = cleanYtUsername(author);
            const views = (clean.match(/VIEWS:\s*(.+)/i) || [])[1] || '32万次观看';
            const time = (clean.match(/TIME:\s*(.+)/i) || [])[1] || '刚刚';
            const summary = (clean.match(/SUMMARY:\s*([\s\S]+)/i) || [])[1] || '全程高能精彩绝伦！';

            const matchedNpc = Object.values(G.npcs).find(n => n.name.trim() === author.trim());

            newCards.push({
                _id: 'yt_ai_' + Date.now() + '_' + idx,
                channelId: activeChId,
                title: title.trim(),
                author: author.trim(),
                authorId: matchedNpc ? matchedNpc.id : null,
                views: views.trim(),
                time: time.trim(),
                duration: `${rand(8, 25)}:${rand(10, 59)}`,
                thumbnailEmoji: pick(['🎮', '🏹', '🏰', '🔴', '💣', '🌲', '💎', '🔥', '✨']),
                summary: summary.trim(),
                comments: []
            });
        });

        if (newCards.length) {
            if (activeChId === 'all') {
                G.ytExternalVideos = newCards;
            } else {
                G.ytExternalVideos = [...newCards, ...(G.ytExternalVideos || []).filter(v => v.channelId !== activeChId)];
            }
            showToast('✅ 视频推荐已刷新！', 'success', 1500);
            renderYouTubePanel();
            autoSaveGame();
        }

    } catch (e) {
        showToast('❌ 视频刷新失败：' + e.message, 'error');
    } finally {
        G.isGenerating = false;
    }
}

function openPublishVideoModal() {
    const isMain = getIsPlayerYtMainAccount();
    const currentName = (G.ytUser && G.ytUser.username) || G.player.ytName;

    openModal(`
        <h3>➕ YouTube 发布新视频</h3>
        <div style="font-size:12px;color:#666;margin-bottom:8px;">
            发布身份：<b style="color:${isMain ? '#2e7d32' : '#b26a00'};">${escapeHtml(currentName)}</b> ${isMain ? '（官方频道发布）' : '（小号发布）'}
        </div>
        <div class="form-group">
            <label>视频标题 <span class="required">*</span></label>
            <input type="text" id="ytNewVideoTitle" placeholder="起一个吸睛的油管爆款标题...">
        </div>
        <div class="form-group">
            <label>视频封面模式</label>
            <div class="radio-group-inline" style="margin-bottom:6px;">
                <label><input type="radio" name="coverMode" value="text" checked> 📝 纯文字生动描述封面</label>
                <label><input type="radio" name="coverMode" value="image"> 🖼️ 导入本地图片封面</label>
            </div>
            <textarea id="ytCoverDescInput" rows="2" placeholder="输入封面图的文字描绘（如：身披钻石甲与末影龙对视的震撼特写...）"></textarea>
            <div id="ytImageUploadBox" style="display:none;margin-top:6px;">
                <label class="upload-btn" style="cursor:pointer;padding:6px 12px;font-size:12px;">
                    📁 选择图片
                    <input type="file" id="ytCoverFileInput" accept="image/*" style="display:none;">
                </label>
                <button type="button" class="btn-secondary small" id="ytVisionAiCheckBtn" style="margin-left:6px;">🤖 开启AI视觉识图解析</button>
                <div id="ytCoverImgPreview" style="margin-top:6px;width:100px;height:60px;border-radius:6px;background:#eee;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:11px;color:#999;">无图片</div>
            </div>
        </div>
        <div class="form-group">
            <label>视频脚本剧情 / 简介 <span class="required">*</span></label>
            <textarea id="ytNewVideoSummary" rows="3" placeholder="描述这期视频的核心内容、高光击杀、搞笑反转等..."></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="ytConfirmPublishBtn">🚀 立即发布到 YouTube</button>
        </div>
    `);

    let loadedCoverData = null;

    document.querySelectorAll('input[name="coverMode"]').forEach(radio => {
        radio.onchange = () => {
            const isImg = radio.value === 'image';
            document.getElementById('ytImageUploadBox').style.display = isImg ? 'block' : 'none';
        };
    });

    document.getElementById('ytCoverFileInput').onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            loadedCoverData = evt.target.result;
            document.getElementById('ytCoverImgPreview').innerHTML = `<img src="${loadedCoverData}" style="width:100%;height:100%;object-fit:cover;">`;
            showToast('✅ 封面图片已载入', 'success', 1200);
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('ytVisionAiCheckBtn').onclick = () => {
        openModal(`
            <h3 style="color:#e65100;">⚠️ AI 识图功能提示</h3>
            <div style="font-size:13px;color:#333;line-height:1.6;margin:10px 0;">
                <p>1. 该功能要求您在模型设置中填入的 API 模型具有<b>视觉识图（Vision / 多模态）</b>支持（例如 gpt-4o, claude-3-5-sonnet 等）。</p>
                <p style="margin-top:6px;color:#c62828;"><b>2. 图片上传会转化为 Base64 编码，单次请求将消耗大量 Token 额度！</b></p>
            </div>
            <p style="font-size:12px;color:#666;">若模型不支持多模态，建议使用“文字描述代替图片”以保证生成流畅稳定并节省费用。</p>
            <div class="btn-row" style="margin-top:14px;">
                <button class="btn-secondary" onclick="closeModal(); openPublishVideoModal();">知道了，返回编辑</button>
            </div>
        `);
    };

    document.getElementById('ytConfirmPublishBtn').onclick = async () => {
        const title = document.getElementById('ytNewVideoTitle').value.trim();
        const summary = document.getElementById('ytNewVideoSummary').value.trim();
        const coverDesc = document.getElementById('ytCoverDescInput').value.trim();

        if (!title) { showToast('⚠️ 标题不能为空', 'error'); return; }
        if (!summary) { showToast('⚠️ 视频简介剧情不能为空', 'error'); return; }

        if (typeof OtomeSecurityGuard !== 'undefined') {
            const vReason = OtomeSecurityGuard.checkViolation(title + '\n' + coverDesc + '\n' + summary);
            if (vReason) {
                const bannedVideoDraft = {
                    title: `[🚨违规取证视频] ${title}`,
                    desc: `【涉嫌违规被拦截视频内容】：\n封面描述：${coverDesc}\n视频脚本梗概：${summary}`,
                    coverUrl: loadedCoverData,
                    coverDesc: coverDesc,
                    views: 0,
                    likes: 0,
                    day: G.day || 1,
                    comments: []
                };
                if (!G.player.videos) G.player.videos = [];
                G.player.videos.push(bannedVideoDraft);
                if (typeof autoSaveGame === 'function') autoSaveGame();

                closeModal();
                const offendingVideoProof = `[油管发布视频物证]\n标题：《${title}》\n封面描述：${coverDesc}\n剧情简介：${summary}`;
                OtomeSecurityGuard.triggerDeviceBan(vReason, offendingVideoProof);
                return;
            }
        }

        closeModal();

        const videoObj = {
            title,
            desc: summary,
            coverUrl: loadedCoverData,
            coverDesc: coverDesc,
            views: rand(300, 2000),
            likes: rand(50, 400),
            day: G.day,
            comments: []
        };

        if (!G.player.videos) G.player.videos = [];
        G.player.videos.push(videoObj);

        G.player.followers += rand(50, 300);
        G.player.money += rand(30, 100);

        showToast(`🎉 视频《${title}》已成功发布到 YouTube！`, 'success', 2500);
        appendStory(`🎬 你在 YouTube 上发布了新视频《${title}》！收获了首波播放与点赞。`, '🎬 视频发布');
        autoSaveGame();
        renderYouTubePanel();
    };
}

// 🌟 核心：为 YouTube 视频生成拟真评论区（严禁第四面墙泄露）
async function generateMoreYtCommentsByAI(videoId) {
    let video = (G.ytExternalVideos || []).find(v => v._id === videoId);
    if (!video) {
        video = (G.player.videos || []).find(v => ('yt_my_' + (v.title || v.day)) === videoId);
    }
    if (!video && videoId && videoId.startsWith('live_')) {
        const lIdx = parseInt(videoId.replace('live_', ''));
        const ld = (G.player.streamHistory || []).slice().reverse()[lIdx];
        if (ld) {
            video = { comments: (ld.danmakuList = ld.danmakuList || []), title: ld.title || '直播回放', author: G.player.ytName };
        }
    }
    if (!video) return;
    if (G.isGenerating) { showToast('⏳ 正在生成评论...'); return; }

    G.isGenerating = true;

    try {
        const sysPrompt = `
你正在模拟 YouTube 游戏频道《${video.title}》（作者：${video.author || '游戏主播'}，内容概要：${video.summary || video.desc || '精彩MC实况分享'}）下方的海外及本土真实观众评论区。

【🚨 严禁打破第四堵墙（绝对的世界观沉浸铁律）】：
1. 世界观认知：这是一个真实的 Minecraft 游戏与 YouTube 创作者圈子！作者「${video.author || '主播'}」是一位生活在现实世界中的 Minecraft 游戏主播，视频是真实上传到油管的游戏作品！
2. 绝对严禁打破次元壁！绝对禁止出现任何元游戏词汇，严禁提及：“乙女”、“乙女向”、“男主”、“女主”、“女主角”、“攻略难度”、“攻略男主”、“纸片人”、“鸢尾黎明”、“鸢尾老师”、“工作室”、“预约游戏”等词汇！
3. 观众们并不知道也不在乎任何乙女属性，他们是在 YouTube 上看游戏实况或 Minecraft 创作视频的真实玩家！
4. 评论内容必须是真实的油管玩家评论：
   - 围绕视频内容（红石机关、末地反杀、建筑审美、走位技巧、PvP博弈等）；
   - 对主播游戏操作与整蛊搞笑的调侃吐槽；
   - 催更下期、纯路人被封面吸引圈粉、弹幕玩梗等。
5. 构思 4 到 6 位生动的网友，名字必须像真实的 YouTube/Minecraft 活跃玩家（例如：末影猫猫、DreamWasTakenFan、Redstone_Pro、吃瓜第一线烤肉人、PixelKnight99 等真实网名），严禁使用 YouTuber_数字 或系统编号！
6. 表情只允许使用标准 Emoji，严禁未闭合字符颜文字。
7. 严格遵循以下输出格式（每行一条）：
[COMMENT user=网友昵称]评论正文[/COMMENT]
8. 绝对不要在正文里包含“user=”或者角色前缀！
        `;

        const raw = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: '请生成4~6条生动真实的油管网友游戏评论。' }
        ], { maxTokens: 900, temperature: 0.95 });

        if (!video.comments) video.comments = [];
        
        const re = /\[COMMENT(?:\s+user=|\s*:\s*)(["']?)([^\]"'\n]+)\1\]([\s\S]*?)(?:\[\/COMMENT\]|(?=\[COMMENT)|$)/gi;
        let m;
        let cCount = 0;
        while ((m = re.exec(raw)) !== null) {
            let uName = cleanYtUsername(m[2]);
            let cBody = cleanYtCommentText(m[3]);

            if (cBody) {
                video.comments.unshift({
                    user: uName,
                    content: cBody,
                    time: `第${G.day}天`,
                    replies: []
                });
                cCount++;
            }
        }

        if (cCount === 0 && raw.trim()) {
            const lines = raw.split('\n').filter(l => l.trim().length > 3);
            lines.forEach((l) => {
                let parsedUser = null;
                let parsedContent = l;

                const nameMatch = l.match(/\[COMMENT\s+user=([^\]]+)\]/i) || l.match(/^([^:：]{2,16})[:：]\s*(.+)$/);
                if (nameMatch) {
                    parsedUser = nameMatch[1];
                    parsedContent = nameMatch[2] || l;
                }

                parsedUser = cleanYtUsername(parsedUser);
                parsedContent = cleanYtCommentText(parsedContent);

                if (parsedContent) {
                    video.comments.unshift({
                        user: parsedUser,
                        content: parsedContent,
                        time: `第${G.day}天`,
                        replies: []
                    });
                    cCount++;
                }
            });
        }

        showToast(`✅ 评论区已生成 ${cCount} 条真实网友热评！`, 'success', 1500);
        renderYouTubePanel();
        autoSaveGame();

    } catch (e) {
        console.error('评论生成失败', e);
        showToast('❌ 评论生成失败：' + e.message, 'error');
    } finally {
        G.isGenerating = false;
    }
}

function openYtWriteCommentModal(videoId) {
    const currentName = (G.ytUser && G.ytUser.username) || G.player.ytName;
    const isMain = getIsPlayerYtMainAccount();

    openModal(`
        <h3>✍️ 发布 YouTube 评论</h3>
        <p style="font-size:12px;color:#666;">以 <b>${escapeHtml(currentName)}</b> ${isMain ? '(官方认证大号)' : '(小号)'} 的身份留言：</p>
        <div class="form-group">
            <textarea id="myYtCommentInput" rows="3" placeholder="添加公开评论..."></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="confirmPostYtComment">发送评论</button>
        </div>
    `);

    document.getElementById('confirmPostYtComment').onclick = () => {
        const text = document.getElementById('myYtCommentInput').value.trim();
        if (!text) { showToast('⚠️ 评论内容不能为空', 'error'); return; }

        if (typeof OtomeSecurityGuard !== 'undefined') {
            const vReason = OtomeSecurityGuard.checkViolation(text);
            if (vReason) {
                let targetVideo = (G.ytExternalVideos || []).find(v => v._id === videoId);
                if (!targetVideo) targetVideo = (G.player.videos || []).find(v => ('yt_my_' + (v.title || v.day)) === videoId);
                if (targetVideo) {
                    if (!targetVideo.comments) targetVideo.comments = [];
                    targetVideo.comments.unshift({
                        user: currentName + ' (🚨违规物证)',
                        content: text,
                        time: '刚刚'
                    });
                    autoSaveGame();
                }

                closeModal();
                OtomeSecurityGuard.triggerDeviceBan(vReason, `[油管评论留言物证] ${text}`);
                return;
            }
        }

        let video = (G.ytExternalVideos || []).find(v => v._id === videoId);
        if (!video) {
            video = (G.player.videos || []).find(v => ('yt_my_' + (v.title || v.day)) === videoId);
        }
        if (!video && videoId && videoId.startsWith('live_')) {
            const lIdx = parseInt(videoId.replace('live_', ''));
            const ld = (G.player.streamHistory || []).slice().reverse()[lIdx];
            if (ld) {
                video = { comments: (ld.danmakuList = ld.danmakuList || []) };
            }
        }

        if (video) {
            if (!video.comments) video.comments = [];
            video.comments.unshift({
                user: currentName,
                content: text,
                time: '刚刚',
                isSelf: true,
                replies: []
            });

            if (isMain && video.authorId && G.npcs[video.authorId]) {
                const targetNpc = G.npcs[video.authorId];
                const note = `【油管评论互动】：玩家在你的视频《${video.title}》下方实名留言：“${text}”。在后续私聊中有可能以此开话题。`;
                targetNpc.memorySummary = (targetNpc.memorySummary || '') + `\n${note}`;
                showToast(`🌟 主播 ${targetNpc.name} 注意到了你的留言！`, 'success', 2500);
            }

            closeModal();
            showToast('✅ 评论发送成功！', 'success', 1500);
            renderYouTubePanel();
            autoSaveGame();
        }
    };
}

function openYtReplyCommentModal(videoId, commentIdx) {
    let video = (G.ytExternalVideos || []).find(v => v._id === videoId);
    if (!video) {
        video = (G.player.videos || []).find(v => ('yt_my_' + (v.title || v.day)) === videoId);
    }
    if (!video && videoId && videoId.startsWith('live_')) {
        const lIdx = parseInt(videoId.replace('live_', ''));
        const ld = (G.player.streamHistory || []).slice().reverse()[lIdx];
        if (ld) video = { comments: (ld.danmakuList = ld.danmakuList || []) };
    }
    if (!video || !video.comments || !video.comments[commentIdx]) {
        showToast('⚠️ 找不到该评论或已被删除', 'error');
        return;
    }

    const targetComment = video.comments[commentIdx];
    const displayTargetUser = cleanYtUsername(targetComment.user || targetComment.author);
    const displayTargetText = cleanYtCommentText(targetComment.content || targetComment.text || '');
    const currentName = (G.ytUser && G.ytUser.username) || G.player.ytName;

    openModal(`
        <h3>💬 回复 @${escapeHtml(displayTargetUser)}</h3>
        <div style="font-size:12px;color:#555;background:#f5f5f5;padding:8px;border-radius:6px;margin-bottom:10px;">
            原评：“${escapeHtml(displayTargetText)}”
        </div>
        <div class="form-group">
            <textarea id="myYtReplyInput" rows="2" placeholder="输入你的公开回复..."></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="confirmPostYtReply">发送回复</button>
        </div>
    `);

    document.getElementById('confirmPostYtReply').onclick = async () => {
        const replyText = document.getElementById('myYtReplyInput').value.trim();
        if (!replyText) { showToast('⚠️ 回复内容不能为空', 'error'); return; }

        if (typeof OtomeSecurityGuard !== 'undefined') {
            const vReason = OtomeSecurityGuard.checkViolation(replyText);
            if (vReason) {
                if (!targetComment.replies) targetComment.replies = [];
                targetComment.replies.push({
                    author: currentName + ' (🚨违规回复)',
                    text: replyText,
                    isSelf: true,
                    time: '待审取证'
                });
                autoSaveGame();

                closeModal();
                OtomeSecurityGuard.triggerDeviceBan(vReason, `[油管回复他人物证] 针对原评「${displayTargetText}」回复: ${replyText}`);
                return;
            }
        }

        if (!targetComment.replies) targetComment.replies = [];
        targetComment.replies.push({
            author: currentName,
            text: replyText,
            isSelf: true,
            time: '刚刚'
        });

        closeModal();
        showToast('✅ 回复发表成功！', 'success', 1200);
        renderYouTubePanel();
        autoSaveGame();

        if (Math.random() < 0.7) {
            setTimeout(async () => {
                try {
                    const responder = displayTargetUser;
                    const sys = `你正在模拟真实油管游戏玩家「${responder}」。Minecraft主播回复了你的评论：“${replyText}”。请给出风趣简短的接话，只使用标准Emoji表情，字数在30字以内，禁止输出任何标记代码。绝对严禁打破第四面墙，你就是一名看MC视频的普通观众！`;
                    const res = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '请接话。' }], { maxTokens: 80, temperature: 0.9 });
                    const cleanReply = cleanYtCommentText(res);
                    if (cleanReply) {
                        targetComment.replies.push({
                            author: responder,
                            text: cleanReply,
                            isSelf: false,
                            time: '片刻后'
                        });
                        showToast(`💬 @${responder} 回复了你！`, 'info', 2000);
                        renderYouTubePanel();
                        autoSaveGame();
                    }
                } catch(e) {
                    console.warn('接话失败', e);
                }
            }, 1500);
        }
    };
}

// 暴露全局
window.renderYouTubePanel = renderYouTubePanel;
window.refreshYtExternalFeedByAI = refreshYtExternalFeedByAI;
window.openYtAccountModal = openYtAccountModal;
window.openYtUserQuickMenuModal = openYtUserQuickMenuModal;
window.openCreateCustomChannelModal = openCreateCustomChannelModal;
window.openPublishVideoModal = openPublishVideoModal;
window.generateMoreYtCommentsByAI = generateMoreYtCommentsByAI;
window.openYtWriteCommentModal = openYtWriteCommentModal;
window.openYtReplyCommentModal = openYtReplyCommentModal;

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