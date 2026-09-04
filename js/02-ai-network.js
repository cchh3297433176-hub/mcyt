// AI 模型设置模块（统一的 OpenAI 兼容接口配置 / 拉取模型 / 多档案）
// ============================================================
function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// ============================================================
// 💭 酒馆式思维链解析与清洗工具
// ============================================================
function stripThought(text) {
    if (!text) return '';
    let processed = String(text);
    if (processed.includes('')) processed += '</think>';
    if (processed.includes('<thought>') && !processed.includes('</thought>')) processed += '</thought>';
    if (processed.includes('<reasoning>') && !processed.includes('</reasoning>')) processed += '</reasoning>';
    const thinkRegex = /<(think|thought|reasoning)>[\s\S]*?<\/\1>/gi;
    return processed.replace(thinkRegex, '').trim();
}

function renderContentWithThoughts(text) {
    if (!text) return '';
    let processed = String(text);
    if (processed.includes('')) processed += '</think>';
    if (processed.includes('<thought>') && !processed.includes('</thought>')) processed += '</thought>';
    if (processed.includes('<reasoning>') && !processed.includes('</reasoning>')) processed += '</reasoning>';

    const thinkRegex = /<(think|thought|reasoning)>([\s\S]*?)<\/\1>/gi;
    let lastIndex = 0;
    let htmlResult = '';
    let match;

    while ((match = thinkRegex.exec(processed)) !== null) {
        const beforeText = processed.slice(lastIndex, match.index);
        htmlResult += escapeHtml(beforeText).replace(/\n/g, '<br>');
        const thoughtText = escapeHtml(match[2].trim()).replace(/\n/g, '<br>');
        htmlResult += `
            <details class="thought-box" style="margin:8px 0;padding:6px 10px;background:rgba(0,0,0,0.03);border:1px dashed #bbb;border-radius:8px;font-size:12px;color:#666;">
                <summary style="cursor:pointer;user-select:none;font-weight:600;color:#777;outline:none;">💭 思考过程 (点击展开/折叠)</summary>
                <div class="thought-content" style="margin-top:6px;line-height:1.6;color:#555;padding:4px 0;border-top:1px dashed rgba(0,0,0,0.06);">${thoughtText}</div>
            </details>
        `;
        lastIndex = thinkRegex.lastIndex;
    }
    htmlResult += escapeHtml(processed.slice(lastIndex)).replace(/\n/g, '<br>');
    return htmlResult;
}

function isLikelyTruncated(text) {
    if (!text) return false;
    const pure = stripThought(text);
    const t = String(pure).trim();
    if (t.length < 10) return false;
    const last = t[t.length - 1];
    const properEnd = '。！？…」』"”）)~♪☆★.!?》】';
    if (properEnd.includes(last)) return false;
    const dangling = '，,、：:；;（(「『“—-～的了在和与就都也而但因所';
    if (dangling.includes(last)) return true;
    return t.length > 30;
}
function normalizeBaseUrl(url) {
    return (url || '').trim().replace(/\/+$/, '');
}
function chatCompletionsUrl(baseUrl) {
    const url = normalizeBaseUrl(baseUrl);
    if (/\/chat\/completions$/i.test(url)) return url;
    return url + '/chat/completions';
}
function modelsUrl(baseUrl) {
    const url = normalizeBaseUrl(baseUrl);
    if (/\/models$/i.test(url)) return url;
    if (/\/chat\/completions$/i.test(url)) return url.replace(/\/chat\/completions$/i, '/models');
    return url + '/models';
}
function persistAIConfig() {
    try { localStorage.setItem('mc_yt_ai_config', JSON.stringify(G.ai)); } catch (_) {}
}
function loadAIConfig() {
    try {
        const raw = localStorage.getItem('mc_yt_ai_config');
        if (raw) { const c = JSON.parse(raw); if (c && typeof c === 'object') Object.assign(G.ai, c); }
    } catch (_) {}
}
function persistSavedModels() {
    try { localStorage.setItem('mc_yt_saved_models', JSON.stringify(G.savedModels)); } catch (_) {}
}
function loadSavedModels() {
    try {
        const raw = localStorage.getItem('mc_yt_saved_models');
        if (raw) { const list = JSON.parse(raw); if (Array.isArray(list)) G.savedModels = list; }
    } catch (_) {}
}
function persistMemorySummarySettings() {
    try { localStorage.setItem('mc_yt_memory_summary_settings', JSON.stringify(G.memorySummarySettings)); } catch (_) {}
}
function loadMemorySummarySettings() {
    try {
        const raw = localStorage.getItem('mc_yt_memory_summary_settings');
        if (raw) { const c = JSON.parse(raw); if (c && typeof c === 'object') Object.assign(G.memorySummarySettings, c); }
    } catch (_) {}
}

