import * as THREE from "three";
import {
  BOSS_SIZE_MULTIPLIER,
  BOSS_DAMAGE_MULTIPLIER,
  BOSS_XP_MULTIPLIER,
  ELITE_CHANCE,
  ELITE_HEALTH_MULTIPLIER,
  ELITE_DAMAGE_MULTIPLIER,
  ELITE_SIZE_MULTIPLIER,
  ELITE_SPEED_MULTIPLIER,
  ELITE_XP_MULTIPLIER,
  ELITE_COIN_MULTIPLIER,
  ENEMY_DEATH_DURATION,
  ENEMY_FLASH_DURATION,
  ENEMY_DEATH_PARTICLE_COUNT,
  ENEMY_STUCK_THRESHOLD,
  ENEMY_RESTUCK_THRESHOLD,
  ENEMY_DETOUR_MAX_TIME,
  BOSS_SPECIAL_COOLDOWN,
  BOSS_SPECIAL_RANGE,
  BOSS_TELEGRAPH_TIME,
  BOSS_CHARGE_TIME,
  BOSS_CHARGE_SPEED_MULTIPLIER,
  CRITICAL_FLASH_DURATION,
  CRITICAL_FLASH_COLOR,
  CRITICAL_PUNCH_SCALE,
  FULL_MOON_SPEED_MULTIPLIER,
} from "../constants.js";
import {
  generateGenome,
  buildMonsterBody,
  getBodyMaterial,
  eyeDayMaterial,
  eyeNightMaterial,
} from "./MonsterGenome.js";
import { audio } from "../core/AudioEngine.js";

const particleGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
const freezeGeometry = new THREE.SphereGeometry(1, 16, 16);

const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const criticalFlashMaterial = new THREE.MeshBasicMaterial({
  color: CRITICAL_FLASH_COLOR,
});
const freezeMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ffff,
  transparent: true,
  opacity: 0.4,
  depthWrite: false,
});
const eliteAuraGeometry = new THREE.SphereGeometry(0.72, 12, 10);
const eliteAuraMaterial = new THREE.MeshBasicMaterial({
  color: 0xffd23e,
  transparent: true,
  opacity: 0.16,
  side: THREE.BackSide,
  depthWrite: false,
});

