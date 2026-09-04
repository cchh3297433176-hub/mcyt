// 直播系统
// ============================================================
function renderStreamPanel() {
    const container = dom.streamContainer;
    if (G.currentStream && G.currentStream.isActive) {
        renderStreamActive(container);
        return;
    }
    const p = G.player;
    let html = `
    <div class="stream-container">
        <div class="stream-header">
            <span class="title">🔴 直播中心</span>
            <span class="badge">${p.followers} 粉丝</span>
        </div>
        <div style="color:var(--text2);font-size:13px;margin-bottom:8px;">
            💡 开启一场直播，与观众互动，展示你的技术！
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn-primary" id="startStreamBtn" style="flex:1;min-width:100px;padding:10px;">
                🎥 开启直播 (消耗2行动点)
            </button>
        </div>
    </div>
    <div style="background:var(--card);border-radius:var(--radius);padding:10px;box-shadow:var(--shadow);margin-top:8px;">
        <div style="font-weight:700;color:var(--text);margin-bottom:4px;">📺 往期直播</div>
        ${p.streamHistory && p.streamHistory.length > 0 ?
            p.streamHistory.slice(-3).reverse().map(s =>
                `<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);padding:4px 0;border-bottom:1px solid rgba(30, 60, 30, 0.04);">
                    <span>第${s.day}天</span>
                    <span>👥 ${s.maxViewers || s.viewers || 0}</span>
                    <span>💰 +${s.moneyEarned || 0}</span>
                    <span>❤️ +${s.fansGained || 0}</span>
                </div>`
            ).join('') :
            '<div style="color:var(--text2);font-size:12px;padding:6px 0;">还没有直播记录</div>'
        }
    </div>
    `;
    container.innerHTML = html;
    document.getElementById('startStreamBtn')?.addEventListener('click', openStreamSetupModal);
}

function openStreamSetupModal() {
    const npcs = Object.entries(G.npcs);
    let npcOptions = '';
    for (const [id, npc] of npcs) {
        const disabled = npc.favor < 30 ? 'disabled' : '';
        npcOptions += `<option value="${id}" ${disabled}>${npc.name} (好感度${npc.favor}) ${disabled ? '🔒' : ''}</option>`;
    }
    const html = `
    <h3>🎬 直播设置</h3>
    <p>填写直播信息，开启你的直播之旅。</p>
    <div class="form-group">
        <label>📝 直播标题</label>
        <input type="text" id="streamTitle" placeholder="输入标题..." value="MC 冒险直播">
    </div>
    <div class="form-group checkbox-group">
        <input type="checkbox" id="streamCollab">
        <label for="streamCollab">🤝 与NPC合作直播</label>
    </div>
    <div class="form-group">
        <label>👥 选择合作NPC</label>
        <select id="streamNpcSelect" disabled>
            ${npcOptions}
        </select>
    </div>
    <div class="form-group">
        <label>📖 直播内容/方向</label>
        <textarea id="streamDesc" rows="2" placeholder="描述本次直播的玩法或主题...">挑战末地龙</textarea>
    </div>
    <div class="btn-row">
        <button class="btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn-primary" id="confirmStreamStart">开始直播 (消耗2行动点)</button>
    </div>
    `;
    openModal(html);
    document.getElementById('streamCollab')?.addEventListener('change', function() {
        const sel = document.getElementById('streamNpcSelect');
        if (sel) sel.disabled = !this.checked;
    });
    document.getElementById('confirmStreamStart')?.addEventListener('click', function() {
        const title = document.getElementById('streamTitle').value.trim() || 'MC 直播';
        const collab = document.getElementById('streamCollab').checked;
        const npcId = document.getElementById('streamNpcSelect').value;
        const desc = document.getElementById('streamDesc').value.trim() || '日常直播';
        if (collab && !npcId) { showToast('请选择合作NPC', 'error'); return; }
        if (collab && G.npcs[npcId].favor < 30) { showToast('该NPC好感度不足30，无法合作', 'error'); return; }
        if (G.actionPoints < 2) { showToast('⚠️ 需要2个行动点', 'error'); return; }
        closeModal();
        startStream(title, collab ? npcId : null, desc);
    });
}

