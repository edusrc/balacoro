import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  getDifficultyColor,
  getDifficultyColorStyle,
  DIFFICULTY_COLOR_MAX_LEVEL,
  SKULL_CRAZE_START,
} from "../objects/MonsterGenome.js";

const CRAZE_START = SKULL_CRAZE_START;
const CRAZE_FULL = DIFFICULTY_COLOR_MAX_LEVEL;

function crazeAmount(power) {
  return Math.min(
    Math.max(power - CRAZE_START, 0) / (CRAZE_FULL - CRAZE_START),
    1
  );
}

function buildSkull() {
  const root = new THREE.Group();

  const boneMaterial = new THREE.MeshStandardMaterial({
    color: 0x2255ff,
    flatShading: true,
  });
  const socketMaterial = new THREE.MeshBasicMaterial({ color: 0x050508 });
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xff2020 });

  const disposables = [boneMaterial, socketMaterial, glowMaterial];
  const track = (geometry) => {
    disposables.push(geometry);
    return geometry;
  };

  const cranium = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.56, 12, 10)),
    boneMaterial
  );
  cranium.scale.set(1, 0.95, 1.02);
  cranium.position.y = 0.22;
  root.add(cranium);

  const cheekGeometry = track(new THREE.BoxGeometry(0.17, 0.13, 0.16));
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(cheekGeometry, boneMaterial);
    cheek.position.set(side * 0.36, 0.03, 0.3);
    cheek.rotation.y = side * 0.3;
    root.add(cheek);
  }

  const socketGeometry = track(new THREE.SphereGeometry(0.135, 8, 6));
  const glowGeometry = track(new THREE.SphereGeometry(0.06, 8, 6));
  const sockets = [];
  const eyeGlows = [];
  for (const side of [-1, 1]) {
    const socket = new THREE.Mesh(socketGeometry, socketMaterial);
    socket.position.set(side * 0.22, 0.2, 0.42);
    socket.scale.set(1, 1.2, 0.6);
    root.add(socket);
    sockets.push(socket);

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(side * 0.22, 0.19, 0.5);
    glow.visible = false;
    root.add(glow);
    eyeGlows.push(glow);
  }

  const nasal = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.075, 0.17, 3)),
    socketMaterial
  );
  nasal.rotation.x = Math.PI;
  nasal.position.set(0, 0.0, 0.5);
  root.add(nasal);

  const maxilla = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.42, 0.15, 0.3)),
    boneMaterial
  );
  maxilla.position.set(0, -0.18, 0.28);
  root.add(maxilla);

  const toothGeometry = track(new THREE.BoxGeometry(0.07, 0.11, 0.06));
  for (const x of [-0.15, -0.05, 0.05, 0.15]) {
    const tooth = new THREE.Mesh(toothGeometry, boneMaterial);
    tooth.position.set(x, -0.29, 0.4);
    root.add(tooth);
  }

  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, -0.24, -0.08);
  root.add(jawPivot);

  const jaw = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.48, 0.15, 0.44)),
    boneMaterial
  );
  jaw.position.set(0, -0.14, 0.22);
  jawPivot.add(jaw);

  for (const x of [-0.15, -0.05, 0.05, 0.15]) {
    const tooth = new THREE.Mesh(toothGeometry, boneMaterial);
    tooth.position.set(x, -0.04, 0.42);
    jawPivot.add(tooth);
  }

  const browGeometry = track(new THREE.BoxGeometry(0.24, 0.055, 0.06));
  const brows = [];
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(browGeometry, boneMaterial);
    brow.position.set(side * 0.2, 0.34, 0.46);
    brow.rotation.z = side * 0.45;
    brow.visible = false;
    root.add(brow);
    brows.push(brow);
  }

  const hornGeometry = track(new THREE.ConeGeometry(0.09, 0.5, 6));
  const horns = [];
  for (const side of [-1, 1]) {
    const horn = new THREE.Mesh(hornGeometry, boneMaterial);
    horn.position.set(side * 0.36, 0.62, 0);
    horn.rotation.z = -side * 0.5;
    horn.visible = false;
    root.add(horn);
    horns.push(horn);
  }

  const crossBoneGeometry = track(
    new THREE.CylinderGeometry(0.045, 0.045, 1.25, 6)
  );
  const knobGeometry = track(new THREE.SphereGeometry(0.07, 6, 5));
  const crossBones = [];
  for (const side of [-1, 1]) {
    const bone = new THREE.Group();
    const shaft = new THREE.Mesh(crossBoneGeometry, boneMaterial);
    bone.add(shaft);
    for (const end of [-1, 1]) {
      for (const offset of [-0.055, 0.055]) {
        const knob = new THREE.Mesh(knobGeometry, boneMaterial);
        knob.position.set(offset, end * 0.62, 0);
        bone.add(knob);
      }
    }
    bone.position.set(0, -0.05, -0.32);
    bone.rotation.z = side * 0.7;
    bone.visible = false;
    root.add(bone);
    crossBones.push(bone);
  }

  const crownSpikeGeometry = track(new THREE.ConeGeometry(0.05, 0.22, 4));
  const crownSpikes = [];
  const crownCount = 5;
  for (let i = 0; i < crownCount; i++) {
    const angle = Math.PI * 0.75 - (i / (crownCount - 1)) * Math.PI * 0.5;
    const spike = new THREE.Mesh(crownSpikeGeometry, boneMaterial);
    spike.position.set(
      Math.cos(angle) * 0.44,
      0.42 + Math.sin(angle) * 0.34,
      -0.12
    );
    spike.rotation.z = angle - Math.PI / 2;
    spike.visible = false;
    root.add(spike);
    crownSpikes.push(spike);
  }

  const tuskGeometry = track(new THREE.ConeGeometry(0.055, 0.26, 5));
  const tusks = [];
  for (const side of [-1, 1]) {
    const tusk = new THREE.Mesh(tuskGeometry, boneMaterial);
    tusk.position.set(side * 0.24, -0.28, 0.36);
    tusk.rotation.set(0, 0, side * 0.35);
    tusk.visible = false;
    root.add(tusk);
    tusks.push(tusk);
  }

  return {
    root,
    boneMaterial,
    glowMaterial,
    jawPivot,
    eyeGlows,
    brows,
    horns,
    crossBones,
    crownSpikes,
    tusks,
    dispose: () => {
      for (const item of disposables) {
        item.dispose();
      }
    },
  };
}

