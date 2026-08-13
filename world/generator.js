// ============================================================
// generator.js — Geração procedural do cenário
// Lê métricas centralizadas e distribui elementos.
// ============================================================

import { WORLD, CHECKPOINT, OBSTACLE_METRICS } from "../config/gameMetrics.js";
import House from "./house.js";
import Tree from "./tree.js";
import Obstacle from "./obstacle.js";
import Flag from "../entities/flag.js";
import DocumentItem from "../entities/document.js";

export default class WorldGenerator {
  constructor() {
    this.houses = [];
    this.trees = [];
    this.obstacles = [];
    this.checkpointHouses = [];
    this.documents = []; // pequenos papéis colecionáveis
    this.platforms = []; // segmentos de chão (com gaps para rios)
    this.startFlag = null;
    this.endFlag = null;

    // Dados de montanhas pré-gerados (sem parallax de repetição)
    this._mountainLayer1 = [];
    this._mountainLayer2 = [];

    // Casas do horizonte (decoração de fundo)
    this._horizonHouses = [];
  }

  /**
   * Gera o mundo completo.
   * @returns {{ houses, trees, obstacles, checkpointHouses, platforms, startFlag, endFlag }}
   */
  generate() {
    const totalLength = WORLD.TOTAL_LENGTH;
    const segW = WORLD.SEGMENT_WIDTH;
    const segCount = Math.floor(totalLength / segW);

    // --- Distribuir tipos de segmentos ---
    const dist = WORLD.DISTRIBUTION;

    // Quantidade de cada tipo
    const counts = {
      CHECKPOINT: Math.max(
        CHECKPOINT.COUNT,
        Math.round(segCount * dist.CHECKPOINT),
      ),
      OBSTACLE: Math.round(segCount * dist.OBSTACLE),
      TREE: Math.round(segCount * dist.TREE),
      HOUSE: 0,
      EMPTY: Math.round(segCount * dist.EMPTY),
    };
    counts.HOUSE =
      segCount -
      counts.CHECKPOINT -
      counts.OBSTACLE -
      counts.TREE -
      counts.EMPTY;

    // --- Seed determinístico ---
    let seed = 42;
    const nextSeed = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);

    // --- Construir layout com espaçamento de obstáculos ---
    const layout = new Array(segCount).fill(null);

    // 1) Reservar checkpoints espaçados uniformemente
    const cpCount = CHECKPOINT.COUNT;
    const cpSpacing = Math.floor(segCount / (cpCount + 1));
    for (let i = 1; i <= cpCount; i++) {
      const slot = i * cpSpacing;
      layout[slot] = { type: "CHECKPOINT", index: i - 1 };
    }

    // 2) Garantir que os 2 primeiros segmentos são seguros
    layout[0] = { type: "EMPTY", index: -1 };
    layout[1] = { type: "EMPTY", index: -1 };

    // 3) Distribuir obstáculos com espaçamento mín/máx configurável
    const minSpacing = OBSTACLE_METRICS.MIN_OBSTACLE_SPACING;
    const maxSpacing = OBSTACLE_METRICS.MAX_OBSTACLE_SPACING;
    const obstacleTypes = ["cactus", "rock", "river", "dangerZone"];
    let obstaclesPlaced = 0;
    let lastObstacleIdx = -minSpacing; // permitir desde o início
    let obstacleTypeRing = 0; // round-robin para evitar monopólio

