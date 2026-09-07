// js/04-game-core-2.js
// 成就系统、商店、数据面板、手机社交(多模态识图、时差推导、朋友圈互怼吃醋、私聊动态贯通、微信式连发)
// ============================================================

// 🐷 内置默认表情包源数据（强制初始化保全机制）
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
    if (!window.G.stickerCategories || !Array.isArray(window.G.stickerCategories)) window.G.stickerCategories = ['猪猪', '默认'];
    if (!window.G.stickerCategories.includes('猪猪')) window.G.stickerCategories.unshift('猪猪');
    if (!window.G.activeStickerCategory) window.G.activeStickerCategory = '猪猪';
    if (!window.G.stickerLibrary || !Array.isArray(window.G.stickerLibrary)) window.G.stickerLibrary = [];
    const hasPigStickers = window.G.stickerLibrary.some(s => s && s.category === '猪猪');
    if (!hasPigStickers) window.G.stickerLibrary.push(...DEFAULT_PIG_STICKERS);
}
ensureStickersLoaded();

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
// 赞助商与商店
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
        // WebView 内 Modal 里的 click 也是正常生效的，但在页面中推荐用原生 listener
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
// 频道面板与数据面板
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
// 记忆系统与账号拉黑系统
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
    const mainAcc = { name: G.player.ytName, id: 'main' };
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
        <p style="font-size:12px;color:#666;line-height:1.6;">每个账号拥有完全独立的私聊记录。某个小号被拉黑后，可继续注册新小号联系求情转圜！</p>
        
        <div style="margin:10px 0;border:1px solid #eee;border-radius:10px;padding:10px;background:#fff;">
            <div style="font-weight:700;font-size:13px;margin-bottom:8px;">👑 主播官方大号</div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f0f8f0;border-radius:8px;border:1px solid #d0ebd0;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="font-size:20px;">${G.player.avatar ? `<img src="${G.player.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : '👑'}</div>
                    <div>
                        <div style="font-weight:700;font-size:13px;">${escapeHtml(G.player.ytName)} <span style="font-size:10px;color:#fff;background:var(--primary);padding:1px 6px;border-radius:4px;">大号</span></div>
                        <div style="font-size:10px;color:#666;">粉丝 ${G.player.followers || 0} · 官方认证</div>
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
// 📱 手机社交中心 UI 与事件（绝对稳固的终极触控版本）
// ============================================================
if (!G.phoneNav) G.phoneNav = 'chats';
if (!G.chatActiveTab) G.chatActiveTab = 'direct';
if (!G.groups) G.groups = {};
if (!G.groupChatHistory) G.groupChatHistory = {};
if (!G.friendRequests) G.friendRequests = [];
if (!G.groupInvites) G.groupInvites = [];
if (!G.momentsFilterNpcId) G.momentsFilterNpcId = null;
if (!G._chatShowFullHistory) G._chatShowFullHistory = {};
let _stickerDrawerOpen = false;
if (!G._behindScreenActive) G._behindScreenActive = {};

// 🌟 最核心的 Android WebView 事件捕获终极版
function bindLongPressEvent(el, onLongPress, onClick) {
    if (!el) return;
    const LONG_MS = 500;
    const MOVE_LIMIT = 15;
    let timer = null;
    let startX = 0, startY = 0;
    let isPressing = false, isMoved = false, isLong = false;
    let touchConsumed = false;

    const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };

    const handleStart = (e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        if (e.type === 'mousedown' && e.button !== 0) return;
        
        isPressing = true; isMoved = false; isLong = false;
        startX = clientX; startY = clientY;
        clear();
        if (onLongPress) {
            timer = setTimeout(() => {
                if (isPressing && !isMoved) {
                    isLong = true;
                    onLongPress();
                }
            }, LONG_MS);
        }
    };

    const handleMove = (e) => {
        if (!isPressing) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        if (Math.abs(clientX - startX) > MOVE_LIMIT || Math.abs(clientY - startY) > MOVE_LIMIT) {
            isMoved = true;
            clear();
        }
    };

    const handleEnd = (e) => {
        clear();
        if (isPressing && !isMoved && !isLong && onClick) {
            if (e.cancelable) e.preventDefault(); // Stop synthetic click
            touchConsumed = true;
            setTimeout(() => { touchConsumed = false; }, 400);
            onClick();
        }
        isPressing = false; isLong = false; isMoved = false;
    };

    el.addEventListener('touchstart', handleStart, { passive: true });
    el.addEventListener('touchmove', handleMove, { passive: true });
    el.addEventListener('touchend', handleEnd, { passive: false });
    el.addEventListener('touchcancel', () => { clear(); isPressing = false; }, { passive: true });

    // Fallback for PC / Click if touch not fired
    el.addEventListener('click', (e) => {
        if (touchConsumed) { e.preventDefault(); e.stopPropagation(); return; }
        if (onClick) onClick();
    });
    el.addEventListener('contextmenu', e => { e.preventDefault(); });
}

function renderAvatarBadge(obj, size = 44) {
    const url = (obj && obj.isPlayer) ? G.player.avatar : (obj && obj.avatarUrl);
    const emoji = (obj && obj.isPlayer) ? '🧑' : ((obj && obj.avatarEmoji) || '👤');
    if (url) return `<img src="${url}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block;">`;
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#eaf2ea;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(size*0.45)}px;flex-shrink:0;">${emoji}</div>`;
}

function renderSocialPanel() {
    const container = (dom && dom.socialTab) || document.getElementById('socialTab');
    if (!container) return;
    ensureNpcIntegrity(); ensureStickersLoaded();
    if (G.currentChatGroup) { renderGroupChatWindow(container); return; }
    if (G.currentChatNpc) { renderSingleChatWindow(container); return; }
    renderPhoneApp(container);
}

function renderPhoneApp(container) {
    const isMoments = G.phoneNav === 'moments';
    let contentHtml = isMoments ? buildMomentsHTML() : buildChatListHTML();
    const activeAcc = getActiveAccountInfo();

    const html = `
    <div class="phone-app-wrap" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);height:82vh;max-height:850px;display:flex;flex-direction:column;">
        <div style="background:#f1f7f1;padding:6px 12px;border-bottom:1px solid #e0ebe0;display:flex;justify-content:space-between;align-items:center;font-size:12px;">
            <div style="display:flex;align-items:center;gap:6px;">
                <span>${activeAcc.isAlt ? '🎭' : '👑'} 账号：<b>${escapeHtml(activeAcc.name)}</b></span>
                ${activeAcc.isAlt ? '<span style="font-size:10px;background:#ffe082;color:#795548;padding:1px 4px;border-radius:4px;font-weight:700;">小号</span>' : ''}
            </div>
            <div style="display:flex;gap:5px;">
                <button id="phoneClockBtn" style="border:1px solid #b8dbb8;background:#fff;padding:2px 7px;border-radius:12px;font-size:11px;cursor:pointer;color:#2e7d32;font-weight:700;">🕒 时区</button>
                <button id="phoneAccountBtn" style="border:1px solid #b8dbb8;background:#fff;padding:2px 8px;border-radius:12px;font-size:11px;cursor:pointer;color:#2e7d32;font-weight:700;">🔀 切换账号</button>
            </div>
        </div>
        <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;">
            ${contentHtml}
        </div>
        <div style="height:54px;background:#fcfdfc;border-top:1px solid #eef2ee;display:flex;justify-content:space-around;align-items:center;padding:0 10px;flex-shrink:0;">
            <button id="phoneNavChatsBtn" style="border:none;background:none;font-size:12px;font-weight:700;color:${!isMoments ? 'var(--primary)' : '#888'};display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;">
                <span style="font-size:18px;">💬</span><span>消息</span>
            </button>
            <button id="phoneNavMomentsBtn" style="border:none;background:none;font-size:12px;font-weight:700;color:${isMoments ? 'var(--primary)' : '#888'};display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;">
                <span style="font-size:18px;">🌟</span><span>朋友圈</span>
            </button>
        </div>
    </div>
    `;
    container.innerHTML = html;

    bindLongPressEvent(document.getElementById('phoneClockBtn'), null, () => openClockSettingsModal());
    bindLongPressEvent(document.getElementById('phoneAccountBtn'), null, () => openAccountManagerModal());

    bindLongPressEvent(document.getElementById('phoneNavChatsBtn'), null, () => {
        G.currentChatNpc = null; G.currentChatGroup = null; G.phoneNav = 'chats'; renderSocialPanel();
    });
    bindLongPressEvent(document.getElementById('phoneNavMomentsBtn'), null, () => {
        G.currentChatNpc = null; G.currentChatGroup = null; G.phoneNav = 'moments'; G.momentsFilterNpcId = null; renderSocialPanel();
    });

    if (!isMoments) bindChatListEvents(container);
    else bindMomentsEvents(container);
}

