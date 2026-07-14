import * as THREE from "three";
import { MainScene } from "../scenes/MainScene";
import { Minimap } from "../core/Minimap";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPixelatedPass } from "three/examples/jsm/postprocessing/RenderPixelatedPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { setFloatingTextCamera } from "../components/createFloatingText.js";
import { DAY_DURATION, NIGHT_DURATION, ENABLE_MINI_VIEW } from "../constants";

const TOTAL_CYCLE = DAY_DURATION + NIGHT_DURATION;

export class Game {
  constructor(container) {
    this.container = container;
    this.startTime = Date.now() - (DAY_DURATION / 2) * 1000;
    this.totalElapsedTime = DAY_DURATION / 2;
    this.lastFrameTime = Date.now();
    this.init();
  }

  init() {
    this.initRenderer();
    this.initSceneAndCamera();
    this.initLights();
    this.initSky();
    this.initPostProcessing();
    this.initInteraction();
    this.initDayNightIcon();
    this.initMinimap();
    if (ENABLE_MINI_VIEW) {
      this.initMiniView();
    }
    this.animate();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.physicallyCorrectLights = true;
    this.container.appendChild(this.renderer.domElement);
  }

  initSceneAndCamera() {
    this.scene = new MainScene();
    this.scene.fog = new THREE.FogExp2(0xb3b3b3, 0.01);
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 10, 10);
    setFloatingTextCamera(this.camera);
  }

  initLights() {
    this.sunHorizonColor = new THREE.Color(0xff8c42);
    this.sunNoonColor = new THREE.Color(0xfff6e8);
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.bias = -0.0001;

    const shadowCamera = this.sunLight.shadow.camera;
    shadowCamera.left = -60;
    shadowCamera.right = 60;
    shadowCamera.top = 60;
    shadowCamera.bottom = -60;
    shadowCamera.near = 1;
    shadowCamera.far = 500;

    this.sunLight.target = new THREE.Object3D();
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(this.ambientLight);

    this.sun = new THREE.Vector3();
    this.sunSphere = new THREE.Mesh(
      new THREE.SphereGeometry(10, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    this.scene.add(this.sunSphere);
  }

  initSky() {
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    this.scene.add(this.sky);

    const uniforms = this.sky.material.uniforms;
    uniforms["turbidity"].value = 10;
    uniforms["rayleigh"].value = 3;
    uniforms["mieCoefficient"].value = 0.005;
    uniforms["mieDirectionalG"].value = 0.7;

    this.updateSunPosition(0);
  }

  initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.renderPixelatedPass = new RenderPixelatedPass(
      3,
      this.scene,
      this.camera
    );
    this.renderPixelatedPass.normalEdgeStrength = 0.3;
    this.renderPixelatedPass.depthEdgeStrength = 0.2;
    this.composer.addPass(this.renderPixelatedPass);
    this.composer.addPass(new OutputPass());
  }

  initInteraction() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.container.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("resize", this.onWindowResize);
  }

  initMiniView() {
    this.isMiniViewVisible = false;

    this.miniCanvas = document.createElement("canvas");
    Object.assign(this.miniCanvas.style, {
      position: "absolute",
      top: "10px",
      right: "10px",
      width: "200px",
      height: "200px",
      border: "1px solid #ccc",
      zIndex: "10",
      display: "none",
    });
    this.container.appendChild(this.miniCanvas);

    this.miniRenderer = new THREE.WebGLRenderer({
      canvas: this.miniCanvas,
      antialias: true,
      alpha: true,
    });
    this.miniRenderer.setSize(200, 200);
    this.miniRenderer.shadowMap.enabled = true;

    this.miniCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.miniCamera.position.set(20, 20, 20);
    this.miniCamera.lookAt(0, 0, 0);

    this.miniControls = new OrbitControls(this.miniCamera, this.miniCanvas);
    this.miniControls.enablePan = true;
    this.miniControls.enableZoom = true;
    this.miniControls.enableRotate = true;

    window.addEventListener("keydown", this.onMiniViewKeyDown);
  }

  onMiniViewKeyDown = (event) => {
    if (event.code === "Digit1") {
      this.isMiniViewVisible = !this.isMiniViewVisible;
      this.miniCanvas.style.display = this.isMiniViewVisible ? "block" : "none";
    }
  };

  initMinimap() {
    this.minimap = new Minimap(this.container);
  }

  initDayNightIcon() {
    this.icon = document.createElement("div");
    this.icon.style.position = "absolute";
    this.icon.style.top = "10px";
    this.icon.style.right = "10px";
    this.icon.style.zIndex = "20";
    this.icon.style.fontSize = "32px";
    this.icon.style.pointerEvents = "none";
    this.container.appendChild(this.icon);
  }

  updateSunPosition(elapsedSeconds) {
    const dayRatio = DAY_DURATION / TOTAL_CYCLE;
    const cycleProgress = (elapsedSeconds % TOTAL_CYCLE) / TOTAL_CYCLE;
    const isDay = cycleProgress < dayRatio;
    const dayProgress = isDay ? cycleProgress / dayRatio : 0;
    const smoothProgress = isDay ? Math.sin(dayProgress * Math.PI) : 0;

    const elevation = smoothProgress * 75;
    this.isNight = smoothProgress === 0;

    let hours;
    if (isDay) {
      hours = 6 + dayProgress * 12;
    } else {
      const nightProgress = (cycleProgress - dayRatio) / (1 - dayRatio);
      hours = (18 + nightProgress * 12) % 24;
    }
    const hh = Math.floor(hours);
    const mm = Math.floor((hours - hh) * 60);
    this.clockText = `${String(hh).padStart(2, "0")}:${String(mm).padStart(
      2,
      "0"
    )}`;

    const azimuthDegrees = 90 + dayProgress * 180;
    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuthDegrees);

    this.sun.setFromSphericalCoords(1, phi, theta);
    this.sky.material.uniforms["sunPosition"].value.copy(this.sun);

    const playerPosition = this.scene?.player?.position;
    const anchor = playerPosition ?? new THREE.Vector3();
    this.sunLight.position
      .copy(anchor)
      .addScaledVector(this.sun, 150);
    this.sunLight.target.position.copy(anchor);
    this.sunLight.target.updateMatrixWorld();
    this.sunLight.updateMatrixWorld(true);

    this.sunSphere.position.copy(anchor).addScaledVector(this.sun, 5000);

    this.sunLight.intensity = 1.3 + 3 * smoothProgress;
    this.sunLight.color.lerpColors(
      this.sunHorizonColor,
      this.sunNoonColor,
      Math.min(smoothProgress * 1.8, 1)
    );
    this.sunLight.visible = smoothProgress > 0.01;
    this.ambientLight.intensity = 0.05 + 0.15 * smoothProgress;
    this.renderer.toneMappingExposure = 0.2 + smoothProgress * 1.3;

    if (this.icon) {
      const iconStyle = this.isNight
        ? "filter: sepia(1) saturate(2.5) hue-rotate(175deg) brightness(1.25) drop-shadow(0 0 8px rgba(140, 180, 255, 0.8));"
        : "filter: sepia(1) saturate(6) hue-rotate(-15deg) brightness(1.15) drop-shadow(0 0 8px rgba(255, 200, 50, 0.8));";
      this.icon.innerHTML = `<img src="${
        this.isNight ? "./assets/imgs/moon.png" : "./assets/imgs/sun.png"
      }" width="32" height="32" style="${iconStyle}" />`;
    }
  }

  onMouseMove = (event) => {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectionPoint = new THREE.Vector3();
    if (
      this.raycaster.ray.intersectPlane(this.groundPlane, intersectionPoint)
    ) {
      const playerPosition = this.scene.player.position;
      const aimDirection = new THREE.Vector3()
        .subVectors(intersectionPoint, playerPosition)
        .normalize();
      this.scene.player.lastDirection.copy(aimDirection);
    }
  };

  animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.scene.update(this.camera);
    const now = Date.now();
    const deltaMs = now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (!this.scene.isPaused) {
      this.totalElapsedTime += deltaMs / 1000;
    }

    this.updateSunPosition(this.totalElapsedTime);
    this.scene.isNight = this.isNight;
    this.minimap.update(
      this.scene.player,
      this.scene.enemies,
      this.scene.items,
      this.scene.tileManager
    );
    if (ENABLE_MINI_VIEW && this.isMiniViewVisible) {
      this.miniRenderer.render(this.scene, this.miniCamera);
    }
    this.composer.render();
  };

  onWindowResize = () => {
    this.camera.aspect =
      this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
    this.composer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
  };

  dispose() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener("resize", this.onWindowResize);
    this.container.removeEventListener("mousemove", this.onMouseMove);
    if (ENABLE_MINI_VIEW) {
      window.removeEventListener("keydown", this.onMiniViewKeyDown);
    }
    this.minimap.dispose();
    if (this.miniRenderer) {
      this.miniRenderer.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(
          this.renderer.domElement
        );
      }
    }
  }

  isCurrentlyNight() {
    return this.isNight;
  }
}
