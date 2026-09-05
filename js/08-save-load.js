// 存档/读档/初始化模块（v6.2.0 增强防丢与平滑迁移版）
// ============================================================
const CURRENT_APP_VERSION = '6.4.0'; // 递增版本号，确保更新后 100% 弹出全新更新公告

let _gameInitialized = false;
let _skipStartChoiceOnce = false;

function initGame() {
    _gameInitialized = true;
    G.phase = 'playing';

    // 表单数据绑定回填
    G.player.ytName = $('ytNameInput')?.value.trim() || 'MC_CraftMaster';
    G.player.age = parseInt($('ageInput')?.value) || 18;
    G.player.persona = $('personaInput')?.value.trim() || '';
    G.player.skin = $('skinInput')?.value.trim() || '';
    G.player.category = $('categorySelect')?.value || '剧情';

    const idVal = document.querySelector('input[name="identity"]:checked')?.value || 'new';
    G.player.identity = idVal;
    if (idVal === 'fans') {
        G.player.followers = Math.max(G.player.followers || 0, 5000);
        G.player.money = Math.max(G.player.money || 0, 200);
    } else if (idVal === 'veteran') {
        G.player.followers = Math.max(G.player.followers || 0, 50000);
        G.player.money = Math.max(G.player.money || 0, 1000);
    } else {
        if (!G.player.followers) G.player.followers = 0;
        if (!G.player.money) G.player.money = 50;
    }

    // 技能初值
    ['Building', 'Redstone', 'Pvp', 'Survival', 'Hunting'].forEach(k => {
        const val = parseInt($('skill' + k)?.value) || 20;
        G.player.skills[k.toLowerCase()] = val;
    });

    // 视图平滑流转：隐藏开局页，展示游戏主界面
    const setup = $('setupPage');
    const game = $('gamePage');
    if (setup) {
        setup.classList.remove('active');
        setup.style.display = 'none';
    }
    if (game) {
        game.classList.add('active');
        game.style.display = 'flex';
    }

    updateUI();
    if (!G.storyHistory || G.storyHistory.length === 0) {
        appendInitialWelcomeStory();
    }
    switchTab('story');
    autoSaveGame();

    // 唤起版本更新公告弹窗
    setTimeout(() => {
        if (typeof checkAndShowVersionNoticeModal === 'function') {
            checkAndShowVersionNoticeModal();
        }
    }, 400);
}

function appendInitialWelcomeStory() {
    const p = G.player;
    const text = `🎮 欢迎，${p.ytName}！\n\n` +
        `你是一位新晋 MC 主播，擅长 ${p.category} 赛道。\n` +
        `你的皮上形象是：${p.persona}，皮肤是：${p.skin}。\n\n` +
        `今天是你在 MC 油管世界的第 1 天，你是一名学生，正值暑假。\n` +
        `你有 6 个行动点（每2点推进一个时段），规划你的主播生涯吧！\n\n` +
        `💡 点击左侧功能图标开启日常活动，或进入聊天/同人/油管体验丰富互动！`;
    appendStory(text, '🎮 游戏开始');
}

// 自动存档与槽位读写
function autoSaveGame() {
    if (G.phase !== 'playing') return;
    try {
        const payload = serializeGameState();
        localStorage.setItem('mcyt_autosave', JSON.stringify({
            timestamp: new Date().toLocaleString(),
            day: G.day,
            version: CURRENT_APP_VERSION,
            data: payload
        }));
    } catch(e) {
        console.warn('自动存档写入失败', e);
        // 🛡️ 不再静默失败：浏览器存储写满(QuotaExceededError)等情况必须让玩家立刻知道，
        // 否则玩家会在下次打开/更新App时才发现自建角色、群聊全部丢失，且已无法挽回。
        const isQuota = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
        showToast(
            isQuota
                ? '⚠️ 本地存储空间已满，自动保存失败！请立刻点「📤 备份」导出存档到文件，避免数据丢失'
                : '⚠️ 自动保存失败，建议立刻点「📤 备份」导出存档到文件',
            'error',
            5000
        );
    }
}

