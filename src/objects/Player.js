import * as THREE from "three";
import { Projectile } from "./Projectile";

import { showXPText } from "../components/XPText.js";
import { showDamageText } from "../components/DamageText.js";
import { loadCustomization } from "../core/customization.js";
import { createAccessory } from "../core/cosmetics.js";
import { TrailEmitter, getTrailDefinitions } from "../core/trails.js";
import {
  POWER_DEFS,
  loadPowerLoadout,
  performPower,
  spawnFlash,
  spawnRingWave,
} from "../core/powers.js";
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
  LOW_HEALTH_THRESHOLD,
  SECOND_WIND_INVINCIBILITY_DURATION,
  TWIN_SHOT_DAMAGE_MULTIPLIER,
} from "../constants.js";

const JOYSTICK_DEADZONE_SQ = 0.0225;

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
    this.dashCooldownTimer = 0;
    this.dashCharges = 0;
    this.dashKeyHeld = false;
    this.shieldCount = 0;
    this.forceFieldCooldownTimer = 0;
    this.powerCooldowns = { q: 0, e: 0 };
    this.adrenalineTimer = 0;
    this.adrenalineAura = null;
    this.auraPulseTime = 0;
    this.secondWindUsed = false;
    this.secondWindTimer = 0;
    this.orbitalGroup = null;
    this.orbitalBladeMeshes = [];
    this.orbitalAngle = 0;
    this.orbitalHitTimers = new Map();
    this.staticFieldOrbit = null;
    this.staticFieldOrbitAngle = 0;

    this.level = PLAYER_INITIAL_LEVEL;
    this.currentXP = PLAYER_INITIAL_XP;

    this.sharpening = PLAYER_INITIAL_SHARPENING;
    this.healthRegen = PLAYER_INITIAL_HEALTH_REGEN;
    this.criticalDamage = PLAYER_INITIAL_CRITICAL_DAMAGE;
    this.criticalChance = PLAYER_INITIAL_CRITICAL_CHANCE;
    this.lifeSteal = PLAYER_INITIAL_LIFE_STEAL;

    this.active_skills = JSON.parse(JSON.stringify(INITIAL_PLAYER_SKILLS));
    delete this.active_skills.energyExplosion;
    delete this.active_skills.freezeExplosion;

    this.slotPowers = loadPowerLoadout();
    for (const powerId of [this.slotPowers.q, this.slotPowers.e]) {
      if (powerId && POWER_DEFS[powerId] && !this.active_skills[powerId]) {
        this.active_skills[powerId] = JSON.parse(
          JSON.stringify(POWER_DEFS[powerId].skill)
        );
      }
    }

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
    this.eyeMaterial = eyeMaterial;
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
    if (this.adrenalineTimer > 0) {
      this.adrenalineTimer = Math.max(this.adrenalineTimer - delta, 0);
    }
    const adrenalineSkill = this.active_skills.adrenaline;
    const adrenalineActive =
      adrenalineSkill?.enabled && this.adrenalineTimer > 0;
    const speedMultiplier = adrenalineActive
      ? 1 + adrenalineSkill.speedBonus
      : 1;
    const attackSpeedMultiplier = adrenalineActive
      ? 1 + adrenalineSkill.attackSpeedBonus
      : 1;

    const direction = new THREE.Vector3();
    const joystick = this.input.moveVector;
    const joystickMagSq = joystick.x * joystick.x + joystick.z * joystick.z;
    const usingJoystick = joystickMagSq > JOYSTICK_DEADZONE_SQ;
    const aimJoystick = this.input.aimVector;
    const aimJoystickMagSq =
      aimJoystick.x * aimJoystick.x + aimJoystick.z * aimJoystick.z;
    const usingAimJoystick = aimJoystickMagSq > JOYSTICK_DEADZONE_SQ;

    if (usingJoystick) {
      direction.set(joystick.x, 0, joystick.z);
      const mag = Math.sqrt(joystickMagSq);
      if (mag > 1) {
        direction.divideScalar(mag);
      }
    } else {
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
    }

    if (direction.lengthSq() > 0) {
      const step = usingJoystick ? direction.clone() : direction.clone().normalize();
      step.multiplyScalar(this.speed * speedMultiplier * delta);
      const newPos = this.position.clone().add(step);
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

      if (usingJoystick && !usingAimJoystick) {
        this.lastDirection.copy(direction).normalize();
      }
    }

    if (usingAimJoystick) {
      this.lastDirection
        .set(aimJoystick.x, 0, aimJoystick.z)
        .normalize();
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
    if (this.attackCooldown >= 1 / (this.attackSpeed * attackSpeedMultiplier)) {
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

    const berserkerSkill = this.active_skills.berserker;
    const berserkerActive =
      berserkerSkill?.enabled &&
      this.health / this.maxHealth <= LOW_HEALTH_THRESHOLD;
    if (this.eyeMaterial) {
      this.eyeMaterial.color.set(berserkerActive ? 0xff2222 : 0x111111);
      this.eyeMaterial.emissive.set(berserkerActive ? 0x660000 : 0x000000);
    }
    this.berserkerActive = berserkerActive === true;

    if (adrenalineActive) {
      this.auraPulseTime += delta;
      if (!this.adrenalineAura) {
        const aura = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshBasicMaterial({
            color: 0xff8a3d,
            transparent: true,
            opacity: 0.35,
            side: THREE.BackSide,
            depthWrite: false,
          })
        );
        aura.position.y = 0.35;
        this.add(aura);
        this.adrenalineAura = aura;
      }
      this.adrenalineAura.scale.setScalar(
        1.35 + Math.sin(this.auraPulseTime * 12) * 0.1
      );
      this.adrenalineAura.material.opacity =
        0.3 + Math.sin(this.auraPulseTime * 10) * 0.1;
    } else if (this.adrenalineAura) {
      this.remove(this.adrenalineAura);
      this.adrenalineAura.geometry.dispose();
      this.adrenalineAura.material.dispose();
      this.adrenalineAura = null;
    }

    if (this.secondWindTimer > 0) {
      this.secondWindTimer = Math.max(this.secondWindTimer - delta, 0);
      this.visible = Math.floor(this.secondWindTimer * 12) % 2 === 0;
      if (this.secondWindTimer <= 0) {
        this.isInvincible = false;
        this.visible = true;
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
    }

    this._updatePowerSlot("q", "KeyQ", delta);
    this._updatePowerSlot("e", "KeyE", delta);
    this._updateOrbitalBlades(delta);
    this._updateStaticFieldOrbit(delta);

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

  _updatePowerSlot(slot, keyCode, delta) {
    const powerId = this.slotPowers[slot];
    const skill = powerId ? this.active_skills[powerId] : null;
    if (!skill?.enabled) {
      return;
    }
    this.powerCooldowns[slot] = Math.max(this.powerCooldowns[slot] - delta, 0);
    if (this.powerCooldowns[slot] <= 0 && this.input.keys[keyCode]) {
      this.powerCooldowns[slot] = skill.cooldown ?? 10;
      performPower(powerId, this);
    }
  }

  _updateOrbitalBlades(delta) {
    const skill = this.active_skills.orbitalBlades;
    if (!skill?.enabled) {
      if (this.orbitalGroup) {
        for (const blade of this.orbitalBladeMeshes) {
          blade.geometry.dispose();
          blade.material.dispose();
        }
        this.remove(this.orbitalGroup);
        this.orbitalGroup = null;
        this.orbitalBladeMeshes = [];
      }
      return;
    }

    const count = Math.max(1, Math.floor(skill.count));
    if (!this.orbitalGroup) {
      this.orbitalGroup = new THREE.Group();
      this.orbitalGroup.position.y = 0.55;
      this.add(this.orbitalGroup);
    }

    if (this.orbitalBladeMeshes.length !== count) {
      for (const blade of this.orbitalBladeMeshes) {
        this.orbitalGroup.remove(blade);
        blade.geometry.dispose();
        blade.material.dispose();
      }
      this.orbitalBladeMeshes = [];
      for (let i = 0; i < count; i++) {
        const blade = new THREE.Mesh(
          new THREE.ConeGeometry(0.1, 0.44, 4),
          new THREE.MeshStandardMaterial({
            color: 0xcfe9ff,
            emissive: 0x1c4d80,
            emissiveIntensity: 0.4,
            flatShading: true,
            metalness: 0.5,
            roughness: 0.3,
          })
        );
        blade.scale.z = 0.22;
        blade.rotation.x = Math.PI / 2;
        this.orbitalGroup.add(blade);
        this.orbitalBladeMeshes.push(blade);
      }
    }

    this.orbitalAngle += delta * 2.4;
    const radius = skill.range;
    for (let i = 0; i < this.orbitalBladeMeshes.length; i++) {
      const angle =
        this.orbitalAngle + (i / this.orbitalBladeMeshes.length) * Math.PI * 2;
      const blade = this.orbitalBladeMeshes[i];
      blade.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      blade.rotation.z = -angle;
    }

    const scene = this.parent;
    if (!scene?.enemies) {
      return;
    }

    for (const [enemy, timeLeft] of this.orbitalHitTimers) {
      const next = timeLeft - delta;
      if (next <= 0 || enemy.isDying || !scene.enemies.includes(enemy)) {
        this.orbitalHitTimers.delete(enemy);
      } else {
        this.orbitalHitTimers.set(enemy, next);
      }
    }

    const hitRadius = 0.55;
    const tickInterval = 0.4;
    const bladeWorldPos = new THREE.Vector3();
    for (const blade of this.orbitalBladeMeshes) {
      blade.getWorldPosition(bladeWorldPos);
      for (const enemy of scene.enemies) {
        if (enemy.isDying || this.orbitalHitTimers.has(enemy)) {
          continue;
        }
        const reach = hitRadius + (enemy.hitboxRadius ?? 0.5);
        if (enemy.position.distanceToSquared(bladeWorldPos) < reach * reach) {
          enemy.hit(skill.damage);
          audio.play("powerOrbitalBladeHit", { position: enemy.position });
          this.orbitalHitTimers.set(enemy, tickInterval);
        }
      }
    }
  }

  _updateStaticFieldOrbit(delta) {
    const skill = this.active_skills.staticField;
    if (!skill?.enabled) {
      if (this.staticFieldOrbit) {
        this.remove(this.staticFieldOrbit);
        this.staticFieldOrbit.traverse((child) => {
          if (child.isMesh) {
            child.geometry.dispose();
            child.material.dispose();
          }
        });
        this.staticFieldOrbit = null;
      }
      return;
    }

    if (!this.staticFieldOrbit) {
      const group = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({
        color: 0xaef0ff,
        emissive: 0x2299bb,
        emissiveIntensity: 0.6,
        flatShading: true,
      });
      const armGeometry = new THREE.BoxGeometry(0.22, 0.03, 0.03);
      for (let i = 0; i < 3; i++) {
        const arm = new THREE.Mesh(armGeometry, material);
        arm.rotation.y = (i / 3) * Math.PI;
        group.add(arm);
      }
      group.position.y = 0.85;
      this.add(group);
      this.staticFieldOrbit = group;
    }

    this.staticFieldOrbitAngle += delta * 1.3;
    const radius = 0.85;
    this.staticFieldOrbit.position.x =
      Math.cos(this.staticFieldOrbitAngle) * radius;
    this.staticFieldOrbit.position.z =
      Math.sin(this.staticFieldOrbitAngle) * radius;
    this.staticFieldOrbit.rotation.y += delta * 2.5;
    this.staticFieldOrbit.rotation.x += delta * 1.5;
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
    audio.play(
      this.active_skills.twinShot?.enabled ? "powerTwinShot" : "playerShoot"
    );
    const projectileSpeed = this.speed + PROJECTILE_SPEED_BASE;
    const isCritical = Math.random() < this.criticalChance;
    let baseDamage = this.damage;

    const berserkerSkill = this.active_skills.berserker;
    if (berserkerSkill?.enabled) {
      const missingRatio = 1 - this.health / this.maxHealth;
      baseDamage *= 1 + berserkerSkill.bonus * missingRatio;
    }

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

    const twinShotSkill = this.active_skills.twinShot;
    if (twinShotSkill?.enabled && this.parent) {
      const secondDirection = this.lastDirection
        .clone()
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(14))
        .normalize();
      const secondProjectile = new Projectile(
        this.position.clone(),
        secondDirection,
        projectileSpeed,
        undefined,
        damage * TWIN_SHOT_DAMAGE_MULTIPLIER,
        this.projectGlowing,
        this.sharpening,
        this.projectileColor,
        isCritical
      );
      this.parent.add(secondProjectile);
      this.parent.projectiles?.push(secondProjectile);
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
      for (const key of Object.keys(skill)) {
        if (!key.startsWith("growth")) {
          continue;
        }
        const growthAmount = skill[key];
        if (typeof growthAmount !== "number") {
          continue;
        }
        const fieldName = key[6].toLowerCase() + key.slice(7);
        if (typeof skill[fieldName] !== "number") {
          continue;
        }
        skill[fieldName] += growthAmount;
        const capField = `max${key.slice(6)}`;
        if (typeof skill[capField] === "number") {
          skill[fieldName] =
            growthAmount < 0
              ? Math.max(skill[fieldName], skill[capField])
              : Math.min(skill[fieldName], skill[capField]);
        }
      }

      if (skill.charges !== undefined && skill.growthCharges !== undefined) {
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
      slotPowers: { ...this.slotPowers },
      powerCooldowns: { ...this.powerCooldowns },
      secondWindUsed: this.secondWindUsed,
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
    ];
    for (const field of numericFields) {
      if (typeof state[field] === "number") {
        this[field] = state[field];
      }
    }
    if (state.slotPowers) {
      this.slotPowers = {
        q: state.slotPowers.q ?? this.slotPowers.q,
        e: state.slotPowers.e ?? this.slotPowers.e,
      };
    }
    if (state.powerCooldowns) {
      this.powerCooldowns = {
        q: state.powerCooldowns.q ?? 0,
        e: state.powerCooldowns.e ?? 0,
      };
    }
    if (state.active_skills) {
      this.active_skills = JSON.parse(JSON.stringify(state.active_skills));
    }
    if (state.position) {
      this.position.set(state.position.x ?? 0, 0, state.position.z ?? 0);
    }
    this.projectGlowing = state.projectGlowing === true;
    this.glowing = state.glowing === true;
    this.secondWindUsed = state.secondWindUsed === true;

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

    const staticFieldSkill = this.active_skills.staticField;
    if (
      staticFieldSkill?.enabled &&
      source?.freeze &&
      Math.random() < staticFieldSkill.chance
    ) {
      source.freeze(staticFieldSkill.freezeDuration);
      if (this.parent) {
        spawnRingWave(this.parent, this.position.clone(), {
          maxRadius: 1.9,
          duration: 0.32,
          color: 0x66eaff,
          bandWidth: 0.55,
        });
      }
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

    const secondWindSkill = this.active_skills.secondWind;
    const wouldDie = this.health - amount <= 0;
    if (wouldDie && secondWindSkill?.enabled && !this.secondWindUsed) {
      this.secondWindUsed = true;
      this.health = 1;
      this.isInvincible = true;
      this.secondWindTimer = SECOND_WIND_INVINCIBILITY_DURATION;
      audio.play("powerSecondWind");
      if (this.parent) {
        spawnFlash(this.parent, this.position.clone(), 0x4dff88, 3, 0.5);
        spawnRingWave(this.parent, this.position.clone(), {
          maxRadius: 3.5,
          duration: 0.6,
          color: 0x4dff88,
          bandWidth: 0.6,
        });
      }

      const revivePosition = new THREE.Vector3();
      this.getWorldPosition(revivePosition);
      showDamageText(amount, revivePosition);
      const reviveMesh = this.children.find((child) => child.isMesh);
      if (reviveMesh && reviveMesh.material) {
        reviveMesh.material.color.set(0xff0000);
        this.damageEffectTime = 0.2;
      }
      return true;
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

  onEnemyKilled() {
    const skill = this.active_skills.adrenaline;
    if (skill?.enabled) {
      this.adrenalineTimer = skill.duration;
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
