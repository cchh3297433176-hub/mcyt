// 视频制作
// ============================================================
function openVideoModal() {
    const availableAP = G.actionPoints;
    const collectionNames = Object.keys(G.collections);
    const hasCollections = collectionNames.length > 0;
    const styles = [
        { id: 'teach', label: '📘 硬核教学' },
        { id: 'entertain', label: '🎉 娱乐整活' },
        { id: 'epic', label: '🔥 高燃剪辑' },
        { id: 'survival', label: '🌿 生存实况' },
        { id: 'movie', label: '🎬 微电影/剧情' },
        { id: 'animation', label: '🎨 MC 动画' }
    ];
    let styleBtns = styles.map(s =>
        `<button class="style-btn ${s.id === 'epic' ? 'selected' : ''}" data-style="${s.id}">${s.label}</button>`
    ).join('');
    const html = `
    <h3>🎬 制作视频</h3>
    <p>选择视频风格、时长、合集，并输入内容描述</p>
    <div class="form-group">
        <label>📝 视频标题</label>
        <input type="text" id="videoTitle" placeholder="输入标题..." value="MC 精彩集锦">
    </div>
    <div class="form-group">
        <label>📝 视频内容描述（AI将根据此描述生成剧情）</label>
        <textarea id="videoDesc" class="desc-input" rows="3" placeholder="描述你视频的内容，例如：我在末地击败了末影龙，并建造了一个纪念塔。"></textarea>
    </div>
    ${G.search.apiKey ? `
    <div class="form-group" style="display:flex;align-items:center;gap:8px;margin-top:-6px;">
        <label style="font-size:13px;margin-bottom:0;display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" id="videoUseSearch" ${G.search.enabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);">
            🌐 本次联网搜索相关资料（消耗一次搜索额度）
        </label>
    </div>` : ''}
    <div class="form-group">
        <label>📚 合集选项</label>
        <div class="radio-group-inline">
            <label><input type="radio" name="collectionOption" value="none" checked> 单视频</label>
            <label><input type="radio" name="collectionOption" value="new"> 新建合集</label>
            ${hasCollections ? `<label><input type="radio" name="collectionOption" value="existing"> 加入已有合集</label>` : ''}
        </div>
    </div>
    <div id="collectionNameGroup" style="margin-top:6px;display:none;">
        <input type="text" id="collectionNameInput" placeholder="输入合集名称..." style="width:100%;padding:8px 12px;border-radius:8px;border:2px solid rgba(30, 60, 30, 0.10);background:#f5faf5;color:var(--text);font-size:14px;outline:none;">
    </div>
    <div id="collectionSelectGroup" style="margin-top:6px;display:none;">
        <select id="collectionSelect" style="width:100%;padding:8px 12px;border-radius:8px;border:2px solid rgba(30, 60, 30, 0.10);background:#f5faf5;color:var(--text);font-size:14px;outline:none;">
            ${collectionNames.map(name => `<option value="${name}">${name}</option>`).join('')}
        </select>
    </div>
    <div class="form-group">
        <label>🎨 风格选择</label>
        <div class="style-selector" id="styleSelector">${styleBtns}</div>
    </div>
    <div class="form-group">
        <label>⏱️ 视频时长</label>
        <div class="radio-group-inline">
            <label><input type="radio" name="duration" value="short"> 短视频 (消耗1行动点，收益低)</label>
            <label><input type="radio" name="duration" value="long" checked> 长视频 (消耗2行动点，收益高)</label>
        </div>
    </div>
    <div style="margin:8px 0;font-size:13px;color:var(--text2);">
        当前行动点：<strong>${availableAP}</strong>
    </div>
    <div class="btn-row">
        <button class="btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn-primary" id="confirmVideo">发布视频</button>
    </div>
    `;
    openModal(html);
    document.querySelectorAll('#styleSelector .style-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#styleSelector .style-btn').forEach(b => b.classList.remove(
                'selected'));
            this.classList.add('selected');
        });
    });
    const radioNone = document.querySelector('input[name="collectionOption"][value="none"]');
    const radioNew = document.querySelector('input[name="collectionOption"][value="new"]');
    const radioExisting = document.querySelector('input[name="collectionOption"][value="existing"]');
    const nameGroup = document.getElementById('collectionNameGroup');
    const selectGroup = document.getElementById('collectionSelectGroup');

    function updateCollectionUI() {
        const val = document.querySelector('input[name="collectionOption"]:checked').value;
        nameGroup.style.display = (val === 'new') ? 'block' : 'none';
        selectGroup.style.display = (val === 'existing') ? 'block' : 'none';
        if (val === 'existing') {
            const sel = document.getElementById('collectionSelect');
            if (sel) {
                const titleInput = document.getElementById('videoTitle');
                if (titleInput && !titleInput.dataset.userEdited) {
                    const colName = sel.value;
                    const col = G.collections[colName];
                    if (col) {
                        const nextIdx = (col.videos.length || 0) + 1;
                        titleInput.value = `${colName} 第${nextIdx}集`;
                    }
                }
            }
        }
    }
    radioNone.addEventListener('change', updateCollectionUI);
    radioNew.addEventListener('change', updateCollectionUI);
    if (radioExisting) radioExisting.addEventListener('change', updateCollectionUI);
    document.getElementById('videoTitle')?.addEventListener('input', function() { this.dataset.userEdited =
        'true'; });
    const sel = document.getElementById('collectionSelect');
    if (sel) {
        sel.addEventListener('change', function() {
            if (document.querySelector('input[name="collectionOption"]:checked').value === 'existing') {
                const titleInput = document.getElementById('videoTitle');
                if (titleInput && !titleInput.dataset.userEdited) {
                    const colName = this.value;
                    const col = G.collections[colName];
                    if (col) {
                        const nextIdx = (col.videos.length || 0) + 1;
                        titleInput.value = `${colName} 第${nextIdx}集`;
                    }
                }
            }
        });
    }
    document.getElementById('confirmVideo').addEventListener('click', function() {
        const title = document.getElementById('videoTitle').value.trim() || 'MC 精彩集锦';
        const desc = document.getElementById('videoDesc').value.trim() || '';
        const styleBtn = document.querySelector('#styleSelector .style-btn.selected');
        const style = styleBtn ? styleBtn.dataset.style : 'epic';
        const durationRadio = document.querySelector('input[name="duration"]:checked');
        const duration = durationRadio ? durationRadio.value : 'long';
        const collectionOption = document.querySelector('input[name="collectionOption"]:checked').value;
        let collectionName = null,
            collectionIndex = 0;
        if (collectionOption === 'new') {
            const input = document.getElementById('collectionNameInput');
            if (input) {
                collectionName = input.value.trim() || null;
                if (collectionName) {
                    if (G.collections[collectionName]) { showToast('合集已存在，请选择已有合集或更换名称',
                            'error'); return; }
                    collectionIndex = 1;
                }
            }
        } else if (collectionOption === 'existing') {
            const select = document.getElementById('collectionSelect');
            if (select) {
                collectionName = select.value;
                if (collectionName && G.collections[collectionName]) {
                    const col = G.collections[collectionName];
                    collectionIndex = (col.videos.length || 0) + 1;
                }
            }
        }
        let cost = (duration === 'short') ? 1 : 2;
        if (G.actionPoints < cost) { showToast(`⚠️ 行动点不足，需要 ${cost} 点`, 'error'); return; }
        G.actionPoints -= cost;
        const useSearch = document.getElementById('videoUseSearch')?.checked || false;
        createVideo(title, style, duration, collectionName, collectionIndex, desc, useSearch);
        closeModal();
        advanceTimeSlot();
        if (document.querySelector('.tab-btn.active')?.dataset.tab === 'dashboard') renderDashboard();
        if (document.querySelector('.tab-btn.active')?.dataset.tab === 'data') renderDataPanel();
    });
}