// 移除多余的附加按钮，恢复整个卡片纯净点击
function buildChatListHTML() {
    const isDirect = G.chatActiveTab !== 'group';
    const pendingCount = (G.friendRequests || []).length + (G.groupInvites || []).length;
    let itemsHtml = '';
    const currentAcc = getActiveAccountInfo();

    if (isDirect) {
        const npcList = Object.entries(G.npcs || {});
        if (!npcList.length) {
            itemsHtml += `
            <div style="text-align:center;color:#888;padding:45px 16px;font-size:13px;line-height:1.7;">
                <div style="font-size:36px;margin-bottom:8px;">📬</div>
                <b>通讯录空空如也</b><br>
                新人主播需要通过<b>录制视频</b>、<b>联机开播</b>积累粉丝热度。<br>
            </div>`;
        } else {
            for (const [id, npc] of npcList) {
                const chatHist = getAccountChatHistory(id);
                const lastMsg = chatHist.length > 0 ? chatHist[chatHist.length - 1] : null;
                const purePreview = lastMsg ? stripThought(lastMsg.text || '') : (npc.memorySummary ? `[记忆: ${stripThought(npc.memorySummary).slice(0, 15)}...]` : '新添加好友，快来打个招呼吧');
                const time = lastMsg ? (lastMsg.time || '') : '';
                const isBlocked = isAccountBlockedByNpc(id, currentAcc.id);
                
                itemsHtml += `
                <div class="chat-item" data-id="${id}" style="display:flex;align-items:center;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:#fff;border:1px solid #f0f4f0;">
                    <div style="margin-right:12px;flex-shrink:0;">${renderAvatarBadge(npc, 44)}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-weight:700;font-size:14px;color:var(--text);">${escapeHtml(npc.name)} ${isBlocked ? '<span style="font-size:10px;color:#fff;background:#e53935;padding:1px 5px;border-radius:4px;">已拉黑</span>' : ''}</span>
                            <span style="font-size:11px;color:#bbb;">${time}</span>
                        </div>
                        <div style="font-size:12px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px;">${escapeHtml(purePreview.slice(0, 30))}</div>
                    </div>
                </div>`;
            }
        }
    } else {
        const groupKeys = Object.keys(G.groups || {});
        if (!groupKeys.length) {
            itemsHtml += `
            <div style="text-align:center;color:#aaa;padding:40px 16px;font-size:13px;line-height:1.6;">
                暂无群聊，可以点击右上角 ➕ 自建专属主播交流群！
            </div>`;
        } else {
            for (const [gid, grp] of Object.entries(G.groups)) {
                const msgs = G.groupChatHistory[gid] || [];
                const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
                const purePreview = lastMsg ? `${lastMsg.senderName}: ${stripThought(lastMsg.text || '')}` : (grp.desc || '开启热烈讨论吧');
                itemsHtml += `
                <div class="group-item" data-gid="${gid}" style="display:flex;align-items:center;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:#fff;border:1px solid #f0f4f0;">
                    <div style="margin-right:12px;flex-shrink:0;">${renderAvatarBadge(grp, 44)}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-weight:700;font-size:14px;color:var(--text);">${escapeHtml(grp.name)} <span style="font-size:11px;color:#999;">(${(grp.members || []).length}人)</span></span>
                            <span style="font-size:11px;color:#bbb;">${lastMsg ? (lastMsg.time || '') : ''}</span>
                        </div>
                        <div style="font-size:12px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px;">${escapeHtml(purePreview.slice(0, 30))}</div>
                    </div>
                </div>`;
            }
        }
    }

    return `
    <div class="chat-header" style="padding:12px 16px;background:#f8fbf8;border-bottom:1px solid #eef3ee;display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;gap:6px;background:#e9f2e9;padding:3px;border-radius:8px;">
            <button id="tabDirectBtn" style="border:none;padding:6px 14px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;background:${isDirect ? '#fff' : 'transparent'};color:${isDirect ? 'var(--primary)' : '#666'};">👤 私聊</button>
            <button id="tabGroupBtn" style="border:none;padding:6px 14px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;background:${!isDirect ? '#fff' : 'transparent'};color:${!isDirect ? 'var(--primary)' : '#666'};">👥 群聊</button>
        </div>
        <div style="position:relative;">
            <button id="addChatTargetBtn" title="新建与好友/群邀请" style="border:none;background:var(--primary);color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
            ${pendingCount > 0 ? `<span style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;background:#ff4757;border:2px solid #fff;border-radius:50%;display:block;"></span>` : ''}
        </div>
    </div>
    <div style="font-size:11px;color:#888;padding:6px 16px;background:#fcfdfc;border-bottom:1px dashed #eee;">
        💡 提示：点击卡片进入聊天，<b>长按卡片可编辑人设与设置</b>。
    </div>
    <div class="chat-list" style="flex:1;overflow-y:auto;padding:8px;">
        ${itemsHtml}
    </div>`;
}

function bindChatListEvents(container) {
    bindLongPressEvent(document.getElementById('tabDirectBtn'), null, () => { G.chatActiveTab = 'direct'; G.currentChatNpc = null; G.currentChatGroup = null; renderSocialPanel(); });
    bindLongPressEvent(document.getElementById('tabGroupBtn'), null, () => { G.chatActiveTab = 'group'; G.currentChatNpc = null; G.currentChatGroup = null; renderSocialPanel(); });
    bindLongPressEvent(document.getElementById('addChatTargetBtn'), null, () => openAddChatTargetModal());

    // 卡片事件：短按进，长按编辑
    container.querySelectorAll('.chat-item').forEach(el => {
        const id = el.dataset.id;
        if (id) bindLongPressEvent(el, () => openEditNpcModal(String(id)), () => openChat(String(id)));
    });

    container.querySelectorAll('.group-item').forEach(el => {
        const gid = el.dataset.gid;
        if (gid) bindLongPressEvent(el, () => openGroupSettingsModal(gid), () => openGroupChat(gid));
    });
}

function openChat(npcId) {
    if (!G.npcs || !G.npcs[npcId]) return;
    G.currentChatGroup = null;
    G.currentChatNpc = npcId;
    G.chatActiveTab = 'direct';
    G.phoneNav = 'chats';
    renderSocialPanel(); // 强制刷新绝对有效
}

function closeChat() {
    G.currentChatNpc = null;
    renderSocialPanel();
}

function openGroupChat(gid) {
    if (!G.groups || !G.groups[gid]) return;
    G.currentChatNpc = null;
    G.currentChatGroup = gid;
    G.chatActiveTab = 'group';
    G.phoneNav = 'chats';
    renderSocialPanel();
}

function closeGroupChat() {
    G.currentChatGroup = null;
    renderSocialPanel();
}

// 💬 私聊窗口渲染（包含屏幕那边的TA、表情包，无旁白）
function renderSingleChatWindow(container) {
    const npcId = window.G.currentChatNpc;
    const npc = window.G.npcs[npcId];
    if (!npc) { closeChat(); return; }

    const activeAcc = getActiveAccountInfo();
    const isBlocked = isAccountBlockedByNpc(npcId, activeAcc.id);
    const chatHist = getAccountChatHistory(npcId);

    const sessionKey = getChatStorageKey(npcId);
    const showAll = !!window.G._chatShowFullHistory[sessionKey];
    const FOLD_LIMIT = 15;
    const hasMore = chatHist.length > FOLD_LIMIT && !showAll;
    const displayList = hasMore ? chatHist.slice(chatHist.length - FOLD_LIMIT) : chatHist;
    const isBehindScreenActive = !!window.G._behindScreenActive[npcId];

    let messagesHtml = '';
    if (hasMore) {
        messagesHtml += `
        <div style="text-align:center;margin:4px 0 12px;">
            <button id="btnLoadMoreChatHist" style="border:none;background:rgba(0,0,0,0.06);color:#555;padding:4px 12px;border-radius:12px;font-size:11px;cursor:pointer;">
                📜 点击展开更早的 ${chatHist.length - FOLD_LIMIT} 条记录
            </button>
        </div>`;
    }

    for (const msg of displayList) {
        if (msg.from === 'action') {
            messagesHtml += `
            <div style="text-align:center;margin:8px 0;">
                <span style="display:inline-block;background:rgba(0,0,0,0.06);color:#666;padding:4px 10px;border-radius:12px;font-size:12px;max-width:85%;">${escapeHtml(msg.text)}</span>
            </div>`;
        } else if (msg.from === 'behind_screen') {
            messagesHtml += `
            <div style="margin:10px 14px;background:rgba(255,253,245,0.92);border:1px dashed #d7ccc8;border-radius:10px;padding:8px 12px;font-size:12px;color:#5d4037;line-height:1.6;box-shadow:0 1px 4px rgba(0,0,0,0.04);position:relative;">
                <div style="font-weight:700;font-size:11px;color:#8d6e63;margin-bottom:3px;">👁️ 屏幕那边的 TA (${escapeHtml(npc.name)})</div>
                <div>${escapeHtml(msg.text)}</div>
            </div>`;
        } else {
            const isSelf = msg.from === 'player';
            let bubbleContent = '';

            if (msg.sticker) {
                bubbleContent = `<div style="padding:0;display:inline-block;"><img src="${msg.sticker.url}" alt="${escapeHtml(msg.sticker.desc)}" style="width:85px;height:85px;border-radius:8px;object-fit:cover;display:block;"></div>`;
            } else if (msg.sharedMoment) {
                const sm = msg.sharedMoment;
                bubbleContent = `
                <div onclick="jumpToMomentCard(${sm.id})" style="cursor:pointer;background:#fff;border-radius:8px;padding:8px;border:1px solid #e0e0e0;max-width:210px;">
                    <div style="font-weight:700;font-size:11px;color:#2e7d32;margin-bottom:3px;">🌟 朋友圈动态 · ${escapeHtml(sm.author)}</div>
                    <div style="font-size:12px;color:#333;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${escapeHtml(sm.body)}</div>
                    ${sm.image ? `<img src="${sm.image}" style="width:100%;height:65px;object-fit:cover;border-radius:4px;margin-top:4px;">` : ''}
                    <div style="font-size:10px;color:#999;text-align:right;margin-top:4px;">点击查看完整动态 ❯</div>
                </div>`;
            } else {
                bubbleContent = isSelf ? escapeHtml(msg.text).replace(/\n/g, '<br>') : renderContentWithThoughts(msg.text);
            }

            messagesHtml += `
            <div class="chat-msg-row" data-msgid="${msg._id || ''}" data-from="${msg.from}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:10px;align-items:flex-start;">
                ${!isSelf ? `<div class="chat-npc-avatar-btn" data-npcid="${npcId}" style="margin-right:8px;flex-shrink:0;cursor:pointer;" title="点击看名片，长按编辑人设">${renderAvatarBadge(npc, 34)}</div>` : ''}
                <div style="max-width:75%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                    ${isSelf && msg.senderAccount ? `<div style="font-size:10px;color:#888;margin-bottom:2px;">${escapeHtml(msg.senderAccount)}</div>` : ''}
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? ((msg.sticker || msg.sharedMoment) ? 'transparent' : '#95ec69') : ((msg.sticker || msg.sharedMoment) ? 'transparent' : '#fff')};color:#111;padding:${(msg.sticker || msg.sharedMoment) ? '0' : '8px 12px'};border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:${(msg.sticker || msg.sharedMoment) ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'};font-size:14px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;cursor:pointer;">
                        ${bubbleContent}
                    </div>
                    <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                </div>
                ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: activeAcc.avatar }, 34)}</div>` : ''}
            </div>`;
        }
    }

    const html = `
    <div style="background:#f2f4f2;border-radius:14px;display:flex;flex-direction:column;height:82vh;max-height:850px;box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden;">
        <div style="padding:8px 12px;background:#fff;border-bottom:1px solid #e5ebe5;display:flex;justify-content:space-between;align-items:center;min-height:48px;box-sizing:border-box;">
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                <button id="singleChatBackBtn" style="border:none;background:none;font-size:19px;color:#333;cursor:pointer;padding:0 2px;">❮</button>
                <div id="singleChatHeaderProfileBtn" style="cursor:pointer;flex:1;min-width:0;" title="点击看名片，长按编辑TA的人设">
                    <div style="font-weight:700;font-size:14.5px;display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        <span style="overflow:hidden;text-overflow:ellipsis;">${escapeHtml(npc.name)}</span>
                        <span style="font-size:10.5px;color:#e53935;font-weight:normal;background:#ffebee;padding:1px 5px;border-radius:6px;flex-shrink:0;">❤️ ${npc.favor || 0}</span>
                    </div>
                    <div id="chatOnlineStatusText" style="font-size:10.5px;color:#2e7d32;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${isBlocked ? '<span style="color:#d32f2f;">⚠️ 已拉黑</span>' : '● 在线'} ${npc.memorySummary ? '· 🧠记忆' : ''}
                    </div>
                </div>
            </div>
            <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                <button id="btnToggleBehindScreen" style="border:1px solid ${isBehindScreenActive ? '#8d6e63' : '#ccc'};background:${isBehindScreenActive ? '#efebe9' : '#fff'};width:30px;height:30px;border-radius:50%;font-size:15px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="${isBehindScreenActive ? '已开启屏幕那边的动作感知(点击关闭)' : '点击开启屏幕那边的动作感知'}">👁️</button>
                <button id="triggerAIReplyBtn" title="让TA回复或主动发消息" style="border:none;background:#ff4757;color:#fff;width:32px;height:32px;border-radius:8px;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        ${isBlocked ? `
        <div style="background:#ffebee;color:#c62828;padding:5px 12px;font-size:11px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ffcdd2;">
            <span>🚫 你的当前账号已被对方拉黑。</span>
        </div>` : ''}

        <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
            ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">当前账号与 TA 尚无对话，点击右上方 ⚡ 闪电按钮开启互动！</div>'}
        </div>

        ${_stickerDrawerOpen ? buildStickerDrawerHTML() : ''}

        <div style="padding:6px 8px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:5px;align-items:center;">
            <button id="chatActionInsertBtn" title="合作/拍共创视频" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
            <button id="chatToggleStickerBtn" title="发送表情包" style="border:1px solid #ccc;background:${_stickerDrawerOpen ? '#eaf5ea' : '#f8f9f8'};color:#555;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;">😊</button>
            <textarea id="singleChatInput" rows="1" placeholder="" style="flex:1;padding:7px 10px;border-radius:16px;border:1px solid #ddd;background:#f8faf8;font-size:13.5px;resize:none;outline:none;font-family:inherit;"></textarea>
            <button id="singleSendBtn" style="border:none;background:var(--primary);color:#fff;padding:6px 13px;border-radius:16px;font-size:12.5px;font-weight:700;cursor:pointer;">发送</button>
        </div>
    </div>
    `;
    container.innerHTML = html;

    const msgArea = document.getElementById('chatMessageArea');
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;

    if (_stickerDrawerOpen) bindStickerDrawerEvents('single', npcId);

    bindLongPressEvent(document.getElementById('singleChatBackBtn'), null, () => closeChat());

    bindLongPressEvent(document.getElementById('btnToggleBehindScreen'), null, () => {
        window.G._behindScreenActive[npcId] = !window.G._behindScreenActive[npcId];
        showToast(window.G._behindScreenActive[npcId] ? '👁️ 已开启「屏幕那边的TA」动作感知' : '已关闭线下动作感知', 'info', 1500);
        renderSingleChatWindow(container);
        autoSaveGame();
    });

    bindLongPressEvent(document.getElementById('chatToggleStickerBtn'), null, () => {
        _stickerDrawerOpen = !_stickerDrawerOpen;
        renderSingleChatWindow(container);
    });

    bindLongPressEvent(document.getElementById('btnLoadMoreChatHist'), null, () => {
        window.G._chatShowFullHistory[sessionKey] = true;
        renderSingleChatWindow(container);
    });

    container.querySelectorAll('.chat-msg-row[data-from="player"]').forEach(row => {
        const msgId = row.dataset.msgid;
        const bubble = row.querySelector('.self-bubble');
        if (bubble && msgId) bindLongPressEvent(bubble, () => showMessageActionSheet(msgId, 'single', npcId), null);
    });

    container.querySelectorAll('.chat-npc-avatar-btn').forEach(btn => {
        bindLongPressEvent(btn, () => openEditNpcModal(npcId), () => openNpcProfileCardModal(npcId));
    });

    bindLongPressEvent(document.getElementById('singleChatHeaderProfileBtn'), () => openEditNpcModal(npcId), () => openNpcProfileCardModal(npcId));

    const input = document.getElementById('singleChatInput');
    const doSend = () => {
        const text = input.value.trim();
        if (!text) return;
        if (isBlocked) {
            pushChatMessageSafe(npcId, { from: 'player', text, senderAccount: activeAcc.name, time: new Date().toLocaleTimeString().slice(0, 5) });
            pushChatMessageSafe(npcId, { from: 'action', text: `❌ 消息已发出，但被对方拒收了。（当前账号已被拉黑）`, time: new Date().toLocaleTimeString().slice(0, 5) });
            input.value = ''; renderSingleChatWindow(container); showToast('⚠️ 你已被拉黑', 'error', 3000); return;
        }
        pushChatMessageSafe(npcId, { from: 'player', text, senderAccount: activeAcc.isAlt ? `${activeAcc.name} (小号)` : activeAcc.name, time: new Date().toLocaleTimeString().slice(0, 5) });
        input.value = ''; renderSingleChatWindow(container); autoSaveGame();
    };

    bindLongPressEvent(document.getElementById('singleSendBtn'), null, doSend);
    if (input) input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } };

    bindLongPressEvent(document.getElementById('chatActionInsertBtn'), null, () => openChatActionMenuModal('single', npcId));

    bindLongPressEvent(document.getElementById('triggerAIReplyBtn'), null, async () => {
        if (window.G.isGenerating) { showToast('⏳ TA 正在打字中...', 'info', 1500); return; }
        const btn = document.getElementById('triggerAIReplyBtn');
        btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none';
        await triggerAIReplyForSingle(npcId);
        const btn2 = document.getElementById('triggerAIReplyBtn');
        if (btn2) { btn2.style.opacity = '1'; btn2.style.pointerEvents = 'auto'; }
    });
}

