import * as THREE from "three";
import { Projectile } from "./Projectile";

import { showXPText } from "../components/XPText.js";
import { showDamageText } from "../components/DamageText.js";
import { loadCustomization } from "../core/customization.js";
import { createAccessory } from "../core/cosmetics.js";
import { TrailEmitter, getTrailDefinitions } from "../core/trails.js";
import { audio } from "../core/AudioEngine.js";

import {
  PLAYER_INITIAL_HEALTH,
  PLAYER_INITIAL_SPEED,
  PLAYER_INITIAL_DAMAGE,
  PLAYER_INITIAL_ATTACK_SPEED,
  PLAYER_INITIAL_SHARPENING,
  PLAYER_INITIAL_HEALTH_REGEN,
  PLAYER_INITIAL_CRITICAL_DAMAGE,
  PLAYER_INITIAL_CRITICAL_CHANCE,
  PLAYER_INITIAL_LIFE_STEAL,
  PLAYER_XP_GROWTH_RATE,
  PLAYER_XP_BASE,
  PLAYER_INITIAL_LEVEL,
  PLAYER_INITIAL_XP,
  INITIAL_PLAYER_SKILLS,
  PLAYER_LIGHT_INTENSITY_GLOWING,
  PLAYER_LIGHT_INTENSITY_NORMAL,
  PLAYER_LIGHT_DISTANCE_GLOWING,
  PLAYER_LIGHT_DISTANCE_NORMAL,
  PLAYER_EMISSIVE_INTENSITY,
  PROJECTILE_SPEED_BASE,
} from "../constants.js";

export class Player extends THREE.Object3D {
  constructor(input) {
    super();
    this.onLevelUp = null;
    this.input = input;
    this.health = PLAYER_INITIAL_HEALTH;
    this.maxHealth = PLAYER_INITIAL_HEALTH;
    this.speed = PLAYER_INITIAL_SPEED;
    this.damage = PLAYER_INITIAL_DAMAGE;
    this.attackSpeed = PLAYER_INITIAL_ATTACK_SPEED;
    this.isInvincible = false;
    this.attackCooldown = 0;
    this.lastDirection = new THREE.Vector3(1, 0, 0);
    this.freezeExplosionTimer = 0;
    this.dashCooldownTimer = 0;
    this.dashCharges = 0;
    this.dashKeyHeld = false;
    this.shieldCount = 0;
    this.energyExplosionTimer = 0;
    this.forceFieldCooldownTimer = 0;

    this.level = PLAYER_INITIAL_LEVEL;
    this.currentXP = PLAYER_INITIAL_XP;

    this.sharpening = PLAYER_INITIAL_SHARPENING;
    this.healthRegen = PLAYER_INITIAL_HEALTH_REGEN;
    this.criticalDamage = PLAYER_INITIAL_CRITICAL_DAMAGE;
    this.criticalChance = PLAYER_INITIAL_CRITICAL_CHANCE;
    this.lifeSteal = PLAYER_INITIAL_LIFE_STEAL;

    this.active_skills = JSON.parse(JSON.stringify(INITIAL_PLAYER_SKILLS));

    const customization = loadCustomization();
    this.customColor = customization.color;
    this.projectileColor = customization.projectileColor;
    this.glowColor = new THREE.Color(this.customColor);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: this.customColor,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.35;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);

