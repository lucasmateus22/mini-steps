// ============================================================
// document.js — Item colecionável: Pequeno Papel / Certidão
// Pergaminho com selo dourado de alta visibilidade e fita azul.
// ============================================================

import { SCORING } from "../config/gameMetrics.js";

const papelImg = new Image();
papelImg.src = "assets/papel.png";

export default class DocumentItem {
  /**
   * @param {number} x - posição X no mundo
   * @param {number} y - posição Y no mundo
   * @param {number} id - identificador único
   */
  constructor(x, y, id = 0) {
    this.x = x;
    this.baseY = y;
    this.y = y;
    this.width = 20;
    this.height = 26;
    this.id = id;

    this.collected = false;
    this.active = true;
    this.collectProgress = 0; // 0 a 1 durante animação de coleta
    this.floatTimer = id * 1.5; // defasagem de fase para cada papel
    this.sparkleTimer = 0;
    this.sparkles = [];
    this.collectParticles = []; // Partículas de explosão ao coletar

    // Valor variável por documento (30–54 pontos)
    this.value =
      SCORING.DOC_VALUE_BASE + ((id * 7 + 13) % SCORING.DOC_VALUE_RANGE);
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  collect() {
    if (this.collected) return false;
    this.collected = true;
    this.collectProgress = 0;
    this._spawnCollectParticles();
    return true;
  }

  /**
   * Cria explosão de partículas coloridas idêntica ao estilo do painel de score.
   */
  _spawnCollectParticles() {
    const colors = [
      "#FBBF24", // Dourado
      "#10B981", // Verde esmeralda
      "#F97316", // Laranja vibrante
      "#38BDF8", // Azul celeste
      "#EF4444", // Vermelho carmesim
      "#A855F7", // Roxo vibrante
      "#FDE047", // Amarelo brilhante
      "#FFFFFF", // Branco cintilante
    ];

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const count = 30 + Math.floor(Math.random() * 10);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 260;
      const life = 0.2 + Math.random() * 0.3;
      this.collectParticles.push({
        x: cx + (Math.random() - 0.5) * 16,
        y: cy + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60, // leve impulso para cima
        life: life,
        maxLife: life,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 1.5,
        isStar: Math.random() > 0.6,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 8,
      });
    }
  }

  update(dt) {
    if (
      !this.active &&
      this.collectParticles.length === 0 &&
      this.sparkles.length === 0
    ) {
      return;
    }

    this.floatTimer += dt * 3;
    const bounce = Math.sin(this.floatTimer) * 4;
    this.y = this.baseY + bounce;

    // Partículas de brilho ambiente quando não coletado
    this.sparkleTimer += dt;
    if (this.sparkleTimer > 0.4 && !this.collected) {
      this.sparkleTimer = 0;
      if (Math.random() < 0.6) {
        this.sparkles.push({
          x: this.x + Math.random() * this.width,
          y: this.y + Math.random() * this.height,
          vx: (Math.random() - 0.5) * 15,
          vy: -15 - Math.random() * 20,
          life: 0.6,
          maxLife: 0.6,
          color: Math.random() > 0.5 ? "#FDE047" : "#60A5FA",
          size: 1.5 + Math.random() * 2,
        });
      }
    }

    // Animação de coleta (voa para cima e desvanece)
    if (this.collected) {
      this.collectProgress += dt * 4.0;
      this.baseY -= dt * 70; // sobe suavemente enquanto desvanece

      if (
        this.collectProgress >= 1 &&
        this.collectParticles.length === 0 &&
        this.sparkles.length === 0
      ) {
        this.active = false;
      }
    }

    // Atualiza sparkles ambientes
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) {
        this.sparkles.splice(i, 1);
      }
    }

    // Atualiza partículas da explosão de coleta
    for (let i = this.collectParticles.length - 1; i >= 0; i--) {
      const p = this.collectParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 320 * dt; // gravidade
      p.vx *= 0.98; // resistência do ar
      p.rotation += p.rotSpeed * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.collectParticles.splice(i, 1);
      }
    }
  }

  render(ctx, camera) {
    if (
      !this.active &&
      this.collectParticles.length === 0 &&
      this.sparkles.length === 0
    ) {
      return;
    }

    const sx = this.x - camera.x;
    const sy = this.y - camera.y;

    ctx.save();

    // Renderiza sparkles ambientes
    for (const s of this.sparkles) {
      const ssx = s.x - camera.x;
      const ssy = s.y - camera.y;
      const alpha = Math.max(0, s.life / s.maxLife);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(ssx, ssy, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Renderiza partículas da explosão de coleta
    for (const p of this.collectParticles) {
      const psx = p.x - camera.x;
      const psy = p.y - camera.y;
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.translate(psx, psy);
      ctx.rotate(p.rotation);

      if (p.isStar) {
        // Formato de losango/estrela brilhante
        ctx.beginPath();
        ctx.moveTo(0, -p.size * 1.3);
        ctx.lineTo(p.size * 0.9, 0);
        ctx.lineTo(0, p.size * 1.3);
        ctx.lineTo(-p.size * 0.9, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        // Círculo brilhante
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Renderiza o item papel/documento se ainda estiver visível
    if (this.collectProgress < 1) {
      if (this.collected) {
        const alpha = Math.max(0, 1 - this.collectProgress);
        const scale = 1 + this.collectProgress * 0.5;
        ctx.globalAlpha = alpha;
        ctx.translate(sx + this.width / 2, sy + this.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-(sx + this.width / 2), -(sy + this.height / 2));
      } else {
        ctx.globalAlpha = 1;
        // Sombra suave no chão/ar
        ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
        ctx.beginPath();
        ctx.ellipse(
          sx + this.width / 2,
          this.baseY - camera.y + this.height + 6,
          8,
          3,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      // Glow sutil dourado ao redor do papel quando não coletado
      if (!this.collected) {
        const pulse = Math.sin(Date.now() / 250) * 0.2 + 0.8;
        ctx.shadowColor = "#FBBF24";
        ctx.shadowBlur = 6 * pulse;
      }

      if (papelImg.complete && papelImg.naturalWidth !== 0) {
        ctx.drawImage(papelImg, sx, sy, this.width, this.height);
      } else {
        // Fallback em Canvas procedural caso a imagem ainda esteja carregando
        this._drawFallback(ctx, sx, sy);
      }
    }

    ctx.restore();
  }

  _drawFallback(ctx, sx, sy) {
    const w = this.width;
    const h = this.height;

    // Papel pergaminho
    ctx.fillStyle = "#FDE68A";
    ctx.strokeStyle = "#1C1917";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(sx, sy, w, h - 6, 3);
    ctx.fill();
    ctx.stroke();

    // Linhas de texto
    ctx.fillStyle = "#D97706";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(sx + 3, sy + 4 + i * 4, w - 8, 1.5);
    }

    // Selo de cera dourado
    const sealX = sx + w - 6;
    const sealY = sy + h - 9;
    ctx.fillStyle = "#F59E0B";
    ctx.beginPath();
    ctx.arc(sealX, sealY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#92400E";
    ctx.stroke();

    // Fita azul
    ctx.fillStyle = "#2563EB";
    ctx.fillRect(sealX - 2, sealY + 3, 4, 6);
  }
}