export default function DifficultySkull({
  power = 0,
  progress = power,
  size = 96,
  style,
}) {
  const SIZE = size;
  const RING_THICKNESS = Math.max(Math.round(size / 14), 5);
  const canvasRef = useRef(null);
  const powerRef = useRef(power);
  const skullRef = useRef(null);
  const glowColor = useRef(new THREE.Color(0xff2020));

  useEffect(() => {
    powerRef.current = power;
  }, [power]);

  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(SIZE, SIZE, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    camera.position.set(0, 0.12, 3.3);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(2, 3, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8899ff, 0.35);
    rim.position.set(-3, 1, -2);
    scene.add(rim);

    const skull = buildSkull();
    scene.add(skull.root);
    skullRef.current = skull;

    let frameId;
    const clock = new THREE.Clock();
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const currentPower = powerRef.current;
      const craze = crazeAmount(currentPower);

      skull.root.position.y = Math.sin(t * 1.6) * 0.045;
      skull.root.rotation.y =
        Math.sin(t * 0.7) * 0.14 + Math.sin(t * 21) * 0.05 * craze;
      skull.root.rotation.x = Math.sin(t * 24.5) * 0.04 * craze;
      skull.root.rotation.z = Math.sin(t * 18) * 0.04 * craze;

      const breathe = 0.05 + Math.max(Math.sin(t * 1.3), 0) * 0.06;
      const chatter = Math.abs(Math.sin(t * 16)) * 0.5 * craze;
      skull.jawPivot.rotation.x = breathe + chatter;

      const flicker =
        0.8 + 0.2 * Math.sin(t * (6 + craze * 18)) * (0.5 + craze * 0.5);
      skull.glowMaterial.color
        .copy(glowColor.current)
        .multiplyScalar(flicker);
      const glowScale = 1 + 0.2 * Math.sin(t * 5) + craze * 0.5;
      for (const glow of skull.eyeGlows) {
        glow.scale.setScalar(glowScale);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      skull.dispose();
      renderer.dispose();
      skullRef.current = null;
    };
  }, []);

  useEffect(() => {
    const skull = skullRef.current;
    if (!skull) {
      return;
    }

    const color = getDifficultyColor(power);
    skull.boneMaterial.color.copy(color);
    const emissiveStrength =
      power <= 5 ? 0 : Math.min((power - 5) / 24, 0.35);
    skull.boneMaterial.emissive.copy(color).multiplyScalar(emissiveStrength);

    const growth = Math.min(power / 18, 1);
    skull.root.scale.set(
      0.7 + growth * 0.32,
      0.86 + growth * 0.16,
      0.86 + growth * 0.16
    );

    for (const brow of skull.brows) {
      brow.visible = power >= 3;
    }
    const hornScale = power >= 26 ? 1.35 : 1;
    for (const horn of skull.horns) {
      horn.visible = power >= 6;
      horn.scale.setScalar(hornScale);
    }
    for (const bone of skull.crossBones) {
      bone.visible = power >= 10;
    }
    for (const spike of skull.crownSpikes) {
      spike.visible = power >= 17;
      spike.scale.setScalar(power >= 26 ? 1.6 : 1);
    }
    for (const tusk of skull.tusks) {
      tusk.visible = power >= 21;
    }
    for (const glow of skull.eyeGlows) {
      glow.visible = power >= 13;
    }
  }, [power]);

  const lapProgress = Math.min(Math.max(progress - power, 0), 1);
  const ringColor = getDifficultyColorStyle(power);
  const isMaxed = lapProgress >= 0.985;
  const craze = crazeAmount(power);
  const wrapperSize = SIZE + RING_THICKNESS * 2;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "16px",
        left: "16px",
        width: `${wrapperSize}px`,
        height: `${wrapperSize}px`,
        pointerEvents: "none",
        zIndex: 15,
        ...style,
      }}
    >
      <style>{`
        @keyframes skull-ring-pulse {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 4px currentColor); }
          50% { opacity: 0.6; filter: drop-shadow(0 0 12px currentColor); }
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `conic-gradient(${ringColor} ${lapProgress * 360}deg, rgba(255,255,255,0.12) ${lapProgress * 360}deg 360deg)`,
          color: ringColor,
          animation: isMaxed
            ? "skull-ring-pulse 1.4s ease-in-out infinite"
            : "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: `${RING_THICKNESS}px`,
          borderRadius: "50%",
          background: "#08080e",
          boxShadow:
            craze > 0
              ? `0 0 ${10 + craze * 22}px rgba(255, 20, 20, ${0.25 + craze * 0.4}) inset, 0 0 ${6 + craze * 14}px rgba(255, 20, 20, ${0.2 + craze * 0.35})`
              : "none",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: `${RING_THICKNESS}px`,
          width: `${SIZE}px`,
          height: `${SIZE}px`,
        }}
      />
    </div>
  );
}
