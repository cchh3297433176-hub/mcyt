// ==========================================
// 10-native-bridge.js
// 安全的原生能力桥接层 (无反射死锁、安全防崩溃版)
// ==========================================
(function () {
  'use strict';

  // 1. 安全探测原生环境，绝不暴力遍历全局对象
  function checkNativeCapabilities() {
    var caps = {
      hasNativeDownload: false,
      hasNativeShare: false,
      hasNativePick: false,
      rawInterface: null
    };

    try {
      // 安全探测常见壳容器接口（toAPP / 常见 WebView 注入对象）
      var candidate = window.Android || window.toAPP || window.android || window.bridge || null;
      if (candidate && typeof candidate === 'object') {
        caps.rawInterface = candidate;
        if (typeof candidate.downloadFile === 'function' || typeof candidate.saveFile === 'function') {
          caps.hasNativeDownload = true;
        }
        if (typeof candidate.share === 'function' || typeof candidate.shareFile === 'function') {
          caps.hasNativeShare = true;
        }
        if (typeof candidate.openFileManager === 'function' || typeof candidate.pickFile === 'function') {
          caps.hasNativePick = true;
        }
      }
    } catch (e) {
      console.warn('[NativeBridge] 探测接口受限，平滑降级为 Web 策略:', e);
    }

    return caps;
  }

  var capabilities = checkNativeCapabilities();

  window.NativeBridge = {
    caps: capabilities,

    // 统一导出文件：五层安全降级
    downloadFile: function (filename, content, mimeType) {
      mimeType = mimeType || 'application/json';

      // 阶段 1：尝试原生容器注入的方法
      try {
        var iface = capabilities.rawInterface;
        if (iface) {
          if (typeof iface.downloadFile === 'function') {
            iface.downloadFile(filename, content);
            return Promise.resolve({ success: true, method: 'native' });
          }
          if (typeof iface.saveFile === 'function') {
            iface.saveFile(filename, content);
            return Promise.resolve({ success: true, method: 'native' });
          }
        }
      } catch (err) {
        console.warn('[NativeBridge] 原生下载调用失败，进入降级模式', err);
      }

      // 阶段 2：尝试 Web Share API（部分高版本 WebView 具备）
      if (navigator.canShare && navigator.share) {
        try {
          var file = new File([content], filename, { type: mimeType });
          if (navigator.canShare({ files: [file] })) {
            return navigator.share({
              files: [file],
              title: filename
            }).then(function () {
              return { success: true, method: 'web-share' };
            }).catch(function (e) {
              console.warn('[NativeBridge] WebShare 取消或失败', e);
              return fallbackBlobDownload(filename, content, mimeType);
            });
          }
        } catch (e) {
          // 降级到标准 Blob 下载
        }
      }

      // 阶段 3：标准网页端 Blob 模拟触发
      return Promise.resolve(fallbackBlobDownload(filename, content, mimeType));
    },

    // 复制文本到剪贴板
    copyText: function (text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(function () {
          return true;
        }).catch(function () {
          return fallbackCopy(text);
        });
      }
      return Promise.resolve(fallbackCopy(text));
    }
  };

  function fallbackBlobDownload(filename, content, mimeType) {
    try {
      var blob = new Blob([content], { type: mimeType });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
      return { success: true, method: 'blob' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function fallbackCopy(text) {
    try {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      var successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    } catch (e) {
      return false;
    }
  }
})();