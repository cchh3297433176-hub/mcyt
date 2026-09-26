/**
 * js/apps/ao3/ao3-app.js
 * 📚 Archive of Our Own (AO3) 同人文库 App
 * 
 * 核心设计：
 * 1. 唯一角色来源：100% 仅读取聊天 APP 中玩家创建与保存的联系人（彻底剔除任何内置/官方死人设）。
 * 2. 纯正 AO3 经典文献质感：象牙白与学术暗红（#990000），消除廉价感 Emoji。
 * 3. 熔铸「去 AI 味」小说提示词：充满生活细节、微动作、口语化对话与留白呼吸感。
 * 4. 微信聊天联动与转发：支持一键转发同人卡片至自建角色的私聊，严格遵守「非自动回复」，点击闪电才生成角色锐评。
 */

(function () {
    'use strict';

    // ============================================================
    // 0. 数据完整性与聊天真实联系人池（彻底剔除官方预设）
    // ============================================================
    function ensureAo3DataIntegrity() {
        if (!window.G) window.G = {};
        if (!G.fanworks) G.fanworks = [];
        if (!G.ao3State) {
            G.ao3State = {
                view: 'home', // 'home' | 'read'
                activeWorkId: null,
                filterTag: 'all',
                searchKeyword: ''
            };
        }
        if (!G.ao3User) {
            const p = getPlayerIdentity();
            G.ao3User = {
                username: p.name,
                isPseud: false
            };
        }
    }

    /**
     * 100% 仅获取聊天 APP 中真实创建的联系人列表
     * 严禁混入任何过去的官方/内置 NPC！
     */
    function getLiveChatCharacters() {
        const pool = [];
        const seenIds = new Set();

        // 1. 优先读取聊天通讯录自建联系人核心池 (localStorage: mcyt_wechat_custom_npcs)
        try {
            const rawCustom = localStorage.getItem('mcyt_wechat_custom_npcs');
            if (rawCustom) {
                const customNpcs = JSON.parse(rawCustom);
                Object.values(customNpcs).forEach(c => {
                    if (c && c.name && !seenIds.has(c.id || c.name)) {
                        const cid = c.id || c.name;
                        seenIds.add(cid);
                        pool.push({
                            id: cid,
                            name: c.name.trim(),
                            avatar: c.avatarUrl || c.avatar || '',
                            persona: c.persona || c.desc || c.bio || '聊天自建好友'
                        });
                    }
                });
            }
        } catch (_) {}

        // 2. 检查全局运行态自建缓存（若存在自建扩充）
        if (window.G && G.customNpcs) {
            Object.values(G.customNpcs).forEach(c => {
                if (c && c.name && !seenIds.has(c.id || c.name)) {
                    const cid = c.id || c.name;
                    seenIds.add(cid);
                    pool.push({
                        id: cid,
                        name: c.name.trim(),
                        avatar: c.avatarUrl || c.avatar || '',
                        persona: c.persona || c.desc || '聊天自建好友'
                    });
                }
            });
        }

        return pool;
    }

    /**
     * 获取玩家自身在聊天体系中的真实人设
     */
    function getPlayerIdentity() {
        let name = '女主角';
        let persona = '热爱记录生活、细腻鲜活的女性创作者';

        if (typeof window.getPlayerProfileSafe === 'function') {
            const prof = window.getPlayerProfileSafe();
            if (prof && prof.name) name = prof.name;
            if (prof && (prof.persona || prof.desc)) persona = prof.persona || prof.desc;
        } else if (window.G && G.player) {
            name = G.player.ytName || G.player.name || name;
            persona = G.player.persona || persona;
        }

        return { name, persona };
    }

    // ============================================================
    // 1. 去 AI 味深度同人文提示词引擎
    // ============================================================
    function buildHumanizedWritingInstructions(pov, pairing, isAuthorMain) {
        return `
【同人文创作核心规范 · 彻底剥离 AI 味】：
1. 【反模板与去悬浮】：
   - 严禁使用任何网络小说 AI 固化套路、俗套比喻（如“心如刀割”、“宛如天神下凡”）与空洞华丽修辞。
   - 拒绝刻意煽情、生硬哲理说教与强行升华；文风要沉着、克制，保留生活化的粗糙感与烟火气，像人类同人作者手写的随性文字。
2. 【人物塑造（必须带有人性弱点与微习惯）】：
   - 人物绝非全能无瑕工具人。主角与登场角色必须带有贴合性格的小毛病、微动作（如：紧张时抓衣角、思考时下意识踢石子、挑食、嘴硬心软）。
   - 对话完全口语化，严禁像念对白台词！允许出现省略句、打断、反问、轻微口癖与日常无意义的碎碎念。
3. 【叙述视角与感官留白】：
   - ${pov === 'first' ? '以女主【我】的第一人称真实感官与心理独白推进。' : (pov === 'second' ? '以【你】的第二人称沉浸式交互视角推进。' : '以第三人称（她/角色名）视角克制叙述。')}
   - 减少上帝全知视角，多写微观触觉、气味、环境音效与眼神交错。情节推进有张有弛，留有情绪余味。
4. 【纯正女性主角与乙女/情感铁律】：
   - 女主角无论在任何世界观下，生理与心理皆为纯正女性，所有羁绊与偏爱皆以她为核心！
   - 涉及配对（${pairing}）：登场男性角色若有情感只倾向女主本人。绝对严禁描写任何男性角色之间的同性恋爱或男男拉郎！
5. 【作者背景感知】：
   - ${isAuthorMain ? '这是主播女主角本人在 AO3 上亲自开坑创作（或失手掉马），行文可带有作者自身生活的小投射！' : '这是同人圈匿名太太的细腻产粮，充满对角色互动细节的推敲与热爱。'}
`;
    }

    function cleanRawAIOutput(text) {
        let s = String(text || '');
        s = s.replace(/<think>[\s\S]*?<\/think>/gi, '');
        s = s.replace(/<analysis>[\s\S]*?<\/analysis>/gi, '');
        s = s.replace(/```(?:markdown|text)?/gi, '').replace(/```/g, '');
        return s.trim();
    }

    function extractAo3Tag(raw, tag) {
        const cleaned = cleanRawAIOutput(raw);
        const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let m = cleaned.match(new RegExp(`\\[${escaped}\\]\\s*([\\s\\S]*?)\\s*\\[\\/${escaped}\\]`, 'i'));
        if (m) return m[1].trim();
        const known = ['TITLE', 'PAIRING', 'TAGS', 'SUMMARY', 'CHAPTER_TITLE', 'CONTENT'];
        m = cleaned.match(new RegExp(`\\[${escaped}\\]\\s*[:：]?\\s*([\\s\\S]*?)(?=\\s*\\[(?:${known.join('|')})\\]\\s*[:：]?|$)`, 'i'));
        return m ? m[1].trim() : '';
    }

    // ============================================================
    // 2. 主界面渲染与版式引擎 (原生 AO3 白描质感)
    // ============================================================
    window.renderAo3App = function (containerEl) {
        ensureAo3DataIntegrity();
        const target = containerEl || document.getElementById('appModalBody');
        if (!target) return;

        const st = G.ao3State;
        if (st.view === 'read' && st.activeWorkId) {
            renderAo3ReaderView(target, st.activeWorkId);
        } else {
            renderAo3HomeView(target);
        }
    };

    function renderAo3HomeView(container) {
        const works = [...(G.fanworks || [])].reverse();
        const curUser = G.ao3User.username;
        const playerInfo = getPlayerIdentity();
        const isMain = curUser.trim() === playerInfo.name.trim();

        let worksHtml = '';
        if (works.length === 0) {
            worksHtml = `
                <div class="ao3-empty-slate">
                    <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#990000" stroke-width="1.2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                    <div style="font-weight:700;font-size:14px;color:#333;margin-top:10px;">文库暂无收录作品</div>
                    <div style="font-size:12px;color:#777;margin-top:4px;">无论是亲手开坑还是催粉丝产粮，文字都在等待诞生。</div>
                    <div style="display:flex;gap:10px;margin-top:16px;">
                        <button class="ao3-btn ao3-btn-red" onclick="window.triggerFanAo3Creation()">🎲 催读者开坑</button>
                        <button class="ao3-btn ao3-btn-outline" onclick="window.openCreateAo3WorkModal()">✍️ 亲手开坑</button>
                    </div>
                </div>
            `;
        } else {
            worksHtml = works.map(w => {
                const isAuthorMe = w.author === playerInfo.name;
                const chapterCount = (w.chapters && w.chapters.length) ? w.chapters.length : 1;
                const tags = (w.tags || []).slice(0, 5).map(t => `<span class="ao3-tag-pill">${escapeHtml(t)}</span>`).join('');
                
                return `
                    <div class="ao3-work-card" onclick="window.openAo3WorkDetail('${w._id}')">
                        <div class="ao3-work-header">
                            <div class="ao3-work-title-line">
                                <span class="ao3-work-title">${escapeHtml(w.title)}</span>
                                ${isAuthorMe ? '<span class="ao3-badge-author">主播本尊</span>' : ''}
                            </div>
                            <div class="ao3-work-byline">
                                by <span class="ao3-author-link">${escapeHtml(w.author || '匿名作者')}</span>
                                ${w.pairing ? ` · 配对: <b>${escapeHtml(w.pairing)}</b>` : ''}
                            </div>
                        </div>

                        <div class="ao3-tags-wrap">${tags}</div>
                        <div class="ao3-work-summary-box">${escapeHtml(w.summary || '无故事摘要')}</div>

                        <div class="ao3-work-footer-meta">
                            <span class="ao3-meta-item">📖 ${chapterCount} 章</span>
                            <span class="ao3-meta-item">💚 ${w.kudos || 0} Kudos</span>
                            <span class="ao3-meta-item">💬 ${(w.reviews || []).length} 评论</span>
                            <button class="ao3-manage-btn" onclick="event.stopPropagation(); window.openAo3WorkOptionsModal('${w._id}')">管理</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        container.innerHTML = `
            <div class="ao3-app-viewport">
                <!-- AO3 经典学术红白顶栏 -->
                <div class="ao3-classic-navbar">
                    <div class="ao3-logo-group" onclick="G.ao3State.view='home'; window.renderAo3App();">
                        <span class="ao3-logo-monogram">AO3</span>
                        <div class="ao3-logo-text">
                            <span class="ao3-main-title">Archive of Our Own</span>
                            <span class="ao3-sub-title">同人文库 · 纯乙女与独立创作空间</span>
                        </div>
                    </div>
                    <div class="ao3-nav-actions">
                        <div class="ao3-user-badge" onclick="window.openAo3IdentitySettings()">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            <span>${escapeHtml(curUser)}</span>
                            <small>(${isMain ? '主号' : '小号'})</small>
                        </div>
                    </div>
                </div>

                <!-- 次级工具栏 -->
                <div class="ao3-sub-toolbar">
                    <div class="ao3-filter-label">文库作品：<b>${works.length} 篇</b></div>
                    <div style="display:flex;gap:6px;">
                        <button class="ao3-btn ao3-btn-sub" onclick="window.triggerFanAo3Creation()">🎲 催粉发文</button>
                        <button class="ao3-btn ao3-btn-red ao3-btn-sub" onclick="window.openCreateAo3WorkModal()">➕ 开坑新书</button>
                    </div>
                </div>

                <div class="ao3-works-scroll-list">
                    ${worksHtml}
                </div>
            </div>
        `;
    }

    function renderAo3ReaderView(container, workId) {
        const work = (G.fanworks || []).find(w => w._id === workId);
        if (!work) {
            G.ao3State.view = 'home';
            renderAo3HomeView(container);
            return;
        }

        if (!work.chapters || !work.chapters.length) {
            work.chapters = [{ chapterNum: 1, title: work.title, content: work.content || '正文草稿生成中...', day: 1 }];
        }

        const totalChapters = work.chapters.length;
        const curIdx = Math.min(Math.max(work.activeChapterIdx || 0, 0), totalChapters - 1);
        work.activeChapterIdx = curIdx;
        const chapter = work.chapters[curIdx] || work.chapters[0];

        const curUser = G.ao3User.username;
        const playerInfo = getPlayerIdentity();
        const isMain = curUser.trim() === playerInfo.name.trim();

        // 评论区
        if (!work.reviews) work.reviews = [];
        const reviewsHtml = work.reviews.length === 0 
            ? `<div style="text-align:center;color:#999;font-size:12px;padding:24px 0;">暂无书评，点击下方“生成书评”或发表你的第一条评论吧！</div>`
            : work.reviews.map((rev) => `
                <div class="ao3-review-item">
                    <div class="ao3-review-user-row">
                        <span class="ao3-review-user">${escapeHtml(rev.author || '同好读者')}</span>
                        <span class="ao3-review-time">${escapeHtml(rev.time || '')}</span>
                    </div>
                    <div class="ao3-review-content">${escapeHtml(rev.text || '')}</div>
                </div>
            `).join('');

        container.innerHTML = `
            <div class="ao3-app-viewport">
                <!-- 阅读器顶栏 -->
                <div class="ao3-classic-navbar">
                    <button class="ao3-back-btn" onclick="G.ao3State.view='home'; window.renderAo3App();">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg>
                        <span>文库目录</span>
                    </button>
                    <div class="ao3-reader-top-tools">
                        <!-- 🌟 转发到聊天联系人按钮 -->
                        <button class="ao3-btn ao3-btn-sub" onclick="window.openShareAo3ToChatModal('${work._id}')" title="转发到聊天 App">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                            <span>转发到聊天</span>
                        </button>
                    </div>
                </div>

                <!-- 文章主体 -->
                <div class="ao3-reading-container">
                    <div class="ao3-work-header-meta-block">
                        <div class="ao3-meta-tag-pre">ARCHIVE OF OUR OWN · WORK #${work._id.slice(-6)}</div>
                        <h1 class="ao3-read-h1">${escapeHtml(work.title)}</h1>
                        <div class="ao3-read-byline">
                            by <span style="color:#990000;font-weight:700;">${escapeHtml(work.author || '匿名作者')}</span>
                            ${work.pairing ? ` · CP: <b>${escapeHtml(work.pairing)}</b>` : ''}
                        </div>
                        <div class="ao3-tags-wrap" style="margin-top:6px;">
                            ${(work.tags || []).map(t => `<span class="ao3-tag-pill">${escapeHtml(t)}</span>`).join('')}
                        </div>
                        ${work.summary ? `<div class="ao3-work-summary-box" style="margin-top:10px;">${escapeHtml(work.summary)}</div>` : ''}
                    </div>

                    <!-- 章节切换导航 -->
                    <div class="ao3-chapter-switch-bar">
                        <button class="ao3-step-btn" ${curIdx === 0 ? 'disabled' : ''} onclick="window.stepAo3Chapter('${work._id}', -1)">上一章</button>
                        <span class="ao3-chapter-indicator">第 ${curIdx + 1} / ${totalChapters} 章</span>
                        <button class="ao3-step-btn" ${curIdx === totalChapters - 1 ? 'disabled' : ''} onclick="window.stepAo3Chapter('${work._id}', 1)">下一章</button>
                    </div>

                    <!-- 章节标题与正文 -->
                    <div class="ao3-chapter-content-wrap">
                        <h3 class="ao3-chapter-title">第 ${curIdx + 1} 章：${escapeHtml(chapter.title || '无题')}</h3>
                        <div class="ao3-prose-body">${escapeHtml(chapter.content)}</div>
                    </div>

                    <!-- 互动按钮群 -->
                    <div class="ao3-interaction-bar">
                        <button class="ao3-btn ao3-btn-red" onclick="window.urgeAo3NextChapter('${work._id}')">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                            <span>催更续写第 ${totalChapters + 1} 章</span>
                        </button>
                        <button class="ao3-btn ao3-btn-outline" onclick="window.giveAo3Kudos('${work._id}')">
                            <span>💚 投喂 Kudos (${work.kudos || 0})</span>
                        </button>
                    </div>

                    <!-- 读者评论区 -->
                    <div class="ao3-reviews-section">
                        <div class="ao3-reviews-header">
                            <span class="ao3-reviews-title">读者书评 (${work.reviews.length})</span>
                            <div style="display:flex;gap:6px;">
                                <button class="ao3-btn ao3-btn-sub" onclick="window.generateAo3CommentsAI('${work._id}')">🎲 生成读者书评</button>
                                <button class="ao3-btn ao3-btn-sub ao3-btn-red" onclick="window.openWriteAo3CommentModal('${work._id}')">✍️ 写书评</button>
                            </div>
                        </div>
                        <div class="ao3-reviews-subhint">
                            当前身份：<b>${escapeHtml(curUser)}</b> ${isMain ? '（官方实名）' : '（小号）'}
                        </div>
                        <div class="ao3-reviews-feed">
                            ${reviewsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================================
    // 3. 转发到聊天联系人与闪电手动触发机制 (核心联动)
    // ============================================================
    window.openShareAo3ToChatModal = function (workId) {
        const work = (G.fanworks || []).find(w => w._id === workId);
        if (!work) return;

        const liveCharacters = getLiveChatCharacters();
        if (liveCharacters.length === 0) {
            if (typeof showToast === 'function') showToast('聊天通讯录中暂无自建联系人，请先在聊天中心添加好友', 'info');
            return;
        }

        let charListHtml = liveCharacters.map(c => `
            <div class="ao3-contact-pick-row" onclick="window.confirmSendAo3ToContact('${work._id}', '${c.id}', '${escapeHtml(c.name)}')">
                <div class="ao3-contact-avatar">
                    ${c.avatar ? `<img src="${c.avatar}">` : `<div class="ao3-avatar-fallback">${c.name.slice(0, 1)}</div>`}
                </div>
                <div class="ao3-contact-info">
                    <div class="ao3-contact-name">${escapeHtml(c.name)}</div>
                    <div class="ao3-contact-persona">${escapeHtml(c.persona)}</div>
                </div>
                <button class="ao3-btn ao3-btn-sub" style="pointer-events:none;">发送</button>
            </div>
        `).join('');

        if (typeof openModal === 'function') {
            openModal(`
                <h3>📤 转发同人文至聊天</h3>
                <p style="font-size:12.5px;color:#666;line-height:1.5;">
                    选择要分享这篇《${escapeHtml(work.title)}》的自建聊天好友。<br>
                    <span style="color:#2e7d32;">💡 发送后对方不会立刻回复；进入聊天后，点击卡片右下角「⚡ 闪电」才会触发对方阅读评价！</span>
                </p>
                <div class="ao3-contact-picker-scroll" style="max-height:260px;overflow-y:auto;border:1px solid #eee;border-radius:8px;padding:4px;margin-top:8px;">
                    ${charListHtml}
                </div>
                <div class="btn-row" style="margin-top:12px;">
                    <button class="btn-secondary" onclick="closeModal()">取消</button>
                </div>
            `);
        }
    };

    window.confirmSendAo3ToContact = function (workId, contactId, contactName) {
        const work = (G.fanworks || []).find(w => w._id === workId);
        if (!work) return;

        const curIdx = work.activeChapterIdx || 0;
        const curChapter = (work.chapters && work.chapters[curIdx]) ? work.chapters[curIdx] : { content: '' };
        const textSnippet = (curChapter.content || '').slice(0, 260) + '...';

        const shareMsg = {
            id: 'ao3_share_' + Date.now(),
            role: 'user',
            type: 'ao3_share_card',
            workId: work._id,
            workTitle: work.title,
            workAuthor: work.author,
            workPairing: work.pairing || '全员向',
            workSnippet: textSnippet,
            text: `【同人文分享】《${work.title}》（配对：${work.pairing || '全员向'}）`,
            time: new Date().toLocaleTimeString().slice(0, 5),
            responded: false
        };

        if (typeof pushChatMessageSafe === 'function') {
            pushChatMessageSafe(contactId, shareMsg);
        } else {
            const storageKey = `mcyt_wechat_history_main_${contactId}`;
            try {
                const raw = localStorage.getItem(storageKey);
                const list = raw ? JSON.parse(raw) : [];
                list.push(shareMsg);
                localStorage.setItem(storageKey, JSON.stringify(list));
            } catch (_) {}
        }

        if (typeof closeModal === 'function') closeModal();
        if (typeof showToast === 'function') {
            showToast(`✅ 已将《${work.title}》转发给 ${contactName}！可在聊天中点闪电触发回复`, 'success', 2500);
        }
    };

    /**
     * 在聊天界面中点击卡片上的「⚡ 闪电」唤醒自建角色阅读并锐评
     */
    window.triggerAo3CardReplyAI = async function (npcId, msgId, workId) {
        if (window._isAnyChatGenerating || (window.G && window.G.isGenerating)) {
            if (typeof showToast === 'function') showToast('AI 正在忙线中，请稍候...', 'info');
            return;
        }

        const work = (G.fanworks || []).find(w => w._id === workId);
        if (!work) {
            if (typeof showToast === 'function') showToast('未能找到该同人小说的数据', 'error');
            return;
        }

        const liveCharacters = getLiveChatCharacters();
        const targetNpc = liveCharacters.find(c => c.id === npcId || c.name === npcId) || { name: '对方', persona: '自建好友' };
        const playerInfo = getPlayerIdentity();

        const curIdx = work.activeChapterIdx || 0;
        const curChapter = (work.chapters && work.chapters[curIdx]) ? work.chapters[curIdx] : { content: '' };
        const sampleText = (curChapter.content || '').slice(0, 500);

        if (typeof showToast === 'function') showToast(`⚡ ${targetNpc.name} 正在阅读小说并构思评价...`, 'info', 2000);

        const sysPrompt = `
你现在扮演自建角色「${targetNpc.name}」。
人设背景：${targetNpc.persona}
对话对象：女主角「${playerInfo.name}」（人设：${playerInfo.persona}）。

【剧情事件】：
${playerInfo.name} 刚给你在聊天里发来了一篇同人小说：
书名：《${work.title}》
作者：${work.author}（${work.author === playerInfo.name ? '注意：这是女主本人亲自写的！' : '这是读者太太写的'}）
涉及配对：${work.pairing || '全员向'}
节选片段如下：
“${sampleText}”

【回复指令（去 AI 味，严守真实人设）】：
1. 贴合你的性格与语气给出真实、生活化的读后反应。可以惊讶、害羞、吐槽、或者对小说里写你的情节提出抗议或暗喜。
2. 对话要口语化，加入自然的小语气词、打断或停顿，严禁机械书面语。
3. 如果配对涉及你和她，请根据你们平时的好感与羁绊表现出细腻微酸或开心的反应！
4. 字数控制在 40~100 字左右，直接输出回复内容，不要带任何括号说明。
`;

        try {
            if (typeof callAI === 'function') {
                const replyText = await callAI([
                    { role: 'system', content: sysPrompt },
                    { role: 'user', content: `我已经看完了你发给我的同人文《${work.title}》，我的想法是：` }
                ], { maxTokens: 300, temperature: 0.9 });

                const cleanedReply = cleanRawAIOutput(replyText);

                const responseMsg = {
                    id: 'msg_' + Date.now(),
                    role: 'assistant',
                    sender: targetNpc.name,
                    text: cleanedReply,
                    time: new Date().toLocaleTimeString().slice(0, 5)
                };

                if (typeof pushChatMessageSafe === 'function') {
                    pushChatMessageSafe(npcId, responseMsg);
                }

                if (typeof showToast === 'function') showToast(`💬 ${targetNpc.name} 刚刚回复了你的同人分享！`, 'success', 2000);

                if (typeof renderChatApp === 'function' && document.getElementById('chatAppContainer')) {
                    // 可选重绘
                }
            }
        } catch (err) {
            if (typeof showToast === 'function') showToast('生成评价失败：' + err.message, 'error');
        }
    };

    // ============================================================
    // 4. 开坑、催粉与章节续写 AI 生成核心
    // ============================================================
    window.openCreateAo3WorkModal = function () {
        ensureAo3DataIntegrity();
        const curUser = G.ao3User.username;
        const playerInfo = getPlayerIdentity();
        const isMain = curUser.trim() === playerInfo.name.trim();

        const liveCharacters = getLiveChatCharacters();

        if (typeof openModal === 'function') {
            openModal(`
                <h3>✍️ AO3 创作新书</h3>
                <div style="font-size:12px;color:#666;margin-bottom:8px;">
                    发布作者：<b style="color:${isMain ? '#990000' : '#2e7d32'};">${escapeHtml(curUser)}</b> ${isMain ? '（主播实名开坑）' : '（披皮小号）'}
                </div>

                <div class="form-group">
                    <label>作品标题 <span class="required">*</span></label>
                    <input type="text" id="ao3NewTitle" placeholder="起一个符合同人文质感的书名...">
                </div>

                <div class="form-group">
                    <label>叙事人称 (POV)</label>
                    <select id="ao3NewPovSelect" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;background:#fff;font-size:12.5px;">
                        <option value="third" selected>第三人称【她 / 主角名】（经典文库视角，细腻克制）</option>
                        <option value="second">第二人称【你】（沉浸交互视角）</option>
                        <option value="first">第一人称【我】（女主第一视点生活自白）</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>👥 核心登场角色 (纯乙女·来自聊天自建好友)</label>
                    <div id="ao3CharPickChips" style="display:flex;flex-wrap:wrap;gap:6px;max-height:80px;overflow-y:auto;padding:6px;border:1px solid #ddd;border-radius:6px;background:#fafafa;">
                        ${liveCharacters.length === 0 ? '<div style="font-size:11px;color:#999;padding:4px;">通讯录暂无自建角色，请先在聊天中添加</div>' : liveCharacters.map(c => `
                            <button type="button" class="ao3-chip-item" data-cname="${escapeHtml(c.name)}" onclick="this.classList.toggle('selected'); window.updateAo3PairingPreview();">
                                <span>＋</span> <span>${escapeHtml(c.name)}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div class="form-group">
                    <label>配对关系 (Pairing)</label>
                    <input type="text" id="ao3NewPairing" value="全员向 / 独宠女主" placeholder="如：角色A × 主角名、角色B & 主角名">
                </div>

                <div class="form-group">
                    <label>故事概要与灵感线索 <span class="required">*</span></label>
                    <textarea id="ao3NewSummary" rows="3" placeholder="写写开篇契机、关系暗涌或日常琐碎线索（AI 将严格执行去味指令，生成具备微动作与真实烟火气的正文）..."></textarea>
                </div>

                <div class="btn-row">
                    <button class="btn-secondary" onclick="closeModal()">取消</button>
                    <button class="btn-primary" id="btnConfirmGenAo3" onclick="window.executeCreateAo3Book()">🚀 开始生成第 1 章</button>
                </div>
            `);
        }
    };

    window.updateAo3PairingPreview = function () {
        const selected = Array.from(document.querySelectorAll('#ao3CharPickChips .ao3-chip-item.selected')).map(el => el.getAttribute('data-cname'));
        const pairingInput = document.getElementById('ao3NewPairing');
        const pName = getPlayerIdentity().name;
        if (pairingInput) {
            if (selected.length === 0) {
                pairingInput.value = '全员向 / 友情向';
            } else {
                pairingInput.value = `${selected.join(' & ')} × ${pName}`;
            }
        }
    };

    window.executeCreateAo3Book = async function () {
        const title = (document.getElementById('ao3NewTitle')?.value || '').trim();
        const summary = (document.getElementById('ao3NewSummary')?.value || '').trim();
        const pov = document.getElementById('ao3NewPovSelect')?.value || 'third';
        const pairing = (document.getElementById('ao3NewPairing')?.value || '').trim() || '全员向';

        if (!title || !summary) {
            if (typeof showToast === 'function') showToast('请填写书名与简介线索', 'error');
            return;
        }

        const selectedNames = Array.from(document.querySelectorAll('#ao3CharPickChips .ao3-chip-item.selected')).map(el => el.getAttribute('data-cname'));
        const liveChars = getLiveChatCharacters();
        const involvedCharDetails = liveChars.filter(c => selectedNames.includes(c.name)).map(c => `【${c.name}】：${c.persona}`).join('\n');

        const curUser = G.ao3User.username;
        const playerInfo = getPlayerIdentity();
        const isMain = curUser.trim() === playerInfo.name.trim();

        if (typeof closeModal === 'function') closeModal();
        if (typeof showToast === 'function') showToast('正在构思小说第 1 章（去 AI 味手笔注入中）...', 'info', 3000);

        const writingPrompt = buildHumanizedWritingInstructions(pov, pairing, isMain);

        const sysPrompt = `
你是一位活跃在 AO3 上的资深人类同人文作者，写作风格细腻、质朴、善于捕捉生活细节与人物的小别扭。
${writingPrompt}

【登场人物与真实背景设定】：
女主角（玩家）：${playerInfo.name}，人设：${playerInfo.persona}。
其他核心登场角色人设（来自聊天真实好友）：
${involvedCharDetails || '全员日常羁绊'}

【书籍规划】：
书名：《${title}》
CP/关系：${pairing}
简介梗概：${summary}

【格式要求】：请严格按照以下标签输出：
[CHAPTER_TITLE]第1章标题[/CHAPTER_TITLE]
[CONTENT]第1章正文内容（600-900字。细节充沛，人物有微动作、口语化对话，情感克制有余味）[/CONTENT]
`;

        try {
            if (typeof callAI === 'function') {
                const raw = await callAI([
                    { role: 'system', content: sysPrompt },
                    { role: 'user', content: '请开始创作新书第1章。' }
                ], { maxTokens: 4000, temperature: 0.92 });

                const chTitle = extractAo3Tag(raw, 'CHAPTER_TITLE') || '启程与琐碎日常';
                const content = extractAo3Tag(raw, 'CONTENT') || cleanRawAIOutput(raw);

                const newWork = {
                    _id: 'ao3_' + Date.now(),
                    title,
                    pairing,
                    pov,
                    tags: ['原创同人', '生活细节', '纯乙女向'],
                    summary,
                    author: curUser,
                    kudos: Math.floor(Math.random() * 40) + 10,
                    reviews: [],
                    activeChapterIdx: 0,
                    chapters: [
                        { chapterNum: 1, title: chTitle, content, day: G.day || 1 }
                    ]
                };

                G.fanworks.unshift(newWork);
                if (typeof autoSaveGame === 'function') autoSaveGame();

                if (typeof showToast === 'function') showToast(`🎉 《${title}》成功发布到 AO3 文库！`, 'success', 2500);
                G.ao3State.view = 'read';
                G.ao3State.activeWorkId = newWork._id;
                window.renderAo3App();
            }
        } catch (e) {
            if (typeof showToast === 'function') showToast('生成小说失败：' + e.message, 'error');
        }
    };

    window.triggerFanAo3Creation = async function () {
        const liveChars = getLiveChatCharacters();
        if (liveChars.length === 0) {
            if (typeof showToast === 'function') showToast('聊天通讯录中暂无好友，无法催更粉丝生成小说', 'info');
            return;
        }

        const playerInfo = getPlayerIdentity();
        const randomChar = liveChars[Math.floor(Math.random() * liveChars.length)];

        if (typeof showToast === 'function') showToast(`🎲 粉丝正在为 ${playerInfo.name} 与 ${randomChar.name} 创作新同人文...`, 'info', 2500);

        const curUser = `同人太太_${Math.floor(Math.random() * 900 + 100)}`;
        const pairing = `${randomChar.name} × ${playerInfo.name}`;
        const writingPrompt = buildHumanizedWritingInstructions('third', pairing, false);

        const sysPrompt = `
你是一位 AO3 上的神仙同人太太，深爱女主「${playerInfo.name}」与搭档「${randomChar.name}」之间的真实互动。
${writingPrompt}

【真实人设参考】：
女主（${playerInfo.name}）：${playerInfo.persona}
搭档（${randomChar.name}）：${randomChar.persona}

请写一篇他们二人相处的细腻短篇第 1 章。
严格按标签输出：
[TITLE]小说书名[/TITLE]
[SUMMARY]小说简介（50字左右）[/SUMMARY]
[CHAPTER_TITLE]第1章标题[/CHAPTER_TITLE]
[CONTENT]正文内容（500-800字，对话口语化，微动作饱满）[/CONTENT]
`;

        try {
            if (typeof callAI === 'function') {
                const raw = await callAI([
                    { role: 'system', content: sysPrompt },
                    { role: 'user', content: '请创作这篇粉丝向同人文。' }
                ], { maxTokens: 3500, temperature: 0.95 });

                const title = extractAo3Tag(raw, 'TITLE') || `${randomChar.name}的私房备忘录`;
                const summary = extractAo3Tag(raw, 'SUMMARY') || `关于那些微酸又动人的相处片段。`;
                const chTitle = extractAo3Tag(raw, 'CHAPTER_TITLE') || '意外断联的黄昏';
                const content = extractAo3Tag(raw, 'CONTENT') || cleanRawAIOutput(raw);

                const newWork = {
                    _id: 'ao3_fan_' + Date.now(),
                    title,
                    pairing,
                    pov: 'third',
                    tags: ['粉丝粮产', '口语化日常', '纯爱'],
                    summary,
                    author: curUser,
                    kudos: Math.floor(Math.random() * 120) + 30,
                    reviews: [],
                    activeChapterIdx: 0,
                    chapters: [
                        { chapterNum: 1, title: chTitle, content, day: G.day || 1 }
                    ]
                };

                G.fanworks.unshift(newWork);
                if (typeof autoSaveGame === 'function') autoSaveGame();
                if (typeof showToast === 'function') showToast(`🎉 读者太太上传了新作《${title}》！`, 'success', 2500);

                G.ao3State.view = 'read';
                G.ao3State.activeWorkId = newWork._id;
                window.renderAo3App();
            }
        } catch (e) {
            if (typeof showToast === 'function') showToast('生成作品失败：' + e.message, 'error');
        }
    };

    window.urgeAo3NextChapter = async function (workId) {
        const work = (G.fanworks || []).find(w => w._id === workId);
        if (!work) return;

        const nextNum = (work.chapters ? work.chapters.length : 0) + 1;
        const lastCh = work.chapters[work.chapters.length - 1];
        const lastSlice = (lastCh && lastCh.content) ? lastCh.content.slice(-350) : '';

        const playerInfo = getPlayerIdentity();
        const curUser = G.ao3User.username;
        const isMain = curUser.trim() === playerInfo.name.trim();

        if (typeof showToast === 'function') showToast(`📢 正在催更续写第 ${nextNum} 章...`, 'info', 2500);

        const writingPrompt = buildHumanizedWritingInstructions(work.pov || 'third', work.pairing || '全员向', isMain);

        const sysPrompt = `
你正在 AO3 网站上续写同人文《${work.title}》（配对：${work.pairing}，原作者：${work.author}）。
${writingPrompt}

前一章结尾片段：
“${lastSlice}”

请自然承接上文，创作【第 ${nextNum} 章】。
严格按标签输出：
[CHAPTER_TITLE]本章标题[/CHAPTER_TITLE]
[CONTENT]续写正文（500-800字，对话真实克制，生活感充沛）[/CONTENT]
`;

        try {
            if (typeof callAI === 'function') {
                const raw = await callAI([
                    { role: 'system', content: sysPrompt },
                    { role: 'user', content: `请续写第 ${nextNum} 章。` }
                ], { maxTokens: 3500, temperature: 0.95 });

                const chTitle = extractAo3Tag(raw, 'CHAPTER_TITLE') || `第 ${nextNum} 幕`;
                const content = extractAo3Tag(raw, 'CONTENT') || cleanRawAIOutput(raw);

                work.chapters.push({
                    chapterNum: nextNum,
                    title: chTitle,
                    content,
                    day: G.day || 1
                });
                work.activeChapterIdx = work.chapters.length - 1;
                work.kudos = (work.kudos || 0) + Math.floor(Math.random() * 25 + 5);

                if (typeof autoSaveGame === 'function') autoSaveGame();
                if (typeof showToast === 'function') showToast(`🎉 第 ${nextNum} 章已发布更新！`, 'success', 2000);
                window.renderAo3App();
            }
        } catch (e) {
            if (typeof showToast === 'function') showToast('续写失败：' + e.message, 'error');
        }
    };

    window.generateAo3CommentsAI = async function (workId) {
        const work = (G.fanworks || []).find(w => w._id === workId);
        if (!work) return;

        const playerInfo = getPlayerIdentity();
        const isAuthorMe = work.author.trim() === playerInfo.name.trim();

        if (typeof showToast === 'function') showToast('🎲 读者正在阅读并撰写书评...', 'info', 1500);

        const sysPrompt = `
你正在模拟 AO3 小说《${work.title}》（CP: ${work.pairing}，作者：${work.author}）下方的真实读者评论。
【背景重点】：
${isAuthorMe ? `惊天大事：小说作者就是主播「${playerInfo.name}」本人！读者评论应该充满震撼、尖叫、“正主亲自产粮”的狂喜！` : '读者们沉浸在故事的微酸与甜度中，讨论细节与催更。'}

请生成 3 条鲜活生动的读者评论。
格式要求（每行一条）：
[COMMENT author=读者网名]评论内容（口语化、生动、含微表情）[/COMMENT]
`;

        try {
            if (typeof callAI === 'function') {
                const raw = await callAI([
                    { role: 'system', content: sysPrompt },
                    { role: 'user', content: '请输出3条书评。' }
                ], { maxTokens: 600, temperature: 0.95 });

                if (!work.reviews) work.reviews = [];
                const re = /\[COMMENT\s+author=([^\]]+)\]([\s\S]*?)(?:\[\/COMMENT\]|$)/gi;
                let m;
                let added = 0;
                while ((m = re.exec(raw)) !== null) {
                    const author = m[1].trim();
                    const text = cleanRawAIOutput(m[2]);
                    if (text) {
                        work.reviews.unshift({
                            id: 'rev_' + Date.now() + '_' + Math.floor(Math.random() * 999),
                            author: author || '潜水同好',
                            text,
                            time: '刚刚'
                        });
                        added++;
                    }
                }

                if (added === 0 && raw.trim()) {
                    work.reviews.unshift({
                        id: 'rev_' + Date.now(),
                        author: '终极原著粉',
                        text: cleanRawAIOutput(raw).slice(0, 100),
                        time: '刚刚'
                    });
                }

                if (typeof autoSaveGame === 'function') autoSaveGame();
                if (typeof showToast === 'function') showToast('✅ 读者书评已更新！', 'success', 1500);
                window.renderAo3App();
            }
        } catch (e) {
            if (typeof showToast === 'function') showToast('书评生成失败：' + e.message, 'error');
        }
    };

    window.openWriteAo3CommentModal = function (workId) {
        const curUser = G.ao3User.username;
        if (typeof openModal === 'function') {
            openModal(`
                <h3>✍️ 发表书评</h3>
                <div style="font-size:12px;color:#666;margin-bottom:6px;">以 <b>${escapeHtml(curUser)}</b> 的笔名留言：</div>
                <div class="form-group">
                    <textarea id="myAo3CommentInput" rows="3" placeholder="写下你对本章节的感悟或吐槽..."></textarea>
                </div>
                <div class="btn-row">
                    <button class="btn-secondary" onclick="closeModal()">取消</button>
                    <button class="btn-primary" onclick="window.confirmPostAo3Comment('${workId}')">发表评论</button>
                </div>
            `);
        }
    };

    window.confirmPostAo3Comment = function (workId) {
        const text = (document.getElementById('myAo3CommentInput')?.value || '').trim();
        if (!text) {
            if (typeof showToast === 'function') showToast('评论不能为空', 'error');
            return;
        }

        const work = (G.fanworks || []).find(w => w._id === workId);
        if (work) {
            if (!work.reviews) work.reviews = [];
            work.reviews.unshift({
                id: 'rev_my_' + Date.now(),
                author: G.ao3User.username,
                text,
                time: '刚刚'
            });
            if (typeof closeModal === 'function') closeModal();
            if (typeof showToast === 'function') showToast('✅ 评论发表成功！', 'success');
            if (typeof autoSaveGame === 'function') autoSaveGame();
            window.renderAo3App();
        }
    };

    window.openAo3WorkDetail = function (workId) {
        G.ao3State.view = 'read';
        G.ao3State.activeWorkId = workId;
        window.renderAo3App();
    };

    window.stepAo3Chapter = function (workId, step) {
        const work = (G.fanworks || []).find(w => w._id === workId);
        if (work && work.chapters) {
            work.activeChapterIdx = Math.min(Math.max((work.activeChapterIdx || 0) + step, 0), work.chapters.length - 1);
            window.renderAo3App();
        }
    };

    window.giveAo3Kudos = function (workId) {
        const work = (G.fanworks || []).find(w => w._id === workId);
        if (work) {
            work.kudos = (work.kudos || 0) + 1;
            if (typeof showToast === 'function') showToast('💚 已留下 Kudos！', 'success', 1000);
            if (typeof autoSaveGame === 'function') autoSaveGame();
            window.renderAo3App();
        }
    };

    window.openAo3WorkOptionsModal = function (workId) {
        const work = (G.fanworks || []).find(w => w._id === workId);
        if (!work) return;

        if (typeof openModal === 'function') {
            openModal(`
                <h3>⚙️ 作品管理：《${escapeHtml(work.title)}》</h3>
                <div class="btn-row" style="flex-direction:column;gap:8px;margin-top:14px;">
                    <button class="btn-secondary" style="width:100%;color:#c62828;border-color:#ffcdd2;" onclick="window.confirmDeleteAo3Work('${workId}')">🗑️ 从文库中删除此书</button>
                    <button class="btn-secondary" style="width:100%;" onclick="closeModal()">取消</button>
                </div>
            `);
        }
    };

    window.confirmDeleteAo3Work = function (workId) {
        if (confirm('确定要删除这部作品吗？操作无法撤回。')) {
            const idx = (G.fanworks || []).findIndex(w => w._id === workId);
            if (idx !== -1) G.fanworks.splice(idx, 1);
            if (G.ao3State.activeWorkId === workId) {
                G.ao3State.view = 'home';
                G.ao3State.activeWorkId = null;
            }
            if (typeof closeModal === 'function') closeModal();
            if (typeof showToast === 'function') showToast('🗑️ 作品已删除', 'success');
            if (typeof autoSaveGame === 'function') autoSaveGame();
            window.renderAo3App();
        }
    };

    window.openAo3IdentitySettings = function () {
        const curUser = G.ao3User.username;
        const playerInfo = getPlayerIdentity();
        const isMain = curUser.trim() === playerInfo.name.trim();

        if (typeof openModal === 'function') {
            openModal(`
                <h3>👤 AO3 笔名与身份切换</h3>
                <div class="form-group">
                    <label>当前发文与评论笔名</label>
                    <input type="text" id="ao3InputPenName" value="${escapeHtml(curUser)}">
                </div>
                <div style="font-size:12px;color:#666;line-height:1.6;margin:8px 0;">
                    ${isMain 
                        ? '🌟 <b>主播实名模式</b>：读者和同人文世界会知道作者正是主播本人！' 
                        : '🕶️ <b>披皮小号模式</b>：读者以普通太太对待，暗戳戳享受不掉马的乐趣。'}
                </div>
                <div class="btn-row">
                    <button class="btn-secondary" onclick="document.getElementById('ao3InputPenName').value = '${escapeHtml(playerInfo.name)}';">恢复主播名</button>
                    <button class="btn-primary" onclick="window.saveAo3Identity()">保存设置</button>
                </div>
            `);
        }
    };

    window.saveAo3Identity = function () {
        const val = (document.getElementById('ao3InputPenName')?.value || '').trim();
        if (!val) return;
        G.ao3User.username = val;
        if (typeof closeModal === 'function') closeModal();
        if (typeof showToast === 'function') showToast(`✅ 笔名已切换为「${val}」`, 'success');
        if (typeof autoSaveGame === 'function') autoSaveGame();
        window.renderAo3App();
    };

    function injectAo3Styles() {
        if (document.getElementById('ao3UnifiedStyles')) return;
        const style = document.createElement('style');
        style.id = 'ao3UnifiedStyles';
        style.textContent = `
            .ao3-app-viewport {
                display: flex; flex-direction: column; width: 100%; height: 100%;
                background: #fbf9f4; color: #2a2a2a; font-family: -apple-system, Georgia, "Times New Roman", serif;
                overflow: hidden; box-sizing: border-box;
            }
            .ao3-classic-navbar {
                display: flex; align-items: center; justify-content: space-between;
                padding: 10px 14px; background: #990000; color: #ffffff;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15); flex-shrink: 0;
            }
            .ao3-logo-group {
                display: flex; align-items: center; gap: 8px; cursor: pointer;
            }
            .ao3-logo-monogram {
                font-family: Georgia, serif; font-size: 20px; font-weight: 800;
                background: #ffffff; color: #990000; border-radius: 4px; padding: 2px 6px;
                letter-spacing: -0.5px;
            }
            .ao3-logo-text { display: flex; flex-direction: column; }
            .ao3-main-title { font-size: 13px; font-weight: 700; letter-spacing: 0.2px; line-height: 1.2; }
            .ao3-sub-title { font-size: 9.5px; opacity: 0.85; font-family: -apple-system, sans-serif; }

            .ao3-user-badge {
                display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.18);
                border: 0.5px solid rgba(255,255,255,0.3); border-radius: 12px; padding: 3px 9px;
                font-size: 11px; cursor: pointer; font-family: -apple-system, sans-serif;
            }
            .ao3-sub-toolbar {
                display: flex; align-items: center; justify-content: space-between;
                padding: 8px 14px; background: #f0e9dc; border-bottom: 1px solid #e0d6c4;
                font-family: -apple-system, sans-serif; flex-shrink: 0;
            }
            .ao3-filter-label { font-size: 11.5px; color: #555; }

            .ao3-btn {
                border: none; outline: none; border-radius: 6px; padding: 6px 12px;
                font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s ease;
                display: inline-flex; align-items: center; gap: 4px; font-family: -apple-system, sans-serif;
            }
            .ao3-btn-red { background: #990000; color: #ffffff; }
            .ao3-btn-outline { background: #ffffff; color: #990000; border: 1px solid #990000; }
            .ao3-btn-sub { padding: 4px 8px; font-size: 11px; border-radius: 4px; background: #ffffff; border: 1px solid #d4c8b6; color: #333; }
            .ao3-btn-sub.ao3-btn-red { background: #990000; color: #fff; border-color: #990000; }

            .ao3-works-scroll-list {
                flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 12px;
            }
            .ao3-work-card {
                background: #ffffff; border: 1px solid #e5dcce; border-left: 4px solid #990000;
                border-radius: 4px; padding: 12px 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
                cursor: pointer; transition: transform 0.1s ease;
            }
            .ao3-work-card:active { transform: scale(0.995); }
            .ao3-work-title-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
            .ao3-work-title { font-size: 15.5px; font-weight: 700; color: #990000; }
            .ao3-badge-author { font-size: 10px; background: #fff0f0; color: #990000; border: 1px solid #ffcccc; border-radius: 3px; padding: 1px 4px; font-family: -apple-system, sans-serif; }
            .ao3-work-byline { font-size: 11.5px; color: #666; margin: 3px 0 6px; }
            .ao3-author-link { color: #222; font-weight: 600; }

            .ao3-tags-wrap { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 8px; }
            .ao3-tag-pill {
                font-size: 10.5px; background: #f2eee6; color: #625340; border-radius: 3px;
                padding: 1px 6px; font-family: -apple-system, sans-serif;
            }
            .ao3-work-summary-box {
                font-size: 12.5px; line-height: 1.6; color: #444; background: #faf8f3;
                border-left: 2px solid #ddd; padding: 6px 10px; margin-bottom: 8px;
            }
            .ao3-work-footer-meta {
                display: flex; align-items: center; gap: 12px; font-size: 11px; color: #888;
                font-family: -apple-system, sans-serif; border-top: 1px dashed #eee; padding-top: 6px;
            }
            .ao3-manage-btn {
                margin-left: auto; background: none; border: 1px solid #ddd; border-radius: 3px;
                padding: 2px 6px; font-size: 10px; color: #666; cursor: pointer;
            }

            .ao3-reading-container {
                flex: 1; overflow-y: auto; padding: 16px; background: #fdfbf7;
            }
            .ao3-work-header-meta-block {
                border-bottom: 2px solid #990000; padding-bottom: 12px; margin-bottom: 14px;
            }
            .ao3-meta-tag-pre { font-size: 10px; font-weight: 700; color: #990000; letter-spacing: 1px; font-family: -apple-system, sans-serif; }
            .ao3-read-h1 { font-size: 20px; font-weight: 800; color: #111; margin: 4px 0; }
            .ao3-read-byline { font-size: 12px; color: #555; }

            .ao3-chapter-switch-bar {
                display: flex; align-items: center; justify-content: space-between;
                background: #f1ebdE; border: 1px solid #ded5c2; border-radius: 6px;
                padding: 6px 10px; margin: 12px 0 16px; font-family: -apple-system, sans-serif;
            }
            .ao3-step-btn {
                background: #fff; border: 1px solid #ccc; border-radius: 4px;
                padding: 4px 10px; font-size: 11.5px; cursor: pointer; color: #990000; font-weight: 600;
            }
            .ao3-step-btn:disabled { opacity: 0.4; cursor: not-allowed; }
            .ao3-chapter-indicator { font-size: 12px; font-weight: 600; color: #444; }

            .ao3-chapter-title { font-size: 16px; font-weight: 700; color: #990000; margin-bottom: 12px; border-bottom: 1px dashed #dcd4c6; padding-bottom: 4px; }
            .ao3-prose-body {
                font-size: 15px; line-height: 2.1; color: #1e1e1e; white-space: pre-wrap;
                word-break: break-word; letter-spacing: 0.3px;
            }

            .ao3-interaction-bar {
                display: flex; gap: 10px; justify-content: center; margin: 24px 0;
            }
            .ao3-reviews-section {
                border-top: 1px solid #e0d8c8; padding-top: 16px; font-family: -apple-system, sans-serif;
            }
            .ao3-reviews-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
            .ao3-reviews-title { font-size: 14px; font-weight: 700; color: #990000; }
            .ao3-reviews-subhint { font-size: 11px; color: #888; margin-bottom: 12px; }
            .ao3-reviews-feed { display: flex; flex-direction: column; gap: 10px; }
            .ao3-review-item {
                background: #fff; border: 1px solid #e6ded0; border-radius: 6px; padding: 10px;
            }
            .ao3-review-user-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .ao3-review-user { font-size: 12px; font-weight: 700; color: #990000; }
            .ao3-review-time { font-size: 10px; color: #aaa; }
            .ao3-review-content { font-size: 12.5px; line-height: 1.5; color: #333; }

            .ao3-contact-pick-row {
                display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 6px;
                cursor: pointer; transition: background 0.15s; border-bottom: 1px solid #f5f5f5;
            }
            .ao3-contact-pick-row:hover { background: #f0f7f2; }
            .ao3-contact-avatar {
                width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: #eee; flex-shrink: 0;
            }
            .ao3-contact-avatar img { width: 100%; height: 100%; object-fit: cover; }
            .ao3-avatar-fallback {
                width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
                background: #990000; color: #fff; font-weight: 700; font-size: 14px;
            }
            .ao3-contact-info { flex: 1; min-width: 0; }
            .ao3-contact-name { font-size: 13px; font-weight: 700; color: #222; }
            .ao3-contact-persona { font-size: 11px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            .ao3-chip-item {
                border: 1px solid #ccc; background: #fff; border-radius: 12px; padding: 3px 8px;
                font-size: 11.5px; cursor: pointer; color: #333; display: inline-flex; align-items: center; gap: 3px;
            }
            .ao3-chip-item.selected {
                background: #fbebee; border-color: #990000; color: #990000; font-weight: 600;
            }
            .ao3-back-btn {
                background: none; border: none; color: #ffffff; display: inline-flex; align-items: center;
                gap: 4px; font-size: 12.5px; font-weight: 600; cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }

    injectAo3Styles();
})();
