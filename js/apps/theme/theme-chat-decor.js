/**
 * js/apps/theme/theme-chat-decor.js
 * 💬 微信装扮中心独立模块（原生白灰微绿质感）
 * 职责：
 *  1. 头像框缩略图折叠抽屉与试穿预览模式（点击试穿，再次点击卸下）
 *  2. 头像框缩放调节器（支持 80%~160% 自由缩放对齐微调）
 *  3. 点九图 (border-image) 自适应与纯 CSS 气泡
 *  4. 消除杂乱 emoji，遵循微信原生克制质感
 */

(function () {
    'use strict';

    // 默认头像框（支持配置独立的 scale 比例）
    const DEFAULT_FRAMES = [
        { id: 'frame_none', name: '无头像框', url: '', scale: 1.15, isBuiltin: true }
    ];

    const DEFAULT_BUBBLES = [
        {
            id: 'bubble_default',
            name: '原生微信白灰微绿',
            type: 'css',
            userStyle: 'background-color: #95ec69; color: #000000; border-radius: 6px;',
            npcStyle: 'background-color: #ffffff; color: #000000; border-radius: 6px; border: 1px solid #e7e7e7;',
            isBuiltin: true
        }
    ];

    window.getStoredDecorFrames = function() {
        try {
            const list = JSON.parse(localStorage.getItem('mcyt_decor_frames') || '[]');
            return [...DEFAULT_FRAMES, ...list];
        } catch (_) {
            return DEFAULT_FRAMES;
        }
    };

    window.getStoredDecorBubbles = function() {
        try {
            const list = JSON.parse(localStorage.getItem('mcyt_decor_bubbles') || '[]');
            return [...DEFAULT_BUBBLES, ...list];
        } catch (_) {
            return DEFAULT_BUBBLES;
        }
    };

    function saveCustomFrame(item) {
        try {
            let list = JSON.parse(localStorage.getItem('mcyt_decor_frames') || '[]');
            list.push(item);
            localStorage.setItem('mcyt_decor_frames', JSON.stringify(list));
        } catch (_) {}
    }

    function saveCustomBubble(item) {
        try {
            let list = JSON.parse(localStorage.getItem('mcyt_decor_bubbles') || '[]');
            list.push(item);
            localStorage.setItem('mcyt_decor_bubbles', JSON.stringify(list));
        } catch (_) {}
    }

    function getShapeBorderRadius(shape) {
        if (shape === 'circle') return '50%';
        if (shape === 'squircle') return '8px';
        if (shape === 'square') return '2px';
        return '50%';
    }

    // 渲染装扮中心页签内容
    window.renderChatDecorTheme = function (container) {
        if (!container) return;

        const activeBubbleId = localStorage.getItem('mcyt_active_decor_bubble') || 'bubble_default';
        const activeFrameId = localStorage.getItem('mcyt_active_decor_frame') || 'frame_none';
        const activeShape = localStorage.getItem('mcyt_active_avatar_shape') || 'circle';

        const frames = window.getStoredDecorFrames();
        const bubbles = window.getStoredDecorBubbles();

        const activeFrame = frames.find(f => f.id === activeFrameId) || frames[0];
        const activeBubble = bubbles.find(b => b.id === activeBubbleId) || bubbles[0];

        const previewAvatar = (typeof window.getPlayerAvatarSafe === 'function') 
            ? window.getPlayerAvatarSafe() 
            : 'assets/icons/chat.png';

        const frameScale = (activeFrame && activeFrame.scale) ? activeFrame.scale : 1.18;

        container.innerHTML = `
            <!-- 试穿舞台 -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;">
                <div style="font-size:13.5px;font-weight:600;color:#222;margin-bottom:4px;">效果试穿舞台</div>
                <div style="font-size:11.5px;color:#888;margin-bottom:12px;">点击下方头像框缩略图即可试穿或脱下。</div>

                <div style="background:#f2f2f2;border-radius:10px;padding:16px;display:flex;align-items:center;justify-content:center;gap:20px;">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                        <div style="position:relative;width:52px;height:52px;">
                            <img src="${previewAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:${getShapeBorderRadius(activeShape)};display:block;" onerror="this.src='assets/icons/chat.png';" />
                            ${activeFrame && activeFrame.url ? `
                                <img src="${activeFrame.url}" style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%) scale(${frameScale});width:100%;height:100%;pointer-events:none;" onerror="this.style.display='none'" />
                            ` : ''}
                        </div>
                        <span style="font-size:11px;color:#666;">${activeFrame && activeFrame.url ? activeFrame.name : '无头像框'}</span>
                    </div>
                </div>
            </div>

            <!-- 头像形状切换 -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;">
                <div style="font-size:13.5px;font-weight:600;color:#222;margin-bottom:8px;">头像基础形状</div>
                <div style="display:flex;gap:8px;">
                    <button style="flex:1;padding:7px;border-radius:6px;border:1px solid ${activeShape === 'circle' ? '#07c160' : '#e0e0e0'};background:${activeShape === 'circle' ? '#e8f7ed' : '#f9f9f9'};color:${activeShape === 'circle' ? '#07c160' : '#333'};font-size:12px;cursor:pointer;" onclick="window.setAvatarShape('circle')">正圆</button>
                    <button style="flex:1;padding:7px;border-radius:6px;border:1px solid ${activeShape === 'squircle' ? '#07c160' : '#e0e0e0'};background:${activeShape === 'squircle' ? '#e8f7ed' : '#f9f9f9'};color:${activeShape === 'squircle' ? '#07c160' : '#333'};font-size:12px;cursor:pointer;" onclick="window.setAvatarShape('squircle')">圆角方</button>
                    <button style="flex:1;padding:7px;border-radius:6px;border:1px solid ${activeShape === 'square' ? '#07c160' : '#e0e0e0'};background:${activeShape === 'square' ? '#e8f7ed' : '#f9f9f9'};color:${activeShape === 'square' ? '#07c160' : '#333'};font-size:12px;cursor:pointer;" onclick="window.setAvatarShape('square')">直角方</button>
                </div>
            </div>

            <!-- 头像框折叠栏与缩略图选择 -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;">
                <div onclick="window.toggleDecorFramesCollapse()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                    <div>
                        <div style="font-size:13.5px;font-weight:600;color:#222;">头像框库</div>
                        <div style="font-size:11.5px;color:#888;">展开查看已导入的头像框缩略图</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button onclick="event.stopPropagation(); window.openAddFrameModal();" style="padding:4px 8px;font-size:11px;border-radius:6px;border:none;background:#07c160;color:#fff;font-weight:500;cursor:pointer;">添加头像框</button>
                        <span id="decorFramesCollapseArrow" style="font-size:12px;color:#07c160;font-weight:bold;">▼ 收起</span>
                    </div>
                </div>

                <div id="decorFramesBody" style="display:block;margin-top:12px;">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(70px, 1fr));gap:10px;">
                        ${frames.map(f => {
                            const isCur = (f.id === activeFrameId);
                            const curScale = f.scale || 1.18;
                            return `
                                <div onclick="window.toggleSelectFrameItem('${f.id}')" 
                                     style="position:relative;background:${isCur ? '#e8f7ed' : '#f9f9f9'};border:1px solid ${isCur ? '#07c160' : '#eee'};border-radius:8px;padding:8px 4px;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
                                    <div style="position:relative;width:40px;height:40px;margin-bottom:4px;">
                                        <img src="${previewAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:${getShapeBorderRadius(activeShape)};display:block;" onerror="this.src='assets/icons/chat.png';" />
                                        ${f.url ? `<img src="${f.url}" style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%) scale(${curScale});width:100%;height:100%;pointer-events:none;" onerror="this.style.display='none'" />` : ''}
                                    </div>
                                    <span style="font-size:10px;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60px;text-align:center;">${escapeHtml(f.name)}</span>
                                    ${!f.isBuiltin ? `<span onclick="event.stopPropagation(); window.deleteDecorFrame('${f.id}')" style="position:absolute;top:2px;right:4px;font-size:10px;color:#fa5151;cursor:pointer;">✕</span>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <!-- 选中项缩放调节器 -->
                    ${activeFrame && activeFrame.url ? `
                        <div style="margin-top:12px;background:#f9f9f9;border-radius:8px;padding:10px;border:1px solid #eee;">
                            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:#555;margin-bottom:6px;">
                                <span>当前头像框尺寸调节</span>
                                <span style="color:#07c160;font-weight:600;" id="frameScaleValText">${Math.round(frameScale * 100)}%</span>
                            </div>
                            <input type="range" min="80" max="160" value="${Math.round(frameScale * 100)}" style="width:100%;accent-color:#07c160;" oninput="window.updateCurrentFrameScale(this.value)">
                        </div>
                    ` : ''}
                </div>
            </div>

            <!-- 气泡样式库 -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <div>
                        <div style="font-size:13.5px;font-weight:600;color:#222;">气泡样式库</div>
                        <div style="font-size:11.5px;color:#888;">自定义对白背景与质感</div>
                    </div>
                    <button onclick="window.openAddBubbleModal()" style="padding:4px 8px;font-size:11px;border-radius:6px;border:none;background:#07c160;color:#fff;cursor:pointer;">添加气泡</button>
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
                    ${bubbles.map(b => `
                        <div onclick="window.selectDecorBubble('${b.id}')" style="background:${b.id === activeBubbleId ? '#e8f7ed' : '#f9f9f9'};border:1px solid ${b.id === activeBubbleId ? '#07c160' : '#eee'};border-radius:8px;padding:10px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                            <div style="display:flex;flex-direction:column;gap:2px;">
                                <span style="font-size:12.5px;font-weight:600;color:#222;">${escapeHtml(b.name)}</span>
                                <span style="font-size:10px;color:#888;">${b.type === 'nine_slice' ? '点九图自适应' : 'CSS 代码片段'}</span>
                            </div>
                            <span style="font-size:11px;color:${b.id === activeBubbleId ? '#07c160' : '#999'};font-weight:${b.id === activeBubbleId ? '600' : 'normal'};">
                                ${b.id === activeBubbleId ? '使用中' : '选用'}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    window.toggleDecorFramesCollapse = function () {
        const body = document.getElementById('decorFramesBody');
        const arrow = document.getElementById('decorFramesCollapseArrow');
        if (!body || !arrow) return;
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
        arrow.textContent = isHidden ? '▼ 收起' : '▶ 展开';
    };

    // 试穿与卸下切换
    window.toggleSelectFrameItem = function (id) {
        const current = localStorage.getItem('mcyt_active_decor_frame') || 'frame_none';
        const nextId = (current === id) ? 'frame_none' : id;
        localStorage.setItem('mcyt_active_decor_frame', nextId);
        refreshDecorView();
    };

    // 调整当前选中头像框的尺寸
    window.updateCurrentFrameScale = function (val) {
        const num = parseFloat(val) / 100;
        const curId = localStorage.getItem('mcyt_active_decor_frame');
        if (!curId || curId === 'frame_none') return;

        let list = JSON.parse(localStorage.getItem('mcyt_decor_frames') || '[]');
        const target = list.find(x => x.id === curId);
        if (target) {
            target.scale = num;
            localStorage.setItem('mcyt_decor_frames', JSON.stringify(list));
        }

        const label = document.getElementById('frameScaleValText');
        if (label) label.textContent = `${Math.round(num * 100)}%`;

        refreshDecorView();
    };

    window.setAvatarShape = function (shape) {
        localStorage.setItem('mcyt_active_avatar_shape', shape);
        refreshDecorView();
        if (typeof showToast === 'function') showToast('头像形状已应用');
    };

    window.selectDecorBubble = function (id) {
        localStorage.setItem('mcyt_active_decor_bubble', id);
        refreshDecorView();
        if (typeof showToast === 'function') showToast('气泡样式已应用');
    };

    window.deleteDecorFrame = function (id) {
        let list = JSON.parse(localStorage.getItem('mcyt_decor_frames') || '[]');
        list = list.filter(x => x.id !== id);
        localStorage.setItem('mcyt_decor_frames', JSON.stringify(list));
        if (localStorage.getItem('mcyt_active_decor_frame') === id) {
            localStorage.setItem('mcyt_active_decor_frame', 'frame_none');
        }
        refreshDecorView();
    };

    function refreshDecorView() {
        const sub = document.getElementById('themeAppSubContent');
        if (sub && typeof window.renderChatDecorTheme === 'function') {
            window.renderChatDecorTheme(sub);
        }
    }

    // 弹窗添加头像框（自带缩放滑块调节与实时预览）
    window.openAddFrameModal = function () {
        let modal = document.getElementById('addFrameModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'addFrameModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
            document.body.appendChild(modal);
        }

        let pendingScale = 1.18;
        const testAvatar = (typeof window.getPlayerAvatarSafe === 'function') ? window.getPlayerAvatarSafe() : 'assets/icons/chat.png';

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:12px;width:100%;max-width:320px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="font-size:14px;font-weight:600;color:#222;margin-bottom:8px;">添加新头像框</div>

                <!-- 实时尺寸对照预览 -->
                <div style="background:#f5f5f5;border-radius:8px;padding:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:12px;">
                    <div style="position:relative;width:52px;height:52px;">
                        <img src="${testAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" onerror="this.src='assets/icons/chat.png';" />
                        <img id="newFramePreviewImg" src="" style="display:none;position:absolute;top:50%;left:50%;transform:translate(-50%, -50%) scale(${pendingScale});width:100%;height:100%;pointer-events:none;" />
                    </div>
                    <span style="font-size:10px;color:#888;margin-top:6px;">贴合效果参考</span>
                </div>

                <input type="text" id="newFrameNameInput" placeholder="备注名称（如：星之守护）" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12px;outline:none;margin-bottom:8px;">
                <input type="text" id="newFrameUrlInput" placeholder="图片 URL 或相对路径" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12px;outline:none;margin-bottom:8px;" oninput="window._onNewFrameUrlChange(this.value)">

                <input type="file" id="localFrameFileInput" accept="image/*" style="display:none;" onchange="window.handleFrameLocalUpload(event)">
                <button style="width:100%;padding:7px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;font-size:11.5px;color:#555;margin-bottom:10px;cursor:pointer;" onclick="document.getElementById('localFrameFileInput').click()">
                    从相册中选取图片
                </button>

                <!-- 尺寸调节滑块 -->
                <div style="margin-bottom:14px;">
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#666;margin-bottom:4px;">
                        <span>默认尺寸调节</span>
                        <span id="newFrameScaleLabel">118%</span>
                    </div>
                    <input type="range" id="newFrameScaleRange" min="80" max="160" value="118" style="width:100%;accent-color:#07c160;" oninput="window._onNewFrameScaleChange(this.value)">
                </div>

                <div style="display:flex;gap:8px;">
                    <button style="flex:1;padding:8px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;" onclick="document.getElementById('addFrameModal').remove()">取消</button>
                    <button style="flex:1;padding:8px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;" onclick="window.confirmAddNewFrame()">保存并选用</button>
                </div>
            </div>
        `;
    };

    window._onNewFrameUrlChange = function (val) {
        const preview = document.getElementById('newFramePreviewImg');
        if (preview) {
            if (val) {
                preview.src = val;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
        }
    };

    window._onNewFrameScaleChange = function (val) {
        const scale = parseFloat(val) / 100;
        const label = document.getElementById('newFrameScaleLabel');
        const preview = document.getElementById('newFramePreviewImg');
        if (label) label.textContent = `${val}%`;
        if (preview) preview.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };

    window.handleFrameLocalUpload = function (event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            const urlInput = document.getElementById('newFrameUrlInput');
            if (urlInput) {
                urlInput.value = e.target.result;
                window._onNewFrameUrlChange(e.target.result);
            }
            const nameInput = document.getElementById('newFrameNameInput');
            if (nameInput && !nameInput.value) {
                nameInput.value = file.name.replace(/\.[^/.]+$/, "");
            }
        };
        reader.readAsDataURL(file);
    };

    window.confirmAddNewFrame = function () {
        const name = (document.getElementById('newFrameNameInput').value || '').trim();
        const url = (document.getElementById('newFrameUrlInput').value || '').trim();
        const scaleVal = parseFloat(document.getElementById('newFrameScaleRange')?.value || 118) / 100;

        if (!name || !url) {
            if (typeof showToast === 'function') showToast('请填写名称与图片');
            return;
        }

        const newId = 'frame_' + Date.now();
        saveCustomFrame({ id: newId, name, url, scale: scaleVal, isBuiltin: false });
        localStorage.setItem('mcyt_active_decor_frame', newId);

        document.getElementById('addFrameModal')?.remove();
        refreshDecorView();
        if (typeof showToast === 'function') showToast('新头像框已添加并生效');
    };

    // 新增气泡样式
    window.openAddBubbleModal = function () {
        let modal = document.getElementById('addBubbleModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'addBubbleModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:12px;width:100%;max-width:320px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="font-size:14px;font-weight:600;color:#222;margin-bottom:8px;">添加气泡样式</div>

                <input type="text" id="bubbleCustomName" placeholder="气泡备注名称" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12px;outline:none;margin-bottom:8px;">

                <div style="font-size:11px;color:#666;margin-bottom:4px;">我方气泡 CSS：</div>
                <textarea id="bubbleUserCssInput" placeholder="background: #95ec69; color: #000;" style="width:100%;box-sizing:border-box;min-height:50px;padding:8px;border-radius:6px;border:1px solid #e0e0e0;font-size:11px;font-family:monospace;resize:none;margin-bottom:8px;"></textarea>

                <div style="font-size:11px;color:#666;margin-bottom:4px;">对方气泡 CSS：</div>
                <textarea id="bubbleNpcCssInput" placeholder="background: #ffffff; color: #000; border: 1px solid #eee;" style="width:100%;box-sizing:border-box;min-height:50px;padding:8px;border-radius:6px;border:1px solid #e0e0e0;font-size:11px;font-family:monospace;resize:none;margin-bottom:12px;"></textarea>

                <div style="display:flex;gap:8px;">
                    <button style="flex:1;padding:8px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;" onclick="document.getElementById('addBubbleModal').remove()">取消</button>
                    <button style="flex:1;padding:8px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;" onclick="window.confirmAddBubble()">保存</button>
                </div>
            </div>
        `;
    };

    window.confirmAddBubble = function () {
        const name = (document.getElementById('bubbleCustomName').value || '').trim();
        const userCss = (document.getElementById('bubbleUserCssInput').value || '').trim();
        const npcCss = (document.getElementById('bubbleNpcCssInput').value || '').trim();

        if (!name) {
            if (typeof showToast === 'function') showToast('请填写气泡名称');
            return;
        }

        const newId = 'bubble_' + Date.now();
        saveCustomBubble({
            id: newId,
            name: name,
            type: 'css',
            userStyle: userCss || 'background: #95ec69; color: #000;',
            npcStyle: npcCss || 'background: #ffffff; color: #000; border: 1px solid #eee;',
            isBuiltin: false
        });

        localStorage.setItem('mcyt_active_decor_bubble', newId);
        document.getElementById('addBubbleModal')?.remove();
        refreshDecorView();
        if (typeof showToast === 'function') showToast('气泡样式已保存并生效');
    };

})();
