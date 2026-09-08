// js/05-streaming.js
// 直播系统（收益随粉丝指数级增长、大主播查房互动、联网现实主播联动、下播主动加好友）
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
            💡 粉丝越多，热度与打赏收益呈指数飙升！开启直播有机会引来知名 MC 大主播查房空降，并主动加你好友！
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn-primary" id="startStreamBtn" style="flex:1;min-width:100px;padding:10px;">
                🎥 开启直播 (消耗2行动点)
            </button>
        </div>
    </div>
    <div style="background:var(--card);border-radius:var(--radius);padding:10px;box-shadow:var(--shadow);margin-top:8px;">
        <div style="font-weight:700;color:var(--text);margin-bottom:4px;">📺 往期直播高光记录</div>
        ${p.streamHistory && p.streamHistory.length > 0 ?
            p.streamHistory.slice(-4).reverse().map(s =>
                `<div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text2);padding:6px 0;border-bottom:1px solid rgba(30, 60, 30, 0.04);">
                    <div>
                        <div style="font-weight:700;color:var(--text);">${escapeHtml(s.title || '实况开播')}</div>
                        <span style="font-size:11px;color:#888;">第${s.day}天 · 👥 峰值 ${s.maxViewers || s.viewers || 0}</span>
                    </div>
                    <div style="text-align:right;">
                        <span style="color:#d84315;font-weight:700;">💰 +${s.moneyEarned || 0}</span>
                        <span style="color:#2e7d32;margin-left:6px;font-weight:700;">❤️ +${s.fansGained || 0}</span>
                    </div>
                </div>`
            ).join('') :
            '<div style="color:var(--text2);font-size:12px;padding:6px 0;">还没有直播记录，快开播吸引各路大神围观吧！</div>'
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
        // 好友度达 15 即可轻松连麦合作
        const disabled = (npc.favor||0) < 15 ? 'disabled' : '';
        npcOptions += `<option value="${id}" ${disabled}>${npc.name} (好感度${npc.favor||0}) ${disabled ? '🔒(需15好感)' : ''}</option>`;
    }
    const html = `
    <h3>🎬 直播设置</h3>
    <div class="form-group">
        <label>📝 直播标题</label>
        <input type="text" id="streamTitle" placeholder="起一个吸睛的高燃标题..." value="MC 极速挑战与高能整活">
    </div>
    <div class="form-group checkbox-group">
        <input type="checkbox" id="streamCollab">
        <label for="streamCollab">🤝 与好友连麦合作直播 (好感门槛大幅降低)</label>
    </div>
    <div class="form-group">
        <label>👥 选择连麦搭档</label>
        <select id="streamNpcSelect" disabled>
            ${npcOptions || '<option value="">暂无好友</option>'}
        </select>
    </div>
    <div class="form-group">
        <label>📖 直播主题与高光预设</label>
        <textarea id="streamDesc" rows="2" placeholder="描述这期直播的硬核挑战、沙雕整蛊或建筑目标...">极限无伤速通与末地下界大冒险</textarea>
    </div>
    <div class="btn-row">
        <button class="btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn-primary" id="confirmStreamStart">🚀 立即推流开播 (消耗2点)</button>
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
        const desc = document.getElementById('streamDesc').value.trim() || '日常实况';
        if (collab && !npcId) { showToast('请选择合作搭档', 'error'); return; }
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
    const multiplier = [1.0, 1.3, 1.8, 2.5, 3.8, 5.5][equipLevel] || 1.0;
    const followers = G.player.followers || 0;

    // 🌟 收益与热度随粉丝指数级跃升：粉丝越多，保底观众与基础盘越庞大
    let baseViewers = 0;
    if (followers < 1000) {
        baseViewers = rand(30, 80) + Math.floor(followers * 0.15);
    } else if (followers < 10000) {
        baseViewers = rand(200, 600) + Math.floor(followers * 0.25);
    } else if (followers < 100000) {
        baseViewers = rand(1500, 4500) + Math.floor(followers * 0.35);
    } else if (followers < 1000000) {
        baseViewers = rand(8000, 25000) + Math.floor(followers * 0.40);
    } else {
        baseViewers = rand(50000, 150000) + Math.floor(followers * 0.45);
    }

    baseViewers = Math.floor(baseViewers * multiplier);
    const viewers = Math.floor(baseViewers * (0.9 + Math.random() * 0.3));

    // 基础金币打赏更慷慨
    const baseMoney = Math.floor(viewers * 0.05) + rand(20, 60) + Math.floor(followers * 0.002);

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
        visitedStreamers: [], // 本场查房或空降的大主播
        equipmentMultiplier: multiplier,
        baseMoney: baseMoney,
    };
    G.currentStream = streamData;

    generateStreamOpening(streamData).then(() => {
        renderStreamActive(dom.streamContainer || document.getElementById('streamContainer'));
        showToast(`🎥 直播已开启！在线人气 ${viewers} 人，弹幕已就位！`, 'success', 2000);
        nextStreamRound();
        autoSaveGame();
    });
    addMemoir('开启直播', `标题：${title} (在线人气 ${viewers})`);
}

async function generateStreamOpening(streamData) {
    const p = G.player;
    const collabName = streamData.collabNpc ? streamData.collabNpc.name : '独自';
    const pov = p.pov || 'second';

    let povInstruction = '';
    let fallbackText = '';
    if (pov === 'first') {
        povInstruction = `全文必须严格使用【第一人称「我」】进行沉浸式主观叙事！禁止使用“你”。`;
        fallbackText = `我笑着轻触麦克风：“大家晚上好呀！欢迎来到我的直播间！今天我们要开播《${streamData.title}》，准备好一起见证高光时刻了吗？”`;
    } else if (pov === 'third') {
        povInstruction = `全文必须使用【第三人称「她」或主播名「${p.ytName}」】进行小说式叙述！禁止使用“你”或“我”。`;
        fallbackText = `少女调试着麦克风，软糯轻快的声音传入直播间：“大家晚上好！欢迎来到《${streamData.title}》的直播现场，准备好见证精彩瞬间了吗？”`;
    } else {
        povInstruction = `全文使用【第二人称「你」】进行代入感叙述。`;
        fallbackText = `你笑着调整麦克风：“观众们，欢迎来到我的直播间！今天我们要开始《${streamData.title}》，准备好见证精彩瞬间了吗？”`;
    }

    const voiceRule = p.voiceVoiceChanger 
        ? `（注意：主播在直播中开启了变声器伪装整蛊）` 
        : `（注意：主播为女生，声线清澈自然，神态生动灵巧）`;

    const prompt = `
    你正在直播 Minecraft，标题是"${streamData.title}"，主题是"${streamData.desc}"，${collabName === '独自' ? '独自开播' : '与 '+collabName+' 合作'}。
    主播设定：
    - 频道名：${p.ytName}
    - 线上虚拟形象（Live2D皮套）：${p.avatarLive2d || '精致定制Live2D皮套'}
    - 游戏内角色（MC像素皮肤）：${p.skin || '专属MC定制皮肤'}
    - 声线与特质：${voiceRule}
    - 皮上人设：${p.persona || '活泼可爱的MC主播'}

    ${povInstruction}
    请描写开播的生动开场（200字左右），体现直播间开启推流、Live2D虚拟形象在屏幕一角灵动眨眼、少女与观众弹幕轻快打招呼的画面感。称呼观众为“大家”或“观众们”。只输出正文。
    `;

    try {
        const reply = await callAI([{ role: 'system', content: '你是专业MC女主播模拟器叙事助手。' }, { role: 'user', content: prompt }], { maxTokens: 400, temperature: 0.8 });
        streamData.opening = reply;
        appendStory(`🔴 开启直播「${streamData.title}」\n\n${reply}`, '🔴 直播开场');
    } catch (e) {
        streamData.opening = fallbackText;
        appendStory(`🔴 开启直播「${streamData.title}」\n\n${streamData.opening}`, '🔴 直播开场');
    }
}

// 🌟 核心：AI 生成弹幕 + 查房大主播互动 + 联网圈内名人探查
async function generateDanmakuAI(st) {
    const followers = G.player.followers || 0;
    const isBigStream = followers >= 10000;

    // 查房潜入逻辑：高粉丝或概率触发大主播空降查房
    let raidStreamer = null;
    const officialList = (typeof OFFICIAL_NPCS !== 'undefined') ? Object.values(OFFICIAL_NPCS) : [];
    const npcCandidates = officialList.filter(n => n.name !== G.player.ytName && (!st.collabNpc || st.collabNpc.name !== n.name));

    // 联网状态下探查现实大主播
    let webTrendingInfo = '';
    if (typeof webSearch === 'function' && G.search && G.search.enabled && Math.random() < 0.6) {
        try {
            const searchKw = pick(['Minecraft popular YouTuber live stream moments', '我的世界 热门大主播 弹幕 查房', 'Minecraft YouTube trending speedrun']);
            const sData = await webSearch(searchKw, 2);
            if (sData && sData.results && sData.results.length) {
                webTrendingInfo = sData.results.map(r => r.title).join('、');
            }
        } catch (_) {}
    }

    // 触发大主播查房概率（随粉丝升高而升高）
    const raidChance = followers > 50000 ? 0.75 : followers > 10000 ? 0.5 : 0.35;
    if (npcCandidates.length && Math.random() < raidChance && (!st.visitedStreamers || st.visitedStreamers.length < 3)) {
        raidStreamer = pick(npcCandidates);
        if (!st.visitedStreamers) st.visitedStreamers = [];
        if (!st.visitedStreamers.includes(raidStreamer.name)) {
            st.visitedStreamers.push(raidStreamer.name);
        }
    }

    const raidPrompt = raidStreamer ? `
