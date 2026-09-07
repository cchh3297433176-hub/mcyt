// js/04-game-core-2.js
// 成就系统、商店、数据面板、主页Dashboard、多层记忆中枢、手机社交(私聊、群聊、朋友圈Moments、好友/群邀请处理、表情包系统)
// ============================================================

// 🐷 内置默认表情包源数据
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
    if (!window.G.stickerLibrary || !Array.isArray(window.G.stickerLibrary) || window.G.stickerLibrary.length === 0) {
        window.G.stickerLibrary = [...DEFAULT_PIG_STICKERS];
    } else {
        const hasPig = window.G.stickerLibrary.some(s => s && s.category === '猪猪');
        if (!hasPig) window.G.stickerLibrary.unshift(...DEFAULT_PIG_STICKERS);
    }
}
ensureStickersLoaded();

// ============================================================
// 成就系统
// ============================================================
function checkAchievements() {
    if (!G.unlockedAchievements) G.unlockedAchievements = [];
    if (typeof ACHIEVEMENTS === 'undefined') return;
    for (const ach of ACHIEVEMENTS) {
        if (G.unlockedAchievements.includes(ach.id)) continue;
        if (typeof ach.check === 'function' && ach.check()) unlockAchievement(ach);
    }
}

function unlockAchievement(ach) {
    G.unlockedAchievements.push(ach.id);
    G.player.money = (G.player.money || 0) + (ach.reward || 0);
    const toast = document.getElementById('achievementToast');
    if (toast) {
        toast.innerHTML = `<span class="ach-icon">${ach.icon || '🏆'}</span> 解锁成就：${ach.name}！获得 ${ach.reward} 金币！`;
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
    const achList = (typeof ACHIEVEMENTS !== 'undefined') ? ACHIEVEMENTS : [];
    let html = `
    <div style="font-weight:700;font-size:17px;margin-bottom:10px;">🏆 成就 (${G.unlockedAchievements ? G.unlockedAchievements.length : 0}/${achList.length})</div>
    <div style="font-size:13px;color:var(--text2);margin-bottom:12px;">完成成就获得金币奖励！</div>
    <div class="achievement-grid">
    `;
    const categories = { fans: '👥 粉丝里程碑', video: '🎬 视频创作', stream: '📺 直播成就', social: '💕 社交成就' };
    for (const [catKey, catLabel] of Object.entries(categories)) {
        const items = achList.filter(a => a.category === catKey);
        if (items.length === 0) continue;
        html += `<div style="grid-column:1/-1;font-weight:700;font-size:15px;color:var(--text);margin-top:6px;">${catLabel}</div>`;
        for (const ach of items) {
            const unlocked = G.unlockedAchievements && G.unlockedAchievements.includes(ach.id);
            html += `
            <div class="achievement-card ${unlocked ? '' : 'locked'}">
                <div class="ach-icon">${ach.icon || '🏆'}</div>
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
    if ((G.player.followers || 0) < 10000) return;
    if (G.sponsorCooldown > 0) { G.sponsorCooldown--; return; }
    if (G.sponsorOffers && G.sponsorOffers.length > 0) return;
    if (typeof SPONSOR_TYPES === 'undefined') return;
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
        { id: 'hot1', label: '🔥 热度小包', desc: '一次性增加 5,000 粉丝', cost: 1000, effect: () => { G.player.followers = (G.player.followers || 0) + 5000; checkSocialRequestsTrigger(); } },
        { id: 'hot2', label: '🔥 热度中包', desc: '一次性增加 20,000 粉丝', cost: 3500, effect: () => { G.player.followers = (G.player.followers || 0) + 20000; checkSocialRequestsTrigger(); } },
        { id: 'hot3', label: '🔥 热度大包', desc: '一次性增加 50,000 粉丝', cost: 8000, effect: () => { G.player.followers = (G.player.followers || 0) + 50000; checkSocialRequestsTrigger(); } },
    ];
    let html = `
    <h3>🛒 商店</h3>
    <div style="margin-bottom:12px;"><div style="font-weight:600;font-size:16px;">💰 当前金币：${p.money || 0}</div></div>
    <div style="font-weight:600;font-size:15px;margin-bottom:6px;">📦 热度道具</div>
    <div class="shop-grid">
    `;
    for (const item of items) {
        const canBuy = (p.money || 0) >= item.cost;
        html += `
        <div class="shop-item">
            <div class="info"><div class="name">${item.label}</div><div class="desc">${item.desc}</div></div>
            <div style="display:flex;align-items:center;gap:6px;"><span class="price">💰 ${item.cost}</span><button class="buy-btn" onclick="window.buyShopItem('${item.id}')" ${canBuy ? '' : 'disabled'}>购买</button></div>
        </div>`;
    }
    html += `</div>
    <div style="font-weight:600;font-size:15px;margin:14px 0 6px;">🎥 直播设备 (等级 ${equipLevel}/${equipMax})</div>
    <div style="background:var(--card);border-radius:var(--radius);padding:12px;box-shadow:var(--shadow);">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
            <span>当前等级系数：<strong>${equipMultipliers[equipLevel].toFixed(1)}x</strong></span>
            <span>下一级：<strong>${equipMultipliers[equipLevel+1] ? equipMultipliers[equipLevel+1].toFixed(1)+'x' : '已满级'}</strong></span>
            ${equipLevel < equipMax ? `<button class="buy-btn" onclick="window.upgradeEquip()" ${(p.money || 0) >= equipCosts[equipLevel] ? '' : 'disabled'}>升级 (💰 ${equipCosts[equipLevel]})</button>` : '<span>已满级</span>'}
        </div>
    </div>
    <div style="font-weight:600;font-size:15px;margin:14px 0 6px;">📢 合作邀约</div>`;
    
    if ((G.player.followers || 0) < 10000) {
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
}

window.buyShopItem = function(id) {
    const items = [
        { id: 'hot1', label: '🔥 热度小包', cost: 1000, effect: () => { G.player.followers = (G.player.followers || 0) + 5000; checkSocialRequestsTrigger(); } },
        { id: 'hot2', label: '🔥 热度中包', cost: 3500, effect: () => { G.player.followers = (G.player.followers || 0) + 20000; checkSocialRequestsTrigger(); } },
        { id: 'hot3', label: '🔥 热度大包', cost: 8000, effect: () => { G.player.followers = (G.player.followers || 0) + 50000; checkSocialRequestsTrigger(); } },
    ];
    const item = items.find(i => i.id === id);
    if (!item || (G.player.money || 0) < item.cost) { showToast('金币不足', 'error'); return; }
    G.player.money -= item.cost;
    item.effect();
    updateUI(); renderShop(); showToast('✅ 购买成功！', 'success');
    addMemoir('商店购买', `购买了 ${item.label}`); autoSaveGame();
};

window.upgradeEquip = function() {
    const equipCosts = [0, 500, 1500, 4000, 8000, 15000];
    const level = G.player.equipmentLevel || 1;
    if (level >= 5) { showToast('已满级', 'error'); return; }
    const cost = equipCosts[level];
    if ((G.player.money || 0) < cost) { showToast('金币不足', 'error'); return; }
    G.player.money -= cost;
    G.player.equipmentLevel = level + 1;
    updateUI(); renderShop(); showToast(`🎥 设备升级至 ${G.player.equipmentLevel} 级！`, 'success');
    addMemoir('设备升级', `直播设备升级至 ${G.player.equipmentLevel} 级`); autoSaveGame();
};

window.acceptSponsor = acceptSponsor;

// ============================================================
// 主页看板 (Dashboard) 与视频收藏评论系统
// ============================================================
if (!G.collections) G.collections = { videos: [], moments: [] };

function renderDashboard() {
    const container = (dom && dom.dashboardTab) || document.getElementById('dashboardTab');
    if (!container) return;
    ensureNpcIntegrity();
    const p = G.player || {};
    const videos = p.videos || [];
    const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalLikes = (p.likes || 0);
    const equipMultipliers = [1.0, 1.2, 1.5, 2.0, 2.8, 4.0];
    const equipLevel = p.equipmentLevel || 1;

    let videosHtml = '';
    if (videos.length === 0) {
        videosHtml = `
        <div style="text-align:center;padding:26px 12px;background:#f9fbf9;border-radius:12px;color:#888;font-size:13px;border:1px dashed #d0e0d0;">
            🎬 暂未发布任何视频，前往左侧行动栏点击<b>「录制视频」</b>开启创作吧！
        </div>`;
    } else {
        [...videos].reverse().forEach((v, revIdx) => {
            const realIdx = videos.length - 1 - revIdx;
            const isCol = G.collections.videos && G.collections.videos.includes(realIdx);
            const showCom = !!v._showComments;
            const comList = v.comments || [];

            let commentsHtml = '';
            if (showCom) {
                let itemsStr = '';
                if (comList.length === 0) {
                    itemsStr = '<div style="font-size:12px;color:#999;padding:6px 0;">暂无观众留言。</div>';
                } else {
                    comList.forEach((c, cIdx) => {
                        const repliesStr = (c.replies && c.replies.length) ? c.replies.map(r => `
                            <div style="margin-top:3px;padding:3px 6px;background:#f0f5f0;border-radius:4px;font-size:11.5px;">
                                <b>${escapeHtml(r.author || '你')}:</b> ${escapeHtml(r.text)}
                            </div>
                        `).join('') : '';

                        itemsStr += `
                        <div style="border-bottom:1px solid #eee;padding:6px 0;">
                            <div style="display:flex;justify-content:space-between;font-size:12px;">
                                <span style="font-weight:700;color:#333;">${escapeHtml(c.user || '粉丝')}</span>
                                <span style="font-size:10px;color:#bbb;">${c.time || '刚刚'}</span>
                            </div>
                            <div style="font-size:12px;color:#444;margin:2px 0;">${escapeHtml(c.text)}</div>
                            ${repliesStr}
                            <div style="margin-top:4px;">
                                <button onclick="window.sendReply(${realIdx}, ${cIdx})" style="border:none;background:none;color:var(--primary);font-size:11px;cursor:pointer;padding:0;">💬 回复</button>
                            </div>
                        </div>`;
                    });
                }

                commentsHtml = `
                <div style="margin-top:10px;background:#fafcfa;border-radius:8px;padding:10px;border:1px solid #e2ece2;">
                    <div style="font-weight:700;font-size:12.5px;margin-bottom:6px;display:flex;justify-content:space-between;">
                        <span>💬 观众评论区 (${comList.length})</span>
                    </div>
                    ${itemsStr}
                </div>`;
            }

            videosHtml += `
            <div style="background:#fff;border-radius:12px;padding:12px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.04);border:1px solid #edf2ed;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                    <div>
                        <div style="font-weight:700;font-size:14.5px;color:var(--text);">${escapeHtml(v.title)}</div>
                        <div style="font-size:12px;color:#666;margin:4px 0 6px;">${escapeHtml(v.desc || '精彩MC游玩内容剪辑')}</div>
                    </div>
                    <button onclick="window.toggleCollection('video', ${realIdx})" style="border:none;background:none;font-size:16px;cursor:pointer;" title="${isCol ? '已收藏' : '收藏'}">${isCol ? '⭐' : '☆'}</button>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#888;flex-wrap:wrap;gap:6px;padding-top:4px;border-top:1px dashed #f0f0f0;">
                    <span>👀 ${v.views || 0} 播放 · 👍 ${v.likes || 0} 点赞 · 📅 第${v.day || 1}天</span>
                    <button onclick="window.toggleColVideoComments(${realIdx})" style="border:1px solid #d2e4d2;background:#f8fbf8;color:var(--primary);padding:3px 9px;border-radius:12px;font-size:11.5px;cursor:pointer;">
                        ${showCom ? '收起评论 ▴' : `评论(${comList.length}) ▾`}
                    </button>
                </div>
                ${commentsHtml}
            </div>`;
        });
    }

    const html = `
    <div style="display:flex;flex-direction:column;gap:12px;">
        <!-- 频道数据顶部卡片 -->
        <div style="background:linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%);border-radius:14px;padding:14px;box-shadow:var(--shadow);border:1px solid #d8ebd8;">
            <div style="display:flex;align-items:center;gap:12px;">
                <div style="flex-shrink:0;">${renderAvatarBadge({ isPlayer: true }, 52)}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:16px;color:var(--text);display:flex;align-items:center;gap:6px;">
                        <span>${escapeHtml(p.ytName || 'MC创作者')}</span>
                        <span style="font-size:11px;background:#e8f5e9;color:#2e7d32;padding:1px 6px;border-radius:6px;font-weight:normal;">Lv.${equipLevel} 设备</span>
                    </div>
                    <div style="font-size:12px;color:#666;margin-top:3px;">
                        📅 第 <b>${G.day || 1}</b> 天【${getTimeSlotName(G.timeSlot)}】 · ⚡ 行动点 <b>${G.actionPoints !== undefined ? G.actionPoints : 6}/6</b>
                    </div>
                </div>
            </div>
            <div class="data-grid" style="margin-top:12px;">
                <div class="ditem"><div class="val">${p.followers || 0}</div><div class="lbl">❤️ 粉丝订阅</div></div>
                <div class="ditem"><div class="val">💰 ${p.money || 0}</div><div class="lbl">可用金币</div></div>
                <div class="ditem"><div class="val">${totalViews}</div><div class="lbl">👀 总播放量</div></div>
                <div class="ditem"><div class="val">${totalLikes}</div><div class="lbl">👍 频道点赞</div></div>
            </div>
        </div>

        <!-- 快捷操作直通车 -->
        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
            <button onclick="window.switchTab('story')" style="border:none;background:#fff;border-radius:10px;padding:10px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.04);cursor:pointer;border:1px solid #edf2ed;">
                <div style="font-size:20px;margin-bottom:3px;">📖</div>
                <div style="font-size:12px;font-weight:700;color:#333;">主线剧情</div>
            </button>
            <button onclick="window.switchTab('stream')" style="border:none;background:#fff;border-radius:10px;padding:10px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.04);cursor:pointer;border:1px solid #edf2ed;">
                <div style="font-size:20px;margin-bottom:3px;">🔴</div>
                <div style="font-size:12px;font-weight:700;color:#333;">联机开播</div>
            </button>
            <button onclick="window.switchTab('social')" style="border:none;background:#fff;border-radius:10px;padding:10px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.04);cursor:pointer;border:1px solid #edf2ed;">
                <div style="font-size:20px;margin-bottom:3px;">💬</div>
                <div style="font-size:12px;font-weight:700;color:#333;">手机社交</div>
            </button>
        </div>

        <!-- 频道作品列表 -->
        <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div style="font-weight:700;font-size:15px;color:var(--text);">🎬 频道视频作品 (${videos.length})</div>
            </div>
            ${videosHtml}
        </div>
    </div>
    `;
    container.innerHTML = html;
}

window.toggleCollection = function(type, id) {
    if (!G.collections) G.collections = { videos: [], moments: [] };
    if (type === 'video') {
        if (!G.collections.videos) G.collections.videos = [];
        const idx = G.collections.videos.indexOf(id);
        if (idx !== -1) {
            G.collections.videos.splice(idx, 1);
            showToast('已取消收藏视频', 'info', 1200);
        } else {
            G.collections.videos.push(id);
            showToast('⭐ 视频已加入收藏！', 'success', 1500);
        }
    }
    renderDashboard();
    autoSaveGame();
};

window.toggleColVideoComments = function(videoIdx) {
    const v = G.player?.videos?.[videoIdx];
    if (!v) return;
    v._showComments = !v._showComments;
    renderDashboard();
};

window.sendReply = function(videoIdx, commentIdx) {
    const v = G.player?.videos?.[videoIdx];
    if (!v || !v.comments?.[commentIdx]) return;
    const targetCom = v.comments[commentIdx];
    
    openModal(`
        <h3>💬 回复评论</h3>
        <div style="background:#f5f8f5;padding:8px 10px;border-radius:8px;font-size:12px;color:#555;margin-bottom:10px;">
            <b>${escapeHtml(targetCom.user)}:</b> ${escapeHtml(targetCom.text)}
        </div>
        <div class="form-group">
            <textarea id="replyCommentInput" rows="3" placeholder="回复观众..." style="width:100%;padding:8px;font-size:13px;"></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnConfirmSendReply">发送回复</button>
        </div>
    `);

    document.getElementById('btnConfirmSendReply').onclick = () => {
        const text = document.getElementById('replyCommentInput').value.trim();
        if (!text) { showToast('内容不能为空', 'error'); return; }
        if (!targetCom.replies) targetCom.replies = [];
        targetCom.replies.push({ author: G.player.ytName || '主播', text, time: '刚刚' });
        closeModal();
        showToast('✅ 回复成功！', 'success', 1500);
        renderDashboard();
        autoSaveGame();
    };
};

window.renderDashboard = renderDashboard;

// ============================================================
// 数据面板
// ============================================================
function renderDataPanel() {
    const container = (dom && dom.dataTab) || document.getElementById('dataTab');
    if (!container) return;
    ensureNpcIntegrity();
    const p = G.player || {};
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
            <div class="npc-card" onclick="window.openChat('${id}')">
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
    const nextMs = (typeof getNextMilestone === 'function') ? getNextMilestone() : '10,000 粉丝';
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
            <div class="btn-row"><button class="btn-primary" onclick="window.closeModal()" style="width:100%;">我知道了，关闭提示</button></div>
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

function getActiveAccountInfo() {
    if (G.currentAccountId === 'main' || !G.currentAccountId) {
        return { id: 'main', isAlt: false, name: G.player.ytName || '主播大号', avatar: G.player.avatar || null, bio: 'YouTube 频道官方号' };
    }
    const found = (G.altAccounts || []).find(a => a.id === G.currentAccountId);
    if (found) return { id: found.id, isAlt: true, name: found.name, avatar: found.avatar || null, bio: found.bio || '私密小号' };
    return { id: 'main', isAlt: false, name: G.player.ytName || '主播大号', avatar: G.player.avatar, bio: '' };
}

window.switchAccount = function(accId) {
    G.currentAccountId = accId;
    showToast(`🔀 已切换账号为：${getActiveAccountInfo().name}`, 'info', 1800);
    renderSocialPanel();
    autoSaveGame();
};

window.openAccountManagerModal = function() {
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
                ${currentId === alt.id ? '<span style="font-size:11px;color:#2e7d32;font-weight:700;padding:4px 6px;">● 当前使用</span>' : `<button class="upload-btn" onclick="window.switchAccount('${alt.id}');window.closeModal();" style="padding:4px 8px;font-size:11px;">使用</button>`}
                <button class="upload-btn" onclick="window.deleteAltAccount('${alt.id}')" style="padding:4px 6px;font-size:11px;background:#e53935;">🗑️</button>
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
                        <div style="font-weight:700;font-size:13px;">${escapeHtml(G.player.ytName)} <span style="font-size:10px;color:#fff;background:var(--primary);padding:1px 6px;border-radius:4px;">大号</span></div>
                    </div>
                </div>
                ${currentId === 'main' ? '<span style="font-size:11px;color:#2e7d32;font-weight:700;padding:4px 6px;">● 当前使用</span>' : `<button class="upload-btn" onclick="window.switchAccount('main');window.closeModal();" style="padding:4px 8px;font-size:11px;">使用</button>`}
            </div>
            <div style="font-weight:700;font-size:13px;margin:12px 0 6px;">🎭 注册的小号列表</div>
            ${altsHtml || '<div style="font-size:12px;color:#999;padding:6px 0;">暂无小号，点击下方注册全新马甲</div>'}
        </div>
        <div class="btn-row" style="flex-direction:column;gap:8px;">
            <button class="btn-primary" onclick="window.closeModal(); window.openCreateAltAccountModal();" style="width:100%;">➕ 注册新的自定义小号</button>
            <button class="btn-secondary" onclick="window.closeModal()" style="width:100%;">关闭</button>
        </div>
    `);
};

window.openCreateAltAccountModal = function() {
    openModal(`
        <h3>➕ 注册自定义小号</h3>
        <div class="form-group"><label>小号名称 / ID <span class="required">*</span></label><input type="text" id="altNameInput" placeholder="如：路过的红石学徒"></div>
        <div class="form-group"><label>小号个性签名</label><input type="text" id="altBioInput" placeholder="如：热爱MC建筑..."></div>
        <div class="btn-row"><button class="btn-secondary" onclick="window.openAccountManagerModal()">返回</button><button class="btn-primary" onclick="window.confirmCreateAltAccount()">完成注册并登录</button></div>
    `);
};

window.confirmCreateAltAccount = function() {
    const name = document.getElementById('altNameInput').value.trim();
    if (!name) { showToast('⚠️ 请填写小号名称', 'error'); return; }
    if (!G.altAccounts) G.altAccounts = [];
    const newAlt = { id: 'alt_' + Date.now(), name, bio: document.getElementById('altBioInput').value.trim() || '路人小号', avatar: null, createdAt: G.day };
    G.altAccounts.push(newAlt); G.currentAccountId = newAlt.id;
    showToast(`🎉 小号「${name}」注册成功！`, 'success', 2500);
    closeModal(); renderSocialPanel(); autoSaveGame();
};

window.deleteAltAccount = function(altId) {
    if (!confirm('确定要注销这个小号吗？')) return;
    G.altAccounts = (G.altAccounts || []).filter(a => a.id !== altId);
    if (G.currentAccountId === altId) G.currentAccountId = 'main';
    showToast('🗑️ 小号已注销', 'info');
    window.openAccountManagerModal(); autoSaveGame();
};

// ============================================================
// 🔔 粉丝热度与社交引擎
// ============================================================
function checkSocialRequestsTrigger() {
    if (typeof OFFICIAL_NPCS === 'undefined') return;
    if (!G.friendRequests) G.friendRequests = [];
    if (!G.groupInvites) G.groupInvites = [];
    const followers = G.player.followers || 0;

    for (const [id, npc] of Object.entries(OFFICIAL_NPCS)) {
        if (G.npcs[id] || G.friendRequests.some(r => r.npcOfficialId === id || r.name === npc.name)) continue;
        const threshold = npc.minFollowers || 5000;
        if (followers >= threshold && Math.random() < (followers > threshold * 2 ? 0.8 : 0.45)) {
            G.friendRequests.push({ _id: 'freq_' + id + '_' + Date.now(), npcOfficialId: id, name: npc.name, fromReason: `在油管关注到你的作品`, persona: npc.persona, avatarEmoji: npc.avatarEmoji || '👤', avatarUrl: npc.avatarUrl || null, day: G.day });
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
    return `\n【时差上下文】：玩家当前所在地：${pTz.country}，当前时段：第 ${pTz.day} 天【${pTz.slotName}】。请自然体现真实时差反应。\n`;
}

// ============================================================
// 📱 手机社交中心 UI 与事件
// ============================================================
if (!G.phoneNav) G.phoneNav = 'chats';
if (!G.chatActiveTab) G.chatActiveTab = 'direct';
if (!G.groups) G.groups = {};
if (!G.groupChatHistory) G.groupChatHistory = {};
if (!G.friendRequests) G.friendRequests = [];
if (!G.groupInvites) G.groupInvites = [];
if (!G.feed) G.feed = [];
if (!G.momentsFilterNpcId) G.momentsFilterNpcId = null;
if (!G._chatShowFullHistory) G._chatShowFullHistory = {};
let _stickerDrawerOpen = false;
if (!G._behindScreenActive) G._behindScreenActive = {};

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
    <div class="phone-app-wrap" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);height:100%;min-height:500px;display:flex;flex-direction:column;">
        <div style="background:#f1f7f1;padding:6px 12px;border-bottom:1px solid #e0ebe0;display:flex;justify-content:space-between;align-items:center;font-size:12px;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:6px;">
                <span>${activeAcc.isAlt ? '🎭' : '👑'} 账号：<b>${escapeHtml(activeAcc.name)}</b></span>
                ${activeAcc.isAlt ? '<span style="font-size:10px;background:#ffe082;color:#795548;padding:1px 4px;border-radius:4px;font-weight:700;">小号</span>' : ''}
            </div>
            <div style="display:flex;gap:5px;">
                <button onclick="window.openClockSettingsModal()" style="border:1px solid #b8dbb8;background:#fff;padding:2px 7px;border-radius:12px;font-size:11px;cursor:pointer;color:#2e7d32;font-weight:700;">🕒 时区</button>
                <button onclick="window.openAccountManagerModal()" style="border:1px solid #b8dbb8;background:#fff;padding:2px 8px;border-radius:12px;font-size:11px;cursor:pointer;color:#2e7d32;font-weight:700;">🔀 切换账号</button>
            </div>
        </div>
        <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;">
            ${contentHtml}
        </div>
        <div style="height:54px;background:#fcfdfc;border-top:1px solid #eef2ee;display:flex;justify-content:space-around;align-items:center;padding:0 10px;flex-shrink:0;">
            <button onclick="window.G.currentChatNpc = null; window.G.currentChatGroup = null; window.G.phoneNav = 'chats'; window.renderSocialPanel();" style="border:none;background:none;font-size:12px;font-weight:700;color:${!isMoments ? 'var(--primary)' : '#888'};display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;">
                <span style="font-size:18px;">💬</span><span>消息</span>
            </button>
            <button onclick="window.G.currentChatNpc = null; window.G.currentChatGroup = null; window.G.phoneNav = 'moments'; window.G.momentsFilterNpcId = null; window.renderSocialPanel();" style="border:none;background:none;font-size:12px;font-weight:700;color:${isMoments ? 'var(--primary)' : '#888'};display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;">
                <span style="font-size:18px;">🌟</span><span>朋友圈</span>
            </button>
        </div>
    </div>
    `;
    container.innerHTML = html;
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
                可以通过<b>发布视频</b>积累热度，或者点击右上角 ➕ 手动添加联系人！
            </div>`;
        } else {
            for (const [id, npc] of npcList) {
                const chatHist = getAccountChatHistory(id);
                const lastMsg = chatHist.length > 0 ? chatHist[chatHist.length - 1] : null;
                const purePreview = lastMsg ? stripThought(lastMsg.text || '') : (npc.memorySummary ? `[记忆: ${stripThought(npc.memorySummary).slice(0, 15)}...]` : '新添加好友，快来打个招呼吧');
                const time = lastMsg ? (lastMsg.time || '') : '';
                const isBlocked = isAccountBlockedByNpc(id, currentAcc.id);
                
                itemsHtml += `
                <div class="chat-item" onclick="window.openChat('${id}')" oncontextmenu="event.preventDefault(); window.openEditNpcModal('${id}'); return false;" style="display:flex;align-items:center;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:#fff;border:1px solid #f0f4f0;">
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
                const purePreview = lastMsg ? `${lastMsg.senderName || '成员'}: ${stripThought(lastMsg.text || '')}` : (grp.desc || '开启热烈讨论吧');
                itemsHtml += `
                <div class="group-item" onclick="window.openGroupChat('${gid}')" oncontextmenu="event.preventDefault(); window.openGroupSettingsModal('${gid}'); return false;" style="display:flex;align-items:center;padding:10px 12px;border-radius:10px;margin-bottom:6px;cursor:pointer;background:#fff;border:1px solid #f0f4f0;">
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
    <div class="chat-header" style="padding:12px 16px;background:#f8fbf8;border-bottom:1px solid #eef3ee;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
        <div style="display:flex;gap:6px;background:#e9f2e9;padding:3px;border-radius:8px;">
            <button onclick="window.G.chatActiveTab = 'direct'; window.renderSocialPanel();" style="border:none;padding:6px 14px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;background:${isDirect ? '#fff' : 'transparent'};color:${isDirect ? 'var(--primary)' : '#666'};">👤 私聊</button>
            <button onclick="window.G.chatActiveTab = 'group'; window.renderSocialPanel();" style="border:none;padding:6px 14px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;background:${!isDirect ? '#fff' : 'transparent'};color:${!isDirect ? 'var(--primary)' : '#666'};">👥 群聊</button>
        </div>
        <div style="position:relative;">
            <button onclick="window.openAddChatTargetModal()" title="新建与好友/群邀请" style="border:none;background:var(--primary);color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">➕</button>
            ${pendingCount > 0 ? `<span style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;background:#ff4757;border:2px solid #fff;border-radius:50%;display:block;"></span>` : ''}
        </div>
    </div>
    <div style="font-size:11px;color:#888;padding:6px 16px;background:#fcfdfc;border-bottom:1px dashed #eee;flex-shrink:0;">
        💡 提示：短按卡片进入聊天，长按卡片可编辑人设与配置
    </div>
    <div class="chat-list" style="flex:1;overflow-y:auto;padding:8px;">
        ${itemsHtml}
    </div>`;
}

window.openChat = function(npcId) {
    if (!G.npcs || !G.npcs[npcId]) return;
    G.currentChatGroup = null;
    G.currentChatNpc = npcId;
    G.chatActiveTab = 'direct';
    G.phoneNav = 'chats';
    renderSocialPanel();
};

window.closeChat = function() {
    G.currentChatNpc = null;
    renderSocialPanel();
};

window.openGroupChat = function(gid) {
    if (!G.groups || !G.groups[gid]) return;
    G.currentChatNpc = null;
    G.currentChatGroup = gid;
    G.chatActiveTab = 'group';
    G.phoneNav = 'chats';
    renderSocialPanel();
};

window.closeGroupChat = function() {
    G.currentChatGroup = null;
    renderSocialPanel();
};

// ============================================================
// 🌟 朋友圈 (Moments) 子系统实现
// ============================================================
function buildMomentsHTML() {
    if (!G.feed) G.feed = [];
    const activeAcc = getActiveAccountInfo();
    const filterNpcId = G.momentsFilterNpcId;
    const filterNpc = filterNpcId ? G.npcs[filterNpcId] : null;

    let filterBanner = '';
    if (filterNpc) {
        filterBanner = `
        <div style="background:#e8f5e9;padding:8px 12px;font-size:12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #c8e6c9;">
            <span>📸 正在查看 <b>${escapeHtml(filterNpc.name)}</b> 的朋友圈空间</span>
            <button onclick="window.G.momentsFilterNpcId = null; window.renderSocialPanel();" style="border:none;background:#2e7d32;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;cursor:pointer;">查看全部</button>
        </div>`;
    }

    let feedList = G.feed;
    if (filterNpcId) {
        feedList = feedList.filter(f => f.npcId === filterNpcId || f.author === filterNpc.name);
    }

    let cardsHtml = '';
    if (!feedList.length) {
        cardsHtml = `
        <div style="text-align:center;color:#999;padding:50px 16px;font-size:13px;line-height:1.8;">
            <div style="font-size:32px;margin-bottom:6px;">🍃</div>
            这里还没有任何朋友圈动态。<br>
            点击右上角<b>「📷 发动态」</b>或<b>「✨ 刷新好友动态」</b>打破沉默吧！
        </div>`;
    } else {
        feedList.forEach(m => {
            const isSelf = m.isPlayer || (m.author === G.player.ytName) || (G.altAccounts || []).some(a => a.name === m.author);
            const isLiked = !!m.liked;
            const comments = m.comments || [];

            let commentsBoxHtml = '';
            if (comments.length > 0) {
                const comLines = comments.map((c, cIdx) => `
                    <div style="font-size:12px;line-height:1.5;margin-bottom:3px;">
                        <span style="color:#2e7d32;font-weight:700;cursor:pointer;" onclick="window.replyMomentComment(${m.id}, '${escapeHtml(c.name || '好友')}')">${escapeHtml(c.name || '好友')}:</span>
                        <span style="color:#333;">${escapeHtml(c.text)}</span>
                    </div>
                `).join('');
                commentsBoxHtml = `
                <div style="background:#f4f7f4;border-radius:6px;padding:6px 10px;margin-top:8px;border:1px solid #e9f0e9;">
                    ${commentsBoxHtml}${comLines}
                </div>`;
            }

            cardsHtml += `
            <div class="moment-card" data-id="${m.id}" style="background:#fff;border-radius:12px;padding:12px;margin-bottom:10px;border:1px solid #f0f4f0;box-shadow:0 1px 4px rgba(0,0,0,0.03);">
                <div style="display:flex;align-items:flex-start;gap:10px;">
                    <div style="flex-shrink:0;">${renderAvatarBadge({ isPlayer: isSelf, avatarUrl: m.avatar, avatarEmoji: m.avatarEmoji || '👤' }, 40)}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div style="font-weight:700;font-size:14px;color:var(--text);">${escapeHtml(m.author || '神秘好友')}</div>
                            <div style="font-size:11px;color:#bbb;">${m.time || '刚刚'}</div>
                        </div>
                        <div style="font-size:13.5px;color:#222;margin:6px 0;line-height:1.5;word-break:break-word;">
                            ${escapeHtml(m.body || '').replace(/\n/g, '<br>')}
                        </div>
                        ${m.image ? `<div style="margin:6px 0;"><img src="${m.image}" style="max-width:100%;max-height:180px;border-radius:8px;object-fit:cover;"></div>` : ''}
                        
                        <!-- 底部互动操作栏 -->
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:6px;border-top:1px dashed #f2f5f2;font-size:12px;">
                            <div style="display:flex;gap:12px;align-items:center;">
                                <button onclick="window.toggleMomentLike(${m.id})" style="border:none;background:none;color:${isLiked ? '#e53935' : '#777'};cursor:pointer;display:flex;align-items:center;gap:3px;font-size:12.5px;padding:0;">
                                    <span>${isLiked ? '❤️' : '🤍'}</span> <span>${m.likes || 0}</span>
                                </button>
                                <button onclick="window.addMomentComment(${m.id})" style="border:none;background:none;color:#666;cursor:pointer;display:flex;align-items:center;gap:3px;font-size:12.5px;padding:0;">
                                    <span>💬</span> <span>评论</span>
                                </button>
                                <button onclick="window.triggerAiCommentForMoment(${m.id})" title="召唤好友NPC在评论区互动" style="border:none;background:none;color:#2e7d32;cursor:pointer;font-size:12px;padding:0;">
                                    🤖 互动
                                </button>
                                <button onclick="window.openShareMomentModal(${m.id})" title="转发给好友私聊" style="border:none;background:none;color:#555;cursor:pointer;font-size:12px;padding:0;">
                                    ↗️ 转发
                                </button>
                            </div>
                            ${isSelf ? `
                            <div style="display:flex;gap:6px;">
                                <button onclick="window.openEditMomentModalById(${m.id})" style="border:none;background:none;color:#1976d2;font-size:11.5px;cursor:pointer;padding:0;">编辑</button>
                                <button onclick="window.recallMoment(${m.id})" style="border:none;background:none;color:#e53935;font-size:11.5px;cursor:pointer;padding:0;">撤回</button>
                            </div>` : ''}
                        </div>
                        ${commentsBoxHtml}
                    </div>
                </div>
            </div>`;
        });
    }

    return `
    <div style="display:flex;flex-direction:column;height:100%;">
        <!-- 朋友圈个性背景顶部栏 -->
        <div style="background:linear-gradient(135deg, #a8e6cf 0%, #dcedc1 100%);padding:16px 14px 12px;position:relative;flex-shrink:0;">
            <div style="display:flex;justify-content:space-between;align-items:flex-end;">
                <div>
                    <div style="font-weight:700;font-size:17px;color:#264e36;">🌟 游戏圈动态</div>
                    <div style="font-size:11.5px;color:#4a7c59;margin-top:2px;">记录主播们的MC日常与趣事八卦</div>
                </div>
                <div style="display:flex;gap:6px;">
                    <button onclick="window.triggerGenerateFriendsFeed()" style="border:1px solid #7cb342;background:rgba(255,255,255,0.9);color:#2e7d32;padding:4px 9px;border-radius:14px;font-size:11.5px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.05);">✨ 刷出动态</button>
                    <button onclick="window.openPostMomentModal()" style="border:none;background:var(--primary);color:#fff;padding:4px 10px;border-radius:14px;font-size:11.5px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.1);">📷 发动态</button>
                </div>
            </div>
        </div>
        ${filterBanner}
        <div style="flex:1;overflow-y:auto;padding:10px;background:#f7f9f7;">
            ${cardsHtml}
        </div>
    </div>`;
}

window.openPostMomentModal = function() {
    const curAcc = getActiveAccountInfo();
    openModal(`
        <h3>📷 发表朋友圈动态</h3>
        <p style="font-size:12px;color:#666;margin-bottom:8px;">以当前身份「${escapeHtml(curAcc.name)}」发布动态：</p>
        <div class="form-group">
            <textarea id="postMomentBody" rows="4" placeholder="分享此刻的MC游玩心情、直播预告或趣事..." style="width:100%;padding:8px;font-size:13.5px;"></textarea>
        </div>
        <div class="form-group">
            <label style="font-size:12px;">附带配图链接 (可选)：</label>
            <input type="text" id="postMomentImgUrl" placeholder="如：https://imgbed.heliar.top/i/...">
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnConfirmPublishMoment">发布</button>
        </div>
    `);

    document.getElementById('btnConfirmPublishMoment').onclick = () => {
        const body = document.getElementById('postMomentBody').value.trim();
        const img = document.getElementById('postMomentImgUrl').value.trim();
        if (!body) { showToast('请填写动态内容', 'error'); return; }
        if (!G.feed) G.feed = [];
        const newMoment = {
            id: Date.now() + rand(100, 999),
            author: curAcc.name,
            avatar: curAcc.avatar,
            isPlayer: true,
            body,
            image: img || null,
            time: '刚刚',
            liked: false,
            likes: 0,
            comments: []
        };
        G.feed.unshift(newMoment);
        closeModal();
        showToast('🎉 动态已成功发布！', 'success', 2000);
        addGlobalMemoryRecord(`【玩家朋友圈】：主角发布了动态「${body.slice(0, 20)}...」`);
        renderSocialPanel();
        autoSaveGame();
    };
};

window.openEditMomentModal = function(item) {
    if (!item) return;
    openModal(`
        <h3>✏️ 编辑朋友圈动态</h3>
        <div class="form-group">
            <textarea id="editMomentBody" rows="4" style="width:100%;padding:8px;font-size:13.5px;">${escapeHtml(item.body || '')}</textarea>
        </div>
        <div class="form-group">
            <label style="font-size:12px;">配图链接：</label>
            <input type="text" id="editMomentImgUrl" value="${escapeHtml(item.image || '')}">
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnConfirmSaveMomentEdit">💾 保存修改</button>
        </div>
    `);

    document.getElementById('btnConfirmSaveMomentEdit').onclick = () => {
        const body = document.getElementById('editMomentBody').value.trim();
        const img = document.getElementById('editMomentImgUrl').value.trim();
        if (!body) { showToast('内容不能为空', 'error'); return; }
        item.body = body;
        item.image = img || null;
        closeModal();
        showToast('✅ 动态已修改', 'success', 1500);
        renderSocialPanel();
        autoSaveGame();
    };
};

window.addMomentComment = function(momentId) {
    const curAcc = getActiveAccountInfo();
    openModal(`
        <h3>💬 评论动态</h3>
        <div class="form-group">
            <textarea id="momentCommentInput" rows="3" placeholder="写下你的评论..." style="width:100%;padding:8px;font-size:13px;"></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnConfirmSendMomentComment">发表评论</button>
        </div>
    `);

    document.getElementById('btnConfirmSendMomentComment').onclick = () => {
        const text = document.getElementById('momentCommentInput').value.trim();
        if (!text) { showToast('评论不能为空', 'error'); return; }
        const item = (G.feed || []).find(f => f.id === momentId);
        if (item) {
            if (!item.comments) item.comments = [];
            item.comments.push({ name: curAcc.name, text, time: '刚刚' });
            closeModal();
            showToast('✅ 评论已发表！', 'success', 1200);
            renderSocialPanel();
            autoSaveGame();
        }
    };
};

window.replyMomentComment = function(momentId, replyToName) {
    const curAcc = getActiveAccountInfo();
    openModal(`
        <h3>💬 回复 @${escapeHtml(replyToName)}</h3>
        <div class="form-group">
            <textarea id="momentReplyInput" rows="3" placeholder="回复 @${escapeHtml(replyToName)}..." style="width:100%;padding:8px;font-size:13px;"></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnConfirmSendMomentReply">发送回复</button>
        </div>
    `);

    document.getElementById('btnConfirmSendMomentReply').onclick = () => {
        const text = document.getElementById('momentReplyInput').value.trim();
        if (!text) { showToast('内容不能为空', 'error'); return; }
        const item = (G.feed || []).find(f => f.id === momentId);
        if (item) {
            if (!item.comments) item.comments = [];
            item.comments.push({ name: curAcc.name, text: `回复 @${replyToName} : ${text}`, time: '刚刚' });
            closeModal();
            showToast('✅ 回复已发表！', 'success', 1200);
            renderSocialPanel();
            autoSaveGame();
        }
    };
};

window.openShareMomentModal = function(momentId) {
    const item = (G.feed || []).find(f => f.id === momentId);
    if (!item) return;
    const npcs = Object.entries(G.npcs || {});
    const groups = Object.entries(G.groups || {});

    if (!npcs.length && !groups.length) {
        showToast('暂无好友或群聊可供转发', 'info');
        return;
    }

    let targetOptions = '';
    npcs.forEach(([id, n]) => {
        targetOptions += `<option value="single_${id}">👤 好友: ${escapeHtml(n.name)}</option>`;
    });
    groups.forEach(([gid, grp]) => {
        targetOptions += `<option value="group_${gid}">👥 群聊: ${escapeHtml(grp.name)}</option>`;
    });

    openModal(`
        <h3>↗️ 转发动态给好友</h3>
        <div style="background:#f4f6f4;padding:8px 10px;border-radius:8px;font-size:12px;color:#555;margin-bottom:10px;">
            <b>${escapeHtml(item.author)}:</b> ${escapeHtml(item.body.slice(0, 40))}...
        </div>
        <div class="form-group">
            <label>选择接收目标：</label>
            <select id="shareTargetSelect" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;">
                ${targetOptions}
            </select>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnConfirmShareMoment">确认转发</button>
        </div>
    `);

    document.getElementById('btnConfirmShareMoment').onclick = () => {
        const val = document.getElementById('shareTargetSelect').value;
        const curAcc = getActiveAccountInfo();
        const msgObj = {
            from: 'player',
            senderAccount: curAcc.name,
            sharedMoment: item,
            text: `[转发了动态: ${item.body.slice(0, 20)}...]`,
            time: new Date().toLocaleTimeString().slice(0, 5)
        };

        if (val.startsWith('single_')) {
            const npcId = val.replace('single_', '');
            pushChatMessageSafe(npcId, msgObj);
            showToast(`✅ 已转发给 ${G.npcs[npcId]?.name}！`, 'success', 2000);
        } else if (val.startsWith('group_')) {
            const gid = val.replace('group_', '');
            if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
            G.groupChatHistory[gid].push(msgObj);
            showToast(`✅ 已转发至群聊！`, 'success', 2000);
        }
        closeModal();
        autoSaveGame();
    };
};

window.triggerGenerateFriendsFeed = async function() {
    const npcList = Object.values(G.npcs || {});
    if (!npcList.length) {
        showToast('通讯录暂无好友，先添加好友才能刷出动态哦！', 'info', 2500);
        return;
    }
    const pickedNpcs = npcList.sort(() => 0.5 - Math.random()).slice(0, rand(1, 2));
    showToast('✨ 正在刷新好友朋友圈...', 'info', 1500);
    try {
        for (const n of pickedNpcs) {
            const sys = `你正在扮演 Minecraft 主播/好友「${n.name}」（性格：${n.persona || '开朗同伴'}）。
请为该角色生成一条真实、风趣、口语化的游戏朋友圈动态（30~60字）。可以涉及MC挖矿爆仓、被苦力怕偷袭、剪视频熬夜掉头发、或者吐槽打趣其他主播。
仅输出动态正文，严禁括号动作和引号。`;
            const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '发一条朋友圈动态' }], { maxTokens: 150, temperature: 0.9 });
            const clean = stripThought(raw.trim());
            if (clean) {
                if (!G.feed) G.feed = [];
                G.feed.unshift({
                    id: Date.now() + rand(100, 999),
                    npcId: n.id,
                    author: n.name,
                    avatar: n.avatarUrl,
                    avatarEmoji: n.avatarEmoji || '👤',
                    isPlayer: false,
                    body: clean,
                    time: '刚刚',
                    liked: false,
                    likes: rand(1, 15),
                    comments: []
                });
            }
        }
        showToast('🎉 好友动态已刷新！', 'success', 1500);
        renderSocialPanel();
        autoSaveGame();
    } catch(e) {
        console.error('刷出朋友圈动态失败', e);
        showToast('❌ 刷新朋友圈动态失败', 'error');
    }
};

window.triggerAiCommentForMoment = async function(momentId) {
    const item = (G.feed || []).find(f => f.id === momentId);
    if (!item) return;
    const npcList = Object.values(G.npcs || {});
    if (!npcList.length) {
        showToast('通讯录暂无好友接话', 'info');
        return;
    }
    const candidates = npcList.filter(n => n.name !== item.author);
    const speaker = candidates.length ? pick(candidates) : npcList[0];
    showToast(`🤖 ${speaker.name} 正在赶来评论...`, 'info', 1200);

    try {
        const sys = `你正在扮演 Minecraft 主播「${speaker.name}」（性格：${speaker.persona || '好友'}，好感度：${speaker.favor || 50}）。
现在好友「${item.author}」发了一条朋友圈：“${item.body}”。
请根据你们的关系人设，发一句真实鲜活、极简接地气的评论（15~35字），可吐槽、调侃或关心。直接输出评论文字。`;
        const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '写一条评论' }], { maxTokens: 100, temperature: 0.9 });
        const clean = stripThought(raw.trim());
        if (clean) {
            if (!item.comments) item.comments = [];
            item.comments.push({ name: speaker.name, text: clean, time: '刚刚' });
            item.likes = (item.likes || 0) + 1;
            showToast(`💬 ${speaker.name} 发表了评论！`, 'success', 1500);
            renderSocialPanel();
            autoSaveGame();
        }
    } catch(e) {
        showToast('评论生成失败', 'error');
    }
};

// ============================================================
// 📬 社交通讯中枢：好友申请/群邀请处理/新建联系人/群设置
// ============================================================
window.openAddChatTargetModal = function() {
    const reqs = G.friendRequests || [];
    const grpInvs = G.groupInvites || [];

    let reqsHtml = '';
    if (reqs.length === 0 && grpInvs.length === 0) {
        reqsHtml = '<div style="font-size:12px;color:#999;padding:10px 0;text-align:center;">暂无待处理的好友申请与群邀请。</div>';
    } else {
        reqs.forEach((r, idx) => {
            reqsHtml += `
            <div style="background:#f8faf8;border-radius:8px;padding:8px 10px;margin-bottom:6px;border:1px solid #e0ede0;display:flex;justify-content:space-between;align-items:center;">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:13px;color:#333;">${r.avatarEmoji || '👤'} ${escapeHtml(r.name)} <span style="font-size:10px;background:#e8f5e9;color:#2e7d32;padding:1px 5px;border-radius:4px;">好友申请</span></div>
                    <div style="font-size:11.5px;color:#666;margin-top:2px;">理由: ${escapeHtml(r.fromReason || '慕名而来')}</div>
                </div>
                <div style="display:flex;gap:4px;">
                    <button onclick="window.handleFriendRequestAction('${r._id}', 'accept')" style="border:none;background:#2e7d32;color:#fff;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;">接受</button>
                    <button onclick="window.handleFriendRequestAction('${r._id}', 'reject')" style="border:none;background:#ccc;color:#333;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;">忽略</button>
                </div>
            </div>`;
        });
        grpInvs.forEach((gi, idx) => {
            reqsHtml += `
            <div style="background:#f8faf8;border-radius:8px;padding:8px 10px;margin-bottom:6px;border:1px solid #e0ede0;display:flex;justify-content:space-between;align-items:center;">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:13px;color:#333;">${gi.avatarEmoji || '👥'} ${escapeHtml(gi.name)} <span style="font-size:10px;background:#e3f2fd;color:#1565c0;padding:1px 5px;border-radius:4px;">群邀请</span></div>
                    <div style="font-size:11.5px;color:#666;margin-top:2px;">${escapeHtml(gi.desc || '')}</div>
                </div>
                <div style="display:flex;gap:4px;">
                    <button onclick="window.handleGroupInviteAction('${gi._id}', 'accept')" style="border:none;background:#1976d2;color:#fff;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;">加入</button>
                    <button onclick="window.handleGroupInviteAction('${gi._id}', 'reject')" style="border:none;background:#ccc;color:#333;padding:4px 8px;border-radius:6px;font-size:11px;cursor:pointer;">忽略</button>
                </div>
            </div>`;
        });
    }

    openModal(`
        <h3>📬 社交通讯与新建</h3>
        <div style="margin:10px 0;">
            <div style="font-weight:700;font-size:13px;color:#444;margin-bottom:6px;">🔔 申请与邀请 (${reqs.length + grpInvs.length})</div>
            ${reqsHtml}
        </div>
        <div style="border-top:1px dashed #ddd;padding-top:10px;margin-top:10px;">
            <div style="font-weight:700;font-size:13px;color:#444;margin-bottom:8px;">➕ 自由新建</div>
            <div class="btn-row" style="flex-direction:column;gap:8px;">
                <button class="btn-primary" onclick="window.closeModal(); window.openCreateCustomNpcModal();" style="width:100%;">👤 手动添加新好友 (自定义NPC)</button>
                <button class="btn-primary" onclick="window.closeModal(); window.openCreateGroupModal();" style="width:100%;background:#388e3c;">👥 建立主播多人讨论群</button>
                <button class="btn-secondary" onclick="closeModal()" style="width:100%;">关闭</button>
            </div>
        </div>
    `);
};

window.receiveFriendRequest = function(req) {
    if (!G.friendRequests) G.friendRequests = [];
    if (!req._id) req._id = 'freq_' + Date.now();
    G.friendRequests.push(req);
    showToast(`📬 收到来自 ${req.name} 的好友申请！`, 'info', 3000);
    renderSocialPanel();
    autoSaveGame();
};

window.handleFriendRequestAction = function(reqId, action) {
    if (!G.friendRequests) return;
    const reqIdx = G.friendRequests.findIndex(r => r._id === reqId);
    if (reqIdx === -1) return;
    const req = G.friendRequests[reqIdx];

    if (action === 'accept') {
        ensureNpcIntegrity();
        let finalNpc = null;
        if (req.npcOfficialId && typeof OFFICIAL_NPCS !== 'undefined' && OFFICIAL_NPCS[req.npcOfficialId]) {
            const def = OFFICIAL_NPCS[req.npcOfficialId];
            finalNpc = { ...def, id: req.npcOfficialId, favor: 50 };
            G.npcs[req.npcOfficialId] = finalNpc;
        } else {
            const newId = 'npc_' + Date.now();
            finalNpc = {
                id: newId,
                name: req.name || '好友',
                persona: req.persona || '热情的同伴',
                avatarEmoji: req.avatarEmoji || '👤',
                avatarUrl: req.avatarUrl || null,
                favor: 50,
                skills: { building: 50, redstone: 50, pvp: 50, survival: 50, hunting: 50 },
                isCustom: true
            };
            G.npcs[newId] = finalNpc;
        }

        // 推送一条初始打招呼消息
        pushChatMessageSafe(finalNpc.id, {
            from: 'npc',
            text: `你好！我通过了你的好友验证，以后可以一起录视频玩MC啦！`,
            time: new Date().toLocaleTimeString().slice(0, 5)
        });

        G.friendRequests.splice(reqIdx, 1);
        showToast(`🎉 成功添加 ${finalNpc.name} 为好友！`, 'success', 2500);
        addGlobalMemoryRecord(`【结识好友】：主角与主播「${finalNpc.name}」正式互加好友。`);
    } else {
        G.friendRequests.splice(reqIdx, 1);
        showToast('已忽略该申请', 'info', 1200);
    }
    closeModal();
    renderSocialPanel();
    autoSaveGame();
};

window.handleGroupInviteAction = function(invId, action) {
    if (!G.groupInvites) return;
    const invIdx = G.groupInvites.findIndex(gi => gi._id === invId);
    if (invIdx === -1) return;
    const gi = G.groupInvites[invIdx];

    if (action === 'accept') {
        if (!G.groups) G.groups = {};
        const gid = gi.gid || ('grp_' + Date.now());
        const memberIds = Object.keys(G.npcs || {}).slice(0, 3);
        G.groups[gid] = {
            id: gid,
            name: gi.name || '讨论群',
            desc: gi.desc || '自由交流',
            avatarEmoji: gi.avatarEmoji || '👑',
            members: memberIds,
            activeMembers: memberIds,
            streamerMode: 'shared'
        };
        if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
        G.groupChatHistory[gid].push({
            from: 'action',
            text: `你已加入群聊「${gi.name}」`,
            time: new Date().toLocaleTimeString().slice(0, 5)
        });
        G.groupInvites.splice(invIdx, 1);
        showToast(`🎉 成功加入群聊「${gi.name}」！`, 'success', 2500);
    } else {
        G.groupInvites.splice(invIdx, 1);
        showToast('已忽略群邀请', 'info', 1200);
    }
    closeModal();
    renderSocialPanel();
    autoSaveGame();
};

window.openCreateCustomNpcModal = function() {
    openModal(`
        <h3>➕ 自定义添加好友</h3>
        <div class="form-group"><label>好友昵称 <span class="required">*</span></label><input type="text" id="custNpcName" placeholder="如：梦境猎手"></div>
        <div class="form-group"><label>人设与性格口吻 <span class="required">*</span></label><textarea id="custNpcPersona" rows="3" placeholder="如：技术顶尖的高冷PvP大神，傲娇但关键时刻靠谱..."></textarea></div>
        <div class="form-group"><label>头像 Emoji / 图标</label><input type="text" id="custNpcEmoji" value="🏹" placeholder="填一个 Emoji"></div>
        <div class="form-group"><label>头像图片链接 (可选)</label><input type="text" id="custNpcAvatarUrl" placeholder="如：https://..."></div>
        <div class="form-group"><label>初始好感度 (0~100)</label><input type="number" id="custNpcFavor" value="50" min="0" max="100"></div>
        <div class="btn-row"><button class="btn-secondary" onclick="closeModal()">取消</button><button class="btn-primary" id="btnConfirmCreateNpc">完成添加</button></div>
    `);

    document.getElementById('btnConfirmCreateNpc').onclick = () => {
        const name = document.getElementById('custNpcName').value.trim();
        const persona = document.getElementById('custNpcPersona').value.trim();
        if (!name || !persona) { showToast('⚠️ 昵称和人设为必填项', 'error'); return; }
        const newId = 'custom_' + Date.now();
        ensureNpcIntegrity();
        G.npcs[newId] = {
            id: newId,
            name,
            persona,
            avatarEmoji: document.getElementById('custNpcEmoji').value.trim() || '👤',
            avatarUrl: document.getElementById('custNpcAvatarUrl').value.trim() || null,
            favor: parseInt(document.getElementById('custNpcFavor').value) || 50,
            skills: { building: 50, redstone: 50, pvp: 60, survival: 50, hunting: 50 },
            isCustom: true
        };
        showToast(`🎉 成功结识「${name}」！`, 'success', 2000);
        closeModal();
        renderSocialPanel();
        autoSaveGame();
    };
};

window.openEditNpcModal = function(npcId) {
    const npc = G.npcs[npcId];
    if (!npc) return;
    const curAcc = getActiveAccountInfo();
    const isBlocked = isAccountBlockedByNpc(npcId, curAcc.id);

    openModal(`
        <h3>⚙️ 编辑好友人设与关系</h3>
        <div class="form-group"><label>昵称</label><input type="text" id="editNpcName" value="${escapeHtml(npc.name)}"></div>
        <div class="form-group"><label>头像 Emoji</label><input type="text" id="editNpcEmoji" value="${escapeHtml(npc.avatarEmoji || '👤')}"></div>
        <div class="form-group"><label>头像图片链接</label><input type="text" id="editNpcAvatarUrl" value="${escapeHtml(npc.avatarUrl || '')}"></div>
        <div class="form-group"><label>性格与口吻设定</label><textarea id="editNpcPersona" rows="3">${escapeHtml(npc.persona || '')}</textarea></div>
        <div class="form-group"><label>好感度 (当前: ${npc.favor || 0})</label><input type="number" id="editNpcFavor" value="${npc.favor || 0}" min="0" max="100"></div>
        <div class="form-group">
            <label>私聊长时记忆</label>
            <textarea id="editNpcMemory" rows="3" placeholder="此处记录该角色的长期专属承诺与互动记忆...">${escapeHtml(npc.memorySummary || '')}</textarea>
        </div>
        <div style="background:#fef7f7;padding:8px 10px;border-radius:8px;margin:8px 0;border:1px solid #fed7d7;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;color:#c53030;"><b>拉黑状态：</b>${isBlocked ? '对方已拉黑你当前账号' : '状态正常'}</span>
            <button onclick="window.toggleNpcBlockStatus('${npcId}', '${curAcc.id}')" style="border:none;background:${isBlocked ? '#2e7d32' : '#e53935'};color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer;">
                ${isBlocked ? '🔓 强制解除拉黑' : '🚫 设为拉黑当前账号'}
            </button>
        </div>
        <div class="btn-row" style="margin-top:12px;">
            <button class="btn-secondary" onclick="window.deleteNpcTarget('${npcId}')" style="color:#c62828;">🗑️ 删除联系人</button>
            <button class="btn-primary" id="btnSaveEditNpc">💾 保存设定</button>
        </div>
    `);

    document.getElementById('btnSaveEditNpc').onclick = () => {
        npc.name = document.getElementById('editNpcName').value.trim() || npc.name;
        npc.avatarEmoji = document.getElementById('editNpcEmoji').value.trim() || '👤';
        npc.avatarUrl = document.getElementById('editNpcAvatarUrl').value.trim() || null;
        npc.persona = document.getElementById('editNpcPersona').value.trim() || npc.persona;
        npc.favor = parseInt(document.getElementById('editNpcFavor').value) || 0;
        npc.memorySummary = document.getElementById('editNpcMemory').value.trim();
        showToast('✅ 好友设定已更新！', 'success', 1500);
        closeModal();
        renderSocialPanel();
        autoSaveGame();
    };
};

window.toggleNpcBlockStatus = function(npcId, accId) {
    if (!G.blockedRecords) G.blockedRecords = [];
    const token = `${npcId}_${accId}`;
    const idx = G.blockedRecords.indexOf(token);
    if (idx !== -1) {
        G.blockedRecords.splice(idx, 1);
        showToast('🔓 已解除该账号的拉黑状态', 'success', 1500);
    } else {
        G.blockedRecords.push(token);
        showToast('🚫 已拉黑该账号', 'info', 1500);
    }
    closeModal();
    renderSocialPanel();
    autoSaveGame();
};

window.deleteNpcTarget = function(npcId) {
    if (!confirm(`确定要从通讯录删除「${G.npcs[npcId]?.name}」吗？历史私聊记录将被清除。`)) return;
    delete G.npcs[npcId];
    if (G.currentChatNpc === npcId) G.currentChatNpc = null;
    showToast('🗑️ 联系人已删除', 'info', 1500);
    closeModal();
    renderSocialPanel();
    autoSaveGame();
};

window.openCreateGroupModal = function() {
    const npcEntries = Object.entries(G.npcs || {});
    if (!npcEntries.length) {
        showToast('通讯录暂无好友，无法建群', 'error');
        return;
    }

    const memberCheckboxes = npcEntries.map(([id, n]) => `
        <label style="display:inline-flex;align-items:center;gap:4px;font-size:12.5px;background:#f4f7f4;padding:4px 8px;border-radius:12px;margin:3px;">
            <input type="checkbox" class="new-group-member-check" value="${id}" checked>
            <span>${n.avatarEmoji || '👤'} ${escapeHtml(n.name)}</span>
        </label>
    `).join('');

    openModal(`
        <h3>👥 自建主播讨论群</h3>
        <div class="form-group"><label>群聊名称 <span class="required">*</span></label><input type="text" id="newGrpName" placeholder="如：下界速通茶话会"></div>
        <div class="form-group"><label>群简介 / 群规</label><input type="text" id="newGrpDesc" placeholder="如：严禁炸服，友好讨论..."></div>
        <div class="form-group"><label>群图标 Emoji</label><input type="text" id="newGrpEmoji" value="🎮"></div>
        <div class="form-group">
            <label>邀请群成员：</label>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${memberCheckboxes}</div>
        </div>
        <div class="btn-row"><button class="btn-secondary" onclick="closeModal()">取消</button><button class="btn-primary" id="btnConfirmCreateGrp">创建群聊</button></div>
    `);

    document.getElementById('btnConfirmCreateGrp').onclick = () => {
        const name = document.getElementById('newGrpName').value.trim();
        if (!name) { showToast('⚠️ 群名称必填', 'error'); return; }
        const members = Array.from(document.querySelectorAll('.new-group-member-check:checked')).map(cb => cb.value);
        const gid = 'grp_' + Date.now();
        if (!G.groups) G.groups = {};
        G.groups[gid] = {
            id: gid,
            name,
            desc: document.getElementById('newGrpDesc').value.trim() || '自由讨论',
            avatarEmoji: document.getElementById('newGrpEmoji').value.trim() || '👥',
            members,
            activeMembers: members,
            streamerMode: 'shared'
        };
        if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
        G.groupChatHistory[gid].push({
            from: 'action',
            text: `群聊「${name}」已创建，开始热烈交流吧！`,
            time: new Date().toLocaleTimeString().slice(0, 5)
        });
        showToast(`🎉 群聊「${name}」创建成功！`, 'success', 2000);
        closeModal();
        window.openGroupChat(gid);
        autoSaveGame();
    };
};

window.openGroupSettingsModal = function(gid) {
    const grp = G.groups[gid];
    if (!grp) return;
    const npcEntries = Object.entries(G.npcs || {});

    const memberCheckboxes = npcEntries.map(([id, n]) => {
        const isMem = (grp.members || []).includes(id);
        return `
        <label style="display:inline-flex;align-items:center;gap:4px;font-size:12.5px;background:#f4f7f4;padding:4px 8px;border-radius:12px;margin:3px;">
            <input type="checkbox" class="grp-edit-member-check" value="${id}" ${isMem ? 'checked' : ''}>
            <span>${n.avatarEmoji || '👤'} ${escapeHtml(n.name)}</span>
        </label>
        `;
    }).join('');

    openModal(`
        <h3>⚙️ 群聊管理与设置</h3>
        <div class="form-group"><label>群名称</label><input type="text" id="editGrpName" value="${escapeHtml(grp.name)}"></div>
        <div class="form-group"><label>群简介 / 公告</label><input type="text" id="editGrpDesc" value="${escapeHtml(grp.desc || '')}"></div>
        <div class="form-group">
            <label>群回复模式：</label>
            <select id="editGrpMode" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;">
                <option value="shared" ${grp.streamerMode !== 'separate' ? 'selected' : ''}>全员大乱炖 (AI同时调度多名成员接话)</option>
                <option value="separate" ${grp.streamerMode === 'separate' ? 'selected' : ''}>知名主播独立发言模式 (优先挑选个别主播单独回)</option>
            </select>
        </div>
        <div class="form-group">
            <label>群成员勾选管理：</label>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">${memberCheckboxes}</div>
        </div>
        <div class="form-group">
            <label>群公共纪要记忆：</label>
            <textarea id="editGrpMemory" rows="3" placeholder="记录群内发生的重大笑点与共同约定...">${escapeHtml(G.groupMemories[gid] || '')}</textarea>
        </div>
        <div class="btn-row" style="margin-top:12px;">
            <button class="btn-secondary" onclick="window.dismissGroup('${gid}')" style="color:#c62828;">🗑️ 解散群聊</button>
            <button class="btn-primary" id="btnSaveGrpSettings">💾 保存设置</button>
        </div>
    `);

    document.getElementById('btnSaveGrpSettings').onclick = () => {
        grp.name = document.getElementById('editGrpName').value.trim() || grp.name;
        grp.desc = document.getElementById('editGrpDesc').value.trim() || grp.desc;
        grp.streamerMode = document.getElementById('editGrpMode').value;
        const newMembers = Array.from(document.querySelectorAll('.grp-edit-member-check:checked')).map(cb => cb.value);
        grp.members = newMembers;
        grp.activeMembers = newMembers;
        G.groupMemories[gid] = document.getElementById('editGrpMemory').value.trim();
        showToast('✅ 群聊配置已更新！', 'success', 1500);
        closeModal();
        renderGroupChatWindow(document.getElementById('socialTab'));
        autoSaveGame();
    };
};

window.dismissGroup = function(gid) {
    if (!confirm('确定解散并删除这个群聊吗？')) return;
    delete G.groups[gid];
    delete G.groupChatHistory[gid];
    delete G.groupMemories[gid];
    if (G.currentChatGroup === gid) G.currentChatGroup = null;
    showToast('🗑️ 群聊已解散', 'info', 1500);
    closeModal();
    renderSocialPanel();
    autoSaveGame();
};

window.openEditGroupModal = window.openGroupSettingsModal;

// ============================================================
// 🧠 多层立体记忆中枢系统
// ============================================================
window.openMemoryModal = function() {
    openModal(`
        <h3>🧠 游戏多层长时记忆中枢</h3>
        <p style="font-size:12px;color:#666;line-height:1.6;">本系统立体保存全盘重大事件、各NPC独立私聊承诺以及群聊认知，彻底拒绝AI失忆！</p>
        <div id="memoryModalContentArea" style="max-height:360px;overflow-y:auto;margin:10px 0;border:1px solid #eee;border-radius:10px;padding:10px;background:#fafbfa;">
            ${renderMemoryModalView()}
        </div>
        <div class="btn-row" style="flex-direction:column;gap:8px;">
            <button class="btn-primary" onclick="window.openManualMemoryInputModal('global')" style="width:100%;">➕ 手动添加一条全局核心记忆</button>
            <button class="btn-primary" onclick="window.executeManualAiSummary('global')" style="width:100%;background:#388e3c;">🤖 召唤小模型整理全局核心记忆</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">关闭</button>
        </div>
    `);
};

function renderMemoryModalView() {
    let globalHtml = '';
    const gmList = G.memorySummaries || [];
    if (!gmList.length) {
        globalHtml = '<div style="font-size:12px;color:#999;padding:4px 0;">暂无全局记忆事件。</div>';
    } else {
        gmList.forEach((gm, idx) => {
            globalHtml += `
            <div style="background:#fff;border-radius:6px;padding:6px 8px;margin-bottom:5px;border:1px solid #e5ebe5;font-size:12px;display:flex;justify-content:space-between;align-items:flex-start;">
                <span style="flex:1;min-width:0;color:#333;">${escapeHtml(gm.text || '')}</span>
                <button onclick="window.deleteGlobalMemoryItem(${idx})" style="border:none;background:none;color:#e53935;cursor:pointer;font-size:11px;margin-left:6px;">🗑️</button>
            </div>`;
        });
    }

    let npcsHtml = '';
    Object.entries(G.npcs || {}).forEach(([id, n]) => {
        npcsHtml += `
        <div style="background:#fff;border-radius:8px;padding:8px;margin-bottom:6px;border:1px solid #e0ede0;">
            <div style="display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:12.5px;">
                <span>${n.avatarEmoji || '👤'} ${escapeHtml(n.name)}</span>
                <button onclick="window.executeManualAiSummary('npc', '${id}')" style="border:none;background:#e8f5e9;color:#2e7d32;padding:2px 6px;border-radius:4px;font-size:10.5px;cursor:pointer;">🤖 提炼记忆</button>
            </div>
            <div style="font-size:11.5px;color:#555;margin-top:4px;">${escapeHtml(n.memorySummary || '暂无专属提炼记忆')}</div>
        </div>`;
    });

    return `
    <div style="font-weight:700;font-size:13px;color:#2e7d32;margin-bottom:6px;">🌐 全局重大纪实 (${gmList.length})</div>
    ${globalHtml}
    <div style="font-weight:700;font-size:13px;color:#1565c0;margin:12px 0 6px;">👥 好友私聊承诺专属库</div>
    ${npcsHtml}
    `;
}

window.deleteGlobalMemoryItem = function(idx) {
    if (G.memorySummaries && G.memorySummaries[idx]) {
        G.memorySummaries.splice(idx, 1);
        const area = document.getElementById('memoryModalContentArea');
        if (area) area.innerHTML = renderMemoryModalView();
        showToast('已删除该条记忆', 'info', 1200);
        autoSaveGame();
    }
};

window.openManualMemoryInputModal = function(type, targetId) {
    openModal(`
        <h3>➕ 手动写入全局核心记忆</h3>
        <p style="font-size:12px;color:#666;">记录玩家与MC世界的不可磨灭经历：</p>
        <div class="form-group">
            <textarea id="manualMemoryInput" rows="4" placeholder="如：第3天在下界堡垒救下Dream，建立了深厚信任..." style="width:100%;padding:8px;font-size:13px;"></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="window.openMemoryModal()">返回</button>
            <button class="btn-primary" id="btnConfirmManualMemory">写入记忆</button>
        </div>
    `);

    document.getElementById('btnConfirmManualMemory').onclick = () => {
        const text = document.getElementById('manualMemoryInput').value.trim();
        if (!text) { showToast('内容不能为空', 'error'); return; }
        addGlobalMemoryRecord(text);
        showToast('🧠 核心记忆已写入！', 'success', 1500);
        window.openMemoryModal();
        autoSaveGame();
    };
};

window.executeManualAiSummary = async function(type, targetId) {
    showToast('🤖 AI 正在整理记忆...', 'info', 2000);
    try {
        if (type === 'global') {
            const stories = (G.storyHistory || []).slice(-10).map(s => s.text).join('\n');
            const sys = `你是资深游戏纪事整理员。将以下近期主线剧情提炼为一条不超过120字的全局核心历史大事件摘要：直接输出纯正文。`;
            const raw = await callMemoryAI([{ role: 'system', content: sys }, { role: 'user', content: stories || '暂无剧情' }], { maxTokens: 250 });
            const clean = stripThought(raw.trim());
            if (clean) addGlobalMemoryRecord(clean);
            showToast('✅ 全局记忆提炼完成！', 'success', 2000);
        } else if (type === 'npc') {
            await checkNpcMemorySummarize(targetId);
        }
        const area = document.getElementById('memoryModalContentArea');
        if (area) area.innerHTML = renderMemoryModalView();
    } catch(e) {
        showToast('❌ 记忆整理失败: ' + e.message, 'error');
    }
};

window.renderMemoryModalView = renderMemoryModalView;

// ============================================================
// 💬 私聊窗口渲染
// ============================================================
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
            <button onclick="window.G._chatShowFullHistory['${sessionKey}'] = true; window.renderSingleChatWindow(document.getElementById('socialTab'));" style="border:none;background:rgba(0,0,0,0.06);color:#555;padding:4px 12px;border-radius:12px;font-size:11px;cursor:pointer;">
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
                <div onclick="window.jumpToMomentCard(${sm.id})" style="cursor:pointer;background:#fff;border-radius:8px;padding:8px;border:1px solid #e0e0e0;max-width:210px;">
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
                ${!isSelf ? `<div onclick="window.openNpcProfileCardModal('${npcId}')" oncontextmenu="event.preventDefault(); window.openEditNpcModal('${npcId}'); return false;" style="margin-right:8px;flex-shrink:0;cursor:pointer;">${renderAvatarBadge(npc, 34)}</div>` : ''}
                <div style="max-width:75%;display:flex;flex-direction:column;align-items:${isSelf ? 'flex-end' : 'flex-start'};">
                    ${isSelf && msg.senderAccount ? `<div style="font-size:10px;color:#888;margin-bottom:2px;">${escapeHtml(msg.senderAccount)}</div>` : ''}
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" ${isSelf && msg._id ? `oncontextmenu="event.preventDefault(); window.showMessageActionSheet('${msg._id}', 'single', '${npcId}'); return false;"` : ''} style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? ((msg.sticker || msg.sharedMoment) ? 'transparent' : '#95ec69') : ((msg.sticker || msg.sharedMoment) ? 'transparent' : '#fff')};color:#111;padding:${(msg.sticker || msg.sharedMoment) ? '0' : '8px 12px'};border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:${(msg.sticker || msg.sharedMoment) ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'};font-size:14px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;cursor:pointer;">
                        ${bubbleContent}
                    </div>
                    <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                </div>
                ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: activeAcc.avatar }, 34)}</div>` : ''}
            </div>`;
        }
    }

    const html = `
    <div style="background:#f2f4f2;border-radius:14px;display:flex;flex-direction:column;height:100%;min-height:500px;box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden;">
        <div style="padding:8px 12px;background:#fff;border-bottom:1px solid #e5ebe5;display:flex;justify-content:space-between;align-items:center;min-height:48px;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                <button onclick="window.closeChat()" style="border:none;background:none;font-size:19px;color:#333;cursor:pointer;padding:0 2px;">❮</button>
                <div onclick="window.openNpcProfileCardModal('${npcId}')" oncontextmenu="event.preventDefault(); window.openEditNpcModal('${npcId}'); return false;" style="cursor:pointer;flex:1;min-width:0;">
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
                <button onclick="window.toggleBehindScreen('${npcId}')" style="border:1px solid ${isBehindScreenActive ? '#8d6e63' : '#ccc'};background:${isBehindScreenActive ? '#efebe9' : '#fff'};width:30px;height:30px;border-radius:50%;font-size:15px;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="开启/关闭动作感知">👁️</button>
                <button onclick="window.triggerAIReplyForSingle('${npcId}')" style="border:none;background:#ff4757;color:#fff;width:32px;height:32px;border-radius:8px;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        ${isBlocked ? `
        <div style="background:#ffebee;color:#c62828;padding:5px 12px;font-size:11px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ffcdd2;flex-shrink:0;">
            <span>🚫 你的当前账号已被对方拉黑拒收。</span>
        </div>` : ''}

        <div id="chatMessageArea" style="flex:1;overflow-y:auto;padding:12px;">
            ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">当前与 TA 尚无对话，点击右上方 ⚡ 开启互动！</div>'}
        </div>

        ${_stickerDrawerOpen ? buildStickerDrawerHTML('single', npcId) : ''}

        <div style="padding:6px 8px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:5px;align-items:center;flex-shrink:0;">
            <button onclick="window.openChatActionMenuModal('single', '${npcId}')" title="合作/拍共创视频" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">➕</button>
            <button onclick="window.toggleStickerDrawer('single', '${npcId}')" title="发送表情包" style="border:1px solid #ccc;background:${_stickerDrawerOpen ? '#eaf5ea' : '#f8f9f8'};color:#555;width:32px;height:32px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">😊</button>
            <textarea id="singleChatInput" rows="1" placeholder="发送消息..." style="flex:1;padding:7px 10px;border-radius:16px;border:1px solid #ddd;background:#f8faf8;font-size:13.5px;resize:none;outline:none;font-family:inherit;"></textarea>
            <button onclick="window.doSendSingleChat('${npcId}')" style="border:none;background:var(--primary);color:#fff;padding:6px 13px;border-radius:16px;font-size:12.5px;font-weight:700;cursor:pointer;flex-shrink:0;">发送</button>
        </div>
    </div>
    `;
    container.innerHTML = html;

    const msgArea = document.getElementById('chatMessageArea');
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;

    const input = document.getElementById('singleChatInput');
    if (input) {
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                window.doSendSingleChat(npcId);
            }
        };
    }
}

