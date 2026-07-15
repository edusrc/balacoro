import * as THREE from "three";
import { InputController } from "../core/InputController.js";
import { WorldTileManager } from "../core/WorldTileManager.js";
import { Player } from "../objects/Player.js";
import { Enemy } from "../objects/Enemy.js";
import { Mimic } from "../objects/Mimic.js";
import { Item } from "../objects/Item.js";
import { showMessage } from "../components/FloatingMessage.js";
import {
  PLAYER_RADIUS,
  ENEMY_SPAWN_INTERVAL,
  BASE_ENEMY_HEALTH,
  ENEMY_HEALTH_GROWTH,
  BASE_ENEMY_DAMAGE,
  ENEMY_DAMAGE_GROWTH,
  ITEM_SPAWN_INTERVAL,
  ITEM_SPAWN_DISTANCE,
  ENEMY_SPAWN_DISTANCE,
  ENEMY_DESPAWN_DISTANCE,
  INITIAL_DIFFICULTY,
  DIFFICULTY_INCREASE_INTERVAL_SECONDS,
  PLAYER_PASSIVES,
  PROJECTILE_SIZE,
  LEVELS_PER_ENEMY_POWER,
  ENEMY_BIOME_BIAS_CHANCE,
  ENEMY_SOLID_CHECK_INTERVAL,
  BOSS_SUMMON_COUNT,
  MIMIC_SPAWN_INTERVAL,
  MIMIC_HEALTH_MULTIPLIER,
  FULL_MOON_SPAWN_MULTIPLIER,
  FULL_MOON_COIN_MULTIPLIER,
  BOSS_HEALTH_MULTIPLIER,
  BOSS_SPEED,
} from "../constants.js";
export class MainScene extends THREE.Scene {
  constructor() {
    super();
    this.isPaused = false;
    this.isManuallyPaused = false;
    this.isLevelUpModalOpen = false;
    this.isSkillChoiceModalOpen = false;
    this.isGameOver = false;
    this.onGameOver = null;
    this.onPauseChange = null;
    this.clock = new THREE.Clock();
    this.inputController = new InputController();
    this.tileManager = new WorldTileManager(this, 20);
    this.enemies = [];
    this.items = [];
    this.projectiles = [];
    this.coinsEarned = 0;
    this.isNight = false;

    this.shakeTime = 0;
    this.shakeDuration = 0.25;
    this.shakeIntensity = 0;
    this.elapsedTime = 0;
    this.currentDifficulty = 0;
    this.highestBossDifficultySpawned = 0;

    this.enemySpawnTimer = 0;
    this.nextEnemySpawnTime = this._getRandomFloat(
      ENEMY_SPAWN_INTERVAL.min,
      ENEMY_SPAWN_INTERVAL.max
    );
    this.itemSpawnTimer = 0;
    this.nextItemSpawnTime = this._getRandomFloat(
      ITEM_SPAWN_INTERVAL.min,
      ITEM_SPAWN_INTERVAL.max
    );
    this.mimicSpawnTimer = 0;
    this.nextMimicSpawnTime = this._getRandomFloat(
      MIMIC_SPAWN_INTERVAL.min,
      MIMIC_SPAWN_INTERVAL.max
    );

    this._initPlayer();
  }

  _initPlayer() {
    this.player = new Player(this.inputController);
    this.player.onLevelUp = () => {
      this.isPaused = true;
      this.clock.stop();
      this._showLevelUpOptions();
    };
    this.player.onGameOver = () => {
      this.isPaused = true;
      this.isGameOver = true;
      this.clock.stop();
      if (this.onGameOver) {
        this.onGameOver({
          level: this.player.level,
          elapsedTime: this.elapsedTime,
          coins: this.coinsEarned,
        });
      }
    };
    this.add(this.player);
  }

  addCoins(amount) {
    this.coinsEarned += this.isFullMoon
      ? amount * FULL_MOON_COIN_MULTIPLIER
      : amount;
  }

  spawnMinions(boss) {
    for (let i = 0; i < BOSS_SUMMON_COUNT; i++) {
      const angle = (i / BOSS_SUMMON_COUNT) * Math.PI * 2 + Math.random();
      const pos = new THREE.Vector3(
        boss.position.x + Math.cos(angle) * (boss.size + 1.5),
        0,
        boss.position.z + Math.sin(angle) * (boss.size + 1.5)
      );
      const minion = new Enemy(
        this.player,
        pos,
        4,
        BASE_ENEMY_HEALTH + boss.difficulty * ENEMY_HEALTH_GROWTH,
        boss.difficulty,
        false,
        "runner"
      );
      this.add(minion);
      this.enemies.push(minion);
    }
  }

