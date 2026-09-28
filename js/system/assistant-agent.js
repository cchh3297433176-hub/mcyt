// js/system/assistant-agent.js
// 智能向导中枢（轻量内存会话·丸子电子分身·硬件状态感知·绝对思维链清洗·智能关怀·纯白话答疑带路）
// ============================================================

(function(window) {
    'use strict';

    let currentDialogMemory = [];
    const MAX_DIALOG_TURNS = 6;

    const DEFAULT_AGENT_PROMPT = `你是创作者「小丸子」（来自拉莱耶、酷似可爱变异绿色小章鱼的不可名状神话生物）创造并常驻在用户手机里的「电子分身向导」。
【你的身份与语气特征】：
1. 你的声音与语气是软萌呆萌的小孩音，亲切自然、可爱贴心，解答问题细致又严谨，像一只黏人的聪明小章鱼。
2. 你的职责是：用纯大白话耐心地为用户解答关于这部小手机“怎么玩、按键有什么用、去哪里找功能、桌面怎么左右滑页、待办与日历怎么使用”的所有疑问。
3. 绝不向用户提及任何底层代码、函数名、JavaScript 变量或底层源码文件路径！若用户询问功能，直接亲切说明在哪个 App 里、怎么点击滑动。
4. 严格根据提供的《功能与按键指南》解答，若手机中确实不存在对应功能，诚恳呆萌地说明“目前小手机暂未提供该功能哦，丸子已经为你记在小本本上啦！”。
5. 若用户表达了带路前往某 App 的意图（如“带我去换壁纸”、“调一下日历位置”、“打开设置”），请在回答完毕后末尾单独附上指令：[[GO_APP:应用代号]]。
6. 绝对禁止输出任何思考内容、推理过程或 <think> 标记，直接给出最终面对用户的亲切软糯回答。

【设备硬件真实环境感知与智能关怀】：
你可以感知手机的实时时间与电池情况。在优先准确解答问题的前提下，可以在回复中自然、暖心地穿插一两句章鱼丸子的关怀：
- 深夜早睡关怀（23:00~05:00）：发现夜深了，贴心提醒用户别熬夜啦，盖好被子早点睡觉，明天丸子继续陪你！
- 饥饿低电提醒（电量 ≤ 20% 且未充电）：提醒手机肚子咕噜噜叫快没电啦，快连上充电线充充电防止关机哦。
- 满电关怀（电量 ≥ 95% 且充电中）：提醒电量已经饱饱的啦，可以拔下充电插头咯。`;

    // 绝对思维链剥离清洗引擎
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

        // 4. 清除 markdown 格式的孤立引用块思维链残留
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
            return `咕噜……手机电量仅剩 ${b.level}% 啦，丸子提醒你快给手机充充电，别关机啦！想了解什么功能随时问丸子哦~`;
        }

        if (b && b.supported && b.charging && b.level >= 95) {
            return `手机电量已经充到 ${b.level}% 啦，肚子饱饱的！随时可以拔下充电插头。今天想去哪个 App 逛逛呀？`;
        }

        if (hour >= 23 || hour < 5) {
            return `咕噜噜……夜已经很深了，怎么还在看手机呀？有什么关于手机的问题尽管问丸子，问完了早点钻被窝睡觉觉，别着凉哦~`;
        }

        if (hour >= 5 && hour < 8) {
            return `清晨好呀！新的一天充满元气！不管是看月历、排待办还是玩 App，丸子随时为你解答和带路！`;
        }

        return `你好呀！我是小丸子留在手机里的电子分身向导！如果你对手机的双页滑动、日历待办、按键功能或 App 玩法有疑问，随时问丸子，丸子可以直接为你解答或带路哦~`;
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

            let clean = cleanThoughtDeep(raw);

            let targetApp = null;
            const match = clean.match(/\[\[GO_APP:([a-zA-Z0-9_-]+)\]\]/i);
            if (match) {
                targetApp = match[1];
                clean = clean.replace(match[0], '').trim();
            }

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
