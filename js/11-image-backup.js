// ==========================================
// 11-image-backup.js
// 异步分片 + 实时进度条的高性能纯图片备份恢复系统
// ==========================================
(function () {
  'use strict';

  var MAGIC_HEADER = 'MCYTBKP:';

  // 确保全局样式注入
  function ensureProgressBarStyles() {
    if (document.getElementById('ib-progressbar-styles')) return;
    var style = document.createElement('style');
    style.id = 'ib-progressbar-styles';
    style.innerHTML = '\n' +
      '.ib-modal-mask { position: fixed; z-index: 999999; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.72); display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; touch-action: manipulation; }\n' +
      '.ib-modal-card { background: #ffffff; border-radius: 16px; width: 100%; max-width: 340px; padding: 20px; box-sizing: border-box; text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.35); animation: ibCardPop 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28); }\n' +
      '@keyframes ibCardPop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }\n' +
      '.ib-modal-title { font-size: 17px; font-weight: bold; color: #1e293b; margin-bottom: 12px; }\n' +
      '.ib-prog-track { width: 100%; height: 12px; background: #e2e8f0; border-radius: 6px; overflow: hidden; margin: 14px 0 8px; position: relative; }\n' +
      '.ib-prog-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #38bdf8, #2563eb); border-radius: 6px; transition: width 0.15s ease-out; }\n' +
      '.ib-prog-text { font-size: 13px; color: #475569; font-weight: 600; display: flex; justify-content: space-between; margin-bottom: 6px; }\n' +
      '.ib-prog-status { font-size: 12px; color: #64748b; margin-bottom: 10px; min-height: 18px; }\n' +
      '.ib-red-tip { font-size: 12px; color: #dc2626; font-weight: 600; background: #fef2f2; border: 1px dashed #f87171; border-radius: 8px; padding: 8px; margin-bottom: 12px; line-height: 1.5; }\n' +
      '.ib-img-wrap { width: 210px; height: 210px; margin: 0 auto 14px; border: 2px dashed #93c5fd; padding: 6px; border-radius: 12px; background: #f8fafc; display: flex; align-items: center; justify-content: center; }\n' +
      '.ib-img-wrap img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; -webkit-user-select: auto !important; user-select: auto !important; -webkit-touch-callout: default !important; }\n' +
      '.ib-close-btn { width: 100%; padding: 11px 0; border: none; border-radius: 8px; font-size: 14px; font-weight: bold; background: #f1f5f9; color: #334155; cursor: pointer; }\n' +
      '.ib-close-btn:active { background: #e2e8f0; }\n';
    document.head.appendChild(style);
  }

  // 高效的 UTF-8 编码器（支持 TextEncoder，不支持则降级分块）
  function encodeStringToUtf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    }
    var utf8 = unescape(encodeURIComponent(str));
    var len = utf8.length;
    var arr = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      arr[i] = utf8.charCodeAt(i);
    }
    return arr;
  }

  // 高效的 UTF-8 解码器
  function decodeUtf8BytesToString(arr) {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder().decode(arr);
    }
    var utf8 = '';
    for (var i = 0; i < arr.length; i++) {
      utf8 += String.fromCharCode(arr[i]);
    }
    return decodeURIComponent(escape(utf8));
  }

  // 异步分片图片编码器（带进度回调）
  function encodeSaveToImageWithProgress(gameStateObj, onProgress) {
    return new Promise(function (resolve, reject) {
      try {
        onProgress(5, '正在整理存档数据...');

        setTimeout(function () {
          var cleanState = JSON.parse(JSON.stringify(gameStateObj));
          var jsonStr = MAGIC_HEADER + JSON.stringify(cleanState);

          onProgress(15, '正在转换数据编码...');
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

            // 分块复制 payload，避免大数组一次性堵塞
            var CHUNK = 65536;
            var bytePos = 0;

            function copyBytesChunk() {
              var limit = Math.min(bytePos + CHUNK, dataLen);
              for (var i = bytePos; i < limit; i++) {
                fullBytes[4 + i] = bytes[i];
              }
              bytePos = limit;

              var percent = Math.floor(15 + (bytePos / dataLen) * 35); // 15% -> 50%
              onProgress(percent, '正在准备像素结构 (' + Math.round((bytePos / dataLen) * 100) + '%)...');

              if (bytePos < dataLen) {
                setTimeout(copyBytesChunk, 0);
              } else {
                startPixelMapping();
              }
            }

            // 分块写入像素
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
                  pixels[pIdx + 3] = 255; // 必须不透明
                  bIdx += 3;
                }

                var percent = Math.floor(50 + (pIdx / pLen) * 45); // 50% -> 95%
                onProgress(percent, '正在绘制备份画面 (' + Math.round((pIdx / pLen) * 100) + '%)...');

                if (pIdx < pLen) {
                  setTimeout(processPixelsChunk, 0);
                } else {
                  ctx.putImageData(imgData, 0, 0);
                  onProgress(98, '正在最终渲染图片...');
                  setTimeout(function () {
                    var dataUrl = canvas.toDataURL('image/png');
                    onProgress(100, '生成完成！');
                    resolve(dataUrl);
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

  // 解码相册图片
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
          throw new Error('无效的备份图片格式');
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
      callback(new Error('相册图片载入失败'), null);
    };
    img.src = dataUrl;
  }

  window.ImageBackup = {
    // 呼出带真实进度条的生成弹窗
    startGenerateBackupWithModal: function (gameStateObj) {
      ensureProgressBarStyles();

      var mask = document.createElement('div');
      mask.className = 'ib-modal-mask';
      mask.innerHTML = '\n' +
        '<div class="ib-modal-card" id="ibModalCard">\n' +
        '  <div class="ib-modal-title">⏳ 正在生成图片存档</div>\n' +
        '  <div class="ib-prog-text">\n' +
        '    <span>处理进度</span>\n' +
        '    <span id="ibProgNum">0%</span>\n' +
        '  </div>\n' +
        '  <div class="ib-prog-track">\n' +
        '    <div class="ib-prog-fill" id="ibProgBar"></div>\n' +
        '  </div>\n' +
        '  <div class="ib-prog-status" id="ibProgStatus">准备就绪...</div>\n' +
        '</div>';

      document.body.appendChild(mask);

      var fillEl = mask.querySelector('#ibProgBar');
      var numEl = mask.querySelector('#ibProgNum');
      var statusEl = mask.querySelector('#ibProgStatus');

      function updateProgressUI(pct, text) {
        if (fillEl) fillEl.style.width = pct + '%';
        if (numEl) numEl.textContent = pct + '%';
        if (statusEl) statusEl.textContent = text;
      }

      encodeSaveToImageWithProgress(gameStateObj, updateProgressUI).then(function (dataUrl) {
        var card = mask.querySelector('#ibModalCard');
        card.innerHTML = '\n' +
          '<div class="ib-modal-title">🎉 备份图片已就绪</div>\n' +
          '<div class="ib-red-tip">👇 <b>长按下方图片</b>，在弹出菜单中选择【保存到手机相册】或【发送】！<br><small style="color:#64748b;">(更新APP后直接用这张图片恢复，无需任何下载权限)</small></div>\n' +
          '<div class="ib-img-wrap">\n' +
          '  <img src="' + dataUrl + '" alt="长按保存图片" />\n' +
          '</div>\n' +
          '<button class="ib-close-btn" id="ibFinishBtn">完成并关闭</button>';

        card.querySelector('#ibFinishBtn').onclick = function () {
          document.body.removeChild(mask);
        };
      }).catch(function (err) {
        alert('生成失败: ' + (err && err.message ? err.message : '未知错误'));
        document.body.removeChild(mask);
      });
    },

    // 兼容原版调用接口
    encodeBackupToImage: function (jsonStr) {
      try {
        var obj = JSON.parse(jsonStr);
        window.ImageBackup.startGenerateBackupWithModal(obj);
        return '';
      } catch (e) {
        window.ImageBackup.startGenerateBackupWithModal(jsonStr);
        return '';
      }
    },
    encodeSaveToImage: function (stateObj) {
      window.ImageBackup.startGenerateBackupWithModal(stateObj);
      return '';
    },
    decodeDataUrlToSave: decodeDataUrlToSave
  };
})();