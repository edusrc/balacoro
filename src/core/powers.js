import * as THREE from "three";
import { audio } from "./AudioEngine.js";
import { Projectile } from "../objects/Projectile.js";
import { PROJECTILE_SPEED_BASE } from "../constants.js";
import {
  fxSystem,
  emitBurst,
  shake,
  spread,
  between,
  spawnExplosion,
  spawnExpandingSphere,
  spawnGroundRing,
  spawnGroundGlow,
  spawnLightPillar,
  spawnScorch,
} from "./powerFx.js";

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
      growthRange: 0.5,
      maxCooldown: 8,
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
    false,
    player.shotShape
  );
  scene.add(projectile);
  scene.projectiles?.push(projectile);
}

function pushAway(enemy, origin, force) {
  const push = new THREE.Vector3().subVectors(enemy.position, origin).setY(0);
  if (push.lengthSq() > 0.0001) {
    enemy.applyKnockback?.(push.normalize(), force);
  }
}

function playDelayed(scene, name, delay, options) {
  let time = 0;
  scene.addPowerEffect({
    update(delta) {
      time += delta;
      if (time >= delay) {
        audio.play(name, options);
        return false;
      }
      return true;
    },
  });
}

export function spawnFrostNova(scene, origin, radius) {
  audio.play("frostShatter");
  spawnExpandingSphere(scene, origin, {
    color: 0x7fe8ff,
    radius: radius * 0.9,
    duration: 0.4,
    opacity: 0.55,
    y: 0.5,
  });
  spawnGroundRing(scene, origin, { color: 0x9ff4ff, radius, duration: 0.45 });
  spawnScorch(scene, origin, radius * 0.9, 0xcff4ff, 1.8);
  emitBurst(scene, "shards", 22 + Math.round(radius * 4), () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = between(radius * 1.2, radius * 2.4);
    return {
      x: origin.x,
      y: 0.4,
      z: origin.z,
      vx: Math.cos(angle) * speed,
      vy: between(1.5, 4),
      vz: Math.sin(angle) * speed,
      gravity: 12,
      drag: 1.5,
      life: between(0.45, 0.75),
      size: between(0.14, 0.3),
      sizeEnd: 0.05,
      shapeY: 2.2,
      color: pickColor([0xffffff, 0xcff4ff, 0x8fe3ff]),
      spinX: spread(8),
      spinZ: spread(8),
      fadeOut: 0.4,
    };
  });
  emitBurst(scene, "smoke", 12, () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = between(0.3, radius * 0.8);
    return {
      x: origin.x + Math.cos(angle) * distance,
      y: 0.3,
      z: origin.z + Math.sin(angle) * distance,
      vx: Math.cos(angle) * 1.2,
      vy: between(0.3, 0.8),
      vz: Math.sin(angle) * 1.2,
      drag: 2,
      life: between(0.9, 1.4),
      size: 0.5,
      sizeEnd: 1.6,
      color: 0xe8f8ff,
      colorEnd: 0xbfe9ff,
      alpha: 0.5,
      fadeOut: 0.8,
    };
  });
  shake(scene, 0.2, 0.15);
}

function pickColor(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function performEnergyExplosion(player, scene, skill) {
  const range = skill.range ?? 2;
  const origin = player.position.clone();
  spawnExplosion(scene, origin, {
    radius: range,
    color: 0xff6a1f,
    hotColor: 0xfff1a8,
    power: 0.8 + range * 0.12,
  });
  spawnRingWave(scene, origin.clone(), {
    maxRadius: range,
    duration: 0.3,
    color: 0xff8a3d,
    bandWidth: 0.25,
    onWaveHit: (enemy) => {
      enemy.hit(skill.damage ?? 1);
      pushAway(enemy, origin, 10);
    },
  });
}

function performRingShot(player, scene, skill) {
  audio.play("powerBulletRing", { position: player.position });
  const count = skill.count ?? 16;
  const color = player.projectileColor ?? 0x00ff00;
  const origin = player.position.clone();
  spawnExpandingSphere(scene, origin, { color, radius: 1.3, duration: 0.2, opacity: 0.7 });
  spawnGroundRing(scene, origin, { color, radius: 2.4, duration: 0.3 });
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    firePlayerProjectile(player, scene, direction, skill.damage ?? 1);
    fxSystem(scene, "sparks").emit({
      x: origin.x + direction.x * 0.6,
      y: 0.7,
      z: origin.z + direction.z * 0.6,
      vx: direction.x * 6,
      vy: 0.5,
      vz: direction.z * 6,
      drag: 6,
      life: 0.18,
      size: 0.14,
      sizeEnd: 0.03,
      shapeZ: 2.5,
      rx: 0,
      ry: Math.PI / 2 - angle,
      rz: 0,
      color: 0xffffff,
      colorEnd: color,
      intensity: 2.4,
    });
  }
  shake(scene, 0.12, 0.08);
}

function performShockwave(player, scene, skill) {
  audio.play("powerShockwave", { position: player.position });
  const range = skill.range ?? 6;
  const origin = player.position.clone();
  spawnExpandingSphere(scene, origin, {
    color: 0x88ddff,
    radius: range,
    duration: 0.45,
    opacity: 0.45,
    dome: true,
  });
  spawnGroundRing(scene, origin, { color: 0xbfefff, radius: range, duration: 0.45 });
  emitBurst(scene, "smoke", 28, (index) => {
    const angle = (index / 28) * Math.PI * 2 + spread(0.1);
    return {
      x: origin.x + Math.cos(angle) * 0.8,
      y: 0.25,
      z: origin.z + Math.sin(angle) * 0.8,
      vx: Math.cos(angle) * range * 2.2,
      vy: between(0.2, 0.8),
      vz: Math.sin(angle) * range * 2.2,
      drag: 3.2,
      life: between(0.6, 0.9),
      size: 0.4,
      sizeEnd: 1.3,
      color: 0xb8a890,
      colorEnd: 0x8a7a68,
      alpha: 0.55,
      fadeOut: 0.7,
    };
  });
  shake(scene, 0.3, 0.3);
  spawnRingWave(scene, origin.clone(), {
    maxRadius: range,
    duration: 0.45,
    color: 0x88ddff,
    bandWidth: 0.35,
    onWaveHit: (enemy) => {
      enemy.hit(skill.damage ?? 0.5);
      pushAway(enemy, origin, 50);
      fxSystem(scene, "sparks").emit({
        x: enemy.position.x,
        y: 0.8,
        z: enemy.position.z,
        vy: 2,
        life: 0.25,
        size: 0.3,
        sizeEnd: 0.05,
        color: 0xdff8ff,
        intensity: 2,
      });
    },
  });
}

