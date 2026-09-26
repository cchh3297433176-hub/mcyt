/**
 * js/apps/chat/chat-card.js
 * 📇 微信名片与人设资料设置独立模块（精简 5 核心表情 · 装扮中心免通话独立调位版）
 * 职责：
 * 1. 角色极简原生名片卡（保留必要信息，头像精准保活，支持原画/动图）
 * 2. 右上角「装扮中心」：
 *    - 【基础装扮】头像框与气泡样式双轨分流
 *    - 🌟【视频舞台与立绘设置】：精简 5 个核心表情槽（默认、开心、伤心、生气、害羞），支持自定义扩展；
 *    - 🌟【免通话独立手势调位】：无需拨通视频，在装扮中心即可 1:1 全屏预览并手势拖拽缩放立绘；
 *    - 支持本地/直链图片、GIF、短视频，点击已有项弹窗询问更换或删除；
 *    - 单配组方案独立导出/导入，角色卡打包导出无缝集成。
 * 3. 🌟 角色专属 TTS 语音音色配置（带独立开关与 CloneTTS 菜单拉取）
 */

(function() {
    'use strict';

    function formatFavorNumber(val) {
        const num = parseFloat(val) || 0;
        return Number.isInteger(num) ? num.toString() : num.toFixed(1);
    }

    function getShapeBorderRadius(shape) {
        if (shape === 'circle') return '50%';
        if (shape === 'squircle') return '8px';
        if (shape === 'square') return '2px';
        return '8px';
    }

    function getStoredFramesList() {
        return (typeof window.getStoredDecorFrames === 'function')
            ? window.getStoredDecorFrames()
            : [{ id: 'frame_none', name: '无头像框', url: '', scale: 1.15 }];
    }

    function getStoredBubblesList() {
        return (typeof window.getStoredDecorBubbles === 'function')
            ? window.getStoredDecorBubbles()
            : [{ id: 'bubble_default', name: '原生微信白灰微绿', type: 'css' }];
    }

    function escapeHtml(str) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 🌟 获取角色视频舞台预设方案
    function ensureNpcVideoStageProfiles(npc) {
        if (!npc.chatSettings) npc.chatSettings = {};
        if (!npc.chatSettings.videoStage) {
            npc.chatSettings.videoStage = {
                activeProfileId: 'default',
                profiles: [
                    {
                        id: 'default',
                        name: '默认形象',
                        backgroundUrl: '',
                        bgType: 'image',
                        sprites: {
                            default: ''
                        },
                        customExpressions: [],
                        position: { x: 0, y: 0, scale: 1.0 },
                        bgPosition: { x: 0, y: 0, scale: 1.0 }
                    }
                ]
            };
        }
        const vs = npc.chatSettings.videoStage;
        if (!Array.isArray(vs.profiles) || vs.profiles.length === 0) {
            vs.profiles = [
                {
                    id: 'default',
                    name: '默认形象',
                    backgroundUrl: '',
                    bgType: 'image',
                    sprites: { default: '' },
                    customExpressions: [],
                    position: { x: 0, y: 0, scale: 1.0 },
                    bgPosition: { x: 0, y: 0, scale: 1.0 }
                }
            ];
            vs.activeProfileId = 'default';
        }
        return vs;
    }

    // 📇 极简微信名片卡
    function openNpcProfileCardModal(npcId) {
        if (!window.G || !window.G.npcs) return;
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        const isDating = window.ChatPromptEngine && window.ChatPromptEngine.isNpcInDatingRelationship(npc);
        const sigText = npc.signature ? escapeHtml(npc.signature) : '未设置个性签名';
        const hasRemark = !!(npc.remark && npc.remark.trim());
        const primaryName = hasRemark ? escapeHtml(npc.remark.trim()) : escapeHtml(npc.name || npc.id);
        const subNameHtml = hasRemark ? `<div style="font-size:12px;color:#888888;margin-top:2px;">原名：${escapeHtml(npc.name || '')}</div>` : '';
        const curFavor = parseFloat(npc.favor !== undefined ? npc.favor : 50);
        const favorText = `${formatFavorNumber(curFavor)} (${isDating ? '恋人' : (curFavor >= 80 ? '暧昧期' : '朋友')})`;

        const decor = (npc.chatSettings && npc.chatSettings.decor) || {};
        const globalShape = localStorage.getItem('mcyt_active_avatar_shape') || 'circle';
        const avatarShape = decor.avatarShape || globalShape;
        const borderRadius = getShapeBorderRadius(avatarShape);

        let frameUrl = '';
        let frameScale = 1.18;
        const frames = getStoredFramesList();

        if (decor.frameId && decor.frameId !== 'frame_none') {
            const f = frames.find(x => x.id === decor.frameId);
            if (f && f.url) { frameUrl = f.url; frameScale = f.scale || 1.18; }
        } else if (!decor.frameId) {
            const globalFrameId = localStorage.getItem('mcyt_active_decor_frame') || 'frame_none';
            const f = frames.find(x => x.id === globalFrameId);
            if (f && f.url) { frameUrl = f.url; frameScale = f.scale || 1.18; }
        }

        const avatarSrc = npc.avatarUrl || npc.avatar || 'assets/icons/chat.png';

        let mask = document.createElement('div');
        mask.className = 'wechat-clean-modal-mask';
        mask.innerHTML = `
            <div class="wechat-clean-modal-card" style="max-width:320px;padding:20px 18px;position:relative;background:#ffffff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.12);box-sizing:border-box;">
                <div style="position:absolute;top:14px;right:14px;display:flex;align-items:center;gap:6px;">
                    <button type="button" id="btnNpcCardDecor" title="装扮中心（头像框、气泡与视频立绘）" style="border:none;background:none;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;color:#07c160;">
                        <svg viewBox="0 0 24 24" style="width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;">
                            <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>
                        </svg>
                    </button>
                    <button type="button" id="btnNpcCardGear" title="资料设置" style="border:none;background:none;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;color:#707070;">
                        <svg viewBox="0 0 24 24" style="width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                </div>

                <div style="display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:0.5px solid #f0f0f0;margin-bottom:14px;padding-right:65px;">
                    <div style="position:relative;width:56px;height:56px;flex-shrink:0;cursor:pointer;" onclick="window.triggerChangeNpcAvatar('${npcId}')" title="更换头像">
                        <img id="npcCardAvatarDisplay" src="${avatarSrc}" style="width:100%;height:100%;border-radius:${borderRadius};object-fit:cover;display:block;" onerror="this.src='assets/icons/chat.png';" />
                        ${frameUrl ? `<img src="${frameUrl}" style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%) scale(${frameScale});width:100%;height:100%;pointer-events:none;" onerror="this.style.display='none';" />` : ''}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:16.5px;font-weight:600;color:#181818;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            ${primaryName}
                        </div>
                        ${subNameHtml}
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:18px;font-size:13px;color:#222;">
                    <div style="display:flex;align-items:flex-start;gap:10px;">
                        <span style="color:#888;flex-shrink:0;min-width:44px;">签名</span>
                        <span style="color:${npc.signature ? '#333' : '#aaa'};line-height:1.45;word-break:break-word;flex:1;">${sigText}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="color:#888;flex-shrink:0;min-width:44px;">地区</span>
                        <span style="color:#333;font-weight:500;">${escapeHtml(npc.region || '中国')}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="color:#888;flex-shrink:0;min-width:44px;">好感</span>
                        <span style="color:#07c160;font-weight:600;">${favorText}</span>
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;">
                    <button type="button" id="btnNpcCardSendMsg" style="border:none;background:#07c160;color:#fff;padding:9px;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;text-align:center;">
                        发消息
                    </button>
                    <button type="button" id="btnNpcCardBack" style="border:none;background:#f2f2f2;color:#555;padding:8px;border-radius:6px;font-size:13px;cursor:pointer;">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(mask);
        const close = () => { if (mask && mask.parentNode) mask.parentNode.removeChild(mask); };

        mask.querySelector('#btnNpcCardBack').onclick = close;
        mask.querySelector('#btnNpcCardSendMsg').onclick = () => {
            close();
            if (typeof window.openChat === 'function') window.openChat(npcId);
        };
        mask.querySelector('#btnNpcCardDecor').onclick = () => {
            close();
            openNpcDecorModal(npcId);
        };
        mask.querySelector('#btnNpcCardGear').onclick = () => {
            close();
            openNpcSettingsModal(npcId);
        };
    }
    window.openNpcProfileCardModal = openNpcProfileCardModal;

    // 🎨 装扮弹窗（基础装扮 + 视频舞台立绘分区）
    function openNpcDecorModal(npcId) {
        if (!window.G || !window.G.npcs) return;
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        if (!npc.chatSettings) npc.chatSettings = {};
        if (!npc.chatSettings.decor) npc.chatSettings.decor = {};

        let activeMainTab = 'videoStage';
        let activeDecorTarget = 'npc';

        const frames = getStoredFramesList();
        const bubbles = getStoredBubblesList();

        let npcShape = npc.chatSettings.decor.avatarShape || 'inherit';
        let npcFrameId = npc.chatSettings.decor.frameId !== undefined ? npc.chatSettings.decor.frameId : 'inherit';
        let npcBubbleId = npc.chatSettings.decor.bubbleId !== undefined ? npc.chatSettings.decor.bubbleId : 'inherit';

        let userShape = localStorage.getItem('mcyt_active_avatar_shape') || 'circle';
        let userFrameId = localStorage.getItem('mcyt_active_decor_frame') || 'frame_none';
        let userBubbleId = localStorage.getItem('mcyt_active_decor_bubble') || 'bubble_default';

        const userAvatar = (typeof window.getPlayerAvatarSafe === 'function') ? window.getPlayerAvatarSafe() : 'assets/icons/chat.png';
        const npcAvatar = npc.avatarUrl || npc.avatar || 'assets/icons/chat.png';

        const videoStageData = ensureNpcVideoStageProfiles(npc);

        let mask = document.createElement('div');
        mask.className = 'wechat-clean-modal-mask';

        function renderDecorModalInner() {
            const isUser = (activeDecorTarget === 'user');
            const curAvatar = isUser ? userAvatar : npcAvatar;
            const curShape = isUser ? userShape : (npcShape === 'inherit' ? userShape : npcShape);
            const curFrameId = isUser ? userFrameId : (npcFrameId === 'inherit' ? userFrameId : npcFrameId);
            const curBubbleId = isUser ? userBubbleId : (npcBubbleId === 'inherit' ? userBubbleId : npcBubbleId);

            const curFrameObj = frames.find(f => f.id === curFrameId);
            const curFrameUrl = (curFrameObj && curFrameObj.url) ? curFrameObj.url : '';
            const curFrameScale = (curFrameObj && curFrameObj.scale) ? curFrameObj.scale : 1.18;

            let activeProf = videoStageData.profiles.find(p => p.id === videoStageData.activeProfileId);
            if (!activeProf) {
                activeProf = videoStageData.profiles[0];
                videoStageData.activeProfileId = activeProf.id;
            }

            // 🌟 严格限制为李敏指定的 5 大核心表情槽
            const defaultExprs = [
                { id: 'default', label: '默认' },
                { id: 'smile', label: '开心' },
                { id: 'sad', label: '伤心' },
                { id: 'angry', label: '生气' },
                { id: 'shy', label: '害羞' }
            ];
            const allExprs = [...defaultExprs];
            if (Array.isArray(activeProf.customExpressions)) {
                activeProf.customExpressions.forEach(c => {
                    if (!allExprs.find(e => e.id === c.id)) {
                        allExprs.push(c);
                    }
                });
            }

            mask.innerHTML = `
                <div class="wechat-clean-modal-card" style="max-width:350px;width:92%;padding:16px;position:relative;background:#ffffff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.14);box-sizing:border-box;max-height:90vh;display:flex;flex-direction:column;">
                    <div style="font-size:14.5px;font-weight:600;color:#181818;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
                        <span>装扮中心 · ${escapeHtml(npc.name || 'NPC')}</span>
                        <button type="button" id="btnDecorModalX" style="border:none;background:#f2f2f2;border-radius:50%;width:22px;height:22px;color:#777;cursor:pointer;font-size:12px;">✕</button>
                    </div>

                    <!-- 顶部主分区切换 -->
                    <div style="display:flex;background:#f2f2f2;border-radius:8px;padding:2px;margin-bottom:12px;">
                        <button type="button" id="tabMainVideoStage" style="flex:1;padding:7px 0;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer;background:${activeMainTab === 'videoStage' ? '#ffffff' : 'transparent'};color:${activeMainTab === 'videoStage' ? '#07c160' : '#666'};">
                            视频立绘与舞台
                        </button>
                        <button type="button" id="tabMainBasicDecor" style="flex:1;padding:7px 0;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer;background:${activeMainTab === 'decor' ? '#ffffff' : 'transparent'};color:${activeMainTab === 'decor' ? '#07c160' : '#666'};">
                            头像框与气泡
                        </button>
                    </div>

                    <div style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding-right:2px;">
                        ${activeMainTab === 'videoStage' ? `
                            <!-- 🌟 视频立绘与舞台分区 -->
                            <div style="display:flex;flex-direction:column;gap:12px;">
                                <!-- 配组方案控制条 -->
                                <div style="background:#f8f9fa;border-radius:8px;padding:10px;border:0.5px solid #eee;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                        <div style="font-size:12px;font-weight:600;color:#333;">当前舞台方案：</div>
                                        <div style="display:flex;gap:4px;">
                                            <button type="button" id="btnExportCurrentProfile" title="导出当前方案" style="border:1px solid #dcdcdc;background:#fff;border-radius:4px;padding:2px 6px;font-size:11px;color:#555;cursor:pointer;">导出</button>
                                            <button type="button" id="btnImportProfileDirect" title="导入方案" style="border:1px solid #dcdcdc;background:#fff;border-radius:4px;padding:2px 6px;font-size:11px;color:#555;cursor:pointer;">导入</button>
                                            <button type="button" id="btnAddNewStageProfile" title="新建配组" style="border:none;background:#07c160;color:#fff;border-radius:4px;padding:2px 7px;font-size:11px;cursor:pointer;font-weight:600;">+ 新建</button>
                                        </div>
                                    </div>
                                    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;" class="custom-scrollbar">
                                        ${videoStageData.profiles.map(p => {
                                            const isPActive = (p.id === videoStageData.activeProfileId);
                                            return `
                                                <button type="button" class="btn-switch-stage-profile" data-pid="${p.id}" style="padding:4px 10px;border-radius:6px;font-size:11px;white-space:nowrap;cursor:pointer;border:1px solid ${isPActive ? '#07c160' : '#ddd'};background:${isPActive ? '#e8f7ed' : '#fff'};color:${isPActive ? '#07c160' : '#444'};font-weight:${isPActive ? '600' : 'normal'};">
                                                    ${escapeHtml(p.name)}
                                                </button>
                                            `;
                                        }).join('')}
                                    </div>
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:6px;border-top:0.5px dashed #eee;">
                                        <div style="font-size:11px;color:#888;">重命名：</div>
                                        <div style="display:flex;gap:6px;flex:1;max-width:180px;">
                                            <input type="text" id="inputStageProfileName" value="${escapeHtml(activeProf.name)}" class="wechat-clean-input" style="font-size:11px;padding:3px 6px;height:24px;">
                                            <button type="button" id="btnRenameProfile" style="border:none;background:#07c160;color:#fff;border-radius:4px;padding:0 8px;font-size:10.5px;cursor:pointer;">改名</button>
                                        </div>
                                        ${videoStageData.profiles.length > 1 ? `
                                            <button type="button" id="btnDeleteCurrentProfile" style="border:none;background:none;color:#fa5151;font-size:11px;cursor:pointer;padding:0 4px;">删除</button>
                                        ` : ''}
                                    </div>
                                </div>

                                <!-- 🌟 独立舞台调位快捷通道（无需通话即可调位） -->
                                <div style="background:#eefbf3;border-radius:8px;padding:10px 12px;border:1px solid #bcecd0;display:flex;justify-content:space-between;align-items:center;">
                                    <div>
                                        <div style="font-size:12px;font-weight:600;color:#07c160;">舞台位置与缩放微调</div>
                                        <div style="font-size:10.5px;color:#558f6b;margin-top:2px;">无需连线，全屏手势预览调位</div>
                                    </div>
                                    <button type="button" id="btnOpenStagePreviewAdjust" style="border:none;background:#07c160;color:#ffffff;padding:5px 12px;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(7,193,96,0.3);">
                                        开始调位 ➔
                                    </button>
                                </div>

                                <!-- 舞台背景图管理 -->
                                <div style="background:#f8f9fa;border-radius:8px;padding:10px;border:0.5px solid #eee;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                        <div style="font-size:12px;font-weight:600;color:#333;">视频背景（支持图片/GIF/视频）：</div>
                                        <button type="button" id="btnUploadStageBgUrl" style="border:1px solid #07c160;background:#f0faf4;color:#07c160;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer;">直链导入</button>
                                    </div>
                                    <div style="display:flex;align-items:center;gap:12px;">
                                        <div id="btnStageBgPreviewBox" style="width:72px;height:72px;border-radius:8px;background:#e5e7eb;overflow:hidden;cursor:pointer;position:relative;display:flex;align-items:center;justify-content:center;border:1px dashed #bbb;" title="点击导入或更换背景">
                                            ${activeProf.backgroundUrl ? `
                                                ${activeProf.bgType === 'video' ? `
                                                    <video src="${activeProf.backgroundUrl}" muted loop autoplay playsinline style="width:100%;height:100%;object-fit:cover;pointer-events:none;"></video>
                                                ` : `
                                                    <img src="${activeProf.backgroundUrl}" style="width:100%;height:100%;object-fit:cover;pointer-events:none;" onerror="this.src='assets/icons/chat.png';">
                                                `}
                                                <div style="position:absolute;inset:0;background:rgba(0,0,0,0.3);color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s;" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0'">换图</div>
                                            ` : `
                                                <span style="font-size:11px;color:#888;">+ 导入</span>
                                            `}
                                        </div>
                                        <div style="flex:1;font-size:11.5px;color:#666;line-height:1.5;">
                                            <div>${activeProf.backgroundUrl ? '<span style="color:#07c160;font-weight:600;">● 已设置自定义背景</span>' : '当前使用默认黑灰背景'}</div>
                                            <div style="color:#999;font-size:10.5px;margin-top:2px;">点击方框可从本地选取，再次点击可弹窗更换或删除。</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 角色多表情差分立绘管理（5大核心表情） -->
                                <div style="background:#f8f9fa;border-radius:8px;padding:10px;border:0.5px solid #eee;">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                        <div style="font-size:12px;font-weight:600;color:#333;">表情差分立绘（透明PNG/GIF/视频）：</div>
                                        <button type="button" id="btnAddCustomExpression" style="border:none;background:#07c160;color:#fff;border-radius:4px;padding:2px 7px;font-size:11px;cursor:pointer;font-weight:600;">+ 新表情</button>
                                    </div>
                                    <div style="font-size:10.5px;color:#888;margin-bottom:8px;">同一方案下所有表情统一手势位置，通话中根据对话情绪自动切换：</div>
                                    
                                    <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:6px;">
                                        ${allExprs.map(e => {
                                            const spriteUrl = activeProf.sprites && activeProf.sprites[e.id];
                                            const isVideo = spriteUrl && (spriteUrl.startsWith('data:video') || spriteUrl.endsWith('.mp4') || spriteUrl.endsWith('.webm'));
                                            return `
                                                <div class="sprite-slot-card" data-eid="${e.id}" data-label="${escapeHtml(e.label)}" style="display:flex;flex-direction:column;align-items:center;background:#fff;border:1px solid ${spriteUrl ? '#07c160' : '#e0e0e0'};border-radius:8px;padding:6px 2px;cursor:pointer;position:relative;">
                                                    <div style="width:44px;height:52px;background:#f3f4f6;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;position:relative;">
                                                        ${spriteUrl ? `
                                                            ${isVideo ? `
                                                                <video src="${spriteUrl}" muted loop autoplay playsinline style="width:100%;height:100%;object-fit:contain;pointer-events:none;"></video>
                                                            ` : `
                                                                <img src="${spriteUrl}" style="width:100%;height:100%;object-fit:contain;pointer-events:none;" onerror="this.src='assets/icons/chat.png';">
                                                            `}
                                                        ` : `
                                                            <span style="font-size:15px;color:#bbb;">+</span>
                                                        `}
                                                    </div>
                                                    <span style="font-size:10px;color:#333;margin-top:4px;font-weight:500;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;">${escapeHtml(e.label)}</span>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>
                        ` : `
                            <!-- 基础头像框与气泡样式分区 -->
                            <div style="display:flex;background:#f2f2f2;border-radius:8px;padding:2px;margin-bottom:4px;">
                                <button type="button" id="tabTargetNpc" style="flex:1;padding:6px 0;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer;background:${!isUser ? '#ffffff' : 'transparent'};color:${!isUser ? '#07c160' : '#666'};">
                                    角色「${escapeHtml(npc.name || 'NPC')}」
                                </button>
                                <button type="button" id="tabTargetUser" style="flex:1;padding:6px 0;border-radius:6px;border:none;font-size:12px;font-weight:600;cursor:pointer;background:${isUser ? '#ffffff' : 'transparent'};color:${isUser ? '#07c160' : '#666'};">
                                    我方（用户自身）
                                </button>
                            </div>

                            <div style="background:#f7f7f7;border-radius:8px;padding:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                                <div style="position:relative;width:54px;height:54px;">
                                    <img src="${curAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:${getShapeBorderRadius(curShape)};display:block;" onerror="this.src='assets/icons/chat.png';" />
                                    ${curFrameUrl ? `<img src="${curFrameUrl}" style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%) scale(${curFrameScale});width:100%;height:100%;pointer-events:none;" />` : ''}
                                </div>
                                <span style="font-size:11px;color:#777;margin-top:6px;">${curFrameUrl ? (curFrameObj.name || '已选框') : '未穿戴头像框'}</span>
                            </div>

                            <div>
                                <div style="font-size:12px;font-weight:600;color:#444;margin-bottom:6px;">头像形状：</div>
                                <div style="display:flex;gap:6px;">
                                    ${!isUser ? `<button type="button" class="opt-shape-btn" data-val="inherit" style="flex:1;padding:6px 0;font-size:11px;border-radius:6px;border:1px solid ${npcShape === 'inherit' ? '#07c160' : '#e0e0e0'};background:${npcShape === 'inherit' ? '#e8f7ed' : '#fff'};color:${npcShape === 'inherit' ? '#07c160' : '#444'};cursor:pointer;">跟随全局</button>` : ''}
                                    <button type="button" class="opt-shape-btn" data-val="circle" style="flex:1;padding:6px 0;font-size:11px;border-radius:6px;border:1px solid ${(isUser ? userShape : npcShape) === 'circle' ? '#07c160' : '#e0e0e0'};background:${(isUser ? userShape : npcShape) === 'circle' ? '#e8f7ed' : '#fff'};color:${(isUser ? userShape : npcShape) === 'circle' ? '#07c160' : '#444'};cursor:pointer;">正圆</button>
                                    <button type="button" class="opt-shape-btn" data-val="squircle" style="flex:1;padding:6px 0;font-size:11px;border-radius:6px;border:1px solid ${(isUser ? userShape : npcShape) === 'squircle' ? '#07c160' : '#e0e0e0'};background:${(isUser ? userShape : npcShape) === 'squircle' ? '#e8f7ed' : '#fff'};color:${(isUser ? userShape : npcShape) === 'squircle' ? '#07c160' : '#444'};cursor:pointer;">圆角方</button>
                                    <button type="button" class="opt-shape-btn" data-val="square" style="flex:1;padding:6px 0;font-size:11px;border-radius:6px;border:1px solid ${(isUser ? userShape : npcShape) === 'square' ? '#07c160' : '#e0e0e0'};background:${(isUser ? userShape : npcShape) === 'square' ? '#e8f7ed' : '#fff'};color:${(isUser ? userShape : npcShape) === 'square' ? '#07c160' : '#444'};cursor:pointer;">直角方</button>
                                </div>
                            </div>

                            <div>
                                <div onclick="window.toggleCardDecorFramesCollapse()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;margin-bottom:6px;">
                                    <span style="font-size:12px;font-weight:600;color:#444;">头像框（点击试穿，再次脱下）：</span>
                                    <span id="cardDecorFramesArrow" style="font-size:11px;color:#07c160;font-weight:bold;">▼ 收起</span>
                                </div>

                                <div id="cardDecorFramesGrid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(64px, 1fr));gap:8px;">
                                    ${!isUser ? `
                                        <div class="opt-frame-card" data-val="inherit" style="background:${npcFrameId === 'inherit' ? '#e8f7ed' : '#f9f9f9'};border:1px solid ${npcFrameId === 'inherit' ? '#07c160' : '#eee'};border-radius:8px;padding:6px 2px;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
                                            <div style="width:36px;height:36px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;font-size:10px;color:#777;margin-bottom:4px;">默认</div>
                                            <span style="font-size:10px;color:#333;">跟随全局</span>
                                        </div>
                                    ` : ''}

                                    ${frames.map(f => {
                                        const isSelected = (isUser ? userFrameId : npcFrameId) === f.id;
                                        const sVal = f.scale || 1.18;
                                        return `
                                            <div class="opt-frame-card" data-val="${f.id}" style="position:relative;background:${isSelected ? '#e8f7ed' : '#f9f9f9'};border:1px solid ${isSelected ? '#07c160' : '#eee'};border-radius:8px;padding:6px 2px;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
                                                <div style="position:relative;width:36px;height:36px;margin-bottom:4px;">
                                                    <img src="${curAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" onerror="this.src='assets/icons/chat.png';" />
                                                    ${f.url ? `<img src="${f.url}" style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%) scale(${sVal});width:100%;height:100%;pointer-events:none;" />` : ''}
                                                </div>
                                                <span style="font-size:10px;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:56px;text-align:center;">${escapeHtml(f.name)}</span>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>

                            <div>
                                <div style="font-size:12px;font-weight:600;color:#444;margin-bottom:6px;">气泡样式：</div>
                                <div style="display:flex;flex-direction:column;gap:6px;">
                                    ${!isUser ? `
                                        <button type="button" class="opt-bubble-btn" data-val="inherit" style="padding:7px 10px;font-size:11.5px;border-radius:6px;border:1px solid ${npcBubbleId === 'inherit' ? '#07c160' : '#e0e0e0'};background:${npcBubbleId === 'inherit' ? '#e8f7ed' : '#fff'};color:${npcBubbleId === 'inherit' ? '#07c160' : '#444'};cursor:pointer;text-align:left;display:flex;justify-content:space-between;">
                                            <span>跟随全局装扮</span>
                                            ${npcBubbleId === 'inherit' ? '<span style="color:#07c160;font-weight:bold;">✓</span>' : ''}
                                        </button>
                                    ` : ''}
                                    ${bubbles.map(b => {
                                        const isBSelected = (isUser ? userBubbleId : npcBubbleId) === b.id;
                                        return `
                                            <button type="button" class="opt-bubble-btn" data-val="${b.id}" style="padding:7px 10px;font-size:11.5px;border-radius:6px;border:1px solid ${isBSelected ? '#07c160' : '#e0e0e0'};background:${isBSelected ? '#e8f7ed' : '#fff'};color:${isBSelected ? '#07c160' : '#444'};cursor:pointer;text-align:left;display:flex;justify-content:space-between;">
                                                <span>${escapeHtml(b.name)}</span>
                                                ${isBSelected ? '<span style="color:#07c160;font-weight:bold;">✓</span>' : ''}
                                            </button>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `}
                    </div>

                    <div style="display:flex;gap:8px;margin-top:12px;">
                        <button type="button" id="btnSaveDecorChoice" style="flex:1;padding:8px;background:#07c160;border:none;border-radius:6px;color:#fff;font-size:12.5px;font-weight:600;cursor:pointer;">保存配置</button>
                        <button type="button" id="btnCancelDecorChoice" style="flex:1;padding:8px;background:#f2f2f2;border:none;border-radius:6px;color:#555;font-size:12.5px;cursor:pointer;">返回名片</button>
                    </div>
                </div>
            `;

            mask.querySelector('#tabMainVideoStage')?.addEventListener('click', () => {
                activeMainTab = 'videoStage';
                renderDecorModalInner();
            });
            mask.querySelector('#tabMainBasicDecor')?.addEventListener('click', () => {
                activeMainTab = 'decor';
                renderDecorModalInner();
            });

            if (activeMainTab === 'decor') {
                mask.querySelector('#tabTargetNpc')?.addEventListener('click', () => { activeDecorTarget = 'npc'; renderDecorModalInner(); });
                mask.querySelector('#tabTargetUser')?.addEventListener('click', () => { activeDecorTarget = 'user'; renderDecorModalInner(); });

                mask.querySelectorAll('.opt-shape-btn').forEach(btn => {
                    btn.onclick = () => {
                        const val = btn.getAttribute('data-val');
                        if (isUser) userShape = val;
                        else npcShape = val;
                        renderDecorModalInner();
                    };
                });

                mask.querySelectorAll('.opt-frame-card').forEach(card => {
                    card.onclick = () => {
                        const val = card.getAttribute('data-val');
                        if (isUser) userFrameId = (userFrameId === val) ? 'frame_none' : val;
                        else npcFrameId = (npcFrameId === val) ? 'frame_none' : val;
                        renderDecorModalInner();
                    };
                });

                mask.querySelectorAll('.opt-bubble-btn').forEach(btn => {
                    btn.onclick = () => {
                        const val = btn.getAttribute('data-val');
                        if (isUser) userBubbleId = val;
                        else npcBubbleId = val;
                        renderDecorModalInner();
                    };
                });
            } else {
                // 🌟 独立舞台调位快捷通道
                mask.querySelector('#btnOpenStagePreviewAdjust')?.addEventListener('click', () => {
                    openStandAloneStageAdjuster(npcId, activeProf);
                });

                mask.querySelectorAll('.btn-switch-stage-profile').forEach(btn => {
                    btn.onclick = () => {
                        videoStageData.activeProfileId = btn.getAttribute('data-pid');
                        renderDecorModalInner();
                    };
                });

                mask.querySelector('#btnAddNewStageProfile')?.addEventListener('click', () => {
                    const newId = 'prof_' + Date.now();
                    const newIndex = videoStageData.profiles.length + 1;
                    videoStageData.profiles.push({
                        id: newId,
                        name: `方案${newIndex}`,
                        backgroundUrl: '',
                        bgType: 'image',
                        sprites: { default: '' },
                        customExpressions: [],
                        position: { x: 0, y: 0, scale: 1.0 },
                        bgPosition: { x: 0, y: 0, scale: 1.0 }
                    });
                    videoStageData.activeProfileId = newId;
                    renderDecorModalInner();
                });

                mask.querySelector('#btnRenameProfile')?.addEventListener('click', () => {
                    const newName = mask.querySelector('#inputStageProfileName')?.value.trim();
                    if (newName && activeProf) {
                        activeProf.name = newName;
                        if (typeof showToast === 'function') showToast('方案名称已更新', 'success', 1000);
                        renderDecorModalInner();
                    }
                });

                mask.querySelector('#btnDeleteCurrentProfile')?.addEventListener('click', () => {
                    if (videoStageData.profiles.length <= 1) return;
                    if (confirm(`确定要删除方案「${activeProf.name}」吗？`)) {
                        videoStageData.profiles = videoStageData.profiles.filter(p => p.id !== activeProf.id);
                        videoStageData.activeProfileId = videoStageData.profiles[0].id;
                        renderDecorModalInner();
                    }
                });

                mask.querySelector('#btnExportCurrentProfile')?.addEventListener('click', () => {
                    exportSingleStageProfile(activeProf, npc.name || 'NPC');
                });

                mask.querySelector('#btnImportProfileDirect')?.addEventListener('click', () => {
                    importSingleStageProfile((imported) => {
                        const newId = 'prof_' + Date.now();
                        imported.id = newId;
                        videoStageData.profiles.push(imported);
                        videoStageData.activeProfileId = newId;
                        if (typeof showToast === 'function') showToast(`已导入方案「${imported.name}」`, 'success', 1200);
                        renderDecorModalInner();
                    });
                });

                mask.querySelector('#btnStageBgPreviewBox')?.addEventListener('click', () => {
                    if (activeProf.backgroundUrl) {
                        showMediaReplaceDialog('背景', (action) => {
                            if (action === 'replace') {
                                pickLocalMediaFile((mediaData, mediaType) => {
                                    activeProf.backgroundUrl = mediaData;
                                    activeProf.bgType = mediaType;
                                    renderDecorModalInner();
                                });
                            } else if (action === 'delete') {
                                activeProf.backgroundUrl = '';
                                activeProf.bgType = 'image';
                                renderDecorModalInner();
                            }
                        });
                    } else {
                        pickLocalMediaFile((mediaData, mediaType) => {
                            activeProf.backgroundUrl = mediaData;
                            activeProf.bgType = mediaType;
                            renderDecorModalInner();
                        });
                    }
                });

                mask.querySelector('#btnUploadStageBgUrl')?.addEventListener('click', () => {
                    promptMediaUrl('背景直链', activeProf.backgroundUrl || '', (url) => {
                        activeProf.backgroundUrl = url;
                        activeProf.bgType = (url.endsWith('.mp4') || url.endsWith('.webm')) ? 'video' : 'image';
                        renderDecorModalInner();
                    });
                });

                mask.querySelectorAll('.sprite-slot-card').forEach(card => {
                    card.onclick = () => {
                        const exprId = card.getAttribute('data-eid');
                        const exprLabel = card.getAttribute('data-label');
                        if (!activeProf.sprites) activeProf.sprites = {};

                        const curSprite = activeProf.sprites[exprId];
                        if (curSprite) {
                            showMediaReplaceDialog(`「${exprLabel}」立绘`, (action) => {
                                if (action === 'replace') {
                                    pickLocalMediaFile((mediaData) => {
                                        activeProf.sprites[exprId] = mediaData;
                                        renderDecorModalInner();
                                    });
                                } else if (action === 'url') {
                                    promptMediaUrl(`「${exprLabel}」立绘直链`, curSprite, (url) => {
                                        activeProf.sprites[exprId] = url;
                                        renderDecorModalInner();
                                    });
                                } else if (action === 'delete') {
                                    delete activeProf.sprites[exprId];
                                    renderDecorModalInner();
                                }
                            }, true);
                        } else {
                            showMediaPickDialog(`导入「${exprLabel}」立绘`, (mediaData) => {
                                activeProf.sprites[exprId] = mediaData;
                                renderDecorModalInner();
                            });
                        }
                    };
                });

                mask.querySelector('#btnAddCustomExpression')?.addEventListener('click', () => {
                    if (typeof window.openWechatCleanModal === 'function') {
                        window.openWechatCleanModal('添加自定义表情槽', `
                            <div style="text-align:left;">
                                <div style="font-size:12px;color:#666;margin-bottom:6px;">请输入表情名称（如：黑化、呆滞、wink）：</div>
                                <input type="text" id="wcleanNewExprName" class="wechat-clean-input" placeholder="表情名称..." maxlength="10">
                            </div>
                        `, () => {
                            const name = document.getElementById('wcleanNewExprName')?.value.trim();
                            if (!name) return;
                            const eid = 'expr_' + Date.now();
                            if (!Array.isArray(activeProf.customExpressions)) activeProf.customExpressions = [];
                            activeProf.customExpressions.push({ id: eid, label: name });
                            renderDecorModalInner();
                        });
                    }
                });
            }

            mask.querySelector('#btnDecorModalX').onclick = () => { mask.remove(); openNpcProfileCardModal(npcId); };
            mask.querySelector('#btnCancelDecorChoice').onclick = () => { mask.remove(); openNpcProfileCardModal(npcId); };

            mask.querySelector('#btnSaveDecorChoice').onclick = () => {
                localStorage.setItem('mcyt_active_avatar_shape', userShape);
                localStorage.setItem('mcyt_active_decor_frame', userFrameId);
                localStorage.setItem('mcyt_active_decor_bubble', userBubbleId);

                npc.chatSettings.decor = {
                    avatarShape: npcShape === 'inherit' ? null : npcShape,
                    frameId: npcFrameId === 'inherit' ? null : npcFrameId,
                    bubbleId: npcBubbleId === 'inherit' ? null : npcBubbleId
                };

                npc.chatSettings.videoStage = videoStageData;

                if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
                if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                if (typeof showToast === 'function') showToast('装扮与舞台立绘已保存', 'success', 1200);

                mask.remove();
                openNpcProfileCardModal(npcId);
                if (window.G.currentChatNpc === npcId && typeof window.renderSingleChatWindow === 'function') {
                    window.renderSingleChatWindow();
                }
            };
        }

        window.toggleCardDecorFramesCollapse = function () {
            const grid = document.getElementById('cardDecorFramesGrid');
            const arrow = document.getElementById('cardDecorFramesArrow');
            if (!grid || !arrow) return;
            const isHidden = (grid.style.display === 'none');
            grid.style.display = isHidden ? 'grid' : 'none';
            arrow.textContent = isHidden ? '▼ 收起' : '▶ 展开';
        };

        renderDecorModalInner();
        document.body.appendChild(mask);
    }
    window.openNpcDecorModal = openNpcDecorModal;

    // 🌟 免通话独立全屏 1:1 手势舞台调位器
    function openStandAloneStageAdjuster(npcId, prof) {
        if (!prof) return;
        if (!prof.position) prof.position = { x: 0, y: 0, scale: 1.0 };

        const testSprite = prof.sprites?.default || Object.values(prof.sprites || {})[0] || '';
        const bgUrl = prof.backgroundUrl || '';
        const isBgVideo = prof.bgType === 'video';

        const adjusterMask = document.createElement('div');
        adjusterMask.style.cssText = `
            position: fixed; inset: 0; z-index: 100020;
            background: #0d0f12; display: flex; flex-direction: column;
            overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            user-select: none; -webkit-user-select: none;
        `;

        adjusterMask.innerHTML = `
            <!-- 顶栏状态 -->
            <div style="position: absolute; top: 16px; left: 16px; right: 16px; z-index: 25; display: flex; justify-content: space-between; align-items: center;">
                <div style="padding: 5px 12px; border-radius: 20px; background: rgba(0,0,0,0.5); backdrop-filter: blur(10px); color: #fff; font-size: 12px; border: 0.5px solid rgba(255,255,255,0.15);">
                    <span style="color: #07c160; font-weight: bold;">●</span> 舞台调位预览（方案: ${escapeHtml(prof.name)}）
                </div>
                <button type="button" id="btnFinishStandAloneAdjust" style="border: none; background: #07c160; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(7,193,96,0.35);">
                    完成并保存
                </button>
            </div>

            <!-- 背景预览 -->
            <div style="position: absolute; inset: 0; z-index: 1; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                ${bgUrl ? `
                    ${isBgVideo ? `
                        <video src="${bgUrl}" muted loop autoplay playsinline style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;"></video>
                    ` : `
                        <img src="${bgUrl}" style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;">
                    `}
                ` : `
                    <div style="width: 100%; height: 100%; background: radial-gradient(circle at center, #1e2638 0%, #0a0d14 100%);"></div>
                `}
            </div>

            <!-- 立绘手势框 -->
            <div style="flex: 1; position: relative; z-index: 5; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <div id="standAloneTransformBox" style="position: absolute; width: 280px; height: 380px; border: 1.5px dashed #07c160; background: rgba(7,193,96,0.08); display: flex; align-items: center; justify-content: center; transform-origin: center center; cursor: move; touch-action: none;">
                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
                        ${testSprite ? `
                            <img src="${testSprite}" style="width: 100%; height: 100%; object-fit: contain;">
                        ` : `
                            <span style="font-size: 13px; color: #07c160; background: rgba(0,0,0,0.6); padding: 4px 8px; border-radius: 4px;">暂无立绘，拖动预览框调位</span>
                        `}
                    </div>
                    <div id="standAloneResizeHandle" style="position: absolute; right: -9px; bottom: -9px; width: 24px; height: 24px; border-radius: 50%; background: #07c160; border: 2px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.5); cursor: nwse-resize; touch-action: none;"></div>
                </div>
            </div>

            <!-- 底部操作提示 -->
            <div style="position: absolute; bottom: 24px; left: 0; right: 0; z-index: 25; display: flex; justify-content: center; pointer-events: none;">
                <div style="padding: 6px 14px; border-radius: 16px; background: rgba(0,0,0,0.65); backdrop-filter: blur(10px); color: rgba(255,255,255,0.85); font-size: 11px;">
                    单指按住方框拖动位移 · 按住右下角绿点放大缩小
                </div>
            </div>
        `;

        document.body.appendChild(adjusterMask);

        const box = adjusterMask.querySelector('#standAloneTransformBox');
        const handle = adjusterMask.querySelector('#standAloneResizeHandle');

        const applyTransform = () => {
            box.style.transform = `translate(${prof.position.x}px, ${prof.position.y}px) scale(${prof.position.scale})`;
        };
        applyTransform();

        // 绑定手势平移
        let startX = 0, startY = 0;
        let initPosX = prof.position.x;
        let initPosY = prof.position.y;
        let isDragging = false;

        box.addEventListener('touchstart', (e) => {
            if (e.target === handle) return;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            initPosX = prof.position.x;
            initPosY = prof.position.y;
            isDragging = true;
            e.stopPropagation();
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            prof.position.x = initPosX + (touch.clientX - startX);
            prof.position.y = initPosY + (touch.clientY - startY);
            applyTransform();
            e.preventDefault();
        }, { passive: false });

        window.addEventListener('touchend', () => { isDragging = false; });

        // 绑定右下角缩放手柄
        let resizeStartX = 0;
        let initScale = prof.position.scale;
        let isResizing = false;

        handle.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            resizeStartX = touch.clientX;
            initScale = prof.position.scale;
            isResizing = true;
            e.stopPropagation();
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (!isResizing) return;
            const touch = e.touches[0];
            const dx = touch.clientX - resizeStartX;
            prof.position.scale = parseFloat(Math.min(2.5, Math.max(0.4, initScale + (dx / 180))).toFixed(2));
            applyTransform();
            e.preventDefault();
        }, { passive: false });

        window.addEventListener('touchend', () => { isResizing = false; });

        // 完成保存
        adjusterMask.querySelector('#btnFinishStandAloneAdjust').onclick = () => {
            if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
            adjusterMask.remove();
            if (typeof showToast === 'function') showToast('舞台位置已保存', 'success', 1000);
        };
    }

    function pickLocalMediaFile(onSuccess) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/mp4,video/webm,.gif';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            input.remove();
            if (!file) return;

            const isVideo = file.type.startsWith('video/');
            const reader = new FileReader();
            reader.onload = (evt) => {
                const res = evt.target.result;
                onSuccess(res, isVideo ? 'video' : 'image');
            };
            reader.readAsDataURL(file);
        };

        input.click();
    }

    function promptMediaUrl(title, defaultVal, onSuccess) {
        if (typeof window.openWechatCleanModal === 'function') {
            window.openWechatCleanModal(`导入${title}`, `
                <div style="text-align:left;">
                    <div style="font-size:12px;color:#666;margin-bottom:6px;">支持输入图片、GIF 动图或短视频 URL 直链：</div>
                    <input type="text" id="wcleanPromptMediaInput" value="${escapeHtml(defaultVal)}" class="wechat-clean-input" placeholder="https://...">
                </div>
            `, () => {
                const val = document.getElementById('wcleanPromptMediaInput')?.value.trim();
                if (val) onSuccess(val);
            });
        }
    }

    function showMediaReplaceDialog(label, onAction, allowUrl = false) {
        let mask = document.createElement('div');
        mask.className = 'wechat-action-sheet-mask';
        mask.innerHTML = `
            <div class="wechat-action-sheet-box">
                <div style="padding:12px 16px;text-align:center;font-size:13px;color:#888;border-bottom:0.5px solid #eee;">
                    当前已导入${label}，请选择操作
                </div>
                <div class="wechat-action-item" id="actSheetReplaceLocal" style="color:#07c160;font-weight:600;">从相册重新选择更换</div>
                ${allowUrl ? `<div class="wechat-action-item" id="actSheetReplaceUrl">填入直链更换</div>` : ''}
                <div class="wechat-action-item" id="actSheetDelete" style="color:#fa5151;">清除当前${label}</div>
                <div class="wechat-action-cancel" id="actSheetCancel">取消</div>
            </div>
        `;
        document.body.appendChild(mask);
        const close = () => mask.remove();

        mask.querySelector('#actSheetReplaceLocal').onclick = () => { close(); onAction('replace'); };
        if (allowUrl) {
            mask.querySelector('#actSheetReplaceUrl').onclick = () => { close(); onAction('url'); };
        }
        mask.querySelector('#actSheetDelete').onclick = () => { close(); onAction('delete'); };
        mask.querySelector('#actSheetCancel').onclick = close;
    }

    function showMediaPickDialog(title, onSuccess) {
        let mask = document.createElement('div');
        mask.className = 'wechat-action-sheet-mask';
        mask.innerHTML = `
            <div class="wechat-action-sheet-box">
                <div style="padding:12px 16px;text-align:center;font-size:13px;color:#888;border-bottom:0.5px solid #eee;">
                    ${escapeHtml(title)}
                </div>
                <div class="wechat-action-item" id="actPickLocal" style="color:#07c160;font-weight:600;">从手机相册导入（图片/GIF/视频）</div>
                <div class="wechat-action-item" id="actPickUrl">输入网络图床直链</div>
                <div class="wechat-action-cancel" id="actPickCancel">取消</div>
            </div>
        `;
        document.body.appendChild(mask);
        const close = () => mask.remove();

        mask.querySelector('#actPickLocal').onclick = () => {
            close();
            pickLocalMediaFile((mediaData) => {
                onSuccess(mediaData);
            });
        };
        mask.querySelector('#actPickUrl').onclick = () => {
            close();
            promptMediaUrl('立绘直链', '', (url) => {
                onSuccess(url);
            });
        };
        mask.querySelector('#actPickCancel').onclick = close;
    }

    function exportSingleStageProfile(profile, charName) {
        try {
            const dataStr = JSON.stringify(profile, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${charName}_${profile.name}_舞台方案.json`;
            a.click();
            URL.revokeObjectURL(url);
            if (typeof showToast === 'function') showToast('舞台方案已导出', 'success', 1000);
        } catch (e) {
            console.error('[ExportProfile] 导出失败:', e);
            if (typeof showToast === 'function') showToast('导出失败', 'error');
        }
    }

    function importSingleStageProfile(onSuccess) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            input.remove();
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    if (!parsed || typeof parsed !== 'object') throw new Error('无效的方案配置');
                    if (!parsed.sprites) parsed.sprites = {};
                    if (!parsed.name) parsed.name = '导入方案';
                    onSuccess(parsed);
                } catch (err) {
                    if (typeof showToast === 'function') showToast('无法识别的方案文件', 'error');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }

    function openNpcSettingsModal(npcId) {
        if (!window.G || !window.G.npcs) return;
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        const isDating = window.ChatPromptEngine && window.ChatPromptEngine.isNpcInDatingRelationship(npc);
        const regionList = ['中国', '美国 - 东部', '美国 - 西部', '英国', '西班牙', '日本', '韩国', '加拿大', '澳大利亚', '德国', '法国', '俄罗斯 - 莫斯科', '意大利', '新加坡', '泰国'];

        const regionOptionsHtml = regionList.map(r => `
            <option value="${r}" ${npc.region === r ? 'selected' : ''}>${r}</option>
        `).join('');

        if (!npc.chatSettings) {
            npc.chatSettings = {
                minMsgs: 1,
                maxMsgs: 3,
                voiceFreq: 'rare',
                disableTimezone: false,
                disableBilingual: false,
                tts: { enabled: false, voice: '', speed: 1.0 }
            };
        }
        const minMsgs = Math.max(1, parseInt(npc.chatSettings.minMsgs) || 1);
        const maxMsgs = Math.max(minMsgs, parseInt(npc.chatSettings.maxMsgs) || 3);
        const voiceFreq = npc.chatSettings.voiceFreq || 'rare';
        const disableTimezone = !!npc.chatSettings.disableTimezone;
        const disableBilingual = !!npc.chatSettings.disableBilingual;
        const curFavor = parseFloat(npc.favor !== undefined ? npc.favor : 50);

        const curTtsEnabled = !!(npc.chatSettings.tts && npc.chatSettings.tts.enabled);
        const curTtsVoice = (npc.chatSettings.tts && npc.chatSettings.tts.voice) || '';
        const curTtsSpeed = (npc.chatSettings.tts && npc.chatSettings.tts.speed) || 1.0;

        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal('资料设置', `
                <div style="display:flex;flex-direction:column;gap:11px;text-align:left;max-height:68vh;overflow-y:auto;padding-right:2px;">
                    <div>
                        <label style="font-size:11.5px;color:#777;font-weight:500;">备注名</label>
                        <input type="text" id="wcleanSetNpcRemark" value="${escapeHtml(npc.remark || '')}" placeholder="添加备注名..." maxlength="20" class="wechat-clean-input" style="margin-top:3px;">
                    </div>
                    <div>
                        <label style="font-size:11.5px;color:#777;font-weight:500;">角色名字</label>
                        <input type="text" id="wcleanSetNpcName" value="${escapeHtml(npc.name || '')}" placeholder="输入角色真实名字..." maxlength="20" class="wechat-clean-input" style="margin-top:3px;">
                    </div>
                    <div>
                        <label style="font-size:11.5px;color:#777;font-weight:500;">个性签名</label>
                        <input type="text" id="wcleanSetNpcSignature" value="${escapeHtml(npc.signature || '')}" placeholder="角色的个性签名..." maxlength="60" class="wechat-clean-input" style="margin-top:3px;">
                    </div>
                    <div>
                        <label style="font-size:11.5px;color:#777;font-weight:500;">常驻地区</label>
                        <select id="wcleanSetNpcRegion" class="wechat-clean-input" style="margin-top:3px;">
                            ${regionOptionsHtml}
                        </select>
                    </div>

                    <div style="background:#f8f9fa;border-radius:8px;padding:10px 12px;border:0.5px solid #eee;display:flex;flex-direction:column;gap:10px;">
                        <div style="font-size:12px;font-weight:600;color:#181818;">聊天偏好与输出控制</div>

                        <div>
                            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:#666;margin-bottom:5px;">
                                <span>单次发送条数</span>
                                <span style="font-weight:600;color:#07c160;"><span id="wcleanMinMsgsLabel">${minMsgs}</span> 条 ~ <span id="wcleanMaxMsgsLabel">${maxMsgs}</span> 条</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="font-size:11px;color:#888;">最少</span>
                                <input type="range" id="wcleanMinMsgsRange" min="1" max="5" value="${minMsgs}" style="flex:1;accent-color:#07c160;">
                                <span style="font-size:11px;color:#888;">最多</span>
                                <input type="range" id="wcleanMaxMsgsRange" min="1" max="8" value="${maxMsgs}" style="flex:1;accent-color:#07c160;">
                            </div>
                        </div>

                        <div>
                            <div style="font-size:11.5px;color:#666;margin-bottom:5px;">语音发送频率</div>
                            <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;" id="voiceFreqSelectorGroup">
                                <button type="button" class="voice-freq-btn" data-val="never" style="padding:5px 0;border-radius:5px;font-size:11.5px;cursor:pointer;border:1px solid ${voiceFreq === 'never' ? '#07c160' : '#e0e0e0'};background:${voiceFreq === 'never' ? '#f0f9eb' : '#fff'};color:${voiceFreq === 'never' ? '#07c160' : '#444'};font-weight:${voiceFreq === 'never' ? '600' : 'normal'};">从不</button>
                                <button type="button" class="voice-freq-btn" data-val="rare" style="padding:5px 0;border-radius:5px;font-size:11.5px;cursor:pointer;border:1px solid ${voiceFreq === 'rare' ? '#07c160' : '#e0e0e0'};background:${voiceFreq === 'rare' ? '#f0f9eb' : '#fff'};color:${voiceFreq === 'rare' ? '#07c160' : '#444'};font-weight:${voiceFreq === 'rare' ? '600' : 'normal'};">偶尔</button>
                                <button type="button" class="voice-freq-btn" data-val="often" style="padding:5px 0;border-radius:5px;font-size:11.5px;cursor:pointer;border:1px solid ${voiceFreq === 'often' ? '#07c160' : '#e0e0e0'};background:${voiceFreq === 'often' ? '#f0f9eb' : '#fff'};color:${voiceFreq === 'often' ? '#07c160' : '#444'};font-weight:${voiceFreq === 'often' ? '600' : 'normal'};">经常</button>
                                <button type="button" class="voice-freq-btn" data-val="voice_only" style="padding:5px 0;border-radius:5px;font-size:11.5px;cursor:pointer;border:1px solid ${voiceFreq === 'voice_only' ? '#07c160' : '#e0e0e0'};background:${voiceFreq === 'voice_only' ? '#f0f9eb' : '#fff'};color:${voiceFreq === 'voice_only' ? '#07c160' : '#444'};font-weight:${voiceFreq === 'voice_only' ? '600' : 'normal'};">全语音</button>
                            </div>
                            <input type="hidden" id="wcleanSetVoiceFreqVal" value="${voiceFreq}">
                        </div>

                        <div style="border-top:0.5px solid #eee;padding-top:8px;">
                            <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;font-size:12px;color:#181818;margin-bottom:6px;">
                                <div style="display:flex;flex-direction:column;">
                                    <span style="font-weight:600;">启用角色专属语音 TTS</span>
                                    <span style="font-size:10.5px;color:#888;">未启用时，点击语音条只展开文字与背景音</span>
                                </div>
                                <input type="checkbox" id="wcleanSetNpcTtsEnabled" ${curTtsEnabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:#07c160;cursor:pointer;">
                            </label>

                            <div id="wcleanNpcTtsFieldsWrap" style="display:${curTtsEnabled ? 'flex' : 'none'};flex-direction:column;gap:6px;margin-top:6px;background:#ffffff;padding:8px;border-radius:6px;border:0.5px solid #e8e8e8;">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <span style="font-size:11px;color:#666;">音色名称 / ID</span>
                                    <button type="button" id="btnPickTtsVoiceDirect" style="border:1px solid #07c160;background:#f0faf4;color:#07c160;font-size:10.5px;padding:2px 8px;border-radius:4px;cursor:pointer;font-weight:600;">选择音色 ▾</button>
                                </div>
                                <div style="display:flex;gap:6px;align-items:center;">
                                    <input type="text" id="wcleanSetNpcTtsVoice" value="${escapeHtml(curTtsVoice)}" placeholder="输入或点选音色..." class="wechat-clean-input" style="flex:1;font-size:12px;">
                                    <input type="number" id="wcleanSetNpcTtsSpeed" value="${curTtsSpeed}" step="0.1" min="0.5" max="2.0" placeholder="语速" class="wechat-clean-input" style="width:58px;font-size:12px;text-align:center;" title="语速倍率">
                                </div>
                            </div>
                        </div>

                        <div style="border-top:0.5px solid #eee;padding-top:8px;display:flex;flex-direction:column;gap:7px;">
                            <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;font-size:12px;color:#333;">
                                <span>关闭时差计算（作息完全步调一致）</span>
                                <input type="checkbox" id="wcleanSetDisableTimezone" ${disableTimezone ? 'checked' : ''} style="width:16px;height:16px;accent-color:#07c160;cursor:pointer;">
                            </label>
                            <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;font-size:12px;color:#333;">
                                <span>关闭双语对话（纯中文交流）</span>
                                <input type="checkbox" id="wcleanSetDisableBilingual" ${disableBilingual ? 'checked' : ''} style="width:16px;height:16px;accent-color:#07c160;cursor:pointer;">
                            </label>
                        </div>
                    </div>

                    <div>
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <label style="font-size:11.5px;color:#777;font-weight:500;">好感度 (0~100)</label>
                            <span id="wcleanSetFavorDisplay" style="font-size:13.5px;font-weight:700;color:#07c160;">${formatFavorNumber(curFavor)}</span>
                        </div>
                        <input type="range" id="wcleanSetFavorRange" min="0" max="100" step="0.5" value="${curFavor}" style="width:100%;margin-top:5px;accent-color:#07c160;">
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;background:#f9f9f9;padding:8px 10px;border-radius:6px;border:0.5px solid #eee;">
                        <span style="font-size:12px;color:#444;">恋爱关系：<b style="color:${isDating ? '#ff4d4f' : '#666'};">${isDating ? '恋人（交往中）' : '普通关系'}</b></span>
                        <button type="button" id="btnToggleDatingInSettings" style="border:none;background:${isDating ? '#fff1f0' : '#f0f9eb'};color:${isDating ? '#ff4d4f' : '#07c160'};padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;">
                            ${isDating ? '解除恋爱' : '确立恋爱'}
                        </button>
                    </div>
                    <div>
                        <label style="font-size:11.5px;color:#777;font-weight:500;">人设档案 / 说话风格</label>
                        <textarea id="wcleanSetNpcPersona" rows="4" placeholder="填写人设特征、性格习惯与聊天口吻..." class="wechat-clean-input" style="margin-top:3px;resize:none;line-height:1.45;">${escapeHtml(npc.persona || '')}</textarea>
                    </div>
                    <div style="border-top:0.5px solid #f0f0f0;padding-top:10px;margin-top:4px;">
                        <button type="button" id="btnExportTavernPngCard" style="width:100%;border:1px solid #dcdcdc;background:#ffffff;color:#181818;padding:8px 10px;border-radius:6px;font-size:12.5px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                            <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:#07c160;stroke-width:2;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            <span>导出人设卡（包含视频立绘舞台）</span>
                        </button>
                    </div>
                </div>
            `, () => {
                const remarkVal = document.getElementById('wcleanSetNpcRemark')?.value.trim() || '';
                const nameVal = document.getElementById('wcleanSetNpcName')?.value.trim();
                if (!nameVal) {
                    if (typeof showToast === 'function') showToast('角色名字不能为空', 'error');
                    return false;
                }
                const sigVal = document.getElementById('wcleanSetNpcSignature')?.value.trim() || '';
                const regVal = document.getElementById('wcleanSetNpcRegion')?.value || '中国';
                const personaVal = document.getElementById('wcleanSetNpcPersona')?.value.trim() || 'MC好友同伴。';
                const favorVal = parseFloat(document.getElementById('wcleanSetFavorRange')?.value) || 0;

                const curMin = parseInt(document.getElementById('wcleanMinMsgsRange')?.value) || 1;
                const curMax = parseInt(document.getElementById('wcleanMaxMsgsRange')?.value) || 3;
                const finalMax = Math.max(curMin, curMax);
                const curVoiceFreq = document.getElementById('wcleanSetVoiceFreqVal')?.value || 'rare';

                const curDisableTimezone = !!document.getElementById('wcleanSetDisableTimezone')?.checked;
                const curDisableBilingual = !!document.getElementById('wcleanSetDisableBilingual')?.checked;

                const ttsEnabled = !!document.getElementById('wcleanSetNpcTtsEnabled')?.checked;
                const ttsVoice = document.getElementById('wcleanSetNpcTtsVoice')?.value.trim() || '';
                const ttsSpeed = parseFloat(document.getElementById('wcleanSetNpcTtsSpeed')?.value) || 1.0;

                npc.remark = remarkVal;
                npc.name = nameVal;
                npc.signature = sigVal;
                npc.region = regVal;
                npc.persona = personaVal;
                npc.favor = favorVal;

                const existingDecor = (npc.chatSettings && npc.chatSettings.decor) || {};
                const existingStage = (npc.chatSettings && npc.chatSettings.videoStage) || null;

                npc.chatSettings = {
                    minMsgs: curMin,
                    maxMsgs: finalMax,
                    voiceFreq: curVoiceFreq,
                    disableTimezone: curDisableTimezone,
                    disableBilingual: curDisableBilingual,
                    tts: { enabled: ttsEnabled, voice: ttsVoice, speed: ttsSpeed },
                    decor: existingDecor,
                    videoStage: existingStage
                };

                if (npc.favor < 60 && npc.relationshipStage === 'dating') {
                    npc.relationshipStage = 'friend';
                    npc.isDating = false;
                }

                if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
                if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                if (typeof showToast === 'function') showToast('资料已保存', 'success', 1200);

                openNpcProfileCardModal(npcId);
                if (window.G.currentChatNpc === npcId && typeof window.renderSingleChatWindow === 'function') {
                    window.renderSingleChatWindow();
                } else if (typeof window.renderChatApp === 'function') {
                    window.renderChatApp();
                }
            });

            setTimeout(() => {
                const range = document.getElementById('wcleanSetFavorRange');
                const display = document.getElementById('wcleanSetFavorDisplay');
                if (range && display) {
                    range.oninput = () => { display.textContent = formatFavorNumber(range.value); };
                }

                const minRange = document.getElementById('wcleanMinMsgsRange');
                const maxRange = document.getElementById('wcleanMaxMsgsRange');
                const minLabel = document.getElementById('wcleanMinMsgsLabel');
                const maxLabel = document.getElementById('wcleanMaxMsgsLabel');

                if (minRange && maxRange && minLabel && maxLabel) {
                    minRange.oninput = () => {
                        let minV = parseInt(minRange.value) || 1;
                        let maxV = parseInt(maxRange.value) || 3;
                        if (minV > maxV) { maxRange.value = minV; maxLabel.textContent = minV; }
                        minLabel.textContent = minV;
                    };
                    maxRange.oninput = () => {
                        let minV = parseInt(minRange.value) || 1;
                        let maxV = parseInt(maxRange.value) || 3;
                        if (maxV < minV) { minRange.value = maxV; minLabel.textContent = maxV; }
                        maxLabel.textContent = maxV;
                        minLabel.textContent = minRange.value;
                    };
                }

                const freqBtns = document.querySelectorAll('.voice-freq-btn');
                const freqHidden = document.getElementById('wcleanSetVoiceFreqVal');
                freqBtns.forEach(btn => {
                    btn.onclick = () => {
                        freqBtns.forEach(b => {
                            b.style.border = '1px solid #e0e0e0';
                            b.style.background = '#fff';
                            b.style.color = '#444';
                            b.style.fontWeight = 'normal';
                        });
                        btn.style.border = '1px solid #07c160';
                        btn.style.background = '#f0f9eb';
                        btn.style.color = '#07c160';
                        btn.style.fontWeight = '600';
                        if (freqHidden) freqHidden.value = btn.getAttribute('data-val');
                    };
                });

                const ttsCheck = document.getElementById('wcleanSetNpcTtsEnabled');
                const ttsWrap = document.getElementById('wcleanNpcTtsFieldsWrap');
                if (ttsCheck && ttsWrap) {
                    ttsCheck.onchange = () => {
                        ttsWrap.style.display = ttsCheck.checked ? 'flex' : 'none';
                    };
                }

                const btnPickVoice = document.getElementById('btnPickTtsVoiceDirect');
                const voiceInput = document.getElementById('wcleanSetNpcTtsVoice');
                if (btnPickVoice && voiceInput && window.ttsEngine) {
                    btnPickVoice.onclick = () => {
                        window.ttsEngine.openVoicePickerModal(voiceInput.value.trim(), (pickedId) => {
                            voiceInput.value = pickedId;
                            if (typeof showToast === 'function') showToast(`已选用音色: ${pickedId}`, 'success', 1000);
                        });
                    };
                }

                const datingBtn = document.getElementById('btnToggleDatingInSettings');
                if (datingBtn) {
                    datingBtn.onclick = () => {
                        const currentlyDating = window.ChatPromptEngine && window.ChatPromptEngine.isNpcInDatingRelationship(npc);
                        if (currentlyDating) {
                            npc.relationshipStage = 'friend';
                            npc.isDating = false;
                            if (typeof showToast === 'function') showToast('已恢复为朋友关系', 'info', 1000);
                        } else {
                            const curF = parseFloat(document.getElementById('wcleanSetFavorRange')?.value) || npc.favor || 0;
                            if (curF < 80) {
                                if (typeof showToast === 'function') showToast('好感度需达到 80 才可确立恋人', 'error', 1500);
                                return;
                            }
                            npc.relationshipStage = 'dating';
                            npc.isDating = true;
                            if (typeof showToast === 'function') showToast('已确立恋爱关系！', 'success', 1200);
                        }
                        if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
                        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                        document.querySelector('.wechat-clean-modal-mask')?.remove();
                        openNpcSettingsModal(npcId);
                    };
                }

                const exportBtn = document.getElementById('btnExportTavernPngCard');
                if (exportBtn) {
                    exportBtn.onclick = () => { promptExportFilename(npc); };
                }
            }, 30);
        }
    }
    window.openNpcSettingsModal = openNpcSettingsModal;

    function promptExportFilename(npc) {
        const defaultName = (npc.remark && npc.remark.trim()) ? npc.remark.trim() : (npc.name || 'NPC');
        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal('导出角色卡命名', `
                <div style="text-align:left;">
                    <div style="font-size:12px;color:#666;margin-bottom:6px;">请设置导出文件名：</div>
                    <input type="text" id="wcleanExportCardFilename" value="${escapeHtml(defaultName)}_人设卡" placeholder="输入文件名称..." class="wechat-clean-input" maxlength="40">
                </div>
            `, async () => {
                const fname = document.getElementById('wcleanExportCardFilename')?.value.trim() || `${defaultName}_人设卡`;
                if (typeof window.exportTavernCharacterPng === 'function') {
                    if (typeof showToast === 'function') showToast('正在生成角色卡（含舞台立绘）...', 'info', 1000);
                    ensureNpcVideoStageProfiles(npc);
                    await window.exportTavernCharacterPng(npc, fname);
                } else {
                    if (typeof showToast === 'function') showToast('导出引擎未装载', 'error');
                }
            });
        }
    }

    function triggerChangeNpcAvatar(npcId) {
        if (!window.G || !window.G.npcs) return;
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        let mask = document.createElement('div');
        mask.className = 'wechat-action-sheet-mask';
        mask.innerHTML = `
            <div class="wechat-action-sheet-box">
                <label class="wechat-action-item" style="display:block;cursor:pointer;">
                    <span>从相册选择新头像</span>
                    <input type="file" id="localNpcAvatarInput" accept="image/*,.gif" style="display:none;">
                </label>
                <div class="wechat-action-item" onclick="window._randomNpcAvatar('${npcId}')">随机头像池挑选</div>
                <div class="wechat-action-cancel" onclick="this.closest('.wechat-action-sheet-mask').remove()">取消</div>
            </div>
        `;
        document.body.appendChild(mask);
        setTimeout(() => {
            const input = document.getElementById('localNpcAvatarInput');
            if (input) {
                input.onchange = (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (evt) => {
                        const rawData = evt.target.result;
                        const isGif = file.type === 'image/gif' || rawData.startsWith('data:image/gif');
                        const finalData = isGif ? rawData : (
                            (typeof window.compressAvatarDataUrl === 'function')
                                ? await window.compressAvatarDataUrl(rawData, 128, 0.82)
                                : rawData
                        );

                        npc.avatarUrl = finalData;
                        npc.avatar = finalData;
                        if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
                        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                        document.querySelector('.wechat-action-sheet-mask')?.remove();
                        const disp = document.getElementById('npcCardAvatarDisplay');
                        if (disp) disp.src = npc.avatarUrl;
                        if (typeof showToast === 'function') showToast('头像已更换', 'success', 1200);
                    };
                    reader.readAsDataURL(file);
                };
            }
        }, 30);
    }
    window.triggerChangeNpcAvatar = triggerChangeNpcAvatar;

    window._randomNpcAvatar = function(npcId) {
        document.querySelector('.wechat-action-sheet-mask')?.remove();
        if (!window.G || !window.G.npcs) return;
        const npc = window.G.npcs[npcId];
        if (!npc) return;

        if (!Array.isArray(window._MCYT_AVATARS_POOL) || window._MCYT_AVATARS_POOL.length === 0) {
            if (typeof window.initAvatarPool === 'function') window.initAvatarPool();
        }

        const newAvatar = (typeof getRandomAvatar === 'function') ? getRandomAvatar() : 'assets/icons/chat.png';
        npc.avatarUrl = newAvatar;
        npc.avatar = newAvatar;
        if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        const disp = document.getElementById('npcCardAvatarDisplay');
        if (disp) disp.src = npc.avatarUrl;
        if (typeof showToast === 'function') showToast('已更换头像', 'success', 1000);
    };

    function openContactCardDetailModal(id, name, persona, avatar, signature) {
        const exists = !!(window.G && window.G.npcs && window.G.npcs[id]);

        if (typeof openWechatCleanModal === 'function') {
            openWechatCleanModal('名片详情', `
                <div style="text-align:center;padding:10px 0;">
                    <div style="width:60px;height:60px;border-radius:8px;overflow:hidden;margin:0 auto 10px;background:#eee;">
                        <img src="${avatar || 'assets/icons/chat.png'}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='assets/icons/chat.png';">
                    </div>
                    <div style="font-size:16px;font-weight:600;color:#181818;">${escapeHtml(name)}</div>
                    ${signature ? `<div style="font-size:12px;color:#07c160;margin-top:4px;">“${escapeHtml(signature)}”</div>` : ''}
                    <div style="font-size:12px;color:#888;margin:6px 0 14px;line-height:1.4;">${escapeHtml(persona || 'MC同伴')}</div>
                    ${exists ? `<div style="font-size:12px;color:#07c160;font-weight:500;">已在通讯录中</div>` : `
                    <button type="button" onclick="window.addContactFromCard('${escapeHtml(id)}','${escapeHtml(name)}','${escapeHtml(persona)}','${escapeHtml(avatar)}','${escapeHtml(signature || '')}')" style="border:none;background:#07c160;color:#fff;padding:8px 24px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">添加至通讯录</button>
                    `}
                </div>
            `, () => {});
        }
    }
    window.openContactCardDetailModal = openContactCardDetailModal;

    function addContactFromCard(id, name, persona, avatar, signature) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        if (!window.G) window.G = {};
        if (!window.G.npcs) window.G.npcs = {};
        
        const newNpcId = id || ('contact_' + Date.now());
        window.G.npcs[newNpcId] = {
            id: newNpcId,
            name: name,
            remark: '',
            region: '中国',
            persona: persona || '名片推荐好友',
            signature: signature || '',
            favor: 50,
            relationshipStage: 'friend',
            avatarUrl: avatar || (typeof getRandomAvatar === 'function' ? getRandomAvatar() : 'assets/icons/chat.png'),
            avatar: avatar || (typeof getRandomAvatar === 'function' ? getRandomAvatar() : 'assets/icons/chat.png'),
            isCustom: true,
            ownerAccountId: curAcc.id,
            chatSettings: {
                minMsgs: 1,
                maxMsgs: 3,
                voiceFreq: 'rare',
                disableTimezone: false,
                disableBilingual: false,
                tts: { enabled: false, voice: '', speed: 1.0 },
                videoStage: {
                    activeProfileId: 'default',
                    profiles: [{
                        id: 'default',
                        name: '默认形象',
                        backgroundUrl: '',
                        bgType: 'image',
                        sprites: { default: '' },
                        customExpressions: [],
                        position: { x: 0, y: 0, scale: 1.0 },
                        bgPosition: { x: 0, y: 0, scale: 1.0 }
                    }]
                }
            }
        };

        if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        document.querySelector('.wechat-clean-modal-mask')?.remove();
        if (typeof showToast === 'function') showToast('联系人已添加', 'success', 1200);
        if (typeof window.renderChatApp === 'function') window.renderChatApp();
    }
    window.addContactFromCard = addContactFromCard;

    function openImportCharacterCardModal(onSuccess = null) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.png,image/png,.json,application/json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        fileInput.onchange = async (e) => {
            const file = e.target.files && e.target.files[0];
            fileInput.remove();
            if (!file) return;

            if (typeof showToast === 'function') showToast('正在解析角色卡...', 'info', 1000);

            try {
                if (typeof window.parseTavernCardFromFile !== 'function') {
                    throw new Error('解析引擎未装载');
                }
                const profile = await window.parseTavernCardFromFile(file);
                if (!profile || !profile.name) {
                    throw new Error('角色卡未能成功识别');
                }

                const importedVideoStage = (profile.chatSettings && profile.chatSettings.videoStage) || profile.videoStage || null;

                if (typeof onSuccess === 'function') {
                    onSuccess(profile);
                } else {
                    const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
                    if (!window.G) window.G = {};
                    if (!window.G.npcs) window.G.npcs = {};

                    const newId = 'custom_' + Date.now();
                    const finalAvatar = profile.avatarUrl || (typeof getRandomAvatar === 'function' ? getRandomAvatar() : 'assets/icons/chat.png');

                    window.G.npcs[newId] = {
                        id: newId,
                        name: profile.name,
                        remark: '',
                        region: profile.region || '中国',
                        persona: profile.persona || 'MC同伴玩家。',
                        signature: profile.signature || '',
                        favor: 50,
                        relationshipStage: 'friend',
                        avatarUrl: finalAvatar,
                        avatar: finalAvatar,
                        isCustom: true,
                        ownerAccountId: curAcc.id,
                        chatSettings: {
                            minMsgs: 1,
                            maxMsgs: 3,
                            voiceFreq: 'rare',
                            disableTimezone: false,
                            disableBilingual: false,
                            tts: (profile.chatSettings && profile.chatSettings.tts) || { enabled: false, voice: '', speed: 1.0 },
                            videoStage: importedVideoStage || {
                                activeProfileId: 'default',
                                profiles: [{
                                    id: 'default',
                                    name: '默认形象',
                                    backgroundUrl: '',
                                    bgType: 'image',
                                    sprites: { default: '' },
                                    customExpressions: [],
                                    position: { x: 0, y: 0, scale: 1.0 },
                                    bgPosition: { x: 0, y: 0, scale: 1.0 }
                                }]
                            }
                        }
                    };

                    if (typeof window.syncCustomNpcsToLocalBackup === 'function') window.syncCustomNpcsToLocalBackup();
                    if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
                    if (typeof showToast === 'function') showToast(`已成功导入角色「${profile.name}」`, 'success', 1500);
                    if (typeof window.renderChatApp === 'function') window.renderChatApp();
                }
            } catch (err) {
                console.error('导入角色卡失败:', err);
                if (typeof showToast === 'function') showToast(err.message || '导入失败', 'error', 2000);
            }
        };

        fileInput.click();
    }
    window.openImportCharacterCardModal = openImportCharacterCardModal;

})();
