// 事件绑定与公告系统
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // 开始游戏按钮
    $('startGameBtn')?.addEventListener('click', function() {
        applyAIConfigFromUI('setup');
        if (!G.ai.apiKey) { showToast('⚠️ 请先填入 API Key'); $('setupApiKeyInput')?.focus(); return; }
        if (!G.ai.baseUrl) { showToast('⚠️ 请先填入 API Base URL'); $('setupBaseUrlInput')?.focus(); return; }
        if (!G.ai.model) { showToast('⚠️ 请先选择或填写模型'); $('setupModelInput')?.focus(); return; }
        if (_skipStartChoiceOnce || !hasAnySaveData()) {
            _skipStartChoiceOnce = false;
            initGame();
        } else {
            showStartChoiceModal(false);
        }
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

            // 核心支持：聊天中心 0 消耗直接进入
            if (action === 'chat') {
                switchTab('social');
                return;
            }

            // 核心支持：同人浏览器 0 消耗直接进入
            if (action === 'fanart') {
                switchTab('browser');
                return;
            }

            // 核心支持：YouTube 油管中心 0 消耗直接进入
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

    // 左上角头像点击弹窗：更改名字与头像，并将更名记忆注明进长期档案
    $('headerAvatar')?.addEventListener('click', () => {
        openEditPlayerProfileModal();
    });

    // 联网切换
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
        showToast(G.search.enabled ? '🌐 联网搜索已开启' : '🌐 联网搜索已关闭', 'success', 2000);
    });

    // 重说按钮
    $('rerollBtn')?.addEventListener('click', () => {
        if (G.isGenerating) { showToast('⏳ 正在生成中，请稍候'); return; }
        if (typeof G._lastRegenerate !== 'function') { showToast('暂无可重新生成的内容', 'error', 1800); return; }
        openModal(`
            <h3 style="margin-bottom:10px;">🔄 重说确认</h3>
            <p style="font-size:13px;color:#666;line-height:1.6;">是否要重新生成上一轮剧情？原内容将被替换。</p>
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

    // 📤📥 存档备份/恢复（游戏内头部按钮）：更新App前导出、更新后导入，防止自建角色/群聊丢失
    $('exportSaveBtn')?.addEventListener('click', () => {
        if (typeof exportSaveToFile === 'function') exportSaveToFile();
    });
    $('importSaveBtn')?.addEventListener('click', () => $('importSaveFileInput')?.click());
    $('importSaveFileInput')?.addEventListener('change', function() {
        const file = this.files[0];
        if (file && typeof importSaveFromFile === 'function') importSaveFromFile(file);
        this.value = '';
    });

    // 📥 存档备份/恢复（初始设定页按钮）：全新安装/更新后无自动存档时，也能直接导入备份文件
    $('setupImportSaveBtn')?.addEventListener('click', () => $('setupImportSaveFileInput')?.click());
    $('setupImportSaveFileInput')?.addEventListener('change', function() {
        const file = this.files[0];
        if (file && typeof importSaveFromFile === 'function') importSaveFromFile(file);
        this.value = '';
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

    // 启动初始检测是否需要弹出双页公告
    setTimeout(() => {
        checkAndShowVersionNoticeModal();
    }, 600);
});

// ============================================================
// 📢 双页滑动公告系统（主公告 + 更新优化与新功能）
// ============================================================
function checkAndShowVersionNoticeModal(forceOpen = false) {
    const ver = window.CURRENT_APP_VERSION || '6.1.0';
    const dismissedVersion = localStorage.getItem('mcyt_dismissed_notice_ver');

    // 如果未被静音或属于版本更新后的全新启动或被强制打开
    if (forceOpen || dismissedVersion !== ver) {
        openVersionNoticeModal(ver);
    }
}

function openVersionNoticeModal(version) {
    const html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <h3 style="margin:0;display:flex;align-items:center;gap:6px;">📢 系统公告 <span style="font-size:11px;background:rgba(46,125,50,0.12);color:var(--primary);padding:2px 8px;border-radius:10px;font-weight:700;">v${version}</span></h3>
    </div>

    <!-- 双页滑动视口容器 -->
    <div class="notice-slider-wrap">
        <div class="notice-slider-track" id="noticeSliderTrack">
            <!-- 第 1 页：主公告 -->
            <div class="notice-slide-page">
                <div class="notice-card-box">
                    <h4>📜 关于本项目与正版声明</h4>
                    <p style="margin-bottom:8px;">
                        本软件为抖音：<b>@鸢尾黎明</b> 老师的 mcyt 模拟器二改，为代入向乙女 Airp 游戏。
                    </p>
                    <p style="margin-bottom:8px;color:#c62828;font-weight:600;">
                        ⚠️ 禁止二传，本游戏纯免无收费！
                    </p>
                    <p style="margin-bottom:8px;">
                        目前获取渠道为进鸢尾黎明老师的群聊。如果你需要付费获得了本软件代表<b>你被骗了</b>！
                    </p>
                    <p style="margin-bottom:4px;">
                        前往抖音搜索 <b>@鸢尾黎明</b> 老师那边即可进群获得本软件，群里有很多乙女香香饭，欢迎加入！💕
                    </p>
                </div>
            </div>

            <!-- 第 2 页：更新优化与新功能 -->
            <div class="notice-slide-page">
                <div class="notice-card-box">
                    <h4>🚀 本次更新优化方面</h4>
                    <ul style="padding-left:18px;margin-bottom:10px;font-size:13px;color:#444;line-height:1.6;">
                        <li style="margin-bottom:8px;">1. 优化记忆总结功能，可以自动总结内容，并且设置多少轮一总结，不同角色的记忆会分开放置。</li>
                        <li style="margin-bottom:8px;">2. 合作选项合并入聊天功能，可发送给联系人合作邀请，在油管发共创视频。</li>
                        <li>3. 🆕 新增「📤 备份 / 📥 恢复」存档导出导入功能（顶部与开局页均有入口）：更新App前先点「📤 备份」把存档导出成文件保存好，更新后如遇自建角色/群聊/API配置丢失，用「📥 恢复」导入该文件即可完整找回。</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <!-- 翻页圆点指示器 -->
    <div class="notice-dots-wrap">
        <div class="notice-dot active" id="noticeDot0"></div>
        <div class="notice-dot" id="noticeDot1"></div>
    </div>

    <!-- 底部翻页按键与静音选项 -->
    <div class="notice-footer-opt">
        <label class="notice-checkbox-label">
            <input type="checkbox" id="dismissVersionNoticeCheck" style="accent-color:var(--primary);width:15px;height:15px;">
            <span>本次版本不再提示</span>
        </label>
        <div style="display:flex;gap:6px;">
            <button class="btn-secondary small" id="noticeNavSlideBtn" style="padding:5px 12px;font-weight:700;">下一页：更新公告 ➡️</button>
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
            navBtn.textContent = currentPage === 0 ? '下一页：更新公告 ➡️' : '⬅️ 返回主公告';
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

// 弹出修改玩家头像与名字弹窗，并更新长期记忆
function openEditPlayerProfileModal() {
    const currentName = G.player.ytName || '主播';
    const currentAvatar = G.player.avatar || '';

    openModal(`
        <h3>🧑 编辑个人资料</h3>
        <p style="font-size:12px;color:#666;">修改频道名称与个人头像，更名信息将自动归纳进剧情记忆中。</p>
        <div class="form-group">
            <label>YouTube 频道账号名</label>
            <input type="text" id="editPlayerNameInput" value="${escapeHtml(currentName)}" placeholder="输入新的频道名...">
        </div>
        <div class="form-group">
            <label>更换头像</label>
            <div class="avatar-upload-wrap">
                <div class="avatar-preview" id="editAvatarPreview" style="width:56px;height:56px;border-radius:50%;overflow:hidden;border:2px solid var(--primary);display:flex;align-items:center;justify-content:center;background:#dce8dc;font-size:24px;">
                    ${currentAvatar ? `<img src="${currentAvatar}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
                </div>
                <button class="upload-btn" id="editUploadAvatarBtn">从相册选择</button>
                <input type="file" id="editAvatarFileInput" accept="image/png,image/jpeg" class="file-input" style="display:none;">
            </div>
        </div>
        <div class="btn-row" style="margin-top:14px;">
            <button class="btn-secondary" onclick="closeModal()">取消</button>
            <button class="btn-primary" id="savePlayerProfileBtn">💾 保存更改</button>
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
                document.getElementById('editAvatarPreview').innerHTML = `<img src="${newAvatarData}" style="width:100%;height:100%;object-fit:cover;">`;
                showToast('✅ 头像已选择', 'success', 1200);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('savePlayerProfileBtn')?.addEventListener('click', () => {
        const newName = document.getElementById('editPlayerNameInput')?.value.trim();
        if (!newName) { showToast('⚠️ 名字不能为空', 'error'); return; }

        const oldName = G.player.ytName;
        const nameChanged = oldName !== newName;

        G.player.ytName = newName;
        G.player.avatar = newAvatarData;

        if (nameChanged) {
            if (!G.memorySummaries) G.memorySummaries = [];
            const memoText = `【更名记录】：第 ${G.day} 天，主角将频道名称由「${oldName}」正式更改为「${newName}」。所有NPC、粉丝与AI剧情中，「${oldName}」与「${newName}」均为同一人，人际关系与历史成就完全继承。`;
            G.memorySummaries.push(memoText);
            addMemoir('更名启事', `频道名由「${oldName}」更改为「${newName}」`);
            appendStory(`📢 你的频道正式更名为「${newName}」，粉丝与好友们都在为你庆祝新起点！`, '📢 频道更名');
        }

        updateUI();
        renderAllPanels();
        closeModal();
        showToast('✅ 资料修改成功！', 'success');
        autoSaveGame();
    });
}

function updateWebSearchToggleUI() {
    const btn = $('webSearchToggleBtn');
    if (!btn) return;
    btn.classList.toggle('gold', !!G.search.enabled);
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
    const searchCheckboxHtml = G.search.apiKey ? `
    <div class="form-group" style="display:flex;align-items:center;gap:8px;margin-top:2px;">
        <label style="font-size:13px;margin-bottom:0;display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" id="modalUseSearch" ${G.search.enabled ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);">
            🌐 本次联网搜索相关资料
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
window.renderSocialPanel = renderSocialPanel;
window.openChat = openChat;
window.closeChat = closeChat;
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