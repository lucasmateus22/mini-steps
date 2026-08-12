// ============================================================
// player.js — Classe Player
// Movimentação, física e renderização do personagem.
// Usa characterConfig para paleta visual.
// Vida única — sem sistema de corações/invencibilidade.
// ============================================================

import { PLAYER, PHYSICS, WORLD } from "../config/gameMetrics.js";
import characterConfig from "../config/characterConfig.js";

export default class Player {
  constructor() {
    this.x = PLAYER.SPAWN_X;
    this.y = PLAYER.SPAWN_Y;
    this.width = PLAYER.WIDTH;
    this.height = PLAYER.HEIGHT;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1; // 1 = direita, -1 = esquerda
    this.alive = true;
    this.controlEnabled = true;
    this.visible = true;

    // Animação
    this.walkFrame = 0;
    this.walkTimer = 0;
    this.state = "idle"; // idle | walk | jump | dead

    // Checkpoint
    this.lastCheckpointX = PLAYER.SPAWN_X;
    this.lastCheckpointY = PLAYER.SPAWN_Y;
  }

  // --- Input Processing ---
  handleInput(input) {
    if (!this.controlEnabled || !this.alive) return;

    if (input.left) {
      this.vx = -PLAYER.SPEED;
      this.facing = -1;
      this.state = this.onGround ? "walk" : "jump";
    } else if (input.right) {
      this.vx = PLAYER.SPEED;
      this.facing = 1;
      this.state = this.onGround ? "walk" : "jump";
    } else {
      this.vx = 0;
      this.state = this.onGround ? "idle" : "jump";
    }

    if (input.jump && this.onGround) {
      this.vy = PLAYER.JUMP_FORCE;
      this.onGround = false;
      this.state = "jump";
    }
  }

  // --- Physics Update ---
  update(dt) {
    if (!this.alive) return;

    // Gravidade
    this.vy += PHYSICS.GRAVITY * dt;

    // Posição
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Limite esquerdo do mundo
    if (this.x < 0) this.x = 0;

    // Animação de caminhada
    if (this.state === "walk") {
      this.walkTimer += dt;
      if (this.walkTimer > 0.12) {
        this.walkTimer = 0;
        this.walkFrame = (this.walkFrame + 1) % 4;
      }
    } else {
      this.walkFrame = 0;
      this.walkTimer = 0;
    }
  }

  // --- Respawn no último checkpoint ---
  respawn() {
    this.x = this.lastCheckpointX;
    this.y = this.lastCheckpointY;
    this.vx = 0;
    this.vy = 0;
    this.alive = true;
    this.visible = true;
    this.controlEnabled = true;
    this.onGround = false;
    this.state = "idle";
  }

  // --- Morte ---
  die() {
    this.alive = false;
    this.state = "dead";
    this.vx = 0;
    this.vy = 0;
  }

  // --- Salvar checkpoint ---
  saveCheckpoint(x, y) {
    this.lastCheckpointX = x;
    this.lastCheckpointY = y;
  }

