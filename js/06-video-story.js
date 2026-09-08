// js/06-video-story.js
// 视频制作（评论由 AI 实时生成）与多层级记忆联动的核心叙事引擎（按天数结构化、上帝视角实体名归纳、更名历史追踪）
// ============================================================
function openVideoModal() {
    const availableAP = G.actionPoints;
    const collectionNames = Object.keys(G.collections || {});
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

    const hasSearchConfigured = !!(G.search && (G.search.apiKey || (G.search.keys && Object.values(G.search.keys).some(k => !!k))));

    const html = `
    <h3>🎬 制作视频</h3>
    <p>选择视频风格、时长、合集，并输入内容描述</p>
    <div class="form-group">
        <label>📝 视频标题</label>
        <input type="text" id="videoTitle" placeholder="输入标题..." value="MC 精彩集锦">
    </div>
    <div class="form-group">
        <label>📝 视频内容描述（AI将根据此描述生成剧情与网友评论）</label>
        <textarea id="videoDesc" class="desc-input" rows="3" placeholder="描述你视频的内容，例如：我在末地击败了末影龙，并建造了一个纪念塔。"></textarea>
    </div>
    ${hasSearchConfigured ? `
    <div class="form-group" style="display:flex;align-items:center;gap:8px;margin-top:-6px;">
        <label style="font-size:13px;margin-bottom:0;display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" id="videoUseSearch" ${G.search.enabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);">
            🌐 启用实时联网搜索真实资讯 (博查/秘塔/Tavily)
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
            document.querySelectorAll('#styleSelector .style-btn').forEach(b => b.classList.remove('selected'));
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
    }
    radioNone.addEventListener('change', updateCollectionUI);
    radioNew.addEventListener('change', updateCollectionUI);
    if (radioExisting) radioExisting.addEventListener('change', updateCollectionUI);

    document.getElementById('confirmVideo').addEventListener('click', async function() {
        const title = document.getElementById('videoTitle').value.trim() || 'MC 精彩集锦';
        const desc = document.getElementById('videoDesc').value.trim() || '';
        const styleBtn = document.querySelector('#styleSelector .style-btn.selected');
        const style = styleBtn ? styleBtn.dataset.style : 'epic';
        const durationRadio = document.querySelector('input[name="duration"]:checked');
        const duration = durationRadio ? durationRadio.value : 'long';
        const collectionOption = document.querySelector('input[name="collectionOption"]:checked').value;
        let collectionName = null, collectionIndex = 0;

        if (collectionOption === 'new') {
            const input = document.getElementById('collectionNameInput');
            if (input) {
                collectionName = input.value.trim() || null;
                if (collectionName) {
                    if (G.collections[collectionName]) { showToast('合集已存在，请选择已有合集或更换名称', 'error'); return; }
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
        const useSearch = (document.getElementById('videoUseSearch')?.checked || G.search.enabled);
        closeModal();
        await createVideo(title, style, duration, collectionName, collectionIndex, desc, useSearch);
        advanceTimeSlot();
        if (document.querySelector('.tab-btn.active')?.dataset.tab === 'dashboard') renderDashboard();
        if (document.querySelector('.tab-btn.active')?.dataset.tab === 'data') renderDataPanel();
    });
}

// 🌟 核心：AI 结合视频标题与描述，实时生成生动的网友评论
async function generateVideoCommentsAI(title, style, desc) {
    const styleNameMap = {
        teach: '硬核教学', entertain: '娱乐整活', epic: '高燃剪辑', survival: '生存实况', movie: '剧情微电影', animation: 'MC动画'
    };
    const sys = `
    你正在模拟 YouTube 视频下方的真实网友评论区。
    视频标题：《${title}》
    视频风格：${styleNameMap[style] || style}
    视频描述内容：${desc || '日常创作分享'}
    请生成 5 到 8 条贴合该视频内容的真实网友评论。要求口吻各异，包括：
    - 对视频具体亮点的夸赞
    - 针对内容的提问或红石/建筑技术探讨
    - 弹幕玩梗吐槽
    - 催更后续
    格式必须严格如下（每行一条，昵称真实有趣）：
    [CMT user=网友昵称]评论内容[/CMT]
    `;
    try {
        const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '请为这个视频生成评论区。' }], { maxTokens: 450, temperature: 0.9 });
        const re = /\[CMT\s+user=([^\]]+?)\]([\s\S]*?)\[\/CMT\]/g;
        const list = [];
        let m;
        while ((m = re.exec(raw)) !== null) {
            list.push({ user: m[1].trim(), content: stripThought(m[2].trim()) });
        }
        return list.length ? list : [
            { user: 'Minecrafter_01', content: `《${title}》剪得太棒了，特别是后半段的处理！` },
            { user: 'RedstoneGuru', content: '这个设计太有创意了，学到了！' }
        ];
    } catch (e) {
        return [
            { user: 'CreeperLover', content: `支持主播！这期《${title}》质量太高了！` },
            { user: 'BlockBuilder', content: '照着视频做了一遍，效果拔群！' }
        ];
    }
}

