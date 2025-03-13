import * as THREE from "three";

export class Projectile extends THREE.Mesh {
  constructor(position, direction, speed = 10, lifeTime = 10, damage = 1) {
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    super(geometry, material);
    this.damage = damage;
    this.position.copy(position);
    this.direction = direction;
    this.speed = speed;
    this.lifeTime = lifeTime;
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
}