// 👥 群聊窗口渲染
function renderGroupChatWindow(container) {
    const gid = G.currentChatGroup;
    const grp = G.groups[gid];
    if (!grp) { closeGroupChat(); return; }
    const msgs = G.groupChatHistory[gid] || [];
    const activeAcc = getActiveAccountInfo();

    let messagesHtml = '';
    for (const msg of msgs) {
        if (msg.from === 'action') {
            messagesHtml += `
            <div style="text-align:center;margin:8px 0;">
                <span style="display:inline-block;background:rgba(0,0,0,0.06);color:#666;padding:3px 10px;border-radius:12px;font-size:11px;">${escapeHtml(msg.text)}</span>
            </div>`;
        } else {
            const isSelf = msg.from === 'player';
            let bubbleContent = '';
            if (msg.sticker) {
                bubbleContent = `<div style="padding:0;display:inline-block;"><img src="${msg.sticker.url}" alt="${escapeHtml(msg.sticker.desc)}" style="width:85px;height:85px;border-radius:8px;object-fit:cover;display:block;"></div>`;
            } else {
                bubbleContent = isSelf ? escapeHtml(msg.text).replace(/\n/g, '<br>') : renderContentWithThoughts(msg.text);
            }

            messagesHtml += `
            <div class="chat-msg-row" data-msgid="${msg._id || ''}" data-from="${msg.from}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:10px;align-items:flex-start;">
                ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: msg.senderAvatarUrl, avatarEmoji: msg.senderAvatar || '👤' }, 34)}</div>` : ''}
                <div style="max-width:75%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                    ${!isSelf ? `<div style="font-size:11px;color:#777;margin-bottom:2px;">${escapeHtml(msg.senderName)}</div>` : ''}
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? (msg.sticker ? 'transparent' : '#95ec69') : (msg.sticker ? 'transparent' : '#fff')};color:#111;padding:${msg.sticker ? '0' : '8px 12px'};border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:${msg.sticker ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'};font-size:14px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;">
                        ${bubbleContent}
                    </div>
                    <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                </div>
                ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: activeAcc.avatar }, 34)}</div>` : ''}
            </div>`;
        }
    }

    const html = `
    <div style="background:#f2f4f2;border-radius:14px;display:flex;flex-direction:column;height:82vh;max-height:850px;box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden;">
        <div style="padding:10px 14px;background:#fff;border-bottom:1px solid #e5ebe5;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
                <button id="groupChatBackBtn" style="border:none;background:none;font-size:20px;color:#333;cursor:pointer;padding:0 4px;">❮</button>
                <div>
                    <div style="font-weight:700;font-size:15px;">${escapeHtml(grp.name)} <span style="font-size:12px;color:#888;">(${(grp.members || []).length})</span></div>
                    <div style="font-size:11px;color:#888;">${grp.desc ? escapeHtml(grp.desc.slice(0, 18)) : '群聊自由交流'}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button id="groupSettingsBtn" style="border:1px solid #ddd;background:#fff;color:#555;padding:4px 8px;border-radius:8px;font-size:12px;cursor:pointer;">⚙️ 管理</button>
                <button id="triggerGroupAIBtn" title="触发群成员回复" style="border:none;background:#ff4757;color:#fff;width:36px;height:36px;border-radius:10px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        <div id="groupMessageArea" style="flex:1;overflow-y:auto;padding:14px;">
            ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">群里静悄悄的，点击 ➕ 可发起群成员拍视频或多人开播！<br>长按自己发出的消息可撤回、编辑或删除</div>'}
        </div>

        ${_stickerDrawerOpen ? buildStickerDrawerHTML() : ''}

        <div style="padding:8px 10px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:8px;align-items:center;">
            <button id="groupActionInsertBtn" title="群合作/共创视频" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
            <button id="groupToggleStickerBtn" title="发送表情包" style="border:1px solid #ccc;background:${_stickerDrawerOpen ? '#eaf5ea' : '#f8f9f8'};color:#555;width:36px;height:36px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;">😊</button>
            <textarea id="groupChatInput" rows="1" placeholder="以 [${escapeHtml(activeAcc.name)}] 在群里发言..." style="flex:1;padding:8px 12px;border-radius:18px;border:1px solid #ddd;background:#f8faf8;font-size:14px;resize:none;outline:none;font-family:inherit;"></textarea>
            <button id="groupSendBtn" style="border:none;background:var(--primary);color:#fff;padding:8px 16px;border-radius:18px;font-size:13px;font-weight:700;cursor:pointer;">发送</button>
        </div>
    </div>
    `;
    container.innerHTML = html;

    const msgArea = document.getElementById('groupMessageArea');
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;

    if (_stickerDrawerOpen) bindStickerDrawerEvents('group', gid);

    bindLongPressEvent(document.getElementById('groupChatBackBtn'), null, () => closeGroupChat());
    bindLongPressEvent(document.getElementById('groupToggleStickerBtn'), null, () => {
        _stickerDrawerOpen = !_stickerDrawerOpen;
        renderGroupChatWindow(container);
    });

    container.querySelectorAll('.chat-msg-row[data-from="player"]').forEach(row => {
        const msgId = row.dataset.msgid;
        const bubble = row.querySelector('.self-bubble');
        if (bubble && msgId) bindLongPressEvent(bubble, () => showMessageActionSheet(msgId, 'group', gid), null);
    });

    const input = document.getElementById('groupChatInput');
    const doSend = () => {
        const text = input.value.trim();
        if (!text) return;
        if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
        G.groupChatHistory[gid].push({ _id: 'gmsg_' + Date.now() + '_' + rand(100, 999), from: 'player', senderName: activeAcc.name, text, time: new Date().toLocaleTimeString().slice(0, 5) });
        input.value = ''; renderGroupChatWindow(container); autoSaveGame();
    };

    bindLongPressEvent(document.getElementById('groupSendBtn'), null, doSend);
    if (input) input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } };

    bindLongPressEvent(document.getElementById('groupActionInsertBtn'), null, () => openChatActionMenuModal('group', gid));
    bindLongPressEvent(document.getElementById('groupSettingsBtn'), null, () => openGroupSettingsModal(gid));

    bindLongPressEvent(document.getElementById('triggerGroupAIBtn'), null, async () => {
        if (G.isGenerating) { showToast('⏳ AI 正在组织群聊中...'); return; }
        showToast('⚡ 触发群聊讨论...', 'success', 1200);
        await triggerGroupAIReply(gid);
        renderGroupChatWindow(container);
    });
}

// 移除旁白选项，仅保留拍共创和联机开播
function openChatActionMenuModal(targetType, targetId) {
    const isGroup = targetType === 'group';
    const title = isGroup ? '👥 群聊互动与共创' : `🤝 与 ${escapeHtml(G.npcs[targetId]?.name || '好友')} 的互动`;

    openModal(`
        <h3>${title}</h3>
        <p style="font-size:12px;color:#666;line-height:1.5;">选择与对方展开的合作联动形式：</p>
        <div class="btn-row" style="flex-direction:column;gap:8px;margin-top:10px;">
            <button class="btn-primary" id="actCollabVideoBtn" style="width:100%;background:#e53935;">🎬 邀请一起录制拍视频 (油管共创)</button>
            <button class="btn-primary" id="actCollabStreamBtn" style="width:100%;background:#388e3c;">🔴 邀请一起联机开播 (连麦涨粉)</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">取消</button>
        </div>
    `);

    // 模态框内部按钮用传统 onclick 足以（不在复杂滚动区）
    document.getElementById('actCollabVideoBtn').onclick = () => { closeModal(); openCollabVideoPublishModal(targetType, targetId); };
    document.getElementById('actCollabStreamBtn').onclick = () => { closeModal(); handleInviteCollabStream(targetType, targetId); };
}

