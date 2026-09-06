// js/11-image-backup.js
// ==========================================
// 11-image-backup.js
// 导出备份模块（支持自定义 DIY 存档图片、PNG 元数据隐形嵌入、取证记忆卡双轨导出与下载完成指引）
// ==========================================
(function () {
  'use strict';

  var PNG_MAGIC_KEY = 'MCYTSAVE';

  function ensureStyles() {
    if (document.getElementById('ib-backup-styles')) return;
    var style = document.createElement('style');
    style.id = 'ib-backup-styles';
    style.innerHTML = '\n' +
      '.ib-mask { position: fixed; z-index: 10000005; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; backdrop-filter: blur(4px); }\n' +
      '.ib-card { background: #ffffff; border-radius: 16px; width: 100%; max-width: 380px; padding: 20px; box-sizing: border-box; text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-shadow: 0 12px 36px rgba(0,0,0,0.5); max-height: 92vh; overflow-y: auto; }\n' +
      '.ib-title { font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 10px; }\n' +
      '.ib-tip-box { font-size: 12px; color: #166534; background: #f0fdf4; border: 1px dashed #86efac; border-radius: 10px; padding: 10px; margin-bottom: 12px; line-height: 1.6; text-align: left; }\n' +
      '.ib-tip-box-ban { font-size: 12px; color: #991b1b; background: #fef2f2; border: 1px dashed #fca5a5; border-radius: 10px; padding: 10px; margin-bottom: 12px; line-height: 1.6; text-align: left; }\n' +
      '.ib-preview-box { width: 150px; height: 150px; margin: 0 auto 10px; border-radius: 14px; overflow: hidden; border: 2px solid #3b82f6; position: relative; background: #f8fafc; cursor: pointer; display: flex; align-items: center; justify-content: center; }\n' +
      '.ib-preview-box img { width: 100%; height: 100%; object-fit: cover; display: block; }\n' +
      '.ib-diy-hint { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.65); color: #fff; font-size: 11px; padding: 4px 0; }\n' +
      '.ib-btn-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }\n' +
      '.ib-btn-main { width: 100%; padding: 12px 0; border: none; border-radius: 10px; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }\n' +
      '.ib-btn-purple { background: #7c3aed; color: #ffffff; box-shadow: 0 4px 12px rgba(124,58,237,0.25); }\n' +
      '.ib-btn-green { background: #16a34a; color: #ffffff; box-shadow: 0 4px 12px rgba(22,163,74,0.25); }\n' +
      '.ib-btn-gray { background: #f1f5f9; color: #475569; }\n' +
      '.ib-success-notice-mask { position: fixed; z-index: 10000010; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }\n' +
      '.ib-success-notice-card { background: #ffffff; border-radius: 16px; width: 100%; max-width: 350px; padding: 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }\n';
    document.head.appendChild(style);
  }

  // CRC32 计算
  var crcTable = null;
  function makeCrcTable() {
    var c, table = [];
    for (var n = 0; n < 256; n++) {
      c = n;
      for (var k = 0; k < 8; k++) c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
      table[n] = c;
    }
    return table;
  }
  function crc32(buf, offset, length) {
    if (!crcTable) crcTable = makeCrcTable();
    var c = 0xffffffff;
    for (var i = 0; i < length; i++) c = crcTable[(c ^ buf[offset + i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

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

  // PNG tEXt 注入
  function embedDataIntoPng(pngUint8Array, key, jsonStr) {
    var keyBytes = strToBytes(key);
    var valBytes = strToBytes(jsonStr);
    var textChunkDataLen = keyBytes.length + 1 + valBytes.length;
    var chunkTotalLen = 4 + 4 + textChunkDataLen + 4;

    var chunk = new Uint8Array(chunkTotalLen);
    var view = new DataView(chunk.buffer);
    view.setUint32(0, textChunkDataLen, false);
    chunk[4] = 116; chunk[5] = 69; chunk[6] = 88; chunk[7] = 116; // "tEXt"
    chunk.set(keyBytes, 8);
    chunk[8 + keyBytes.length] = 0;
    chunk.set(valBytes, 8 + keyBytes.length + 1);

    var crcVal = crc32(chunk, 4, 4 + textChunkDataLen);
    view.setUint32(chunkTotalLen - 4, crcVal, false);

    var ihdrEnd = 33;
    var result = new Uint8Array(pngUint8Array.length + chunkTotalLen);
    result.set(pngUint8Array.subarray(0, ihdrEnd), 0);
    result.set(chunk, ihdrEnd);
    result.set(pngUint8Array.subarray(ihdrEnd), ihdrEnd + chunkTotalLen);
    return result;
  }

  // 从 PNG 中读取嵌入的 JSON 数据
  function extractDataFromPng(pngUint8Array, key) {
    var view = new DataView(pngUint8Array.buffer, pngUint8Array.byteOffset, pngUint8Array.byteLength);
    var pos = 8;
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

  function renderCardCanvas(imgSrc, callback, isBanMode) {
    var canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    var ctx = canvas.getContext('2d');
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      var size = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 400, 400);
      if (isBanMode) {
        ctx.fillStyle = 'rgba(220, 38, 38, 0.4)';
        ctx.fillRect(0, 340, 400, 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔒 MCYT 安全取证封存卡', 200, 378);
      }
      callback(canvas);
    };
    img.onerror = function () {
      ctx.fillStyle = isBanMode ? '#b91c1c' : '#3b82f6';
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isBanMode ? '🔒 MCYT 安全取证卡' : 'MCYT 记忆卡', 200, 200);
      callback(canvas);
    };
    img.src = imgSrc;
  }

  // APP 内下载成功全屏友好指引弹窗
  function showDownloadSuccessNotice(fileName, isBanMode) {
    var noticeMask = document.createElement('div');
    noticeMask.className = 'ib-success-notice-mask';
    noticeMask.innerHTML = '\n' +
      '<div class="ib-success-notice-card">\n' +
      '  <div style="font-size: 40px; margin-bottom: 8px;">✅</div>\n' +
      '  <div style="font-size: 17px; font-weight: 800; color: #166534; margin-bottom: 8px;">文件已成功导出！</div>\n' +
      '  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-size: 12px; color: #334155; word-break: break-all; margin-bottom: 12px; text-align: left;">\n' +
      '    <b>📄 已存文件：</b>' + fileName + '<br>\n' +
      '    <b>📁 存放路径：</b>系统 <b>Download (下载)</b> 目录\n' +
      '  </div>\n' +
      '  <div style="font-size: 12px; color: #64748b; line-height: 1.6; text-align: left; margin-bottom: 16px;">\n' +
      (isBanMode ?
        '    💡 <b>下一步操作</b>：<br>请打开手机自带「文件管理」进入 <b>Download</b> 目录，或在微信/QQ 发送文件时选取此文件，发送给管理员进行特赦审核。' :
        '    💡 <b>提示</b>：文件已由系统下载器安全落盘，随时可以在本软件「恢复存档」或「导入」中重新选回！') +
      '  </div>\n' +
      '  <button id="ibNoticeConfirmBtn" style="width:100%; padding: 10px 0; background: #16a34a; color: #fff; border: none; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer;">我知道了</button>\n' +
      '</div>';
    document.body.appendChild(noticeMask);

    noticeMask.querySelector('#ibNoticeConfirmBtn').onclick = function () {
      noticeMask.remove();
    };
  }

  function downloadFile(fileName, mimeType, uint8Array, isBanMode) {
    try {
      var binary = '';
      var len = uint8Array.byteLength;
      for (var i = 0; i < len; i++) binary += String.fromCharCode(uint8Array[i]);
      var base64 = btoa(binary);
      var a = document.createElement('a');
      a.href = 'data:' + mimeType + ';base64,' + base64;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // 弹出 APP 界面内明确的完成提示
      showDownloadSuccessNotice(fileName, isBanMode);
    } catch (e) {
      alert('下载异常: ' + e.message);
    }
  }

  window.ImageBackup = {
    startGenerateBackupWithModal: function (gameStateObj) {
      ensureStyles();

      var cleanState = JSON.parse(JSON.stringify(gameStateObj));
      var jsonStr = JSON.stringify(cleanState);
      var isBanMode = !!(cleanState.data && (cleanState.data._isDeviceBanned || cleanState.data._securityAuditBox));
      var pName = (cleanState.data && cleanState.data.player && cleanState.data.player.ytName) || '主角';
      var dayNum = cleanState.day || 1;
      var baseImgSrc = (cleanState.data && cleanState.data.player && cleanState.data.player.avatar) || '';

      var modalTitle = isBanMode ? '🚨 导出全量取证记忆卡' : '💾 导出游戏数据备份';
      var tipHtml = isBanMode ?
        ('<div class="ib-tip-box-ban">\n' +
         '  <b>📋 安全审计取证已封箱：</b><br>' +
         '  该卡片已包含本次封禁令、违规语句及全量记忆。支持导出 <b>PNG 隐写记忆卡</b>（可点击自选封面）或 <b>.json 文件</b>，导出后请发给管理员进行查房与特赦！\n' +
         '</div>') :
        ('<div class="ib-tip-box">\n' +
         '  💡 点击下方图片可<b>更换为自己的自选美图（DIY 专属存档图）</b>！导出后的图片保留原画，内部隐形嵌入了所有记忆与剧情数据。<br>' +
         '</div>');

      var mask = document.createElement('div');
      mask.className = 'ib-mask';
      mask.innerHTML = '\n' +
        '<div class="ib-card" id="ibCardNode">\n' +
        '  <div class="ib-title">' + modalTitle + '</div>\n' +
        tipHtml + '\n' +
        '  <div class="ib-preview-box" id="ibDiyBox" title="点击更换封面图片">\n' +
        '    <img id="ibPreviewImg" src="" alt="存档封面" />\n' +
        '    <div class="ib-diy-hint">📷 点击自选封面图</div>\n' +
        '  </div>\n' +
        '  <input type="file" id="ibDiyFileInput" accept="image/*" style="display:none;" />\n' +
        '  <div class="ib-btn-list">\n' +
        '    <button class="ib-btn-main ib-btn-purple" id="ibDownloadPngBtn">🖼️ 下载 ' + (isBanMode ? '取证 PNG 图片记忆卡' : '存档 PNG 图片') + '</button>\n' +
        '    <button class="ib-btn-main ib-btn-green" id="ibDownloadJsonBtn">📥 下载 ' + (isBanMode ? '取证标准 .json 文件' : '标准 .json 文件') + '</button>\n' +
        '    <button class="ib-btn-main ib-btn-gray" id="ibCloseModalBtn">完成并返回</button>\n' +
        '  </div>\n' +
        '</div>';
      document.body.appendChild(mask);

      var currentImgSrc = baseImgSrc;
      var cachedPngBytes = null;

      function updateCardData(src) {
        currentImgSrc = src;
        renderCardCanvas(currentImgSrc, function (canvas) {
          var dataUrl = canvas.toDataURL('image/png');
          var imgEl = mask.querySelector('#ibPreviewImg');
          if (imgEl) imgEl.src = dataUrl;

          var rawBinary = atob(dataUrl.split(',')[1]);
          var rawBytes = new Uint8Array(rawBinary.length);
          for (var i = 0; i < rawBinary.length; i++) rawBytes[i] = rawBinary.charCodeAt(i);

          cachedPngBytes = embedDataIntoPng(rawBytes, PNG_MAGIC_KEY, jsonStr);
        }, isBanMode);
      }

      updateCardData(currentImgSrc);

      // DIY 封面图片选择
      var diyBox = mask.querySelector('#ibDiyBox');
      var diyInput = mask.querySelector('#ibDiyFileInput');
      diyBox.onclick = function () { diyInput.click(); };
      diyInput.onchange = function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        var r = new FileReader();
        r.onload = function (ev) { updateCardData(ev.target.result); };
        r.readAsDataURL(f);
      };

      // 下载 PNG 图片存档
      mask.querySelector('#ibDownloadPngBtn').onclick = function () {
        if (!cachedPngBytes) { alert('正在合成图片中，请稍候 1 秒重试'); return; }
        var prefix = isBanMode ? 'MCYT取证记忆卡_' : 'MCYT存档_';
        var fName = prefix + pName + '_第' + dayNum + '天_' + Date.now() + '.png';
        downloadFile(fName, 'image/png', cachedPngBytes, isBanMode);
      };

      // 下载标准 JSON
      mask.querySelector('#ibDownloadJsonBtn').onclick = function () {
        var prefix = isBanMode ? 'MCYT取证记忆卡_' : 'MCYT存档_';
        var fName = prefix + pName + '_第' + dayNum + '天_' + Date.now() + '.json';
        downloadFile(fName, 'application/json', strToBytes(jsonStr), isBanMode);
      };

      mask.querySelector('#ibCloseModalBtn').onclick = function () {
        mask.remove();
      };
    },

    extractSaveFromPngBytes: function (pngBytes) {
      var jsonStr = extractDataFromPng(pngBytes, PNG_MAGIC_KEY);
      if (!jsonStr) throw new Error('该图片不包含嵌入的存档数据');
      return JSON.parse(jsonStr);
    }
  };
})();