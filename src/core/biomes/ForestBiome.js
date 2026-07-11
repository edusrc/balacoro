import { Biome } from "./Biome.js";

export class ForestBiome extends Biome {
  groundColor = 0x355e3b;

  populate(scene, tileSize, chunkX, chunkZ, seed, out, density = 1) {
    const rng = this.createRng(chunkX, chunkZ, seed);

    if (rng.next() < 0.1) {
      const bushCount = rng.int(0, 2);
      for (let i = 0; i < bushCount; i++) {
        if (rng.next() > density) continue;
        const offset = this.randomOffset(rng, tileSize);
        const bush = this.createGroundClutter(scene, tileSize, chunkX, chunkZ, {
          offsetX: offset.x,
          offsetZ: offset.z,
          radius: rng.float(0.3, 0.6),
          color: 0x2e6b34,
        });
        out.meshes.push(bush.mesh);
      }
      return;
    }

    const treeCountRoll = rng.next();
    const treeCount = treeCountRoll < 0.35 ? 1 : treeCountRoll < 0.8 ? 2 : 3;
    for (let i = 0; i < treeCount; i++) {
      if (rng.next() > density) continue;
      const offset = this.randomOffset(rng, tileSize);
      const tree = this.createTree(scene, tileSize, chunkX, chunkZ, {
        offsetX: offset.x,
        offsetZ: offset.z,
        trunkHeight: rng.float(2, 4),
        leavesRadius: rng.float(1, 1.8),
      });
      out.meshes.push(tree.mesh);
      out.solidBoxes.push(tree.solidBox);
    }

    if (rng.next() < 0.3 * density) {
      const offset = this.randomOffset(rng, tileSize);
      const rock = this.createRock(scene, tileSize, chunkX, chunkZ, {
        offsetX: offset.x,
        offsetZ: offset.z,
        radius: rng.float(0.8, 1.6),
        color: 0x5c6354,
      });
      out.meshes.push(rock.mesh);
      out.solidBoxes.push(rock.solidBox);
    }

    const bushRoll = rng.next();
    if (bushRoll < 0.5 * density) {
      const bushCount = bushRoll < 0.25 ? 1 : 2;
      for (let i = 0; i < bushCount; i++) {
        const offset = this.randomOffset(rng, tileSize);
        const bush = this.createGroundClutter(scene, tileSize, chunkX, chunkZ, {
          offsetX: offset.x,
          offsetZ: offset.z,
          radius: rng.float(0.25, 0.5),
          color: 0x2e6b34,
        });
        out.meshes.push(bush.mesh);
      }
    }
  }
}
