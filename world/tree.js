// ============================================================
// tree.js — Árvores decorativas com variações visuais
// Sem animação de sway — estáticas.
// ============================================================

import { WORLD } from "../config/gameMetrics.js";

const TREE_TYPES = ["round", "pine", "palm", "bush"];

export default class Tree {
  /**
   * @param {number} x
   * @param {number} seed - para variação
   */
  constructor(x, seed = 0) {
    this.type = TREE_TYPES[seed % TREE_TYPES.length];
    this.x = x;

    // Tamanho variado
    this.scale = 0.7 + (seed % 5) * 0.15;
    this.trunkHeight = Math.floor(30 * this.scale);
    this.canopyRadius = Math.floor(24 * this.scale);

    this.height = this.trunkHeight + this.canopyRadius * 2;
    this.y = WORLD.GROUND_Y - this.height;
    this.width = this.canopyRadius * 2 + 10;

    // Cores com variação
    const greenVariant = seed % 3;
    this.leafColor = ["#22C55E", "#16A34A", "#4ADE80"][greenVariant];
    this.leafDark = ["#15803D", "#166534", "#16A34A"][greenVariant];
    this.trunkColor = "#92400E";
    this.trunkDark = "#78350F";
  }

  // Sem animação — update vazio
  update(_dt) {}

  render(ctx, camera) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;

    ctx.save();

    switch (this.type) {
      case "round":
        this._drawRound(ctx, sx, sy);
        break;
      case "pine":
        this._drawPine(ctx, sx, sy);
        break;
      case "palm":
        this._drawPalm(ctx, sx, sy);
        break;
      case "bush":
        this._drawBush(ctx, sx, sy);
        break;
    }

    ctx.restore();
  }

  _drawRound(ctx, sx, sy) {
    const cx = sx + this.width / 2;
    const trunkTop = sy + this.canopyRadius * 2;

    // Tronco
    ctx.fillStyle = this.trunkColor;
    ctx.fillRect(cx - 5, trunkTop, 10, this.trunkHeight);
    ctx.fillStyle = this.trunkDark;
    ctx.fillRect(cx - 5, trunkTop, 3, this.trunkHeight);

    // Copa (círculos sobrepostos)
    const r = this.canopyRadius;
    ctx.fillStyle = this.leafDark;
    ctx.beginPath();
    ctx.arc(cx - 6, sy + r + 4, r * 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.leafColor;
    ctx.beginPath();
    ctx.arc(cx, sy + r, r, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.arc(cx - 4, sy + r - 4, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawPine(ctx, sx, sy) {
    const cx = sx + this.width / 2;
    const base = sy + this.height;

    // Tronco
    ctx.fillStyle = this.trunkColor;
    ctx.fillRect(cx - 4, base - this.trunkHeight, 8, this.trunkHeight);

    // Camadas de triângulos
    const layers = 3;
    const layerH = (this.height - this.trunkHeight) / layers;

    for (let i = 0; i < layers; i++) {
      const ly = sy + i * layerH * 0.7;
      const lw = this.canopyRadius * 2 * (1 - i * 0.2);

      ctx.fillStyle = i === 0 ? this.leafDark : this.leafColor;
      ctx.beginPath();
      ctx.moveTo(cx, ly);
      ctx.lineTo(cx - lw / 2, ly + layerH + 6);
      ctx.lineTo(cx + lw / 2, ly + layerH + 6);
      ctx.closePath();
      ctx.fill();
    }
  }

  _drawPalm(ctx, sx, sy) {
    const cx = sx + this.width / 2;
    const base = sy + this.height;

    // Tronco curvo
    ctx.strokeStyle = this.trunkColor;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx, base);
    ctx.quadraticCurveTo(
      cx + 8,
      sy + this.height * 0.5,
      cx,
      sy + this.canopyRadius,
    );
    ctx.stroke();

    // Detalhes do tronco
    ctx.strokeStyle = this.trunkDark;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const ty = base - (i + 1) * (this.trunkHeight / 5);
      ctx.beginPath();
      ctx.moveTo(cx - 3, ty);
      ctx.lineTo(cx + 5, ty);
      ctx.stroke();
    }

    // Folhas de palmeira (estáticas)
    const topX = cx;
    const topY = sy + this.canopyRadius;
    const angles = [-0.8, -0.3, 0.3, 0.8, -1.2, 1.2];

    for (const angle of angles) {
      ctx.strokeStyle = this.leafColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      const endX =
        topX + Math.cos(angle - Math.PI / 2) * this.canopyRadius * 1.5;
      const endY =
        topY + Math.sin(angle - Math.PI / 2) * this.canopyRadius * 0.8 + 10;
      ctx.quadraticCurveTo(topX + (endX - topX) * 0.5, topY - 10, endX, endY);
      ctx.stroke();
    }
  }

  _drawBush(ctx, sx, sy) {
    const cx = sx + this.width / 2;
    const r = this.canopyRadius * 0.7;
    const baseY = sy + this.height;

    // Arbustos (múltiplos círculos)
    ctx.fillStyle = this.leafDark;
    ctx.beginPath();
    ctx.arc(cx - r * 0.6, baseY - r, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + r * 0.6, baseY - r, r * 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.leafColor;
    ctx.beginPath();
    ctx.arc(cx, baseY - r * 1.1, r, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(cx - 3, baseY - r * 1.4, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}
