// js/04-game-core-2.js
// 成就系统、商店、数据面板、手机社交(多模态识图、时差推导、朋友圈互怼吃醋、私聊动态贯通、微信式连发)
// ============================================================

// 🐷 内置默认表情包源数据（确保永远不会丢失）
const DEFAULT_PIG_STICKERS = [
    {category:'猪猪',desc:'这只可爱的小猪就是我呀',url:'https://imgbed.heliar.top/i/QZNPVIKLzB8DiDL-.jpg'},
    {category:'猪猪',desc:'你给我老实点',url:'https://imgbed.heliar.top/i/KpiF2iLAUzHVDvjD.jpg'},
    {category:'猪猪',desc:'骂我的人看到我这样还忍心骂吗',url:'https://imgbed.heliar.top/i/TnIT9ii2FOss4Fke.jpg'},
    {category:'猪猪',desc:'这两只小猪就是我们呀',url:'https://imgbed.heliar.top/i/K0UZOCq2MYES8vga.jpg'},
    {category:'猪猪',desc:'悲愤离开',url:'https://imgbed.heliar.top/i/O7E9kWjlYBDg59W-.jpg'},
    {category:'猪猪',desc:'猪是必须要爱惜的',url:'https://imgbed.heliar.top/i/tiUgP49B0Tez99eI.jpg'},
    {category:'猪猪',desc:'而我只是一个QQ肠',url:'https://imgbed.heliar.top/i/G4YYaUbHaS62Acf-.jpg'},
    {category:'猪猪',desc:'小猪魔法',url:'https://imgbed.heliar.top/i/nEe02eA-RY7p7Ehl.jpg'},
    {category:'猪猪',desc:'wink一下',url:'https://imgbed.heliar.top/i/PSfpaNyQU1Pe2Qvm.jpg'},
    {category:'猪猪',desc:'再睡拱死你',url:'https://imgbed.heliar.top/i/2IqW2TDCBMsl81T9.jpg'},
    {category:'猪猪',desc:'忙着玩手机',url:'https://imgbed.heliar.top/i/AKsZ0ADV1nbpN6Xh.jpg'},
    {category:'猪猪',desc:'饶了这一次呗',url:'https://imgbed.heliar.top/i/cAIQytv_7rGo92is.jpg'},
    {category:'猪猪',desc:'气疯了你满意了吗！',url:'https://imgbed.heliar.top/i/ST0SkhSSAT0tNcJ7.jpg'},
    {category:'猪猪',desc:'熟睡中',url:'https://imgbed.heliar.top/i/pa6PWuk1W2T9sM_i.jpg'},
    {category:'猪猪',desc:'突然出现',url:'https://imgbed.heliar.top/i/rH-ZeZBzySvEydf1.jpg'},
    {category:'猪猪',desc:'你这样对我我会哭的呀',url:'https://imgbed.heliar.top/i/JVjz3snh4bQPeJPB.jpg'},
    {category:'猪猪',desc:'就这样萌萌的看着泥',url:'https://imgbed.heliar.top/i/wjHyOK7Nlrje2RMj.jpg'},
    {category:'猪猪',desc:'我发现躺着会很酥胡',url:'https://imgbed.heliar.top/i/iOZZUDJmk9i4oyjK.jpg'},
    {category:'猪猪',desc:'我把话放这了',url:'https://imgbed.heliar.top/i/QNTbRjWXRXJiFof8.jpg'},
    {category:'猪猪',desc:'猪的天啊',url:'https://imgbed.heliar.top/i/Iaai5e8mbqtCqciE.jpg'},
    {category:'猪猪',desc:'我素你的掌上明猪呀',url:'https://imgbed.heliar.top/i/9ro4rlqIzD9nH1uw.jpg'},
    {category:'猪猪',desc:'如果我是猪也该遇见属于我的恋猪癖了',url:'https://imgbed.heliar.top/i/JN_hGfK5CEHBb34K.jpg'},
    {category:'猪猪',desc:'你不要猪了吗',url:'https://imgbed.heliar.top/i/LSckmvTxPcjpX5sM.jpg'},
    {category:'猪猪',desc:'你这只猪到底想我没',url:'https://imgbed.heliar.top/i/EpozQFX0HEf6X9TF.jpg'},
    {category:'猪猪',desc:'两猪对视',url:'https://imgbed.heliar.top/i/OjuoWxmO7dtaCGGr.jpg'},
    {category:'猪猪',desc:'别想让我理你这只猪了',url:'https://imgbed.heliar.top/i/3Uy69MILiykjX2Yw.jpg'},
    {category:'猪猪',desc:'你这只猪又不理我',url:'https://imgbed.heliar.top/i/YKTyf0FsRqDaAUFv.jpg'}
];

function ensureStickersLoaded() {
    if (!window.G) window.G = {};
    if (!window.G.stickerCategories || !Array.isArray(window.G.stickerCategories)) {
        window.G.stickerCategories = ['猪猪', '默认'];
    }
    if (!window.G.stickerCategories.includes('猪猪')) {
        window.G.stickerCategories.unshift('猪猪');
    }
    if (!window.G.activeStickerCategory) {
        window.G.activeStickerCategory = '猪猪';
    }
    if (!window.G.stickerLibrary || !Array.isArray(window.G.stickerLibrary)) {
        window.G.stickerLibrary = [];
    }
    const hasPigStickers = window.G.stickerLibrary.some(s => s && s.category === '猪猪');
    if (!hasPigStickers) {
        window.G.stickerLibrary.push(...DEFAULT_PIG_STICKERS);
    }
}
ensureStickersLoaded();

// ============================================================
// 触控与长按事件兼容层（彻底消除 WebView 上的吞点击、滑动冲突）
// ============================================================
function bindTouchTap(el, onClick, onLongPress = null) {
    if (!el) return;
    const LONG_PRESS_MS = 550;
    const MOVE_THRESHOLD = 15;
    let timer = null;
    let startX = 0, startY = 0;
    let isTouchActive = false;
    let isLongPressed = false;
    let hasMoved = false;

    const clearTimer = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };

    el.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        isTouchActive = true;
        isLongPressed = false;
        hasMoved = false;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        clearTimer();
        if (typeof onLongPress === 'function') {
            timer = setTimeout(() => {
                if (isTouchActive && !hasMoved) {
                    isLongPressed = true;
                    onLongPress(e);
                }
            }, LONG_PRESS_MS);
        }
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
        if (!isTouchActive || !e.touches || !e.touches[0]) return;
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
            hasMoved = true;
            clearTimer();
        }
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
        clearTimer();
        if (isTouchActive && !hasMoved && !isLongPressed) {
            if (typeof onClick === 'function') {
                e.preventDefault();
                onClick(e);
            }
        }
        isTouchActive = false;
        isLongPressed = false;
        hasMoved = false;
    }, { passive: false });

    el.addEventListener('touchcancel', () => {
        clearTimer();
        isTouchActive = false;
        isLongPressed = false;
        hasMoved = false;
    }, { passive: true });

    // PC 浏览器调试或触控未捕获兜底
    el.addEventListener('click', (e) => {
        if (isLongPressed || hasMoved) return;
        if (typeof onClick === 'function') {
            onClick(e);
        }
    });

    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
}

// ============================================================
// 成就系统
// ============================================================
function checkAchievements() {
    if (!G.unlockedAchievements) G.unlockedAchievements = [];
    for (const ach of ACHIEVEMENTS) {
        if (G.unlockedAchievements.includes(ach.id)) continue;
        if (ach.check()) unlockAchievement(ach);
    }
}

function unlockAchievement(ach) {
    G.unlockedAchievements.push(ach.id);
    G.player.money += ach.reward;
    const toast = document.getElementById('achievementToast');
    if (toast) {
        toast.innerHTML = `<span class="ach-icon">${ach.icon}</span> 解锁成就：${ach.name}！获得 ${ach.reward} 金币！`;
        toast.className = 'achievement-unlock-toast show';
        clearTimeout(toast._hide);
        toast._hide = setTimeout(() => { toast.className = 'achievement-unlock-toast'; }, 5000);
    }
    appendStory(`🏆 解锁成就「${ach.name}」！获得 ${ach.reward} 金币奖励。`, '🏆 成就');
    addMemoir('成就解锁', `${ach.name} (${ach.desc})`);
    showToast(`🏆 解锁成就：${ach.name}！`, 'success', 4000);
    addGlobalMemoryRecord(`【成就达成】：主角成功解锁成就「${ach.name}」（${ach.desc}），获得 ${ach.reward} 金币。`);
    updateUI();
    if (document.querySelector('.tab-btn.active')?.dataset.tab === 'achievements') renderAchievements();
}

