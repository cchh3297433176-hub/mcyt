// js/04-game-core-2.js
// 成就系统、商店、数据面板、手机社交(多模态识图、时差推导、朋友圈互怼吃醋、私聊动态贯通、微信式连发)
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
        { id: 'hot1', label: '🔥 热度小包', desc: '一次性增加 5,000 粉丝', cost: 1000, effect: () => { G.player.followers += 5000; checkSocialRequestsTrigger(); } },
        { id: 'hot2', label: '🔥 热度中包', desc: '一次性增加 20,000 粉丝', cost: 3500, effect: () => { G.player.followers += 20000; checkSocialRequestsTrigger(); } },
        { id: 'hot3', label: '🔥 热度大包', desc: '一次性增加 50,000 粉丝', cost: 8000, effect: () => { G.player.followers += 50000; checkSocialRequestsTrigger(); } },
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
    advanceTimeSlot();
    autoSaveGame();
    checkSocialRequestsTrigger();
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
// 🧠 记忆系统核心配置
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

// 🛡️ 账号隔离专用聊天 Key 计算：格式为 "accId_npcId"
function getChatStorageKey(npcId, accId = null) {
    const curAccId = accId || (G.currentAccountId || 'main');
    return `${curAccId}_${npcId}`;
}

// 获取某个账号针对某个 NPC 的专属对话历史（兼容旧存档未带前缀的历史）
function getAccountChatHistory(npcId, accId = null) {
    if (!G.chatHistory) G.chatHistory = {};
    const key = getChatStorageKey(npcId, accId);
    if (!G.chatHistory[key]) {
        // 旧档兼容：如果当前是 main 账号，且存在旧格式的历史，直接迁移
        const targetAcc = accId || (G.currentAccountId || 'main');
        if (targetAcc === 'main' && Array.isArray(G.chatHistory[npcId])) {
            G.chatHistory[key] = G.chatHistory[npcId];
        } else {
            G.chatHistory[key] = [];
        }
    }
    return G.chatHistory[key];
}

// 安全推送消息入库
function pushChatMessageSafe(npcId, msgObj, accId = null) {
    if (!msgObj._id) msgObj._id = 'cmsg_' + Date.now() + '_' + rand(1000, 9999);
    const list = getAccountChatHistory(npcId, accId);
    list.push(msgObj);
}

// ============================================================
// 📱 账号生态体系（大号与小号系统支持 + 独立拉黑）
// ============================================================
if (!G.currentAccountId) G.currentAccountId = 'main';
if (!G.altAccounts) G.altAccounts = [];
if (!G.blockedRecords) G.blockedRecords = [];

function isAccountBlockedByNpc(npcId, accId = null) {
    const curAcc = accId || (G.currentAccountId || 'main');
    const token = `${npcId}_${curAcc}`;
    if (curAcc === 'main' && Array.isArray(G.blockedNpcs) && G.blockedNpcs.includes(npcId)) {
        return true;
    }
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
        if (accId === 'main' && G.blockedNpcs) {
            G.blockedNpcs = G.blockedNpcs.filter(id => id !== npcId);
        }
    }
}

function getActiveAccountInfo() {
    if (G.currentAccountId === 'main' || !G.currentAccountId) {
        return {
            id: 'main',
            isAlt: false,
            name: G.player.ytName || '主播大号',
            avatar: G.player.avatar || null,
            bio: 'YouTube 频道官方号'
        };
    }
    const found = (G.altAccounts || []).find(a => a.id === G.currentAccountId);
    if (found) {
        return {
            id: found.id,
            isAlt: true,
            name: found.name,
            avatar: found.avatar || null,
            bio: found.bio || '私密小号'
        };
    }
    return { id: 'main', isAlt: false, name: G.player.ytName || '主播大号', avatar: G.player.avatar, bio: '' };
}

function switchAccount(accId) {
    G.currentAccountId = accId;
    const acc = getActiveAccountInfo();
    showToast(`🔀 已切换账号为：${acc.name}`, 'info', 1800);
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
        <p style="font-size:12px;color:#666;line-height:1.6;">每个账号拥有完全独立的私聊记录。某个小号被拉黑后，可继续注册新小号联系骚扰或求情转圜！</p>
        
        <div style="margin:10px 0;border:1px solid #eee;border-radius:10px;padding:10px;background:#fff;">
            <div style="font-weight:700;font-size:13px;margin-bottom:8px;">👑 主播官方大号</div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f0f8f0;border-radius:8px;border:1px solid #d0ebd0;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <div style="font-size:20px;">${G.player.avatar ? `<img src="${G.player.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : '👑'}</div>
                    <div>
                        <div style="font-weight:700;font-size:13px;">${escapeHtml(mainAcc.name)} <span style="font-size:10px;color:#fff;background:var(--primary);padding:1px 6px;border-radius:4px;">大号</span></div>
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

    document.getElementById('btnRegisterNewAlt').onclick = () => {
        closeModal();
        openCreateAltAccountModal();
    };
}

function openCreateAltAccountModal() {
    openModal(`
        <h3>➕ 注册自定义小号</h3>
        <p style="font-size:12px;color:#666;">为小号设定一个独立的马甲身份：</p>
        <div class="form-group">
            <label>小号名称 / ID <span class="required">*</span></label>
            <input type="text" id="altNameInput" placeholder="如：路过的红石学徒 / 匿名纯路人">
        </div>
        <div class="form-group">
            <label>小号个性签名</label>
            <input type="text" id="altBioInput" placeholder="如：只看不说话，热爱MC建筑...">
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="openAccountManagerModal()">返回</button>
            <button class="btn-primary" id="btnConfirmCreateAlt">完成注册并登录</button>
        </div>
    `);

    document.getElementById('btnConfirmCreateAlt').onclick = () => {
        const name = document.getElementById('altNameInput').value.trim();
        const bio = document.getElementById('altBioInput').value.trim();
        if (!name) { showToast('⚠️ 请填写小号名称', 'error'); return; }

        if (!G.altAccounts) G.altAccounts = [];
        const newAlt = {
            id: 'alt_' + Date.now(),
            name,
            bio: bio || '路人小号',
            avatar: null,
            createdAt: G.day
        };
        G.altAccounts.push(newAlt);
        G.currentAccountId = newAlt.id;

        showToast(`🎉 小号「${name}」注册成功并已登录！`, 'success', 2500);
        closeModal();
        renderSocialPanel();
        autoSaveGame();
    };
}

function deleteAltAccount(altId) {
    if (!confirm('确定要注销这个小号吗？注销后该小号的独立聊天记录也将清空。')) return;
    G.altAccounts = (G.altAccounts || []).filter(a => a.id !== altId);
    if (G.currentAccountId === altId) G.currentAccountId = 'main';
    showToast('🗑️ 小号已注销', 'info');
    openAccountManagerModal();
    autoSaveGame();
}

// ============================================================
// 🔔 粉丝热度与主播好友申请触发引擎
// ============================================================
function checkSocialRequestsTrigger() {
    if (typeof OFFICIAL_NPCS === 'undefined') return;
    if (!G.friendRequests) G.friendRequests = [];
    if (!G.groupInvites) G.groupInvites = [];
    const followers = G.player.followers || 0;

    for (const [id, npc] of Object.entries(OFFICIAL_NPCS)) {
        if (G.npcs[id]) continue;
        const inFreq = G.friendRequests.some(r => r.npcOfficialId === id || r.name === npc.name);
        if (inFreq) continue;

        const threshold = npc.minFollowers || 5000;
        if (followers >= threshold) {
            const chance = followers > threshold * 2 ? 0.8 : 0.45;
            if (Math.random() < chance) {
                G.friendRequests.push({
                    _id: 'freq_' + id + '_' + Date.now(),
                    npcOfficialId: id,
                    name: npc.name,
                    fromReason: `关注到你的作品 (粉丝达到 ${followers.toLocaleString()})`,
                    persona: npc.persona,
                    avatarEmoji: npc.avatarEmoji || '👤',
                    avatarUrl: null,
                    day: G.day
                });
                showToast(`📬 顶级主播「${npc.name}」因你的热度向你发来了好友申请！`, 'success', 3500);
                addMemoir('好友申请', `知名主播 ${npc.name} 关注到了你的频道并申请加为好友`);
                addGlobalMemoryRecord(`【社交突破】：知名MC主播「${npc.name}」关注到主角，主动递来好友申请。`);
            }
        }
    }

    if (followers >= 5000 && !G.groups['fan_club_1']) {
        const hasInv = G.groupInvites.some(gi => gi.gid === 'fan_club_1');
        if (!hasInv) {
            G.groupInvites.push({
                _id: 'ginv_' + Date.now(),
                gid: 'fan_club_1',
                name: '🎉 主播后援会 1 号群',
                desc: '由核心粉丝自发为你建立的专属粉丝后援讨论基地！',
                avatarEmoji: '👑',
                inviter: '狂热铁粉'
            });
            showToast('👥 收到粉丝自建后援群的加入邀请！', 'info', 3000);
        }
    }
}
window.checkSocialRequestsTrigger = checkSocialRequestsTrigger;

// ============================================================
// 🌍 时区与时差自适应推导工具（根据玩家人设判断其所在地）
// ============================================================
function detectPlayerTimezoneInfo() {
    const persona = ((G.player && G.player.persona) || '').toLowerCase();
    const skin = ((G.player && G.player.skin) || '').toLowerCase();
    const combined = persona + ' ' + skin;

    let country = '中国 (东八区)';
    let region = 'CN';

    if (combined.includes('美国') || combined.includes('美籍') || combined.includes('usa') || combined.includes('america') || combined.includes('洛杉矶') || combined.includes('纽约')) {
        country = '美国 (北美时区)';
        region = 'US';
    } else if (combined.includes('加拿大') || combined.includes('canada')) {
        country = '加拿大 (北美时区)';
        region = 'CA';
    } else if (combined.includes('英国') || combined.includes('uk') || combined.includes('伦敦') || combined.includes('英格兰')) {
        country = '英国 (格林威治/欧洲时区)';
        region = 'UK';
    } else if (combined.includes('法国') || combined.includes('france') || combined.includes('巴黎')) {
        country = '法国 (欧洲时区)';
        region = 'FR';
    } else if (combined.includes('日本') || combined.includes('japan') || combined.includes('东京')) {
        country = '日本 (东九区)';
        region = 'JP';
    } else if (combined.includes('澳洲') || combined.includes('澳大利亚') || combined.includes('australia') || combined.includes('悉尼')) {
        country = '澳大利亚 (东十区)';
        region = 'AU';
    }

    const slotName = getTimeSlotName(G.timeSlot);
    return { country, region, slotName, day: G.day };
}

function formatNpcTimezoneContext(targetNpcName = '') {
    const pTz = detectPlayerTimezoneInfo();
    return `
【时区与时差上下文】：
1. 玩家当前所在地：${pTz.country}，当前游戏时段为：第 ${pTz.day} 天【${pTz.slotName}】。
2. 常见海外MC主播（如 Dream/美、ThatMob/加法、Grox/美、Twixxel/美、xqree/欧洲、Whispy/美）：
   - 若玩家在中国/亚洲：玩家这边的「早晨/中午」是海外主播那边的「深夜/凌晨/甚至熬夜修仙还未睡觉」；玩家这边的「夜晚」是海外主播那边的「清晨起床/正午刚开播」。
   - 若玩家人设本就在北美/欧洲同区，则基本没有大时差，为正常同区作息。
3. 请在对话/评论中，根据此真实时差及角色作息自然反应（例如“这么早发动态？我这刚准备通宵下播睡觉…”或“哈欠…刚爬起来就刷到你”），细节极其生动真实！
`;
}

// ============================================================
// 📱 手机社交中心（私聊/群聊/朋友圈）
// ============================================================
if (!G.phoneNav) G.phoneNav = 'chats';
if (!G.chatActiveTab) G.chatActiveTab = 'direct';
if (!G.groups) G.groups = {};
if (!G.groupChatHistory) G.groupChatHistory = {};
if (!G.friendRequests) G.friendRequests = [];
if (!G.groupInvites) G.groupInvites = [];
if (!G.momentsFilterNpcId) G.momentsFilterNpcId = null;
if (!G._chatShowFullHistory) G._chatShowFullHistory = {};
// 聊天扩展状态必须在 renderSingleChatWindow 可能被调用前初始化。
// 之前合并时漏掉这个声明，导致第一次进入聊天直接抛出
// ReferenceError: _stickerDrawerOpen is not defined，表现为“点了完全没反应”。
let _stickerDrawerOpen = false;
if (!G._behindScreenActive) G._behindScreenActive = {};

function bindLongPressEvent(el, onLongPress, onClick) {
    if (!el) return;
    const LONG_PRESS_MS = 500;
    const MOVE_TOLERANCE = 10;
    let pressTimer = null;
    let longPressTriggered = false;
    let startX = 0, startY = 0;

    const clearTimer = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };

    const start = (x, y) => {
        longPressTriggered = false;
        startX = x; startY = y;
        clearTimer();
        pressTimer = setTimeout(() => {
            longPressTriggered = true;
            if (typeof onLongPress === 'function') onLongPress();
        }, LONG_PRESS_MS);
    };

    const move = (x, y) => {
        if (Math.abs(x - startX) > MOVE_TOLERANCE || Math.abs(y - startY) > MOVE_TOLERANCE) {
            clearTimer();
        }
    };

    const end = () => {
        clearTimer();
        if (!longPressTriggered) {
            if (typeof onClick === 'function') onClick();
        }
    };

    const cancel = () => { clearTimer(); };

    el.addEventListener('touchstart', e => {
        const t = e.touches[0];
        if (t) start(t.clientX, t.clientY);
    }, { passive: true });
    el.addEventListener('touchmove', e => {
        const t = e.touches[0];
        if (t) move(t.clientX, t.clientY);
    }, { passive: true });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', cancel);

    el.addEventListener('mousedown', e => start(e.clientX, e.clientY));
    el.addEventListener('mousemove', e => { if (pressTimer) move(e.clientX, e.clientY); });
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', cancel);
    el.addEventListener('contextmenu', e => e.preventDefault());
}

function renderAvatarBadge(obj, size = 44) {
    const avatarUrl = (obj && obj.isPlayer) ? G.player.avatar : (obj && obj.avatarUrl);
    const emoji = (obj && obj.isPlayer) ? '🧑' : ((obj && obj.avatarEmoji) || '👤');

    if (avatarUrl) {
        return `<img src="${avatarUrl}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block;">`;
    }
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#eaf2ea;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(size*0.45)}px;flex-shrink:0;">${emoji}</div>`;
}

