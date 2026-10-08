/**
 * 伴窝 (Nest) - 多角色多房间管理器 (RoomManager)
 * 职责：
 * 1. 严格实现每个角色与玩家(user_me)房间完全隔离，数据互不共通；
 * 2. 每个角色首次进入均有且仅有1个初始专属卧室；
 * 3. 某个角色添加了客厅、书房等，其他角色绝对不会同步出现，需单独添加；
 * 4. 支持自定义房间名称与 PNG/GIF 图标；
 * 5. 支持独立房间的尺寸、背景环境、单墙面贴图、地板贴图及家具清单持久化。
 */
window.RoomManager = {
    STORAGE_KEY: 'nest_character_rooms_v2',

    // 内存数据格式：{ [charId]: [ { id, name, iconUrl, isDefault, config } ] }
    cache: {},

    loadAll() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                this.cache = JSON.parse(raw);
            } else {
                this.cache = {};
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
     * 生成房间默认基础配置（带立体厚度墙体、可调背景、网格尺寸）
     */
    getDefaultRoomConfig(isUser = false) {
        return {
            width: 7,
            length: 8,
            height: 3.4,
            bgTheme: 'warm_sun', // warm_sun | fresh_mint | soft_cyber | pure_dark
            bgColor: '#161922',
            bgCustomUrl: null,
            // 墙面独立贴图与色彩
            backWallColor: '#f7f4ed',
            backWallTexture: null,
            leftWallColor: '#f7f4ed',
            leftWallTexture: null,
            // 地板独立贴图与色彩
            floorColor: '#e0d2be',
            floorTexture: null,
            // 家具实例列表：[{ id, modelFile, name, x, y, z, rotY, scale, color, textureUrl }]
            furniture: []
        };
    },

    /**
     * 获取指定角色的房间列表（若未初始化则为其单独生成独立的唯一“卧室”）
     */
    getRoomsForChar(charId) {
        if (!charId) charId = 'user_me';
        if (!this.cache[charId] || !Array.isArray(this.cache[charId]) || this.cache[charId].length === 0) {
            const initialRoom = {
                id: 'room_' + charId + '_bedroom_' + Date.now(),
                name: '卧室',
                iconUrl: null,
                isDefault: true,
                config: this.getDefaultRoomConfig(charId === 'user_me')
            };
            this.cache[charId] = [initialRoom];
            this.saveAll();
        }
        return this.cache[charId];
    },

    /**
     * 获取指定角色名下的当前活动房间
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
     * 为特定角色独立新增一个房间（绝不影响其他任何角色或用户）
     */
    addRoom(charId, name, iconUrl = null) {
        if (!charId) charId = 'user_me';
        const rooms = this.getRoomsForChar(charId);
        const newRoom = {
            id: 'room_' + charId + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            name: (name && name.trim()) ? name.trim() : '新房间',
            iconUrl: iconUrl || null,
            isDefault: false,
            config: this.getDefaultRoomConfig(charId === 'user_me')
        };
        rooms.push(newRoom);
        this.saveAll();
        return newRoom;
    },

    /**
     * 保存指定角色指定房间的配置
     */
    updateRoomConfig(charId, roomId, newConfig) {
        if (!charId) charId = 'user_me';
        const rooms = this.getRoomsForChar(charId);
        const room = rooms.find(r => r.id === roomId);
        if (room) {
            room.config = Object.assign({}, room.config, newConfig);
            this.saveAll();
        }
    },

    /**
     * 删除指定房间（默认首个卧室受到保护不可删除）
     */
    deleteRoom(charId, roomId) {
        if (!charId) charId = 'user_me';
        const rooms = this.getRoomsForChar(charId);
        if (rooms.length <= 1) return false;
        const target = rooms.find(r => r.id === roomId);
        if (target && target.isDefault) return false;
        this.cache[charId] = rooms.filter(r => r.id !== roomId);
        this.saveAll();
        return true;
    }
};

window.RoomManager.loadAll();