function renderAchievements() {
    const container = (dom && dom.achievementsTab) || document.getElementById('achievementsTab');
    if (!container) return;
    let html = `
    <div style="font-weight:700;font-size:17px;margin-bottom:10px;">🏆 成就 (${G.unlockedAchievements ? G.unlockedAchievements.length : 0}/${ACHIEVEMENTS.length})</div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:12px;">完成成就获得金币奖励！</div>
    <div class="achievement-grid">
    `;
    const categories = { fans: '👥 粉丝里程碑', video: '🎬 视频创作', stream: '📺 直播成就', social: '💕 社交成就' };
    for (const [catKey, catLabel] of Object.entries(categories)) {
        const items = ACHIEVEMENTS.filter(a => a.category === catKey);
        if (items.length === 0) continue;
        html += `<div style="grid-column:1/-1;font-weight:700;font-size:15px;color:var(--text);margin-top:6px;">${catLabel}</div>`;
        for (const ach of items) {
            const unlocked = G.unlockedAchievements && G.unlockedAchievements.includes(ach.id);
            html += `
            <div class="achievement-card ${unlocked ? '' : 'locked'}">
                <div class="ach-icon">${ach.icon}</div>
                <div class="ach-name">${ach.name}</div>
                <div class="ach-desc">${ach.desc}</div>
                <div class="ach-reward">💰 ${ach.reward}</div>
                <div class="ach-status">${unlocked ? '✅ 已解锁' : '🔒 未解锁'}</div>
            </div>
            `;
        }
    }
    html += `</div>`;
    container.innerHTML = html;
}

// ============================================================
// 赞助商/广告商系统
// ============================================================
function generateSponsorOffer() {
    if (G.player.followers < 10000) return;
    if (G.sponsorCooldown > 0) { G.sponsorCooldown--; return; }
    if (G.sponsorOffers && G.sponsorOffers.length > 0) return;
    if (Math.random() < 0.15) {
        const type = pick(SPONSOR_TYPES);
        G.sponsorOffers = [{ ...type, expires: G.day + 5, accepted: false }];
        showToast('📢 新的赞助合作邀请已到达！', 'success', 3000);
        if (document.querySelector('.tab-btn.active')?.dataset.tab === 'shop') renderShop();
    }
}

function acceptSponsor(index) {
    if (!G.sponsorOffers || index >= G.sponsorOffers.length) return;
    const offer = G.sponsorOffers[index];
    if (offer.accepted) return;
    offer.accepted = true;
    const reward = offer.reward + rand(-500, 1000);
    G.player.money += reward;
    const risk = Math.random() < offer.risk;
    if (risk) {
        const loss = rand(50, 300);
        G.player.followers = Math.max(0, G.player.followers - loss);
        appendStory(`⚠️ 你接受了 ${offer.name} 的赞助，但部分粉丝觉得推广太多，流失了 ${loss} 人。`, '📢 赞助风险');
        showToast(`⚠️ 赞助推广导致 ${loss} 粉丝流失`, 'error', 3000);
        addGlobalMemoryRecord(`【商业赞助】：接受 ${offer.name} 商业推广获得 ${reward} 金币，但引起部分粉丝反弹掉粉 ${loss} 人。`);
    } else {
        const gain = rand(20, 100);
        G.player.followers += gain;
        appendStory(`✅ 你接受了 ${offer.name} 的赞助，获得 ${reward} 金币，粉丝增长了 ${gain} 人！`, '📢 赞助成功');
        showToast(`✅ 赞助合作成功！获得 ${reward} 金币`, 'success', 3000);
        addGlobalMemoryRecord(`【商业赞助】：成功与 ${offer.name} 达成广告合作，收益 ${reward} 金币且口碑良好涨粉 ${gain} 人。`);
    }
    G.sponsorCooldown = 5;
    G.sponsorOffers = [];
    addMemoir('赞助合作', `${offer.name} (${reward}金币)`);
    updateUI(); renderShop(); checkAchievements(); autoSaveGame();
}

function renderShop() {
    const container = (dom && dom.shopTab) || document.getElementById('shopTab');
    if (!container) return;
    const p = G.player;
    const equipLevel = p.equipmentLevel || 1;
    const equipMax = 5;
    const equipCosts = [0, 500, 1500, 4000, 8000, 15000];
    const equipMultipliers = [1.0, 1.2, 1.5, 2.0, 2.8, 4.0];
    const items = [
        { id: 'hot1', label: '🔥 热度小包', desc: '一次性增加 5,000 粉丝', cost: 1000, effect: () => { G.player.followers += 5000; checkSocialRequestsTrigger(); } },
        { id: 'hot2', label: '🔥 热度中包', desc: '一次性增加 20,000 粉丝', cost: 3500, effect: () => { G.player.followers += 20000; checkSocialRequestsTrigger(); } },
        { id: 'hot3', label: '🔥 热度大包', desc: '一次性增加 50,000 粉丝', cost: 8000, effect: () => { G.player.followers += 50000; checkSocialRequestsTrigger(); } },
    ];
    let html = `
    <h3>🛒 商店</h3>
    <div style="margin-bottom:12px;"><div style="font-weight:600;font-size:16px;">💰 当前金币：${p.money}</div></div>
    <div style="font-weight:600;font-size:15px;margin-bottom:6px;">📦 热度道具</div>
    <div class="shop-grid">
    `;
    for (const item of items) {
        const canBuy = p.money >= item.cost;
        html += `
        <div class="shop-item">
            <div class="info"><div class="name">${item.label}</div><div class="desc">${item.desc}</div></div>
            <div style="display:flex;align-items:center;gap:6px;"><span class="price">💰 ${item.cost}</span><button class="buy-btn" data-item="${item.id}" ${canBuy ? '' : 'disabled'}>购买</button></div>
        </div>`;
    }
    html += `</div>
    <div style="font-weight:600;font-size:15px;margin:14px 0 6px;">🎥 直播设备 (等级 ${equipLevel}/${equipMax})</div>
    <div style="background:var(--card);border-radius:var(--radius);padding:12px;box-shadow:var(--shadow);">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">
            <span>当前等级系数：<strong>${equipMultipliers[equipLevel].toFixed(1)}x</strong></span>
            <span>下一级：<strong>${equipMultipliers[equipLevel+1] ? equipMultipliers[equipLevel+1].toFixed(1)+'x' : '已满级'}</strong></span>
            ${equipLevel < equipMax ? `<button class="buy-btn" id="upgradeEquip" ${p.money >= equipCosts[equipLevel] ? '' : 'disabled'}>升级 (💰 ${equipCosts[equipLevel]})</button>` : '<span>已满级</span>'}
        </div>
    </div>
    <div style="font-weight:600;font-size:15px;margin:14px 0 6px;">📢 合作邀约</div>`;
    
    if (G.player.followers < 10000) {
        html += `<div style="color:var(--text2);font-size:13px;padding:8px 0;">粉丝达到 10,000 后解锁赞助合作。</div>`;
    } else if (G.sponsorOffers && G.sponsorOffers.length > 0) {
        for (let i = 0; i < G.sponsorOffers.length; i++) {
            const offer = G.sponsorOffers[i];
            if (offer.accepted) {
                html += `<div class="sponsor-card" style="border-left-color:#4caf50;"><div class="sponsor-name">✅ ${offer.name}</div><div class="sponsor-desc">已接受，获得 ${offer.reward} 金币</div></div>`;
            } else {
                html += `
                <div class="sponsor-card">
                    <div class="sponsor-name">${offer.name}</div>
                    <div class="sponsor-desc">${offer.desc} (风险: ${Math.round(offer.risk*100)}% 掉粉)</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
                        <span class="sponsor-reward">💰 ${offer.reward} 金币</span>
                        <button class="sponsor-btn" onclick="acceptSponsor(${i})">接受合作</button>
                    </div>
                </div>`;
            }
        }
    } else {
        html += `<div style="color:var(--text2);font-size:13px;padding:8px 0;">暂无合作邀约，稍后再来看看吧。</div>`;
    }
    container.innerHTML = html;
    
    container.querySelectorAll('.buy-btn[data-item]').forEach(btn => {
        btn.addEventListener('click', function() {
            const item = items.find(i => i.id === this.dataset.item);
            if (!item || G.player.money < item.cost) { showToast('金币不足', 'error'); return; }
            G.player.money -= item.cost;
            item.effect();
            updateUI(); renderShop(); showToast('✅ 购买成功！', 'success');
            addMemoir('商店购买', `购买了 ${item.label}`); autoSaveGame();
        });
    });
    
    document.getElementById('upgradeEquip')?.addEventListener('click', function() {
        const level = G.player.equipmentLevel || 1;
        if (level >= equipMax) { showToast('已满级', 'error'); return; }
        const cost = equipCosts[level];
        if (G.player.money < cost) { showToast('金币不足', 'error'); return; }
        G.player.money -= cost;
        G.player.equipmentLevel = level + 1;
        updateUI(); renderShop(); showToast(`🎥 设备升级至 ${G.player.equipmentLevel} 级！`, 'success');
        addMemoir('设备升级', `直播设备升级至 ${G.player.equipmentLevel} 级`); autoSaveGame();
    });
}
window.acceptSponsor = acceptSponsor;

