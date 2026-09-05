// ============================================================
// 图片备份模块（Image Backup）v1.0
// 专为 toAPP 等不支持文件下载的 WebView 壳工程设计
// 原理：把存档 JSON 编码成 PNG 图片的像素数据，用户长按图片保存到相册
// 恢复时从相册选图片，解码像素数据还原 JSON
// 纯 Canvas 实现，零外部依赖，不需要任何原生权限
// ============================================================
(function () {
    'use strict';

    // 图片头部高度（像素），用于画彩色标识条，解码时跳过
    const HEADER_ROWS = 8;
    // 每个像素存储的字节数（RGB 三通道，A 固定 255 保证图片不透明）
    const BYTES_PER_PIXEL = 3;

    // ---------- 工具：字符串 ↔ UTF-8 字节 ----------
    function stringToBytes(str) {
        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(str);
        }
        // 降级：手动 UTF-8 编码
        const bytes = [];
        for (let i = 0; i < str.length; i++) {
            let code = str.charCodeAt(i);
            if (code < 0x80) {
                bytes.push(code);
            } else if (code < 0x800) {
                bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
            } else if (code < 0xd800 || code >= 0xe000) {
                bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
            } else {
                // 代理对
                i++;
                const code2 = str.charCodeAt(i);
                const full = 0x10000 + (((code & 0x3ff) << 10) | (code2 & 0x3ff));
                bytes.push(
                    0xf0 | (full >> 18),
                    0x80 | ((full >> 12) & 0x3f),
                    0x80 | ((full >> 6) & 0x3f),
                    0x80 | (full & 0x3f)
                );
            }
        }
        return new Uint8Array(bytes);
    }

    function bytesToString(bytes) {
        if (typeof TextDecoder !== 'undefined') {
            return new TextDecoder('utf-8').decode(bytes);
        }
        // 降级：手动 UTF-8 解码
        let str = '';
        let i = 0;
        while (i < bytes.length) {
            const b = bytes[i];
            if (b < 0x80) {
                str += String.fromCharCode(b);
                i += 1;
            } else if (b < 0xe0) {
                str += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
                i += 2;
            } else if (b < 0xf0) {
                str += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f));
                i += 3;
            } else {
                const full = ((b & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) | ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f);
                const adj = full - 0x10000;
                str += String.fromCharCode(0xd800 + (adj >> 10), 0xdc00 + (adj & 0x3ff));
                i += 4;
            }
        }
        return str;
    }

    // ---------- 简单压缩（RLE + 字典），减小图片体积 ----------
    // 不依赖外部库，对 JSON 文本有较好压缩率
    function compressData(bytes) {
        // 先用 LZ77 风格的简单压缩
        const input = Array.from(bytes);
        const output = [];
        let i = 0;
        while (i < input.length) {
            // 查找最长匹配（最多 255 字节，回溯最多 4096 字节）
            let bestLen = 0;
            let bestDist = 0;
            const searchStart = Math.max(0, i - 4096);
            for (let j = searchStart; j < i; j++) {
                let len = 0;
                while (len < 255 && i + len < input.length && input[j + len] === input[i + len]) {
                    len++;
                }
                if (len > bestLen) {
                    bestLen = len;
                    bestDist = i - j;
                    if (len === 255) break;
                }
            }
            if (bestLen >= 3) {
                // 输出匹配标记：0xFF + 距离高字节 + 距离低字节 + 长度
                output.push(0xff, (bestDist >> 8) & 0xff, bestDist & 0xff, bestLen);
                i += bestLen;
            } else {
                // 输出字面量：如果是 0xFF 则转义为 0xFF 0x00
                if (input[i] === 0xff) {
                    output.push(0xff, 0x00);
                } else {
                    output.push(input[i]);
                }
                i++;
            }
        }
        return new Uint8Array(output);
    }

    function decompressData(bytes) {
        const output = [];
        let i = 0;
        while (i < bytes.length) {
            if (bytes[i] === 0xff) {
                if (i + 1 < bytes.length && bytes[i + 1] === 0x00) {
                    // 转义的 0xFF
                    output.push(0xff);
                    i += 2;
                } else if (i + 3 < bytes.length) {
                    // 匹配标记
                    const dist = (bytes[i + 1] << 8) | bytes[i + 2];
                    const len = bytes[i + 3];
                    const start = output.length - dist;
                    for (let j = 0; j < len; j++) {
                        output.push(output[start + j]);
                    }
                    i += 4;
                } else {
                    i++;
                }
            } else {
                output.push(bytes[i]);
                i++;
            }
        }
        return new Uint8Array(output);
    }

    // ---------- 核心：JSON → PNG 图片 ----------
    /**
     * 把 JSON 字符串编码为 PNG 图片的 data URL
     * @param {string} jsonStr - 存档 JSON 字符串
     * @returns {string} data:image/png;base64,...
     */
    function encodeBackupToImage(jsonStr) {
        // 1. 字符串 → UTF-8 字节
        const rawBytes = stringToBytes(jsonStr);
        // 2. 压缩
        const compressed = compressData(rawBytes);
        // 3. 构造数据块：4字节原始长度 + 4字节压缩后长度 + 压缩数据
        const dataBytes = new Uint8Array(8 + compressed.length);
        // 原始长度（大端序）
        dataBytes[0] = (rawBytes.length >> 24) & 0xff;
        dataBytes[1] = (rawBytes.length >> 16) & 0xff;
        dataBytes[2] = (rawBytes.length >> 8) & 0xff;
        dataBytes[3] = rawBytes.length & 0xff;
        // 压缩后长度
        dataBytes[4] = (compressed.length >> 24) & 0xff;
        dataBytes[5] = (compressed.length >> 16) & 0xff;
        dataBytes[6] = (compressed.length >> 8) & 0xff;
        dataBytes[7] = compressed.length & 0xff;
        // 压缩数据
        dataBytes.set(compressed, 8);

        // 4. 计算图片尺寸
        const totalPixels = Math.ceil(dataBytes.length / BYTES_PER_PIXEL);
        const side = Math.max(16, Math.ceil(Math.sqrt(totalPixels)));
        const width = side;
        const height = side + HEADER_ROWS; // 顶部留彩色标识条

        // 5. 创建 Canvas 并写入像素
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(width, height);
        const pixels = imageData.data;

        // 5a. 画彩色标识条（前 HEADER_ROWS 行）
        for (let y = 0; y < HEADER_ROWS; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                // 渐变彩色条：红→绿→蓝循环
                const ratio = x / width;
                pixels[idx] = Math.floor(255 * Math.abs(Math.sin(ratio * Math.PI * 2 + y * 0.3)));
                pixels[idx + 1] = Math.floor(255 * Math.abs(Math.sin(ratio * Math.PI * 2 + 2 + y * 0.3)));
                pixels[idx + 2] = Math.floor(255 * Math.abs(Math.sin(ratio * Math.PI * 2 + 4 + y * 0.3)));
                pixels[idx + 3] = 255;
            }
        }

        // 5b. 写入数据像素
        let byteIdx = 0;
        for (let y = HEADER_ROWS; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                if (byteIdx < dataBytes.length) {
                    pixels[idx] = dataBytes[byteIdx++];
                } else {
                    pixels[idx] = 0;
                }
                if (byteIdx < dataBytes.length) {
                    pixels[idx + 1] = dataBytes[byteIdx++];
                } else {
                    pixels[idx + 1] = 0;
                }
                if (byteIdx < dataBytes.length) {
                    pixels[idx + 2] = dataBytes[byteIdx++];
                } else {
                    pixels[idx + 2] = 0;
                }
                pixels[idx + 3] = 255; // Alpha 固定不透明
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // 6. 导出为 PNG data URL
        return canvas.toDataURL('image/png');
    }

    // ---------- 核心：PNG 图片 → JSON ----------
    /**
     * 从图片（HTMLImageElement / data URL / File）解码还原 JSON 字符串
     * @param {HTMLImageElement|string} imageSource - 图片元素或 data URL
     * @returns {Promise<string>} 解码后的 JSON 字符串
     */
    function decodeImageToBackup(imageSource) {
        return new Promise((resolve, reject) => {
            let img;
            if (typeof imageSource === 'string') {
                img = new Image();
                img.onload = () => processImage(img);
                img.onerror = () => reject(new Error('图片加载失败'));
                img.src = imageSource;
            } else if (imageSource instanceof HTMLImageElement) {
                processImage(imageSource);
            } else {
                reject(new Error('不支持的图片来源'));
            }

            function processImage(img) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const pixels = imageData.data;
                    const width = canvas.width;

                    // 跳过头部标识条，从数据区读取字节
                    const dataBytes = [];
                    for (let y = HEADER_ROWS; y < canvas.height; y++) {
                        for (let x = 0; x < width; x++) {
                            const idx = (y * width + x) * 4;
                            dataBytes.push(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
                        }
                    }

                    // 读取前 8 字节：原始长度 + 压缩后长度
                    if (dataBytes.length < 8) {
                        reject(new Error('图片数据不完整，不是有效的备份图片'));
                        return;
                    }
                    const rawLen = (dataBytes[0] << 24) | (dataBytes[1] << 16) | (dataBytes[2] << 8) | dataBytes[3];
                    const compLen = (dataBytes[4] << 24) | (dataBytes[5] << 16) | (dataBytes[6] << 8) | dataBytes[7];

                    // 基本校验
                    if (rawLen <= 0 || rawLen > 50 * 1024 * 1024) {
                        reject(new Error('备份数据长度异常，可能不是有效的备份图片'));
                        return;
                    }
                    if (compLen <= 0 || compLen > dataBytes.length - 8) {
                        reject(new Error('压缩数据长度异常'));
                        return;
                    }

                    // 截取压缩数据并解压
                    const compressed = new Uint8Array(dataBytes.slice(8, 8 + compLen));
                    const rawBytes = decompressData(compressed);

                    // 校验解压后长度
                    if (rawBytes.length !== rawLen) {
                        // 长度不一致可能是图片被压缩/转码导致数据损坏
                        reject(new Error('数据校验失败：图片可能被压缩过，请保存原图（不要截图）'));
                        return;
                    }

                    // 字节 → 字符串
                    const jsonStr = bytesToString(rawBytes);
                    resolve(jsonStr);
                } catch (e) {
                    reject(new Error('解码失败：' + e.message));
                }
            }
        });
    }

    // ---------- 从剪贴板读取图片（用于恢复） ----------
    async function readImageFromClipboard() {
        if (navigator.clipboard && navigator.clipboard.read) {
            try {
                const items = await navigator.clipboard.read();
                for (const item of items) {
                    for (const type of item.types) {
                        if (type.startsWith('image/')) {
                            const blob = await item.getType(type);
                            return URL.createObjectURL(blob);
                        }
                    }
                }
            } catch (e) {
                console.warn('剪贴板读取图片失败', e);
            }
        }
        return null;
    }

    // ---------- 从 File 读取图片 data URL ----------
    function fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    // ---------- 估算图片尺寸信息 ----------
    function getImageBackupInfo(jsonStr) {
        const rawBytes = stringToBytes(jsonStr);
        const compressed = compressData(rawBytes);
        const totalBytes = 8 + compressed.length;
        const totalPixels = Math.ceil(totalBytes / BYTES_PER_PIXEL);
        const side = Math.max(16, Math.ceil(Math.sqrt(totalPixels)));
        return {
            rawSize: rawBytes.length,
            compressedSize: compressed.length,
            imageWidth: side,
            imageHeight: side + HEADER_ROWS,
            imagePixels: side * (side + HEADER_ROWS)
        };
    }

    // ---------- 暴露到全局 ----------
    window.ImageBackup = {
        encodeBackupToImage: encodeBackupToImage,
        decodeImageToBackup: decodeImageToBackup,
        readImageFromClipboard: readImageFromClipboard,
        fileToDataURL: fileToDataURL,
        getImageBackupInfo: getImageBackupInfo,
        HEADER_ROWS: HEADER_ROWS
    };

    console.log('[ImageBackup] 图片备份模块已加载');
})();
