// ============================================================
// game.js — Game loop principal
// Orquestra todos os sistemas, entidades e o mundo.
// Anti-tamper integrado para proteção contra manipulação.
// ============================================================

import { CANVAS, WORLD, CHECKPOINT, SCORING } from "./config/gameMetrics.js";
import {
  getRandomDeathMessage,
  resetMessagePools,
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

  // --- Viewport: usar visualViewport quando disponível ---
  window.addEventListener("resize", resizeCanvas);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resizeCanvas);
  }
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

  // --- Pré-carregar imagens para o dialog ---
  dialogBox.preloadImage("stepConclude", "assets/stepConclude.gif");
  dialogBox.preloadImage("youDie", "assets/youDie.gif");

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

  // --- Fullscreen ---
  setupFullscreen();

  // Start loop
  lastTimestamp = performance.now();
  requestAnimationFrame(loop);
}

function resizeCanvas() {
  if (!canvas) return;

  // Preferir visualViewport para evitar problemas com barra dinâmica do browser
  let w, h;
  if (window.visualViewport) {
    w = window.visualViewport.width;
    h = window.visualViewport.height;
  } else {
    w = window.innerWidth;
    h = window.innerHeight;
  }

  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  CANVAS.WIDTH = canvas.width;
  CANVAS.HEIGHT = canvas.height;
}

// ============================
// Fullscreen API
// ============================
function setupFullscreen() {
  const btnFullscreen = document.getElementById("btnFullscreen");
  const fsToggleBtn = document.getElementById("fsToggleBtn");
  const fsDrawer = document.getElementById("fsDrawer");

  if (fsToggleBtn && fsDrawer) {
    fsToggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fsDrawer.classList.toggle("open");
    });
  }

  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFullscreen();
    });
  }

  // Fechar gaveta ao clicar fora
  document.addEventListener("pointerdown", (e) => {
    if (fsDrawer && !fsDrawer.contains(e.target)) {
      fsDrawer.classList.remove("open");
    }
  });

  // Atualizar canvas ao entrar/sair de fullscreen
  document.addEventListener("fullscreenchange", () => {
    // Pequeno delay para o browser ajustar dimensões
    setTimeout(resizeCanvas, 100);
  });
  document.addEventListener("webkitfullscreenchange", () => {
    setTimeout(resizeCanvas, 100);
  });
}