function renderSocialPanel() {
    const container = (dom && dom.socialTab) || document.getElementById('socialTab');
    if (!container) return;
    ensureNpcIntegrity();

    if (G.currentChatGroup) {
        renderGroupChatWindow(container);
        return;
    }
    if (G.currentChatNpc) {
        renderSingleChatWindow(container);
        return;
    }
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
                <span>${activeAcc.isAlt ? '🎭' : '👑'} 当前账号：<b>${escapeHtml(activeAcc.name)}</b></span>
                ${activeAcc.isAlt ? '<span style="font-size:10px;background:#ffe082;color:#795548;padding:1px 4px;border-radius:4px;font-weight:700;">小号模式</span>' : ''}
            </div>
            <button onclick="openAccountManagerModal()" style="border:1px solid #b8dbb8;background:#fff;padding:2px 8px;border-radius:12px;font-size:11px;cursor:pointer;color:#2e7d32;font-weight:700;">🔀 切换/注册小号</button>
        </div>

        <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;">
            ${contentHtml}
        </div>
        <div style="height:54px;background:#fcfdfc;border-top:1px solid #eef2ee;display:flex;justify-content:space-around;align-items:center;padding:0 10px;flex-shrink:0;">
            <button id="phoneNavChatsBtn" style="border:none;background:none;font-size:12px;font-weight:700;color:${!isMoments ? 'var(--primary)' : '#888'};display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;">
                <span style="font-size:18px;">💬</span>
                <span>消息</span>
            </button>
            <button id="phoneNavMomentsBtn" style="border:none;background:none;font-size:12px;font-weight:700;color:${isMoments ? 'var(--primary)' : '#888'};display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;">
                <span style="font-size:18px;">🌟</span>
                <span>朋友圈</span>
            </button>
        </div>
    </div>
    `;
    container.innerHTML = html;

    document.getElementById('phoneNavChatsBtn').onclick = () => { G.phoneNav = 'chats'; renderSocialPanel(); };
    document.getElementById('phoneNavMomentsBtn').onclick = () => { G.phoneNav = 'moments'; G.momentsFilterNpcId = null; renderSocialPanel(); };

    if (!isMoments) {
        bindChatListEvents(container);
    } else {
        bindMomentsEvents(container);
    }
}

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
                随着你的频道声名鹊起，各路MC大主播与热情粉丝会主动递来好友申请！<br>
                <div style="margin-top:10px;">
                    <button class="upload-btn" onclick="openAddChatTargetModal()" style="padding:6px 14px;font-size:12px;">查看待处理好友申请 (${(G.friendRequests||[]).length})</button>
                </div>
            </div>`;
        } else {
            for (const [id, npc] of npcList) {
                const chatHist = getAccountChatHistory(id);
                const lastMsg = chatHist.length > 0 ? chatHist[chatHist.length - 1] : null;
                const purePreview = lastMsg ? stripThought(lastMsg.text || '') : (npc.memorySummary ? `[记忆: ${stripThought(npc.memorySummary).slice(0, 15)}...]` : '新添加好友，快来打个招呼吧');
                const time = lastMsg ? (lastMsg.time || '') : '';
                const isLover = (G.player.lovers || []).includes(npc.name);
                const isBlocked = isAccountBlockedByNpc(id, currentAcc.id);

                itemsHtml += `
                <div class="chat-item" data-id="${id}" style="display:flex;align-items:center;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:#fff;border:1px solid #f0f4f0;position:relative;">
                    <div style="margin-right:12px;flex-shrink:0;">${renderAvatarBadge(npc, 44)}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-weight:700;font-size:14px;color:var(--text);">${escapeHtml(npc.name)} ${isLover ? '💕' : ''} ${isBlocked ? '<span style="font-size:10px;color:#fff;background:#e53935;padding:1px 5px;border-radius:4px;">已拉黑本号</span>' : ''}</span>
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
                暂无群聊。<br>
                粉丝增长后会收到后援粉丝群邀请，<br>也可以点击右上角 ➕ 自建专属主播交流群！
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
        💡 提示：长按消息可撤回、编辑或删除；长按联系人可编辑人设与独立记忆
    </div>
    <div class="chat-list" style="flex:1;overflow-y:auto;padding:8px;">
        ${itemsHtml}
    </div>`;
}

function bindChatListEvents(container) {
    const directBtn = document.getElementById('tabDirectBtn');
    const groupBtn = document.getElementById('tabGroupBtn');
    const addBtn = document.getElementById('addChatTargetBtn');
    if (directBtn) directBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); G.chatActiveTab = 'direct'; G.currentChatNpc = null; G.currentChatGroup = null; renderSocialPanel(); };
    if (groupBtn) groupBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); G.chatActiveTab = 'group'; G.currentChatNpc = null; G.currentChatGroup = null; renderSocialPanel(); };
    if (addBtn) addBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); openAddChatTargetModal(); };

    // 私聊联系人：不要依赖 Pointer Events。
    // Android WebView/部分内嵌浏览器可能对动态 innerHTML 元素的 pointerup 处理不一致，
    // 这会造成“群聊能点、私聊不能点”。这里改为原生 click + touch 长按的独立机制。
    const bindDirectItem = (el, id) => {
        if (!el || !id) return;
        let timer = null;
        let longPressed = false;
        let moved = false;
        let suppressClickUntil = 0;
        let sx = 0, sy = 0;

        const clear = () => {
            if (timer) { clearTimeout(timer); timer = null; }
        };
        const enterChat = () => {
            if (Date.now() < suppressClickUntil) return;
            G.currentChatGroup = null;
            G.currentChatNpc = String(id);
            G.chatActiveTab = 'direct';
            G.phoneNav = 'chats';
            renderSocialPanel();
        };
        const editNpc = () => {
            suppressClickUntil = Date.now() + 700;
            openEditNpcModal(String(id));
        };

        // 普通鼠标/浏览器点击的唯一入口
        el.onclick = (e) => {
            if (Date.now() < suppressClickUntil) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            if (longPressed) {
                longPressed = false;
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            enterChat();
        };

        // Android 触屏：短按直接进入，长按打开编辑。
        el.addEventListener('touchstart', (e) => {
            const t = e.touches && e.touches[0];
            if (!t) return;
            sx = t.clientX; sy = t.clientY;
            moved = false;
            longPressed = false;
            clear();
            timer = setTimeout(() => {
                timer = null;
                if (!moved) {
                    longPressed = true;
                    suppressClickUntil = Date.now() + 700;
                    editNpc();
                }
            }, 550);
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            const t = e.touches && e.touches[0];
            if (!t) return;
            if (Math.abs(t.clientX - sx) > 12 || Math.abs(t.clientY - sy) > 12) {
                moved = true;
                clear();
            }
        }, { passive: true });

        el.addEventListener('touchend', (e) => {
            clear();
            if (moved) return;
            if (longPressed) {
                suppressClickUntil = Date.now() + 700;
                return;
            }
            // 某些 WebView 不派发 click，因此短按在 touchend 再提供一次兜底入口。
            suppressClickUntil = Date.now() + 350;
            enterChat();
        }, { passive: true });

        el.addEventListener('touchcancel', () => {
            clear();
            moved = true;
            longPressed = false;
        }, { passive: true });

        // 桌面端长按/右键编辑人设
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            editNpc();
        });

        el.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            sx = e.clientX; sy = e.clientY;
            moved = false;
            longPressed = false;
            clear();
            timer = setTimeout(() => {
                timer = null;
                if (!moved) {
                    longPressed = true;
                    suppressClickUntil = Date.now() + 700;
                    editNpc();
                }
            }, 550);
        });
        el.addEventListener('mousemove', (e) => {
            if (Math.abs(e.clientX - sx) > 12 || Math.abs(e.clientY - sy) > 12) {
                moved = true;
                clear();
            }
        });
        el.addEventListener('mouseup', () => {
            clear();
            if (longPressed) suppressClickUntil = Date.now() + 700;
        });
        el.addEventListener('mouseleave', clear);
    };

    container.querySelectorAll('.chat-item').forEach(el => {
        bindDirectItem(el, el.dataset.id);
    });

    // 群聊继续使用现有机制；群聊本身已经可以正常进入。
    container.querySelectorAll('.group-item').forEach(el => {
        const gid = el.dataset.gid;
        if (!gid) return;
        bindLongPressEvent(el, () => openGroupSettingsModal(gid), () => openGroupChat(gid));
    });
}

// ============================================================
// 🌟 朋友圈生态系统（发动态、AI多模态识图互动、楼中楼互怼与时差）
// ============================================================
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
    document.getElementById('clearMomentFilterBtn')?.addEventListener('click', () => {
        G.momentsFilterNpcId = null;
        renderSocialPanel();
    });

    document.getElementById('btnCreateUserPost')?.addEventListener('click', () => {
        openCreateMomentPostModal();
    });

    document.getElementById('btnAiRefreshFeed')?.addEventListener('click', async () => {
        await triggerGenerateFriendsFeed();
    });

    container.querySelectorAll('.moment-avatar-click').forEach(el => {
        el.onclick = () => {
            const nid = el.dataset.npcid;
            if (nid && G.npcs[nid]) {
                G.momentsFilterNpcId = nid;
                renderSocialPanel();
            }
        };
    });

    container.querySelectorAll('.moment-like-btn').forEach(btn => {
        btn.onclick = () => {
            const id = parseInt(btn.dataset.id);
            const item = G.feed.find(f => f.id === id);
            if (!item) return;
            item.liked = !item.liked;
            item.likes = (item.likes || 0) + (item.liked ? 1 : -1);
            renderSocialPanel();
            autoSaveGame();
        };
    });

    // 💬 召唤好友互动（多模态识图 + 时差 + 楼中楼互怼）
    container.querySelectorAll('.moment-ai-cmt-btn').forEach(btn => {
        btn.onclick = async () => {
            const id = parseInt(btn.dataset.id);
            await triggerAiCommentForMoment(id);
        };
    });

    container.querySelectorAll('.moment-op-btn').forEach(btn => {
        btn.onclick = () => {
            const act = btn.dataset.act;
            const id = parseInt(btn.dataset.id);
            const itemIdx = (G.feed || []).findIndex(f => f.id === id);
            if (itemIdx === -1) return;
            const item = G.feed[itemIdx];

            if (act === 'del') {
                if (confirm('确定删除这条动态吗？')) {
                    G.feed.splice(itemIdx, 1);
                    showToast('🗑️ 动态已删除', 'info', 1200);
                    renderSocialPanel();
                    autoSaveGame();
                }
            } else if (act === 'recall') {
                const isSeen = Math.random() < 0.5;
                G.feed.splice(itemIdx, 1);
                if (isSeen) {
                    showToast('👀 你撤回了动态，但有好友在你撤回前正好看到了！', 'info', 3000);
                    addGlobalMemoryRecord(`【朋友圈动态撤回】：主角发布了关于“${item.body.slice(0, 20)}”的动态后又快速撤回，但被部分好友偶然看到。`);
                } else {
                    showToast('↩️ 动态已悄悄撤回，没人发现', 'success', 2000);
                }
                renderSocialPanel();
                autoSaveGame();
            } else if (act === 'edit') {
                openEditMomentModal(item);
            }
        };
    });
}

function openCreateMomentPostModal() {
    const curAcc = getActiveAccountInfo();
    openModal(`
        <h3>📷 发朋友圈动态</h3>
        <p style="font-size:12px;color:#666;">当前发布身份：<b>${escapeHtml(curAcc.name)}</b></p>
        <div class="form-group">
            <label>动态标题 (可选)</label>
            <input type="text" id="postTitleInput" placeholder="起个简短有梗的标题...">
        </div>
        <div class="form-group">
            <label>动态正文 <span class="required">*</span></label>
            <textarea id="postBodyInput" rows="3" placeholder="分享今天的MC实况日常、吐槽或游戏截图心情..."></textarea>
        </div>
        <div class="form-group">
            <label>配图形式选择</label>
            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px;align-items:stretch;">
                <label style="font-size:12px;display:flex;align-items:flex-start;gap:6px;cursor:pointer;line-height:1.45;"><input type="radio" name="postImgType" value="real" checked><span>🖼️ <b>真实图片</b>（占大量 Token，AI 可直接识图）</span></label>
                <label style="font-size:12px;display:flex;align-items:flex-start;gap:6px;cursor:pointer;line-height:1.45;"><input type="radio" name="postImgType" value="desc"><span>📝 <b>文字代替图片</b>（不保存/发送图片，最省 Token）</span></label>
                <label style="font-size:12px;display:flex;align-items:flex-start;gap:6px;cursor:pointer;line-height:1.45;"><input type="radio" name="postImgType" value="hybrid"><span>🖼️📝 <b>真实图片 + 文字描述</b>（朋友圈显示真实图，但 AI 只读取文字描述）</span></label>
            </div>
            <div id="postImgRealArea">
                <input type="file" id="postRealFileInput" accept="image/*" style="font-size:12px;">
                <div id="postImgPreview" style="margin-top:6px;"></div>
            </div>
            <div id="postImgDescArea" style="display:none;">
                <input type="text" id="postImgDescInput" placeholder="如：一张被苦力怕炸穿的地牢遗迹惨状截图">
                <div id="postImgDescHint" style="font-size:11px;color:#888;margin-top:4px;"></div>
            </div>
        </div>
        <div class="btn-row"><button class="btn-secondary" onclick="closeModal()">取消</button><button class="btn-primary" id="btnConfirmPublishPost">🚀 发布动态</button></div>
    `);

    let uploadedBase64 = null;
    const syncPostImageModeUI = () => {
        const mode = document.querySelector('input[name="postImgType"]:checked')?.value || 'real';
        const needsImage = mode === 'real' || mode === 'hybrid';
        const needsDesc = mode === 'desc' || mode === 'hybrid';
        document.getElementById('postImgRealArea').style.display = needsImage ? 'block' : 'none';
        document.getElementById('postImgDescArea').style.display = needsDesc ? 'block' : 'none';
        const hint = document.getElementById('postImgDescHint');
        if (hint) hint.textContent = mode === 'hybrid' ? '⚠️ AI 永远只会收到这段文字，不会收到上传的真实图片。' : '';
    };
    document.querySelectorAll('input[name="postImgType"]').forEach(r => r.onchange = syncPostImageModeUI);
    document.getElementById('postRealFileInput').onchange = function() {
        const file = this.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = e => { uploadedBase64 = e.target.result; document.getElementById('postImgPreview').innerHTML = `<img src="${uploadedBase64}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:1px solid #ccc;">`; };
        reader.readAsDataURL(file);
    };
    syncPostImageModeUI();

    document.getElementById('btnConfirmPublishPost').onclick = () => {
        const title = document.getElementById('postTitleInput').value.trim();
        const body = document.getElementById('postBodyInput').value.trim();
        const imgType = document.querySelector('input[name="postImgType"]:checked').value;
        const imgDesc = document.getElementById('postImgDescInput').value.trim();
        if (!body) { showToast('⚠️ 正文不能为空', 'error'); return; }
        if ((imgType === 'real' || imgType === 'hybrid') && !uploadedBase64) { showToast('⚠️ 请先选择一张图片', 'error'); return; }
        if ((imgType === 'desc' || imgType === 'hybrid') && !imgDesc) { showToast('⚠️ 请填写图片文字描述', 'error'); return; }
        if (!G.feed) G.feed = []; G.feedIdCounter = (G.feedIdCounter || 0) + 1;
        const newPost = {
            id: Date.now(), author: curAcc.name, isPlayer: true, avatar: curAcc.avatar, title, body,
            image: (imgType === 'real' || imgType === 'hybrid') ? uploadedBase64 : null,
            imageDesc: (imgType === 'desc' || imgType === 'hybrid') ? imgDesc : null,
            imageMode: imgType, likes: 0, liked: false, comments: [], time: new Date().toLocaleTimeString().slice(0, 5)
        };
        G.feed.push(newPost);
        addGlobalMemoryRecord(`【玩家发朋友圈】：在第 ${G.day} 天发布了动态：“${body}”${newPost.image ? '（附带了一张相册照片/立绘截图）' : ''}${newPost.imageDesc ? `（配图描述: ${newPost.imageDesc}）` : ''}`);
        showToast('🎉 朋友圈发布成功！', 'success', 2000); closeModal(); renderSocialPanel(); autoSaveGame();
    };
}

