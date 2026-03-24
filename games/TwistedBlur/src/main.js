import { Game } from "./game.js";

const canvas = document.getElementById("gameCanvas");
const game = new Game(canvas);
const searchParams = new URLSearchParams(window.location.search);
const hudTestMode = searchParams.get("hudtest") === "1";

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

function seedHudTestState() {
  game.menu.toggleKeyboardPlayer(1);
  game.menu.toggleKeyboardPlayer(2);
  game.menu.modeId = "combatRace";
  game.menu.ensureLevelValid();
  const availableLevels = game.menu.getAvailableLevels();
  if (availableLevels.length) {
    game.menu.selectedLevelId = availableLevels[0].id;
  }
  game.startMatch();
  game.announcer.reset();
  game.match.elapsed = 87.2;
  game.participants.forEach((participant, index) => {
    const vehicle = participant.vehicle;
    vehicle.health = vehicle.maxHealth * (0.42 + index * 0.12);
    vehicle.boost = vehicle.maxBoost * (index === 0 ? 1.12 : 0.58 + index * 0.08);
    vehicle.kills = index + 1;
    vehicle.deaths = Math.max(0, index - 1);
    vehicle.score = 1200 - (index * 180);
    vehicle.lap = Math.min(index, Math.max(0, game.match.mode.laps - 1));
    vehicle.place = index + 1;
    vehicle.assignSpecialWeapon(["shockwave", "rail", "shield"][index] ?? "emp");
    vehicle.queueHudMessage(index === 0 ? "DRIFT BONUS" : "LOCK WARNING", index === 0 ? "+480 combo" : "Stay on line", participant.color, 6);
  });
  game.updatePlacings();
  game.render();
}

window.render_game_to_text = () => JSON.stringify({
  phase: game.phase,
  modeId: game.modeId,
  humans: game.humanParticipants.map((participant) => ({
    label: participant.label,
    place: participant.vehicle.place,
    lap: participant.vehicle.lap,
    health: Math.round(participant.vehicle.health),
    boost: Math.round(participant.vehicle.boost),
    specialWeaponId: participant.vehicle.specialWeaponId,
    specialAmmo: participant.vehicle.specialAmmo,
  })),
});

window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let index = 0; index < steps; index += 1) {
    game.update(1 / 60);
  }
  game.render();
  return Promise.resolve();
};

if (hudTestMode) {
  seedHudTestState();
  const statusBar = document.getElementById("statusBar");
  if (statusBar) {
    statusBar.style.display = "none";
  }
  document.body.dataset.phase = "playing";
}

function frame(now) {
  const dt = (now - previous) / 1000;
  previous = now;
  game.update(dt);
  game.render();
  document.body.dataset.phase = game.phase;
  requestAnimationFrame(frame);
}

document.body.dataset.phase = game.phase;
requestAnimationFrame(frame);
