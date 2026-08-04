import * as THREE from "three";
import { audio } from "./AudioEngine.js";
import { Projectile } from "../objects/Projectile.js";
import { PROJECTILE_SPEED_BASE } from "../constants.js";

const LOADOUT_KEY = "balacoro_powers";

function solveInterceptTime(toTargetX, toTargetZ, velX, velZ, projectileSpeed) {
  const a = velX * velX + velZ * velZ - projectileSpeed * projectileSpeed;
  const b = 2 * (toTargetX * velX + toTargetZ * velZ);
  const c = toTargetX * toTargetX + toTargetZ * toTargetZ;

  if (Math.abs(a) < 1e-6) {
    if (Math.abs(b) < 1e-6) {
      return null;
    }
    const t = -c / b;
    return t > 0 ? t : null;
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return null;
  }
  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);
  const validTimes = [t1, t2].filter((t) => t > 0);
  return validTimes.length > 0 ? Math.min(...validTimes) : null;
}

function calculateLeadDirection(
  shooterPos,
  targetPos,
  targetVelocity,
  projectileSpeed
) {
  const toTargetX = targetPos.x - shooterPos.x;
  const toTargetZ = targetPos.z - shooterPos.z;
  const interceptTime = solveInterceptTime(
    toTargetX,
    toTargetZ,
    targetVelocity.x,
    targetVelocity.z,
    projectileSpeed
  );
  const leadTime = interceptTime != null ? Math.min(interceptTime, 1.5) : 0;
  const direction = new THREE.Vector3(
    toTargetX + targetVelocity.x * leadTime,
    0,
    toTargetZ + targetVelocity.z * leadTime
  );
  if (direction.lengthSq() < 0.0001) {
    direction.set(toTargetX, 0, toTargetZ);
  }
  return direction.normalize();
}