// 📤 打开备份弹窗：优先提供"复制文本"方式，因为部分安卓 WebView 壳工程的
// 原生下载拦截器只支持 http/https 链接，无法处理网页生成的 blob 文件下载，
// 点击会报"Download failed: Can only download HTTP/HTTPS URIs"。
// 复制文本粘贴保存不依赖系统下载功能，在任何壳工程里都能用。
function openBackupModal() {
    let payload, day, ytName;
    if (G.phase === 'playing') {
        payload = serializeGameState();
        day = G.day;
        ytName = G.player?.ytName;
    } else {
        const info = getAutoSaveInfo();
        if (!info || !info.data) {
            showToast('⚠️ 未找到可导出的存档', 'error');
            return;
        }
        payload = info.data;
        day = info.day;
        ytName = info.data.player?.ytName;
    }
    const exportPayload = {
        timestamp: new Date().toLocaleString(),
        day: day,
        version: CURRENT_APP_VERSION,
        data: payload
    };
    const jsonStr = JSON.stringify(exportPayload);
    const safeName = (ytName || 'MC模拟器存档').replace(/[\\/:*?"<>|]/g, '');
    const fileName = `${safeName}_第${day || 1}天_备份.json`;

    const envTip = (window.NativeBridge && window.NativeBridge.hasNativeCapability())
        ? '✅ 已检测到APP原生接口，下载/分享功能可用'
        : (navigator.share ? '📱 当前环境支持系统分享' : '⚠️ 未检测到原生接口，推荐使用「复制备份内容」保存');

    openModal(`
        <h3>📤 存档备份</h3>
        <div style="font-size:11px;padding:6px 10px;border-radius:8px;margin-bottom:10px;background:${window.NativeBridge && window.NativeBridge.hasNativeCapability() ? '#e8f5e9' : '#fff3e0'};color:${window.NativeBridge && window.NativeBridge.hasNativeCapability() ? '#2e7d32' : '#e65100'};">
            ${envTip}
        </div>
        <p style="font-size:12px;color:#666;line-height:1.6;">
            推荐点「📲 分享备份」，直接把文件发送到网盘App（百度网盘/阿里云盘等）、微信文件传输助手等保存。<br>
            也可以点「💾 下载到手机」保存到下载目录，或「复制备份内容」粘贴到备忘录里保存。恢复时打开「📥 恢复」即可。
        </p>
        <div style="text-align:center;margin-bottom:10px;">
            <button class="btn-primary" id="shareBackupBtn" style="width:100%;">📲 分享备份到网盘 / 微信 / 其他App</button>
        </div>
        <textarea id="backupTextArea" readonly style="width:100%;height:100px;font-size:11px;padding:8px;border-radius:8px;border:2px solid rgba(30,60,30,0.1);font-family:monospace;box-sizing:border-box;" onclick="this.select();">${escapeHtml(jsonStr)}</textarea>
        <div class="btn-row" style="margin-top:8px;">
            <button class="btn-secondary" onclick="closeModal()">关闭</button>
            <button class="btn-primary" id="copyBackupBtn">📋 复制备份内容</button>
        </div>
        <div style="margin-top:10px;text-align:center;">
            <button class="btn-secondary small" id="tryDownloadBackupBtn" style="font-size:12px;">💾 下载到手机文件</button>
        </div>
        <div style="margin-top:8px;text-align:center;">
            <button class="btn-secondary small" id="genImageBackupBtn" style="font-size:12px;background:#e3f2fd;color:#1565c0;border-color:#90caf9;">🖼️ 生成图片备份（长按保存到相册）</button>
        </div>
        <div id="imageBackupContainer" style="display:none;margin-top:12px;text-align:center;">
            <div style="font-size:11px;color:#1565c0;margin-bottom:6px;">👇 长按下方图片 → 保存到相册 / 分享到微信</div>
            <img id="backupImage" style="max-width:100%;border:2px solid #90caf9;border-radius:8px;image-rendering:pixelated;" alt="备份图片">
            <div id="imageBackupInfo" style="font-size:10px;color:#666;margin-top:4px;"></div>
        </div>
    `);

    document.getElementById('shareBackupBtn')?.addEventListener('click', () => {
        shareBackupContent(jsonStr, fileName);
    });

    document.getElementById('copyBackupBtn')?.addEventListener('click', () => {
        copyTextToClipboard(jsonStr).then(() => {
            showToast('✅ 已复制！请粘贴到备忘录/文件管理器保存', 'success', 3000);
        }).catch(() => {
            showToast('⚠️ 自动复制失败，请长按上方文本框手动全选复制', 'error', 3000);
        });
    });

    document.getElementById('tryDownloadBackupBtn')?.addEventListener('click', async () => {
        // 优先走原生桥接层下载到手机文件系统
        if (window.NativeBridge) {
            showToast('⏳ 正在保存到手机文件...', 'info', 2000);
            const result = await window.NativeBridge.downloadFile(fileName, jsonStr, 'application/json');
            if (result.success) {
                showToast('✅ 文件已保存到手机下载目录！(' + result.method + ')', 'success', 4000);
                return;
            }
        }
        // 降级：标准 Blob 下载
        try {
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 3000);
            showToast('✅ 已触发浏览器下载', 'success', 3000);
        } catch(e) {
            showToast('❌ 该设备不支持直接下载，请用上方"复制备份内容"或"分享备份"', 'error', 3000);
        }
    });
    // 🖼️ 生成图片备份：把存档编码成 PNG 图片，用户长按保存到相册
    // 这是 toAPP 等不支持文件下载的 WebView 的终极方案——只依赖长按保存图片功能
    document.getElementById('genImageBackupBtn')?.addEventListener('click', () => {
        if (!window.ImageBackup) {
            showToast('⚠️ 图片备份模块未加载', 'error');
            return;
        }
        showToast('⏳ 正在生成备份图片...', 'info', 2000);
        // 异步生成，避免大存档卡住 UI
        setTimeout(() => {
            try {
                const dataUrl = window.ImageBackup.encodeBackupToImage(jsonStr);
                const info = window.ImageBackup.getImageBackupInfo(jsonStr);
                const img = document.getElementById('backupImage');
                const container = document.getElementById('imageBackupContainer');
                const infoEl = document.getElementById('imageBackupInfo');
                if (img) img.src = dataUrl;
                if (container) container.style.display = 'block';
                if (infoEl) {
                    infoEl.textContent = `图片尺寸：${info.imageWidth}×${info.imageHeight}px | 原始数据：${(info.rawSize/1024).toFixed(1)}KB | 压缩后：${(info.compressedSize/1024).toFixed(1)}KB`;
                }
                showToast('✅ 备份图片已生成！请长按图片保存到相册', 'success', 4000);
            } catch (e) {
                console.error('生成备份图片失败', e);
                showToast('❌ 生成备份图片失败：' + e.message, 'error', 4000);
            }
        }, 50);
    });
}

// 📲 调用系统分享面板，把备份直接交给网盘/微信/QQ等App处理
// 优先走 NativeBridge（toAPP 等壳工程的原生接口），不支持则降级到 Web Share API
async function shareBackupContent(jsonStr, fileName) {
    // 第1优先：原生桥接层（toAPP / FusionApp 等 WebView 壳的原生分享接口）
    if (window.NativeBridge) {
        const result = await window.NativeBridge.shareFile(fileName, jsonStr, 'application/json', 'MC模拟器存档备份');
        if (result.success) {
            showToast('✅ 已调起系统分享，请选择网盘/微信等保存', 'success', 3000);
            return;
        }
    }
    // 第2优先：Web Share API（标准浏览器）
    if (navigator.share) {
        try {
            if (navigator.canShare && typeof File !== 'undefined') {
                const file = new File([jsonStr], fileName, { type: 'application/json' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: 'MC模拟器存档备份' });
                    return;
                }
            }
            await navigator.share({ title: 'MC模拟器存档备份', text: jsonStr });
            return;
        } catch(e) {
            if (e && e.name !== 'AbortError') {
                console.warn('Web Share 失败', e);
            }
        }
    }
    // 第3优先：尝试原生下载（下载后用户可在文件管理器里分享）
    if (window.NativeBridge) {
        const dl = await window.NativeBridge.downloadFile(fileName, jsonStr, 'application/json');
        if (dl.success) {
            showToast('✅ 已下载到手机文件！可在文件管理器中找到后分享', 'success', 4000);
            return;
        }
    }
    // 终极降级：提示用复制文本
    showToast('⚠️ 当前环境不支持分享/下载，请用"复制备份内容"粘贴到备忘录保存', 'error', 4000);
}

