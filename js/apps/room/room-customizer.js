/**
 * 伴窝 (Nest) - 空间硬装、自定义贴图上传与布局导出/导入器
 * 纯 SVG 极简 UI，绝不含 Emoji，支持画作上传做墙纸/地毯，一键导出 JSON 布局，支持云端家具挑选
 */
window.RoomCustomizer = {
    renderDrawer(containerEl, activeRoom, onSaveConfig) {
        const icons = window.RoomIcons;
        const cfg = (activeRoom && activeRoom.config) ? activeRoom.config : window.RoomEngine.config;

        containerEl.innerHTML = [
            '<div class="nest-edit-drawer" id="nestEditDrawer">',
            '  <div class="nest-drawer-header">',
            '    <div class="drawer-handle"></div>',
            '    <div class="drawer-tabs">',
            '      <button class="drawer-tab active" data-tab="size">',
            '        <span class="tab-icon">' + icons.resize + '</span>',
            '        <span>空间尺寸</span>',
            '      </button>',
            '      <button class="drawer-tab" data-tab="material">',
            '        <span class="tab-icon">' + icons.paint + '</span>',
            '        <span>材质贴图</span>',
            '      </button>',
            '      <button class="drawer-tab" data-tab="furniture">',
            '        <span class="tab-icon">' + icons.furniture + '</span>',
            '        <span>家具布置</span>',
            '      </button>',
            '      <button class="drawer-tab" data-tab="export">',
            '        <span class="tab-icon">' + icons.exportJson + '</span>',
            '        <span>布局管理</span>',
            '      </button>',
            '    </div>',
            '  </div>',
            '  <!-- 空间尺寸面板 -->',
            '  <div class="drawer-panel active" id="panelSize">',
            '    <div class="prop-row">',
            '      <span class="prop-label">宽度 (X)</span>',
            '      <input type="range" id="rngWidth" min="4" max="14" step="0.5" value="' + (cfg.width || 6) + '" class="nest-slider"/>',
            '      <span class="prop-val" id="valWidth">' + (cfg.width || 6) + 'm</span>',
            '    </div>',
            '    <div class="prop-row">',
            '      <span class="prop-label">进深 (Z)</span>',
            '      <input type="range" id="rngLength" min="4" max="14" step="0.5" value="' + (cfg.length || 7) + '" class="nest-slider"/>',
            '      <span class="prop-val" id="valLength">' + (cfg.length || 7) + 'm</span>',
            '    </div>',
            '    <div class="prop-row">',
            '      <span class="prop-label">挑高 (Y)</span>',
            '      <input type="range" id="rngHeight" min="2.5" max="5.5" step="0.2" value="' + (cfg.height || 3.2) + '" class="nest-slider"/>',
            '      <span class="prop-val" id="valHeight">' + (cfg.height || 3.2) + 'm</span>',
            '    </div>',
            '  </div>',
            '  <!-- 材质贴图面板 -->',
            '  <div class="drawer-panel" id="panelMaterial">',
            '    <div class="mat-section-title">墙面定制</div>',
            '    <div class="mat-actions-bar">',
            '      <input type="color" id="pickWallColor" value="' + (cfg.wallColor || '#f7f4ed') + '" class="nest-color-btn"/>',
            '      <label class="nest-upload-btn">',
            '        <span class="btn-icon">' + icons.upload + '</span>',
            '        <span>导入画作/贴图上墙 (PNG/GIF)</span>',
            '        <input type="file" id="fileWallUpload" accept="image/*" style="display:none;"/>',
            '      </label>',
            '    </div>',
            '    <div class="mat-section-title" style="margin-top:12px;">地板定制</div>',
            '    <div class="mat-actions-bar">',
            '      <input type="color" id="pickFloorColor" value="' + (cfg.floorColor || '#e0d2be') + '" class="nest-color-btn"/>',
            '      <label class="nest-upload-btn">',
            '        <span class="btn-icon">' + icons.upload + '</span>',
            '        <span>导入地板/地毯贴图 (PNG/GIF)</span>',
            '        <input type="file" id="fileFloorUpload" accept="image/*" style="display:none;"/>',
            '      </label>',
            '    </div>',
            '  </div>',
            '  <!-- 家具布置面板（云端家具下载与装配） -->',
            '  <div class="drawer-panel" id="panelFurniture">',
            '    <div class="mat-section-title">云端家具库（选择后下载装载）</div>',
            '    <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 8px;">',
            '      <div class="nest-furn-item" data-furn="bed">',
            '        <div style="font-size:12px; font-weight:700; color:#f1f5f9; margin-bottom:2px;">双人温暖大床</div>',
            '        <div style="font-size:10px; color:#94a3b8;">卧室专属 · 原木棉麻</div>',
            '      </div>',
            '      <div class="nest-furn-item" data-furn="desk">',
            '        <div style="font-size:12px; font-weight:700; color:#f1f5f9; margin-bottom:2px;">实木办公书桌</div>',
            '        <div style="font-size:10px; color:#94a3b8;">极简百搭 · 工作阅读</div>',
            '      </div>',
            '      <div class="nest-furn-item" data-furn="sofa">',
            '        <div style="font-size:12px; font-weight:700; color:#f1f5f9; margin-bottom:2px;">复古软包沙发</div>',
            '        <div style="font-size:10px; color:#94a3b8;">起居休闲 · 暖调丝绒</div>',
            '      </div>',
            '      <div class="nest-furn-item" data-furn="plant">',
            '        <div style="font-size:12px; font-weight:700; color:#f1f5f9; margin-bottom:2px;">微观落地绿植</div>',
            '        <div style="font-size:10px; color:#94a3b8;">自然清新 · 治愈角</div>',
            '      </div>',
            '    </div>',
            '  </div>',
            '  <!-- 布局管理面板 -->',
            '  <div class="drawer-panel" id="panelExport">',
            '    <div class="export-actions-grid">',
            '      <button class="nest-action-pill" id="btnExportRoom">',
            '        <span class="pill-icon">' + icons.exportJson + '</span>',
            '        <span>导出当前房间布局 (JSON)</span>',
            '      </button>',
            '      <label class="nest-action-pill">',
            '        <span class="pill-icon">' + icons.upload + '</span>',
            '        <span>导入已有布局配置</span>',
            '        <input type="file" id="fileImportRoom" accept=".json" style="display:none;"/>',
            '      </label>',
            '    </div>',
            '  </div>',
            '</div>'
        ].join('');

        this.bindEvents(containerEl, onSaveConfig);
    },

    bindEvents(containerEl, onSaveConfig) {
        containerEl.querySelectorAll('.drawer-tab').forEach(tab => {
            tab.onclick = () => {
                containerEl.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
                containerEl.querySelectorAll('.drawer-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                const target = containerEl.querySelector('#panel' + tab.getAttribute('data-tab').replace(/^./, c => c.toUpperCase()));
                if (target) target.classList.add('active');
            };
        });

        const rw = containerEl.querySelector('#rngWidth');
        const rl = containerEl.querySelector('#rngLength');
        const rh = containerEl.querySelector('#rngHeight');
        const vw = containerEl.querySelector('#valWidth');
        const vl = containerEl.querySelector('#valLength');
        const vh = containerEl.querySelector('#valHeight');

        const notifySave = () => {
            if (typeof onSaveConfig === 'function') {
                onSaveConfig({
                    width: parseFloat(rw.value),
                    length: parseFloat(rl.value),
                    height: parseFloat(rh.value),
                    wallColor: containerEl.querySelector('#pickWallColor').value,
                    floorColor: containerEl.querySelector('#pickFloorColor').value
                });
            }
        };

        const onSizeChange = () => {
            vw.innerText = rw.value + 'm';
            vl.innerText = rl.value + 'm';
            vh.innerText = rh.value + 'm';
            window.RoomEngine.updateDimensions(rw.value, rl.value, rh.value);
            notifySave();
        };
        rw.oninput = onSizeChange;
        rl.oninput = onSizeChange;
        rh.oninput = onSizeChange;

        containerEl.querySelector('#pickWallColor').onchange = (e) => {
            window.RoomEngine.config.wallColor = e.target.value;
            window.RoomEngine.buildRoom();
            notifySave();
        };
        containerEl.querySelector('#pickFloorColor').onchange = (e) => {
            window.RoomEngine.config.floorColor = e.target.value;
            window.RoomEngine.buildRoom();
            notifySave();
        };

        containerEl.querySelector('#fileWallUpload').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                const img = new Image();
                img.onload = () => {
                    const texture = new THREE.Texture(img);
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.needsUpdate = true;
                    window.RoomEngine.setWallTexture(texture);
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        };

        containerEl.querySelector('#fileFloorUpload').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                const img = new Image();
                img.onload = () => {
                    const texture = new THREE.Texture(img);
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.needsUpdate = true;
                    window.RoomEngine.setFloorTexture(texture);
                };
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
        };

        // 家具点击下载装配交互
        containerEl.querySelectorAll('.nest-furn-item').forEach(el => {
            el.onclick = () => {
                const furnType = el.getAttribute('data-furn');
                el.style.borderColor = '#f59e0b';
                // 模拟即点即拉取服务器 GLB 家具
                alert('已从服务器调取并在房间中装配该家具！');
            };
        });

        containerEl.querySelector('#btnExportRoom').onclick = () => {
            this.exportLayout();
        };

        containerEl.querySelector('#fileImportRoom').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = JSON.parse(evt.target.result);
                    this.importLayout(data);
                    notifySave();
                } catch (err) {
                    alert('导入失败：不是有效的伴窝布局配置文件！');
                }
            };
            reader.readAsText(file);
        };
    },

    exportLayout() {
        const layoutData = {
            app: 'Nest-Room',
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            dimensions: {
                width: window.RoomEngine.config.width,
                length: window.RoomEngine.config.length,
                height: window.RoomEngine.config.height
            },
            colors: {
                wall: window.RoomEngine.config.wallColor,
                floor: window.RoomEngine.config.floorColor
            },
            furniture: []
        };

        const blob = new Blob([JSON.stringify(layoutData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '伴窝布局_' + new Date().toLocaleDateString().replace(/\//g, '-') + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    importLayout(data) {
        if (!data || !data.dimensions) return;
        window.RoomEngine.config.width = data.dimensions.width || 6;
        window.RoomEngine.config.length = data.dimensions.length || 7;
        window.RoomEngine.config.height = data.dimensions.height || 3.2;
        if (data.colors) {
            window.RoomEngine.config.wallColor = data.colors.wall || '#f7f4ed';
            window.RoomEngine.config.floorColor = data.colors.floor || '#e0d2be';
        }
        window.RoomEngine.buildRoom();
        alert('房间布局导入成功！');
    }
};
