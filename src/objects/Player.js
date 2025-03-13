import * as THREE from "three";
import { Projectile } from "./Projectile";

export class Player extends THREE.Object3D {
  constructor(input) {
    super();
    this.input = input;
    this.speed = 5;
    this.attackSpeed = 1;
    this.attackCooldown = 0;
    this.lastDirection = new THREE.Vector3(1, 0, 0);

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geo, mat);
    this.add(mesh);
  }

  update(delta) {
    const direction = new THREE.Vector3();

    if (this.input.keys.KeyW) {
      direction.z -= 1;
    }
    if (this.input.keys.KeyS) {
      direction.z += 1;
    }
    if (this.input.keys.KeyA) {
      direction.x -= 1;
    }
    if (this.input.keys.KeyD) {
      direction.x += 1;
    }

    if (direction.lengthSq() > 0) {
      direction.normalize();
      this.lastDirection.copy(direction);
      direction.multiplyScalar(this.speed * delta);
      this.position.add(direction);
    }

    this.attackCooldown += delta;
    if (this.attackCooldown >= 1 / this.attackSpeed) {
      this.attackCooldown = 0;
      this.attack();
    }
  }

  attack() {
    const projectile = new Projectile(
      this.position.clone(),
      this.lastDirection.clone()
    );
    if (this.parent) {
      this.parent.add(projectile);
    }
  }

  applyItemEffect(effectValue) {
    this.attackSpeed *= 1 + effectValue;
  }
}
