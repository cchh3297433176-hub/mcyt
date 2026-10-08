/**
 * 伴窝 (Nest) - 多房间管理器 (RoomManager)
 * 职责：
 * 1. 负责管理每个角色拥有的房间列表（默认主体仅有1个“卧室”）；
 * 2. 支持「＋」添加房间：支持自定义房间名称，支持用户导入 PNG/GIF 图片作为房间图标；
 * 3. 支持房间切换与独立布局持久化；
 * 4. 纯 SVG 极简交互，无任何 Emoji。
 */
window.RoomManager = {
    STORAGE_KEY: 'nest_character_rooms_v1',

    // 内存缓存：{ [charId]: [ { id, name, iconUrl, config } ] }
    cache: {},

    loadAll() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                this.cache = JSON.parse(raw);
            }
        } catch (e) {
            console.warn('[RoomManager] 读取房间存档失败', e);
            this.cache = {};
        }
    },

    saveAll() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cache));
        } catch (e) {
            console.warn('[RoomManager] 保存房间存档失败', e);
        }
    },

    /**
     * 获取指定角色的所有房间列表，若无则初始化默认的唯一主房间：卧室
     */
    getRoomsForChar(charId) {
        if (!this.cache[charId] || !Array.isArray(this.cache[charId]) || this.cache[charId].length === 0) {
            this.cache[charId] = [
                {
                    id: 'room_bedroom_' + Date.now(),
                    name: '卧室',
                    iconUrl: null, // 用户自定义导入的 PNG/GIF，默认空
                    isDefault: true,
                    config: {
                        width: 6,
                        length: 7,
                        height: 3.2,
                        wallColor: '#f7f4ed',
                        floorColor: '#e0d2be',
                        wallTexture: null,
                        floorTexture: null,
                        furniture: []
                    }
                }
            ];
            this.saveAll();
        }
        return this.cache[charId];
    },

    /**
     * 获取某个角色的当前活动房间
     */
    getActiveRoom(charId, roomId) {
        const rooms = this.getRoomsForChar(charId);
        if (roomId) {
            const found = rooms.find(r => r.id === roomId);
            if (found) return found;
        }
        return rooms[0];
    },

    /**
     * 为角色新增一个房间
     */
    addRoom(charId, name, iconUrl = null) {
        const rooms = this.getRoomsForChar(charId);
        const newRoom = {
            id: 'room_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            name: (name && name.trim()) ? name.trim() : '新房间',
            iconUrl: iconUrl || null,
            isDefault: false,
            config: {
                width: 6,
                length: 6,
                height: 3.2,
                wallColor: '#f5f7fa',
                floorColor: '#e6ebf2',
                wallTexture: null,
                floorTexture: null,
                furniture: []
            }
        };
        rooms.push(newRoom);
        this.saveAll();
        return newRoom;
    },

    /**
     * 更新房间配置（尺寸、材质、家具等）
     */
    updateRoomConfig(charId, roomId, newConfig) {
        const rooms = this.getRoomsForChar(charId);
        const room = rooms.find(r => r.id === roomId);
        if (room) {
            room.config = Object.assign({}, room.config, newConfig);
            this.saveAll();
        }
    },

    /**
     * 删除房间（卧室不可删除）
     */
    deleteRoom(charId, roomId) {
        let rooms = this.getRoomsForChar(charId);
        if (rooms.length <= 1) return false;
        const target = rooms.find(r => r.id === roomId);
        if (target && target.isDefault) return false; // 保护主卧室
        this.cache[charId] = rooms.filter(r => r.id !== roomId);
        this.saveAll();
        return true;
    }
};

// 预先装载本地存储
window.RoomManager.loadAll();