  _spawnMimic(difficulty) {
    const pos = this._getRandomSpawnAroundPlayer(25, 50);
    const power = this._getEnemyPower(difficulty);
    const mimic = new Mimic(
      this.player,
      pos,
      4.5,
      (BASE_ENEMY_HEALTH + power * ENEMY_HEALTH_GROWTH) *
        MIMIC_HEALTH_MULTIPLIER,
      power
    );
    this.add(mimic);
    this.enemies.push(mimic);
  }

  togglePause() {
    if (this.isGameOver) {
      return;
    }
    if (this.isLevelUpModalOpen || this.isSkillChoiceModalOpen) {
      return;
    }

    this.isManuallyPaused = !this.isManuallyPaused;
    this.isPaused = this.isManuallyPaused;

    if (this.isManuallyPaused) {
      this.clock.stop();
    } else {
      this.clock.start();
    }

    if (this.onPauseChange) {
      this.onPauseChange(this.isManuallyPaused);
    }
  }

  _showLevelUpOptions() {
    this.isLevelUpModalOpen = true;
    if (this.onShowLevelUp) {
      this.onShowLevelUp();
    }
  }

  choosePassive(passive) {
    const value = PLAYER_PASSIVES[passive].increment;
    this.player.applyPassiveEffect({ type: passive, value });
    this.isLevelUpModalOpen = false;
    this.clock.start();
    this.isPaused = false;
  }

  chooseSkill(skill) {
    this.player.applySkillEffect(skill);
    this.isSkillChoiceModalOpen = false;
    this.clock.start();
    this.isPaused = false;
  }

  _getRandomFloat(min, max) {
    return min + Math.random() * (max - min);
  }

  _getRandomSpawnAroundPlayer(min, max) {
    const maximumAttempts = 20;
    const { x, z } = this.player.position;
    const spawnBox = new THREE.Box3();
    const spawnCenter = new THREE.Vector3();

    for (let attempt = 0; attempt < maximumAttempts; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = this._getRandomFloat(min, max);
      const candidateX = x + Math.cos(angle) * dist;
      const candidateZ = z + Math.sin(angle) * dist;

      spawnBox.setFromCenterAndSize(
        spawnCenter.set(candidateX, 1.5, candidateZ),
        new THREE.Vector3(3, 3, 3)
      );
      if (!this.tileManager.intersectsSolid(spawnBox)) {
        return new THREE.Vector3(candidateX, 0, candidateZ);
      }
    }

    const angle = Math.random() * Math.PI * 2;
    const dist = this._getRandomFloat(min, max);
    return new THREE.Vector3(
      x + Math.cos(angle) * dist,
      0,
      z + Math.sin(angle) * dist
    );
  }

  _spawnItem() {
    const pos = this._getRandomSpawnAroundPlayer(
      ITEM_SPAWN_DISTANCE.min,
      ITEM_SPAWN_DISTANCE.max
    );
    pos.y = 0.25;
    const item = new Item(pos, 0.05, 0x800080);
    this.add(item);
    this.items.push(item);

    showMessage("An item spawned near you", "#fff", "50px");
  }

  _spawnEnemy(difficulty) {
    const pos = this._getRandomSpawnAroundPlayer(
      ENEMY_SPAWN_DISTANCE.min,
      ENEMY_SPAWN_DISTANCE.max
    );
    const biome = this.tileManager.getBiomeNameAt(pos.x, pos.z);
    const biasMap = { snow: "tank", desert: "runner", city: "brute" };
    const bias = biasMap[biome];
    const forcedArchetype =
      bias && Math.random() < ENEMY_BIOME_BIAS_CHANCE ? bias : undefined;
    const power = this._getEnemyPower(difficulty);
    const enemy = new Enemy(
      this.player,
      pos,
      4,
      BASE_ENEMY_HEALTH + power * ENEMY_HEALTH_GROWTH,
      power,
      false,
      forcedArchetype
    );
    this.add(enemy);
    this.enemies.push(enemy);
  }

  _getEnemyPower(difficulty) {
    return (
      difficulty + Math.floor((this.player.level - 1) / LEVELS_PER_ENEMY_POWER)
    );
  }

