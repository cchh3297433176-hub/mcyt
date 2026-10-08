/**
 * 伴窝 (Nest) - 主控制器与生命周期
 * 协调星空角色选人台、角色名下多房间切换、添加房间（支持自定义导入PNG/GIF图标）
 */
window.RoomApp = {
    appEl: null,
    currentView: 'hub',
    activeCharId: null,
    activeRoomId: null,

    open() {
        let modal = document.getElementById('appModalRoom');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'appModalRoom';
            modal.className = 'app-fullscreen-modal nest-app-modal';
            const phoneWrapper = document.getElementById('phoneWrapper') || document.body;
            phoneWrapper.appendChild(modal);
        }
        this.appEl = modal;
        modal.style.display = 'block';
        this.showHub();
    },

    close() {
        if (this.appEl) {
            this.appEl.style.display = 'none';
        }
        if (window.RoomStars) window.RoomStars.stop();
        if (window.RoomEngine) window.RoomEngine.destroy();
    },

    showHub() {
        this.currentView = 'hub';
        this.activeRoomId = null;
        if (window.RoomEngine) window.RoomEngine.destroy();
        this.appEl.innerHTML = '<div id="nestHubContainer" class="nest-container"></div>';
        const hubBox = this.appEl.querySelector('#nestHubContainer');
        window.RoomHub.renderHub(
            hubBox,
            (charId) => this.enterRoom(charId),
            () => this.enterCoffee()
        );
    },

    /**
     * 进入指定角色的空间（默认主卧室，可切换房间）
     */
    enterRoom(charId, targetRoomId = null) {
        this.currentView = 'room';
        this.activeCharId = charId;
        if (window.RoomStars) window.RoomStars.stop();

        // 提取该角色名下的所有房间
        const rooms = window.RoomManager.getRoomsForChar(charId);
        const activeRoom = window.RoomManager.getActiveRoom(charId, targetRoomId || this.activeRoomId);
        this.activeRoomId = activeRoom.id;

        const icons = window.RoomIcons;
        const charName = charId === 'user_me' ? '我的私人小窝' : (this.getCharName(charId) + ' 的空间');

        this.appEl.innerHTML = `
        <div class="nest-3d-view">
            <div id="nest3dCanvas" class="nest-canvas-wrap"></div>
            
            <!-- 顶部主导航 -->
            <div class="nest-room-bar">
                <button class="nest-icon-btn" id="btnNestBack" title="返回星轨">
                    ${icons.back}
                </button>
                <div class="nest-room-title">
                    <span>${charName}</span>
                </div>
                <div class="nest-bar-actions">
                    <button class="nest-icon-btn" id="btnNestResetCam" title="重置视角">
                        ${icons.resetCamera}
                    </button>
                    <button class="nest-icon-btn" id="btnNestToggleEdit" title="空间编辑">
                        ${icons.edit}
                    </button>
                </div>
            </div>

            <!-- 顶部多房间胶囊切换条（默认主体卧室，支持导入PNG/GIF图标，点击进房间） -->
            <div class="nest-room-nav-scroll" id="nestRoomNavScroll">
                <div class="nest-room-pill-track">
                    ${rooms.map(r => {
                        const isActive = r.id === activeRoom.id;
                        return `
                        <div class="nest-room-chip ${isActive ? 'active' : ''}" data-room-id="${r.id}">
                            <div class="chip-icon-box">
                                ${r.iconUrl 
                                    ? `<img src="${r.iconUrl}" class="chip-custom-img" alt=""/>` 
                                    : `<span class="chip-svg-icon">${icons.roomCube}</span>`
                                }
                            </div>
                            <span class="chip-name">${r.name}</span>
                        </div>
                        `;
                    }).join('')}
                    
                    <!-- ＋ 添加房间按键 -->
                    <button class="nest-add-room-chip" id="btnAddRoomBtn" title="给角色添加新房间">
                        <span class="chip-svg-icon">${icons.plus}</span>
                        <span>添加房间</span>
                    </button>
                </div>
            </div>

            <!-- 添加房间弹层 -->
            <div class="nest-modal-backdrop" id="nestAddRoomModal" style="display:none;">
                <div class="nest-modal-dialog">
                    <div class="nest-modal-header">
                        <span>添加专属房间</span>
                        <button class="nest-modal-close" id="btnCloseAddRoom">✕</button>
                    </div>
                    <div class="nest-modal-body">
                        <div class="nest-input-group">
                            <label class="nest-input-label">房间名称</label>
                            <input type="text" id="newRoomNameInput" class="nest-text-field" placeholder="例如：茶室、电竞角、画室" maxlength="12"/>
                        </div>
                        <div class="nest-input-group">
                            <label class="nest-input-label">房间图标（可选：导入 PNG/GIF 图片）</label>
                            <div class="nest-upload-preview-row">
                                <div class="nest-icon-preview-box" id="newRoomIconPreview">
                                    <span class="chip-svg-icon">${icons.image}</span>
                                </div>
                                <label class="nest-upload-btn-outline">
                                    <span>选择图片 (PNG/GIF)</span>
                                    <input type="file" id="newRoomIconFile" accept="image/png,image/gif,image/jpeg,image/webp" style="display:none;"/>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="nest-modal-footer">
                        <button class="nest-btn-cancel" id="btnCancelAddRoom">取消</button>
                        <button class="nest-btn-confirm" id="btnConfirmAddRoom">立即创建</button>
                    </div>
                </div>
            </div>

            <div id="nestDrawerMount"></div>
        </div>
        `;

        // 初始化 3D 渲染器与尺寸配置
        const canvasBox = this.appEl.querySelector('#nest3dCanvas');
        window.RoomEngine.init(canvasBox, activeRoom.config);

        const drawerMount = this.appEl.querySelector('#nestDrawerMount');
        window.RoomCustomizer.renderDrawer(drawerMount, activeRoom, (updatedConfig) => {
            window.RoomManager.updateRoomConfig(charId, activeRoom.id, updatedConfig);
        });

        this.bindRoomEvents(charId);
    },

    bindRoomEvents(charId) {
        this.appEl.querySelector('#btnNestBack').onclick = () => this.showHub();
        this.appEl.querySelector('#btnNestResetCam').onclick = () => window.RoomEngine.resetCamera();
        
        const drawerEl = this.appEl.querySelector('#nestEditDrawer');
        this.appEl.querySelector('#btnNestToggleEdit').onclick = () => {
            drawerEl.classList.toggle('open');
        };

        // 房间切换点击事件
        this.appEl.querySelectorAll('.nest-room-chip').forEach(el => {
            el.onclick = () => {
                const rId = el.getAttribute('data-room-id');
                if (rId && rId !== this.activeRoomId) {
                    this.enterRoom(charId, rId);
                }
            };
        });

        // 打开添加房间弹框
        const modal = this.appEl.querySelector('#nestAddRoomModal');
        const openAddBtn = this.appEl.querySelector('#btnAddRoomBtn');
        const closeAddBtn = this.appEl.querySelector('#btnCloseAddRoom');
        const cancelAddBtn = this.appEl.querySelector('#btnCancelAddRoom');
        const confirmAddBtn = this.appEl.querySelector('#btnConfirmAddRoom');
        const fileInput = this.appEl.querySelector('#newRoomIconFile');
        const nameInput = this.appEl.querySelector('#newRoomNameInput');
        const previewBox = this.appEl.querySelector('#newRoomIconPreview');

        let pendingIconData = null;

        if (openAddBtn) openAddBtn.onclick = () => {
            pendingIconData = null;
            nameInput.value = '';
            previewBox.innerHTML = window.RoomIcons.image;
            modal.style.display = 'flex';
        };

        const closeModal = () => {
            modal.style.display = 'none';
        };

        if (closeAddBtn) closeAddBtn.onclick = closeModal;
        if (cancelAddBtn) cancelAddBtn.onclick = closeModal;

        // 监听用户导入 PNG/GIF 图标
        if (fileInput) {
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    pendingIconData = evt.target.result;
                    previewBox.innerHTML = `<img src="${pendingIconData}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>`;
                };
                reader.readAsDataURL(file);
            };
        }

        // 确认创建新房间
        if (confirmAddBtn) {
            confirmAddBtn.onclick = () => {
                const roomName = nameInput.value.trim() || '新房间';
                const created = window.RoomManager.addRoom(charId, roomName, pendingIconData);
                closeModal();
                // 自动切入新创建的房间
                this.enterRoom(charId, created.id);
            };
        }
    },

    getCharName(charId) {
        if (window.G && window.G.npcs && window.G.npcs[charId] && window.G.npcs[charId].name) {
            return window.G.npcs[charId].name;
        }
        return '专属小窝';
    },

    enterCoffee() {
        alert('闲聚咖啡厅正在布置中，角色的公共街区稍后开放！');
    }
};

window.openRoomApp = function() {
    window.RoomApp.open();
};
