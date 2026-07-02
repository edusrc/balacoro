import * as THREE from "three";
import { Biome } from "./Biome.js";

export class SnowBiome extends Biome {
  createTile(scene, tileSize, chunkX, chunkZ, seed) {
    const ground = this.createGroundTile(
      scene,
      tileSize,
      chunkX,
      chunkZ,
      0xeaf6ff
    );
    const meshes = [ground];
    const solidBoxes = [];

    const treeCountRoll = this.getTileHash(chunkX, chunkZ, seed, 0);
    if (treeCountRoll < 0.55) {
      const treeCount = treeCountRoll < 0.3 ? 1 : 2;
      for (let i = 0; i < treeCount; i++) {
        const offset = this.getOffsetWithinTile(chunkX, chunkZ, seed, 10 + i, tileSize);
        const tree = this.createPineTree(scene, tileSize, chunkX, chunkZ, {
          offsetX: offset.x,
          offsetZ: offset.z,
          trunkHeight: THREE.MathUtils.randFloat(1.2, 1.8),
          leavesHeight: THREE.MathUtils.randFloat(2.5, 3.5),
          leavesRadius: THREE.MathUtils.randFloat(0.9, 1.4),
        });
        meshes.push(tree.mesh);
        solidBoxes.push(tree.solidBox);
      }
    }

    const iceRockRoll = this.getTileHash(chunkX, chunkZ, seed, 50);
    if (iceRockRoll < 0.3) {
      const offset = this.getOffsetWithinTile(chunkX, chunkZ, seed, 51, tileSize);
      const iceRock = this.createIceRock(scene, tileSize, chunkX, chunkZ, {
        offsetX: offset.x,
        offsetZ: offset.z,
        radius: THREE.MathUtils.randFloat(0.7, 1.4),
      });
      meshes.push(iceRock.mesh);
      solidBoxes.push(iceRock.solidBox);
    }

    const snowDriftRoll = this.getTileHash(chunkX, chunkZ, seed, 80);
    if (snowDriftRoll < 0.4) {
      const driftCount = snowDriftRoll < 0.2 ? 1 : 2;
      for (let i = 0; i < driftCount; i++) {
        const offset = this.getOffsetWithinTile(chunkX, chunkZ, seed, 81 + i, tileSize);
        const drift = this.createSnowDrift(scene, tileSize, chunkX, chunkZ, offset);
        meshes.push(drift.mesh);
        solidBoxes.push(drift.solidBox);
      }
    }

    return { meshes, solidBoxes };
  }

  createSnowDrift(scene, tileSize, chunkX, chunkZ, offset = { x: 0, z: 0 }) {
    const radius = THREE.MathUtils.randFloat(0.8, 1.8);
    const centerX = chunkX * tileSize + offset.x;
    const centerZ = chunkZ * tileSize + offset.z;
    const drift = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    drift.position.set(centerX, 0, centerZ);
    drift.receiveShadow = true;
    scene.add(drift);

    const solidBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(centerX, radius * 0.3, centerZ),
      new THREE.Vector3(radius * 1.2, radius * 0.6, radius * 1.2)
    );

    return { mesh: drift, solidBox };
  }
}
