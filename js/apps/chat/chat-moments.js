/**
 * js/apps/chat/chat-moments.js
 * 🌟 微信朋友圈动态流独立模块
 * 职责：
 * 1. 朋友圈动态列表构建（微信极简白灰视觉 · 无彩色Emoji）
 * 2. 拍立得拟真质感画片与真实图片双轨配图（支持本地相册图片与意象快照）
 * 3. 动态双轨持久化防丢恢复（后台重进不丢动态）
 * 4. 专属群演固定永久头像机制（除非手动刷新否则永久锁定）
 * 5. 点赞、评论、回复、召唤互动（0ms 即刻呼出生成胶囊，绝无卡顿延迟感）
 * 6. 动态转发至私聊/群聊功能（修复发送者身份为当前玩家）
 * 7. 仿微信全屏大图与快照详情预览
 */

(function() {
    'use strict';

    const MOMENTS_NPC_POOL_KEY = 'mcyt_moments_custom_npcs_v1';

    function ensureFeedLoaded() {
        if (!window.G) window.G = {};
        if (!window.G.feed) window.G.feed = [];
        
        // 双轨恢复已存储的朋友圈动态
        if (typeof restoreMomentsFeedFromLocalBackup === 'function') {
            restoreMomentsFeedFromLocalBackup();
        }

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

        // 为群演 NPC 固定头像，避免每次刷新动态都随机换脸
        window.G.momentsNpcs.forEach(n => {
            if (!n.avatar) {
                n.avatar = (typeof getRandomAvatar === 'function') ? getRandomAvatar() : 'assets/icons/chat.png';
            }
        });
        saveMomentsNpcPool();
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

            // 配图渲染：支持真实图片与拍立得质感画片
            let mediaHtml = '';
            if (m.image) {
                mediaHtml = `
                <div style="margin:8px 0;">
                    <img src="${m.image}" onclick="window.openMomentImagePreview('${m.image}', '${escapeHtml(m.body || '')}')" style="max-width:210px;max-height:220px;border-radius:6px;object-fit:cover;display:block;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.1);" onerror="this.style.display='none';">
                </div>`;
            } else if (m.imageDesc) {
                mediaHtml = `
                <div style="margin:8px 0;">
                    <div class="wechat-photo-card" onclick="window.openMomentArtCardPreview(${m.id})">
                        <div class="wechat-photo-art-box">
                            <span class="wechat-photo-art-badge">快照画片</span>
                            <div class="wechat-photo-art-text">“${escapeHtml(m.imageDesc)}”</div>
                        </div>
                        <div style="font-size:10.5px;color:#888;margin-top:5px;display:flex;justify-content:space-between;align-items:center;">
                            <span>拍立得快照 · 点击放大</span>
                            <span style="color:#07c160;">查看 ›</span>
                        </div>
                    </div>
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
                            <button onclick="window.shareMomentToChat(${m.id})" style="border:none;background:none;color:#576b95;cursor:pointer;font-size:12px;padding:0;">
                                转发
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

        const npcCount = (window.G.momentsNpcs || []).length;
        const bannerHtml = `
        <div style="background:#f7f7f7;padding:7px 14px;border-bottom:0.5px solid #ebebeb;display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:#666;">
            <span>专属朋友圈群演：${npcCount} 位（头像已锁定）</span>
            <span onclick="window.openMomentsNpcPoolModal()" style="color:#07c160;cursor:pointer;font-weight:600;">管理圈友/换头像 ›</span>
        </div>`;

        return bannerHtml + cardsHtml;
    }
    window.buildMomentsHTML = buildMomentsHTML;

    // 🖼 查看意象画片全屏细节
    window.openMomentArtCardPreview = function(momentId) {
        ensureFeedLoaded();
        const item = window.G.feed.find(f => f.id === momentId);
        if (!item) return;

        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal('朋友圈画片快照', `
                <div style="text-align:center;">
                    <div style="width:100%;min-height:180px;border-radius:10px;background:linear-gradient(135deg, #1e293b 0%, #334155 50%, #0f172a 100%);padding:24px 16px;box-sizing:border-box;color:#ffffff;display:flex;flex-direction:column;justify-content:center;align-items:center;box-shadow:0 8px 24px rgba(0,0,0,0.25);">
                        <div style="font-size:11px;letter-spacing:1px;color:#07c160;margin-bottom:8px;font-weight:600;">SNAPSHOT IMAGE MEMORY</div>
                        <div style="font-size:15px;line-height:1.6;font-weight:500;text-shadow:0 2px 4px rgba(0,0,0,0.5);">${escapeHtml(item.imageDesc || '无详细描述')}</div>
                    </div>
                    <div style="font-size:12px;color:#666;margin-top:12px;line-height:1.5;">
                        发布者：<b>${escapeHtml(item.author)}</b><br>
                        “${escapeHtml(item.body)}”
                    </div>
                </div>
            `, () => {});
        }
    };

    window.openMomentImagePreview = function(imgSrc, caption) {
        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal('查看图片', `
                <div style="text-align:center;">
                    <img src="${imgSrc}" style="max-width:100%;max-height:320px;border-radius:6px;object-fit:contain;" />
                    ${caption ? `<div style="font-size:12px;color:#666;margin-top:8px;">${escapeHtml(caption)}</div>` : ''}
                </div>
            `, () => {});
        }
    };

    // 📤 转发动态至聊天窗口（确保以 player 身份发送，渲染在右侧）
    window.shareMomentToChat = function(momentId) {
        ensureFeedLoaded();
        const item = window.G.feed.find(f => f.id === momentId);
        if (!item) return;

        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };
        
        // 过滤当前账号下的好友与群聊
        const candidateTargets = [];
        Object.values(window.G.npcs || {}).forEach(npc => {
            if (!npc.ownerAccountId || npc.ownerAccountId === curAcc.id || npc.ownerAccountId === 'all') {
                candidateTargets.push({ id: npc.id, name: npc.name, isGroup: false });
            }
        });
        Object.values(window.G.groups || {}).forEach(grp => {
            candidateTargets.push({ id: grp.id, name: `[群] ${grp.name}`, isGroup: true });
        });

        if (!candidateTargets.length) {
            if (typeof showToast === 'function') showToast('当前账号暂无可转发的好友或群聊', 'info');
            return;
        }

        const optionsHtml = candidateTargets.map(t => `
            <div onclick="window.doSendSharedMomentDirect('${t.id}', ${t.isGroup}, ${momentId})" style="display:flex;align-items:center;justify-content:space-between;padding:10px 8px;border-bottom:0.5px solid #eee;cursor:pointer;">
                <span style="font-size:14px;color:#181818;font-weight:500;">${escapeHtml(t.name)}</span>
                <span style="font-size:12px;color:#07c160;font-weight:600;">发送 ›</span>
            </div>
        `).join('');

        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal('转发这条动态', `
                <div style="text-align:left;">
                    <div style="font-size:12px;color:#888;margin-bottom:8px;">选择接收的好友或群聊：</div>
                    <div style="max-height:220px;overflow-y:auto;">
                        ${optionsHtml}
                    </div>
                </div>
            `, () => {});
        }
    };

    window.doSendSharedMomentDirect = function(targetId, isGroup, momentId) {
        const item = window.G.feed.find(f => f.id === momentId);
        if (!item) return;

        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };
        const commentsSummary = (item.comments || []).map(c => `${c.name}: ${c.text}`).join('；');

        // 核心修复：必须同时标记 from: 'player' 和 isPlayer: true，保证渲染为自己发送
        const shareMsg = {
            from: 'player',
            isPlayer: true,
            senderName: curAcc.name,
            type: 'shared_moment',
            text: `[分享了一条动态] ${item.author}: ${item.body}`,
            sharedMoment: {
                id: item.id,
                author: item.author,
                avatar: item.avatar,
                body: item.body,
                image: item.image || null,
                imageDesc: item.imageDesc || null,
                commentsSummary: commentsSummary || '暂无评论'
            },
            time: new Date().toLocaleTimeString().slice(0, 5),
            timestamp: Date.now()
        };

        if (isGroup) {
            if (typeof window.doSendGroupChat === 'function') {
                if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
                if (!window.G.groupChatHistory[targetId]) window.G.groupChatHistory[targetId] = [];
                window.G.groupChatHistory[targetId].push(shareMsg);
            }
        } else {
            if (typeof pushChatMessageSafe === 'function') {
                pushChatMessageSafe(targetId, shareMsg, curAcc.id);
            }
        }

        document.querySelector('.wechat-clean-modal-mask')?.remove();
        if (typeof showToast === 'function') showToast('已转发到聊天', 'success', 1200);

        if (!isGroup && typeof window.triggerAIReplyForSingle === 'function') {
            window.triggerAIReplyForSingle(targetId);
        }
    };

    // 📷 发布动态弹窗（支持相册选真实图片或写意象快照）
    window.openPostMomentModal = function() {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: '我', avatar: 'assets/icons/chat.png' };
        let selectedRealImageBase64 = null;

        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal('发朋友圈', `
                <div style="text-align:left;">
                    <div style="font-size:12px;color:#888;margin-bottom:6px;">以「${escapeHtml(curAcc.name)}」发布：</div>
                    <textarea id="wpostMomentBody" rows="3" placeholder="分享此刻的MC日常或心情..." class="wechat-clean-input" style="line-height:1.45;resize:none;margin-bottom:10px;"></textarea>

                    <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
                        <label style="flex:1;border:1px dashed #07c160;background:#f6fbf8;color:#07c160;padding:8px;border-radius:6px;font-size:12px;font-weight:500;text-align:center;cursor:pointer;display:block;">
                            <span>📷 从相册选择真实配图</span>
                            <input type="file" id="wpostRealImageInput" accept="image/*" style="display:none;">
                        </label>
                        <button type="button" id="wpostClearImgBtn" style="display:none;border:none;background:#fee2e2;color:#ef4444;padding:8px 10px;border-radius:6px;font-size:12px;cursor:pointer;">清除</button>
                    </div>

                    <div id="wpostImgPreviewWrap" style="display:none;text-align:center;margin-bottom:10px;">
                        <img id="wpostImgPreview" src="" style="max-height:100px;border-radius:6px;object-fit:cover;">
                    </div>

                    <div style="font-size:12px;color:#666;margin-bottom:4px;">或填写快照意象描绘（免图库）：</div>
                    <input type="text" id="wpostMomentImgDesc" placeholder="例如：落日余晖下的小麦农场、手持下界合金剑..." class="wechat-clean-input">
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
                    imageMode: selectedRealImageBase64 ? 'real' : (imgDesc ? 'photo_art' : 'none'),
                    image: selectedRealImageBase64 || null,
                    imageDesc: (!selectedRealImageBase64 && imgDesc) ? imgDesc : null,
                    time: '刚刚',
                    liked: false,
                    likes: 0,
                    comments: []
                });

                if (typeof syncMomentsFeedToLocalBackup === 'function') {
                    syncMomentsFeedToLocalBackup();
                }

                if (typeof renderChatApp === 'function') renderChatApp();
                if (typeof showToast === 'function') showToast('动态已发布', 'success', 1200);
                if (typeof autoSaveGame === 'function') autoSaveGame();
            });

            setTimeout(() => {
                const input = document.getElementById('wpostRealImageInput');
                const pWrap = document.getElementById('wpostImgPreviewWrap');
                const pImg = document.getElementById('wpostImgPreview');
                const clearBtn = document.getElementById('wpostClearImgBtn');

                if (input) {
                    input.onchange = (e) => {
                        const file = e.target.files && e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                            selectedRealImageBase64 = evt.target.result;
                            if (pImg) pImg.src = selectedRealImageBase64;
                            if (pWrap) pWrap.style.display = 'block';
                            if (clearBtn) clearBtn.style.display = 'inline-block';
                        };
                        reader.readAsDataURL(file);
                    };
                }
                if (clearBtn) {
                    clearBtn.onclick = () => {
                        selectedRealImageBase64 = null;
                        if (pWrap) pWrap.style.display = 'none';
                        clearBtn.style.display = 'none';
                        if (input) input.value = '';
                    };
                }
            }, 30);
        }
    };

    // 点赞切换
    window.toggleMomentLike = function(id) {
        ensureFeedLoaded();
        const item = window.G.feed.find(f => f.id === id);
        if (!item) return;
        item.liked = !item.liked;
        item.likes = (item.likes || 0) + (item.liked ? 1 : -1);
        if (typeof syncMomentsFeedToLocalBackup === 'function') syncMomentsFeedToLocalBackup();
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
                    if (typeof syncMomentsFeedToLocalBackup === 'function') syncMomentsFeedToLocalBackup();
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
                    if (typeof syncMomentsFeedToLocalBackup === 'function') syncMomentsFeedToLocalBackup();
                    if (typeof renderChatApp === 'function') renderChatApp();
                    if (typeof autoSaveGame === 'function') autoSaveGame();
                }
            });
        }
    };

    // ⚡️ 召唤 NPC 互动
    window.triggerAiCommentForMoment = async function(momentId) {
        ensureFeedLoaded();
        const item = window.G.feed.find(f => f.id === momentId);
        if (!item) return;

        const pool = [];
        Object.values(window.G.npcs || {}).forEach(n => pool.push({ name: n.name, persona: n.persona }));
        (window.G.momentsNpcs || []).forEach(n => pool.push({ name: n.name, persona: n.persona }));

        if (!pool.length) {
            if (typeof showToast === 'function') showToast('暂无圈友可接话，请先添加好友或人设', 'info');
            return;
        }

        const candidates = pool.filter(n => n.name !== item.author);
        const speaker = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : pool[0];

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
                if (typeof syncMomentsFeedToLocalBackup === 'function') syncMomentsFeedToLocalBackup();
                if (typeof renderChatApp === 'function') renderChatApp();
                if (typeof autoSaveGame === 'function') autoSaveGame();
            }
        } catch (e) {
            if (typeof showToast === 'function') showToast('评论生成失败', 'error');
        } finally {
            hideMomentsGeneratingBanner();
        }
    };

    // ⚡️ 刷新好友朋友圈动态
    window.triggerGenerateFriendsFeed = async function() {
        ensureFeedLoaded();
        const pool = [];
        Object.values(window.G.npcs || {}).forEach(n => pool.push({
            name: n.name,
            persona: n.persona,
            avatar: n.avatarUrl
        }));
        (window.G.momentsNpcs || []).forEach(n => pool.push({
            name: n.name,
            persona: n.persona,
            avatar: n.avatar
        }));

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
格式：[BODY]动态正文[/BODY][IMG_DESC]配图快照描绘（可选，20字内）[/IMG_DESC]
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
                        imageMode: imgDesc ? 'photo_art' : 'none',
                        image: null,
                        imageDesc: imgDesc || null,
                        time: '刚刚',
                        liked: false,
                        likes: Math.floor(Math.random() * 8) + 1,
                        comments: []
                    });
                }
            }
            if (typeof syncMomentsFeedToLocalBackup === 'function') syncMomentsFeedToLocalBackup();
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof showToast === 'function') showToast('朋友圈已更新', 'success', 1200);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        } catch (e) {
            if (typeof showToast === 'function') showToast('刷新动态失败', 'error');
        } finally {
            hideMomentsGeneratingBanner();
        }
    };

    // 👤 专属 NPC 管理
    window.openMomentsNpcPoolModal = function() {
        ensureFeedLoaded();
        const list = window.G.momentsNpcs || [];

        let rowsHtml = list.map((npc, idx) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#f9f9f9;border-radius:6px;margin-bottom:6px;">
                <div style="width:36px;height:36px;border-radius:4px;overflow:hidden;background:#e2e8f0;flex-shrink:0;margin-right:10px;">
                    <img src="${npc.avatar || 'assets/icons/chat.png'}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.src='assets/icons/chat.png';" />
                </div>
                <div style="flex:1;min-width:0;padding-right:6px;">
                    <div style="font-size:13px;font-weight:600;color:#181818;">${escapeHtml(npc.name)}</div>
                    <div style="font-size:11px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;">${escapeHtml(npc.persona || '日常互动好友')}</div>
                </div>
                <div style="display:flex;gap:6px;align-items:center;">
                    <button type="button" onclick="window.refreshMomentsNpcAvatar(${idx})" style="border:none;background:#e6f7ef;color:#07c160;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">换头像</button>
                    <button type="button" onclick="window.removeMomentsNpc(${idx})" style="border:none;background:#ffebee;color:#ef4444;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">删除</button>
                </div>
            </div>
        `).join('');

        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal('朋友圈专属圈友管理', `
                <div style="text-align:left;">
                    <div style="font-size:12px;color:#888;margin-bottom:8px;">圈友头像默认已锁定，仅点击「换头像」才会重新生成：</div>
                    <div style="max-height:180px;overflow-y:auto;margin-bottom:10px;">
                        ${rowsHtml || '<div style="text-align:center;color:#bbb;padding:16px 0;font-size:12px;">暂无专属群演，点击下方添加</div>'}
                    </div>
                    <div style="border-top:0.5px solid #eee;padding-top:8px;">
                        <input type="text" id="waddMomentNpcName" placeholder="圈友名字（如：红石怪人、佛系建筑师）" class="wechat-clean-input" style="margin-bottom:6px;">
                        <input type="text" id="waddMomentNpcPersona" placeholder="人设标签（如：高冷爱吐槽、热心呆萌）" class="wechat-clean-input" style="margin-bottom:8px;">
                        <button type="button" onclick="window.addMomentsNpcDirect()" style="width:100%;border:none;background:#f0f0f0;color:#07c160;padding:7px;border-radius:6px;font-size:12.5px;font-weight:600;cursor:pointer;">+ 添加专属圈友</button>
                    </div>
                </div>
            `, () => {});
        }
    };

    window.refreshMomentsNpcAvatar = function(idx) {
        ensureFeedLoaded();
        if (window.G.momentsNpcs[idx]) {
            window.G.momentsNpcs[idx].avatar = (typeof getRandomAvatar === 'function') ? getRandomAvatar() : 'assets/icons/chat.png';
            saveMomentsNpcPool();
            document.querySelector('.wechat-clean-modal-mask')?.remove();
            window.openMomentsNpcPoolModal();
            if (typeof showToast === 'function') showToast('头像已更新并锁定', 'success', 1000);
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
        const avatar = (typeof getRandomAvatar === 'function') ? getRandomAvatar() : 'assets/icons/chat.png';
        window.G.momentsNpcs.push({ name, persona, avatar });
        saveMomentsNpcPool();
        if (typeof showToast === 'function') showToast('圈友已添加并锁定头像', 'success', 1000);
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
        if (typeof syncMomentsFeedToLocalBackup === 'function') syncMomentsFeedToLocalBackup();
        if (typeof renderChatApp === 'function') renderChatApp();
        if (typeof autoSaveGame === 'function') autoSaveGame();
    };

    window.recallMoment = function(id) {
        ensureFeedLoaded();
        const idx = window.G.feed.findIndex(f => f.id === id);
        if (idx !== -1) {
            window.G.feed.splice(idx, 1);
            if (typeof syncMomentsFeedToLocalBackup === 'function') syncMomentsFeedToLocalBackup();
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof showToast === 'function') showToast('动态已撤回', 'info', 1200);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        }
    };

})();
