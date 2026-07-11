import * as THREE from "three";
import { createTileRng } from "../WorldNoise.js";

const geometryCache = new Map();
const materialCache = new Map();

function sharedGeometry(key, create) {
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = create();
    geometryCache.set(key, geometry);
  }
  return geometry;
}

function sharedMaterial(key, create) {
  let material = materialCache.get(key);
  if (!material) {
    material = create();
    materialCache.set(key, material);
  }
  return material;
}

export class Biome {
  groundColor = 0x777777;

  createRng(chunkX, chunkZ, seed) {
    return createTileRng(chunkX, chunkZ, seed);
  }

  colorMaterial(color) {
    return sharedMaterial(`color_${color}`, () =>
      new THREE.MeshStandardMaterial({ color })
    );
  }

  sharedGeometry(key, create) {
    return sharedGeometry(key, create);
  }

  randomOffset(rng, tileSize, marginRatio = 0.7) {
    const range = (tileSize / 2) * marginRatio;
    return {
      x: rng.float(-range, range),
      z: rng.float(-range, range),
    };
  }

  createGroundTile(scene, tileSize, chunkX, chunkZ, color) {
    const geometry = sharedGeometry(`plane_${tileSize}`, () =>
      new THREE.PlaneGeometry(tileSize, tileSize)
    );
    const mesh = new THREE.Mesh(geometry, this.colorMaterial(color));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(chunkX * tileSize, 0, chunkZ * tileSize);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  createBoxStructure(scene, tileSize, chunkX, chunkZ, options) {
    const width = options.width;
    const height = options.height;
    const depth = options.depth;
    const color = options.color;

    const structure = new THREE.Mesh(
      sharedGeometry("box", () => new THREE.BoxGeometry(1, 1, 1)),
      this.colorMaterial(color)
    );
    structure.scale.set(width, height, depth);
    structure.position.set(chunkX * tileSize, height / 2, chunkZ * tileSize);
    structure.castShadow = true;
    structure.receiveShadow = true;
    scene.add(structure);

    const solidBox = new THREE.Box3().setFromObject(structure);

    return { mesh: structure, solidBox };
  }

  createTree(scene, tileSize, chunkX, chunkZ, options = {}) {
    const trunkColor = options.trunkColor ?? 0x8b4513;
    const leavesColor = options.leavesColor ?? 0x006400;
    const trunkHeight = options.trunkHeight ?? 2;
    const leavesRadius = options.leavesRadius ?? 1;
    const offsetX = options.offsetX ?? 0;
    const offsetZ = options.offsetZ ?? 0;
    const centerX = chunkX * tileSize + offsetX;
    const centerZ = chunkZ * tileSize + offsetZ;

    const trunk = new THREE.Mesh(
      sharedGeometry("cylinder8", () => new THREE.CylinderGeometry(1, 1, 1, 8)),
      this.colorMaterial(trunkColor)
    );
    trunk.scale.set(0.2, trunkHeight, 0.2);
    trunk.position.set(0, trunkHeight / 2, 0);

    const leaves = new THREE.Mesh(
      sharedGeometry("sphere8", () => new THREE.SphereGeometry(1, 8, 8)),
      this.colorMaterial(leavesColor)
    );
    leaves.scale.setScalar(leavesRadius);
    leaves.position.set(0, trunkHeight + leavesRadius * 0.5, 0);

    const group = new THREE.Group();
    group.add(trunk);
    group.add(leaves);
    group.position.set(centerX, 0, centerZ);
    group.traverse((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });
    scene.add(group);

    const trunkBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(centerX, trunkHeight / 2, centerZ),
      new THREE.Vector3(0.5, trunkHeight, 0.5)
    );

    return { mesh: group, solidBox: trunkBox };
  }

