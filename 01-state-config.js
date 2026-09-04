        // ============================================================
        // CONFIG & STATE
        // ============================================================
        const CONFIG = {
            DEFAULT_BASE_URL: 'https://api.deepseek.com/v1',
            DEFAULT_MODEL: 'deepseek-chat',
            MAX_TOKENS: 10000,
            TEMPERATURE: 0.85,
        };
        // ---- 评论库 ----
        const COMMENTS_UNIVERSAL = [
            "这个视频太棒了！期待更多！", "主播真的好有才，每个视频都质量超高！", "太喜欢你的风格了，继续加油！",
            "MC圈的一股清流，爱了爱了❤️", "每次看你的视频都能学到新东西，太感谢了！", "你的建筑风格太独特了，我超爱！",
            "这么用心的视频，必须三连！", "主播的声音好好听，听着很舒服", "你的红石技术真的好厉害，膜拜大佬",
            "这个系列我追定了，太精彩了！", "从你的第一个视频就开始关注，进步真的好大", "你的视频总是能让我笑出声，太有趣了",
            "这么高质量的视频，粉丝数应该更多才对！", "主播的创意真的无穷无尽，太强了", "每次看你的视频都是一种享受",
            "主播能出个教程吗？想学这个！", "这个材质包是什么？好好看", "你用的光影是什么？求分享",
            "能告诉我这个建筑用了哪些材料吗？", "主播平时直播吗？在哪个平台？", "这个红石装置的原理是什么？能解释一下吗？",
            "你的皮肤是自己做的吗？好好看", "能和我一起联机吗？好想和你一起玩", "这个地图种子是什么？想试试",
            "主播玩MC多久了？技术这么好", "这个红石电路设计太精妙了，学到了", "原来还可以这样操作，我试了好久都没成功",
            "这个建筑的结构很稳，我也要试试", "你的PvP技巧真的好强，能教教我吗", "这个Mod我也玩过，但没有你玩得这么溜",
            "生存模式能玩成这样，真的太厉害了", "这个自动化农场设计真的很实用", "你的建筑比例掌握得真好，学习了",
            "这个红石计算器真的能用吗？太神奇了", "你的操作真的很流畅，练了多久？", "下一期什么时候出？等不及了！",
            "求更新！这个系列太好看了", "已经三连了，快更新吧！", "这个视频结尾太吊胃口了，快出下一期",
            "每天都来看你有没有更新，等得好着急", "这个系列一定要继续做下去啊！", "催更！催更！催更！重要的事情说三遍",
            "能不能出一个更长的视频？看不够", "这个题材太喜欢了，希望能多做几期", "我已经把这个视频看了三遍了，快出新的吧",
            "主播你是在用脚玩游戏吗？这么强", "这个操作我学会了，然后手残了", "脑子：我会了 手：不，你不会",
            "主播你是不是偷偷开了挂？", "这个视频我看的时候全程是🐶的表情", "前面的弹幕说主播菜，出来挨打！",
            "主播你是不是吃了什么药？这么猛", "这个视频让我怀疑自己玩的是假MC", "主播别秀了，我膝盖都跪烂了",
            "这个操作，我愿称之为绝活", "我上次也试过这样做，然后炸了家😂", "看到你这个视频，我想起了我第一次玩MC的时候",
            "这个建筑让我想起了我的生存档，也是这么建的", "我朋友也喜欢这么玩，我要把这个视频分享给他",
            "你的视频让我重新燃起了玩MC的热情", "我玩了五年MC，今天才知道可以这样", "这个视频看得我手痒，马上打开游戏",
            "我儿子也喜欢看你的视频，他说要跟你学", "你的视频陪伴我度过了很多个夜晚，谢谢你",
            "每次心情不好的时候就看你的视频，会开心很多", "我是来自末影龙的信使，你被选中了！",
            "村民议会发来贺电，你的建筑太强了", "我是苦力怕，我表示很害怕😱", "来自下界的问候，你的红石很厉害",
            "我是Him，我认可你的实力", "这个BGM是什么？好好听", "视频的剪辑真的好流畅，专业！",
            "你的封面每次都做得很好看", "这个视频的节奏把控得太好了", "能告诉我你的录制设备吗？我也想试试",
            "你的视频质量真的越来越高，进步明显", "这个idea真的太有创意了，怎么想到的？",
            "你的视频让我对MC有了新的认识", "希望你能一直做下去，我会一直支持的",
            "这个视频值得被更多人看到，我转发了"
        ];
        const COMMENTS_TEACH = [
            "这个教程太详细了，照着做一遍就学会了！", "讲解清晰，逻辑分明，学到了很多。", "老师讲得真好，期待更多教学视频。",
            "红石部分讲得透彻，我终于搞懂了。", "这个建筑技巧太实用了，感谢分享。", "从零开始讲，新手友好，赞！",
            "干货满满，收藏了慢慢学。", "每个步骤都解释得很清楚，没有跳步骤。", "主播的技术水平真的高，教学也很用心。",
            "这个指令用法我找了好久，终于在这里看到了。", "实用的小技巧，提高了效率。", "看完这个视频，我重新燃起了建造的热情。",
            "讲解节奏很好，不拖沓也不快。", "非常适合新手入门，强烈推荐。", "之前一直不懂，看完豁然开朗。",
            "这个红石电路设计太精妙了，学到了精髓。", "细节处理很到位，能感受到主播的用心。", "收藏了，下次建造的时候参考。",
            "这个技巧我试了一下，确实好用。", "讲解很耐心，每一步都照顾到了。", "视频节奏把控得很好，不会觉得累。",
            "硬核教学视频就该这样，不啰嗦，全是知识点。", "主播的技术储备真的很丰富。", "这个教程让我对MC有了新的理解。",
            "我已经把这个视频分享给朋友了，一起学习。", "这个模组教程太有用了，感谢。", "从简单到复杂，循序渐进，非常棒。",
            "学到了一直想学的建筑风格，谢谢主播。", "这个视频的剪辑也很清晰，重点突出。", "全程无废话，全是干货，好评。",
            "这个红石教学让我对自动化有了新的想法。", "主播的讲解很生动，不枯燥。", "看完这个视频，我感觉自己变强了。",
            "这个技巧很实用，以后建东西快多了。", "教学视频就该这样，简单易懂。", "主播的耐心程度让人佩服。",
            "这个教程拯救了我的生存档，感谢！", "从原理到应用，讲得很全面。", "这个视频值得反复观看。",
            "终于搞懂了这个机制，感谢主播。", "讲解很透彻，连我这种小白都听懂了。", "这个视频的含金量很高。",
            "我已经按照教程建了一个，效果很棒。", "这个技巧我试过，确实有效。", "主播的教学风格很舒服，不会觉得有压力。",
            "这个视频让我对红石有了新的认识。", "细节讲解很到位，不会遗漏。", "我已经关注了，期待更多教学视频。",
            "这个教程是我见过最好的之一。", "主播的讲解很有条理，逻辑清晰。", "看完这个视频，我决定重新玩MC了。"
        ];
        const COMMENTS_ENTERTAIN = [
            "哈哈哈哈笑死我了，主播太有才了！", "这个整活太抽象了，我爱了。", "主播的脑洞真的很大，每次都能整出新活。",
            "笑到肚子疼，这个视频太欢乐了。", "这波操作太骚了，我直接笑喷。", "主播太会整活了，路转粉。",
            "这个梗我能笑一年，太经典了。", "主播的表情和反应好生动，笑死。", "这个视频的节奏太棒了，全程高能。",
            "我已经笑疯了，主播赔我桌子。", "这种整活视频太解压了，心情都变好了。", "主播的幽默感真的绝了。",
            "这个视频我看了三遍，每次都有新笑点。", "主播的剪辑好鬼畜，爱了爱了。", "整活还得是你，哈哈哈。",
            "这个骚操作我学会了，下次我也要整。", "主播的粉丝都好有趣，弹幕也欢乐。", "这个视频看得我心情大好。",
            "主播的整活能力真的强，每期都有惊喜。", "笑死我了，这个视频我要收藏。", "主播太会带动气氛了，全程无冷场。",
            "这个整活让我想起了以前的经典，好怀念。", "主播的创意真的无限，每次都有新花样。", "看完这个视频，我心情好了很多。",
            "这个视频太魔性了，我反复观看。", "主播的声音配合整活太有喜感了。", "这个节奏卡得太好了，节目效果满分。",
            "我已经安利给朋友了，一起笑。", "主播的整活风格很独特，爱了。", "这个视频让我忘记了烦恼，感谢。",
            "笑点密集，全程高能，好评。", "主播的整活越来越有水平了。", "这个视频太适合下饭了，哈哈。",
            "主播的粉丝群都是人才，哈哈哈。", "这个整活太真实了，我笑出眼泪。", "主播的表演好自然，像朋友一样。",
            "这个视频的BGM配得真好，氛围拉满。", "主播的整活总能戳中我的笑点。", "这个视频我已经循环播放了。",
            "主播的创意真的很棒，期待更多整活。", "这个整活让我想起自己的黑历史，哈哈。", "主播的节目效果一直很稳。",
            "这个视频太有意思了，我看了好几遍。", "主播的整活风格很接地气，喜欢。", "这个视频让我感受到了快乐，谢谢。",
            "主播的整活能力越来越强了，加油。", "这个视频我已经分享到朋友圈了。", "笑死，主播太会玩了。",
            "这个整活很有新意，以前没见过。", "主播的幽默感是天赋吧，太强了。", "这个视频太适合和朋友一起看了。"
        ];
        const COMMENTS_EPIC = [
            "这个剪辑太燃了，看得我热血沸腾！", "节奏感太强了，全程无尿点。", "主播的剪辑技术真的太厉害了。",
            "这个战斗场面剪得好有电影感。", "音乐和画面配合得天衣无缝，太震撼了。", "看得我心跳加速，太刺激了。",
            "这个视频的质感太好了，像大片一样。", "主播的剪辑真的很有天赋，每帧都能当壁纸。", "这个视频让我感受到了MC的魅力。",
            "太帅了，我已经反复看了好几遍。", "这个剪辑的节奏掌控得太好了，情绪调动满分。",
            "看完这个视频，我整个人都燃起来了。", "这个视频的BGM选得太棒了，氛围感拉满。", "主播的剪辑水平真的进步很大。",
            "这个视频值得三连，太精彩了。", "剪辑流畅，转场自然，看起来很舒服。", "这个视频让我对MC有了新的认识，原来可以这么燃。",
            "主播的审美真的在线。", "这个视频的每一帧都经过精心设计。", "太震撼了，我已经推荐给所有人了。",
            "这个视频的节奏把控得很好，张弛有度。", "主播的剪辑风格很独特，很有辨识度。", "这个视频的感染力太强了，我都想打游戏了。",
            "这个视频我看得目瞪口呆。", "剪辑技术太娴熟了，一看就是老手。", "这个视频的视觉效果太棒了，色彩搭配很好。",
            "主播的创作能力真的强，每期都是精品。", "这个视频让我想起了我最爱的电影片段。", "太精彩了，我已经收藏了。",
            "这个视频的剪辑很细腻，细节到位。", "主播对节奏的把控真的炉火纯青。", "这个视频的BGM和画面完美契合。",
            "剪辑流畅不拖沓，看起来很爽。", "这个视频的质量太高了，完全不输专业剪辑师。", "主播的创意和技术都是顶级的。",
            "这个视频让我感受到了MC的无限可能。", "太燃了，我看了直接想开一把。", "这个视频的剪辑很用心，能看出来。",
            "主播的剪辑风格很有个人特色。", "这个视频的视觉效果很惊艳。", "节奏紧凑，全程高能，好评。",
            "这个视频的剪辑很干净，没有多余部分。", "主播的技术和审美都在线。", "这个视频让我对MC有了新的热爱。",
            "太棒了，这个视频我看了很多遍。", "主播的剪辑真的很有才华。", "这个视频的感染力很强，让人沉浸其中。",
            "这个视频的质量很高，值得推荐。", "剪辑流畅，节奏感强，很喜欢。", "主播的创作能力越来越强了。",
            "这个视频让我感到震撼。"
        ];
        const COMMENTS_SURVIVAL = [
            "这个生存实况太真实了，爱了！", "主播的生存技术好强，学到了。", "看主播求生好有意思，继续更新！",
            "这个开局太惨了，哈哈哈", "主播运气真好，开局就有钻石", "生存实况就该这样，慢慢发育。",
            "这个基地建得不错，有创意。", "主播的生存技巧很实用。", "看生存实况最解压了。",
            "这个下界冒险好刺激！", "主播的农场设计很高效。", "生存实况必追！"
        ];
        const COMMENTS_MOVIE = [
            "这剧情太棒了，有电影感！", "微电影质量好高，演员演技在线", "这个剧情转折出乎意料",
            "好感动，看哭了", "MC也能拍出这么好的剧情", "期待下一集！",
            "这个剧本写得太好了", "主播的导演水平真高", "画面构图很电影化",
            "这个结局回味无穷", "微电影就应该这样拍", "强烈推荐！"
        ];
        const COMMENTS_ANIMATION = [
            "动画好流畅，技术力拉满！", "这个动画风格好可爱", "MC动画居然能做得这么精致",
            "动作设计很到位", "这个渲染效果太棒了", "动画剧情也很有意思",
            "主播的动画制作水平真高", "好希望我也能做出这样的动画", "这个动画系列我追定了",
            "帧数好高，太丝滑了", "色彩搭配很舒服", "MC动画的未来！"
        ];
        // ---- 弹幕库 ----
        const DANMAKU_ORIGINAL = [
            "Hey, 主播今天状态真好！", "Wow, 这个操作太酷了！", "Oh, 终于等到直播了！",
            "Yeah, 今天玩什么？", "Hmm, 这个建筑好漂亮", "Alright, 主播加油！",
            "Nah, 这也太简单了吧", "Cool, 这个红石机关好厉害", "Damn, 这也太强了！",
            "Wow, 主播皮肤好好看", "Hey, 能不能联机呀？", "Oh, 这个光影真不错",
            "Yeah, 我喜欢这个系列", "Hmm, 主播今天心情不错", "Alright, 继续继续",
            "Nah, 这不可能！", "Cool, 学到了学到了", "Damn, 这操作太秀了",
            "Wow, 这个地图好大", "Hey, 主播多大了？", "Oh, 原来是这样",
            "Yeah, 太棒了！", "Hmm, 有点意思", "Alright, 支持主播",
            "Nah, 我不信", "Cool, 我也要试试", "Damn, 太厉害了",
            "Wow, 这个mod好有趣", "Hey, 主播吃饭了吗？", "Oh, 我也想要这个",
            "Yeah, 继续加油！", "Hmm, 这个难度有点高", "Alright, 我学会了",
            "Nah, 肯定有更好的方法", "Cool, 主播好有耐心", "Damn, 这都能过？",
            "Wow, 这个建筑太宏伟了", "Hey, 主播有女朋友吗？", "Oh, 这么神奇",
            "Yeah, 今天直播好精彩", "Hmm, 有点困了但还想看", "Alright, 再玩一会儿",
            "Nah, 我不信你做到了", "Cool, 这个红石电路好复杂", "Damn, 这波操作满分",
            "Wow, 主播声音好好听", "Hey, 能教教我吗？", "Oh, 原来可以这样",
            "Yeah, 这个视频我看了三遍了", "Hmm, 主播是不是累了？", "Alright, 休息一下也好",
            "Nah, 你肯定开了挂", "Cool, 这个设计真巧妙", "Damn, 太有创意了",
            "Wow, 这个下界好危险", "Hey, 主播小心点", "Oh, 太刺激了",
            "Yeah, 这才是真正的MC", "Hmm, 这个村庄好可怜", "Alright, 保护好村民",
            "Nah, 村民会报复的", "Cool, 这个陷阱太狠了", "Damn, 村民好惨",
            "Wow, 这个追逐战好紧张", "Hey, 快跑！", "Oh, 差一点就赢了",
            "Yeah, 太精彩了", "Hmm, 主播技术真强", "Alright, 下次我也试试",
            "Nah, 我不信你能击败末影龙", "Cool, 这个末影龙好大", "Damn, 终于打过了",
            "Wow, 这个结局好感动", "Hey, 主播继续更新", "Oh, 我哭了",
            "Yeah, 这个系列必追", "Hmm, 什么时候出下一期", "Alright, 我要三连",
            "Nah, 催更催更", "Cool, 主播最棒", "Damn, 爱了爱了"
        ];
        const DANMAKU_POSITIVE = [
            "主播今天好棒，爱了爱了", "哇，这个操作太帅了", "哈哈，太有节目效果了",
            "主播的声音好治愈", "红石玩得真六", "建筑好有创意",
            "这个生存好真实", "主播好有耐心", "节奏把握得真好",
            "全程高能，没有冷场", "剪辑质量好高", "主播的幽默感太强了",
            "这个系列必追", "粉丝来报道了", "刚入坑，被圈粉了",
            "主播的技术真强", "氛围好棒，像朋友在玩", "这个视频太下饭了",
            "希望主播能一直做下去", "今天状态好好", "太快乐了，哈哈哈哈",
            "主播的创意无限", "这个光影好美", "学到了好多新东西",
            "主播的皮肤好帅", "弹幕好欢乐", "一直在笑，停不下来",
            "这个玩法好有意思", "主播好温柔", "强烈推荐这个视频",
            "看得我好想玩MC", "主播的解说好清晰", "节奏舒适，不紧不慢",
            "这个视频质量真高", "主播的穿搭好酷", "太喜欢这个风格了",
            "主播的粉丝都好好", "这个梗我记住了", "主播的脑洞太大了",
            "这个合作好默契", "画面太美了", "主播的剪辑好流畅",
            "这个系列我追定了", "主播的乐观感染了我", "太有爱了",
            "主播的直播好有趣", "这个视频值得三连", "我已经推荐给朋友了",
            "主播的声音好稳", "这个氛围太舒服了"
        ];
        const DANMAKU_NEGATIVE = [
            "这操作有点菜啊", "节奏太慢了，快进", "这个建筑不太行",
            "红石设计有缺陷", "感觉不如以前", "主播今天状态不好吗",
            "这个视频有点无聊", "剪辑太混乱了", "能不能认真点",
            "这个系列已经看腻了", "太拖沓了", "这也能叫教程？",
            "有些地方没讲清楚", "这个玩法太常见了", "不太喜欢这个风格",
            "主播能不能换点新意", "这个合作有点尬", "弹幕都在刷什么",
            "这个视频节奏不对", "画面有点糊", "声音有点小",
            "内容有点水", "感觉主播不在状态", "这个挑战太简单了",
            "这个梗用烂了", "有点审美疲劳", "不太合我口味",
            "这个视频的亮点在哪", "主播能认真点吗", "这个操作失误太多了",
            "这个建筑有点丑", "红石逻辑有问题", "生存技巧太基础了",
            "这个创意一般般", "节奏乱了", "弹幕太吵了",
            "感觉主播在划水", "这个视频质量下降了", "这个玩法太老了",
            "主播能换点新花样吗", "这个合作不够默契", "剪辑有点生硬",
            "这个视频太长了", "有点失望", "不太喜欢这个主播的风格",
            "这个挑战没有难度", "这个系列已经过时了", "这个视频没什么内容",
            "感觉主播有点敷衍", "这个建筑比例不对", "这个视频不推荐"
        ];
        const ALL_DANMAKU = [...DANMAKU_ORIGINAL, ...DANMAKU_POSITIVE, ...DANMAKU_NEGATIVE];
        // ============================================================
        // NPC 定义（删除了 LookOut3D、SlipperyHC、Reff）
        // ============================================================
        const NPC_GROXMC = {
            id: 'groxmc',
            name: 'Groxmc',
            gender: '男',
            persona: '骚话连篇但以较自我为中心，风趣幽默，和熟人合作时"暴露本性"，和不熟的主播合作时比较安静。早期视频温良，现在以血腥抽象暴力为主，暴虐村民为卖点，被粉丝调侃为"爱民TV"。口头禅：hey yo chill / Alright bet / I bet。直播风格风趣幽默，和视频反差较大，说话不会很大声。',
            appearance: '一个穿黑色西装打红色领带的黑色骷髅，气质冷峻而帅气，带有一种危险的魅力。',
            skin: '黑色西装打红色领带的黑色骷髅',
            category: '血腥抽象暴力、村民虐待',
            followers: 7420000,
            catchphrase: 'hey yo chill',
            streamStyle: '风趣幽默，声音不大',
            avatarEmoji: '💀',
            initialFavor: 0,
            favor: 0,
            interactionCount: 0,
            works: [
                '《100万个村民模拟文明》(1,000,000 Villagers Simulate Civilization)：让百万村民模拟文明发展，Grox因各种原因毁灭了整个文明。',
                '《100万村民追猎》(1,000,000 Villager Manhunt)：一百万村民对Grox展开大追猎，充满生存与追逐的紧张感。',
                '《如何奴役Minecraft中的村民》(How To Enslave Villagers in Minecraft)：杀掉铁傀儡后强迫村民为其建造豪宅，并征服其他村庄。',
                '《村民鱿鱼游戏》(Minecraft Villager Squid Game)：让村民参与残酷的"鱿鱼游戏"以争夺奖金。',
                '《让10000个村民崇拜我》(I made 10,000 villagers worship me)：通过一系列操作让大量村民对自己进行崇拜。'
            ],
            _confessed: false,
            _relationship: 'single',
            skills: { building: 95, redstone: 80, pvp: 25, survival: 95, hunting: 60 }
        };
        const NPC_TWIXXEL = {
            id: 'twixxel',
            name: 'Twixxel',
            gender: '男',
            persona: '性格温和，总会在关键的时候给出方法，或出现在别人的视频里以推动剧情。胆子不大，有点怕怪物，但看见空荡荡的破旧房屋仍然会选择住进去。直播风格抽象，偶尔玩段子。',
            appearance: '通体纯黑色，仅有四个白色像素点的眼睛和白色像素点的微笑嘴，看起来神秘又带有一丝可爱，俊美中透着诡异。',
            skin: '通体纯黑色，仅有四个像素点的眼睛，七个像素点的微笑嘴',
            category: '伪实况、恐怖模组实况',
            followers: 1090000,
            catchphrase: 'Oh no...',
            streamStyle: '抽象风，偶尔段子',
            avatarEmoji: '👾',
            initialFavor: 0,
            favor: 0,
            interactionCount: 0,
            works: [
                '《I\'ve genuinely never been this scared》：被神秘生物跟踪狩猎，社区为此制作了整合包。',
                '《VR Minecraft with a BANNED Horror Mod》：VR中被"被禁"恐怖模组追赶。',
                '《There was no escaping it》：无处可逃的压迫感。',
                '《Something is Already Here...》 / 《Something Was Talking to Me...》：主打未知存在悄然接近的心理恐怖。',
                '《Twixxel\'s Stalkers》：将视频概念做成模组，被神秘生物观察、跟随和猎杀。'
            ],
            _confessed: false,
            _relationship: 'single',
            skills: { building: 60, redstone: 40, pvp: 50, survival: 85, hunting: 80 }
        };
        const NPC_XQREE = {
            id: 'xqree',
            name: 'xqree',
            gender: '男',
            persona: '外表性格非常温和，实际敢爱敢恨，面对讨厌的人或事物不会手软，但面对喜欢的人又会变得温和有礼；胆子小，但似乎知道自己声音好听所以被吓到就喘。创作风格刺激惊悚但透露着淡淡的幽默。',
            appearance: '穿着西装，头上戴一顶类似于俄罗斯战斗民族的遮耳帽，肤色为黑，眼睛为白色，整体气质帅气而神秘。',
            skin: '穿着西装，头上戴俄罗斯战斗民族的遮耳帽，肤色为黑，眼睛为白色',
            category: '伪实况、二创，扩大verity世界观',
            followers: 110000,
            catchphrase: 'Oh gosh...',
            streamStyle: '暂无直播',
            avatarEmoji: '🐰',
            initialFavor: 0,
            favor: 0,
            interactionCount: 0,
            works: [
                '《Falsity》系列：知名《Verity》小黄球AI助手模组故事的续作或衍生，围绕xqree与蓝色球形AI助手"Falsity"的互动展开。'
            ],
            _confessed: false,
            _relationship: 'single',
            skills: { building: 80, redstone: 55, pvp: 80, survival: 50, hunting: 50 }
        };
        const NPC_DREAM = {
            id: 'dream',
            name: 'Dream',
            gender: '男',
            persona: '技术超群、自信张扬的速通者，天性神秘，喜欢伪装真实想法。享受权力和控制，不轻易表露内心。',
            appearance: '白色笑脸面具，绿色上衣，黑色裤子，身材修长，气质神秘而俊美。',
            skin: '白色笑脸面具，绿色上衣，黑色裤子',
            category: 'Manhunt、速通、Dream SMP',
            followers: 35000000,
            catchphrase: 'In this video...',
            streamStyle: '快节奏、高强度挑战，充满紧张感',
            avatarEmoji: '🎭',
            initialFavor: 0,
            favor: 0,
            interactionCount: 0,
            works: [
                '《Minecraft Manhunt》系列：速通者 vs 猎人，其中最著名的《Minecraft Speedrunner VS 3 Hunters GRAND FINALE》观看量超1.14亿。',
                '《Minecraft Speedrunner VS Hunter (FIRST EVER)》：Manhunt系列首支视频，2019年12月27日发布。',
                '《Finding PewDiePie\'s Minecraft Seed》系列：助Dream早期成名的重要系列。'
            ],
            _confessed: false,
            _relationship: 'single',
            minFollowersForDM: 500000,
            skills: { building: 90, redstone: 90, pvp: 100, survival: 100, hunting: 100 }
        };
        const NPC_THATMOB = {
            id: 'thatmob',
            name: 'ThatMob',
            gender: '男',
            persona: '20岁的加拿大/法国人，性格随和、健谈、幽默，带点傲娇。外表为炭黑色皮肤、黑发、翠绿眼睛，常穿带绿色护目镜的黑色战术夹克。创作风格以恐怖模组和ARG系列为主，对粉丝友善但偶尔傲娇。',
            appearance: '炭黑色皮肤，黑发，翠绿眼睛，穿带绿色护目镜的黑色战术夹克，气质酷帅。',
            skin: '黑色系皮肤，绿色护目镜，黑色战术夹克',
            category: '恐怖游戏/模组、ARG',
            followers: 2400000,
            catchphrase: '',
            streamStyle: '随和、健谈、充满活力，带点黑色幽默和自信',
            avatarEmoji: '👽',
            initialFavor: 0,
            favor: 0,
            interactionCount: 0,
            works: [
                '《Verity》系列：知名虚构ARG恐怖系列，围绕神秘AI助手和恐怖事件展开。'
            ],
            _confessed: false,
            _relationship: 'single',
            skills: { building: 60, redstone: 50, pvp: 40, survival: 75, hunting: 70 }
        };
        // ---- 新增 NPC: Whispy ----
        const NPC_WHISPY = {
            id: 'whispy',
            name: 'Whispy',
            gender: '男',
            persona: '性格充满活力，好感＜40前较为冷淡，但相对温和。玩家好感大于40后话唠且粘人，被粉丝亲切地称为"小南瓜"。有自己的脾气会生气，并不是一直都很温和，真生气了会一声不吭，和玩家的好感达到"暗生情愫"阶段有时候会开玩笑生气实际上就是想逗逗玩家。好感度大于40后该NPC主动发消息给玩家的频率更高。',
            appearance: '橙色南瓜头，粉色连帽衫，整体可爱又带点神秘。',
            skin: '橙色南瓜头，粉色连帽衫',
            category: 'Minecraft 恐怖模组游戏内容创作者、知名 Minecraft 系列《Verity》中 AI 角色 Verity 的配音演员。',
            followers: 210000,
            catchphrase: '',
            streamStyle: '高萌',
            avatarEmoji: '🎃',
            initialFavor: 0,
            favor: 0,
            interactionCount: 0,
            works: [
                '为 ThatMob 的《Verity》系列中同名AI黄球形状角色配音'
            ],
            _confessed: false,
            _relationship: 'single',
            skills: { building: 55, redstone: 40, pvp: 35, survival: 70, hunting: 60 }
        };
        // ============================================================
        // GLOBAL STATE
        // ============================================================
        let G = {
            ai: { baseUrl: '', apiKey: '', model: '' },
            savedModels: [],
            _pulledModels: {},
            search: { apiKey: '', enabled: false },
            player: {
                identity: 'new',
                age: 18,
                gender: '女',
                ytName: 'MC_CraftMaster',
                persona: '',
                skin: '',
                category: '剧情',
                followers: 0,
                likes: 0,
                money: 0,
                videos: [],
                streams: [],
                friends: [],
                dms: [],
                fanClubLevel: 0,
                energy: 100,
                isStudent: true,
                isVacation: true,
                skills: { building: 0, redstone: 0, pvp: 0, survival: 0, hunting: 0 },
                streamHistory: [],
                avatar: null,
                equipmentLevel: 1,
                metDream: false,
                lovers: [],
                personaStyle: 'neutral'
            },
            day: 1,
            timeSlot: 0,
            actionPoints: 6,
            maxActionPoints: 6,
            phase: 'setup',
            storyHistory: [],
            memorySummaries: [],
            memorySummarySettings: {
                enabled: false,
                threshold: 10,
                keepRecent: 5,
                modelProfileId: '',
            },
            usedThemes: new Set(),
            isGenerating: false,
            totalVideos: 0,
            totalStreams: 0,
            totalCollabs: 0,
            totalDMs: 0,
            currentStream: null,
            npcs: {
                groxmc: { ...NPC_GROXMC },
                twixxel: { ...NPC_TWIXXEL },
                xqree: { ...NPC_XQREE },
                dream: { ...NPC_DREAM },
                thatmob: { ...NPC_THATMOB },
                whispy: { ...NPC_WHISPY }
            },
            chatHistory: {},
            _chatMsgId: 0,
            fanworks: [],
            fanclubMessages: [],
            _fanworkId: 0,
            _fanclubMsgId: 0,
            currentChatNpc: null,
            confessionState: null,
            collections: {},
            _lastBriefing: null,
            memoir: [],
            _logId: 0,
            _npcDailyConfession: {},
            feed: [],
            feedIdCounter: 0,
            achievements: [],
            unlockedAchievements: [],
            sponsorOffers: [],
            sponsorCooldown: 0,
            milestoneReached: [],
            _npcInitiatedToday: {},
        };
        // DOM refs
        const $ = id => document.getElementById(id);
        const dom = {
            setupPage: $('setupPage'),
            gamePage: $('gamePage'),
            identityGroup: $('identityGroup'),
            age: $('ageInput'),
            ytName: $('ytNameInput'),
            persona: $('personaInput'),
            skin: $('skinInput'),
            category: $('categorySelect'),
            startBtn: $('startGameBtn'),
            dayDisplay: $('dayDisplay'),
            timeDisplay: $('timeDisplay'),
            apDisplay: $('apDisplay'),
            apDots: $('apDots'),
            storyArea: $('storyArea'),
            streamContainer: $('streamContainer'),
            dashboardTab: $('dashboardTab'),
            shopTab: $('shopTab'),
            socialTab: $('socialTab'),
            dataTab: $('dataTab'),
            memoirTab: $('memoirTab'),
            feedTab: $('feedTab'),
            achievementsTab: $('achievementsTab'),
            modal: $('modal'),
            modalBody: $('modalBody'),
            modalClose: $('modalClose'),
            toast: $('toast'),
            storyTab: $('storyTab'),
            headerAvatarImg: $('headerAvatarImg'),
            avatarPreview: $('avatarPreview'),
            avatarFileInput: $('avatarFileInput'),
            uploadAvatarBtn: $('uploadAvatarBtn'),
            saveGameBtn: $('saveGameBtn'),
            loadGameBtn: $('loadGameBtn'),
        };
        // ============================================================
        // UTILITY
        // ============================================================
        function getTimeSlotName(slot) { return ['早晨 ☀️', '中午 🌤️', '夜晚 🌙'][slot] || '早晨'; }

        function showToast(msg, type = 'error', duration = 3000) {
            const t = dom.toast;
            t.textContent = msg;
            t.className = 'toast show ' + (type === 'success' ? 'success' : '');
            clearTimeout(t._hide);
            t._hide = setTimeout(() => { t.className = 'toast'; }, duration);
        }

        function getRadioValue(groupId) {
            const el = document.getElementById(groupId);
            const checked = el.querySelector('input:checked');
            return checked ? checked.value : null;
        }

        function setRadioValue(groupId, val) {
            const el = document.getElementById(groupId);
            const inputs = el.querySelectorAll('input');
            inputs.forEach(inp => { inp.checked = (inp.value === val); });
        }

        function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

        function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

        function getFavorStage(favor) {
            if (favor >= 100) return '💖 挚爱/宿命';
            if (favor >= 80) return '💞 唯一/宿命';
            if (favor >= 60) return '💗 心动偏袒';
            if (favor >= 40) return '💕 暗生情愫';
            if (favor >= 20) return '🤝 友好';
            return '👋 陌生疏离';
        }

        function addMemoir(event, details = '') {
            const entry = { id: G._logId++, day: G.day, event: event, details: details, timestamp: new Date().toLocaleString() };
            G.memoir.push(entry);
            if (G.memoir.length > 100) G.memoir = G.memoir.slice(-100);
        }

        function detectPersonaStyle(personaText) {
            const lower = (personaText || '').toLowerCase();
            if (lower.includes('害羞') || lower.includes('安静') || lower.includes('内向') || lower.includes('社恐') ||
                lower.includes('腼腆') || lower.includes('沉默') || lower.includes('寡言')) {
                return 'introvert';
            }
            if (lower.includes('嚣张') || lower.includes('自信') || lower.includes('自大') || lower.includes('狂') ||
                lower.includes('张扬') || lower.includes('霸气') || lower.includes('狂妄')) {
                return 'arrogant';
            }
            if (lower.includes('温柔') || lower.includes('柔和') || lower.includes('温暖') || lower.includes('体贴')) {
                return 'gentle';
            }
            if (lower.includes('幽默') || lower.includes('搞笑') || lower.includes('有趣') || lower.includes('逗') ||
                lower.includes('欢乐')) {
                return 'humorous';
            }
            if (lower.includes('外向') || lower.includes('活泼') || lower.includes('开朗') || lower.includes('热情') ||
                lower.includes('阳光')) {
                return 'extrovert';
            }
            return 'neutral';
        }
        // 成就定义
        const ACHIEVEMENTS = [
            { id: 'fans_1k', name: '✨ 初露锋芒', desc: '粉丝达到 1,000', icon: '✨', reward: 1000, category: 'fans',
                check: () => G.player.followers >= 1000 },
            { id: 'fans_5k', name: '🌟 小有名气', desc: '粉丝达到 5,000', icon: '🌟', reward: 10000, category: 'fans',
                check: () => G.player.followers >= 5000 },
            { id: 'fans_10k', name: '🔥 圈内新星', desc: '粉丝达到 10,000', icon: '🔥', reward: 15000, category: 'fans',
                check: () => G.player.followers >= 10000 },
            { id: 'fans_100k', name: '👑 成名在望', desc: '粉丝达到 100,000', icon: '👑', reward: 20000, category: 'fans',
                check: () => G.player.followers >= 100000 },
            { id: 'fans_1m', name: '💎 百万大咖', desc: '粉丝达到 1,000,000', icon: '💎', reward: 50000, category: 'fans',
                check: () => G.player.followers >= 1000000 },
            { id: 'fans_5m', name: '🚀 五百万霸主', desc: '粉丝达到 5,000,000', icon: '🚀', reward: 1000000, category: 'fans',
                check: () => G.player.followers >= 5000000 },
            { id: 'fans_10m', name: '🌍 千万传奇', desc: '粉丝达到 10,000,000', icon: '🌍', reward: 10000000, category: 'fans',
                check: () => G.player.followers >= 10000000 },
            { id: 'video_1', name: '🎬 首次发布', desc: '发布第 1 个视频', icon: '🎬', reward: 100, category: 'video',
                check: () => G.player.videos.length >= 1 },
            { id: 'video_10', name: '📹 辛勤创作者', desc: '发布第 10 个视频', icon: '📹', reward: 1000, category: 'video',
                check: () => G.player.videos.length >= 10 },
            { id: 'video_50', name: '🎥 高产大户', desc: '发布第 50 个视频', icon: '🎥', reward: 1500, category: 'video',
                check: () => G.player.videos.length >= 50 },
            { id: 'video_100', name: '🏅 百部巨匠', desc: '发布第 100 个视频', icon: '🏅', reward: 10000, category: 'video',
                check: () => G.player.videos.length >= 100 },
            { id: 'stream_1', name: '🔴 首次开播', desc: '完成第一次直播', icon: '🔴', reward: 500, category: 'stream',
                check: () => G.player.streamHistory.length >= 1 },
            { id: 'stream_10', name: '📡 直播常客', desc: '累计直播 10 次', icon: '📡', reward: 1000, category: 'stream',
                check: () => G.player.streamHistory.length >= 10 },
            { id: 'stream_50', name: '📺 直播狂人', desc: '累计直播 50 次', icon: '📺', reward: 10000, category: 'stream',
                check: () => G.player.streamHistory.length >= 50 },
            { id: 'friend_1', name: '🤝 初次交友', desc: '结交第 1 位好友', icon: '🤝', reward: 100, category: 'social',
                check: () => G.player.friends.length >= 1 },
            { id: 'friend_5', name: '👥 社交达人', desc: '结交第 5 位好友', icon: '👥', reward: 300, category: 'social',
                check: () => G.player.friends.length >= 5 },
            { id: 'friend_10', name: '🌈 人脉广博', desc: '结交第 10 位好友', icon: '🌈', reward: 800, category: 'social',
                check: () => G.player.friends.length >= 10 },
            { id: 'love_1', name: '💕 怦然心动', desc: '首次确立恋爱关系（与任一 NPC）', icon: '💕', reward: 52000, category: 'social',
                check: () => G.player.lovers.length >= 1 },
            { id: 'love_5', name: '🥰 大家都是我的翅膀', desc: '任意恋爱关系大于5', icon: '🥰', reward: 114514, category: 'social',
                check: () => G.player.lovers.length >= 5 },
        ];
        // 里程碑定义
        const MILESTONES = [
            { value: 1000, label: '1,000 粉丝', icon: '🌟' },
            { value: 10000, label: '10,000 粉丝', icon: '🔥' },
            { value: 100000, label: '100,000 粉丝', icon: '👑' },
            { value: 500000, label: '500,000 粉丝', icon: '💎' },
            { value: 1000000, label: '1,000,000 粉丝', icon: '🚀' },
            { value: 5000000, label: '5,000,000 粉丝', icon: '🌍' },
            { value: 10000000, label: '10,000,000 粉丝', icon: '🏆' },
        ];
        // 赞助商定义
        const SPONSOR_TYPES = [
            { id: 'modpack', name: '🎮 模组包推广', desc: '推广一个热门MC模组包', reward: 3000, risk: 0.05 },
            { id: 'pc_brand', name: '💻 电脑品牌合作', desc: '推广一款游戏本', reward: 8000, risk: 0.03 },
            { id: 'snack', name: '🍿 零食饮料品牌', desc: '推广一款能量饮料', reward: 2000, risk: 0.02 },
            { id: 'peripheral', name: '🎧 外设品牌', desc: '推广键盘/鼠标/耳机', reward: 5000, risk: 0.04 },
            { id: 'server', name: '🖥️ 服务器托管', desc: '推广MC服务器托管服务', reward: 6000, risk: 0.06 },
        ];
        // ============================================================
