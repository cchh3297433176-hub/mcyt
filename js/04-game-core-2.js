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
        { id: 'hot1', label: '🔥 热度小包', desc: '一次性增加 5,000 粉丝', cost: 1000, effect: () => { G.player.followers += 5000; } },
        { id: 'hot2', label: '🔥 热度中包', desc: '一次性增加 20,000 粉丝', cost: 3500, effect: () => { G.player.followers += 20000; } },
        { id: 'hot3', label: '🔥 热度大包', desc: '一次性增加 50,000 粉丝', cost: 8000, effect: () => { G.player.followers += 50000; } },
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
    const container = document.getElementById(`colcom-${video.collection}-${videoIndex}`) || document.getElementById(`comments-${videoIndex}`);
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
    html += `<div style="font-size:15px;font-weight:700;color:var(--text);margin:14px 0 10px;">🤖 角色技术属性</div>`;
    for (const [id, npc] of Object.entries(G.npcs)) {
        const ns = npc.skills || { building: 0, redstone: 0, pvp: 0, survival: 0, hunting: 0 };
        const avg = Math.round((ns.building + ns.redstone + ns.pvp + ns.survival + ns.hunting) / 5);
        const isLover = G.player.lovers.includes(npc.name);
        html += `
        <div class="npc-card" onclick="openChat('${id}')">
            <div class="npc-info">
                <div class="npc-name">${npc.avatarUrl ? `<img src="${npc.avatarUrl}" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;">` : (npc.avatarEmoji || '👤')} ${npc.name} ${isLover ? '💕' : ''}</div>
                <div class="npc-desc">${npc.isCustom ? '自定义角色' : `平均技术 ${avg}`} · 好感 ${npc.favor||0}</div>
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
// 📱 统一社交聊天系统（单人 / 群聊 / 好友申请红点 / NPC专属记忆）
// ============================================================
if (!G.chatActiveTab) G.chatActiveTab = 'direct';
if (!G.groups) G.groups = {};
if (!G.groupChatHistory) G.groupChatHistory = {};
if (!G.friendRequests) G.friendRequests = []; // 好友申请池 [{ id, name, persona, avatarEmoji, avatarUrl, fromReason, day }]

// 辅助渲染头像（优先 URL/本地图片，其次 Emoji）
function renderAvatarBadge(obj, size = 44) {
    if (obj && obj.avatarUrl) {
        return `<img src="${obj.avatarUrl}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block;">`;
    }
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#eaf2ea;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(size*0.45)}px;flex-shrink:0;">${(obj && obj.avatarEmoji) || '👤'}</div>`;
}

function renderSocialPanel() {
    const container = dom.socialTab;
    if (G.currentChatGroup) {
        renderGroupChatWindow(container);
        return;
    }
    if (G.currentChatNpc) {
        renderSingleChatWindow(container);
        return;
    }
    renderChatHome(container);
}

// 收到好友申请的核心入口（弹窗通知 + 红点机制）
function receiveFriendRequest(req) {
    req._id = 'freq_' + Date.now() + '_' + rand(100, 999);
    G.friendRequests.push(req);
    autoSaveGame();

    // 弹窗提示：你收到一条好友申请，点击我已知晓后关闭
    openModal(`
        <div style="text-align:center;padding:10px 0;">
            <div style="font-size:36px;margin-bottom:8px;">📬</div>
            <h3 style="margin-bottom:6px;">收到新的好友申请！</h3>
            <p style="font-size:14px;color:#333;margin:8px 0;">来自 <b>${escapeHtml(req.name)}</b> 的好友申请：</p>
            <div style="background:#f5faf5;padding:10px 14px;border-radius:10px;font-size:13px;color:#666;line-height:1.6;text-align:left;border:1px dashed #c8e6c9;">
                <div><b>身份：</b>${escapeHtml(req.fromReason || '粉丝/路人主播')}</div>
                <div style="margin-top:4px;"><b>人设：</b>${escapeHtml(req.persona || '希望能和你交个朋友！')}</div>
            </div>
            <div style="font-size:11px;color:#999;margin-top:10px;">可在「聊天」右上角 ➕ 查看并处理。</div>
            <div class="btn-row" style="margin-top:16px;">
                <button class="btn-primary" style="width:100%;" onclick="closeModal()">我已知晓</button>
            </div>
        </div>
    `);
    if (document.querySelector('.tab-btn.active')?.dataset.tab === 'social') renderSocialPanel();
}

function renderChatHome(container) {
    const isDirect = G.chatActiveTab !== 'group';
    const pendingCount = (G.friendRequests || []).length;

    let html = `
    <div class="chat-app" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);min-height:550px;display:flex;flex-direction:column;">
        <div class="chat-header" style="padding:12px 16px;background:#f8fbf8;border-bottom:1px solid #eef3ee;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;gap:6px;background:#e9f2e9;padding:3px;border-radius:8px;">
                <button id="tabDirectBtn" style="border:none;padding:6px 14px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;background:${isDirect ? '#fff' : 'transparent'};color:${isDirect ? 'var(--primary)' : '#666'};">👤 私聊</button>
                <button id="tabGroupBtn" style="border:none;padding:6px 14px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;background:${!isDirect ? '#fff' : 'transparent'};color:${!isDirect ? 'var(--primary)' : '#666'};">👥 群聊</button>
            </div>
            <div style="position:relative;">
                <button id="addChatTargetBtn" title="新建与好友申请" style="border:none;background:var(--primary);color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
                ${pendingCount > 0 ? `<span style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;background:#ff4757;border:2px solid #fff;border-radius:50%;"></span>` : ''}
            </div>
        </div>
        <div style="font-size:11px;color:#888;padding:6px 16px;background:#fcfdfc;border-bottom:1px dashed #eee;">
            💡 长按联系人或群可编辑头像、人设设定与记忆总结设置
        </div>
        <div class="chat-list" style="flex:1;overflow-y:auto;padding:8px;">
    `;

    if (isDirect) {
        for (const [id, npc] of Object.entries(G.npcs)) {
            const chatHist = G.chatHistory[id] || [];
            const lastMsg = chatHist.length > 0 ? chatHist[chatHist.length - 1] : null;
            const purePreview = lastMsg ? stripThought(lastMsg.text) : (npc.memorySummary ? `[记忆: ${stripThought(npc.memorySummary).slice(0, 15)}...]` : '暂无新消息');
            const time = lastMsg ? (lastMsg.time || '') : '';
            const isLover = G.player.lovers.includes(npc.name);
            
            html += `
            <div class="chat-item" data-id="${id}" style="display:flex;align-items:center;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:#fff;border:1px solid #f0f4f0;">
                <div style="margin-right:12px;flex-shrink:0;">${renderAvatarBadge(npc, 44)}</div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-weight:700;font-size:14px;color:var(--text);">${escapeHtml(npc.name)} ${isLover ? '💕' : ''} ${npc.isCustom ? '<span style="font-size:10px;color:var(--primary);border:1px solid;padding:0 4px;border-radius:4px;">自定义</span>' : ''}</span>
                        <span style="font-size:11px;color:#bbb;">${time}</span>
                    </div>
                    <div style="font-size:12px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px;">${escapeHtml(purePreview.slice(0, 30))}</div>
                </div>
            </div>`;
        }
    } else {
        const groupKeys = Object.keys(G.groups);
        if (!groupKeys.length) {
            html += `<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">暂无群聊，点击右上角 ➕ 即可自建专属粉丝群或主播交流群！</div>`;
        } else {
            for (const [gid, grp] of Object.entries(G.groups)) {
                const msgs = G.groupChatHistory[gid] || [];
                const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
                const purePreview = lastMsg ? `${lastMsg.senderName}: ${stripThought(lastMsg.text)}` : (grp.desc || '开启热烈讨论吧');
                html += `
                <div class="group-item" data-gid="${gid}" style="display:flex;align-items:center;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:#fff;border:1px solid #f0f4f0;">
                    <div style="margin-right:12px;flex-shrink:0;">${renderAvatarBadge(grp, 44)}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span style="font-weight:700;font-size:14px;color:var(--text);">${escapeHtml(grp.name)} <span style="font-size:11px;color:#999;">(${grp.members.length}人)</span></span>
                            <span style="font-size:11px;color:#bbb;">${lastMsg ? (lastMsg.time || '') : ''}</span>
                        </div>
                        <div style="font-size:12px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:3px;">${escapeHtml(purePreview.slice(0, 30))}</div>
                    </div>
                </div>`;
            }
        }
    }

    html += `</div></div>`;
    container.innerHTML = html;

    document.getElementById('tabDirectBtn').onclick = () => { G.chatActiveTab = 'direct'; renderSocialPanel(); };
    document.getElementById('tabGroupBtn').onclick = () => { G.chatActiveTab = 'group'; renderSocialPanel(); };
    document.getElementById('addChatTargetBtn').onclick = () => openAddChatTargetModal();

    container.querySelectorAll('.chat-item').forEach(el => {
        const id = el.dataset.id;
        bindLongPressEvent(el, () => openEditNpcModal(id), () => openChat(id));
    });

    container.querySelectorAll('.group-item').forEach(el => {
        const gid = el.dataset.gid;
        bindLongPressEvent(el, () => openGroupSettingsModal(gid), () => openGroupChat(gid));
    });
}

