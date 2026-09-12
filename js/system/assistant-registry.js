// js/system/assistant-registry.js
// 📱 小手机功能指南与动作字典（高密度白话知识库·无底层代码术语·防幻觉基准）
// ============================================================

(function(window) {
    'use strict';

    const USER_GUIDE_REGISTRY = {
        // 手机外壳与桌面基础机制
        desktopControls: [
            {
                name: "锁定屏幕",
                location: "桌面顶部小组件右侧",
                usage: "点击后手机黑屏进入时钟锁屏；在锁屏向上滑动或轻触屏幕即可重新解锁。"
            },
            {
                name: "行动点机制",
                location: "桌面顶部小组件显示",
                usage: "每天固定 6 点行动点。早/中/晚流转推进时消耗，用于录制视频、外出社交或接商业商单。"
            },
            {
                name: "状态栏感知与定制",
                location: "屏幕最顶部",
                usage: "实时显示系统时间、真实电池电量与呼吸灯、当前网络(WiFi/流量)及蓝牙状态，背景过亮时会自动变深反色。支持在个性主题里定制分割描边、专属填充底色或导入背景底图。"
            },
            {
                name: "双页滑屏桌面",
                location: "桌面主视口区域",
                usage: "按住屏幕左右轻滑，即可在第 1 页主屏与第 2 页扩展桌面之间顺滑穿梭，底部小圆点会灵动跟随。"
            },
            {
                name: "极简黑白月历组件",
                location: "桌面居中区域（支持在主题中移至第 1 页或第 2 页）",
                usage: "自动读取真实系统年月，周一到周日经典极简排布，自动高亮当天的日期，支持在个性主题中独立开关或调换页面。"
            },
            {
                name: "米白待办便签组件",
                location: "桌面居中区域（支持在主题中移至第 1 页或第 2 页）",
                usage: "点击圆圈可打勾标记完成，完成项会自动划线并在 1.2 秒后优雅消除；点击加号可通过粉白仿 Win 弹窗添加待办；点击火花按钮可根据玩家人设与真实星期一键智能排布一日待办！"
            },
            {
                name: "长按拖拽自由排布",
                location: "桌面 App 图标与小组件（日历/待办卡片）",
                usage: "长按任意 App 图标或小组件约半秒，全部图标与组件会开始轻轻抖动，进入编辑模式；此时按住拖动图标，手指经过的图标会实时让位挪开，松手即可完成换位排列；拖动小组件则会把它挪到另一页（第 1 页与第 2 页之间切换）。编辑模式下点击空白处即可退出。"
            },
            {
                name: "返回桌面横条",
                location: "任何全屏 App 打开后的底部指示条",
                usage: "轻点底部横条或左上角「桌面」按键，即可关闭当前 App 退回桌面。"
            },
            {
                name: "向导与报错悬浮球",
                location: "常驻在屏幕边缘",
                usage: "手指拖拽可贴边停留。点击展开视窗：向导小丸子标签可随时提问玩法与带路；报错日志标签可查看错误堆栈并一键复制或导出诊断文件。"
            }
        ],

        // 独立 App 矩阵玩法字典
        apps: [
            {
                name: "个性主题",
                code: "theme",
                location: "桌面第二排第 3 个应用",
                whatItDoes: "更换壁纸、全层级 HSV 调色、桌面组件多页自由分配与手机字体扩展。",
                howToUse: "从相册选图后按真机比例裁剪壁纸；下拉可自由调节状态栏、图标文字、主体核心草莓粉与纯白底色，全线接入正等边专业 HSV 色相盘与水滴吸色放大镜，支持一键重置默认色彩；可在「桌面小组件」里自由开启关闭日历与待办，并随意把它们分配在第 1 页或第 2 页；内嵌免费商业字体大全外链，可导入本地字体或粘贴 HTML/CSS 全局更换手机字体。"
            },
            {
                name: "系统设置",
                code: "settings",
                location: "底部 Dock 栏中间",
                whatItDoes: "管理大模型接口、联网搜索、悬浮球外观与数据维护。",
                howToUse: "填入 Base URL 与 API Key 测试连通性；可通过关键字搜索并拉取模型；支持「更新该保存」与「另存为新方案」，向导可独立绑定专用方案；可开启必应免Key/博查/秘塔/Tavily实时联网搜索并自定义引用条数与测试；可定制悬浮球大小、手绘套索形状或导入透明PNG皮肤，支持清理临时缓存与配置备份恢复。"
            },
            {
                name: "聊天中心",
                code: "chat",
                location: "桌面第一排第 1 个应用",
                whatItDoes: "与 MC 主播及好友即时通讯。",
                howToUse: "可与官方或自建 NPC 私聊或建群畅聊，支持切换大号/小号身份发言，支持发送猪猪表情包，NPC 会记住你们的重要承诺与聊天记忆。"
            },
            {
                name: "朋友圈",
                code: "moments",
                location: "桌面第一排第 2 个应用",
                whatItDoes: "主播日常生活圈与动态互动。",
                howToUse: "刷主播朋友们的图文日常，点赞评论互动；自己也可以编辑发布带图朋友圈，好友会根据你的内容前来互动回复。"
            },
            {
                name: "油管视频",
                code: "youtube",
                location: "桌面第一排第 3 个应用",
                whatItDoes: "发布视频、查看全网推荐流与网友评论。",
                howToUse: "浏览全网爆款视频推荐流；把录制共创的新视频发布上线；查看视频播放收益并回复网友们五花八门的趣味神评。"
            },
            {
                name: "AO3同人",
                code: "ao3",
                location: "桌面第一排第 4 个应用",
                whatItDoes: "同人小说阅读与开坑连载创作。",
                howToUse: "按 TAG 标签阅读关于主播们的精彩同人小说，在评论区给作者催更投喂；自己也可以自建开坑连载，收获读者追更评论。"
            },
            {
                name: "开播中心",
                code: "streaming",
                location: "桌面第二排第 1 个应用",
                whatItDoes: "开启游戏直播与观众互动。",
                howToUse: "挑选直播分类开启直播，实时应对满屏弹幕、连麦查房突发事件，收取观众礼物打赏并大幅涨粉。"
            },
            {
                name: "主线频道",
                code: "story",
                location: "桌面第二排第 2 个应用",
                whatItDoes: "主播成长生涯的主线回合。",
                howToUse: "消耗行动点推进早/中/晚的重大剧情抉择，推动天数不断向前发展，解锁关键里程碑。"
            },
            {
                name: "商务赞助",
                code: "shop",
                location: "桌面第二排第 4 个应用",
                whatItDoes: "接商业代言赚取资金。",
                howToUse: "挑选适合自己的品牌合作商单，赚取丰厚资金报酬，商单质量会影响你的主播口碑与声誉。"
            },
            {
                name: "相册备份",
                code: "backup",
                location: "底部 Dock 栏右侧",
                whatItDoes: "存档保存、隐写读档与数据导出。",
                howToUse: "将当前游戏进度无损隐写嵌入生成一张拍立得 PNG 相片保存到手机相册，随时导入照片秒级恢复存档，支持本地 JSON 文件导出导入与多存档槽位。"
            },
            {
                name: "塔罗星轨",
                code: "tarot",
                location: "桌面第二页",
                whatItDoes: "塔罗牌占卜抽卡与 AI 解读，桌面还有对应的星象大组件。",
                howToUse: "点击抽取三张牌阵（过去·现在·未来）或单张核心启示牌阵，可呼叫 AI 结合抽到的牌面给出解读；AI 接口默认跟随系统设置里的大模型配置，也可以在塔罗自己的设置里单独绑定一套专属方案。"
            },
            {
                name: "通讯录",
                code: "contacts",
                location: "底部 Dock 栏左侧",
                whatItDoes: "主播名录与自建好友管理。",
                howToUse: "查看所有主播的名片信息、五维属性与好感度阶段；支持自建全新的主播角色添加到通讯录开始互动。"
            }
        ],

        // 允许助手安全带路的 App 动作白名单
        validAppCodes: ['theme', 'chat', 'moments', 'youtube', 'ao3', 'streaming', 'story', 'shop', 'settings', 'backup', 'contacts', 'tarot']
    };

    // 纯白话高密度提示词上下文
    function getGuidePromptContext() {
        let text = "【手机功能与按键速查字典（回答必须严格依据此字典大白话解释，绝不捏造不存在的功能）】：\n";
        text += "1. 手机控制与桌面组件机制：\n";
        USER_GUIDE_REGISTRY.desktopControls.forEach(c => {
            text += `- ${c.name}（位置：${c.location}）：${c.usage}\n`;
        });
        text += "2. 各独立 App 玩法说明与去向：\n";
        USER_GUIDE_REGISTRY.apps.forEach(a => {
            text += `- 【${a.name}】（代号:${a.code}，${a.location}）：${a.whatItDoes} 操作指南：${a.howToUse}\n`;
        });
        text += "\n【如果你想帮用户直接跳转打开应用，必须在回复末尾附带单独标签】：[[GO_APP:应用代号]]\n例如用户说想换壁纸或分配桌面组件，末尾附带 [[GO_APP:theme]]；去配置API或调整悬浮球附带 [[GO_APP:settings]]。仅在有明确跳转意图时附带，普通答疑不带。\n";
        return text;
    }

    // 安全白名单带路跳转
    function openAppByGuide(appCode) {
        if (USER_GUIDE_REGISTRY.validAppCodes.includes(appCode) && typeof window.openPhoneApp === 'function') {
            window.openPhoneApp(appCode);
            return true;
        }
        return false;
    }

    window.MCYT_USER_GUIDE = {
        getPromptContext: getGuidePromptContext,
        openApp: openAppByGuide
    };

})(window);
