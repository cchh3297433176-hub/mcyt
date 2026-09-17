/**
 * js/apps/chat/chat-moments.js
 * 🌟 微信朋友圈动态流独立模块
 * 职责：
 * 1. 朋友圈动态列表构建（微信极简黑白灰视觉 · 无彩色Emoji）
 * 2. 纯文字意象卡片配图模式（无需外接生图，无翻转，极轻量）
 * 3. 点赞、评论、回复、召唤互动（0ms 即刻呼出生成胶囊，绝无卡顿延迟感）
 * 4. 专属朋友圈 NPC 池管理（支持设定名字与说话风格，随机抽取互动）
 * 5. 仿微信弹窗体系与全屏滑入微动画
 */

(function() {
    'use strict';

    const MOMENTS_NPC_POOL_KEY = 'mcyt_moments_custom_npcs_v1';

    function ensureFeedLoaded() {
        if (!window.G) window.G = {};
        if (!window.G.feed) window.G.feed = [];
        if (!window.G.momentsNpcs) {
            try {
                const raw = localStorage.getItem(MOMENTS_NPC_POOL_KEY);
                window.G.momentsNpcs = raw ? JSON.parse(raw) : [
                    { name: '红石研究员', persona: '技术宅，说话喜欢用电路比喻，严谨且喜欢吐槽' },
                    { name: '迷路矿工', persona: '天天掉岩浆，说话带着哭腔和搞笑吐槽' },
                    { name: '佛系建筑党', persona: '喜欢搭小木屋和花园，说话温柔治愈，与世无争' }
                ];
            } catch (_) {
                window.G.momentsNpcs = [];
            }
        }
    }

    function saveMomentsNpcPool() {
        try {
            if (window.G && window.G.momentsNpcs) {
                localStorage.setItem(MOMENTS_NPC_POOL_KEY, JSON.stringify(window.G.momentsNpcs));
            }
        } catch (_) {}
    }

    // 微信朋友圈极简纯色顶栏生成胶囊
    function showMomentsGeneratingBanner(text = '正在生成动态...') {
        let el = document.getElementById('momentsGeneratingBanner');
        if (!el) {
            el = document.createElement('div');
            el.id = 'momentsGeneratingBanner';
            el.className = 'wechat-bg-generating-banner';
            document.body.appendChild(el);
        }
        el.innerHTML = `
            <div class="wechat-spin-ring"></div>
            <span>${escapeHtml(text)}</span>
        `;
    }

    function hideMomentsGeneratingBanner() {
        const el = document.getElementById('momentsGeneratingBanner');
        if (el) el.remove();
    }

    // 构建朋友圈列表
    function buildMomentsHTML() {
        ensureFeedLoaded();
        const feedList = window.G.feed || [];
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: window.G.player?.ytName || '我' };

        if (!feedList.length) {
            return `
            <div style="text-align:center;color:#b2b2b2;padding:60px 16px;font-size:13px;line-height:1.8;">
                <div style="font-size:36px;margin-bottom:8px;opacity:0.5;">
                    <svg viewBox="0 0 24 24" style="width:36px;height:36px;fill:#b2b2b2;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
                <b>暂无动态</b><br>
                点击右上角<b>「刷新」</b>或<b>「发布」</b>记录你的MC日常！
            </div>`;
        }

        let cardsHtml = '';
        feedList.forEach(m => {
            const isSelf = m.isPlayer || (m.author === curAcc.name) || (m.author === window.G.player?.ytName);
            const isLiked = !!m.liked;
            const comments = m.comments || [];

            let commentsBoxHtml = '';
            if (comments.length > 0) {
                const comLines = comments.map(c => `
                    <div style="font-size:12px;line-height:1.5;margin-bottom:3px;">
                        <span style="color:#576b95;font-weight:600;cursor:pointer;" onclick="window.replyMomentComment(${m.id}, '${escapeHtml(c.name || '好友')}')">${escapeHtml(c.name || '好友')}:</span>
                        <span style="color:#222222;">${escapeHtml(c.text)}</span>
                    </div>
                `).join('');
                commentsBoxHtml = `<div style="background:#f4f5f7;border-radius:4px;padding:6px 10px;margin-top:8px;">${comLines}</div>`;
            }

            // 配图模式：纯文字意象卡片，无需翻转，极度轻巧
            let mediaHtml = '';
            if (m.imageDesc) {
                mediaHtml = `
                <div style="margin:6px 0;background:#f8fafc;border-left:2.5px solid #07c160;padding:6px 10px;border-radius:3px;font-size:12px;color:#334155;line-height:1.45;">
                    <span style="font-weight:600;color:#07c160;">[配图画面]</span> ${escapeHtml(m.imageDesc)}
                </div>`;
            } else if (m.image) {
                mediaHtml = `
                <div style="margin:6px 0;">
                    <img src="${m.image}" style="max-width:100%;max-height:220px;border-radius:4px;object-fit:cover;display:block;" onerror="this.style.display='none';">
                </div>`;
            }

            cardsHtml += `
            <div class="moment-item-card" data-id="${m.id}" style="display:flex;gap:12px;padding:14px;border-bottom:0.5px solid #f0f0f0;background:#ffffff;">
                <div style="flex-shrink:0;">
                    <div style="width:42px;height:42px;border-radius:6px;overflow:hidden;background:#e9e9e9;">
                        <img src="${m.avatar || 'assets/icons/chat.png'}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.src='assets/icons/chat.png';" />
                    </div>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:14.5px;font-weight:600;color:#576b95;">${escapeHtml(m.author || '好友')}</span>
                        <span style="font-size:11px;color:#b2b2b2;">${m.time || '刚刚'}</span>
                    </div>

                    <div style="font-size:14px;color:#181818;margin:5px 0 8px;line-height:1.5;word-break:break-word;">
                        ${escapeHtml(m.body || '').replace(/\n/g, '<br>')}
                    </div>
                    ${mediaHtml}

                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:12px;">
                        <div style="display:flex;gap:12px;align-items:center;">
                            <button onclick="window.toggleMomentLike(${m.id})" style="border:none;background:none;color:${isLiked ? '#fa5151' : '#576b95'};cursor:pointer;display:flex;align-items:center;gap:3px;font-size:12px;padding:0;">
                                <span>${isLiked ? '已赞' : '赞'}</span> <span>(${m.likes || 0})</span>
                            </button>
                            <button onclick="window.addMomentComment(${m.id})" style="border:none;background:none;color:#576b95;cursor:pointer;font-size:12px;padding:0;">
                                评论
                            </button>
                            <button onclick="window.triggerAiCommentForMoment(${m.id})" style="border:none;background:none;color:#07c160;cursor:pointer;font-size:12px;padding:0;font-weight:500;">
                                召唤互动
                            </button>
                        </div>
                        ${isSelf ? `
                        <div style="display:flex;gap:8px;">
                            <button onclick="window.recallMoment(${m.id})" style="border:none;background:none;color:#999;font-size:11px;cursor:pointer;padding:0;">撤回</button>
                            <button onclick="window.deleteMoment(${m.id})" style="border:none;background:none;color:#ef4444;font-size:11px;cursor:pointer;padding:0;">删除</button>
                        </div>` : ''}
                    </div>
                    ${commentsBoxHtml}
                </div>
            </div>`;
        });

        // 顶栏附带专属 NPC 池快捷配置按钮
        const npcCount = (window.G.momentsNpcs || []).length;
        const bannerHtml = `
        <div style="background:#f7f7f7;padding:7px 14px;border-bottom:0.5px solid #ebebeb;display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:#666;">
            <span>专属朋友圈群演：${npcCount} 位</span>
            <span onclick="window.openMomentsNpcPoolModal()" style="color:#07c160;cursor:pointer;font-weight:600;">管理圈友人设 ›</span>
        </div>`;

        return bannerHtml + cardsHtml;
    }
    window.buildMomentsHTML = buildMomentsHTML;

    // 📷 发布动态弹窗（纯正微信卡片风）
    window.openPostMomentModal = function() {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: '我', avatar: 'assets/icons/chat.png' };

        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal('发朋友圈', `
                <div style="text-align:left;">
                    <div style="font-size:12px;color:#888;margin-bottom:6px;">以「${escapeHtml(curAcc.name)}」发布：</div>
                    <textarea id="wpostMomentBody" rows="3" placeholder="分享此刻的MC创作心情或趣事..." class="wechat-clean-input" style="line-height:1.45;resize:none;margin-bottom:10px;"></textarea>
                    <div style="font-size:12px;color:#666;margin-bottom:4px;">配图画面描述（纯文字意象，免图库）：</div>
                    <input type="text" id="wpostMomentImgDesc" placeholder="例如：黄昏下的原木小屋、刚挖出8颗钻石..." class="wechat-clean-input">
                </div>
            `, () => {
                const body = document.getElementById('wpostMomentBody').value.trim();
                const imgDesc = document.getElementById('wpostMomentImgDesc').value.trim();

                if (!body) {
                    if (typeof showToast === 'function') showToast('请填写动态正文', 'error');
                    return false;
                }

                ensureFeedLoaded();
                window.G.feed.unshift({
                    id: Date.now() + Math.floor(Math.random() * 899 + 100),
                    author: curAcc.name,
                    avatar: curAcc.avatar,
                    isPlayer: true,
                    body,
                    imageMode: imgDesc ? 'text_only' : 'none',
                    image: null,
                    imageDesc: imgDesc || null,
                    time: '刚刚',
                    liked: false,
                    likes: 0,
                    comments: []
                });

                if (typeof renderChatApp === 'function') renderChatApp();
                if (typeof showToast === 'function') showToast('动态已发布', 'success', 1200);
                if (typeof autoSaveGame === 'function') autoSaveGame();
            });
        }
    };

    // 点赞切换
    window.toggleMomentLike = function(id) {
        ensureFeedLoaded();
        const item = window.G.feed.find(f => f.id === id);
        if (!item) return;
        item.liked = !item.liked;
        item.likes = (item.likes || 0) + (item.liked ? 1 : -1);
        if (typeof renderChatApp === 'function') renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    // 写评论
    window.addMomentComment = function(momentId) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: '我' };

        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal('写评论', `
                <textarea id="wcleanCommentInput" rows="3" placeholder="说点什么..." class="wechat-clean-input" style="line-height:1.4;resize:none;"></textarea>
            `, () => {
                const text = document.getElementById('wcleanCommentInput').value.trim();
                if (!text) return false;
                ensureFeedLoaded();
                const item = window.G.feed.find(f => f.id === momentId);
                if (item) {
                    if (!item.comments) item.comments = [];
                    item.comments.push({ name: curAcc.name, text, time: '刚刚' });
                    if (typeof renderChatApp === 'function') renderChatApp();
                    if (typeof autoSaveGame === 'function') autoSaveGame();
                }
            });
        }
    };

    // 回复指定评论
    window.replyMomentComment = function(momentId, replyToName) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: '我' };

        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal(`回复 @${escapeHtml(replyToName)}`, `
                <textarea id="wcleanReplyInput" rows="3" placeholder="回复内容..." class="wechat-clean-input" style="line-height:1.4;resize:none;"></textarea>
            `, () => {
                const text = document.getElementById('wcleanReplyInput').value.trim();
                if (!text) return false;
                ensureFeedLoaded();
                const item = window.G.feed.find(f => f.id === momentId);
                if (item) {
                    if (!item.comments) item.comments = [];
                    item.comments.push({ name: curAcc.name, text: `回复 @${replyToName} : ${text}`, time: '刚刚' });
                    if (typeof renderChatApp === 'function') renderChatApp();
                    if (typeof autoSaveGame === 'function') autoSaveGame();
                }
            });
        }
    };

    // ⚡️ 召唤 NPC 互动（0ms 即时显示胶囊，绝不假死）
    window.triggerAiCommentForMoment = async function(momentId) {
        ensureFeedLoaded();
        const item = window.G.feed.find(f => f.id === momentId);
        if (!item) return;

        // 优先合并系统联系人与朋友圈专属 NPC 池
        const pool = [];
        Object.values(window.G.npcs || {}).forEach(n => pool.push({ name: n.name, persona: n.persona }));
        (window.G.momentsNpcs || []).forEach(n => pool.push({ name: n.name, persona: n.persona }));

        if (!pool.length) {
            if (typeof showToast === 'function') showToast('暂无圈友可接话，请先添加好友或人设', 'info');
            return;
        }

        const candidates = pool.filter(n => n.name !== item.author);
        const speaker = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : pool[0];

        // 0ms 瞬间挂载顶栏胶囊反馈！
        showMomentsGeneratingBanner(`「${speaker.name}」正在赶来评论...`);

        let picInfo = item.imageDesc ? ` [配图描述：${item.imageDesc}]` : '';

        try {
            const sys = `你正在扮演MC好友「${speaker.name}」（性格/风格：${speaker.persona || '朋友'}）。好友「${item.author}」发了一条朋友圈：“${item.body}”${picInfo}。请写一句接地气的微信朋友圈评论（20字内），自然吐槽、开玩笑或点赞，严禁任何括号动作描写，句末绝不加句号。`;
            const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '写一条评论' }], { maxTokens: 80, temperature: 0.85, silent: true });
            let clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();
            clean = clean.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '').replace(/。+$/g, '').trim();

            if (clean) {
                if (!item.comments) item.comments = [];
                item.comments.push({ name: speaker.name, text: clean, time: '刚刚' });
                item.likes = (item.likes || 0) + 1;
                if (typeof renderChatApp === 'function') renderChatApp();
                if (typeof autoSaveGame === 'function') autoSaveGame();
            }
        } catch (e) {
            if (typeof showToast === 'function') showToast('评论生成失败', 'error');
        } finally {
            hideMomentsGeneratingBanner();
        }
    };

    // ⚡️ 刷新好友朋友圈动态（0ms 即时响应）
    window.triggerGenerateFriendsFeed = async function() {
        ensureFeedLoaded();
        const pool = [];
        Object.values(window.G.npcs || {}).forEach(n => pool.push({ name: n.name, persona: n.persona, avatar: n.avatarUrl }));
        (window.G.momentsNpcs || []).forEach(n => pool.push({ name: n.name, persona: n.persona, avatar: (typeof getRandomAvatar === 'function') ? getRandomAvatar() : 'assets/icons/chat.png' }));

        if (!pool.length) {
            if (typeof showToast === 'function') showToast('暂无好友，先在通讯录或人设池添加好友吧！', 'info', 2000);
            return;
        }

        const picked = pool.sort(() => 0.5 - Math.random()).slice(0, 2);
        showMomentsGeneratingBanner('正在刷新好友朋友圈...');

        try {
            for (const n of picked) {
                const sys = `你正在扮演MC玩家好友「${n.name}」（人设风格：${n.persona || '开朗MC同伴'}）。
写一条接地气的游戏生活朋友圈动态（30字内）。可以涉及MC挖矿遇险、被苦力怕偷袭、剪视频爆肝等。
格式：[BODY]动态正文[/BODY][IMG_DESC]配图画面描绘（可选，20字内）[/IMG_DESC]
严禁句尾加句号，严禁任何动作括号描写。`;
                const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '发一条动态' }], { maxTokens: 140, temperature: 0.9, silent: true });
                let clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();

                let bodyText = clean;
                let imgDesc = null;

                const bMatch = /\[BODY\]([\s\S]*?)\[\/BODY\]/i.exec(clean);
                if (bMatch) bodyText = bMatch[1].trim();

                const iMatch = /\[IMG_DESC\]([\s\S]*?)\[\/IMG_DESC\]/i.exec(clean);
                if (iMatch) imgDesc = iMatch[1].trim();

                bodyText = bodyText.replace(/\[\/?(BODY|IMG_DESC)\]/gi, '').replace(/\([^)]*\)/g, '').replace(/。+$/g, '').trim();

                if (bodyText) {
                    window.G.feed.unshift({
                        id: Date.now() + Math.floor(Math.random() * 899 + 100),
                        author: n.name,
                        avatar: n.avatar || 'assets/icons/chat.png',
                        isPlayer: false,
                        body: bodyText,
                        imageMode: imgDesc ? 'text_only' : 'none',
                        image: null,
                        imageDesc: imgDesc || null,
                        time: '刚刚',
                        liked: false,
                        likes: Math.floor(Math.random() * 8) + 1,
                        comments: []
                    });
                }
            }
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof showToast === 'function') showToast('朋友圈已更新', 'success', 1200);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        } catch (e) {
            if (typeof showToast === 'function') showToast('刷新动态失败', 'error');
        } finally {
            hideMomentsGeneratingBanner();
        }
    };

    // 👤 朋友圈专属 NPC 池管理弹窗
    window.openMomentsNpcPoolModal = function() {
        ensureFeedLoaded();
        const list = window.G.momentsNpcs || [];

        let rowsHtml = list.map((npc, idx) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;background:#f9f9f9;border-radius:6px;margin-bottom:6px;">
                <div style="flex:1;min-width:0;padding-right:6px;">
                    <div style="font-size:13px;font-weight:600;color:#181818;">${escapeHtml(npc.name)}</div>
                    <div style="font-size:11px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;">${escapeHtml(npc.persona || '日常互动好友')}</div>
                </div>
                <button type="button" onclick="window.removeMomentsNpc(${idx})" style="border:none;background:#ffebee;color:#ef4444;padding:3px 7px;border-radius:4px;font-size:11px;cursor:pointer;">删除</button>
            </div>
        `).join('');

        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal('朋友圈专属群演池', `
                <div style="text-align:left;">
                    <div style="font-size:12px;color:#888;margin-bottom:8px;">刷新动态或召唤互动时将随机从以下人设中抽取：</div>
                    <div style="max-height:160px;overflow-y:auto;margin-bottom:10px;">
                        ${rowsHtml || '<div style="text-align:center;color:#bbb;padding:16px 0;font-size:12px;">暂无专属群演，点击下方添加</div>'}
                    </div>
                    <div style="border-top:0.5px solid #eee;padding-top:8px;">
                        <input type="text" id="waddMomentNpcName" placeholder="群演名字（如：暴躁老哥、红石天才）" class="wechat-clean-input" style="margin-bottom:6px;">
                        <input type="text" id="waddMomentNpcPersona" placeholder="说话风格标签（如：说话毒舌爱吐槽、热心萌新）" class="wechat-clean-input" style="margin-bottom:8px;">
                        <button type="button" onclick="window.addMomentsNpcDirect()" style="width:100%;border:none;background:#f0f0f0;color:#07c160;padding:7px;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;">+ 添加专属圈友</button>
                    </div>
                </div>
            `, () => {});
        }
    };

    window.addMomentsNpcDirect = function() {
        const name = document.getElementById('waddMomentNpcName')?.value.trim();
        const persona = document.getElementById('waddMomentNpcPersona')?.value.trim() || 'MC好友同伴';
        if (!name) {
            if (typeof showToast === 'function') showToast('请填写群演名字', 'error');
            return;
        }

        ensureFeedLoaded();
        window.G.momentsNpcs.push({ name, persona });
        saveMomentsNpcPool();
        if (typeof showToast === 'function') showToast('圈友已添加', 'success', 1000);
        document.querySelector('.wechat-clean-modal-mask')?.remove();
        window.openMomentsNpcPoolModal();
    };

    window.removeMomentsNpc = function(idx) {
        ensureFeedLoaded();
        if (window.G.momentsNpcs[idx]) {
            window.G.momentsNpcs.splice(idx, 1);
            saveMomentsNpcPool();
            document.querySelector('.wechat-clean-modal-mask')?.remove();
            window.openMomentsNpcPoolModal();
        }
    };

    // 删除与撤回
    window.deleteMoment = function(id) {
        if (!confirm('确定删除这条动态吗？')) return;
        ensureFeedLoaded();
        window.G.feed = window.G.feed.filter(f => f.id !== id);
        if (typeof renderChatApp === 'function') renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.recallMoment = function(id) {
        ensureFeedLoaded();
        const idx = window.G.feed.findIndex(f => f.id === id);
        if (idx !== -1) {
            window.G.feed.splice(idx, 1);
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof showToast === 'function') showToast('动态已撤回', 'info', 1200);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        }
    };

})();
