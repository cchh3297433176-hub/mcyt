/**
 * js/apps/theme/theme-bubble-ai.js
 * 🎀 微信装扮中心 · AI 智能气泡工坊中枢（独立模块）
 * 
 * 核心特性：
 *  1. 视觉参考模式（Vision AI）：支持上传/粘贴参考图片（如 Win98 窗口、拟物便签、二次元特殊框），
 *     将图片转为轻量 Base64，调用多模态大模型进行高保真样式复刻与智能逆向。
 *  2. 纯文字意向模式：若不上传图片，亦可纯靠自然语言描述（如“赛博朋克霓虹光晕”、“复古像素RPG对话框”）。
 *  3. 专家级 CSS 拟态与复古系统提示词：
 *     - 深度掌握 Windows 经典凹凸 3D 边框（border: 2px outset/inset #dfdfdf）、box-shadow 浮雕阴影；
 *     - 掌握利用背景分层与伪元素思路渲染顶栏经典深蓝渐变条与关闭键视觉；
 *     - 自动校准高对比度文本颜色（我方/对方双轨色彩），杜绝暗底看不清文字；
 *     - 自动计算合适的内边距（padding）与圆角（border-radius）。
 *  4. 健壮的 JSON 安全解析与异常自愈降级，自动接入 IndexedDB（mcyt_decor_bubbles）持久化。
 */

