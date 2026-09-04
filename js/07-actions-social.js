        // 行动处理
        // ============================================================
        async function performAction(action, detail = '', useSearch = false) {
            if (G.isGenerating) { showToast('⏳ 正在生成剧情...'); return; }
            if (action === 'next') { advanceDayFree(); return; }
            if (action !== 'video' && G.actionPoints < 2) { showToast('⚠️ 行动点不足，需要2点推进时段', 'error'); return; }
            if (action !== 'video') G.actionPoints -= 2;
            switch (action) {
                case 'stream':
                    switchTab('stream');
                    showToast('📺 切换到直播页面', 'success', 1500);
                    break;
                case 'video':
                    openVideoModal();
                    return;
                case 'dm':
                    await handleDM(detail, useSearch);
                    break;
                case 'friend':
                    await handleFriend(detail, useSearch);
                    break;
                case 'collab':
                    await handleCollab(detail, useSearch);
                    break;
                case 'fanclub':
                    await handleFanClub(detail, useSearch);
                    break;
                case 'fanart':
                    await handleFanArt(detail, useSearch);
                    break;
                case 'comment':
                    await handleComment(detail, useSearch);
                    break;
                case 'sub':
                    await handleSubAction(detail, useSearch);
                    break;
                default:
                    await generateStory('🎮 行动', `玩家选择了「${action}」${detail ? '：'+detail : ''}`, useSearch);
            }
            if (action !== 'video') {
                advanceTimeSlot();
            }
            renderAllPanels();
            updateUI();
            checkAchievements();
        }

        async function handleDM(detail, useSearch = false) {
            await generateStory('💬 私信', `玩家查看了私信并回复粉丝，${detail || '与粉丝亲切交流'}`, useSearch);
            G.totalDMs++;
            G.player.followers += rand(10, 80);
            G.player.likes += rand(5, 20);
            updateUI();
            addMemoir('私信互动', '回复粉丝私信');
        }

        async function handleFriend(detail, useSearch = false) {
            await generateStory('🤝 交友', `玩家尝试与新的 MC 主播交友，${detail || '互相交流心得'}`, useSearch);
            const names = ['Dreamy', 'TechnoBlade', 'Grian', 'MumboJumbo', 'Scar', 'Pearl', 'Impulse', 'Tango', 'Zedaph',
                'Stress', 'Doc', 'Ren', 'Martyn', 'BigB', 'Cleo', 'Joe', 'Xisuma', 'Keralis', 'Beef', 'Etho'
            ];
            const name = pick(names);
            if (!G.player.friends.includes(name)) {
                G.player.friends.push(name);
                showToast(`🎉 与 ${name} 成为好友！`, 'success');
                addMemoir('结交好友', `与 ${name} 成为好友`);
                checkAchievements();
            } else showToast(`💬 与 ${name} 的关系更好了`, 'success');
            updateUI();
        }

        async function handleCollab(detail, useSearch = false) {
            const availableNPCs = Object.values(G.npcs).filter(n => n.favor >= 40);
            let npc = null;
            if (availableNPCs.length > 0) npc = pick(availableNPCs);
            let extra = 0;
            if (npc) {
                const skills = npc.skills || { building: 0, redstone: 0, pvp: 0, survival: 0, hunting: 0 };
                const avg = (skills.building + skills.redstone + skills.pvp + skills.survival + skills.hunting) / 5;
                extra = Math.floor(avg * 10);
                for (const sk of ['building', 'redstone', 'pvp', 'survival', 'hunting']) {
                    G.player.skills[sk] = Math.min(100, (G.player.skills[sk] || 0) + rand(1, 2));
                }
                addMemoir('合作视频', `与 ${npc.name} 合作，收益加成 ${extra}`);
            }
            await generateStory('🤜 合作视频', `玩家与${npc ? npc.name : '好友'}合作拍摄了一期视频，${detail || '强强联合，效果炸裂'}`, useSearch);
            G.totalCollabs++;
            G.player.followers += rand(200, 800) + extra;
            G.player.money += rand(20, 60) + extra;
            G.player.likes += rand(30, 100) + extra;
            updateUI();
        }

        // ============================================================
        // 👥 粉丝群 —— 模拟群聊页面（AI 输出结构化消息，渲染成聊天气泡）
        // ============================================================
        function openFanClubView() {
            const msgs = (G.fanclubMessages || []).slice(-40);
            const p = G.player;
            const rows = msgs.map(m => `
                <div style="display:flex;gap:8px;margin-bottom:10px;align-items:flex-start;">
                    <div style="width:32px;height:32px;border-radius:50%;background:#fff3cd;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">${escapeHtml(m.avatar||'👤')}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:11px;color:#888;margin-bottom:2px;">${escapeHtml(m.user)} · 第${m.day}天</div>
                        <div style="display:inline-block;background:#fff;border:1px solid #eee;border-radius:0 10px 10px 10px;padding:8px 12px;font-size:13px;color:#333;line-height:1.5;max-width:90%;word-break:break-word;">${escapeHtml(m.text)}</div>
                    </div>
                </div>`).join('');
            const html = `
            <div style="margin:-10px;background:#e3ecf5;border-radius:10px;overflow:hidden;">
                <div style="background:linear-gradient(135deg,#5b8def,#3866c4);color:#fff;padding:12px 16px;">
                    <div style="font-size:15px;font-weight:700;">💛 ${escapeHtml(p.ytName)} 的粉丝群</div>
                    <div style="font-size:11px;opacity:.85;margin-top:2px;">Lv.${Math.floor(p.fanClubLevel||0)} · 群成员 ${Math.max(8, Math.floor((p.followers||0)/50))} 人</div>
                </div>
                <div style="padding:14px;max-height:55vh;overflow-y:auto;">
                    ${rows || '<p style="font-size:12px;color:#999;text-align:center;">群里还很安静...</p>'}
                </div>
            </div>
            <div class="btn-row" style="margin-top:12px;"><button class="btn-secondary" onclick="closeModal()">关闭</button></div>
            `;
            openModal(html);
        }
        async function handleFanClub(detail, useSearch = false) {
            if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }
            G.isGenerating = true;
            showLoading();
            try {
                const p = G.player;
                const npcNames = Object.values(G.npcs).map(n => n.name).join('、');
                const sysPrompt = `
                你正在模拟主播「${p.ytName}」（人设：${p.persona}，赛道：${p.category}）的粉丝群聊天记录。
                群里活跃着4-7位不同性格的粉丝（可以偶尔提及路人NPC：${npcNames}），正在热烈讨论主播最近的动态。
                ${detail ? `本次讨论围绕：${detail}` : '内容自由发挥，语气活泼真实，像真实粉丝群聊天，可以互相打趣、刷梗。'}
                请严格按以下格式输出多条消息，不要有多余文字说明，每条一行：
                [MSG user=昵称 avatar=emoji]消息内容[/MSG]
                至少输出5条消息，avatar 使用单个可爱 emoji。
                `;
                const raw = await callAI([{ role: 'system', content: sysPrompt }, { role: 'user', content: '请生成这段群聊记录。' }], { maxTokens: 10000, temperature: 0.95 });
                hideLoading();
                const re = /\[MSG\s+user=([^\]]*?)\s+avatar=([^\]]*?)\]([\s\S]*?)\[\/MSG\]/g;
                let m; const msgs = [];
                while ((m = re.exec(raw))) { msgs.push({ user: m[1].trim() || '粉丝', avatar: m[2].trim() || '👤', text: m[3].trim() }); }
                if (!msgs.length) { msgs.push({ user: '热心粉丝', avatar: '👤', text: raw.trim().slice(0, 200) || '（消息生成失败）' }); }
                if (!G.fanclubMessages) G.fanclubMessages = [];
                for (const msg of msgs) {
                    G.fanclubMessages.push({ _id: 'fc_' + (G._fanclubMsgId = (G._fanclubMsgId || 0) + 1), ...msg, day: G.day, time: G.timeSlot });
                }
                if (G.fanclubMessages.length > 300) G.fanclubMessages = G.fanclubMessages.slice(-300);
                G.player.fanClubLevel += 0.5;
                G.player.followers += rand(30, 150);
                G.player.money += rand(5, 20);
                updateUI();
                addMemoir('粉丝群活动', '管理粉丝群');
                appendStory(`👥 你打开了粉丝群，群里正在热烈讨论着你的近况。`, '👥 粉丝群', { action: detail, useSearch });
                openFanClubView();
            } catch (e) {
                hideLoading();
                console.error('粉丝群生成失败', e);
                showToast('❌ 粉丝群内容生成失败，请检查网络或 API Key', 'error');
            } finally { G.isGenerating = false; updateUI(); }
        }

        // ============================================================
        // 🎨 看同人 —— 模拟 AO3 风格阅读页（AI 输出结构化标题/标签/正文）
        // ============================================================
        function openFanWorksListModal() {
            const works = [...(G.fanworks || [])].reverse();
            const html = `
            <h3 style="margin-bottom:10px;">📚 同人作品收藏</h3>
            <div style="max-height:60vh;overflow-y:auto;">
            ${works.length ? works.map(w => `
                <div class="save-slot-item" data-work="${w._id}" style="cursor:pointer;">
                    <div class="slot-info">
                        <div class="slot-label">📖 ${escapeHtml(w.title)}</div>
                        <div class="slot-detail">${(w.tags||[]).slice(0,3).map(t=>'#'+escapeHtml(t)).join(' ')}</div>
                        <div style="font-size:10px;color:var(--text2);">第${w.day}天</div>
                    </div>
                    <button class="slot-action-btn" data-work="${w._id}">查看</button>
                </div>
            `).join('') : '<p style="font-size:12px;color:#999;">暂无同人作品，去点击「🎨 同人」试试吧</p>'}
            </div>
            <div class="btn-row" style="margin-top:12px;"><button class="btn-secondary" onclick="closeModal()">关闭</button></div>
            `;
            openModal(html);
            document.querySelectorAll('[data-work]').forEach(el => {
                el.addEventListener('click', () => { const id = el.dataset.work; closeModal(); setTimeout(() => openFanWorkView(id), 150); });
            });
        }
        function openFanWorkView(id) {
            const work = (G.fanworks || []).find(w => w._id === id);
            if (!work) { showToast('⚠️ 找不到该作品', 'error', 1800); return; }
            const tagsHtml = (work.tags || []).map(t => `<span style="display:inline-block;background:#f1f0ff;color:#4a4a8a;border:1px solid #d8d6f5;border-radius:4px;padding:2px 8px;font-size:11px;margin:2px 4px 2px 0;">#${escapeHtml(t)}</span>`).join('');
            const html = `
            <div style="font-family:Georgia,'Noto Serif SC',serif;background:#fdfaf5;margin:-10px;padding:16px;border-radius:10px;max-height:75vh;overflow-y:auto;">
                <div style="border-bottom:2px solid #900;padding-bottom:10px;margin-bottom:10px;">
                    <div style="font-size:11px;color:#900;letter-spacing:2px;">同人共享站 · ARCHIVE OF FAN WORKS</div>
                    <div style="font-size:20px;font-weight:700;color:#333;margin-top:6px;">${escapeHtml(work.title)}</div>
                    <div style="font-size:12px;color:#666;margin-top:4px;">by <span style="color:#900;">匿名粉丝</span>${work.pairing ? ' · CP: ' + escapeHtml(work.pairing) : ''}</div>
                    <div style="margin-top:8px;">${tagsHtml}</div>
                    <div style="font-size:11px;color:#999;margin-top:8px;">📖 字数 ${work.content.length} · 💚 Kudos ${work.kudos} · 💬 评论 ${work.comments} · 第${work.day}天发布</div>
                </div>
                ${work.summary ? `<div style="font-size:13px;color:#555;font-style:italic;background:#f5f0e6;padding:10px;border-left:3px solid #900;margin-bottom:14px;">${escapeHtml(work.summary)}</div>` : ''}
                <div style="font-size:14px;line-height:2;color:#222;white-space:pre-wrap;">${escapeHtml(work.content)}</div>
                <div style="text-align:center;margin-top:16px;font-size:11px;color:#bbb;">— 全文完 —</div>
            </div>
            <div class="btn-row" style="margin-top:12px;">
                <button class="btn-secondary" id="fanWorkHistoryBtn">📚 历史作品</button>
                <button class="btn-primary" onclick="closeModal()">关闭</button>
            </div>
            `;
            openModal(html);
            document.getElementById('fanWorkHistoryBtn')?.addEventListener('click', openFanWorksListModal);
        }
        async function handleFanArt(detail, useSearch = false) {
            if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }
            G.isGenerating = true;
            showLoading();
            try {
                const p = G.player;
                const npcNames = Object.values(G.npcs).map(n => n.name).join('、');
                const sysPrompt = `
                你是一个热爱创作的 MC 主播粉丝，正在同人共享站上为主播「${p.ytName}」（人设：${p.persona}，赛道：${p.category}）创作一篇同人短篇。
                可能出现的相关角色（可选择使用）：${npcNames}。
                ${detail ? `玩家希望同人内容围绕：${detail}` : '内容自由发挥，符合角色人设与平日剧情基调。'}
                请严格按以下格式输出，不要有多余文字说明：
                [TITLE]标题[/TITLE]
                [PAIRING]CP或人物关系，没有则留空[/PAIRING]
                [TAGS]标签1, 标签2, 标签3[/TAGS]
                [SUMMARY]一句话简介[/SUMMARY]
                [CONTENT]正文内容，300-600字，细腻生动[/CONTENT]
                `;
                const raw = await callAI([{ role: 'system', content: sysPrompt }, { role: 'user', content: '请创作这篇同人作品。' }], { maxTokens: 10000, temperature: 0.95 });
                hideLoading();
                const grab = (tag) => { const m = raw.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[/${tag}\\]`)); return m ? m[1].trim() : ''; };
                const title = grab('TITLE') || '无题';
                const pairing = grab('PAIRING');
                const tags = (grab('TAGS') || '').split(/[,，、]/).map(s => s.trim()).filter(Boolean);
                const summary = grab('SUMMARY');
                const content = grab('CONTENT') || raw.trim();
                const work = {
                    _id: 'fw_' + (G._fanworkId = (G._fanworkId || 0) + 1),
                    title, pairing, tags, summary, content,
                    kudos: rand(20, 300), comments: rand(2, 40),
                    day: G.day, time: G.timeSlot,
                };
                if (!G.fanworks) G.fanworks = [];
                G.fanworks.push(work);
                appendStory(`🎨 你在同人共享站上读到了一篇粉丝创作的《${title}》，${summary || '内容很有意思'}。`, '🎨 看同人', { action: detail, useSearch });
                G.player.followers += rand(10, 60);
                G.player.likes += rand(5, 25);
                updateUI();
                openFanWorkView(work._id);
            } catch (e) {
                hideLoading();
                console.error('同人生成失败', e);
                showToast('❌ 同人内容生成失败，请检查网络或 API Key', 'error');
            } finally { G.isGenerating = false; updateUI(); }
        }

        async function handleComment(detail, useSearch = false) {
            await generateStory('💭 评论互动', `玩家在其他视频下评论，${detail || '发表有趣观点，引发热议'}`, useSearch);
            G.player.followers += rand(20, 100);
            G.player.likes += rand(5, 20);
            updateUI();
        }

        async function handleSubAction(detail, useSearch = false) {
            await generateStory('🧘 皮下活动', `玩家选择进行皮下活动：${detail || '放松身心'}`, useSearch);
            const lower = (detail || '').toLowerCase();
            const isMinecraft = lower.includes('minecraft') || lower.includes('mc') || lower.includes('我的世界') || lower
                .includes('玩');
            if (isMinecraft && Math.random() < 0.08) {
                const npc = G.npcs.dream;
                if (npc) {
                    const gain = rand(3, 6);
                    npc.favor = Math.min(100, npc.favor + gain);
                    G.player.metDream = true;
                    const msg =
                        `🎉 你在玩Minecraft时偶遇了神秘大神 Dream！他戴着白色笑脸面具，似乎对你产生了兴趣。他和你聊了几句，你感觉距离拉近了一些。好感度 +${gain}！`;
                    appendStory(msg, '👾 偶遇 Dream');
                    showToast('🌟 你偶遇了 Dream！好感度增加！', 'success', 3000);
                    updateUI();
                    if (document.querySelector('.tab-btn.active')?.dataset.tab === 'data') renderDataPanel();
                    addMemoir('偶遇 Dream', `好感度 +${gain}`);
                }
            }
            G.player.followers += rand(1, 10);
            updateUI();
        }
        // ============================================================
