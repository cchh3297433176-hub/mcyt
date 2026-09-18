// js/04-game-core-2.js
// 成就系统、商店、数据面板、主页Dashboard、朋友圈Moments、好友申请处理、时区时钟、回忆录
// （旧版大模型硬性记忆总结系统已全面剔除，统一交由独立 App 忆海 Rememori 接管）
// ============================================================

// 🐷 表情包底层数据字典与兼容初始化
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
// 📱 核心手势引擎：短按触发与长按精准防抖
// ============================================================
function bindLongPressEvent(element, onClick, onLongPress, threshold = 450) {
    if (!element) return;
    let timer = null;
    let startX = 0, startY = 0;
    let isLongPressTriggered = false;
    let isMoved = false;
    let lastTouchTime = 0;

    element.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) return;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        isLongPressTriggered = false;
        isMoved = false;

        timer = setTimeout(() => {
            isLongPressTriggered = true;
            if (window.navigator && typeof window.navigator.vibrate === 'function') {
                try { window.navigator.vibrate(40); } catch(ex){}
            }
            if (typeof onLongPress === 'function') onLongPress(e);
        }, threshold);
    }, { passive: true });

    element.addEventListener('touchmove', (e) => {
        if (!timer && !isLongPressTriggered) return;
        const touch = e.touches[0];
        if (Math.hypot(touch.clientX - startX, touch.clientY - startY) > 8) {
            isMoved = true;
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        }
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
        lastTouchTime = Date.now();
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (isLongPressTriggered) {
            e.preventDefault();
            return;
        }
        if (!isMoved) {
            if (typeof onClick === 'function') {
                e.preventDefault();
                onClick(e);
            }
        }
    });

    element.addEventListener('touchcancel', () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        isLongPressTriggered = false;
        isMoved = false;
    });

    element.addEventListener('click', (e) => {
        if (Date.now() - lastTouchTime < 400) return;
        if (!isLongPressTriggered && typeof onClick === 'function') {
            onClick(e);
        }
    });

    element.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof onLongPress === 'function') onLongPress(e);
        return false;
    });
}
window.bindLongPressEvent = bindLongPressEvent;