function toggleFullscreen() {
  const el = document.documentElement;

  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    // Entrar em fullscreen
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  } else {
    // Sair de fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

// ============================
// Controle de Início / Reinício
// ============================
function startGame() {
  if (gameState !== "title") return;
  if (audioSystem) audioSystem.init();
  gameState = "playing";
  if (canvas) canvas.style.cursor = "default";
  // Exibe mensagem de boas-vindas (15s ou pulável com Espaço/Clique)
  dialogBox.show(startMessage, 15000, null, null, true);
}

// ============================
// Input — Multitouch com pointerId tracking
// ============================

// Map de ponteiros ativos por botão para multitouch independente
const activePointers = {
  left: new Set(),
  right: new Set(),
  jump: new Set(),
};

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

  const handleDialogSkip = () => {
    // 1. Pular diálogo de Checkpoint
    if (checkpointSeq && checkpointSeq.isActive) {
      if (checkpointSeq.skip()) return true;
    }
    // 2. Pular qualquer diálogo ativo configurado como pulável (Game Over, Boas-vindas, etc.)
    if (dialogBox && dialogBox.active && dialogBox.skippable) {
      if (dialogBox.skip()) return true;
    }
    return false;
  };

  window.addEventListener("keydown", (e) => {
    // Pular diálogo ativo (Checkpoint ou Game Over) EXCLUSIVAMENTE via Espaço ou Enter
    if (e.code === "Space" || e.code === "Enter") {
      if (handleDialogSkip()) {
        e.preventDefault();
        return;
      }
    }

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

    // F11 toggle fullscreen via teclado
    if (e.code === "F11") {
      e.preventDefault();
      toggleFullscreen();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = false;
    if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW")
      input.jump = false;
  });

  // Clique na tela / canvas para iniciar, reiniciar ou pular mensagem ativa
  if (canvas) {
    canvas.addEventListener("pointerdown", (e) => {
      if (handleDialogSkip()) {
        e.preventDefault();
        return;
      }
      if (handleStartOrRestart()) {
        e.preventDefault();
      }
    });
  }

  // --- Touch / Mobile controls ---
  // Multitouch verdadeiro: cada botão rastreia seus próprios ponteiros
  // via setPointerCapture, garantindo independência total entre botões
  const btnLeft = document.getElementById("btnLeft");
  const btnRight = document.getElementById("btnRight");
  const btnJump = document.getElementById("btnJump");

  const initAudio = () => {
    if (audioSystem) audioSystem.init();
  };

  /**
   * Bind multitouch-safe pointer events para um botão de controle.
   * Usa setPointerCapture para manter o tracking mesmo se o dedo deslizar.
   * Cada botão mantém um Set de pointerIds ativos — liberar um dedo
   * em um botão NUNCA afeta outro botão.
   */
  const bindMultitouch = (btn, actionKey) => {
    if (!btn) return;

    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      initAudio();

      if (handleStartOrRestart()) return;

      // Capturar o ponteiro neste botão
      btn.setPointerCapture(e.pointerId);
      activePointers[actionKey].add(e.pointerId);
      input[actionKey] = true;
    });

    btn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      activePointers[actionKey].delete(e.pointerId);
      btn.releasePointerCapture(e.pointerId);
      // Só desativa se NENHUM ponteiro restou neste botão
      if (activePointers[actionKey].size === 0) {
        input[actionKey] = false;
      }
    });

    btn.addEventListener("pointercancel", (e) => {
      e.preventDefault();
      activePointers[actionKey].delete(e.pointerId);
      btn.releasePointerCapture(e.pointerId);
      if (activePointers[actionKey].size === 0) {
        input[actionKey] = false;
      }
    });

    // lostpointercapture é o fallback definitivo
    btn.addEventListener("lostpointercapture", (e) => {
      activePointers[actionKey].delete(e.pointerId);
      if (activePointers[actionKey].size === 0) {
        input[actionKey] = false;
      }
    });
  };

  bindMultitouch(btnLeft, "left");
  bindMultitouch(btnRight, "right");
  bindMultitouch(btnJump, "jump");
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
  const hitDocs = CollisionSystem.checkPlayerDocuments(
    player,
    worldData.documents,
  );
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
            const target =
              SCORING.TARGET_MIN +
              ((collectedDocsCount * 17 + 42) %
                (SCORING.TARGET_MAX - SCORING.TARGET_MIN + 1));
            stepValue = Math.max(0, target - totalScore);
          }
          totalScore += stepValue;

          if (audioSystem) audioSystem.playCheckpoint();
          hud.triggerScoreCelebration();
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

  // Exibir GIF de morte DENTRO do dialog (acima do texto)
  const gameOverImg =
    dialogBox.getCachedImage("youDie") || dialogBox.getCachedImage("gameOver");

  // Vida única — exibe mensagem de morte com GIF (15s ou até pular) e depois respawna no último checkpoint
  dialogBox.show(
    msg,
    15000,
    () => {
      player.respawn();
      gameState = "playing";
    },
    gameOverImg,
    true,
  );
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
  resetMessagePools();
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
  dialogBox.show(startMessage, 15000, null, null, true);
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
      camera.isVisible(
        house.x - 20,
        house.y - 20,
        house.width + 40,
        house.height + 40,
      )
    ) {
      house.render(ctx, camera);
    }
  }

  // --- Pequenos Papéis / Certidões Colecionáveis ---
  for (const doc of worldData.documents) {
    if (
      camera.isVisible(
        doc.x - 60,
        doc.y - 60,
        doc.width + 120,
        doc.height + 120,
      )
    ) {
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
  if (camera.isVisible(worldData.startFlag.x, worldData.startFlag.y, 60, 80)) {
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

/**
 * Desenha texto com suporte completo a quebras de linha (\n) e word wrap automático.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} centerY
 * @param {number} lineHeight
 * @param {number} [maxWidth]
 * @returns {number} Altura total ocupada pelo texto
 */
function drawMultilineText(ctx, text, x, centerY, lineHeight, maxWidth) {
  const rawText = String(text || "").replace(/\\n/g, "\n");
  const paragraphs = rawText.split("\n");
  const lines = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      lines.push("");
      continue;
    }
    const words = trimmed.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      if (!word) continue;
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (maxWidth && metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  const totalHeight = lines.length * lineHeight;
  const startY = centerY - totalHeight / 2 + lineHeight / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, x, startY + i * lineHeight);
  });

  return totalHeight;
}

