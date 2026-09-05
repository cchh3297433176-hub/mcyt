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
            点击上方「AO3」图标，即可查看粉丝为你撰写的同人文或自创新书！
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

    // 绑定书签与 AO3 内交互
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
    let worksListHtml = '';

    if (!works.length) {
        worksListHtml = `
        <div style="text-align:center;padding:50px 20px;color:#888;">
            <div style="font-size:32px;margin-bottom:8px;">📖</div>
            <div style="font-weight:700;font-size:14px;">当前收藏夹空空如也</div>
            <div style="font-size:12px;margin-top:4px;">点击右上角 ➕ 开坑自建新书，或点击下方让粉丝创作！</div>
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

            return `
            <div class="ao3-work-entry">
                <div class="ao3-work-cover" onclick="openAo3Reader('${w._id}')">${coverHtml}</div>
                <div class="ao3-work-meta">
                    <div class="ao3-work-title" onclick="openAo3Reader('${w._id}')">${escapeHtml(w.title)}</div>
                    <div class="ao3-work-author">by <span style="color:#900;">${escapeHtml(w.author || '匿名粉')}</span>${w.pairing ? ` · CP: <b>${escapeHtml(w.pairing)}</b>` : ''}</div>
                    <div>${tags}</div>
                    <div class="ao3-work-summary">${escapeHtml(w.summary || '暂无简介')}</div>
                    <div class="ao3-stats-row">
                        <span>📖 ${chapterCount} 章</span>
                        <span>💚 ${w.kudos || 0} Kudos</span>
                        <span>💬 ${w.comments || 0} 评论</span>
                        <button class="btn-secondary small" onclick="openAo3Reader('${w._id}')" style="margin-left:auto;">阅读</button>
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
            <div style="display:flex;gap:6px;">
                <button id="ao3RandomGenBtn" title="触发粉丝撰写" style="background:#700;color:#fff;border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">🎲 催粉发文</button>
                <button id="ao3NewBookBtn" title="自己开坑建书" style="background:#2e7d32;color:#fff;border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">➕ 开坑新书</button>
            </div>
        </div>
        <div class="ao3-sub-nav">
            <span>标签检索：<b>MC YouTube (${(G.fanworks||[]).length} Works)</b></span>
            <span style="color:#888;">第 ${G.day} 天</span>
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

    // 章节归整兼容
    if (!work.chapters || !work.chapters.length) {
        work.chapters = [{
            chapterNum: 1,
            title: work.title,
            content: work.content || '正文内容暂缺...',
            day: work.day || G.day
        }];
    }

    const currentChapterIdx = (work.activeChapterIdx !== undefined) ? work.activeChapterIdx : (work.chapters.length - 1);
    const chapter = work.chapters[currentChapterIdx] || work.chapters[0];

    const tagsHtml = (work.tags || []).map(t => `<span class="ao3-tag-badge">#${escapeHtml(t)}</span>`).join('');
    const coverHtml = work.coverUrl 
        ? `<img src="${work.coverUrl}" style="width:70px;height:98px;border-radius:4px;object-fit:cover;border:1px solid #ccc;float:right;margin-left:10px;">` 
        : '';

    let chapterOptions = '';
    work.chapters.forEach((c, idx) => {
        chapterOptions += `<option value="${idx}" ${idx === currentChapterIdx ? 'selected' : ''}>第 ${idx + 1} 章：${escapeHtml(c.title || `第${idx+1}章`)}</option>`;
    });

    return `
    <div class="ao3-site-container" style="padding:16px;background:#fdfbf7;">
        <div style="border-bottom:2px solid #900;padding-bottom:12px;margin-bottom:12px;">
            ${coverHtml}
            <div style="font-size:10px;color:#900;letter-spacing:1px;font-weight:700;">ARCHIVE OF OUR OWN · FANWORK</div>
            <div style="font-size:20px;font-weight:700;color:#222;margin-top:4px;">${escapeHtml(work.title)}</div>
            <div style="font-size:12px;color:#666;margin:3px 0;">by <span style="color:#900;">${escapeHtml(work.author || '匿名粉')}</span>${work.pairing ? ` · CP: <b>${escapeHtml(work.pairing)}</b>` : ''}</div>
            <div style="margin:6px 0;">${tagsHtml}</div>
            <div style="font-size:11px;color:#888;">
                共 ${work.chapters.length} 章 · 💚 Kudos ${work.kudos || 0} · 💬 评论 ${work.comments || 0}
            </div>
            ${work.summary ? `<div style="font-size:12px;color:#555;font-style:italic;background:#f5eee1;padding:8px 10px;border-left:3px solid #900;margin-top:10px;">${escapeHtml(work.summary)}</div>` : ''}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;background:#f0e9dc;padding:6px 10px;border-radius:6px;">
            <select id="ao3ChapterSelect" style="font-size:12px;border-radius:6px;border:1px solid #ccc;padding:4px;background:#fff;max-width:65%;">
                ${chapterOptions}
            </select>
            <button id="ao3UrgeBtn" style="background:#900;color:#fff;border:none;padding:5px 12px;border-radius:14px;font-size:11px;font-weight:700;cursor:pointer;">📢 催更续写下章</button>
        </div>

        <div style="font-size:15px;line-height:2.1;color:#1a1a1a;white-space:pre-wrap;word-break:break-word;font-family:Georgia,serif;padding:6px 2px;">
            ${escapeHtml(chapter.content)}
        </div>

        <div style="margin-top:24px;border-top:1px solid #e0d8c8;padding-top:14px;text-align:center;">
            <button id="ao3GiveKudosBtn" class="btn-secondary" style="border-radius:20px;padding:6px 20px;background:#fff;border:1px solid #900;color:#900;font-weight:700;">💚 给作品投喂 Kudos</button>
            <div style="font-size:11px;color:#999;margin-top:6px;">— 本章完 —</div>
        </div>
    </div>
    `;
}

