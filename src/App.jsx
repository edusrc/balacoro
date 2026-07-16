import React, { useEffect, useRef, useState } from "react";
import { Game } from "./threejs/Game";
import MainMenu from "./components/MainMenu.jsx";
import CustomizeMenu from "./components/CustomizeMenu.jsx";
import MonsterLabMenu from "./components/MonsterLabMenu.jsx";
import LevelUpModal from "./components/LevelUpModal.jsx";
import SkillChoiceModal from "./components/SkillChoiceModal.jsx";
import CoinIcon from "./components/CoinIcon.jsx";
import Banner from "./components/Banner.jsx";
import DifficultySkull from "./components/DifficultySkull.jsx";
import { addCoins as bankCoins } from "./core/wallet.js";
import { isDebugMode } from "./core/debug.js";

export default function App() {
  const threeRef = useRef(null);
  const [screen, setScreen] = useState("menu");
  const [gameOver, setGameOver] = useState(false);
  const [gameOverStats, setGameOverStats] = useState({ level: 1, elapsedTime: 0 });
  const [isCameraInfoVisible, setIsCameraInfoVisible] = useState(false);
  const [isPlayerStatsVisible, setIsPlayerStatsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [skillChoices, setSkillChoices] = useState(null);
  const [banner, setBanner] = useState(null);

  const [stats, setStats] = useState({
    camPos: { x: 0, y: 0, z: 0 },
    difficulty: 0,
    elapsedTime: 0,
    clock: "12:00",
    power: 0,
    powerProgress: 0,
    player: {
      health: 100,
      maxHealth: 100,
      attackSpeed: 1,
      speed: 5,
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
    if (screen !== "game") {
      return undefined;
    }

    const game = new Game(threeRef.current);
    gameRef.current = game;
    game.scene.onGameOver = (finalStats) => {
      setGameOver(true);
      setGameOverStats(finalStats);
      bankCoins(finalStats.coins ?? 0);
    };
    game.scene.onPauseChange = (paused) => {
      setIsPaused(paused);
    };
    game.scene.onShowLevelUp = () => {
      setLevelUpOpen(true);
    };
    game.scene.onShowSkillChoices = (skills) => {
      setSkillChoices(skills);
    };
    game.scene.onBanner = (nextBanner) => {
      setBanner(nextBanner);
    };
    let animationFrameId;

    function updateStats() {
      if (gameRef.current && gameRef.current.camera) {
        const { x, y, z } = gameRef.current.camera.position;
        const difficulty = gameRef.current.scene.currentDifficulty || 0;
        const elapsedTime = gameRef.current.scene.elapsedTime || 0;
        const clock = gameRef.current.clockText ?? "12:00";
        const coins = gameRef.current.scene.coinsEarned ?? 0;
        const power = gameRef.current.scene.currentPower ?? 0;
        const powerProgress = gameRef.current.scene.currentPowerContinuous ?? 0;
        const player = gameRef.current.scene.player;

        setStats({
          camPos: { x, y, z },
          difficulty,
          elapsedTime,
          clock,
          coins,
          power,
          powerProgress,
          player: {
            health: player?.health ?? 100,
            maxHealth: player?.maxHealth ?? 100,
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
            dashCooldownTimer: player?.dashCooldownTimer ?? 0,
            dashCharges: player?.dashCharges ?? 0,
            forceFieldCooldownTimer: player?.forceFieldCooldownTimer ?? 0,
          },
        });
      }
      animationFrameId = requestAnimationFrame(updateStats);
    }

    updateStats();

    return () => {
      if (gameRef.current) {
        gameRef.current.dispose();
        gameRef.current = null;
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [screen]);

  useEffect(() => {
    const debugHotkeys = {
      Digit2: () => setIsCameraInfoVisible((previousValue) => !previousValue),
      Digit3: () => setIsPlayerStatsVisible((previousValue) => !previousValue),
      Digit4: () => gameRef.current?.scene?.player?.gainXP(10),
      Digit5: () => gameRef.current?.scene?.debugAdjustDifficulty(1),
      Digit6: () => gameRef.current?.scene?.debugAdjustDifficulty(-1),
      Digit7: () => gameRef.current?.scene?.player?.debugGodMode(),
    };

    function onKeyDown(event) {
      if (event.code === "Escape") {
        if (gameRef.current && gameRef.current.scene) {
          gameRef.current.scene.togglePause();
        }
        return;
      }

      if (!isDebugMode()) {
        return;
      }

      const runDebugHotkey = debugHotkeys[event.code];
      if (runDebugHotkey) {
        runDebugHotkey();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const returnToMenu = () => {
    if (!gameOver) {
      bankCoins(gameRef.current?.scene?.coinsEarned ?? 0);
    }
    setScreen("menu");
    setIsPaused(false);
    setGameOver(false);
    setLevelUpOpen(false);
    setSkillChoices(null);
    setBanner(null);
  };

  if (screen === "menu") {
    return (
      <MainMenu
        onPlay={() => setScreen("game")}
        onCustomize={() => setScreen("customize")}
        onMonsterLab={() => setScreen("monsterlab")}
      />
    );
  }

  if (screen === "customize") {
    return <CustomizeMenu onBack={() => setScreen("menu")} />;
  }

  if (screen === "monsterlab") {
    return <MonsterLabMenu onBack={() => setScreen("menu")} />;
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={threeRef} style={{ width: "100%", height: "100%" }} />

      {isCameraInfoVisible && (
        <div
          style={{
            position: "absolute",
            top: 80,
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
      )}

      {isPlayerStatsVisible && (
      <div
        style={{
          position: "absolute",
          top: 160,
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
          <strong>Speed:</strong> {stats.player.speed}
        </div>
        <div>
          <strong>Damage:</strong> {stats.player.damage}
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
          <strong>Critical Chance:</strong>{" "}
          {(stats.player.criticalChance * 100).toFixed(1)}%
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
      )}

      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          width: "220px",
          height: "14px",
          background: "#111",
          border: "2px solid #fff",
          boxShadow: "0 0 0 2px #444, 0 0 6px #b3b1b3",
          imageRendering: "pixelated",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${(stats.player.health / stats.player.maxHealth) * 100}%`,
            height: "100%",
            background: "#ff3333",
            transition: "width 0.3s ease-in-out",
            imageRendering: "pixelated",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: "34px",
          left: "10px",
          width: "220px",
          height: "8px",
          background: "#111",
          border: "2px solid #fff",
          boxShadow: "0 0 0 2px #444, 0 0 6px #b3b1b3",
          imageRendering: "pixelated",
          borderRadius: "3px",
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
      </div>

      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "16px",
          color: "#ffd23e",
          textShadow: "2px 2px #000",
          pointerEvents: "none",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <CoinIcon size={16} />
        {stats.coins}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "232px",
          right: "20px",
          width: "200px",
          textAlign: "center",
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "13px",
          color: "#fff",
          textShadow: "2px 2px #000",
          pointerEvents: "none",
          zIndex: 20,
        }}
      >
        {stats.clock}
      </div>

      <DifficultySkull power={stats.power} progress={stats.powerProgress} />
      <Banner banner={banner} />

      {levelUpOpen && (
        <LevelUpModal
          onChoose={(passive) => {
            gameRef.current?.scene.choosePassive(passive);
            setLevelUpOpen(false);
          }}
        />
      )}

      {skillChoices && (
        <SkillChoiceModal
          skills={skillChoices}
          activeSkills={stats.player.active_skills}
          onChoose={(skill) => {
            gameRef.current?.scene.chooseSkill(skill);
            setSkillChoices(null);
          }}
        />
      )}

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
          <div
            id="dashContainer"
            style={{
              position: "relative",
              width: "48px",
              height: "48px",
              transform:
                stats.player.dashCharges >=
                (stats.player.active_skills.dash.charges ?? 1)
                  ? "scale(1.2)"
                  : "scale(1)",
              transition: "transform 0.2s ease",
            }}
          >
            <img
              id="dashIcon"
              src="./assets/imgs/dash.png"
              style={{
                width: "100%",
                height: "100%",
                opacity: stats.player.dashCharges > 0 ? 1 : 0.4,
                transition: "opacity 0.2s ease",
                imageRendering: "pixelated",
              }}
              alt="Dash Icon"
            />
            {stats.player.dashCooldownTimer > 0 && (
              <div
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  top: 0,
                  left: 0,
                  background: `conic-gradient(
          rgba(0, 0, 0, 0.6) ${
            (stats.player.dashCooldownTimer /
              stats.player.active_skills.dash.cooldown) *
            360
          }deg,
          transparent 0deg
        )`,
                  borderRadius: "50%",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />
            )}
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
                zIndex: 3,
              }}
            >
              {stats.player.dashCharges > 0
                ? stats.player.dashCharges
                : Math.ceil(stats.player.dashCooldownTimer)}
            </span>
          </div>
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
              {stats.player.freezeExplosionTimer > 0
                ? Math.ceil(stats.player.freezeExplosionTimer)
                : stats.player.active_skills.freezeExplosion?.duration ?? 0}
            </span>
            <span
              style={{
                position: "absolute",
                bottom: "2px",
                right: "4px",
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "10px",
                color: "#fff",
                textShadow: "1px 1px #000",
                pointerEvents: "none",
                zIndex: 3,
              }}
            >
              Q
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
            <img
              src="./assets/imgs/explosion.png"
              alt="Energy Explosion Icon"
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
              {stats.player.energyExplosionTimer > 0
                ? Math.ceil(stats.player.energyExplosionTimer)
                : stats.player.active_skills.energyExplosion?.damage ?? 0}
            </span>
            <span
              style={{
                position: "absolute",
                bottom: "2px",
                right: "4px",
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "10px",
                color: "#fff",
                textShadow: "1px 1px #000",
                pointerEvents: "none",
                zIndex: 3,
              }}
            >
              E
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
              transform:
                stats.player.shieldCount >=
                (stats.player.active_skills.forceField.shieldCount ?? 1)
                  ? "scale(1.2)"
                  : "scale(1)",
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
            {stats.player.forceFieldCooldownTimer > 0 && (
              <div
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  top: 0,
                  left: 0,
                  background: `conic-gradient(
          rgba(0, 0, 0, 0.6) ${
            (stats.player.forceFieldCooldownTimer /
              Math.min(
                stats.player.active_skills.forceField.cooldown,
                stats.player.active_skills.forceField.maxCooldown
              )) *
            360
          }deg,
          transparent 0deg
        )`,
                  borderRadius: "50%",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />
            )}
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

      {isPaused && !gameOver && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            fontFamily: '"Press Start 2P", monospace',
            color: "#fff",
          }}
        >
          <h1
            style={{
              fontSize: "40px",
              marginBottom: "20px",
              textShadow: "0 0 20px #ffffff",
            }}
          >
            PAUSED
          </h1>
          <button
            onClick={() => {
              if (gameRef.current) {
                gameRef.current.scene.togglePause();
              }
            }}
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "14px",
              padding: "14px 28px",
              marginBottom: "16px",
              background: "#fff",
              color: "#000",
              border: "none",
              cursor: "pointer",
              borderRadius: "4px",
              letterSpacing: "2px",
            }}
          >
            RESUME
          </button>
          <button
            onClick={returnToMenu}
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "14px",
              padding: "14px 28px",
              background: "transparent",
              color: "#fff",
              border: "2px solid #fff",
              cursor: "pointer",
              borderRadius: "4px",
              letterSpacing: "2px",
            }}
          >
            BACK TO MENU
          </button>
        </div>
      )}

      {gameOver && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.88)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            fontFamily: '"Press Start 2P", monospace',
            color: "#fff",
          }}
        >
          <h1
            style={{
              fontSize: "48px",
              marginBottom: "32px",
              color: "#ff3333",
              textShadow: "0 0 20px #ff0000",
            }}
          >
            GAME OVER
          </h1>
          <p style={{ fontSize: "16px", marginBottom: "12px" }}>
            Level: {gameOverStats.level}
          </p>
          <p style={{ fontSize: "16px", marginBottom: "12px" }}>
            Time: {gameOverStats.elapsedTime?.toFixed(1)}s
          </p>
          <p
            style={{
              fontSize: "16px",
              marginBottom: "40px",
              color: "#ffd23e",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CoinIcon size={16} /> +{gameOverStats.coins ?? 0}
          </p>
          <button
            onClick={() => location.reload()}
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "14px",
              padding: "14px 28px",
              background: "#fff",
              color: "#000",
              border: "none",
              cursor: "pointer",
              borderRadius: "4px",
              letterSpacing: "2px",
            }}
          >
            RESTART
          </button>
        </div>
      )}
    </div>
  );
}
