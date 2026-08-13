// ============================================================
// audio.js — Sistema nativo de áudio (Web Audio API)
// Sintetizador 8-bit simples sem dependência de arquivos externos
// ============================================================

export default class AudioSystem {
  constructor() {
    this.ctx = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio API não suportada", e);
    }
  }

  playJump() {
    if (!this.initialized || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = "square";
    // Frequência sobe rápido (estilo pulo de plataforma)
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playDeath() {
    if (!this.initialized || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = "sawtooth";
    // Frequência desce rápido (estilo erro/morte)
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playCheckpoint() {
    if (!this.initialized || !this.ctx) return;
    
    // Tocar um acorde simples (arpejo)
    const notes = [440, 554.37, 659.25]; // A4, C#5, E5 (Lá maior)
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.1);

      gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, this.ctx.currentTime + i * 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.1 + 0.3);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + i * 0.1);
      osc.stop(this.ctx.currentTime + i * 0.1 + 0.4);
    });
  }

  playCollect() {
    if (!this.initialized || !this.ctx) return;

    // Dois tons agudos e brilhantes (arpejo estilo moeda/item raro)
    const notes = [659.25, 987.77]; // E5, B5
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.07);

      gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime + i * 0.07);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.07 + 0.15);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + i * 0.07);
      osc.stop(this.ctx.currentTime + i * 0.07 + 0.16);
    });
  }

  playVictory() {
    if (!this.initialized || !this.ctx) return;
    
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.15);

      gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime + i * 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.15 + 0.4);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + i * 0.15);
      osc.stop(this.ctx.currentTime + i * 0.15 + 0.5);
    });
  }
}