function createVideo(title, style, duration, collectionName, collectionIndex, description, useSearch = false) {
    const skillMapping = {
        teach: ['building', 'redstone'],
        entertain: ['pvp', 'survival'],
        epic: ['hunting', 'pvp'],
        survival: ['survival'],
        movie: ['building', 'hunting'],
        animation: ['building', 'redstone']
    };
    const mainSkills = skillMapping[style] || ['building'];
    let extraViews = 0;
    const pSkills = G.player.skills;
    for (const sk of mainSkills) extraViews += (pSkills[sk] || 0) * 500;
    let baseViews = 0,
        baseLikes = 0,
        baseComments = 0,
        skillGain = 0,
        followersGain = 0,
        moneyGain = 0;
    const isShort = (duration === 'short');
    const multiplier = isShort ? 0.6 : 1.0;
    let styleMod = 1,
        commentPool = [];
    if (style === 'teach') {
        styleMod = 1.2;
        skillGain = rand(3, 6);
        commentPool = COMMENTS_TEACH;
        for (const sk of mainSkills) G.player.skills[sk] = Math.min(100, (G.player.skills[sk] || 0) + rand(1, 3));
    } else if (style === 'entertain') {
        styleMod = 1.1;
        commentPool = COMMENTS_ENTERTAIN;
        followersGain = rand(20, 80);
        baseComments = rand(8, 20);
    } else if (style === 'epic') {
        styleMod = 1.3;
        commentPool = COMMENTS_EPIC;
        baseLikes = rand(30, 100);
        followersGain = rand(10, 50);
    } else if (style === 'survival') {
        styleMod = 1.0;
        commentPool = COMMENTS_SURVIVAL;
        followersGain = rand(15, 60);
    } else if (style === 'movie') {
        styleMod = 1.4;
        commentPool = COMMENTS_MOVIE;
        baseLikes = rand(40, 120);
        followersGain = rand(20, 70);
    } else if (style === 'animation') {
        styleMod = 1.5;
        commentPool = COMMENTS_ANIMATION;
        baseLikes = rand(50, 150);
        followersGain = rand(25, 80);
    }
    let seriesBonus = 1;
    if (collectionName && collectionIndex > 1) seriesBonus = 2.0;
    const baseRandom = rand(2000, 8000) + G.player.followers * 0.5;
    baseViews = Math.floor(baseRandom * multiplier * styleMod * seriesBonus) + extraViews;
    baseLikes += Math.floor(baseViews * 0.05);
    baseComments += Math.floor(baseViews * 0.02);
    let comments = [];
    const numComments = Math.min(baseComments, 15) + rand(3, 8);
    const pool = [...commentPool, ...COMMENTS_UNIVERSAL];
    for (let i = 0; i < numComments; i++) {
        comments.push({ user: pick(['CreeperFan', 'RedstoneGuru', 'BuilderPro', 'Minecrafter123', 'DiamondHunter',
                'NetherWander', 'EndermanLover', 'PixelArtist', 'CraftMaster', 'BlockBuster'
            ]),
            content: pick(pool) });
    }
    const videoObj = {
        day: G.day,
        title: title,
        style: style,
        duration: duration,
        collection: collectionName,
        collectionIndex: collectionIndex,
        views: baseViews,
        likes: baseLikes,
        comments: comments,
        _prevViews: baseViews,
        skillGain: skillGain,
        followersGain: followersGain,
        moneyGain: moneyGain,
        description: description || '',
    };
    const videoIndex = G.player.videos.length;
    G.player.videos.push(videoObj);
    G.totalVideos++;
    if (collectionName) {
        if (!G.collections[collectionName]) G.collections[collectionName] = { videos: [], totalViews: 0,
            totalLikes: 0, totalComments: 0, videoCount: 0 };
        G.collections[collectionName].videos.push(videoIndex);
        updateCollectionStats(collectionName);
    }
    G.player.likes += baseLikes;
    G.player.followers += followersGain + Math.floor(baseViews * 0.001);
    G.player.money += moneyGain + Math.floor(baseViews * 0.005);
    addMemoir('发布视频', `「${title}」 播放量 ${baseViews}，风格 ${style}`);
    const seriesText = collectionName ? `（合集：${collectionName}，第${collectionIndex}集）` : '';
    const descText = description ? ` 内容描述：${description}` : '';
    const storyText =
        `你发布了视频「${title}」${seriesText}，风格${style}，${duration === 'short' ? '短' : '长'}视频。播放量 ${baseViews}，点赞 ${baseLikes}，评论 ${numComments} 条。${descText}`;
    generateStory('🎬 视频发布', storyText, useSearch).then(() => {
        showToast(`🎬 视频「${title}」发布成功！`, 'success', 2000);
    });
    updateUI();
    checkAchievements();
    addFeedItem({
        author: G.player.ytName,
        avatar: G.player.avatar || '🎬',
        body: `发布了新视频「${title}」！播放量 ${baseViews}，快来围观！`,
        type: 'public',
    });
    if (document.querySelector('.tab-btn.active')?.dataset.tab === 'feed') renderFeed();
}
// ============================================================
// 通用剧情生成
// ============================================================
function buildSystemPrompt() {
    const p = G.player;
    const activeStoryHistory = G.storyHistory.filter(h => !h.archived);
    const historySummary = activeStoryHistory.slice(-8).map(h =>
        h.truncated
            ? `[第${h.day}天 ${getTimeSlotName(h.time)}] （该条内容此前生成不完整，已忽略，请勿续写）`
            : `[第${h.day}天 ${getTimeSlotName(h.time)}] ${stripThought(h.text).slice(0, 100)}...`
    ).join('\n');
    const memorySummaryText = (G.memorySummaries || []).map(m =>
        `[记忆总结 · 截至第${m.day}天] ${stripThought(m.text)}`
    ).join('\n');
    const usedThemesList = Array.from(G.usedThemes).slice(-40).join('、');
    const npcInfo = Object.values(G.npcs).map(n =>
        `${n.name}: 好感度 ${n.favor}${n._relationship === 'dating' ? ' 💕恋人' : ''}`
    ).join('\n');
    const memoirRecent = G.memoir.slice(-15).map(m =>
        `第${m.day}天: ${m.event} ${m.details}`
    ).join('\n');
    let chatSummary = '';
    for (const [id, npc] of Object.entries(G.npcs)) {
        const hist = G.chatHistory[id] || [];
        const recent = hist.slice(-5).map(m => `${m.from === 'npc' ? npc.name : '玩家'}: ${stripThought(m.text).slice(0, 40)}...`)
            .join('\n');
        if (recent) chatSummary += `${npc.name}: \n${recent}\n`;
    }
    return `
    你是一个专业且富有创意的 MC YouTube 模拟器叙事 AI。
    玩家正在扮演一位 MC 内容创作者，根据玩家的行动生成生动、详细的剧情描述。
    注意：玩家为女性，所有称呼使用"你"或"她"，不得使用"哥们"、"兄弟"等男性化称呼。
    【玩家设定】
    - 身份：${p.identity === 'new' ? '新主播' : p.identity === 'fans' ? '已有粉丝基础的主播' : '老牌主播'}
    - 年龄：${p.age} 岁（${p.isStudent ? '学生' : '非学生'}，${p.isVacation ? '暑假期间' : '非假期'}）
    - 性别：女
    - YT账号：${p.ytName}
    - 皮上形象：${p.persona}
    - MC皮肤：${p.skin}
    - 创作赛道：${p.category}
    - 技术属性：建筑${p.skills.building}，红石${p.skills.redstone}，PvP${p.skills.pvp}，生存${p.skills.survival}，追杀${p.skills.hunting}
    【游戏状态】
    - 当前天数：第${G.day}天 | 时段：${getTimeSlotName(G.timeSlot)}
    - 粉丝：${p.followers} | 金钱：${p.money} | 点赞：${p.likes}
    - 好友：${p.friends.length > 0 ? p.friends.join('、') : '暂无'}
    - 恋人：${p.lovers.length > 0 ? p.lovers.join('、') : '暂无'}
    【NPC关系】
    ${npcInfo || '暂无NPC'}
    【记忆总结】（更早前剧情的浓缩概括，需保持连贯但不要逐字复述）
    ${memorySummaryText || '暂无'}
    【最近剧情回顾】（避免重复）
    ${historySummary || '暂无'}
    【已使用主题】（避免重复提及）
    ${usedThemesList || '暂无'}
    【回忆录（最近15条重要事件）】
    ${memoirRecent || '暂无'}
    【最近NPC私信摘要（最近5条）】
    ${chatSummary || '暂无'}
    【核心规则】
    1. 每次生成剧情不少于800字，包含环境、心理、对话和细节。
    2. 贴合MC和YouTube主播日常，皮上/皮下交织。
    3. 禁止重复之前出现过的桥段或对话。
    4. 直播场景模拟外网观众真实反应（弹幕、评论、打赏）。
    5. 视频发布后展示数据（播放量、点赞、评论）。
    6. 根据玩家身份调整粉丝数量和互动规模。
    7. 与NPC互动时严格遵循其人设。
    8. 在剧情中适当提及回忆录中的事件和NPC私信内容，保持记忆连贯性。
    输出纯文本，不需要额外标记。
    `;
}