    // Percorrer segmentos e posicionar obstáculos respeitando espaçamento
    for (let i = 2; i < segCount && obstaclesPlaced < counts.OBSTACLE; i++) {
      if (layout[i] !== null) continue; // já ocupado (checkpoint)

      const gapSinceLastObs = i - lastObstacleIdx;
      if (gapSinceLastObs < minSpacing) continue; // muito perto

      nextSeed();
      // Decidir se coloca obstáculo aqui (probabilidade aumenta com a distância)
      const placeProbability =
        (gapSinceLastObs - minSpacing) / (maxSpacing - minSpacing + 1);
      if (gapSinceLastObs < maxSpacing && (seed % 100) / 100 > placeProbability)
        continue;

      // Escolher tipo via round-robin embaralhado para distribuição uniforme
      let otype = obstacleTypes[obstacleTypeRing % obstacleTypes.length];
      obstacleTypeRing++;

      // Evitar rio se o anterior foi rio
      if (otype === "river" && lastObstacleIdx >= 0) {
        const prevSeg = layout[lastObstacleIdx];
        if (prevSeg && prevSeg.obstacleType === "river") {
          otype = obstacleTypes[obstacleTypeRing % obstacleTypes.length];
          obstacleTypeRing++;
          if (otype === "river") otype = "rock";
        }
      }

      layout[i] = { type: "OBSTACLE", index: -1, obstacleType: otype };
      lastObstacleIdx = i;
      obstaclesPlaced++;
    }

    // 4) Preencher restante com HOUSE, TREE, EMPTY (proporcionalmente)
    let housesLeft = counts.HOUSE;
    let treesLeft = counts.TREE;
    let emptyLeft = counts.EMPTY - 2; // já usamos 2

    const fillTypes = [];
    for (let i = 0; i < housesLeft; i++) fillTypes.push("HOUSE");
    for (let i = 0; i < treesLeft; i++) fillTypes.push("TREE");
    for (let i = 0; i < Math.max(0, emptyLeft); i++) fillTypes.push("EMPTY");

    // Shuffle Fisher-Yates
    for (let i = fillTypes.length - 1; i > 0; i--) {
      nextSeed();
      const j = seed % (i + 1);
      [fillTypes[i], fillTypes[j]] = [fillTypes[j], fillTypes[i]];
    }

    let fillIdx = 0;
    for (let i = 0; i < segCount; i++) {
      if (layout[i] === null) {
        layout[i] = { type: fillTypes[fillIdx] || "EMPTY", index: -1 };
        fillIdx++;
      }
    }

    // --- Gerar entidades a partir do layout ---
    const riverPositions = [];
    let docId = 0;

    for (let i = 0; i < segCount; i++) {
      const x = i * segW;
      const seg = layout[i];
      nextSeed();

      switch (seg.type) {
        case "HOUSE":
          this.houses.push(new House(x + 30, false, -1, seed));
          // Chance de papel próximo à casa
          if (seed % 2 === 0) {
            this.documents.push(
              new DocumentItem(
                x + 135 + (seed % 15),
                WORLD.GROUND_Y - 32,
                docId++,
              ),
            );
          }
          break;

        case "TREE":
          this.trees.push(new Tree(x + 20 + (seed % 40), seed));
          if (seed % 3 === 0) {
            nextSeed();
            this.trees.push(new Tree(x + 80 + (seed % 30), seed));
          }
          // Papel entre árvores
          if (seed % 2 === 1) {
            this.documents.push(
              new DocumentItem(x + 60, WORLD.GROUND_Y - 32, docId++),
            );
          }
          break;

        case "OBSTACLE": {
          const otype = seg.obstacleType || "rock";
          const obsX = otype === "river" ? x : x + 20 + (seed % 30);
          const obs = new Obstacle(obsX, otype, seed);
          this.obstacles.push(obs);

          if (otype === "river") {
            riverPositions.push(i);
            // Arco de papéis sobre o rio (recompensa por pular!)
            this.documents.push(
              new DocumentItem(x + segW * 0.35, WORLD.GROUND_Y - 70, docId++),
            );
            this.documents.push(
              new DocumentItem(x + segW * 0.65, WORLD.GROUND_Y - 70, docId++),
            );
          } else {
            // Papel flutuando acima do obstáculo
            this.documents.push(
              new DocumentItem(obsX + 10, WORLD.GROUND_Y - 60, docId++),
            );
          }
          break;
        }

        case "CHECKPOINT": {
          const cpHouse = new House(x + 30, true, seg.index, seed);
          this.checkpointHouses.push(cpHouse);
          this.houses.push(cpHouse);
          // Papéis oficiais na entrada e saída do Cartório
          this.documents.push(
            new DocumentItem(x + 10, WORLD.GROUND_Y - 32, docId++),
          );
          this.documents.push(
            new DocumentItem(x + 140, WORLD.GROUND_Y - 32, docId++),
          );
          break;
        }

        case "EMPTY":
          if (seed % 5 === 0) {
            this.trees.push(new Tree(x + 40 + (seed % 60), seed));
          }
          // Papel no campo aberto
          if (i > 1 && seed % 3 === 0) {
            this.documents.push(
              new DocumentItem(x + 70, WORLD.GROUND_Y - 32, docId++),
            );
          }
          break;
      }
    }

