import * as THREE from "three";

export class TileManager {
  constructor(scene, tileSize = 20) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.loadedTiles = new Map();

    const loader = new THREE.TextureLoader();
    this.floorTexture = loader.load(
      "assets/imgs/floor.png",
      () => console.log("Textura carregada com sucesso!"),
      undefined,
      (err) => console.error("Erro ao carregar floor.png =>", err)
    );

    this.floorTexture.wrapS = THREE.RepeatWrapping;
    this.floorTexture.wrapT = THREE.RepeatWrapping;
    this.floorTexture.repeat.set(1, 1);
  }

  _tileKey(chunkX, chunkZ) {
    return `${chunkX}_${chunkZ}`;
  }

  createTile(chunkX, chunkZ) {
    const geometry = new THREE.PlaneGeometry(this.tileSize, this.tileSize);

    const material = new THREE.MeshBasicMaterial({
      map: this.floorTexture,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    const worldX = chunkX * this.tileSize;
    const worldZ = chunkZ * this.tileSize;
    mesh.position.set(worldX, 0, worldZ);
    this.scene.add(mesh);
    return mesh;
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
          const mesh = this.createTile(x, z);
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
