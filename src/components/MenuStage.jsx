import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { createAccessory } from "../core/cosmetics.js";
import { TrailEmitter, getTrailDefinitions } from "../core/trails.js";

const PIXEL_SCALE = 3;
const CUBE_X = 2.2;
const IDLE_RESUME_SECONDS = 4;
const TRAIL_WIND = new THREE.Vector3(2.4, 0, 0);

export const MENU_CSS = `
  .menu-button {
    background: transparent;
    border: none;
    color: #ccc;
    font-family: inherit;
    font-size: 18px;
    text-align: left;
    letter-spacing: 2px;
    cursor: pointer;
    padding: 8px 0;
    transition: color 0.15s ease, transform 0.15s ease;
  }
  .menu-button:hover:not(:disabled) {
    color: #ffee00;
    transform: translateX(10px);
    text-shadow: 0 0 12px rgba(255, 238, 0, 0.6);
  }
  .menu-button:disabled {
    color: #444;
    cursor: default;
  }
  .menu-button.selected {
    color: #ffee00;
  }
  .tab-button {
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    color: #888;
    font-family: inherit;
    font-size: 13px;
    letter-spacing: 2px;
    cursor: pointer;
    padding: 8px 2px;
    transition: color 0.15s ease;
  }
  .tab-button:hover {
    color: #fff;
  }
  .tab-button.active {
    color: #ffee00;
    border-bottom-color: #ffee00;
  }
  .swatch {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    cursor: pointer;
    padding: 0;
    transition: transform 0.1s ease, border-color 0.1s ease;
  }
  .swatch:hover {
    transform: scale(1.15);
  }
  .swatch.selected {
    border-color: #fff;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  }
`;

