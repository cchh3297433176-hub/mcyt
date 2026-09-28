// js/07-actions-social.js
// 行动处理与外部社区（YouTube 油管中心独立运行版 · 已彻底剥离并淘汰旧 AO3 史山）
// ============================================================

async function performAction(action, detail = '', useSearch = false) {
    if (G.isGenerating) { showToast('⏳ 正在生成剧情...'); return; }
    if (action === 'next') { advanceDayFree(); return; }

    if (action === 'chat' || action === 'dm' || action === 'friend' || action === 'fanclub') {
        if (typeof openPhoneApp === 'function') openPhoneApp('chat');
        else switchTab('social');
        return;
    }
    if (action === 'fanart' || action === 'ao3') {
        if (typeof openPhoneApp === 'function') openPhoneApp('ao3');
        else switchTab('browser');
        return;
    }
    if (action === 'youtube' || action === 'yt' || action === 'comment') {
        if (typeof openPhoneApp === 'function') openPhoneApp('youtube');
        else switchTab('youtube');
        return;
    }

    if (action !== 'video' && G.actionPoints < 2) { showToast('⚠️ 行动点不足，需要2点推进时段', 'error'); return; }
    if (action !== 'video') G.actionPoints -= 2;

    switch (action) {
        case 'stream':
            if (typeof openPhoneApp === 'function') openPhoneApp('streaming');
            else switchTab('stream');
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
    // 纯动态随机粉丝名
    const fanName = '粉丝_' + rand(100, 999);
    receiveFriendRequest({
        name: fanName,
        fromReason: '视频热心粉丝',
        persona: '一直在关注你的频道视频与直播，特别希望能成为好友！',
        avatarEmoji: pick(['🎮', '⛏️', '🏹', '🎨', '🌟', '👒', '🎧', '👾']),
        day: G.day
    });
}

async function handleSubAction(detail, useSearch = false) {
    await generateStory('🧘 皮下活动', `玩家选择进行皮下活动：${detail || '放松身心'}`, useSearch);
    G.player.followers += rand(1, 10);
    updateUI();
}

// 兼容老旧浏览器的占位（旧 AO3 现已彻底迁移至 js/apps/ao3/ao3-app.js）
function renderBrowserPanel() {
    if (typeof openPhoneApp === 'function') {
        openPhoneApp('ao3');
    }
}
function handleBrowserBack() {
    switchTab('story');
}

// 真实的活跃网友昵称生成池
function getRandomRealisticNetName() {
    const realisticNames = [
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
function ensureYtIntegrity() {
    if (!G.ytState) {
        G.ytState = {
            view: 'feed',
            activeVideoId: null,
            activeChannelId: 'all',
            feedExpanded: false
        };
    }
    if (G.ytState.feedExpanded === undefined) {
        G.ytState.feedExpanded = false;
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
            { id: 'ch_tech', name: '红石黑科技', prompt: '高深红石电脑、自动化农场、黑科技机关' },
            { id: 'ch_mod', name: '模组大赏', prompt: '机械动力、灾厄变兽、生活调味品等最新热门MC模组与玩法演示' },
            { id: 'ch_cut', name: '高光切片', prompt: '知名主播以及玩家的高光击杀切片、直播爆笑Reaction、技术解析' }
        ];
    }
}
ensureYtIntegrity();

function getIsPlayerYtMainAccount() {
    ensureYtIntegrity();
    return G.ytUser && G.player && (G.ytUser.username.trim() === G.player.ytName.trim());
}

function renderYouTubePanel() {
    const container = document.getElementById('youtubeTab') || document.getElementById('appModalBody');
    if (!container) return;
    ensureYtIntegrity();
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
    const pName = (G.player && G.player.ytName) || 'MC主播';
    const preset = [
        {
            _id: 'yt_ext_1',
            title: '【终极实况】末地决战：全自动红石大炮与末影龙决斗！',
            author: '方块科技组',
            authorId: null,
            views: '382万',
            time: '1天前',
            duration: '28:45',
            thumbnailEmoji: '⚔️',
            summary: '超高难度的末地攻坚实况！在半颗心极限濒危下利用末影珍珠实现不可思议的绝地翻盘！',
            comments: []
        },
        {
            _id: 'yt_ext_2',
            title: `【高能切片】盘点 ${pName} 在直播中那些惊为天人的名场面TOP5！`,
            author: 'MC爆笑烤肉组',
            authorId: null,
            views: '58万',
            time: '8小时前',
            duration: '08:42',
            thumbnailEmoji: '🍿',
            summary: `全程高能！从绝境极限反杀到搞笑掉进岩浆，回顾 ${pName} 最火爆的直播名场面，弹幕笑到打鸣！`,
            comments: []
        },
        {
            _id: 'yt_ext_3',
            title: '【机械动力】用齿轮与蒸汽造出全自动自动化火车物流网！',
            author: 'Redstone_Crafter',
            authorId: null,
            views: '89万',
            time: '2天前',
            duration: '21:15',
            thumbnailEmoji: '⚙️',
            summary: '超硬核的 Create 模组大型工程！不仅全自动运转，还能穿梭于各个矿区运送物资。',
            comments: []
        }
    ];
    G.ytExternalVideos = preset;
}

function buildYtFeedHTML() {
    ensureYtIntegrity();
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
            <div style="font-size:12px;margin-top:4px;">点击右上角 🔄 图标，AI 将结合圈内热点与模组为你生成专属视频流！</div>
        </div>
        `;
    } else {
        const MAX_VISIBLE = 15;
        const isExpanded = !!G.ytState.feedExpanded;
        const visibleCards = (allCards.length > MAX_VISIBLE && !isExpanded) ? allCards.slice(0, MAX_VISIBLE) : allCards;
        const hiddenCount = allCards.length - MAX_VISIBLE;

        visibleCards.forEach(v => {
            let avatarHtml = '<span>👤</span>';
            if (v.isPlayer) {
                avatarHtml = G.player.avatar ? `<img src="${G.player.avatar}">` : '<span>🧑</span>';
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

        if (hiddenCount > 0) {
            feedHtml += `
            <div style="padding:14px 10px;text-align:center;">
                <button class="btn-secondary" id="ytToggleCollapseBtn" style="font-size:12px;padding:8px 18px;border-radius:20px;display:inline-flex;align-items:center;gap:6px;">
                    ${isExpanded ? '🔼 收起多余旧视频' : `🔽 展开更多历史推荐 (还有 ${hiddenCount} 个视频)`}
                </button>
            </div>
            `;
        }
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
    ensureYtIntegrity();
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
        liveListHtml = `<div style="text-align:center;color:#888;padding:20px 0;font-size:12px;">暂无历史直播记录</div>`;
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

function cleanYtCommentText(rawText) {
    if (!rawText) return '';
    let text = rawText.replace(/\[\/?COMMENT[^\]]*\]/gi, '')
                      .replace(/\[\/?user[^\]]*\]/gi, '')
                      .replace(/^user\s*=\s*[^\s\n]+[:：\s]*/i, '')
                      .replace(/user\s*=\s*[a-zA-Z0-9_\u4e00-\u9fa5]+/gi, '')
                      .trim();

    text = text.replace(/乙女向/g, 'MC解密剧情')
               .replace(/乙女/g, '沉浸微电影')
               .replace(/男主们/g, '大神搭档')
               .replace(/男主/g, '搭档好友')
               .replace(/女主视角/g, '第一人称实况')
               .replace(/女主/g, '主播')
               .replace(/女主角/g, '主播');

    return text;
}

function buildYtWatchHTML(videoId) {
    ensureYtIntegrity();
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
            summary: liveData ? `【直播实况记录】：本场直播累计获得金币 ${liveData.moneyEarned||0}，涨粉 ${liveData.fansGained||0}！${liveData.summaryText || '全程互动火爆！'}` : '精彩直播内容。',
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
            let cUser = c.user || c.author;
            let cText = c.content || c.text;
            let cTime = c.time;
            if (typeof c === 'string') {
                cUser = null;
                cText = c;
                cTime = '';
            }

            let repliesHtml = '';
            if (c.replies && c.replies.length) {
                repliesHtml = `<div class="ao3-replies-list" style="border-left-color:#cc0000;">` + c.replies.map(rep => {
                    let repUser = rep.author || rep.user;
                    let repText = rep.text || rep.content;
                    let repTime = rep.time;
                    let repIsSelf = rep.isSelf;
                    if (typeof rep === 'string') { repUser = null; repText = rep; repTime = ''; repIsSelf = false; }
                    
                    const cleanRepAuthor = cleanYtUsername(repUser);
                    const cleanRepText = cleanYtCommentText(repText);
                    return `
                    <div class="ao3-reply-entry" style="background:#f4f4f4;">
                        <span style="font-weight:700;color:${repIsSelf ? '#2e7d32' : '#0f0f0f'};">@${escapeHtml(cleanRepAuthor)}</span>：
                        <span>${escapeHtml(cleanRepText)}</span>
                        <div style="font-size:9px;color:#aaa;text-align:right;">${repTime || ''}</div>
                    </div>`;
                }).join('') + `</div>`;
            }

            const cleanAuthor = cleanYtUsername(cUser);
            const cleanText = cleanYtCommentText(cText || '');
            if (!cleanText) return '';

            return `
            <div class="ao3-comment-item" style="border-color:#eee;">
                <div class="ao3-comment-header">
                    <span style="font-weight:700;font-size:12px;color:#0f0f0f;">@${escapeHtml(cleanAuthor)}</span>
                    <span style="font-size:10px;color:#aaa;">${cTime || ''}</span>
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
                <span style="font-weight:700;font-size:14px;color:#0f0f0f;">评论</span>
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

    document.getElementById('ytToggleCollapseBtn')?.addEventListener('click', () => {
        G.ytState.feedExpanded = !G.ytState.feedExpanded;
        renderYouTubePanel();
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
    ensureYtIntegrity();
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
            <textarea id="newChannelPrompt" rows="3" placeholder="描述该频道应推送什么样的视频"></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="confirmCreateChannelBtn">创建并刷新推送</button>
        </div>
    `);

    document.getElementById('confirmCreateChannelBtn').onclick = async () => {
        const name = document.getElementById('newChannelName').value.trim();
        const promptText = document.getElementById('newChannelPrompt').value.trim();

        if (!name || !promptText) { showToast('⚠️ 请填写完整信息', 'error'); return; }

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
    ensureYtIntegrity();
    const currentName = (G.ytUser && G.ytUser.username) || G.player.ytName;
    const isMain = currentName.trim() === G.player.ytName.trim();

    openModal(`
        <h3>👤 油管账户切换</h3>
        <p style="font-size:12px;color:#666;line-height:1.6;">
            你可以使用主播<b>官方主号</b>带蓝标认证发言，或者切换为<b>路人小号</b>潜水、整活或围观。
        </p>
        <div class="form-group">
            <label>当前登录账号昵称</label>
            <input type="text" id="ytAccountNameInput" value="${escapeHtml(currentName)}" placeholder="输入账号名称...">
        </div>
        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" id="ytResetMainAccount">还原主号</button>
            <button class="btn-primary" id="ytSaveAccountBtn">保存设置</button>
        </div>
    `);

    const input = document.getElementById('ytAccountNameInput');

    document.getElementById('ytResetMainAccount').onclick = () => {
        input.value = G.player.ytName;
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
        ensureYtIntegrity();
        const activeChId = G.ytState.activeChannelId || 'all';
        const curCh = (G.ytCustomChannels || []).find(c => c.id === activeChId);
        const playerName = (G.player && G.player.ytName) || 'MC主播';

        let categoryPrompt = curCh 
            ? `【专区限定】：该专区为「${curCh.name}」，内容设定：${curCh.prompt}。` 
            : `【内容主题】：游戏与日常生活大热专区，兼顾大神技术、流行模组、硬核挑战、爆笑沙雕。`;

        const sysPrompt = `
你正在模拟 YouTube 游戏与生活视频推荐流系统。
${categoryPrompt}
玩家频道名：「${playerName}」。
请生成 3 条热门推荐视频，包括圈内好友作品、高玩技术、以及关于「${playerName}」的高光 Reaction 或切片。
严格遵循格式：
[VIDEO]
TITLE: 视频爆款吸睛标题
AUTHOR: 主播名字或地道网名
VIEWS: 播放量（如：85万次观看）
TIME: 发布时间（如：2小时前、刚刚）
SUMMARY: 视频核心内容高光描述
[/VIDEO]
`;

        const raw = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: '请刷新 3 条热门推荐视频。' }
        ], { maxTokens: 950, temperature: 0.95 });

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

            newCards.push({
                _id: 'yt_ai_' + Date.now() + '_' + idx,
                channelId: activeChId,
                title: title.trim(),
                author: author.trim(),
                views: views.trim(),
                time: time.trim(),
                duration: `${rand(8, 25)}:${rand(10, 59)}`,
                thumbnailEmoji: pick(['🎮', '🏹', '🏰', '🔴', '💣', '🌲', '💎', '🔥', '✨', '⚙️', '🍿']),
                summary: summary.trim(),
                comments: []
            });
        });

        if (newCards.length) {
            G.ytExternalVideos = [...newCards, ...(G.ytExternalVideos || [])];
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
    ensureYtIntegrity();
    const isMain = getIsPlayerYtMainAccount();
    const currentName = (G.ytUser && G.ytUser.username) || G.player.ytName;

    openModal(`
        <h3>➕ YouTube 发布新视频</h3>
        <div style="font-size:12px;color:#666;margin-bottom:8px;">
            发布身份：<b style="color:${isMain ? '#2e7d32' : '#b26a00'};">${escapeHtml(currentName)}</b>
        </div>
        <div class="form-group">
            <label>视频标题 <span class="required">*</span></label>
            <input type="text" id="ytNewVideoTitle" placeholder="起一个吸睛的油管爆款标题...">
        </div>
        <div class="form-group">
            <label>视频脚本剧情 / 简介 <span class="required">*</span></label>
            <textarea id="ytNewVideoSummary" rows="3" placeholder="描述这期视频的核心内容、高光反杀、搞笑日常等..."></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="ytConfirmPublishBtn">🚀 立即发布到 YouTube</button>
        </div>
    `);

    document.getElementById('ytConfirmPublishBtn').onclick = () => {
        const title = document.getElementById('ytNewVideoTitle').value.trim();
        const summary = document.getElementById('ytNewVideoSummary').value.trim();

        if (!title || !summary) { showToast('⚠️ 标题与简介不能为空', 'error'); return; }

        closeModal();

        const videoObj = {
            title,
            desc: summary,
            views: rand(300, 2000),
            likes: rand(50, 400),
            day: G.day,
            comments: []
        };

        if (!G.player.videos) G.player.videos = [];
        G.player.videos.push(videoObj);

        G.player.followers += rand(50, 300);
        G.player.money += rand(30, 100);

        showToast(`🎉 视频《${title}》已成功发布！`, 'success', 2500);
        appendStory(`🎬 你在 YouTube 上发布了新视频《${title}》！`, '🎬 视频发布');
        autoSaveGame();
        renderYouTubePanel();
    };
}

async function generateMoreYtCommentsByAI(videoId) {
    ensureYtIntegrity();
    let video = (G.ytExternalVideos || []).find(v => v._id === videoId);
    if (!video) {
        video = (G.player.videos || []).find(v => ('yt_my_' + (v.title || v.day)) === videoId);
    }
    if (!video) return;
    if (G.isGenerating) { showToast('⏳ 正在生成评论...'); return; }

    G.isGenerating = true;

    try {
        const sysPrompt = `
你正在模拟 YouTube 游戏频道《${video.title}》（作者：${video.author || '游戏主播'}）下方的海外及本土真实观众评论区。
请生成 4 条真实生动的网友评论。
格式要求：
[COMMENT user=网友昵称]评论正文[/COMMENT]
`;

        const raw = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: '请生成4条真实的油管网友评论。' }
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

        showToast(`✅ 评论区已刷新！`, 'success', 1500);
        renderYouTubePanel();
        autoSaveGame();

    } catch (e) {
        showToast('❌ 评论生成失败：' + e.message, 'error');
    } finally {
        G.isGenerating = false;
    }
}

function openYtWriteCommentModal(videoId) {
    ensureYtIntegrity();
    const currentName = (G.ytUser && G.ytUser.username) || G.player.ytName;
    openModal(`
        <h3>✍️ 发布 YouTube 评论</h3>
        <p style="font-size:12px;color:#666;">以 <b>${escapeHtml(currentName)}</b> 的身份留言：</p>
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

        let video = (G.ytExternalVideos || []).find(v => v._id === videoId);
        if (!video) {
            video = (G.player.videos || []).find(v => ('yt_my_' + (v.title || v.day)) === videoId);
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
            closeModal();
            showToast('✅ 评论发送成功！', 'success', 1500);
            renderYouTubePanel();
            autoSaveGame();
        }
    };
}

function openYtReplyCommentModal(videoId, commentIdx) {
    ensureYtIntegrity();
    let video = (G.ytExternalVideos || []).find(v => v._id === videoId);
    if (!video) {
        video = (G.player.videos || []).find(v => ('yt_my_' + (v.title || v.day)) === videoId);
    }
    if (!video || !video.comments || !video.comments[commentIdx]) return;

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
            <textarea id="myYtReplyInput" rows="2" placeholder="输入回复..."></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="confirmPostYtReply">发送回复</button>
        </div>
    `);

    document.getElementById('confirmPostYtReply').onclick = () => {
        const replyText = document.getElementById('myYtReplyInput').value.trim();
        if (!replyText) { showToast('⚠️ 回复内容不能为空', 'error'); return; }

        if (!targetComment.replies) targetComment.replies = [];
        targetComment.replies.push({
            author: currentName,
            text: replyText,
            isSelf: true,
            time: '刚刚'
        });

        closeModal();
        showToast('✅ 回复成功！', 'success', 1200);
        renderYouTubePanel();
        autoSaveGame();
    };
}

// 挂载全局
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
