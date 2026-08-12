// ============================================================
// gameMetrics.js — Dados puros centralizados do jogo
// Nenhuma lógica aqui, apenas constantes editáveis.
// ============================================================

export const CANVAS = {
  WIDTH: 960,
  HEIGHT: 540,
  BG_SKY_TOP: "#87CEEB",
  BG_SKY_BOTTOM: "#E0F0FF",
};

export const WORLD = {
  TOTAL_LENGTH: 12000, // comprimento total do mundo em px
  GROUND_Y: 440, // posição Y do chão (topo da faixa de grama)
  GROUND_HEIGHT: 100, // altura da faixa de grama
  SEGMENT_WIDTH: 160, // largura de cada segmento do cenário

  // Distribuição percentual dos segmentos
  DISTRIBUTION: {
    HOUSE: 0.5,
    TREE: 0.2,
    OBSTACLE: 0.15,
    CHECKPOINT: 0.1,
    EMPTY: 0.05,
  },
};

export const PHYSICS = {
  GRAVITY: 1600, // px/s²
  FRICTION: 0.85, // desaceleração horizontal
};

export const PLAYER = {
  WIDTH: 28,
  HEIGHT: 48,
  SPEED: 260, // velocidade horizontal px/s
  JUMP_FORCE: -580, // impulso vertical do pulo
  SPAWN_X: 120,
  SPAWN_Y: 392, // GROUND_Y - HEIGHT
};

export const CHECKPOINT = {
  COUNT: 5, // checkpoints por fase
  SCORE_PER_CHECKPOINT: 10000, // Cada checkpoint garante essa meta
  MAX_SCORE: 50000, // Valor final (5 * 10000)
  // Duração de cada estado da FSM (ms)
  DOOR_OPEN_DURATION: 600,
  ENTER_DURATION: 500,
  DOOR_CLOSE_DURATION: 400,
  DIALOG_DURATION: 2500,
  DOOR_REOPEN_DURATION: 600,
  EXIT_DURATION: 500,
};

export const FLAG = {
  WIDTH: 40,
  HEIGHT: 60,
  START_COLOR: "#00d9ffff", // verde
  END_COLOR: "#00d9ffff", // vermelho
};

export const OBSTACLE_METRICS = {
  RIVER_WIDTH: 160,
  RIVER_DEPTH: 60,
  CACTUS_WIDTH: 24,
  CACTUS_HEIGHT: 44,
  ROCK_WIDTH: 36,
  ROCK_HEIGHT: 28,
  DANGER_ZONE_WIDTH: 80,
  MIN_OBSTACLE_SPACING: 2, // mínimo de segmentos entre obstáculos
  MAX_OBSTACLE_SPACING: 5, // máximo de segmentos entre obstáculos
};

export const HUD = {
  PADDING: 16,
  FONT_FAMILY: '"Press Start 2P", "Courier New", monospace',
  FONT_SIZE: 12,
};

export const DIALOG = {
  WIDTH: 500,
  HEIGHT: 100,
  FADE_DURATION: 300, // ms
  BG_COLOR: "rgba(0, 0, 0, 0.82)",
  TEXT_COLOR: "#FFFFFF",
  BORDER_COLOR: "#F59E0B",
  BORDER_WIDTH: 3,
};
