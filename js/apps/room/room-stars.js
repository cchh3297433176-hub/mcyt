/**
 * 伴窝 (Nest) - 深空动态星幕背景引擎
 * 纯深黑/微紫渐变 + 柔和呼吸微粒星尘（零 Emoji，高帧率轻量 Canvas）
 */
window.RoomStars = {
    canvas: null,
    ctx: null,
    stars: [],
    animId: null,

    init(canvasEl) {
        this.canvas = canvasEl;
        this.ctx = canvasEl.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.createStars(45);
        this.loop();
    },

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.parentElement ? this.canvas.parentElement.clientWidth : window.innerWidth;
        this.canvas.height = this.canvas.parentElement ? this.canvas.parentElement.clientHeight : window.innerHeight;
    },

    createStars(count) {
        this.stars = [];
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * (this.canvas ? this.canvas.width : 400),
                y: Math.random() * (this.canvas ? this.canvas.height : 800),
                size: Math.random() * 1.8 + 0.6,
                alpha: Math.random() * 0.8 + 0.2,
                speed: Math.random() * 0.02 + 0.005,
                dir: Math.random() > 0.5 ? 1 : -1,
                isSpark: Math.random() > 0.7
            });
        }
    },

    loop() {
        if (!this.ctx || !this.canvas) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.fillStyle = '#0a0d14';
        ctx.fillRect(0, 0, w, h);

        const grad = ctx.createRadialGradient(w * 0.5, h * 0.45, 10, w * 0.5, h * 0.45, Math.max(w, h) * 0.7);
        grad.addColorStop(0, 'rgba(30, 26, 54, 0.4)');
        grad.addColorStop(1, 'rgba(10, 13, 20, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        this.stars.forEach(s => {
            s.alpha += s.speed * s.dir;
            if (s.alpha > 0.95) { s.alpha = 0.95; s.dir = -1; }
            if (s.alpha < 0.15) { s.alpha = 0.15; s.dir = 1; }

            ctx.fillStyle = 'rgba(240, 235, 255, ' + s.alpha.toFixed(2) + ')';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();

            if (s.isSpark && s.alpha > 0.6) {
                ctx.strokeStyle = 'rgba(255, 230, 180, ' + (s.alpha * 0.5).toFixed(2) + ')';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(s.x - s.size * 2.8, s.y);
                ctx.lineTo(s.x + s.size * 2.8, s.y);
                ctx.moveTo(s.x, s.y - s.size * 2.8);
                ctx.lineTo(s.x, s.y + s.size * 2.8);
                ctx.stroke();
            }
        });

        this.animId = requestAnimationFrame(() => this.loop());
    },

    stop() {
        if (this.animId) cancelAnimationFrame(this.animId);
    }
};
