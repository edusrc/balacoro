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
    this.speed = PLAYER_INITIAL_SPEED;
    this.attackSpeed = PLAYER_INITIAL_ATTACK_SPEED;
    this.attackCooldown = 0;
    this.lastDirection = new THREE.Vector3(1, 0, 0);

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
      emissive: this.glowing
        ? new THREE.Color(PLAYER_LIGHT_COLOR)
        : new THREE.Color(0x000000),
      emissiveIntensity: this.glowing ? PLAYER_EMISSIVE_INTENSITY : 0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);

    this.personalLight = new THREE.PointLight(
      PLAYER_EMISSIVE_COLOR,
      this.glowing
        ? PLAYER_LIGHT_INTENSITY_GLOWING
        : PLAYER_LIGHT_INTENSITY_NORMAL,
      this.glowing
        ? PLAYER_LIGHT_DISTANCE_GLOWING
        : PLAYER_LIGHT_DISTANCE_NORMAL
    );
    this.personalLight.position.set(0, 1.5, 0);
    this.add(this.personalLight);

    this.damageEffectTime = 0;
    this.originalColor = new THREE.Color(PLAYER_COLOR);
  }

  update(delta) {
    const direction = new THREE.Vector3();

    if (this.input.keys.KeyW) direction.z -= 1;
    if (this.input.keys.KeyS) direction.z += 1;
    if (this.input.keys.KeyA) direction.x -= 1;
    if (this.input.keys.KeyD) direction.x += 1;

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
  }

  attack() {
    const projectileSpeed = this.speed + PROJECTILE_SPEED_BASE;
    const projectile = new Projectile(
      this.position.clone(),
      this.lastDirection.clone(),
      projectileSpeed
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
    } else {
      if (skill.cooldown !== undefined && skill.growthCooldown !== undefined)
        skill.cooldown += skill.growthCooldown;
      if (skill.damage !== undefined && skill.growthDamage !== undefined)
        skill.damage += skill.growthDamage;
      if (skill.duration !== undefined && skill.growthDuration !== undefined)
        skill.duration += skill.growthDuration;
      if (
        skill.shieldCount !== undefined &&
        skill.growthShieldCount !== undefined
      )
        skill.shieldCount += skill.growthShieldCount;
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

  takeDamage(amount) {
    this.health -= amount;

    const worldPosition = new THREE.Vector3();
    this.getWorldPosition(worldPosition);
    showDamageText(amount, worldPosition);

    const mesh = this.children.find((child) => child.isMesh);
    if (mesh && mesh.material) {
      mesh.material.color.set(0xff0000);
      if (mesh && mesh.material) {
        mesh.material.color.set(0xff0000);
        this.damageEffectTime = 0.2;
      }
    }

    if (this.health <= 0) {
      alert("Game Over");
      location.reload();
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