function startStream(title, collabNpcId, desc) {
    if (G.actionPoints < 2) { showToast('⚠️ 行动点不足', 'error'); return; }
    G.actionPoints -= 2;
    updateUI();
    const equipLevel = G.player.equipmentLevel || 1;
    const multiplier = [1.0, 1.2, 1.5, 2.0, 2.8, 4.0][equipLevel] || 1.0;
    const followers = G.player.followers || 0;
    const baseViewers = Math.max(30, Math.floor(followers * (0.08 + Math.random() * 0.12) * multiplier));
    const viewers = Math.floor(baseViewers * (0.85 + Math.random() * 0.30));
    const baseMoney = Math.floor(viewers * 0.02) + rand(5, 20);
    const streamData = {
        isActive: true,
        title: title,
        collabNpc: collabNpcId ? G.npcs[collabNpcId] : null,
        desc: desc,
        round: 0,
        maxRounds: 5,
        viewers: viewers,
        maxViewers: viewers,
        danmaku: [],
        moneyEarned: 0,
        fansGained: 0,
        totalDanmaku: 0,
        day: G.day,
        tasksCompleted: 0,
        gameActions: 0,
        replies: 0,
        log: [],
        opening: '',
        dreamEncountered: false,
        equipmentMultiplier: multiplier,
        baseMoney: baseMoney,
        taskBonus: 0,
    };
    G.currentStream = streamData;
    generateStreamOpening(streamData).then(() => {
        renderStreamActive(dom.streamContainer);
        showToast(`🎥 直播已开启！初始观众 ${viewers} 人，保底收益 ${baseMoney} 金币`, 'success', 2000);
        G._lastRegenerate = regenerateStreamOpening;
        nextStreamRound();
        autoSaveGame();
    });
    addMemoir('开启直播', `标题：${title}`);
}

function regenerateStreamOpening() {
    if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }
    const st = G.currentStream;
    if (!st) { showToast('暂无可重新生成的内容', 'error', 1800); return; }
    showLoading();
    generateStreamOpening(st).then(() => {
        hideLoading();
        renderStreamActive(dom.streamContainer);
        showToast('✅ 已重新生成开场白', 'success', 1500);
        G._lastRegenerate = regenerateStreamOpening;
        autoSaveGame();
    });
}

