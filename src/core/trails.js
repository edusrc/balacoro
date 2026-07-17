import * as THREE from "three";

export const TRAIL_OPTIONS = [
  { id: "fire", label: "FIRE TRAIL", price: 400 },
  { id: "ice", label: "ICE TRAIL", price: 400 },
  { id: "poison", label: "POISON TRAIL", price: 450 },
  { id: "lightning", label: "LIGHTNING TRAIL", price: 500 },
  { id: "shadow", label: "SHADOW TRAIL", price: 600 },
  { id: "rainbow", label: "RAINBOW TRAIL", price: 1000 },
];

const TRAIL_DEFS = {
  fire: {
    colors: [0xff5a1f, 0xff9a00, 0xffd23e],
    size: 0.16,
    lifetime: 0.55,
    rise: 1.4,
    spread: 0.24,
  },
  ice: {
    colors: [0x9be8ff, 0x62c4ff, 0xffffff],
    size: 0.13,
    lifetime: 0.85,
    rise: 0.25,
    spread: 0.3,
  },
  poison: {
    colors: [0x59d13a, 0x2e8b22, 0x9bff5a],
    size: 0.15,
    lifetime: 0.7,
    rise: 0.7,
    spread: 0.28,
  },
  lightning: {
    colors: [0xffef5a, 0xfff7b0, 0x9adfff],
    size: 0.1,
    lifetime: 0.3,
    rise: 0.4,
    spread: 0.42,
    jitter: true,
  },
  shadow: {
    colors: [0x35244d, 0x1a1424, 0x0d0d14],
    size: 0.2,
    lifetime: 0.95,
    rise: 0.35,
    spread: 0.3,
  },
  rainbow: {
    rainbow: true,
    size: 0.15,
    lifetime: 0.7,
    rise: 0.8,
    spread: 0.3,
  },
};

export function getTrailDefinitions(accessoryIds = []) {
  return accessoryIds.map((id) => TRAIL_DEFS[id]).filter(Boolean);
}

const particleGeometry = new THREE.BoxGeometry(1, 1, 1);
const SPAWN_INTERVAL = 0.055;

export class TrailEmitter {
  constructor(scene, defs) {
    this.scene = scene;
    this.defs = defs;
    this.particles = [];
    this.spawnTimer = 0;
    this.time = 0;
  }

  update(delta, position, isMoving) {
    this.time += delta;

    if (isMoving && this.defs.length > 0) {
      this.spawnTimer -= delta;
      while (this.spawnTimer <= 0) {
        this.spawnTimer += SPAWN_INTERVAL;
        for (const def of this.defs) {
          this._spawn(def, position);
        }
      }
    } else {
      this.spawnTimer = 0;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= delta;
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        particle.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      const progress = particle.life / particle.maxLife;
      particle.mesh.position.addScaledVector(particle.velocity, delta);
      if (particle.jitter) {
        particle.mesh.position.x += (Math.random() - 0.5) * 0.07;
        particle.mesh.position.z += (Math.random() - 0.5) * 0.07;
      }
      particle.mesh.material.opacity = progress;
      particle.mesh.scale.setScalar(particle.size * (0.35 + 0.65 * progress));
      particle.mesh.rotation.y += delta * 3;
      particle.mesh.rotation.x += delta * 2;
    }
  }

  _spawn(def, position) {
    const color = new THREE.Color();
    if (def.rainbow) {
      color.setHSL((this.time * 0.5) % 1, 1, 0.55);
    } else {
      color.set(def.colors[Math.floor(Math.random() * def.colors.length)]);
    }
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(particleGeometry, material);
    mesh.position.set(
      position.x + (Math.random() - 0.5) * def.spread * 2,
      0.12 + Math.random() * 0.12,
      position.z + (Math.random() - 0.5) * def.spread * 2
    );
    mesh.scale.setScalar(def.size);
    mesh.rotation.y = Math.random() * Math.PI;
    this.scene.add(mesh);
    this.particles.push({
      mesh,
      life: def.lifetime,
      maxLife: def.lifetime,
      size: def.size,
      jitter: def.jitter === true,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.35,
        def.rise,
        (Math.random() - 0.5) * 0.35
      ),
    });
  }

  dispose() {
    for (const particle of this.particles) {
      this.scene.remove(particle.mesh);
      particle.mesh.material.dispose();
    }
    this.particles = [];
  }
}