async function createVideo(title, style, duration, collectionName, collectionIndex, description, useSearch = false) {
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
    const pSkills = G.player.skills || {};
    for (const sk of mainSkills) extraViews += (pSkills[sk] || 0) * 500;
    let baseViews = 0, baseLikes = 0, followersGain = 0, moneyGain = 0;
    const isShort = (duration === 'short');
    const multiplier = isShort ? 0.6 : 1.0;
    let styleMod = 1.0;

    if (style === 'teach') {
        styleMod = 1.2;
        for (const sk of mainSkills) G.player.skills[sk] = Math.min(100, (G.player.skills[sk] || 0) + rand(1, 3));
    } else if (style === 'entertain') {
        styleMod = 1.1;
        followersGain = rand(20, 80);
    } else if (style === 'epic') {
        styleMod = 1.3;
        baseLikes = rand(30, 100);
        followersGain = rand(10, 50);
    } else if (style === 'survival') {
        styleMod = 1.0;
        followersGain = rand(15, 60);
    } else if (style === 'movie') {
        styleMod = 1.4;
        baseLikes = rand(40, 120);
        followersGain = rand(20, 70);
    } else if (style === 'animation') {
        styleMod = 1.5;
        baseLikes = rand(50, 150);
        followersGain = rand(25, 80);
    }

    let seriesBonus = (collectionName && collectionIndex > 1) ? 2.0 : 1.0;
    const baseRandom = rand(2000, 8000) + G.player.followers * 0.5;
    baseViews = Math.floor(baseRandom * multiplier * styleMod * seriesBonus) + extraViews;
    baseLikes += Math.floor(baseViews * 0.05);

    const comments = await generateVideoCommentsAI(title, style, description);

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
        followersGain: followersGain,
        moneyGain: moneyGain,
        description: description || '',
    };
    if (!G.player.videos) G.player.videos = [];
    const videoIndex = G.player.videos.length;
    G.player.videos.push(videoObj);
    G.totalVideos = (G.totalVideos || 0) + 1;
    if (collectionName) {
        if (!G.collections[collectionName]) G.collections[collectionName] = { videos: [], totalViews: 0, totalLikes: 0, totalComments: 0, videoCount: 0 };
        G.collections[collectionName].videos.push(videoIndex);
        updateCollectionStats(collectionName);
    }
    const totalFollowersAdd = followersGain + Math.floor(baseViews * 0.001);
    const totalMoneyAdd = moneyGain + Math.floor(baseViews * 0.005);

    G.player.likes = (G.player.likes || 0) + baseLikes;
    G.player.followers = (G.player.followers || 0) + totalFollowersAdd;
    G.player.money = (G.player.money || 0) + totalMoneyAdd;
    addMemoir('发布视频', `「${title}」 播放量 ${baseViews}，风格 ${style}`);

    G._lastRegenerate = async () => {
        showToast('🔄 正在撤回刚才发布的视频并重新生成...', 'info', 2000);
        const vIdx = G.player.videos.indexOf(videoObj);
        if (vIdx !== -1) {
            G.player.videos.splice(vIdx, 1);
            G.totalVideos = Math.max(0, G.totalVideos - 1);
            G.player.likes = Math.max(0, G.player.likes - baseLikes);
            G.player.followers = Math.max(0, G.player.followers - totalFollowersAdd);
            G.player.money = Math.max(0, G.player.money - totalMoneyAdd);
            if (collectionName && G.collections[collectionName]) {
                const cVideos = G.collections[collectionName].videos;
                const cIdx = cVideos.indexOf(vIdx);
                if (cIdx !== -1) cVideos.splice(cIdx, 1);
                updateCollectionStats(collectionName);
            }
        }
        await createVideo(title, style, duration, collectionName, collectionIndex, description, useSearch);
        if (document.querySelector('.tab-btn.active')?.dataset.tab === 'dashboard') renderDashboard();
        if (document.querySelector('.tab-btn.active')?.dataset.tab === 'data') renderDataPanel();
    };

    const seriesText = collectionName ? `（合集：${collectionName}，第${collectionIndex}集）` : '';
    const descText = description ? ` 内容描述：${description}` : '';
    const pov = G.player.pov || 'second';
    let storyPrefix = '你';
    if (pov === 'first') storyPrefix = '我';
    else if (pov === 'third') storyPrefix = `${G.player.ytName || '少女'}`;
    const storyText = `${storyPrefix}发布了视频「${title}」${seriesText}，风格${style}，${duration === 'short' ? '短' : '长'}视频。播放量 ${baseViews}，点赞 ${baseLikes}，评论 ${comments.length} 条。${descText}`;
    
    generateStory('🎬 视频发布', storyText, useSearch).then(() => {
        showToast(`🎬 视频「${title}」发布成功！`, 'success', 2000);
    });
    updateUI();
    checkAchievements();
    autoSaveGame();
}

