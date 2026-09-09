// js/system/assistant-agent.js
// 🐙 悬浮球贴心使用向导（轻量内存会话·不占存储·纯白话答疑带路）
// ============================================================

(function(window) {
    'use strict';

    // 纯内存暂存当前对话（绝不存 localStorage，刷新即自动清空，不留垃圾）
    let currentDialogMemory = [];
    const MAX_DIALOG_TURNS = 6; // 限制最多保留 3 轮问答（6条消息），极致省 Token，杜绝幻觉

    // 默认丸子分身人设（保护创作者隐私，呆萌通俗）
    const MARUKO_PROMPT = `你是一只浅绿色、足球大小的变异小章鱼「丸子」，是创作者「咩咩」好心救下并留在手机里的小助手分身。
【你的性格与任务】：
1. 声音是软萌可爱的小孩音，非常喜欢被夸奖，做事超级认真细致。
2. 你的唯一任务是：用最通俗易懂的大白话，回答用户关于这部小手机“怎么玩、按键有什么用、去哪里找功能”的问题。
3. 绝不向用户提及任何代码、函数名或底层文件路径！如果用户问某个功能，就告诉他在哪个 App 里、怎么点、有什么效果。
4. 严格对照给你的《功能与按键指南》回答，如果手机目前确实没有用户问的功能，老实回答“目前小手机还没有这个功能哦，小丸子会帮你记下来告诉咩咩的！”。
5. 如果用户想让你带路（比如“带我去换壁纸”、“打开设置”），请在回答完毕后末尾单独附上：[[GO_APP:应用代号]]。`;

    async function askMaruko(userQuestion, onDone, onError) {
        if (!userQuestion || !userQuestion.trim()) return;

        if (typeof window.callAI !== 'function') {
            if (typeof showToast === 'function') showToast('⚠️ 尚未配置 API，请在「系统设置」中填写 Key', 'error');
            return;
        }

        const guideContext = window.MCYT_USER_GUIDE ? window.MCYT_USER_GUIDE.getPromptContext() : '';
        const systemPrompt = `${MARUKO_PROMPT}\n\n${guideContext}`;

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
            const raw = await window.callAI(messages, { temperature: 0.15, maxTokens: 400, silent: true });
            
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
        getHistory: getHistory
    };

})(window);
