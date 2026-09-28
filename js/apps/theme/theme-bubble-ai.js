/**
 * js/apps/theme/theme-bubble-ai.js
 * 微信装扮中心 · AI 智能气泡工坊中枢（独立模块）
 * 
 * 核心特性：
 *  1. 视觉参考模式（Vision AI）：支持上传/粘贴参考图片，转为轻量 Base64 供多模态模型逆向提取质感。
 *  2. 极高自由度专家级 CSS 设计底座：彻底解除刻板提示词限制，赋予模型广阔的拟物与现代审美发挥空间。
 *  3. 1:1 真实 HTML 视口预览舞台：生成后不强制退出，直观预览我方与对方气泡实景。
 *  4. 意见修改与双轨生成通道：支持多轮修改意见增量演进与一键重新生成。
 *  5. 历史版本管理与安全折叠回退：支持版本溯源，退出弹窗时即刻自动销毁未采用的临时版本与上下文。
 *  6. 严格遵循白灰微绿与极简 SVG 规范，消除 Emoji。
 */

(function () {
    'use strict';

    // 辅助：压缩图片到适合多模态 API 读取的合理分辨率（最大边 512px，极低 Token 消耗并保留高保真度）
    function compressImageForVision(file, callback) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const maxDim = 512;
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
                callback(compressedBase64);
            };
            img.onerror = () => callback(null);
            img.src = e.target.result;
        };
        reader.onerror = () => callback(null);
        reader.readAsDataURL(file);
    }

    /**
     * 构建专家级自由创意 CSS 气泡设计师 System Prompt
     * 赋予大模型广阔的发挥空间，杜绝思维钢印与提示词污染
     */
    function buildBubbleDesignerSystemPrompt(hasImage, isRefining) {
        return `你是一位顶级前端 UI/CSS 艺术大师与即时通讯装扮设计师。
你的任务是：${hasImage ? '仔细观察用户提供的视觉参考图，并结合用户的设计需求与创意灵感' : '根据用户的设计需求与创意灵感'}，为聊天界面量身定制一对惊艳、质感高级的 CSS 聊天气泡（我方发送气泡 userStyle 与 对方接收气泡 npcStyle）。

【极高自由度与技术发挥空间】：
1. 你的设计空间极其广阔，发挥空间没有任何限制！
   你可以随心所欲创作任意风格（例如：拟物实体卡片、复古窗口、赛博霓虹、毛玻璃光晕、古典便签纸张、极简微质感、二次元插画边框、像素终端等）。
2. 请充分调动现代纯内联 CSS 的全部高级绘制能力：
   - 善于利用多重 background 线性或径向渐变堆叠，绘制精细的顶部栏、状态条、底纹或分割线；
   - 善于利用多层 box-shadow（包含 inset 内阴影与外部投影的立体组合）营造浮雕、凹凸、悬浮景深或边缘光感；
   - 灵活运用 border、outline、border-radius 控制气泡的硬朗或柔和形态；
   - 可以使用 text-shadow、letter-spacing、font-family 增强文字与整体风格的沉浸感。
3. 容器与阅读铁律：
   - 气泡将直接以内联样式挂载在聊天容器 div 上，必须是标准内联 CSS 声明片段（不要写 <style> 标签，不要写选择器）。
   - 必须确保高可读性：文字颜色（color）必须与背景形成高对比度，深色背景搭配亮色字，浅色背景搭配深色字。
   - 必须配置合理的内边距（如 padding: 8px 12px;）和断词换行（word-break: break-word;）。
4. 双轨设计契合：
   - userStyle：我方发送方气泡样式。
   - npcStyle：对方角色接收方气泡样式。
   - userTextColor / npcTextColor：分别提炼出我方与对方气泡最高对比度的 Hex 颜色（如 #ffffff、#111111、#00f0ff）。
${isRefining ? '5. 本次任务为【在已有气泡版本基础上的增量演进】：请尊重用户给出的修改意见，在保持当前优质特性的前提下进行精准重构与细节升级。' : ''}

【严格输出规范】：
必须且仅输出合法的纯 JSON 字符串，绝对不可包含任何 Markdown 代码块包装（严禁输出 \`\`\`json 或 \`\`\`），不要包含任何前言与后语。
JSON 字段结构：
{
  "name": "气泡名称（4-8字，富有美感）",
  "userStyle": "我方完整纯CSS样式代码",
  "npcStyle": "对方完整纯CSS样式代码",
  "userTextColor": "#xxxxxx",
  "npcTextColor": "#xxxxxx",
  "fontSize": 14.5,
  "textAlign": "left"
}`;
    }

    /**
     * 唤起 AI 智能生成气泡弹窗
     * 具备：多模态视觉仿图、1:1实景视口预览、意见迭代微调、历史版本可折叠回退、退出即清缓存机制
     */
    window.openAiGenerateBubbleModal = function () {
        document.getElementById('aiGenerateBubbleModal')?.remove();

        // 会话级临时状态（弹窗关闭时彻底销毁，不留缓存与脏数据）
        let sessionState = {
            refImageBase64: null,
            basePrompt: '',
            feedbackPrompt: '',
            historyVersions: [],
            currentVersion: null,
            isHistoryCollapsed: true,
            isGenerating: false
        };

        const modal = document.createElement('div');
        modal.id = 'aiGenerateBubbleModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:100000;padding:12px;box-sizing:border-box;';

        function cleanupAndClose() {
            sessionState.refImageBase64 = null;
            sessionState.historyVersions = [];
            sessionState.currentVersion = null;
            modal.remove();
        }

        // 极简 SVG 图标
        const sparkSvg = `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:#07c160;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>`;
        const redoSvg = `<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`;
        const arrowSvg = `<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;

        function renderModal() {
            const hasResult = !!sessionState.currentVersion;
            const cur = sessionState.currentVersion;

            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:14px;width:100%;max-width:360px;max-height:94vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.25);box-sizing:border-box;display:flex;flex-direction:column;gap:12px;">
                    
                    <!-- 顶部标题与关闭 -->
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            ${sparkSvg}
                            <span style="font-size:14px;font-weight:700;color:#222;">AI 自由视觉与气泡工坊</span>
                        </div>
                        <button id="btnCloseAiModal" style="background:none;border:none;color:#999;font-size:16px;cursor:pointer;padding:2px 6px;">✕</button>
                    </div>

                    ${!hasResult ? `
                        <!-- 初次生成输入视图 -->
                        <div style="font-size:11px;color:#777;line-height:1.4;">
                            可导入参考图片（如特殊UI界面、窗口、卡片）或自由描述，AI 将自由施展 CSS 技法进行创作：
                        </div>

                        <!-- 参考图导入区 -->
                        <div style="background:#f9f9f9;border:1px dashed #dcdcdc;border-radius:8px;padding:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                            <div id="refPreviewBox" style="${sessionState.refImageBase64 ? 'display:flex;' : 'display:none;'}align-items:center;gap:8px;min-width:0;flex:1;">
                                <img src="${sessionState.refImageBase64 || ''}" style="width:42px;height:42px;object-fit:cover;border-radius:6px;border:1px solid #ccc;display:block;">
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:11.5px;font-weight:600;color:#333;">已导入视觉参考图</div>
                                    <div style="font-size:10px;color:#07c160;">视觉大模型将自由提取其层次与配色</div>
                                </div>
                                <button id="btnRemoveRefImage" style="border:none;background:none;color:#fa5151;font-size:11px;cursor:pointer;padding:4px;">移除</button>
                            </div>

                            <div id="refUploadTrigger" style="${sessionState.refImageBase64 ? 'display:none;' : 'display:flex;'}width:100%;justify-content:center;">
                                <input type="file" id="refImageFileInput" accept="image/*" style="display:none;">
                                <button type="button" id="btnChooseImage" style="width:100%;padding:8px;background:#ffffff;border:1px solid #d0d0d0;border-radius:6px;font-size:11.5px;color:#444;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                                    <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#555;fill:none;stroke-width:2;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                    <span>选取参考图 / 灵感截图 (可选)</span>
                                </button>
                            </div>
                        </div>

                        <!-- 创意描述区 -->
                        <div>
                            <textarea id="aiBubbleInitialInput" placeholder="描述你的天马行空意图（如：复古弹窗带有浮雕内阴影与深蓝渐变标题区；或粉色拍立得边框...）" style="width:100%;box-sizing:border-box;height:80px;padding:8px 10px;border-radius:6px;border:1px solid #ddd;font-size:12px;outline:none;resize:none;line-height:1.45;">${escapeHtml(sessionState.basePrompt)}</textarea>
                        </div>

                        <div id="aiBubbleLoadingStatus" style="display:${sessionState.isGenerating ? 'block' : 'none'};font-size:11px;color:#07c160;line-height:1.4;background:#f0f9eb;padding:7px 10px;border-radius:6px;">
                            <span>正在调度 AI 专家构建气泡设计，请稍候...</span>
                        </div>

                        <div style="display:flex;gap:8px;">
                            <button id="btnCancelInitial" style="flex:1;padding:9px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;">取消</button>
                            <button id="btnStartGenerate" ${sessionState.isGenerating ? 'disabled style="opacity:0.6;"' : ''} style="flex:1.5;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">
                                <span>开始智能生成</span>
                            </button>
                        </div>
                    ` : `
                        <!-- 生成后 1:1 实景预览与迭代微调视图 -->
                        
                        <!-- 真实对白实景舞台 -->
                        <div style="background:#ededed;border-radius:10px;padding:14px 10px;display:flex;flex-direction:column;gap:12px;min-height:140px;box-sizing:border-box;">
                            <!-- 角色气泡 -->
                            <div style="display:flex;justify-content:flex-start;align-items:flex-start;gap:8px;">
                                <div style="width:34px;height:34px;border-radius:6px;background:#ddd;flex-shrink:0;overflow:hidden;">
                                    <img src="assets/icons/chat.png" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';">
                                </div>
                                <div style="max-width:80%;">
                                    <div style="display:inline-block;box-sizing:border-box;font-size:${cur.fontSize || 14.5}px;text-align:${cur.textAlign || 'left'};color:${cur.npcTextColor || '#000'};${cur.npcStyle || ''}">
                                        这是对方气泡效果～无论何种风格都能自由呈现！
                                    </div>
                                </div>
                            </div>

                            <!-- 我方气泡 -->
                            <div style="display:flex;justify-content:flex-end;align-items:flex-start;gap:8px;">
                                <div style="max-width:80%;display:flex;justify-content:flex-end;">
                                    <div style="display:inline-block;box-sizing:border-box;font-size:${cur.fontSize || 14.5}px;text-align:${cur.textAlign || 'left'};color:${cur.userTextColor || '#000'};${cur.userStyle || ''}">
                                        这是我方发送效果！仔细看看是否契合你的预期？
                                    </div>
                                </div>
                                <div style="width:34px;height:34px;border-radius:6px;background:#07c160;flex-shrink:0;overflow:hidden;">
                                    <img src="${(typeof window.getPlayerAvatarSafe === 'function') ? window.getPlayerAvatarSafe() : 'assets/icons/chat.png'}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';">
                                </div>
                            </div>
                        </div>

                        <!-- 当前气泡信息与保存按钮栏 -->
                        <div style="display:flex;justify-content:space-between;align-items:center;background:#f9f9f9;padding:8px 10px;border-radius:8px;border:1px solid #eee;">
                            <div style="min-width:0;flex:1;">
                                <div style="font-size:12.5px;font-weight:600;color:#222;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(cur.name || 'AI气泡设计')}</div>
                                <div style="font-size:10px;color:#888;">当前版本 ${cur.versionNum || sessionState.historyVersions.length} · 纯 CSS 驱动</div>
                            </div>
                            <button id="btnSaveCurrentBubble" style="padding:6px 12px;background:#07c160;color:#fff;border:none;border-radius:6px;font-size:11.5px;font-weight:600;cursor:pointer;flex-shrink:0;">
                                保存此版本
                            </button>
                        </div>

                        <!-- 历史版本回退区（默认折叠） -->
                        <div style="border:1px solid #eee;border-radius:8px;background:#ffffff;overflow:hidden;">
                            <div id="btnToggleHistoryVersions" style="padding:8px 10px;background:#fafafa;display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;">
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <span style="font-size:11.5px;font-weight:600;color:#444;">历史生成版本 (${sessionState.historyVersions.length})</span>
                                    <span style="font-size:9.5px;color:#888;">可回退至旧版本继续修改</span>
                                </div>
                                <span style="font-size:10px;color:#888;transition:transform 0.2s ease;">${sessionState.isHistoryCollapsed ? '▼' : '▲'}</span>
                            </div>
                            <div id="historyVersionsListBody" style="display:${sessionState.isHistoryCollapsed ? 'none' : 'flex'};flex-direction:column;gap:6px;padding:8px;max-height:130px;overflow-y:auto;background:#fff;">
                                ${sessionState.historyVersions.map((v, idx) => {
                                    const isCur = (v.id === cur.id);
                                    return `
                                        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:6px;border:1px solid ${isCur ? '#07c160' : '#eee'};background:${isCur ? '#e8f7ed' : '#fcfcfc'};">
                                            <div style="min-width:0;flex:1;">
                                                <div style="font-size:11.5px;font-weight:${isCur ? '600' : 'normal'};color:${isCur ? '#07c160' : '#333'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                                    #${v.versionNum || (idx + 1)} ${escapeHtml(v.name || '定制气泡')}
                                                </div>
                                            </div>
                                            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                                                ${isCur ? `
                                                    <span style="font-size:10px;color:#07c160;font-weight:600;">预览中</span>
                                                ` : `
                                                    <button class="btn-switch-version" data-id="${v.id}" style="padding:3px 8px;background:#fff;border:1px solid #dcdcdc;border-radius:4px;font-size:10.5px;color:#555;cursor:pointer;">查看此版</button>
                                                `}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <!-- 修改意见与继续调优区 -->
                        <div style="display:flex;flex-direction:column;gap:6px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-size:11.5px;font-weight:600;color:#333;">修改意见与持续调优</span>
                                <span style="font-size:10px;color:#888;">支持更换参考图或精准提要求</span>
                            </div>

                            <!-- 参考图微调/重新附带 -->
                            <div style="display:flex;align-items:center;justify-content:space-between;background:#f9f9f9;border:1px solid #eee;border-radius:6px;padding:6px 8px;">
                                <div style="display:flex;align-items:center;gap:6px;min-width:0;">
                                    ${sessionState.refImageBase64 ? `
                                        <img src="${sessionState.refImageBase64}" style="width:22px;height:22px;border-radius:4px;object-fit:cover;">
                                        <span style="font-size:10.5px;color:#07c160;">当前保留有参考图</span>
                                    ` : `
                                        <span style="font-size:10.5px;color:#888;">未附带参考图</span>
                                    `}
                                </div>
                                <div style="display:flex;gap:6px;">
                                    <input type="file" id="refImageFeedbackInput" accept="image/*" style="display:none;">
                                    <button type="button" id="btnChangeFeedbackImage" style="padding:3px 7px;background:#fff;border:1px solid #ddd;border-radius:4px;font-size:10px;color:#555;cursor:pointer;">${sessionState.refImageBase64 ? '更换图' : '补充图'}</button>
                                    ${sessionState.refImageBase64 ? `<button type="button" id="btnClearFeedbackImage" style="padding:3px 7px;background:#fff;border:1px solid #fcdcdc;border-radius:4px;font-size:10px;color:#fa5151;cursor:pointer;">移除图</button>` : ''}
                                </div>
                            </div>

                            <textarea id="aiBubbleFeedbackInput" placeholder="输入修改意见，例如：标题栏蓝色再深一点；字号大一点；阴影更立体柔和..." style="width:100%;box-sizing:border-box;height:65px;padding:8px 10px;border-radius:6px;border:1px solid #ddd;font-size:11.5px;outline:none;resize:none;line-height:1.4;">${escapeHtml(sessionState.feedbackPrompt)}</textarea>
                        </div>

                        <div id="aiBubbleLoadingStatus" style="display:${sessionState.isGenerating ? 'block' : 'none'};font-size:11px;color:#07c160;line-height:1.4;background:#f0f9eb;padding:7px 10px;border-radius:6px;">
                            <span>正在结合修改意见重新计算与演进设计...</span>
                        </div>

                        <!-- 操作按钮组（重新生成、继续生成） -->
                        <div style="display:flex;gap:8px;">
                            <button id="btnRegenerateNew" ${sessionState.isGenerating ? 'disabled style="opacity:0.6;"' : ''} style="flex:1;padding:9px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:11.5px;color:#444;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">
                                ${redoSvg}
                                <span>重新生成</span>
                            </button>
                            <button id="btnContinueGenerate" ${sessionState.isGenerating ? 'disabled style="opacity:0.6;"' : ''} style="flex:1.5;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:11.5px;color:#fff;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;">
                                <span>继续生成</span>
                                ${arrowSvg}
                            </button>
                        </div>
                    `}
                </div>
            `;

            bindEvents();
        }

        function bindEvents() {
            modal.querySelector('#btnCloseAiModal')?.addEventListener('click', cleanupAndClose);

            // 初次视图事件绑定
            const chooseImgBtn = modal.querySelector('#btnChooseImage');
            const fileInput = modal.querySelector('#refImageFileInput');
            if (chooseImgBtn && fileInput) {
                chooseImgBtn.onclick = () => fileInput.click();
                fileInput.onchange = (e) => {
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    compressImageForVision(f, (b64) => {
                        sessionState.refImageBase64 = b64;
                        renderModal();
                    });
                };
            }

            modal.querySelector('#btnRemoveRefImage')?.addEventListener('click', () => {
                sessionState.refImageBase64 = null;
                renderModal();
            });

            modal.querySelector('#btnCancelInitial')?.addEventListener('click', cleanupAndClose);

            modal.querySelector('#btnStartGenerate')?.addEventListener('click', () => {
                const text = (modal.querySelector('#aiBubbleInitialInput')?.value || '').trim();
                sessionState.basePrompt = text;
                executeGenerateBubble(false);
            });

            // 预览视图事件绑定
            modal.querySelector('#btnSaveCurrentBubble')?.addEventListener('click', async () => {
                if (!sessionState.currentVersion) return;
                const v = sessionState.currentVersion;
                const itemToSave = {
                    id: v.id,
                    name: v.name || 'AI气泡设计',
                    author: 'AI Designer',
                    type: 'css',
                    scale: 1.0,
                    fontSize: v.fontSize || 14.5,
                    textAlign: v.textAlign || 'left',
                    userStyle: v.userStyle || '',
                    npcStyle: v.npcStyle || '',
                    userTextColor: v.userTextColor || '#000000',
                    npcTextColor: v.npcTextColor || '#000000',
                    isBuiltin: false
                };

                if (typeof window.saveCustomBubbleAsync === 'function') {
                    await window.saveCustomBubbleAsync(itemToSave);
                }
                localStorage.setItem('mcyt_active_decor_bubble', itemToSave.id);

                const subContent = document.getElementById('themeAppSubContent');
                if (subContent && typeof window.renderChatDecorTheme === 'function') {
                    window.renderChatDecorTheme(subContent);
                }

                if (typeof showToast === 'function') {
                    showToast('当前版本已成功保存并启用！');
                }
            });

            // 折叠历史版本切换
            modal.querySelector('#btnToggleHistoryVersions')?.addEventListener('click', () => {
                sessionState.isHistoryCollapsed = !sessionState.isHistoryCollapsed;
                renderModal();
            });

            // 切换查看历史版本
            modal.querySelectorAll('.btn-switch-version').forEach(btn => {
                btn.onclick = () => {
                    const targetId = btn.getAttribute('data-id');
                    const found = sessionState.historyVersions.find(x => x.id === targetId);
                    if (found) {
                        sessionState.currentVersion = found;
                        renderModal();
                    }
                };
            });

            // 修改意见中的参考图变更
            const btnChangeFeedImg = modal.querySelector('#btnChangeFeedbackImage');
            const feedFileInput = modal.querySelector('#refImageFeedbackInput');
            if (btnChangeFeedImg && feedFileInput) {
                btnChangeFeedImg.onclick = () => feedFileInput.click();
                feedFileInput.onchange = (e) => {
                    const f = e.target.files && e.target.files[0];
                    if (!f) return;
                    compressImageForVision(f, (b64) => {
                        sessionState.refImageBase64 = b64;
                        renderModal();
                    });
                };
            }

            modal.querySelector('#btnClearFeedbackImage')?.addEventListener('click', () => {
                sessionState.refImageBase64 = null;
                renderModal();
            });

            // 重新生成
            modal.querySelector('#btnRegenerateNew')?.addEventListener('click', () => {
                const feedback = (modal.querySelector('#aiBubbleFeedbackInput')?.value || '').trim();
                sessionState.feedbackPrompt = feedback;
                executeGenerateBubble(false);
            });

            // 继续生成（基于当前版本演进）
            modal.querySelector('#btnContinueGenerate')?.addEventListener('click', () => {
                const feedback = (modal.querySelector('#aiBubbleFeedbackInput')?.value || '').trim();
                sessionState.feedbackPrompt = feedback;
                executeGenerateBubble(true);
            });
        }

        // 调用大模型生成气泡
        async function executeGenerateBubble(isRefining = false) {
            sessionState.isGenerating = true;
            renderModal();

            try {
                const aiConfig = JSON.parse(localStorage.getItem('mc_yt_ai_config') || '{}');
                if (!aiConfig.apiKey) throw new Error('请先在系统设置中配置 AI ApiKey');

                const baseUrl = (aiConfig.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
                const modelName = aiConfig.model || 'gpt-4o-mini';

                const sysPrompt = buildBubbleDesignerSystemPrompt(!!sessionState.refImageBase64, isRefining);

                // 组装 Prompt
                let userPromptText = '';
                if (isRefining) {
                    const cur = sessionState.currentVersion;
                    userPromptText = `【当前基准版本样式】：\n` +
                        `气泡名称: ${cur?.name || '当前气泡'}\n` +
                        `我方样式: ${cur?.userStyle || ''}\n` +
                        `对方样式: ${cur?.npcStyle || ''}\n` +
                        `我方字色: ${cur?.userTextColor || '#000'}\n` +
                        `对方字色: ${cur?.npcTextColor || '#000'}\n\n` +
                        `【用户提出的修改意见】：\n${sessionState.feedbackPrompt || '请在保持当前优秀特点的同时，进一步提升细节质感与排版美感。'}`;
                } else {
                    userPromptText = sessionState.basePrompt || '请根据参考视觉或你的灵感设计一套高质感的气泡。';
                }

                const userContent = [];
                if (sessionState.refImageBase64) {
                    userContent.push({
                        type: 'image_url',
                        image_url: { url: sessionState.refImageBase64, detail: 'low' }
                    });
                }
                userContent.push({
                    type: 'text',
                    text: userPromptText
                });

                const resp = await fetch(baseUrl + '/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${aiConfig.apiKey}`
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages: [
                            { role: 'system', content: sysPrompt },
                            { role: 'user', content: (sessionState.refImageBase64 ? userContent : userPromptText) }
                        ],
                        temperature: 0.75
                    })
                });

                if (!resp.ok) {
                    const errData = await resp.json().catch(() => ({}));
                    throw new Error(errData?.error?.message || `API 请求异常 (${resp.status})`);
                }

                const data = await resp.json();
                let raw = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
                if (!raw) throw new Error('大模型未返回有效设计代码');

                raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

                let parsed = null;
                try {
                    parsed = JSON.parse(raw);
                } catch (pe) {
                    const match = raw.match(/\{[\s\S]*\}/);
                    if (match) parsed = JSON.parse(match[0]);
                    else throw new Error('未能从模型返回中提取出标准 JSON');
                }

                const versionIndex = sessionState.historyVersions.length + 1;
                const newVersion = {
                    id: 'bubble_ai_' + Date.now(),
                    versionNum: versionIndex,
                    name: parsed.name || (sessionState.basePrompt ? sessionState.basePrompt.slice(0, 8) : `AI定制版_${versionIndex}`),
                    userStyle: parsed.userStyle || 'background:#95ec69;color:#000;border-radius:6px;',
                    npcStyle: parsed.npcStyle || 'background:#ffffff;color:#000;border:1px solid #e7e7e7;border-radius:6px;',
                    userTextColor: parsed.userTextColor || '#000000',
                    npcTextColor: parsed.npcTextColor || '#000000',
                    fontSize: parsed.fontSize || 14.5,
                    textAlign: parsed.textAlign || 'left',
                    timestamp: Date.now()
                };

                // 加入历史版本序列
                sessionState.historyVersions.unshift(newVersion);
                sessionState.currentVersion = newVersion;
                sessionState.feedbackPrompt = ''; // 成功后重置输入框

            } catch (err) {
                console.error('[Bubble AI] 创作失败:', err);
                if (typeof showToast === 'function') showToast('生成失败: ' + err.message);
            } finally {
                sessionState.isGenerating = false;
                renderModal();
            }
        }

        document.body.appendChild(modal);
        renderModal();
    };

})();