// ============================================================
// 通用剧情生成与深度多层级记忆构建（按日期分类、更名档案追踪、上帝视角纯实体名）
// ============================================================
function buildSystemPrompt() {
    const p = G.player;
    const activeStoryHistory = (G.storyHistory || []).filter(h => !h.archived);

    // 1. 最近剧情回顾：严格注明具体天数与时段
    const historySummary = activeStoryHistory.slice(-8).map(h =>
        h.truncated
            ? `[第${h.day}天 · ${getTimeSlotName(h.time)}] （内容不完整已忽略）`
            : `[第${h.day}天 · ${getTimeSlotName(h.time)}] ${stripThought(h.text).slice(0, 130)}...`
    ).join('\n');

    // 2. 全局重大记忆库：按日期精确归类发给 AI
    const memoryByDays = {};
    (G.memorySummaries || []).forEach(m => {
        const d = m.day || 1;
        if (!memoryByDays[d]) memoryByDays[d] = [];
        const cleanTxt = stripThought(m.text || m);
        memoryByDays[d].push(cleanTxt);
    });

    const formattedDayMemories = Object.keys(memoryByDays).sort((a, b) => Number(a) - Number(b)).map(d => {
        return `【📅 游戏第 ${d} 天纪事档案】：\n` + memoryByDays[d].map(txt => `• ${txt}`).join('\n');
    }).join('\n\n');

    // 3. 更名历史履历追踪（防止改名后 AI 产生认知割裂）
    let nameHistoryNotice = '';
    if (p._nameHistory && Array.isArray(p._nameHistory) && p._nameHistory.length > 0) {
        nameHistoryNotice = `【🚨 核心姓名与更名履历档案】：
主角当前的主播名字为「${p.ytName}」。
历史曾用名记录：${p._nameHistory.join(' → ')}。
【极其重要】：历史记忆中记载的曾用名指的均是主角「${p.ytName}」本人，严禁误认为这是不同的角色！\n`;
    }

    // 4. NPC 专属关系与记忆
    const npcDetailedMemories = Object.values(G.npcs || {}).map(n => {
        let mem = `【${n.name}】(好感度: ${n.favor||0}${n._relationship === 'dating' ? ' 💕恋人' : ''})`;
        if (n.memorySummary) mem += `\n  - 专属承诺与互动记忆: ${stripThought(n.memorySummary)}`;
        if (n.knownGroupEvents) mem += `\n  - 群聊获悉事件: ${stripThought(n.knownGroupEvents)}`;
        return mem;
    }).join('\n');

    // 5. 群聊公共纪要
    const groupMemoriesList = Object.entries(G.groupMemories || {}).map(([gid, text]) => {
        const grp = G.groups[gid];
        return `[群聊「${grp ? grp.name : gid}」纪要]: ${stripThought(text)}`;
    }).join('\n');

    // 6. 回忆录里程碑：严格按天数前缀
    const memoirRecent = (G.memoir || []).slice(-12).map(m =>
        `[第${m.day}天]: ${m.event} (${m.details})`
    ).join('\n');

    // 🌟 全局人称叙事规则
    const pov = p.pov || 'second';
    let povInstruction = '';
    if (pov === 'first') {
        povInstruction = `【叙事人称铁律】：全文必须严格使用【第一人称「我」】进行沉浸式主观叙事！禁止使用“你”称呼主角，所有心理、动作、语言均以“我”的视角展现。`;
    } else if (pov === 'third') {
        povInstruction = `【叙事人称铁律】：全文必须使用【第三人称「她」或频道名「${p.ytName}」】进行小说式叙事！严禁使用“你”或“我”来称呼主角，以旁观客观叙述其精彩经历。`;
    } else {
        povInstruction = `【叙事人称铁律】：全文使用【第二人称「你」】进行代入感叙事！引导主角进行体验。`;
    }

    // 🌸 女性玩家与声音设定
    const voiceInstruction = p.voiceVoiceChanger 
        ? `玩家在网络直播/视频中使用了变声器伪装（变声器设定），但现实皮下依然是真实的女性。`
        : `玩家为纯正的女性！声线天然为少女音/清澈女声，描写玩家的嗓音、体态、神态时必须完全符合女性特质，严禁使用“兄弟”、“哥们”等男性化粗鲁称呼。`;

    return `
你是一个专业且富有创意的 MC YouTube 模拟器叙事 AI。
根据玩家行动生成生动、连贯、细节饱满的沉浸式剧情。

${povInstruction}
【🌸 玩家真实身份约束】：
玩家为女性！${voiceInstruction}
${nameHistoryNotice}
【🎭 玩家形象三大维度（重点分层，严禁混淆）】：
1. 🖥️【线上虚拟形象 / Live2D皮套】：${p.avatarLive2d || '精美定制Live2D虚拟形象'}
   （适用场景：开直播、录视频、Vtuber联动出镜、观众视角所见到的动态立绘形态）
2. 🎮【游戏形象 / Minecraft像素皮肤】：${p.skin || '专属MC定制皮肤与披风'}
   （适用场景：在Minecraft游戏中挖矿、建筑、PvP战斗、被怪物追击、方块世界联机时的操作角色）
3. 🏠【线下真实形象 / 现实皮下素颜】：${p.appearanceReal || '清秀灵动的少女，身姿轻盈，日常居家族穿搭'}
   （适用场景：摘下耳机后的现实生活、喝水休息、线下聚会偶遇、私信视频通话等皮下生活）

【玩家频道与属性】
- 主播频道：${p.ytName} | 身份：${p.identity === 'new' ? '新主播' : p.identity === 'fans' ? '小有名气主播' : '老牌主播'} | 赛道：${p.category} | 人设形象：${p.persona}
- 数据统计：粉丝 ${p.followers} | 金币 ${p.money} | 点赞 ${p.likes}

【🌐 统一全局长效记忆档案（已按游戏天数清晰归档，注意时间先后演进）】
${formattedDayMemories || '暂无全局历史摘要'}

【👥 群聊公开话题与纪要】
${groupMemoriesList || '暂无群聊大事件'}

【👤 NPC 关系与专属记忆】
${npcDetailedMemories || '暂无NPC'}

【最近时段行动回顾】
${historySummary || '暂无'}

【重要履历大事记】
${memoirRecent || '暂无'}

【核心叙事铁律】
1. 必须精准继承【统一全局长效记忆档案】与【NPC关系与专属记忆】中的所有历史设定与承诺。
2. 密切注意【当前游戏天数：第 ${G.day} 天 · ${getTimeSlotName(G.timeSlot)}】，严格依照时间先后顺序推进，绝不把多天前的早晨事件当成今天发生。
3. 每次生成剧情不少于 800 字，皮上游戏实况（走位、红石、追杀博弈、反杀高光）与皮下生活（日常互动、微信消息联动、主播八卦）巧妙交织。
4. 行文生动写实，代入感强烈。只输出剧情正文，禁止角色扮演外的额外说明。
`;
}

