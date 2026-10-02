/**
 * js/apps/music/music-npc-playlists.js
 * 🎭 角色专属人设歌单动态生成中枢
 */

(function () {
    'use strict';

    const DEFAULT_AUDIO_POOL = [
        { url: 'https://music.163.com/song/media/outer/url?id=1413585838.mp3', duration: 198 },
        { url: 'https://music.163.com/song/media/outer/url?id=1384026889.mp3', duration: 215 },
        { url: 'https://music.163.com/song/media/outer/url?id=1824045033.mp3', duration: 184 },
        { url: 'https://music.163.com/song/media/outer/url?id=139774.mp3', duration: 240 }
    ];

    window.getStoredNpcPlaylists = function () {
        try {
            const raw = localStorage.getItem('mcyt_wemusic_npc_playlists');
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return [];
    };

    window.saveStoredNpcPlaylists = function (list) {
        try {
            localStorage.setItem('mcyt_wemusic_npc_playlists', JSON.stringify(list));
        } catch (_) {}
    };

    function getAvailableNpcs() {
        let npcs = [];
        try {
            if (window.G && window.G.customNpcs && typeof window.G.customNpcs === 'object') {
                npcs = Object.values(window.G.customNpcs);
            } else {
                const raw = localStorage.getItem('mcyt_wechat_custom_npcs');
                if (raw) npcs = Object.values(JSON.parse(raw));
            }
        } catch (_) {}

        if (!npcs || npcs.length === 0) {
            npcs = [
                { id: 'npc_default_1', name: '咩咩的知心同伴', avatar: 'assets/system/default_lock.jpg', persona: '温柔、体贴、喜欢在雨天听安静的治愈民谣与纯音乐。' },
                { id: 'npc_default_2', name: '拉莱耶的守望者', avatar: 'tarot/images/slot_bg.png', persona: '神秘、清冷、沉浸于深海后摇与轻灵的星空低语。' }
            ];
        }
        return npcs;
    }

    function generatePlaylistForNpc(npc, variantIndex = 1) {
        const personaText = npc.persona || '';
        let styleTags = ['治愈', '独处', '夜间心事'];
        if (personaText.includes('阳光') || personaText.includes('开朗')) styleTags = ['活力', '晨光', '轻快节奏'];
        if (personaText.includes('神秘') || personaText.includes('高冷')) styleTags = ['后摇', '幽静', '深海氛围'];

        const audio1 = DEFAULT_AUDIO_POOL[Math.floor(Math.random() * DEFAULT_AUDIO_POOL.length)];
        const audio2 = DEFAULT_AUDIO_POOL[Math.floor(Math.random() * DEFAULT_AUDIO_POOL.length)];

        return {
            id: `pl_${npc.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            npcId: npc.id,
            npcName: npc.name,
            npcAvatar: npc.avatar || 'assets/system/default_desktop.jpg',
            playlistTitle: variantIndex === 1 ? `「${npc.name}」的私享独白音轨` : `「${npc.name}」的深夜漫游 Vol.${variantIndex}`,
            desc: `${npc.name} 挑选的 ${styleTags.join(' · ')} 精选歌单，记录着 ta 此时此刻的心境。`,
            tags: styleTags,
            tracks: [
                {
                    id: `track_${npc.id}_${Date.now()}_1`,
                    title: `${npc.name}的午后微风`,
                    artist: npc.name,
                    album: '心声私藏',
                    url: audio1.url,
                    cover: npc.avatar || 'assets/system/default_desktop.jpg',
                    duration: audio1.duration,
                    lyrics: [
                        { time: 0, text: `（这是属于 ${npc.name} 的特别旋律）`, trans: `(A special melody belonging to ${npc.name})` },
                        { time: 10, text: '旋律流淌在安静的午后', trans: 'The melody flows gently through a quiet afternoon' },
                        { time: 25, text: '就像与你每一次默契的对视', trans: 'Just like every tacit glance shared with you' },
                        { time: 45, text: '把想对你说的心意，都藏进这首歌里', trans: 'Hiding every thought I have for you within this song' }
                    ]
                },
                {
                    id: `track_${npc.id}_${Date.now()}_2`,
                    title: '与你同频的波形',
                    artist: npc.name,
                    album: '双向羁绊',
                    url: audio2.url,
                    cover: npc.avatar || 'assets/system/default_desktop.jpg',
                    duration: audio2.duration,
                    lyrics: [
                        { time: 0, text: '夜深的时候，总会想起你', trans: 'When the night deepens, you always come to mind' },
                        { time: 18, text: '耳机里循环的每一个音节', trans: 'Every syllable looping in the headphones' },
                        { time: 38, text: '都在期待下一次与你重逢', trans: 'Is quietly awaiting our next encounter' }
                    ]
                }
            ]
        };
    }

    window.getNpcMusicPlaylists = function () {
        let stored = window.getStoredNpcPlaylists();
        if (!stored || stored.length === 0) {
            const npcs = getAvailableNpcs();
            stored = npcs.slice(0, 3).map(npc => generatePlaylistForNpc(npc, 1));
            window.saveStoredNpcPlaylists(stored);
        }
        return stored;
    };

    window.refreshNpcMusicPlaylists = function () {
        const allNpcs = getAvailableNpcs();
        let stored = window.getStoredNpcPlaylists();

        const existingNpcIds = new Set(stored.map(p => p.npcId));
        const ungeneratedNpcs = allNpcs.filter(n => !existingNpcIds.has(n.id));

        let pickedNpcs = [];
        if (ungeneratedNpcs.length > 0) {
            pickedNpcs = ungeneratedNpcs.slice(0, Math.min(3, ungeneratedNpcs.length));
        } else {
            const shuffled = [...allNpcs].sort(() => Math.random() - 0.5);
            pickedNpcs = shuffled.slice(0, Math.min(2, shuffled.length));
        }

        pickedNpcs.forEach(npc => {
            const countForThisNpc = stored.filter(p => p.npcId === npc.id).length;
            const newPl = generatePlaylistForNpc(npc, countForThisNpc + 1);
            stored.unshift(newPl);
        });

        if (stored.length > 15) stored = stored.slice(0, 15);
        window.saveStoredNpcPlaylists(stored);

        if (typeof showToast === 'function') {
            const names = pickedNpcs.map(n => n.name).join('、');
            showToast(`已为「${names}」刷新生成了新歌单！`);
        }
        const modalBody = document.getElementById('appModalBody');
        if (modalBody && typeof window.renderMusicApp === 'function') {
            window.renderMusicApp(modalBody);
        }
    };
})();