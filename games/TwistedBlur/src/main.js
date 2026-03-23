import { Game } from "./game.js";

const canvas = document.getElementById("gameCanvas");
const game = new Game(canvas);

let previous = performance.now();

function resize() {
  game.resize(window.innerWidth, window.innerHeight);
}

function onUserGesture() {
  game.handleUserGesture();
}

window.addEventListener("resize", resize);
window.addEventListener("pointerdown", onUserGesture, { passive: true });
window.addEventListener("keydown", onUserGesture);
window.addEventListener("gamepadconnected", onUserGesture);

resize();

function frame(now) {
  const dt = (now - previous) / 1000;
  previous = now;
  game.update(dt);
  game.render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