function buildUserPrompt(action, detail = '') {
    const timeStr = getTimeSlotName(G.timeSlot);
    const pov = G.player.pov || 'second';
    let subject = '玩家';
    if (pov === 'first') subject = '我';
    else if (pov === 'third') subject = G.player.ytName || '她';

    let base = `第${G.day}天 ${timeStr}，${subject}选择「${action}」`;
    if (detail) base += `，具体内容：${detail}`;
    base += `。请结合上下文与历史天数进展生成详细剧情，不少于800字。`;
    return base;
}

function deriveSmartSearchQuery(userPrompt) {
    const p = G.player;
    const npcs = Object.values(G.npcs || {}).map(n => n.name);
    let query = `Minecraft ${p.category || '游戏'} 最新热点 玩法模组`;

    for (const name of npcs) {
        if (userPrompt.includes(name)) {
            query = `Minecraft 主播 ${name} 最新实况 视频玩法`;
            break;
        }
    }

    if (userPrompt.includes('追杀') || userPrompt.includes('速通') || userPrompt.includes('Manhunt')) {
        query = `Minecraft Manhunt 最新追杀技巧 陷阱反杀`;
    } else if (userPrompt.includes('红石') || userPrompt.includes('全自动')) {
        query = `Minecraft 最新红石黑科技 自动化农场设计`;
    } else if (userPrompt.includes('模组') || userPrompt.includes('mod') || userPrompt.includes('生存')) {
        query = `Minecraft 热门模组 2026 最新整合包玩法`;
    } else if (userPrompt.includes('Verity') || userPrompt.includes('ThatMob')) {
        query = `Minecraft ThatMob Verity 模组系列 最新进展`;
    }

    return query;
}

async function generateStory(tag, userPrompt, useSearch = false, replaceBlock = null, replaceHistoryId = null) {
    if (G.isGenerating) return;
    G.isGenerating = true;
    showLoading();
    try {
        let searchBlock = '';
        let searchNote = '';

        const searchActive = (useSearch || (G.search && G.search.enabled));
        const hasSearchKey = !!(G.search && (G.search.apiKey || (G.search.keys && Object.values(G.search.keys).some(k => !!k))));

        if (searchActive && hasSearchKey && typeof webSearch === 'function') {
            try {
                const query = deriveSmartSearchQuery(userPrompt);
                const currentProvider = G.search.provider || 'bocha';
                const providerName = currentProvider === 'bocha' ? '博查搜索' : currentProvider === 'metaso' ? '秘塔搜索' : 'Tavily';

                showToast(`🌐 ${providerName} 正在检索最新资料...`, 'info', 1200);

                const data = await webSearch(query, 3);
                const { text, titles } = formatSearchContext(data);
                if (text) {
                    searchBlock = `\n【搜索引擎实时资料（来自 ${providerName}，请将其作为背景灵感生动融入剧情中）】\n${text}\n`;
                    searchNote = `\n\n🌐 [实时检索自: ${providerName} · ${titles.slice(0, 2).join('、')}]`;
                }
            } catch (e) {
                console.warn('主动联网搜索暂未命中，继续正常生成:', e);
            }
        }

        let sys = buildSystemPrompt() + searchBlock;
        const user = buildUserPrompt(userPrompt, '');
        const messages = [{ role: 'system', content: sys }, { role: 'user', content: user }];
        const recentHistory = (G.storyHistory || []).filter(h => !h.archived && h._id !== replaceHistoryId).slice(-5);
        for (const h of recentHistory) {
            const pure = stripThought(h.text);
            messages.push({ role: 'assistant', content: pure.slice(0, 500) + '...' });
        }
        const response = await callAI(messages, { maxTokens: 10000, temperature: 0.85 });
        hideLoading();
        const truncated = isLikelyTruncated(response);
        const newText = response + searchNote;

        let createdEntry = null;

        if (!replaceBlock) {
            appendStory(newText, tag, { action: userPrompt, useSearch }, { truncated });
            createdEntry = G.storyHistory[G.storyHistory.length - 1];
        } else {
            const entry = (G.storyHistory || []).find(h => h._id === replaceHistoryId);
            if (entry) {
                entry.text = newText;
                entry.truncated = truncated;
                createdEntry = entry;
            }
            const content = replaceBlock.querySelector('.story-content');
            if (content) content.innerHTML = renderContentWithThoughts(newText);
            showToast('✅ 重说成功', 'success', 1500);
        }

        G._lastRegenerate = async () => {
            if (createdEntry) {
                const idx = G.storyHistory.findIndex(h => h._id === createdEntry._id);
                if (idx !== -1) G.storyHistory.splice(idx, 1);
                const block = dom.storyArea?.querySelector(`.story-block[data-story-id="${createdEntry._id}"]`) || document.querySelector(`.story-block[data-story-id="${createdEntry._id}"]`);
                if (block) block.remove();
            }
            showToast('🔄 正在重新生成剧情...', 'info', 1500);
            await generateStory(tag, userPrompt, useSearch);
        };

        extractThemes(stripThought(newText));
        maybeAutoSummarize();
    } catch (err) {
        hideLoading();
        console.error(err);
        showToast('❌ 生成失败，请检查网络或 API Key');
    } finally {
        G.isGenerating = false;
        updateUI();
        autoSaveGame();
    }
}

