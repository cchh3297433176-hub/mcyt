        // AI 模型设置模块（统一的 OpenAI 兼容接口配置 / 拉取模型 / 多档案）
        // ============================================================
        function escapeHtml(str) {
            return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[c]));
        }
        // 纯规则判断（非AI）：文本是否疑似被截断/格式不完整
        function isLikelyTruncated(text) {
            if (!text) return false;
            const t = String(text).trim();
            if (t.length < 10) return false;
            const last = t[t.length - 1];
            const properEnd = '。！？…」』"”）)~♪☆★.!?》】';
            if (properEnd.includes(last)) return false;
            const dangling = '，,、：:；;（(「『“—-～的了在和与就都也而但因所';
            if (dangling.includes(last)) return true;
            // 结尾既非正常标点也非常见连接字，且内容较长，大概率是被截断
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
        // 渲染面板（prefix 区分「初始设置页」与「游戏内弹窗」两处实例，数据统一来自 G.ai / G.savedModels）
        function buildModelSettingsHTML(prefix) {
            return `
                <div class="model-settings">
                    <div class="form-group" style="margin-bottom:8px;">
                        <label style="font-size:13px;">🌐 API Base URL <span class="required">*</span></label>
                        <input type="text" id="${prefix}BaseUrlInput" placeholder="如 https://api.openai.com/v1 或 https://api.deepseek.com/v1" value="${escapeHtml(G.ai.baseUrl)}">
                        <div style="font-size:11px;color:#999;margin-top:3px;line-height:1.5;">支持任意 OpenAI 兼容接口（OpenAI / DeepSeek / SiliconFlow / Moonshot / 自建 Ollama·One API 等），填到 /v1 即可，无需手动拼接 /chat/completions</div>
                    </div>
                    <div class="form-group" style="margin-bottom:8px;">
                        <label style="font-size:13px;">🔑 API Key <span class="required">*</span></label>
                        <input type="password" id="${prefix}ApiKeyInput" placeholder="sk-... 填入即可开始" value="${escapeHtml(G.ai.apiKey)}">
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
                            <input type="text" id="${prefix}ProfileNameInput" placeholder="备注名，例如「主力DeepSeek」「备用GPT」" style="flex:1;">
                            <button type="button" class="upload-btn" id="${prefix}SaveProfileBtn" style="white-space:nowrap;padding:0 12px;">💾 保存</button>
                        </div>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label style="font-size:13px;">📋 已保存的模型档案（点击「使用」即时切换）</label>
                        <div id="${prefix}ProfileListBox" style="margin-top:4px;"></div>
                    </div>
                </div>
            `;
        }
        function applyAIConfigFromUI(prefix) {
            G.ai.baseUrl = ($(`${prefix}BaseUrlInput`).value || '').trim();
            G.ai.apiKey = ($(`${prefix}ApiKeyInput`).value || '').trim();
            G.ai.model = ($(`${prefix}ModelInput`).value || '').trim();
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
                if (!list.length) throw new Error('未能解析出模型列表，请检查接口返回格式');
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
            $(`${prefix}PullBtn`).addEventListener('click', () => pullModelList(prefix));
            $(`${prefix}TestBtn`).addEventListener('click', () => testAIConnection(prefix));
            $(`${prefix}ModelSearchInput`).addEventListener('input', function() {
                const list = G._pulledModels[prefix] || [];
                renderModelListBox(prefix, list, this.value.trim());
            });
            $(`${prefix}SaveProfileBtn`).addEventListener('click', () => saveModelProfile(prefix));
            if (G._pulledModels[prefix] && G._pulledModels[prefix].length) {
                $(`${prefix}ModelListWrap`).style.display = '';
                renderModelListBox(prefix, G._pulledModels[prefix], '');
            }
            renderProfileListBox(prefix);
        }
        // ============================================================
        // 联网搜索模块（Tavily —— 为剧情生成提供真实的模组/主播等最新资料）
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
                    <div style="font-size:11px;color:#999;margin-bottom:8px;line-height:1.5;">填好 API Key 后，左侧操作栏会出现「🌐 联网」按钮，点亮=之后的行动默认联网搜索，再点一次关闭；每个行动弹窗里也有单独的勾选框，可临时覆盖这一次是否联网。免费额度约每月 1000 次搜索，请前往 <a href="https://app.tavily.com" target="_blank" style="color:var(--primary);">app.tavily.com</a> 获取 API Key。</div>
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
        // API 调用
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
            return data.choices[0].message.content;
        }
        // ============================================================
