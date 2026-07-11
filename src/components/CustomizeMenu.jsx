import React, { useState } from "react";
import MenuStage, { MENU_CSS } from "./MenuStage.jsx";
import {
  loadCustomization,
  saveCustomization,
} from "../core/customization.js";
import {
  PLAYER_COLORS,
  HAT_OPTIONS,
  GLASSES_OPTIONS,
  EAR_OPTIONS,
} from "../core/cosmetics.js";

const TABS = [
  { id: "color", label: "COLOR" },
  { id: "hat", label: "HAT" },
  { id: "glasses", label: "GLASSES" },
  { id: "ears", label: "EARS" },
];

export default function CustomizeMenu({ onBack }) {
  const [customization, setCustomization] = useState(loadCustomization);
  const [tab, setTab] = useState("color");

  const update = (patch) => {
    const next = { ...customization, ...patch };
    setCustomization(next);
    saveCustomization(next);
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
          gap: "28px",
          paddingLeft: "8%",
          pointerEvents: "none",
        }}
      >
        <h1
          style={{
            fontSize: "min(4vw, 44px)",
            letterSpacing: "6px",
            color: "#ffee00",
            textShadow:
              "0 0 24px rgba(255, 238, 0, 0.5), 4px 4px 0 #7a5c00",
            margin: 0,
          }}
        >
          CUSTOMIZE
        </h1>

        <div style={{ pointerEvents: "auto", maxWidth: "320px" }}>
          <div style={{ display: "flex", gap: "18px", marginBottom: "24px" }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`tab-button${tab === t.id ? " active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "color" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#888",
                    letterSpacing: "2px",
                    marginBottom: "10px",
                  }}
                >
                  CUBE
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    maxWidth: "200px",
                  }}
                >
                  {PLAYER_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`swatch${
                        customization.color === color ? " selected" : ""
                      }`}
                      style={{
                        background: `#${color.toString(16).padStart(6, "0")}`,
                      }}
                      onClick={() => update({ color })}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#888",
                    letterSpacing: "2px",
                    marginBottom: "10px",
                  }}
                >
                  SHOT
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    maxWidth: "200px",
                  }}
                >
                  {PLAYER_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`swatch${
                        customization.projectileColor === color
                          ? " selected"
                          : ""
                      }`}
                      style={{
                        background: `#${color.toString(16).padStart(6, "0")}`,
                      }}
                      onClick={() => update({ projectileColor: color })}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "hat" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {HAT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={`menu-button${
                    customization.hat === option.id ? " selected" : ""
                  }`}
                  style={{ fontSize: "14px" }}
                  onClick={() => update({ hat: option.id })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {tab === "glasses" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {GLASSES_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={`menu-button${
                    customization.glasses === option.id ? " selected" : ""
                  }`}
                  style={{ fontSize: "14px" }}
                  onClick={() => update({ glasses: option.id })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {tab === "ears" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {EAR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={`menu-button${
                    customization.ears === option.id ? " selected" : ""
                  }`}
                  style={{ fontSize: "14px" }}
                  onClick={() => update({ ears: option.id })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          <button
            className="menu-button"
            style={{ marginTop: "36px", fontSize: "14px" }}
            onClick={onBack}
          >
            &lt; BACK
          </button>
        </div>
      </div>
    </div>
  );
}