// ============================================================
// ✏️ 编辑与管理：全面支持所有 AI 生成文章与记忆净化
// ============================================================
function refreshStoryBlockDOM(entry) {
    const block = dom.storyArea ? dom.storyArea.querySelector(`.story-block[data-story-id="${entry._id}"]`) : document.querySelector(`.story-block[data-story-id="${entry._id}"]`);
    if (!block) return;
    const content = block.querySelector('.story-content');
    if (content) content.innerHTML = renderContentWithThoughts(entry.text);
}

function buildUnifiedAIEntryHTML(item) {
    const pureText = stripThought(item.text || '').trim();
    const preview = escapeHtml(pureText.slice(0, 65)) + (pureText.length > 65 ? '...' : '');

    return `
    <div class="edit-entry" data-id="${item._id}" data-type="${item._type}" data-bookid="${item._bookId || ''}" data-chapidx="${item._chapIdx !== undefined ? item._chapIdx : ''}" data-videoidx="${item._videoIdx !== undefined ? item._videoIdx : ''}" data-feedid="${item._feedId || ''}" data-npcid="${item._npcId || ''}" style="margin-bottom:8px;border:1px solid rgba(30,60,30,.12);border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
        <div class="edit-entry-header" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f8faf8;">
            <div style="flex:1;min-width:0;">
                <div style="font-size:12.5px;font-weight:700;color:var(--text);">${escapeHtml(item.title)}</div>
                <div class="edit-entry-preview" style="font-size:12px;color:#777;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${preview || '（无正文）'}</div>
            </div>
            <span class="chevron" style="margin-left:8px;color:#999;font-size:12px;">▼</span>
        </div>
        <div class="edit-entry-body" style="display:none;padding:10px 12px;border-top:1px solid rgba(30,60,30,.06);">
            <div style="font-size:11px;color:#888;margin-bottom:6px;">正文内容（支持多行长文修改）：</div>
            <textarea class="edit-textarea" style="width:100%;min-height:140px;padding:8px 10px;border-radius:8px;border:1.5px solid #cbd5e1;background:#fff;color:#1e293b;font-size:13px;font-family:inherit;line-height:1.6;resize:vertical;box-sizing:border-box;">${escapeHtml(pureText)}</textarea>
            <div class="btn-row" style="margin-top:8px;display:flex;gap:6px;justify-content:flex-end;">
                <button class="btn-secondary edit-del-btn" style="color:#e53935;border-color:#ffcdd2;background:#ffebee;padding:6px 12px;font-size:12px;margin-right:auto;">🗑️ 删除此条</button>
                <button class="btn-secondary edit-cancel-btn" style="padding:6px 12px;font-size:12px;">取消</button>
                <button class="btn-primary edit-save-btn" style="padding:6px 14px;font-size:12px;background:#16a34a;">💾 保存修改</button>
            </div>
        </div>
    </div>`;
}

