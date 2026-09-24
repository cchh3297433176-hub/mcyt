/**
 * js/system/asr-engine.js
 * 本地离线语音识别（ASR）中枢引擎
 * 基于 whisper.wasm 与 IndexedDB 构建，支持多模型本地库管理、自动向下兼容、状态透明化与全离线运行
 */

(function (window) {
  'use strict';

  // IndexedDB 存储键名规范
  const STORAGE_KEY_MODELS_META_LIST = 'mcyt_asr_models_meta_list';
  const STORAGE_KEY_BINARY_PREFIX = 'mcyt_asr_model_bin_';
  const STORAGE_KEY_CONFIG = 'mcyt_asr_config';

  // 历史单模型兼容 Key
  const LEGACY_STORAGE_KEY_MODEL_BINARY = 'mcyt_asr_model_binary';
  const LEGACY_STORAGE_KEY_MODEL_META = 'mcyt_asr_model_meta';

  // 多源 CDN 候选列表
  const WASM_ESM_CDN_MIRRORS = [
    'https://cdn.jsdelivr.net/npm/@timur00kh/whisper.wasm@canary/dist/index.es.js',
    'https://unpkg.com/@timur00kh/whisper.wasm@canary/dist/index.es.js',
    'https://esm.sh/@timur00kh/whisper.wasm@canary'
  ];

  class AsrEngine {
    constructor() {
      this.isSupported = null;
      this.isInitialized = false;
      this.isLoading = false;
      this.whisperInstance = null;
      this.audioContext = null;
      this.loadedModelId = null;

      // 配置项
      this.config = {
        enabled: true,
        activeModelId: '',
        language: 'zh',
        translate: false,
        wasmUrl: WASM_ESM_CDN_MIRRORS[0]
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
     * 获取已缓存的本地模型列表（具备旧版本自愈兼容）
     */
    async getModelsList() {
      try {
        if (!window.localforage) return [];
        let list = await window.localforage.getItem(STORAGE_KEY_MODELS_META_LIST);
        list = Array.isArray(list) ? list : [];

        if (list.length === 0) {
          const oldMeta = await window.localforage.getItem(LEGACY_STORAGE_KEY_MODEL_META);
          const oldBin = await window.localforage.getItem(LEGACY_STORAGE_KEY_MODEL_BINARY);
          if (oldMeta && oldBin) {
            const migratedId = 'model_migrated_' + Date.now();
            const binaryKey = STORAGE_KEY_BINARY_PREFIX + migratedId;
            await window.localforage.setItem(binaryKey, oldBin);
            const sizeNum = oldBin.byteLength || (oldBin.size) || 0;
            const migratedMeta = {
              id: migratedId,
              name: oldMeta.name || 'tiny-model.bin',
              size: oldMeta.size || sizeNum,
              sizeFormatted: oldMeta.sizeFormatted || ((sizeNum / 1024 / 1024).toFixed(2) + ' MB'),
              binaryKey: binaryKey,
              createdAt: oldMeta.updatedAt || new Date().toISOString()
            };
            list.push(migratedMeta);
            await window.localforage.setItem(STORAGE_KEY_MODELS_META_LIST, list);
            this.config.activeModelId = migratedId;
            await this.saveConfig();
          }
        }

        return list;
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

      this.isInitialized = false;
      this.whisperInstance = null;
      this.loadedModelId = null;
      return target;
    }

    /**
     * 导入用户提供的本地模型文件 (.bin)
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

            this.config.activeModelId = modelId;
            await this.saveConfig();

            onProgress?.(90, '正在重置识别引擎...');
            this.isInitialized = false;
            this.whisperInstance = null;
            this.loadedModelId = null;

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

        await window.localforage.removeItem(target.binaryKey);

        const updatedList = list.filter(m => m.id !== modelId);
        await window.localforage.setItem(STORAGE_KEY_MODELS_META_LIST, updatedList);

        if (this.config.activeModelId === modelId) {
          this.config.activeModelId = updatedList.length > 0 ? updatedList[0].id : '';
          await this.saveConfig();
          this.isInitialized = false;
          this.whisperInstance = null;
          this.loadedModelId = null;
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

      const urlsToTry = [this.config.wasmUrl, ...WASM_ESM_CDN_MIRRORS].filter((v, i, a) => a.indexOf(v) === i && !!v);
      let lastErr = null;

      for (const url of urlsToTry) {
        try {
          const esmModule = await import(/* webpackIgnore: true */ url);
          if (esmModule && (esmModule.WhisperWasmService || esmModule.default)) {
            const WhisperWasmService = esmModule.WhisperWasmService || esmModule.default?.WhisperWasmService || esmModule.default;
            const ModelManager = esmModule.ModelManager || esmModule.default?.ModelManager;
            this.config.wasmUrl = url;
            this.saveConfig();
            return { WhisperWasmService, ModelManager };
          }
        } catch (err) {
          lastErr = err;
          console.warn(`[ASR Engine] 尝试从 ${url} 加载失败，准备尝试备用镜像...`, err);
        }
      }

      console.error('[ASR Engine] 加载 whisper.wasm ESM 全部镜像源失败:', lastErr);
      throw new Error('未能连通 whisper.wasm 推理核心库，请检查网络或离线依赖');
    }

    /**
     * 初始化引擎与模型到内存中
     */
    async initEngine(onProgress) {
      const activeMeta = await this.getActiveModelMeta();
      if (!activeMeta) {
        throw new Error('未导入语音模型，请先到“设置-离线语音”导入 .bin 文件');
      }

      if (this.isInitialized && this.whisperInstance && this.loadedModelId === activeMeta.id) {
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

          onProgress?.(20, '正在装载 whisper 核心库...');
          const { WhisperWasmService } = await this._loadWhisperModule();

          onProgress?.(50, `正在读取模型数据 (${activeMeta.name})...`);
          let rawData = await window.localforage.getItem(activeMeta.binaryKey);
          if (!rawData) {
            throw new Error('未在本地存储中找到该模型的二进制文件');
          }

          let uint8Data = null;
          if (rawData instanceof ArrayBuffer) {
            uint8Data = new Uint8Array(rawData);
          } else if (rawData instanceof Uint8Array) {
            uint8Data = rawData;
          } else if (rawData instanceof Blob) {
            const ab = await rawData.arrayBuffer();
            uint8Data = new Uint8Array(ab);
          } else {
            throw new Error('模型数据格式异常');
          }

          onProgress?.(80, '正在将神经网络映射至内存...');
          const whisper = new WhisperWasmService({ logLevel: 1 });
          if (typeof whisper.checkWasmSupport === 'function') {
            const ok = await whisper.checkWasmSupport();
            if (!ok) throw new Error('浏览器 WASM 环境校验失败');
          }

          // 初始化模型
          await whisper.initModel(uint8Data);

          this.whisperInstance = whisper;
          this.loadedModelId = activeMeta.id;
          this.isInitialized = true;
          this.isLoading = false;

          onProgress?.(100, '引擎就绪');
          return true;
        } catch (err) {
          this.isLoading = false;
          this.isInitialized = false;
          this.whisperInstance = null;
          this.loadedModelId = null;
          console.error('[ASR Engine] 初始化推理引擎失败:', err);
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
     * 语音转文字（核心识别调用，实时段落回调与底层透传抓取）
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
        console.warn('[ASR Engine] 音频过短');
        return '';
      }

      const language = options.language || this.config.language || 'zh';
      const translate = typeof options.translate === 'boolean' ? options.translate : this.config.translate;

      const transcribeOptions = {
        language: language,
        translate: translate,
        threads: 1
      };

      // 实时段落收集容器
      const recognizedSegments = [];
      const onSegmentCallback = (seg) => {
        if (seg && seg.text) {
          console.log('[ASR Engine] 捕获到流式文本段落:', seg.text);
          recognizedSegments.push(seg.text.trim());
        }
      };

      // 底层事件穿透收集作为双保险
      const busCapturedTexts = [];
      let unsubTranscribe = null;
      let unsubSystemInfo = null;

      if (this.whisperInstance && this.whisperInstance.bus) {
        unsubTranscribe = this.whisperInstance.bus.on('transcribe', (e) => {
          try {
            const raw = typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail);
            const clean = raw.replace(/\[\d{1,2}:\d{2}[.,]\d{1,3}\s*-->\s*\d{1,2}:\d{2}[.,]\d{1,3}\]/g, '').trim();
            if (clean) busCapturedTexts.push(clean);
          } catch (_) {}
        });

        unsubSystemInfo = this.whisperInstance.bus.on('system_info', (e) => {
          if (typeof e.detail === 'string' && e.detail.includes('-->')) {
            const clean = e.detail.replace(/\[\d{1,2}:\d{2}[.,]\d{1,3}\s*-->\s*\d{1,2}:\d{2}[.,]\d{1,3}\]/g, '').trim();
            if (clean) busCapturedTexts.push(clean);
          }
        });
      }

      let result = null;
      try {
        // 关键修复：传入 onSegmentCallback 而非 undefined，杜绝空指针
        result = await Promise.race([
          this.whisperInstance.transcribe(pcm16k, onSegmentCallback, transcribeOptions),
          new Promise((_, reject) => setTimeout(() => reject(new Error('推理超时，请尝试较短语音')), 25000))
        ]);
      } catch (err) {
        console.warn('[ASR Engine] transcribe 退出或捕获:', err);
      } finally {
        if (typeof unsubTranscribe === 'function') unsubTranscribe();
        if (typeof unsubSystemInfo === 'function') unsubSystemInfo();
      }

      // 1. 优先采用回调收集到的实时段落
      if (recognizedSegments.length > 0) {
        const full = recognizedSegments.join('').trim();
        console.log('[ASR Engine] 由实时段落成功合成对白:', full);
        return full;
      }

      // 2. 其次采用原生返回值解析
      if (result) {
        if (typeof result === 'string' && result.trim()) return result.trim();
        if (Array.isArray(result.segments) && result.segments.length > 0) {
          const segText = result.segments.map((s) => s.text || '').join('').trim();
          if (segText) return segText;
        }
        if (result.text && result.text.trim()) return result.text.trim();
      }

      // 3. 最后采用底层事件自愈兜底
      if (busCapturedTexts.length > 0) {
        const busFull = busCapturedTexts.join('').trim();
        console.log('[ASR Engine] 由底层输出合成对白:', busFull);
        return busFull;
      }

      return '';
    }
  }

  window.mcytAsr = new AsrEngine();

  window.addEventListener('DOMContentLoaded', () => {
    window.mcytAsr.loadConfig();
    window.mcytAsr.getModelsList();
  });

})(window);
