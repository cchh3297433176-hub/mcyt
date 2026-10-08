/**
 * 伴窝 (Nest) - 角色星轨选择台 (同心圆聚合布局 + 切页)
 * 纯 SVG 极简风格，C位用户拍板大卡，环绕周边真实聊天角色
 */
window.RoomHub = {
    currentPage: 0,
    pageSize: 5,

    /**
     * 提取真实聊天角色库（支持官方 NPC 与玩家自定义自建角色）
     */
    getCharacters() {
        let chars = [];

        // 1. 优先读取主游戏 window.G.npcs
        if (window.G && window.G.npcs && typeof window.G.npcs === 'object') {
            for (const [id, npc] of Object.entries(window.G.npcs)) {
                if (!npc) continue;
                const avatar = npc.avatarUrl || npc.avatar || 'assets/icons/chat.png';
                const name = npc.name || id;
                chars.push({
                    id: id,
                    name: name,
                    avatar: avatar,
                    desc: npc.persona || ''
                });
            }
        }

        // 2. 如果 G.npcs 尚未初始化或为空，尝试从持久化备份读取
        if (chars.length === 0) {
            try {
                const raw = localStorage.getItem('mcyt_wechat_custom_npcs');
                if (raw) {
                    const customMap = JSON.parse(raw);
                    if (customMap && typeof customMap === 'object') {
                        for (const [id, npc] of Object.entries(customMap)) {
                            if (!npc) continue;
                            chars.push({
                                id: id,
                                name: npc.name || id,
                                avatar: npc.avatarUrl || npc.avatar || 'assets/icons/chat.png',
                                desc: npc.persona || ''
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn('[RoomHub] 读取自建角色备份失败', e);
            }
        }

        // 3. 兜底回退：如果完全没有任何角色，使用系统官方 NPC 预设
        if (chars.length === 0 && typeof OFFICIAL_NPCS !== 'undefined') {
            for (const [id, npc] of Object.entries(OFFICIAL_NPCS)) {
                chars.push({
                    id: id,
                    name: npc.name || id,
                    avatar: npc.avatarUrl || npc.avatar || 'assets/icons/chat.png',
                    desc: npc.persona || ''
                });
            }
        }

        return chars;
    },

    /**
     * 获取真实玩家用户头像（绝不掉成默认绿色图标）
     */
    getUserAvatar() {
        if (typeof window.getPlayerAvatarSafe === 'function') {
            return window.getPlayerAvatarSafe();
        }
        if (window.G && window.G.player && (window.G.player.avatarUrl || window.G.player.avatar)) {
            return window.G.player.avatarUrl || window.G.player.avatar;
        }
        return 'assets/icons/chat.png';
    },

    /**
     * 获取玩家名称
     */
    getUserName() {
        if (window.G && window.G.player && window.G.player.name) {
            return window.G.player.name;
        }
        return '我的小窝';
    },

    renderHub(containerEl, onSelectRole, onOpenCoffee) {
        const allChars = this.getCharacters();
        const totalPages = Math.ceil(allChars.length / this.pageSize) || 1;
        if (this.currentPage >= totalPages) this.currentPage = Math.max(0, totalPages - 1);
        const pageChars = allChars.slice(this.currentPage * this.pageSize, (this.currentPage + 1) * this.pageSize);

        const posOffsets = [
            { top: '15%', left: '50%', label: '01' },
            { top: '34%', left: '16%', label: '02' },
            { top: '34%', left: '84%', label: '03' },
            { top: '68%', left: '26%', label: '04' },
            { top: '68%', left: '74%', label: '05' }
        ];

        const userAvatar = this.getUserAvatar();
        const userName = this.getUserName();

        let html = `
        <div class="nest-hub-wrapper">
            <canvas id="nestStarCanvas" class="nest-star-bg"></canvas>
            
            <div class="nest-top-nav">
                <button class="nest-back-desktop-btn" id="btnNestExitDesktop" title="返回桌面">
                    <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;"><path d="M15 18l-6-6 6-6"/></svg>
                    <span>桌面</span>
                </button>
                <div class="nest-title-badge">
                    <span class="nest-brand">伴窝</span>
                    <span class="nest-sub">空间羁绊</span>
                </div>
                <button class="nest-coffee-btn" id="btnNestCoffee">
                    <span class="nest-btn-icon">${window.RoomIcons.coffee}</span>
                    <span>闲聚咖啡厅</span>
                </button>
            </div>

            <div class="nest-orbit-stage">
                <!-- C位玩家专属小窝卡片 -->
                <div class="nest-center-clapper" id="btnMyNest">
                    <div class="clapper-top-stripes">
                        <div class="stripe"></div><div class="stripe"></div><div class="stripe"></div>
                    </div>
                    <div class="clapper-avatar-box">
                        <img src="${userAvatar}" class="clapper-avatar" onerror="this.src='assets/icons/chat.png'"/>
                    </div>
                    <div class="clapper-meta-board">
                        <div class="clapper-scene-id">SCENE 01 · 专属空间</div>
                        <div class="clapper-director-tag">
                            <span class="clapper-icon">${window.RoomIcons.nest}</span>
                            <span>${userName}</span>
                        </div>
                    </div>
                </div>

                <!-- 真实角色星轨环绕 -->
                ${pageChars.map((char, idx) => {
                    const pos = posOffsets[idx] || { top: '50%', left: '50%', label: '0' + (idx + 1) };
                    return `
                    <div class="nest-char-orb" style="top:${pos.top}; left:${pos.left};" data-char-id="${char.id}">
                        <div class="char-avatar-ring">
                            <img src="${char.avatar || 'assets/icons/chat.png'}" class="char-avatar-img" onerror="this.src='assets/icons/chat.png'"/>
                        </div>
                        <div class="char-director-badge">
                            <span class="char-num-pill">No.${pos.label}</span>
                            <span class="char-name-text">${char.name}</span>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>

            <div class="nest-page-dock">
                <button class="nest-page-btn" id="btnNestPrev" ${this.currentPage === 0 ? 'disabled' : ''}>
                    ${window.RoomIcons.arrowLeft}
                </button>
                <div class="nest-page-dots">
                    ${Array.from({ length: totalPages }).map((_, i) => `
                        <div class="nest-dot ${i === this.currentPage ? 'active' : ''}"></div>
                    `).join('')}
                </div>
                <button class="nest-page-btn" id="btnNestNext" ${this.currentPage >= totalPages - 1 ? 'disabled' : ''}>
                    ${window.RoomIcons.arrowRight}
                </button>
            </div>
        </div>
        `;

        containerEl.innerHTML = html;
        if (window.RoomStars) {
            window.RoomStars.init(document.getElementById('nestStarCanvas'));
        }

        const exitBtn = document.getElementById('btnNestExitDesktop');
        if (exitBtn) {
            exitBtn.onclick = () => {
                if (window.RoomApp && typeof window.RoomApp.close === 'function') {
                    window.RoomApp.close();
                }
            };
        }
        document.getElementById('btnNestCoffee').onclick = () => onOpenCoffee && onOpenCoffee();
        document.getElementById('btnMyNest').onclick = () => onSelectRole && onSelectRole('user_me');

        containerEl.querySelectorAll('.nest-char-orb').forEach(el => {
            el.onclick = () => {
                const charId = el.getAttribute('data-char-id');
                onSelectRole && onSelectRole(charId);
            };
        });

        document.getElementById('btnNestPrev').onclick = () => {
            if (this.currentPage > 0) {
                this.currentPage--;
                this.renderHub(containerEl, onSelectRole, onOpenCoffee);
            }
        };

        document.getElementById('btnNestNext').onclick = () => {
            if (this.currentPage < totalPages - 1) {
                this.currentPage++;
                this.renderHub(containerEl, onSelectRole, onOpenCoffee);
            }
        };
    }
};