function renderTitleOverlay() {
  if (canvas) canvas.style.cursor = "pointer";

  // Fundo escurecido semi-transparente
  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  const cardW = Math.min(CANVAS.WIDTH - 40, 640);
  const cardH = 290;
  const cardX = (CANVAS.WIDTH - cardW) / 2;
  const cardY = (CANVAS.HEIGHT - cardH) / 2;

  ctx.save();

  // Fundo do Card
  ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 16);
  ctx.fill();

  // Borda elegante
  ctx.strokeStyle = "rgba(59, 130, 246, 0.5)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Título Principal
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold 24px "Press Start 2P", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("50 MIL TÍTULOS", CANVAS.WIDTH / 2, cardY + 44);

  // Subtítulo (com quebra de linha \n)
  ctx.fillStyle = "#94A3B8";
  ctx.font = `10px "Press Start 2P", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawMultilineText(
    ctx,
    "A jornada da Perpart rumo aos 50 mil títulos de propriedade\nde imóveis entregues em menos de 4 anos",
    CANVAS.WIDTH / 2,
    cardY + 86,
    18,
    cardW - 48,
  );

  // Botão pulsante central "CLIQUE OU ENTER"
  const pulse = Math.sin(Date.now() / 250) * 0.15 + 0.85;
  const btnW = Math.min(cardW - 60, 440);
  const btnH = 46;
  const btnX = (CANVAS.WIDTH - btnW) / 2;
  const btnY = cardY + 130;

  ctx.fillStyle = `rgba(16, 185, 129, ${0.2 * pulse})`;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 10);
  ctx.fill();

  ctx.strokeStyle = `rgba(52, 211, 153, ${0.8 * pulse})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#34D399";
  ctx.font = `bold 11px "Press Start 2P", monospace`;
  ctx.fillText(
    "▶ CLIQUE OU ENTER PARA JOGAR",
    CANVAS.WIDTH / 2,
    btnY + btnH / 2 + 1,
  );

  // Dicas de controles
  ctx.fillStyle = "#CBD5E1";
  ctx.font = `9px "Press Start 2P", monospace`;
  ctx.fillText(
    "← → / A D : Mover  ·  ESPAÇO / W : Pular",
    CANVAS.WIDTH / 2,
    cardY + 212,
  );

  ctx.fillStyle = "#64748B";
  ctx.font = `8px "Press Start 2P", monospace`;
  ctx.fillText(
    "Colete títulos e alcance todas as etapas",
    CANVAS.WIDTH / 2,
    cardY + 246,
  );

  ctx.restore();
}

function renderVictoryOverlay() {
  if (canvas) canvas.style.cursor = "pointer";
  const pulse = Math.sin(Date.now() / 400) * 0.15 + 0.85;

  ctx.fillStyle = `rgba(0,0,0,${0.55 * pulse})`;
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

  const cardW = Math.min(CANVAS.WIDTH - 40, 640);
  const cardH = 280;
  const cardX = (CANVAS.WIDTH - cardW) / 2;
  const cardY = (CANVAS.HEIGHT - cardH) / 2;

  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.96)";
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 16);
  ctx.fill();

  ctx.strokeStyle = "rgba(34, 197, 94, 0.6)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Título de Vitória
  ctx.fillStyle = "#22C55E";
  ctx.font = `bold 24px "Press Start 2P", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🎉 VITÓRIA!", CANVAS.WIDTH / 2, cardY + 46);

  // Mensagem de Vitória com suporte completo a \n e quebras
  ctx.fillStyle = "#FBBF24";
  ctx.font = `11px "Press Start 2P", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawMultilineText(
    ctx,
    victoryMessage,
    CANVAS.WIDTH / 2,
    cardY + 98,
    19,
    cardW - 48,
  );

  // Botão de Jogar Novamente
  const btnW = Math.min(cardW - 60, 440);
  const btnH = 46;
  const btnX = (CANVAS.WIDTH - btnW) / 2;
  const btnY = cardY + 158;

  ctx.fillStyle = "rgba(34, 197, 94, 0.2)";
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 10);
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
  ctx.fillText(
    "⚠ MANIPULAÇÃO DETECTADA",
    CANVAS.WIDTH / 2,
    CANVAS.HEIGHT / 2 - 30,
  );

  ctx.fillStyle = "#F87171";
  ctx.font = `12px "Press Start 2P", monospace`;
  ctx.fillText(
    "O jogo detectou uma tentativa de manipulação.",
    CANVAS.WIDTH / 2,
    CANVAS.HEIGHT / 2 + 10,
  );

  ctx.fillStyle = "#D1D5DB";
  ctx.font = `10px "Press Start 2P", monospace`;
  ctx.fillText(
    "Feche o DevTools e recarregue a página para continuar.",
    CANVAS.WIDTH / 2,
    CANVAS.HEIGHT / 2 + 40,
  );
}

// ============================
// Auto-init
// ============================
window.addEventListener("DOMContentLoaded", init);
