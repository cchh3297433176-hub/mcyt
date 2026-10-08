/**
 * 伴窝 (Nest) - 主控制器与生命周期
 * 协调星空角色选人环与自定义 3D 房间视图
 */
window.RoomApp = {
    appEl: null,
    currentView: 'hub',
    activeCharId: null,

    open() {
        let modal = document.getElementById('appModalRoom');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'appModalRoom';
            modal.className = 'app-fullscreen-modal';
            document.body.appendChild(modal);
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
        if (window.RoomEngine) window.RoomEngine.destroy();
        this.appEl.innerHTML = '<div id="nestHubContainer" class="nest-container"></div>';
        const hubBox = this.appEl.querySelector('#nestHubContainer');
        window.RoomHub.renderHub(
            hubBox,
            (charId) => this.enterRoom(charId),
            () => this.enterCoffee()
        );
    },

    enterRoom(charId) {
        this.currentView = 'room';
        this.activeCharId = charId;
        if (window.RoomStars) window.RoomStars.stop();

        const icons = window.RoomIcons;
        this.appEl.innerHTML = [
            '<div class="nest-3d-view">',
            '  <div id="nest3dCanvas" class="nest-canvas-wrap"></div>',
            '  <div class="nest-room-bar">',
            '    <button class="nest-icon-btn" id="btnNestBack" title="返回">',
            '      ' + icons.back,
            '    </button>',
            '    <div class="nest-room-title">',
            '      <span>' + (charId === 'user_me' ? '我的私人小窝' : '专属空间') + '</span>',
            '    </div>',
            '    <div class="nest-bar-actions">',
            '      <button class="nest-icon-btn" id="btnNestResetCam" title="重置视角">',
            '        ' + icons.resetCamera,
            '      </button>',
            '      <button class="nest-icon-btn" id="btnNestToggleEdit" title="空间编辑">',
            '        ' + icons.edit,
            '      </button>',
            '    </div>',
            '  </div>',
            '  <div id="nestDrawerMount"></div>',
            '</div>'
        ].join('');

        const canvasBox = this.appEl.querySelector('#nest3dCanvas');
        window.RoomEngine.init(canvasBox);

        const drawerMount = this.appEl.querySelector('#nestDrawerMount');
        window.RoomCustomizer.renderDrawer(drawerMount);

        this.appEl.querySelector('#btnNestBack').onclick = () => this.showHub();
        this.appEl.querySelector('#btnNestResetCam').onclick = () => window.RoomEngine.resetCamera();
        
        const drawerEl = this.appEl.querySelector('#nestEditDrawer');
        this.appEl.querySelector('#btnNestToggleEdit').onclick = () => {
            drawerEl.classList.toggle('open');
        };
    },

    enterCoffee() {
        alert('☕ 咖啡厅公共街区正在建设中，角色们稍后将在这里齐聚！');
    }
};

window.openRoomApp = function() {
    window.RoomApp.open();
};
