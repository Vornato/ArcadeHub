import * as THREE from "three";

export class MouseKeyboardInput {
  constructor(canvas) {
    this.canvas = canvas;
    this.keysDown = new Set();
    this.leftMouseDown = false;
    this.pendingClick = null;
    this.livePointer = null;
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.oneShot = {
      boost: false,
      toggleInventory: false,
      useItem: false,
      ascend: false,
      pause: false,
      ping: false,
      devPanel: false,
      cancelTarget: false
    };
    this.pendingSlot = null;

    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    window.addEventListener("keyup", (event) => this.onKeyUp(event));
    this.canvas.addEventListener("mousedown", (event) => this.onMouseDown(event));
    this.canvas.addEventListener("mousemove", (event) => this.onMouseMove(event));
    this.canvas.addEventListener("mouseup", (event) => this.onMouseUp(event));
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (key === "tab") {
      event.preventDefault();
    }
    this.keysDown.add(key);

    if (key === " ") {
      this.oneShot.boost = true;
    } else if (key === "i") {
      this.oneShot.toggleInventory = true;
    } else if (key === "x") {
      this.oneShot.useItem = true;
    } else if (key === "o") {
      this.oneShot.ascend = true;
    } else if (key === "q") {
      this.oneShot.ping = true;
    } else if (key === "f1") {
      event.preventDefault();
      this.oneShot.devPanel = true;
    } else if (key === "escape" || key === "p") {
      this.oneShot.pause = true;
    } else if (/^[1-5]$/.test(key)) {
      this.pendingSlot = Number(key) - 1;
    }
  }

  onKeyUp(event) {
    if (event.key.toLowerCase() === "tab") {
      event.preventDefault();
    }
    this.keysDown.delete(event.key.toLowerCase());
  }

  onMouseDown(event) {
    if (event.button === 0) {
      this.leftMouseDown = true;
      this.pendingClick = {
        x: event.clientX,
        y: event.clientY
      };
    } else if (event.button === 2) {
      this.oneShot.cancelTarget = true;
    }
  }

  onMouseMove(event) {
    if (this.leftMouseDown) {
      this.livePointer = { x: event.clientX, y: event.clientY };
    }
  }

  onMouseUp(event) {
    if (event.button === 0) {
      this.leftMouseDown = false;
      this.livePointer = null;
    }
  }

  raycastGround(engine, camera, pointer) {
    const ndc = engine.screenToNdc(pointer.x, pointer.y, true);
    this.raycaster.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlane, hit)) {
      return hit;
    }
    return null;
  }

  consumeIntent(engine, camera) {
    const intent = {
      moveTarget: null,
      fire: this.keysDown.has("f"),
      boost: this.takeOneShot("boost"),
      toggleInventory: this.takeOneShot("toggleInventory"),
      useItem: this.takeOneShot("useItem"),
      ascend: this.takeOneShot("ascend"),
      pause: this.takeOneShot("pause"),
      ping: this.takeOneShot("ping"),
      toggleDevPanel: this.takeOneShot("devPanel"),
      cancelTarget: this.takeOneShot("cancelTarget"),
      showControls: this.keysDown.has("tab"),
      selectSlot: this.takeSlot(),
      interact: this.keysDown.has("e")
    };

    if (this.pendingClick) {
      intent.moveTarget = this.raycastGround(engine, camera, this.pendingClick);
      this.pendingClick = null;
    } else if (this.livePointer) {
      intent.moveTarget = this.raycastGround(engine, camera, this.livePointer);
    }

    return intent;
  }

  takeOneShot(field) {
    const value = this.oneShot[field];
    this.oneShot[field] = false;
    return value;
  }

  takeSlot() {
    const slot = this.pendingSlot;
    this.pendingSlot = null;
    return slot;
  }
}
