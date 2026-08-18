// ============================================================
// hud.js — HUD overlay (progresso, checkpoint)
// Sem corações — vida única com respawn no checkpoint.
// Animação do painel de score ao ganhar pontos.
// ============================================================

import { HUD, CANVAS, WORLD } from "../config/gameMetrics.js";

export default class HudSystem {
  constructor() {
    this.checkpointText = "";
    this.checkpointFlash = 0;
    this.playTime = 0;
    this.lastScore = 0;
    this.particles = [];

    // --- Animação do Score Panel ---
    // Estados: "idle" | "going_center" | "at_center" | "returning"
    this.scoreAnimState = "idle";
    this.scoreAnimTimer = 0;

    // Duração de cada fase (em segundos)
    this.goingDuration = 0.4; // Indo pro centro
    this.holdDuration = 0.8; // Parado no centro
    this.returnDuration = 0.35; // Voltando à origem

    // Posição animada do painel
    this.panelX = 0;
    this.panelY = 0;
    this.panelScale = 1;

    // Flag que o game.js consulta para pausar os inputs
    this.isPausedForScoreAnim = false;
  }

  flashCheckpoint(text) {
    this.checkpointText = text;
    this.checkpointFlash = 2.0; // seconds
  }

  /**
   * Dispara a animação do score voando ao centro.
   */
  triggerScoreCelebration() {
    this.scoreAnimState = "going_center";
    this.scoreAnimTimer = 0;
    this.isPausedForScoreAnim = true;
  }

  update(dt, isPlaying) {
    if (this.checkpointFlash > 0) {
      this.checkpointFlash -= dt;
    }
    if (isPlaying) {
      this.playTime += dt;
    }

    // Atualiza partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt; // gravidade leve nas partículas
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // --- Máquina de estados da animação do score ---
    this._updateScoreAnim(dt);
  }