function openEditMomentModal(item) {
    openModal(`
        <h3>✏️ 编辑动态</h3>
        <div class="form-group">
            <label>动态内容</label>
            <textarea id="editMomentBodyInput" rows="4" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;font-size:13px;">${escapeHtml(item.body)}</textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnSaveEditedMoment">💾 保存修改</button>
        </div>
    `);

    document.getElementById('btnSaveEditedMoment').onclick = () => {
        const newBody = document.getElementById('editMomentBodyInput').value.trim();
        if (!newBody) { showToast('内容不能为空', 'error'); return; }
        item.body = newBody;
        closeModal();
        renderSocialPanel();
        showToast('✅ 动态已更新', 'success', 1500);
        autoSaveGame();
    };
}

// ✨ AI 自动生成通讯录好友朋友圈动态（融合时区与主播生活）
async function triggerGenerateFriendsFeed() {
    const npcs = Object.values(G.npcs || {});
    if (!npcs.length) {
        showToast('通讯录暂无好友，快去结识更多主播吧！', 'info', 2000);
        return;
    }

    showToast('✨ 正在刷新好友动态...', 'info', 1500);
    try {
        const pickedNpc = pick(npcs);
        const tzContext = formatNpcTimezoneContext(pickedNpc.name);

        const sys = `你正在扮演 Minecraft 主播/好友「${pickedNpc.name}」（人设：${pickedNpc.persona}）。
${tzContext}
请以你的口吻发一条简短生动的社交平台/朋友圈动态（60字以内）。
内容可以结合你当前所处时区的作息（如熬夜剪辑翻车、刚起床迷糊开箱、吐槽其他主播、或生活碎碎念）。只输出动态正文，严禁解释。`;

        const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '发一条新动态。' }], { maxTokens: 150, temperature: 0.95 });
        const clean = stripThought(raw).replace(/^["'“]|["'”]$/g, '').trim();

        if (!G.feed) G.feed = [];
        G.feed.push({
            id: Date.now(),
            author: pickedNpc.name,
            npcId: pickedNpc.id,
            avatar: pickedNpc.avatarUrl ? `<img src="${pickedNpc.avatarUrl}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : (pickedNpc.avatarEmoji || '👤'),
            body: clean,
            likes: rand(1, 15),
            liked: false,
            comments: [],
            time: new Date().toLocaleTimeString().slice(0, 5)
        });

        showToast(`🌟 ${pickedNpc.name} 刚更新了一条朋友圈！`, 'success', 2500);
        renderSocialPanel();
        autoSaveGame();
    } catch (e) {
        showToast('❌ 刷新失败，请检查网络设置', 'error');
    }
}

// 💬 召唤好友互动评论（支持真实相册图片多模态识别 + 时区推导 + 楼中楼争风吃醋/互怼）
async function triggerAiCommentForMoment(momentId) {
    const item = (G.feed || []).find(f => f.id === momentId);
    if (!item) return;

    const npcs = Object.values(G.npcs || {});
    if (!npcs.length) { showToast('暂无可互动的好友'); return; }

    const candidateNpcs = npcs.filter(n => n.name !== item.author);
    const shuffled = (candidateNpcs.length ? candidateNpcs : npcs).sort(() => 0.5 - Math.random());
    const selectedNpcs = shuffled.slice(0, Math.min(3, rand(2, 3)));

    showToast(`🤖 ${selectedNpcs.map(n => n.name).join('、')} 正在围观动态...`, 'info', 1500);

    try {
        const tzContext = formatNpcTimezoneContext();
        const imageMode = item.imageMode || (item.image && item.imageDesc ? 'hybrid' : (item.image ? 'real' : 'desc'));
        const hasAiImage = !!item.image && imageMode === 'real';
        const imgDescContext = item.imageDesc ? `（配图描述：${item.imageDesc}）` : '';

        let existingCommentsText = '';
        if (item.comments && item.comments.length) {
            existingCommentsText = '【此前已有评论】：\n' + item.comments.map(c => `${c.user}: ${c.content}`).join('\n') + '\n';
        }

        const participantsDesc = selectedNpcs.map(n => `【${n.name}】(性格人设: ${n.persona}, 好感度: ${n.favor||50})`).join('\n');

        const sysPrompt = `
你正在模拟 Minecraft 主播朋友圈动态下的真实多好友互动评论区。
${tzContext}

【动态发布者】：${item.author}
【动态文字内容】：“${item.body}” ${imgDescContext}
${existingCommentsText}

【本次参与互动的具体好友】：
${participantsDesc}

【核心演绎规则（纯乙女守护与多模态视觉聚焦）】：
1. 配图理解规则：
   - “真实图片”：可以视觉识图，并结合图片细节评论。
   - “真实图片 + 文字描述”：绝对不能读取真实图片，只能依据【配图描述】理解图片内容。
   - “文字代替图片”：只能依据【配图描述】理解图片内容。
2. 楼中楼接梗与互怼争吵（纯乙女安全合规）：
   - 好友之间不要各说各话！第二位及后续的好友必须直接接前面的话、甚至争风吃醋或毒舌拆台（例如ThatMob傲娇说“没我可爱/去帮你报仇”，其他角色可以立刻嘲讽“就你那PVP技术送双杀去吧”）。
   - 严禁攻略角色之间发生搞基或同性恋爱（纯乙女红线），角色之间的争吵仅限【技术攀比、护短争宠、傲娇吃醋、毒舌吐槽】！
3. 时差自然体现：
   - 结合双方真实时差（如中国与欧美），在评论中自然带上当时的生活状态（通宵刚下播准备睡觉、刚起床迷糊等）。

【输出格式要求（每行一条，必须按此格式）】：
[COMMENT name=角色名字]评论正文（40字以内）[/COMMENT]
`;

        let userContent = null;
        if (hasAiImage) {
            // 🌟 标准多模态消息数组格式，完美兼容 Gemini / OpenAI
            userContent = [
                {
                    type: 'text',
                    text: `请好友们针对玩家发布的动态及这张图片进行生动评论与互怼接话：`
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: item.image
                    }
                }
            ];
        } else {
            userContent = `请好友们针对玩家发布的动态进行生动评论与互怼接话。${item.imageDesc ? `这张配图只能依据以下文字描述理解：${item.imageDesc}` : ''}`;
        }

        const raw = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: userContent }
        ], { maxTokens: 450, temperature: 0.95 });

        if (!item.comments) item.comments = [];

        const re = /\[COMMENT(?:\s+name=|\s*:\s*)(["']?)([^\]"'\n]+)\1\]([\s\S]*?)(?:\[\/COMMENT\]|(?=\[COMMENT)|$)/gi;
        let match;
        let addedCount = 0;

        while ((match = re.exec(raw)) !== null) {
            const rawName = match[2].trim();
            const text = stripThought(match[3].replace(/\[\/?COMMENT[^\]]*\]/gi, '').trim());
            if (!text) continue;

            const matchedNpc = selectedNpcs.find(n => n.name === rawName || rawName.includes(n.name));
            const finalName = matchedNpc ? matchedNpc.name : rawName;

            item.comments.push({
                user: finalName,
                content: text
            });

            // 🧠 记忆穿透：将该 NPC 对玩家动态的评论注入该 NPC 独立记忆
            if (matchedNpc) {
                const npcMemo = `【朋友圈互动】：在动态“${item.body.slice(0, 18)}”下评论说：“${text}”`;
                matchedNpc.memorySummary = (matchedNpc.memorySummary || '') + '\n' + npcMemo;
            }

            addedCount++;
        }

        if (addedCount === 0 && raw.trim()) {
            const fallbackNpc = selectedNpcs[0] || npcs[0];
            const cleanBody = stripThought(raw.replace(/\[\/?COMMENT[^\]]*\]/gi, '').trim());
            item.comments.push({
                user: fallbackNpc.name,
                content: cleanBody.slice(0, 50) || '噗，这动态太搞笑了！'
            });
            addedCount++;
        }

        renderSocialPanel();
        autoSaveGame();
        showToast(`💬 好友已在动态下热烈互动评论！`, 'success', 2500);

    } catch(e) {
        console.error('朋友圈评论生成失败', e);
        showToast('❌ 互动生成失败：' + e.message, 'error');
    }
}

// ============================================================
// 💬 聊天长按菜单（撤回/编辑/删除）
// ============================================================
function showMessageActionSheet(msgId, targetType, targetId) {
    const list = targetType === 'single' ? getAccountChatHistory(targetId) : (G.groupChatHistory[targetId] || []);
    const msg = list.find(m => m._id === msgId);
    if (!msg || msg.from !== 'player') return;

    openModal(`
        <h3>💬 消息操作</h3>
        <div style="background:#f4f7f4;padding:8px 12px;border-radius:8px;font-size:13px;color:#333;margin:8px 0 14px;word-break:break-word;">
            “${escapeHtml(msg.text)}”
        </div>
        <div class="btn-row" style="flex-direction:column;gap:8px;">
            <button class="btn-primary" id="btnActionRecall" style="width:100%;background:#388e3c;">↩️ 撤 回（对方有概率看到）</button>
            <button class="btn-primary" id="btnActionEdit" style="width:100%;background:#1976d2;">✏️ 编 辑（静默修改发错文字）</button>
            <button class="btn-secondary" id="btnActionDelete" style="width:100%;color:#c62828;background:#ffebee;border-color:#ffcdd2;">🗑️ 删 除（无痕抹去）</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">取消</button>
        </div>
    `);

    document.getElementById('btnActionRecall').onclick = () => {
        closeModal();
        const origText = msg.text;
        const isSeenByNpc = Math.random() < 0.5;

        msg.from = 'action';
        msg.text = '你撤回了一条消息';
        msg._recalled = true;
        msg._originalText = origText;
        msg._seenByNpc = isSeenByNpc;

        if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
        else renderGroupChatWindow(document.getElementById('socialTab'));

        if (isSeenByNpc) showToast('👀 提示：你撤回了一条消息，但对方好像已经看到了...', 'info', 2500);
        else showToast('↩️ 消息已撤回，对方没有看到', 'success', 2000);
        autoSaveGame();
    };

    document.getElementById('btnActionEdit').onclick = () => {
        closeModal();
        openModal(`
            <h3>✏️ 编辑消息</h3>
            <p style="font-size:12px;color:#666;">修改已经发送的消息（AI仅会读取编辑后的内容，不会察觉你修改过）：</p>
            <div class="form-group">
                <textarea id="editMsgTextInput" rows="3" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;font-size:13px;">${escapeHtml(msg.text)}</textarea>
            </div>
            <div class="btn-row">
                <button class="btn-secondary" onclick="closeModal()">取消</button>
                <button class="btn-primary" id="confirmSaveEditMsg">💾 保存修改</button>
            </div>
        `);
        document.getElementById('confirmSaveEditMsg').onclick = () => {
            const newT = document.getElementById('editMsgTextInput').value.trim();
            if (!newT) { showToast('内容不能为空', 'error'); return; }
            msg.text = newT;
            closeModal();
            if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
            else renderGroupChatWindow(document.getElementById('socialTab'));
            showToast('✅ 消息已成功修改', 'success', 1500);
            autoSaveGame();
        };
    };

    document.getElementById('btnActionDelete').onclick = () => {
        closeModal();
        const idx = list.findIndex(m => m._id === msgId);
        if (idx !== -1) list.splice(idx, 1);
        if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
        else renderGroupChatWindow(document.getElementById('socialTab'));
        showToast('🗑️ 消息已从历史中抹除', 'info', 1500);
        autoSaveGame();
    };
}

// 💬 聊天加号弹窗：整合拍共创视频、联动直播与旁白
function openChatActionMenuModal(targetType, targetId) {
    const isGroup = targetType === 'group';
    const title = isGroup ? '👥 群聊互动与共创' : `🤝 与 ${escapeHtml(G.npcs[targetId]?.name || '好友')} 的互动`;

    openModal(`
        <h3>${title}</h3>
        <p style="font-size:12px;color:#666;line-height:1.5;">选择与对方展开的合作联动形式：</p>
        <div class="btn-row" style="flex-direction:column;gap:8px;margin-top:10px;">
            <button class="btn-primary" id="actCollabVideoBtn" style="width:100%;background:#e53935;">🎬 邀请一起录制拍视频 (油管共创)</button>
            <button class="btn-primary" id="actCollabStreamBtn" style="width:100%;background:#388e3c;">🔴 邀请一起联机开播 (连麦涨粉)</button>
            <button class="btn-secondary" id="actInsertNarrativeBtn" style="width:100%;">📝 插入旁白/动作描写</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">取消</button>
        </div>
    `);

    document.getElementById('actCollabVideoBtn').onclick = () => {
        closeModal();
        openCollabVideoPublishModal(targetType, targetId);
    };

    document.getElementById('actCollabStreamBtn').onclick = () => {
        closeModal();
        handleInviteCollabStream(targetType, targetId);
    };

    document.getElementById('actInsertNarrativeBtn').onclick = () => {
        closeModal();
        openInsertNarrativeModal(targetType, targetId);
    };
}

function openInsertNarrativeModal(targetType, targetId) {
    openModal(`
        <h3>📝 插入场景/动作描写</h3>
        <p style="font-size:12px;color:#666;">以旁白视角描写此时的环境或动作（如：*端起咖啡喝了一口*）</p>
        <div class="form-group">
            <textarea id="actionNarrativeInput" rows="3" placeholder="例如：转过头看向窗外，微笑着说道..." style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;font-size:13px;"></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="confirmInsertAction">发送旁白</button>
        </div>
    `);

    document.getElementById('confirmInsertAction').onclick = () => {
        const act = document.getElementById('actionNarrativeInput').value.trim();
        if (!act) return;
        const msgObj = { _id: 'act_' + Date.now(), from: 'action', text: `* ${act} *`, time: new Date().toLocaleTimeString().slice(0, 5) };
        if (targetType === 'single') {
            pushChatMessageSafe(targetId, msgObj);
            renderSingleChatWindow(document.getElementById('socialTab'));
        } else {
            if (!G.groupChatHistory[targetId]) G.groupChatHistory[targetId] = [];
            G.groupChatHistory[targetId].push(msgObj);
            renderGroupChatWindow(document.getElementById('socialTab'));
        }
        closeModal();
        autoSaveGame();
    };
}

// 🎬 拍共创视频模态框
function openCollabVideoPublishModal(targetType, targetId) {
    const isGroup = targetType === 'group';
    let participants = [];

    if (isGroup) {
        const grp = G.groups[targetId];
        participants = (grp.members || []).map(mid => G.npcs[mid]).filter(Boolean);
    } else {
        const npc = G.npcs[targetId];
        if (npc) participants.push(npc);
    }

    const partnerCheckboxes = participants.map((p) => `
        <label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;background:#f4f6f4;padding:4px 8px;border-radius:12px;margin:2px;">
            <input type="checkbox" class="collab-partner-check" value="${p.id}" checked>
            <span>${p.avatarEmoji || '👤'} ${escapeHtml(p.name)}</span>
        </label>
    `).join('');

    openModal(`
        <h3>🎬 发起共创视频拍摄</h3>
        <div style="font-size:12px;color:#666;margin-bottom:8px;">
            共创搭档：<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${partnerCheckboxes}</div>
        </div>
        <div class="form-group">
            <label>视频标题 <span class="required">*</span></label>
            <input type="text" id="collabVideoTitle" placeholder="起一个吸睛的爆款标题...">
        </div>
        <div class="form-group">
            <label>剪辑灵感 (简短点子)</label>
            <div style="display:flex;gap:6px;">
                <input type="text" id="collabVideoIdea" placeholder="如：下界连环整蛊陷阱、双人速通抢龙、红石机关大整蛊..." style="flex:1;">
                <button type="button" class="btn-secondary small" id="btnAiDraftVideo">🤖 AI生成内容</button>
            </div>
        </div>
        <div class="form-group">
            <label>视频脚本剧情 / 简介 <span class="required">*</span></label>
            <textarea id="collabVideoSummary" rows="3" placeholder="描述这期视频的核心高光击杀、互坑搞笑反转等..."></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnPublishCollabVideo">🚀 发布共创视频并推进时段</button>
        </div>
    `);

    document.getElementById('btnAiDraftVideo').onclick = async () => {
        const idea = document.getElementById('collabVideoIdea').value.trim();
        const checkedBoxes = document.querySelectorAll('.collab-partner-check:checked');
        const partnerNames = Array.from(checkedBoxes).map(cb => G.npcs[cb.value]?.name).filter(Boolean);
        const partnerNamesStr = partnerNames.join('、') || '好友';

        showToast('🤖 AI 正在构思爆款标题与内容...', 'info', 1500);
        try {
            const sys = `你是一名顶级 YouTube 游戏主播。玩家「${G.player.ytName}」正与搭档「${partnerNamesStr}」共同录制一期 Minecraft 合作视频。灵感线索为：${idea || '趣味竞技与互坑挑战'}。请生成一个极其吸睛的视频标题，以及一段80字以内的精彩剧情高光简介。
格式规范：
[TITLE]标题[/TITLE]
[CONTENT]高光简介[/CONTENT]`;
            const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '请编写共创视频设定。' }], { maxTokens: 300, temperature: 0.9 });
            const tMatch = raw.match(/\[TITLE\]([\s\S]*?)\[\/TITLE\]/);
            const cMatch = raw.match(/\[CONTENT\]([\s\S]*?)\[\/CONTENT\]/);
            if (tMatch) document.getElementById('collabVideoTitle').value = tMatch[1].trim();
            if (cMatch) document.getElementById('collabVideoSummary').value = cMatch[1].trim();
            showToast('✅ 视频文案已生成！', 'success', 1200);
        } catch(e) {
            showToast('❌ AI 生成失败，请手动填写', 'error');
        }
    };

    document.getElementById('btnPublishCollabVideo').onclick = async () => {
        const title = document.getElementById('collabVideoTitle').value.trim();
        const summary = document.getElementById('collabVideoSummary').value.trim();
        const checkedBoxes = document.querySelectorAll('.collab-partner-check:checked');
        const partnerIds = Array.from(checkedBoxes).map(cb => cb.value);

        if (!title) { showToast('⚠️ 请输入视频标题', 'error'); return; }
        if (!summary) { showToast('⚠️ 请填写视频剧情高光', 'error'); return; }
        if (!partnerIds.length) { showToast('⚠️ 至少需要勾选一位合作搭档', 'error'); return; }

        if (G.actionPoints < 2) { showToast('⚠️ 行动点不足，录制视频需要 2 点推进时段', 'error'); return; }
        G.actionPoints -= 2;

        const partnerNames = partnerIds.map(id => G.npcs[id]?.name).filter(Boolean);
        const fullTitle = `【共创】${title} (ft. ${partnerNames.join(' & ')})`;

        const videoObj = {
            title: fullTitle,
            desc: summary,
            isCollab: true,
            partners: partnerNames,
            views: rand(800, 3500) + partnerNames.length * 500,
            likes: rand(100, 800) + partnerNames.length * 80,
            day: G.day,
            comments: []
        };

        if (!G.player.videos) G.player.videos = [];
        G.player.videos.push(videoObj);

        if (!G.ytExternalVideos) G.ytExternalVideos = [];
        G.ytExternalVideos.unshift({
            _id: 'yt_collab_' + Date.now(),
            channelId: 'all',
            title: fullTitle,
            author: `${G.player.ytName} × ${partnerNames.join(' × ')}`,
            authorId: partnerIds[0] || null,
            views: `${videoObj.views}次观看`,
            time: '刚刚',
            duration: `${rand(10, 25)}:${rand(10, 59)}`,
            thumbnailEmoji: pick(['⚔️', '🎬', '💥', '🏆', '🔥']),
            summary: summary,
            comments: []
        });

        partnerIds.forEach(id => {
            const n = G.npcs[id];
            if (n) {
                n.favor = Math.min(100, (n.favor || 0) + rand(3, 7));
                n.memorySummary = (n.memorySummary || '') + `\n【合作拍摄】：与主角合拍了视频《${fullTitle}》，反响热烈。`;
            }
        });

        G.player.followers += rand(250, 900) + partnerNames.length * 150;
        G.player.money += rand(60, 180);

        closeModal();
        appendStory(`🎬 你与 ${partnerNames.join('、')} 联合拍摄发布了爆款共创视频《${fullTitle}》！好感度与播放量大涨！`, '🤜 合作共创');
        addGlobalMemoryRecord(`【共创发布】：主角与 ${partnerNames.join('、')} 合作发布了油管共创视频《${fullTitle}》，收获 ${videoObj.views} 播放。`);
        
        showToast(`🎉 共创视频发布成功！`, 'success', 2500);
        advanceTimeSlot();
        updateUI();
        autoSaveGame();
        renderSocialPanel();
        checkSocialRequestsTrigger();
    };
}

function handleInviteCollabStream(targetType, targetId) {
    const isGroup = targetType === 'group';
    let partnerNames = [];
    if (isGroup) {
        partnerNames = (G.groups[targetId]?.members || []).map(mid => G.npcs[mid]?.name).filter(Boolean);
    } else {
        const npc = G.npcs[targetId];
        if (npc) partnerNames.push(npc.name);
    }

    if (!partnerNames.length) { showToast('找不到联动搭档', 'error'); return; }

    G.pendingCollabPartners = partnerNames;
    showToast(`📺 已向 ${partnerNames.join('、')} 发出连麦邀请！切换至直播面板开启直播`, 'success', 2500);
    switchTab('stream');
}

// 💬 私聊窗口渲染（含账号隔离、气泡自适应、历史折叠、右上角切号头像）
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
                <div style="font-weight:700;font-size:11px;color:#8d6e63;margin-bottom:3px;display:flex;align-items:center;gap:4px;">
                    <span>👁️ 屏幕那边的 TA (${escapeHtml(npc.name)})</span>
                </div>
                <div>${escapeHtml(msg.text)}</div>
            </div>`;
        } else {
            const isSelf = msg.from === 'player';
            let bubbleContent = '';

            if (msg.sticker) {
                bubbleContent = `
                <div style="padding:0;display:inline-block;">
                    <img src="${msg.sticker.url}" alt="${escapeHtml(msg.sticker.desc)}" style="width:85px;height:85px;border-radius:8px;object-fit:cover;display:block;">
                </div>`;
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
                ${!isSelf ? `<div class="chat-npc-avatar-btn" data-npcid="${npcId}" style="margin-right:8px;flex-shrink:0;cursor:pointer;" title="单击看名片，长按编辑人设与资料">${renderAvatarBadge(npc, 34)}</div>` : ''}
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
        <!-- 紧凑单行顶栏 -->
        <div style="padding:8px 12px;background:#fff;border-bottom:1px solid #e5ebe5;display:flex;justify-content:space-between;align-items:center;min-height:48px;box-sizing:border-box;">
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                <button onclick="closeChat()" style="border:none;background:none;font-size:19px;color:#333;cursor:pointer;padding:0 2px;">❮</button>
                <div id="singleChatHeaderProfileBtn" style="cursor:pointer;flex:1;min-width:0;" title="单击看名片，长按编辑TA的人设">
                    <div style="font-weight:700;font-size:14.5px;display:flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        <span style="overflow:hidden;text-overflow:ellipsis;">${escapeHtml(npc.name)}</span>
                        <span style="font-size:10.5px;color:#e53935;font-weight:normal;background:#ffebee;padding:1px 5px;border-radius:6px;flex-shrink:0;">❤️ ${npc.favor || 0}</span>
                    </div>
                    <div id="chatOnlineStatusText" style="font-size:10.5px;color:#2e7d32;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${isBlocked ? '<span style="color:#d32f2f;">⚠️ 已拉黑</span>' : '● 在线'} ${npc.memorySummary ? '· 🧠记忆' : ''}
                    </div>
                </div>
            </div>

            <!-- 右侧紧凑小图标区 -->
            <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                <button id="btnToggleBehindScreen" style="border:1px solid ${isBehindScreenActive ? '#8d6e63' : '#ccc'};background:${isBehindScreenActive ? '#efebe9' : '#fff'};width:30px;height:30px;border-radius:50%;font-size:15px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s ease;" title="${isBehindScreenActive ? '已开启屏幕那边的动作感知(点击关闭)' : '点击开启屏幕那边的动作感知'}">
                    👁️
                </button>
                <div id="singleChatHeaderAccountBtn" title="当前账号：${escapeHtml(activeAcc.name)} (点击切换)" style="cursor:pointer;display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;border:1.5px solid ${activeAcc.isAlt ? '#ffb300' : 'var(--primary)'};overflow:hidden;background:#fff;">
                    ${activeAcc.avatar ? `<img src="${activeAcc.avatar}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-size:14px;">${activeAcc.isAlt ? '🎭' : '👑'}</span>`}
                </div>
                <button id="triggerAIReplyBtn" title="让TA回复或主动发消息" style="border:none;background:#ff4757;color:#fff;width:32px;height:32px;border-radius:8px;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        ${isBlocked ? `
        <div style="background:#ffebee;color:#c62828;padding:5px 12px;font-size:11px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ffcdd2;">
            <span>🚫 你的当前账号已被对方拉黑拒收。</span>
            <button onclick="openAccountManagerModal()" style="border:none;background:#c62828;color:#fff;padding:2px 7px;border-radius:6px;font-size:10px;cursor:pointer;">切小号转圜</button>
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

    if (_stickerDrawerOpen) {
        bindStickerDrawerEvents('single', npcId);
    }

    document.getElementById('btnToggleBehindScreen')?.addEventListener('click', () => {
        window.G._behindScreenActive[npcId] = !window.G._behindScreenActive[npcId];
        showToast(window.G._behindScreenActive[npcId] ? '👁️ 已开启「屏幕那边的TA」动作感知' : '已关闭线下动作感知', 'info', 1500);
        renderSingleChatWindow(container);
        autoSaveGame();
    });

    document.getElementById('chatToggleStickerBtn')?.addEventListener('click', () => {
        _stickerDrawerOpen = !_stickerDrawerOpen;
        renderSingleChatWindow(container);
    });

    document.getElementById('btnLoadMoreChatHist')?.addEventListener('click', () => {
        window.G._chatShowFullHistory[sessionKey] = true;
        renderSingleChatWindow(container);
    });

    document.getElementById('singleChatHeaderAccountBtn')?.addEventListener('click', openAccountManagerModal);

    // 绑定长按气泡触发撤回/编辑/删除
    container.querySelectorAll('.chat-msg-row[data-from="player"]').forEach(row => {
        const msgId = row.dataset.msgid;
        const bubble = row.querySelector('.self-bubble');
        if (bubble && msgId) {
            bindLongPressEvent(bubble, () => {
                showMessageActionSheet(msgId, 'single', npcId);
            });
        }
    });

    // 🌟 长按头像弹出编辑角色资料；单击查看角色名片
    container.querySelectorAll('.chat-npc-avatar-btn').forEach(btn => {
        bindLongPressEvent(
            btn,
            () => openEditNpcModal(npcId),
            () => openNpcProfileCardModal(npcId)
        );
    });

    const headerProfileBtn = document.getElementById('singleChatHeaderProfileBtn');
    if (headerProfileBtn) {
        bindLongPressEvent(
            headerProfileBtn,
            () => openEditNpcModal(npcId),
            () => openNpcProfileCardModal(npcId)
        );
    }

    const input = document.getElementById('singleChatInput');
    const sendBtn = document.getElementById('singleSendBtn');

    const doSend = () => {
        const text = input.value.trim();
        if (!text) return;

        if (isBlocked) {
            pushChatMessageSafe(npcId, {
                from: 'player',
                text,
                senderAccount: activeAcc.name,
                time: new Date().toLocaleTimeString().slice(0, 5)
            });
            pushChatMessageSafe(npcId, {
                from: 'action',
                text: `❌ 消息已发出，但被对方拒收了。（当前账号已被拉黑）`,
                time: new Date().toLocaleTimeString().slice(0, 5)
            });
            input.value = '';
            renderSingleChatWindow(container);
            showToast('⚠️ 对方开启了朋友验证，你已被拉黑', 'error', 3000);
            return;
        }

        pushChatMessageSafe(npcId, {
            from: 'player',
            text,
            senderAccount: activeAcc.isAlt ? `${activeAcc.name} (小号)` : activeAcc.name,
            time: new Date().toLocaleTimeString().slice(0, 5)
        });
        input.value = '';
        renderSingleChatWindow(container);
        autoSaveGame();
    };

    if (sendBtn) sendBtn.onclick = doSend;
    if (input) {
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                doSend();
            }
        };
    }

    document.getElementById('chatActionInsertBtn')?.addEventListener('click', () => {
        openChatActionMenuModal('single', npcId);
    });

    const triggerBtn = document.getElementById('triggerAIReplyBtn');
    if (triggerBtn) {
        triggerBtn.onclick = async () => {
            if (window.G.isGenerating) { showToast('⏳ TA 正在打字中...', 'info', 1500); return; }
            triggerBtn.style.opacity = '0.5';
            triggerBtn.style.pointerEvents = 'none';
            await triggerAIReplyForSingle(npcId);
            if (document.getElementById('triggerAIReplyBtn')) {
                document.getElementById('triggerAIReplyBtn').style.opacity = '1';
                document.getElementById('triggerAIReplyBtn').style.pointerEvents = 'auto';
            }
        };
    }
}

function openNpcProfileCardModal(npcId) {
    const npc = G.npcs[npcId];
    if (!npc) return;
    const curAcc = getActiveAccountInfo();
    const isBlocked = isAccountBlockedByNpc(npcId, curAcc.id);

    openModal(`
        <div style="text-align:center;padding:10px 0;">
            <div style="display:flex;justify-content:center;margin-bottom:8px;">
                ${renderAvatarBadge(npc, 64)}
            </div>
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

    document.getElementById('cardViewMomentsBtn').onclick = () => {
        closeModal();
        closeChat();
        G.phoneNav = 'moments';
        G.momentsFilterNpcId = npcId;
        renderSocialPanel();
    };

    document.getElementById('cardEditNpcBtn').onclick = () => {
        closeModal();
        openEditNpcModal(npcId);
    };
}

async function checkNpcMemorySummarize(npcId) {
    const memCfg = G.memoryConfig || {};
    if (memCfg.enabled === false) return;

    const npc = G.npcs[npcId];
    if (!npc) return;
    const history = getAccountChatHistory(npcId);
    const threshold = npc.summaryThreshold || memCfg.defaultThreshold || 10;
    const keepRecent = npc.keepRecent || memCfg.defaultKeepRecent || 5;

    if (history.length >= threshold && !npc._summarizing) {
        npc._summarizing = true;
        try {
            const toSummarize = history.slice(0, Math.max(1, history.length - keepRecent));
            const textToSummarize = toSummarize.map(m => `${m.from === 'player' ? '主角' : npc.name}: ${stripThought(m.text || '')}`).join('\n');
            const prior = npc.memorySummary ? `【此前已有记忆】：\n${npc.memorySummary}\n\n` : '';
            const sys = `你是精炼的角色长期记忆整理助手。请将主角与「${npc.name}」的最新私聊对话与此前记忆进行提炼合并，输出一段不超过180字的精炼记忆摘要。保留两人的关系变化、关键话题、约定承诺与喜好细节。直接输出摘要正文，严禁废话。`;

            const summary = await callMemoryAI([
                { role: 'system', content: sys },
                { role: 'user', content: `${prior}【需归纳的新对话】：\n${textToSummarize}` }
            ], { maxTokens: 400, temperature: 0.35 });

            npc.memorySummary = stripThought(summary.trim());
            autoSaveGame();
            showToast(`🧠 已自动整理与 ${npc.name} 的私聊记忆！`, 'info', 2000);
        } catch (e) {
            console.warn('NPC 记忆总结失败', e);
            showMemoryFailNoticeModal(`角色「${npc.name}」私聊记忆`, e.message);
        } finally {
            npc._summarizing = false;
        }
    }
}

function splitIntoChatBubbles(rawText) {
    if (!rawText) return [];
    const clean = stripThought(rawText).trim();
    if (!clean) return [];

    const bubbles = [];
    const msgTagRegex = /\[MSG\]([\s\S]*?)\[\/MSG\]/gi;
    let match;
    while ((match = msgTagRegex.exec(clean)) !== null) {
        const item = match[1].trim();
        if (item) bubbles.push(item);
    }

    if (bubbles.length > 0) return bubbles.slice(0, 5);

    const lines = clean.split(/\n+/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
        return lines.slice(0, 5);
    }

    if (lines.length === 1 && lines[0].length > 35) {
        const sentences = lines[0].split(/([。！？!?~～]+)/).filter(Boolean);
        let current = '';
        for (let i = 0; i < sentences.length; i++) {
            current += sentences[i];
            if (i % 2 === 1 || current.length > 20) {
                if (current.trim()) bubbles.push(current.trim());
                current = '';
            }
        }
        if (current.trim()) bubbles.push(current.trim());
        if (bubbles.length > 0) return bubbles.slice(0, 5);
    }

    return [clean];
}

// ⚡ 单人聊天 AI 回复触发（贯通朋友圈动态记忆 + 真实时差自适应推导）
async function triggerAIReplyForSingle(npcId) {
    const npc = window.G.npcs[npcId];
    if (!npc) return;
    const activeAcc = getActiveAccountInfo();
    const isCurrentlyBlocked = isAccountBlockedByNpc(npcId, activeAcc.id);
    const isBehindScreenActive = !!window.G._behindScreenActive[npcId];

    if (isCurrentlyBlocked) {
        showToast('⚠️ 当前账号已被对方拉黑，无法接收回复。', 'error', 3000);
        return;
    }

    const history = getAccountChatHistory(npcId);
    const statusEl = document.getElementById('chatOnlineStatusText');
    if (statusEl) statusEl.innerHTML = `<span style="color:#ff9800;">✍️ 对方正在打字...</span>`;

    let recentContext = '';
    if (history.length > 0) {
        recentContext = history.slice(-10).map(m => {
            if (m._recalled) {
                return m._seenByNpc
                    ? `[系统提示: 对方发了“${m._originalText}”，随后撤回了，但被你亲眼看到了]`
                    : `[系统提示: 对方撤回了一条消息]`;
            }
            if (m.from === 'action') return `[旁白: ${m.text}]`;
            if (m.from === 'behind_screen') return `[此前你屏幕那边的线下动作: ${m.text}]`;
            if (m.sharedMoment) return `[对方转发了朋友圈动态给你: “${m.sharedMoment.body}”]`;
            const speaker = m.from === 'player' ? (m.senderAccount || '主角') : npc.name;
            return `${speaker}: ${m.sticker ? `[发送了表情包: ${m.sticker.desc}]` : stripThought(m.text || '')}`;
        }).join('\n');
    } else {
        recentContext = '（尚未开始对话，双方此前没有任何私聊记录）';
    }

    let npcMemoryContext = '';
    if (npc.memorySummary) npcMemoryContext += `【历史专属记忆与朋友圈互动】\n${npc.memorySummary}\n`;
    if (npc.knownGroupEvents) npcMemoryContext += `【群聊获悉事件】\n${npc.knownGroupEvents}\n`;

    const recentPlayerPosts = (window.G.feed || []).filter(f => f.isPlayer || f.author === window.G.player?.ytName).slice(-2);
    let playerMomentsContext = '';
    if (recentPlayerPosts.length > 0) {
        playerMomentsContext = '【玩家最近发的朋友圈动态（可自然在私信中提起）】：\n' +
            recentPlayerPosts.map(p => `• “${p.body}” ${p.image ? '(附带图片)' : ''}${p.imageDesc ? `(配图: ${p.imageDesc})` : ''}`).join('\n') + '\n';
    }

    const tzContext = formatNpcTimezoneContext(npc.name);
    const availableStickers = (window.G.stickerLibrary || []).slice(0, 20).map(s => s.desc).join('、');
    const curFavor = npc.favor || 0;

    let favorStageRule = '';
    if (curFavor < 20) {
        favorStageRule = `
【🚨 好感度极度生疏阶段警告（当前好感度: ${curFavor}/100）】：
1. 双方【刚刚认识或完全不熟】！你对玩家的态度必须保持【明显的冷淡、生疏、防备、距离感、或作为知名大主播对新人的冷漠审视】！
2. 绝对严禁【自来熟】！严禁说“你想我了”、“抢着点给我道早安”、“下午一起联机谁都不许迟到”等老熟人/情侣才会说的自恋调侃！
3. 玩家如果说你好，你只能冷淡简洁地回应“你好，有事？”或“请问你是？”；绝不要无端主动约对方联机或讨论合作！
`;
    } else if (curFavor < 40) {
        favorStageRule = `
【好感度阶段：点头之交（当前好感度: ${curFavor}/100）】：
客气、礼貌的同行关系，偶尔互相客套，但依然保持基本社交礼貌，不做过分亲密的玩笑。
`;
    } else if (curFavor < 60) {
        favorStageRule = `
【好感度阶段：熟络朋友（当前好感度: ${curFavor}/100）】：
已经比较熟悉，可以互相开玩笑、互怼、讨论视频灵感与日常。
`;
    } else {
        favorStageRule = `
【好感度阶段：知己/暧昧（当前好感度: ${curFavor}/100）】：
关系亲密，默契深厚，充满护短与偏袒。
`;
    }

    const behindScreenPrompt = isBehindScreenActive ? `
【屏幕那边的TA（线下第三人称动作感知）】：
玩家已开启线下动作感知。请在输出完聊天消息后，额外输出一个独立块 [BEHIND_SCREEN]...[/BEHIND_SCREEN]，细腻描写你在屏幕那边的真实线下动作、环境与心理小动作（30~60字）。
例如：
[BEHIND_SCREEN]靠在电竞椅上端起冰美式喝了一口，单手转动着鼠标，屏幕微光映在冷峻的脸上，等待着对话框的动静。[/BEHIND_SCREEN]
` : '';

    const sysPrompt = `
你正在扮演真实沉浸的 Minecraft 主播/好友「${npc.name}」（性格人设：${npc.persona || '一位同伴'}）。
${favorStageRule}
${tzContext}
${npcMemoryContext}
${playerMomentsContext}

【严禁出戏括号与纯净打字铁律】：
1. 聊天气泡内【绝对禁止】包含任何动作括号（如“（叹气）”、“（喝了一口水）”、“*微笑*”等）！把聊天框当成真实的微信打字，只输出纯粹口语化的消息文字！
2. 支持发送表情包斗图：若语境合适，可将其中一条消息写为 [STICKER:表情关键词]（可用关键词参考：${availableStickers}）。
3. 必须输出 2 到 4 条短消息气泡，每条用 [MSG]...[/MSG] 包裹，禁止 markdown 代码块：
[MSG]第一句话[/MSG]
[MSG]第二句话[/MSG]
${behindScreenPrompt}
`;

    try {
        window.G.isGenerating = true;
        if (typeof showLoading === 'function') showLoading();

        const rawReply = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: history.length > 0 ? '请根据当前聊天上下文连续发送多条纯打字回复。' : '请根据当前好感度做出初次打招呼或回应。' }
        ], { maxTokens: 550, temperature: 0.9 });

        if (typeof hideLoading === 'function') hideLoading();

        let cleanText = rawReply || '';
        let behindScreenActionText = '';

        const bsMatch = cleanText.match(/\[BEHIND_SCREEN\]([\s\S]*?)\[\/BEHIND_SCREEN\]/i);
        if (bsMatch) {
            behindScreenActionText = stripThought(bsMatch[1].trim());
            cleanText = cleanText.replace(/\[BEHIND_SCREEN\][\s\S]*?\[\/BEHIND_SCREEN\]/gi, '').trim();
        }

        const bubbles = splitIntoChatBubbles(cleanText);
        const finalBubbles = (bubbles && bubbles.length) ? bubbles : ['你好，有什么事吗？'];

        for (let i = 0; i < finalBubbles.length; i++) {
            const bText = finalBubbles[i];
            const stkMatch = bText.match(/\[STICKER:([^\]]+)\]/i);

            if (stkMatch) {
                const stkObj = findStickerByKeyword(stkMatch[1]);
                if (stkObj) {
                    pushChatMessageSafe(npcId, {
                        from: 'npc',
                        text: `[表情: ${stkObj.desc}]`,
                        sticker: stkObj,
                        time: new Date().toLocaleTimeString().slice(0, 5)
                    });
                } else {
                    pushChatMessageSafe(npcId, {
                        from: 'npc',
                        text: bText.replace(/\[STICKER:[^\]]+\]/gi, '😏'),
                        time: new Date().toLocaleTimeString().slice(0, 5)
                    });
                }
            } else {
                pushChatMessageSafe(npcId, {
                    from: 'npc',
                    text: bText,
                    time: new Date().toLocaleTimeString().slice(0, 5)
                });
            }

            const container = (dom && dom.socialTab) || document.getElementById('socialTab');
            if (window.G.currentChatNpc === npcId && container) {
                renderSingleChatWindow(container);
            }

            if (i < finalBubbles.length - 1) {
                await new Promise(res => setTimeout(res, 500));
            }
        }

        if (behindScreenActionText && isBehindScreenActive) {
            pushChatMessageSafe(npcId, {
                from: 'behind_screen',
                text: behindScreenActionText,
                time: new Date().toLocaleTimeString().slice(0, 5)
            });
            const container = (dom && dom.socialTab) || document.getElementById('socialTab');
            if (window.G.currentChatNpc === npcId && container) {
                renderSingleChatWindow(container);
            }
        }

        autoSaveGame();
    } catch (e) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('私聊 AI 回复失败', e);
        showToast('❌ 回复失败，请检查网络或设置', 'error');
    } finally {
        window.G.isGenerating = false;
        const curStatusEl = document.getElementById('chatOnlineStatusText');
        const isNowBlocked = isAccountBlockedByNpc(npcId, activeAcc.id);
        if (curStatusEl) {
            curStatusEl.innerHTML = `${isNowBlocked ? '<span style="color:#d32f2f;">⚠️ TA已拉黑</span>' : '● 在线'} ${npc.memorySummary ? '· 🧠记忆' : ''}`;
        }
    }
}

// ============================================================
// 👥 群聊系统
// ============================================================
function openGroupChat(gid) {
    if (!G.groups || !G.groups[gid]) return;
    G.currentChatNpc = null;
    G.currentChatGroup = gid;
    G.chatActiveTab = 'group';
    G.phoneNav = 'chats';
    if (typeof switchTab === 'function') {
        switchTab('social');
    } else {
        renderSocialPanel();
    }
}

function closeGroupChat() {
    G.currentChatGroup = null;
    renderSocialPanel();
}

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
            messagesHtml += `
            <div class="chat-msg-row" data-msgid="${msg._id || ''}" data-from="${msg.from}" style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:10px;align-items:flex-start;">
                ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: msg.senderAvatarUrl, avatarEmoji: msg.senderAvatar || '👤' }, 34)}</div>` : ''}
                <div style="max-width:75%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                    ${!isSelf ? `<div style="font-size:11px;color:#777;margin-bottom:2px;">${escapeHtml(msg.senderName)}</div>` : ''}
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? '#95ec69' : '#fff'};color:#111;padding:8px 12px;border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:0 1px 3px rgba(0,0,0,0.08);font-size:14px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;">
                        ${isSelf ? escapeHtml(msg.text).replace(/\n/g, '<br>') : renderContentWithThoughts(msg.text)}
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
                <button onclick="closeGroupChat()" style="border:none;background:none;font-size:20px;color:#333;cursor:pointer;padding:0 4px;">❮</button>
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

        <div style="padding:8px 10px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:8px;align-items:center;">
            <button id="groupActionInsertBtn" title="群合作/共创视频/旁白" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
            <textarea id="groupChatInput" rows="1" placeholder="以 [${escapeHtml(activeAcc.name)}] 在群里发言..." style="flex:1;padding:8px 12px;border-radius:18px;border:1px solid #ddd;background:#f8faf8;font-size:14px;resize:none;outline:none;font-family:inherit;"></textarea>
            <button id="groupSendBtn" style="border:none;background:var(--primary);color:#fff;padding:8px 16px;border-radius:18px;font-size:13px;font-weight:700;cursor:pointer;">发送</button>
        </div>
    </div>
    `;
    container.innerHTML = html;

    const msgArea = document.getElementById('groupMessageArea');
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;

    container.querySelectorAll('.chat-msg-row[data-from="player"]').forEach(row => {
        const msgId = row.dataset.msgid;
        const bubble = row.querySelector('.self-bubble');
        if (bubble && msgId) {
            bindLongPressEvent(bubble, () => {
                showMessageActionSheet(msgId, 'group', gid);
            });
        }
    });

    const input = document.getElementById('groupChatInput');
    const sendBtn = document.getElementById('groupSendBtn');

    const doSend = () => {
        const text = input.value.trim();
        if (!text) return;
        if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
        G.groupChatHistory[gid].push({
            _id: 'gmsg_' + Date.now() + '_' + rand(100, 999),
            from: 'player',
            senderName: activeAcc.name,
            text,
            time: new Date().toLocaleTimeString().slice(0, 5)
        });
        input.value = '';
        renderGroupChatWindow(container);
        autoSaveGame();
    };

    if (sendBtn) sendBtn.onclick = doSend;
    if (input) {
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                doSend();
            }
        };
    }

    document.getElementById('groupActionInsertBtn')?.addEventListener('click', () => {
        openChatActionMenuModal('group', gid);
    });

    document.getElementById('groupSettingsBtn')?.addEventListener('click', () => openGroupSettingsModal(gid));
    
    const triggerGrpBtn = document.getElementById('triggerGroupAIBtn');
    if (triggerGrpBtn) {
        triggerGrpBtn.onclick = async () => {
            if (G.isGenerating) { showToast('⏳ AI 正在组织群聊中...'); return; }
            showToast('⚡ 触发群聊讨论...', 'success', 1200);
            await triggerGroupAIReply(gid);
            renderGroupChatWindow(container);
        };
    }
}