function performPoisonCloud(player, scene, skill) {
  const range = skill.range ?? 4;
  const duration = skill.duration ?? 6;
  const origin = player.position.clone();
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(range, 40),
    new THREE.MeshBasicMaterial({
      color: 0x2f7a1f,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(origin.x, 0.05, origin.z);
  scene.add(pool);
  const edge = new THREE.Mesh(
    new THREE.RingGeometry(range * 0.94, range, 48),
    new THREE.MeshBasicMaterial({
      color: 0x9bff5a,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  edge.rotation.x = -Math.PI / 2;
  edge.position.set(origin.x, 0.06, origin.z);
  scene.add(edge);

  let time = 0;
  let tickTimer = 0;
  let puffTimer = 0;
  let bubbleTimer = 0;
  const soundHandle = audio.playHandle("powerPoisonCloud", { position: origin });
  const randomPoint = () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * range * 0.9;
    return [origin.x + Math.cos(angle) * distance, origin.z + Math.sin(angle) * distance];
  };

  emitBurst(scene, "smoke", 18, () => {
    const angle = Math.random() * Math.PI * 2;
    return {
      x: origin.x,
      y: 0.4,
      z: origin.z,
      vx: Math.cos(angle) * range * 1.6,
      vy: between(0.3, 1),
      vz: Math.sin(angle) * range * 1.6,
      drag: 2.6,
      life: between(1, 1.6),
      size: 0.6,
      sizeEnd: 2,
      color: pickColor([0x5fbf3a, 0x3f8f2a, 0x7fd04a]),
      colorEnd: 0x2a5a1a,
      alpha: 0.55,
      fadeOut: 0.8,
    };
  });

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      tickTimer -= delta;
      puffTimer -= delta;
      bubbleTimer -= delta;
      const fade = Math.min(1, time / 0.4, (duration - time) / 1.2);
      pool.material.opacity = 0.32 * fade * (0.85 + Math.sin(time * 4) * 0.15);
      edge.material.opacity = 0.7 * fade * (0.6 + Math.sin(time * 6) * 0.4);

      if (puffTimer <= 0 && time < duration - 0.8) {
        puffTimer = 0.07;
        const [x, z] = randomPoint();
        fxSystem(scene, "smoke").emit({
          x,
          y: 0.2,
          z,
          vx: spread(0.3),
          vy: between(0.2, 0.6),
          vz: spread(0.3),
          wobble: 0.6,
          life: between(1.2, 1.8),
          size: 0.4,
          sizeEnd: between(1.4, 2.2),
          color: pickColor([0x5fbf3a, 0x3f8f2a, 0x7fd04a]),
          colorEnd: 0x2a5a1a,
          alpha: 0.42,
          fadeOut: 0.7,
        });
      }
      if (bubbleTimer <= 0 && time < duration - 0.5) {
        bubbleTimer = 0.12;
        const [x, z] = randomPoint();
        fxSystem(scene, "glow").emit({
          x,
          y: 0.1,
          z,
          vy: between(0.4, 0.9),
          life: between(0.5, 0.8),
          size: 0.08,
          sizeEnd: 0.3,
          color: 0x9bff5a,
          intensity: 1.6,
          fadeOut: 0.2,
        });
      }

      if (tickTimer <= 0) {
        tickTimer = 0.5;
        for (const enemy of scene.enemies) {
          if (enemy.isDying) {
            continue;
          }
          if (enemy.position.distanceTo(origin) <= range) {
            enemy.hit(skill.damage ?? 0.6);
            fxSystem(scene, "glow").emit({
              x: enemy.position.x,
              y: 1,
              z: enemy.position.z,
              vy: 1.2,
              life: 0.5,
              size: 0.2,
              sizeEnd: 0.05,
              color: 0x7fff3a,
              intensity: 1.8,
            });
          }
        }
      }
      return time < duration;
    },
    dispose() {
      soundHandle.stop(0.4);
      for (const mesh of [pool, edge]) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    },
  });
}

const boltSegmentGeometry = new THREE.BoxGeometry(1, 1, 1);

function buildBolt(scene, from, to, thickness) {
  const group = new THREE.Group();
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x4db8ff,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const addPath = (start, end, segments, jag, width) => {
    const points = [start.clone()];
    for (let i = 1; i < segments; i++) {
      const point = start.clone().lerp(end, i / segments);
      point.x += spread(jag);
      point.z += spread(jag);
      points.push(point);
    }
    points.push(end.clone());
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const length = a.distanceTo(b);
      for (const [material, scale] of [
        [coreMaterial, 1],
        [glowMaterial, 3.2],
      ]) {
        const segment = new THREE.Mesh(boltSegmentGeometry, material);
        segment.position.copy(a).lerp(b, 0.5);
        segment.lookAt(b);
        segment.scale.set(width * scale, width * scale, length);
        group.add(segment);
      }
    }
    return points;
  };
  const points = addPath(from, to, 8, 0.9, thickness);
  for (let branch = 0; branch < 2; branch++) {
    const start = points[2 + branch * 2];
    const end = start
      .clone()
      .add(new THREE.Vector3(spread(3), -between(2, 4), spread(3)));
    addPath(start, end, 3, 0.5, thickness * 0.6);
  }
  scene.add(group);
  return { group, materials: [coreMaterial, glowMaterial] };
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

  const strikes = targets.map((enemy, index) => ({ enemy, delay: index * 0.06, bolt: null, age: 0 }));
  let time = 0;
  let shook = false;

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      let alive = false;
      for (const strike of strikes) {
        if (!strike.bolt && time >= strike.delay) {
          const enemy = strike.enemy;
          const impact = enemy.position.clone();
          if (!enemy.isDying) {
            enemy.hit(skill.damage ?? 3);
          }
          audio.play("powerThunderstrike", { position: impact });
          strike.bolt = buildBolt(
            scene,
            new THREE.Vector3(impact.x + spread(2), 18, impact.z + spread(2)),
            new THREE.Vector3(impact.x, 0.4, impact.z),
            0.12
          );
          spawnExpandingSphere(scene, impact, { color: 0xbfe6ff, radius: 1.6, duration: 0.2, opacity: 0.9, y: 0.6 });
          spawnGroundRing(scene, impact, { color: 0x4db8ff, radius: 2, duration: 0.3 });
          spawnGroundGlow(scene, impact, 1.2, 0x4db8ff, 0.4, 2.2);
          spawnScorch(scene, impact, 0.8, 0x14161c, 1.8);
          emitBurst(scene, "sparks", 12, () => {
            const angle = Math.random() * Math.PI * 2;
            const speed = between(4, 9);
            return {
              x: impact.x,
              y: 0.4,
              z: impact.z,
              vx: Math.cos(angle) * speed,
              vy: between(2, 6),
              vz: Math.sin(angle) * speed,
              gravity: 14,
              life: between(0.25, 0.45),
              size: 0.08,
              sizeEnd: 0.02,
              shapeZ: 3,
              rx: 0,
              ry: Math.PI / 2 - angle,
              rz: 0,
              color: 0xffffff,
              colorEnd: 0x4db8ff,
              intensity: 2.6,
            };
          });
          if (!shook) {
            shook = true;
            shake(scene, 0.2, 0.2);
          }
        }
        if (strike.bolt) {
          strike.age += delta;
          const t = Math.min(strike.age / 0.32, 1);
          const flicker = Math.random() < 0.3 ? 0.35 : 1;
          strike.bolt.materials[0].opacity = (1 - t) * flicker;
          strike.bolt.materials[1].opacity = 0.6 * (1 - t) * flicker;
          if (t >= 1 && !strike.disposed) {
            strike.disposed = true;
            scene.remove(strike.bolt.group);
            strike.bolt.materials.forEach((material) => material.dispose());
          }
        }
        if (!strike.disposed) {
          alive = true;
        }
      }
      return alive;
    },
    dispose() {
      for (const strike of strikes) {
        if (strike.bolt && !strike.disposed) {
          scene.remove(strike.bolt.group);
          strike.bolt.materials.forEach((material) => material.dispose());
        }
      }
    },
  });
}

