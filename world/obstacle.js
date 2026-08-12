// ============================================================
// obstacle.js — Obstáculos: cactos, pedras, rios, áreas de perigo
// ============================================================

import { WORLD, OBSTACLE_METRICS } from "../config/gameMetrics.js";

export default class Obstacle {
  /**
   * @param {number} x
   * @param {'cactus'|'rock'|'river'|'dangerZone'} type
   * @param {number} seed
   */
  constructor(x, type, seed = 0) {
    this.x = x;
    this.type = type;
    this.seed = seed;
    this.waterFrame = 0;

    switch (type) {
      case "cactus":
        this.width = OBSTACLE_METRICS.CACTUS_WIDTH;
        this.height = OBSTACLE_METRICS.CACTUS_HEIGHT;
        this.y = WORLD.GROUND_Y - this.height;
        this.solid = true;
        this.deadly = true;
        break;

      case "rock":
        this.width = OBSTACLE_METRICS.ROCK_WIDTH;
        this.height = OBSTACLE_METRICS.ROCK_HEIGHT;
        this.y = WORLD.GROUND_Y - this.height;
        this.solid = true;
        this.deadly = false;
        break;

      case "river":
        this.width = OBSTACLE_METRICS.RIVER_WIDTH;
        this.height = OBSTACLE_METRICS.RIVER_DEPTH;
        this.y = WORLD.GROUND_Y;
        this.solid = false;
        this.deadly = true;
        this.isRiver = true;
        break;

      case "dangerZone":
        this.width = OBSTACLE_METRICS.DANGER_ZONE_WIDTH;
        this.height = 10;
        this.y = WORLD.GROUND_Y - this.height;
        this.solid = false;
        this.deadly = true;
        break;
    }
  }

  update(dt) {
    if (this.type === "river") {
      this.waterFrame += dt * 2;
    }
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  // Bounds usados para colisão (pode diferir visualmente)
  getCollisionBounds() {
    if (this.type === "river") {
      // Trigger zone mais abaixo do nível do chão para o jogador ter que cair nela
      return {
        x: this.x + 10,
        y: WORLD.GROUND_Y + 5, // Antes era GROUND_Y - 10 (acima do chão)
        width: this.width - 20,
        height: 20,
      };
    }
    if (this.type === "dangerZone") {
      return {
        x: this.x + 4,
        y: this.y,
        width: this.width - 8,
        height: this.height,
      };
    }
    return this.getBounds();
  }

  render(ctx, camera) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;

    switch (this.type) {
      case "cactus":
        this._drawCactus(ctx, sx, sy);
        break;
      case "rock":
        this._drawRock(ctx, sx, sy);
        break;
      case "river":
        this._drawRiver(ctx, sx, sy);
        break;
      case "dangerZone":
        this._drawDangerZone(ctx, sx, sy);
        break;
    }
  }

