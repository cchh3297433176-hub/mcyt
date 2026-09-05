// js/04-game-core-2.js
// 成就系统、商店、数据面板、手机社交(含聊天加号合作联动)与复刻级记忆总结系统
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
    
    // 统一记忆联动：记录重大成就事件
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
    const container = (dom && dom.dataTab) || document.getElementById('dataTab');
    if (!container) return;
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
// 🧠 记忆系统核心配置与独立便宜总结模型调度
// ============================================================
if (!G.memoryConfig) {
    G.memoryConfig = {
        enabled: true,              // 是否开启后台自动总结
        defaultThreshold: 10,       // 默认触发总结轮数
        defaultKeepRecent: 5,       // 总结后保留最近多少轮对话
        selectedModelKey: ''        // 选中的专门总结模型
    };
}
if (!G.memorySummaries) G.memorySummaries = [];
if (!G.groupMemories) G.groupMemories = {};

// 获取全部可用模型列表供用户选择（包含低成本模型档案）
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

// 调度记忆总结的专属模型，节省主模型额度
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
// 📱 手机社交中心
// ============================================================
if (!G.phoneNav) G.phoneNav = 'chats';
if (!G.chatActiveTab) G.chatActiveTab = 'direct';
if (!G.groups) G.groups = {};
if (!G.groupChatHistory) G.groupChatHistory = {};
if (!G.friendRequests) G.friendRequests = [];
if (!G.momentsFilterNpcId) G.momentsFilterNpcId = null;

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

    const html = `
    <div class="phone-app-wrap" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);height:82vh;max-height:850px;display:flex;flex-direction:column;">
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
    const pendingCount = (G.friendRequests || []).length;
    let itemsHtml = '';

    if (isDirect) {
        for (const [id, npc] of Object.entries(G.npcs)) {
            const chatHist = G.chatHistory[id] || [];
            const lastMsg = chatHist.length > 0 ? chatHist[chatHist.length - 1] : null;
            const purePreview = lastMsg ? stripThought(lastMsg.text) : (npc.memorySummary ? `[记忆: ${stripThought(npc.memorySummary).slice(0, 15)}...]` : '暂无新消息');
            const time = lastMsg ? (lastMsg.time || '') : '';
            const isLover = G.player.lovers.includes(npc.name);
            
            itemsHtml += `
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
            itemsHtml += `<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">暂无群聊，点击右上角 ➕ 创建专属粉丝群或主播交流群！</div>`;
        } else {
            for (const [gid, grp] of Object.entries(G.groups)) {
                const msgs = G.groupChatHistory[gid] || [];
                const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
                const purePreview = lastMsg ? `${lastMsg.senderName}: ${stripThought(lastMsg.text)}` : (grp.desc || '开启热烈讨论吧');
                itemsHtml += `
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

    return `
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
        💡 提示：长按联系人或群聊可编辑人设、头像与独立记忆设置
    </div>
    <div class="chat-list" style="flex:1;overflow-y:auto;padding:8px;">
        ${itemsHtml}
    </div>`;
}

function bindChatListEvents(container) {
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
        listHtml = `<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">暂无动态，多和好友主播交流吧！</div>`;
    } else {
        for (const item of feedItems) {
            const isLiked = item.liked ? '❤️ 已赞' : '🤍 赞';
            const isSelfPost = item.author === G.player.ytName;
            const displayAvatar = isSelfPost && G.player.avatar ? `<img src="${G.player.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">` : (item.avatar || '👤');

            listHtml += `
            <div style="padding:12px;background:#fff;border-radius:10px;margin-bottom:8px;border:1px solid #f0f4f0;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                    <div style="font-size:20px;display:flex;align-items:center;">${displayAvatar}</div>
                    <div style="flex:1;">
                        <div style="font-weight:700;font-size:13px;color:var(--text);">${escapeHtml(item.author)}</div>
                        <div style="font-size:10px;color:#bbb;">${item.time || ''}</div>
                    </div>
                </div>
                <div style="font-size:13px;color:#333;line-height:1.6;margin-bottom:8px;">${escapeHtml(item.body)}</div>
                <div style="display:flex;gap:12px;font-size:12px;border-top:1px solid #f7f9f7;padding-top:6px;">
                    <button class="moment-like-btn" data-id="${item.id}" style="border:none;background:none;cursor:pointer;color:#e53935;font-size:12px;">${isLiked} (${item.likes||0})</button>
                </div>
            </div>`;
        }
    }

    return `
    <div style="padding:12px 16px;background:#f8fbf8;border-bottom:1px solid #eef3ee;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:700;font-size:15px;">${filterTitle}</span>
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
        const msgObj = { from: 'action', text: `* ${act} *`, time: new Date().toLocaleTimeString().slice(0, 5) };
        if (targetType === 'single') {
            pushChat(targetId, msgObj);
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

// 🎬 拍共创视频模态框：支持输入灵感一键AI扩写
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

    const partnerCheckboxes = participants.map((p, i) => `
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

        // 同步推送一条到油管外部推荐池，让玩家在油管流里能刷到
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

        // 增加好感度与属性
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
    };
}

