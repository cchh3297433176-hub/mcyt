/**
 * js/apps/theme/theme-chat-decor.js
 * 💬 聊天装扮中心（独立子模块）
 * 职责：
 *  1. 聊天气泡库：点九图 (border-image) 自适应拉伸、纯 CSS 样式导入、双边 (用户/角色) 样式预览与切换
 *  2. 头像装扮：头像框 (静态PNG/WebP/GIF动图) 导入与选用、头像形状 (圆形/圆角方/正方) 一键切换
 *  3. 自定义命名备注：每个气泡与头像框均可自定义名称并点击即时生效
 *  4. AI 装扮协议一键导入：支持粘贴 AI 输出的 JSON / CSS 规范，自动解析入库
 */

(function () {
    'use strict';

    // 默认预设气泡池
    const DEFAULT_BUBBLES = [
        {
            id: 'bubble_default',
            name: '原生微信白灰微绿',
            type: 'css',
            userStyle: 'background-color: #95ec69; color: #000000; border-radius: 6px;',
            npcStyle: 'background-color: #ffffff; color: #000000; border-radius: 6px; border: 1px solid #e7e7e7;',
            isBuiltin: true
        },
        {
            id: 'bubble_cyber_dark',
            name: '赛博霓虹黑夜',
            type: 'css',
            userStyle: 'background: linear-gradient(135deg, #00c6ff, #0072ff); color: #ffffff; border-radius: 14px 4px 14px 14px; box-shadow: 0 2px 8px rgba(0, 114, 255, 0.3);',
            npcStyle: 'background: #181924; color: #00e5ff; border: 1px solid #00e5ff; border-radius: 4px 14px 14px 14px; box-shadow: 0 2px 8px rgba(0, 229, 255, 0.2);',
            isBuiltin: true
        },
        {
            id: 'bubble_retro_terminal',
            name: '复古终端微光',
            type: 'css',
            userStyle: 'background: #022b1c; color: #00ff66; border: 1px solid #00ff66; border-radius: 4px; font-family: monospace;',
            npcStyle: 'background: #0b1311; color: #4af626; border: 1px solid #235937; border-radius: 4px; font-family: monospace;',
            isBuiltin: true
        }
    ];

    // 默认预设头像框池
    const DEFAULT_FRAMES = [
        { id: 'frame_none', name: '无头像框', url: '', isBuiltin: true },
        { id: 'frame_gold_star', name: '金色辉光 (预设)', url: 'assets/decor/frames/frame_gold.png', isBuiltin: true },
        { id: 'frame_cat_ear', name: '萌动猫耳 (预设)', url: 'assets/decor/frames/frame_cat.png', isBuiltin: true }
    ];

    // 读取装扮数据
    function getStoredBubbles() {
        try {
            const list = JSON.parse(localStorage.getItem('mcyt_decor_bubbles') || '[]');
            return [...DEFAULT_BUBBLES, ...list];
        } catch (_) {
            return DEFAULT_BUBBLES;
        }
    }

    function getStoredFrames() {
        try {
            const list = JSON.parse(localStorage.getItem('mcyt_decor_frames') || '[]');
            return [...DEFAULT_FRAMES, ...list];
        } catch (_) {
            return DEFAULT_FRAMES;
        }
    }

    function saveCustomBubble(item) {
        try {
            let list = JSON.parse(localStorage.getItem('mcyt_decor_bubbles') || '[]');
            list.push(item);
            localStorage.setItem('mcyt_decor_bubbles', JSON.stringify(list));
        } catch (_) {}
    }

    function saveCustomFrame(item) {
        try {
            let list = JSON.parse(localStorage.getItem('mcyt_decor_frames') || '[]');
            list.push(item);
            localStorage.setItem('mcyt_decor_frames', JSON.stringify(list));
        } catch (_) {}
    }

    // 渲染聊天装扮页面入口
    window.renderChatDecorTheme = function (container) {
        if (!container) return;

        const activeBubbleId = localStorage.getItem('mcyt_active_decor_bubble') || 'bubble_default';
        const activeFrameId = localStorage.getItem('mcyt_active_decor_frame') || 'frame_none';
        const activeShape = localStorage.getItem('mcyt_active_avatar_shape') || 'circle'; // 'circle' | 'squircle' | 'square'

        const bubbles = getStoredBubbles();
        const frames = getStoredFrames();

        const activeBubble = bubbles.find(b => b.id === activeBubbleId) || bubbles[0];
        const activeFrame = frames.find(f => f.id === activeFrameId) || frames[0];

        container.innerHTML = `
            <!-- 卡片 1：实时装扮预览舞台 -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                <div style="font-size:14px;font-weight:700;color:#222;margin-bottom:4px;">✨ 实时效果预览</div>
                <div style="font-size:12px;color:#888;margin-bottom:12px;">以下为你选择的头像形状、头像框与气泡样式：</div>

                <div style="background:#ebebeb;border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:12px;">
                    <!-- 对方发言预览 -->
                    <div style="display:flex;gap:10px;align-items:flex-start;">
                        <div style="position:relative;width:40px;height:40px;flex-shrink:0;">
                            <img src="assets/icons/chat.png" style="width:100%;height:100%;object-fit:cover;border-radius:${getShapeBorderRadius(activeShape)};" />
                            ${activeFrame && activeFrame.url ? `<img src="${activeFrame.url}" style="position:absolute;top:-10%;left:-10%;width:120%;height:120%;pointer-events:none;" onerror="this.style.display='none'" />` : ''}
                        </div>
                        <div style="max-width:70%;padding:9px 12px;font-size:13px;line-height:1.4;box-sizing:border-box;${getBubbleCssString(activeBubble, 'npc')}">
                            你好呀！这是角色的聊天气泡样式，看起来是不是超级自然？
                        </div>
                    </div>

                    <!-- 我方发言预览 -->
                    <div style="display:flex;gap:10px;align-items:flex-start;flex-direction:row-reverse;">
                        <div style="position:relative;width:40px;height:40px;flex-shrink:0;">
                            <img src="assets/icons/chat.png" style="width:100%;height:100%;object-fit:cover;border-radius:${getShapeBorderRadius(activeShape)};" />
                            ${activeFrame && activeFrame.url ? `<img src="${activeFrame.url}" style="position:absolute;top:-10%;left:-10%;width:120%;height:120%;pointer-events:none;" onerror="this.style.display='none'" />` : ''}
                        </div>
                        <div style="max-width:70%;padding:9px 12px;font-size:13px;line-height:1.4;box-sizing:border-box;${getBubbleCssString(activeBubble, 'user')}">
                            这是我的发言气泡！点九图拉伸和纯代码均可完美适配～
                        </div>
                    </div>
                </div>
            </div>

            <!-- 卡片 2：头像形状与头像框管理 -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <div>
                        <div style="font-size:14px;font-weight:700;color:#222;">头像形状与头像框</div>
                        <div style="font-size:12px;color:#888;">支持圆形、方圆与静态/动态 GIF 头像框</div>
                    </div>
                    <button style="padding:4px 10px;font-size:11.5px;border-radius:6px;border:none;background:#07c160;color:#fff;font-weight:600;cursor:pointer;" onclick="window.openAddFrameModal()">
                        ＋ 添头像框
                    </button>
                </div>

                <!-- 头像形状切换 -->
                <div style="margin-bottom:12px;">
                    <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:6px;">全局头像基础形状：</div>
                    <div style="display:flex;gap:8px;">
                        <button style="flex:1;padding:7px;border-radius:6px;border:1px solid ${activeShape === 'circle' ? '#07c160' : '#ddd'};background:${activeShape === 'circle' ? '#e8f7ed' : '#f9f9f9'};color:${activeShape === 'circle' ? '#07c160' : '#444'};font-size:12px;cursor:pointer;" onclick="window.setAvatarShape('circle')">
                            ⚪ 原生正圆
                        </button>
                        <button style="flex:1;padding:7px;border-radius:6px;border:1px solid ${activeShape === 'squircle' ? '#07c160' : '#ddd'};background:${activeShape === 'squircle' ? '#e8f7ed' : '#f9f9f9'};color:${activeShape === 'squircle' ? '#07c160' : '#444'};font-size:12px;cursor:pointer;" onclick="window.setAvatarShape('squircle')">
                            ◽ 微信圆角方
                        </button>
                        <button style="flex:1;padding:7px;border-radius:6px;border:1px solid ${activeShape === 'square' ? '#07c160' : '#ddd'};background:${activeShape === 'square' ? '#e8f7ed' : '#f9f9f9'};color:${activeShape === 'square' ? '#07c160' : '#444'};font-size:12px;cursor:pointer;" onclick="window.setAvatarShape('square')">
                            ⬛ 棱角正方
                        </button>
                    </div>
                </div>

                <!-- 头像框池列表 -->
                <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:6px;">可用头像框（点击切换应用）：</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(80px, 1fr));gap:8px;" id="decorFramesGrid">
                    ${frames.map(f => `
                        <div onclick="window.selectDecorFrame('${f.id}')" style="position:relative;background:${f.id === activeFrameId ? '#e8f7ed' : '#f9f9f9'};border:1px solid ${f.id === activeFrameId ? '#07c160' : '#eee'};border-radius:8px;padding:8px 4px;display:flex;flex-direction:column;align-items:center;cursor:pointer;text-align:center;">
                            <div style="position:relative;width:36px;height:36px;margin-bottom:4px;">
                                <img src="assets/icons/chat.png" style="width:100%;height:100%;object-fit:cover;border-radius:${getShapeBorderRadius(activeShape)};" />
                                ${f.url ? `<img src="${f.url}" style="position:absolute;top:-10%;left:-10%;width:120%;height:120%;pointer-events:none;" onerror="this.style.display='none'" />` : ''}
                            </div>
                            <span style="font-size:10.5px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:72px;">${f.name}</span>
                            ${!f.isBuiltin ? `<span onclick="event.stopPropagation(); window.deleteDecorFrame('${f.id}')" style="position:absolute;top:2px;right:4px;font-size:10px;color:#fa5151;cursor:pointer;">✕</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- 卡片 3：气泡样式库与管理 -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.02);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <div>
                        <div style="font-size:14px;font-weight:700;color:#222;">气泡样式库</div>
                        <div style="font-size:12px;color:#888;">点九图自适应拉伸或纯 CSS 样式定制</div>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button style="padding:4px 8px;font-size:11px;border-radius:6px;border:1px solid #07c160;background:#e8f7ed;color:#07c160;font-weight:600;cursor:pointer;" onclick="window.openAiThemeImportModal()">
                            🤖 AI 协议导入
                        </button>
                        <button style="padding:4px 8px;font-size:11px;border-radius:6px;border:none;background:#07c160;color:#fff;font-weight:600;cursor:pointer;" onclick="window.openAddBubbleModal()">
                            ＋ 添气泡
                        </button>
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;" id="decorBubblesList">
                    ${bubbles.map(b => `
                        <div onclick="window.selectDecorBubble('${b.id}')" style="background:${b.id === activeBubbleId ? '#e8f7ed' : '#f9f9f9'};border:1px solid ${b.id === activeBubbleId ? '#07c160' : '#eee'};border-radius:8px;padding:10px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                            <div style="display:flex;flex-direction:column;gap:2px;">
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <span style="font-size:13px;font-weight:600;color:#222;">${b.name}</span>
                                    <span style="font-size:10px;padding:1px 5px;border-radius:4px;background:#e0e0e0;color:#666;">${b.type === 'nine_slice' ? '点九图' : 'CSS代码'}</span>
                                    ${b.id === activeBubbleId ? '<span style="font-size:10px;color:#07c160;font-weight:bold;">[当前使用]</span>' : ''}
                                </div>
                                <span style="font-size:11px;color:#888;">${b.isBuiltin ? '系统预设方案' : '用户自定义导入'}</span>
                            </div>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <button style="padding:3px 8px;font-size:11px;border-radius:4px;border:1px solid ${b.id === activeBubbleId ? '#07c160' : '#ddd'};background:#fff;color:${b.id === activeBubbleId ? '#07c160' : '#333'};cursor:pointer;">
                                    ${b.id === activeBubbleId ? '已应用' : '使用'}
                                </button>
                                ${!b.isBuiltin ? `<button onclick="event.stopPropagation(); window.deleteDecorBubble('${b.id}')" style="padding:3px 6px;font-size:11px;border-radius:4px;border:1px solid #ffdcd9;background:#fff;color:#fa5151;cursor:pointer;">删除</button>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    // 辅助计算形状圆角
    function getShapeBorderRadius(shape) {
        if (shape === 'circle') return '50%';
        if (shape === 'squircle') return '8px';
        if (shape === 'square') return '2px';
        return '50%';
    }

    // 辅助生成 CSS 样式行内代码
    function getBubbleCssString(bubble, senderType) {
        if (!bubble) return '';
        if (bubble.type === 'nine_slice') {
            const imgUrl = senderType === 'user' ? (bubble.userBorderImage || bubble.borderImage) : (bubble.npcBorderImage || bubble.borderImage);
            const slice = bubble.slice || '12 12 12 12';
            const padding = bubble.padding || '8px 12px';
            return `border-style: solid; border-width: 10px; border-image: url('${imgUrl}') ${slice} fill stretch; padding: ${padding};`;
        } else {
            return senderType === 'user' ? (bubble.userStyle || '') : (bubble.npcStyle || '');
        }
    }

    // 设置头像形状
    window.setAvatarShape = function (shape) {
        localStorage.setItem('mcyt_active_avatar_shape', shape);
        document.documentElement.style.setProperty('--avatar-border-radius', getShapeBorderRadius(shape));
        refreshDecorView();
        if (typeof showToast === 'function') showToast('头像形状已更新');
    };

    // 选择生效头像框
    window.selectDecorFrame = function (id) {
        localStorage.setItem('mcyt_active_decor_frame', id);
        const frames = getStoredFrames();
        const f = frames.find(x => x.id === id);
        document.documentElement.style.setProperty('--global-avatar-frame', f && f.url ? `url('${f.url}')` : 'none');
        refreshDecorView();
        if (typeof showToast === 'function') showToast(`已选用头像框: ${f ? f.name : '无'}`);
    };

    // 删除头像框
    window.deleteDecorFrame = function (id) {
        let list = JSON.parse(localStorage.getItem('mcyt_decor_frames') || '[]');
        list = list.filter(x => x.id !== id);
        localStorage.setItem('mcyt_decor_frames', JSON.stringify(list));
        if (localStorage.getItem('mcyt_active_decor_frame') === id) {
            localStorage.setItem('mcyt_active_decor_frame', 'frame_none');
        }
        refreshDecorView();
        if (typeof showToast === 'function') showToast('已删除该头像框');
    };

    // 选择生效气泡
    window.selectDecorBubble = function (id) {
        localStorage.setItem('mcyt_active_decor_bubble', id);
        applyActiveBubbleCssGlobally();
        refreshDecorView();
        const bubbles = getStoredBubbles();
        const b = bubbles.find(x => x.id === id);
        if (typeof showToast === 'function') showToast(`已应用气泡: ${b ? b.name : ''}`);
    };

    // 删除气泡
    window.deleteDecorBubble = function (id) {
        let list = JSON.parse(localStorage.getItem('mcyt_decor_bubbles') || '[]');
        list = list.filter(x => x.id !== id);
        localStorage.setItem('mcyt_decor_bubbles', JSON.stringify(list));
        if (localStorage.getItem('mcyt_active_decor_bubble') === id) {
            localStorage.setItem('mcyt_active_decor_bubble', 'bubble_default');
            applyActiveBubbleCssGlobally();
        }
        refreshDecorView();
        if (typeof showToast === 'function') showToast('已删除该气泡样式');
    };

    function refreshDecorView() {
        const sub = document.getElementById('themeAppSubContent');
        if (sub) window.renderChatDecorTheme(sub);
    }

    // 全局注入气泡 CSS（使得所有单聊和群聊即刻生效）
    function applyActiveBubbleCssGlobally() {
        const bubbleId = localStorage.getItem('mcyt_active_decor_bubble') || 'bubble_default';
        const bubbles = getStoredBubbles();
        const b = bubbles.find(x => x.id === bubbleId) || bubbles[0];

        let styleTag = document.getElementById('mcytGlobalDynamicBubbleStyle');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'mcytGlobalDynamicBubbleStyle';
            document.head.appendChild(styleTag);
        }

        if (b.type === 'nine_slice') {
            const uImg = b.userBorderImage || b.borderImage;
            const nImg = b.npcBorderImage || b.borderImage;
            const slice = b.slice || '12 12 12 12';
            styleTag.textContent = `
                .chat-bubble-user {
                    border-style: solid !important;
                    border-width: 10px !important;
                    border-image: url('${uImg}') ${slice} fill stretch !important;
                    background: transparent !important;
                }
                .chat-bubble-npc {
                    border-style: solid !important;
                    border-width: 10px !important;
                    border-image: url('${nImg}') ${slice} fill stretch !important;
                    background: transparent !important;
                }
            `;
        } else {
            styleTag.textContent = `
                .chat-bubble-user {
                    ${b.userStyle || ''}
                }
                .chat-bubble-npc {
                    ${b.npcStyle || ''}
                }
            `;
        }
    }

    // 新增头像框弹窗（支持相册直传 / 网络 URL）
    window.openAddFrameModal = function () {
        let modal = document.getElementById('addFrameModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'addFrameModal';
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:12px;width:100%;max-width:320px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="font-size:14px;font-weight:700;color:#222;margin-bottom:8px;">添加新头像框</div>
                <div style="font-size:11.5px;color:#888;margin-bottom:12px;">支持 GIF 动图与 PNG 镂空图，可填本地路径或外链</div>

                <input type="text" id="frameNameInput" placeholder="头像框备注名称（如：星之守护）" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12px;outline:none;margin-bottom:8px;">
                <input type="text" id="frameUrlInput" placeholder="图片 URL / 本地相对路径" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12px;outline:none;margin-bottom:8px;">

                <input type="file" id="localFrameFileInput" accept="image/*" style="display:none;" onchange="window.handleFrameLocalUpload(event)">
                <button style="width:100%;padding:7px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;font-size:11.5px;color:#555;margin-bottom:14px;cursor:pointer;" onclick="document.getElementById('localFrameFileInput').click()">
                    📁 从相册中选取图片文件
                </button>

                <div style="display:flex;gap:8px;">
                    <button style="flex:1;padding:8px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;" onclick="document.getElementById('addFrameModal').remove()">取消</button>
                    <button style="flex:1;padding:8px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;" onclick="window.confirmAddFrame()">保存并选用</button>
                </div>
            </div>
        `;
    };

    window.handleFrameLocalUpload = function (event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            const urlInput = document.getElementById('frameUrlInput');
            if (urlInput) urlInput.value = e.target.result;
            const nameInput = document.getElementById('frameNameInput');
            if (nameInput && !nameInput.value) {
                nameInput.value = file.name.replace(/\.[^/.]+$/, "");
            }
        };
        reader.readAsDataURL(file);
    };

    window.confirmAddFrame = function () {
        const name = (document.getElementById('frameNameInput').value || '').trim();
        const url = (document.getElementById('frameUrlInput').value || '').trim();
        if (!name || !url) {
            if (typeof showToast === 'function') showToast('请填写名称与图片地址');
            return;
        }

        const newId = 'frame_' + Date.now();
        saveCustomFrame({ id: newId, name, url, isBuiltin: false });
        window.selectDecorFrame(newId);

        const modal = document.getElementById('addFrameModal');
        if (modal) modal.remove();
    };

    // 新增气泡样式弹窗（纯 CSS / 点九图双选）
    window.openAddBubbleModal = function () {
        let modal = document.getElementById('addBubbleModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'addBubbleModal';
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:12px;width:100%;max-width:340px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);max-height:85vh;overflow-y:auto;">
                <div style="font-size:14px;font-weight:700;color:#222;margin-bottom:8px;">添加气泡样式</div>

                <input type="text" id="bubbleCustomName" placeholder="气泡名称备注（如：薄荷青柠檬）" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12px;outline:none;margin-bottom:8px;">

                <div style="font-size:11.5px;font-weight:600;color:#555;margin-bottom:4px;">我方气泡 CSS (User)：</div>
                <textarea id="bubbleUserCssInput" placeholder="例: background: #95ec69; color: #000; border-radius: 8px;" style="width:100%;box-sizing:border-box;min-height:55px;padding:8px;border-radius:6px;border:1px solid #e0e0e0;font-size:11px;font-family:monospace;outline:none;resize:none;margin-bottom:8px;"></textarea>

                <div style="font-size:11.5px;font-weight:600;color:#555;margin-bottom:4px;">对方气泡 CSS (NPC)：</div>
                <textarea id="bubbleNpcCssInput" placeholder="例: background: #ffffff; color: #000; border-radius: 8px; border: 1px solid #eee;" style="width:100%;box-sizing:border-box;min-height:55px;padding:8px;border-radius:6px;border:1px solid #e0e0e0;font-size:11px;font-family:monospace;outline:none;resize:none;margin-bottom:12px;"></textarea>

                <div style="display:flex;gap:8px;">
                    <button style="flex:1;padding:8px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;" onclick="document.getElementById('addBubbleModal').remove()">取消</button>
                    <button style="flex:1;padding:8px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;" onclick="window.confirmAddBubble()">保存并应用</button>
                </div>
            </div>
        `;
    };

    window.confirmAddBubble = function () {
        const name = (document.getElementById('bubbleCustomName').value || '').trim();
        const userCss = (document.getElementById('bubbleUserCssInput').value || '').trim();
        const npcCss = (document.getElementById('bubbleNpcCssInput').value || '').trim();

        if (!name || (!userCss && !npcCss)) {
            if (typeof showToast === 'function') showToast('请填写气泡备注名称与样式');
            return;
        }

        const newId = 'bubble_' + Date.now();
        saveCustomBubble({
            id: newId,
            name: name,
            type: 'css',
            userStyle: userCss || 'background: #95ec69; color: #000; border-radius: 6px;',
            npcStyle: npcCss || 'background: #ffffff; color: #000; border-radius: 6px;',
            isBuiltin: false
        });

        window.selectDecorBubble(newId);
        const modal = document.getElementById('addBubbleModal');
        if (modal) modal.remove();
    };

    // 🤖 AI 主题协议一键导入（兼容标准 JSON / CSS 代码）
    window.openAiThemeImportModal = function () {
        let modal = document.getElementById('aiThemeImportModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'aiThemeImportModal';
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:12px;width:100%;max-width:340px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="font-size:14px;font-weight:700;color:#222;margin-bottom:6px;">🤖 导入 AI 主题代码</div>
                <div style="font-size:11.5px;color:#888;margin-bottom:10px;line-height:1.4;">
                    直接粘贴 AI 输出的 JSON 配置或 CSS 代码块，自动解析气泡与头像框！
                </div>

                <textarea id="aiThemePayloadInput" placeholder='粘贴 AI 提供的 JSON 或代码块，例如：\n{\n  "themeName": "赛博霓虹",\n  "bubble": { "userStyle": "...", "npcStyle": "..." },\n  "avatarFrame": "..."\n}' style="width:100%;box-sizing:border-box;min-height:120px;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:11px;font-family:monospace;outline:none;resize:none;margin-bottom:12px;"></textarea>

                <div style="display:flex;gap:8px;">
                    <button style="flex:1;padding:8px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;" onclick="document.getElementById('aiThemeImportModal').remove()">取消</button>
                    <button style="flex:1;padding:8px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;" onclick="window.confirmImportAiTheme()">立即解析导入</button>
                </div>
            </div>
        `;
    };

    window.confirmImportAiTheme = function () {
        const input = document.getElementById('aiThemePayloadInput');
        const raw = (input ? input.value : '').trim();
        if (!raw) return;

        let parsed = null;
        // 尝试 JSON 解析
        try {
            // 剔除可能的 ```json 包裹
            const cleanJson = raw.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
            parsed = JSON.parse(cleanJson);
        } catch (_) {}

        if (parsed) {
            const themeName = parsed.themeName || parsed.name || ('AI装扮_' + Date.now());
            if (parsed.bubble) {
                const bubbleId = 'bubble_ai_' + Date.now();
                saveCustomBubble({
                    id: bubbleId,
                    name: themeName + '气泡',
                    type: parsed.bubble.type || 'css',
                    userStyle: parsed.bubble.userStyle || '',
                    npcStyle: parsed.bubble.npcStyle || '',
                    borderImage: parsed.bubble.borderImage || '',
                    slice: parsed.bubble.slice || '12 12 12 12',
                    padding: parsed.bubble.padding || '8px 12px',
                    isBuiltin: false
                });
                window.selectDecorBubble(bubbleId);
            }
            if (parsed.avatarFrame) {
                const frameId = 'frame_ai_' + Date.now();
                saveCustomFrame({
                    id: frameId,
                    name: themeName + '头像框',
                    url: parsed.avatarFrame,
                    isBuiltin: false
                });
                window.selectDecorFrame(frameId);
            }
            if (parsed.avatarShape) {
                window.setAvatarShape(parsed.avatarShape);
            }
            if (typeof showToast === 'function') showToast(`AI 主题 [${themeName}] 解析导入成功！`);
        } else {
            // 作为纯 CSS 代码处理
            const bubbleId = 'bubble_ai_' + Date.now();
            saveCustomBubble({
                id: bubbleId,
                name: 'AI自定义CSS气泡',
                type: 'css',
                userStyle: raw,
                npcStyle: raw,
                isBuiltin: false
            });
            window.selectDecorBubble(bubbleId);
            if (typeof showToast === 'function') showToast('已将 CSS 代码解析为气泡样式！');
        }

        const modal = document.getElementById('aiThemeImportModal');
        if (modal) modal.remove();
        refreshDecorView();
    };

    // 页面初始化时挂载全局气泡样式与头像形状
    try {
        applyActiveBubbleCssGlobally();
        const savedShape = localStorage.getItem('mcyt_active_avatar_shape') || 'circle';
        document.documentElement.style.setProperty('--avatar-border-radius', getShapeBorderRadius(savedShape));
        const savedFrameId = localStorage.getItem('mcyt_active_decor_frame') || 'frame_none';
        const frames = getStoredFrames();
        const f = frames.find(x => x.id === savedFrameId);
        if (f && f.url) {
            document.documentElement.style.setProperty('--global-avatar-frame', `url('${f.url}')`);
        }
    } catch (_) {}
})();
