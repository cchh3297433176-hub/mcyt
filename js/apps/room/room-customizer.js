/**
 * 伴窝 (Nest) - 空间硬装、单表面材质、背景主题与家具工坊管理器 (RoomCustomizer)
 * 纯 SVG 极简 UI，零 Emoji，支持单墙面/地板独立贴图、背景主题切换、真实家具库搜索摆放与改色工坊
 */
window.RoomCustomizer = {
    catalog: [],
    currentSurface: 'backWall', // 'backWall' | 'leftWall' | 'floor'
    cachedActiveRoom: null,
    onSaveCallback: null,

    // 预设调色板（换底色）
    PALETTES: [
        '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6',
        '#10b981', '#84cc16', '#d97706', '#64748b', '#ffffff',
        '#fef08a', '#bbf7d0', '#fed7aa', '#ddd6fe', '#e2e8f0', '#1e293b'
    ],

    initCatalog() {
        if (this.catalog.length > 0) return Promise.resolve(this.catalog);
        return fetch('assets/room/furniture_catalog.json')
            .then(res => res.json())
            .then(data => {
                this.catalog = Array.isArray(data) ? data : [];
                return this.catalog;
            })
            .catch(err => {
                console.warn('[RoomCustomizer] 加载家具目录失败', err);
                this.catalog = [];
                return [];
            });
    },

    renderDrawer(containerEl, activeRoom, onSaveConfig) {
        this.cachedActiveRoom = activeRoom;
        this.onSaveCallback = onSaveConfig;
        const icons = window.RoomIcons;
        const cfg = (activeRoom && activeRoom.config) ? activeRoom.config : window.RoomEngine.config;

        containerEl.innerHTML = `
        <!-- 悬浮选中小物件微调条（当选中家具时浮现） -->
        <div class="nest-furn-action-bar" id="nestFurnActionBar" style="display:none;">
            <div class="furn-bar-info">
                <span class="furn-bar-name" id="selectedFurnName">已选家具</span>
            </div>
            <div class="furn-bar-btns">
                <button class="furn-act-btn" id="btnActRotate" title="旋转45°">
                    ${icons.rotate}
                    <span>旋转</span>
                </button>
                <button class="furn-act-btn" id="btnActColor" title="改色贴图">
                    ${icons.palette}
                    <span>工坊</span>
                </button>
                <button class="furn-act-btn btn-trash" id="btnActDelete" title="删除">
                    ${icons.trash}
                    <span>移除</span>
                </button>
            </div>
        </div>

        <!-- 底部大抽屉 -->
        <div class="nest-edit-drawer" id="nestEditDrawer">
            <div class="nest-drawer-header">
                <div class="drawer-handle" id="btnNestDrawerToggle"></div>
                <div class="drawer-tabs">
                    <button class="drawer-tab active" data-tab="surface">
                        <span class="tab-icon">${icons.paint}</span>
                        <span>墙面地板</span>
                    </button>
                    <button class="drawer-tab" data-tab="furniture">
                        <span class="tab-icon">${icons.furniture}</span>
                        <span>家具布置</span>
                    </button>
                    <button class="drawer-tab" data-tab="size">
                        <span class="tab-icon">${icons.resize}</span>
                        <span>空间背景</span>
                    </button>
                    <button class="drawer-tab" data-tab="export">
                        <span class="tab-icon">${icons.exportJson}</span>
                        <span>布局管理</span>
                    </button>
                </div>
            </div>

            <!-- 面板 1: 单表面定制 (后墙 / 左墙 / 地板 独立切换贴图) -->
            <div class="drawer-panel active" id="panelSurface">
                <div class="nest-surface-subtabs">
                    <button class="surface-subtab active" data-surface="backWall">后主墙面</button>
                    <button class="surface-subtab" data-surface="leftWall">左侧墙面</button>
                    <button class="surface-subtab" data-surface="floor">地板基台</button>
                </div>

                <div class="surface-editor-card">
                    <div class="surface-card-title">
                        <span id="currentSurfaceTitle">后主墙面材质</span>
                        <span class="surface-hint">提示：在 3D 画面中直接点击墙面或地板也可快速选中</span>
                    </div>

                    <div class="mat-actions-bar">
                        <div class="nest-color-picker-wrap">
                            <span class="prop-sublabel">底色</span>
                            <input type="color" id="pickSurfaceColor" value="${cfg.backWallColor || '#f7f4ed'}" class="nest-color-btn"/>
                        </div>

                        <label class="nest-upload-btn">
                            <span class="btn-icon">${icons.upload}</span>
                            <span>导入专属贴图 (PNG/GIF)</span>
                            <input type="file" id="fileSurfaceUpload" accept="image/*" style="display:none;"/>
                        </label>

                        <button class="nest-clear-btn" id="btnClearSurfaceTexture" title="恢复默认纯色">
                            <span>清除贴图</span>
                        </button>
                    </div>

                    <div class="prop-row" style="margin-top: 10px;">
                        <span class="prop-label">贴图平铺密度</span>
                        <input type="range" id="rngSurfaceRepeat" min="1" max="8" step="1" value="${cfg.backWallRepeat || 2}" class="nest-slider"/>
                        <span class="prop-val" id="valSurfaceRepeat">${cfg.backWallRepeat || 2}x</span>
                    </div>
                </div>
            </div>

            <!-- 面板 2: 真实服务器家具库搜索与放置 -->
            <div class="drawer-panel" id="panelFurniture">
                <div class="nest-search-row">
                    <div class="nest-search-box">
                        <span class="search-icon">${icons.search}</span>
                        <input type="text" id="furnSearchInput" placeholder="搜索家具 (如沙发、书桌、植物、地毯...)" class="nest-search-field"/>
                    </div>
                </div>

                <div class="nest-furn-scroll-list" id="furnCatalogGrid">
                    <div class="nest-loading-text">正在装载云端家具库...</div>
                </div>
            </div>

            <!-- 面板 3: 空间尺寸与背景环境主题设置 -->
            <div class="drawer-panel" id="panelSize">
                <div class="mat-section-title">背景环境氛围</div>
                <div class="nest-bg-theme-row">
                    <button class="bg-theme-pill ${cfg.bgTheme === 'warm_sun' ? 'active' : ''}" data-bg="warm_sun">
                        <span class="bg-preview-circle" style="background:#fed7aa;"></span>
                        <span>暖阳日光</span>
                    </button>
                    <button class="bg-theme-pill ${cfg.bgTheme === 'fresh_mint' ? 'active' : ''}" data-bg="fresh_mint">
                        <span class="bg-preview-circle" style="background:#86efac;"></span>
                        <span>清新薄荷</span>
                    </button>
                    <button class="bg-theme-pill ${cfg.bgTheme === 'soft_cyber' ? 'active' : ''}" data-bg="soft_cyber">
                        <span class="bg-preview-circle" style="background:#6366f1;"></span>
                        <span>深空微霓</span>
                    </button>
                    <button class="bg-theme-pill ${cfg.bgTheme === 'cozy_wood' ? 'active' : ''}" data-bg="cozy_wood">
                        <span class="bg-preview-circle" style="background:#e2d7c5;"></span>
                        <span>原木暖米</span>
                    </button>
                    <button class="bg-theme-pill ${cfg.bgTheme === 'pure_dark' ? 'active' : ''}" data-bg="pure_dark">
                        <span class="bg-preview-circle" style="background:#0f172a;"></span>
                        <span>极简曜黑</span>
                    </button>
                </div>

                <div class="mat-section-title" style="margin-top:14px; display:flex; justify-content:space-between; align-items:center;">
                    <span>房间三维体量</span>
                    <button class="nest-grid-toggle-btn" id="btnToggleGrid">
                        ${icons.grid}
                        <span id="gridToggleText">编辑网格: 开</span>
                    </button>
                </div>

                <div class="prop-row">
                    <span class="prop-label">宽度 (X)</span>
                    <input type="range" id="rngWidth" min="4" max="16" step="0.5" value="${cfg.width || 7}" class="nest-slider"/>
                    <span class="prop-val" id="valWidth">${cfg.width || 7}m</span>
                </div>
                <div class="prop-row">
                    <span class="prop-label">进深 (Z)</span>
                    <input type="range" id="rngLength" min="4" max="16" step="0.5" value="${cfg.length || 8}" class="nest-slider"/>
                    <span class="prop-val" id="valLength">${cfg.length || 8}m</span>
                </div>
                <div class="prop-row">
                    <span class="prop-label">挑高 (Y)</span>
                    <input type="range" id="rngHeight" min="2.5" max="6.0" step="0.2" value="${cfg.height || 3.4}" class="nest-slider"/>
                    <span class="prop-val" id="valHeight">${cfg.height || 3.4}m</span>
                </div>
            </div>

            <!-- 面板 4: 布局导出与导入 -->
            <div class="drawer-panel" id="panelExport">
                <div class="export-actions-grid">
                    <button class="nest-action-pill" id="btnExportRoom">
                        <span class="pill-icon">${icons.exportJson}</span>
                        <span>导出当前房间布局 (JSON)</span>
                    </button>
                    <label class="nest-action-pill">
                        <span class="pill-icon">${icons.upload}</span>
                        <span>导入已有布局配置文件</span>
                        <input type="file" id="fileImportRoom" accept=".json" style="display:none;"/>
                    </label>
                </div>
            </div>
        </div>

        <!-- 🎨 家具改色与贴图工坊特写弹层 -->
        <div class="nest-studio-modal" id="nestStudioModal" style="display:none;">
            <div class="nest-studio-box">
                <div class="nest-studio-header">
                    <div class="nest-studio-title">
                        ${icons.palette}
                        <span id="studioFurnTitle">家具换色与贴图工坊</span>
                    </div>
                    <button class="nest-modal-close" id="btnCloseStudio">✕</button>
                </div>

                <div class="nest-studio-body">
                    <!-- 1. 预设整体换色底色 -->
                    <div class="studio-section-label">一键切换整体底色</div>
                    <div class="studio-swatch-grid" id="studioSwatchGrid">
                        ${this.PALETTES.map(hex => `
                            <div class="studio-swatch" style="background:${hex};" data-color="${hex}"></div>
                        `).join('')}
                    </div>

                    <!-- 2. 自由选色器 -->
                    <div class="nest-color-picker-row" style="margin-top:12px;">
                        <span class="studio-subtext">自由拾色：</span>
                        <input type="color" id="studioCustomColorPick" class="nest-color-btn" value="#f59e0b"/>
                    </div>

                    <!-- 3. 导入贴图防拉伸 -->
                    <div class="studio-section-label" style="margin-top:16px;">表面贴图导入 (智能 UV 贴合防畸变)</div>
                    <label class="nest-upload-btn-outline" style="width:100%; justify-content:center; padding:10px;">
                        <span class="btn-icon">${icons.upload}</span>
                        <span>导入图案贴图 (PNG/GIF)</span>
                        <input type="file" id="studioTextureUpload" accept="image/*" style="display:none;"/>
                    </label>
                </div>

                <div class="nest-modal-footer">
                    <button class="nest-btn-confirm" id="btnConfirmStudioDone">
                        ${icons.check}
                        <span>完成并应用</span>
                    </button>
                </div>
            </div>
        </div>
        `;

        this.bindEvents(containerEl);
        this.initCatalog().then(() => this.renderFurnitureCatalog(''));
    },

    bindEvents(containerEl) {
        const drawerEl = containerEl.querySelector('#nestEditDrawer');
        const toggleHandle = containerEl.querySelector('#btnNestDrawerToggle');
        if (toggleHandle) {
            toggleHandle.onclick = () => drawerEl.classList.toggle('open');
        }

        // Tab 切换
        containerEl.querySelectorAll('.drawer-tab').forEach(tab => {
            tab.onclick = () => {
                containerEl.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
                containerEl.querySelectorAll('.drawer-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const targetId = 'panel' + tab.getAttribute('data-tab').replace(/^./, c => c.toUpperCase());
                const target = containerEl.querySelector('#' + targetId);
                if (target) target.classList.add('active');
            };
        });

        // 单表面（后墙、左墙、地板）子 Tab 切换
        containerEl.querySelectorAll('.surface-subtab').forEach(btn => {
            btn.onclick = () => {
                const sType = btn.getAttribute('data-surface');
                this.selectSurface(sType, containerEl);
            };
        });

        // 表面拾色
        const pickColor = containerEl.querySelector('#pickSurfaceColor');
        pickColor.oninput = (e) => {
            const hex = e.target.value;
            window.RoomEngine.updateSurface(this.currentSurface, { color: hex });
            this.syncConfig();
        };

        // 表面贴图上传
        const fileSurface = containerEl.querySelector('#fileSurfaceUpload');
        fileSurface.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                const img = new Image();
                img.onload = () => {
                    const texture = new THREE.Texture(img);
                    const repeat = parseInt(containerEl.querySelector('#rngSurfaceRepeat').value, 10) || 2;
                    window.RoomEngine.updateSurface(this.currentSurface, { texture: texture, repeat: repeat });
                    this.syncConfig();
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        };

        // 表面平铺 Repeat 调节
        const rngRepeat = containerEl.querySelector('#rngSurfaceRepeat');
        const valRepeat = containerEl.querySelector('#valSurfaceRepeat');
        rngRepeat.oninput = (e) => {
            const r = parseInt(e.target.value, 10);
            valRepeat.textContent = r + 'x';
            window.RoomEngine.updateSurface(this.currentSurface, { repeat: r });
            this.syncConfig();
        };

        // 清除表面贴图
        const btnClearTex = containerEl.querySelector('#btnClearSurfaceTexture');
        btnClearTex.onclick = () => {
            window.RoomEngine.updateSurface(this.currentSurface, { texture: null });
            this.syncConfig();
        };

        // 背景主题切换
        containerEl.querySelectorAll('.bg-theme-pill').forEach(pill => {
            pill.onclick = () => {
                containerEl.querySelectorAll('.bg-theme-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const theme = pill.getAttribute('data-bg');
                window.RoomEngine.applyBgTheme(theme);
                this.syncConfig();
            };
        });

        // 网格开关
        const btnToggleGrid = containerEl.querySelector('#btnToggleGrid');
        const gridText = containerEl.querySelector('#gridToggleText');
        btnToggleGrid.onclick = () => {
            const isVisible = window.RoomEngine.toggleGrid();
            gridText.textContent = '编辑网格: ' + (isVisible ? '开' : '关');
            this.syncConfig();
        };

        // 房间尺寸滑条
        const rw = containerEl.querySelector('#rngWidth');
        const rl = containerEl.querySelector('#rngLength');
        const rh = containerEl.querySelector('#rngHeight');
        const vw = containerEl.querySelector('#valWidth');
        const vl = containerEl.querySelector('#valLength');
        const vh = containerEl.querySelector('#valHeight');

        const onSizeInput = () => {
            vw.textContent = rw.value + 'm';
            vl.textContent = rl.value + 'm';
            vh.textContent = rh.value + 'm';
            window.RoomEngine.updateDimensions(rw.value, rl.value, rh.value);
            this.syncConfig();
        };
        rw.oninput = onSizeInput;
        rl.oninput = onSizeInput;
        rh.oninput = onSizeInput;

        // 搜索家具
        const searchInput = containerEl.querySelector('#furnSearchInput');
        searchInput.oninput = (e) => {
            this.renderFurnitureCatalog(e.target.value.trim());
        };

        // 家具微调悬浮条交互
        const actRotate = containerEl.querySelector('#btnActRotate');
        const actColor = containerEl.querySelector('#btnActColor');
        const actDelete = containerEl.querySelector('#btnActDelete');

        actRotate.onclick = () => {
            if (!window.RoomEngine.selectedFurniture) return;
            const currentRot = window.RoomEngine.selectedFurniture.rotation.y;
            window.RoomEngine.updateSelectedFurnitureTransform(undefined, undefined, currentRot + Math.PI / 4);
        };

        actDelete.onclick = () => {
            window.RoomEngine.removeSelectedFurniture();
            this.hideFurnitureActionBar();
            this.syncConfig();
        };

        actColor.onclick = () => {
            this.openStudioModal(containerEl);
        };

        // 3D 引擎回调挂载：当射线点击表面或家具时
        window.RoomEngine.onSurfaceSelectCallback = (sType, sName) => {
            this.selectSurface(sType, containerEl);
            drawerEl.classList.add('open');
            // 切到 surface 面板
            const tabBtn = containerEl.querySelector('.drawer-tab[data-tab="surface"]');
            if (tabBtn) tabBtn.click();
        };

        window.RoomEngine.onFurnitureSelectCallback = (instance) => {
            this.showFurnitureActionBar(instance);
        };

        window.RoomEngine.onFurnitureChangeCallback = () => {
            this.syncConfig();
        };

        // 绑定工坊弹层事件
        this.bindStudioEvents(containerEl);

        // 导出 / 导入
        containerEl.querySelector('#btnExportRoom').onclick = () => this.exportLayout();
        containerEl.querySelector('#fileImportRoom').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = JSON.parse(evt.target.result);
                    this.importLayout(data);
                    this.syncConfig();
                } catch (err) {
                    alert('导入失败：非有效伴窝配置 JSON！');
                }
            };
            reader.readAsText(file);
        };
    },

    selectSurface(sType, containerEl) {
        this.currentSurface = sType;
        containerEl.querySelectorAll('.surface-subtab').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-surface') === sType);
        });

        const titleEl = containerEl.querySelector('#currentSurfaceTitle');
        const names = { backWall: '后主墙面材质', leftWall: '左侧墙面材质', floor: '地板基台材质' };
        if (titleEl) titleEl.textContent = names[sType] || '表面材质定制';

        // 回显该表面的当前颜色
        const cfg = window.RoomEngine.config;
        const colorInput = containerEl.querySelector('#pickSurfaceColor');
        if (sType === 'floor' && colorInput) colorInput.value = cfg.floorColor || '#e0d2be';
        if (sType === 'backWall' && colorInput) colorInput.value = cfg.backWallColor || '#f7f4ed';
        if (sType === 'leftWall' && colorInput) colorInput.value = cfg.leftWallColor || '#f7f4ed';

        window.RoomEngine.highlightSurface(sType);
    },

    renderFurnitureCatalog(query) {
        const grid = document.querySelector('#furnCatalogGrid');
        if (!grid) return;
        let list = this.catalog;
        if (query) {
            const q = query.toLowerCase();
            list = list.filter(f => (f.name && f.name.toLowerCase().includes(q)) || (f.scene && f.scene.toLowerCase().includes(q)));
        }

        if (list.length === 0) {
            grid.innerHTML = '<div class="nest-loading-text">未找到匹配的家具</div>';
            return;
        }

        grid.innerHTML = list.slice(0, 80).map(item => `
            <div class="nest-furn-card" data-file="${item.file}" data-name="${item.name}">
                <div class="furn-card-icon-box">
                    <span class="chip-svg-icon">${window.RoomIcons.furniture}</span>
                </div>
                <div class="furn-card-name">${item.name}</div>
                <div class="furn-card-scene">${item.scene || '专属摆件'}</div>
            </div>
        `).join('');

        grid.querySelectorAll('.nest-furn-card').forEach(card => {
            card.onclick = () => {
                const modelFile = card.getAttribute('data-file');
                const name = card.getAttribute('data-name');
                const furnData = {
                    id: 'furn_' + Date.now(),
                    modelFile: modelFile,
                    name: name,
                    x: (Math.random() - 0.5) * 3,
                    y: 0,
                    z: (Math.random() - 0.5) * 3,
                    rotY: 0,
                    scale: 1.0,
                    color: null,
                    textureDataUrl: null
                };
                window.RoomEngine.spawnFurniture(furnData, true);
                this.syncConfig();
            };
        });
    },

    showFurnitureActionBar(instance) {
        const bar = document.getElementById('nestFurnActionBar');
        if (!bar) return;
        const nameEl = document.getElementById('selectedFurnName');
        if (nameEl) nameEl.textContent = instance.userData?.name || '已选家具';
        bar.style.display = 'flex';
    },

    hideFurnitureActionBar() {
        const bar = document.getElementById('nestFurnActionBar');
        if (bar) bar.style.display = 'none';
    },

    openStudioModal(containerEl) {
        const modal = containerEl.querySelector('#nestStudioModal');
        const inst = window.RoomEngine.selectedFurniture;
        if (!inst || !modal) return;
        const titleEl = containerEl.querySelector('#studioFurnTitle');
        if (titleEl) titleEl.textContent = '工坊 · ' + (inst.userData?.name || '家具');
        modal.style.display = 'flex';
    },

    bindStudioEvents(containerEl) {
        const modal = containerEl.querySelector('#nestStudioModal');
        const btnClose = containerEl.querySelector('#btnCloseStudio');
        const btnDone = containerEl.querySelector('#btnConfirmStudioDone');
        const colorPick = containerEl.querySelector('#studioCustomColorPick');
        const texUpload = containerEl.querySelector('#studioTextureUpload');

        const closeModal = () => { modal.style.display = 'none'; };
        if (btnClose) btnClose.onclick = closeModal;
        if (btnDone) btnDone.onclick = closeModal;

        // 预设色板点击一键改色
        containerEl.querySelectorAll('.studio-swatch').forEach(sw => {
            sw.onclick = () => {
                const color = sw.getAttribute('data-color');
                const inst = window.RoomEngine.selectedFurniture;
                if (!inst) return;
                inst.traverse(c => {
                    if (c.isMesh && c.material) {
                        c.material.color.set(color);
                        c.material.needsUpdate = true;
                    }
                });
                inst.userData.color = color;
                this.syncConfig();
            };
        });

        // 自由拾色
        if (colorPick) {
            colorPick.oninput = (e) => {
                const color = e.target.value;
                const inst = window.RoomEngine.selectedFurniture;
                if (!inst) return;
                inst.traverse(c => {
                    if (c.isMesh && c.material) {
                        c.material.color.set(color);
                        c.material.needsUpdate = true;
                    }
                });
                inst.userData.color = color;
                this.syncConfig();
            };
        }

        // 贴图导入防拉伸
        if (texUpload) {
            texUpload.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const inst = window.RoomEngine.selectedFurniture;
                if (!inst) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    window.RoomEngine.applyTextureToInstance(inst, evt.target.result);
                    this.syncConfig();
                };
                reader.readAsDataURL(file);
            };
        }
    },

    syncConfig() {
        const engineCfg = window.RoomEngine.config;
        const currentFurniture = window.RoomEngine.exportCurrentFurnitureData();

        const updated = Object.assign({}, engineCfg, {
            furniture: currentFurniture
        });

        if (this.onSaveCallback) {
            this.onSaveCallback(updated);
        }
    },

    exportLayout() {
        const layoutData = {
            app: 'Nest-Room',
            version: '2.0.0',
            exportedAt: new Date().toISOString(),
            config: Object.assign({}, window.RoomEngine.config, {
                furniture: window.RoomEngine.exportCurrentFurnitureData()
            })
        };

        const blob = new Blob([JSON.stringify(layoutData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '伴窝房间布局_' + Date.now() + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    importLayout(data) {
        if (!data || !data.config) return;
        const cfg = data.config;
        window.RoomEngine.config = Object.assign({}, window.RoomEngine.config, cfg);
        window.RoomEngine.buildRoom();
        if (cfg.bgTheme) window.RoomEngine.applyBgTheme(cfg.bgTheme);
        if (cfg.furniture) window.RoomEngine.loadFurnitureList(cfg.furniture);
        alert('房间布局配置导入成功！');
    }
};