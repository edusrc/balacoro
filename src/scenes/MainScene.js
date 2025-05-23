import * as THREE from "three";
import { InputController } from "../core/InputController.js";
import { TileManager } from "../core/TileManager.js";
import { CityTileManager } from "../core/CityTileManager.js";
import { Player } from "../objects/Player.js";
import { Enemy } from "../objects/Enemy.js";
import { Item } from "../objects/Item.js";
import { Projectile } from "../objects/Projectile.js";
import { showMessage } from "../components/FloatingMessage.js";
import {
  PLAYER_RADIUS,
  ENEMY_RADIUS,
  ENEMY_SPAWN_INTERVAL,
  BASE_ENEMY_HEALTH,
  ENEMY_HEALTH_GROWTH,
  BASE_ENEMY_DAMAGE,
  ENEMY_DAMAGE_GROWTH,
  ITEM_SPAWN_INTERVAL,
  ITEM_SPAWN_DISTANCE,
  ENEMY_SPAWN_DISTANCE,
  INITIAL_DIFFICULTY,
  DIFFICULTY_INCREASE_INTERVAL_SECONDS,
  PLAYER_PASSIVES,
} from "../constants.js";
export class MainScene extends THREE.Scene {
  constructor() {
    super();
    this.isPaused = false;
    this.clock = new THREE.Clock();
    this.inputController = new InputController();
    this.tileManager = new CityTileManager(this, 20);
    this.enemies = [];
    this.items = [];
    this.elapsedTime = 0;
    this.currentDifficulty = 0;

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

    this._initPlayer();
  }

  _initPlayer() {
    this.player = new Player(this.inputController);
    this.player.onLevelUp = () => {
      this.isPaused = true;
      this.clock.stop();
      this._showLevelUpOptions();
    };
    this.add(this.player);
  }

  _showLevelUpOptions() {
    const modal = document.getElementById("levelUpModal");
    const optionsDiv = document.getElementById("passiveOptions");
    optionsDiv.innerHTML = "";

    for (const passive of Object.keys(PLAYER_PASSIVES)) {
      const button = document.createElement("button");
      button.innerText = passive
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
      button.style.margin = "5px";
      button.onclick = () => {
        const value = PLAYER_PASSIVES[passive].increment;
        this.player.applyPassiveEffect({ type: passive, value });
        modal.style.display = "none";
        this.clock.start();
        this.isPaused = false;
      };
      optionsDiv.appendChild(button);
    }

    modal.style.display = "block";
  }

  _getRandomFloat(min, max) {
    return min + Math.random() * (max - min);
  }

  _getRandomSpawnAroundPlayer(min, max) {
    const angle = Math.random() * Math.PI * 2;
    const dist = this._getRandomFloat(min, max);
    const { x, z } = this.player.position;
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

    showMessage(
      `Item spawned at [${pos.x.toFixed(1)}, ${pos.z.toFixed(1)}]`,
      "#fff",
      "50px"
    );
  }

  _spawnEnemy(difficulty) {
    const pos = this._getRandomSpawnAroundPlayer(
      ENEMY_SPAWN_DISTANCE.min,
      ENEMY_SPAWN_DISTANCE.max
    );
    const enemy = new Enemy(
      this.player,
      pos,
      4,
      BASE_ENEMY_HEALTH + difficulty * ENEMY_HEALTH_GROWTH,
      difficulty
    );
    this.add(enemy);
    this.enemies.push(enemy);
  }