window.toggleBehindScreen = function(npcId) {
    window.G._behindScreenActive[npcId] = !window.G._behindScreenActive[npcId];
    showToast(window.G._behindScreenActive[npcId] ? '👁️ 已开启「屏幕那边的TA」动作感知' : '已关闭线下动作感知', 'info', 1500);
    renderSingleChatWindow(document.getElementById('socialTab'));
    autoSaveGame();
};

window.toggleStickerDrawer = function(type, id) {
    _stickerDrawerOpen = !_stickerDrawerOpen;
    const cont = document.getElementById('socialTab');
    if (type === 'single') renderSingleChatWindow(cont);
    else renderGroupChatWindow(cont);
};

window.doSendSingleChat = function(npcId) {
    const input = document.getElementById('singleChatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const activeAcc = getActiveAccountInfo();
    if (isAccountBlockedByNpc(npcId, activeAcc.id)) {
        pushChatMessageSafe(npcId, { from: 'player', text, senderAccount: activeAcc.name, time: new Date().toLocaleTimeString().slice(0, 5) });
        pushChatMessageSafe(npcId, { from: 'action', text: `❌ 消息已被拒收。（已被拉黑）`, time: new Date().toLocaleTimeString().slice(0, 5) });
        input.value = '';
        renderSingleChatWindow(document.getElementById('socialTab'));
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
    renderSingleChatWindow(document.getElementById('socialTab'));
    autoSaveGame();
};

// ============================================================
// 👥 群聊窗口渲染
// ============================================================
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
                    ${!isSelf ? `<div style="font-size:11px;color:#777;margin-bottom:2px;">${escapeHtml(msg.senderName || '成员')}</div>` : ''}
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''}" ${isSelf && msg._id ? `oncontextmenu="event.preventDefault(); window.showMessageActionSheet('${msg._id}', 'group', '${gid}'); return false;"` : ''} style="width:fit-content;max-width:100%;display:inline-block;background:${isSelf ? (msg.sticker ? 'transparent' : '#95ec69') : (msg.sticker ? 'transparent' : '#fff')};color:#111;padding:${msg.sticker ? '0' : '8px 12px'};border-radius:${isSelf ? '10px 0 10px 10px' : '0 10px 10px 10px'};box-shadow:${msg.sticker ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'};font-size:14px;line-height:1.5;word-break:break-word;user-select:none;-webkit-user-select:none;">
                        ${bubbleContent}
                    </div>
                    <div style="font-size:10px;color:#bbb;margin-top:2px;">${msg.time || ''}</div>
                </div>
                ${isSelf ? `<div style="margin-left:8px;flex-shrink:0;">${renderAvatarBadge({ avatarUrl: activeAcc.avatar }, 34)}</div>` : ''}
            </div>`;
        }
    }

    const html = `
    <div style="background:#f2f4f2;border-radius:14px;display:flex;flex-direction:column;height:100%;min-height:500px;box-shadow:0 4px 16px rgba(0,0,0,0.08);overflow:hidden;">
        <div style="padding:10px 14px;background:#fff;border-bottom:1px solid #e5ebe5;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
            <div style="display:flex;align-items:center;gap:10px;">
                <button onclick="window.closeGroupChat()" style="border:none;background:none;font-size:20px;color:#333;cursor:pointer;padding:0 4px;">❮</button>
                <div>
                    <div style="font-weight:700;font-size:15px;">${escapeHtml(grp.name)} <span style="font-size:12px;color:#888;">(${(grp.members || []).length})</span></div>
                    <div style="font-size:11px;color:#888;">${grp.desc ? escapeHtml(grp.desc.slice(0, 18)) : '群聊自由交流'}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
                <button onclick="window.openGroupSettingsModal('${gid}')" style="border:1px solid #ddd;background:#fff;color:#555;padding:4px 8px;border-radius:8px;font-size:12px;cursor:pointer;">⚙️ 管理</button>
                <button onclick="window.triggerGroupAIReply('${gid}')" title="触发群成员回复" style="border:none;background:#ff4757;color:#fff;width:36px;height:36px;border-radius:10px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(255,71,87,0.35);">⚡</button>
            </div>
        </div>

        <div id="groupMessageArea" style="flex:1;overflow-y:auto;padding:14px;">
            ${messagesHtml || '<div style="text-align:center;color:#aaa;padding:40px 0;font-size:13px;">群里静悄悄的，点击 ➕ 开启多人共创吧！</div>'}
        </div>

        ${_stickerDrawerOpen ? buildStickerDrawerHTML('group', gid) : ''}

        <div style="padding:8px 10px;background:#fff;border-top:1px solid #e5ebe5;display:flex;gap:8px;align-items:center;flex-shrink:0;">
            <button onclick="window.openChatActionMenuModal('group', '${gid}')" title="群合作/共创视频" style="border:1px solid #ccc;background:#f8f9f8;color:#555;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">➕</button>
            <button onclick="window.toggleStickerDrawer('group', '${gid}')" title="发送表情包" style="border:1px solid #ccc;background:${_stickerDrawerOpen ? '#eaf5ea' : '#f8f9f8'};color:#555;width:36px;height:36px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">😊</button>
            <textarea id="groupChatInput" rows="1" placeholder="以 [${escapeHtml(activeAcc.name)}] 在群里发言..." style="flex:1;padding:8px 12px;border-radius:18px;border:1px solid #ddd;background:#f8faf8;font-size:14px;resize:none;outline:none;font-family:inherit;"></textarea>
            <button onclick="window.doSendGroupChat('${gid}')" style="border:none;background:var(--primary);color:#fff;padding:8px 16px;border-radius:18px;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0;">发送</button>
        </div>
    </div>
    `;
    container.innerHTML = html;

    const msgArea = document.getElementById('groupMessageArea');
    if (msgArea) msgArea.scrollTop = msgArea.scrollHeight;

    const input = document.getElementById('groupChatInput');
    if (input) {
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                window.doSendGroupChat(gid);
            }
        };
    }
}

window.doSendGroupChat = function(gid) {
    const input = document.getElementById('groupChatInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const activeAcc = getActiveAccountInfo();
    if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
    G.groupChatHistory[gid].push({
        _id: 'gmsg_' + Date.now() + '_' + rand(100, 999),
        from: 'player', senderName: activeAcc.name,
        text, time: new Date().toLocaleTimeString().slice(0, 5)
    });
    input.value = '';
    renderGroupChatWindow(document.getElementById('socialTab'));
    autoSaveGame();
};

window.openChatActionMenuModal = function(targetType, targetId) {
    const isGroup = targetType === 'group';
    const title = isGroup ? '👥 群聊互动与共创' : `🤝 与 ${escapeHtml(G.npcs[targetId]?.name || '好友')} 的互动`;

    openModal(`
        <h3>${title}</h3>
        <p style="font-size:12px;color:#666;line-height:1.5;">选择与对方展开的合作联动形式：</p>
        <div class="btn-row" style="flex-direction:column;gap:8px;margin-top:10px;">
            <button class="btn-primary" onclick="window.closeModal(); window.openCollabVideoPublishModal('${targetType}', '${targetId}')" style="width:100%;background:#e53935;">🎬 邀请一起录制拍视频 (油管共创)</button>
            <button class="btn-primary" onclick="window.closeModal(); window.handleInviteCollabStream('${targetType}', '${targetId}')" style="width:100%;background:#388e3c;">🔴 邀请一起联机开播 (连麦涨粉)</button>
            <button class="btn-secondary" onclick="closeModal()" style="width:100%;">取消</button>
        </div>
    `);
};

window.showMessageActionSheet = function(msgId, targetType, targetId) {
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
        showToast(isSeenByNpc ? '👀 对方好像已经看到了...' : '↩️ 消息已撤回', 'info', 2000);
        autoSaveGame();
    };

    document.getElementById('btnActionEdit').onclick = () => {
        closeModal();
        openModal(`
            <h3>✏️ 编辑消息</h3>
            <p style="font-size:12px;color:#666;">修改已经发送的消息：</p>
            <div class="form-group"><textarea id="editMsgTextInput" rows="3" style="width:100%;padding:8px;">${escapeHtml(msg.text)}</textarea></div>
            <div class="btn-row"><button class="btn-secondary" onclick="closeModal()">取消</button><button class="btn-primary" id="confirmSaveEditMsg">💾 保存</button></div>
        `);
        document.getElementById('confirmSaveEditMsg').onclick = () => {
            const newT = document.getElementById('editMsgTextInput').value.trim();
            if (!newT) { showToast('内容不能为空', 'error'); return; }
            msg.text = newT;
            closeModal();
            if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
            else renderGroupChatWindow(document.getElementById('socialTab'));
            showToast('✅ 消息已修改', 'success', 1500);
            autoSaveGame();
        };
    };

    document.getElementById('btnActionDelete').onclick = () => {
        closeModal();
        const idx = list.findIndex(m => m._id === msgId);
        if (idx !== -1) list.splice(idx, 1);
        if (targetType === 'single') renderSingleChatWindow(document.getElementById('socialTab'));
        else renderGroupChatWindow(document.getElementById('socialTab'));
        showToast('🗑️ 消息已删除', 'info');
        autoSaveGame();
    };
};

window.openCollabVideoPublishModal = function(targetType, targetId) {
    const isGroup = targetType === 'group';
    let participants = [];
    if (isGroup) {
        participants = (G.groups[targetId]?.members || []).map(mid => G.npcs[mid]).filter(Boolean);
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
            const sys = `你是一名游戏主播，正与搭档「${partnerNamesStr}」录制合作视频。灵感：${idea || '趣味竞技'}。生成标题和简介。\n格式：\n[TITLE]标题[/TITLE]\n[CONTENT]简介[/CONTENT]`;
            const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '请生成' }], { maxTokens: 300, temperature: 0.9 });
            const tMatch = raw.match(/\[TITLE\]([\s\S]*?)\[\/TITLE\]/);
            const cMatch = raw.match(/\[CONTENT\]([\s\S]*?)\[\/CONTENT\]/);
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
        if ((G.actionPoints || 0) < 2) { showToast('⚠️ 行动点不足 (需要 2 点)', 'error'); return; }
        G.actionPoints -= 2;

        const partnerNames = partnerIds.map(id => G.npcs[id]?.name).filter(Boolean);
        const fullTitle = `【共创】${title} (ft. ${partnerNames.join(' & ')})`;
        const videoObj = { title: fullTitle, desc: summary, isCollab: true, partners: partnerNames, views: rand(800, 3500) + partnerNames.length * 500, likes: rand(100, 800) + partnerNames.length * 80, day: G.day, comments: [] };

        if (!G.player.videos) G.player.videos = [];
        G.player.videos.push(videoObj);

        if (!G.ytExternalVideos) G.ytExternalVideos = [];
        G.ytExternalVideos.unshift({ _id: 'yt_collab_' + Date.now(), channelId: 'all', title: fullTitle, author: `${G.player.ytName} × ${partnerNames.join(' × ')}`, views: `${videoObj.views}次观看`, time: '刚刚', duration: `${rand(10, 25)}:${rand(10, 59)}`, thumbnailEmoji: '🎬', summary: summary, comments: [] });

        partnerIds.forEach(id => {
            const n = G.npcs[id];
            if (n) {
                n.favor = Math.min(100, (n.favor || 0) + rand(3, 7));
                n.memorySummary = (n.memorySummary || '') + `\n【合作拍摄】：与主角合拍了视频《${fullTitle}》。`;
            }
        });

        G.player.followers = (G.player.followers || 0) + rand(250, 900) + partnerNames.length * 150;
        G.player.money = (G.player.money || 0) + rand(60, 180);

        closeModal();
        appendStory(`🎬 你与 ${partnerNames.join('、')} 发布了共创视频《${fullTitle}》！`, '🤜 合作共创');
        addGlobalMemoryRecord(`【共创发布】：与 ${partnerNames.join('、')} 合作发布了视频《${fullTitle}》。`);
        showToast(`🎉 发布成功！`, 'success', 2500);
        if (typeof advanceTimeSlot === 'function') advanceTimeSlot();
        updateUI(); autoSaveGame(); renderSocialPanel(); checkSocialRequestsTrigger();
    };
};

window.handleInviteCollabStream = function(targetType, targetId) {
    const isGroup = targetType === 'group';
    let partnerNames = isGroup ? (G.groups[targetId]?.members || []).map(mid => G.npcs[mid]?.name).filter(Boolean) : [G.npcs[targetId]?.name].filter(Boolean);
    if (!partnerNames.length) { showToast('找不到联动搭档', 'error'); return; }
    G.pendingCollabPartners = partnerNames;
    showToast(`📺 已向 ${partnerNames.join('、')} 发出连麦邀请！`, 'success', 2500);
    switchTab('stream');
};

window.openNpcProfileCardModal = function(npcId) {
    const npc = G.npcs[npcId];
    if (!npc) return;
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
                <button class="btn-primary" onclick="window.closeModal(); window.closeChat(); window.G.phoneNav = 'moments'; window.G.momentsFilterNpcId = '${npcId}'; window.renderSocialPanel();" style="width:100%;background:#3866c4;">📱 查看 TA 的朋友圈动态</button>
                <button class="btn-secondary" onclick="window.closeModal(); window.openEditNpcModal('${npcId}');" style="width:100%;">✏️ 编辑人设与头像</button>
                <button class="btn-secondary" onclick="closeModal()" style="width:100%;">返回聊天</button>
            </div>
        </div>
    `);
};

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
            const sys = `你是精炼的角色长期记忆整理助手。请将主角与「${npc.name}」的最新对话与此前记忆提炼合并，输出一段不超过180字的精炼记忆摘要。直接输出摘要正文，严禁废话。`;
            const summary = await callMemoryAI([{ role: 'system', content: sys }, { role: 'user', content: `${prior}【需归纳的新对话】：\n${textToSummarize}` }], { maxTokens: 400, temperature: 0.35 });
            npc.memorySummary = stripThought(summary.trim());
            autoSaveGame();
            showToast(`🧠 已自动整理与 ${npc.name} 的私聊记忆！`, 'info', 2000);
        } catch (e) {
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
    if (lines.length > 1) return lines.slice(0, 5);
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

function findStickerByKeyword(kw) {
    if (!kw || !window.G.stickerLibrary) return null;
    const cleanKw = kw.trim().toLowerCase();
    return window.G.stickerLibrary.find(s => s.desc.toLowerCase().includes(cleanKw)) || null;
}

window.triggerAIReplyForSingle = async function(npcId) {
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
    let playerMomentsContext = recentPlayerPosts.length > 0 ? '【玩家最近发的朋友圈动态（可自然在私信中提起）】：\n' + recentPlayerPosts.map(p => `• "${p.body}" ${p.image ? '(附带图片)' : ''}`).join('\n') + '\n' : '';

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
        window.G.isGenerating = true;
        if (typeof showLoading === 'function') showLoading();
        const rawReply = await callAI([{ role: 'system', content: sysPrompt }, { role: 'user', content: history.length > 0 ? '请连续发送多条回复。' : '请打招呼。' }], { maxTokens: 550, temperature: 0.9 });
        if (typeof hideLoading === 'function') hideLoading();

        let cleanText = rawReply || '';
        let behindScreenActionText = '';
        const bsMatch = cleanText.match(/\[BEHIND_SCREEN\]([\s\S]*?)\[\/BEHIND_SCREEN\]/i);
        if (bsMatch) {
            behindScreenActionText = stripThought(bsMatch[1].trim());
            cleanText = cleanText.replace(/\[BEHIND_SCREEN\][\s\S]*?\[\/BEHIND_SCREEN\]/gi, '').trim();
        }

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
        await checkNpcMemorySummarize(npcId);
        autoSaveGame();
    } catch (e) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('私聊 AI 回复失败', e);
        showToast('❌ 回复失败', 'error');
    } finally {
        window.G.isGenerating = false;
        const curStatusEl = document.getElementById('chatOnlineStatusText');
        if (curStatusEl) {
            curStatusEl.innerHTML = `${isAccountBlockedByNpc(npcId, activeAcc.id) ? '<span style="color:#d32f2f;">⚠️ TA已拉黑</span>' : '● 在线'} ${npc.memorySummary ? '· 🧠记忆' : ''}`;
        }
    }
};

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
            const sys = `你是群聊记忆纪要整理员。提炼一段150字以内的核心纪要，包含八卦、共同约定、关键笑点与事件。直接输出纪要正文。`;
            const summary = await callMemoryAI([{ role: 'system', content: sys }, { role: 'user', content: `${prior}【最新群聊记录】：\n${textToSummarize}` }], { maxTokens: 350, temperature: 0.35 });
            const cleanSummary = stripThought(summary.trim());
            G.groupMemories[gid] = cleanSummary;
            (grp.members || []).forEach(mid => {
                const targetNpc = G.npcs[mid];
                if (targetNpc) targetNpc.knownGroupEvents = `【在群「${grp.name}」获悉】：${cleanSummary}`;
            });
            autoSaveGame();
            showToast(`👥 已同步提炼群聊「${grp.name}」记忆！`, 'info', 2000);
        } catch (e) {
            showMemoryFailNoticeModal(`群聊「${grp.name}」记忆`, e.message);
        } finally {
            grp._summarizing = false;
        }
    }
}