function bindLongPressEvent(element, onLongPress, onClick) {
    let pressTimer = null;
    let isLong = false;
    const start = () => {
        isLong = false;
        pressTimer = setTimeout(() => {
            isLong = true;
            onLongPress();
        }, 550);
    };
    const cancel = () => { clearTimeout(pressTimer); };
    element.addEventListener('touchstart', start, { passive: true });
    element.addEventListener('touchend', () => { cancel(); if (!isLong) onClick(); });
    element.addEventListener('touchmove', cancel);
    element.addEventListener('mousedown', start);
    element.addEventListener('mouseup', () => { cancel(); if (!isLong) onClick(); });
}

// ============================================================
// 单人聊天窗口
// ============================================================
function renderSingleChatWindow(container) {
    const npcId = G.currentChatNpc;
    const npc = G.npcs[npcId];
    if (!npc) { closeChat(); return; }
    const chatHist = G.chatHistory[npcId] || [];

    let messagesHtml = '';
    for (const msg of chatHist) {
        if (msg.from === 'action') {
            messagesHtml += `
            <div style="text-align:center;margin:8px 0;">
                <span style="display:inline-block;background:rgba(0,0,0,0.05);color:#777;padding:4px 10px;border-radius:12px;font-size:12px;max-width:85%;">${escapeHtml(msg.text)}</span>
            </div>`;
        } else {
            const isSelf = msg.from === 'player';
            messagesHtml += `
            <div style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge(npc, 34)}</div>` : ''}
                <div style="max-width:75%;">
                    <div style="background:${isSelf ? '#95ec69' : '#fff'};color:#111;padding:8px 12px;border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:0 1px 3px rgba(0,0,0,0.08);font-size:14px;line-height:1.5;word-break:break-word;">
                        ${isSelf ? escapeHtml(msg.text).replace(/\n/g, '<br>') : renderContentWithThoughts(msg.text)}
                    </div>
                    <div style="font-size:10px;color:#bbb;margin-top:2px;text-align:${isSelf ? 'right' : 'left'};">${msg.time || ''}</div>
                </div>
                ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: G.player.avatar, avatarEmoji: '🧑' }, 34)}</div>` : ''}
            </div>`;
        }
    }

    const html = `
    <div style="background:#f2f4f2;border-radius:14px;display:flex;flex-direction:column;height:82vh;max-height:850px;box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden;">
        <div style="padding:10px 14px;background:#fff;border-bottom:1px solid #e5ebe5;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
                <button onclick="closeChat()" style="border:none;background:none;font-size:20px;color:#333;cursor:pointer;padding:0 4px;">❮</button>
                <div>
                    <div style="font-weight:700;font-size:15px;">${escapeHtml(npc.name)}</div>
                    <div style="font-size:11px;color:#2e7d32;">● 在线 ${npc.memorySummary ? '· 🧠已建立专属记忆' : ''}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button id="triggerAIReplyBtn" title="让AI生成回复" style="border:none;background:#ff4757;color:#fff;width:34px;height:34px;border-radius:8px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:14px;">
            ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">发消息不消耗点数、不触发AI；输入完毕点击右上角 ⚡ 闪电即可触发回复。</div>'}
        </div>

        <div style="padding:8px 10px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:8px;align-items:center;">
            <button id="chatActionInsertBtn" title="插入动作或环境叙事" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
            <textarea id="singleChatInput" rows="1" placeholder="输入消息（可连续发多条）..." style="flex:1;padding:8px 12px;border-radius:18px;border:1px solid #ddd;background:#f8faf8;font-size:14px;resize:none;outline:none;font-family:inherit;"></textarea>
            <button id="singleSendBtn" style="border:none;background:var(--primary);color:#fff;padding:8px 16px;border-radius:18px;font-size:13px;font-weight:700;cursor:pointer;">发送</button>
        </div>
    </div>
    `;
    container.innerHTML = html;

    const msgArea = document.getElementById('chatMessageArea');
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;

    const input = document.getElementById('singleChatInput');
    const sendBtn = document.getElementById('singleSendBtn');

    const doSend = () => {
        const text = input.value.trim();
        if (!text) return;
        pushChat(npcId, { from: 'player', text, time: new Date().toLocaleTimeString().slice(0, 5) });
        input.value = '';
        renderSingleChatWindow(container);
        autoSaveGame();
    };

    sendBtn.onclick = doSend;
    input.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            doSend();
        }
    };

    document.getElementById('chatActionInsertBtn').onclick = () => {
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
            pushChat(npcId, { from: 'action', text: `* ${act} *`, time: new Date().toLocaleTimeString().slice(0, 5) });
            closeModal();
            renderSingleChatWindow(container);
            autoSaveGame();
        };
    };

    document.getElementById('triggerAIReplyBtn').onclick = async () => {
        if (G.isGenerating) { showToast('⏳ AI 正在组织语言中...'); return; }
        showToast('⚡ 正在请求回复...', 'success', 1200);
        await triggerAIReplyForSingle(npcId);
        renderSingleChatWindow(container);
    };
}

