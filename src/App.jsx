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
            shieldCount: player?.shieldCount ?? 0,
            freezeExplosionTimer: player?.freezeExplosionTimer ?? 0,
            energyExplosionTimer: player?.energyExplosionTimer ?? 0,
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

      <div
        id="hud"
        style={{
          position: "absolute",
          top: "50%",
          right: "20px",
          transform: "translateY(-50%)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",

          gap: "12px",
        }}
      >
        {stats.player.active_skills.dash?.enabled && (
          <img
            id="dashIcon"
            src="./assets/imgs/dash.png"
            style={{
              width: "48px",
              height: "48px",
              opacity:
                stats.player.active_skills.dash.cooldown > 0 &&
                stats.player.dashCooldownTimer > 0
                  ? 0.3
                  : 1,
              transition: "opacity 0.2s ease",
              imageRendering: "pixelated",
            }}
            alt="Dash Icon"
          />
        )}

        {stats.player.active_skills.freezeExplosion?.enabled && (
          <div
            id="freezeExplosionContainer"
            style={{
              position: "relative",
              width: "48px",
              height: "48px",
              transform:
                +stats.player.freezeExplosionTimer.toFixed(1) <= 0
                  ? "scale(1.2)"
                  : "scale(1)",
              transition: "transform 0.2s ease",
            }}
          >
            <img
              src="./assets/imgs/freeze.png"
              alt="Freeze Explosion Icon"
              style={{
                width: "100%",
                height: "100%",
                imageRendering: "pixelated",
              }}
            />
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
                background: `conic-gradient(
          rgba(0, 0, 0, 0.6) ${
            (stats.player.freezeExplosionTimer /
              stats.player.active_skills.freezeExplosion.cooldown) *
            360
          }deg,
          transparent 0deg
        )`,
                borderRadius: "50%",
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "12px",
                color: "#0ff",
                textShadow: "1px 1px #000",
                pointerEvents: "none",
                zIndex: 3,
              }}
            >
              {stats.player.active_skills.freezeExplosion?.duration ?? 0}
            </span>
          </div>
        )}

        {stats.player.active_skills.energyExplosion?.enabled && (
          <div
            id="energyExplosionContainer"
            style={{
              position: "relative",
              width: "48px",
              height: "48px",
              transform:
                +stats.player.energyExplosionTimer.toFixed(1) <= 0
                  ? "scale(1.2)"
                  : "scale(1)",
              transition: "transform 0.2s ease",
            }}
          >
            {/* Ícone de fundo */}
            <img
              src="./assets/imgs/explosion.png"
              alt="Energy Explosion Icon"
              style={{
                width: "100%",
                height: "100%",
                imageRendering: "pixelated",
              }}
            />
            {/* Máscara radial de cooldown */}
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
                background: `conic-gradient(
          rgba(0, 0, 0, 0.6) ${
            (stats.player.energyExplosionTimer /
              stats.player.active_skills.energyExplosion.cooldown) *
            360
          }deg,
          transparent 0deg
        )`,
                borderRadius: "50%",
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
            {/* Valor (dano) no centro */}
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "12px",
                color: "#ff0",
                textShadow: "1px 1px #000",
                pointerEvents: "none",
                zIndex: 3,
              }}
            >
              {stats.player.active_skills.energyExplosion?.damage ?? 0}
            </span>
          </div>
        )}

        {stats.player.active_skills.forceField?.enabled && (
          <div
            id="shieldContainer"
            style={{
              position: "relative",
              width: "48px",
              height: "48px",
              transition: "transform 0.2s ease",
            }}
          >
            <img
              id="shieldIcon"
              src="./assets/imgs/shield.png"
              alt="Shield Icon"
              style={{
                width: "100%",
                height: "100%",
                imageRendering: "pixelated",
              }}
            />
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "12px",
                color: "#fff",
                textShadow: "1px 1px #000",
                pointerEvents: "none",
              }}
            >
              {stats.player.shieldCount}
            </span>
          </div>
        )}

        {stats.player.active_skills.thorns?.enabled && (
          <div
            id="thornsContainer"
            style={{
              position: "relative",
              width: "48px",
              height: "48px",
            }}
          >
            <img
              id="thornsIcon"
              src="./assets/imgs/thorns.png"
              alt="Thorns Icon"
              style={{
                width: "100%",
                height: "100%",
                imageRendering: "pixelated",
              }}
            />
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "12px",
                color: "#fff",
                textShadow: "1px 1px #000",
                pointerEvents: "none",
              }}
            >
              {stats.player.active_skills.thorns.damage}
            </span>
          </div>
        )}

        {/* Glowing Icon */}
        {stats.player.active_skills.glowing?.enabled && (
          <img
            id="glowingIcon"
            src="./assets/imgs/glowing.png"
            alt="Glowing Icon"
            style={{
              width: "48px",
              height: "48px",
              imageRendering: "pixelated",
              filter: "drop-shadow(0 0 4px #f4f025 )",
            }}
          />
        )}

        {/* Project Glowing Icon */}
        {stats.player.active_skills.projectGlowing?.enabled && (
          <img
            id="projectGlowingIcon"
            src="./assets/imgs/project_glowing.png"
            alt="Project Glowing Icon"
            style={{
              width: "48px",
              height: "48px",
              imageRendering: "pixelated",
              filter: "drop-shadow(0 0 4px #0f0)",
            }}
          />
        )}
      </div>
    </div>
  );
}
