// ============================================================
// messages.js — Listas de mensagens configuráveis
// Edite textos aqui sem alterar lógica do jogo.
// ============================================================

export const deathMessages = [
  "Deu ruim! Os documentos do cadastro estão desatualizados! A certidão era do século passado, vamos ter que corrigir tudo rapidinho!",
  "Caiu no mangue! O terreno entrou em Área de Preservação Permanente (APP). Vamos ter que readequar a poligonal antes de avançar!",
  "Nota devolutiva! Faltou a assinatura do ex-cônjuge de 1994 no cadastro. Tira a poeira das pastas e vamos ajustar essa papelada!",
  "Trena torta! A medição topográfica deu sobreposição no lote vizinho! Calma, a Perpart vai ajustar a planta pra ninguém sair brigado.",
  "Nó cego! Contrato de gaveta sem firma reconhecida de três donos atrás? Eita! Vamos ter que fazer a busca fundiária completa.",
  "Eita, travou! O imóvel fica em área de alto risco na encosta. Precisamos do laudo da Defesa Civil e plano de mitigação antes de registrar!",
  "Confusão de divisas! O muro da casa invadiu a rua do loteamento. Hora de remarcar o lote e refazer o memorial descritivo!",
  "Sujou! O RG anexado tá ilegível e borrado de café. O cartório recusou! Atualize os dados do morador e tente de novo.",
  "Briga de herdeiros! O imóvel tá num inventário não concluído desde a década de 80. Vamos precisar da regularização jurídica primeiro.",
  "Sinal vermelho! A poligonal da comunidade bateu com uma área privada não desapropriada. A equipe jurídica vai ter que entrar em ação!",
];

export const checkpointMessages = [
  "Cartório sem fila! A Perpart acelerou os processos e saiu uma fornada de títulos! A comunidade tá em festa e a casa agora é de papel passado!",
  "Adeus, contrato de gaveta! Agora é Título de Propriedade na mão! Centenas de famílias dormindo com a escritura pública embaixo do travesseiro e o coração em paz.",
  "A todo vapor! Equipe da Perpart em campo no Agreste e Sertão! Mais uma etapa concluída com sucesso rumo à meta dos 50 mil imóveis!",
  "Que vitória! Regularização em Pernambuco avançando forte! Comunidades do Recife, Olinda e Jaboatão agora têm endereço e dono oficial no papel!",
  "Selo de aprovação! O registrador nem piscou: documentos 100% corretos! A escritura saiu mais rápida do que bloco de frevo em Olinda!",
  "História transformada! Décadas de espera acabaram hoje. A Perpart cravou mais um registro definitivo e deu dignidade para a comunidade!",
  "Escritura na mão! A equipe técnica deu show de eficiência. A certidão tá registrada e o patrimônio da família tá garantido para sempre!",
  "Semana Solo Seguro com super destaque da Perpart! Mais de 1000 títulos carimbados e entregues de uma só vez. Segue o jogo!",
  "Marco histórico! Moradores de áreas consolidadas recebem a documentação definitiva! Com a Perpart, a Regularização fundiária se faz assim!",
  "Tudo registrado! O cartório carimbou, a certidão saiu e o placar subiu! Mais uma comunidade com direito à moradia formalizado!",
];

export const victoryMessage =
  "Com sua ajuda a Perpart conseguiu cumprir a sua jornada de 50 mil títulos de propriedade de imóveis!";

export const startMessage =
  "Colete o máximo de títulos de propriedade de imóveis que conseguir!";

// Pools de mensagens disponíveis (para evitar repetição)
let availableDeathMessages = [...deathMessages];
let availableCheckpointMessages = [...checkpointMessages];

/**
 * Reinicia os pools de mensagens para o estado inicial.
 */
export function resetMessagePools() {
  availableDeathMessages = [...deathMessages];
  availableCheckpointMessages = [...checkpointMessages];
}

/**
 * Retorna uma mensagem de morte aleatória sem repetição.
 * Após ser exibida, a mensagem não se repetirá até que todas tenham sido usadas.
 */
export function getRandomDeathMessage() {
  if (availableDeathMessages.length === 0) {
    availableDeathMessages = [...deathMessages];
  }
  const idx = Math.floor(Math.random() * availableDeathMessages.length);
  const [msg] = availableDeathMessages.splice(idx, 1);
  return msg;
}

/**
 * Retorna uma mensagem de checkpoint aleatória sem repetição.
 * Após ser exibida, a mensagem não se repetirá até que todas tenham sido usadas.
 */
export function getRandomCheckpointMessage() {
  if (availableCheckpointMessages.length === 0) {
    availableCheckpointMessages = [...checkpointMessages];
  }
  const idx = Math.floor(Math.random() * availableCheckpointMessages.length);
  const [msg] = availableCheckpointMessages.splice(idx, 1);
  return msg;
}

/**
 * Retorna uma mensagem de checkpoint sorteada sem repetição (mantém compatibilidade).
 */
export function getCheckpointMessage() {
  return getRandomCheckpointMessage();
}
