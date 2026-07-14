import * as THREE from "three";
import { Biome } from "./Biome.js";

const windowGeometry = new THREE.PlaneGeometry(0.7, 0.9);
const stripeGeometry = new THREE.PlaneGeometry(0.35, 1.8);
const windowLitMaterial = new THREE.MeshBasicMaterial({ color: 0xffe9a0 });
const windowDarkMaterial = new THREE.MeshStandardMaterial({ color: 0x18202c });
const stripeMaterial = new THREE.MeshBasicMaterial({ color: 0xdddddd });
const lampBulbMaterial = new THREE.MeshBasicMaterial({ color: 0xfff0b0 });

const WINDOW_LIT_CHANCE = 0.35;

function mod5(value) {
  return ((value % 5) + 5) % 5;
}

export class CityBiome extends Biome {
  groundColor = 0x556b2f;

  _roadFlags(chunkX, chunkZ, seed) {
    const phaseX = seed % 5;
    const phaseZ = Math.floor(seed / 7) % 5;
    return {
      vertical: mod5(chunkX + phaseX) === 0,
      horizontal: mod5(chunkZ + phaseZ) === 0,
      alongVertical: mod5(chunkZ + phaseZ),
      alongHorizontal: mod5(chunkX + phaseX),
    };
  }

  createTile(scene, tileSize, chunkX, chunkZ, seed) {
    const road = this._roadFlags(chunkX, chunkZ, seed);
    if (road.vertical || road.horizontal) {
      return this.createRoadTile(scene, tileSize, chunkX, chunkZ, seed);
    }

    if (chunkX === 0 && chunkZ === 0) {
      return this.createEmptyTile(scene, tileSize, chunkX, chunkZ);
    }

    const rng = this.createRng(chunkX, chunkZ, seed);
    const roll = rng.next();

    if (roll < 0.18) {
      return this.createBuildingTile(scene, tileSize, chunkX, chunkZ, rng);
    }
    if (roll < 0.36) {
      return this.createHouseTile(scene, tileSize, chunkX, chunkZ, rng);
    }
    if (roll < 0.5) {
      return this.createShopTile(scene, tileSize, chunkX, chunkZ, rng);
    }
    if (roll < 0.8) {
      return this.createParkTile(scene, tileSize, chunkX, chunkZ);
    }
    return this.createEmptyTile(scene, tileSize, chunkX, chunkZ);
  }

  createRoadTile(scene, tileSize, chunkX, chunkZ, seed) {
    const ground = this.createGroundTile(
      scene,
      tileSize,
      chunkX,
      chunkZ,
      0x333333
    );
    const meshes = [ground];
    const rng = this.createRng(chunkX, chunkZ, seed);

    const centerX = chunkX * tileSize;
    const centerZ = chunkZ * tileSize;
    const { vertical, horizontal, alongVertical, alongHorizontal } =
      this._roadFlags(chunkX, chunkZ, seed);

    if (vertical !== horizontal) {
      for (let i = 0; i < 4; i++) {
        const offset = -tileSize / 2 + (i + 0.5) * (tileSize / 4);
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.rotation.set(-Math.PI / 2, 0, horizontal ? Math.PI / 2 : 0);
        if (vertical) {
          stripe.position.set(centerX, 0.02, centerZ + offset);
        } else {
          stripe.position.set(centerX + offset, 0.02, centerZ);
        }
        scene.add(stripe);
        meshes.push(stripe);
      }
    }

    const solidBoxes = [];

    const edge = tileSize / 2 - 0.6;
    const LAMP_CHANCE = 0.7;
    if (vertical && horizontal) {
      for (const sideX of [-1, 1]) {
        for (const sideZ of [-1, 1]) {
          if (rng.next() > LAMP_CHANCE) continue;
          this._addLampPost(
            scene,
            centerX + sideX * edge,
            centerZ + sideZ * edge,
            meshes,
            solidBoxes
          );
        }
      }
    } else {
      const positionInSegment = vertical ? alongVertical : alongHorizontal;
      if (positionInSegment === 2 || positionInSegment === 3) {
        for (const side of [-1, 1]) {
          if (rng.next() > LAMP_CHANCE) continue;
          if (vertical) {
            this._addLampPost(
              scene,
              centerX + side * edge,
              centerZ,
              meshes,
              solidBoxes
            );
          } else {
            this._addLampPost(
              scene,
              centerX,
              centerZ + side * edge,
              meshes,
              solidBoxes
            );
          }
        }
      }
    }

    return { meshes, solidBoxes };
  }

