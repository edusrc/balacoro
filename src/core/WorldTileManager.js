import * as THREE from "three";
import { CityBiome } from "./biomes/CityBiome.js";
import { ForestBiome } from "./biomes/ForestBiome.js";
import { DesertBiome } from "./biomes/DesertBiome.js";
import { SnowBiome } from "./biomes/SnowBiome.js";

const BIOME_REGION_SIZE_IN_CHUNKS = 6;

export class WorldTileManager {
  constructor(scene, tileSize = 20) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.loadedTiles = new Map();
    this.solidBoxes = [];
    this.seed = Math.floor(Math.random() * 1000000);

    this.biomes = {
      city: new CityBiome(),
      forest: new ForestBiome(),
      desert: new DesertBiome(),
      snow: new SnowBiome(),
    };
    this.wildBiomeOrder = ["forest", "desert", "snow"];
  }

  _tileKey(chunkX, chunkZ) {
    return `${chunkX}_${chunkZ}`;
  }

  getBiomeNameForChunk(chunkX, chunkZ) {
    const regionX = Math.floor(chunkX / BIOME_REGION_SIZE_IN_CHUNKS);
    const regionZ = Math.floor(chunkZ / BIOME_REGION_SIZE_IN_CHUNKS);

    if (regionX === 0 && regionZ === 0) {
      return "city";
    }

    const hash =
      (regionX * 374761393) ^ (regionZ * 668265263) ^ this.seed;
    const normalized = Math.abs(Math.sin(hash) * 10000) % 1;
    const index = Math.floor(normalized * this.wildBiomeOrder.length);

    return this.wildBiomeOrder[
      Math.min(index, this.wildBiomeOrder.length - 1)
    ];
  }

  isWorldPositionSolid(x, z) {
    const point = new THREE.Vector3(x, 0, z);
    for (const box of this.solidBoxes) {
      if (box.containsPoint(point)) {
        return true;
      }
    }
    return false;
  }

  removeTile(tileInfo) {
    if (!tileInfo) {
      return;
    }

    for (const mesh of tileInfo.meshes) {
      this.scene.remove(mesh);
    }

    if (tileInfo.solidBoxes.length > 0) {
      this.solidBoxes = this.solidBoxes.filter(
        (box) => !tileInfo.solidBoxes.includes(box)
      );
    }
  }

  update(playerX, playerZ) {
    const chunkX = Math.floor((playerX + this.tileSize / 2) / this.tileSize);
    const chunkZ = Math.floor((playerZ + this.tileSize / 2) / this.tileSize);
    const neededKeys = new Set();

    for (let x = chunkX - 4; x <= chunkX + 4; x++) {
      for (let z = chunkZ - 3; z <= chunkZ + 3; z++) {
        const key = this._tileKey(x, z);
        neededKeys.add(key);

        if (!this.loadedTiles.has(key)) {
          const biomeName = this.getBiomeNameForChunk(x, z);
          const biome = this.biomes[biomeName];
          const result = biome.createTile(
            this.scene,
            this.tileSize,
            x,
            z,
            this.seed
          );

          for (const box of result.solidBoxes) {
            this.solidBoxes.push(box);
          }

          this.loadedTiles.set(key, {
            meshes: result.meshes,
            solidBoxes: result.solidBoxes,
            chunkX: x,
            chunkZ: z,
          });
        }
      }
    }

    for (const [key, tileInfo] of this.loadedTiles) {
      if (!neededKeys.has(key)) {
        this.removeTile(tileInfo);
        this.loadedTiles.delete(key);
      }
    }
  }
}
