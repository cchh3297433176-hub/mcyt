// js/09-events-init.js
// 事件绑定与全新微信简约风三页滑动公告系统（v1.620 完整收录李敏原话与作者心声）
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // 开始游戏按钮
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

    // 顶部 Tab 栏切换（旧单页兼容）
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() { switchTab(this.dataset.tab); });
    });

    // 左侧竖排操作栏按钮统一事件委托（旧单页兼容）
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

    // 左上角头像点击：打开修改主播个人人设弹窗
    const headerAvatarEl = $('headerAvatar');
    if (headerAvatarEl) {
        if (typeof bindLongPressEvent === 'function') {
            bindLongPressEvent(headerAvatarEl, () => {
                openEditPlayerProfileModal();
            }, () => {
                openEditPlayerProfileModal();
            });
        } else {
            headerAvatarEl.addEventListener('click', () => {
                openEditPlayerProfileModal();
            });
        }
    }

    // 顶栏时间时钟胶囊点击：打开时钟与时区设置面板
    $('timeDisplay')?.parentElement?.addEventListener('click', () => {
        if (typeof openClockSettingsModal === 'function') openClockSettingsModal();
    });

    // 联网切换按钮：打开支持 Bing Local / 博查 / 秘塔 / Tavily 的联网搜索中心
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

    // 重说按钮
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

    // 导出与恢复
    $('exportSaveBtn')?.addEventListener('click', () => {
        if (typeof openBackupModal === 'function') openBackupModal();
    });
    $('importSaveBtn')?.addEventListener('click', () => {
        if (typeof openRestoreModal === 'function') openRestoreModal();
    });

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
// 📢 全新三页滑动公告系统（微信极简白灰微绿设计 · 严格保留李敏原话与作者心声）
// ============================================================
function checkAndShowVersionNoticeModal(forceOpen = false) {
    const ver = window.CURRENT_APP_VERSION || '1.620';
    const dismissedVersion = localStorage.getItem('mcyt_dismissed_notice_ver');

    if (forceOpen || dismissedVersion !== ver) {
        openVersionNoticeModal(ver);
    }
}

