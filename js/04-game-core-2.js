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
                <div class="npc-name">${npc.avatarEmoji || '👤'} ${npc.name} ${isLover ? '💕' : ''}</div>
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
// 📱 统一社交聊天系统（类微信设计：单人 / 群聊 / 闪电触发 / 灵活API）
// ============================================================
if (!G.chatActiveTab) G.chatActiveTab = 'direct'; // 'direct' | 'group'
if (!G.groups) G.groups = {};
if (!G.groupChatHistory) G.groupChatHistory = {};

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

// 聊天主页（单人 / 群聊切换）
function renderChatHome(container) {
    const isDirect = G.chatActiveTab !== 'group';
    let html = `
    <div class="chat-app" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);min-height:550px;display:flex;flex-direction:column;">
        <div class="chat-header" style="padding:12px 16px;background:#f8fbf8;border-bottom:1px solid #eef3ee;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;gap:6px;background:#e9f2e9;padding:3px;border-radius:8px;">
                <button id="tabDirectBtn" style="border:none;padding:6px 14px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;background:${isDirect ? '#fff' : 'transparent'};color:${isDirect ? 'var(--primary)' : '#666'};box-shadow:${isDirect ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'};">👤 单人私聊</button>
                <button id="tabGroupBtn" style="border:none;padding:6px 14px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;background:${!isDirect ? '#fff' : 'transparent'};color:${!isDirect ? 'var(--primary)' : '#666'};box-shadow:${!isDirect ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'};">👥 群聊中心</button>
            </div>
            <button id="addChatTargetBtn" style="border:none;background:var(--primary);color:#fff;width:32px;height:32px;border-radius:50%;font-size:18px;line-height:32px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
        </div>
        <div style="font-size:11px;color:#999;padding:6px 16px;background:#fcfdfc;border-bottom:1px dashed #eee;">
            💡 提示：长按列表条目可编辑角色人设、头像或解散群聊
        </div>
        <div class="chat-list" style="flex:1;overflow-y:auto;padding:8px;">
    `;

    if (isDirect) {
        // 单人列表
        for (const [id, npc] of Object.entries(G.npcs)) {
            const chatHist = G.chatHistory[id] || [];
            const lastMsg = chatHist.length > 0 ? chatHist[chatHist.length - 1] : null;
            const purePreview = lastMsg ? stripThought(lastMsg.text) : '暂无新消息';
            const time = lastMsg ? (lastMsg.time || '') : '';
            const isLover = G.player.lovers.includes(npc.name);
            const avatarDisplay = npc.avatarUrl ? `<img src="${npc.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : (npc.avatarEmoji || '👤');
            
            html += `
            <div class="chat-item" data-id="${id}" style="display:flex;align-items:center;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;transition:background 0.2s;background:#fff;border:1px solid #f0f4f0;">
                <div style="width:44px;height:44px;border-radius:50%;background:#eaf2ea;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;margin-right:12px;overflow:hidden;">${avatarDisplay}</div>
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
        // 群聊列表
        const groupKeys = Object.keys(G.groups);
        if (!groupKeys.length) {
            html += `<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">暂无群聊，点击右上角 ➕ 创建专属粉丝群或主播群！</div>`;
        } else {
            for (const [gid, grp] of Object.entries(G.groups)) {
                const msgs = G.groupChatHistory[gid] || [];
                const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
                const purePreview = lastMsg ? `${lastMsg.senderName}: ${stripThought(lastMsg.text)}` : (grp.desc || '开启热烈讨论吧');
                const avatarDisplay = grp.avatarUrl ? `<img src="${grp.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : (grp.avatarEmoji || '👥');
                html += `
                <div class="group-item" data-gid="${gid}" style="display:flex;align-items:center;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:#fff;border:1px solid #f0f4f0;">
                    <div style="width:44px;height:44px;border-radius:50%;background:#e3ecf5;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;margin-right:12px;overflow:hidden;">${avatarDisplay}</div>
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

    // Tab 切换事件
    document.getElementById('tabDirectBtn').onclick = () => { G.chatActiveTab = 'direct'; renderSocialPanel(); };
    document.getElementById('tabGroupBtn').onclick = () => { G.chatActiveTab = 'group'; renderSocialPanel(); };

    // ➕ 创建联系人或群聊
    document.getElementById('addChatTargetBtn').onclick = () => openAddChatTargetModal();

    // 绑定单人点击与长按事件
    container.querySelectorAll('.chat-item').forEach(el => {
        const id = el.dataset.id;
        bindLongPressEvent(el, () => openEditNpcModal(id), () => openChat(id));
    });

    // 绑定群聊点击与长按事件
    container.querySelectorAll('.group-item').forEach(el => {
        const gid = el.dataset.gid;
        bindLongPressEvent(el, () => openGroupSettingsModal(gid), () => openGroupChat(gid));
    });
}

// 触摸/鼠标长按与点击通用绑定
function bindLongPressEvent(element, onLongPress, onClick) {
    let pressTimer = null;
    let isLong = false;
    const start = () => {
        isLong = false;
        pressTimer = setTimeout(() => {
            isLong = true;
            onLongPress();
        }, 600);
    };
    const cancel = () => { clearTimeout(pressTimer); };
    element.addEventListener('touchstart', start, { passive: true });
    element.addEventListener('touchend', () => {
        cancel();
        if (!isLong) onClick();
    });
    element.addEventListener('touchmove', cancel);
    element.addEventListener('mousedown', start);
    element.addEventListener('mouseup', () => {
        cancel();
        if (!isLong) onClick();
    });
}

// ============================================================
// 单人聊天窗口（支持右上角 ⚡ 触发，消息不自动回复）
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
                ${!isSelf ? `<div style="width:34px;height:34px;border-radius:50%;background:#eaf2ea;display:flex;align-items:center;justify-content:center;font-size:16px;margin-right:8px;flex-shrink:0;">${npc.avatarEmoji || '👤'}</div>` : ''}
                <div style="max-width:75%;">
                    <div style="background:${isSelf ? '#95ec69' : '#fff'};color:#111;padding:8px 12px;border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:0 1px 3px rgba(0,0,0,0.08);font-size:14px;line-height:1.5;word-break:break-word;">
                        ${isSelf ? escapeHtml(msg.text).replace(/\n/g, '<br>') : renderContentWithThoughts(msg.text)}
                    </div>
                    <div style="font-size:10px;color:#bbb;margin-top:2px;text-align:${isSelf ? 'right' : 'left'};">${msg.time || ''}</div>
                </div>
                ${isSelf ? `<div style="width:34px;height:34px;border-radius:50%;background:#dce8dc;display:flex;align-items:center;justify-content:center;font-size:16px;margin-left:8px;flex-shrink:0;">${G.player.avatarEmoji || '🧑'}</div>` : ''}
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
                    <div style="font-size:11px;color:#2e7d32;">● 在线</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button id="triggerAIReplyBtn" title="让AI根据上方消息生成回复" style="border:none;background:#ff4757;color:#fff;width:34px;height:34px;border-radius:8px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:14px;">
            ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">打个招呼吧！发消息不会立即触发AI，写完点击右上角 ⚡ 闪电即可触发回复。</div>'}
        </div>

        <div style="padding:8px 10px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:8px;align-items:center;">
            <button id="chatActionInsertBtn" title="插入动作或环境叙事" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
            <textarea id="singleChatInput" rows="1" placeholder="输入消息（可连续发送多条）..." style="flex:1;padding:8px 12px;border-radius:18px;border:1px solid #ddd;background:#f8faf8;font-size:14px;resize:none;outline:none;font-family:inherit;"></textarea>
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
        const now = new Date();
        pushChat(npcId, { from: 'player', text, time: now.toLocaleTimeString().slice(0, 5) });
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

    // ➕ 插入动作/环境描述
    document.getElementById('chatActionInsertBtn').onclick = () => {
        openModal(`
            <h3>📝 插入场景/动作描写</h3>
            <p style="font-size:12px;color:#666;">以第三人称或旁白视角描写此时的环境或动作（如：*端起茶杯喝了一口*）</p>
            <div class="form-group">
                <textarea id="actionNarrativeInput" rows="3" placeholder="例如：转过头看向窗外，若有所思地叹了口气..." style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;font-size:13px;"></textarea>
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

    // ⚡ 点击闪电触发 AI 回复
    document.getElementById('triggerAIReplyBtn').onclick = async () => {
        if (G.isGenerating) { showToast('⏳ AI 正在组织语言中...'); return; }
        showToast('⚡ 正在请求回复...', 'success', 1200);
        await triggerAIReplyForSingle(npcId);
        renderSingleChatWindow(container);
    };
}

// 触发单人 AI 回复调用
async function triggerAIReplyForSingle(npcId) {
    const npc = G.npcs[npcId];
    if (!npc) return;
    const history = G.chatHistory[npcId] || [];
    if (!history.length) { showToast('请先发送至少一条对话'); return; }

    const recent = history.slice(-10).map(m => {
        if (m.from === 'action') return `[旁白/动作描写: ${m.text}]`;
        return `${m.from === 'player' ? '玩家' : npc.name}: ${stripThought(m.text)}`;
    }).join('\n');

    const sysPrompt = `
    你正在扮演角色「${npc.name}」。
    人设与性格：${npc.persona || '一位性格鲜明的角色'}。
    当前与玩家的好感度：${npc.favor || 0}/100。
    【核心要求】
    1. 请仔细阅读玩家最近发送的消息或动作描写，自然、贴切地做出回应。
    2. 严禁复读玩家原句，使用口语化、接地气的手机聊天语气。
    3. 只输出你的发言正文，无需添加“${npc.name}:”前缀。
    最近聊天记录：
    ${recent}
    `;

    try {
        G.isGenerating = true;
        showLoading();
        const reply = await callAI([
            { role: 'system', content: sysPrompt },
            { role: 'user', content: '请对上方玩家的消息做出回复。' }
        ], { maxTokens: 800, temperature: 0.85 });
        hideLoading();
        pushChat(npcId, { from: 'npc', text: reply, time: new Date().toLocaleTimeString().slice(0, 5) });
        autoSaveGame();
    } catch (e) {
        hideLoading();
        showToast('❌ 生成回复失败，请检查网络或配置', 'error');
        console.error(e);
    } finally {
        G.isGenerating = false;
    }
}

// ============================================================
// 👥 群聊系统（支持统一合成 / 独立调用，多成员勾选）
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
                ${!isSelf ? `<div style="width:34px;height:34px;border-radius:50%;background:#e3ecf5;display:flex;align-items:center;justify-content:center;font-size:16px;margin-right:8px;flex-shrink:0;">${msg.senderAvatar || '👤'}</div>` : ''}
                <div style="max-width:75%;">
                    ${!isSelf ? `<div style="font-size:11px;color:#777;margin-bottom:2px;">${escapeHtml(msg.senderName)}</div>` : ''}
                    <div style="background:${isSelf ? '#95ec69' : '#fff'};color:#111;padding:8px 12px;border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:0 1px 3px rgba(0,0,0,0.08);font-size:14px;line-height:1.5;word-break:break-word;">
                        ${isSelf ? escapeHtml(msg.text).replace(/\n/g, '<br>') : renderContentWithThoughts(msg.text)}
                    </div>
                    <div style="font-size:10px;color:#bbb;margin-top:2px;text-align:${isSelf ? 'right' : 'left'};">${msg.time || ''}</div>
                </div>
                ${isSelf ? `<div style="width:34px;height:34px;border-radius:50%;background:#dce8dc;display:flex;align-items:center;justify-content:center;font-size:16px;margin-left:8px;flex-shrink:0;">${G.player.avatarEmoji || '🧑'}</div>` : ''}
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
                    <div style="font-size:11px;color:#888;">${grp.desc ? escapeHtml(grp.desc.slice(0, 18)) : '群聊交流中'}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button id="groupSettingsBtn" title="群管理与API设置" style="border:1px solid #ddd;background:#fff;color:#555;padding:4px 8px;border-radius:8px;font-size:12px;cursor:pointer;">⚙️ 管理</button>
                <button id="triggerGroupAIBtn" title="触发群成员回复" style="border:none;background:#ff4757;color:#fff;width:34px;height:34px;border-radius:8px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(255,71,87,0.35);">⚡</button>
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

    // ⚡ 触发群聊回复
    document.getElementById('triggerGroupAIBtn').onclick = async () => {
        if (G.isGenerating) { showToast('⏳ AI 正在组织群聊中...'); return; }
        showToast('⚡ 触发群聊讨论...', 'success', 1200);
        await triggerGroupAIReply(gid);
        renderGroupChatWindow(container);
    };
}

// 触发群聊 AI 回复（支持模式A：统一回复 / 模式B：独立调用）
async function triggerGroupAIReply(gid) {
    const grp = G.groups[gid];
    if (!grp) return;
    const history = G.groupChatHistory[gid] || [];
    if (!history.length) { showToast('请先在群里发一条消息'); return; }

    const activeList = grp.activeMembers && grp.activeMembers.length ? grp.activeMembers : grp.members;
    if (!activeList.length) { showToast('群内暂无可接话的成员'); return; }

    // 区分主播与普通群友
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

        // 如果设置了“主播每人独立使用一次 API”
        if (grp.streamerMode === 'separate' && activeStreamers.length) {
            // 随机挑 1~2 位活跃主播各自独立生成一条回复
            const picked = activeStreamers.sort(() => 0.5 - Math.random()).slice(0, rand(1, 2));
            for (const st of picked) {
                const sys = `你是主播「${st.name}」，人设：${st.persona}。你正在群聊「${grp.name}」中。根据上下文直接给出你在群里的一句简短回复，只输出对话正文。`;
                const rep = await callAI([{ role: 'system', content: sys }, { role: 'user', content: `最近聊天：\n${recent}` }], { maxTokens: 200, temperature: 0.9 });
                if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
                G.groupChatHistory[gid].push({
                    _id: 'gmsg_' + Date.now() + '_' + rand(100, 999),
                    from: 'npc',
                    senderName: st.name,
                    senderAvatar: st.avatarEmoji || '👤',
                    text: rep.trim(),
                    time: new Date().toLocaleTimeString().slice(0, 5)
                });
            }
        }

        // 统一模式（1次调用让 AI 扮演群成员，挑选 1~3 人接话）
        if (grp.streamerMode !== 'separate' || activeFans.length) {
            const memberPoolDesc = activeList.map(mid => {
                const n = G.npcs[mid];
                return n ? `【${n.name}】(${n.persona || '群成员'})` : null;
            }).filter(Boolean).join('、');

            const sys = `
            你正在模拟群聊「${grp.name}」（简介：${grp.desc || '自由讨论'}）。
            本群可参与发言的成员有：${memberPoolDesc}。
            请根据最近群聊，随机选择 1 到 3 位成员进行接话互动，输出格式必须严格如下（每行一条）：
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
        console.error(e);
    } finally {
        G.isGenerating = false;
    }
}

// ============================================================
// ✏️ 弹窗：新建联系人 / 群聊 / 编辑 / 勾选参与
// ============================================================
function openAddChatTargetModal() {
    openModal(`
        <h3>➕ 新建聊天</h3>
        <p style="font-size:12px;color:#666;">你可以添加自定义的粉丝/主播角色，或创建新的群聊。</p>
        <div class="btn-row" style="margin-top:14px;flex-direction:column;gap:8px;">
            <button class="btn-primary" id="btnNewCustomNPC" style="width:100%;">👤 新建自定义联系人 / 粉丝</button>
            <button class="btn-primary" id="btnNewGroup" style="width:100%;background:#3866c4;">👥 创建新群聊</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">取消</button>
        </div>
    `);
    document.getElementById('btnNewCustomNPC').onclick = () => { closeModal(); openEditNpcModal(null); };
    document.getElementById('btnNewGroup').onclick = () => { closeModal(); openEditGroupModal(null); };
}

// 编辑/新建角色
function openEditNpcModal(npcId) {
    const isNew = !npcId;
    const npc = !isNew ? G.npcs[npcId] : { name: '', avatarEmoji: '👤', persona: '', favor: 50, isCustom: true };
    openModal(`
        <h3>${isNew ? '👤 新建角色 / 粉丝' : `✏️ 编辑角色：${escapeHtml(npc.name)}`}</h3>
        <div class="form-group">
            <label>角色姓名</label>
            <input type="text" id="npcNameInput" value="${escapeHtml(npc.name)}" placeholder="如：热心粉丝小明 / 知名主播Alex">
        </div>
        <div class="form-group">
            <label>头像 Emoji / 图标</label>
            <input type="text" id="npcEmojiInput" value="${escapeHtml(npc.avatarEmoji || '👤')}" placeholder="输入单个 Emoji">
        </div>
        <div class="form-group">
            <label>角色人设与性格设定</label>
            <textarea id="npcPersonaInput" rows="3" placeholder="描述此人的性格、与你的关系、口头禅...">${escapeHtml(npc.persona || '')}</textarea>
        </div>
        <div class="btn-row" style="margin-top:12px;">
            ${!isNew && npc.isCustom ? `<button class="btn-secondary" id="delNpcBtn" style="color:#e53935;">🗑️ 删除角色</button>` : ''}
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="saveNpcBtn">💾 保存</button>
        </div>
    `);

    document.getElementById('saveNpcBtn').onclick = () => {
        const name = document.getElementById('npcNameInput').value.trim();
        const emoji = document.getElementById('npcEmojiInput').value.trim() || '👤';
        const persona = document.getElementById('npcPersonaInput').value.trim() || '普通朋友';
        if (!name) { showToast('⚠️ 角色姓名不能为空', 'error'); return; }

        const id = isNew ? ('custom_npc_' + Date.now()) : npcId;
        G.npcs[id] = {
            ...npc,
            id,
            name,
            avatarEmoji: emoji,
            persona,
            isCustom: true
        };
        showToast('✅ 角色已保存', 'success');
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

// 编辑/新建群聊
function openEditGroupModal(gid) {
    const isNew = !gid;
    const grp = !isNew ? G.groups[gid] : { name: '', avatarEmoji: '👥', desc: '', members: Object.keys(G.npcs).slice(0, 3) };
    openModal(`
        <h3>${isNew ? '👥 创建群聊' : '✏️ 编辑群资料'}</h3>
        <div class="form-group">
            <label>群聊名称</label>
            <input type="text" id="grpNameInput" value="${escapeHtml(grp.name)}" placeholder="如：主播联机交流群 / 铁粉聚集地">
        </div>
        <div class="form-group">
            <label>群图标 Emoji</label>
            <input type="text" id="grpEmojiInput" value="${escapeHtml(grp.avatarEmoji || '👥')}" placeholder="输入单个 Emoji">
        </div>
        <div class="form-group">
            <label>群聊简介 / 话题</label>
            <textarea id="grpDescInput" rows="2" placeholder="介绍群聊的日常基调或本次讨论的主题...">${escapeHtml(grp.desc || '')}</textarea>
        </div>
        <div class="btn-row" style="margin-top:12px;">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="saveGrpBtn">💾 保存群聊</button>
        </div>
    `);

    document.getElementById('saveGrpBtn').onclick = () => {
        const name = document.getElementById('grpNameInput').value.trim();
        const emoji = document.getElementById('grpEmojiInput').value.trim() || '👥';
        const desc = document.getElementById('grpDescInput').value.trim();
        if (!name) { showToast('⚠️ 群名称不能为空', 'error'); return; }

        const id = isNew ? ('grp_' + Date.now()) : gid;
        G.groups[id] = {
            ...grp,
            id,
            name,
            avatarEmoji: emoji,
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

// 群管理与接话勾选设置
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
                <span>${n.avatarEmoji || '👤'} ${escapeHtml(n.name)}</span>
            </label>
            <label style="font-size:11px;color:#666;display:flex;align-items:center;gap:4px;cursor:pointer;">
                <input type="checkbox" class="grp-active-check" data-id="${nid}" ${isActive && isMember ? 'checked' : ''} ${!isMember ? 'disabled' : ''} style="width:14px;height:14px;">
                本次接话
            </label>
        </div>`;
    });

    openModal(`
        <h3>⚙️ 群管理：${escapeHtml(grp.name)}</h3>
        <div style="font-size:13px;font-weight:700;margin:10px 0 6px;">🤖 AI 回复模式</div>
        <div style="background:#f9fbf9;padding:8px 12px;border-radius:8px;font-size:12px;line-height:1.6;margin-bottom:12px;">
            <label style="display:block;cursor:pointer;margin-bottom:6px;">
                <input type="radio" name="streamerMode" value="unified" ${grp.streamerMode !== 'separate' ? 'checked' : ''}>
                <b>模式 A（统一合成回复）</b>：只调用 1 次 API，由 AI 统筹挑选 1~3 位活跃成员发言（极省 Token）
            </label>
            <label style="display:block;cursor:pointer;">
                <input type="radio" name="streamerMode" value="separate" ${grp.streamerMode === 'separate' ? 'checked' : ''}>
                <b>模式 B（主播独立调用）</b>：每位被勾选的主播角色单独调 1 次 API，其余成员统一回复
            </label>
        </div>

        <div style="font-size:13px;font-weight:700;margin-bottom:6px;">👥 成员名单与本次接话勾选</div>
        <div style="max-height:220px;overflow-y:auto;border:1px solid #eee;border-radius:8px;padding:4px 10px;">
            ${memberCheckboxes}
        </div>

        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" id="delGroupBtn" style="color:#e53935;">🗑️ 解散群聊</button>
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="saveGroupSettingsBtn">💾 保存设置</button>
        </div>
    `);

    // 动态联动勾选
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