// 检查并自动执行 NPC 专属私聊/群聊记忆总结
async function checkNpcMemorySummarize(npcId) {
    const npc = G.npcs[npcId];
    if (!npc) return;
    const history = G.chatHistory[npcId] || [];
    const threshold = npc.summaryThreshold || 12; // 默认满12轮自动总结

    if (history.length >= threshold && !npc._summarizing) {
        npc._summarizing = true;
        try {
            const toSummarize = history.slice(0, history.length - 4); // 保留最后4条
            const textToSummarize = toSummarize.map(m => `${m.from === 'player' ? '玩家' : npc.name}: ${stripThought(m.text)}`).join('\n');
            const prior = npc.memorySummary ? `此前已有记忆：\n${npc.memorySummary}\n\n` : '';
            const sys = `你是角色记忆归纳助手。请将角色「${npc.name}」与玩家的对话提炼为一段不超过150字的专属记忆总结，保留双方关系变化、聊过的关键话题和承诺。只输出精炼总结内容。`;
            const summary = await callAI([
                { role: 'system', content: sys },
                { role: 'user', content: `${prior}需要总结的对话：\n${textToSummarize}` }
            ], { maxTokens: 400, temperature: 0.5 });

            npc.memorySummary = stripThought(summary.trim());
            // 归档更早的历史，释放上下文
            G.chatHistory[npcId] = history.slice(history.length - 4);
            autoSaveGame();
        } catch (e) {
            console.warn('NPC 记忆总结失败', e);
        } finally {
            npc._summarizing = false;
        }
    }
}

