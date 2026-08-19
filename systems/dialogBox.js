// ============================================================
// dialogBox.js — Caixa de diálogo temporizada com fade
// Suporta animações (vídeo MP4, GIF animado ou imagem estática)
// renderizadas ACIMA do texto, encapsuladas no modal Canvas.
// ============================================================

import { DIALOG, CANVAS, HUD } from '../config/gameMetrics.js';

export default class DialogBox {
  constructor() {
    this.active = false;
    this.text = '';
    this.timer = 0;
    this.duration = 0;
    this.opacity = 0;
    this.fadeState = 'none'; // none | fadeIn | visible | fadeOut
    this.onComplete = null;

    // --- Mídia opcional dentro do modal ---
    this.currentMedia = null; // objeto { video, img } ou elemento HTML
    this.hasMedia = false;

    // Cache de mídias pré-carregadas
    this._mediaCache = {};
  }

  /**
   * Pré-carrega uma mídia (suporta tanto vídeo MP4 quanto GIF/imagem)
   * @param {string} key — Identificador
   * @param {string} src — Caminho do asset
   */
  preloadImage(key, src) {
    this.preloadMedia(key, src);
  }

  preloadMedia(key, src) {
    // 1. Criar elemento de vídeo (para MP4 ou GIF com formato de vídeo)
    const video = document.createElement('video');
    video.src = src;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('muted', '');
    video.preload = 'auto';

    // 2. Criar elemento de imagem (para GIF real / JPG / PNG)
    const img = new Image();
    img.src = src;

    const entry = { video, img, src };
    this._mediaCache[key] = entry;

    // Pré-iniciar carregamento de vídeo se suportado
    try {
      video.load();
    } catch (e) {}

    return entry;
  }

  /**
   * Retorna uma mídia do cache com suporte a aliases
   * @param {string} key
   * @returns {{ video: HTMLVideoElement, img: HTMLImageElement } | null}
   */
  getCachedImage(key) {
    if (this._mediaCache[key]) return this._mediaCache[key];

    const aliases = {
      stepConclude: ['stepTransition', 'checkpoint'],
      stepTransition: ['stepConclude', 'checkpoint'],
      youDie: ['gameOver', 'death'],
      gameOver: ['youDie', 'death'],
    };

    const altKeys = aliases[key] || [];
    for (const alt of altKeys) {
      if (this._mediaCache[alt]) return this._mediaCache[alt];
    }
    return null;
  }