  _updateScoreAnim(dt) {
    if (this.scoreAnimState === "idle") return;

    this.scoreAnimTimer += dt;

    const pad = HUD.PADDING;
    const clockW = 120;
    const clockH = 28;
    const originX = pad;
    const originY = pad;

    // Centro da tela (posição do painel centralizado)
    const centerX = CANVAS.WIDTH / 2 - clockW / 2;
    const centerY = CANVAS.HEIGHT / 2 - clockH / 2;

    const easeOutBack = (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    const easeInBack = (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return c3 * t * t * t - c1 * t * t;
    };

    switch (this.scoreAnimState) {
      case "going_center": {
        let t = Math.min(1, this.scoreAnimTimer / this.goingDuration);
        let eased = easeOutBack(t);
        this.panelX = originX + (centerX - originX) * eased;
        this.panelY = originY + (centerY - originY) * eased;
        this.panelScale = 1 + 1.2 * eased; // Cresce até 2.2x

        if (t >= 1) {
          this.scoreAnimState = "at_center";
          this.scoreAnimTimer = 0;
          // Explosão de partículas no centro!
          this._spawnCenterParticles(
            centerX + clockW / 2,
            centerY + clockH / 2,
          );
        }
        break;
      }

      case "at_center": {
        this.panelX = centerX;
        this.panelY = centerY;
        this.panelScale = 2.2;

        if (this.scoreAnimTimer >= this.holdDuration) {
          this.scoreAnimState = "returning";
          this.scoreAnimTimer = 0;
        }
        break;
      }

      case "returning": {
        let t = Math.min(1, this.scoreAnimTimer / this.returnDuration);
        let eased = easeInBack(t);
        this.panelX = centerX + (originX - centerX) * eased;
        this.panelY = centerY + (originY - centerY) * eased;
        this.panelScale = 2.2 + (1 - 2.2) * eased; // Volta a 1x

        if (t >= 1) {
          this.scoreAnimState = "idle";
          this.scoreAnimTimer = 0;
          this.panelX = originX;
          this.panelY = originY;
          this.panelScale = 1;
          this.isPausedForScoreAnim = false;
        }
        break;
      }
    }
  }

  /**
   * Cria partículas de celebração no centro da tela.
   */
  _spawnCenterParticles(cx, cy) {
    const colors = [
      "#FBBF24",
      "#10B981",
      "#F97316",
      "#38BDF8",
      "#EF4444",
      "#A855F7",
      "#FFFFFF",
    ];
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 350;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 30,
        y: cy + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 0.6 + Math.random() * 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 5,
      });
    }
  }

  /**
   * @param {import('../entities/player.js').default} player
   * @param {number} totalCheckpoints
   * @param {number} activatedCount
   * @param {number} [collectedDocs=0]
   * @param {number} [totalDocs=0]
   * @param {number} [totalScore=0]
   */
  render(
    ctx,
    player,
    totalCheckpoints,
    activatedCount,
    collectedDocs = 0,
    totalDocs = 0,
    totalScore = 0,
  ) {
    const pad = HUD.PADDING;

    ctx.save();

    // --- Score Panel (Digital Clock) ---
    const scoreVal = totalScore;
    const scoreStr = scoreVal.toString().padStart(6, "0");

    const clockW = 120;
    const clockH = 28;

    // Posições origin (estáticas)
    const originClockX = pad;
    const originClockY = pad;

    // Determinar posição do painel: animada ou fixa
    let clockX, clockY, scale;
    if (this.scoreAnimState !== "idle") {
      clockX = this.panelX;
      clockY = this.panelY;
      scale = this.panelScale;
    } else {
      clockX = originClockX;
      clockY = originClockY;
      scale = 1;
    }

    // --- Desenha o painel do score com transformação ---
    ctx.save();
    ctx.translate(clockX + clockW / 2, clockY + clockH / 2);
    ctx.scale(scale, scale);
    ctx.translate(-clockW / 2, -clockH / 2);

    // Glow atrás do painel se animando
    if (this.scoreAnimState !== "idle") {
      ctx.shadowColor = "#10B981";
      ctx.shadowBlur = 25 * scale;
    }

    // Borda metálica exterior do relógio
    ctx.fillStyle = "#1F2937"; // cinza escuro
    ctx.beginPath();
    ctx.roundRect(0, 0, clockW, clockH, 8);
    ctx.fill();

    // Visor preto
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#020617";
    ctx.beginPath();
    ctx.roundRect(4, 4, clockW - 8, clockH - 8, 4);
    ctx.fill();

    // Reflexo sutil no visor
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.roundRect(4, 4, clockW - 8, (clockH - 8) / 2, 4);
    ctx.fill();

    // Texto Digital (Score)
    ctx.fillStyle = "#10B981"; // Verde LED
    ctx.shadowColor = "#10B981";
    ctx.shadowBlur = 8;
    ctx.font = `bold 10px ${HUD.FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText(`PTS ${scoreStr}`, clockW / 2, 19);

    // Reseta sombra
    ctx.shadowBlur = 0;

    ctx.restore(); // Desfaz transform do painel

    // Renderiza partículas do score (posição absoluta na tela)
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // --- Barra de progresso ---
    const barWidth = 200;
    const barHeight = 14;
    const barX = CANVAS.WIDTH - barWidth - pad;
    const barY = pad;
    const progress = Math.min(1, player.x / (WORLD.TOTAL_LENGTH - 200));

    // Fundo
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 7);
    ctx.fill();

    // Preenchimento
    const grad = ctx.createLinearGradient(
      barX,
      barY,
      barX + barWidth * progress,
      barY,
    );
    grad.addColorStop(0, "#22C55E");
    grad.addColorStop(1, "#4ADE80");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, 7);
    ctx.fill();

    // Borda
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 7);
    ctx.stroke();

    // Porcentagem
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold 9px ${HUD.FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText(
      `${Math.floor(progress * 100)}%`,
      barX + barWidth / 2,
      barY + barHeight - 3,
    );

    // --- Checkpoint counter & Document counter (lado a lado ou empilhados) ---
    const subW = (barWidth - 6) / 2;

    // 1) Checkpoint Counter
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.roundRect(barX, barY + barHeight + 6, subW, 20, 5);
    ctx.fill();

    ctx.fillStyle = "#FBBF24";
    ctx.font = `bold 10px ${HUD.FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText(
      `⚑ ${activatedCount}/${totalCheckpoints}`,
      barX + subW / 2,
      barY + barHeight + 20,
    );

    // 2) Document Counter (Papéis de Cartório / Certidões)
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.roundRect(barX + subW + 6, barY + barHeight + 6, subW, 20, 5);
    ctx.fill();

    ctx.fillStyle = "#60A5FA";
    ctx.font = `bold 10px ${HUD.FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText(
      `📜 ${collectedDocs}/${totalDocs}`,
      barX + subW + 6 + subW / 2,
      barY + barHeight + 20,
    );

    // --- Checkpoint flash text ---
    if (this.checkpointFlash > 0) {
      const alpha = Math.min(1, this.checkpointFlash);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#FBBF24";
      ctx.font = `bold 16px ${HUD.FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.fillText(this.checkpointText, CANVAS.WIDTH / 2, 60);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}
