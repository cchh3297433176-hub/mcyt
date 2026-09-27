/**
 * js/system/asr-engine.js
 * 云端极速语音识别（ASR）中枢引擎
 * 直连私有云端 faster-whisper 极速接口（默认免门禁全员可用），
 * 彻底摆脱本地 WASM 性能瓶颈与内存限制。
 * 无缝对接悬浮球错误雷达（window.recordSystemError）。
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_CONFIG = 'mcyt_asr_config';
  const STORAGE_KEY_DEVICE_ID = 'mcyt_device_uuid';

  // 兼容旧版本地模型管理的存储键（保留空壳，避免旧逻辑报错）
  const DEFAULT_LOCAL_MODEL_ID = 'cloud_whisper_fast';
  const DEFAULT_LOCAL_MODEL_META = {
    id: DEFAULT_LOCAL_MODEL_ID,
    name: '云端 faster-whisper 极速转写',
    path: 'http://121.43.122.253:8000',
    sizeFormatted: '云端免下载',
    isBuiltin: true,
    createdAt: new Date().toISOString()
  };

  class AsrEngine {
    constructor() {
      this.isSupported = null;

      // 配置项：默认指向私有云端接口，全员默认免卡密直接通行
      this.config = {
        enabled: true,
        serverUrl: 'http://121.43.122.253:8000',
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
     * 读取引擎配置
     */
    async loadConfig() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
        if (saved) {
          this.config = Object.assign(this.config, JSON.parse(saved));
        }
      } catch (e) {
        console.warn('[ASR Engine] 读取配置失败:', e);
      }
      return this.config;
    }

    /**
     * 保存引擎配置
     */
    async saveConfig(newConfig = {}) {
      try {
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
      const serverUrl = (this.config.serverUrl || 'http://121.43.122.253:8000').replace(/\/+$/, '');
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

      const serverUrl = (this.config.serverUrl || 'http://121.43.122.253:8000').replace(/\/+$/, '');
      const accessCode = (options.accessCode || this.config.accessCode || 'PUBLIC_FREE').trim();
      const deviceId = this.getDeviceId();
      const language = options.language || this.config.language || 'zh';

      const audioBlob = await this._toUploadBlob(audioData);
      if (!audioBlob || audioBlob.size < 400) {
        console.warn('[ASR Engine] 录制音频过短或无有效声波');
        return '';
      }

      // 双向兼容 FormData 参数名（既传 audio 也传 file，既传 accessCode 也传 access_code）
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
          new Promise((_, reject) => setTimeout(() => reject(new Error('云端转录超时(12s)，请检查网络连接')), 12000))
        ]);

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          const detailMsg = data?.detail || `识别接口返回错误 (HTTP ${resp.status})`;
          throw new Error(detailMsg);
        }

        const recognizedText = String(data?.text || '').trim();
        return recognizedText;
      } catch (err) {
        console.error('[ASR Engine] 云端转录异常:', err);
        if (typeof window.recordSystemError === 'function') {
          window.recordSystemError('云端ASR识别', err, { serverUrl });
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
