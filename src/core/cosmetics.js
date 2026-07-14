import * as THREE from "three";


export const PLAYER_COLORS = [
  0xffee00, 0xff3333, 0xff9900, 0x33ff66,
  0x3399ff, 0x00ffff, 0xcc33ff, 0xff0066,
  0xffffff, 0x66ffcc, 0x8b4513, 0x222222,
];

export const HAT_OPTIONS = [
  { id: "none", label: "NONE", price: 0 },
  { id: "cap", label: "CAP", price: 150 },
  { id: "top", label: "TOP HAT", price: 300 },
  { id: "wizard", label: "WIZARD", price: 500 },
];

export const GLASSES_OPTIONS = [
  { id: "none", label: "NONE", price: 0 },
  { id: "nerd", label: "NERD", price: 200 },
  { id: "sun", label: "SUNGLASSES", price: 250 },
];

export const EAR_OPTIONS = [
  { id: "none", label: "NONE", price: 0 },
  { id: "cat", label: "CAT EARS", price: 300 },
  { id: "horns", label: "HORNS", price: 350 },
  { id: "bunny", label: "BUNNY EARS", price: 400 },
];

export function createEars(type) {
  switch (type) {
    case "cat": {
      const group = new THREE.Group();
      const furMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2b2b });
      const innerMaterial = new THREE.MeshStandardMaterial({ color: 0xe08a9b });
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(
          new THREE.ConeGeometry(0.14, 0.28, 4),
          furMaterial
        );
        ear.position.set(side * 0.3, 0.62, 0);
        ear.rotation.z = -side * 0.25;
        const inner = new THREE.Mesh(
          new THREE.ConeGeometry(0.07, 0.16, 4),
          innerMaterial
        );
        inner.position.set(side * 0.29, 0.6, 0.05);
        inner.rotation.z = -side * 0.25;
        group.add(ear, inner);
      }
      return group;
    }
    case "bunny": {
      const group = new THREE.Group();
      const furMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5f5 });
      const innerMaterial = new THREE.MeshStandardMaterial({ color: 0xe08a9b });
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.55, 0.08),
          furMaterial
        );
        ear.position.set(side * 0.22, 0.85, 0);
        ear.rotation.z = -side * 0.15;
        const inner = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.4, 0.02),
          innerMaterial
        );
        inner.position.set(side * 0.21, 0.85, 0.05);
        inner.rotation.z = -side * 0.15;
        group.add(ear, inner);
      }
      return group;
    }
    case "horns": {
      const group = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({
        color: 0xd9d0c0,
        roughness: 0.6,
      });
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(
          new THREE.ConeGeometry(0.09, 0.32, 6),
          material
        );
        horn.position.set(side * 0.42, 0.58, 0);
        horn.rotation.z = -side * 0.55;
        group.add(horn);
      }
      return group;
    }
    default:
      return null;
  }
}

export function createHat(type) {
  switch (type) {
    case "top": {
      const group = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.05, 12),
        material
      );
      brim.position.y = 0.53;
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.27, 0.27, 0.45, 12),
        material
      );
      crown.position.y = 0.78;
      group.add(brim, crown);
      return group;
    }
    case "cap": {
      const group = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({ color: 0xd23b3b });
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        material
      );
      dome.position.y = 0.5;
      const brim = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.05, 0.3),
        material
      );
      brim.position.set(0, 0.53, 0.42);
      group.add(dome, brim);
      return group;
    }
    case "wizard": {
      const group = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({ color: 0x5b2a86 });
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 0.7, 10),
        material
      );
      cone.position.y = 0.87;
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.04, 12),
        material
      );
      brim.position.y = 0.52;
      group.add(cone, brim);
      return group;
    }
    default:
      return null;
  }
}

export function createGlasses(type) {
  switch (type) {
    case "sun": {
      const group = new THREE.Group();
      const rimMaterial = new THREE.MeshStandardMaterial({
        color: 0xc9a227,
        metalness: 0.6,
        roughness: 0.3,
      });
      const lensMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.15,
      });

      for (const side of [-1, 1]) {
        const rim = new THREE.Mesh(
          new THREE.TorusGeometry(0.12, 0.02, 8, 16),
          rimMaterial
        );
        rim.position.set(side * 0.2, 0.15, 0.56);

        const lens = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.11, 0.03, 16),
          lensMaterial
        );
        lens.rotation.x = Math.PI / 2;
        lens.position.set(side * 0.2, 0.15, 0.56);

        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.02, 0.02),
          rimMaterial
        );
        arm.position.set(side * 0.38, 0.17, 0.52);
        arm.rotation.y = side * 0.5;

        group.add(rim, lens, arm);
      }

      const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.02, 0.02),
        rimMaterial
      );
      bridge.position.set(0, 0.18, 0.56);
      group.add(bridge);

      return group;
    }
    case "nerd": {
      const group = new THREE.Group();
      const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const lensMaterial = new THREE.MeshStandardMaterial({
        color: 0xbfe9ff,
        transparent: true,
        opacity: 0.55,
      });
      for (const side of [-1, 1]) {
        const rim = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.2, 0.05),
          frameMaterial
        );
        rim.position.set(side * 0.2, 0.15, 0.55);
        const lens = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.14, 0.06),
          lensMaterial
        );
        lens.position.set(side * 0.2, 0.15, 0.555);
        group.add(rim, lens);
      }
      const bridge = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.05, 0.05),
        frameMaterial
      );
      bridge.position.set(0, 0.17, 0.55);
      group.add(bridge);
      return group;
    }
    default:
      return null;
  }
}