async function triggerAIReplyForSingle(npcId) {
    const npc = G.npcs[npcId];
    if (!npc) return;
    const history = G.chatHistory[npcId] || [];
    if (!history.length) { showToast('请先发送至少一条对话'); return; }

    const recent = history.slice(-10).map(m => {
        if (m.from === 'action') return `[旁白: ${m.text}]`;
        return `${m.from === 'player' ? '玩家' : npc.name}: ${stripThought(m.text)}`;
    }).join('\n');

    // 融入群聊与专属私聊记忆
    const npcMemoryContext = npc.memorySummary ? `【与玩家的历史记忆】\n${npc.memorySummary}\n` : '';
    const groupMemoryContext = npc.groupMemorySummary ? `【在群聊中的记忆印象】\n${npc.groupMemorySummary}\n` : '';

    const sysPrompt = `
    你正在扮演角色「${npc.name}」。
    设定：${npc.persona || '普通朋友'}。
    好感度：${npc.favor || 0}/100。
    ${npcMemoryContext}
    ${groupMemoryContext}
    【要求】
    1. 自然接住玩家发送的最后内容，使用手机聊天的口吻。
    2. 严禁复读玩家原话，只输出发言正文。
    最近对话记录：
    ${recent}
    `;

    try {
        G.isGenerating = true;
        showLoading();
        const reply = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: '请进行回复。' }
        ], { maxTokens: 800, temperature: 0.85 });
        hideLoading();
        pushChat(npcId, { from: 'npc', text: reply, time: new Date().toLocaleTimeString().slice(0, 5) });
        await checkNpcMemorySummarize(npcId);
        autoSaveGame();
    } catch (e) {
        hideLoading();
        showToast('❌ 回复失败，请检查网络', 'error');
    } finally {
        G.isGenerating = false;
    }
}

