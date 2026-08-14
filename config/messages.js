// ============================================================
// messages.js — Listas de mensagens configuráveis
// Edite textos aqui sem alterar lógica do jogo.
// ============================================================

export const deathMessages = [
  "Ops! O rio te levou... Tente de novo!",
  "Cuidado com a água! Vamos lá, de novo!",
  "Escorregou feio! Mas não desista!",
  "A correnteza foi mais forte dessa vez...",
  "Quase! O rio não perdoa, mas você é persistente!",
  "Caiu na armadilha! Respire fundo e tente novamente.",
  "Eita! Cuidado por onde pisa!",
  "Tropeçou feio! Bora tentar de novo!",
  "A natureza é traiçoeira... Levante-se!",
  "Não foi dessa vez, mas a próxima vai ser!",
];

export const checkpointMessages = [
  "Checkpoint 1 — Bom começo! Continue assim!",
  "Checkpoint 2 — Você está pegando o jeito!",
  "Checkpoint 3 — Metade do caminho! Não pare agora!",
  "Checkpoint 4 — Quase lá! Só mais um pouco!",
  "Checkpoint 5 — Último checkpoint! A linha de chegada está perto!",
];

export const victoryMessage = "🎉 Parabéns! Você completou a fase!";

export const startMessage =
  "Bem-vindo! Use ← → para mover e ESPAÇO para pular. Boa sorte!";

/**
 * Retorna uma mensagem de morte aleatória.
 */
export function getRandomDeathMessage() {
  const idx = Math.floor(Math.random() * deathMessages.length);
  return deathMessages[idx];
}

/**
 * Retorna a mensagem do checkpoint pelo índice.
 */
export function getCheckpointMessage(index) {
  return checkpointMessages[index] || `Checkpoint ${index + 1} alcançado!`;
}
