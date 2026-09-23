// js/apps/settings/settings-app.js
// 📱 系统设置中心 App（全站版本号唯一定义源 · 微信原生白灰微绿设计 · 小手机记忆卡原生直接下载 · 备份周期提醒）
// ============================================================

// 🌟【全项目版本号唯一真源】：以后打包发新版本，直接在此修改此常量即可！
const CURRENT_APP_VERSION = '1.611';
window.CURRENT_APP_VERSION = CURRENT_APP_VERSION;

(function(window) {
    'use strict';

    // 默认内置核心模型库
    const DEFAULT_MODEL_PRESETS = [
        'gpt-4o-mini',
        'gpt-4o',
        'chatgpt-4o-latest',
        'deepseek-chat',
        'deepseek-reasoner',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'gemini-1.5-pro-latest',
        'gemini-1.5-flash-latest',
        'gemini-2.5-flash',
        'qwen-plus',
        'qwen-max'
    ];

    let isProfileArchiveCollapsed = true; // 方案存档默认折叠

    // 备份提醒配置与状态存取
    function getBackupReminderConfig() {
        try {
            const raw = localStorage.getItem('mcyt_backup_reminder_cfg');
            return raw ? JSON.parse(raw) : { intervalDays: 7, lastBackupDay: 1, lastBackupTime: 0 };
        } catch (_) {
            return { intervalDays: 7, lastBackupDay: 1, lastBackupTime: 0 };
        }
    }

    function saveBackupReminderConfig(cfg) {
        try {
            localStorage.setItem('mcyt_backup_reminder_cfg', JSON.stringify(cfg));
        } catch (_) {}
    }

    // 获取当前 AI 配置
    function getSafeAIConfig() {
        const cfg = {
            baseUrl: 'https://api.openai.com/v1',
            apiKey: '',
            model: 'gpt-4o-mini',
            agentProfileName: 'follow_global',
            modelsList: [...DEFAULT_MODEL_PRESETS]
        };
        try {
            if (typeof loadAIConfig === 'function') loadAIConfig();
            if (window.G && window.G.ai) {
                Object.assign(cfg, window.G.ai);
            } else {
                const s = localStorage.getItem('mc_yt_ai_config') || localStorage.getItem('mcyt_ai_config');
                if (s) Object.assign(cfg, JSON.parse(s));
            }
        } catch (_) {}
        if (!Array.isArray(cfg.modelsList) || cfg.modelsList.length === 0) {
            cfg.modelsList = [...DEFAULT_MODEL_PRESETS];
        }
        return cfg;
    }

    // 获取当前联网搜索配置
    function getSafeSearchConfig() {
        const cfg = {
            enabled: true,
            provider: 'bing_local',
            keys: { bocha: '', metaso: '', tavily: '' },
            maxResults: 3
        };
        try {
            if (typeof loadSearchConfig === 'function') loadSearchConfig();
            if (window.G && window.G.search) {
                Object.assign(cfg, window.G.search);
                if (window.G.search.keys) Object.assign(cfg.keys, window.G.search.keys);
            } else {
                const s = localStorage.getItem('mc_yt_search_config');
                if (s) {
                    const parsed = JSON.parse(s);
                    Object.assign(cfg, parsed);
                    if (parsed.keys) Object.assign(cfg.keys, parsed.keys);
                }
            }
        } catch (_) {}
        return cfg;
    }

    function getAIProfiles() {
        try {
            return JSON.parse(localStorage.getItem('mcyt_ai_profiles') || '[]');
        } catch (_) {
            return [];
        }
    }

    function saveAIProfiles(list) {
        try {
            localStorage.setItem('mcyt_ai_profiles', JSON.stringify(list));
        } catch (_) {}
    }

    // 仿微信居中白灰输入弹窗
    function openWechatInputModal(title, defaultVal, placeholder, onConfirm) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const retroModalTitle = document.getElementById('retroModalTitle');
        if (!modal || !modalBody) return;

        if (retroModalTitle) retroModalTitle.textContent = title || '输入内容';

        modalBody.innerHTML = `
            <div style="font-size:13px;color:#222;margin-bottom:10px;font-weight:600;">
                请输入内容：
            </div>
            <input type="text" id="wechatCustomInputVal" value="${escapeHtml(defaultVal || '')}" placeholder="${escapeHtml(placeholder || '')}" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #e0e0e0;background:#f9f9f9;font-size:13px;outline:none;color:#222;box-sizing:border-box;">
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px;">
                <button onclick="closeModal()" style="padding:7px 16px;border-radius:6px;border:1px solid #e0e0e0;background:#f5f5f5;color:#666;font-size:12.5px;cursor:pointer;">取消</button>
                <button id="wechatCustomInputConfirmBtn" style="padding:7px 20px;border-radius:6px;border:none;background:#07c160;color:#fff;font-size:12.5px;font-weight:600;cursor:pointer;">确定</button>
            </div>
        `;

        modal.classList.add('open');

        const input = document.getElementById('wechatCustomInputVal');
        if (input) {
            input.focus();
            input.select();
        }

        const confirmBtn = document.getElementById('wechatCustomInputConfirmBtn');
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                const val = input ? input.value.trim() : '';
                if (typeof onConfirm === 'function') onConfirm(val);
                closeModal();
            };
        }
    }

    // 仿微信居中白灰确认弹窗
    function openWechatConfirmModal(title, msg, onConfirm) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const retroModalTitle = document.getElementById('retroModalTitle');
        if (!modal || !modalBody) return;

        if (retroModalTitle) retroModalTitle.textContent = title || '提示';

        modalBody.innerHTML = `
            <div style="font-size:13.5px;line-height:1.6;color:#333;padding:6px 0;">
                ${escapeHtml(msg)}
            </div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;">
                <button onclick="closeModal()" style="padding:7px 16px;border-radius:6px;border:1px solid #e0e0e0;background:#f5f5f5;color:#666;font-size:12.5px;cursor:pointer;">取消</button>
                <button id="wechatConfirmActionBtn" style="padding:7px 20px;border-radius:6px;border:none;background:#07c160;color:#fff;font-size:12.5px;font-weight:600;cursor:pointer;">确定</button>
            </div>
        `;

        modal.classList.add('open');

        const confirmBtn = document.getElementById('wechatConfirmActionBtn');
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                if (typeof onConfirm === 'function') onConfirm();
                closeModal();
            };
        }
    }

    // 仿微信纯白单选弹窗：选择主模型
    function openModelPickerModal(currentModel, availableModels, onSelected) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const retroModalTitle = document.getElementById('retroModalTitle');
        if (!modal || !modalBody) return;

        if (retroModalTitle) retroModalTitle.textContent = '选择游戏主剧情模型';

        modalBody.innerHTML = `
            <div style="margin-bottom:10px;">
                <input type="text" id="pickerSearchModelInput" placeholder="🔍 快速过滤模型..." style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #e5e5e5;background:#f9f9f9;font-size:12px;outline:none;box-sizing:border-box;">
            </div>
            <div id="pickerModelListContainer" style="max-height:280px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:2px;"></div>
            <div style="margin-top:14px;text-align:right;">
                <button onclick="closeModal()" style="padding:6px 14px;border-radius:6px;border:1px solid #e0e0e0;background:#f5f5f5;color:#666;font-size:12px;cursor:pointer;">关闭</button>
            </div>
        `;

        modal.classList.add('open');

        function renderList(kw = '') {
            const listEl = document.getElementById('pickerModelListContainer');
            if (!listEl) return;
            const query = kw.toLowerCase().trim();
            const filtered = availableModels.filter(m => !query || m.toLowerCase().includes(query));

            if (filtered.length === 0) {
                listEl.innerHTML = `<div style="text-align:center;padding:20px;color:#999;font-size:12px;">未匹配到相关模型</div>`;
                return;
            }

            listEl.innerHTML = filtered.map(m => {
                const isSelected = (m === currentModel);
                return `
                    <div class="wechat-model-pick-item" data-val="${escapeHtml(m)}" style="background:${isSelected ? '#f0f9eb' : '#ffffff'};border:1px solid ${isSelected ? '#07c160' : '#eeeeee'};padding:9px 12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:all 0.15s ease;">
                        <span style="font-size:12.5px;font-weight:${isSelected ? '600' : 'normal'};color:${isSelected ? '#07c160' : '#222222'};word-break:break-all;">${escapeHtml(m)}</span>
                        <div style="width:16px;height:16px;border-radius:50%;border:1.5px solid ${isSelected ? '#07c160' : '#cccccc'};display:flex;align-items:center;justify-content:center;background:#fff;flex-shrink:0;margin-left:8px;">
                            ${isSelected ? `<div style="width:8px;height:8px;border-radius:50%;background:#07c160;"></div>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            listEl.querySelectorAll('.wechat-model-pick-item').forEach(item => {
                item.onclick = () => {
                    const val = item.dataset.val;
                    if (typeof onSelected === 'function') onSelected(val);
                    closeModal();
                };
            });
        }

        renderList();

        const searchInp = document.getElementById('pickerSearchModelInput');
        if (searchInp) {
            searchInp.oninput = () => renderList(searchInp.value);
            searchInp.focus();
        }
    }

    // 仿微信白灰单选弹窗：向导模型配置方案选择
    function openAgentModelPickerModal(currentChoice, onSelected) {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const retroModalTitle = document.getElementById('retroModalTitle');
        if (!modal || !modalBody) return;

        if (retroModalTitle) retroModalTitle.textContent = '选择向导使用的配置方案';

        const profiles = getAIProfiles();
        const globalCfg = getSafeAIConfig();

        const options = [
            { name: 'follow_global', label: '跟随全局主模型', desc: `当前主模型: ${globalCfg.model || '未设定'}` }
        ];

        profiles.forEach(p => {
            options.push({
                name: p.name,
                label: p.name,
                desc: `方案模型: ${p.config?.model || '未设定'}`
            });
        });

        modalBody.innerHTML = `
            <div style="font-size:12px;color:#666;margin-bottom:10px;">
                请选择向导使用的独立方案：
            </div>
            <div style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:2px;">
                ${options.map(opt => {
                    const isSelected = (opt.name === currentChoice);
                    return `
                        <div class="agent-profile-select-card" data-val="${escapeHtml(opt.name)}" style="background:${isSelected ? '#f0f9eb' : '#ffffff'};border:1px solid ${isSelected ? '#07c160' : '#eeeeee'};padding:10px 12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                            <div style="display:flex;flex-direction:column;gap:2px;">
                                <span style="font-size:12.5px;font-weight:${isSelected ? '600' : 'normal'};color:${isSelected ? '#07c160' : '#222222'};">${escapeHtml(opt.label)}</span>
                                <span style="font-size:11px;color:#888;">${escapeHtml(opt.desc)}</span>
                            </div>
                            <div style="width:16px;height:16px;border-radius:50%;border:1.5px solid ${isSelected ? '#07c160' : '#cccccc'};display:flex;align-items:center;justify-content:center;background:#fff;">
                                ${isSelected ? `<div style="width:8px;height:8px;border-radius:50%;background:#07c160;"></div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div style="margin-top:14px;text-align:right;">
                <button onclick="closeModal()" style="padding:6px 14px;border-radius:6px;border:1px solid #e0e0e0;background:#f5f5f5;color:#666;font-size:12px;cursor:pointer;">关闭</button>
            </div>
        `;

        modal.classList.add('open');

        modalBody.querySelectorAll('.agent-profile-select-card').forEach(card => {
            card.onclick = () => {
                const val = card.dataset.val;
                if (typeof onSelected === 'function') onSelected(val);
                closeModal();
            };
        });
    }

    // ============================================================
    // 📇 PNG 底层 tEXt 块编码与 CRC32 校验工具（与角色卡相同规范）
    // ============================================================
    function calculateCrc32(buf) {
        let table = window._mcytCrcTable;
        if (!table) {
            table = new Uint8Array(256);
            for (let i = 0; i < 256; i++) {
                let c = i;
                for (let k = 0; k < 8; k++) {
                    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                }
                table[i] = c;
            }
            window._mcytCrcTable = table;
        }
        let crc = 0 ^ (-1);
        for (let i = 0; i < buf.length; i++) {
            crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
        }
        return (crc ^ (-1)) >>> 0;
    }

    function buildPngTextChunk(keyword, text) {
        const keyBytes = new TextEncoder().encode(keyword);
        const textBytes = new TextEncoder().encode(text);
        const dataLen = keyBytes.length + 1 + textBytes.length;
        const chunk = new Uint8Array(4 + 4 + dataLen + 4);

        const view = new DataView(chunk.buffer);
        view.setUint32(0, dataLen);
        chunk[4] = 0x74; chunk[5] = 0x45; chunk[6] = 0x74; chunk[7] = 0x74; // 'tEXt'

        let offset = 8;
        chunk.set(keyBytes, offset);
        offset += keyBytes.length;
        chunk[offset++] = 0; // 零分隔符
        chunk.set(textBytes, offset);
        offset += textBytes.length;

        const crcData = chunk.subarray(4, 8 + dataLen);
        view.setUint32(offset, calculateCrc32(crcData));
        return chunk;
    }

    // 🌟 全量记忆备份卡导出：直接下载到设备存储（使用 DataURL 避免 WebView 拦截）
    function openMemoryCardExportModal() {
        if (!window.G) {
            if (typeof showToast === 'function') showToast('游戏状态未就绪', 'error');
            return;
        }

        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const retroModalTitle = document.getElementById('retroModalTitle');
        if (!modal || !modalBody) return;

        if (retroModalTitle) retroModalTitle.textContent = '导出小手机记忆卡';

        const curDay = window.G.day || 1;
        const curName = window.G.player?.ytName || '主播';
        const defaultFilename = `MCYT_记忆卡_第${curDay}天_${curName}.png`;

        let currentCoverDataUrl = window.G.player?.avatarLive2d || window.G.player?.skin || '';
        const fallbackCoverSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%232b8a3e"/><circle cx="200" cy="160" r="70" fill="%23ffffff" opacity="0.9"/><text x="200" y="270" fill="%23ffffff" font-size="28" font-weight="bold" font-family="sans-serif" text-anchor="middle">MCYT MEMORY CARD</text><text x="200" y="310" fill="%23e0e0e0" font-size="18" font-family="sans-serif" text-anchor="middle">Day ' + curDay + ' · ' + encodeURIComponent(curName) + '</text></svg>';

        if (!currentCoverDataUrl || !currentCoverDataUrl.startsWith('data:image')) {
            currentCoverDataUrl = fallbackCoverSvg;
        }

        modalBody.innerHTML = `
            <div style="font-size:12.5px;color:#666;margin-bottom:12px;line-height:1.5;">
                将当前小手机的所有人设、通讯录、完整聊天、朋友圈、动态配图及小号数据打包封装为标准的 PNG 记忆卡，直接下载保存。
            </div>

            <div style="display:flex;gap:12px;align-items:center;background:#f9f9f9;padding:10px;border-radius:10px;border:1px solid #eeeeee;margin-bottom:12px;">
                <div style="position:relative;width:68px;height:68px;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;flex-shrink:0;background:#eee;">
                    <img id="memoryCardCoverPreview" src="${currentCoverDataUrl}" style="width:100%;height:100%;object-fit:cover;" />
                </div>
                <div style="flex:1;">
                    <div style="font-size:12.5px;font-weight:600;color:#222;margin-bottom:4px;">卡面封面图像</div>
                    <div style="font-size:11px;color:#888;margin-bottom:6px;">默认使用当前皮套/形象，支持自选相册封面</div>
                    <button id="chooseCustomCardCoverBtn" style="padding:4px 10px;font-size:11px;border-radius:6px;border:1px solid #d0d0d0;background:#fff;color:#333;cursor:pointer;">更换封面图</button>
                    <input type="file" id="memoryCardCoverFileInput" accept="image/*" style="display:none;" />
                </div>
            </div>

            <div style="margin-bottom:12px;">
                <label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:4px;">保存卡片文件名</label>
                <input type="text" id="memoryCardFilenameInput" value="${escapeHtml(defaultFilename)}" style="width:100%;padding:8px 10px;border-radius:6px;border:1px solid #e0e0e0;background:#fff;font-size:12px;color:#222;box-sizing:border-box;outline:none;" />
            </div>

            <div style="margin-bottom:14px;">
                <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#555;cursor:pointer;">
                    <input type="checkbox" id="memoryCardIncludeApiKeyToggle" style="accent-color:#07c160;" />
                    <span>导出时包含当前 API Key（私密数据）</span>
                </label>
            </div>

            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button onclick="closeModal()" style="padding:7px 14px;border-radius:6px;border:1px solid #e0e0e0;background:#f5f5f5;color:#666;font-size:12px;cursor:pointer;">取消</button>
                <button id="doDownloadMemoryCardBtn" style="padding:7px 20px;border-radius:6px;border:none;background:#07c160;color:#fff;font-size:12.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                    <span>下载记忆卡</span>
                </button>
            </div>
        `;

        modal.classList.add('open');

        const coverFileInput = document.getElementById('memoryCardCoverFileInput');
        const chooseCoverBtn = document.getElementById('chooseCustomCardCoverBtn');
        const coverPreview = document.getElementById('memoryCardCoverPreview');

        if (chooseCoverBtn && coverFileInput) {
            chooseCoverBtn.onclick = () => coverFileInput.click();
            coverFileInput.onchange = (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    currentCoverDataUrl = ev.target.result;
                    if (coverPreview) coverPreview.src = currentCoverDataUrl;
                };
                reader.readAsDataURL(file);
            };
        }

        const downloadBtn = document.getElementById('doDownloadMemoryCardBtn');
        if (downloadBtn) {
            downloadBtn.onclick = async () => {
                const filenameInput = document.getElementById('memoryCardFilenameInput');
                let finalFilename = (filenameInput?.value || '').trim() || defaultFilename;
                if (!finalFilename.toLowerCase().endsWith('.png')) finalFilename += '.png';
                finalFilename = finalFilename.replace(/[\\/:*?"<>|]/g, '_');

                const includeKey = !!document.getElementById('memoryCardIncludeApiKeyToggle')?.checked;

                downloadBtn.disabled = true;
                downloadBtn.textContent = '正在封装记忆卡...';

                try {
                    let payload;
                    if (typeof serializeGameState === 'function') {
                        payload = serializeGameState();
                    } else if (typeof window.G === 'object') {
                        payload = JSON.parse(JSON.stringify(window.G));
                    } else {
                        throw new Error('无法读取游戏当前数据');
                    }

                    if (!includeKey && payload.ai) {
                        payload.ai = Object.assign({}, payload.ai, { apiKey: '' });
                    }

                    const fullCardData = {
                        app: 'MC_YouTube_Simulator',
                        version: CURRENT_APP_VERSION,
                        timestamp: Date.now(),
                        day: window.G.day || 1,
                        author: window.G.player?.ytName || 'MC女主播',
                        data: payload
                    };

                    const jsonStr = JSON.stringify(fullCardData);
                    const base64Json = btoa(unescape(encodeURIComponent(jsonStr)));

                    // 绘制底图 Canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = 400;
                    canvas.height = 400;
                    const ctx = canvas.getContext('2d');

                    const img = new Image();
                    if (!currentCoverDataUrl.startsWith('data:')) {
                        img.crossOrigin = 'anonymous';
                    }
                    img.src = currentCoverDataUrl;

                    await new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = () => {
                            img.removeAttribute('crossOrigin');
                            img.src = fallbackCoverSvg;
                            img.onload = resolve;
                            img.onerror = resolve;
                        };
                    });

                    let arrayBuf;
                    try {
                        ctx.drawImage(img, 0, 0, 400, 400);
                        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
                        if (blob) arrayBuf = await blob.arrayBuffer();
                    } catch (_) {}

                    if (!arrayBuf) {
                        ctx.fillStyle = '#07c160';
                        ctx.fillRect(0, 0, 400, 400);
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 36px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('MCYT MEMORY CARD', 200, 200);
                        const fBlob = await new Promise(res => canvas.toBlob(res, 'image/png'));
                        arrayBuf = await fBlob.arrayBuffer();
                    }

                    const srcBytes = new Uint8Array(arrayBuf);
                    const view = new DataView(srcBytes.buffer);
                    const ihdrLen = view.getUint32(8);
                    const insertPos = 8 + 4 + 4 + ihdrLen + 4;

                    const textChunk = buildPngTextChunk('mcyt_memory_card', base64Json);

                    const out = new Uint8Array(srcBytes.length + textChunk.length);
                    out.set(srcBytes.subarray(0, insertPos), 0);
                    out.set(textChunk, insertPos);
                    out.set(srcBytes.subarray(insertPos), insertPos + textChunk.length);

                    const outBlob = new Blob([out], { type: 'image/png' });

                    // 🚀 核心关键：转为 DataURL（兼容原生 Android WebView 直接下到 Download 目录）
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const dataUrl = reader.result;
                        const a = document.createElement('a');
                        a.href = dataUrl;
                        a.download = finalFilename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);

                        // 更新备份周期记录
                        const rCfg = getBackupReminderConfig();
                        rCfg.lastBackupDay = window.G.day || 1;
                        rCfg.lastBackupTime = Date.now();
                        saveBackupReminderConfig(rCfg);

                        closeModal();
                        if (typeof showToast === 'function') {
                            showToast(`✅ 记忆卡 [${finalFilename}] 已直接下载到存储目录！`, 'success', 3500);
                        }
                    };
                    reader.readAsDataURL(outBlob);

                } catch (err) {
                    console.error('导出记忆卡失败', err);
                    if (typeof showToast === 'function') showToast('导出记忆卡失败: ' + err.message, 'error');
                } finally {
                    downloadBtn.disabled = false;
                    downloadBtn.textContent = '下载记忆卡';
                }
            };
        }
    }

    // 🌟 导入小手机记忆备份卡（PNG / JSON）
    function openMemoryCardImportModal() {
        let fileInput = document.getElementById('memoryCardImportFileInput');
        if (!fileInput) {
            fileInput = document.createElement('input');
            fileInput.id = 'memoryCardImportFileInput';
            fileInput.type = 'file';
            fileInput.accept = 'image/png,.png,.json';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);

            fileInput.onchange = (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                _executeMemoryCardFileRestore(file);
                fileInput.value = '';
            };
        }
        fileInput.click();
    }

    function _executeMemoryCardFileRestore(file) {
        if (typeof showToast === 'function') showToast('正在解析记忆卡数据...', 'info', 2000);

        const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

        if (isPng) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const buf = e.target.result;
                try {
                    const view = new DataView(buf);
                    if (view.getUint32(0) !== 0x89504E47) {
                        throw new Error('不是标准的 PNG 格式图片');
                    }

                    let offset = 8;
                    let foundJson = null;

                    while (offset < buf.byteLength) {
                        if (offset + 8 > buf.byteLength) break;
                        const length = view.getUint32(offset);
                        const type = [
                            String.fromCharCode(view.getUint8(offset + 4)),
                            String.fromCharCode(view.getUint8(offset + 5)),
                            String.fromCharCode(view.getUint8(offset + 6)),
                            String.fromCharCode(view.getUint8(offset + 7))
                        ].join('');

                        const dataOffset = offset + 8;
                        if (type === 'tEXt' && dataOffset + length <= buf.byteLength) {
                            const bytes = new Uint8Array(buf, dataOffset, length);
                            let nullIdx = -1;
                            for (let i = 0; i < bytes.length; i++) {
                                if (bytes[i] === 0) { nullIdx = i; break; }
                            }
                            if (nullIdx !== -1) {
                                const key = new TextDecoder('latin1').decode(bytes.subarray(0, nullIdx));
                                const val = new TextDecoder('utf-8').decode(bytes.subarray(nullIdx + 1));
                                if (key === 'mcyt_memory_card' || key === 'mcyt_save_data') {
                                    foundJson = val;
                                    break;
                                }
                            }
                        }
                        offset += 4 + 4 + length + 4;
                    }

                    if (!foundJson) {
                        throw new Error('未在该图片中检测到记忆卡数据，请确认是否为记忆卡原图。');
                    }

                    let decodedStr = '';
                    try {
                        decodedStr = decodeURIComponent(escape(atob(foundJson)));
                    } catch (_) {
                        try {
                            decodedStr = atob(foundJson);
                        } catch (_) {
                            decodedStr = foundJson;
                        }
                    }

                    const parsed = JSON.parse(decodedStr);
                    const realState = (parsed && parsed.data) ? parsed.data : parsed;
                    _applyMemoryCardToGame(realState);
                } catch (err) {
                    openWechatConfirmModal('导入失败', '解析记忆卡图片失败：' + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result.trim());
                    const realState = (parsed && parsed.data) ? parsed.data : parsed;
                    _applyMemoryCardToGame(realState);
                } catch (err) {
                    openWechatConfirmModal('导入失败', 'JSON 格式解析失败：' + err.message);
                }
            };
            reader.readAsText(file, 'utf-8');
        }
    }

    function _applyMemoryCardToGame(stateData) {
        if (!stateData || (!stateData.player && !stateData.npcs)) {
            openWechatConfirmModal('提示', '记忆卡中不包含有效的游戏人物或世界数据！');
            return;
        }

        openWechatConfirmModal(
            '确认载入记忆卡',
            `即将载入主播 [${stateData.player?.ytName || '主角'}] (第 ${stateData.day || 1} 天) 的全量记忆，这将覆盖当前小手机的游玩状态，确定继续吗？`,
            () => {
                try {
                    if (typeof applyDeserializedGameState === 'function') {
                        applyDeserializedGameState(stateData);
                    } else if (window.G) {
                        Object.assign(window.G, stateData);
                    }

                    if (typeof autoSaveGame === 'function') {
                        autoSaveGame();
                    }

                    if (typeof updateUI === 'function') updateUI();
                    if (typeof renderAllPanels === 'function') renderAllPanels();

                    const rCfg = getBackupReminderConfig();
                    rCfg.lastBackupDay = window.G.day || 1;
                    rCfg.lastBackupTime = Date.now();
                    saveBackupReminderConfig(rCfg);

                    renderSettingsApp();
                    if (typeof showToast === 'function') showToast('🎉 记忆卡已成功还原至小手机！', 'success', 3000);
                } catch (e) {
                    openWechatConfirmModal('错误', '应用记忆卡数据时发生异常: ' + e.message);
                }
            }
        );
    }

    // 渲染系统设置主视窗
    function renderSettingsApp() {
        const body = document.getElementById('appModalBody');
        const title = document.getElementById('appModalTitle');
        if (!body) return;

        if (title) title.textContent = '系统设置';

        const orbCfg = window.ErrorMonitor ? window.ErrorMonitor.getConfig() : { enabled: true, size: 46, shape: 'circle' };
        const appVer = CURRENT_APP_VERSION;
        const aiCfg = getSafeAIConfig();
        const searchCfg = getSafeSearchConfig();
        const profiles = getAIProfiles();
        const activeProfileName = localStorage.getItem('mcyt_active_ai_profile_name') || '默认配置';
        const reminderCfg = getBackupReminderConfig();

        let agentDisplayLabel = '跟随全局主模型';
        let agentDisplaySub = `主模型: ${aiCfg.model || '未设定'}`;
        const curAgentSetting = aiCfg.agentProfileName || aiCfg.agentModel || 'follow_global';

        if (curAgentSetting !== 'follow_global') {
            const foundP = profiles.find(p => p.name === curAgentSetting);
            if (foundP) {
                agentDisplayLabel = foundP.name;
                agentDisplaySub = `使用方案模型: ${foundP.config?.model || '未设定'}`;
            } else {
                agentDisplayLabel = curAgentSetting;
                agentDisplaySub = '专属独立设置';
            }
        }

        body.innerHTML = `
            <div class="settings-app-container" style="padding:12px 14px 36px 14px;background:#f7f7f7;min-height:100%;box-sizing:border-box;">
                
                <!-- 导航分段药丸（微信原生白灰微绿质感） -->
                <div class="settings-nav-tabs" style="display:flex;gap:6px;margin-bottom:14px;background:#ebebeb;padding:3px;border-radius:10px;">
                    <button class="settings-tab-btn active" data-tab="ai" style="flex:1;padding:7px 4px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;background:#ffffff;color:#07c160;border:none;display:inline-flex;align-items:center;justify-content:center;gap:4px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
                        <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24"><path d="M21 11.5v-1c0-.8-.7-1.5-1.5-1.5H18V7c0-2.2-1.8-4-4-4h-4c-2.2 0-4 1.8-4 4v2H4.5C3.7 9 3 9.7 3 10.5v1c0 .8.7 1.5 1.5 1.5H6v4c0 2.2 1.8 4 4 4h4c2.2 0 4-1.8 4-4v-4h1.5c.8 0 1.5-.7 1.5-1.5zM8 7c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2H8V7zm8 9c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2v-5h8v5zm-5.5-2.5c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1zm5 0c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1z"/></svg>
                        <span>AI 模型</span>
                    </button>
                    <button class="settings-tab-btn" data-tab="search" style="flex:1;padding:7px 4px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:#666;border:none;display:inline-flex;align-items:center;justify-content:center;gap:4px;">
                        <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                        <span>联网检索</span>
                    </button>
                    <button class="settings-tab-btn" data-tab="debug" style="flex:1;padding:7px 4px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:#666;border:none;display:inline-flex;align-items:center;justify-content:center;gap:4px;">
                        <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>
                        <span>向导与日志</span>
                    </button>
                    <button class="settings-tab-btn" data-tab="system" style="flex:1;padding:7px 4px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:#666;border:none;display:inline-flex;align-items:center;justify-content:center;gap:4px;">
                        <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                        <span>记忆与维护</span>
                    </button>
                </div>

                <!-- 分区 1：AI 模型配置面板 -->
                <div id="settingsTabContent_ai" class="settings-tab-content">
                    
                    <div style="background:#ffffff;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.04);border:1px solid #eeeeee;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-size:13.5px;font-weight:600;color:#181818;">接口参数</span>
                            <span style="font-size:11px;color:#07c160;background:#f0f9eb;padding:2px 8px;border-radius:10px;">方案: <b>${escapeHtml(activeProfileName)}</b></span>
                        </div>
                        <div style="font-size:11px;color:#888;margin-bottom:12px;">
                            标准 OpenAI 兼容协议（支持 DeepSeek、GPT-4o、Claude、Gemini、通义等）。
                        </div>

                        <div style="display:flex;flex-direction:column;gap:10px;">
                            <div>
                                <label style="font-size:11.5px;font-weight:600;color:#555;display:block;margin-bottom:4px;">接口地址 (Base URL)</label>
                                <input type="text" id="aiBaseUrlInput" value="${escapeHtml(aiCfg.baseUrl || '')}" placeholder="https://api.openai.com/v1" style="width:100%;padding:8px 10px;border:1px solid #e0e0e0;border-radius:8px;font-size:12px;background:#fcfcfc;outline:none;box-sizing:border-box;">
                            </div>

                            <div>
                                <label style="font-size:11.5px;font-weight:600;color:#555;display:block;margin-bottom:4px;">API 密钥 (API Key)</label>
                                <input type="password" id="aiApiKeyInput" value="${escapeHtml(aiCfg.apiKey || '')}" placeholder="sk-..." style="width:100%;padding:8px 10px;border:1px solid #e0e0e0;border-radius:8px;font-size:12px;background:#fcfcfc;outline:none;box-sizing:border-box;">
                            </div>

                            <div>
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                    <span style="font-size:11.5px;font-weight:600;color:#555;">游戏主剧情模型</span>
                                    <button id="fetchModelsBtn" style="border:none;background:none;color:#07c160;font-size:11px;cursor:pointer;padding:0;font-weight:600;">从接口拉取模型列表 ↻</button>
                                </div>
                                <div id="triggerMainModelPickerBtn" style="width:100%;padding:9px 12px;border:1px solid #e0e0e0;border-radius:8px;background:#fcfcfc;cursor:pointer;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;">
                                    <span id="mainModelPickerDisplay" style="font-size:12.5px;font-weight:600;color:#222;">${escapeHtml(aiCfg.model || 'gpt-4o-mini')}</span>
                                    <svg style="width:12px;height:12px;fill:#888;" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                                </div>
                            </div>

                            <div style="border-top:1px solid #f0f0f0;padding-top:10px;margin-top:2px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                    <label style="font-size:11.5px;font-weight:600;color:#555;">智能向导独立方案</label>
                                    <span style="font-size:11px;color:#888;">独立分配专属 API</span>
                                </div>
                                <div id="triggerAgentModelPickerBtn" style="width:100%;padding:8px 12px;border:1px solid #e0e0e0;border-radius:8px;background:#fcfcfc;cursor:pointer;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;">
                                    <div style="display:flex;flex-direction:column;">
                                        <span id="agentPickerDisplayTitle" style="font-size:12px;font-weight:600;color:#222;">${escapeHtml(agentDisplayLabel)}</span>
                                        <span id="agentPickerDisplayDesc" style="font-size:10.5px;color:#888;">${escapeHtml(agentDisplaySub)}</span>
                                    </div>
                                    <svg style="width:12px;height:12px;fill:#888;" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                                </div>
                            </div>

                            <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:8px;margin-top:6px;">
                                <button id="updateCurrentProfileBtn" style="padding:8px;font-size:12px;font-weight:600;background:#07c160;color:#fff;border:none;border-radius:8px;cursor:pointer;">更新该方案</button>
                                <button id="saveAsNewProfileBtn" style="padding:8px;font-size:12px;background:#ffffff;color:#333;border:1px solid #e0e0e0;border-radius:8px;cursor:pointer;">另存为新方案</button>
                                <button id="testAiConnectBtn" style="padding:8px;font-size:12px;background:#ffffff;color:#333;border:1px solid #e0e0e0;border-radius:8px;cursor:pointer;">连通性测试</button>
                                <button id="backupConfigModalBtn" style="padding:8px;font-size:12px;background:#ffffff;color:#333;border:1px solid #e0e0e0;border-radius:8px;cursor:pointer;">配置文本备份</button>
                            </div>
                        </div>
                    </div>

                    <!-- 🌟 全新入口：真实语音与 TTS 引擎配置卡片 -->
                    <div style="background:#ffffff;border-radius:12px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,0.04);border:1px solid #eeeeee;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div style="width:36px;height:36px;border-radius:8px;background:#f0f9eb;display:flex;align-items:center;justify-content:center;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#07c160" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                </svg>
                            </div>
                            <div>
                                <div style="font-size:13px;font-weight:600;color:#222;">语音与 TTS 引擎设置</div>
                                <div style="font-size:11px;color:#888;">支持平台Key、本地部署与系统离线发声</div>
                            </div>
                        </div>
                        <button id="openTtsSettingsModalBtn" style="padding:6px 14px;font-size:12px;font-weight:500;border:1px solid #07c160;background:#ffffff;color:#07c160;border-radius:6px;cursor:pointer;">配置语音</button>
                    </div>

                    <div style="background:#ffffff;border-radius:12px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,0.04);border:1px solid #eeeeee;">
                        <div id="profileArchiveHeader" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
                            <span style="font-size:12.5px;font-weight:600;color:#333;">已存配置方案 (${profiles.length + 1})</span>
                            <span id="profileArchiveArrow" style="font-size:11.5px;color:#888;">
                                ${isProfileArchiveCollapsed ? '展开 ↓' : '收起 ↑'}
                            </span>
                        </div>

                        <div id="profileArchiveBody" style="display:${isProfileArchiveCollapsed ? 'none' : 'block'};margin-top:10px;border-top:1px solid #f0f0f0;padding-top:10px;">
                            <div style="font-size:11px;color:#888;margin-bottom:8px;">
                                点击切换配置，点击 ✕ 彻底删除对应方案。
                            </div>
                            <div class="profile-chip-list" id="aiProfileChipContainer" style="display:flex;flex-wrap:wrap;gap:6px;">
                                <div class="profile-chip ${activeProfileName === '默认配置' ? 'active' : ''}" onclick="window.switchAIProfile('默认配置')" style="padding:5px 12px;border-radius:14px;font-size:11.5px;cursor:pointer;background:${activeProfileName === '默认配置' ? '#07c160' : '#f2f2f2'};color:${activeProfileName === '默认配置' ? '#fff' : '#333'};">
                                    <span>默认配置</span>
                                </div>
                                ${profiles.map(p => {
                                    const isActive = (p.name === activeProfileName);
                                    return `
                                        <div class="profile-chip ${isActive ? 'active' : ''}" onclick="window.switchAIProfile('${escapeHtml(p.name)}')" style="padding:5px 12px;border-radius:14px;font-size:11.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:${isActive ? '#07c160' : '#f2f2f2'};color:${isActive ? '#fff' : '#333'};">
                                            <span>${escapeHtml(p.name)}</span>
                                            <span style="font-size:11px;opacity:0.7;" onclick="event.stopPropagation(); window.deleteAIProfile('${escapeHtml(p.name)}')">✕</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>

                </div>

                <!-- 分区 2：联网搜索中枢（渠道选择与全局凭据维护） -->
                <div id="settingsTabContent_search" class="settings-tab-content" style="display:none;">
                    <div style="background:#ffffff;border-radius:12px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.04);border:1px solid #eeeeee;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                            <span style="font-size:13.5px;font-weight:600;color:#181818;">联网检索源配置</span>
                            <span style="font-size:11px;color:#07c160;background:#f0f9eb;padding:2px 8px;border-radius:10px;">独立开关由对话抽屉控制</span>
                        </div>
                        <div style="font-size:11px;color:#888;margin-bottom:14px;line-height:1.5;">
                            预设全局搜索渠道与凭证。可在各角色对话的加号面板中随时按需开启或关闭联网。
                        </div>

                        <div id="searchConfigBody">
                            <div style="background:#f9f9f9;border-radius:8px;padding:10px;margin-bottom:12px;border:1px solid #eee;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                    <span style="font-size:12px;font-weight:600;color:#333;">检索引用条数</span>
                                    <span id="searchResultCountVal" style="color:#07c160;font-weight:600;font-size:12px;">${searchCfg.maxResults || 3} 条</span>
                                </div>
                                <input type="range" id="searchResultCountSlider" min="1" max="10" value="${searchCfg.maxResults || 3}" style="width:100%;accent-color:#07c160;">
                            </div>

                            <label style="font-size:12px;font-weight:600;color:#333;display:block;margin-bottom:6px;">默认搜索渠道</label>
                            
                            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
                                <label style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid ${searchCfg.provider === 'bing_local' ? '#07c160' : '#e5e5e5'};border-radius:8px;background:${searchCfg.provider === 'bing_local' ? '#f0f9eb' : '#fff'};cursor:pointer;">
                                    <input type="radio" name="searchProviderRadio" value="bing_local" ${searchCfg.provider === 'bing_local' ? 'checked' : ''} style="margin-top:2px;accent-color:#07c160;">
                                    <div style="font-size:11.5px;">
                                        <div style="font-weight:600;color:#222;">Bing (免 Key 极速通道)</div>
                                        <div style="color:#888;font-size:10.5px;">零门槛开箱即用，内置多节点容灾穿透，无需填 Key。</div>
                                    </div>
                                </label>

                                <label style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid ${searchCfg.provider === 'bocha' ? '#07c160' : '#e5e5e5'};border-radius:8px;background:${searchCfg.provider === 'bocha' ? '#f0f9eb' : '#fff'};cursor:pointer;">
                                    <input type="radio" name="searchProviderRadio" value="bocha" ${searchCfg.provider === 'bocha' ? 'checked' : ''} style="margin-top:2px;accent-color:#07c160;">
                                    <div style="font-size:11.5px;flex:1;">
                                        <div style="font-weight:600;color:#222;">博查搜索 (Bocha AI)</div>
                                        <input type="password" id="bochaKeyInput" value="${escapeHtml(searchCfg.keys?.bocha || '')}" placeholder="填入博查 API Key" style="width:100%;margin-top:4px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px;font-size:11px;outline:none;box-sizing:border-box;">
                                    </div>
                                </label>

                                <label style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid ${searchCfg.provider === 'metaso' ? '#07c160' : '#e5e5e5'};border-radius:8px;background:${searchCfg.provider === 'metaso' ? '#f0f9eb' : '#fff'};cursor:pointer;">
                                    <input type="radio" name="searchProviderRadio" value="metaso" ${searchCfg.provider === 'metaso' ? 'checked' : ''} style="margin-top:2px;accent-color:#07c160;">
                                    <div style="font-size:11.5px;flex:1;">
                                        <div style="font-weight:600;color:#222;">秘塔 AI 搜索 (Metaso)</div>
                                        <input type="password" id="metasoKeyInput" value="${escapeHtml(searchCfg.keys?.metaso || '')}" placeholder="填入秘塔 API Key" style="width:100%;margin-top:4px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px;font-size:11px;outline:none;box-sizing:border-box;">
                                    </div>
                                </label>

                                <label style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border:1px solid ${searchCfg.provider === 'tavily' ? '#07c160' : '#e5e5e5'};border-radius:8px;background:${searchCfg.provider === 'tavily' ? '#f0f9eb' : '#fff'};cursor:pointer;">
                                    <input type="radio" name="searchProviderRadio" value="tavily" ${searchCfg.provider === 'tavily' ? 'checked' : ''} style="margin-top:2px;accent-color:#07c160;">
                                    <div style="font-size:11.5px;flex:1;">
                                        <div style="font-weight:600;color:#222;">Tavily 搜索 (国际通用)</div>
                                        <input type="password" id="tavilyKeyInput" value="${escapeHtml(searchCfg.keys?.tavily || '')}" placeholder="填入 Tavily API Key" style="width:100%;margin-top:4px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px;font-size:11px;outline:none;box-sizing:border-box;">
                                    </div>
                                </label>
                            </div>

                            <button id="saveSearchConfigBtn" style="width:100%;padding:9px;font-size:12px;font-weight:600;background:#07c160;color:#fff;border:none;border-radius:8px;cursor:pointer;">保存联网设置</button>

                            <div style="margin-top:14px;border-top:1px solid #f0f0f0;padding-top:12px;">
                                <div style="font-size:12px;font-weight:600;color:#333;margin-bottom:6px;">搜索功能实时测试</div>
                                <div style="display:flex;gap:6px;">
                                    <input type="text" id="webSearchTestQueryInput" value="" placeholder="输入你要测试的搜索词..." style="flex:1;padding:7px 8px;border:1px solid #e0e0e0;border-radius:6px;font-size:11px;outline:none;background:#fff;box-sizing:border-box;">
                                    <button id="executeWebSearchTestBtn" style="padding:0 14px;font-size:11px;background:#f5f5f5;border:1px solid #e0e0e0;border-radius:6px;cursor:pointer;color:#333;">测试</button>
                                </div>
                                <div id="webSearchTestResultBox" style="margin-top:8px;display:none;background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:8px;font-size:11.5px;line-height:1.5;max-height:160px;overflow-y:auto;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 分区 3：悬浮向导与报错球定制 -->
                <div id="settingsTabContent_debug" class="settings-tab-content" style="display:none;">
                    <div style="background:#ffffff;border-radius:12px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.04);border:1px solid #eeeeee;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-size:13.5px;font-weight:600;color:#181818;">向导与异常排查气泡</span>
                            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" id="orbMasterToggle" ${orbCfg.enabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:#07c160;">
                                <span style="font-size:12px;font-weight:600;color:${orbCfg.enabled ? '#07c160' : '#888'};" id="orbToggleText">${orbCfg.enabled ? '已开启' : '已关闭'}</span>
                            </label>
                        </div>
                        <div style="font-size:11px;color:#888;margin-bottom:12px;">
                            常驻屏幕边缘的气泡助手，点击可随时向丸子提问或查验报错日志。
                        </div>

                        <div id="orbConfigDetailBox" style="${orbCfg.enabled ? '' : 'opacity:0.45;pointer-events:none;'}">
                            <div style="margin-bottom:14px;border-top:1px solid #f0f0f0;padding-top:12px;">
                                <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:6px;">
                                    <span style="color:#333;">悬浮球尺寸</span>
                                    <span id="orbSizeValText" style="color:#07c160;font-family:monospace;">${orbCfg.size}px</span>
                                </div>
                                <input type="range" id="orbSizeSlider" min="32" max="76" value="${orbCfg.size}" style="width:100%;accent-color:#07c160;">
                            </div>

                            <div style="margin-bottom:14px;">
                                <div style="font-size:12px;font-weight:600;color:#333;margin-bottom:8px;">形状外观</div>
                                <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;">
                                    <button class="orb-shape-btn ${orbCfg.shape === 'circle' ? 'active' : ''}" data-shape="circle" style="padding:6px 2px;font-size:11px;border-radius:6px;border:1px solid ${orbCfg.shape === 'circle' ? '#07c160' : '#e0e0e0'};background:${orbCfg.shape === 'circle' ? '#f0f9eb' : '#fff'};color:${orbCfg.shape === 'circle' ? '#07c160' : '#333'};cursor:pointer;">圆形</button>
                                    <button class="orb-shape-btn ${orbCfg.shape === 'squircle' ? 'active' : ''}" data-shape="squircle" style="padding:6px 2px;font-size:11px;border-radius:6px;border:1px solid ${orbCfg.shape === 'squircle' ? '#07c160' : '#e0e0e0'};background:${orbCfg.shape === 'squircle' ? '#f0f9eb' : '#fff'};color:${orbCfg.shape === 'squircle' ? '#07c160' : '#333'};cursor:pointer;">方圆</button>
                                    <button class="orb-shape-btn ${orbCfg.shape === 'heart' ? 'active' : ''}" data-shape="heart" style="padding:6px 2px;font-size:11px;border-radius:6px;border:1px solid ${orbCfg.shape === 'heart' ? '#07c160' : '#e0e0e0'};background:${orbCfg.shape === 'heart' ? '#f0f9eb' : '#fff'};color:${orbCfg.shape === 'heart' ? '#07c160' : '#333'};cursor:pointer;">心形</button>
                                    <button class="orb-shape-btn ${orbCfg.shape === 'custom_img' ? 'active' : ''}" data-shape="custom_img" style="padding:6px 2px;font-size:11px;border-radius:6px;border:1px solid ${orbCfg.shape === 'custom_img' ? '#07c160' : '#e0e0e0'};background:${orbCfg.shape === 'custom_img' ? '#f0f9eb' : '#fff'};color:${orbCfg.shape === 'custom_img' ? '#07c160' : '#333'};cursor:pointer;">相册皮肤</button>
                                </div>
                            </div>

                            <div style="border-top:1px solid #f0f0f0;padding-top:12px;display:flex;flex-direction:column;gap:8px;">
                                <button id="openLassoDrawingBtn" style="width:100%;padding:8px;font-size:11.5px;border-radius:8px;border:1px solid #e0e0e0;background:#fff;color:#333;cursor:pointer;">
                                    手绘套索定制形状
                                </button>
                                <button id="importCustomOrbImgBtn" style="width:100%;padding:8px;font-size:11.5px;border-radius:8px;border:1px solid #e0e0e0;background:#fff;color:#333;cursor:pointer;">
                                    从相册导入悬浮球皮肤 (PNG/GIF)
                                </button>
                                <input type="file" id="orbImgFileInput" accept="image/png,image/gif,image/webp,image/jpeg" style="display:none;">
                            </div>
                        </div>

                        <div style="margin-top:14px;border-top:1px solid #f0f0f0;padding-top:12px;">
                            <button id="openLogViewDirectBtn" style="width:100%;padding:9px;font-size:12.5px;font-weight:600;background:#f5f5f5;border:1px solid #e0e0e0;border-radius:8px;color:#333;cursor:pointer;">
                                打开向导与报错排查视窗
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 分区 4：小手机全量记忆卡与系统维护 -->
                <div id="settingsTabContent_system" class="settings-tab-content" style="display:none;">
                    
                    <div style="background:#ffffff;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.04);border:1px solid #eeeeee;">
                        <div style="font-size:13.5px;font-weight:600;color:#181818;margin-bottom:4px;">小手机全量记忆卡</div>
                        <div style="font-size:11px;color:#888;margin-bottom:12px;">
                            将小手机的所有人设、通讯录、聊天、朋友圈与小号进度整合成一张标准图片卡片，安全持久化。
                        </div>

                        <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:8px;margin-bottom:14px;">
                            <button id="triggerExportMemoryCardBtn" style="padding:10px 8px;font-size:12.5px;font-weight:600;background:#07c160;color:#fff;border:none;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                                <svg style="width:15px;height:15px;fill:currentColor;" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                                <span>导出记忆卡</span>
                            </button>
                            <button id="triggerImportMemoryCardBtn" style="padding:10px 8px;font-size:12.5px;font-weight:600;background:#ffffff;color:#333;border:1px solid #d0d0d0;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                                <svg style="width:15px;height:15px;fill:currentColor;" viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>
                                <span>导入记忆卡</span>
                            </button>
                        </div>

                        <div style="background:#f9f9f9;border-radius:8px;padding:10px 12px;border:1px solid #eee;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                <span style="font-size:12px;font-weight:600;color:#333;">定期备份提醒周期</span>
                                <span id="backupReminderValueText" style="font-size:11.5px;color:#07c160;font-weight:600;">
                                    ${reminderCfg.intervalDays > 0 ? `每 ${reminderCfg.intervalDays} 天提醒一次` : '已关闭提醒'}
                                </span>
                            </div>
                            <div style="font-size:10.5px;color:#888;margin-bottom:8px;">
                                游戏天数推进超出设定周期且未备份时，将温和提示下载记忆卡。
                            </div>
                            <div style="display:flex;gap:6px;">
                                <button class="backup-remind-pill ${reminderCfg.intervalDays === 0 ? 'active' : ''}" data-days="0" style="flex:1;padding:5px 0;font-size:11px;border-radius:6px;border:1px solid ${reminderCfg.intervalDays === 0 ? '#07c160' : '#e0e0e0'};background:${reminderCfg.intervalDays === 0 ? '#f0f9eb' : '#fff'};color:${reminderCfg.intervalDays === 0 ? '#07c160' : '#555'};cursor:pointer;">从不</button>
                                <button class="backup-remind-pill ${reminderCfg.intervalDays === 3 ? 'active' : ''}" data-days="3" style="flex:1;padding:5px 0;font-size:11px;border-radius:6px;border:1px solid ${reminderCfg.intervalDays === 3 ? '#07c160' : '#e0e0e0'};background:${reminderCfg.intervalDays === 3 ? '#f0f9eb' : '#fff'};color:${reminderCfg.intervalDays === 3 ? '#07c160' : '#555'};cursor:pointer;">每3天</button>
                                <button class="backup-remind-pill ${reminderCfg.intervalDays === 7 ? 'active' : ''}" data-days="7" style="flex:1;padding:5px 0;font-size:11px;border-radius:6px;border:1px solid ${reminderCfg.intervalDays === 7 ? '#07c160' : '#e0e0e0'};background:${reminderCfg.intervalDays === 7 ? '#f0f9eb' : '#fff'};color:${reminderCfg.intervalDays === 7 ? '#07c160' : '#555'};cursor:pointer;">每7天</button>
                                <button class="backup-remind-pill ${reminderCfg.intervalDays === 14 ? 'active' : ''}" data-days="14" style="flex:1;padding:5px 0;font-size:11px;border-radius:6px;border:1px solid ${reminderCfg.intervalDays === 14 ? '#07c160' : '#e0e0e0'};background:${reminderCfg.intervalDays === 14 ? '#f0f9eb' : '#fff'};color:${reminderCfg.intervalDays === 14 ? '#07c160' : '#555'};cursor:pointer;">每14天</button>
                            </div>
                        </div>
                    </div>

                    <div style="background:#ffffff;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.04);border:1px solid #eeeeee;">
                        <div style="font-size:13.5px;font-weight:600;color:#181818;margin-bottom:4px;">缓存与内存维护</div>
                        <div style="font-size:11px;color:#888;margin-bottom:10px;">
                            释放临时 Canvas 绘图内存碎片与报错调试状态，恢复顺滑交互。
                        </div>
                        <button id="cleanAppCacheBtn" style="width:100%;padding:9px;font-size:12px;border-radius:8px;border:1px solid #e0e0e0;background:#fff;color:#333;font-weight:600;cursor:pointer;">
                            深度清理临时内存缓存
                        </button>
                    </div>

                    <div style="background:#ffffff;border-radius:12px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.04);border:1px solid #eeeeee;">
                        <div style="font-size:13.5px;font-weight:600;color:#181818;margin-bottom:8px;">系统版本规范</div>
                        <div style="font-size:11.5px;color:#666;line-height:1.7;">
                            <div>当前应用版本：<b style="color:#222;">v${appVer}</b></div>
                            <div>界面规范：<b>微信原生微灰设计风格</b></div>
                            <div>数据协议：<b>Tavern 兼容标准 PNG 隐写</b></div>
                        </div>
                    </div>
                </div>

            </div>
        `;

        bindSettingsAppEvents();
    }

    function bindSettingsAppEvents() {
        document.querySelectorAll('.settings-tab-btn').forEach(btn => {
            btn.onclick = () => {
                const target = btn.dataset.tab;
                document.querySelectorAll('.settings-tab-btn').forEach(b => {
                    b.style.background = 'transparent';
                    b.style.color = '#666';
                    b.style.boxShadow = 'none';
                    b.classList.remove('active');
                });
                btn.style.background = '#ffffff';
                btn.style.color = '#07c160';
                btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                btn.classList.add('active');

                document.querySelectorAll('.settings-tab-content').forEach(c => c.style.display = 'none');
                const showBox = document.getElementById(`settingsTabContent_${target}`);
                if (showBox) showBox.style.display = 'block';
            };
        });

        const archiveHeader = document.getElementById('profileArchiveHeader');
        const archiveBody = document.getElementById('profileArchiveBody');
        const archiveArrow = document.getElementById('profileArchiveArrow');
        if (archiveHeader && archiveBody && archiveArrow) {
            archiveHeader.onclick = () => {
                isProfileArchiveCollapsed = !isProfileArchiveCollapsed;
                archiveBody.style.display = isProfileArchiveCollapsed ? 'none' : 'block';
                archiveArrow.textContent = isProfileArchiveCollapsed ? '展开 ↓' : '收起 ↑';
            };
        }

        const baseUrlInput = document.getElementById('aiBaseUrlInput');
        const apiKeyInput = document.getElementById('aiApiKeyInput');

        let fullModelList = getSafeAIConfig().modelsList || [...DEFAULT_MODEL_PRESETS];
        let currentAgentProfileChoice = getSafeAIConfig().agentProfileName || 'follow_global';
        let currentSelectedModel = getSafeAIConfig().model || 'gpt-4o-mini';

        const triggerMainModelBtn = document.getElementById('triggerMainModelPickerBtn');
        if (triggerMainModelBtn) {
            triggerMainModelBtn.onclick = () => {
                openModelPickerModal(currentSelectedModel, fullModelList, (selectedModel) => {
                    currentSelectedModel = selectedModel;
                    const displayEl = document.getElementById('mainModelPickerDisplay');
                    if (displayEl) displayEl.textContent = selectedModel;
                    if (typeof showToast === 'function') showToast(`已选用模型: ${selectedModel}`, 'info', 1000);
                });
            };
        }

        const triggerPickerBtn = document.getElementById('triggerAgentModelPickerBtn');
        if (triggerPickerBtn) {
            triggerPickerBtn.onclick = () => {
                openAgentModelPickerModal(currentAgentProfileChoice, (selectedName) => {
                    currentAgentProfileChoice = selectedName;
                    const profiles = getAIProfiles();
                    const titleEl = document.getElementById('agentPickerDisplayTitle');
                    const descEl = document.getElementById('agentPickerDisplayDesc');

                    if (selectedName === 'follow_global') {
                        if (titleEl) titleEl.textContent = '跟随全局主模型';
                        if (descEl) descEl.textContent = `当前主模型: ${currentSelectedModel || '未设定'}`;
                    } else {
                        const targetP = profiles.find(p => p.name === selectedName);
                        if (titleEl) titleEl.textContent = selectedName;
                        if (descEl) descEl.textContent = `使用方案模型: ${targetP?.config?.model || '未设定'}`;
                    }
                    if (typeof showToast === 'function') showToast('已选定向导方案，点击“更新该方案”生效');
                });
            };
        }

        const gatherCurrentAiData = () => {
            return {
                baseUrl: (baseUrlInput?.value || '').trim(),
                apiKey: (apiKeyInput?.value || '').trim(),
                model: currentSelectedModel || 'gpt-4o-mini',
                agentProfileName: currentAgentProfileChoice,
                modelsList: [...fullModelList]
            };
        };

        const updateSaveBtn = document.getElementById('updateCurrentProfileBtn');
        if (updateSaveBtn) {
            updateSaveBtn.onclick = () => {
                const activeName = localStorage.getItem('mcyt_active_ai_profile_name') || '默认配置';
                const curData = gatherCurrentAiData();

                try {
                    if (window.G) {
                        if (!window.G.ai) window.G.ai = {};
                        Object.assign(window.G.ai, curData);
                    }
                    localStorage.setItem('mc_yt_ai_config', JSON.stringify(curData));
                    if (typeof persistAIConfig === 'function') persistAIConfig();

                    if (activeName !== '默认配置') {
                        const list = getAIProfiles();
                        const idx = list.findIndex(p => p.name === activeName);
                        if (idx >= 0) {
                            list[idx].config = curData;
                            list[idx].updatedAt = Date.now();
                            saveAIProfiles(list);
                        }
                    }

                    renderSettingsApp();
                    if (typeof showToast === 'function') showToast(`已更新方案 [${activeName}]`, 'success');
                } catch (e) {
                    if (typeof showToast === 'function') showToast('保存失败: ' + e.message, 'error');
                }
            };
        }

        const saveAsBtn = document.getElementById('saveAsNewProfileBtn');
        if (saveAsBtn) {
            saveAsBtn.onclick = () => {
                openWechatInputModal('另存为新方案', '', '输入方案名称...', (name) => {
                    if (!name) {
                        if (typeof showToast === 'function') showToast('方案名称不能为空', 'error');
                        return;
                    }
                    const curData = gatherCurrentAiData();
                    const list = getAIProfiles();
                    const targetName = name.trim();

                    const existingIdx = list.findIndex(p => p.name === targetName);
                    const profileObj = {
                        name: targetName,
                        config: curData,
                        updatedAt: Date.now()
                    };

                    if (existingIdx >= 0) list[existingIdx] = profileObj;
                    else list.push(profileObj);

                    saveAIProfiles(list);
                    localStorage.setItem('mcyt_active_ai_profile_name', targetName);
                    renderSettingsApp();
                    if (typeof showToast === 'function') showToast(`新方案 [${targetName}] 已保存！`, 'success');
                });
            };
        }

        const testAiBtn = document.getElementById('testAiConnectBtn');
        if (testAiBtn) {
            testAiBtn.onclick = async () => {
                const data = gatherCurrentAiData();
                if (!data.apiKey) {
                    if (typeof showToast === 'function') showToast('请先输入 API 密钥', 'error');
                    return;
                }
                testAiBtn.disabled = true;
                testAiBtn.textContent = '测试中...';

                try {
                    const endpoint = (data.baseUrl.replace(/\/+$/, '')) + '/chat/completions';
                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${data.apiKey}`
                        },
                        body: JSON.stringify({
                            model: data.model,
                            messages: [{ role: 'user', content: 'hi' }],
                            max_tokens: 5
                        })
                    });

                    if (res.ok) {
                        if (typeof showToast === 'function') showToast('连接成功！接口正常可用', 'success');
                    } else {
                        const errTxt = await res.text();
                        if (typeof showToast === 'function') showToast(`连接异常(${res.status}): ${errTxt.slice(0, 45)}`, 'error');
                    }
                } catch (err) {
                    if (typeof showToast === 'function') showToast('网络连接失败: ' + err.message, 'error');
                } finally {
                    testAiBtn.disabled = false;
                    testAiBtn.textContent = '连通性测试';
                }
            };
        }

        const fetchModelsBtn = document.getElementById('fetchModelsBtn');
        if (fetchModelsBtn) {
            fetchModelsBtn.onclick = async () => {
                const data = gatherCurrentAiData();
                if (!data.apiKey) {
                    if (typeof showToast === 'function') showToast('请先输入 API 密钥', 'error');
                    return;
                }

                fetchModelsBtn.textContent = '拉取中...';

                try {
                    const endpoint = (data.baseUrl.replace(/\/+$/, '')) + '/models';
                    const res = await fetch(endpoint, {
                        headers: { 'Authorization': `Bearer ${data.apiKey}` }
                    });

                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    const json = await res.json();
                    let list = [];
                    if (Array.isArray(json.data)) {
                        list = json.data.map(item => item.id).filter(Boolean);
                    } else if (Array.isArray(json)) {
                        list = json.map(item => item.id || item).filter(Boolean);
                    }

                    if (list.length > 0) {
                        list.sort();
                        fullModelList = Array.from(new Set([...list, ...DEFAULT_MODEL_PRESETS]));
                        if (typeof showToast === 'function') showToast(`成功发现 ${list.length} 个可用模型`, 'success');
                        openModelPickerModal(currentSelectedModel, fullModelList, (picked) => {
                            currentSelectedModel = picked;
                            const displayEl = document.getElementById('mainModelPickerDisplay');
                            if (displayEl) displayEl.textContent = picked;
                        });
                    } else {
                        if (typeof showToast === 'function') showToast('未解析到有效模型列表', 'info');
                    }
                } catch (err) {
                    if (typeof showToast === 'function') showToast('拉取模型失败: ' + err.message, 'error');
                } finally {
                    fetchModelsBtn.textContent = '从接口拉取模型列表 ↻';
                }
            };
        }

        const backupBtn = document.getElementById('backupConfigModalBtn');
        if (backupBtn) {
            backupBtn.onclick = () => openConfigBackupModal();
        }

        // 🌟 绑定打开 TTS 配置弹窗按钮
        const openTtsBtn = document.getElementById('openTtsSettingsModalBtn');
        if (openTtsBtn) {
            openTtsBtn.onclick = () => {
                if (window.ttsEngine && typeof window.ttsEngine.openSettingsModal === 'function') {
                    window.ttsEngine.openSettingsModal();
                } else {
                    if (typeof showToast === 'function') showToast('语音引擎尚未初始化完毕', 'error');
                }
            };
        }

        const saveSearchBtn = document.getElementById('saveSearchConfigBtn');
        const resultCountSlider = document.getElementById('searchResultCountSlider');
        const resultCountVal = document.getElementById('searchResultCountVal');

        if (resultCountSlider && resultCountVal) {
            resultCountSlider.oninput = () => {
                resultCountVal.textContent = resultCountSlider.value + ' 条';
            };
        }

        if (saveSearchBtn) {
            saveSearchBtn.onclick = () => {
                const selectedRadio = document.querySelector('input[name="searchProviderRadio"]:checked');
                const provider = selectedRadio ? selectedRadio.value : 'bing_local';
                const searchObj = {
                    enabled: true, // 全局保留为底层就绪，具体触发由聊天抽屉按角色独立控制
                    provider: provider,
                    maxResults: parseInt(resultCountSlider?.value) || 3,
                    keys: {
                        bocha: document.getElementById('bochaKeyInput')?.value.trim() || '',
                        metaso: document.getElementById('metasoKeyInput')?.value.trim() || '',
                        tavily: document.getElementById('tavilyKeyInput')?.value.trim() || ''
                    }
                };

                try {
                    if (window.G) {
                        if (!window.G.search) window.G.search = {};
                        Object.assign(window.G.search, searchObj);
                    }
                    localStorage.setItem('mc_yt_search_config', JSON.stringify(searchObj));
                    if (typeof persistSearchConfig === 'function') persistSearchConfig();
                    if (typeof showToast === 'function') showToast('已保存联网检索设置', 'success');
                } catch (e) {
                    if (typeof showToast === 'function') showToast('保存失败: ' + e.message, 'error');
                }
            };
        }

        const testSearchBtn = document.getElementById('executeWebSearchTestBtn');
        const testSearchQuery = document.getElementById('webSearchTestQueryInput');
        const testSearchResultBox = document.getElementById('webSearchTestResultBox');

        if (testSearchBtn && testSearchQuery && testSearchResultBox) {
            testSearchBtn.onclick = async () => {
                const query = testSearchQuery.value.trim();
                if (!query) {
                    if (typeof showToast === 'function') showToast('请输入测试关键词', 'error');
                    return;
                }

                if (typeof window.webSearch !== 'function') {
                    if (typeof showToast === 'function') showToast('底层搜索组件未就绪', 'error');
                    return;
                }

                testSearchBtn.disabled = true;
                testSearchBtn.textContent = '检索中...';
                testSearchResultBox.style.display = 'block';
                testSearchResultBox.innerHTML = '<span style="color:#888;">正在探查实时 Minecraft 资讯...</span>';

                const targetCount = parseInt(resultCountSlider?.value) || 3;

                try {
                    const res = await window.webSearch(query, targetCount);
                    const list = res.results || [];
                    if (list.length === 0) {
                        testSearchResultBox.innerHTML = '<span style="color:#c62828;">未检索到相关内容。</span>';
                    } else {
                        testSearchResultBox.innerHTML = list.map((item, idx) => `
                            <div style="border-bottom:1px solid #eee;padding-bottom:4px;margin-bottom:4px;">
                                <div style="font-weight:600;color:#07c160;">${idx + 1}. ${escapeHtml(item.title)}</div>
                                <div style="color:#333;font-size:11px;">${escapeHtml((item.content || '').slice(0, 100))}...</div>
                            </div>
                        `).join('') + (res.answer ? `<div style="margin-top:4px;color:#222;font-weight:600;">智能概述：${escapeHtml(res.answer)}</div>` : '');
                    }
                } catch (err) {
                    testSearchResultBox.innerHTML = `<span style="color:#c62828;">搜索探查失败: ${escapeHtml(err.message)}</span>`;
                } finally {
                    testSearchBtn.disabled = false;
                    testSearchBtn.textContent = '测试';
                }
            };
        }

        const orbToggle = document.getElementById('orbMasterToggle');
        const orbToggleText = document.getElementById('orbToggleText');
        const detailBox = document.getElementById('orbConfigDetailBox');

        if (orbToggle && window.ErrorMonitor) {
            orbToggle.onchange = () => {
                const enabled = orbToggle.checked;
                window.ErrorMonitor.setEnabled(enabled);
                if (orbToggleText) {
                    orbToggleText.textContent = enabled ? '已开启' : '已关闭';
                    orbToggleText.style.color = enabled ? '#07c160' : '#888';
                }
                if (detailBox) {
                    detailBox.style.opacity = enabled ? '1' : '0.45';
                    detailBox.style.pointerEvents = enabled ? 'auto' : 'none';
                }
                if (typeof showToast === 'function') showToast(enabled ? '已启用向导气泡' : '已隐藏向导气泡', 'info');
            };
        }

        const sizeSlider = document.getElementById('orbSizeSlider');
        const sizeText = document.getElementById('orbSizeValText');
        if (sizeSlider && window.ErrorMonitor) {
            sizeSlider.oninput = () => {
                const val = sizeSlider.value;
                if (sizeText) sizeText.textContent = val + 'px';
                window.ErrorMonitor.setSize(val);
            };
        }

        document.querySelectorAll('.orb-shape-btn').forEach(btn => {
            btn.onclick = () => {
                const shape = btn.dataset.shape;
                if (window.ErrorMonitor) {
                    window.ErrorMonitor.setShape(shape);
                    document.querySelectorAll('.orb-shape-btn').forEach(b => {
                        b.style.border = '1px solid #e0e0e0';
                        b.style.background = '#fff';
                        b.style.color = '#333';
                    });
                    btn.style.border = '1px solid #07c160';
                    btn.style.background = '#f0f9eb';
                    btn.style.color = '#07c160';
                    if (typeof showToast === 'function') showToast('已应用气泡外观', 'success', 1000);
                }
            };
        });

        const lassoBtn = document.getElementById('openLassoDrawingBtn');
        if (lassoBtn && window.ErrorMonitor) {
            lassoBtn.onclick = () => {
                if (typeof window.ErrorMonitor.openLassoDrawer === 'function') {
                    window.ErrorMonitor.openLassoDrawer();
                }
            };
        }

        const importImgBtn = document.getElementById('importCustomOrbImgBtn');
        const fileInput = document.getElementById('orbImgFileInput');
        if (importImgBtn && fileInput && window.ErrorMonitor) {
            importImgBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                if (file.size > 2 * 1024 * 1024) {
                    if (typeof showToast === 'function') showToast('图片请小于 2MB', 'error');
                    return;
                }

                const reader = new FileReader();
                reader.onload = (ev) => {
                    const base64 = ev.target.result;
                    window.ErrorMonitor.setCustomImage(base64);
                    if (typeof showToast === 'function') showToast('专属皮肤装载完成', 'success');
                };
                reader.readAsDataURL(file);
            };
        }

        const logBtn = document.getElementById('openLogViewDirectBtn');
        if (logBtn && window.ErrorMonitor) {
            logBtn.onclick = () => window.ErrorMonitor.openLogModal();
        }

        const exportCardBtn = document.getElementById('triggerExportMemoryCardBtn');
        if (exportCardBtn) {
            exportCardBtn.onclick = () => openMemoryCardExportModal();
        }

        const importCardBtn = document.getElementById('triggerImportMemoryCardBtn');
        if (importCardBtn) {
            importCardBtn.onclick = () => openMemoryCardImportModal();
        }

        document.querySelectorAll('.backup-remind-pill').forEach(pill => {
            pill.onclick = () => {
                const days = parseInt(pill.dataset.days) || 0;
                const cfg = getBackupReminderConfig();
                cfg.intervalDays = days;
                saveBackupReminderConfig(cfg);

                document.querySelectorAll('.backup-remind-pill').forEach(p => {
                    p.style.border = '1px solid #e0e0e0';
                    p.style.background = '#fff';
                    p.style.color = '#555';
                });
                pill.style.border = '1px solid #07c160';
                pill.style.background = '#f0f9eb';
                pill.style.color = '#07c160';

                const textEl = document.getElementById('backupReminderValueText');
                if (textEl) {
                    textEl.textContent = (days > 0) ? `每 ${days} 天提醒一次` : '已关闭提醒';
                }
                if (typeof showToast === 'function') showToast((days > 0) ? `已设定为每 ${days} 天提醒备份` : '已关闭自动提醒', 'info');
            };
        });

        const cleanBtn = document.getElementById('cleanAppCacheBtn');
        if (cleanBtn) {
            cleanBtn.onclick = () => {
                if (window.ErrorMonitor) window.ErrorMonitor.clearErrors();
                if (typeof showToast === 'function') showToast('临时缓存碎片已清理', 'success');
            };
        }
    }

    window.switchAIProfile = function(name) {
        if (name === '默认配置') {
            localStorage.setItem('mcyt_active_ai_profile_name', '默认配置');
            renderSettingsApp();
            if (typeof showToast === 'function') showToast('已切换至默认配置');
            return;
        }

        const profiles = getAIProfiles();
        const target = profiles.find(p => p.name === name);
        if (!target || !target.config) return;

        localStorage.setItem('mcyt_active_ai_profile_name', target.name);
        try {
            if (window.G) {
                if (!window.G.ai) window.G.ai = {};
                Object.assign(window.G.ai, target.config);
            }
            localStorage.setItem('mc_yt_ai_config', JSON.stringify(target.config));
            if (typeof persistAIConfig === 'function') persistAIConfig();
        } catch (_) {}

        renderSettingsApp();
        if (typeof showToast === 'function') showToast(`已切换至方案: ${target.name}`, 'success');
    };

    window.deleteAIProfile = function(name) {
        openWechatConfirmModal('删除方案', `确定要删除配置方案 [${name}] 吗？`, () => {
            let list = getAIProfiles().filter(p => p.name !== name);
            saveAIProfiles(list);
            if (localStorage.getItem('mcyt_active_ai_profile_name') === name) {
                localStorage.setItem('mcyt_active_ai_profile_name', '默认配置');
            }
            renderSettingsApp();
            if (typeof showToast === 'function') showToast(`方案 [${name}] 已删除`);
        });
    };

    function openConfigBackupModal() {
        const modal = document.getElementById('modal');
        const modalBody = document.getElementById('modalBody');
        const retroModalTitle = document.getElementById('retroModalTitle');
        if (!modal || !modalBody) return;

        if (retroModalTitle) retroModalTitle.textContent = '配置文本备份与恢复';

        const payload = {
            ai: getSafeAIConfig(),
            search: getSafeSearchConfig(),
            profiles: getAIProfiles(),
            timestamp: Date.now()
        };
        const exportJsonStr = JSON.stringify(payload, null, 2);

        modalBody.innerHTML = `
            <div style="font-size:12.5px;line-height:1.5;color:#333;">
                <div style="font-weight:600;margin-bottom:6px;">导出配置文本（复制备用）：</div>
                <textarea id="configExportArea" readonly style="width:100%;height:85px;font-family:monospace;font-size:10px;padding:8px;border:1px solid #e0e0e0;border-radius:6px;background:#f9f9f9;outline:none;box-sizing:border-box;">${escapeHtml(exportJsonStr)}</textarea>
                
                <div style="margin-top:6px;display:flex;justify-content:flex-end;">
                    <button id="copyConfigExportBtn" style="padding:4px 12px;font-size:11px;border-radius:6px;border:1px solid #d0d0d0;background:#fff;color:#333;cursor:pointer;">复制文本</button>
                </div>

                <div style="font-weight:600;margin:10px 0 6px 0;">导入恢复配置：</div>
                <textarea id="configImportArea" placeholder="在此粘贴配置 JSON 文本..." style="width:100%;height:75px;font-family:monospace;font-size:10px;padding:8px;border:1px solid #e0e0e0;border-radius:6px;outline:none;box-sizing:border-box;"></textarea>
                
                <div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end;">
                    <button onclick="closeModal()" style="padding:6px 14px;border-radius:6px;border:1px solid #e0e0e0;background:#f5f5f5;color:#666;font-size:12px;cursor:pointer;">取消</button>
                    <button id="applyConfigImportBtn" style="padding:6px 18px;border-radius:6px;border:none;background:#07c160;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">确认导入</button>
                </div>
            </div>
        `;

        modal.classList.add('open');

        document.getElementById('copyConfigExportBtn').onclick = () => {
            const area = document.getElementById('configExportArea');
            if (area) {
                if (window.NativeBridge && window.NativeBridge.copyText) {
                    window.NativeBridge.copyText(area.value);
                } else if (navigator.clipboard) {
                    navigator.clipboard.writeText(area.value);
                }
                if (typeof showToast === 'function') showToast('已复制配置文本');
            }
        };

        document.getElementById('applyConfigImportBtn').onclick = () => {
            const txt = (document.getElementById('configImportArea')?.value || '').trim();
            if (!txt) {
                if (typeof showToast === 'function') showToast('请先粘贴配置文本', 'error');
                return;
            }

            try {
                const parsed = JSON.parse(txt);
                if (parsed.ai) {
                    localStorage.setItem('mc_yt_ai_config', JSON.stringify(parsed.ai));
                    if (window.G) {
                        if (!window.G.ai) window.G.ai = {};
                        Object.assign(window.G.ai, parsed.ai);
                    }
                }
                if (parsed.search) {
                    localStorage.setItem('mc_yt_search_config', JSON.stringify(parsed.search));
                    if (window.G) {
                        if (!window.G.search) window.G.search = {};
                        Object.assign(window.G.search, parsed.search);
                    }
                }
                if (Array.isArray(parsed.profiles)) {
                    saveAIProfiles(parsed.profiles);
                }
                if (typeof closeModal === 'function') closeModal();
                renderSettingsApp();
                if (typeof showToast === 'function') showToast('配置已成功恢复！', 'success');
            } catch (err) {
                if (typeof showToast === 'function') showToast('解析失败，请确保格式正确', 'error');
            }
        };
    }

    window.checkBackupReminderOnDayAdvance = function() {
        if (!window.G || window.G.phase !== 'playing') return;
        const cfg = getBackupReminderConfig();
        if (!cfg.intervalDays || cfg.intervalDays <= 0) return;

        const currentDay = window.G.day || 1;
        const lastDay = cfg.lastBackupDay || 1;

        if (currentDay - lastDay >= cfg.intervalDays) {
            setTimeout(() => {
                if (typeof showToast === 'function') {
                    showToast(`💡 距上次备份已过 ${currentDay - lastDay} 天，建议前往设置中心导出记忆卡！`, 'info', 4000);
                }
            }, 1000);
        }
    };

    const originOpenPhoneApp = window.openPhoneApp;
    window.openPhoneApp = function(appName) {
        if (appName === 'settings') {
            const modal = document.getElementById('appModal');
            if (modal) {
                modal.classList.remove('wechat-seamless-shell');
                renderSettingsApp();
                modal.classList.add('opened');
            }
            return;
        }
        if (typeof originOpenPhoneApp === 'function') {
            originOpenPhoneApp(appName);
        }
    };

    window.renderSettingsApp = renderSettingsApp;
    window.openMemoryCardExportModal = openMemoryCardExportModal;
    window.openMemoryCardImportModal = openMemoryCardImportModal;

})(window);