async function checkGroupMemorySummarize(gid) {
    const memCfg = G.memoryConfig || {};
    if (memCfg.enabled === false) return;

    const grp = G.groups[gid];
    if (!grp) return;
    const history = G.groupChatHistory[gid] || [];
    const threshold = grp.summaryThreshold || memCfg.defaultThreshold || 10;
    const keepRecent = grp.keepRecent || memCfg.defaultKeepRecent || 5;

    if (history.length >= threshold && !grp._summarizing) {
        grp._summarizing = true;
        try {
            const toSummarize = history.slice(0, Math.max(1, history.length - keepRecent));
            const textToSummarize = toSummarize.map(m => `${m.senderName}: ${stripThought(m.text || '')}`).join('\n');
            const prior = G.groupMemories[gid] ? `【群聊已有纪要】：\n${G.groupMemories[gid]}\n\n` : '';

            const sys = `你是群聊记忆纪要整理员。请将群聊「${grp.name}」中的讨论内容提炼为一段150字以内的核心纪要，包含聊过的八卦、共同约定、关键笑点与事件。直接输出纪要正文。`;
            const summary = await callMemoryAI([
                { role: 'system', content: sys },
                { role: 'user', content: `${prior}【最新群聊记录】：\n${textToSummarize}` }
            ], { maxTokens: 350, temperature: 0.35 });

            const cleanSummary = stripThought(summary.trim());
            G.groupMemories[gid] = cleanSummary;

            (grp.members || []).forEach(mid => {
                const targetNpc = G.npcs[mid];
                if (targetNpc) {
                    targetNpc.knownGroupEvents = `【在群「${grp.name}」获悉】：${cleanSummary}`;
                }
            });

            autoSaveGame();
            showToast(`👥 已同步提炼群聊「${grp.name}」记忆，群成员已共享认知！`, 'info', 2000);
        } catch (e) {
            console.warn('群聊记忆总结失败', e);
            showMemoryFailNoticeModal(`群聊「${grp.name}」记忆`, e.message);
        } finally {
            grp._summarizing = false;
        }
    }
}