export const POWER_DEFS = {
  energyExplosion: {
    label: "ENERGY NOVA",
    emoji: "💥",
    icon: "./assets/imgs/explosion.png",
    price: 0,
    sound: "skillEnergyExplosion",
    description: "Shockwave that expands from you, damaging everything it touches.",
    skill: {
      enabled: false,
      cooldown: 15,
      damage: 1,
      range: 2,
      growthCooldown: -0.5,
      growthDamage: 0.4,
      growthRange: 0.5,
      maxCooldown: 4,
    },
  },
  freezeExplosion: {
    label: "FROST NOVA",
    emoji: "❄️",
    icon: "./assets/imgs/freeze.png",
    price: 0,
    sound: "skillFreezeExplosion",
    description: "Freezes every enemy inside the ring for a few seconds.",
    skill: {
      enabled: false,
      cooldown: 15,
      duration: 5,
      range: 3,
      growthCooldown: -0.5,
      growthRange: 0.5,
      growthDuration: 0.2,
      maxCooldown: 3,
    },
  },
  ringShot: {
    label: "BULLET RING",
    emoji: "✸",
    icon: "./assets/imgs/bulletring.png",
    price: 200000,
    description: "Fires a full circle of projectiles around you.",
    skill: {
      enabled: false,
      cooldown: 12,
      damage: 1,
      count: 16,
      growthCooldown: -0.5,
      growthDamage: 0.4,
      maxCooldown: 4,
    },
  },
  shockwave: {
    label: "SHOCKWAVE",
    emoji: "🌀",
    icon: "./assets/imgs/shockwave.png",
    price: 250000,
    description: "Knocks nearby enemies far away with light damage.",
    skill: {
      enabled: false,
      cooldown: 10,
      damage: 0.5,
      range: 6,
      growthCooldown: -0.5,
      growthDamage: 0.2,
      growthRange: 0.5,
      maxCooldown: 3,
    },
  },
  poisonCloud: {
    label: "POISON CLOUD",
    emoji: "☠️",
    icon: "./assets/imgs/poisoncloud.png",
    price: 300000,
    description: "Leaves a toxic cloud that damages enemies inside over time.",
    skill: {
      enabled: false,
      cooldown: 16,
      damage: 0.6,
      range: 4,
      duration: 6,
      growthCooldown: -0.5,
      growthDamage: 0.3,
      growthDuration: 0.5,
      maxCooldown: 5,
    },
  },
  lightningStrike: {
    label: "THUNDERSTRIKE",
    emoji: "⚡",
    icon: "./assets/imgs/thunderstrike.png",
    price: 350000,
    description: "Bolts strike the closest enemies from the sky.",
    skill: {
      enabled: false,
      cooldown: 13,
      damage: 3,
      count: 6,
      range: 18,
      growthCooldown: -0.5,
      growthDamage: 1,
      maxCooldown: 4,
    },
  },
  slowField: {
    label: "TIME WARP",
    emoji: "⏳",
    icon: "./assets/imgs/timewarp.png",
    price: 400000,
    description: "Slows every enemy around you to a crawl.",
    skill: {
      enabled: false,
      cooldown: 18,
      duration: 5,
      range: 14,
      growthCooldown: -0.5,
      growthDuration: 0.5,
      maxCooldown: 6,
    },
  },
  healBurst: {
    label: "HEAL BURST",
    emoji: "💚",
    icon: "./assets/imgs/healburst.png",
    price: 500000,
    description: "Instantly restores a chunk of your health.",
    skill: {
      enabled: false,
      cooldown: 25,
      healPercent: 0.25,
      growthCooldown: -1,
      maxCooldown: 10,
    },
  },
  boomerang: {
    label: "BOOMERANG",
    emoji: "🪃",
    icon: "./assets/imgs/boomerang.png",
    price: 600000,
    description: "A giant blade flies out and comes back, cutting everything.",
    skill: {
      enabled: false,
      cooldown: 11,
      damage: 2,
      range: 14,
      growthCooldown: -0.5,
      growthDamage: 0.6,
      growthRange: 1,
      maxCooldown: 4,
    },
  },
  meteor: {
    label: "METEOR RAIN",
    emoji: "☄️",
    icon: "./assets/imgs/meteorrain.png",
    price: 750000,
    description: "Meteors crash around you, exploding on impact.",
    skill: {
      enabled: false,
      cooldown: 20,
      damage: 4,
      count: 5,
      range: 10,
      growthCooldown: -0.5,
      growthDamage: 1,
      maxCooldown: 6,
    },
  },
  turret: {
    label: "SENTRY",
    emoji: "🗼",
    icon: "./assets/imgs/sentry.png",
    price: 800000,
    description: "Deploys a turret that shoots the nearest enemy.",
    skill: {
      enabled: false,
      cooldown: 22,
      damage: 1,
      duration: 8,
      growthCooldown: -0.5,
      growthDamage: 0.4,
      growthDuration: 1,
      maxCooldown: 8,
    },
  },
  blackHole: {
    label: "BLACK HOLE",
    emoji: "🕳️",
    icon: "./assets/imgs/blackrole.png",
    price: 1000000,
    description: "Pulls enemies into a crushing void that grinds them down.",
    skill: {
      enabled: false,
      cooldown: 24,
      damage: 0.8,
      range: 12,
      duration: 3,
      growthCooldown: -0.5,
      growthDamage: 0.3,
      growthDuration: 0.4,
      growthRange: 1.5,
      maxCooldown: 8,
      maxRange: 24,
    },
  },
};

export const POWER_IDS = Object.keys(POWER_DEFS);
export const DEFAULT_LOADOUT = { q: "freezeExplosion", e: "energyExplosion" };

export function loadPowerLoadout() {
  try {
    const stored = JSON.parse(localStorage.getItem(LOADOUT_KEY));
    const valid = (id) => POWER_DEFS[id] != null;
    return {
      q: valid(stored?.q) ? stored.q : DEFAULT_LOADOUT.q,
      e: valid(stored?.e) ? stored.e : DEFAULT_LOADOUT.e,
    };
  } catch {
    return { ...DEFAULT_LOADOUT };
  }
}

export function savePowerLoadout(loadout) {
  try {
    localStorage.setItem(LOADOUT_KEY, JSON.stringify(loadout));
  } catch {
    return;
  }
}

