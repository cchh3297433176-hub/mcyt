// ==========================================
// 11-image-backup.js
// 完美支持：原生本地文件直接下载 (.json) + 防截断轻量压缩存档码双轨系统
// ==========================================
(function () {
  'use strict';

  var MAGIC_TXT_HEADER = 'MCYTB64:';

  // 1. 注入弹窗 UI 样式
  function ensureStyles() {
    if (document.getElementById('ib-backup-styles')) return;
    var style = document.createElement('style');
    style.id = 'ib-backup-styles';
    style.innerHTML = '\n' +
      '.ib-mask { position: fixed; z-index: 999999; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }\n' +
      '.ib-card { background: #ffffff; border-radius: 16px; width: 100%; max-width: 360px; padding: 20px; box-sizing: border-box; text-align: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.35); max-height: 90vh; overflow-y: auto; }\n' +
      '.ib-title { font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 12px; }\n' +
      '.ib-tip-box { font-size: 13px; color: #1e40af; font-weight: 500; background: #eff6ff; border: 1px dashed #60a5fa; border-radius: 10px; padding: 12px; margin-bottom: 16px; line-height: 1.5; text-align: left; }\n' +
      '.ib-btn-list { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }\n' +
      '.ib-btn-main { width: 100%; padding: 13px 0; border: none; border-radius: 10px; font-size: 14px; font-weight: bold; cursor: pointer; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }\n' +
      '.ib-btn-main:active { opacity: 0.85; }\n' +
      '.ib-btn-green { background: #16a34a; color: #ffffff; box-shadow: 0 4px 12px rgba(22,163,74,0.25); }\n' +
      '.ib-btn-blue { background: #2563eb; color: #ffffff; box-shadow: 0 4px 12px rgba(37,99,235,0.25); }\n' +
      '.ib-btn-gray { background: #f1f5f9; color: #475569; margin-top: 4px; }\n';
    document.head.appendChild(style);
  }

  // 2. 纯原生高效 LZ-String 文本压缩引擎
  var LZ = {
    compressToBase64: function(r){if(null==r)return"";var e=LZ._compress(r,6,function(r){return"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(r)});switch(e.length%4){default:case 0:return e;case 1:return e+"===";case 2:return e+"==";case 3:return e+"="}},
    decompressFromBase64: function(r){return null==r?"":""===r?null:LZ._decompress(r.length,32,function(e){return"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".indexOf(r.charAt(e))})},
    _compress: function(r,e,t){if(null==r)return"";var n,o,a={},u={},i="",c="",s="",f=2,l=3,p=2,h=[],v=0,d=0,w;for(w=0;w<r.length;w+=1){if(i=r.charAt(w),!Object.prototype.hasOwnProperty.call(a,i)){a[i]=l++;u[i]=!0}c=s+i;if(Object.prototype.hasOwnProperty.call(a,c))s=c;else{if(Object.prototype.hasOwnProperty.call(u,s)){if(s.charCodeAt(0)<256){for(n=0;n<p;n++){v=v<<1;d===e-1?(d=0,h.push(t(v)),v=0):d++}o=s.charCodeAt(0);for(n=0;n<8;n++){v=v<<1|1&o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o>>=1}}else{o=1;for(n=0;n<p;n++){v=v<<1|o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o=0}o=s.charCodeAt(0);for(n=0;n<16;n++){v=v<<1|1&o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o>>=1}}f--;0===f&&(f=Math.pow(2,p),p++);delete u[s]}else{o=a[s];for(n=0;n<p;n++){v=v<<1|1&o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o>>=1}}f--;0===f&&(f=Math.pow(2,p),p++);a[c]=l++;s=String(i)}}if(""!==s){if(Object.prototype.hasOwnProperty.call(u,s)){if(s.charCodeAt(0)<256){for(n=0;n<p;n++){v=v<<1;d===e-1?(d=0,h.push(t(v)),v=0):d++}o=s.charCodeAt(0);for(n=0;n<8;n++){v=v<<1|1&o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o>>=1}}else{o=1;for(n=0;n<p;n++){v=v<<1|o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o=0}o=s.charCodeAt(0);for(n=0;n<16;n++){v=v<<1|1&o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o>>=1}}f--;0===f&&(f=Math.pow(2,p),p++);delete u[s]}else{o=a[s];for(n=0;n<p;n++){v=v<<1|1&o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o>>=1}}f--;0===f&&(f=Math.pow(2,p),p++)}o=2;for(n=0;n<p;n++){v=v<<1|1&o;d===e-1?(d=0,h.push(t(v)),v=0):d++;o>>=1}for(;;){if(v=v<<1,d===e-1){h.push(t(v));break}d++}return h.join("")},
    _decompress: function(r,e,t){var n,o,a,u,i,c,s,f=[],l=4,p=4,h=3,v="",d=[],w,g,B={val:t(0),position:e,index:1};for(n=0;3>n;n+=1)f[n]=n;a=0;i=Math.pow(2,2);c=1;for(;c!=i;){u=B.val&B.position;B.position>>=1;0===B.position&&(B.position=e,B.val=t(B.index++));a|=(u>0?1:0)*c;c<<=1}switch(a){case 0:a=0;i=Math.pow(2,8);c=1;for(;c!=i;){u=B.val&B.position;B.position>>=1;0===B.position&&(B.position=e,B.val=t(B.index++));a|=(u>0?1:0)*c;c<<=1}g=String.fromCharCode(a);break;case 1:a=0;i=Math.pow(2,16);c=1;for(;c!=i;){u=B.val&B.position;B.position>>=1;0===B.position&&(B.position=e,B.val=t(B.index++));a|=(u>0?1:0)*c;c<<=1}g=String.fromCharCode(a);break;case 2:return""}f[3]=g;w=g;d.push(g);for(;;){if(B.index>r)return"";a=0;i=Math.pow(2,h);c=1;for(;c!=i;){u=B.val&B.position;B.position>>=1;0===B.position&&(B.position=e,B.val=t(B.index++));a|=(u>0?1:0)*c;c<<=1}switch(g=a){case 0:a=0;i=Math.pow(2,8);c=1;for(;c!=i;){u=B.val&B.position;B.position>>=1;0===B.position&&(B.position=e,B.val=t(B.index++));a|=(u>0?1:0)*c;c<<=1}f[p++]=String.fromCharCode(a);g=p-1;l--;break;case 1:a=0;i=Math.pow(2,16);c=1;for(;c!=i;){u=B.val&B.position;B.position>>=1;0===B.position&&(B.position=e,B.val=t(B.index++));a|=(u>0?1:0)*c;c<<=1}f[p++]=String.fromCharCode(a);g=p-1;l--;break;case 2:return d.join("")}0===l&&(l=Math.pow(2,h),h++);if(f[g])v=f[g];else{if(g!==p)return null;v=w+w.charAt(0)}d.push(v);f[p++]=w+v.charAt(0);l--;w=v;0===l&&(l=Math.pow(2,h),h++)}}
  };

  // 触发原生文件下载
  function triggerFileDownload(fileName, jsonStr) {
    try {
      var base64Data = btoa(unescape(encodeURIComponent(jsonStr)));
      var dataUri = 'data:application/json;base64,' + base64Data;
      var a = document.createElement('a');
      a.href = dataUri;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch(e) {
      console.error('下载触发异常', e);
      alert('下载触发失败：' + e.message);
    }
  }

  // ================= 核心面板入口 =================
  window.ImageBackup = {
    startGenerateBackupWithModal: function (gameStateObj) {
      ensureStyles();

      var cleanState = JSON.parse(JSON.stringify(gameStateObj));
      var jsonStr = JSON.stringify(cleanState, null, 2);
      var compressedText = MAGIC_TXT_HEADER + LZ.compressToBase64(jsonStr);

      var pName = (cleanState.data && cleanState.data.player && cleanState.data.player.ytName) ? cleanState.data.player.ytName : '主播';
      var dayNum = cleanState.day || 1;
      var fileName = 'MCYT存档_第' + dayNum + '天_' + pName + '_' + Date.now() + '.json';

      var mask = document.createElement('div');
      mask.className = 'ib-mask';
      mask.innerHTML = '\n' +
        '<div class="ib-card" id="ibCardNode">\n' +
        '  <div class="ib-title">💾 导出游戏存档</div>\n' +
        '  <div class="ib-tip-box">\n' +
        '    <b>推荐方案 A：</b>点击绿色按钮直接将存档文件 (.json) 下载到手机 Download 文件夹。<br><br>\n' +
        '    <b>备用方案 B：</b>复制压缩存档码，直接粘贴至备忘录保存。\n' +
        '  </div>\n' +
        '  <div class="ib-btn-list">\n' +
        '    <button class="ib-btn-main ib-btn-green" id="ibDownloadFileBtn">📥 一键下载存档文件 (.json)</button>\n' +
        '    <button class="ib-btn-main ib-btn-blue" id="ibCopyCodeBtn">📋 一键复制极简压缩存档码</button>\n' +
        '    <button class="ib-btn-main ib-btn-gray" id="ibCloseModalBtn">完成并关闭</button>\n' +
        '  </div>\n' +
        '</div>';
      document.body.appendChild(mask);

      // 绑定一键下载文件
      mask.querySelector('#ibDownloadFileBtn').onclick = function () {
        triggerFileDownload(fileName, jsonStr);
      };

      // 绑定一键复制压缩码
      mask.querySelector('#ibCopyCodeBtn').onclick = function () {
        if (window.NativeBridge && typeof window.NativeBridge.copyText === 'function') {
          window.NativeBridge.copyText(compressedText);
          alert('✅ 压缩存档码已复制！\n\n可粘贴到微信或备忘录中备份。');
        } else {
          var ta = document.createElement('textarea');
          ta.value = compressedText;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          alert('✅ 压缩存档码已成功复制到剪贴板！');
        }
      };

      mask.querySelector('#ibCloseModalBtn').onclick = function () {
        document.body.removeChild(mask);
      };
    },

    // 解析入口：安全还原压缩存档码
    decodeBackupText: function (textStr) {
      if (!textStr || textStr.indexOf(MAGIC_TXT_HEADER) !== 0) {
        throw new Error('未识别到有效存档码');
      }
      var base64Body = textStr.substring(MAGIC_TXT_HEADER.length);
      var jsonStr = LZ.decompressFromBase64(base64Body);
      if (!jsonStr) throw new Error('存档压缩码解析失败，内容损坏');
      return JSON.parse(jsonStr);
    }
  };
})();