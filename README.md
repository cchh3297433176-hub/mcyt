# 主播掌机 · 项目说明文档（写给 AI 看的，用于快速接手维护）

> **使用方法**：AI 接手项目时优先通读本文档即可快速掌握全局架构与最新变更。
> 文档只描述“现在是什么样”，不记录冗长改动历史；文档与源码冲突时，以源码为准。
> ⚠️ 当前应用版本号可在 `js/apps/settings/settings-app.js` 顶部查看与修改 `CURRENT_APP_VERSION`（三位小数格式）。

---

## 0. 架构铁律与持久化核心准则

- **全站严禁 localStorage 存大图/小说**：`localStorage` 硬配额仅 5MB。同人文库、聊天对话记录、头像框池、装扮气泡全面基于 **IndexedDB (localForage)** 异步持久化存储。
- **自建真实角色准绳**：所有角色歌单、双人游戏大厅入座、同人文库均严格以用户自主创建的真实 NPC（`localStorage.getItem('mcyt_wechat_custom_npcs')`）为准，摒弃预设硬编码 NPC。
- **全屏 App 安全区避让**：全屏视口顶栏须强制应用 `padding-top: calc(var(--status-bar-height, 40px) + 2px);` 或 `env(safe-area-inset-top)`，避让灵动岛与状态栏。
- **设备硬件指纹防漂移**：客户端鉴权优先读取安卓主板原生持久化硬件指纹（`NativeDeviceBridge.getPersistentHardwareId`），杜绝卸载重装因 `localStorage` 被清空而被服务端误判为冒领盗用。
- **Git 推送规范**：仓库全面走系统级 SSH / 凭证鉴权（`git@github.com:cchh3297433176-hub/mcyt.git`），严禁使用带明文 Token 的提交记录造成安全泄露。
- **国内环境读取外部 GitHub 规范**：由于服务器位于国内节点，直接访问 `github.com` 会存在网络波动或超时，查阅外部 GitHub 仓库代码或 Raw 文件必须使用透明镜像通道（如 `/workspace/fetch_github.py` 或前缀 `https://ghfast.top/`），严禁盲目直接请求官方 GitHub 域名导致工具反复超时重试。
- **🚨 跨机房/换云服务器迁移铁律（必读排坑）**：
  - **流水线覆盖机制**：GitHub Actions 打包流水线（`.github/workflows/build.yml`）会在构建 APK 时读取仓库的 Actions Secrets（如 `MCYT_ASR_SERVER_URL`、`MCYT_LOBBY_SERVER_URL`）并静默重写前端配置文件。
  - **同步更新 Secrets**：一旦后端更换云服务商或服务器 IP，**必须第一时间在 GitHub 仓库的 `Settings -> Secrets and variables -> Actions` 中同步更新对应 Secret**！否则即使本地源码修改为新地址，打包流水线依然会强制用旧 Secret 覆盖写回死掉的旧 IP，导致打包出来的客户端向停机节点发请求引发 `Failed to fetch` 或超时异常。
  - **客户端配置兜底**：前端代码内置了对已下线旧节点的静默检测与纠偏能力，若发现旧节点特征应自动校正，但最根源的保证仍是维护好 GitHub Actions 密钥。

---

## 1. 核心应用与子模块分布表