async function generateStreamOpening(streamData) {
    const p = G.player;
    const collabName = streamData.collabNpc ? streamData.collabNpc.name : '独自';
    const style = detectPersonaStyle(p.persona);
    let styleDesc = '', toneHint = '';
    if (style === 'introvert') {
        styleDesc = '你性格内向、害羞，声音轻柔，说话慢条斯理，有时会紧张。';
        toneHint = '使用温和、轻柔的语气，偶尔停顿，显得腼腆但真诚。称呼观众为"观众们"。';
    } else if (style === 'arrogant') {
        styleDesc = '你性格狂妄、自信张扬，说话直率有力，充满统治感。';
        toneHint = '使用自信、强势的语气，充满斗志和侵略性。称呼观众为"观众们"。';
    } else if (style === 'gentle') {
        styleDesc = '你性格温柔、温暖，说话柔和，让人感到舒适。';
        toneHint = '使用温柔、亲切的语气，像对朋友聊天一样。称呼观众为"观众们"。';
    } else if (style === 'humorous') {
        styleDesc = '你性格幽默、风趣，喜欢开玩笑，气氛轻松。';
        toneHint = '使用轻松、幽默的语气，时不时抛个梗。称呼观众为"观众们"。';
    } else if (style === 'extrovert') {
        styleDesc = '你性格外向、活泼，充满热情和能量。';
        toneHint = '使用热情、充满活力的语气，声音洪亮。称呼观众为"观众们"。';
    } else {
        styleDesc = '你性格中性，自然大方，根据场合调整语气。';
        toneHint = '使用自然、友好的语气，保持真诚。称呼观众为"观众们"。';
    }
    const prompt = `
    你正在直播MC，标题是"${streamData.title}"，内容方向是"${streamData.desc}"，${collabName === '独自' ? '独自直播' : '与 '+collabName+' 合作'}。
    玩家是一位女性主播，皮上形象是：${p.persona}。
    ${styleDesc}
    ${toneHint}
    请用第二人称"你"写一段300字左右的开场白，描述你开始直播的场景，包括观众反应和你的心情。
    重要：开场白中严禁使用"兄弟们"、"老铁们"等称呼，统一使用"观众们"。
    开场白要贴合玩家的性格风格，语气和用词要一致。
    输出纯文本，不要加任何额外标记。
    `;
    try {
        const reply = await callAI([{ role: 'system', content: '你是一个MC主播，用第二人称描述直播开场。' },
            { role: 'user', content: prompt }
        ], { maxTokens: 10000, temperature: 0.8 });
        streamData.opening = reply;
        // 【修改】：将直播开场写入全局剧情，便于编辑和回顾
        appendStory(`🔴 开启直播「${streamData.title}」\n\n${reply}`, '🔴 直播开场');
    } catch (e) {
        const fallbacks = {
            introvert: '你轻轻调整了麦克风，深吸一口气，声音轻柔地说："Hi，观众们，欢迎来到我的直播间......今天我们要玩的是，嗯，有点紧张，但还是想和大家一起探索这个模组......"',
            arrogant: '你自信地坐上主播台，对着镜头露出微笑："观众们，欢迎来到我的直播间！今天我要展示什么叫真正的技术，看我如何碾压这个挑战！"',
            gentle: '你温柔地对着镜头微笑，声音柔和："观众们好，欢迎来到我的频道。今天我们要一起做一些有趣的事情，希望大家能放松心情，享受这段时光。"',
            humorous: '你笑嘻嘻地打开直播，对着镜头做了个鬼脸："观众们好呀！今天我们来整点好玩的，准备好笑出腹肌了吗？"',
            extrovert: '你充满活力地跳上主播台，大声说："观众们！欢迎来到我的直播间！今天我们要搞个大新闻，准备好跟我一起疯狂了吗？"',
            neutral: '你自然地对着镜头微笑，语气友好："观众们好，欢迎来到我的直播间。今天我们要探索一些有趣的内容，希望大家看得开心。"'
        };
        streamData.opening = fallbacks[style] || fallbacks.neutral;
        appendStory(`🔴 开启直播「${streamData.title}」\n\n${streamData.opening}`, '🔴 直播开场');
    }
}

