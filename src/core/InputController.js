export class InputController {
  constructor() {
    this.keys = {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false,
    };

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  onKeyDown = (e) => {
    if (this.keys[e.code] !== undefined) {
      this.keys[e.code] = true;
    }
  };

  onKeyUp = (e) => {
    if (this.keys[e.code] !== undefined) {
      this.keys[e.code] = false;
    }
  };
}
