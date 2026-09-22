/**
 * js/apps/theme/theme-chat-decor.js
 * 💬 微信装扮中心独立模块（原生白灰微绿质感）
 * 职责：
 *  1. 头像框缩略图折叠抽屉与试穿预览模式（极简图标 + / ▲）
 *  2. 导入头像框后自动进入微调舞台（支持 80%~180% 自由缩放及上下左右全向对齐偏移）
 *  3. 头像框独立保存按钮与持久化配置（scale, offsetX, offsetY）
 *  4. 点九图 (border-image) 自适应与纯 CSS 气泡
 *  5. 遵循微信原生克制质感，彻底消除陈旧冗余文案
 */

(function () {
    'use strict';

    // 默认头像框（支持配置独立的 scale 与偏移）
    const DEFAULT_FRAMES = [
        { id: 'frame_none', name: '无头像框', url: '', scale: 1.18, offsetX: 0, offsetY: 0, isBuiltin: true }
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
            const idx = list.findIndex(x => x.id === item.id);
            if (idx >= 0) {
                list[idx] = item;
            } else {
                list.push(item);
            }
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

        const frameScale = (activeFrame && activeFrame.scale !== undefined) ? activeFrame.scale : 1.18;
        const frameX = (activeFrame && activeFrame.offsetX !== undefined) ? activeFrame.offsetX : 0;
        const frameY = (activeFrame && activeFrame.offsetY !== undefined) ? activeFrame.offsetY : 0;

        container.innerHTML = `
            <!-- 试穿舞台 -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;">
                <div style="font-size:13.5px;font-weight:600;color:#222;margin-bottom:4px;">效果试穿舞台</div>
                <div style="font-size:11.5px;color:#888;margin-bottom:12px;">点击下方头像框缩略图即可试穿或脱下。</div>

                <div style="background:#f2f2f2;border-radius:10px;padding:16px;display:flex;align-items:center;justify-content:center;gap:20px;">
                    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
                        <div style="position:relative;width:54px;height:54px;">
                            <img src="${previewAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:${getShapeBorderRadius(activeShape)};display:block;" onerror="this.src='assets/icons/chat.png';" />
                            ${activeFrame && activeFrame.url ? `
                                <img src="${activeFrame.url}" style="position:absolute;top:50%;left:50%;transform:translate(calc(-50% + ${frameX}px), calc(-50% + ${frameY}px)) scale(${frameScale});width:100%;height:100%;pointer-events:none;" onerror="this.style.display='none'" />
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

            <!-- 头像框折叠栏与缩略图选择（精简极简 + 与三角形图标） -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;">
                <div onclick="window.toggleDecorFramesCollapse()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                    <div style="font-size:13.5px;font-weight:600;color:#222;">头像框库</div>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <!-- 极简加号按钮 -->
                        <button onclick="event.stopPropagation(); window.openSelectFrameSourceModal();" title="添加新头像框" style="width:26px;height:26px;border-radius:50%;border:none;background:#07c160;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
                            <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:#fff;stroke-width:2.5;stroke-linecap:round;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                        <!-- 极简纯三角形折叠图标 -->
                        <span id="decorFramesCollapseArrow" style="font-size:11px;color:#888;user-select:none;transition:transform 0.2s ease;">▼</span>
                    </div>
                </div>

                <div id="decorFramesBody" style="display:block;margin-top:12px;">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(70px, 1fr));gap:10px;">
                        ${frames.map(f => {
                            const isCur = (f.id === activeFrameId);
                            const curScale = f.scale !== undefined ? f.scale : 1.18;
                            const curX = f.offsetX || 0;
                            const curY = f.offsetY || 0;
                            return `
                                <div onclick="window.toggleSelectFrameItem('${f.id}')" 
                                     style="position:relative;background:${isCur ? '#e8f7ed' : '#f9f9f9'};border:1px solid ${isCur ? '#07c160' : '#eee'};border-radius:8px;padding:8px 4px;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
                                    <div style="position:relative;width:40px;height:40px;margin-bottom:4px;">
                                        <img src="${previewAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:${getShapeBorderRadius(activeShape)};display:block;" onerror="this.src='assets/icons/chat.png';" />
                                        ${f.url ? `<img src="${f.url}" style="position:absolute;top:50%;left:50%;transform:translate(calc(-50% + ${curX}px), calc(-50% + ${curY}px)) scale(${curScale});width:100%;height:100%;pointer-events:none;" onerror="this.style.display='none'" />` : ''}
                                    </div>
                                    <span style="font-size:10px;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60px;text-align:center;">${escapeHtml(f.name)}</span>
                                    ${!f.isBuiltin ? `<span onclick="event.stopPropagation(); window.deleteDecorFrame('${f.id}')" style="position:absolute;top:2px;right:4px;font-size:10px;color:#fa5151;cursor:pointer;">✕</span>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <!-- 当前选中头像框调节区 -->
                    ${activeFrame && activeFrame.url ? `
                        <div style="margin-top:12px;background:#f9f9f9;border-radius:8px;padding:12px;border:1px solid #eee;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <span style="font-size:12px;font-weight:600;color:#333;">微调当前头像框（${escapeHtml(activeFrame.name)}）</span>
                                <button onclick="window.openAdjustFrameModal('${activeFrame.id}')" style="background:#07c160;color:#fff;border:none;border-radius:4px;padding:3px 8px;font-size:11px;cursor:pointer;">全向精确调节</button>
                            </div>
                            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#666;margin-bottom:4px;">
                                <span>尺寸缩放</span>
                                <span style="color:#07c160;font-weight:600;" id="frameScaleValText">${Math.round(frameScale * 100)}%</span>
                            </div>
                            <input type="range" min="80" max="180" value="${Math.round(frameScale * 100)}" style="width:100%;accent-color:#07c160;" oninput="window.updateCurrentFrameScale(this.value)">
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
        arrow.textContent = isHidden ? '▼' : '▲';
    };

    // 试穿与卸下切换
    window.toggleSelectFrameItem = function (id) {
        const current = localStorage.getItem('mcyt_active_decor_frame') || 'frame_none';
        const nextId = (current === id) ? 'frame_none' : id;
        localStorage.setItem('mcyt_active_decor_frame', nextId);
        refreshDecorView();
    };

    // 快速滑块调节当前头像框尺寸并保存
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

    // 选取头像框来源弹窗（相册选取或网络URL）
    window.openSelectFrameSourceModal = function () {
        let modal = document.getElementById('decorSourceModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'decorSourceModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:12px;width:100%;max-width:300px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="font-size:14px;font-weight:600;color:#222;margin-bottom:12px;">导入新头像框</div>

                <input type="file" id="decorSourceFileInput" accept="image/*" style="display:none;" onchange="window.handleSourceLocalUpload(event)">
                
                <button onclick="document.getElementById('decorSourceFileInput').click()" style="width:100%;padding:10px;background:#07c160;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:6px;">
                    <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:#fff;stroke-width:2;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <span>从手机相册选取</span>
                </button>

                <div style="display:flex;align-items:center;margin:10px 0;gap:8px;">
                    <div style="flex:1;height:1px;background:#eee;"></div>
                    <span style="font-size:11px;color:#aaa;">或输入图片链接</span>
                    <div style="flex:1;height:1px;background:#eee;"></div>
                </div>

                <input type="text" id="decorSourceUrlInput" placeholder="https://..." style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12px;outline:none;margin-bottom:12px;">

                <div style="display:flex;gap:8px;">
                    <button style="flex:1;padding:8px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;" onclick="document.getElementById('decorSourceModal').remove()">取消</button>
                    <button style="flex:1;padding:8px;background:#181818;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:500;cursor:pointer;" onclick="window.confirmSourceUrl()">下一步调节</button>
                </div>
            </div>
        `;
    };

    window.confirmSourceUrl = function () {
        const url = (document.getElementById('decorSourceUrlInput')?.value || '').trim();
        if (!url) {
            if (typeof showToast === 'function') showToast('请填写有效的图片链接');
            return;
        }
        document.getElementById('decorSourceModal')?.remove();
        // 导入成功，自动进入调节页面！
        window.openAdjustFrameModal(null, url, '新头像框');
    };

    window.handleSourceLocalUpload = function (event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            const rawData = e.target.result;
            const defaultName = file.name.replace(/\.[^/.]+$/, "");
            document.getElementById('decorSourceModal')?.remove();
            // 导入成功，直接自动唤起调节舞台！
            window.openAdjustFrameModal(null, rawData, defaultName);
        };
        reader.readAsDataURL(file);
    };

    // 🌟 全功能头像框微调舞台（支持上下左右偏移、缩放调节，配备保存按钮）
    window.openAdjustFrameModal = function (frameId = null, initialUrl = '', initialName = '') {
        let frameObj = null;
        if (frameId) {
            const list = window.getStoredDecorFrames();
            frameObj = list.find(x => x.id === frameId);
        }

        const currentUrl = frameObj ? frameObj.url : initialUrl;
        let currentName = frameObj ? frameObj.name : (initialName || '自定义头像框');
        let currentScale = (frameObj && frameObj.scale !== undefined) ? frameObj.scale : 1.18;
        let currentOffsetX = (frameObj && frameObj.offsetX !== undefined) ? frameObj.offsetX : 0;
        let currentOffsetY = (frameObj && frameObj.offsetY !== undefined) ? frameObj.offsetY : 0;

        const testAvatar = (typeof window.getPlayerAvatarSafe === 'function') 
            ? window.getPlayerAvatarSafe() 
            : 'assets/icons/chat.png';
        const activeShape = localStorage.getItem('mcyt_active_avatar_shape') || 'circle';

        let modal = document.getElementById('adjustFrameModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'adjustFrameModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:100000;padding:16px;';
            document.body.appendChild(modal);
        }

        function updateModalPreview() {
            const preview = document.getElementById('adjustPreviewFrameImg');
            if (preview) {
                preview.style.transform = `translate(calc(-50% + ${currentOffsetX}px), calc(-50% + ${currentOffsetY}px)) scale(${currentScale})`;
            }
            const sText = document.getElementById('adjustScaleValueText');
            if (sText) sText.textContent = `${Math.round(currentScale * 100)}%`;
            const xText = document.getElementById('adjustXValueText');
            if (xText) xText.textContent = `${currentOffsetX}px`;
            const yText = document.getElementById('adjustYValueText');
            if (yText) yText.textContent = `${currentOffsetY}px`;
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:320px;padding:18px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div style="font-size:14px;font-weight:600;color:#222;">调节头像框位置与大小</div>
                    <button onclick="document.getElementById('adjustFrameModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;padding:0 4px;">✕</button>
                </div>

                <!-- 实时预览舞台 -->
                <div style="background:#f4f4f4;border-radius:10px;padding:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:14px;">
                    <div style="position:relative;width:60px;height:60px;">
                        <img src="${testAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:${getShapeBorderRadius(activeShape)};display:block;" onerror="this.src='assets/icons/chat.png';" />
                        <img id="adjustPreviewFrameImg" src="${currentUrl}" style="position:absolute;top:50%;left:50%;transform:translate(calc(-50% + ${currentOffsetX}px), calc(-50% + ${currentOffsetY}px)) scale(${currentScale});width:100%;height:100%;pointer-events:none;" onerror="this.style.display='none'" />
                    </div>
                    <span style="font-size:10.5px;color:#888;margin-top:8px;">滑动下方滑块或按方向键微调</span>
                </div>

                <div style="margin-bottom:10px;">
                    <input type="text" id="adjustFrameNameInput" value="${escapeHtml(currentName)}" placeholder="头像框备注名称" style="width:100%;box-sizing:border-box;padding:7px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12px;outline:none;">
                </div>

                <!-- 缩放控制滑块 -->
                <div style="margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:3px;">
                        <span>大小缩放</span>
                        <span style="color:#07c160;font-weight:600;" id="adjustScaleValueText">${Math.round(currentScale * 100)}%</span>
                    </div>
                    <input type="range" id="adjustScaleSlider" min="80" max="180" value="${Math.round(currentScale * 100)}" style="width:100%;accent-color:#07c160;">
                </div>

                <!-- 左右偏移控制滑块 -->
                <div style="margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:3px;">
                        <span>水平偏移 (X)</span>
                        <span style="color:#07c160;font-weight:600;" id="adjustXValueText">${currentOffsetX}px</span>
                    </div>
                    <input type="range" id="adjustXSlider" min="-30" max="30" value="${currentOffsetX}" style="width:100%;accent-color:#07c160;">
                </div>

                <!-- 上下偏移控制滑块 -->
                <div style="margin-bottom:14px;">
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:3px;">
                        <span>垂直偏移 (Y)</span>
                        <span style="color:#07c160;font-weight:600;" id="adjustYValueText">${currentOffsetY}px</span>
                    </div>
                    <input type="range" id="adjustYSlider" min="-30" max="30" value="${currentOffsetY}" style="width:100%;accent-color:#07c160;">
                </div>

                <!-- 方向微调轻触键 -->
                <div style="display:flex;justify-content:center;gap:12px;margin-bottom:14px;">
                    <button type="button" id="btnShiftUp" style="padding:4px 10px;background:#f0f0f0;border:none;border-radius:4px;font-size:11px;cursor:pointer;">↑ 上</button>
                    <button type="button" id="btnShiftDown" style="padding:4px 10px;background:#f0f0f0;border:none;border-radius:4px;font-size:11px;cursor:pointer;">↓ 下</button>
                    <button type="button" id="btnShiftLeft" style="padding:4px 10px;background:#f0f0f0;border:none;border-radius:4px;font-size:11px;cursor:pointer;">← 左</button>
                    <button type="button" id="btnShiftRight" style="padding:4px 10px;background:#f0f0f0;border:none;border-radius:4px;font-size:11px;cursor:pointer;">→ 右</button>
                    <button type="button" id="btnResetPos" style="padding:4px 8px;background:#fbe9e7;color:#d32f2f;border:none;border-radius:4px;font-size:11px;cursor:pointer;">居中</button>
                </div>

                <!-- 明确的保存并应用按钮 -->
                <div style="display:flex;gap:8px;">
                    <button style="flex:1;padding:9px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12.5px;color:#555;cursor:pointer;" onclick="document.getElementById('adjustFrameModal').remove()">取消</button>
                    <button id="btnSaveAdjustedFrame" style="flex:1.4;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:12.5px;color:#fff;font-weight:600;cursor:pointer;">保存装扮并选用</button>
                </div>
            </div>
        `;

        // 事件绑定
        const scaleSlider = modal.querySelector('#adjustScaleSlider');
        const xSlider = modal.querySelector('#adjustXSlider');
        const ySlider = modal.querySelector('#adjustYSlider');

        scaleSlider.oninput = (e) => {
            currentScale = parseFloat(e.target.value) / 100;
            updateModalPreview();
        };
        xSlider.oninput = (e) => {
            currentOffsetX = parseInt(e.target.value) || 0;
            updateModalPreview();
        };
        ySlider.oninput = (e) => {
            currentOffsetY = parseInt(e.target.value) || 0;
            updateModalPreview();
        };

        modal.querySelector('#btnShiftUp').onclick = () => {
            currentOffsetY -= 1;
            ySlider.value = currentOffsetY;
            updateModalPreview();
        };
        modal.querySelector('#btnShiftDown').onclick = () => {
            currentOffsetY += 1;
            ySlider.value = currentOffsetY;
            updateModalPreview();
        };
        modal.querySelector('#btnShiftLeft').onclick = () => {
            currentOffsetX -= 1;
            xSlider.value = currentOffsetX;
            updateModalPreview();
        };
        modal.querySelector('#btnShiftRight').onclick = () => {
            currentOffsetX += 1;
            xSlider.value = currentOffsetX;
            updateModalPreview();
        };
        modal.querySelector('#btnResetPos').onclick = () => {
            currentOffsetX = 0;
            currentOffsetY = 0;
            xSlider.value = 0;
            ySlider.value = 0;
            updateModalPreview();
        };

        modal.querySelector('#btnSaveAdjustedFrame').onclick = () => {
            const finalName = (modal.querySelector('#adjustFrameNameInput')?.value || '').trim() || '自定义头像框';
            const saveId = frameId || ('frame_' + Date.now());

            const itemToSave = {
                id: saveId,
                name: finalName,
                url: currentUrl,
                scale: currentScale,
                offsetX: currentOffsetX,
                offsetY: currentOffsetY,
                isBuiltin: false
            };

            saveCustomFrame(itemToSave);
            localStorage.setItem('mcyt_active_decor_frame', saveId);

            modal.remove();
            refreshDecorView();
            if (typeof showToast === 'function') showToast('头像框配置已保存并生效');
        };
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