function nextStreamRound() {
    const st = G.currentStream;
    if (!st || !st.isActive) return;
    st.round++;
    if (st.round > st.maxRounds) { endStream(); return; }
    const change = rand(-20, 40);
    st.viewers = Math.max(30, st.viewers + change);
    if (st.viewers > st.maxViewers) st.maxViewers = st.viewers;
    if (!st.dreamEncountered && Math.random() < 0.06) {
        st.dreamEncountered = true;
        const heatGain = rand(50000, 100000);
        st.viewers += heatGain;
        st.maxViewers = Math.max(st.maxViewers, st.viewers);
        const npc = G.npcs.dream;
        if (npc) {
            const gain = rand(3, 6);
            npc.favor = Math.min(100, npc.favor + gain);
            G.player.metDream = true;
        }
        const dreamDanmaku = [
            "Wow, 这是Dream吗？", "Hey, 我是在Dream的直播间来的！", "Oh, Dream刚刚提到了这个主播！",
            "Yeah, 真的是Dream吗？", "Hmm, Dream的粉丝们集合！", "Alright, Dream在看这个直播！",
            "Nah, 这不是Dream吧？", "Cool, Dream的粉丝来了！", "Damn, Dream真会推荐！",
        ];
        const shuffledDream = dreamDanmaku.sort(() => Math.random() - 0.5);
        const selectedDream = shuffledDream.slice(0, 30);
        const newDanmaku = selectedDream.map(text => ({ user: 'DreamFan' + rand(1, 999), text: text,
            type: 'viewer', time: Date.now(), replied: false }));
        st.danmaku = st.danmaku.concat(newDanmaku);
        st.danmaku.sort(() => Math.random() - 0.5);
        st.totalDanmaku += newDanmaku.length;
        if (!st.log) st.log = [];
        st.log.push(`🌟 Dream 突然出现在你的直播间！观众瞬间增加 ${heatGain} 人！`);
        renderStreamActive(dom.streamContainer);
        showToast(`🌟 Dream 来到了你的直播间！热度暴涨！`, 'success', 3000);
        updateUI();
        if (document.querySelector('.tab-btn.active')?.dataset.tab === 'data') renderDataPanel();
        return;
    }
    const numDanmaku = Math.max(1, Math.floor(st.viewers * (0.05 + Math.random() * 0.10)));
    const shuffled = [...ALL_DANMAKU].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(numDanmaku, shuffled.length); i++) {
        const user = '观众' + rand(100, 999);
        const text = shuffled[i % shuffled.length];
        st.danmaku.push({ user, text, type: 'viewer', time: Date.now(), replied: false });
    }
    st.totalDanmaku += numDanmaku;
    const roundBonus = Math.floor(st.viewers * 0.015) + rand(2, 8);
    st.moneyEarned += roundBonus;
    st.fansGained += rand(1, 5);
    G.player.followers += rand(1, 5);
    G.player.money += roundBonus;
    renderStreamActive(dom.streamContainer);
}

function renderStreamActive(container) {
    const st = G.currentStream;
    if (!st || !st.isActive) { renderStreamPanel(); return; }
    const recent = st.danmaku.slice(-30);
    let danmakuHtml = '';
    for (let i = 0; i < recent.length; i++) {
        const msg = recent[i];
        const cls = msg.type === 'host' ? 'host' : 'viewer';
        danmakuHtml += `
        <div class="msg ${cls}">
            <span><span class="name">${msg.user}:</span> ${msg.text}</span>
        </div>
        `;
    }
    // 【修改】：使用思维链渲染函数折叠直播间内的长篇大论
    let logHtml = st.opening ? renderContentWithThoughts(st.opening) : '直播开始...';
    if (st.log && st.log.length > 0) {
        logHtml = st.log.map(l => renderContentWithThoughts(l)).join('<br><br>');
    }
    const totalEarned = st.moneyEarned || 0;
    const totalFans = st.fansGained || 0;
    let html = `
    <div class="stream-container">
        <div class="stream-header">
            <span class="title">🔴 ${st.title}</span>
            <span class="badge">回合 ${st.round}/${st.maxRounds}</span>
        </div>
        <div class="stream-stats">
            <span>👥 ${st.viewers} 观众</span>
            <span>💰 ${totalEarned} 金币</span>
            <span>❤️ +${totalFans} 粉丝</span>
            <span>💬 ${st.totalDanmaku} 弹幕</span>
            ${st.collabNpc ? `<span>🤝 与 ${st.collabNpc.name} 合作</span>` : ''}
        </div>
        <div class="danmaku-area" id="danmakuArea">${danmakuHtml || '<div style="color:var(--text2);text-align:center;padding:16px;">等待弹幕...</div>'}</div>
        <div class="stream-text-area" id="streamTextArea">${logHtml}</div>
        <div style="font-size:13px;font-weight:600;color:var(--text);margin:4px 0 6px;">🎯 选择本回合行动 (剩余回合 ${st.maxRounds - st.round})</div>
        <div class="stream-actions">
            <button class="sbtn primary" id="streamReplyBtn">📢 回复弹幕</button>
            <button class="sbtn" id="streamTaskBtn">🎁 接受打赏任务</button>
            <button class="sbtn" id="streamGameBtn">🎮 操作游戏</button>
        </div>
        <div id="streamActionFeedback" style="background:#f5faf5;border-radius:10px;padding:10px;margin-top:6px;font-size:13px;color:var(--text2);min-height:36px;">
            💡 点击按钮输入行动内容...
        </div>
    </div>
    `;
    container.innerHTML = html;
    document.getElementById('streamReplyBtn')?.addEventListener('click', () => openStreamActionModal('reply'));
    document.getElementById('streamTaskBtn')?.addEventListener('click', () => openStreamActionModal('task'));
    document.getElementById('streamGameBtn')?.addEventListener('click', () => openStreamActionModal('game'));
    const area = document.getElementById('danmakuArea');
    if (area) area.scrollTop = area.scrollHeight;
    const textArea = document.getElementById('streamTextArea');
    if (textArea) textArea.scrollTop = textArea.scrollHeight;
}

