/**
 * js/apps/chat/chat-common.js
 * 💬 微信基础公共库：头像池加载 · 持久化双轨防丢备份（防空冲刷保护） · 微信通用样式注入 · 原生对话框/操作表 · Token监控池 · 
 *    🌟 表情包全量自愈装载底座（内置四大黄金分组：【豆米乌卡】40张 + 【小狗】94张 + 【抽象】42张 + 【猪猪】，老存档无缝穿透激活） · 
 *    AI实体解析器 · 酒馆 PNG 人设卡封装与导入解析引擎（内置高清头像 128x128 纳米级智能压缩，彻底终结存储超限与随机头像反噬 Bug）
 * 🌟 存储架构升级（Phase 3）：
 * 单聊历史对白（mcyt_wechat_chathistory_v2）已平滑迁移至 IndexedDB (via localforage)！
 * 兼容旧版 localStorage 自动无损迁移，保持单一权威源与就地指针保活。
 */

(function() {
    'use strict';

    const AVATAR_SUBDIR = 'assets/avatars/';
    window._MCYT_AVATAR_SUBDIR = AVATAR_SUBDIR;

    const CUSTOM_NPCS_BACKUP_KEY = 'mcyt_wechat_custom_npcs';
    const CHAT_HISTORY_BACKUP_KEY = 'mcyt_wechat_chathistory_v2';
    const TOKEN_HISTORY_STORAGE_KEY = 'mcyt_chat_token_history_v1';
    const MOMENTS_FEED_BACKUP_KEY = 'mcyt_wechat_feed_backup_v2';

    // 🛡️ 辅助：localforage 统一获取器
    function getStorageDriver() {
        if (typeof window.localforage !== 'undefined') {
            return window.localforage;
        }
        return null;
    }

    // 默认保底安全头像池
    const FALLBACK_AVATARS = [
        'assets/icons/chat.png',
        'assets/icons/theme.png',
        'assets/icons/tarot.png',
        'assets/system/orb_assistant.png'
    ];

    if (!Array.isArray(window._MCYT_AVATARS_POOL)) {
        window._MCYT_AVATARS_POOL = [];
    }

    function initAvatarPool() {
        if (Array.isArray(window._MCYT_AVATARS_POOL) && window._MCYT_AVATARS_POOL.length > 0) {
            return;
        }
        try {
            const script = document.createElement('script');
            script.src = AVATAR_SUBDIR + 'list.js?t=' + Date.now();
            script.onload = function() {
                if (Array.isArray(window._MCYT_AVATARS_POOL) && window._MCYT_AVATARS_POOL.length > 0) {
                    console.log('✅ 头像池已通过 list.js 成功装载，数量:', window._MCYT_AVATARS_POOL.length);
                }
            };
            document.head.appendChild(script);
        } catch (_) {}

        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', AVATAR_SUBDIR + 'list.json', true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)) {
                    try {
                        const list = JSON.parse(xhr.responseText);
                        if (Array.isArray(list) && list.length > 0) {
                            window._MCYT_AVATARS_POOL = list;
                            console.log('✅ 头像池已通过 XHR 成功装载，数量:', list.length);
                        }
                    } catch (e) {}
                }
            };
            xhr.send(null);
        } catch (_) {}

        fetch(AVATAR_SUBDIR + 'list.json')
            .then(r => r.json())
            .then(list => {
                if (Array.isArray(list) && list.length > 0) {
                    window._MCYT_AVATARS_POOL = list;
                }
            })
            .catch(() => {});
    }
    initAvatarPool();

    function getRandomAvatar() {
        const pool = (Array.isArray(window._MCYT_AVATARS_POOL) && window._MCYT_AVATARS_POOL.length > 0)
            ? window._MCYT_AVATARS_POOL
            : FALLBACK_AVATARS;

        const picked = pool[Math.floor(Math.random() * pool.length)];
        if (picked.startsWith('http') || picked.startsWith('data:') || picked.startsWith('assets/')) {
            return picked;
        }
        return `${AVATAR_SUBDIR}${encodeURIComponent(picked).replace(/%2F/g, '/')}`;
    }
    window.getRandomAvatar = getRandomAvatar;
    window.initAvatarPool = initAvatarPool;

    /**
     * 🖼️ 头像超轻量纳米压缩器（将几百 KB 的超大原图压缩为 128x128，体积降为 4~8KB，绝不撑爆 localStorage）
     */
    async function compressAvatarDataUrl(dataUrl, maxSide = 128, quality = 0.82) {
        if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;
        // 如果原本就已经小于 10KB，无需二次压缩
        if (dataUrl.length < 10000) return dataUrl;

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                try {
                    let w = img.naturalWidth || img.width || maxSide;
                    let h = img.naturalHeight || img.height || maxSide;
                    if (w > maxSide || h > maxSide) {
                        if (w > h) {
                            h = Math.round((h * maxSide) / w);
                            w = maxSide;
                        } else {
                            w = Math.round((w * maxSide) / h);
                            h = maxSide;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    
                    // 优先 webp，其次 jpeg
                    let compressed = canvas.toDataURL('image/webp', quality);
                    if (!compressed.startsWith('data:image/webp')) {
                        compressed = canvas.toDataURL('image/jpeg', quality);
                    }
                    resolve(compressed);
                } catch (_) {
                    resolve(dataUrl);
                }
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        });
    }
    window.compressAvatarDataUrl = compressAvatarDataUrl;

    // ============================================================
    // 🎭 内置同步表情包全量数据底座
    // ============================================================
    const BUILTIN_STICKER_PRESETS = {
        '豆米乌卡': [
            { desc: '头顶加载思索', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005348_origin_mmexport1784611626132.png' },
            { desc: '委屈放声大哭', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005350_origin_mmexport1784611626517.png' },
            { desc: '双手合十祈求', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005351_origin_mmexport1784611626710.png' },
            { desc: '消息已收到', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005342_origin_mmexport1784611624409.png' },
            { desc: '相拥依偎贴贴', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005341_origin_mmexport1784611624165.png' },
            { desc: '举钻戒求婚示爱', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005340_origin_mmexport1784611624026.png' },
            { desc: '爱心环绕委屈祈求', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005347_origin_mmexport1784611625901.png' },
            { desc: '头顶着火不爽', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005345_origin_mmexport1784611625273.png' },
            { desc: '挥拳冒火愤怒', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005346_origin_mmexport1784611625567.png' },
            { desc: '抱着大爱心愉悦', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005344_origin_mmexport1784611625020.png' },
            { desc: '感动落泪爱意包围', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005343_origin_mmexport1784611624770.png' },
            { desc: '戴睡帽困倦犯困', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005335_origin_mmexport1784611622974.png' },
            { desc: '戴墨镜耍酷闪耀', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005334_origin_mmexport1784611622741.png' },
            { desc: '举禁止牌表示拒绝', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005339_origin_mmexport1784611623864.png' },
            { desc: '遗憾离场落寞退场', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005338_origin_mmexport1784611623708.png' },
            { desc: '比爱心眨眼放电', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005337_origin_mmexport1784611623486.png' },
            { desc: '眼神亮晶晶害羞欲言', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005379_origin_a5cae49601a8ecfa.png' },
            { desc: '满眼星光合十期待', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005336_origin_mmexport1784611623207.png' },
            { desc: '手拿绿色对勾标牌', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005349_origin_mmexport1784611626344.png' },
            { desc: '高举双手欢呼点赞', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005381_origin_mmexport1784626203895.png' },
            { desc: '独自抽烟落寞倦怠', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005383_origin_mmexport1784626560473.png' },
            { desc: '闭眼大喊激动宣泄', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005382_origin_mmexport1784626559987.png' },
            { desc: '严肃推眼镜认真思索', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005384_origin_mmexport1784626560987.png' },
            { desc: '看手机心碎落泪', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005385_origin_mmexport1784626561526.png' },
            { desc: '小猫小狗甜蜜依偎', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005386_origin_mmexport1784626562108.png' },
            { desc: '揪住脖颈气呼呼', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005394_origin_mmexport1784626571220.png' },
            { desc: '对手指脸红腼腆害羞', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005392_origin_mmexport1784626569050.png' },
            { desc: '推眼镜托下巴沉思', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005393_origin_mmexport1784626569854.png' },
            { desc: '单手擦眼泪抽泣', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005391_origin_mmexport1784626567817.png' },
            { desc: '气泡打招呼Hi', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005390_origin_mmexport1784626566804.png' },
            { desc: '手拿菜刀乖巧威胁', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005389_origin_mmexport1784626565663.png' },
            { desc: '伸手指向一旁气恼', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005388_origin_mmexport1784626564974.png' },
            { desc: '闭眼浅笑惬意得意', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005387_origin_mmexport1784626563645.png' },
            { desc: '端杯子疑惑问号', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005396_origin_mmexport1784626573539.png' },
            { desc: '弯眼笑开口道谢谢谢', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005401_origin_mmexport1784626576502.png' },
            { desc: '大颗泪珠崩溃大哭', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005399_origin_mmexport1784626575458.png' },
            { desc: '佩戴领结浪漫送花', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005400_origin_mmexport1784626575975.png' },
            { desc: '额头怒气抬手发火', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005397_origin_mmexport1784626574167.png' },
            { desc: '星光自信得意比手势', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005398_origin_mmexport1784626574804.png' },
            { desc: '趴手机等对方消息', url: 'https://gitee.com/zqn1013/gitee/raw/master/img/1000005395_origin_mmexport1784626572001.png' }
        ],
        '小狗': [
            { desc: '仰泳晃动手臂冒爱心', url: 'https://pic1.imgdb.cn/item/69c0a15eccd26bacb4daa6a7.gif' },
            { desc: '快速激动奔跑', url: 'https://pic1.imgdb.cn/item/69c0a15eccd26bacb4daa6ab.gif' },
            { desc: '伸舌头抬右手晃尾巴', url: 'https://pic1.imgdb.cn/item/69c0a308ccd26bacb4daa6bb.gif' },
            { desc: '黄狗快乐唱歌扭动', url: 'https://pic1.imgdb.cn/item/69c0a308ccd26bacb4daa6bd.gif' },
            { desc: '白狗头顶冒红心摇晃', url: 'https://pic1.imgdb.cn/item/69c0a497ccd26bacb4daa6d2.gif' },
            { desc: '黄狗头顶冒红心摇晃', url: 'https://pic1.imgdb.cn/item/69c0a647ccd26bacb4daa6f3.gif' },
            { desc: '白狗盖被趴枕头乱想', url: 'https://pic1.imgdb.cn/item/69c0a497ccd26bacb4daa6d3.gif' },
            { desc: '黄狗盖被趴枕头乱想', url: 'https://pic1.imgdb.cn/item/69c0a647ccd26bacb4daa6f6.gif' },
            { desc: '白狗包里掏出巨大爱心', url: 'https://pic1.imgdb.cn/item/69c0a497ccd26bacb4daa6d6.gif' },
            { desc: '黄狗包里掏出巨大爱心', url: 'https://pic1.imgdb.cn/item/69c0a67fccd26bacb4daa6fa.gif' },
            { desc: '白狗抽泣委屈', url: 'https://pic1.imgdb.cn/item/69c0a497ccd26bacb4daa6d4.gif' },
            { desc: '黄狗抽泣委屈', url: 'https://pic1.imgdb.cn/item/69c0b275ccd26bacb4dabf21.gif' },
            { desc: '白狗双眼冒爱心摇尾巴', url: 'https://pic1.imgdb.cn/item/69c0a5f3ccd26bacb4daa6e8.gif' },
            { desc: '黄狗迷恋爱心', url: 'https://pic1.imgdb.cn/item/69c0a647ccd26bacb4daa6f1.gif' },
            { desc: '白狗哭着抱大药丸', url: 'https://pic1.imgdb.cn/item/69c0a5f3ccd26bacb4daa6ec.gif' },
            { desc: '黄狗哭着抱大药丸', url: 'https://pic1.imgdb.cn/item/69c0b496ccd26bacb4dabf51.gif' },
            { desc: '白狗托起小黄狗', url: 'https://pic1.imgdb.cn/item/69c0a5f3ccd26bacb4daa6ed.gif' },
            { desc: '黄狗托起小白狗', url: 'https://pic1.imgdb.cn/item/69c0a647ccd26bacb4daa6f2.gif' },
            { desc: '白狗穿婚纱拿手捧花', url: 'https://pic1.imgdb.cn/item/69c0a5f3ccd26bacb4daa6eb.gif' },
            { desc: '白狗香蕉装闪星星', url: 'https://pic1.imgdb.cn/item/69c0a5f3ccd26bacb4daa6ea.gif' },
            { desc: '黄狗香蕉装闪星星', url: 'https://pic1.imgdb.cn/item/69c0a67fccd26bacb4daa6f9.gif' },
            { desc: '黄狗打电脑白狗贴背', url: 'https://pic1.imgdb.cn/item/69c0a497ccd26bacb4daa6d7.gif' },
            { desc: '白狗打电脑黄狗贴背', url: 'https://pic1.imgdb.cn/item/69c0b275ccd26bacb4dabf20.gif' },
            { desc: '黄狗嘟嘴亲亲冒爱心', url: 'https://pic1.imgdb.cn/item/69c0b275ccd26bacb4dabf23.gif' },
            { desc: '趴在身上充电', url: 'https://pic1.imgdb.cn/item/69c0b275ccd26bacb4dabf22.gif' },
            { desc: '白狗穿睡衣靠枕头', url: 'https://pic1.imgdb.cn/item/69c0a647ccd26bacb4daa6f4.gif' },
            { desc: '拿出背后棉花糖', url: 'https://pic1.imgdb.cn/item/69c0b5e9ccd26bacb4dabfa6.gif' },
            { desc: '享受阳光闭眼照耀', url: 'https://pic1.imgdb.cn/item/69c0b5e9ccd26bacb4dabfa7.gif' },
            { desc: '小狗被窝睡觉守候', url: 'https://pic1.imgdb.cn/item/69c0b5e9ccd26bacb4dabfa9.gif' },
            { desc: '趴背亲吻捏脸颊', url: 'https://pic1.imgdb.cn/item/69c0b5e9ccd26bacb4dabfab.gif' },
            { desc: '盖绿被蹭大红心', url: 'https://pic1.imgdb.cn/item/69c0b5e9ccd26bacb4dabfa8.gif' },
            { desc: '抱手机等消息', url: 'https://pic1.imgdb.cn/item/69c0b5e9ccd26bacb4dabfaa.gif' },
            { desc: '裹绿被墙后偷看', url: 'https://pic1.imgdb.cn/item/69c0b718ccd26bacb4dac170.gif' },
            { desc: '抱腿悬挂不放手', url: 'https://pic1.imgdb.cn/item/69c0b718ccd26bacb4dac16f.gif' },
            { desc: '包包里惊喜钻出', url: 'https://pic1.imgdb.cn/item/69c0b718ccd26bacb4dac172.gif' },
            { desc: '黄狗戴蓝手套点赞', url: 'https://pic1.imgdb.cn/item/69c0b718ccd26bacb4dac173.gif' },
            { desc: '白狗戴黄手套点赞', url: 'https://pic1.imgdb.cn/item/69c0bd6945b603369a3d9b78.gif' },
            { desc: '关灯被窝看手机', url: 'https://pic1.imgdb.cn/item/69c0b718ccd26bacb4dac174.gif' },
            { desc: '紫耳朵黄狗一脸坏笑', url: 'https://pic1.imgdb.cn/item/69c0b718ccd26bacb4dac175.gif' },
            { desc: '坐黄垫灵光一闪', url: 'https://pic1.imgdb.cn/item/69c0b7d0ccd26bacb4dac4b0.gif' },
            { desc: '趴床边哭泣委屈', url: 'https://pic1.imgdb.cn/item/69c0b7d0ccd26bacb4dac4ae.gif' },
            { desc: '主动钻进购物车', url: 'https://pic1.imgdb.cn/item/69c0b7d0ccd26bacb4dac4af.gif' },
            { desc: '烟囱里举望远镜观察', url: 'https://pic1.imgdb.cn/item/69c0b7d0ccd26bacb4dac4b1.gif' },
            { desc: '托脸颊冒星星', url: 'https://pic1.imgdb.cn/item/69c0b7d0ccd26bacb4dac4ad.gif' },
            { desc: '互相牵绳遛狗', url: 'https://pic1.imgdb.cn/item/69c0b90bccd26bacb4dacb4e.gif' },
            { desc: '趴着抬头傻笑摇尾', url: 'https://pic1.imgdb.cn/item/69c0b90bccd26bacb4dacb4a.gif' },
            { desc: '突然受到惊吓', url: 'https://pic1.imgdb.cn/item/69c0b90bccd26bacb4dacb49.gif' },
            { desc: '抱着小熊蹭脸蛋', url: 'https://pic1.imgdb.cn/item/69c0b90bccd26bacb4dacb48.gif' },
            { desc: '趴屏幕前一脸期待', url: 'https://pic1.imgdb.cn/item/69c0b90bccd26bacb4dacb4d.gif' },
            { desc: '鼻孔喷气满脸期待', url: 'https://pic1.imgdb.cn/item/69c0b90bccd26bacb4dacb4b.gif' },
            { desc: '抱黄色枕头舒坦', url: 'https://pic1.imgdb.cn/item/69c0ba49ccd26bacb4dad1e4.gif' },
            { desc: '双手散开冒大粉心', url: 'https://pic1.imgdb.cn/item/69c0ba49ccd26bacb4dad1e7.gif' },
            { desc: '两只小狗转圈追逐', url: 'https://pic1.imgdb.cn/item/69c0ba49ccd26bacb4dad1e5.gif' },
            { desc: '拿小木棍往前走', url: 'https://pic1.imgdb.cn/item/69c0ba49ccd26bacb4dad1e6.gif' },
            { desc: '戴苹果头套委屈', url: 'https://pic1.imgdb.cn/item/69c0ba49ccd26bacb4dad1e8.gif' },
            { desc: '1号粉丝牌开心摇晃', url: 'https://pic1.imgdb.cn/item/69c0ba49ccd26bacb4dad1e9.gif' },
            { desc: '屁股上盖OK印章', url: 'https://pic1.imgdb.cn/item/69c0bc9445b603369a3d9726.gif' },
            { desc: '拉拉手开心跳舞', url: 'https://pic1.imgdb.cn/item/69c0bc9445b603369a3d9727.gif' },
            { desc: '疯狂发射粉色爱心', url: 'https://pic1.imgdb.cn/item/69c0bc9445b603369a3d9728.gif' },
            { desc: '黄狗伴舞开心跳跃', url: 'https://pic1.imgdb.cn/item/69c0bc9545b603369a3d972a.gif' },
            { desc: '白狗伴舞开心跳跃', url: 'https://pic1.imgdb.cn/item/69c0c60f45b603369a3da304.gif' },
            { desc: '拿小戳子戳生气狗', url: 'https://pic1.imgdb.cn/item/69c0bc9545b603369a3d972b.gif' },
            { desc: '网兜一网捞出爱心', url: 'https://pic1.imgdb.cn/item/69c0bc9545b603369a3d972c.gif' },
            { desc: '乖乖坐着冒爱心', url: 'https://pic1.imgdb.cn/item/69c0bd6945b603369a3d9726.gif' },
            { desc: '拼命用力点头赞同', url: 'https://pic1.imgdb.cn/item/69c0bd8845b603369a3d9c1e.gif' },
            { desc: '信件里源源不断冒爱心', url: 'https://pic1.imgdb.cn/item/69c0c1eb45b603369a3da2ca.gif' },
            { desc: '背后发条累瘫在地', url: 'https://pic1.imgdb.cn/item/69c0c1eb45b603369a3da2cb.gif' },
            { desc: '认真给同伴捶背', url: 'https://pic1.imgdb.cn/item/69c0c1eb45b603369a3da2ce.gif' },
            { desc: '被子里眼神迷糊迷茫', url: 'https://pic1.imgdb.cn/item/69c0c1eb45b603369a3da2cc.gif' },
            { desc: '扭屁股晃尾巴跳舞', url: 'https://pic1.imgdb.cn/item/69c0c1eb45b603369a3da2cf.gif' },
            { desc: '脏兮兮坐地认错', url: 'https://pic1.imgdb.cn/item/69c0c24d45b603369a3da2d2.gif' },
            { desc: '死死抱腿蹭腿撒娇', url: 'https://pic1.imgdb.cn/item/69c0c24e45b603369a3da2d4.gif' },
            { desc: '揉揉没睡醒的眼睛', url: 'https://pic1.imgdb.cn/item/69c0c46d45b603369a3da2f0.gif' },
            { desc: '趴玩具火箭飞天', url: 'https://pic1.imgdb.cn/item/69c0c46d45b603369a3da2eb.gif' },
            { desc: '从地底下突然冒出', url: 'https://pic1.imgdb.cn/item/69c0c51b45b603369a3da2f8.gif' },
            { desc: '站在梯子上拿喇叭喊', url: 'https://pic1.imgdb.cn/item/69c0c51b45b603369a3da2f9.gif' },
            { desc: '躺靠枕满脸幸福惬意', url: 'https://pic1.imgdb.cn/item/69c0c51b45b603369a3da2fa.gif' },
            { desc: '推开窗双手招手打招呼', url: 'https://pic1.imgdb.cn/item/69c0c51b45b603369a3da2fc.gif' },
            { desc: '可怜兮兮泪眼汪汪', url: 'https://pic1.imgdb.cn/item/69c0c51b45b603369a3da2fd.gif' },
            { desc: '震惊到骨头从嘴里滑落', url: 'https://pic1.imgdb.cn/item/69c0c60f45b603369a3da303.gif' },
            { desc: '拿粉刷粉刷墙壁', url: 'https://pic1.imgdb.cn/item/69c0c60f45b603369a3da306.gif' },
            { desc: '躺被窝里准备睡觉', url: 'https://pic1.imgdb.cn/item/69c0c6cd45b603369a3da308.gif' },
            { desc: '假装玩小车实则竖耳偷听', url: 'https://pic1.imgdb.cn/item/69c0c6cd45b603369a3da30a.gif' },
            { desc: '耳朵里藏礼物露出得意', url: 'https://pic1.imgdb.cn/item/69c0c6cd45b603369a3da30d.gif' },
            { desc: '坐报纸上风吹可怜小狗', url: 'https://pic1.imgdb.cn/item/69c0c6cd45b603369a3da30c.gif' },
            { desc: '裹被子里探手招招', url: 'https://pic1.imgdb.cn/item/69c0c7d845b603369a3da332.gif' },
            { desc: '盖小被子瑟瑟发抖', url: 'https://pic1.imgdb.cn/item/69c0c7d945b603369a3da334.gif' },
            { desc: '一脸坏笑望过来', url: 'https://pic1.imgdb.cn/item/69c0c7d945b603369a3da335.gif' },
            { desc: '四肢伸缩做有氧健美操', url: 'https://pic1.imgdb.cn/item/69c0c7d945b603369a3da333.gif' },
            { desc: '站在体重秤上拽肥肉发愁', url: 'https://pic1.imgdb.cn/item/69c0c8ad45b603369a3dadb7.gif' },
            { desc: '伸爪爪扭屁股做拉伸', url: 'https://pic1.imgdb.cn/item/69c0c8ad45b603369a3dadb8.gif' },
            { desc: '黄狗被揉捏胖脸蛋', url: 'https://pic1.imgdb.cn/item/69c0c8ad45b603369a3dadb9.gif' },
            { desc: '白狗被揉捏胖脸蛋', url: 'https://pic1.imgdb.cn/item/69c0c8ad45b603369a3dadba.gif' }
        ],
        '抽象': [
            { desc: '这个就是我呀，会不会有点营养不良了', url: 'https://i.imgant.com/v2/tuDMWKL.jpeg' },
            { desc: '删掉，腰不想要了？', url: 'https://i.imgant.com/v2/K893NeG.jpeg' },
            { desc: '叹气', url: 'https://i.imgant.com/v2/ckPrEv8.jpeg' },
            { desc: '活着憋屈啊', url: 'https://i.imgant.com/v2/LjlZPbM.jpeg' },
            { desc: '好骚哦', url: 'https://i.imgant.com/v2/ynvlSu3.jpeg' },
            { desc: '我此刻表情无疑是悲伤的', url: 'https://i.imgant.com/v2/lLJls5V.jpeg' },
            { desc: '你是要气死妈妈么', url: 'https://i.imgant.com/v2/SIPjg3v.jpeg' },
            { desc: '去哪 和谁 回来还爱我不', url: 'https://i.imgant.com/v2/dgH4yEi.jpeg' },
            { desc: '真以为我是穷人啊', url: 'https://i.imgant.com/v2/Df5TllH.jpeg' },
            { desc: '我在你心里的重量（0kg）', url: 'https://i.imgant.com/v2/C6eN4c1.jpeg' },
            { desc: '我一定乖乖嘟', url: 'https://i.imgant.com/v2/mIGW4cS.jpeg' },
            { desc: '刚睡醒，很容易拿下', url: 'https://i.imgant.com/v2/kXItqup.jpeg' },
            { desc: '我操泥马你不要我了吗', url: 'https://i.imgant.com/v2/vXuR2E7.jpeg' },
            { desc: '又几把咋地了啊', url: 'https://i.imgant.com/v2/LRiBynf.jpeg' },
            { desc: '小狗皱眉', url: 'https://i.imgant.com/v2/CvEh0gi.jpeg' },
            { desc: '你们就欺负我这个弱智吧', url: 'https://i.imgant.com/v2/viKzqox.jpeg' },
            { desc: '老子说话没用是吧', url: 'https://i.imgant.com/v2/B2Qvzcb.jpeg' },
            { desc: '高调路过', url: 'https://i.imgant.com/v2/SXOIeXm.jpeg' },
            { desc: '哈士奇发呆', url: 'https://i.imgant.com/v2/LZVOmO8.jpeg' },
            { desc: '托腮卖萌', url: 'https://i.imgant.com/v2/hELc3LX.jpeg' },
            { desc: '开心', url: 'https://i.imgant.com/v2/sbEu9Ec.jpeg' },
            { desc: '抽烟', url: 'https://i.imgant.com/v2/M5hvApr.jpeg' },
            { desc: '我觉得我失宠了', url: 'https://i.imgant.com/v2/ZZluNGD.jpeg' },
            { desc: '老地方见', url: 'https://i.imgant.com/v2/QCIRS8O.jpeg' },
            { desc: '你要气死爸爸么', url: 'https://i.imgant.com/v2/vjtpp98.jpeg' },
            { desc: '生气', url: 'https://i.imgant.com/v2/nyTGtMB.jpeg' },
            { desc: '不知所措', url: 'https://i.imgant.com/v2/q1H7s5r.jpeg' },
            { desc: '我在哭哦，你们看见了吗，我正在流眼泪', url: 'https://i.imgant.com/v2/aY8H2kv.jpeg' },
            { desc: '这位朋友，请滚', url: 'https://i.imgant.com/v2/NqDH6c1.jpeg' },
            { desc: '我草泥马，再发这个我打死你，我下手很重的', url: 'https://i.imgant.com/v2/MmteCvC.jpeg' },
            { desc: '你们在做什么？！', url: 'https://i.imgant.com/v2/itpBKTZ.jpeg' },
            { desc: '这真是...太下流了，不过我喜欢', url: 'https://i.imgant.com/v2/5svgrbd.jpeg' },
            { desc: '哈士奇戴眼镜', url: 'https://i.imgant.com/v2/9aye7oO.jpeg' },
            { desc: '我。现在就和这个乐乐狗一样，很无语，然后，没力气，扶墙，很想哭', url: 'https://i.imgant.com/v2/aHcqUn6.jpeg' },
            { desc: '你看我想理你吗', url: 'https://i.imgant.com/v2/fGwUBR7.jpeg' },
            { desc: '躺在床上忍不住眼泪直流 麻痹 我的人生为何如此艰难', url: 'https://i.imgant.com/v2/GTf4vOh.jpeg' },
            { desc: '专业套狗（让你跑掉是我的错）', url: 'https://i.imgant.com/v2/f80XFXP.jpeg' },
            { desc: '我现在就是这个狗呀，然后呆呆傻傻地看着你，看着这个世界，因为我什么都不懂呀', url: 'https://i.imgant.com/v2/SOx3tKj.jpeg' },
            { desc: '翻白眼', url: 'https://i.imgant.com/v2/2DHRx2i.jpeg' },
            { desc: '我这么可爱叫两声咋了', url: 'https://i.imgant.com/v2/6sBbjgo.jpeg' },
            { desc: '见钱眼开', url: 'https://i.imgant.com/v2/eKP4Na8.jpeg' },
            { desc: '哈士奇害羞', url: 'https://i.imgant.com/v2/MeWtWNE.jpeg' }
        ]
    };

    function ensureStickersLoaded() {
        if (!window.G) window.G = {};
        if (!Array.isArray(window.G.stickerCategories)) {
            window.G.stickerCategories = ['豆米乌卡', '小狗', '抽象', '猪猪'];
        }
        if (!Array.isArray(window.G.stickerLibrary)) {
            window.G.stickerLibrary = [];
        }

        const goldenPacks = ['豆米乌卡', '小狗', '抽象', '猪猪'];
        goldenPacks.forEach(packName => {
            if (!window.G.stickerCategories.includes(packName)) {
                window.G.stickerCategories.unshift(packName);
            }
        });

        for (const [catName, packList] of Object.entries(BUILTIN_STICKER_PRESETS)) {
            const existingUrls = new Set(
                window.G.stickerLibrary
                    .filter(s => s && s.category === catName)
                    .map(s => s.url)
            );

            packList.forEach(item => {
                if (item && item.url && !existingUrls.has(item.url)) {
                    window.G.stickerLibrary.push({
                        category: catName,
                        desc: item.desc || catName,
                        url: item.url
                    });
                    existingUrls.add(item.url);
                }
            });
        }

        if (!window.G.activeStickerCategory || !window.G.stickerCategories.includes(window.G.activeStickerCategory)) {
            window.G.activeStickerCategory = '豆米乌卡';
        }
    }
    window.ensureStickersLoaded = ensureStickersLoaded;

    window.registerStickerPack = function(categoryName, stickerList) {
        if (!categoryName || !Array.isArray(stickerList)) return;
        ensureStickersLoaded();
        if (!window.G.stickerCategories.includes(categoryName)) {
            window.G.stickerCategories.unshift(categoryName);
        }
        const existingUrls = new Set(
            window.G.stickerLibrary
                .filter(s => s && s.category === categoryName)
                .map(s => s.url)
        );
        stickerList.forEach(item => {
            if (item && item.url && !existingUrls.has(item.url)) {
                window.G.stickerLibrary.push({
                    category: categoryName,
                    desc: item.desc || categoryName,
                    url: item.url
                });
                existingUrls.add(item.url);
            }
        });
    };

    if (!window._MCYT_CHAT_GENERATING) window._MCYT_CHAT_GENERATING = {};

    function getTokenHistoryList() {
        try {
            const raw = localStorage.getItem(TOKEN_HISTORY_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (_) {
            return [];
        }
    }
    window.getTokenHistoryList = getTokenHistoryList;

    function recordTokenHistoryEntry(entry) {
        try {
            let list = getTokenHistoryList();
            list.unshift(entry);
            if (list.length > 10) {
                list = list.slice(0, 10);
            }
            localStorage.setItem(TOKEN_HISTORY_STORAGE_KEY, JSON.stringify(list));
        } catch (_) {}
    }
    window.recordTokenHistoryEntry = recordTokenHistoryEntry;

    // 💾 硬核防丢保护引擎（彻底剔除粗暴抹杀头像为 assets/icons/chat.png 的降级逻辑！）
    function syncCustomNpcsToLocalBackup() {
        try {
            if (!window.G || !window.G.npcs || typeof window.G.npcs !== 'object') return;
            const keys = Object.keys(window.G.npcs);
            
            if (keys.length === 0) {
                const existing = localStorage.getItem(CUSTOM_NPCS_BACKUP_KEY);
                if (existing && existing.length > 10) {
                    return;
                }
            }

            const customMap = {};
            for (const [id, npc] of Object.entries(window.G.npcs)) {
                if (npc) {
                    customMap[id] = npc;
                }
            }

            try {
                localStorage.setItem(CUSTOM_NPCS_BACKUP_KEY, JSON.stringify(customMap));
            } catch (quotaErr) {
                console.warn('⚠️ 自建角色存储触碰配额，尝试安全保存:', quotaErr);
                try {
                    localStorage.setItem(CUSTOM_NPCS_BACKUP_KEY, JSON.stringify(customMap));
                } catch (_) {}
            }
        } catch (e) {
            console.error('备份自建联系人失败:', e);
        }
    }
    window.syncCustomNpcsToLocalBackup = syncCustomNpcsToLocalBackup;

    function restoreCustomNpcsFromLocalBackup() {
        try {
            const raw = localStorage.getItem(CUSTOM_NPCS_BACKUP_KEY);
            if (!raw) return;
            const customMap = JSON.parse(raw);
            if (customMap && typeof customMap === 'object') {
                if (!window.G.npcs) window.G.npcs = {};
                for (const [id, npc] of Object.entries(customMap)) {
                    if (!window.G.npcs[id]) {
                        window.G.npcs[id] = npc;
                    } else {
                        for (const key of Object.keys(npc)) {
                            // 🌟 头像防覆盖护甲：如果当前内存中已有头像，绝不允许被旧数据或空值覆盖
                            if (key === 'avatarUrl' || key === 'avatar') {
                                if (!window.G.npcs[id][key] && npc[key]) {
                                    window.G.npcs[id][key] = npc[key];
                                }
                                continue;
                            }
                            if (window.G.npcs[id][key] === undefined || window.G.npcs[id][key] === null) {
                                window.G.npcs[id][key] = npc[key];
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error('恢复自建联系人失败:', e);
        }
    }
    window.restoreCustomNpcsFromLocalBackup = restoreCustomNpcsFromLocalBackup;

    // 💾 单聊历史持久化落盘（全面迁移至 IndexedDB，兜底兼容 localStorage）
    async function syncChatHistoryToLocalBackup() {
        try {
            if (!window.G || !window.G.chatHistory || typeof window.G.chatHistory !== 'object') return;
            const keys = Object.keys(window.G.chatHistory);
            
            if (keys.length === 0) {
                const existing = localStorage.getItem(CHAT_HISTORY_BACKUP_KEY);
                if (existing && existing.length > 10) {
                    return;
                }
            }

            const storage = getStorageDriver();
            if (storage) {
                await storage.setItem(CHAT_HISTORY_BACKUP_KEY, window.G.chatHistory);
            } else {
                localStorage.setItem(CHAT_HISTORY_BACKUP_KEY, JSON.stringify(window.G.chatHistory));
            }
        } catch (e) {
            console.error('备份聊天记录到 IndexedDB 失败:', e);
        }
    }
    window.syncChatHistoryToLocalBackup = syncChatHistoryToLocalBackup;

    // 🛡️ 单聊历史冷启动自动恢复（单例 Promise 防并发，就地安全合并保活指针，就位后自动静默更新列表）
    let _restoreChatHistoryPromise = null;

    async function restoreChatHistoryFromLocalBackup(forceRefresh = false) {
        if (!forceRefresh && _restoreChatHistoryPromise) {
            return _restoreChatHistoryPromise;
        }

        _restoreChatHistoryPromise = (async () => {
            const storage = getStorageDriver();
            let loadedHist = null;

            if (storage) {
                try {
                    loadedHist = await storage.getItem(CHAT_HISTORY_BACKUP_KEY);
                } catch (err) {
                    console.warn('⚠️ 从 IndexedDB 读取单聊历史失败:', err);
                }
            }

            // 回退与冷迁移机制
            if (!loadedHist) {
                try {
                    const raw = localStorage.getItem(CHAT_HISTORY_BACKUP_KEY);
                    if (raw) {
                        loadedHist = JSON.parse(raw);
                        // 🌟 自动平滑写入 IndexedDB
                        if (loadedHist && storage) {
                            storage.setItem(CHAT_HISTORY_BACKUP_KEY, loadedHist).catch(e => {
                                console.warn('⚠️ 自动迁移单聊历史至 IndexedDB 失败:', e);
                            });
                        }
                    }
                } catch (e) {
                    console.error('从 localStorage 恢复单聊历史失败:', e);
                }
            }

            if (loadedHist && typeof loadedHist === 'object') {
                if (!window.G.chatHistory) window.G.chatHistory = {};
                for (const [k, v] of Object.entries(loadedHist)) {
                    if (Array.isArray(v) && v.length > 0) {
                        // 🛡️ 原地指针保活装载：严禁直接断开可能已经被外部引用的数组指针
                        if (!window.G.chatHistory[k]) {
                            window.G.chatHistory[k] = v;
                        } else if (window.G.chatHistory[k].length === 0) {
                            window.G.chatHistory[k].push(...v);
                        } else {
                            const existingIds = new Set(window.G.chatHistory[k].map(m => m._id || (m.timestamp + '_' + (m.text || ''))));
                            for (const item of v) {
                                const id = item._id || (item.timestamp + '_' + (item.text || ''));
                                if (!existingIds.has(id)) {
                                    window.G.chatHistory[k].push(item);
                                    existingIds.add(id);
                                }
                            }
                        }
                    }
                }
            }

            window._chatHistoryRestored = true;

            // 🌟 核心自愈：若数据读取完成时当前正处于微信消息主列表，且未进入任何对话窗口，自动静默刷新视图
            if (window._activeBottomTab === 'chats' && !window.G?.currentChatNpc && !window.G?.currentChatGroup) {
                const root = document.getElementById('wechatAppRoot');
                if (root && typeof window.renderChatApp === 'function') {
                    window.renderChatApp();
                }
            }

            return window.G.chatHistory;
        })();

        return _restoreChatHistoryPromise;
    }
    window.restoreChatHistoryFromLocalBackup = restoreChatHistoryFromLocalBackup;

    function syncMomentsFeedToLocalBackup() {
        try {
            if (!window.G || !Array.isArray(window.G.feed)) return;

            if (window.G.feed.length === 0) {
                const existing = localStorage.getItem(MOMENTS_FEED_BACKUP_KEY);
                if (existing && existing.length > 10) {
                    return;
                }
            }

            const cappedFeed = window.G.feed.slice(0, 100);
            try {
                localStorage.setItem(MOMENTS_FEED_BACKUP_KEY, JSON.stringify(cappedFeed));
            } catch (quotaErr) {
                const safeFeed = cappedFeed.map(item => {
                    const cloned = Object.assign({}, item);
                    if (cloned.image && cloned.image.length > 5000) {
                        cloned.image = null;
                        if (!cloned.imageDesc) cloned.imageDesc = '（配图原件过大已转为文字留存）';
                    }
                    return cloned;
                });
                localStorage.setItem(MOMENTS_FEED_BACKUP_KEY, JSON.stringify(safeFeed));
            }
        } catch (e) {
            console.error('备份朋友圈动态失败:', e);
        }
    }
    window.syncMomentsFeedToLocalBackup = syncMomentsFeedToLocalBackup;

    function restoreMomentsFeedFromLocalBackup() {
        try {
            const raw = localStorage.getItem(MOMENTS_FEED_BACKUP_KEY);
            if (!raw) return;
            const savedFeed = JSON.parse(raw);
            if (Array.isArray(savedFeed) && savedFeed.length > 0) {
                if (!window.G.feed || window.G.feed.length === 0) {
                    window.G.feed = savedFeed;
                } else {
                    const existingIds = new Set(window.G.feed.map(f => f.id));
                    savedFeed.forEach(item => {
                        if (!existingIds.has(item.id)) {
                            window.G.feed.push(item);
                            existingIds.add(item.id);
                        }
                    });
                }
            }
        } catch (e) {
            console.error('恢复朋友圈动态失败:', e);
        }
    }
    window.restoreMomentsFeedFromLocalBackup = restoreMomentsFeedFromLocalBackup;

    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            syncChatHistoryToLocalBackup();
            syncCustomNpcsToLocalBackup();
            syncMomentsFeedToLocalBackup();
            if (typeof window.syncGroupChatsToLocalBackup === 'function') window.syncGroupChatsToLocalBackup();
            if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
        }
    });
    window.addEventListener('beforeunload', () => {
        syncChatHistoryToLocalBackup();
        syncCustomNpcsToLocalBackup();
        syncMomentsFeedToLocalBackup();
        if (typeof window.syncGroupChatsToLocalBackup === 'function') window.syncGroupChatsToLocalBackup();
        if (typeof window.autoSaveGame === 'function') window.autoSaveGame();
    });

    function ensureChatShellStyles() {
        let styleEl = document.getElementById('wechat-fullscreen-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'wechat-fullscreen-style';
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = `
            .app-modal-layer.wechat-seamless-shell {
                position: absolute !important;
                top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important;
                border: none !important; border-radius: 0 !important; box-shadow: none !important;
                background: #ededed !important; z-index: 1000 !important; overflow: hidden !important;
            }
            .app-modal-layer.wechat-seamless-shell .app-modal-head,
            .app-modal-layer.wechat-seamless-shell .app-modal-foot {
                display: none !important;
            }
            .app-modal-layer.wechat-seamless-shell .app-modal-body {
                position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
                width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important;
                border: none !important; border-radius: 0 !important; box-shadow: none !important;
                background: #ededed !important; overflow: hidden !important;
            }
            .phone-app-wrap, #socialTab .phone-app-wrap, .chat-header {
                display: none !important;
            }
            .wechat-top-header {
                padding-top: 42px !important;
                height: 88px !important;
                background: #ededed !important;
                border-bottom: 0.5px solid #dcdcdc !important;
                display: flex !important;
                justify-content: space-between !important;
                align-items: center !important;
                padding-left: 12px !important;
                padding-right: 12px !important;
                flex-shrink: 0 !important;
                box-sizing: border-box !important;
            }

            .wechat-bg-generating-banner {
                position: fixed; top: 48px; left: 50%; transform: translateX(-50%);
                background: rgba(24, 24, 24, 0.88); backdrop-filter: blur(8px);
                color: #ffffff; padding: 6px 14px; border-radius: 20px; font-size: 12px;
                display: flex; align-items: center; gap: 8px; z-index: 10005;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: wechatBannerIn 0.25s ease-out;
            }
            @keyframes wechatBannerIn { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }

            .wechat-spin-ring {
                width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.3);
                border-top-color: #07c160; border-radius: 50%; animation: wechatSpin 0.8s linear infinite;
            }
            @keyframes wechatSpin { to { transform: rotate(360deg); } }

            .wechat-clean-modal-mask {
                position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 10000;
                display: flex; align-items: center; justify-content: center; padding: 20px;
                box-sizing: border-box; backdrop-filter: blur(2px);
            }
            .wechat-clean-modal-card {
                background: #ffffff; width: 100%; max-width: 320px; border-radius: 12px;
                padding: 18px; box-shadow: 0 10px 30px rgba(0,0,0,0.18); font-family: -apple-system, sans-serif;
                animation: wechatPopIn 0.18s cubic-bezier(0.2, 0.9, 0.3, 1);
            }
            @keyframes wechatPopIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            .wechat-clean-modal-title { font-size: 16px; font-weight: 600; color: #181818; margin-bottom: 12px; text-align: center; }
            .wechat-clean-input {
                width: 100%; padding: 9px 10px; border-radius: 6px; border: 1px solid #dcdcdc;
                background: #f7f7f7; font-size: 14px; color: #181818; outline: none; box-sizing: border-box;
            }
            .wechat-clean-input:focus { border-color: #07c160; background: #ffffff; }
            .wechat-clean-modal-btns {
                display: flex; gap: 10px; margin-top: 16px;
            }
            .wechat-clean-btn-cancel {
                flex: 1; padding: 9px 0; border: none; background: #f0f0f0; color: #555;
                font-size: 14px; font-weight: 500; border-radius: 6px; cursor: pointer;
            }
            .wechat-clean-btn-confirm {
                flex: 1; padding: 9px 0; border: none; background: #07c160; color: #ffffff;
                font-size: 14px; font-weight: 600; border-radius: 6px; cursor: pointer;
            }
            .wechat-clean-btn-cancel:active { background: #e5e5e5; }
            .wechat-clean-btn-confirm:active { background: #06ad56; }

            .wechat-action-sheet-mask {
                position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 10000;
                display: flex; align-items: flex-end; justify-content: center;
            }
            .wechat-action-sheet-box {
                background: #f7f7f7; width: 100%; max-width: 412px; border-radius: 12px 12px 0 0;
                overflow: hidden; padding-bottom: env(safe-area-inset-bottom, 10px);
                animation: wechatSlideUp 0.2s cubic-bezier(0.2, 0.9, 0.3, 1);
            }
            @keyframes wechatSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            .wechat-action-item {
                background: #ffffff; padding: 14px; text-align: center; font-size: 15px; color: #181818;
                border-bottom: 0.5px solid #f0f0f0; cursor: pointer; user-select: none;
            }
            .wechat-action-item:active { background: #ececec; }
            .wechat-action-cancel {
                background: #ffffff; padding: 14px; text-align: center; font-size: 15px; color: #666;
                margin-top: 6px; cursor: pointer; user-select: none;
            }
            .wechat-action-cancel:active { background: #ececec; }

            .wechat-sticker-grid {
                display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
                padding: 12px; max-height: 180px; overflow-y: auto; justify-items: center; align-items: center;
            }
            .wechat-sticker-card {
                width: 66px; height: 66px; border-radius: 6px; background: #ffffff;
                display: flex; align-items: center; justify-content: center; cursor: pointer;
                overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.03);
            }
            .wechat-sticker-card:active { transform: scale(0.95); }

            .wechat-plus-grid {
                display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
                padding: 16px 14px; max-height: 190px; overflow-y: auto; justify-items: center;
            }
            .wechat-plus-item {
                display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer;
            }
            .wechat-plus-icon-box {
                width: 52px; height: 52px; border-radius: 12px; background: #ffffff;
                border: 0.5px solid #dcdcdc; display: flex; align-items: center; justify-content: center;
            }
            .wechat-plus-item:active .wechat-plus-icon-box { background: #eaeaea; }
            .wechat-plus-label { font-size: 11px; color: #555555; }

            .wechat-voice-bubble {
                display: flex; align-items: center; gap: 8px; min-height: 38px;
                padding: 8px 12px; border-radius: 5px; cursor: pointer; user-select: none;
                transition: background 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .wechat-voice-wave { display: flex; align-items: center; gap: 2px; height: 16px; }
            .wechat-voice-bar { width: 2.5px; background: currentColor; border-radius: 2px; }
            .wechat-voice-bar:nth-child(1) { height: 6px; }
            .wechat-voice-bar:nth-child(2) { height: 12px; }
            .wechat-voice-bar:nth-child(3) { height: 16px; }

            .wechat-share-moment-card {
                background: #ffffff; border: 1px solid #e0e0e0; border-radius: 6px;
                padding: 10px 12px; width: 220px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                cursor: pointer; user-select: none;
            }
            .wechat-share-moment-card:active { background: #f7f7f7; }
            .wechat-contact-card {
                background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;
                padding: 10px 12px; width: 220px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                cursor: pointer; user-select: none;
            }
            .wechat-contact-card:active { background: #f8fafc; }

            .wechat-sys-notice-pill {
                display: inline-flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.06);
                color: #666666; font-size: 11px; padding: 3px 10px; border-radius: 12px;
                margin: 6px auto; max-width: 90%; cursor: pointer; text-align: center;
            }
            .wechat-sys-notice-pill span.link { color: #576b95; font-weight: 600; }

            .wechat-quote-bar {
                display: flex; align-items: center; justify-content: space-between;
                background: #e9e9e9; padding: 5px 10px; font-size: 11.5px; color: #666;
                border-left: 3px solid #07c160; border-top: 0.5px solid #dcdcdc;
            }
            .wechat-quote-inline {
                background: rgba(0, 0, 0, 0.05); border-left: 2px solid #07c160;
                padding: 3px 6px; border-radius: 2px; font-size: 11.5px; color: #666;
                margin-bottom: 5px; line-height: 1.35; word-break: break-word;
            }

            .moment-mode-tab-btn {
                flex: 1; padding: 6px 4px; border: none; background: #f0f0f0; color: #555;
                font-size: 11.5px; font-weight: 500; border-radius: 4px; cursor: pointer;
            }
            .moment-mode-tab-btn.active {
                background: #07c160 !important; color: #ffffff !important; font-weight: 600;
            }

            .chat-swipe-item {
                position: relative;
                width: 100%;
                overflow: hidden;
                background: #fff;
                user-select: none;
            }
            .chat-swipe-content {
                position: relative;
                z-index: 2;
                background: #fff;
                transition: transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 14px;
                border-bottom: 0.5px solid #ededed;
                cursor: pointer;
            }
            .chat-swipe-actions {
                position: absolute;
                top: 0;
                right: 0;
                bottom: 0;
                z-index: 1;
                display: flex;
                height: 100%;
            }
            .chat-swipe-delete-btn {
                background: #fa5151;
                color: #ffffff;
                width: 72px;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14.5px;
                font-weight: 500;
                cursor: pointer;
                border: none;
                padding: 0;
            }
        `;
    }
    ensureChatShellStyles();

    const originalClosePhoneApp = window.closePhoneApp;
    window.closePhoneApp = function() {
        const modal = document.getElementById('appModal');
        if (modal) modal.classList.remove('wechat-seamless-shell');
        if (typeof originalClosePhoneApp === 'function') originalClosePhoneApp();
    };

    function openWechatCleanModal(title, innerContentHtml, onConfirm = null) {
        let mask = document.createElement('div');
        mask.className = 'wechat-clean-modal-mask';
        mask.innerHTML = `
            <div class="wechat-clean-modal-card">
                <div class="wechat-clean-modal-title">${escapeHtml(title)}</div>
                <div class="wechat-clean-modal-body">${innerContentHtml}</div>
                <div class="wechat-clean-modal-btns">
                    <button type="button" class="wechat-clean-btn-cancel" id="wcleanCancel">取消</button>
                    <button type="button" class="wechat-clean-btn-confirm" id="wcleanConfirm">确定</button>
                </div>
            </div>
        `;
        document.body.appendChild(mask);
        const close = () => { if (mask && mask.parentNode) mask.parentNode.removeChild(mask); };
        mask.querySelector('#wcleanCancel').onclick = close;
        mask.querySelector('#wcleanConfirm').onclick = () => {
            if (typeof onConfirm === 'function') {
                const ret = onConfirm(mask);
                if (ret !== false) close();
            } else {
                close();
            }
        };
    }
    window.openWechatCleanModal = openWechatCleanModal;

    // 🌟 统一群聊消息安全存取管道（就地操作内存数组，彻底终结指针断裂）
    window.getGroupChatHistorySafe = function(gid) {
        if (!window.G) window.G = {};
        if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
        if (!Array.isArray(window.G.groupChatHistory[gid])) {
            window.G.groupChatHistory[gid] = [];
        }
        return window.G.groupChatHistory[gid];
    };

    window.pushGroupChatMessageSafe = function(gid, msgObj) {
        if (!msgObj) return;
        if (!msgObj._id) msgObj._id = 'gmsg_' + Date.now() + '_' + Math.floor(Math.random() * 8999 + 1000);
        if (!msgObj.timestamp) msgObj.timestamp = Date.now();
        if (!msgObj.time) msgObj.time = new Date().toLocaleTimeString().slice(0, 5);
        
        const list = window.getGroupChatHistorySafe(gid);
        list.push(msgObj);

        if (typeof window.syncGroupChatsToLocalBackup === 'function') {
            window.syncGroupChatsToLocalBackup();
        }
    };

    function ensureNpcIntegrity() {
        if (!window.G) window.G = {};
        if (!window.G.npcs) window.G.npcs = {};
        if (!window.G.chatHistory) window.G.chatHistory = {};
        if (!window.G.groups) window.G.groups = {};
        if (!window.G.groupChatHistory) window.G.groupChatHistory = {};
        if (!window.G.friendRequests) window.G.friendRequests = [];
        if (!window.G.groupInvites) window.G.groupInvites = [];
        if (!window.G.feed) window.G.feed = [];
        if (!window.G._behindScreenActive) window.G._behindScreenActive = {};
        if (!window.G._chatShowFullHistory) window.G._chatShowFullHistory = {};
        
        restoreCustomNpcsFromLocalBackup();
        restoreChatHistoryFromLocalBackup();
        restoreMomentsFeedFromLocalBackup();

        if (typeof window.restoreGroupsFromStorage === 'function') {
            window.restoreGroupsFromStorage();
        }

        ensureStickersLoaded();

        if (typeof window.restoreWechatProfileData === 'function') {
            window.restoreWechatProfileData();
        }

        for (const [id, npc] of Object.entries(window.G.npcs)) {
            if (!npc.id) npc.id = id;
            if (!npc.name) npc.name = id;
            if (npc.favor === undefined) npc.favor = 50;
            if (!npc.region) npc.region = (id.includes('dream') || id.includes('george')) ? '美国 - 东部' : '中国';
            if (!npc.relationshipStage) npc.relationshipStage = (npc.isDating ? 'dating' : 'friend');
            
            if (!npc.avatarUrl && !npc.avatar) {
                npc.avatarUrl = getRandomAvatar();
            } else if (!npc.avatarUrl && npc.avatar) {
                npc.avatarUrl = npc.avatar;
            }
            if (!npc.ownerAccountId) npc.ownerAccountId = 'main';
        }
    }
    window.ensureNpcIntegrity = ensureNpcIntegrity;

    function getChatStorageKey(npcId, accId = null) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { id: 'main' };
        return `${accId || curAcc.id || 'main'}_${npcId}`;
    }
    window.getChatStorageKey = getChatStorageKey;

    function getAccountChatHistory(npcId, accId = null) {
        if (!window.G.chatHistory) window.G.chatHistory = {};
        const key = getChatStorageKey(npcId, accId);
        if (!window.G.chatHistory[key]) {
            // 🌟 兼容性自愈检查：如果老版本没有带账号前缀（形如 'npc_123'），自动迁移对齐到当前主账号 'main_npc_123'
            if ((!accId || accId === 'main') && Array.isArray(window.G.chatHistory[npcId]) && window.G.chatHistory[npcId].length > 0) {
                window.G.chatHistory[key] = window.G.chatHistory[npcId];
            } else {
                window.G.chatHistory[key] = [];
            }
        }
        return window.G.chatHistory[key];
    }
    window.getAccountChatHistory = getAccountChatHistory;

    function pushChatMessageSafe(npcId, msgObj, accId = null) {
        if (!msgObj._id) msgObj._id = 'cmsg_' + Date.now() + '_' + (Math.floor(Math.random() * 8999) + 1000);
        if (!msgObj.timestamp) msgObj.timestamp = Date.now();
        getAccountChatHistory(npcId, accId).push(msgObj);
        syncChatHistoryToLocalBackup();
    }
    window.pushChatMessageSafe = pushChatMessageSafe;

    function isAccountBlockedByNpc(npcId, accId = null) {
        const curAcc = accId || ((typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo().id : 'main');
        const token = `${npcId}_${curAcc}`;
        if (curAcc === 'main' && Array.isArray(window.G.blockedNpcs) && window.G.blockedNpcs.includes(npcId)) return true;
        return (window.G.blockedRecords || []).includes(token);
    }
    window.isAccountBlockedByNpc = isAccountBlockedByNpc;

    function renderAvatarBadge(obj, size = 46) {
        const curAcc = (typeof getActiveAccountInfo === 'function') ? getActiveAccountInfo() : { avatar: 'assets/icons/chat.png' };
        let url = (obj && obj.isPlayer) ? curAcc.avatar : (obj?.avatarUrl || obj?.avatar || getRandomAvatar());
        if (!url) url = 'assets/icons/chat.png';
        return `<div style="width:${size}px;height:${size}px;border-radius:6px;overflow:hidden;background:#e9e9e9;flex-shrink:0;box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.06);">
            <img src="${url}" draggable="false" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.onerror=null;this.src='assets/icons/chat.png';" />
        </div>`;
    }
    window.renderAvatarBadge = renderAvatarBadge;

    function calculateHistoryTokens(history) {
        if (!Array.isArray(history) || history.length === 0) return 0;
        let charCount = 0;
        for (const m of history) {
            charCount += (m.text ? m.text.length : 0);
            if (m.originalText) charCount += m.originalText.length;
            if (m.sharedMoment?.body) charCount += m.sharedMoment.body.length;
        }
        return Math.round(charCount * 1.3 + 120);
    }
    window.calculateHistoryTokens = calculateHistoryTokens;

    function formatTokenString(tokens) {
        if (tokens >= 1000) return (tokens / 1000).toFixed(1) + 'k';
        return tokens.toString();
    }
    window.formatTokenString = formatTokenString;

    function parseAIReplyEntities(rawText, npcName) {
        if (!rawText) return [];
        let clean = (typeof stripThought === 'function') ? stripThought(rawText).trim() : rawText.trim();
        if (!clean) return [];

        const entities = [];

        const postMomentRegex = /\[POST_MOMENT\s+text="([^"]+)"(?:\s+img_desc="([^"]*)")?\]/i;
        const pMatch = postMomentRegex.exec(clean);
        if (pMatch) {
            const momentBody = (pMatch[1] || '').trim();
            const momentImgDesc = (pMatch[2] || '').trim();
            if (momentBody) {
                if (!window.G.feed) window.G.feed = [];
                const matchedNpc = Object.values(window.G.npcs || {}).find(n => n.name === npcName);
                const momentId = Date.now() + Math.floor(Math.random() * 899 + 100);
                const newMoment = {
                    id: momentId,
                    author: npcName,
                    avatar: matchedNpc?.avatarUrl || matchedNpc?.avatar || getRandomAvatar(),
                    isPlayer: false,
                    body: momentBody,
                    imageMode: momentImgDesc ? 'photo_art' : 'none',
                    image: null,
                    imageDesc: momentImgDesc || null,
                    time: '刚刚',
                    liked: false,
                    likes: 0,
                    comments: []
                };
                window.G.feed.unshift(newMoment);
                syncMomentsFeedToLocalBackup();

                entities.push({
                    type: 'moment_notice',
                    momentId: momentId,
                    author: npcName,
                    text: `对方发表了一条朋友圈动态`
                });
            }
            clean = clean.replace(postMomentRegex, '').trim();
        }

        const tokenRegex = /\[VOICE(?:\s+seconds=["']?(\d+)["']?)?(?:\s+audio_bg=["']?([^"']*)["']?)?\]([\s\S]*?)\[\/VOICE\]|\[STICKER(?:\s+category=["']?([^"'\]\s]*)["']?)?(?:\s+desc=["']?([^"'\]\s]*)["']?)?\s*\]|\[MSG(?:\s+original=(?:"([\s\S]*?)"|'([\s\S]*?)'|([^\]\s]+)))?\]([\s\S]*?)\[\/MSG\]/gi;

        let match;
        while ((match = tokenRegex.exec(clean)) !== null) {
            if (match[0].startsWith('[VOICE')) {
                const sec = parseInt(match[1]) || Math.min(60, Math.max(2, Math.round((match[3] || '').length * 0.45)));
                entities.push({
                    type: 'voice',
                    seconds: sec,
                    audioBg: (match[2] || '').trim(),
                    text: (match[3] || '').trim()
                });
            }
            else if (match[0].startsWith('[STICKER')) {
                const cat = (match[4] || '豆米乌卡').trim();
                const desc = (match[5] || '开心').trim();
                entities.push({
                    type: 'sticker_entity',
                    category: cat,
                    desc: desc
                });
            }
            else if (match[0].startsWith('[MSG')) {
                const original = (match[6] || match[7] || match[8] || '').trim();
                let innerText = (match[9] || '').trim();

                const nestedStickerRegex = /\[STICKER(?:\s+category=["']?([^"'\]\s]*)["']?)?(?:\s+desc=["']?([^"'\]\s]*)["']?)?\s*\]/gi;
                if (nestedStickerRegex.test(innerText)) {
                    let lastIdx = 0;
                    nestedStickerRegex.lastIndex = 0;
                    let stMatch;
                    while ((stMatch = nestedStickerRegex.exec(innerText)) !== null) {
                        const beforeText = innerText.substring(lastIdx, stMatch.index).trim();
                        if (beforeText) {
                            entities.push({
                                type: 'text',
                                text: beforeText,
                                originalText: original || null
                            });
                        }
                        entities.push({
                            type: 'sticker_entity',
                            category: (stMatch[1] || '豆米乌卡').trim(),
                            desc: (stMatch[2] || '开心').trim()
                        });
                        lastIdx = nestedStickerRegex.lastIndex;
                    }
                    const afterText = innerText.substring(lastIdx).trim();
                    if (afterText) {
                        entities.push({
                            type: 'text',
                            text: afterText,
                            originalText: null
                        });
                    }
                } else {
                    innerText = innerText.replace(/\[STICKER[^\]]*\]/gi, '').trim();
                    if (innerText || original) {
                        entities.push({
                            type: 'text',
                            text: innerText || original,
                            originalText: original || null
                        });
                    }
                }
            }
        }

        if (entities.length > 0) {
            return entities.slice(0, 8);
        }

        let sanitized = clean;
        const msgLooseRegex = /\[MSG(?:\s+original=(?:"([\s\S]*?)"|'([\s\S]*?)'|([^\]\s]+)))?\]([\s\S]*?)(?:\[\/MSG\]|$)/gi;
        let looseMatch;
        while ((looseMatch = msgLooseRegex.exec(clean)) !== null) {
            const orig = (looseMatch[1] || looseMatch[2] || looseMatch[3] || '').trim();
            const body = (looseMatch[4] || '').replace(/\[\/MSG\]/gi, '').trim();
            if (body || orig) {
                entities.push({
                    type: 'text',
                    text: body || orig,
                    originalText: orig || null
                });
            }
        }

        if (entities.length > 0) {
            return entities.slice(0, 8);
        }

        const nakedStickerRegex = /\[STICKER(?:\s+category=["']?([^"'\]\s]*)["']?)?(?:\s+desc=["']?([^"'\]\s]*)["']?)?\s*\]/gi;
        if (nakedStickerRegex.test(sanitized)) {
            let lastIdx = 0;
            nakedStickerRegex.lastIndex = 0;
            let nMatch;
            while ((nMatch = nakedStickerRegex.exec(sanitized)) !== null) {
                const textPart = sanitized.substring(lastIdx, nMatch.index).trim();
                if (textPart) {
                    entities.push({ type: 'text', text: textPart });
                }
                entities.push({
                    type: 'sticker_entity',
                    category: (nMatch[1] || '豆米乌卡').trim(),
                    desc: (nMatch[2] || '开心').trim()
                });
                lastIdx = nakedStickerRegex.lastIndex;
            }
            const tailPart = sanitized.substring(lastIdx).trim();
            if (tailPart) {
                entities.push({ type: 'text', text: tailPart });
            }
            if (entities.length > 0) return entities.slice(0, 8);
        }

        const pureText = sanitized
            .replace(/\[\/?(?:MSG|VOICE|STICKER|FAVOR|BEHIND_SCREEN)[^\]]*\]/gi, '')
            .trim();

        const lines = pureText.split(/\n+/).map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) {
            return lines.slice(0, 5).map(l => ({ type: 'text', text: l }));
        }

        return [{ type: 'text', text: pureText || '在呢' }];
    }
    window.parseAIReplyEntities = parseAIReplyEntities;

    function resolveStickerImageUrl(category, desc) {
        const lib = window.G.stickerLibrary || [];
        const found = lib.find(s => s && (s.category === category || !category) && (s.desc === desc || (s.desc && s.desc.includes(desc))));
        if (found && found.url) return { url: found.url, desc: found.desc };

        const catFallback = lib.find(s => s && s.category === category);
        if (catFallback && catFallback.url) return { url: catFallback.url, desc: catFallback.desc };

        return null;
    }
    window.resolveStickerImageUrl = resolveStickerImageUrl;

    function showGeneratingBanner(targetName) {
        let el = document.getElementById('wechatGeneratingBanner');
        if (!el) {
            el = document.createElement('div');
            el.id = 'wechatGeneratingBanner';
            el.className = 'wechat-bg-generating-banner';
            document.body.appendChild(el);
        }
        el.innerHTML = `
            <div class="wechat-spin-ring"></div>
            <span>「${escapeHtml(targetName)}」正在输入中...</span>
        `;
    }
    window.showGeneratingBanner = showGeneratingBanner;

    function hideGeneratingBanner() {
        const el = document.getElementById('wechatGeneratingBanner');
        if (el) el.remove();
    }
    window.hideGeneratingBanner = hideGeneratingBanner;

    function crc32(buf) {
        let table = window._crc32Table;
        if (!table) {
            table = new Uint8Array(256);
            for (let i = 0; i < 256; i++) {
                let c = i;
                for (let k = 0; k < 8; k++) {
                    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                }
                table[i] = c;
            }
            window._crc32Table = table;
        }
        let crc = 0 ^ (-1);
        for (let i = 0; i < buf.length; i++) {
            crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
        }
        return (crc ^ (-1)) >>> 0;
    }

    function createPngTextChunk(keyword, text) {
        const keyBytes = new TextEncoder().encode(keyword);
        const textBytes = new TextEncoder().encode(text);
        const dataLen = keyBytes.length + 1 + textBytes.length;
        const chunk = new Uint8Array(4 + 4 + dataLen + 4);

        const view = new DataView(chunk.buffer);
        view.setUint32(0, dataLen);
        chunk[4] = 0x74; chunk[5] = 0x45; chunk[6] = 0x74; chunk[7] = 0x74;

        let offset = 8;
        chunk.set(keyBytes, offset);
        offset += keyBytes.length;
        chunk[offset++] = 0;
        chunk.set(textBytes, offset);
        offset += textBytes.length;

        const crcData = chunk.subarray(4, 8 + dataLen);
        view.setUint32(offset, crc32(crcData));
        return chunk;
    }

    function showExportedCardModal(dataUrl, filename) {
        let mask = document.createElement('div');
        mask.className = 'wechat-clean-modal-mask';
        mask.style.zIndex = '10006';
        mask.innerHTML = `
            <div class="wechat-clean-modal-card" style="max-width:300px;text-align:center;padding:18px 16px;">
                <div class="wechat-clean-modal-title" style="margin-bottom:8px;">角色卡已生成</div>
                <div style="font-size:12px;color:#888;margin-bottom:12px;line-height:1.4;">
                    若未自动下载，可长按下方图片保存至相册
                </div>
                <div style="width:160px;height:160px;margin:0 auto 14px;border-radius:10px;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.12);background:#f2f2f2;border:1px solid #e8e8e8;">
                    <img src="${dataUrl}" alt="角色卡" style="width:100%;height:100%;object-fit:cover;display:block;" />
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <a href="${dataUrl}" download="${escapeHtml(filename)}" id="btnForceDownloadLink" style="display:block;text-decoration:none;border:none;background:#07c160;color:#fff;padding:8px 0;border-radius:6px;font-size:13.5px;font-weight:600;text-align:center;">
                        保存到设备
                    </a>
                    <button type="button" id="btnCloseCardExportModal" style="border:none;background:#f2f2f2;color:#555;padding:7px 0;border-radius:6px;font-size:13px;cursor:pointer;">
                        完成
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(mask);
        const close = () => { if (mask && mask.parentNode) mask.parentNode.removeChild(mask); };
        mask.querySelector('#btnCloseCardExportModal').onclick = close;
        mask.querySelector('#btnForceDownloadLink').onclick = () => {
            setTimeout(close, 400);
        };
    }

    async function exportTavernCharacterPng(npc, customFilename = null) {
        if (!npc) return;

        const tavernData = {
            name: npc.name || 'NPC',
            description: npc.persona || '',
            personality: `常驻地区: ${npc.region || '中国'}；个性签名: ${npc.signature || ''}`,
            scenario: `MC生活与日常交流。当前备注: ${npc.remark || '无'}。`,
            first_mes: `你好，我是 ${npc.name}。`,
            mes_example: '',
            creator_notes: '由 MC YouTube 模拟器 6.0 导出',
            system_prompt: '',
            post_history_instructions: '',
            alternate_greetings: [],
            character_book: null,
            tags: ['Minecraft', 'MCYT', npc.region || 'MC玩家'],
            spec: 'chara_card_v2',
            spec_version: '2.0',
            data: {
                name: npc.name || 'NPC',
                description: npc.persona || '',
                personality: `地区: ${npc.region || '中国'}；签名: ${npc.signature || ''}`,
                scenario: `MC生活与日常交流。备注名: ${npc.remark || '无'}。`,
                first_mes: `你好，我是 ${npc.name}。`,
                mes_example: '',
                creator_notes: '由 MC YouTube 模拟器 6.0 导出',
                system_prompt: '',
                post_history_instructions: '',
                alternate_greetings: [],
                tags: ['Minecraft', 'MCYT']
            }
        };

        const jsonStr = JSON.stringify(tavernData);
        const base64Json = btoa(unescape(encodeURIComponent(jsonStr)));

        const avatarUrl = npc.avatarUrl || npc.avatar || getRandomAvatar();
        const img = new Image();
        if (!avatarUrl.startsWith('data:')) {
            img.crossOrigin = 'anonymous';
        }
        img.src = avatarUrl;

        await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = () => {
                img.removeAttribute('crossOrigin');
                img.src = 'assets/icons/chat.png';
                img.onload = resolve;
                img.onerror = resolve;
            };
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 400;
        const ctx = canvas.getContext('2d');
        
        let arrayBuf;
        try {
            ctx.drawImage(img, 0, 0);
            const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
            if (blob) {
                arrayBuf = await blob.arrayBuffer();
            }
        } catch (canvasErr) {
            console.warn('Canvas 导出受阻，采用纯净离线头像重绘:', canvasErr);
        }

        if (!arrayBuf) {
            const fallbackCanvas = document.createElement('canvas');
            fallbackCanvas.width = 400;
            fallbackCanvas.height = 400;
            const fCtx = fallbackCanvas.getContext('2d');
            fCtx.fillStyle = '#07c160';
            fCtx.fillRect(0, 0, 400, 400);
            fCtx.fillStyle = '#ffffff';
            fCtx.font = 'bold 64px sans-serif';
            fCtx.textAlign = 'center';
            fCtx.textBaseline = 'middle';
            fCtx.fillText((npc.name || 'MC').substring(0, 4), 200, 200);
            const fBlob = await new Promise(res => fallbackCanvas.toBlob(res, 'image/png'));
            arrayBuf = await fBlob.arrayBuffer();
        }

        const srcBytes = new Uint8Array(arrayBuf);

        let insertPos = 8;
        const view = new DataView(srcBytes.buffer);
        const ihdrLen = view.getUint32(8);
        insertPos = 8 + 4 + 4 + ihdrLen + 4;

        const textChunk = createPngTextChunk('chara', base64Json);

        const out = new Uint8Array(srcBytes.length + textChunk.length);
        out.set(srcBytes.subarray(0, insertPos), 0);
        out.set(textChunk, insertPos);
        out.set(srcBytes.subarray(insertPos), insertPos + textChunk.length);

        const outBlob = new Blob([out], { type: 'image/png' });
        
        let baseName = (customFilename && customFilename.trim()) ? customFilename.trim() : `${npc.name || 'character'}_人设卡`;
        if (!baseName.toLowerCase().endsWith('.png')) {
            baseName += '.png';
        }
        const finalFilename = baseName.replace(/[\\/:*?"<>|]/g, '_');

        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result;

            try {
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = finalFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } catch (_) {}

            showExportedCardModal(dataUrl, finalFilename);
        };
        reader.readAsDataURL(outBlob);
    }
    window.exportTavernCharacterPng = exportTavernCharacterPng;

    function parsePngTextChunks(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        if (view.getUint32(0) !== 0x89504E47 || view.getUint32(4) !== 0x0D0A1A0A) {
            return null;
        }

        let offset = 8;
        const chunks = {};

        while (offset < arrayBuffer.byteLength) {
            if (offset + 8 > arrayBuffer.byteLength) break;
            const length = view.getUint32(offset);
            const typeCode = [
                String.fromCharCode(view.getUint8(offset + 4)),
                String.fromCharCode(view.getUint8(offset + 5)),
                String.fromCharCode(view.getUint8(offset + 6)),
                String.fromCharCode(view.getUint8(offset + 7))
            ].join('');

            const chunkDataOffset = offset + 8;
            if (chunkDataOffset + length > arrayBuffer.byteLength) break;

            if (typeCode === 'tEXt') {
                const dataBytes = new Uint8Array(arrayBuffer, chunkDataOffset, length);
                let nullIdx = -1;
                for (let i = 0; i < dataBytes.length; i++) {
                    if (dataBytes[i] === 0) {
                        nullIdx = i;
                        break;
                    }
                }
                if (nullIdx !== -1) {
                    const key = new TextDecoder('latin1').decode(dataBytes.subarray(0, nullIdx));
                    const val = new TextDecoder('utf-8').decode(dataBytes.subarray(nullIdx + 1));
                    chunks[key] = val;
                }
            }

            offset += 4 + 4 + length + 4;
        }
        return chunks;
    }

    async function parseTavernCardFromFile(file) {
        if (!file) return null;
        const fileName = file.name || '';
        const isPng = file.type === 'image/png' || fileName.toLowerCase().endsWith('.png');
        const isJson = file.type === 'application/json' || fileName.toLowerCase().endsWith('.json');

        if (isJson) {
            const text = await file.text();
            let parsed = null;
            try {
                parsed = JSON.parse(text);
            } catch (_) {
                throw new Error('JSON 文件格式无效');
            }
            return extractTavernCardProfile(parsed, null);
        }

        if (isPng) {
            const buf = await file.arrayBuffer();
            const chunks = parsePngTextChunks(buf);
            if (!chunks) {
                throw new Error('不是标准的 PNG 格式图片');
            }

            let rawDataStr = chunks['chara'] || chunks['ccv3'];
            if (!rawDataStr) {
                throw new Error('未在图片中检测到酒馆角色卡数据');
            }

            let jsonStr = '';
            try {
                jsonStr = decodeURIComponent(escape(atob(rawDataStr)));
            } catch (_) {
                try {
                    jsonStr = atob(rawDataStr);
                } catch (_) {
                    jsonStr = rawDataStr;
                }
            }

            let parsed = null;
            try {
                parsed = JSON.parse(jsonStr);
            } catch (_) {
                throw new Error('角色卡数据解析失败');
            }

            const rawAvatarDataUrl = await new Promise((res) => {
                const r = new FileReader();
                r.onload = () => res(r.result);
                r.onerror = () => res(null);
                r.readAsDataURL(file);
            });

            const compressedAvatar = await compressAvatarDataUrl(rawAvatarDataUrl, 128, 0.82);

            return extractTavernCardProfile(parsed, compressedAvatar);
        }

        throw new Error('请选择 .png 角色卡或 .json 文件');
    }
    window.parseTavernCardFromFile = parseTavernCardFromFile;

    function extractTavernCardProfile(dataObj, avatarUrl = null) {
        if (!dataObj || typeof dataObj !== 'object') return null;

        const data = dataObj.data || dataObj;
        const name = (data.name || dataObj.name || '新角色').trim();
        const persona = (data.description || dataObj.description || data.persona || dataObj.persona || '').trim();
        const personality = data.personality || dataObj.personality || '';

        let region = '中国';
        if (personality.includes('美国 - 东部') || personality.includes('美国东部')) region = '美国 - 东部';
        else if (personality.includes('美国 - 西部') || personality.includes('美国西部')) region = '美国 - 西部';
        else if (personality.includes('英国')) region = '英国';
        else if (personality.includes('日本')) region = '日本';
        else if (personality.includes('韩国')) region = '韩国';
        else if (personality.includes('加拿大')) region = '加拿大';
        else if (personality.includes('澳大利亚')) region = '澳大利亚';
        else if (personality.includes('德国')) region = '德国';
        else if (personality.includes('法国')) region = '法国';

        let signature = '';
        const sigMatch = personality.match(/个性签名[:：\s]*([^；;\n]+)/i) || personality.match(/签名[:：\s]*([^；;\n]+)/i);
        if (sigMatch && sigMatch[1]) {
            signature = sigMatch[1].trim();
        }

        return {
            name: name,
            persona: persona || 'MC同伴玩家。',
            region: region,
            signature: signature,
            avatarUrl: avatarUrl || (typeof getRandomAvatar === 'function' ? getRandomAvatar() : 'assets/icons/chat.png')
        };
    }

    // 🌟 早期主动预热加载：脚本装载即刻启动 IndexedDB 读取通道，在用户打开微信前将单聊历史充盈至运行内存
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            restoreChatHistoryFromLocalBackup();
        });
    } else {
        restoreChatHistoryFromLocalBackup();
    }

})();