function flatRingMesh(color) {
  return new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.3, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
}

export function spawnRingWave(scene, origin, options) {
  const {
    maxRadius,
    duration = 0.7,
    color,
    bandWidth = 0.45,
    onWaveHit = null,
  } = options;
  const mesh = flatRingMesh(color);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(origin.x, 0.05, origin.z);
  scene.add(mesh);
  const hitEnemies = new Set();
  let time = 0;

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      const t = Math.min(time / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const radius = 0.2 + eased * maxRadius;
      mesh.geometry.dispose();
      mesh.geometry = new THREE.RingGeometry(
        Math.max(radius - bandWidth, 0.05),
        radius,
        48
      );
      mesh.material.opacity = 0.85 * (1 - t * t);
      if (onWaveHit) {
        for (const enemy of scene.enemies) {
          if (hitEnemies.has(enemy) || enemy.isDying) {
            continue;
          }
          if (enemy.position.distanceTo(origin) <= radius) {
            hitEnemies.add(enemy);
            onWaveHit(enemy);
          }
        }
      }
      return t < 1;
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    },
  });
}

export function spawnFlash(scene, origin, color, maxScale = 2.5, duration = 0.25) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(origin.x, 0.04, origin.z);
  mesh.scale.setScalar(0.1);
  scene.add(mesh);
  let time = 0;

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      const t = Math.min(time / duration, 1);
      mesh.scale.setScalar(0.1 + t * maxScale);
      mesh.material.opacity = 0.5 * (1 - t);
      return t < 1;
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    },
  });
}

function firePlayerProjectile(player, scene, direction, damage) {
  const projectile = new Projectile(
    player.position.clone(),
    direction,
    player.speed + PROJECTILE_SPEED_BASE,
    undefined,
    damage,
    player.projectGlowing,
    1,
    player.projectileColor,
    false
  );
  scene.add(projectile);
  scene.projectiles?.push(projectile);
}

function performEnergyExplosion(player, scene, skill) {
  spawnFlash(scene, player.position, 0xff8844, (skill.range ?? 2) * 0.6, 0.2);
  spawnRingWave(scene, player.position.clone(), {
    maxRadius: skill.range ?? 2,
    duration: 0.7,
    color: 0xff5533,
    onWaveHit: (enemy) => enemy.hit(skill.damage ?? 1),
  });
}

function performRingShot(player, scene, skill) {
  audio.play("powerBulletRing", { position: player.position });
  const count = skill.count ?? 16;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    firePlayerProjectile(player, scene, direction, skill.damage ?? 1);
  }
}

function performShockwave(player, scene, skill) {
  audio.play("powerShockwave", { position: player.position });
  const range = skill.range ?? 6;
  spawnRingWave(scene, player.position.clone(), {
    maxRadius: range,
    duration: 0.5,
    color: 0x88ddff,
    bandWidth: 0.6,
    onWaveHit: (enemy) => {
      enemy.hit(skill.damage ?? 0.5);
      const push = new THREE.Vector3()
        .subVectors(enemy.position, player.position)
        .setY(0);
      if (push.lengthSq() > 0.0001) {
        enemy.position.addScaledVector(push.normalize(), 5);
      }
    },
  });
}

function performPoisonCloud(player, scene, skill) {
  const range = skill.range ?? 4;
  const duration = skill.duration ?? 6;
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(range, 40),
    new THREE.MeshBasicMaterial({
      color: 0x3fae2a,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(player.position.x, 0.05, player.position.z);
  scene.add(mesh);
  const origin = player.position.clone();
  let time = 0;
  let tickTimer = 0;
  const soundHandle = audio.playHandle("powerPoisonCloud", {
    position: origin,
  });

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      tickTimer -= delta;
      mesh.material.opacity =
        0.3 * Math.min(1, (duration - time) / 1.2) *
        (0.85 + Math.sin(time * 5) * 0.15);
      if (tickTimer <= 0) {
        tickTimer = 0.5;
        for (const enemy of scene.enemies) {
          if (enemy.isDying) {
            continue;
          }
          if (enemy.position.distanceTo(origin) <= range) {
            enemy.hit(skill.damage ?? 0.6);
          }
        }
      }
      return time < duration;
    },
    dispose() {
      soundHandle.stop(0.4);
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    },
  });
}

