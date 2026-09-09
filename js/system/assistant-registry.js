// js/system/assistant-registry.js
// 📱 小手机玩家功能指南字典（纯白话说明，绝无代码术语，防幻觉事实依据）
// ============================================================

(function(window) {
    'use strict';

    const USER_GUIDE_REGISTRY = {
        // 桌面上的常用按键与机制
        desktopControls: [
            {
                name: "锁定屏幕按钮",
                location: "桌面顶部小组件右侧",
                usage: "点击后会进入黑屏时钟锁屏界面，向上滑动或轻点屏幕即可重新解锁。"
            },
            {
                name: "行动点机制",
                location: "桌面顶部小组件显示",
                usage: "每天有 6 点行动点。早晨、中午、晚上推进消耗。可以用在录视频、外出社交或接赞助上。"
            },
            {
                name: "返回桌面横条",
                location: "任何全屏 App 打开后的底部粉色指示条",
                usage: "点击底部的指示条或左上角的「桌面」按键，就能退出当前 App 返回手机主屏。"
            }
        ],

        // 各个 App 的功能和玩法
        apps: [
            {
                name: "个性主题",
                code: "theme",
                location: "桌面第二排第 3 个应用",
                whatItDoes: "更换壁纸和手机配色。",
                howToUse: "支持从相册选图后自由拖拽与双指缩放裁剪壁纸；拥有正等边三角形专业色盘；支持水滴吸色放大镜；还可以把喜欢的配色存为不同方案随心切换，或者导入自己喜欢的字体。"
            },
            {
                name: "聊天中心",
                code: "chat",
                location: "桌面第一排第 1 个应用",
                whatItDoes: "和各路主播发消息交流。",
                howToUse: "可以找游戏里的官方或自建 NPC 单独私聊，或者拉群热聊，支持切换大小号聊天，还能发送好玩的猪猪表情包。"
            },
            {
                name: "朋友圈",
                code: "moments",
                location: "桌面第一排第 2 个应用",
                whatItDoes: "看主播们的生活动态。",
                howToUse: "刷主播朋友们发的日常，给他们点赞、评论互动，自己也可以编辑发布带图动态，NPC 会根据你发的内容来回复哦。"
            },
            {
                name: "油管视频",
                code: "youtube",
                location: "桌面第一排第 3 个应用",
                whatItDoes: "发布视频、查看播放量和网友评论。",
                howToUse: "查看全网的爆款视频推荐流，把自己录制做好的新视频发布出去，并回复网友们五花八门的趣味评论。"
            },
            {
                name: "AO3同人",
                code: "ao3",
                location: "桌面第一排第 4 个应用",
                whatItDoes: "看同人文或者自己写同人文。",
                howToUse: "可以阅读各种关于 MC 主播的同人小说，按 TAG 搜索，在评论区给作者催更，也可以自己开坑连载创作。"
            },
            {
                name: "开播中心",
                code: "streaming",
                location: "桌面第二排第 1 个应用",
                whatItDoes: "开启游戏直播与观众互动。",
                howToUse: "开启直播间，实时应对刷屏弹幕、连麦查房以及突发的直播搞怪事件，赚取打赏收益和涨粉。"
            },
            {
                name: "主线频道",
                code: "story",
                location: "桌面第二排第 2 个应用",
                whatItDoes: "体验主播成长的主线剧情。",
                howToUse: "消耗行动点推进早/中/晚的重大剧情抉择，推动天数不断向前发展。"
            },
            {
                name: "商务赞助",
                code: "shop",
                location: "桌面第二排第 4 个应用",
                whatItDoes: "接广告商单赚钱。",
                howToUse: "挑选适合自己的广告赞助合作，赚取丰厚资金，但要注意别接太烂的商单影响主播声誉口碑。"
            },
            {
                name: "系统设置",
                code: "settings",
                location: "底部 Dock 栏中间",
                whatItDoes: "配置大模型、联网搜索和报错悬浮球。",
                howToUse: "填入 API Key 和 Base URL，测试连通性并拉取模型；开启必应/博查/秘塔等实时联网搜索；调整报错悬浮球大小和导入 PNG 皮肤，清理临时缓存。"
            },
            {
                name: "相册备份",
                code: "backup",
                location: "底部 Dock 栏右侧",
                whatItDoes: "备份存档与读档。",
                howToUse: "可以将当前游戏进度无损隐写生成一张精美的拍立得 PNG 相片保存到相册，随时导入相片还原进度，也支持多槽位手动存档。"
            },
            {
                name: "通讯录",
                code: "contacts",
                location: "底部 Dock 栏左侧",
                whatItDoes: "管理好友名单与自建好友。",
                howToUse: "查看所有主播的名片信息、好感度阶段，也可以自建新的主播角色添加为好友。"
            }
        ],

        // 允许助手安全带路的 App 动作白名单
        validAppCodes: ['theme', 'chat', 'moments', 'youtube', 'ao3', 'streaming', 'story', 'shop', 'settings', 'backup', 'contacts']
    };

    // 纯白话提示词上下文（极其紧凑，约 350 Tokens）
    function getGuidePromptContext() {
        let text = "【小手机功能与按键指南（若用户提问，请严格根据此指南通俗回答，严禁胡编乱造不存在的按键或功能）】：\n";
        text += "1. 常用按键与控制：\n";
        USER_GUIDE_REGISTRY.desktopControls.forEach(c => {
            text += `- ${c.name}（位置：${c.location}）：${c.usage}\n`;
        });
        text += "2. 各应用主要玩法与怎么去：\n";
        USER_GUIDE_REGISTRY.apps.forEach(a => {
            text += `- 【${a.name}】（代号:${a.code}，${a.location}）：${a.whatItDoes} 玩法说明：${a.howToUse}\n`;
        });
        text += "\n【如果你想帮用户直接打开应用，必须在回复末尾附带标签】：[[GO_APP:应用代号]]\n例如：[[GO_APP:theme]] 或 [[GO_APP:settings]]。如果只是普通答疑，不需要带路，则绝不输出标签。\n";
        return text;
    }

    // 安全跳转
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