  _spawnEnemyPack(difficulty) {
    const count = Math.random() < 0.2 + difficulty * 0.01 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      this._spawnEnemy(difficulty);
    }
  }

  _updateProjectiles(delta) {
    this.children.forEach((c) => c instanceof Projectile && c.update(delta));
  }

  _updateEnemies(delta) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(delta);
      if (!enemy.parent) this.enemies.splice(i, 1);
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
    const modal = document.getElementById("skillChoiceModal");
    const optionsDiv = document.getElementById("skillOptions");
    optionsDiv.innerHTML = "";

    const skills = [...Item.skillTypes].filter((skill) => {
      const data = this.player.active_skills[skill];
      const keys = Object.keys(data || {});
      return !(data?.enabled && keys.length === 1);
    });
    const chosen = [];
    while (chosen.length < 3) {
      const skill = skills.splice(
        Math.floor(Math.random() * skills.length),
        1
      )[0];
      if (skill) {
        chosen.push(skill);
      }
    }

    for (const skill of chosen) {
      const button = document.createElement("button");
      button.className = "skill-button";

      const tooltip = document.createElement("div");
      tooltip.className = "skill-tooltip";
      tooltip.innerText = skill
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());

      const iconWrapper = document.createElement("div");
      iconWrapper.className = "skill-icon";
      iconWrapper.style.backgroundColor =
        "#" + Item._getColorForSkill(skill).toString(16).padStart(6, "0");

      const isUnlocked = this.player.active_skills[skill]?.enabled;
      const info = document.createElement("div");
      if (!isUnlocked) {
        info.className = "skill-locked";
      } else {
        info.className = "skill-unlocked";
        const skillData = this.player.active_skills[skill];
        const visibleData = Object.entries(skillData)
          .filter(
            ([k, v]) =>
              k !== "enabled" &&
              !k.toLowerCase().includes("growth") &&
              v !== undefined
          )
          .map(([k, v]) => {
            const label = k
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (str) => str.toUpperCase());
            return `${label}: ${v}`;
          })
          .join("\n");

        info.innerText = visibleData;
      }

      button.appendChild(tooltip);
      button.appendChild(iconWrapper);
      button.appendChild(info);

      button.onclick = () => {
        this.player.applySkillEffect(skill);
        modal.style.display = "none";
        this.clock.start();
        this.isPaused = false;
      };

      optionsDiv.appendChild(button);
    }

    modal.style.display = "block";
  }

  _resolveCollisions(delta) {
    const playerRadius = PLAYER_RADIUS,
      enemyRadius = ENEMY_RADIUS,
      minDist = playerRadius + enemyRadius;

    // Enemy-enemy
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        this.enemies[i].resolveCollision(this.enemies[j]);
      }
    }

    // Projectile-enemy
    const projectiles = this.children.filter((c) => c instanceof Projectile);
    for (const p of projectiles) {
      const box = p.getCollisionBox();
      const hitSomething = this.tileManager.solidBoxes.some((solidBox) =>
        solidBox.intersectsBox(box)
      );
      if (hitSomething && p.parent) {
        p.parent.remove(p);
        continue;
      }

      for (const e of this.enemies) {
        if (p.position.distanceToSquared(e.position) < 1) {
          e.hit(p.damage);
          if (p.parent) p.parent.remove(p);
          break;
        }
      }
    }

    // Enemy-player push
    for (const enemy of this.enemies) {
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

    // Enemy attack
    const minSq = minDist * minDist;
    for (const enemy of this.enemies) {
      if (!enemy.parent) {
        continue;
      }
      enemy.damageTimer = (enemy.damageTimer || 0) - delta;
      const distSq = enemy.position.distanceToSquared(this.player.position);
      if (distSq < minSq && enemy.damageTimer <= 0) {
        this.player.takeDamage(
          Math.floor(
            BASE_ENEMY_DAMAGE + ENEMY_DAMAGE_GROWTH * enemy.difficulty
          ),
          enemy
        );
        enemy.damageTimer = 1;
      }
    }
  }

  _updateSpawns(delta, difficulty) {
    this.enemySpawnTimer += delta;
    const interval = Math.max(
      0.5,
      this.nextEnemySpawnTime / (1 + difficulty * 0.1)
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
  }

  update(camera) {
    const delta = this.isPaused ? 0 : this.clock.getDelta();
    if (this.isPaused) return;

    this.elapsedTime += delta;
    const difficulty = Math.floor(
      this.elapsedTime / DIFFICULTY_INCREASE_INTERVAL_SECONDS
    );
    this.currentDifficulty = INITIAL_DIFFICULTY + difficulty;

    this.player.update(delta);
    const { x, y, z } = this.player.position;
    this.tileManager.update(x, z);

    this._updateProjectiles(delta);
    this._updateEnemies(delta);
    this._updateItems(delta);
    this._resolveCollisions(delta);
    this._updateSpawns(delta, difficulty);

    camera.position.set(x, y + 10, z + 10);
    camera.lookAt(x, y, z);
    window.currentCamera = camera;
  }
}
