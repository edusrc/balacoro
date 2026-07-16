import React, { useEffect, useState } from "react";
import { BANNER_DURATION } from "../constants.js";

export default function Banner({ banner }) {
  const [phase, setPhase] = useState("in");

  useEffect(() => {
    if (!banner) {
      return undefined;
    }
    setPhase("in");
    const holdTimeoutId = setTimeout(
      () => setPhase("out"),
      BANNER_DURATION * 1000 - 600
    );
    const endTimeoutId = setTimeout(
      () => setPhase("done"),
      BANNER_DURATION * 1000
    );
    return () => {
      clearTimeout(holdTimeoutId);
      clearTimeout(endTimeoutId);
    };
  }, [banner]);

  if (!banner || phase === "done") {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "22%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 40,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        opacity: phase === "in" ? 1 : 0,
        transition: "opacity 0.6s ease",
        fontFamily: '"Press Start 2P", monospace',
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "34px", filter: `drop-shadow(0 0 12px ${banner.color})` }}>
        {banner.icon}
      </div>
      <div
        style={{
          fontSize: "22px",
          letterSpacing: "5px",
          color: banner.color,
          textShadow: `0 0 18px ${banner.color}, 0 0 4px #000`,
        }}
      >
        {banner.text}
      </div>
      <div
        style={{
          width: "min(60vw, 420px)",
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${banner.color}, transparent)`,
        }}
      />
    </div>
  );
}
