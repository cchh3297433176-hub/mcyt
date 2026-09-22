/**
 * js/apps/theme/theme-chat-bubble.js
 * 微信装扮中心模块（超级气泡工坊独立中枢）
 * 
 * 架构：
 *  1. 气泡样式库折叠栏（极简 + 与 ▲/▼ 图标）
 *  2. 加号弹出菜单：AI生成气泡 / 导入已有设置(JSON与CSS) / 制作新气泡
 *  3. 图源选择弹窗（相册选取 / 图片直链）
 *  4. 🌟 点九图自适应拉伸气泡：三阶段沉浸式向导（切片保护 -> 文字排版与位置拖拽 -> 虚拟实景聊天宽窄与位置微调）
 *  5. 🌟 对方镜像体系彻底重构：Canvas 底层水平翻转，坚决消除 CSS scaleX(-1) 导致的穿模飘出屏幕与字形颠倒
 *  6. 🌟 移植主题同款正等边三角 HSV 动态色轮与水滴取色
 *  7. localForage (IndexedDB) 驱动存储，无配额上限，支持高清大图
 *  8. 全局核心渲染器 window.buildDecorBubbleHtml
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
            fontFamily: '',
            offsetX: 0,
            offsetY: 0,
            isBuiltin: true
        }
    ];

    window._decorBubblesCache = [...DEFAULT_BUBBLES];
    let _bubblesLoadedPromise = null;

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
            console.error('[Bubble] 保存气泡至 IndexedDB 发生异常:', err);
            if (typeof showToast === 'function') showToast('保存失败：存储异常');
            return false;
        }
    };

    /**
     * 🌟 Canvas 底层图象水平镜像翻转生成器（彻底解决负 Scale 飘出屏幕问题）
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
                    console.warn('[Bubble] Canvas 镜像翻转异常，沿用原图:', e);
                    resolve(base64OrUrl);
                }
            };
            img.onerror = () => resolve(base64OrUrl);
            img.src = base64OrUrl;
        });
    }

    /**
     * 🌟 全局气泡 HTML 核心渲染器（单聊、群聊、试穿舞台共用）
     */
    window.buildDecorBubbleHtml = function (textHtml, isSelf, bubbleId, customClass = '') {
        const bubbles = window.getStoredDecorBubbles();
        const b = bubbles.find(x => x.id === bubbleId) || bubbles[0] || DEFAULT_BUBBLES[0];
        const scale = (b && b.scale !== undefined) ? b.scale : 1.0;
        const fontSize = (b && b.fontSize) ? b.fontSize : 14.5;
        const fontFamilyCss = (b && b.fontFamily) ? `font-family: ${b.fontFamily};` : '';
        const offX = (b && b.offsetX !== undefined) ? b.offsetX : 0;
        const offY = (b && b.offsetY !== undefined) ? b.offsetY : 0;
        const origin = isSelf ? 'center right' : 'center left';

        // 1. 固定框选画框气泡
        if (b && b.type === 'visual_box' && b.visualConfig) {
            const isMirror = (!isSelf && b.mirrorNpcFromUser);
            const sideCfg = isMirror 
                ? (b.visualConfig.npc || b.visualConfig.user) 
                : (isSelf ? b.visualConfig.user : b.visualConfig.npc);

            const bgUrl = sideCfg?.url || b.visualConfig.user?.url || '';
            let rect = sideCfg?.rect || { left: 15, top: 15, width: 70, height: 70 };
            const textColor = sideCfg?.color || '#000000';
            const textAlign = sideCfg?.align || (isSelf ? 'left' : 'left');

            if (!bgUrl) {
                return `
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" style="width:fit-content;max-width:100%;padding:8px 12px;border-radius:6px;font-size:${fontSize}px;${fontFamilyCss}line-height:1.5;background:${isSelf ? '#95ec69' : '#fff'};color:#000;border:${isSelf ? 'none' : '1px solid #e0e0e0'};">
                        ${textHtml}
                    </div>
                `;
            }

            return `
                <div class="chat-bubble visual-decor-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" 
                     style="position:relative;display:inline-block;max-width:88%;transform:translate(${offX}px, ${offY}px) scale(${scale});transform-origin:${origin};user-select:none;-webkit-user-select:none;line-height:0;${fontFamilyCss}">
                    <img src="${bgUrl}" style="display:block;width:100%;max-width:280px;height:auto;pointer-events:none;" onerror="this.style.display='none';" />
                    <div style="position:absolute;left:${rect.left}%;top:${rect.top}%;width:${rect.width}%;height:${rect.height}%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${textAlign === 'center' ? 'center' : (textAlign === 'right' ? 'flex-end' : 'flex-start')};overflow:hidden;word-break:break-word;line-height:1.45;font-size:${fontSize}px;color:${textColor};text-align:${textAlign};padding:2px 4px;">
                        <div style="max-height:100%;overflow-y:auto;width:100%;">${textHtml}</div>
                    </div>
                </div>
            `;
        }

        // 2. 点九图自适应拉伸气泡（彻底消除负 scale，使用真实的独立镜像切图）
        if (b && b.type === 'nine_slice') {
            const isMirror = (!isSelf && b.mirrorNpcFromUser);
            const imgUrl = isMirror 
                ? (b.npcBorderImage || b.userBorderImage || b.borderImage)
                : (isSelf ? (b.userBorderImage || b.borderImage) : (b.npcBorderImage || b.borderImage));

            const slice = (isMirror ? (b.npcSlice || b.userSlice || b.slice) : (isSelf ? (b.userSlice || b.slice) : (b.npcSlice || b.slice))) || '30% 30% 30% 30%';
            const padding = (isMirror ? (b.npcPadding || b.userPadding || b.padding) : (isSelf ? (b.userPadding || b.padding) : (b.npcPadding || b.padding))) || '8px 12px';
            const borderWidth = (isMirror ? (b.npcBorderWidth || b.userBorderWidth || b.borderWidth) : (isSelf ? (b.userBorderWidth || b.borderWidth) : (b.npcBorderWidth || b.borderWidth))) || 14;
            const textColor = (isMirror ? (b.npcTextColor || b.userTextColor || b.textColor) : (isSelf ? (b.userTextColor || b.textColor) : (b.npcTextColor || b.textColor))) || (isSelf ? '#111111' : '#222222');

            if (!imgUrl) {
                return `
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" style="width:fit-content;max-width:100%;padding:8px 12px;border-radius:6px;font-size:${fontSize}px;${fontFamilyCss}line-height:1.5;background:${isSelf ? '#95ec69' : '#fff'};color:#000;border:${isSelf ? 'none' : '1px solid #e0e0e0'};">
                        ${textHtml}
                    </div>
                `;
            }

            return `
                <div class="chat-bubble nine-slice-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" 
                     style="display:inline-block;border-style:solid;border-width:${borderWidth}px;border-image:url('${imgUrl}') ${slice} fill stretch;-webkit-border-image:url('${imgUrl}') ${slice} fill stretch;padding:${padding};background:transparent;color:${textColor};width:fit-content;max-width:86%;box-sizing:border-box;word-break:break-word;font-size:${fontSize}px;${fontFamilyCss}line-height:1.45;transform:translate(${offX}px, ${offY}px) scale(${scale});transform-origin:${origin};">
                    ${textHtml}
                </div>
            `;
        }

        // 3. 纯 CSS 气泡
        const css = isSelf 
            ? (b.userStyle || 'background-color: #95ec69; color: #000;') 
            : (b.npcStyle || 'background-color: #ffffff; color: #000; border: 1px solid #e7e7e7;');

        return `
            <div class="chat-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" 
                 style="width:fit-content;max-width:86%;display:inline-block;padding:8px 12px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:${fontSize}px;${fontFamilyCss}line-height:1.5;word-break:break-word;${css};transform:translate(${offX}px, ${offY}px) scale(${scale});transform-origin:${origin};">
                ${textHtml}
            </div>
        `;
    };

    /**
     * 渲染气泡样式库独立区块（嵌入装扮中心）
     */
    window.renderChatBubbleSection = function (container) {
        if (!container) return;

        const activeBubbleId = localStorage.getItem('mcyt_active_decor_bubble') || 'bubble_default';
        const bubbles = window.getStoredDecorBubbles();

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
                                <div onclick="window.selectDecorBubble('${b.id}')" style="background:${isCur ? '#e8f7ed' : '#f9f9f9'};border:1px solid ${isCur ? '#07c160' : '#eee'};border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                                    <div style="display:flex;flex-direction:column;gap:2px;max-width:58%;">
                                        <div style="display:flex;align-items:center;gap:6px;">
                                            <span style="font-size:12.5px;font-weight:600;color:#222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(b.name)}</span>
                                            <span style="font-size:9.5px;padding:1px 5px;border-radius:3px;background:${b.type === 'visual_box' ? '#e1f3d8' : (b.type === 'nine_slice' ? '#e8f4ff' : '#f0f0f0')};color:${b.type === 'visual_box' ? '#529b2e' : (b.type === 'nine_slice' ? '#2b73af' : '#666')};">
                                                ${b.type === 'visual_box' ? '画框' : (b.type === 'nine_slice' ? '点九图' : 'CSS')}
                                            </span>
                                            ${b.mirrorNpcFromUser ? `<span style="font-size:9px;padding:1px 4px;border-radius:2px;background:#fdf6ec;color:#e6a23c;">镜像</span>` : ''}
                                        </div>
                                        <span style="font-size:10px;color:#888;">缩放 ${Math.round(curScale * 100)}% · 字号 ${curFont}px ${b.author ? ('· ' + escapeHtml(b.author)) : ''}</span>
                                    </div>
                                    <div style="display:flex;align-items:center;gap:6px;">
                                        ${b.type === 'visual_box' ? `
                                            <button onclick="event.stopPropagation(); window.openVisualBoxDiyModal('${b.id}')" title="编辑气泡" style="background:none;border:none;color:#576b95;font-size:11px;cursor:pointer;padding:2px 4px;">编辑</button>
                                        ` : ''}
                                        ${b.type === 'nine_slice' ? `
                                            <button onclick="event.stopPropagation(); window.openNineSliceDiyModal('${b.id}')" title="编辑气泡" style="background:none;border:none;color:#576b95;font-size:11px;cursor:pointer;padding:2px 4px;">编辑</button>
                                        ` : ''}
                                        <button onclick="event.stopPropagation(); window.openBubbleFontModal('${b.id}')" title="设置气泡文字与字体" style="background:none;border:none;color:#576b95;font-size:11px;cursor:pointer;padding:2px 4px;">字体</button>
                                        <button onclick="event.stopPropagation(); window.exportSingleBubble('${b.id}')" title="导出气泡分享" style="background:none;border:none;color:#07c160;font-size:11px;cursor:pointer;padding:2px 4px;">导出</button>
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
            </div>
        `;
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
                    <button onclick="document.getElementById('bubbleActionMenuModal').remove(); window.openAiGenerateBubbleModal();" style="width:100%;padding:11px 14px;background:#f0f9eb;border:1px solid #c2e7b0;border-radius:8px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;">
                        <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#07c160;fill:none;stroke-width:2;"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
                        <div>
                            <div style="font-size:13px;font-weight:600;color:#07c160;">AI 生成气泡</div>
                            <div style="font-size:10.5px;color:#777;">输入自然语言风格，由 AI 自动编写气泡</div>
                        </div>
                    </button>
                    <button onclick="document.getElementById('bubbleActionMenuModal').remove(); window.openSelectBubbleSourceModal();" style="width:100%;padding:11px 14px;background:#f9f9f9;border:1px solid #e5e5e5;border-radius:8px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;">
                        <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#333;fill:none;stroke-width:2;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <div>
                            <div style="font-size:13px;font-weight:600;color:#222;">制作新气泡</div>
                            <div style="font-size:10.5px;color:#777;">从相册选取图片制作点九图自适应或画框</div>
                        </div>
                    </button>
                    <button onclick="document.getElementById('bubbleActionMenuModal').remove(); window.openImportBubbleHubModal();" style="width:100%;padding:11px 14px;background:#f9f9f9;border:1px solid #e5e5e5;border-radius:8px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;">
                        <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#333;fill:none;stroke-width:2;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <div>
                            <div style="font-size:13px;font-weight:600;color:#222;">导入已有设置</div>
                            <div style="font-size:10.5px;color:#777;">导入分享的 JSON 气泡文件或 CSS 代码片段</div>
                        </div>
                    </button>
                </div>
            </div>
        `;
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

    // AI 生成气泡
    window.openAiGenerateBubbleModal = function () {
        let modal = document.getElementById('aiGenerateBubbleModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'aiGenerateBubbleModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;padding:20px;';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:320px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="font-size:14px;font-weight:600;color:#222;">AI 智能生成气泡</span>
                    <button onclick="document.getElementById('aiGenerateBubbleModal').remove()" style="background:none;border:none;color:#999;font-size:16px;cursor:pointer;">✕</button>
                </div>
                <textarea id="aiBubblePromptInput" placeholder="输入设计意向，如：抹茶星空、复古信笺..." style="width:100%;box-sizing:border-box;height:75px;padding:8px 10px;border-radius:6px;border:1px solid #ddd;font-size:12px;outline:none;resize:none;margin-bottom:10px;"></textarea>
                <div id="aiBubbleStatus" style="font-size:11px;color:#07c160;margin-bottom:10px;display:none;">正在调度 AI 编写设计代码...</div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('aiGenerateBubbleModal').remove()" style="flex:1;padding:9px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;">取消</button>
                    <button id="btnRunAiGenerateBubble" style="flex:1.4;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">开始生成</button>
                </div>
            </div>
        `;

        modal.querySelector('#btnRunAiGenerateBubble').onclick = async () => {
            const prompt = (modal.querySelector('#aiBubblePromptInput')?.value || '').trim();
            if (!prompt) return;

            const statusEl = modal.querySelector('#aiBubbleStatus');
            const btn = modal.querySelector('#btnRunAiGenerateBubble');
            statusEl.style.display = 'block';
            btn.disabled = true;

            try {
                const aiConfig = JSON.parse(localStorage.getItem('mc_yt_ai_config') || '{}');
                if (!aiConfig.apiKey) throw new Error('请先在系统设置中配置 AI ApiKey');

                const sysPrompt = `你是一个精通CSS界面设计的专家。请根据用户的设计意图，设计一对聊天气泡（我方发送与对方接收）。输出标准合法 JSON：
{"name":"气泡名","userStyle":"我方CSS","npcStyle":"对方CSS"}`;

                const resp = await fetch((aiConfig.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.apiKey}` },
                    body: JSON.stringify({
                        model: aiConfig.model || 'gpt-3.5-turbo',
                        messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: prompt }],
                        temperature: 0.7
                    })
                });

                if (!resp.ok) throw new Error('请求失败');
                const data = await resp.json();
                let rawText = data.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(rawText);

                const newBubble = {
                    id: 'bubble_ai_' + Date.now(),
                    name: parsed.name || 'AI定制气泡',
                    author: 'AI Designer',
                    type: 'css',
                    scale: 1.0,
                    fontSize: 14.5,
                    userStyle: parsed.userStyle || 'background:#95ec69;color:#000;',
                    npcStyle: parsed.npcStyle || 'background:#fff;color:#000;border:1px solid #eee;',
                    isBuiltin: false
                };

                await window.saveCustomBubbleAsync(newBubble);
                localStorage.setItem('mcyt_active_decor_bubble', newBubble.id);
                modal.remove();
                refreshDecorView();
                if (typeof showToast === 'function') showToast('AI 气泡生成成功！');
            } catch (err) {
                statusEl.style.display = 'none';
                btn.disabled = false;
                if (typeof showToast === 'function') showToast('生成失败: ' + err.message);
            }
        };
    };

    // 导入已有设置
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

    // 色彩算法工具
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
     * 🌟 HSV 专业色盘
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
                    <span style="font-size:14px;font-weight:700;color:#222;">气泡文字颜色</span>
                    <button onclick="document.getElementById('wechatColorPickerModal').remove()" style="background:none;border:none;color:#999;font-size:16px;cursor:pointer;">✕</button>
                </div>
                <div style="background:#222222;border-radius:14px;padding:12px;margin-bottom:12px;box-sizing:border-box;">
                    <div id="bHsvWheelBox" style="width:190px;height:190px;margin:0 auto 8px auto;position:relative;user-select:none;touch-action:none;">
                        <canvas id="bHsvWheelCanvas" width="380" height="380" style="width:100%;height:100%;border-radius:50%;display:block;touch-action:none;"></canvas>
                        <div id="bHsvRingHandle" style="position:absolute;width:20px;height:20px;border:2.5px solid #ffffff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.5);transform:translate(-50%,-50%);pointer-events:none;box-sizing:border-box;"></div>
                        <div id="bHsvTriangleHandle" style="position:absolute;width:16px;height:16px;border:2.5px solid #ffffff;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.5);transform:translate(-50%,-50%);pointer-events:none;box-sizing:border-box;"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:0 2px 8px 2px;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <div id="bPalettePreviewBox" style="width:24px;height:24px;border-radius:5px;border:1px solid rgba(255,255,255,0.4);background:${curHex};"></div>
                            <span id="bCurrentHexBadge" style="font-size:12px;font-family:monospace;color:#fff;background:rgba(255,255,255,0.16);padding:2px 7px;border-radius:5px;">${curHex.toUpperCase()}</span>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px;padding:0 2px;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span style="font-size:11px;color:#aaa;width:10px;font-weight:bold;">H</span>
                            <input type="range" id="bSliderH" min="0" max="360" value="${hsvState.h}" style="flex:1;height:4px;border-radius:2px;appearance:none;outline:none;background:linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);">
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span style="font-size:11px;color:#aaa;width:10px;font-weight:bold;">S</span>
                            <input type="range" id="bSliderS" min="0" max="100" value="${hsvState.s}" style="flex:1;height:4px;border-radius:2px;appearance:none;outline:none;">
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span style="font-size:11px;color:#aaa;width:10px;font-weight:bold;">V</span>
                            <input type="range" id="bSliderV" min="0" max="100" value="${hsvState.v}" style="flex:1;height:4px;border-radius:2px;appearance:none;outline:none;">
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

        let activeDrag = null;
        box.addEventListener('touchstart', (e) => {
            activeDrag = 'wheel';
            const rect = box.getBoundingClientRect();
            const px = (e.touches[0].clientX - rect.left) * (size / rect.width);
            const py = (e.touches[0].clientY - rect.top) * (size / rect.width);
            const dist = Math.sqrt((px - center) ** 2 + (py - center) ** 2);
            if (dist >= innerR && dist <= outerR) {
                let angle = Math.atan2(py - center, px - center) * 180 / Math.PI + 90;
                if (angle < 0) angle += 360;
                hsvState.h = Math.round(angle) % 360;
                renderWheel();
            }
        });

        modal.querySelectorAll('.b-preset-color-block').forEach(el => {
            el.onclick = () => {
                hsvState = bubbleHexToHsv(el.getAttribute('data-col'));
                renderWheel();
            };
        });

        modal.querySelector('#bSliderH').oninput = (e) => { hsvState.h = parseInt(e.target.value); renderWheel(); };
        modal.querySelector('#bSliderS').oninput = (e) => { hsvState.s = parseInt(e.target.value); updateHandlesAndUi(); };
        modal.querySelector('#bSliderV').oninput = (e) => { hsvState.v = parseInt(e.target.value); updateHandlesAndUi(); };

        modal.querySelector('#btnBPaletteConfirm').onclick = () => {
            if (typeof onSelectCallback === 'function') onSelectCallback(curHex);
            modal.remove();
        };

        renderWheel();
    };

    /**
     * 🌟 气泡文字大小与字体弹窗
     */
    window.openBubbleFontModal = function (bubbleId) {
        const bubbles = window.getStoredDecorBubbles();
        const b = bubbles.find(x => x.id === bubbleId);
        if (!b) return;

        let modal = document.getElementById('bubbleFontModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bubbleFontModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;padding:20px;';
            document.body.appendChild(modal);
        }

        let curFont = b.fontSize || 14.5;
        let curFamily = b.fontFamily || '';

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:320px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span style="font-size:14px;font-weight:600;color:#222;">设置文字大小与字体</span>
                    <button onclick="document.getElementById('bubbleFontModal').remove()" style="background:none;border:none;color:#999;font-size:16px;cursor:pointer;">✕</button>
                </div>
                <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:12px;">
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                        <span>字号缩放</span>
                        <span style="color:#07c160;font-weight:600;" id="fontModalValText">${curFont}px</span>
                    </div>
                    <input type="range" id="fontModalSlider" min="11" max="22" step="0.5" value="${curFont}" style="width:100%;accent-color:#07c160;">
                </div>
                <div style="margin-bottom:12px;">
                    <div style="font-size:11px;color:#555;margin-bottom:4px;">自定义 Font-Family</div>
                    <input type="text" id="fontCustomInput" value="${escapeHtml(curFamily)}" placeholder="例如: 'PingFang SC', sans-serif" style="width:100%;box-sizing:border-box;padding:7px 8px;border-radius:6px;border:1px solid #ddd;font-size:11.5px;outline:none;">
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('bubbleFontModal').remove()" style="flex:1;padding:9px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#666;cursor:pointer;">取消</button>
                    <button id="btnSaveFontSettings" style="flex:1.4;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">保存</button>
                </div>
            </div>
        `;

        modal.querySelector('#fontModalSlider').oninput = (e) => {
            curFont = parseFloat(e.target.value);
            modal.querySelector('#fontModalValText').textContent = `${curFont}px`;
        };

        modal.querySelector('#btnSaveFontSettings').onclick = async () => {
            b.fontSize = curFont;
            b.fontFamily = modal.querySelector('#fontCustomInput').value.trim();
            await window.saveCustomBubbleAsync(b);
            modal.remove();
            refreshDecorView();
            if (typeof showToast === 'function') showToast('字体排版已更新');
        };
    };

    /**
     * 🌟🌟🌟 点九图自适应气泡向导工坊（重构：三阶段体验）
     * 阶段 1：切片保护
     * 阶段 2：文字排版与拖拽位置
     * 阶段 3：虚拟实景聊天宽窄与位置微调
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
            step: 1, // 1: 切片, 2: 文字排版与位置, 3: 虚拟实景聊天
            id: bubbleObj ? bubbleObj.id : ('bubble_' + Date.now()),
            name: bubbleObj ? bubbleObj.name : (initialName || '自适应气泡'),
            author: bubbleObj ? (bubbleObj.author || '') : '玩家自制',
            scale: (bubbleObj && bubbleObj.scale !== undefined) ? bubbleObj.scale : 1.0,
            fontSize: (bubbleObj && bubbleObj.fontSize) ? bubbleObj.fontSize : 14.5,
            fontFamily: (bubbleObj && bubbleObj.fontFamily) ? bubbleObj.fontFamily : '',
            offsetX: (bubbleObj && bubbleObj.offsetX !== undefined) ? bubbleObj.offsetX : 0,
            offsetY: (bubbleObj && bubbleObj.offsetY !== undefined) ? bubbleObj.offsetY : 0,
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
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:100000;padding:12px;box-sizing:border-box;';
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
            else if (state.step === 2) renderStep2TextLayout();
            else if (state.step === 3) renderStep3VirtualChat();
        }

        // ================= 阶段 1：切片保护 =================
        function renderStep1Slice() {
            const cfg = state.user;
            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:350px;max-height:92vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="font-size:14px;font-weight:700;color:#222;">第 1 步：九图切片保护</span>
                        <button onclick="document.getElementById('nineSliceDiyModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                    </div>
                    <div style="font-size:11px;color:#666;margin-bottom:10px;line-height:1.4;">
                        拖动虚线框住四个圆角和尾巴，中间十字区域随文字自动伸展。
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

                        <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:10px;">
                            <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                                <span>切片保护边框（防止圆角变形）</span>
                                <span style="color:#07c160;font-weight:600;" id="nsBorderWidthVal">${cfg.borderWidth}px</span>
                            </div>
                            <input type="range" id="nsBorderWidthSlider" min="6" max="32" value="${cfg.borderWidth}" style="width:100%;accent-color:#07c160;">
                        </div>

                        <div style="display:flex;justify-content:space-between;align-items:center;background:#f9f9f9;padding:8px 10px;border-radius:8px;border:1px solid #eee;margin-bottom:12px;">
                            <div>
                                <div style="font-size:12px;font-weight:600;color:#333;">对方气泡自动水平镜像</div>
                                <div style="font-size:10px;color:#888;">Canvas 底层镜像，尾巴对称，文字正向</div>
                            </div>
                            <input type="checkbox" id="chkMirrorNpc" ${state.mirrorNpcFromUser ? 'checked' : ''} style="width:18px;height:18px;accent-color:#07c160;">
                        </div>

                        <button id="btnStep1Next" style="width:100%;padding:11px;background:#07c160;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">下一步：调节文字与位置 ➔</button>
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
                modal.querySelector('#nsBorderWidthSlider').oninput = (e) => {
                    cfg.borderWidth = parseInt(e.target.value, 10);
                    modal.querySelector('#nsBorderWidthVal').textContent = `${cfg.borderWidth}px`;
                };
                modal.querySelector('#chkMirrorNpc').onchange = (e) => {
                    state.mirrorNpcFromUser = e.target.checked;
                };
                modal.querySelector('#btnStep1Next').onclick = async () => {
                    await ensureNpcMirroredImage();
                    state.step = 2;
                    renderStage();
                };
            }
        }

        // ================= 阶段 2：文字排版与拖拽位置 =================
        function renderStep2TextLayout() {
            const cfg = state.user;
            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:350px;max-height:92vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="font-size:14px;font-weight:700;color:#222;">第 2 步：文字排版与内边距</span>
                        <button onclick="document.getElementById('nineSliceDiyModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                    </div>
                    <div style="font-size:11px;color:#666;margin-bottom:10px;">
                        拖动滑块调整文字边距与大小，让文字完美居中在气泡安全区内。
                    </div>

                    <!-- 动态预览区 -->
                    <div style="background:#ededed;border-radius:10px;padding:24px 16px;display:flex;justify-content:center;align-items:center;margin-bottom:12px;min-height:110px;">
                        <div id="step2BubblePreview" style="display:inline-block;border-style:solid;border-width:${cfg.borderWidth}px;border-image:url('${cfg.url}') ${sliceCss(cfg)} fill stretch;-webkit-border-image:url('${cfg.url}') ${sliceCss(cfg)} fill stretch;padding:${padCss(cfg)};color:${cfg.textColor};max-width:240px;box-sizing:border-box;word-break:break-word;font-size:${state.fontSize}px;line-height:1.45;">
                            你好呀！这是我的专属气泡～
                        </div>
                    </div>

                    <!-- 字号缩放 -->
                    <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:8px;">
                        <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                            <span>文字字号</span>
                            <span style="color:#07c160;font-weight:600;" id="valStep2FontSize">${state.fontSize}px</span>
                        </div>
                        <input type="range" id="sliderStep2FontSize" min="11" max="20" step="0.5" value="${state.fontSize}" style="width:100%;accent-color:#07c160;">
                    </div>

                    <!-- 文字左右与上下边距 -->
                    <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:8px;">
                        <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                            <span>文字左右边距</span>
                            <span style="color:#07c160;font-weight:600;" id="valStep2PadH">${cfg.padding.h}px</span>
                        </div>
                        <input type="range" id="sliderStep2PadH" min="4" max="28" value="${cfg.padding.h}" style="width:100%;accent-color:#07c160;margin-bottom:8px;">

                        <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                            <span>文字上下边距</span>
                            <span style="color:#07c160;font-weight:600;" id="valStep2PadV">${cfg.padding.v}px</span>
                        </div>
                        <input type="range" id="sliderStep2PadV" min="2" max="22" value="${cfg.padding.v}" style="width:100%;accent-color:#07c160;">
                    </div>

                    <!-- 文字颜色 -->
                    <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;">
                        <span style="font-size:11.5px;color:#555;font-weight:600;">文字颜色</span>
                        <div id="btnStep2ColorTrigger" style="display:flex;align-items:center;gap:6px;cursor:pointer;background:#fff;padding:3px 8px;border-radius:6px;border:1px solid #ddd;">
                            <div style="width:16px;height:16px;border-radius:4px;background:${cfg.textColor};border:1px solid #ccc;"></div>
                            <span style="font-size:11px;font-family:monospace;color:#333;">${cfg.textColor}</span>
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;">
                        <button id="btnStep2Prev" style="flex:1;padding:10px;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;font-size:12px;color:#555;cursor:pointer;">上一步</button>
                        <button id="btnStep2Next" style="flex:1.6;padding:10px;background:#07c160;border:none;border-radius:8px;font-size:12.5px;color:#fff;font-weight:600;cursor:pointer;">进入虚拟聊天试穿 ➔</button>
                    </div>
                </div>
            `;

            function refreshStep2Preview() {
                const el = modal.querySelector('#step2BubblePreview');
                if (!el) return;
                el.style.borderWidth = `${cfg.borderWidth}px`;
                el.style.borderImage = `url('${cfg.url}') ${sliceCss(cfg)} fill stretch`;
                el.style.webkitBorderImage = `url('${cfg.url}') ${sliceCss(cfg)} fill stretch`;
                el.style.padding = padCss(cfg);
                el.style.fontSize = `${state.fontSize}px`;
                el.style.color = cfg.textColor;
            }

            modal.querySelector('#sliderStep2FontSize').oninput = (e) => {
                state.fontSize = parseFloat(e.target.value);
                modal.querySelector('#valStep2FontSize').textContent = `${state.fontSize}px`;
                refreshStep2Preview();
            };
            modal.querySelector('#sliderStep2PadH').oninput = (e) => {
                cfg.padding.h = parseInt(e.target.value, 10);
                modal.querySelector('#valStep2PadH').textContent = `${cfg.padding.h}px`;
                refreshStep2Preview();
            };
            modal.querySelector('#sliderStep2PadV').oninput = (e) => {
                cfg.padding.v = parseInt(e.target.value, 10);
                modal.querySelector('#valStep2PadV').textContent = `${cfg.padding.v}px`;
                refreshStep2Preview();
            };
            modal.querySelector('#btnStep2ColorTrigger').onclick = () => {
                window.openWechatColorPickerModal(cfg.textColor, (col) => {
                    cfg.textColor = col;
                    renderStep2TextLayout();
                });
            };

            modal.querySelector('#btnStep2Prev').onclick = () => { state.step = 1; renderStage(); };
            modal.querySelector('#btnStep2Next').onclick = async () => {
                await ensureNpcMirroredImage();
                state.step = 3;
                renderStage();
            };
        }

        // ================= 阶段 3：虚拟实景聊天微调 =================
        function renderStep3VirtualChat() {
            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:360px;max-height:94vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="font-size:14px;font-weight:700;color:#222;">第 3 步：虚拟实景试穿与微调</span>
                        <button onclick="document.getElementById('nineSliceDiyModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                    </div>

                    <!-- 真实 1:1 虚拟单聊画面 -->
                    <div id="vChatViewport" style="background:#ededed;border-radius:10px;padding:14px 10px;margin-bottom:12px;display:flex;flex-direction:column;gap:12px;max-height:220px;overflow-y:auto;box-sizing:border-box;">
                        <!-- 对方发言（左侧） -->
                        <div style="display:flex;align-items:flex-start;gap:8px;width:100%;">
                            <div style="width:36px;height:36px;border-radius:6px;background:#ff9800;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:bold;">对方</div>
                            <div id="vBubbleNpcContainer" style="flex:1;display:flex;justify-content:flex-start;">
                                <div id="vBubbleNpc" style="display:inline-block;border-style:solid;border-width:${state.npc.borderWidth}px;border-image:url('${state.npc.url || state.user.url}') ${sliceCss(state.npc)} fill stretch;-webkit-border-image:url('${state.npc.url || state.user.url}') ${sliceCss(state.npc)} fill stretch;padding:${padCss(state.npc)};color:${state.npc.textColor};max-width:85%;box-sizing:border-box;word-break:break-word;font-size:${state.fontSize}px;line-height:1.45;transform:translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale});transform-origin:center left;">
                                    收到！我这边的气泡对称翻转正常吗？
                                </div>
                            </div>
                        </div>

                        <!-- 我方发言（右侧） -->
                        <div style="display:flex;align-items:flex-start;flex-direction:row-reverse;gap:8px;width:100%;">
                            <div style="width:36px;height:36px;border-radius:6px;background:#07c160;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:bold;">我</div>
                            <div id="vBubbleUserContainer" style="flex:1;display:flex;justify-content:flex-end;">
                                <div id="vBubbleUser" style="display:inline-block;border-style:solid;border-width:${state.user.borderWidth}px;border-image:url('${state.user.url}') ${sliceCss(state.user)} fill stretch;-webkit-border-image:url('${state.user.url}') ${sliceCss(state.user)} fill stretch;padding:${padCss(state.user)};color:${state.user.textColor};max-width:85%;box-sizing:border-box;word-break:break-word;font-size:${state.fontSize}px;line-height:1.45;transform:translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale});transform-origin:center right;">
                                    非常完美！宽窄刚刚好，完全不会遮挡或者飘出屏幕啦！
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 微调面板：气泡尺寸大小 -->
                    <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:8px;">
                        <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                            <span>气泡整体缩放 (宽窄与尺寸)</span>
                            <span style="color:#07c160;font-weight:600;" id="valStep3Scale">${Math.round(state.scale * 100)}%</span>
                        </div>
                        <input type="range" id="sliderStep3Scale" min="70" max="130" value="${Math.round(state.scale * 100)}" style="width:100%;accent-color:#07c160;">
                    </div>

                    <!-- 微调面板：上下/左右位置微调 -->
                    <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:10px;">
                        <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                            <span>气泡左右位置偏移 (X轴)</span>
                            <span style="color:#07c160;font-weight:600;" id="valStep3OffX">${state.offsetX}px</span>
                        </div>
                        <input type="range" id="sliderStep3OffX" min="-30" max="30" value="${state.offsetX}" style="width:100%;accent-color:#07c160;margin-bottom:8px;">

                        <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                            <span>气泡上下位置偏移 (Y轴)</span>
                            <span style="color:#07c160;font-weight:600;" id="valStep3OffY">${state.offsetY}px</span>
                        </div>
                        <input type="range" id="sliderStep3OffY" min="-20" max="20" value="${state.offsetY}" style="width:100%;accent-color:#07c160;">
                    </div>

                    <div style="margin-bottom:10px;">
                        <input id="step3NameInput" type="text" placeholder="气泡名称" value="${escapeHtml(state.name)}" style="width:100%;box-sizing:border-box;padding:7px 8px;border-radius:6px;border:1px solid #ddd;font-size:12px;outline:none;">
                    </div>

                    <div style="display:flex;gap:8px;">
                        <button id="btnStep3Prev" style="flex:1;padding:10px;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;font-size:12px;color:#555;cursor:pointer;">返回上一步</button>
                        <button id="btnStep3ConfirmSave" style="flex:1.6;padding:10px;background:#07c160;border:none;border-radius:8px;font-size:12.5px;color:#fff;font-weight:600;cursor:pointer;">完成并保存选用</button>
                    </div>
                </div>
            `;

            function refreshStep3Transforms() {
                const u = modal.querySelector('#vBubbleUser');
                const n = modal.querySelector('#vBubbleNpc');
                if (u) u.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;
                if (n) n.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;
            }

            modal.querySelector('#sliderStep3Scale').oninput = (e) => {
                state.scale = parseFloat(e.target.value) / 100;
                modal.querySelector('#valStep3Scale').textContent = `${Math.round(state.scale * 100)}%`;
                refreshStep3Transforms();
            };
            modal.querySelector('#sliderStep3OffX').oninput = (e) => {
                state.offsetX = parseInt(e.target.value, 10);
                modal.querySelector('#valStep3OffX').textContent = `${state.offsetX}px`;
                refreshStep3Transforms();
            };
            modal.querySelector('#sliderStep3OffY').oninput = (e) => {
                state.offsetY = parseInt(e.target.value, 10);
                modal.querySelector('#valStep3OffY').textContent = `${state.offsetY}px`;
                refreshStep3Transforms();
            };

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
                    fontFamily: state.fontFamily,
                    offsetX: state.offsetX,
                    offsetY: state.offsetY,
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
                    npcTextColor: state.mirrorNpcFromUser ? state.npc.textColor : state.user.textColor,
                    isBuiltin: false
                };

                await window.saveCustomBubbleAsync(itemToSave);
                localStorage.setItem('mcyt_active_decor_bubble', itemToSave.id);

                modal.remove();
                refreshDecorView();
                if (typeof showToast === 'function') showToast('气泡已成功保存并启用！');
            };
        }

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
                el.addEventListener('mousedown', (e) => { dragTarget = key; e.preventDefault(); });
                el.addEventListener('touchstart', (e) => { dragTarget = key; e.preventDefault(); }, { passive: false });
            });

            window.addEventListener('mousemove', onMove);
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('mouseup', onEnd);
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
            fontFamily: (bubbleObj && bubbleObj.fontFamily) ? bubbleObj.fontFamily : '',
            offsetX: (bubbleObj && bubbleObj.offsetX !== undefined) ? bubbleObj.offsetX : 0,
            offsetY: (bubbleObj && bubbleObj.offsetY !== undefined) ? bubbleObj.offsetY : 0,
            mirrorNpcFromUser: (bubbleObj && bubbleObj.mirrorNpcFromUser !== undefined) ? bubbleObj.mirrorNpcFromUser : true,
            activeSide: 'user',
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
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:350px;max-height:92vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <span style="font-size:14px;font-weight:600;color:#222;">画框框选工坊</span>
                        <button onclick="document.getElementById('visualBoxDiyModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                    </div>
                    <div id="visualBoxStageContainer" style="position:relative;width:100%;background:#ebebeb;border-radius:10px;overflow:hidden;margin-bottom:12px;display:flex;align-items:center;justify-content:center;min-height:200px;user-select:none;touch-action:none;">
                        <img src="${curCfg.url}" style="width:100%;max-width:280px;height:auto;display:block;pointer-events:none;" onerror="this.style.display='none';" />
                        <div id="visualDragBox" style="position:absolute;left:${curCfg.rect.left}%;top:${curCfg.rect.top}%;width:${curCfg.rect.width}%;height:${curCfg.rect.height}%;background:rgba(7, 193, 96, 0.22);border:2px dashed #07c160;border-radius:6px;cursor:move;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${curCfg.align === 'center' ? 'center' : (curCfg.align === 'right' ? 'flex-end' : 'flex-start')};padding:4px;overflow:hidden;touch-action:none;">
                            <span style="font-size:${state.fontSize}px;color:${curCfg.color};line-height:1.3;pointer-events:none;word-break:break-word;text-align:${curCfg.align};">对白文字预览</span>
                            <div id="visualResizeHandle" style="position:absolute;right:-1px;bottom:-1px;width:18px;height:18px;background:#07c160;border-radius:4px 0 4px 0;cursor:se-resize;display:flex;align-items:center;justify-content:center;touch-action:none;">
                                <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:#fff;stroke-width:3;"><line x1="20" y1="4" x2="4" y2="20"></line><line x1="20" y1="12" x2="12" y2="20"></line></svg>
                            </div>
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
                    fontFamily: state.fontFamily,
                    offsetX: state.offsetX,
                    offsetY: state.offsetY,
                    mirrorNpcFromUser: state.mirrorNpcFromUser,
                    visualConfig: { user: { ...state.user }, npc: { ...state.npc } },
                    isBuiltin: false
                };
                await window.saveCustomBubbleAsync(itemToSave);
                localStorage.setItem('mcyt_active_decor_bubble', itemToSave.id);
                modal.remove();
                refreshDecorView();
                if (typeof showToast === 'function') showToast('画框气泡已保存！');
            };
        }

        renderStage();
    };

    /**
     * 导出气泡 JSON
     */
    window.exportSingleBubble = function (bubbleId) {
        const bubbles = window.getStoredDecorBubbles();
        const b = bubbles.find(x => x.id === bubbleId);
        if (!b) return;

        const exportPayload = { format: 'mcyt_chat_bubble_v2', version: '2.5', bubble: { ...b, id: 'bubble_shared_' + Date.now() } };
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
                <div style="font-size:14px;font-weight:600;color:#222;margin-bottom:8px;">导出气泡配置</div>
                <textarea readonly style="width:100%;box-sizing:border-box;min-height:120px;padding:8px;border-radius:6px;border:1px solid #ddd;font-size:10.5px;font-family:monospace;resize:none;background:#f9f9f9;margin-bottom:12px;">${escapeHtml(jsonStr)}</textarea>
                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('bubbleExportModal').remove()" style="flex:1;padding:8px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#666;cursor:pointer;">关闭</button>
                    <button id="btnCopyJson" style="flex:1.4;padding:8px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">复制 JSON</button>
                </div>
            </div>
        `;
        modal.querySelector('#btnCopyJson').onclick = () => {
            navigator.clipboard.writeText(jsonStr).then(() => {
                if (typeof showToast === 'function') showToast('已复制到剪贴板！');
            });
        };
    };

    function refreshDecorView() {
        const sub = document.getElementById('themeAppSubContent');
        if (sub && typeof window.renderChatDecorTheme === 'function') {
            window.renderChatDecorTheme(sub);
        }
    }

    // 模块冷启动预热装载 IndexedDB
    window.loadStoredDecorBubblesAsync();

})();