// ============================================================
// 👥 群聊系统
// ============================================================
function openGroupChat(gid) {
    G.currentChatGroup = gid;
    renderSocialPanel();
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

    let messagesHtml = '';
    for (const msg of msgs) {
        if (msg.from === 'action') {
            messagesHtml += `
            <div style="text-align:center;margin:8px 0;">
                <span style="display:inline-block;background:rgba(0,0,0,0.05);color:#777;padding:3px 10px;border-radius:12px;font-size:11px;">${escapeHtml(msg.text)}</span>
            </div>`;
        } else {
            const isSelf = msg.from === 'player';
            messagesHtml += `
            <div style="display:flex;justify-content:${isSelf ? 'flex-end' : 'flex-start'};margin-bottom:12px;align-items:flex-start;">
                ${!isSelf ? `<div style="margin-right:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: msg.senderAvatarUrl, avatarEmoji: msg.senderAvatar || '👤' }, 34)}</div>` : ''}
                <div style="max-width:75%;">
                    ${!isSelf ? `<div style="font-size:11px;color:#777;margin-bottom:2px;">${escapeHtml(msg.senderName)}</div>` : ''}
                    <div style="background:${isSelf ? '#95ec69' : '#fff'};color:#111;padding:8px 12px;border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:0 1px 3px rgba(0,0,0,0.08);font-size:14px;line-height:1.5;word-break:break-word;">
                        ${isSelf ? escapeHtml(msg.text).replace(/\n/g, '<br>') : renderContentWithThoughts(msg.text)}
                    </div>
                    <div style="font-size:10px;color:#bbb;margin-top:2px;text-align:${isSelf ? 'right' : 'left'};">${msg.time || ''}</div>
                </div>
                ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: G.player.avatar, avatarEmoji: '🧑' }, 34)}</div>` : ''}
            </div>`;
        }
    }

    const html = `
    <div style="background:#f2f4f2;border-radius:14px;display:flex;flex-direction:column;height:82vh;max-height:850px;box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden;">
        <div style="padding:10px 14px;background:#fff;border-bottom:1px solid #e5ebe5;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
                <button onclick="closeGroupChat()" style="border:none;background:none;font-size:20px;color:#333;cursor:pointer;padding:0 4px;">❮</button>
                <div>
                    <div style="font-weight:700;font-size:15px;">${escapeHtml(grp.name)} <span style="font-size:12px;color:#888;">(${grp.members.length})</span></div>
                    <div style="font-size:11px;color:#888;">${grp.desc ? escapeHtml(grp.desc.slice(0, 18)) : '群聊自由交流'}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button id="groupSettingsBtn" style="border:1px solid #ddd;background:#fff;color:#555;padding:4px 8px;border-radius:8px;font-size:12px;cursor:pointer;">⚙️ 管理</button>
                <button id="triggerGroupAIBtn" style="border:none;background:#ff4757;color:#fff;width:34px;height:34px;border-radius:8px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        <div id="groupMessageArea" style="flex:1;overflow-y:auto;padding:14px;">
            ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">群里静悄悄的，发送消息并点击右上角 ⚡ 闪电激起群聊讨论吧！</div>'}
        </div>

        <div style="padding:8px 10px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:8px;align-items:center;">
            <textarea id="groupChatInput" rows="1" placeholder="在群里发言..." style="flex:1;padding:8px 12px;border-radius:18px;border:1px solid #ddd;background:#f8faf8;font-size:14px;resize:none;outline:none;font-family:inherit;"></textarea>
            <button id="groupSendBtn" style="border:none;background:var(--primary);color:#fff;padding:8px 16px;border-radius:18px;font-size:13px;font-weight:700;cursor:pointer;">发送</button>
        </div>
    </div>
    `;
    container.innerHTML = html;

    const msgArea = document.getElementById('groupMessageArea');
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;

    const input = document.getElementById('groupChatInput');
    const sendBtn = document.getElementById('groupSendBtn');

    const doSend = () => {
        const text = input.value.trim();
        if (!text) return;
        if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
        G.groupChatHistory[gid].push({
            _id: 'gmsg_' + Date.now() + '_' + rand(100, 999),
            from: 'player',
            senderName: G.player.ytName,
            text,
            time: new Date().toLocaleTimeString().slice(0, 5)
        });
        input.value = '';
        renderGroupChatWindow(container);
        autoSaveGame();
    };

    sendBtn.onclick = doSend;
    input.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            doSend();
        }
    };

    document.getElementById('groupSettingsBtn').onclick = () => openGroupSettingsModal(gid);
    document.getElementById('triggerGroupAIBtn').onclick = async () => {
        if (G.isGenerating) { showToast('⏳ AI 正在组织群聊中...'); return; }
        showToast('⚡ 触发群聊讨论...', 'success', 1200);
        await triggerGroupAIReply(gid);
        renderGroupChatWindow(container);
    };
}

