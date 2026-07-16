import * as THREE from "three";
import {
  PROJECTILE_SPEED_BASE,
  PROJECTILE_LIFETIME,
  PROJECTILE_DAMAGE,
  PROJECTILE_SIZE,
  PROJECTILE_COLOR,
} from "../constants";

const sharedGeometry = new THREE.BoxGeometry(
  PROJECTILE_SIZE,
  PROJECTILE_SIZE,
  PROJECTILE_SIZE
);
sharedGeometry.translate(0, 0.5, 0);
const materialCache = new Map();

function getProjectileMaterial(color, glowing) {
  const key = `${color}_${glowing}`;
  let material = materialCache.get(key);
  if (!material) {
    material = glowing
      ? new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 1.5,
        })
      : new THREE.MeshStandardMaterial({ color });
    materialCache.set(key, material);
  }
  return material;
}

export class Projectile extends THREE.Mesh {
  constructor(
    position,
    direction,
    speed = PROJECTILE_SPEED_BASE,
    lifeTime = PROJECTILE_LIFETIME,
    damage = PROJECTILE_DAMAGE,
    glowing = false,
    pierce = 1,
    color = PROJECTILE_COLOR,
    isCritical = false
  ) {
    super(sharedGeometry, getProjectileMaterial(color, glowing));
    this.position.copy(position);

    this.damage = damage;
    this.direction = direction;
    this.speed = speed;
    this.lifeTime = lifeTime;
    this.glowing = glowing;
    this.pierce = pierce;
    this.isCritical = isCritical;
    this.hitEnemies = new Set();
  }

  update(delta) {
    this.position.addScaledVector(this.direction, this.speed * delta);

    this.lifeTime -= delta;
    if (this.lifeTime <= 0) {
      if (this.parent) {
        this.parent.remove(this);
      }
    }
  }

  getCollisionBox() {
    return new THREE.Box3().setFromCenterAndSize(
      this.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
      new THREE.Vector3(PROJECTILE_SIZE, PROJECTILE_SIZE, PROJECTILE_SIZE)
    );
  }
}