  createPineTree(scene, tileSize, chunkX, chunkZ, options = {}) {
    const trunkColor = options.trunkColor ?? 0x5a3d2b;
    const leavesColor = options.leavesColor ?? 0x2f6f4f;
    const trunkHeight = options.trunkHeight ?? 1.5;
    const leavesHeight = options.leavesHeight ?? 3;
    const leavesRadius = options.leavesRadius ?? 1.1;
    const offsetX = options.offsetX ?? 0;
    const offsetZ = options.offsetZ ?? 0;
    const centerX = chunkX * tileSize + offsetX;
    const centerZ = chunkZ * tileSize + offsetZ;

    const trunk = new THREE.Mesh(
      sharedGeometry("cylinderTaper8", () =>
        new THREE.CylinderGeometry(0.9, 1.1, 1, 8)
      ),
      this.colorMaterial(trunkColor)
    );
    trunk.scale.set(0.2, trunkHeight, 0.2);
    trunk.position.set(0, trunkHeight / 2, 0);

    const tierCount = 3;
    const group = new THREE.Group();
    group.add(trunk);

    for (let tier = 0; tier < tierCount; tier++) {
      const tierRadius = leavesRadius * (1 - tier * 0.25);
      const tierHeight = leavesHeight / tierCount;
      const cone = new THREE.Mesh(
        sharedGeometry("cone8", () => new THREE.ConeGeometry(1, 1, 8)),
        this.colorMaterial(leavesColor)
      );
      cone.scale.set(tierRadius, tierHeight, tierRadius);
      cone.position.set(
        0,
        trunkHeight + tier * tierHeight * 0.7 + tierHeight / 2,
        0
      );
      group.add(cone);
    }

    const snowCap = new THREE.Mesh(
      sharedGeometry("sphere6", () => new THREE.SphereGeometry(1, 6, 6)),
      this.colorMaterial(0xffffff)
    );
    snowCap.scale.setScalar(leavesRadius * 0.18);
    snowCap.position.set(0, trunkHeight + leavesHeight * 0.95, 0);
    group.add(snowCap);

    group.position.set(centerX, 0, centerZ);
    group.traverse((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });
    scene.add(group);

    const trunkBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(centerX, trunkHeight / 2, centerZ),
      new THREE.Vector3(0.5, trunkHeight, 0.5)
    );

    return { mesh: group, solidBox: trunkBox };
  }

  createRock(scene, tileSize, chunkX, chunkZ, options = {}) {
    const radius = options.radius ?? 1;
    const color = options.color ?? 0x8b7355;
    const offsetX = options.offsetX ?? 0;
    const offsetZ = options.offsetZ ?? 0;
    const centerX = chunkX * tileSize + offsetX;
    const centerZ = chunkZ * tileSize + offsetZ;

    const rock = new THREE.Mesh(
      sharedGeometry("dodecahedron", () =>
        new THREE.DodecahedronGeometry(1, 0)
      ),
      this.colorMaterial(color)
    );
    rock.scale.setScalar(radius);
    rock.position.set(centerX, radius / 2, centerZ);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);

    const solidBox = new THREE.Box3().setFromObject(rock);

    return { mesh: rock, solidBox };
  }

  createIceRock(scene, tileSize, chunkX, chunkZ, options = {}) {
    const radius = options.radius ?? 1;
    const offsetX = options.offsetX ?? 0;
    const offsetZ = options.offsetZ ?? 0;
    const centerX = chunkX * tileSize + offsetX;
    const centerZ = chunkZ * tileSize + offsetZ;

    const rock = new THREE.Mesh(
      sharedGeometry("octahedron", () => new THREE.OctahedronGeometry(1, 0)),
      sharedMaterial("ice", () =>
        new THREE.MeshStandardMaterial({
          color: 0xbfe9ff,
          transparent: true,
          opacity: 0.85,
          roughness: 0.1,
          metalness: 0.1,
        })
      )
    );
    rock.scale.setScalar(radius);
    rock.position.set(centerX, radius / 2, centerZ);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);

    const solidBox = new THREE.Box3().setFromObject(rock);

    return { mesh: rock, solidBox };
  }

  createGroundClutter(scene, tileSize, chunkX, chunkZ, options = {}) {
    const color = options.color ?? 0x3b7a3b;
    const radius = options.radius ?? 0.35;
    const offsetX = options.offsetX ?? 0;
    const offsetZ = options.offsetZ ?? 0;

    const clutter = new THREE.Mesh(
      sharedGeometry("sphere6_5", () => new THREE.SphereGeometry(1, 6, 5)),
      this.colorMaterial(color)
    );
    clutter.scale.setScalar(radius);
    clutter.position.set(
      chunkX * tileSize + offsetX,
      radius * 0.5,
      chunkZ * tileSize + offsetZ
    );
    clutter.castShadow = true;
    clutter.receiveShadow = true;
    scene.add(clutter);

    return { mesh: clutter };
  }

  createHalfDome(scene, tileSize, chunkX, chunkZ, options = {}) {
    const radius = options.radius ?? 1;
    const color = options.color ?? 0xffffff;
    const offsetX = options.offsetX ?? 0;
    const offsetZ = options.offsetZ ?? 0;
    const centerX = chunkX * tileSize + offsetX;
    const centerZ = chunkZ * tileSize + offsetZ;

    const dome = new THREE.Mesh(
      sharedGeometry("halfSphere", () =>
        new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2)
      ),
      this.colorMaterial(color)
    );
    dome.scale.setScalar(radius);
    dome.position.set(centerX, 0, centerZ);
    dome.receiveShadow = true;
    scene.add(dome);

    const solidBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(centerX, radius * 0.3, centerZ),
      new THREE.Vector3(radius * 1.2, radius * 0.6, radius * 1.2)
    );

    return { mesh: dome, solidBox };
  }

  createTile() {
    throw new Error("createTile must be implemented by a Biome subclass");
  }

  populate() {
    throw new Error("populate must be implemented by a Biome subclass");
  }
}
