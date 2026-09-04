        // 核心游戏函数
        // ============================================================
        function appendStory(text, tag = '📖 剧情', extra = {}, opts = {}) {
            const id = 'sb_' + (G._storyBlockId = (G._storyBlockId || 0) + 1);
            const block = document.createElement('div');
            block.className = 'story-block';
            block.dataset.storyId = id;
            const meta = document.createElement('div');
            meta.className = 'meta';
            const timeStr = `第${G.day}天 · ${getTimeSlotName(G.timeSlot)}`;
            meta.innerHTML = `<span>${timeStr}</span><span class="tag">${tag}</span>` +
                (opts.truncated ? `<span class="tag" style="background:#fff3e0;color:#e65100;">⚠️ 可能被截断</span>` : '');
            block.appendChild(meta);
            const content = document.createElement('div');
            content.className = 'story-content';
            // 采用思维链折叠渲染函数
            content.innerHTML = renderContentWithThoughts(text);
            block.appendChild(content);
            if (opts.onRegenerate) {
                const btnRow = document.createElement('div');
                btnRow.style.cssText = 'margin-top:8px;text-align:right;';
                const btn = document.createElement('button');
                btn.textContent = '🔄 重新生成';
                btn.style.cssText = 'padding:5px 12px;font-size:12px;font-weight:600;border:1px solid rgba(30,60,30,.15);border-radius:8px;background:#eaf5ea;color:var(--text);cursor:pointer;';
                btn.addEventListener('click', () => { btn.disabled = true; opts.onRegenerate(); });
                btnRow.appendChild(btn);
                block.appendChild(btnRow);
            }
            dom.storyArea.appendChild(block);
            dom.storyArea.scrollTop = dom.storyArea.scrollHeight;
            const historyEntry = { text, tag, day: G.day, time: G.timeSlot, truncated: !!opts.truncated, archived: false, _id: id, ...extra };
            G.storyHistory.push(historyEntry);
            extractThemes(stripThought(text));
            return { block, historyEntry };
        }

        // 统一的聊天消息写入函数：自动分配唯一 _id，供「编辑内容」功能读取/编辑每一轮私信回复
        function pushChat(npcId, msg) {
            if (!G.chatHistory[npcId]) G.chatHistory[npcId] = [];
            msg._id = 'chat_' + (G._chatMsgId = (G._chatMsgId || 0) + 1);
            G.chatHistory[npcId].push(msg);
            return msg;
        }
        function extractThemes(text) {
            const keywords = ['直播', '视频', '粉丝', '合作', '私信', '红石', '建筑', '生存', '追杀', '剧情', '休闲', '整活', '冒险', '探索',
                '战斗', '建造', '挖掘', '合成', '附魔', '下界', '末地', '村庄', '掠夺', '末影', '苦力怕', '僵尸', '骷髅', '蜘蛛',
                '岩浆', '水', '森林', '沙漠', '雪地', '丛林', '海洋', '洞穴', '矿山', '城堡', '农场', '牧场', '交易', '寻宝',
                '陷阱', '机关', '活塞', '粘液', '蜂蜜', '铁轨', '矿车', '船', '飞行', '药水', '附魔', '锻造', '钓鱼'
            ];
            for (const kw of keywords) { if (text.includes(kw)) G.usedThemes.add(kw); }
            if (G.usedThemes.size > 200) { const arr = Array.from(G.usedThemes);
                G.usedThemes = new Set(arr.slice(-150)); }
        }

        function showLoading() {
            const el = document.createElement('div');
            el.className = 'story-block loading-dots';
            el.id = 'loadingIndicator';
            el.innerHTML = `<span>●</span><span>●</span><span>●</span> <span style="margin-left:8px;">AI 正在编织剧情...</span>`;
            dom.storyArea.appendChild(el);
            dom.storyArea.scrollTop = dom.storyArea.scrollHeight;
        }

        function hideLoading() { const el = document.getElementById('loadingIndicator'); if (el) el.remove(); }

        function updateUI() {
            dom.dayDisplay.textContent = G.day;
            dom.timeDisplay.textContent = getTimeSlotName(G.timeSlot);
            dom.apDisplay.textContent = G.actionPoints;
            const dots = dom.apDots.querySelectorAll('.ap-dot');
            for (let i = 0; i < 6; i++) {
                dots[i].className = i < G.actionPoints ? 'ap-dot filled' : 'ap-dot spent';
            }
            let followerEl = document.querySelector('.follower-badge');
            if (!followerEl) {
                followerEl = document.createElement('span');
                followerEl.className = 'follower-badge';
                document.querySelector('.game-header .right').appendChild(followerEl);
            }
            followerEl.textContent = `❤️ ${G.player.followers}`;
            if (G.player.avatar) dom.headerAvatarImg.src = G.player.avatar;
            autoSaveGame();
        }

        function switchTab(tab) {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tab);
            });
            document.querySelectorAll('.tab-content').forEach(el => {
                const map = {
                    story: 'storyTab',
                    stream: 'streamTab',
                    dashboard: 'dashboardTab',
                    shop: 'shopTab',
                    social: 'socialTab',
                    data: 'dataTab',
                    memoir: 'memoirTab',
                    feed: 'feedTab',
                    achievements: 'achievementsTab'
                };
                el.classList.toggle('active', el.id === map[tab]);
            });
            if (tab === 'dashboard') renderDashboard();
            if (tab === 'data') renderDataPanel();
            if (tab === 'stream') renderStreamPanel();
            if (tab === 'social') renderSocialPanel();
            if (tab === 'shop') renderShop();
            if (tab === 'memoir') renderMemoir();
            if (tab === 'feed') renderFeed();
            if (tab === 'achievements') renderAchievements();
        }

        function closeModal() { dom.modal.classList.remove('open'); }
        dom.modalClose.addEventListener('click', closeModal);
        dom.modal.addEventListener('click', (e) => { if (e.target === dom.modal) closeModal(); });

        function openModal(html) { dom.modalBody.innerHTML = html;
            dom.modal.classList.add('open'); }
        // ============================================================
        // 每日视频自然增长
        // ============================================================
        function applyDailyVideoGrowth() {
            const videos = G.player.videos;
            if (videos.length === 0) return;
            const followers = G.player.followers;
            const baseFactor = 0.008;
            for (const v of videos) {
                const daysOld = G.day - v.day;
                let growth = followers * baseFactor * (1 / (daysOld + 1)) * (0.6 + Math.random() * 0.8);
                growth = Math.max(1, Math.floor(growth));
                growth += rand(0, 5);
                v.views = (v.views || 0) + growth;
                v.likes = (v.likes || 0) + Math.floor(growth * 0.02);
            }
        }
        // ============================================================
        // 时间推进 & 下一天
        // ============================================================
        function advanceDayFree() {
            G.day++;
            G.actionPoints = G.maxActionPoints;
            G.timeSlot = 0;
            applyDailyVideoGrowth();
            const dailyGain = rand(10, 50);
            G.player.followers += dailyGain;
            if (G.player.isStudent && G.day % 7 === 0) G.player.isVacation = !G.player.isVacation;
            showDailyBriefing();
            showToast(`📅 第 ${G.day} 天开始！行动点已恢复`, 'success');
            setTimeout(() => {
                const greeting = `新的一天！今天是第 ${G.day} 天，${G.player.isVacation ? '暑假中' : '学习日'}。你有 ${G.maxActionPoints} 个行动点。`;
                appendStory(greeting, '🌅 新的一天');
            }, 300);
            addMemoir('新的一天', `第${G.day}天开始`);
            updateUI();
            applyLongTailEffect();
            checkNPCInitiative();
            renderAllPanels();
            triggerNPCInitiatedMessage();
            checkDailyNPCConfession();
            checkMilestones();
            checkAchievements();
            generateSponsorOffer();
            generateFeedEvents();
            if (document.querySelector('.tab-btn.active')?.dataset.tab === 'feed') renderFeed();
            if (document.querySelector('.tab-btn.active')?.dataset.tab === 'achievements') renderAchievements();
            G._npcInitiatedToday = {};
        }

        function advanceTimeSlot() {
            if (G.actionPoints < 2) { showToast('⚠️ 需要2行动点推进时段', 'error'); return false; }
            G.actionPoints -= 2;
            G.timeSlot = (G.timeSlot + 1) % 3;
            if (G.timeSlot === 0) {
                G.day++;
                G.actionPoints = G.maxActionPoints;
                applyDailyVideoGrowth();
                const dailyGain = rand(10, 50);
                G.player.followers += dailyGain;
                if (G.player.isStudent && G.day % 7 === 0) G.player.isVacation = !G.player.isVacation;
                showDailyBriefing();
                showToast(`📅 第 ${G.day} 天开始！行动点已恢复`, 'success');
                setTimeout(() => {
                    const greeting = `新的一天！今天是第 ${G.day} 天，${G.player.isVacation ? '暑假中' : '学习日'}。你有 ${G.maxActionPoints} 个行动点。`;
                    appendStory(greeting, '🌅 新的一天');
                }, 300);
                addMemoir('新的一天', `第${G.day}天开始`);
                checkDailyNPCConfession();
                G._npcInitiatedToday = {};
            } else {
                showToast(`⏰ 进入 ${getTimeSlotName(G.timeSlot)}`, 'success');
                setTimeout(() => appendStory(`时间来到 ${getTimeSlotName(G.timeSlot)}。`, '⏰ 时段推进'), 200);
            }
            updateUI();
            applyLongTailEffect();
            checkNPCInitiative();
            renderAllPanels();
            triggerNPCInitiatedMessage();
            checkMilestones();
            checkAchievements();
            generateSponsorOffer();
            generateFeedEvents();
            if (document.querySelector('.tab-btn.active')?.dataset.tab === 'feed') renderFeed();
            if (document.querySelector('.tab-btn.active')?.dataset.tab === 'achievements') renderAchievements();
            return true;
        }

        function renderAllPanels() {
            const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
            if (activeTab === 'data') renderDataPanel();
            if (activeTab === 'dashboard') renderDashboard();
            if (activeTab === 'social') renderSocialPanel();
            if (activeTab === 'shop') renderShop();
            if (activeTab === 'memoir') renderMemoir();
            if (activeTab === 'stream') renderStreamPanel();
            if (activeTab === 'feed') renderFeed();
            if (activeTab === 'achievements') renderAchievements();
        }
        // ============================================================
        // 每日简报
        // ============================================================
        function showDailyBriefing() {
            if (!G._lastBriefing) {
                G._lastBriefing = {
                    followers: G.player.followers,
                    money: G.player.money,
                    likes: G.player.likes,
                    views: G.player.videos.reduce((s, v) => s + v.views, 0),
                };
            }
            const last = G._lastBriefing;
            const curr = {
                followers: G.player.followers,
                money: G.player.money,
                likes: G.player.likes,
                views: G.player.videos.reduce((s, v) => s + v.views, 0),
            };
            const delta = {
                followers: curr.followers - last.followers,
                money: curr.money - last.money,
                likes: curr.likes - last.likes,
                views: curr.views - last.views,
            };
            G._lastBriefing = { ...curr };
            let videoReports = '';
            const allVideos = G.player.videos;
            if (allVideos.length === 0) {
                videoReports = '还没有视频，快去发布吧！';
            } else {
                const sorted = [...allVideos].sort((a, b) => b.day - a.day);
                const displayVideos = sorted.slice(0, 10);
                videoReports = displayVideos.map((v, idx) => {
                    const prev = v._prevViews || 0;
                    const current = v.views || 0;
                    const change = current - prev;
                    v._prevViews = current;
                    return `「${v.title}」: ${change >= 0 ? '+' : ''}${change} 播放量`;
                }).join('\n');
                if (sorted.length > 10) {
                    videoReports += `\n... 还有 ${sorted.length - 10} 个视频`;
                }
            }
            const html = `
            <h3>📊 每日简报 - 第 ${G.day} 天</h3>
            <div style="margin: 10px 0;">
                <p><strong>粉丝：</strong>${delta.followers >= 0 ? '+' : ''}${delta.followers}</p>
                <p><strong>金币：</strong>${delta.money >= 0 ? '+' : ''}${delta.money}</p>
                <p><strong>点赞：</strong>${delta.likes >= 0 ? '+' : ''}${delta.likes}</p>
                <p><strong>总观看：</strong>${delta.views >= 0 ? '+' : ''}${delta.views}</p>
            </div>
            <div style="border-top:1px solid rgba(30, 60, 30, 0.1);padding-top:8px;">
                <p style="font-weight:600;">📹 视频播放量变化（最近10条）</p>
                <pre style="font-size:12px;color:var(--text2);white-space:pre-wrap;margin-top:4px;">${videoReports}</pre>
            </div>
            <div class="btn-row">
                <button class="btn-secondary" onclick="closeModal()">确认</button>
            </div>
            `;
            openModal(html);
        }
        // ============================================================
        // 长尾效应
        // ============================================================
        function applyLongTailEffect() {
            const videos = G.player.videos;
            for (let i = 0; i < videos.length; i++) {
                const v = videos[i];
                if (Math.random() < 0.05) {
                    const boost = rand(100, 800);
                    v.views = (v.views || 0) + boost;
                    appendStory(`📈 你的旧视频「${v.title}」被算法推荐，播放量突然增加了 ${boost}！`, '📈 长尾效应');
                    addMemoir('长尾效应', `「${v.title}」播放量 +${boost}`);
                    if (v.collection) updateCollectionStats(v.collection);
                }
            }
        }

        function updateCollectionStats(collectionName) {
            const col = G.collections[collectionName];
            if (!col) return;
            let totalViews = 0,
                totalLikes = 0,
                totalComments = 0;
            col.videos.forEach(idx => {
                const v = G.player.videos[idx];
                if (v) {
                    totalViews += v.views || 0;
                    totalLikes += v.likes || 0;
                    totalComments += (v.comments ? v.comments.length : 0);
                }
            });
            col.totalViews = totalViews;
            col.totalLikes = totalLikes;
            col.totalComments = totalComments;
            col.videoCount = col.videos.length;
        }
        // ============================================================
        // NPC 主动发消息（好感度 >= 50，调用API）
        // ============================================================
        function triggerNPCInitiatedMessage() {
            const today = G.day;
            for (const [id, npc] of Object.entries(G.npcs)) {
                if (G._npcInitiatedToday[id]) continue;
                let threshold = 50;
                if (id === 'whispy' && npc.favor >= 40) threshold = 40;
                if (npc.favor >= threshold && Math.random() < 0.25) {
                    G._npcInitiatedToday[id] = true;
                    generateNPCInitiatedMessage(id);
                    break;
                }
            }
        }

        async function generateNPCInitiatedMessage(npcId) {
            const npc = G.npcs[npcId];
            if (!npc) return;
            const history = G.chatHistory[npcId] || [];
            const recent = history.slice(-6).map(m =>
                `${m.from === 'player' ? '玩家' : npc.name}: ${stripThought(m.text)}`
            ).join('\n');
            const favor = npc.favor || 0;
            let tone = '';
            if (favor >= 80) tone = '语气暧昧、温柔，带有试探和喜欢，但保持克制，体现拉扯感。';
            else if (favor >= 60) tone = '语气亲切，偶尔流露好感，开始试探性，保持微妙距离。';
            else if (favor >= 40) tone = '语气友好，开始有点关心，但保持着朋友间的安全距离。';
            else tone = '语气友好，保持礼貌，偶尔带点幽默，但不会越界。';
            const sysPrompt = `
            你正在扮演MC主播 ${npc.name}，你的人设是：${npc.persona}。
            当前好感度：${favor}/100。
            你决定主动给玩家发一条消息，开启一段聊天。
            ${tone}
            回复要自然、符合人设，可以开启新话题或延续之前的聊天内容。
            严禁复读玩家之前说过的话。
            这是手机聊天，严禁使用括号或动作描写，只输出纯文本。
            长度 1-3 句。
            最近聊天记录（供参考）：${recent || '（无最近记录）'}
            只输出你的消息内容。
            `;
            try {
                const reply = await callAI([{ role: 'system', content: sysPrompt }, { role: 'user',
                        content: '给我发一条消息吧。' }], { maxTokens: 10000, temperature: 0.8 });
                const now = new Date();
                const timeStr = now.toLocaleTimeString();
                if (!G.chatHistory[npcId]) G.chatHistory[npcId] = [];
                pushChat(npcId, { from: 'npc', text: reply, time: timeStr });
                showToast(`💬 ${npc.name} 给你发了消息！`, 'success', 3000);
                addMemoir('NPC消息', `${npc.name} 发送了: ${stripThought(reply).slice(0, 30)}...`);
                if (document.querySelector('.tab-btn.active')?.dataset.tab === 'social') renderSocialPanel();
                addFeedItem({
                    author: npc.name,
                    avatar: npc.avatarEmoji || '👤',
                    body: stripThought(reply),
                    type: 'private',
                    npcId: npcId,
                    time: new Date().toLocaleString()
                });
                if (document.querySelector('.tab-btn.active')?.dataset.tab === 'feed') renderFeed();
            } catch (e) {
                console.error('NPC主动消息生成失败', e);
            }
        }
        // ============================================================
        // NPC 主动合作（好感度 >= 40）
        // ============================================================
        function checkNPCInitiative() {
            for (const [id, npc] of Object.entries(G.npcs)) {
                if (npc.favor >= 40 && Math.random() < 0.12) {
                    const action = pick(['collab', 'stream']);
                    const msg = `${npc.name} 主动联系你，想和你进行${action === 'collab' ? '合作视频' : '合作直播'}！`;
                    appendStory(msg, '🤝 合作邀请');
                    showToast(`🤝 ${npc.name} 邀请你${action === 'collab' ? '合作视频' : '合作直播'}！`, 'success', 3000);
                    addMemoir('合作邀请', `${npc.name} 邀请${action === 'collab' ? '合作视频' : '合作直播'}`);
                    const now = new Date();
                    pushChat(id, { from: 'npc', text: `Hey, 想和你一起${action === 'collab' ? '拍个合作视频' : '开个合作直播'}，有空吗？`,
                        time: now.toLocaleTimeString() });
                    break;
                }
            }
        }
        // ============================================================
        // 每日NPC告白检测（好感度 >= 80）
        // ============================================================
        function checkDailyNPCConfession() {
            if (G.timeSlot !== 0) return;
            const dayKey = `day_${G.day}`;
            if (G._npcDailyConfession && G._npcDailyConfession[dayKey]) return;
            if (!G._npcDailyConfession) G._npcDailyConfession = {};
            for (const [id, npc] of Object.entries(G.npcs)) {
                if (G.player.lovers.includes(npc.name)) continue;
                if (npc.favor >= 80 && Math.random() < 0.8) {
                    G._npcDailyConfession[dayKey] = true;
                    triggerNpcConfession(id);
                    break;
                }
            }
        }

        async function triggerNpcConfession(npcId) {
            const npc = G.npcs[npcId];
            if (!npc) return;
            if (G.player.lovers.includes(npc.name)) return;
            if (npc.favor < 80) return;
            const history = G.chatHistory[npcId] || [];
            const recent = history.slice(-8).map(m => `${m.from === 'player' ? '玩家' : npc.name}: ${stripThought(m.text)}`).join('\n');
            const sysPrompt = `
            你正在扮演MC主播 ${npc.name}，你的人设是：${npc.persona}。
            当前好感度：${npc.favor}/100。
            你一直对玩家有好感，现在你决定在清晨主动向她告白。
            请根据你的人设、最近聊天记录生成一段 3-5 句的告白消息。
            告白要真诚、自然，符合你的性格和好感度。
            可以引用一些你们之间的共同回忆或聊天细节。
            这是手机聊天，严禁使用括号或动作描写，只输出纯文本。严禁复读。
            最近聊天记录：${recent || '（无最近记录）'}
            只输出告白内容，不要加任何额外标记。
            `;
            try {
                const reply = await callAI([{ role: 'system', content: sysPrompt }, { role: 'user',
                        content: '请向我告白吧。' }], { maxTokens: 10000, temperature: 0.85 });
                const now = new Date();
                const timeStr = now.toLocaleTimeString();
                if (!G.chatHistory[npcId]) G.chatHistory[npcId] = [];
                pushChat(npcId, { from: 'npc', text: reply, time: timeStr });
                showToast(`💕 ${npc.name} 向你告白了！`, 'success', 5000);
                appendStory(`💕 ${npc.name} 在清晨给你发来了一条告白消息：\n"${reply}"`, '💕 告白');
                G.confessionState = { npcId: npcId, step: 'waiting' };
                switchTab('social');
                openChat(npcId);
                renderSocialPanel();
                addMemoir('NPC告白', `${npc.name} 主动告白`);
            } catch (e) {
                console.error('NPC告白生成失败', e);
            }
        }
        // ============================================================
        // 处理告白回复
        // ============================================================
        async function handleConfessionReply(npcId, playerReply) {
            const npc = G.npcs[npcId];
            if (!npc) return;
            if (!G.confessionState || G.confessionState.npcId !== npcId || G.confessionState.step !== 'waiting') return;
            G.confessionState = null;
            const accepted = playerReply.includes('好') || playerReply.includes('愿意') || playerReply.includes('可以') ||
                playerReply.includes('接受') || playerReply.includes('答应') || playerReply.includes('我也喜欢你') ||
                playerReply.includes('在一起') || playerReply.includes('yes') || playerReply.includes('同意');
            if (accepted) {
                if (!G.player.lovers.includes(npc.name)) {
                    G.player.lovers.push(npc.name);
                    npc._relationship = 'dating';
                    addMemoir('接受告白', `接受了 ${npc.name} 的告白，成为恋人`);
                    showToast(`💕 你与 ${npc.name} 成为了恋人！`, 'success', 3000);
                    appendStory(`💕 你接受了 ${npc.name} 的告白！你们成为了恋人。`, '💕 告白成功');
                    checkAchievements();
                }
            } else {
                showToast(`💔 你婉拒了 ${npc.name} 的告白`, 'error', 3000);
                appendStory(`💔 你婉拒了 ${npc.name} 的告白。`, '💔 告白失败');
                npc.favor = Math.max(0, npc.favor - 10);
            }
            if (!G.chatHistory[npcId]) G.chatHistory[npcId] = [];
            const now = new Date();
            pushChat(npcId, { from: 'player', text: playerReply, time: now.toLocaleTimeString() });
            try {
                const sysPrompt = `
                你正在扮演 ${npc.name}，玩家刚刚回复了你的告白。
                玩家回复：${playerReply}
                请根据你的人设，生成一句简短的回应（1-2句），表达你的感受。
                如果玩家接受了，表达开心和珍惜；如果婉拒了，表达理解和失落，但保持风度。
                这是手机聊天，严禁使用括号或动作描写，只输出纯文本。严禁复读。
                `;
                const reply = await callAI([{ role: 'system', content: sysPrompt }, { role: 'user',
                        content: playerReply }], { maxTokens: 10000, temperature: 0.8 });
                if (!G.chatHistory[npcId]) G.chatHistory[npcId] = [];
                pushChat(npcId, { from: 'npc', text: reply, time: now.toLocaleTimeString() });
            } catch (e) {
                const fallback = accepted ? '太好了...我会好好珍惜你的。' : '嗯...我明白了，没关系。';
                if (!G.chatHistory[npcId]) G.chatHistory[npcId] = [];
                pushChat(npcId, { from: 'npc', text: fallback, time: now.toLocaleTimeString() });
            }
            if (G.currentChatNpc === npcId) renderSocialPanel();
            updateUI();
            renderAllPanels();
        }
        // ============================================================
        // 玩家告白
        // ============================================================
        async function playerConfess(npcId) {
            const npc = G.npcs[npcId];
            if (!npc) return;
            if (G.player.lovers.includes(npc.name)) { showToast('你们已经是恋人了！', 'error', 2000); return; }
            if (npc.favor < 60) { showToast(`好感度不足60，无法表白 (当前${npc.favor})`, 'error', 2000); return; }
            const html = `
            <h3>💕 向 ${npc.name} 表白</h3>
            <p>写下你想对 ${npc.name} 说的话：</p>
            <div class="form-group">
                <textarea id="confessionInput" rows="4" placeholder="例如：我喜欢你很久了，你愿意和我在一起吗？" style="width:100%;padding:8px;border-radius:8px;border:2px solid rgba(30, 60, 30, 0.10);background:#f5faf5;color:var(--text);font-size:13px;resize:vertical;font-family:inherit;"></textarea>
            </div>
            <div class="btn-row">
                <button class="btn-secondary" onclick="closeModal()">取消</button>
                <button class="btn-primary" id="confirmConfession">💕 表白</button>
            </div>
            `;
            openModal(html);
            document.getElementById('confirmConfession').addEventListener('click', async function() {
                const text = document.getElementById('confessionInput').value.trim();
                if (!text) { showToast('请写下你的告白内容', 'error'); return; }
                closeModal();
                await processPlayerConfession(npcId, text);
            });
        }

        async function processPlayerConfession(npcId, confessionText) {
            const npc = G.npcs[npcId];
            if (!npc) return;
            if (G.player.lovers.includes(npc.name)) { showToast('你们已经是恋人了！', 'error', 2000); return; }
            const history = G.chatHistory[npcId] || [];
            const recent = history.slice(-6).map(m => `${m.from === 'player' ? '玩家' : npc.name}: ${stripThought(m.text)}`).join('\n');
            const favor = npc.favor || 0;
            const sysPrompt = `
            你正在扮演MC主播 ${npc.name}，你的人设是：${npc.persona}。
            当前好感度：${favor}/100。
            玩家刚刚向你表白了，表白内容是："${confessionText}"
            请根据你的人设、好感度和最近聊天记录，给出你的回应。
            如果好感度 >= 80，你大概率会接受（80%概率），但也可以拒绝或犹豫。
            如果好感度在 60-79，你可能会犹豫、惊喜或婉拒。
            回应要真实、自然，符合你的性格。
            长度 2-4 句，语气符合好感度分段。
            如果接受，请明确表达愿意在一起；如果拒绝，请温柔但坚定地表达。
            这是手机聊天，严禁使用括号或动作描写，只输出纯文本。严禁复读玩家的话。
            最近聊天记录（供参考）：${recent || '（无最近记录）'}
            只输出你的回应，不要加任何额外标记。
            `;
            try {
                const reply = await callAI([{ role: 'system', content: sysPrompt }, { role: 'user',
                        content: confessionText }], { maxTokens: 10000, temperature: 0.85 });
                const now = new Date();
                const timeStr = now.toLocaleTimeString();
                if (!G.chatHistory[npcId]) G.chatHistory[npcId] = [];
                pushChat(npcId, { from: 'npc', text: reply, time: timeStr });
                const pureReply = stripThought(reply);
                const accepted = pureReply.includes('接受') || pureReply.includes('愿意') || pureReply.includes('好') ||
                    pureReply.includes('可以') || pureReply.includes('答应') || pureReply.includes('我也喜欢你') ||
                    pureReply.includes('在一起') || pureReply.includes('I do') || pureReply.includes('yes') ||
                    (favor >= 80 && Math.random() < 0.8);
                if (accepted) {
                    if (!G.player.lovers.includes(npc.name)) {
                        G.player.lovers.push(npc.name);
                        npc._relationship = 'dating';
                        addMemoir('告白成功', `与 ${npc.name} 成为恋人`);
                        showToast(`💕 你与 ${npc.name} 成为了恋人！`, 'success', 3000);
                        appendStory(`💕 你向 ${npc.name} 告白，TA接受了！你们成为了恋人。`, '💕 告白成功');
                        checkAchievements();
                    }
                } else {
                    showToast(`💔 ${npc.name} 没有接受你的告白...`, 'error', 3000);
                    appendStory(`💔 你向 ${npc.name} 告白，但TA婉拒了。`, '💔 告白失败');
                }
                if (G.currentChatNpc === npcId) renderSocialPanel();
                updateUI();
                renderAllPanels();
            } catch (e) {
                console.error('告白处理失败', e);
                showToast('告白处理失败，请重试', 'error');
            }
        }
        // ============================================================
        // 动态系统 (Feed)
        // ============================================================
        function addFeedItem(data) {
            const item = {
                id: G.feedIdCounter++,
                day: G.day,
                time: data.time || new Date().toLocaleString(),
                author: data.author || '系统',
                avatar: data.avatar || '📰',
                body: data.body || '',
                type: data.type || 'public',
                npcId: data.npcId || null,
                likes: 0,
                liked: false,
                comments: [],
                public: data.type === 'public',
            };
            G.feed.push(item);
            if (G.feed.length > 200) G.feed = G.feed.slice(-200);
        }

        function generateFeedEvents() {
            if (G.day % 2 !== 0 && G.day % 3 !== 0) return;
            const npcs = Object.values(G.npcs);
            const npc = pick(npcs);
            if (npc && Math.random() < 0.6) {
                const msgs = [
                    `${npc.name} 刚刚发布了一个新视频：「${pick(['末地大冒险', '红石黑科技', '生存挑战', '建筑大师', '恐怖模组实况'])}」！`,
                    `${npc.name} 正在直播中，快来围观！`,
                    `${npc.name} 在动态中分享了一张有趣的MC截图。`,
                    `${npc.name} 发起了「${pick(['建筑大赛', '红石挑战', 'PvP锦标赛', '生存马拉松'])}」活动！`,
                    `${npc.name} 表示最近在筹备一个大项目，敬请期待！`,
                ];
                const body = pick(msgs);
                addFeedItem({
                    author: npc.name,
                    avatar: npc.avatarEmoji || '👤',
                    body: body,
                    type: 'public',
                    npcId: npc.id,
                });
            }
            if (G.player.videos.length > 0 && Math.random() < 0.4) {
                const v = pick(G.player.videos);
                const msgs = [
                    `粉丝们正在热议你的视频「${v.title}」！`,
                    `「${v.title}」获得了 ${rand(100, 500)} 个新点赞！`,
                    `有粉丝在动态中分享了你的视频「${v.title}」并配文：太棒了！`,
                    `「${v.title}」被推荐到了热门首页！`,
                ];
                addFeedItem({
                    author: '系统',
                    avatar: '📢',
                    body: pick(msgs),
                    type: 'public',
                });
            }
            for (const [id, npc] of Object.entries(G.npcs)) {
                if (npc.favor >= 20 && Math.random() < 0.15) {
                    const privateMsgs = [
                        `${npc.name} 发了一条仅好友可见的动态：今天心情不错，想找人一起玩MC。`,
                        `${npc.name} 悄悄说：最近在做一个秘密项目，暂时不能透露更多。`,
                        `${npc.name} 分享了一张自己的MC皮肤截图，配文：新造型怎么样？`,
                        `${npc.name} 在动态中提到了你：和 @${G.player.ytName} 的联动很愉快！`,
                        `${npc.name} 发了一条动态：今天天气真好，适合挖矿。`,
                    ];
                    const body = pick(privateMsgs);
                    addFeedItem({
                        author: npc.name,
                        avatar: npc.avatarEmoji || '👤',
                        body: body,
                        type: 'private',
                        npcId: npc.id,
                    });
                }
            }
        }

        function renderFeed() {
            const container = dom.feedTab;
            let html = `
            <div style="font-weight:700;font-size:17px;margin-bottom:10px;">📰 动态</div>
            <div class="feed-tabs">
                <button class="active" data-feed-tab="all">🌐 全部</button>
                <button data-feed-tab="public">📢 公共</button>
                <button data-feed-tab="private">🔒 私人</button>
            </div>
            <div id="feedList">
            `;
            const feedItems = [...G.feed].reverse();
            if (feedItems.length === 0) {
                html += `<div style="text-align:center;color:var(--text2);padding:30px 0;">还没有动态，多和NPC互动吧！</div>`;
            } else {
                for (const item of feedItems) {
                    const isPrivate = item.type === 'private';
                    const badge = isPrivate ? `<span class="feed-private-badge">🔒 仅好友可见</span>` : '';
                    const isLiked = item.liked ? 'liked' : '';
                    const likeCount = item.likes || 0;
                    const commentCount = item.comments ? item.comments.length : 0;
                    html += `
                    <div class="feed-item" data-feed-id="${item.id}">
                        <div class="feed-header">
                            <div class="feed-avatar">${item.avatar}</div>
                            <span class="feed-author">${item.author}</span>
                            ${badge}
                            <span class="feed-time">${item.time}</span>
                        </div>
                        <div class="feed-body">${item.body}</div>
                        <div class="feed-actions">
                            <button class="feed-like-btn ${isLiked}" data-id="${item.id}">${isLiked ? '❤️' : '🤍'} ${likeCount}</button>
                            <button class="feed-comment-toggle" data-id="${item.id}">💬 ${commentCount}</button>
                        </div>
                        <div class="feed-comments" id="feedComments-${item.id}">
                            ${item.comments ? item.comments.map(c =>
                                `<div class="feed-comment-item"><span class="fc-user">${c.user}:</span> ${c.text}</div>`
                            ).join('') : ''}
                            <div class="feed-comment-input-wrap">
                                <input type="text" placeholder="写评论..." class="feed-comment-input" data-id="${item.id}">
                                <button class="feed-comment-send" data-id="${item.id}">发送</button>
                            </div>
                        </div>
                    </div>
                    `;
                }
            }
            html += `</div>`;
            container.innerHTML = html;
            container.querySelectorAll('.feed-tabs button').forEach(btn => {
                btn.addEventListener('click', function() {
                    container.querySelectorAll('.feed-tabs button').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    const tab = this.dataset.feedTab;
                    const items = container.querySelectorAll('.feed-item');
                    items.forEach(el => {
                        const isPrivate = el.querySelector('.feed-private-badge') !== null;
                        if (tab === 'all') el.style.display = 'block';
                        else if (tab === 'public') el.style.display = isPrivate ? 'none' : 'block';
                        else if (tab === 'private') el.style.display = isPrivate ? 'block' : 'none';
                    });
                });
            });
            container.querySelectorAll('.feed-like-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    const item = G.feed.find(f => f.id === id);
                    if (!item) return;
                    item.liked = !item.liked;
                    item.likes += item.liked ? 1 : -1;
                    renderFeed();
                });
            });
            container.querySelectorAll('.feed-comment-toggle').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    const el = document.getElementById(`feedComments-${id}`);
                    if (el) el.classList.toggle('open');
                });
            });
            container.querySelectorAll('.feed-comment-send').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = parseInt(this.dataset.id);
                    const input = document.querySelector(`.feed-comment-input[data-id="${id}"]`);
                    if (!input) return;
                    const text = input.value.trim();
                    if (!text) return;
                    const item = G.feed.find(f => f.id === id);
                    if (!item) return;
                    if (!item.comments) item.comments = [];
                    item.comments.push({ user: G.player.ytName, text: text });
                    input.value = '';
                    renderFeed();
                    G.player.followers += rand(1, 3);
                    updateUI();
                    showToast('✅ 评论发布成功！', 'success', 1500);
                });
            });
            container.querySelectorAll('.feed-comment-input').forEach(inp => {
                inp.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        const btn = document.querySelector(`.feed-comment-send[data-id="${this.dataset.id}"]`);
                        if (btn) btn.click();
                    }
                });
            });
        }
        // ============================================================
        // 粉丝里程碑
        // ============================================================
        function checkMilestones() {
            const followers = G.player.followers;
            for (const ms of MILESTONES) {
                if (followers >= ms.value && !G.milestoneReached.includes(ms.value)) {
                    G.milestoneReached.push(ms.value);
                    triggerMilestone(ms);
                }
            }
        }

        function triggerMilestone(ms) {
            const html = `
            <div class="milestone-popup">
                <span class="big-icon">${ms.icon}</span>
                <div class="title">🎉 粉丝里程碑达成！</div>
                <div class="sub">你的粉丝数达到了 ${ms.label}！</div>
                <div style="margin-top:8px;font-size:14px;">继续加油，下一个里程碑：${getNextMilestone()}</div>
            </div>
            `;
            appendStory(`🎉 粉丝里程碑达成！你达到了 ${ms.label}！`, '🏆 里程碑');
            addMemoir('里程碑', `粉丝达到 ${ms.label}`);
            showToast(`🎉 粉丝达到 ${ms.label}！`, 'success', 4000);
            const bonus = Math.floor(ms.value * 0.001);
            G.player.money += bonus;
            appendStory(`💰 获得里程碑奖励 ${bonus} 金币！`, '💰 奖励');
            if (ms.value >= 1000000) {
                setTimeout(() => {
                    appendStory(`📜 平台官方发来认证通知：恭喜你成为百万粉创作者！你的账号已获得官方认证标识。`,
                    '🏅 官方认证');
                    showToast('🏅 获得平台官方认证！', 'success', 4000);
                    addMemoir('官方认证', '获得平台百万粉认证');
                }, 500);
            }
            for (const [id, npc] of Object.entries(G.npcs)) {
                if (npc.favor >= 60 && Math.random() < 0.7) {
                    setTimeout(() => {
                        const msg =
                            `${npc.name} 在动态中提及了你：恭喜 @${G.player.ytName} 达成 ${ms.label} 里程碑！`;
                        appendStory(`💬 ${msg}`, '📣 NPC提及');
                        addFeedItem({
                            author: npc.name,
                            avatar: npc.avatarEmoji || '👤',
                            body: msg,
                            type: 'public',
                            npcId: npc.id,
                        });
                        if (document.querySelector('.tab-btn.active')?.dataset.tab === 'feed') renderFeed();
                        npc.favor = Math.min(100, npc.favor + rand(2, 5));
                    }, 1000 + rand(0, 2000));
                    break;
                }
            }
            if (Math.random() < 0.6) {
                setTimeout(() => {
                    const msg = `🎊 粉丝们自发组织了庆祝活动，为你制作了应援视频和同人图！`;
                    appendStory(msg, '🎊 粉丝庆祝');
                    addFeedItem({
                        author: '粉丝团',
                        avatar: '🎊',
                        body: msg,
                        type: 'public',
                    });
                    if (document.querySelector('.tab-btn.active')?.dataset.tab === 'feed') renderFeed();
                }, 2000);
            }
            checkAchievements();
        }

        function getNextMilestone() {
            const followers = G.player.followers;
            for (const ms of MILESTONES) {
                if (followers < ms.value) return ms.label;
            }
            return '已达成所有里程碑！';
        }
        // ============================================================