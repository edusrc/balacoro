const BIOME_COLORS = {
  city: "#4a4a52",
  forest: "#2e5d3a",
  desert: "#c9b071",
  snow: "#cfe6f2",
};

import { getDifficultyColorStyle } from "../objects/MonsterGenome.js";

export class Minimap {
  constructor(container, range = 60) {
    this.container = container;
    this.range = range;
    this.createCanvasElement();
  }

  createCanvasElement() {
    this.canvasElement = document.createElement("canvas");
    this.canvasElement.width = 200;
    this.canvasElement.height = 200;
    Object.assign(this.canvasElement.style, {
      position: "absolute",
      bottom: "20px",
      right: "20px",
      borderRadius: "50%",
      border: "3px solid #fff",
      boxShadow: "0 0 10px rgba(0, 0, 0, 0.6)",
      background: "rgba(0, 0, 0, 0.6)",
      zIndex: "20",
    });
    this.renderingContext = this.canvasElement.getContext("2d");
    this.container.appendChild(this.canvasElement);
  }

  update(player, enemies, items, tileManager) {
    if (!player) {
      return;
    }

    const canvasWidth = this.canvasElement.width;
    const canvasHeight = this.canvasElement.height;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const maximumRadius = Math.min(centerX, centerY) - 8;
    const scale = maximumRadius / this.range;

    this.renderingContext.clearRect(0, 0, canvasWidth, canvasHeight);
    this.drawBackgroundCircle(centerX, centerY, maximumRadius);

    if (tileManager) {
      this.renderBiomeLayer(
        player.position,
        tileManager,
        centerX,
        centerY,
        scale,
        maximumRadius
      );
    }

    for (const enemy of enemies) {
      if (enemy.isDormant) {
        continue;
      }
      if (enemy.isBoss) {
        this.drawBossSkull(
          enemy.position,
          player.position,
          centerX,
          centerY,
          scale,
          maximumRadius
        );
      } else {
        this.drawEntityDot(
          enemy.position,
          player.position,
          centerX,
          centerY,
          scale,
          maximumRadius,
          enemy.isElite
            ? `hsl(${(performance.now() * 0.2) % 360}, 100%, 60%)`
            : getDifficultyColorStyle(enemy.difficulty)
        );
      }
    }

    for (const item of items) {
      this.drawEntityDot(
        item.position,
        player.position,
        centerX,
        centerY,
        scale,
        maximumRadius,
        "#cc66ff"
      );
    }

    this.drawPlayerDot(centerX, centerY);
  }

  renderBiomeLayer(
    playerPosition,
    tileManager,
    centerX,
    centerY,
    scale,
    maximumRadius
  ) {
    const ctx = this.renderingContext;
    const cellWorld = 10;
    const startX =
      Math.floor((playerPosition.x - this.range) / cellWorld) * cellWorld;
    const startZ =
      Math.floor((playerPosition.z - this.range) / cellWorld) * cellWorld;
    const endX = playerPosition.x + this.range;
    const endZ = playerPosition.z + this.range;
    const cellPx = cellWorld * scale;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, maximumRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = 0.55;

    for (let wx = startX; wx <= endX; wx += cellWorld) {
      for (let wz = startZ; wz <= endZ; wz += cellWorld) {
        const biome = tileManager.getBiomeNameAt(
          wx + cellWorld / 2,
          wz + cellWorld / 2
        );
        ctx.fillStyle = BIOME_COLORS[biome] ?? "#222";
        ctx.fillRect(
          centerX + (wx - playerPosition.x) * scale,
          centerY + (wz - playerPosition.z) * scale,
          cellPx + 0.5,
          cellPx + 0.5
        );
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawBackgroundCircle(centerX, centerY, radius) {
    this.renderingContext.beginPath();
    this.renderingContext.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.renderingContext.fillStyle = "rgba(20, 20, 20, 0.7)";
    this.renderingContext.fill();
  }

  drawEntityDot(
    targetPosition,
    playerPosition,
    centerX,
    centerY,
    scale,
    maximumRadius,
    color
  ) {
    const offsetX = (targetPosition.x - playerPosition.x) * scale;
    const offsetZ = (targetPosition.z - playerPosition.z) * scale;
    const distanceFromCenter = Math.sqrt(
      offsetX * offsetX + offsetZ * offsetZ
    );

    if (distanceFromCenter > maximumRadius) {
      return;
    }

    this.renderingContext.beginPath();
    this.renderingContext.arc(
      centerX + offsetX,
      centerY + offsetZ,
      4,
      0,
      Math.PI * 2
    );
    this.renderingContext.fillStyle = color;
    this.renderingContext.fill();
  }

  drawBossSkull(
    targetPosition,
    playerPosition,
    centerX,
    centerY,
    scale,
    maximumRadius
  ) {
    const offsetX = (targetPosition.x - playerPosition.x) * scale;
    const offsetZ = (targetPosition.z - playerPosition.z) * scale;
    const distanceFromCenter = Math.sqrt(
      offsetX * offsetX + offsetZ * offsetZ
    );

    if (distanceFromCenter > maximumRadius) {
      return;
    }

    const positionX = centerX + offsetX;
    const positionY = centerY + offsetZ;

    this.renderingContext.beginPath();
    this.renderingContext.arc(positionX, positionY, 8, 0, Math.PI * 2);
    this.renderingContext.fillStyle = "rgba(255, 51, 51, 0.7)";
    this.renderingContext.fill();

    this.renderingContext.font = "bold 11px sans-serif";
    this.renderingContext.textAlign = "center";
    this.renderingContext.textBaseline = "middle";
    this.renderingContext.fillStyle = "#ffffff";
    this.renderingContext.fillText("☠", positionX, positionY);
  }

  drawPlayerDot(centerX, centerY) {
    this.renderingContext.beginPath();
    this.renderingContext.arc(centerX, centerY, 5, 0, Math.PI * 2);
    this.renderingContext.fillStyle = "#ffee00";
    this.renderingContext.fill();
  }

  dispose() {
    if (this.canvasElement && this.canvasElement.parentNode) {
      this.canvasElement.parentNode.removeChild(this.canvasElement);
    }
  }
}
