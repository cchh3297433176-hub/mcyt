/**
 * js/system/asr-engine.js
 * 本地离线语音识别（ASR）中枢引擎
 * 基于 whisper.wasm 与 IndexedDB 构建，支持多模型本地库管理、自由切换与全离线运行
 */

(function (window) {
  'use strict';

  // IndexedDB 存储键名规范
  const STORAGE_KEY_MODELS_META_LIST = 'mcyt_asr_models_meta_list';
  const STORAGE_KEY_BINARY_PREFIX = 'mcyt_asr_model_bin_';
  const STORAGE_KEY_CONFIG = 'mcyt_asr_config';

  // 默认 CDN 脚本地址
  const DEFAULT_WASM_ESM_URL = 'https://cdn.jsdelivr.net/npm/@timur00kh/whisper.wasm@canary/dist/index.es.js';

  class AsrEngine {
    constructor() {
      this.isSupported = null;
      this.isInitialized = false;
      this.isLoading = false;
      this.whisperInstance = null;
      this.audioContext = null;

      // 配置项
      this.config = {
        enabled: true,
        activeModelId: '',
        language: 'zh', // 默认识别中文，传 'auto' 为自动检测
        translate: false,
        wasmUrl: DEFAULT_WASM_ESM_URL
      };

      this._initPromise = null;
    }

    /**
     * 基础环境支持检测
     */
    async checkSupport() {
      if (this.isSupported !== null) return this.isSupported;
      try {
        const hasWasm = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
        const hasAudio = typeof (window.AudioContext || window.webkitAudioContext) === 'function';
        const hasLocalforage = typeof window.localforage !== 'undefined';
        this.isSupported = !!(hasWasm && hasAudio && hasLocalforage);
      } catch (e) {
        this.isSupported = false;
      }
      return this.isSupported;
    }

    /**
     * 读取离线引擎配置
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
     * 保存离线引擎配置
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
     * 获取已缓存的本地模型列表
     */
    async getModelsList() {
      try {
        if (!window.localforage) return [];
        const list = await window.localforage.getItem(STORAGE_KEY_MODELS_META_LIST);
        return Array.isArray(list) ? list : [];
      } catch (e) {
        console.error('[ASR Engine] 读取模型列表失败:', e);
        return [];
      }
    }

    /**
     * 获取当前生效的模型元信息
     */
    async getActiveModelMeta() {
      const list = await this.getModelsList();
      if (list.length === 0) return null;
      let active = list.find(m => m.id === this.config.activeModelId);
      if (!active) {
        active = list[0];
        this.config.activeModelId = active.id;
        await this.saveConfig();
      }
      return active;
    }

    /**
     * 切换当前生效的模型
     */
    async setActiveModel(modelId) {
      const list = await this.getModelsList();
      const target = list.find(m => m.id === modelId);
      if (!target) throw new Error('未找到指定的模型');

      this.config.activeModelId = modelId;
      await this.saveConfig();

      // 重置实例以便重新载入
      this.isInitialized = false;
      this.whisperInstance = null;
      return target;
    }

    /**
     * 导入用户提供的本地模型文件 (.bin)
     * @param {File} file 用户从文件选择器选取的 .bin 文件
     * @param {Function} onProgress 进度回调 (0 ~ 100, msg)
     */
    async importModelFromFile(file, onProgress) {
      if (!file) throw new Error('未提供有效的文件对象');

      const isSupported = await this.checkSupport();
      if (!isSupported) {
        throw new Error('当前运行环境不支持 WebAssembly 或缺少必要的音频组件');
      }

      onProgress?.(10, '正在读取模型文件...');

      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round(10 + (e.loaded / e.total) * 40);
            onProgress?.(percent, `正在载入文件: ${Math.round((e.loaded / 1024 / 1024) * 10) / 10}MB`);
          }
        };

        reader.onload = async () => {
          try {
            const buffer = reader.result;
            if (!buffer || buffer.byteLength < 1024 * 1024) {
              throw new Error('模型文件过小或无效，请确认导入的是 whisper ggml 格式模型');
            }

            onProgress?.(60, '正在写入安全存储...');

            const modelId = 'model_' + Date.now() + '_' + Math.floor(Math.random() * 899 + 100);
            const binaryKey = STORAGE_KEY_BINARY_PREFIX + modelId;

            // 存储二进制文件数据
            await window.localforage.setItem(binaryKey, buffer);

            const meta = {
              id: modelId,
              name: file.name,
              size: buffer.byteLength,
              sizeFormatted: (buffer.byteLength / (1024 * 1024)).toFixed(2) + ' MB',
              binaryKey: binaryKey,
              createdAt: new Date().toISOString()
            };

            const list = await this.getModelsList();
            list.push(meta);
            await window.localforage.setItem(STORAGE_KEY_MODELS_META_LIST, list);

            // 默认激活最新导入的模型
            this.config.activeModelId = modelId;
            await this.saveConfig();

            onProgress?.(90, '正在重置识别引擎...');
            this.isInitialized = false;
            this.whisperInstance = null;

            onProgress?.(100, '模型导入并装配成功！');
            resolve(meta);
          } catch (err) {
            reject(err);
          }
        };

        reader.onerror = () => {
          reject(new Error('读取本地模型文件时发生错误'));
        };

        reader.readAsArrayBuffer(file);
      });
    }

    /**
     * 删除指定的本地模型
     */
    async removeModel(modelId) {
      try {
        if (!window.localforage) return false;
        const list = await this.getModelsList();
        const target = list.find(m => m.id === modelId);
        if (!target) return false;

        // 移除二进制数据
        await window.localforage.removeItem(target.binaryKey);

        // 从列表中移除
        const updatedList = list.filter(m => m.id !== modelId);
        await window.localforage.setItem(STORAGE_KEY_MODELS_META_LIST, updatedList);

        if (this.config.activeModelId === modelId) {
          this.config.activeModelId = updatedList.length > 0 ? updatedList[0].id : '';
          await this.saveConfig();
          this.isInitialized = false;
          this.whisperInstance = null;
        }

        return true;
      } catch (e) {
        console.error('[ASR Engine] 删除模型失败:', e);
        return false;
      }
    }

    /**
     * 动态加载 whisper-wasm 库
     */
    async _loadWhisperModule() {
      if (window.WhisperWasmService && window.ModelManager) {
        return {
          WhisperWasmService: window.WhisperWasmService,
          ModelManager: window.ModelManager
        };
      }

      try {
        const esmModule = await import(this.config.wasmUrl);
        return esmModule;
      } catch (err) {
        console.error('[ASR Engine] 加载 whisper.wasm ESM 失败:', err);
        throw new Error('未能成功加载 whisper.wasm 核心库，请检查网络或离线引用');
      }
    }

    /**
     * 初始化引擎与模型到内存中
     */
    async initEngine(onProgress) {
      if (this.isInitialized && this.whisperInstance) {
        return true;
      }

      if (this.isLoading && this._initPromise) {
        return this._initPromise;
      }

      this.isLoading = true;

      this._initPromise = (async () => {
        try {
          const isSupported = await this.checkSupport();
          if (!isSupported) {
            throw new Error('当前环境缺少 WebAssembly 支持');
          }

          const activeMeta = await this.getActiveModelMeta();
          if (!activeMeta) {
            throw new Error('本地尚未导入语音识别模型，请前往设置中心导入');
          }

          onProgress?.(15, '正在装载 whisper 核心库...');
          const { WhisperWasmService } = await this._loadWhisperModule();

          onProgress?.(40, '正在从本地提取离线模型...');
          const modelBuffer = await window.localforage.getItem(activeMeta.binaryKey);
          if (!modelBuffer) {
            throw new Error('模型数据块不存在或已被清理');
          }

          onProgress?.(70, '正在初始化 WASM 神经网络上下文...');
          const whisper = new WhisperWasmService({ logLevel: 1 });
          const isWasmReady = await whisper.checkWasmSupport();
          if (!isWasmReady) {
            throw new Error('whisper.wasm 环境握手失败');
          }

          const modelData = new Uint8Array(modelBuffer);
          await whisper.initModel(modelData);

          this.whisperInstance = whisper;
          this.isInitialized = true;
          this.isLoading = false;

          onProgress?.(100, '引擎就绪');
          return true;
        } catch (err) {
          this.isLoading = false;
          this.isInitialized = false;
          throw err;
        } finally {
          this._initPromise = null;
        }
      })();

      return this._initPromise;
    }

    /**
     * 将任意音频数据转换为 16kHz 单声道 Float32Array
     */
    async convertAudioTo16kPcm(audioSource) {
      let arrayBuffer;

      if (audioSource instanceof Blob) {
        arrayBuffer = await audioSource.arrayBuffer();
      } else if (audioSource instanceof ArrayBuffer) {
        arrayBuffer = audioSource;
      } else if (typeof audioSource === 'string' && audioSource.startsWith('data:')) {
        const base64Data = audioSource.split(',')[1];
        const binaryStr = atob(base64Data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        throw new Error('不支持的音频数据格式');
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const decodedBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));

      const TARGET_SAMPLE_RATE = 16000;
      if (decodedBuffer.sampleRate === TARGET_SAMPLE_RATE && decodedBuffer.numberOfChannels === 1) {
        return decodedBuffer.getChannelData(0);
      }

      const offlineCtx = new OfflineAudioContext(
        1,
        Math.ceil(decodedBuffer.duration * TARGET_SAMPLE_RATE),
        TARGET_SAMPLE_RATE
      );

      const source = offlineCtx.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(offlineCtx.destination);
      source.start(0);

      const renderedBuffer = await offlineCtx.startRendering();
      return renderedBuffer.getChannelData(0);
    }

    /**
     * 语音转文字（核心识别调用）
     * @param {Blob|ArrayBuffer|String|Float32Array} audioData 语音数据
     * @param {Object} options 临时识别参数
     */
    async transcribe(audioData, options = {}) {
      if (!this.config.enabled) {
        return '';
      }

      if (!this.isInitialized) {
        await this.initEngine();
      }

      let pcm16k;
      if (audioData instanceof Float32Array) {
        pcm16k = audioData;
      } else {
        pcm16k = await this.convertAudioTo16kPcm(audioData);
      }

      const language = options.language || this.config.language || 'zh';
      const translate = typeof options.translate === 'boolean' ? options.translate : this.config.translate;

      const result = await this.whisperInstance.transcribe(pcm16k, undefined, {
        language: language,
        translate: translate
      });

      if (!result || !result.segments) {
        return '';
      }

      const fullText = result.segments.map((s) => s.text).join('').trim();
      return fullText;
    }
  }

  // 挂载全局唯一单例
  window.mcytAsr = new AsrEngine();

  // 启动预热
  window.addEventListener('DOMContentLoaded', () => {
    window.mcytAsr.loadConfig();
  });

})(window);
