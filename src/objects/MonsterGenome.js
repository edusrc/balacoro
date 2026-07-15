import * as THREE from "three";

const UP = new THREE.Vector3(0, 1, 0);

const spikeGeometry = new THREE.ConeGeometry(0.09, 0.3, 5);
const hornGeometry = new THREE.ConeGeometry(0.08, 0.34, 5);
const legGeometry = new THREE.BoxGeometry(0.11, 0.32, 0.11);
const plateGeometry = new THREE.BoxGeometry(0.06, 0.3, 0.34);
const tailGeometry = new THREE.BoxGeometry(0.22, 0.22, 0.22);
const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.32, 4);
const antennaTipGeometry = new THREE.SphereGeometry(0.05, 6, 5);
const eyeGeometry = new THREE.BoxGeometry(0.16, 0.16, 0.14);

export const eyeDayMaterial = new THREE.MeshStandardMaterial({
  color: 0x111111,
});
export const eyeNightMaterial = new THREE.MeshBasicMaterial({
  color: 0xff2222,
});
const hornMaterial = new THREE.MeshStandardMaterial({
  color: 0xd9d0c0,
  flatShading: true,
});
const darkMaterial = new THREE.MeshStandardMaterial({
  color: 0x1b1b24,
  flatShading: true,
});
const plateMaterial = new THREE.MeshStandardMaterial({
  color: 0x30303c,
  flatShading: true,
});

const BODY_BASES = [
  () => new THREE.BoxGeometry(1, 1, 1, 2, 2, 2),
  () => new THREE.IcosahedronGeometry(0.62, 1),
  () => new THREE.OctahedronGeometry(0.62, 1),
  () => new THREE.DodecahedronGeometry(0.6, 0),
  () => {
    const geometry = new THREE.CapsuleGeometry(0.38, 0.5, 3, 8);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  },
  (rand) => new THREE.ConeGeometry(0.5, 1, 4 + Math.floor(rand() * 4)),
  (rand) =>
    new THREE.CylinderGeometry(
      0.3 + rand() * 0.15,
      0.38 + rand() * 0.15,
      0.9,
      6 + Math.floor(rand() * 3)
    ),
  (rand) =>
    new THREE.SphereGeometry(
      0.6,
      7 + Math.floor(rand() * 3),
      5 + Math.floor(rand() * 3)
    ),
];

function mulberry32(state) {
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function difficultyColor(level) {
  const color = new THREE.Color();
  if (level <= 5) {
    color.setHSL(0.66 * (1 - level / 5), 1, 0.5);
  } else if (level <= 10) {
    color.setHSL(0, 1, 0.5 - ((level - 5) / 5) * 0.28);
  } else {
    color.setHSL(((level - 10) * 0.09) % 1, 1, 0.3);
  }
  return color;
}

export function getDifficultyColorStyle(difficulty) {
  const color = difficultyColor(difficulty);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  color.setHSL(hsl.h, hsl.s, Math.max(hsl.l, 0.5));
  return `#${color.getHexString()}`;
}

const bodyMaterialCache = new Map();
export function getBodyMaterial(difficulty, elite = false) {
  const key = `${difficulty}_${elite ? 1 : 0}`;
  let material = bodyMaterialCache.get(key);
  if (!material) {
    const color = difficultyColor(difficulty);
    let emissive = new THREE.Color(0x000000);
    if (elite) {
      emissive = color.clone().multiplyScalar(0.55);
    } else if (difficulty > 10) {
      emissive = color
        .clone()
        .multiplyScalar(Math.min(0.15 + (difficulty - 10) * 0.03, 0.7));
    }
    material = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      emissive,
    });
    bodyMaterialCache.set(key, material);
  }
  return material;
}

