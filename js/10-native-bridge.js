// ==========================================
// 10-native-bridge.js
// 真实环境能力探测与标准协议桥接
// ==========================================
(function () {
  'use strict';

  // 深度扫描可能存在的宿主原生注入对象
  function detectHost() {
    var names = ['Android', 'toAPP', 'toapp', 'ToApp', 'android', 'bridge', 'JSBridge'];
    for (var i = 0; i < names.length; i++) {
      try {
        if (window[names[i]] && typeof window[names[i]] === 'object') {
          return window[names[i]];
        }
      } catch (e) {}
    }
    return null;
  }

  var host = detectHost();

  window.NativeBridge = {
    host: host,

    // 是否存在真正的原生注入接口
    isNativeInjected: function () {
      return !!host;
    },

    // 复制纯文本到系统剪贴板（双重降级保障）
    copyText: function (text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).catch(function () {
          return fallbackCopy(text);
        });
      }
      return Promise.resolve(fallbackCopy(text));
    }
  };

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }
})();