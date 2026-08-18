// ============================================================
// camera.js — Câmera com scroll horizontal suavizado e zoom
// ============================================================

import { CANVAS, WORLD, CAMERA } from '../config/gameMetrics.js';

export default class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.smoothing = 5;  // fator de suavização (lerp speed)
    this.zoom = CAMERA.ZOOM; // nível de zoom responsivo
  }

  /** Largura efetiva do viewport (descontando zoom) */
  get viewWidth() {
    return CANVAS.WIDTH / this.zoom;
  }

  /** Altura efetiva do viewport (descontando zoom) */
  get viewHeight() {
    return CANVAS.HEIGHT / this.zoom;
  }

  /**
   * Segue o alvo (geralmente o player).
   * @param {{ x: number, y: number, width: number, height: number }} target
   * @param {number} dt
   */
  follow(target, dt) {
    // Centralizar horizontalmente no alvo (viewport efetivo)
    this.targetX = target.x + target.width / 2 - this.viewWidth / 2 + 100;
    
    // Centralizar o chão na parte inferior da tela (80% da altura efetiva)
    this.targetY = WORLD.GROUND_Y - this.viewHeight * 0.8;

    // Lerp suave
    this.x += (this.targetX - this.x) * this.smoothing * dt;
    this.y += (this.targetY - this.y) * this.smoothing * dt;

    // Clamp nos limites do mundo (usando viewport efetivo)
    this.x = Math.max(0, Math.min(this.x, WORLD.TOTAL_LENGTH - this.viewWidth));
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
   * Verifica se um retângulo é visível na tela (usando viewport efetivo).
   */
  isVisible(x, y, width, height) {
    return (
      x + width > this.x &&
      x < this.x + this.viewWidth &&
      y + height > this.y &&
      y < this.y + this.viewHeight
    );
  }
}