async function triggerGroupAIReply(gid) {
    const grp = G.groups[gid];
    if (!grp) return;
    const history = G.groupChatHistory[gid] || [];
    if (!history.length) { showToast('请先在群里发一条消息'); return; }

    let activeList = (grp.activeMembers && grp.activeMembers.length) ? grp.activeMembers : (grp.members || []);
    activeList = activeList.filter(mid => G.npcs[mid]);
    if (!activeList.length) activeList = (grp.members || []).filter(mid => G.npcs[mid]);
    if (!activeList.length) activeList = Object.keys(G.npcs).slice(0, 2);
    if (!activeList.length) { showToast('群内暂无可接话的成员'); return; }

    const activeStreamers = [];
    const activeFans = [];
    activeList.forEach(mid => {
        const n = G.npcs[mid];
        if (n) {
            if (!n.isCustom) activeStreamers.push(n);
            else activeFans.push(n);
        }
    });

    const recent = history.slice(-10).map(m => {
        if (m._recalled) {
            return m._seenByNpc ? `[群提示: ${m.senderName}发了“${m._originalText}”，又撤回了，但被群友看到了]` : `[群提示: ${m.senderName}撤回了一条消息]`;
        }
        return `${m.senderName}: ${stripThought(m.text || '')}`;
    }).join('\n');

    try {
        G.isGenerating = true;
        if (typeof showLoading === 'function') showLoading();

        let generatedCount = 0;

        if (grp.streamerMode === 'separate' && activeStreamers.length) {
            const picked = activeStreamers.sort(() => 0.5 - Math.random()).slice(0, rand(1, 2));
            for (const st of picked) {
                try {
                    const sys = `你是主播「${st.name}」，人设：${st.persona}。你正在群聊「${grp.name}」中。请根据最近聊天内容，自然发一句群聊回复。只输出简明正文，禁止复读玩家的话，不要包含引号或角色名前缀。`;
                    const rep = await callAI([{ role: 'system', content: sys }, { role: 'user', content: `群内最近发言：\n${recent}` }], { maxTokens: 200, temperature: 0.9 });
                    const cleanRep = stripThought(rep.replace(/^[^\s:：]{1,12}[:：]\s*/, '').trim());
                    if (cleanRep) {
                        if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
                        G.groupChatHistory[gid].push({
                            _id: 'gmsg_' + Date.now() + '_' + rand(100, 999),
                            from: 'npc',
                            senderName: st.name,
                            senderAvatar: st.avatarEmoji || '👤',
                            senderAvatarUrl: st.avatarUrl || null,
                            text: cleanRep,
                            time: new Date().toLocaleTimeString().slice(0, 5)
                        });
                        generatedCount++;
                    }
                } catch(err) {
                    console.warn(`主播 ${st.name} 单独回复失败:`, err);
                }
            }
        }

        if (grp.streamerMode !== 'separate' || (activeFans.length && generatedCount === 0)) {
            const memberPoolDesc = activeList.map(mid => {
                const n = G.npcs[mid];
                return n ? `【${n.name}】(${n.persona || '群友'})` : null;
            }).filter(Boolean).join('、');

            const sys = `
你正在模拟 Minecraft 主播/粉丝群聊「${grp.name}」（群简介：${grp.desc || '自由讨论'}）。
群内可发言成员有：${memberPoolDesc}。
请结合上下文，挑选 1 到 3 位成员进行真实自然的接话或吐槽互动。
【格式规范】每行一条，必须且仅能使用以下格式：
[MSG name=成员名字]发言内容[/MSG]
严禁添加开场白、问候语或解释。
            `;

            const raw = await callAI([
                { role: 'system', content: sys },
                { role: 'user', content: `【群聊最近动态】：\n${recent}\n请成员开始接话：` }
            ], { maxTokens: 600, temperature: 0.95 });

            const re = /\[MSG(?:\s+name=|\s*:\s*)(["']?)([^\]"'\n]+)\1\]([\s\S]*?)(?:\[\/MSG\]|(?=\[MSG)|$)/gi;
            let m;
            while ((m = re.exec(raw)) !== null) {
                const sName = m[2].trim();
                const body = stripThought(m[3].replace(/\[\/?MSG[^\]]*\]/gi, '').trim());
                if (!body) continue;

                const matchedNpc = Object.values(G.npcs).find(n => n.name.trim() === sName || sName.includes(n.name));
                const finalName = matchedNpc ? matchedNpc.name : sName;

                if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
                G.groupChatHistory[gid].push({
                    _id: 'gmsg_' + Date.now() + '_' + rand(100, 999),
                    from: 'npc',
                    senderName: finalName,
                    senderAvatar: matchedNpc ? (matchedNpc.avatarEmoji || '👤') : '💬',
                    senderAvatarUrl: matchedNpc ? (matchedNpc.avatarUrl || null) : null,
                    text: body,
                    time: new Date().toLocaleTimeString().slice(0, 5)
                });
                generatedCount++;
            }

            if (generatedCount === 0 && raw.trim()) {
                const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 2);
                for (const line of lines) {
                    const lineMatch = line.match(/^([^:：]{1,12})[:：]\s*(.+)$/);
                    let speaker = null;
                    let text = line;
                    if (lineMatch) {
                        speaker = lineMatch[1].trim();
                        text = lineMatch[2].trim();
                    } else {
                        const randomNpcId = pick(activeList);
                        speaker = G.npcs[randomNpcId] ? G.npcs[randomNpcId].name : '群友';
                    }
                    const cleanBody = stripThought(text.replace(/\[\/?MSG[^\]]*\]/gi, '').trim());
                    if (cleanBody) {
                        const matchedNpc = Object.values(G.npcs).find(n => n.name === speaker);
                        if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
                        G.groupChatHistory[gid].push({
                            _id: 'gmsg_' + Date.now() + '_' + rand(100, 999),
                            from: 'npc',
                            senderName: matchedNpc ? matchedNpc.name : speaker,
                            senderAvatar: matchedNpc ? (matchedNpc.avatarEmoji || '👤') : '💬',
                            senderAvatarUrl: matchedNpc ? (matchedNpc.avatarUrl || null) : null,
                            text: cleanBody,
                            time: new Date().toLocaleTimeString().slice(0, 5)
                        });
                        generatedCount++;
                    }
                }
            }
        }

        if (typeof hideLoading === 'function') hideLoading();
        if (generatedCount > 0) {
            showToast(`⚡ 群内收到 ${generatedCount} 条新回复！`, 'success', 1500);
            await checkGroupMemorySummarize(gid);
            autoSaveGame();
        } else {
            showToast('⚠️ 本轮成员都在潜水，再试一次吧', 'info', 2000);
        }
    } catch (e) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('群聊生成失败', e);
        showToast('❌ 群聊生成失败，请检查网络设置', 'error');
    } finally {
        G.isGenerating = false;
    }
}