| 应用/功能模块 | 源码路径 | 核心职责与设计要点 |
| :--- | :--- | :--- |
| **QQ 白名单与风控中枢** | `js/system/auth-engine.js` | 掌机冷启动门禁守卫；向云端 `8000/api/auth/verify` 上报 QQ 与硬件指纹进行一机一号死锁；支持防盗用冒领阻断、拉黑锁死与解封重试通道。 |
| **极速语音识别引擎 (ASR)** | `js/system/asr-engine.js` | 云端 faster-whisper 极速转写；全员免密开箱即用；自动清洗 URL 协议防呆；报错脱敏掩码防 VPS 泄密。 |
| **微音音乐主视口** | `js/apps/music/music-app.js` | 网易云经典红黑视觉(#ec4141)；发现页进入自动向云端拉取真随机热门音轨；沉浸式全屏黑胶播放(歌词居中高亮/双语切换/收藏/私聊分享卡片)；“我的”个人主页支持本地相册换背景(独立弹窗带预览与确定键)；装扮头像框抽屉(支持导入本地头像框图/全向微调/确定保存)；全局常驻微缩黑胶悬浮球(带全屏拖拽吸附/跳动声波/列表循环-单曲循环-随机播放单键切换)。 |
| **微音网关与认证中枢** | `js/apps/music/music-api.js` | 直连云端 8000 端口 FastAPI 代理内核（反代本机 3000 端口 NeteaseCloudMusicApi）；全放行 CORS；支持官方扫码登录与手机验证码双轨通道；提供 LRC 时间轴解析器与 Fisher-Yates 真正随机歌单洗牌。 |
| **微音角色歌单中枢** | `js/apps/music/music-npc-playlists.js` | 动态读取通讯录真实自建 NPC，依人设标签生成定制音轨，支持 1~3 位增量随机刷新与角色主页。 |
| **系统设置中心** | `js/apps/settings/settings-app.js` | 全站版本号唯一定义源；OpenAI 兼容模型多方案配置；独立视觉识图 API 凭证与真图实测；ASR 服务连通性测试与语言偏好；小手机 PNG 隐写记忆卡导入导出；版本更新公告展示。 |
| **手机外壳与硬件驱动** | `js/shell/phone-shell.js` | 系统状态栏时钟/电量/网络图标联动；桌面多页手势滑动切换；桌面第二页常驻黑胶声波小组件（轻触黑胶中心可直接替换本地图片自定义封面）；塔罗专属大组件；App 全局路由分发。 |
| **装扮中心与头像框池** | `js/apps/theme/theme-chat-decor.js` | 微信化装扮中心，存储管理全局头像框，采用 IndexedDB 承载；兼容 `url / img` 字段。 |
| **游戏大厅棋牌门户** | `js/apps/lobby/lobby-app.js` | 10 款经典离线/云端棋牌驱动，支持多同伴入座陪玩；局内 Whisper 戳一戳与角色活人对白；战报带署名全员私聊广播。 |
| **聊天中心系统** | `js/apps/chat/` | 微信原生质感单聊与群聊、朋友圈、图文卡片生成、独立识图多模态外挂眼睛与 AI 对话引擎。支持滑动窗口自动物理隐藏过往对白，防止 Token 爆炸。 |
| **忆海 (Rememori) 记忆中枢** | `rememori/` (`mcyt-rememori/`) | 独立记忆中枢子应用，微信小程序现代微光质感（一行双列大头像网格 + 二级多维记忆殿堂）。支持生活作息、约定事项、同伴印象、心境暗流与客观长效事实多维结构化分流；支持后台低价模型静默总结。 |

---


### 1.11 伴窝 (Nest) 3D 空间与角色羁绊枢纽
- **定位**：离线优先的极简 Q 版粘土风专属小窝与角色聚合空间（位于桌面 Page 2，图标 `assets/icons/room.png`）。
- **去 Emoji 规范**：全系统杜绝 Emoji，统一采用单色细线条精致矢量 SVG 图标库 (`js/apps/room/room-icons.js`)。
- **主控制器与路由驱动 (`js/apps/room/room-app.js`, `js/shell/phone-shell.js`)**：
  - 统一由 `openPhoneApp('room')` 路由调度，内部唤起 `RoomApp.open()`。
  - 模态窗容器挂载至 `#phoneWrapper` 内（使用 `.nest-app-modal` 确保手机屏内全屏沉浸覆盖且不逃逸至外层 body）。
  - 星轨 Hub 顶栏内置专属 `.nest-back-desktop-btn` 桌面返回键，支持随时丝滑退回手机桌面并自动释放 Canvas 与 Three.js 动画循环。
- **动态星幕与星轨选人环 (`js/apps/room/room-hub.js`)**：
  - 纯 Canvas 轻量高帧率微粒星尘呼吸背景 (`js/apps/room/room-stars.js`)。
  - C 位用户拍板大卡牌 + 环绕角色徽章 (No.01 ~ No.05) 同心圆聚落布局，支持底栏左右切页。
  - 预留公共咖啡厅闲聚入口，为未来多 AI 角色串门闲聊打通空间插槽。
- **纯净房间 3D 渲染内核 (`js/apps/room/room-engine.js`)**：
  - 彻底剥离冗余大模型，采用纯净程序化网格动态生成（0 依赖、极速冷启）。
  - 进入即近景特写对角线视角，自适应移动端手势旋转平移缩放。
- **空间定制与工坊抽屉 (`js/apps/room/room-customizer.js`)**：
  - **尺寸拉伸**：长 (Z)、宽 (X)、高 (Y) 滑块实时动态生成网格。
  - **材质上墙**：墙面与地板色阶微调，支持本地图片/手绘涂鸦一键贴图上墙与地毯。
  - **布局管理**：支持一键导出包含空间尺寸、色彩贴图配置的完整 JSON 布局文件，支持随时导入还原。

## 2. 聊天与记忆架构演化规范

1. **聊天上下文滑动窗口与物理隐藏**：
   - 单人私聊中，发给大模型的上下文严格截取滑动窗口最新对白（默认 8~12 条，`getNpcMemoryConfig(npcId).keepRecent`）。
   - 早期历史只保存在本地 IndexedDB 中供前端翻阅，大模型只读取忆海提炼出的结构化事实，彻底实现过往老记录的物理隐藏，严格控制 Token 消耗。
2. **群记忆共通深度机制**：
   - 群聊高级设定中支持 `群记忆共通` 独立开关，开启后展开滑动条（10~200 条，默认 20 条）。
   - 角色在私聊中能以上帝视角读取共同群聊最近发生的真实客观对白，杜绝肉麻昵称与错乱称呼。
3. **表情包动态发散规范**：
   - 彻底打破硬编码示例的锚定效应，大模型依据人设性格与当前语境自由发散即时情绪词，严禁复读上一轮相同的表情。

---

## 3. 云端基础设施与服务拓扑 (Shanghai Node)

- **云服务器节点**：腾讯云轻量服务器（上海机房 · 4核 8G 5Mbps）
- **核心开放端口与进程分布**：
  - **`8000` (FastAPI / `asr-server`)**：
    - `POST /api/auth/verify`：QQ 白名单与硬件 UUID 死锁校验（数据直连 `/root/mcyt_auth_data.json`）。
    - `POST /api/asr/transcribe`：faster-whisper 极速转写（使用本地 ModelScope 预加载缓存，零外网依赖，免密公开可用）。
    - `ALL /netease/{path}`：网易云音乐 API 代理通道（CORS 全放行，透明反代本机 3000 端口）。
  - **`3000` (Node.js / `netease-service`)**：`NeteaseCloudMusicApi` 官方开源微服务，开机自启常驻。
  - **`5000` (Python / `maruko-mcp`)**：小丸子 FastMCP 代码中枢（SSE 交互协议，承载跨平台开发协同）。
  - **`8787` (`lobby-server`)**：棋牌游戏大厅云端裁判辅助服务。
- **后台守护服务 (systemd)**：
  - `asr-server.service`（语音识别 + 鉴权验证 + 网易云中继代理）
  - `netease-service.service`（网易云音乐内核 API）
  - `verity-bot.service`（Verity QQ 群管与审核机器人）
  - `maruko-mcp.service`（小丸子代码中枢）

---

## 4. QQ 群管机器人指令规范 (`mcyt_auth.py`)

- **审核放行**：`#通过 <QQ号>` 或 `通过 <QQ号>` —— 为该 QQ 赋予内测畅玩资格。
- **温和换绑**：`#换绑 <QQ号>` 或 `#重置设备 <QQ号>` —— 释放受害者绑定的旧硬件，保留资格，允许在新手机或重装后重新激活，**绝不拉黑设备**。
- **反盗用惩罚**：`#撤销冒领 <QQ号>` —— 释放受害者账号，并将冒领盗用者的设备硬件永久锁死至 `banned_devices`。
- **账号封禁**：`#封禁 <QQ号>` 或 `#拉黑 <QQ号>` —— 永久注销过审资格并踢入黑名单。
- **账号解封**：`#解封 <QQ号>` —— 移出黑名单（需重新发送 `#通过` 重新放行）。
- **设备解封**：`#解封设备 <设备UUID前缀>` —— 将特定硬件指纹移出黑名单。

---

## 5. 维护排坑与经验教训总结 (Lessons Learned)

### 5.1 独立 App 路由调度中枢契约 (Router Exhaustiveness)
- **踩坑现象**：桌面新增独立应用（如“伴窝” `room`）在 `index.html` 中绑定了 `onclick="openPhoneApp('room')"`，但点击后页面展示通用模态框并卡在“应用窗口 就绪 / 应用装载中...”。
- **根因分析**：`js/shell/phone-shell.js` 的 `openPhoneApp(appKey)` 存在通用 fallback 逻辑。任何新增的子 App 若未在路由中显式编写 `if (appKey === "xxx")` 拦截，就会直接掉入 fallback 占位模板，导致实际的控制器代码完全未执行。
- **经验防线**：
  1. 新增任何桌面独立 App 时，第一站必须在 `phone-shell.js` 的 `openPhoneApp` 和 `closePhoneApp` 中登记路由，严禁只在桌面 HTML 加 slot 而遗漏调度内核。
  2. 独立全屏 App（如伴窝）的挂载容器优先使用 `#phoneWrapper` 作为父容器，禁止直接 `document.body.appendChild`，防止脱离虚拟手机外壳或在网页端逃逸至外层。
  3. 自定义模态框必须在顶级 Hub 页面提供明确的“返回桌面”按钮，并在关闭时连带销毁或暂停 `requestAnimationFrame` 循环，防止后台空转消耗 CPU/GPU。

### 5.2 桌面小组件 Flex 宽度契约 (Widget Width Isolation)
- **踩坑现象**：桌面第 2 页的微音黑胶音乐小组件两端严重缩水变窄，无法占满桌面整行宽度。
- **根因分析**：
  1. 宿主插槽容器 `.desktop-widgets-slot` 为 `display: flex; gap: 8px; width: 100%`。
  2. 当单页仅有一个小组件时，容器会自动添加 `.single-widget` 类名，但此前 CSS 仅为 `.calendar-widget-card` 与 `.todo-widget-card` 配置了样式，漏掉了 `.desktop-music-widget-card`。
  3. 组件卡片自身缺少 `flex: 1; width: 100%; min-width: 0;` 声明，在 Flex 容器中仅靠内部图标与文本自然收缩至固有尺寸（约 200px 宽），造成视觉塌陷。
- **经验防线**：
  1. 所有挂载进 `.desktop-widgets-slot` 的小组件卡片，基础类名必须统一具备 `flex: 1 !important; width: 100% !important; min-width: 0 !important; box-sizing: border-box !important;`。
  2. 横条通栏组件（如音乐组件）严禁被日历类单卡片的 `max-width: 320px` 限制截断，确保与下方的应用网格 (`.app-grid`) 两端边界严格对齐。