  // --- Bounding Box ---
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  // --- Renderização ---
  render(ctx, camera) {
    if (!this.visible) return;

    const sx = this.x - camera.x;
    const sy = this.y - camera.y;
    const c = characterConfig;
    const f = this.facing;
    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.translate(sx + w / 2, sy);

    // Sombra no chão (não é espelhada com o f)
    const distToGround = WORLD.GROUND_Y - (this.y + this.height);
    if (distToGround >= -5) { // Se não tiver caído no buraco
      const shadowScale = Math.max(0.3, 1 - distToGround / 150);
      const shadowAlpha = Math.max(0.05, 0.2 - (distToGround / 150) * 0.15);
      
      ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
      ctx.beginPath();
      // O chão relativo ao transform atual fica em WORLD.GROUND_Y - this.y
      ctx.ellipse(0, WORLD.GROUND_Y - this.y, 12 * shadowScale, 3 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.scale(f, 1); // Espelha tudo baseado pra onde olha
    ctx.translate(-w / 2, 0);

    // Variáveis de Animação
    let walkSwing = 0;
    if (this.state === "walk") {
      if (this.walkFrame === 1) walkSwing = 1;
      else if (this.walkFrame === 3) walkSwing = -1;
    } else if (this.state === "jump") {
      walkSwing = 0.5;
    }

    // --- Braço de Trás (Esquerdo) ---
    ctx.fillStyle = c.skinColor;
    const backArmX = 14 + walkSwing * -4;
    const backArmY = 16;
    ctx.beginPath();
    ctx.roundRect(backArmX - 2, backArmY, 4, 12, 2);
    ctx.fill();

    // --- Pernas ---
    const legW = 6;
    const legH = 16;
    const legY = h - legH; // 32

    let leftLegRot = 0;
    let rightLegRot = 0;
    let leftKneeBend = 0;
    let rightKneeBend = 0;

    if (this.state === "walk") {
      if (this.walkFrame === 1) {
        leftLegRot = -0.3;
        rightLegRot = 0.4;
        leftKneeBend = -2;
      } else if (this.walkFrame === 3) {
        leftLegRot = 0.4;
        rightLegRot = -0.3;
        rightKneeBend = -2;
      }
    } else if (this.state === "jump") {
      leftLegRot = -0.1;
      rightLegRot = 0.3;
      leftKneeBend = -2;
      rightKneeBend = -4;
    }

    const drawLeg = (baseX, rot, kneeLift, color, shoeColor) => {
      ctx.save();
      ctx.translate(baseX, legY);
      ctx.rotate(rot);
      // Perna
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-legW / 2, 0, legW, legH + kneeLift, 2);
      ctx.fill();
      // Sapato
      ctx.fillStyle = shoeColor;
      ctx.beginPath();
      ctx.roundRect(-legW / 2 - 2, legH + kneeLift - 4, legW + 5, 6, 2);
      ctx.fill();
      ctx.restore();
    };

    // Perna direita (trás)
    drawLeg(14 + 3, rightLegRot, rightKneeBend, c.pantsColor, c.shoeColor);
    // Perna esquerda (frente)
    drawLeg(14 - 3, leftLegRot, leftKneeBend, c.pantsColor, c.shoeColor);

    // --- Tronco ---
    const torsoW = 14;
    const torsoH = 18;
    const torsoX = 14 - torsoW / 2;
    const torsoY = 15;

    // Camisa
    ctx.fillStyle = c.shirtColor;
    ctx.beginPath();
    ctx.roundRect(torsoX, torsoY, torsoW, torsoH, 3);
    ctx.fill();

    // Colete
    ctx.fillStyle = c.vestColor;
    ctx.beginPath();
    ctx.roundRect(torsoX, torsoY, 4, torsoH, { tl: 3, bl: 3 });
    ctx.roundRect(torsoX + torsoW - 5, torsoY, 5, torsoH, { tr: 3, br: 3 });
    ctx.fill();

    // Cinto com Fivela
    ctx.fillStyle = "#4B2E10"; // Cinto
    ctx.fillRect(torsoX, torsoY + torsoH - 4, torsoW, 3);
    ctx.fillStyle = "#FBBF24"; // Fivela de Ouro
    ctx.fillRect(torsoX + torsoW / 2 - 2, torsoY + torsoH - 5, 4, 5);

    // --- Cabeça ---
    const headSize = 16;
    const headX = 14 - headSize / 2;
    const headY = 1;

    ctx.fillStyle = c.skinColor;
    ctx.beginPath();
    ctx.roundRect(headX, headY, headSize, headSize, 6);
    ctx.fill();

    // Sombra do pescoço
    ctx.fillStyle = c.skinHighlight;
    ctx.beginPath();
    ctx.roundRect(headX, headY + headSize - 4, headSize, 4, { bl: 6, br: 6 });
    ctx.fill();

    // Olhos Expressivos
    ctx.fillStyle = c.eyeColor;
    ctx.beginPath();
    ctx.roundRect(headX + 7, headY + 5, 4, 5, 2); // esquerdo
    ctx.roundRect(headX + 13, headY + 5, 3, 5, 2); // direito
    ctx.fill();

    ctx.fillStyle = c.pupilColor;
    ctx.fillRect(headX + 9, headY + 7, 2, 2); // pupila esq
    ctx.fillRect(headX + 14, headY + 7, 2, 2); // pupila dir

    // Sobrancelhas (Bravo/Aventureiro)
    ctx.fillStyle = "#1A1A1A";
    ctx.fillRect(headX + 6, headY + 3, 5, 1.5);
    ctx.beginPath();
    ctx.moveTo(headX + 12, headY + 4.5);
    ctx.lineTo(headX + 16, headY + 3);
    ctx.lineTo(headX + 16, headY + 4.5);
    ctx.fill();

    // Boca
    ctx.fillStyle = "#1A1A1A";
    ctx.beginPath();
    ctx.arc(headX + 11, headY + 12, 2, 0, Math.PI);
    ctx.fill();

    // --- Braço da Frente (Direito) ---
    ctx.fillStyle = c.skinColor;
    const frontArmX = 14 + walkSwing * 4;
    const frontArmY = 16;
    ctx.beginPath();
    ctx.roundRect(frontArmX - 2, frontArmY, 4.5, 13, 2);
    ctx.fill();

    // Manga da camisa
    ctx.fillStyle = c.shirtColor;
    ctx.beginPath();
    ctx.roundRect(frontArmX - 2.5, frontArmY, 5.5, 5, 2);
    ctx.fill();

    ctx.restore();
  }
}
