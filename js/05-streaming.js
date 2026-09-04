// 直播系统（弹幕由 AI 实时生成）
// ============================================================
function renderStreamPanel() {
    const container = (dom && dom.streamContainer) || document.getElementById('streamContainer');
    if (!container) return;
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
            💡 开启一场直播，弹幕将由 AI 根据当场气氛实时互动生成！
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
        const disabled = (npc.favor||0) < 30 ? 'disabled' : '';
        npcOptions += `<option value="${id}" ${disabled}>${npc.name} (好感度${npc.favor||0}) ${disabled ? '🔒' : ''}</option>`;
    }
    const html = `
    <h3>🎬 直播设置</h3>
    <div class="form-group">
        <label>📝 直播标题</label>
        <input type="text" id="streamTitle" placeholder="输入标题..." value="MC 极速挑战">
    </div>
    <div class="form-group checkbox-group">
        <input type="checkbox" id="streamCollab">
        <label for="streamCollab">🤝 与角色合作直播</label>
    </div>
    <div class="form-group">
        <label>👥 选择合作角色</label>
        <select id="streamNpcSelect" disabled>
            ${npcOptions}
        </select>
    </div>
    <div class="form-group">
        <label>📖 直播主题/玩法描述</label>
        <textarea id="streamDesc" rows="2" placeholder="描述直播内容...">挑战极限生存与探险</textarea>
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
    };
    G.currentStream = streamData;
    generateStreamOpening(streamData).then(() => {
        renderStreamActive(dom.streamContainer || document.getElementById('streamContainer'));
        showToast(`🎥 直播已开启！观众 ${viewers} 人`, 'success', 2000);
        nextStreamRound();
        autoSaveGame();
    });
    addMemoir('开启直播', `标题：${title}`);
}

async function generateStreamOpening(streamData) {
    const p = G.player;
    const collabName = streamData.collabNpc ? streamData.collabNpc.name : '独自';
    const prompt = `
    你正在直播MC，标题是"${streamData.title}"，主题是"${streamData.desc}"，${collabName === '独自' ? '独自开播' : '与 '+collabName+' 合作'}。
    女主播皮上人设：${p.persona}。
    请用第二人称"你"写一段200字左右生动的直播开场白，称呼观众为"观众们"。只输出文本。
    `;
    try {
        const reply = await callAI([{ role: 'system', content: '你是MC女主播，描述直播开场。' }, { role: 'user', content: prompt }], { maxTokens: 400, temperature: 0.8 });
        streamData.opening = reply;
        appendStory(`🔴 开启直播「${streamData.title}」\n\n${reply}`, '🔴 直播开场');
    } catch (e) {
        streamData.opening = `你笑着调整麦克风：“观众们，欢迎来到我的直播间！今天我们要开始《${streamData.title}》，准备好见证精彩瞬间了吗？”`;
        appendStory(`🔴 开启直播「${streamData.title}」\n\n${streamData.opening}`, '🔴 直播开场');
    }
}

// 🌟 核心：AI 根据本回合直播事件实时生成观众弹幕
async function generateDanmakuAI(st) {
    const sys = `
    你正在模拟主播「${G.player.ytName}」的 MC 直播间观众实时弹幕。
    当前直播：《${st.title}》（方向：${st.desc}，当前在线：${st.viewers}人）。
    请生成 4 到 7 条生动的观众即时弹幕，包括提问、催主播操作、刷梗、应援等。
    格式必须严格如下（每行一条）：
    [DM user=观众昵称]弹幕内容[/DM]
    `;
    try {
        const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '请生成弹幕。' }], { maxTokens: 250, temperature: 0.95 });
        const re = /\[DM\s+user=([^\]]+?)\]([\s\S]*?)\[\/DM\]/g;
        const danmaku = [];
        let m;
        while ((m = re.exec(raw)) !== null) {
            danmaku.push({ user: m[1].trim(), text: stripThought(m[2].trim()), type: 'viewer', time: Date.now() });
        }
        return danmaku.length ? danmaku : [
            { user: '观众' + rand(100, 999), text: '主播这波操作学到了！', type: 'viewer', time: Date.now() },
            { user: 'MC玩家' + rand(10, 99), text: '前方高能注意！', type: 'viewer', time: Date.now() }
        ];
    } catch (e) {
        return [
            { user: '热心观众' + rand(100, 999), text: '主播今天状态真好！', type: 'viewer', time: Date.now() },
            { user: '红石爱好者', text: '这个思路确实可以！', type: 'viewer', time: Date.now() }
        ];
    }
}

async function nextStreamRound() {
    const st = G.currentStream;
    if (!st || !st.isActive) return;
    st.round++;
    if (st.round > st.maxRounds) { endStream(); return; }

    const change = rand(-10, 30);
    st.viewers = Math.max(30, st.viewers + change);
    if (st.viewers > st.maxViewers) st.maxViewers = st.viewers;

    // 🌟 弹幕全量由 AI 结合情境实时生成
    const newDanmaku = await generateDanmakuAI(st);
    st.danmaku = st.danmaku.concat(newDanmaku);
    st.totalDanmaku += newDanmaku.length;

    const roundBonus = Math.floor(st.viewers * 0.015) + rand(2, 8);
    st.moneyEarned += roundBonus;
    st.fansGained += rand(1, 5);
    G.player.followers += rand(1, 5);
    G.player.money += roundBonus;
    renderStreamActive(dom.streamContainer || document.getElementById('streamContainer'));
}

function renderStreamActive(container) {
    const st = G.currentStream;
    if (!st || !st.isActive) { renderStreamPanel(); return; }
    const recent = st.danmaku.slice(-30);
    let danmakuHtml = '';
    for (let i = 0; i < recent.length; i++) {
        const msg = recent[i];
        danmakuHtml += `
        <div class="msg ${msg.type === 'host' ? 'host' : 'viewer'}">
            <span><span class="name">${escapeHtml(msg.user)}:</span> ${escapeHtml(msg.text)}</span>
        </div>`;
    }

    let logHtml = st.opening ? renderContentWithThoughts(st.opening) : '直播开始...';
    if (st.log && st.log.length > 0) {
        logHtml = st.log.map(l => renderContentWithThoughts(l)).join('<br><br>');
    }

    const html = `
    <div class="stream-container">
        <div class="stream-header">
            <span class="title">🔴 ${escapeHtml(st.title)}</span>
            <span class="badge">回合 ${st.round}/${st.maxRounds}</span>
        </div>
        <div class="stream-stats">
            <span>👥 ${st.viewers} 观众</span>
            <span>💰 ${st.moneyEarned} 金币</span>
            <span>❤️ +${st.fansGained} 粉丝</span>
            <span>💬 ${st.totalDanmaku} 弹幕</span>
        </div>
        <div class="danmaku-area" id="danmakuArea">${danmakuHtml}</div>
        <div class="stream-text-area" id="streamTextArea">${logHtml}</div>
        <div style="font-size:13px;font-weight:600;color:var(--text);margin:4px 0 6px;">🎯 本回合行动 (剩余 ${st.maxRounds - st.round} 回合)</div>
        <div class="stream-actions">
            <button class="sbtn primary" id="streamReplyBtn">📢 回复弹幕</button>
            <button class="sbtn" id="streamTaskBtn">🎁 接受打赏任务</button>
            <button class="sbtn" id="streamGameBtn">🎮 操作游戏</button>
        </div>
    </div>
    `;
    container.innerHTML = html;
    document.getElementById('streamReplyBtn')?.addEventListener('click', () => openStreamActionModal('reply'));
    document.getElementById('streamTaskBtn')?.addEventListener('click', () => openStreamActionModal('task'));
    document.getElementById('streamGameBtn')?.addEventListener('click', () => openStreamActionModal('game'));
    const area = document.getElementById('danmakuArea');
    if (area) area.scrollTop = area.scrollHeight;
}

function openStreamActionModal(type) {
    const st = G.currentStream;
    if (!st || !st.isActive) return;
    const names = { reply: '回复弹幕', task: '打赏任务', game: '游戏操作' };
    openModal(`
        <h3>${names[type]}</h3>
        <div class="form-group">
            <textarea id="streamActionInput" rows="3" placeholder="输入你要执行的行动或说的话..." style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;font-size:13px;font-family:inherit;"></textarea>
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="confirmStreamAction">确认执行</button>
        </div>
    `);
    document.getElementById('confirmStreamAction')?.addEventListener('click', async () => {
        const text = document.getElementById('streamActionInput').value.trim();
        if (!text) return;
        closeModal();
        await executeStreamAction(type, text);
    });
}

async function executeStreamAction(type, userInput) {
    const st = G.currentStream;
    if (!st || !st.isActive) return;
    const names = { reply: '回复弹幕', task: '打赏任务', game: '游戏操作' };
    const actName = names[type] || '行动';
    try {
        showLoading();
        const sys = `你是 MC 女主播，正在直播。你在这一轮选择了【${actName}】，内容："${userInput}"。请用第二人称"你"写出 150 字生动的行动描述与观众反馈。只输出文本。`;
        const reply = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '请描述行动。' }], { maxTokens: 400, temperature: 0.8 });
        hideLoading();
        if (!st.log) st.log = [];
        st.log.push(`📝 ${actName}：${reply}`);
        appendStory(`📺 直播互动 (${actName})：\n${reply}`, `📺 ${actName}`);
        showToast(`✅ ${actName} 已执行`, 'success');
        nextStreamRound();
        autoSaveGame();
    } catch (e) {
        hideLoading();
        showToast('❌ 执行失败，请检查网络');
    }
}

function endStream() {
    const st = G.currentStream;
    if (!st) return;
    st.isActive = false;
    G.player.streamHistory.push({
        day: G.day,
        title: st.title,
        viewers: st.viewers,
        maxViewers: st.maxViewers,
        moneyEarned: st.moneyEarned,
        fansGained: st.fansGained,
        totalDanmaku: st.totalDanmaku,
    });
    G.totalStreams++;
    const container = dom.streamContainer || document.getElementById('streamContainer');
    if (container) {
        container.innerHTML = `
        <div class="stream-summary">
            <div class="title">🎉 直播圆满结束！</div>
            <div class="row"><span>最高在线</span><span>${st.maxViewers} 人</span></div>
            <div class="row"><span>本场收益</span><span>💰 ${st.moneyEarned} 金币</span></div>
            <div class="row"><span>粉丝增长</span><span>❤️ +${st.fansGained}</span></div>
            <div class="row"><span>总弹幕互动</span><span>💬 ${st.totalDanmaku} 条</span></div>
            <button class="btn-primary" style="margin-top:10px;" onclick="G.currentStream=null;renderStreamPanel();updateUI();">✅ 确认并返回</button>
        </div>
        `;
    }
    autoSaveGame();
}
// ============================================================