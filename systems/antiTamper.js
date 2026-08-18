// ============================================================
// antiTamper.js — Proteções anti-tampering client-side
// Impede manipulação do jogo via console, scripts e DevTools.
// ============================================================

/**
 * Cria e retorna o sistema anti-tampering.
 * Cada instância é auto-contida via closure.
 */
export default class AntiTamper {
  constructor() {
    this._devToolsOpen = false;
    this._onTamperDetected = null;
    this._checkInterval = null;
    this._rafRef = null;
    this._domObserver = null;

    // Salt interno para hash — gerado por sessão
    this._salt = this._generateSalt();

    // Referências nativas salvas ANTES de qualquer manipulação
    this._nativeRAF = window.requestAnimationFrame.bind(window);
    this._nativeNow = performance.now.bind(performance);
    this._nativeSetInterval = window.setInterval.bind(window);
    this._nativeClearInterval = window.clearInterval.bind(window);
  }

  /**
   * Inicializa todas as proteções.
   * @param {HTMLElement} container — container do jogo (ex: #gameContainer)
   * @param {Function} onTamperDetected — callback ao detectar tampering
   */
  init(container, onTamperDetected) {
    this._onTamperDetected = onTamperDetected || (() => {});

    this._freezeGlobals();
    this._blockKeyboardShortcuts();
    this._blockContextMenu(container);
    this._detectDevTools();
    this._protectGameLoop();
    this._monitorDOM(container);
    this._blockTextSelection(container);
  }

  /**
   * Destrói listeners e intervals.
   */
  destroy() {
    if (this._checkInterval) {
      this._nativeClearInterval(this._checkInterval);
    }
    if (this._domObserver) {
      this._domObserver.disconnect();
    }
  }

  // ============================
  // Camada 1 — Congelar Globais
  // ============================

  _freezeGlobals() {
    // Bloquear construtor Function (impede eval-like dinâmico)
    try {
      Object.defineProperty(window, 'Function', {
        get() {
          console.warn('[AntiTamper] Acesso ao construtor Function bloqueado.');
          return function () { return function () {}; };
        },
        set() {},
        configurable: false,
      });
    } catch (e) {
      // Silencioso — alguns browsers bloqueiam isso
    }

    // Bloquear eval
    try {
      Object.defineProperty(window, 'eval', {
        get() {
          console.warn('[AntiTamper] eval() bloqueado.');
          return function () { return undefined; };
        },
        set() {},
        configurable: false,
      });
    } catch (e) {
      // Silencioso
    }

    // Impedir que alguém sobrescreva requestAnimationFrame
    try {
      const nativeRAF = this._nativeRAF;
      Object.defineProperty(window, 'requestAnimationFrame', {
        get() { return nativeRAF; },
        set() {
          console.warn('[AntiTamper] Tentativa de sobrescrever requestAnimationFrame bloqueada.');
        },
        configurable: false,
      });
    } catch (e) {
      // Silencioso
    }

    // Impedir sobrescrita de performance.now
    try {
      const nativeNow = this._nativeNow;
      Object.defineProperty(performance, 'now', {
        get() { return nativeNow; },
        set() {
          console.warn('[AntiTamper] Tentativa de sobrescrever performance.now bloqueada.');
        },
        configurable: false,
      });
    } catch (e) {
      // Silencioso
    }
  }

  // ============================
  // Camada 2 — Detecção DevTools
  // ============================

  _detectDevTools() {
    const self = this;

    // Contagem de detecções consecutivas para evitar falsos positivos
    // (DPI scaling, bordas do Windows, etc. podem causar diferenças pontuais)
    let consecutiveDetections = 0;
    const REQUIRED_CONSECUTIVE = 3; // Precisa detectar 3x seguidas para confirmar
    const SIZE_THRESHOLD = 300;     // Threshold alto para evitar falso positivo

    // Método: Verificar tamanho da janela
    // Quando DevTools abre lateral/inferior, a diferença de tamanho muda muito
    this._checkInterval = this._nativeSetInterval(() => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      if (widthDiff > SIZE_THRESHOLD || heightDiff > SIZE_THRESHOLD) {
        consecutiveDetections++;
        if (consecutiveDetections >= REQUIRED_CONSECUTIVE && !self._devToolsOpen) {
          self._devToolsOpen = true;
          self._onTamperDetected('devtools_open');
        }
      } else {
        consecutiveDetections = 0;
        self._devToolsOpen = false;
      }
    }, 1500);

    // Nota: o trap via console.log com toString() foi removido porque
    // causa falsos positivos em vários browsers modernos (Chrome 120+, Edge, etc.)
  }

  get isDevToolsOpen() {
    return this._devToolsOpen;
  }

  // ============================
  // Camada 3 — Bloquear Atalhos
  // ============================

  _blockKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+S (Save)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, true); // useCapture = true para pegar antes de tudo
  }

  _blockContextMenu(container) {
    container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
  }

  _blockTextSelection(container) {
    container.style.userSelect = 'none';
    container.style.webkitUserSelect = 'none';
    container.style.msUserSelect = 'none';
  }

  // ============================
  // Camada 4 — Integridade do Loop
  // ============================

  _protectGameLoop() {
    // Referências nativas já salvas no construtor (this._nativeRAF, this._nativeNow)
  }

  /**
   * Verifica se o timestamp do frame é consistente.
   * Retorna true se timing parece normal, false se manipulado.
   * @param {number} dt — delta time em segundos
   * @param {number} timestamp — timestamp do requestAnimationFrame
   * @returns {boolean}
   */
  validateTiming(dt, timestamp) {
    // Se o drift entre performance.now() e o timestamp do RAF é > 500ms,
    // o timestamp foi manipulado
    const now = this._nativeNow();
    const drift = Math.abs(now - timestamp);

    if (drift > 500) {
      this._onTamperDetected('timing_manipulation');
      return false;
    }

    return true;
  }

  // ============================
  // Camada 5 — Monitorar DOM
  // ============================

  _monitorDOM(container) {
    this._domObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Detectar adição de scripts no container do jogo
        for (const node of mutation.addedNodes) {
          if (node.tagName === 'SCRIPT') {
            node.remove();
            this._onTamperDetected('script_injection');
          }
        }
      }
    });

    this._domObserver.observe(container, {
      childList: true,
      subtree: true,
    });

    // Também observar <head> para scripts injetados globalmente
    this._domObserver.observe(document.head, {
      childList: true,
      subtree: true,
    });
  }

  // ============================
  // Camada 6 — Hash/Integridade
  // ============================

  _generateSalt() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Gera um hash simples para validar integridade do score.
   * Não é criptograficamente forte (client-side), mas dificulta
   * manipulação casual via console.
   *
   * @param {number} score
   * @param {number} checkpoints
   * @param {number} playTime
   * @returns {string} hash hex
   */
  hashGameState(score, checkpoints, playTime) {
    const data = `${this._salt}:${score}:${checkpoints}:${Math.floor(playTime)}`;
    // Simple FNV-1a hash
    let hash = 0x811c9dc5;
    for (let i = 0; i < data.length; i++) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Valida que o score é consistente com os checkpoints ativados e documentos coletados.
   * @param {number} score
   * @param {number} checkpoints
   * @param {number} scorePerCheckpoint
   * @param {number} totalScore
   * @param {number} expectedMax
   * @returns {boolean}
   */
  validateScore(totalScore, expectedMax) {
    if (totalScore < 0 || totalScore > expectedMax) {
      this._onTamperDetected('score_mismatch');
      return false;
    }
    return true;
  }
}