  _spawnEnemyPack(difficulty) {
    const count = Math.random() < 0.2 + difficulty * 0.01 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      this._spawnEnemy(difficulty);
    }
  }

  _spawnBoss(difficulty) {
    const pos = this._getRandomSpawnAroundPlayer(
      ENEMY_SPAWN_DISTANCE.min,
      ENEMY_SPAWN_DISTANCE.max
    );
    const power = this._getEnemyPower(difficulty);
    const health =
      (BASE_ENEMY_HEALTH + power * ENEMY_HEALTH_GROWTH) *
      BOSS_HEALTH_MULTIPLIER;
    const boss = new Enemy(
      this.player,
      pos,
      BOSS_SPEED,
      health,
      power,
      true
    );
    this.add(boss);
    this.enemies.push(boss);

    showMessage(`A boss has appeared! Difficulty ${difficulty}`, "#ff3333");
  }

  _updateProjectiles(delta) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(delta);
      if (!projectile.parent) this.projectiles.splice(i, 1);
    }
  }

  _updateEnemies(delta) {
    const despawnDistSq = ENEMY_DESPAWN_DISTANCE * ENEMY_DESPAWN_DISTANCE;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(delta);
      if (!enemy.parent) {
        this.enemies.splice(i, 1);
        continue;
      }

      if (
        !enemy.isDying &&
        enemy.position.distanceToSquared(this.player.position) > despawnDistSq
      ) {
        const pos = this._getRandomSpawnAroundPlayer(
          ENEMY_SPAWN_DISTANCE.min,
          ENEMY_SPAWN_DISTANCE.max
        );
        enemy.position.copy(pos);
        continue;
      }

      enemy.solidCheckTimer = (enemy.solidCheckTimer ?? Math.random()) - delta;
      if (enemy.solidCheckTimer <= 0) {
        enemy.solidCheckTimer = ENEMY_SOLID_CHECK_INTERVAL;
        if (
          !enemy.isDying &&
          this.tileManager.intersectsSolid(
            enemy.getCollisionBoxAt(enemy.position)
          )
        ) {
          const pos = this._getRandomSpawnAroundPlayer(
            ENEMY_SPAWN_DISTANCE.min,
            ENEMY_SPAWN_DISTANCE.max
          );
          enemy.position.copy(pos);
        }
      }
    }
  }

  _updateItems(delta) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.update(delta);
      if (item.position.distanceToSquared(this.player.position) < 1) {
        this.isPaused = true;
        this.clock.stop();
        this._showSkillChoices();

        if (item.parent) {
          item.parent.remove(item);
        }
        this.items.splice(i, 1);
      }
    }
  }

  _showSkillChoices() {
    this.isSkillChoiceModalOpen = true;

    const skills = [...Item.skillTypes].filter((skill) => {
      const data = this.player.active_skills[skill];
      const keys = Object.keys(data || {});
      return !(data?.enabled && keys.length === 1);
    });
    const chosen = [];
    while (chosen.length < 3 && skills.length > 0) {
      const skill = skills.splice(
        Math.floor(Math.random() * skills.length),
        1
      )[0];
      if (skill) {
        chosen.push(skill);
      }
    }

    if (this.onShowSkillChoices) {
      this.onShowSkillChoices(chosen);
    }
  }

  _resolveEnemyCollisions() {
    const cellSize = 4;
    const grid = new Map();

    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      const key = `${Math.floor(enemy.position.x / cellSize)}_${Math.floor(
        enemy.position.z / cellSize
      )}`;
      let cell = grid.get(key);
      if (!cell) {
        cell = [];
        grid.set(key, cell);
      }
      cell.push(i);
    }

    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      const cx = Math.floor(enemy.position.x / cellSize);
      const cz = Math.floor(enemy.position.z / cellSize);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cell = grid.get(`${cx + dx}_${cz + dz}`);
          if (!cell) continue;
          for (const j of cell) {
            if (j <= i) continue;
            enemy.resolveCollision(this.enemies[j]);
          }
        }
      }
    }
  }

  _triggerScreenShake(duration = 0.25, intensity = 0.35) {
    this.shakeTime = duration;
    this.shakeDuration = duration;
    this.shakeIntensity = intensity;
  }

  _resolveCollisions(delta) {
    const playerRadius = PLAYER_RADIUS;

    this._resolveEnemyCollisions();

    for (const p of this.projectiles) {
      if (!p.parent) continue;
      const box = p.getCollisionBox();
      const hitSomething = this.tileManager.intersectsSolid(box);
      if (hitSomething && p.parent) {
        p.parent.remove(p);
        continue;
      }

      for (const e of this.enemies) {
        if (e.isDying || p.hitEnemies.has(e)) continue;
        const hitDistance = e.hitboxRadius + PROJECTILE_SIZE / 2;
        if (
          p.position.distanceToSquared(e.position) <
          hitDistance * hitDistance
        ) {
          const projectileDamage = p.damage;
          e.hit(projectileDamage);
          p.hitEnemies.add(e);
          if (this.player.lifeSteal > 0) {
            this.player.health = Math.min(
              this.player.health + projectileDamage * this.player.lifeSteal,
              this.player.maxHealth
            );
          }

          p.pierce -= 1;
          if (p.pierce <= 0) {
            if (p.parent) {
              p.parent.remove(p);
            }
            break;
          }
        }
      }
    }

    for (const enemy of this.enemies) {
      if (enemy.isDying || enemy.isDormant) continue;
      const minDist = playerRadius + enemy.hitboxRadius;
      const distVec = new THREE.Vector3().subVectors(
        enemy.position,
        this.player.position
      );
      const distSq = distVec.lengthSq();
      if (distSq < minDist * minDist && distSq > 0.0001) {
        const push = minDist - Math.sqrt(distSq);
        enemy.position.add(distVec.normalize().multiplyScalar(push));
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.parent || enemy.isDying || enemy.isDormant) {
        continue;
      }
      enemy.damageTimer = (enemy.damageTimer || 0) - delta;
      const minDist = playerRadius + enemy.hitboxRadius;
      const distSq = enemy.position.distanceToSquared(this.player.position);
      if (distSq < minDist * minDist && enemy.damageTimer <= 0) {
        const damage =
          (BASE_ENEMY_DAMAGE + ENEMY_DAMAGE_GROWTH * enemy.difficulty) *
          enemy.damageMultiplier;
        const tookDamage = this.player.takeDamage(Math.floor(damage), enemy);
        if (tookDamage) {
          this._triggerScreenShake();
        }
        enemy.damageTimer = 1;
      }
    }
  }

  _updateSpawns(delta, difficulty) {
    this.enemySpawnTimer += delta;
    const moonFactor = this.isFullMoon ? FULL_MOON_SPAWN_MULTIPLIER : 1;
    const interval = Math.max(
      0.5,
      this.nextEnemySpawnTime / ((1 + difficulty * 0.1) * moonFactor)
    );
    if (this.enemySpawnTimer >= interval) {
      this.enemySpawnTimer = 0;
      this._spawnEnemyPack(difficulty);
      this.nextEnemySpawnTime = this._getRandomFloat(
        ENEMY_SPAWN_INTERVAL.min,
        ENEMY_SPAWN_INTERVAL.max
      );
    }

    this.itemSpawnTimer += delta;
    if (this.itemSpawnTimer >= this.nextItemSpawnTime) {
      this.itemSpawnTimer = 0;
      this._spawnItem();
      this.nextItemSpawnTime = this._getRandomFloat(
        ITEM_SPAWN_INTERVAL.min,
        ITEM_SPAWN_INTERVAL.max
      );
    }

    this.mimicSpawnTimer += delta;
    if (this.mimicSpawnTimer >= this.nextMimicSpawnTime) {
      this.mimicSpawnTimer = 0;
      this._spawnMimic(difficulty);
      this.nextMimicSpawnTime = this._getRandomFloat(
        MIMIC_SPAWN_INTERVAL.min,
        MIMIC_SPAWN_INTERVAL.max
      );
    }
  }

  update(camera) {
    const delta = this.isPaused ? 0 : this.clock.getDelta();
    if (this.isPaused) return;

    this.elapsedTime += delta;
    const difficulty = Math.floor(
      this.elapsedTime / DIFFICULTY_INCREASE_INTERVAL_SECONDS
    );
    this.currentDifficulty = INITIAL_DIFFICULTY + difficulty;

    if (this.currentDifficulty > this.highestBossDifficultySpawned) {
      this.highestBossDifficultySpawned = this.currentDifficulty;
      this._spawnBoss(this.currentDifficulty);
    }

    if (this.isFullMoon && !this._fullMoonAnnounced) {
      this._fullMoonAnnounced = true;
      showMessage("BLOOD MOON RISES!", "#ff4444");
    }
    if (!this.isFullMoon) {
      this._fullMoonAnnounced = false;
    }
    if (this.isMist && !this._mistAnnounced) {
      this._mistAnnounced = true;
      showMessage("A dense mist rolls in...", "#aabbcc");
    }
    if (!this.isMist) {
      this._mistAnnounced = false;
    }

    this.player.update(delta);
    const { x, y, z } = this.player.position;
    this.tileManager.update(x, z);

    this._updateProjectiles(delta);
    this._updateEnemies(delta);
    this._updateItems(delta);
    this._resolveCollisions(delta);
    this._updateSpawns(delta, difficulty);

    let shakeX = 0;
    let shakeY = 0;
    let shakeZ = 0;
    if (this.shakeTime > 0) {
      this.shakeTime -= delta;
      const strength =
        this.shakeIntensity * Math.max(this.shakeTime / this.shakeDuration, 0);
      shakeX = (Math.random() * 2 - 1) * strength;
      shakeY = (Math.random() * 2 - 1) * strength;
      shakeZ = (Math.random() * 2 - 1) * strength;
    }

    camera.position.set(x + shakeX, y + 10 + shakeY, z + 10 + shakeZ);
    camera.lookAt(x, y, z);
  }
}
