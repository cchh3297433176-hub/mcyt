// js/09-events-init.js
// 事件绑定与公告系统（v1.604 更新说明与正版声明）
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // 开始游戏按钮（直达开局，不再强行拦截弹窗清空人设）
    $('startGameBtn')?.addEventListener('click', function() {
        if (typeof OtomeSecurityGuard !== 'undefined' && OtomeSecurityGuard.isDeviceBanned()) {
            if (typeof showDeviceBanLockScreen === 'function') showDeviceBanLockScreen();
            return;
        }
        applyAIConfigFromUI('setup');
        if (!G.ai.apiKey) { showToast('⚠️ 请先填入 API Key'); $('setupApiKeyInput')?.focus(); return; }
        if (!G.ai.baseUrl) { showToast('⚠️ 请先填入 API Base URL'); $('setupBaseUrlInput')?.focus(); return; }
        if (!G.ai.model) { showToast('⚠️ 请先选择或填写模型'); $('setupModelInput')?.focus(); return; }

        const autoInfo = (typeof getAutoSaveInfo === 'function') ? getAutoSaveInfo() : null;
        if (autoInfo && autoInfo.data && !_skipStartChoiceOnce) {
            if (!confirm(`检测到此前有保存的进度（第 ${autoInfo.day} 天 · ${autoInfo.data?.player?.ytName || '主播'}）。\n\n确定以当前新填人设开始「全新游戏」并覆盖自动存档吗？`)) {
                return;
            }
        }
        _skipStartChoiceOnce = false;
        initGame();
    });

    // 顶部 Tab 栏切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() { switchTab(this.dataset.tab); });
    });

    // 左侧竖排操作栏按钮统一事件委托
    document.querySelectorAll('.action-bar-vertical .action-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            const action = this.dataset.action;
            if (!action) return;

            if (action === 'chat') {
                switchTab('social');
                return;
            }
            if (action === 'fanart') {
                switchTab('browser');
                return;
            }
            if (action === 'youtube' || action === 'comment') {
                switchTab('youtube');
                return;
            }

            const actionsWithModal = ['stream', 'video', 'sub'];
            if (actionsWithModal.includes(action)) {
                if (action === 'video') { 
                    await performAction(action); 
                } else { 
                    openActionModal(action); 
                }
                return;
            }
            await performAction(action);
        });
    });

    // 左上角头像点击弹窗
    $('headerAvatar')?.addEventListener('click', () => {
        openEditPlayerProfileModal();
    });

    // 顶栏时间时钟胶囊点击：打开时钟与时区设置面板
    $('timeDisplay')?.parentElement?.addEventListener('click', () => {
        if (typeof openClockSettingsModal === 'function') openClockSettingsModal();
    });

    // 联网切换按钮：打开支持博查/秘塔/Tavily的联网搜索中心
    $('webSearchToggleBtn')?.addEventListener('click', () => {
        if (typeof openWebSearchSettingsModal === 'function') {
            openWebSearchSettingsModal();
        } else {
            G.search.enabled = !G.search.enabled;
            persistSearchConfig();
            updateWebSearchToggleUI();
            showToast(G.search.enabled ? '🌐 联网实时搜索已开启' : '🌐 联网搜索已关闭', 'success', 2000);
        }
    });

    // 重说按钮（全局追踪式增强）
    $('rerollBtn')?.addEventListener('click', () => {
        if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }
        if (typeof G._lastRegenerate !== 'function') { showToast('暂无可重新生成的内容', 'error', 1800); return; }
        openModal(`
            <h3 style="margin-bottom:10px;">🔄 重说确认</h3>
            <p style="font-size:13px;color:#666;line-height:1.6;">是否要重新生成上一轮生成的内容？原内容将被撤回并由 AI 重新构思。</p>
            <div class="btn-row" style="margin-top:14px;">
                <button class="btn-secondary" onclick="closeModal()">❌ 否</button>
                <button class="btn-primary" id="confirmRerollBtn">✅ 是，重新生成</button>
            </div>
        `);
        document.getElementById('confirmRerollBtn')?.addEventListener('click', () => {
            closeModal();
            if (typeof G._lastRegenerate === 'function') G._lastRegenerate();
        });
    });

    // 存档、读档与退出
    $('saveGameBtn')?.addEventListener('click', () => {
        if (!_gameInitialized && G.phase === 'setup') { showToast('⚠️ 请先开始游戏', 'error'); return; }
        showSaveSlotsModal('save');
    });
    $('loadGameBtn')?.addEventListener('click', () => {
        if (!_gameInitialized && G.phase === 'setup') { applyAIConfigFromUI('setup'); }
        showSaveSlotsModal('load');
    });
    $('setupLoadGameBtn')?.addEventListener('click', () => {
        applyAIConfigFromUI('setup');
        showSaveSlotsModal('load');
    });
    $('exitGameBtn')?.addEventListener('click', confirmExitGame);

    // 导出与恢复（游戏内头部按钮）
    $('exportSaveBtn')?.addEventListener('click', () => {
        if (typeof openBackupModal === 'function') openBackupModal();
    });
    $('importSaveBtn')?.addEventListener('click', () => {
        if (typeof openRestoreModal === 'function') openRestoreModal();
    });

    // 导出与恢复（初始设定页按钮）
    $('setupImportSaveBtn')?.addEventListener('click', () => {
        if (typeof openRestoreModal === 'function') openRestoreModal();
    });
    $('setupBackupBtn')?.addEventListener('click', () => {
        if (typeof openBackupModal === 'function') openBackupModal();
    });

    $('modelSettingsBtn')?.addEventListener('click', () => {
        openModal(`<h3 style="margin-bottom:10px;">⚙️ 模型设置</h3>` + buildModelSettingsHTML('modal') + buildSearchSettingsHTML('modal'));
        bindModelSettingsUI('modal');
        bindSearchSettingsUI('modal');
    });

    // 技能滑块
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

    // 初始页头像上传
    $('uploadAvatarBtn')?.addEventListener('click', () => { $('avatarFileInput')?.click(); });
    $('avatarFileInput')?.addEventListener('change', function(e) {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            const img = new Image();
            img.onload = function() {
                const size = Math.min(img.width, img.height);
                const canvas = document.createElement('canvas');
                canvas.width = 200; canvas.height = 200;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, (img.width-size)/2, (img.height-size)/2, size, size, 0, 0, 200, 200);
                const dataUrl = canvas.toDataURL('image/jpeg');
                G.player.avatar = dataUrl;
                if ($('avatarPreview')) $('avatarPreview').innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                if ($('headerAvatarImg')) $('headerAvatarImg').src = dataUrl;
                showToast('✅ 头像上传成功！', 'success', 2000);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    // 初始化配置加载
    loadAIConfig();
    loadSavedModels();
    loadMemorySummarySettings();
    loadSearchConfig();
    updateWebSearchToggleUI();
    if (!G.ai.baseUrl) G.ai.baseUrl = CONFIG.DEFAULT_BASE_URL;
    if (!G.ai.model) G.ai.model = CONFIG.DEFAULT_MODEL;
    if ($('apiSettingsContainer')) {
        $('apiSettingsContainer').innerHTML = buildModelSettingsHTML('setup') + buildSearchSettingsHTML('setup');
        bindModelSettingsUI('setup');
        bindSearchSettingsUI('setup');
    }

    const autoInfo = getAutoSaveInfo();
    if (autoInfo && autoInfo.data) {
        const banner = $('resumeBanner');
        if (banner) {
            const d = autoInfo.data;
            banner.style.display = 'block';
            banner.innerHTML = `
                <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px;">▶️ 检测到未完成的游戏进度</div>
                <div style="font-size:12px;color:#666;margin-bottom:10px;">第 ${d.day} 天 · ${d.player?.ytName || ''} · 粉丝 ${d.player?.followers || 0}</div>
                <button type="button" id="resumeAutoSaveBtn" style="padding:8px 18px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:var(--primary);color:#fff;cursor:pointer;">▶️ 继续上次进度</button>
            `;
            $('resumeAutoSaveBtn')?.addEventListener('click', resumeAutoSave);
        }
    }

    setTimeout(() => {
        if (typeof OtomeSecurityGuard !== 'undefined' && OtomeSecurityGuard.isDeviceBanned()) {
            if (typeof showDeviceBanLockScreen === 'function') {
                showDeviceBanLockScreen();
                return;
            }
        }
        checkAndShowVersionNoticeModal();
    }, 400);
});

