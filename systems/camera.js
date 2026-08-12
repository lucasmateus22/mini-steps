// ============================================================
// camera.js — Câmera com scroll horizontal suavizado
// ============================================================

import { CANVAS, WORLD } from '../config/gameMetrics.js';

export default class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.smoothing = 5;  // fator de suavização (lerp speed)
  }

  /**
   * Segue o alvo (geralmente o player).
   * @param {{ x: number, y: number, width: number, height: number }} target
   * @param {number} dt
   */
  follow(target, dt) {
    // Centralizar horizontalmente no alvo
    this.targetX = target.x + target.width / 2 - CANVAS.WIDTH / 2 + 100;
    
    // Centralizar o chão na parte inferior da tela (80% da altura)
    // Isso garante que o chão seja sempre visível não importando a proporção da tela
    this.targetY = WORLD.GROUND_Y - CANVAS.HEIGHT * 0.8;

    // Lerp suave
    this.x += (this.targetX - this.x) * this.smoothing * dt;
    this.y += (this.targetY - this.y) * this.smoothing * dt;

    // Clamp nos limites do mundo
    this.x = Math.max(0, Math.min(this.x, WORLD.TOTAL_LENGTH - CANVAS.WIDTH));
    // Removemos o clamp de Y para permitir telas altas (onde Y seria negativo)
  }

  /**
   * Converte coordenada do mundo para tela.
   */
  worldToScreen(worldX, worldY) {
    return {
      x: worldX - this.x,
      y: worldY - this.y,
    };
  }

  /**
   * Verifica se um retângulo é visível na tela.
   */
  isVisible(x, y, width, height) {
    return (
      x + width > this.x &&
      x < this.x + CANVAS.WIDTH &&
      y + height > this.y &&
      y < this.y + CANVAS.HEIGHT
    );
  }
}