function performLightningStrike(player, scene, skill) {
  const range = skill.range ?? 18;
  const targets = scene.enemies
    .filter(
      (enemy) =>
        !enemy.isDying && enemy.position.distanceTo(player.position) <= range
    )
    .sort(
      (a, b) =>
        a.position.distanceToSquared(player.position) -
        b.position.distanceToSquared(player.position)
    )
    .slice(0, skill.count ?? 6);

  const bolts = [];
  for (const enemy of targets) {
    enemy.hit(skill.damage ?? 3);
    audio.play("powerThunderstrike", { position: enemy.position });
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.16, 14, 5),
      new THREE.MeshBasicMaterial({
        color: 0x4db8ff,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      })
    );
    bolt.position.set(enemy.position.x, 7, enemy.position.z);
    scene.add(bolt);
    bolts.push(bolt);
    spawnFlash(scene, enemy.position, 0x4db8ff, 1.6, 0.3);
  }
  let time = 0;

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      const t = Math.min(time / 0.28, 1);
      for (const bolt of bolts) {
        bolt.material.opacity = 0.95 * (1 - t);
        bolt.scale.x = 1 - t * 0.6;
        bolt.scale.z = 1 - t * 0.6;
      }
      return t < 1;
    },
    dispose() {
      for (const bolt of bolts) {
        scene.remove(bolt);
        bolt.geometry.dispose();
        bolt.material.dispose();
      }
    },
  });
}

function performSlowField(player, scene, skill) {
  audio.play("powerTimeWarp", { position: player.position });
  const range = skill.range ?? 14;
  const duration = skill.duration ?? 5;
  spawnRingWave(scene, player.position.clone(), {
    maxRadius: range,
    duration: 0.6,
    color: 0xb9a7ff,
    bandWidth: 0.8,
    onWaveHit: (enemy) => {
      enemy.slowTimer = Math.max(enemy.slowTimer ?? 0, duration);
    },
  });
}

function performHealBurst(player, scene, skill) {
  audio.play("powerHealBurst", { position: player.position });
  const healAmount = player.maxHealth * (skill.healPercent ?? 0.25);
  player.health = Math.min(player.health + healAmount, player.maxHealth);
  spawnRingWave(scene, player.position.clone(), {
    maxRadius: 2.5,
    duration: 0.6,
    color: 0x4dff88,
    bandWidth: 0.5,
  });
  spawnFlash(scene, player.position, 0x4dff88, 1.6, 0.35);
}

const BOOMERANG_COLOR = 0xd8ecf5;
const BOOMERANG_EMISSIVE = 0x2f7fa8;
const boomerangParticleGeometry = new THREE.BoxGeometry(0.09, 0.09, 0.09);

function spawnBoomerangParticle(scene, position, particles) {
  const material = new THREE.MeshBasicMaterial({ color: BOOMERANG_COLOR });
  const particle = new THREE.Mesh(boomerangParticleGeometry, material);
  particle.position.copy(position);
  particle.position.x += (Math.random() - 0.5) * 0.35;
  particle.position.y += (Math.random() - 0.5) * 0.2;
  particle.position.z += (Math.random() - 0.5) * 0.35;
  const angle = Math.random() * Math.PI * 2;
  const spd = 0.8 + Math.random() * 1.4;
  particle.userData.velocity = new THREE.Vector3(
    Math.cos(angle) * spd,
    0.6 + Math.random() * 1.2,
    Math.sin(angle) * spd
  );
  particle.userData.life = 0.3;
  particle.userData.maxLife = 0.3;
  scene.add(particle);
  particles.push(particle);
}

