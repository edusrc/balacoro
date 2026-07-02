import * as THREE from "three";
import { Biome } from "./Biome.js";

export class DesertBiome extends Biome {
  createTile(scene, tileSize, chunkX, chunkZ, seed) {
    const ground = this.createGroundTile(
      scene,
      tileSize,
      chunkX,
      chunkZ,
      0xe0c280
    );
    const meshes = [ground];
    const solidBoxes = [];

    const cactusRoll = this.getTileHash(chunkX, chunkZ, seed, 0);
    if (cactusRoll < 0.3) {
      const cactusCount = cactusRoll < 0.15 ? 1 : 2;
      for (let i = 0; i < cactusCount; i++) {
        const offset = this.getOffsetWithinTile(chunkX, chunkZ, seed, 10 + i, tileSize);
        const cactus = this.createCactus(scene, tileSize, chunkX, chunkZ, offset);
        meshes.push(cactus.mesh);
        solidBoxes.push(cactus.solidBox);
      }
    }

    const rockRoll = this.getTileHash(chunkX, chunkZ, seed, 50);
    if (rockRoll < 0.25) {
      const offset = this.getOffsetWithinTile(chunkX, chunkZ, seed, 51, tileSize);
      const rock = this.createRock(scene, tileSize, chunkX, chunkZ, {
        offsetX: offset.x,
        offsetZ: offset.z,
        radius: THREE.MathUtils.randFloat(1, 2),
        color: 0x8b7355,
      });
      meshes.push(rock.mesh);
      solidBoxes.push(rock.solidBox);
    }

    const duneRoll = this.getTileHash(chunkX, chunkZ, seed, 70);
    if (duneRoll < 0.4) {
      const duneCount = duneRoll < 0.2 ? 1 : 2;
      for (let i = 0; i < duneCount; i++) {
        const offset = this.getOffsetWithinTile(chunkX, chunkZ, seed, 71 + i, tileSize);
        const dune = this.createDune(scene, tileSize, chunkX, chunkZ, offset);
        meshes.push(dune.mesh);
        solidBoxes.push(dune.solidBox);
      }
    }

    const driedBushRoll = this.getTileHash(chunkX, chunkZ, seed, 90);
    if (driedBushRoll < 0.2) {
      const offset = this.getOffsetWithinTile(chunkX, chunkZ, seed, 91, tileSize);
      const bush = this.createGroundClutter(scene, tileSize, chunkX, chunkZ, {
        offsetX: offset.x,
        offsetZ: offset.z,
        radius: THREE.MathUtils.randFloat(0.25, 0.45),
        color: 0x9b7e4a,
      });
      meshes.push(bush.mesh);
    }

    return { meshes, solidBoxes };
  }

  createCactus(scene, tileSize, chunkX, chunkZ, offset = { x: 0, z: 0 }) {
    const height = THREE.MathUtils.randFloat(1.5, 3);
    const centerX = chunkX * tileSize + offset.x;
    const centerZ = chunkZ * tileSize + offset.z;
    const cactus = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, height, 8),
      new THREE.MeshStandardMaterial({ color: 0x2e8b57 })
    );
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

  createDune(scene, tileSize, chunkX, chunkZ, offset = { x: 0, z: 0 }) {
    const radius = THREE.MathUtils.randFloat(1, 2.2);
    const centerX = chunkX * tileSize + offset.x;
    const centerZ = chunkZ * tileSize + offset.z;
    const dune = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xd9b86c })
    );
    dune.position.set(centerX, 0, centerZ);
    dune.receiveShadow = true;
    scene.add(dune);

    const solidBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(centerX, radius * 0.3, centerZ),
      new THREE.Vector3(radius * 1.2, radius * 0.6, radius * 1.2)
    );

    return { mesh: dune, solidBox };
  }
}