const ARCHETYPES = {
  swarm: {
    weight: 5,
    speed: [0.9, 1.15],
    health: [0.9, 1.2],
    damage: [0.9, 1.1],
    size: [0.9, 1.1],
    deform: [0.88, 1.12],
    stretch: { x: [0.85, 1.15], y: [0.85, 1.15], z: [0.85, 1.15] },
    bases: [0, 1, 2, 3, 4, 5, 6, 7],
    parts: () => ({
      spikes: Math.floor(Math.random() * 4),
      legs: Math.floor(Math.random() * 3) * 2,
      tailSegments:
        Math.random() < 0.3 ? 2 + Math.floor(Math.random() * 2) : 0,
      plates: 0,
      horns: Math.random() < 0.15,
      antennae: Math.random() < 0.35,
    }),
  },
  runner: {
    weight: 2,
    speed: [1.6, 2.1],
    health: [0.35, 0.6],
    damage: [0.75, 0.95],
    size: [0.68, 0.85],
    deform: [0.94, 1.08],
    stretch: { x: [0.75, 0.9], y: [0.7, 0.9], z: [1.05, 1.35] },
    bases: [1, 4, 5, 7],
    parts: () => ({
      spikes: Math.floor(Math.random() * 2),
      legs: 4 + Math.floor(Math.random() * 2) * 2,
      tailSegments: 3 + Math.floor(Math.random() * 3),
      plates: 0,
      horns: false,
      antennae: Math.random() < 0.7,
    }),
  },
  tank: {
    weight: 2,
    speed: [0.45, 0.65],
    health: [2.6, 4],
    damage: [1.1, 1.4],
    size: [1.25, 1.5],
    deform: [0.82, 1.18],
    stretch: { x: [1.05, 1.25], y: [0.85, 1.1], z: [1, 1.2] },
    bases: [0, 2, 3, 6],
    parts: () => ({
      spikes: 3 + Math.floor(Math.random() * 4),
      legs: Math.floor(Math.random() * 2) * 2,
      tailSegments: 0,
      plates: 2 + Math.floor(Math.random() * 3),
      horns: Math.random() < 0.3,
      antennae: false,
    }),
  },
  brute: {
    weight: 1.5,
    speed: [0.8, 1],
    health: [1.4, 1.9],
    damage: [1.8, 2.4],
    size: [1.1, 1.3],
    deform: [0.85, 1.15],
    stretch: { x: [1, 1.2], y: [1, 1.25], z: [0.9, 1.1] },
    bases: [0, 2, 3, 6],
    parts: () => ({
      spikes: 2 + Math.floor(Math.random() * 3),
      legs: 2 + Math.floor(Math.random() * 2) * 2,
      tailSegments: Math.random() < 0.3 ? 2 : 0,
      plates: Math.floor(Math.random() * 3),
      horns: true,
      antennae: false,
    }),
  },
};

function randRange([min, max]) {
  return min + Math.random() * (max - min);
}

function pickArchetype() {
  const entries = Object.entries(ARCHETYPES);
  const total = entries.reduce((sum, [, spec]) => sum + spec.weight, 0);
  let roll = Math.random() * total;
  for (const [name, spec] of entries) {
    roll -= spec.weight;
    if (roll <= 0) return name;
  }
  return "swarm";
}

function pickEyeCount() {
  const roll = Math.random();
  if (roll < 0.5) return 2;
  if (roll < 0.7) return 1;
  if (roll < 0.9) return 3;
  return 4;
}

export const ARCHETYPE_NAMES = Object.keys(ARCHETYPES);

export function generateGenome(isBoss, forcedArchetype) {
  const archetype =
    forcedArchetype ??
    (isBoss ? (Math.random() < 0.5 ? "tank" : "brute") : pickArchetype());
  const spec = ARCHETYPES[archetype];

  return {
    archetype,
    coreSeed: Math.floor(Math.random() * 0xffffffff),
    speedMult: randRange(spec.speed),
    healthMult: randRange(spec.health),
    damageMult: randRange(spec.damage),
    sizeMult: randRange(spec.size),
    deformRange: spec.deform,
    baseIndex: spec.bases[Math.floor(Math.random() * spec.bases.length)],
    stretch: {
      x: randRange(spec.stretch.x),
      y: randRange(spec.stretch.y),
      z: randRange(spec.stretch.z),
    },
    eyeCount: pickEyeCount(),
    eyeScale: 0.75 + Math.random() * 0.7,
    parts: spec.parts(),
  };
}

