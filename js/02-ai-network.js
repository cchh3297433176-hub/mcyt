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
// 1. 彻底剔除思维链，只保留正文供 AI 上下文读取与保存
function stripThought(text) {
    if (!text) return '';
    let processed = String(text);
    if (processed.includes('')) processed += '</think>';
    if (processed.includes('<thought>') && !processed.includes('</thought>')) processed += '</thought>';
    if (processed.includes('<reasoning>') && !processed.includes('</reasoning>')) processed += '</reasoning>';
    const thinkRegex = /<(think|thought|reasoning)>[\s\S]*?<\/\1>/gi;
    return processed.replace(thinkRegex, '').trim();
}

// 2. 将思维链转换为折叠盒子，正文正常展示
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

// 渲染 API 设置面板（已填配置时默认折叠）
function buildModelSettingsHTML(prefix) {
    const hasConfig = !!(G.ai.apiKey && G.ai.baseUrl);
    return `
        <div class="model-settings">
            ${hasConfig ? `
            <div id="${prefix}ConfigSummary" style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#e8f5e9;border-radius:8px;margin-bottom:8px;border:1px solid #c8e6c9;">
                <span style="font-size:12px;color:#2e7d32;font-weight:700;">✅ 已配置：${escapeHtml(G.ai.model || '自定义模型')}</span>
                <button type="button" class="upload-btn" id="${prefix}ToggleDetailBtn" style="padding:3px 8px;font-size:11px;">⚙️ 展开修改</button>
            </div>
            ` : ''}
            <div id="${prefix}DetailArea" style="${hasConfig ? 'display:none;' : ''}">
                <div class="form-group" style="margin-bottom:8px;">
                    <label style="font-size:13px;">🌐 API Base URL <span class="required">*</span></label>
                    <input type="text" id="${prefix}BaseUrlInput" placeholder="如 https://api.openai.com/v1 或 https://api.deepseek.com/v1" value="${escapeHtml(G.ai.baseUrl)}">
                    <div style="font-size:11px;color:#999;margin-top:3px;line-height:1.5;">支持 OpenAI 兼容接口，填到 /v1 即可</div>
                </div>
                <div class="form-group" style="margin-bottom:8px;">
                    <label style="font-size:13px;">🔑 API Key <span class="required">*</span></label>
                    <input type="password" id="${prefix}ApiKeyInput" placeholder="sk-... 填入即可" value="${escapeHtml(G.ai.apiKey)}">
                </div>
                <div class="form-group" style="margin-bottom:6px;">
                    <label style="font-size:13px;">🤖 当前模型 <span class="required">*</span></label>
                    <div style="display:flex;gap:6px;">
                        <input type="text" id="${prefix}ModelInput" placeholder="例如 gpt-4o-mini / deepseek-chat" value="${escapeHtml(G.ai.model)}" style="flex:1;">
                        <button type="button" class="upload-btn" id="${prefix}PullBtn" style="white-space:nowrap;padding:0 12px;">🔄 拉取模型</button>
                        <button type="button" class="upload-btn" id="${prefix}TestBtn" style="white-space:nowrap;padding:0 12px;">🔌 测试连接</button>
                    </div>
                </div>
                <div id="${prefix}ModelListWrap" style="display:none;margin-bottom:10px;">
                    <input type="text" id="${prefix}ModelSearchInput" placeholder="🔍 按关键词搜索已拉取的模型...">
                    <div id="${prefix}ModelListBox" style="max-height:160px;overflow-y:auto;border:1px solid rgba(30,60,30,.10);border-radius:8px;margin-top:6px;background:var(--card2);"></div>
                </div>
                <div class="form-group" style="margin-bottom:8px;">
                    <label style="font-size:13px;">💾 保存为模型档案</label>
                    <div style="display:flex;gap:6px;">
                        <input type="text" id="${prefix}ProfileNameInput" placeholder="备注名，例如「主力DeepSeek」" style="flex:1;">
                        <button type="button" class="upload-btn" id="${prefix}SaveProfileBtn" style="white-space:nowrap;padding:0 12px;">💾 保存</button>
                    </div>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label style="font-size:13px;">📋 已保存的模型档案</label>
                    <div id="${prefix}ProfileListBox" style="margin-top:4px;"></div>
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
    if (!baseUrl) { showToast('⚠️ 请先填写 API Base URL'); return; }
    if (!apiKey) { showToast('⚠️ 请先填写 API Key'); return; }
    const btn = $(`${prefix}PullBtn`);
    const originalText = btn.textContent;
    btn.disabled = true; btn.textContent = '⏳ 拉取中...';
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
        else if (Array.isArray(data)) list = data.map(m => (typeof m === 'string' ? m : (m.id || m.name))).filter(Boolean);
        if (!list.length) throw new Error('未能解析出模型列表');
        list = [...new Set(list)].sort();
        G._pulledModels[prefix] = list;
        $(`${prefix}ModelListWrap`).style.display = '';
        $(`${prefix}ModelSearchInput`).value = '';
        renderModelListBox(prefix, list, '');
        showToast(`✅ 成功拉取 ${list.length} 个可用模型`, 'success', 2200);
    } catch (e) {
        console.error('拉取模型失败', e);
        showToast('❌ 拉取模型失败：' + e.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = originalText;
    }
}

async function testAIConnection(prefix) {
    applyAIConfigFromUI(prefix);
    const btn = $(`${prefix}TestBtn`);
    const originalText = btn.textContent;
    btn.disabled = true; btn.textContent = '⏳ 测试中...';
    try {
        await callAI([{ role: 'user', content: '请只回复"OK"两个字。' }], { maxTokens: 10, temperature: 0 });
        showToast('✅ 联网测试成功，接口与模型可正常调用！', 'success', 2500);
    } catch (e) {
        showToast('❌ 联网测试失败：' + e.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = originalText;
    }
}

function renderProfileListBox(prefix) {
    const box = $(`${prefix}ProfileListBox`);
    if (!box) return;
    if (!G.savedModels.length) {
        box.innerHTML = `<div style="padding:8px;font-size:12px;color:#999;">暂无保存的模型档案</div>`;
        return;
    }
    box.innerHTML = G.savedModels.map(p => `
        <div style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:var(--card2);border-radius:8px;margin-bottom:6px;">
            <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;color:var(--text);">${escapeHtml(p.note)}</div>
                <div style="font-size:11px;color:#999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(p.model)} · ${escapeHtml(p.baseUrl)}</div>
            </div>
            <button type="button" class="upload-btn" data-act="use" data-id="${p.id}" style="padding:5px 10px;font-size:12px;white-space:nowrap;">使用</button>
            <button type="button" class="upload-btn" data-act="del" data-id="${p.id}" style="padding:5px 10px;font-size:12px;white-space:nowrap;background:#c62828;">删除</button>
        </div>
    `).join('');
    box.querySelectorAll('button[data-act="use"]').forEach(btn => {
        btn.addEventListener('click', () => applyModelProfile(prefix, btn.dataset.id));
    });
    box.querySelectorAll('button[data-act="del"]').forEach(btn => {
        btn.addEventListener('click', () => {
            G.savedModels = G.savedModels.filter(p => p.id !== btn.dataset.id);
            persistSavedModels();
            renderProfileListBox(prefix);
            showToast('🗑️ 已删除档案', 'success', 1500);
        });
    });
}

function saveModelProfile(prefix) {
    applyAIConfigFromUI(prefix);
    const note = ($(`${prefix}ProfileNameInput`).value || '').trim();
    const { baseUrl, apiKey, model } = G.ai;
    if (!baseUrl || !apiKey || !model) { showToast('⚠️ 请先完整填写 Base URL / API Key / 模型'); return; }
    if (!note) { showToast('⚠️ 请填写一个备注名再保存'); return; }
    G.savedModels.push({ id: 'm_' + Date.now() + '_' + Math.floor(Math.random() * 1000), note, baseUrl, apiKey, model });
    persistSavedModels();
    $(`${prefix}ProfileNameInput`).value = '';
    renderProfileListBox(prefix);
    showToast('✅ 已保存模型档案：' + note, 'success', 2000);
}

function applyModelProfile(prefix, id) {
    const p = G.savedModels.find(x => x.id === id);
    if (!p) return;
    $(`${prefix}BaseUrlInput`).value = p.baseUrl;
    $(`${prefix}ApiKeyInput`).value = p.apiKey;
    $(`${prefix}ModelInput`).value = p.model;
    applyAIConfigFromUI(prefix);
    showToast('✅ 已切换为档案：' + p.note, 'success', 2000);
}

function bindModelSettingsUI(prefix) {
    ['BaseUrlInput', 'ApiKeyInput', 'ModelInput'].forEach(f => {
        const el = $(`${prefix}${f}`);
        if (el) el.addEventListener('change', () => applyAIConfigFromUI(prefix));
    });
    $(`${prefix}PullBtn`)?.addEventListener('click', () => pullModelList(prefix));
    $(`${prefix}TestBtn`)?.addEventListener('click', () => testAIConnection(prefix));
    $(`${prefix}ModelSearchInput`)?.addEventListener('input', function() {
        const list = G._pulledModels[prefix] || [];
        renderModelListBox(prefix, list, this.value.trim());
    });
    $(`${prefix}SaveProfileBtn`)?.addEventListener('click', () => saveModelProfile(prefix));
    $(`${prefix}ToggleDetailBtn`)?.addEventListener('click', () => {
        const area = $(`${prefix}DetailArea`);
        if (!area) return;
        const isHidden = area.style.display === 'none';
        area.style.display = isHidden ? 'block' : 'none';
        const btn = $(`${prefix}ToggleDetailBtn`);
        if (btn) btn.textContent = isHidden ? '🔼 收起' : '⚙️ 展开修改';
    });
    if (G._pulledModels[prefix] && G._pulledModels[prefix].length) {
        $(`${prefix}ModelListWrap`).style.display = '';
        renderModelListBox(prefix, G._pulledModels[prefix], '');
    }
    renderProfileListBox(prefix);
}

// ============================================================
// 联网搜索模块（Tavily）
// ============================================================
function persistSearchConfig() {
    try { localStorage.setItem('mc_yt_search_config', JSON.stringify(G.search)); } catch (_) {}
}
function loadSearchConfig() {
    try {
        const raw = localStorage.getItem('mc_yt_search_config');
        if (raw) { const c = JSON.parse(raw); if (c && typeof c === 'object') Object.assign(G.search, c); }
    } catch (_) {}
}
async function webSearch(query, maxResults = 4) {
    const key = (G.search.apiKey || '').trim();
    if (!key) throw new Error('未配置 Tavily API Key');
    const resp = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
            query: query,
            search_depth: 'basic',
            max_results: maxResults,
            include_answer: true,
        }),
    });
    if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Tavily 错误 (${resp.status})：${t.slice(0, 150)}`);
    }
    return await resp.json();
}
function formatSearchContext(data) {
    if (!data) return { text: '', titles: [] };
    let text = '';
    if (data.answer) text += `概要：${data.answer}\n`;
    const titles = [];
    if (Array.isArray(data.results)) {
        data.results.slice(0, 4).forEach((r, i) => {
            text += `${i + 1}. 《${r.title}》：${(r.content || '').slice(0, 220)}\n`;
            if (r.title) titles.push(r.title);
        });
    }
    return { text, titles };
}
function buildSearchSettingsHTML(prefix) {
    return `
        <div class="model-settings" style="margin-top:14px;padding-top:14px;border-top:1px dashed rgba(30,60,30,.15);">
            <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px;display:flex;align-items:center;gap:6px;">
                <span>🔎 联网搜索 (Tavily)</span>
                <span style="background:var(--primary);color:#fff;padding:0 8px;border-radius:12px;font-size:11px;font-weight:700;">可选</span>
            </div>
            <div style="font-size:11px;color:#999;margin-bottom:8px;line-height:1.5;">填好 API Key 后支持联网检索真实模组与资讯。前往 <a href="https://app.tavily.com" target="_blank" style="color:var(--primary);">app.tavily.com</a> 获取。</div>
            <div class="form-group" style="margin-bottom:6px;">
                <label style="font-size:13px;">🔑 Tavily API Key</label>
                <div style="display:flex;gap:6px;">
                    <input type="password" id="${prefix}SearchApiKeyInput" placeholder="tvly-..." value="${escapeHtml(G.search.apiKey)}" style="flex:1;">
                    <button type="button" class="upload-btn" id="${prefix}SearchTestBtn" style="white-space:nowrap;padding:0 12px;">🔌 测试搜索</button>
                </div>
            </div>
        </div>
    `;
}
async function testWebSearch(prefix) {
    applySearchConfigFromUI(prefix);
    if (!G.search.apiKey) { showToast('⚠️ 请先填写 Tavily API Key'); return; }
    const btn = $(`${prefix}SearchTestBtn`);
    const originalText = btn.textContent;
    btn.disabled = true; btn.textContent = '⏳ 测试中...';
    try {
        const data = await webSearch('Minecraft 最新模组 2026', 3);
        const n = (data.results || []).length;
        showToast(`✅ 联网搜索测试成功，返回 ${n} 条结果`, 'success', 2500);
    } catch (e) {
        showToast('❌ 联网搜索测试失败：' + e.message, 'error');
    } finally {
        btn.disabled = false; btn.textContent = originalText;
    }
}
function applySearchConfigFromUI(prefix) {
    const keyEl = $(`${prefix}SearchApiKeyInput`);
    if (keyEl) G.search.apiKey = (keyEl.value || '').trim();
    persistSearchConfig();
}
function bindSearchSettingsUI(prefix) {
    const keyEl = $(`${prefix}SearchApiKeyInput`);
    if (keyEl) keyEl.addEventListener('change', () => applySearchConfigFromUI(prefix));
    const testBtn = $(`${prefix}SearchTestBtn`);
    if (testBtn) testBtn.addEventListener('click', () => testWebSearch(prefix));
}

