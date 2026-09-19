/**
 * js/apps/chat/chat-app-ai.js
 * 💬 微信主应用 · 拆分分片 5/7：单人私聊 AI 回复触发核心（window.triggerAIReplyForSingle）。
 *    带跨时段、隔夜双时间戳感知、塔罗牌解读感知与 Rememori 证据链沉淀。
 * ⚠️ 拆分自 chat-app.js，仅做物理搬家，不改动任何函数内部逻辑。
 *    未来「聊天联网搜索」功能的接入点计划落在本文件（AI 请求发出之前判断是否需要联网）。
 */

(function() {
    'use strict';

    // 🤖 单人私聊 AI 回复触发（带跨时段、隔夜双时间戳感知、塔罗牌解读感知与 Rememori 证据链沉淀）
    window.triggerAIReplyForSingle = async function(npcId) {
        const npc = window.G.npcs[npcId];
        if (!npc) return;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', region: '中国', name: '主播' };

        if (window.isAccountBlockedByNpc(npcId, curAcc.id)) {
            if (typeof showToast === 'function') showToast('当前账号已被对方拒收', 'error');
            return;
        }

        if (window._MCYT_CHAT_GENERATING[npcId]) {
            if (typeof showToast === 'function') showToast('对方正在回复中，请稍候', 'info', 1000);
            return;
        }

        window._MCYT_CHAT_GENERATING[npcId] = true;
        if (window.G.currentChatNpc === npcId) renderSingleChatWindow();

        let bannerTimer = setTimeout(() => {
            if (window._MCYT_CHAT_GENERATING[npcId]) {
                window.showGeneratingBanner(npc.remark || npc.name);
            }
        }, 3000);

        const history = window.getAccountChatHistory(npcId, curAcc.id);
        const isBehindActive = !!window.G._behindScreenActive[npcId];

        let lastMsgTime = '';
        let lastMsgTimestamp = null;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].from === 'player' || history[i].from === 'npc') {
                lastMsgTime = history[i].time || '';
                lastMsgTimestamp = history[i].timestamp || null;
                break;
            }
        }

        let peekNotice = '';
        let lastRecommendedAltCard = null;

        const recentDialogue = history.slice(-14).map(m => {
            const speaker = (m.from === 'player') ? curAcc.name : (npc.name);
            if (m.from === 'action' && m.recalledWasPeeked && !m.peekHandled && m.recalledText) {
                peekNotice += `\n【系统单次提醒】：对方刚才撤回了一条消息：“${m.recalledText}”，你在手机通知栏不经意瞄到了一眼。随口调侃一句或吐槽网速即可，严禁在后续多轮对话中反复抓着问。\n`;
                m.peekHandled = true;
                return `[系统]: 对方撤回了一条消息`;
            }
            if (m.type === 'voice') return `${speaker} [语音]: ${m.text || ''}`;
            if (m.type === 'shared_tarot') {
                // 🔮 委托给 ChatTarot 进行结构化提取
                if (window.ChatTarot && typeof window.ChatTarot.formatTarotForPrompt === 'function') {
                    return window.ChatTarot.formatTarotForPrompt(m, speaker);
                }
                return `${speaker} [转发了塔罗牌阵]: ${m.sharedTarot?.spreadName || '占卜'}`;
            }
            if (m.type === 'shared_moment') return `${speaker} [分享了朋友圈动态]: ${m.sharedMoment?.author} 发的 “${m.sharedMoment?.body || ''}”；配图：${m.sharedMoment?.imageDesc || '无'}；评论区八卦：${m.sharedMoment?.commentsSummary || '暂无评论'}`;
            if (m.type === 'contact_card') {
                if (m.contactCard && m.contactCard.isAlt) {
                    lastRecommendedAltCard = m.contactCard;
                }
                return `${speaker} [推荐了名片]: ${m.contactCard?.name}（人设：${m.contactCard?.persona || 'MC同伴'}，签名：“${m.contactCard?.signature || '无'}”，身份：${m.contactCard?.isAlt ? '对方的小号' : '新朋友'}）`;
            }
            if (m.type === 'moment_notice') return `[系统提醒]: ${m.author} 刚发了一条新朋友圈动态`;
            if (m.originalText) return `${speaker}: ${m.originalText} (译: ${m.text || ''})`;
            if (m.imageDesc) return `${speaker} [发了张照片，画面描绘]: ${m.imageDesc}`;
            if (m.type === 'image' || m.imageUrl) return `${speaker} [发了张自拍/游戏截图]`;
            return `${speaker}: ${m.text || ''}`;
        }).join('\n');

        const promptCtx = (window.ChatPromptEngine && typeof window.ChatPromptEngine.buildWechatAIPromptContext === 'function')
            ? window.ChatPromptEngine.buildWechatAIPromptContext({
                npc,
                curAcc,
                recentDialogueText: recentDialogue + peekNotice,
                isBehindActive,
                lastMsgTime,
                lastMsgTimestamp
            })
            : {
                sysPrompt: `扮演MC好友「${npc.name}」，严禁句末加句号，严禁括号动作描写。`,
                userPrompt: recentDialogue ? `最近对话：\n${recentDialogue}\n\n回复：` : '打个招呼。'
            };

        try {
            const raw = await callAI([
                { role: 'system', content: promptCtx.sysPrompt },
                { role: 'user', content: promptCtx.userPrompt }
            ], { maxTokens: 450, temperature: 0.86, silent: true });

            let clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();
            clean = clean.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '').trim();

            if (lastRecommendedAltCard && lastRecommendedAltCard.isAlt) {
                const agreeKeywords = ['加了', '加上了', '去加', '同意', '通过', '搜了', '发申请', '加你小号', '加那个号', '扫了'];
                const hasAgreed = agreeKeywords.some(kw => clean.includes(kw));
                if (hasAgreed) {
                    if (!window.G.friendRequests) window.G.friendRequests = [];
                    const alreadySent = window.G.friendRequests.some(r => r.applicantNpcId === npc.id && r.targetAccountId === lastRecommendedAltCard.id);
                    if (!alreadySent) {
                        window.G.friendRequests.push({
                            id: 'freq_' + Date.now(),
                            applicantNpcId: npc.id,
                            targetAccountId: lastRecommendedAltCard.id,
                            name: npc.name,
                            region: npc.region || '中国',
                            persona: npc.persona || '你的好友',
                            signature: npc.signature || '',
                            favor: npc.favor || 50,
                            avatar: npc.avatarUrl || 'assets/icons/chat.png',
                            reason: `我是 ${npc.name}，你刚才把名片推给我啦，来加上！`,
                            time: new Date().toLocaleTimeString().slice(0, 5)
                        });
                    }
                }
            }

            const estInputTokens = Math.round((promptCtx.sysPrompt.length + promptCtx.userPrompt.length) * 1.35);
            const estOutputTokens = Math.round(clean.length * 1.35);
            window.recordTokenHistoryEntry({
                time: new Date().toLocaleTimeString().slice(0, 5),
                targetName: npc.remark || npc.name,
                type: '私聊',
                inTokens: estInputTokens,
                outTokens: estOutputTokens,
                totalTokens: estInputTokens + estOutputTokens
            });

            let behindText = '';
            const bsMatch = clean.match(/\[BEHIND_SCREEN\]([\s\S]*?)\[\/BEHIND_SCREEN\]/i);
            if (bsMatch) {
                behindText = bsMatch[1].trim();
                clean = clean.replace(/\[BEHIND_SCREEN\][\s\S]*?\[\/BEHIND_SCREEN\]/gi, '').trim();
            }

            const entities = window.parseAIReplyEntities(clean, npc.name);
            const finalEntities = (entities && entities.length) ? entities : [{ type: 'text', text: '在呢' }];

            let collectedPureReply = '';

            for (let i = 0; i < finalEntities.length; i++) {
                const item = finalEntities[i];
                const time = new Date().toLocaleTimeString().slice(0, 5);

                if (item.type === 'moment_notice') {
                    window.pushChatMessageSafe(npcId, {
                        from: 'action',
                        type: 'moment_notice',
                        momentId: item.momentId,
                        author: item.author,
                        text: item.text,
                        time,
                        timestamp: Date.now()
                    }, curAcc.id);
                } else if (item.type === 'voice') {
                    window.pushChatMessageSafe(npcId, {
                        from: 'npc',
                        type: 'voice',
                        seconds: item.seconds || 3,
                        audioBg: item.audioBg || '',
                        text: item.text || '',
                        time,
                        timestamp: Date.now()
                    }, curAcc.id);
                    collectedPureReply += ` [语音: ${item.text || ''}]`;
                } else if (item.type === 'sticker_entity') {
                    const resolved = window.resolveStickerImageUrl(item.category, item.desc);
                    if (resolved) {
                        window.pushChatMessageSafe(npcId, {
                            from: 'npc',
                            type: 'sticker',
                            stickerUrl: resolved.url,
                            stickerDesc: resolved.desc,
                            text: `[表情: ${resolved.desc}]`,
                            time,
                            timestamp: Date.now()
                        }, curAcc.id);
                    } else {
                        window.pushChatMessageSafe(npcId, {
                            from: 'npc',
                            type: 'text',
                            text: `[${item.desc || '表情'}]`,
                            time,
                            timestamp: Date.now()
                        }, curAcc.id);
                    }
                } else {
                    window.pushChatMessageSafe(npcId, {
                        from: 'npc',
                        type: 'text',
                        text: item.text || '',
                        originalText: item.originalText || null,
                        time,
                        timestamp: Date.now()
                    }, curAcc.id);
                    collectedPureReply += ' ' + (item.originalText || item.text || '');
                }

                if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
                if (i < finalEntities.length - 1) {
                    await new Promise(r => setTimeout(r, 420));
                }
            }

            if (collectedPureReply.trim()) {
                depositRememoriEvidence(npcId, curAcc.id, `${npc.name}: ${collectedPureReply.trim()}`);
            }

            if (behindText && isBehindActive) {
                window.pushChatMessageSafe(npcId, {
                    from: 'behind_screen',
                    text: behindText,
                    time: new Date().toLocaleTimeString().slice(0, 5),
                    timestamp: Date.now()
                }, curAcc.id);
                if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
            }

            checkAndTriggerAutoMemorySummary(npcId, curAcc.id);

            if (typeof autoSaveGame === 'function') autoSaveGame();
        } catch(e) {
            console.error('API 回复失败:', e);
            if (typeof showToast === 'function') showToast('回复失败，请检查AI配置', 'error');
        } finally {
            clearTimeout(bannerTimer);
            delete window._MCYT_CHAT_GENERATING[npcId];
            window.hideGeneratingBanner();
            if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
        }
    };

})();
