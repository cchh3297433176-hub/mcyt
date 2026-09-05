// ============================================================
// 原生能力桥接层（Native Bridge）v1.0
// 专为 toAPP / FusionApp / 各类 Android WebView 壳工程设计
// 作用：让网页能真正调用手机的「下载到文件」「系统分享」「选择文件」等原生能力
// 多层降级：原生JS接口 → Web Share API → Blob下载 → dataURL → 文本展示
// ============================================================
(function () {
    'use strict';

    // ---------- 环境检测 ----------
    const UA = navigator.userAgent || '';
    const isAndroid = /Android/i.test(UA);
    const isWebView = /; wv\)/i.test(UA) || /WebView/i.test(UA) ||
        (window.location.protocol === 'file:') ||
        (typeof window.webkit !== 'undefined' && window.webkit.messageHandlers);

    // toAPP / FusionApp 等壳工程常见的 JS 接口名（广泛探测）
    const BRIDGE_CANDIDATES = [
        'android', 'Android', 'bridge', 'Bridge', 'app', 'App',
        'native', 'Native', 'toAPP', 'toapp', 'ToApp',
        'webview', 'WebView', 'jsInterface', 'JSInterface',
        'nativeBridge', 'NativeBridge', 'mcytBridge',
        'webkit' // iOS WKWebView
    ];

    // 常见的原生方法名映射（接口对象.方法名）
    const METHOD_PATTERNS = {
        download: ['downloadFile', 'download', 'saveFile', 'save', 'writeFile', 'exportFile', 'saveToFile', 'downloadToFile'],
        share: ['shareFile', 'share', 'shareText', 'sendFile', 'send', 'openShare', 'systemShare'],
        pickFile: ['pickFile', 'chooseFile', 'selectFile', 'openFile', 'openFileChooser', 'getFile', 'choose', 'browseFile']
    };

    // 找到的原生接口对象和方法
    let detected = {
        bridgeObj: null,
        bridgeName: '',
        downloadMethod: '',
        shareMethod: '',
        pickFileMethod: '',
        isIOS: false
    };

    function _detectBridge() {
        // iOS WKWebView 特殊处理
        if (window.webkit && window.webkit.messageHandlers) {
            detected.bridgeObj = window.webkit.messageHandlers;
            detected.bridgeName = 'webkit.messageHandlers';
            detected.isIOS = true;
            // iOS 通过 postMessage 调用，方法名作为 message body
            return;
        }
        for (const name of BRIDGE_CANDIDATES) {
            const obj = window[name];
            if (obj && typeof obj === 'object') {
                detected.bridgeObj = obj;
                detected.bridgeName = name;
                // 探测方法
                for (const [type, methodNames] of Object.entries(METHOD_PATTERNS)) {
                    for (const m of methodNames) {
                        if (typeof obj[m] === 'function') {
                            if (type === 'download') detected.downloadMethod = m;
                            else if (type === 'share') detected.shareMethod = m;
                            else if (type === 'pickFile') detected.pickFileMethod = m;
                            break;
                        }
                    }
                }
                return;
            }
        }
    }
    _detectBridge();

    // ---------- 工具函数 ----------
    function _toBase64(str) {
        try {
            // 处理中文等非 ASCII 字符
            const bytes = new TextEncoder().encode(str);
            let binary = '';
            const chunk = 0x8000;
            for (let i = 0; i < bytes.length; i += chunk) {
                binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
            }
            return btoa(binary);
        } catch (e) {
            return btoa(unescape(encodeURIComponent(str)));
        }
    }

    function _base64ToBlob(base64, mimeType) {
        const byteChars = atob(base64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
        }
        return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
    }

    function _safeFileName(name) {
        return (name || 'mcyt_backup').replace(/[\\/:*?"<>|\s]/g, '_');
    }

    // ---------- 核心：下载文件到手机 ----------
    /**
     * 把文本内容下载为手机文件
     * @param {string} filename - 文件名（含扩展名）
     * @param {string} content - 文件文本内容
     * @param {string} mimeType - MIME 类型，默认 application/json
     * @returns {Promise<{success:boolean, method:string, message?:string}>}
     */
    async function downloadFile(filename, content, mimeType) {
        filename = _safeFileName(filename);
        mimeType = mimeType || 'application/json';
        const base64 = _toBase64(content);

        // 第1层：原生 JS 接口（toAPP 等壳工程）
        if (detected.bridgeObj && detected.downloadMethod) {
            try {
                const fn = detected.bridgeObj[detected.downloadMethod];
                // 尝试多种参数格式
                const result = fn.call(detected.bridgeObj, filename, content, mimeType) ||
                    fn.call(detected.bridgeObj, filename, base64, mimeType) ||
                    fn.call(detected.bridgeObj, content, filename) ||
                    fn.call(detected.bridgeObj, base64, filename);
                return { success: true, method: 'native:' + detected.bridgeName + '.' + detected.downloadMethod };
            } catch (e) {
                console.warn('原生下载接口调用失败，尝试下一层', e);
            }
        }

        // iOS WKWebView：通过 postMessage
        if (detected.isIOS && detected.bridgeObj) {
            try {
                const handler = detected.bridgeObj.downloadFile || detected.bridgeObj.saveFile || detected.bridgeObj.nativeBridge;
                if (handler && handler.postMessage) {
                    handler.postMessage({ filename: filename, content: content, base64: base64, mimeType: mimeType });
                    return { success: true, method: 'ios-postMessage' };
                }
            } catch (e) { console.warn('iOS postMessage 失败', e); }
        }

        // 第2层：Blob + a.download（标准浏览器）
        try {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            return { success: true, method: 'blob-download' };
        } catch (e) {
            console.warn('Blob 下载失败，尝试 dataURL', e);
        }

        // 第3层：data URL 新窗口（部分 WebView 会触发下载）
        try {
            const dataUrl = 'data:' + mimeType + ';base64,' + base64;
            window.open(dataUrl, '_blank');
            return { success: true, method: 'dataurl-window' };
        } catch (e) {
            console.warn('dataURL 失败', e);
        }

        // 第4层（终极降级）：弹出文本框让用户手动复制保存
        return { success: false, method: 'none', message: '当前环境不支持自动下载，请使用复制文本方式保存' };
    }

    // ---------- 核心：系统分享 ----------
    /**
     * 调用系统分享面板分享文件或文本
     * @param {string} filename - 文件名
     * @param {string} content - 内容
     * @param {string} mimeType - MIME
     * @param {string} title - 分享标题
     * @returns {Promise<{success:boolean, method:string}>}
     */
    async function shareFile(filename, content, mimeType, title) {
        filename = _safeFileName(filename);
        mimeType = mimeType || 'application/json';
        title = title || 'MC模拟器存档备份';

        // 第1层：原生 JS 接口
        if (detected.bridgeObj && detected.shareMethod) {
            try {
                const fn = detected.bridgeObj[detected.shareMethod];
                fn.call(detected.bridgeObj, content, filename, mimeType, title);
                return { success: true, method: 'native-share:' + detected.bridgeName + '.' + detected.shareMethod };
            } catch (e) { console.warn('原生分享失败', e); }
        }

        // iOS postMessage
        if (detected.isIOS && detected.bridgeObj) {
            try {
                const handler = detected.bridgeObj.shareFile || detected.bridgeObj.share || detected.bridgeObj.nativeBridge;
                if (handler && handler.postMessage) {
                    handler.postMessage({ filename, content, mimeType, title, action: 'share' });
                    return { success: true, method: 'ios-share' };
                }
            } catch (e) { console.warn('iOS 分享失败', e); }
        }

        // 第2层：Web Share API（支持文件）
        if (navigator.share && typeof File !== 'undefined') {
            try {
                if (navigator.canShare) {
                    const file = new File([content], filename, { type: mimeType });
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: title });
                        return { success: true, method: 'webshare-file' };
                    }
                }
            } catch (e) {
                if (e && e.name !== 'AbortError') console.warn('Web Share 文件失败', e);
            }
        }

        // 第3层：Web Share API（纯文本）
        if (navigator.share) {
            try {
                await navigator.share({ title: title, text: content });
                return { success: true, method: 'webshare-text' };
            } catch (e) {
                if (e && e.name !== 'AbortError') console.warn('Web Share 文本失败', e);
            }
        }

        // 第4层：先下载再让用户手动分享
        const dlResult = await downloadFile(filename, content, mimeType);
        if (dlResult.success) {
            return { success: true, method: 'download-then-share:' + dlResult.method };
        }

        return { success: false, method: 'none', message: '当前环境不支持分享，请使用复制文本方式' };
    }

    /**
     * 分享纯文本（比 shareFile 更轻量）
     */
    async function shareText(text, title) {
        title = title || '分享';
        // 原生接口
        if (detected.bridgeObj && detected.shareMethod) {
            try {
                const fn = detected.bridgeObj[detected.shareMethod];
                fn.call(detected.bridgeObj, text, title);
                return { success: true, method: 'native-share-text' };
            } catch (e) { }
        }
        // Web Share
        if (navigator.share) {
            try {
                await navigator.share({ title: title, text: text });
                return { success: true, method: 'webshare-text' };
            } catch (e) {
                if (e && e.name !== 'AbortError') { /* ignore */ }
            }
        }
        // 降级：复制到剪贴板
        try {
            await copyText(text);
            return { success: true, method: 'clipboard-fallback' };
        } catch (e) {
            return { success: false, method: 'none' };
        }
    }

    // ---------- 核心：选择文件 ----------
    /**
     * 打开系统文件选择器
     * @param {string} accept - 接受的文件类型，如 ".json,application/json"
     * @param {function(File)} callback - 选择后的回调
     */
    function pickFile(accept, callback) {
        accept = accept || '*/*';

        // 第1层：原生 JS 接口
        if (detected.bridgeObj && detected.pickFileMethod) {
            try {
                const fn = detected.bridgeObj[detected.pickFileMethod];
                // 原生接口可能直接返回文件路径或内容
                const result = fn.call(detected.bridgeObj, accept);
                if (result && typeof result === 'string') {
                    // 返回了文件路径或内容，构造 File 对象
                    if (result.length > 1000) {
                        // 可能是文件内容
                        const blob = new Blob([result], { type: 'application/json' });
                        callback(new File([blob], 'import.json', { type: 'application/json' }));
                        return;
                    }
                }
                // 如果原生接口是异步回调模式，注册全局回调
                window.__mcytFilePickCallback = function (filePathOrContent) {
                    if (filePathOrContent && typeof filePathOrContent === 'string' && filePathOrContent.length > 100) {
                        const blob = new Blob([filePathOrContent], { type: 'application/json' });
                        callback(new File([blob], 'import.json', { type: 'application/json' }));
                    }
                };
                return;
            } catch (e) { console.warn('原生文件选择失败', e); }
        }

        // 第2层：标准 input type=file
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;
            input.style.display = 'none';
            input.onchange = function (e) {
                const file = e.target.files && e.target.files[0];
                if (file) callback(file);
                document.body.removeChild(input);
            };
            document.body.appendChild(input);
            input.click();
        } catch (e) {
            console.error('文件选择失败', e);
            if (typeof callback === 'function') callback(null);
        }
    }

    // ---------- 剪贴板 ----------
    function copyText(text) {
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
                ok ? resolve() : reject(new Error('copy failed'));
            } catch (e) { reject(e); }
        });
    }

    // ---------- 环境信息 ----------
    function getEnvInfo() {
        return {
            isAndroid: isAndroid,
            isWebView: isWebView,
            isIOS: detected.isIOS,
            bridgeDetected: !!detected.bridgeObj,
            bridgeName: detected.bridgeName || '(none)',
            hasNativeDownload: !!detected.downloadMethod,
            hasNativeShare: !!detected.shareMethod,
            hasNativePickFile: !!detected.pickFileMethod,
            hasWebShare: !!navigator.share,
            hasWebShareFiles: !!(navigator.canShare && typeof File !== 'undefined'),
            userAgent: UA
        };
    }

    function hasNativeCapability() {
        return !!(detected.bridgeObj && (detected.downloadMethod || detected.shareMethod || detected.pickFileMethod));
    }

    // ---------- 手动注册自定义桥接（给 toAPP 用户用） ----------
    /**
     * 如果 toAPP 里配置了自定义 JS 接口名，可以调用这个函数注册
     * 例如：NativeBridge.registerCustomBridge(window.myApp, 'saveFile', 'share', 'pickFile')
     */
    function registerCustomBridge(bridgeObj, downloadMethod, shareMethod, pickFileMethod) {
        if (!bridgeObj || typeof bridgeObj !== 'object') return false;
        detected.bridgeObj = bridgeObj;
        detected.bridgeName = 'custom';
        if (downloadMethod && typeof bridgeObj[downloadMethod] === 'function') {
            detected.downloadMethod = downloadMethod;
        }
        if (shareMethod && typeof bridgeObj[shareMethod] === 'function') {
            detected.shareMethod = shareMethod;
        }
        if (pickFileMethod && typeof bridgeObj[pickFileMethod] === 'function') {
            detected.pickFileMethod = pickFileMethod;
        }
        return true;
    }

    // ---------- 导出到全局 ----------
    window.NativeBridge = {
        downloadFile: downloadFile,
        shareFile: shareFile,
        shareText: shareText,
        pickFile: pickFile,
        copyText: copyText,
        getEnvInfo: getEnvInfo,
        hasNativeCapability: hasNativeCapability,
        registerCustomBridge: registerCustomBridge,
        _detected: detected // 调试用
    };

    console.log('[NativeBridge] 环境检测完成:', JSON.stringify(getEnvInfo()));
})();