    // --- Gerar plataformas de chão (com gaps nos rios) ---
    this._generatePlatforms(segCount, segW, riverPositions);

    // --- Gerar dados de montanhas (estáticos, baseados no comprimento do mundo) ---
    this._generateMountainData();

    // --- Bandeiras ---
    this.startFlag = new Flag(60, "start");
    this.endFlag = new Flag(totalLength - 100, "end");

    return {
      houses: this.houses,
      trees: this.trees,
      obstacles: this.obstacles,
      checkpointHouses: this.checkpointHouses,
      documents: this.documents,
      platforms: this.platforms,
      startFlag: this.startFlag,
      endFlag: this.endFlag,
    };
  }

  _generatePlatforms(segCount, segW, riverPositions) {
    const riverSet = new Set(riverPositions);
    let platformStart = 0;

    for (let i = 0; i <= segCount; i++) {
      if (riverSet.has(i) || i === segCount) {
        if (i > platformStart) {
          this.platforms.push({
            x: platformStart * segW,
            y: WORLD.GROUND_Y,
            width: (i - platformStart) * segW,
            height: WORLD.GROUND_HEIGHT,
          });
        }
        platformStart = i + 1;
      }
    }
  }

  /**
   * Pré-gera os pontos das montanhas para todo o comprimento do mundo.
   * Sem repetição — cada ponto é único, baseado em senoide com seed fixa.
   */
  _generateMountainData() {
    const totalLength = WORLD.TOTAL_LENGTH;

    // Camada 1 — montanhas distantes
    this._mountainLayer1 = [];
    for (let wx = 0; wx <= totalLength + 200; wx += 80) {
      const mh =
        60 + Math.sin(wx * 0.003 + 1.0) * 40 + Math.sin(wx * 0.0071) * 25;
      this._mountainLayer1.push({ wx, mh });
    }

    // --- Casas do horizonte (entre as duas camadas de montanhas) ---
    // Usa as mesmas cores das casas do primeiro plano (house.js)
    this._horizonHouses = [];
    const HORIZON_COLORS = [
      { wall: "#8f84f1ff", wallDark: "#5156a8ff", roof: "#DC2626", roofDark: "#991B1B", door: "#7C2D12" },
      { wall: "#F9A8D4",   wallDark: "#EC4899",   roof: "#7C3AED", roofDark: "#5B21B6", door: "#44403C" },
      { wall: "#86EFAC",   wallDark: "#22C55E",   roof: "#EA580C", roofDark: "#C2410C", door: "#3F3F46" },
      { wall: "#93C5FD",   wallDark: "#3B82F6",   roof: "#E11D48", roofDark: "#BE123C", door: "#5C4033" },
      { wall: "#dadadaff", wallDark: "#b4b4b4ff", roof: "#865048ff",roofDark: "#782504ff",door: "#a15529ff" },
      { wall: "#E2E8F0",   wallDark: "#94A3B8",   roof: "#6366F1", roofDark: "#4338CA", door: "#1C1917" },
    ];
    let hSeed = 77;
    const nextHSeed = () => (hSeed = (hSeed * 1103515245 + 12345) & 0x7fffffff);
    for (let wx = 40; wx <= totalLength + 200; wx += 35 + (nextHSeed() % 30)) {
      nextHSeed();
      const hw = 20 + (hSeed % 14);   // largura 20–33
      nextHSeed();
      const hh = 18 + (hSeed % 18);   // altura 18–35
      nextHSeed();
      const roofH = 8 + (hSeed % 6);  // telhado triangular como as do jogo
      nextHSeed();
      const colorIdx = hSeed % HORIZON_COLORS.length;
      nextHSeed();
      const hasLeftWindow = (hSeed % 2) === 0;
      nextHSeed();
      const hasRightWindow = true;

      this._horizonHouses.push({
        wx,
        w: hw,
        h: hh,
        roofH,
        colors: HORIZON_COLORS[colorIdx],
        hasLeftWindow,
        hasRightWindow,
      });
    }

    // Camada 2 — montanhas próximas
    this._mountainLayer2 = [];
    for (let wx = 0; wx <= totalLength + 200; wx += 60) {
      const mh =
        30 + Math.sin(wx * 0.005 + 3.0) * 30 + Math.sin(wx * 0.009) * 15;
      this._mountainLayer2.push({ wx, mh });
    }
  }

  /**
   * Renderiza o chão e o background.
   */
  renderGround(ctx, camera, canvasWidth, canvasHeight) {
    // --- Montanhas de fundo (parallax sem repetição) ---
    this._drawMountains(ctx, camera, canvasWidth, canvasHeight);

    // --- Plataformas de chão (grama) ---
    for (const p of this.platforms) {
      const sx = p.x - camera.x;
      const sy = p.y - camera.y;

      if (sx + p.width < 0 || sx > canvasWidth) continue;

      // Terra
      const dirtHeight = Math.max(p.height, canvasHeight - sy + 100);
      ctx.fillStyle = "#a56d43ff";
      ctx.fillRect(sx, sy, p.width, dirtHeight);

      // Grama (faixa verde no topo)
      const grassH = 12;
      ctx.fillStyle = "#4ADE80";
      ctx.fillRect(sx, sy, p.width, grassH);

      // Grama mais escura (base)
      ctx.fillStyle = "#22C55E";
      ctx.fillRect(sx, sy + grassH - 3, p.width, 4);

      // Detalhes de grama (linhas fixas no mundo)
      ctx.strokeStyle = "#16A34A";
      ctx.lineWidth = 1;
      for (let wx = p.x; wx < p.x + p.width; wx += 14) {
        const sxGrass = wx - camera.x;
        // Desenha apenas se estiver visível na tela
        if (sxGrass < -10 || sxGrass > canvasWidth + 10) continue;

        const gh = 4 + Math.sin(wx * 0.3) * 3;
        ctx.beginPath();
        ctx.moveTo(sxGrass, sy);
        ctx.lineTo(sxGrass - 2, sy - gh);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sxGrass + 5, sy);
        ctx.lineTo(sxGrass + 7, sy - gh + 2);
        ctx.stroke();
      }
    }
  }

  _drawMountains(ctx, camera, canvasWidth, _canvasHeight) {
    const baseY = WORLD.GROUND_Y - camera.y;

    // Camada 1 — parallax lento (distante)
    const parallax1 = 0.15;
    ctx.fillStyle = "#6BA876"; // verde distante
    ctx.beginPath();
    ctx.moveTo(0, baseY);

    for (const pt of this._mountainLayer1) {
      const screenX = pt.wx * (1 - parallax1) - camera.x * (1 - parallax1);
      if (screenX < -100 || screenX > canvasWidth + 100) continue;
      ctx.lineTo(screenX, baseY - pt.mh);
    }
    ctx.lineTo(canvasWidth + 100, baseY);
    ctx.closePath();
    ctx.fill();

    // --- Casas do horizonte (parallax 0.2 — entre montanhas) ---
    // Estilo visual idêntico às casas do primeiro plano (house.js), em escala menor
    const parallaxH = 0.2;
    for (const h of this._horizonHouses) {
      const screenX = h.wx * (1 - parallaxH) - camera.x * (1 - parallaxH);
      if (screenX + h.w < -10 || screenX > canvasWidth + 10) continue;

      const houseBottom = baseY - 4;
      const wallTop = houseBottom - h.h;
      const c = h.colors;
      const w = h.w;
      const hh = h.h;
      const roofH = h.roofH;

      // --- Sombra da casa ---
      ctx.fillStyle = "rgba(0,0,0,0.10)";
      ctx.fillRect(screenX + 2, houseBottom - 2, w, 4);

      // --- Paredes ---
      ctx.fillStyle = c.wall;
      ctx.fillRect(screenX, wallTop + roofH, w, hh - roofH);

      // Detalhe lateral escuro (igual house.js)
      ctx.fillStyle = c.wallDark;
      ctx.fillRect(screenX, wallTop + roofH, 2, hh - roofH);
      ctx.fillRect(screenX + w - 2, wallTop + roofH, 2, hh - roofH);

      // --- Telhado triangular (igual house.js) ---
      ctx.fillStyle = c.roof;
      ctx.beginPath();
      ctx.moveTo(screenX - 3, wallTop + roofH);
      ctx.lineTo(screenX + w / 2, wallTop);
      ctx.lineTo(screenX + w + 3, wallTop + roofH);
      ctx.closePath();
      ctx.fill();

      // Detalhe de sombra do telhado (metade escura, igual house.js)
      ctx.fillStyle = c.roofDark;
      ctx.beginPath();
      ctx.moveTo(screenX - 3, wallTop + roofH);
      ctx.lineTo(screenX + w / 2, wallTop);
      ctx.lineTo(screenX + w / 2, wallTop + 3);
      ctx.lineTo(screenX - 1, wallTop + roofH);
      ctx.closePath();
      ctx.fill();

      // --- Janelas (mesmo estilo house.js: moldura + vidro + divisória + reflexo) ---
      const winSize = Math.max(4, Math.round(w * 0.18));
      const winY = wallTop + roofH + Math.round((hh - roofH) * 0.2);

      if (h.hasLeftWindow && w > 18) {
        this._drawHorizonWindow(ctx, screenX + 3, winY, winSize);
      }
      if (h.hasRightWindow && w > 18) {
        this._drawHorizonWindow(ctx, screenX + w - 3 - winSize, winY, winSize);
      }

      // --- Porta (igual house.js: moldura + porta + maçaneta) ---
      const doorW = Math.max(4, Math.round(w * 0.22));
      const doorH = Math.max(7, Math.round((hh - roofH) * 0.55));
      const doorX = screenX + Math.round((w - doorW) / 2);
      const doorY = houseBottom - doorH;

      // Moldura
      ctx.fillStyle = "#44403C";
      ctx.fillRect(doorX - 1, doorY - 1, doorW + 2, doorH + 1);

      // Porta
      ctx.fillStyle = c.door;
      ctx.fillRect(doorX, doorY, doorW, doorH);

      // Maçaneta
      if (doorW > 5) {
        ctx.fillStyle = "#FBBF24";
        ctx.beginPath();
        ctx.arc(doorX + doorW - 2, doorY + doorH / 2, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Camada 2 — parallax mais rápido (próxima)
    const parallax2 = 0.3;
    ctx.fillStyle = "#458550"; // verde próximo
    ctx.beginPath();
    ctx.moveTo(0, baseY);

    for (const pt of this._mountainLayer2) {
      const screenX = pt.wx * (1 - parallax2) - camera.x * (1 - parallax2);
      if (screenX < -100 || screenX > canvasWidth + 100) continue;
      ctx.lineTo(screenX, baseY - pt.mh);
    }
    ctx.lineTo(canvasWidth + 100, baseY);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Desenha janela em miniatura no estilo das casas do primeiro plano (house.js).
   * Moldura cinza + vidro azul + divisória em cruz + reflexo branco.
   */
  _drawHorizonWindow(ctx, x, y, size) {
    // Moldura
    ctx.fillStyle = "#78716C";
    ctx.fillRect(x - 1, y - 1, size + 2, size + 2);

    // Vidro
    ctx.fillStyle = "#BFDBFE";
    ctx.fillRect(x, y, size, size);

    // Divisória em cruz
    ctx.fillStyle = "#78716C";
    const half = Math.floor(size / 2);
    ctx.fillRect(x + half, y, 1, size);
    ctx.fillRect(x, y + half, size, 1);

    // Reflexo
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x + 1, y + 1, half - 1, half - 1);
  }
}
