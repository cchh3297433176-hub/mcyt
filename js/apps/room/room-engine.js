/**
 * 伴窝 (Nest) - 纯净初始房间 3D 渲染内核
 * 动态长/宽/高网格生成，拒绝冗余大平层，适配手机端放大特写
 */
window.RoomEngine = {
    container: null,
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    roomGroup: null,

    config: {
        width: 6,
        length: 7,
        height: 3.2,
        wallColor: '#f7f4ed',
        floorColor: '#e0d2be',
        wallTexture: null,
        floorTexture: null
    },

    init(containerEl) {
        this.container = containerEl;
        const w = containerEl.clientWidth || window.innerWidth;
        const h = containerEl.clientHeight || window.innerHeight;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x12141a);

        this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
        this.camera.position.set(5.5, 4.2, 6.5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        containerEl.appendChild(this.renderer.domElement);

        if (window.THREE.OrbitControls) {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.maxPolarAngle = Math.PI / 2.05;
            this.controls.minDistance = 3.0;
            this.controls.maxDistance = 15.0;
            this.controls.target.set(0, 1.0, 0);
        }

        this.setupLights();
        this.buildRoom();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        window.addEventListener('resize', () => this.onResize());
    },

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xfff6ea, 0.9);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffedd6, 1.4);
        mainLight.position.set(6, 9, 5);
        mainLight.castShadow = true;
        this.scene.add(mainLight);

        const softFill = new THREE.PointLight(0xffe8d6, 0.6, 12);
        softFill.position.set(0, 2.5, 0);
        this.scene.add(softFill);
    },

    buildRoom() {
        if (this.roomGroup) this.scene.remove(this.roomGroup);
        this.roomGroup = new THREE.Group();

        const { width, length, height, wallColor, floorColor } = this.config;

        const floorMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(floorColor),
            roughness: 0.7,
            metalness: 0.05
        });
        if (this.config.floorTexture) floorMat.map = this.config.floorTexture;

        const floorGeo = new THREE.PlaneGeometry(width, length);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.roomGroup.add(floor);

        const wallMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(wallColor),
            roughness: 0.85
        });
        if (this.config.wallTexture) wallMat.map = this.config.wallTexture;

        const backWallGeo = new THREE.PlaneGeometry(width, height);
        const backWall = new THREE.Mesh(backWallGeo, wallMat);
        backWall.position.set(0, height / 2, -length / 2);
        backWall.receiveShadow = true;
        this.roomGroup.add(backWall);

        const leftWallGeo = new THREE.PlaneGeometry(length, height);
        const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.position.set(-width / 2, height / 2, 0);
        leftWall.receiveShadow = true;
        this.roomGroup.add(leftWall);

        const trimMat = new THREE.MeshStandardMaterial({ color: 0x4a3b32, roughness: 0.5 });
        const trimGeo = new THREE.BoxGeometry(width, 0.08, 0.04);
        const trimBack = new THREE.Mesh(trimGeo, trimMat);
        trimBack.position.set(0, 0.04, -length / 2 + 0.02);
        this.roomGroup.add(trimBack);

        this.scene.add(this.roomGroup);
    },

    updateDimensions(w, l, h) {
        if (w) this.config.width = parseFloat(w);
        if (l) this.config.length = parseFloat(l);
        if (h) this.config.height = parseFloat(h);
        this.buildRoom();
    },

    setWallTexture(texture) {
        this.config.wallTexture = texture;
        this.buildRoom();
    },

    setFloorTexture(texture) {
        this.config.floorTexture = texture;
        this.buildRoom();
    },

    resetCamera() {
        if (!this.controls) return;
        this.camera.position.set(5.5, 4.2, 6.5);
        this.controls.target.set(0, 1.0, 0);
        this.controls.update();
    },

    onResize() {
        if (!this.container || !this.renderer || !this.camera) return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    },

    animate() {
        this.animId = requestAnimationFrame(this.animate);
        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    },

    destroy() {
        if (this.animId) cancelAnimationFrame(this.animId);
        if (this.renderer && this.renderer.domElement) {
            this.renderer.domElement.remove();
        }
    }
};
