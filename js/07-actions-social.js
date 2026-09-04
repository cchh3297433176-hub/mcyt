        // 行动处理（全面整合到新版聊天系统与好友申请机制）
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
                // 统一合并：私信、交友、粉丝群全部引导进入统一的「💬 聊天」中心
                case 'dm':
                case 'friend':
                case 'fanclub':
                case 'chat':
                    switchTab('social');
                    showToast('💬 已进入聊天中心', 'success', 1500);
                    // 行动概率触发新的好友申请
                    if (Math.random() < 0.65) {
                        triggerRandomFriendRequest();
                    }
                    break;
                case 'collab':
                    await handleCollab(detail, useSearch);
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

        // 随机好友申请生成器（粉丝、路人主播、同行）
        function triggerRandomFriendRequest() {
            const fanTypes = [
                { name: 'RedstoneBoy_' + rand(10, 99), reason: '视频热心粉丝', persona: '超喜欢你的红石黑科技视频，希望能向你请教！' },
                { name: 'PixelBuilder' + rand(1, 99), reason: '建筑同好', persona: '也是一名MC建筑爱好者，看了你的实况特别想加好友一起交流！' },
                { name: 'SpeedRunnerMC', reason: '速通同行主播', persona: '经常在各大榜单看到你的名字，加个好友有机会联机切磋！' },
                { name: 'MikuCraft' + rand(100, 999), reason: '直播铁粉', persona: '从你开播第一天就在看直播的老粉，天天给你刷礼物！' },
                { name: 'EndCityWalker', reason: '探索模组玩家', persona: '性格比较随和，喜欢到处挖矿和探索遗迹的休闲玩家。' }
            ];
            const chosen = pick(fanTypes);
            // 避免重复申请
            if (Object.values(G.npcs).some(n => n.name === chosen.name) || (G.friendRequests || []).some(r => r.name === chosen.name)) return;
            
            receiveFriendRequest({
                name: chosen.name,
                fromReason: chosen.reason,
                persona: chosen.persona,
                avatarEmoji: pick(['🎮', '⛏️', '🏹', '🎨', '🌟', '👒', '🎧', '👾']),
                day: G.day
            });
        }

        async function handleCollab(detail, useSearch = false) {
            const availableNPCs = Object.values(G.npcs).filter(n => (n.favor || 0) >= 40);
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
        // 🎨 看同人 —— 模拟 AO3 风格阅读页
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
                可能出现的相关角色：${npcNames}。
                ${detail ? `围绕主题：${detail}` : '自由发挥，符合主播平日风格。'}
                按以下格式输出：
                [TITLE]标题[/TITLE]
                [PAIRING]CP关系[/PAIRING]
                [TAGS]标签1, 标签2[/TAGS]
                [SUMMARY]简介[/SUMMARY]
                [CONTENT]正文内容300-500字[/CONTENT]
                `;
                const raw = await callAI([{ role: 'system', content: sysPrompt }, { role: 'user', content: '请创作。' }], { maxTokens: 10000, temperature: 0.95 });
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
                appendStory(`🎨 你在同人共享站上读到了粉丝创作的《${title}》，${summary || '非常有爱'}。`, '🎨 看同人', { action: detail, useSearch });
                G.player.followers += rand(10, 60);
                G.player.likes += rand(5, 25);
                updateUI();
                openFanWorkView(work._id);
            } catch (e) {
                hideLoading();
                showToast('❌ 同人内容生成失败', 'error');
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
            const isMinecraft = lower.includes('minecraft') || lower.includes('mc') || lower.includes('我的世界') || lower.includes('玩');
            if (isMinecraft && Math.random() < 0.12) {
                const npc = G.npcs.dream;
                if (npc) {
                    const gain = rand(3, 6);
                    npc.favor = Math.min(100, (npc.favor || 0) + gain);
                    G.player.metDream = true;
                    appendStory(`🎉 你在MC中偶遇了神秘大神 Dream！好感度 +${gain}！`, '👾 偶遇 Dream');
                    showToast('🌟 你偶遇了 Dream！好感度增加！', 'success', 3000);
                    updateUI();
                }
            }
            G.player.followers += rand(1, 10);
            updateUI();
        }
        // ============================================================