/**
 * js/apps/theme/theme-chat-decor.js
 * 💬 微信装扮中心独立模块（原生白灰微绿质感）
 * 职责：
 *  1. 头像框缩略图折叠抽屉与试穿预览模式（极简图标 + / ▲）
 *  2. 导入头像框后自动进入微调舞台（支持 80%~180% 自由缩放及上下左右全向对齐偏移）
 *  3. 头像框独立保存配置（scale, offsetX, offsetY）
 *  4. 🌟 Figma 级可视化气泡工坊：
 *     - 图片自由缩放（Scale: 60% ~ 180%）
 *     - 可视化文字范围框选（手指/鼠标直接在图上拖动、拉大手柄调整文字放置区域）
 *     - 支持文字颜色与横向对齐（居左/居中/居右）
 *     - 点九图自适应与纯 CSS 代码双轨并存
 *  5. 气泡导入导出中枢：支持标准 JSON 一键复制/导出与跨设备无缝导入
 *  6. 全局通用气泡 HTML 渲染器：window.buildDecorBubbleHtml 供单聊与群聊无缝调用
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
            scale: 1.0,
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

    /**
     * 🌟 全局气泡 HTML 核心渲染器（单聊与群聊统一调用）
     * 支持可视化框选气泡、点九图拉伸气泡与纯 CSS 气泡
     */
    window.buildDecorBubbleHtml = function (textHtml, isSelf, bubbleId, customClass = '') {
        const bubbles = window.getStoredDecorBubbles();
        const b = bubbles.find(x => x.id === bubbleId) || bubbles[0] || DEFAULT_BUBBLES[0];
        const scale = (b && b.scale !== undefined) ? b.scale : 1.0;
        const origin = isSelf ? 'top right' : 'top left';

        // 1. 可视化框选/插画画框气泡
        if (b && b.type === 'visual_box' && b.visualConfig) {
            const sideCfg = isSelf ? b.visualConfig.user : b.visualConfig.npc;
            const bgUrl = sideCfg?.url || b.visualConfig.user?.url || '';
            const rect = sideCfg?.rect || { left: 15, top: 15, width: 70, height: 70 };
            const textColor = sideCfg?.color || '#000000';
            const textAlign = sideCfg?.align || 'left';

            if (!bgUrl) {
                return `
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" style="width:fit-content;max-width:100%;padding:8px 12px;border-radius:6px;font-size:14.5px;line-height:1.5;background:${isSelf ? '#95ec69' : '#fff'};color:#000;border:${isSelf ? 'none' : '1px solid #e0e0e0'};">
                        ${textHtml}
                    </div>
                `;
            }

            return `
                <div class="chat-bubble visual-decor-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" 
                     style="position:relative;display:inline-block;max-width:88%;transform:scale(${scale});transform-origin:${origin};user-select:none;-webkit-user-select:none;line-height:0;">
                    <img src="${bgUrl}" style="display:block;width:100%;max-width:280px;height:auto;pointer-events:none;" onerror="this.style.display='none';" />
                    <div style="position:absolute;left:${rect.left}%;top:${rect.top}%;width:${rect.width}%;height:${rect.height}%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${textAlign === 'center' ? 'center' : (textAlign === 'right' ? 'flex-end' : 'flex-start')};overflow:hidden;word-break:break-word;line-height:1.45;font-size:13.5px;color:${textColor};text-align:${textAlign};padding:2px 4px;">
                        <div style="max-height:100%;overflow-y:auto;width:100%;">${textHtml}</div>
                    </div>
                </div>
            `;
        }

        // 2. 点九图自适应拉伸气泡
        if (b && b.type === 'nine_slice') {
            const imgUrl = isSelf ? (b.userBorderImage || b.borderImage) : (b.npcBorderImage || b.borderImage);
            const slice = b.slice || '12 12 12 12';
            const padding = b.padding || '8px 12px';
            return `
                <div class="chat-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" 
                     style="border-style: solid; border-width: 10px; border-image: url('${imgUrl}') ${slice} fill stretch; padding: ${padding}; background: transparent; color: ${isSelf ? '#111' : '#222'}; width:fit-content; max-width:100%; word-break:break-word; font-size:14.5px; line-height:1.5; transform:scale(${scale}); transform-origin:${origin};">
                    ${textHtml}
                </div>
            `;
        }

        // 3. 纯 CSS 代码片段气泡
        const css = isSelf ? (b.userStyle || 'background-color: #95ec69; color: #000;') : (b.npcStyle || 'background-color: #ffffff; color: #000; border: 1px solid #e7e7e7;');
        return `
            <div class="chat-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" 
                 style="width:fit-content;max-width:100%;display:inline-block;padding:8px 12px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:14.5px;line-height:1.5;word-break:break-word;${css};transform:scale(${scale});transform-origin:${origin};">
                ${textHtml}
            </div>
        `;
    };

    // 渲染装扮中心主视图
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

        const demoNpcHtml = window.buildDecorBubbleHtml('你好呀！这是气泡效果试穿～', false, activeBubbleId);
        const demoUserHtml = window.buildDecorBubbleHtml('文字位置与大小都能自由调节哦！', true, activeBubbleId);

        container.innerHTML = `
            <!-- 试穿舞台 -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;">
                <div style="font-size:13.5px;font-weight:600;color:#222;margin-bottom:4px;">效果试穿舞台</div>
                <div style="font-size:11.5px;color:#888;margin-bottom:12px;">实时呈现头像框、头像形状与当前选用的气泡。</div>

                <div style="background:#f2f2f2;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:14px;">
                    <!-- 头像与头像框试穿 -->
                    <div style="display:flex;align-items:center;justify-content:center;gap:12px;">
                        <div style="position:relative;width:54px;height:54px;">
                            <img src="${previewAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:${getShapeBorderRadius(activeShape)};display:block;" onerror="this.src='assets/icons/chat.png';" />
                            ${activeFrame && activeFrame.url ? `
                                <img src="${activeFrame.url}" style="position:absolute;top:50%;left:50%;transform:translate(calc(-50% + ${frameX}px), calc(-50% + ${frameY}px)) scale(${frameScale});width:100%;height:100%;pointer-events:none;" onerror="this.style.display='none'" />
                            ` : ''}
                        </div>
                        <div style="display:flex;flex-direction:column;gap:2px;">
                            <span style="font-size:12.5px;font-weight:600;color:#333;">${activeFrame && activeFrame.url ? escapeHtml(activeFrame.name) : '无头像框'}</span>
                            <span style="font-size:11px;color:#888;">当前气泡：${escapeHtml(activeBubble ? activeBubble.name : '默认')}</span>
                        </div>
                    </div>

                    <!-- 气泡动态效果双向试穿 -->
                    <div style="display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px dashed #e0e0e0;">
                        <div style="display:flex;justify-content:flex-start;">
                            ${demoNpcHtml}
                        </div>
                        <div style="display:flex;justify-content:flex-end;">
                            ${demoUserHtml}
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

            <!-- 气泡样式库（支持可视化框选制作、缩放微调、JSON导入导出） -->
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div>
                        <div style="font-size:13.5px;font-weight:600;color:#222;">气泡样式库</div>
                        <div style="font-size:11.5px;color:#888;">可视化框选文字排版与尺寸自由缩放</div>
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button onclick="window.openImportBubbleModal()" style="padding:4px 8px;font-size:11px;border-radius:6px;border:1px solid #ddd;background:#f9f9f9;color:#333;cursor:pointer;">导入</button>
                        <button onclick="window.openSelectBubbleSourceModal()" style="padding:4px 10px;font-size:11px;border-radius:6px;border:none;background:#07c160;color:#fff;cursor:pointer;font-weight:500;">+ 制作气泡</button>
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
                    ${bubbles.map(b => {
                        const isCur = (b.id === activeBubbleId);
                        const curScale = b.scale !== undefined ? b.scale : 1.0;
                        return `
                            <div onclick="window.selectDecorBubble('${b.id}')" style="background:${isCur ? '#e8f7ed' : '#f9f9f9'};border:1px solid ${isCur ? '#07c160' : '#eee'};border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                                <div style="display:flex;flex-direction:column;gap:2px;max-width:60%;">
                                    <div style="display:flex;align-items:center;gap:6px;">
                                        <span style="font-size:12.5px;font-weight:600;color:#222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(b.name)}</span>
                                        <span style="font-size:9.5px;padding:1px 5px;border-radius:3px;background:${b.type === 'visual_box' ? '#e1f3d8' : '#e9e9eb'};color:${b.type === 'visual_box' ? '#529b2e' : '#606266'};">${b.type === 'visual_box' ? '框选画框' : (b.type === 'nine_slice' ? '点九图' : 'CSS')}</span>
                                    </div>
                                    <span style="font-size:10px;color:#888;">${b.author ? ('作者: ' + escapeHtml(b.author)) : (b.isBuiltin ? '系统预设' : '自定义气泡')} · 缩放 ${Math.round(curScale * 100)}%</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:6px;">
                                    ${b.type === 'visual_box' ? `
                                        <button onclick="event.stopPropagation(); window.openVisualBoxDiyModal('${b.id}')" title="重新框选调节" style="background:none;border:none;color:#576b95;font-size:11px;cursor:pointer;padding:2px 4px;">编辑</button>
                                    ` : ''}
                                    <button onclick="event.stopPropagation(); window.exportSingleBubble('${b.id}')" title="导出气泡分享 JSON" style="background:none;border:none;color:#07c160;font-size:11px;cursor:pointer;padding:2px 4px;">导出</button>
                                    ${!b.isBuiltin ? `
                                        <button onclick="event.stopPropagation(); window.deleteDecorBubble('${b.id}')" title="删除气泡" style="background:none;border:none;color:#fa5151;font-size:11px;cursor:pointer;padding:2px 4px;">删除</button>
                                    ` : ''}
                                    <span style="font-size:11px;color:${isCur ? '#07c160' : '#999'};font-weight:${isCur ? '600' : 'normal'};min-width:36px;text-align:right;">
                                        ${isCur ? '使用中' : '选用'}
                                    </span>
                                </div>
                            </div>
                        `;
                    }).join('')}
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

    // 试穿与选用
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
        if (typeof showToast === 'function') showToast('气泡已应用');
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

    // 头像框添加弹窗
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
            if (typeof showToast === 'function') showToast('头像框已保存并生效');
        };
    };

    // ==========================================
    // 🎨 选取气泡底图来源（相册 / URL）
    // ==========================================
    window.openSelectBubbleSourceModal = function () {
        let modal = document.getElementById('bubbleSourceModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bubbleSourceModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:300px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="font-size:14px;font-weight:600;color:#222;margin-bottom:12px;">制作新气泡</div>
                
                <input type="file" id="bubbleSourceFileInput" accept="image/*" style="display:none;" onchange="window.handleBubbleSourceLocalUpload(event)">
                
                <button onclick="document.getElementById('bubbleSourceFileInput').click()" style="width:100%;padding:11px;background:#07c160;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:6px;">
                    <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:#fff;stroke-width:2;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <span>从手机相册选取图片</span>
                </button>

                <div style="display:flex;align-items:center;margin:10px 0;gap:8px;">
                    <div style="flex:1;height:1px;background:#eee;"></div>
                    <span style="font-size:11px;color:#aaa;">或输入图片链接</span>
                    <div style="flex:1;height:1px;background:#eee;"></div>
                </div>

                <input type="text" id="bubbleSourceUrlInput" placeholder="https://..." style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12px;outline:none;margin-bottom:12px;">

                <div style="display:flex;gap:8px;">
                    <button style="flex:1;padding:8px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;" onclick="document.getElementById('bubbleSourceModal').remove()">取消</button>
                    <button style="flex:1;padding:8px;background:#181818;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:500;cursor:pointer;" onclick="window.confirmBubbleSourceUrl()">开始框选</button>
                </div>
            </div>
        `;
    };

    window.confirmBubbleSourceUrl = function () {
        const url = (document.getElementById('bubbleSourceUrlInput')?.value || '').trim();
        if (!url) {
            if (typeof showToast === 'function') showToast('请填写有效的图片链接');
            return;
        }
        document.getElementById('bubbleSourceModal')?.remove();
        window.openVisualBoxDiyModal(null, url, '我的插画气泡');
    };

    window.handleBubbleSourceLocalUpload = function (event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            const rawData = e.target.result;
            const defaultName = file.name.replace(/\.[^/.]+$/, "");
            document.getElementById('bubbleSourceModal')?.remove();
            window.openVisualBoxDiyModal(null, rawData, defaultName);
        };
        reader.readAsDataURL(file);
    };

    // =========================================================================
    // 🌟 核心：Figma 级可视化框选 DIY 制作舞台（手指/鼠标自由拖动，无脑框选）
    // =========================================================================
    window.openVisualBoxDiyModal = function (bubbleId = null, initialUrl = '', initialName = '') {
        let bubbleObj = null;
        if (bubbleId) {
            const list = window.getStoredDecorBubbles();
            bubbleObj = list.find(x => x.id === bubbleId);
        }

        const state = {
            id: bubbleObj ? bubbleObj.id : ('bubble_' + Date.now()),
            name: bubbleObj ? bubbleObj.name : (initialName || '自定义插画气泡'),
            author: bubbleObj ? (bubbleObj.author || '') : '玩家自制',
            scale: (bubbleObj && bubbleObj.scale !== undefined) ? bubbleObj.scale : 1.0,
            activeSide: 'user', // 'user' | 'npc'
            user: {
                url: bubbleObj?.visualConfig?.user?.url || initialUrl || '',
                rect: bubbleObj?.visualConfig?.user?.rect || { left: 20, top: 20, width: 60, height: 60 },
                color: bubbleObj?.visualConfig?.user?.color || '#000000',
                align: bubbleObj?.visualConfig?.user?.align || 'left'
            },
            npc: {
                url: bubbleObj?.visualConfig?.npc?.url || initialUrl || '',
                rect: bubbleObj?.visualConfig?.npc?.rect || { left: 20, top: 20, width: 60, height: 60 },
                color: bubbleObj?.visualConfig?.npc?.color || '#000000',
                align: bubbleObj?.visualConfig?.npc?.align || 'left'
            }
        };

        let modal = document.getElementById('visualBoxDiyModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'visualBoxDiyModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:100000;padding:12px;box-sizing:border-box;';
            document.body.appendChild(modal);
        }

        function renderStage() {
            const curSide = state.activeSide;
            const curCfg = state[curSide];

            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:350px;max-height:92vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;-webkit-overflow-scrolling:touch;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <span style="font-size:14px;font-weight:600;color:#222;">可视化气泡框选工坊</span>
                        <button onclick="document.getElementById('visualBoxDiyModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                    </div>

                    <!-- 顶部说明提示 -->
                    <div style="font-size:11px;color:#666;background:#f6f8fa;padding:8px 10px;border-radius:6px;margin-bottom:10px;line-height:1.4;">
                        💡 <b>直接在图上拖拽绿色半透明框</b>，把它放到放文字的区域（如大圆圈中）；拉动右下角把手改变框大小！
                    </div>

                    <!-- 角色端切换 -->
                    <div style="display:flex;gap:6px;margin-bottom:10px;">
                        <button id="btnTabUser" style="flex:1;padding:6px;border-radius:6px;font-size:11.5px;cursor:pointer;border:1px solid ${curSide === 'user' ? '#07c160' : '#e0e0e0'};background:${curSide === 'user' ? '#e8f7ed' : '#fff'};color:${curSide === 'user' ? '#07c160' : '#333'};font-weight:${curSide === 'user' ? '600' : 'normal'};">我方气泡设置</button>
                        <button id="btnTabNpc" style="flex:1;padding:6px;border-radius:6px;font-size:11.5px;cursor:pointer;border:1px solid ${curSide === 'npc' ? '#07c160' : '#e0e0e0'};background:${curSide === 'npc' ? '#e8f7ed' : '#fff'};color:${curSide === 'npc' ? '#07c160' : '#333'};font-weight:${curSide === 'npc' ? '600' : 'normal'};">对方气泡设置</button>
                    </div>

                    <!-- 🌟 核心可视化拖拽舞台 Canvas / Stage -->
                    <div id="visualBoxStageContainer" style="position:relative;width:100%;background:#ebebeb;border-radius:10px;overflow:hidden;margin-bottom:12px;display:flex;align-items:center;justify-content:center;min-height:200px;user-select:none;-webkit-user-select:none;touch-action:none;">
                        <img id="stageBubbleImg" src="${curCfg.url}" style="width:100%;max-width:280px;height:auto;display:block;pointer-events:none;" onerror="this.style.display='none';" />
                        
                        <!-- 可拖拽绿框 -->
                        <div id="visualDragBox" style="position:absolute;left:${curCfg.rect.left}%;top:${curCfg.rect.top}%;width:${curCfg.rect.width}%;height:${curCfg.rect.height}%;background:rgba(7, 193, 96, 0.22);border:2px dashed #07c160;border-radius:6px;cursor:move;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${curCfg.align === 'center' ? 'center' : (curCfg.align === 'right' ? 'flex-end' : 'flex-start')};padding:4px;overflow:hidden;touch-action:none;">
                            <span id="visualDemoText" style="font-size:12px;color:${curCfg.color};line-height:1.3;pointer-events:none;word-break:break-word;text-align:${curCfg.align};">对白示例文本在这里～</span>
                            
                            <!-- 右下角缩放拉动手柄 -->
                            <div id="visualResizeHandle" style="position:absolute;right:-1px;bottom:-1px;width:18px;height:18px;background:#07c160;border-radius:4px 0 4px 0;cursor:se-resize;display:flex;align-items:center;justify-content:center;touch-action:none;">
                                <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:#fff;stroke-width:3;"><line x1="20" y1="4" x2="4" y2="20"></line><line x1="20" y1="12" x2="12" y2="20"></line></svg>
                            </div>
                        </div>
                    </div>

                    <!-- 基础属性与气泡缩放 -->
                    <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:10px;">
                        <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                            <span>气泡尺寸缩放</span>
                            <span style="color:#07c160;font-weight:600;" id="visualScaleValText">${Math.round(state.scale * 100)}%</span>
                        </div>
                        <input type="range" id="visualScaleSlider" min="60" max="180" value="${Math.round(state.scale * 100)}" style="width:100%;accent-color:#07c160;margin-bottom:8px;">

                        <div style="display:flex;align-items:center;justify-content:space-between;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:11px;color:#555;">文字颜色:</span>
                                <input type="color" id="visualColorInput" value="${curCfg.color}" style="width:24px;height:24px;border:none;padding:0;background:none;cursor:pointer;">
                            </div>
                            <div style="display:flex;align-items:center;gap:4px;">
                                <span style="font-size:11px;color:#555;">对齐:</span>
                                <button id="btnAlignLeft" style="padding:3px 7px;font-size:10.5px;border-radius:4px;border:1px solid #ddd;background:${curCfg.align === 'left' ? '#07c160' : '#fff'};color:${curCfg.align === 'left' ? '#fff' : '#333'};cursor:pointer;">左</button>
                                <button id="btnAlignCenter" style="padding:3px 7px;font-size:10.5px;border-radius:4px;border:1px solid #ddd;background:${curCfg.align === 'center' ? '#07c160' : '#fff'};color:${curCfg.align === 'center' ? '#fff' : '#333'};cursor:pointer;">中</button>
                                <button id="btnAlignRight" style="padding:3px 7px;font-size:10.5px;border-radius:4px;border:1px solid #ddd;background:${curCfg.align === 'right' ? '#07c160' : '#fff'};color:${curCfg.align === 'right' ? '#fff' : '#333'};cursor:pointer;">右</button>
                            </div>
                        </div>
                    </div>

                    <!-- 气泡名称 -->
                    <div style="display:flex;gap:8px;margin-bottom:12px;">
                        <input type="text" id="visualNameInput" value="${escapeHtml(state.name)}" placeholder="气泡备注名称" style="flex:2;padding:7px 10px;border-radius:6px;border:1px solid #ddd;font-size:12px;outline:none;">
                        <input type="text" id="visualAuthorInput" value="${escapeHtml(state.author)}" placeholder="作者名" style="flex:1.2;padding:7px 10px;border-radius:6px;border:1px solid #ddd;font-size:12px;outline:none;">
                    </div>

                    <!-- 保存与应用 -->
                    <div style="display:flex;gap:8px;">
                        <button onclick="document.getElementById('visualBoxDiyModal').remove()" style="flex:1;padding:9px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12.5px;color:#555;cursor:pointer;">取消</button>
                        <button id="btnSaveVisualBubble" style="flex:1.4;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:12.5px;color:#fff;font-weight:600;cursor:pointer;">保存并选用气泡</button>
                    </div>
                </div>
            `;

            // 事件绑定
            modal.querySelector('#btnTabUser').onclick = () => { state.activeSide = 'user'; renderStage(); };
            modal.querySelector('#btnTabNpc').onclick = () => { state.activeSide = 'npc'; renderStage(); };

            const scaleSlider = modal.querySelector('#visualScaleSlider');
            scaleSlider.oninput = (e) => {
                state.scale = parseFloat(e.target.value) / 100;
                modal.querySelector('#visualScaleValText').textContent = `${Math.round(state.scale * 100)}%`;
            };

            modal.querySelector('#visualColorInput').oninput = (e) => {
                state[state.activeSide].color = e.target.value;
                modal.querySelector('#visualDemoText').style.color = e.target.value;
            };

            modal.querySelector('#btnAlignLeft').onclick = () => { state[state.activeSide].align = 'left'; renderStage(); };
            modal.querySelector('#btnAlignCenter').onclick = () => { state[state.activeSide].align = 'center'; renderStage(); };
            modal.querySelector('#btnAlignRight').onclick = () => { state[state.activeSide].align = 'right'; renderStage(); };

            modal.querySelector('#visualNameInput').oninput = (e) => { state.name = e.target.value; };
            modal.querySelector('#visualAuthorInput').oninput = (e) => { state.author = e.target.value; };

            // 🌟 实现移动端与鼠标通用的框选拖拽/缩放
            bindVisualBoxInteraction(modal, state);

            modal.querySelector('#btnSaveVisualBubble').onclick = () => {
                const finalName = state.name.trim() || '自定义插画气泡';
                const finalAuthor = state.author.trim() || '玩家自制';

                const itemToSave = {
                    id: state.id,
                    name: finalName,
                    author: finalAuthor,
                    type: 'visual_box',
                    scale: state.scale,
                    visualConfig: {
                        user: { ...state.user },
                        npc: { ...state.npc }
                    },
                    isBuiltin: false
                };

                saveCustomBubble(itemToSave);
                localStorage.setItem('mcyt_active_decor_bubble', itemToSave.id);

                modal.remove();
                refreshDecorView();
                if (typeof showToast === 'function') showToast('气泡已成功制作并应用！');
            };
        }

        function bindVisualBoxInteraction(modalRoot, st) {
            const container = modalRoot.querySelector('#visualBoxStageContainer');
            const box = modalRoot.querySelector('#visualDragBox');
            const handle = modalRoot.querySelector('#visualResizeHandle');
            if (!container || !box || !handle) return;

            let isDragging = false;
            let isResizing = false;
            let startX = 0, startY = 0;
            let initialRect = { ...st[st.activeSide].rect };

            const getEventPos = (e) => {
                if (e.touches && e.touches[0]) {
                    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }
                return { x: e.clientX, y: e.clientY };
            };

            // 拖拽整个选框
            const onDragStart = (e) => {
                if (e.target === handle || handle.contains(e.target)) return;
                isDragging = true;
                const pos = getEventPos(e);
                startX = pos.x;
                startY = pos.y;
                initialRect = { ...st[st.activeSide].rect };
                e.preventDefault();
            };

            // 拖拽手柄拉大拉小
            const onResizeStart = (e) => {
                isResizing = true;
                const pos = getEventPos(e);
                startX = pos.x;
                startY = pos.y;
                initialRect = { ...st[st.activeSide].rect };
                e.stopPropagation();
                e.preventDefault();
            };

            const onMove = (e) => {
                if (!isDragging && !isResizing) return;
                const pos = getEventPos(e);
                const dx = pos.x - startX;
                const dy = pos.y - startY;

                const contRect = container.getBoundingClientRect();
                const contW = contRect.width || 1;
                const contH = contRect.height || 1;

                const dxPercent = (dx / contW) * 100;
                const dyPercent = (dy / contH) * 100;

                if (isDragging) {
                    let nextLeft = Math.max(0, Math.min(100 - initialRect.width, initialRect.left + dxPercent));
                    let nextTop = Math.max(0, Math.min(100 - initialRect.height, initialRect.top + dyPercent));
                    st[st.activeSide].rect.left = Math.round(nextLeft);
                    st[st.activeSide].rect.top = Math.round(nextTop);

                    box.style.left = `${st[st.activeSide].rect.left}%`;
                    box.style.top = `${st[st.activeSide].rect.top}%`;
                } else if (isResizing) {
                    let nextW = Math.max(15, Math.min(100 - initialRect.left, initialRect.width + dxPercent));
                    let nextH = Math.max(15, Math.min(100 - initialRect.top, initialRect.height + dyPercent));
                    st[st.activeSide].rect.width = Math.round(nextW);
                    st[st.activeSide].rect.height = Math.round(nextH);

                    box.style.width = `${st[st.activeSide].rect.width}%`;
                    box.style.height = `${st[st.activeSide].rect.height}%`;
                }
            };

            const onEnd = () => {
                isDragging = false;
                isResizing = false;
            };

            box.addEventListener('mousedown', onDragStart);
            box.addEventListener('touchstart', onDragStart, { passive: false });

            handle.addEventListener('mousedown', onResizeStart);
            handle.addEventListener('touchstart', onResizeStart, { passive: false });

            window.addEventListener('mousemove', onMove);
            window.addEventListener('touchmove', onMove, { passive: false });

            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchend', onEnd);
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
            format: 'mcyt_chat_bubble_v2',
            version: '2.0',
            exportedAt: Date.now(),
            bubble: {
                id: 'bubble_shared_' + Date.now(),
                name: b.name,
                author: b.author || '网络创作者',
                type: b.type || 'visual_box',
                scale: b.scale !== undefined ? b.scale : 1.0,
                visualConfig: b.visualConfig || null,
                userStyle: b.userStyle || '',
                npcStyle: b.npcStyle || '',
                slice: b.slice || '',
                padding: b.padding || ''
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
                <div style="font-size:11px;color:#888;margin-bottom:10px;">复制下方 JSON 代码分享，或者保存为 .json 文件。</div>

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
                    if (typeof showToast === 'function') showToast('已保存气泡文件');
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
                <div style="font-size:11px;color:#888;margin-bottom:10px;">粘贴分享的 JSON 文本或者选取 .json 文件导入。</div>

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
            const file = e.target.files && event.target.files[0];
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

                if (!bubbleObj.name || (!bubbleObj.userStyle && !bubbleObj.npcStyle && !bubbleObj.visualConfig)) {
                    throw new Error('格式不符合气泡协议');
                }

                const newId = 'bubble_' + Date.now();
                const itemToSave = {
                    id: newId,
                    name: bubbleObj.name || '导入的气泡',
                    author: bubbleObj.author || '分享者',
                    type: bubbleObj.type || (bubbleObj.visualConfig ? 'visual_box' : 'css'),
                    scale: bubbleObj.scale !== undefined ? bubbleObj.scale : 1.0,
                    visualConfig: bubbleObj.visualConfig || null,
                    userStyle: bubbleObj.userStyle || '',
                    npcStyle: bubbleObj.npcStyle || '',
                    slice: bubbleObj.slice || '',
                    padding: bubbleObj.padding || '',
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

})();
