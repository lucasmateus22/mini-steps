// ============================================================
// game.js — Game loop principal
// Orquestra todos os sistemas, entidades e o mundo.
// Anti-tamper integrado para proteção contra manipulação.
// ============================================================

import { CANVAS, WORLD, CHECKPOINT } from "./config/gameMetrics.js";
import {
  getRandomDeathMessage,
  startMessage,
  victoryMessage,
} from "./config/messages.js";

import Player from "./entities/player.js";
import WorldGenerator from "./world/generator.js";
import Camera from "./systems/camera.js";
import CollisionSystem from "./systems/collision.js";
import CheckpointSequence from "./systems/checkpointSequence.js";
import DialogBox from "./systems/dialogBox.js";
import HudSystem from "./systems/hud.js";
import AudioSystem from "./systems/audio.js";
import AntiTamper from "./systems/antiTamper.js";

// ============================
// Estado Global (encapsulado no módulo — não vaza para window)
// ============================
let canvas, ctx;
let player, camera, worldGen, worldData;
let checkpointSeq, dialogBox, hud, audioSystem;
let antiTamper;

let input = { left: false, right: false, jump: false };
let gameState = "title"; // title | playing | dead | victory
let activatedCheckpoints = 0;
let collectedDocsCount = 0;
let lastTimestamp = 0;
let tamperDetected = false;
let tamperReason = "";

// ============================
// Inicialização
// ============================
export function init() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // --- Anti-Tamper ---
  const container = document.getElementById("gameContainer");
  antiTamper = new AntiTamper();
  antiTamper.init(container, (reason) => {
    tamperDetected = true;
    tamperReason = reason;
    // Pausar o jogo ao detectar tampering
    if (gameState === "playing") {
      gameState = "tamper";
    }
  });

  audioSystem = new AudioSystem();

  // Criar sistemas
  dialogBox = new DialogBox();
  hud = new HudSystem();
  camera = new Camera();

  // Gerar mundo
  worldGen = new WorldGenerator();
  worldData = worldGen.generate();

  // Criar jogador
  player = new Player();

  // Checkpoint sequence
  checkpointSeq = new CheckpointSequence(dialogBox);

  // Reset
  activatedCheckpoints = 0;
  collectedDocsCount = 0;
  gameState = "title";
  tamperDetected = false;
  tamperReason = "";

  // Mostrar mensagem inicial
  dialogBox.show(startMessage, 3000, () => {
    gameState = "playing";
  });

  // Input
  setupInput();

  // Start loop
  lastTimestamp = performance.now();
  requestAnimationFrame(loop);
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  CANVAS.WIDTH = canvas.width;
  CANVAS.HEIGHT = canvas.height;
}

// ============================
// Input
// ============================
function setupInput() {
  window.addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = true;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      input.jump = true;
    }

    // Start do título
    if (e.code === "Enter" && gameState === "title") {
      gameState = "playing";
      dialogBox.hide();
    }
    // Restart na vitória
    if (e.code === "Enter" && gameState === "victory") {
      fullRestart();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = false;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW")
      input.jump = false;
  });

  // --- Touch / Mobile controls ---
  const btnLeft = document.getElementById("btnLeft");
  const btnRight = document.getElementById("btnRight");
  const btnJump = document.getElementById("btnJump");

  const initAudio = () => { if (audioSystem) audioSystem.init(); };

  // Usa pointer events para perfeito suporte a multitouch e mouse simultaneamente
  const bindPointer = (btn, actionOn, actionOff) => {
    if (!btn) return;
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      initAudio();
      actionOn();
    });
    btn.addEventListener("pointerup", (e) => { e.preventDefault(); actionOff(); });
    btn.addEventListener("pointercancel", (e) => { e.preventDefault(); actionOff(); });
    btn.addEventListener("pointerout", (e) => { e.preventDefault(); actionOff(); });
  };

  bindPointer(btnLeft, () => input.left = true, () => input.left = false);
  bindPointer(btnRight, () => input.right = true, () => input.right = false);
  bindPointer(btnJump, () => input.jump = true, () => input.jump = false);
}

// ============================
// Game Loop
// ============================
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05); // cap at 50ms
  lastTimestamp = timestamp;

  // Validar integridade do timing
  if (antiTamper && !antiTamper.validateTiming(dt, timestamp)) {
    // Timing manipulado — ignorar frame
    requestAnimationFrame(loop);
    return;
  }

  update(dt);
  render();

  requestAnimationFrame(loop);
}