// ============================================================
// 📢 双页滑动公告系统（v1.604 纯正声明与最新优化记录）
// ============================================================
function checkAndShowVersionNoticeModal(forceOpen = false) {
    const ver = window.CURRENT_APP_VERSION || '1.604';
    const dismissedVersion = localStorage.getItem('mcyt_dismissed_notice_ver');

    if (forceOpen || dismissedVersion !== ver) {
        openVersionNoticeModal(ver);
    }
}

function openVersionNoticeModal(version) {
    const html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <h3 style="margin:0;display:flex;align-items:center;gap:6px;">📢 系统公告 <span style="font-size:11px;background:rgba(46,125,50,0.12);color:var(--primary);padding:2px 8px;border-radius:10px;font-weight:700;">v${version}</span></h3>
    </div>

    <div class="notice-slider-wrap">
        <div class="notice-slider-track" id="noticeSliderTrack">
            <!-- 第 1 页：主公告与正版声明（仅向玩家展示，不注入给AI） -->
            <div class="notice-slide-page">
                <div class="notice-card-box">
                    <h4>📜 关于本项目与正版声明</h4>
                    <p style="margin-bottom:8px;line-height:1.6;">
                        本软件为抖音：<b>@鸢尾黎明</b> 老师的 mcyt 模拟器<b>二改版本</b>，为代入向乙女 Airp 游戏，<b>禁止用于磕 CP，禁止二传</b>。
                    </p>
                    <p style="margin-bottom:8px;color:#c62828;font-weight:700;">
                        ⚠️ 本游戏纯免无收费！如果你需要付费，代表你被骗了！
                    </p>
                    <p style="margin-bottom:8px;line-height:1.6;">
                        目前唯一正版获取渠道为进<b>鸢尾黎明</b>老师的官方群聊。前往抖音搜索 <b>@鸢尾黎明</b> 老师那边即可进群免费获得本软件，群里有老师制作的很多乙女香香饭，欢迎加入！💕
                    </p>
                </div>
            </div>

            <!-- 第 2 页：v1.604 最新更新与修复说明 -->
            <div class="notice-slide-page">
                <div class="notice-card-box" style="max-height:60vh;overflow-y:auto;">
                    <h4 style="color:#2e7d32;margin-bottom:8px;">🚀 v${version} 修复与优化内容</h4>
                    
                    <div style="font-size:13px;font-weight:700;color:#1e293b;margin-top:6px;">🛠️ Bug 修复与功能恢复：</div>
                    <ol style="padding-left:18px;margin:4px 0 8px;font-size:12px;color:#334155;line-height:1.7;">
                        <li><b>恢复角色与玩家人设编辑</b>：
                            <div style="font-size:11.5px;color:#64748b;margin-top:2px;">
                                • 轻点（单击）：打开角色资料名片，查看好感与专属记忆；<br>
                                • 长按（按住 0.45 秒）：带有手机微震反馈，立即弹出《✏️ 编辑角色资料与人设》弹窗，可自由调整角色姓名、自定义上传头像、修改人设性格、皮肤形象、口头禅与赛道；左上角头像亦支持全能修改。
                            </div>
                        </li>
                        <li><b>删除冗余废弃选项</b>：移除了聊天加号菜单中冗余的旁白选项，防止误导他人，全面由「屏幕那边的TA」感知系统接管。</li>
                        <li><b>修复串号覆盖恶性 Bug</b>：修复了查房及重开游戏时可能导致他人角色记忆串号残留的严重问题。</li>
                        <li><b>修复好友申请卡顿 Bug</b>：彻底修复了社交中心点击添加好友/群邀请卡住无反应的异常。</li>
                        <li><b>解决签名冲突问题</b>：固定统一签名密钥，后续更新版本均可直接覆盖安装，无需卸载旧版。</li>
                    </ol>

                    <div style="font-size:13px;font-weight:700;color:#1e293b;margin-top:10px;">✨ 体验优化方面：</div>
                    <ol style="padding-left:18px;margin:4px 0 6px;font-size:12px;color:#334155;line-height:1.7;">
                        <li><b>编辑管理功能全能升级</b>：不仅能修改通知，还能重新编辑 AO3 小说正文、油管长文与剧情，不喜欢的剧情随时改！</li>
                        <li><b>导出记忆卡 Key 隐私保护开关</b>：新增连带导出 API Key 选项（默认关闭），防止导出记忆卡发给他人时泄露个人密匙。</li>
                        <li><b>提示词世界观深度隔离</b>：彻底将作者公告与现实信息从大模型提示词中剥离，严禁网友和 NPC 打破第四面墙，防止愚蠢的 AI 把玩家和世界观认错！</li>
                    </ol>
                </div>
            </div>
        </div>
    </div>

    <div class="notice-dots-wrap">
        <div class="notice-dot active" id="noticeDot0"></div>
        <div class="notice-dot" id="noticeDot1"></div>
    </div>

    <div class="notice-footer-opt">
        <label class="notice-checkbox-label">
            <input type="checkbox" id="dismissVersionNoticeCheck" style="accent-color:var(--primary);width:15px;height:15px;">
            <span>本次版本不再提示</span>
        </label>
        <div style="display:flex;gap:6px;">
            <button class="btn-secondary small" id="noticeNavSlideBtn" style="padding:5px 12px;font-weight:700;">下一页：更新说明 ➡️</button>
            <button class="btn-primary small" id="noticeCloseBtn" style="margin:0;padding:5px 14px;">关 闭</button>
        </div>
    </div>
    `;

    openModal(html);

    let currentPage = 0;
    const track = document.getElementById('noticeSliderTrack');
    const dot0 = document.getElementById('noticeDot0');
    const dot1 = document.getElementById('noticeDot1');
    const navBtn = document.getElementById('noticeNavSlideBtn');

    const updateSliderUI = (page) => {
        currentPage = page;
        if (track) {
            track.style.transform = `translateX(-${currentPage * 50}%)`;
        }
        if (dot0 && dot1) {
            dot0.classList.toggle('active', currentPage === 0);
            dot1.classList.toggle('active', currentPage === 1);
        }
        if (navBtn) {
            navBtn.textContent = currentPage === 0 ? '下一页：更新说明 ➡️' : '⬅️ 返回主公告';
        }
    };

    dot0?.addEventListener('click', () => updateSliderUI(0));
    dot1?.addEventListener('click', () => updateSliderUI(1));

    navBtn?.addEventListener('click', () => {
        updateSliderUI(currentPage === 0 ? 1 : 0);
    });

    document.getElementById('noticeCloseBtn')?.addEventListener('click', () => {
        const isDismissChecked = document.getElementById('dismissVersionNoticeCheck')?.checked;
        if (isDismissChecked) {
            localStorage.setItem('mcyt_dismissed_notice_ver', version);
        } else {
            localStorage.removeItem('mcyt_dismissed_notice_ver');
        }
        closeModal();
    });
}

// ============================================================
// 🧑 个人资料与人设全面编辑弹窗（支持改名、换头像、改人设、改皮肤、改赛道）
// ============================================================
function openEditPlayerProfileModal() {
    const p = G.player || {};
    const currentName = p.ytName || '主播';
    const currentAvatar = p.avatar || '';
    const currentPersona = p.persona || '';
    const currentSkin = p.skin || '';
    const currentCategory = p.category || '剧情';

    const categories = ['剧情', '建筑', '红石', 'PvP', '生存挑战', '模组实况', '整活搞笑'];
    const categoryOptions = categories.map(cat => `
        <option value="${cat}" ${cat === currentCategory ? 'selected' : ''}>${cat}</option>
    `).join('');

    openModal(`
        <h3>🧑 编辑主播个人人设与资料</h3>
        <p style="font-size:12px;color:#666;line-height:1.5;">自由调整你的频道名称、皮上形象、皮肤与赛道。修改后 AI 主线与私聊将立即同步感知！</p>
        
        <div style="max-height:68vh;overflow-y:auto;padding-right:4px;">
            <div class="form-group">
                <label>YouTube 频道名称 <span class="required">*</span></label>
                <input type="text" id="editPlayerNameInput" value="${escapeHtml(currentName)}" placeholder="输入新的频道名...">
            </div>

            <div class="form-group">
                <label>更换频道头像</label>
                <div class="avatar-upload-wrap" style="display:flex;align-items:center;gap:12px;">
                    <div class="avatar-preview" id="editAvatarPreview" style="width:56px;height:56px;border-radius:50%;overflow:hidden;border:2px solid var(--primary);display:flex;align-items:center;justify-content:center;background:#dce8dc;font-size:24px;flex-shrink:0;">
                        ${currentAvatar ? `<img src="${currentAvatar}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
                    </div>
                    <button class="upload-btn" id="editUploadAvatarBtn" type="button">从相册选择新头像</button>
                    <input type="file" id="editAvatarFileInput" accept="image/*" class="file-input" style="display:none;">
                </div>
            </div>

            <div class="form-group">
                <label>主播性格人设 (Persona)</label>
                <textarea id="editPlayerPersonaInput" rows="3" placeholder="例如：性格活泼开朗的女高中生，偶尔有些小傲娇，喜欢红石和建筑..." style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;font-size:13px;">${escapeHtml(currentPersona)}</textarea>
            </div>

            <div class="form-group">
                <label>皮肤/形象外观 (Skin)</label>
                <input type="text" id="editPlayerSkinInput" value="${escapeHtml(currentSkin)}" placeholder="例如：浅棕色双马尾，戴着猫耳耳机，身穿绿色连帽卫衣...">
            </div>

            <div class="form-group">
                <label>主要创作赛道</label>
                <select id="editPlayerCategorySelect" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ccc;font-size:13px;background:#fff;">
                    ${categoryOptions}
                </select>
            </div>
        </div>

        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="savePlayerProfileBtn">💾 保存资料与人设</button>
        </div>
    `);

    let newAvatarData = currentAvatar;

    document.getElementById('editUploadAvatarBtn')?.addEventListener('click', () => {
        document.getElementById('editAvatarFileInput')?.click();
    });

    document.getElementById('editAvatarFileInput')?.addEventListener('change', function() {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            const img = new Image();
            img.onload = function() {
                const size = Math.min(img.width, img.height);
                const canvas = document.createElement('canvas');
                canvas.width = 200; canvas.height = 200;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, (img.width-size)/2, (img.height-size)/2, size, size, 0, 0, 200, 200);
                newAvatarData = canvas.toDataURL('image/jpeg');
                const prev = document.getElementById('editAvatarPreview');
                if (prev) prev.innerHTML = `<img src="${newAvatarData}" style="width:100%;height:100%;object-fit:cover;">`;
                showToast('✅ 头像已选择', 'success', 1200);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('savePlayerProfileBtn')?.addEventListener('click', () => {
        const newName = document.getElementById('editPlayerNameInput')?.value.trim();
        const newPersona = document.getElementById('editPlayerPersonaInput')?.value.trim();
        const newSkin = document.getElementById('editPlayerSkinInput')?.value.trim();
        const newCategory = document.getElementById('editPlayerCategorySelect')?.value || '剧情';

        if (!newName) { showToast('⚠️ 频道名不能为空', 'error'); return; }

        const oldName = G.player.ytName;
        const oldPersona = G.player.persona;
        const oldSkin = G.player.skin;

        const nameChanged = oldName !== newName;
        const personaChanged = oldPersona !== newPersona;
        const skinChanged = oldSkin !== newSkin;

        G.player.ytName = newName;
        G.player.avatar = newAvatarData;
        G.player.persona = newPersona;
        G.player.skin = newSkin;
        G.player.category = newCategory;

        if (typeof detectPersonaStyle === 'function') {
            G.player.personaStyle = detectPersonaStyle(newPersona);
        }

        if (!G.memorySummaries) G.memorySummaries = [];

        if (nameChanged) {
            const memoText = `【更名记录】：第 ${G.day} 天，主角将频道名称由「${oldName}」正式更改为「${newName}」。所有NPC、粉丝与AI剧情中，「${oldName}」与「${newName}」均为同一人，人际关系与历史成就完全继承。`;
            G.memorySummaries.push(memoText);
            addMemoir('更名启事', `频道名由「${oldName}」更改为「${newName}」`);
            appendStory(`📢 你的频道正式更名为「${newName}」，粉丝与好友们都在为你庆祝新起点！`, '📢 频道更名');
        }

        if (personaChanged || skinChanged) {
            const updateDetails = [];
            if (personaChanged) updateDetails.push(`性格人设变更为：“${newPersona}”`);
            if (skinChanged) updateDetails.push(`形象皮肤换为：“${newSkin}”`);
            const updateMemo = `【主角形象与人设更新】：第 ${G.day} 天，主角${updateDetails.join('，')}。`;
            G.memorySummaries.push(updateMemo);
            addMemoir('形象与人设更新', updateDetails.join('；'));
        }

        updateUI();
        renderAllPanels();
        closeModal();
        showToast('✅ 主播资料与人设已保存生效！', 'success', 2500);
        autoSaveGame();
    });
}

function updateWebSearchToggleUI() {
    const btn = $('webSearchToggleBtn');
    if (!btn) return;
    btn.classList.toggle('gold', !!(G.search && G.search.enabled));
}

function openActionModal(action) {
    const actionNames = {
        stream: '📹 直播',
        video: '🎬 制作视频',
        sub: '🧘 皮下活动',
    };
    const placeholders = {
        stream: '例如：挑战末地龙...',
        video: '例如：生存日记...',
        sub: '例如：健身、探索...',
    };
    const title = actionNames[action] || '🎮 行动';
    const placeholder = placeholders[action] || '描述行动...';
    
    const hasSearchConfigured = !!(G.search && (G.search.apiKey || (G.search.keys && Object.values(G.search.keys).some(k => !!k))));

    const searchCheckboxHtml = hasSearchConfigured ? `
    <div class="form-group" style="display:flex;align-items:center;gap:8px;margin-top:2px;">
        <label style="font-size:13px;margin-bottom:0;display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" id="modalUseSearch" ${G.search.enabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);">
            🌐 本次启用实时联网检索 (博查/秘塔/Tavily)
        </label>
    </div>` : '';

    const html = `
    <h3>${title}</h3>
    <p>描述活动细节（可选）：</p>
    <div class="form-group">
        <textarea id="modalActionDetail" placeholder="${placeholder}" rows="2" style="width:100%;padding:8px;border-radius:8px;border:2px solid rgba(30,60,30,0.1);font-size:13px;font-family:inherit;"></textarea>
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
        if (action === 'stream') { switchTab('stream'); showToast('📺 切换到直播页面', 'success', 1500); }
        else await performAction(action, detail, useSearch);
    });
}

// 暴露全局
window.closeModal = closeModal;
window.performAction = performAction;
window.openActionModal = openActionModal;
window.advanceDayFree = advanceDayFree;
window.switchTab = switchTab;
window.renderDataPanel = renderDataPanel;
window.renderDashboard = renderDashboard;
window.renderStreamPanel = renderStreamPanel;
window.openVideoModal = openVideoModal;
window.toggleCollection = toggleCollection;
window.toggleColVideoComments = toggleColVideoComments;
window.renderShop = renderShop;
window.renderMemoir = renderMemoir;
window.renderAchievements = renderAchievements;
window.acceptSponsor = acceptSponsor;
window.G = G;
window.showSaveSlotsModal = showSaveSlotsModal;
window.saveGameToSlot = saveGameToSlot;
window.loadGameFromSlot = loadGameFromSlot;
window.showStartChoiceModal = showStartChoiceModal;
window.bindLongPressEvent = bindLongPressEvent;
window.receiveFriendRequest = receiveFriendRequest;
window.openEditPlayerProfileModal = openEditPlayerProfileModal;
window.checkAndShowVersionNoticeModal = checkAndShowVersionNoticeModal;
window.openVersionNoticeModal = openVersionNoticeModal;
window.updateWebSearchToggleUI = updateWebSearchToggleUI;