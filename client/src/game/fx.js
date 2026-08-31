// ============================================================
// FX — particules canvas + nombres flottants (imperatif, hors
// React, pour éviter de re-render le jeu à chaque effet).
// Usage : fx.init(canvas, layer) puis fx.burst(x, y), fx.float(...)
// Exposé aussi en window.__fx pour le store (confettis succès).
// ============================================================

const COLORS = ['#fb8113', '#ffc06b', '#ffd9a3', '#ff9d36', '#ffe9c4'];
const CONFETTI_COLORS = ['#fb8113', '#ffd9a3', '#4ade80', '#60a5fa', '#f472b6', '#fde047'];
// Plafond global de particules : au-delà, les nouvelles sont ignorées.
// (Clics rapides + auto-clicker + pluies pouvaient sinon empiler des
// centaines de particules et faire laguer le navigateur.)
const MAX_PARTICLES = 150;
// Mouvement réduit : la décoration (particules, confettis) est coupée,
// le texte flottant reste — c'est un feedback de gain essentiel.
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Thème par défaut (orange EndoCraft) — remplacé par fx.setTheme()
const DEFAULT_THEME = {
  colors: COLORS,
  float: '#ffd9a3',
  glow: 'rgba(251, 129, 19, 0.55)',
  ripple: 'rgba(255, 192, 107, 0.8)',
};

class FX {
  init(canvas, layer) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.layer = layer;
    this.particles = [];
    this.theme = DEFAULT_THEME;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const loop = () => {
      this.step();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // Change la palette (ex: skin EndoSage → tons verts)
  setTheme(theme = {}) {
    this.theme = { ...DEFAULT_THEME, ...theme };
  }

  step() {
    const { ctx, canvas } = this;
    // Rien à dessiner : on ne touche au canvas qu'une fois (plus de
    // clearRect plein écran à 60 fps quand le jeu est calme)
    if (this.particles.length === 0) {
      if (this._dirty) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this._dirty = false;
      }
      return;
    }
    this._dirty = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const dt = 1 / 60;
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;

      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life / p.fade);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return true;
    });
  }

  // Éclat d'étincelles (clic sur l'EndoCraft). Anti-spam : avec un
  // auto-clicker à 30+ clics/s, générer 14 particules par clic sature
  // le cap et fait thrasher le moteur — on borne la fréquence.
  burst(x, y, { count = 14, power = 1 } = {}) {
    if (REDUCED || document.hidden) return; // zéro coût si décoration coupée
    const now = performance.now();
    if (now - this._lastBurst < 33) return; // max ~30 éclats/s
    this._lastBurst = now;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = (120 + Math.random() * 240) * power;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        gravity: 500,
        size: 2 + Math.random() * 4,
        life: 0.5 + Math.random() * 0.5,
        fade: 0.3,
        color: this.theme.colors[(Math.random() * this.theme.colors.length) | 0],
        shape: 'circle',
        rot: 0,
        vrot: 0,
      });
    }
  }

  // Confettis (succès, pomme dorée)
  confetti() {
    if (REDUCED || document.hidden) return;
    const w = window.innerWidth;
    for (let i = 0; i < 80; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      this.particles.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 80,
        vx: (Math.random() - 0.5) * 150,
        vy: 120 + Math.random() * 200,
        gravity: 220,
        size: 6 + Math.random() * 7,
        life: 2 + Math.random() * 1.5,
        fade: 0.8,
        color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
        shape: 'rect',
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 12,
      });
    }
  }

  // Petit éclat vert (achat)
  purchase(x, y) {
    this.burst(x, y, { count: 8, power: 0.6 });
  }

  // Nombre flottant "+X" (couleur du thème du skin équipé). Plafonné :
  // un auto-clicker à 30+ clics/s créerait autant de nœuds DOM par
  // seconde — au-delà de 8 affichés, on laisse tomber les suivants.
  float(x, y, text, cls = '') {
    if (document.hidden || !this.layer) return;
    if (this.layer.childElementCount >= 8) return;
    const el = document.createElement('span');
    el.textContent = text;
    el.className = `float-number ${cls}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = this.theme.float;
    el.style.textShadow = `0 2px 6px rgba(0, 0, 0, 0.8), 0 0 16px ${this.theme.glow}`;
    this.layer.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }
}

export const fx = new FX();
window.__fx = fx;
