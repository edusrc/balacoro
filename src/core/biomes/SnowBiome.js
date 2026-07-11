import { Biome } from "./Biome.js";

export class SnowBiome extends Biome {
  groundColor = 0xeaf6ff;

  populate(scene, tileSize, chunkX, chunkZ, seed, out, density = 1) {
    const rng = this.createRng(chunkX, chunkZ, seed);

    const treeCountRoll = rng.next();
    if (treeCountRoll < 0.55 * density) {
      const treeCount = treeCountRoll < 0.3 ? 1 : 2;
      for (let i = 0; i < treeCount; i++) {
        const offset = this.randomOffset(rng, tileSize);
        const tree = this.createPineTree(scene, tileSize, chunkX, chunkZ, {
          offsetX: offset.x,
          offsetZ: offset.z,
          trunkHeight: rng.float(1.2, 1.8),
          leavesHeight: rng.float(2.5, 3.5),
          leavesRadius: rng.float(0.9, 1.4),
        });
        out.meshes.push(tree.mesh);
        out.solidBoxes.push(tree.solidBox);
      }
    }

    if (rng.next() < 0.3 * density) {
      const offset = this.randomOffset(rng, tileSize);
      const iceRock = this.createIceRock(scene, tileSize, chunkX, chunkZ, {
        offsetX: offset.x,
        offsetZ: offset.z,
        radius: rng.float(0.7, 1.4),
      });
      out.meshes.push(iceRock.mesh);
      out.solidBoxes.push(iceRock.solidBox);
    }

    const snowDriftRoll = rng.next();
    if (snowDriftRoll < 0.4 * density) {
      const driftCount = snowDriftRoll < 0.2 ? 1 : 2;
      for (let i = 0; i < driftCount; i++) {
        const offset = this.randomOffset(rng, tileSize);
        const drift = this.createHalfDome(scene, tileSize, chunkX, chunkZ, {
          offsetX: offset.x,
          offsetZ: offset.z,
          radius: rng.float(0.8, 1.8),
          color: 0xffffff,
        });
        out.meshes.push(drift.mesh);
        out.solidBoxes.push(drift.solidBox);
      }
    }
  }
}
