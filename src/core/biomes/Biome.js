import * as THREE from "three";

export class Biome {
  getTileHash(chunkX, chunkZ, seed, salt = 0) {
    const hash = (chunkX * 73856093) ^ (chunkZ * 19349663) ^ (seed + salt);
    return Math.abs(Math.sin(hash) * 10000) % 1;
  }

  getOffsetWithinTile(chunkX, chunkZ, seed, salt, tileSize, marginRatio = 0.7) {
    const hashX = this.getTileHash(chunkX, chunkZ, seed, salt * 17 + 3);
    const hashZ = this.getTileHash(chunkX, chunkZ, seed, salt * 17 + 11);
    const range = (tileSize / 2) * marginRatio;
    return {
      x: (hashX - 0.5) * 2 * range,
      z: (hashZ - 0.5) * 2 * range,
    };
  }

  createGroundTile(scene, tileSize, chunkX, chunkZ, color) {
    const geometry = new THREE.PlaneGeometry(tileSize, tileSize);
    const material = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);
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
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({ color })
    );
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
      new THREE.CylinderGeometry(0.2, 0.2, trunkHeight, 8),
      new THREE.MeshStandardMaterial({ color: trunkColor })
    );
    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(leavesRadius, 8, 8),
      new THREE.MeshStandardMaterial({ color: leavesColor })
    );

    trunk.position.set(0, trunkHeight / 2, 0);
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
      new THREE.CylinderGeometry(0.18, 0.22, trunkHeight, 8),
      new THREE.MeshStandardMaterial({ color: trunkColor })
    );
    trunk.position.set(0, trunkHeight / 2, 0);

    const tierCount = 3;
    const group = new THREE.Group();
    group.add(trunk);

    for (let tier = 0; tier < tierCount; tier++) {
      const tierRadius = leavesRadius * (1 - tier * 0.25);
      const tierHeight = leavesHeight / tierCount;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(tierRadius, tierHeight, 8),
        new THREE.MeshStandardMaterial({ color: leavesColor })
      );
      cone.position.set(
        0,
        trunkHeight + tier * tierHeight * 0.7 + tierHeight / 2,
        0
      );
      group.add(cone);
    }

    const snowCap = new THREE.Mesh(
      new THREE.SphereGeometry(leavesRadius * 0.18, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
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
      new THREE.DodecahedronGeometry(radius, 0),
      new THREE.MeshStandardMaterial({ color })
    );
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
      new THREE.OctahedronGeometry(radius, 0),
      new THREE.MeshStandardMaterial({
        color: 0xbfe9ff,
        transparent: true,
        opacity: 0.85,
        roughness: 0.1,
        metalness: 0.1,
      })
    );
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
      new THREE.SphereGeometry(radius, 6, 5),
      new THREE.MeshStandardMaterial({ color })
    );
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

  createTile() {
    throw new Error("createTile must be implemented by a Biome subclass");
  }
}
