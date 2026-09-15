/**
 * js/apps/chat/chat-moments.js
 * 🌟 微信朋友圈动态流独立模块
 * 职责：
 * 1. 朋友圈动态列表构建（微信极简黑白灰视觉 · 无彩色Emoji）
 * 2. 完整 4 种发图模式：纯文字 / 文字代替图片 / 真实图片 / 文字描述加图片
 * 3. 本地相册选图调用与即时缩略图预览
 * 4. 点赞、评论、回复、召唤 NPC 互动评论
 * 5. 动态撤回与删除
 */

(function() {
    'use strict';

    function ensureFeedLoaded() {
        if (!window.G) window.G = {};
        if (!window.G.feed) window.G.feed = [];
    }

    // 微信朋友圈列表构建
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

            let mediaHtml = '';
            const mode = m.imageMode || (m.image ? 'image_real' : 'none');

            if (mode === 'text_only' && m.imageDesc) {
                mediaHtml = `
                <div style="margin:6px 0;background:#f8fafc;border-left:2.5px solid #64748b;padding:6px 9px;border-radius:3px;font-size:12px;color:#475569;line-height:1.4;">
                    <span style="font-weight:600;color:#334155;">[配图描述]</span> ${escapeHtml(m.imageDesc)}
                </div>`;
            } else if (mode === 'image_real' && m.image) {
                mediaHtml = `
                <div style="margin:6px 0;">
                    <img src="${m.image}" style="max-width:100%;max-height:220px;border-radius:4px;object-fit:cover;display:block;" onerror="this.style.display='none';">
                </div>`;
            } else if (mode === 'image_with_desc') {
                mediaHtml = `
                <div style="margin:6px 0;">
                    ${m.image ? `<img src="${m.image}" style="max-width:100%;max-height:220px;border-radius:4px;object-fit:cover;display:block;" onerror="this.style.display='none';">` : ''}
                    ${m.imageDesc ? `<div style="margin-top:4px;font-size:11.5px;color:#64748b;line-height:1.4;background:#f8fafc;padding:4px 8px;border-radius:3px;">📝 ${escapeHtml(m.imageDesc)}</div>` : ''}
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
                            <button onclick="window.recallMoment(${m.id})" style="border:none;background:none;color:#999;font-size:11px;cursor:padding:0;">撤回</button>
                            <button onclick="window.deleteMoment(${m.id})" style="border:none;background:none;color:#ef4444;font-size:11px;cursor:pointer;padding:0;">删除</button>
                        </div>` : ''}
                    </div>
                    ${commentsBoxHtml}
                </div>
            </div>`;
        });

        return cardsHtml;
    }
    window.buildMomentsHTML = buildMomentsHTML;

    // 📷 发布动态弹窗（恢复全部 4 种发图模式，去除括号说明）
    window.openPostMomentModal = function() {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: '我', avatar: 'assets/icons/chat.png' };
        let selectedLocalImgBase64 = null;

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;border-bottom:1.5px solid #eef2f7;padding-bottom:8px;margin-bottom:10px;">
                    发布动态
                </div>
                <div style="font-size:12px;color:#64748b;margin-bottom:6px;">以「${escapeHtml(curAcc.name)}」发布：</div>
                
                <div class="form-group" style="margin-bottom:10px;">
                    <textarea id="postMomentBody" rows="3" placeholder="分享此刻的MC创作心情或趣事..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;line-height:1.5;box-sizing:border-box;resize:none;outline:none;font-family:inherit;"></textarea>
                </div>

                <!-- 4 大模式单选 -->
                <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:12px;color:#475569;font-weight:600;display:block;margin-bottom:5px;">配图模式：</label>
                    <div style="display:flex;flex-direction:column;gap:6px;font-size:12.5px;color:#334155;">
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                            <input type="radio" name="momentPicMode" value="none" checked> 纯文字
                        </label>
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                            <input type="radio" name="momentPicMode" value="text_only"> 文字代替图片
                        </label>
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                            <input type="radio" name="momentPicMode" value="image_real"> 真实图片
                        </label>
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                            <input type="radio" name="momentPicMode" value="image_with_desc"> 文字描述加图片
                        </label>
                    </div>
                </div>

                <!-- 图片选取插槽（真实图片 / 文字描述加图片模式显示） -->
                <div id="momentImgSection" style="display:none;margin-bottom:10px;background:#f8fafc;padding:8px 10px;border-radius:6px;border:1px solid #e2e8f0;">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                        <span style="font-size:12px;color:#475569;font-weight:500;">选择本地相片：</span>
                        <label style="display:inline-block;border:1px solid #cbd5e1;background:#fff;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:11.5px;color:#2563eb;">
                            选取相片
                            <input type="file" id="momentFileInput" accept="image/*" style="display:none;">
                        </label>
                    </div>
                    <div id="momentImgPreviewWrap" style="display:none;position:relative;width:fit-content;margin-top:6px;">
                        <img id="momentImgPreview" src="" style="max-height:100px;max-width:160px;border-radius:4px;object-fit:cover;border:1px solid #dcdcdc;display:block;" />
                        <button type="button" id="btnRemoveMomentImg" style="position:absolute;top:-5px;right:-5px;background:#ef4444;color:#fff;border:none;width:17px;height:17px;border-radius:50%;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
                    </div>
                </div>

                <!-- 文字描述插槽（文字代替图片 / 文字描述加图片模式显示） -->
                <div id="momentDescSection" style="display:none;margin-bottom:12px;">
                    <input type="text" id="postMomentImgDesc" placeholder="输入配图画面描述..." style="width:100%;padding:7px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:12px;box-sizing:border-box;outline:none;">
                </div>

                <div style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #f1f5f9;padding-top:10px;">
                    <button type="button" onclick="closeModal()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnConfirmPublishMoment" style="border:none;background:#2563eb;color:#ffffff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">发布</button>
                </div>
            </div>
        `);

        const radios = document.querySelectorAll('input[name="momentPicMode"]');
        const imgSec = document.getElementById('momentImgSection');
        const descSec = document.getElementById('momentDescSection');
        const fileInput = document.getElementById('momentFileInput');
        const previewWrap = document.getElementById('momentImgPreviewWrap');
        const previewImg = document.getElementById('momentImgPreview');
        const removeBtn = document.getElementById('btnRemoveMomentImg');

        // 单选模式切换联动
        radios.forEach(r => {
            r.onchange = () => {
                const v = r.value;
                imgSec.style.display = (v === 'image_real' || v === 'image_with_desc') ? 'block' : 'none';
                descSec.style.display = (v === 'text_only' || v === 'image_with_desc') ? 'block' : 'none';
            };
        });

        fileInput.onchange = (e) => {
            const f = e.target.files[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                selectedLocalImgBase64 = evt.target.result;
                previewImg.src = selectedLocalImgBase64;
                previewWrap.style.display = 'block';
            };
            reader.readAsDataURL(f);
        };

        removeBtn.onclick = () => {
            selectedLocalImgBase64 = null;
            previewImg.src = '';
            previewWrap.style.display = 'none';
            fileInput.value = '';
        };

        document.getElementById('btnConfirmPublishMoment').onclick = () => {
            const body = document.getElementById('postMomentBody').value.trim();
            const mode = document.querySelector('input[name="momentPicMode"]:checked')?.value || 'none';
            const imgDesc = document.getElementById('postMomentImgDesc')?.value.trim();

            if (!body) {
                if (typeof showToast === 'function') showToast('请填写动态正文', 'error');
                return;
            }

            ensureFeedLoaded();
            window.G.feed.unshift({
                id: Date.now() + Math.floor(Math.random() * 899 + 100),
                author: curAcc.name,
                avatar: curAcc.avatar,
                isPlayer: true,
                body,
                imageMode: mode,
                image: (mode === 'image_real' || mode === 'image_with_desc') ? selectedLocalImgBase64 : null,
                imageDesc: (mode === 'text_only' || mode === 'image_with_desc') ? (imgDesc || null) : null,
                time: '刚刚',
                liked: false,
                likes: 0,
                comments: []
            });

            closeModal();
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof showToast === 'function') showToast('动态已发布！', 'success', 1500);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        };
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

    // 评论动态
    window.addMomentComment = function(momentId) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: '我' };

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:8px;">写评论</div>
                <textarea id="inpMomentComment" rows="3" placeholder="写下你的想法..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;box-sizing:border-box;outline:none;font-family:inherit;resize:none;"></textarea>
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;">
                    <button type="button" onclick="closeModal()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnSendMomentComment" style="border:none;background:#2563eb;color:#fff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">发表</button>
                </div>
            </div>
        `);

        document.getElementById('btnSendMomentComment').onclick = () => {
            const text = document.getElementById('inpMomentComment').value.trim();
            if (!text) return;
            ensureFeedLoaded();
            const item = window.G.feed.find(f => f.id === momentId);
            if (item) {
                if (!item.comments) item.comments = [];
                item.comments.push({ name: curAcc.name, text, time: '刚刚' });
                closeModal();
                if (typeof renderChatApp === 'function') renderChatApp();
                if (typeof autoSaveGame === 'function') autoSaveGame();
            }
        };
    };

    // 回复指定好友评论
    window.replyMomentComment = function(momentId, replyToName) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { name: '我' };

        openModal(`
            <div style="text-align:left;font-family:-apple-system,sans-serif;">
                <div style="font-size:15px;font-weight:700;color:#1e3a8a;margin-bottom:8px;">回复 @${escapeHtml(replyToName)}</div>
                <textarea id="inpMomentReply" rows="3" placeholder="回复内容..." style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #cbd5e1;font-size:13px;box-sizing:border-box;outline:none;font-family:inherit;resize:none;"></textarea>
                <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;">
                    <button type="button" onclick="closeModal()" style="border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;">取消</button>
                    <button type="button" id="btnSendMomentReply" style="border:none;background:#2563eb;color:#fff;padding:5px 16px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;">发送</button>
                </div>
            </div>
        `);

        document.getElementById('btnSendMomentReply').onclick = () => {
            const text = document.getElementById('inpMomentReply').value.trim();
            if (!text) return;
            ensureFeedLoaded();
            const item = window.G.feed.find(f => f.id === momentId);
            if (item) {
                if (!item.comments) item.comments = [];
                item.comments.push({ name: curAcc.name, text: `回复 @${replyToName} : ${text}`, time: '刚刚' });
                closeModal();
                if (typeof renderChatApp === 'function') renderChatApp();
                if (typeof autoSaveGame === 'function') autoSaveGame();
            }
        };
    };

    // 召唤 NPC 互动（严格遵循：AI 只读文字描述，不盲读图片）
    window.triggerAiCommentForMoment = async function(momentId) {
        ensureFeedLoaded();
        const item = window.G.feed.find(f => f.id === momentId);
        if (!item) return;

        const npcList = Object.values(window.G.npcs || {});
        if (!npcList.length) {
            if (typeof showToast === 'function') showToast('通讯录暂无好友接话', 'info');
            return;
        }

        const candidates = npcList.filter(n => n.name !== item.author);
        const speaker = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : npcList[0];
        if (typeof showToast === 'function') showToast(`${speaker.name} 正在赶来评论...`, 'info', 1200);

        // 核心约束：仅当存在文字描述时才注入画面，AI 不读真实图片！
        let picInfo = '';
        if (item.imageDesc) {
            picInfo = ` [动态配图画面描述：${item.imageDesc}]`;
        }

        try {
            const sys = `你正在扮演MC好友「${speaker.name}」（性格：${speaker.persona || '朋友'}）。好友「${item.author}」发了动态：“${item.body}”${picInfo}。写一句极接地气的评论（20字内），像真实微信朋友圈评论一样自然吐槽或调侃，只输出评论正文，严禁任何动作括号。`;
            const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '写一条评论' }], { maxTokens: 80, temperature: 0.85 });
            const clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();
            if (clean) {
                if (!item.comments) item.comments = [];
                item.comments.push({ name: speaker.name, text: clean, time: '刚刚' });
                item.likes = (item.likes || 0) + 1;
                if (typeof renderChatApp === 'function') renderChatApp();
                if (typeof autoSaveGame === 'function') autoSaveGame();
            }
        } catch(e) {
            if (typeof showToast === 'function') showToast('评论生成失败', 'error');
        }
    };

    // 刷新好友朋友圈动态
    window.triggerGenerateFriendsFeed = async function() {
        const npcList = Object.values(window.G.npcs || {});
        if (!npcList.length) {
            if (typeof showToast === 'function') showToast('通讯录暂无好友，先添加好友才能刷出动态哦！', 'info', 2000);
            return;
        }

        const picked = npcList.sort(() => 0.5 - Math.random()).slice(0, 2);
        if (typeof showToast === 'function') showToast('正在刷新好友朋友圈...', 'info', 1200);

        try {
            for (const n of picked) {
                const sys = `你正在扮演MC主播/好友「${n.name}」（性格：${n.persona || '开朗同伴'}）。写一条极简接地气的游戏朋友圈动态（30字内）。涉及MC挖矿、被苦力怕炸、剪视频熬夜或日常。只输出正文，严禁括号动作。`;
                const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '发一条动态' }], { maxTokens: 120, temperature: 0.9 });
                const clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();
                if (clean) {
                    ensureFeedLoaded();
                    window.G.feed.unshift({
                        id: Date.now() + Math.floor(Math.random() * 899 + 100),
                        author: n.name,
                        avatar: n.avatarUrl,
                        isPlayer: false,
                        body: clean,
                        time: '刚刚',
                        liked: false,
                        likes: Math.floor(Math.random() * 12) + 1,
                        comments: []
                    });
                }
            }
            if (typeof renderChatApp === 'function') renderChatApp();
            if (typeof showToast === 'function') showToast('好友动态已刷新！', 'success', 1500);
            if (typeof autoSaveGame === 'function') autoSaveGame();
        } catch(e) {
            if (typeof showToast === 'function') showToast('刷新动态失败', 'error');
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
