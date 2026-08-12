// ============================================================
// collision.js — Detecção e resposta de colisões AABB
// ============================================================

export default class CollisionSystem {
  /**
   * Testa sobreposição AABB entre dois retângulos.
   * @returns {boolean}
   */
  static testAABB(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  /**
   * Resolve colisões do player com plataformas (chão).
   * Push-out vertical.
   */
  static resolvePlayerPlatforms(player, platforms) {
    const pb = player.getBounds();
    let onGround = false;

    for (const plat of platforms) {
      if (!this.testAABB(pb, plat)) continue;

      // Calcular overlap em cada direção
      const overlapTop = (pb.y + pb.height) - plat.y;
      const overlapBottom = (plat.y + plat.height) - pb.y;
      const overlapLeft = (pb.x + pb.width) - plat.x;
      const overlapRight = (plat.x + plat.width) - pb.x;

      const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);

      if (minOverlap === overlapTop && player.vy >= 0) {
        // Caindo em cima da plataforma
        player.y = plat.y - player.height;
        player.vy = 0;
        onGround = true;
      } else if (minOverlap === overlapLeft) {
        player.x = plat.x - player.width;
        player.vx = 0;
      } else if (minOverlap === overlapRight) {
        player.x = plat.x + plat.width;
        player.vx = 0;
      }
    }

    player.onGround = onGround;
  }

  /**
   * Verifica colisão do player com obstáculos sólidos.
   * Retorna lista de obstáculos atingidos.
   */
  static checkPlayerObstacles(player, obstacles) {
    const pb = player.getBounds();
    const hit = [];

    for (const obs of obstacles) {
      const ob = obs.solid ? obs.getBounds() : obs.getCollisionBounds();
      if (this.testAABB(pb, ob)) {
        hit.push(obs);

        // Se sólido, push-out
        if (obs.solid) {
          const overlapLeft = (pb.x + pb.width) - ob.x;
          const overlapRight = (ob.x + ob.width) - pb.x;
          const overlapTop = (pb.y + pb.height) - ob.y;

          // Prefer push-out horizontal para obstáculos pequenos
          if (overlapTop < overlapLeft && overlapTop < overlapRight && player.vy >= 0) {
            player.y = ob.y - player.height;
            player.vy = 0;
            player.onGround = true;
          } else if (overlapLeft < overlapRight) {
            player.x = ob.x - player.width;
            player.vx = 0;
          } else {
            player.x = ob.x + ob.width;
            player.vx = 0;
          }
        }
      }
    }

    return hit;
  }

  /**
   * Verifica colisão do player com triggers de checkpoint.
   * @returns {number} índice do checkpoint (-1 se nenhum)
   */
  static checkPlayerCheckpoints(player, checkpointHouses) {
    const pb = player.getBounds();

    for (const house of checkpointHouses) {
      if (house.activated) continue;
      const trigger = house.getCheckpointTrigger();
      if (trigger && this.testAABB(pb, trigger)) {
        return house.checkpointIndex;
      }
    }

    return -1;
  }

  /**
   * Verifica se o player caiu no vazio (abaixo do chão).
   */
  static checkFallOff(player, groundY) {
    return player.y > groundY + 100;
  }

  /**
   * Verifica colisão com a bandeira final.
   */
  static checkEndFlag(player, endFlag) {
    if (!endFlag) return false;
    return this.testAABB(player.getBounds(), endFlag.getBounds());
  }
}