// ============================================================
// API 调用（自动整合思维链）
// ============================================================
async function callAI(messages, options = {}) {
    const key = (options.apiKey || G.ai.apiKey || '').trim();
    const baseUrl = (options.baseUrl || G.ai.baseUrl || '').trim();
    const model = (options.model || G.ai.model || '').trim();
    if (!key) { showToast('⚠️ 请先在「⚙️ 模型」设置中填写 API Key'); throw new Error('未配置 API Key'); }
    if (!baseUrl) { showToast('⚠️ 请先在「⚙️ 模型」设置中填写 API Base URL'); throw new Error('未配置 Base URL'); }
    if (!model) { showToast('⚠️ 请先在「⚙️ 模型」设置中选择或填写模型'); throw new Error('未配置模型'); }
    const resp = await fetch(chatCompletionsUrl(baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: options.maxTokens || CONFIG.MAX_TOKENS,
            temperature: options.temperature || CONFIG.TEMPERATURE,
            stream: false,
        }),
    });
    if (!resp.ok) {
        const err = await resp.text();
        let msg = `API 错误 (${resp.status})`;
        try { const j = JSON.parse(err); if (j.error && j.error.message) msg = j.error.message; } catch (_) {}
        showToast('❌ ' + msg);
        throw new Error(msg);
    }
    const data = await resp.json();
    if (!data.choices || !data.choices.length) throw new Error('API 返回异常');

    const message = data.choices[0].message;
    let content = message.content || '';
    const reasoning = message.reasoning_content || message.reasoning || '';
    if (reasoning && !content.includes('\n\n` + content;
    }
    return content;
}
// ============================================================