function performSlowField(player, scene, skill) {
  audio.play("powerTimeWarp", { position: player.position });
  const range = skill.range ?? 14;
  const duration = skill.duration ?? 5;
  const origin = player.position.clone();
  spawnExpandingSphere(scene, origin, {
    color: 0xb9a7ff,
    radius: range,
    duration: 0.6,
    opacity: 0.3,
    dome: true,
  });

  const clock = new THREE.Group();
  const clockMaterial = new THREE.MeshBasicMaterial({
    color: 0xd6c8ff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const face = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.5, 48), clockMaterial);
  face.rotation.x = -Math.PI / 2;
  clock.add(face);
  const tickGeometry = new THREE.BoxGeometry(0.1, 0.02, 0.45);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const tick = new THREE.Mesh(tickGeometry, clockMaterial);
    tick.position.set(Math.cos(angle) * 2, 0, Math.sin(angle) * 2);
    tick.rotation.y = -angle + Math.PI / 2;
    clock.add(tick);
  }
  const handGeometry = new THREE.BoxGeometry(0.12, 0.02, 1.8);
  handGeometry.translate(0, 0, 0.9);
  const hand = new THREE.Mesh(handGeometry, clockMaterial);
  clock.add(hand);
  clock.position.set(origin.x, 0.08, origin.z);
  scene.add(clock);

  let time = 0;
  let moteTimer = 0;
  let tickTimer = 0;
  const clockDuration = 1.4;

  spawnRingWave(scene, origin.clone(), {
    maxRadius: range,
    duration: 0.6,
    color: 0xb9a7ff,
    bandWidth: 0.5,
    onWaveHit: (enemy) => {
      enemy.slowTimer = Math.max(enemy.slowTimer ?? 0, duration);
    },
  });

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      moteTimer -= delta;
      if (clock.parent) {
        tickTimer -= delta;
        if (tickTimer <= 0 && time < clockDuration - 0.2) {
          tickTimer = 0.35;
          audio.play("timewarpTick");
        }
        const t = Math.min(time / clockDuration, 1);
        hand.rotation.y = -time * 9;
        clock.rotation.y = time * 0.8;
        clock.scale.setScalar(1 + t * 0.6);
        clockMaterial.opacity = 0.9 * (1 - t);
        if (t >= 1) {
          scene.remove(clock);
        }
      }
      if (moteTimer <= 0) {
        moteTimer = 0.2;
        for (const enemy of scene.enemies) {
          if (enemy.isDying || !(enemy.slowTimer > 0)) {
            continue;
          }
          fxSystem(scene, "glow").emit({
            x: enemy.position.x + spread(0.4 * enemy.size),
            y: between(0.4, 1.2) * enemy.size,
            z: enemy.position.z + spread(0.4 * enemy.size),
            vy: 0.3,
            wobble: 0.8,
            life: 0.7,
            size: 0.14,
            sizeEnd: 0.03,
            color: 0xc8b8ff,
            intensity: 1.8,
          });
        }
      }
      return time < duration;
    },
    dispose() {
      scene.remove(clock);
      face.geometry.dispose();
      tickGeometry.dispose();
      handGeometry.dispose();
      clockMaterial.dispose();
    },
  });
}

