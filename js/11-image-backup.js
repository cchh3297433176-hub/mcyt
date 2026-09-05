// ==========================================
// 11-image-backup.js
// 完美解决存档导出困境：标准 .json 下载 + 酒馆级高清角色卡 PNG 隐形元数据嵌入
// ==========================================
(function () {
  'use strict';

  var PNG_MAGIC_KEY = 'MCYTSAVE';

  // 1. 注入弹窗 UI 样式
  function ensureStyles() {
    if (document.getElementById('ib-backup-styles')) return;
    var style = document.createElement('style');
    style.id = 'ib-backup-styles';
    style.innerHTML = '\n' +
      '.ib-mask { position: fixed; z-index: 999999; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }\n' +
      '.ib-card { background: #ffffff; border-radius: 16px; width: 100%; max-width: 360px; padding: 20px; box-sizing: border-box; text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.35); max-height: 90vh; overflow-y: auto; }\n' +
      '.ib-title { font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 10px; }\n' +
      '.ib-tip-box { font-size: 12px; color: #1e40af; font-weight: 500; background: #eff6ff; border: 1px dashed #60a5fa; border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; line-height: 1.6; text-align: left; }\n' +
      '.ib-preview-card { width: 140px; height: 140px; margin: 0 auto 14px; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.15); border: 3px solid #60a5fa; position: relative; background: #f8fafc; }\n' +
      '.ib-preview-card img { width: 100%; height: 100%; object-fit: cover; display: block; }\n' +
      '.ib-card-tag { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(15,23,42,0.75); color: #fff; font-size: 10px; padding: 3px 0; font-weight: 600; }\n' +
      '.ib-btn-list { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }\n' +
      '.ib-btn-main { width: 100%; padding: 13px 0; border: none; border-radius: 10px; font-size: 14px; font-weight: bold; cursor: pointer; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }\n' +
      '.ib-btn-main:active { opacity: 0.85; }\n' +
      '.ib-btn-green { background: #16a34a; color: #ffffff; box-shadow: 0 4px 12px rgba(22,163,74,0.25); }\n' +
      '.ib-btn-purple { background: #7c3aed; color: #ffffff; box-shadow: 0 4px 12px rgba(124,58,237,0.25); }\n' +
      '.ib-btn-gray { background: #f1f5f9; color: #475569; margin-top: 2px; }\n';
    document.head.appendChild(style);
  }

  // 2. CRC32 校验码计算（PNG 协议规范要求）
  var crcTable = null;
  function makeCrcTable() {
    var c;
    var table = [];
    for (var n = 0; n < 256; n++) {
      c = n;
      for (var k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
      }
      table[n] = c;
    }
    return table;
  }
  function crc32(buf, offset, length) {
    if (!crcTable) crcTable = makeCrcTable();
    var c = 0xffffffff;
    for (var i = 0; i < length; i++) {
      c = crcTable[(c ^ buf[offset + i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // UTF-8 互转
  function strToBytes(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    var u = unescape(encodeURIComponent(str)), a = new Uint8Array(u.length);
    for (var i = 0; i < u.length; i++) a[i] = u.charCodeAt(i);
    return a;
  }
  function bytesToStr(arr) {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(arr);
    var u = '';
    for (var i = 0; i < arr.length; i++) u += String.fromCharCode(arr[i]);
    return decodeURIComponent(escape(u));
  }

  // 3. 类似酒馆（SillyTavern）的 PNG tEXt 块注入（隐形无损存入）
  function embedDataIntoPng(pngUint8Array, key, jsonStr) {
    var keyBytes = strToBytes(key);
    var valBytes = strToBytes(jsonStr);
    var textChunkDataLen = keyBytes.length + 1 + valBytes.length; // key + 0x00 + value
    var chunkTotalLen = 4 + 4 + textChunkDataLen + 4; // length(4) + type(4) + data + crc(4)

    var chunk = new Uint8Array(chunkTotalLen);
    var view = new DataView(chunk.buffer);

    view.setUint32(0, textChunkDataLen, false);
    chunk[4] = 116; chunk[5] = 69; chunk[6] = 88; chunk[7] = 116; // "tEXt"

    chunk.set(keyBytes, 8);
    chunk[8 + keyBytes.length] = 0; // null 隔断符
    chunk.set(valBytes, 8 + keyBytes.length + 1);

    var crcVal = crc32(chunk, 4, 4 + textChunkDataLen);
    view.setUint32(chunkTotalLen - 4, crcVal, false);

    // 拼装：在 IHDR 之后插入 tEXt 块
    var ihdrEnd = 33; // 8 (Signature) + 25 (IHDR chunk)
    var result = new Uint8Array(pngUint8Array.length + chunkTotalLen);
    result.set(pngUint8Array.subarray(0, ihdrEnd), 0);
    result.set(chunk, ihdrEnd);
    result.set(pngUint8Array.subarray(ihdrEnd), ihdrEnd + chunkTotalLen);

    return result;
  }

  // 4. 解析 PNG 中的 tEXt 元数据
  function extractDataFromPng(pngUint8Array, key) {
    var view = new DataView(pngUint8Array.buffer, pngUint8Array.byteOffset, pngUint8Array.byteLength);
    var pos = 8; // 跳过 PNG 头部 8 字节

    while (pos < pngUint8Array.length - 8) {
      var length = view.getUint32(pos, false);
      var type = String.fromCharCode(
        pngUint8Array[pos + 4], pngUint8Array[pos + 5],
        pngUint8Array[pos + 6], pngUint8Array[pos + 7]
      );

      if (type === 'tEXt') {
        var dataStart = pos + 8;
        var nullIndex = -1;
        for (var i = 0; i < length; i++) {
          if (pngUint8Array[dataStart + i] === 0) {
            nullIndex = dataStart + i;
            break;
          }
        }
        if (nullIndex !== -1) {
          var foundKey = bytesToStr(pngUint8Array.subarray(dataStart, nullIndex));
          if (foundKey === key) {
            var valBytes = pngUint8Array.subarray(nullIndex + 1, dataStart + length);
            return bytesToStr(valBytes);
          }
        }
      }

      if (type === 'IEND') break;
      pos += 12 + length;
    }
    return null;
  }

  // 生成漂亮的角色卡 Canvas
  function createCharacterCardCanvas(avatarSrc, ytName, dayNum, callback) {
    var canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    var ctx = canvas.getContext('2d');

    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      // 绘制背景渐变
      var grad = ctx.createLinearGradient(0, 0, 400, 400);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 400);

      // 绘制中心头像
      var size = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 30, 30, 340, 280);

      // 底部信息条
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 310, 400, 90);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(ytName || 'MC 主播', 30, 348);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('第 ' + dayNum + ' 天 · 记忆存档角色卡', 30, 378);

      // 边框装饰
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, 394, 394);

      callback(canvas);
    };
    img.onerror = function () {
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ytName || 'MC 主播', 200, 200);
      callback(canvas);
    };
    img.src = avatarSrc || '';
  }

  // 触发原生文件下载 (走 data 协议触发原生 DownloadListener)
  function downloadBlobOrData(fileName, mimeType, uint8Array) {
    try {
      var binary = '';
      var len = uint8Array.byteLength;
      for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      var base64 = btoa(binary);
      var dataUri = 'data:' + mimeType + ';base64,' + base64;

      var a = document.createElement('a');
      a.href = dataUri;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('下载触发失败', e);
      alert('下载失败: ' + e.message);
    }
  }

  // ================= 核心面板入口 =================
  window.ImageBackup = {
    startGenerateBackupWithModal: function (gameStateObj) {
      ensureStyles();

      var cleanState = JSON.parse(JSON.stringify(gameStateObj));
      var jsonStr = JSON.stringify(cleanState, null, 2);

      var pName = (cleanState.data && cleanState.data.player && cleanState.data.player.ytName) ? cleanState.data.player.ytName : '主播';
      var dayNum = cleanState.day || 1;
      var avatar = (cleanState.data && cleanState.data.player && cleanState.data.player.avatar) || '';

      var jsonFileName = 'MCYT存档_第' + dayNum + '天_' + pName + '_' + Date.now() + '.json';
      var pngFileName = 'MCYT角色卡存档_第' + dayNum + '天_' + pName + '_' + Date.now() + '.png';

      var mask = document.createElement('div');
      mask.className = 'ib-mask';
      mask.innerHTML = '\n' +
        '<div class="ib-card" id="ibCardNode">\n' +
        '  <div class="ib-title">💾 导出与备份游戏进度</div>\n' +
        '  <div class="ib-tip-box">\n' +
        '    ✨ <b>全新双模式导出：</b><br>' +
        '    <b>1. 标准 JSON 文件：</b>点击即可直接下载，通用性最强。<br>' +
        '    <b>2. 酒馆级 PNG 角色卡：</b>表面是一张精美主播立绘卡，实际完整嵌入了所有记忆与剧情数据！\n' +
        '  </div>\n' +
        '  <div class="ib-preview-card" id="ibPreviewBox">\n' +
        '    <div style="line-height:140px;color:#94a3b8;font-size:12px;">生成预览中...</div>\n' +
        '  </div>\n' +
        '  <div class="ib-btn-list">\n' +
        '    <button class="ib-btn-main ib-btn-purple" id="ibDownloadPngCardBtn">🖼️ 下载专属角色卡存档 (.png)</button>\n' +
        '    <button class="ib-btn-main ib-btn-green" id="ibDownloadJsonBtn">📥 下载标准存档文件 (.json)</button>\n' +
        '    <button class="ib-btn-main ib-btn-gray" id="ibCloseModalBtn">完成并关闭</button>\n' +
        '  </div>\n' +
        '</div>';
      document.body.appendChild(mask);

      var renderedPngBytes = null;

      // 异步渲染酒馆卡
      createCharacterCardCanvas(avatar, pName, dayNum, function (canvas) {
        var basePngDataUrl = canvas.toDataURL('image/png');
        var previewBox = mask.querySelector('#ibPreviewBox');
        if (previewBox) {
          previewBox.innerHTML = '<img src="' + basePngDataUrl + '" /><div class="ib-card-tag">第 ' + dayNum + ' 天 · ' + pName + '</div>';
        }

        // 提取二进制并嵌入元数据
        var rawBinary = atob(basePngDataUrl.split(',')[1]);
        var rawBytes = new Uint8Array(rawBinary.length);
        for (var i = 0; i < rawBinary.length; i++) rawBytes[i] = rawBinary.charCodeAt(i);

        // 注入元数据
        renderedPngBytes = embedDataIntoPng(rawBytes, PNG_MAGIC_KEY, jsonStr);
      });

      // 绑定 1：下载标准 JSON
      mask.querySelector('#ibDownloadJsonBtn').onclick = function () {
        var jsonBytes = strToBytes(jsonStr);
        downloadBlobOrData(jsonFileName, 'application/json', jsonBytes);
      };

      // 绑定 2：下载酒馆级 PNG 角色卡
      mask.querySelector('#ibDownloadPngCardBtn').onclick = function () {
        if (!renderedPngBytes) {
          alert('正在准备角色卡图像，请稍候 1 秒重试');
          return;
        }
        downloadBlobOrData(pngFileName, 'image/png', renderedPngBytes);
      };

      mask.querySelector('#ibCloseModalBtn').onclick = function () {
        document.body.removeChild(mask);
      };
    },

    // 解析入口：从 PNG Uint8Array 中提取隐形存档
    extractSaveFromPngBytes: function (pngBytes) {
      var jsonStr = extractDataFromPng(pngBytes, PNG_MAGIC_KEY);
      if (!jsonStr) {
        throw new Error('该图片中未包含 MCYT 隐形存档数据，请确认上传的是本游戏导出的角色卡原图');
      }
      return JSON.parse(jsonStr);
    }
  };
})();