async function triggerGroupAIReply(gid) {
    const grp = G.groups[gid];
    if (!grp) return;
    const history = G.groupChatHistory[gid] || [];
    if (!history.length) { showToast('请先在群里发一条消息'); return; }

    const activeList = grp.activeMembers && grp.activeMembers.length ? grp.activeMembers : grp.members;
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

    const recent = history.slice(-10).map(m => `${m.senderName}: ${stripThought(m.text)}`).join('\n');

    try {
        G.isGenerating = true;
        showLoading();

        if (grp.streamerMode === 'separate' && activeStreamers.length) {
            const picked = activeStreamers.sort(() => 0.5 - Math.random()).slice(0, rand(1, 2));
            for (const st of picked) {
                const sys = `你是主播「${st.name}」，人设：${st.persona}。你正在群聊「${grp.name}」中。根据最近聊天直接给出你在群里的一句简短回复，只输出对话正文。`;
                const rep = await callAI([{ role: 'system', content: sys }, { role: 'user', content: `最近聊天：\n${recent}` }], { maxTokens: 200, temperature: 0.9 });
                if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
                G.groupChatHistory[gid].push({
                    _id: 'gmsg_' + Date.now() + '_' + rand(100, 999),
                    from: 'npc',
                    senderName: st.name,
                    senderAvatar: st.avatarEmoji || '👤',
                    senderAvatarUrl: st.avatarUrl || null,
                    text: rep.trim(),
                    time: new Date().toLocaleTimeString().slice(0, 5)
                });
            }
        }

        if (grp.streamerMode !== 'separate' || activeFans.length) {
            const memberPoolDesc = activeList.map(mid => {
                const n = G.npcs[mid];
                return n ? `【${n.name}】(${n.persona || '群友'})` : null;
            }).filter(Boolean).join('、');

            const sys = `
            你正在模拟群聊「${grp.name}」（简介：${grp.desc || '自由讨论'}）。
            参与成员有：${memberPoolDesc}。
            请根据最近群聊，随机选择 1 到 3 位成员进行生动接话，格式必须如下（每行一条）：
            [MSG name=角色名]回复正文[/MSG]
            `;
            const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: `最近群聊记录：\n${recent}` }], { maxTokens: 600, temperature: 0.95 });
            const re = /\[MSG\s+name=([^\]]+?)\]([\s\S]*?)\[\/MSG\]/g;
            let m;
            while ((m = re.exec(raw)) !== null) {
                const sName = m[1].trim();
                const matchedNpc = Object.values(G.npcs).find(n => n.name === sName);
                if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
                G.groupChatHistory[gid].push({
                    _id: 'gmsg_' + Date.now() + '_' + rand(100, 999),
                    from: 'npc',
                    senderName: sName,
                    senderAvatar: matchedNpc ? (matchedNpc.avatarEmoji || '👤') : '💬',
                    senderAvatarUrl: matchedNpc ? (matchedNpc.avatarUrl || null) : null,
                    text: m[2].trim(),
                    time: new Date().toLocaleTimeString().slice(0, 5)
                });
            }
        }

        hideLoading();
        autoSaveGame();
    } catch (e) {
        hideLoading();
        showToast('❌ 群聊生成失败', 'error');
    } finally {
        G.isGenerating = false;
    }
}

