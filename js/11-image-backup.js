// ==========================================
// 11-image-backup.js
// 消除拖拽冲突 + 原生桥接 + 相册解码恢复系统
// ==========================================
(function () {
  'use strict';

  var MAGIC_HEADER = 'MCYTBKP:';

  // 1. 样式表注入：消除图片拖动干扰，开启 WebView 长按呼出菜单
  function ensureStyles() {
    if (document.getElementById('ib-backup-core-styles')) return;
    var style = document.createElement('style');
    style.id = 'ib-backup-core-styles';
    style.innerHTML = '\n' +
      '.ib-mask { position: fixed; z-index: 999999; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.72); display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }\n' +
      '.ib-card { background: #ffffff; border-radius: 16px; width: 100%; max-width: 340px; padding: 18px; box-sizing: border-box; text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.35); max-height: 90vh; overflow-y: auto; }\n' +
      '.ib-title { font-size: 17px; font-weight: bold; color: #1e293b; margin-bottom: 10px; }\n' +
      '.ib-prog-track { width: 100%; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden; margin: 12px 0 8px; }\n' +
      '.ib-prog-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #38bdf8, #2563eb); border-radius: 5px; transition: width 0.15s ease-out; }\n' +
      '.ib-prog-text { font-size: 12px; color: #475569; font-weight: 600; display: flex; justify-content: space-between; }\n' +
      '.ib-tip-box { font-size: 12px; color: #b91c1c; font-weight: 600; background: #fef2f2; border: 1px dashed #f87171; border-radius: 8px; padding: 8px; margin-bottom: 10px; line-height: 1.5; text-align: left; }\n' +
      '.ib-img-container { width: 190px; height: 190px; margin: 0 auto 12px; border: 2px dashed #93c5fd; padding: 6px; border-radius: 12px; background: #f8fafc; display: flex; align-items: center; justify-content: center; user-select: auto !important; -webkit-user-select: auto !important; }\n' +
      '.ib-target-img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; pointer-events: auto !important; -webkit-touch-callout: default !important; -webkit-user-select: auto !important; user-select: auto !important; display: block; }\n' +
      '.ib-btn-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }\n' +
      '.ib-btn-main { width: 100%; padding: 10px 0; border: none; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; }\n' +
      '.ib-btn-blue { background: #2563eb; color: #fff; }\n' +
      '.ib-btn-green { background: #16a34a; color: #fff; }\n' +
      '.ib-btn-gray { background: #f1f5f9; color: #475569; }\n' +
      '.ib-textarea { width: 100%; height: 70px; font-size: 11px; padding: 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-family: monospace; box-sizing: border-box; resize: none; margin-top: 6px; }\n';
    document.head.appendChild(style);
  }

  // UTF-8 编码
  function encodeStringToUtf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    }
    var utf8 = unescape(encodeURIComponent(str));
    var len = utf8.length;
    var arr = new Uint8Array(len);
    for (var i = 0; i < len; i++) arr[i] = utf8.charCodeAt(i);
    return arr;
  }

  // UTF-8 解码
  function decodeUtf8BytesToString(arr) {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder().decode(arr);
    }
    var utf8 = '';
    for (var i = 0; i < arr.length; i++) utf8 += String.fromCharCode(arr[i]);
    return decodeURIComponent(escape(utf8));
  }

  // 保持现有被验证完全正确的 PNG 像素生成算法
  function encodeSaveToImageWithProgress(gameStateObj, onProgress) {
    return new Promise(function (resolve, reject) {
      try {
        onProgress(5, '整理存档数据...');
        setTimeout(function () {
          var cleanState = JSON.parse(JSON.stringify(gameStateObj));
          var jsonStr = MAGIC_HEADER + JSON.stringify(cleanState);

          onProgress(15, '转换字节流...');
          setTimeout(function () {
            var bytes = encodeStringToUtf8Bytes(jsonStr);
            var dataLen = bytes.length;

            var totalPayloadLen = 4 + dataLen;
            var totalPixels = Math.ceil(totalPayloadLen / 3);
            var width = Math.ceil(Math.sqrt(totalPixels));
            var height = Math.ceil(totalPixels / width);

            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            var imgData = ctx.createImageData(width, height);
            var pixels = imgData.data;

            var fullBytes = new Uint8Array(totalPixels * 3);
            fullBytes[0] = (dataLen >> 24) & 0xff;
            fullBytes[1] = (dataLen >> 16) & 0xff;
            fullBytes[2] = (dataLen >> 8) & 0xff;
            fullBytes[3] = dataLen & 0xff;

            var CHUNK = 65536;
            var bytePos = 0;

            function copyBytesChunk() {
              var limit = Math.min(bytePos + CHUNK, dataLen);
              for (var i = bytePos; i < limit; i++) {
                fullBytes[4 + i] = bytes[i];
              }
              bytePos = limit;
              var percent = Math.floor(15 + (bytePos / dataLen) * 35);
              onProgress(percent, '生成像素结构 (' + Math.round((bytePos / dataLen) * 100) + '%)...');

              if (bytePos < dataLen) {
                setTimeout(copyBytesChunk, 0);
              } else {
                startPixelMapping();
              }
            }

            function startPixelMapping() {
              var pLen = pixels.length;
              var pIdx = 0;
              var bIdx = 0;
              var PIXEL_CHUNK = 32768;

              function processPixelsChunk() {
                var limit = Math.min(pIdx + PIXEL_CHUNK, pLen);
                for (; pIdx < limit; pIdx += 4) {
                  pixels[pIdx] = fullBytes[bIdx] || 0;
                  pixels[pIdx + 1] = fullBytes[bIdx + 1] || 0;
                  pixels[pIdx + 2] = fullBytes[bIdx + 2] || 0;
                  pixels[pIdx + 3] = 255;
                  bIdx += 3;
                }

                var percent = Math.floor(50 + (pIdx / pLen) * 45);
                onProgress(percent, '渲染备份图像 (' + Math.round((pIdx / pLen) * 100) + '%)...');

                if (pIdx < pLen) {
                  setTimeout(processPixelsChunk, 0);
                } else {
                  ctx.putImageData(imgData, 0, 0);
                  onProgress(98, '完成编码...');
                  setTimeout(function () {
                    var dataUrl = canvas.toDataURL('image/png');
                    onProgress(100, '完成！');
                    resolve({ dataUrl: dataUrl, jsonStr: jsonStr });
                  }, 20);
                }
              }
              processPixelsChunk();
            }

            copyBytesChunk();
          }, 20);
        }, 20);
      } catch (err) {
        reject(err);
      }
    });
  }

  // 保持现有被验证完全正确的相册图片解码算法
  function decodeDataUrlToSave(dataUrl, callback) {
    var img = new Image();
    img.onload = function () {
      try {
        var canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var pixels = imgData.data;

        var fullBytes = [];
        for (var p = 0; p < pixels.length; p += 4) {
          fullBytes.push(pixels[p]);
          fullBytes.push(pixels[p + 1]);
          fullBytes.push(pixels[p + 2]);
        }

        var dataLen = ((fullBytes[0] << 24) >>> 0) +
                      (fullBytes[1] << 16) +
                      (fullBytes[2] << 8) +
                      fullBytes[3];

        if (dataLen <= 0 || dataLen > fullBytes.length - 4) {
          throw new Error('无效的备份图片文件');
        }

        var payloadBytes = new Uint8Array(dataLen);
        for (var i = 0; i < dataLen; i++) {
          payloadBytes[i] = fullBytes[4 + i];
        }

        var decodedStr = decodeUtf8BytesToString(payloadBytes);
        if (decodedStr.indexOf(MAGIC_HEADER) !== 0) {
          throw new Error('未识别到存档特征标记');
        }

        var jsonBody = decodedStr.substring(MAGIC_HEADER.length);
        var parsed = JSON.parse(jsonBody);
        callback(null, parsed);
      } catch (err) {
        callback(err, null);
      }
    };
    img.onerror = function () {
      callback(new Error('相册图片读取失败'), null);
    };
    img.src = dataUrl;
  }

  window.ImageBackup = {
    startGenerateBackupWithModal: function (gameStateObj) {
      ensureStyles();

      var mask = document.createElement('div');
      mask.className = 'ib-mask';
      mask.innerHTML = '\n' +
        '<div class="ib-card" id="ibCardNode">\n' +
        '  <div class="ib-title">⏳ 正在编码图片存档</div>\n' +
        '  <div class="ib-prog-text">\n' +
        '    <span>处理进度</span>\n' +
        '    <span id="ibProgVal">0%</span>\n' +
        '  </div>\n' +
        '  <div class="ib-prog-track">\n' +
        '    <div class="ib-prog-fill" id="ibProgFill"></div>\n' +
        '  </div>\n' +
        '  <div id="ibProgMsg" style="font-size:11px;color:#64748b;margin-top:4px;">准备中...</div>\n' +
        '</div>';
      document.body.appendChild(mask);

      var fill = mask.querySelector('#ibProgFill');
      var val = mask.querySelector('#ibProgVal');
      var msg = mask.querySelector('#ibProgMsg');

      function updateProgress(pct, txt) {
        if (fill) fill.style.width = pct + '%';
        if (val) val.textContent = pct + '%';
        if (msg) msg.textContent = txt;
      }

      encodeSaveToImageWithProgress(gameStateObj, updateProgress).then(function (result) {
        var dataUrl = result.dataUrl;
        var card = mask.querySelector('#ibCardNode');

        // 渲染无拖动干扰的图片弹窗
        card.innerHTML = '\n' +
          '<div class="ib-title">💾 图片存档已就绪</div>\n' +
          '<div class="ib-tip-box">\n' +
          '  1. <b>长按下方图片</b>：已关闭拖拽冲突，长按弹出菜单选【保存到手机/发送】。<br>\n' +
          '  2. 也可以点下方【调用系统分享】直接发送到微信/QQ保存原图。\n' +
          '</div>\n' +
          '<div class="ib-img-container">\n' +
          '  <a href="' + dataUrl + '" download="mcyt_backup.png" style="display:block;width:100%;height:100%;" draggable="false">\n' +
          '    <img src="' + dataUrl + '" class="ib-target-img" alt="备份图" draggable="false" ondragstart="return false;" />\n' +
          '  </a>\n' +
          '</div>\n' +
          '<div class="ib-btn-list">\n' +
          '  <button class="ib-btn-main ib-btn-blue" id="ibNativeSaveBtn">💾 尝试直接保存到相册/文件</button>\n' +
          '  <button class="ib-btn-main ib-btn-green" id="ibSysShareBtn">📤 调用系统分享 (微信/QQ)</button>\n' +
          '  <button class="ib-btn-main ib-btn-gray" id="ibCloseModalBtn">完成关闭</button>\n' +
          '</div>';

        // 1. 尝试原生注入与模拟下载双轨
        card.querySelector('#ibNativeSaveBtn').onclick = function () {
          // 优先看是否有原生桥接
          if (window.NativeBridge && window.NativeBridge.saveViaNative('mcyt_backup.png', dataUrl)) {
            alert('✅ 已通过系统底层接口将图片保存到相册/下载目录！');
            return;
          }

          // 降级：模拟触发 a download
          try {
            var a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'mcyt_backup.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            alert('已触发系统下载通道！如未在相册看到，请长按图片直接存入相册。');
          } catch (e) {
            alert('该机型 WebView 禁用了自动下载，请直接长按图片保存到相册。');
          }
        };

        // 2. 调用标准 Web Share
        card.querySelector('#ibSysShareBtn').onclick = function () {
          if (window.NativeBridge && typeof window.NativeBridge.shareDataUrlFile === 'function') {
            window.NativeBridge.shareDataUrlFile(dataUrl, 'mcyt_backup.png')
              .then(function () {
                console.log('[NativeBridge] 分享拉起成功');
              })
              .catch(function (err) {
                alert('⚠️ 当前打包环境未放开系统分享权限：' + (err && err.message ? err.message : ''));
              });
          } else {
            alert('当前设备环境不支持系统分享，请直接长按图片选择保存！');
          }
        };

        // 3. 关闭
        card.querySelector('#ibCloseModalBtn').onclick = function () {
          document.body.removeChild(mask);
        };
      }).catch(function (err) {
        alert('生成失败: ' + (err ? err.message : '未知错误'));
        document.body.removeChild(mask);
      });
    },

    decodeDataUrlToSave: decodeDataUrlToSave
  };
})();