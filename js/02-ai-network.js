// js/02-ai-network.js
// 底层 AI 网络通讯与多平台搜索核心（纯底座无UI，UI已全量迁移至 settings-app.js）
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
    if (processed.includes('')) {
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

// ============================================================
// 数据持久化
// ============================================================
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

// ============================================================
// 🔍 多平台联网搜索模块核心（Bing Local / 博查 / 秘塔 / Tavily）
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

async function webSearch(query, maxResults = 4) {
    const provider = G.search.provider || 'bing_local';
    
    // 1. Bing (Local) 免 Key 双通道抓取
    if (provider === 'bing_local') {
        const parseBingHTML = (htmlText) => {
            if (!htmlText || htmlText.length < 200) return [];
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const list = [];
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
                    if (results.length > 0) return { answer: '', results: results.slice(0, maxResults) };
                }
            } catch (_) {}
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const resp = await fetch(targetUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (resp.ok) {
                const html = await resp.text();
                const results = parseBingHTML(html);
                if (results.length > 0) return { answer: '', results: results.slice(0, maxResults) };
            }
        } catch (_) {}

        return { answer: '', results: [] };
    }

    const key = ((G.search.keys && G.search.keys[provider]) || G.search.apiKey || '').trim();
    if (!key) throw new Error(`请先填入 ${provider} 的 API Key`);

    // 2. 博查搜索 API
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

    // 3. 秘塔 AI 搜索 API
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

    // 4. Tavily 国际通用搜索
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

// ============================================================
// 全局生成动画
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
// API 调用总出口与纯乙女安全门禁
// ============================================================
async function callAI(messages, options = {}) {
    if (typeof OtomeSecurityGuard !== 'undefined' && OtomeSecurityGuard.isDeviceBanned()) {
        if (typeof showDeviceBanLockScreen === 'function') showDeviceBanLockScreen();
        throw new Error('该设备因严重违规已被全面封锁，无法调用 AI。');
    }

    if (typeof OtomeSecurityGuard !== 'undefined' && Array.isArray(messages)) {
        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
        const userText = lastUserMsg ? extractTextFromMessageContent(lastUserMsg.content) : '';
        
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
    if (!key) { if (typeof showToast === 'function') showToast('⚠️ 请先在「⚙️ 系统设置」中填写 API Key'); throw new Error('未配置 API Key'); }
    if (!baseUrl) { if (typeof showToast === 'function') showToast('⚠️ 请先在「⚙️ 系统设置」中填写 API Base URL'); throw new Error('未配置 Base URL'); }
    if (!model) { if (typeof showToast === 'function') showToast('⚠️ 请先在「⚙️ 系统设置」中选择或填写模型'); throw new Error('未配置模型'); }

    const finalMessages = messages.map(m => {
        if (m.role === 'system') {
            const extraIronRule = '\n\n【性别与情感绝对铁律约束】：\n1. 本作是代入向纯正女性向游戏，支持GL(百合)、GB(女攻男受)、BG(男女)，但主角绝对是纯正的女性（生理与心理皆为女性，绝无男性生殖器官或扶他特征）！女主为全员唯一绝对核心。\n2. 所有剧情与互动严禁出现任何男男同性恋爱、BL耽美、攻略角色互配拉郎或男男亲昵性张力，坚决捍卫纯正女性向定位！\n3. 【社区防线】：此世界观下网民极度排斥男同CP，若有任何读者/弹幕发表拉郎言论，必定会被其他观众立刻毒舌狂喷，用以反击并捍卫纯正的环境！';
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

    // 允许助手静默调用，不弹全局大遮罩
    if (!options.silent) {
        showGlobalAILoadingIndicator('⏳ AI 正在全力创作生成中，请稍候...');
    }

    try {
        const resp = await fetch(chatCompletionsUrl(baseUrl), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
                model: model,
                messages: finalMessages,
                max_tokens: options.maxTokens || (window.CONFIG ? CONFIG.MAX_TOKENS : 1000),
                temperature: (options.temperature !== undefined) ? options.temperature : (window.CONFIG ? CONFIG.TEMPERATURE : 0.7),
                stream: false,
            }),
        });

        if (!resp.ok) {
            const err = await resp.text();
            let msg = `API 错误 (${resp.status})`;
            try { const j = JSON.parse(err); if (j.error && j.error.message) msg = j.error.message; } catch (_) {}
            if (typeof showToast === 'function') showToast('❌ ' + msg);
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
        if (!options.silent) {
            hideGlobalAILoadingIndicator();
        }
    }
}

// 暴露全局
window.callAI = callAI;
window.webSearch = webSearch;
window.formatSearchContext = formatSearchContext;
window.stripThought = stripThought;
window.renderContentWithThoughts = renderContentWithThoughts;
window.isLikelyTruncated = isLikelyTruncated;
window.normalizeBaseUrl = normalizeBaseUrl;
window.chatCompletionsUrl = chatCompletionsUrl;
window.modelsUrl = modelsUrl;
window.persistAIConfig = persistAIConfig;
window.loadAIConfig = loadAIConfig;
window.persistSavedModels = persistSavedModels;
window.loadSavedModels = loadSavedModels;
window.persistSearchConfig = persistSearchConfig;
window.loadSearchConfig = loadSearchConfig;