window.triggerGroupAIReply = async function(gid) {
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
        if (m._recalled) return m._seenByNpc ? `[群提示: ${m.senderName}发了"${m._originalText}"，又撤回了，但被群友看到了]` : `[群提示: ${m.senderName}撤回了一条消息]`;
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
                    const sys = `你是主播「${st.name}」，人设：${st.persona}。你正在群聊「${grp.name}」中。自然发一句群聊回复。只输出简明正文，不要包含引号或角色名前缀。`;
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
                } catch(err) { console.warn(`主播 ${st.name} 单独回复失败:`, err); }
            }
        }

        if (grp.streamerMode !== 'separate' || (activeFans.length && generatedCount === 0)) {
            const memberPoolDesc = activeList.map(mid => {
                const n = G.npcs[mid];
                return n ? `【${n.name}】(${n.persona || '群友'})` : null;
            }).filter(Boolean).join('、');
            const sys = `你正在模拟 Minecraft 主播/粉丝群聊「${grp.name}」。群内可发言成员：${memberPoolDesc}。
挑选 1 到 3 位成员进行真实自然的接话或吐槽互动。
【格式规范】每行一条，格式：[MSG name=成员名字]发言内容[/MSG]`;
            const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: `【群聊最近动态】：\n${recent}\n请接话：` }], { maxTokens: 600, temperature: 0.95 });

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
        showToast('❌ 群聊生成失败', 'error');
    } finally {
        G.isGenerating = false;
    }
};