// ============================================================
// 频道与数据面板
// ============================================================
function renderDashboard() {
    const container = (dom && dom.dashboardTab) || document.getElementById('dashboardTab');
    if (!container) return;
    const p = G.player;
    const totalViews = p.videos.reduce((sum, v) => sum + (v.views || 0), 0);
    let html = `
    <div class="stats-grid">
        <div class="stat-card"><div class="num">${p.followers}</div><div class="label">❤️ 粉丝</div></div>
        <div class="stat-card"><div class="num">${p.videos.length}</div><div class="label">📹 视频</div></div>
        <div class="stat-card"><div class="num">${totalViews}</div><div class="label">👀 总观看</div></div>
    </div>
    `;
    const collectionNames = Object.keys(G.collections || {});
    if (collectionNames.length > 0) {
        html += `<div style="margin-bottom:10px;font-weight:700;font-size:15px;">📚 合集</div>`;
        for (const name of collectionNames) {
            const col = G.collections[name];
            const colVideos = (col.videos || []).map(idx => G.player.videos[idx]).filter(v => v);
            const totalViewsCol = col.totalViews || 0;
            const totalLikesCol = col.totalLikes || 0;
            const totalCommentsCol = col.totalComments || 0;
            html += `
            <div class="collection-card">
                <div class="col-title">${name}</div>
                <div class="col-stats">
                    <span>📹 ${colVideos.length} 个视频</span>
                    <span>👁️ ${totalViewsCol} 观看</span>
                    <span>👍 ${totalLikesCol} 点赞</span>
                    <span>💬 ${totalCommentsCol} 评论</span>
                </div>
                <button class="col-toggle" onclick="toggleCollection('${name}')">展开视频列表</button>
                <div class="col-videos" id="col-${name}" style="display:none;">
                    ${colVideos.map((v, i) => {
                        const vidx = G.player.videos.indexOf(v);
                        return `
                        <div class="col-video-item">
                            <span class="vtitle">第${i+1}集：${v.title}</span>
                            <span class="vmeta">👁️ ${v.views} 👍 ${v.likes} 💬 ${v.comments ? v.comments.length : 0}</span>
                            <button class="vcom-btn" onclick="toggleColVideoComments('${name}', ${vidx})">查看评论</button>
                            <div class="col-video-comments" id="colcom-${name}-${vidx}"></div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
            `;
        }
    }
    const singleVideos = (p.videos || []).filter(v => !v.collection);
    html += `<div style="margin-top:12px;font-weight:700;font-size:15px;">🎬 单视频</div>`;
    if (singleVideos.length === 0) {
        html += `<div class="no-videos-msg">暂无单视频</div>`;
    } else {
        html += `<div class="video-list">`;
        const sorted = [...singleVideos].reverse();
        sorted.forEach((video) => {
            const realIndex = p.videos.indexOf(video);
            html += `
            <div class="video-card" data-video-index="${realIndex}">
                <div class="video-title">${escapeHtml(video.title)}</div>
                <div class="video-meta">
                    <span>📅 第${video.day}天</span>
                    <span>👁️ ${video.views || 0} 次观看</span>
                    <span>💬 ${video.comments ? video.comments.length : 0} 条评论</span>
                </div>
                <button class="toggle-comments-btn" data-index="${realIndex}">💬 查看/回复评论</button>
                <div class="comments-section" id="comments-${realIndex}"></div>
            </div>
            `;
        });
        html += `</div>`;
    }
    container.innerHTML = html;
    container.querySelectorAll('.toggle-comments-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = parseInt(this.dataset.index);
            const section = document.getElementById(`comments-${idx}`);
            if (section) {
                const isOpen = section.classList.toggle('open');
                if (isOpen) renderComments(idx, section);
            }
        });
    });
}

function toggleCollection(name) {
    const el = document.getElementById(`col-${name}`);
    if (el) {
        const isOpen = el.style.display !== 'none';
        el.style.display = isOpen ? 'none' : 'block';
        const btn = document.querySelector(`.collection-card .col-toggle`);
        if (btn) btn.textContent = isOpen ? '展开视频列表' : '收起视频列表';
    }
}
window.toggleCollection = toggleCollection;

function toggleColVideoComments(collectionName, videoIndex) {
    const container = document.getElementById(`colcom-${collectionName}-${videoIndex}`);
    if (!container) return;
    const isOpen = container.style.display !== 'none';
    if (isOpen) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    renderComments(videoIndex, container);
}
window.toggleColVideoComments = toggleColVideoComments;

function renderComments(videoIndex, container) {
    const video = G.player.videos[videoIndex];
    if (!video) return;
    const comments = video.comments || [];
    let html = '';
    const activeAccount = getActiveAccountInfo();

    if (comments.length === 0) html = `<div class="no-comments">还没有评论，快来抢沙发！</div>`;
    else {
        comments.forEach((comment, idx) => {
            html += `
            <div class="comment-item" data-comment-idx="${idx}">
                <div class="comment-user">${escapeHtml(comment.user)}</div>
                <div class="comment-content">${escapeHtml(comment.content)}</div>
                <div class="reply-box">
                    <input type="text" placeholder="以 [${escapeHtml(activeAccount.name)}] 回复 @${escapeHtml(comment.user)}..." class="reply-input" data-video-idx="${videoIndex}" data-comment-idx="${idx}">
                    <button class="reply-send" data-video-idx="${videoIndex}" data-comment-idx="${idx}">发送</button>
                </div>
            </div>
            `;
        });
    }
    container.innerHTML = html;
    container.querySelectorAll('.reply-send').forEach(btn => {
        btn.addEventListener('click', function() {
            const vIdx = parseInt(this.dataset.videoIdx);
            const cIdx = parseInt(this.dataset.commentIdx);
            const input = this.closest('.reply-box').querySelector('.reply-input');
            const text = input.value.trim();
            if (!text) { showToast('请输入回复内容', 'error', 1500); return; }
            if (G.actionPoints < 2) { showToast('⚠️ 需要2行动点', 'error', 2000); return; }
            sendReply(vIdx, cIdx, text);
        });
    });
    container.querySelectorAll('.reply-input').forEach(inp => {
        inp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const btn = this.closest('.reply-box').querySelector('.reply-send');
                if (btn) btn.click();
            }
        });
    });
}

function sendReply(videoIndex, commentIndex, replyText) {
    const video = G.player.videos[videoIndex];
    if (!video) return;
    const targetComment = video.comments[commentIndex];
    if (!targetComment) return;
    if (G.actionPoints < 2) { showToast('⚠️ 行动点不足', 'error'); return; }
    G.actionPoints -= 2;
    updateUI();
    const currentAcc = getActiveAccountInfo();
    const isAlt = currentAcc.isAlt;
    const senderName = currentAcc.name + (isAlt ? ' (小号)' : '');
    const newComment = { user: senderName, content: `回复 @${targetComment.user}: ${replyText}` };
    video.comments.unshift(newComment);
    const gain = rand(1, 5);
    G.player.followers += gain;
    G.player.likes += rand(1, 3);
    updateUI();
    appendStory(`💬 你以「${senderName}」在视频「${video.title}」中回复了 @${targetComment.user}: ${replyText}`, '📨 回复');
    const container = document.getElementById(`colcom-${video.collection}-${videoIndex}`) || document.getElementById(`comments-${videoIndex}`);
    if (container && container.style.display !== 'none') renderComments(videoIndex, container);
    showToast(`✅ 回复成功！粉丝 +${gain}`, 'success', 2000);
    if (document.querySelector('.tab-btn.active')?.dataset.tab === 'data') renderDataPanel();
    advanceTimeSlot(); autoSaveGame(); checkSocialRequestsTrigger();
}

function renderDataPanel() {
    const container = (dom && dom.dataTab) || document.getElementById('dataTab');
    if (!container) return;
    ensureNpcIntegrity();
    const p = G.player;
    const s = p.skills || {};
    const totalViews = (p.videos || []).reduce((sum, v) => sum + (v.views || 0), 0);
    const skillNames = { building: '🏗️ 建筑', redstone: '🔧 红石', pvp: '⚔️ PvP', survival: '🌲 生存', hunting: '🏹 追杀' };
    
    let html = `
    <div class="data-grid">
        <div class="ditem"><div class="val">${p.followers || 0}</div><div class="lbl">❤️ 粉丝</div></div>
        <div class="ditem"><div class="val">${p.likes || 0}</div><div class="lbl">👍 累计点赞</div></div>
        <div class="ditem"><div class="val">💰 ${p.money || 0}</div><div class="lbl">游戏货币</div></div>
        <div class="ditem"><div class="val">${totalViews}</div><div class="lbl">👀 总观看</div></div>
    </div>
    <div style="font-size:15px;font-weight:700;color:var(--text);margin:6px 0 10px;">🎯 玩家技术属性</div>
    `;
    
    for (const [key, label] of Object.entries(skillNames)) {
        const val = s[key] || 0;
        html += `
        <div class="skill-bar-wrap">
            <div class="skill-row"><div class="sname">${label}</div><div class="track"><div class="fill" style="width:${val}%;"></div></div><div class="sval">${val}</div></div>
        </div>`;
    }
    
    html += `<div style="font-size:15px;font-weight:700;color:var(--text);margin:14px 0 10px;">🤖 通讯录角色关系</div>`;
    const npcEntries = Object.entries(G.npcs || {});
    if (npcEntries.length === 0) {
        html += `<div style="padding:14px;background:#fff;border-radius:10px;color:#888;font-size:13px;text-align:center;">暂无联系人。提升粉丝热度以引起各路主播的关注！</div>`;
    } else {
        for (const [id, npc] of npcEntries) {
            const ns = npc.skills || { building: 0, redstone: 0, pvp: 0, survival: 0, hunting: 0 };
            const avg = Math.round((ns.building + ns.redstone + ns.pvp + ns.survival + ns.hunting) / 5);
            const isLover = (G.player.lovers || []).includes(npc.name);
            const isBlocked = isAccountBlockedByNpc(id, 'main');
            html += `
            <div class="npc-card" onclick="openChat('${id}')">
                <div class="npc-info">
                    <div class="npc-name">${npc.avatarUrl ? `<img src="${npc.avatarUrl}" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;">` : (npc.avatarEmoji || '👤')} ${escapeHtml(npc.name)} ${isLover ? '💕' : ''} ${isBlocked ? '<span style="color:#e53935;font-size:11px;">[已拉黑大号]</span>' : ''}</div>
                    <div class="npc-desc">${npc.isCustom ? '自建好友' : `平均技术 ${avg}`} · 好感 ${npc.favor||0}</div>
                </div>
                <div style="font-size:11px;color:var(--text2);display:flex;gap:4px;flex-wrap:wrap;">
                    <span>🏗️${ns.building}</span> <span>🔧${ns.redstone}</span> <span>⚔️${ns.pvp}</span> <span>🌲${ns.survival}</span> <span>🏹${ns.hunting}</span>
                </div>
            </div>
            `;
        }
    }
    if (p.streamHistory && p.streamHistory.length > 0) {
        html += `<div style="font-size:15px;font-weight:700;color:var(--text);margin:14px 0 8px;">📺 直播历史</div>`;
        for (const rec of p.streamHistory.slice(-5).reverse()) {
            html += `
            <div style="background:var(--card);border-radius:12px;padding:10px;margin-bottom:8px;box-shadow:var(--shadow);border-left:3px solid var(--primary);">
                <div style="display:flex;justify-content:space-between;font-size:13px;flex-wrap:wrap;gap:4px;">
                    <span>📅 第${rec.day}天</span><span>👥 ${rec.maxViewers || rec.viewers || 0} 观众</span>
                    <span>💰 +${rec.moneyEarned || 0}</span><span>❤️ +${rec.fansGained || 0}</span>
                </div>
            </div>`;
        }
    }
    const nextMs = getNextMilestone();
    html += `
    <div style="background:var(--card);border-radius:12px;padding:10px;margin-top:10px;box-shadow:var(--shadow);border-left:3px solid var(--gold);">
        <div style="font-size:13px;color:var(--text2);">🎯 下一个里程碑：<strong>${nextMs}</strong></div>
    </div>`;
    container.innerHTML = html;
}

// ============================================================
// 记忆系统与账号管理
// ============================================================
if (!G.memoryConfig) G.memoryConfig = { enabled: true, defaultThreshold: 10, defaultKeepRecent: 5, selectedModelKey: '' };
if (!G.memorySummaries) G.memorySummaries = [];
if (!G.groupMemories) G.groupMemories = {};

function ensureNpcIntegrity() {
    if (!G.npcs) G.npcs = {};
    if (!G.chatHistory) G.chatHistory = {};
    for (const [id, npc] of Object.entries(G.npcs)) {
        if (!npc.id) npc.id = id;
        if (!npc.name) npc.name = id;
        if (npc.favor === undefined) npc.favor = 50;
        if (!npc.summaryThreshold) npc.summaryThreshold = 10;
        if (!npc.keepRecent) npc.keepRecent = 5;
    }
}

function getAvailableMemoryModels() {
    const list = [];
    if (G.aiProfiles && Array.isArray(G.aiProfiles) && G.aiProfiles.length) {
        G.aiProfiles.forEach(p => list.push({ key: 'profile_' + p.id, name: p.name || p.model, model: p.model, profile: p }));
    }
    if (G.ai && G.ai.model) list.push({ key: 'current_ai', name: `主模型 (${G.ai.model})`, model: G.ai.model, profile: G.ai });
    if (!list.length) list.push({ key: 'default_cheap', name: '便宜模型 (deepseek-chat)', model: 'deepseek-chat', profile: null });
    return list;
}

async function callMemoryAI(messages, options = {}) {
    const cfg = G.memoryConfig || {};
    let targetProfile = null;
    if (cfg.selectedModelKey) {
        const found = getAvailableMemoryModels().find(m => m.key === cfg.selectedModelKey);
        if (found && found.profile && found.profile.apiKey) targetProfile = found.profile;
    }
    if (targetProfile && targetProfile.baseUrl && targetProfile.apiKey) {
        const baseUrl = targetProfile.baseUrl.replace(/\/+$/, '');
        const resp = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${targetProfile.apiKey}` },
            body: JSON.stringify({
                model: targetProfile.model || 'deepseek-chat',
                messages,
                temperature: options.temperature !== undefined ? options.temperature : 0.35,
                max_tokens: options.maxTokens || 650
            })
        });
        if (!resp.ok) throw new Error(`记忆 API [${resp.status}]`);
        const data = await resp.json();
        return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    }
    return await callAI(messages, { temperature: options.temperature !== undefined ? options.temperature : 0.35, maxTokens: options.maxTokens || 650 });
}

