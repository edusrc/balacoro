import * as THREE from "three";
import { TRAIL_OPTIONS } from "./trails.js";


export const PLAYER_COLORS = [
  0xffee00, 0xff3333, 0xff9900, 0x33ff66,
  0x3399ff, 0x00ffff, 0xcc33ff, 0xff0066,
  0xffffff, 0x66ffcc, 0x8b4513, 0x222222,
];

export const HAT_OPTIONS = [
  { id: "none", label: "NONE", price: 0 },
  { id: "cap", label: "CAP", price: 150 },
  { id: "top", label: "TOP HAT", price: 300 },
  { id: "cowboy", label: "COWBOY", price: 450 },
  { id: "wizard", label: "WIZARD", price: 500 },
  { id: "crown", label: "CROWN", price: 800 },
];

export const GLASSES_OPTIONS = [
  { id: "none", label: "NONE", price: 0 },
  { id: "nerd", label: "NERD", price: 200 },
  { id: "sun", label: "SUNGLASSES", price: 250 },
  { id: "monocle", label: "MONOCLE", price: 350 },
  { id: "visor", label: "VISOR", price: 450 },
];

export const EAR_OPTIONS = [
  { id: "none", label: "NONE", price: 0 },
  { id: "bear", label: "BEAR EARS", price: 250 },
  { id: "cat", label: "CAT EARS", price: 300 },
  { id: "horns", label: "HORNS", price: 350 },
  { id: "elf", label: "ELF EARS", price: 380 },
  { id: "bunny", label: "BUNNY EARS", price: 400 },
];

const withKind = (options, kind) =>
  options
    .filter((option) => option.id !== "none")
    .map((option) => ({ ...option, kind }));

export const ACCESSORY_CATEGORIES = [
  {
    id: "head",
    label: "HEAD",
    options: [
      ...withKind(HAT_OPTIONS, "hat"),
      ...withKind(EAR_OPTIONS, "ears"),
    ],
  },
  {
    id: "eyes",
    label: "EYES",
    options: withKind(GLASSES_OPTIONS, "glasses"),
  },
  {
    id: "effect",
    label: "EFFECT",
    options: withKind(TRAIL_OPTIONS, "effect"),
  },
];

export function createAccessory(id) {
  return createHat(id) ?? createGlasses(id) ?? createEars(id);
}

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
    case "elf": {
      const group = new THREE.Group();
      const skinMaterial = new THREE.MeshStandardMaterial({
        color: 0xf0c8a0,
      });
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(
          new THREE.ConeGeometry(0.09, 0.34, 4),
          skinMaterial
        );
        ear.position.set(side * 0.56, 0.38, 0);
        ear.rotation.z = -side * 1.15;
        group.add(ear);
      }
      return group;
    }
    case "bear": {
      const group = new THREE.Group();
      const furMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4a2b });
      const innerMaterial = new THREE.MeshStandardMaterial({
        color: 0x9c7350,
      });
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 10, 8),
          furMaterial
        );
        ear.position.set(side * 0.3, 0.6, 0);
        ear.scale.set(1, 1, 0.45);
        const inner = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 8, 6),
          innerMaterial
        );
        inner.position.set(side * 0.3, 0.6, 0.06);
        inner.scale.set(1, 1, 0.4);
        group.add(ear, inner);
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
    case "cowboy": {
      const group = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({ color: 0x8a5a2b });
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.52, 0.56, 0.05, 12),
        material
      );
      brim.position.y = 0.52;
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.28, 0.3, 10),
        material
      );
      crown.position.y = 0.68;
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.29, 0.29, 0.07, 10),
        new THREE.MeshStandardMaterial({ color: 0x3a2414 })
      );
      band.position.y = 0.57;
      group.add(brim, crown, band);
      return group;
    }
    case "crown": {
      const group = new THREE.Group();
      const goldMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd23e,
        metalness: 0.7,
        roughness: 0.25,
      });
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.33, 0.16, 10),
        goldMaterial
      );
      ring.position.y = 0.58;
      group.add(ring);
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.06, 0.16, 4),
          goldMaterial
        );
        spike.position.set(
          Math.cos(angle) * 0.29,
          0.72,
          Math.sin(angle) * 0.29
        );
        group.add(spike);
      }
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.07, 0),
        new THREE.MeshStandardMaterial({
          color: 0xff3366,
          emissive: 0x881122,
        })
      );
      gem.position.set(0, 0.58, 0.34);
      group.add(gem);
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
    case "monocle": {
      const group = new THREE.Group();
      const rimMaterial = new THREE.MeshStandardMaterial({
        color: 0xc9a227,
        metalness: 0.6,
        roughness: 0.3,
      });
      const lensMaterial = new THREE.MeshStandardMaterial({
        color: 0xbfe9ff,
        transparent: true,
        opacity: 0.45,
      });
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.02, 8, 16),
        rimMaterial
      );
      rim.position.set(0.2, 0.15, 0.56);
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.02, 16),
        lensMaterial
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0.2, 0.15, 0.56);
      const chain = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.24, 0.02),
        rimMaterial
      );
      chain.position.set(0.33, 0.02, 0.56);
      chain.rotation.z = 0.25;
      group.add(rim, lens, chain);
      return group;
    }
    case "visor": {
      const group = new THREE.Group();
      const visorMaterial = new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        emissive: 0x00777f,
        transparent: true,
        opacity: 0.85,
      });
      const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
      });
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.16, 0.06),
        visorMaterial
      );
      bar.position.set(0, 0.15, 0.55);
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.05, 0.07),
        frameMaterial
      );
      frame.position.set(0, 0.26, 0.55);
      group.add(bar, frame);
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
