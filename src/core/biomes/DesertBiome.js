import * as THREE from "three";
import { Biome } from "./Biome.js";

export class DesertBiome extends Biome {
  groundColor = 0xe0c280;

  populatePOI(scene, tileSize, chunkX, chunkZ, rng, out) {
    const waterRadius = rng.float(3.8, 5.2);
    out.meshes.push(
      this.createWaterDisc(scene, tileSize, chunkX, chunkZ, waterRadius)
    );

    const palmCount = 2 + rng.int(0, 1);
    for (let i = 0; i < palmCount; i++) {
      const angle = rng.float(0, Math.PI * 2);
      const distance = waterRadius + rng.float(1, 2);
      const palm = this.createTree(scene, tileSize, chunkX, chunkZ, {
        trunkColor: 0x9a7648,
        leavesColor: 0x2e9e46,
        trunkHeight: rng.float(3, 4.2),
        leavesRadius: rng.float(1.1, 1.5),
        offsetX: Math.cos(angle) * distance,
        offsetZ: Math.sin(angle) * distance,
      });
      out.meshes.push(palm.mesh);
      out.solidBoxes.push(palm.solidBox);
    }

    for (let i = 0; i < 3; i++) {
      const angle = rng.float(0, Math.PI * 2);
      const distance = waterRadius + rng.float(0.5, 1.5);
      const bush = this.createGroundClutter(scene, tileSize, chunkX, chunkZ, {
        offsetX: Math.cos(angle) * distance,
        offsetZ: Math.sin(angle) * distance,
        radius: rng.float(0.3, 0.5),
        color: 0x3f9e4d,
      });
      out.meshes.push(bush.mesh);
    }
  }

  populate(scene, tileSize, chunkX, chunkZ, seed, out, density = 1) {
    const rng = this.createRng(chunkX, chunkZ, seed);

    const cactusRoll = rng.next();
    if (cactusRoll < 0.3 * density) {
      const cactusCount = cactusRoll < 0.15 ? 1 : 2;
      for (let i = 0; i < cactusCount; i++) {
        const offset = this.randomOffset(rng, tileSize);
        const cactus = this.createCactus(scene, tileSize, chunkX, chunkZ, {
          offsetX: offset.x,
          offsetZ: offset.z,
          height: rng.float(1.5, 3),
        });
        out.meshes.push(cactus.mesh);
        out.solidBoxes.push(cactus.solidBox);
      }
    }

    if (rng.next() < 0.25 * density) {
      const offset = this.randomOffset(rng, tileSize);
      const rock = this.createRock(scene, tileSize, chunkX, chunkZ, {
        offsetX: offset.x,
        offsetZ: offset.z,
        radius: rng.float(1, 2),
        color: 0x8b7355,
      });
      out.meshes.push(rock.mesh);
      out.solidBoxes.push(rock.solidBox);
    }

    const duneRoll = rng.next();
    if (duneRoll < 0.4 * density) {
      const duneCount = duneRoll < 0.2 ? 1 : 2;
      for (let i = 0; i < duneCount; i++) {
        const offset = this.randomOffset(rng, tileSize);
        const dune = this.createHalfDome(scene, tileSize, chunkX, chunkZ, {
          offsetX: offset.x,
          offsetZ: offset.z,
          radius: rng.float(1, 2.2),
          color: 0xd9b86c,
        });
        out.meshes.push(dune.mesh);
        out.solidBoxes.push(dune.solidBox);
      }
    }

    if (rng.next() < 0.2 * density) {
      const offset = this.randomOffset(rng, tileSize);
      const bush = this.createGroundClutter(scene, tileSize, chunkX, chunkZ, {
        offsetX: offset.x,
        offsetZ: offset.z,
        radius: rng.float(0.25, 0.45),
        color: 0x9b7e4a,
      });
      out.meshes.push(bush.mesh);
    }
  }

  createCactus(scene, tileSize, chunkX, chunkZ, options = {}) {
    const height = options.height ?? 2;
    const offsetX = options.offsetX ?? 0;
    const offsetZ = options.offsetZ ?? 0;
    const centerX = chunkX * tileSize + offsetX;
    const centerZ = chunkZ * tileSize + offsetZ;

    const cactus = new THREE.Mesh(
      this.sharedGeometry("cylinder8", () =>
        new THREE.CylinderGeometry(1, 1, 1, 8)
      ),
      this.colorMaterial(0x2e8b57)
    );
    cactus.scale.set(0.3, height, 0.3);
    cactus.position.set(centerX, height / 2, centerZ);
    cactus.castShadow = true;
    cactus.receiveShadow = true;
    scene.add(cactus);

    const solidBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(centerX, height / 2, centerZ),
      new THREE.Vector3(0.6, height, 0.6)
    );

    return { mesh: cactus, solidBox };
  }
}
