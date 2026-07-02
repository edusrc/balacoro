import * as THREE from "three";
import { Biome } from "./Biome.js";

export class CityBiome extends Biome {
  createTile(scene, tileSize, chunkX, chunkZ, seed) {
    if (chunkX % 5 === 0 || chunkZ % 5 === 0) {
      return this.createRoadTile(scene, tileSize, chunkX, chunkZ);
    }

    const roll = this.getTileHash(chunkX, chunkZ, seed);

    if (roll < 0.18) {
      return this.createBuildingTile(scene, tileSize, chunkX, chunkZ);
    }
    if (roll < 0.36) {
      return this.createHouseTile(scene, tileSize, chunkX, chunkZ);
    }
    if (roll < 0.5) {
      return this.createShopTile(scene, tileSize, chunkX, chunkZ);
    }
    if (roll < 0.8) {
      return this.createParkTile(scene, tileSize, chunkX, chunkZ);
    }
    return this.createEmptyTile(scene, tileSize, chunkX, chunkZ);
  }

  createRoadTile(scene, tileSize, chunkX, chunkZ) {
    const ground = this.createGroundTile(
      scene,
      tileSize,
      chunkX,
      chunkZ,
      0x333333
    );
    return { meshes: [ground], solidBoxes: [] };
  }

  createEmptyTile(scene, tileSize, chunkX, chunkZ) {
    const ground = this.createGroundTile(
      scene,
      tileSize,
      chunkX,
      chunkZ,
      0x556b2f
    );
    return { meshes: [ground], solidBoxes: [] };
  }

  createParkTile(scene, tileSize, chunkX, chunkZ) {
    const ground = this.createGroundTile(
      scene,
      tileSize,
      chunkX,
      chunkZ,
      0x228b22
    );
    const tree = this.createTree(scene, tileSize, chunkX, chunkZ);
    return { meshes: [ground, tree.mesh], solidBoxes: [tree.solidBox] };
  }

  createBuildingTile(scene, tileSize, chunkX, chunkZ) {
    const ground = this.createGroundTile(
      scene,
      tileSize,
      chunkX,
      chunkZ,
      0x666666
    );
    const width = THREE.MathUtils.randInt(4, 10);
    const depth = THREE.MathUtils.randInt(4, 10);
    const height = THREE.MathUtils.randInt(10, 40);

    const structure = this.createBoxStructure(scene, tileSize, chunkX, chunkZ, {
      width,
      height,
      depth,
      color: 0x999999,
    });

    return {
      meshes: [ground, structure.mesh],
      solidBoxes: [structure.solidBox],
    };
  }

  createHouseTile(scene, tileSize, chunkX, chunkZ) {
    const ground = this.createGroundTile(
      scene,
      tileSize,
      chunkX,
      chunkZ,
      0x6b8e23
    );
    const width = THREE.MathUtils.randInt(5, 8);
    const depth = THREE.MathUtils.randInt(5, 8);
    const height = THREE.MathUtils.randInt(4, 6);

    const structure = this.createBoxStructure(scene, tileSize, chunkX, chunkZ, {
      width,
      height,
      depth,
      color: 0xc97b4a,
    });

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(width, depth) * 0.75, 2.5, 4),
      new THREE.MeshStandardMaterial({ color: 0x7a3b2e })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.set(chunkX * tileSize, height + 1.25, chunkZ * tileSize);
    roof.castShadow = true;
    scene.add(roof);

    return {
      meshes: [ground, structure.mesh, roof],
      solidBoxes: [structure.solidBox],
    };
  }

  createShopTile(scene, tileSize, chunkX, chunkZ) {
    const ground = this.createGroundTile(
      scene,
      tileSize,
      chunkX,
      chunkZ,
      0x808080
    );
    const width = THREE.MathUtils.randInt(6, 10);
    const depth = THREE.MathUtils.randInt(6, 10);
    const height = THREE.MathUtils.randInt(3, 5);

    const structure = this.createBoxStructure(scene, tileSize, chunkX, chunkZ, {
      width,
      height,
      depth,
      color: 0x4a90d9,
    });

    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.4, 0.3, depth + 0.4),
      new THREE.MeshStandardMaterial({ color: 0xffcc00 })
    );
    awning.position.set(chunkX * tileSize, height + 0.15, chunkZ * tileSize);
    awning.castShadow = true;
    scene.add(awning);

    return {
      meshes: [ground, structure.mesh, awning],
      solidBoxes: [structure.solidBox],
    };
  }
}