function openStreamActionModal(type) {
    const st = G.currentStream;
    if (!st || !st.isActive) { showToast('直播未进行', 'error'); return; }
    let label = '', placeholder = '', actionName = '';
    if (type === 'reply') { label = '📢 输入你要回复的弹幕内容';
        placeholder = '例如：感谢大家的支持！';
        actionName = '回复弹幕'; } else if (type === 'task') { label = '🎁 描述你如何执行打赏任务';
        placeholder = '例如：我决定在游戏中建造一座大型城堡...';
        actionName = '接受打赏任务'; } else if (type === 'game') { label = '🎮 描述你在游戏中的操作';
        placeholder = '例如：我进入下界，开始探索新的地形...';
        actionName = '操作游戏'; }
    const html = `
    <h3>${actionName}</h3>
    <p>${label}</p>
    <div class="form-group">
        <textarea id="streamActionInput" rows="3" placeholder="${placeholder}" style="width:100%;padding:8px;border-radius:8px;border:2px solid rgba(30, 60, 30, 0.10);background:#f5faf5;color:var(--text);font-size:13px;resize:vertical;font-family:inherit;"></textarea>
    </div>
    <div class="btn-row">
        <button class="btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn-primary" id="confirmStreamAction">确认执行</button>
    </div>
    `;
    openModal(html);
    document.getElementById('confirmStreamAction')?.addEventListener('click', function() {
        const text = document.getElementById('streamActionInput').value.trim();
        if (!text) { showToast('请输入内容', 'error'); return; }
        closeModal();
        executeStreamAction(type, text);
    });
}

function buildStreamActionPrompt(type, userInput) {
    if (type === 'reply') {
        return `你正在直播MC，你选择回复一条弹幕，你回复的内容是："${userInput}"。请用第二人称"你"描述你回复这条弹幕的场景，观众的反应，以及你的心情。生成至少150字的描述，并以完整的句子结尾。`;
    } else if (type === 'task') {
        return `你正在直播MC，你选择接受打赏任务，你执行的任务是："${userInput}"。请用第二人称"你"描述你执行这个任务的过程，观众的反应，以及获得的奖励。生成至少150字的描述，并以完整的句子结尾。`;
    } else if (type === 'game') {
        return `你正在直播MC，你选择进行游戏操作，你的操作是："${userInput}"。请用第二人称"你"描述你进行这个操作的过程，观众的反应，以及你的感受。生成至少150字的描述，并以完整的句子结尾。`;
    }
    return '';
}
function streamActionName(type) {
    return { reply: '回复弹幕', task: '打赏任务', game: '游戏操作' }[type] || '行动';
}
async function generateStreamActionText(type, userInput) {
    const prompt = buildStreamActionPrompt(type, userInput);
    return await callAI([
        { role: 'system', content: '你是一个MC主播，用第二人称描述直播中的行动。请务必写出完整的句子，不要在句中截断。' },
        { role: 'user', content: prompt }
    ], { maxTokens: 10000, temperature: 0.8 });
}

