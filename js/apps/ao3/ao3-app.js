/**
 * js/apps/ao3/ao3-app.js
 * 同人文库 App（站点聚合导航与沉浸式 AO3 文学空间）
 * 
 * 核心设计：
 * 1. 强制覆盖原生丑粉框：彻底隐藏宿主粉红假顶栏，视口 100% 沉浸全屏，保留系统时间电量。
 * 2. 站点聚合门户：进入首先呈现同人文库站点导航，首发收录 Archive of Our Own (AO3)。
 * 3. 独立纯净弹窗：自建白灰极简大方卡片浮层，拔除任何红黑位移、重影与粉框。
 * 4. 纯净文学排版：地毯式清除全部 Emoji，纯正象牙白与学术暗红质感。
 * 5. 唯一角色来源：100% 直连通讯录自建联系人，深度去 AI 味小说创作。
 */

(function () {
    'use strict';

    // ============================================================
    // 0. 数据完整性与自建联系人池保障
    // ============================================================
    function ensureAo3DataIntegrity() {
        if (!window.G) window.G = {};
        if (!G.fanworks) G.fanworks = [];
        if (!G.ao3State) {
            G.ao3State = {
                view: 'portal', // 'portal' (站点导航) | 'home' (AO3文库) | 'read' (正文阅读)
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
     * 100% 仅获取聊天 APP 中真实自建的联系人
     */
    function getLiveChatCharacters() {
        const pool = [];
        const seenIds = new Set();

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

    function getPlayerIdentity() {
        let name = '女主角';
        let persona = '细腻生动的女性创作者';

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
    // 1. 去 AI 味同人文提示词引擎
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
    // 2. 自建高级白灰纯净弹窗与状态胶囊
    // ============================================================
    function openAo3CustomModal(htmlContent) {
        let modalEl = document.getElementById('ao3GlobalCustomModal');
        if (!modalEl) {
            modalEl = document.createElement('div');
            modalEl.id = 'ao3GlobalCustomModal';
            modalEl.className = 'ao3-custom-modal-backdrop';
            document.body.appendChild(modalEl);
        }

        modalEl.innerHTML = `
            <div class="ao3-custom-modal-window">
                ${htmlContent}
            </div>
        `;

        requestAnimationFrame(() => modalEl.classList.add('visible'));
    }

    function closeAo3CustomModal() {
        const modalEl = document.getElementById('ao3GlobalCustomModal');
        if (modalEl) {
            modalEl.classList.remove('visible');
            setTimeout(() => { modalEl.innerHTML = ''; }, 200);
        }
    }
    window.closeAo3CustomModal = closeAo3CustomModal;

    function showAo3GeneratingPill(text) {
        let pill = document.getElementById('ao3GeneratingPill');
        if (!pill) {
            pill = document.createElement('div');
            pill.id = 'ao3GeneratingPill';
            pill.className = 'ao3-generating-pill';
            document.body.appendChild(pill);
        }
        pill.innerHTML = `
            <span class="ao3-pill-dot"></span>
            <span class="ao3-pill-text">${escapeHtml(text || '正在构思推演...')}</span>
        `;
        pill.classList.add('visible');
    }

    function hideAo3GeneratingPill() {
        const pill = document.getElementById('ao3GeneratingPill');
        if (pill) pill.classList.remove('visible');
    }

    /**
     * 退出 App 返回手机桌面，并复原宿主顶栏
     */
    window.exitAo3ToDesktop = function () {
        document.body.classList.remove('ao3-active-fullscreen');
        if (typeof window.closePhoneApp === 'function') {
            window.closePhoneApp();
        } else if (typeof window.closeModal === 'function') {
            window.closeModal();
        } else {
            const body = document.getElementById('appModalBody');
            if (body) body.innerHTML = '';
            const modal = document.getElementById('appModal');
            if (modal) modal.style.display = 'none';
        }
    };

    // ============================================================
    // 3. 视图分发引擎
    // ============================================================
    window.renderAo3App = function (containerEl) {
        ensureAo3DataIntegrity();
        // 激活全局全屏沉浸标记，强制隐藏原生粉框
        document.body.classList.add('ao3-active-fullscreen');

        const target = containerEl || document.getElementById('appModalBody');
        if (!target) return;

        const st = G.ao3State;
        if (st.view === 'portal') {
            renderAo3PortalView(target);
        } else if (st.view === 'read' && st.activeWorkId) {
            renderAo3ReaderView(target, st.activeWorkId);
        } else {
            renderAo3HomeView(target);
        }
    };

    // ============================================================
    // 3.1 站点导航门户视图 (Portal View)
    // ============================================================
    function renderAo3PortalView(container) {
        const worksCount = (G.fanworks || []).length;
        container.innerHTML = `
            <div class="ao3-app-viewport">
                <!-- 顶层系统级导航栏（替代原生粉框） -->
                <div class="ao3-top-unified-bar">
                    <button class="ao3-back-nav-btn" onclick="window.exitAo3ToDesktop()">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg>
                        <span>桌面</span>
                    </button>
                    <div class="ao3-top-unified-title">同人文库</div>
                    <div style="width:48px;"></div>
                </div>

                <div class="ao3-portal-scroll-area">
                    <div class="ao3-portal-hero">
                        <div class="ao3-portal-hero-title">文学创作与同人站点</div>
                        <div class="ao3-portal-hero-desc">探索由创作者与读者共同筑起的文字世界</div>
                    </div>

                    <div class="ao3-portal-grid">
                        <!-- AO3 主站点卡片 -->
                        <div class="ao3-portal-card active" onclick="G.ao3State.view='home'; window.renderAo3App();">
                            <div class="ao3-portal-card-top">
                                <span class="ao3-portal-badge">主站点</span>
                                <span class="ao3-portal-count">${worksCount} 篇收录</span>
                            </div>
                            <div class="ao3-portal-logo-row">
                                <span class="ao3-logo-monogram">AO3</span>
                                <div>
                                    <div class="ao3-portal-site-name">Archive of Our Own</div>
                                    <div class="ao3-portal-site-sub">纯乙女向与独立同人文库</div>
                                </div>
                            </div>
                            <div class="ao3-portal-card-desc">
                                沉浸式学术文献排版，无杂质阅读体验，支持角色人设无缝注入与读者互动。
                            </div>
                            <div class="ao3-portal-enter-bar">
                                <span>进入文库</span>
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                            </div>
                        </div>

                        <!-- 预留扩展站点位 -->
                        <div class="ao3-portal-card disabled">
                            <div class="ao3-portal-card-top">
                                <span class="ao3-portal-badge-muted">待接入</span>
                            </div>
                            <div class="ao3-portal-logo-row">
                                <span class="ao3-logo-monogram-muted">LOF</span>
                                <div>
                                    <div class="ao3-portal-site-name">Lofter 粮仓</div>
                                    <div class="ao3-portal-site-sub">轻量短篇与碎碎念专区</div>
                                </div>
                            </div>
                            <div class="ao3-portal-card-desc">
                                正在筹备连接中，敬请期待更多创作生态...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================================
    // 3.2 AO3 文库主列表视图
    // ============================================================
    function renderAo3HomeView(container) {
        const works = [...(G.fanworks || [])].reverse();
        const curUser = G.ao3User.username;
        const playerInfo = getPlayerIdentity();
        const isMain = curUser.trim() === playerInfo.name.trim();

        let worksHtml = '';
        if (works.length === 0) {
            worksHtml = `
                <div class="ao3-empty-slate">
                    <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#990000" stroke-width="1.2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                    <div class="ao3-empty-title">文库暂无收录作品</div>
                    <div class="ao3-empty-sub">亲手开坑或邀请粉丝产粮，文字都在等待诞生</div>
                    <div class="ao3-empty-actions">
                        <button class="ao3-btn ao3-btn-sub" onclick="window.triggerFanAo3Creation()">催读者开坑</button>
                        <button class="ao3-btn ao3-btn-red" onclick="window.openCreateAo3WorkModal()">亲手开坑</button>
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
                        <div class="ao3-work-summary-box">${escapeHtml(w.summary || '暂无故事摘要')}</div>

                        <div class="ao3-work-footer-meta">
                            <span class="ao3-meta-item">${chapterCount} 章</span>
                            <span class="ao3-meta-item">${w.kudos || 0} Kudos</span>
                            <span class="ao3-meta-item">${(w.reviews || []).length} 评论</span>
                            <button class="ao3-manage-btn" onclick="event.stopPropagation(); window.openAo3WorkOptionsModal('${w._id}')">管理</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        container.innerHTML = `
            <div class="ao3-app-viewport">
                <!-- AO3 顶层沉浸导航栏 -->
                <div class="ao3-top-unified-bar">
                    <button class="ao3-back-nav-btn" onclick="G.ao3State.view='portal'; window.renderAo3App();">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg>
                        <span>站点导航</span>
                    </button>
                    <div class="ao3-top-unified-title">Archive of Our Own</div>
                    <div class="ao3-user-badge" onclick="window.openAo3IdentitySettings()">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <span>${escapeHtml(curUser)}</span>
                        <small>(${isMain ? '主号' : '小号'})</small>
                    </div>
                </div>

                <!-- 次级工具栏 -->
                <div class="ao3-sub-toolbar">
                    <div class="ao3-filter-label">收录作品：<b>${works.length}</b> 篇</div>
                    <div style="display:flex;gap:8px;">
                        <button class="ao3-btn ao3-btn-sub" onclick="window.triggerFanAo3Creation()">催粉发文</button>
                        <button class="ao3-btn ao3-btn-red ao3-btn-sub" onclick="window.openCreateAo3WorkModal()">开坑新书</button>
                    </div>
                </div>

                <div class="ao3-works-scroll-list">
                    ${worksHtml}
                </div>
            </div>
        `;
    }

    // ============================================================
    // 3.3 AO3 沉浸阅读视图
    // ============================================================
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

        if (!work.reviews) work.reviews = [];
        const reviewsHtml = work.reviews.length === 0 
            ? `<div style="text-align:center;color:#999;font-size:12px;padding:24px 0;">暂无书评，点击下方“生成书评”或发表你的第一条评论吧</div>`
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
                <div class="ao3-top-unified-bar">
                    <button class="ao3-back-nav-btn" onclick="G.ao3State.view='home'; window.renderAo3App();">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 18l-6-6 6-6"/></svg>
                        <span>目录</span>
                    </button>
                    <div class="ao3-top-unified-title">${escapeHtml(work.title)}</div>
                    <div>
                        <button class="ao3-btn ao3-btn-sub" onclick="window.openShareAo3ToChatModal('${work._id}')">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                            <span>转发</span>
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
                            ${work.pairing ? ` · 配对: <b>${escapeHtml(work.pairing)}</b>` : ''}
                        </div>
                        <div class="ao3-tags-wrap" style="margin-top:8px;">
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
                            <span>催更续写第 ${totalChapters + 1} 章</span>
                        </button>
                        <button class="ao3-btn ao3-btn-outline" onclick="window.giveAo3Kudos('${work._id}')">
                            <span>投喂 Kudos (${work.kudos || 0})</span>
                        </button>
                    </div>

                    <!-- 读者评论区 -->
                    <div class="ao3-reviews-section">
                        <div class="ao3-reviews-header">
                            <span class="ao3-reviews-title">读者书评 (${work.reviews.length})</span>
                            <div style="display:flex;gap:6px;">
                                <button class="ao3-btn ao3-btn-sub" onclick="window.generateAo3CommentsAI('${work._id}')">生成读者书评</button>
                                <button class="ao3-btn ao3-btn-sub ao3-btn-red" onclick="window.openWriteAo3CommentModal('${work._id}')">写书评</button>
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
    // 4. 极简转发弹窗（自建纯净浮层，无说教）
    // ============================================================
    window.openShareAo3ToChatModal = function (workId) {
        const work = (G.fanworks || []).find(w => w._id === workId);
        if (!work) return;

        const liveCharacters = getLiveChatCharacters();
        if (liveCharacters.length === 0) {
            if (typeof showToast === 'function') showToast('通讯录中暂无好友，请先在聊天中添加好友', 'info');
            return;
        }

        const charListHtml = liveCharacters.map(c => `
            <div class="ao3-contact-pick-row" onclick="window.confirmSendAo3ToContact('${work._id}', '${c.id}', '${escapeHtml(c.name)}')">
                <div class="ao3-contact-avatar">
                    ${c.avatar ? `<img src="${c.avatar}">` : `<div class="ao3-avatar-fallback">${escapeHtml(c.name.slice(0, 1))}</div>`}
                </div>
                <div class="ao3-contact-info">
                    <div class="ao3-contact-name">${escapeHtml(c.name)}</div>
                    <div class="ao3-contact-persona">${escapeHtml(c.persona)}</div>
                </div>
                <button class="ao3-contact-send-btn">发送</button>
            </div>
        `).join('');

        openAo3CustomModal(`
            <div class="ao3-modal-title">转发至聊天</div>
            <div class="ao3-contact-picker-scroll">
                ${charListHtml}
            </div>
            <div class="ao3-modal-actions" style="margin-top:14px;">
                <button class="ao3-btn ao3-btn-outline" style="width:100%;justify-content:center;" onclick="window.closeAo3CustomModal()">取消</button>
            </div>
        `);
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
            time: new Date().toLocaleTimeString().slice(0, 5)
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

        closeAo3CustomModal();
        if (typeof showToast === 'function') {
            showToast(`已将《${work.title}》分享给 ${contactName}`, 'success', 2000);
        }
    };

    // ============================================================
    // 5. 开坑弹窗（自建白灰纯净卡片，彻底消灭旧粉框）
    // ============================================================
    window._ao3SelectedPov = 'third';

    window.openCreateAo3WorkModal = function () {
        ensureAo3DataIntegrity();
        window._ao3SelectedPov = 'third';
        const curUser = G.ao3User.username;
        const playerInfo = getPlayerIdentity();
        const isMain = curUser.trim() === playerInfo.name.trim();

        const liveCharacters = getLiveChatCharacters();

        openAo3CustomModal(`
            <div class="ao3-modal-title">开坑新书</div>
            <div class="ao3-modal-subhint">
                署名：<span class="ao3-author-highlight">${escapeHtml(curUser)}</span> ${isMain ? '（主播实名）' : '（小号）'}
            </div>

            <div class="ao3-form-group">
                <label class="ao3-form-label">作品标题</label>
                <input type="text" id="ao3NewTitle" class="ao3-form-input" placeholder="输入同人文书名...">
            </div>

            <div class="ao3-form-group">
                <label class="ao3-form-label">叙事人称</label>
                <div class="ao3-pov-selector" onclick="window.openAo3PovSelectSheet()">
                    <div class="ao3-pov-current-val" id="ao3PovDisplayVal">第三人称【她 / 主角名】</div>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#888" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
                </div>
            </div>

            <div class="ao3-form-group">
                <label class="ao3-form-label">登场角色 (来自通讯录好友)</label>
                <div id="ao3CharPickChips" class="ao3-chips-container">
                    ${liveCharacters.length === 0 ? '<div class="ao3-chips-empty">通讯录暂无自建角色，请先在聊天中添加</div>' : liveCharacters.map(c => `
                        <button type="button" class="ao3-chip-item" data-cname="${escapeHtml(c.name)}" onclick="this.classList.toggle('selected'); window.updateAo3PairingPreview();">
                            <span>＋</span><span>${escapeHtml(c.name)}</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="ao3-form-group">
                <label class="ao3-form-label">配对关系</label>
                <input type="text" id="ao3NewPairing" class="ao3-form-input" value="全员向 / 独宠女主" placeholder="如：角色A × 主角名">
            </div>

            <div class="ao3-form-group">
                <label class="ao3-form-label">故事概要与灵感线索</label>
                <textarea id="ao3NewSummary" class="ao3-form-textarea" rows="3" placeholder="写写开篇契机、日常琐碎或互动情愫（AI 将执行去味指令，生成细腻正文）..."></textarea>
            </div>

            <div class="ao3-modal-actions">
                <button class="ao3-btn ao3-btn-sub" style="flex:1;justify-content:center;padding:9px;" onclick="window.closeAo3CustomModal()">取消</button>
                <button class="ao3-btn ao3-btn-red" style="flex:1.4;justify-content:center;padding:9px;" id="btnConfirmGenAo3" onclick="window.executeCreateAo3Book()">生成第 1 章</button>
            </div>
        `);
    };

    /**
     * POV 叙事人称卡片选择浮层
     */
    window.openAo3PovSelectSheet = function () {
        const povOptions = [
            { key: 'third', title: '第三人称【她 / 主角名】', desc: '经典文库视角，克制细腻，留白丰富' },
            { key: 'second', title: '第二人称【你】', desc: '沉浸交互视角，直击情感共鸣' },
            { key: 'first', title: '第一人称【我】', desc: '女主第一视点，充满生活化心境自白' }
        ];

        let sheetEl = document.getElementById('ao3PovSheetOverlay');
        if (!sheetEl) {
            sheetEl = document.createElement('div');
            sheetEl.id = 'ao3PovSheetOverlay';
            sheetEl.className = 'ao3-sheet-overlay';
            document.body.appendChild(sheetEl);
        }

        const currentKey = window._ao3SelectedPov || 'third';

        sheetEl.innerHTML = `
            <div class="ao3-sheet-box">
                <div class="ao3-sheet-header">
                    <span class="ao3-sheet-title">选择叙事人称</span>
                    <button class="ao3-sheet-close" onclick="document.getElementById('ao3PovSheetOverlay').classList.remove('active')">完成</button>
                </div>
                <div class="ao3-sheet-list">
                    ${povOptions.map(opt => `
                        <div class="ao3-sheet-option ${opt.key === currentKey ? 'selected' : ''}" onclick="window.selectAo3PovOption('${opt.key}', '${opt.title}')">
                            <div class="ao3-sheet-opt-body">
                                <div class="ao3-sheet-opt-title">${opt.title}</div>
                                <div class="ao3-sheet-opt-desc">${opt.desc}</div>
                            </div>
                            <div class="ao3-sheet-radio-ring">
                                <div class="ao3-sheet-radio-dot"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        requestAnimationFrame(() => sheetEl.classList.add('active'));
    };

    window.selectAo3PovOption = function (key, title) {
        window._ao3SelectedPov = key;
        const disp = document.getElementById('ao3PovDisplayVal');
        if (disp) disp.textContent = title;
        const sheetEl = document.getElementById('ao3PovSheetOverlay');
        if (sheetEl) sheetEl.classList.remove('active');
    };

    window.updateAo3PairingPreview = function () {
        const selected = Array.from(document.querySelectorAll('#ao3CharPickChips .ao3-chip-item.selected')).map(el => el.getAttribute('data-cname'));
        const pairingInput = document.getElementById('ao3NewPairing');
        const pName = getPlayerIdentity().name;
        if (pairingInput) {
            if (selected.length === 0) {
                pairingInput.value = '全员向 / 独宠女主';
            } else {
                pairingInput.value = `${selected.join(' & ')} × ${pName}`;
            }
        }
    };

    // ============================================================
    // 6. 执行生成第 1 章 (微胶囊状态条)
    // ============================================================
    window.executeCreateAo3Book = async function () {
        const title = (document.getElementById('ao3NewTitle')?.value || '').trim();
        const summary = (document.getElementById('ao3NewSummary')?.value || '').trim();
        const pov = window._ao3SelectedPov || 'third';
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

        closeAo3CustomModal();
        showAo3GeneratingPill('正在构思小说第 1 章...');

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

                hideAo3GeneratingPill();
                if (typeof showToast === 'function') showToast(`《${title}》已收录至文库`, 'success', 2000);
                G.ao3State.view = 'read';
                G.ao3State.activeWorkId = newWork._id;
                window.renderAo3App();
            }
        } catch (e) {
            hideAo3GeneratingPill();
            if (typeof showToast === 'function') showToast('生成小说失败：' + e.message, 'error');
        }
    };

    // ============================================================
    // 7. 催粉开坑、续写与书评 AI
    // ============================================================
    window.triggerFanAo3Creation = async function () {
        const liveChars = getLiveChatCharacters();
        if (liveChars.length === 0) {
            if (typeof showToast === 'function') showToast('通讯录中暂无好友，无法催更粉丝生成小说', 'info');
            return;
        }

        const playerInfo = getPlayerIdentity();
        const randomChar = liveChars[Math.floor(Math.random() * liveChars.length)];

        showAo3GeneratingPill(`读者正在创作 ${randomChar.name} 与 ${playerInfo.name} 的故事...`);

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

                hideAo3GeneratingPill();
                if (typeof showToast === 'function') showToast(`读者上传了新作《${title}》`, 'success', 2000);

                G.ao3State.view = 'read';
                G.ao3State.activeWorkId = newWork._id;
                window.renderAo3App();
            }
        } catch (e) {
            hideAo3GeneratingPill();
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

        showAo3GeneratingPill(`正在续写第 ${nextNum} 章...`);

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
                hideAo3GeneratingPill();
                if (typeof showToast === 'function') showToast(`第 ${nextNum} 章已发布更新`, 'success', 2000);
                window.renderAo3App();
            }
        } catch (e) {
            hideAo3GeneratingPill();
            if (typeof showToast === 'function') showToast('续写失败：' + e.message, 'error');
        }
    };

    window.generateAo3CommentsAI = async function (workId) {
        const work = (G.fanworks || []).find(w => w._id === workId);
        if (!work) return;

        const playerInfo = getPlayerIdentity();
        const isAuthorMe = work.author.trim() === playerInfo.name.trim();

        showAo3GeneratingPill('读者正在撰写书评...');

        const sysPrompt = `
你正在模拟 AO3 小说《${work.title}》（CP: ${work.pairing}，作者：${work.author}）下方的真实读者评论。
【背景重点】：
${isAuthorMe ? `小说作者正是主播「${playerInfo.name}」本人！读者评论应该充满震撼与正主产粮的惊喜！` : '读者们沉浸在故事的微酸与甜度中，讨论细节与催更。'}

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
                            author: author || '同好读者',
                            text,
                            time: '刚刚'
                        });
                        added++;
                    }
                }

                if (added === 0 && raw.trim()) {
                    work.reviews.unshift({
                        id: 'rev_' + Date.now(),
                        author: '同好读者',
                        text: cleanRawAIOutput(raw).slice(0, 100),
                        time: '刚刚'
                    });
                }

                if (typeof autoSaveGame === 'function') autoSaveGame();
                hideAo3GeneratingPill();
                if (typeof showToast === 'function') showToast('读者书评已更新', 'success', 1500);
                window.renderAo3App();
            }
        } catch (e) {
            hideAo3GeneratingPill();
            if (typeof showToast === 'function') showToast('书评生成失败：' + e.message, 'error');
        }
    };

    window.openWriteAo3CommentModal = function (workId) {
        const curUser = G.ao3User.username;
        openAo3CustomModal(`
            <div class="ao3-modal-title">发表书评</div>
            <div class="ao3-modal-subhint">署名：<span class="ao3-author-highlight">${escapeHtml(curUser)}</span></div>
            <div class="ao3-form-group">
                <textarea id="myAo3CommentInput" class="ao3-form-textarea" rows="3" placeholder="写下你对本章节的感悟或随笔..."></textarea>
            </div>
            <div class="ao3-modal-actions">
                <button class="ao3-btn ao3-btn-sub" style="flex:1;justify-content:center;" onclick="window.closeAo3CustomModal()">取消</button>
                <button class="ao3-btn ao3-btn-red" style="flex:1;justify-content:center;" onclick="window.confirmPostAo3Comment('${workId}')">发表评论</button>
            </div>
        `);
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
            closeAo3CustomModal();
            if (typeof showToast === 'function') showToast('评论发表成功', 'success');
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
            if (typeof showToast === 'function') showToast('已投递 Kudos', 'success', 1000);
            if (typeof autoSaveGame === 'function') autoSaveGame();
            window.renderAo3App();
        }
    };

    window.openAo3WorkOptionsModal = function (workId) {
        const work = (G.fanworks || []).find(w => w._id === workId);
        if (!work) return;

        openAo3CustomModal(`
            <div class="ao3-modal-title">作品管理</div>
            <div style="font-size:13px;color:#555;margin:8px 0 16px;">《${escapeHtml(work.title)}》</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <button class="ao3-btn ao3-btn-outline" style="width:100%;color:#c62828;border-color:#ffcdd2;justify-content:center;padding:9px;" onclick="window.confirmDeleteAo3Work('${workId}')">从文库中删除此书</button>
                <button class="ao3-btn ao3-btn-sub" style="width:100%;justify-content:center;padding:9px;" onclick="window.closeAo3CustomModal()">取消</button>
            </div>
        `);
    };

    window.confirmDeleteAo3Work = function (workId) {
        if (confirm('确定要删除这部作品吗？操作无法撤回。')) {
            const idx = (G.fanworks || []).findIndex(w => w._id === workId);
            if (idx !== -1) G.fanworks.splice(idx, 1);
            if (G.ao3State.activeWorkId === workId) {
                G.ao3State.view = 'home';
                G.ao3State.activeWorkId = null;
            }
            closeAo3CustomModal();
            if (typeof showToast === 'function') showToast('作品已删除', 'success');
            if (typeof autoSaveGame === 'function') autoSaveGame();
            window.renderAo3App();
        }
    };

    window.openAo3IdentitySettings = function () {
        const curUser = G.ao3User.username;
        const playerInfo = getPlayerIdentity();
        const isMain = curUser.trim() === playerInfo.name.trim();

        openAo3CustomModal(`
            <div class="ao3-modal-title">身份与笔名切换</div>
            <div class="ao3-form-group" style="margin-top:12px;">
                <label class="ao3-form-label">发文与评论笔名</label>
                <input type="text" id="ao3InputPenName" class="ao3-form-input" value="${escapeHtml(curUser)}">
            </div>
            <div style="font-size:12px;color:#666;line-height:1.6;margin:10px 0;">
                ${isMain 
                    ? '<b>主播实名模式</b>：读者和同人文世界知晓作者是主播本人。' 
                    : '<b>披皮小号模式</b>：以普通同好作者身份发文，不掉马。'}
            </div>
            <div class="ao3-modal-actions">
                <button class="ao3-btn ao3-btn-sub" style="flex:1;justify-content:center;" onclick="document.getElementById('ao3InputPenName').value = '${escapeHtml(playerInfo.name)}';">还原主播名</button>
                <button class="ao3-btn ao3-btn-red" style="flex:1;justify-content:center;" onclick="window.saveAo3Identity()">保存设置</button>
            </div>
        `);
    };

    window.saveAo3Identity = function () {
        const val = (document.getElementById('ao3InputPenName')?.value || '').trim();
        if (!val) return;
        G.ao3User.username = val;
        closeAo3CustomModal();
        if (typeof showToast === 'function') showToast(`笔名已更新为「${val}」`, 'success');
        if (typeof autoSaveGame === 'function') autoSaveGame();
        window.renderAo3App();
    };

    // ============================================================
    // 8. 样式注入（强制隐藏原生粉框，沉浸铺满）
    // ============================================================
    function injectAo3Styles() {
        if (document.getElementById('ao3UnifiedStyles')) return;
        const style = document.createElement('style');
        style.id = 'ao3UnifiedStyles';
        style.textContent = `
            /* 1. 核心关键：当 AO3 激活时，彻底强力隐藏宿主那个丑陋的粉红原生标题栏与粉红分割线！ */
            body.ao3-active-fullscreen #appModalHeader,
            body.ao3-active-fullscreen .app-modal-header,
            body.ao3-active-fullscreen .phone-app-header {
                display: none !important;
                height: 0 !important;
                padding: 0 !important;
                border: none !important;
            }
            body.ao3-active-fullscreen #appModalBody,
            body.ao3-active-fullscreen .app-modal-body {
                height: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: hidden !important;
            }

            /* 2. 我们的视口容器：铺满整个屏幕，顶部适配安全区不挡电量时间 */
            .ao3-app-viewport {
                display: flex; flex-direction: column; width: 100%; height: 100%;
                background: #fbf9f4; color: #222222; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
                overflow: hidden; box-sizing: border-box;
                padding-top: max(10px, env(safe-area-inset-top, 10px));
            }

            /* 3. 自建统一定制顶栏：替代原生粉框，高级白灰微质感 */
            .ao3-top-unified-bar {
                display: flex; align-items: center; justify-content: space-between;
                padding: 10px 16px; background: #ffffff; border-bottom: 1px solid #ebe5d8;
                flex-shrink: 0; min-height: 44px; box-sizing: border-box;
            }
            .ao3-top-unified-title {
                font-size: 15px; font-weight: 700; color: #222; letter-spacing: -0.2px;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;
            }
            .ao3-back-nav-btn {
                background: none; border: none; padding: 0; color: #333333; font-size: 13.5px;
                font-weight: 600; display: inline-flex; align-items: center; gap: 3px; cursor: pointer;
            }
            .ao3-back-nav-btn:active { opacity: 0.7; }

            /* 站点门户导航 */
            .ao3-portal-scroll-area {
                flex: 1; overflow-y: auto; padding: 20px 16px; box-sizing: border-box;
            }
            .ao3-portal-hero { margin-bottom: 20px; }
            .ao3-portal-hero-title { font-size: 20px; font-weight: 800; color: #1a1a1a; letter-spacing: -0.2px; }
            .ao3-portal-hero-desc { font-size: 12.5px; color: #777; margin-top: 4px; }

            .ao3-portal-grid { display: flex; flex-direction: column; gap: 14px; }
            .ao3-portal-card {
                background: #ffffff; border: 1px solid #e8e3d8; border-radius: 12px;
                padding: 16px; cursor: pointer; transition: transform 0.12s ease, box-shadow 0.12s ease;
                box-shadow: 0 1px 4px rgba(0,0,0,0.03);
            }
            .ao3-portal-card.active:active { transform: scale(0.99); }
            .ao3-portal-card.disabled { opacity: 0.55; cursor: default; background: #fafafa; }
            .ao3-portal-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
            .ao3-portal-badge {
                font-size: 10.5px; background: #fff2f2; color: #990000; border: 1px solid #ffcccc;
                border-radius: 4px; padding: 1px 7px; font-weight: 600;
            }
            .ao3-portal-badge-muted {
                font-size: 10.5px; background: #f0f0f0; color: #888; border-radius: 4px; padding: 1px 7px;
            }
            .ao3-portal-count { font-size: 11.5px; color: #888; }
            .ao3-portal-logo-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
            .ao3-portal-site-name { font-size: 15.5px; font-weight: 700; color: #111; }
            .ao3-portal-site-sub { font-size: 11.5px; color: #777; }
            .ao3-portal-card-desc { font-size: 12px; line-height: 1.55; color: #555; margin-bottom: 12px; }
            .ao3-portal-enter-bar {
                display: flex; align-items: center; justify-content: flex-end; gap: 4px;
                font-size: 12px; font-weight: 600; color: #990000; border-top: 1px solid #f6f3ed; padding-top: 10px;
            }

            /* AO3 品牌标 */
            .ao3-logo-monogram {
                font-family: Georgia, serif; font-size: 20px; font-weight: 800;
                background: #990000; color: #ffffff; border-radius: 5px; padding: 2px 7px;
                letter-spacing: -0.5px;
            }
            .ao3-logo-monogram-muted {
                font-family: Georgia, serif; font-size: 18px; font-weight: 800;
                background: #e0e0e0; color: #888; border-radius: 4px; padding: 2px 6px;
            }

            .ao3-user-badge {
                display: inline-flex; align-items: center; gap: 4px; background: #f6f2ea;
                border: 1px solid #e5ded2; border-radius: 12px; padding: 3px 9px;
                font-size: 11px; color: #555; cursor: pointer;
            }

            .ao3-sub-toolbar {
                display: flex; align-items: center; justify-content: space-between;
                padding: 9px 16px; background: #f5efe4; border-bottom: 1px solid #e6ded0; flex-shrink: 0;
            }
            .ao3-filter-label { font-size: 12px; color: #555; }

            /* 按钮无位移规范 */
            .ao3-btn {
                border: none; outline: none; border-radius: 6px; padding: 6px 12px;
                font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.15s ease;
                display: inline-flex; align-items: center; gap: 4px; text-shadow: none !important;
            }
            .ao3-btn:active { opacity: 0.8; }
            .ao3-btn-red { background: #990000; color: #ffffff; }
            .ao3-btn-outline { background: #ffffff; color: #990000; border: 1px solid #990000; }
            .ao3-btn-sub { padding: 4px 10px; font-size: 11.5px; border-radius: 5px; background: #ffffff; border: 1px solid #d4c8b6; color: #333; }
            .ao3-btn-sub.ao3-btn-red { background: #990000; color: #fff; border-color: #990000; }

            /* 作品列表与卡片 */
            .ao3-works-scroll-list {
                flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 12px;
            }
            .ao3-work-card {
                background: #ffffff; border: 1px solid #e8e1d5; border-left: 4px solid #990000;
                border-radius: 8px; padding: 13px 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                cursor: pointer; transition: transform 0.1s ease;
            }
            .ao3-work-card:active { transform: scale(0.995); }
            .ao3-work-title-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
            .ao3-work-title { font-size: 15.5px; font-weight: 700; color: #990000; }
            .ao3-badge-author { font-size: 10px; background: #fff0f0; color: #990000; border: 1px solid #ffcccc; border-radius: 3px; padding: 1px 5px; }
            .ao3-work-byline { font-size: 11.5px; color: #666; margin: 4px 0 6px; }
            .ao3-author-link { color: #222; font-weight: 600; }

            .ao3-tags-wrap { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 8px; }
            .ao3-tag-pill {
                font-size: 10.5px; background: #f2eee6; color: #625340; border-radius: 3px; padding: 1px 6px;
            }
            .ao3-work-summary-box {
                font-size: 12px; line-height: 1.55; color: #444; background: #faf7f0;
                border-left: 2px solid #ddd3c3; padding: 7px 10px; margin-bottom: 8px; border-radius: 0 4px 4px 0;
            }
            .ao3-work-footer-meta {
                display: flex; align-items: center; gap: 12px; font-size: 11px; color: #888;
                border-top: 1px dashed #eee; padding-top: 6px;
            }
            .ao3-manage-btn {
                margin-left: auto; background: none; border: 1px solid #ddd; border-radius: 4px;
                padding: 2px 7px; font-size: 10.5px; color: #666; cursor: pointer;
            }

            /* 空状态 */
            .ao3-empty-slate {
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                padding: 48px 16px; text-align: center;
            }
            .ao3-empty-title { font-weight: 700; font-size: 14.5px; color: #333; margin-top: 12px; }
            .ao3-empty-sub { font-size: 12px; color: #777; margin-top: 4px; }
            .ao3-empty-actions { display: flex; gap: 10px; margin-top: 18px; }

            /* 阅读视图 */
            .ao3-reading-container {
                flex: 1; overflow-y: auto; padding: 18px 16px; background: #fdfbf7;
            }
            .ao3-work-header-meta-block {
                border-bottom: 2px solid #990000; padding-bottom: 12px; margin-bottom: 14px;
            }
            .ao3-meta-tag-pre { font-size: 10px; font-weight: 700; color: #990000; letter-spacing: 0.8px; }
            .ao3-read-h1 { font-size: 19px; font-weight: 800; color: #111; margin: 6px 0; }
            .ao3-read-byline { font-size: 12px; color: #555; }

            .ao3-chapter-switch-bar {
                display: flex; align-items: center; justify-content: space-between;
                background: #f3ece0; border: 1px solid #e1d7c4; border-radius: 6px;
                padding: 6px 10px; margin: 14px 0 18px;
            }
            .ao3-step-btn {
                background: #fff; border: 1px solid #ccc; border-radius: 4px;
                padding: 4px 10px; font-size: 11.5px; cursor: pointer; color: #990000; font-weight: 600;
            }
            .ao3-step-btn:disabled { opacity: 0.4; cursor: not-allowed; }
            .ao3-chapter-indicator { font-size: 12px; font-weight: 600; color: #444; }

            .ao3-chapter-title { font-size: 15.5px; font-weight: 700; color: #990000; margin-bottom: 12px; border-bottom: 1px dashed #dcd4c6; padding-bottom: 4px; }
            .ao3-prose-body {
                font-size: 14.5px; line-height: 2.0; color: #1e1e1e; white-space: pre-wrap;
                word-break: break-word; letter-spacing: 0.2px; font-family: -apple-system, Georgia, serif;
            }

            .ao3-interaction-bar {
                display: flex; gap: 10px; justify-content: center; margin: 24px 0;
            }
            .ao3-reviews-section {
                border-top: 1px solid #e0d8c8; padding-top: 16px;
            }
            .ao3-reviews-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
            .ao3-reviews-title { font-size: 13.5px; font-weight: 700; color: #990000; }
            .ao3-reviews-subhint { font-size: 11px; color: #888; margin-bottom: 12px; }
            .ao3-reviews-feed { display: flex; flex-direction: column; gap: 10px; }
            .ao3-review-item {
                background: #fff; border: 1px solid #e6ded0; border-radius: 6px; padding: 10px;
            }
            .ao3-review-user-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .ao3-review-user { font-size: 12px; font-weight: 700; color: #990000; }
            .ao3-review-time { font-size: 10px; color: #aaa; }
            .ao3-review-content { font-size: 12px; line-height: 1.5; color: #333; }

            /* 自建纯净卡片模态窗 */
            .ao3-custom-modal-backdrop {
                position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999999;
                display: flex; align-items: center; justify-content: center; padding: 20px;
                opacity: 0; pointer-events: none; transition: opacity 0.2s ease; box-sizing: border-box;
            }
            .ao3-custom-modal-backdrop.visible { opacity: 1; pointer-events: auto; }
            .ao3-custom-modal-window {
                width: 100%; max-width: 420px; background: #ffffff; border-radius: 14px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.18); padding: 20px; box-sizing: border-box;
                transform: scale(0.96); transition: transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
            }
            .ao3-custom-modal-backdrop.visible .ao3-custom-modal-window { transform: scale(1); }

            .ao3-modal-title { font-size: 16px; font-weight: 700; color: #1a1a1a; margin-bottom: 2px; }
            .ao3-modal-subhint { font-size: 11.5px; color: #777; margin-bottom: 14px; }
            .ao3-author-highlight { color: #990000; font-weight: 700; }

            .ao3-form-group { margin-bottom: 12px; }
            .ao3-form-label { display: block; font-size: 12px; font-weight: 600; color: #444; margin-bottom: 5px; }
            .ao3-form-input, .ao3-form-textarea {
                width: 100%; box-sizing: border-box; padding: 9px 11px; border-radius: 6px;
                border: 1px solid #dcdcdc; background: #fff; font-size: 12.5px; color: #222; outline: none;
                transition: border-color 0.15s;
            }
            .ao3-form-input:focus, .ao3-form-textarea:focus { border-color: #990000; }
            .ao3-pov-selector {
                display: flex; align-items: center; justify-content: space-between;
                padding: 9px 12px; border: 1px solid #dcdcdc; border-radius: 6px;
                background: #fff; cursor: pointer;
            }
            .ao3-pov-current-val { font-size: 12.5px; color: #333; font-weight: 500; }

            .ao3-chips-container {
                display: flex; flex-wrap: wrap; gap: 6px; max-height: 90px; overflow-y: auto;
                padding: 6px; border: 1px solid #e5e5e5; border-radius: 6px; background: #fafafa;
            }
            .ao3-chips-empty { font-size: 11px; color: #999; padding: 4px; }
            .ao3-chip-item {
                border: 1px solid #ddd; background: #fff; border-radius: 12px; padding: 3px 8px;
                font-size: 11px; cursor: pointer; color: #444; display: inline-flex; align-items: center; gap: 3px;
                transition: all 0.15s;
            }
            .ao3-chip-item.selected {
                background: #fcf1f2; border-color: #990000; color: #990000; font-weight: 600;
            }
            .ao3-modal-actions { display: flex; gap: 10px; margin-top: 16px; }

            /* 转发选择器 */
            .ao3-contact-picker-scroll {
                max-height: 280px; overflow-y: auto; border: 1px solid #f0f0f0;
                border-radius: 8px; padding: 4px; margin-top: 8px; background: #fafafa;
            }
            .ao3-contact-pick-row {
                display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px;
                cursor: pointer; transition: background 0.15s; background: #ffffff; margin-bottom: 4px;
                border: 1px solid #f0f0f0;
            }
            .ao3-contact-pick-row:active { background: #f5f5f5; }
            .ao3-contact-avatar {
                width: 38px; height: 38px; border-radius: 50%; overflow: hidden; background: #eee; flex-shrink: 0;
            }
            .ao3-contact-avatar img { width: 100%; height: 100%; object-fit: cover; }
            .ao3-avatar-fallback {
                width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
                background: #990000; color: #fff; font-weight: 700; font-size: 14px;
            }
            .ao3-contact-info { flex: 1; min-width: 0; }
            .ao3-contact-name { font-size: 13.5px; font-weight: 600; color: #222; }
            .ao3-contact-persona { font-size: 11px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
            .ao3-contact-send-btn {
                background: #990000; color: #ffffff; border: none; border-radius: 4px;
                padding: 4px 12px; font-size: 11.5px; font-weight: 600; pointer-events: none;
            }

            /* POV 单选浮层 */
            .ao3-sheet-overlay {
                position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000000;
                display: flex; align-items: flex-end; justify-content: center;
                opacity: 0; pointer-events: none; transition: opacity 0.2s ease;
            }
            .ao3-sheet-overlay.active { opacity: 1; pointer-events: auto; }
            .ao3-sheet-box {
                width: 100%; max-width: 480px; background: #ffffff; border-radius: 14px 14px 0 0;
                padding: 16px; box-sizing: border-box; transform: translateY(100%); transition: transform 0.25s cubic-bezier(0.1, 0.9, 0.2, 1);
            }
            .ao3-sheet-overlay.active .ao3-sheet-box { transform: translateY(0); }
            .ao3-sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
            .ao3-sheet-title { font-size: 14px; font-weight: 700; color: #222; }
            .ao3-sheet-close { background: none; border: none; font-size: 13px; font-weight: 600; color: #990000; cursor: pointer; }
            .ao3-sheet-list { display: flex; flex-direction: column; gap: 8px; }
            .ao3-sheet-option {
                display: flex; align-items: center; justify-content: space-between;
                padding: 12px 14px; border: 1px solid #ebebeb; border-radius: 8px;
                background: #fafafa; cursor: pointer; transition: all 0.15s;
            }
            .ao3-sheet-option.selected {
                background: #fdf5f5; border-color: #990000;
            }
            .ao3-sheet-opt-title { font-size: 13px; font-weight: 600; color: #222; }
            .ao3-sheet-opt-desc { font-size: 11px; color: #777; margin-top: 2px; }
            .ao3-sheet-radio-ring {
                width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid #ccc;
                display: flex; align-items: center; justify-content: center; flex-shrink: 0;
            }
            .ao3-sheet-option.selected .ao3-sheet-radio-ring { border-color: #990000; }
            .ao3-sheet-radio-dot {
                width: 8px; height: 8px; border-radius: 50%; background: #990000; display: none;
            }
            .ao3-sheet-option.selected .ao3-sheet-radio-dot { display: block; }

            /* 悬浮微胶囊指示器 */
            .ao3-generating-pill {
                position: fixed; top: 16px; left: 50%; transform: translateX(-50%) translateY(-35px);
                background: #ffffff; border: 1px solid #e0d8cc; color: #222222;
                border-radius: 20px; padding: 6px 14px; font-size: 12px; font-weight: 500;
                display: flex; align-items: center; gap: 8px; z-index: 1000001;
                box-shadow: 0 4px 16px rgba(0,0,0,0.1); opacity: 0; pointer-events: none;
                transition: all 0.25s cubic-bezier(0.1, 0.9, 0.2, 1);
            }
            .ao3-generating-pill.visible { transform: translateX(-50%) translateY(0); opacity: 1; }
            .ao3-pill-dot {
                width: 7px; height: 7px; border-radius: 50%; background: #07c160;
                animation: ao3Pulse 1.2s ease-in-out infinite alternate;
            }
            @keyframes ao3Pulse { from { opacity: 0.4; transform: scale(0.9); } to { opacity: 1; transform: scale(1.15); } }
        `;
        document.head.appendChild(style);
    }

    injectAo3Styles();
})();
