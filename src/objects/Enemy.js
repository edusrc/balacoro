import * as THREE from "three";

export class Enemy extends THREE.Object3D {
  constructor(target, spawnPosition, speed = 4, health = 1) {
    super();
    this.target = target;
    this.speed = speed;
    this.health = health;
    this.hitboxRadius = 0.5;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const mesh = new THREE.Mesh(geometry, material);
    this.add(mesh);

    this.position.copy(spawnPosition);
  }

  update(delta) {
    const direction = new THREE.Vector3();
    direction.subVectors(this.target.position, this.position);

    if (direction.lengthSq() > 0) {
      direction.normalize();
      direction.multiplyScalar(this.speed * delta);
      this.position.add(direction);
    }
  }

  resolveCollision(otherEnemy) {
    const distance = this.position.distanceTo(otherEnemy.position);
    const minDistance = this.hitboxRadius * 2;

    if (distance < minDistance && distance > 0) {
      const overlap = minDistance - distance;
      const repulsion = new THREE.Vector3()
        .subVectors(this.position, otherEnemy.position)
        .normalize()
        .multiplyScalar(overlap / 2);
      this.position.add(repulsion);
      otherEnemy.position.sub(repulsion);
    }
  }

  hit(damage = 1) {
    this.health -= damage;
    if (this.health <= 0) {
      if (this.parent) {
        this.parent.remove(this);
      }
    }
  }
}