// ============================
// Update
// ============================
function update(dt) {
  // Dialog sempre atualiza
  dialogBox.update(dt);
  hud.update(dt, gameState === "playing");

  if (gameState === "title") return;
  if (gameState === "victory") return;
  if (gameState === "dead") return;
  if (gameState === "tamper") return; // Pausado por tampering

  // --- Playing ---

  // Se a animação do score está acontecendo, pausar movimentação
  if (hud.isPausedForScoreAnim) {
    // Apenas atualiza mundo visual e câmera (sem movimentação)
    worldData.startFlag.update(dt);
    worldData.endFlag.update(dt);
    for (const obs of worldData.obstacles) obs.update(dt);
    for (const doc of worldData.documents) doc.update(dt);
    camera.follow(player, dt);
    checkpointSeq.update(dt);
    return;
  }

  // Input → Player
  const wasOnGround = player.onGround;
  player.handleInput(input);
  if (wasOnGround && input.jump) {
    if (audioSystem) audioSystem.playJump();
  }
  // Reset jump para não pular contínuo
  input.jump = false;

  // Física do player
  player.update(dt);

  // Colisão com plataformas
  CollisionSystem.resolvePlayerPlatforms(player, worldData.platforms);

  // Colisão com obstáculos
  const hitObstacles = CollisionSystem.checkPlayerObstacles(
    player,
    worldData.obstacles,
  );
  for (const obs of hitObstacles) {
    if (obs.deadly) {
      handlePlayerDeath();
      return;
    }
  }

  // Colisão com documentos / pequenos papéis colecionáveis
  const hitDocs = CollisionSystem.checkPlayerDocuments(player, worldData.documents);
  if (hitDocs.length > 0) {
    collectedDocsCount += hitDocs.length;
    if (audioSystem) audioSystem.playCollect();
  }

  // Queda no vazio
  if (CollisionSystem.checkFallOff(player, WORLD.GROUND_Y)) {
    handlePlayerDeath();
    return;
  }

  // Checkpoint triggers
  if (!checkpointSeq.isActive) {
    const cpIdx = CollisionSystem.checkPlayerCheckpoints(
      player,
      worldData.checkpointHouses,
    );
    if (cpIdx >= 0) {
      const house = worldData.checkpointHouses.find(
        (h) => h.checkpointIndex === cpIdx,
      );
      if (house) {
        checkpointSeq.start(player, house, cpIdx, (_idx) => {
          activatedCheckpoints++;
          if (audioSystem) audioSystem.playCheckpoint();
          hud.flashCheckpoint(`Checkpoint ${cpIdx + 1} ativado!`);
        });
      }
    }
  }

  // Checkpoint FSM
  checkpointSeq.update(dt);

  // Bandeira final
  if (CollisionSystem.checkEndFlag(player, worldData.endFlag)) {
    // Validar integridade do score antes de aceitar vitória
    if (antiTamper) {
      const score = activatedCheckpoints * CHECKPOINT.SCORE_PER_CHECKPOINT + collectedDocsCount * 100;
      antiTamper.validateScore(score, activatedCheckpoints, CHECKPOINT.SCORE_PER_CHECKPOINT, collectedDocsCount);
    }
    handleVictory();
  }

  // Update do mundo (bandeiras + obstáculos + documentos)
  worldData.startFlag.update(dt);
  worldData.endFlag.update(dt);
  for (const obs of worldData.obstacles) obs.update(dt);
  for (const doc of worldData.documents) doc.update(dt);

  // Câmera segue player
  camera.follow(player, dt);
}

// ============================
// Eventos de Jogo
// ============================
function handlePlayerDeath() {
  if (audioSystem) audioSystem.playDeath();
  player.die();
  const msg = getRandomDeathMessage();

  // Vida única — exibe mensagem de morte e depois respawna no último checkpoint
  dialogBox.show(msg, 2500, () => {
    player.respawn();
    gameState = "playing";
  });
  gameState = "dead";
}

function handleVictory() {
  if (gameState === "victory") return;
  if (audioSystem) audioSystem.playVictory();
  gameState = "victory";
  player.controlEnabled = false;
  player.vx = 0;
  dialogBox.hide(); // Evita sobreposição com o overlay de vitória
}

function fullRestart() {
  // Regenerar mundo
  worldGen = new WorldGenerator();
  worldData = worldGen.generate();
  player = new Player();
  checkpointSeq = new CheckpointSequence(dialogBox);
  activatedCheckpoints = 0;
  collectedDocsCount = 0;
  gameState = "playing";
  camera.x = 0;
  camera.y = 0;
}

