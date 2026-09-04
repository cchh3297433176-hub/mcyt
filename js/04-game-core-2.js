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
    toast.innerHTML = `<span class="ach-icon">${ach.icon}</span> 解锁成就：${ach.name}！获得 ${ach.reward} 金币！`;
    toast.className = 'achievement-unlock-toast show';
    clearTimeout(toast._hide);
    toast._hide = setTimeout(() => { toast.className = 'achievement-unlock-toast'; }, 5000);
    appendStory(`🏆 解锁成就「${ach.name}」！获得 ${ach.reward} 金币奖励。`, '🏆 成就');
    addMemoir('成就解锁', `${ach.name} (${ach.desc})`);
    showToast(`🏆 解锁成就：${ach.name}！`, 'success', 4000);
    updateUI();
    if (document.querySelector('.tab-btn.active')?.dataset.tab === 'achievements') renderAchievements();
}

function renderAchievements() {
    const container = dom.achievementsTab;
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
    } else {
        const gain = rand(20, 100);
        G.player.followers += gain;
        appendStory(`✅ 你接受了 ${offer.name} 的赞助，获得 ${reward} 金币，粉丝增长了 ${gain} 人！`, '📢 赞助成功');
        showToast(`✅ 赞助合作成功！获得 ${reward} 金币`, 'success', 3000);
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
    const container = dom.shopTab;
    const p = G.player;
    const equipLevel = p.equipmentLevel || 1;
    const equipMax = 5;
    const equipCosts = [0, 500, 1500, 4000, 8000, 15000];
    const equipMultipliers = [1.0, 1.2, 1.5, 2.0, 2.8, 4.0];
    const items = [
        { id: 'hot1', label: '🔥 热度小包', desc: '一次性增加 5,000 粉丝', cost: 1000, effect: () => { G.player
                .followers += 5000; } },
        { id: 'hot2', label: '🔥 热度中包', desc: '一次性增加 20,000 粉丝', cost: 3500, effect: () => { G.player
                .followers += 20000; } },
        { id: 'hot3', label: '🔥 热度大包', desc: '一次性增加 50,000 粉丝', cost: 8000, effect: () => { G.player
                .followers += 50000; } },
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
    html += `
    <div style="font-weight:600;font-size:15px;margin:14px 0 6px;">📢 合作邀约</div>
    `;
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
    const container = dom.dashboardTab;
    const p = G.player;
    const totalViews = p.videos.reduce((sum, v) => sum + (v.views || 0), 0);
    let html = `
    <div class="stats-grid">
        <div class="stat-card"><div class="num">${p.followers}</div><div class="label">❤️ 粉丝</div></div>
        <div class="stat-card"><div class="num">${p.videos.length}</div><div class="label">📹 视频</div></div>
        <div class="stat-card"><div class="num">${totalViews}</div><div class="label">👀 总观看</div></div>
    </div>
    `;
    const collectionNames = Object.keys(G.collections);
    if (collectionNames.length > 0) {
        html += `<div style="margin-bottom:10px;font-weight:700;font-size:15px;">📚 合集</div>`;
        for (const name of collectionNames) {
            const col = G.collections[name];
            const colVideos = col.videos.map(idx => G.player.videos[idx]).filter(v => v);
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
    const singleVideos = p.videos.filter(v => !v.collection);
    html += `<div style="margin-top:12px;font-weight:700;font-size:15px;">🎬 单视频</div>`;
    if (singleVideos.length === 0) {
        html += `<div class="no-videos-msg">暂无单视频</div>`;
    } else {
        html += `<div class="video-list">`;
        const sorted = [...singleVideos].reverse();
        sorted.forEach((video, index) => {
            const realIndex = p.videos.indexOf(video);
            html += `
            <div class="video-card" data-video-index="${realIndex}">
                <div class="video-title">${video.title}</div>
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
    if (comments.length === 0) html = `<div class="no-comments">还没有评论，快来抢沙发！</div>`;
    else {
        comments.forEach((comment, idx) => {
            html += `
            <div class="comment-item" data-comment-idx="${idx}">
                <div class="comment-user">${comment.user}</div>
                <div class="comment-content">${comment.content}</div>
                <div class="reply-box">
                    <input type="text" placeholder="回复 @${comment.user}..." class="reply-input" data-video-idx="${videoIndex}" data-comment-idx="${idx}">
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
    const newComment = { user: G.player.ytName, content: `回复 @${targetComment.user}: ${replyText}` };
    video.comments.unshift(newComment);
    const gain = rand(1, 5);
    G.player.followers += gain;
    G.player.likes += rand(1, 3);
    updateUI();
    appendStory(`💬 你在视频「${video.title}」中回复了 @${targetComment.user}: ${replyText}`, '📨 回复');
    const container = document.getElementById(`colcom-${video.collection}-${videoIndex}`) || document.getElementById(
        `comments-${videoIndex}`);
    if (container && container.style.display !== 'none') renderComments(videoIndex, container);
    showToast(`✅ 回复成功！粉丝 +${gain}`, 'success', 2000);
    if (document.querySelector('.tab-btn.active')?.dataset.tab === 'data') renderDataPanel();
    advanceTimeSlot();
    autoSaveGame();
}
// ============================================================
// 数据面板
// ============================================================
function renderDataPanel() {
    const container = dom.dataTab;
    const p = G.player;
    const s = p.skills;
    const totalViews = p.videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const skillNames = { building: '🏗️ 建筑', redstone: '🔧 红石', pvp: '⚔️ PvP', survival: '🌲 生存', hunting: '🏹 追杀' };
    let html = `
    <div class="data-grid">
        <div class="ditem"><div class="val">${p.followers}</div><div class="lbl">❤️ 粉丝</div></div>
        <div class="ditem"><div class="val">${p.likes}</div><div class="lbl">👍 累计点赞</div></div>
        <div class="ditem"><div class="val">💰 ${p.money}</div><div class="lbl">游戏货币</div></div>
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
    html += `<div style="font-size:15px;font-weight:700;color:var(--text);margin:14px 0 10px;">🤖 NPC 技术属性</div>`;
    for (const [id, npc] of Object.entries(G.npcs)) {
        const ns = npc.skills || { building: 0, redstone: 0, pvp: 0, survival: 0, hunting: 0 };
        const avg = Math.round((ns.building + ns.redstone + ns.pvp + ns.survival + ns.hunting) / 5);
        const isLover = G.player.lovers.includes(npc.name);
        html += `
        <div class="npc-card" onclick="openChat('${id}')">
            <div class="npc-info">
                <div class="npc-name">${npc.avatarEmoji || '👤'} ${npc.name} ${isLover ? '💕' : ''}</div>
                <div class="npc-desc">平均技术 ${avg} · 好感 ${npc.favor}</div>
            </div>
            <div style="font-size:11px;color:var(--text2);display:flex;gap:4px;flex-wrap:wrap;">
                <span>🏗️${ns.building}</span> <span>🔧${ns.redstone}</span> <span>⚔️${ns.pvp}</span> <span>🌲${ns.survival}</span> <span>🏹${ns.hunting}</span>
            </div>
        </div>
        `;
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
// 社交面板
// ============================================================
function renderSocialPanel() {
    const container = dom.socialTab;
    if (G.currentChatNpc) {
        renderChatWindow(container);
        return;
    }
    renderChatList(container);
}

function renderChatList(container) {
    const p = G.player;
    let avatarHtml = '';
    if (p.avatar) avatarHtml = `<img src="${p.avatar}" alt="avatar">`;
    else avatarHtml = '👤';
    let html = `
    <div class="chat-app">
        <div class="chat-header">
            <span style="font-size:16px;font-weight:700;">📱 消息</span>
            <div style="flex:1;"></div>
            <div class="chat-avatar">${avatarHtml}</div>
        </div>
        <div class="chat-list">
    `;
    for (const [id, npc] of Object.entries(G.npcs)) {
        const chatHist = G.chatHistory[id] || [];
        const lastMsg = chatHist.length > 0 ? chatHist[chatHist.length - 1] : null;
        const preview = lastMsg ? stripThought(lastMsg.text) : '开始对话吧';
        const time = lastMsg ? (lastMsg.time ? lastMsg.time.slice(0, 16) : '') : '';
        const fav = npc.favor || 0;
        const stage = getFavorStage(fav);
        const hasUnread = lastMsg && lastMsg.from === 'npc' && G.currentChatNpc !== id;
        const isLover = G.player.lovers.includes(npc.name);
        let waitingHint = '';
        if (G.confessionState && G.confessionState.npcId === id && G.confessionState.step === 'waiting')
            waitingHint = ' 💬 等待回复表白';
        html += `
        <div class="chat-item" onclick="openChat('${id}')">
            <div class="avatar">${npc.avatarEmoji || npc.name.charAt(0).toUpperCase()}</div>
            <div class="info">
                <div class="name">${npc.name} ${isLover ? '💕' : ''}${waitingHint} <span style="font-size:11px;color:var(--text2);">${stage}</span></div>
                <div class="preview">${escapeHtml(preview.slice(0, 25))}${preview.length > 25 ? '...' : ''}</div>
            </div>
            <div class="meta">
                <div>${time}</div>
                ${hasUnread ? '<div class="badge-unread">●</div>' : ''}
            </div>
        </div>
        `;
    }
    html += `</div></div>`;
    container.innerHTML = html;
}

function renderChatWindow(container) {
    const npcId = G.currentChatNpc;
    const npc = G.npcs[npcId];
    if (!npc) { G.currentChatNpc = null;
        renderChatList(container); return; }
    const chatHist = G.chatHistory[npcId] || [];
    let messagesHtml = '';
    for (const msg of chatHist) {
        const cls = msg.from === 'player' ? 'self' : 'other';
        const timeStr = msg.time || '';
        // 渲染私信消息气泡时，支持自动折叠思维链
        messagesHtml += `
        <div class="chat-message ${cls}">
            <div>${renderContentWithThoughts(msg.text)}</div>
            <div class="time">${timeStr}</div>
        </div>
        `;
    }
    const isLover = G.player.lovers.includes(npc.name);
    const canConfess = npc.favor >= 60 && !isLover;
    const confessBtn = canConfess ?
        `<button class="confess-btn" onclick="playerConfess('${npcId}')">💕 表白</button>` :
        '';
    let waitingBanner = '';
    if (G.confessionState && G.confessionState.npcId === npcId && G.confessionState.step === 'waiting') {
        waitingBanner =
            `<div style="background:rgba(46, 125, 50, 0.1);padding:6px;text-align:center;font-weight:600;color:var(--primary);border-bottom:1px solid rgba(30, 60, 30, 0.1);">💕 ${npc.name} 正在等待你的回应...</div>`;
    }
    let html = `
    <div class="chat-window open">
        <div class="chat-header">
            <button class="back-btn" onclick="closeChat()">←</button>
            <div class="chat-title">${npc.name} ${isLover ? '💕' : ''}</div>
            ${confessBtn}
            <div class="chat-avatar" style="background:#dce8dc;display:flex;align-items:center;justify-content:center;font-size:16px;">${npc.avatarEmoji || npc.name.charAt(0).toUpperCase()}</div>
        </div>
        ${waitingBanner}
        <div class="chat-messages" id="chatMessages">
            ${messagesHtml}
        </div>
        <div class="chat-input-bar">
            <input type="text" id="chatInput" placeholder="输入消息..." />
            <button id="chatSendBtn">发送</button>
        </div>
    </div>
    `;
    container.innerHTML = html;
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text) return;
        if (G.confessionState && G.confessionState.npcId === npcId && G.confessionState.step === 'waiting') {
            await handleConfessionReply(npcId, text);
            input.value = '';
            renderSocialPanel();
            return;
        }
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        pushChat(npcId, { from: 'player', text, time: timeStr });
        input.value = '';
        autoSaveGame();
        if (document.querySelector('.tab-btn.active')?.dataset.tab === 'social') renderSocialPanel();
        const msgContainer = document.getElementById('chatMessages');
        if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
        getNPCReply(npcId, text);
    };
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
    const msgContainer = document.getElementById('chatMessages');
    if (msgContainer) msgContainer.scrollTop = msgContainer.scrollHeight;
}

function openChat(npcId) { G.currentChatNpc = npcId;
    renderSocialPanel(); }

function closeChat() { G.currentChatNpc = null;
    renderSocialPanel(); }
// ============================================================
// NPC回复函数（调用API，思维链过滤，即时保存）
// ============================================================
async function getNPCReply(npcId, playerText) {
    const npc = G.npcs[npcId];
    if (!npc) return;
    if (npcId === 'dream') {
        const canReply = (G.player.followers >= 500000) || (npc.favor >= 20) || (G.player.metDream === true);
        if (!canReply) {
            const now = new Date();
            pushChat(npcId, { from: 'system', text: 'Dream seems busy... He didn\'t reply.',
                time: now.toLocaleTimeString() });
            if (G.currentChatNpc === npcId) renderSocialPanel();
            showToast('💤 Dream 没有回复', 'error', 2000);
            autoSaveGame();
            return;
        }
        const favorGain = rand(1, 2);
        npc.favor = Math.min(100, npc.favor + favorGain);
        if (!G.player.metDream) G.player.metDream = true;
    }
    const history = G.chatHistory[npcId] || [];
    const recentHistory = history.slice(-6).map(m =>
        `${m.from === 'player' ? '玩家' : npc.name}: ${stripThought(m.text)}`
    ).join('\n');
    const favor = npc.favor || 0;
    let tone = '', lengthHint = '';
    if (favor >= 80) {
        tone = '语气暧昧、温柔，带有试探和喜欢，但保持克制，体现拉扯感。内心矛盾，既想靠近又怕破坏现有关系，欲言又止。';
        lengthHint = '回复可以稍长，2-4句，包含内心活动的暗示';
    } else if (favor >= 60) {
        tone = '语气亲切，偶尔流露好感，开始试探性，保持微妙距离。内心开始纠结，对对方有依赖感但不敢表露太多。';
        lengthHint = '回复中等长度，2-3句，带点犹豫';
    } else if (favor >= 40) {
        tone = '语气友好，开始有点关心，但保持着朋友间的安全距离。偶尔流露出超出朋友的在意，但很快又收回。';
        lengthHint = '回复中等，2-3句，保持分寸';
    } else if (favor >= 20) {
        tone = '语气友好，保持礼貌，偶尔带点幽默，但不会越界。';
        lengthHint = '回复简短，1-2句';
    } else {
        tone = '语气礼貌但疏离，保持距离。';
        lengthHint = '回复简短，1句，绝不提天气。';
    }
    const sysPrompt = `
    你正在扮演MC主播 ${npc.name}，你的人设是：${npc.persona}。
    当前好感度：${favor}/100。
    【核心指令】
    1. 你必须直接回应当前玩家消息的内容。先承接玩家的话，再展开你的性格回应。
    2. 严禁无视玩家提问自顾自说话，严禁重复自己之前的句子。
    3. 结合最近聊天记录保证连贯。
    【禁令】严禁复读玩家原话，严禁在回复中使用括号动作描写，只输出纯对话文本。
    【语气】${tone}，回复长度${lengthHint}。
    最近聊天记录：${recentHistory || '（无最近记录）'}
    玩家消息：${playerText}
    只输出你的回复内容。
    `;
    try {
        const reply = await callAI([{ role: 'system', content: sysPrompt }, { role: 'user', content: playerText }], { maxTokens: 10000, temperature: 0.8 });
        const now = new Date();
        pushChat(npcId, { from: 'npc', text: reply, time: now.toLocaleTimeString() });
        if (npcId !== 'dream') {
            const favorGain = rand(1, 3);
            npc.favor = Math.min(100, npc.favor + favorGain);
        }
        if (G.currentChatNpc === npcId) renderSocialPanel();
        showToast(`💬 ${npc.name} 回复了你`, 'success', 1500);
        autoSaveGame();
    } catch (e) {
        console.error('NPC回复失败', e);
        const fallback = ['Hmm.', 'Alright.', 'I see.', 'Yeah.', 'Nah.', 'Cool.'][rand(0, 5)];
        const now = new Date();
        pushChat(npcId, { from: 'npc', text: fallback, time: now.toLocaleTimeString() });
        if (G.currentChatNpc === npcId) renderSocialPanel();
        autoSaveGame();
    }
}
// ============================================================
// 回忆录
// ============================================================
function renderMemoir() {
    const container = dom.memoirTab;
    if (G.memoir.length === 0) {
        container.innerHTML =
            `<div style="text-align:center;color:var(--text2);padding:30px 0;">还没有记录，开始你的主播生涯吧！</div>`;
        return;
    }
    let html = `<div style="font-weight:700;font-size:17px;margin-bottom:10px;">📜 回忆录</div><div class="timeline">`;
    const entries = [...G.memoir].reverse();
    for (const e of entries) {
        html += `
        <div class="timeline-item">
            <span class="date">📅 第${e.day}天</span>
            <strong>${e.event}</strong>
            ${e.details ? ` -- ${e.details}` : ''}
            <span style="font-size:10px;color:var(--text2);display:block;margin-top:2px;">${e.timestamp}</span>
        </div>
        `;
    }
    html += `</div>`;
    container.innerHTML = html;
}
// ============================================================