function performBoomerang(player, scene, skill) {
  const range = skill.range ?? 14;
  const direction = player.lastDirection.clone().setY(0);
  if (direction.lengthSq() === 0) {
    direction.set(1, 0, 0);
  }
  direction.normalize();

  const blade = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.12, 6, 12, Math.PI * 1.4),
    new THREE.MeshStandardMaterial({
      color: BOOMERANG_COLOR,
      emissive: BOOMERANG_EMISSIVE,
      emissiveIntensity: 0.7,
      flatShading: true,
      metalness: 0.55,
      roughness: 0.25,
    })
  );
  blade.rotation.x = Math.PI / 2;
  blade.position.copy(player.position).setY(0.7);
  scene.add(blade);

  const particles = [];
  let particleTimer = 0;

  const origin = player.position.clone();
  const hitOutward = new Set();
  const hitReturn = new Set();
  let traveled = 0;
  let returning = false;
  const speed = 17;
  const soundHandle = audio.playHandle("powerBoomerang", {
    position: blade.position,
  });

  scene.addPowerEffect({
    update(delta) {
      blade.rotation.z += delta * 14;
      soundHandle.setPosition(blade.position);
      const step = speed * delta;
      if (!returning) {
        blade.position.addScaledVector(direction, step);
        traveled += step;
        if (traveled >= range) {
          returning = true;
        }
      } else {
        const toPlayer = new THREE.Vector3()
          .subVectors(player.position, blade.position)
          .setY(0);
        const dist = toPlayer.length();
        if (dist <= step + 0.6) {
          return false;
        }
        blade.position.addScaledVector(toPlayer.normalize(), step);
      }
      const hitSet = returning ? hitReturn : hitOutward;
      for (const enemy of scene.enemies) {
        if (enemy.isDying || hitSet.has(enemy)) {
          continue;
        }
        const reach = 1 + enemy.hitboxRadius;
        if (
          enemy.position.distanceToSquared(blade.position) <
          reach * reach
        ) {
          hitSet.add(enemy);
          enemy.hit(skill.damage ?? 2);
        }
      }

      particleTimer += delta;
      while (particleTimer > 0.02) {
        particleTimer -= 0.02;
        spawnBoomerangParticle(scene, blade.position, particles);
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.userData.life -= delta;
        if (particle.userData.life <= 0) {
          scene.remove(particle);
          particle.material.dispose();
          particles.splice(i, 1);
          continue;
        }
        particle.userData.velocity.y -= 5 * delta;
        particle.position.addScaledVector(particle.userData.velocity, delta);
        particle.scale.setScalar(particle.userData.life / particle.userData.maxLife);
      }

      return true;
    },
    dispose() {
      soundHandle.stop(0.15);
      scene.remove(blade);
      blade.geometry.dispose();
      blade.material.dispose();
      for (const particle of particles) {
        scene.remove(particle);
        particle.material.dispose();
      }
      particles.length = 0;
    },
  });
}

function performMeteor(player, scene, skill) {
  const range = skill.range ?? 10;
  const meteors = [];
  for (let i = 0; i < (skill.count ?? 5); i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 2 + Math.random() * (range - 2);
    const target = new THREE.Vector3(
      player.position.x + Math.cos(angle) * dist,
      0,
      player.position.z + Math.sin(angle) * dist
    );
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.55, 0),
      new THREE.MeshBasicMaterial({ color: 0xff6a2a })
    );
    rock.position.set(target.x, 16 + i * 4, target.z);
    scene.add(rock);
    meteors.push({ rock, target, done: false });
  }

  scene.addPowerEffect({
    update(delta) {
      let alive = false;
      for (const meteorEntry of meteors) {
        if (meteorEntry.done) {
          continue;
        }
        meteorEntry.rock.position.y -= 24 * delta;
        meteorEntry.rock.rotation.x += delta * 6;
        meteorEntry.rock.rotation.z += delta * 4;
        if (meteorEntry.rock.position.y <= 0.4) {
          meteorEntry.done = true;
          scene.remove(meteorEntry.rock);
          meteorEntry.rock.geometry.dispose();
          meteorEntry.rock.material.dispose();
          audio.play("powerMeteorImpact", { position: meteorEntry.target });
          spawnFlash(scene, meteorEntry.target, 0xff8844, 2.6, 0.3);
          spawnRingWave(scene, meteorEntry.target, {
            maxRadius: 3,
            duration: 0.4,
            color: 0xff5533,
            onWaveHit: (enemy) => enemy.hit(skill.damage ?? 4),
          });
        } else {
          alive = true;
        }
      }
      return alive;
    },
    dispose() {
      for (const meteorEntry of meteors) {
        if (!meteorEntry.done) {
          scene.remove(meteorEntry.rock);
          meteorEntry.rock.geometry.dispose();
          meteorEntry.rock.material.dispose();
        }
      }
    },
  });
}