function performHealBurst(player, scene, skill) {
  audio.play("powerHealBurst", { position: player.position });
  const healAmount = player.maxHealth * (skill.healPercent ?? 0.25);
  player.health = Math.min(player.health + healAmount, player.maxHealth);
  const origin = player.position.clone();
  spawnLightPillar(scene, origin, { color: 0x4dff88, radius: 1, height: 9, duration: 0.7, opacity: 0.55 });
  spawnGroundRing(scene, origin, { color: 0x4dff88, radius: 2.6, duration: 0.5 });
  spawnGroundGlow(scene, origin, 1.4, 0x4dff88, 0.7, 1.8);
  spawnExpandingSphere(scene, origin, { color: 0x9dffb8, radius: 1.3, duration: 0.3, opacity: 0.6 });
  for (let i = 0; i < 12; i++) {
    const x = origin.x + spread(1.2);
    const y = between(0.3, 1.2);
    const z = origin.z + spread(1.2);
    const common = {
      x,
      y,
      z,
      vy: between(1.5, 2.8),
      wobble: 0.6,
      life: between(0.8, 1.2),
      size: 0.1,
      sizeEnd: 0.05,
      rx: 0,
      ry: 0,
      rz: 0,
      color: 0x7dffa8,
      intensity: 2,
      fadeOut: 0.5,
    };
    const system = fxSystem(scene, "sparks");
    system.emit({ ...common, shapeX: 3.5 });
    system.emit({ ...common, shapeY: 3.5 });
  }
}

