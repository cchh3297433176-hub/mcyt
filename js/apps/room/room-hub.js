/**
 * 伴窝 (Nest) - 角色星轨选择台 (同心圆聚合布局 + 切页)
 * 纯 SVG 极简风格，C位用户拍板大卡，环绕周边角色
 */
window.RoomHub = {
    currentPage: 0,
    pageSize: 5,

    getCharacters() {
        if (window.chatState && window.chatState.characters) {
            return Object.values(window.chatState.characters);
        }
        return [
            { id: 'c1', name: '荧星', avatar: 'assets/icons/chat.png', mood: '闲适' },
            { id: 'c2', name: '夜巡', avatar: 'assets/icons/lobby.png', mood: '沉思' },
            { id: 'c3', name: '溯回', avatar: 'assets/icons/app_rememori.png', mood: '小憩' },
            { id: 'c4', name: '丸子', avatar: 'assets/icons/theme.png', mood: '黏人' },
            { id: 'c5', name: '浅川', avatar: 'assets/icons/music.png', mood: '听歌' },
            { id: 'c6', name: '千代', avatar: 'assets/icons/tarot.png', mood: '发呆' }
        ];
    },

    renderHub(containerEl, onSelectRole, onOpenCoffee) {
        const allChars = this.getCharacters();
        const totalPages = Math.ceil(allChars.length / this.pageSize) || 1;
        const pageChars = allChars.slice(this.currentPage * this.pageSize, (this.currentPage + 1) * this.pageSize);

        const posOffsets = [
            { top: '15%', left: '50%', label: 'No.01' },
            { top: '34%', left: '16%', label: 'No.02' },
            { top: '34%', left: '84%', label: 'No.03' },
            { top: '68%', left: '26%', label: 'No.04' },
            { top: '68%', left: '74%', label: 'No.05' }
        ];

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
                <div class="nest-center-clapper" id="btnMyNest">
                    <div class="clapper-top-stripes">
                        <div class="stripe"></div><div class="stripe"></div><div class="stripe"></div>
                    </div>
                    <div class="clapper-avatar-box">
                        <img src="assets/icons/chat.png" class="clapper-avatar" onerror="this.src='icon.png'"/>
                    </div>
                    <div class="clapper-meta-board">
                        <div class="clapper-scene-id">SCENE 01 · 专属空间</div>
                        <div class="clapper-director-tag">
                            <span class="clapper-icon">${window.RoomIcons.nest}</span>
                            <span>我的窝</span>
                        </div>
                    </div>
                </div>

                ${pageChars.map((char, idx) => {
                    const pos = posOffsets[idx] || { top: '50%', left: '50%', label: 'No.0' + (idx+1) };
                    return `
                    <div class="nest-char-orb" style="top:${pos.top}; left:${pos.left};" data-char-id="${char.id}">
                        <div class="char-avatar-ring">
                            <img src="${char.avatar || 'icon.png'}" class="char-avatar-img" onerror="this.src='icon.png'"/>
                        </div>
                        <div class="char-director-badge">
                            <span class="char-num-pill">${pos.label}</span>
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
        window.RoomStars.init(document.getElementById('nestStarCanvas'));

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
