// ============================================================
// game.js — Game loop principal
// Orquestra todos os sistemas, entidades e o mundo.
// Anti-tamper integrado para proteção contra manipulação.
// ============================================================

import { CANVAS, WORLD, CHECKPOINT, SCORING } from "./config/gameMetrics.js";
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
let totalScore = 0;
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
  totalScore = 0;
  gameState = "title";
  tamperDetected = false;
  tamperReason = "";

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
// Controle de Início / Reinício
// ============================
function startGame() {
  if (gameState !== "title") return;
  if (audioSystem) audioSystem.init();
  gameState = "playing";
  if (canvas) canvas.style.cursor = "default";
  // Exibe mensagem de boas-vindas com o jogo já ativo
  dialogBox.show(startMessage, 3500);
}

// ============================
// Input
// ============================
function setupInput() {
  const handleStartOrRestart = () => {
    if (gameState === "title") {
      startGame();
      return true;
    }
    if (gameState === "victory") {
      fullRestart();
      return true;
    }
    return false;
  };

  window.addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = true;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
      e.preventDefault();
      input.jump = true;
    }

    // Iniciar no título ou reiniciar na vitória com Enter ou Espaço
    if (e.code === "Enter" || e.code === "Space") {
      if (handleStartOrRestart()) {
        e.preventDefault();
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = false;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW")
      input.jump = false;
  });

  // Clique na tela / canvas para iniciar ou reiniciar
  if (canvas) {
    canvas.addEventListener("pointerdown", (e) => {
      if (handleStartOrRestart()) {
        e.preventDefault();
      }
    });
  }

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
      if (handleStartOrRestart()) return;
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
    for (const doc of hitDocs) {
      totalScore += doc.value;
    }
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

          // Calcular valor deste step (variável)
          let stepValue;
          if (activatedCheckpoints < CHECKPOINT.COUNT) {
            // Steps 1–4: valores pré-definidos variados
            stepValue = SCORING.STEP_VALUES[activatedCheckpoints - 1];
          } else {
            // Step 5 (último): valor dinâmico para travar total em [50000, 50122]
            const target = SCORING.TARGET_MIN +
              ((collectedDocsCount * 17 + 42) % (SCORING.TARGET_MAX - SCORING.TARGET_MIN + 1));
            stepValue = Math.max(0, target - totalScore);
          }
          totalScore += stepValue;

          if (audioSystem) audioSystem.playCheckpoint();
          hud.triggerScoreCelebration();
          hud.flashCheckpoint(`Checkpoint ${cpIdx + 1} ativado!`);
          showStepTransition();
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
      antiTamper.validateScore(totalScore, SCORING.TARGET_MAX);
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

  // Exibir GIF de game over
  showGameOverOverlay();

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
  if (audioSystem) audioSystem.init();
  // Regenerar mundo
  worldGen = new WorldGenerator();
  worldData = worldGen.generate();
  player = new Player();
  checkpointSeq = new CheckpointSequence(dialogBox);
  hud = new HudSystem();
  activatedCheckpoints = 0;
  collectedDocsCount = 0;
  totalScore = 0;
  gameState = "playing";
  if (canvas) canvas.style.cursor = "default";
  camera.x = 0;
  camera.y = 0;
  dialogBox.show(startMessage, 3500);
}

// ============================
// GIF Overlay helpers
// ============================
function showStepTransition() {
  const overlay = document.getElementById('stepTransitionOverlay');
  if (overlay) {
    overlay.classList.remove('gif-hidden');
    setTimeout(() => overlay.classList.add('gif-hidden'), 2500);
  }
}

function showGameOverOverlay() {
  const overlay = document.getElementById('gameOverOverlay');
  if (overlay) {
    overlay.classList.remove('gif-hidden');
    setTimeout(() => overlay.classList.add('gif-hidden'), 2500);
  }
}

