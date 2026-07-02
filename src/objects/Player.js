import * as THREE from "three";
import { Projectile } from "./Projectile";

import { showXPText } from "../components/XPText.js";
import { showDamageText } from "../components/DamageText.js";

import {
  PLAYER_INITIAL_HEALTH,
  PLAYER_INITIAL_SPEED,
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
  PLAYER_LIGHT_COLOR,
  PLAYER_LIGHT_INTENSITY_GLOWING,
  PLAYER_LIGHT_INTENSITY_NORMAL,
  PLAYER_LIGHT_DISTANCE_GLOWING,
  PLAYER_LIGHT_DISTANCE_NORMAL,
  PLAYER_COLOR,
  PLAYER_EMISSIVE_COLOR,
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
    this.attackSpeed = PLAYER_INITIAL_ATTACK_SPEED;
    this.attackCooldown = 0;
    this.lastDirection = new THREE.Vector3(1, 0, 0);
    this.freezeExplosionTimer = 0;
    this.dashCooldownTimer = 0;
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

    this.active_skills = INITIAL_PLAYER_SKILLS;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: PLAYER_COLOR,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);

    this.personalLight = new THREE.PointLight(
      PLAYER_EMISSIVE_COLOR,
      PLAYER_LIGHT_INTENSITY_NORMAL,
      PLAYER_LIGHT_DISTANCE_NORMAL
    );

    this.personalLight.position.set(0, 1.5, 0);
    this.add(this.personalLight);

    this.damageEffectTime = 0;
    this.originalColor = new THREE.Color(PLAYER_COLOR);

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
        const isBlocked = tileManager.solidBoxes.some((solidBox) =>
          solidBox.intersectsBox(playerBox)
        );
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

    if (this.healthRegen > 0) {
      this.health = Math.min(this.health + this.healthRegen * delta, this.maxHealth);
    }

    const energySkill = this.active_skills.energyExplosion;
    if (energySkill?.enabled) {
      this.energyExplosionTimer -= delta;

      if (this.energyExplosionTimer <= 0) {
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

      this.freezeExplosionTimer -= delta;

      if (this.freezeExplosionTimer <= 0) {
        this.freezeExplosionTimer = freezeSkill.cooldown;
        this.performFreezeExplosion();
      }
    }

    this.dashCooldownTimer -= delta;

    const dashSkill = this.active_skills.dash;
    if (
      dashSkill?.enabled &&
      this.input.keys.Space &&
      this.dashCooldownTimer <= 0
    ) {
      this.performDash();
      this.dashCooldownTimer = dashSkill.cooldown;
    }

    const forceFieldSkill = this.active_skills.forceField;
    if (forceFieldSkill?.enabled && forceFieldSkill.shieldCount > 0) {
      this.forceFieldCooldownTimer -= delta;
      if (this.forceFieldCooldownTimer <= 0) {
        this.shieldCount += 1;
        this.shieldCount = Math.min(
          this.shieldCount,
          forceFieldSkill.shieldCount
        );
        this.updateForceFieldVisual();

        if (this.shieldCount < forceFieldSkill.shieldCount) {
          const shieldIcon = document.getElementById("shieldContainer");
          if (shieldIcon) {
            shieldIcon.style.transform = "scale(1.3)";
            setTimeout(() => {
              shieldIcon.style.transform = "scale(1)";
            }, 150);
          }
        }

        const cooldownBase = forceFieldSkill.cooldown;
        const cooldownMax = forceFieldSkill.maxCooldown;
        this.forceFieldCooldownTimer = Math.min(cooldownBase, cooldownMax);
      }

      if (!this.getObjectByName("forceField")) {
        this.createForceFieldVisual();
        this.shieldCount = forceFieldSkill.shieldCount;
      } else {
        this.updateForceFieldVisual();
      }
    }

    const dashIcon = document.getElementById("dashIcon");
    if (dashIcon) {
      const skill = this.active_skills.dash;
      if (skill?.enabled) {
        const cooldown = skill.cooldown;
        const ratio = THREE.MathUtils.clamp(
          this.dashCooldownTimer / cooldown,
          0,
          1
        );
        dashIcon.style.opacity = ratio < 0.05 ? "1" : "0.3";
      } else {
        dashIcon.style.opacity = "0.1";
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
      const mat = this.freezeRing.material;
      const originalColor = mat.color.clone();
      const originalOpacity = mat.opacity;

      mat.color.set(0x00ffff);
      mat.opacity = 0.6;

      setTimeout(() => {
        mat.color.copy(originalColor);
        mat.opacity = originalOpacity;
      }, 200);
    }

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
    if (!parent || !parent.enemies) return;

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
    const growthSpeed = 5; // units per second
    const hitSet = new Set();

    const animate = () => {
      const delta = 1 / 60;
      currentRadius += growthSpeed * delta;

      // update geometry
      const newGeometry = new THREE.RingGeometry(
        currentRadius - 0.05,
        currentRadius,
        64
      );
      circle.geometry.dispose();
      circle.geometry = newGeometry;

      // apply damage to enemies within the currentRadius (only once)
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

    const newPos = this.position
      .clone()
      .add(direction.multiplyScalar(dashDistance));
    const tileManager = this.parent?.tileManager;

    if (!tileManager) {
      this.position.copy(newPos);
    } else {
      const playerBox = this.getCollisionBoxAt(newPos);
      const isBlocked = tileManager.solidBoxes.some((solidBox) =>
        solidBox.intersectsBox(playerBox)
      );
      if (!isBlocked) {
        this.position.copy(newPos);
      }
    }

    const mesh = this.children.find((c) => c.isMesh);
    if (mesh && mesh.material) {
      mesh.material.emissive = new THREE.Color(0xffffff);
      mesh.material.emissiveIntensity = 2;

      setTimeout(() => {
        if (this.glowing) {
          mesh.material.emissive.set(PLAYER_LIGHT_COLOR);
          mesh.material.emissiveIntensity = PLAYER_EMISSIVE_INTENSITY;
        } else {
          mesh.material.emissive.set(0x000000);
          mesh.material.emissiveIntensity = 0;
        }
      }, 100);
    }

    this.createDashGhost();
  }

  createDashGhost() {
    const mesh = this.children.find((c) => c.isMesh);
    if (!mesh) {
      return;
    }

    const ghost = new THREE.Mesh(
      mesh.geometry.clone(),
      new THREE.MeshStandardMaterial({
        color: PLAYER_COLOR,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
    );

    ghost.position.copy(this.position);
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
    const mesh = this.children.find((c) => c.isMesh);
    if (!mesh) return;

    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: PLAYER_COLOR,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    const outline = new THREE.Mesh(mesh.geometry.clone(), outlineMaterial);
    outline.name = "forceField";
    outline.scale.multiplyScalar(1.3);
    this.add(outline);
  }

  updateForceFieldVisual() {
    const outline = this.children.find((obj) => obj.name === "forceField");
    if (!outline || !outline.material) {
      return;
    }

    const intensity = Math.min(this.shieldCount / 10, 1);
    outline.material.color.setRGB(intensity, intensity, 0);
    outline.material.opacity = 0.3 + 0.3 * intensity;
  }

  attack() {
    const projectileSpeed = this.speed + PROJECTILE_SPEED_BASE;
    const isCritical = Math.random() < this.criticalChance;
    const baseDamage = this.sharpening;
    const damage = isCritical ? baseDamage * (1 + this.criticalDamage) : baseDamage;
    const projectile = new Projectile(
      this.position.clone(),
      this.lastDirection.clone(),
      projectileSpeed,
      undefined,
      damage,
      this.projectGlowing
    );
    if (this.parent) {
      this.parent.add(projectile);
    }
  }

  applyPassiveEffect(effect) {
    switch (effect.type) {
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
        const mesh = this.children.find((c) => c.isMesh);
        if (mesh && mesh.material) {
          mesh.material.emissive = new THREE.Color(PLAYER_LIGHT_COLOR);
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
      if (this.onLevelUp) {
        this.onLevelUp();
      }
    }
  }

  takeDamage(amount, source) {
    const thornsSkill = this.active_skills.thorns;

    if (thornsSkill?.enabled && source?.hit) {
      source.hit(thornsSkill.damage);
    }

    if (this.shieldCount > 0) {
      this.shieldCount--;
      this.updateForceFieldVisual();
      return;
    }

    this.health -= amount;

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
      if (this.onGameOver) {
        this.onGameOver();
      }
    }
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
