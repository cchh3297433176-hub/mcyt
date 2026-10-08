/**
 * 伴窝 (Nest) - 3D 渲染与交互内核 (RoomEngine)
 * 职责：
 * 1. 墙面、地面具备真实立体厚度（3D 厚板与收口踢脚梁）；
 * 2. 射线拾取交互：支持单个点击“后墙”、“左墙”或“地板”以单独导入贴图/改色；
 * 3. 背景环境自由设置（暖阳日光、薄荷绿意、柔和赛博、原木暖米、极简曜黑等渐变与自定义背景）；
 * 4. 40×40 地面格子辅助线（GridHelper）；
 * 5. 成熟家具库载入、地面网格吸附摆放、选中高亮轮盘、旋转、高度、缩放微调与改色贴图工坊对接。
 */
window.RoomEngine = {
    container: null,
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    roomGroup: null,
    furnitureGroup: null,
    gridHelper: null,

    // 当前配置
    config: {
        width: 7,
        length: 8,
        height: 3.4,
        bgTheme: 'warm_sun',
        bgColor: '#1a1f2c',
        backWallColor: '#f7f4ed',
        backWallTexture: null,
        backWallRepeat: 2,
        leftWallColor: '#f7f4ed',
        leftWallTexture: null,
        leftWallRepeat: 2,
        floorColor: '#e0d2be',
        floorTexture: null,
        floorRepeat: 4,
        showGrid: true,
        furniture: []
    },

    // 交互拾取
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2(),
    surfaceMeshes: {}, // { backWall, leftWall, floor }
    selectedSurface: null, // 'backWall' | 'leftWall' | 'floor' | null
    selectedFurniture: null, // 当前选中的家具 Group/Mesh
    furnitureInstances: [],

    // 表面高光线框
    surfaceHighlightMesh: null,
    furnitureRingMesh: null,

    // 回调事件
    onSurfaceSelectCallback: null,
    onFurnitureSelectCallback: null,
    onFurnitureChangeCallback: null,

    init(containerEl, initialConfig = {}) {
        this.destroy();
        this.container = containerEl;
        this.config = Object.assign({}, this.config, initialConfig);

        const w = containerEl.clientWidth || window.innerWidth;
        const h = containerEl.clientHeight || window.innerHeight;

        this.scene = new THREE.Scene();
        this.applyBgTheme(this.config.bgTheme);

        this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 120);
        this.camera.position.set(7.5, 6.2, 8.8);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        containerEl.appendChild(this.renderer.domElement);

        if (window.THREE.OrbitControls) {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.maxPolarAngle = Math.PI / 2.08;
            this.controls.minDistance = 2.5;
            this.controls.maxDistance = 22.0;
            this.controls.target.set(0, 1.2, 0);
        }

        this.setupLights();
        this.buildRoom();
        this.loadFurnitureList(this.config.furniture || []);
        this.bindRaycasterEvents();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        window.addEventListener('resize', () => this.onResize());
    },

    /**
     * 设置环境光照
     */
    setupLights() {
        const hemiLight = new THREE.HemisphereLight(0xfffaea, 0x93a388, 1.2);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.4);
        dirLight.position.set(10, 15, 8);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(1024, 1024);
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);

        const fillLight = new THREE.PointLight(0xffe8d1, 0.7, 18);
        fillLight.position.set(0, 3.2, 0);
        this.scene.add(fillLight);
    },

    /**
     * 切换场景背景主题（不再死黑，提供清新与高级色调）
     */
    applyBgTheme(themeKey) {
        if (!this.scene) return;
        this.config.bgTheme = themeKey;
        const c = this.container;
        if (!c) return;

        const presets = {
            warm_sun: 'radial-gradient(circle at 50% 30%, #fef3c7 0%, #fed7aa 45%, #fdba74 100%)',
            fresh_mint: 'radial-gradient(circle at 50% 35%, #dcfce7 0%, #bbf7d0 50%, #86efac 100%)',
            soft_cyber: 'radial-gradient(circle at 50% 30%, #312e81 0%, #1e1b4b 60%, #0f172a 100%)',
            cozy_wood: 'radial-gradient(circle at 50% 30%, #fdfbf7 0%, #f3eee3 60%, #e2d7c5 100%)',
            pure_dark: 'radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 70%, #020617 100%)'
        };

        c.style.background = presets[themeKey] || presets.warm_sun;
        this.scene.background = null; // 透明背景以便 CSS 渐变穿透显示
    },

    /**
     * 建造具备厚度与质感的立体 3D 房间
     */
    buildRoom() {
        if (this.roomGroup) this.scene.remove(this.roomGroup);
        this.roomGroup = new THREE.Group();
        this.surfaceMeshes = {};

        const { width, length, height } = this.config;
        const wallThick = 0.28;
        const floorThick = 0.32;

        // 1. 立体地板（厚度 0.32m）
        const floorMat = this.createSurfaceMaterial(
            this.config.floorColor || '#e0d2be',
            this.config.floorTexture,
            this.config.floorRepeat || 4
        );
        const floorGeo = new THREE.BoxGeometry(width, floorThick, length);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.set(0, -floorThick / 2, 0);
        floor.receiveShadow = true;
        floor.userData = { isSurface: true, surfaceType: 'floor', name: '地板' };
        this.roomGroup.add(floor);
        this.surfaceMeshes.floor = floor;

        // 2. 40×40 地面格子辅助网格
        if (this.gridHelper) this.scene.remove(this.gridHelper);
        this.gridHelper = new THREE.GridHelper(Math.max(width, length), 30, 0x10b981, 0xd1d5db);
        this.gridHelper.position.y = 0.005;
        this.gridHelper.material.opacity = 0.55;
        this.gridHelper.material.transparent = true;
        this.gridHelper.visible = !!this.config.showGrid;
        this.roomGroup.add(this.gridHelper);

        // 3. 立体后墙（厚度 0.28m）
        const backWallMat = this.createSurfaceMaterial(
            this.config.backWallColor || '#f7f4ed',
            this.config.backWallTexture,
            this.config.backWallRepeat || 2
        );
        const backWallGeo = new THREE.BoxGeometry(width, height, wallThick);
        const backWall = new THREE.Mesh(backWallGeo, backWallMat);
        backWall.position.set(0, height / 2, -length / 2 - wallThick / 2);
        backWall.receiveShadow = true;
        backWall.userData = { isSurface: true, surfaceType: 'backWall', name: '后主墙面' };
        this.roomGroup.add(backWall);
        this.surfaceMeshes.backWall = backWall;

        // 4. 立体左墙（厚度 0.28m）
        const leftWallMat = this.createSurfaceMaterial(
            this.config.leftWallColor || '#f7f4ed',
            this.config.leftWallTexture,
            this.config.leftWallRepeat || 2
        );
        const leftWallGeo = new THREE.BoxGeometry(wallThick, height, length + wallThick);
        const leftWall = new THREE.Mesh(leftWallGeo, leftWallMat);
        leftWall.position.set(-width / 2 - wallThick / 2, height / 2, -wallThick / 2);
        leftWall.receiveShadow = true;
        leftWall.userData = { isSurface: true, surfaceType: 'leftWall', name: '左侧墙面' };
        this.roomGroup.add(leftWall);
        this.surfaceMeshes.leftWall = leftWall;

        // 5. 顶部立体装饰横梁与原木踢脚线
        const trimMat = new THREE.MeshStandardMaterial({ color: 0x4a3b32, roughness: 0.6 });
        const trimBack = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 0.12, 0.06), trimMat);
        trimBack.position.set(0, 0.06, -length / 2 + 0.03);
        this.roomGroup.add(trimBack);

        const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, length + 0.1), trimMat);
        trimLeft.position.set(-width / 2 + 0.03, 0.06, 0);
        this.roomGroup.add(trimLeft);

        this.scene.add(this.roomGroup);

        // 如果之前有选中表面，重新挂载指示框
        if (this.selectedSurface) {
            this.highlightSurface(this.selectedSurface);
        }
    },

    createSurfaceMaterial(colorHex, textureObj, repeatCount = 2) {
        const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(colorHex),
            roughness: 0.82,
            metalness: 0.05
        });
        if (textureObj) {
            textureObj.wrapS = THREE.RepeatWrapping;
            textureObj.wrapT = THREE.RepeatWrapping;
            textureObj.repeat.set(repeatCount, repeatCount);
            textureObj.needsUpdate = true;
            mat.map = textureObj;
        }
        return mat;
    },

    toggleGrid(visible) {
        this.config.showGrid = (visible !== undefined) ? visible : !this.config.showGrid;
        if (this.gridHelper) {
            this.gridHelper.visible = this.config.showGrid;
        }
        return this.config.showGrid;
    },

    /**
     * 单个表面高光指示线框
     */
    highlightSurface(surfaceKey) {
        this.clearSurfaceHighlight();
        this.selectedSurface = surfaceKey;
        const mesh = this.surfaceMeshes[surfaceKey];
        if (!mesh) return;

        const box = new THREE.BoxHelper(mesh, 0x10b981);
        box.material.linewidth = 3;
        box.material.depthTest = false;
        box.material.transparent = true;
        box.material.opacity = 0.9;
        this.surfaceHighlightMesh = box;
        this.scene.add(box);
    },

    clearSurfaceHighlight() {
        if (this.surfaceHighlightMesh) {
            this.scene.remove(this.surfaceHighlightMesh);
            this.surfaceHighlightMesh = null;
        }
        this.selectedSurface = null;
    },

    /**
     * 更新表面材质（颜色或贴图）
     */
    updateSurface(surfaceKey, options = {}) {
        const { color, texture, repeat } = options;
        if (surfaceKey === 'floor') {
            if (color) this.config.floorColor = color;
            if (texture !== undefined) this.config.floorTexture = texture;
            if (repeat) this.config.floorRepeat = repeat;
        } else if (surfaceKey === 'backWall') {
            if (color) this.config.backWallColor = color;
            if (texture !== undefined) this.config.backWallTexture = texture;
            if (repeat) this.config.backWallRepeat = repeat;
        } else if (surfaceKey === 'leftWall') {
            if (color) this.config.leftWallColor = color;
            if (texture !== undefined) this.config.leftWallTexture = texture;
            if (repeat) this.config.leftWallRepeat = repeat;
        }
        this.buildRoom();
    },

    // ──────────────────────────── 家具载入与操作 ────────────────────────────

    loadFurnitureList(furnitureList) {
        if (this.furnitureGroup) this.scene.remove(this.furnitureGroup);
        this.furnitureGroup = new THREE.Group();
        this.scene.add(this.furnitureGroup);
        this.furnitureInstances = [];

        furnitureList.forEach(item => {
            this.spawnFurniture(item, false);
        });
    },

    spawnFurniture(furnData, shouldSelect = true) {
        if (!furnData || !furnData.modelFile) return;
        const loader = new THREE.GLTFLoader ? new THREE.GLTFLoader() : (window.GLTFLoader ? new window.GLTFLoader() : null);
        if (!loader) {
            console.warn('[RoomEngine] 未找到 GLTFLoader 驱动');
            return;
        }

        const modelUrl = 'assets/room/furniture/' + furnData.modelFile;
        loader.load(modelUrl, (gltf) => {
            const root = gltf.scene || gltf.scenes[0];
            root.userData = Object.assign({}, furnData, {
                isFurniture: true,
                instId: furnData.id || ('furn_' + Date.now() + '_' + Math.floor(Math.random() * 1000))
            });

            // 尺寸计算与阴影
            root.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                    if (furnData.color && c.material) {
                        c.material.color.set(furnData.color);
                    }
                }
            });

            const scale = furnData.scale || 1.0;
            root.scale.set(scale, scale, scale);
            root.position.set(furnData.x || 0, furnData.y || 0, furnData.z || 0);
            root.rotation.y = furnData.rotY || 0;

            this.furnitureGroup.add(root);
            this.furnitureInstances.push(root);

            if (furnData.textureDataUrl) {
                this.applyTextureToInstance(root, furnData.textureDataUrl);
            }

            if (shouldSelect) {
                this.selectFurniture(root);
                if (this.onFurnitureChangeCallback) this.onFurnitureChangeCallback();
            }
        }, undefined, (err) => {
            console.warn('[RoomEngine] 加载家具 GLB 失败:', modelUrl, err);
        });
    },

    selectFurniture(instance) {
        this.clearFurnitureSelection();
        this.selectedFurniture = instance;
        if (!instance) return;

        // 绿色高光底圈
        const ringGeo = new THREE.RingGeometry(0.6, 0.72, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, depthTest: false });
        this.furnitureRingMesh = new THREE.Mesh(ringGeo, ringMat);
        this.furnitureRingMesh.position.set(instance.position.x, 0.02, instance.position.z);
        this.scene.add(this.furnitureRingMesh);

        if (this.onFurnitureSelectCallback) {
            this.onFurnitureSelectCallback(instance);
        }
    },

    clearFurnitureSelection() {
        if (this.furnitureRingMesh) {
            this.scene.remove(this.furnitureRingMesh);
            this.furnitureRingMesh = null;
        }
        this.selectedFurniture = null;
    },

    updateSelectedFurnitureTransform(x, z, rotY, scaleFactor, height) {
        if (!this.selectedFurniture) return;
        const inst = this.selectedFurniture;
        if (x !== undefined && z !== undefined) {
            inst.position.x = x;
            inst.position.z = z;
            if (this.furnitureRingMesh) {
                this.furnitureRingMesh.position.x = x;
                this.furnitureRingMesh.position.z = z;
            }
        }
        if (rotY !== undefined) inst.rotation.y = rotY;
        if (scaleFactor !== undefined) inst.scale.set(scaleFactor, scaleFactor, scaleFactor);
        if (height !== undefined) inst.position.y = height;

        if (this.onFurnitureChangeCallback) this.onFurnitureChangeCallback();
    },

    removeSelectedFurniture() {
        if (!this.selectedFurniture) return;
        const inst = this.selectedFurniture;
        this.furnitureGroup.remove(inst);
        this.furnitureInstances = this.furnitureInstances.filter(i => i !== inst);
        this.clearFurnitureSelection();
        if (this.onFurnitureChangeCallback) this.onFurnitureChangeCallback();
    },

    /**
     * 智能 6 向三维无缝展开贴图（防 UV 拉伸与畸变）
     */
    applyTextureToInstance(instance, textureUrl) {
        const img = new Image();
        img.onload = () => {
            const tex = new THREE.Texture(img);
            tex.wrapS = THREE.RepeatWrapping;
            tex.wrapT = THREE.RepeatWrapping;
            tex.needsUpdate = true;

            instance.traverse(c => {
                if (c.isMesh && c.geometry) {
                    this.triplanarUnwrapGeometry(c);
                    if (c.material) {
                        c.material.map = tex;
                        c.material.needsUpdate = true;
                    }
                }
            });
            instance.userData.textureDataUrl = textureUrl;
            if (this.onFurnitureChangeCallback) this.onFurnitureChangeCallback();
        };
        img.src = textureUrl;
    },

    triplanarUnwrapGeometry(mesh) {
        let geom = mesh.geometry;
        if (!geom || !geom.attributes.position) return;
        const nonIndexed = geom.toNonIndexed ? geom.toNonIndexed() : geom;
        const pAttr = nonIndexed.attributes.position;
        const count = pAttr.count;
        const numFaces = Math.floor(count / 3);

        nonIndexed.computeBoundingBox();
        const bmin = nonIndexed.boundingBox.min;
        const bmax = nonIndexed.boundingBox.max;
        const bsize = new THREE.Vector3().subVectors(bmax, bmin);
        if (bsize.x < 1e-4) bsize.x = 1.0;
        if (bsize.y < 1e-4) bsize.y = 1.0;
        if (bsize.z < 1e-4) bsize.z = 1.0;

        const newUvs = new Float32Array(count * 2);
        const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
        const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), fn = new THREE.Vector3();

        for (let fi = 0; fi < numFaces; fi++) {
            v0.fromBufferAttribute(pAttr, fi * 3);
            v1.fromBufferAttribute(pAttr, fi * 3 + 1);
            v2.fromBufferAttribute(pAttr, fi * 3 + 2);
            e1.subVectors(v1, v0);
            e2.subVectors(v2, v0);
            fn.crossVectors(e1, e2).normalize();

            // 投影至最匹配的主轴
            const nx = Math.abs(fn.x), ny = Math.abs(fn.y), nz = Math.abs(fn.z);
            for (let k = 0; k < 3; k++) {
                const vert = (k === 0) ? v0 : (k === 1 ? v1 : v2);
                let u = 0, v = 0;
                if (ny >= nx && ny >= nz) {
                    u = (vert.x - bmin.x) / bsize.x;
                    v = (vert.z - bmin.z) / bsize.z;
                } else if (nx >= ny && nx >= nz) {
                    u = (vert.z - bmin.z) / bsize.z;
                    v = (vert.y - bmin.y) / bsize.y;
                } else {
                    u = (vert.x - bmin.x) / bsize.x;
                    v = (vert.y - bmin.y) / bsize.y;
                }
                const idx = (fi * 3 + k) * 2;
                newUvs[idx] = u;
                newUvs[idx + 1] = v;
            }
        }

        nonIndexed.setAttribute('uv', new THREE.BufferAttribute(newUvs, 2));
        nonIndexed.computeVertexNormals();
        mesh.geometry = nonIndexed;
    },

    // ──────────────────────────── 射线检测拾取 ────────────────────────────

    bindRaycasterEvents() {
        const dom = this.renderer.domElement;
        let startX = 0, startY = 0;

        dom.addEventListener('pointerdown', (e) => {
            startX = e.clientX;
            startY = e.clientY;
        });

        dom.addEventListener('pointerup', (e) => {
            const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
            if (dist > 6) return; // 判定为镜头旋转拖动，不触发点选

            const rect = dom.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);

            // 1. 优先检测家具
            if (this.furnitureInstances.length > 0) {
                const furnHits = this.raycaster.intersectObjects(this.furnitureInstances, true);
                if (furnHits.length > 0) {
                    let root = furnHits[0].object;
                    while (root && root.parent && !root.userData?.isFurniture) {
                        root = root.parent;
                    }
                    if (root && root.userData?.isFurniture) {
                        this.clearSurfaceHighlight();
                        this.selectFurniture(root);
                        return;
                    }
                }
            }

            // 2. 检测墙面与地板
            const surfaceList = Object.values(this.surfaceMeshes);
            const hits = this.raycaster.intersectObjects(surfaceList, false);
            if (hits.length > 0) {
                const hitObj = hits[0].object;
                const sType = hitObj.userData.surfaceType;
                this.clearFurnitureSelection();
                this.highlightSurface(sType);
                if (this.onSurfaceSelectCallback) {
                    this.onSurfaceSelectCallback(sType, hitObj.userData.name);
                }
            } else {
                this.clearSurfaceHighlight();
                this.clearFurnitureSelection();
            }
        });
    },

    exportCurrentFurnitureData() {
        return this.furnitureInstances.map(inst => {
            return {
                id: inst.userData.instId,
                modelFile: inst.userData.modelFile,
                name: inst.userData.name,
                x: parseFloat(inst.position.x.toFixed(2)),
                y: parseFloat(inst.position.y.toFixed(2)),
                z: parseFloat(inst.position.z.toFixed(2)),
                rotY: parseFloat(inst.rotation.y.toFixed(2)),
                scale: parseFloat(inst.scale.x.toFixed(2)),
                color: inst.userData.color || null,
                textureDataUrl: inst.userData.textureDataUrl || null
            };
        });
    },

    updateDimensions(w, l, h) {
        if (w) this.config.width = parseFloat(w);
        if (l) this.config.length = parseFloat(l);
        if (h) this.config.height = parseFloat(h);
        this.buildRoom();
    },

    resetCamera() {
        if (!this.controls) return;
        this.camera.position.set(7.5, 6.2, 8.8);
        this.controls.target.set(0, 1.2, 0);
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
        this.surfaceMeshes = {};
        this.furnitureInstances = [];
    }
};