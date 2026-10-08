# 主播掌机 · 项目说明文档（写给 AI 看的，用于快速接手维护）

> **使用方法**：AI 接手项目时优先通读本文档即可快速掌握全局架构与最新变更。
> 文档只描述“现在是什么样”，不记录冗长改动历史；文档与源码冲突时，以源码为准。
> ⚠️ 当前应用版本号可在 `js/apps/settings/settings-app.js` 顶部查看与修改 `CURRENT_APP_VERSION`（三位小数格式）。

---

## 0. 架构铁律与持久化核心准则

- **全站严禁 localStorage 存大图/小说**：`localStorage` 硬配额仅 5MB。同人文库、聊天对话记录、头像框池、装扮气泡全面基于 **IndexedDB (localForage)** 异步持久化存储。
- **自建真实角色准绳**：所有角色歌单、双人游戏大厅入座、同人文库均严格以用户自主创建的真实 NPC（`localStorage.getItem('mcyt_wechat_custom_npcs')`）为准，摒弃预设硬编码 NPC。
- **全屏 App 安全区避让**：全屏视口顶栏须强制应用 `padding-top: calc(var(--status-bar-height, 40px) + 2px);` 或 `env(safe-area-inset-top)`，避让灵动岛与状态栏。
- **模块化样式隔离铁律**：独立子应用（如伴窝 `room`）**严禁把专属功能样式堆塞到根目录 `style.css`**！必须在自身子目录（如 `js/apps/room/room.css`）维护独立样式表，并在 `index.html` 独立引入，防止主工程样式无限膨胀恶化。
- **设备硬件指纹防漂移**：客户端鉴权优先读取安卓主板原生持久化硬件指纹（`NativeDeviceBridge.getPersistentHardwareId`），杜绝卸载重装因 `localStorage` 被清空而被服务端误判为冒领盗用。
- **Git 推送规范**：仓库全面走系统级 SSH / 凭证鉴权（`git@github.com:cchh3297433176-hub/mcyt.git`），严禁使用带明文 Token 的提交记录造成安全泄露。
- **国内环境读取外部 GitHub 规范**：由于服务器位于国内节点，直接访问 `github.com` 会存在网络波动或超时，查阅外部 GitHub 仓库代码或 Raw 文件必须使用透明镜像通道（如 `/workspace/fetch_github.py` 或前缀 `https://ghfast.top/`），严禁盲目直接请求官方 GitHub 域名导致工具反复超时重试。
- **🚨 跨机房/换云服务器迁移铁律（必读排坑）**：
  - **流水线覆盖机制**：GitHub Actions 打包流水线（`.github/workflows/build.yml`）会在构建 APK 时读取仓库的 Actions Secrets（如 `MCYT_ASR_SERVER_URL`、`MCYT_LOBBY_SERVER_URL`）并静默重写前端配置文件。
  - **同步更新 Secrets**：一旦后端更换云服务商或服务器 IP，**必须第一时间在 GitHub 仓库的 `Settings -> Secrets and variables -> Actions` 中同步更新对应 Secret**！否则即使本地源码修改为新地址，打包流水线依然会强制用旧 Secret 覆盖写回死掉的旧 IP，导致打包出来的客户端向停机节点发请求引发 `Failed to fetch` 或超时异常。
  - **客户端配置兜底**：前端代码内置了对已下线旧节点的静默检测与纠偏能力，若发现旧节点特征应自动校正，但最根源的保证仍是维护好 GitHub Actions 密钥。

---

## 1. 核心应用与子模块分布表（宏观全景）