function openEditContentModal(defaultTab = 'allAI') {
    const allAIItems = [];

    // 1. 主线剧情正文
    (G.storyHistory || []).forEach((s, idx) => {
        allAIItems.push({
            _id: s._id || ('story_' + idx),
            _type: 'story',
            title: `📖 剧情 · ${s.tag || '主线'} · 第${s.day}天 · ${getTimeSlotName(s.time)}`,
            text: s.text,
            order: s.day * 100 + (s.time || 0)
        });
    });

    // 2. AO3 同人文小说正文
    (G.fanworks || []).forEach(fw => {
        if (Array.isArray(fw.chapters) && fw.chapters.length) {
            fw.chapters.forEach((chap, cIdx) => {
                allAIItems.push({
                    _id: `fanwork_${fw.id}_chap_${cIdx}`,
                    _type: 'fanwork_chapter',
                    _bookId: fw.id,
                    _chapIdx: cIdx,
                    title: `🎨 AO3小说 · 《${fw.title}》 第${cIdx + 1}章`,
                    text: chap.content || chap.text || '',
                    order: 9999 + cIdx
                });
            });
        } else if (fw.summary || fw.desc) {
            allAIItems.push({
                _id: `fanwork_${fw.id}_desc`,
                _type: 'fanwork_desc',
                _bookId: fw.id,
                title: `🎨 AO3小说大纲 · 《${fw.title}》`,
                text: fw.summary || fw.desc || '',
                order: 9998
            });
        }
    });

    // 3. YouTube 视频脚本剧情
    (G.player?.videos || []).forEach((v, vIdx) => {
        if (v.desc || v.description) {
            allAIItems.push({
                _id: `yt_video_${vIdx}`,
                _type: 'video_desc',
                _videoIdx: vIdx,
                title: `🎬 YouTube视频文案 · 《${v.title}》`,
                text: v.desc || v.description || '',
                order: (v.day || 1) * 100
            });
        }
    });

    // 4. 朋友圈动态正文
    (G.feed || []).forEach(f => {
        allAIItems.push({
            _id: `feed_${f.id}`,
            _type: 'feed',
            _feedId: f.id,
            title: `🌟 朋友圈动态 · ${f.author} · ${f.time || ''}`,
            text: f.body || '',
            order: (f.day || 1) * 100
        });
    });

    // 5. 私聊对话
    for (const [npcId, msgs] of Object.entries(G.chatHistory || {})) {
        const npc = G.npcs[npcId];
        const name = npc ? npc.name : npcId;
        (msgs || []).forEach(m => {
            if (m.text && !m.sticker) {
                allAIItems.push({
                    _id: m._id,
                    _type: 'chat',
                    _npcId: npcId,
                    title: `💬 私信 · ${m.from === 'player' ? '🧑 ' + G.player.ytName : `🤖 ${name}`} · ${m.time || ''}`,
                    text: m.text,
                    order: 50
                });
            }
        });
    }

    allAIItems.sort((a, b) => b.order - a.order);

    const summaryEntries = [...(G.memorySummaries || [])].reverse();

    const html = `
    <h3 style="margin-bottom:10px;">✏️ 编辑与管理</h3>
    <div class="btn-row" style="margin-bottom:12px;">
        <button class="btn-secondary small" id="editTabAIBtn" style="flex:1;">🤖 AI 生成的内容/文章（<span id="aiContentCount">${allAIItems.length}</span>）</button>
        <button class="btn-secondary small" id="editTabSummaryBtn" style="flex:1;">🧠 统一记忆总结（<span id="summaryContentCount">${summaryEntries.length}</span>）</button>
    </div>
    <div id="editTabAI" style="max-height:58vh;overflow-y:auto;">
        ${allAIItems.length ? allAIItems.map(item => buildUnifiedAIEntryHTML(item)).join('') : '<p style="font-size:12px;color:#999;text-align:center;padding:20px;">暂无生成文章或记录</p>'}
    </div>
    <div id="editTabSummary" style="max-height:58vh;overflow-y:auto;display:none;">
        ${summaryEntries.length ? summaryEntries.map(e => {
            const sumId = e.id || e._id || (typeof e === 'string' ? e : 'sm_' + Math.random());
            const rawText = stripThought(e.text || e);
            return `
            <div class="edit-entry" data-id="${escapeHtml(sumId)}" data-type="summary" style="margin-bottom:8px;border:1px solid rgba(30,60,30,.12);border-radius:10px;background:#fff;overflow:hidden;">
                <div class="edit-entry-header" style="cursor:pointer;padding:10px 12px;background:#f8faf8;display:flex;justify-content:space-between;align-items:center;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:12.5px;font-weight:700;color:#166534;">🧠 全局长效记忆 · 游戏第 ${e.day || 1} 天</div>
                        <div class="edit-entry-preview" style="font-size:12px;color:#777;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(rawText.slice(0, 60))}...</div>
                    </div>
                    <span class="chevron" style="color:#999;font-size:12px;">▼</span>
                </div>
                <div class="edit-entry-body" style="display:none;padding:10px 12px;border-top:1px solid rgba(30,60,30,.06);">
                    <div style="font-size:11px;color:#888;margin-bottom:6px;">记忆正文（严格以上帝视角实体名记录）：</div>
                    <textarea class="edit-textarea" style="width:100%;min-height:110px;padding:8px;border-radius:8px;border:1.5px solid #cbd5e1;background:#fff;color:#1e293b;font-size:13px;font-family:inherit;line-height:1.6;resize:vertical;box-sizing:border-box;">${escapeHtml(rawText)}</textarea>
                    <div class="btn-row" style="margin-top:8px;display:flex;gap:6px;justify-content:flex-end;">
                        <button class="btn-secondary edit-del-btn" style="color:#e53935;border-color:#ffcdd2;background:#ffebee;padding:6px 12px;font-size:12px;margin-right:auto;">🗑️ 删除此条</button>
                        <button class="btn-secondary edit-cancel-btn" style="padding:6px 12px;font-size:12px;">取消</button>
                        <button class="btn-primary edit-save-btn" style="padding:6px 14px;font-size:12px;background:#16a34a;">💾 保存修改</button>
                    </div>
                </div>
            </div>
            `;
        }).join('') : '<p style="font-size:12px;color:#999;text-align:center;padding:20px;">暂无记忆总结</p>'}
    </div>
    <div class="btn-row" style="margin-top:12px;">
        <button class="btn-secondary" onclick="closeModal()">关闭</button>
    </div>
    `;
    openModal(html);

    const aiTab = document.getElementById('editTabAI');
    const summaryTab = document.getElementById('editTabSummary');
    const aiBtn = document.getElementById('editTabAIBtn');
    const summaryBtn = document.getElementById('editTabSummaryBtn');

    function switchView(tab) {
        aiTab.style.display = tab === 'allAI' ? 'block' : 'none';
        summaryTab.style.display = tab === 'summary' ? 'block' : 'none';
        aiBtn.style.opacity = tab === 'allAI' ? '1' : '.55';
        summaryBtn.style.opacity = tab === 'summary' ? '1' : '.55';
    }
    aiBtn.addEventListener('click', () => switchView('allAI'));
    summaryBtn.addEventListener('click', () => switchView('summary'));
    switchView(defaultTab);

    document.querySelectorAll('.edit-entry').forEach(el => {
        const header = el.querySelector('.edit-entry-header');
        const body = el.querySelector('.edit-entry-body');
        const chevron = el.querySelector('.chevron');

        header.addEventListener('click', () => {
            const isOpen = body.style.display !== 'none';
            body.style.display = isOpen ? 'none' : 'block';
            chevron.textContent = isOpen ? '▼' : '▲';
        });

        el.querySelector('.edit-cancel-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            body.style.display = 'none';
            chevron.textContent = '▼';
        });

        el.querySelector('.edit-del-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = el.dataset.id;
            const type = el.dataset.type;

            if (!confirm('确定要彻底删除这条记录吗？删除后将不可恢复。')) return;

            if (type === 'story') {
                const sIdx = (G.storyHistory || []).findIndex(h => h._id === id);
                if (sIdx !== -1) G.storyHistory.splice(sIdx, 1);
                const block = dom.storyArea?.querySelector(`.story-block[data-story-id="${id}"]`) || document.querySelector(`.story-block[data-story-id="${id}"]`);
                if (block) block.remove();
            } else if (type === 'fanwork_chapter') {
                const bId = el.dataset.bookid;
                const cIdx = parseInt(el.dataset.chapidx);
                const fw = (G.fanworks || []).find(f => String(f.id) === String(bId));
                if (fw && Array.isArray(fw.chapters) && fw.chapters[cIdx]) {
                    fw.chapters.splice(cIdx, 1);
                }
            } else if (type === 'fanwork_desc') {
                const bId = el.dataset.bookid;
                const fw = (G.fanworks || []).find(f => String(f.id) === String(bId));
                if (fw) { fw.summary = ''; fw.desc = ''; }
            } else if (type === 'video_desc') {
                const vIdx = parseInt(el.dataset.videoidx);
                if (G.player?.videos && G.player.videos[vIdx]) {
                    G.player.videos[vIdx].desc = '';
                    G.player.videos[vIdx].description = '';
                }
            } else if (type === 'feed') {
                const fId = parseInt(el.dataset.feedid);
                const fIdx = (G.feed || []).findIndex(f => f.id === fId);
                if (fIdx !== -1) G.feed.splice(fIdx, 1);
            } else if (type === 'chat') {
                const npcId = el.dataset.npcid;
                if (G.chatHistory && G.chatHistory[npcId]) {
                    const cIdx = G.chatHistory[npcId].findIndex(m => m._id === id);
                    if (cIdx !== -1) G.chatHistory[npcId].splice(cIdx, 1);
                    if (G.currentChatNpc === npcId && typeof renderSocialPanel === 'function') renderSocialPanel();
                }
            } else if (type === 'summary') {
                if (G.memorySummaries) {
                    const smIdx = G.memorySummaries.findIndex(m => (m.id || m._id) === id || m === id || m.text === id);
                    if (smIdx !== -1) G.memorySummaries.splice(smIdx, 1);
                }
            }

            el.remove();
            showToast('🗑️ 该条记录已成功删除', 'info', 1500);

            const curAiLeft = aiTab.querySelectorAll('.edit-entry').length;
            const curSumLeft = summaryTab.querySelectorAll('.edit-entry').length;
            const countEl = document.getElementById('aiContentCount');
            if (countEl) countEl.textContent = curAiLeft;
            const sumCountEl = document.getElementById('summaryContentCount');
            if (sumCountEl) sumCountEl.textContent = curSumLeft;

            if (curAiLeft === 0) aiTab.innerHTML = '<p style="font-size:12px;color:#999;text-align:center;padding:20px;">暂无生成记录</p>';
            if (curSumLeft === 0) summaryTab.innerHTML = '<p style="font-size:12px;color:#999;text-align:center;padding:20px;">暂无记忆总结</p>';

            autoSaveGame();
        });

        el.querySelector('.edit-save-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = el.dataset.id;
            const type = el.dataset.type;
            const newText = el.querySelector('.edit-textarea').value.trim();
            if (!newText) { showToast('⚠️ 内容不能为空', 'error', 1800); return; }

            if (type === 'story') {
                const entry = (G.storyHistory || []).find(h => h._id === id);
                if (entry) { entry.text = newText; refreshStoryBlockDOM(entry); }
            } else if (type === 'fanwork_chapter') {
                const bId = el.dataset.bookid;
                const cIdx = parseInt(el.dataset.chapidx);
                const fw = (G.fanworks || []).find(f => String(f.id) === String(bId));
                if (fw && Array.isArray(fw.chapters) && fw.chapters[cIdx]) {
                    if (typeof fw.chapters[cIdx] === 'string') fw.chapters[cIdx] = newText;
                    else fw.chapters[cIdx].content = newText;
                }
            } else if (type === 'fanwork_desc') {
                const bId = el.dataset.bookid;
                const fw = (G.fanworks || []).find(f => String(f.id) === String(bId));
                if (fw) { fw.summary = newText; fw.desc = newText; }
            } else if (type === 'video_desc') {
                const vIdx = parseInt(el.dataset.videoidx);
                if (G.player?.videos && G.player.videos[vIdx]) {
                    G.player.videos[vIdx].desc = newText;
                    G.player.videos[vIdx].description = newText;
                }
            } else if (type === 'feed') {
                const fId = parseInt(el.dataset.feedid);
                const item = (G.feed || []).find(f => f.id === fId);
                if (item) item.body = newText;
            } else if (type === 'chat') {
                const npcId = el.dataset.npcid;
                const msg = (G.chatHistory[npcId] || []).find(m => m._id === id);
                if (msg) {
                    msg.text = newText;
                    if (G.currentChatNpc === npcId && typeof renderSocialPanel === 'function') renderSocialPanel();
                }
            } else if (type === 'summary') {
                const sm = (G.memorySummaries || []).find(m => (m.id || m._id) === id || m === id || m.text === id);
                if (sm) {
                    if (typeof sm === 'string') {
                        const sIdx = G.memorySummaries.indexOf(sm);
                        G.memorySummaries[sIdx] = newText;
                    } else {
                        sm.text = newText;
                    }
                }
            }

            el.querySelector('.edit-entry-preview').textContent = newText.slice(0, 65) + (newText.length > 65 ? '...' : '');
            body.style.display = 'none';
            chevron.textContent = '▼';
            showToast('✅ 文章/内容已保存更新！', 'success', 1500);
            autoSaveGame();
        });
    });
}
$('editContentBtn')?.addEventListener('click', () => openEditContentModal('allAI'));