function buildUserPrompt(action, detail = '') {
    const timeStr = getTimeSlotName(G.timeSlot);
    let base = `第${G.day}天 ${timeStr}，玩家选择「${action}」`;
    if (detail) base += `，具体内容：${detail}`;
    base += `。请生成详细的剧情发展，至少800字。`;
    return base;
}

async function generateStory(tag, userPrompt, useSearch = false, replaceBlock = null, replaceHistoryId = null) {
    if (G.isGenerating) return;
    G.isGenerating = true;
    showLoading();
    try {
        let searchBlock = '';
        let searchNote = '';
        if (useSearch && G.search.apiKey) {
            try {
                const query = `Minecraft ${G.player.category || ''} ${userPrompt}`.trim().slice(0, 200);
                const data = await webSearch(query, 4);
                const { text, titles } = formatSearchContext(data);
                if (text) {
                    searchBlock = `\n【联网搜索到的真实参考资料（可自然融入模组名称、主播动态等细节，禁止编造不存在的真实产品/人物）】\n${text}\n`;
                    searchNote = `\n\n🌐 已联网参考：${titles.slice(0, 3).join('、')}`;
                }
            } catch (e) {
                console.warn('联网搜索失败，本次剧情将不带联网资料继续生成', e);
                showToast('⚠️ 联网搜索失败，已跳过，剧情正常继续', 'error', 2000);
            }
        }
        let sys = buildSystemPrompt() + searchBlock;
        if (replaceHistoryId) {
            sys += `\n【🔄 本次为重说】请重新构思这一轮剧情。不要复述或沿用被替换的旧回复，改用不同的事件发展、对话或细节，让新版本与旧版本有明显区别。`;
        }
        const user = buildUserPrompt(userPrompt, '');
        const messages = [{ role: 'system', content: sys }, { role: 'user', content: user }];
        const recentHistory = G.storyHistory.filter(h => !h.archived && h._id !== replaceHistoryId).slice(-5);
        for (const h of recentHistory) {
            const pure = stripThought(h.text);
            const snippet = h.truncated ? '（此前一条内容生成不完整，已忽略）' : pure.slice(0, 500) + '...';
            messages.push({ role: 'assistant', content: snippet });
        }
        const response = await callAI(messages, { maxTokens: 10000, temperature: 0.85 });
        hideLoading();
        const truncated = isLikelyTruncated(response);
        const newText = response + searchNote;

        if (!replaceBlock) {
            const { block } = appendStory(newText, tag, { action: userPrompt, useSearch }, {
                truncated,
                onRegenerate: () => regenerateStoryBlock(block, tag, userPrompt, useSearch),
            });
            G._lastRegenerate = () => regenerateStoryBlock(block, tag, userPrompt, useSearch);
        } else {
            const entry = G.storyHistory.find(h => h._id === replaceHistoryId);
            if (entry) {
                entry.text = newText;
                entry.truncated = truncated;
                entry.tag = tag;
                entry.action = userPrompt;
                entry.useSearch = useSearch;
            }
            const content = replaceBlock.querySelector('.story-content');
            if (content) content.innerHTML = renderContentWithThoughts(newText);
            const meta = replaceBlock.querySelector('.meta');
            if (meta) {
                const oldBadge = meta.querySelector('.reroll-truncated-badge');
                if (oldBadge) oldBadge.remove();
                if (truncated) {
                    const badge = document.createElement('span');
                    badge.className = 'tag reroll-truncated-badge';
                    badge.style.cssText = 'background:#fff3e0;color:#e65100;';
                    badge.textContent = '⚠️ 可能被截断';
                    meta.appendChild(badge);
                }
            }
            const rerollBtn = replaceBlock.querySelector('button');
            if (rerollBtn) {
                rerollBtn.disabled = false;
                rerollBtn.onclick = null;
            }
            G._lastRegenerate = () => regenerateStoryBlock(replaceBlock, tag, userPrompt, useSearch);
            extractThemes(stripThought(newText));
            showToast('✅ 重说成功，已替换为新剧情', 'success', 1800);
        }
        if (G.usedThemes.size > 150) { const arr = Array.from(G.usedThemes);
            G.usedThemes = new Set(arr.slice(-80)); }
        maybeAutoSummarize();
    } catch (err) {
        hideLoading();
        console.error(err);
        if (!err.message.includes('No API Key')) {
            showToast('❌ 生成失败，请检查网络或 API Key');
            const { block } = appendStory('（AI 生成失败，但冒险仍在继续......你可以点击下方按钮重新生成。）', '⚠️ 系统提示', {}, {
                onRegenerate: () => regenerateStoryBlock(block, tag, userPrompt, useSearch),
            });
            G._lastRegenerate = () => regenerateStoryBlock(block, tag, userPrompt, useSearch);
        }
    } finally { G.isGenerating = false;
        updateUI(); }
}
async function regenerateStoryBlock(block, tag, userPrompt, useSearch) {
    if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }
    if (!block || !block.isConnected) { showToast('⚠️ 找不到要重说的剧情', 'error', 1800); return; }
    const id = block.dataset.storyId;
    if (!id || !G.storyHistory.some(h => h._id === id)) {
        showToast('⚠️ 找不到要重说的剧情记录', 'error', 1800);
        return;
    }
    await generateStory(tag, userPrompt, useSearch, block, id);
}
// ============================================================
// ✏️ 编辑内容（剧情记录 & 记忆总结）
// ============================================================
function refreshStoryBlockDOM(entry) {
    const block = dom.storyArea.querySelector(`.story-block[data-story-id="${entry._id}"]`);
    if (!block) return;
    const content = block.querySelector('.story-content');
    if (content) content.innerHTML = renderContentWithThoughts(entry.text);
    const meta = block.querySelector('.meta');
    if (meta) {
        let badge = meta.querySelector('.archived-badge');
        if (entry.archived) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'tag archived-badge';
                badge.style.cssText = 'background:#eee;color:#888;';
                meta.appendChild(badge);
            }
            badge.textContent = '🗄 已归档（AI不可读）';
        } else if (badge) {
            badge.remove();
        }
    }
}
function buildEditEntryHTML(entry, kind) {
    const label = kind === 'summary'
        ? `记忆总结 · 截至第${entry.day}天`
        : `第${entry.day}天 · ${getTimeSlotName(entry.time)} · ${entry.tag || ''}`;
    const archivedNote = entry.archived ? ' <span style="color:#999;">（已归档，AI不可读）</span>' : '';
    // 剥离掉思维链，优先展示并只编辑真实AI正文
    const pureText = stripThought(entry.text || '').trim();
    const preview = escapeHtml(pureText.slice(0, 60)) + (pureText.length > 60 ? '...' : '');
    return `
    <div class="edit-entry" data-id="${entry._id}" data-kind="${kind}" style="margin-bottom:8px;border:1px solid rgba(30,60,30,.10);border-radius:10px;overflow:hidden;">
        <div class="edit-entry-header" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f5faf5;">
            <div style="font-size:12px;color:#666;flex:1;min-width:0;">
                <div style="font-weight:600;color:var(--text);">${escapeHtml(label)}${archivedNote}</div>
                <div class="edit-entry-preview" style="color:#888;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${preview || '（无文字正文）'}</div>
            </div>
            <span class="chevron" style="margin-left:8px;color:#999;">▼</span>
        </div>
        <div class="edit-entry-body" style="display:none;padding:8px 10px 10px;background:#fff;">
            <textarea class="edit-textarea" style="width:100%;min-height:140px;padding:8px;border-radius:8px;border:2px solid rgba(30,60,30,.10);background:#f5faf5;color:var(--text);font-size:13px;font-family:inherit;resize:vertical;">${escapeHtml(pureText)}</textarea>
            <div class="btn-row" style="margin-top:8px;">
                <button class="btn-secondary edit-cancel-btn">取消</button>
                <button class="btn-primary edit-save-btn">💾 保存修改</button>
            </div>
        </div>
    </div>`;
}
function bindEditEntryEvents(container, kind, onSave) {
    container.querySelectorAll('.edit-entry').forEach(entryEl => {
        const header = entryEl.querySelector('.edit-entry-header');
        const body = entryEl.querySelector('.edit-entry-body');
        const chevron = entryEl.querySelector('.chevron');
        header.addEventListener('click', () => {
            const isOpen = body.style.display !== 'none';
            body.style.display = isOpen ? 'none' : 'block';
            chevron.textContent = isOpen ? '▼' : '▲';
        });
        entryEl.querySelector('.edit-cancel-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            body.style.display = 'none';
            chevron.textContent = '▼';
        });
        entryEl.querySelector('.edit-save-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = entryEl.dataset.id;
            const textarea = entryEl.querySelector('.edit-textarea');
            const newText = textarea.value.trim();
            if (!newText) { showToast('⚠️ 内容不能为空', 'error', 1800); return; }
            onSave(id, newText);
            entryEl.querySelector('.edit-entry-preview').textContent =
                newText.slice(0, 60) + (newText.length > 60 ? '...' : '');
            body.style.display = 'none';
            chevron.textContent = '▼';
            showToast('✅ 已保存修改', 'success', 1500);
        });
    });
}
function buildChatEditEntryHTML(npcName, msg) {
    const fromLabel = msg.from === 'player' ? '🧑 我' : (msg.from === 'system' ? '⚙️ 系统' : `🤖 ${npcName}`);
    const label = `${fromLabel} · ${msg.time || ''}`;
    const pureText = stripThought(msg.text || '').trim();
    const preview = escapeHtml(pureText.slice(0, 60)) + (pureText.length > 60 ? '...' : '');
    return `
    <div class="edit-entry" data-id="${msg._id}" style="margin-bottom:8px;border:1px solid rgba(30,60,30,.10);border-radius:10px;overflow:hidden;">
        <div class="edit-entry-header" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f5faf5;">
            <div style="font-size:12px;color:#666;flex:1;min-width:0;">
                <div style="font-weight:600;color:var(--text);">${escapeHtml(label)}</div>
                <div class="edit-entry-preview" style="color:#888;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${preview || '（无文字正文）'}</div>
            </div>
            <span class="chevron" style="margin-left:8px;color:#999;">▼</span>
        </div>
        <div class="edit-entry-body" style="display:none;padding:8px 10px 10px;background:#fff;">
            <textarea class="edit-textarea" style="width:100%;min-height:100px;padding:8px;border-radius:8px;border:2px solid rgba(30,60,30,.10);background:#f5faf5;color:var(--text);font-size:13px;font-family:inherit;resize:vertical;">${escapeHtml(pureText)}</textarea>
            <div class="btn-row" style="margin-top:8px;">
                <button class="btn-secondary edit-cancel-btn">取消</button>
                <button class="btn-primary edit-save-btn">💾 保存修改</button>
            </div>
        </div>
    </div>`;
}
function openEditContentModal(defaultTab = 'story') {
    // 倒序排列：确保 AI 最新生成的对话和剧情出现在最顶端，优先读取
    const storyEntries = [...(G.storyHistory || [])].reverse();
    const summaryEntries = [...(G.memorySummaries || [])].reverse();
    let chatCount = 0;
    let chatHtml = '';
    for (const [npcId, msgs] of Object.entries(G.chatHistory || {})) {
        if (!msgs || !msgs.length) continue;
        const npc = G.npcs[npcId];
        const npcName = npc ? npc.name : npcId;
        chatCount += msgs.length;
        chatHtml += `<div style="font-size:12px;font-weight:700;color:var(--primary);margin:10px 0 6px;">🤖 ${escapeHtml(npcName)}</div>`;
        chatHtml += [...msgs].reverse().map(m => buildChatEditEntryHTML(npcName, m)).join('');
    }
    const html = `
    <h3 style="margin-bottom:10px;">✏️ 编辑内容</h3>
    <div class="btn-row" style="margin-bottom:10px;">
        <button class="btn-secondary small" id="editTabStoryBtn" style="flex:1;">📖 剧情记录（${storyEntries.length}）</button>
        <button class="btn-secondary small" id="editTabChatBtn" style="flex:1;">💬 私信对话（${chatCount}）</button>
        <button class="btn-secondary small" id="editTabSummaryBtn" style="flex:1;">🧠 记忆总结（${summaryEntries.length}）</button>
    </div>
    <div id="editTabStory" style="max-height:55vh;overflow-y:auto;">
        ${storyEntries.length ? storyEntries.map(e => buildEditEntryHTML(e, 'story')).join('') : '<p style="font-size:12px;color:#999;">暂无剧情记录</p>'}
    </div>
    <div id="editTabChat" style="max-height:55vh;overflow-y:auto;display:none;">
        ${chatCount ? chatHtml : '<p style="font-size:12px;color:#999;">暂无私信记录</p>'}
    </div>
    <div id="editTabSummary" style="max-height:55vh;overflow-y:auto;display:none;">
        ${summaryEntries.length ? summaryEntries.map(e => buildEditEntryHTML(e, 'summary')).join('') : '<p style="font-size:12px;color:#999;">暂无记忆总结，可在「🧠 记忆」功能中生成</p>'}
    </div>
    <div class="btn-row" style="margin-top:12px;">
        <button class="btn-secondary" onclick="closeModal()">关闭</button>
    </div>
    `;
    openModal(html);
    const storyTab = document.getElementById('editTabStory');
    const chatTab = document.getElementById('editTabChat');
    const summaryTab = document.getElementById('editTabSummary');
    const storyBtn = document.getElementById('editTabStoryBtn');
    const chatBtn = document.getElementById('editTabChatBtn');
    const summaryBtn = document.getElementById('editTabSummaryBtn');
    function showTab(which) {
        storyTab.style.display = which === 'story' ? 'block' : 'none';
        chatTab.style.display = which === 'chat' ? 'block' : 'none';
        summaryTab.style.display = which === 'summary' ? 'block' : 'none';
        storyBtn.style.opacity = which === 'story' ? '1' : '.55';
        chatBtn.style.opacity = which === 'chat' ? '1' : '.55';
        summaryBtn.style.opacity = which === 'summary' ? '1' : '.55';
    }
    storyBtn.addEventListener('click', () => showTab('story'));
    chatBtn.addEventListener('click', () => showTab('chat'));
    summaryBtn.addEventListener('click', () => showTab('summary'));
    showTab(defaultTab);

    // 保存后同时替换条目，并刷新主界面显示
    bindEditEntryEvents(storyTab, 'story', (id, newText) => {
        const entry = G.storyHistory.find(h => h._id === id);
        if (entry) { 
            entry.text = newText;
            refreshStoryBlockDOM(entry); 
        }
    });
    bindEditEntryEvents(chatTab, 'chat', (id, newText) => {
        for (const npcId of Object.keys(G.chatHistory || {})) {
            const m = (G.chatHistory[npcId] || []).find(x => x._id === id);
            if (m) {
                m.text = newText;
                if (G.currentChatNpc === npcId) renderSocialPanel();
                break;
            }
        }
    });
    bindEditEntryEvents(summaryTab, 'summary', (id, newText) => {
        const entry = (G.memorySummaries || []).find(m => m._id === id);
        if (entry) entry.text = newText;
    });
}
$('editContentBtn')?.addEventListener('click', () => openEditContentModal('story'));
// ============================================================
// 🧠 记忆总结
// ============================================================
function getMemorySummaryAIOptions() {
    const pid = G.memorySummarySettings.modelProfileId;
    if (!pid) return {};
    const profile = G.savedModels.find(p => p.id === pid);
    if (!profile) return {};
    return { baseUrl: profile.baseUrl, apiKey: profile.apiKey, model: profile.model };
}
async function generateMemorySummary(keepRecentCount, opts = {}) {
    const active = G.storyHistory.filter(h => !h.archived);
    const toSummarize = active.slice(0, Math.max(0, active.length - keepRecentCount));
    if (!toSummarize.length) { showToast('⚠️ 没有可总结的更早内容', 'error', 1800); return null; }
    const priorSummaries = (G.memorySummaries || []).map(m => stripThought(m.text)).join('\n');
    let summaryText;
    if (opts.manualText) {
        summaryText = opts.manualText.trim();
    } else {
        const combinedText = toSummarize.map(h =>
            `[第${h.day}天 ${getTimeSlotName(h.time)}] ${stripThought(h.text)}`
        ).join('\n\n');
        const sys = `你是剧情记忆总结助手。请将以下 MC YouTuber 主播模拟游戏的剧情记录浓缩为一段连贯、精炼的记忆总结（300字以内），保留关键事件、人物关系变化、重要转折，去除口水话与重复描写，供后续剧情生成时作为背景参考。只输出总结正文，不要额外说明。`;
        const userMsg = `${priorSummaries ? `【此前已有的记忆总结】\n${priorSummaries}\n\n` : ''}【需要总结的剧情记录】\n${combinedText}`;
        summaryText = await callAI([
            { role: 'system', content: sys },
            { role: 'user', content: userMsg },
        ], { maxTokens: 800, temperature: 0.5, ...getMemorySummaryAIOptions() });
        summaryText = stripThought(summaryText.trim());
    }
    const lastEntry = toSummarize[toSummarize.length - 1];
    const summaryEntry = {
        _id: 'sum_' + (G._summaryId = (G._summaryId || 0) + 1),
        text: summaryText,
        day: lastEntry.day,
        createdAt: Date.now(),
        coveredCount: toSummarize.length,
        manual: !!opts.manualText,
    };
    G.memorySummaries.push(summaryEntry);
    const idsToArchive = new Set(toSummarize.map(h => h._id));
    G.storyHistory.forEach(h => {
        if (idsToArchive.has(h._id)) { h.archived = true;
            refreshStoryBlockDOM(h); }
    });
    return summaryEntry;
}
function showMemorySummaryFailureModal(err, keepRecent) {
    openModal(`
        <h3 style="margin-bottom:10px;">❌ 记忆总结失败</h3>
        <p style="font-size:13px;color:#666;line-height:1.6;">${escapeHtml(err && err.message ? err.message : String(err))}</p>
        <p style="font-size:12px;color:#999;margin-top:6px;">点击确认可重新尝试总结，或稍后手动重试。</p>
        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" onclick="closeModal()">稍后再说</button>
            <button class="btn-primary" id="retryMemorySummaryBtn">✅ 确认重试</button>
        </div>
    `);
    document.getElementById('retryMemorySummaryBtn')?.addEventListener('click', async () => {
        closeModal();
        await runMemorySummary(keepRecent);
    });
}
async function runMemorySummary(keepRecent, opts = {}) {
    try {
        const entry = await generateMemorySummary(keepRecent, opts);
        if (entry) showToast('✅ 记忆总结完成，更早内容已归档', 'success', 2200);
        return entry;
    } catch (e) {
        console.error(e);
        showMemorySummaryFailureModal(e, keepRecent);
        return null;
    }
}
async function maybeAutoSummarize() {
    const s = G.memorySummarySettings;
    if (!s.enabled || G._autoSummarizing) return;
    const active = G.storyHistory.filter(h => !h.archived);
    if (active.length < s.threshold) return;
    G._autoSummarizing = true;
    try {
        const entry = await generateMemorySummary(s.keepRecent);
        if (entry) showToast('🧠 已自动生成记忆总结，更早内容已归档', 'success', 2200);
    } catch (e) {
        console.error(e);
        showMemorySummaryFailureModal(e, s.keepRecent);
    } finally {
        G._autoSummarizing = false;
    }
}
function buildModelProfileOptionsHTML(selectedId) {
    const opts = [`<option value="">使用当前主模型（${escapeHtml(G.ai.model || '未设置')}）</option>`];
    (G.savedModels || []).forEach(p => {
        opts.push(`<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.note || p.model || p.id)}</option>`);
    });
    return opts.join('');
}
function openMemorySummaryModal() {
    const active = G.storyHistory.filter(h => !h.archived);
    const summaries = G.memorySummaries || [];
    const s = G.memorySummarySettings;
    const html = `
    <h3 style="margin-bottom:10px;">🧠 记忆总结</h3>
    <p style="font-size:12px;color:#666;line-height:1.6;">当前共有 <b>${active.length}</b> 轮未归档的剧情记录，AI 会读取这些内容。你可以让 AI 将较早的内容总结为一段精炼记忆，之后 AI 将只读取「记忆总结 + 最近若干轮」，不再读取被总结掉的原文。</p>
    <div class="form-group" style="margin-top:10px;">
        <label style="font-size:12px;">保留最近几轮不总结（其余更早的内容会被总结并归档）</label>
        <input type="number" id="memoryKeepRecentInput" min="0" value="${s.keepRecent}" style="width:100%;padding:8px;border-radius:8px;border:2px solid rgba(30,60,30,.10);background:#f5faf5;color:var(--text);font-size:13px;">
    </div>
    <div class="form-group" style="margin-top:8px;">
        <label style="font-size:12px;">🧩 用于总结的模型（可与主对话模型不同）</label>
        <select id="memoryModelProfileSelect" style="width:100%;padding:8px;border-radius:8px;border:2px solid rgba(30,60,30,.10);background:#f5faf5;color:var(--text);font-size:13px;">
            ${buildModelProfileOptionsHTML(s.modelProfileId)}
        </select>
        ${!G.savedModels.length ? '<div style="font-size:11px;color:#999;margin-top:4px;">💡 可在「⚙️ 模型」设置里保存多个模型档案后在此选择</div>' : ''}
    </div>
    <div class="btn-row" style="margin-top:10px;">
        <button class="btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn-primary" id="confirmMemorySummaryBtn">🧠 AI 生成总结</button>
    </div>
    <div style="margin-top:10px;">
        <button class="btn-secondary small" id="manualSummaryToggleBtn" style="width:100%;">✍️ 改为手动填写总结</button>
        <div id="manualSummaryArea" style="display:none;margin-top:8px;">
            <textarea id="manualSummaryTextarea" placeholder="手动输入本段记忆总结内容..." style="width:100%;min-height:100px;padding:8px;border-radius:8px;border:2px solid rgba(30,60,30,.10);background:#f5faf5;color:var(--text);font-size:13px;font-family:inherit;resize:vertical;"></textarea>
            <button class="btn-primary" id="confirmManualSummaryBtn" style="width:100%;margin-top:6px;">💾 保存手动总结并归档</button>
        </div>
    </div>
    <div style="margin-top:16px;border-top:1px solid rgba(30,60,30,.10);padding-top:10px;">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px;">⚙️ 自动总结</div>
        <label style="font-size:12px;display:flex;align-items:center;gap:6px;margin-bottom:6px;cursor:pointer;">
            <input type="checkbox" id="memoryAutoEnableCheckbox" ${s.enabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);">
            开启自动总结（未归档轮数达到阈值时，剧情生成后台自动触发总结）
        </label>
        <label style="font-size:12px;">达到多少轮未归档时自动触发</label>
        <input type="number" id="memoryThresholdInput" min="2" value="${s.threshold}" style="width:100%;padding:8px;border-radius:8px;border:2px solid rgba(30,60,30,.10);background:#f5faf5;color:var(--text);font-size:13px;margin-top:4px;">
    </div>
    <div style="margin-top:16px;border-top:1px solid rgba(30,60,30,.10);padding-top:10px;">
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px;">已有记忆总结（${summaries.length}）</div>
        <div style="max-height:26vh;overflow-y:auto;font-size:12px;color:#666;">
            ${summaries.length ? [...summaries].reverse().map(sm =>
                `<div style="padding:6px 0;border-bottom:1px dashed rgba(30,60,30,.10);"><b>截至第${sm.day}天</b>（归档${sm.coveredCount}轮${sm.manual ? '·手动' : ''}）：${escapeHtml(stripThought(sm.text).slice(0, 80))}${sm.text.length > 80 ? '...' : ''}</div>`
            ).join('') : '暂无'}
        </div>
        ${summaries.length ? `<button class="btn-secondary small" id="goEditSummaryBtn" style="margin-top:8px;width:100%;">✏️ 编辑已有总结</button>` : ''}
    </div>
    `;
    openModal(html);
    const keepInput = document.getElementById('memoryKeepRecentInput');
    const modelSelect = document.getElementById('memoryModelProfileSelect');
    const thresholdInput = document.getElementById('memoryThresholdInput');
    const autoCheckbox = document.getElementById('memoryAutoEnableCheckbox');
    keepInput.addEventListener('input', () => {
        const v = parseInt(keepInput.value, 10);
        if (!isNaN(v) && v >= 0) { s.keepRecent = v;
            persistMemorySummarySettings(); }
    });
    modelSelect.addEventListener('change', () => { s.modelProfileId = modelSelect.value;
        persistMemorySummarySettings(); });
    thresholdInput.addEventListener('input', () => {
        const v = parseInt(thresholdInput.value, 10);
        if (!isNaN(v) && v >= 1) { s.threshold = v;
            persistMemorySummarySettings(); }
    });
    autoCheckbox.addEventListener('change', () => { s.enabled = autoCheckbox.checked;
        persistMemorySummarySettings(); });
    document.getElementById('manualSummaryToggleBtn')?.addEventListener('click', () => {
        const area = document.getElementById('manualSummaryArea');
        area.style.display = area.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('confirmMemorySummaryBtn')?.addEventListener('click', async () => {
        let keep = parseInt(keepInput?.value, 10);
        if (isNaN(keep) || keep < 0) keep = 0;
        s.keepRecent = keep;
        persistMemorySummarySettings();
        const btn = document.getElementById('confirmMemorySummaryBtn');
        btn.disabled = true;
        btn.textContent = '⏳ 总结中...';
        const entry = await runMemorySummary(keep);
        if (entry) closeModal();
        else { btn.disabled = false;
            btn.textContent = '🧠 AI 生成总结'; }
    });
    document.getElementById('confirmManualSummaryBtn')?.addEventListener('click', async () => {
        let keep = parseInt(keepInput?.value, 10);
        if (isNaN(keep) || keep < 0) keep = 0;
        const manualText = document.getElementById('manualSummaryTextarea')?.value.trim();
        if (!manualText) { showToast('⚠️ 请先填写总结内容', 'error', 1800); return; }
        const entry = await runMemorySummary(keep, { manualText });
        if (entry) closeModal();
    });
    document.getElementById('goEditSummaryBtn')?.addEventListener('click', () => openEditContentModal('summary'));
}
$('memorySummaryBtn')?.addEventListener('click', () => {
    if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }
    openMemorySummaryModal();
});
// ============================================================