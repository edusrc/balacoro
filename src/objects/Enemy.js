import * as THREE from "three";
import {
  BOSS_SIZE_MULTIPLIER,
  BOSS_DAMAGE_MULTIPLIER,
  BOSS_XP_MULTIPLIER,
} from "../constants.js";

export class Enemy extends THREE.Object3D {
  constructor(
    target,
    spawnPosition,
    speed = 4,
    health = 1,
    difficulty = 0,
    isBoss = false
  ) {
    super();
    this.target = target;
    this.speed = speed;
    this.maxHealth = health;
    this.health = health;
    this.isBoss = isBoss;
    this.size = isBoss ? BOSS_SIZE_MULTIPLIER : 1;
    this.hitboxRadius = this.size / 2;
    this.damageMultiplier = isBoss ? BOSS_DAMAGE_MULTIPLIER : 1;
    this.playerContactTime = 0;
    this.difficulty = difficulty;
    this.xpReward = isBoss
      ? (difficulty || 1) * BOSS_XP_MULTIPLIER
      : difficulty || 1;
    const factor = Math.min(this.difficulty / 10, 1);
    const r = factor;
    const g = 0;
    const b = 1 - factor;
    const color = new THREE.Color(r, g, b);
    const geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
    const material = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = this.size / 2 - 0.5;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.damageTimer = 0;
    this.add(mesh);

    this.position.copy(spawnPosition);

    setTimeout(() => {
      this.createHealthBar();
    }, 0);
  }

  createHealthBar() {
    this.healthCanvas = document.createElement("canvas");
    this.healthCanvas.width = 64;
    this.healthCanvas.height = 8;
    this.healthContext = this.healthCanvas.getContext("2d");

    this.healthTexture = new THREE.CanvasTexture(this.healthCanvas);
    this.healthTexture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.healthTexture,
      transparent: true,
    });
    this.healthBarSprite = new THREE.Sprite(spriteMaterial);
    this.healthBarSprite.scale.set(1.5 * this.size, 0.2 * this.size, 1);
    this.healthBarSprite.position.set(0, this.size + 0.2, 0);
    this.add(this.healthBarSprite);

    this.updateHealthBar();
  }

  updateHealthBar() {
    const ctx = this.healthContext;
    const width = this.healthCanvas.width;
    const height = this.healthCanvas.height;
    const percentage = this.health / this.maxHealth;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, width * percentage, height);

    this.healthTexture.needsUpdate = true;
  }

  update(delta) {
    if (this.isFrozen) {
      this.freezeTimer -= delta;
      if (this.freezeTimer <= 0) {
        this.isFrozen = false;
        if (this.freezeEffect) {
          this.remove(this.freezeEffect);
          this.freezeEffect = null;
        }
      }
      return;
    }

    const direction = new THREE.Vector3();
    direction.subVectors(this.target.position, this.position);

    if (direction.lengthSq() === 0) return;

    direction.normalize();
    this.lookAt(
      new THREE.Vector3(
        this.target.position.x,
        this.position.y,
        this.target.position.z
      )
    );

    const tileManager = this.parent?.tileManager;
    const isBlocked = (pos) => {
      const box = this.getCollisionBoxAt(pos);
      return tileManager?.solidBoxes.some((b) => b.intersectsBox(box));
    };

    const currentDist = this.position.distanceToSquared(this.target.position);
    const forward = direction.clone().multiplyScalar(this.speed * delta);
    const forwardPos = this.position.clone().add(forward);

    let moved = false;

    if (!isBlocked(forwardPos)) {
      const newDist = forwardPos.distanceToSquared(this.target.position);
      if (newDist < currentDist) {
        this.position.copy(forwardPos);
        moved = true;
      }
    }

    if (!moved) {
      const alternatives = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(1, 0, 1),
        new THREE.Vector3(-1, 0, 1),
        new THREE.Vector3(1, 0, -1),
        new THREE.Vector3(-1, 0, -1),
      ];

      let bestMove = null;
      let bestDist = currentDist;

      for (const alt of alternatives) {
        const candidate = this.position
          .clone()
          .add(alt.normalize().multiplyScalar(this.speed * delta));
        if (!isBlocked(candidate)) {
          const dist = candidate.distanceToSquared(this.target.position);
          if (dist < bestDist) {
            bestDist = dist;
            bestMove = candidate;
          }
        }
      }

      if (bestMove) {
        this.position.copy(bestMove);
      }
    }

  }
  freeze(duration) {
    if (this.isFrozen) return;

    this.isFrozen = true;
    this.freezeTimer = duration;

    const geometry = new THREE.SphereGeometry(0.6 * this.size, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });

    this.freezeEffect = new THREE.Mesh(geometry, material);
    this.freezeEffect.position.y = this.size / 2 - 0.5;
    this.add(this.freezeEffect);
  }

  resolveCollision(otherEnemy) {
    const distance = this.position.distanceTo(otherEnemy.position);
    const minDistance = this.hitboxRadius + otherEnemy.hitboxRadius;

    if (distance < minDistance && distance > 0) {
      const overlap = minDistance - distance;
      const repulsion = new THREE.Vector3()
        .subVectors(this.position, otherEnemy.position)
        .normalize()
        .multiplyScalar(overlap / 2);

      const tileManager = this.parent?.tileManager;
      const newThisPos = this.position.clone().add(repulsion);
      const newOtherPos = otherEnemy.position.clone().sub(repulsion);

      const isValid = (pos) => {
        const box = this.getCollisionBoxAt(pos);
        return !tileManager?.solidBoxes.some((b) => b.intersectsBox(box));
      };

      const canMoveThis = isValid(newThisPos);
      const canMoveOther = isValid(newOtherPos);

      if (canMoveThis && canMoveOther) {
        this.position.copy(newThisPos);
        otherEnemy.position.copy(newOtherPos);
      } else if (canMoveThis) {
        this.position.copy(newThisPos);
      } else if (canMoveOther) {
        otherEnemy.position.copy(newOtherPos);
      }
    }
  }

  hit(damage = 1) {
    this.health -= damage;
    this.updateHealthBar();
    if (this.health <= 0) {
      if (this.parent) {
        this.parent.remove(this);
      }
      if (this.target?.gainXP) {
        this.target.gainXP(this.xpReward);
      }
    }
  }

  lightenColor(color, amount = 0.4) {
    const r = color.r + (1 - color.r) * amount;
    const g = color.g + (1 - color.g) * amount;
    const b = color.b + (1 - color.b) * amount;
    return new THREE.Color(r, g, b);
  }

  addPersonalLight(color) {
    this.personalLight = new THREE.PointLight(
      this.lightenColor(color, 0.3),
      1,
      10
    );
    this.personalLight.position.set(0, 1.5, 0);
    this.add(this.personalLight);
  }

  getCollisionBoxAt(pos) {
    return new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(pos.x, pos.y + this.size / 2, pos.z),
      new THREE.Vector3(this.size, this.size, this.size)
    );
  }
}