export class Enemy extends THREE.Object3D {
  constructor(
    target,
    spawnPosition,
    speed = 4,
    health = 1,
    difficulty = 0,
    isBoss = false,
    forcedArchetype = undefined
  ) {
    super();
    this.target = target;
    this.genome = generateGenome(isBoss, forcedArchetype);
    this.isElite = !isBoss && Math.random() < ELITE_CHANCE;
    this.speed =
      speed * this.genome.speedMult * (this.isElite ? ELITE_SPEED_MULTIPLIER : 1);
    this.maxHealth = Math.max(
      1,
      Math.round(
        health *
          this.genome.healthMult *
          (this.isElite ? ELITE_HEALTH_MULTIPLIER : 1)
      )
    );
    this.health = this.maxHealth;
    this.isBoss = isBoss;
    this.size =
      (isBoss ? BOSS_SIZE_MULTIPLIER : 1) *
      this.genome.sizeMult *
      (this.isElite ? ELITE_SIZE_MULTIPLIER : 1);
    this.hitboxRadius = this.size / 2;
    this.damageMultiplier =
      (isBoss ? BOSS_DAMAGE_MULTIPLIER : 1) *
      this.genome.damageMult *
      (this.isElite ? ELITE_DAMAGE_MULTIPLIER : 1);
    this.playerContactTime = 0;
    this.difficulty = difficulty;
    const baseReward = isBoss
      ? (difficulty || 1) * BOSS_XP_MULTIPLIER
      : difficulty || 1;
    const rewardScale =
      (this.genome.healthMult + this.genome.damageMult) / 2;
    this.xpReward =
      Math.max(1, Math.round(baseReward * rewardScale)) *
      (this.isElite ? ELITE_XP_MULTIPLIER : 1);
    this.coinReward = this.isElite
      ? this.xpReward * ELITE_COIN_MULTIPLIER
      : this.xpReward;

    this.baseMaterial = getBodyMaterial(this.difficulty, this.isElite);
    if (this.isElite) {
      this.baseMaterial = this.baseMaterial.clone();
    }
    const body = buildMonsterBody(this.genome, this.baseMaterial);
    this.mesh = body.group;
    this.flashEntries = body.flashEntries;
    this.eyes = body.eyes;
    this.animatedParts = body.animatedParts;
    this.coreGeometry = body.coreGeometry;

    this.bodyScale = new THREE.Vector3(
      this.genome.stretch.x,
      this.genome.stretch.y,
      this.genome.stretch.z
    ).multiplyScalar(this.size);
    this.mesh.scale.copy(this.bodyScale);
    this.mesh.position.y = this.bodyScale.y * 0.42;
    this.add(this.mesh);

    if (this.isElite) {
      this.eliteAura = new THREE.Mesh(
        eliteAuraGeometry,
        eliteAuraMaterial.clone()
      );
      this.mesh.add(this.eliteAura);
      this.eliteHue = Math.random();
    }

    this.eyesGlowing = false;
    this.animTime = Math.random() * Math.PI * 2;

    this.damageTimer = 0;
    this.flashTime = 0;
    this.critPunchTime = 0;
    this.isDying = false;
    this.deathTimer = 0;
    this.deathParticles = [];

    this.stuckTime = 0;
    this.detourActive = false;
    this.detourTimeLeft = 0;
    this.recentDetourTime = 0;
    this.detourSide = Math.random() < 0.5 ? 1 : -1;
    this.detourDirection = new THREE.Vector3();

    this.bossState = "chase";
    this.bossStateTime = 0;
    this.bossCooldown =
      BOSS_SPECIAL_COOLDOWN.min +
      Math.random() * (BOSS_SPECIAL_COOLDOWN.max - BOSS_SPECIAL_COOLDOWN.min);
    this.chargeDirection = new THREE.Vector3();

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

    const eyesShouldGlow =
      (this.parent?.isNight ?? false) || this.parent?.isMist === true;
    if (eyesShouldGlow !== this.eyesGlowing) {
      this.eyesGlowing = eyesShouldGlow;
      const material = eyesShouldGlow ? eyeNightMaterial : eyeDayMaterial;
      for (const eye of this.eyes) {
        eye.material = material;
      }
    }

    if (this.healthBarSprite) {
      this.healthBarSprite.visible = this.parent?.isMist !== true;
    }

    if (this.isElite) {
      this.eliteHue = (this.eliteHue + delta * 0.35) % 1;
      this.baseMaterial.color.setHSL(this.eliteHue, 1, 0.55);
      this.baseMaterial.emissive.setHSL(this.eliteHue, 1, 0.35);
      this.eliteAura.material.color.setHSL((this.eliteHue + 0.15) % 1, 1, 0.6);
    }

    if (this.flashTime > 0) {
      this.flashTime -= delta;
      if (this.flashTime <= 0) {
        this._restoreMaterials();
      }
    }

    if (this.critPunchTime > 0) {
      this.critPunchTime -= delta;
      const punch = Math.max(this.critPunchTime / CRITICAL_FLASH_DURATION, 0);
      this.mesh.scale
        .copy(this.bodyScale)
        .multiplyScalar(1 + punch * CRITICAL_PUNCH_SCALE);
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

    this.animTime += delta;
    const animSpeed = 3 + this.genome.speedMult * 4;
    for (const part of this.animatedParts) {
      const swing = Math.sin(this.animTime * animSpeed + part.phase);
      if (part.kind === "leg") {
        part.mesh.rotation.x = swing * 0.6;
      } else if (part.kind === "tail") {
        part.mesh.position.x = swing * part.amplitude;
        part.mesh.rotation.y = swing * 0.35;
      } else if (part.kind === "antenna") {
        part.mesh.rotation.z = part.baseRotZ + swing * 0.18;
      }
    }

    if (this.isBoss && this._updateBossSpecial(delta)) {
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

    const moveSpeed =
      this.speed *
      (this.parent?.isFullMoon ? FULL_MOON_SPEED_MULTIPLIER : 1);
    const currentDist = this.position.distanceToSquared(this.target.position);
    const forward = direction.clone().multiplyScalar(moveSpeed * delta);
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
        .addScaledVector(this.detourDirection, moveSpeed * delta);
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
        .add(alt.normalize().multiplyScalar(moveSpeed * delta));
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
    const stuckThreshold =
      this.recentDetourTime > 0
        ? ENEMY_RESTUCK_THRESHOLD
        : ENEMY_STUCK_THRESHOLD;
    if (this.stuckTime > stuckThreshold) {
      this.stuckTime = 0;
      this.detourActive = true;
      this.detourTimeLeft = ENEMY_DETOUR_MAX_TIME;
      this.detourDirection
        .set(-direction.z, 0, direction.x)
        .multiplyScalar(this.detourSide);
    }
  }

  _updateBossSpecial(delta) {
    if (this.bossState === "chase") {
      this.bossCooldown -= delta;
      const distSq = this.position.distanceToSquared(this.target.position);
      if (
        this.bossCooldown <= 0 &&
        distSq < BOSS_SPECIAL_RANGE * BOSS_SPECIAL_RANGE
      ) {
        this.bossState = Math.random() < 0.6 ? "telegraph" : "summon";
        this.bossStateTime = 0;
        if (this.bossState === "telegraph") {
          audio.play("bossTelegraph", { position: this.position });
        }
      }
      return false;
    }

    this.bossStateTime += delta;

    if (this.bossState === "telegraph") {
      this.lookAt(
        new THREE.Vector3(
          this.target.position.x,
          this.position.y,
          this.target.position.z
        )
      );
      this.mesh.position.x = Math.sin(this.bossStateTime * 45) * 0.15;
      if (this.bossStateTime >= BOSS_TELEGRAPH_TIME) {
        this.mesh.position.x = 0;
        this.chargeDirection
          .subVectors(this.target.position, this.position)
          .setY(0)
          .normalize();
        this.bossState = "charge";
        this.bossStateTime = 0;
      }
      return true;
    }

    if (this.bossState === "charge") {
      const step =
        this.speed *
        (this.parent?.isFullMoon ? FULL_MOON_SPEED_MULTIPLIER : 1) *
        BOSS_CHARGE_SPEED_MULTIPLIER *
        delta;
      const candidate = this.position
        .clone()
        .addScaledVector(this.chargeDirection, step);
      const blocked = this.parent?.tileManager?.intersectsSolid(
        this.getCollisionBoxAt(candidate)
      );
      if (!blocked) {
        this.position.copy(candidate);
      }
      if (blocked || this.bossStateTime >= BOSS_CHARGE_TIME) {
        this._endBossSpecial();
      }
      return true;
    }

    if (this.bossState === "summon") {
      this.mesh.rotation.y += delta * 10;
      if (this.bossStateTime >= 0.6) {
        this.mesh.rotation.y = 0;
        if (this.parent?.spawnMinions) {
          audio.play("bossSummon", { position: this.position });
          this.parent.spawnMinions(this);
        }
        this._endBossSpecial();
      }
      return true;
    }

    return false;
  }

  _endBossSpecial() {
    this.bossState = "chase";
    this.bossStateTime = 0;
    this.bossCooldown =
      BOSS_SPECIAL_COOLDOWN.min +
      Math.random() * (BOSS_SPECIAL_COOLDOWN.max - BOSS_SPECIAL_COOLDOWN.min);
  }

  _updateDeath(delta) {
    this.deathTimer -= delta;
    const shrinkProgress = Math.max(this.deathTimer / ENEMY_DEATH_DURATION, 0);
    this.mesh.scale.copy(this.bodyScale).multiplyScalar(shrinkProgress);

    for (const particle of this.deathParticles) {
      particle.userData.velocity.y -= 12 * delta;
      particle.position.addScaledVector(particle.userData.velocity, delta);
      particle.scale.setScalar(this.size * shrinkProgress);
    }

    if (this.deathTimer <= 0) {
      this.dispose();
      if (this.parent) {
        this.parent.remove(this);
      }
    }
  }

  _spawnDeathParticles() {
    for (let i = 0; i < ENEMY_DEATH_PARTICLE_COUNT; i++) {
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
    if (this.isFrozen || this.isDying) {
      return;
    }

    this.isFrozen = true;
    this.freezeTimer = duration;

    this.freezeEffect = new THREE.Mesh(freezeGeometry, freezeMaterial);
    this.freezeEffect.scale.setScalar(0.6 * this.size);
    this.freezeEffect.position.y = this.bodyScale.y * 0.42;
    this.add(this.freezeEffect);
  }

  resolveCollision(otherEnemy) {
    if (this.isDying || otherEnemy.isDying) {
      return;
    }
    if (this.isDormant || otherEnemy.isDormant) {
      return;
    }

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

  _restoreMaterials() {
    for (const entry of this.flashEntries) {
      entry.mesh.material = entry.material;
    }
    const eyeMaterial = this.eyesGlowing ? eyeNightMaterial : eyeDayMaterial;
    for (const eye of this.eyes) {
      eye.material = eyeMaterial;
    }
  }

  hit(damage = 1, isCritical = false) {
    if (this.isDying) {
      return;
    }

    this.health -= damage;
    this.updateHealthBar();

    audio.play(isCritical ? "enemyCrit" : "enemyHit", {
      position: this.position,
    });

    const material = isCritical ? criticalFlashMaterial : flashMaterial;
    for (const entry of this.flashEntries) {
      entry.mesh.material = material;
    }
    for (const eye of this.eyes) {
      eye.material = material;
    }
    this.flashTime = isCritical
      ? CRITICAL_FLASH_DURATION
      : ENEMY_FLASH_DURATION;
    if (isCritical) {
      this.critPunchTime = CRITICAL_FLASH_DURATION;
    }

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.isDying = true;
    this.deathTimer = ENEMY_DEATH_DURATION;
    this.flashTime = 0;
    this.critPunchTime = 0;
    this._restoreMaterials();

    if (this.healthBarSprite) {
      this.healthBarSprite.visible = false;
    }
    if (this.freezeEffect) {
      this.remove(this.freezeEffect);
      this.freezeEffect = null;
      this.isFrozen = false;
    }

    this._spawnDeathParticles();

    audio.play(this.isBoss ? "bossDeath" : "enemyDeath", {
      position: this.position,
    });

    if (this.target?.gainXP) {
      this.target.gainXP(this.xpReward);
    }
    if (this.parent?.addCoins) {
      this.parent.addCoins(this.coinReward);
    }
  }

  dispose() {
    this.coreGeometry.dispose();
    if (this.isElite) {
      this.baseMaterial.dispose();
      this.eliteAura.material.dispose();
    }
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