// ============================================================
// 好友申请入口（供 07-actions-social.js 的随机好友事件调用）
function receiveFriendRequest(req) {
    if (!req) return;
    if (!G.friendRequests) G.friendRequests = [];
    const item = Object.assign({
        _id: 'friend_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        fromReason: '好友申请',
        persona: '',
        avatarEmoji: '👤',
        day: G.day || 1
    }, req);
    G.friendRequests.push(item);
    showToast(`📬 收到新的好友申请：${item.name || '新好友'}`, 'success', 2200);
    if (document.querySelector('.tab-btn.active')?.dataset.tab === 'social') renderSocialPanel();
    autoSaveGame();
}

// ➕ 新建与好友/群邀请管理弹窗
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
        <h3>➕ 社交与好友中心</h3>
        <div style="margin:10px 0 12px;border:1px solid #eee;border-radius:10px;padding:10px;background:#fff;">
            <div style="font-size:13px;font-weight:700;margin-bottom:6px;color:var(--primary);display:flex;align-items:center;justify-content:space-between;">
                <span>📬 主播与好友申请列表</span>
                ${requests.length ? `<span style="background:#ff4757;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;">${requests.length}条新申请</span>` : ''}
            </div>
            ${requestsHtml}
            ${groupInvsHtml}
        </div>
        <div class="btn-row" style="flex-direction:column;gap:8px;">
            <button class="btn-primary" id="btnNewCustomNPC" style="width:100%;">👤 自建新联系人 / 粉丝</button>
            <button class="btn-primary" id="btnNewGroup" style="width:100%;background:#3866c4;">👥 自建新群聊</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">关闭</button>
        </div>
    `);

    document.getElementById('btnNewCustomNPC').onclick = () => { closeModal(); openEditNpcModal(null); };
    document.getElementById('btnNewGroup').onclick = () => { closeModal(); openEditGroupModal(null); };
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
            npcData.favor = 40;
            npcData.summaryThreshold = 10;
            npcData.keepRecent = 5;
        } else {
            npcData = {
                id,
                name: req.name,
                avatarEmoji: req.avatarEmoji || '👤',
                avatarUrl: req.avatarUrl || null,
                persona: req.persona || '一位热心好友',
                favor: 40,
                isCustom: true,
                summaryThreshold: 10,
                keepRecent: 5
            };
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
        G.groups[gid] = {
            id: gid,
            name: inv.name,
            avatarEmoji: inv.avatarEmoji || '👥',
            avatarUrl: '',
            desc: inv.desc || '粉丝后援群聊',
            members: Object.keys(G.npcs).slice(0, 4),
            activeMembers: Object.keys(G.npcs).slice(0, 4),
            streamerMode: 'unified',
            summaryThreshold: 10,
            keepRecent: 5
        };
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
        <div class="form-group">
            <label>角色姓名</label>
            <input type="text" id="npcNameInput" value="${escapeHtml(npc.name)}" placeholder="如：铁粉小明 / 主播Alex">
        </div>
        <div class="form-group">
            <label>头像设置（支持 Emoji / 图片 URL / 本地相册）</label>
            <div style="display:flex;gap:6px;margin-bottom:6px;">
                <input type="text" id="npcEmojiInput" value="${escapeHtml(npc.avatarEmoji || '👤')}" placeholder="Emoji" style="width:70px;text-align:center;">
                <input type="text" id="npcAvatarUrlInput" value="${escapeHtml(npc.avatarUrl || '')}" placeholder="图片外链 URL (可留空)" style="flex:1;">
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                <label class="upload-btn" style="padding:6px 12px;font-size:12px;cursor:pointer;">
                    📁 从相册选择本地图片
                    <input type="file" id="npcLocalAvatarInput" accept="image/*" style="display:none;">
                </label>
                <div id="npcAvatarPreviewBox" style="width:36px;height:36px;border-radius:50%;border:1px solid #ddd;overflow:hidden;">${renderAvatarBadge(npc, 36)}</div>
            </div>
        </div>
        <div class="form-group">
            <label>角色人设设定</label>
            <textarea id="npcPersonaInput" rows="3" placeholder="描述此人的性格、口头禅、与你的渊源...">${escapeHtml(npc.persona || '')}</textarea>
        </div>
        <div style="display:flex;gap:10px;">
            <div class="form-group" style="flex:1;">
                <label>🧠 触发总结轮数</label>
                <input type="number" id="npcThresholdInput" min="4" max="50" value="${npc.summaryThreshold || 10}">
            </div>
            <div class="form-group" style="flex:1;">
                <label>💬 总结后保留最近轮数</label>
                <input type="number" id="npcKeepRecentInput" min="2" max="20" value="${npc.keepRecent || 5}">
            </div>
        </div>
        <div class="btn-row" style="margin-top:12px;">
            ${!isNew && npc.isCustom ? `<button class="btn-secondary" id="delNpcBtn" style="color:#e53935;">🗑️ 删除角色</button>` : ''}
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="saveNpcBtn">💾 保存</button>
        </div>
    `);

    let currentAvatarDataUrl = npc.avatarUrl || '';

    document.getElementById('npcLocalAvatarInput').onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            currentAvatarDataUrl = evt.target.result;
            document.getElementById('npcAvatarPreviewBox').innerHTML = `<img src="${currentAvatarDataUrl}" style="width:100%;height:100%;object-fit:cover;">`;
            document.getElementById('npcAvatarUrlInput').value = '';
            showToast('✅ 本地头像已加载', 'success', 1200);
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('npcAvatarUrlInput').oninput = function() {
        if (this.value.trim()) {
            currentAvatarDataUrl = this.value.trim();
            document.getElementById('npcAvatarPreviewBox').innerHTML = `<img src="${currentAvatarDataUrl}" style="width:100%;height:100%;object-fit:cover;">`;
        }
    };

    document.getElementById('saveNpcBtn').onclick = () => {
        const name = document.getElementById('npcNameInput').value.trim();
        const emoji = document.getElementById('npcEmojiInput').value.trim() || '👤';
        const persona = document.getElementById('npcPersonaInput').value.trim() || '普通朋友';
        const threshold = parseInt(document.getElementById('npcThresholdInput').value) || 10;
        const keepRecent = parseInt(document.getElementById('npcKeepRecentInput').value) || 5;
        if (!name) { showToast('⚠️ 角色姓名不能为空', 'error'); return; }

        const id = isNew ? ('custom_npc_' + Date.now()) : npcId;
        G.npcs[id] = {
            ...npc,
            id,
            name,
            avatarEmoji: emoji,
            avatarUrl: currentAvatarDataUrl,
            persona,
            summaryThreshold: threshold,
            keepRecent,
            isCustom: true
        };
        showToast('✅ 角色信息已保存', 'success');
        closeModal();
        renderSocialPanel();
        autoSaveGame();
    };

    const delBtn = document.getElementById('delNpcBtn');
    if (delBtn) {
        delBtn.onclick = () => {
            delete G.npcs[npcId];
            showToast('🗑️ 已删除该角色', 'success');
            closeModal();
            renderSocialPanel();
            autoSaveGame();
        };
    }
}

