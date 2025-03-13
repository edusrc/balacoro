import * as THREE from "three";

export class Item extends THREE.Mesh {
  constructor(position, effectValue = 0.05, color = 0x80008) {
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshBasicMaterial({ color });
    super(geometry, material);
    this.position.copy(position);
    this.effectValue = effectValue;
  }

  update(delta) {
    this.rotation.y += delta;
  }
}
