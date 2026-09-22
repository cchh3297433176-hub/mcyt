/**
 * js/apps/theme/theme-chat-bubble.js
 * 微信装扮中心模块（气泡工坊独立中枢）
 * 
 * 职责：
 *  1. 气泡样式库折叠栏（极简 + 与 ▲/▼ 图标，默认折叠）
 *  2. 加号弹出菜单：AI生成气泡 / 导入已有设置(JSON与CSS) / 制作新气泡
 *  3. 点九图自适应拉伸气泡工坊 & 固定框选画框工坊
 *  4. 对方气泡“延续我方设置并自动水平镜像”翻转体系
 *  5. 文字手势/滑块自由缩放（fontSize、lineHeight、内边距调节）
 *  6. 仿微信白灰微绿调色盘中枢，消除原生丑陋取色器
 *  7. 字体库多轨联动（跟随小手机主题字体 / 选用主题已存字体 / 自定义 CSS 字体）
 *  8. localForage (IndexedDB) 驱动存储，无配额上限，支持高清大图
 *  9. 全局核心渲染器 window.buildDecorBubbleHtml
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
            isBuiltin: true
        }
    ];

    // 内存运行态气泡池
    window._decorBubblesCache = [...DEFAULT_BUBBLES];
    let _bubblesLoadedPromise = null;

    /**
     * 异步预装载气泡（IndexedDB 优先，自动平滑兼容迁移旧 localStorage 数据）
     */
    window.loadStoredDecorBubblesAsync = function () {
        if (_bubblesLoadedPromise) return _bubblesLoadedPromise;

        _bubblesLoadedPromise = (async () => {
            try {
                let list = null;
                if (window.localforage) {
                    list = await window.localforage.getItem('mcyt_decor_bubbles');
                }
                // 平滑迁移旧版 localStorage 数据
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
                console.warn('[Bubble] 读取气泡数据库异常，使用默认预设:', err);
            }
            return window._decorBubblesCache;
        })();

        return _bubblesLoadedPromise;
    };

    // 同步提取当前运行内存气泡列表
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
            let list = window.getStoredDecorBubbles().filter(x => !x.isBuiltin && x.id !== 'bubble_default');
            const idx = list.findIndex(x => x.id === item.id);
            if (idx >= 0) {
                list[idx] = item;
            } else {
                list.push(item);
            }
            window._decorBubblesCache = [...DEFAULT_BUBBLES, ...list];
            if (window.localforage) {
                await window.localforage.setItem('mcyt_decor_bubbles', list);
            }
            // 备份元数据
            try {
                localStorage.setItem('mcyt_decor_bubbles_meta_backup', JSON.stringify(list.map(b => ({ id: b.id, name: b.name }))));
            } catch (_) {}
            return true;
        } catch (err) {
            console.error('[Bubble] 保存气泡发生异常:', err);
            if (typeof showToast === 'function') showToast('保存失败：存储异常');
            return false;
        }
    };

    /**
     * 🌟 全局气泡 HTML 核心渲染器（单聊、群聊、试穿舞台共用）
     */
    window.buildDecorBubbleHtml = function (textHtml, isSelf, bubbleId, customClass = '') {
        const bubbles = window.getStoredDecorBubbles();
        const b = bubbles.find(x => x.id === bubbleId) || bubbles[0] || DEFAULT_BUBBLES[0];
        const scale = (b && b.scale !== undefined) ? b.scale : 1.0;
        const fontSize = (b && b.fontSize) ? b.fontSize : 14.5;
        const fontFamilyCss = (b && b.fontFamily) ? `font-family: ${b.fontFamily};` : '';
        const origin = isSelf ? 'top right' : 'top left';

        // 1. 固定框选画框气泡
        if (b && b.type === 'visual_box' && b.visualConfig) {
            const isMirror = (!isSelf && b.mirrorNpcFromUser);
            const sideCfg = isMirror 
                ? (b.visualConfig.user || b.visualConfig.npc) 
                : (isSelf ? b.visualConfig.user : b.visualConfig.npc);

            const bgUrl = sideCfg?.url || b.visualConfig.user?.url || '';
            let rect = sideCfg?.rect || { left: 15, top: 15, width: 70, height: 70 };

            // 若开启对方自动镜像，将选框左右对调
            if (isMirror) {
                rect = {
                    left: Math.max(0, 100 - rect.left - rect.width),
                    top: rect.top,
                    width: rect.width,
                    height: rect.height
                };
            }

            const textColor = sideCfg?.color || '#000000';
            const textAlign = isMirror 
                ? (sideCfg?.align === 'left' ? 'right' : (sideCfg?.align === 'right' ? 'left' : 'center'))
                : (sideCfg?.align || 'left');

            if (!bgUrl) {
                return `
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" style="width:fit-content;max-width:100%;padding:8px 12px;border-radius:6px;font-size:${fontSize}px;${fontFamilyCss}line-height:1.5;background:${isSelf ? '#95ec69' : '#fff'};color:#000;border:${isSelf ? 'none' : '1px solid #e0e0e0'};">
                        ${textHtml}
                    </div>
                `;
            }

            return `
                <div class="chat-bubble visual-decor-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" 
                     style="position:relative;display:inline-block;max-width:88%;transform:scale(${scale});transform-origin:${origin};user-select:none;-webkit-user-select:none;line-height:0;${fontFamilyCss}">
                    <img src="${bgUrl}" style="display:block;width:100%;max-width:280px;height:auto;pointer-events:none;${isMirror ? 'transform:scaleX(-1);' : ''}" onerror="this.style.display='none';" />
                    <div style="position:absolute;left:${rect.left}%;top:${rect.top}%;width:${rect.width}%;height:${rect.height}%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${textAlign === 'center' ? 'center' : (textAlign === 'right' ? 'flex-end' : 'flex-start')};overflow:hidden;word-break:break-word;line-height:1.45;font-size:${fontSize}px;color:${textColor};text-align:${textAlign};padding:2px 4px;">
                        <div style="max-height:100%;overflow-y:auto;width:100%;">${textHtml}</div>
                    </div>
                </div>
            `;
        }

        // 2. 点九图自适应拉伸气泡
        if (b && b.type === 'nine_slice') {
            const isMirror = (!isSelf && b.mirrorNpcFromUser);
            const imgUrl = isMirror 
                ? (b.userBorderImage || b.borderImage)
                : (isSelf ? (b.userBorderImage || b.borderImage) : (b.npcBorderImage || b.borderImage));

            let slice = (isSelf ? (b.userSlice || b.slice) : (b.npcSlice || b.slice)) || '35% 35% 35% 35%';
            let padding = (isSelf ? (b.userPadding || b.padding) : (b.npcPadding || b.padding)) || '10px 14px';
            const borderWidth = (isSelf ? (b.userBorderWidth || b.borderWidth) : (b.npcBorderWidth || b.borderWidth)) || 16;
            const textColor = (isSelf ? (b.userTextColor || b.textColor) : (b.npcTextColor || b.textColor)) || (isSelf ? '#111111' : '#222222');

            // 镜像切割线处理
            if (isMirror) {
                const parts = (b.userSlice || b.slice || '35% 35% 35% 35%').replace(/%/g, '').trim().split(/\s+/).map(Number);
                const [t = 35, r = 35, bot = 35, l = 35] = parts;
                slice = `${t}% ${l}% ${bot}% ${r}%`;
            }

            if (!imgUrl) {
                return `
                    <div class="chat-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" style="width:fit-content;max-width:100%;padding:8px 12px;border-radius:6px;font-size:${fontSize}px;${fontFamilyCss}line-height:1.5;background:${isSelf ? '#95ec69' : '#fff'};color:#000;border:${isSelf ? 'none' : '1px solid #e0e0e0'};">
                        ${textHtml}
                    </div>
                `;
            }

            return `
                <div class="chat-bubble nine-slice-bubble ${isSelf ? 'self-bubble' : ''} ${customClass}" 
                     style="border-style: solid; border-width: ${borderWidth}px; border-image: url('${imgUrl}') ${slice} fill stretch; padding: ${padding}; background: transparent; color: ${textColor}; width:fit-content; max-width:100%; min-width:${borderWidth * 2}px; box-sizing:border-box; word-break:break-word; font-size:${fontSize}px; ${fontFamilyCss} line-height:1.5; transform:scale(${scale}); transform-origin:${origin}; ${isMirror ? 'box-reflect:none;' : ''}">
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
                 style="width:fit-content;max-width:100%;display:inline-block;padding:8px 12px;border-radius:6px;box-shadow:0 1px 2px rgba(0,0,0,0.05);font-size:${fontSize}px;${fontFamilyCss}line-height:1.5;word-break:break-word;${css};transform:scale(${scale});transform-origin:${origin};">
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
                <!-- 顶栏：标题 + 极简加号与折叠图标 -->
                <div onclick="window.toggleDecorBubblesCollapse()" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                    <div>
                        <div style="font-size:13.5px;font-weight:600;color:#222;">气泡样式库</div>
                        <div style="font-size:11.5px;color:#888;">点九图自适应拉伸、画框框选与AI定制</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <button onclick="event.stopPropagation(); window.openBubbleActionMenu();" title="新建与导入气泡" style="width:26px;height:26px;border-radius:50%;border:none;background:#07c160;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;">
                            <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:#fff;stroke-width:2.5;stroke-linecap:round;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                        <span id="decorBubblesCollapseArrow" style="font-size:11px;color:#888;user-select:none;transition:transform 0.2s ease;">▼</span>
                    </div>
                </div>

                <!-- 气泡抽屉主体（默认折叠隐藏） -->
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
                                        ${b.type === 'css' && !b.isBuiltin ? `
                                            <button onclick="event.stopPropagation(); window.openEditCssBubbleModal('${b.id}')" title="编辑CSS" style="background:none;border:none;color:#576b95;font-size:11px;cursor:pointer;padding:2px 4px;">编辑</button>
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

    // 抽屉折叠展开切换
    window.toggleDecorBubblesCollapse = function () {
        const body = document.getElementById('decorBubblesBody');
        const arrow = document.getElementById('decorBubblesCollapseArrow');
        if (!body || !arrow) return;
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
        arrow.textContent = isHidden ? '▲' : '▼';
    };

    // 气泡选用
    window.selectDecorBubble = function (id) {
        localStorage.setItem('mcyt_active_decor_bubble', id);
        refreshDecorView();
        if (typeof showToast === 'function') showToast('气泡已应用');
    };

    // 气泡删除
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
     * 🌟 点击加号弹出的微绿选项浮层菜单
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
                    <!-- 1. AI 智能生成 -->
                    <button onclick="document.getElementById('bubbleActionMenuModal').remove(); window.openAiGenerateBubbleModal();" style="width:100%;padding:11px 14px;background:#f0f9eb;border:1px solid #c2e7b0;border-radius:8px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;">
                        <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#07c160;fill:none;stroke-width:2;"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
                        <div>
                            <div style="font-size:13px;font-weight:600;color:#07c160;">AI 生成气泡</div>
                            <div style="font-size:10.5px;color:#777;">输入自然语言风格，由 AI 自动编写气泡</div>
                        </div>
                    </button>

                    <!-- 2. 制作新气泡（本地图源） -->
                    <button onclick="document.getElementById('bubbleActionMenuModal').remove(); window.openSelectBubbleSourceModal();" style="width:100%;padding:11px 14px;background:#f9f9f9;border:1px solid #e5e5e5;border-radius:8px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:10px;">
                        <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#333;fill:none;stroke-width:2;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <div>
                            <div style="font-size:13px;font-weight:600;color:#222;">制作新气泡</div>
                            <div style="font-size:10.5px;color:#777;">从相册选取图片制作点九图自适应或画框</div>
                        </div>
                    </button>

                    <!-- 3. 导入已有设置 -->
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

    /**
     * 🤖 AI 生成气泡弹窗
     */
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
                <div style="font-size:11px;color:#777;margin-bottom:10px;line-height:1.4;">
                    描述你想要的气泡风格（例如：赛博朋克微光、抹茶生椰极简、复古羊皮纸质感）：
                </div>

                <textarea id="aiBubblePromptInput" placeholder="输入气泡设计描述..." style="width:100%;box-sizing:border-box;height:75px;padding:8px 10px;border-radius:6px;border:1px solid #ddd;font-size:12px;outline:none;resize:none;margin-bottom:10px;"></textarea>

                <div id="aiBubbleStatus" style="font-size:11px;color:#07c160;margin-bottom:10px;display:none;">正在调度 AI 编写设计代码...</div>

                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('aiGenerateBubbleModal').remove()" style="flex:1;padding:9px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;">取消</button>
                    <button id="btnRunAiGenerateBubble" style="flex:1.4;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">开始生成</button>
                </div>
            </div>
        `;

        modal.querySelector('#btnRunAiGenerateBubble').onclick = async () => {
            const prompt = (modal.querySelector('#aiBubblePromptInput')?.value || '').trim();
            if (!prompt) {
                if (typeof showToast === 'function') showToast('请先输入生成意向');
                return;
            }

            const statusEl = modal.querySelector('#aiBubbleStatus');
            const btn = modal.querySelector('#btnRunAiGenerateBubble');
            statusEl.style.display = 'block';
            btn.disabled = true;
            btn.style.opacity = '0.6';

            try {
                const aiConfig = JSON.parse(localStorage.getItem('mc_yt_ai_config') || '{}');
                if (!aiConfig.apiKey) {
                    throw new Error('请先在系统设置中配置 AI 的 ApiKey 与服务地址');
                }

                const sysPrompt = `你是一个精通CSS界面设计的专家。请根据用户的设计意图，设计一对聊天气泡（我方发送与对方接收）。
要求必须输出标准合法的 JSON 格式，严禁带有 markdown 标记：
{
  "name": "气泡名称",
  "userStyle": "我方气泡CSS样式（例如 background: linear-gradient(...); color: #fff; border-radius: 8px; box-shadow: ...;）",
  "npcStyle": "对方气泡CSS样式（例如 background: #fff; color: #333; border: 1px solid #eee; border-radius: 8px;）"
}`;

                const resp = await fetch((aiConfig.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${aiConfig.apiKey}`
                    },
                    body: JSON.stringify({
                        model: aiConfig.model || 'gpt-3.5-turbo',
                        messages: [
                            { role: 'system', content: sysPrompt },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.7
                    })
                });

                if (!resp.ok) throw new Error('AI 服务请求失败');
                const data = await resp.json();
                let rawText = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
                rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

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
                if (typeof showToast === 'function') showToast('AI 气泡生成成功并已应用！');
            } catch (err) {
                statusEl.style.display = 'none';
                btn.disabled = false;
                btn.style.opacity = '1';
                if (typeof showToast === 'function') showToast('生成失败: ' + err.message);
            }
        };
    };

    /**
     * 📥 导入已有设置综合中枢（JSON 与 CSS）
     */
    window.openImportBubbleHubModal = function () {
        let modal = document.getElementById('bubbleImportHubModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'bubbleImportHubModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100000;padding:20px;';
            document.body.appendChild(modal);
        }

        let importType = 'json'; // 'json' | 'css'

        function renderHub() {
            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:320px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <span style="font-size:14px;font-weight:600;color:#222;">导入已有设置</span>
                        <button onclick="document.getElementById('bubbleImportHubModal').remove()" style="background:none;border:none;color:#999;font-size:16px;cursor:pointer;">✕</button>
                    </div>

                    <div style="display:flex;gap:6px;margin-bottom:10px;">
                        <button id="btnTabImportJson" style="flex:1;padding:6px;border-radius:6px;font-size:11.5px;cursor:pointer;border:1px solid ${importType === 'json' ? '#07c160' : '#e0e0e0'};background:${importType === 'json' ? '#e8f7ed' : '#fff'};color:${importType === 'json' ? '#07c160' : '#333'};font-weight:${importType === 'json' ? '600' : 'normal'};">JSON 文件/代码</button>
                        <button id="btnTabImportCss" style="flex:1;padding:6px;border-radius:6px;font-size:11.5px;cursor:pointer;border:1px solid ${importType === 'css' ? '#07c160' : '#e0e0e0'};background:${importType === 'css' ? '#e8f7ed' : '#fff'};color:${importType === 'css' ? '#07c160' : '#333'};font-weight:${importType === 'css' ? '600' : 'normal'};">纯 CSS 样式</button>
                    </div>

                    ${importType === 'json' ? `
                        <textarea id="importPayloadArea" placeholder="在此粘贴他人分享的气泡 JSON 代码..." style="width:100%;box-sizing:border-box;min-height:120px;max-height:160px;padding:8px;border-radius:6px;border:1px solid #ddd;font-size:11px;font-family:monospace;resize:none;margin-bottom:8px;outline:none;"></textarea>
                        <input type="file" id="importJsonFileInput" accept=".json,application/json" style="display:none;">
                        <button onclick="document.getElementById('importJsonFileInput').click()" style="width:100%;padding:7px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:11px;color:#555;cursor:pointer;margin-bottom:12px;">从手机选取 .json 文件</button>
                    ` : `
                        <div style="margin-bottom:8px;">
                            <input id="importCssName" type="text" placeholder="给气泡起个名字" style="width:100%;box-sizing:border-box;padding:7px 8px;border-radius:6px;border:1px solid #ddd;font-size:11.5px;outline:none;margin-bottom:6px;">
                            <div style="font-size:10.5px;color:#888;margin-bottom:2px;">我方气泡 CSS 样式</div>
                            <textarea id="importCssUser" placeholder="例如: background: #95ec69; color: #000; border-radius: 8px;" style="width:100%;box-sizing:border-box;height:55px;padding:6px;border-radius:6px;border:1px solid #ddd;font-size:11px;font-family:monospace;resize:none;margin-bottom:6px;outline:none;"></textarea>
                            <div style="font-size:10.5px;color:#888;margin-bottom:2px;">对方气泡 CSS 样式</div>
                            <textarea id="importCssNpc" placeholder="例如: background: #ffffff; color: #333; border: 1px solid #eee;" style="width:100%;box-sizing:border-box;height:55px;padding:6px;border-radius:6px;border:1px solid #ddd;font-size:11px;font-family:monospace;resize:none;margin-bottom:12px;outline:none;"></textarea>
                        </div>
                    `}

                    <div style="display:flex;gap:8px;">
                        <button onclick="document.getElementById('bubbleImportHubModal').remove()" style="flex:1;padding:9px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#666;cursor:pointer;">取消</button>
                        <button id="btnConfirmImportHub" style="flex:1.4;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">解析并导入</button>
                    </div>
                </div>
            `;

            modal.querySelector('#btnTabImportJson').onclick = () => { importType = 'json'; renderHub(); };
            modal.querySelector('#btnTabImportCss').onclick = () => { importType = 'css'; renderHub(); };

            if (importType === 'json') {
                const fileInp = modal.querySelector('#importJsonFileInput');
                fileInp.onchange = (e) => {
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = (evt) => {
                        modal.querySelector('#importPayloadArea').value = evt.target.result;
                    };
                    r.readAsText(f);
                };
            }

            modal.querySelector('#btnConfirmImportHub').onclick = async () => {
                if (importType === 'json') {
                    const raw = modal.querySelector('#importPayloadArea')?.value.trim();
                    if (!raw) {
                        if (typeof showToast === 'function') showToast('请先输入或读取 JSON 数据');
                        return;
                    }
                    try {
                        const parsed = JSON.parse(raw);
                        const b = parsed.bubble || parsed;
                        const newId = 'bubble_' + Date.now();
                        const itemToSave = {
                            id: newId,
                            name: b.name || '导入的气泡',
                            author: b.author || '分享者',
                            type: b.type || (b.visualConfig ? 'visual_box' : 'css'),
                            scale: b.scale !== undefined ? b.scale : 1.0,
                            fontSize: b.fontSize || 14.5,
                            fontFamily: b.fontFamily || '',
                            visualConfig: b.visualConfig || null,
                            userStyle: b.userStyle || '',
                            npcStyle: b.npcStyle || '',
                            userBorderImage: b.userBorderImage || b.borderImage || '',
                            npcBorderImage: b.npcBorderImage || b.borderImage || '',
                            userSlice: b.userSlice || b.slice || '',
                            npcSlice: b.npcSlice || b.slice || '',
                            userPadding: b.userPadding || b.padding || '',
                            npcPadding: b.npcPadding || b.padding || '',
                            userBorderWidth: b.userBorderWidth || b.borderWidth || 16,
                            npcBorderWidth: b.npcBorderWidth || b.borderWidth || 16,
                            userTextColor: b.userTextColor || b.textColor || '#111111',
                            npcTextColor: b.npcTextColor || b.textColor || '#222222',
                            mirrorNpcFromUser: !!b.mirrorNpcFromUser,
                            isBuiltin: false
                        };
                        await window.saveCustomBubbleAsync(itemToSave);
                        localStorage.setItem('mcyt_active_decor_bubble', newId);
                        modal.remove();
                        refreshDecorView();
                        if (typeof showToast === 'function') showToast('气泡已成功导入！');
                    } catch (err) {
                        if (typeof showToast === 'function') showToast('解析失败：不是合法的气泡 JSON');
                    }
                } else {
                    const name = modal.querySelector('#importCssName')?.value.trim() || '自定义CSS气泡';
                    const uCss = modal.querySelector('#importCssUser')?.value.trim() || 'background:#95ec69;color:#000;border-radius:6px;';
                    const nCss = modal.querySelector('#importCssNpc')?.value.trim() || 'background:#fff;color:#000;border:1px solid #eee;border-radius:6px;';

                    const itemToSave = {
                        id: 'bubble_css_' + Date.now(),
                        name: name,
                        author: '玩家编写',
                        type: 'css',
                        scale: 1.0,
                        fontSize: 14.5,
                        userStyle: uCss,
                        npcStyle: nCss,
                        isBuiltin: false
                    };

                    await window.saveCustomBubbleAsync(itemToSave);
                    localStorage.setItem('mcyt_active_decor_bubble', itemToSave.id);
                    modal.remove();
                    refreshDecorView();
                    if (typeof showToast === 'function') showToast('CSS气泡已保存！');
                }
            };
        }

        renderHub();
    };

    /**
     * 🎨 精致白灰微绿调色盘选择器（替换原生醜陋的 input type="color"）
     */
    window.openWechatColorPickerModal = function (initialColor = '#000000', onSelectCallback) {
        let modal = document.getElementById('wechatColorPickerModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'wechatColorPickerModal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:100002;padding:20px;';
            document.body.appendChild(modal);
        }

        let curColor = initialColor;
        const PRESET_PALETTES = [
            '#000000', '#222222', '#555555', '#888888', '#ffffff',
            '#07c160', '#10aeff', '#576b95', '#fa5151', '#ffc300',
            '#845ef7', '#f06595', '#20c997', '#495057', '#e8f7ed'
        ];

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:280px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <span style="font-size:13.5px;font-weight:600;color:#222;">选择颜色</span>
                    <button onclick="document.getElementById('wechatColorPickerModal').remove()" style="background:none;border:none;color:#999;font-size:16px;cursor:pointer;">✕</button>
                </div>

                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                    <div id="paletteCurPreview" style="width:36px;height:36px;border-radius:6px;background:${curColor};border:1px solid #ddd;box-shadow:inset 0 1px 2px rgba(0,0,0,0.1);"></div>
                    <input id="paletteHexInput" type="text" value="${curColor}" style="flex:1;padding:7px 8px;border-radius:6px;border:1px solid #ddd;font-size:12px;font-family:monospace;outline:none;">
                </div>

                <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:8px;margin-bottom:14px;">
                    ${PRESET_PALETTES.map(col => `
                        <div class="preset-color-block" data-col="${col}" style="height:28px;border-radius:5px;background:${col};border:1px solid ${col === '#ffffff' ? '#ddd' : 'transparent'};cursor:pointer;"></div>
                    `).join('')}
                </div>

                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('wechatColorPickerModal').remove()" style="flex:1;padding:8px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#666;cursor:pointer;">取消</button>
                    <button id="btnPaletteConfirm" style="flex:1.2;padding:8px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">确定</button>
                </div>
            </div>
        `;

        const hexInp = modal.querySelector('#paletteHexInput');
        const prev = modal.querySelector('#paletteCurPreview');

        hexInp.oninput = (e) => {
            curColor = e.target.value;
            prev.style.background = curColor;
        };

        modal.querySelectorAll('.preset-color-block').forEach(b => {
            b.onclick = () => {
                curColor = b.getAttribute('data-col');
                hexInp.value = curColor;
                prev.style.background = curColor;
            };
        });

        modal.querySelector('#btnPaletteConfirm').onclick = () => {
            if (typeof onSelectCallback === 'function') onSelectCallback(curColor);
            modal.remove();
        };
    };

    /**
     * 🔤 气泡文字字号与字体设置弹窗
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

        // 读取主题中心保存的字体
        let themeFontList = [];
        try {
            themeFontList = JSON.parse(localStorage.getItem('mcyt_theme_fonts') || '[]');
        } catch (_) {}

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:320px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.15);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span style="font-size:14px;font-weight:600;color:#222;">设置文字大小与字体</span>
                    <button onclick="document.getElementById('bubbleFontModal').remove()" style="background:none;border:none;color:#999;font-size:16px;cursor:pointer;">✕</button>
                </div>

                <div style="font-size:11px;color:#777;margin-bottom:12px;">调节此气泡内部文字的默认字号与字体排版。</div>

                <!-- 字号滑块 -->
                <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:12px;">
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                        <span>文字大小缩放</span>
                        <span style="color:#07c160;font-weight:600;" id="fontModalValText">${curFont}px</span>
                    </div>
                    <input type="range" id="fontModalSlider" min="11" max="22" step="0.5" value="${curFont}" style="width:100%;accent-color:#07c160;">
                </div>

                <!-- 字体选择模式 -->
                <div style="margin-bottom:12px;">
                    <div style="font-size:11px;color:#555;margin-bottom:4px;">字体源</div>
                    <select id="fontSelectDropdown" style="width:100%;padding:7px;border-radius:6px;border:1px solid #ddd;font-size:12px;background:#fff;margin-bottom:8px;outline:none;">
                        <option value="" ${!curFamily ? 'selected' : ''}>跟随小手机系统默认字体</option>
                        <option value="sans-serif" ${curFamily === 'sans-serif' ? 'selected' : ''}>原生无衬线 (Sans-Serif)</option>
                        <option value="serif" ${curFamily === 'serif' ? 'selected' : ''}>衬线体 (Serif / 宋体风格)</option>
                        ${themeFontList.map(tf => `<option value="${escapeHtml(tf.name)}" ${curFamily === tf.name ? 'selected' : ''}>主题库字体: ${escapeHtml(tf.name)}</option>`).join('')}
                    </select>

                    <div style="font-size:10.5px;color:#888;margin-bottom:2px;">或输入自定义 CSS Font-Family：</div>
                    <input type="text" id="fontCustomInput" value="${escapeHtml(curFamily)}" placeholder="例如: 'PingFang SC', monospace" style="width:100%;box-sizing:border-box;padding:7px 8px;border-radius:6px;border:1px solid #ddd;font-size:11.5px;outline:none;">
                </div>

                <div style="display:flex;gap:8px;">
                    <button onclick="document.getElementById('bubbleFontModal').remove()" style="flex:1;padding:9px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#666;cursor:pointer;">取消</button>
                    <button id="btnSaveFontSettings" style="flex:1.4;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;">保存字体设置</button>
                </div>
            </div>
        `;

        const slider = modal.querySelector('#fontModalSlider');
        const text = modal.querySelector('#fontModalValText');
        slider.oninput = (e) => {
            curFont = parseFloat(e.target.value);
            text.textContent = `${curFont}px`;
        };

        const select = modal.querySelector('#fontSelectDropdown');
        const customInp = modal.querySelector('#fontCustomInput');
        select.onchange = (e) => {
            if (e.target.value) customInp.value = e.target.value;
        };

        modal.querySelector('#btnSaveFontSettings').onclick = async () => {
            b.fontSize = curFont;
            b.fontFamily = customInp.value.trim();
            await window.saveCustomBubbleAsync(b);
            modal.remove();
            refreshDecorView();
            if (typeof showToast === 'function') showToast('字体排版已更新');
        };
    };

    /**
     * 🎨 点九图自适应气泡工坊（支持对方镜像、文字缩放与调色板）
     */
    window.openNineSliceDiyModal = function (bubbleId = null, initialUrl = '', initialName = '') {
        let bubbleObj = null;
        if (bubbleId) {
            const list = window.getStoredDecorBubbles();
            bubbleObj = list.find(x => x.id === bubbleId);
        }

        function parseSlice(str) {
            const parts = (str || '35% 35% 35% 35%').replace(/%/g, '').trim().split(/\s+/).map(Number);
            const [top = 35, right = 35, bottom = 35, left = 35] = parts;
            return { top, right, bottom, left };
        }
        function parsePadding(str) {
            const parts = (str || '10px 14px').replace(/px/g, '').trim().split(/\s+/).map(Number);
            if (parts.length >= 2) return { v: parts[0], h: parts[1] };
            return { v: parts[0] || 10, h: parts[0] || 10 };
        }

        const state = {
            id: bubbleObj ? bubbleObj.id : ('bubble_' + Date.now()),
            name: bubbleObj ? bubbleObj.name : (initialName || '自适应气泡'),
            author: bubbleObj ? (bubbleObj.author || '') : '玩家自制',
            scale: (bubbleObj && bubbleObj.scale !== undefined) ? bubbleObj.scale : 1.0,
            fontSize: (bubbleObj && bubbleObj.fontSize) ? bubbleObj.fontSize : 14.5,
            fontFamily: (bubbleObj && bubbleObj.fontFamily) ? bubbleObj.fontFamily : '',
            mirrorNpcFromUser: (bubbleObj && bubbleObj.mirrorNpcFromUser !== undefined) ? bubbleObj.mirrorNpcFromUser : true,
            activeSide: 'user', // 'user' | 'npc'
            user: {
                url: (bubbleObj?.userBorderImage || bubbleObj?.borderImage) || initialUrl || '',
                slice: parseSlice(bubbleObj?.userSlice || bubbleObj?.slice),
                padding: parsePadding(bubbleObj?.userPadding || bubbleObj?.padding),
                borderWidth: (bubbleObj?.userBorderWidth || bubbleObj?.borderWidth) || 16,
                textColor: (bubbleObj?.userTextColor || bubbleObj?.textColor) || '#111111'
            },
            npc: {
                url: (bubbleObj?.npcBorderImage || bubbleObj?.borderImage) || initialUrl || '',
                slice: parseSlice(bubbleObj?.npcSlice || bubbleObj?.slice),
                padding: parsePadding(bubbleObj?.npcPadding || bubbleObj?.padding),
                borderWidth: (bubbleObj?.npcBorderWidth || bubbleObj?.borderWidth) || 16,
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

        function sliceCssString(cfg) {
            return `${cfg.slice.top}% ${cfg.slice.right}% ${cfg.slice.bottom}% ${cfg.slice.left}%`;
        }
        function paddingCssString(cfg) {
            return `${cfg.padding.v}px ${cfg.padding.h}px`;
        }
        function buildPreviewBubble(cfg, text) {
            if (!cfg.url) {
                return `<div style="padding:8px 12px;border-radius:6px;background:#eee;color:#999;font-size:12px;">先上传一张气泡图片</div>`;
            }
            return `<div style="display:inline-block;border-style:solid;border-width:${cfg.borderWidth}px;border-image:url('${cfg.url}') ${sliceCssString(cfg)} fill stretch;padding:${paddingCssString(cfg)};background:transparent;color:${cfg.textColor};max-width:220px;box-sizing:border-box;word-break:break-word;font-size:${state.fontSize}px;line-height:1.5;">${escapeHtml(text)}</div>`;
        }

        function renderStage() {
            const curSide = state.activeSide;
            const cfg = (state.mirrorNpcFromUser && curSide === 'npc') ? state.user : state[curSide];

            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:350px;max-height:92vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;-webkit-overflow-scrolling:touch;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <span style="font-size:14px;font-weight:600;color:#222;">点九图自适应气泡工坊</span>
                        <button onclick="document.getElementById('nineSliceDiyModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                    </div>

                    <div style="font-size:11px;color:#666;background:#f6f8fa;padding:8px 10px;border-radius:6px;margin-bottom:10px;line-height:1.4;">
                        拖动图上的四条线，把四个角（圆角/尾巴）圈起来，中间的十字区域随文字自动伸展。
                    </div>

                    <!-- 对方镜像开关 -->
                    <div style="display:flex;justify-content:space-between;align-items:center;background:#f9f9f9;padding:8px 10px;border-radius:8px;border:1px solid #eee;margin-bottom:10px;">
                        <div>
                            <div style="font-size:12px;font-weight:600;color:#333;">对方气泡延续我方并自动镜像</div>
                            <div style="font-size:10.5px;color:#888;">开启后对方气泡自动水平翻转，无需做两套图</div>
                        </div>
                        <input type="checkbox" id="chkMirrorNpc" ${state.mirrorNpcFromUser ? 'checked' : ''} style="width:18px;height:18px;accent-color:#07c160;cursor:pointer;">
                    </div>

                    <div style="display:flex;gap:6px;margin-bottom:10px;">
                        <button id="btnNsTabUser" style="flex:1;padding:6px;border-radius:6px;font-size:11.5px;cursor:pointer;border:1px solid ${curSide === 'user' ? '#07c160' : '#e0e0e0'};background:${curSide === 'user' ? '#e8f7ed' : '#fff'};color:${curSide === 'user' ? '#07c160' : '#333'};font-weight:${curSide === 'user' ? '600' : 'normal'};">我方气泡设置</button>
                        <button id="btnNsTabNpc" style="flex:1;padding:6px;border-radius:6px;font-size:11.5px;cursor:pointer;border:1px solid ${curSide === 'npc' ? '#07c160' : '#e0e0e0'};background:${curSide === 'npc' ? '#e8f7ed' : '#fff'};color:${curSide === 'npc' ? '#07c160' : '#333'};font-weight:${curSide === 'npc' ? '600' : 'normal'};" ${state.mirrorNpcFromUser ? 'disabled title="已开启自动镜像"' : ''}>对方气泡设置</button>
                    </div>

                    ${!cfg.url ? `
                        <button id="btnNsUploadSide" style="width:100%;padding:10px;background:#07c160;color:#fff;border:none;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;margin-bottom:12px;">上传气泡图片</button>
                        <input type="file" id="nsSideFileInput" accept="image/*" style="display:none;">
                    ` : `
                        <!-- 切割线拖拽舞台 -->
                        <div id="nsStageContainer" style="position:relative;width:100%;background:#ebebeb;border-radius:10px;overflow:hidden;margin-bottom:10px;user-select:none;-webkit-user-select:none;touch-action:none;">
                            <img id="nsStageImg" src="${cfg.url}" style="width:100%;display:block;pointer-events:none;" />

                            <div id="nsLineTop" style="position:absolute;left:0;right:0;top:${cfg.slice.top}%;height:0;border-top:2px dashed #07c160;cursor:ns-resize;touch-action:none;"><div class="ns-handle" style="position:absolute;left:50%;top:-7px;transform:translateX(-50%);width:26px;height:14px;background:#07c160;border-radius:4px;"></div></div>
                            <div id="nsLineBottom" style="position:absolute;left:0;right:0;top:${100 - cfg.slice.bottom}%;height:0;border-top:2px dashed #07c160;cursor:ns-resize;touch-action:none;"><div class="ns-handle" style="position:absolute;left:50%;top:-7px;transform:translateX(-50%);width:26px;height:14px;background:#07c160;border-radius:4px;"></div></div>
                            <div id="nsLineLeft" style="position:absolute;top:0;bottom:0;left:${cfg.slice.left}%;width:0;border-left:2px dashed #576b95;cursor:ew-resize;touch-action:none;"><div class="ns-handle" style="position:absolute;top:50%;left:-7px;transform:translateY(-50%);width:14px;height:26px;background:#576b95;border-radius:4px;"></div></div>
                            <div id="nsLineRight" style="position:absolute;top:0;bottom:0;left:${100 - cfg.slice.right}%;width:0;border-left:2px dashed #576b95;cursor:ew-resize;touch-action:none;"><div class="ns-handle" style="position:absolute;top:50%;left:-7px;transform:translateY(-50%);width:14px;height:26px;background:#576b95;border-radius:4px;"></div></div>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
                            <button id="btnNsReupload" style="font-size:10.5px;color:#576b95;background:none;border:none;cursor:pointer;padding:0;">更换图片</button>
                        </div>

                        <!-- 边框厚度 -->
                        <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:8px;">
                            <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                                <span>边框粗细（圆角/尾巴保护大小）</span>
                                <span style="color:#07c160;font-weight:600;">${cfg.borderWidth}px</span>
                            </div>
                            <input type="range" id="nsBorderWidthRange" min="6" max="40" value="${cfg.borderWidth}" style="width:100%;accent-color:#07c160;">
                        </div>

                        <!-- 文字大小与内边距 -->
                        <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:8px;">
                            <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                                <span>文字大小缩放</span>
                                <span style="color:#07c160;font-weight:600;" id="nsFontValText">${state.fontSize}px</span>
                            </div>
                            <input type="range" id="nsFontRange" min="11" max="22" step="0.5" value="${state.fontSize}" style="width:100%;accent-color:#07c160;margin-bottom:8px;">

                            <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                                <span>文字左右内边距</span>
                                <span style="color:#07c160;font-weight:600;">${cfg.padding.h}px</span>
                            </div>
                            <input type="range" id="nsPadHRange" min="4" max="30" value="${cfg.padding.h}" style="width:100%;accent-color:#07c160;margin-bottom:8px;">
                            
                            <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                                <span>文字上下内边距</span>
                                <span style="color:#07c160;font-weight:600;">${cfg.padding.v}px</span>
                            </div>
                            <input type="range" id="nsPadVRange" min="2" max="24" value="${cfg.padding.v}" style="width:100%;accent-color:#07c160;">
                        </div>

                        <!-- 优雅文字颜色选择 -->
                        <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">
                            <span style="font-size:11px;color:#555;">文字颜色</span>
                            <div id="btnNsTextColorTrigger" style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <div style="width:20px;height:20px;border-radius:4px;background:${cfg.textColor};border:1px solid #ccc;"></div>
                                <span style="font-size:11px;color:#666;">${cfg.textColor}</span>
                            </div>
                        </div>

                        <!-- 实时伸展自适应预览 -->
                        <div style="background:#fff;border:1px dashed #ddd;border-radius:8px;padding:10px;margin-bottom:12px;">
                            <div style="font-size:10.5px;color:#999;margin-bottom:8px;">自适应伸展预览</div>
                            <div id="nsPreviewShort" style="margin-bottom:8px;">${buildPreviewBubble(cfg, '你好！')}</div>
                            <div id="nsPreviewLong">${buildPreviewBubble(cfg, '这一行文字比较长，气泡本体会像原生聊天一样随内容顺滑变大！')}</div>
                        </div>
                    `}

                    <!-- 名称与作者 -->
                    <div style="display:flex;gap:8px;margin-bottom:12px;">
                        <input id="nsNameInput" type="text" placeholder="气泡名称" value="${escapeHtml(state.name)}" style="flex:1.3;padding:7px 8px;border-radius:6px;border:1px solid #e0e0e0;font-size:11.5px;outline:none;">
                        <input id="nsAuthorInput" type="text" placeholder="作者署名" value="${escapeHtml(state.author)}" style="flex:1;padding:7px 8px;border-radius:6px;border:1px solid #e0e0e0;font-size:11.5px;outline:none;">
                    </div>

                    <button id="btnSaveNineSliceBubble" style="width:100%;padding:11px;background:#07c160;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">保存并选用气泡</button>
                </div>
            `;

            modal.querySelector('#chkMirrorNpc').onchange = (e) => {
                state.mirrorNpcFromUser = e.target.checked;
                renderStage();
            };

            modal.querySelector('#btnNsTabUser').onclick = () => { state.activeSide = 'user'; renderStage(); };
            modal.querySelector('#btnNsTabNpc').onclick = () => { if (!state.mirrorNpcFromUser) { state.activeSide = 'npc'; renderStage(); } };

            const uploadBtn = modal.querySelector('#btnNsUploadSide');
            if (uploadBtn) {
                const fileInput = modal.querySelector('#nsSideFileInput');
                uploadBtn.onclick = () => fileInput.click();
                fileInput.onchange = (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        state[state.activeSide].url = ev.target.result;
                        renderStage();
                    };
                    reader.readAsDataURL(file);
                };
            }

            const reuploadBtn = modal.querySelector('#btnNsReupload');
            if (reuploadBtn) {
                reuploadBtn.onclick = () => {
                    state[state.activeSide].url = '';
                    renderStage();
                };
            }

            function refreshPreviewsOnly() {
                const shortEl = modal.querySelector('#nsPreviewShort');
                const longEl = modal.querySelector('#nsPreviewLong');
                const activeCfg = (state.mirrorNpcFromUser && state.activeSide === 'npc') ? state.user : state[state.activeSide];
                if (shortEl) shortEl.innerHTML = buildPreviewBubble(activeCfg, '你好！');
                if (longEl) longEl.innerHTML = buildPreviewBubble(activeCfg, '这一行文字比较长，气泡本体会像原生聊天一样随内容顺滑变大！');
            }

            const fontRange = modal.querySelector('#nsFontRange');
            if (fontRange) fontRange.oninput = (e) => {
                state.fontSize = parseFloat(e.target.value);
                modal.querySelector('#nsFontValText').textContent = `${state.fontSize}px`;
                refreshPreviewsOnly();
            };

            const bwRange = modal.querySelector('#nsBorderWidthRange');
            if (bwRange) bwRange.oninput = (e) => {
                cfg.borderWidth = parseInt(e.target.value, 10);
                bwRange.parentElement.querySelector('span:last-child').textContent = `${cfg.borderWidth}px`;
                refreshPreviewsOnly();
            };

            const padH = modal.querySelector('#nsPadHRange');
            if (padH) padH.oninput = (e) => {
                cfg.padding.h = parseInt(e.target.value, 10);
                padH.parentElement.querySelector('span:last-child').textContent = `${cfg.padding.h}px`;
                refreshPreviewsOnly();
            };
            const padV = modal.querySelector('#nsPadVRange');
            if (padV) padV.oninput = (e) => {
                cfg.padding.v = parseInt(e.target.value, 10);
                padV.parentElement.querySelector('span:last-child').textContent = `${cfg.padding.v}px`;
                refreshPreviewsOnly();
            };

            const colorTrigger = modal.querySelector('#btnNsTextColorTrigger');
            if (colorTrigger) {
                colorTrigger.onclick = () => {
                    window.openWechatColorPickerModal(cfg.textColor, (newCol) => {
                        cfg.textColor = newCol;
                        renderStage();
                    });
                };
            }

            modal.querySelector('#nsNameInput').oninput = (e) => { state.name = e.target.value; };
            modal.querySelector('#nsAuthorInput').oninput = (e) => { state.author = e.target.value; };

            bindNineSliceInteraction(modal, state, refreshPreviewsOnly);

            modal.querySelector('#btnSaveNineSliceBubble').onclick = async () => {
                if (!state.user.url && !state.npc.url) {
                    if (typeof showToast === 'function') showToast('请至少上传一张气泡图片');
                    return;
                }
                const finalName = state.name.trim() || '自适应气泡';
                const finalAuthor = state.author.trim() || '玩家自制';

                const itemToSave = {
                    id: state.id,
                    name: finalName,
                    author: finalAuthor,
                    type: 'nine_slice',
                    scale: state.scale,
                    fontSize: state.fontSize,
                    fontFamily: state.fontFamily,
                    mirrorNpcFromUser: state.mirrorNpcFromUser,
                    userBorderImage: state.user.url,
                    npcBorderImage: state.mirrorNpcFromUser ? state.user.url : state.npc.url,
                    userSlice: sliceCssString(state.user),
                    npcSlice: state.mirrorNpcFromUser ? sliceCssString(state.user) : sliceCssString(state.npc),
                    userPadding: paddingCssString(state.user),
                    npcPadding: state.mirrorNpcFromUser ? paddingCssString(state.user) : paddingCssString(state.npc),
                    userBorderWidth: state.user.borderWidth,
                    npcBorderWidth: state.mirrorNpcFromUser ? state.user.borderWidth : state.npc.borderWidth,
                    userTextColor: state.user.textColor,
                    npcTextColor: state.mirrorNpcFromUser ? state.user.textColor : state.npc.textColor,
                    isBuiltin: false
                };

                await window.saveCustomBubbleAsync(itemToSave);
                localStorage.setItem('mcyt_active_decor_bubble', itemToSave.id);

                modal.remove();
                refreshDecorView();
                if (typeof showToast === 'function') showToast('自适应气泡已保存并应用！');
            };
        }

        function bindNineSliceInteraction(modalRoot, st, onChange) {
            const container = modalRoot.querySelector('#nsStageContainer');
            if (!container) return;
            const lineTop = modalRoot.querySelector('#nsLineTop');
            const lineBottom = modalRoot.querySelector('#nsLineBottom');
            const lineLeft = modalRoot.querySelector('#nsLineLeft');
            const lineRight = modalRoot.querySelector('#nsLineRight');

            const getEventPos = (e) => {
                if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
                return { x: e.clientX, y: e.clientY };
            };

            let dragTarget = null;

            function onMove(e) {
                if (!dragTarget) return;
                const rect = container.getBoundingClientRect();
                const pos = getEventPos(e);
                const cfg = (st.mirrorNpcFromUser && st.activeSide === 'npc') ? st.user : st[st.activeSide];
                const minGap = 8;

                if (dragTarget === 'top') {
                    let val = ((pos.y - rect.top) / rect.height) * 100;
                    val = Math.max(0, Math.min(100 - cfg.slice.bottom - minGap, val));
                    cfg.slice.top = Math.round(val);
                    lineTop.style.top = `${cfg.slice.top}%`;
                } else if (dragTarget === 'bottom') {
                    let val = 100 - ((pos.y - rect.top) / rect.height) * 100;
                    val = Math.max(0, Math.min(100 - cfg.slice.top - minGap, val));
                    cfg.slice.bottom = Math.round(val);
                    lineBottom.style.top = `${100 - cfg.slice.bottom}%`;
                } else if (dragTarget === 'left') {
                    let val = ((pos.x - rect.left) / rect.width) * 100;
                    val = Math.max(0, Math.min(100 - cfg.slice.right - minGap, val));
                    cfg.slice.left = Math.round(val);
                    lineLeft.style.left = `${cfg.slice.left}%`;
                } else if (dragTarget === 'right') {
                    let val = 100 - ((pos.x - rect.left) / rect.width) * 100;
                    val = Math.max(0, Math.min(100 - cfg.slice.left - minGap, val));
                    cfg.slice.right = Math.round(val);
                    lineRight.style.left = `${100 - cfg.slice.right}%`;
                }
                e.preventDefault();
                onChange();
            }
            function onEnd() { dragTarget = null; }

            [['top', lineTop], ['bottom', lineBottom], ['left', lineLeft], ['right', lineRight]].forEach(([key, el]) => {
                if (!el) return;
                const start = (e) => { dragTarget = key; e.preventDefault(); e.stopPropagation(); };
                el.addEventListener('mousedown', start);
                el.addEventListener('touchstart', start, { passive: false });
            });

            window.addEventListener('mousemove', onMove);
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchend', onEnd);
        }

        renderStage();
    };

    /**
     * 🌟 固定框选画框工坊（支持文字缩放与对方镜像）
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
            mirrorNpcFromUser: (bubbleObj && bubbleObj.mirrorNpcFromUser !== undefined) ? bubbleObj.mirrorNpcFromUser : true,
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
            const curCfg = (state.mirrorNpcFromUser && curSide === 'npc') ? state.user : state[curSide];

            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:350px;max-height:92vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;-webkit-overflow-scrolling:touch;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <span style="font-size:14px;font-weight:600;color:#222;">画框框选工坊</span>
                        <button onclick="document.getElementById('visualBoxDiyModal').remove()" style="border:none;background:none;font-size:16px;color:#999;cursor:pointer;">✕</button>
                    </div>

                    <!-- 对方镜像开关 -->
                    <div style="display:flex;justify-content:space-between;align-items:center;background:#f9f9f9;padding:8px 10px;border-radius:8px;border:1px solid #eee;margin-bottom:10px;">
                        <div>
                            <div style="font-size:12px;font-weight:600;color:#333;">对方气泡延续我方并自动镜像</div>
                            <div style="font-size:10.5px;color:#888;">开启后对方气泡水平翻转，文字正常居向</div>
                        </div>
                        <input type="checkbox" id="chkVbMirrorNpc" ${state.mirrorNpcFromUser ? 'checked' : ''} style="width:18px;height:18px;accent-color:#07c160;cursor:pointer;">
                    </div>

                    <div style="display:flex;gap:6px;margin-bottom:10px;">
                        <button id="btnTabUser" style="flex:1;padding:6px;border-radius:6px;font-size:11.5px;cursor:pointer;border:1px solid ${curSide === 'user' ? '#07c160' : '#e0e0e0'};background:${curSide === 'user' ? '#e8f7ed' : '#fff'};color:${curSide === 'user' ? '#07c160' : '#333'};font-weight:${curSide === 'user' ? '600' : 'normal'};">我方气泡设置</button>
                        <button id="btnTabNpc" style="flex:1;padding:6px;border-radius:6px;font-size:11.5px;cursor:pointer;border:1px solid ${curSide === 'npc' ? '#07c160' : '#e0e0e0'};background:${curSide === 'npc' ? '#e8f7ed' : '#fff'};color:${curSide === 'npc' ? '#07c160' : '#333'};font-weight:${curSide === 'npc' ? '600' : 'normal'};" ${state.mirrorNpcFromUser ? 'disabled title="已开启自动镜像"' : ''}>对方气泡设置</button>
                    </div>

                    <!-- 可视化拖拽舞台 -->
                    <div id="visualBoxStageContainer" style="position:relative;width:100%;background:#ebebeb;border-radius:10px;overflow:hidden;margin-bottom:12px;display:flex;align-items:center;justify-content:center;min-height:200px;user-select:none;-webkit-user-select:none;touch-action:none;">
                        <img id="stageBubbleImg" src="${curCfg.url}" style="width:100%;max-width:280px;height:auto;display:block;pointer-events:none;" onerror="this.style.display='none';" />
                        
                        <div id="visualDragBox" style="position:absolute;left:${curCfg.rect.left}%;top:${curCfg.rect.top}%;width:${curCfg.rect.width}%;height:${curCfg.rect.height}%;background:rgba(7, 193, 96, 0.22);border:2px dashed #07c160;border-radius:6px;cursor:move;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:${curCfg.align === 'center' ? 'center' : (curCfg.align === 'right' ? 'flex-end' : 'flex-start')};padding:4px;overflow:hidden;touch-action:none;">
                            <span id="visualDemoText" style="font-size:${state.fontSize}px;color:${curCfg.color};line-height:1.3;pointer-events:none;word-break:break-word;text-align:${curCfg.align};">示例对白文字在这里～</span>
                            
                            <div id="visualResizeHandle" style="position:absolute;right:-1px;bottom:-1px;width:18px;height:18px;background:#07c160;border-radius:4px 0 4px 0;cursor:se-resize;display:flex;align-items:center;justify-content:center;touch-action:none;">
                                <svg viewBox="0 0 24 24" style="width:12px;height:12px;fill:none;stroke:#fff;stroke-width:3;"><line x1="20" y1="4" x2="4" y2="20"></line><line x1="20" y1="12" x2="12" y2="20"></line></svg>
                            </div>
                        </div>
                    </div>

                    <!-- 属性微调 -->
                    <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:10px;margin-bottom:10px;">
                        <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                            <span>气泡尺寸缩放</span>
                            <span style="color:#07c160;font-weight:600;" id="visualScaleValText">${Math.round(state.scale * 100)}%</span>
                        </div>
                        <input type="range" id="visualScaleSlider" min="60" max="180" value="${Math.round(state.scale * 100)}" style="width:100%;accent-color:#07c160;margin-bottom:8px;">

                        <div style="display:flex;justify-content:space-between;font-size:11px;color:#555;margin-bottom:4px;">
                            <span>文字大小缩放</span>
                            <span style="color:#07c160;font-weight:600;" id="visualFontValText">${state.fontSize}px</span>
                        </div>
                        <input type="range" id="visualFontSlider" min="10" max="22" step="0.5" value="${state.fontSize}" style="width:100%;accent-color:#07c160;margin-bottom:8px;">

                        <div style="display:flex;align-items:center;justify-content:space-between;">
                            <div id="btnVbColorTrigger" style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <span style="font-size:11px;color:#555;">文字颜色:</span>
                                <div style="width:18px;height:18px;border-radius:4px;background:${curCfg.color};border:1px solid #ccc;"></div>
                            </div>
                            <div style="display:flex;align-items:center;gap:4px;">
                                <span style="font-size:11px;color:#555;">对齐:</span>
                                <button id="btnAlignLeft" style="padding:3px 7px;font-size:10.5px;border-radius:4px;border:1px solid #ddd;background:${curCfg.align === 'left' ? '#07c160' : '#fff'};color:${curCfg.align === 'left' ? '#fff' : '#333'};cursor:pointer;">左</button>
                                <button id="btnAlignCenter" style="padding:3px 7px;font-size:10.5px;border-radius:4px;border:1px solid #ddd;background:${curCfg.align === 'center' ? '#07c160' : '#fff'};color:${curCfg.align === 'center' ? '#fff' : '#333'};cursor:pointer;">中</button>
                                <button id="btnAlignRight" style="padding:3px 7px;font-size:10.5px;border-radius:4px;border:1px solid #ddd;background:${curCfg.align === 'right' ? '#07c160' : '#fff'};color:${curCfg.align === 'right' ? '#fff' : '#333'};cursor:pointer;">右</button>
                            </div>
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;margin-bottom:12px;">
                        <input type="text" id="visualNameInput" value="${escapeHtml(state.name)}" placeholder="气泡备注名称" style="flex:2;padding:7px 10px;border-radius:6px;border:1px solid #ddd;font-size:12px;outline:none;">
                        <input type="text" id="visualAuthorInput" value="${escapeHtml(state.author)}" placeholder="作者名" style="flex:1.2;padding:7px 10px;border-radius:6px;border:1px solid #ddd;font-size:12px;outline:none;">
                    </div>

                    <div style="display:flex;gap:8px;">
                        <button onclick="document.getElementById('visualBoxDiyModal').remove()" style="flex:1;padding:9px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12.5px;color:#555;cursor:pointer;">取消</button>
                        <button id="btnSaveVisualBubble" style="flex:1.4;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:12.5px;color:#fff;font-weight:600;cursor:pointer;">保存并选用</button>
                    </div>
                </div>
            `;

            modal.querySelector('#chkVbMirrorNpc').onchange = (e) => {
                state.mirrorNpcFromUser = e.target.checked;
                renderStage();
            };

            modal.querySelector('#btnTabUser').onclick = () => { state.activeSide = 'user'; renderStage(); };
            modal.querySelector('#btnTabNpc').onclick = () => { if (!state.mirrorNpcFromUser) { state.activeSide = 'npc'; renderStage(); } };

            modal.querySelector('#visualScaleSlider').oninput = (e) => {
                state.scale = parseFloat(e.target.value) / 100;
                modal.querySelector('#visualScaleValText').textContent = `${Math.round(state.scale * 100)}%`;
            };

            modal.querySelector('#visualFontSlider').oninput = (e) => {
                state.fontSize = parseFloat(e.target.value);
                modal.querySelector('#visualFontValText').textContent = `${state.fontSize}px`;
                modal.querySelector('#visualDemoText').style.fontSize = `${state.fontSize}px`;
            };

            modal.querySelector('#btnVbColorTrigger').onclick = () => {
                window.openWechatColorPickerModal(curCfg.color, (newCol) => {
                    curCfg.color = newCol;
                    renderStage();
                });
            };

            modal.querySelector('#btnAlignLeft').onclick = () => { curCfg.align = 'left'; renderStage(); };
            modal.querySelector('#btnAlignCenter').onclick = () => { curCfg.align = 'center'; renderStage(); };
            modal.querySelector('#btnAlignRight').onclick = () => { curCfg.align = 'right'; renderStage(); };

            modal.querySelector('#visualNameInput').oninput = (e) => { state.name = e.target.value; };
            modal.querySelector('#visualAuthorInput').oninput = (e) => { state.author = e.target.value; };

            bindVisualBoxInteraction(modal, state);

            modal.querySelector('#btnSaveVisualBubble').onclick = async () => {
                const finalName = state.name.trim() || '自定义插画气泡';
                const finalAuthor = state.author.trim() || '玩家自制';

                const itemToSave = {
                    id: state.id,
                    name: finalName,
                    author: finalAuthor,
                    type: 'visual_box',
                    scale: state.scale,
                    fontSize: state.fontSize,
                    fontFamily: state.fontFamily,
                    mirrorNpcFromUser: state.mirrorNpcFromUser,
                    visualConfig: {
                        user: { ...state.user },
                        npc: state.mirrorNpcFromUser ? { ...state.user } : { ...state.npc }
                    },
                    isBuiltin: false
                };

                await window.saveCustomBubbleAsync(itemToSave);
                localStorage.setItem('mcyt_active_decor_bubble', itemToSave.id);

                modal.remove();
                refreshDecorView();
                if (typeof showToast === 'function') showToast('画框气泡已保存并选用！');
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
            const curCfg = (st.mirrorNpcFromUser && st.activeSide === 'npc') ? st.user : st[st.activeSide];
            let initialRect = { ...curCfg.rect };

            const getEventPos = (e) => {
                if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
                return { x: e.clientX, y: e.clientY };
            };

            const onDragStart = (e) => {
                if (e.target === handle || handle.contains(e.target)) return;
                isDragging = true;
                const pos = getEventPos(e);
                startX = pos.x;
                startY = pos.y;
                initialRect = { ...curCfg.rect };
                e.preventDefault();
            };

            const onResizeStart = (e) => {
                isResizing = true;
                const pos = getEventPos(e);
                startX = pos.x;
                startY = pos.y;
                initialRect = { ...curCfg.rect };
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
                    curCfg.rect.left = Math.round(nextLeft);
                    curCfg.rect.top = Math.round(nextTop);

                    box.style.left = `${curCfg.rect.left}%`;
                    box.style.top = `${curCfg.rect.top}%`;
                } else if (isResizing) {
                    let nextW = Math.max(15, Math.min(100 - initialRect.left, initialRect.width + dxPercent));
                    let nextH = Math.max(15, Math.min(100 - initialRect.top, initialRect.height + dyPercent));
                    curCfg.rect.width = Math.round(nextW);
                    curCfg.rect.height = Math.round(nextH);

                    box.style.width = `${curCfg.rect.width}%`;
                    box.style.height = `${curCfg.rect.height}%`;
                }
            };

            const onEnd = () => { isDragging = false; isResizing = false; };

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

    /**
     * 📤 导出单个气泡为分享 JSON
     */
    window.exportSingleBubble = function (bubbleId) {
        const bubbles = window.getStoredDecorBubbles();
        const b = bubbles.find(x => x.id === bubbleId);
        if (!b) return;

        const exportPayload = {
            format: 'mcyt_chat_bubble_v2',
            version: '2.1',
            exportedAt: Date.now(),
            bubble: {
                id: 'bubble_shared_' + Date.now(),
                name: b.name,
                author: b.author || '网络创作者',
                type: b.type || 'nine_slice',
                scale: b.scale !== undefined ? b.scale : 1.0,
                fontSize: b.fontSize || 14.5,
                fontFamily: b.fontFamily || '',
                mirrorNpcFromUser: !!b.mirrorNpcFromUser,
                visualConfig: b.visualConfig || null,
                userStyle: b.userStyle || '',
                npcStyle: b.npcStyle || '',
                userBorderImage: b.userBorderImage || b.borderImage || '',
                npcBorderImage: b.npcBorderImage || b.borderImage || '',
                userSlice: b.userSlice || b.slice || '',
                npcSlice: b.npcSlice || b.slice || '',
                userPadding: b.userPadding || b.padding || '',
                npcPadding: b.npcPadding || b.padding || '',
                userBorderWidth: b.userBorderWidth || b.borderWidth || 16,
                npcBorderWidth: b.npcBorderWidth || b.borderWidth || 16,
                userTextColor: b.userTextColor || b.textColor || '#111111',
                npcTextColor: b.npcTextColor || b.textColor || '#222222'
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
                    if (typeof showToast === 'function') showToast('气泡 JSON 已复制！');
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

    function refreshDecorView() {
        const sub = document.getElementById('themeAppSubContent');
        if (sub && typeof window.renderChatDecorTheme === 'function') {
            window.renderChatDecorTheme(sub);
        }
    }

    // 模块装载即刻预热读取 IndexedDB
    window.loadStoredDecorBubblesAsync();

})();