// 支持智能折叠的 API 设置界面
function buildModelSettingsHTML(prefix) {
    const hasConfig = !!(G.ai.apiKey && G.ai.baseUrl);
    return `
        <div class="model-settings">
            ${hasConfig ? `
            <div id="${prefix}ConfigSummary" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#e8f5e9;border-radius:8px;margin-bottom:8px;">
                <span style="font-size:12px;color:#2e7d32;font-weight:700;">✅ 已配置模型：${escapeHtml(G.ai.model || '未命名')}</span>
                <button type="button" class="upload-btn" id="${prefix}ToggleDetailBtn" style="padding:4px 8px;font-size:11px;">⚙️ 展开修改</button>
            </div>
            ` : ''}
            <div id="${prefix}DetailArea" style="${hasConfig ? 'display:none;' : ''}">
                <div class="form-group" style="margin-bottom:8px;">
                    <label style="font-size:13px;">🌐 API Base URL <span class="required">*</span></label>
                    <input type="text" id="${prefix}BaseUrlInput" placeholder="如 https://api.openai.com/v1 或 https://api.deepseek.com/v1" value="${escapeHtml(G.ai.baseUrl)}">
                </div>
                <div class="form-group" style="margin-bottom:8px;">
                    <label style="font-size:13px;">🔑 API Key <span class="required">*</span></label>
                    <input type="password" id="${prefix}ApiKeyInput" placeholder="sk-..." value="${escapeHtml(G.ai.apiKey)}">
                </div>
                <div class="form-group" style="margin-bottom:6px;">
                    <label style="font-size:13px;">🤖 当前模型 <span class="required">*</span></label>
                    <div style="display:flex;gap:6px;">
                        <input type="text" id="${prefix}ModelInput" placeholder="例如 deepseek-chat" value="${escapeHtml(G.ai.model)}" style="flex:1;">
                        <button type="button" class="upload-btn" id="${prefix}PullBtn" style="white-space:nowrap;padding:0 12px;">🔄 拉取</button>
                        <button type="button" class="upload-btn" id="${prefix}TestBtn" style="white-space:nowrap;padding:0 12px;">🔌 测试</button>
                    </div>
                </div>
                <div id="${prefix}ModelListWrap" style="display:none;margin-bottom:10px;">
                    <input type="text" id="${prefix}ModelSearchInput" placeholder="🔍 按关键词搜索已拉取的模型...">
                    <div id="${prefix}ModelListBox" style="max-height:160px;overflow-y:auto;border:1px solid rgba(30,60,30,.10);border-radius:8px;margin-top:6px;background:var(--card2);"></div>
                </div>
            </div>
        </div>
    `;
}
function applyAIConfigFromUI(prefix) {
    const b = $(`${prefix}BaseUrlInput`);
    const k = $(`${prefix}ApiKeyInput`);
    const m = $(`${prefix}ModelInput`);
    if (b) G.ai.baseUrl = b.value.trim();
    if (k) G.ai.apiKey = k.value.trim();
    if (m) G.ai.model = m.value.trim();
    persistAIConfig();
}
function renderModelListBox(prefix, list, keyword) {
    const box = $(`${prefix}ModelListBox`);
    if (!box) return;
    const filtered = keyword ? list.filter(m => m.toLowerCase().includes(keyword.toLowerCase())) : list;
    if (!filtered.length) {
        box.innerHTML = `<div style="padding:10px;font-size:12px;color:#999;text-align:center;">无匹配的模型</div>`;
        return;
    }
    box.innerHTML = filtered.map(m => `<div class="model-list-item" data-model="${escapeHtml(m)}" style="padding:8px 10px;font-size:13px;cursor:pointer;border-bottom:1px solid rgba(30,60,30,.06);">${escapeHtml(m)}</div>`).join('');
    box.querySelectorAll('.model-list-item').forEach(item => {
        item.addEventListener('click', () => {
            $(`${prefix}ModelInput`).value = item.dataset.model;
            applyAIConfigFromUI(prefix);
            showToast('✅ 已选择模型：' + item.dataset.model, 'success', 1500);
        });
    });
}
async function pullModelList(prefix) {
    const baseUrl = ($(`${prefix}BaseUrlInput`).value || '').trim();
    const apiKey = ($(`${prefix}ApiKeyInput`).value || '').trim();
    if (!baseUrl || !apiKey) { showToast('⚠️ 请先填写 URL 和 Key'); return; }
    const btn = $(`${prefix}PullBtn`);
    btn.disabled = true; btn.textContent = '⏳...';
    try {
        const resp = await fetch(modelsUrl(baseUrl), {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        let list = [];
        if (Array.isArray(data.data)) list = data.data.map(m => m.id).filter(Boolean);
        else if (Array.isArray(data.models)) list = data.models.map(m => m.id || m.name).filter(Boolean);
        if (!list.length) throw new Error('未能解析模型列表');
        list = [...new Set(list)].sort();
        G._pulledModels[prefix] = list;
        $(`${prefix}ModelListWrap`).style.display = '';
        renderModelListBox(prefix, list, '');
        showToast(`✅ 成功拉取 ${list.length} 个可用模型`, 'success', 2000);
    } catch (e) {
        showToast('❌ 拉取模型失败：' + e.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '🔄 拉取';
    }
}
async function testAIConnection(prefix) {
    applyAIConfigFromUI(prefix);
    const btn = $(`${prefix}TestBtn`);
    btn.disabled = true; btn.textContent = '⏳...';
    try {
        await callAI([{ role: 'user', content: '回复OK' }], { maxTokens: 10, temperature: 0 });
        showToast('✅ 连接成功！', 'success', 2000);
    } catch (e) {
        showToast('❌ 连接失败：' + e.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = '🔌 测试';
    }
}
function bindModelSettingsUI(prefix) {
    ['BaseUrlInput', 'ApiKeyInput', 'ModelInput'].forEach(f => {
        const el = $(`${prefix}${f}`);
        if (el) el.addEventListener('change', () => applyAIConfigFromUI(prefix));
    });
    $(`${prefix}PullBtn`)?.addEventListener('click', () => pullModelList(prefix));
    $(`${prefix}TestBtn`)?.addEventListener('click', () => testAIConnection(prefix));
    $(`${prefix}ToggleDetailBtn`)?.addEventListener('click', () => {
        const area = $(`${prefix}DetailArea`);
        const isHidden = area.style.display === 'none';
        area.style.display = isHidden ? 'block' : 'none';
        $(`${prefix}ToggleDetailBtn`).textContent = isHidden ? '🔼 收起' : '⚙️ 展开修改';
    });
}
// ============================================================
// API 调用（酒馆式集成：自动提取 reasoning_content 并规整为 \n\n` + content;
    }
    return content;
}
// ============================================================