// ============================================================
// characterConfig.js — Paleta visual isolada do personagem
// Altere cores aqui sem tocar na lógica de renderização.
// ============================================================

const characterConfig = {
  // --- Pele ---
  skinColor: "#99512aff",
  skinHighlight: "#99512aff",

  // --- Cabelo ---
  hairStyle: "bald", // careca

  // --- Olhos ---
  eyeColor: "#FFFFFF",
  pupilColor: "#2b925eff",

  // --- Vestimenta ---
  vestColor: "#00d9ffff", // Colete Azul
  vestHighlight: "#2fafc5ff", // Reflexo do colete
  shirtColor: "#D1D5DB", // Camisa interna cinza claro

  // --- Calça ---
  pantsColor: "#4B5563", // Calça Cinza
  pantsHighlight: "#6B7280",

  // --- Sapatos ---
  shoeColor: "#1F1F1F",
  shoeSoleColor: "#6B7280",

  // --- Contorno ---
  outlineColor: "#0F0F0F",
  outlineWidth: 1.5,
};

/**
 * Atualiza a paleta do personagem em tempo de execução.
 * @param {Partial<typeof characterConfig>} newColors
 */
export function updatePalette(newColors) {
  Object.assign(characterConfig, newColors);
}

/**
 * Retorna uma cópia somente-leitura da paleta atual.
 */
export function getPalette() {
  return { ...characterConfig };
}

export default characterConfig;
