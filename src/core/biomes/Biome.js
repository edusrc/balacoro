import * as THREE from "three";
import { createTileRng, fractalNoise2D } from "../WorldNoise.js";
import { lampBulbMaterial } from "./lightMaterials.js";

const geometryCache = new Map();
const materialCache = new Map();

const patchyGroundMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
});
const waterMaterial = new THREE.MeshStandardMaterial({
  color: 0x2f7fbf,
  roughness: 0.2,
  metalness: 0.1,
});
const iceLakeMaterial = new THREE.MeshStandardMaterial({
  color: 0xbfe9ff,
  roughness: 0.05,
  metalness: 0.2,
});
const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xff7a26 });

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

  createPatchyGroundTile(scene, tileSize, chunkX, chunkZ, baseColor, seed) {
    const segments = 4;
    const geometry = new THREE.PlaneGeometry(
      tileSize,
      tileSize,
      segments,
      segments
    ).toNonIndexed();

    const positions = geometry.getAttribute("position");
    const colors = new Float32Array(positions.count * 3);
    const base = new THREE.Color(baseColor);
    const cellColor = new THREE.Color();
    const centerX = chunkX * tileSize;
    const centerZ = chunkZ * tileSize;

    for (let start = 0; start < positions.count; start += 6) {
      let sumX = 0;
      let sumY = 0;
      for (let v = 0; v < 6; v++) {
        sumX += positions.getX(start + v);
        sumY += positions.getY(start + v);
      }
      const worldX = centerX + sumX / 6;
      const worldZ = centerZ - sumY / 6;

      const coarse = fractalNoise2D(worldX * 0.06, worldZ * 0.06, seed ^ 0x51ce);
      const fine = fractalNoise2D(worldX * 0.9, worldZ * 0.9, seed ^ 0xabc1);
      const factor = 0.82 + coarse * 0.28 + fine * 0.12;
      cellColor.copy(base).multiplyScalar(factor);

      for (let v = 0; v < 6; v++) {
        const index = (start + v) * 3;
        colors[index] = cellColor.r;
        colors[index + 1] = cellColor.g;
        colors[index + 2] = cellColor.b;
      }
    }

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const mesh = new THREE.Mesh(geometry, patchyGroundMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(centerX, 0, centerZ);
    mesh.receiveShadow = true;
    mesh.userData.disposeGeometry = true;
    scene.add(mesh);
    return mesh;
  }

  createBoxStructure(scene, tileSize, chunkX, chunkZ, options) {
    const width = options.width;
    const height = options.height;
    const depth = options.depth;
    const color = options.color;
    const offsetX = options.offsetX ?? 0;
    const offsetZ = options.offsetZ ?? 0;

    const structure = new THREE.Mesh(
      sharedGeometry("box", () => new THREE.BoxGeometry(1, 1, 1)),
      this.colorMaterial(color)
    );
    structure.scale.set(width, height, depth);
    structure.position.set(
      chunkX * tileSize + offsetX,
      height / 2,
      chunkZ * tileSize + offsetZ
    );
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

  createLakeDisc(scene, tileSize, chunkX, chunkZ, radius, material) {
    const disc = new THREE.Mesh(
      sharedGeometry("circle32", () => new THREE.CircleGeometry(1, 32)),
      material
    );
    disc.rotation.x = -Math.PI / 2;
    disc.scale.setScalar(radius);
    disc.position.set(chunkX * tileSize, 0.03, chunkZ * tileSize);
    disc.receiveShadow = true;
    scene.add(disc);
    return disc;
  }

  createWaterDisc(scene, tileSize, chunkX, chunkZ, radius) {
    return this.createLakeDisc(
      scene,
      tileSize,
      chunkX,
      chunkZ,
      radius,
      waterMaterial
    );
  }

  createIceDisc(scene, tileSize, chunkX, chunkZ, radius) {
    return this.createLakeDisc(
      scene,
      tileSize,
      chunkX,
      chunkZ,
      radius,
      iceLakeMaterial
    );
  }

  populateRuins(scene, tileSize, chunkX, chunkZ, rng, out) {
    const pillarCount = 5 + rng.int(0, 2);
    const radius = rng.float(4.5, 6);
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2 + rng.float(-0.25, 0.25);
      const height =
        rng.next() < 0.3 ? rng.float(0.5, 0.9) : rng.float(1.4, 2.8);
      const pillar = this.createBoxStructure(scene, tileSize, chunkX, chunkZ, {
        width: 0.9,
        height,
        depth: 0.9,
        color: 0x8a8f94,
        offsetX: Math.cos(angle) * radius,
        offsetZ: Math.sin(angle) * radius,
      });
      out.meshes.push(pillar.mesh);
      out.solidBoxes.push(pillar.solidBox);
    }
  }

  populateCampfire(scene, tileSize, chunkX, chunkZ, rng, out) {
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + rng.float(-0.2, 0.2);
      const stone = this.createRock(scene, tileSize, chunkX, chunkZ, {
        radius: rng.float(0.22, 0.38),
        color: 0x6f6f6f,
        offsetX: Math.cos(angle) * 1.2,
        offsetZ: Math.sin(angle) * 1.2,
      });
      out.meshes.push(stone.mesh);
    }

    for (const rotation of [0.6, -0.6]) {
      const log = new THREE.Mesh(
        sharedGeometry("box", () => new THREE.BoxGeometry(1, 1, 1)),
        this.colorMaterial(0x5a3d2b)
      );
      log.scale.set(1.5, 0.18, 0.18);
      log.rotation.y = rotation;
      log.position.set(chunkX * tileSize, 0.1, chunkZ * tileSize);
      log.castShadow = true;
      scene.add(log);
      out.meshes.push(log);
    }

    const flame = new THREE.Mesh(
      sharedGeometry("cone8", () => new THREE.ConeGeometry(1, 1, 8)),
      flameMaterial
    );
    flame.scale.set(0.45, 0.9, 0.45);
    flame.position.set(chunkX * tileSize, 0.55, chunkZ * tileSize);
    scene.add(flame);
    out.meshes.push(flame);
  }

  populateVillage(scene, tileSize, chunkX, chunkZ, rng, out, wallColor) {
    const spots = [
      [-5.5, -4],
      [5, -5],
      [-4.5, 5],
      [5.5, 4.5],
    ];
    const houseCount = 2 + rng.int(0, 1);
    for (let i = 0; i < houseCount; i++) {
      const [baseX, baseZ] = spots[i];
      const offsetX = baseX + rng.float(-1, 1);
      const offsetZ = baseZ + rng.float(-1, 1);
      const width = rng.float(3.5, 5);
      const depth = rng.float(3.5, 5);
      const height = rng.float(2.4, 3.4);

      const house = this.createBoxStructure(scene, tileSize, chunkX, chunkZ, {
        width,
        height,
        depth,
        color: wallColor ?? 0xb08968,
        offsetX,
        offsetZ,
      });
      out.meshes.push(house.mesh);
      out.solidBoxes.push(house.solidBox);

      const roofRadius = Math.max(width, depth) * 0.72;
      const roof = new THREE.Mesh(
        sharedGeometry("cone4", () => new THREE.ConeGeometry(1, 1, 4)),
        this.colorMaterial(0x6e4a34)
      );
      roof.scale.set(roofRadius, 1.6, roofRadius);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(
        chunkX * tileSize + offsetX,
        height + 0.8,
        chunkZ * tileSize + offsetZ
      );
      roof.castShadow = true;
      scene.add(roof);
      out.meshes.push(roof);
    }

    const centerX = chunkX * tileSize;
    const centerZ = chunkZ * tileSize;
    const pole = new THREE.Mesh(
      sharedGeometry("cylinder8", () => new THREE.CylinderGeometry(1, 1, 1, 8)),
      this.colorMaterial(0x2b2b2b)
    );
    pole.scale.set(0.07, 3, 0.07);
    pole.position.set(centerX, 1.5, centerZ);
    pole.castShadow = true;
    scene.add(pole);
    out.meshes.push(pole);

    const bulb = new THREE.Mesh(
      sharedGeometry("sphere8", () => new THREE.SphereGeometry(1, 8, 8)),
      lampBulbMaterial
    );
    bulb.scale.setScalar(0.25);
    bulb.position.set(centerX, 3.1, centerZ);
    scene.add(bulb);
    out.meshes.push(bulb);

    out.solidBoxes.push(
      new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(centerX, 1.5, centerZ),
        new THREE.Vector3(0.4, 3, 0.4)
      )
    );
  }

  createTile() {
    throw new Error("createTile must be implemented by a Biome subclass");
  }

  populate() {
    throw new Error("populate must be implemented by a Biome subclass");
  }
}
