import * as THREE from "three";
import { INITIAL_PLAYER_SKILLS } from "../constants.js";

export class Item extends THREE.Mesh {
  static skillTypes = Object.keys(INITIAL_PLAYER_SKILLS);

  constructor(position) {
    const { type, color } = Item.getRandomSkill();
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ color });
    super(geometry, material);

    this.position.copy(position);
    this.effectType = type;
  }

  static getRandomSkill() {
    const type =
      Item.skillTypes[Math.floor(Math.random() * Item.skillTypes.length)];
    const color = Item._getColorForSkill(type);
    return { type, color };
  }

  static _getColorForSkill(skill) {
    switch (skill) {
      case "dash":
        return 0xffa500;
      case "energyExplosion":
        return 0xff0000;
      case "freezeExplosion":
        return 0x00ccff;
      case "forceField":
        return 0xffff00;
      case "thorns":
        return 0x00ff00;
      case "glowing":
        return 0x90f5bc;
      case "projectGlowing":
        return 0xffffff;
      default:
        return 0xaaaaaa;
    }
  }

  update(delta) {
    this.rotation.y += delta;
  }
}