【🚨 重磅大主播空降查房】：
知名MC主播「${raidStreamer.name}」（${raidStreamer.persona}）潜入了直播间并被弹幕认了出来！
请务必包含：
1. 1~2 条属于「${raidStreamer.name}」本人的真实弹幕（带大主播身份标签，如夸奖主播操作、打赏高能礼物或调侃）；
2. 观众集体震惊沸腾的弹幕（例如：“卧槽？！是 ${raidStreamer.name} 本人？！”、“主播排面拉满了！”）。
` : '';

    const sys = `
你正在模拟主播「${G.player.ytName}」（粉丝量：${followers}）的 MC 直播间观众实时弹幕流。
当前直播：《${st.title}》（当前在线人气：${st.viewers}人，直播方向：${st.desc}）。
主播线上形象：${G.player.avatarLive2d || '精美Live2D皮套'}。
${webTrendingInfo ? `【圈内热点氛围参考】：${webTrendingInfo}` : ''}
${raidPrompt}

【要求】：
1. 生成 5 到 8 条生动的观众即时弹幕。
2. 粉丝基数大，弹幕中应包含高额投喂（如“投喂了火箭/潜影盒大礼包”）、红石硬核技术讨论、对主播Live2D神态的喜爱、以及催更后续。
3. 表情只允许标准 Emoji。
格式严格如下（每行一条）：
[DM user=观众昵称]弹幕内容[/DM]
    `;

    try {
        const raw = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '请生成本回合弹幕流。' }], { maxTokens: 400, temperature: 0.95 });
        const re = /\[DM\s+user=([^\]]+?)\]([\s\S]*?)\[\/DM\]/g;
        const danmaku = [];
        let m;
        while ((m = re.exec(raw)) !== null) {
            const u = m[1].trim();
            const text = stripThought(m[2].trim());
            const isStreamerMsg = raidStreamer && (u === raidStreamer.name || u.includes(raidStreamer.name));
            danmaku.push({
                user: u,
                text: text,
                type: isStreamerMsg ? 'streamer_raid' : 'viewer',
                time: Date.now()
            });
        }
        return danmaku.length ? danmaku : [
            { user: 'Minecrafter_' + rand(10, 99), text: '主播这波操作真的神了！', type: 'viewer', time: Date.now() },
            { user: '红石爱好者', text: '投喂了 5 个超级潜影盒！主播加油！', type: 'viewer', time: Date.now() }
        ];
    } catch (e) {
        return [
            { user: '热心观众', text: '人气越来越旺了，主播好厉害！', type: 'viewer', time: Date.now() },
            { user: 'MC老粉', text: '名场面打卡！', type: 'viewer', time: Date.now() }
        ];
    }
}

async function nextStreamRound() {
    const st = G.currentStream;
    if (!st || !st.isActive) return;
    st.round++;
    if (st.round > st.maxRounds) { endStream(); return; }

    const followers = G.player.followers || 0;
    const growthBase = Math.max(10, Math.floor(followers * 0.04));
    const change = rand(-10, growthBase);
    st.viewers = Math.max(50, st.viewers + change);
    if (st.viewers > st.maxViewers) st.maxViewers = st.viewers;

    // 弹幕全量由 AI 结合情境与查房动态实时生成
    const newDanmaku = await generateDanmakuAI(st);
    st.danmaku = st.danmaku.concat(newDanmaku);
    st.totalDanmaku += newDanmaku.length;

    // 粉丝越多，每回合打赏金币与粉丝涨幅越丰厚！
    const roundBonus = Math.floor(st.viewers * 0.035) + rand(15, 60) + Math.floor(followers * 0.001);
    const roundFans = rand(5, 30) + Math.floor(st.viewers * 0.008);

    st.moneyEarned += roundBonus;
    st.fansGained += roundFans;
    G.player.followers += roundFans;
    G.player.money += roundBonus;

    renderStreamActive(dom.streamContainer || document.getElementById('streamContainer'));
}

function renderStreamActive(container) {
    const st = G.currentStream;
    if (!st || !st.isActive) { renderStreamPanel(); return; }
    const recent = st.danmaku.slice(-35);
    let danmakuHtml = '';
    for (let i = 0; i < recent.length; i++) {
        const msg = recent[i];
        const isRaid = msg.type === 'streamer_raid';
        danmakuHtml += `
        <div class="msg ${msg.type === 'host' ? 'host' : 'viewer'}" style="${isRaid ? 'background:#fff3e0;border-left:3px solid #ff9800;padding:3px 6px;border-radius:4px;' : ''}">
            <span>
                <span class="name" style="${isRaid ? 'color:#e65100;font-weight:700;' : ''}">${isRaid ? '🌟 [认证主播] ' : ''}${escapeHtml(msg.user)}:</span>
                ${escapeHtml(msg.text)}
            </span>
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
            <span>👥 ${st.viewers} 在线人气</span>
            <span style="color:#d84315;font-weight:700;">💰 ${st.moneyEarned} 收益</span>
            <span style="color:#2e7d32;font-weight:700;">❤️ +${st.fansGained} 涨粉</span>
            <span>💬 ${st.totalDanmaku} 弹幕</span>
        </div>
        <div class="danmaku-area" id="danmakuArea">${danmakuHtml}</div>
        <div class="stream-text-area" id="streamTextArea">${logHtml}</div>
        <div style="font-size:13px;font-weight:600;color:var(--text);margin:4px 0 6px;">🎯 本回合互动 (剩余 ${st.maxRounds - st.round} 回合)</div>
        <div class="stream-actions">
            <button class="sbtn primary" id="streamReplyBtn">📢 热情答谢弹幕</button>
            <button class="sbtn" id="streamTaskBtn">🎁 承接高能打赏</button>
            <button class="sbtn" id="streamGameBtn">🎮 极限操作秀身手</button>
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
    const p = G.player;
    const pov = p.pov || 'second';

    let povInstruction = '';
    if (pov === 'first') {
        povInstruction = `全文必须严格使用【第一人称「我」】叙述，表达“我”在直播间的真实操作与心理！严禁使用“你”。`;
    } else if (pov === 'third') {
        povInstruction = `全文必须使用【第三人称「她」或频道名「${p.ytName}」】叙述，描写少女在直播间执行该动作。严禁使用“你”或“我”。`;
    } else {
        povInstruction = `全文使用【第二人称「你」】叙述主播的动作与直播间反馈。`;
    }

    try {
        showLoading();
        const sys = `你是 MC 女主播，正在进行 Minecraft 直播。
主播信息：频道「${p.ytName}」，Live2D皮套【${p.avatarLive2d || '精美Live2D皮套'}】，游戏像素皮【${p.skin || '专属MC皮肤'}】。
${p.voiceVoiceChanger ? '（使用了变声器伪装）' : '（少女天然声线）'}
这一轮选择了【${actName}】，内容："${userInput}"。
${povInstruction}
请写出 150 字生动的行动描述与直播间观众反馈弹幕的火爆场面。只输出正文。`;

        const reply = await callAI([{ role: 'system', content: sys }, { role: 'user', content: '请描述行动与反馈。' }], { maxTokens: 400, temperature: 0.8 });
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

// 🌟 直播圆满结算：结算超高收益，并触发空降大主播主动递交好友申请！
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

    // 🌟 核心高光：本场直播中前来查房的大主播，下播后立刻主动向玩家递交好友申请！
    let raidNoticeHtml = '';
    if (st.visitedStreamers && st.visitedStreamers.length > 0) {
        if (!G.friendRequests) G.friendRequests = [];
        const addedNames = [];

        st.visitedStreamers.forEach(sName => {
            const matchedOfficial = (typeof OFFICIAL_NPCS !== 'undefined') ? Object.values(OFFICIAL_NPCS).find(n => n.name === sName) : null;
            const notInFriends = !Object.values(G.npcs || {}).some(n => n.name === sName);
            const notInReqs = !G.friendRequests.some(r => r.name === sName);

            if (notInFriends && notInReqs) {
                G.friendRequests.push({
                    _id: 'freq_raid_' + Date.now() + '_' + rand(10, 99),
                    npcOfficialId: matchedOfficial ? matchedOfficial.id : null,
                    name: sName,
                    fromReason: `看了你《${st.title}》的高能直播，被惊艳到了`,
                    persona: matchedOfficial ? matchedOfficial.persona : '知名MC主播，对你充满兴趣',
                    avatarEmoji: matchedOfficial ? matchedOfficial.avatarEmoji : '🎮',
                    avatarUrl: matchedOfficial ? matchedOfficial.avatarUrl : null,
                    day: G.day
                });
                addedNames.push(sName);
            }
        });

        if (addedNames.length > 0) {
            raidNoticeHtml = `
            <div style="background:#e8f5e9;border:1.5px solid #81c784;border-radius:10px;padding:8px 12px;margin:10px 0;font-size:12.5px;color:#1b5e20;line-height:1.6;text-align:left;">
                🎉 <b>大主播主动加好友：</b><br>
                知名主播 <b>${escapeHtml(addedNames.join('、'))}</b> 在观看完直播后，主动在手机社交中心向你递来了好友申请！快去通过吧！
            </div>`;
            showToast(`📬 顶级主播 ${addedNames.join('、')} 主动向你发来好友申请！`, 'success', 3500);
            addGlobalMemoryRecord(`【直播突破】：${G.player.ytName} 直播人气爆棚，吸引知名主播 ${addedNames.join('、')} 主动添加好友。`);
        }
    }

    // 顺带触发常规社交热度提升
    if (typeof checkSocialRequestsTrigger === 'function') {
        checkSocialRequestsTrigger();
    }

    const container = dom.streamContainer || document.getElementById('streamContainer');
    if (container) {
        container.innerHTML = `
        <div class="stream-summary">
            <div class="title">🎉 直播圆满结束！</div>
            <div class="row"><span>最高在线人气</span><span>👥 ${st.maxViewers} 人</span></div>
            <div class="row"><span>本场打赏收益</span><span style="color:#d84315;font-weight:700;">💰 +${st.moneyEarned} 金币</span></div>
            <div class="row"><span>新收获粉丝</span><span style="color:#2e7d32;font-weight:700;">❤️ +${st.fansGained}</span></div>
            <div class="row"><span>总弹幕互动</span><span>💬 ${st.totalDanmaku} 条</span></div>
            ${raidNoticeHtml}
            <button class="btn-primary" style="margin-top:10px;width:100%;padding:10px;" onclick="G.currentStream=null;renderStreamPanel();updateUI();">✅ 确认并返回</button>
        </div>
        `;
    }
    autoSaveGame();
}
// ============================================================
