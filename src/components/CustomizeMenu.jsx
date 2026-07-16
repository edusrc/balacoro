import React, { useState } from "react";
import MenuStage, { MENU_CSS } from "./MenuStage.jsx";
import CoinIcon from "./CoinIcon.jsx";
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
import {
  getCoins,
  spendCoins,
  isOwned,
  unlockCosmetic,
} from "../core/wallet.js";
import { audio } from "../core/AudioEngine.js";

const TABS = [
  { id: "color", label: "COLOR" },
  { id: "hat", label: "HAT" },
  { id: "glasses", label: "GLASSES" },
  { id: "ears", label: "EARS" },
];

const COSMETIC_TABS = {
  hat: HAT_OPTIONS,
  glasses: GLASSES_OPTIONS,
  ears: EAR_OPTIONS,
};

export default function CustomizeMenu({ onBack }) {
  const [customization, setCustomization] = useState(loadCustomization);
  const [tab, setTab] = useState("color");
  const [coins, setCoins] = useState(getCoins);

  const update = (patch) => {
    const next = { ...customization, ...patch };
    setCustomization(next);
    saveCustomization(next);
  };

  const selectCosmetic = (kind, option) => {
    if (isOwned(kind, option.id)) {
      audio.play("uiClick");
      update({ [kind]: option.id });
      return;
    }
    if (spendCoins(option.price)) {
      audio.play("uiBuy");
      unlockCosmetic(kind, option.id);
      setCoins(getCoins());
      update({ [kind]: option.id });
    }
  };

  const renderCosmeticList = (kind) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {COSMETIC_TABS[kind].map((option) => {
        const owned = isOwned(kind, option.id);
        const affordable = coins >= option.price;
        return (
          <button
            key={option.id}
            className={`menu-button${
              customization[kind] === option.id ? " selected" : ""
            }`}
            style={{
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              opacity: owned || affordable ? 1 : 0.45,
            }}
            onMouseEnter={() => audio.play("uiHover")}
            onClick={() => selectCosmetic(kind, option)}
          >
            <span>{option.label}</span>
            {!owned && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  color: "#ffd23e",
                }}
              >
                🔒 <CoinIcon size={12} /> {option.price}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

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
        <div>
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "14px",
              fontSize: "14px",
              color: "#ffd23e",
              textShadow: "2px 2px #000",
            }}
          >
            <CoinIcon size={15} /> {coins}
          </div>
        </div>

        <div style={{ pointerEvents: "auto", maxWidth: "340px" }}>
          <div style={{ display: "flex", gap: "18px", marginBottom: "24px" }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`tab-button${tab === t.id ? " active" : ""}`}
                onMouseEnter={() => audio.play("uiHover")}
                onClick={() => {
                  audio.play("uiClick");
                  setTab(t.id);
                }}
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

          {tab === "hat" && renderCosmeticList("hat")}
          {tab === "glasses" && renderCosmeticList("glasses")}
          {tab === "ears" && renderCosmeticList("ears")}

          <button
            className="menu-button"
            style={{ marginTop: "36px", fontSize: "14px" }}
            onMouseEnter={() => audio.play("uiHover")}
            onClick={() => {
              audio.play("uiClick");
              onBack();
            }}
          >
            &lt; BACK
          </button>
        </div>
      </div>
    </div>
  );
}
