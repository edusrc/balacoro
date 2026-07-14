import * as THREE from "three";
import { fractalNoise2D, createTileRng } from "./WorldNoise.js";
import { CityBiome } from "./biomes/CityBiome.js";
import { ForestBiome } from "./biomes/ForestBiome.js";
import { DesertBiome } from "./biomes/DesertBiome.js";
import { SnowBiome } from "./biomes/SnowBiome.js";

const CITY_SIZE_IN_CHUNKS = 6;
const CITY_REGION_SIZE = 24;
const CITY_CHANCE = 0.4;
const BIOME_NOISE_FREQUENCY = 0.06;
const SNOW_MAX = 0.42;
const FOREST_MAX = 0.58;
const TRANSITION_BAND = 0.08;

export class WorldTileManager {
  constructor(scene, tileSize = 20, seed = Math.floor(Math.random() * 1000000)) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.loadedTiles = new Map();
    this.seed = seed;

    this.biomes = {
      city: new CityBiome(),
      forest: new ForestBiome(),
      desert: new DesertBiome(),
      snow: new SnowBiome(),
    };

    this._scratchPoint = new THREE.Vector3();
    this._scratchColorA = new THREE.Color();
    this._scratchColorB = new THREE.Color();
    this._cityRectCache = new Map();
  }

  _getCityRect(regionX, regionZ) {
    const key = `${regionX}_${regionZ}`;
    if (this._cityRectCache.has(key)) {
      return this._cityRectCache.get(key);
    }

    const rng = createTileRng(regionX, regionZ, this.seed ^ 0xc17e);
    let rect = null;
    if (rng.next() < CITY_CHANCE) {
      const maxOffset = CITY_REGION_SIZE - CITY_SIZE_IN_CHUNKS;
      const minX = regionX * CITY_REGION_SIZE + rng.int(0, maxOffset);
      const minZ = regionZ * CITY_REGION_SIZE + rng.int(0, maxOffset);
      rect = {
        minX,
        minZ,
        maxX: minX + CITY_SIZE_IN_CHUNKS,
        maxZ: minZ + CITY_SIZE_IN_CHUNKS,
      };
    }
    this._cityRectCache.set(key, rect);
    return rect;
  }

  _isCityChunk(chunkX, chunkZ) {
    const regionX = Math.floor(chunkX / CITY_REGION_SIZE);
    const regionZ = Math.floor(chunkZ / CITY_REGION_SIZE);
    const rect = this._getCityRect(regionX, regionZ);
    return (
      rect !== null &&
      chunkX >= rect.minX &&
      chunkX < rect.maxX &&
      chunkZ >= rect.minZ &&
      chunkZ < rect.maxZ
    );
  }

  _tileKey(chunkX, chunkZ) {
    return `${chunkX}_${chunkZ}`;
  }

  _worldToChunk(value) {
    return Math.floor((value + this.tileSize / 2) / this.tileSize);
  }

  getBiomeSample(chunkX, chunkZ) {
    if (this._isCityChunk(chunkX, chunkZ)) {
      return { primary: "city", secondary: null, blend: 0 };
    }

    const value = fractalNoise2D(
      chunkX * BIOME_NOISE_FREQUENCY,
      chunkZ * BIOME_NOISE_FREQUENCY,
      this.seed
    );

    let primary;
    let secondary;
    let distance;

    if (value < SNOW_MAX) {
      primary = "snow";
      secondary = "forest";
      distance = SNOW_MAX - value;
    } else if (value < FOREST_MAX) {
      primary = "forest";
      const distanceToSnow = value - SNOW_MAX;
      const distanceToDesert = FOREST_MAX - value;
      if (distanceToSnow < distanceToDesert) {
        secondary = "snow";
        distance = distanceToSnow;
      } else {
        secondary = "desert";
        distance = distanceToDesert;
      }
    } else {
      primary = "desert";
      secondary = "forest";
      distance = value - FOREST_MAX;
    }

    if (distance >= TRANSITION_BAND) {
      return { primary, secondary: null, blend: 0 };
    }

    const blend =
      Math.round((0.5 * (1 - distance / TRANSITION_BAND)) * 10) / 10;
    if (blend === 0) {
      return { primary, secondary: null, blend: 0 };
    }
    return { primary, secondary, blend };
  }

  getBiomeNameForChunk(chunkX, chunkZ) {
    return this.getBiomeSample(chunkX, chunkZ).primary;
  }

  createTile(chunkX, chunkZ) {
    const sample = this.getBiomeSample(chunkX, chunkZ);

    if (sample.primary === "city") {
      return this.biomes.city.createTile(
        this.scene,
        this.tileSize,
        chunkX,
        chunkZ,
        this.seed
      );
    }

    const primary = this.biomes[sample.primary];
    let groundColor = primary.groundColor;

    if (sample.secondary) {
      groundColor = this._scratchColorA
        .set(primary.groundColor)
        .lerp(
          this._scratchColorB.set(this.biomes[sample.secondary].groundColor),
          sample.blend
        )
        .getHex();
    }

    const out = { meshes: [], solidBoxes: [] };
    out.meshes.push(
      primary.createPatchyGroundTile(
        this.scene,
        this.tileSize,
        chunkX,
        chunkZ,
        groundColor,
        this.seed
      )
    );

    if (chunkX === 0 && chunkZ === 0) {
      return out;
    }

    if (!sample.secondary) {
      const poiRng = primary.createRng(chunkX, chunkZ, this.seed ^ 0x90d1);
      const poiRoll = poiRng.next();
      if (poiRoll < 0.006) {
        primary.populateVillage(
          this.scene,
          this.tileSize,
          chunkX,
          chunkZ,
          poiRng,
          out
        );
        return out;
      }
      if (poiRoll < 0.02) {
        primary.populatePOI(
          this.scene,
          this.tileSize,
          chunkX,
          chunkZ,
          poiRng,
          out
        );
        return out;
      }
    }

    const clump = fractalNoise2D(
      chunkX * 0.13,
      chunkZ * 0.13,
      this.seed ^ 0x7e55
    );
    const clumpFactor = 0.15 + clump * 1.7;

    primary.populate(
      this.scene,
      this.tileSize,
      chunkX,
      chunkZ,
      this.seed,
      out,
      Math.min((1 - sample.blend) * clumpFactor, 1.4)
    );

    if (sample.secondary) {
      this.biomes[sample.secondary].populate(
        this.scene,
        this.tileSize,
        chunkX,
        chunkZ,
        this.seed ^ 0x5bd1e995,
        out,
        Math.min(sample.blend * clumpFactor, 1.4)
      );
    }

    return out;
  }

  getBiomeNameAt(x, z) {
    return this.getBiomeSample(this._worldToChunk(x), this._worldToChunk(z))
      .primary;
  }

  isWorldPositionSolid(x, z) {
    const point = this._scratchPoint.set(x, 0, z);
    const chunkX = this._worldToChunk(x);
    const chunkZ = this._worldToChunk(z);

    for (let cx = chunkX - 1; cx <= chunkX + 1; cx++) {
      for (let cz = chunkZ - 1; cz <= chunkZ + 1; cz++) {
        const tile = this.loadedTiles.get(this._tileKey(cx, cz));
        if (!tile) continue;
        for (const box of tile.solidBoxes) {
          if (box.containsPoint(point)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  intersectsSolid(box) {
    const minChunkX = this._worldToChunk(box.min.x) - 1;
    const maxChunkX = this._worldToChunk(box.max.x) + 1;
    const minChunkZ = this._worldToChunk(box.min.z) - 1;
    const maxChunkZ = this._worldToChunk(box.max.z) + 1;

    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
      for (let cz = minChunkZ; cz <= maxChunkZ; cz++) {
        const tile = this.loadedTiles.get(this._tileKey(cx, cz));
        if (!tile) continue;
        for (const solidBox of tile.solidBoxes) {
          if (solidBox.intersectsBox(box)) {
            return true;
          }
        }
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
      if (mesh.isInstancedMesh) {
        mesh.dispose();
      } else if (mesh.userData.disposeGeometry) {
        mesh.geometry.dispose();
      }
    }
  }

  update(playerX, playerZ) {
    const chunkX = this._worldToChunk(playerX);
    const chunkZ = this._worldToChunk(playerZ);
    const neededKeys = new Set();

    for (let x = chunkX - 4; x <= chunkX + 4; x++) {
      for (let z = chunkZ - 3; z <= chunkZ + 3; z++) {
        const key = this._tileKey(x, z);
        neededKeys.add(key);

        if (!this.loadedTiles.has(key)) {
          const result = this.createTile(x, z);
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