function renderStreamLog() {
    const st = G.currentStream;
    const textArea = document.getElementById('streamTextArea');
    // 【修改】：使用 innerHTML 并且通过思维链渲染函数折叠处理
    if (textArea && st) textArea.innerHTML = (st.log || []).map(l => renderContentWithThoughts(l)).join('<br><br>');
}

function renderStreamFeedback(actionName, truncated) {
    const feedback = document.getElementById('streamActionFeedback');
    if (!feedback) return;
    let html = `✅ ${actionName} 已执行！`;
    if (truncated) {
        html += ` <span style="color:#e65100;">⚠️ 内容可能被截断</span>`;
    }
    html += ` <button id="regenStreamLogBtn" style="margin-left:6px;padding:3px 10px;font-size:12px;font-weight:600;border:1px solid rgba(30,60,30,.15);border-radius:8px;background:#eaf5ea;color:var(--text);cursor:pointer;">🔄 重新生成描述</button>`;
    feedback.innerHTML = html;
    document.getElementById('regenStreamLogBtn')?.addEventListener('click', regenerateLastStreamLog);
}

async function regenerateLastStreamLog() {
    if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }
    if (!G._lastStreamActionParams) return;
    const st = G.currentStream;
    if (!st || !st.log || !st.log.length) return;
    const { type, userInput } = G._lastStreamActionParams;
    const btn = document.getElementById('regenStreamLogBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ 重新生成中...'; }
    try {
        const reply = await generateStreamActionText(type, userInput);
        const actionName = streamActionName(type);
        const truncated = isLikelyTruncated(reply);
        st.log[st.log.length - 1] = `📝 ${actionName}：${reply}`;
        
        // 【同步修改】：重新生成也写入全局剧情（作为新条目，避免覆盖困难）
        appendStory(`📺 直播中重新执行了 ${actionName}：\n${reply}`, `📺 ${actionName}`);

        renderStreamLog();
        renderStreamFeedback(actionName, truncated);
        showToast('✅ 已重新生成', 'success', 1500);
        autoSaveGame();
    } catch (e) {
        showToast('❌ 重新生成失败：' + e.message, 'error');
        console.error(e);
        if (btn) { btn.disabled = false; btn.textContent = '🔄 重新生成描述'; }
    }
}

async function executeStreamAction(type, userInput) {
    const st = G.currentStream;
    if (!st || !st.isActive) return;
    const p = G.player;
    const actionName = streamActionName(type);
    try {
        const reply = await generateStreamActionText(type, userInput);
        G._lastStreamActionParams = { type, userInput };
        if (!st.log) st.log = [];
        st.log.push(`📝 ${actionName}：${reply}`);
        
        // 【核心修改】：将直播互动推入全局历史记录，编辑界面即可查看/编辑！
        appendStory(`📺 直播互动 (${actionName})：\n${reply}`, `📺 ${actionName}`);

        renderStreamLog();
        renderStreamFeedback(actionName, isLikelyTruncated(reply));
        G._lastRegenerate = regenerateLastStreamLog;
        let gain = 0, moneyGain = 0;
        if (type === 'reply') {
            gain = rand(5, 15);
            st.fansGained += gain;
            p.followers += gain;
            p.likes += rand(2, 8);
            st.replies++;
        } else if (type === 'task') {
            gain = rand(10, 40);
            moneyGain = rand(20, 60) + Math.floor(st.viewers * 0.05);
            st.fansGained += gain;
            p.followers += gain;
            p.money += moneyGain;
            st.moneyEarned += moneyGain;
            st.tasksCompleted++;
            st.taskBonus = (st.taskBonus || 0) + moneyGain;
            const skillKeys = ['building', 'redstone', 'pvp', 'survival', 'hunting'];
            const sk = pick(skillKeys);
            p.skills[sk] = Math.min(100, (p.skills[sk] || 0) + rand(1, 3));
        } else if (type === 'game') {
            gain = rand(5, 20);
            moneyGain = rand(5, 15) + Math.floor(st.viewers * 0.01);
            st.fansGained += gain;
            p.followers += gain;
            p.money += moneyGain;
            st.moneyEarned += moneyGain;
            st.gameActions++;
            const skillKeys = ['building', 'redstone', 'pvp', 'survival', 'hunting'];
            const sk = pick(skillKeys);
            p.skills[sk] = Math.min(100, (p.skills[sk] || 0) + rand(1, 4));
        }
        updateUI();
        showToast(`✅ ${actionName} 完成！粉丝 +${gain}，金币 +${moneyGain}`, 'success', 2000);
        st.round++;
        autoSaveGame(); // 操作完成后即时存档
        if (st.round >= st.maxRounds) endStream();
        else nextStreamRound();
    } catch (e) {
        showToast('❌ 生成描述失败，请重试', 'error');
        console.error(e);
        G._lastStreamActionParams = { type, userInput };
        const feedback = document.getElementById('streamActionFeedback');
        if (feedback) {
            feedback.innerHTML = `❌ ${actionName} 生成失败 <button id="retryStreamActionBtn" style="margin-left:6px;padding:3px 10px;font-size:12px;font-weight:600;border:1px solid rgba(30,60,30,.15);border-radius:8px;background:#eaf5ea;color:var(--text);cursor:pointer;">🔄 重新生成</button>`;
            document.getElementById('retryStreamActionBtn')?.addEventListener('click', () => executeStreamAction(type, userInput));
        }
        G._lastRegenerate = () => executeStreamAction(type, userInput);
    }
}