// ============================================================
// 🏆 成就系统
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
    if (typeof appendStory === 'function') appendStory(`🏆 解锁成就「${ach.name}」！获得 ${ach.reward} 金币奖励。`, '🏆 成就');
    if (typeof addMemoir === 'function') addMemoir('成就解锁', `${ach.name} (${ach.desc})`);
    if (typeof showToast === 'function') showToast(`🏆 解锁成就：${ach.name}！`, 'success', 4000);
    addGlobalMemoryRecord(`【成就达成】：${G.player.ytName} 成功解锁成就「${ach.name}」（${ach.desc}），获得 ${ach.reward} 金币。`);
    if (typeof updateUI === 'function') updateUI();
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
// 📢 赞助商/广告商系统与商店
// ============================================================
function generateSponsorOffer() {
    if ((G.player.followers || 0) < 10000) return;
    if (G.sponsorCooldown > 0) { G.sponsorCooldown--; return; }
    if (G.sponsorOffers && G.sponsorOffers.length > 0) return;
    if (typeof SPONSOR_TYPES === 'undefined') return;
    if (Math.random() < 0.15) {
        const type = pick(SPONSOR_TYPES);
        G.sponsorOffers = [{ ...type, expires: G.day + 5, accepted: false }];
        if (typeof showToast === 'function') showToast('📢 新的赞助合作邀请已到达！', 'success', 3000);
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
    const pName = G.player.ytName || '主播';
    if (risk) {
        const loss = rand(50, 300);
        G.player.followers = Math.max(0, G.player.followers - loss);
        if (typeof appendStory === 'function') appendStory(`⚠️ ${pName} 接受了 ${offer.name} 的赞助，但部分粉丝觉得推广太多，流失了 ${loss} 人。`, '📢 赞助风险');
        if (typeof showToast === 'function') showToast(`⚠️ 赞助推广导致 ${loss} 粉丝流失`, 'error', 3000);
        addGlobalMemoryRecord(`【商业赞助】：${pName} 接受 ${offer.name} 商业推广获得 ${reward} 金币，粉丝流失 ${loss} 人。`);
    } else {
        const gain = rand(20, 100);
        G.player.followers += gain;
        if (typeof appendStory === 'function') appendStory(`✅ ${pName} 接受了 ${offer.name} 的赞助，获得 ${reward} 金币，粉丝增长了 ${gain} 人！`, '📢 赞助成功');
        if (typeof showToast === 'function') showToast(`✅ 赞助合作成功！获得 ${reward} 金币`, 'success', 3000);
        addGlobalMemoryRecord(`【商业赞助】：${pName} 与 ${offer.name} 达成广告合作，收益 ${reward} 金币，涨粉 ${gain} 人。`);
    }
    G.sponsorCooldown = 5;
    G.sponsorOffers = [];
    if (typeof addMemoir === 'function') addMemoir('赞助合作', `${offer.name} (${reward}金币)`);
    if (typeof updateUI === 'function') updateUI();
    renderShop(); checkAchievements();
    if (typeof autoSaveGame === 'function') autoSaveGame();
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
    if (!item || (G.player.money || 0) < item.cost) { if (typeof showToast === 'function') showToast('金币不足', 'error'); return; }
    G.player.money -= item.cost;
    item.effect();
    if (typeof updateUI === 'function') updateUI();
    renderShop();
    if (typeof showToast === 'function') showToast('✅ 购买成功！', 'success');
    if (typeof addMemoir === 'function') addMemoir('商店购买', `购买了 ${item.label}`);
    if (typeof autoSaveGame === 'function') autoSaveGame();
};

window.upgradeEquip = function() {
    const equipCosts = [0, 500, 1500, 4000, 8000, 15000];
    const level = G.player.equipmentLevel || 1;
    if (level >= 5) { if (typeof showToast === 'function') showToast('已满级', 'error'); return; }
    const cost = equipCosts[level];
    if ((G.player.money || 0) < cost) { if (typeof showToast === 'function') showToast('金币不足', 'error'); return; }
    G.player.money -= cost;
    G.player.equipmentLevel = level + 1;
    if (typeof updateUI === 'function') updateUI();
    renderShop();
    if (typeof showToast === 'function') showToast(`🎥 设备升级至 ${G.player.equipmentLevel} 级！`, 'success');
    if (typeof addMemoir === 'function') addMemoir('设备升级', `直播设备升级至 ${G.player.equipmentLevel} 级`);
    if (typeof autoSaveGame === 'function') autoSaveGame();
};

window.acceptSponsor = acceptSponsor;

// ============================================================
// 📊 主页看板 (Dashboard) 与视频收藏评论系统
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
                                <b>${escapeHtml(r.author || '主播')}:</b> ${escapeHtml(r.text)}
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

        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
            <button onclick="window.switchTab('story')" style="border:none;background:#fff;border-radius:10px;padding:10px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.04);cursor:pointer;border:1px solid #edf2ed;">
                <div style="font-size:20px;margin-bottom:3px;">📖</div>
                <div style="font-size:12px;font-weight:700;color:#333;">主线剧情</div>
            </button>
            <button onclick="window.switchTab('stream')" style="border:none;background:#fff;border-radius:10px;padding:10px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.04);cursor:pointer;border:1px solid #edf2ed;">
                <div style="font-size:20px;margin-bottom:3px;">🔴</div>
                <div style="font-size:12px;font-weight:700;color:#333;">联机开播</div>
            </button>
            <button onclick="window.openPhoneApp('chat')" style="border:none;background:#fff;border-radius:10px;padding:10px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.04);cursor:pointer;border:1px solid #edf2ed;">
                <div style="font-size:20px;margin-bottom:3px;">💬</div>
                <div style="font-size:12px;font-weight:700;color:#333;">微信聊天</div>
            </button>
        </div>

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
            if (typeof showToast === 'function') showToast('已取消收藏视频', 'info', 1200);
        } else {
            G.collections.videos.push(id);
            if (typeof showToast === 'function') showToast('⭐ 视频已加入收藏！', 'success', 1500);
        }
    }
    renderDashboard();
    if (typeof autoSaveGame === 'function') autoSaveGame();
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
    const pName = G.player.ytName || '主播';
    
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
        if (!text) { if (typeof showToast === 'function') showToast('内容不能为空', 'error'); return; }
        if (!targetCom.replies) targetCom.replies = [];
        targetCom.replies.push({ author: pName, text, time: '刚刚' });
        closeModal();
        if (typeof showToast === 'function') showToast('✅ 回复成功！', 'success', 1500);
        renderDashboard();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };
};

window.renderDashboard = renderDashboard;

// ============================================================
// 📈 数据面板
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
            <div class="npc-card" onclick="window.openPhoneApp('chat'); setTimeout(()=>window.openChat('${id}'), 60);">
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
window.renderDataPanel = renderDataPanel;

// ============================================================
// 🧠 记忆系统适配桩（旧代码兼容与事件转接）
// ============================================================
function ensureNpcIntegrity() {
    if (!G.npcs) G.npcs = {};
    if (!G.chatHistory) G.chatHistory = {};
    for (const [id, npc] of Object.entries(G.npcs)) {
        if (!npc.id) npc.id = id;
        if (!npc.name) npc.name = id;
        if (npc.favor === undefined) npc.favor = 50;
    }
}

