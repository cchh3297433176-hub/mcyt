/**
 * js/apps/theme/theme-chat-bubble.js
 * 微信装扮中心模块（超级气泡工坊独立中枢）
 * 
 * 核心升级：
 *  1. 彻底消灭滑条：全程手势触控驱动（图片级文字选框拉动手柄缩放、直接拖拽对齐）
 *  2. 虚拟实景试穿：角色与用户气泡各自手指自由拖拽定位，拉动手柄共通微调宽窄大小
 *  3. 镜像底层修复：Canvas 物理像素级水平翻转底图，切片边界自动对调，双轨无损存入 IndexedDB
 *  4. 移植主题同款正等边三角 HSV 动态色轮与水滴取色
 *  5. 全局核心渲染器 window.buildDecorBubbleHtml 零穿模保障
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
            userOffsetX: 0,
            userOffsetY: 0,
            npcOffsetX: 0,
            npcOffsetY: 0,
            isBuiltin: true
        }
    ];

    window._decorBubblesCache = [...DEFAULT_BUBBLES];
    let _bubblesLoadedPromise = null;

    /**
     * 异步预装载气泡（IndexedDB 驱动）
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
     * 🌟 Canvas 真实像素级水平翻转底图（绝不使用 CSS scaleX(-1) 造成穿模）
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
     * 🌟 全局气泡 HTML 核心渲染器（单聊、群聊、试穿舞台共用）
     */
    window.buildDecorBubbleHtml = function (textHtml, isSelf, bubbleId, customClass = '') {
        const bubbles = window.getStoredDecorBubbles();
        const b = bubbles.find(x => x.id === bubbleId) || bubbles[0] || DEFAULT_BUBBLES[0];
        const scale = (b && b.scale !== undefined) ? b.scale : 1.0;
        const fontSize = (b && b.fontSize) ? b.fontSize : 14.5;
        const fontFamilyCss = (b && b.fontFamily) ? `font-family: ${b.fontFamily};` : '';
        
        // 角色与用户位置独立解耦
        const offX = isSelf ? (b.userOffsetX || 0) : (b.npcOffsetX || 0);
        const offY = isSelf ? (b.userOffsetY || 0) : (b.npcOffsetY || 0);
        const origin = isSelf ? 'center right' : 'center left';

        // 1. 固定框选画框气泡
        if (b && b.type === 'visual_box' && b.visualConfig) {
            const sideCfg = isSelf ? b.visualConfig.user : (b.visualConfig.npc || b.visualConfig.user);
            const bgUrl = sideCfg?.url || b.visualConfig.user?.url || '';
            let rect = sideCfg?.rect || { left: 15, top: 15, width: 70, height: 70 };
            const textColor = sideCfg?.color || '#000000';
            const textAlign = sideCfg?.align || 'left';

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

        // 2. 点九图自适应拉伸气泡（双轨真实底图渲染，彻底消除负 scale）
        if (b && b.type === 'nine_slice') {
            const imgUrl = isSelf ? (b.userBorderImage || b.borderImage) : (b.npcBorderImage || b.userBorderImage || b.borderImage);
            const slice = isSelf ? (b.userSlice || b.slice || '30% 30% 30% 30%') : (b.npcSlice || b.userSlice || b.slice || '30% 30% 30% 30%');
            const padding = isSelf ? (b.userPadding || b.padding || '8px 12px') : (b.npcPadding || b.padding || '8px 12px');
            const borderWidth = isSelf ? (b.userBorderWidth || b.borderWidth || 14) : (b.npcBorderWidth || b.borderWidth || 14);
            const textColor = isSelf ? (b.userTextColor || b.textColor || '#111111') : (b.npcTextColor || b.textColor || '#222222');

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
     * 渲染气泡样式库独立区块（嵌入装扮中心底部）
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
                            <div style="font-size:10.5px;color:#777;">从相册选取图片，纯手势拖拽调节与试穿</div>
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

    // AI 生成与 JSON 导入
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
                <textarea id="aiBubblePromptInput" placeholder="输入设计意向..." style="width:100%;box-sizing:border-box;height:75px;padding:8px 10px;border-radius:6px;border:1px solid #ddd;font-size:12px;outline:none;resize:none;margin-bottom:10px;"></textarea>
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

                const sysPrompt = `你是一个精通CSS设计的专家。设计一对聊天气泡。输出标准合法 JSON: {"name":"气泡名","userStyle":"我方CSS","npcStyle":"对方CSS"}`;

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

        box.addEventListener('touchstart', (e) => {
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

        modal.querySelector('#btnBPaletteConfirm').onclick = () => {
            if (typeof onSelectCallback === 'function') onSelectCallback(curHex);
            modal.remove();
        };

        renderWheel();
    };

    /**
     * 🌟🌟🌟 点九图自适应气泡向导工坊（纯触控手势版，绝无滑条）
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
            step: 1, // 1: 切片, 2: 选框手势缩放文字, 3: 实景手势拖动气泡
            id: bubbleObj ? bubbleObj.id : ('bubble_' + Date.now()),
            name: bubbleObj ? bubbleObj.name : (initialName || '自适应气泡'),
            author: bubbleObj ? (bubbleObj.author || '') : '玩家自制',
            scale: (bubbleObj && bubbleObj.scale !== undefined) ? bubbleObj.scale : 1.0,
            fontSize: (bubbleObj && bubbleObj.fontSize) ? bubbleObj.fontSize : 14.5,
            fontFamily: (bubbleObj && bubbleObj.fontFamily) ? bubbleObj.fontFamily : '',
            
            // 角色与用户位置彻底独立
            userOffsetX: bubbleObj?.userOffsetX || bubbleObj?.offsetX || 0,
            userOffsetY: bubbleObj?.userOffsetY || bubbleObj?.offsetY || 0,
            npcOffsetX: bubbleObj?.npcOffsetX || bubbleObj?.offsetX || 0,
            npcOffsetY: bubbleObj?.npcOffsetY || bubbleObj?.offsetY || 0,

            // 文字在气泡内的相对偏移
            textOffsetX: 0,
            textOffsetY: 0,

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

        // 核心：强制 Canvas 生成真实镜像切图
        async function ensureNpcMirroredImage() {
            if (state.mirrorNpcFromUser && state.user.url) {
                state.npc.url = await flipImageHorizontallyAsync(state.user.url);
                // 左右切片百分比互换，确保尾巴圆角完全对齐
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
                        <span style="font-size:14px;font-weight:700;color:#222;">第 1 步：九图切片</span>
                        <button onclick="document.getElementById('nineSliceDiyModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                    </div>
                    <div style="font-size:11px;color:#666;margin-bottom:10px;line-height:1.4;">
                        拖动四条虚线圈住圆角和尾巴，中间十字区自动伸展。
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

                        <button id="btnStep1Next" style="width:100%;padding:11px;background:#07c160;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">下一步：手势调节文字 ➔</button>
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

        // ================= 阶段 2：像放大图片一样拖动手柄缩放文字与移动位置 =================
        function renderStep2TextTransform() {
            const cfg = state.user;
            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:350px;max-height:92vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:14px;font-weight:700;color:#222;">第 2 步：文字手势缩放与拖动</span>
                        <button onclick="document.getElementById('nineSliceDiyModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                    </div>
                    <div style="font-size:11px;color:#666;margin-bottom:12px;line-height:1.4;">
                        点击文字出现绿色选框。按住文字可<b>随意拖动位置</b>；拉动右下角绿点<b>像缩放图片一样放大缩小字号</b>！
                    </div>

                    <!-- 触控拖拽舞台 -->
                    <div id="step2TransformStage" style="position:relative;background:#ededed;border-radius:12px;padding:32px 14px;display:flex;justify-content:center;align-items:center;margin-bottom:14px;min-height:160px;touch-action:none;user-select:none;-webkit-user-select:none;">
                        
                        <!-- 气泡本体 -->
                        <div id="step2BubbleContainer" style="position:relative;display:inline-block;border-style:solid;border-width:${cfg.borderWidth}px;border-image:url('${cfg.url}') ${sliceCss(cfg)} fill stretch;-webkit-border-image:url('${cfg.url}') ${sliceCss(cfg)} fill stretch;padding:${padCss(cfg)};min-width:110px;max-width:240px;box-sizing:border-box;">
                            
                            <!-- 文字选框（带手柄） -->
                            <div id="step2TextTransformBox" style="position:relative;transform:translate(${state.textOffsetX}px, ${state.textOffsetY}px);border:1.5px dashed #07c160;border-radius:4px;padding:4px 6px;cursor:move;touch-action:none;">
                                
                                <span id="step2TextDemo" style="display:block;font-size:${state.fontSize}px;color:${cfg.textColor};line-height:1.4;word-break:break-word;pointer-events:none;">
                                    你好呀！按住我随意拖动，拉右下角放缩！
                                </span>

                                <!-- 缩放手柄（类似修图软件） -->
                                <div id="step2TextResizeHandle" style="position:absolute;right:-7px;bottom:-7px;width:16px;height:16px;background:#07c160;border:2px solid #fff;border-radius:50%;cursor:se-resize;touch-action:none;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>
                            </div>
                        </div>
                    </div>

                    <!-- 文字颜色快捷修改 -->
                    <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;">
                        <div>
                            <span style="font-size:12px;font-weight:600;color:#333;">文字颜色</span>
                            <span style="font-size:10px;color:#888;display:block;">当前字号: <span id="step2FontSizeBadge" style="color:#07c160;font-weight:bold;">${state.fontSize.toFixed(1)}px</span></span>
                        </div>
                        <div id="btnStep2ColorTrigger" style="display:flex;align-items:center;gap:6px;cursor:pointer;background:#fff;padding:4px 10px;border-radius:6px;border:1px solid #ddd;">
                            <div style="width:18px;height:18px;border-radius:4px;background:${cfg.textColor};border:1px solid #ccc;"></div>
                            <span style="font-size:11px;font-family:monospace;color:#333;">${cfg.textColor}</span>
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;">
                        <button id="btnStep2Prev" style="flex:1;padding:10px;background:#f5f5f5;border:1px solid #ddd;border-radius:8px;font-size:12px;color:#555;cursor:pointer;">上一步</button>
                        <button id="btnStep2Next" style="flex:1.6;padding:10px;background:#07c160;border:none;border-radius:8px;font-size:12.5px;color:#fff;font-weight:600;cursor:pointer;">进入虚拟聊天试穿 ➔</button>
                    </div>
                </div>
            `;

            bindTextTransformInteraction(modal, state);

            modal.querySelector('#btnStep2ColorTrigger').onclick = () => {
                window.openWechatColorPickerModal(cfg.textColor, (col) => {
                    cfg.textColor = col;
                    renderStep2TextTransform();
                });
            };

            modal.querySelector('#btnStep2Prev').onclick = () => { state.step = 1; renderStage(); };
            modal.querySelector('#btnStep2Next').onclick = async () => {
                await ensureNpcMirroredImage();
                state.step = 3;
                renderStage();
            };
        }

        // 绑定文字的拖动移动与拉动手柄放大缩小
        function bindTextTransformInteraction(modalRoot, st) {
            const box = modalRoot.querySelector('#step2TextTransformBox');
            const handle = modalRoot.querySelector('#step2TextResizeHandle');
            const demoText = modalRoot.querySelector('#step2TextDemo');
            const badge = modalRoot.querySelector('#step2FontSizeBadge');
            if (!box || !handle || !demoText) return;

            let isDragging = false;
            let isScaling = false;
            let startX = 0, startY = 0;
            let initialFontSize = st.fontSize;
            let initialOffX = st.textOffsetX;
            let initialOffY = st.textOffsetY;

            const getPos = (e) => (e.touches && e.touches[0]) ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };

            // 1. 拖动文字位置
            box.addEventListener('touchstart', (e) => {
                if (e.target === handle) return;
                isDragging = true;
                const p = getPos(e);
                startX = p.x; startY = p.y;
                initialOffX = st.textOffsetX;
                initialOffY = st.textOffsetY;
            }, { passive: false });

            // 2. 拉动手柄缩放字号（像放大图片一样）
            handle.addEventListener('touchstart', (e) => {
                isScaling = true;
                const p = getPos(e);
                startX = p.x; startY = p.y;
                initialFontSize = st.fontSize;
                e.stopPropagation();
                e.preventDefault();
            }, { passive: false });

            window.addEventListener('touchmove', (e) => {
                if (!isDragging && !isScaling) return;
                const p = getPos(e);
                const dx = p.x - startX;
                const dy = p.y - startY;

                if (isDragging) {
                    st.textOffsetX = Math.round(initialOffX + dx);
                    st.textOffsetY = Math.round(initialOffY + dy);
                    box.style.transform = `translate(${st.textOffsetX}px, ${st.textOffsetY}px)`;
                } else if (isScaling) {
                    // 右下拖动增大，左上拖动缩小
                    const delta = (dx + dy) * 0.12;
                    let nextFont = Math.max(10, Math.min(26, initialFontSize + delta));
                    st.fontSize = parseFloat(nextFont.toFixed(1));
                    demoText.style.fontSize = `${st.fontSize}px`;
                    if (badge) badge.textContent = `${st.fontSize}px`;
                }
                if (e.cancelable) e.preventDefault();
            }, { passive: false });

            window.addEventListener('touchend', () => { isDragging = false; isScaling = false; });
        }

        // ================= 阶段 3：虚拟实景聊天（双手势：位置分开拖，宽窄高低手柄共通） =================
        function renderStep3VirtualChat() {
            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:360px;max-height:94vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span style="font-size:14px;font-weight:700;color:#222;">第 3 步：虚拟实景试穿与微调</span>
                        <button onclick="document.getElementById('nineSliceDiyModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                    </div>
                    <div style="font-size:11px;color:#666;margin-bottom:10px;line-height:1.4;">
                        👉 按住气泡可<b>自由拖拽独立位置</b>；拉动选中的绿色手柄可<b>共通调节气泡宽窄与大小</b>！
                    </div>

                    <!-- 1:1 虚拟真实聊天视口 -->
                    <div id="vChatStage" style="position:relative;background:#ededed;border-radius:12px;padding:16px 10px;margin-bottom:12px;display:flex;flex-direction:column;gap:16px;min-height:240px;box-sizing:border-box;touch-action:none;user-select:none;-webkit-user-select:none;overflow:hidden;">
                        
                        <!-- 对方消息（左侧，物理镜像底图） -->
                        <div style="display:flex;align-items:flex-start;gap:8px;width:100%;">
                            <div style="width:36px;height:36px;border-radius:6px;background:#ff9800;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:bold;">对方</div>
                            <div style="flex:1;display:flex;justify-content:flex-start;">
                                <div id="vBubbleNpc" class="v-interactive-bubble" data-side="npc" style="position:relative;display:inline-block;border-style:solid;border-width:${state.npc.borderWidth}px;border-image:url('${state.npc.url || state.user.url}') ${sliceCss(state.npc)} fill stretch;-webkit-border-image:url('${state.npc.url || state.user.url}') ${sliceCss(state.npc)} fill stretch;padding:${padCss(state.npc)};color:${state.npc.textColor};max-width:85%;box-sizing:border-box;word-break:break-word;font-size:${state.fontSize}px;line-height:1.45;transform:translate(${state.npcOffsetX}px, ${state.npcOffsetY}px) scale(${state.scale});transform-origin:center left;cursor:move;touch-action:none;">
                                    对方气泡完全镜像对称，位置可以单独拖拽哦！
                                    <!-- 共通宽窄控制手柄 -->
                                    <div class="v-resize-handle" data-side="npc" style="position:absolute;right:-8px;bottom:-8px;width:16px;height:16px;background:#07c160;border:2px solid #fff;border-radius:50%;cursor:se-resize;display:none;touch-action:none;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>
                                </div>
                            </div>
                        </div>

                        <!-- 我方消息（右侧） -->
                        <div style="display:flex;align-items:flex-start;flex-direction:row-reverse;gap:8px;width:100%;">
                            <div style="width:36px;height:36px;border-radius:6px;background:#07c160;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:bold;">我</div>
                            <div style="flex:1;display:flex;justify-content:flex-end;">
                                <div id="vBubbleUser" class="v-interactive-bubble" data-side="user" style="position:relative;display:inline-block;border-style:solid;border-width:${state.user.borderWidth}px;border-image:url('${state.user.url}') ${sliceCss(state.user)} fill stretch;-webkit-border-image:url('${state.user.url}') ${sliceCss(state.user)} fill stretch;padding:${padCss(state.user)};color:${state.user.textColor};max-width:85%;box-sizing:border-box;word-break:break-word;font-size:${state.fontSize}px;line-height:1.45;transform:translate(${state.userOffsetX}px, ${state.userOffsetY}px) scale(${state.scale});transform-origin:center right;cursor:move;touch-action:none;">
                                    太棒了！两边宽窄大小共通，位置还能单独挪动！
                                    <!-- 共通宽窄控制手柄 -->
                                    <div class="v-resize-handle" data-side="user" style="position:absolute;left:-8px;bottom:-8px;width:16px;height:16px;background:#07c160;border:2px solid #fff;border-radius:50%;cursor:sw-resize;display:none;touch-action:none;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>
                                </div>
                            </div>
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

            bindStep3TouchInteraction(modal, state);

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
                    
                    // 角色与用户位置独立落盘
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

        // 绑定第 3 步纯手势操作：位置独立拖拽，宽窄高低共通缩放
        function bindStep3TouchInteraction(modalRoot, st) {
            const bubbles = modalRoot.querySelectorAll('.v-interactive-bubble');
            const bUser = modalRoot.querySelector('#vBubbleUser');
            const bNpc = modalRoot.querySelector('#vBubbleNpc');

            let activeSide = null; // 'user' | 'npc'
            let isMoving = false;
            let isResizing = false;
            let startX = 0, startY = 0;
            let initialOffX = 0, initialOffY = 0;
            let initialScale = st.scale;

            const getPos = (e) => (e.touches && e.touches[0]) ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };

            function updateTransforms() {
                if (bUser) bUser.style.transform = `translate(${st.userOffsetX}px, ${st.userOffsetY}px) scale(${st.scale})`;
                if (bNpc) bNpc.style.transform = `translate(${st.npcOffsetX}px, ${st.npcOffsetY}px) scale(${st.scale})`;
            }

            function setActiveBubble(side) {
                activeSide = side;
                modalRoot.querySelectorAll('.v-resize-handle').forEach(h => {
                    h.style.display = (h.getAttribute('data-side') === side) ? 'block' : 'none';
                });
                modalRoot.querySelectorAll('.v-interactive-bubble').forEach(b => {
                    b.style.outline = (b.getAttribute('data-side') === side) ? '1.5px dashed #07c160' : 'none';
                });
            }

            // 默认激活用户气泡
            setActiveBubble('user');

            bubbles.forEach(b => {
                b.addEventListener('touchstart', (e) => {
                    const side = b.getAttribute('data-side');
                    setActiveBubble(side);

                    if (e.target.classList.contains('v-resize-handle')) {
                        // 拉动手柄调节宽窄大小（共通）
                        isResizing = true;
                        const p = getPos(e);
                        startX = p.x; startY = p.y;
                        initialScale = st.scale;
                        e.stopPropagation();
                        e.preventDefault();
                    } else {
                        // 拖动气泡移动位置（独立）
                        isMoving = true;
                        const p = getPos(e);
                        startX = p.x; startY = p.y;
                        initialOffX = (side === 'user') ? st.userOffsetX : st.npcOffsetX;
                        initialOffY = (side === 'user') ? st.userOffsetY : st.npcOffsetY;
                    }
                }, { passive: false });
            });

            window.addEventListener('touchmove', (e) => {
                if (!isMoving && !isResizing) return;
                const p = getPos(e);
                const dx = p.x - startX;
                const dy = p.y - startY;

                if (isMoving && activeSide) {
                    if (activeSide === 'user') {
                        st.userOffsetX = Math.round(initialOffX + dx);
                        st.userOffsetY = Math.round(initialOffY + dy);
                    } else {
                        st.npcOffsetX = Math.round(initialOffX + dx);
                        st.npcOffsetY = Math.round(initialOffY + dy);
                    }
                    updateTransforms();
                } else if (isResizing) {
                    // 共通手柄调节：往外拉变大变宽，往里收变小
                    const factor = (activeSide === 'user') ? (-dx + dy) : (dx + dy);
                    let nextScale = Math.max(0.65, Math.min(1.45, initialScale + factor * 0.005));
                    st.scale = parseFloat(nextScale.toFixed(2));
                    updateTransforms();
                }
                if (e.cancelable) e.preventDefault();
            }, { passive: false });

            window.addEventListener('touchend', () => { isMoving = false; isResizing = false; });
        }

        // 阶段 1 切片四条虚线拖动手势
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
            fontFamily: (bubbleObj && bubbleObj.fontFamily) ? bubbleObj.fontFamily : '',
            userOffsetX: bubbleObj?.userOffsetX || 0,
            userOffsetY: bubbleObj?.userOffsetY || 0,
            npcOffsetX: bubbleObj?.npcOffsetX || 0,
            npcOffsetY: bubbleObj?.npcOffsetY || 0,
            mirrorNpcFromUser: (bubbleObj && bubbleObj.mirrorNpcFromUser !== undefined) ? bubbleObj.mirrorNpcFromUser : true,
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

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:350px;max-height:92vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span style="font-size:14px;font-weight:600;color:#222;">画框框选工坊</span>
                    <button onclick="document.getElementById('visualBoxDiyModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                </div>
                <div id="visualBoxStageContainer" style="position:relative;width:100%;background:#ebebeb;border-radius:10px;overflow:hidden;margin-bottom:12px;display:flex;align-items:center;justify-content:center;min-height:200px;user-select:none;touch-action:none;">
                    <img src="${state.user.url}" style="width:100%;max-width:280px;height:auto;display:block;pointer-events:none;" onerror="this.style.display='none';" />
                    <div id="visualDragBox" style="position:absolute;left:${state.user.rect.left}%;top:${state.user.rect.top}%;width:${state.user.rect.width}%;height:${state.user.rect.height}%;background:rgba(7, 193, 96, 0.22);border:2px dashed #07c160;border-radius:6px;cursor:move;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:4px;overflow:hidden;touch-action:none;">
                        <span style="font-size:${state.fontSize}px;color:${state.user.color};line-height:1.3;pointer-events:none;word-break:break-word;">对白文字预览</span>
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
                userOffsetX: state.userOffsetX,
                userOffsetY: state.userOffsetY,
                npcOffsetX: state.npcOffsetX,
                npcOffsetY: state.npcOffsetY,
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
    };

    /**
     * 导出气泡 JSON
     */
    window.exportSingleBubble = function (bubbleId) {
        const bubbles = window.getStoredDecorBubbles();
        const b = bubbles.find(x => x.id === bubbleId);
        if (!b) return;

        const exportPayload = { format: 'mcyt_chat_bubble_v2', version: '3.0', bubble: { ...b, id: 'bubble_shared_' + Date.now() } };
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
