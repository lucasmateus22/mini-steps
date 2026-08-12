// ============================================================
// flag.js — Bandeiras de Início e Fim de fase
// ============================================================

import { FLAG, WORLD } from '../config/gameMetrics.js';

export default class Flag {
  /**
   * @param {number} x - posição X no mundo
   * @param {'start'|'end'} type
   */
  constructor(x, type) {
    this.x = x;
    this.y = WORLD.GROUND_Y - FLAG.HEIGHT;
    this.width = FLAG.WIDTH;
    this.height = FLAG.HEIGHT;
    this.type = type;
    this.color = type === 'start' ? FLAG.START_COLOR : FLAG.END_COLOR;
    this.waveTimer = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.waveTimer += dt * 3;
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  render(ctx, camera) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;
    const w = this.width;
    const h = this.height;

    // Mastro
    ctx.fillStyle = '#78716C';
    ctx.fillRect(sx + 2, sy, 4, h);

    // Base do mastro
    ctx.fillStyle = '#57534E';
    ctx.fillRect(sx - 2, sy + h - 6, 12, 6);

    // Bandeira (tecido ondulante)
    const wave = Math.sin(this.waveTimer) * 3;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(sx + 6, sy + 4);
    ctx.quadraticCurveTo(sx + 6 + w * 0.5, sy + 10 + wave, sx + 6 + w - 8, sy + 4);
    ctx.lineTo(sx + 6 + w - 8, sy + 22);
    ctx.quadraticCurveTo(sx + 6 + w * 0.5, sy + 28 - wave, sx + 6, sy + 22);
    ctx.closePath();
    ctx.fill();

    // Borda da bandeira
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Estrela / ícone
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.type === 'start' ? '▶' : '★', sx + 6 + (w - 8) / 2, sy + 17);
  }
}