// 轻量事件钩子：保留接口，便于全局成就与赞助商调用，不阻断旧代码
function addGlobalMemoryRecord(text) {
    if (!text) return;
    if (!window._recentGlobalEvents) window._recentGlobalEvents = [];
    window._recentGlobalEvents.push({ text: text.trim(), time: Date.now() });
    if (window._recentGlobalEvents.length > 30) window._recentGlobalEvents.shift();
}

// 平滑重定向：将旧有的 openMemoryModal 统一引导至全新的忆海 (Rememori) 独立 App
window.openMemoryModal = function() {
    if (typeof window.openPhoneApp === 'function') {
        window.openPhoneApp('rememori');
    }
};

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
    if (typeof showToast === 'function') showToast(`🔀 已切换账号为：${getActiveAccountInfo().name}`, 'info', 1800);
    if (typeof renderChatApp === 'function') renderChatApp();
    if (typeof autoSaveGame === 'function') autoSaveGame();
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
                    <div style="font-weight:700;font-size:13px;">${escapeHtml(alt.name)} <span style="font-size:10px;color:#2e7d32;background:#e8f5e9;padding:1px 4px;border-radius:4px;font-weight:700;">小号</span></div>
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
        <p style="font-size:12px;color:#666;line-height:1.6;">每个账号拥有完全独立的私聊记录。某个小号被拉黑后，可继续注册新小号联系！</p>
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
    if (!name) { if (typeof showToast === 'function') showToast('⚠️ 请填写小号名称', 'error'); return; }
    if (!G.altAccounts) G.altAccounts = [];
    const newAlt = { id: 'alt_' + Date.now(), name, bio: document.getElementById('altBioInput').value.trim() || '路人小号', avatar: null, createdAt: G.day };
    G.altAccounts.push(newAlt);
    G.currentAccountId = newAlt.id;
    if (typeof showToast === 'function') showToast(`🎉 小号「${name}」注册成功！`, 'success', 2500);
    closeModal();
    if (typeof renderChatApp === 'function') renderChatApp();
    if (typeof autoSaveGame === 'function') autoSaveGame();
};

window.deleteAltAccount = function(altId) {
    if (!confirm('确定要注销这个小号吗？')) return;
    G.altAccounts = (G.altAccounts || []).filter(a => a.id !== altId);
    if (G.currentAccountId === altId) G.currentAccountId = 'main';
    if (typeof showToast === 'function') showToast('🗑️ 小号已注销', 'info');
    window.openAccountManagerModal();
    if (typeof autoSaveGame === 'function') autoSaveGame();
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
            if (typeof showToast === 'function') showToast(`📬 顶级主播「${npc.name}」向你发来了好友申请！`, 'success', 3500);
            addGlobalMemoryRecord(`【社交突破】：知名MC主播「${npc.name}」关注到 ${G.player.ytName}，主动递来好友申请。`);
        }
    }

    if (followers >= 5000 && !G.groups['fan_club_1'] && !G.groupInvites.some(gi => gi.gid === 'fan_club_1')) {
        G.groupInvites.push({ _id: 'ginv_' + Date.now(), gid: 'fan_club_1', name: '🎉 主播后援会 1 号群', desc: '由核心粉丝自发的专属后援讨论基地！', avatarEmoji: '👑', inviter: '狂热铁粉' });
        if (typeof showToast === 'function') showToast('👥 收到粉丝自建后援群的加入邀请！', 'info', 3000);
    }
}
window.checkSocialRequestsTrigger = checkSocialRequestsTrigger;

function detectPlayerTimezoneInfo() {
    const cfg = G.clockConfig || {};
    const mode = cfg.mode || 'game';
    let country = cfg.customCountry || '中国 (东八区 UTC+8)';
    let timeSlotDesc = getTimeSlotName(G.timeSlot);
    let timeStr = '';

    if (mode === 'real') {
        const now = new Date();
        const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        timeStr = `现实时间 ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')} · ${days[now.getDay()]}`;
    } else if (mode === 'custom') {
        timeStr = cfg.customTimeStr || `第 ${G.day} 天 · 自定义时间`;
    } else {
        timeStr = `游戏第 ${G.day} 天 · ${timeSlotDesc}`;
    }

    return { mode, country, timeStr, slotName: timeSlotDesc, day: G.day };
}

function formatNpcTimezoneContext() {
    const pTz = detectPlayerTimezoneInfo();
    return `\n【时区与时间上下文】：玩家当前所在地/时区：${pTz.country}，当前时间状态：${pTz.timeStr}。请自然体现真实时差、作息与生活互动反应。\n`;
}

