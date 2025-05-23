import * as THREE from "three";

export class CityTileManager {
  constructor(scene, tileSize = 20) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.loadedTiles = new Map();
    this.solidBoxes = [];
    this.seed = Math.floor(Math.random() * 1000000);
  }

  _tileKey(chunkX, chunkZ) {
    return `${chunkX}_${chunkZ}`;
  }

  getTileType(x, z) {
    if (x % 5 === 0 || z % 5 === 0) {
      return "road";
    }

    const hash = (x * 73856093) ^ (z * 19349663) ^ this.seed;
    const rand = Math.abs(Math.sin(hash) * 10000) % 1;

    if (rand < 0.3) {
      return "building";
    }
    if (rand < 0.6) {
      return "park";
    }
    return "empty";
  }

  createRoadTile(chunkX, chunkZ) {
    const geometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
    const material = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(chunkX * this.tileSize, 0, chunkZ * this.tileSize);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  createParkTile(chunkX, chunkZ) {
    const geometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
    const material = new THREE.MeshStandardMaterial({ color: 0x228b22 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(chunkX * this.tileSize, 0, chunkZ * this.tileSize);
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const tree = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 2, 8),
      new THREE.MeshStandardMaterial({ color: 0x8b4513 })
    );
    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x006400 })
    );

    tree.position.set(0, 1, 0);
    leaves.position.set(0, 2.5, 0);

    const group = new THREE.Group();
    group.add(tree);
    group.add(leaves);
    group.position.set(chunkX * this.tileSize, 0, chunkZ * this.tileSize);
    group.traverse((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });
    const trunkBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(chunkX * this.tileSize, 1, chunkZ * this.tileSize),
      new THREE.Vector3(0.5, 2, 0.5)
    );
    this.solidBoxes.push(trunkBox);
    this.scene.add(group);
    return mesh;
  }

  createBuildingTile(chunkX, chunkZ) {
    const width = THREE.MathUtils.randInt(4, 10);
    const depth = THREE.MathUtils.randInt(4, 10);
    const height = THREE.MathUtils.randInt(10, 40);

    const building = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({ color: 0x999999 })
    );

    building.position.set(
      chunkX * this.tileSize,
      height / 2,
      chunkZ * this.tileSize
    );
    building.castShadow = true;
    building.receiveShadow = true;

    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(this.tileSize, this.tileSize),
      new THREE.MeshStandardMaterial({ color: 0x666666 })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.set(chunkX * this.tileSize, 0, chunkZ * this.tileSize);
    base.receiveShadow = true;

    this.scene.add(base);
    this.scene.add(building);
    const box = new THREE.Box3().setFromObject(building);
    this.solidBoxes.push(box);
    return base;
  }

  isTileSolid(x, z) {
    const key = this._tileKey(x, z);
    return this.solidTiles.has(key);
  }

  isWorldPositionSolid(x, z) {
    const point = new THREE.Vector3(x, 0, z);
    for (const box of this.solidBoxes) {
      if (box.containsPoint(point)) return true;
    }
    return false;
  }

  removeTile(tileInfo) {
    if (!tileInfo || !tileInfo.mesh) return;
    this.scene.remove(tileInfo.mesh);
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
          const type = this.getTileType(x, z);
          let mesh;
          if (type === "road") mesh = this.createRoadTile(x, z);
          else if (type === "building") mesh = this.createBuildingTile(x, z);
          else mesh = this.createParkTile(x, z);

          this.loadedTiles.set(key, { mesh, chunkX: x, chunkZ: z });
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