// 兼容各类 WebView 的剪贴板复制：优先用标准 Clipboard API，失败则退回 execCommand
function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            ok ? resolve() : reject(new Error('execCommand copy failed'));
        } catch(e) { reject(e); }
    });
}

// 📥 打开恢复弹窗：同时提供"选择文件导入"与"粘贴文本导入"两种方式，
// 应对部分 WebView 壳工程不支持网页文件下载、但支持原生文件选择的情况。
function openRestoreModal() {
    openModal(`
        <h3>📥 存档恢复</h3>
        <p style="font-size:12px;color:#666;line-height:1.6;">方式一：如果之前是"分享保存/下载"到了网盘或文件管理器，直接选择文件导入（系统文件选择器里通常能看到网盘来源）：</p>
        <button class="btn-secondary" id="restoreFilePickBtn" style="width:100%;margin-bottom:12px;">📂 选择存档文件导入</button>
        <p style="font-size:12px;color:#666;line-height:1.6;">方式二：如果你之前是"复制文本"备份的，把内容粘贴到下方：</p>
        <textarea id="restoreTextArea" placeholder="粘贴备份文本内容到这里..." style="width:100%;height:80px;font-size:11px;padding:8px;border-radius:8px;border:2px solid rgba(30,60,30,0.1);font-family:monospace;box-sizing:border-box;"></textarea>
        <div class="btn-row" style="margin-top:8px;margin-bottom:12px;">
            <button class="btn-secondary" onclick="closeModal()">关闭</button>
            <button class="btn-primary" id="restoreTextBtn">✅ 粘贴导入</button>
        </div>
        <p style="font-size:12px;color:#1565c0;line-height:1.6;font-weight:600;">方式三（推荐）：如果你之前是"图片备份"保存到相册的，选择图片恢复：</p>
        <div style="display:flex;gap:8px;margin-bottom:8px;">
            <button class="btn-secondary" id="restoreImagePickBtn" style="flex:1;font-size:12px;background:#e3f2fd;color:#1565c0;border-color:#90caf9;">🖼️ 从相册选图片</button>
            <button class="btn-secondary" id="restoreImagePasteBtn" style="flex:1;font-size:12px;background:#e3f2fd;color:#1565c0;border-color:#90caf9;">📋 粘贴图片</button>
        </div>
        <input type="file" id="restoreImageFileInput" accept="image/png,image/jpeg,image/*" class="file-input" style="display:none;">
        <div id="restoreImagePreviewContainer" style="display:none;text-align:center;margin-bottom:8px;">
            <img id="restoreImagePreview" style="max-width:100%;max-height:150px;border:2px solid #90caf9;border-radius:8px;" alt="待恢复图片">
            <div style="font-size:10px;color:#666;margin-top:4px;" id="restoreImageFileName"></div>
        </div>
    `);

    document.getElementById('restoreFilePickBtn')?.addEventListener('click', () => {
        // 优先走原生桥接层的文件选择器（toAPP 等 WebView 壳可能需要原生实现）
        if (window.NativeBridge && window.NativeBridge.hasNativeCapability()) {
            window.NativeBridge.pickFile('.json,application/json', (file) => {
                if (file) {
                    closeModal();
                    importSaveFromFile(file);
                } else {
                    // 原生选择失败，降级到标准 input
                    $('importSaveFileInput')?.click();
                }
            });
        } else {
            // 标准浏览器文件选择
            $('importSaveFileInput')?.click();
        }
    });

    document.getElementById('restoreTextBtn')?.addEventListener('click', () => {
        const text = document.getElementById('restoreTextArea')?.value.trim();
        if (!text) { showToast('⚠️ 请先粘贴备份文本', 'error'); return; }
        closeModal();
        importSaveFromText(text);
    });

    // 🖼️ 从相册选择备份图片
    document.getElementById('restoreImagePickBtn')?.addEventListener('click', () => {
        $('restoreImageFileInput')?.click();
    });

    // 图片文件选择后解码并导入
    document.getElementById('restoreImageFileInput')?.addEventListener('change', function() {
        const file = this.files[0];
        if (!file) return;
        _restoreFromImageFile(file);
        this.value = '';
    });

    // 📋 从剪贴板粘贴图片（用户在相册里复制图片后，到这里粘贴）
    document.getElementById('restoreImagePasteBtn')?.addEventListener('click', async () => {
        if (!window.ImageBackup) {
            showToast('⚠️ 图片备份模块未加载', 'error');
            return;
        }
        showToast('⏳ 正在读取剪贴板图片...', 'info', 2000);
        const dataUrl = await window.ImageBackup.readImageFromClipboard();
        if (dataUrl) {
            // 显示预览
            const preview = document.getElementById('restoreImagePreview');
            const container = document.getElementById('restoreImagePreviewContainer');
            const nameEl = document.getElementById('restoreImageFileName');
            if (preview) preview.src = dataUrl;
            if (container) container.style.display = 'block';
            if (nameEl) nameEl.textContent = '来自剪贴板';
            // 解码导入
            _decodeAndImportImage(dataUrl);
        } else {
            showToast('⚠️ 剪贴板里没有图片，请先在相册里长按图片→复制，再回来点粘贴', 'error', 4000);
        }
    });
}