function showMemoryFailNoticeModal(moduleName, errorMsg) {
    openModal(`
        <div style="text-align:center;padding:10px 0;">
            <div style="font-size:36px;margin-bottom:8px;">⚠️</div>
            <h3 style="color:#d32f2f;margin-bottom:6px;">自动记忆总结未完成</h3>
            <div style="font-size:13px;color:#555;margin:10px 0;background:#fff8f8;padding:10px 12px;border-radius:8px;text-align:left;">
                <div><b>失败模块：</b>${escapeHtml(moduleName)}</div>
                <div style="font-size:11px;color:#888;margin-top:4px;"><b>原因提示：</b>${escapeHtml(errorMsg || '网络异常')}</div>
            </div>
            <div class="btn-row"><button class="btn-primary" onclick="closeModal()" style="width:100%;">我知道了，关闭提示</button></div>
        </div>
    `);
}

function addGlobalMemoryRecord(text) {
    if (!text) return;
    if (!G.memorySummaries) G.memorySummaries = [];
    G.memorySummaries.push({ id: 'gm_' + Date.now() + '_' + rand(100, 999), day: G.day, text: text.trim(), time: new Date().toLocaleTimeString().slice(0, 5) });
}

function getChatStorageKey(npcId, accId = null) {
    return `${accId || G.currentAccountId || 'main'}_${npcId}`;
}

function getAccountChatHistory(npcId, accId = null) {
    if (!G.chatHistory) G.chatHistory = {};
    const key = getChatStorageKey(npcId, accId);
    if (!G.chatHistory[key]) {
        const targetAcc = accId || G.currentAccountId || 'main';
        if (targetAcc === 'main' && Array.isArray(G.chatHistory[npcId])) G.chatHistory[key] = G.chatHistory[npcId];
        else G.chatHistory[key] = [];
    }
    return G.chatHistory[key];
}

function pushChatMessageSafe(npcId, msgObj, accId = null) {
    if (!msgObj._id) msgObj._id = 'cmsg_' + Date.now() + '_' + rand(1000, 9999);
    getAccountChatHistory(npcId, accId).push(msgObj);
}

if (!G.currentAccountId) G.currentAccountId = 'main';
if (!G.altAccounts) G.altAccounts = [];
if (!G.blockedRecords) G.blockedRecords = [];

function isAccountBlockedByNpc(npcId, accId = null) {
    const curAcc = accId || G.currentAccountId || 'main';
    const token = `${npcId}_${curAcc}`;
    if (curAcc === 'main' && Array.isArray(G.blockedNpcs) && G.blockedNpcs.includes(npcId)) return true;
    return (G.blockedRecords || []).includes(token);
}