function openEditGroupModal(gid) {
    const isNew = !gid;
    const grp = !isNew ? G.groups[gid] : { name: '', avatarEmoji: '👥', avatarUrl: '', desc: '', members: Object.keys(G.npcs).slice(0, 3) };
    openModal(`
        <h3>${isNew ? '👥 创建群聊' : '✏️ 编辑群资料'}</h3>
        <div class="form-group">
            <label>群聊名称</label>
            <input type="text" id="grpNameInput" value="${escapeHtml(grp.name)}" placeholder="如：主播日常开黑群 / 粉丝基地">
        </div>
        <div class="form-group">
            <label>群图标（Emoji 或 图片）</label>
            <div style="display:flex;gap:6px;margin-bottom:6px;">
                <input type="text" id="grpEmojiInput" value="${escapeHtml(grp.avatarEmoji || '👥')}" placeholder="Emoji" style="width:70px;text-align:center;">
                <input type="text" id="grpAvatarUrlInput" value="${escapeHtml(grp.avatarUrl || '')}" placeholder="图片 URL" style="flex:1;">
            </div>
            <label class="upload-btn" style="padding:6px 12px;font-size:12px;cursor:pointer;">
                📁 选择群本地图标
                <input type="file" id="grpLocalAvatarInput" accept="image/*" style="display:none;">
            </label>
        </div>
        <div class="form-group">
            <label>群聊简介 / 话题</label>
            <textarea id="grpDescInput" rows="2" placeholder="介绍群聊的日常基调或话题...">${escapeHtml(grp.desc || '')}</textarea>
        </div>
        <div class="btn-row" style="margin-top:12px;">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="saveGrpBtn">💾 保存群聊</button>
        </div>
    `);

    let currentGroupAvatar = grp.avatarUrl || '';
    document.getElementById('grpLocalAvatarInput').onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            currentGroupAvatar = evt.target.result;
            showToast('✅ 群图标已载入', 'success', 1200);
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('saveGrpBtn').onclick = () => {
        const name = document.getElementById('grpNameInput').value.trim();
        const emoji = document.getElementById('grpEmojiInput').value.trim() || '👥';
        const url = document.getElementById('grpAvatarUrlInput').value.trim();
        const desc = document.getElementById('grpDescInput').value.trim();
        if (!name) { showToast('⚠️ 群名称不能为空', 'error'); return; }

        const id = isNew ? ('grp_' + Date.now()) : gid;
        G.groups[id] = {
            ...grp,
            id,
            name,
            avatarEmoji: emoji,
            avatarUrl: url || currentGroupAvatar,
            desc,
            members: grp.members || Object.keys(G.npcs).slice(0, 4),
            activeMembers: grp.activeMembers || grp.members,
            streamerMode: grp.streamerMode || 'unified',
            summaryThreshold: grp.summaryThreshold || 10,
            keepRecent: grp.keepRecent || 5
        };
        showToast('✅ 群聊已保存', 'success');
        closeModal();
        renderSocialPanel();
        autoSaveGame();
    };
}

function openGroupSettingsModal(gid) {
    const grp = G.groups[gid];
    if (!grp) return;

    let memberCheckboxes = '';
    const allNpcIds = Object.keys(G.npcs || {});

    allNpcIds.forEach(nid => {
        const n = G.npcs[nid];
        const isMember = (grp.members || []).includes(nid);
        const isActive = (grp.activeMembers || grp.members || []).includes(nid);
        memberCheckboxes += `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;">
            <label style="font-size:13px;display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" class="grp-mem-check" data-id="${nid}" ${isMember ? 'checked' : ''} style="width:16px;height:16px;">
                <span>${n.avatarUrl ? `<img src="${n.avatarUrl}" style="width:18px;height:18px;border-radius:50%;vertical-align:middle;">` : (n.avatarEmoji || '👤')} ${escapeHtml(n.name)}</span>
            </label>
            <label style="font-size:11px;color:#666;display:flex;align-items:center;gap:4px;cursor:pointer;">
                <input type="checkbox" class="grp-active-check" data-id="${nid}" ${isActive && isMember ? 'checked' : ''} ${!isMember ? 'disabled' : ''} style="width:14px;height:14px;">
                本次接话
            </label>
        </div>`;
    });

    openModal(`
        <h3>⚙️ 群管理：${escapeHtml(grp.name)}</h3>
        <div style="font-size:13px;font-weight:700;margin-top:10px;margin-bottom:6px;">🤖 回复模式</div>
        <div style="background:#f9fbf9;padding:8px 12px;border-radius:8px;font-size:12px;line-height:1.6;margin-bottom:12px;">
            <label style="display:block;cursor:pointer;margin-bottom:6px;">
                <input type="radio" name="streamerMode" value="unified" ${grp.streamerMode !== 'separate' ? 'checked' : ''}>
                <b>模式 A（统一合成回复）</b>：只调 1 次 API，由 AI 统筹挑选 1~3 位活跃成员发言（极省 Token）
            </label>
            <label style="display:block;cursor:pointer;">
                <input type="radio" name="streamerMode" value="separate" ${grp.streamerMode === 'separate' ? 'checked' : ''}>
                <b>模式 B（主播独立调用）</b>：每位被勾选的主播角色单独调 1 次 API，其余成员统一回复
            </label>
        </div>

        <div style="display:flex;gap:10px;margin-bottom:12px;">
            <div class="form-group" style="flex:1;">
                <label style="font-size:12px;">🧠 群记忆总结轮数</label>
                <input type="number" id="grpSummaryThresholdInput" min="4" max="50" value="${grp.summaryThreshold || 10}">
            </div>
            <div class="form-group" style="flex:1;">
                <label style="font-size:12px;">💬 保留最近轮数</label>
                <input type="number" id="grpKeepRecentInput" min="2" max="20" value="${grp.keepRecent || 5}">
            </div>
        </div>

        <div style="font-size:13px;font-weight:700;margin-bottom:6px;">👥 成员勾选与接话配置</div>
        <div style="max-height:180px;overflow-y:auto;border:1px solid #eee;border-radius:8px;padding:4px 10px;">
            ${memberCheckboxes}
        </div>

        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" id="delGroupBtn" style="color:#e53935;">🗑️ 解散群聊</button>
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="saveGroupSettingsBtn">💾 保存设置</button>
        </div>
    `);

    document.querySelectorAll('.grp-mem-check').forEach(chk => {
        chk.onchange = () => {
            const nid = chk.dataset.id;
            const actChk = document.querySelector(`.grp-active-check[data-id="${nid}"]`);
            if (actChk) {
                actChk.disabled = !chk.checked;
                if (!chk.checked) actChk.checked = false;
            }
        };
    });

    document.getElementById('saveGroupSettingsBtn').onclick = () => {
        const mems = [];
        const actives = [];
        document.querySelectorAll('.grp-mem-check:checked').forEach(c => mems.push(c.dataset.id));
        document.querySelectorAll('.grp-active-check:checked').forEach(c => actives.push(c.dataset.id));
        const mode = document.querySelector('input[name="streamerMode"]:checked').value;
        const threshold = parseInt(document.getElementById('grpSummaryThresholdInput').value) || 10;
        const keepRecent = parseInt(document.getElementById('grpKeepRecentInput').value) || 5;

        grp.members = mems.length ? mems : Object.keys(G.npcs).slice(0, 3);
        grp.activeMembers = actives.length ? actives : grp.members;
        grp.streamerMode = mode;
        grp.summaryThreshold = threshold;
        grp.keepRecent = keepRecent;

        showToast('✅ 群设置已保存', 'success');
        closeModal();
        renderSocialPanel();
        autoSaveGame();
    };

    document.getElementById('delGroupBtn').onclick = () => {
        delete G.groups[gid];
        delete G.groupChatHistory[gid];
        delete G.groupMemories[gid];
        showToast('🗑️ 已解散该群聊', 'success');
        closeModal();
        closeGroupChat();
        autoSaveGame();
    };
}

function openChat(npcId) {
    // 从通讯录/其他页面进入聊天时，必须同时切到手机社交页。
    // 旧版合并时漏掉了这一层，所以点击联系人虽然修改了状态，
    // 但画面仍停留在原来的 dataTab，看起来就像“点了没反应”。
    if (!G.npcs || !G.npcs[npcId]) return;
    G.currentChatGroup = null;
    G.currentChatNpc = npcId;
    G.chatActiveTab = 'direct';
    G.phoneNav = 'chats';
    if (typeof switchTab === 'function') {
        switchTab('social');
    } else {
        renderSocialPanel();
    }
}
function closeChat() {
    G.currentChatNpc = null;
    renderSocialPanel();
}


// ============================================================
// 🧠 记忆总结模态框
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
        unarchivedCount = getAccountChatHistory(npcId).length;
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
        const list = getAccountChatHistory(selectedScopeTargetId);
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
// ============================================================
// ============================================================
// 🎨 新版聊天扩展：表情包 +「屏幕那边的TA」
// 这些状态从原 12 号文件迁回 04，避免 04/12 双核心互相抢状态。
// ============================================================
if (!window.G.stickerCategories) window.G.stickerCategories = ['猪猪', '默认'];
if (!window.G.activeStickerCategory) window.G.activeStickerCategory = '猪猪';
if (!window.G.stickerLibrary || !window.G.stickerLibrary.length) window.G.stickerLibrary = [
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
if (!window.G._behindScreenActive) window.G._behindScreenActive = {};

function findStickerByKeyword(kw) {
    if (!kw || !window.G.stickerLibrary) return null;
    const cleanKw = kw.trim().toLowerCase();
    return window.G.stickerLibrary.find(s => s.desc.toLowerCase() === cleanKw || s.desc.toLowerCase().includes(cleanKw) || cleanKw.includes(s.desc.toLowerCase()));
}

function buildStickerDrawerHTML() {
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
    <div id="stickerDrawerContainer" style="background:#f4f6f4;border-top:1px solid #ddd;padding:6px 8px;height:165px;display:flex;flex-direction:column;box-sizing:border-box;">
        <div style="display:flex;align-items:center;gap:5px;overflow-x:auto;padding-bottom:5px;border-bottom:1px solid #e2e8e2;">
            ${tabsHtml}
            <button id="btnNewStickerCategory" title="新建分组" style="border:1px solid #bbb;background:#fff;padding:3px 7px;border-radius:6px;font-size:10.5px;cursor:pointer;white-space:nowrap;">✏️ 新分类</button>
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

    document.getElementById('btnNewStickerCategory')?.addEventListener('click', () => {
        openCreateStickerCategoryModal(targetType, targetId);
    });

    document.getElementById('btnAddStickerTrigger')?.addEventListener('click', () => {
        openImportStickersModal(targetType, targetId);
    });

    drawer.querySelectorAll('.stk-send-btn').forEach(btn => {
        btn.onclick = () => {
            const url = btn.dataset.url;
            const desc = btn.dataset.desc;
            sendStickerMessage(targetType, targetId, { desc, url });
        };
    });
}

function openCreateStickerCategoryModal(targetType, targetId) {
    openModal(`
        <div style="text-align:center;padding:10px 0;">
            <h3 style="margin-bottom:12px;">新建表情分类</h3>
            <div class="form-group">
                <input type="text" id="newStickerCatName" placeholder="输入分类名称..." style="width:100%;padding:10px;border-radius:10px;border:1px solid #ccc;font-size:14px;box-sizing:border-box;">
            </div>
            <div class="btn-row" style="margin-top:14px;">
                <button class="btn-secondary" onclick="closeModal()">取消</button>
                <button class="btn-primary" id="btnConfirmCreateStkCat" style="background:#b39ddb;">创建</button>
            </div>
        </div>
    `);

    document.getElementById('btnConfirmCreateStkCat').onclick = () => {
        const val = document.getElementById('newStickerCatName').value.trim();
        if (!val) { showToast('⚠️ 请输入分类名称', 'error'); return; }
        if (!window.G.stickerCategories.includes(val)) window.G.stickerCategories.push(val);
        window.G.activeStickerCategory = val;
        closeModal();
        if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
        else renderGroupChatWindow(document.getElementById('socialTab'));
        autoSaveGame();
    };
}

function openImportStickersModal(targetType, targetId) {
    const curCat = window.G.activeStickerCategory || '猪猪';
    openModal(`
        <h3>🖼️ 导入表情包到「${escapeHtml(curCat)}」</h3>
        <p style="font-size:12px;color:#666;line-height:1.5;">
            支持批量粘贴导入。格式规范为：<br>
            <b style="color:#2e7d32;">表情描述——图床链接</b>（每行一个）<br>
            <i>例如：微笑——https://imgbed.xxx/a.jpg</i>
        </p>
        <div class="form-group">
            <textarea id="importStickerBatchInput" rows="6" placeholder="这只可爱的小猪就是我呀——https://imgbed.heliar.top/i/QZNPVIKLzB8DiDL-.jpg&#10;你给我老实点——https://imgbed.heliar.top/i/KpiF2iLAUzHVDvjD.jpg" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;font-size:12px;font-family:monospace;box-sizing:border-box;"></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnConfirmBatchImport">批量导入</button>
        </div>
    `);

    document.getElementById('btnConfirmBatchImport').onclick = () => {
        const raw = document.getElementById('importStickerBatchInput').value.trim();
        if (!raw) { showToast('⚠️ 请输入表情内容与图床链接', 'error'); return; }

        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
        let count = 0;

        if (!window.G.stickerLibrary) window.G.stickerLibrary = [];

        for (const line of lines) {
            let desc = '';
            let url = '';
            if (line.includes('——')) {
                const parts = line.split('——');
                desc = parts[0].trim();
                url = parts.slice(1).join('——').trim();
            } else if (line.includes(':http')) {
                const idx = line.indexOf(':http');
                desc = line.slice(0, idx).trim();
                url = line.slice(idx + 1).trim();
            } else if (line.includes('http')) {
                const idx = line.indexOf('http');
                desc = line.slice(0, idx).replace(/[-—:：\s]+$/, '').trim() || '表情';
                url = line.slice(idx).trim();
            }

            if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/'))) {
                window.G.stickerLibrary.push({
                    category: curCat,
                    desc: desc || '萌系表情',
                    url: url
                });
                count++;
            }
        }

        if (count > 0) {
            showToast(`🎉 成功为「${curCat}」导入 ${count} 个表情包！`, 'success', 2500);
            closeModal();
            if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
            else renderGroupChatWindow(document.getElementById('socialTab'));
            autoSaveGame();
        } else {
            showToast('⚠️ 未识别到有效链接', 'error', 2500);
        }
    };
}