// 🔴 邀请联动直播处理
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

    // 存储联动标记，进入直播面板后结算获得额外加成
    G.pendingCollabPartners = partnerNames;
    showToast(`📺 已向 ${partnerNames.join('、')} 发出连麦邀请！切换至直播面板开启直播`, 'success', 2500);
    switchTab('stream');
}

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
                ${!isSelf ? `<div class="chat-npc-avatar-btn" style="margin-right:8px;flex-shrink:0;cursor:pointer;" title="点击查看名片与动态">${renderAvatarBadge(npc, 34)}</div>` : ''}
                <div style="max-width:75%;">
                    <div style="background:${isSelf ? '#95ec69' : '#fff'};color:#111;padding:8px 12px;border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:0 1px 3px rgba(0,0,0,0.08);font-size:14px;line-height:1.5;word-break:break-word;">
                        ${isSelf ? escapeHtml(msg.text).replace(/\n/g, '<br>') : renderContentWithThoughts(msg.text)}
                    </div>
                    <div style="font-size:10px;color:#bbb;margin-top:2px;text-align:${isSelf ? 'right' : 'left'};">${msg.time || ''}</div>
                </div>
                ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 34)}</div>` : ''}
            </div>`;
        }
    }

    const html = `
    <div style="background:#f2f4f2;border-radius:14px;display:flex;flex-direction:column;height:82vh;max-height:850px;box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden;">
        <div style="padding:10px 14px;background:#fff;border-bottom:1px solid #e5ebe5;display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
                <button onclick="closeChat()" style="border:none;background:none;font-size:20px;color:#333;cursor:pointer;padding:0 4px;">❮</button>
                <div id="singleChatHeaderProfileBtn" style="cursor:pointer;" title="点击查看TA的名片">
                    <div style="font-weight:700;font-size:15px;">${escapeHtml(npc.name)}</div>
                    <div style="font-size:11px;color:#2e7d32;">● 在线 ${npc.memorySummary ? '· 🧠专属记忆' : ''}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button id="triggerAIReplyBtn" title="让AI生成回复" style="border:none;background:#ff4757;color:#fff;width:34px;height:34px;border-radius:8px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:14px;">
            ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">发消息不消耗点数，点击 ➕ 可发起拍视频共创或联动直播！</div>'}
        </div>

        <div style="padding:8px 10px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:8px;align-items:center;">
            <button id="chatActionInsertBtn" title="合作/拍视频/旁白" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
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

    const showCard = () => openNpcProfileCardModal(npcId);
    document.getElementById('singleChatHeaderProfileBtn')?.addEventListener('click', showCard);
    container.querySelectorAll('.chat-npc-avatar-btn').forEach(btn => btn.onclick = showCard);

    // 点击 ➕ 弹出合作菜单
    document.getElementById('chatActionInsertBtn').onclick = () => {
        openChatActionMenuModal('single', npcId);
    };

    document.getElementById('triggerAIReplyBtn').onclick = async () => {
        if (G.isGenerating) { showToast('⏳ AI 正在组织语言中...'); return; }
        showToast('⚡ 正在请求回复...', 'success', 1200);
        await triggerAIReplyForSingle(npcId);
        renderSingleChatWindow(container);
    };
}

function openNpcProfileCardModal(npcId) {
    const npc = G.npcs[npcId];
    if (!npc) return;
    openModal(`
        <div style="text-align:center;padding:10px 0;">
            <div style="display:flex;justify-content:center;margin-bottom:8px;">
                ${renderAvatarBadge(npc, 64)}
            </div>
            <div style="font-weight:700;font-size:17px;color:var(--text);">${escapeHtml(npc.name)}</div>
            <div style="font-size:12px;color:#888;margin-top:2px;">好感度：<b>${npc.favor||0}</b> / 100</div>
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
    const history = G.chatHistory[npcId] || [];
    const threshold = npc.summaryThreshold || memCfg.defaultThreshold || 10;
    const keepRecent = npc.keepRecent || memCfg.defaultKeepRecent || 5;

    if (history.length >= threshold && !npc._summarizing) {
        npc._summarizing = true;
        try {
            const toSummarize = history.slice(0, Math.max(1, history.length - keepRecent));
            const textToSummarize = toSummarize.map(m => `${m.from === 'player' ? '主角' : npc.name}: ${stripThought(m.text)}`).join('\n');
            const prior = npc.memorySummary ? `【此前已有记忆】：\n${npc.memorySummary}\n\n` : '';
            const sys = `你是精炼的角色长期记忆整理助手。请将主角与「${npc.name}」的最新私聊对话与此前记忆进行提炼合并，输出一段不超过180字的精炼记忆摘要。保留两人的关系变化、关键话题、约定承诺与喜好细节。直接输出摘要正文，严禁废话。`;

            const summary = await callMemoryAI([
                { role: 'system', content: sys },
                { role: 'user', content: `${prior}【需归纳的新对话】：\n${textToSummarize}` }
            ], { maxTokens: 400, temperature: 0.35 });

            npc.memorySummary = stripThought(summary.trim());
            G.chatHistory[npcId] = history.slice(Math.max(0, history.length - keepRecent));
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

async function triggerAIReplyForSingle(npcId) {
    const npc = G.npcs[npcId];
    if (!npc) return;
    const history = G.chatHistory[npcId] || [];
    if (!history.length) { showToast('请先发送至少一条对话'); return; }

    const recent = history.slice(-10).map(m => {
        if (m.from === 'action') return `[旁白: ${m.text}]`;
        return `${m.from === 'player' ? '玩家' : npc.name}: ${stripThought(m.text)}`;
    }).join('\n');

    let npcMemoryContext = '';
    if (npc.memorySummary) npcMemoryContext += `【与玩家的私聊记忆】\n${npc.memorySummary}\n`;
    if (npc.knownGroupEvents) npcMemoryContext += `【TA在群聊里获知的事】\n${npc.knownGroupEvents}\n`;

    const sysPrompt = `
    你正在扮演角色「${npc.name}」。
    设定：${npc.persona || '普通朋友'}。
    好感度：${npc.favor || 0}/100。
    ${npcMemoryContext}
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
                ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 34)}</div>` : ''}
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
                <button id="triggerGroupAIBtn" title="触发群成员回复" style="border:none;background:#ff4757;color:#fff;width:34px;height:34px;border-radius:8px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        <div id="groupMessageArea" style="flex:1;overflow-y:auto;padding:14px;">
            ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">群里静悄悄的，点击 ➕ 可发起群成员拍视频或多人开播！</div>'}
        </div>

        <div style="padding:8px 10px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:8px;align-items:center;">
            <button id="groupActionInsertBtn" title="群合作/共创视频/旁白" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
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

    // 群聊点击 ➕ 呼出群合作菜单
    document.getElementById('groupActionInsertBtn').onclick = () => {
        openChatActionMenuModal('group', gid);
    };

    document.getElementById('groupSettingsBtn').onclick = () => openGroupSettingsModal(gid);
    document.getElementById('triggerGroupAIBtn').onclick = async () => {
        if (G.isGenerating) { showToast('⏳ AI 正在组织群聊中...'); return; }
        showToast('⚡ 触发群聊讨论...', 'success', 1200);
        await triggerGroupAIReply(gid);
        renderGroupChatWindow(container);
    };
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
            const textToSummarize = toSummarize.map(m => `${m.senderName}: ${stripThought(m.text)}`).join('\n');
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

            G.groupChatHistory[gid] = history.slice(Math.max(0, history.length - keepRecent));
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

    const recent = history.slice(-10).map(m => `${m.senderName}: ${stripThought(m.text)}`).join('\n');

    try {
        G.isGenerating = true;
        showLoading();

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

        hideLoading();
        if (generatedCount > 0) {
            showToast(`⚡ 群内收到 ${generatedCount} 条新回复！`, 'success', 1500);
            await checkGroupMemorySummarize(gid);
            autoSaveGame();
        } else {
            showToast('⚠️ 本轮成员都在潜水，再试一次吧', 'info', 2000);
        }
    } catch (e) {
        hideLoading();
        console.error('群聊生成失败', e);
        showToast('❌ 群聊生成失败，请检查网络设置', 'error');
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
                        <div style="font-weight:700;font-size:13px;">${escapeHtml(r.name)} <span style="font-size:10px;color:#999;">(${escapeHtml(r.fromReason||'申请')})</span></div>
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

function receiveFriendRequest(req) {
    if (!G.friendRequests) G.friendRequests = [];
    const entry = {
        _id: 'freq_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: req.name,
        fromReason: req.fromReason || '',
        persona: req.persona || '',
        avatarEmoji: req.avatarEmoji || '👤',
        avatarUrl: req.avatarUrl || null,
        day: req.day || G.day,
    };
    G.friendRequests.push(entry);
    showToast(`📬 收到来自 ${entry.name} 的好友申请！`, 'success', 2500);
}

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
            summaryThreshold: 10,
            keepRecent: 5
        };
        showToast(`🎉 已同意 ${req.name} 的好友申请！`, 'success', 2500);
        appendStory(`🤝 你通过了「${req.name}」的好友申请，已添加到联系人列表中。`, '🤝 新增好友');
        addGlobalMemoryRecord(`【结识好友】：添加了新好友「${req.name}」（${req.fromReason || '社交申请'}）。`);
    } else {
        showToast(`已婉拒 ${req.name} 的好友申请`, 'info', 1500);
    }
    autoSaveGame();
    closeModal();
    renderSocialPanel();
}
window.handleFriendRequestAction = handleFriendRequestAction;

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
            delete G.chatHistory[npcId];
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
    const allNpcIds = Object.keys(G.npcs);

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

