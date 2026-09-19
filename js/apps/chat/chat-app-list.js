/**
 * js/apps/chat/chat-app-list.js
 * 💬 微信主应用 · 拆分分片 1/7：模块级状态变量、角色记忆/折叠配置读写、消息主列表构建（buildChatListHTML）、
 *    左滑删除交互引擎（bindSwipeToDeleteEngine）、删除联系人确认与执行。
 * ⚠️ 本文件由原 chat-app.js（143KB 单体文件）拆分而来。
 *    拆分详情与文件拆分总表见 mcyt模拟器.md 对应章节。
 * ⚠️ 角色名片卡已拆分至 chat-card.js，塔罗卡片与队列已拆分至 chat-tarot.js
 * 加载顺序：本文件（list）→ chat-app-shell.js → chat-app-window.js → chat-app-bubble.js
 *          → chat-app-ai.js → chat-app-panels.js → chat-app-media.js（必须严格按此顺序加载）
 */

(function() {
    'use strict';

    window._activeBottomTab = 'chats';
    window._stickerDrawerOpen = false;
    window._plusDrawerOpen = false;
    window._activeQuoteMessage = null;
    window._chatExpandAllMap = {}; // 记录哪些会话被用户主动临时展开了历史记录
    window._activeSwipedItem = null;  // 记录当前处于左滑展开状态的行

    // 🌟 辅助函数：将高价值对话证据沉淀写入 Rememori 存储池（轻量暂存，防止单条口水话污染向量库）
    window.depositRememoriEvidence = function depositRememoriEvidence(npcId, curAccId, content) {
        if (!content || content.length < 5) return;
        try {
            if (!window._rememoriStore) {
                const raw = localStorage.getItem('mcyt_rememori_cache_v1');
                window._rememoriStore = raw ? JSON.parse(raw) : {};
            }
            const key = `${curAccId || 'main'}_${npcId}`;
            if (!window._rememoriStore[key]) window._rememoriStore[key] = [];
            window._rememoriStore[key].push({
                time: new Date().toLocaleTimeString().slice(0, 5),
                content: content.trim(),
                timestamp: Date.now()
            });
            if (window._rememoriStore[key].length > 25) {
                window._rememoriStore[key].shift();
            }
            localStorage.setItem('mcyt_rememori_cache_v1', JSON.stringify(window._rememoriStore));
        } catch (_) {}
    }

    // 🧠 读取角色的独立记忆总结配置
    window.getNpcMemoryConfig = function getNpcMemoryConfig(npcId) {
        if (!window.G) window.G = {};
        if (!window.G.npcMemoryConfigs) {
            try {
                const raw = localStorage.getItem('mcyt_npc_memory_configs');
                window.G.npcMemoryConfigs = raw ? JSON.parse(raw) : {};
            } catch (_) {
                window.G.npcMemoryConfigs = {};
            }
        }
        return window.G.npcMemoryConfigs[npcId] || {
            enabled: false,
            keepRecent: 8,       // 供 AI 实时读的最新上下文条数
            triggerCount: 20     // 满多少条时触发总结
        };
    }

    window.saveNpcMemoryConfig = function saveNpcMemoryConfig(npcId, cfg) {
        if (!window.G) window.G = {};
        if (!window.G.npcMemoryConfigs) window.G.npcMemoryConfigs = {};
        window.G.npcMemoryConfigs[npcId] = cfg;
        try {
            localStorage.setItem('mcyt_npc_memory_configs', JSON.stringify(window.G.npcMemoryConfigs));
        } catch (_) {}
    }

    // 辅助函数：根据起止消息生成精准的人类时间跨度标签
    function formatTimeSpanLabel(startMsg, endMsg) {
        const tStart = (startMsg && startMsg.timestamp) ? new Date(startMsg.timestamp) : new Date();
        const tEnd = (endMsg && endMsg.timestamp) ? new Date(endMsg.timestamp) : new Date();

        const pad = (n) => String(n).padStart(2, '0');
        const getPeriod = (h) => (h < 6 ? '凌晨' : h < 12 ? '上午' : h < 18 ? '下午' : '晚上');

        const y1 = tStart.getFullYear();
        const m1 = tStart.getMonth() + 1;
        const d1 = tStart.getDate();
        const h1 = tStart.getHours();
        const min1 = pad(tStart.getMinutes());

        const y2 = tEnd.getFullYear();
        const m2 = tEnd.getMonth() + 1;
        const d2 = tEnd.getDate();
        const h2 = tEnd.getHours();
        const min2 = pad(tEnd.getMinutes());

        if (y1 === y2 && m1 === m2 && d1 === d2) {
            return `${y1}年${m1}月${d1}日 ${getPeriod(h1)}${pad(h1)}:${min1} - ${pad(h2)}:${min2}`;
        }
        return `${y1}年${m1}月${d1}日 ${pad(h1)}:${min1} 至 ${y2}年${m2}月${d2}日 ${pad(h2)}:${min2}`;
    }

    // 🧠 检查并派发给忆海（Rememori）后台静默总结（带精确时间跨度与具名事实提炼）
    // 🛡️ 铁律修复：只提炼长效记忆，绝不物理截断或删除原始聊天记录！
    window.checkAndTriggerAutoMemorySummary = function checkAndTriggerAutoMemorySummary(npcId, curAccId) {
        const cfg = getNpcMemoryConfig(npcId);
        if (!cfg || !cfg.enabled) return;

        const hist = window.getAccountChatHistory(npcId, curAccId);
        const triggerLimit = Math.max(10, parseInt(cfg.triggerCount) || 20);
        const keepCount = Math.max(4, parseInt(cfg.keepRecent) || 8);

        // 未达到触发总结阈值，安静返回
        if (hist.length < triggerLimit) return;

        // 计算超出保留上下文的最前部分
        const sliceCount = hist.length - keepCount;
        if (sliceCount < 4) return;

        // 防止对同一批历史反复重复总结：记录已总结到的消息时间戳
        if (!window.G._lastSummaryTimestampMap) window.G._lastSummaryTimestampMap = {};
        const summarySessionKey = `${curAccId || 'main'}_${npcId}`;
        const lastProcessedTime = window.G._lastSummaryTimestampMap[summarySessionKey] || 0;

        // 提取待总结的早期对话切片
        const sliceToSummarize = hist.slice(0, sliceCount).filter(m => (m.timestamp || 0) > lastProcessedTime);
        if (sliceToSummarize.length < 4) return;

        const npc = window.G.npcs ? window.G.npcs[npcId] : null;
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '玩家' };
        const npcName = (npc && npc.remark) ? npc.remark : (npc ? npc.name : '对方');
        const playerName = curAcc.name || '玩家';

        // 计算这段历史切片的时间跨度
        const startMsg = sliceToSummarize[0];
        const endMsg = sliceToSummarize[sliceToSummarize.length - 1];
        const timeSpan = formatTimeSpanLabel(startMsg, endMsg);

        const dialogueLines = sliceToSummarize.map(m => {
            const speaker = (m.from === 'player') ? playerName : npcName;
            if (m.type === 'voice') return `${speaker}: [语音] ${m.text || ''}`;
            if (m.type === 'shared_tarot') return `${speaker}: [塔罗牌阵] ${m.sharedTarot?.spreadName || ''}`;
            if (m.imageDesc) return `${speaker}: [图片] ${m.imageDesc}`;
            return `${speaker}: ${m.text || ''}`;
        }).join('\n');

        // 记录已总结锚点，绝不截断 window.G.chatHistory
        window.G._lastSummaryTimestampMap[summarySessionKey] = endMsg.timestamp || Date.now();

        // 向忆海后台派发任务，附带精准时间跨度与 NPC 真实元数据
        const summaryPayload = {
            type: 'TRIGGER_REMEMORI_SUMMARY',
            scene: 'chat',
            dialogues: dialogueLines,
            playerName,
            npcName,
            npcId,
            timeSpan
        };

        window.postMessage(summaryPayload, '*');

        // 穿透向子 iframe（若已打开忆海视图）同步分发
        const rememoriIframe = document.querySelector('iframe[src*="rememori"]');
        if (rememoriIframe && rememoriIframe.contentWindow) {
            rememoriIframe.contentWindow.postMessage(summaryPayload, '*');
        }
    }

    // 读取或初始化折叠配置
    window.getChatCollapseConfig = function getChatCollapseConfig() {
        if (!window.G) window.G = {};
        if (!window.G.chatCollapseConfig) {
            try {
                const saved = localStorage.getItem('mcyt_chat_collapse_config');
                window.G.chatCollapseConfig = saved ? JSON.parse(saved) : { enabled: true, limit: 50 };
            } catch (_) {
                window.G.chatCollapseConfig = { enabled: true, limit: 50 };
            }
        }
        return window.G.chatCollapseConfig;
    }

    window.saveChatCollapseConfig = function saveChatCollapseConfig(cfg) {
        if (!window.G) window.G = {};
        window.G.chatCollapseConfig = cfg;
        try {
            localStorage.setItem('mcyt_chat_collapse_config', JSON.stringify(cfg));
        } catch (_) {}
    }

    // 🗂️ 切换单人会话的消息展开/收起状态
    window.toggleChatHistoryExpand = function toggleChatHistoryExpand(chatKey) {
        if (!window._chatExpandAllMap) window._chatExpandAllMap = {};
        window._chatExpandAllMap[chatKey] = !window._chatExpandAllMap[chatKey];
        if (typeof renderSingleChatWindow === 'function') {
            renderSingleChatWindow(null, { keepScroll: true });
        }
    };

    // 微信"消息"主列表构建（支持左滑删除结构与样式）
    window.buildChatListHTML = function buildChatListHTML() {
        const isDirect = window.G.chatActiveTab !== 'group';
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main', name: '我' };

        if (isDirect) {
            const npcList = Object.values(window.G.npcs || {}).filter(npc => {
                if (!npc.ownerAccountId || npc.ownerAccountId === 'all') return true;
                return npc.ownerAccountId === curAcc.id;
            });

            if (npcList.length === 0) {
                return `
                <div style="text-align:center;color:#b2b2b2;padding:60px 16px;font-size:13px;line-height:1.8;">
                    <b>暂无联系人</b><br>
                    当前账号「${escapeHtml(curAcc.name)}」暂未添加好友<br>
                    点击右上角「+」添加好友或导入角色卡认识新朋友
                </div>`;
            }

            const rows = npcList.map(npc => {
                const history = window.getAccountChatHistory(npc.id, curAcc.id);
                const last = history.length ? history[history.length - 1] : null;
                let preview = npc.signature ? escapeHtml(npc.signature) : '暂无消息，点击开始聊天';
                if (last) {
                    if (last.from === 'action') preview = String(last.text || '');
                    else if (last.type === 'voice') preview = `[语音] ${last.seconds || 3}"`;
                    else if (last.type === 'shared_tarot') preview = `[分享了塔罗牌阵: ${last.sharedTarot?.spreadName || '占卜'}]`;
                    else if (last.type === 'shared_moment') preview = '[分享了一条朋友圈动态]';
                    else if (last.type === 'contact_card') preview = '[推荐了名片]';
                    else if (last.type === 'moment_notice') preview = '[朋友圈更新提醒]';
                    else if (last.stickerUrl || last.type === 'sticker') preview = `[动画表情]`;
                    else if (last.type === 'image_flip' || last.type === 'image_text_only' || last.imageDesc) preview = `[图片描述: ${last.imageDesc || '图片'}]`;
                    else if (last.imageUrl || last.type === 'image') preview = '[图片]';
                    else preview = String(last.originalText || last.text || '').replace(/\n+/g, ' ').slice(0, 24) || '[消息]';
                    if (last.from === 'player') preview = '我：' + preview;
                }
                const timeLabel = last ? String(last.time || '').slice(0, 5) : '';
                const blocked = (typeof window.isAccountBlockedByNpc === 'function') ? window.isAccountBlockedByNpc(npc.id, curAcc.id) : false;
                const isDating = window.ChatPromptEngine && window.ChatPromptEngine.isNpcInDatingRelationship(npc);
                return { npc, last, preview, timeLabel, blocked, isDating };
            }).sort((a, b) => {
                const ta = a.last ? Number(String(a.last._id || '').split('_')[1]) || 0 : 0;
                const tb = b.last ? Number(String(b.last._id || '').split('_')[1]) || 0 : 0;
                return tb - ta;
            });

            return rows.map(({ npc, preview, timeLabel, blocked, isDating }) => {
                const displayName = npc.remark ? npc.remark : (npc.name || npc.id);
                return `
                <div class="chat-swipe-item" data-npc-id="${npc.id}">
                    <div class="chat-swipe-content chat-item" data-npc-id="${npc.id}">
                        ${window.renderAvatarBadge(npc, 46)}
                        <div style="flex:1;min-width:0;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <div style="display:flex;align-items:center;gap:4px;overflow:hidden;">
                                    <span style="font-size:14.5px;font-weight:500;color:#181818;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(displayName)}</span>
                                    ${isDating ? `<span style="font-size:10px;background:#ffeef0;color:#ff4d4f;padding:1px 5px;border-radius:3px;font-weight:600;flex-shrink:0;">恋人</span>` : ''}
                                </div>
                                <span style="font-size:10.5px;color:#b2b2b2;flex-shrink:0;margin-left:6px;">${timeLabel}</span>
                            </div>
                            <div style="font-size:12px;color:${blocked ? '#fa5151' : '#999999'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${blocked ? '（已被对方拒收）' : escapeHtml(preview)}</div>
                        </div>
                    </div>
                    <div class="chat-swipe-actions">
                        <button type="button" class="chat-swipe-delete-btn" onclick="window.confirmDeleteContactNpc('${npc.id}', event)">删除</button>
                    </div>
                </div>
                `;
            }).join('');
        }

        const groupList = Object.entries(window.G.groups || {}).map(([gid, g]) => Object.assign({ id: gid }, g));
        if (groupList.length === 0) {
            return `
            <div style="text-align:center;color:#b2b2b2;padding:60px 16px;font-size:13px;line-height:1.8;">
                <b>暂无群聊</b><br>
                点击右上角「+」发起群聊
            </div>`;
        }

        const groupRows = groupList.map(g => {
            const history = (window.G.groupChatHistory && window.G.groupChatHistory[g.id]) || [];
            const last = history.length ? history[history.length - 1] : null;
            let preview = '暂无消息';
            if (last) {
                if (last.from === 'action') preview = String(last.text || '');
                else if (last.type === 'voice') preview = `[语音] ${last.seconds || 3}"`;
                else if (last.type === 'shared_tarot') preview = `[分享了塔罗牌阵: ${last.sharedTarot?.spreadName || '占卜'}]`;
                else if (last.type === 'shared_moment') preview = '[分享了一条朋友圈动态]';
                else if (last.type === 'contact_card') preview = '[推荐了名片]';
                else preview = String(last.text || '[消息]').replace(/\n+/g, ' ').slice(0, 24);
                if (last.senderName) preview = `${last.senderName}：${preview}`;
            }
            const timeLabel = last ? String(last.time || '').slice(0, 5) : '';
            return { g, preview, timeLabel, last };
        }).sort((a, b) => {
            const ta = a.last ? Number(String(a.last._id || '').split('_')[1]) || 0 : 0;
            const tb = b.last ? Number(String(b.last._id || '').split('_')[1]) || 0 : 0;
            return tb - ta;
        });

        return groupRows.map(({ g, preview, timeLabel }) => `
            <div class="group-item" data-group-id="${g.id}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:0.5px solid #ededed;cursor:pointer;background:#fff;">
                ${window.renderAvatarBadge(g, 46)}
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:14.5px;font-weight:500;color:#181818;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(g.name || g.id)}</span>
                        <span style="font-size:10.5px;color:#b2b2b2;flex-shrink:0;margin-left:6px;">${timeLabel}</span>
                    </div>
                    <div style="font-size:12px;color:#999999;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">${escapeHtml(preview)}</div>
                </div>
            </div>
        `).join('');
    }

    // 绑定左滑交互引擎
    window.bindSwipeToDeleteEngine = function bindSwipeToDeleteEngine(container) {
        const swipeItems = container.querySelectorAll('.chat-swipe-item');
        swipeItems.forEach(item => {
            const content = item.querySelector('.chat-swipe-content');
            if (!content) return;

            let startX = 0;
            let startY = 0;
            let currentX = 0;
            let isSwiping = false;
            let isHorizontal = null;

            content.addEventListener('touchstart', (e) => {
                if (e.touches.length > 1) return;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                currentX = 0;
                isSwiping = true;
                isHorizontal = null;

                if (window._activeSwipedItem && window._activeSwipedItem !== content) {
                    window._activeSwipedItem.style.transform = 'translateX(0px)';
                    window._activeSwipedItem = null;
                }
            }, { passive: true });

            content.addEventListener('touchmove', (e) => {
                if (!isSwiping) return;
                const deltaX = e.touches[0].clientX - startX;
                const deltaY = e.touches[0].clientY - startY;

                if (isHorizontal === null) {
                    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
                        isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
                    }
                }

                if (!isHorizontal) return;

                if (deltaX < 0) {
                    const move = Math.max(-72, deltaX);
                    content.style.transform = `translateX(${move}px)`;
                    currentX = move;
                } else if (window._activeSwipedItem === content) {
                    const move = Math.min(0, -72 + deltaX);
                    content.style.transform = `translateX(${move}px)`;
                    currentX = move;
                }
            }, { passive: true });

            const endSwipe = () => {
                if (!isSwiping) return;
                isSwiping = false;
                if (!isHorizontal) return;

                if (currentX < -36) {
                    content.style.transform = 'translateX(-72px)';
                    window._activeSwipedItem = content;
                } else {
                    content.style.transform = 'translateX(0px)';
                    if (window._activeSwipedItem === content) window._activeSwipedItem = null;
                }
            };

            content.addEventListener('touchend', endSwipe);
            content.addEventListener('touchcancel', endSwipe);
        });
    }

    // 确认删除角色弹窗（微信简约风格）
    window.confirmDeleteContactNpc = function(npcId, event) {
        if (event) event.stopPropagation();
        if (!window.G || !window.G.npcs || !window.G.npcs[npcId]) return;

        const npc = window.G.npcs[npcId];
        const displayName = npc.remark ? npc.remark : (npc.name || npc.id);

        if (typeof window.openWechatCleanModal === 'function') {
            window.openWechatCleanModal('删除联系人', `
                <div style="text-align:center;padding:12px 0 6px;font-size:14px;color:#222;line-height:1.5;">
                    将联系人「<b>${escapeHtml(displayName)}</b>」删除，将同时清除该角色的所有聊天记录及忆海记忆认知。
                </div>
            `, () => {
                window.doDeleteContactNpc(npcId);
            });
        }
    };

    // 执行彻底删除角色（级联清理聊天与忆海记忆）
    window.doDeleteContactNpc = function(npcId) {
        if (!window.G || !window.G.npcs) return;

        const npc = window.G.npcs[npcId];
        const npcName = npc ? (npc.remark || npc.name) : npcId;

        delete window.G.npcs[npcId];

        if (window.G.chatHistory) {
            for (const key of Object.keys(window.G.chatHistory)) {
                if (key.endsWith(`_${npcId}`) || key === npcId) {
                    delete window.G.chatHistory[key];
                }
            }
        }

        if (Array.isArray(window.G.friendRequests)) {
            window.G.friendRequests = window.G.friendRequests.filter(r => r.applicantNpcId !== npcId);
        }

        if (window.G.groups) {
            for (const g of Object.values(window.G.groups)) {
                if (Array.isArray(g.members)) {
                    g.members = g.members.filter(m => m !== npcId);
                }
            }
        }

        if (window.G.currentChatNpc === npcId) {
            window.G.currentChatNpc = null;
        }

        // 清除对应的独立记忆配置
        if (window.G.npcMemoryConfigs && window.G.npcMemoryConfigs[npcId]) {
            delete window.G.npcMemoryConfigs[npcId];
            try {
                localStorage.setItem('mcyt_npc_memory_configs', JSON.stringify(window.G.npcMemoryConfigs));
            } catch (_) {}
        }

        window._activeSwipedItem = null;

        // 向忆海广播级联删除事件
        const delEvent = {
            type: 'DELETE_NPC_MEMORIES',
            npcId: npcId,
            npcName: npcName
        };
        window.postMessage(delEvent, '*');

        const rememoriIframe = document.querySelector('iframe[src*="rememori"]');
        if (rememoriIframe && rememoriIframe.contentWindow) {
            rememoriIframe.contentWindow.postMessage(delEvent, '*');
        }

        if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
        if (typeof window.syncChatHistoryToLocalBackup === 'function') window.syncChatHistoryToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();

        if (typeof showToast === 'function') showToast('联系人及认知已彻底删除', 'success', 1200);
        renderChatApp();
    };

})();