function setNpcBlockAccount(npcId, accId, block = true) {
    if (!G.blockedRecords) G.blockedRecords = [];
    const token = `${npcId}_${accId}`;
    if (block) {
        if (!G.blockedRecords.includes(token)) G.blockedRecords.push(token);
        if (accId === 'main') {
            if (!G.blockedNpcs) G.blockedNpcs = [];
            if (!G.blockedNpcs.includes(npcId)) G.blockedNpcs.push(npcId);
        }
    } else {
        G.blockedRecords = G.blockedRecords.filter(t => t !== token);
        if (accId === 'main' && G.blockedNpcs) G.blockedNpcs = G.blockedNpcs.filter(id => id !== npcId);
    }
}

function getActiveAccountInfo() {
    if (G.currentAccountId === 'main' || !G.currentAccountId) {
        return { id: 'main', isAlt: false, name: G.player.ytName || '主播大号', avatar: G.player.avatar || null, bio: 'YouTube 频道官方号' };
    }
    const found = (G.altAccounts || []).find(a => a.id === G.currentAccountId);
    if (found) return { id: found.id, isAlt: true, name: found.name, avatar: found.avatar || null, bio: found.bio || '私密小号' };
    return { id: 'main', isAlt: false, name: G.player.ytName || '主播大号', avatar: G.player.avatar, bio: '' };
}

function switchAccount(accId) {
    G.currentAccountId = accId;
    showToast(`🔀 已切换账号为：${getActiveAccountInfo().name}`, 'info', 1800);
    renderSocialPanel();
    autoSaveGame();
}

