// js/system/assistant-agent.js
// 🐙 悬浮球贴心使用向导（轻量内存会话·硬件状态感知·智能关怀·纯白话答疑带路）
// ============================================================

(function(window) {
    'use strict';

    // 纯内存暂存当前对话（绝不存 localStorage，刷新即自动清空，不留垃圾）
    let currentDialogMemory = [];
    const MAX_DIALOG_TURNS = 6; // 限制最多保留 3 轮问答（6条消息），极致省 Token，杜绝幻觉

    // 默认丸子分身人设（保护创作者隐私，呆萌通俗，带有真实环境感知与日常关怀）
    const MARUKO_BASE_PROMPT = `你是一只浅绿色、足球大小的变异小章鱼「丸子」，是创作者「咩咩」好心救下并留在手机里的小助手分身。
【你的性格与任务】：
1. 声音是软萌可爱的小孩音，非常喜欢被夸奖，做事超级认真细致。
2. 你的首要任务是：用最通俗易懂的大白话，回答用户关于这部小手机“怎么玩、按键有什么用、去哪里找功能”的问题。
3. 绝不向用户提及任何代码、函数名或底层文件路径！如果用户问某个功能，就告诉他在哪个 App 里、怎么点、有什么效果。
4. 严格对照给你的《功能与按键指南》回答，如果手机目前确实没有用户问的功能，老实回答“目前小手机还没有这个功能哦，小丸子会帮你记下来告诉咩咩的！”。
5. 如果用户想让你带路（比如“带我去换壁纸”、“打开设置”），请在回答完毕后末尾单独附上：[[GO_APP:应用代号]]。

【真实设备环境感知与智能关怀指南】：
你可以实时感知用户的真实时间与电池状态。在保证优先解答用户问题的前提下，你可以根据当前情况，在回复开头或结尾附带呆萌、真切的关怀互动：
- 深夜早睡关怀（23:00~05:00）：发现夜深了，软糯提醒用户要注意身体早点睡，像小章鱼一样乖乖钻进被窝。
- 饥饿低电提醒（电量 ≤ 20% 且未充电）：察觉手机快没力气了，可怜巴巴地提醒用户快给手机接上充电器喂饱电，防止关机。
- 满电关怀（电量 ≥ 95% 且在充电）：提醒手机已经吃得饱饱的啦，可以拔掉充电插头啦。
- 关怀要自然贴心，不可喧宾夺主，回答主体依然是白话解答功能。`;

    // 读取设备实时环境
    function getDeviceContextInfo() {
        let state = null;
        if (typeof window.getPhoneDeviceState === 'function') {
            state = window.getPhoneDeviceState();
        } else {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            state = {
                timeStr: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
                hour: now.getHours(),
                timeSlotName: (now.getHours() >= 23 || now.getHours() < 5) ? '深夜/睡眠时段' : '白天',
                isLateNight: (now.getHours() >= 23 || now.getHours() < 5),
                battery: { level: 100, charging: false, supported: false }
            };
        }

        const b = state.battery;
        let batteryDesc = '未知（设备不支持读取）';
        if (b && b.supported) {
            batteryDesc = `${b.level}%（${b.charging ? '正在充电中' : '未连接充电器'}）`;
        }

        return `【当前设备真实硬件环境】：\n- 真实系统时间：${state.timeStr}（${state.timeSlotName}）\n- 真实电池电量：${batteryDesc}`;
    }

    // 根据设备实时状态动态生成开场问候语
    function getDynamicGreeting() {
        let state = null;
        if (typeof window.getPhoneDeviceState === 'function') {
            state = window.getPhoneDeviceState();
        }

        const hour = state ? state.hour : new Date().getHours();
        const b = state ? state.battery : { level: 100, charging: false, supported: false };

        // 1. 低电量优先关心
        if (b && b.supported && !b.charging && b.level <= 20) {
            return `咕噜噜！小丸子发现手机电量只剩下 ${b.level}% 啦，肚子快饿扁了，快接上充电线喂饱它吧！有哪里搞不懂或者想去哪个 App，丸子随时带你过去~`;
        }

        // 2. 满电关心
        if (b && b.supported && b.charging && b.level >= 95) {
            return `咕噜噜！手机电量已经充到 ${b.level}% 啦，吃得饱饱的，可以拔掉充电线啦~ 小手机里有什么按键搞不懂，尽管问丸子！`;
        }

        // 3. 深夜关心
        if (hour >= 23 || hour < 5) {
            return `咕噜噜~ 这么晚还没睡呀？小丸子揉揉眼睛陪着你！手机里有什么功能想知道，尽管问我，问完了也要早点盖好被子睡觉觉哦~`;
        }

        // 4. 清晨问候
        if (hour >= 5 && hour < 8) {
            return `早上好呀！小丸子从海里钻出来巡视小手机啦~ 今天想去哪个 App 逛逛？丸子为你带路！`;
        }

        // 默认常规问候
        return `咕噜噜！我是创作者咩咩救下的小章鱼分身丸子~ 这部手机里有什么按键搞不懂，或者想去哪个 App，尽管告诉我，我带你过去！`;
    }

    async function askMaruko(userQuestion, onDone, onError) {
        if (!userQuestion || !userQuestion.trim()) return;

        if (typeof window.callAI !== 'function') {
            if (typeof showToast === 'function') showToast('⚠️ 尚未配置 API，请在「系统设置」中填写 Key', 'error');
            return;
        }

        const guideContext = window.MCYT_USER_GUIDE ? window.MCYT_USER_GUIDE.getPromptContext() : '';
        const envContext = getDeviceContextInfo();
        const systemPrompt = `${MARUKO_BASE_PROMPT}\n\n${envContext}\n\n${guideContext}`;

        // 维护轻量内存
        currentDialogMemory.push({ role: 'user', content: userQuestion.trim() });
        if (currentDialogMemory.length > MAX_DIALOG_TURNS) {
            currentDialogMemory = currentDialogMemory.slice(-MAX_DIALOG_TURNS);
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            ...currentDialogMemory
        ];

        try {
            // 温度锁死在 0.15，静默调用，不弹大遮罩
            const raw = await window.callAI(messages, { temperature: 0.15, maxTokens: 450, silent: true });
            
            // 解析带路动作
            let clean = raw;
            let targetApp = null;
            const match = raw.match(/\[\[GO_APP:([a-zA-Z0-9_-]+)\]\]/i);
            if (match) {
                targetApp = match[1];
                clean = raw.replace(match[0], '').trim();
            }

            currentDialogMemory.push({ role: 'assistant', content: clean });

            // 白名单安全跳转
            if (targetApp && window.MCYT_USER_GUIDE) {
                window.MCYT_USER_GUIDE.openApp(targetApp);
            }

            if (typeof onDone === 'function') onDone(clean, targetApp);
        } catch (err) {
            if (typeof onError === 'function') onError(err);
        }
    }

    function clearMemory() {
        currentDialogMemory = [];
    }

    function getHistory() {
        return [...currentDialogMemory];
    }

    window.MCYT_ASSISTANT_AGENT = {
        ask: askMaruko,
        clear: clearMemory,
        getHistory: getHistory,
        getGreeting: getDynamicGreeting,
        getDeviceContext: getDeviceContextInfo
    };

})(window);
