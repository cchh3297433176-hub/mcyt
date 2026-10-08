/**
 * 伴窝 (Nest) - 深空动态星幕背景引擎 (动态闪电 + 四角星芒 + 呼吸星尘)
 * 纯深黑/深蓝紫微渐变，带随机动态闪电电弧与星辉划过，零 Emoji，纯 Canvas 极简高帧率渲染
 */
window.RoomStars = {
    canvas: null,
    ctx: null,
    stars: [],
    lightnings: [],
    animId: null,
    lastLightningTime: 0,

    init(canvasEl) {
        this.canvas = canvasEl;
        this.ctx = canvasEl.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.createStars(65);
        this.lightnings = [];
        this.lastLightningTime = Date.now();
        this.loop();
    },

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.parentElement ? this.canvas.parentElement.clientWidth : window.innerWidth;
        this.canvas.height = this.canvas.parentElement ? this.canvas.parentElement.clientHeight : window.innerHeight;
    },

    createStars(count) {
        this.stars = [];
        const w = this.canvas ? this.canvas.width : 400;
        const h = this.canvas ? this.canvas.height : 800;
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                size: Math.random() * 2.0 + 0.8,
                alpha: Math.random() * 0.8 + 0.2,
                speed: Math.random() * 0.025 + 0.008,
                dir: Math.random() > 0.5 ? 1 : -1,
                rot: Math.random() * Math.PI,
                rotSpeed: (Math.random() - 0.5) * 0.02,
                isSpark: Math.random() > 0.45,
                hue: Math.random() > 0.7 ? '#99f6e4' : (Math.random() > 0.4 ? '#fef08a' : '#ffffff')
            });
        }
    },

    spawnLightning() {
        const w = this.canvas ? this.canvas.width : 400;
        const h = this.canvas ? this.canvas.height : 800;

        // 起点与终点：高空倾斜劈落或横向电弧
        const startX = Math.random() * (w * 0.8) + w * 0.1;
        const startY = Math.random() * (h * 0.25);
        const endX = startX + (Math.random() - 0.5) * w * 0.6;
        const endY = startY + Math.random() * (h * 0.45) + 120;

        // 递归生成折线点
        const points = this.createLightningSegments(startX, startY, endX, endY, 6);
        this.lightnings.push({
            points: points,
            alpha: 1.0,
            life: 1.0,
            decay: Math.random() * 0.04 + 0.03,
            color: Math.random() > 0.5 ? 'rgba(165, 243, 252, ' : 'rgba(216, 180, 254, '
        });
    },

    createLightningSegments(x1, y1, x2, y2, displace) {
        if (displace < 2.0) {
            return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
        }
        const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * displace * 18;
        const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * displace * 14;
        const seg1 = this.createLightningSegments(x1, y1, midX, midY, displace / 1.7);
        const seg2 = this.createLightningSegments(midX, midY, x2, y2, displace / 1.7);
        return seg1.slice(0, -1).concat(seg2);
    },

    drawCrossSpark(ctx, x, y, size, alpha, rot) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.85).toFixed(2)})`;
        ctx.lineWidth = 1.0;
        const len = size * 3.5;

        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.lineTo(len, 0);
        ctx.moveTo(0, -len);
        ctx.lineTo(0, len);
        ctx.stroke();

        // 内核发光星核
        ctx.fillStyle = `rgba(255, 245, 220, ${(alpha).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    loop() {
        if (!this.ctx || !this.canvas) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 基础暗幕
        ctx.fillStyle = '#080a11';
        ctx.fillRect(0, 0, w, h);

        // 柔和暗紫深空极光晕染
        const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, 20, w * 0.5, h * 0.4, Math.max(w, h) * 0.75);
        grad.addColorStop(0, 'rgba(38, 28, 68, 0.5)');
        grad.addColorStop(0.5, 'rgba(18, 22, 45, 0.3)');
        grad.addColorStop(1, 'rgba(8, 10, 17, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // 1. 动态闪电生成与消散（每隔 2.5 ~ 5 秒划过微电流）
        const now = Date.now();
        if (now - this.lastLightningTime > 2600 && Math.random() < 0.04) {
            this.spawnLightning();
            this.lastLightningTime = now;
        }

        for (let i = this.lightnings.length - 1; i >= 0; i--) {
            const bolt = this.lightnings[i];
            bolt.life -= bolt.decay;
            bolt.alpha = Math.max(0, bolt.life);

            if (bolt.alpha <= 0) {
                this.lightnings.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.strokeStyle = bolt.color + bolt.alpha.toFixed(2) + ')';
            ctx.lineWidth = 1.8;
            ctx.shadowColor = '#67e8f9';
            ctx.shadowBlur = 12;

            ctx.beginPath();
            bolt.points.forEach((pt, pIdx) => {
                if (pIdx === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.stroke();

            // 内芯细白电弧
            ctx.strokeStyle = `rgba(255, 255, 255, ${(bolt.alpha * 0.9).toFixed(2)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
            ctx.restore();
        }

        // 2. 动态繁星与四角星芒
        this.stars.forEach(s => {
            s.alpha += s.speed * s.dir;
            if (s.alpha > 0.95) { s.alpha = 0.95; s.dir = -1; }
            if (s.alpha < 0.12) { s.alpha = 0.12; s.dir = 1; }
            s.rot += s.rotSpeed;

            if (s.isSpark && s.alpha > 0.5) {
                this.drawCrossSpark(ctx, s.x, s.y, s.size, s.alpha, s.rot);
            } else {
                ctx.fillStyle = s.hue;
                ctx.globalAlpha = s.alpha;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
        });

        this.animId = requestAnimationFrame(() => this.loop());
    },

    stop() {
        if (this.animId) cancelAnimationFrame(this.animId);
    }
};