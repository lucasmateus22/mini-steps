// ============================================================
// checkpointSequence.js — FSM da animação de checkpoint
// Estados: IDLE → DOOR_OPENING → ENTERING → DOOR_CLOSING
//          → DIALOG → DOOR_REOPENING → EXITING → IDLE
// ============================================================

import { CHECKPOINT, WORLD } from '../config/gameMetrics.js';
import { getCheckpointMessage } from '../config/messages.js';

/**
 * @readonly
 * @enum {string}
 */
const State = {
  IDLE: 'IDLE',
  DOOR_OPENING: 'DOOR_OPENING',
  ENTERING: 'ENTERING',
  DOOR_CLOSING: 'DOOR_CLOSING',
  DIALOG: 'DIALOG',
  DOOR_REOPENING: 'DOOR_REOPENING',
  EXITING: 'EXITING',
};

export default class CheckpointSequence {
  constructor(dialogBox) {
    this.state = State.IDLE;
    this.dialogBox = dialogBox;
    this.timer = 0;

    /** @type {import('../world/house.js').default|null} */
    this.currentHouse = null;
    /** @type {import('../entities/player.js').default|null} */
    this.player = null;

    this.checkpointIndex = -1;
    this.onComplete = null;
  }

  get isActive() {
    return this.state !== State.IDLE;
  }

  /**
   * Inicia a sequência de checkpoint.
   * @param {import('../entities/player.js').default} player
   * @param {import('../world/house.js').default} house
   * @param {number} checkpointIndex
   * @param {Function} [onComplete]
   */
  start(player, house, checkpointIndex, onComplete = null) {
    if (this.isActive) return;

    this.player = player;
    this.currentHouse = house;
    this.checkpointIndex = checkpointIndex;
    this.onComplete = onComplete;

    // Desabilitar controle do jogador
    player.controlEnabled = false;
    player.vx = 0;

    // Salvar checkpoint
    player.saveCheckpoint(
      house.x + house.width / 2 - player.width / 2,
      WORLD.GROUND_Y - player.height
    );

    // Transição para primeiro estado
    this._transition(State.DOOR_OPENING);
  }

  _transition(newState) {
    this.state = newState;
    this.timer = 0;
  }

  update(dt) {
    if (this.state === State.IDLE) return;

    this.timer += dt * 1000; // converter para ms

    switch (this.state) {
      case State.DOOR_OPENING:
        this._updateDoorOpening(dt);
        break;

      case State.ENTERING:
        this._updateEntering(dt);
        break;

      case State.DOOR_CLOSING:
        this._updateDoorClosing(dt);
        break;

      case State.DIALOG:
        this._updateDialog(dt);
        break;

      case State.DOOR_REOPENING:
        this._updateDoorReopening(dt);
        break;

      case State.EXITING:
        this._updateExiting(dt);
        break;
    }
  }

  // --- Estado 1: Porta abrindo ---
  _updateDoorOpening(dt) {
    const done = this.currentHouse.openDoor(dt, 1000 / CHECKPOINT.DOOR_OPEN_DURATION);
    if (done || this.timer >= CHECKPOINT.DOOR_OPEN_DURATION) {
      this.currentHouse.doorOpen = 1;
      this._transition(State.ENTERING);
    }
  }

  // --- Estado 2: Personagem entrando na casa ---
  _updateEntering(dt) {
    const doorPos = this.currentHouse.getDoorWorldPosition();
    const targetX = doorPos.x + doorPos.width / 2 - this.player.width / 2;
    const speed = 80; // px/s

    // Mover jogador em direção à porta
    const dx = targetX - this.player.x;
    if (Math.abs(dx) > 2) {
      this.player.x += Math.sign(dx) * speed * dt;
      this.player.facing = Math.sign(dx);
      this.player.state = 'walk';
    }

    if (this.timer >= CHECKPOINT.ENTER_DURATION) {
      this.player.visible = false;
      this.player.state = 'idle';
      this._transition(State.DOOR_CLOSING);
    }
  }

  // --- Estado 3: Porta fechando ---
  _updateDoorClosing(dt) {
    const done = this.currentHouse.closeDoor(dt, 1000 / CHECKPOINT.DOOR_CLOSE_DURATION);
    if (done || this.timer >= CHECKPOINT.DOOR_CLOSE_DURATION) {
      this.currentHouse.doorOpen = 0;
      // Marcar como ativado
      this.currentHouse.activated = true;
      this._transition(State.DIALOG);
      // Exibir mensagem com a imagem do checkpoint no topo
      const msg = getCheckpointMessage(this.checkpointIndex);
      const stepImg = this.dialogBox.getCachedImage
        ? (this.dialogBox.getCachedImage('stepConclude') || this.dialogBox.getCachedImage('stepTransition'))
        : null;
      this.dialogBox.show(msg, CHECKPOINT.DIALOG_DURATION, null, stepImg);
    }
  }

  // --- Estado 4: Diálogo exibido ---
  _updateDialog(_dt) {
    if (this.timer >= CHECKPOINT.DIALOG_DURATION + 400) {
      this.dialogBox.hide();
      this._transition(State.DOOR_REOPENING);
    }
  }

  // --- Estado 5: Porta reabrindo ---
  _updateDoorReopening(dt) {
    const done = this.currentHouse.openDoor(dt, 1000 / CHECKPOINT.DOOR_REOPEN_DURATION);
    if (done || this.timer >= CHECKPOINT.DOOR_REOPEN_DURATION) {
      this.currentHouse.doorOpen = 1;
      this.player.visible = true;
      // Posicionar na porta
      const doorPos = this.currentHouse.getDoorWorldPosition();
      this.player.x = doorPos.x + doorPos.width / 2 - this.player.width / 2;
      this.player.y = WORLD.GROUND_Y - this.player.height;
      this._transition(State.EXITING);
    }
  }

  // --- Estado 6: Personagem saindo ---
  _updateExiting(dt) {
    const exitX = this.currentHouse.x + this.currentHouse.width + 20;
    const speed = 80;

    const dx = exitX - this.player.x;
    if (Math.abs(dx) > 2) {
      this.player.x += Math.sign(dx) * speed * dt;
      this.player.facing = 1;
      this.player.state = 'walk';
    }

    if (this.timer >= CHECKPOINT.EXIT_DURATION) {
      // Fechar porta depois que saiu
      this.currentHouse.closeDoor(1); // instantâneo
      this.currentHouse.doorOpen = 0;

      // Devolver controle
      this.player.controlEnabled = true;
      this.player.state = 'idle';
      this.player.visible = true;

      // Callback
      if (this.onComplete) {
        this.onComplete(this.checkpointIndex);
      }

      // Resetar FSM
      this.currentHouse = null;
      this.player = null;
      this.checkpointIndex = -1;
      this.onComplete = null;
      this._transition(State.IDLE);
    }
  }
}
