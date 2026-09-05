// ==========================================
// 10-native-bridge.js
// 真实环境能力探测与标准系统分享桥接
// ==========================================
(function () {
  'use strict';

  // 1. 深度安全扫描 ToApp / 壳工程可能注入的接口
  function scanHostInterface() {
    var possibleNames = ['toapp', 'ToApp', 'Android', 'android', 'bridge', 'JSBridge', 'nativeApp'];
    for (var i = 0; i < possibleNames.length; i++) {
      var name = possibleNames[i];
      try {
        if (window[name] && typeof window[name] === 'object') {
          console.log('[NativeBridge] 探测到宿主注入对象:', name);
          return window[name];
        }
      } catch (e) {}
    }
    return null;
  }

  var host = scanHostInterface();

  window.NativeBridge = {
    host: host,

    // 是否存在可调用的原生文件保存接口
    hasNativeSave: function () {
      if (!host) return false;
      return typeof host.saveFile === 'function' ||
             typeof host.downloadFile === 'function' ||
             typeof host.saveImage === 'function';
    },

    // 尝试调用宿主原生保存
    saveViaNative: function (filename, dataUrlOrContent) {
      if (!this.hasNativeSave()) return false;
      try {
        if (typeof host.saveImage === 'function' && dataUrlOrContent.indexOf('data:image') === 0) {
          host.saveImage(dataUrlOrContent);
          return true;
        }
        if (typeof host.saveFile === 'function') {
          host.saveFile(filename, dataUrlOrContent);
          return true;
        }
        if (typeof host.downloadFile === 'function') {
          host.downloadFile(filename, dataUrlOrContent);
          return true;
        }
      } catch (e) {
        console.warn('[NativeBridge] 宿主保存调用失败:', e);
      }
      return false;
    },

    // 标准 Web Share API（将 base64 转为真正的 File 对象调用系统底层 ACTION_SEND）
    shareDataUrlFile: function (dataUrl, filename) {
      return new Promise(function (resolve, reject) {
        if (!navigator.share) {
          return reject(new Error('当前 WebView 内核不支持 Web Share'));
        }

        try {
          var arr = dataUrl.split(',');
          var mime = arr[0].match(/:(.*?);/)[1];
          var bstr = atob(arr[1]);
          var n = bstr.length;
          var u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          var file = new File([u8arr], filename, { type: mime });

          if (navigator.canShare && !navigator.canShare({ files: [file] })) {
            return reject(new Error('系统拒绝分享此类型文件'));
          }

          navigator.share({
            files: [file],
            title: 'MC模拟器备份图'
          }).then(function () {
            resolve(true);
          }).catch(function (err) {
            reject(err);
          });
        } catch (e) {
          reject(e);
        }
      });
    }
  };
})();