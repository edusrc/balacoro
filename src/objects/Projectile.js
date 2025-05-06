import * as THREE from "three";
import {
  PROJECTILE_SPEED_BASE,
  PROJECTILE_LIFETIME,
  PROJECTILE_DAMAGE,
  PROJECTILE_SIZE,
  PROJECTILE_COLOR,
} from "../constants";

export class Projectile extends THREE.Mesh {
  constructor(
    position,
    direction,
    speed = PROJECTILE_SPEED_BASE,
    lifeTime = PROJECTILE_LIFETIME,
    damage = PROJECTILE_DAMAGE,
    glowing = false
  ) {
    const geometry = new THREE.BoxGeometry(
      PROJECTILE_SIZE,
      PROJECTILE_SIZE,
      PROJECTILE_SIZE
    );
    const material = glowing
      ? new THREE.MeshBasicMaterial({ color: PROJECTILE_COLOR })
      : new THREE.MeshStandardMaterial({
          color: PROJECTILE_COLOR,
        });
    super(geometry, material);
    this.position.copy(position);

    this.damage = damage;
    this.direction = direction;
    this.speed = speed;
    this.lifeTime = lifeTime;
    this.glowing = glowing;
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
