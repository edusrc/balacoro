export function createFloatingText(content, color, worldPos, floatAmount) {
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "absolute",
    color,
    fontFamily: "monospace",
    fontSize: "18px",
    fontWeight: "bold",
    pointerEvents: "none",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    transition: "all 1s ease-out",
    opacity: "1",
    boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
    zIndex: 1000,
  });
  el.innerText = content;

  const { x, y } = worldToScreen(worldPos);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;

  requestAnimationFrame(() => {
    el.style.top = `${y - floatAmount}px`;
    el.style.opacity = "0";
  });

  setTimeout(() => el.remove(), 1000);
  return el;
}

function worldToScreen(worldPos) {
  const canvas = document.querySelector("canvas");
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  const camera = window.currentCamera;
  const vector = worldPos.clone().project(camera);

  return {
    x: ((vector.x + 1) * width) / 2 + rect.left,
    y: ((-vector.y + 1) * height) / 2 + rect.top,
  };
}