| 应用/功能模块 | 源码路径 | 核心职责与设计要点 |
| :--- | :--- | :--- |
| **QQ 白名单与风控中枢** | `js/system/auth-engine.js` | 掌机冷启动门禁守卫；向云端 `8000/api/auth/verify` 上报 QQ 与硬件指纹进行一机一号死锁；支持防盗用冒领阻断、拉黑锁死与解封重试通道。 |
| **极速语音识别引擎 (ASR)** | `js/system/asr-engine.js` | 云端 faster-whisper 极速转写；全员免密开箱即用；自动清洗 URL 协议防呆；报错脱敏掩码防 VPS 泄密。 |
| **微音音乐主视口** | `js/apps/music/music-app.js` | 网易云经典红黑视觉(#ec4141)；发现页进入自动向云端拉取真随机热门音轨；沉浸式全屏黑胶播放(歌词居中高亮/双语切换/收藏/私聊分享卡片)；“我的”个人主页支持本地相册换背景(独立弹窗带预览与确定键)；装扮头像框抽屉(支持导入本地头像框图/全向微调/确定保存)；全局常驻微缩黑胶悬浮球(带全屏拖拽吸附/跳动声波/列表循环-单曲循环-随机播放单键切换)。 |
| **微音网关与认证中枢** | `js/apps/music/music-api.js` | 直连云端 8000 端口 FastAPI 代理内核（反代本机 3000 端口 NeteaseCloudMusicApi）；全放行 CORS；支持官方扫码登录与手机验证码双轨通道；提供 LRC 时间轴解析器与 Fisher-Yates 真正随机歌单洗牌。 |
| **微音角色歌单中枢** | `js/apps/music/music-npc-playlists.js` | 动态读取通讯录真实自建 NPC，依人设标签生成定制音轨，支持 1~3 位增量随机刷新与角色主页。 |
| **伴窝 3D 空间与角色羁绊** | `js/apps/room/` | 纯 SVG 无 Emoji，多角色/用户房间绝对隔离；动态闪电星幕背景；单墙面/地板点击更换贴图与色调；立体厚度墙体与地面；云端成熟家具库搜索摆放、旋转缩放与三向防畸变 UV 改色贴图工坊；专属 `room.css` 模块化样式隔离。 |
| **系统设置中心** | `js/apps/settings/settings-app.js` | 全站版本号唯一定义源；OpenAI 兼容模型多方案配置；独立视觉识图 API 凭证与真图实测；ASR 服务连通性测试与语言偏好；小手机 PNG 隐写记忆卡导入导出；版本更新公告展示。 |
| **手机外壳与硬件驱动** | `js/shell/phone-shell.js` | 系统状态栏时钟/电量/网络图标联动；桌面多页手势滑动切换；桌面第二页常驻黑胶声波小组件（轻触黑胶中心可直接替换本地图片自定义封面）；塔罗专属大组件；App 全局路由分发。 |
| **装扮中心与头像框池** | `js/apps/theme/theme-chat-decor.js` | 微信化装扮中心，存储管理全局头像框，采用 IndexedDB 承载；兼容 `url / img` 字段。 |
| **游戏大厅棋牌门户** | `js/apps/lobby/lobby-app.js` | 10 款经典离线/云端棋牌驱动，支持多同伴入座陪玩；局内 Whisper 戳一戳与角色活人对白；战报带署名全员私聊广播。 |
| **聊天中心系统** | `js/apps/chat/` | 微信原生质感单聊与群聊、朋友圈、图文卡片生成、独立识图多模态外挂眼睛与 AI 对话引擎。支持滑动窗口自动物理隐藏过往对白，防止 Token 爆炸。 |
| **忆海 (Rememori) 记忆中枢** | `rememori/` (`mcyt-rememori/`) | 独立记忆中枢子应用，微信小程序现代微光质感（一行双列大头像网格 + 二级多维记忆殿堂）。支持生活作息、约定事项、同伴印象、心境暗流与客观长效事实多维结构化分流；支持后台低价模型静默总结。 |

---

## 2. 🗂️ 全仓库完整文件树与功能速查字典 (File by File Dictionary)

### 2.1 根目录核心文件
- `index.html`：主播掌机主入口，装配纯净手机外壳、灵动岛、状态栏、锁屏与双页桌面视口，挂载所有子系统的 JS/CSS 脚本引擎。
- `style.css`：小手机核心系统级通用样式表（控制外壳容器、状态栏、锁屏、桌面栅格、Dock栏、通用弹窗底座）。
- `icon.png`：主播掌机原生应用图标。
- `README.md`：本项目说明规范文档（当前文件）。
- `FURNITURE_STUDIO_SPEC.md`：3D 家具工坊与材质贴图平铺架构规范手册。

### 2.2 底层驱动与基础逻辑库 (`js/`)
- `js/01-state-config.js`：全局核心状态树（`window.G`、角色数据、行动点、时间推进配置）。
- `js/02-ai-network.js`：大模型 API 网络适配层，支持流式 SSE 响应、超时重试与错误捕获。
- `js/03-game-core-1.js`：掌机时间流转引擎、日程推进、体力扣除与日常逻辑。
- `js/04-game-core-2.js`：角色好感度数值演进、情绪矩阵与关系网驱动。
- `js/05-streaming.js`：虚拟直播间开播推流模拟系统、弹幕池与即时互动事件。
- `js/06-video-story.js`：录播切片视频、动态剧情演进与评论区生成机制。
- `js/07-actions-social.js`：社交互动、外出探店、送礼与日常行为触发器。
- `js/09-events-init.js`：全局启动事件监听、冷启动挂载与生命周期管理。
- `js/10-native-bridge.js`：原生 Android WebView JSBridge 桥接，负责读取底层真实硬件 UUID 指纹。
- `js/11-image-backup.js`：图像备份恢复、Base64 压缩与离线缓存桥接。

### 2.3 硬件外壳系统 (`js/shell/`)
- `js/shell/phone-shell.js`：掌机物理外壳驱动器（时钟刷新、电量指示、通知栏徽标、桌面左右翻页手势、Dock 栏路由中枢 `openPhoneApp` / `closePhoneApp`）。

### 2.4 系统服务引擎 (`js/system/`)
- `js/system/auth-engine.js`：QQ 白名单与硬件死锁鉴权守卫。
- `js/system/asr-engine.js`：极速语音识别引擎（faster-whisper 直连）。
- `js/system/tts-engine.js`：语音合成驱动，支持文字转语音发音。
- `js/system/save-engine.js`：多槽位本地存档与云端快照恢复机制。
- `js/system/assistant-registry.js`：悬浮助手身份注册表。
- `js/system/assistant-agent.js`：悬浮球向导智能体互动逻辑。
- `js/system/error-monitor.js`：运行时异常监控与脱敏捕获上报。

### 2.5 伴窝系统专属子目录 (`js/apps/room/`)
- `js/apps/room/room.css`：**伴窝独立专属样式表**（多房间胶囊条、立体抽屉、单墙地定制卡片、家具网格卡片、工坊调色盘、悬浮微调栏）。
- `js/apps/room/room-icons.js`：纯 SVG 矢量图标库（无任何 Emoji，提供房屋、网格、工坊、旋转、油漆桶、删除等高精矢量线框）。
- `js/apps/room/room-manager.js`：**多角色多房间隔离核心管理器**（每个角色独立拥有且仅拥有自己的房间列表；用户添加客厅绝不同步给其他角色；支持自定义房间名称与 PNG/GIF 图标；独立持久化）。
- `js/apps/room/room-stars.js`：**深空动态星幕背景引擎**（高帧率 Canvas，支持动态生成划过深空的电弧闪电与四角星芒呼吸微粒）。
- `js/apps/room/room-hub.js`：星轨角色选人台（C 位用户专属大卡牌与周边真实 NPC 同心圆聚合，支持翻页与公共咖啡厅预留入口）。
- `js/apps/room/room-engine.js`：**3D 场景与交互内核**（Three.js 驱动，支持立体厚度墙体与地台、单面点击射线拾取高亮、背景渐变主题切换、40×40 地面网格线、GLTF 家具载入、三维拖拽位移、旋转缩放、智能三向 UV 展开防拉伸）。
- `js/apps/room/room-customizer.js`：**空间定制与工坊抽屉**（单墙面/地板独立贴图与拾色、平铺密度、真实家具库搜索抽屉、家具换色调色板与贴图导入工坊、布局导出导入）。
- `js/apps/room/room-app.js`：伴窝生命周期主控制器（路由进出、角色房间切换隔离、添加新房间弹窗）。

### 2.6 微信聊天中心子目录 (`js/apps/chat/`)
- `js/apps/chat/chat-common.js`：通讯录通用工具、头像/名字解析与多端时间格式化。
- `js/apps/chat/chat-app-shell.js`：微信外壳底栏（微信/通讯录/发现/我）切换。
- `js/apps/chat/chat-app-list.js`：会话列表渲染、未读气泡计数与置顶排序。
- `js/apps/chat/chat-app-window.js`：聊天对话主视口、气泡滚动与输入栏。
- `js/apps/chat/chat-app-bubble.js`：单个聊天气泡组件（文本、语音、图片、名片、塔罗分享）。
- `js/apps/chat/chat-app-ai.js`：单聊 AI 对话驱动、多方案模型分发、滑动窗口截断。
- `js/apps/chat/chat-app-call.js`：角色语音通话与视频电话模拟界面。
- `js/apps/chat/chat-app-panels.js`：聊天输入框多功能面板（表情包抽屉、拍照、发送卡片）。
- `js/apps/chat/chat-app-media.js`：媒体图片上传、预览与大图灯箱。
- `js/apps/chat/chat-profile.js`：角色个人名片主页与人设微调。
- `js/apps/chat/chat-group.js`：多人群聊逻辑引擎、发言抢答与群对白推进。
- `js/apps/chat/chat-group-settings.js`：群聊详细设置（群成员管理、群记忆共通深度滑条配置）。
- `js/apps/chat/chat-moments.js`：角色朋友圈动态发布、点赞与楼中楼评论。
- `js/apps/chat/chat-card.js`：精美图文卡片生成器。
- `js/apps/chat/chat-tarot.js`：塔罗抽牌卡片发送与聊天解读。
- `js/apps/chat/chat-prompt-engine.js`：单人聊天上下文 Prompt 装配器与忆海事实注入。
- `js/apps/chat/chat-prompt-group.js`：群聊上下文 Prompt 装配器。

### 2.7 独立微音音乐系统 (`js/apps/music/`)
- `js/apps/music/music-app.js`：微音播放器主视口、全屏黑胶唱片、歌词滚动与常驻悬浮球。
- `js/apps/music/music-api.js`：网易云 API 接口层、扫码/手机登录与随机歌单引擎。
- `js/apps/music/music-npc-playlists.js`：基于通讯录自建真实 NPC 的专属歌单生成器。

### 2.8 棋牌游戏大厅 (`js/apps/lobby/`)
- `js/apps/lobby/lobby-app.js`：游戏大厅门户、10 款经典对弈棋牌、角色入座对战与局后全员战报广播。

### 2.9 同人文库 (`js/apps/ao3/`)
- `js/apps/ao3/ao3-app.js`：AO3 风格同人文库浏览与智能小说生成器，基于 IndexedDB 本地持久化。

### 2.10 个性主题与装扮 (`js/apps/theme/`)
- `js/apps/theme/theme-app.js`：个性主题中心主视口。
- `js/apps/theme/theme-chat-decor.js`：微信头像框装扮管理池。
- `js/apps/theme/theme-chat-bubble.js`：聊天气泡皮肤库管理。
- `js/apps/theme/theme-bubble-ai.js`：AI 生成专属气泡皮肤机制。

### 2.11 系统设置与塔罗星轨
- `js/apps/settings/settings-app.js`：系统全功能设置、API Key 配置、ASR 测速、隐写备份与版本号中心。
- `js/apps/tarot/tarot-app.js`：塔罗牌星轨占卜与 78 张牌意解构应用。

---

## 3. 聊天与记忆架构演化规范

1. **聊天上下文滑动窗口与物理隐藏**：
   - 单人私聊中，发给大模型的上下文严格截取滑动窗口最新对白（默认 8~12 条，`getNpcMemoryConfig(npcId).keepRecent`）。
   - 早期历史只保存在本地 IndexedDB 中供前端翻阅，大模型只读取忆海提炼出的结构化事实，彻底实现过往老记录的物理隐藏，严格控制 Token 消耗。
2. **群记忆共通深度机制**：
   - 群聊高级设定中支持 `群记忆共通` 独立开关，开启后展开滑动条（10~200 条，默认 20 条）。
   - 角色在私聊中能以上帝视角读取共同群聊最近发生的真实客观对白，杜绝肉麻昵称与错乱称呼。
3. **表情包动态发散规范**：
   - 彻底打破硬编码示例的锚定效应，大模型依据人设性格与当前语境自由发散即时情绪词，严禁复读上一轮相同的表情。

---

## 4. 云端基础设施与服务拓扑 (Shanghai Node)

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

## 5. QQ 群管机器人指令规范 (`mcyt_auth.py`)

- **审核放行**：`#通过 <QQ号>` 或 `通过 <QQ号>` —— 为该 QQ 赋予内测畅玩资格。
- **温和换绑**：`#换绑 <QQ号>` 或 `#重置设备 <QQ号>` —— 释放受害者绑定的旧硬件，保留资格，允许在新手机或重装后重新激活，**绝不拉黑设备**。
- **反盗用惩罚**：`#撤销冒领 <QQ号>` —— 释放受害者账号，并将冒领盗用者的设备硬件永久锁死至 `banned_devices`。
- **账号封禁**：`#封禁 <QQ号>` 或 `#拉黑 <QQ号>` —— 永久注销过审资格并踢入黑名单。
- **账号解封**：`#解封 <QQ号>` —— 移出黑名单（需重新发送 `#通过` 重新放行）。
- **设备解封**：`#解封设备 <设备UUID前缀>` —— 将特定硬件指纹移出黑名单。

---

## 6. 维护排坑与经验教训总结 (Lessons Learned)

### 6.1 独立 App 路由调度中枢契约 (Router Exhaustiveness)
- **踩坑现象**：桌面新增独立应用（如“伴窝” `room`）在 `index.html` 中绑定了 `onclick="openPhoneApp('room')"`，但点击后页面展示通用模态框并卡在“应用窗口 就绪 / 应用装载中...”。
- **根因分析**：`js/shell/phone-shell.js` 的 `openPhoneApp(appKey)` 存在通用 fallback 逻辑。任何新增的子 App 若未在路由中显式编写 `if (appKey === "xxx")` 拦截，就会直接掉入 fallback 占位模板，导致实际的控制器代码完全未执行。
- **经验防线**：
  1. 新增任何桌面独立 App 时，第一站必须在 `phone-shell.js` 的 `openPhoneApp` 和 `closePhoneApp` 中登记路由，严禁只在桌面 HTML 加 slot 而遗漏调度内核。
  2. 独立全屏 App（如伴窝）的挂载容器优先使用 `#phoneWrapper` 作为父容器，禁止直接 `document.body.appendChild`，防止脱离虚拟手机外壳或在网页端逃逸至外层。
  3. 自定义模态框必须在顶级 Hub 页面提供明确的“返回桌面”按钮，并在关闭时连带销毁或暂停 `requestAnimationFrame` 循环，防止后台空转消耗 CPU/GPU。

### 6.2 桌面小组件 Flex 宽度契约 (Widget Width Isolation)
- **踩坑现象**：桌面第 2 页的微音黑胶音乐小组件两端严重缩水变窄，无法占满桌面整行宽度。
- **根因分析**：
  1. 宿主插槽容器 `.desktop-widgets-slot` 为 `display: flex; gap: 8px; width: 100%`。
  2. 当单页仅有一个小组件时，容器会自动添加 `.single-widget` 类名，但此前 CSS 仅为 `.calendar-widget-card` 与 `.todo-widget-card` 配置了样式，漏掉了 `.desktop-music-widget-card`。
  3. 组件卡片自身缺少 `flex: 1; width: 100%; min-width: 0;` 声明，在 Flex 容器中仅靠内部图标与文本自然收缩至固有尺寸（约 200px 宽），造成视觉塌陷。
- **经验防线**：
  1. 所有挂载进 `.desktop-widgets-slot` 的小组件卡片，基础类名必须统一具备 `flex: 1 !important; width: 100% !important; min-width: 0 !important; box-sizing: border-box !important;`。
  2. 横条通栏组件（如音乐组件）严禁被日历类单卡片的 `max-width: 320px` 限制截断，确保与下方的应用网格 (`.app-grid`) 两端边界严格对齐。

### 6.3 样式表模块化隔离准则 (CSS Modularization)
- **踩坑教训**：前期为图省事，将伴窝 3D 抽屉、家具网格、工坊色卡等数百行样式直接堆在根目录 `style.css` 尾部，导致主样式表臃肿混乱、缺乏职责边界。
- **治理防线**：独立业务子模块必须有自身独立的样式表（如 `js/apps/room/room.css`），在 `index.html` 显式链接，主 `style.css` 只保留系统级基础样式，时刻保持整洁规范。
