import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  getDifficultyColor,
  getDifficultyColorStyle,
} from "../objects/MonsterGenome.js";

const SIZE = 96;
const RING_THICKNESS = 7;

export default function DifficultySkull({ power = 0, progress = power }) {
  const canvasRef = useRef(null);
  const powerRef = useRef(power);
  const partsRef = useRef(null);

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
    camera.position.set(0, 0.1, 3.2);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(2, 3, 4);
    scene.add(key);

    const root = new THREE.Group();
    scene.add(root);

    const boneMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a5fcc,
      flatShading: true,
    });
    const eyeDarkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eyeGlowMaterial = new THREE.MeshBasicMaterial({ color: 0xff2222 });

    const craniumGeometry = new THREE.SphereGeometry(0.6, 10, 8);
    const cranium = new THREE.Mesh(craniumGeometry, boneMaterial);
    cranium.scale.set(1, 0.9, 0.96);
    cranium.position.y = 0.15;
    root.add(cranium);

    const jawGeometry = new THREE.BoxGeometry(0.58, 0.26, 0.38);
    const jaw = new THREE.Mesh(jawGeometry, boneMaterial);
    jaw.position.set(0, -0.4, 0.08);
    root.add(jaw);

    const eyeGeometry = new THREE.SphereGeometry(0.12, 8, 6);
    const eyeLeft = new THREE.Mesh(eyeGeometry, eyeDarkMaterial);
    eyeLeft.position.set(-0.21, 0.16, 0.48);
    const eyeRight = eyeLeft.clone();
    eyeRight.material = eyeDarkMaterial;
    eyeRight.position.x = 0.21;
    root.add(eyeLeft, eyeRight);

    const noseGeometry = new THREE.ConeGeometry(0.08, 0.2, 4);
    const nose = new THREE.Mesh(noseGeometry, eyeDarkMaterial);
    nose.rotation.x = Math.PI;
    nose.position.set(0, -0.02, 0.54);
    root.add(nose);

    const angryBrowGeometry = new THREE.BoxGeometry(0.05, 0.26, 0.03);
    const angryBrows = [-1, 1].map((side) => {
      const brow = new THREE.Mesh(angryBrowGeometry, eyeDarkMaterial);
      brow.position.set(side * 0.17, 0.3, 0.5);
      brow.rotation.z = -side * 0.9;
      brow.visible = false;
      root.add(brow);
      return brow;
    });

    const hornGeometry = new THREE.ConeGeometry(0.1, 0.55, 6);
    const horns = [-1, 1].map((side) => {
      const horn = new THREE.Mesh(hornGeometry, boneMaterial);
      horn.position.set(side * 0.34, 0.6, -0.02);
      horn.rotation.z = -side * 0.45;
      horn.visible = false;
      root.add(horn);
      return horn;
    });

    const backBoneGeometry = new THREE.CylinderGeometry(0.04, 0.04, 1.15, 6);
    const backBoneTiltAngle = Math.PI * 0.36;
    const backBonePosition = [0, -0.42, -0.05];

    const backBoneA = new THREE.Mesh(backBoneGeometry, boneMaterial);
    backBoneA.rotation.z = backBoneTiltAngle;
    backBoneA.position.set(...backBonePosition);
    backBoneA.visible = false;
    root.add(backBoneA);

    const backBoneB = new THREE.Mesh(backBoneGeometry, boneMaterial);
    backBoneB.rotation.z = -backBoneTiltAngle;
    backBoneB.position.set(...backBonePosition);
    backBoneB.visible = false;
    root.add(backBoneB);

    const spikeGeometry = new THREE.ConeGeometry(0.045, 0.2, 4);
    const backSpikes = [];
    const backSpikeCount = 5;
    for (let i = 0; i < backSpikeCount; i++) {
      const angle = Math.PI * 1.15 + (i / (backSpikeCount - 1)) * Math.PI * 0.7;
      const spike = new THREE.Mesh(spikeGeometry, boneMaterial);
      spike.position.set(Math.cos(angle) * 0.48, 0.33, Math.sin(angle) * 0.44);
      spike.lookAt(spike.position.clone().multiplyScalar(2));
      spike.rotateX(Math.PI / 2);
      spike.visible = false;
      root.add(spike);
      backSpikes.push(spike);
    }

    const tuskGeometry = new THREE.ConeGeometry(0.055, 0.28, 5);
    const tusks = [-1, 1].map((side) => {
      const tusk = new THREE.Mesh(tuskGeometry, boneMaterial);
      tusk.position.set(side * 0.23, -0.48, 0.3);
      tusk.rotation.set(Math.PI, 0, side * 0.5);
      tusk.visible = false;
      root.add(tusk);
      return tusk;
    });

    partsRef.current = {
      root,
      angryBrows,
      horns,
      backSpikes,
      tusks,
      backBoneA,
      backBoneB,
      boneMaterial,
      eyeLeft,
      eyeRight,
      eyeDarkMaterial,
      eyeGlowMaterial,
    };

    let frameId;
    const clock = new THREE.Clock();
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsedTime = clock.elapsedTime;
      const currentPower = powerRef.current;

      const craze = Math.min(Math.max(currentPower - 12, 0) / 6, 1);
      root.rotation.y = Math.sin(elapsedTime * 13) * 0.02 * craze;
      root.rotation.x = Math.sin(elapsedTime * 13.7) * 0.02 * craze;
      root.rotation.z = Math.sin(elapsedTime * 11) * 0.02 * craze;
      root.position.y = Math.sin(elapsedTime * 1.6) * 0.04;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      craniumGeometry.dispose();
      jawGeometry.dispose();
      eyeGeometry.dispose();
      noseGeometry.dispose();
      angryBrowGeometry.dispose();
      hornGeometry.dispose();
      backBoneGeometry.dispose();
      spikeGeometry.dispose();
      tuskGeometry.dispose();
      boneMaterial.dispose();
      eyeDarkMaterial.dispose();
      eyeGlowMaterial.dispose();
      renderer.dispose();
      partsRef.current = null;
    };
  }, []);

  useEffect(() => {
    const parts = partsRef.current;
    if (!parts) {
      return;
    }

    const color = getDifficultyColor(power);
    parts.boneMaterial.color.copy(color);
    const emissiveStrength = power <= 5 ? 0 : Math.min((power - 5) / 10, 0.8);
    parts.boneMaterial.emissive.copy(color).multiplyScalar(emissiveStrength);

    for (const brow of parts.angryBrows) {
      brow.visible = power >= 2;
    }
    for (const horn of parts.horns) {
      horn.visible = power >= 4;
    }
    const backVisible = power >= 6;
    const backBig = power >= 12;
    for (const spike of parts.backSpikes) {
      spike.visible = backVisible;
      spike.scale.setScalar(backBig ? 2 : 1.3);
    }
    for (const tusk of parts.tusks) {
      tusk.visible = power >= 9;
    }
    const backBoneGrowth = power >= 12 ? 1.3 : 1;
    parts.backBoneA.visible = power >= 6;
    parts.backBoneA.scale.setScalar(backBoneGrowth);
    parts.backBoneB.visible = power >= 9;
    parts.backBoneB.scale.setScalar(backBoneGrowth);

    const eyeMaterial = power >= 7 ? parts.eyeGlowMaterial : parts.eyeDarkMaterial;
    parts.eyeLeft.material = eyeMaterial;
    parts.eyeRight.material = eyeMaterial;
  }, [power]);

  const lapProgress = Math.min(Math.max(progress - power, 0), 1);
  const ringColor = getDifficultyColorStyle(power);
  const isMaxed = lapProgress >= 0.985;
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
          animation: isMaxed ? "skull-ring-pulse 1.4s ease-in-out infinite" : "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: `${RING_THICKNESS}px`,
          borderRadius: "50%",
          background: "#08080e",
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
