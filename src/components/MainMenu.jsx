import React, { useState } from "react";
import MenuStage, { MENU_CSS } from "./MenuStage.jsx";
import { loadCustomization } from "../core/customization.js";
import { audio } from "../core/AudioEngine.js";
import {
  getRunHistory,
  getBestRun,
  formatDuration,
} from "../core/history.js";

const MENU_ITEMS = [
  { id: "play", label: "PLAY" },
  { id: "customize", label: "CUSTOMIZE" },
  { id: "monsterlab", label: "MONSTER LAB" },
  { id: "options", label: "OPTIONS" },
];

export default function MainMenu({
  onPlay,
  onCustomize,
  onMonsterLab,
  onOptions,
}) {
  const [customization] = useState(loadCustomization);
  const [runs] = useState(getRunHistory);
  const bestRun = getBestRun(runs);

  const handleSelect = (item) => {
    if (item.disabled) {
      return;
    }
    audio.play("uiClick");
    if (item.id === "play") {
      onPlay();
    }
    if (item.id === "customize") {
      onCustomize();
    }
    if (item.id === "monsterlab") {
      onMonsterLab();
    }
    if (item.id === "options") {
      onOptions();
    }
  };

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

      <MenuStage
        color={customization.color}
        accessories={customization.accessories}
        projectileColor={customization.projectileColor}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "40px",
          paddingLeft: "8%",
          pointerEvents: "none",
        }}
      >
        <h1
          style={{
            fontSize: "min(7vw, 80px)",
            letterSpacing: "10px",
            color: "#ffee00",
            textShadow:
              "0 0 24px rgba(255, 238, 0, 0.5), 5px 5px 0 #7a5c00",
            margin: 0,
          }}
        >
          BALACORO
        </h1>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "14px",
            pointerEvents: "auto",
          }}
        >
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              className="menu-button"
              disabled={item.disabled}
              onMouseEnter={() => !item.disabled && audio.play("uiHover")}
              onClick={() => handleSelect(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {runs.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "24px",
            right: "24px",
            width: "300px",
            padding: "18px 20px",
            background: "rgba(8, 8, 14, 0.82)",
            border: "1px solid rgba(255, 238, 0, 0.35)",
            borderRadius: "8px",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "3px",
              color: "#ffee00",
              marginBottom: "12px",
            }}
          >
            ☠ BEST RUN
          </div>
          <div
            style={{
              fontSize: "9px",
              color: "#fff",
              letterSpacing: "1px",
              lineHeight: "2",
              marginBottom: "14px",
            }}
          >
            TIME {formatDuration(bestRun.time)} • LVL {bestRun.level}
            <br />
            DIFFICULTY {bestRun.power} • {bestRun.coins} COINS
          </div>
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "2px",
              color: "#888",
              marginBottom: "8px",
            }}
          >
            LAST RUNS
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              fontSize: "8px",
              color: "#aaa",
              letterSpacing: "1px",
            }}
          >
            {runs.slice(0, 5).map((run, index) => (
              <div key={run.date ?? index}>
                {formatDuration(run.time)} • LVL {run.level} • DIF {run.power}{" "}
                • {run.coins}c
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