// ============================================================
// 🎨 表情包抽屉逻辑
// ============================================================
function buildStickerDrawerHTML(targetType, targetId) {
    ensureStickersLoaded();
    const cats = window.G.stickerCategories || ['猪猪', '默认'];
    const activeCat = window.G.activeStickerCategory || cats[0];
    const stickers = (window.G.stickerLibrary || []).filter(s => s.category === activeCat);

    let tabsHtml = cats.map(c => `
        <button class="stk-tab-btn ${c === activeCat ? 'active' : ''}" onclick="window.switchStickerCategory('${escapeHtml(c)}', '${targetType}')" style="padding:4px 9px;font-size:11px;font-weight:700;border:1px solid ${c === activeCat ? 'var(--primary)' : '#ccc'};border-radius:6px;background:${c === activeCat ? '#eaf5ea' : '#fff'};color:${c === activeCat ? 'var(--primary)' : '#555'};cursor:pointer;white-space:nowrap;">
            ${escapeHtml(c)}
        </button>
    `).join('');

    let gridHtml = `
        <div class="stk-item-card" onclick="window.openImportStickersModal('${targetType}', '${targetId}')" style="height:62px;border:1.5px dashed #aaa;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;background:#fafafa;">
            <span style="font-size:20px;color:#888;">➕</span>
            <span style="font-size:9.5px;color:#888;margin-top:2px;">添加</span>
        </div>
    `;

    stickers.forEach((stk) => {
        gridHtml += `
        <div class="stk-item-card stk-send-btn" onclick="window.sendStickerMessage('${targetType}', '${targetId}', {desc: '${escapeHtml(stk.desc)}', url: '${escapeHtml(stk.url)}'})" style="height:62px;border:1px solid #e0e0e0;border-radius:6px;padding:2px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;cursor:pointer;background:#fff;overflow:hidden;" title="${escapeHtml(stk.desc)}">
            <img src="${stk.url}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">
        </div>
        `;
    });

    return `
    <div id="stickerDrawerContainer" style="background:#f4f6f4;border-top:1px solid #ddd;padding:6px 8px;height:165px;display:flex;flex-direction:column;box-sizing:border-box;flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:5px;overflow-x:auto;padding-bottom:5px;border-bottom:1px solid #e2e8e2;flex-shrink:0;">
            ${tabsHtml}
            <button onclick="window.openCreateStickerCategoryModal('${targetType}', '${targetId}')" title="新建分组" style="border:1px solid #bbb;background:#fff;padding:3px 7px;border-radius:6px;font-size:10.5px;cursor:pointer;white-space:nowrap;">✏️ 新分类</button>
        </div>
        <div style="flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill, minmax(52px, 1fr));gap:6px;padding-top:6px;">
            ${gridHtml}
        </div>
    </div>
    `;
}

