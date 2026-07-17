import React, { useState } from "react";
import { MENU_CSS } from "./MenuStage.jsx";
import { audio } from "../core/AudioEngine.js";

export default function OptionsMenu({ onBack }) {
  const [volumes, setVolumes] = useState(() => ({ ...audio.userVolumes }));

  const changeVolume = (key, value) => {
    if (key === "master") {
      audio.setMasterVolume(value);
    } else if (key === "music") {
      audio.setMusicVolume(value);
    } else {
      audio.setEffectsVolume(value);
    }
    setVolumes({ ...audio.userVolumes });
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "#08080e",
        fontFamily: '"Press Start 2P", monospace',
        color: "#fff",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingLeft: "8%",
        gap: "34px",
      }}
    >
      <style>{MENU_CSS}</style>

      <h1
        style={{
          fontSize: "min(4vw, 44px)",
          letterSpacing: "6px",
          color: "#ffee00",
          textShadow: "0 0 24px rgba(255, 238, 0, 0.5), 4px 4px 0 #7a5c00",
          margin: 0,
        }}
      >
        OPTIONS
      </h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "26px",
          width: "min(360px, 70vw)",
          padding: "26px 28px",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 238, 0, 0.35)",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "3px",
            color: "#888",
          }}
        >
          AUDIO
        </div>
        {[
          { key: "music", label: "MUSIC" },
          { key: "effects", label: "EFFECTS" },
        ].map(({ key, label }) => (
          <label
            key={key}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              fontSize: "11px",
              letterSpacing: "2px",
              color: "#ccc",
            }}
          >
            <span>
              {label}: {Math.round(volumes[key] * 100)}%
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volumes[key]}
              onChange={(event) =>
                changeVolume(key, Number(event.target.value))
              }
              style={{ accentColor: "#ffee00", width: "100%" }}
            />
          </label>
        ))}
      </div>

      <button
        className="menu-button"
        style={{ fontSize: "14px", width: "min(360px, 70vw)" }}
        onMouseEnter={() => audio.play("uiHover")}
        onClick={() => {
          audio.play("uiClick");
          onBack();
        }}
      >
        &lt; BACK
      </button>
    </div>
  );
}
