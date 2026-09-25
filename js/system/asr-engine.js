/**
 * js/system/asr-engine.js
 * 云端极速语音识别（ASR）中枢引擎
 * 改为直连私有云端接口（faster-whisper + 一机一口令防盗核销），
 * 彻底摆脱本地 WASM 单线程性能瓶颈与 SharedArrayBuffer 内存限制。
 * 无缝对接悬浮球错误雷达（window.recordSystemError）。
 */

(function (window) {
  'use strict';

  const STORAGE_KEY_CONFIG = 'mcyt_asr_config';
  const STORAGE_KEY_DEVICE_ID = 'mcyt_device_uuid';

  // 兼容旧版本地模型管理的存储键（保留，避免设置页旧入口调用报错）
  const STORAGE_KEY_MODELS_META_LIST = 'mcyt_asr_models_meta_list';
  const STORAGE_KEY_BINARY_PREFIX = 'mcyt_asr_model_bin_';
  const DEFAULT_LOCAL_MODEL_ID = 'builtin_whisper_tiny';
  const DEFAULT_LOCAL_MODEL_META = {
    id: DEFAULT_LOCAL_MODEL_ID,
    name: 'Whisper-Tiny (本地预置/ONNX量化版，已停用)',
    path: 'models/whisper',
    sizeFormatted: '约 75 MB',
    isBuiltin: true,
    createdAt: new Date().toISOString()
  };

  class AsrEngine {
    constructor() {
      this.isSupported = null;

      // 配置项：serverUrl 默认指向私有云端极速接口
      this.config = {
        enabled: true,
        serverUrl: 'http://121.43.122.253:8000',
        language: 'zh',
        accessCode: ''
      };

      this._deviceId = null;
    }

    /**
     * 基础环境支持检测（云端版仅需 fetch 与录音能力，无需 WASM/SharedArrayBuffer）
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
     * 获取（或首次生成并持久化）本机设备唯一标识
     * WebView 环境下没有原生 Android ID 通道，退而采用生成后持久保存的 UUID，
     * 效果等同：卸载重装前，同一台设备始终使用同一个 deviceId 完成口令绑定。
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
        console.error('[ASR Engine] 生成设备标识失败:', e);
        return 'unknown_device';
      }
    }

    /**
     * 向云端校验口令 / 完成首次设备绑定
     * 返回 { ok, status } 或抛出错误（口令不存在 / 已绑定其他设备）
     */
    async verifyAccessCode(accessCode) {
      const code = (accessCode || this.config.accessCode || '').trim();
      if (!code) throw new Error('请先输入激活口令');

      const serverUrl = this.config.serverUrl || 'http://121.43.122.253:8000';
      const deviceId = this.getDeviceId();

      const resp = await fetch(serverUrl + '/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: code, deviceId })
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg = data?.detail || '口令验证失败';
        throw new Error(msg);
      }

      // 验证成功后落盘保存，后续识别请求直接复用
      await this.saveConfig({ accessCode: code });
      return data;
    }

    /**
     * 兼容保留：旧版本地模型列表（云端版下不再实际使用）
     */
    async getModelsList() {
      return [DEFAULT_LOCAL_MODEL_META];
    }

    async getActiveModelMeta() {
      return DEFAULT_LOCAL_MODEL_META;
    }

    async setActiveModel() {
      console.warn('[ASR Engine] 已切换为云端识别，本地模型切换功能不再生效');
      return DEFAULT_LOCAL_MODEL_META;
    }

    async importModelFromFile() {
      throw new Error('已切换为云端识别，不再支持导入本地模型');
    }

    async removeModel() {
      return true;
    }

    /**
     * 将各种音频输入格式统一转换为可直接上传的 Blob
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
     * 语音转文字（改为直连云端 faster-whisper 接口）
     */
    async transcribe(audioData, options = {}) {
      if (!this.config.enabled) {
        return '';
      }

      const isSupported = await this.checkSupport();
      if (!isSupported) {
        throw new Error('当前环境不支持网络语音识别所需的基础能力');
      }

      const accessCode = (options.accessCode || this.config.accessCode || '').trim();
      if (!accessCode) {
        throw new Error('尚未激活语音识别口令，请先在设置中输入口令');
      }

      const serverUrl = this.config.serverUrl || 'http://121.43.122.253:8000';
      const deviceId = this.getDeviceId();
      const language = options.language || this.config.language || 'auto';

      const audioBlob = await this._toUploadBlob(audioData);
      if (!audioBlob || audioBlob.size < 500) {
        console.warn('[ASR Engine] 录制音频过短，略过识别');
        return '';
      }

      const formData = new FormData();
      formData.append('accessCode', accessCode);
      formData.append('deviceId', deviceId);
      formData.append('language', language);
      formData.append('audio', audioBlob, 'audio.webm');

      try {
        const resp = await Promise.race([
          fetch(serverUrl + '/api/asr/transcribe', {
            method: 'POST',
            body: formData
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时，请检查网络或稍后重试')), 15000))
        ]);

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          const msg = data?.detail || `云端识别失败（HTTP ${resp.status}）`;
          throw new Error(msg);
        }

        return String(data?.text || '').trim();
      } catch (err) {
        console.error('[ASR Engine] transcribe 云端识别异常:', err);
        if (typeof window.recordSystemError === 'function') {
          window.recordSystemError('ASR推理', err, { serverUrl });
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
