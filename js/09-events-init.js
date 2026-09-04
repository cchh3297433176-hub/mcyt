        // 事件绑定
        // ============================================================
        dom.startBtn.addEventListener('click', function() {
            applyAIConfigFromUI('setup');
            if (!G.ai.apiKey) { showToast('⚠️ 请先填入 API Key');
                $('setupApiKeyInput').focus(); return; }
            if (!G.ai.baseUrl) { showToast('⚠️ 请先填入 API Base URL');
                $('setupBaseUrlInput').focus(); return; }
            if (!G.ai.model) { showToast('⚠️ 请先选择或填写模型');
                $('setupModelInput').focus(); return; }
            if (_skipStartChoiceOnce || !hasAnySaveData()) {
                _skipStartChoiceOnce = false;
                initGame();
            } else {
                showStartChoiceModal(false);
            }
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() { switchTab(this.dataset.tab); });
        });
        // 侧栏按钮事件
        document.querySelectorAll('.action-bar-vertical .action-btn').forEach(btn => {
            btn.addEventListener('click', async function(e) {
                const action = this.dataset.action;
                if (!action) return;
                const actionsWithModal = ['stream', 'video', 'dm', 'friend', 'collab', 'fanclub', 'fanart', 'comment', 'sub'];
                if (actionsWithModal.includes(action)) {
                    if (action === 'video') { await performAction(action); } else { openActionModal(action); }
                    return;
                }
                await performAction(action);
            });
        });
        function updateWebSearchToggleUI() {
            const btn = $('webSearchToggleBtn');
            if (!btn) return;
            btn.classList.toggle('gold', !!G.search.enabled);
            btn.title = G.search.enabled ? '联网搜索：已开启（新行动默认联网，仍可在弹窗里单次取消）' : '联网搜索：已关闭（点击开启）';
        }
        $('webSearchToggleBtn')?.addEventListener('click', () => {
            if (!G.search.apiKey) {
                showToast('⚠️ 请先在下方设置里填写 Tavily API Key', 'error', 2500);
                openModal(`<h3 style="margin-bottom:10px;">⚙️ 模型设置</h3>` + buildModelSettingsHTML('modal') + buildSearchSettingsHTML('modal'));
                bindModelSettingsUI('modal');
                bindSearchSettingsUI('modal');
                return;
            }
            G.search.enabled = !G.search.enabled;
            persistSearchConfig();
            updateWebSearchToggleUI();
            showToast(G.search.enabled ? '🌐 联网搜索已开启，新的行动会默认联网参考资料' : '🌐 联网搜索已关闭', 'success', 2000);
        });
        $('rerollBtn')?.addEventListener('click', () => {
            if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }
            if (typeof G._lastRegenerate !== 'function') { showToast('暂无可重新生成的内容', 'error', 1800); return; }
            openModal(`
                <h3 style="margin-bottom:10px;">🔄 重说确认</h3>
                <p style="font-size:13px;color:#666;line-height:1.6;">是否要重新生成上一轮的剧情回复？原内容将被替换，无法恢复，请谨慎操作。</p>
                <div class="btn-row" style="margin-top:14px;">
                    <button class="btn-secondary" onclick="closeModal()">❌ 否，取消</button>
                    <button class="btn-primary" id="confirmRerollBtn">✅ 是，重新生成</button>
                </div>
            `);
            document.getElementById('confirmRerollBtn')?.addEventListener('click', () => {
                closeModal();
                if (typeof G._lastRegenerate === 'function') { G._lastRegenerate(); }
                else showToast('暂无可重新生成的内容', 'error', 1800);
            });
        });

        function openActionModal(action) {
            const actionNames = {
                stream: '📹 直播',
                video: '🎬 制作视频',
                dm: '💬 私信互动',
                friend: '🤝 交友',
                collab: '🤜 合作视频',
                fanclub: '👥 粉丝群管理',
                fanart: '🎨 看同人作品',
                comment: '💭 评论互动',
                sub: '🧘 皮下活动',
            };
            const placeholders = {
                stream: '例如：挑战末地龙、红石建筑...',
                video: '例如：生存日记、建筑教程...',
                dm: '例如：回复粉丝提问...',
                friend: '例如：想认识哪位主播？',
                collab: '例如：与好友合拍生存挑战...',
                fanclub: '例如：组织活动、发福利...',
                fanart: '例如：浏览粉丝绘画...',
                comment: '例如：在热门视频下留言...',
                sub: '例如：健身、学习、聚餐...',
            };
            const title = actionNames[action] || '🎮 行动';
            const placeholder = placeholders[action] || '描述你的行动...';
            const searchCheckboxHtml = G.search.apiKey ? `
            <div class="form-group" style="display:flex;align-items:center;gap:8px;margin-top:2px;">
                <label style="font-size:13px;margin-bottom:0;display:flex;align-items:center;gap:6px;cursor:pointer;">
                    <input type="checkbox" id="modalUseSearch" ${G.search.enabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);">
                    🌐 本次联网搜索相关资料（消耗一次搜索额度）
                </label>
            </div>` : '';
            const html = `
            <h3>${title}</h3>
            <p>描述你想要进行的活动细节（可选）：</p>
            <div class="form-group">
                <textarea id="modalActionDetail" placeholder="${placeholder}" rows="2" style="width:100%;padding:8px;border-radius:8px;border:2px solid rgba(30, 60, 30, 0.10);background:#f5faf5;color:var(--text);font-size:13px;resize:vertical;font-family:inherit;"></textarea>
            </div>
            ${searchCheckboxHtml}
            <div class="btn-row">
                <button class="btn-secondary" onclick="closeModal()">取消</button>
                <button class="btn-primary" id="modalConfirmAction">确认执行</button>
            </div>
            `;
            openModal(html);
            document.getElementById('modalConfirmAction')?.addEventListener('click', async () => {
                const detail = document.getElementById('modalActionDetail')?.value || '';
                const useSearch = document.getElementById('modalUseSearch')?.checked || false;
                closeModal();
                if (action === 'stream') { switchTab('stream');
                    showToast('📺 切换到直播页面', 'success', 1500); } else await performAction(action, detail, useSearch);
            });
        }
        // 存档/读档按钮
        dom.saveGameBtn.addEventListener('click', function() {
            if (!_gameInitialized && G.phase === 'setup') {
                showToast('⚠️ 请先开始游戏', 'error');
                return;
            }
            showSaveSlotsModal('save');
        });
        dom.loadGameBtn.addEventListener('click', function() {
            if (!_gameInitialized && G.phase === 'setup') {
                applyAIConfigFromUI('setup');
                showSaveSlotsModal('load');
                return;
            }
            showSaveSlotsModal('load');
        });
        $('setupLoadGameBtn')?.addEventListener('click', function() {
            applyAIConfigFromUI('setup');
            showSaveSlotsModal('load');
        });
        $('exitGameBtn')?.addEventListener('click', confirmExitGame);
        // 游戏内「⚙️ 模型」设置入口 —— 支持在任意时刻切换/管理模型
        $('modelSettingsBtn').addEventListener('click', function() {
            openModal(`<h3 style="margin-bottom:10px;">⚙️ 模型设置</h3>` + buildModelSettingsHTML('modal') + buildSearchSettingsHTML('modal'));
            bindModelSettingsUI('modal');
            bindSearchSettingsUI('modal');
        });
        // ============================================================
        // 技能滑块联动
        // ============================================================
        document.querySelectorAll('.skill-input-group input[type="range"]').forEach(range => {
            const numId = range.id.replace('skill', 'skill') + 'Num';
            const numInput = document.getElementById(numId);
            if (numInput) {
                range.addEventListener('input', function() { numInput.value = this.value; });
                numInput.addEventListener('input', function() {
                    let v = parseInt(this.value) || 0;
                    if (v > 100) v = 100;
                    if (v < 0) v = 0;
                    this.value = v;
                    const rangeId = this.id.replace('Num', '');
                    const rangeInput = document.getElementById(rangeId);
                    if (rangeInput) rangeInput.value = v;
                });
            }
        });
        // ============================================================
        // 头像上传
        // ============================================================
        dom.uploadAvatarBtn.addEventListener('click', () => { dom.avatarFileInput.click(); });
        dom.avatarFileInput.addEventListener('change', function(e) {
            const file = this.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                const img = new Image();
                img.onload = function() {
                    const size = Math.min(img.width, img.height);
                    const canvas = document.createElement('canvas');
                    canvas.width = 200;
                    canvas.height = 200;
                    const ctx = canvas.getContext('2d');
                    const sx = (img.width - size) / 2;
                    const sy = (img.height - size) / 2;
                    ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
                    const dataUrl = canvas.toDataURL('image/jpeg');
                    G.player.avatar = dataUrl;
                    dom.avatarPreview.innerHTML = `<img src="${dataUrl}" alt="avatar">`;
                    dom.headerAvatarImg.src = dataUrl;
                    showToast('✅ 头像上传成功！', 'success', 2000);
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
        // ============================================================
        // 存储 & 快捷操作
        // ============================================================
        // ============================================================
        // App 从后台恢复时，强制重新触发一次布局/重绘，
        // 缓解部分打包壳（WebView 长时间挂起后）滑块/滚动区域触摸失效的问题
        // ============================================================
        function forceReflowFix() {
            document.querySelectorAll('input[type="range"]').forEach(el => {
                const v = el.value;
                el.style.transform = 'translateZ(0)';
                el.value = v;
            });
            document.querySelectorAll('.page.active, #storyArea, .tab-content, .modal-box').forEach(el => {
                if (!el) return;
                el.style.display = 'none';
                // eslint-disable-next-line no-unused-expressions
                el.offsetHeight;
                el.style.display = '';
            });
        }
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                setTimeout(forceReflowFix, 60);
            }
        });
        window.addEventListener('pageshow', () => setTimeout(forceReflowFix, 60));
        window.addEventListener('focus', () => setTimeout(forceReflowFix, 60));
        document.addEventListener('DOMContentLoaded', () => {
            loadAIConfig();
            loadSavedModels();
            loadMemorySummarySettings();
            loadSearchConfig();
            updateWebSearchToggleUI();
            if (!G.ai.baseUrl) G.ai.baseUrl = CONFIG.DEFAULT_BASE_URL;
            if (!G.ai.model) G.ai.model = CONFIG.DEFAULT_MODEL;
            $('apiSettingsContainer').innerHTML = buildModelSettingsHTML('setup') + buildSearchSettingsHTML('setup');
            bindModelSettingsUI('setup');
            bindSearchSettingsUI('setup');
            ['setupBaseUrlInput', 'setupApiKeyInput', 'setupModelInput'].forEach(id => {
                const el = $(id);
                if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') dom.startBtn.click(); });
            });
            setRadioValue('identityGroup', 'new');
            setTimeout(() => { const el = $('setupApiKeyInput'); if (el) el.focus(); }, 300);
            const autoInfo = getAutoSaveInfo();
            if (autoInfo && autoInfo.data) {
                const banner = $('resumeBanner');
                if (banner) {
                    const d = autoInfo.data;
                    banner.style.display = 'block';
                    banner.innerHTML = `
                        <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px;">▶️ 检测到未完成的游戏进度</div>
                        <div style="font-size:12px;color:#666;margin-bottom:10px;">第 ${d.day} 天 · ${d.player?.ytName || ''} · 粉丝 ${d.player?.followers || 0}</div>
                        <button type="button" id="resumeAutoSaveBtn" style="padding:8px 18px;font-size:13px;font-weight:700;border:1px solid rgba(30,60,30,.15);border-radius:10px;background:var(--primary);color:#fff;cursor:pointer;">▶️ 继续上次进度</button>
                    `;
                    $('resumeAutoSaveBtn')?.addEventListener('click', resumeAutoSave);
                }
            }
            for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
                const info = getSaveSlotInfo(i);
                if (info) {
                    console.log(`📂 存档位 ${i}: 第${info.data.day}天 · ${info.data.player.ytName} · 粉丝 ${info.data.player.followers}`);
                }
            }
            // 若检测到任何存档（自动存档或手动存档位），启动时直接展示「往日回忆 / 新记忆」选择页
            if (hasAnySaveData()) {
                setTimeout(() => showStartChoiceModal(true), 500);
            }
        });
        // ============================================================
        // 暴露全局
        // ============================================================
        window.closeModal = closeModal;
        window.performAction = performAction;
        window.openActionModal = openActionModal;
        window.advanceDayFree = advanceDayFree;
        window.switchTab = switchTab;
        window.renderDataPanel = renderDataPanel;
        window.renderDashboard = renderDashboard;
        window.renderStreamPanel = renderStreamPanel;
        window.renderSocialPanel = renderSocialPanel;
        window.openChat = openChat;
        window.closeChat = closeChat;
        window.playerConfess = playerConfess;
        window.openVideoModal = openVideoModal;
        window.toggleCollection = toggleCollection;
        window.toggleColVideoComments = toggleColVideoComments;
        window.renderShop = renderShop;
        window.renderMemoir = renderMemoir;
        window.renderFeed = renderFeed;
        window.renderAchievements = renderAchievements;
        window.acceptSponsor = acceptSponsor;
        window.G = G;
        window.showSaveSlotsModal = showSaveSlotsModal;
        window.saveGameToSlot = saveGameToSlot;
        window.loadGameFromSlot = loadGameFromSlot;
        console.log('🎀 MC YouTube模拟器💕 6.0 完整版已加载！');
        console.log('📌 请在「联网与AI模型设置」中填入 Base URL / API Key / 模型 开始游戏。');
        console.log('🆕 新增功能：');
        console.log(' - 完整的三存档位存读档系统');
        console.log(' - OpenAI 兼容接口：支持拉取模型列表、关键词搜索、多模型档案保存与一键切换');
        console.log(' - 游戏内可随时通过「⚙️ 模型」按钮切换模型');
