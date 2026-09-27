/**
 * js/apps/theme/theme-chat-bubble.js
 * 微信装扮中心模块（超级气泡工坊独立中枢）
 * 
 * 核心功能：
 *  1. 专业 8 点手柄自由拉伸变形系统（上3点、下3点、左右各1中点，26px 大热区防误触）
 *  2. 第二阶段：文字 8 点框作为核心排版安全区域，彻底解决九图保护装饰大角色导致的虚大留白问题
 *  3. 第三阶段：1:1 复刻真实微信单聊与试穿舞台，尺寸与第二阶段共通，位置独立拖拽，100% 真实落盘
 *  4. Canvas 物理像素级底图水平翻转，双轨存入 IndexedDB（mcyt_decor_bubbles）
 *  5. 主题级正等边三角 HSV 动态色轮拾色修复，支持角色与我方文字双轨独立调色
 *  6. 导出支持 WebView 标准 Base64 DataURL（修复 bad base-64 异常），穿透保存至 Download 文件夹
 *  7. 气泡功能支持直接粘贴图片/HTML/CSS链接极速保存
 *  8. 补齐独立的 openBubbleFontModal 弹窗，操作栏全面升级为极简轻量 SVG 图标
 *  9. AI 气泡中枢解耦路由至独立的 js/apps/theme/theme-bubble-ai.js（支持视觉仿图与专家级拟真系统提示词）
 */