// ============================================================
// ➕ 新建与好友申请管理弹窗
// ============================================================
function openAddChatTargetModal() {
    const requests = G.friendRequests || [];
    let requestsHtml = '';
    if (!requests.length) {
        requestsHtml = `<div style="font-size:12px;color:#999;padding:8px 0;">暂无待处理的好友申请</div>`;
    } else {
        requestsHtml = requests.map(r => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#f9fbf9;border-radius:8px;margin-bottom:6px;border:1px solid #eef2ee;">
                <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                    ${renderAvatarBadge(r, 34)}
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;font-size:13px;">${escapeHtml(r.name)} <span style="font-size:10px;color:#999;">(${escapeHtml(r.fromReason||'申请')])</span></div>
                        <div style="font-size:11px;color:#777;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(r.persona||'')}</div>
                    </div>
                </div>
                <div style="display:flex;gap:4px;margin-left:8px;">
                    <button class="upload-btn" onclick="handleFriendRequestAction('${r._id}', true)" style="padding:3px 8px;font-size:11px;">✅ 通过</button>
                    <button class="upload-btn" onclick="handleFriendRequestAction('${r._id}', false)" style="padding:3px 8px;font-size:11px;background:#c62828;">❌ 拒绝</button>
                </div>
            </div>
        `).join('');
    }

    openModal(`
        <h3>➕ 社交与好友中心</h3>
        <div style="margin:10px 0 12px;border:1px solid #eee;border-radius:10px;padding:10px;background:#fff;">
            <div style="font-size:13px;font-weight:700;margin-bottom:6px;color:var(--primary);display:flex;align-items:center;justify-content:space-between;">
                <span>📬 好友申请列表</span>
                ${requests.length ? `<span style="background:#ff4757;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;">${requests.length}条新申请</span>` : ''}
            </div>
            ${requestsHtml}
        </div>
        <div class="btn-row" style="flex-direction:column;gap:8px;">
            <button class="btn-primary" id="btnNewCustomNPC" style="width:100%;">👤 新建自定义联系人 / 粉丝</button>
            <button class="btn-primary" id="btnNewGroup" style="width:100%;background:#3866c4;">👥 创建新群聊</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">关闭</button>
        </div>
    `);

    document.getElementById('btnNewCustomNPC').onclick = () => { closeModal(); openEditNpcModal(null); };
    document.getElementById('btnNewGroup').onclick = () => { closeModal(); openEditGroupModal(null); };
}

// 通过/拒绝好友申请
function handleFriendRequestAction(reqId, accept) {
    const idx = (G.friendRequests || []).findIndex(r => r._id === reqId);
    if (idx === -1) return;
    const req = G.friendRequests[idx];
    G.friendRequests.splice(idx, 1);

    if (accept) {
        const id = 'custom_npc_' + Date.now();
        G.npcs[id] = {
            id,
            name: req.name,
            avatarEmoji: req.avatarEmoji || '👤',
            avatarUrl: req.avatarUrl || null,
            persona: req.persona || '一位热心好友',
            favor: 40,
            isCustom: true,
            summaryThreshold: 12
        };
        showToast(`🎉 已同意 ${req.name} 的好友申请！`, 'success', 2500);
        appendStory(`🤝 你通过了「${req.name}」的好友申请，已添加到联系人列表中。`, '🤝 新增好友');
    } else {
        showToast(`已婉拒 ${req.name} 的好友申请`, 'info', 1500);
    }
    autoSaveGame();
    closeModal();
    renderSocialPanel();
}
window.handleFriendRequestAction = handleFriendRequestAction;

// 编辑/新建角色（支持本地相册图片上传 & 图片 URL & 独立记忆总结轮数）
function openEditNpcModal(npcId) {
    const isNew = !npcId;
    const npc = !isNew ? G.npcs[npcId] : { name: '', avatarEmoji: '👤', avatarUrl: '', persona: '', favor: 50, isCustom: true, summaryThreshold: 12 };
    
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
        <div class="form-group">
            <label>🧠 独立记忆总结轮数（满多少轮自动提炼精炼记忆并归档）</label>
            <input type="number" id="npcThresholdInput" min="4" max="50" value="${npc.summaryThreshold || 12}" style="width:100%;padding:6px 10px;border-radius:8px;border:1px solid #ccc;font-size:13px;">
        </div>
        <div class="btn-row" style="margin-top:12px;">
            ${!isNew && npc.isCustom ? `<button class="btn-secondary" id="delNpcBtn" style="color:#e53935;">🗑️ 删除角色</button>` : ''}
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="saveNpcBtn">💾 保存</button>
        </div>
    `);

    let currentAvatarDataUrl = npc.avatarUrl || '';

    // 本地相册图片选择并转为 Base64
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
        const threshold = parseInt(document.getElementById('npcThresholdInput').value) || 12;
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
            delete G.chatHistory[npcId];
            showToast('🗑️ 已删除该角色', 'success');
            closeModal();
            renderSocialPanel();
            autoSaveGame();
        };
    }
}