  /**
   * Exibe uma mensagem temporizada, opcionalmente com mídia acima do texto.
   * @param {string} text
   * @param {number} duration - ms
   * @param {Function} [onComplete]
   * @param {any} [media] - Mídia pré-carregada
   * @param {boolean} [skippable=false] - Se o usuário pode pular
   */
  show(text, duration, onComplete = null, media = null, skippable = false) {
    this.active = true;
    this.text = text;
    this.duration = duration;
    this.timer = 0;
    this.opacity = 0;
    this.fadeState = 'fadeIn';
    this.onComplete = onComplete;
    this.skippable = skippable;

    // Resolver objeto de mídia
    this.currentMedia = media;
    this.hasMedia = false;

    // Se tiver elemento de vídeo, iniciar reprodução
    if (media) {
      const vid = media.video || (media.tagName === 'VIDEO' ? media : null);
      if (vid) {
        try {
          vid.currentTime = 0;
          const playPromise = vid.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {});
          }
        } catch (e) {}
      }
    }
  }

  hide() {
    this.fadeState = 'fadeOut';
  }

  /**
   * Pula imediatamente o diálogo se estiver ativo e for pulável.
   * @returns {boolean}
   */
  skip() {
    if (this.active && this.skippable && this.fadeState !== 'fadeOut') {
      this.hide();
      return true;
    }
    return false;
  }

  update(dt) {
    if (!this.active) return;

    // Verificar se mídia está pronta para desenho
    if (this.currentMedia && !this.hasMedia) {
      const vid = this.currentMedia.video || (this.currentMedia.tagName === 'VIDEO' ? this.currentMedia : null);
      const img = this.currentMedia.img || (this.currentMedia.tagName === 'IMG' ? this.currentMedia : null);

      if (vid && (vid.readyState >= 2 || vid.videoWidth > 0)) {
        this.hasMedia = true;
      } else if (img && img.complete && img.naturalWidth > 0) {
        this.hasMedia = true;
      }
    }

    const fadeDur = DIALOG.FADE_DURATION / 1000;

    switch (this.fadeState) {
      case 'fadeIn':
        this.opacity = Math.min(1, this.opacity + dt / fadeDur);
        if (this.opacity >= 1) {
          this.fadeState = 'visible';
          this.timer = 0;
        }
        break;

      case 'visible':
        this.timer += dt * 1000;
        if (this.timer >= this.duration) {
          this.fadeState = 'fadeOut';
        }
        break;

      case 'fadeOut':
        this.opacity = Math.max(0, this.opacity - dt / fadeDur);
        if (this.opacity <= 0) {
          this.active = false;
          this.fadeState = 'none';
          this.currentMedia = null;
          this.hasMedia = false;
          this.skippable = false;
          if (this.onComplete) {
            this.onComplete();
            this.onComplete = null;
          }
        }
        break;
    }
  }

  render(ctx) {
    if (!this.active || this.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    // Detectar fonte de desenho (Vídeo ou Imagem)
    let drawSource = null;
    let natW = 0;
    let natH = 0;

    if (this.currentMedia) {
      const vid = this.currentMedia.video || (this.currentMedia.tagName === 'VIDEO' ? this.currentMedia : null);
      const img = this.currentMedia.img || (this.currentMedia.tagName === 'IMG' ? this.currentMedia : null);

      if (vid && (vid.readyState >= 2 || vid.videoWidth > 0)) {
        drawSource = vid;
        natW = vid.videoWidth || 320;
        natH = vid.videoHeight || 240;
      } else if (img && img.complete && img.naturalWidth > 0) {
        drawSource = img;
        natW = img.naturalWidth;
        natH = img.naturalHeight;
      }
    }

    const hasVisual = !!drawSource;

    // --- Processamento de Texto e Quebra de Linha (\n + Word Wrap) ---
    const rawText = String(this.text || '').replace(/\\n/g, '\n');
    const isLong = rawText.length > 70;
    const fontSize = isLong ? 11 : 13;
    const lineHeight = fontSize + 9;
    ctx.font = `${fontSize}px ${HUD.FONT_FAMILY}`;

    const w = Math.min(DIALOG.WIDTH, CANVAS.WIDTH - 40);
    const maxWidth = w - 44;

    const paragraphs = rawText.split('\n');
    const lines = [];

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) {
        lines.push('');
        continue;
      }
      const words = trimmed.split(/\s+/);
      let currentLine = '';

      for (const word of words) {
        if (!word) continue;
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
    }

    const totalTextHeight = Math.max(lineHeight, lines.length * lineHeight);
    const imgDisplayH = hasVisual ? 140 : 0;
    const imgPadding = hasVisual ? 14 : 0;
    const skipPromptH = this.skippable ? 22 : 0;
    const textAreaH = Math.max(DIALOG.HEIGHT, totalTextHeight + 30 + skipPromptH);
    const h = textAreaH + imgDisplayH + imgPadding;
    const x = (CANVAS.WIDTH - w) / 2;
    const y = Math.max(10, CANVAS.HEIGHT / 2 - h / 2 - 10);

    // --- Fundo ---
    ctx.fillStyle = DIALOG.BG_COLOR;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();

    // --- Borda ---
    ctx.strokeStyle = DIALOG.BORDER_COLOR;
    ctx.lineWidth = DIALOG.BORDER_WIDTH;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.stroke();

    // --- Brilho sutil no topo ---
    const gradient = ctx.createLinearGradient(x, y, x, y + 20);
    gradient.addColorStop(0, 'rgba(255,255,255,0.08)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 20, [12, 12, 0, 0]);
    ctx.fill();

    // --- Renderizar Mídia (acima do texto) ---
    let textStartY = y;
    if (hasVisual && drawSource) {
      const imgPad = 12;
      const imgAreaY = y + imgPad;
      const imgAreaH = imgDisplayH - imgPad;

      // Calcular proporção para manter aspect ratio
      const maxImgW = w - imgPad * 2;
      const scale = Math.min(maxImgW / natW, imgAreaH / natH, 1);
      const drawW = natW * scale;
      const drawH = natH * scale;
      const drawX = x + (w - drawW) / 2;
      const drawY = imgAreaY + (imgAreaH - drawH) / 2;

      // Clip arredondado para a mídia
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(drawX, drawY, drawW, drawH, 8);
      ctx.clip();
      ctx.drawImage(drawSource, drawX, drawY, drawW, drawH);
      ctx.restore();

      // Borda sutil na mídia
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(drawX, drawY, drawW, drawH, 8);
      ctx.stroke();

      // Pulse glow na moldura
      const pulse = Math.sin(Date.now() / 800) * 0.15 + 0.25;
      ctx.shadowColor = 'rgba(255, 215, 0, ' + pulse + ')';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = 'rgba(255, 215, 0, ' + (pulse * 0.5) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(drawX, drawY, drawW, drawH, 8);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      textStartY = y + imgDisplayH + imgPadding;
    }

    // --- Renderizar Texto ---
    ctx.fillStyle = DIALOG.TEXT_COLOR;
    ctx.font = `${fontSize}px ${HUD.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textCenterY = hasVisual
      ? textStartY + (textAreaH - skipPromptH - totalTextHeight) / 2 + lineHeight / 2
      : y + (h - skipPromptH - totalTextHeight) / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, x + w / 2, textCenterY + i * lineHeight);
    });

    // --- Indicador de Pular (se skippable) ---
    if (this.skippable) {
      const pulseAlpha = Math.sin(Date.now() / 250) * 0.3 + 0.7;
      ctx.save();
      ctx.globalAlpha = this.opacity * pulseAlpha;
      ctx.fillStyle = '#FBBF24';
      ctx.font = `9px ${HUD.FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('[ ESPAÇO / CLIQUE PARA AVANÇAR ▶ ]', x + w / 2, y + h - 10);
      ctx.restore();
    }

    ctx.restore();
  }
}