// 🖼️ 从图片文件恢复存档的共用逻辑
function _restoreFromImageFile(file) {
    if (!window.ImageBackup) {
        showToast('⚠️ 图片备份模块未加载', 'error');
        return;
    }
    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        const preview = document.getElementById('restoreImagePreview');
        const container = document.getElementById('restoreImagePreviewContainer');
        const nameEl = document.getElementById('restoreImageFileName');
        if (preview) preview.src = dataUrl;
        if (container) container.style.display = 'block';
        if (nameEl) nameEl.textContent = file.name;
        // 解码导入
        _decodeAndImportImage(dataUrl);
    };
    reader.onerror = () => showToast('❌ 图片读取失败', 'error');
    reader.readAsDataURL(file);
}

// 🖼️ 解码图片并导入存档
async function _decodeAndImportImage(dataUrl) {
    if (!window.ImageBackup) return;
    showToast('⏳ 正在解码备份图片...', 'info', 2000);
    try {
        const jsonStr = await window.ImageBackup.decodeImageToBackup(dataUrl);
        closeModal();
        // 延迟一下让弹窗关闭动画完成
        setTimeout(() => {
            importSaveFromText(jsonStr);
        }, 200);
    } catch (e) {
        console.error('图片解码失败', e);
        showToast('❌ 图片解码失败：' + e.message + '（请确认是用本游戏生成的备份图片，且保存的是原图不是截图）', 'error', 5000);
    }
}