function bindBrowserPanelEvents(container) {
    document.getElementById('ao3RandomGenBtn')?.addEventListener('click', triggerFanCreationPrompt);
    document.getElementById('ao3NewBookBtn')?.addEventListener('click', openCreateCustomBookModal);

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

    document.getElementById('ao3GiveKudosBtn')?.addEventListener('click', () => {
        const work = (G.fanworks || []).find(w => w._id === G.browserState.activeWorkId);
        if (work) {
            work.kudos = (work.kudos || 0) + rand(1, 5);
            showToast('💚 已给作者点亮 Kudos！', 'success', 1500);
            renderBrowserPanel();
            autoSaveGame();
        }
    });

    document.getElementById('ao3UrgeBtn')?.addEventListener('click', () => {
        urgeContinueBookChapter(G.browserState.activeWorkId);
    });
}

// 🎲 触发粉丝随机发同人文
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

// ➕ 开坑自建书籍弹窗（支持书名、简介、封面上传）
function openCreateCustomBookModal() {
    openModal(`
        <h3>➕ AO3 开坑新书</h3>
        <div class="form-group">
            <label>书籍名称 <span class="required">*</span></label>
            <input type="text" id="newBookTitle" placeholder="如：《下界回响：红石冒险录》">
        </div>
        <div class="form-group">
            <label>涉及 CP / 角色关系</label>
            <input type="text" id="newBookPairing" placeholder="如：${G.player.ytName} & Dream / 友情向">
        </div>
        <div class="form-group">
            <label>标签 Tags（用逗号或空格隔开）</label>
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
            author: G.player.ytName
        });
    };
}

// 核心生成器：新建书籍与第一章
async function generateNewBookFromAI(params = {}) {
    if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }
    G.isGenerating = true;
    showLoading();

    try {
        const p = G.player;
        const npcNames = Object.values(G.npcs).map(n => n.name).join('、');
        
        let promptGuide = '';
        if (params.customTitle) {
            promptGuide = `
            【玩家指定创作】
            书名：《${params.customTitle}》
            简介：${params.customSummary}
            关系/CP：${params.pairing || '自由发展'}
            标签：${(params.tags || []).join(', ')}
            请根据上述指定设定创作第 1 章节，字数 500-800 字。
            `;
        } else {
            promptGuide = `
            【粉丝随机同人创作】
            围绕主播「${p.ytName}」（皮上形象：${p.persona}，赛道：${p.category}）。
            可能登场的同盟主播：${npcNames}。
            灵感提示：${params.themePrompt || '自由发挥，温馨搞笑或高燃并存'}。
            `;
        }

        const sysPrompt = `
        你是一名热爱 Minecraft 主播圈的资深同人文作者，正在 AO3（同人作品分享站）发布作品。
        ${promptGuide}
        请严格按照以下标签格式输出：
        [TITLE]书籍标题[/TITLE]
        [PAIRING]CP关系或角色组合[/PAIRING]
        [TAGS]标签1, 标签2, 标签3[/TAGS]
        [SUMMARY]一段引人入胜的简介（100字左右）[/SUMMARY]
        [CHAPTER_TITLE]第1章标题[/CHAPTER_TITLE]
        [CONTENT]第1章正文内容（500-800字，行文细腻生动，富有MC世界特色与主播角色性格）[/CONTENT]
        `;

        const raw = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: '请开始创作新书第一章。' }
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
            author: params.author || '匿名粉',
            coverUrl: params.coverUrl || null,
            coverEmoji: params.coverEmoji || pick(['📕', '📗', '📘', '📙', '📓', '📜']),
            kudos: rand(30, 260),
            comments: rand(2, 35),
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
        appendStory(`🎨 你在 AO3 同人网站上看到了最新发布的小说《${title}》！`, '🎨 同人新作');
        autoSaveGame();

        // 切换到该小说的阅读界面
        openAo3Reader(workId);

    } catch (e) {
        hideLoading();
        showToast('❌ 同人作品生成失败，请检查网络或配置', 'error');
    } finally {
        G.isGenerating = false;
        updateUI();
    }
}

// 📢 催更续写下一章
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
        你正在 AO3 网站上续写热门 MC 同人小说《${work.title}》（CP: ${work.pairing || '无'}，简介: ${work.summary}）。
        上一章结尾片段如下：
        “${lastSlice}”
        现在读者正在疯狂催更！请续写【第 ${nextChapterNum} 章】，紧接上文剧情发展，生动呈现角色互动与 MC 冒险。
        格式要求：
        [CHAPTER_TITLE]本章小标题[/CHAPTER_TITLE]
        [CONTENT]续写的正文内容（500-800字）[/CONTENT]
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

        showToast(`🎉 成功催更！第 ${nextChapterNum} 章已出炉！`, 'success', 2500);
        appendStory(`📖 小说《${work.title}》催更成功，作者更新了第 ${nextChapterNum} 章「${chTitle}」！`, '📢 同人更新');
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

// 挂载全局
window.renderBrowserPanel = renderBrowserPanel;
window.openAo3Home = openAo3Home;
window.openAo3Reader = openAo3Reader;
window.triggerFanCreationPrompt = triggerFanCreationPrompt;
window.openCreateCustomBookModal = openCreateCustomBookModal;
window.urgeContinueBookChapter = urgeContinueBookChapter;
// ============================================================