function openVersionNoticeModal(version) {
    const html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #eeeeee;">
        <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;font-weight:700;color:#222222;letter-spacing:-0.2px;">系统公告</span>
            <span style="font-size:11px;background:#e8f7ee;color:#07c160;padding:2px 8px;border-radius:12px;font-weight:600;">v${version}</span>
        </div>
        <div style="font-size:12px;color:#888888;" id="noticePageIndicator">1 / 3</div>
    </div>

    <!-- 顶层 3 页滑动容器 -->
    <div class="notice-slider-wrap" style="overflow:hidden;position:relative;width:100%;border-radius:8px;">
        <div class="notice-slider-track" id="noticeSliderTrack" style="display:flex;width:300%;transition:transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);">
            
            <!-- 第 1 页：定位与版本累计更新内容 -->
            <div class="notice-slide-page" style="flex:0 0 33.3333%;width:33.3333%;box-sizing:border-box;padding-right:2px;">
                <div class="notice-card-box" style="height:220px;overflow-y:auto;padding:12px;background:#f7f7f7;border-radius:8px;border:1px solid #eeeeee;box-sizing:border-box;font-size:13px;color:#222222;line-height:1.65;">
                    <div style="background:#ffffff;padding:10px 12px;border-radius:6px;border:1px solid #eeeeee;margin-bottom:10px;">
                        <p style="margin:0 0 6px;color:#222222;font-weight:600;">本软件为代入向乙女Airp游戏，禁男禁cp，目前唯一获取渠道为进鸢尾黎明老师的群聊。</p>
                        <p style="margin:0;color:#07c160;font-size:12px;line-height:1.6;">
                            无需付费获取，如果你不是在鸢尾黎明群里获得的，可以前往抖音@鸢尾黎明老师那边即可进QQ群获得本软件，群里有大量老师制作很多乙女香香饭，欢迎加入!
                        </p>
                    </div>

                    <div style="font-weight:700;color:#222222;margin-bottom:6px;font-size:13px;">记录这次版本累计更新内容</div>
                    <div style="color:#444444;font-size:12px;line-height:1.6;margin-bottom:10px;padding-left:4px;">
                        - 单独聊天增添心声功能<br>
                        - 聊天增加tts功能以及使用本地部署tts功能（群文件有软件分享）<br>
                        - 增加打电话功能<br>
                        - 增加识图API功能，可使用智谱的免费识图模型<br>
                        - 恢复ao3功能<br>
                        - 修复若干bug
                    </div>

                    <div style="background:#fffbe6;border:1px solid #ffe58f;padding:7px 10px;border-radius:6px;color:#d46b08;font-size:11.5px;font-weight:600;line-height:1.5;">
                        提醒：记得在记忆功能里边增添硅基流动密匙，不然无法正常使用记忆功能！！！
                    </div>
                </div>
            </div>

            <!-- 第 2 页：致谢名单 -->
            <div class="notice-slide-page" style="flex:0 0 33.3333%;width:33.3333%;box-sizing:border-box;padding:0 2px;">
                <div class="notice-card-box" style="height:220px;overflow-y:auto;padding:12px;background:#f7f7f7;border-radius:8px;border:1px solid #eeeeee;box-sizing:border-box;font-size:12.5px;color:#222222;line-height:1.65;">
                    <div style="font-weight:700;color:#07c160;margin-bottom:8px;font-size:13px;">致谢名单</div>
                    
                    <p style="margin:0 0 6px;"><b>鸢尾黎明老师的模拟器</b> 此模拟器为鸢尾黎明老师的mcyt模拟器二改！</p>
                    <p style="margin:0 0 6px;"><b>感谢热心QQ群友帮我绘制图标！</b></p>
                    <p style="margin:0 0 6px;"><b>感谢善良的群友芝士球分享了她约的萌萌头像框和对话框稿件！</b><br><span style="color:#666666;">真的感谢群友们愿意消耗自己时间绘制图标，乙代妹都是天使嘛……</span></p>
                    <p style="margin:0 0 6px;"><b>感谢Discord『昵称：柏柏』 老师的公益图床！</b></p>
                    <p style="margin:0 0 8px;"><b>感谢github『昵称：sipeter』的开源tts项目CloneTTS，非常好用</b></p>
                    
                    <div style="background:#ffffff;border:1px solid #eeeeee;padding:8px 10px;border-radius:6px;margin-bottom:8px;line-height:1.6;">
                        <div style="font-weight:600;margin-bottom:4px;color:#222222;">感谢Gemini，Claude以及Chatgpt这御三家给我干活</div>
                        <div style="color:#555555;font-size:12px;">
                            - Gemini，虽然老是骂它，但是基本上都是它在勤勤恳恳干活，软件大半都是它的成果<br>
                            - Claude帮助了我很多，耐心教导我，聪明能干还温柔，克之伟大无需多言！<br>
                            - Chatgpt好像帮了忙，但是好像又没帮……<br>
                            起到了一个添乱的作用
                        </div>
                    </div>

                    <p style="margin:0 0 6px;"><b>感谢github以及开源项目创作者</b>，愿意开源的创作者们真的是非常伟大啊……解决了我的燃眉之急！</p>
                    <p style="margin:0;color:#07c160;font-weight:600;">以及感谢群友的鼓励和支持，没有大家的鼓励支持我真的不可能有耐心做那么多！</p>
                </div>
            </div>

            <!-- 第 3 页：借物表感谢与声明 -->
            <div class="notice-slide-page" style="flex:0 0 33.3333%;width:33.3333%;box-sizing:border-box;padding-left:2px;">
                <div class="notice-card-box" style="height:220px;overflow-y:auto;padding:12px;background:#f7f7f7;border-radius:8px;border:1px solid #eeeeee;box-sizing:border-box;font-size:12.5px;color:#222222;line-height:1.65;">
                    <div style="font-weight:700;color:#07c160;margin-bottom:8px;font-size:13px;">借物表感谢</div>
                    
                    <p style="margin:0 0 6px;">感谢小红书『ID：95695020736』<b>与君绝</b> 老师同意我借鉴提示词！非常好的老师！</p>
                    <p style="margin:0 0 6px;">感谢 <b>kelivo</b>，本项目bing部分搜索功能代码参考自开源项目 Kelivo（AGPL-3.0 协议），感谢原作者的贡献。</p>
                    <p style="margin:0 0 6px;">感谢 github『昵称：nutshell319』的<b>塔罗游戏</b>，本项目的塔罗部分改自自开源项目tarot-divination（MIT License 协议）</p>
                    <p style="margin:0 0 8px;">感谢 github『昵称：GiorgioDotcom』的<b>记忆项目</b>，本项目的记忆系统改自开源项目rememori<br>感谢</p>

                    <div style="background:#ffffff;border-left:3px solid #07c160;padding:8px 10px;border-radius:4px;font-size:12px;color:#333333;line-height:1.6;">
                        <b>声明：</b>本人未收取任何费用，目前没在群聊外的地方发布软件，不需要金钱赞助（不过给赞助我key大大滴欢迎，尤其是Claude，还有gemini和chatgpt👏🏻，如果是服务器，那简直是天上掉下来肥美馅饼）
                    </div>
                </div>
            </div>

        </div>
    </div>

    <!-- 三点指示器 -->
    <div class="notice-dots-wrap" style="display:flex;justify-content:center;align-items:center;gap:6px;margin:8px 0;">
        <div class="notice-dot active" id="noticeDot0" style="width:14px;height:6px;border-radius:3px;background:#07c160;cursor:pointer;transition:all 0.2s;"></div>
        <div class="notice-dot" id="noticeDot1" style="width:6px;height:6px;border-radius:50%;background:#dcdcdc;cursor:pointer;transition:all 0.2s;"></div>
        <div class="notice-dot" id="noticeDot2" style="width:6px;height:6px;border-radius:50%;background:#dcdcdc;cursor:pointer;transition:all 0.2s;"></div>
    </div>

    <!-- 最下方常驻：作者碎碎念 -->
    <div style="background:#f7f7f7;border:1px solid #eeeeee;border-radius:8px;padding:10px 12px;margin-bottom:10px;">
        <div style="font-weight:700;font-size:12px;color:#666666;margin-bottom:6px;display:flex;align-items:center;gap:4px;">
            <span>💬 作者碎碎念</span>
        </div>
        <div style="max-height:85px;overflow-y:auto;font-size:12.5px;color:#333333;line-height:1.6;padding-right:2px;font-weight:500;">
            没什么想说的，只想赶快结束休息睡觉
        </div>
    </div>

    <!-- 底部控制栏 -->
    <div class="notice-footer-opt" style="display:flex;justify-content:space-between;align-items:center;padding-top:4px;border-top:1px solid #eeeeee;">
        <label class="notice-checkbox-label" style="display:flex;align-items:center;gap:6px;font-size:12px;color:#777777;cursor:pointer;user-select:none;">
            <input type="checkbox" id="dismissVersionNoticeCheck" style="accent-color:#07c160;width:15px;height:15px;cursor:pointer;">
            <span>本次版本不再提示</span>
        </label>
        <div style="display:flex;gap:8px;">
            <button class="btn-secondary small" id="noticeNavSlideBtn" style="padding:6px 12px;font-size:12px;border-radius:6px;background:#f0f0f0;color:#333333;border:none;cursor:pointer;">下一页：致谢名单</button>
            <button class="btn-primary small" id="noticeCloseBtn" style="margin:0;padding:6px 16px;font-size:12px;border-radius:6px;background:#07c160;color:#ffffff;border:none;cursor:pointer;font-weight:600;">关 闭</button>
        </div>
    </div>
    `;

    openModal(html);

    let currentPage = 0;
    const track = document.getElementById('noticeSliderTrack');
    const dot0 = document.getElementById('noticeDot0');
    const dot1 = document.getElementById('noticeDot1');
    const dot2 = document.getElementById('noticeDot2');
    const navBtn = document.getElementById('noticeNavSlideBtn');
    const indicator = document.getElementById('noticePageIndicator');

    const btnTextMap = [
        '下一页：致谢名单',
        '下一页：借物表与声明',
        '返回第 1 页'
    ];

    const updateSliderUI = (page) => {
        currentPage = page;
        if (track) {
            track.style.transform = `translateX(-${currentPage * (100 / 3)}%)`;
        }
        if (indicator) {
            indicator.textContent = `${currentPage + 1} / 3`;
        }
        if (dot0 && dot1 && dot2) {
            dot0.style.background = currentPage === 0 ? '#07c160' : '#dcdcdc';
            dot1.style.background = currentPage === 1 ? '#07c160' : '#dcdcdc';
            dot2.style.background = currentPage === 2 ? '#07c160' : '#dcdcdc';
            dot0.style.width = currentPage === 0 ? '14px' : '6px';
            dot0.style.borderRadius = '3px';
            dot1.style.width = currentPage === 1 ? '14px' : '6px';
            dot1.style.borderRadius = '3px';
            dot2.style.width = currentPage === 2 ? '14px' : '6px';
            dot2.style.borderRadius = '3px';
        }
        if (navBtn) {
            navBtn.textContent = btnTextMap[currentPage];
        }
    };

    updateSliderUI(0);

    dot0?.addEventListener('click', () => updateSliderUI(0));
    dot1?.addEventListener('click', () => updateSliderUI(1));
    dot2?.addEventListener('click', () => updateSliderUI(2));

    navBtn?.addEventListener('click', () => {
        const next = (currentPage + 1) % 3;
        updateSliderUI(next);
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