// 🛡️ 导入落地的共用逻辑：文件导入与文本粘贴导入最终都走这里
function _applyImportedStateData(stateData) {
    if (_gameInitialized && !confirm('导入将与当前游戏进度合并（自建角色/群聊/剧情等以备份为准），确认导入吗？')) {
        return;
    }
    applyDeserializedGameState(stateData);
    _gameInitialized = true;
    G.phase = 'playing';

    const setup = $('setupPage');
    const game = $('gamePage');
    if (setup) {
        setup.classList.remove('active');
        setup.style.display = 'none';
    }
    if (game) {
        game.classList.add('active');
        game.style.display = 'flex';
    }

    updateUI();
    switchTab('story');
    autoSaveGame();
    showToast('✅ 存档导入成功！自建角色与群聊已找回', 'success', 3000);
}

// 📥 从备份文件导入存档：更新/重装 App 后，若发现自建角色/群聊丢失，
// 用之前导出的 .json 文件即可 100% 找回，不依赖本地 localStorage 是否被清空。
function importSaveFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const parsed = JSON.parse(ev.target.result);
            const stateData = (parsed && typeof parsed === 'object' && parsed.data) ? parsed.data : parsed;
            if (!stateData || typeof stateData !== 'object' || (!stateData.player && !stateData.npcs)) {
                showToast('❌ 存档文件格式不正确，无法导入', 'error');
                return;
            }
            _applyImportedStateData(stateData);
        } catch(e) {
            console.error('导入存档失败', e);
            showToast('❌ 导入失败，文件可能已损坏：' + e.message, 'error');
        }
    };
    reader.onerror = () => showToast('❌ 文件读取失败', 'error');
    reader.readAsText(file);
}

// 📥 从粘贴的文本导入存档：不需要任何文件下载/选择权限，兼容性最强
function importSaveFromText(text) {
    try {
        const parsed = JSON.parse(text);
        const stateData = (parsed && typeof parsed === 'object' && parsed.data) ? parsed.data : parsed;
        if (!stateData || typeof stateData !== 'object' || (!stateData.player && !stateData.npcs)) {
            showToast('❌ 备份文本格式不正确，无法导入', 'error');
            return;
        }
        _applyImportedStateData(stateData);
    } catch(e) {
        console.error('导入存档失败', e);
        showToast('❌ 导入失败，文本可能不完整或已损坏：' + e.message, 'error');
    }
}