window.switchStickerCategory = function(cat, type) {
    window.G.activeStickerCategory = cat;
    const cont = document.getElementById('socialTab');
    if (type === 'single') renderSingleChatWindow(cont);
    else renderGroupChatWindow(cont);
};

window.openCreateStickerCategoryModal = function(targetType, targetId) {
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
};

window.openImportStickersModal = function(targetType, targetId) {
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
};

window.sendStickerMessage = function(targetType, targetId, stickerObj) {
    const curAcc = getActiveAccountInfo();
    const msg = {
        _id: 'cstk_' + Date.now() + '_' + rand(100, 999),
        from: 'player',
        senderName: curAcc.name, 
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
};

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

window.toggleMomentLike = function(id) {
    const item = (G.feed || []).find(f => f.id === id);
    if (!item) return;
    item.liked = !item.liked;
    item.likes = (item.likes || 0) + (item.liked ? 1 : -1);
    renderSocialPanel();
    autoSaveGame();
};

window.deleteMoment = function(id) {
    if (confirm('确定删除这条动态吗？')) {
        G.feed = (G.feed || []).filter(f => f.id !== id);
        showToast('🗑️ 动态已删除', 'info', 1200);
        renderSocialPanel();
        autoSaveGame();
    }
};

window.recallMoment = function(id) {
    if (!G.feed) return;
    const itemIdx = G.feed.findIndex(f => f.id === id);
    if (itemIdx === -1) return;
    const item = G.feed[itemIdx];
    const isSeen = Math.random() < 0.5;
    G.feed.splice(itemIdx, 1);
    if (isSeen) {
        showToast('👀 你撤回了动态，但有好友在你撤回前正好看到了！', 'info', 3000);
        addGlobalMemoryRecord(`【朋友圈撤回】：撤回动态"${item.body.slice(0, 20)}"被发现。`);
    } else {
        showToast('↩️ 动态已悄悄撤回，没人发现', 'success', 2000);
    }
    renderSocialPanel();
    autoSaveGame();
};

window.openEditMomentModalById = function(id) {
    const item = (G.feed || []).find(f => f.id === id);
    if (item) openEditMomentModal(item);
};

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

window.jumpToMomentCard = function(momentId) {
    window.G.currentChatNpc = null; window.G.phoneNav = 'moments'; window.G.momentsFilterNpcId = null; renderSocialPanel();
    setTimeout(() => {
        const card = document.querySelector(`.moment-card[data-id="${momentId}"]`);
        if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }, 150);
};

// ============================================================
// 暴露全部全局函数（保障跨文件调用绝不报错）
// ============================================================
window.renderSocialPanel = renderSocialPanel;
window.openAccountManagerModal = openAccountManagerModal;
window.receiveFriendRequest = receiveFriendRequest;
window.deleteAltAccount = deleteAltAccount;
window.triggerGenerateFriendsFeed = triggerGenerateFriendsFeed;
window.detectPlayerTimezoneInfo = detectPlayerTimezoneInfo;
window.formatNpcTimezoneContext = formatNpcTimezoneContext;
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
window.triggerAiCommentForMoment = triggerAiCommentForMoment;
window.buildMomentsHTML = buildMomentsHTML;
window.openPostMomentModal = openPostMomentModal;
window.openEditMomentModal = openEditMomentModal;
window.openShareMomentModal = openShareMomentModal;
window.addMomentComment = addMomentComment;
window.replyMomentComment = replyMomentComment;
window.openMemoryModal = openMemoryModal;
window.renderMemoryModalView = renderMemoryModalView;
window.executeManualAiSummary = executeManualAiSummary;
window.openManualMemoryInputModal = openManualMemoryInputModal;
window.renderDashboard = renderDashboard;
window.sendReply = sendReply;