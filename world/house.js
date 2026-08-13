// ============================================================
// house.js — Casa com porta animável
// ============================================================

import { WORLD, CHECKPOINT } from "../config/gameMetrics.js";

// Pré-carregamento das imagens de checkpoint (globais para evitar recriação)
const checkpointInactiveImg = new Image();
checkpointInactiveImg.src = CHECKPOINT.IMAGE_INACTIVE_SRC;

const checkpointActiveImg = new Image();
checkpointActiveImg.src = CHECKPOINT.IMAGE_ACTIVE_SRC;

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
    if (this.isCheckpoint) {
      // Cartório: Fachada nobre clássica (mármore/pedra nobre)
      ctx.fillStyle = "#F8FAFC"; // Base mármore claro
      ctx.fillRect(sx, sy + this.roofHeight, w, h - this.roofHeight);

      // Base e rodapé de pedra nobre
      ctx.fillStyle = "#CBD5E1";
      ctx.fillRect(sx, sy + h - 6, w, 6);
      ctx.fillStyle = "#94A3B8";
      ctx.fillRect(sx, sy + h - 2, w, 2);

      // Colunas clássicas estilizadas nas laterais
      const colW = 10;
      // Coluna Esquerda
      this._drawClassicalColumn(
        ctx,
        sx + 5,
        sy + this.roofHeight,
        colW,
        h - this.roofHeight - 6,
      );
      // Coluna Direita
      this._drawClassicalColumn(
        ctx,
        sx + w - 15,
        sy + this.roofHeight,
        colW,
        h - this.roofHeight - 6,
      );

      // --- Telhado Clássico Imponente (Frontão) ---
      ctx.fillStyle = "#1E3A8A"; // Azul real nobre
      ctx.beginPath();
      ctx.moveTo(sx - 10, sy + this.roofHeight);
      ctx.lineTo(sx + w / 2, sy - 2);
      ctx.lineTo(sx + w + 10, sy + this.roofHeight);
      ctx.closePath();
      ctx.fill();

      // Friso e beiral dourado do telhado
      ctx.fillStyle = "#F59E0B";
      ctx.fillRect(sx - 10, sy + this.roofHeight - 3, w + 20, 4);

      // Sombra e relevo do frontão
      ctx.fillStyle = "#172554";
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy + this.roofHeight - 3);
      ctx.lineTo(sx + w / 2, sy);
      ctx.lineTo(sx + w / 2, sy + 6);
      ctx.lineTo(sx - 3, sy + this.roofHeight - 3);
      ctx.closePath();
      ctx.fill();

      // Emblema circular no centro do frontão (tímpano)
      const apexX = sx + w / 2;
      const apexY = sy + this.roofHeight / 2 + 2;
      ctx.fillStyle = "#FBBF24";
      ctx.beginPath();
      ctx.arc(apexX, apexY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#D97706";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#1E3A8A";
      ctx.beginPath();
      ctx.arc(apexX, apexY, 3, 0, Math.PI * 2);
      ctx.fill();

      // --- Placa de Fachada "CARTÓRIO" (acima da porta, abaixo do teto) ---
      const signW = 68;
      const signH = 10;
      const signX = sx + (w - signW) / 2;
      const signY = sy + this.roofHeight + 6;

      // Sombra da placa
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.fillRect(signX + 1, signY + 1, signW, signH);

      // Fundo nobre da placa (azul marinho profundo / dourado)
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(signX, signY, signW, signH);

      // Moldura dourada elegante
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(signX + 0.5, signY + 0.5, signW - 1, signH - 1);

      // Cantos dourados detalhados
      ctx.fillStyle = "#FDE047";
      ctx.fillRect(signX + 1, signY + 1, 2, 2);
      ctx.fillRect(signX + signW - 3, signY + 1, 2, 2);
      ctx.fillRect(signX + 1, signY + signH - 3, 2, 2);
      ctx.fillRect(signX + signW - 3, signY + signH - 3, 2, 2);

      // Texto "CARTÓRIO" nítido e centralizado
      ctx.fillStyle = "#FEF08A";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("CARTÓRIO", signX + signW / 2, signY + signH / 2 + 0.5);

      // Janelas do Cartório (com moldura clássica)
      const winSize = 14;
      const winY = sy + this.roofHeight + 24;
      this._drawClassicalCartorioWindow(ctx, sx + 18, winY, winSize);
      this._drawClassicalCartorioWindow(
        ctx,
        sx + w - 18 - winSize,
        winY,
        winSize,
      );

      // Lanternas / arandelas laterais da porta
      const doorX = sx + (w - this.doorWidth) / 2;
      const doorY = sy + h - this.doorHeight;
      this._drawLantern(ctx, doorX - 8, doorY + 6);
      this._drawLantern(ctx, doorX + this.doorWidth + 4, doorY + 6);
    } else {
      // Casa Comum Residencial
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
    }

    // --- Porta ---
    const doorX = sx + (w - this.doorWidth) / 2;
    const doorY = sy + h - this.doorHeight;

    // Moldura da porta
    ctx.fillStyle = this.isCheckpoint ? "#78350F" : "#44403C";
    ctx.fillRect(doorX - 2, doorY - 2, this.doorWidth + 4, this.doorHeight + 2);

    // Interior (escuro, visível quando porta abre)
    ctx.fillStyle = "#1A1A1A";
    ctx.fillRect(doorX, doorY, this.doorWidth, this.doorHeight);

    // Porta (abre para a esquerda)
    if (this.doorOpen < 1) {
      const visibleDoor = this.doorWidth * (1 - this.doorOpen);
      ctx.fillStyle = this.isCheckpoint ? "#92400E" : c.door;
      ctx.fillRect(doorX, doorY, visibleDoor, this.doorHeight);

      // Frisos decorativos da porta de madeira nobre do cartório
      if (this.isCheckpoint && visibleDoor > 10) {
        ctx.fillStyle = "#78350F";
        ctx.fillRect(doorX + 3, doorY + 4, visibleDoor - 6, 10);
        ctx.fillRect(doorX + 3, doorY + 18, visibleDoor - 6, 12);
      }

      // Maçaneta dourada
      if (visibleDoor > 6) {
        ctx.fillStyle = "#FBBF24";
        ctx.beginPath();
        ctx.arc(
          doorX + visibleDoor - 4,
          doorY + this.doorHeight / 2,
          2.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    // --- Indicador de Checkpoint ---
    if (this.isCheckpoint && !this.activated) {
      // Efeito de flutuação (bounce) sutil e elegante
      const bounce = Math.sin(Date.now() / 250) * 3;

      if (
        checkpointInactiveImg.complete &&
        checkpointInactiveImg.naturalWidth !== 0
      ) {
        const imgW = 28; // tamanho premium
        const imgH = 28;
        ctx.drawImage(
          checkpointInactiveImg,
          sx + w / 2 - imgW / 2,
          sy - imgH - 12 + bounce,
          imgW,
          imgH,
        );
      } else {
        // Fallback vetorial original
        const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(250, 204, 21, ${pulse * 0.4})`;
        ctx.beginPath();
        ctx.arc(sx + w / 2, sy - 14 + bounce, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("⚑", sx + w / 2, sy - 9 + bounce);
      }
    }

    if (this.isCheckpoint && this.activated) {
      const bounce = Math.sin(Date.now() / 250) * 1.5;

      if (
        checkpointActiveImg.complete &&
        checkpointActiveImg.naturalWidth !== 0
      ) {
        const imgW = 28;
        const imgH = 28;
        ctx.drawImage(
          checkpointActiveImg,
          sx + w / 2 - imgW / 2,
          sy - imgH - 12 + bounce,
          imgW,
          imgH,
        );
      } else {
        ctx.fillStyle = "#22C55E";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("✓", sx + w / 2, sy - 9 + bounce);
      }
    }
  }

  _drawClassicalColumn(ctx, x, y, width, height) {
    // Capitel (topo)
    ctx.fillStyle = "#E2E8F0";
    ctx.fillRect(x - 2, y, width + 4, 3);
    ctx.fillStyle = "#CBD5E1";
    ctx.fillRect(x - 1, y + 3, width + 2, 2);

    // Fuste (corpo da coluna com caneluras)
    ctx.fillStyle = "#F1F5F9";
    ctx.fillRect(x, y + 5, width, height - 10);
    // Linha de sombra da coluna
    ctx.fillStyle = "#CBD5E1";
    ctx.fillRect(x + width - 3, y + 5, 2, height - 10);
    // Linha de luz
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x + 1, y + 5, 2, height - 10);

    // Base (fundo)
    ctx.fillStyle = "#CBD5E1";
    ctx.fillRect(x - 1, y + height - 5, width + 2, 2);
    ctx.fillStyle = "#94A3B8";
    ctx.fillRect(x - 2, y + height - 3, width + 4, 3);
  }

  _drawClassicalCartorioWindow(ctx, x, y, size) {
    // Moldura de pedra com arco
    ctx.fillStyle = "#CBD5E1";
    ctx.fillRect(x - 2, y - 2, size + 4, size + 4);

    // Vidro azulado nobre
    ctx.fillStyle = "#93C5FD";
    ctx.fillRect(x, y, size, size);

    // Grade dourada/bronze
    ctx.fillStyle = "#78350F";
    ctx.fillRect(x + size / 2 - 0.75, y, 1.5, size);
    ctx.fillRect(x, y + size / 2 - 0.75, size, 1.5);

    // Reflexo de luz no vidro
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.fillRect(x + 2, y + 2, size / 2 - 3, size / 2 - 3);
  }

  _drawLantern(ctx, x, y) {
    // Suporte de ferro
    ctx.fillStyle = "#334155";
    ctx.fillRect(x, y, 4, 1);
    ctx.fillRect(x + 1, y + 1, 2, 2);

    // Corpo da lanterna
    ctx.fillStyle = "#475569";
    ctx.fillRect(x - 1, y + 3, 6, 8);

    // Luz âmbar aconchegante
    ctx.fillStyle = "#FDE047";
    ctx.fillRect(x, y + 4, 4, 5);

    // Ponto de brilho quente
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x + 1, y + 5, 2, 2);
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
