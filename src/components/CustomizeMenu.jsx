import React, { useMemo, useState } from "react";
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
    max-height: 220px;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px 8px 6px 6px;
    margin: -6px -8px -6px -6px;
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
  .buy-button {
    background: rgba(255, 238, 0, 0.14);
    border: 2px solid #ffee00;
    border-radius: 6px;
    color: #ffee00;
    font-family: inherit;
    font-size: 12px;
    letter-spacing: 2px;
    padding: 12px 26px;
    cursor: pointer;
    transition: background 0.15s ease, box-shadow 0.15s ease;
  }
  .buy-button:hover:not(:disabled) {
    background: rgba(255, 238, 0, 0.28);
    box-shadow: 0 0 16px rgba(255, 238, 0, 0.55);
  }
  .buy-button:disabled {
    border-color: #555;
    color: #555;
    cursor: default;
    background: transparent;
  }
`;

const TABS = [
  { id: "color", label: "COLOR" },
  ...ACCESSORY_CATEGORIES.map(({ id, label }) => ({ id, label })),
];

function formatPrice(price) {
  return price.toLocaleString("en-US");
}

export default function CustomizeMenu({ onBack }) {
  const [customization, setCustomization] = useState(loadCustomization);
  const [tab, setTab] = useState("color");
  const [coins, setCoins] = useState(getCoins);
  const [previewOption, setPreviewOption] = useState(null);

  const update = (patch) => {
    const next = { ...customization, ...patch };
    setCustomization(next);
    saveCustomization(next);
  };

  const effectIds = useMemo(
    () =>
      new Set(
        ACCESSORY_CATEGORIES.find(
          (category) => category.id === "effect"
        ).options.map((option) => option.id)
      ),
    []
  );

  const withOption = (list, option) => {
    if (option.kind === "effect") {
      return [...list.filter((id) => !effectIds.has(id)), option.id];
    }
    return [...list, option.id];
  };

  const previewAccessories = useMemo(() => {
    const base = customization.accessories ?? [];
    if (!previewOption || base.includes(previewOption.id)) {
      return base;
    }
    return withOption(base, previewOption);
  }, [customization.accessories, previewOption, effectIds]);

  const directEquipToggle = (option) => {
    const accessories = customization.accessories ?? [];
    audio.play("uiClick");
    if (accessories.includes(option.id)) {
      update({ accessories: accessories.filter((id) => id !== option.id) });
    } else {
      update({ accessories: withOption(accessories, option) });
    }
    setPreviewOption(null);
  };

  const selectPreview = (option) => {
    audio.play("uiClick");
    setPreviewOption((current) =>
      current?.id === option.id && current?.kind === option.kind
        ? null
        : option
    );
  };

  const rowClick = (option) => {
    if (isOwned(option.kind, option.id)) {
      directEquipToggle(option);
    } else {
      selectPreview(option);
    }
  };

  const buySelected = () => {
    if (!previewOption) {
      return;
    }
    const accessories = customization.accessories ?? [];
    if (spendCoins(previewOption.price)) {
      audio.play("uiBuy");
      unlockCosmetic(previewOption.kind, previewOption.id);
      setCoins(getCoins());
      update({ accessories: withOption(accessories, previewOption) });
      setPreviewOption(null);
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
        const isPreviewed =
          previewOption?.id === option.id && previewOption?.kind === option.kind;
        return (
          <button
            key={option.id}
            className={`menu-button${active ? " selected" : ""}`}
            style={{
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
              width: "100%",
              boxSizing: "border-box",
              padding: "7px 8px",
              borderRadius: "4px",
              background: isPreviewed ? "rgba(0, 229, 255, 0.12)" : "transparent",
              boxShadow: isPreviewed
                ? "0 0 0 2px #00e5ff, 0 0 10px rgba(0, 229, 255, 0.45)"
                : "none",
            }}
            onMouseEnter={() => audio.play("uiHover")}
            onClick={() => rowClick(option)}
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
                  marginLeft: "auto",
                }}
              >
                🔒 <CoinIcon size={12} /> {formatPrice(option.price)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const previewAffordable = previewOption && coins >= previewOption.price;

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
        accessories={previewAccessories}
        projectileColor={customization.projectileColor}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "22px",
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
            <CoinIcon size={15} /> {formatPrice(coins)}
          </div>
        </div>

        <div style={{ pointerEvents: "auto", maxWidth: "360px" }}>
          <div style={{ display: "flex", gap: "18px", marginBottom: "20px" }}>
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
            <div style={{ marginBottom: "8px" }}>
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
            style={{ marginTop: "22px", fontSize: "14px" }}
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

      {previewOption && (
        <div
          style={{
            position: "absolute",
            bottom: "8%",
            right: "5%",
            zIndex: 60,
            padding: "14px 18px",
            background: "rgba(8, 8, 14, 0.9)",
            border: "2px solid #ffee00",
            borderRadius: "8px",
            boxShadow: "0 0 20px rgba(255, 238, 0, 0.35)",
            display: "flex",
            alignItems: "center",
            gap: "18px",
            fontFamily: '"Press Start 2P", monospace',
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: "#ffd23e",
            }}
          >
            <CoinIcon size={13} /> {formatPrice(previewOption.price)}
          </div>
          <button
            className="buy-button"
            disabled={!previewAffordable}
            onMouseEnter={() => previewAffordable && audio.play("uiHover")}
            onClick={buySelected}
          >
            BUY
          </button>
        </div>
      )}
    </div>
  );
}
