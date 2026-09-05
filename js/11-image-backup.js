// ==========================================
// 11-image-backup.js
// 完美解决 ToApp 限制：防截断轻量压缩存档码 + 相册原图双模恢复系统
// ==========================================
(function () {
  'use strict';

  var MAGIC_TXT_HEADER = 'MCYTB64:';
  var MAGIC_IMG_HEADER = 'MCYTBKP:';

  // 1. 注入弹窗 UI 样式（取消了图片的 HTML5 默认拖拽，保留长按菜单）
  function ensureStyles() {
    if (document.getElementById('ib-backup-styles')) return;
    var style = document.createElement('style');
    style.id = 'ib-backup-styles';
    style.innerHTML = '\n' +
      '.ib-mask { position: fixed; z-index: 999999; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }\n' +
      '.ib-card { background: #ffffff; border-radius: 16px; width: 100%; max-width: 360px; padding: 18px; box-sizing: border-box; text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.35); max-height: 90vh; overflow-y: auto; }\n' +
      '.ib-title { font-size: 17px; font-weight: bold; color: #1e293b; margin-bottom: 10px; }\n' +
      '.ib-prog-track { width: 100%; height: 10px; background: #e2e8f0; border-radius: 5px; overflow: hidden; margin: 12px 0 8px; }\n' +
      '.ib-prog-fill { height: 100%; width: 0%; background: linear-gradient(90deg, #38bdf8, #2563eb); border-radius: 5px; transition: width 0.15s ease-out; }\n' +
      '.ib-prog-text { font-size: 12px; color: #475569; font-weight: 600; display: flex; justify-content: space-between; }\n' +
      '.ib-tip-box { font-size: 12px; color: #b91c1c; font-weight: 600; background: #fef2f2; border: 1px dashed #f87171; border-radius: 8px; padding: 8px; margin-bottom: 12px; line-height: 1.5; text-align: left; }\n' +
      '.ib-img-container { width: 180px; height: 180px; margin: 0 auto 12px; border: 2px dashed #93c5fd; padding: 6px; border-radius: 12px; background: #f8fafc; display: flex; align-items: center; justify-content: center; }\n' +
      '.ib-target-img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; pointer-events: auto !important; -webkit-touch-callout: default !important; -webkit-user-select: auto !important; user-select: auto !important; display: block; }\n' +
      '.ib-btn-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }\n' +
      '.ib-btn-main { width: 100%; padding: 12px 0; border: none; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; }\n' +
      '.ib-btn-blue { background: #2563eb; color: #fff; }\n' +
      '.ib-btn-green { background: #16a34a; color: #fff; }\n' +
      '.ib-btn-gray { background: #f1f5f9; color: #475569; }\n';
    document.head.appendChild(style);
  }

  // 2. 纯原生高效 LZ-String 文本压缩引擎 (压缩版，杜绝剪贴板截断)
  var LZ = {
    compressToBase64: function(r){if(null==r)return"";var e=LZ._compress(r,6,function(r){return"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(r)});switch(e.length%4){default:case 0:return e;case 1:return e+"===";case 2:return e+"==";case 3:return e+"="}},
    decompressFromBase64: function(r){return null==r?"":""===r?null:LZ._decompress(r.length,32,function(e){return"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(r.charAt(e))})},
    _compress: function(r,e,t){if(null==r)return"";var n,o,a={},u={},i="",c="",s="",f=2,l=3,p=2,h=[],v=0,d=0,w;for(w=0;w<r.length;w+=1){if(i=r.charAt(w),!Object.prototype.hasOwnProperty.call(a,i)){a[i]=l++;u[i]=!0}c=s+i;if(Object.prototype.hasOwnProperty.call(a,c))s=c;else{if(Object.prototype.hasOwnProperty.call(u,s)){if(s.charCodeAt(0)<256){for(n=0;n<p;n++){v=v<<1;d===e-1?(d=0,h.push(t(v)),v=0):d++}o=s.charCodeAt(0);for(n=0;n<8;n++){v=v<<1|1&o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o>>=1}}else{o=1;for(n=0;n<p;n++){v=v<<1|o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o=0}o=s.charCodeAt(0);for(n=0;n<16;n++){v=v<<1|1&o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o>>=1}}f--;0===f&&(f=Math.pow(2,p),p++);delete u[s]}else{o=a[s];for(n=0;n<p;n++){v=v<<1|1&o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o>>=1}}f--;0===f&&(f=Math.pow(2,p),p++);a[c]=l++;s=String(i)}}if(""!==s){if(Object.prototype.hasOwnProperty.call(u,s)){if(s.charCodeAt(0)<256){for(n=0;n<p;n++){v=v<<1;d===e-1?(d=0,h.push(t(v)),v=0):d++}o=s.charCodeAt(0);for(n=0;n<8;n++){v=v<<1|1&o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o>>=1}}else{o=1;for(n=0;n<p;n++){v=v<<1|o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o=0}o=s.charCodeAt(0);for(n=0;n<16;n++){v=v<<1|1&o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o>>=1}}f--;0===f&&(f=Math.pow(2,p),p++);delete u[s]}else{o=a[s];for(n=0;n<p;n++){v=v<<1|1&o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o>>=1}}f--;0===f&&(f=Math.pow(2,p),p++)}o=2;for(n=0;n<p;n++){v=v<<1|1&o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o>>=1}for(;;){if(v=v<<1,d===e-1){h.push(t(v));break}d++}return h.join("")},
    _decompress: function(r,e,t){var n,o,a,u,i,c,s,f=[],l=4,p=4,h=3,v="",d=[],w,g,B={val:t(0),position:e,index:1};for(n=0;3>n;n+=1)f[n]=n;a=0;i=Math.pow(2,2);c=1;for(;c!=i;){u=B.val&B.position;B.position>>=1;0===B.position&&(B.position=e,B.val=t(B.index++));a|=(u>0?1:0)*c;c<<=1}switch(a){case 0:a=0;i=Math.pow(2,8);c=1;for(;c!=i;){u=B.val&B.position;B.position>>=1;0===B.position&&(B.position=e,B.val=t(B.index++));a|=(u>0?1:0)*c;c<<=1}g=String.fromCharCode(a);break;case 1:a=0;i=Math.pow(2,16);c=1;for(;c!=i;){u=B.val&B.position;B.position>>=1;0===B.position&&(B.position=e,B.val=t(B.index++));a|=(u>0?1:0)*c;c<<=1}g=String.fromCharCode(a);break;case 2:return""}f[3]=g;w=g;d.push(g);for(;;){if(B.index>r)return"";a=0;i=Math.pow(2,h);c=1;for(;c!=i;){u=B.val&B.position;B.position>>=1;0===B.position&&(B.position=e,B.val=t(B.index++));a|=(u>0?1:0)*c;c<<=1}switch(g=a){case 0:a=0;i=Math.pow(2,8);c=1;for(;c!=i;){u=B.val&B.position;B.position>>=1;0===B.position&&(B.position=e,B.val=t(B.index++));a|=(u>0?1:0)*c;c<<=1}f[p++]=String.fromCharCode(a);g=p-1;l--;break;case 1:a=0;i=Math.pow(2,16);c=1;for(;c!=i;){u=B.val&B.position;B.position>>=1;0===B.position&&(B.position=e,B.val=t(B.index++));a|=(u>0?1:0)*c;c<<=1}f[p++]=String.fromCharCode(a);g=p-1;l--;break;case 2:return d.join("")}0===l&&(l=Math.pow(2,h),h++);if(f[g])v=f[g];else{if(g!==p)return null;v=w+w.charAt(0)}d.push(v);f[p++]=w+v.charAt(0);l--;w=v;0===l&&(l=Math.pow(2,h),h++)}}
  };

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

  // 3. 异步分片图片编码 (保持原样，提供图片长按备份途径)
  function encodeToCanvasDataUrl(jsonStr, onProgress) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          var payloadStr = MAGIC_IMG_HEADER + jsonStr;
          onProgress(15, '转换字节流...');
          setTimeout(function () {
            var bytes = strToBytes(payloadStr);
            var dataLen = bytes.length;
            var totalPayloadLen = 4 + dataLen;
            var totalPixels = Math.ceil(totalPayloadLen / 3);
            var width = Math.ceil(Math.sqrt(totalPixels));
            var height = Math.ceil(totalPixels / width);
            var canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            var ctx = canvas.getContext('2d');
            var imgData = ctx.createImageData(width, height);
            var pixels = imgData.data;

            var fullBytes = new Uint8Array(totalPixels * 3);
            fullBytes[0] = (dataLen >> 24) & 0xff;
            fullBytes[1] = (dataLen >> 16) & 0xff;
            fullBytes[2] = (dataLen >> 8) & 0xff;
            fullBytes[3] = dataLen & 0xff;

            var bytePos = 0;
            function copyChunk() {
              var limit = Math.min(bytePos + 65536, dataLen);
              for (var i = bytePos; i < limit; i++) fullBytes[4 + i] = bytes[i];
              bytePos = limit;
              var pct = Math.floor(15 + (bytePos / dataLen) * 35);
              onProgress(pct, '生成像素...');
              if (bytePos < dataLen) setTimeout(copyChunk, 0);
              else startPixel();
            }

            function startPixel() {
              var pIdx = 0, bIdx = 0, pLen = pixels.length;
              function pxChunk() {
                var limit = Math.min(pIdx + 32768, pLen);
                for (; pIdx < limit; pIdx += 4) {
                  pixels[pIdx] = fullBytes[bIdx] || 0;
                  pixels[pIdx + 1] = fullBytes[bIdx + 1] || 0;
                  pixels[pIdx + 2] = fullBytes[bIdx + 2] || 0;
                  pixels[pIdx + 3] = 255;
                  bIdx += 3;
                }
                var pct = Math.floor(50 + (pIdx / pLen) * 45);
                onProgress(pct, '渲染画面...');
                if (pIdx < pLen) setTimeout(pxChunk, 0);
                else {
                  ctx.putImageData(imgData, 0, 0);
                  onProgress(98, '完成编码...');
                  setTimeout(function () {
                    resolve(canvas.toDataURL('image/png'));
                  }, 20);
                }
              }
              pxChunk();
            }
            copyChunk();
          }, 20);
        } catch (e) { reject(e); }
      }, 20);
    });
  }

  // 4. 解析图片存档
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
        var dataLen = ((fullBytes[0] << 24) >>> 0) + (fullBytes[1] << 16) + (fullBytes[2] << 8) + fullBytes[3];
        if (dataLen <= 0 || dataLen > fullBytes.length - 4) throw new Error('无效的备份图');

        var payloadBytes = new Uint8Array(dataLen);
        for (var i = 0; i < dataLen; i++) payloadBytes[i] = fullBytes[4 + i];

        var decodedStr = bytesToStr(payloadBytes);
        if (decodedStr.indexOf(MAGIC_IMG_HEADER) !== 0) throw new Error('未识别到存档标记');

        var jsonBody = decodedStr.substring(MAGIC_IMG_HEADER.length);
        callback(null, JSON.parse(jsonBody));
      } catch (err) {
        callback(err, null);
      }
    };
    img.onerror = function () { callback(new Error('图片读取失败'), null); };
    img.src = dataUrl;
  }

  // ================= 核心面板入口 =================
  window.ImageBackup = {
    startGenerateBackupWithModal: function (gameStateObj) {
      ensureStyles();

      var mask = document.createElement('div');
      mask.className = 'ib-mask';
      mask.innerHTML = '\n' +
        '<div class="ib-card" id="ibCardNode">\n' +
        '  <div class="ib-title">⏳ 正在编码备份文件</div>\n' +
        '  <div class="ib-prog-text">\n' +
        '    <span>处理进度</span><span id="ibProgVal">0%</span>\n' +
        '  </div>\n' +
        '  <div class="ib-prog-track"><div class="ib-prog-fill" id="ibProgFill"></div></div>\n' +
        '  <div id="ibProgMsg" style="font-size:11px;color:#64748b;">准备中...</div>\n' +
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

      // 开始处理数据流
      setTimeout(function () {
        var cleanState = JSON.parse(JSON.stringify(gameStateObj));
        var jsonStr = JSON.stringify(cleanState);
        
        // 核心一：生成 LZ-String 高压缩安全文本防截断
        updateProgress(5, '生成高压缩安全码...');
        var compressedText = MAGIC_TXT_HEADER + LZ.compressToBase64(jsonStr);

        // 核心二：并行生成 PNG 像素图片
        encodeToCanvasDataUrl(jsonStr, updateProgress).then(function (dataUrl) {
          var card = mask.querySelector('#ibCardNode');
          card.innerHTML = '\n' +
            '<div class="ib-title">💾 备份处理完成</div>\n' +
            '<div class="ib-tip-box">\n' +
            '  <b>👉 方案A【推荐】：点击复制下方按钮</b>，把一串安全码发送给微信/文件助手。完全无视系统下载拦截！<br><br>\n' +
            '  <b>👉 方案B：长按下方图片</b>，如果系统允许则选择【保存到手机相册】。\n' +
            '</div>\n' +
            '<div class="ib-btn-list">\n' +
            '  <button class="ib-btn-main ib-btn-blue" id="ibCopyCodeBtn">📋 一键复制极简压缩存档码</button>\n' +
            '</div>\n' +
            '<div class="ib-img-container" style="margin-top:12px;">\n' +
            '  <img src="' + dataUrl + '" class="ib-target-img" alt="备份图" draggable="false" ondragstart="return false;" />\n' +
            '</div>\n' +
            '<div class="ib-btn-list">\n' +
            '  <button class="ib-btn-main ib-btn-gray" id="ibCloseModalBtn">完成并关闭</button>\n' +
            '</div>';

          // 绑定一键复制功能（因为高度压缩，绝对不会截断）
          card.querySelector('#ibCopyCodeBtn').onclick = function () {
            if (window.NativeBridge && typeof window.NativeBridge.copyText === 'function') {
              window.NativeBridge.copyText(compressedText);
              alert('✅ 压缩存档码已复制！\n\n请立刻打开手机的【备忘录】或【微信文件传输助手】粘贴保存即可。恢复时直接粘贴这串代码！');
            } else {
              var ta = document.createElement('textarea');
              ta.value = compressedText;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              document.body.removeChild(ta);
              alert('✅ 已复制压缩码！\n\n请粘贴至备忘录妥善保存。');
            }
          };

          card.querySelector('#ibCloseModalBtn').onclick = function () {
            document.body.removeChild(mask);
          };

        }).catch(function (err) {
          alert('生成失败: ' + (err ? err.message : '未知错误'));
          document.body.removeChild(mask);
        });
      }, 50);
    },

    // 解析入口：自动判断是传来的 Base64 文本还是 Image 图片
    decodeBackupText: function (textStr) {
      if (!textStr || textStr.indexOf(MAGIC_TXT_HEADER) !== 0) {
        throw new Error('未识别到压缩存档头，请确认粘贴内容是否完整');
      }
      var base64Body = textStr.substring(MAGIC_TXT_HEADER.length);
      var jsonStr = LZ.decompressFromBase64(base64Body);
      if (!jsonStr) throw new Error('存档压缩码解析失败，内容可能被截断损坏');
      return JSON.parse(jsonStr);
    },

    decodeDataUrlToSave: decodeDataUrlToSave
  };
})();