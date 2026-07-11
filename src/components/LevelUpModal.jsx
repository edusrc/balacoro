import React from "react";
import { PLAYER_PASSIVES, PASSIVE_COLORS } from "../constants.js";

const INCREMENT_LABELS = {
  health: "+15 HP",
  damage: "+0.5 DMG",
  speed: "+1 SPD",
  attackSpeed: "+10% AS",
  sharpening: "+1 PIERCE",
  healthRegen: "+0.4/s",
  criticalDamage: "+5% CRIT DMG",
  criticalChance: "+3% CRIT",
  lifeSteal: "+3% STEAL",
};

const PASSIVE_ICONS = {
  health: "❤",
  damage: "⚔",
  speed: "➤",
  attackSpeed: "⚡",
  sharpening: "➹",
  healthRegen: "✚",
  criticalDamage: "✷",
  criticalChance: "✦",
  lifeSteal: "☠",
};

function formatLabel(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}

export default function LevelUpModal({ onChoose }) {
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
        .upgrade-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          background: #181824;
          border: 2px solid #2a2a3a;
          border-radius: 8px;
          padding: 16px 10px;
          cursor: pointer;
          font-family: inherit;
          color: #fff;
          transition: transform 0.12s ease, border-color 0.12s ease,
            box-shadow 0.12s ease;
        }
        .upgrade-card:hover {
          transform: translateY(-4px);
          border-color: var(--accent);
          box-shadow: 0 0 16px var(--accent);
        }
      `}</style>

      <div
        style={{
          background: "#101018",
          border: "2px solid #ffee00",
          borderRadius: "10px",
          padding: "28px 32px",
          maxWidth: "640px",
        }}
      >
        <h2
          style={{
            fontSize: "22px",
            color: "#ffee00",
            textAlign: "center",
            margin: "0 0 10px",
            textShadow: "0 0 14px rgba(255, 238, 0, 0.6)",
          }}
        >
          LEVEL UP!
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
          CHOOSE A PASSIVE TO UPGRADE
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
          }}
        >
          {Object.keys(PLAYER_PASSIVES).map((passive) => (
            <button
              key={passive}
              className="upgrade-card"
              style={{ "--accent": PASSIVE_COLORS[passive] }}
              onClick={() => onChoose(passive)}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "8px",
                  background: PASSIVE_COLORS[passive],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  color: "#000",
                }}
              >
                {PASSIVE_ICONS[passive]}
              </div>
              <div style={{ fontSize: "9px", textAlign: "center" }}>
                {formatLabel(passive)}
              </div>
              <div
                style={{
                  fontSize: "9px",
                  color: PASSIVE_COLORS[passive],
                }}
              >
                {INCREMENT_LABELS[passive] ??
                  `+${PLAYER_PASSIVES[passive].increment}`}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