function getAutoSaveInfo() {
    try {
        const raw = localStorage.getItem('mcyt_autosave');
        return raw ? JSON.parse(raw) : null;
    } catch(e) {
        return null;
    }
}

function hasAnySaveData() {
    if (localStorage.getItem('mcyt_autosave')) return true;
    for (let i = 1; i <= 3; i++) {
        if (localStorage.getItem('mcyt_slot_' + i)) return true;
    }
    return false;
}

function resumeAutoSave() {
    const info = getAutoSaveInfo();
    if (!info || !info.data) {
        showToast('⚠️ 未找到有效自动存档', 'error');
        return;
    }
    applyDeserializedGameState(info.data);
    _gameInitialized = true;
    G.phase = 'playing';

    const setup = $('setupPage');
    const game = $('gamePage');
    if (setup) {
        setup.classList.remove('active');
        setup.style.display = 'none';
    }
    if (game) {
        game.classList.add('active');
        game.style.display = 'flex';
    }

    updateUI();
    switchTab('story');
    showToast('✅ 进度已成功载入！', 'success');

    setTimeout(() => {
        if (typeof checkAndShowVersionNoticeModal === 'function') {
            checkAndShowVersionNoticeModal();
        }
    }, 400);
}

function showStartChoiceModal(skipCheck = false) {
    const autoInfo = getAutoSaveInfo();
    openModal(`
        <h3>🎮 欢迎来到 MC YouTube 模拟器</h3>
        <p style="font-size:13px;color:#666;">检测到你此前拥有保存的进度，请选择进入方式：</p>
        <div class="start-choice-grid">
            <div class="choice-card" id="choiceResumeGame">
                <span class="big-icon">▶️</span>
                <div class="choice-label">继续上次进度</div>
                <div class="choice-desc">${autoInfo ? `第 ${autoInfo.day} 天 · ${autoInfo.data?.player?.ytName || ''}` : '自动存档'}</div>
            </div>
            <div class="choice-card" id="choiceStartNewGame">
                <span class="big-icon">✨</span>
                <div class="choice-label">全新开局</div>
                <div class="choice-desc">重新塑造你的专属主播</div>
            </div>
        </div>
        <div class="btn-row" style="margin-top:10px;">
            <button class="btn-secondary" id="choiceOpenSlotList" style="width:100%;">📂 查看全部存档槽位</button>
        </div>
    `);

    document.getElementById('choiceResumeGame').onclick = () => {
        closeModal();
        resumeAutoSave();
    };

    document.getElementById('choiceStartNewGame').onclick = () => {
        closeModal();
        _skipStartChoiceOnce = true;
        initGame();
    };

    document.getElementById('choiceOpenSlotList').onclick = () => {
        closeModal();
        showSaveSlotsModal('load');
    };
}

function showSaveSlotsModal(mode = 'save') {
    const isSave = mode === 'save';
    let slotsHtml = '';

    for (let i = 1; i <= 3; i++) {
        let slotData = null;
        try {
            const raw = localStorage.getItem('mcyt_slot_' + i);
            if (raw) slotData = JSON.parse(raw);
        } catch(e) {}

        slotsHtml += `
        <div class="save-slot-item" data-slot="${i}">
            <div class="slot-info">
                <div class="slot-label">📁 存档槽位 ${i}</div>
                ${slotData ? `
                    <div class="slot-detail">第 ${slotData.day} 天 · ${escapeHtml(slotData.data?.player?.ytName || '')} · 粉丝 ${slotData.data?.player?.followers || 0}</div>
                    <div style="font-size:10px;color:#888;">保存时间：${slotData.timestamp}</div>
                ` : '<div class="slot-empty">（空存档位）</div>'}
            </div>
            <div style="display:flex;gap:6px;">
                ${isSave ? `
                    <button class="slot-action-btn" onclick="saveGameToSlot(${i})">写入保存</button>
                ` : `
                    <button class="slot-action-btn" ${slotData ? '' : 'disabled'} onclick="loadGameFromSlot(${i})">读取</button>
                `}
                ${slotData ? `<button class="slot-action-btn secondary" onclick="deleteSaveSlot(${i}, '${mode}')" style="padding:4px 8px;color:#c62828;">✕</button>` : ''}
            </div>
        </div>
        `;
    }

    openModal(`
        <h3>${isSave ? '💾 保存游戏存档' : '📂 读取已有存档'}</h3>
        <div style="max-height:60vh;overflow-y:auto;margin:10px 0;">
            ${slotsHtml}
        </div>
        <div class="btn-row">
            <button class="btn-secondary" onclick="closeModal()">关闭</button>
        </div>
    `);
}

