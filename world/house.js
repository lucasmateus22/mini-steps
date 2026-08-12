// ============================================================
// house.js — Casa com porta animável
// ============================================================

import { WORLD } from "../config/gameMetrics.js";

const HOUSE_COLORS = [
  {
    wall: "#8f84f1ff",
    wallDark: "#5156a8ff",
    roof: "#DC2626",
    roofDark: "#991B1B",
    door: "#7C2D12",
  },
  {
    wall: "#F9A8D4",
    wallDark: "#EC4899",
    roof: "#7C3AED",
    roofDark: "#5B21B6",
    door: "#44403C",
  },
  {
    wall: "#86EFAC",
    wallDark: "#22C55E",
    roof: "#EA580C",
    roofDark: "#C2410C",
    door: "#3F3F46",
  },
  {
    wall: "#93C5FD",
    wallDark: "#3B82F6",
    roof: "#E11D48",
    roofDark: "#BE123C",
    door: "#5C4033",
  },
  {
    wall: "#dadadaff",
    wallDark: "#b4b4b4ff",
    roof: "#865048ff",
    roofDark: "#782504ff",
    door: "#a15529ff",
  },
  {
    wall: "#E2E8F0",
    wallDark: "#94A3B8",
    roof: "#6366F1",
    roofDark: "#4338CA",
    door: "#1C1917",
  },
];

export default class House {
  /**
   * @param {number} x - posição X no mundo
   * @param {boolean} isCheckpoint - se é uma casa de checkpoint
   * @param {number} checkpointIndex - índice do checkpoint (-1 se não for)
   * @param {number} seed - seed para variação visual
   */
  constructor(x, isCheckpoint = false, checkpointIndex = -1, seed = 0) {
    this.width = 100;
    this.height = 90;
    this.x = x;
    this.y = WORLD.GROUND_Y - this.height;
    this.isCheckpoint = isCheckpoint;
    this.checkpointIndex = checkpointIndex;
    this.activated = false;

    // Porta
    this.doorOpen = 0; // 0 = fechada, 1 = aberta
    this.doorWidth = 20;
    this.doorHeight = 34;

    // Variação visual
    const colorIdx = seed % HOUSE_COLORS.length;
    this.colors = HOUSE_COLORS[colorIdx];

    // Variação de tamanho
    this.roofHeight = 30 + (seed % 3) * 5;

    // Janelas
    this.hasLeftWindow = seed % 2 === 0;
    this.hasRightWindow = true;
  }

  openDoor(dt, speed = 2.5) {
    this.doorOpen = Math.min(1, this.doorOpen + speed * dt);
    return this.doorOpen >= 1;
  }

  closeDoor(dt, speed = 3) {
    this.doorOpen = Math.max(0, this.doorOpen - speed * dt);
    return this.doorOpen <= 0;
  }

  getDoorWorldPosition() {
    return {
      x: this.x + (this.width - this.doorWidth) / 2,
      y: this.y + this.height - this.doorHeight,
      width: this.doorWidth,
      height: this.doorHeight,
    };
  }

  getCheckpointTrigger() {
    if (!this.isCheckpoint) return null;
    return {
      x: this.x + this.width / 2 - 20,
      y: -1000, // Estende para o alto infinito
      width: 40,
      height: WORLD.GROUND_Y + 1000, // Desce até o chão
    };
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  render(ctx, camera) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;
    const w = this.width;
    const h = this.height;
    const c = this.colors;

    // --- Sombra ---
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(sx + 6, sy + h - 4, w, 8);

    // --- Paredes ---
    ctx.fillStyle = c.wall;
    ctx.fillRect(sx, sy + this.roofHeight, w, h - this.roofHeight);

    // Detalhe lateral escuro
    ctx.fillStyle = c.wallDark;
    ctx.fillRect(sx, sy + this.roofHeight, 4, h - this.roofHeight);
    ctx.fillRect(sx + w - 4, sy + this.roofHeight, 4, h - this.roofHeight);

    // --- Telhado (triângulo) ---
    ctx.fillStyle = c.roof;
    ctx.beginPath();
    ctx.moveTo(sx - 8, sy + this.roofHeight);
    ctx.lineTo(sx + w / 2, sy);
    ctx.lineTo(sx + w + 8, sy + this.roofHeight);
    ctx.closePath();
    ctx.fill();

    // Detalhe do telhado
    ctx.fillStyle = c.roofDark;
    ctx.beginPath();
    ctx.moveTo(sx - 8, sy + this.roofHeight);
    ctx.lineTo(sx + w / 2, sy);
    ctx.lineTo(sx + w / 2, sy + 6);
    ctx.lineTo(sx - 4, sy + this.roofHeight);
    ctx.closePath();
    ctx.fill();

    // --- Janelas ---
    const winSize = 16;
    const winY = sy + this.roofHeight + 12;

    if (this.hasLeftWindow) {
      this._drawWindow(ctx, sx + 12, winY, winSize);
    }
    if (this.hasRightWindow) {
      this._drawWindow(ctx, sx + w - 12 - winSize, winY, winSize);
    }

    // --- Porta ---
    const doorX = sx + (w - this.doorWidth) / 2;
    const doorY = sy + h - this.doorHeight;

    // Moldura da porta
    ctx.fillStyle = "#44403C";
    ctx.fillRect(doorX - 2, doorY - 2, this.doorWidth + 4, this.doorHeight + 2);

    // Interior (escuro, visível quando porta abre)
    ctx.fillStyle = "#1A1A1A";
    ctx.fillRect(doorX, doorY, this.doorWidth, this.doorHeight);

    // Porta (abre para a esquerda)
    if (this.doorOpen < 1) {
      const visibleDoor = this.doorWidth * (1 - this.doorOpen);
      ctx.fillStyle = c.door;
      ctx.fillRect(doorX, doorY, visibleDoor, this.doorHeight);

      // Maçaneta
      if (visibleDoor > 6) {
        ctx.fillStyle = "#EAB308";
        ctx.beginPath();
        ctx.arc(
          doorX + visibleDoor - 5,
          doorY + this.doorHeight / 2,
          2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    // --- Indicador de Checkpoint ---
    if (this.isCheckpoint && !this.activated) {
      // Brilho pulsante
      const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(250, 204, 21, ${pulse * 0.4})`;
      ctx.beginPath();
      ctx.arc(sx + w / 2, sy - 10, 12, 0, Math.PI * 2);
      ctx.fill();

      // Ícone de checkpoint
      ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚑", sx + w / 2, sy - 5);
    }

    if (this.isCheckpoint && this.activated) {
      ctx.fillStyle = "#22C55E";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✓", sx + w / 2, sy - 5);
    }
  }

  _drawWindow(ctx, x, y, size) {
    // Frame
    ctx.fillStyle = "#78716C";
    ctx.fillRect(x - 2, y - 2, size + 4, size + 4);

    // Glass
    ctx.fillStyle = "#BFDBFE";
    ctx.fillRect(x, y, size, size);

    // Cross divider
    ctx.fillStyle = "#78716C";
    ctx.fillRect(x + size / 2 - 1, y, 2, size);
    ctx.fillRect(x, y + size / 2 - 1, size, 2);

    // Reflection
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x + 2, y + 2, size / 2 - 3, size / 2 - 3);
  }
}