const SENTRY_ARRIVE_DURATION = 1.3;
const SENTRY_DEPART_DURATION = 0.9;
const SENTRY_DROP_HEIGHT = 13;
const SENTRY_BEAM_COLOR = 0x33e0ff;
const SENTRY_BEAM_HEIGHT = SENTRY_DROP_HEIGHT + 3;
const SENTRY_SETTLE_DURATION = 0.18;

function createSentryBeam(scene, position) {
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.6, SENTRY_BEAM_HEIGHT, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: SENTRY_BEAM_COLOR,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  beam.position.set(position.x, SENTRY_BEAM_HEIGHT / 2, position.z);
  scene.add(beam);
  return beam;
}

function disposeSentryBeam(scene, beam) {
  if (!beam) {
    return;
  }
  scene.remove(beam);
  beam.geometry.dispose();
  beam.material.dispose();
}

function spawnMuzzleFlash(scene, position) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 6),
    new THREE.MeshBasicMaterial({
      color: 0xffb347,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    })
  );
  mesh.position.copy(position);
  scene.add(mesh);
  let time = 0;
  const duration = 0.09;

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      const t = Math.min(time / duration, 1);
      mesh.scale.setScalar(1 + t * 2.2);
      mesh.material.opacity = 0.9 * (1 - t);
      return t < 1;
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    },
  });
}

function buildSentryModel() {
  const group = new THREE.Group();

  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x2f333a,
    flatShading: true,
    metalness: 0.5,
    roughness: 0.55,
  });
  const midMetal = new THREE.MeshStandardMaterial({
    color: 0x767e87,
    flatShading: true,
    metalness: 0.45,
    roughness: 0.45,
  });
  const lightMetal = new THREE.MeshStandardMaterial({
    color: 0xc7ccd1,
    flatShading: true,
    metalness: 0.4,
    roughness: 0.4,
  });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x33e0ff,
    emissive: 0x33e0ff,
    emissiveIntensity: 1.8,
    flatShading: true,
  });
  const barrelMaterial = new THREE.MeshStandardMaterial({
    color: 0x50565e,
    flatShading: true,
    metalness: 0.55,
    roughness: 0.4,
  });

  const treadBase = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.2, 0.78), darkMetal);
  treadBase.position.y = 0.14;

  const treadTop = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.14, 0.62), midMetal);
  treadTop.position.y = 0.3;

  const treadStripe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.5), lightMetal);
  treadStripe.position.y = 0.37;

  group.add(treadBase, treadTop, treadStripe);

  const head = new THREE.Group();
  head.position.y = 0.6;

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), midMetal);
  const chassisStripe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.3), lightMetal);
  chassisStripe.position.y = 0.08;

  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.06), eyeMaterial);
  eye.position.set(0, -0.02, 0.28);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.075, 0.55, 8),
    barrelMaterial
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, 0.5);

  const barrelTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8),
    darkMetal
  );
  barrelTip.rotation.x = Math.PI / 2;
  barrelTip.position.set(0, 0, 0.76);

  head.add(chassis, chassisStripe, eye, barrel, barrelTip);
  group.add(head);

  return {
    group,
    head,
    barrelLocalTip: new THREE.Vector3(0, 0, 0.82),
    parts: [treadBase, treadTop, treadStripe, chassis, chassisStripe, eye, barrel, barrelTip],
  };
}

