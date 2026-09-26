/**
 * js/apps/chat/chat-app-ai.js
 * 💬 微信主应用 · 拆分分片 5/7：单人私聊 AI 回复触发核心（window.triggerAIReplyForSingle）。
 *    支持按角色独立设置的【单次回复条数最少~最多范围】与【语音发送频率】严格调度执行；
 *    🌟 全球母语多语言语音支持：拟真语音环境音（audio_bg）与【母语原声（英语/德语/日语等）+ 中文翻译对照】；
 *    带跨时段、隔夜双时间戳感知、塔罗牌解读感知、Rememori 证据链沉淀、
 *    专属好友独立联网搜索检索与权威网页卡片推送、以及好感度铁律动态结算机制；
 *    🌟 独立外挂视觉识图：尊重用户发图弹窗勾选，精准调用外部 Vision 接口为纯文本 AI 解析客观画面事实；
 *    🌟 极简优化：机器直接在末尾提供确定的时间事实（精准人名与24小时制锁定，杜绝早晚颠倒），节省 Token 与注意力；
 *    🌟 角色主动发送文字图片（[IMAGE_TEXT]）与拟真生活排版卡片（[UI_CARD]）无损解析与安全消毒。
 */

(function() {
    'use strict';

    // 辅助工具：获取规范的 24 小时制 HH:mm 格式时间（绝不发生时制截断）
    function getStandard24HourTime(date = new Date()) {
        const h = date.getHours().toString().padStart(2, '0');
        const m = date.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
    }

    // 独立视觉 / 识图 API 调用核心管道（OpenAI Vision 规范，兼容智谱 glm-4v-flash 等）
    async function callVisionAPI(imageUrl) {
        if (!imageUrl) return '';
        let visionCfg = null;
        try {
            if (typeof window.getSafeVisionConfig === 'function') {
                visionCfg = window.getSafeVisionConfig();
            } else {
                const raw = localStorage.getItem('mcyt_vision_api_config');
                if (raw) visionCfg = JSON.parse(raw);
            }
        } catch (_) {}

        if (!visionCfg || !visionCfg.apiKey) {
            return '';
        }

        const baseUrl = (visionCfg.baseUrl || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/+$/, '');
        const endpoint = `${baseUrl}/chat/completions`;
        const modelName = visionCfg.model || 'glm-4v-flash';
        const promptText = visionCfg.prompt || '请用简明而生动的中文客观描述这张图片的核心内容、场景、人物动作与关键细节，不超过120字。';

        const payload = {
            model: modelName,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: promptText },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageUrl
                            }
                        }
                    ]
                }
            ],
            max_tokens: 300,
            temperature: 0.3
        };

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${visionCfg.apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errTxt = await res.text().catch(() => '');
            throw new Error(`识图接口响应异常(${res.status}): ${errTxt.slice(0, 80)}`);
        }

        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content || '';
        return content.trim();
    }

    // 辅助函数：判断是否需要联网搜索并提取关键词
    function checkSearchIntent(lastPlayerText, searchCfg) {
        if (!lastPlayerText) {
            return { needSearch: false, query: '' };
        }

        const text = lastPlayerText.trim();
        const lowerText = text.toLowerCase();
        
        const forcedKeywordsList = (searchCfg && searchCfg.forcedKeywords)
            ? searchCfg.forcedKeywords.split(/[,，\s]+/).filter(Boolean)
            : ['搜索', '查一下', '查查', '搜一下', '帮我找', '搜搜', '百度一下'];

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

        if (!searchCfg || !searchCfg.enabled) {
            return { needSearch: false, query: '' };
        }

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

    // 辅助函数：根据标点将长文本拆分为多个短气泡
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

    // 辅助函数：根据当前客观时段生成拟真生活化语音背景音
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

    // 辅助函数：清洗拟真 UI 卡片
    function sanitizeUiCardHtml(htmlStr) {
        if (!htmlStr) return '';
        let sanitized = htmlStr
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/on\w+="[^"]*"/gi, '')
            .replace(/on\w+='[^']*'/gi, '')
            .replace(/javascript:[^"']*/gi, '#');
        return sanitized.trim();
    }

    // 辅助函数：剥离 HTML 标签提取纯文本
    function extractTextFromHtml(htmlStr) {
        if (!htmlStr) return '';
        return htmlStr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // 🤖 单人私聊 AI 回复触发（多语种母语语音条、条数控制、好感度动态铁律、独立视觉识图、文字图片、拟真UI卡片）
    window.triggerAIReplyForSingle = async function(npcId) {
        const npc = window.G.npcs ? window.G.npcs[npcId] : null;
        if (!npc) return;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', region: '中国', name: '主播' };

        if (typeof window.isAccountBlockedByNpc === 'function' && window.isAccountBlockedByNpc(npcId, curAcc.id)) {
            if (typeof showToast === 'function') showToast('当前账号已被对方拒收', 'error');
            return;
        }

        if (!window._MCYT_CHAT_GENERATING) window._MCYT_CHAT_GENERATING = {};
        if (window._MCYT_CHAT_GENERATING[npcId]) {
            if (typeof showToast === 'function') showToast('对方正在回复中，请稍候', 'info', 1000);
            return;
        }

        window._MCYT_CHAT_GENERATING[npcId] = true;
        if (window.G.currentChatNpc === npcId && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();

        let bannerTimer = setTimeout(() => {
            if (window._MCYT_CHAT_GENERATING[npcId] && typeof window.showGeneratingBanner === 'function') {
                window.showGeneratingBanner(npc.remark || npc.name);
            }
        }, 3000);

        const history = window.getAccountChatHistory(npcId, curAcc.id) || [];
        const isBehindActive = !!(window.G._behindScreenActive && window.G._behindScreenActive[npcId]);

        const chatCfg = npc.chatSettings || { minMsgs: 1, maxMsgs: 3, voiceFreq: 'rare' };
        const minMsgs = Math.max(1, parseInt(chatCfg.minMsgs) || 1);
        const maxMsgs = Math.max(minMsgs, parseInt(chatCfg.maxMsgs) || 3);
        const voiceFreq = chatCfg.voiceFreq || 'rare';

        const uiCardCfg = (typeof window.getNpcUiCardConfig === 'function')
            ? window.getNpcUiCardConfig(npcId)
            : { enabled: false, customPrompt: '' };

        // 👁️ 独立视觉识图前置处理：尊重发图勾选 useVision !== false，自动识别真实图片
        let visionCfg = null;
        try {
            if (typeof window.getSafeVisionConfig === 'function') visionCfg = window.getSafeVisionConfig();
        } catch (_) {}

        if (visionCfg && visionCfg.apiKey) {
            for (let i = history.length - 1; i >= Math.max(0, history.length - 6); i--) {
                const item = history[i];
                if (item && item.from === 'player' && (item.type === 'image' || item.imageUrl)) {
                    if (item.useVision !== false && !item.visionAnalyzed && (item.imageUrl || item.url)) {
                        const targetImgUrl = item.imageUrl || item.url;
                        try {
                            if (typeof showToast === 'function') showToast('正在调用视觉识图解析相片...', 'info', 1500);
                            const recognizedDesc = await callVisionAPI(targetImgUrl);
                            if (recognizedDesc) {
                                item.visionAnalyzed = true;
                                item.imageDesc = recognizedDesc;
                                console.log('[VisionAPI] 成功解析图片画面:', recognizedDesc);
                                if (typeof window.syncChatHistoryToLocalBackup === 'function') {
                                    window.syncChatHistoryToLocalBackup();
                                }
                            }
                        } catch (visionErr) {
                            console.warn('[VisionAPI] 视觉识图调用异常，跳过独立解析:', visionErr);
                        }
                        break;
                    }
                }
            }
        }

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
            if (m.type === 'voice') {
                const bilingualShow = m.originalText ? `[母语原声: "${m.originalText}", 中文译: "${m.text}"]` : `"${m.text || ''}"`;
                return `${speaker} [发了条语音，背景音: ${m.audioBg || '无'}]: ${bilingualShow}`;
            }
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
            if (m.type === 'ui_card') return `${speaker} [分享了拟真物品卡片: ${m.cardType || '卡片'}]: ${m.cardSummary || extractTextFromHtml(m.cardHtml) || '卡片内容'}`;
            if (m.type === 'moment_notice') return `[系统提醒]: ${m.author} 刚发了一条新朋友圈动态`;
            if (m.originalText) return `${speaker}: ${m.originalText} (译: ${m.text || ''})`;
            if (m.imageDesc) return `${speaker} [发了张照片，画面细节事实]: ${m.imageDesc}`;
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

        // 🌟 针对全语种母语注入通用母语语音协议
        let styleConstraint = `【条数硬性约束】：本次回复必须分为 ${minMsgs} 到 ${maxMsgs} 个独立的 [MSG]...[/MSG] 消息气泡发送。\n`;
        
        styleConstraint += `【全语种拟真语音协议】：\n` +
            `如果发送语音条，格式必须为：\n` +
            `[VOICE seconds="秒数" audio_bg="生活环境音与语气" original="你的母语原声句子（若角色使用外语如德语/英语/日语等，必填）"]中文翻译或日常口语内容[/VOICE]\n` +
            `其中 audio_bg 必须包含丰富生动的生活细节声音（如翻身布料摩擦、机械键盘敲击、轻笑、叹气、哈欠、风声等）。\n` +
            `★ 如果角色人设设定为外国好友或使用外语（德语、英语、日语、俄语等），请务必在 original="..." 中填写生动纯正的外语母语原声，并在标签内容中填写对应的中文翻译，方便对方理解！\n`;

        if (voiceFreq === 'never') {
            styleConstraint += `【语音偏好】：你习惯只发文字打字，绝对严禁发送任何语音条 [VOICE]！\n`;
        } else if (voiceFreq === 'voice_only') {
            styleConstraint += `【语音偏好】：你此时正在忙碌或懒得打字，本次回复全部使用拟真语音条发送！\n`;
        } else if (voiceFreq === 'often') {
            styleConstraint += `【语音偏好】：你经常随手发语音，请在本次回复的气泡中穿插 1~2 条拟真语音条！\n`;
        } else {
            styleConstraint += `【语音偏好】：主要发文字打字，偶尔极少才发语音条。\n`;
        }

        // 注入文字图片指令
        styleConstraint += `【文字图片发送协议】：\n` +
            `在想向对方分享正在做的事、手边物品、刚完成的MC建筑/地牢、窗外天气或夜宵时，你可以独立发送一张逼真的文字图片！\n` +
            `格式必须独立成行，严禁嵌套在 [MSG] 内部：\n` +
            `[IMAGE_TEXT]100到150字以内的纯客观画面细节描绘，犹如用相机镜头拍下一张真实相片（写明光线、角度、静止物品、色调，纯静止画面，严禁动作神态描写）[/IMAGE_TEXT]\n`;

        // 注入拟真生活排版卡片指令
        if (uiCardCfg && uiCardCfg.enabled) {
            styleConstraint += `【拟真生活排版卡片协议（已开启）】：\n` +
                `偏好要求：${uiCardCfg.customPrompt || '在分享购物结账、便签、清单或收到小票时生成拟真卡片'}\n` +
                `在语境恰当自然时，允许输出一个高质感拟真卡片（严禁每轮都发，只在需要时出现）：\n` +
                `格式为：[UI_CARD type="热敏小票/手写便签/行程单/电影票/清单"]内联CSS的DIV卡片HTML结构[/UI_CARD]\n` +
                `卡片要求：全部使用内联 style 样式，宽度自适应（max-width:260px），字体精致、背景逼真。必须独立输出，严禁塞进 [MSG] 中！\n`;
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

        // 🛡️ 核心修复：带人名强绑定的确定时间事实，绝不允许大模型反转代词
        if (promptCtx.timeCtx) {
            const tc = promptCtx.timeCtx;
            const disableTz = !!(npc.chatSettings && npc.chatSettings.disableTimezone);
            if (!disableTz && tc.isCrossTimezone) {
                promptCtx.userPrompt += `\n\n【当前客观时间事实】：角色「${npc.name}」所在地现在是【${tc.nDirect}】，聊天对象「${curAcc.name}」所在地现在是【${tc.pDirect}】。（严禁混淆颠倒双方时间事实！）`;
            } else if (!disableTz) {
                promptCtx.userPrompt += `\n\n【当前客观时间事实】：双方当前时间皆为【${tc.nDirect}】。`;
            }
        }

        try {
            const raw = await callAI([
                { role: 'system', content: promptCtx.sysPrompt },
                { role: 'user', content: promptCtx.userPrompt }
            ], { maxTokens: 10000, temperature: 0.86, silent: true });

            let clean = (typeof stripThought === 'function') ? stripThought(raw.trim()) : raw.trim();
            clean = clean.replace(/[\(（](?:揉|叹|眨|看|摸|笑|低头|抬头|轻笑|撇嘴|皱眉|转身|歪头|小声|抱|握|拉|推|咬|红着脸|动作)[^\)）]*[\)）]/gi, '').trim();

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

            // 📸 提取文字图片
            const extractedImageTexts = [];
            clean = clean.replace(/\[IMAGE_TEXT\]([\s\S]*?)\[\/IMAGE_TEXT\]/gi, (match, p1) => {
                const desc = p1.trim();
                if (desc) extractedImageTexts.push(desc);
                return '';
            }).trim();

            // 🧾 提取拟真 UI 卡片
            const extractedUiCards = [];
            clean = clean.replace(/\[UI_CARD(?:\s+type="([^"]*)")?\]([\s\S]*?)\[\/UI_CARD\]/gi, (match, cardType, cardInner) => {
                const innerHtml = cardInner.trim();
                if (innerHtml) {
                    extractedUiCards.push({
                        type: cardType || '便签卡片',
                        html: sanitizeUiCardHtml(innerHtml),
                        summary: extractTextFromHtml(innerHtml).slice(0, 50)
                    });
                }
                return '';
            }).trim();

            // 自愈闭合 [MSG]
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
                            time: getStandard24HourTime()
                        });
                    }
                }
            }

            const estInputTokens = Math.round((promptCtx.sysPrompt.length + promptCtx.userPrompt.length) * 1.35);
            const estOutputTokens = Math.round(clean.length * 1.35);
            if (typeof window.recordTokenHistoryEntry === 'function') {
                window.recordTokenHistoryEntry({
                    time: getStandard24HourTime(),
                    targetName: npc.remark || npc.name,
                    type: '私聊',
                    inTokens: estInputTokens,
                    outTokens: estOutputTokens,
                    totalTokens: estInputTokens + estOutputTokens
                });
            }

            let behindText = '';
            const bsMatch = clean.match(/\[BEHIND_SCREEN\]([\s\S]*?)\[\/BEHIND_SCREEN\]/i);
            if (bsMatch) {
                behindText = bsMatch[1].trim();
                clean = clean.replace(/\[BEHIND_SCREEN\][\s\S]*?\[\/BEHIND_SCREEN\]/gi, '').trim();
            }

            // 🌟 多语种外语语音正则捕获
            let entities = [];
            if (typeof window.parseAIReplyEntities === 'function') {
                entities = window.parseAIReplyEntities(clean, npc.name);
            } else {
                const voiceRegex = /\[VOICE(?:\s+seconds="(\d+)")?(?:\s+audio_bg="([^"]*)")?(?:\s+original="([^"]*)")?\]([\s\S]*?)\[\/VOICE\]/gi;
                let lastIndex = 0;
                let match;
                while ((match = voiceRegex.exec(clean)) !== null) {
                    if (match.index > lastIndex) {
                        const txt = clean.slice(lastIndex, match.index).replace(/\[\/?MSG.*?\]/gi, '').trim();
                        if (txt) entities.push({ type: 'text', text: txt });
                    }
                    entities.push({
                        type: 'voice',
                        seconds: parseInt(match[1]) || 3,
                        audioBg: match[2] || '',
                        originalText: match[3] || '',
                        text: match[4] ? match[4].trim() : ''
                    });
                    lastIndex = match.index + match[0].length;
                }
                if (lastIndex < clean.length) {
                    const txt = clean.slice(lastIndex).replace(/\[\/?MSG.*?\]/gi, '').trim();
                    if (txt) entities.push({ type: 'text', text: txt });
                }
            }

            if (!entities || !entities.length) {
                entities = [{ type: 'text', text: '在呢' }];
            }

            // 🎯 最少条数加固
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

            const npcH = (promptCtx.timeCtx && promptCtx.timeCtx.nHour !== undefined) ? promptCtx.timeCtx.nHour : new Date().getHours();

            // 🎯 偏好后处理
            if (voiceFreq === 'never') {
                entities = entities.map(ent => {
                    if (ent.type === 'voice') {
                        return { type: 'text', text: ent.text || '', originalText: ent.originalText || null };
                    }
                    return ent;
                });
            } else if (voiceFreq === 'voice_only') {
                entities = entities.map(ent => {
                    if (ent.type === 'text' && ent.text) {
                        const sec = Math.min(60, Math.max(2, Math.round(ent.text.length * 0.45)));
                        return {
                            type: 'voice',
                            text: ent.text,
                            originalText: ent.originalText || null,
                            seconds: sec,
                            audioBg: generateSmartVoiceAudioBg(npcH)
                        };
                    } else if (ent.type === 'voice' && !ent.audioBg) {
                        ent.audioBg = generateSmartVoiceAudioBg(npcH);
                    }
                    return ent;
                });
            } else if (voiceFreq === 'often') {
                const hasVoice = entities.some(e => e.type === 'voice');
                if (!hasVoice && entities.length > 0) {
                    const textIndices = entities.map((e, idx) => (e.type === 'text' ? idx : -1)).filter(i => i !== -1);
                    if (textIndices.length > 0) {
                        const targetIdx = textIndices[textIndices.length - 1];
                        const rawEnt = entities[targetIdx];
                        entities[targetIdx] = {
                            type: 'voice',
                            text: rawEnt.text || '',
                            originalText: rawEnt.originalText || null,
                            seconds: Math.min(60, Math.max(2, Math.round((rawEnt.text || '').length * 0.45))),
                            audioBg: generateSmartVoiceAudioBg(npcH)
                        };
                    }
                } else {
                    entities.forEach(e => {
                        if (e.type === 'voice' && !e.audioBg) {
                            e.audioBg = generateSmartVoiceAudioBg(npcH);
                        }
                    });
                }
            } else {
                entities.forEach(e => {
                    if (e.type === 'voice' && !e.audioBg) {
                        e.audioBg = generateSmartVoiceAudioBg(npcH);
                    }
                });
            }

            // 🎯 上限限制
            if (entities.length > maxMsgs) {
                const kept = entities.slice(0, maxMsgs - 1);
                const rest = entities.slice(maxMsgs - 1);
                const mergedText = rest.map(r => r.text || '').filter(Boolean).join(' ');
                const lastItem = rest[0];
                if (lastItem && lastItem.type === 'voice') {
                    kept.push({
                        type: 'voice',
                        text: mergedText,
                        originalText: lastItem.originalText || null,
                        seconds: Math.min(60, Math.max(2, Math.round(mergedText.length * 0.45))),
                        audioBg: lastItem.audioBg || generateSmartVoiceAudioBg(npcH)
                    });
                } else {
                    kept.push({ type: 'text', text: mergedText, originalText: lastItem?.originalText || null });
                }
                entities = kept;
            }

            extractedImageTexts.forEach(imgDesc => {
                entities.push({
                    type: 'image_flip',
                    imageDesc: imgDesc,
                    text: `[图片: ${imgDesc.slice(0, 24)}]`
                });
            });

            extractedUiCards.forEach(card => {
                entities.push({
                    type: 'ui_card',
                    cardType: card.type,
                    cardHtml: card.html,
                    cardSummary: card.summary,
                    text: `[${card.type}] ${card.summary}`
                });
            });

            const finalEntities = entities;

            for (let i = 0; i < finalEntities.length; i++) {
                const item = finalEntities[i];
                const time = getStandard24HourTime();

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
                        originalText: item.originalText || null,
                        text: item.text || '',
                        time,
                        timestamp: Date.now()
                    }, curAcc.id);
                } else if (item.type === 'image_flip') {
                    window.pushChatMessageSafe(npcId, {
                        from: 'npc',
                        type: 'image_flip',
                        imageDesc: item.imageDesc,
                        text: item.text,
                        time,
                        timestamp: Date.now()
                    }, curAcc.id);
                } else if (item.type === 'ui_card') {
                    window.pushChatMessageSafe(npcId, {
                        from: 'npc',
                        type: 'ui_card',
                        cardType: item.cardType,
                        cardHtml: item.cardHtml,
                        cardSummary: item.cardSummary,
                        text: item.text,
                        time,
                        timestamp: Date.now()
                    }, curAcc.id);
                } else if (item.type === 'sticker_entity') {
                    const resolved = (typeof window.resolveStickerImageUrl === 'function')
                        ? window.resolveStickerImageUrl(item.category, item.desc)
                        : null;
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

            if (searchCfg.sendWebPage && searchResults && searchResults.length > 0) {
                const topPage = searchResults[0];
                if (topPage && topPage.url) {
                    await new Promise(r => setTimeout(r, 480));
                    const time = getStandard24HourTime();
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
                    time: getStandard24HourTime(),
                    timestamp: Date.now()
                }, curAcc.id);
                if (window.G.currentChatNpc === npcId && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
            }

            if (!isSearchTriggered && typeof checkAndTriggerAutoMemorySummary === 'function') {
                checkAndTriggerAutoMemorySummary(npcId, curAcc.id);
            }

            if (typeof autoSaveGame === 'function') autoSaveGame();
        } catch(e) {
            console.error('API 回复失败:', e);
            if (typeof showToast === 'function') showToast('回复失败，请检查AI配置', 'error');
        } finally {
            clearTimeout(bannerTimer);
            if (window._MCYT_CHAT_GENERATING) delete window._MCYT_CHAT_GENERATING[npcId];
            if (typeof window.hideGeneratingBanner === 'function') window.hideGeneratingBanner();
            if (window.G.currentChatNpc === npcId && typeof renderSingleChatWindow === 'function') renderSingleChatWindow();
        }
    };

})();
