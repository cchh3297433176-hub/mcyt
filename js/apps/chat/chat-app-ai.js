/**
 * js/apps/chat/chat-app-ai.js
 * 💬 微信主应用 · 拆分分片 5/7：单人私聊 AI 回复触发核心（window.triggerAIReplyForSingle）。
 *    带跨时段、隔夜双时间戳感知、塔罗牌解读感知、Rememori 证据链沉淀、
 *    以及专属好友独立联网搜索检索与权威网页卡片推送。
 * ⚠️ 拆分自 chat-app.js，包含联网意图识别、webSearch 调度与网页气泡派发。
 */

(function() {
    'use strict';

    // 辅助函数：判断是否需要联网搜索并提取关键词
    function checkSearchIntent(lastPlayerText, searchCfg) {
        if (!lastPlayerText || !searchCfg || !searchCfg.enabled) {
            return { needSearch: false, query: '' };
        }

        const text = lastPlayerText.trim();
        const rawKeywords = (searchCfg.forcedKeywords || '').split(/[,，\s]+/).filter(Boolean);

        // 1. 自定义关键词强制匹配
        for (const kw of rawKeywords) {
            if (text.includes(kw)) {
                let cleanQuery = text.replace(new RegExp(kw, 'g'), '').replace(/^[，,。.？！?!、\s]+|[，,。.？！?!、\s]+$/g, '').trim();
                if (!cleanQuery) cleanQuery = text;
                return { needSearch: true, query: cleanQuery };
            }
        }

        // 2. AI 自主判断：提问或生活百科/事实探知场景
        const autoPatterns = [
            /(?:怎么|如何|怎样)(?:做|弄|搞|办|弄出|搞定)/,
            /(?:做法|菜谱|配方|步骤|教程|攻略)/,
            /(?:是什么|什么意思|指的是|介绍一下|科普)/,
            /(?:什么时候|几月几日|哪天|历史上的今天)/,
            /(?:最新|今天|昨晚|近期|现在).*(?:新闻|消息|热搜|发生|更新)/,
            /(?:为什么|为何).*(?:会这样|原因)/,
            /(?:你知道|听过|听说过).*(?:吗|不)/
        ];

        for (const pat of autoPatterns) {
            if (pat.test(text)) {
                let cleanQuery = text.replace(/^[，,。.？！?!、\s]+|[，,。.？！?!、\s]+$/g, '').trim();
                return { needSearch: true, query: cleanQuery };
            }
        }

        return { needSearch: false, query: '' };
    }

    // 🤖 单人私聊 AI 回复触发（带跨时段、隔夜双时间戳感知、塔罗牌解读感知、Rememori 证据链与联网搜索）
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
        let lastPlayerMsgText = '';

        for (let i = history.length - 1; i >= 0; i--) {
            const h = history[i];
            if (h.from === 'player' || h.from === 'npc') {
                if (!lastMsgTime) {
                    lastMsgTime = h.time || '';
                    lastMsgTimestamp = h.timestamp || null;
                }
            }
            if (h.from === 'player' && !lastPlayerMsgText) {
                lastPlayerMsgText = h.text || h.originalText || '';
            }
            if (lastMsgTime && lastPlayerMsgText) break;
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
            if (m.type === 'web_page') return `${speaker} [分享了网页链接]: ${m.webPage?.title || ''} (${m.webPage?.url || ''})`;
            if (m.type === 'moment_notice') return `[系统提醒]: ${m.author} 刚发了一条新朋友圈动态`;
            if (m.originalText) return `${speaker}: ${m.originalText} (译: ${m.text || ''})`;
            if (m.imageDesc) return `${speaker} [发了张照片，画面描绘]: ${m.imageDesc}`;
            if (m.type === 'image' || m.imageUrl) return `${speaker} [发了张自拍/游戏截图]`;
            return `${speaker}: ${m.text || ''}`;
        }).join('\n');

        // 🌐 联网搜索检索处理
        let searchResults = [];
        let searchContextPrompt = '';
        const searchCfg = (typeof window.getNpcSearchConfig === 'function')
            ? window.getNpcSearchConfig(npcId)
            : { enabled: false, maxResults: 3, sendWebPage: true, forcedKeywords: '' };

        const intent = checkSearchIntent(lastPlayerMsgText, searchCfg);
        if (intent.needSearch && intent.query && typeof window.webSearch === 'function') {
            try {
                if (typeof showToast === 'function') showToast(`对方正在检索网络...`, 'info', 1200);
                const limit = searchCfg.maxResults || 3;
                const searchData = await window.webSearch(intent.query, limit);
                searchResults = (searchData && Array.isArray(searchData.results)) ? searchData.results : [];
                const searchAnswer = (searchData && searchData.answer) ? searchData.answer.trim() : '';
                if (searchResults.length > 0 || searchAnswer) {
                    const formattedResults = searchResults.map((item, idx) => {
                        return `[来源${idx + 1}] ${item.title}\n摘要: ${item.content || ''}\n链接: ${item.url || ''}`;
                    }).join('\n\n');
                    const answerLine = searchAnswer ? `检索概要：${searchAnswer}\n\n` : '';
                    searchContextPrompt = `\n\n【实时全网联网检索参考（对方刚刚提及了相关内容或触发了搜索指令）】：\n检索关键词：“${intent.query}”\n${answerLine}${formattedResults}\n【要求】：直接用你自己的口吻转述上述真实检索到的信息内容本身，禁止复读或改写对方的请求原话，禁止在回复中出现“角色名：”这类脚本格式，就当作你自己刚刚上网查到的事直接讲给对方听。`;
                }
            } catch (searchErr) {
                console.warn('联网搜索检索失败或超时:', searchErr);
            }
        }

        const promptCtx = (window.ChatPromptEngine && typeof window.ChatPromptEngine.buildWechatAIPromptContext === 'function')
            ? window.ChatPromptEngine.buildWechatAIPromptContext({
                npc,
                curAcc,
                recentDialogueText: recentDialogue + peekNotice + searchContextPrompt,
                isBehindActive,
                lastMsgTime,
                lastMsgTimestamp
            })
            : {
                sysPrompt: `扮演MC好友「${npc.name}」，严禁句末加句号，严禁括号动作描写。`,
                userPrompt: recentDialogue ? `最近对话：\n${recentDialogue}${searchContextPrompt}\n\n回复：` : '打个招呼。'
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

            // 🌐 推送搜索到的优质网页卡片（若开启且有权威搜索结果）
            if (searchCfg.sendWebPage && searchResults && searchResults.length > 0) {
                const topPage = searchResults[0];
                if (topPage && topPage.url) {
                    await new Promise(r => setTimeout(r, 480));
                    const time = new Date().toLocaleTimeString().slice(0, 5);
                    const pageCardMsg = {
                        from: 'npc',
                        type: 'web_page',
                        text: `[分享了网页: ${topPage.title || '网页链接'}]`,
                        webPage: {
                            title: topPage.title || '权威检索结果',
                            snippet: topPage.content || '',
                            url: topPage.url,
                            source: topPage.source || '全网检索'
                        },
                        time,
                        timestamp: Date.now()
                    };
                    window.pushChatMessageSafe(npcId, pageCardMsg, curAcc.id);
                    if (window.G.currentChatNpc === npcId) renderSingleChatWindow();
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
