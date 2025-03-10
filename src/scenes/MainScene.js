import * as THREE from "three";
import { InputController } from "../core/InputController";
import { Player } from "../objects/Player";
import { TileManager } from "../core/TileManager";

export class MainScene extends THREE.Scene {
  constructor() {
    super();
    this.clock = new THREE.Clock();
    this.inputController = new InputController();

    this.tileManager = new TileManager(this, 10);

    this.init();
  }

  init() {
    this.player = new Player(this.inputController);
    this.add(this.player);
  }

  update(camera) {
    const delta = this.clock.getDelta();
    this.player.update(delta);

    const px = this.player.position.x;
    const py = this.player.position.y;
    const pz = this.player.position.z;

    this.tileManager.update(px, pz);

    camera.position.set(px, py + 10, pz + 10);
    camera.lookAt(px, py, pz);
  }
}