// 朋友圈相关
function buildMomentsHTML() {
    let feedItems = [...(G.feed || [])].reverse();
    let filterTitle = '🌟 动态朋友圈';

    if (G.momentsFilterNpcId) {
        const targetNpc = G.npcs[G.momentsFilterNpcId];
        const targetName = targetNpc ? targetNpc.name : G.momentsFilterNpcId;
        feedItems = feedItems.filter(f => f.npcId === G.momentsFilterNpcId || f.author === targetName);
        filterTitle = `🌟 ${escapeHtml(targetName)} 的朋友圈`;
    }

    let listHtml = '';
    if (!feedItems.length) {
        listHtml = `<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">暂无动态，点击右上角「✨ 刷新动态」或「📷 发动态」吧！</div>`;
    } else {
        for (const item of feedItems) {
            const isLiked = item.liked ? '❤️ 已赞' : '🤍 赞';
            const isSelfPost = item.isPlayer || item.author === G.player.ytName || (G.altAccounts || []).some(a => a.name === item.author);
            const displayAvatar = isSelfPost && item.avatar ? `<img src="${item.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : (item.avatar || '👤');

            let mediaHtml = '';
            if (item.image) {
                mediaHtml = `<div style="margin:8px 0;"><img src="${item.image}" style="max-width:200px;max-height:200px;border-radius:8px;object-fit:cover;border:1px solid #ddd;box-shadow:0 2px 6px rgba(0,0,0,0.1);"></div>`;
            } else if (item.imageDesc) {
                mediaHtml = `<div style="margin:6px 0;background:#f0f4f0;padding:6px 10px;border-radius:6px;font-size:12px;color:#2e7d32;border:1px dashed #c8e6c9;">🖼️ [配图描述]: ${escapeHtml(item.imageDesc)}</div>`;
            }

            let commentsHtml = '';
            if (item.comments && item.comments.length) {
                commentsHtml = `<div style="margin-top:8px;background:#f8faf8;padding:8px 12px;border-radius:8px;font-size:12.5px;line-height:1.6;border:1px solid #edf2ed;">` +
                    item.comments.map(c => `<div style="margin-bottom:3px;"><b style="color:#2e7d32;">${escapeHtml(c.user)}</b>: <span>${escapeHtml(c.content)}</span></div>`).join('') +
                `</div>`;
            }

            listHtml += `
            <div class="moment-card" data-id="${item.id}" style="padding:14px;background:#fff;border-radius:10px;margin-bottom:10px;border:1px solid #eef2ee;position:relative;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                    <div style="font-size:20px;display:flex;align-items:center;cursor:pointer;" class="moment-avatar-click" data-npcid="${item.npcId||''}">${displayAvatar}</div>
                    <div style="flex:1;">
                        <div style="font-weight:700;font-size:13.5px;color:var(--text);">${escapeHtml(item.author)} ${isSelfPost ? '<span style="font-size:10px;color:#2e7d32;background:#e8f5e9;padding:1px 4px;border-radius:4px;">我</span>' : ''}</div>
                        <div style="font-size:10px;color:#bbb;">${item.time || ''}</div>
                    </div>
                </div>
                ${item.title ? `<div style="font-weight:700;font-size:14px;color:#111;margin-bottom:4px;">${escapeHtml(item.title)}</div>` : ''}
                <div style="font-size:13.5px;color:#222;line-height:1.6;margin-bottom:8px;">${escapeHtml(item.body)}</div>
                ${mediaHtml}
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;border-top:1px solid #f7f9f7;padding-top:6px;">
                    <div style="display:flex;gap:12px;">
                        <button class="moment-like-btn" data-id="${item.id}" style="border:none;background:none;cursor:pointer;color:#e53935;font-size:12px;">${isLiked} (${item.likes||0})</button>
                        <button class="moment-ai-cmt-btn" data-id="${item.id}" style="border:none;background:none;cursor:pointer;color:#1976d2;font-size:12px;font-weight:600;">💬 召唤好友互动</button>
                    </div>
                    ${isSelfPost ? `
                    <div style="display:flex;gap:8px;">
                        <button class="moment-op-btn" data-act="recall" data-id="${item.id}" style="border:none;background:none;color:#555;cursor:pointer;font-size:11px;">↩️撤回</button>
                        <button class="moment-op-btn" data-act="edit" data-id="${item.id}" style="border:none;background:none;color:#1976d2;cursor:pointer;font-size:11px;">✏️编辑</button>
                        <button class="moment-op-btn" data-act="del" data-id="${item.id}" style="border:none;background:none;color:#e53935;cursor:pointer;font-size:11px;">🗑️删除</button>
                    </div>` : ''}
                </div>
                ${commentsHtml}
            </div>`;
        }
    }

    return `
    <div style="padding:10px 14px;background:#f8fbf8;border-bottom:1px solid #eef3ee;display:flex;justify-content:space-between;align-items:center;gap:6px;">
        <span style="font-weight:700;font-size:15px;flex:1;">${filterTitle}</span>
        <button id="btnCreateUserPost" style="border:1px solid var(--primary);background:#f0f8f0;color:var(--primary);padding:4px 10px;border-radius:14px;font-size:12px;font-weight:700;cursor:pointer;">📷 发动态</button>
        <button id="btnAiRefreshFeed" style="border:none;background:var(--primary);color:#fff;padding:4px 10px;border-radius:14px;font-size:12px;font-weight:700;cursor:pointer;">✨ 刷新动态</button>
        ${G.momentsFilterNpcId ? `<button id="clearMomentFilterBtn" style="border:1px solid #ccc;background:#fff;padding:2px 8px;border-radius:6px;font-size:11px;cursor:pointer;">查看全部</button>` : ''}
    </div>
    <div style="flex:1;overflow-y:auto;padding:10px;background:#f4f6f4;">
        ${listHtml}
    </div>`;
}

function bindMomentsEvents(container) {
    bindLongPressEvent(document.getElementById('clearMomentFilterBtn'), null, () => {
        G.momentsFilterNpcId = null; renderSocialPanel();
    });
    bindLongPressEvent(document.getElementById('btnCreateUserPost'), null, () => openCreateMomentPostModal());
    bindLongPressEvent(document.getElementById('btnAiRefreshFeed'), null, async () => await triggerGenerateFriendsFeed());

    container.querySelectorAll('.moment-avatar-click').forEach(el => {
        bindLongPressEvent(el, null, () => {
            const nid = el.dataset.npcid;
            if (nid && G.npcs[nid]) { G.momentsFilterNpcId = nid; renderSocialPanel(); }
        });
    });
    container.querySelectorAll('.moment-like-btn').forEach(btn => {
        bindLongPressEvent(btn, null, () => {
            const id = parseInt(btn.dataset.id); const item = G.feed.find(f => f.id === id);
            if (!item) return;
            item.liked = !item.liked; item.likes = (item.likes || 0) + (item.liked ? 1 : -1);
            renderSocialPanel(); autoSaveGame();
        });
    });
    container.querySelectorAll('.moment-ai-cmt-btn').forEach(btn => {
        bindLongPressEvent(btn, null, async () => { await triggerAiCommentForMoment(parseInt(btn.dataset.id)); });
    });
    container.querySelectorAll('.moment-op-btn').forEach(btn => {
        bindLongPressEvent(btn, null, () => {
            const act = btn.dataset.act; const id = parseInt(btn.dataset.id);
            const itemIdx = (G.feed || []).findIndex(f => f.id === id); if (itemIdx === -1) return;
            const item = G.feed[itemIdx];

            if (act === 'del') {
                if (confirm('确定删除这条动态吗？')) { G.feed.splice(itemIdx, 1); showToast('🗑️ 动态已删除', 'info', 1200); renderSocialPanel(); autoSaveGame(); }
            } else if (act === 'recall') {
                const isSeen = Math.random() < 0.5; G.feed.splice(itemIdx, 1);
                if (isSeen) { showToast('👀 你撤回了动态，但有好友在你撤回前正好看到了！', 'info', 3000); addGlobalMemoryRecord(`【朋友圈撤回】：撤回动态"${item.body.slice(0, 20)}"被发现。`); }
                else { showToast('↩️ 动态已悄悄撤回，没人发现', 'success', 2000); }
                renderSocialPanel(); autoSaveGame();
            } else if (act === 'edit') { openEditMomentModal(item); }
        });
    });
}

function openCreateMomentPostModal() {
    const curAcc = getActiveAccountInfo();
    openModal(`
        <h3>📷 发朋友圈动态</h3>
        <p style="font-size:12px;color:#666;">当前发布身份：<b>${escapeHtml(curAcc.name)}</b></p>
        <div class="form-group"><label>动态标题 (可选)</label><input type="text" id="postTitleInput" placeholder="起个简短有梗的标题..."></div>
        <div class="form-group"><label>动态正文 <span class="required">*</span></label><textarea id="postBodyInput" rows="3" placeholder="分享日常..."></textarea></div>
        <div class="form-group">
            <label>配图形式选择</label>
            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px;align-items:stretch;">
                <label style="font-size:12px;display:flex;align-items:flex-start;gap:6px;cursor:pointer;"><input type="radio" name="postImgType" value="real" checked><span>🖼️ <b>真实图片</b></span></label>
                <label style="font-size:12px;display:flex;align-items:flex-start;gap:6px;cursor:pointer;"><input type="radio" name="postImgType" value="desc"><span>📝 <b>文字代替图片</b></span></label>
                <label style="font-size:12px;display:flex;align-items:flex-start;gap:6px;cursor:pointer;"><input type="radio" name="postImgType" value="hybrid"><span>🖼️📝 <b>真实图 + 文字描述</b></span></label>
            </div>
            <div id="postImgRealArea"><input type="file" id="postRealFileInput" accept="image/*" style="font-size:12px;"><div id="postImgPreview" style="margin-top:6px;"></div></div>
            <div id="postImgDescArea" style="display:none;"><input type="text" id="postImgDescInput" placeholder="如：一张苦力怕截图"><div id="postImgDescHint" style="font-size:11px;color:#888;margin-top:4px;"></div></div>
        </div>
        <div class="btn-row"><button class="btn-secondary" onclick="closeModal()">取消</button><button class="btn-primary" id="btnConfirmPublishPost">🚀 发布动态</button></div>
    `);

    let uploadedBase64 = null;
    const syncPostImageModeUI = () => {
        const mode = document.querySelector('input[name="postImgType"]:checked')?.value || 'real';
        document.getElementById('postImgRealArea').style.display = (mode === 'real' || mode === 'hybrid') ? 'block' : 'none';
        document.getElementById('postImgDescArea').style.display = (mode === 'desc' || mode === 'hybrid') ? 'block' : 'none';
    };
    document.querySelectorAll('input[name="postImgType"]').forEach(r => r.onchange = syncPostImageModeUI);
    document.getElementById('postRealFileInput').onchange = function() {
        const file = this.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = e => { uploadedBase64 = e.target.result; document.getElementById('postImgPreview').innerHTML = `<img src="${uploadedBase64}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;">`; };
        reader.readAsDataURL(file);
    };
    syncPostImageModeUI();

    document.getElementById('btnConfirmPublishPost').onclick = () => {
        const title = document.getElementById('postTitleInput').value.trim();
        const body = document.getElementById('postBodyInput').value.trim();
        const imgType = document.querySelector('input[name="postImgType"]:checked').value;
        const imgDesc = document.getElementById('postImgDescInput').value.trim();
        if (!body) { showToast('⚠️ 正文不能为空', 'error'); return; }
        if ((imgType === 'real' || imgType === 'hybrid') && !uploadedBase64) { showToast('⚠️ 请先选择图片', 'error'); return; }
        if ((imgType === 'desc' || imgType === 'hybrid') && !imgDesc) { showToast('⚠️ 请填写文字描述', 'error'); return; }
        if (!G.feed) G.feed = [];
        const newPost = { id: Date.now(), author: curAcc.name, isPlayer: true, avatar: curAcc.avatar, title, body, image: (imgType === 'real' || imgType === 'hybrid') ? uploadedBase64 : null, imageDesc: (imgType === 'desc' || imgType === 'hybrid') ? imgDesc : null, imageMode: imgType, likes: 0, liked: false, comments: [], time: new Date().toLocaleTimeString().slice(0, 5) };
        G.feed.push(newPost);
        addGlobalMemoryRecord(`【玩家发朋友圈】：在第 ${G.day} 天发布了动态："${body}"`);
        showToast('🎉 朋友圈发布成功！', 'success', 2000); closeModal(); renderSocialPanel(); autoSaveGame();
    };
}

function openEditMomentModal(item) {
    openModal(`
        <h3>✏️ 编辑动态</h3>
        <div class="form-group"><textarea id="editMomentBodyInput" rows="4" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;font-size:13px;">${escapeHtml(item.body)}</textarea></div>
        <div class="btn-row"><button class="btn-secondary" onclick="closeModal()">取消</button><button class="btn-primary" id="btnSaveEditedMoment">💾 保存</button></div>
    `);
    document.getElementById('btnSaveEditedMoment').onclick = () => {
        const newBody = document.getElementById('editMomentBodyInput').value.trim();
        if (!newBody) { showToast('内容不能为空', 'error'); return; }
        item.body = newBody; closeModal(); renderSocialPanel(); showToast('✅ 动态已更新', 'success', 1500); autoSaveGame();
    };
}

async function triggerGenerateFriendsFeed() {
    const npcs = Object.values(G.npcs || {});
    if (!npcs.length) { showToast('通讯录暂无好友，快去结识更多主播吧！', 'info', 2000); return; }
    showToast('✨ 正在刷新好友动态...', 'info', 1500);
    try {
        const pickedNpc = pick(npcs);
        const sys = `你正在扮演 Minecraft 主播/好友「${pickedNpc.name}」（人设：${pickedNpc.persona}）。\n${formatNpcTimezoneContext(pickedNpc.name)}\n请以你的口吻发一条简短生动的朋友圈动态（60字以内）。只输出正文。`;
        const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '发一条新动态。' }], { maxTokens: 150, temperature: 0.95 });
        const clean = stripThought(raw).replace(/^["'“]|["'”]$/g, '').trim();
        if (!G.feed) G.feed = [];
        G.feed.push({ id: Date.now(), author: pickedNpc.name, npcId: pickedNpc.id, avatar: pickedNpc.avatarUrl ? `<img src="${pickedNpc.avatarUrl}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : (pickedNpc.avatarEmoji || '👤'), body: clean, likes: rand(1, 15), liked: false, comments: [], time: new Date().toLocaleTimeString().slice(0, 5) });
        showToast(`🌟 ${pickedNpc.name} 刚更新了一条朋友圈！`, 'success', 2500);
        renderSocialPanel(); autoSaveGame();
    } catch (e) { showToast('❌ 刷新失败', 'error'); }
}

async function triggerAiCommentForMoment(momentId) {
    const item = (G.feed || []).find(f => f.id === momentId); if (!item) return;
    const npcs = Object.values(G.npcs || {}); if (!npcs.length) { showToast('暂无可互动好友'); return; }
    const candidateNpcs = npcs.filter(n => n.name !== item.author);
    const selectedNpcs = (candidateNpcs.length ? candidateNpcs : npcs).sort(() => 0.5 - Math.random()).slice(0, Math.min(3, rand(2, 3)));
    showToast(`🤖 ${selectedNpcs.map(n => n.name).join('、')} 正在围观动态...`, 'info', 1500);
    try {
        const imageMode = item.imageMode || (item.image && item.imageDesc ? 'hybrid' : (item.image ? 'real' : 'desc'));
        const hasAiImage = !!item.image && imageMode === 'real';
        const imgDescContext = item.imageDesc ? `（配图描述：${item.imageDesc}）` : '';
        let existingCommentsText = item.comments && item.comments.length ? '【此前评论】：\n' + item.comments.map(c => `${c.user}: ${c.content}`).join('\n') + '\n' : '';
        const participantsDesc = selectedNpcs.map(n => `【${n.name}】(人设: ${n.persona})`).join('\n');
        
        const sysPrompt = `你正在模拟 Minecraft 主播朋友圈下的真实互动。
【发布者】：${item.author}
【内容】：“${item.body}” ${imgDescContext}
${existingCommentsText}
【参与好友】：${participantsDesc}
【规则】：好友之间会直接接话、互怼。严禁男男恋爱，仅限技术攀比吐槽。
【输出格式】（每行一条）：[COMMENT name=角色名字]评论正文（40字以内）[/COMMENT]`;

        let userContent = hasAiImage ? [{ type: 'text', text: `请好友们针对动态及图片互怼接话：` }, { type: 'image_url', image_url: { url: item.image } }] : `请好友针对动态互怼接话。${item.imageDesc ? `图片描述：${item.imageDesc}` : ''}`;
        
        const raw = await callAI([{ role: 'system', content: sysPrompt }, { role: 'user', content: userContent }], { maxTokens: 450, temperature: 0.95 });
        if (!item.comments) item.comments = [];
        
        const re = /\[COMMENT(?:\s+name=|\s*:\s*)(["']?)([^\]"'\n]+)\1\]([\s\S]*?)(?:\[\/COMMENT\]|(?=\[COMMENT)|$)/gi;
        let match; let addedCount = 0;
        while ((match = re.exec(raw)) !== null) {
            const rawName = match[2].trim(); const text = stripThought(match[3].replace(/\[\/?COMMENT[^\]]*\]/gi, '').trim());
            if (!text) continue;
            const matchedNpc = selectedNpcs.find(n => n.name === rawName || rawName.includes(n.name));
            const finalName = matchedNpc ? matchedNpc.name : rawName;
            item.comments.push({ user: finalName, content: text });
            if (matchedNpc) matchedNpc.memorySummary = (matchedNpc.memorySummary || '') + `\n【朋友圈互动】：在动态“${item.body.slice(0, 18)}”下评论：“${text}”`;
            addedCount++;
        }
        
        if (addedCount === 0 && raw.trim()) {
            const fallbackNpc = selectedNpcs[0] || npcs[0];
            item.comments.push({ user: fallbackNpc.name, content: stripThought(raw.replace(/\[\/?COMMENT[^\]]*\]/gi, '').trim()).slice(0, 50) || '这动态太搞笑了！' });
        }
        
        renderSocialPanel(); autoSaveGame(); showToast(`💬 好友已在动态下互动！`, 'success', 2500);
    } catch(e) { showToast('❌ 互动生成失败', 'error'); }
}

// 弹窗操作菜单
function openChatActionMenuModal(targetType, targetId) {
    const title = targetType === 'group' ? '👥 群聊互动与共创' : `🤝 与 ${escapeHtml(G.npcs[targetId]?.name || '好友')} 的互动`;
    openModal(`
        <h3>${title}</h3>
        <p style="font-size:12px;color:#666;line-height:1.5;">选择合作联动形式：</p>
        <div class="btn-row" style="flex-direction:column;gap:8px;margin-top:10px;">
            <button class="btn-primary" id="actCollabVideoBtn" style="width:100%;background:#e53935;">🎬 邀请一起录制拍视频</button>
            <button class="btn-primary" id="actCollabStreamBtn" style="width:100%;background:#388e3c;">🔴 邀请一起联机开播</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">取消</button>
        </div>
    `);
    document.getElementById('actCollabVideoBtn').onclick = () => { closeModal(); openCollabVideoPublishModal(targetType, targetId); };
    document.getElementById('actCollabStreamBtn').onclick = () => { closeModal(); handleInviteCollabStream(targetType, targetId); };
}

// 其余附属函数（撤回、共创等，均用原生onclick绑定）
function showMessageActionSheet(msgId, targetType, targetId) {
    const list = targetType === 'single' ? getAccountChatHistory(targetId) : (G.groupChatHistory[targetId] || []);
    const msg = list.find(m => m._id === msgId);
    if (!msg || msg.from !== 'player') return;
    openModal(`
        <h3>💬 消息操作</h3>
        <div style="background:#f4f7f4;padding:8px 12px;border-radius:8px;font-size:13px;color:#333;margin:8px 0 14px;">“${escapeHtml(msg.text)}”</div>
        <div class="btn-row" style="flex-direction:column;gap:8px;">
            <button class="btn-primary" id="btnActionRecall" style="width:100%;background:#388e3c;">↩️ 撤 回</button>
            <button class="btn-primary" id="btnActionEdit" style="width:100%;background:#1976d2;">✏️ 编 辑</button>
            <button class="btn-secondary" id="btnActionDelete" style="width:100%;color:#c62828;">🗑️ 删 除</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">取消</button>
        </div>
    `);
    document.getElementById('btnActionRecall').onclick = () => {
        closeModal(); const isSeen = Math.random() < 0.5;
        msg.from = 'action'; msg.text = '你撤回了一条消息'; msg._recalled = true; msg._originalText = msg.text; msg._seenByNpc = isSeen;
        renderSocialPanel(); showToast(isSeen ? '👀 对方好像已经看到了...' : '↩️ 消息已撤回', 'info', 2000); autoSaveGame();
    };
    document.getElementById('btnActionEdit').onclick = () => {
        closeModal();
        openModal(`
            <h3>✏️ 编辑消息</h3>
            <div class="form-group"><textarea id="editMsgTextInput" rows="3" style="width:100%;padding:8px;">${escapeHtml(msg.text)}</textarea></div>
            <div class="btn-row"><button class="btn-secondary" onclick="closeModal()">取消</button><button class="btn-primary" id="confirmSaveEditMsg">💾 保存</button></div>
        `);
        document.getElementById('confirmSaveEditMsg').onclick = () => {
            const newT = document.getElementById('editMsgTextInput').value.trim();
            if (!newT) { showToast('不能为空', 'error'); return; }
            msg.text = newT; closeModal(); renderSocialPanel(); showToast('✅ 修改成功', 'success'); autoSaveGame();
        };
    };
    document.getElementById('btnActionDelete').onclick = () => {
        closeModal(); const idx = list.findIndex(m => m._id === msgId); if (idx !== -1) list.splice(idx, 1);
        renderSocialPanel(); showToast('🗑️ 已抹除', 'info'); autoSaveGame();
    };
}

// 视频与直播
function openCollabVideoPublishModal(targetType, targetId) {
    const isGroup = targetType === 'group';
    let participants = isGroup ? (G.groups[targetId].members || []).map(mid => G.npcs[mid]).filter(Boolean) : [G.npcs[targetId]].filter(Boolean);
    const partnerCheckboxes = participants.map((p) => `<label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;background:#f4f6f4;padding:4px 8px;border-radius:12px;margin:2px;"><input type="checkbox" class="collab-partner-check" value="${p.id}" checked><span>${p.avatarEmoji || '👤'} ${escapeHtml(p.name)}</span></label>`).join('');

    openModal(`
        <h3>🎬 发起共创视频拍摄</h3>
        <div style="font-size:12px;color:#666;margin-bottom:8px;">共创搭档：<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${partnerCheckboxes}</div></div>
        <div class="form-group"><label>视频标题 <span class="required">*</span></label><input type="text" id="collabVideoTitle" placeholder="起一个吸睛的标题..."></div>
        <div class="form-group">
            <label>剪辑灵感</label>
            <div style="display:flex;gap:6px;"><input type="text" id="collabVideoIdea" placeholder="如：下界连环整蛊陷阱..." style="flex:1;"><button type="button" class="btn-secondary small" id="btnAiDraftVideo">🤖 AI生成</button></div>
        </div>
        <div class="form-group"><label>视频脚本剧情 <span class="required">*</span></label><textarea id="collabVideoSummary" rows="3" placeholder="描述这期视频的核心高光..."></textarea></div>
        <div class="btn-row"><button class="btn-secondary" onclick="closeModal()">取消</button><button class="btn-primary" id="btnPublishCollabVideo">🚀 发布</button></div>
    `);

    document.getElementById('btnAiDraftVideo').onclick = async () => {
        const idea = document.getElementById('collabVideoIdea').value.trim();
        const partnerNamesStr = Array.from(document.querySelectorAll('.collab-partner-check:checked')).map(cb => G.npcs[cb.value]?.name).filter(Boolean).join('、') || '好友';
        showToast('🤖 AI 正在构思...', 'info', 1500);
        try {
            const raw = await callAI([{ role: 'system', content: `你是一名游戏主播，正与搭档「${partnerNamesStr}」录制合作视频。灵感：${idea || '趣味竞技'}。生成标题和简介。\n格式：\n[TITLE]标题[/TITLE]\n[CONTENT]简介[/CONTENT]` }, { role: 'user', content: '请生成' }], { maxTokens: 300, temperature: 0.9 });
            const tMatch = raw.match(/\[TITLE\]([\s\S]*?)\[\/TITLE\]/); const cMatch = raw.match(/\[CONTENT\]([\s\S]*?)\[\/CONTENT\]/);
            if (tMatch) document.getElementById('collabVideoTitle').value = tMatch[1].trim();
            if (cMatch) document.getElementById('collabVideoSummary').value = cMatch[1].trim();
            showToast('✅ 文案已生成！', 'success', 1200);
        } catch(e) { showToast('❌ AI 生成失败', 'error'); }
    };

    document.getElementById('btnPublishCollabVideo').onclick = () => {
        const title = document.getElementById('collabVideoTitle').value.trim();
        const summary = document.getElementById('collabVideoSummary').value.trim();
        const partnerIds = Array.from(document.querySelectorAll('.collab-partner-check:checked')).map(cb => cb.value);

        if (!title || !summary || !partnerIds.length) { showToast('⚠️ 资料不全', 'error'); return; }
        if (G.actionPoints < 2) { showToast('⚠️ 行动点不足 (需要 2 点)', 'error'); return; }
        G.actionPoints -= 2;

        const partnerNames = partnerIds.map(id => G.npcs[id]?.name).filter(Boolean);
        const fullTitle = `【共创】${title} (ft. ${partnerNames.join(' & ')})`;
        const videoObj = { title: fullTitle, desc: summary, isCollab: true, partners: partnerNames, views: rand(800, 3500) + partnerNames.length * 500, likes: rand(100, 800) + partnerNames.length * 80, day: G.day, comments: [] };

        if (!G.player.videos) G.player.videos = []; G.player.videos.push(videoObj);
        if (!G.ytExternalVideos) G.ytExternalVideos = [];
        G.ytExternalVideos.unshift({ _id: 'yt_collab_' + Date.now(), channelId: 'all', title: fullTitle, author: `${G.player.ytName} × ${partnerNames.join(' × ')}`, views: `${videoObj.views}次观看`, time: '刚刚', duration: `${rand(10, 25)}:${rand(10, 59)}`, thumbnailEmoji: '🎬', summary: summary, comments: [] });

        partnerIds.forEach(id => { const n = G.npcs[id]; if (n) { n.favor = Math.min(100, (n.favor || 0) + rand(3, 7)); n.memorySummary = (n.memorySummary || '') + `\n【合作拍摄】：与主角合拍了视频《${fullTitle}》。`; } });
        G.player.followers += rand(250, 900) + partnerNames.length * 150; G.player.money += rand(60, 180);

        closeModal();
        appendStory(`🎬 你与 ${partnerNames.join('、')} 发布了共创视频《${fullTitle}》！`, '🤜 合作共创');
        addGlobalMemoryRecord(`【共创发布】：与 ${partnerNames.join('、')} 合作发布了视频《${fullTitle}》。`);
        showToast(`🎉 发布成功！`, 'success', 2500);
        advanceTimeSlot(); updateUI(); autoSaveGame(); renderSocialPanel(); checkSocialRequestsTrigger();
    };
}

function handleInviteCollabStream(targetType, targetId) {
    const isGroup = targetType === 'group';
    let partnerNames = isGroup ? (G.groups[targetId]?.members || []).map(mid => G.npcs[mid]?.name).filter(Boolean) : [G.npcs[targetId]?.name].filter(Boolean);
    if (!partnerNames.length) { showToast('找不到联动搭档', 'error'); return; }
    G.pendingCollabPartners = partnerNames;
    showToast(`📺 已向 ${partnerNames.join('、')} 发出连麦邀请！`, 'success', 2500);
    switchTab('stream');
}

function openNpcProfileCardModal(npcId) {
    const npc = G.npcs[npcId]; if (!npc) return;
    const isBlocked = isAccountBlockedByNpc(npcId, getActiveAccountInfo().id);
    openModal(`
        <div style="text-align:center;padding:10px 0;">
            <div style="display:flex;justify-content:center;margin-bottom:8px;">${renderAvatarBadge(npc, 64)}</div>
            <div style="font-weight:700;font-size:17px;color:var(--text);">${escapeHtml(npc.name)}</div>
            <div style="font-size:12px;color:#888;margin-top:2px;">好感度：<b style="color:#e53935;">${npc.favor||0}</b> / 100 ${isBlocked ? '· <span style="color:#d32f2f;">已拉黑当前账号</span>' : ''}</div>
            <div style="background:#f8faf8;padding:10px 14px;border-radius:10px;margin:12px 0;text-align:left;font-size:13px;color:#555;line-height:1.6;border:1px solid #eee;">
                <div><b>人设标签：</b>${escapeHtml(npc.persona || '普通朋友')}</div>
                ${npc.memorySummary ? `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #ddd;color:#2e7d32;"><b>🧠 私聊记忆：</b>${escapeHtml(npc.memorySummary)}</div>` : ''}
                ${npc.knownGroupEvents ? `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #ddd;color:#1565c0;"><b>👥 群聊认知：</b>${escapeHtml(npc.knownGroupEvents)}</div>` : ''}
            </div>
            <div class="btn-row" style="flex-direction:column;gap:8px;">
                <button class="btn-primary" id="cardViewMomentsBtn" style="width:100%;background:#3866c4;">📱 查看 TA 的朋友圈动态</button>
                <button class="btn-secondary" id="cardEditNpcBtn" style="width:100%;">✏️ 编辑人设与头像</button>
                <button class="btn-secondary" onclick="closeModal()" style="width:100%;">返回聊天</button>
            </div>
        </div>
    `);
    document.getElementById('cardViewMomentsBtn').onclick = () => { closeModal(); closeChat(); G.phoneNav = 'moments'; G.momentsFilterNpcId = npcId; renderSocialPanel(); };
    document.getElementById('cardEditNpcBtn').onclick = () => { closeModal(); openEditNpcModal(npcId); };
}

async function checkNpcMemorySummarize(npcId) {
    const memCfg = G.memoryConfig || {};
    if (memCfg.enabled === false) return;
    const npc = G.npcs[npcId]; if (!npc) return;
    const history = getAccountChatHistory(npcId);
    const threshold = npc.summaryThreshold || memCfg.defaultThreshold || 10;
    const keepRecent = npc.keepRecent || memCfg.defaultKeepRecent || 5;

    if (history.length >= threshold && !npc._summarizing) {
        npc._summarizing = true;
        try {
            const toSummarize = history.slice(0, Math.max(1, history.length - keepRecent));
            const textToSummarize = toSummarize.map(m => `${m.from === 'player' ? '主角' : npc.name}: ${stripThought(m.text || '')}`).join('\n');
            const prior = npc.memorySummary ? `【此前已有记忆】：\n${npc.memorySummary}\n\n` : '';
            const sys = `你是精炼的角色长期记忆整理助手。请将主角与「${npc.name}」的最新对话与此前记忆提炼合并，输出一段不超过180字的精炼记忆摘要。直接输出摘要正文，严禁废话。`;
            const summary = await callMemoryAI([{ role: 'system', content: sys }, { role: 'user', content: `${prior}【需归纳的新对话】：\n${textToSummarize}` }], { maxTokens: 400, temperature: 0.35 });
            npc.memorySummary = stripThought(summary.trim()); autoSaveGame();
            showToast(`🧠 已自动整理与 ${npc.name} 的私聊记忆！`, 'info', 2000);
        } catch (e) { showMemoryFailNoticeModal(`角色「${npc.name}」私聊记忆`, e.message); } finally { npc._summarizing = false; }
    }
}

function splitIntoChatBubbles(rawText) {
    if (!rawText) return [];
    const clean = stripThought(rawText).trim(); if (!clean) return [];
    const bubbles = []; const msgTagRegex = /\[MSG\]([\s\S]*?)\[\/MSG\]/gi; let match;
    while ((match = msgTagRegex.exec(clean)) !== null) { const item = match[1].trim(); if (item) bubbles.push(item); }
    if (bubbles.length > 0) return bubbles.slice(0, 5);
    const lines = clean.split(/\n+/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) return lines.slice(0, 5);
    if (lines.length === 1 && lines[0].length > 35) {
        const sentences = lines[0].split(/([。！？!?~～]+)/).filter(Boolean);
        let current = '';
        for (let i = 0; i < sentences.length; i++) {
            current += sentences[i];
            if (i % 2 === 1 || current.length > 20) { if (current.trim()) bubbles.push(current.trim()); current = ''; }
        }
        if (current.trim()) bubbles.push(current.trim());
        if (bubbles.length > 0) return bubbles.slice(0, 5);
    }
    return [clean];
}

async function triggerAIReplyForSingle(npcId) {
    const npc = window.G.npcs[npcId]; if (!npc) return;
    const activeAcc = getActiveAccountInfo();
    const isCurrentlyBlocked = isAccountBlockedByNpc(npcId, activeAcc.id);
    const isBehindScreenActive = !!window.G._behindScreenActive[npcId];

    if (isCurrentlyBlocked) { showToast('⚠️ 当前账号已被对方拉黑，无法接收回复。', 'error', 3000); return; }

    const history = getAccountChatHistory(npcId);
    const statusEl = document.getElementById('chatOnlineStatusText');
    if (statusEl) statusEl.innerHTML = `<span style="color:#ff9800;">✍️ 对方正在打字...</span>`;

    let recentContext = history.length > 0 ? history.slice(-10).map(m => {
        if (m._recalled) return m._seenByNpc ? `[系统提示: 对方发了"${m._originalText}"，随后撤回了，但被你亲眼看到了]` : `[系统提示: 对方撤回了一条消息]`;
        if (m.from === 'action') return `[旁白: ${m.text}]`;
        if (m.from === 'behind_screen') return `[此前你屏幕那边的线下动作: ${m.text}]`;
        if (m.sharedMoment) return `[对方转发了朋友圈动态给你: "${m.sharedMoment.body}"]`;
        return `${m.from === 'player' ? (m.senderAccount || '主角') : npc.name}: ${m.sticker ? `[发送了表情包: ${m.sticker.desc}]` : stripThought(m.text || '')}`;
    }).join('\n') : '（尚未开始对话，双方此前没有任何私聊记录）';

    let npcMemoryContext = '';
    if (npc.memorySummary) npcMemoryContext += `【历史专属记忆与朋友圈互动】\n${npc.memorySummary}\n`;
    if (npc.knownGroupEvents) npcMemoryContext += `【群聊获悉事件】\n${npc.knownGroupEvents}\n`;

    const recentPlayerPosts = (window.G.feed || []).filter(f => f.isPlayer || f.author === window.G.player?.ytName).slice(-2);
    let playerMomentsContext = recentPlayerPosts.length > 0 ? '【玩家最近发的朋友圈动态（可自然在私信中提起）】：\n' + recentPlayerPosts.map(p => `• "${p.body}" ${p.image ? '(附带图片)' : ''}${p.imageDesc ? `(配图: ${p.imageDesc})` : ''}`).join('\n') + '\n' : '';

    const tzContext = formatNpcTimezoneContext(npc.name);
    const availableStickers = (window.G.stickerLibrary || []).slice(0, 20).map(s => s.desc).join('、');
    const curFavor = npc.favor || 0;

    let favorStageRule = '';
    if (curFavor < 20) favorStageRule = `【🚨 好感度极度生疏阶段警告】：双方【刚刚认识或完全不熟】！态度冷淡、生疏、防备！严禁自来熟和过度热情。`;
    else if (curFavor < 40) favorStageRule = `【点头之交】：客气、礼貌的同行关系，保持基本社交距离。`;
    else if (curFavor < 60) favorStageRule = `【熟络朋友】：已经比较熟悉，可以互相开玩笑、互怼。`;
    else favorStageRule = `【知己/暧昧】：关系亲密，默契深厚，充满护短与偏袒。`;

    const behindScreenPrompt = isBehindScreenActive ? `\n【屏幕那边的TA（线下第三人称动作感知）】：\n玩家已开启线下动作感知。请在输出完聊天消息后，额外输出一个独立块 [BEHIND_SCREEN]...[/BEHIND_SCREEN]，细腻描写你在屏幕那边的真实线下动作（30~60字）。\n` : '';

    const sysPrompt = `你正在扮演真实沉浸的 Minecraft 主播/好友「${npc.name}」（性格人设：${npc.persona || '同伴'}）。
${favorStageRule}
${tzContext}
${npcMemoryContext}
${playerMomentsContext}

【严禁出戏括号与纯净打字铁律】：
1. 气泡内【绝对禁止】包含动作括号（如"*微笑*"）！把聊天框当成真实的微信打字！
2. 支持表情包斗图：语境合适可写 [STICKER:表情关键词]（参考：${availableStickers}）。
3. 输出 2 到 4 条短消息气泡，用 [MSG]...[/MSG] 包裹：
[MSG]第一句话[/MSG]
[MSG]第二句话[/MSG]
${behindScreenPrompt}`;

    try {
        window.G.isGenerating = true; if (typeof showLoading === 'function') showLoading();
        const rawReply = await callAI([{ role: 'system', content: sysPrompt }, { role: 'user', content: history.length > 0 ? '请连续发送多条回复。' : '请打招呼。' }], { maxTokens: 550, temperature: 0.9 });
        if (typeof hideLoading === 'function') hideLoading();

        let cleanText = rawReply || ''; let behindScreenActionText = '';
        const bsMatch = cleanText.match(/\[BEHIND_SCREEN\]([\s\S]*?)\[\/BEHIND_SCREEN\]/i);
        if (bsMatch) { behindScreenActionText = stripThought(bsMatch[1].trim()); cleanText = cleanText.replace(/\[BEHIND_SCREEN\][\s\S]*?\[\/BEHIND_SCREEN\]/gi, '').trim(); }

        const bubbles = splitIntoChatBubbles(cleanText);
        const finalBubbles = (bubbles && bubbles.length) ? bubbles : ['你好。'];

        for (let i = 0; i < finalBubbles.length; i++) {
            const bText = finalBubbles[i];
            const stkMatch = bText.match(/\[STICKER:([^\]]+)\]/i);
            if (stkMatch) {
                const stkObj = findStickerByKeyword(stkMatch[1]);
                if (stkObj) pushChatMessageSafe(npcId, { from: 'npc', text: `[表情: ${stkObj.desc}]`, sticker: stkObj, time: new Date().toLocaleTimeString().slice(0, 5) });
                else pushChatMessageSafe(npcId, { from: 'npc', text: bText.replace(/\[STICKER:[^\]]+\]/gi, '😏'), time: new Date().toLocaleTimeString().slice(0, 5) });
            } else {
                pushChatMessageSafe(npcId, { from: 'npc', text: bText, time: new Date().toLocaleTimeString().slice(0, 5) });
            }
            const cont = (dom && dom.socialTab) || document.getElementById('socialTab');
            if (window.G.currentChatNpc === npcId && cont) renderSingleChatWindow(cont);
            if (i < finalBubbles.length - 1) await new Promise(res => setTimeout(res, 500));
        }

        if (behindScreenActionText && isBehindScreenActive) {
            pushChatMessageSafe(npcId, { from: 'behind_screen', text: behindScreenActionText, time: new Date().toLocaleTimeString().slice(0, 5) });
            const cont = (dom && dom.socialTab) || document.getElementById('socialTab');
            if (window.G.currentChatNpc === npcId && cont) renderSingleChatWindow(cont);
        }
        autoSaveGame();
    } catch (e) {
        if (typeof hideLoading === 'function') hideLoading(); console.error('私聊 AI 回复失败', e); showToast('❌ 回复失败', 'error');
    } finally {
        window.G.isGenerating = false;
        const curStatusEl = document.getElementById('chatOnlineStatusText');
        if (curStatusEl) curStatusEl.innerHTML = `${isAccountBlockedByNpc(npcId, activeAcc.id) ? '<span style="color:#d32f2f;">⚠️ TA已拉黑</span>' : '● 在线'} ${npc.memorySummary ? '· 🧠记忆' : ''}`;
    }
}

async function checkGroupMemorySummarize(gid) {
    const memCfg = G.memoryConfig || {};
    if (memCfg.enabled === false) return;
    const grp = G.groups[gid]; if (!grp) return;
    const history = G.groupChatHistory[gid] || [];
    const threshold = grp.summaryThreshold || memCfg.defaultThreshold || 10;
    const keepRecent = grp.keepRecent || memCfg.defaultKeepRecent || 5;

    if (history.length >= threshold && !grp._summarizing) {
        grp._summarizing = true;
        try {
            const toSummarize = history.slice(0, Math.max(1, history.length - keepRecent));
            const textToSummarize = toSummarize.map(m => `${m.senderName}: ${stripThought(m.text || '')}`).join('\n');
            const prior = G.groupMemories[gid] ? `【群聊已有纪要】：\n${G.groupMemories[gid]}\n\n` : '';
            const sys = `你是群聊记忆纪要整理员。提炼一段150字以内的核心纪要，包含八卦、共同约定、关键笑点与事件。直接输出纪要正文。`;
            const summary = await callMemoryAI([{ role: 'system', content: sys }, { role: 'user', content: `${prior}【最新群聊记录】：\n${textToSummarize}` }], { maxTokens: 350, temperature: 0.35 });
            const cleanSummary = stripThought(summary.trim());
            G.groupMemories[gid] = cleanSummary;
            (grp.members || []).forEach(mid => { const targetNpc = G.npcs[mid]; if (targetNpc) targetNpc.knownGroupEvents = `【在群「${grp.name}」获悉】：${cleanSummary}`; });
            autoSaveGame(); showToast(`👥 已同步提炼群聊「${grp.name}」记忆！`, 'info', 2000);
        } catch (e) { showMemoryFailNoticeModal(`群聊「${grp.name}」记忆`, e.message); } finally { grp._summarizing = false; }
    }
}

async function triggerGroupAIReply(gid) {
    const grp = G.groups[gid]; if (!grp) return;
    const history = G.groupChatHistory[gid] || [];
    if (!history.length) { showToast('请先在群里发一条消息'); return; }

    let activeList = (grp.activeMembers && grp.activeMembers.length) ? grp.activeMembers : (grp.members || []);
    activeList = activeList.filter(mid => G.npcs[mid]);
    if (!activeList.length) activeList = (grp.members || []).filter(mid => G.npcs[mid]);
    if (!activeList.length) activeList = Object.keys(G.npcs).slice(0, 2);
    if (!activeList.length) { showToast('群内暂无可接话的成员'); return; }

    const activeStreamers = []; const activeFans = [];
    activeList.forEach(mid => { const n = G.npcs[mid]; if (n) { if (!n.isCustom) activeStreamers.push(n); else activeFans.push(n); } });

    const recent = history.slice(-10).map(m => {
        if (m._recalled) return m._seenByNpc ? `[群提示: ${m.senderName}发了"${m._originalText}"，又撤回了，但被群友看到了]` : `[群提示: ${m.senderName}撤回了一条消息]`;
        return `${m.senderName}: ${stripThought(m.text || '')}`;
    }).join('\n');

    try {
        G.isGenerating = true; if (typeof showLoading === 'function') showLoading();
        let generatedCount = 0;

        if (grp.streamerMode === 'separate' && activeStreamers.length) {
            const picked = activeStreamers.sort(() => 0.5 - Math.random()).slice(0, rand(1, 2));
            for (const st of picked) {
                try {
                    const sys = `你是主播「${st.name}」，人设：${st.persona}。你正在群聊「${grp.name}」中。自然发一句群聊回复。只输出简明正文，不要包含引号或角色名前缀。`;
                    const rep = await callAI([{ role: 'system', content: sys }, { role: 'user', content: `群内最近发言：\n${recent}` }], { maxTokens: 200, temperature: 0.9 });
                    const cleanRep = stripThought(rep.replace(/^[^\s:：]{1,12}[:：]\s*/, '').trim());
                    if (cleanRep) {
                        if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
                        G.groupChatHistory[gid].push({ _id: 'gmsg_' + Date.now() + '_' + rand(100, 999), from: 'npc', senderName: st.name, senderAvatar: st.avatarEmoji || '👤', senderAvatarUrl: st.avatarUrl || null, text: cleanRep, time: new Date().toLocaleTimeString().slice(0, 5) });
                        generatedCount++;
                    }
                } catch(err) { console.warn(`主播 ${st.name} 单独回复失败:`, err); }
            }
        }

        if (grp.streamerMode !== 'separate' || (activeFans.length && generatedCount === 0)) {
            const memberPoolDesc = activeList.map(mid => { const n = G.npcs[mid]; return n ? `【${n.name}】(${n.persona || '群友'})` : null; }).filter(Boolean).join('、');
            const sys = `你正在模拟 Minecraft 主播/粉丝群聊「${grp.name}」。群内可发言成员：${memberPoolDesc}。
挑选 1 到 3 位成员进行真实自然的接话或吐槽互动。
【格式规范】每行一条，格式：[MSG name=成员名字]发言内容[/MSG]`;
            const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: `【群聊最近动态】：\n${recent}\n请接话：` }], { maxTokens: 600, temperature: 0.95 });

            const re = /\[MSG(?:\s+name=|\s*:\s*)(["']?)([^\]"'\n]+)\1\]([\s\S]*?)(?:\[\/MSG\]|(?=\[MSG)|$)/gi;
            let m;
            while ((m = re.exec(raw)) !== null) {
                const sName = m[2].trim(); const body = stripThought(m[3].replace(/\[\/?MSG[^\]]*\]/gi, '').trim());
                if (!body) continue;
                const matchedNpc = Object.values(G.npcs).find(n => n.name.trim() === sName || sName.includes(n.name));
                const finalName = matchedNpc ? matchedNpc.name : sName;
                if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
                G.groupChatHistory[gid].push({ _id: 'gmsg_' + Date.now() + '_' + rand(100, 999), from: 'npc', senderName: finalName, senderAvatar: matchedNpc ? (matchedNpc.avatarEmoji || '👤') : '💬', senderAvatarUrl: matchedNpc ? (matchedNpc.avatarUrl || null) : null, text: body, time: new Date().toLocaleTimeString().slice(0, 5) });
                generatedCount++;
            }

            if (generatedCount === 0 && raw.trim()) {
                const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 2);
                for (const line of lines) {
                    const lineMatch = line.match(/^([^:：]{1,12})[:：]\s*(.+)$/);
                    let speaker = null; let text = line;
                    if (lineMatch) { speaker = lineMatch[1].trim(); text = lineMatch[2].trim(); }
                    else { const randomNpcId = pick(activeList); speaker = G.npcs[randomNpcId] ? G.npcs[randomNpcId].name : '群友'; }
                    const cleanBody = stripThought(text.replace(/\[\/?MSG[^\]]*\]/gi, '').trim());
                    if (cleanBody) {
                        const matchedNpc = Object.values(G.npcs).find(n => n.name === speaker);
                        if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
                        G.groupChatHistory[gid].push({ _id: 'gmsg_' + Date.now() + '_' + rand(100, 999), from: 'npc', senderName: matchedNpc ? matchedNpc.name : speaker, senderAvatar: matchedNpc ? (matchedNpc.avatarEmoji || '👤') : '💬', senderAvatarUrl: matchedNpc ? (matchedNpc.avatarUrl || null) : null, text: cleanBody, time: new Date().toLocaleTimeString().slice(0, 5) });
                        generatedCount++;
                    }
                }
            }
        }

        if (typeof hideLoading === 'function') hideLoading();
        if (generatedCount > 0) {
            showToast(`⚡ 群内收到 ${generatedCount} 条新回复！`, 'success', 1500);
            await checkGroupMemorySummarize(gid); autoSaveGame();
        } else { showToast('⚠️ 本轮成员都在潜水，再试一次吧', 'info', 2000); }
    } catch (e) {
        if (typeof hideLoading === 'function') hideLoading(); console.error('群聊生成失败', e); showToast('❌ 群聊生成失败', 'error');
    } finally { G.isGenerating = false; }
}

function openMemoryModal() { renderMemoryModalView(); }
window.openMemoryModal = openMemoryModal;

function renderMemoryModalView() {
    ensureNpcIntegrity();
    const memCfg = G.memoryConfig || { enabled: true, defaultThreshold: 10, defaultKeepRecent: 5, selectedModelKey: '' };
    G.memoryConfig = memCfg;

    let unarchivedCount = 0; let existingSummaries = [];
    if (activeMemoryScope === 'story') {
        unarchivedCount = (G.storyHistory || []).length; existingSummaries = G.memorySummaries || [];
    } else if (activeMemoryScope === 'character') {
        const npcId = selectedScopeTargetId || Object.keys(G.npcs)[0]; selectedScopeTargetId = npcId;
        unarchivedCount = getAccountChatHistory(npcId).length; existingSummaries = G.npcs[npcId]?.memorySummary ? [{ text: G.npcs[npcId].memorySummary, day: G.day }] : [];
    } else if (activeMemoryScope === 'group') {
        const gid = selectedScopeTargetId || Object.keys(G.groups)[0]; selectedScopeTargetId = gid;
        unarchivedCount = (G.groupChatHistory[gid] || []).length; existingSummaries = G.groupMemories[gid] ? [{ text: G.groupMemories[gid], day: G.day }] : [];
    }

    const modelOptions = getAvailableMemoryModels().map(m => `<option value="${m.key}" ${m.key === memCfg.selectedModelKey ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('');
    let summariesListHtml = '<div style="color:#888;font-size:12px;padding:4px 0;">暂无</div>';
    if (existingSummaries.length > 0) {
        summariesListHtml = existingSummaries.map((s, idx) => `
            <div style="background:#f9fcf9;border:1px solid #e2ebe2;border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:12px;line-height:1.5;position:relative;">
                <div style="display:flex;justify-content:space-between;color:#777;font-size:11px;margin-bottom:3px;">
                    <span>📌 总结存档 #${idx + 1}</span>
                    <button onclick="handleDeleteSummaryItem(${idx})" style="border:none;background:none;color:#e53935;cursor:pointer;font-size:11px;">🗑️ 删除</button>
                </div>
                <div style="color:#333;">${escapeHtml(s.text || s)}</div>
            </div>
        `).join('');
    }

    let scopeSelectorHtml = `
    <div style="display:flex;gap:6px;margin-bottom:12px;background:#f0f4f0;padding:4px;border-radius:10px;">
        <button onclick="switchMemoryScope('story')" style="flex:1;border:none;padding:5px 0;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;background:${activeMemoryScope==='story'?'#fff':'transparent'};color:${activeMemoryScope==='story'?'var(--primary)':'#666'};">📖 主线剧情</button>
        <button onclick="switchMemoryScope('character')" style="flex:1;border:none;padding:5px 0;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;background:${activeMemoryScope==='character'?'#fff':'transparent'};color:${activeMemoryScope==='character'?'var(--primary)':'#666'};">👤 角色私聊</button>
        <button onclick="switchMemoryScope('group')" style="flex:1;border:none;padding:5px 0;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;background:${activeMemoryScope==='group'?'#fff':'transparent'};color:${activeMemoryScope==='group'?'var(--primary)':'#666'};">👥 群聊公共</button>
    </div>
    `;

    if (activeMemoryScope === 'character') {
        const npcOpts = Object.values(G.npcs || {}).map(n => `<option value="${n.id}" ${n.id === selectedScopeTargetId ? 'selected' : ''}>${escapeHtml(n.name)}</option>`).join('');
        scopeSelectorHtml += `<div style="margin-bottom:10px;display:flex;align-items:center;gap:8px;font-size:12px;"><span>选择角色：</span><select id="scopeTargetSelect" style="flex:1;padding:4px 8px;border-radius:6px;border:1px solid #ccc;font-size:12px;">${npcOpts || '<option>暂无角色</option>'}</select></div>`;
    } else if (activeMemoryScope === 'group') {
        const grpOpts = Object.values(G.groups || {}).map(g => `<option value="${g.id}" ${g.id === selectedScopeTargetId ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('');
        scopeSelectorHtml += `<div style="margin-bottom:10px;display:flex;align-items:center;gap:8px;font-size:12px;"><span>选择群聊：</span><select id="scopeTargetSelect" style="flex:1;padding:4px 8px;border-radius:6px;border:1px solid #ccc;font-size:12px;">${grpOpts || '<option>暂无群聊</option>'}</select></div>`;
    }

    openModal(`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:6px;font-weight:800;font-size:18px;color:#2e7d32;"><span>🧠 记忆总结</span></div>
        </div>
        ${scopeSelectorHtml}
        <p style="font-size:12.5px;color:#555;line-height:1.6;margin-bottom:12px;">
            当前共有 <b>${unarchivedCount}</b> 轮未归档的记录，AI 会读取这些内容。你可以让 AI 将较早的内容总结为一段精炼记忆，之后 AI 将只读取「记忆总结 + 最近若干轮」，不再读取被总结掉的原文。
        </p>
        <div class="form-group" style="margin-bottom:10px;">
            <label style="font-size:12px;color:#333;font-weight:600;">保留最近几轮不总结</label>
            <input type="number" id="memKeepRecentInput" min="1" max="30" value="${memCfg.defaultKeepRecent || 5}" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #ccc;font-size:13px;">
        </div>
        <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:12px;color:#333;font-weight:600;">🧩 用于总结的模型</label>
            <select id="memModelSelect" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #ccc;font-size:13px;background:#fff;">${modelOptions}</select>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:10px;">
            <button class="btn-secondary" onclick="closeModal()" style="flex:1;border-radius:10px;font-size:13px;padding:8px 0;">取消</button>
            <button class="btn-primary" id="btnRunAiSummary" style="flex:1.4;border-radius:10px;background:#2e7d32;font-size:13px;padding:8px 0;">🧠 AI 生成总结</button>
        </div>
        <button class="btn-secondary" id="btnManualWriteSummary" style="width:100%;padding:7px 0;font-size:12px;border-radius:8px;margin-bottom:14px;background:#fdfcf9;border:1px solid #eedec8;color:#7a5223;">✍️ 改为手动填写总结</button>
        <div style="border-top:1px solid #eee;padding-top:10px;margin-top:8px;">
            <div style="font-weight:700;font-size:13px;color:#333;margin-bottom:6px;">⚙️ 自动总结</div>
            <label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#444;line-height:1.5;cursor:pointer;margin-bottom:8px;">
                <input type="checkbox" id="memAutoSummaryCheck" ${memCfg.enabled ? 'checked' : ''} style="width:16px;height:16px;margin-top:2px;">
                <span>开启自动总结（后台自动触发总结）</span>
            </label>
            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-size:12px;color:#666;">达到多少轮未归档时自动触发</label>
                <input type="number" id="memAutoThresholdInput" min="4" max="60" value="${memCfg.defaultThreshold || 10}" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #ccc;font-size:13px;">
            </div>
        </div>
        <div style="border-top:1px solid #eee;padding-top:10px;">
            <div style="font-weight:700;font-size:13px;color:#333;margin-bottom:6px;">已有记忆总结 (${existingSummaries.length})</div>
            <div style="max-height:150px;overflow-y:auto;">${summariesListHtml}</div>
        </div>
    `);

    const stSelect = document.getElementById('scopeTargetSelect');
    if (stSelect) { stSelect.onchange = () => { selectedScopeTargetId = stSelect.value; renderMemoryModalView(); }; }
    document.getElementById('btnRunAiSummary').onclick = async () => { await executeManualAiSummary(); };
    document.getElementById('btnManualWriteSummary').onclick = () => { openManualMemoryInputModal(); };
    document.getElementById('memAutoSummaryCheck').onchange = (e) => { G.memoryConfig.enabled = e.target.checked; autoSaveGame(); };
    document.getElementById('memAutoThresholdInput').onchange = (e) => { G.memoryConfig.defaultThreshold = parseInt(e.target.value) || 10; autoSaveGame(); };
    document.getElementById('memKeepRecentInput').onchange = (e) => { G.memoryConfig.defaultKeepRecent = parseInt(e.target.value) || 5; autoSaveGame(); };
    document.getElementById('memModelSelect').onchange = (e) => { G.memoryConfig.selectedModelKey = e.target.value; autoSaveGame(); };
}

window.switchMemoryScope = function(scope) {
    activeMemoryScope = scope;
    if (scope === 'character') selectedScopeTargetId = Object.keys(G.npcs)[0];
    if (scope === 'group') selectedScopeTargetId = Object.keys(G.groups)[0];
    renderMemoryModalView();
};

window.handleDeleteSummaryItem = function(idx) {
    if (activeMemoryScope === 'story') {
        if (G.memorySummaries && G.memorySummaries[idx]) G.memorySummaries.splice(idx, 1);
    } else if (activeMemoryScope === 'character') {
        const npc = G.npcs[selectedScopeTargetId];
        if (npc) npc.memorySummary = '';
    } else if (activeMemoryScope === 'group') {
        delete G.groupMemories[selectedScopeTargetId];
    }
    showToast('🗑️ 记忆总结项已删除', 'info', 1200);
    renderMemoryModalView();
    autoSaveGame();
};

async function executeManualAiSummary() {
    const keepRecent = parseInt(document.getElementById('memKeepRecentInput').value) || 5;
    const selectedModel = document.getElementById('memModelSelect').value;
    G.memoryConfig.selectedModelKey = selectedModel;
    G.memoryConfig.defaultKeepRecent = keepRecent;

    let textToSummarize = ''; let prior = '';
    if (activeMemoryScope === 'story') {
        const list = G.storyHistory || [];
        if (list.length <= keepRecent) { showToast(`当前记录数不满足总结要求`, 'info', 2000); return; }
        const sliceItems = list.slice(0, list.length - keepRecent);
        textToSummarize = sliceItems.map(item => `[第${item.day}天]: ${item.text}`).join('\n');
        prior = (G.memorySummaries || []).map(s => s.text || s).join('\n');
    } else if (activeMemoryScope === 'character') {
        const npc = G.npcs[selectedScopeTargetId];
        const list = getAccountChatHistory(selectedScopeTargetId);
        if (list.length <= keepRecent) { showToast(`当前记录数不满足总结要求`, 'info', 2000); return; }
        const sliceItems = list.slice(0, list.length - keepRecent);
        textToSummarize = sliceItems.map(m => `${m.from === 'player' ? '主角' : npc.name}: ${stripThought(m.text || '')}`).join('\n');
        prior = npc.memorySummary || '';
    } else if (activeMemoryScope === 'group') {
        const grp = G.groups[selectedScopeTargetId];
        const list = G.groupChatHistory[selectedScopeTargetId] || [];
        if (list.length <= keepRecent) { showToast(`当前记录数不满足总结要求`, 'info', 2000); return; }
        const sliceItems = list.slice(0, list.length - keepRecent);
        textToSummarize = sliceItems.map(m => `${m.senderName}: ${stripThought(m.text || '')}`).join('\n');
        prior = G.groupMemories[selectedScopeTargetId] || '';
    }

    closeModal();
    if (typeof showLoading === 'function') showLoading();
    G.isGenerating = true;

    try {
        const sys = `你是资深的剧情记忆提炼专家。请将以下对话/事件归纳为精炼核心记忆（150-250字内）。直接输出记忆文本。`;
        const userPrompt = `${prior ? '【已有历史记忆摘要】：\n' + prior + '\n\n' : ''}【需归档的新内容】：\n${textToSummarize}`;
        const summary = await callMemoryAI([{ role: 'system', content: sys }, { role: 'user', content: userPrompt }], { maxTokens: 500, temperature: 0.35 });
        const cleanSummary = stripThought(summary.trim());

        if (activeMemoryScope === 'story') {
            addGlobalMemoryRecord(cleanSummary);
            G.storyHistory = (G.storyHistory || []).slice(G.storyHistory.length - keepRecent);
        } else if (activeMemoryScope === 'character') {
            G.npcs[selectedScopeTargetId].memorySummary = cleanSummary;
        } else if (activeMemoryScope === 'group') {
            G.groupMemories[selectedScopeTargetId] = cleanSummary;
            (G.groups[selectedScopeTargetId].members || []).forEach(mid => { if (G.npcs[mid]) G.npcs[mid].knownGroupEvents = `【在群获悉】：${cleanSummary}`; });
        }

        if (typeof hideLoading === 'function') hideLoading();
        showToast('🎉 AI 记忆总结生成完毕！已成功归档。', 'success', 2500);
        autoSaveGame(); openMemoryModal();
    } catch(e) {
        if (typeof hideLoading === 'function') hideLoading();
        showMemoryFailNoticeModal('AI 记忆总结', e.message);
    } finally { G.isGenerating = false; }
}

function openManualMemoryInputModal() {
    openModal(`
        <h3>✍️ 手动填写记忆总结</h3>
        <p style="font-size:12px;color:#666;">直接输入你希望保留并归档给 AI 读取的核心记忆：</p>
        <div class="form-group"><textarea id="manualMemoryText" rows="4" placeholder="写下关键事件、人际关系或者剧情转折..."></textarea></div>
        <div class="btn-row"><button class="btn-secondary" onclick="openMemoryModal()">返回</button><button class="btn-primary" id="btnSaveManualMemory">💾 保存记忆</button></div>
    `);

    document.getElementById('btnSaveManualMemory').onclick = () => {
        const val = document.getElementById('manualMemoryText').value.trim();
        if (!val) { showToast('⚠️ 记忆内容不能为空', 'error'); return; }
        if (activeMemoryScope === 'story') { addGlobalMemoryRecord(val); }
        else if (activeMemoryScope === 'character') { if (G.npcs[selectedScopeTargetId]) G.npcs[selectedScopeTargetId].memorySummary = val; }
        else if (activeMemoryScope === 'group') {
            G.groupMemories[selectedScopeTargetId] = val;
            const grp = G.groups[selectedScopeTargetId];
            if (grp) (grp.members || []).forEach(mid => { if (G.npcs[mid]) G.npcs[mid].knownGroupEvents = `【在群获悉】：${val}`; });
        }
        showToast('✅ 记忆总结已保存', 'success'); autoSaveGame(); openMemoryModal();
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

// 暴露全局变量与函数
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
// (这里补齐了之前可能会缺少的导出)
window.openAddChatTargetModal = openAddChatTargetModal;
window.openEditNpcModal = openEditNpcModal;
window.openEditGroupModal = openEditGroupModal;
window.openGroupSettingsModal = openGroupSettingsModal;
window.openNpcProfileCardModal = openNpcProfileCardModal;
window.handleFriendRequestAction = handleFriendRequestAction;
window.handleGroupInviteAction = handleGroupInviteAction;
window.toggleCollection = toggleCollection;
window.toggleColVideoComments = toggleColVideoComments;
window.acceptSponsor = acceptSponsor;
window.checkSocialRequestsTrigger = checkSocialRequestsTrigger;