function sendStickerMessage(targetType, targetId, stickerObj) {
    const curAcc = getActiveAccountInfo();
    const isSingle = targetType === 'single';

    const msg = {
        _id: 'cstk_' + Date.now() + '_' + rand(100, 999),
        from: 'player',
        senderAccount: curAcc.name,
        sticker: stickerObj,
        text: `[表情: ${stickerObj.desc}]`,
        time: new Date().toLocaleTimeString().slice(0, 5)
    };

    if (isSingle) {
        pushChatMessageSafe(targetId, msg);
        renderSingleChatWindow(document.getElementById('socialTab'));
    } else {
        if (!window.G.groupChatHistory[targetId]) window.G.groupChatHistory[targetId] = [];
        window.G.groupChatHistory[targetId].push(msg);
        renderGroupChatWindow(document.getElementById('socialTab'));
    }
    autoSaveGame();
}

function jumpToMomentCard(momentId) {
    window.G.currentChatNpc = null;
    window.G.phoneNav = 'moments';
    window.G.momentsFilterNpcId = null;
    renderSocialPanel();

    setTimeout(() => {
        const card = document.getElementById(`moment_entry_${momentId}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.transition = 'box-shadow 0.3s ease';
            card.style.boxShadow = '0 0 0 3px var(--primary)';
            setTimeout(() => { card.style.boxShadow = 'none'; }, 2000);
        }
    }, 150);
}

function openClockSettingsModal() {
    const G = window.G;
    const cfg = G.clockConfig || { mode: 'game', customCountry: '中国 (东八区)', customTimeStr: '' };
    const curTz = detectPlayerTimezoneInfo();

    openModal(`
        <h3>🕒 游戏时钟与时区管理</h3>
        <p style="font-size:12px;color:#666;line-height:1.6;">
            当前推导时区：<b>${curTz.country}</b> · <b>${curTz.slotName}</b><br>
            AI 会以此时间与海外主播换算真实时差，你可以在下方自定义。
        </p>

        <div class="form-group" style="margin-top:10px;">
            <label style="font-size:13px;font-weight:700;">选择时间同步模式：</label>
            <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px;">
                <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                    <input type="radio" name="clockModeRadio" value="game" ${cfg.mode === 'game' ? 'checked' : ''}>
                    <span>🎮 跟随游戏内天数推进 (早/中/晚)</span>
                </label>
                <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                    <input type="radio" name="clockModeRadio" value="device" ${cfg.mode === 'device' ? 'checked' : ''}>
                    <span>📱 实时跟随真实手机设备时钟 (高沉浸)</span>
                </label>
                <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                    <input type="radio" name="clockModeRadio" value="custom" ${cfg.mode === 'custom' ? 'checked' : ''}>
                    <span>✍️ 手动固定国家与时间</span>
                </label>
            </div>
        </div>

        <div id="customClockInputsArea" style="${cfg.mode === 'custom' ? 'display:block;' : 'display:none;'}background:#f8faf8;padding:10px;border-radius:8px;border:1px solid #ddd;margin-top:8px;">
            <div class="form-group" style="margin-bottom:6px;">
                <label style="font-size:12px;">设定自己身处的国家 / 地区：</label>
                <input type="text" id="customCountryInput" value="${escapeHtml(cfg.customCountry || '中国 (东八区)')}" placeholder="如：美国洛杉矶 / 英国伦敦 / 中国北京">
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <label style="font-size:12px;">设定固定时刻描述 (选填)：</label>
                <input type="text" id="customTimeStrInput" value="${escapeHtml(cfg.customTimeStr || '')}" placeholder="如：早晨 08:30 / 凌晨 02:00">
            </div>
        </div>

        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnSaveClockSettings">💾 保存时区设置</button>
        </div>
    `);

    document.querySelectorAll('input[name="clockModeRadio"]').forEach(r => {
        r.onchange = () => {
            document.getElementById('customClockInputsArea').style.display = (r.value === 'custom') ? 'block' : 'none';
        };
    });

    document.getElementById('btnSaveClockSettings').onclick = () => {
        const mode = document.querySelector('input[name="clockModeRadio"]:checked').value;
        const country = document.getElementById('customCountryInput').value.trim() || '中国 (东八区)';
        const timeStr = document.getElementById('customTimeStrInput').value.trim();

        window.G.clockConfig = {
            mode,
            customCountry: country,
            customTimeStr: timeStr
        };

        showToast('✅ 时钟时区设置已更新！', 'success', 1500);
        closeModal();
        autoSaveGame();
    };
}

function openCreateCustomNpcModal() {
    openModal(`
        <h3>➕ 自定义添加新角色好友</h3>
        <p style="font-size:12px;color:#666;">创造一位全新的 MC 主播或搭档，即刻开始互动！</p>
        <div class="form-group">
            <label>角色姓名 <span class="required">*</span></label>
            <input type="text" id="newNpcNameInput" placeholder="例如：Skeppy / 某位主播好友...">
        </div>
        <div class="form-group">
            <label>性格人设特征 (Prompt) <span class="required">*</span></label>
            <textarea id="newNpcPersonaInput" rows="3" placeholder="例如：脾气火爆但非常重义气，热爱恶作剧整蛊，说话语速极快..."></textarea>
        </div>
        <div class="form-group">
            <label>外貌/皮肤外观 (Skin)</label>
            <input type="text" id="newNpcSkinInput" placeholder="例如：红色鸭舌帽与黑色连帽卫衣...">
        </div>
        <div class="form-group">
            <label>赛道与口头禅</label>
            <div style="display:flex;gap:6px;">
                <input type="text" id="newNpcCategoryInput" placeholder="如：整蛊/PvP" style="flex:1;">
                <input type="text" id="newNpcCatchphraseInput" placeholder="口头禅" style="flex:1;">
            </div>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="openAddChatTargetModal()">返回</button>
            <button class="btn-primary" id="btnConfirmCreateNpc">完成添加</button>
        </div>
    `);

    document.getElementById('btnConfirmCreateNpc').onclick = () => {
        const name = document.getElementById('newNpcNameInput').value.trim();
        const persona = document.getElementById('newNpcPersonaInput').value.trim();
        const skin = document.getElementById('newNpcSkinInput').value.trim();
        const category = document.getElementById('newNpcCategoryInput').value.trim();
        const catchphrase = document.getElementById('newNpcCatchphraseInput').value.trim();

        if (!name) { showToast('⚠️ 请填写角色姓名', 'error'); return; }
        if (!persona) { showToast('⚠️ 请填写角色性格人设', 'error'); return; }

        const npcId = 'custom_' + Date.now();
        if (!window.G.npcs) window.G.npcs = {};
        window.G.npcs[npcId] = {
            id: npcId,
            name,
            gender: '男',
            persona,
            skin: skin || '经典主播装扮',
            appearance: skin || '经典主播装扮',
            category: category || 'MC实况',
            catchphrase,
            favor: 20,
            avatarEmoji: '👤',
            avatarUrl: null,
            works: [],
            isCustom: true
        };

        closeModal();
        showToast(`🎉 好友「${name}」已添加进通讯录！`, 'success', 2500);
        renderSocialPanel();
        autoSaveGame();
    };
}

function openCreateGroupModal() {
    const npcs = Object.values(window.G.npcs || {});
    if (!npcs.length) {
        showToast('请先结识好友后再创建群聊', 'error');
        return;
    }

    const memberBoxes = npcs.map(n => `
        <label style="display:inline-flex;align-items:center;gap:4px;font-size:12.5px;background:#f8faf8;padding:4px 8px;border-radius:12px;margin:3px;border:1px solid #e0ebe0;cursor:pointer;">
            <input type="checkbox" class="create-group-member-check" value="${n.id}">
            <span>${n.avatarEmoji || '👤'} ${escapeHtml(n.name)}</span>
        </label>
    `).join('');

    openModal(`
        <h3>👥 建立新的群聊</h3>
        <div class="form-group">
            <label>群聊名称 <span class="required">*</span></label>
            <input type="text" id="newGroupNameInput" placeholder="例如：周末联机整蛊小分队...">
        </div>
        <div class="form-group">
            <label>群简介 (选填)</label>
            <input type="text" id="newGroupDescInput" placeholder="描述这个群的日常氛围与话题...">
        </div>
        <div class="form-group">
            <label>勾选拉入群聊的好友：</label>
            <div style="max-height:160px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:2px;padding:6px;border:1px solid #eee;border-radius:8px;">
                ${memberBoxes}
            </div>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="openAddChatTargetModal()">返回</button>
            <button class="btn-primary" id="btnConfirmCreateGroup">创建群聊</button>
        </div>
    `);

    document.getElementById('btnConfirmCreateGroup').onclick = () => {
        const name = document.getElementById('newGroupNameInput').value.trim();
        const desc = document.getElementById('newGroupDescInput').value.trim();
        const checked = document.querySelectorAll('.create-group-member-check:checked');
        const memberIds = Array.from(checked).map(c => c.value);

        if (!name) { showToast('⚠️ 请填写群聊名称', 'error'); return; }
        if (!memberIds.length) { showToast('⚠️ 至少需要拉入一位好友', 'error'); return; }

        const gid = 'grp_' + Date.now();
        if (!window.G.groups) window.G.groups = {};
        window.G.groups[gid] = {
            id: gid,
            name,
            desc: desc || '日常探讨与开播分享',
            avatarEmoji: '👥',
            members: memberIds
        };

        if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
        window.G.groupChatHistory[gid] = [{
            _id: 'ginit_' + Date.now(),
            from: 'action',
            text: `群聊「${name}」已创建，你邀请了 ${memberIds.map(id => window.G.npcs[id]?.name).join('、')} 加入群聊。`,
            time: new Date().toLocaleTimeString().slice(0, 5)
        }];

        closeModal();
        showToast(`🎉 群聊「${name}」创建成功！`, 'success', 2500);
        window.G.chatActiveTab = 'group';
        renderSocialPanel();
        autoSaveGame();
    };
}

function openShareMomentTargetModal(momentId) {
    const item = (window.G.feed || []).find(f => f.id === momentId);
    if (!item) return;

    const npcs = Object.values(window.G.npcs || {});
    if (!npcs.length) {
        showToast('暂无好友可以转发', 'error');
        return;
    }

    let npcItems = npcs.map(n => `
        <div class="share-target-item" data-id="${n.id}" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:8px;background:#f9faf9;border:1px solid #eef2ee;margin-bottom:6px;cursor:pointer;">
            <div style="display:flex;align-items:center;gap:8px;">
                ${renderAvatarBadge(n, 32)}
                <span style="font-weight:700;font-size:13px;">${escapeHtml(n.name)}</span>
            </div>
            <button class="upload-btn" style="padding:3px 10px;font-size:11px;pointer-events:none;">发送</button>
        </div>
    `).join('');

    openModal(`
        <h3>↗️ 转发动态给好友</h3>
        <div style="font-size:12px;color:#666;background:#f0f4f0;padding:6px 10px;border-radius:6px;margin:8px 0;">
            <b>动态内容：</b>${escapeHtml(item.body.slice(0, 36))}...
        </div>
        <div style="max-height:220px;overflow-y:auto;margin:10px 0;">
            ${npcItems}
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">取消</button>
        </div>
    `);

    document.querySelectorAll('.share-target-item').forEach(el => {
        el.onclick = () => {
            const targetNpcId = el.dataset.id;
            const curAcc = getActiveAccountInfo();
            const targetNpc = window.G.npcs[targetNpcId];

            pushChatMessageSafe(targetNpcId, {
                from: 'player',
                senderAccount: curAcc.name,
                sharedMoment: {
                    id: item.id,
                    author: item.author,
                    body: item.body,
                    image: item.image || null,
                    imageDesc: item.imageDesc || null,
                    imageMode: item.imageMode || (item.image && item.imageDesc ? 'hybrid' : (item.image ? 'real' : 'desc'))
                },
                text: `[转发动态]: ${item.body.slice(0, 40)}`,
                time: new Date().toLocaleTimeString().slice(0, 5)
            });

            if (targetNpc) {
                targetNpc.memorySummary = (targetNpc.memorySummary || '') + `\n【好友私信互动】：主角转发了朋友圈动态“${item.body.slice(0, 20)}”给你，你可以此话题展开互动。`;
            }

            closeModal();
            showToast(`✅ 已将动态转发给 ${targetNpc ? targetNpc.name : '好友'}！`, 'success', 2000);
            openChat(targetNpcId);
            autoSaveGame();
        };
    });
}