// ============================================================
// 🧠 剧情自动归档与检测（🌟 核心铁律：上帝视角、严格实体名、按日期精准分块）
// ============================================================
async function maybeAutoSummarize() {
    const s = G.memoryConfig || {};
    if (!s.enabled) return;
    const active = (G.storyHistory || []).filter(h => !h.archived);
    const threshold = s.defaultThreshold || 10;
    const keepRecent = s.defaultKeepRecent || 5;

    if (active.length < threshold || G._autoSummarizing) return;
    G._autoSummarizing = true;
    const pName = G.player.ytName || '主角';

    try {
        const toSummarize = active.slice(0, Math.max(0, active.length - keepRecent));
        if (!toSummarize.length) return;

        // 获取归档涉及的起始和结束天数
        const startDay = toSummarize[0]?.day || G.day;
        const endDay = toSummarize[toSummarize.length - 1]?.day || G.day;
        const daySpanLabel = (startDay === endDay) ? `第${startDay}天` : `第${startDay}~${endDay}天`;

        const priorSummaries = (G.memorySummaries || []).map(m => `[第${m.day||1}天]: ${stripThought(m.text || m)}`).join('\n');
        const combinedText = toSummarize.map(h => `[第${h.day}天 · ${getTimeSlotName(h.time)}] ${stripThought(h.text)}`).join('\n\n');

        const sys = `你是 MC 主播养成历史纪实归档系统。
【🌟 上帝视角纯实体全称铁律（最高优先级）】：
1. 你的总结必须使用【客观公正的第三人称上帝视角】！
2. 绝对严禁使用任何代词（严禁使用“我”、“你”、“他”、“她”、“它”、“二人”、“双方”）！
3. 主角的名字是「${pName}」！所有事件必须严格写出主角与各个NPC的具体名字！
   ❎ 绝对错误：“她和Dream联机，他救了她。”
   ❎ 绝对错误：“主角在末地击败了末影龙，随后他开播了。”
   ✔️ 绝对正确：“${pName} 与 Dream 联机，Dream 协助 ${pName} 击败了末影龙；随后 ${pName} 开启了直播。”
4. 请将此阶段（${daySpanLabel}）的剧情浓缩为精炼客观的总结（200字以内），保留核心游戏成就、重要人际进展与重大转折。直接输出正文。`;

        const userMsg = `${priorSummaries ? `【此前历史归档纪实】\n${priorSummaries}\n\n` : ''}【本阶段待归纳剧情（${daySpanLabel}）】\n${combinedText}`;

        const summaryText = await callMemoryAI([
            { role: 'system', content: sys },
            { role: 'user', content: userMsg },
        ], { maxTokens: 600, temperature: 0.35 });

        const cleanSummary = stripThought(summaryText.trim());
        if (cleanSummary) {
            if (!G.memorySummaries) G.memorySummaries = [];
            G.memorySummaries.push({
                id: 'gm_' + Date.now() + '_' + rand(100, 999),
                day: endDay,
                text: cleanSummary,
                time: new Date().toLocaleTimeString().slice(0, 5)
            });
        }

        const idsToArchive = new Set(toSummarize.map(h => h._id));
        G.storyHistory.forEach(h => {
            if (idsToArchive.has(h._id)) {
                h.archived = true;
                refreshStoryBlockDOM(h);
            }
        });
        showToast(`🧠 已将${daySpanLabel}的经历按实体全名归档入长效记忆库！`, 'info', 2200);
        autoSaveGame();
    } catch (e) {
        console.warn('剧情后台自动总结跳过:', e);
    } finally {
        G._autoSummarizing = false;
    }
}

$('memorySummaryBtn')?.addEventListener('click', () => {
    if (typeof openMemoryModal === 'function') openMemoryModal();
});