export default function MenuStage({ color, accessories = [], projectileColor }) {
  const canvasRef = useRef(null);
  const cubeRef = useRef(null);
  const shotRef = useRef(null);
  const accessoriesRef = useRef([]);
  const sceneRef = useRef(null);
  const trailRef = useRef(null);

  useEffect(() => {
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: false,
    });
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08080e);
    scene.fog = new THREE.FogExp2(0x08080e, 0.045);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(0, 2.6, 7);
    camera.lookAt(1.1, 1, 0);

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(
        Math.max(Math.floor(width / PIXEL_SCALE), 1),
        Math.max(Math.floor(height / PIXEL_SCALE), 1),
        false
      );
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    cube.position.set(CUBE_X, 0.8, 0);
    cube.castShadow = true;
    scene.add(cube);
    cubeRef.current = cube;

    const eyeGeometry = new THREE.BoxGeometry(0.18, 0.18, 0.06);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(side * 0.2, 0.15, 0.51);
      cube.add(eye);
    }

    const shot = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.22, 0.22),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    scene.add(shot);
    shotRef.current = shot;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x14141e })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const spot = new THREE.SpotLight(0xfff2c0, 4, 20, Math.PI / 7, 0.4, 0);
    spot.position.set(CUBE_X, 5.5, 0);
    spot.target = cube;
    spot.castShadow = true;
    scene.add(spot);
    scene.add(spot.target);

    scene.add(new THREE.AmbientLight(0xffffff, 0.08));

    const beamHeight = 4.6;
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(2, beamHeight, 32, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff2c0,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    beam.position.set(CUBE_X, beamHeight / 2 + 0.01, 0);
    scene.add(beam);

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const dragState = {
      active: false,
      lastX: 0,
      lastY: 0,
      targetY: 0,
      targetX: 0,
      velocityY: 0,
      velocityX: 0,
    };
    let idleTime = IDLE_RESUME_SECONDS;

    const isPointerOnCube = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      return raycaster.intersectObject(cube, true).length > 0;
    };

    const onPointerDown = (event) => {
      if (!isPointerOnCube(event)) {
        return;
      }
      dragState.active = true;
      dragState.lastX = event.clientX;
      dragState.lastY = event.clientY;
      dragState.targetY = cube.rotation.y;
      dragState.targetX = cube.rotation.x;
      dragState.velocityY = 0;
      dragState.velocityX = 0;
      idleTime = 0;
      renderer.domElement.style.cursor = "grabbing";
    };

    const onPointerMove = (event) => {
      if (dragState.active) {
        dragState.targetY += (event.clientX - dragState.lastX) * 0.011;
        dragState.targetX += (event.clientY - dragState.lastY) * 0.011;
        dragState.targetX = Math.max(Math.min(dragState.targetX, 1.2), -1.2);
        dragState.lastX = event.clientX;
        dragState.lastY = event.clientY;
        idleTime = 0;
        return;
      }
      renderer.domElement.style.cursor = isPointerOnCube(event)
        ? "grab"
        : "default";
    };

    const onPointerUp = () => {
      if (!dragState.active) {
        return;
      }
      dragState.active = false;
      idleTime = 0;
      renderer.domElement.style.cursor = "default";
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.elapsedTime;
      if (dragState.active) {
        const pull = Math.min(delta * 5, 1);
        const previousY = cube.rotation.y;
        const previousX = cube.rotation.x;
        cube.rotation.y += (dragState.targetY - cube.rotation.y) * pull;
        cube.rotation.x += (dragState.targetX - cube.rotation.x) * pull;
        if (delta > 0) {
          dragState.velocityY = (cube.rotation.y - previousY) / delta;
          dragState.velocityX = (cube.rotation.x - previousX) / delta;
        }
      } else {
        idleTime += delta;
        const friction = Math.exp(-delta * 2.2);
        dragState.velocityY *= friction;
        dragState.velocityX *= friction;
        if (Math.abs(dragState.velocityY) > 0.01) {
          cube.rotation.y += dragState.velocityY * delta;
        }
        if (Math.abs(dragState.velocityX) > 0.01) {
          cube.rotation.x = Math.max(
            Math.min(cube.rotation.x + dragState.velocityX * delta, 1.2),
            -1.2
          );
        }
        if (idleTime >= IDLE_RESUME_SECONDS) {
          cube.rotation.y += delta * 0.9;
          cube.rotation.x += (0 - cube.rotation.x) * Math.min(delta * 2, 1);
        }
      }
      cube.position.y = 0.8 + Math.sin(elapsedTime * 1.6) * 0.1;
      shot.position.set(
        CUBE_X + Math.cos(elapsedTime * 1.8) * 1.4,
        1 + Math.sin(elapsedTime * 2.7) * 0.2,
        Math.sin(elapsedTime * 1.8) * 1.4
      );
      shot.rotation.x += delta * 3;
      shot.rotation.y += delta * 2;
      trailRef.current?.update(delta, cube.position, true);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      disposeAccessories(accessoriesRef);
      trailRef.current?.dispose();
      trailRef.current = null;
      sceneRef.current = null;
      cubeRef.current = null;
      shotRef.current = null;
      shot.geometry.dispose();
      shot.material.dispose();
      cube.geometry.dispose();
      cube.material.dispose();
      eyeGeometry.dispose();
      eyeMaterial.dispose();
      ground.geometry.dispose();
      ground.material.dispose();
      beam.geometry.dispose();
      beam.material.dispose();
      renderer.dispose();
    };
  }, []);

  const accessoriesKey = accessories.join("|");

  useEffect(() => {
    const cube = cubeRef.current;
    if (!cube) {
      return;
    }

    cube.material.color.set(color);
    cube.material.emissive.set(color).multiplyScalar(0.18);

    if (shotRef.current) {
      shotRef.current.material.color.set(projectileColor ?? 0x00ff00);
    }

    disposeAccessories(accessoriesRef, cube);
    for (const accessory of accessoriesKey
      .split("|")
      .filter(Boolean)
      .map(createAccessory)) {
      if (!accessory) {
        continue;
      }
      accessory.traverse((child) => {
        child.castShadow = true;
      });
      cube.add(accessory);
      accessoriesRef.current.push(accessory);
    }

    if (trailRef.current) {
      trailRef.current.dispose();
      trailRef.current = null;
    }
    if (sceneRef.current) {
      trailRef.current = new TrailEmitter(
        sceneRef.current,
        getTrailDefinitions(accessoriesKey.split("|").filter(Boolean)),
        { wind: TRAIL_WIND }
      );
    }
  }, [color, accessoriesKey, projectileColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
      }}
    />
  );
}

function disposeAccessories(accessoriesRef, cube) {
  for (const accessory of accessoriesRef.current) {
    if (cube) {
      cube.remove(accessory);
    }
    accessory.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
  }
  accessoriesRef.current = [];
}