function vertexHash(x, y, z, seed) {
  let h =
    Math.imul(x, 374761393) ^
    Math.imul(y, 668265263) ^
    Math.imul(z, 1274126177) ^
    seed;
  h = Math.imul(h ^ (h >>> 13), 144665);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function createCoreGeometry(genome, rand) {
  const geometry = BODY_BASES[genome.baseIndex](rand);
  const [deformMin, deformMax] = genome.deformRange;

  const position = geometry.getAttribute("position");
  const vertex = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const mirroredX = Math.abs(vertex.x);
    const coarse = vertexHash(
      Math.round(mirroredX * 3),
      Math.round(vertex.y * 3),
      Math.round(vertex.z * 3),
      genome.coreSeed
    );
    const fine = vertexHash(
      Math.round(mirroredX * 997),
      Math.round(vertex.y * 997),
      Math.round(vertex.z * 997),
      genome.coreSeed ^ 0x9e3779b9
    );
    const blended = coarse * 0.7 + fine * 0.3;
    vertex.multiplyScalar(deformMin + blended * (deformMax - deformMin));
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
}

const EYE_LAYOUTS = {
  1: [[0, 0.2]],
  2: [
    [-0.2, 0.18],
    [0.2, 0.18],
  ],
  3: [
    [-0.22, 0.12],
    [0.22, 0.12],
    [0, 0.3],
  ],
  4: [
    [-0.2, 0.08],
    [0.2, 0.08],
    [-0.2, 0.3],
    [0.2, 0.3],
  ],
};

export function buildMonsterBody(genome, bodyMaterial) {
  const rand = mulberry32(genome.coreSeed);
  const group = new THREE.Group();
  const coreGeometry = createCoreGeometry(genome, rand);
  const core = new THREE.Mesh(coreGeometry, bodyMaterial);
  group.add(core);

  const flashEntries = [{ mesh: core, material: bodyMaterial }];
  const animatedParts = [];
  const eyes = [];

  const countFactor = { 1: 1.7, 2: 1, 3: 0.85, 4: 0.72 }[genome.eyeCount];
  const eyeSize = genome.eyeScale * countFactor;
  const spread = 0.55 + eyeSize * 0.45;
  for (const [x, y] of EYE_LAYOUTS[genome.eyeCount]) {
    const eye = new THREE.Mesh(eyeGeometry, eyeDayMaterial);
    const jitter = 0.92 + rand() * 0.16;
    eye.position.set(x * spread, y, 0.48);
    eye.scale.set(
      (eyeSize * jitter) / genome.stretch.x,
      (eyeSize * jitter) / genome.stretch.y,
      1
    );
    group.add(eye);
    eyes.push(eye);
  }

  for (let i = 0; i < genome.parts.spikes; i++) {
    const t = genome.parts.spikes > 1 ? i / (genome.parts.spikes - 1) : 0.5;
    const direction = new THREE.Vector3(
      (rand() - 0.5) * 0.2,
      1,
      -(t - 0.35) * 0.8
    ).normalize();
    const spike = new THREE.Mesh(spikeGeometry, darkMaterial);
    spike.position.set((rand() - 0.5) * 0.1, 0.38, 0.35 - t * 0.75);
    spike.quaternion.setFromUnitVectors(UP, direction);
    spike.scale.setScalar(0.9 + rand() * 0.5 - Math.abs(t - 0.5) * 0.5);
    group.add(spike);
    flashEntries.push({ mesh: spike, material: darkMaterial });
  }

  if (genome.parts.horns) {
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(hornGeometry, hornMaterial);
      horn.position.set(side * 0.2, 0.42, 0.08);
      horn.rotation.z = -side * 0.5;
      horn.scale.setScalar(1.1 + rand() * 0.5);
      group.add(horn);
      flashEntries.push({ mesh: horn, material: hornMaterial });
    }
  }

  const legPairs = Math.floor(genome.parts.legs / 2);
  for (let pair = 0; pair < legPairs; pair++) {
    const z = legPairs > 1 ? -0.25 + (0.5 * pair) / (legPairs - 1) : 0;
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(legGeometry, darkMaterial);
      leg.position.set(side * 0.42, -0.35, z);
      group.add(leg);
      flashEntries.push({ mesh: leg, material: darkMaterial });
      animatedParts.push({
        mesh: leg,
        kind: "leg",
        phase: pair * 1.6 + (side > 0 ? Math.PI : 0),
      });
    }
  }

  for (let i = 0; i < genome.parts.tailSegments; i++) {
    const segment = new THREE.Mesh(tailGeometry, bodyMaterial);
    segment.scale.setScalar(Math.max(1 - i * 0.16, 0.25));
    segment.position.set(0, 0.05 + i * 0.03, -(0.52 + i * 0.16));
    group.add(segment);
    flashEntries.push({ mesh: segment, material: bodyMaterial });
    animatedParts.push({
      mesh: segment,
      kind: "tail",
      phase: i * 0.7,
      amplitude: 0.04 + i * 0.03,
    });
  }

  for (let i = 0; i < genome.parts.plates; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const plate = new THREE.Mesh(plateGeometry, plateMaterial);
    plate.position.set(side * 0.46, 0.06, -0.15 + Math.floor(i / 2) * 0.3);
    plate.rotation.z = side * 0.15;
    group.add(plate);
    flashEntries.push({ mesh: plate, material: plateMaterial });
  }

  if (genome.parts.antennae) {
    for (const side of [-1, 1]) {
      const antenna = new THREE.Group();
      const stalk = new THREE.Mesh(antennaGeometry, darkMaterial);
      stalk.position.y = 0.16;
      const tip = new THREE.Mesh(antennaTipGeometry, hornMaterial);
      tip.position.y = 0.34;
      antenna.add(stalk, tip);
      antenna.position.set(side * 0.14, 0.45, 0.08);
      antenna.rotation.z = -side * 0.3;
      group.add(antenna);
      flashEntries.push(
        { mesh: stalk, material: darkMaterial },
        { mesh: tip, material: hornMaterial }
      );
      animatedParts.push({
        mesh: antenna,
        kind: "antenna",
        phase: side * 1.3,
        baseRotZ: -side * 0.3,
      });
    }
  }

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return { group, coreGeometry, flashEntries, eyes, animatedParts };
}