(function () {
    'use strict';

    // 辅助：压缩图片到适合多模态 API 读取的合理分辨率（最大边 512px，高保真同时极低 Token 消耗）
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
     * 构建专家级 CSS 气泡设计师 System Prompt
     */
    function buildBubbleDesignerSystemPrompt(hasImage) {
        return `你是一位资深前端 UI/CSS 设计大师与像素艺术专家。
你的任务是：${hasImage ? '仔细观察用户上传的参考图片并结合其文字要求' : '根据用户的设计意图'}，为即时通讯聊天界面量身定制一对高审美、高质感的 CSS 聊天气泡（我方气泡 userStyle 与 对方气泡 npcStyle）。

【设计原则与技术铁律】：
1. 容器特性：
   - 气泡将直接挂载到聊天消息的包裹 <div> 上，只能使用标准纯内联 CSS（不要写 <style> 标签或类选择器）。
   - 必须包含合理可读的字体颜色（color），确保与背景形成鲜明对比（例如深色背景必须搭配白/亮色文字，浅色背景搭配深炭黑文字）。
   - 必须包含舒适的内边距（如 padding: 8px 12px;）和折行属性（word-break: break-word;）。
2. 高级拟物与复古拟真要求（如用户提到 Windows/复古系统/终端/卡片）：
   - 严禁只输出简陋单调的纯灰底块！
   - 复古 Windows 窗口必须利用立体凹凸边框（border: 2px outset #ffffff; 或 box-shadow: inset 1px 1px 0px #fff, inset -1px -1px 0px #808080, 1px 1px 0px #000;）以及渐变顶栏层次（linear-gradient）。
   - 可以充分使用多重 background（线性渐变叠加）、多重 box-shadow 阴影、border-image、渐变边框等现代 CSS 技巧达到惊艳的仿真效果。
3. 双轨配色：
   - userStyle：我方发出的消息气泡（通常更加醒目、有归属感）。
   - npcStyle：对方角色发出的消息气泡（通常契合角色或参考图的核心主色调）。
   - userTextColor / npcTextColor：必须提取出两套最清晰刺目的 Hex 格式颜色值（如 #ffffff、#181818、#00ff9d）。
4. 严格输出格式：
   必须且仅输出标准合法的纯 JSON 字符串，绝不可包含任何 Markdown 格式声明、代码块包装（严禁输出 \`\`\`json）或前言后语。
   JSON 字段规范：
   {
     "name": "气泡名称（5-8字）",
     "userStyle": "我方完整CSS样式代码",
     "npcStyle": "对方完整CSS样式代码",
     "userTextColor": "#xxxxxx",
     "npcTextColor": "#xxxxxx",
     "fontSize": 14.5,
     "textAlign": "left"
   }`;
    }

    /**
     * 唤起 AI 智能生成气泡弹窗（支持多模态视觉参考图）
     */
    window.openAiGenerateBubbleModal = function () {
        document.getElementById('aiGenerateBubbleModal')?.remove();

        let refImageBase64 = null;

        const modal = document.createElement('div');
        modal.id = 'aiGenerateBubbleModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:100000;padding:16px;box-sizing:border-box;';

        modal.innerHTML = `
            <div style="background:#ffffff;border-radius:14px;width:100%;max-width:340px;max-height:90vh;overflow-y:auto;padding:16px;box-shadow:0 12px 32px rgba(0,0,0,0.2);box-sizing:border-box;display:flex;flex-direction:column;gap:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#07c160;fill:none;stroke-width:2;"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
                        <span style="font-size:14px;font-weight:700;color:#222;">AI 视觉仿图 & 气泡生成</span>
                    </div>
                    <button id="btnCloseAiBubbleModal" style="background:none;border:none;color:#999;font-size:16px;cursor:pointer;padding:0 4px;">✕</button>
                </div>

                <div style="font-size:11px;color:#777;line-height:1.4;">
                    可上传参考图片（如复古Win98窗口截图、特殊UI）让 AI 视觉逆向仿制，或直接键入提示词：
                </div>

                <!-- 参考图片上传/预览区 -->
                <div style="background:#f9f9f9;border:1px dashed #dcdcdc;border-radius:8px;padding:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <div id="refImgPreviewWrap" style="display:none;align-items:center;gap:8px;min-width:0;flex:1;">
                        <img id="refImgPreviewEl" src="" style="width:42px;height:42px;object-fit:cover;border-radius:6px;border:1px solid #ccc;display:block;">
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:11.5px;font-weight:600;color:#333;">已添加视觉参考图</div>
                            <div style="font-size:10px;color:#07c160;">视觉大模型将深度参考其配色与边框</div>
                        </div>
                        <button id="btnRemoveRefImg" style="border:none;background:none;color:#fa5151;font-size:12px;cursor:pointer;padding:4px;">移除</button>
                    </div>

                    <div id="refImgUploadTriggerWrap" style="width:100%;display:flex;justify-content:center;">
                        <input type="file" id="aiBubbleRefFileInput" accept="image/*" style="display:none;">
                        <button type="button" onclick="document.getElementById('aiBubbleRefFileInput').click()" style="width:100%;padding:7px;background:#ffffff;border:1px solid #d0d0d0;border-radius:6px;font-size:11.5px;color:#444;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                            <svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:#555;fill:none;stroke-width:2;"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            <span>上传参考图 / 截图 (可选)</span>
                        </button>
                    </div>
                </div>

                <!-- 需求输入区 -->
                <div>
                    <textarea id="aiBubblePromptInput" placeholder="描述设计意图，例如：复古 Windows 经典系统窗口，带浮雕立体边框；或粉色拍立得边框..." style="width:100%;box-sizing:border-box;height:75px;padding:8px 10px;border-radius:6px;border:1px solid #ddd;font-size:12px;outline:none;resize:none;line-height:1.45;"></textarea>
                </div>

                <div id="aiBubbleStatus" style="font-size:11px;color:#07c160;display:none;line-height:1.4;background:#f0f9eb;padding:6px 8px;border-radius:6px;">
                    <span id="aiBubbleStatusText">正在调度 AI 编写设计代码...</span>
                </div>

                <div style="display:flex;gap:8px;margin-top:2px;">
                    <button id="btnCancelAiBubble" style="flex:1;padding:9px;background:#f5f5f5;border:1px solid #ddd;border-radius:6px;font-size:12px;color:#555;cursor:pointer;">取消</button>
                    <button id="btnRunAiGenerateBubble" style="flex:1.5;padding:9px;background:#07c160;border:none;border-radius:6px;font-size:12px;color:#fff;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;">
                        <span>开始智能生成</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const fileInput = modal.querySelector('#aiBubbleRefFileInput');
        const previewWrap = modal.querySelector('#refImgPreviewWrap');
        const uploadTriggerWrap = modal.querySelector('#refImgUploadTriggerWrap');
        const previewEl = modal.querySelector('#refImgPreviewEl');
        const removeBtn = modal.querySelector('#btnRemoveRefImg');

        // 图片选择与压缩
        fileInput.onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            compressImageForVision(file, (base64) => {
                if (base64) {
                    refImageBase64 = base64;
                    previewEl.src = base64;
                    previewWrap.style.display = 'flex';
                    uploadTriggerWrap.style.display = 'none';
                }
            });
        };

        removeBtn.onclick = () => {
            refImageBase64 = null;
            fileInput.value = '';
            previewWrap.style.display = 'none';
            uploadTriggerWrap.style.display = 'flex';
        };

        modal.querySelector('#btnCloseAiBubbleModal').onclick = () => modal.remove();
        modal.querySelector('#btnCancelAiBubble').onclick = () => modal.remove();

        // 核心生成执行
        modal.querySelector('#btnRunAiGenerateBubble').onclick = async () => {
            const prompt = (modal.querySelector('#aiBubblePromptInput')?.value || '').trim();
            if (!prompt && !refImageBase64) {
                if (typeof showToast === 'function') showToast('请至少输入一段描述或上传一张参考图');
                return;
            }

            const statusWrap = modal.querySelector('#aiBubbleStatus');
            const statusText = modal.querySelector('#aiBubbleStatusText');
            const runBtn = modal.querySelector('#btnRunAiGenerateBubble');

            statusWrap.style.display = 'block';
            statusText.textContent = refImageBase64 ? '正在由多模态视觉模型观察参考图并推导 CSS...' : '正在编写专业 CSS 气泡代码...';
            runBtn.disabled = true;
            runBtn.style.opacity = '0.6';

            try {
                const aiConfig = JSON.parse(localStorage.getItem('mc_yt_ai_config') || '{}');
                if (!aiConfig.apiKey) throw new Error('请先在系统设置中配置 AI ApiKey');

                const baseUrl = (aiConfig.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
                const modelName = aiConfig.model || 'gpt-4o-mini';

                const sysPrompt = buildBubbleDesignerSystemPrompt(!!refImageBase64);

                // 组装消息列表（支持多模态图文输入）
                const userContent = [];
                if (refImageBase64) {
                    userContent.push({
                        type: 'image_url',
                        image_url: { url: refImageBase64, detail: 'low' }
                    });
                }
                userContent.push({
                    type: 'text',
                    text: prompt || '请根据参考图片的外观、阴影、边框与配色，复刻还原一套极具质感的聊天气泡。'
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
                            { role: 'user', content: (refImageBase64 ? userContent : (prompt || '设计一款高级气泡')) }
                        ],
                        temperature: 0.7
                    })
                });

                if (!resp.ok) {
                    const errData = await resp.json().catch(() => ({}));
                    throw new Error(errData?.error?.message || `API 请求异常 (${resp.status})`);
                }

                const data = await resp.json();
                let rawContent = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
                if (!rawContent) throw new Error('大模型未返回有效内容');

                // 剔除可能存在的 markdown 代码标记
                rawContent = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();

                let parsed = null;
                try {
                    parsed = JSON.parse(rawContent);
                } catch (pe) {
                    // 尝试自愈提取 {} 区间
                    const match = rawContent.match(/\{[\s\S]*\}/);
                    if (match) parsed = JSON.parse(match[0]);
                    else throw new Error('模型输出的内容未能解析为标准 JSON 样式');
                }

                const newId = 'bubble_ai_' + Date.now();
                const newBubble = {
                    id: newId,
                    name: parsed.name || (prompt ? prompt.slice(0, 8) : 'AI定制气泡'),
                    author: 'AI Designer',
                    type: 'css',
                    scale: 1.0,
                    fontSize: parsed.fontSize || 14.5,
                    textAlign: parsed.textAlign || 'left',
                    userStyle: parsed.userStyle || 'background:#95ec69;color:#000;border-radius:6px;',
                    npcStyle: parsed.npcStyle || 'background:#ffffff;color:#000;border:1px solid #e7e7e7;border-radius:6px;',
                    userTextColor: parsed.userTextColor || '#000000',
                    npcTextColor: parsed.npcTextColor || '#000000',
                    isBuiltin: false
                };

                // 持久化保存
                if (typeof window.saveCustomBubbleAsync === 'function') {
                    await window.saveCustomBubbleAsync(newBubble);
                }
                localStorage.setItem('mcyt_active_decor_bubble', newId);

                modal.remove();

                // 刷新个性化主题装扮视图
                const subContent = document.getElementById('themeAppSubContent');
                if (subContent && typeof window.renderChatDecorTheme === 'function') {
                    window.renderChatDecorTheme(subContent);
                }

                if (typeof showToast === 'function') showToast('AI 气泡已成功生成并启用！');

            } catch (err) {
                console.error('[Bubble AI] 生成失败:', err);
                statusWrap.style.display = 'none';
                runBtn.disabled = false;
                runBtn.style.opacity = '1';
                if (typeof showToast === 'function') showToast('生成失败: ' + err.message);
            }
        };
    };

})();
