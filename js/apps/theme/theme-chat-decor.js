/**
 * js/apps/theme/theme-chat-decor.js
 * 💬 微信装扮中心独立模块（原生白灰微绿质感）
 * 职责：
 *  1. 头像框缩略图折叠抽屉与试穿预览模式（极简图标 + / ▲）
 *  2. 导入头像框后自动进入微调舞台（支持 80%~180% 自由缩放及上下左右全向对齐偏移）
 *  3. 头像框独立保存按钮与持久化配置（scale, offsetX, offsetY）
 *  4. 气泡视觉框选工坊：支持手指/鼠标在图片上直接拖拽框选文本区，支持【保持原画插画】与【九宫格拉伸】双模
 *  5. 气泡导入导出中枢：支持标准 JSON 一键复制/导入与跨设备分享
 *  6. 遵循微信原生克制质感，彻底消除陈旧冗余文案
 */

(function () {
    'use strict';

    // 默认头像框
    const DEFAULT_FRAMES = [
        { id: 'frame_none', name: '无头像框', url: '', scale: 1.18, offsetX: 0, offsetY: 0, isBuiltin: true }
    ];

    // 默认气泡
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
            const idx = list.findIndex(x => x.id === item.id);
            if (idx >= 0) {
                list[idx] = item;
            } else {
                list.push(item);
            }
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
                <div style="font-size:11.5px;color:#888;margin-bottom:12px;">点击下方头像框或气泡缩略图即可实时试穿。</div>

                <div style="background:#f2f2f2;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:14px;">
                    <!-- 头像试穿展示 -->
                    <div style="display:flex;align-items:center;justify-content:center;gap:10px;">
                        <div style="position:relative;width:54px;height:54px;">
                            <img src="${previewAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:${getShapeBorderRadius(activeShape)};display:block;" onerror="this.src='assets/icons/chat.png';" />
                            ${activeFrame && activeFrame.url ? `
                                <img src="${activeFrame.url}" style="position:absolute;top:50%;left:50%;transform:translate(calc(-50% + ${frameX}px), calc(-50% + ${frameY}px)) scale(${frameScale});width:100%;height:100%;pointer-events:none;" onerror="this.style.display='none'" />
                            ` : ''}
                        </div>
                        <div style="display:flex;flex-direction:column;gap:2px;">
                            <span style="font-size:12px;font-weight:600;color:#333;">${activeFrame && activeFrame.url ? escapeHtml(activeFrame.name) : '无头像框'}</span>
                            <span style="font-size:11px;color:#888;">当前气泡：${escapeHtml(activeBubble ? activeBubble.name : '默认')}</span>
                        </div>
                    </div>

                    <!-- 气泡效果试穿行 -->
                    <div style="display:flex;flex-direction:column;gap:10px;padding-top:10px;border-top:1px dashed #e0e0e0;">
                        <div style="display:flex;justify-content:flex-start;">
                            <div style="max-width:85%;font-size:12px;box-sizing:border-box;padding:8px 12px;${activeBubble ? (activeBubble.npcStyle || '') : ''}">
                                对方：气泡效果试穿中～
                            </div>
                        </div>
                        <div style="display:flex;justify-content:flex-end;">
                            <div style="max-width:85%;font-size:12px;box-sizing:border-box;padding:8px 12px;${activeBubble ? (activeBubble.userStyle || '') : ''}">
                                我方：自适应排版非常自然！
                            </div>
                        </div>
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
                    <div style="font-size:13.5px;font-weight:600;color:#222;">头像框库</div>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <button onclick="event.stopPropagation(); window.openSelectFrameSourceModal();" title="添加新头像框" style="width:26px;height:26px;border-radius:50%;border:none;background:#07c160;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
                            <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:#fff;stroke-width:2.5;stroke-linecap:round;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
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
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div>
                        <div style="font-size:13.5px;font-weight:600;color:#222;">气泡样式库</div>
                        <div style="font-size:11.5px;color:#888;">可视化框选与个性气泡</div>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button onclick="window.openImportBubbleModal()" style="padding:4px 8px;font-size:11px;border-radius:6px;border:1px solid #ddd;background:#f9f9f9;color:#333;cursor:pointer;">导入</button>
                        <button onclick="window.openBubbleActionMenu()" style="padding:4px 10px;font-size:11px;border-radius:6px;border:none;background:#07c160;color:#fff;cursor:pointer;font-weight:500;">+ 制作</button>
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
                    ${bubbles.map(b => `
                        <div onclick="window.selectDecorBubble('${b.id}')" style="background:${b.id === activeBubbleId ? '#e8f7ed' : '#f9f9f9'};border:1px solid ${b.id === activeBubbleId ? '#07c160' : '#eee'};border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                            <div style="display:flex;flex-direction:column;gap:2px;max-width:65%;">
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <span style="font-size:12.5px;font-weight:600;color:#222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(b.name)}</span>
                                    <span style="font-size:9.5px;padding:1px 5px;border-radius:3px;background:${b.type === 'frame_box' ? '#e1f3d8' : (b.type === 'nine_slice' ? '#d9ecff' : '#e9e9eb')};color:${b.type === 'frame_box' ? '#529b2e' : (b.type === 'nine_slice' ? '#409eff' : '#606266')};">
                                        ${b.type === 'frame_box' ? '原画插画' : (b.type === 'nine_slice' ? '点九拉伸' : 'CSS')}
                                    </span>
                                </div>
                                <span style="font-size:10px;color:#888;">${b.author ? ('作者: ' + escapeHtml(b.author)) : (b.isBuiltin ? '系统预设' : '自定义气泡')}</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <button onclick="event.stopPropagation(); window.exportSingleBubble('${b.id}')" title="导出气泡分享 JSON" style="background:none;border:none;color:#07c160;font-size:11px;cursor:pointer;padding:2px 4px;">导出</button>
                                ${!b.isBuiltin ? `
                                    <button onclick="event.stopPropagation(); window.deleteDecorBubble('${b.id}')" title="删除气泡" style="background:none;border:none;color:#fa5151;font-size:11px;cursor:pointer;padding:2px 4px;">删除</button>
                                ` : ''}
                                <span style="font-size:11px;color:${b.id === activeBubbleId ? '#07c160' : '#999'};font-weight:${b.id === activeBubbleId ? '600' : 'normal'};min-width:36px;text-align:right;">
                                    ${b.id === activeBubbleId ? '使用中' : '选用'}
                                </span>
                            </div>
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

    window.toggleSelectFrameItem = function (id) {
        const current = localStorage.getItem('mcyt_active_decor_frame') || 'frame_none';
        const nextId = (current === id) ? 'frame_none' : id;
        localStorage.setItem('mcyt_active_decor_frame', nextId);
        refreshDecorView();
    };

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

    window.deleteDecorBubble = function (id) {
        let list = JSON.parse(localStorage.getItem('mcyt_decor_bubbles') || '[]');
        list = list.filter(x => x.id !== id);
        localStorage.setItem('mcyt_decor_bubbles', JSON.stringify(list));
        if (localStorage.getItem('mcyt_active_decor_bubble') === id) {
            localStorage.setItem('mcyt_active_decor_bubble', 'bubble_default');
        }
        refreshDecorView();
        if (typeof showToast === 'function') showToast('气泡已删除');
    };

    function refreshDecorView() {
        const sub = document.getElementById('themeAppSubContent');
        if (sub && typeof window.renderChatDecorTheme === 'function') {
            window.renderChatDecorTheme(sub);
        }
    }

    // 选取头像框来源弹窗
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
            window.openAdjustFrameModal(null, rawData, defaultName);
        };
        reader.readAsDataURL(file);
    };

    // 头像框微调舞台
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

                <div style="background:#f4f4f4;border-radius:10px;padding:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:14px;">
                    <div style="position:relative;width:60px;height:60px;">
                        <img src="${testAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:${getShapeBorderRadius(activeShape)};display:block;" onerror="this.src='assets/icons/chat.png';" />
                        <img id="adjustPreviewFrameImg" src="${currentUrl}" style="position:absolute;top:50%;left:50%;transform:translate(calc(-50% + ${currentOffsetX}px), calc(-50% + ${currentOffsetY}px)) scale(${currentScale});width:100%;height:100%;pointer-events:none;" onerror="this.style.display='none'" />
                    </div>
                    <span style="font-size:10.5px;color:#888;margin-top:8px;">滑动滑块或按方向键微调</span>
                </div>

                <div style="margin-bottom:10px;">
                    <input type="text" id="adjustFrameNameInput" value="${escapeHtml(currentName)}" placeholder="头像框备注名称" style="width:100%;box-sizing:border-box;padding:7px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12px;outline:none;">
                </div>

                <div style="margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:3px;">
                        <span>大小缩放</span>
                        <span style="color:#07c160;font-weight:600;" id="adjustScaleValueText">${Math.round(currentScale * 100)}%</span>
                    </div>
                    <input type="range" id="adjustScaleSlider" min="80" max="180" value="${Math.round(currentScale * 100)}" style="width:100%;accent-color:#07c160;">
                </div>

                <div style="margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:3px;">
                        <span>水平偏移 (X)</span>
                        <span style="color:#07c160;font-weight:600;" id="adjustXValueText">${currentOffsetX}px</span>
                    </div>
                    <input type="range" id="adjustXSlider" min="-30" max="30" value="${currentOffsetX}" style="width:100%;accent-color:#07c160;">
                </div>

                <div style="margin-bottom:14px;">
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:3px;">
                        <span>垂直偏移 (Y)</span>
                        <span style="color:#07c160;font-weight:600;" id="adjustYValueText">${currentOffsetY}px</span>
                    </div>
                    <input type="range" id="adjustYSlider" min="-30" max="30" value="${currentOffsetY}" style="width:100%;accent-color:#07c160;">
                </div>

                <div style="display:flex;justify-content:center;gap:12px;margin-bottom:14px;">
                    <button type="button" id="btnShiftUp" style="padding:4px 10px;background:#f0f0f0;border:none;border-radius:4px;font-size:11px;cursor:pointer;">↑ 上</button>
                    <button type="button" id="btnShiftDown" style="padding:4px 10px;background:#f0f0f0;border:none;border-radius:4px;font-size:11px;cursor:pointer;">↓ 下</button>
                    <button type="button" id="btnShiftLeft" style="padding:4px 10px;background:#f0f0f0;border:none;border-radius:4px;font-size:11px;cursor:pointer;">← 左</button>
                    <button type="button" id="btnShiftRight" style="padding:4px 10px;background:#f0f0f0;border:none;border-radius:4px;font-size:11px;cursor:pointer;">→ 右</button>
                    <button type="button" id="btnResetPos" style="padding:4px 8px;background:#fbe9e7;color:#d32f2f;border:none;border-radius:4px;font-size:11px;cursor:pointer;">居中</button>
                </div>

                <div style="display:flex;gap:8px;">
                    <button style="flex:1;padding:9px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12.5px;color:#555;cursor:pointer;" onclick="document.getElementById('adjustFrameModal').remove()">取消</button>
                    <button id="btnSaveAdjustedFrame" style="flex:1.4;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:12.5px;color:#fff;font-weight:600;cursor:pointer;">保存装扮并选用</button>
                </div>
            </div>
        `;

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

    // ==========================================
    // 🎨 气泡制作与管理操作分流菜单
    // ==========================================
    window.openBubbleActionMenu = function () {
        let modal = document.getElementById('bubbleActionModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bubbleActionModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:300px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="font-size:14px;font-weight:600;color:#222;margin-bottom:12px;">创建新气泡</div>
                
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <button onclick="document.getElementById('bubbleActionModal').remove(); window.openVisualCropBubbleModal();" style="width:100%;padding:11px;background:#07c160;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                        <span>🎨 可视化框选气泡工坊</span>
                    </button>
                    <button onclick="document.getElementById('bubbleActionModal').remove(); window.openAddCssBubbleModal();" style="width:100%;padding:10px;background:#f5f5f5;border:1px solid #e0e0e0;border-radius:8px;font-size:12.5px;color:#333;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                        <span>💻 编写纯 CSS 代码气泡</span>
                    </button>
                    <button onclick="document.getElementById('bubbleActionModal').remove(); window.openImportBubbleModal();" style="width:100%;padding:10px;background:#f5f5f5;border:1px solid #e0e0e0;border-radius:8px;font-size:12.5px;color:#333;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                        <span>📥 导入气泡 JSON 分享卡</span>
                    </button>
                </div>

                <div style="margin-top:12px;">
                    <button style="width:100%;padding:8px;background:none;border:none;color:#888;font-size:12px;cursor:pointer;" onclick="document.getElementById('bubbleActionModal').remove()">取消</button>
                </div>
            </div>
        `;
    };

    // ==========================================
    // 🌟 可视化框选气泡工坊（彻底消灭填数字，支持原画插画与点九拉伸）
    // ==========================================
    window.openVisualCropBubbleModal = function (bubbleObj = null) {
        let modal = document.getElementById('visualCropBubbleModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'visualCropBubbleModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:100000;padding:10px;box-sizing:border-box;';
            document.body.appendChild(modal);
        }

        // 默认状态：top%, right%, bottom%, left% 为框选边距占图片尺寸的百分比
        const state = {
            id: bubbleObj ? bubbleObj.id : ('bubble_' + Date.now()),
            name: bubbleObj ? bubbleObj.name : '我的插画气泡',
            author: bubbleObj ? (bubbleObj.author || '') : '',
            imgUrl: bubbleObj?.decorConfig?.imgUrl || '',
            // 模式：'frame_box' 保持原画插画比例不拉伸（立绘人物最完美）；'nine_slice' 点九自适应拉伸
            renderMode: bubbleObj?.type === 'nine_slice' ? 'nine_slice' : 'frame_box',
            textColor: bubbleObj?.decorConfig?.textColor || '#222222',
            // 选框边缘距离四周的百分比（0~100）
            crop: {
                top: bubbleObj?.decorConfig?.crop?.top ?? 18,
                right: bubbleObj?.decorConfig?.crop?.right ?? 18,
                bottom: bubbleObj?.decorConfig?.crop?.bottom ?? 38,
                left: bubbleObj?.decorConfig?.crop?.left ?? 18
            }
        };

        // 动态生成气泡 CSS 样式
        function generateBubbleStyles() {
            if (!state.imgUrl) {
                return {
                    user: 'background-color:#95ec69;color:#000;border-radius:8px;padding:8px 12px;',
                    npc: 'background-color:#ffffff;color:#000;border:1px solid #e0e0e0;border-radius:8px;padding:8px 12px;'
                };
            }

            const c = state.crop;
            if (state.renderMode === 'frame_box') {
                // 【原画插画模式】保持原画完整，文字根据框选位置被安全局限在内部
                const padTop = Math.max(8, Math.round(c.top * 1.8));
                const padRight = Math.max(10, Math.round(c.right * 1.8));
                const padBottom = Math.max(8, Math.round(c.bottom * 1.8));
                const padLeft = Math.max(10, Math.round(c.left * 1.8));

                const baseStyle = `background-image: url('${state.imgUrl}'); background-size: 100% 100%; background-repeat: no-repeat; background-position: center; color: ${state.textColor}; box-sizing: border-box; min-width: 140px;`;
                return {
                    user: `${baseStyle} padding: ${padTop}px ${padRight}px ${padBottom}px ${padLeft}px;`,
                    npc: `${baseStyle} padding: ${padTop}px ${padRight}px ${padBottom}px ${padLeft}px;`
                };
            } else {
                // 【点九图拉伸模式】以百分比作为切片
                const slice = `${c.top}% ${c.right}% ${c.bottom}% ${c.left}%`;
                const pad = `${c.top}px ${c.right}px ${c.bottom}px ${c.left}px`;
                const baseStyle = `border-style: solid; border-width: 16px; border-image-source: url('${state.imgUrl}'); border-image-slice: ${slice} fill; border-image-repeat: stretch; color: ${state.textColor}; padding: ${pad}; background: transparent;`;
                return {
                    user: baseStyle,
                    npc: baseStyle
                };
            }
        }

        function renderStage() {
            const styles = generateBubbleStyles();

            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:340px;max-height:94vh;overflow-y:auto;padding:14px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;-webkit-overflow-scrolling:touch;">
                    <!-- 顶栏标题与关闭 -->
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="font-size:14px;font-weight:600;color:#222;">气泡框选工坊</span>
                        <button onclick="document.getElementById('visualCropBubbleModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                    </div>

                    <!-- 实时聊天预览舞台 -->
                    <div style="background:#f4f4f4;border-radius:10px;padding:10px;margin-bottom:10px;display:flex;flex-direction:column;gap:8px;">
                        <div style="font-size:10.5px;color:#888;display:flex;justify-content:space-between;">
                            <span>实时对白效果预览</span>
                            <span>${state.renderMode === 'frame_box' ? '插画画框模式（保全立绘）' : '自适应点九拉伸'}</span>
                        </div>
                        <div style="display:flex;justify-content:flex-start;">
                            <div id="cropPreviewNpc" style="max-width:85%;font-size:12px;line-height:1.4;word-break:break-word;${styles.npc}">
                                对方：好可爱的气泡！
                            </div>
                        </div>
                        <div style="display:flex;justify-content:flex-end;">
                            <div id="cropPreviewUser" style="max-width:85%;font-size:12px;line-height:1.4;word-break:break-word;${styles.user}">
                                我方：文字不论多长都呆在框选区里，小人完全不会变形～
                            </div>
                        </div>
                    </div>

                    <!-- 模式切换与图片选取 -->
                    <div style="display:flex;gap:6px;margin-bottom:8px;">
                        <button id="btnModeFrame" style="flex:1;padding:6px;border-radius:6px;font-size:11px;cursor:pointer;border:1px solid ${state.renderMode === 'frame_box' ? '#07c160' : '#e0e0e0'};background:${state.renderMode === 'frame_box' ? '#e8f7ed' : '#fff'};color:${state.renderMode === 'frame_box' ? '#07c160' : '#333'};font-weight:600;">
                            🖼️ 保持原画（插画立绘推荐）
                        </button>
                        <button id="btnModeNine" style="flex:1;padding:6px;border-radius:6px;font-size:11px;cursor:pointer;border:1px solid ${state.renderMode === 'nine_slice' ? '#07c160' : '#e0e0e0'};background:${state.renderMode === 'nine_slice' ? '#e8f7ed' : '#fff'};color:${state.renderMode === 'nine_slice' ? '#07c160' : '#333'};">
                            ↔️ 九宫格拉伸（长条框）
                        </button>
                    </div>

                    <!-- 图片上传栏 -->
                    <input type="file" id="visualCropFileInput" accept="image/*" style="display:none;">
                    <div style="display:flex;gap:6px;margin-bottom:10px;">
                        <button onclick="document.getElementById('visualCropFileInput').click()" style="flex:1;padding:7px;border-radius:6px;border:none;background:#07c160;color:#fff;font-size:11.5px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">
                            <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:#fff;stroke-width:2;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            <span>选取气泡底图</span>
                        </button>
                        <div style="display:flex;align-items:center;gap:4px;background:#f8f8f8;padding:0 8px;border-radius:6px;border:1px solid #ddd;">
                            <span style="font-size:11px;color:#666;">字色:</span>
                            <input type="color" id="cropTextColorInput" value="${state.textColor}" style="width:20px;height:20px;border:none;background:none;padding:0;cursor:pointer;">
                        </div>
                    </div>

                    <!-- 🌟 核心：大图可视化框选舞台 -->
                    <div style="position:relative;background:#f0f0f0;border-radius:8px;padding:8px;margin-bottom:8px;display:flex;justify-content:center;align-items:center;user-select:none;touch-action:none;">
                        ${state.imgUrl ? `
                            <div id="cropStageWrapper" style="position:relative;width:240px;height:220px;background:#fff;border-radius:6px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);display:flex;align-items:center;justify-content:center;">
                                <img id="cropTargetImg" src="${state.imgUrl}" style="width:100%;height:100%;object-fit:contain;pointer-events:none;display:block;" />
                                
                                <!-- 绿色半透明可视化框选框 -->
                                <div id="cropBoxRect" style="position:absolute;top:${state.crop.top}%;left:${state.crop.left}%;right:${state.crop.right}%;bottom:${state.crop.bottom}%;border:2px dashed #07c160;background:rgba(7,193,96,0.18);box-sizing:border-box;pointer-events:none;">
                                    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#07c160;font-size:11px;font-weight:600;text-shadow:0 0 3px #fff;">
                                        文字区域
                                    </div>
                                </div>

                                <!-- 4 根可拖动的交互参考线/手柄（全触控覆盖） -->
                                <div id="handleTop" style="position:absolute;top:${state.crop.top}%;left:0;right:0;height:16px;margin-top:-8px;cursor:ns-resize;display:flex;align-items:center;justify-content:center;z-index:10;">
                                    <div style="width:36px;height:4px;background:#07c160;border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
                                </div>
                                <div id="handleBottom" style="position:absolute;bottom:${state.crop.bottom}%;left:0;right:0;height:16px;margin-bottom:-8px;cursor:ns-resize;display:flex;align-items:center;justify-content:center;z-index:10;">
                                    <div style="width:36px;height:4px;background:#07c160;border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
                                </div>
                                <div id="handleLeft" style="position:absolute;left:${state.crop.left}%;top:0;bottom:0;width:16px;margin-left:-8px;cursor:ew-resize;display:flex;align-items:center;justify-content:center;z-index:10;">
                                    <div style="height:36px;width:4px;background:#07c160;border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
                                </div>
                                <div id="handleRight" style="position:absolute;right:${state.crop.right}%;top:0;bottom:0;width:16px;margin-right:-8px;cursor:ew-resize;display:flex;align-items:center;justify-content:center;z-index:10;">
                                    <div style="height:36px;width:4px;background:#07c160;border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
                                </div>
                            </div>
                        ` : `
                            <div onclick="document.getElementById('visualCropFileInput').click()" style="width:240px;height:160px;background:#fff;border:2px dashed #ddd;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;gap:6px;">
                                <svg viewBox="0 0 24 24" style="width:28px;height:28px;fill:none;stroke:#aaa;stroke-width:1.5;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                <span style="font-size:12px;color:#888;">请先点此选取气泡图片</span>
                            </div>
                        `}
                    </div>

                    <!-- 一键常用预设框选 -->
                    <div style="display:flex;gap:6px;margin-bottom:10px;">
                        <button id="btnPresetCenter" style="flex:1;padding:5px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;font-size:10.5px;color:#555;cursor:pointer;">居中留白</button>
                        <button id="btnPresetBottomRight" style="flex:1;padding:5px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;font-size:10.5px;color:#555;cursor:pointer;">避开右下小人</button>
                        <button id="btnPresetTopLeft" style="flex:1;padding:5px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;font-size:10.5px;color:#555;cursor:pointer;">避开左上徽章</button>
                    </div>

                    <!-- 气泡名称与作者 -->
                    <div style="display:flex;gap:6px;margin-bottom:12px;">
                        <input type="text" id="cropBubbleNameInput" value="${escapeHtml(state.name)}" placeholder="气泡名称" style="flex:2;padding:6px 8px;border-radius:6px;border:1px solid #ddd;font-size:11.5px;outline:none;">
                        <input type="text" id="cropBubbleAuthorInput" value="${escapeHtml(state.author)}" placeholder="作者名" style="flex:1.2;padding:6px 8px;border-radius:6px;border:1px solid #ddd;font-size:11.5px;outline:none;">
                    </div>

                    <!-- 保存与选用 -->
                    <div style="display:flex;gap:8px;">
                        <button onclick="document.getElementById('visualCropBubbleModal').remove()" style="flex:1;padding:9px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;">取消</button>
                        <button id="btnSaveCropBubble" style="flex:1.4;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">保存并选用气泡</button>
                    </div>
                </div>
            `;

            // 事件绑定
            modal.querySelector('#btnModeFrame').onclick = () => {
                state.renderMode = 'frame_box';
                renderStage();
            };
            modal.querySelector('#btnModeNine').onclick = () => {
                state.renderMode = 'nine_slice';
                renderStage();
            };

            const fileIn = modal.querySelector('#visualCropFileInput');
            fileIn.onchange = (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = function(evt) {
                    state.imgUrl = evt.target.result;
                    renderStage();
                };
                reader.readAsDataURL(file);
            };

            modal.querySelector('#cropTextColorInput').oninput = (e) => {
                state.textColor = e.target.value;
                updateLivePreview();
            };

            modal.querySelector('#cropBubbleNameInput').oninput = (e) => { state.name = e.target.value; };
            modal.querySelector('#cropBubbleAuthorInput').oninput = (e) => { state.author = e.target.value; };

            // 预设快速框选
            modal.querySelector('#btnPresetCenter').onclick = () => {
                state.crop = { top: 20, right: 20, bottom: 20, left: 20 };
                updateCropVisuals();
            };
            modal.querySelector('#btnPresetBottomRight').onclick = () => {
                state.crop = { top: 16, right: 18, bottom: 42, left: 16 };
                updateCropVisuals();
            };
            modal.querySelector('#btnPresetTopLeft').onclick = () => {
                state.crop = { top: 35, right: 16, bottom: 16, left: 24 };
                updateCropVisuals();
            };

            // 手指与鼠标拖拽控制手柄
            setupHandleDrag('handleTop', (deltaY, rect) => {
                const pctDelta = (deltaY / rect.height) * 100;
                state.crop.top = Math.max(5, Math.min(80 - state.crop.bottom, state.crop.top + pctDelta));
            });
            setupHandleDrag('handleBottom', (deltaY, rect) => {
                const pctDelta = (-deltaY / rect.height) * 100;
                state.crop.bottom = Math.max(5, Math.min(80 - state.crop.top, state.crop.bottom + pctDelta));
            });
            setupHandleDrag('handleLeft', (deltaX, rect) => {
                const pctDelta = (deltaX / rect.width) * 100;
                state.crop.left = Math.max(5, Math.min(80 - state.crop.right, state.crop.left + pctDelta));
            });
            setupHandleDrag('handleRight', (deltaX, rect) => {
                const pctDelta = (-deltaX / rect.width) * 100;
                state.crop.right = Math.max(5, Math.min(80 - state.crop.left, state.crop.right + pctDelta));
            });

            function setupHandleDrag(handleId, onMove) {
                const handle = modal.querySelector('#' + handleId);
                const wrapper = modal.querySelector('#cropStageWrapper');
                if (!handle || !wrapper) return;

                let startX = 0, startY = 0;

                const startDrag = (cx, cy) => {
                    startX = cx;
                    startY = cy;
                    const onDragging = (e) => {
                        const curX = e.touches ? e.touches[0].clientX : e.clientX;
                        const curY = e.touches ? e.touches[0].clientY : e.clientY;
                        const dx = curX - startX;
                        const dy = curY - startY;
                        startX = curX;
                        startY = curY;
                        const r = wrapper.getBoundingClientRect();
                        onMove(dx, dy, r);
                        updateCropVisuals();
                    };
                    const stopDrag = () => {
                        window.removeEventListener('mousemove', onDragging);
                        window.removeEventListener('mouseup', stopDrag);
                        window.removeEventListener('touchmove', onDragging);
                        window.removeEventListener('touchend', stopDrag);
                    };
                    window.addEventListener('mousemove', onDragging);
                    window.addEventListener('mouseup', stopDrag);
                    window.addEventListener('touchmove', onDragging);
                    window.addEventListener('touchend', stopDrag);
                };

                handle.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    startDrag(e.clientX, e.clientY);
                });
                handle.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    startDrag(e.touches[0].clientX, e.touches[0].clientY);
                }, { passive: false });
            }

            function updateCropVisuals() {
                const box = modal.querySelector('#cropBoxRect');
                const hTop = modal.querySelector('#handleTop');
                const hBottom = modal.querySelector('#handleBottom');
                const hLeft = modal.querySelector('#handleLeft');
                const hRight = modal.querySelector('#handleRight');

                if (box) {
                    box.style.top = state.crop.top + '%';
                    box.style.right = state.crop.right + '%';
                    box.style.bottom = state.crop.bottom + '%';
                    box.style.left = state.crop.left + '%';
                }
                if (hTop) hTop.style.top = state.crop.top + '%';
                if (hBottom) hBottom.style.bottom = state.crop.bottom + '%';
                if (hLeft) hLeft.style.left = state.crop.left + '%';
                if (hRight) hRight.style.right = state.crop.right + '%';

                updateLivePreview();
            }

            function updateLivePreview() {
                const s = generateBubbleStyles();
                const pUser = modal.querySelector('#cropPreviewUser');
                const pNpc = modal.querySelector('#cropPreviewNpc');
                if (pUser) pUser.style.cssText = `max-width:85%;font-size:12px;line-height:1.4;word-break:break-word;${s.user}`;
                if (pNpc) pNpc.style.cssText = `max-width:85%;font-size:12px;line-height:1.4;word-break:break-word;${s.npc}`;
            }

            // 保存并选用
            modal.querySelector('#btnSaveCropBubble').onclick = () => {
                if (!state.imgUrl) {
                    if (typeof showToast === 'function') showToast('请先选取一张气泡底图');
                    return;
                }

                const finalStyles = generateBubbleStyles();
                const bubbleData = {
                    id: state.id,
                    name: (state.name || '我的插画气泡').trim(),
                    author: (state.author || '玩家自制').trim(),
                    type: state.renderMode,
                    userStyle: finalStyles.user,
                    npcStyle: finalStyles.npc,
                    decorConfig: {
                        imgUrl: state.imgUrl,
                        crop: { ...state.crop },
                        textColor: state.textColor,
                        renderMode: state.renderMode
                    },
                    isBuiltin: false
                };

                saveCustomBubble(bubbleData);
                localStorage.setItem('mcyt_active_decor_bubble', bubbleData.id);

                modal.remove();
                refreshDecorView();
                if (typeof showToast === 'function') showToast('气泡已成功制作并应用！');
            };
        }

        renderStage();
    };

    // ==========================================
    // 📤 气泡导出为 JSON 分享弹窗
    // ==========================================
    window.exportSingleBubble = function (bubbleId) {
        const bubbles = window.getStoredDecorBubbles();
        const b = bubbles.find(x => x.id === bubbleId);
        if (!b) return;

        const exportPayload = {
            format: 'mcyt_chat_bubble_v1',
            version: '1.0',
            exportedAt: Date.now(),
            bubble: {
                id: 'bubble_shared_' + Date.now(),
                name: b.name,
                author: b.author || '网络创作者',
                type: b.type || 'css',
                userStyle: b.userStyle || '',
                npcStyle: b.npcStyle || '',
                decorConfig: b.decorConfig || null
            }
        };

        const jsonStr = JSON.stringify(exportPayload, null, 2);

        let modal = document.getElementById('bubbleExportModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bubbleExportModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:320px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-size:14px;font-weight:600;color:#222;">导出气泡配置</span>
                    <button onclick="document.getElementById('bubbleExportModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                </div>
                <div style="font-size:11px;color:#888;margin-bottom:10px;">复制 JSON 代码分享给朋友，或下载为文件。</div>

                <textarea id="bubbleExportJsonArea" readonly style="width:100%;box-sizing:border-box;min-height:120px;max-height:180px;padding:8px;border-radius:6px;border:1px solid #ddd;font-size:10.5px;font-family:monospace;resize:none;background:#f9f9f9;margin-bottom:12px;">${escapeHtml(jsonStr)}</textarea>

                <div style="display:flex;gap:8px;">
                    <button id="btnCopyBubbleJson" style="flex:1;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">复制到剪贴板</button>
                    <button id="btnDownloadBubbleJson" style="flex:1;padding:9px;background:#181818;border:none;border-radius:6px;font-size:12px;color:#fff;cursor:pointer;">下载 JSON</button>
                </div>
            </div>
        `;

        modal.querySelector('#btnCopyBubbleJson').onclick = () => {
            const area = modal.querySelector('#bubbleExportJsonArea');
            area.select();
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(jsonStr).then(() => {
                    if (typeof showToast === 'function') showToast('气泡 JSON 已复制到剪贴板！');
                }).catch(() => {
                    document.execCommand('copy');
                    if (typeof showToast === 'function') showToast('气泡 JSON 已复制！');
                });
            } else {
                document.execCommand('copy');
                if (typeof showToast === 'function') showToast('气泡 JSON 已复制！');
            }
        };

        modal.querySelector('#btnDownloadBubbleJson').onclick = () => {
            try {
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const reader = new FileReader();
                reader.onload = function(e) {
                    const a = document.createElement('a');
                    a.href = e.target.result;
                    a.download = `bubble_${(b.name || 'custom').replace(/\s+/g, '_')}.json`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    if (typeof showToast === 'function') showToast('气泡 JSON 文件已开始下载');
                };
                reader.readAsDataURL(blob);
            } catch (_) {
                if (typeof showToast === 'function') showToast('下载失败，请直接复制文本');
            }
        };
    };

    // ==========================================
    // 📥 气泡导入 JSON 弹窗
    // ==========================================
    window.openImportBubbleModal = function () {
        let modal = document.getElementById('bubbleImportModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bubbleImportModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:320px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-size:14px;font-weight:600;color:#222;">导入气泡配置</span>
                    <button onclick="document.getElementById('bubbleImportModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                </div>
                <div style="font-size:11px;color:#888;margin-bottom:10px;">粘贴创作者分享的 JSON 文本或选取 .json 文件。</div>

                <textarea id="bubbleImportJsonArea" placeholder="在此粘贴气泡 JSON 数据..." style="width:100%;box-sizing:border-box;min-height:120px;max-height:180px;padding:8px;border-radius:6px;border:1px solid #ddd;font-size:10.5px;font-family:monospace;resize:none;margin-bottom:10px;outline:none;"></textarea>

                <input type="file" id="bubbleImportFileInput" accept=".json,application/json" style="display:none;">

                <div style="display:flex;gap:8px;margin-bottom:10px;">
                    <button onclick="document.getElementById('bubbleImportFileInput').click()" style="flex:1;padding:7px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:11px;color:#555;cursor:pointer;">从本地文件读取</button>
                </div>

                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('bubbleImportModal').remove()" style="flex:1;padding:9px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#666;cursor:pointer;">取消</button>
                    <button id="btnConfirmImportBubble" style="flex:1.4;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">解析并导入</button>
                </div>
            </div>
        `;

        const fileInput = modal.querySelector('#bubbleImportFileInput');
        fileInput.onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                modal.querySelector('#bubbleImportJsonArea').value = evt.target.result;
            };
            reader.readAsText(file);
        };

        modal.querySelector('#btnConfirmImportBubble').onclick = () => {
            const raw = modal.querySelector('#bubbleImportJsonArea').value.trim();
            if (!raw) {
                if (typeof showToast === 'function') showToast('请先粘贴或读取有效的 JSON 数据');
                return;
            }

            try {
                const parsed = JSON.parse(raw);
                const bubbleObj = parsed.bubble || parsed;

                if (!bubbleObj.name || (!bubbleObj.userStyle && !bubbleObj.npcStyle && !bubbleObj.decorConfig)) {
                    throw new Error('格式不符合气泡协议');
                }

                const newId = 'bubble_' + Date.now();
                const itemToSave = {
                    id: newId,
                    name: bubbleObj.name || '导入的气泡',
                    author: bubbleObj.author || '分享者',
                    type: bubbleObj.type || (bubbleObj.decorConfig ? bubbleObj.decorConfig.renderMode : 'css'),
                    userStyle: bubbleObj.userStyle || '',
                    npcStyle: bubbleObj.npcStyle || '',
                    decorConfig: bubbleObj.decorConfig || null,
                    isBuiltin: false
                };

                saveCustomBubble(itemToSave);
                localStorage.setItem('mcyt_active_decor_bubble', newId);

                modal.remove();
                refreshDecorView();
                if (typeof showToast === 'function') showToast('气泡导入成功并已选用！');
            } catch (err) {
                if (typeof showToast === 'function') showToast('解析失败：不是合法的气泡 JSON');
            }
        };
    };

    // 新增纯 CSS 气泡
    window.openAddCssBubbleModal = function () {
        let modal = document.getElementById('addBubbleModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'addBubbleModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:12px;width:100%;max-width:320px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="font-size:14px;font-weight:600;color:#222;margin-bottom:8px;">编写纯 CSS 气泡</div>

                <input type="text" id="bubbleCustomName" placeholder="气泡备注名称" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12px;outline:none;margin-bottom:8px;">

                <div style="font-size:11px;color:#666;margin-bottom:4px;">我方气泡 CSS：</div>
                <textarea id="bubbleUserCssInput" placeholder="background: #95ec69; color: #000; border-radius: 6px;" style="width:100%;box-sizing:border-box;min-height:50px;padding:8px;border-radius:6px;border:1px solid #e0e0e0;font-size:11px;font-family:monospace;resize:none;margin-bottom:8px;"></textarea>

                <div style="font-size:11px;color:#666;margin-bottom:4px;">对方气泡 CSS：</div>
                <textarea id="bubbleNpcCssInput" placeholder="background: #ffffff; color: #000; border: 1px solid #eee; border-radius: 6px;" style="width:100%;box-sizing:border-box;min-height:50px;padding:8px;border-radius:6px;border:1px solid #e0e0e0;font-size:11px;font-family:monospace;resize:none;margin-bottom:12px;"></textarea>

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
            userStyle: userCss || 'background: #95ec69; color: #000; border-radius: 6px;',
            npcStyle: npcCss || 'background: #ffffff; color: #000; border: 1px solid #eee; border-radius: 6px;',
            isBuiltin: false
        });

        localStorage.setItem('mcyt_active_decor_bubble', newId);
        document.getElementById('addBubbleModal')?.remove();
        refreshDecorView();
        if (typeof showToast === 'function') showToast('气泡样式已保存并生效');
    };

})();
