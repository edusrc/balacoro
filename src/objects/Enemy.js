import * as THREE from "three";
import {
  BOSS_SIZE_MULTIPLIER,
  BOSS_DAMAGE_MULTIPLIER,
  BOSS_XP_MULTIPLIER,
} from "../constants.js";

const DEATH_DURATION = 0.4;
const FLASH_DURATION = 0.08;
const DEATH_PARTICLE_COUNT = 8;

const bodyGeometry = new THREE.BoxGeometry(1, 1, 1);
const particleGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
const eyeGeometry = new THREE.BoxGeometry(0.16, 0.16, 0.06);
const freezeGeometry = new THREE.SphereGeometry(1, 16, 16);

const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const eyeDayMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
const eyeNightMaterial = new THREE.MeshBasicMaterial({ color: 0xff2222 });
const freezeMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ffff,
  transparent: true,
  opacity: 0.4,
  depthWrite: false,
});

const bodyMaterialCache = new Map();
function getBodyMaterial(difficulty) {
  const key = Math.min(difficulty, 10);
  let material = bodyMaterialCache.get(key);
  if (!material) {
    const hue = 0.66 * (1 - Math.min(key / 5, 1));
    const lightness = key <= 5 ? 0.5 : 0.5 - ((key - 5) / 5) * 0.28;
    material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(hue, 1, lightness),
    });
    bodyMaterialCache.set(key, material);
  }
  return material;
}

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

    this.baseMaterial = getBodyMaterial(this.difficulty);
    this.mesh = new THREE.Mesh(bodyGeometry, this.baseMaterial);
    this.mesh.scale.setScalar(this.size);
    this.mesh.position.y = this.size / 2 - 0.5;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.add(this.mesh);

    this.eyes = [];
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeometry, eyeDayMaterial);
      eye.position.set(side * 0.2, 0.18, 0.51);
      this.mesh.add(eye);
      this.eyes.push(eye);
    }
    this.eyesGlowing = false;

    this.damageTimer = 0;
    this.flashTime = 0;
    this.isDying = false;
    this.deathTimer = 0;
    this.deathParticles = [];

    this.stuckTime = 0;
    this.detourActive = false;
    this.detourTimeLeft = 0;
    this.recentDetourTime = 0;
    this.detourSide = Math.random() < 0.5 ? 1 : -1;
    this.detourDirection = new THREE.Vector3();

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
    this.healthBarSprite.visible = !this.isDying;
    this.add(this.healthBarSprite);

    this.updateHealthBar();
  }

  updateHealthBar() {
    if (!this.healthContext) {
      return;
    }
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
    if (this.isDying) {
      this._updateDeath(delta);
      return;
    }

    const isNight = this.parent?.isNight ?? false;
    if (isNight !== this.eyesGlowing) {
      this.eyesGlowing = isNight;
      const material = isNight ? eyeNightMaterial : eyeDayMaterial;
      for (const eye of this.eyes) {
        eye.material = material;
      }
    }

    if (this.flashTime > 0) {
      this.flashTime -= delta;
      if (this.flashTime <= 0) {
        this.mesh.material = this.baseMaterial;
        const eyeMaterial = this.eyesGlowing ? eyeNightMaterial : eyeDayMaterial;
        for (const eye of this.eyes) {
          eye.material = eyeMaterial;
        }
      }
    }

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
      return tileManager?.intersectsSolid(box);
    };

    const currentDist = this.position.distanceToSquared(this.target.position);
    const forward = direction.clone().multiplyScalar(this.speed * delta);
    const forwardPos = this.position.clone().add(forward);

    if (!isBlocked(forwardPos)) {
      const newDist = forwardPos.distanceToSquared(this.target.position);
      if (newDist < currentDist) {
        this.position.copy(forwardPos);
        this.detourActive = false;
        this.stuckTime = 0;
        this.recentDetourTime = Math.max(this.recentDetourTime - delta, 0);
        return;
      }
    }

    if (this.detourActive) {
      this.recentDetourTime = 0.5;
      this.detourTimeLeft -= delta;
      if (this.detourTimeLeft <= 0) {
        this.detourActive = false;
        this.detourSide *= -1;
        this.stuckTime = 0;
        return;
      }

      const candidate = this.position
        .clone()
        .addScaledVector(this.detourDirection, this.speed * delta);
      if (!isBlocked(candidate)) {
        this.position.copy(candidate);
      } else {
        this.detourSide *= -1;
        this.detourDirection
          .set(-direction.z, 0, direction.x)
          .multiplyScalar(this.detourSide);
      }
      return;
    }

    this.recentDetourTime = Math.max(this.recentDetourTime - delta, 0);

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
      this.stuckTime = 0;
      return;
    }

    this.stuckTime += delta;
    const stuckThreshold = this.recentDetourTime > 0 ? 0.05 : 0.35;
    if (this.stuckTime > stuckThreshold) {
      this.stuckTime = 0;
      this.detourActive = true;
      this.detourTimeLeft = 3;
      this.detourDirection
        .set(-direction.z, 0, direction.x)
        .multiplyScalar(this.detourSide);
    }
  }

  _updateDeath(delta) {
    this.deathTimer -= delta;
    const t = Math.max(this.deathTimer / DEATH_DURATION, 0);
    this.mesh.scale.setScalar(this.size * t);

    for (const particle of this.deathParticles) {
      particle.userData.velocity.y -= 12 * delta;
      particle.position.addScaledVector(particle.userData.velocity, delta);
      particle.scale.setScalar(this.size * t);
    }

    if (this.deathTimer <= 0) {
      this.dispose();
      if (this.parent) {
        this.parent.remove(this);
      }
    }
  }

  _spawnDeathParticles() {
    for (let i = 0; i < DEATH_PARTICLE_COUNT; i++) {
      const particle = new THREE.Mesh(particleGeometry, this.baseMaterial);
      particle.scale.setScalar(this.size);
      particle.position.set(0, this.size / 2, 0);
      const angle = Math.random() * Math.PI * 2;
      const horizontalSpeed = 1.5 + Math.random() * 2;
      particle.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * horizontalSpeed,
        2 + Math.random() * 2,
        Math.sin(angle) * horizontalSpeed
      );
      this.add(particle);
      this.deathParticles.push(particle);
    }
  }

  freeze(duration) {
    if (this.isFrozen || this.isDying) return;

    this.isFrozen = true;
    this.freezeTimer = duration;

    this.freezeEffect = new THREE.Mesh(freezeGeometry, freezeMaterial);
    this.freezeEffect.scale.setScalar(0.6 * this.size);
    this.freezeEffect.position.y = this.size / 2 - 0.5;
    this.add(this.freezeEffect);
  }

  resolveCollision(otherEnemy) {
    if (this.isDying || otherEnemy.isDying) return;

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
        return !tileManager?.intersectsSolid(box);
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
    if (this.isDying) return;

    this.health -= damage;
    this.updateHealthBar();

    this.mesh.material = flashMaterial;
    for (const eye of this.eyes) {
      eye.material = flashMaterial;
    }
    this.flashTime = FLASH_DURATION;

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.isDying = true;
    this.deathTimer = DEATH_DURATION;
    this.flashTime = 0;
    this.mesh.material = this.baseMaterial;
    const eyeMaterial = this.eyesGlowing ? eyeNightMaterial : eyeDayMaterial;
    for (const eye of this.eyes) {
      eye.material = eyeMaterial;
    }

    if (this.healthBarSprite) {
      this.healthBarSprite.visible = false;
    }
    if (this.freezeEffect) {
      this.remove(this.freezeEffect);
      this.freezeEffect = null;
      this.isFrozen = false;
    }

    this._spawnDeathParticles();

    if (this.target?.gainXP) {
      this.target.gainXP(this.xpReward);
    }
  }

  dispose() {
    if (this.healthTexture) {
      this.healthTexture.dispose();
    }
    if (this.healthBarSprite) {
      this.healthBarSprite.material.dispose();
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