  _addLampPost(scene, x, z, meshes, solidBoxes) {
    const pole = new THREE.Mesh(
      this.sharedGeometry("cylinder8", () =>
        new THREE.CylinderGeometry(1, 1, 1, 8)
      ),
      this.colorMaterial(0x2b2b2b)
    );
    pole.scale.set(0.08, 4, 0.08);
    pole.position.set(x, 2, z);
    pole.castShadow = true;
    scene.add(pole);
    meshes.push(pole);

    const bulb = new THREE.Mesh(
      this.sharedGeometry("sphere8", () => new THREE.SphereGeometry(1, 8, 8)),
      lampBulbMaterial
    );
    bulb.scale.setScalar(0.3);
    bulb.position.set(x, 4.15, z);
    scene.add(bulb);
    meshes.push(bulb);

    solidBoxes.push(
      new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(x, 2, z),
        new THREE.Vector3(0.5, 4, 0.5)
      )
    );
  }

  _addWindows(scene, chunkX, chunkZ, tileSize, rng, dims, meshes) {
    const { width, depth, height } = dims;
    const centerX = chunkX * tileSize;
    const centerZ = chunkZ * tileSize;

    const litMatrices = [];
    const darkMatrices = [];
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const euler = new THREE.Euler();

    const faces = [
      { axis: "z", dir: 1, faceWidth: width, rotY: 0 },
      { axis: "z", dir: -1, faceWidth: width, rotY: Math.PI },
      { axis: "x", dir: 1, faceWidth: depth, rotY: Math.PI / 2 },
      { axis: "x", dir: -1, faceWidth: depth, rotY: -Math.PI / 2 },
    ];

    const rows = Math.min(Math.max(Math.floor((height - 2) / 3), 1), 8);

    for (const face of faces) {
      const cols = Math.max(Math.floor(face.faceWidth / 2.5), 1);
      quaternion.setFromEuler(euler.set(0, face.rotY, 0));

      for (let row = 0; row < rows; row++) {
        const y = height * ((row + 1) / (rows + 1));
        for (let col = 0; col < cols; col++) {
          const along =
            face.faceWidth * ((col + 1) / (cols + 1)) - face.faceWidth / 2;
          if (face.axis === "z") {
            position.set(
              centerX + along,
              y,
              centerZ + face.dir * (depth / 2 + 0.02)
            );
          } else {
            position.set(
              centerX + face.dir * (width / 2 + 0.02),
              y,
              centerZ + along
            );
          }
          const matrix = new THREE.Matrix4().compose(
            position,
            quaternion,
            scale
          );
          if (rng.next() < WINDOW_LIT_CHANCE) {
            litMatrices.push(matrix);
          } else {
            darkMatrices.push(matrix);
          }
        }
      }
    }

    for (const [matrices, material] of [
      [litMatrices, windowLitMaterial],
      [darkMatrices, windowDarkMaterial],
    ]) {
      if (matrices.length === 0) continue;
      const instanced = new THREE.InstancedMesh(
        windowGeometry,
        material,
        matrices.length
      );
      for (let i = 0; i < matrices.length; i++) {
        instanced.setMatrixAt(i, matrices[i]);
      }
      instanced.instanceMatrix.needsUpdate = true;
      scene.add(instanced);
      meshes.push(instanced);
    }
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

  createBuildingTile(scene, tileSize, chunkX, chunkZ, rng) {
    const ground = this.createGroundTile(
      scene,
      tileSize,
      chunkX,
      chunkZ,
      0x666666
    );
    const width = rng.int(4, 10);
    const depth = rng.int(4, 10);
    const height = rng.int(10, 40);

    const structure = this.createBoxStructure(scene, tileSize, chunkX, chunkZ, {
      width,
      height,
      depth,
      color: 0x999999,
    });

    const meshes = [ground, structure.mesh];
    this._addWindows(
      scene,
      chunkX,
      chunkZ,
      tileSize,
      rng,
      { width, depth, height },
      meshes
    );

    return {
      meshes,
      solidBoxes: [structure.solidBox],
    };
  }

  createHouseTile(scene, tileSize, chunkX, chunkZ, rng) {
    const ground = this.createGroundTile(
      scene,
      tileSize,
      chunkX,
      chunkZ,
      0x6b8e23
    );
    const width = rng.int(5, 8);
    const depth = rng.int(5, 8);
    const height = rng.int(4, 6);

    const structure = this.createBoxStructure(scene, tileSize, chunkX, chunkZ, {
      width,
      height,
      depth,
      color: 0xc97b4a,
    });

    const roofRadius = Math.max(width, depth) * 0.75;
    const roof = new THREE.Mesh(
      this.sharedGeometry("cone4", () => new THREE.ConeGeometry(1, 1, 4)),
      this.colorMaterial(0x7a3b2e)
    );
    roof.scale.set(roofRadius, 2.5, roofRadius);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(chunkX * tileSize, height + 1.25, chunkZ * tileSize);
    roof.castShadow = true;
    scene.add(roof);

    const meshes = [ground, structure.mesh, roof];
    this._addWindows(
      scene,
      chunkX,
      chunkZ,
      tileSize,
      rng,
      { width, depth, height },
      meshes
    );

    return {
      meshes,
      solidBoxes: [structure.solidBox],
    };
  }

  createShopTile(scene, tileSize, chunkX, chunkZ, rng) {
    const ground = this.createGroundTile(
      scene,
      tileSize,
      chunkX,
      chunkZ,
      0x808080
    );
    const width = rng.int(6, 10);
    const depth = rng.int(6, 10);
    const height = rng.int(3, 5);

    const structure = this.createBoxStructure(scene, tileSize, chunkX, chunkZ, {
      width,
      height,
      depth,
      color: 0x4a90d9,
    });

    const awning = new THREE.Mesh(
      this.sharedGeometry("box", () => new THREE.BoxGeometry(1, 1, 1)),
      this.colorMaterial(0xffcc00)
    );
    awning.scale.set(width + 0.4, 0.3, depth + 0.4);
    awning.position.set(chunkX * tileSize, height + 0.15, chunkZ * tileSize);
    awning.castShadow = true;
    scene.add(awning);

    const meshes = [ground, structure.mesh, awning];
    this._addWindows(
      scene,
      chunkX,
      chunkZ,
      tileSize,
      rng,
      { width, depth, height },
      meshes
    );

    return {
      meshes,
      solidBoxes: [structure.solidBox],
    };
  }
}
