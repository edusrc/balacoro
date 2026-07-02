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

  update(player, enemies, items) {
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

    for (const enemy of enemies) {
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
          "#ff3333"
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