function saveGameToSlot(slotIndex) {
    if (G.phase !== 'playing') { showToast('⚠️ 游戏尚未开始', 'error'); return; }
    try {
        const payload = serializeGameState();
        localStorage.setItem('mcyt_slot_' + slotIndex, JSON.stringify({
            timestamp: new Date().toLocaleString(),
            day: G.day,
            version: CURRENT_APP_VERSION,
            data: payload
        }));
        showToast(`✅ 成功保存到槽位 ${slotIndex}！`, 'success');
        closeModal();
    } catch(e) {
        showToast('❌ 保存失败', 'error');
    }
}

function loadGameFromSlot(slotIndex) {
    try {
        const raw = localStorage.getItem('mcyt_slot_' + slotIndex);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        applyDeserializedGameState(parsed.data);
        _gameInitialized = true;
        G.phase = 'playing';

        const setup = $('setupPage');
        const game = $('gamePage');
        if (setup) {
            setup.classList.remove('active');
            setup.style.display = 'none';
        }
        if (game) {
            game.classList.add('active');
            game.style.display = 'flex';
        }

        updateUI();
        switchTab('story');
        closeModal();
        showToast(`✅ 槽位 ${slotIndex} 载入成功！`, 'success');

        setTimeout(() => {
            if (typeof checkAndShowVersionNoticeModal === 'function') {
                checkAndShowVersionNoticeModal();
            }
        }, 400);
    } catch(e) {
        showToast('❌ 读档失败', 'error');
    }
}

function deleteSaveSlot(slotIndex, mode) {
    if (confirm(`确定要清空槽位 ${slotIndex} 吗？`)) {
        localStorage.removeItem('mcyt_slot_' + slotIndex);
        showToast('🗑️ 槽位已清空', 'info');
        showSaveSlotsModal(mode);
    }
}

// 优雅返回主标题界面的函数，杜绝 WebView 刷新 404 与按键失灵
function confirmExitGame() {
    if (confirm('确认保存并退出当前游戏回到初始界面？')) {
        autoSaveGame();
        G.phase = 'setup';
        _gameInitialized = false;

        const setup = $('setupPage');
        const game = $('gamePage');
        if (game) {
            game.classList.remove('active');
            game.style.display = 'none';
        }
        if (setup) {
            setup.classList.add('active');
            setup.style.display = 'block';
        }

        // 重新激活初始界面的断点恢复横幅
        const autoInfo = getAutoSaveInfo();
        const banner = $('resumeBanner');
        if (banner && autoInfo && autoInfo.data) {
            const d = autoInfo.data;
            banner.style.display = 'block';
            banner.innerHTML = `
                <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:6px;">▶️ 检测到未完成的游戏进度</div>
                <div style="font-size:12px;color:#666;margin-bottom:10px;">第 ${d.day} 天 · ${d.player?.ytName || ''} · 粉丝 ${d.player?.followers || 0}</div>
                <button type="button" id="resumeAutoSaveBtn" style="padding:8px 18px;font-size:13px;font-weight:700;border:none;border-radius:10px;background:var(--primary);color:#fff;cursor:pointer;">▶️ 继续上次进度</button>
            `;
            $('resumeAutoSaveBtn')?.addEventListener('click', resumeAutoSave);
        }
        showToast('🚪 已安全保存并返回初始界面', 'info', 2000);
    }
}

function serializeGameState() {
    return {
        player: G.player,
        day: G.day,
        timeSlot: G.timeSlot,
        actionPoints: G.actionPoints,
        maxActionPoints: G.maxActionPoints,
        storyHistory: G.storyHistory,
        memorySummaries: G.memorySummaries,
        memoryConfig: G.memoryConfig,
        npcs: G.npcs,
        chatHistory: G.chatHistory,
        groups: G.groups,
        groupChatHistory: G.groupChatHistory,
        groupMemories: G.groupMemories,
        friendRequests: G.friendRequests,
        feed: G.feed,
        fanworks: G.fanworks,
        ao3User: G.ao3User,
        ytUser: G.ytUser,
        ytExternalVideos: G.ytExternalVideos,
        ytCustomChannels: G.ytCustomChannels,
        collections: G.collections,
        memoir: G.memoir,
        unlockedAchievements: G.unlockedAchievements,
        milestoneReached: G.milestoneReached,
        ai: G.ai,
        search: G.search
    };
}

