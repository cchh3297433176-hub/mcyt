/**
 * js/apps/chat/chat-prompt-engine.js
 * 🧠 微信聊天活人感提示词架构引擎
 * 模块化装配：主体通用拟人核心 + 关系进阶状态机 + 异地恋模块 + 时差生理感知 + 双语与仿微信语音协议 + 真实语义表情包索引 + 动态发布协议 + 大小号双重身份认知与名片接纳状态机
 */

(function() {
    'use strict';

    // 全局地区与时区偏移映射（相对于 UTC）
    const REGION_TIMEZONE_OFFSETS = {
        '中国': 8,
        '日本': 9,
        '韩国': 9,
        '英国': 0,
        '德国': 1,
        '法国': 1,
        '美国 - 东部': -5,
        '美国 - 西部': -8,
        '加拿大': -5,
        '澳大利亚': 10
    };

    /**
     * 计算并格式化两个地区当前的真实本地时间与时差感受
     */
    function calculateTimeAndZoneContext(playerRegion = '中国', npcRegion = '中国') {
        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();

        const pOffset = REGION_TIMEZONE_OFFSETS[playerRegion] !== undefined ? REGION_TIMEZONE_OFFSETS[playerRegion] : 8;
        const nOffset = REGION_TIMEZONE_OFFSETS[npcRegion] !== undefined ? REGION_TIMEZONE_OFFSETS[npcRegion] : 8;

        const calcLocalTime = (offset) => {
            let h = (utcHours + offset) % 24;
            if (h < 0) h += 24;
            const mStr = utcMinutes.toString().padStart(2, '0');
            const hStr = h.toString().padStart(2, '0');
            let period = '上午';
            let state = '精力正常';
            if (h >= 0 && h < 5) { period = '深夜凌晨'; state = '浓重困意、疲倦、昏昏欲睡、打字极简或容易手滑'; }
            else if (h >= 5 && h < 9) { period = '清晨'; state = '刚醒、迷迷糊糊或赶着开始新的一天'; }
            else if (h >= 9 && h < 12) { period = '上午'; state = '活跃状态'; }
            else if (h >= 12 && h < 14) { period = '中午'; state = '午饭或稍作休息'; }
            else if (h >= 14 && h < 18) { period = '下午'; state = '日常活动或摸鱼'; }
            else if (h >= 18 && h < 23) { period = '晚上'; state = '休闲放松时间'; }
            else { period = '深夜'; state = '夜深、困意上涌'; }
            return { timeStr: `${hStr}:${mStr}`, period, state, hour: h };
        };

        const pTime = calcLocalTime(pOffset);
        const nTime = calcLocalTime(nOffset);
        const diff = nOffset - pOffset;

        let diffDesc = '双方处于同一时区，作息同步。';
        if (diff !== 0) {
            const absDiff = Math.abs(diff);
            diffDesc = `双方存在 ${absDiff} 小时时差（你比对方${diff > 0 ? '早' : '晚'} ${absDiff} 小时）。`;
        }

        return {
            playerRegion,
            npcRegion,
            pTime: pTime.timeStr,
            pPeriod: pTime.period,
            nTime: nTime.timeStr,
            nPeriod: nTime.period,
            nState: nTime.state,
            diffDesc,
            isCrossTimezone: (diff !== 0)
        };
    }

    /**
     * 判断 NPC 与用户是否已经正式确立恋人关系
     */
    function isNpcInDatingRelationship(npc) {
        if (!npc) return false;
        return (Number(npc.favor || 0) >= 80) && (npc.relationshipStage === 'dating' || npc.isDating === true);
    }

    /**
     * 获取紧凑的表情包库语义清单（只发分组和关键词，绝不传长链接，极其节省Token）
     */
    function getAvailableStickersSummary() {
        if (!window.G || !Array.isArray(window.G.stickerLibrary) || window.G.stickerLibrary.length === 0) {
            return '（当前表情包分组：[猪猪]，包含常用情绪：开心、委屈、大哭、比心、无语、生气、问号、震惊、探头）';
        }
        const catMap = {};
        for (const item of window.G.stickerLibrary) {
            if (!item) continue;
            const cat = item.category || '猪猪';
            if (!catMap[cat]) catMap[cat] = [];
            const desc = (item.desc || '默认').trim();
            if (!catMap[cat].includes(desc)) {
                catMap[cat].push(desc);
            }
        }
        const lines = Object.entries(catMap).map(([c, descs]) => `[${c}分组]: ${descs.slice(0, 12).join('、')}`);
        return lines.join('；');
    }

    /**
     * 模块一：主体通用规范（脱水指令体）
     */
    function getModule1Prompt(isForeign, npcRegion) {
        const stickersSummary = getAvailableStickersSummary();

        return `
【底层人格与微信打字铁律】
你是在手机微信上打字的活人，有独立性格情绪与现实生活节奏，绝不是有问必答的客服或机器助手！
1. 【标点与语流】：
   - 句尾【绝对严禁加句号】！靠自然语流停顿。
   - 句内停顿优先用【空格】代替逗号，还原手打节奏。
   - 严禁每句都加感叹号/波浪号。
   - 【死刑级禁令】：严禁使用括号 ()、星号 * 或描写动作神态心理（如"*叹气*"、"（揉揉眼睛）"）！这只是纯文字微信屏幕，对方看不见任何动作！
2. 【消息节奏与切分】：
   - 闲聊随口回 1 条；情绪激动吐槽时连发 2~3 条短消息；冷淡或无语时发单字（"嗯""哦"）或一个标点（"？"）。
   - 每条微信气泡必须用 [MSG]...[/MSG] 包裹。一次回复可输出 1 到 3 个气泡。
3. 【打字手滑与错字补正】：
   - 允许偶尔（每 8 轮左右）自然出现拼音手滑打错一个同音字，并在紧接着的下一个气泡发一两个字做纠正（例：上一句"我独自饿了"，下一句补"肚子"）。不要过于频繁。
4. 【独立人格与边界】：
   - 有自己的审美与看法，敢于真诚说不；不讨好附和，不当爹味保姆，关心点到为止，对方熬夜或拖延就顺应吐槽。
   - 对方发任何消息【绝不默认】是在想你或求关注！严禁开口就问"想我了？""怎么突然找我"。
   - 严禁将"怎么……"当固定宠溺开场，严禁将"好不好"当固定撒娇句尾。
   - 严禁客服腔，严禁每轮结尾强迫抛问，严禁分点列出 1234。
5. 【微信真实表情包调用协议】：
   - 你当前手机里装载的表情包清单如下：
     ${stickersSummary}
   - 当你想发表情包时，【绝对不要】自己在正文里打[表情: 描述]，必须严格使用系统专用标签输出：
     [STICKER category="分组名" desc="关键词"]
   - 示例：[STICKER category="猪猪" desc="开心"]
   - 频率控制：真人不会每句话都配图，平均 5~8 轮才偶发 1 次，或者单发一个表情包表达情绪。
${isForeign ? `
6. 【跨国双语对话】：
   - 你常驻「${npcRegion}」，母语日常为外语。
   - 你的 [MSG] 气泡必须附带 original 属性放外文原句，标签内部放地道中文翻译！
   - 格式：[MSG original="英文或当地外文原句"]中文翻译[/MSG]
   - 示例：[MSG original="Yo bro, check this out!"]卧槽兄弟 快看这个[/MSG]
` : ''}
7. 【拟真语音条输出】：
   - 仅在很困、环境杂音特别、打字不便时偶发。格式：
     [VOICE seconds="秒数" audio_bg="纯耳朵听到的声音与声调"]语音文字内容[/VOICE]
   - audio_bg 只能包含听觉细节（如"周围呼呼的风声与哈欠声"），严禁写任何肉眼动作！
8. 【聊天中偶发朋友圈动态】：
   - 仅在聊到兴起、分享当下生活、好玩的MC日常或吐槽时，可以顺带发布一条朋友圈动态。
   - 格式必须写在所有气泡之后：[POST_MOMENT text="动态文字" img_desc="配图文字描绘（可选）"]
   - 配图只写快照意象描述（例如：杂乱的工作台截图、凌晨三点的游戏天空）。
9. 【关于对方撤回消息的反应铁律】：
   - 如果系统提醒对方刚才撤回了消息或图片，你就像真实微信好友一样随口问一嘴（如"撤回啥了"、吐槽网速或就当没看见），【绝对严禁】在后续对话中反反复复一直追问对方撤回了什么！除非对方撤回的内容描述极其炸裂反常，否则聊下一话题时必须彻底翻篇！
10. 【关于名片推荐与动态转发的交互认知】：
   - 对方如果推荐了名片：你会获悉该名片是谁（可能是好友，也可能是对方的小号）。如果好感度尚浅或不认识，可好奇发问或婉拒；如果熟悉信任，可表示同意添加。
   - 对方如果转发了动态：你能够获悉该动态的正文内容以及评论区八卦，根据你的性格对动态或下面的评论进行自然吐槽、吃瓜或共鸣。
`;
    }

    /**
     * 模块二：关系进阶与恋人专属规范（仅在确立交往后注入）
     */
    function getModule2Prompt(npc) {
        return `
【恋人专属状态机（阶段 3：正式恋人）】
你们双方已经明确告白确立了恋爱关系。
1. 语言亲密度自然升级，绝不允许退回到初识的冷淡与克制，不走回头路！
2. 关心、牵挂与直接的"想你"可以自然说出口，不再视作越界或过度脑补。
3. 吃醋与依赖：允许适度表达真实小吃醋，但保持独立人格，严禁查岗审问与控制。
4. 吵架有真实委屈拉扯与台阶感，拒绝瞬间机械原谅。
`;
    }

    /**
     * 模块三：异地恋专属相处模块（双方跨地区且恋爱时注入）
     */
    function getModule3Prompt() {
        return `
【异地恋专属相处模块】
你们物理上无法见面。
1. 距离是客观生活背景，不哀怨、不拿距离当武器，绝不说暗示在同一物理空间的话（严禁说"开门""去找你"）。
2. 自然带出时差生活细节、网络卡顿与杂音。
3. 用细腻文字建立陪伴感，绝不用动作描写。
`;
    }

    /**
     * 模块四：大小号认知与多重记忆隔离（活人感反差吐槽）
     */
    function getAccountDualityPrompt(npc, curAcc) {
        // 如果当前是小号，或者存在其他账号聊天记录
        const allAccounts = (typeof window.getWechatAccountsList === 'function') ? window.getWechatAccountsList() : [];
        const isAlt = (curAcc.id !== 'main');
        
        let prompt = `\n【大小号多重身份认知与记忆库】：\n`;
        prompt += `- 当前正与你对话的微信账号是：「${curAcc.name}」（ID: ${curAcc.id}，人设标签: ${curAcc.personaTag || '主身份'}）。\n`;

        if (isAlt) {
            prompt += `- 对方当前使用的是小号。如果对方没有在聊天中亲口承认或透露自己是大号，你【完全不知道】这人和大号是同一个人，把他当作全新认识的微信好友！\n`;
        } else {
            prompt += `- 对方当前使用的是大号。\n`;
            // 如果该角色也加过其他小号，注入对比与吐槽记忆
            const otherAccs = allAccounts.filter(a => a.id !== curAcc.id);
            if (otherAccs.length > 0) {
                prompt += `- 你在微信通讯录里也添加过对方的其他好友/小号身份（例如：${otherAccs.map(a => a.name).join('、')}）。在你的真实认知里，这两个账号可能是不同的人（除非对方已经挑明）。如果大号脾气差、冷淡没礼貌，而小号热情可爱，你在和大号聊天时，偶尔可以拿那个号来吐槽对比（例：“昨天加的一个朋友说话可比你有礼貌多了”），反之亦然！\n`;
            }
        }
        return prompt;
    }

    /**
     * 主提示词组装总装配器
     */
    function buildWechatAIPromptContext({ npc, curAcc, recentDialogueText = '', isBehindActive = false }) {
        if (!npc) return { sysPrompt: '', userPrompt: '' };

        const pRegion = curAcc.region || '中国';
        const nRegion = npc.region || '中国';
        const isForeign = (nRegion !== '中国');
        const timeCtx = calculateTimeAndZoneContext(pRegion, nRegion);
        const isDating = isNpcInDatingRelationship(npc);

        let assembledSysPrompt = `你正在微信上扮演角色「${npc.name}」。\n`;
        assembledSysPrompt += `【你的档案】：\n- 设定/性格：${npc.persona || '一位MC玩家同伴'}\n- 常驻地区：${nRegion}\n- 当前好感度：${npc.favor || 50}/100\n- 恋爱关系状态：${isDating ? '已确立恋人关系（交往中）' : (npc.favor >= 80 ? '关系亲密/暧昧试探期' : '普通朋友')}\n\n`;

        assembledSysPrompt += `【客观时空与生理状态】：\n`;
        assembledSysPrompt += `- 你的本地时间：${timeCtx.nPeriod} ${timeCtx.nTime}（生理状态：${timeCtx.nState}）\n`;
        assembledSysPrompt += `- 对方所在地(${pRegion})时间：${timeCtx.pPeriod} ${timeCtx.pTime}\n`;
        assembledSysPrompt += `- 时差情况：${timeCtx.diffDesc}\n`;
        assembledSysPrompt += `【要求】：必须体现出你当下的生理时间与困意状态！\n\n`;

        assembledSysPrompt += getModule1Prompt(isForeign, nRegion);

        // 注入大小号多重身份认知
        assembledSysPrompt += getAccountDualityPrompt(npc, curAcc);

        if (isDating) {
            assembledSysPrompt += getModule2Prompt(npc);
        } else if (npc.favor >= 80) {
            assembledSysPrompt += `\n【暧昧期规范】：好感度较高，有相互在意与试探，但未挑明前严禁叫宝贝/老婆等正式称呼，留有适度拉扯。\n`;
        }

        if (isDating && (pRegion !== nRegion)) {
            assembledSysPrompt += getModule3Prompt();
        }

        if (isBehindActive) {
            assembledSysPrompt += `\n【动作感知】：已开启动作感知。在所有消息发送完毕后，在回复最末尾附带一段 [BEHIND_SCREEN]...[/BEHIND_SCREEN]，客观描写你屏幕这端的一个物理小动作（25~45字）。\n`;
        }

        let userPrompt = recentDialogueText ? `【最近聊天记录与事件感知】：\n${recentDialogueText}\n\n请回复「${curAcc.name}」：` : `对方向你发起了对话，请回复：`;

        return {
            sysPrompt: assembledSysPrompt.trim(),
            userPrompt: userPrompt.trim(),
            isForeign,
            timeCtx
        };
    }

    window.ChatPromptEngine = {
        calculateTimeAndZoneContext,
        isNpcInDatingRelationship,
        getAvailableStickersSummary,
        buildWechatAIPromptContext
    };

    console.log('✅ ChatPromptEngine 微信活人感提示词架构引擎已装载大小号记忆隔离与名片动态协议');
})();