// ============================
// Render
// ============================
function render() {
  ctx.clearRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  // --- Céu gradiente ---
  const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS.HEIGHT);
  skyGrad.addColorStop(0, CANVAS.BG_SKY_TOP);
  skyGrad.addColorStop(1, CANVAS.BG_SKY_BOTTOM);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  // --- Nuvens simples (parallax) ---
  renderClouds();

  // --- Chão + Montanhas ---
  worldGen.renderGround(ctx, camera, CANVAS.WIDTH, CANVAS.HEIGHT);

  // --- Árvores (fundo) ---
  for (const tree of worldData.trees) {
    if (camera.isVisible(tree.x, tree.y, tree.width, tree.height)) {
      tree.render(ctx, camera);
    }
  }

  // --- Casas e Cartórios ---
  for (const house of worldData.houses) {
    if (
      camera.isVisible(house.x - 20, house.y - 20, house.width + 40, house.height + 40)
    ) {
      house.render(ctx, camera);
    }
  }

  // --- Pequenos Papéis / Certidões Colecionáveis ---
  for (const doc of worldData.documents) {
    if (camera.isVisible(doc.x - 10, doc.y - 20, doc.width + 20, doc.height + 40)) {
      doc.render(ctx, camera);
    }
  }

  // --- Obstáculos ---
  for (const obs of worldData.obstacles) {
    if (camera.isVisible(obs.x, obs.y - 20, obs.width + 20, obs.height + 40)) {
      obs.render(ctx, camera);
    }
  }

  // --- Bandeiras ---
  if (
    camera.isVisible(worldData.startFlag.x, worldData.startFlag.y, 60, 80)
  ) {
    worldData.startFlag.render(ctx, camera);
  }
  if (camera.isVisible(worldData.endFlag.x, worldData.endFlag.y, 60, 80)) {
    worldData.endFlag.render(ctx, camera);
  }

  // --- Player ---
  player.render(ctx, camera);

  // --- HUD ---
  hud.render(
    ctx,
    player,
    worldData.checkpointHouses.length,
    activatedCheckpoints,
    collectedDocsCount,
    worldData.documents.length,
  );

  // --- Dialog Box ---
  dialogBox.render(ctx);

  // --- Overlays ---
  if (gameState === "title") {
    renderTitleOverlay();
  }
  if (gameState === "victory") {
    renderVictoryOverlay();
  }
  if (gameState === "tamper") {
    renderTamperOverlay();
  }
}

// ============================
// Overlays
// ============================
function renderClouds() {
  const parallax = 0.05;
  const offset = -camera.x * parallax;
  ctx.fillStyle = "rgba(255,255,255,0.6)";

  const clouds = [
    { x: 100, y: 60, w: 80, h: 30 },
    { x: 350, y: 40, w: 100, h: 35 },
    { x: 650, y: 70, w: 70, h: 25 },
    { x: 900, y: 50, w: 90, h: 32 },
    { x: 1200, y: 35, w: 110, h: 38 },
  ];

  for (const c of clouds) {
    const cx = ((c.x + offset) % (CANVAS.WIDTH + 200)) - 50;
    ctx.beginPath();
    ctx.ellipse(cx, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(
      cx - c.w * 0.25,
      c.y + 5,
      c.w * 0.35,
      c.h * 0.4,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(
      cx + c.w * 0.3,
      c.y + 3,
      c.w * 0.3,
      c.h * 0.35,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

function renderTitleOverlay() {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold 28px "Press Start 2P", monospace`;
  ctx.textAlign = "center";
  ctx.fillText("PLATAFORMA 2D", CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 40);

  ctx.font = `14px "Press Start 2P", monospace`;
  ctx.fillStyle = "#FBBF24";
  ctx.fillText(
    "Pressione ENTER para começar",
    CANVAS.WIDTH / 2,
    CANVAS.HEIGHT / 2 + 20,
  );

  ctx.font = "12px monospace";
  ctx.fillStyle = "#D1D5DB";
  ctx.fillText(
    "← → Mover | ESPAÇO Pular",
    CANVAS.WIDTH / 2,
    CANVAS.HEIGHT / 2 + 60,
  );
}

function renderVictoryOverlay() {
  const pulse = Math.sin(Date.now() / 400) * 0.15 + 0.85;

  ctx.fillStyle = `rgba(0,0,0,${0.3 * pulse})`;
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  ctx.fillStyle = "#22C55E";
  ctx.font = `bold 28px "Press Start 2P", monospace`;
  ctx.textAlign = "center";
  ctx.fillText("VITÓRIA!", CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 30);

  ctx.fillStyle = "#FBBF24";
  ctx.font = `14px "Press Start 2P", monospace`;
  ctx.fillText(
    victoryMessage,
    CANVAS.WIDTH / 2,
    CANVAS.HEIGHT / 2 + 10,
  );

  ctx.fillStyle = "#D1D5DB";
  ctx.font = `10px "Press Start 2P", monospace`;
  ctx.fillText(
    "ENTER para jogar novamente",
    CANVAS.WIDTH / 2,
    CANVAS.HEIGHT / 2 + 50,
  );
}

// ============================
// Overlay de Tampering Detectado
// ============================
function renderTamperOverlay() {
  ctx.fillStyle = "rgba(15, 0, 0, 0.85)";
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  ctx.fillStyle = "#EF4444";
  ctx.font = `bold 22px "Press Start 2P", monospace`;
  ctx.textAlign = "center";
  ctx.fillText("⚠ MANIPULAÇÃO DETECTADA", CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 30);

  ctx.fillStyle = "#F87171";
  ctx.font = `12px "Press Start 2P", monospace`;
  ctx.fillText(
    "O jogo detectou uma tentativa de manipulação.",
    CANVAS.WIDTH / 2,
    CANVAS.HEIGHT / 2 + 10
  );

  ctx.fillStyle = "#D1D5DB";
  ctx.font = `10px "Press Start 2P", monospace`;
  ctx.fillText(
    "Feche o DevTools e recarregue a página para continuar.",
    CANVAS.WIDTH / 2,
    CANVAS.HEIGHT / 2 + 40
  );
}

// ============================
// Auto-init
// ============================
window.addEventListener("DOMContentLoaded", init);