// 🛡️ 深度平滑合并与防丢保障反序列化
function applyDeserializedGameState(data) {
    if (!data) return;

    // 1. 基础标量数据应用
    if (data.player) G.player = Object.assign({}, G.player, data.player);
    if (data.day !== undefined) G.day = data.day;
    if (data.timeSlot !== undefined) G.timeSlot = data.timeSlot;
    if (data.actionPoints !== undefined) G.actionPoints = data.actionPoints;
    if (data.maxActionPoints !== undefined) G.maxActionPoints = data.maxActionPoints;
    if (Array.isArray(data.storyHistory)) G.storyHistory = data.storyHistory;

    // 2. 核心保护：NPC 字典平滑合并（保留老角色、默认角色与所有自建 NPC）
    if (!G.npcs) G.npcs = {};
    const defaultNpcs = (typeof DEFAULT_NPCS !== 'undefined') ? DEFAULT_NPCS : {};
    G.npcs = Object.assign({}, defaultNpcs, G.npcs, data.npcs || {});

    // 3. 核心保护：聊天记录防清空合并
    if (!G.chatHistory) G.chatHistory = {};
    if (data.chatHistory) {
        for (const [k, v] of Object.entries(data.chatHistory)) {
            if (Array.isArray(v) && v.length) {
                G.chatHistory[k] = v;
            }
        }
    }

    // 4. 群聊与公共记忆保护
    if (!G.groups) G.groups = {};
    if (data.groups) G.groups = Object.assign({}, G.groups, data.groups);

    if (!G.groupChatHistory) G.groupChatHistory = {};
    if (data.groupChatHistory) {
        for (const [k, v] of Object.entries(data.groupChatHistory)) {
            if (Array.isArray(v) && v.length) {
                G.groupChatHistory[k] = v;
            }
        }
    }

    if (!G.groupMemories) G.groupMemories = {};
    if (data.groupMemories) G.groupMemories = Object.assign({}, G.groupMemories, data.groupMemories);

    // 5. 记忆与社交动态保护
    if (Array.isArray(data.memorySummaries)) G.memorySummaries = data.memorySummaries;
    if (data.memoryConfig) G.memoryConfig = Object.assign({}, G.memoryConfig, data.memoryConfig);
    if (Array.isArray(data.friendRequests)) G.friendRequests = data.friendRequests;
    if (Array.isArray(data.feed)) G.feed = data.feed;
    if (Array.isArray(data.fanworks)) G.fanworks = data.fanworks;
    if (data.ao3User) G.ao3User = data.ao3User;
    if (data.ytUser) G.ytUser = data.ytUser;
    if (Array.isArray(data.ytExternalVideos)) G.ytExternalVideos = data.ytExternalVideos;
    if (Array.isArray(data.ytCustomChannels)) G.ytCustomChannels = data.ytCustomChannels;
    if (data.collections) G.collections = data.collections;
    if (Array.isArray(data.memoir)) G.memoir = data.memoir;
    if (Array.isArray(data.unlockedAchievements)) G.unlockedAchievements = data.unlockedAchievements;
    if (data.milestoneReached) G.milestoneReached = data.milestoneReached;
    if (data.ai) G.ai = Object.assign({}, G.ai, data.ai);
    if (data.search) G.search = Object.assign({}, G.search, data.search);
}

// 暴露全局
window.initGame = initGame;
window.resumeAutoSave = resumeAutoSave;
window.showStartChoiceModal = showStartChoiceModal;
window.showSaveSlotsModal = showSaveSlotsModal;
window.saveGameToSlot = saveGameToSlot;
window.loadGameFromSlot = loadGameFromSlot;
window.deleteSaveSlot = deleteSaveSlot;
window.confirmExitGame = confirmExitGame;
window.serializeGameState = serializeGameState;
window.applyDeserializedGameState = applyDeserializedGameState;
window.CURRENT_APP_VERSION = CURRENT_APP_VERSION;
window.openBackupModal = openBackupModal;
window.openRestoreModal = openRestoreModal;
window.shareBackupContent = shareBackupContent;
window.importSaveFromFile = importSaveFromFile;
window.importSaveFromText = importSaveFromText;