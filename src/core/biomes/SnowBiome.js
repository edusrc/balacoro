import { Biome } from "./Biome.js";

export class SnowBiome extends Biome {
  groundColor = 0xeaf6ff;

  populatePOI(scene, tileSize, chunkX, chunkZ, rng, out) {
    if (rng.next() < 0.35) {
      this.populateCampfire(scene, tileSize, chunkX, chunkZ, rng, out);
      return;
    }

    const lakeRadius = rng.float(4, 5.8);
    out.meshes.push(
      this.createIceDisc(scene, tileSize, chunkX, chunkZ, lakeRadius)
    );

    for (let i = 0; i < 2; i++) {
      const angle = rng.float(0, Math.PI * 2);
      const distance = lakeRadius + rng.float(0.8, 1.8);
      const iceRock = this.createIceRock(scene, tileSize, chunkX, chunkZ, {
        offsetX: Math.cos(angle) * distance,
        offsetZ: Math.sin(angle) * distance,
        radius: rng.float(0.7, 1.2),
      });
      out.meshes.push(iceRock.mesh);
      out.solidBoxes.push(iceRock.solidBox);
    }
  }

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
