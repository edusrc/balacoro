import React from "react";
import { audio } from "../core/AudioEngine.js";

const SKILL_ICONS = {
  dash: "./assets/imgs/dash.png",
  energyExplosion: "./assets/imgs/explosion.png",
  freezeExplosion: "./assets/imgs/freeze.png",
  forceField: "./assets/imgs/shield.png",
  thorns: "./assets/imgs/thorns.png",
  glowing: "./assets/imgs/glowing.png",
  projectGlowing: "./assets/imgs/project_glowing.png",
};

const SKILL_COLORS = {
  dash: "#ffa500",
  energyExplosion: "#ff4444",
  freezeExplosion: "#00ccff",
  forceField: "#ffff00",
  thorns: "#00ff00",
  glowing: "#90f5bc",
  projectGlowing: "#ffffff",
};

function formatLabel(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}

function skillStats(skillData) {
  return Object.entries(skillData ?? {})
    .filter(
      ([key, value]) =>
        key !== "enabled" &&
        !key.toLowerCase().includes("growth") &&
        value !== undefined
    )
    .map(([key, value]) => ({
      label: formatLabel(key),
      value: typeof value === "number" ? +value.toFixed(1) : value,
    }));
}

export default function SkillChoiceModal({ skills, activeSkills, onChoose }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0, 0, 0, 0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        fontFamily: '"Press Start 2P", monospace',
        color: "#fff",
      }}
    >
      <style>{`
        .skill-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          width: 170px;
          background: #181824;
          border: 2px solid #2a2a3a;
          border-radius: 8px;
          padding: 18px 12px;
          cursor: pointer;
          font-family: inherit;
          color: #fff;
          transition: transform 0.12s ease, border-color 0.12s ease,
            box-shadow 0.12s ease;
        }
        .skill-card:hover {
          transform: translateY(-5px);
          border-color: var(--accent);
          box-shadow: 0 0 18px var(--accent);
        }
      `}</style>

      <div
        style={{
          background: "#101018",
          border: "2px solid #00ccff",
          borderRadius: "10px",
          padding: "28px 32px",
        }}
      >
        <h2
          style={{
            fontSize: "20px",
            color: "#00ccff",
            textAlign: "center",
            margin: "0 0 10px",
            textShadow: "0 0 14px rgba(0, 204, 255, 0.6)",
          }}
        >
          SKILL FOUND!
        </h2>
        <p
          style={{
            fontSize: "10px",
            color: "#888",
            textAlign: "center",
            margin: "0 0 24px",
            letterSpacing: "2px",
          }}
        >
          UNLOCK OR UPGRADE A SKILL
        </p>

        <div style={{ display: "flex", gap: "14px" }}>
          {skills.map((skill) => {
            const data = activeSkills?.[skill];
            const isUnlocked = data?.enabled;
            const accent = SKILL_COLORS[skill] ?? "#aaaaaa";

            return (
              <button
                key={skill}
                className="skill-card"
                style={{ "--accent": accent }}
                onMouseEnter={() => audio.play("uiHover")}
                onClick={() => {
                  audio.play("skillSelect");
                  onChoose(skill);
                }}
              >
                <img
                  src={SKILL_ICONS[skill]}
                  alt={skill}
                  style={{
                    width: "56px",
                    height: "56px",
                    imageRendering: "pixelated",
                    filter: `drop-shadow(0 0 6px ${accent})`,
                  }}
                />
                <div
                  style={{
                    fontSize: "10px",
                    textAlign: "center",
                    color: accent,
                  }}
                >
                  {formatLabel(skill)}
                </div>
                {isUnlocked ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                      fontSize: "8px",
                      color: "#aaa",
                    }}
                  >
                    {skillStats(data).map((stat) => (
                      <div key={stat.label}>
                        {stat.label}: {stat.value}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#ffee00",
                      textShadow: "0 0 8px rgba(255, 238, 0, 0.6)",
                    }}
                  >
                    NEW!
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
