/**
 * js/system/tts-engine.js
 * 纯前端 TTS 统一语音中枢引擎
 * 职责：
 * 1. 统一管理 TTS 配置（平台 Key / 本地部署 / 浏览器原生 Web Speech）
 * 2. 统一合成与播放音频流（ArrayBuffer/Blob 管道）
 * 3. 提供微信原生白灰微绿质感的 TTS 配置面板，不依赖外部大文件
 */

(function (window) {
  'use strict';

  // 持久化存储 Key
  const STORAGE_KEY = 'mcyt_tts_config';

  // 默认配置
  const DEFAULT_CONFIG = {
    enabled: false,           // 是否全局启用真实语音朗读
    autoPlay: false,          // 收到 AI 消息后是否自动朗读
    provider: 'openai',       // 'openai' | 'local_rest' | 'web_speech'
    
    // 1. OpenAI 兼容规范 (支持官方/硅基流动/聚合API/本地封装 /v1/audio/speech)
    openai: {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'tts-1',
      voice: 'alloy',         // alloy, echo, fable, onyx, nova, shimmer 或自定义
      speed: 1.0,
      responseFormat: 'mp3'
    },

    // 2. 本地部署自定义 REST API (如 GPT-SoVITS, CosyVoice, ChatTTS 本地 HTTP 服务)
    localRest: {
      endpoint: 'http://127.0.0.1:9880/tts',
      method: 'POST',         // GET 或 POST
      textFieldName: 'text',  // 发送文本的参数名
      extraParamsJson: '{\n  "text_lang": "zh",\n  "speed": 1.0\n}', // 额外自定义 JSON 参数
      audioResponseFormat: 'audio/wav'
    },

    // 3. 浏览器原生离线兜底 (Web Speech Synthesis，零配置，免费)
    webSpeech: {
      lang: 'zh-CN',
      pitch: 1.0,
      rate: 1.0
    }
  };

  class TTSEngine {
    constructor() {
      this.config = this.loadConfig();
      this.currentAudio = null;
      this.isPlaying = false;
      this.audioCache = new Map(); // 简易运行时缓存
    }

    // 读取配置
    loadConfig() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return Object.assign({}, DEFAULT_CONFIG, parsed);
        }
      } catch (e) {
        console.warn('[TTSEngine] 加载 TTS 配置异常，使用默认值:', e);
      }
      return Object.assign({}, DEFAULT_CONFIG);
    }

    // 保存配置
    saveConfig(newConfig) {
      try {
        this.config = Object.assign({}, this.config, newConfig);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
        return true;
      } catch (e) {
        console.error('[TTSEngine] 保存 TTS 配置失败:', e);
        return false;
      }
    }

    // 停止当前正在播放的声音
    stopAudio() {
      if (this.currentAudio) {
        try {
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
        } catch (e) {}
        this.currentAudio = null;
      }
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
      this.isPlaying = false;
    }

    /**
     * 核心合成与播放入口
     * @param {string} text 需要朗读的文本
     * @param {object} customOverrides 允许角色覆盖参数（例如单个 NPC 指定的 voice、speed 等）
     * @returns {Promise<boolean>}
     */
    async speak(text, customOverrides = {}) {
      if (!text || !text.trim()) return false;
      const cleanText = text.trim();

      // 如果正在播放则停止上一条
      this.stopAudio();

      const provider = customOverrides.provider || this.config.provider;

      try {
        if (provider === 'web_speech') {
          return await this._speakWebSpeech(cleanText, customOverrides);
        } else if (provider === 'openai') {
          return await this._speakOpenAI(cleanText, customOverrides);
        } else if (provider === 'local_rest') {
          return await this._speakLocalRest(cleanText, customOverrides);
        }
      } catch (err) {
        console.error('[TTSEngine] 合成播放失败:', err);
        this.showToast('语音合成失败: ' + (err.message || '未知错误'));
        return false;
      }
      return false;
    }

    // 1. OpenAI 规范合成管道 (/v1/audio/speech)
    async _speakOpenAI(text, overrides = {}) {
      const cfg = this.config.openai;
      const baseUrl = (overrides.baseUrl || cfg.baseUrl || '').replace(/\/+$/, '');
      const apiKey = overrides.apiKey || cfg.apiKey;
      const model = overrides.model || cfg.model || 'tts-1';
      const voice = overrides.voice || cfg.voice || 'alloy';
      const speed = overrides.speed || cfg.speed || 1.0;
      const format = cfg.responseFormat || 'mp3';

      if (!baseUrl) {
        throw new Error('未配置 TTS 接口 Base URL');
      }

      // 组装请求 URL
      const targetUrl = baseUrl.endsWith('/audio/speech') ? baseUrl : `${baseUrl}/audio/speech`;

      const headers = {
        'Content-Type': 'application/json'
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      const bodyData = {
        model: model,
        input: text,
        voice: voice,
        speed: parseFloat(speed) || 1.0,
        response_format: format
      };

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(bodyData)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 120)}`);
      }

      const blob = await response.blob();
      return this._playBlobAudio(blob);
    }

    // 2. 本地自定义 REST API 合成管道
    async _speakLocalRest(text, overrides = {}) {
      const cfg = this.config.localRest;
      const endpoint = overrides.endpoint || cfg.endpoint;
      const method = (overrides.method || cfg.method || 'POST').toUpperCase();
      const textField = cfg.textFieldName || 'text';

      let extraParams = {};
      try {
        if (cfg.extraParamsJson && cfg.extraParamsJson.trim()) {
          extraParams = JSON.parse(cfg.extraParamsJson);
        }
      } catch (e) {
        console.warn('[TTSEngine] 本地扩展参数解析错误，忽略:', e);
      }

      let fetchUrl = endpoint;
      let fetchOptions = { method: method };

      if (method === 'GET') {
        const urlObj = new URL(endpoint, window.location.href);
        urlObj.searchParams.set(textField, text);
        Object.keys(extraParams).forEach(k => {
          urlObj.searchParams.set(k, extraParams[k]);
        });
        fetchUrl = urlObj.toString();
      } else {
        const payload = Object.assign({}, extraParams, { [textField]: text });
        fetchOptions.headers = { 'Content-Type': 'application/json' };
        fetchOptions.body = JSON.stringify(payload);
      }

      const response = await fetch(fetchUrl, fetchOptions);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`本地TTS响应错误 ${response.status}: ${errText.slice(0, 100)}`);
      }

      const blob = await response.blob();
      return this._playBlobAudio(blob);
    }

    // 3. 浏览器原生离线兜底
    _speakWebSpeech(text, overrides = {}) {
      return new Promise((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
          return reject(new Error('当前浏览器环境不支持原生 Web Speech API'));
        }
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = overrides.lang || this.config.webSpeech.lang || 'zh-CN';
        utterance.pitch = overrides.pitch || this.config.webSpeech.pitch || 1.0;
        utterance.rate = overrides.rate || this.config.webSpeech.rate || 1.0;

        utterance.onend = () => {
          this.isPlaying = false;
          resolve(true);
        };
        utterance.onerror = (e) => {
          this.isPlaying = false;
          reject(new Error(e.error || '原生朗读中断'));
        };

        this.isPlaying = true;
        window.speechSynthesis.speak(utterance);
      });
    }

    // 播放 Blob 对象的统一处理
    _playBlobAudio(blob) {
      return new Promise((resolve, reject) => {
        try {
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          this.currentAudio = audio;
          this.isPlaying = true;

          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            this.isPlaying = false;
            this.currentAudio = null;
            resolve(true);
          };

          audio.onerror = (e) => {
            URL.revokeObjectURL(audioUrl);
            this.isPlaying = false;
            this.currentAudio = null;
            reject(new Error('音频数据解码失败'));
          };

          audio.play().catch(err => {
            URL.revokeObjectURL(audioUrl);
            this.isPlaying = false;
            this.currentAudio = null;
            reject(err);
          });
        } catch (e) {
          reject(e);
        }
      });
    }

    // 简易 Toast 提示
    showToast(msg) {
      let toast = document.getElementById('mcyt-tts-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'mcyt-tts-toast';
        toast.style.cssText = `
          position: fixed;
          bottom: 75px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(34, 34, 34, 0.88);
          color: #ffffff;
          padding: 8px 18px;
          border-radius: 20px;
          font-size: 13px;
          z-index: 100000;
          pointer-events: none;
          box-shadow: 0 4px 14px rgba(0,0,0,0.18);
          transition: opacity 0.25s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        `;
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.style.opacity = '1';
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        if (toast) toast.style.opacity = '0';
      }, 2400);
    }

    /**
     * 弹出原生微信质感（白灰微绿）TTS 配置中心全功能模态框
     */
    openSettingsModal() {
      // 避免重复打开
      if (document.getElementById('mcyt-tts-modal-mask')) return;

      const mask = document.createElement('div');
      mask.id = 'mcyt-tts-modal-mask';
      mask.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;

      // 实时复制一份当前配置
      const cfg = JSON.parse(JSON.stringify(this.config));

      const card = document.createElement('div');
      card.style.cssText = `
        width: 90%;
        max-width: 440px;
        max-height: 85vh;
        background: #f7f7f7;
        border-radius: 14px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 12px 36px rgba(0,0,0,0.22);
      `;

      const renderHeader = `
        <div style="background: #ffffff; padding: 14px 18px; border-bottom: 1px solid #eeeeee; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 16px; font-weight: 600; color: #222222; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#07c160" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            语音与 TTS 设置
          </div>
          <button id="tts-btn-close" style="background: transparent; border: none; font-size: 18px; color: #888888; cursor: pointer; padding: 4px;">✕</button>
        </div>
      `;

      const renderBody = `
        <div style="flex: 1; overflow-y: auto; padding: 14px 16px; font-size: 13px; color: #333333;">
          <!-- 核心主开关 -->
          <div style="background: #ffffff; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-weight: 500;">启用真实语音功能</span>
              <input type="checkbox" id="tts-cfg-enabled" ${cfg.enabled ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #07c160;">
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 500;">AI 回复后自动朗读</span>
              <input type="checkbox" id="tts-cfg-autoplay" ${cfg.autoPlay ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #07c160;">
            </div>
          </div>

          <!-- 提供商模式选择 -->
          <div style="margin-bottom: 6px; font-size: 12px; color: #888888; padding-left: 4px;">服务驱动方式</div>
          <div style="display: flex; gap: 8px; margin-bottom: 14px;">
            <button type="button" class="tts-mode-tab ${cfg.provider === 'openai' ? 'active' : ''}" data-mode="openai" style="flex: 1; padding: 8px 4px; border-radius: 8px; border: 1px solid #ddd; background: ${cfg.provider === 'openai' ? '#07c160' : '#fff'}; color: ${cfg.provider === 'openai' ? '#fff' : '#444'}; font-size: 12px; cursor: pointer;">云端平台 / API</button>
            <button type="button" class="tts-mode-tab ${cfg.provider === 'local_rest' ? 'active' : ''}" data-mode="local_rest" style="flex: 1; padding: 8px 4px; border-radius: 8px; border: 1px solid #ddd; background: ${cfg.provider === 'local_rest' ? '#07c160' : '#fff'}; color: ${cfg.provider === 'local_rest' ? '#fff' : '#444'}; font-size: 12px; cursor: pointer;">本地部署 API</button>
            <button type="button" class="tts-mode-tab ${cfg.provider === 'web_speech' ? 'active' : ''}" data-mode="web_speech" style="flex: 1; padding: 8px 4px; border-radius: 8px; border: 1px solid #ddd; background: ${cfg.provider === 'web_speech' ? '#07c160' : '#fff'}; color: ${cfg.provider === 'web_speech' ? '#fff' : '#444'}; font-size: 12px; cursor: pointer;">系统原生离线</button>
          </div>

          <!-- 模式 1: OpenAI / 平台接口 -->
          <div id="tts-panel-openai" style="display: ${cfg.provider === 'openai' ? 'block' : 'none'}; background: #ffffff; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
            <div style="margin-bottom: 10px;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">API 接口地址 (Base URL)</div>
              <input type="text" id="tts-openai-baseurl" value="${cfg.openai.baseUrl || ''}" placeholder="例如 https://api.openai.com/v1" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px;">
            </div>
            <div style="margin-bottom: 10px;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">API Key (令牌)</div>
              <input type="password" id="tts-openai-key" value="${cfg.openai.apiKey || ''}" placeholder="sk-..." style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px;">
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
              <div style="flex: 1;">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">模型名称 (Model)</div>
                <input type="text" id="tts-openai-model" value="${cfg.openai.model || 'tts-1'}" placeholder="tts-1" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px;">
              </div>
              <div style="flex: 1;">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">默认音色 (Voice)</div>
                <input type="text" id="tts-openai-voice" value="${cfg.openai.voice || 'alloy'}" placeholder="alloy" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px;">
              </div>
            </div>
            <div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">语速倍率 (${cfg.openai.speed || 1.0}x)</div>
              <input type="range" id="tts-openai-speed" min="0.5" max="2.0" step="0.1" value="${cfg.openai.speed || 1.0}" style="width: 100%; accent-color: #07c160;">
            </div>
          </div>

          <!-- 模式 2: 本地部署 (GPT-SoVITS 等) -->
          <div id="tts-panel-local_rest" style="display: ${cfg.provider === 'local_rest' ? 'block' : 'none'}; background: #ffffff; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
            <div style="margin-bottom: 10px;">
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">本地接口完整 URL</div>
              <input type="text" id="tts-local-endpoint" value="${cfg.localRest.endpoint || ''}" placeholder="例如 http://127.0.0.1:9880/tts" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px;">
            </div>
            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
              <div style="flex: 1;">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">请求方式</div>
                <select id="tts-local-method" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px; background: #fff;">
                  <option value="POST" ${cfg.localRest.method === 'POST' ? 'selected' : ''}>POST</option>
                  <option value="GET" ${cfg.localRest.method === 'GET' ? 'selected' : ''}>GET</option>
                </select>
              </div>
              <div style="flex: 1;">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">文本字段名</div>
                <input type="text" id="tts-local-textfield" value="${cfg.localRest.textFieldName || 'text'}" placeholder="text" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px;">
              </div>
            </div>
            <div>
              <div style="font-size: 12px; color: #666; margin-bottom: 4px;">其他固定 JSON 请求体参数</div>
              <textarea id="tts-local-extra" rows="3" style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #e0e0e0; border-radius: 6px; font-family: monospace; font-size: 12px;">${cfg.localRest.extraParamsJson || ''}</textarea>
            </div>
          </div>

          <!-- 模式 3: 浏览器系统原生离线 -->
          <div id="tts-panel-web_speech" style="display: ${cfg.provider === 'web_speech' ? 'block' : 'none'}; background: #ffffff; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
            <div style="font-size: 12px; color: #666; line-height: 1.5; margin-bottom: 8px;">
              使用当前系统与浏览器内置的朗读引擎，完全免费、零网络请求，在离线状态下也可直接发声。
            </div>
            <div style="display: flex; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">语言代码</div>
                <input type="text" id="tts-web-lang" value="${cfg.webSpeech.lang || 'zh-CN'}" placeholder="zh-CN" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px;">
              </div>
              <div style="flex: 1;">
                <div style="font-size: 12px; color: #666; margin-bottom: 4px;">语速</div>
                <input type="number" id="tts-web-rate" step="0.1" min="0.5" max="2.0" value="${cfg.webSpeech.rate || 1.0}" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px;">
              </div>
            </div>
          </div>

          <!-- 快速发音测试区 -->
          <div style="background: #ffffff; border-radius: 10px; padding: 12px; display: flex; gap: 8px; align-items: center;">
            <input type="text" id="tts-test-input" value="你好呀，我是小丸子，语音测试成功啦！" style="flex: 1; padding: 8px 10px; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 13px;">
            <button type="button" id="tts-btn-test" style="background: #e8f7ee; color: #07c160; border: 1px solid #07c160; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;">试听发音</button>
          </div>
        </div>
      `;

      const renderFooter = `
        <div style="background: #ffffff; padding: 12px 16px; border-top: 1px solid #eeeeee; display: flex; justify-content: flex-end; gap: 10px;">
          <button id="tts-btn-cancel" style="padding: 8px 18px; border-radius: 6px; border: 1px solid #dddddd; background: #ffffff; color: #666666; font-size: 13px; cursor: pointer;">取消</button>
          <button id="tts-btn-save" style="padding: 8px 20px; border-radius: 6px; border: none; background: #07c160; color: #ffffff; font-size: 13px; font-weight: 500; cursor: pointer;">保存配置</button>
        </div>
      `;

      card.innerHTML = renderHeader + renderBody + renderFooter;
      mask.appendChild(card);
      document.body.appendChild(mask);

      // 事件绑定
      let currentActiveProvider = cfg.provider;

      // Tab 切换
      const tabBtns = card.querySelectorAll('.tts-mode-tab');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.getAttribute('data-mode');
          currentActiveProvider = mode;
          tabBtns.forEach(b => {
            const isActive = b.getAttribute('data-mode') === mode;
            b.style.background = isActive ? '#07c160' : '#ffffff';
            b.style.color = isActive ? '#ffffff' : '#444444';
          });
          card.querySelector('#tts-panel-openai').style.display = mode === 'openai' ? 'block' : 'none';
          card.querySelector('#tts-panel-local_rest').style.display = mode === 'local_rest' ? 'block' : 'none';
          card.querySelector('#tts-panel-web_speech').style.display = mode === 'web_speech' ? 'block' : 'none';
        });
      });

      // 关闭与取消
      const closeModal = () => {
        this.stopAudio();
        mask.remove();
      };
      card.querySelector('#tts-btn-close').addEventListener('click', closeModal);
      card.querySelector('#tts-btn-cancel').addEventListener('click', closeModal);

      // 从界面提取当前输入的最新参数
      const gatherFormValues = () => {
        return {
          enabled: card.querySelector('#tts-cfg-enabled').checked,
          autoPlay: card.querySelector('#tts-cfg-autoplay').checked,
          provider: currentActiveProvider,
          openai: {
            baseUrl: card.querySelector('#tts-openai-baseurl').value.trim(),
            apiKey: card.querySelector('#tts-openai-key').value.trim(),
            model: card.querySelector('#tts-openai-model').value.trim(),
            voice: card.querySelector('#tts-openai-voice').value.trim(),
            speed: parseFloat(card.querySelector('#tts-openai-speed').value) || 1.0,
            responseFormat: 'mp3'
          },
          localRest: {
            endpoint: card.querySelector('#tts-local-endpoint').value.trim(),
            method: card.querySelector('#tts-local-method').value,
            textFieldName: card.querySelector('#tts-local-textfield').value.trim() || 'text',
            extraParamsJson: card.querySelector('#tts-local-extra').value.trim(),
            audioResponseFormat: 'audio/wav'
          },
          webSpeech: {
            lang: card.querySelector('#tts-web-lang').value.trim() || 'zh-CN',
            pitch: 1.0,
            rate: parseFloat(card.querySelector('#tts-web-rate').value) || 1.0
          }
        };
      };

      // 测试发音
      const btnTest = card.querySelector('#tts-btn-test');
      btnTest.addEventListener('click', async () => {
        const testText = card.querySelector('#tts-test-input').value.trim();
        if (!testText) return;
        const tempValues = gatherFormValues();

        btnTest.disabled = true;
        btnTest.textContent = '合成中...';

        // 临时将当前输入写给内存测试
        const originalConfig = this.config;
        this.config = tempValues;

        try {
          await this.speak(testText);
        } catch (err) {
          // 内部已有报错 toast
        } finally {
          this.config = originalConfig; // 恢复原状态，等用户真正点击保存
          btnTest.disabled = false;
          btnTest.textContent = '试听发音';
        }
      });

      // 保存配置
      card.querySelector('#tts-btn-save').addEventListener('click', () => {
        const finalValues = gatherFormValues();
        this.saveConfig(finalValues);
        this.showToast('TTS 语音配置已成功保存！');
        closeModal();
      });
    }
  }

  // 挂载全局单例
  window.ttsEngine = new TTSEngine();

})(window);
