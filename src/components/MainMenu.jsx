import React, { useState } from "react";
import MenuStage, { MENU_CSS } from "./MenuStage.jsx";
import { loadCustomization } from "../core/customization.js";

const MENU_ITEMS = [
  { id: "play", label: "PLAY" },
  { id: "customize", label: "CUSTOMIZE" },
  { id: "monsterlab", label: "MONSTER LAB" },
  { id: "options", label: "OPTIONS", disabled: true },
];

export default function MainMenu({ onPlay, onCustomize, onMonsterLab }) {
  const [customization] = useState(loadCustomization);

  const handleSelect = (item) => {
    if (item.disabled) {
      return;
    }
    if (item.id === "play") {
      onPlay();
    }
    if (item.id === "customize") {
      onCustomize();
    }
    if (item.id === "monsterlab") {
      onMonsterLab();
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
        hat={customization.hat}
        glasses={customization.glasses}
        ears={customization.ears}
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
            gap: "14px",
            pointerEvents: "auto",
          }}
        >
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              className="menu-button"
              disabled={item.disabled}
              onClick={() => handleSelect(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