const BOOMERANG_COLOR = 0xd8ecf5;
const BOOMERANG_EMISSIVE = 0x2f7fa8;

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
      emissiveIntensity: 0.9,
      flatShading: true,
      metalness: 0.55,
      roughness: 0.25,
    })
  );
  blade.rotation.x = Math.PI / 2;
  blade.position.copy(player.position).setY(0.7);
  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.22, 6, 16),
    new THREE.MeshBasicMaterial({
      color: 0x6fd0ff,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  blade.add(glow);
  scene.add(blade);

  const hitOutward = new Set();
  const hitReturn = new Set();
  let traveled = 0;
  let returning = false;
  let trailTimer = 0;
  const speed = 17;
  const soundHandle = audio.playHandle("powerBoomerang", {
    position: blade.position,
  });

  scene.addPowerEffect({
    update(delta) {
      blade.rotation.z += delta * 16;
      glow.material.opacity = 0.3 + Math.sin(blade.rotation.z * 0.5) * 0.08;
      soundHandle.setPosition(blade.position);
      const step = speed * delta;
      if (!returning) {
        blade.position.addScaledVector(direction, step);
        traveled += step;
        if (traveled >= range) {
          returning = true;
          spawnExpandingSphere(scene, blade.position, { color: 0x9fe0ff, radius: 1, duration: 0.2, opacity: 0.5, y: 0.7 });
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
        if (enemy.position.distanceToSquared(blade.position) < reach * reach) {
          hitSet.add(enemy);
          enemy.hit(skill.damage ?? 2);
          emitBurst(scene, "sparks", 6, () => {
            const angle = Math.random() * Math.PI * 2;
            return {
              x: enemy.position.x,
              y: 0.8,
              z: enemy.position.z,
              vx: Math.cos(angle) * 5,
              vy: between(1, 3),
              vz: Math.sin(angle) * 5,
              gravity: 10,
              life: 0.3,
              size: 0.08,
              sizeEnd: 0.02,
              shapeZ: 2.5,
              rx: 0,
              ry: Math.PI / 2 - angle,
              rz: 0,
              color: 0xffffff,
              colorEnd: 0x6fd0ff,
              intensity: 2.4,
            };
          });
        }
      }

      trailTimer += delta;
      while (trailTimer > 0.015) {
        trailTimer -= 0.015;
        const angle = Math.random() * Math.PI * 2;
        fxSystem(scene, "sparks").emit({
          x: blade.position.x + spread(0.3),
          y: blade.position.y + spread(0.15),
          z: blade.position.z + spread(0.3),
          vx: Math.cos(angle) * 1.2,
          vy: between(0.4, 1.2),
          vz: Math.sin(angle) * 1.2,
          gravity: 4,
          life: 0.3,
          size: 0.1,
          sizeEnd: 0.02,
          color: BOOMERANG_COLOR,
          colorEnd: 0x2f7fa8,
          intensity: 1.8,
        });
      }
      return true;
    },
    dispose() {
      soundHandle.stop(0.15);
      scene.remove(blade);
      blade.geometry.dispose();
      blade.material.dispose();
      glow.geometry.dispose();
      glow.material.dispose();
    },
  });
}

const METEOR_FALL_DURATION = 4;
const METEOR_LAUNCH_INTERVAL = 0.35;
const METEOR_START_OFFSET = new THREE.Vector3(-14, 42, -10);
const METEOR_IMPACT_HEIGHT = 0.4;
const meteorRockGeometry = new THREE.DodecahedronGeometry(0.6, 0);
const meteorGlowGeometry = new THREE.SphereGeometry(0.95, 12, 10);
const warningGeometry = new THREE.RingGeometry(0.85, 1, 40);
warningGeometry.rotateX(-Math.PI / 2);

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
    const start = target
      .clone()
      .add(METEOR_START_OFFSET)
      .add(new THREE.Vector3(spread(3), spread(4), spread(3)));
    const impact = new THREE.Vector3(target.x, METEOR_IMPACT_HEIGHT, target.z);
    const rock = new THREE.Mesh(
      meteorRockGeometry,
      new THREE.MeshStandardMaterial({
        color: 0x2a1a14,
        emissive: 0xff4a10,
        emissiveIntensity: 1.4,
        flatShading: true,
      })
    );
    const glow = new THREE.Mesh(
      meteorGlowGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xff7a26,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    rock.add(glow);
    rock.position.copy(start);
    rock.visible = false;
    scene.add(rock);

    const warning = new THREE.Mesh(
      warningGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xff3a1a,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    warning.position.set(target.x, 0.07, target.z);
    warning.scale.setScalar(3);
    warning.visible = false;
    scene.add(warning);

    meteors.push({
      rock,
      glow,
      warning,
      target,
      start,
      impact,
      launchAt: i * METEOR_LAUNCH_INTERVAL,
      launched: false,
      done: false,
      trailTimer: 0,
    });
  }

  const removeMeteor = (entry) => {
    scene.remove(entry.rock);
    scene.remove(entry.warning);
    entry.rock.material.dispose();
    entry.glow.material.dispose();
    entry.warning.material.dispose();
  };

  let time = 0;
  scene.addPowerEffect({
    update(delta) {
      time += delta;
      let alive = false;
      for (const entry of meteors) {
        if (entry.done) {
          continue;
        }
        alive = true;
        if (time < entry.launchAt) {
          continue;
        }
        if (!entry.launched) {
          entry.launched = true;
          entry.rock.visible = true;
          entry.warning.visible = true;
          audio.play("meteorFall", {
            position: entry.target,
            alignAt: {
              fileTime: METEOR_FALL_DURATION,
              secondsFromNow: METEOR_FALL_DURATION - (time - entry.launchAt),
            },
          });
        }

        const progress = Math.min((time - entry.launchAt) / METEOR_FALL_DURATION, 1);
        entry.rock.position.lerpVectors(entry.start, entry.impact, progress * progress);
        entry.rock.rotation.x += delta * (2 + progress * 6);
        entry.rock.rotation.z += delta * (1.5 + progress * 4);
        entry.warning.material.opacity =
          (0.2 + progress * 0.65) * (0.7 + Math.sin(progress * progress * 60) * 0.3);
        entry.warning.scale.setScalar(3 - progress * 0.6);
        entry.glow.scale.setScalar(1 + Math.sin(entry.rock.rotation.x * 3) * 0.12);

        entry.trailTimer += delta;
        while (entry.trailTimer > 0.02) {
          entry.trailTimer -= 0.02;
          const position = entry.rock.position;
          fxSystem(scene, "glow").emit({
            x: position.x + spread(0.3),
            y: position.y + spread(0.3),
            z: position.z + spread(0.3),
            vx: spread(0.5),
            vy: spread(0.5),
            vz: spread(0.5),
            life: between(0.25, 0.4),
            size: between(0.4, 0.7),
            sizeEnd: 0.1,
            color: 0xffd27a,
            colorEnd: 0xff3a00,
            intensity: 2,
          });
          fxSystem(scene, "smoke").emit({
            x: position.x,
            y: position.y,
            z: position.z,
            vy: 0.5,
            life: between(0.6, 0.9),
            size: 0.4,
            sizeEnd: 1.1,
            color: 0x4a3a34,
            colorEnd: 0x2a2424,
            alpha: 0.6,
            fadeOut: 0.8,
          });
        }

        if (progress >= 1) {
          entry.done = true;
          removeMeteor(entry);
          spawnExplosion(scene, entry.target, { radius: 3, color: 0xff5a1f, power: 1.1 });
          spawnRingWave(scene, entry.target, {
            maxRadius: 3,
            duration: 0.3,
            color: 0xff5533,
            bandWidth: 0.25,
            onWaveHit: (enemy) => {
              enemy.hit(skill.damage ?? 4);
              pushAway(enemy, entry.target, 12);
            },
          });
        }
      }
      return alive;
    },
    dispose() {
      for (const entry of meteors) {
        if (!entry.done) {
          removeMeteor(entry);
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
const SENTRY_UNFOLD_DURATION = 0.4;
const SENTRY_RANGE = 25;
const tracerGeometry = new THREE.BoxGeometry(1, 1, 1);

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

function spawnMuzzleFlash(scene, position, direction) {
  spawnExpandingSphere(scene, position, {
    color: 0xffc36a,
    radius: 0.45,
    duration: 0.08,
    opacity: 1,
    startScale: 0.1,
    y: position.y,
  });
  emitBurst(scene, "sparks", 5, () => {
    const spreadAngle = spread(0.5);
    const cos = Math.cos(spreadAngle);
    const sin = Math.sin(spreadAngle);
    const vx = (direction.x * cos - direction.z * sin) * between(5, 9);
    const vz = (direction.x * sin + direction.z * cos) * between(5, 9);
    return {
      x: position.x,
      y: position.y,
      z: position.z,
      vx,
      vy: between(0, 1.5),
      vz,
      gravity: 6,
      drag: 3,
      life: 0.15,
      size: 0.07,
      sizeEnd: 0.02,
      shapeZ: 2.5,
      rx: 0,
      ry: Math.atan2(vx, vz),
      rz: 0,
      color: 0xfff1a8,
      colorEnd: 0xff8a26,
      intensity: 2.6,
    };
  });
}

function spawnTracer(scene, from, to) {
  const material = new THREE.MeshBasicMaterial({
    color: 0x9ff4ff,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(tracerGeometry, material);
  const length = from.distanceTo(to);
  mesh.position.copy(from).lerp(to, 0.5);
  mesh.lookAt(to);
  mesh.scale.set(0.05, 0.05, length);
  scene.add(mesh);
  let time = 0;
  scene.addPowerEffect({
    update(delta) {
      time += delta;
      material.opacity = 0.8 * (1 - time / 0.09);
      return time < 0.09;
    },
    dispose() {
      scene.remove(mesh);
      material.dispose();
    },
  });
}

function spawnShellCasing(scene, position, direction) {
  fxSystem(scene, "debris").emit({
    x: position.x,
    y: position.y,
    z: position.z,
    vx: -direction.z * between(1.5, 2.5) + spread(0.4),
    vy: between(2.5, 3.5),
    vz: direction.x * between(1.5, 2.5) + spread(0.4),
    gravity: 14,
    life: 0.7,
    size: 0.06,
    shapeY: 2.2,
    color: 0xd9a441,
    spinX: spread(14),
    spinZ: spread(14),
    fadeOut: 0.3,
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
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4), darkMetal);
  antenna.position.set(-0.32, 0.65, -0.2);
  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), eyeMaterial);
  antennaTip.position.set(-0.32, 0.97, -0.2);
  group.add(treadBase, treadTop, treadStripe, antenna, antennaTip);

  const head = new THREE.Group();
  head.position.y = 0.6;

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), midMetal);
  const chassisStripe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.1, 0.3), lightMetal);
  chassisStripe.position.y = 0.08;
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.06), eyeMaterial);
  eye.position.set(0, -0.02, 0.28);

  const barrelMount = new THREE.Group();
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
  barrelMount.add(barrel, barrelTip);

  head.add(chassis, chassisStripe, eye, barrelMount);
  group.add(head);

  return {
    group,
    head,
    eye,
    eyeMaterial,
    barrelMount,
    antennaTip,
    barrelLocalTip: new THREE.Vector3(0, 0, 0.82),
    parts: [
      treadBase,
      treadTop,
      treadStripe,
      antenna,
      antennaTip,
      chassis,
      chassisStripe,
      eye,
      barrel,
      barrelTip,
    ],
  };
}

function disposeSentryModel(scene, group, parts) {
  scene.remove(group);
  const materials = new Set();
  for (const part of parts) {
    part.geometry.dispose();
    materials.add(part.material);
  }
  for (const material of materials) {
    material.dispose();
  }
}

function performTurret(player, scene, skill) {
  const duration = skill.duration ?? 8;
  const model = buildSentryModel();
  const { group, head, barrelMount, barrelLocalTip, eyeMaterial, parts } = model;
  const home = player.position.clone();
  group.position.copy(home);
  group.position.y = SENTRY_DROP_HEIGHT;
  head.position.y = 0.3;
  head.scale.setScalar(0.6);
  barrelMount.scale.z = 0.05;
  scene.add(group);

  let beam = createSentryBeam(scene, home);
  audio.play("powerSentryDeploy", { position: home });

  const timerMaterial = new THREE.MeshBasicMaterial({
    color: SENTRY_BEAM_COLOR,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const timerRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.1, 40), timerMaterial);
  timerRing.rotation.x = -Math.PI / 2;
  timerRing.position.set(home.x, 0.06, home.z);
  scene.add(timerRing);
  let timerFraction = 1;

  let phase = "arrive";
  let phaseTime = 0;
  let activeTime = 0;
  let settleTime = 0;
  let fireTimer = 0.2;
  let recoil = 0;
  let headYaw = 0;
  let targetYaw = 0;
  let trailTimer = 0;
  let scanTimer = 0.6;
  let idleTimer = audio.repository.rollRandomInterval("powerSentryIdle") ?? 5;
  const tipWorld = new THREE.Vector3();
  const headWorld = new THREE.Vector3();

  const rebuildTimerRing = (fraction) => {
    timerRing.geometry.dispose();
    timerRing.geometry = new THREE.RingGeometry(
      0.95,
      1.1,
      40,
      1,
      Math.PI / 2,
      Math.max(fraction, 0.001) * Math.PI * 2
    );
  };

  scene.addPowerEffect({
    update(delta) {
      if (phase === "arrive") {
        phaseTime += delta;
        const t = Math.min(phaseTime / SENTRY_ARRIVE_DURATION, 1);
        const eased = 1 - (1 - t) * (1 - t);
        group.position.y = SENTRY_DROP_HEIGHT * (1 - eased);
        group.rotation.y += delta * 5;
        beam.rotation.y += delta * 2.5;
        trailTimer += delta;
        while (trailTimer > 0.025) {
          trailTimer -= 0.025;
          fxSystem(scene, "glow").emit({
            x: home.x + spread(0.3),
            y: group.position.y,
            z: home.z + spread(0.3),
            vy: between(2, 4),
            life: 0.3,
            size: between(0.25, 0.4),
            sizeEnd: 0.05,
            color: 0x9ff4ff,
            colorEnd: SENTRY_BEAM_COLOR,
            intensity: 2,
          });
        }
        if (t >= 1) {
          group.position.y = 0;
          group.rotation.y = 0;
          disposeSentryBeam(scene, beam);
          beam = null;
          spawnExpandingSphere(scene, home, { color: SENTRY_BEAM_COLOR, radius: 1.8, duration: 0.3, opacity: 0.7, y: 0.4 });
          spawnGroundRing(scene, home, { color: SENTRY_BEAM_COLOR, radius: 2.4, duration: 0.4 });
          spawnScorch(scene, home, 1, 0x1c2228, 3);
          emitBurst(scene, "smoke", 14, (index) => {
            const angle = (index / 14) * Math.PI * 2;
            return {
              x: home.x + Math.cos(angle) * 0.5,
              y: 0.2,
              z: home.z + Math.sin(angle) * 0.5,
              vx: Math.cos(angle) * 4,
              vy: between(0.2, 0.8),
              vz: Math.sin(angle) * 4,
              drag: 3.5,
              life: between(0.6, 0.9),
              size: 0.35,
              sizeEnd: 1,
              color: 0x9a9088,
              colorEnd: 0x6a625c,
              alpha: 0.55,
              fadeOut: 0.7,
            };
          });
          shake(scene, 0.2, 0.2);
          audio.play("sentryLand", { position: home });
          audio.play("sentryArm", { position: home });
          phase = "unfold";
          phaseTime = 0;
          settleTime = 0;
        }
        return true;
      }

      if (phase === "unfold") {
        phaseTime += delta;
        settleTime = Math.min(settleTime + delta, SENTRY_SETTLE_DURATION);
        const squash = 1 - Math.sin((settleTime / SENTRY_SETTLE_DURATION) * Math.PI) * 0.22;
        group.scale.set(1 / squash, squash, 1 / squash);
        const t = Math.min(phaseTime / SENTRY_UNFOLD_DURATION, 1);
        const overshoot = 1 + Math.sin(t * Math.PI) * 0.15;
        head.position.y = 0.3 + 0.3 * t * overshoot;
        head.scale.setScalar(0.6 + 0.4 * t);
        barrelMount.scale.z = Math.max(t * overshoot, 0.05);
        timerMaterial.opacity = 0.6 * t;
        if (t >= 1) {
          head.position.y = 0.6;
          head.scale.setScalar(1);
          barrelMount.scale.z = 1;
          group.scale.set(1, 1, 1);
          phase = "active";
          phaseTime = 0;
        }
        return true;
      }

      if (phase === "active") {
        activeTime += delta;
        fireTimer -= delta;
        idleTimer -= delta;
        recoil = Math.max(recoil - delta * 6, 0);
        barrelMount.position.z = -0.14 * recoil;
        head.position.y = 0.6 - 0.03 * recoil;

        const nextFraction = 1 - activeTime / duration;
        if (Math.abs(nextFraction - timerFraction) > 0.02) {
          timerFraction = nextFraction;
          rebuildTimerRing(timerFraction);
        }
        eyeMaterial.emissiveIntensity = 1.4 + Math.sin(activeTime * 6) * 0.5;

        if (idleTimer <= 0) {
          idleTimer = audio.repository.rollRandomInterval("powerSentryIdle") ?? 5;
          audio.play("powerSentryIdle", { position: group.position });
        }

        let nearest = null;
        let nearestDistSq = SENTRY_RANGE * SENTRY_RANGE;
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
          targetYaw = Math.atan2(
            nearest.position.x - group.position.x,
            nearest.position.z - group.position.z
          );
        } else {
          targetYaw = Math.sin(activeTime * 1.2) * 1.2;
          scanTimer -= delta;
          if (scanTimer <= 0) {
            scanTimer = 1.6;
            audio.play("sentryScan", { position: group.position });
          }
        }
        let yawDelta = targetYaw - headYaw;
        yawDelta = Math.atan2(Math.sin(yawDelta), Math.cos(yawDelta));
        headYaw += yawDelta * Math.min(delta * (nearest ? 14 : 3), 1);
        head.rotation.y = headYaw;

        if (nearest && fireTimer <= 0) {
          fireTimer = 0.5;
          const projectileSpeed = PROJECTILE_SPEED_BASE + 6;
          const direction = calculateLeadDirection(
            group.position,
            nearest.position,
            nearest.velocity ?? new THREE.Vector3(),
            projectileSpeed
          );
          headYaw = Math.atan2(direction.x, direction.z);
          head.rotation.y = headYaw;
          head.updateMatrixWorld(true);
          const projectile = new Projectile(
            group.position.clone(),
            direction,
            projectileSpeed,
            undefined,
            skill.damage ?? 1,
            false,
            1,
            player.projectileColor,
            false,
            player.shotShape
          );
          scene.add(projectile);
          scene.projectiles?.push(projectile);
          audio.play("powerSentryFire", { position: group.position });
          head.localToWorld(tipWorld.copy(barrelLocalTip));
          spawnMuzzleFlash(scene, tipWorld, direction);
          spawnTracer(
            scene,
            tipWorld,
            headWorld.set(nearest.position.x, tipWorld.y, nearest.position.z)
          );
          spawnShellCasing(scene, head.getWorldPosition(headWorld), direction);
          playDelayed(scene, "shellCasing", 0.35, { position: group.position.clone() });
          recoil = 1;
        }

        if (activeTime >= duration) {
          phase = "depart";
          phaseTime = 0;
          barrelMount.position.z = 0;
          beam = createSentryBeam(scene, group.position);
          spawnExpandingSphere(scene, group.position, { color: SENTRY_BEAM_COLOR, radius: 1.8, duration: 0.3, opacity: 0.7, y: 0.4 });
          spawnGroundRing(scene, group.position, { color: SENTRY_BEAM_COLOR, radius: 2.2, duration: 0.4 });
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
      timerMaterial.opacity = 0.6 * (1 - t);
      if (beam) {
        beam.rotation.y += delta * 2.5;
      }
      trailTimer += delta;
      while (trailTimer > 0.03) {
        trailTimer -= 0.03;
        fxSystem(scene, "glow").emit({
          x: home.x + spread(0.4),
          y: group.position.y,
          z: home.z + spread(0.4),
          vy: -1,
          life: 0.35,
          size: 0.3,
          sizeEnd: 0.05,
          color: 0x9ff4ff,
          colorEnd: SENTRY_BEAM_COLOR,
          intensity: 2,
        });
      }
      return t < 1;
    },
    dispose() {
      disposeSentryBeam(scene, beam);
      disposeSentryModel(scene, group, parts);
      scene.remove(timerRing);
      timerRing.geometry.dispose();
      timerMaterial.dispose();
    },
  });
}

const BLACK_HOLE_PARTICLES = 110;
const blackHoleParticleGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.12);
const BLACK_HOLE_COLORS = [0xb27bff, 0xff7ae0, 0xffffff, 0x7a5bff, 0xffb86b];

function createAccretionDisk(innerRadius, outerRadius) {
  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64, 3);
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  const inner = new THREE.Color(0xffe2b8);
  const middle = new THREE.Color(0xff6ad5);
  const outer = new THREE.Color(0x3a1a8a);
  const color = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const radius = Math.hypot(positions.getX(i), positions.getY(i));
    const t = (radius - innerRadius) / (outerRadius - innerRadius);
    if (t < 0.5) {
      color.copy(inner).lerp(middle, t * 2);
    } else {
      color.copy(middle).lerp(outer, (t - 0.5) * 2);
    }
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
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

  const root = new THREE.Group();
  root.position.set(center.x, 1.2, center.z);
  scene.add(root);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.7 * sizeScale, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  const horizon = new THREE.Mesh(
    new THREE.SphereGeometry(0.95 * sizeScale, 20, 14),
    new THREE.MeshBasicMaterial({
      color: 0x9a5cff,
      transparent: true,
      opacity: 0.5,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.5 * sizeScale, 20, 14),
    new THREE.MeshBasicMaterial({
      color: 0x3a1a8a,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const disk = createAccretionDisk(1.1 * sizeScale, 3.2 * sizeScale);
  disk.rotation.x = -Math.PI / 2 + 0.35;
  const diskOuter = createAccretionDisk(1.6 * sizeScale, 4.2 * sizeScale);
  diskOuter.material.opacity = 0.35;
  diskOuter.rotation.x = -Math.PI / 2 + 0.2;
  root.add(core, horizon, halo, disk, diskOuter);

  const swirl = new THREE.InstancedMesh(
    blackHoleParticleGeometry,
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    BLACK_HOLE_PARTICLES
  );
  swirl.frustumCulled = false;
  const swirlColor = new THREE.Color();
  const swirlState = [];
  const swirlRadius = Math.min(range * 0.55, 7) * sizeScale;
  for (let i = 0; i < BLACK_HOLE_PARTICLES; i++) {
    swirlState.push({
      angle: Math.random() * Math.PI * 2,
      radius: 1 + Math.random() * swirlRadius,
      height: spread(1.2),
      speed: between(2.5, 4.5),
    });
    swirl.setColorAt(i, swirlColor.set(pickColor(BLACK_HOLE_COLORS)).multiplyScalar(1.6));
  }
  swirl.instanceColor.needsUpdate = true;
  root.add(swirl);
  const swirlMatrix = new THREE.Matrix4();
  const swirlPosition = new THREE.Vector3();
  const swirlQuaternion = new THREE.Quaternion();
  const swirlScale = new THREE.Vector3();

  fxSystem(scene, "decals").emit({
    x: center.x,
    y: 0.03,
    z: center.z,
    rx: 0,
    ry: 0,
    rz: 0,
    life: duration + 0.8,
    size: 2.5 * sizeScale,
    sizeEnd: 6 * sizeScale,
    color: 0x0a0414,
    alpha: 0.75,
    fadeOut: 0.3,
  });

  root.scale.setScalar(0.01);
  let time = 0;
  let tickTimer = 0;
  let fadingOut = false;
  let collapsed = false;
  const pullTarget = new THREE.Vector3();
  const tileManager = scene.tileManager;
  const soundHandle = audio.playHandle("powerBlackHole", {
    position: root.position,
    fadeInSeconds: 0.6,
  });

  scene.addPowerEffect({
    update(delta) {
      time += delta;
      tickTimer -= delta;

      const growIn = Math.min(time / 0.35, 1);
      const shrinkOut = Math.max(Math.min((duration - time) / 0.3, 1), 0);
      const pulse = 1 + Math.sin(time * 10) * 0.05;
      root.scale.setScalar(Math.max((1 - Math.pow(1 - growIn, 3)) * shrinkOut * pulse, 0.01));
      disk.rotation.z += delta * 2.4;
      diskOuter.rotation.z -= delta * 1.2;
      horizon.material.opacity = 0.45 + Math.sin(time * 14) * 0.12;
      halo.scale.setScalar(1 + Math.sin(time * 5) * 0.1);

      for (let i = 0; i < BLACK_HOLE_PARTICLES; i++) {
        const particle = swirlState[i];
        particle.radius -= delta * (0.8 + (swirlRadius - particle.radius) * 0.6);
        particle.angle += (particle.speed / Math.max(particle.radius, 0.4)) * delta * 2;
        if (particle.radius < 0.6 * sizeScale) {
          particle.radius = swirlRadius * between(0.8, 1);
          particle.height = spread(1.2);
        }
        const heightFactor = particle.radius / swirlRadius;
        const size = 0.4 + heightFactor * 0.8;
        swirlMatrix.compose(
          swirlPosition.set(
            Math.cos(particle.angle) * particle.radius,
            particle.height * heightFactor,
            Math.sin(particle.angle) * particle.radius
          ),
          swirlQuaternion.identity(),
          swirlScale.set(size * 2.2, size, size)
        );
        swirl.setMatrixAt(i, swirlMatrix);
      }
      swirl.instanceMatrix.needsUpdate = true;

      for (const enemy of scene.enemies) {
        if (enemy.isDying || enemy.isDormant) {
          continue;
        }
        const offsetX = center.x - enemy.position.x;
        const offsetZ = center.z - enemy.position.z;
        const dist = Math.hypot(offsetX, offsetZ);
        if (dist < range && dist > 0.4) {
          const strength = (enemy.isBoss ? 2.5 : 7) * (1 + (1 - dist / range) * 0.6);
          const swirlFactor = 0.35;
          const stepX = (offsetX / dist + (-offsetZ / dist) * swirlFactor) * strength * delta;
          const stepZ = (offsetZ / dist + (offsetX / dist) * swirlFactor) * strength * delta;
          if (tileManager) {
            tileManager.moveCircle(
              enemy.position,
              enemy.position.x + stepX,
              enemy.position.z + stepZ,
              enemy.hitboxRadius * 0.85
            );
          } else {
            enemy.position.x += stepX;
            enemy.position.z += stepZ;
          }
        }
      }

      if (tickTimer <= 0) {
        tickTimer = 0.5;
        for (const enemy of scene.enemies) {
          if (enemy.isDying) {
            continue;
          }
          if (enemy.position.distanceTo(center) <= 2 * sizeScale) {
            enemy.hit(skill.damage ?? 0.8);
            fxSystem(scene, "glow").emit({
              x: enemy.position.x,
              y: 1,
              z: enemy.position.z,
              vx: (center.x - enemy.position.x) * 2,
              vz: (center.z - enemy.position.z) * 2,
              life: 0.3,
              size: 0.3,
              sizeEnd: 0.05,
              color: 0xd68bff,
              intensity: 2,
            });
          }
        }
      }

      if (time > duration - 0.4 && !fadingOut) {
        fadingOut = true;
        soundHandle.stop(0.4);
      }

      if (time >= duration && !collapsed) {
        collapsed = true;
        pullTarget.set(center.x, 0, center.z);
        audio.play("blackholeCollapse", { position: pullTarget });
        spawnExplosion(scene, pullTarget, {
          radius: 4.5 * sizeScale,
          color: 0x9a5cff,
          hotColor: 0xffe2ff,
          smokeColor: 0x2a1a3a,
          debrisColor: 0x1a1024,
          power: 1.2,
        });
        spawnRingWave(scene, pullTarget.clone(), {
          maxRadius: 4.5 * sizeScale,
          duration: 0.35,
          color: 0xd68bff,
          bandWidth: 0.3,
          onWaveHit: (enemy) => {
            enemy.hit((skill.damage ?? 0.8) * 3);
            pushAway(enemy, pullTarget, 18);
          },
        });
      }
      return time < duration;
    },
    dispose() {
      if (!fadingOut) {
        soundHandle.stop(0.2);
      }
      scene.remove(root);
      for (const mesh of [core, horizon, halo, disk, diskOuter]) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      swirl.material.dispose();
      swirl.dispose();
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
