// js/02-ai-network.js
// AI 模型设置模块（统一的 OpenAI 兼容接口 / 多平台联网搜索含 Bing Local 双通道免Key直连、Tavily、博查、秘塔 / 纯乙女智能安全门禁）
// ============================================================
function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// ============================================================
// 💭 思维链清洗工具
// ============================================================
function stripThought(text) {
    if (!text) return '';
    let processed = String(text);
    const tkOpen = '<' + 'think>';
    const tkClose = '<' + '/think>';
    if (processed.includes(tkOpen) && !processed.includes(tkClose)) {
        processed += tkClose;
    }
    if (processed.includes('<thought>') && !processed.includes('</thought>')) {
        processed += '</thought>';
    }
    if (processed.includes('<reasoning>') && !processed.includes('</reasoning>')) {
        processed += '</reasoning>';
    }
    const thinkRegex = /<(think|thought|reasoning)>[\s\S]*?<\/\1>/gi;
    return processed.replace(thinkRegex, '').trim();
}

function renderContentWithThoughts(text) {
    if (!text) return '';
    const clean = stripThought(text);
    return escapeHtml(clean).replace(/\n/g, '<br>');
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

// 渲染 API 设置面板
function buildModelSettingsHTML(prefix) {
    const hasConfig = !!(G.ai.apiKey && G.ai.baseUrl);
    return `
        <div class="model-settings">
            ${hasConfig ? `
            <div id="${prefix}ConfigSummary" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#e8f5e9;border-radius:8px;margin-bottom:8px;border:1px solid #c8e6c9;">
                <span style="font-size:12px;color:#2e7d32;font-weight:700;">✅ 已配置模型：${escapeHtml(G.ai.model || '未命名')}</span>
                <button type="button" class="upload-btn" id="${prefix}ToggleDetailBtn" style="padding:4px 10px;font-size:11px;pointer-events:none;">⚙️ 展开修改</button>
            </div>
            ` : ''}
            <div id="${prefix}DetailArea" style="${hasConfig ? 'display:none;' : ''}">
                <div class="form-group" style="margin-bottom:8px;">
                    <label style="font-size:13px;">🌐 API Base URL <span class="required">*</span></label>
                    <input type="text" id="${prefix}BaseUrlInput" placeholder="如 https://api.openai.com/v1 或 https://api.deepseek.com/v1" value="${escapeHtml(G.ai.baseUrl)}">
                    <div style="font-size:11px;color:#999;margin-top:3px;line-height:1.5;">支持 OpenAI 兼容接口，填到 /v1 即可（支持 Gemini / GPT-4o 等视觉多模态）</div>
                </div>
                <div class="form-group" style="margin-bottom:8px;">
                    <label style="font-size:13px;">🔑 API Key <span class="required">*</span></label>
                    <input type="password" id="${prefix}ApiKeyInput" placeholder="sk-... 填入即可" value="${escapeHtml(G.ai.apiKey)}">
                </div>
                <div class="form-group" style="margin-bottom:6px;">
                    <label style="font-size:13px;">🤖 当前模型 <span class="required">*</span></label>
                    <div style="display:flex;gap:6px;">
                        <input type="text" id="${prefix}ModelInput" placeholder="例如 gpt-4o-mini / gemini-2.5-flash / deepseek-chat" value="${escapeHtml(G.ai.model)}" style="flex:1;">
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
                        <input type="text" id="${prefix}ProfileNameInput" placeholder="备注名，例如「主力Gemini」或「主力DeepSeek」" style="flex:1;">
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
    
    const summaryBox = $(`${prefix}ConfigSummary`);
    if (summaryBox) {
        summaryBox.addEventListener('click', () => {
            const area = $(`${prefix}DetailArea`);
            if (!area) return;
            const isHidden = area.style.display === 'none';
            area.style.display = isHidden ? 'block' : 'none';
            const btn = $(`${prefix}ToggleDetailBtn`);
            if (btn) btn.textContent = isHidden ? '🔼 收起' : '⚙️ 展开修改';
        });
    }

    if (G._pulledModels[prefix] && G._pulledModels[prefix].length) {
        $(`${prefix}ModelListWrap`).style.display = '';
        renderModelListBox(prefix, G._pulledModels[prefix], '');
    }
    renderProfileListBox(prefix);
}

// ============================================================
// 🔍 多平台联网搜索模块（Bing Local 双通道免Key直连 / 博查 / 秘塔 / Tavily）
// ============================================================
if (!G.search) {
    G.search = {
        enabled: false,
        provider: 'bing_local',
        apiKey: '',
        keys: { bocha: '', metaso: '', tavily: '' }
    };
}
if (!G.search.keys) {
    G.search.keys = {
        bocha: G.search.provider === 'bocha' ? (G.search.apiKey || '') : '',
        metaso: G.search.provider === 'metaso' ? (G.search.apiKey || '') : '',
        tavily: (G.search.provider === 'tavily' || !G.search.provider) ? (G.search.apiKey || '') : ''
    };
}

function persistSearchConfig() {
    try { localStorage.setItem('mc_yt_search_config', JSON.stringify(G.search)); } catch (_) {}
}
function loadSearchConfig() {
    try {
        const raw = localStorage.getItem('mc_yt_search_config');
        if (raw) {
            const c = JSON.parse(raw);
            if (c && typeof c === 'object') {
                Object.assign(G.search, c);
                if (!G.search.keys) {
                    G.search.keys = { bocha: '', metaso: '', tavily: c.apiKey || '' };
                }
            }
        }
    } catch (_) {}
}

// 🌐 健壮性满级的多平台统一网络搜索（解决跨域白屏问题）
async function webSearch(query, maxResults = 4) {
    const provider = G.search.provider || 'bing_local';
    
    // 🌟 1. Bing (Local) 免 Key 直连 + 跨域网桥双通道抓取
    if (provider === 'bing_local') {
        const parseBingHTML = (htmlText) => {
            if (!htmlText || htmlText.length < 200) return [];
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const list = [];
            
            // 兼容各种 Bing 模板节点
            const nodes = doc.querySelectorAll('li.b_algo, div.b_algo');
            nodes.forEach(el => {
                const titleEl = el.querySelector('h2 a') || el.querySelector('h2');
                const linkEl = el.querySelector('h2 a') || el.querySelector('a');
                const descEl = el.querySelector('.b_caption p') || el.querySelector('.b_algoSlug') || 
                               el.querySelector('.b_lineclamp2') || el.querySelector('.b_lineclamp3') || 
                               el.querySelector('.b_lineclamp4') || el.querySelector('p');
                
                if (titleEl) {
                    const title = (titleEl.innerText || titleEl.textContent || '').trim();
                    const snippet = descEl ? (descEl.innerText || descEl.textContent || '').trim() : '';
                    let url = linkEl ? (linkEl.getAttribute('href') || '') : '';
                    if (url.startsWith('/')) url = 'https://cn.bing.com' + url;

                    if (title && !title.includes('必应') && !title.includes('Microsoft Bing')) {
                        list.push({ title, content: snippet || title, url });
                    }
                }
            });
            return list;
        };

        // 通道 A：优先走安全公共网桥直接拉取必应网页内容（突破 WebView / 浏览器的跨域拦截）
        const targetUrl = 'https://cn.bing.com/search?q=' + encodeURIComponent(query);
        const bridgeEndpoints = [
            'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl),
            'https://corsproxy.io/?' + encodeURIComponent(targetUrl)
        ];

        for (const bridge of bridgeEndpoints) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 9000);
                const resp = await fetch(bridge, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (resp.ok) {
                    const html = await resp.text();
                    const results = parseBingHTML(html);
                    if (results.length > 0) {
                        return { answer: '', results: results.slice(0, maxResults) };
                    }
                }
            } catch (_) {}
        }

        // 通道 B：直连探测备选
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const resp = await fetch(targetUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (resp.ok) {
                const html = await resp.text();
                const results = parseBingHTML(html);
                if (results.length > 0) {
                    return { answer: '', results: results.slice(0, maxResults) };
                }
            }
        } catch (_) {}

        // 安全容错：如果网络完全阻断，返回空列表，保护游戏主线绝不报错崩溃
        return { answer: '', results: [] };
    }

    const key = ((G.search.keys && G.search.keys[provider]) || G.search.apiKey || '').trim();
    if (!key) throw new Error(`请先填入 ${provider} 的 API Key`);

    // 2. 🇨🇳 博查搜索 API
    if (provider === 'bocha') {
        const resp = await fetch('https://api.bochaai.com/v1/web-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ query: query, freshness: 'noLimit', summary: true, count: maxResults })
        });
        if (!resp.ok) {
            const err = await resp.text();
            throw new Error(`博查搜索错误 (${resp.status}): ${err.slice(0, 150)}`);
        }
        const data = await resp.json();
        const results = [];
        if (data.data && data.data.webPages && Array.isArray(data.data.webPages.value)) {
            data.data.webPages.value.forEach(item => {
                results.push({ title: item.name || item.title || '', content: item.summary || item.snippet || '', url: item.url || '' });
            });
        }
        return { answer: '', results };
    }

    // 3. 🇨🇳 秘塔 AI 搜索 API
    if (provider === 'metaso') {
        const resp = await fetch('https://metaso.cn/api/v1/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ query: query, mode: 'concise', limit: maxResults })
        });
        if (!resp.ok) {
            const err = await resp.text();
            throw new Error(`秘塔搜索错误 (${resp.status}): ${err.slice(0, 150)}`);
        }
        const data = await resp.json();
        const results = [];
        if (Array.isArray(data.results)) {
            data.results.forEach(r => {
                results.push({ title: r.title || '', content: r.snippet || r.content || '', url: r.url || '' });
            });
        }
        return { answer: data.answer || '', results };
    }

    // 4. 🌐 Tavily 国际通用搜索
    if (provider === 'tavily') {
        const resp = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({ query: query, search_depth: 'basic', max_results: maxResults, include_answer: true }),
        });
        if (!resp.ok) {
            const t = await resp.text();
            throw new Error(`Tavily 错误 (${resp.status})：${t.slice(0, 150)}`);
        }
        const data = await resp.json();
        return { answer: data.answer || '', results: data.results || [] };
    }

    return { answer: '', results: [] };
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

// 渲染多平台联网设置 UI（包含 Bing Local、博查、秘塔、Tavily 全部四大卡片）
function buildSearchSettingsHTML(prefix) {
    const curProvider = G.search.provider || 'bing_local';
    const isEnabled = !!G.search.enabled;
    const bochaKey = (G.search.keys && G.search.keys.bocha) || '';
    const metasoKey = (G.search.keys && G.search.keys.metaso) || '';
    const tavilyKey = (G.search.keys && G.search.keys.tavily) || '';

    return `
        <div class="model-settings" style="margin-top:14px;padding-top:14px;border-top:1px dashed rgba(30,60,30,.15);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div style="font-size:14px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:6px;">
                    <span>🌐 联网实时搜索中心</span>
                </div>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;background:${isEnabled ? '#eaf5ea' : '#f5f5f5'};padding:3px 8px;border-radius:14px;border:1px solid ${isEnabled ? 'var(--primary)' : '#ccc'};">
                    <input type="checkbox" id="${prefix}SearchMasterToggle" ${isEnabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);">
                    <span style="font-size:12px;font-weight:700;color:${isEnabled ? 'var(--primary)' : '#777'};">${isEnabled ? '已开启联网' : '未开启'}</span>
                </label>
            </div>

            <div style="font-size:11px;color:#888;margin-bottom:10px;line-height:1.5;">
                开启后，AI 将在生成剧情、发布视频与互动时，<b>主动向搜索引擎探查真实的 MC 最新模组、玩法技巧与主播动态</b>！
            </div>

            <!-- 四大提供商单选卡片池 -->
            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
                
                <!-- 平台 0: Bing Local (免配 Key) -->
                <div class="search-provider-card" data-provider="bing_local" style="border:1.5px solid ${curProvider==='bing_local'?'var(--primary)':'#e0e0e0'};background:${curProvider==='bing_local'?'#f4fbf4':'#fff'};border-radius:10px;padding:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">
                    <div>
                        <div style="font-size:13px;font-weight:700;color:#0277bd;">🔍 Bing (Local) <span style="font-size:10px;background:#e3f2fd;color:#0277bd;padding:1px 5px;border-radius:4px;margin-left:4px;">无需配置·直接可用</span></div>
                        <div style="font-size:11px;color:#666;margin-top:2px;">本地直连微软必应抓取，完全免费免 Key，免加速器</div>
                    </div>
                    <div style="font-size:18px;font-weight:900;color:var(--primary);width:24px;text-align:center;">${curProvider==='bing_local'?'✔':''}</div>
                </div>

                <!-- 平台 1: 博查搜索 -->
                <div class="search-provider-card" data-provider="bocha" style="border:1.5px solid ${curProvider==='bocha'?'var(--primary)':'#e0e0e0'};background:${curProvider==='bocha'?'#f4fbf4':'#fff'};border-radius:10px;padding:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">
                    <div>
                        <div style="font-size:13px;font-weight:700;color:#1b5e20;">🇨🇳 博查搜索 (Bocha.cn) <span style="font-size:10px;background:#c8e6c9;color:#2e7d32;padding:1px 5px;border-radius:4px;margin-left:4px;">国内推荐·超快直连</span></div>
                        <div style="font-size:11px;color:#666;margin-top:2px;">专为国内AI打造，直连各大MC论坛、维基百科与视频社群</div>
                    </div>
                    <div style="font-size:18px;font-weight:900;color:var(--primary);width:24px;text-align:center;">${curProvider==='bocha'?'✔':''}</div>
                </div>

                <!-- 平台 2: 秘塔搜索 -->
                <div class="search-provider-card" data-provider="metaso" style="border:1.5px solid ${curProvider==='metaso'?'var(--primary)':'#e0e0e0'};background:${curProvider==='metaso'?'#f4fbf4':'#fff'};border-radius:10px;padding:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">
                    <div>
                        <div style="font-size:13px;font-weight:700;color:#1565c0;">🇨🇳 秘塔 AI 搜索 (Metaso) <span style="font-size:10px;background:#bbdefb;color:#1565c0;padding:1px 5px;border-radius:4px;margin-left:4px;">深度知识·机制全</span></div>
                        <div style="font-size:11px;color:#666;margin-top:2px;">免翻顶流AI学术与资讯搜索引擎，适合搜硬核红石与冷门模组</div>
                    </div>
                    <div style="font-size:18px;font-weight:900;color:var(--primary);width:24px;text-align:center;">${curProvider==='metaso'?'✔':''}</div>
                </div>

                <!-- 平台 3: Tavily Search -->
                <div class="search-provider-card" data-provider="tavily" style="border:1.5px solid ${curProvider==='tavily'?'var(--primary)':'#e0e0e0'};background:${curProvider==='tavily'?'#f4fbf4':'#fff'};border-radius:10px;padding:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">
                    <div>
                        <div style="font-size:13px;font-weight:700;color:#e65100;">🌐 Tavily Search <span style="font-size:10px;background:#ffe0b2;color:#e65100;padding:1px 5px;border-radius:4px;margin-left:4px;">国际顶流生态</span></div>
                        <div style="font-size:11px;color:#666;margin-top:2px;">抓取 YouTube 原版资讯与海外主播社媒，适合国际圈子</div>
                    </div>
                    <div style="font-size:18px;font-weight:900;color:var(--primary);width:24px;text-align:center;">${curProvider==='tavily'?'✔':''}</div>
                </div>
            </div>

            <!-- 当前选中平台设置与可视化测试区 -->
            <div id="${prefix}SearchKeyConfigArea" style="background:#f9fbf9;border:1px solid #e0ebe0;border-radius:10px;padding:12px;">
                
                <div id="${prefix}NoKeyNeededText" style="display:${curProvider==='bing_local' ? 'block' : 'none'};font-size:12.5px;color:#0277bd;font-weight:700;background:#e3f2fd;padding:8px;border-radius:6px;margin-bottom:12px;">
                    ✅ 此提供商无需额外配置，已可直接在下方测试使用。
                </div>

                <div id="${prefix}KeyInputGroup" style="display:${curProvider==='bing_local' ? 'none' : 'block'};margin-bottom:12px;">
                    <div style="font-size:12.5px;font-weight:700;color:#333;margin-bottom:6px;" id="${prefix}SearchKeyLabel">
                        🔑 当前正在配置的 Key：
                    </div>
                    <div style="display:flex;gap:6px;">
                        <input type="password" id="${prefix}SearchApiKeyInput" placeholder="输入该平台的 API Key..." value="${escapeHtml(curProvider==='bocha'?bochaKey:curProvider==='metaso'?metasoKey:tavilyKey)}" style="flex:1;">
                    </div>
                    <div style="font-size:10.5px;color:#888;margin-top:6px;" id="${prefix}SearchHelpLink"></div>
                </div>

                <!-- 测试搜索模块 -->
                <div style="border-top:1px dashed #ccc;padding-top:10px;">
                    <div style="font-size:12.5px;font-weight:700;color:#333;margin-bottom:6px;">测试搜索</div>
                    <div style="display:flex;gap:6px;">
                        <input type="text" id="${prefix}SearchTestKeyword" placeholder="输入测试关键词" style="flex:1;padding:8px;border-radius:8px;border:1px solid #ccc;font-size:13px;" value="Minecraft 1.21 更新">
                        <button type="button" class="upload-btn" id="${prefix}SearchTestBtn" style="padding:0 18px;font-size:18px;color:var(--primary);background:#eaf5ea;border:1px solid #b8dbb8;border-radius:8px;cursor:pointer;">▶</button>
                    </div>
                    <div id="${prefix}SearchTestResultArea" style="margin-top:10px;max-height:220px;overflow-y:auto;font-size:12px;color:#333;border-radius:6px;">
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateSearchHelpText(prefix) {
    const prov = G.search.provider || 'bing_local';
    
    const keyInputGroup = document.getElementById(`${prefix}KeyInputGroup`);
    const noKeyText = document.getElementById(`${prefix}NoKeyNeededText`);
    const linkEl = document.getElementById(`${prefix}SearchHelpLink`);
    const labelEl = document.getElementById(`${prefix}SearchKeyLabel`);
    const keyInput = document.getElementById(`${prefix}SearchApiKeyInput`);

    if (prov === 'bing_local') {
        if (keyInputGroup) keyInputGroup.style.display = 'none';
        if (noKeyText) noKeyText.style.display = 'block';
    } else {
        if (keyInputGroup) keyInputGroup.style.display = 'block';
        if (noKeyText) noKeyText.style.display = 'none';
        
        if (labelEl) {
            labelEl.innerHTML = `🔑 <b>${prov === 'bocha' ? '博查 (Bocha)' : prov === 'metaso' ? '秘塔 (Metaso)' : 'Tavily'}</b> 的 API Key：`;
        }
        if (keyInput) {
            keyInput.value = (G.search.keys && G.search.keys[prov]) || '';
        }
        if (linkEl) {
            if (prov === 'bocha') {
                linkEl.innerHTML = `💡 前往 <a href="https://open.bochaai.com" target="_blank" style="color:var(--primary);font-weight:700;">open.bochaai.com</a> 免费申请（国内秒开，注册即送额度）`;
            } else if (prov === 'metaso') {
                linkEl.innerHTML = `💡 前往 <a href="https://metaso.cn" target="_blank" style="color:var(--primary);font-weight:700;">metaso.cn</a> 开发者平台获取搜索 Key`;
            } else {
                linkEl.innerHTML = `💡 前往 <a href="https://app.tavily.com" target="_blank" style="color:var(--primary);font-weight:700;">app.tavily.com</a> 获取国际版 Key`;
            }
        }
    }
}

async function testWebSearch(prefix) {
    applySearchConfigFromUI(prefix);
    const prov = G.search.provider || 'bing_local';
    const key = (G.search.keys && G.search.keys[prov]) || '';
    
    if (prov !== 'bing_local' && !key) { 
        showToast(`⚠️ 请先填写 ${prov} 的 API Key`); 
        return; 
    }

    const keyword = document.getElementById(`${prefix}SearchTestKeyword`)?.value.trim();
    if (!keyword) { 
        showToast('请输入测试关键词'); 
        return; 
    }

    const btn = $(`${prefix}SearchTestBtn`);
    const resArea = $(`${prefix}SearchTestResultArea`);
    const originalHTML = btn.innerHTML;
    btn.disabled = true; 
    btn.innerHTML = '⏳';
    resArea.innerHTML = '<div style="color:#666;text-align:center;padding:20px;background:#f5f5f5;border-radius:8px;">正在飞速搜索中，请稍候...</div>';
    
    try {
        const data = await webSearch(keyword, 4);
        const count = (data.results || []).length;
        
        let html = '';
        if(count === 0) {
            html = '<div style="color:#999;text-align:center;padding:20px;background:#f5f5f5;border-radius:8px;">未能搜索到相关结果（可能由于网络拦截或暂无收录，可切换国内博查或秘塔试用）</div>';
        } else {
            data.results.forEach((r, idx) => {
                html += `
                <div style="margin-bottom:8px;padding:10px;border:1px solid #e0e0e0;border-radius:8px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display:flex;gap:8px;align-items:flex-start;">
                        <span style="color:#1976d2;font-weight:900;font-size:14px;padding-top:2px;">${idx+1}</span>
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:700;color:#1e293b;margin-bottom:2px;font-size:13.5px;display:flex;justify-content:space-between;">
                                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(r.title)}</span>
                                <a href="${escapeHtml(r.url || '#')}" target="_blank" style="color:#999;text-decoration:none;flex-shrink:0;">↗</a>
                            </div>
                            <div style="font-size:10px;color:#1976d2;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(r.url || '')}</div>
                            <div style="color:#555;line-height:1.5;font-size:12px;">${escapeHtml(r.content)}</div>
                        </div>
                    </div>
                </div>`;
            });
        }
        resArea.innerHTML = html;
        showToast(`✅ 测试成功！已检索到 ${count} 条结果`, 'success', 2000);
    } catch (e) {
        resArea.innerHTML = `<div style="color:#c62828;padding:15px;background:#ffebee;border-radius:8px;border:1px solid #ffcdd2;">❌ 检索出现提示：<br>${escapeHtml(e.message)}</div>`;
        showToast('❌ 测试提示，详情见面板', 'error', 3500);
    } finally {
        btn.disabled = false; 
        btn.innerHTML = originalHTML;
    }
}

function applySearchConfigFromUI(prefix) {
    const prov = G.search.provider || 'bing_local';
    const keyEl = $(`${prefix}SearchApiKeyInput`);
    if (keyEl && prov !== 'bing_local') {
        const v = keyEl.value.trim();
        if (!G.search.keys) G.search.keys = {};
        G.search.keys[prov] = v;
        G.search.apiKey = v;
    }
    const toggle = $(`${prefix}SearchMasterToggle`);
    if (toggle) {
        G.search.enabled = toggle.checked;
    }
    persistSearchConfig();
    if (typeof updateWebSearchToggleUI === 'function') updateWebSearchToggleUI();
}

function bindSearchSettingsUI(prefix) {
    const container = document.getElementById(`${prefix}SearchKeyConfigArea`)?.parentElement;
    if (!container) return;

    updateSearchHelpText(prefix);

    // 平台卡片勾选切换
    container.querySelectorAll('.search-provider-card').forEach(card => {
        card.onclick = () => {
            applySearchConfigFromUI(prefix);
            const prov = card.dataset.provider;
            G.search.provider = prov;
            persistSearchConfig();

            container.querySelectorAll('.search-provider-card').forEach(c => {
                const isSelected = c.dataset.provider === prov;
                c.style.borderColor = isSelected ? 'var(--primary)' : '#e0e0e0';
                c.style.background = isSelected ? '#f4fbf4' : '#fff';
                c.querySelector('div:last-child').textContent = isSelected ? '✔' : '';
            });

            updateSearchHelpText(prefix);
            showToast(`已选中 ${prov === 'bing_local' ? 'Bing Local' : prov === 'bocha' ? '博查搜索' : prov === 'metaso' ? '秘塔搜索' : 'Tavily'}`, 'info', 1200);
        };
    });

    const toggle = $(`${prefix}SearchMasterToggle`);
    if (toggle) {
        toggle.onchange = () => {
            G.search.enabled = toggle.checked;
            persistSearchConfig();
            if (typeof updateWebSearchToggleUI === 'function') updateWebSearchToggleUI();
            showToast(G.search.enabled ? '🌐 联网实时搜索已开启' : '🌐 联网搜索已关闭', 'info', 1500);
        };
    }

    $(`${prefix}SearchApiKeyInput`)?.addEventListener('change', () => applySearchConfigFromUI(prefix));
    $(`${prefix}SearchTestBtn`)?.addEventListener('click', () => testWebSearch(prefix));
    $(`${prefix}SearchTestKeyword`)?.addEventListener('keydown', (e) => {
        if(e.key === 'Enter') {
            e.preventDefault();
            testWebSearch(prefix);
        }
    });
}

function openWebSearchSettingsModal() {
    openModal(`
        <h3 style="margin-bottom:10px;">🌐 联网搜索引擎与实时配置</h3>
        ${buildSearchSettingsHTML('modal')}
        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-primary" onclick="closeModal()" style="width:100%;">完成配置</button>
        </div>
    `);
    bindSearchSettingsUI('modal');
}
window.openWebSearchSettingsModal = openWebSearchSettingsModal;

// ============================================================
// 全局统一生成中加载动画
// ============================================================
let _globalLoadingOverlay = null;

function showGlobalAILoadingIndicator(tipText = '⏳ AI 正在全力创作生成中，请稍候...') {
    if (!_globalLoadingOverlay) {
        _globalLoadingOverlay = document.createElement('div');
        _globalLoadingOverlay.id = 'globalAILoadingOverlay';
        _globalLoadingOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.4); z-index: 99999; display: flex;
            align-items: center; justify-content: center; backdrop-filter: blur(2px);
        `;
        document.body.appendChild(_globalLoadingOverlay);
    }
    _globalLoadingOverlay.innerHTML = `
        <div style="background:#fff;padding:16px 24px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.25);display:flex;align-items:center;gap:12px;border:2px solid var(--primary);">
            <div style="font-size:22px;animation:spin 1s infinite linear;">⚙️</div>
            <div style="font-size:13px;font-weight:700;color:#111;">${escapeHtml(tipText)}</div>
        </div>
        <style>@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}</style>
    `;
    _globalLoadingOverlay.style.display = 'flex';
}

function hideGlobalAILoadingIndicator() {
    if (_globalLoadingOverlay) {
        _globalLoadingOverlay.style.display = 'none';
    }
}

function extractTextFromMessageContent(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .map(part => {
                if (typeof part === 'string') return part;
                if (part && part.type === 'text') return part.text || '';
                return '';
            })
            .join(' ');
    }
    return '';
}

// ============================================================
// API 调用与智能语义意图拦截中枢
// ============================================================
async function callAI(messages, options = {}) {
    if (typeof OtomeSecurityGuard !== 'undefined' && OtomeSecurityGuard.isDeviceBanned()) {
        if (typeof showDeviceBanLockScreen === 'function') showDeviceBanLockScreen();
        throw new Error('该设备因严重违规已被全面封锁，无法调用 AI。');
    }

    if (typeof OtomeSecurityGuard !== 'undefined' && Array.isArray(messages)) {
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        const userText = lastUserMsg ? extractTextFromMessageContent(lastUserMsg.content) : '';
        
        // 🚨 智能语义预检：只在有用户直接输入时触发，彻底避免机械误封
        if (userText) {
            const contextList = messages.map(m => `[${m.role}]: ${extractTextFromMessageContent(m.content)}`);
            const semanticViolationReason = await OtomeSecurityGuard.judgeSemanticViolation(userText, contextList);

            if (semanticViolationReason) {
                console.error('🚨 触发乙女向安全红线，立即执行设备封锁：', semanticViolationReason);
                OtomeSecurityGuard.triggerDeviceBan(semanticViolationReason, userText, contextList);
                throw new Error(`【严重违规被封禁】：${semanticViolationReason}`);
            }
        }
    }

    const key = (options.apiKey || G.ai.apiKey || '').trim();
    const baseUrl = (options.baseUrl || G.ai.baseUrl || '').trim();
    const model = (options.model || G.ai.model || '').trim();
    if (!key) { showToast('⚠️ 请先在「⚙️ 模型」设置中填写 API Key'); throw new Error('未配置 API Key'); }
    if (!baseUrl) { showToast('⚠️ 请先在「⚙️ 模型」设置中填写 API Base URL'); throw new Error('未配置 Base URL'); }
    if (!model) { showToast('⚠️ 请先在「⚙️ 模型」设置中选择或填写模型'); throw new Error('未配置模型'); }

    const finalMessages = messages.map(m => {
        if (m.role === 'system') {
            // 🌟 在这里打上绝不妥协的思想钢印！
            const extraIronRule = '\n\n【性别与情感绝对铁律约束】：\n1. 本作是代入向纯正女性向游戏，支持GL(百合)、GB(女攻男受)、BG(男女)，但主角绝对是纯正的女性（生理与心理皆为女性，绝无男性生殖器官或扶他特征）！女主为全员唯一绝对核心。\n2. 所有剧情与互动严禁出现任何男男同性恋爱、BL耽美、攻略角色互配拉郎或男男亲昵性张力，坚决捍卫纯正女性向定位！\n3. 【社区防线】：此世界观下网民极度排斥男同CP，若有任何读者/弹幕发表拉郎言论，必定会被其他观众立刻毒舌狂喷（如痛骂“腐蟑螂”、“有病吧恶心死我了”、“别发癫”等），用以反击并捍卫纯正的环境！';
            if (typeof m.content === 'string') {
                return { role: 'system', content: m.content + extraIronRule };
            } else if (Array.isArray(m.content)) {
                return {
                    role: 'system',
                    content: [...m.content, { type: 'text', text: extraIronRule }]
                };
            }
        }
        return m;
    });

    showGlobalAILoadingIndicator('⏳ AI 正在全力创作生成中，请稍候...');

    try {
        const resp = await fetch(chatCompletionsUrl(baseUrl), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
                model: model,
                messages: finalMessages,
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
        const tkOpen = '<' + 'think>';
        const tkClose = '<' + '/think>';
        if (reasoning && !content.includes(tkOpen)) {
            content = tkOpen + '\n' + reasoning + '\n' + tkClose + '\n\n' + content;
        }

        if (typeof OtomeSecurityGuard !== 'undefined') {
            const outViolation = OtomeSecurityGuard.checkViolation(stripThought(content));
            if (outViolation) {
                const lastUser = [...messages].reverse().find(m => m.role === 'user');
                const lastUserText = lastUser ? extractTextFromMessageContent(lastUser.content) : '未知指令';
                OtomeSecurityGuard.triggerDeviceBan(`诱导生成男男拉郎内容（${outViolation}）`, lastUserText, messages.map(m => `[${m.role}]: ${extractTextFromMessageContent(m.content)}`));
                throw new Error('生成的回复触犯纯女性向红线，已阻断呈现。');
            }
        }

        return content;
    } finally {
        hideGlobalAILoadingIndicator();
    }
}

// 暴露全局
window.webSearch = webSearch;
window.formatSearchContext = formatSearchContext;
window.buildSearchSettingsHTML = buildSearchSettingsHTML;
window.bindSearchSettingsUI = bindSearchSettingsUI;
window.persistSearchConfig = persistSearchConfig;
window.loadSearchConfig = loadSearchConfig;