function disposeSentryModel(scene, group, parts) {
  scene.remove(group);
  for (const part of parts) {
    part.geometry.dispose();
    part.material.dispose();
  }
}

function performTurret(player, scene, skill) {
  const duration = skill.duration ?? 8;
  const { group, head, barrelLocalTip, parts } = buildSentryModel();
  group.position.copy(player.position);
  group.position.y = SENTRY_DROP_HEIGHT;
  scene.add(group);

  let beam = createSentryBeam(scene, player.position);
  audio.play("powerSentryDeploy", { position: player.position });

  let phase = "arrive";
  let phaseTime = 0;
  let activeTime = 0;
  let settleTime = 0;
  let fireTimer = 0;
  let idleTimer = audio.repository.rollRandomInterval("powerSentryIdle") ?? 5;

  scene.addPowerEffect({
    update(delta) {
      if (phase === "arrive") {
        phaseTime += delta;
        const t = Math.min(phaseTime / SENTRY_ARRIVE_DURATION, 1);
        const eased = 1 - (1 - t) * (1 - t);
        group.position.y = SENTRY_DROP_HEIGHT * (1 - eased);
        group.rotation.y += delta * 5;
        beam.rotation.y += delta * 2.5;
        if (t >= 1) {
          group.position.y = 0;
          group.rotation.y = 0;
          disposeSentryBeam(scene, beam);
          beam = null;
          spawnFlash(scene, group.position, SENTRY_BEAM_COLOR, 2.2, 0.3);
          spawnRingWave(scene, group.position.clone(), {
            maxRadius: 1.8,
            duration: 0.4,
            color: SENTRY_BEAM_COLOR,
            bandWidth: 0.5,
          });
          phase = "active";
          phaseTime = 0;
          settleTime = 0;
        }
        return true;
      }

      if (phase === "active") {
        activeTime += delta;
        settleTime = Math.min(settleTime + delta, SENTRY_SETTLE_DURATION);
        const settleT = settleTime / SENTRY_SETTLE_DURATION;
        const squash = 1 - Math.sin(settleT * Math.PI) * 0.22;
        group.scale.set(1 / squash, squash, 1 / squash);

        fireTimer -= delta;
        idleTimer -= delta;
        if (idleTimer <= 0) {
          idleTimer = audio.repository.rollRandomInterval("powerSentryIdle") ?? 5;
          audio.play("powerSentryIdle", { position: group.position });
        }
        if (fireTimer <= 0) {
          fireTimer = 0.5;
          let nearest = null;
          let nearestDistSq = 25 * 25;
          for (const enemy of scene.enemies) {
            if (enemy.isDying || enemy.isDormant) {
              continue;
            }
            const distSq = enemy.position.distanceToSquared(group.position);
            if (distSq < nearestDistSq) {
              nearestDistSq = distSq;
              nearest = enemy;
            }
          }
          if (nearest) {
            const projectileSpeed = PROJECTILE_SPEED_BASE + 6;
            const direction = calculateLeadDirection(
              group.position,
              nearest.position,
              nearest.velocity ?? new THREE.Vector3(),
              projectileSpeed
            );
            const headWorldY = head.getWorldPosition(new THREE.Vector3()).y;
            head.lookAt(
              group.position.x + direction.x,
              headWorldY,
              group.position.z + direction.z
            );
            const projectile = new Projectile(
              group.position.clone(),
              direction,
              projectileSpeed,
              undefined,
              skill.damage ?? 1,
              false,
              1,
              player.projectileColor,
              false
            );
            scene.add(projectile);
            scene.projectiles?.push(projectile);
            audio.play("powerSentryFire", { position: group.position });
            spawnMuzzleFlash(scene, head.localToWorld(barrelLocalTip.clone()));
          }
        }
        if (activeTime >= duration) {
          phase = "depart";
          phaseTime = 0;
          group.scale.set(1, 1, 1);
          beam = createSentryBeam(scene, group.position);
          spawnFlash(scene, group.position, SENTRY_BEAM_COLOR, 2.2, 0.3);
          spawnRingWave(scene, group.position.clone(), {
            maxRadius: 1.8,
            duration: 0.4,
            color: SENTRY_BEAM_COLOR,
            bandWidth: 0.5,
          });
          audio.play("powerSentryUndeploy", { position: group.position });
        }
        return true;
      }

      phaseTime += delta;
      const t = Math.min(phaseTime / SENTRY_DEPART_DURATION, 1);
      const eased = t * t;
      group.position.y = SENTRY_DROP_HEIGHT * eased;
      group.scale.setScalar(Math.max(1 - eased * 0.5, 0.4));
      group.rotation.y += delta * 5;
      if (beam) {
        beam.rotation.y += delta * 2.5;
      }
      return t < 1;
    },
    dispose() {
      disposeSentryBeam(scene, beam);
      disposeSentryModel(scene, group, parts);
    },
  });
}

