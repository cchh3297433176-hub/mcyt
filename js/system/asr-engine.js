/**
 * js/system/asr-engine.js
 * 云端极速语音识别（ASR）中枢引擎
 * 直连私有云端 faster-whisper 极速接口（默认免门禁全员可用），
 * 具备 URL 智能协议纠错防呆与报错脱敏防泄密机制。
 * 无缝对接悬浮球错误雷达（window.recordSystemError）。
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_CONFIG = 'mcyt_asr_config';
  const STORAGE_KEY_DEVICE_ID = 'mcyt_device_uuid';

  // 默认私有服务地址
  const DEFAULT_REMOTE_ASR_URL = 'http://43.142.9.188:8000';

  /**
   * 自动清洗并规范化服务器 URL（彻底杜绝 http://http:// 恶性拼接）
   */
  function sanitizeServerUrl(url) {
    if (!url) return '';
    let clean = String(url).trim();
    // 抹除重复协议头，如 http://http:// 或 https://http://
    clean = clean.replace(/^(https?:\/\/)+/i, '');
    clean = clean.replace(/\/+$/, '');
    return clean ? ('http://' + clean) : '';
  }

  /**
   * 错误脱敏过滤器：将 IP 和敏感端口替换为安全掩码，严防报错弹窗泄露 VPS
   */
  function maskSensitiveUrl(rawUrl) {
    if (!rawUrl) return '[Cloud Service]';
    return String(rawUrl).replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b/g, '[Cloud ASR Node]');
  }

  // 兼容旧版本地模型管理的存储键（保留空壳，避免旧逻辑报错）
  const DEFAULT_LOCAL_MODEL_ID = 'cloud_whisper_fast';
  const DEFAULT_LOCAL_MODEL_META = {
    id: DEFAULT_LOCAL_MODEL_ID,
    name: '云端 faster-whisper 极速转写',
    path: DEFAULT_REMOTE_ASR_URL,
    sizeFormatted: '云端免下载',
    isBuiltin: true,
    createdAt: new Date().toISOString()
  };

  class AsrEngine {
    constructor() {
      this.isSupported = null;

      // 配置项：全员默认免卡密直接通行
      this.config = {
        enabled: true,
        serverUrl: DEFAULT_REMOTE_ASR_URL,
        language: 'zh',
        accessCode: 'PUBLIC_FREE'
      };

      this._deviceId = null;
    }

    /**
     * 基础环境支持检测
     */
    async checkSupport() {
      if (this.isSupported !== null) return this.isSupported;
      try {
        const hasFetch = typeof window.fetch === 'function';
        const hasFormData = typeof window.FormData === 'function';
        this.isSupported = !!(hasFetch && hasFormData);
      } catch (e) {
        this.isSupported = false;
      }
      return this.isSupported;
    }

    /**
     * 读取引擎配置（自动修正历史缓存中的异常协议）
     */
    async loadConfig() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.serverUrl) {
            parsed.serverUrl = sanitizeServerUrl(parsed.serverUrl);
          }
          this.config = Object.assign(this.config, parsed);
        }
      } catch (e) {
        console.warn('[ASR Engine] 读取配置失败:', e);
      }
      this.config.serverUrl = sanitizeServerUrl(this.config.serverUrl || DEFAULT_REMOTE_ASR_URL);
      return this.config;
    }

    /**
     * 保存引擎配置
     */
    async saveConfig(newConfig = {}) {
      try {
        if (newConfig.serverUrl) {
          newConfig.serverUrl = sanitizeServerUrl(newConfig.serverUrl);
        }
        this.config = Object.assign(this.config, newConfig);
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(this.config));
        return true;
      } catch (e) {
        console.error('[ASR Engine] 保存配置失败:', e);
        return false;
      }
    }

    /**
     * 获取（或生成并持久化）设备唯一标识
     */
    getDeviceId() {
      if (this._deviceId) return this._deviceId;
      try {
        let id = localStorage.getItem(STORAGE_KEY_DEVICE_ID);
        if (!id) {
          id = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2);
          localStorage.setItem(STORAGE_KEY_DEVICE_ID, id);
        }
        this._deviceId = id;
        return id;
      } catch (e) {
        return 'device_public_client';
      }
    }

    /**
     * 口令验证（保持向下兼容，不卡任何用户）
     */
    async verifyAccessCode(accessCode) {
      const code = (accessCode || this.config.accessCode || 'PUBLIC_FREE').trim();
      const serverUrl = sanitizeServerUrl(this.config.serverUrl || DEFAULT_REMOTE_ASR_URL);
      const deviceId = this.getDeviceId();

      try {
        const resp = await fetch(serverUrl + '/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode: code, deviceId })
        });
        const data = await resp.json().catch(() => ({}));
        if (resp.ok) {
          await this.saveConfig({ accessCode: code });
          return data;
        }
      } catch (_) {}
      
      await this.saveConfig({ accessCode: code });
      return { ok: true, status: 'bypassed' };
    }

    /**
     * 兼容保留函数
     */
    async getModelsList() {
      return [DEFAULT_LOCAL_MODEL_META];
    }

    async getActiveModelMeta() {
      return DEFAULT_LOCAL_MODEL_META;
    }

    async setActiveModel() {
      return DEFAULT_LOCAL_MODEL_META;
    }

    async importModelFromFile() {
      return true;
    }

    async removeModel() {
      return true;
    }

    /**
     * 将各种音频输入格式统一转换为可上传的 Blob
     */
    async _toUploadBlob(audioSource) {
      if (audioSource instanceof Blob) {
        return audioSource;
      }
      if (audioSource instanceof ArrayBuffer) {
        return new Blob([audioSource], { type: 'audio/webm' });
      }
      if (typeof audioSource === 'string' && audioSource.startsWith('data:')) {
        const mimeMatch = audioSource.match(/^data:(.*?);base64,/);
        const mime = mimeMatch ? mimeMatch[1] : 'audio/webm';
        const base64Data = audioSource.split(',')[1];
        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        return new Blob([bytes], { type: mime });
      }
      throw new Error('不支持的音频数据格式');
    }

    /**
     * 语音转文字（全员默认放行，直接提交云端 fast-whisper）
     */
    async transcribe(audioData, options = {}) {
      if (!this.config.enabled) {
        return '';
      }

      const isSupported = await this.checkSupport();
      if (!isSupported) {
        throw new Error('当前环境缺少网络组件，无法发起语音识别');
      }

      // 获取安全清洗后的目标地址
      const serverUrl = sanitizeServerUrl(this.config.serverUrl || DEFAULT_REMOTE_ASR_URL);
      const accessCode = (options.accessCode || this.config.accessCode || 'PUBLIC_FREE').trim();
      const deviceId = this.getDeviceId();
      const language = options.language || this.config.language || 'zh';

      const audioBlob = await this._toUploadBlob(audioData);
      if (!audioBlob || audioBlob.size < 400) {
        console.warn('[ASR Engine] 录制音频过短或无有效声波');
        return '';
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('accessCode', accessCode);
      formData.append('access_code', accessCode);
      formData.append('deviceId', deviceId);
      formData.append('device_id', deviceId);
      formData.append('language', language);

      try {
        const resp = await Promise.race([
          fetch(serverUrl + '/api/asr/transcribe', {
            method: 'POST',
            body: formData
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('云端转录超时(25s)，请检查网络连接')), 25000))
        ]);

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          const detailMsg = data?.detail || `识别接口返回错误 (HTTP ${resp.status})`;
          throw new Error(detailMsg);
        }

        const recognizedText = String(data?.text || '').trim();
        return recognizedText;
      } catch (err) {
        console.error('[ASR Engine] 云端转录异常');
        // 报错脱敏上报：向悬浮球传递安全掩码，绝对不暴露真实服务器 IP
        if (typeof window.recordSystemError === 'function') {
          const safeServerInfo = maskSensitiveUrl(serverUrl);
          window.recordSystemError('云端ASR识别', err, { serverUrl: safeServerInfo });
        }
        throw err;
      }
    }
  }

  window.mcytAsr = new AsrEngine();

  window.addEventListener('DOMContentLoaded', () => {
    window.mcytAsr.loadConfig();
  });

})(window);
