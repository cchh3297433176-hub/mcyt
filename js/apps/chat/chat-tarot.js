/**
 * js/apps/chat/chat-tarot.js
 * 🔮 微信塔罗牌阵交互独立模块
 * 职责：
 * 1. 跨页面/跨沙盒待处理转发队列自动吸收落盘（drainPendingTarotShares，转发后静止）
 * 2. 聊天流中塔罗卡片渲染（renderSharedTarotCardHTML，仿微信白灰微绿与原生圆角微阴影）
 * 3. 塔罗卡片详情弹窗（openSharedTarotDetailModal，微信极简居中白灰微绿弹窗）
 * 4. 活人感 AI 对话感知上下文格式化（formatTarotForPrompt）
 */

(function() {
    'use strict';

    const PENDING_TAROT_QUEUE_KEY = 'mcyt_pending_shared_tarot';

    /**
     * 自动检测并吸收从塔罗 App 跨页转发过来的牌阵队列
     */
    function drainPendingTarotShares() {
        let queue = [];
        try {
            const raw = localStorage.getItem(PENDING_TAROT_QUEUE_KEY);
            if (raw) queue = JSON.parse(raw);
        } catch (_) {
            queue = [];
        }

        if (!Array.isArray(queue) || !queue.length) return;

        let absorbedCount = 0;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };

        queue.forEach(item => {
            if (!item || !item.targetId || !item.msg) return;

            const targetId = item.targetId;
            const isGroup = !!item.isGroup;
            const msgObj = Object.assign({}, item.msg, {
                senderName: curAcc.name || '我'
            });

            if (isGroup) {
                if (!window.G) window.G = {};
                if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
                if (!window.G.groupChatHistory[targetId]) window.G.groupChatHistory[targetId] = [];
                window.G.groupChatHistory[targetId].push(msgObj);
                absorbedCount++;
            } else {
                if (typeof window.pushChatMessageSafe === 'function') {
                    window.pushChatMessageSafe(targetId, msgObj, curAcc.id);
                    absorbedCount++;
                } else if (window.G && window.G.chatHistory) {
                    const key = `${curAcc.id || 'main'}_${targetId}`;
                    if (!window.G.chatHistory[key]) window.G.chatHistory[key] = [];
                    window.G.chatHistory[key].push(msgObj);
                    absorbedCount++;
                }
            }
        });

        // 吸收完毕清空队列
        try {
            localStorage.removeItem(PENDING_TAROT_QUEUE_KEY);
        } catch (_) {}

        if (absorbedCount > 0) {
            if (typeof window.syncChatHistoryToLocalBackup === 'function') window.syncChatHistoryToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        }
    }

    /**
     * 构建聊天气泡中的塔罗牌阵卡片 HTML（微信白灰微绿与极简卡片）
     */
    function renderSharedTarotCardHTML(msg, targetId, isGroup) {
        const st = msg.sharedTarot || {};
        const cards = st.cards || [];

        const cardRows = cards.map(c => `
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;padding:3px 0;border-bottom:0.5px dashed #f0f0f0;">
                <span style="color:#222222;font-weight:500;">${escapeHtml(c.name)}</span>
                <span style="font-size:11px;font-weight:600;color:${c.reversed ? '#fa5151' : '#07c160'};">${c.reversed ? '▼ 逆位' : '▲ 正位'}</span>
            </div>
        `).join('');

        return `
        <div class="wechat-share-tarot-card" onclick="window.openSharedTarotDetailModal('${msg._id}', '${targetId}', ${isGroup})" style="background:#ffffff;border:0.5px solid #e2e8f0;border-left:3px solid #07c160;border-radius:8px;padding:10px 12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);cursor:pointer;width:220px;box-sizing:border-box;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:11px;font-weight:600;color:#07c160;">✦ 塔罗牌阵分享 ✦</span>
                <span style="font-size:10.5px;color:#999999;">${escapeHtml(st.spreadName || '牌阵')}</span>
            </div>
            <div style="font-size:13px;font-weight:600;color:#181818;margin-bottom:8px;line-height:1.4;word-break:break-word;">
                “${escapeHtml(st.question || '每日能量启示')}”
            </div>
            <div style="background:#fafafa;border-radius:5px;padding:4px 8px;margin-bottom:6px;">
                ${cardRows}
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:#888888;">
                <span>轻触查看牌位解析</span>
                <span style="color:#07c160;font-weight:600;">查看 ›</span>
            </div>
        </div>`;
    }

    /**
     * 打开塔罗牌阵详情弹窗（仿原生微信居中白灰微绿极简设计）
     */
    function openSharedTarotDetailModal(msgId, targetId, isGroup) {
        let history = [];
        if (isGroup) {
            history = (window.G && window.G.groupChatHistory && window.G.groupChatHistory[targetId]) || [];
        } else {
            history = (typeof window.getAccountChatHistory === 'function') ? window.getAccountChatHistory(targetId) : [];
        }

        const msg = history.find(m => m._id === msgId);
        if (!msg || !msg.sharedTarot) return;

        const st = msg.sharedTarot;
        const cardsHtml = (st.cards || []).map((c, idx) => `
            <div style="background:#f7f7f7;border-radius:6px;padding:9px 12px;margin-bottom:8px;text-align:left;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:13px;font-weight:600;color:#181818;">${idx + 1}. 【${escapeHtml(c.position || '核心')}】 ${escapeHtml(c.name)}</span>
                    <span style="font-size:11.5px;font-weight:600;color:${c.reversed ? '#fa5151' : '#07c160'};">${c.reversed ? '▼ 逆位' : '▲ 正位'}</span>
                </div>
                <div style="font-size:12px;color:#666666;margin-top:4px;line-height:1.45;">${escapeHtml(c.meaning || '探索内心的指引')}</div>
            </div>
        `).join('');

        if (typeof window.openWechatCleanModal === 'function') {
            window.openWechatCleanModal('塔罗牌阵详情', `
                <div style="text-align:left;">
                    <div style="font-size:11.5px;color:#888888;margin-bottom:4px;">问卜者提问：</div>
                    <div style="font-size:14px;color:#181818;font-weight:600;margin-bottom:12px;line-height:1.4;">“${escapeHtml(st.question || '每日能量启示')}”</div>
                    <div style="font-size:11.5px;color:#888888;margin-bottom:8px;">牌阵形式：<b>${escapeHtml(st.spreadName || '三张牌阵')}</b></div>
                    <div style="max-height:220px;overflow-y:auto;padding-right:2px;">
                        ${cardsHtml}
                    </div>
                </div>
            `, () => {});
        }
    }

    /**
     * 将塔罗牌阵消息转换为 AI 活人感识别格式
     */
    function formatTarotForPrompt(msg, speakerName) {
        const st = msg.sharedTarot || {};
        const cardsDesc = (st.cards || []).map((c, i) => `${i + 1}.【${c.position}】${c.name} (${c.reversed ? '逆位' : '正位'}，牌意暗示: ${c.meaning || ''})`).join('；');
        return `${speakerName} [转发了塔罗牌阵，寻求你的解读/看法]:\n- 问卜者提问: “${st.question || '综合每日能量'}”\n- 牌阵形式: ${st.spreadName || '三张牌阵'}\n- 牌面详情: ${cardsDesc}\n【提示】：请根据你的人设性格、立场与对玄学的态度给出符合你角色的真实微信回复（可以专业解答、瞎猜胡扯、调侃迷信、毒舌挑剔或直接拒绝，严禁死板客服腔）。`;
    }

    // 暴露全局 API
    window.ChatTarot = {
        drainPendingTarotShares,
        renderSharedTarotCardHTML,
        openSharedTarotDetailModal,
        formatTarotForPrompt
    };
    window.openSharedTarotDetailModal = openSharedTarotDetailModal;

    console.log('✅ ChatTarot 微信塔罗牌阵独立交互模块已就绪');
})();
