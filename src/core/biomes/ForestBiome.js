import * as THREE from "three";
import { Biome } from "./Biome.js";

export class ForestBiome extends Biome {
  createTile(scene, tileSize, chunkX, chunkZ, seed) {
    const ground = this.createGroundTile(
      scene,
      tileSize,
      chunkX,
      chunkZ,
      0x355e3b
    );
    const meshes = [ground];
    const solidBoxes = [];

    const clearingRoll = this.getTileHash(chunkX, chunkZ, seed, 0);
    if (clearingRoll < 0.1) {
      const bushCount = THREE.MathUtils.randInt(0, 2);
      for (let i = 0; i < bushCount; i++) {
        const offset = this.getOffsetWithinTile(chunkX, chunkZ, seed, 60 + i, tileSize);
        const bush = this.createGroundClutter(scene, tileSize, chunkX, chunkZ, {
          offsetX: offset.x,
          offsetZ: offset.z,
          radius: THREE.MathUtils.randFloat(0.3, 0.6),
          color: 0x2e6b34,
        });
        meshes.push(bush.mesh);
      }
      return { meshes, solidBoxes };
    }

    const treeCountRoll = this.getTileHash(chunkX, chunkZ, seed, 1);
    const treeCount = treeCountRoll < 0.35 ? 1 : treeCountRoll < 0.8 ? 2 : 3;
    for (let i = 0; i < treeCount; i++) {
      const offset = this.getOffsetWithinTile(chunkX, chunkZ, seed, 10 + i, tileSize);
      const tree = this.createTree(scene, tileSize, chunkX, chunkZ, {
        offsetX: offset.x,
        offsetZ: offset.z,
        trunkHeight: THREE.MathUtils.randFloat(2, 4),
        leavesRadius: THREE.MathUtils.randFloat(1, 1.8),
      });
      meshes.push(tree.mesh);
      solidBoxes.push(tree.solidBox);
    }

    const rockRoll = this.getTileHash(chunkX, chunkZ, seed, 50);
    if (rockRoll < 0.3) {
      const offset = this.getOffsetWithinTile(chunkX, chunkZ, seed, 51, tileSize);
      const rock = this.createRock(scene, tileSize, chunkX, chunkZ, {
        offsetX: offset.x,
        offsetZ: offset.z,
        radius: THREE.MathUtils.randFloat(0.8, 1.6),
        color: 0x5c6354,
      });
      meshes.push(rock.mesh);
      solidBoxes.push(rock.solidBox);
    }

    const bushRoll = this.getTileHash(chunkX, chunkZ, seed, 80);
    if (bushRoll < 0.5) {
      const bushCount = bushRoll < 0.25 ? 1 : 2;
      for (let i = 0; i < bushCount; i++) {
        const offset = this.getOffsetWithinTile(chunkX, chunkZ, seed, 81 + i, tileSize);
        const bush = this.createGroundClutter(scene, tileSize, chunkX, chunkZ, {
          offsetX: offset.x,
          offsetZ: offset.z,
          radius: THREE.MathUtils.randFloat(0.25, 0.5),
          color: 0x2e6b34,
        });
        meshes.push(bush.mesh);
      }
    }

    return { meshes, solidBoxes };
  }
}