function performBlackHole(player, scene, skill) {
  const range = skill.range ?? 12;
  const duration = skill.duration ?? 3;
  const baseRange = POWER_DEFS.blackHole.skill.range;
  const sizeScale = 1 + Math.max(0, range - baseRange) * 0.02;
  const direction = player.lastDirection.clone().setY(0);
  if (direction.lengthSq() === 0) {
    direction.set(1, 0, 0);
  }
  const center = player.position
    .clone()
    .addScaledVector(direction.normalize(), 5);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.7 * sizeScale, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  core.position.set(center.x, 1, center.z);
  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(1.1 * sizeScale, 16, 12),
    new THREE.MeshBasicMaterial({
      color: 0x7733ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  core.add(aura);
  scene.add(core);

  let time = 0;
  let tickTimer = 0;
  let fadingOut = false;
  const soundHandle = audio.playHandle("powerBlackHole", {
    position: core.position,
    fadeInSeconds: 0.6,
  });

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      tickTimer -= delta;
      core.rotation.y += delta * 3;
      aura.scale.setScalar(1 + Math.sin(time * 8) * 0.12);
      for (const enemy of scene.enemies) {
        if (enemy.isDying || enemy.isDormant) {
          continue;
        }
        const pull = new THREE.Vector3()
          .subVectors(center, enemy.position)
          .setY(0);
        const dist = pull.length();
        if (dist < range && dist > 0.4) {
          const strength = enemy.isBoss ? 2.5 : 7;
          enemy.position.addScaledVector(pull.normalize(), strength * delta);
        }
      }
      if (tickTimer <= 0) {
        tickTimer = 0.5;
        for (const enemy of scene.enemies) {
          if (enemy.isDying) {
            continue;
          }
          if (enemy.position.distanceTo(center) <= 2) {
            enemy.hit(skill.damage ?? 0.8);
          }
        }
      }
      if (time > duration - 0.4) {
        core.scale.setScalar(Math.max((duration - time) / 0.4, 0.01));
        if (!fadingOut) {
          fadingOut = true;
          soundHandle.stop(0.4);
        }
      }
      return time < duration;
    },
    dispose() {
      if (!fadingOut) {
        soundHandle.stop(0.2);
      }
      scene.remove(core);
      core.geometry.dispose();
      core.material.dispose();
      aura.geometry.dispose();
      aura.material.dispose();
    },
  });
}

const POWER_PERFORMERS = {
  energyExplosion: performEnergyExplosion,
  ringShot: performRingShot,
  shockwave: performShockwave,
  poisonCloud: performPoisonCloud,
  lightningStrike: performLightningStrike,
  slowField: performSlowField,
  healBurst: performHealBurst,
  boomerang: performBoomerang,
  meteor: performMeteor,
  turret: performTurret,
  blackHole: performBlackHole,
};

export function performPower(powerId, player) {
  const scene = player.parent;
  const skill = player.active_skills[powerId];
  const def = POWER_DEFS[powerId];
  if (!scene?.addPowerEffect || !skill || !def) {
    return;
  }
  audio.play(def.sound ?? "skillEnergyExplosion");
  if (powerId === "freezeExplosion") {
    player.performFreezeExplosion();
    return;
  }
  POWER_PERFORMERS[powerId]?.(player, scene, skill);
}
