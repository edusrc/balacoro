import React, { useEffect, useRef, useState } from "react";
import { Game } from "./threejs/Game";

export default function App() {
  const threeRef = useRef(null);
  const [stats, setStats] = useState({
    camPos: { x: 0, y: 0, z: 0 },
    difficulty: 0,
    elapsedTime: 0,
    player: {
      health: 100,
      attackSpeed: 1,
      speed: 5,
      damage: 1,
      sharpening: 1,
      glowing: false,
      healthRegen: 0,
      criticalDamage: 0,
      criticalChance: 0,
      lifeSteal: 0,
      thorns: false,
      thornsDamage: 0,
      level: 1,
      currentXP: 0,
      xpToLevelUp: 10,
      active_skills: {
        dash: { enabled: false, cooldown: 0 },
        energyExplosion: { enabled: false, cooldown: 0, damage: 0 },
        freezeExplosion: { enabled: false, cooldown: 0, freezeDuration: 0 },
        forceField: { enabled: false, shieldCount: 0 },
      },
    },
  });

  const gameRef = useRef(null);

  useEffect(() => {
    const game = new Game(threeRef.current);
    gameRef.current = game;

    let animationFrameId;

    function updateStats() {
      if (gameRef.current && gameRef.current.camera) {
        const { x, y, z } = gameRef.current.camera.position;
        const difficulty = gameRef.current.scene.currentDifficulty || 0;
        const elapsedTime = gameRef.current.scene.elapsedTime || 0;
        const player = gameRef.current.scene.player;

        setStats({
          camPos: { x, y, z },
          difficulty,
          elapsedTime,
          player: {
            health: player?.health ?? 100,
            attackSpeed: player?.attackSpeed ?? 1,
            speed: player?.speed ?? 5,
            damage: player?.damage ?? 1,
            sharpening: player?.sharpening ?? 1,
            glowing: player?.glowing ?? false,
            healthRegen: player?.healthRegen ?? 0,
            criticalDamage: player?.criticalDamage ?? 0,
            criticalChance: player?.criticalChance ?? 0,
            lifeSteal: player?.lifeSteal ?? 0,
            thorns: player?.thorns ?? false,
            thornsDamage: player?.thornsDamage ?? 0,
            level: player?.level ?? 1,
            currentXP: player?.currentXP ?? 0,
            xpToLevelUp: player?.getXPToLevelUp?.() ?? 10,
            active_skills: player?.active_skills ?? {},
          },
        });
      }
      animationFrameId = requestAnimationFrame(updateStats);
    }

    updateStats();

    return () => {
      if (gameRef.current) {
        gameRef.current.dispose();
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={threeRef} style={{ width: "100%", height: "100%" }} />

      {/* Camera info */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          color: "white",
          background: "rgba(0,0,0,0.5)",
          padding: "5px",
          borderRadius: "4px",
          pointerEvents: "none",
          fontFamily: "monospace",
          fontSize: "14px",
        }}
      >
        <div>
          <strong>Camera Pos:</strong> X={stats.camPos.x.toFixed(2)}, Y=
          {stats.camPos.y.toFixed(2)}, Z={stats.camPos.z.toFixed(2)}
        </div>
        <div>
          <strong>Difficulty:</strong> {stats.difficulty}
        </div>
        <div>
          <strong>Total Time:</strong> {stats.elapsedTime.toFixed(2)} s
        </div>
      </div>

      {/* Player stats */}
      <div
        style={{
          position: "absolute",
          top: 110,
          left: 10,
          color: "white",
          background: "rgba(0,0,0,0.5)",
          padding: "5px",
          borderRadius: "4px",
          pointerEvents: "none",
          fontFamily: "monospace",
          fontSize: "14px",
          maxWidth: "300px",
        }}
      >
        <div>
          <strong>Health:</strong> {stats.player.health}
        </div>
        <div>
          <strong>Damage:</strong> {stats.player.damage}
        </div>
        <div>
          <strong>Speed:</strong> {stats.player.speed}
        </div>
        <div>
          <strong>Attack Speed:</strong> {stats.player.attackSpeed.toFixed(2)}
        </div>
        <div>
          <strong>Sharpening:</strong> {stats.player.sharpening}
        </div>
        <div>
          <strong>Health Regen:</strong> {stats.player.healthRegen}
        </div>
        <div>
          <strong>Critical Damage:</strong> {stats.player.criticalDamage}
        </div>
        <div>
          <strong>Critical Chance:</strong> {stats.player.criticalChance}%
        </div>
        <div>
          <strong>Life Steal:</strong> {stats.player.lifeSteal}
        </div>
        <div>
          <strong>Level:</strong> {stats.player.level}
        </div>
        <div>
          <strong>XP:</strong> {stats.player.currentXP.toFixed(1)} /{" "}
          {stats.player.xpToLevelUp.toFixed(1)}
        </div>

        <div>
          <strong>Skills:</strong>
        </div>
        <ul>
          <li>
            Dash: {stats.player.active_skills.dash?.enabled ? "Yes" : "No"} (CD:{" "}
            {stats.player.active_skills.dash?.cooldown}s)
          </li>
          <li>
            Energy Explosion:{" "}
            {stats.player.active_skills.energyExplosion?.enabled ? "Yes" : "No"}{" "}
            (CD: {stats.player.active_skills.energyExplosion?.cooldown}s, DMG:{" "}
            {stats.player.active_skills.energyExplosion?.damage})
          </li>
          <li>
            Freeze Explosion:{" "}
            {stats.player.active_skills.freezeExplosion?.enabled ? "Yes" : "No"}{" "}
            (CD: {stats.player.active_skills.freezeExplosion?.cooldown}s,
            Duration:{" "}
            {stats.player.active_skills.freezeExplosion?.freezeDuration}s)
          </li>
          <li>
            Force Field:{" "}
            {stats.player.active_skills.forceField?.enabled ? "Yes" : "No"}{" "}
            (Shields: {stats.player.active_skills.forceField?.shieldCount})
          </li>
          <li>
            Thorns: {stats.player.active_skills.thorns?.enabled ? "Yes" : "No"}{" "}
            (DMG: {stats.player.active_skills.thorns?.damage})
          </li>
          <li>
            Glowing:{" "}
            {stats.player.active_skills.glowing?.enabled ? "Yes" : "No"}
          </li>
          <li>
            Project Glowing:{" "}
            {stats.player.active_skills.projectGlowing?.enabled ? "Yes" : "No"}
          </li>
        </ul>
      </div>

      {/* XP Bar */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80%",
          height: "32px",
          background: "#111",
          border: "4px solid #fff",
          boxShadow: "0 0 0 4px #444, 0 0 10px #b3b1b3",
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "10px",
          color: "#fff",
          textAlign: "center",
          lineHeight: "32px",
          imageRendering: "pixelated",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${
              (stats.player.currentXP / stats.player.xpToLevelUp) * 100
            }%`,
            height: "100%",
            background: "#00ff6e",
            transition: "width 0.3s ease-in-out",
            imageRendering: "pixelated",
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            width: "100%",
            top: 0,
            left: 0,
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          XP: {stats.player.currentXP.toFixed(1)} /{" "}
          {stats.player.xpToLevelUp.toFixed(1)}
        </div>
      </div>

      <div id="levelUpModal" className="level-up-modal">
        <h3>Choose a passive to upgrade:</h3>
        <div id="passiveOptions"></div>
      </div>

      <div id="skillChoiceModal" className="level-up-modal">
        <h3>Choose a skill to unlock or upgrade:</h3>
        <div
          id="skillOptions"
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        ></div>
      </div>
    </div>
  );
}