(function () {
    'use strict';

    // 默认内置气泡预设
    const DEFAULT_BUBBLES = [
        {
            id: 'bubble_default',
            name: '原生微信白灰微绿',
            type: 'css',
            userStyle: 'background-color: #95ec69; color: #000000; border-radius: 6px;',
            npcStyle: 'background-color: #ffffff; color: #000000; border-radius: 6px; border: 1px solid #e7e7e7;',
            scale: 1.0,
            fontSize: 14.5,
            textAlign: 'left',
            fontFamily: '',
            userOffsetX: 0,
            userOffsetY: 0,
            npcOffsetX: 0,
            npcOffsetY: 0,
            boxWidth: 0,
            boxHeight: 0,
            userTextColor: '#000000',
            npcTextColor: '#000000',
            isBuiltin: true
        }
    ];

    window._decorBubblesCache = [...DEFAULT_BUBBLES];
    let _bubblesLoadedPromise = null;

    /**
     * 辅助：获取形状圆角
     */
    function getShapeBorderRadius(shape) {
        if (shape === 'circle') return '50%';
        if (shape === 'squircle') return '8px';
        if (shape === 'square') return '2px';
        return '50%';
    }

    /**
     * 异步预装载气泡（IndexedDB 绝对优先）
     */
    window.loadStoredDecorBubblesAsync = function () {
        if (_bubblesLoadedPromise) return _bubblesLoadedPromise;

        _bubblesLoadedPromise = (async () => {
            try {
                let list = null;
                if (window.localforage) {
                    list = await window.localforage.getItem('mcyt_decor_bubbles');
                }
                if (!list) {
                    const legacy = localStorage.getItem('mcyt_decor_bubbles');
                    if (legacy) {
                        try {
                            list = JSON.parse(legacy);
                            if (window.localforage) {
                                await window.localforage.setItem('mcyt_decor_bubbles', list);
                            }
                        } catch (_) {}
                    }
                }
                if (Array.isArray(list)) {
                    window._decorBubblesCache = [...DEFAULT_BUBBLES, ...list.filter(x => x.id !== 'bubble_default')];
                }
            } catch (err) {
                console.warn('[Bubble] 读取气泡数据库异常，降级使用默认预设:', err);
            }
            return window._decorBubblesCache;
        })();

        return _bubblesLoadedPromise;
    };

    window.getStoredDecorBubbles = function () {
        return window._decorBubblesCache && window._decorBubblesCache.length > 0
            ? window._decorBubblesCache
            : DEFAULT_BUBBLES;
    };

    /**
     * 持久化保存气泡配置（IndexedDB 扩容保障）
     */
    window.saveCustomBubbleAsync = async function (item) {
        try {
            let list = window.getStoredDecorBubbles().filter(x => !x.isBuiltin && x.id !== item.id);
            list.push(item);
            window._decorBubblesCache = [...DEFAULT_BUBBLES, ...list];
            if (window.localforage) {
                await window.localforage.setItem('mcyt_decor_bubbles', list);
            }
            try {
                localStorage.setItem('mcyt_decor_bubbles_meta_backup', JSON.stringify(list.map(b => ({ id: b.id, name: b.name }))));
            } catch (_) {}
            return true;
        } catch (err) {
            console.error('[Bubble] 保存气泡至 IndexedDB 异常:', err);
            if (typeof showToast === 'function') showToast('保存失败：存储异常');
            return false;
        }
    };

    /**
     * Canvas 真实像素级水平翻转底图
     */
    function flipImageHorizontallyAsync(base64OrUrl) {
        return new Promise((resolve) => {
            if (!base64OrUrl) return resolve('');
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function () {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.translate(canvas.width, 0);
                    ctx.scale(-1, 1);
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } catch (e) {
                    console.warn('[Bubble] Canvas 镜像异常，沿用原图:', e);
                    resolve(base64OrUrl);
                }
            };
            img.onerror = () => resolve(base64OrUrl);
            img.src = base64OrUrl;
        });
    }

    /**
     * 全局气泡 HTML 核心渲染器
     */
    window.buildDecorBubbleHtml = function (textHtml, isSelf, bubbleId, customClass = '') {
        const bubbles = window.getStoredDecorBubbles();
        const b = bubbles.find(x => x.id === bubbleId) || bubbles[0] || DEFAULT_BUBBLES[0];
        const scale = (b && b.scale !== undefined) ? b.scale : 1.0;
        const fontSize = (b && b.fontSize) ? b.fontSize : 14.5;
        const fontFamilyCss = (b && b.fontFamily) ? `font-family: ${b.fontFamily};` : '';
        const textAlign = b.textAlign || (isSelf ? b.visualConfig?.user?.align : b.visualConfig?.npc?.align) || 'left';

        const offX = isSelf ? (b.userOffsetX || 0) : (b.npcOffsetX || 0);
        const offY = isSelf ? (b.userOffsetY || 0) : (b.npcOffsetY || 0);
        const origin = isSelf ? 'center right' : 'center left';

        // 1. 画框气泡
        if (b && b.type === 'visual_box' && b.visualConfig) {
            const sideCfg = isSelf ? b.visualConfig.user : (b.visualConfig.npc || b.visualConfig.user);
            const bgUrl = sideCfg?.url || b.visualConfig.user?.url || '';
            let rect = sideCfg?.rect || { left: 15, top: 15, width: 70, height: 70 };
            const textColor = sideCfg?.color || (isSelf ? (b.userTextColor || '#000') : (b.npcTextColor || '#000'));
            const curAlign = sideCfg?.align || textAlign;

            if (!bgUrl) {
                return `
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" style="width:fit-content;max-width:100%;padding:8px 12px;border-radius:6px;font-size:${fontSize}px;${fontFamilyCss}line-height:1.5;background:${isSelf ? '#95ec69' : '#fff'};color:#000;border:${isSelf ? 'none' : '1px solid #e0e0e0'};text-align:${curAlign};">
                        ${textHtml}
                    </div>
                `;
            }

            return `
                <div class="chat-bubble visual-decor-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" 
                     style="position:relative;display:inline-block;max-width:88%;transform:translate(${offX}px, ${offY}px) scale(${scale});transform-origin:${origin};user-select:none;-webkit-user-select:none;line-height:0;${fontFamilyCss}">
                    <img src="${bgUrl}" style="display:block;width:100%;max-width:280px;height:auto;pointer-events:none;" onerror="this.style.display='none';" />
                    <div style="position:absolute;left:${rect.left}%;top:${rect.top}%;width:${rect.width}%;height:${rect.height}%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${curAlign === 'center' ? 'center' : (curAlign === 'right' ? 'flex-end' : 'flex-start')};overflow:hidden;word-break:break-word;line-height:1.45;font-size:${fontSize}px;color:${textColor};text-align:${curAlign};padding:2px 4px;">
                        <div style="max-height:100%;overflow-y:auto;width:100%;">${textHtml}</div>
                    </div>
                </div>
            `;
        }

        // 2. 点九图自适应拉伸气泡
        if (b && b.type === 'nine_slice') {
            const imgUrl = isSelf ? (b.userBorderImage || b.borderImage) : (b.npcBorderImage || b.userBorderImage || b.borderImage);
            const slice = isSelf ? (b.userSlice || b.slice || '30% 30% 30% 30%') : (b.npcSlice || b.userSlice || b.slice || '30% 30% 30% 30%');
            const padding = isSelf ? (b.userPadding || b.padding || '8px 12px') : (b.npcPadding || b.padding || '8px 12px');
            const borderWidth = isSelf ? (b.userBorderWidth || b.borderWidth || 14) : (b.npcBorderWidth || b.borderWidth || 14);
            const textColor = isSelf ? (b.userTextColor || b.textColor || '#111111') : (b.npcTextColor || b.textColor || '#222222');

            const textWrapStyle = (b.textBoxWidth && b.textBoxWidth > 60) 
                ? `max-width: ${Math.min(b.textBoxWidth + 40, 260)}px;` 
                : 'max-width: 86%;';

            if (!imgUrl) {
                return `
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" style="width:fit-content;max-width:100%;padding:8px 12px;border-radius:6px;font-size:${fontSize}px;${fontFamilyCss}line-height:1.5;background:${isSelf ? '#95ec69' : '#fff'};color:#000;border:${isSelf ? 'none' : '1px solid #e0e0e0'};text-align:${textAlign};">
                        ${textHtml}
                    </div>
                `;
            }

            return `
                <div class="chat-bubble nine-slice-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" 
                     style="position:relative;display:inline-flex;align-items:center;border-style:solid;border-width:${borderWidth}px;border-image:url('${imgUrl}') ${slice} fill stretch;-webkit-border-image:url('${imgUrl}') ${slice} fill stretch;padding:${padding};background:transparent;color:${textColor};width:fit-content;${textWrapStyle}box-sizing:border-box;word-break:break-word;font-size:${fontSize}px;${fontFamilyCss}line-height:1.45;transform:translate(${offX}px, ${offY}px) scale(${scale});transform-origin:${origin};">
                    <div style="width:100%;text-align:${textAlign};">${textHtml}</div>
                </div>
            `;
        }

        // 3. 纯 CSS 气泡
        const css = isSelf 
            ? (b.userStyle || 'background-color: #95ec69; color: #000;') 
            : (b.npcStyle || 'background-color: #ffffff; color: #000; border: 1px solid #e7e7e7;');
        const txtColor = isSelf ? (b.userTextColor || '#000') : (b.npcTextColor || '#000');

        return `
            <div class="chat-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" 
                 style="width:fit-content;max-width:86%;display:inline-block;padding:8px 12px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:${fontSize}px;${fontFamilyCss}line-height:1.5;word-break:break-word;text-align:${textAlign};color:${txtColor};${css};transform:translate(${offX}px, ${offY}px) scale(${scale});transform-origin:${origin};">
                ${textHtml}
            </div>
        `;
    };

    /**
     * 辅助：在工坊试穿中渲染带头像框的真实头像
     */
    function renderWorkshopStageAvatar(avatarUrl, shape, frameObj, size = 38) {
        const rad = getShapeBorderRadius(shape);
        const fUrl = frameObj ? (frameObj.url || '') : '';
        const fScale = (frameObj && frameObj.scale !== undefined) ? frameObj.scale : 1.18;
        const fX = (frameObj && frameObj.offsetX !== undefined) ? frameObj.offsetX : 0;
        const fY = (frameObj && frameObj.offsetY !== undefined) ? frameObj.offsetY : 0;

        return `
            <div style="position:relative;width:${size}px;height:${size}px;flex-shrink:0;">
                <img src="${avatarUrl || 'assets/icons/chat.png'}" style="width:100%;height:100%;object-fit:cover;border-radius:${rad};display:block;" onerror="this.src='assets/icons/chat.png';" />
                ${fUrl ? `
                    <img src="${fUrl}" style="position:absolute;top:50%;left:50%;transform:translate(calc(-50% + ${fX}px), calc(-50% + ${fY}px)) scale(${fScale});width:100%;height:100%;pointer-events:none;" onerror="this.style.display='none';" />
                ` : ''}
            </div>
        `;
    }

    /**
     * 渲染气泡样式库独立列表（极简轻量 SVG 图标）
     */
    window.renderChatBubbleSection = function (container) {
        if (!container) return;

        const activeBubbleId = localStorage.getItem('mcyt_active_decor_bubble') || 'bubble_default';
        const bubbles = window.getStoredDecorBubbles();

        const editSvg = `<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#576b95;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
        const fontSvg = `<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#576b95;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`;
        const exportSvg = `<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#07c160;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
        const deleteSvg = `<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#fa5151;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

        container.innerHTML = `
            <div style="background:#ffffff;border-radius:12px;border:1px solid #eeeeee;padding:14px;">
                <div onclick="window.toggleDecorBubblesCollapse()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                    <div>
                        <div style="font-size:13.5px;font-weight:600;color:#222;">气泡样式库</div>
                        <div style="font-size:11.5px;color:#888;">点九图自适应拉伸、画框框选与AI定制</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <button onclick="event.stopPropagation(); window.openBubbleActionMenu();" title="新建与导入气泡" style="width:26px;height:26px;border-radius:50%;border:none;background:#07c160;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
                            <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:#fff;stroke-width:2.5;stroke-linecap:round;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="12" y2="12"></line></svg>
                        </button>
                        <span id="decorBubblesCollapseArrow" style="font-size:11px;color:#888;user-select:none;transition:transform 0.2s ease;">▼</span>
                    </div>
                </div>

                <div id="decorBubblesBody" style="display:none;margin-top:12px;">
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${bubbles.map(b => {
                            const isCur = (b.id === activeBubbleId);
                            const curScale = b.scale !== undefined ? b.scale : 1.0;
                            const curFont = b.fontSize || 14.5;
                            return `
                                <div onclick="window.selectDecorBubble('${b.id}')" style="background:${isCur ? '#e8f7ed' : '#f9f9f9'};border:1px solid ${isCur ? '#07c160' : '#eee'};border-radius:8px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;gap:6px;">
                                    <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;">
                                        <div style="display:flex;align-items:center;gap:5px;">
                                            <span style="font-size:12.5px;font-weight:600;color:#222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px;">${escapeHtml(b.name)}</span>
                                            <span style="font-size:9.5px;padding:1px 4px;border-radius:3px;background:${b.type === 'visual_box' ? '#e1f3d8' : (b.type === 'nine_slice' ? '#e8f4ff' : '#f0f0f0')};color:${b.type === 'visual_box' ? '#529b2e' : (b.type === 'nine_slice' ? '#2b73af' : '#666')};flex-shrink:0;">
                                                ${b.type === 'visual_box' ? '画框' : (b.type === 'nine_slice' ? '点九' : 'CSS')}
                                            </span>
                                            ${b.mirrorNpcFromUser ? `<span style="font-size:9px;padding:1px 3px;border-radius:2px;background:#fdf6ec;color:#e6a23c;flex-shrink:0;">镜像</span>` : ''}
                                        </div>
                                        <span style="font-size:10px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">缩放${Math.round(curScale * 100)}% · ${curFont}px ${b.author ? ('· ' + escapeHtml(b.author)) : ''}</span>
                                    </div>

                                    <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                                        ${b.type === 'visual_box' ? `
                                            <button onclick="event.stopPropagation(); window.openVisualBoxDiyModal('${b.id}')" title="编辑气泡" style="background:#fff;border:1px solid #e0e0e0;border-radius:5px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">${editSvg}</button>
                                        ` : ''}
                                        ${b.type === 'nine_slice' ? `
                                            <button onclick="event.stopPropagation(); window.openNineSliceDiyModal('${b.id}')" title="编辑气泡" style="background:#fff;border:1px solid #e0e0e0;border-radius:5px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">${editSvg}</button>
                                        ` : ''}
                                        <button onclick="event.stopPropagation(); window.openBubbleFontModal('${b.id}')" title="设置字体与文字" style="background:#fff;border:1px solid #e0e0e0;border-radius:5px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">${fontSvg}</button>
                                        <button onclick="event.stopPropagation(); window.exportSingleBubble('${b.id}')" title="导出气泡文件" style="background:#fff;border:1px solid #e0e0e0;border-radius:5px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">${exportSvg}</button>
                                        ${!b.isBuiltin ? `
                                            <button onclick="event.stopPropagation(); window.deleteDecorBubble('${b.id}')" title="删除气泡" style="background:#fff;border:1px solid #fcdcdc;border-radius:5px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">${deleteSvg}</button>
                                        ` : ''}
                                        <div style="width:1px;height:14px;background:#ddd;margin:0 2px;"></div>
                                        <span style="font-size:11px;color:${isCur ? '#07c160' : '#888'};font-weight:${isCur ? '600' : 'normal'};padding:0 2px;">
                                            ${isCur ? '使用中' : '选用'}
                                        </span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    };

    /**
     * 气泡字体与文字排版独立配置弹窗
     */
    window.openBubbleFontModal = function (bubbleId) {
        const bubbles = window.getStoredDecorBubbles();
        const b = bubbles.find(x => x.id === bubbleId);
        if (!b) return;

        let modal = document.getElementById('bubbleFontSettingModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bubbleFontSettingModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;padding:20px;';
            document.body.appendChild(modal);
        }

        const curFontFamily = b.fontFamily || '';
        const curFontSize = b.fontSize || 14.5;
        const curAlign = b.textAlign || 'left';

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:320px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);box-sizing:border-box;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <span style="font-size:14px;font-weight:600;color:#222;">气泡字体与排版</span>
                    <button onclick="document.getElementById('bubbleFontSettingModal').remove()" style="background:none;border:none;color:#999;font-size:16px;cursor:pointer;">✕</button>
                </div>

                <div style="margin-bottom:10px;">
                    <div style="font-size:11px;color:#777;margin-bottom:4px;">自定义字体 (Font-Family)</div>
                    <input type="text" id="bubbleFontFamilyInput" value="${escapeHtml(curFontFamily)}" placeholder="如：PingFang SC, 'Microsoft YaHei', sans-serif" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #ddd;font-size:12px;outline:none;">
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                    <span style="font-size:12px;color:#333;font-weight:600;">基准字号大小</span>
                    <div style="display:flex;align-items:center;gap:4px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;padding:2px 6px;">
                        <input type="number" id="bubbleFontSizeNum" value="${curFontSize}" min="9" max="36" step="0.5" style="width:44px;border:none;background:transparent;font-size:12px;font-weight:700;color:#07c160;text-align:center;outline:none;">
                        <span style="font-size:11px;color:#888;">px</span>
                    </div>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                    <span style="font-size:12px;color:#333;font-weight:600;">文本默认对齐</span>
                    <div style="display:flex;gap:4px;">
                        <button type="button" class="btn-font-align" data-align="left" style="padding:4px 8px;border-radius:5px;font-size:11px;cursor:pointer;border:1px solid ${curAlign === 'left' ? '#07c160' : '#ddd'};background:${curAlign === 'left' ? '#e8f7ed' : '#fff'};color:${curAlign === 'left' ? '#07c160' : '#333'};">靠左</button>
                        <button type="button" class="btn-font-align" data-align="center" style="padding:4px 8px;border-radius:5px;font-size:11px;cursor:pointer;border:1px solid ${curAlign === 'center' ? '#07c160' : '#ddd'};background:${curAlign === 'center' ? '#e8f7ed' : '#fff'};color:${curAlign === 'center' ? '#07c160' : '#333'};">居中</button>
                        <button type="button" class="btn-font-align" data-align="right" style="padding:4px 8px;border-radius:5px;font-size:11px;cursor:pointer;border:1px solid ${curAlign === 'right' ? '#07c160' : '#ddd'};background:${curAlign === 'right' ? '#e8f7ed' : '#fff'};color:${curAlign === 'right' ? '#07c160' : '#333'};">靠右</button>
                    </div>
                </div>

                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('bubbleFontSettingModal').remove()" style="flex:1;padding:8px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;">取消</button>
                    <button id="btnSaveBubbleFont" style="flex:1.4;padding:8px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">保存字体配置</button>
                </div>
            </div>
        `;

        let selectedAlign = curAlign;
        modal.querySelectorAll('.btn-font-align').forEach(btn => {
            btn.onclick = () => {
                selectedAlign = btn.getAttribute('data-align');
                modal.querySelectorAll('.btn-font-align').forEach(b => {
                    const isTarget = (b.getAttribute('data-align') === selectedAlign);
                    b.style.borderColor = isTarget ? '#07c160' : '#ddd';
                    b.style.background = isTarget ? '#e8f7ed' : '#fff';
                    b.style.color = isTarget ? '#07c160' : '#333';
                });
            };
        });

        modal.querySelector('#btnSaveBubbleFont').onclick = async () => {
            const fontF = (modal.querySelector('#bubbleFontFamilyInput')?.value || '').trim();
            const fontS = parseFloat(modal.querySelector('#bubbleFontSizeNum')?.value) || curFontSize;

            b.fontFamily = fontF;
            b.fontSize = fontS;
            b.textAlign = selectedAlign;

            await window.saveCustomBubbleAsync(b);
            modal.remove();
            refreshDecorView();
            if (typeof showToast === 'function') showToast('字体设置已更新');
        };
    };

    window.toggleDecorBubblesCollapse = function () {
        const body = document.getElementById('decorBubblesBody');
        const arrow = document.getElementById('decorBubblesCollapseArrow');
        if (!body || !arrow) return;
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
        arrow.textContent = isHidden ? '▲' : '▼';
    };

    window.selectDecorBubble = function (id) {
        localStorage.setItem('mcyt_active_decor_bubble', id);
        refreshDecorView();
        if (typeof showToast === 'function') showToast('气泡已应用');
    };

    window.deleteDecorBubble = async function (id) {
        try {
            let list = window.getStoredDecorBubbles().filter(x => !x.isBuiltin && x.id !== id);
            window._decorBubblesCache = [...DEFAULT_BUBBLES, ...list];
            if (window.localforage) {
                await window.localforage.setItem('mcyt_decor_bubbles', list);
            }
            if (localStorage.getItem('mcyt_active_decor_bubble') === id) {
                localStorage.setItem('mcyt_active_decor_bubble', 'bubble_default');
            }
            refreshDecorView();
            if (typeof showToast === 'function') showToast('气泡已删除');
        } catch (_) {}
    };

    /**
     * 气泡操作菜单
     */
    window.openBubbleActionMenu = function () {
        let modal = document.getElementById('bubbleActionMenuModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bubbleActionMenuModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:300px;padding:18px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <span style="font-size:14px;font-weight:600;color:#222;">气泡创作与导入</span>
                    <button onclick="document.getElementById('bubbleActionMenuModal').remove()" style="background:none;border:none;color:#999;font-size:16px;cursor:pointer;">✕</button>
                </div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <button onclick="document.getElementById('bubbleActionMenuModal').remove(); window.openDirectLinkBubbleModal();" style="width:100%;padding:11px 14px;background:#f0f9eb;border:1px solid #c2e7b0;border-radius:8px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;">
                        <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#07c160;fill:none;stroke-width:2;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        <div>
                            <div style="font-size:13px;font-weight:600;color:#07c160;">输入链接/代码保存</div>
                            <div style="font-size:10.5px;color:#777;">直接粘贴 HTML/CSS 或图片链接一键保存</div>
                        </div>
                    </button>
                    <button onclick="document.getElementById('bubbleActionMenuModal').remove(); window.openSelectBubbleSourceModal();" style="width:100%;padding:11px 14px;background:#f9f9f9;border:1px solid #e5e5e5;border-radius:8px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;">
                        <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#333;fill:none;stroke-width:2;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <div>
                            <div style="font-size:13px;font-weight:600;color:#222;">制作新点九图气泡</div>
                            <div style="font-size:10.5px;color:#777;">8点文字排版安全区，消除虚大空白</div>
                        </div>
                    </button>
                    <button onclick="document.getElementById('bubbleActionMenuModal').remove(); if(typeof window.openAiGenerateBubbleModal==='function') window.openAiGenerateBubbleModal();" style="width:100%;padding:11px 14px;background:#f9f9f9;border:1px solid #e5e5e5;border-radius:8px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;">
                        <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#333;fill:none;stroke-width:2;"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
                        <div>
                            <div style="font-size:13px;font-weight:600;color:#222;">AI 视觉仿图 & 定制</div>
                            <div style="font-size:10.5px;color:#777;">上传参考图或自然语言，AI 仿制气泡</div>
                        </div>
                    </button>
                    <button onclick="document.getElementById('bubbleActionMenuModal').remove(); window.openImportBubbleHubModal();" style="width:100%;padding:11px 14px;background:#f9f9f9;border:1px solid #e5e5e5;border-radius:8px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;">
                        <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#333;fill:none;stroke-width:2;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <div>
                            <div style="font-size:13px;font-weight:600;color:#222;">导入已有 JSON</div>
                            <div style="font-size:10.5px;color:#777;">导入他人分享的 JSON 气泡配置文件</div>
                        </div>
                    </button>
                </div>
            </div>
        `;
    };

    /**
     * 直接输入 HTML/CSS 链接或代码快捷保存
     */
    window.openDirectLinkBubbleModal = function () {
        let modal = document.getElementById('directLinkBubbleModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'directLinkBubbleModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:320px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <span style="font-size:14px;font-weight:600;color:#222;">链接/代码快速保存</span>
                    <button onclick="document.getElementById('directLinkBubbleModal').remove()" style="background:none;border:none;color:#999;font-size:16px;cursor:pointer;">✕</button>
                </div>
                <div style="font-size:11px;color:#777;margin-bottom:8px;">支持输入图片链接、CSS代码片段或HTML样式：</div>
                
                <input type="text" id="directBubbleNameInput" placeholder="气泡名称（如：简约浅蓝）" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12px;outline:none;margin-bottom:8px;">

                <textarea id="directLinkContentInput" placeholder="输入图片直链 (https://...) 或 CSS 样式代码..." style="width:100%;box-sizing:border-box;min-height:90px;padding:8px;border-radius:6px;border:1px solid #e0e0e0;font-size:11.5px;outline:none;resize:none;margin-bottom:12px;"></textarea>

                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('directLinkBubbleModal').remove()" style="flex:1;padding:8px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;">取消</button>
                    <button id="btnConfirmDirectLink" style="flex:1.4;padding:8px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">确认并保存</button>
                </div>
            </div>
        `;

        modal.querySelector('#btnConfirmDirectLink').onclick = async () => {
            const name = (modal.querySelector('#directBubbleNameInput')?.value || '').trim() || '外部气泡';
            const content = (modal.querySelector('#directLinkContentInput')?.value || '').trim();
            if (!content) {
                if (typeof showToast === 'function') showToast('请填写有效的链接或代码');
                return;
            }

            const newId = 'bubble_link_' + Date.now();
            let newBubble = null;

            if (/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(content) || content.startsWith('data:image/')) {
                newBubble = {
                    id: newId,
                    name: name,
                    type: 'nine_slice',
                    scale: 1.0,
                    fontSize: 14.5,
                    textAlign: 'left',
                    boxWidth: 180,
                    boxHeight: 60,
                    userOffsetX: 0,
                    userOffsetY: 0,
                    npcOffsetX: 0,
                    npcOffsetY: 0,
                    mirrorNpcFromUser: true,
                    userBorderImage: content,
                    npcBorderImage: content,
                    userSlice: '30% 30% 30% 30%',
                    npcSlice: '30% 30% 30% 30%',
                    userPadding: '8px 12px',
                    npcPadding: '8px 12px',
                    userBorderWidth: 14,
                    npcBorderWidth: 14,
                    userTextColor: '#111111',
                    npcTextColor: '#222222',
                    isBuiltin: false
                };
            } else {
                newBubble = {
                    id: newId,
                    name: name,
                    type: 'css',
                    scale: 1.0,
                    fontSize: 14.5,
                    textAlign: 'left',
                    userStyle: content.includes('background') ? content : `background:${content};color:#000;`,
                    npcStyle: content.includes('background') ? content : `background:${content};color:#000;`,
                    userTextColor: '#111111',
                    npcTextColor: '#222222',
                    isBuiltin: false
                };
            }

            await window.saveCustomBubbleAsync(newBubble);
            localStorage.setItem('mcyt_active_decor_bubble', newId);
            modal.remove();
            refreshDecorView();
            if (typeof showToast === 'function') showToast('气泡已成功导入生效！');
        };
    };

    window.openSelectBubbleSourceModal = function () {
        let modal = document.getElementById('bubbleSourceModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bubbleSourceModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;padding:20px;';
            document.body.appendChild(modal);
        }

        window._bubbleMakeMode = window._bubbleMakeMode || 'nine_slice';

        function renderSourceModal() {
            const mode = window._bubbleMakeMode;
            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:300px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                    <div style="font-size:14px;font-weight:600;color:#222;margin-bottom:10px;">制作新气泡</div>
                    <div style="display:flex;gap:6px;margin-bottom:10px;">
                        <button id="btnModeNineSlice" style="flex:1;padding:8px 4px;border-radius:8px;font-size:11.5px;cursor:pointer;border:1px solid ${mode === 'nine_slice' ? '#07c160' : '#e0e0e0'};background:${mode === 'nine_slice' ? '#e8f7ed' : '#fff'};color:${mode === 'nine_slice' ? '#07c160' : '#333'};font-weight:${mode === 'nine_slice' ? '600' : 'normal'};line-height:1.4;">
                            点九图自适应<br><span style="font-size:9.5px;opacity:0.8;">随文字自动伸展</span>
                        </button>
                        <button id="btnModeVisualBox" style="flex:1;padding:8px 4px;border-radius:8px;font-size:11.5px;cursor:pointer;border:1px solid ${mode === 'visual_box' ? '#07c160' : '#e0e0e0'};background:${mode === 'visual_box' ? '#e8f7ed' : '#fff'};color:${mode === 'visual_box' ? '#07c160' : '#333'};font-weight:${mode === 'visual_box' ? '600' : 'normal'};line-height:1.4;">
                            固定框选画框<br><span style="font-size:9.5px;opacity:0.8;">插画类固定尺寸</span>
                        </button>
                    </div>
                    <input type="file" id="bubbleSourceFileInput" accept="image/*" style="display:none;" onchange="window.handleBubbleSourceLocalUpload(event)">
                    <button onclick="document.getElementById('bubbleSourceFileInput').click()" style="width:100%;padding:11px;background:#07c160;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:6px;">
                        <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:#fff;stroke-width:2;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <span>从手机相册选取图片</span>
                    </button>
                    <div style="display:flex;align-items:center;margin:10px 0;gap:8px;">
                        <div style="flex:1;height:1px;background:#eee;"></div>
                        <span style="font-size:11px;color:#aaa;">或输入图片直链</span>
                        <div style="flex:1;height:1px;background:#eee;"></div>
                    </div>
                    <input type="text" id="bubbleSourceUrlInput" placeholder="https://..." style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;font-size:12px;outline:none;margin-bottom:12px;">
                    <div style="display:flex;gap:8px;">
                        <button style="flex:1;padding:8px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;" onclick="document.getElementById('bubbleSourceModal').remove()">取消</button>
                        <button style="flex:1;padding:8px;background:#181818;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:500;cursor:pointer;" onclick="window.confirmBubbleSourceUrl()">${mode === 'nine_slice' ? '下一步：切片' : '开始框选'}</button>
                    </div>
                </div>
            `;
            modal.querySelector('#btnModeNineSlice').onclick = () => { window._bubbleMakeMode = 'nine_slice'; renderSourceModal(); };
            modal.querySelector('#btnModeVisualBox').onclick = () => { window._bubbleMakeMode = 'visual_box'; renderSourceModal(); };
        }

        renderSourceModal();
    };

    window.confirmBubbleSourceUrl = function () {
        const url = (document.getElementById('bubbleSourceUrlInput')?.value || '').trim();
        if (!url) {
            if (typeof showToast === 'function') showToast('请填写有效的图片链接');
            return;
        }
        document.getElementById('bubbleSourceModal')?.remove();
        if (window._bubbleMakeMode === 'nine_slice') {
            window.openNineSliceDiyModal(null, url, '我的自适应气泡');
        } else {
            window.openVisualBoxDiyModal(null, url, '我的画框气泡');
        }
    };

    window.handleBubbleSourceLocalUpload = function (event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (e) {
            const rawData = e.target.result;
            const defaultName = file.name.replace(/\.[^/.]+$/, "");
            document.getElementById('bubbleSourceModal')?.remove();
            if (window._bubbleMakeMode === 'nine_slice') {
                window.openNineSliceDiyModal(null, rawData, defaultName);
            } else {
                window.openVisualBoxDiyModal(null, rawData, defaultName);
            }
        };
        reader.readAsDataURL(file);
    };

    // JSON 导入模块
    window.openImportBubbleHubModal = function () {
        let modal = document.getElementById('bubbleImportHubModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bubbleImportHubModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:320px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span style="font-size:14px;font-weight:600;color:#222;">导入气泡 JSON</span>
                    <button onclick="document.getElementById('bubbleImportHubModal').remove()" style="background:none;border:none;color:#999;font-size:16px;cursor:pointer;">✕</button>
                </div>
                <textarea id="importPayloadArea" placeholder="在此粘贴气泡 JSON 代码..." style="width:100%;box-sizing:border-box;min-height:120px;padding:8px;border-radius:6px;border:1px solid #ddd;font-size:11px;font-family:monospace;resize:none;margin-bottom:8px;outline:none;"></textarea>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('bubbleImportHubModal').remove()" style="flex:1;padding:9px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#666;cursor:pointer;">取消</button>
                    <button id="btnConfirmImportHub" style="flex:1.4;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">解析并导入</button>
                </div>
            </div>
        `;

        modal.querySelector('#btnConfirmImportHub').onclick = async () => {
            const raw = modal.querySelector('#importPayloadArea')?.value.trim();
            if (!raw) return;
            try {
                const parsed = JSON.parse(raw);
                const b = parsed.bubble || parsed;
                const newId = 'bubble_' + Date.now();
                const itemToSave = { ...b, id: newId, isBuiltin: false };
                await window.saveCustomBubbleAsync(itemToSave);
                localStorage.setItem('mcyt_active_decor_bubble', newId);
                modal.remove();
                refreshDecorView();
                if (typeof showToast === 'function') showToast('气泡已导入！');
            } catch (e) {
                if (typeof showToast === 'function') showToast('JSON 解析失败');
            }
        };
    };

    // HSV 调色盘与颜色工具
    function bubbleHsvToRgb(h, s, v) {
        s = s / 100; v = v / 100;
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        let r = 0, g = 0, b = 0;
        if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
        else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
        else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
        else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
        else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
    }

    function bubbleRgbToHex(r, g, b) {
        return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    function bubbleHexToHsv(hex) {
        if (!hex || typeof hex !== 'string') return { h: 120, s: 80, v: 90 };
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const num = parseInt(c, 16);
        if (isNaN(num)) return { h: 120, s: 80, v: 90 };
        const r = (num >> 16) / 255, g = ((num >> 8) & 255) / 255, b = (num & 255) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b), diff = max - min;
        let h = 0;
        if (diff !== 0) {
            if (max === r) h = ((g - b) / diff) % 6;
            else if (max === g) h = (b - r) / diff + 2;
            else h = (r - g) / diff + 4;
            h = Math.round(h * 60);
            if (h < 0) h += 360;
        }
        const s = max === 0 ? 0 : Math.round((diff / max) * 100);
        const v = Math.round(max * 100);
        return { h, s, v };
    }

    /**
     * 修复的 HSV 取色弹窗
     */
    window.openWechatColorPickerModal = function (initialColor = '#111111', onSelectCallback) {
        let modal = document.getElementById('wechatColorPickerModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'wechatColorPickerModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:100005;padding:14px;box-sizing:border-box;';
            document.body.appendChild(modal);
        }

        let curHex = (initialColor && initialColor.startsWith('#')) ? initialColor : '#111111';
        let hsvState = bubbleHexToHsv(curHex);

        const PRESET_PALETTES = [
            '#000000', '#111111', '#222222', '#555555', '#888888', '#ffffff',
            '#07c160', '#10aeff', '#576b95', '#fa5151', '#ffc300',
            '#845ef7', '#f06595', '#20c997', '#495057', '#e8f7ed'
        ];

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:16px;width:100%;max-width:320px;max-height:92vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.25);box-sizing:border-box;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span style="font-size:14px;font-weight:700;color:#222;">气泡文字颜色选择</span>
                    <button onclick="document.getElementById('wechatColorPickerModal').remove()" style="background:none;border:none;color:#999;font-size:16px;cursor:pointer;">✕</button>
                </div>
                <div style="background:#222222;border-radius:14px;padding:12px;margin-bottom:12px;box-sizing:border-box;">
                    <div id="bHsvWheelBox" style="width:190px;height:190px;margin:0 auto 8px auto;position:relative;user-select:none;touch-action:none;cursor:crosshair;">
                        <canvas id="bHsvWheelCanvas" width="380" height="380" style="width:100%;height:100%;border-radius:50%;display:block;touch-action:none;"></canvas>
                        <div id="bHsvRingHandle" style="position:absolute;width:20px;height:20px;border:2.5px solid #ffffff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.5);transform:translate(-50%,-50%);pointer-events:none;box-sizing:border-box;"></div>
                        <div id="bHsvTriangleHandle" style="position:absolute;width:16px;height:16px;border:2.5px solid #ffffff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.5);transform:translate(-50%,-50%);pointer-events:none;box-sizing:border-box;"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:0 2px 4px 2px;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <div id="bPalettePreviewBox" style="width:24px;height:24px;border-radius:5px;border:1px solid rgba(255,255,255,0.4);background:${curHex};"></div>
                            <span id="bCurrentHexBadge" style="font-size:12px;font-family:monospace;color:#fff;background:rgba(255,255,255,0.16);padding:2px 7px;border-radius:5px;">${curHex.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(8, 1fr);gap:6px;margin-bottom:12px;">
                    ${PRESET_PALETTES.map(col => `
                        <div class="b-preset-color-block" data-col="${col}" style="height:22px;border-radius:4px;background:${col};border:1px solid ${col.toLowerCase() === '#ffffff' ? '#ddd' : 'transparent'};cursor:pointer;"></div>
                    `).join('')}
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('wechatColorPickerModal').remove()" style="flex:1;padding:8px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#666;cursor:pointer;">取消</button>
                    <button id="btnBPaletteConfirm" style="flex:1.4;padding:8px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">应用此颜色</button>
                </div>
            </div>
        `;

        const box = modal.querySelector('#bHsvWheelBox');
        const canvas = modal.querySelector('#bHsvWheelCanvas');
        const rHandle = modal.querySelector('#bHsvRingHandle');
        const tHandle = modal.querySelector('#bHsvTriangleHandle');
        const badge = modal.querySelector('#bCurrentHexBadge');
        const prevBox = modal.querySelector('#bPalettePreviewBox');

        const ctx = canvas.getContext('2d');
        const size = 380, center = size / 2, outerR = size / 2 - 6, innerR = outerR - 30, triR = innerR - 8;

        function getTriangleVertices() {
            const cos30 = Math.cos(Math.PI / 6), sin30 = Math.sin(Math.PI / 6);
            return {
                top: { x: center - triR * cos30, y: center - triR * sin30 },
                bottom: { x: center - triR * cos30, y: center + triR * sin30 },
                right: { x: center + triR, y: center }
            };
        }

        function renderWheel() {
            ctx.clearRect(0, 0, size, size);
            for (let deg = 0; deg < 360; deg += 0.5) {
                const radStart = (deg - 90) * Math.PI / 180, radEnd = (deg + 0.5 - 90) * Math.PI / 180;
                ctx.beginPath();
                ctx.arc(center, center, outerR, radStart, radEnd, false);
                ctx.arc(center, center, innerR, radEnd, radStart, true);
                ctx.closePath();
                const rgb = bubbleHsvToRgb(deg, 100, 100);
                ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
                ctx.fill();
            }
            const v = getTriangleVertices();
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(v.top.x, v.top.y); ctx.lineTo(v.right.x, v.right.y); ctx.lineTo(v.bottom.x, v.bottom.y);
            ctx.closePath(); ctx.clip();
            const pureRgb = bubbleHsvToRgb(hsvState.h, 100, 100);
            const horizGrad = ctx.createLinearGradient(v.top.x, center, v.right.x, center);
            horizGrad.addColorStop(0, '#ffffff'); horizGrad.addColorStop(1, `rgb(${pureRgb.r},${pureRgb.g},${pureRgb.b})`);
            ctx.fillStyle = horizGrad; ctx.fillRect(0, 0, size, size);
            const vertGrad = ctx.createLinearGradient(center, v.top.y, center, v.bottom.y);
            vertGrad.addColorStop(0, 'rgba(0,0,0,0)'); vertGrad.addColorStop(1, '#000000');
            ctx.fillStyle = vertGrad; ctx.fillRect(0, 0, size, size);
            ctx.restore();

            updateHandlesAndUi();
        }

        function updateHandlesAndUi() {
            const scale = (box.getBoundingClientRect().width || 190) / size;
            const rad = (hsvState.h - 90) * Math.PI / 180;
            const ringMidR = (outerR + innerR) / 2;
            rHandle.style.left = `${(center + ringMidR * Math.cos(rad)) * scale}px`;
            rHandle.style.top = `${(center + ringMidR * Math.sin(rad)) * scale}px`;

            const v = getTriangleVertices();
            const sat = hsvState.s / 100, val = hsvState.v / 100;
            const x = v.top.x + (v.right.x - v.top.x) * sat * val;
            const curTopY = v.top.y + (v.right.y - v.top.y) * sat;
            const curBotY = v.bottom.y + (v.right.y - v.bottom.y) * sat;
            const y = curTopY + (curBotY - curTopY) * (1 - val);

            tHandle.style.left = `${x * scale}px`;
            tHandle.style.top = `${y * scale}px`;

            const curRgb = bubbleHsvToRgb(hsvState.h, hsvState.s, hsvState.v);
            curHex = bubbleRgbToHex(curRgb.r, curRgb.g, curRgb.b);
            prevBox.style.backgroundColor = curHex;
            badge.textContent = curHex.toUpperCase();
        }

        let isWheelDragging = false;
        let isTriDragging = false;

        function handlePickerPointer(e) {
            const rect = box.getBoundingClientRect();
            const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
            const clientY = (e.touches ? e.touches[0].clientY : e.clientY);
            const px = (clientX - rect.left) * (size / rect.width);
            const py = (clientY - rect.top) * (size / rect.width);
            const dist = Math.sqrt((px - center) ** 2 + (py - center) ** 2);

            if (!isWheelDragging && !isTriDragging) {
                if (dist >= innerR && dist <= outerR) {
                    isWheelDragging = true;
                } else if (dist < innerR) {
                    isTriDragging = true;
                }
            }

            if (isWheelDragging) {
                let angle = Math.atan2(py - center, px - center) * 180 / Math.PI + 90;
                if (angle < 0) angle += 360;
                hsvState.h = Math.round(angle) % 360;
                renderWheel();
            } else if (isTriDragging) {
                const v = getTriangleVertices();
                const totalW = v.right.x - v.top.x;
                let sat = Math.max(0, Math.min(1, (px - v.top.x) / totalW));
                const totalH = v.bottom.y - v.top.y;
                let val = Math.max(0, Math.min(1, 1 - (py - v.top.y) / totalH));
                hsvState.s = Math.round(sat * 100);
                hsvState.v = Math.round(val * 100);
                renderWheel();
            }
        }

        box.addEventListener('mousedown', (e) => { handlePickerPointer(e); });
        box.addEventListener('touchstart', (e) => { handlePickerPointer(e); if (e.cancelable) e.preventDefault(); }, { passive: false });

        window.addEventListener('mousemove', (e) => {
            if (isWheelDragging || isTriDragging) handlePickerPointer(e);
        });
        window.addEventListener('touchmove', (e) => {
            if (isWheelDragging || isTriDragging) {
                handlePickerPointer(e);
                if (e.cancelable) e.preventDefault();
            }
        }, { passive: false });

        window.addEventListener('mouseup', () => { isWheelDragging = false; isTriDragging = false; });
        window.addEventListener('touchend', () => { isWheelDragging = false; isTriDragging = false; });

        modal.querySelectorAll('.b-preset-color-block').forEach(el => {
            el.onclick = () => {
                hsvState = bubbleHexToHsv(el.getAttribute('data-col'));
                renderWheel();
            };
        });

        modal.querySelector('#btnBPaletteConfirm').onclick = () => {
            if (typeof onSelectCallback === 'function') onSelectCallback(curHex);
            modal.remove();
        };

        renderWheel();
    };

    /**
     * 生成通用 8 点高灵敏度防误触手柄 HTML
     */
    function build8PointHandlesHtml(prefix = 'h8') {
        const hitArea = "position:absolute;width:26px;height:26px;display:flex;align-items:center;justify-content:center;touch-action:none;pointer-events:auto;z-index:20;";
        const dot = "<div style=\"width:13px;height:13px;border-radius:50%;background:#ffffff;border:2.5px solid #07c160;box-shadow:0 0 5px rgba(0,0,0,0.4);box-sizing:border-box;pointer-events:none;\"></div>";
        return `
            <!-- 上三点 -->
            <div class="${prefix}-handle" data-dir="tl" style="${hitArea}left:-13px;top:-13px;cursor:nwse-resize;">${dot}</div>
            <div class="${prefix}-handle" data-dir="tc" style="${hitArea}left:calc(50% - 13px);top:-13px;cursor:ns-resize;">${dot}</div>
            <div class="${prefix}-handle" data-dir="tr" style="${hitArea}right:-13px;top:-13px;cursor:nesw-resize;">${dot}</div>
            <!-- 左右中间两点 -->
            <div class="${prefix}-handle" data-dir="ml" style="${hitArea}left:-13px;top:calc(50% - 13px);cursor:ew-resize;">${dot}</div>
            <div class="${prefix}-handle" data-dir="mr" style="${hitArea}right:-13px;top:calc(50% - 13px);cursor:ew-resize;">${dot}</div>
            <!-- 下三点 -->
            <div class="${prefix}-handle" data-dir="bl" style="${hitArea}left:-13px;bottom:-13px;cursor:nesw-resize;">${dot}</div>
            <div class="${prefix}-handle" data-dir="bc" style="${hitArea}left:calc(50% - 13px);bottom:-13px;cursor:ns-resize;">${dot}</div>
            <div class="${prefix}-handle" data-dir="br" style="${hitArea}right:-13px;bottom:-13px;cursor:nwse-resize;">${dot}</div>
        `;
    }

    /**
     * 🌟 点九图自适应气泡向导工坊
     */
    window.openNineSliceDiyModal = function (bubbleId = null, initialUrl = '', initialName = '') {
        let bubbleObj = null;
        if (bubbleId) {
            const list = window.getStoredDecorBubbles();
            bubbleObj = list.find(x => x.id === bubbleId);
        }

        function parseSlice(str) {
            const parts = (str || '30% 30% 30% 30%').replace(/%/g, '').trim().split(/\s+/).map(Number);
            const [top = 30, right = 30, bottom = 30, left = 30] = parts;
            return { top, right, bottom, left };
        }
        function parsePadding(str) {
            const parts = (str || '8px 12px').replace(/px/g, '').trim().split(/\s+/).map(Number);
            if (parts.length >= 2) return { v: parts[0], h: parts[1] };
            return { v: parts[0] || 8, h: parts[0] || 12 };
        }

        const state = {
            step: 1,
            id: bubbleObj ? bubbleObj.id : ('bubble_' + Date.now()),
            name: bubbleObj ? bubbleObj.name : (initialName || '自适应气泡'),
            author: bubbleObj ? (bubbleObj.author || '') : '玩家自制',
            scale: (bubbleObj && bubbleObj.scale !== undefined) ? bubbleObj.scale : 1.0,
            fontSize: (bubbleObj && bubbleObj.fontSize) ? bubbleObj.fontSize : 14.5,
            textAlign: bubbleObj?.textAlign || 'left',
            fontFamily: (bubbleObj && bubbleObj.fontFamily) ? bubbleObj.fontFamily : '',

            textOffsetX: bubbleObj?.textOffsetX || 0,
            textOffsetY: bubbleObj?.textOffsetY || 0,
            textBoxWidth: bubbleObj?.textBoxWidth || 160,
            textBoxHeight: bubbleObj?.textBoxHeight || 45,

            boxWidth: bubbleObj?.boxWidth || 210,
            boxHeight: bubbleObj?.boxHeight || 65,

            userOffsetX: bubbleObj?.userOffsetX || bubbleObj?.offsetX || 0,
            userOffsetY: bubbleObj?.userOffsetY || bubbleObj?.offsetY || 0,
            npcOffsetX: bubbleObj?.npcOffsetX || bubbleObj?.offsetX || 0,
            npcOffsetY: bubbleObj?.npcOffsetY || bubbleObj?.offsetY || 0,

            mirrorNpcFromUser: (bubbleObj && bubbleObj.mirrorNpcFromUser !== undefined) ? bubbleObj.mirrorNpcFromUser : true,
            user: {
                url: (bubbleObj?.userBorderImage || bubbleObj?.borderImage) || initialUrl || '',
                slice: parseSlice(bubbleObj?.userSlice || bubbleObj?.slice),
                padding: parsePadding(bubbleObj?.userPadding || bubbleObj?.padding),
                borderWidth: (bubbleObj?.userBorderWidth || bubbleObj?.borderWidth) || 14,
                textColor: (bubbleObj?.userTextColor || bubbleObj?.textColor) || '#111111'
            },
            npc: {
                url: (bubbleObj?.npcBorderImage || bubbleObj?.borderImage) || '',
                slice: parseSlice(bubbleObj?.npcSlice || bubbleObj?.slice),
                padding: parsePadding(bubbleObj?.npcPadding || bubbleObj?.padding),
                borderWidth: (bubbleObj?.npcBorderWidth || bubbleObj?.borderWidth) || 14,
                textColor: (bubbleObj?.npcTextColor || bubbleObj?.textColor) || '#222222'
            }
        };

        let modal = document.getElementById('nineSliceDiyModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'nineSliceDiyModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100000;padding:12px;box-sizing:border-box;';
            document.body.appendChild(modal);
        }

        function sliceCss(cfg) {
            return `${cfg.slice.top}% ${cfg.slice.right}% ${cfg.slice.bottom}% ${cfg.slice.left}%`;
        }
        function padCss(cfg) {
            return `${cfg.padding.v}px ${cfg.padding.h}px`;
        }

        async function ensureNpcMirroredImage() {
            if (state.mirrorNpcFromUser && state.user.url) {
                state.npc.url = await flipImageHorizontallyAsync(state.user.url);
                state.npc.slice = {
                    top: state.user.slice.top,
                    right: state.user.slice.left,
                    bottom: state.user.slice.bottom,
                    left: state.user.slice.right
                };
                state.npc.borderWidth = state.user.borderWidth;
                state.npc.padding = { ...state.user.padding };
            }
        }

        function renderStage() {
            if (state.step === 1) renderStep1Slice();
            else if (state.step === 2) renderStep2TextTransform();
            else if (state.step === 3) renderStep3VirtualChat();
        }

        // ================= 阶段 1：拖动虚线切片 =================
        function renderStep1Slice() {
            const cfg = state.user;
            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:350px;max-height:92vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="font-size:14px;font-weight:700;color:#222;">第 1 步：九图切片保护</span>
                        <button onclick="document.getElementById('nineSliceDiyModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                    </div>
                    <div style="font-size:11px;color:#666;margin-bottom:10px;line-height:1.4;">
                        拖动四条线圈住四个圆角和装饰角色。只有被圈在中间的区域才会被拉伸。
                    </div>

                    ${!cfg.url ? `
                        <button id="btnUploadBubble" style="width:100%;padding:12px;background:#07c160;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">上传气泡原图</button>
                        <input type="file" id="step1FileInput" accept="image/*" style="display:none;">
                    ` : `
                        <div id="nsStageContainer" style="position:relative;width:100%;background:#ebebeb;border-radius:10px;overflow:hidden;margin-bottom:10px;user-select:none;touch-action:none;">
                            <img src="${cfg.url}" style="width:100%;display:block;pointer-events:none;" />
                            <div id="nsLineTop" style="position:absolute;left:0;right:0;top:${cfg.slice.top}%;height:0;border-top:2px dashed #07c160;cursor:ns-resize;"><div style="position:absolute;left:50%;top:-7px;transform:translateX(-50%);width:26px;height:14px;background:#07c160;border-radius:4px;"></div></div>
                            <div id="nsLineBottom" style="position:absolute;left:0;right:0;top:${100 - cfg.slice.bottom}%;height:0;border-top:2px dashed #07c160;cursor:ns-resize;"><div style="position:absolute;left:50%;top:-7px;transform:translateX(-50%);width:26px;height:14px;background:#07c160;border-radius:4px;"></div></div>
                            <div id="nsLineLeft" style="position:absolute;top:0;bottom:0;left:${cfg.slice.left}%;width:0;border-left:2px dashed #576b95;cursor:ew-resize;"><div style="position:absolute;top:50%;left:-7px;transform:translateY(-50%);width:14px;height:26px;background:#576b95;border-radius:4px;"></div></div>
                            <div id="nsLineRight" style="position:absolute;top:0;bottom:0;left:${100 - cfg.slice.right}%;width:0;border-left:2px dashed #576b95;cursor:ew-resize;"><div style="position:absolute;top:50%;left:-7px;transform:translateY(-50%);width:14px;height:26px;background:#576b95;border-radius:4px;"></div></div>
                        </div>

                        <div style="display:flex;justify-content:space-between;align-items:center;background:#f9f9f9;padding:8px 10px;border-radius:8px;border:1px solid #eee;margin-bottom:12px;">
                            <div>
                                <div style="font-size:12px;font-weight:600;color:#333;">对方气泡自动镜像生成</div>
                                <div style="font-size:10px;color:#888;">Canvas 像素翻转，完全独立对称</div>
                            </div>
                            <input type="checkbox" id="chkMirrorNpc" ${state.mirrorNpcFromUser ? 'checked' : ''} style="width:18px;height:18px;accent-color:#07c160;">
                        </div>

                        <button id="btnStep1Next" style="width:100%;padding:11px;background:#07c160;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">下一步：文字8点排版安全区 ➔</button>
                    `}
                </div>
            `;

            const upBtn = modal.querySelector('#btnUploadBubble');
            if (upBtn) {
                const fileInp = modal.querySelector('#step1FileInput');
                upBtn.onclick = () => fileInp.click();
                fileInp.onchange = (e) => {
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = (ev) => { state.user.url = ev.target.result; renderStage(); };
                    r.readAsDataURL(f);
                };
            }

            if (cfg.url) {
                bindNineSliceHandles(modal, cfg);
                modal.querySelector('#chkMirrorNpc').onchange = (e) => { state.mirrorNpcFromUser = e.target.checked; };
                modal.querySelector('#btnStep1Next').onclick = async () => {
                    await ensureNpcMirroredImage();
                    state.step = 2;
                    renderStage();
                };
            }
        }

        // ================= 阶段 2：文字 8 点自由排版与安全区设定 =================
        function renderStep2TextTransform() {
            const cfg = state.user;
            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:350px;max-height:92vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:14px;font-weight:700;color:#222;">第 2 步：文字 8 点自由排版</span>
                        <button onclick="document.getElementById('nineSliceDiyModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                    </div>
                    <div style="font-size:11px;color:#666;margin-bottom:12px;line-height:1.4;">
                        拉动绿色 8 点框确定<b>文字排版安全区</b>与换行宽度；按住文字可在气泡内随意挪动！
                    </div>

                    <div id="step2TransformStage" style="position:relative;background:#ededed;border-radius:12px;padding:24px 10px;display:flex;justify-content:center;align-items:center;margin-bottom:14px;min-height:180px;touch-action:none;user-select:none;-webkit-user-select:none;">
                        
                        <div id="step2LockedBubble" style="position:relative;width:${state.boxWidth}px;height:${state.boxHeight}px;border-style:solid;border-width:${cfg.borderWidth}px;border-image:url('${cfg.url}') ${sliceCss(cfg)} fill stretch;-webkit-border-image:url('${cfg.url}') ${sliceCss(cfg)} fill stretch;box-sizing:border-box;display:flex;align-items:center;justify-content:center;overflow:visible;">
                            
                            <div id="step2TextBox8" style="position:absolute;left:calc(50% - ${state.textBoxWidth / 2}px + ${state.textOffsetX}px);top:calc(50% - ${state.textBoxHeight / 2}px + ${state.textOffsetY}px);width:${state.textBoxWidth}px;height:${state.textBoxHeight}px;border:1.5px solid #07c160;background:rgba(7,193,96,0.08);box-sizing:border-box;cursor:move;touch-action:none;display:flex;align-items:center;justify-content:center;padding:2px 4px;">
                                
                                <span id="step2TextDemoSpan" style="display:block;width:100%;text-align:${state.textAlign};font-size:${state.fontSize}px;color:${cfg.textColor};line-height:1.35;word-break:break-word;pointer-events:none;">
                                    你好！字的位置决定排版安全区，不再虚胖空白～
                                </span>

                                ${build8PointHandlesHtml('t8')}
                            </div>
                        </div>
                    </div>

                    <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:10px 12px;margin-bottom:14px;display:flex;flex-direction:column;gap:10px;">
                        
                        <div style="display:flex;align-items:center;justify-content:space-between;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:12px;font-weight:600;color:#333;">文字字号</span>
                                <div style="display:flex;align-items:center;gap:2px;background:#ffffff;border:1px solid #dcdcdc;border-radius:5px;padding:2px 6px;">
                                    <input type="number" id="step2FontSizeInput" value="${state.fontSize.toFixed(1)}" min="9" max="36" step="0.5" style="width:48px;border:none;outline:none;font-size:12px;font-weight:700;color:#07c160;text-align:center;background:transparent;">
                                    <span style="font-size:11px;color:#888;">px</span>
                                </div>
                            </div>
                            <div style="display:flex;gap:6px;">
                                <div id="btnStep2UserColorTrigger" title="设置我方文字颜色" style="display:flex;align-items:center;gap:4px;cursor:pointer;background:#fff;padding:4px 7px;border-radius:6px;border:1px solid #ddd;">
                                    <span style="font-size:10px;color:#666;">我方</span>
                                    <div style="width:14px;height:14px;border-radius:3px;background:${state.user.textColor};border:1px solid #ccc;"></div>
                                </div>
                                <div id="btnStep2NpcColorTrigger" title="设置角色文字颜色" style="display:flex;align-items:center;gap:4px;cursor:pointer;background:#fff;padding:4px 7px;border-radius:6px;border:1px solid #ddd;">
                                    <span style="font-size:10px;color:#666;">角色</span>
                                    <div style="width:14px;height:14px;border-radius:3px;background:${state.npc.textColor};border:1px solid #ccc;"></div>
                                </div>
                            </div>
                        </div>

                        <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px dashed #e5e5e5;padding-top:8px;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:12px;font-weight:600;color:#333;">边框粗细</span>
                                <div style="display:flex;align-items:center;gap:2px;background:#ffffff;border:1px solid #dcdcdc;border-radius:5px;padding:2px 6px;">
                                    <input type="number" id="step2BorderWidthInput" value="${cfg.borderWidth}" min="4" max="50" step="1" style="width:40px;border:none;outline:none;font-size:12px;font-weight:700;color:#07c160;text-align:center;background:transparent;">
                                    <span style="font-size:11px;color:#888;">px</span>
                                </div>
                            </div>
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:12px;font-weight:600;color:#333;">整体缩放</span>
                                <div style="display:flex;align-items:center;gap:2px;background:#ffffff;border:1px solid #dcdcdc;border-radius:5px;padding:2px 6px;">
                                    <input type="number" id="step2ScaleInput" value="${Math.round(state.scale * 100)}" min="60" max="180" step="5" style="width:40px;border:none;outline:none;font-size:12px;font-weight:700;color:#07c160;text-align:center;background:transparent;">
                                    <span style="font-size:11px;color:#888;">%</span>
                                </div>
                            </div>
                        </div>

                        <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px dashed #e5e5e5;padding-top:8px;">
                            <span style="font-size:12px;font-weight:600;color:#333;">文本对齐</span>
                            <div style="display:flex;gap:5px;">
                                <button type="button" class="btn-align-switch" data-align="left" style="padding:4px 10px;border-radius:5px;font-size:11px;cursor:pointer;border:1px solid ${state.textAlign === 'left' ? '#07c160' : '#ddd'};background:${state.textAlign === 'left' ? '#e8f7ed' : '#ffffff'};color:${state.textAlign === 'left' ? '#07c160' : '#555'};font-weight:${state.textAlign === 'left' ? '600' : 'normal'};">靠左</button>
                                <button type="button" class="btn-align-switch" data-align="center" style="padding:4px 10px;border-radius:5px;font-size:11px;cursor:pointer;border:1px solid ${state.textAlign === 'center' ? '#07c160' : '#ddd'};background:${state.textAlign === 'center' ? '#e8f7ed' : '#ffffff'};color:${state.textAlign === 'center' ? '#07c160' : '#555'};font-weight:${state.textAlign === 'center' ? '600' : 'normal'};">居中</button>
                                <button type="button" class="btn-align-switch" data-align="right" style="padding:4px 10px;border-radius:5px;font-size:11px;cursor:pointer;border:1px solid ${state.textAlign === 'right' ? '#07c160' : '#ddd'};background:${state.textAlign === 'right' ? '#e8f7ed' : '#ffffff'};color:${state.textAlign === 'right' ? '#07c160' : '#555'};font-weight:${state.textAlign === 'right' ? '600' : 'normal'};">靠右</button>
                            </div>
                        </div>

                        <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px dashed #e5e5e5;padding-top:8px;">
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:12px;font-weight:600;color:#333;">横向留白</span>
                                <div style="display:flex;align-items:center;gap:2px;background:#ffffff;border:1px solid #dcdcdc;border-radius:5px;padding:2px 6px;">
                                    <input type="number" id="step2PaddingHInput" value="${cfg.padding.h}" min="0" max="60" step="1" style="width:40px;border:none;outline:none;font-size:12px;font-weight:700;color:#07c160;text-align:center;background:transparent;">
                                    <span style="font-size:11px;color:#888;">px</span>
                                </div>
                            </div>
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:12px;font-weight:600;color:#333;">纵向留白</span>
                                <div style="display:flex;align-items:center;gap:2px;background:#ffffff;border:1px solid #dcdcdc;border-radius:5px;padding:2px 6px;">
                                    <input type="number" id="step2PaddingVInput" value="${cfg.padding.v}" min="0" max="60" step="1" style="width:40px;border:none;outline:none;font-size:12px;font-weight:700;color:#07c160;text-align:center;background:transparent;">
                                    <span style="font-size:11px;color:#888;">px</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;">
                        <button id="btnStep2Prev" style="flex:1;padding:10px;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;font-size:12px;color:#555;cursor:pointer;">上一步</button>
                        <button id="btnStep2Next" style="flex:1.6;padding:10px;background:#07c160;border:none;border-radius:8px;font-size:12.5px;color:#fff;font-weight:600;cursor:pointer;">实景 8 点变形试穿 ➔</button>
                    </div>
                </div>
            `;

            bindStep2Text8PointInteraction(modal, state);

            const fsInput = modal.querySelector('#step2FontSizeInput');
            if (fsInput) {
                fsInput.oninput = fsInput.onchange = (e) => {
                    let num = parseFloat(e.target.value);
                    if (!isNaN(num) && num >= 8 && num <= 40) {
                        state.fontSize = parseFloat(num.toFixed(1));
                        const demoText = modal.querySelector('#step2TextDemoSpan');
                        if (demoText) demoText.style.fontSize = `${state.fontSize}px`;
                    }
                };
            }

            const bwInput = modal.querySelector('#step2BorderWidthInput');
            if (bwInput) {
                bwInput.oninput = bwInput.onchange = (e) => {
                    let num = parseInt(e.target.value) || 14;
                    state.user.borderWidth = num;
                    state.npc.borderWidth = num;
                    const bBox = modal.querySelector('#step2LockedBubble');
                    if (bBox) bBox.style.borderWidth = `${num}px`;
                };
            }

            const scInput = modal.querySelector('#step2ScaleInput');
            if (scInput) {
                scInput.oninput = scInput.onchange = (e) => {
                    let num = parseInt(e.target.value) || 100;
                    state.scale = num / 100;
                };
            }

            modal.querySelectorAll('.btn-align-switch').forEach(btn => {
                btn.onclick = () => {
                    const chosen = btn.getAttribute('data-align');
                    state.textAlign = chosen;
                    const demoText = modal.querySelector('#step2TextDemoSpan');
                    if (demoText) demoText.style.textAlign = chosen;

                    modal.querySelectorAll('.btn-align-switch').forEach(b => {
                        const isCur = (b.getAttribute('data-align') === chosen);
                        b.style.borderColor = isCur ? '#07c160' : '#ddd';
                        b.style.background = isCur ? '#e8f7ed' : '#ffffff';
                        b.style.color = isCur ? '#07c160' : '#555';
                        b.style.fontWeight = isCur ? '600' : 'normal';
                    });
                };
            });

            modal.querySelector('#btnStep2UserColorTrigger').onclick = () => {
                window.openWechatColorPickerModal(state.user.textColor, (col) => {
                    state.user.textColor = col;
                    renderStep2TextTransform();
                });
            };

            modal.querySelector('#btnStep2NpcColorTrigger').onclick = () => {
                window.openWechatColorPickerModal(state.npc.textColor, (col) => {
                    state.npc.textColor = col;
                    renderStep2TextTransform();
                });
            };

            const padHInput = modal.querySelector('#step2PaddingHInput');
            const padVInput = modal.querySelector('#step2PaddingVInput');
            if (padHInput) {
                padHInput.oninput = padHInput.onchange = (e) => {
                    const num = parseFloat(e.target.value);
                    if (!isNaN(num) && num >= 0) {
                        cfg.padding.h = num;
                        state.npc.padding.h = num;
                    }
                };
            }
            if (padVInput) {
                padVInput.oninput = padVInput.onchange = (e) => {
                    const num = parseFloat(e.target.value);
                    if (!isNaN(num) && num >= 0) {
                        cfg.padding.v = num;
                        state.npc.padding.v = num;
                    }
                };
            }

            modal.querySelector('#btnStep2Prev').onclick = () => { state.step = 1; renderStage(); };
            modal.querySelector('#btnStep2Next').onclick = async () => {
                await ensureNpcMirroredImage();
                state.step = 3;
                renderStage();
            };
        }

        // 阶段 2 交互
        function bindStep2Text8PointInteraction(modalRoot, st) {
            const box = modalRoot.querySelector('#step2TextBox8');
            const demoText = modalRoot.querySelector('#step2TextDemoSpan');
            const fsInput = modalRoot.querySelector('#step2FontSizeInput');
            if (!box || !demoText) return;

            let isDragging = false;
            let activeHandleDir = null;
            let startX = 0, startY = 0;
            let initBoxW = st.textBoxWidth, initBoxH = st.textBoxHeight;
            let initOffX = st.textOffsetX, initOffY = st.textOffsetY;
            let initFontSize = st.fontSize;

            const getPos = (e) => (e.touches && e.touches[0]) ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };

            box.addEventListener('touchstart', (e) => {
                if (e.target.closest('.t8-handle')) return;
                isDragging = true;
                const p = getPos(e);
                startX = p.x; startY = p.y;
                initOffX = st.textOffsetX; initOffY = st.textOffsetY;
            }, { passive: false });

            modalRoot.querySelectorAll('.t8-handle').forEach(h => {
                h.addEventListener('touchstart', (e) => {
                    activeHandleDir = h.getAttribute('data-dir');
                    isDragging = false;
                    const p = getPos(e);
                    startX = p.x; startY = p.y;
                    initBoxW = st.textBoxWidth; initBoxH = st.textBoxHeight;
                    initFontSize = st.fontSize;
                    e.stopPropagation();
                    e.preventDefault();
                }, { passive: false });
            });

            window.addEventListener('touchmove', (e) => {
                if (!isDragging && !activeHandleDir) return;
                const p = getPos(e);
                const dx = p.x - startX;
                const dy = p.y - startY;

                if (isDragging) {
                    st.textOffsetX = Math.round(initOffX + dx);
                    st.textOffsetY = Math.round(initOffY + dy);
                    box.style.left = `calc(50% - ${st.textBoxWidth / 2}px + ${st.textOffsetX}px)`;
                    box.style.top = `calc(50% - ${st.textBoxHeight / 2}px + ${st.textOffsetY}px)`;
                } else if (activeHandleDir) {
                    let nw = initBoxW;
                    let nh = initBoxH;

                    if (activeHandleDir.includes('r')) nw = Math.max(60, initBoxW + dx);
                    if (activeHandleDir.includes('l')) nw = Math.max(60, initBoxW - dx);
                    if (activeHandleDir.includes('b')) nh = Math.max(26, initBoxH + dy);
                    if (activeHandleDir.includes('t')) nh = Math.max(26, initBoxH - dy);

                    st.textBoxWidth = Math.round(nw);
                    st.textBoxHeight = Math.round(nh);

                    const scaleFactor = Math.sqrt((nw * nh) / (initBoxW * initBoxH));
                    let nextFont = Math.max(9, Math.min(28, initFontSize * scaleFactor));
                    st.fontSize = parseFloat(nextFont.toFixed(1));

                    box.style.width = `${st.textBoxWidth}px`;
                    box.style.height = `${st.textBoxHeight}px`;
                    box.style.left = `calc(50% - ${st.textBoxWidth / 2}px + ${st.textOffsetX}px)`;
                    box.style.top = `calc(50% - ${st.textBoxHeight / 2}px + ${st.textOffsetY}px)`;
                    demoText.style.fontSize = `${st.fontSize}px`;
                    if (fsInput) fsInput.value = st.fontSize.toFixed(1);
                }
                if (e.cancelable) e.preventDefault();
            }, { passive: false });

            window.addEventListener('touchend', () => { isDragging = false; activeHandleDir = null; });
        }

        // ================= 阶段 3：虚拟实景试穿 =================
        function renderStep3VirtualChat() {
            const userAvatar = (typeof window.getPlayerAvatarSafe === 'function') 
                ? window.getPlayerAvatarSafe() 
                : 'assets/icons/chat.png';
            
            let npcAvatar = 'assets/icons/chat.png';
            if (window.G && window.G.npcs) {
                const firstNpc = Object.values(window.G.npcs)[0];
                if (firstNpc) npcAvatar = firstNpc.avatarUrl || firstNpc.avatar || 'assets/icons/chat.png';
            }

            const activeShape = localStorage.getItem('mcyt_active_avatar_shape') || 'circle';
            const activeFrameId = localStorage.getItem('mcyt_active_decor_frame') || 'frame_none';
            const framesList = (typeof window.getStoredDecorFrames === 'function') ? window.getStoredDecorFrames() : [];
            const activeFrameObj = framesList.find(f => f.id === activeFrameId) || null;

            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:360px;max-height:94vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:14px;font-weight:700;color:#222;">第 3 步：虚拟实景 8 点变形试穿</span>
                        <button onclick="document.getElementById('nineSliceDiyModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                    </div>
                    <div style="font-size:11px;color:#666;margin-bottom:10px;line-height:1.4;">
                        拉动绿色 <b>8 个手柄</b>自适应拉伸气泡；按住气泡空白处可<b>独立挪移屏幕位置</b>！
                    </div>

                    <div id="vChatStage" style="position:relative;background:#ededed;border-radius:12px;padding:16px 10px;margin-bottom:12px;display:flex;flex-direction:column;gap:16px;min-height:240px;box-sizing:border-box;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden;">
                        
                        <div style="display:flex;justify-content:flex-start;align-items:flex-start;gap:8px;width:100%;">
                            ${renderWorkshopStageAvatar(npcAvatar, activeShape, activeFrameObj, 38)}
                            <div style="max-width:78%;display:flex;flex-direction:column;align-items:flex-start;">
                                <div id="vBubbleNpc" class="v-stage-bubble" data-side="npc" style="position:relative;display:inline-flex;align-items:center;width:${state.boxWidth}px;height:${state.boxHeight}px;border-style:solid;border-width:${state.npc.borderWidth}px;border-image:url('${state.npc.url || state.user.url}') ${sliceCss(state.npc)} fill stretch;-webkit-border-image:url('${state.npc.url || state.user.url}') ${sliceCss(state.npc)} fill stretch;padding:${padCss(state.npc)};color:${state.npc.textColor};box-sizing:border-box;word-break:break-word;font-size:${state.fontSize}px;line-height:1.4;transform:translate(${state.npcOffsetX}px, ${state.npcOffsetY}px) scale(${state.scale});cursor:move;touch-action:none;">
                                    <div style="width:100%;text-align:${state.textAlign};pointer-events:none;">只在中间拉伸，装饰角色无损！</div>
                                    <div class="bubble-8-frame" data-side="npc" style="display:none;position:absolute;inset:-3px;border:1.5px dashed #07c160;border-radius:4px;pointer-events:none;">
                                        ${build8PointHandlesHtml('b8')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style="display:flex;justify-content:flex-end;align-items:flex-start;gap:8px;width:100%;">
                            <div style="max-width:78%;display:flex;flex-direction:column;align-items:flex-end;">
                                <div id="vBubbleUser" class="v-stage-bubble" data-side="user" style="position:relative;display:inline-flex;align-items:center;width:${state.boxWidth}px;height:${state.boxHeight}px;border-style:solid;border-width:${state.user.borderWidth}px;border-image:url('${state.user.url}') ${sliceCss(state.user)} fill stretch;-webkit-border-image:url('${state.user.url}') ${sliceCss(state.user)} fill stretch;padding:${padCss(state.user)};color:${state.user.textColor};box-sizing:border-box;word-break:break-word;font-size:${state.fontSize}px;line-height:1.4;transform:translate(${state.userOffsetX}px, ${state.userOffsetY}px) scale(${state.scale});cursor:move;touch-action:none;">
                                    <div style="width:100%;text-align:${state.textAlign};pointer-events:none;">按字位置排版，消除虚胖留白～</div>
                                    <div class="bubble-8-frame" data-side="user" style="display:block;position:absolute;inset:-3px;border:1.5px dashed #07c160;border-radius:4px;pointer-events:none;">
                                        ${build8PointHandlesHtml('b8')}
                                    </div>
                                </div>
                            </div>
                            ${renderWorkshopStageAvatar(userAvatar, activeShape, activeFrameObj, 38)}
                        </div>
                    </div>

                    <div style="margin-bottom:12px;">
                        <input id="step3NameInput" type="text" placeholder="气泡名称" value="${escapeHtml(state.name)}" style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #ddd;font-size:12px;outline:none;">
                    </div>

                    <div style="display:flex;gap:8px;">
                        <button id="btnStep3Prev" style="flex:1;padding:10px;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;font-size:12px;color:#555;cursor:pointer;">返回上一步</button>
                        <button id="btnStep3ConfirmSave" style="flex:1.6;padding:10px;background:#07c160;border:none;border-radius:8px;font-size:12.5px;color:#fff;font-weight:600;cursor:pointer;">完成并保存选用</button>
                    </div>
                </div>
            `;

            bindStep3VirtualChatInteraction(modal, state);

            modal.querySelector('#step3NameInput').oninput = (e) => { state.name = e.target.value; };
            modal.querySelector('#btnStep3Prev').onclick = () => { state.step = 2; renderStage(); };
            
            modal.querySelector('#btnStep3ConfirmSave').onclick = async () => {
                const finalName = state.name.trim() || '自适应气泡';
                const itemToSave = {
                    id: state.id,
                    name: finalName,
                    author: state.author || '玩家自制',
                    type: 'nine_slice',
                    scale: state.scale,
                    fontSize: state.fontSize,
                    textAlign: state.textAlign || 'left',
                    fontFamily: state.fontFamily,

                    textOffsetX: state.textOffsetX,
                    textOffsetY: state.textOffsetY,
                    textBoxWidth: state.textBoxWidth,
                    textBoxHeight: state.textBoxHeight,

                    boxWidth: state.boxWidth,
                    boxHeight: state.boxHeight,

                    userOffsetX: state.userOffsetX,
                    userOffsetY: state.userOffsetY,
                    npcOffsetX: state.npcOffsetX,
                    npcOffsetY: state.npcOffsetY,

                    mirrorNpcFromUser: state.mirrorNpcFromUser,
                    userBorderImage: state.user.url,
                    npcBorderImage: state.mirrorNpcFromUser ? state.npc.url : state.user.url,
                    userSlice: sliceCss(state.user),
                    npcSlice: state.mirrorNpcFromUser ? sliceCss(state.npc) : sliceCss(state.user),
                    userPadding: padCss(state.user),
                    npcPadding: state.mirrorNpcFromUser ? padCss(state.npc) : padCss(state.user),
                    userBorderWidth: state.user.borderWidth,
                    npcBorderWidth: state.mirrorNpcFromUser ? state.npc.borderWidth : state.user.borderWidth,
                    userTextColor: state.user.textColor,
                    npcTextColor: state.npc.textColor,
                    isBuiltin: false
                };

                await window.saveCustomBubbleAsync(itemToSave);
                localStorage.setItem('mcyt_active_decor_bubble', itemToSave.id);

                modal.remove();
                refreshDecorView();
                if (typeof showToast === 'function') showToast('气泡已成功保存并启用！');
            };
        }

        // 阶段 3 交互
        function bindStep3VirtualChatInteraction(modalRoot, st) {
            const bubbles = modalRoot.querySelectorAll('.v-stage-bubble');
            const bUser = modalRoot.querySelector('#vBubbleUser');
            const bNpc = modalRoot.querySelector('#vBubbleNpc');

            let activeSide = 'user';
            let isMovingBubble = false;
            let activeHandleDir = null;
            let startX = 0, startY = 0;
            let initBoxW = st.boxWidth, initBoxH = st.boxHeight;
            let initOffX = 0, initOffY = 0;

            const getPos = (e) => (e.touches && e.touches[0]) ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };

            function updateStageView() {
                if (bUser) {
                    bUser.style.width = `${st.boxWidth}px`;
                    bUser.style.height = `${st.boxHeight}px`;
                    bUser.style.transform = `translate(${st.userOffsetX}px, ${st.userOffsetY}px) scale(${st.scale})`;
                }
                if (bNpc) {
                    bNpc.style.width = `${st.boxWidth}px`;
                    bNpc.style.height = `${st.boxHeight}px`;
                    bNpc.style.transform = `translate(${st.npcOffsetX}px, ${st.npcOffsetY}px) scale(${st.scale})`;
                }
            }

            function selectBubbleSide(side) {
                activeSide = side;
                modalRoot.querySelectorAll('.bubble-8-frame').forEach(f => {
                    const isTarget = (f.getAttribute('data-side') === side);
                    f.style.display = isTarget ? 'block' : 'none';
                });
            }

            selectBubbleSide('user');

            bubbles.forEach(b => {
                b.addEventListener('touchstart', (e) => {
                    if (e.target.closest('.b8-handle')) return;
                    const side = b.getAttribute('data-side');
                    selectBubbleSide(side);
                    isMovingBubble = true;
                    activeHandleDir = null;
                    const p = getPos(e);
                    startX = p.x; startY = p.y;
                    initOffX = (side === 'user') ? st.userOffsetX : st.npcOffsetX;
                    initOffY = (side === 'user') ? st.userOffsetY : st.npcOffsetY;
                }, { passive: false });
            });

            modalRoot.querySelectorAll('.b8-handle').forEach(h => {
                h.addEventListener('touchstart', (e) => {
                    activeHandleDir = h.getAttribute('data-dir');
                    isMovingBubble = false;
                    const p = getPos(e);
                    startX = p.x; startY = p.y;
                    initBoxW = st.boxWidth; initBoxH = st.boxHeight;
                    e.stopPropagation();
                    e.preventDefault();
                }, { passive: false });
            });

            window.addEventListener('touchmove', (e) => {
                if (!isMovingBubble && !activeHandleDir) return;
                const p = getPos(e);
                const dx = p.x - startX;
                const dy = p.y - startY;

                if (isMovingBubble) {
                    if (activeSide === 'user') {
                        st.userOffsetX = Math.round(initOffX + dx);
                        st.userOffsetY = Math.round(initOffY + dy);
                    } else {
                        st.npcOffsetX = Math.round(initOffX + dx);
                        st.npcOffsetY = Math.round(initOffY + dy);
                    }
                    updateStageView();
                } else if (activeHandleDir) {
                    let nw = initBoxW;
                    let nh = initBoxH;

                    if (activeHandleDir.includes('r')) nw = Math.max(70, initBoxW + dx);
                    if (activeHandleDir.includes('l')) nw = Math.max(70, initBoxW - dx);
                    if (activeHandleDir.includes('b')) nh = Math.max(30, initBoxH + dy);
                    if (activeHandleDir.includes('t')) nh = Math.max(30, initBoxH - dy);

                    st.boxWidth = Math.round(nw);
                    st.boxHeight = Math.round(nh);
                    updateStageView();
                }
                if (e.cancelable) e.preventDefault();
            }, { passive: false });

            window.addEventListener('touchend', () => { isMovingBubble = false; activeHandleDir = null; });
        }

        // 阶段 1 切片四条虚线拖动绑定
        function bindNineSliceHandles(modalRoot, cfg) {
            const container = modalRoot.querySelector('#nsStageContainer');
            if (!container) return;
            const lineTop = modalRoot.querySelector('#nsLineTop');
            const lineBottom = modalRoot.querySelector('#nsLineBottom');
            const lineLeft = modalRoot.querySelector('#nsLineLeft');
            const lineRight = modalRoot.querySelector('#nsLineRight');

            let dragTarget = null;
            const getPos = (e) => (e.touches && e.touches[0]) ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };

            function onMove(e) {
                if (!dragTarget) return;
                const rect = container.getBoundingClientRect();
                const pos = getPos(e);
                const minGap = 6;
                if (dragTarget === 'top') {
                    let val = Math.max(0, Math.min(100 - cfg.slice.bottom - minGap, ((pos.y - rect.top) / rect.height) * 100));
                    cfg.slice.top = Math.round(val);
                    lineTop.style.top = `${cfg.slice.top}%`;
                } else if (dragTarget === 'bottom') {
                    let val = Math.max(0, Math.min(100 - cfg.slice.top - minGap, 100 - ((pos.y - rect.top) / rect.height) * 100));
                    cfg.slice.bottom = Math.round(val);
                    lineBottom.style.top = `${100 - cfg.slice.bottom}%`;
                } else if (dragTarget === 'left') {
                    let val = Math.max(0, Math.min(100 - cfg.slice.right - minGap, ((pos.x - rect.left) / rect.width) * 100));
                    cfg.slice.left = Math.round(val);
                    lineLeft.style.left = `${cfg.slice.left}%`;
                } else if (dragTarget === 'right') {
                    let val = Math.max(0, Math.min(100 - cfg.slice.left - minGap, 100 - ((pos.x - rect.left) / rect.width) * 100));
                    cfg.slice.right = Math.round(val);
                    lineRight.style.left = `${100 - cfg.slice.right}%`;
                }
                if (e.cancelable) e.preventDefault();
            }
            function onEnd() { dragTarget = null; }

            [['top', lineTop], ['bottom', lineBottom], ['left', lineLeft], ['right', lineRight]].forEach(([key, el]) => {
                if (!el) return;
                el.addEventListener('touchstart', (e) => { dragTarget = key; e.preventDefault(); }, { passive: false });
            });

            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('touchend', onEnd);
        }

        renderStage();
    };

    /**
     * 固定框选画框工坊
     */
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
            fontSize: (bubbleObj && bubbleObj.fontSize) ? bubbleObj.fontSize : 13.5,
            textAlign: bubbleObj?.textAlign || 'left',
            fontFamily: (bubbleObj && bubbleObj.fontFamily) ? bubbleObj.fontFamily : '',
            userOffsetX: bubbleObj?.userOffsetX || 0,
            userOffsetY: bubbleObj?.userOffsetY || 0,
            npcOffsetX: bubbleObj?.npcOffsetX || 0,
            npcOffsetY: bubbleObj?.npcOffsetY || 0,
            mirrorNpcFromUser: (bubbleObj && bubbleObj.mirrorNpcFromUser !== undefined) ? bubbleObj.mirrorNpcFromUser : true,
            user: {
                url: bubbleObj?.visualConfig?.user?.url || initialUrl || '',
                rect: bubbleObj?.visualConfig?.user?.rect || { left: 20, top: 20, width: 60, height: 60 },
                color: bubbleObj?.visualConfig?.user?.color || bubbleObj?.userTextColor || '#000000',
                align: bubbleObj?.visualConfig?.user?.align || 'left'
            },
            npc: {
                url: bubbleObj?.visualConfig?.npc?.url || initialUrl || '',
                rect: bubbleObj?.visualConfig?.npc?.rect || { left: 20, top: 20, width: 60, height: 60 },
                color: bubbleObj?.visualConfig?.npc?.color || bubbleObj?.npcTextColor || '#000000',
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

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:350px;max-height:92vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span style="font-size:14px;font-weight:600;color:#222;">画框框选工坊</span>
                    <button onclick="document.getElementById('visualBoxDiyModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                </div>
                <div id="visualBoxStageContainer" style="position:relative;width:100%;background:#ebebeb;border-radius:10px;overflow:hidden;margin-bottom:12px;display:flex;align-items:center;justify-content:center;min-height:200px;user-select:none;touch-action:none;">
                    <img src="${state.user.url}" style="width:100%;max-width:280px;height:auto;display:block;pointer-events:none;" onerror="this.style.display='none';" />
                    <div id="visualDragBox" style="position:absolute;left:${state.user.rect.left}%;top:${state.user.rect.top}%;width:${state.user.rect.width}%;height:${state.user.rect.height}%;background:rgba(7, 193, 96, 0.22);border:2px dashed #07c160;border-radius:6px;cursor:move;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${state.textAlign === 'center' ? 'center' : (state.textAlign === 'right' ? 'flex-end' : 'flex-start')};padding:4px;overflow:hidden;touch-action:none;">
                        <span style="font-size:${state.fontSize}px;color:${state.user.color};line-height:1.3;pointer-events:none;word-break:break-word;text-align:${state.textAlign};">对白文字预览</span>
                    </div>
                </div>
                <button id="btnSaveVisualBubble" style="width:100%;padding:10px;background:#07c160;border:none;border-radius:6px;font-size:12.5px;color:#fff;font-weight:600;cursor:pointer;">保存并选用</button>
            </div>
        `;

        modal.querySelector('#btnSaveVisualBubble').onclick = async () => {
            const itemToSave = {
                id: state.id,
                name: state.name,
                author: state.author,
                type: 'visual_box',
                scale: state.scale,
                fontSize: state.fontSize,
                textAlign: state.textAlign || 'left',
                fontFamily: state.fontFamily,
                userOffsetX: state.userOffsetX,
                userOffsetY: state.userOffsetY,
                npcOffsetX: state.npcOffsetX,
                npcOffsetY: state.npcOffsetY,
                mirrorNpcFromUser: state.mirrorNpcFromUser,
                userTextColor: state.user.color,
                npcTextColor: state.npc.color,
                visualConfig: { user: { ...state.user, align: state.textAlign }, npc: { ...state.npc, align: state.textAlign } },
                isBuiltin: false
            };
            await window.saveCustomBubbleAsync(itemToSave);
            localStorage.setItem('mcyt_active_decor_bubble', itemToSave.id);
            modal.remove();
            refreshDecorView();
            if (typeof showToast === 'function') showToast('画框气泡已保存！');
        };
    };

    /**
     * 🌟 导出气泡 JSON 文件（标准 Base64 编码，彻底根除 bad base-64 报错）
     */
    window.exportSingleBubble = function (bubbleId) {
        const bubbles = window.getStoredDecorBubbles();
        const b = bubbles.find(x => x.id === bubbleId);
        if (!b) return;

        const exportPayload = { 
            format: 'mcyt_chat_bubble_v2', 
            version: '4.0', 
            bubble: { ...b, id: 'bubble_shared_' + Date.now() } 
        };
        const jsonStr = JSON.stringify(exportPayload, null, 2);

        try {
            const base64Content = btoa(unescape(encodeURIComponent(jsonStr)));
            const dataUrl = `data:application/json;base64,${base64Content}`;

            const safeName = (b.name || 'bubble').replace(/[\\/:*?"<>|]/g, '_');
            const fileName = `bubble_${safeName}_${Date.now()}.json`;

            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            if (typeof showToast === 'function') showToast('已发起下载，请留意通知栏或 Download 目录');
        } catch (err) {
            console.error('[Bubble] Base64 下载异常，弹窗提供复制备选:', err);
            promptCopyBubbleJson(jsonStr);
        }
    };

    /**
     * 辅助兜底：当环境完全封杀文件下载时提供一键复制
     */
    function promptCopyBubbleJson(jsonStr) {
        let modal = document.getElementById('bubbleFallbackExportModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bubbleFallbackExportModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:320px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="font-size:14px;font-weight:600;color:#222;margin-bottom:8px;">气泡配置代码</div>
                <div style="font-size:11px;color:#888;margin-bottom:8px;">设备已拦截直接下载，可直接复制此配置分享：</div>
                <textarea readonly style="width:100%;box-sizing:border-box;min-height:120px;padding:8px;border-radius:6px;border:1px solid #ddd;font-size:10.5px;font-family:monospace;resize:none;background:#f9f9f9;margin-bottom:12px;">${escapeHtml(jsonStr)}</textarea>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('bubbleFallbackExportModal').remove()" style="flex:1;padding:8px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#666;cursor:pointer;">关闭</button>
                    <button id="btnCopyFallbackJson" style="flex:1.4;padding:8px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">一键复制</button>
                </div>
            </div>
        `;
        modal.querySelector('#btnCopyFallbackJson').onclick = () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(jsonStr).then(() => {
                    if (typeof showToast === 'function') showToast('已复制到剪贴板！');
                    modal.remove();
                });
            }
        };
    }

    function refreshDecorView() {
        const sub = document.getElementById('themeAppSubContent');
        if (sub && typeof window.renderChatDecorTheme === 'function') {
            window.renderChatDecorTheme(sub);
        }
    }

    // 模块冷启动预热装载 IndexedDB
    window.loadStoredDecorBubblesAsync();

})();