function endStream() {
    const st = G.currentStream;
    if (!st) return;
    st.isActive = false;
    const p = G.player;
    const finalMoney = st.moneyEarned || 0;
    const finalFans = st.fansGained || 0;
    p.streamHistory.push({
        day: G.day,
        title: st.title,
        viewers: st.viewers,
        maxViewers: st.maxViewers,
        moneyEarned: finalMoney,
        fansGained: finalFans,
        totalDanmaku: st.totalDanmaku,
        rounds: st.round,
        collab: st.collabNpc ? st.collabNpc.name : null,
    });
    G.totalStreams++;
    const container = dom.streamContainer;
    let html = `
    <div class="stream-summary">
        <div class="title">🎉 直播结束！</div>
        <div class="row"><span>📅 第${G.day}天</span><span>${st.round} 回合</span></div>
        <div class="row"><span>👥 最高在线</span><span>${st.maxViewers} 人</span></div>
        <div class="row"><span>💰 本场收益</span><span>${finalMoney} 金币</span></div>
        <div class="row"><span>❤️ 粉丝增长</span><span>+${finalFans}</span></div>
        <div class="row"><span>💬 总弹幕</span><span>${st.totalDanmaku} 条</span></div>
        <div class="row"><span>📢 回复弹幕</span><span>${st.replies || 0} 次</span></div>
        <div class="row"><span>🎁 完成任务</span><span>${st.tasksCompleted || 0} 个</span></div>
        <div class="row"><span>🎮 游戏操作</span><span>${st.gameActions || 0} 次</span></div>
        ${st.collabNpc ? `<div class="row"><span>🤝 合作主播</span><span>${st.collabNpc.name}</span></div>` : ''}
        ${st.dreamEncountered ? `<div class="row"><span>🌟 Dream 到访</span><span>✅</span></div>` : ''}
        <button class="btn-primary" style="margin-top:10px;" id="closeStreamSummary">✅ 确认</button>
    </div>
    `;
    container.innerHTML = html;
    document.getElementById('closeStreamSummary')?.addEventListener('click', () => {
        G.currentStream = null;
        renderStreamPanel();
        updateUI();
        if (document.querySelector('.tab-btn.active')?.dataset.tab === 'data') renderDataPanel();
        checkAchievements();
    });
    showToast(`🎉 直播结束！获得 ${finalMoney} 金币，${finalFans} 粉丝`, 'success', 3000);
    updateUI();
    checkAchievements();
    autoSaveGame();
}
// ============================================================