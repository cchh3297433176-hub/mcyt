/**
 * js/apps/chat/chat-app-ai.js
 * 💬 微信主应用 · 拆分分片 5/7：单人私聊 AI 回复触发核心（window.triggerAIReplyForSingle）。
 *    支持按角色独立设置的【单次回复条数最少~最多范围】与【语音发送频率】严格调度执行；
 *    拟真语音环境音（audio_bg）与声调细节还原；
 *    带跨时段、隔夜双时间戳感知、塔罗牌解读感知、Rememori 证据链沉淀、
 *    专属好友独立联网搜索检索与权威网页卡片推送、以及好感度铁律动态结算机制。
 */

(function() {
    'use strict';

    // 辅助函数：判断是否需要联网搜索并提取关键词（不区分大小写，强词与提问双通道穿透）
    function checkSearchIntent(lastPlayerText, searchCfg) {
        if (!lastPlayerText) {
            return { needSearch: false, query: '' };
        }

        const text = lastPlayerText.trim();
        const lowerText = text.toLowerCase();
        
        // 强指令关键词库
        const forcedKeywordsList = (searchCfg && searchCfg.forcedKeywords)
            ? searchCfg.forcedKeywords.split(/[,，\s]+/).filter(Boolean)
            : ['搜索', '查一下', '查查', '搜一下', '帮我找', '搜搜', '百度一下'];

        // 1. 自定义关键词强制匹配（若玩家显式包含关键词，即使独立开关未开也允许穿透执行）
        for (const rawKw of forcedKeywordsList) {
            const kw = rawKw.trim();
            if (!kw) continue;
            if (lowerText.includes(kw.toLowerCase())) {
                const kwRegex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                let cleanQuery = text.replace(kwRegex, '').replace(/^[，,。.？！?!、:\s]+|[，,。.？！?!、:\s]+$/g, '').trim();
                cleanQuery = cleanQuery.replace(/^(?:帮我|给我|麻烦|请|看看|想知道)\s*/i, '').trim();
                if (!cleanQuery) cleanQuery = text;
                return { needSearch: true, query: cleanQuery };
            }
        }

        // 若当前角色未开启联网开关，则不触发自主意图判断
        if (!searchCfg || !searchCfg.enabled) {
            return { needSearch: false, query: '' };
        }

        // 2. AI 自主判断：提问或生活百科/事实探知场景
        const autoPatterns = [
            /(?:怎么|如何|怎样)(?:做|弄|搞|办|弄出|搞定)/i,
            /(?:做法|菜谱|配方|步骤|教程|攻略)/i,
            /(?:是什么|什么意思|指的是|介绍一下|科普)/i,
            /(?:什么时候|几月几日|哪天|历史上的今天)/i,
            /(?:最新|今天|昨晚|近期|现在).*(?:新闻|消息|热搜|发生|更新)/i,
            /(?:为什么|为何).*(?:会这样|原因)/i,
            /(?:你知道|听过|听说过).*(?:吗|不)/i
        ];

        for (const pat of autoPatterns) {
            if (pat.test(text)) {
                let cleanQuery = text.replace(/^[，,。.？！?!、:\s]+|[，,。.？！?!、:\s]+$/g, '').trim();
                cleanQuery = cleanQuery.replace(/^(?:帮我|给我|想知道)\s*/i, '').trim();
                return { needSearch: true, query: cleanQuery };
            }
        }

        return { needSearch: false, query: '' };
    }

    // 辅助函数：根据标点将长文本拆分为多个短气泡（用于满足最少条数 minMsgs 限制）
    function splitTextIntoMessages(text, targetCount) {
        if (!text || targetCount <= 1) return [text];
        const segs = text.split(/(?<=[，。！？!?~…\n])\s*/).map(s => s.trim()).filter(Boolean);
        if (segs.length <= 1) {
            const spaceParts = text.split(/\s+/).filter(Boolean);
            if (spaceParts.length >= targetCount) {
                const result = [];
                const chunkSize = Math.ceil(spaceParts.length / targetCount);
                for (let i = 0; i < spaceParts.length; i += chunkSize) {
                    result.push(spaceParts.slice(i, i + chunkSize).join(' '));
                }
                return result.slice(0, targetCount);
            }
            return [text];
        }

        if (segs.length <= targetCount) {
            return segs;
        }

        const result = [];
        const chunkSize = Math.ceil(segs.length / targetCount);
        for (let i = 0; i < segs.length; i += chunkSize) {
            result.push(segs.slice(i, i + chunkSize).join(''));
        }
        return result.slice(0, targetCount);
    }

    // 辅助函数：根据当前客观时段生成极其拟真生活化的语音背景音兜底
    function generateSmartVoiceAudioBg(hour = 14) {
        const nightBgs = [
            '被窝里翻身的布料摩擦声、伴随轻微疲倦哈欠与鼻音',
            '深夜房间里极安静、伴随轻微的呼吸声与被子摩擦声',
            '耳机里漏出的轻微游戏背景音乐与鼠标微弱点击声'
        ];
        const morningBgs = [
            '刚睡醒还带着浓浓沙哑鼻音、远处微弱的风声',
            '被窝摩擦声与轻微吸气声'
        ];
        const dayBgs = [
            '轻快的机械键盘敲击咔嗒声与鼠标点击',
            '周围走动杂音、杯子放在桌上的清脆碰击声',
            '说话时带着抑制不住的轻笑气音与键盘打字声'
        ];
        const eveningBgs = [
            '放松的叹气声、背景有隐约的电脑风扇运转微声',
            '喝水吞咽声、说话语调懒散舒适'
        ];

        let pool = dayBgs;
        if (hour >= 0 && hour < 6) pool = nightBgs;
        else if (hour >= 6 && hour < 9) pool = morningBgs;
        else if (hour >= 18 && hour < 24) pool = eveningBgs;

        return pool[Math.floor(Math.random() * pool.length)];
    }

    // 🤖 单人私聊 AI 回复触发（条数控制、拟真语音环境音还原、好感度动态铁律）
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
        if (window.G.currentChatNpc === npcId && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();

        let bannerTimer = setTimeout(() => {
            if (window._MCYT_CHAT_GENERATING[npcId]) {
                window.showGeneratingBanner(npc.remark || npc.name);
            }
        }, 3000);

        const history = window.getAccountChatHistory(npcId, curAcc.id);
        const isBehindActive = !!window.G._behindScreenActive[npcId];

        // 读取角色独立设定的发消息条数与语音偏好
        const chatCfg = npc.chatSettings || { minMsgs: 1, maxMsgs: 3, voiceFreq: 'rare' };
        const minMsgs = Math.max(1, parseInt(chatCfg.minMsgs) || 1);
        const maxMsgs = Math.max(minMsgs, parseInt(chatCfg.maxMsgs) || 3);
        const voiceFreq = chatCfg.voiceFreq || 'rare';

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
            if (m.type === 'voice') return `${speaker} [语音，背景音: ${m.audioBg || '无'}]: ${m.text || ''}`;
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
        let isSearchTriggered = false;
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
                    isSearchTriggered = true;
                    const formattedResults = searchResults.map((item, idx) => {
                        const title = item.title || '网页标题';
                        const snippet = (item.content || '').slice(0, 200);
                        return `[资料${idx + 1}] 《${title}》: ${snippet}`;
                    }).join('\n');
                    const answerLine = searchAnswer ? `核心概要: ${searchAnswer}\n` : '';
                    searchContextPrompt = `\n\n【全网实时检索到的最新资料（仅供当前对话参考，不进入长期记忆）】：\n检索词：“${intent.query}”\n${answerLine}${formattedResults}\n【格式与语气绝对铁律】：\n1. 请务必保持微信好友口吻，用 ${minMsgs} 到 ${maxMsgs} 个 [MSG]...[/MSG] 气泡随性转述核心要点，禁止长篇大论生硬背诵，禁止出现角色名前缀！\n2. 每一个消息气泡必须以 [MSG] 开头，并严格以 [/MSG] 完整闭合，绝对禁止遗漏标签！`;
                }
            } catch (searchErr) {
                console.warn('联网搜索检索失败或超时:', searchErr);
            }
        }

        // 针对条数范围、拟真语音环境音与好感度铁律注入强约束指令
        let styleConstraint = `【条数硬性约束】：本次回复必须分为 ${minMsgs} 到 ${maxMsgs} 个独立的 [MSG]...[/MSG] 消息气泡发送。\n`;
        if (voiceFreq === 'never') {
            styleConstraint += `【语音偏好】：你习惯只发文字打字，绝对严禁发送任何语音条 [VOICE]！\n`;
        } else if (voiceFreq === 'voice_only') {
            styleConstraint += `【语音偏好】：你此时正在忙碌或懒得打字，本次回复全部使用拟真语音条发送！格式必须为：\n[VOICE seconds="秒数" audio_bg="耳朵听到的声音与语气"]语音口语文字[/VOICE]\naudio_bg 必须包含丰富的生活声音（如键盘打字声、叹气、哈欠、笑场、翻身摩擦声等），展现生动活人感！\n`;
        } else if (voiceFreq === 'often') {
            styleConstraint += `【语音偏好】：你经常随手发语音，请在本次回复的气泡中穿插 1~2 条带真实环境音与语气的拟真语音条：\n[VOICE seconds="秒数" audio_bg="听到的细节声音与说话语气"]语音口语内容[/VOICE]\n`;
        } else {
            styleConstraint += `【语音偏好】：主要发文字打字，偶尔极少才发语音条。\n`;
        }

        // 注入好感度动态结算铁律协议
        styleConstraint += `【好感度结算铁律】：\n` +
            `请评估你当前对对方这条消息的内心感受，在回复正文的最末尾附带 [FAVOR: 数值] 标签：\n` +
            `- 聊得开心、被关心、被赞赏或增进互动时，最多只能加 0.5（写 [FAVOR: +0.5] 或 [FAVOR: +0.2]）；\n` +
            `- 普通日常闲聊无明显情绪波动，写 [FAVOR: 0]；\n` +
            `- 敷衍、被扫兴或轻微不耐烦，扣除 0.5~1（写 [FAVOR: -0.5] 或 [FAVOR: -1]）；\n` +
            `- 遇到极其恶劣的人身攻击、剧烈争吵或侮辱背叛时，才允许扣除更大数值（写 [FAVOR: -3]）。绝对禁止单次增加超过0.5！`;

        const promptCtx = (window.ChatPromptEngine && typeof window.ChatPromptEngine.buildWechatAIPromptContext === 'function')
            ? window.ChatPromptEngine.buildWechatAIPromptContext({
                npc,
                curAcc,
                recentDialogueText: recentDialogue + peekNotice + searchContextPrompt,
                isBehindActive,
                lastMsgTime,
                lastMsgTimestamp,
                extraConstraint: styleConstraint
            })
            : {
                sysPrompt: `扮演MC好友「${npc.name}」，严禁句末加句号，严禁括号动作描写，每条消息必须用 [MSG]...[/MSG] 包裹。\n${styleConstraint}`,
                userPrompt: recentDialogue ? `最近对话：\n${recentDialogue}${searchContextPrompt}\n\n回复：` : '打个招呼。'
            };

        try {
            const raw = await callAI([
                { role: 'system', content: promptCtx.sysPrompt },
                { role: 'user', content: promptCtx.userPrompt }
            ], { maxTokens: 10000, temperature: 0.86, silent: true });

            let clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();

            // 仅清洗括号内的动作/神态描写，保护知识与搜索内容中正常的说明括号
            clean = clean.replace(/[\(（](?:揉|叹|眨|看|摸|笑|低头|抬头|轻笑|撇嘴|皱眉|转身|歪头|小声|抱|握|拉|推|咬|红着脸|动作)[^\)）]*[\)）]/gi, '').trim();

            // 🛡️ 好感度变动提取与绝对门禁审核
            let favorDelta = 0;
            const favorMatch = clean.match(/\[FAVOR:\s*([+\-]?\d+(?:\.\d+)?)\s*\]/i);
            if (favorMatch) {
                const parsedDelta = parseFloat(favorMatch[1]) || 0;
                clean = clean.replace(/\[FAVOR:\s*[+\-]?\d+(?:\.\d+)?\s*\]/gi, '').trim();

                if (parsedDelta > 0) {
                    favorDelta = Math.min(0.5, parsedDelta);
                } else if (parsedDelta < 0) {
                    const severeConflictKeywords = ['滚', '去死', '讨厌你', '决裂', '绝交', '恶心', '傻逼', '废物', '闭嘴', '吵架', '出轨', '背叛'];
                    const isSevereConflict = severeConflictKeywords.some(kw => lastPlayerMsgText.includes(kw));

                    if (isSevereConflict) {
                        favorDelta = Math.max(-5.0, parsedDelta);
                    } else {
                        favorDelta = Math.max(-1.0, parsedDelta);
                    }
                }
            }

            if (favorDelta !== 0) {
                const currentFavor = parseFloat(npc.favor !== undefined ? npc.favor : 50);
                const nextFavor = Math.max(0, Math.min(100, Math.round((currentFavor + favorDelta) * 10) / 10));
                npc.favor = nextFavor;

                if (npc.favor < 60 && (npc.relationshipStage === 'dating' || npc.isDating)) {
                    npc.relationshipStage = 'friend';
                    npc.isDating = false;
                }

                if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
            }

            // 🛡️ 智能自愈修复：防止模型因意外未闭合 [MSG] 导致前端掉格式
            const openTagMatches = clean.match(/\[MSG(?:\s+original=(?:"[\s\S]*?"|'[\s\S]*?'|[^\]\s]+))?\]/gi) || [];
            const closeTagMatches = clean.match(/\[\/MSG\]/gi) || [];
            if (openTagMatches.length > closeTagMatches.length) {
                for (let k = 0; k < (openTagMatches.length - closeTagMatches.length); k++) {
                    clean += '[/MSG]';
                }
            }

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

            let entities = window.parseAIReplyEntities(clean, npc.name);
            if (!entities || !entities.length) {
                entities = [{ type: 'text', text: '在呢' }];
            }

            // 🎯 最少条数（minMsgs）不足时自动切分加固
            if (entities.length < minMsgs) {
                const expanded = [];
                for (const ent of entities) {
                    if (ent.type === 'text' && ent.text && !ent.originalText && expanded.length < minMsgs) {
                        const needed = (minMsgs - entities.length + 1);
                        const parts = splitTextIntoMessages(ent.text, needed);
                        parts.forEach(p => expanded.push({ type: 'text', text: p }));
                    } else {
                        expanded.push(ent);
                    }
                }
                entities = expanded;
            }

            // 计算该角色的本地小时（用于生成高度匹配的语音环境音背景）
            const npcH = (promptCtx.timeCtx && promptCtx.timeCtx.hour !== undefined) ? promptCtx.timeCtx.hour : new Date().getHours();

            // 🎯 语音偏好后处理与拟真背景音注入：
            if (voiceFreq === 'never') {
                // 严禁语音：将语音条全部降级转回纯文本
                entities = entities.map(ent => {
                    if (ent.type === 'voice') {
                        return { type: 'text', text: ent.text || '' };
                    }
                    return ent;
                });
            } else if (voiceFreq === 'voice_only') {
                // 全语音：将文本气泡全量转化为带细腻环境音的拟真语音条
                entities = entities.map(ent => {
                    if (ent.type === 'text' && ent.text) {
                        const sec = Math.min(60, Math.max(2, Math.round(ent.text.length * 0.45)));
                        return {
                            type: 'voice',
                            text: ent.text,
                            seconds: sec,
                            audioBg: generateSmartVoiceAudioBg(npcH)
                        };
                    } else if (ent.type === 'voice' && !ent.audioBg) {
                        ent.audioBg = generateSmartVoiceAudioBg(npcH);
                    }
                    return ent;
                });
            } else if (voiceFreq === 'often') {
                // 经常语音：若模型完全没有输出语音，则挑选 1 条纯文本转为拟真语音条
                const hasVoice = entities.some(e => e.type === 'voice');
                if (!hasVoice && entities.length > 0) {
                    const textIndices = entities.map((e, idx) => (e.type === 'text' ? idx : -1)).filter(i => i !== -1);
                    if (textIndices.length > 0) {
                        const targetIdx = textIndices[textIndices.length - 1];
                        const rawT = entities[targetIdx].text || '';
                        entities[targetIdx] = {
                            type: 'voice',
                            text: rawT,
                            seconds: Math.min(60, Math.max(2, Math.round(rawT.length * 0.45))),
                            audioBg: generateSmartVoiceAudioBg(npcH)
                        };
                    }
                } else {
                    // 为缺失 audioBg 的语音补充背景音
                    entities.forEach(e => {
                        if (e.type === 'voice' && !e.audioBg) {
                            e.audioBg = generateSmartVoiceAudioBg(npcH);
                        }
                    });
                }
            } else {
                // rare 模式下若发了语音，也保障 audioBg 不为空
                entities.forEach(e => {
                    if (e.type === 'voice' && !e.audioBg) {
                        e.audioBg = generateSmartVoiceAudioBg(npcH);
                    }
                });
            }

            // 🎯 严格把控单次回复条数在最大上限 maxMsgs 内
            if (entities.length > maxMsgs) {
                const kept = entities.slice(0, maxMsgs - 1);
                const rest = entities.slice(maxMsgs - 1);
                const mergedText = rest.map(r => r.text || '').filter(Boolean).join(' ');
                const lastItem = rest[0];
                if (lastItem && lastItem.type === 'voice') {
                    kept.push({
                        type: 'voice',
                        text: mergedText,
                        seconds: Math.min(60, Math.max(2, Math.round(mergedText.length * 0.45))),
                        audioBg: lastItem.audioBg || generateSmartVoiceAudioBg(npcH)
                    });
                } else {
                    kept.push({ type: 'text', text: mergedText, originalText: lastItem?.originalText || null });
                }
                entities = kept;
            }

            const finalEntities = entities;

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
                        audioBg: item.audioBg || '轻微的呼吸声与环境微音',
                        text: item.text || '',
                        time,
                        timestamp: Date.now()
                    }, curAcc.id);
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
                }

                if (window.G.currentChatNpc === npcId && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
                if (i < finalEntities.length - 1) {
                    await new Promise(r => setTimeout(r, 420));
                }
            }

            // 🌐 推送搜索到的优质网页卡片
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
                    if (window.G.currentChatNpc === npcId && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
                }
            }

            if (behindText && isBehindActive) {
                window.pushChatMessageSafe(npcId, {
                    from: 'behind_screen',
                    text: behindText,
                    time: new Date().toLocaleTimeString().slice(0, 5),
                    timestamp: Date.now()
                }, curAcc.id);
                if (window.G.currentChatNpc === npcId && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
            }

            // 🧠 历史滑动总结
            if (!isSearchTriggered && typeof checkAndTriggerAutoMemorySummary === 'function') {
                checkAndTriggerAutoMemorySummary(npcId, curAcc.id);
            }

            if (typeof autoSaveGame === 'function') autoSaveGame();
        } catch(e) {
            console.error('API 回复失败:', e);
            if (typeof showToast === 'function') showToast('回复失败，请检查AI配置', 'error');
        } finally {
            clearTimeout(bannerTimer);
            delete window._MCYT_CHAT_GENERATING[npcId];
            window.hideGeneratingBanner();
            if (window.G.currentChatNpc === npcId && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
        }
    };

})();
