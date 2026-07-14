import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { MENU_CSS } from "./MenuStage.jsx";
import {
  generateGenome,
  buildMonsterBody,
  getBodyMaterial,
  ARCHETYPE_NAMES,
} from "../objects/MonsterGenome.js";

const PIXEL_SCALE = 3;
const STAGE_X = 2.2;

function MonsterStage({ genome, difficulty }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const monsterRef = useRef(null);

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

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x14141e })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const spot = new THREE.SpotLight(0xfff2c0, 4, 20, Math.PI / 7, 0.4, 0);
    spot.position.set(STAGE_X, 5.5, 0);
    spot.target.position.set(STAGE_X, 0, 0);
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
    beam.position.set(STAGE_X, beamHeight / 2 + 0.01, 0);
    scene.add(beam);

    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const t = clock.elapsedTime;

      const monster = monsterRef.current;
      if (monster) {
        monster.group.rotation.y += delta * 0.6;
        for (const part of monster.animatedParts) {
          const swing = Math.sin(t * 7 + part.phase);
          if (part.kind === "leg") {
            part.mesh.rotation.x = swing * 0.6;
          } else if (part.kind === "tail") {
            part.mesh.position.x = swing * part.amplitude;
            part.mesh.rotation.y = swing * 0.35;
          } else if (part.kind === "antenna") {
            part.mesh.rotation.z = part.baseRotZ + swing * 0.18;
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      if (monsterRef.current) {
        scene.remove(monsterRef.current.group);
        monsterRef.current.coreGeometry.dispose();
        monsterRef.current = null;
      }
      sceneRef.current = null;
      ground.geometry.dispose();
      ground.material.dispose();
      beam.geometry.dispose();
      beam.material.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (monsterRef.current) {
      scene.remove(monsterRef.current.group);
      monsterRef.current.coreGeometry.dispose();
    }

    const body = buildMonsterBody(genome, getBodyMaterial(difficulty));
    body.group.scale.set(
      genome.stretch.x * genome.sizeMult,
      genome.stretch.y * genome.sizeMult,
      genome.stretch.z * genome.sizeMult
    );
    body.group.position.set(STAGE_X, 0.4 + genome.sizeMult * 0.5, 0);
    scene.add(body.group);
    monsterRef.current = body;
  }, [genome, difficulty]);

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

function LabSlider({ label, value, min, max, step, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        fontSize: "9px",
        color: "#aaa",
        letterSpacing: "1px",
      }}
    >
      <span>
        {label}: {value}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ accentColor: "#ffee00", width: "200px" }}
      />
    </label>
  );
}

export default function MonsterLabMenu({ onBack }) {
  const [archetype, setArchetype] = useState("random");
  const [difficulty, setDifficulty] = useState(0);
  const [genome, setGenome] = useState(() => generateGenome(false));

  const regenerate = (forced = archetype) => {
    setGenome(generateGenome(false, forced === "random" ? undefined : forced));
  };

  const patchGenome = (patch) => setGenome({ ...genome, ...patch });
  const patchParts = (patch) =>
    setGenome({ ...genome, parts: { ...genome.parts, ...patch } });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        fontFamily: '"Press Start 2P", monospace',
        color: "#fff",
        zIndex: 50,
      }}
    >
      <style>{MENU_CSS}</style>

      <MonsterStage genome={genome} difficulty={difficulty} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "18px",
          paddingLeft: "6%",
          pointerEvents: "none",
        }}
      >
        <h1
          style={{
            fontSize: "min(3.5vw, 38px)",
            letterSpacing: "6px",
            color: "#ffee00",
            textShadow: "0 0 24px rgba(255, 238, 0, 0.5), 4px 4px 0 #7a5c00",
            margin: 0,
          }}
        >
          MONSTER LAB
        </h1>

        <div
          style={{
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            maxHeight: "70vh",
            overflowY: "auto",
            paddingRight: "12px",
          }}
        >
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {["random", ...ARCHETYPE_NAMES].map((name) => (
              <button
                key={name}
                className={`tab-button${archetype === name ? " active" : ""}`}
                onClick={() => {
                  setArchetype(name);
                  regenerate(name);
                }}
              >
                {name.toUpperCase()}
              </button>
            ))}
          </div>

          <div
            style={{
              fontSize: "9px",
              color: "#888",
              letterSpacing: "1px",
              lineHeight: "1.8",
            }}
          >
            TYPE: {genome.archetype.toUpperCase()}
            <br />
            SPD x{genome.speedMult.toFixed(2)} | HP x
            {genome.healthMult.toFixed(2)} | DMG x
            {genome.damageMult.toFixed(2)}
          </div>

          <LabSlider
            label="EYES"
            value={genome.eyeCount}
            min={1}
            max={4}
            step={1}
            onChange={(value) => patchGenome({ eyeCount: value })}
          />
          <LabSlider
            label="EYE SIZE"
            value={genome.eyeScale.toFixed(2)}
            min={0.75}
            max={1.45}
            step={0.05}
            onChange={(value) => patchGenome({ eyeScale: value })}
          />
          <LabSlider
            label="SPIKES"
            value={genome.parts.spikes}
            min={0}
            max={6}
            step={1}
            onChange={(value) => patchParts({ spikes: value })}
          />
          <LabSlider
            label="LEGS"
            value={genome.parts.legs}
            min={0}
            max={6}
            step={2}
            onChange={(value) => patchParts({ legs: value })}
          />
          <LabSlider
            label="TAIL"
            value={genome.parts.tailSegments}
            min={0}
            max={5}
            step={1}
            onChange={(value) => patchParts({ tailSegments: value })}
          />
          <LabSlider
            label="PLATES"
            value={genome.parts.plates}
            min={0}
            max={4}
            step={1}
            onChange={(value) => patchParts({ plates: value })}
          />
          <LabSlider
            label="SIZE"
            value={genome.sizeMult.toFixed(2)}
            min={0.6}
            max={1.6}
            step={0.05}
            onChange={(value) => patchGenome({ sizeMult: value })}
          />
          <LabSlider
            label="DIFFICULTY (COLOR)"
            value={difficulty}
            min={0}
            max={10}
            step={1}
            onChange={setDifficulty}
          />

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className={`menu-button${genome.parts.horns ? " selected" : ""}`}
              style={{ fontSize: "11px" }}
              onClick={() => patchParts({ horns: !genome.parts.horns })}
            >
              HORNS
            </button>
            <button
              className={`menu-button${
                genome.parts.antennae ? " selected" : ""
              }`}
              style={{ fontSize: "11px" }}
              onClick={() => patchParts({ antennae: !genome.parts.antennae })}
            >
              ANTENNAE
            </button>
          </div>

          <button
            className="menu-button"
            style={{ fontSize: "15px", color: "#ffee00" }}
            onClick={() => regenerate()}
          >
            ⟳ GENERATE
          </button>

          <button
            className="menu-button"
            style={{ fontSize: "12px" }}
            onClick={onBack}
          >
            &lt; BACK
          </button>
        </div>
      </div>
    </div>
  );
}
