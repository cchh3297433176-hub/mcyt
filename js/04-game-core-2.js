// js/04-game-core-2.js
// 成就系统、商店与赞助、频道面板、数据面板、回忆录、记忆总结与记忆底层引擎
// ============================================================

// 成就系统
// ============================================================
function checkAchievements() {
    if (!G.unlockedAchievements) G.unlockedAchievements = [];
    for (const ach of ACHIEVEMENTS) {
        if (G.unlockedAchievements.includes(ach.id)) continue;
        if (ach.check()) {
            unlockAchievement(ach);
        }
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
    const categories = {
        fans: '👥 粉丝里程碑',
        video: '🎬 视频创作',
        stream: '📺 直播成就',
        social: '💕 社交成就'
    };
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
        G.sponsorOffers = [{
            ...type,
            expires: G.day + 5,
            accepted: false,
        }];
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
    updateUI();
    renderShop();
    checkAchievements();
    autoSaveGame();
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
        { id: 'hot1', label: '🔥 热度小包', desc: '一次性增加 5,000 粉丝', cost: 1000, effect: () => { G.player.followers += 5000; if (typeof checkSocialRequestsTrigger === 'function') checkSocialRequestsTrigger(); } },
        { id: 'hot2', label: '🔥 热度中包', desc: '一次性增加 20,000 粉丝', cost: 3500, effect: () => { G.player.followers += 20000; if (typeof checkSocialRequestsTrigger === 'function') checkSocialRequestsTrigger(); } },
        { id: 'hot3', label: '🔥 热度大包', desc: '一次性增加 50,000 粉丝', cost: 8000, effect: () => { G.player.followers += 50000; if (typeof checkSocialRequestsTrigger === 'function') checkSocialRequestsTrigger(); } },
    ];
    let html = `
    <h3>🛒 商店</h3>
    <div style="margin-bottom:12px;">
        <div style="font-weight:600;font-size:16px;">💰 当前金币：${p.money}</div>
    </div>
    <div style="font-weight:600;font-size:15px;margin-bottom:6px;">📦 热度道具</div>
    <div class="shop-grid">
    `;
    for (const item of items) {
        const canBuy = p.money >= item.cost;
        html += `
        <div class="shop-item">
            <div class="info">
                <div class="name">${item.label}</div>
                <div class="desc">${item.desc}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
                <span class="price">💰 ${item.cost}</span>
                <button class="buy-btn" data-item="${item.id}" ${canBuy ? '' : 'disabled'}>购买</button>
            </div>
        </div>
        `;
    }
    html += `</div>`;
    html += `
    <div style="font-weight:600;font-size:15px;margin:14px 0 6px;">🎥 直播设备 (等级 ${equipLevel}/${equipMax})</div>
    <div style="background:var(--card);border-radius:var(--radius);padding:12px;box-shadow:var(--shadow);">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">
            <span>当前等级系数：<strong>${equipMultipliers[equipLevel].toFixed(1)}x</strong></span>
            <span>下一级：<strong>${equipMultipliers[equipLevel+1] ? equipMultipliers[equipLevel+1].toFixed(1)+'x' : '已满级'}</strong></span>
            ${equipLevel < equipMax ? `<button class="buy-btn" id="upgradeEquip" ${p.money >= equipCosts[equipLevel] ? '' : 'disabled'}>升级 (💰 ${equipCosts[equipLevel]})</button>` : '<span>已满级</span>'}
        </div>
    </div>
    `;
    html += `<div style="font-weight:600;font-size:15px;margin:14px 0 6px;">📢 合作邀约</div>`;
    if (G.player.followers < 10000) {
        html += `<div style="color:var(--text2);font-size:13px;padding:8px 0;">粉丝达到 10,000 后解锁赞助合作。</div>`;
    } else if (G.sponsorOffers && G.sponsorOffers.length > 0) {
        for (let i = 0; i < G.sponsorOffers.length; i++) {
            const offer = G.sponsorOffers[i];
            if (offer.accepted) {
                html += `<div class="sponsor-card" style="border-left-color:#4caf50;">
                    <div class="sponsor-name">✅ ${offer.name}</div>
                    <div class="sponsor-desc">已接受，获得 ${offer.reward} 金币</div>
                </div>`;
            } else {
                html += `
                <div class="sponsor-card">
                    <div class="sponsor-name">${offer.name}</div>
                    <div class="sponsor-desc">${offer.desc} (风险: ${Math.round(offer.risk*100)}% 掉粉)</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
                        <span class="sponsor-reward">💰 ${offer.reward} 金币</span>
                        <button class="sponsor-btn" onclick="acceptSponsor(${i})">接受合作</button>
                    </div>
                </div>
                `;
            }
        }
    } else {
        html += `<div style="color:var(--text2);font-size:13px;padding:8px 0;">暂无合作邀约，稍后再来看看吧。</div>`;
    }
    container.innerHTML = html;
    container.querySelectorAll('.buy-btn[data-item]').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.item;
            const item = items.find(i => i.id === id);
            if (!item) return;
            if (G.player.money < item.cost) { showToast('金币不足', 'error'); return; }
            G.player.money -= item.cost;
            item.effect();
            updateUI();
            renderShop();
            showToast('✅ 购买成功！', 'success');
            addMemoir('商店购买', `购买了 ${item.label}`);
            autoSaveGame();
        });
    });
    const upgradeBtn = document.getElementById('upgradeEquip');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', function() {
            const level = G.player.equipmentLevel || 1;
            if (level >= equipMax) { showToast('已满级', 'error'); return; }
            const cost = equipCosts[level];
            if (G.player.money < cost) { showToast('金币不足', 'error'); return; }
            G.player.money -= cost;
            G.player.equipmentLevel = level + 1;
            updateUI();
            renderShop();
            showToast(`🎥 设备升级至 ${G.player.equipmentLevel} 级！`, 'success');
            addMemoir('设备升级', `直播设备升级至 ${G.player.equipmentLevel} 级`);
            autoSaveGame();
        });
    }
}
window.acceptSponsor = acceptSponsor;