function openAccountManagerModal() {
    const currentId = G.currentAccountId || 'main';
    let altsHtml = '';
    (G.altAccounts || []).forEach(alt => {
        altsHtml += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f8faf8;border-radius:8px;margin-bottom:6px;border:1px solid #e2ece2;">
            <div style="display:flex;align-items:center;gap:8px;">
                <div style="font-size:20px;">${alt.avatar ? `<img src="${alt.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : '🎭'}</div>
                <div>
                    <div style="font-weight:700;font-size:13px;">${escapeHtml(alt.name)} <span style="font-size:10px;color:#2e7d32;background:#e8f5e9;padding:1px 4px;border-radius:4px;">小号</span></div>
                    <div style="font-size:10px;color:#888;">${escapeHtml(alt.bio || '无简介')}</div>
                </div>
            </div>
            <div style="display:flex;gap:6px;">
                ${currentId === alt.id ? '<span style="font-size:11px;color:#2e7d32;font-weight:700;padding:4px 6px;">● 当前使用</span>' : `<button class="upload-btn" onclick="switchAccount('${alt.id}');closeModal();" style="padding:4px 8px;font-size:11px;">使用</button>`}
                <button class="upload-btn" onclick="deleteAltAccount('${alt.id}')" style="padding:4px 6px;font-size:11px;background:#e53935;">🗑️</button>
            </div>
        </div>`;
    });

    openModal(`
        <h3>🎭 账号中心与快速切换</h3>
        <div style="margin:10px 0;border:1px solid #eee;border-radius:10px;padding:10px;background:#fff;">
            <div style="font-weight:700;font-size:13px;margin-bottom:8px;">👑 主播官方大号</div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f0f8f0;border-radius:8px;border:1px solid #d0ebd0;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="font-size:20px;">${G.player.avatar ? `<img src="${G.player.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : '👑'}</div>
                    <div>
                        <div style="font-weight:700;font-size:13px;">${escapeHtml(G.player.ytName)} <span style="font-size:10px;color:#fff;background:var(--primary);padding:1px 6px;border-radius:4px;">大号</span></div>
                    </div>
                </div>
                ${currentId === 'main' ? '<span style="font-size:11px;color:#2e7d32;font-weight:700;padding:4px 6px;">● 当前使用</span>' : `<button class="upload-btn" onclick="switchAccount('main');closeModal();" style="padding:4px 8px;font-size:11px;">使用</button>`}
            </div>
            <div style="font-weight:700;font-size:13px;margin:12px 0 6px;">🎭 注册的小号列表</div>
            ${altsHtml || '<div style="font-size:12px;color:#999;padding:6px 0;">暂无小号，点击下方注册全新马甲</div>'}
        </div>
        <div class="btn-row" style="flex-direction:column;gap:8px;">
            <button class="btn-primary" id="btnRegisterNewAlt" style="width:100%;">➕ 注册新的自定义小号</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">关闭</button>
        </div>
    `);

    document.getElementById('btnRegisterNewAlt').onclick = () => { closeModal(); openCreateAltAccountModal(); };
}

function openCreateAltAccountModal() {
    openModal(`
        <h3>➕ 注册自定义小号</h3>
        <div class="form-group"><label>小号名称 / ID <span class="required">*</span></label><input type="text" id="altNameInput" placeholder="如：路过的红石学徒"></div>
        <div class="form-group"><label>小号个性签名</label><input type="text" id="altBioInput" placeholder="如：热爱MC建筑..."></div>
        <div class="btn-row"><button class="btn-secondary" onclick="openAccountManagerModal()">返回</button><button class="btn-primary" id="btnConfirmCreateAlt">完成注册并登录</button></div>
    `);
    document.getElementById('btnConfirmCreateAlt').onclick = () => {
        const name = document.getElementById('altNameInput').value.trim();
        if (!name) { showToast('⚠️ 请填写小号名称', 'error'); return; }
        if (!G.altAccounts) G.altAccounts = [];
        const newAlt = { id: 'alt_' + Date.now(), name, bio: document.getElementById('altBioInput').value.trim() || '路人小号', avatar: null, createdAt: G.day };
        G.altAccounts.push(newAlt); G.currentAccountId = newAlt.id;
        showToast(`🎉 小号「${name}」注册成功！`, 'success', 2500);
        closeModal(); renderSocialPanel(); autoSaveGame();
    };
}

function deleteAltAccount(altId) {
    if (!confirm('确定要注销这个小号吗？')) return;
    G.altAccounts = (G.altAccounts || []).filter(a => a.id !== altId);
    if (G.currentAccountId === altId) G.currentAccountId = 'main';
    showToast('🗑️ 小号已注销', 'info');
    openAccountManagerModal(); autoSaveGame();
}

function checkSocialRequestsTrigger() {
    if (typeof OFFICIAL_NPCS === 'undefined') return;
    if (!G.friendRequests) G.friendRequests = [];
    if (!G.groupInvites) G.groupInvites = [];
    const followers = G.player.followers || 0;

    for (const [id, npc] of Object.entries(OFFICIAL_NPCS)) {
        if (G.npcs[id] || G.friendRequests.some(r => r.npcOfficialId === id || r.name === npc.name)) continue;
        const threshold = npc.minFollowers || 5000;
        if (followers >= threshold && Math.random() < (followers > threshold * 2 ? 0.8 : 0.45)) {
            G.friendRequests.push({ _id: 'freq_' + id + '_' + Date.now(), npcOfficialId: id, name: npc.name, fromReason: `关注到你的作品`, persona: npc.persona, avatarEmoji: npc.avatarEmoji || '👤', avatarUrl: null, day: G.day });
            showToast(`📬 顶级主播「${npc.name}」向你发来了好友申请！`, 'success', 3500);
            addGlobalMemoryRecord(`【社交突破】：知名MC主播「${npc.name}」关注到主角，主动递来好友申请。`);
        }
    }

    if (followers >= 5000 && !G.groups['fan_club_1'] && !G.groupInvites.some(gi => gi.gid === 'fan_club_1')) {
        G.groupInvites.push({ _id: 'ginv_' + Date.now(), gid: 'fan_club_1', name: '🎉 主播后援会 1 号群', desc: '由核心粉丝自发的专属后援讨论基地！', avatarEmoji: '👑', inviter: '狂热铁粉' });
        showToast('👥 收到粉丝自建后援群的加入邀请！', 'info', 3000);
    }
}
window.checkSocialRequestsTrigger = checkSocialRequestsTrigger;

function detectPlayerTimezoneInfo() {
    const p = ((G.player && G.player.persona) || '').toLowerCase() + ' ' + ((G.player && G.player.skin) || '').toLowerCase();
    let country = '中国 (东八区)'; let region = 'CN';
    if (p.includes('美国') || p.includes('usa') || p.includes('洛杉矶')) { country = '美国 (北美时区)'; region = 'US'; }
    else if (p.includes('加拿大') || p.includes('canada')) { country = '加拿大 (北美时区)'; region = 'CA'; }
    else if (p.includes('英国') || p.includes('uk')) { country = '英国 (欧洲时区)'; region = 'UK'; }
    return { country, region, slotName: getTimeSlotName(G.timeSlot), day: G.day };
}

function formatNpcTimezoneContext() {
    const pTz = detectPlayerTimezoneInfo();
    return `\n【时差上下文】：玩家当前所在地：${pTz.country}，当前时段：第 ${pTz.day} 天【${pTz.slotName}】。请自然体现真实时差反应（如熬夜、刚起等）。\n`;
}

// ============================================================
// ➕ 自建角色 / 自建群聊完整逻辑（补齐丢失的函数）
// ============================================================
function openAddChatTargetModal() {
    const requests = G.friendRequests || [];
    const groupInvs = G.groupInvites || [];

    let requestsHtml = '';
    if (!requests.length) {
        requestsHtml = `<div style="font-size:12px;color:#999;padding:6px 0;">暂无好友申请（随粉丝热度增长会有主播与粉丝递来申请）</div>`;
    } else {
        requestsHtml = requests.map(r => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#f9fbf9;border-radius:8px;margin-bottom:6px;border:1px solid #eef2ee;">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                    ${renderAvatarBadge(r, 34)}
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;font-size:13px;">${escapeHtml(r.name)} <span style="font-size:10px;color:#2e7d32;background:#e8f5e9;padding:1px 4px;border-radius:4px;">${escapeHtml(r.fromReason||'申请')}</span></div>
                        <div style="font-size:11px;color:#777;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(r.persona||'')}</div>
                    </div>
                </div>
                <div style="display:flex;gap:4px;margin-left:8px;">
                    <button class="upload-btn" onclick="handleFriendRequestAction('${r._id}', true)" style="padding:3px 8px;font-size:11px;">✅ 同意</button>
                    <button class="upload-btn" onclick="handleFriendRequestAction('${r._id}', false)" style="padding:3px 8px;font-size:11px;background:#c62828;">❌ 忽略</button>
                </div>
            </div>
        `).join('');
    }

    let groupInvsHtml = '';
    if (groupInvs.length > 0) {
        groupInvsHtml = `
        <div style="font-size:13px;font-weight:700;margin:12px 0 6px;color:#1565c0;display:flex;justify-content:space-between;">
            <span>📬 群聊加入邀请</span>
            <span style="font-size:10px;background:#e3f2fd;color:#1565c0;padding:1px 6px;border-radius:10px;">${groupInvs.length}个新邀请</span>
        </div>` + groupInvs.map(inv => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#f8fbff;border-radius:8px;margin-bottom:6px;border:1px solid #ddecfa;">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                    <div style="font-size:22px;">${inv.avatarEmoji || '👥'}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;font-size:13px;">${escapeHtml(inv.name)}</div>
                        <div style="font-size:11px;color:#666;">${escapeHtml(inv.desc || '')}</div>
                    </div>
                </div>
                <div style="display:flex;gap:4px;margin-left:8px;">
                    <button class="upload-btn" onclick="handleGroupInviteAction('${inv._id}', true)" style="padding:3px 8px;font-size:11px;background:#1565c0;">✅ 加入</button>
                    <button class="upload-btn" onclick="handleGroupInviteAction('${inv._id}', false)" style="padding:3px 8px;font-size:11px;background:#757575;">忽略</button>
                </div>
            </div>
        `).join('');
    }

    openModal(`
        <h3>➕ 社交中心与添加联系人</h3>
        <div style="margin:10px 0 12px;border:1px solid #eee;border-radius:10px;padding:10px;background:#fff;">
            <div style="font-size:13px;font-weight:700;margin-bottom:6px;color:var(--primary);display:flex;align-items:center;justify-content:space-between;">
                <span>📬 主播与好友申请列表</span>
                ${requests.length ? `<span style="background:#ff4757;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;">${requests.length}条新申请</span>` : ''}
            </div>
            ${requestsHtml}
            ${groupInvsHtml}
        </div>
        <div class="btn-row" style="flex-direction:column;gap:8px;">
            <button class="btn-primary" id="btnNewCustomNPC" style="width:100%;">👤 自建新角色 / 粉丝</button>
            <button class="btn-primary" id="btnNewGroup" style="width:100%;background:#3866c4;">👥 自建新群聊</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">关闭</button>
        </div>
    `);

    document.getElementById('btnNewCustomNPC').onclick = () => { closeModal(); openCreateCustomNpcModal(); };
    document.getElementById('btnNewGroup').onclick = () => { closeModal(); openCreateGroupModal(); };
}

function openCreateCustomNpcModal() {
    openModal(`
        <h3>👤 自建新角色联系人</h3>
        <div class="form-group"><label>角色姓名 <span class="required">*</span></label><input type="text" id="newNpcNameInput" placeholder="例如：Skeppy / 某位主播好友..."></div>
        <div class="form-group"><label>性格人设特征 (Prompt) <span class="required">*</span></label><textarea id="newNpcPersonaInput" rows="3" placeholder="例如：脾气火爆但非常重义气，热爱恶作剧整蛊，说话语速极快..."></textarea></div>
        <div class="form-group"><label>外貌/皮肤外观</label><input type="text" id="newNpcSkinInput" placeholder="例如：红色鸭舌帽与黑色连帽卫衣..."></div>
        <div class="btn-row"><button class="btn-secondary" onclick="openAddChatTargetModal()">返回</button><button class="btn-primary" id="btnConfirmCreateNpc">完成添加</button></div>
    `);

    document.getElementById('btnConfirmCreateNpc').onclick = () => {
        const name = document.getElementById('newNpcNameInput').value.trim();
        const persona = document.getElementById('newNpcPersonaInput').value.trim();
        const skin = document.getElementById('newNpcSkinInput').value.trim();
        if (!name || !persona) { showToast('⚠️ 角色姓名与人设不能为空', 'error'); return; }
        const npcId = 'custom_' + Date.now();
        if (!window.G.npcs) window.G.npcs = {};
        window.G.npcs[npcId] = {
            id: npcId,
            name,
            gender: '男',
            persona,
            skin: skin || '经典主播装扮',
            favor: 30,
            avatarEmoji: '👤',
            avatarUrl: null,
            isCustom: true,
            summaryThreshold: 10,
            keepRecent: 5
        };
        closeModal();
        showToast(`🎉 成功添加新联系人「${name}」！`, 'success', 2500);
        renderSocialPanel();
        autoSaveGame();
    };
}

function openCreateGroupModal() {
    const npcs = Object.values(window.G.npcs || {});
    if (!npcs.length) { showToast('请先结识好友后再创建群聊', 'error'); return; }
    const memberBoxes = npcs.map(n => `
        <label style="display:inline-flex;align-items:center;gap:4px;font-size:12.5px;background:#f8faf8;padding:4px 8px;border-radius:12px;margin:3px;border:1px solid #e0ebe0;cursor:pointer;">
            <input type="checkbox" class="create-group-member-check" value="${n.id}" checked>
            <span>${n.avatarEmoji || '👤'} ${escapeHtml(n.name)}</span>
        </label>
    `).join('');

    openModal(`
        <h3>👥 建立新的群聊</h3>
        <div class="form-group"><label>群聊名称 <span class="required">*</span></label><input type="text" id="newGroupNameInput" placeholder="例如：周末联机整蛊小分队..."></div>
        <div class="form-group"><label>群简介 (选填)</label><input type="text" id="newGroupDescInput" placeholder="描述这个群的日常氛围与话题..."></div>
        <div class="form-group"><label>拉入群聊的好友：</label><div style="max-height:160px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:2px;padding:6px;border:1px solid #eee;border-radius:8px;">${memberBoxes}</div></div>
        <div class="btn-row"><button class="btn-secondary" onclick="openAddChatTargetModal()">返回</button><button class="btn-primary" id="btnConfirmCreateGroup">创建群聊</button></div>
    `);

    document.getElementById('btnConfirmCreateGroup').onclick = () => {
        const name = document.getElementById('newGroupNameInput').value.trim();
        const desc = document.getElementById('newGroupDescInput').value.trim();
        const memberIds = Array.from(document.querySelectorAll('.create-group-member-check:checked')).map(c => c.value);
        if (!name || !memberIds.length) { showToast('⚠️ 名称与成员均不可为空', 'error'); return; }
        const gid = 'grp_' + Date.now();
        if (!window.G.groups) window.G.groups = {};
        window.G.groups[gid] = {
            id: gid,
            name,
            desc: desc || '日常探讨与开播分享',
            avatarEmoji: '👥',
            members: memberIds,
            activeMembers: memberIds,
            streamerMode: 'unified',
            summaryThreshold: 10,
            keepRecent: 5
        };
        if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
        window.G.groupChatHistory[gid] = [{
            _id: 'ginit_' + Date.now(),
            from: 'action',
            text: `群聊「${name}」已创建。`,
            time: new Date().toLocaleTimeString().slice(0, 5)
        }];
        closeModal();
        showToast(`🎉 群聊「${name}」创建成功！`, 'success', 2500);
        window.G.chatActiveTab = 'group';
        renderSocialPanel();
        autoSaveGame();
    };
}

function handleFriendRequestAction(reqId, accept) {
    const idx = (G.friendRequests || []).findIndex(r => r._id === reqId);
    if (idx === -1) return;
    const req = G.friendRequests[idx];
    G.friendRequests.splice(idx, 1);

    if (accept) {
        let id = req.npcOfficialId || ('custom_npc_' + Date.now());
        let npcData = null;
        if (req.npcOfficialId && typeof OFFICIAL_NPCS !== 'undefined' && OFFICIAL_NPCS[req.npcOfficialId]) {
            npcData = Object.assign({}, OFFICIAL_NPCS[req.npcOfficialId]);
            npcData.favor = 40; npcData.summaryThreshold = 10; npcData.keepRecent = 5;
        } else {
            npcData = { id, name: req.name, avatarEmoji: req.avatarEmoji || '👤', avatarUrl: req.avatarUrl || null, persona: req.persona || '一位热心好友', favor: 40, isCustom: true, summaryThreshold: 10, keepRecent: 5 };
        }
        G.npcs[id] = npcData;
        showToast(`🎉 已添加「${req.name}」为好友！`, 'success', 2500);
        appendStory(`🤝 你通过了「${req.name}」的好友申请，双方正式添加为好友。`, '🤝 新增好友');
        addGlobalMemoryRecord(`【结识好友】：添加了新好友「${req.name}」（${req.fromReason || '社交申请'}）。`);
    } else {
        showToast(`已婉拒 ${req.name} 的好友申请`, 'info', 1500);
    }
    autoSaveGame();
    closeModal();
    renderSocialPanel();
}
window.handleFriendRequestAction = handleFriendRequestAction;

function handleGroupInviteAction(invId, accept) {
    const idx = (G.groupInvites || []).findIndex(i => i._id === invId);
    if (idx === -1) return;
    const inv = G.groupInvites[idx];
    G.groupInvites.splice(idx, 1);

    if (accept) {
        const gid = inv.gid || ('grp_' + Date.now());
        G.groups[gid] = { id: gid, name: inv.name, avatarEmoji: inv.avatarEmoji || '👥', avatarUrl: '', desc: inv.desc || '粉丝后援群聊', members: Object.keys(G.npcs).slice(0, 4), activeMembers: Object.keys(G.npcs).slice(0, 4), streamerMode: 'unified', summaryThreshold: 10, keepRecent: 5 };
        if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
        showToast(`🎉 成功加入群聊「${inv.name}」！`, 'success', 2500);
        appendStory(`👥 你接受了邀请，成功加入了群聊「${inv.name}」。`, '👥 加入群聊');
    } else {
        showToast(`已婉拒群邀请`, 'info', 1500);
    }
    autoSaveGame();
    closeModal();
    renderSocialPanel();
}
window.handleGroupInviteAction = handleGroupInviteAction;

function openEditNpcModal(npcId) {
    const isNew = !npcId;
    const npc = !isNew ? G.npcs[npcId] : { name: '', avatarEmoji: '👤', avatarUrl: '', persona: '', favor: 50, isCustom: true, summaryThreshold: 10, keepRecent: 5 };
    
    openModal(`
        <h3>${isNew ? '👤 新建角色 / 粉丝' : `✏️ 编辑角色：${escapeHtml(npc.name)}`}</h3>
        <div class="form-group"><label>角色姓名</label><input type="text" id="npcNameInput" value="${escapeHtml(npc.name)}" placeholder="如：铁粉小明 / 主播Alex"></div>
        <div class="form-group">
            <label>头像设置（Emoji 或 图片 URL）</label>
            <div style="display:flex;gap:6px;"><input type="text" id="npcEmojiInput" value="${escapeHtml(npc.avatarEmoji || '👤')}" style="width:70px;text-align:center;"><input type="text" id="npcAvatarUrlInput" value="${escapeHtml(npc.avatarUrl || '')}" placeholder="图片 URL" style="flex:1;"></div>
        </div>
        <div class="form-group"><label>角色人设设定</label><textarea id="npcPersonaInput" rows="3">${escapeHtml(npc.persona || '')}</textarea></div>
        <div style="display:flex;gap:10px;">
            <div class="form-group" style="flex:1;"><label>🧠 触发总结轮数</label><input type="number" id="npcThresholdInput" value="${npc.summaryThreshold || 10}"></div>
            <div class="form-group" style="flex:1;"><label>💬 保留最近轮数</label><input type="number" id="npcKeepRecentInput" value="${npc.keepRecent || 5}"></div>
        </div>
        <div class="btn-row" style="margin-top:12px;">
            ${!isNew && npc.isCustom ? `<button class="btn-secondary" id="delNpcBtn" style="color:#e53935;">🗑️ 删除角色</button>` : ''}
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="saveNpcBtn">💾 保存</button>
        </div>
    `);

    document.getElementById('saveNpcBtn').onclick = () => {
        const name = document.getElementById('npcNameInput').value.trim();
        if (!name) { showToast('⚠️ 角色姓名不能为空', 'error'); return; }
        const id = isNew ? ('custom_npc_' + Date.now()) : npcId;
        G.npcs[id] = {
            ...npc,
            id,
            name,
            avatarEmoji: document.getElementById('npcEmojiInput').value.trim() || '👤',
            avatarUrl: document.getElementById('npcAvatarUrlInput').value.trim() || null,
            persona: document.getElementById('npcPersonaInput').value.trim() || '普通朋友',
            summaryThreshold: parseInt(document.getElementById('npcThresholdInput').value) || 10,
            keepRecent: parseInt(document.getElementById('npcKeepRecentInput').value) || 5,
            isCustom: true
        };
        showToast('✅ 角色信息已保存', 'success');
        closeModal();
        renderSocialPanel();
        autoSaveGame();
    };

    document.getElementById('delNpcBtn')?.addEventListener('click', () => {
        delete G.npcs[npcId];
        showToast('🗑️ 已删除该角色', 'success');
        closeModal();
        renderSocialPanel();
        autoSaveGame();
    });
}

function openGroupSettingsModal(gid) {
    const grp = G.groups[gid];
    if (!grp) return;
    let memberCheckboxes = '';
    Object.keys(G.npcs || {}).forEach(nid => {
        const n = G.npcs[nid];
        const isMember = (grp.members || []).includes(nid);
        memberCheckboxes += `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;">
            <label style="font-size:13px;display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" class="grp-mem-check" data-id="${nid}" ${isMember ? 'checked' : ''}>
                <span>${n.avatarEmoji || '👤'} ${escapeHtml(n.name)}</span>
            </label>
        </div>`;
    });

    openModal(`
        <h3>⚙️ 群管理：${escapeHtml(grp.name)}</h3>
        <div style="font-size:13px;font-weight:700;margin-bottom:6px;">👥 成员勾选与接话配置</div>
        <div style="max-height:180px;overflow-y:auto;border:1px solid #eee;border-radius:8px;padding:4px 10px;">${memberCheckboxes}</div>
        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" id="delGroupBtn" style="color:#e53935;">🗑️ 解散群聊</button>
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="saveGroupSettingsBtn">💾 保存设置</button>
        </div>
    `);

    document.getElementById('saveGroupSettingsBtn').onclick = () => {
        const mems = Array.from(document.querySelectorAll('.grp-mem-check:checked')).map(c => c.dataset.id);
        grp.members = mems.length ? mems : Object.keys(G.npcs).slice(0, 3);
        grp.activeMembers = grp.members;
        showToast('✅ 群设置已保存', 'success');
        closeModal();
        renderSocialPanel();
        autoSaveGame();
    };

    document.getElementById('delGroupBtn').onclick = () => {
        delete G.groups[gid];
        delete G.groupChatHistory[gid];
        delete G.groupMemories[gid];
        showToast('🗑️ 已解散群聊', 'success');
        closeModal();
        closeGroupChat();
        autoSaveGame();
    };
}

// ============================================================
// 🎨 表情包抽屉逻辑（彻底修复显示高度，防止被顶出屏幕）
// ============================================================
function buildStickerDrawerHTML() {
    ensureStickersLoaded();
    const cats = window.G.stickerCategories || ['猪猪', '默认'];
    const activeCat = window.G.activeStickerCategory || cats[0];
    const stickers = (window.G.stickerLibrary || []).filter(s => s.category === activeCat);

    let tabsHtml = cats.map(c => `
        <button class="stk-tab-btn ${c === activeCat ? 'active' : ''}" data-cat="${escapeHtml(c)}" style="padding:4px 9px;font-size:11px;font-weight:700;border:1px solid ${c === activeCat ? 'var(--primary)' : '#ccc'};border-radius:6px;background:${c === activeCat ? '#eaf5ea' : '#fff'};color:${c === activeCat ? 'var(--primary)' : '#555'};cursor:pointer;white-space:nowrap;">
            ${escapeHtml(c)}
        </button>
    `).join('');

    let gridHtml = `
        <div class="stk-item-card" id="btnAddStickerTrigger" style="height:62px;border:1.5px dashed #aaa;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;background:#fafafa;">
            <span style="font-size:20px;color:#888;">➕</span>
            <span style="font-size:9.5px;color:#888;margin-top:2px;">添加</span>
        </div>
    `;

    stickers.forEach((stk) => {
        gridHtml += `
        <div class="stk-item-card stk-send-btn" data-url="${escapeHtml(stk.url)}" data-desc="${escapeHtml(stk.desc)}" style="height:62px;border:1px solid #e0e0e0;border-radius:6px;padding:2px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;cursor:pointer;background:#fff;overflow:hidden;" title="${escapeHtml(stk.desc)}">
            <img src="${stk.url}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">
        </div>
        `;
    });

    return `
    <div id="stickerDrawerContainer" style="background:#f4f6f4;border-top:1px solid #ddd;padding:6px 8px;height:165px;display:flex;flex-direction:column;box-sizing:border-box;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:5px;overflow-x:auto;padding-bottom:5px;border-bottom:1px solid #e2e8e2;flex-shrink:0;">
            ${tabsHtml}
        </div>
        <div style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(52px, 1fr));gap:6px;padding-top:6px;">
            ${gridHtml}
        </div>
    </div>
    `;
}

function bindStickerDrawerEvents(targetType, targetId) {
    const drawer = document.getElementById('stickerDrawerContainer');
    if (!drawer) return;
    drawer.querySelectorAll('.stk-tab-btn').forEach(btn => {
        btn.onclick = () => {
            window.G.activeStickerCategory = btn.dataset.cat;
            if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
            else renderGroupChatWindow(document.getElementById('socialTab'));
        };
    });
    document.getElementById('btnAddStickerTrigger')?.addEventListener('click', () => openImportStickersModal(targetType, targetId));
    drawer.querySelectorAll('.stk-send-btn').forEach(btn => {
        btn.onclick = () => {
            sendStickerMessage(targetType, targetId, { desc: btn.dataset.desc, url: btn.dataset.url });
        };
    });
}

function openImportStickersModal(targetType, targetId) {
    const curCat = window.G.activeStickerCategory || '猪猪';
    openModal(`
        <h3>🖼️ 导入表情包到「${escapeHtml(curCat)}」</h3>
        <p style="font-size:12px;color:#666;line-height:1.5;">支持批量导入。格式：<br><b style="color:#2e7d32;">表情描述——图床链接</b>（每行一个）</p>
        <div class="form-group"><textarea id="importStickerBatchInput" rows="6" placeholder="这只可爱的小猪就是我呀——https://imgbed.heliar.top/i/QZNPVIKLzB8DiDL-.jpg" style="width:100%;padding:8px;font-size:12px;"></textarea></div>
        <div class="btn-row"><button class="btn-secondary" onclick="closeModal()">取消</button><button class="btn-primary" id="btnConfirmBatchImport">批量导入</button></div>
    `);
    document.getElementById('btnConfirmBatchImport').onclick = () => {
        const raw = document.getElementById('importStickerBatchInput').value.trim();
        if (!raw) return;
        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
        let count = 0;
        if (!window.G.stickerLibrary) window.G.stickerLibrary = [];
        for (const line of lines) {
            if (line.includes('——')) {
                const parts = line.split('——');
                const desc = parts[0].trim();
                const url = parts.slice(1).join('——').trim();
                if (url.startsWith('http')) {
                    window.G.stickerLibrary.push({ category: curCat, desc, url });
                    count++;
                }
            }
        }
        showToast(`🎉 导入 ${count} 个表情！`, 'success', 2000);
        closeModal();
        if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
        else renderGroupChatWindow(document.getElementById('socialTab'));
        autoSaveGame();
    };
}

function sendStickerMessage(targetType, targetId, stickerObj) {
    const curAcc = getActiveAccountInfo();
    const msg = {
        _id: 'cstk_' + Date.now() + '_' + rand(100, 999),
        from: 'player',
        senderAccount: curAcc.name,
        sticker: stickerObj,
        text: `[表情: ${stickerObj.desc}]`,
        time: new Date().toLocaleTimeString().slice(0, 5)
    };
    if (targetType === 'single') {
        pushChatMessageSafe(targetId, msg);
        renderSingleChatWindow(document.getElementById('socialTab'));
    } else {
        if (!window.G.groupChatHistory[targetId]) window.G.groupChatHistory[targetId] = [];
        window.G.groupChatHistory[targetId].push(msg);
        renderGroupChatWindow(document.getElementById('socialTab'));
    }
    autoSaveGame();
}

function openClockSettingsModal() {
    const cfg = G.clockConfig || { mode: 'game', customCountry: '中国 (东八区)', customTimeStr: '' };
    const curTz = detectPlayerTimezoneInfo();
    openModal(`
        <h3>🕒 游戏时钟与时区管理</h3>
        <p style="font-size:12px;color:#666;">当前推导时区：<b>${curTz.country}</b> · <b>${curTz.slotName}</b></p>
        <div class="form-group"><label>身处的国家/地区：</label><input type="text" id="customCountryInput" value="${escapeHtml(cfg.customCountry || '中国 (东八区)')}"></div>
        <div class="btn-row"><button class="btn-secondary" onclick="closeModal()">取消</button><button class="btn-primary" id="btnSaveClockSettings">💾 保存时区</button></div>
    `);
    document.getElementById('btnSaveClockSettings').onclick = () => {
        window.G.clockConfig = { customCountry: document.getElementById('customCountryInput').value.trim() || '中国 (东八区)' };
        showToast('✅ 时钟时区设置已更新！', 'success', 1500);
        closeModal(); autoSaveGame();
    };
}

function renderMemoir() {
    const container = (dom && dom.memoirTab) || document.getElementById('memoirTab');
    if (!container) return;
    if ((G.memoir || []).length === 0) {
        container.innerHTML = `<div style="text-align:center;color:var(--text2);padding:30px 0;">还没有记录，开始你的主播生涯吧！</div>`; return;
    }
    let html = `<div style="font-weight:700;font-size:17px;margin-bottom:10px;">📜 回忆录</div><div class="timeline">`;
    [...G.memoir].reverse().forEach(e => {
        html += `<div class="timeline-item"><span class="date">📅 第${e.day}天</span><strong>${escapeHtml(e.event)}</strong>${e.details ? ` -- ${escapeHtml(e.details)}` : ''}<span style="font-size:10px;color:var(--text2);display:block;margin-top:2px;">${e.timestamp}</span></div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function jumpToMomentCard(momentId) {
    window.G.currentChatNpc = null; window.G.phoneNav = 'moments'; window.G.momentsFilterNpcId = null; renderSocialPanel();
    setTimeout(() => {
        const card = document.querySelector(`.moment-card[data-id="${momentId}"]`);
        if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }, 150);
}

// 暴露全部全局函数（保障跨文件调用绝不报错）
window.renderSocialPanel = renderSocialPanel;
window.openChat = openChat;
window.closeChat = closeChat;
window.openGroupChat = openGroupChat;
window.closeGroupChat = closeGroupChat;
window.openAccountManagerModal = openAccountManagerModal;
window.switchAccount = switchAccount;
window.receiveFriendRequest = receiveFriendRequest;
window.deleteAltAccount = deleteAltAccount;
window.showMessageActionSheet = showMessageActionSheet;
window.triggerGenerateFriendsFeed = triggerGenerateFriendsFeed;
window.detectPlayerTimezoneInfo = detectPlayerTimezoneInfo;
window.formatNpcTimezoneContext = formatNpcTimezoneContext;
window.jumpToMomentCard = jumpToMomentCard;
window.openClockSettingsModal = openClockSettingsModal;
window.renderMemoir = renderMemoir;
window.openAddChatTargetModal = openAddChatTargetModal;
window.openCreateCustomNpcModal = openCreateCustomNpcModal;
window.openCreateGroupModal = openCreateGroupModal;
window.openEditNpcModal = openEditNpcModal;
window.openGroupSettingsModal = openGroupSettingsModal;
window.openNpcProfileCardModal = openNpcProfileCardModal;
window.handleFriendRequestAction = handleFriendRequestAction;
window.handleGroupInviteAction = handleGroupInviteAction;
window.toggleCollection = toggleCollection;
window.toggleColVideoComments = toggleColVideoComments;
window.acceptSponsor = acceptSponsor;
window.checkSocialRequestsTrigger = checkSocialRequestsTrigger;