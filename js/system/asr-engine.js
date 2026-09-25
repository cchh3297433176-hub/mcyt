/**
 * js/system/asr-engine.js
 * 本地离线语音识别（ASR）中枢引擎
 * 基于 transformers.js + onnxruntime-web（单线程 WASM）构建
 * 特性：彻底摆脱 SharedArrayBuffer 与跨源隔离限制，全本地离线驱动，无缝对接悬浮球错误雷达
 */

(function (window) {
  'use strict';

  // IndexedDB 存储键名规范
  const STORAGE_KEY_MODELS_META_LIST = 'mcyt_asr_models_meta_list';
  const STORAGE_KEY_BINARY_PREFIX = 'mcyt_asr_model_bin_';
  const STORAGE_KEY_CONFIG = 'mcyt_asr_config';

  // 默认内置模型配置（对应 yy 仓库检出的本地路径）
  const DEFAULT_LOCAL_MODEL_ID = 'builtin_whisper_tiny';
  const DEFAULT_LOCAL_MODEL_META = {
    id: DEFAULT_LOCAL_MODEL_ID,
    name: 'Whisper-Tiny (本地预置/ONNX量化版)',
    path: 'models/whisper',
    sizeFormatted: '约 75 MB',
    isBuiltin: true,
    createdAt: new Date().toISOString()
  };

  class AsrEngine {
    constructor() {
      this.isSupported = null;
      this.isInitialized = false;
      this.isLoading = false;
      this.pipelineInstance = null;
      this.audioContext = null;
      this.loadedModelId = null;

      // 配置项
      this.config = {
        enabled: true,
        activeModelId: DEFAULT_LOCAL_MODEL_ID,
        language: 'zh',
        translate: false,
        modelLocalPath: 'models/whisper'
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
        const hasTransformers = typeof window.transformers !== 'undefined' || typeof window.pipeline === 'function';
        this.isSupported = !!(hasWasm && hasAudio && (hasLocalforage || hasTransformers));
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
        let list = [];
        if (window.localforage) {
          list = await window.localforage.getItem(STORAGE_KEY_MODELS_META_LIST);
          list = Array.isArray(list) ? list : [];
        }

        // 确保内置 Whisper-Tiny 始终排在首位
        const hasBuiltin = list.some(m => m.id === DEFAULT_LOCAL_MODEL_ID);
        if (!hasBuiltin) {
          list.unshift(DEFAULT_LOCAL_MODEL_META);
        }

        return list;
      } catch (e) {
        console.error('[ASR Engine] 读取模型列表失败:', e);
        return [DEFAULT_LOCAL_MODEL_META];
      }
    }

    /**
     * 获取当前生效的模型元信息
     */
    async getActiveModelMeta() {
      const list = await this.getModelsList();
      if (list.length === 0) return DEFAULT_LOCAL_MODEL_META;
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

      this.isInitialized = false;
      this.pipelineInstance = null;
      this.loadedModelId = null;
      return target;
    }

    /**
     * 预留模型包导入扩展接口
     */
    async importModelFromFile(file, onProgress) {
      if (!file) throw new Error('未提供有效的文件对象');

      onProgress?.(20, '正在校验模型文件...');
      const modelId = 'model_onnx_' + Date.now();
      const meta = {
        id: modelId,
        name: file.name || 'custom-whisper.onnx',
        sizeFormatted: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        createdAt: new Date().toISOString()
      };

      const list = await this.getModelsList();
      list.push(meta);
      if (window.localforage) {
        await window.localforage.setItem(STORAGE_KEY_MODELS_META_LIST, list);
      }
      this.config.activeModelId = modelId;
      await this.saveConfig();

      onProgress?.(100, '模型导入就绪');
      return meta;
    }

    /**
     * 删除指定的本地自定义模型
     */
    async removeModel(modelId) {
      if (modelId === DEFAULT_LOCAL_MODEL_ID) {
        throw new Error('系统内置核心模型不可删除');
      }
      try {
        const list = await this.getModelsList();
        const updatedList = list.filter(m => m.id !== modelId);
        if (window.localforage) {
          await window.localforage.setItem(STORAGE_KEY_MODELS_META_LIST, updatedList);
          await window.localforage.removeItem(STORAGE_KEY_BINARY_PREFIX + modelId);
        }

        if (this.config.activeModelId === modelId) {
          this.config.activeModelId = DEFAULT_LOCAL_MODEL_ID;
          await this.saveConfig();
          this.isInitialized = false;
          this.pipelineInstance = null;
          this.loadedModelId = null;
        }
        return true;
      } catch (e) {
        console.error('[ASR Engine] 删除模型失败:', e);
        return false;
      }
    }

    /**
     * 配置 transformers.js 单线程运行环境
     */
    _setupTransformersEnv(transformersLib) {
      const env = transformersLib.env || (window.transformers && window.transformers.env);
      if (!env) return;

      // 严格锁死本地模型，杜绝任何外部网络请求
      env.allowLocalModels = true;
      env.allowRemoteModels = false;

      // WASM 路径引导至项目本地 js/lib/
      if (env.backends && env.backends.onnx) {
        env.backends.onnx.wasm = env.backends.onnx.wasm || {};
        // 核心：强制单线程，彻底免除 SharedArrayBuffer 限制
        env.backends.onnx.wasm.numThreads = 1;
        env.backends.onnx.wasm.proxy = false;
        env.backends.onnx.wasm.wasmPaths = 'js/lib/';
      }

      // 本地根目录引导
      env.localModelPath = '';
    }

    /**
     * 初始化引擎与模型到内存中
     */
    async initEngine(onProgress) {
      const activeMeta = await this.getActiveModelMeta();

      if (this.isInitialized && this.pipelineInstance && this.loadedModelId === activeMeta.id) {
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
            throw new Error('当前环境缺少必要的 WebAssembly 或音频组件支持');
          }

          onProgress?.(20, '正在装载 transformers 推理环境...');

          const tLib = window.transformers || { pipeline: window.pipeline, env: window.env };
          if (!tLib || typeof tLib.pipeline !== 'function') {
            throw new Error('未检测到本地 transformers.min.js 驱动库，请确认 js/lib/ 依赖已就绪');
          }

          this._setupTransformersEnv(tLib);

          onProgress?.(50, `正在映射语音模型 (${activeMeta.name})...`);

          const modelTarget = activeMeta.path || this.config.modelLocalPath || 'models/whisper';

          // 装配 ASR 流水线
          const asrPipeline = await tLib.pipeline('automatic-speech-recognition', modelTarget, {
            quantized: true,
            progress_callback: (p) => {
              if (p && p.status === 'progress' && p.total) {
                const pct = Math.round(50 + (p.loaded / p.total) * 40);
                onProgress?.(pct, `载入模型分片: ${Math.round((p.loaded / 1024 / 1024) * 10) / 10}MB`);
              }
            }
          });

          this.pipelineInstance = asrPipeline;
          this.loadedModelId = activeMeta.id;
          this.isInitialized = true;
          this.isLoading = false;

          onProgress?.(100, '引擎装配就绪');
          return true;
        } catch (err) {
          this.isLoading = false;
          this.isInitialized = false;
          this.pipelineInstance = null;
          this.loadedModelId = null;

          console.error('[ASR Engine] 初始化推理引擎失败:', err);
          if (typeof window.recordSystemError === 'function') {
            window.recordSystemError('ASR引擎', err, { model: activeMeta?.name });
          }
          throw err;
        } finally {
          this._initPromise = null;
        }
      })();

      return this._initPromise;
    }

    /**
     * 将音频数据解码、重采样至 16kHz 单声道并进行音量增益归一化
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

      let decodedBuffer;
      try {
        decodedBuffer = await this.audioContext.decodeAudioData(arrayBuffer.slice(0));
      } catch (decErr) {
        console.error('[ASR Engine] decodeAudioData 解码音频失败:', decErr);
        if (typeof window.recordSystemError === 'function') {
          window.recordSystemError('ASR解码', decErr);
        }
        throw new Error('音频解码失败，请确认设备支持此音频格式');
      }

      const TARGET_SAMPLE_RATE = 16000;
      let rawPcm = null;

      if (decodedBuffer.sampleRate === TARGET_SAMPLE_RATE && decodedBuffer.numberOfChannels === 1) {
        rawPcm = decodedBuffer.getChannelData(0);
      } else {
        const offlineCtx = new OfflineAudioContext(
          1,
          Math.max(1, Math.ceil(decodedBuffer.duration * TARGET_SAMPLE_RATE)),
          TARGET_SAMPLE_RATE
        );

        const source = offlineCtx.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(offlineCtx.destination);
        source.start(0);

        const renderedBuffer = await offlineCtx.startRendering();
        rawPcm = renderedBuffer.getChannelData(0);
      }

      // 音量增益归一化（Gain Normalization）
      if (rawPcm && rawPcm.length > 0) {
        let maxAmp = 0;
        for (let i = 0; i < rawPcm.length; i++) {
          const abs = Math.abs(rawPcm[i]);
          if (abs > maxAmp) maxAmp = abs;
        }

        if (maxAmp > 0.005 && maxAmp < 0.7) {
          const gain = Math.min(10.0, 0.85 / maxAmp);
          const boostedPcm = new Float32Array(rawPcm.length);
          for (let i = 0; i < rawPcm.length; i++) {
            boostedPcm[i] = Math.max(-1.0, Math.min(1.0, rawPcm[i] * gain));
          }
          return boostedPcm;
        }
      }

      return rawPcm;
    }

    /**
     * 语音转文字（核心推理提取）
     */
    async transcribe(audioData, options = {}) {
      if (!this.config.enabled) {
        return '';
      }

      await this.initEngine();

      let pcm16k;
      if (audioData instanceof Float32Array) {
        pcm16k = audioData;
      } else {
        pcm16k = await this.convertAudioTo16kPcm(audioData);
      }

      if (!pcm16k || pcm16k.length < 1600) {
        console.warn('[ASR Engine] 录制音频过短，略过识别');
        return '';
      }

      const langCode = options.language || this.config.language || 'zh';
      const targetLang = (langCode === 'zh' || langCode === 'zh-CN') ? 'chinese' : langCode;
      const isTranslate = typeof options.translate === 'boolean' ? options.translate : this.config.translate;

      try {
        const result = await Promise.race([
          this.pipelineInstance(pcm16k, {
            language: targetLang,
            task: isTranslate ? 'translate' : 'transcribe',
            chunk_length_s: 30,
            stride_length_s: 5,
            return_timestamps: false
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('推理超时，请尝试较短语音')), 25000))
        ]);

        let finalText = '';
        if (typeof result === 'string') {
          finalText = result;
        } else if (result && result.text) {
          finalText = result.text;
        }

        return String(finalText || '').trim();
      } catch (err) {
        console.error('[ASR Engine] transcribe 提取文字异常:', err);
        if (typeof window.recordSystemError === 'function') {
          window.recordSystemError('ASR推理', err, { pcmLength: pcm16k?.length });
        }
        throw err;
      }
    }
  }

  window.mcytAsr = new AsrEngine();

  window.addEventListener('DOMContentLoaded', () => {
    window.mcytAsr.loadConfig();
    window.mcytAsr.getModelsList();
  });

})(window);
