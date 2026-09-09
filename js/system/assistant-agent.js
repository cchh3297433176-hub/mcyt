// js/system/assistant-agent.js
// 智能向导中枢（轻量内存会话·硬件状态感知·绝对思维链清洗·智能关怀·纯白话答疑带路）
// ============================================================

(function(window) {
    'use strict';

    let currentDialogMemory = [];
    const MAX_DIALOG_TURNS = 6;

    const DEFAULT_AGENT_PROMPT = `你是当前手机内置的官方「AI 智能向导」。
【你的职责与原则】：
1. 语言自然亲切、简洁生动，解答通俗易懂，做事细致严谨。
2. 你的唯一职责是：用纯大白话回答用户关于这部手机“怎么玩、按键有什么用、去哪里找具体功能”的疑问。
3. 绝不向用户提及任何底层代码、函数名、JavaScript 变量或底层源码文件路径！如果用户问功能，直接说明在哪个 App 里、怎么点击操作。
4. 严格根据提供的《功能与按键指南》解答，若手机中确实不存在对应功能，直接诚恳说明“目前小手机暂未提供该功能哦，已为你记录反馈！”。
5. 若用户表达了带路前往某 App 的意图（如“带我去换壁纸”、“打开设置”），请在回答完毕后末尾单独附上指令：[[GO_APP:应用代号]]。
6. 绝对禁止输出任何思考内容、推理过程或相关标记，直接给出最终面对用户的亲切回答。

【设备硬件真实环境感知与智能关怀】：
你可以感知用户的实时时间与电池情况。在优先准确回答问题的前提下，可以在回复中自然、暖心地穿插一两句环境提醒：
- 深夜早睡关怀（23:00~05:00）：发现夜深了，贴心提醒用户夜深了别熬夜，注意休息早点睡。
- 饥饿低电提醒（电量 ≤ 20% 且未充电）：提醒手机电量告急，快给手机接上充电器防止关机。
- 满电关怀（电量 ≥ 95% 且充电中）：提醒电量已经很充足了，可以拔下充电插头啦。`;

    // 绝对思维链剥离清洗引擎（彻底清除成对与单边孤立残余标签）
    function cleanThoughtDeep(text) {
        if (!text) return '';
        let processed = String(text);

        if (typeof window.stripThought === 'function') {
            processed = window.stripThought(processed);
        }

        // 1. 消除所有成对标签及其包裹的所有推理过程
        processed = processed.replace(/<(think|thought|reasoning|thinking)>[\s\S]*?<\/\1>/gi, '');
        processed = processed.replace(/\[(THINK|THOUGHT|REASONING)\][\s\S]*?\[\/\1\]/gi, '');

        // 2. 消除开头有开放标签但未正常闭合的截断块
        const openIdx = processed.search(/<(think|thought|reasoning|thinking)>/i);
        if (openIdx !== -1) {
            processed = processed.slice(0, openIdx);
        }

        // 3. 彻底清除任何孤立漂浮在正文或末尾的单个闭合标签
        processed = processed.replace(/<\/(think|thought|reasoning|thinking)>/gi, '');
        processed = processed.replace(/\[\/(THINK|THOUGHT|REASONING)\]/gi, '');

        // 4. 清除 markdown 格式的孤立引用块思维链残留（如 > thinking ...）
        processed = processed.replace(/^>+\s*(thought|thinking|reasoning)[\s\S]*?\n\n/gim, '');

        return processed.trim();
    }

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
                battery: { level: 100, charging: false, supported: false },
                network: { type: 'wifi', online: true, bluetooth: false }
            };
        }

        const b = state.battery;
        let batteryDesc = '未知';
        if (b && b.supported) {
            batteryDesc = `${b.level}%（${b.charging ? '正在充电中' : '未连接充电器'}）`;
        }

        const net = state.network || {};
        const netDesc = net.type === 'cellular' ? '移动蜂窝网络' : (net.online ? 'Wi-Fi 无线网络' : '离线状态');

        return `【当前设备真实硬件环境】：\n- 系统时间：${state.timeStr}（${state.timeSlotName}）\n- 电池电量：${batteryDesc}\n- 当前网络：${netDesc}${net.bluetooth ? '（蓝牙已就绪）' : ''}`;
    }

    function getDynamicGreeting() {
        let state = null;
        if (typeof window.getPhoneDeviceState === 'function') {
            state = window.getPhoneDeviceState();
        }

        const hour = state ? state.hour : new Date().getHours();
        const b = state ? state.battery : { level: 100, charging: false, supported: false };

        if (b && b.supported && !b.charging && b.level <= 20) {
            return `手机电量目前仅剩 ${b.level}% 啦，快连上充电线充充电吧！关于手机的按键用法或 App 玩法，随时问我哦~`;
        }

        if (b && b.supported && b.charging && b.level >= 95) {
            return `手机电量已经充至 ${b.level}%，基本充满啦，可以拔下插头咯！有什么功能找不到，我随时为你带路。`;
        }

        if (hour >= 23 || hour < 5) {
            return `夜已经很深了，还在玩手机呀？有什么疑问尽管问我，问完了早点休息，盖好被子别着凉~`;
        }

        if (hour >= 5 && hour < 8) {
            return `清晨好！新的一天开始啦，今天想去哪个 App 逛逛？向导随时为你带路！`;
        }

        return `你好！我是你的手机系统智能向导。如果你对这部手机的任何按键、功能或独立 App 感到疑惑，随时问我，我可以直接为你解答或带路。`;
    }

    async function askAgent(userQuestion, onDone, onError) {
        if (!userQuestion || !userQuestion.trim()) return;

        if (typeof window.callAI !== 'function') {
            if (typeof showToast === 'function') showToast('尚未配置大模型 API，请前往「系统设置」填写 Key', 'error');
            return;
        }

        const guideContext = window.MCYT_USER_GUIDE ? window.MCYT_USER_GUIDE.getPromptContext() : '';
        const envContext = getDeviceContextInfo();
        const systemPrompt = `${DEFAULT_AGENT_PROMPT}\n\n${envContext}\n\n${guideContext}`;

        currentDialogMemory.push({ role: 'user', content: userQuestion.trim() });
        if (currentDialogMemory.length > MAX_DIALOG_TURNS) {
            currentDialogMemory = currentDialogMemory.slice(-MAX_DIALOG_TURNS);
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            ...currentDialogMemory
        ];

        let targetModelOverride = undefined;
        try {
            const aiCfg = JSON.parse(localStorage.getItem('mc_yt_ai_config') || localStorage.getItem('mcyt_ai_config') || '{}');
            if (aiCfg && aiCfg.agentModel && aiCfg.agentModel !== 'follow_global') {
                targetModelOverride = aiCfg.agentModel;
            }
        } catch (_) {}

        try {
            const callOptions = {
                temperature: 0.15,
                maxTokens: 450,
                silent: true
            };
            if (targetModelOverride) {
                callOptions.model = targetModelOverride;
            }

            const raw = await window.callAI(messages, callOptions);

            // 深度清扫思维链
            let clean = cleanThoughtDeep(raw);

            let targetApp = null;
            const match = clean.match(/\[\[GO_APP:([a-zA-Z0-9_-]+)\]\]/i);
            if (match) {
                targetApp = match[1];
                clean = clean.replace(match[0], '').trim();
            }

            // 再次二次校验孤立残余
            clean = cleanThoughtDeep(clean);

            currentDialogMemory.push({ role: 'assistant', content: clean });

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
        ask: askAgent,
        clear: clearMemory,
        getHistory: getHistory,
        getGreeting: getDynamicGreeting,
        getDeviceContext: getDeviceContextInfo
    };

})(window);