// ============================
// Render
// ============================
function render() {
  ctx.clearRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  // --- Céu gradiente (espaço de tela) ---
  const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS.HEIGHT);
  skyGrad.addColorStop(0, CANVAS.BG_SKY_TOP);
  skyGrad.addColorStop(1, CANVAS.BG_SKY_BOTTOM);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  // --- Aplicar zoom da câmera para elementos do mundo ---
  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);

  const viewW = camera.viewWidth;
  const viewH = camera.viewHeight;

  // --- Nuvens simples (parallax) ---
  renderClouds(viewW);

  // --- Chão + Montanhas ---
  worldGen.renderGround(ctx, camera, viewW, viewH);

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

  // --- Restaurar zoom (voltar ao espaço de tela para UI) ---
  ctx.restore();

  // --- HUD (apenas durante o jogo / morte / vitória) ---
  if (gameState !== "title") {
    hud.render(
      ctx,
      player,
      worldData.checkpointHouses.length,
      activatedCheckpoints,
      collectedDocsCount,
      worldData.documents.length,
      totalScore,
    );
  }

  // --- Dialog Box (apenas quando não estiver no título para evitar sobreposição) ---
  if (gameState !== "title") {
    dialogBox.render(ctx);
  }

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
function renderClouds(viewW) {
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
    const cx = ((c.x + offset) % (viewW + 200)) - 50;
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
  if (canvas) canvas.style.cursor = "pointer";

  // Fundo escurecido semi-transparente
  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  const cardW = Math.min(CANVAS.WIDTH - 40, 520);
  const cardH = 260;
  const cardX = (CANVAS.WIDTH - cardW) / 2;
  const cardY = (CANVAS.HEIGHT - cardH) / 2;

  ctx.save();

  // Fundo do Card
  ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 16);
  ctx.fill();

  // Borda elegante
  ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Título Principal
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold 24px "Press Start 2P", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PLATAFORMA 2D", CANVAS.WIDTH / 2, cardY + 48);

  // Subtítulo
  ctx.fillStyle = "#94A3B8";
  ctx.font = `10px "Press Start 2P", monospace`;
  ctx.fillText("Aventura & Checkpoints", CANVAS.WIDTH / 2, cardY + 82);

  // Botão pulsante central "CLIQUE OU ENTER"
  const pulse = Math.sin(Date.now() / 250) * 0.15 + 0.85;
  const btnW = Math.min(cardW - 60, 400);
  const btnH = 46;
  const btnX = (CANVAS.WIDTH - btnW) / 2;
  const btnY = cardY + 114;

  ctx.fillStyle = `rgba(16, 185, 129, ${0.2 * pulse})`;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 10);
  ctx.fill();

  ctx.strokeStyle = `rgba(52, 211, 153, ${0.8 * pulse})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#34D399";
  ctx.font = `bold 11px "Press Start 2P", monospace`;
  ctx.fillText("▶ CLIQUE OU ENTER PARA JOGAR", CANVAS.WIDTH / 2, btnY + btnH / 2 + 1);

  // Dicas de controles
  ctx.fillStyle = "#CBD5E1";
  ctx.font = `9px "Press Start 2P", monospace`;
  ctx.fillText("← → / A D : Mover  ·  ESPAÇO / W : Pular", CANVAS.WIDTH / 2, cardY + 195);

  ctx.fillStyle = "#64748B";
  ctx.font = `8px "Press Start 2P", monospace`;
  ctx.fillText("Colete as certidões e alcance todos os checkpoints!", CANVAS.WIDTH / 2, cardY + 224);

  ctx.restore();
}

function renderVictoryOverlay() {
  if (canvas) canvas.style.cursor = "pointer";
  const pulse = Math.sin(Date.now() / 400) * 0.15 + 0.85;

  ctx.fillStyle = `rgba(0,0,0,${0.5 * pulse})`;
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  const cardW = Math.min(CANVAS.WIDTH - 40, 520);
  const cardH = 240;
  const cardX = (CANVAS.WIDTH - cardW) / 2;
  const cardY = (CANVAS.HEIGHT - cardH) / 2;

  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 16);
  ctx.fill();

  ctx.strokeStyle = "rgba(34, 197, 94, 0.6)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#22C55E";
  ctx.font = `bold 24px "Press Start 2P", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🎉 VITÓRIA!", CANVAS.WIDTH / 2, cardY + 48);

  ctx.fillStyle = "#FBBF24";
  ctx.font = `11px "Press Start 2P", monospace`;
  ctx.fillText(
    victoryMessage,
    CANVAS.WIDTH / 2,
    cardY + 95,
  );

  const btnW = Math.min(cardW - 60, 400);
  const btnH = 44;
  const btnX = (CANVAS.WIDTH - btnW) / 2;
  const btnY = cardY + 145;

  ctx.fillStyle = "rgba(34, 197, 94, 0.2)";
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 8);
  ctx.fill();

  ctx.strokeStyle = "#22C55E";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#4ADE80";
  ctx.font = `bold 10px "Press Start 2P", monospace`;
  ctx.fillText(
    "▶ CLIQUE OU ENTER PARA JOGAR NOVAMENTE",
    CANVAS.WIDTH / 2,
    btnY + btnH / 2 + 1,
  );

  ctx.restore();
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