    const eyeGeometry = new THREE.BoxGeometry(0.18, 0.18, 0.06);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(side * 0.2, 0.15, 0.51);
      mesh.add(eye);
    }

    for (const accessory of (customization.accessories ?? []).map(
      createAccessory
    )) {
      if (!accessory) {
        continue;
      }
      accessory.position.y = 0.35;
      accessory.traverse((child) => {
        child.castShadow = true;
      });
      this.add(accessory);
    }

    this.personalLight = new THREE.PointLight(
      this.glowColor,
      PLAYER_LIGHT_INTENSITY_NORMAL,
      PLAYER_LIGHT_DISTANCE_NORMAL
    );

    this.personalLight.position.set(0, 1.5, 0);
    this.add(this.personalLight);

    this.damageEffectTime = 0;
    this.dashFlashTime = 0;
    this.originalColor = new THREE.Color(this.customColor);

    this.trailDefs = getTrailDefinitions(customization.accessories);
    this.trailEmitter = null;

    this.glowing = false;
    this.projectGlowing = false;
  }

  update(delta) {
    const direction = new THREE.Vector3();

    if (this.input.keys.KeyW) {
      direction.z -= 1;
    }
    if (this.input.keys.KeyS) {
      direction.z += 1;
    }
    if (this.input.keys.KeyA) {
      direction.x -= 1;
    }
    if (this.input.keys.KeyD) {
      direction.x += 1;
    }

    if (direction.lengthSq() > 0) {
      direction.normalize().multiplyScalar(this.speed * delta);
      const newPos = this.position.clone().add(direction);
      const tileManager = this.parent?.tileManager;

      if (!tileManager) {
        this.position.copy(newPos);
      } else {
        const playerBox = this.getCollisionBoxAt(newPos);
        const isBlocked = tileManager.intersectsSolid(playerBox);
        if (!isBlocked) {
          this.position.copy(newPos);
        }
      }
    }

    if (this.lastDirection.lengthSq() > 0) {
      const lookTarget = new THREE.Vector3().addVectors(
        this.position,
        this.lastDirection
      );
      this.lookAt(
        new THREE.Vector3(lookTarget.x, this.position.y, lookTarget.z)
      );
    }

    this.attackCooldown += delta;
    if (this.attackCooldown >= 1 / this.attackSpeed) {
      this.attackCooldown = 0;
      this.attack();
    }

    if (this.damageEffectTime > 0) {
      this.damageEffectTime -= delta;
      if (this.damageEffectTime <= 0) {
        const mesh = this.children.find((child) => child.isMesh);
        if (mesh && mesh.material) {
          mesh.material.color.copy(this.originalColor);
        }
      }
    }

    if (this.dashFlashTime > 0) {
      this.dashFlashTime -= delta;
      if (this.dashFlashTime <= 0) {
        const mesh = this.children.find((child) => child.isMesh);
        if (mesh && mesh.material) {
          if (this.glowing) {
            mesh.material.emissive.copy(this.glowColor);
            mesh.material.emissiveIntensity = PLAYER_EMISSIVE_INTENSITY;
          } else {
            mesh.material.emissive.set(0x000000);
            mesh.material.emissiveIntensity = 0;
          }
        }
      }
    }

    if (this.healthRegen > 0) {
      this.health = Math.min(this.health + this.healthRegen * delta, this.maxHealth);
    }

    audio.setHeartbeat(
      this.health > 0 &&
        this.health / this.maxHealth <= audio.globals.lowHealthHeartbeatRatio
    );

    if (this.trailDefs.length > 0 && this.parent) {
      if (!this.trailEmitter) {
        this.trailEmitter = new TrailEmitter(this.parent, this.trailDefs);
      }
      this.trailEmitter.update(delta, this.position, direction.lengthSq() > 0);
    }

    const energySkill = this.active_skills.energyExplosion;
    if (energySkill?.enabled) {
      this.energyExplosionTimer = Math.max(this.energyExplosionTimer - delta, 0);

      if (this.energyExplosionTimer <= 0 && this.input.keys.KeyE) {
        this.energyExplosionTimer = energySkill.cooldown;
        this.performEnergyExplosion();
      }
    }

    const freezeSkill = this.active_skills.freezeExplosion;

    if (freezeSkill?.enabled) {
      if (!this.freezeRing) {
        this.freezeRing = this.createFreezeRing();
        this.add(this.freezeRing);
      } else {
        const radius = freezeSkill.range ?? 1;
        const newGeometry = new THREE.RingGeometry(radius - 0.05, radius, 64);
        this.freezeRing.geometry.dispose();
        this.freezeRing.geometry = newGeometry;
      }

      this.freezeExplosionTimer = Math.max(this.freezeExplosionTimer - delta, 0);

      if (this.freezeExplosionTimer <= 0 && this.input.keys.KeyQ) {
        this.freezeExplosionTimer = freezeSkill.cooldown;
        this.performFreezeExplosion();
      }
    }

    const dashSkill = this.active_skills.dash;
    if (dashSkill?.enabled) {
      const maxCharges = dashSkill.charges ?? 1;

      if (this.dashCharges < maxCharges) {
        this.dashCooldownTimer = Math.max(this.dashCooldownTimer - delta, 0);
        if (this.dashCooldownTimer <= 0) {
          this.dashCharges += 1;
          if (this.dashCharges < maxCharges) {
            this.dashCooldownTimer = dashSkill.cooldown;
          }
        }
      }

      if (this.input.keys.Space && !this.dashKeyHeld && this.dashCharges > 0) {
        this.performDash();
        this.dashCharges -= 1;
        if (this.dashCooldownTimer <= 0) {
          this.dashCooldownTimer = dashSkill.cooldown;
        }
      }
      this.dashKeyHeld = this.input.keys.Space;
    }

    const forceFieldSkill = this.active_skills.forceField;
    if (forceFieldSkill?.enabled && forceFieldSkill.shieldCount > 0) {
      const effectiveCooldown = Math.min(
        forceFieldSkill.cooldown,
        forceFieldSkill.maxCooldown
      );

      if (this.shieldCount < forceFieldSkill.shieldCount) {
        this.forceFieldCooldownTimer = Math.max(
          this.forceFieldCooldownTimer - delta,
          0
        );
        if (this.forceFieldCooldownTimer <= 0) {
          this.shieldCount += 1;
          audio.play("shieldGain");
          this.updateForceFieldVisual();
          if (this.shieldCount < forceFieldSkill.shieldCount) {
            this.forceFieldCooldownTimer = effectiveCooldown;
          }
        }
      } else {
        this.forceFieldCooldownTimer = 0;
      }

      if (!this.getObjectByName("forceField")) {
        this.createForceFieldVisual();
      } else {
        this.updateForceFieldVisual();
      }
    }
  }

  createFreezeRing() {
    const freezeSkill = this.active_skills.freezeExplosion;
    const radius = freezeSkill?.range ?? 1;

    const geometry = new THREE.RingGeometry(radius - 0.05, radius, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0x0077ff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    ring.name = "freezeRing";

    return ring;
  }

  performFreezeExplosion() {
    const skill = this.active_skills.freezeExplosion;
    const radius = skill.range ?? 1;
    const duration = skill.duration ?? 1;

    const parent = this.parent;
    if (!parent || !parent.enemies) {
      return;
    }

    if (this.freezeRing) {
      const newGeometry = new THREE.RingGeometry(radius - 0.05, radius, 64);
      this.freezeRing.geometry.dispose();
      this.freezeRing.geometry = newGeometry;
    }

    if (this.freezeRing.material) {
      const ringMaterial = this.freezeRing.material;
      const originalColor = ringMaterial.color.clone();
      const originalOpacity = ringMaterial.opacity;

      ringMaterial.color.set(0x00ffff);
      ringMaterial.opacity = 0.6;

      setTimeout(() => {
        ringMaterial.color.copy(originalColor);
        ringMaterial.opacity = originalOpacity;
      }, 200);
    }

    audio.play("skillFreezeExplosion");

    for (const enemy of parent.enemies) {
      const distance = enemy.position.distanceTo(this.position);
      if (distance <= radius) {
        enemy.freeze(duration);
      }
    }
  }

  performEnergyExplosion() {
    const skill = this.active_skills.energyExplosion;
    const maxRadius = skill.range ?? 1;
    const damage = skill.damage ?? 1;

    const parent = this.parent;
    if (!parent || !parent.enemies) {
      return;
    }

    audio.play("skillEnergyExplosion");

    const circleGeometry = new THREE.RingGeometry(0.05, 0.1, 64);
    const circleMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    circle.rotation.x = -Math.PI / 2;
    circle.position.set(0, 0.01, 0);
    this.add(circle);

    let currentRadius = 0.1;
    const growthSpeed = 5;
    const hitSet = new Set();

    const animate = () => {
      const delta = 1 / 60;
      currentRadius += growthSpeed * delta;

      const newGeometry = new THREE.RingGeometry(
        currentRadius - 0.05,
        currentRadius,
        64
      );
      circle.geometry.dispose();
      circle.geometry = newGeometry;

      for (const enemy of parent.enemies) {
        if (hitSet.has(enemy)) continue;

        const distance = enemy.position.distanceTo(this.position);
        if (distance <= currentRadius) {
          enemy.hit(damage);
          hitSet.add(enemy);
        }
      }

      if (currentRadius < maxRadius) {
        requestAnimationFrame(animate);
      } else {
        if (circle.parent) {
          circle.parent.remove(circle);
          circle.geometry.dispose();
          circle.material.dispose();
        }
      }
    };

    requestAnimationFrame(animate);
  }

  performDash() {
    const dashDistance = 5;
    const direction = this.lastDirection.clone().normalize();

    if (direction.lengthSq() === 0) {
      return;
    }

    audio.play("playerDash");

    const newPos = this.position
      .clone()
      .add(direction.multiplyScalar(dashDistance));
    const tileManager = this.parent?.tileManager;

    if (!tileManager) {
      this.position.copy(newPos);
    } else {
      const playerBox = this.getCollisionBoxAt(newPos);
      const isBlocked = tileManager.intersectsSolid(playerBox);
      if (!isBlocked) {
        this.position.copy(newPos);
      }
    }

    const mesh = this.children.find((child) => child.isMesh);
    if (mesh && mesh.material) {
      mesh.material.emissive = new THREE.Color(0xffffff);
      mesh.material.emissiveIntensity = 2;
      this.dashFlashTime = 0.1;
    }

    this.createDashGhost();
  }

  createDashGhost() {
    const mesh = this.children.find((child) => child.isMesh);
    if (!mesh) {
      return;
    }

    const ghost = new THREE.Mesh(
      mesh.geometry.clone(),
      new THREE.MeshStandardMaterial({
        color: this.customColor,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
    );

    ghost.position.copy(this.position);
    ghost.position.y += 0.35;
    ghost.quaternion.copy(this.quaternion);
    ghost.scale.copy(this.scale);
    ghost.castShadow = false;
    ghost.receiveShadow = false;

    if (this.parent) {
      this.parent.add(ghost);

      const fadeDuration = 300;
      const fadeSteps = 5;
      const stepTime = fadeDuration / fadeSteps;

      let currentStep = 0;
      const fade = () => {
        currentStep += 1;
        ghost.material.opacity -= 1 / fadeSteps;

        if (currentStep >= fadeSteps) {
          if (ghost.parent) {
            ghost.parent.remove(ghost);
          }
        } else {
          setTimeout(fade, stepTime);
        }
      };

      setTimeout(fade, stepTime);
    }
  }
  createForceFieldVisual() {
    const mesh = this.children.find((child) => child.isMesh);
    if (!mesh) {
      return;
    }

    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: this.customColor,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    const outline = new THREE.Mesh(mesh.geometry.clone(), outlineMaterial);
    outline.name = "forceField";
    outline.position.y = 0.35;
    outline.scale.multiplyScalar(1.3);
    this.add(outline);
  }

  updateForceFieldVisual() {
    const outline = this.children.find(
      (child) => child.name === "forceField"
    );
    if (!outline || !outline.material) {
      return;
    }

    const intensity = Math.min(this.shieldCount / 10, 1);
    outline.material.color.setRGB(intensity, intensity, 0);
    outline.material.opacity = 0.3 + 0.3 * intensity;
  }

  attack() {
    audio.play("playerShoot");
    const projectileSpeed = this.speed + PROJECTILE_SPEED_BASE;
    const isCritical = Math.random() < this.criticalChance;
    const baseDamage = this.damage;
    const damage = isCritical ? baseDamage * (1 + this.criticalDamage) : baseDamage;
    const projectile = new Projectile(
      this.position.clone(),
      this.lastDirection.clone(),
      projectileSpeed,
      undefined,
      damage,
      this.projectGlowing,
      this.sharpening,
      this.projectileColor,
      isCritical
    );
    if (this.parent) {
      this.parent.add(projectile);
      this.parent.projectiles?.push(projectile);
    }
  }

  applyPassiveEffect(effect) {
    switch (effect.type) {
      case "damage":
        this.damage += effect.value;
        break;
      case "attackSpeed":
        this.attackSpeed *= 1 + effect.value;
        break;
      case "sharpening":
        this.sharpening += effect.value;
        break;
      case "healthRegen":
        this.healthRegen += effect.value;
        break;
      case "criticalDamage":
        this.criticalDamage += effect.value;
        break;
      case "criticalChance":
        this.criticalChance += effect.value;
        break;
      case "lifeSteal":
        this.lifeSteal += effect.value;
        break;
      case "speed":
        this.speed += effect.value;
        break;
      case "health":
        this.maxHealth += effect.value;
        this.health = Math.min(this.health + effect.value, this.maxHealth);
        break;
      default:
        console.warn(`[Player] Unknown effect type: ${effect.type}`);
    }
  }

  applySkillEffect(skillName) {
    const skill = this.active_skills[skillName];

    if (!skill) {
      console.warn(`[Player] Unknown skill: ${skillName}`);
      return;
    }

    if (!skill.enabled) {
      skill.enabled = true;

      if (skillName === "glowing") {
        this.glowing = true;
        const mesh = this.children.find((child) => child.isMesh);
        if (mesh && mesh.material) {
          mesh.material.emissive = this.glowColor.clone();
          mesh.material.emissiveIntensity = PLAYER_EMISSIVE_INTENSITY;
        }
        if (this.personalLight) {
          this.personalLight.intensity = PLAYER_LIGHT_INTENSITY_GLOWING;
          this.personalLight.distance = PLAYER_LIGHT_DISTANCE_GLOWING;
        }
      }

      if (skillName === "projectGlowing") {
        this.projectGlowing = true;
      }

      if (skillName === "dash") {
        this.dashCharges = skill.charges ?? 1;
      }

      if (skillName === "forceField") {
        this.shieldCount = skill.shieldCount;
        if (!this.getObjectByName("forceField")) {
          this.createForceFieldVisual();
        } else {
          this.updateForceFieldVisual();
        }
      }
    } else {
      if (skill.cooldown !== undefined && skill.growthCooldown !== undefined) {
        skill.cooldown += skill.growthCooldown;
      }
      if (skill.maxCooldown !== undefined) {
        skill.cooldown = Math.max(skill.cooldown, skill.maxCooldown);
      }

      if (skill.range !== undefined && skill.growthRange !== undefined) {
        skill.range += skill.growthRange;
      }

      if (skill.damage !== undefined && skill.growthDamage !== undefined) {
        skill.damage += skill.growthDamage;
      }

      if (skill.duration !== undefined && skill.growthDuration !== undefined) {
        skill.duration += skill.growthDuration;
      }

      if (skill.charges !== undefined && skill.growthCharges !== undefined) {
        skill.charges += skill.growthCharges;
        this.dashCharges = Math.min(
          this.dashCharges + skill.growthCharges,
          skill.charges
        );
        if (this.dashCharges >= skill.charges) {
          this.dashCooldownTimer = 0;
        }
      }

      if (
        skill.shieldCount !== undefined &&
        skill.growthShieldCount !== undefined
      ) {
        skill.shieldCount += skill.growthShieldCount;
        this.shieldCount = skill.shieldCount;

        if (!this.getObjectByName("forceField")) {
          this.createForceFieldVisual();
        } else {
          this.updateForceFieldVisual();
        }
      }
    }
  }

  captureState() {
    return {
      position: { x: this.position.x, z: this.position.z },
      health: this.health,
      maxHealth: this.maxHealth,
      speed: this.speed,
      damage: this.damage,
      attackSpeed: this.attackSpeed,
      sharpening: this.sharpening,
      healthRegen: this.healthRegen,
      criticalDamage: this.criticalDamage,
      criticalChance: this.criticalChance,
      lifeSteal: this.lifeSteal,
      level: this.level,
      currentXP: this.currentXP,
      glowing: this.glowing,
      projectGlowing: this.projectGlowing,
      shieldCount: this.shieldCount,
      dashCharges: this.dashCharges,
      dashCooldownTimer: this.dashCooldownTimer,
      forceFieldCooldownTimer: this.forceFieldCooldownTimer,
      freezeExplosionTimer: this.freezeExplosionTimer,
      energyExplosionTimer: this.energyExplosionTimer,
      active_skills: JSON.parse(JSON.stringify(this.active_skills)),
    };
  }

  restoreState(state) {
    const numericFields = [
      "health",
      "maxHealth",
      "speed",
      "damage",
      "attackSpeed",
      "sharpening",
      "healthRegen",
      "criticalDamage",
      "criticalChance",
      "lifeSteal",
      "level",
      "currentXP",
      "shieldCount",
      "dashCharges",
      "dashCooldownTimer",
      "forceFieldCooldownTimer",
      "freezeExplosionTimer",
      "energyExplosionTimer",
    ];
    for (const field of numericFields) {
      if (typeof state[field] === "number") {
        this[field] = state[field];
      }
    }
    if (state.active_skills) {
      this.active_skills = JSON.parse(JSON.stringify(state.active_skills));
    }
    if (state.position) {
      this.position.set(state.position.x ?? 0, 0, state.position.z ?? 0);
    }
    this.projectGlowing = state.projectGlowing === true;
    this.glowing = state.glowing === true;

    if (this.glowing) {
      const mesh = this.children.find((child) => child.isMesh);
      if (mesh && mesh.material) {
        mesh.material.emissive = this.glowColor.clone();
        mesh.material.emissiveIntensity = PLAYER_EMISSIVE_INTENSITY;
      }
      if (this.personalLight) {
        this.personalLight.intensity = PLAYER_LIGHT_INTENSITY_GLOWING;
        this.personalLight.distance = PLAYER_LIGHT_DISTANCE_GLOWING;
      }
    }

    if (this.active_skills.forceField?.enabled) {
      if (!this.getObjectByName("forceField")) {
        this.createForceFieldVisual();
      }
      this.updateForceFieldVisual();
    }
  }

  getXPToLevelUp(level = this.level) {
    return PLAYER_XP_BASE * Math.pow(PLAYER_XP_GROWTH_RATE, level - 1);
  }

  gainXP(amount) {
    this.currentXP += amount;
    const position = new THREE.Vector3();
    this.getWorldPosition(position);
    showXPText(amount, position);

    while (this.currentXP >= this.getXPToLevelUp()) {
      this.currentXP -= this.getXPToLevelUp();
      this.level += 1;
      audio.play("playerLevelUp");
      if (this.onLevelUp) {
        this.onLevelUp();
      }
    }
  }

  debugGodMode() {
    this.damage = 100000;
    this.attackSpeed = 20;
    this.isInvincible = true;
    this.health = this.maxHealth;
  }

  takeDamage(amount, source) {
    const thornsSkill = this.active_skills.thorns;

    if (thornsSkill?.enabled && source?.hit) {
      audio.play("thornsHit");
      source.hit(thornsSkill.damage);
    }

    if (this.isInvincible) {
      return false;
    }

    if (this.shieldCount > 0) {
      audio.play("shieldBreak");
      this.shieldCount--;
      const forceFieldSkill = this.active_skills.forceField;
      if (forceFieldSkill?.enabled && this.forceFieldCooldownTimer <= 0) {
        this.forceFieldCooldownTimer = Math.min(
          forceFieldSkill.cooldown,
          forceFieldSkill.maxCooldown
        );
      }
      this.updateForceFieldVisual();
      return false;
    }

    this.health -= amount;
    audio.play("playerHurt");

    const worldPosition = new THREE.Vector3();
    this.getWorldPosition(worldPosition);
    showDamageText(amount, worldPosition);

    const mesh = this.children.find((child) => child.isMesh);
    if (mesh && mesh.material) {
      mesh.material.color.set(0xff0000);
      this.damageEffectTime = 0.2;
    }

    if (this.health <= 0) {
      this.health = 0;
      audio.setHeartbeat(false);
      audio.play("playerDeath");
      if (this.onGameOver) {
        this.onGameOver();
      }
    }
    return true;
  }

  getCollisionBoxAt(pos) {
    const box = new THREE.Box3();
    box.setFromCenterAndSize(
      new THREE.Vector3(pos.x, pos.y + 0.5, pos.z),
      new THREE.Vector3(1, 1, 1)
    );
    return box;
  }
}