function openChat(npcId) { G.currentChatNpc = npcId; renderSocialPanel(); }
function closeChat() { G.currentChatNpc = null; renderSocialPanel(); }

// ============================================================
// 🧠 经典复刻级记忆总结模态框（结合截图 UI 与多层级支持）
// ============================================================
let activeMemoryScope = 'story'; // 'story' | 'character' | 'group'
let selectedScopeTargetId = null;

function openMemoryModal() {
    renderMemoryModalView();
}
window.openMemoryModal = openMemoryModal;

function renderMemoryModalView() {
    const memCfg = G.memoryConfig || {
        enabled: true,
        defaultThreshold: 10,
        defaultKeepRecent: 5,
        selectedModelKey: ''
    };
    G.memoryConfig = memCfg;

    // 统计当前选定范围的未归档轮数
    let unarchivedCount = 0;
    let existingSummaries = [];

    if (activeMemoryScope === 'story') {
        unarchivedCount = (G.storyHistory || []).length;
        existingSummaries = G.memorySummaries || [];
    } else if (activeMemoryScope === 'character') {
        const npcId = selectedScopeTargetId || Object.keys(G.npcs)[0];
        selectedScopeTargetId = npcId;
        unarchivedCount = (G.chatHistory[npcId] || []).length;
        existingSummaries = G.npcs[npcId]?.memorySummary ? [{ text: G.npcs[npcId].memorySummary, day: G.day }] : [];
    } else if (activeMemoryScope === 'group') {
        const gid = selectedScopeTargetId || Object.keys(G.groups)[0];
        selectedScopeTargetId = gid;
        unarchivedCount = (G.groupChatHistory[gid] || []).length;
        existingSummaries = G.groupMemories[gid] ? [{ text: G.groupMemories[gid], day: G.day }] : [];
    }

    // 动态生成模型下拉列表（含便宜模型档案）
    const modelOptions = getAvailableMemoryModels().map(m => `
        <option value="${m.key}" ${m.key === memCfg.selectedModelKey ? 'selected' : ''}>${escapeHtml(m.name)}</option>
    `).join('');

    // 已有记忆总结列表
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

    // 范围选择选择器
    let scopeSelectorHtml = `
    <div style="display:flex;gap:6px;margin-bottom:12px;background:#f0f4f0;padding:4px;border-radius:10px;">
        <button onclick="switchMemoryScope('story')" style="flex:1;border:none;padding:5px 0;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;background:${activeMemoryScope==='story'?'#fff':'transparent'};color:${activeMemoryScope==='story'?'var(--primary)':'#666'};">📖 主线剧情</button>
        <button onclick="switchMemoryScope('character')" style="flex:1;border:none;padding:5px 0;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;background:${activeMemoryScope==='character'?'#fff':'transparent'};color:${activeMemoryScope==='character'?'var(--primary)':'#666'};">👤 角色私聊</button>
        <button onclick="switchMemoryScope('group')" style="flex:1;border:none;padding:5px 0;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;background:${activeMemoryScope==='group'?'#fff':'transparent'};color:${activeMemoryScope==='group'?'var(--primary)':'#666'};">👥 群聊公共</button>
    </div>
    `;

    if (activeMemoryScope === 'character') {
        const npcOpts = Object.values(G.npcs).map(n => `
            <option value="${n.id}" ${n.id === selectedScopeTargetId ? 'selected' : ''}>${escapeHtml(n.name)}</option>
        `).join('');
        scopeSelectorHtml += `
        <div style="margin-bottom:10px;display:flex;align-items:center;gap:8px;font-size:12px;">
            <span>选择角色：</span>
            <select id="scopeTargetSelect" style="flex:1;padding:4px 8px;border-radius:6px;border:1px solid #ccc;font-size:12px;">${npcOpts}</select>
        </div>`;
    } else if (activeMemoryScope === 'group') {
        const grpOpts = Object.values(G.groups).map(g => `
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

    // 绑定下拉切换角色或群聊
    const stSelect = document.getElementById('scopeTargetSelect');
    if (stSelect) {
        stSelect.onchange = () => {
            selectedScopeTargetId = stSelect.value;
            renderMemoryModalView();
        };
    }

    // AI 生成总结
    document.getElementById('btnRunAiSummary').onclick = async () => {
        await executeManualAiSummary();
    };

    // 改为手动填写总结
    document.getElementById('btnManualWriteSummary').onclick = () => {
        openManualMemoryInputModal();
    };

    // 配置实时同步
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

// 执行手动触发 AI 总结
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
        const list = G.chatHistory[selectedScopeTargetId] || [];
        if (list.length <= keepRecent) {
            showToast(`当前私聊记录数 (${list.length}) 小于等于保留轮数，无需总结`, 'info', 2000);
            return;
        }
        const sliceItems = list.slice(0, list.length - keepRecent);
        textToSummarize = sliceItems.map(m => `${m.from === 'player' ? '主角' : npc.name}: ${stripThought(m.text)}`).join('\n');
        prior = npc.memorySummary || '';
    } else if (activeMemoryScope === 'group') {
        const grp = G.groups[selectedScopeTargetId];
        const list = G.groupChatHistory[selectedScopeTargetId] || [];
        if (list.length <= keepRecent) {
            showToast(`当前群聊记录数 (${list.length}) 小于等于保留轮数，无需总结`, 'info', 2000);
            return;
        }
        const sliceItems = list.slice(0, list.length - keepRecent);
        textToSummarize = sliceItems.map(m => `${m.senderName}: ${stripThought(m.text)}`).join('\n');
        prior = G.groupMemories[selectedScopeTargetId] || '';
    }

    closeModal();
    showLoading();
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
            G.chatHistory[selectedScopeTargetId] = (G.chatHistory[selectedScopeTargetId] || []).slice(G.chatHistory[selectedScopeTargetId].length - keepRecent);
        } else if (activeMemoryScope === 'group') {
            G.groupMemories[selectedScopeTargetId] = cleanSummary;
            const grp = G.groups[selectedScopeTargetId];
            (grp.members || []).forEach(mid => {
                if (G.npcs[mid]) G.npcs[mid].knownGroupEvents = `【在群「${grp.name}」获悉】：${cleanSummary}`;
            });
            G.groupChatHistory[selectedScopeTargetId] = (G.groupChatHistory[selectedScopeTargetId] || []).slice(G.groupChatHistory[selectedScopeTargetId].length - keepRecent);
        }

        hideLoading();
        showToast('🎉 AI 记忆总结生成完毕！已成功归档。', 'success', 2500);
        autoSaveGame();
        openMemoryModal();
    } catch(e) {
        hideLoading();
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