  _drawCactus(ctx, sx, sy) {
    const w = this.width;
    const h = this.height;

    // Corpo principal
    ctx.fillStyle = "#15803D";
    ctx.fillRect(sx + w / 2 - 4, sy, 8, h);

    // Braço esquerdo
    ctx.fillRect(sx, sy + 10, w / 2 - 4, 6);
    ctx.fillRect(sx, sy + 4, 6, 12);

    // Braço direito
    ctx.fillRect(sx + w / 2 + 4, sy + 16, w / 2 - 4, 6);
    ctx.fillRect(sx + w - 6, sy + 10, 6, 12);

    // Highlight
    ctx.fillStyle = "#129642ff";
    ctx.fillRect(sx + w / 2 - 2, sy + 2, 3, h - 4);

    // Espinhos
    ctx.strokeStyle = "#A3E635";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const ey = sy + 6 + i * 8;
      ctx.beginPath();
      ctx.moveTo(sx + w / 2 + 4, ey);
      ctx.lineTo(sx + w / 2 + 8, ey - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + w / 2 - 4, ey + 3);
      ctx.lineTo(sx + w / 2 - 8, ey + 1);
      ctx.stroke();
    }
  }

  _drawRock(ctx, sx, sy) {
    const w = this.width;
    const h = this.height;

    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.beginPath();
    ctx.ellipse(sx + w / 2 + 3, sy + h, w / 2 + 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo da pedra
    ctx.fillStyle = "#78716C";
    ctx.beginPath();
    ctx.moveTo(sx + 4, sy + h);
    ctx.lineTo(sx, sy + h * 0.6);
    ctx.lineTo(sx + w * 0.3, sy);
    ctx.lineTo(sx + w * 0.7, sy + 2);
    ctx.lineTo(sx + w, sy + h * 0.5);
    ctx.lineTo(sx + w - 2, sy + h);
    ctx.closePath();
    ctx.fill();

    // Highlight
    ctx.fillStyle = "#A8A29E";
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.3, sy + 2);
    ctx.lineTo(sx + w * 0.5, sy + h * 0.3);
    ctx.lineTo(sx + w * 0.7, sy + 4);
    ctx.closePath();
    ctx.fill();

    // Detalhes/rachaduras
    ctx.strokeStyle = "#57534E";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + w * 0.4, sy + h * 0.3);
    ctx.lineTo(sx + w * 0.5, sy + h * 0.7);
    ctx.stroke();
  }

  _drawRiver(ctx, sx, sy) {
    const w = this.width;
    const h = 2000; // Estende até o fundo infinito para telas altas

    // Fundo do buraco (terra escura)
    ctx.fillStyle = "#5C3A21";
    ctx.fillRect(sx, sy, w, h);

    // Água
    const waterTop = sy + 10; // 0px abaixo do nível do chão (alinha com a grama)
    const waterHeight = h; // Fundo da água estendido pra baixo do chão

    // Gradiente da água
    const grad = ctx.createLinearGradient(
      0,
      waterTop,
      0,
      waterTop + waterHeight,
    );
    grad.addColorStop(0, "#38BDF8");
    grad.addColorStop(1, "#0284C7");
    ctx.fillStyle = grad;
    // Preenche exatamente o gap (sx até sx+w)
    ctx.fillRect(sx, waterTop, w, waterHeight);

    // Superfície da água
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(sx, waterTop, w, 3);

    // Ondas animadas (três camadas)
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle =
        i === 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)";
      const wy = waterTop + 10 + i * 15;
      ctx.beginPath();
      // As ondas cobrem exatamente o gap de px = 0 até px = w
      for (let px = 0; px <= w; px += 4) {
        const wave = Math.sin((px + this.waterFrame * 30 + i * 15) * 0.1) * 2;
        if (px === 0) ctx.moveTo(sx + px, wy + wave);
        else ctx.lineTo(sx + px, wy + wave);
      }
      ctx.stroke();
    }
  }

  _drawDangerZone(ctx, sx, sy) {
    const w = this.width;
    const h = this.height;

    // Base metálica escura
    ctx.fillStyle = "#374151";
    ctx.fillRect(sx, sy + h - 2, w, 2);

    const spikeWidth = 10;
    for (let i = 0; i < w; i += spikeWidth) {
      // Triângulo do espinho
      ctx.beginPath();
      ctx.moveTo(sx + i, sy + h); // Base esquerda
      ctx.lineTo(sx + i + spikeWidth / 2, sy); // Ponta (para cima)
      ctx.lineTo(sx + i + spikeWidth, sy + h); // Base direita
      ctx.closePath();

      ctx.fillStyle = "#9CA3AF"; // Lado claro do metal
      ctx.fill();

      // Sombra para dar volume (metade direita do espinho)
      ctx.beginPath();
      ctx.moveTo(sx + i + spikeWidth / 2, sy); // Ponta
      ctx.lineTo(sx + i + spikeWidth, sy + h); // Base direita
      ctx.lineTo(sx + i + spikeWidth / 2, sy + h); // Meio da base
      ctx.closePath();

      ctx.fillStyle = "#4B5563"; // Sombra
      ctx.fill();

      // Contorno
      ctx.strokeStyle = "#1F2937";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + i, sy + h);
      ctx.lineTo(sx + i + spikeWidth / 2, sy);
      ctx.lineTo(sx + i + spikeWidth, sy + h);
      ctx.stroke();
    }
  }
}