// 编辑/新建群聊（同样支持本地图片和 URL 头像）
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
            streamerMode: grp.streamerMode || 'unified'
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
    const allNpcIds = Object.keys(G.npcs);

    allNpcIds.forEach(nid => {
        const n = G.npcs[nid];
        const isMember = grp.members.includes(nid);
        const isActive = (grp.activeMembers || grp.members).includes(nid);
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
        <div style="font-size:13px;font-weight:700;margin:10px 0 6px;">🤖 回复模式</div>
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

        <div style="font-size:13px;font-weight:700;margin-bottom:6px;">👥 成员勾选与接话配置</div>
        <div style="max-height:220px;overflow-y:auto;border:1px solid #eee;border-radius:8px;padding:4px 10px;">
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

        grp.members = mems;
        grp.activeMembers = actives;
        grp.streamerMode = mode;

        showToast('✅ 群设置已保存', 'success');
        closeModal();
        renderSocialPanel();
        autoSaveGame();
    };

    document.getElementById('delGroupBtn').onclick = () => {
        delete G.groups[gid];
        delete G.groupChatHistory[gid];
        showToast('🗑️ 已解散该群聊', 'success');
        closeModal();
        closeGroupChat();
        autoSaveGame();
    };
}

function openChat(npcId) { G.currentChatNpc = npcId; renderSocialPanel(); }
function closeChat() { G.currentChatNpc = null; renderSocialPanel(); }

// ============================================================
// 回忆录
// ============================================================
function renderMemoir() {
    const container = dom.memoirTab;
    if (G.memoir.length === 0) {
        container.innerHTML = `<div style="text-align:center;color:var(--text2);padding:30px 0;">还没有记录，开始你的主播生涯吧！</div>`;
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