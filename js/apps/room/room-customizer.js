/**
 * 伴窝 (Nest) - 空间硬装、自定义贴图上传与布局导出/导入器
 * 纯 SVG 极简 UI，支持画作上传做墙纸/地毯，一键导出 JSON 布局
 */
window.RoomCustomizer = {
    renderDrawer(containerEl) {
        const icons = window.RoomIcons;
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
            '      <button class="drawer-tab" data-tab="export">',
            '        <span class="tab-icon">' + icons.exportJson + '</span>',
            '        <span>布局管理</span>',
            '      </button>',
            '    </div>',
            '  </div>',
            '  <div class="drawer-panel active" id="panelSize">',
            '    <div class="prop-row">',
            '      <span class="prop-label">宽度 (X)</span>',
            '      <input type="range" id="rngWidth" min="4" max="14" step="0.5" value="' + window.RoomEngine.config.width + '" class="nest-slider"/>',
            '      <span class="prop-val" id="valWidth">' + window.RoomEngine.config.width + 'm</span>',
            '    </div>',
            '    <div class="prop-row">',
            '      <span class="prop-label">进深 (Z)</span>',
            '      <input type="range" id="rngLength" min="4" max="14" step="0.5" value="' + window.RoomEngine.config.length + '" class="nest-slider"/>',
            '      <span class="prop-val" id="valLength">' + window.RoomEngine.config.length + 'm</span>',
            '    </div>',
            '    <div class="prop-row">',
            '      <span class="prop-label">挑高 (Y)</span>',
            '      <input type="range" id="rngHeight" min="2.5" max="5.5" step="0.2" value="' + window.RoomEngine.config.height + '" class="nest-slider"/>',
            '      <span class="prop-val" id="valHeight">' + window.RoomEngine.config.height + 'm</span>',
            '    </div>',
            '  </div>',
            '  <div class="drawer-panel" id="panelMaterial">',
            '    <div class="mat-section-title">墙面定制</div>',
            '    <div class="mat-actions-bar">',
            '      <input type="color" id="pickWallColor" value="' + window.RoomEngine.config.wallColor + '" class="nest-color-btn"/>',
            '      <label class="nest-upload-btn">',
            '        <span class="btn-icon">' + icons.upload + '</span>',
            '        <span>导入画作/贴图上墙</span>',
            '        <input type="file" id="fileWallUpload" accept="image/*" style="display:none;"/>',
            '      </label>',
            '    </div>',
            '    <div class="mat-section-title" style="margin-top:12px;">地板定制</div>',
            '    <div class="mat-actions-bar">',
            '      <input type="color" id="pickFloorColor" value="' + window.RoomEngine.config.floorColor + '" class="nest-color-btn"/>',
            '      <label class="nest-upload-btn">',
            '        <span class="btn-icon">' + icons.upload + '</span>',
            '        <span>导入地板/地毯贴图</span>',
            '        <input type="file" id="fileFloorUpload" accept="image/*" style="display:none;"/>',
            '      </label>',
            '    </div>',
            '  </div>',
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

        this.bindEvents(containerEl);
    },

    bindEvents(containerEl) {
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

        const onSizeChange = () => {
            vw.innerText = rw.value + 'm';
            vl.innerText = rl.value + 'm';
            vh.innerText = rh.value + 'm';
            window.RoomEngine.updateDimensions(rw.value, rl.value, rh.value);
        };
        rw.oninput = onSizeChange;
        rl.oninput = onSizeChange;
        rh.oninput = onSizeChange;

        containerEl.querySelector('#pickWallColor').onchange = (e) => {
            window.RoomEngine.config.wallColor = e.target.value;
            window.RoomEngine.buildRoom();
        };
        containerEl.querySelector('#pickFloorColor').onchange = (e) => {
            window.RoomEngine.config.floorColor = e.target.value;
            window.RoomEngine.buildRoom();
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
        a.download = '伴窝布局_' + new Date().toLocaleDateString().replace(///g, '-') + '.json';
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
        alert('🎉 房间布局导入成功！');
    }
};
