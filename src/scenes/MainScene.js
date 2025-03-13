import * as THREE from "three";
import { InputController } from "../core/InputController";
import { Player } from "../objects/Player";
import { TileManager } from "../core/TileManager";
import { Enemy } from "../objects/Enemy";
import { Item } from "../objects/Item";
import { Projectile } from "../objects/Projectile";

export class MainScene extends THREE.Scene {
  constructor() {
    super();
    this.clock = new THREE.Clock();
    this.inputController = new InputController();
    this.tileManager = new TileManager(this, 10);

    this.enemies = [];
    this.items = [];

    this.spawnTimer = 0;
    this.nextSpawnTime = this.getRandomSpawnTime();

    this.itemSpawnTimer = 0;

    this.init();
  }

  init() {
    this.player = new Player(this.inputController);
    this.add(this.player);
  }

  getRandomSpawnTime() {
    return 10 + Math.random() * 20;
  }

  getRandomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  spawnEnemiesPack() {
    const playerPos = this.player.position.clone();

    const minDistanceFromPlayer = 15;
    const maxDistanceFromPlayer = 30;

    const angle = Math.random() * Math.PI * 2;
    const distanceFromPlayer =
      minDistanceFromPlayer +
      Math.random() * (maxDistanceFromPlayer - minDistanceFromPlayer);

    const baseSpawn = new THREE.Vector3(
      playerPos.x + distanceFromPlayer * Math.cos(angle),
      0,
      playerPos.z + distanceFromPlayer * Math.sin(angle)
    );

    const count = this.getRandomInt(1, 10);
    const positions = [];
    const maxAttempts = 100;
    let attempts = 0;
    const groupArea = 20;
    const minEnemyDistance = 5;

    while (positions.length < count && attempts < maxAttempts) {
      attempts++;
      const offsetX = Math.random() * groupArea - groupArea / 2;
      const offsetZ = Math.random() * groupArea - groupArea / 2;
      const candidate = new THREE.Vector3(
        baseSpawn.x + offsetX,
        0,
        baseSpawn.z + offsetZ
      );

      if (candidate.distanceTo(playerPos) < minDistanceFromPlayer) {
        continue;
      }

      let valid = true;
      for (let pos of positions) {
        if (candidate.distanceTo(pos) < minEnemyDistance) {
          valid = false;
          break;
        }
      }
      if (valid) {
        positions.push(candidate);
      }
    }

    positions.forEach((pos) => {
      const enemy = new Enemy(this.player, pos);
      this.add(enemy);
      this.enemies.push(enemy);
    });
  }

  spawnItemsPeriodically() {
    const tileSize = this.tileManager.tileSize;
    const regionWidth = tileSize * 4;
    const regionDepth = tileSize * 3;

    const regionX = Math.floor(this.player.position.x / regionWidth);
    const regionZ = Math.floor(this.player.position.z / regionDepth);
    const minX = regionX * regionWidth;
    const maxX = minX + regionWidth;
    const minZ = regionZ * regionDepth;
    const maxZ = minZ + regionDepth;

    const count = this.getRandomInt(1, 3);
    for (let i = 0; i < count; i++) {
      const x = minX + Math.random() * (maxX - minX);
      const z = minZ + Math.random() * (maxZ - minZ);
      const pos = new THREE.Vector3(x, 0.25, z);
      const item = new Item(pos, 0.05, 0x800080);
      this.add(item);
      this.items.push(item);
    }
  }

  update(camera) {
    const delta = this.clock.getDelta();

    this.player.update(delta);

    const { x: px, y: py, z: pz } = this.player.position;
    this.tileManager.update(px, pz);

    this.itemSpawnTimer += delta;
    if (this.itemSpawnTimer >= 60) {
      this.itemSpawnTimer = 0;
      this.spawnItemsPeriodically();
    }

    this.children.forEach((child) => {
      if (child instanceof Projectile) {
        child.update(delta);
      }
    });

    this.enemies.slice().forEach((enemy, index) => {
      enemy.update(delta);
      if (!enemy.parent) {
        this.enemies.splice(index, 1);
      }
    });

    this.items.slice().forEach((item, index) => {
      item.update(delta);
      if (item.position.distanceTo(this.player.position) < 1) {
        this.player.applyItemEffect(item.effectValue);
        if (item.parent) item.parent.remove(item);
        this.items.splice(index, 1);
      }
    });

    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        this.enemies[i].resolveCollision(this.enemies[j]);
      }
    }

    this.children.forEach((child) => {
      if (child instanceof Projectile) {
        this.enemies.forEach((enemy) => {
          if (child.position.distanceTo(enemy.position) < 1) {
            enemy.hit(1);
            if (child.parent) {
              child.parent.remove(child);
            }
          }
        });
      }
    });

    this.spawnTimer += delta;
    if (this.spawnTimer >= this.nextSpawnTime) {
      this.spawnTimer = 0;
      this.nextSpawnTime = this.getRandomSpawnTime();
      this.spawnEnemiesPack();
    }

    camera.position.set(px, py + 10, pz + 10);
    camera.lookAt(px, py, pz);
  }
}
