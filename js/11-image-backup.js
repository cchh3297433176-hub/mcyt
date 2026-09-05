// ==========================================
// 11-image-backup.js
// 完美解决 APK 内下载失效：Canvas 像素图片备份 + 长按保存弹窗交互
// ==========================================
(function () {
  'use strict';

  var MAGIC_HEADER = 'MCYTBKP:';

  // 字符串转 UTF-8 字节数组
  function stringToBytes(str) {
    var utf8 = unescape(encodeURIComponent(str));
    var arr = new Uint8Array(utf8.length);
    for (var i = 0; i < utf8.length; i++) {
      arr[i] = utf8.charCodeAt(i);
    }
    return arr;
  }

  // UTF-8 字节数组转字符串
  function bytesToString(arr) {
    var utf8 = '';
    for (var i = 0; i < arr.length; i++) {
      utf8 += String.fromCharCode(arr[i]);
    }
    return decodeURIComponent(escape(utf8));
  }

  // 像素编码
  function encodeSaveToDataUrl(gameStateObj) {
    var jsonStr = MAGIC_HEADER + JSON.stringify(gameStateObj);
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
    return canvas.toDataURL('image/png');
  }

  // 像素解码
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
      callback(new Error('图片加载解析失败'), null);
    };
    img.src = dataUrl;
  }

  // 注入样式，确保长按可用，弹窗精致
  function injectBackupStyles() {
    if (document.getElementById('imageBackupStyle')) return;
    var style = document.createElement('style');
    style.id = 'imageBackupStyle';
    style.innerHTML = '\n' +
      '.bkp-mask { position: fixed; z-index: 99999; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }\n' +
      '.bkp-box { background: #fff; border-radius: 12px; width: 100%; max-width: 360px; padding: 18px; box-sizing: border-box; text-align: center; font-family: sans-serif; box-shadow: 0 8px 24px rgba(0,0,0,0.25); }\n' +
      '.bkp-title { font-size: 17px; font-weight: bold; color: #222; margin-bottom: 8px; }\n' +
      '.bkp-tip { font-size: 13px; color: #e53935; line-height: 1.5; margin-bottom: 12px; background: #ffebee; padding: 8px; border-radius: 6px; }\n' +
      '.bkp-img-wrap { width: 180px; height: 180px; margin: 0 auto 14px; border: 2px dashed #90caf9; padding: 6px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: #fdfdfd; }\n' +
      '.bkp-img-wrap img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; -webkit-user-select: auto !important; user-select: auto !important; }\n' +
      '.bkp-btn-row { display: flex; gap: 8px; justify-content: center; }\n' +
      '.bkp-btn { flex: 1; padding: 10px 0; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; font-weight: bold; }\n' +
      '.bkp-btn-primary { background: #1976d2; color: #fff; }\n' +
      '.bkp-btn-close { background: #e0e0e0; color: #333; }\n';
    document.head.appendChild(style);
  }

  window.ImageBackup = {
    // 弹出“长按保存”备份卡片
    showExportImageModal: function (gameStateObj) {
      injectBackupStyles();
      var dataUrl = encodeSaveToDataUrl(gameStateObj);
      if (!dataUrl) {
        alert('生成图片备份失败！');
        return;
      }

      var modal = document.createElement('div');
      modal.className = 'bkp-mask';
      modal.innerHTML = '\n' +
        '<div class="bkp-box">\n' +
        '  <div class="bkp-title">📷 图片存档已生成</div>\n' +
        '  <div class="bkp-tip">⚠️ APK环境下无法直接下载，<b>请长按下方图片</b>，在弹出的菜单中选择【保存图片】或【发送】！</div>\n' +
        '  <div class="bkp-img-wrap">\n' +
        '    <img src="' + dataUrl + '" alt="长按保存备份图" />\n' +
        '  </div>\n' +
        '  <div class="bkp-btn-row">\n' +
        '    <button class="bkp-btn bkp-btn-primary" id="bkpShareBtn">📤 系统分享</button>\n' +
        '    <button class="bkp-btn bkp-btn-close" id="bkpCloseBtn">关闭</button>\n' +
        '  </div>\n' +
        '</div>';

      document.body.appendChild(modal);

      modal.querySelector('#bkpCloseBtn').onclick = function () {
        document.body.removeChild(modal);
      };

      modal.querySelector('#bkpShareBtn').onclick = function () {
        if (navigator.share) {
          fetch(dataUrl)
            .then(function (res) { return res.blob(); })
            .then(function (blob) {
              var file = new File([blob], 'mcyt_backup.png', { type: 'image/png' });
              navigator.share({ files: [file], title: '游戏备份图' }).catch(function () {});
            });
        } else {
          alert('当前系统不支持直接拉起分享面板，请直接长按图片进行保存！');
        }
      };
    },

    // 唤起相册选取图片恢复存档
    pickAndRestoreFromImage: function (onSuccess) {
      var fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);

      fileInput.onchange = function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (evt) {
          decodeDataUrlToSave(evt.target.result, function (err, state) {
            document.body.removeChild(fileInput);
            if (err || !state) {
              alert('恢复失败：这不是一张有效的存档图片，或图片已被平台压缩损坏（导入需使用原图）！');
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