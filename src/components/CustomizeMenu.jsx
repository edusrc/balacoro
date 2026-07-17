import React, { useState } from "react";
import MenuStage, { MENU_CSS } from "./MenuStage.jsx";
import CoinIcon from "./CoinIcon.jsx";
import {
  loadCustomization,
  saveCustomization,
} from "../core/customization.js";
import { PLAYER_COLORS, ACCESSORY_CATEGORIES } from "../core/cosmetics.js";
import {
  getCoins,
  spendCoins,
  isOwned,
  unlockCosmetic,
} from "../core/wallet.js";
import { audio } from "../core/AudioEngine.js";

const CUSTOMIZE_CSS = `
  .cosmetic-scroll {
    max-height: 260px;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    scrollbar-width: thin;
    scrollbar-color: #ffee00 rgba(255, 255, 255, 0.08);
  }
  .cosmetic-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .cosmetic-scroll::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }
  .cosmetic-scroll::-webkit-scrollbar-thumb {
    background: #ffee00;
    border-radius: 4px;
    box-shadow: 0 0 6px rgba(255, 238, 0, 0.6);
  }
`;

const TABS = [
  { id: "color", label: "COLOR" },
  ...ACCESSORY_CATEGORIES.map(({ id, label }) => ({ id, label })),
];

export default function CustomizeMenu({ onBack }) {
  const [customization, setCustomization] = useState(loadCustomization);
  const [tab, setTab] = useState("color");
  const [coins, setCoins] = useState(getCoins);

  const update = (patch) => {
    const next = { ...customization, ...patch };
    setCustomization(next);
    saveCustomization(next);
  };

  const effectIds = new Set(
    ACCESSORY_CATEGORIES.find((category) => category.id === "effect").options.map(
      (option) => option.id
    )
  );

  const toggleAccessory = (option) => {
    const accessories = customization.accessories ?? [];
    const isEffect = option.kind === "effect";
    if (accessories.includes(option.id)) {
      audio.play("uiClick");
      update({ accessories: accessories.filter((id) => id !== option.id) });
      return;
    }
    const withOption = (list) =>
      isEffect
        ? [...list.filter((id) => !effectIds.has(id)), option.id]
        : [...list, option.id];
    if (isOwned(option.kind, option.id)) {
      audio.play("uiClick");
      update({ accessories: withOption(accessories) });
      return;
    }
    if (spendCoins(option.price)) {
      audio.play("uiBuy");
      unlockCosmetic(option.kind, option.id);
      setCoins(getCoins());
      update({ accessories: withOption(accessories) });
    }
  };

  const renderSwatches = (selectedColor, patchKey) => (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "10px",
        maxWidth: "220px",
      }}
    >
      {PLAYER_COLORS.map((color) => (
        <button
          key={color}
          className={`swatch${selectedColor === color ? " selected" : ""}`}
          style={{
            background: `#${color.toString(16).padStart(6, "0")}`,
          }}
          onMouseEnter={() => audio.play("uiHover")}
          onClick={() => {
            audio.play("uiClick");
            update({ [patchKey]: color });
          }}
        />
      ))}
    </div>
  );

  const activeCategory = ACCESSORY_CATEGORIES.find(
    (category) => category.id === tab
  );

  const renderAccessoryList = (options) => (
    <div className="cosmetic-scroll">
      {options.map((option) => {
        const active = (customization.accessories ?? []).includes(option.id);
        const owned = isOwned(option.kind, option.id);
        const affordable = coins >= option.price;
        return (
          <button
            key={option.id}
            className={`menu-button${active ? " selected" : ""}`}
            style={{
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              opacity: owned || affordable ? 1 : 0.45,
              flexShrink: 0,
              width: "100%",
              boxSizing: "border-box",
            }}
            onMouseEnter={() => audio.play("uiHover")}
            onClick={() => toggleAccessory(option)}
          >
            <span style={{ fontSize: "15px" }}>
              {option.kind === "effect"
                ? active
                  ? "◉"
                  : "○"
                : active
                  ? "☑"
                  : "☐"}
            </span>
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
      <style>{CUSTOMIZE_CSS}</style>

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

        <div style={{ pointerEvents: "auto", maxWidth: "360px" }}>
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
            <div>
              <div
                style={{
                  fontSize: "9px",
                  color: "#888",
                  letterSpacing: "2px",
                  margin: "0 0 8px",
                }}
              >
                CUBE
              </div>
              {renderSwatches(customization.color, "color")}
              <div
                style={{
                  fontSize: "9px",
                  color: "#888",
                  letterSpacing: "2px",
                  margin: "14px 0 8px",
                }}
              >
                SHOT
              </div>
              {renderSwatches(
                customization.projectileColor,
                "projectileColor"
              )}
            </div>
          )}

          {activeCategory && renderAccessoryList(activeCategory.options)}

          <button
            className="menu-button"
            style={{ marginTop: "30px", fontSize: "14px" }}
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
