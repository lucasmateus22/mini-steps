// ============================================================
// dialogBox.js — Caixa de diálogo temporizada com fade
// ============================================================

import { DIALOG, CANVAS, HUD } from '../config/gameMetrics.js';

export default class DialogBox {
  constructor() {
    this.active = false;
    this.text = '';
    this.timer = 0;
    this.duration = 0;
    this.opacity = 0;
    this.fadeState = 'none'; // none | fadeIn | visible | fadeOut
    this.onComplete = null;
  }

  /**
   * Exibe uma mensagem temporizada.
   * @param {string} text
   * @param {number} duration - ms
   * @param {Function} [onComplete]
   */
  show(text, duration, onComplete = null) {
    this.active = true;
    this.text = text;
    this.duration = duration;
    this.timer = 0;
    this.opacity = 0;
    this.fadeState = 'fadeIn';
    this.onComplete = onComplete;
  }

  hide() {
    this.fadeState = 'fadeOut';
  }

  update(dt) {
    if (!this.active) return;

    const fadeDur = DIALOG.FADE_DURATION / 1000;

    switch (this.fadeState) {
      case 'fadeIn':
        this.opacity = Math.min(1, this.opacity + dt / fadeDur);
        if (this.opacity >= 1) {
          this.fadeState = 'visible';
          this.timer = 0;
        }
        break;

      case 'visible':
        this.timer += dt * 1000;
        if (this.timer >= this.duration) {
          this.fadeState = 'fadeOut';
        }
        break;

      case 'fadeOut':
        this.opacity = Math.max(0, this.opacity - dt / fadeDur);
        if (this.opacity <= 0) {
          this.active = false;
          this.fadeState = 'none';
          if (this.onComplete) {
            this.onComplete();
            this.onComplete = null;
          }
        }
        break;
    }
  }

  render(ctx) {
    if (!this.active || this.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    const w = DIALOG.WIDTH;
    const h = DIALOG.HEIGHT;
    const x = (CANVAS.WIDTH - w) / 2;
    const y = CANVAS.HEIGHT / 2 - h / 2 - 40;

    // Fundo
    ctx.fillStyle = DIALOG.BG_COLOR;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();

    // Borda
    ctx.strokeStyle = DIALOG.BORDER_COLOR;
    ctx.lineWidth = DIALOG.BORDER_WIDTH;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.stroke();

    // Brilho sutil no topo
    const gradient = ctx.createLinearGradient(x, y, x, y + 20);
    gradient.addColorStop(0, 'rgba(255,255,255,0.08)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 20, [10, 10, 0, 0]);
    ctx.fill();

    // Texto
    ctx.fillStyle = DIALOG.TEXT_COLOR;
    ctx.font = `${HUD.FONT_SIZE + 2}px ${HUD.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Word wrap simples
    const words = this.text.split(' ');
    const lines = [];
    let currentLine = '';
    const maxWidth = w - 40;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = HUD.FONT_SIZE + 8;
    const totalHeight = lines.length * lineHeight;
    const startY = y + (h - totalHeight) / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, x + w / 2, startY + i * lineHeight);
    });

    ctx.restore();
  }
}
