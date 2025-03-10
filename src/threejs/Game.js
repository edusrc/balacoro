import * as THREE from "three";
import { MainScene } from "../scenes/MainScene";

export class Game {
  constructor(container) {
    this.container = container;
    this.init();
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
    this.container.appendChild(this.renderer.domElement);

    this.scene = new MainScene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );

    this.camera.position.set(0, 10, 10);

    window.addEventListener("resize", this.onWindowResize);

    this.animate();
  }

  animate = () => {
    requestAnimationFrame(this.animate);

    this.scene.update(this.camera);

    this.renderer.render(this.scene, this.camera);
  };

  onWindowResize = () => {
    this.camera.aspect =
      this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
  };

  dispose() {
    window.removeEventListener("resize", this.onWindowResize);
    if (this.renderer && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
