// ==========================================
// 11-image-backup.js
// 极简纯净版：纯图片备份与相册恢复中心 (移除文件下载与剪贴板)
// ==========================================
(function () {
  'use strict';

  var MAGIC_HEADER = 'MCYTBKP:';

  // 字符串转 UTF-8 字节
  function stringToBytes(str) {
    var utf8 = unescape(encodeURIComponent(str));
    var arr = new Uint8Array(utf8.length);
    for (var i = 0; i < utf8.length; i++) {
      arr[i] = utf8.charCodeAt(i);
    }
    return arr;
  }

  // UTF-8 字节转字符串
  function bytesToString(arr) {
    var utf8 = '';
    for (var i = 0; i < arr.length; i++) {
      utf8 += String.fromCharCode(arr[i]);
    }
    return decodeURIComponent(escape(utf8));
  }

  // 异步生成 Base64 像素图，防止移动端点击卡死
  function encodeSaveToDataUrlAsync(gameStateObj) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          var cleanState = JSON.parse(JSON.stringify(gameStateObj));
          var jsonStr = MAGIC_HEADER + JSON.stringify(cleanState);
          var bytes = stringToBytes(jsonStr);
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

          for (var i = 0; i < dataLen; i++) {
            fullBytes[4 + i] = bytes[i];
          }

          var byteIdx = 0;
          for (var p = 0; p < pixels.length; p += 4) {
            pixels[p] = fullBytes[byteIdx] || 0;
            pixels[p + 1] = fullBytes[byteIdx + 1] || 0;
            pixels[p + 2] = fullBytes[byteIdx + 2] || 0;
            pixels[p + 3] = 255;
            byteIdx += 3;
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          reject(err);
        }
      }, 50);
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

        var decodedStr = bytesToString(payloadBytes);
        if (decodedStr.indexOf(MAGIC_HEADER) !== 0) {
          throw new Error('未识别出有效存档标记');
        }

        var jsonBody = decodedStr.substring(MAGIC_HEADER.length);
        var parsed = JSON.parse(jsonBody);
        callback(null, parsed);
      } catch (err) {
        callback(err, null);
      }
    };
    img.onerror = function () {
      callback(new Error('图片载入失败'), null);
    };
    img.src = dataUrl;
  }

  // 注入弹窗 UI 样式
  function ensureStyles() {
    if (document.getElementById('mcy-img-backup-styles')) return;
    var style = document.createElement('style');
    style.id = 'mcy-img-backup-styles';
    style.innerHTML = '\n' +
      '.ib-mask { position: fixed; z-index: 100000; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.65); display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; touch-action: manipulation; }\n' +
      '.ib-card { background: #ffffff; border-radius: 16px; width: 100%; max-width: 340px; padding: 20px; box-sizing: border-box; text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.3); animation: ibFadeIn 0.2s ease; }\n' +
      '@keyframes ibFadeIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }\n' +
      '.ib-title { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }\n' +
      '.ib-desc { font-size: 13px; color: #dc2626; line-height: 1.5; margin-bottom: 14px; background: #fef2f2; border: 1px dashed #f87171; padding: 10px; border-radius: 8px; }\n' +
      '.ib-preview-box { width: 200px; height: 200px; margin: 0 auto 16px; border: 2px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #f8fafc; overflow: hidden; }\n' +
      '.ib-preview-box img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; -webkit-touch-callout: default !important; -webkit-user-select: auto !important; user-select: auto !important; }\n' +
      '.ib-btn-group { display: flex; flex-direction: column; gap: 10px; }\n' +
      '.ib-btn { width: 100%; padding: 12px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }\n' +
      '.ib-btn:active { opacity: 0.8; }\n' +
      '.ib-btn-primary { background: #3b82f6; color: #fff; }\n' +
      '.ib-btn-secondary { background: #f1f5f9; color: #475569; }\n' +
      '.ib-loading { padding: 30px 10px; font-size: 15px; color: #64748b; }\n';
    document.head.appendChild(style);
  }

  window.ImageBackup = {
    // 呼出“图片导出备份”弹窗 (带 Loading，秒点即开)
    openExportModal: function (gameStateObj) {
      ensureStyles();

      var mask = document.createElement('div');
      mask.className = 'ib-mask';
      mask.innerHTML = '\n' +
        '<div class="ib-card">\n' +
        '  <div class="ib-title">💾 导出图片存档</div>\n' +
        '  <div class="ib-loading">⏳ 正在将存档编码为原画图片...</div>\n' +
        '</div>';
      document.body.appendChild(mask);

      encodeSaveToDataUrlAsync(gameStateObj).then(function (dataUrl) {
        var card = mask.querySelector('.ib-card');
        card.innerHTML = '\n' +
          '<div class="ib-title">💾 备份图已生成</div>\n' +
          '<div class="ib-desc">👉 <b>长按下方图片</b>，选择【保存到手机相册】或【发送】！<br><small style="color:#64748b;">(切勿截图或被微信画质压缩)</small></div>\n' +
          '<div class="ib-preview-box">\n' +
          '  <img src="' + dataUrl + '" alt="长按保存备份图" />\n' +
          '</div>\n' +
          '<div class="ib-btn-group">\n' +
          '  <button class="ib-btn ib-btn-secondary" id="ibCloseBtn">完成并关闭</button>\n' +
          '</div>';

        card.querySelector('#ibCloseBtn').onclick = function () {
          document.body.removeChild(mask);
        };
      }).catch(function (err) {
        alert('导出失败：' + (err && err.message ? err.message : '未知错误'));
        document.body.removeChild(mask);
      });
    },

    // 呼出相册选择图片恢复
    openImportPicker: function (onSuccess) {
      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);

      fileInput.onchange = function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) {
          if (fileInput.parentNode) document.body.removeChild(fileInput);
          return;
        }

        var reader = new FileReader();
        reader.onload = function (evt) {
          decodeDataUrlToSave(evt.target.result, function (err, state) {
            if (fileInput.parentNode) document.body.removeChild(fileInput);
            if (err || !state) {
              alert('恢复失败：该图片不是有效的存档图，或图片已被平台压缩损坏！请使用保存到相册的原始原图。');
              return;
            }
            if (typeof onSuccess === 'function') {
              onSuccess(state);
            }
          });
        };
        reader.readAsDataURL(file);
      };

      fileInput.click();
    }
  };
})();