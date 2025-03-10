import * as THREE from "three";

export class Player extends THREE.Object3D {
  constructor(input) {
    super();
    this.input = input;
    this.speed = 5;

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

    direction.normalize();
    direction.multiplyScalar(this.speed * delta);

    this.position.add(direction);

    // Debug
    // console.log("Player Position:", this.position);
  }
}
