export class InputController {
  constructor() {
    this.keys = {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false,
      KeyQ: false,
      KeyE: false,
      Space: false,
    };

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  onKeyDown = (event) => {
    if (this.keys[event.code] !== undefined) {
      this.keys[event.code] = true;
    }
  };

  onKeyUp = (event) => {
    if (this.keys[event.code] !== undefined) {
      this.keys[event.code] = false;
    }
  };
}
