/**
 * js/apps/chat/chat-prompt-group.js
 * 👥 微信去中心化群聊独立提示词架构引擎
 * 核心灵感与规范基于《Decentralized Group Chat & Natural Interaction Mechanics》
 * 架构特性：
 * 1. 彻底与单聊提示词物理分离，拒绝臃肿。
 * 2. 去中心化多线程生态：群聊不是围绕 {{y/n}} 旋转的独角戏，角色间拥有自主的社交轨道与争论日常。
 * 3. 拒绝“急刹车式单线程”与“聚光灯谄媚”：用户发言后，角色在推进原有话题的同时自然穿插与用户的互动，绝不孤立、绝不跪舔。
 * 4. 深度支持 {{y/n}} 与 {{user}} 宏变量动态替换。
 * 5. 支持统一调用模式与单角色独立调用模式的提示词组装。
 */

(function() {
    'use strict';

    /**
     * 🎭 宏变量替换引擎：将设定与对白中的 {{user}}、{{User}}、{{y/n}}、{{Y/N}} 自动替换为当前用户身份名称
     */
    function replaceGroupMacroVariables(text, userName = '用户') {
        if (!text || typeof text !== 'string') return text || '';
        const safeName = userName || '用户';
        return text
            .replace(/\{\{\s*user\s*\}\}/gi, safeName)
            .replace(/\{\{\s*y\/n\s*\}\}/gi, safeName);
    }

    /**
     * 🌟 统一调用模式 Prompt：单次 API 请求生成多位角色的交错发言
     */
    function buildGroupUnifiedPrompt({ group, members, recentDialogueText = '', currentUserName = '用户' }) {
        const safeUserName = currentUserName || '用户';
        
        let memberProfiles = members.map(m => {
            const cleanPersona = replaceGroupMacroVariables(m.persona || '一位性格鲜明的MC群友', safeUserName);
            return `- 「${m.name}」：${cleanPersona}`;
        }).join('\n');

        const sysPrompt = `
【Decentralized Group Chat & Natural Interaction Mechanics 去中心化自然群聊核心规范】
你正在模拟一个真实鲜活、多方喧闹、去中心化的Minecraft多人微信群聊「${group.name}」。
群内目前在场的NPC成员有：
${memberProfiles}
群内的人类玩家是：「${safeUserName}」。

【核心生态与去中心化铁律（绝对遵循）】：
1. 【多方混战与自主社交】：
   - 角色们拥有各自独立的人格、生活轨迹与社交偏好。群聊绝不是围绕「${safeUserName}」单人运转的舞台，而是一个充满生活烟火气与互动张力的社交空间。
   - 角色之间可以互相争论、开玩笑、互怼、讨论MC建筑红石技巧、熬夜、夜宵或分享各自的日常私事。
2. 【多线程并行与拒绝“急刹车”】：
   - 对话遵循多线程并行流逻辑：当「${safeUserName}」在群里发言时，角色之间原本正在聊的话题【绝对严禁突然紧急刹车或被清空】！
   - 角色必须在“继续推进原有对话/吐槽”的同时，顺畅自然地把「${safeUserName}」的话融进当下的交谈氛围里。
   - 【严禁两极分化】：严禁出现全员瞬间停止手头事情齐刷刷讨好「${safeUserName}」的虚假谄媚感；同时也【严厉禁止冷落、无视或孤立「${safeUserName}」】。
3. 【用户不说话时的自主运转】：
   - 如果「${safeUserName}」没有发言，群聊也绝不会陷入停滞。角色之间会自然地互怼、抛梗、接话、分享当下的动静。

【微信打字排版规范】：
1. 挑选在场的 1 到 3 位角色自然发言。允许某个活跃的角色连续发 2 条短消息。
2. 每条微信气泡必须严格使用专用标签输出：
   [MSG sender="角色名字"]消息内容[/MSG]
3. 【句尾绝对严禁加句号】！靠自然换行和停顿，句内可用空格代替逗号，还原手打微信习惯。
4. 【死刑级禁令】：绝对严禁使用任何括号 ()、星号 * 或描写动作神态心理（如"*笑了笑*"、"（吃着薯片）"）！手机微信屏幕对方只能看见纯文字！严禁输出思维链！
`.trim();

        const processedDialogue = replaceGroupMacroVariables(recentDialogueText, safeUserName);
        const userPrompt = processedDialogue
            ? `【最近群聊历史动态】：\n${processedDialogue}\n\n请群友们根据当前上下文自然接话流转：`
            : `【群聊刚刚开启】\n请群友们自由开启今天的日常话题或吐槽：`;

        return { sysPrompt, userPrompt };
    }

    /**
     * 🌟 单独调用模式 Prompt：针对单个 NPC 独立调用 API
     * 保留该角色的专属视角、生理时钟、好感度以及去中心化群聊反应
     */
    function buildGroupSingleMemberPrompt({ group, currentMember, otherMembers, recentDialogueText = '', currentUserName = '用户', allowMultiMsgs = true }) {
        const safeUserName = currentUserName || '用户';
        const cleanPersona = replaceGroupMacroVariables(currentMember.persona || '性格鲜明的MC群友', safeUserName);
        const otherNames = otherMembers.map(m => `「${m.name}」`).join('、');

        const sysPrompt = `
你正在微信多人多方群聊「${group.name}」中扮演群成员「${currentMember.name}」。
【你的档案】：
- 个人设定/性格：${cleanPersona}
- 当前群内其他成员：${otherNames || '其他群友'}
- 群内人类同伴：${safeUserName}
- 你对 ${safeUserName} 的好感度：${currentMember.favor || 50}/100

【去中心化多线程群聊交互准则】：
1. 【你在群聊里的活人站位】：
   - 你在群里打字发言，有自己的生活节奏和性格棱角。
   - 你正在看群里的聊天消息。你可以接其他群友的话、吐槽其他群友，也可以顺带着回应「${safeUserName}」。
   - 【严禁围绕旋转】：绝不要把每一句话都强行引向「${safeUserName}」，保持你在多人群聊里的真实社交边界。
   - 【拒绝冷漠也拒绝谄媚】：自然真诚，符合你的性格设定。
2. 【微信打字与消息条数规范】：
   - 句尾【绝对严禁加句号】！句内停顿优先用【空格】代替逗号。
   - 【死刑级禁令】：绝对严禁出现任何动作心理描写括号（如"（叹气）"、"*看了看屏幕*"）！
   - ${allowMultiMsgs ? '你可以随口发 1 条，或者兴奋/吐槽时连发 2 条短消息。' : '随口回复 1 条消息。'}
   - 你的每条发言必须严格包裹在：[MSG]消息内容[/MSG]
`.trim();

        const processedDialogue = replaceGroupMacroVariables(recentDialogueText, safeUserName);
        const userPrompt = processedDialogue
            ? `【当前群聊最新流转记录】：\n${processedDialogue}\n\n请「${currentMember.name}」发消息接话：`
            : `群里安静了一阵子，请「${currentMember.name}」随口冒泡发条消息：`;

        return { sysPrompt, userPrompt };
    }

    window.ChatPromptGroup = {
        replaceGroupMacroVariables,
        buildGroupUnifiedPrompt,
        buildGroupSingleMemberPrompt
    };

    console.log('✅ ChatPromptGroup 去中心化群聊独立提示词架构引擎已成功装载');
})();
