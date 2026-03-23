import * as THREE from "three";

const TEMP_OFFSET = new THREE.Vector3();
const TEMP_TARGET_POS = new THREE.Vector3();
const TEMP_LOOK_TARGET = new THREE.Vector3();
const TEMP_PAIR_DELTA = new THREE.Vector3();
const TEMP_PAIR_MID = new THREE.Vector3();
const TEMP_PAIR_FORWARD = new THREE.Vector3();

function smoothingAlpha(rate, dt) {
  return 1 - Math.exp(-Math.max(0, rate) * dt);
}

function shortestWrappedDelta(from, to, size) {
  let delta = to - from;
  if (delta > size * 0.5) {
    delta -= size;
  } else if (delta < -size * 0.5) {
    delta += size;
  }
  return delta;
}

function wrapAxis(value, size) {
  let wrapped = value % size;
  if (wrapped < 0) wrapped += size;
  return wrapped;
}

export class GameEngine {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x82c7f3);
    this.scene.fog = new THREE.Fog(0x9ad0f2, 260, 1500);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setScissorTest(true);

    this.cameras = {
      P1: this.createCamera(),
      P2: this.createCamera()
    };
    this.cameraState = {
      P1: {
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        lookTarget: new THREE.Vector3(),
        zoomBias: 0,
        initialized: false
      },
      P2: {
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        lookTarget: new THREE.Vector3(),
        zoomBias: 0,
        initialized: false
      }
    };

    this.splitScreen = false;
    this.splitMode = "vertical";
    this.clock = new THREE.Clock();
    this.shake = {
      strength: 0,
      decay: 12
    };

    this.ambientLight = new THREE.AmbientLight(0xbfd8ff, 0.62);
    this.directionalLight = new THREE.DirectionalLight(0xfff4d6, 1.25);
    this.directionalLight.position.set(260, 360, 220);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.set(2048, 2048);
    this.directionalLight.shadow.camera.left = -500;
    this.directionalLight.shadow.camera.right = 500;
    this.directionalLight.shadow.camera.top = 500;
    this.directionalLight.shadow.camera.bottom = -500;
    this.directionalLight.shadow.camera.near = 50;
    this.directionalLight.shadow.camera.far = 1000;
    this.scene.add(this.ambientLight, this.directionalLight);

    window.addEventListener("resize", () => this.resize());
  }

  createCamera() {
    return new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 2500);
  }

  setSplitScreen(enabled, mode = "vertical") {
    this.splitScreen = !!enabled;
    this.splitMode = mode;
  }

  addShake(amount = 0.4) {
    this.shake.strength = Math.min(2, this.shake.strength + amount);
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);

    if (this.splitScreen && this.splitMode === "vertical") {
      this.cameras.P1.aspect = (width * 0.5) / height;
      this.cameras.P2.aspect = (width * 0.5) / height;
    } else if (this.splitScreen && this.splitMode === "horizontal") {
      this.cameras.P1.aspect = width / (height * 0.5);
      this.cameras.P2.aspect = width / (height * 0.5);
    } else {
      this.cameras.P1.aspect = width / height;
      this.cameras.P2.aspect = width / height;
    }
    this.cameras.P1.updateProjectionMatrix();
    this.cameras.P2.updateProjectionMatrix();
  }

  getDeltaTime() {
    return Math.min(0.05, this.clock.getDelta());
  }

  getP1Camera() {
    return this.cameras.P1;
  }

  resetCameraState(playerId = null) {
    const ids = playerId ? [playerId] : Object.keys(this.cameraState);
    for (const id of ids) {
      const state = this.cameraState[id];
      if (!state) continue;
      state.position.set(0, 0, 0);
      state.velocity.set(0, 0, 0);
      state.lookTarget.set(0, 0, 0);
      state.zoomBias = 0;
      state.initialized = false;
    }
  }

  copyCameraState(fromPlayerId, toPlayerId) {
    const from = this.cameraState[fromPlayerId];
    const to = this.cameraState[toPlayerId];
    if (!from || !to) return;
    to.position.copy(from.position);
    to.velocity.copy(from.velocity);
    to.lookTarget.copy(from.lookTarget);
    to.zoomBias = from.zoomBias;
    to.initialized = from.initialized;
    this.cameras[toPlayerId].position.copy(this.cameras[fromPlayerId].position);
    this.cameras[toPlayerId].quaternion.copy(this.cameras[fromPlayerId].quaternion);
  }

  updateDayLight(dayClock) {
    const sunX = Math.cos(dayClock) * 320;
    const sunY = 220 + Math.sin(dayClock) * 180;
    const sunZ = Math.sin(dayClock * 0.6) * 280;
    this.directionalLight.position.set(sunX, Math.max(35, sunY), sunZ);
    this.directionalLight.intensity = 0.55 + Math.max(0.2, sunY / 320);
    this.ambientLight.intensity = 0.32 + Math.max(0.15, sunY / 520);
  }

  updateShake(dt) {
    this.shake.strength = Math.max(0, this.shake.strength - this.shake.decay * dt);
  }

  applyCameraFollow(playerId, targetPos, lookTarget, dt, options) {
    const camera = this.cameras[playerId];
    const state = this.cameraState[playerId];
    const worldSize = this.config.world.size;
    const smoothScale = options.cameraSmoothing ?? 1;

    if (!state.initialized) {
      state.position.copy(targetPos);
      state.lookTarget.copy(lookTarget);
      state.initialized = true;
    }

    const posAlpha = smoothingAlpha(Math.max(2.2, this.config.camera.smoothStrength * 2.2 * smoothScale), dt);
    state.position.x += shortestWrappedDelta(state.position.x, targetPos.x, worldSize) * posAlpha;
    state.position.y += (targetPos.y - state.position.y) * posAlpha;
    state.position.z += shortestWrappedDelta(state.position.z, targetPos.z, worldSize) * posAlpha;
    state.position.x = wrapAxis(state.position.x, worldSize);
    state.position.z = wrapAxis(state.position.z, worldSize);

    const lookAlpha = smoothingAlpha(Math.max(3.5, this.config.camera.smoothStrength * 3.1 * smoothScale), dt);
    state.lookTarget.x += shortestWrappedDelta(state.lookTarget.x, lookTarget.x, worldSize) * lookAlpha;
    state.lookTarget.y += (lookTarget.y - state.lookTarget.y) * lookAlpha;
    state.lookTarget.z += shortestWrappedDelta(state.lookTarget.z, lookTarget.z, worldSize) * lookAlpha;
    state.lookTarget.x = wrapAxis(state.lookTarget.x, worldSize);
    state.lookTarget.z = wrapAxis(state.lookTarget.z, worldSize);

    camera.position.copy(state.position);
    if (this.shake.strength > 0.001) {
      camera.position.x += (Math.random() - 0.5) * this.shake.strength;
      camera.position.y += (Math.random() - 0.5) * this.shake.strength * 0.5;
      camera.position.z += (Math.random() - 0.5) * this.shake.strength;
    }
    camera.lookAt(state.lookTarget);
  }

  updateCameraForPlayer(playerId, player, dt, options) {
    if (!player) {
      return;
    }
    const state = this.cameraState[playerId];

    const forward = player.getForward();
    if (forward.lengthSq() < 0.0001) {
      forward.set(0, 0, 1);
    }
    const speed = player.velocity?.length?.() ?? 0;
    const speedDenom = Math.max(1, player.maxSpeed * Math.max(1, player.boostMultiplier));
    const speed01 = Math.min(1, speed / speedDenom);
    const lookAhead = this.config.camera.lookAhead * (options.lookAheadAmount ?? 1) * (0.2 + speed01 * 0.8);
    const desiredBoostZoom = player.boostTimer > 0 ? this.config.camera.boostZoomOut : 0;
    state.zoomBias += (desiredBoostZoom - state.zoomBias) * smoothingAlpha(8, dt);

    TEMP_OFFSET
      .copy(forward)
      .multiplyScalar(-(this.config.camera.baseDistance + state.zoomBias))
      .setY(this.config.camera.baseHeight + state.zoomBias * 0.35);
    TEMP_TARGET_POS.copy(player.root.position).add(TEMP_OFFSET).addScaledVector(forward, lookAhead);

    TEMP_LOOK_TARGET.copy(player.root.position).addScaledVector(forward, 20 + speed01 * 10);
    TEMP_LOOK_TARGET.y += 11 + speed01 * 2;
    this.applyCameraFollow(playerId, TEMP_TARGET_POS, TEMP_LOOK_TARGET, dt, options);
  }

  updateCameraForCoop(playerA, playerB, dt, options, spread01 = 0) {
    if (!playerA || !playerB) return;
    const state = this.cameraState.P1;
    const worldSize = this.config.world.size;

    TEMP_PAIR_DELTA.set(
      shortestWrappedDelta(playerA.root.position.x, playerB.root.position.x, worldSize),
      0,
      shortestWrappedDelta(playerA.root.position.z, playerB.root.position.z, worldSize)
    );
    TEMP_PAIR_MID.copy(playerA.root.position).addScaledVector(TEMP_PAIR_DELTA, 0.5);
    TEMP_PAIR_MID.x = wrapAxis(TEMP_PAIR_MID.x, worldSize);
    TEMP_PAIR_MID.z = wrapAxis(TEMP_PAIR_MID.z, worldSize);
    TEMP_PAIR_MID.y = (playerA.root.position.y + playerB.root.position.y) * 0.5;

    const forwardA = playerA.getForward();
    const forwardB = playerB.getForward();
    TEMP_PAIR_FORWARD.copy(forwardA).add(forwardB);
    if (TEMP_PAIR_FORWARD.lengthSq() < 0.0001) {
      TEMP_PAIR_FORWARD.copy(TEMP_PAIR_DELTA);
    }
    if (TEMP_PAIR_FORWARD.lengthSq() < 0.0001) {
      TEMP_PAIR_FORWARD.set(0, 0, 1);
    } else {
      TEMP_PAIR_FORWARD.setY(0).normalize();
    }

    const avgSpeed = ((playerA.velocity?.length?.() ?? 0) + (playerB.velocity?.length?.() ?? 0)) * 0.5;
    const maxSpeed = Math.max(playerA.maxSpeed || 1, playerB.maxSpeed || 1);
    const speed01 = THREE.MathUtils.clamp(avgSpeed / (maxSpeed * Math.max(1, playerA.boostMultiplier || 1)), 0, 1);
    const lookAhead = this.config.camera.lookAhead * (options.lookAheadAmount ?? 1) * (0.24 + speed01 * 0.6 + spread01 * 0.2);
    const extraDistance = THREE.MathUtils.lerp(18, 92, spread01);
    const extraHeight = THREE.MathUtils.lerp(8, 48, spread01);
    const desiredBoostZoom = playerA.boostTimer > 0 || playerB.boostTimer > 0 ? this.config.camera.boostZoomOut * 0.8 : 0;
    state.zoomBias += (desiredBoostZoom - state.zoomBias) * smoothingAlpha(8, dt);

    TEMP_OFFSET
      .copy(TEMP_PAIR_FORWARD)
      .multiplyScalar(-(this.config.camera.baseDistance + extraDistance + state.zoomBias))
      .setY(this.config.camera.baseHeight + extraHeight + state.zoomBias * 0.28);
    TEMP_TARGET_POS.copy(TEMP_PAIR_MID).add(TEMP_OFFSET).addScaledVector(TEMP_PAIR_FORWARD, lookAhead);

    TEMP_LOOK_TARGET.copy(TEMP_PAIR_MID).addScaledVector(TEMP_PAIR_FORWARD, 22 + speed01 * 12 + spread01 * 20);
    TEMP_LOOK_TARGET.y += 10 + spread01 * 6;
    this.applyCameraFollow("P1", TEMP_TARGET_POS, TEMP_LOOK_TARGET, dt, options);
  }

  screenToNdc(clientX, clientY, isLeftViewport = false) {
    const rect = this.canvas.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    let viewportX = localX;
    let viewportY = localY;
    let viewportW = rect.width;
    let viewportH = rect.height;

    if (this.splitScreen && this.splitMode === "vertical" && isLeftViewport) {
      viewportW = rect.width * 0.5;
      viewportX = Math.min(localX, viewportW);
    } else if (this.splitScreen && this.splitMode === "horizontal" && isLeftViewport) {
      viewportH = rect.height * 0.5;
      viewportY = Math.min(localY, viewportH);
    }

    const ndcX = (viewportX / viewportW) * 2 - 1;
    const ndcY = -(viewportY / viewportH) * 2 + 1;
    return new THREE.Vector2(ndcX, ndcY);
  }

  render(players = []) {
    const width = this.renderer.domElement.width;
    const height = this.renderer.domElement.height;

    this.renderer.setClearColor(0x79bde8, 1);
    this.renderer.clear(true, true, true);

    if (this.splitScreen && players.length > 1) {
      if (this.splitMode === "horizontal") {
        const halfH = Math.floor(height * 0.5);
        this.renderer.setViewport(0, halfH, width, height - halfH);
        this.renderer.setScissor(0, halfH, width, height - halfH);
        this.renderer.render(this.scene, this.cameras.P1);

        this.renderer.setViewport(0, 0, width, halfH);
        this.renderer.setScissor(0, 0, width, halfH);
        this.renderer.render(this.scene, this.cameras.P2);
      } else {
        const halfW = Math.floor(width * 0.5);
        this.renderer.setViewport(0, 0, halfW, height);
        this.renderer.setScissor(0, 0, halfW, height);
        this.renderer.render(this.scene, this.cameras.P1);

        this.renderer.setViewport(halfW, 0, width - halfW, height);
        this.renderer.setScissor(halfW, 0, width - halfW, height);
        this.renderer.render(this.scene, this.cameras.P2);
      }
      return;
    }

    this.renderer.setViewport(0, 0, width, height);
    this.renderer.setScissor(0, 0, width, height);
    this.renderer.render(this.scene, this.cameras.P1);
  }
}
