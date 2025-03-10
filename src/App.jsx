import React, { useEffect, useRef, useState } from "react";
import { Game } from "./threejs/Game";

export default function App() {
  const threeRef = useRef(null);
  const [camPos, setCamPos] = useState({ x: 0, y: 0, z: 0 });

  const gameRef = useRef(null);

  useEffect(() => {
    const game = new Game(threeRef.current);
    gameRef.current = game;

    let animationFrameId;

    function updateCameraPos() {
      if (gameRef.current && gameRef.current.camera) {
        const { x, y, z } = gameRef.current.camera.position;
        setCamPos({ x, y, z });
      }
      animationFrameId = requestAnimationFrame(updateCameraPos);
    }

    updateCameraPos();

    return () => {
      if (gameRef.current) {
        gameRef.current.dispose();
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={threeRef} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          color: "white",
          background: "rgba(0,0,0,0.5)",
          padding: "5px",
          borderRadius: "4px",
          pointerEvents: "none",
        }}
      >
        Camera Pos: X={camPos.x.toFixed(2)}, Y={camPos.y.toFixed(2)}, Z=
        {camPos.z.toFixed(2)}
      </div>
    </div>
  );
}