function renderAvatarBadge(obj, size = 44) {
    const url = (obj && obj.isPlayer) ? G.player.avatar : (obj && obj.avatarUrl);
    const emoji = (obj && obj.isPlayer) ? '🧑' : ((obj && obj.avatarEmoji) || '👤');
    if (url) return `<img src="${url}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;display:block;">`;
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#eaf2ea;display:flex;align-items:center;justify-content:center;font-size:${Math.floor(size*0.45)}px;flex-shrink:0;">${emoji}</div>`;
}

// ============================================================
// 🌟 朋友圈 (Moments) 子系统实现
// ============================================================
function buildMomentsHTML() {
    if (!G.feed) G.feed = [];
    const filterNpcId = G.momentsFilterNpcId;
    const filterNpc = filterNpcId ? G.npcs[filterNpcId] : null;

    let filterBanner = '';
    if (filterNpc) {
        filterBanner = `
        <div style="background:#e8f5e9;padding:8px 12px;font-size:12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #c8e6c9;">
            <span>📸 正在查看 <b>${escapeHtml(filterNpc.name)}</b> 的朋友圈空间</span>
            <button onclick="window.G.momentsFilterNpcId = null; if(typeof renderChatApp==='function')renderChatApp();" style="border:none;background:#2e7d32;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;cursor:pointer;">查看全部</button>
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
            点击右上角<b>「发布」</b>或<b>「刷新」</b>打破沉默吧！
        </div>`;
    } else {
        feedList.forEach(m => {
            const isSelf = m.isPlayer || (m.author === G.player.ytName) || (G.altAccounts || []).some(a => a.name === m.author);
            const isLiked = !!m.liked;
            const comments = m.comments || [];

            let commentsBoxHtml = '';
            if (comments.length > 0) {
                const comLines = comments.map((c) => `
                    <div style="font-size:12px;line-height:1.5;margin-bottom:3px;">
                        <span style="color:#2e7d32;font-weight:700;cursor:pointer;" onclick="window.replyMomentComment(${m.id}, '${escapeHtml(c.name || '好友')}')">${escapeHtml(c.name || '好友')}:</span>
                        <span style="color:#333;">${escapeHtml(c.text)}</span>
                    </div>
                `).join('');
                commentsBoxHtml = `
                <div style="background:#f4f7f4;border-radius:6px;padding:6px 10px;margin-top:8px;border:1px solid #e9f0e9;">
                    ${comLines}
                </div>`;
            }

            let mediaHtml = '';
            if (m.imageMode === 'text_only' && m.imageDesc) {
                mediaHtml = `
                <div style="margin:6px 0;background:#f3f6f3;border-left:3px solid #7cb342;padding:6px 10px;border-radius:4px;font-size:12px;color:#558b2f;">
                    🖼️ <b>[配图]</b> ${escapeHtml(m.imageDesc)}
                </div>`;
            } else if (m.image) {
                mediaHtml = `
                <div style="margin:6px 0;">
                    <img src="${m.image}" style="max-width:100%;max-height:180px;border-radius:8px;object-fit:cover;display:block;">
                    ${m.imageDesc ? `<div style="font-size:11px;color:#777;margin-top:2px;">📝 ${escapeHtml(m.imageDesc)}</div>` : ''}
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
                        ${mediaHtml}
                        
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
            <textarea id="postMomentBody" rows="3" placeholder="分享此刻的MC游玩心情、直播预告或趣事..." style="width:100%;padding:8px;font-size:13.5px;"></textarea>
        </div>

        <div class="form-group" style="margin-top:6px;">
            <label style="font-size:12px;font-weight:700;">配图模式选择：</label>
            <div style="display:flex;flex-direction:column;gap:5px;font-size:12.5px;margin-top:4px;">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="radio" name="momentPicMode" value="none" checked> 无配图纯文字
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="radio" name="momentPicMode" value="image_real"> 选择相册图片
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="radio" name="momentPicMode" value="text_only"> 文字代替图片（省Token）
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="radio" name="momentPicMode" value="image_with_desc"> 图片加文字描述
                </label>
            </div>
        </div>

        <div id="momentImgSection" style="display:none;margin-top:6px;background:#f7faf7;padding:8px;border-radius:8px;border:1px solid #e0ede0;">
            <label style="font-size:12px;">选择本地图片：</label>
            <div style="margin-top:4px;">
                <label class="upload-btn" style="cursor:pointer;padding:6px 12px;font-size:12px;display:inline-block;">
                    从相册选择
                    <input type="file" id="postMomentFileInput" accept="image/*" style="display:none;">
                </label>
            </div>
            <div id="momentImgPreviewWrap" style="margin-top:6px;display:none;">
                <img id="momentImgPreview" style="max-height:80px;border-radius:6px;object-fit:cover;">
            </div>
        </div>

        <div id="momentDescSection" style="display:none;margin-top:6px;background:#f7faf7;padding:8px;border-radius:8px;border:1px solid #e0ede0;">
            <label style="font-size:12px;">配图文字描绘（AI将读取这段描述产生互动）：</label>
            <input type="text" id="postMomentImgDesc" placeholder="如：在下界堡垒残血对视的截图..." style="width:100%;padding:6px;font-size:12px;margin-top:4px;">
        </div>

        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnConfirmPublishMoment">发布动态</button>
        </div>
    `);

    let localImgData = '';
    const radios = document.querySelectorAll('input[name="momentPicMode"]');
    const imgSec = document.getElementById('momentImgSection');
    const descSec = document.getElementById('momentDescSection');

    radios.forEach(r => {
        r.onchange = () => {
            const v = r.value;
            imgSec.style.display = (v === 'image_real' || v === 'image_with_desc') ? 'block' : 'none';
            descSec.style.display = (v === 'text_only' || v === 'image_with_desc') ? 'block' : 'none';
        };
    });

    document.getElementById('postMomentFileInput').onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            localImgData = evt.target.result;
            const prev = document.getElementById('momentImgPreview');
            const wrap = document.getElementById('momentImgPreviewWrap');
            if (prev && wrap) {
                prev.src = localImgData;
                wrap.style.display = 'block';
            }
            if (typeof showToast === 'function') showToast('✅ 图片已载入', 'success', 1200);
        };
        reader.readAsDataURL(file);
    };

    document.getElementById('btnConfirmPublishMoment').onclick = () => {
        const body = document.getElementById('postMomentBody').value.trim();
        const mode = document.querySelector('input[name="momentPicMode"]:checked')?.value || 'none';
        const imgDesc = document.getElementById('postMomentImgDesc')?.value.trim();

        if (!body) { if (typeof showToast === 'function') showToast('请填写动态文字内容', 'error'); return; }

        let finalImg = null;
        if (mode === 'image_real' || mode === 'image_with_desc') {
            finalImg = localImgData || null;
        }

        if (!G.feed) G.feed = [];
        const newMoment = {
            id: Date.now() + rand(100, 999),
            author: curAcc.name,
            avatar: curAcc.avatar,
            isPlayer: true,
            body,
            imageMode: mode,
            image: finalImg,
            imageDesc: imgDesc || null,
            time: '刚刚',
            liked: false,
            likes: 0,
            comments: []
        };
        G.feed.unshift(newMoment);
        closeModal();
        if (typeof showToast === 'function') showToast('🎉 动态已成功发布！', 'success', 2000);
        addGlobalMemoryRecord(`【玩家朋友圈】：${curAcc.name} 发布了动态「${body.slice(0, 20)}...」`);
        if (typeof renderChatApp === 'function') renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
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
            <label style="font-size:12px;">配图文字描述：</label>
            <input type="text" id="editMomentDesc" value="${escapeHtml(item.imageDesc || '')}">
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnConfirmSaveMomentEdit">💾 保存修改</button>
        </div>
    `);

    document.getElementById('btnConfirmSaveMomentEdit').onclick = () => {
        const body = document.getElementById('editMomentBody').value.trim();
        const desc = document.getElementById('editMomentDesc').value.trim();
        if (!body) { if (typeof showToast === 'function') showToast('内容不能为空', 'error'); return; }
        item.body = body;
        item.imageDesc = desc || null;
        closeModal();
        if (typeof showToast === 'function') showToast('✅ 动态已修改', 'success', 1500);
        if (typeof renderChatApp === 'function') renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
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
        if (!text) { if (typeof showToast === 'function') showToast('评论不能为空', 'error'); return; }
        const item = (G.feed || []).find(f => f.id === momentId);
        if (item) {
            if (!item.comments) item.comments = [];
            item.comments.push({ name: curAcc.name, text, time: '刚刚' });
            closeModal();
            if (typeof showToast === 'function') showToast('✅ 评论已发表！', 'success', 1200);
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof autoSaveGame === 'function') autoSaveGame();
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
        if (!text) { if (typeof showToast === 'function') showToast('内容不能为空', 'error'); return; }
        const item = (G.feed || []).find(f => f.id === momentId);
        if (item) {
            if (!item.comments) item.comments = [];
            item.comments.push({ name: curAcc.name, text: `回复 @${replyToName} : ${text}`, time: '刚刚' });
            closeModal();
            if (typeof showToast === 'function') showToast('✅ 回复已发表！', 'success', 1200);
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof autoSaveGame === 'function') autoSaveGame();
        }
    };
};

window.openShareMomentModal = function(momentId) {
    const item = (G.feed || []).find(f => f.id === momentId);
    if (!item) return;
    const npcs = Object.entries(G.npcs || {});
    const groups = Object.entries(G.groups || {});

    if (!npcs.length && !groups.length) {
        if (typeof showToast === 'function') showToast('暂无好友或群聊可供转发', 'info');
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
            if (typeof showToast === 'function') showToast(`✅ 已转发给 ${G.npcs[npcId]?.name}！`, 'success', 2000);
        } else if (val.startsWith('group_')) {
            const gid = val.replace('group_', '');
            if (!G.groupChatHistory[gid]) G.groupChatHistory[gid] = [];
            G.groupChatHistory[gid].push(msgObj);
            if (typeof showToast === 'function') showToast(`✅ 已转发至群聊！`, 'success', 2000);
        }
        closeModal();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };
};

window.triggerGenerateFriendsFeed = async function() {
    const npcList = Object.values(G.npcs || {});
    if (!npcList.length) {
        if (typeof showToast === 'function') showToast('通讯录暂无好友，先添加好友才能刷出动态哦！', 'info', 2500);
        return;
    }
    const pickedNpcs = npcList.sort(() => 0.5 - Math.random()).slice(0, rand(1, 2));
    if (typeof showToast === 'function') showToast('✨ 正在刷新好友朋友圈...', 'info', 1500);
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
        if (typeof showToast === 'function') showToast('🎉 好友动态已刷新！', 'success', 1500);
        if (typeof renderChatApp === 'function') renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    } catch(e) {
        console.error('刷出朋友圈动态失败', e);
        if (typeof showToast === 'function') showToast('❌ 刷新朋友圈动态失败', 'error');
    }
};

window.triggerAiCommentForMoment = async function(momentId) {
    const item = (G.feed || []).find(f => f.id === momentId);
    if (!item) return;
    const npcList = Object.values(G.npcs || {});
    if (!npcList.length) {
        if (typeof showToast === 'function') showToast('通讯录暂无好友接话', 'info');
        return;
    }
    const candidates = npcList.filter(n => n.name !== item.author);
    const speaker = candidates.length ? pick(candidates) : npcList[0];
    if (typeof showToast === 'function') showToast(`🤖 ${speaker.name} 正在赶来评论...`, 'info', 1200);

    let picPrompt = '';
    if (item.imageMode === 'text_only' && item.imageDesc) {
        picPrompt = `\n【该动态附带了画面描述】：${item.imageDesc}`;
    } else if (item.imageMode === 'image_with_desc' && item.imageDesc) {
        picPrompt = `\n【该动态配图内容描述】：${item.imageDesc}`;
    } else if (item.image) {
        picPrompt = `\n【该动态附带了一张MC游玩截图】`;
    }

    try {
        const sys = `你正在扮演 Minecraft 主播「${speaker.name}」（性格：${speaker.persona || '好友'}，好感度：${speaker.favor || 50}）。
现在好友「${item.author}」发了一条朋友圈：“${item.body}”。${picPrompt}
请根据你们的关系人设与动态内容（以及配图描述），发一句真实鲜活、极简接地气的评论（15~35字），可吐槽、调侃或关心。直接输出评论文字。`;
        const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '写一条评论' }], { maxTokens: 100, temperature: 0.9 });
        const clean = stripThought(raw.trim());
        if (clean) {
            if (!item.comments) item.comments = [];
            item.comments.push({ name: speaker.name, text: clean, time: '刚刚' });
            item.likes = (item.likes || 0) + 1;
            if (typeof showToast === 'function') showToast(`💬 ${speaker.name} 发表了评论！`, 'success', 1500);
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof autoSaveGame === 'function') autoSaveGame();
        }
    } catch(e) {
        if (typeof showToast === 'function') showToast('评论生成失败', 'error');
    }
};

// ============================================================
// 🎬 共创与连麦弹窗
// ============================================================
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
        <label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;background:#f4f7f4;padding:4px 8px;border-radius:12px;margin:2px;">
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
        if (typeof showToast === 'function') showToast('🤖 AI 正在构思...', 'info', 1500);
        try {
            const sys = `你是一名游戏主播，正与搭档「${partnerNamesStr}」录制合作视频。灵感：${idea || '趣味竞技'}。生成标题和简介。\n格式：\n[TITLE]标题[/TITLE]\n[CONTENT]简介[/CONTENT]`;
            const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '请生成' }], { maxTokens: 300, temperature: 0.9 });
            const tMatch = raw.match(/\[TITLE\]([\s\S]*?)\[\/TITLE\]/);
            const cMatch = raw.match(/\[CONTENT\]([\s\S]*?)\[\/CONTENT\]/);
            if (tMatch) document.getElementById('collabVideoTitle').value = tMatch[1].trim();
            if (cMatch) document.getElementById('collabVideoSummary').value = cMatch[1].trim();
            if (typeof showToast === 'function') showToast('✅ 文案已生成！', 'success', 1200);
        } catch(e) { if (typeof showToast === 'function') showToast('❌ AI 生成失败', 'error'); }
    };

    document.getElementById('btnPublishCollabVideo').onclick = () => {
        const title = document.getElementById('collabVideoTitle').value.trim();
        const summary = document.getElementById('collabVideoSummary').value.trim();
        const partnerIds = Array.from(document.querySelectorAll('.collab-partner-check:checked')).map(cb => cb.value);

        if (!title || !summary || !partnerIds.length) { if (typeof showToast === 'function') showToast('⚠️ 资料不全', 'error'); return; }
        if ((G.actionPoints || 0) < 2) { if (typeof showToast === 'function') showToast('⚠️ 行动点不足 (需要 2 点)', 'error'); return; }
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
            }
        });

        G.player.followers = (G.player.followers || 0) + rand(250, 900) + partnerNames.length * 150;
        G.player.money = (G.player.money || 0) + rand(60, 180);

        closeModal();
        if (typeof appendStory === 'function') appendStory(`🎬 ${G.player.ytName} 与 ${partnerNames.join('、')} 发布了共创视频《${fullTitle}》！`, '🤜 合作共创');
        addGlobalMemoryRecord(`【共创发布】：${G.player.ytName} 与 ${partnerNames.join('、')} 合作发布了视频《${fullTitle}》。`);
        if (typeof showToast === 'function') showToast(`🎉 发布成功！`, 'success', 2500);
        if (typeof advanceTimeSlot === 'function') advanceTimeSlot();
        if (typeof updateUI === 'function') updateUI();
        if (typeof autoSaveGame === 'function') autoSaveGame();
        checkSocialRequestsTrigger();
    };
};

window.handleInviteCollabStream = function(targetType, targetId) {
    const isGroup = targetType === 'group';
    let partnerNames = isGroup ? (G.groups[targetId]?.members || []).map(mid => G.npcs[mid]?.name).filter(Boolean) : [G.npcs[targetId]?.name].filter(Boolean);
    if (!partnerNames.length) { if (typeof showToast === 'function') showToast('找不到联动搭档', 'error'); return; }
    G.pendingCollabPartners = partnerNames;
    if (typeof showToast === 'function') showToast(`📺 已向 ${partnerNames.join('、')} 发出连麦邀请！`, 'success', 2500);
    if (typeof switchTab === 'function') switchTab('stream');
};

// ============================================================
// 🕒 游戏时钟、时区管理与回忆录
// ============================================================
function openClockSettingsModal() {
    if (!G.clockConfig) {
        G.clockConfig = {
            mode: 'game',
            customCountry: '中国 (东八区 UTC+8)',
            customTimeStr: ''
        };
    }
    const cfg = G.clockConfig;
    const curTz = detectPlayerTimezoneInfo();

    const presets = [
        '中国 (东八区 UTC+8)',
        '北美东部时区 (纽约/波士顿 UTC-5)',
        '北美太平洋时区 (洛杉矶/西雅图 UTC-8)',
        '北美中部时区 (芝加哥 UTC-6)',
        '欧洲西部/英国 (伦敦 UTC+0)',
        '欧洲中部时区 (柏林/巴黎 UTC+1)',
        '日本/韩国时区 (东京/首尔 UTC+9)',
        '澳洲东部时区 (悉尼 UTC+10)'
    ];

    const presetOptions = presets.map(p => `
        <option value="${p}" ${cfg.customCountry === p ? 'selected' : ''}>${p}</option>
    `).join('');

    openModal(`
        <h3>🕒 游戏时钟与时区管理</h3>
        <p style="font-size:12px;color:#666;">配置你当前所处时区与生活作息，NPC 在互动中将感知真实时差！</p>
        
        <div class="form-group" style="margin-top:10px;">
            <label style="font-weight:700;font-size:13px;">⏱️ 时间跟随模式：</label>
            <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;margin-top:4px;">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="radio" name="clockModeRadio" value="real" ${cfg.mode === 'real' ? 'checked' : ''}>
                    <span>🌍 <b>跟随现实时间</b>（按当前真实系统时间驱动）</span>
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="radio" name="clockModeRadio" value="game" ${cfg.mode === 'game' ? 'checked' : ''}>
                    <span>🎮 <b>跟随游戏天数与时段</b>（当前第 ${G.day} 天）</span>
                </label>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="radio" name="clockModeRadio" value="custom" ${cfg.mode === 'custom' ? 'checked' : ''}>
                    <span>✏️ <b>自定义设定时间</b></span>
                </label>
            </div>
        </div>

        <div id="clockCustomInputWrap" style="display:${cfg.mode === 'custom' ? 'block' : 'none'};margin-top:8px;">
            <label style="font-size:12px;">自定义时间描述：</label>
            <input type="text" id="clockCustomTimeInput" value="${escapeHtml(cfg.customTimeStr || '')}" placeholder="如：深夜 02:30..." style="width:100%;padding:7px;border-radius:6px;border:1px solid #ccc;font-size:12.5px;">
        </div>

        <div class="form-group" style="margin-top:12px;">
            <label style="font-weight:700;font-size:13px;">🌐 身处的地区与时区：</label>
            <select id="clockTimezonePresetSelect" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;font-size:13px;background:#fff;">
                ${presetOptions}
            </select>
        </div>

        <div style="background:#f4f7f4;padding:8px 10px;border-radius:8px;font-size:12px;color:#2e7d32;margin-top:10px;">
            <b>当前时间感知状态：</b>${escapeHtml(curTz.timeStr)} · ${escapeHtml(curTz.country)}
        </div>

        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="btnSaveClockSettings">💾 保存时间设定</button>
        </div>
    `);

    const radios = document.querySelectorAll('input[name="clockModeRadio"]');
    const customWrap = document.getElementById('clockCustomInputWrap');
    radios.forEach(r => {
        r.onchange = () => {
            customWrap.style.display = r.value === 'custom' ? 'block' : 'none';
        };
    });

    document.getElementById('btnSaveClockSettings').onclick = () => {
        const mode = document.querySelector('input[name="clockModeRadio"]:checked')?.value || 'game';
        const country = document.getElementById('clockTimezonePresetSelect').value;
        const customTimeStr = document.getElementById('clockCustomTimeInput')?.value.trim() || '';

        G.clockConfig = { mode, customCountry: country, customTimeStr };
        if (typeof showToast === 'function') showToast('✅ 游戏时钟与时区设置已生效！', 'success', 1500);
        closeModal();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };
}

window.toggleMomentLike = function(id) {
    const item = (G.feed || []).find(f => f.id === id);
    if (!item) return;
    item.liked = !item.liked;
    item.likes = (item.likes || 0) + (item.liked ? 1 : -1);
    if (typeof renderChatApp === 'function') renderChatApp();
    if (typeof autoSaveGame === 'function') autoSaveGame();
};

window.deleteMoment = function(id) {
    if (confirm('确定删除这条动态吗？')) {
        G.feed = (G.feed || []).filter(f => f.id !== id);
        if (typeof showToast === 'function') showToast('🗑️ 动态已删除', 'info', 1200);
        if (typeof renderChatApp === 'function') renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
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
        if (typeof showToast === 'function') showToast('👀 你撤回了动态，但有好友在你撤回前正好看到了！', 'info', 3000);
        addGlobalMemoryRecord(`【朋友圈撤回】：${G.player.ytName} 撤回动态"${item.body.slice(0, 20)}"被好友发现。`);
    } else {
        if (typeof showToast === 'function') showToast('↩️ 动态已悄悄撤回，没人发现', 'success', 2000);
    }
    if (typeof renderChatApp === 'function') renderChatApp();
    if (typeof autoSaveGame === 'function') autoSaveGame();
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
    window.openPhoneApp('chat');
    if (typeof window.switchWechatBottomTab === 'function') window.switchWechatBottomTab('moments');
    setTimeout(() => {
        const card = document.querySelector(`.moment-card[data-id="${momentId}"]`);
        if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }, 150);
};

// ============================================================
// 全局导出与挂载总线（确保其他业务模块安全调用）
// ============================================================
window.openAccountManagerModal = openAccountManagerModal;
window.checkSocialRequestsTrigger = checkSocialRequestsTrigger;
window.detectPlayerTimezoneInfo = detectPlayerTimezoneInfo;
window.formatNpcTimezoneContext = formatNpcTimezoneContext;
window.openClockSettingsModal = openClockSettingsModal;
window.renderMemoir = renderMemoir;
window.toggleCollection = toggleCollection;
window.toggleColVideoComments = toggleColVideoComments;
window.acceptSponsor = acceptSponsor;
window.triggerAiCommentForMoment = triggerAiCommentForMoment;
window.buildMomentsHTML = buildMomentsHTML;
window.openPostMomentModal = openPostMomentModal;
window.openEditMomentModal = openEditMomentModal;
window.openShareMomentModal = openShareMomentModal;
window.addMomentComment = addMomentComment;
window.replyMomentComment = replyMomentComment;
window.openMemoryModal = openMemoryModal;
window.renderDashboard = renderDashboard;
window.sendReply = sendReply;
window.renderAvatarBadge = renderAvatarBadge;
window.openCollabVideoPublishModal = openCollabVideoPublishModal;
window.handleInviteCollabStream = handleInviteCollabStream;
