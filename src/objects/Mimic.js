import * as THREE from "three";
import { Enemy } from "./Enemy.js";
import {
  MIMIC_WAKE_DISTANCE,
  MIMIC_COIN_MULTIPLIER,
} from "../constants.js";

const bodyGeometry = new THREE.BoxGeometry(0.9, 0.55, 0.65);
const lidGeometry = new THREE.BoxGeometry(0.94, 0.26, 0.69);
const bandGeometry = new THREE.BoxGeometry(0.96, 0.57, 0.14);
const toothGeometry = new THREE.BoxGeometry(0.09, 0.16, 0.07);
const tongueGeometry = new THREE.BoxGeometry(0.24, 0.05, 0.55);
const mouthGeometry = new THREE.BoxGeometry(0.82, 0.08, 0.55);
const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
const lidMaterial = new THREE.MeshStandardMaterial({ color: 0x6e4523 });
const goldMaterial = new THREE.MeshBasicMaterial({ color: 0xffd23e });
const toothMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5ec });
const tongueMaterial = new THREE.MeshStandardMaterial({ color: 0xc4374d });
const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0x2b1216 });

export class Mimic extends Enemy {
  constructor(target, spawnPosition, speed, health, difficulty) {
    super(target, spawnPosition, speed, health, difficulty, false, "tank");

    this.remove(this.mesh);
    this.coreGeometry.dispose();
    if (this.isElite) {
      this.baseMaterial.dispose();
      this.eliteAura.material.dispose();
      this.eliteAura = null;
      this.isElite = false;
    }

    const group = new THREE.Group();

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.28;

    const band = new THREE.Mesh(bandGeometry, goldMaterial);
    band.position.y = 0.28;

    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.y = 0.55;

    const tongue = new THREE.Mesh(tongueGeometry, tongueMaterial);
    tongue.position.set(0, 0.58, 0.22);
    tongue.rotation.x = 0.25;
    this.tongue = tongue;

    this.lidPivot = new THREE.Group();
    this.lidPivot.position.set(0, 0.56, -0.33);
    const lid = new THREE.Mesh(lidGeometry, lidMaterial);
    lid.position.set(0, 0.12, 0.34);
    this.lidPivot.add(lid);

    this.mouthParts = [mouth, tongue];
    for (const side of [-0.3, -0.1, 0.1, 0.3]) {
      const upperTooth = new THREE.Mesh(toothGeometry, toothMaterial);
      upperTooth.position.set(side, 0.02, 0.62);
      this.lidPivot.add(upperTooth);
      this.mouthParts.push(upperTooth);

      const lowerTooth = new THREE.Mesh(toothGeometry, toothMaterial);
      lowerTooth.position.set(side + 0.05, 0.6, 0.29);
      group.add(lowerTooth);
      this.mouthParts.push(lowerTooth);
    }

    for (const part of this.mouthParts) {
      part.visible = false;
    }

    group.add(body, band, mouth, tongue, this.lidPivot);
    group.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.mesh = group;
    this.mesh.scale.setScalar(this.size);
    this.add(this.mesh);

    this.flashEntries = [
      { mesh: body, material: bodyMaterial },
      { mesh: lid, material: lidMaterial },
      { mesh: tongue, material: tongueMaterial },
    ];
    this.eyes = [];
    this.animatedParts = [];
    this.bodyScale = new THREE.Vector3(this.size, this.size, this.size);

    this.coinReward = Math.round(this.coinReward * MIMIC_COIN_MULTIPLIER);
    this.isDormant = true;
    this.chompTime = 0;
  }

  wake() {
    this.isDormant = false;
    for (const part of this.mouthParts) {
      part.visible = true;
    }
  }

  hit(damage = 1) {
    if (this.isDormant) {
      this.wake();
    }
    super.hit(damage);
  }

  update(delta) {
    if (this.isDying) {
      super.update(delta);
      return;
    }

    if (this.isDormant) {
      if (this.healthBarSprite) {
        this.healthBarSprite.visible = false;
      }
      this.lidPivot.rotation.x = 0;
      const distSq = this.position.distanceToSquared(this.target.position);
      if (distSq < MIMIC_WAKE_DISTANCE * MIMIC_WAKE_DISTANCE) {
        this.wake();
      }
      return;
    }

    this.chompTime += delta;
    this.lidPivot.rotation.x = -(
      0.35 + Math.abs(Math.sin(this.chompTime * 6)) * 0.55
    );
    this.tongue.rotation.x = 0.25 + Math.sin(this.chompTime * 9) * 0.12;

    super.update(delta);
  }
}