// ============================================================
// 频道面板
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
    const activeAccount = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: G.player.ytName };

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

    const currentAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: G.player.ytName, isAlt: false };
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
    advanceTimeSlot();
    autoSaveGame();
    if (typeof checkSocialRequestsTrigger === 'function') checkSocialRequestsTrigger();
}

// ============================================================
// 数据面板
// ============================================================
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
            <div class="skill-row">
                <div class="sname">${label}</div>
                <div class="track"><div class="fill" style="width:${val}%;"></div></div>
                <div class="sval">${val}</div>
            </div>
        </div>
        `;
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
            const isBlocked = (typeof isAccountBlockedByNpc === 'function') ? isAccountBlockedByNpc(id, 'main') : false;
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
        const recent = p.streamHistory.slice(-5).reverse();
        for (const rec of recent) {
            html += `
            <div style="background:var(--card);border-radius:12px;padding:10px;margin-bottom:8px;box-shadow:var(--shadow);border-left:3px solid var(--primary);">
                <div style="display:flex;justify-content:space-between;font-size:13px;flex-wrap:wrap;gap:4px;">
                    <span>📅 第${rec.day}天</span>
                    <span>👥 ${rec.maxViewers || rec.viewers || 0} 观众</span>
                    <span>💰 +${rec.moneyEarned || 0}</span>
                    <span>❤️ +${rec.fansGained || 0}</span>
                </div>
            </div>
            `;
        }
    }
    const nextMs = getNextMilestone();
    html += `
    <div style="background:var(--card);border-radius:12px;padding:10px;margin-top:10px;box-shadow:var(--shadow);border-left:3px solid var(--gold);">
        <div style="font-size:13px;color:var(--text2);">🎯 下一个里程碑：<strong>${nextMs}</strong></div>
    </div>
    `;
    container.innerHTML = html;
}

// ============================================================
// 🧠 记忆系统核心配置与底层 API 封装
// ============================================================
if (!G.memoryConfig) {
    G.memoryConfig = {
        enabled: true,
        defaultThreshold: 10,
        defaultKeepRecent: 5,
        selectedModelKey: ''
    };
}
if (!G.memorySummaries) G.memorySummaries = [];
if (!G.groupMemories) G.groupMemories = {};

function ensureNpcIntegrity() {
    if (!G.npcs || typeof G.npcs !== 'object') G.npcs = {};
    if (!G.chatHistory || typeof G.chatHistory !== 'object') G.chatHistory = {};

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
        G.aiProfiles.forEach(p => {
            list.push({ key: 'profile_' + p.id, name: p.name || p.model, model: p.model, profile: p });
        });
    }
    if (G.ai && G.ai.model) {
        list.push({ key: 'current_ai', name: `主模型 (${G.ai.model})`, model: G.ai.model, profile: G.ai });
    }
    if (!list.length) {
        list.push({ key: 'default_cheap', name: '便宜模型 (deepseek-chat)', model: 'deepseek-chat', profile: null });
    }
    return list;
}

async function callMemoryAI(messages, options = {}) {
    const cfg = G.memoryConfig || {};
    let targetProfile = null;

    if (cfg.selectedModelKey) {
        const models = getAvailableMemoryModels();
        const found = models.find(m => m.key === cfg.selectedModelKey);
        if (found && found.profile && found.profile.apiKey) {
            targetProfile = found.profile;
        }
    }

    if (targetProfile && targetProfile.baseUrl && targetProfile.apiKey) {
        const baseUrl = targetProfile.baseUrl.replace(/\/+$/, '');
        const model = targetProfile.model || 'deepseek-chat';
        const apiKey = targetProfile.apiKey;
        const url = `${baseUrl}/chat/completions`;

        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: options.temperature !== undefined ? options.temperature : 0.35,
                max_tokens: options.maxTokens || 650
            })
        });

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`记忆专用 API [${resp.status}]: ${errText.slice(0, 100)}`);
        }
        const data = await resp.json();
        return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    }

    return await callAI(messages, {
        temperature: options.temperature !== undefined ? options.temperature : 0.35,
        maxTokens: options.maxTokens || 650
    });
}

function showMemoryFailNoticeModal(moduleName, errorMsg) {
    openModal(`
        <div style="text-align:center;padding:10px 0;">
            <div style="font-size:36px;margin-bottom:8px;">⚠️</div>
            <h3 style="color:#d32f2f;margin-bottom:6px;">自动记忆总结未完成</h3>
            <div style="font-size:13px;color:#555;line-height:1.6;margin:10px 0;background:#fff8f8;padding:10px 12px;border-radius:8px;border:1px solid #ffd8d8;text-align:left;">
                <div><b>失败模块：</b>${escapeHtml(moduleName)}</div>
                <div style="font-size:11px;color:#888;margin-top:4px;"><b>原因提示：</b>${escapeHtml(errorMsg || '网络超时或接口异常')}</div>
            </div>
            <p style="font-size:12px;color:#777;">已保留原文继续游玩，不会影响正常剧情。点击下方即可关闭提示。</p>
            <div class="btn-row" style="margin-top:14px;">
                <button class="btn-primary" onclick="closeModal()" style="width:100%;">我知道了，关闭提示</button>
            </div>
        </div>
    `);
}

function addGlobalMemoryRecord(text) {
    if (!text) return;
    if (!G.memorySummaries) G.memorySummaries = [];
    G.memorySummaries.push({
        id: 'gm_' + Date.now() + '_' + rand(100, 999),
        day: G.day,
        text: text.trim(),
        time: new Date().toLocaleTimeString().slice(0, 5)
    });
}

// ============================================================
// 🧠 记忆总结模态框（主线、角色与群聊）
// ============================================================
let activeMemoryScope = 'story';
let selectedScopeTargetId = null;

function openMemoryModal() {
    renderMemoryModalView();
}
window.openMemoryModal = openMemoryModal;

function renderMemoryModalView() {
    ensureNpcIntegrity();
    const memCfg = G.memoryConfig || {
        enabled: true,
        defaultThreshold: 10,
        defaultKeepRecent: 5,
        selectedModelKey: ''
    };
    G.memoryConfig = memCfg;

    let unarchivedCount = 0;
    let existingSummaries = [];

    if (activeMemoryScope === 'story') {
        unarchivedCount = (G.storyHistory || []).length;
        existingSummaries = G.memorySummaries || [];
    } else if (activeMemoryScope === 'character') {
        const npcId = selectedScopeTargetId || Object.keys(G.npcs)[0];
        selectedScopeTargetId = npcId;
        unarchivedCount = (typeof getAccountChatHistory === 'function') ? getAccountChatHistory(npcId).length : 0;
        existingSummaries = G.npcs[npcId]?.memorySummary ? [{ text: G.npcs[npcId].memorySummary, day: G.day }] : [];
    } else if (activeMemoryScope === 'group') {
        const gid = selectedScopeTargetId || Object.keys(G.groups)[0];
        selectedScopeTargetId = gid;
        unarchivedCount = (G.groupChatHistory[gid] || []).length;
        existingSummaries = G.groupMemories[gid] ? [{ text: G.groupMemories[gid], day: G.day }] : [];
    }

    const modelOptions = getAvailableMemoryModels().map(m => `
        <option value="${m.key}" ${m.key === memCfg.selectedModelKey ? 'selected' : ''}>${escapeHtml(m.name)}</option>
    `).join('');

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
        const npcOpts = Object.values(G.npcs || {}).map(n => `
            <option value="${n.id}" ${n.id === selectedScopeTargetId ? 'selected' : ''}>${escapeHtml(n.name)}</option>
        `).join('');
        scopeSelectorHtml += `
        <div style="margin-bottom:10px;display:flex;align-items:center;gap:8px;font-size:12px;">
            <span>选择角色：</span>
            <select id="scopeTargetSelect" style="flex:1;padding:4px 8px;border-radius:6px;border:1px solid #ccc;font-size:12px;">${npcOpts || '<option>暂无角色</option>'}</select>
        </div>`;
    } else if (activeMemoryScope === 'group') {
        const grpOpts = Object.values(G.groups || {}).map(g => `
            <option value="${g.id}" ${g.id === selectedScopeTargetId ? 'selected' : ''}>${escapeHtml(g.name)}</option>
        `).join('');
        scopeSelectorHtml += `
        <div style="margin-bottom:10px;display:flex;align-items:center;gap:8px;font-size:12px;">
            <span>选择群聊：</span>
            <select id="scopeTargetSelect" style="flex:1;padding:4px 8px;border-radius:6px;border:1px solid #ccc;font-size:12px;">${grpOpts || '<option>暂无群聊</option>'}</select>
        </div>`;
    }

    openModal(`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:6px;font-weight:800;font-size:18px;color:#2e7d32;">
                <span>🧠 记忆总结</span>
            </div>
        </div>

        ${scopeSelectorHtml}

        <p style="font-size:12.5px;color:#555;line-height:1.6;margin-bottom:12px;">
            当前共有 <b>${unarchivedCount}</b> 轮未归档的记录，AI 会读取这些内容。你可以让 AI 将较早的内容总结为一段精炼记忆，之后 AI 将只读取「记忆总结 + 最近若干轮」，不再读取被总结掉的原文。
        </p>

        <div class="form-group" style="margin-bottom:10px;">
            <label style="font-size:12px;color:#333;font-weight:600;">保留最近几轮不总结（其余更早的内容会被总结并归档）</label>
            <input type="number" id="memKeepRecentInput" min="1" max="30" value="${memCfg.defaultKeepRecent || 5}" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #ccc;font-size:13px;">
        </div>

        <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:12px;color:#333;font-weight:600;">🧩 用于总结的模型（可与主对话模型不同）</label>
            <select id="memModelSelect" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #ccc;font-size:13px;background:#fff;">
                ${modelOptions}
            </select>
        </div>

        <div style="display:flex;gap:10px;margin-bottom:10px;">
            <button class="btn-secondary" onclick="closeModal()" style="flex:1;border-radius:10px;font-size:13px;padding:8px 0;">取消</button>
            <button class="btn-primary" id="btnRunAiSummary" style="flex:1.4;border-radius:10px;background:#2e7d32;font-size:13px;padding:8px 0;">🧠 AI 生成总结</button>
        </div>

        <button class="btn-secondary" id="btnManualWriteSummary" style="width:100%;padding:7px 0;font-size:12px;border-radius:8px;margin-bottom:14px;background:#fdfcf9;border:1px solid #eedec8;color:#7a5223;">
            ✍️ 改为手动填写总结
        </button>

        <div style="border-top:1px solid #eee;padding-top:10px;margin-top:8px;">
            <div style="font-weight:700;font-size:13px;color:#333;margin-bottom:6px;">⚙️ 自动总结</div>
            <label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#444;line-height:1.5;cursor:pointer;margin-bottom:8px;">
                <input type="checkbox" id="memAutoSummaryCheck" ${memCfg.enabled ? 'checked' : ''} style="width:16px;height:16px;margin-top:2px;">
                <span>开启自动总结（未归档轮数达到阈值时，剧情生成后后台自动触发总结）</span>
            </label>
            <div class="form-group" style="margin-bottom:12px;">
                <label style="font-size:12px;color:#666;">达到多少轮未归档时自动触发</label>
                <input type="number" id="memAutoThresholdInput" min="4" max="60" value="${memCfg.defaultThreshold || 10}" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #ccc;font-size:13px;">
            </div>
        </div>

        <div style="border-top:1px solid #eee;padding-top:10px;">
            <div style="font-weight:700;font-size:13px;color:#333;margin-bottom:6px;">已有记忆总结 (${existingSummaries.length})</div>
            <div style="max-height:150px;overflow-y:auto;">
                ${summariesListHtml}
            </div>
        </div>
    `);

    const stSelect = document.getElementById('scopeTargetSelect');
    if (stSelect) {
        stSelect.onchange = () => {
            selectedScopeTargetId = stSelect.value;
            renderMemoryModalView();
        };
    }

    document.getElementById('btnRunAiSummary').onclick = async () => {
        await executeManualAiSummary();
    };

    document.getElementById('btnManualWriteSummary').onclick = () => {
        openManualMemoryInputModal();
    };

    document.getElementById('memAutoSummaryCheck').onchange = (e) => {
        G.memoryConfig.enabled = e.target.checked;
        autoSaveGame();
    };
    document.getElementById('memAutoThresholdInput').onchange = (e) => {
        G.memoryConfig.defaultThreshold = parseInt(e.target.value) || 10;
        autoSaveGame();
    };
    document.getElementById('memKeepRecentInput').onchange = (e) => {
        G.memoryConfig.defaultKeepRecent = parseInt(e.target.value) || 5;
        autoSaveGame();
    };
    document.getElementById('memModelSelect').onchange = (e) => {
        G.memoryConfig.selectedModelKey = e.target.value;
        autoSaveGame();
    };
}

window.switchMemoryScope = function(scope) {
    activeMemoryScope = scope;
    if (scope === 'character') selectedScopeTargetId = Object.keys(G.npcs)[0];
    if (scope === 'group') selectedScopeTargetId = Object.keys(G.groups)[0];
    renderMemoryModalView();
};

window.handleDeleteSummaryItem = function(idx) {
    if (activeMemoryScope === 'story') {
        if (G.memorySummaries && G.memorySummaries[idx]) {
            G.memorySummaries.splice(idx, 1);
        }
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

    let textToSummarize = '';
    let prior = '';

    if (activeMemoryScope === 'story') {
        const list = G.storyHistory || [];
        if (list.length <= keepRecent) {
            showToast(`当前未归档记录数 (${list.length}) 小于等于保留轮数 (${keepRecent})，无需总结`, 'info', 2000);
            return;
        }
        const sliceItems = list.slice(0, list.length - keepRecent);
        textToSummarize = sliceItems.map(item => `[第${item.day}天]: ${item.text}`).join('\n');
        prior = (G.memorySummaries || []).map(s => s.text || s).join('\n');
    } else if (activeMemoryScope === 'character') {
        const npc = G.npcs[selectedScopeTargetId];
        const list = (typeof getAccountChatHistory === 'function') ? getAccountChatHistory(selectedScopeTargetId) : [];
        if (list.length <= keepRecent) {
            showToast(`当前私聊记录数 (${list.length}) 小于等于保留轮数，无需总结`, 'info', 2000);
            return;
        }
        const sliceItems = list.slice(0, list.length - keepRecent);
        textToSummarize = sliceItems.map(m => `${m.from === 'player' ? '主角' : npc.name}: ${stripThought(m.text || '')}`).join('\n');
        prior = npc.memorySummary || '';
    } else if (activeMemoryScope === 'group') {
        const grp = G.groups[selectedScopeTargetId];
        const list = G.groupChatHistory[selectedScopeTargetId] || [];
        if (list.length <= keepRecent) {
            showToast(`当前群聊记录数 (${list.length}) 小于等于保留轮数，无需总结`, 'info', 2000);
            return;
        }
        const sliceItems = list.slice(0, list.length - keepRecent);
        textToSummarize = sliceItems.map(m => `${m.senderName}: ${stripThought(m.text || '')}`).join('\n');
        prior = G.groupMemories[selectedScopeTargetId] || '';
    }

    closeModal();
    if (typeof showLoading === 'function') showLoading();
    G.isGenerating = true;

    try {
        const sys = `你是资深的剧情记忆提炼专家。请将以下需要归档的事件对话内容压缩总结为一段精炼的记忆（150-250字内）。要求保留重大发展、角色关系变动、约定、数据成就等核心要素。直接输出精炼记忆文本。`;
        const userPrompt = `${prior ? '【已有历史记忆摘要】：\n' + prior + '\n\n' : ''}【本次需归档的新内容】：\n${textToSummarize}`;

        const summary = await callMemoryAI([
            { role: 'system', content: sys },
            { role: 'user', content: userPrompt }
        ], { maxTokens: 500, temperature: 0.35 });

        const cleanSummary = stripThought(summary.trim());

        if (activeMemoryScope === 'story') {
            addGlobalMemoryRecord(cleanSummary);
            G.storyHistory = (G.storyHistory || []).slice(G.storyHistory.length - keepRecent);
        } else if (activeMemoryScope === 'character') {
            const npc = G.npcs[selectedScopeTargetId];
            npc.memorySummary = cleanSummary;
        } else if (activeMemoryScope === 'group') {
            G.groupMemories[selectedScopeTargetId] = cleanSummary;
            const grp = G.groups[selectedScopeTargetId];
            (grp.members || []).forEach(mid => {
                if (G.npcs[mid]) G.npcs[mid].knownGroupEvents = `【在群「${grp.name}」获悉】：${cleanSummary}`;
            });
        }

        if (typeof hideLoading === 'function') hideLoading();
        showToast('🎉 AI 记忆总结生成完毕！已成功归档。', 'success', 2500);
        autoSaveGame();
        openMemoryModal();
    } catch(e) {
        if (typeof hideLoading === 'function') hideLoading();
        showMemoryFailNoticeModal('AI 记忆总结', e.message);
    } finally {
        G.isGenerating = false;
    }
}

function openManualMemoryInputModal() {
    openModal(`
        <h3>✍️ 手动填写记忆总结</h3>
        <p style="font-size:12px;color:#666;">直接输入你希望保留并归档给 AI 读取的核心记忆：</p>
        <div class="form-group">
            <textarea id="manualMemoryText" rows="4" placeholder="写下关键事件、人际关系或者剧情转折..."></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="openMemoryModal()">返回</button>
            <button class="btn-primary" id="btnSaveManualMemory">💾 保存记忆</button>
        </div>
    `);

    document.getElementById('btnSaveManualMemory').onclick = () => {
        const val = document.getElementById('manualMemoryText').value.trim();
        if (!val) { showToast('⚠️ 记忆内容不能为空', 'error'); return; }

        if (activeMemoryScope === 'story') {
            addGlobalMemoryRecord(val);
        } else if (activeMemoryScope === 'character') {
            if (G.npcs[selectedScopeTargetId]) G.npcs[selectedScopeTargetId].memorySummary = val;
        } else if (activeMemoryScope === 'group') {
            G.groupMemories[selectedScopeTargetId] = val;
            const grp = G.groups[selectedScopeTargetId];
            if (grp) {
                (grp.members || []).forEach(mid => {
                    if (G.npcs[mid]) G.npcs[mid].knownGroupEvents = `【在群「${grp.name}」获悉】：${val}`;
                });
            }
        }

        showToast('✅ 记忆总结已保存', 'success');
        autoSaveGame();
        openMemoryModal();
    };
}

// ============================================================
// 回忆录
// ============================================================
function renderMemoir() {
    const container = (dom && dom.memoirTab) || document.getElementById('memoirTab');
    if (!container) return;
    if ((G.memoir || []).length === 0) {
        container.innerHTML = `<div style="text-align:center;color:var(--text2);padding:30px 0;">还没有记录，开始你的主播生涯吧！</div>`;
        return;
    }
    let html = `<div style="font-weight:700;font-size:17px;margin-bottom:10px;">📜 回忆录</div><div class="timeline">`;
    const entries = [...G.memoir].reverse();
    for (const e of entries) {
        html += `
        <div class="timeline-item">
            <span class="date">📅 第${e.day}天</span>
            <strong>${escapeHtml(e.event)}</strong>
            ${e.details ? ` -- ${escapeHtml(e.details)}` : ''}
            <span style="font-size:10px;color:var(--text2);display:block;margin-top:2px;">${e.timestamp}</span>
        </div>
        `;
    }
    html += `</div>`;
    container.innerHTML = html;
}

// 暴露全局
window.checkAchievements = checkAchievements;
window.renderAchievements = renderAchievements;
window.generateSponsorOffer = generateSponsorOffer;
window.renderShop = renderShop;
window.renderDashboard = renderDashboard;
window.renderDataPanel = renderDataPanel;
window.renderMemoir = renderMemoir;
window.addGlobalMemoryRecord = addGlobalMemoryRecord;
window.callMemoryAI = callMemoryAI;
window.showMemoryFailNoticeModal = showMemoryFailNoticeModal;
// ============================================================