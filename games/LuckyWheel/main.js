const items = [
  { label: "მაისური", wheelLabel: "მაისური" },
  { label: "პერანგი", wheelLabel: "პერანგი" },
  { label: "შარვალი", wheelLabel: "შარვალი" },
  { label: "ჯინსი", wheelLabel: "ჯინსი" },
  { label: "შორტი", wheelLabel: "შორტი" },
  { label: "კაბა", wheelLabel: "კაბა" },
  { label: "ბიუსტჰალტერი", wheelLabel: "ბიუსტი" },
  { label: "წინდა", wheelLabel: "წინდა" },
  { label: "ფეხსაცმელი", wheelLabel: "ფეხსაცმ." },
  { label: "ქუდი", wheelLabel: "ქუდი" },
  { label: "შარფი", wheelLabel: "შარფი" },
  { label: "ჯაკეტი", wheelLabel: "ჯაკეტი" },
  { label: "პიჟამა", wheelLabel: "პიჟამა" },
  { label: "ჩანთა", wheelLabel: "ჩანთა" },
  { label: "საფულე", wheelLabel: "საფულე" },
  { label: "სარკე", wheelLabel: "სარკე" },
  { label: "ტუჩის ბზინვარა", wheelLabel: "ბზინვარა" },
  { label: "პომადა", wheelLabel: "პომადა" },
  { label: "სუნამოს ბოთლი", wheelLabel: "სუნამო" },
  { label: "სამაჯური", wheelLabel: "სამაჯური" },
  { label: "ბეჭედი", wheelLabel: "ბეჭედი" },
  { label: "ყელსაბამი", wheelLabel: "ყელსაბ." },
  { label: "წყლის ბოთლი", wheelLabel: "წყალი" },
  { label: "ყავა", wheelLabel: "ყავა" },
  { label: "ჩაი", wheelLabel: "ჩაი" },
  { label: "ლიმონათი", wheelLabel: "ლიმონათი" },
  { label: "წვენი", wheelLabel: "წვენი" },
  { label: "გაზიანი სასმელი", wheelLabel: "გაზიანი" },
  { label: "მილქშეიკი", wheelLabel: "შეიკი" },
  { label: "ენერგეტიკული", wheelLabel: "ენერგეტ." },
  { label: "ვაშლი", wheelLabel: "ვაშლი" },
  { label: "ბანანი", wheelLabel: "ბანანი" },
  { label: "ფორთოხალი", wheelLabel: "ფორთოხ." },
  { label: "დონატი", wheelLabel: "დონატი" },
  { label: "ნამცხვარი", wheelLabel: "ნამცხვ." },
  { label: "პიცის ნაჭერი", wheelLabel: "პიცა" },
  { label: "ფოთოლი", wheelLabel: "ფოთოლი" },
  { label: "ყვავილი", wheelLabel: "ყვავილი" },
  { label: "ქოლგა", wheelLabel: "ქოლგა" },
  { label: "სათვალე", wheelLabel: "სათვალე" },
  { label: "ყურსასმენები", wheelLabel: "ყურსასმ." },
  { label: "წიგნი", wheelLabel: "წიგნი" },
  { label: "რვეული", wheelLabel: "რვეული" },
  { label: "კალამი", wheelLabel: "კალამი" },
  { label: "კოვზი", wheelLabel: "კოვზი" },
  { label: "ჩანგალი", wheelLabel: "ჩანგალი" },
  { label: "ბალიში", wheelLabel: "ბალიში" },
  { label: "ბურთი", wheelLabel: "ბურთი" },
  { label: "ტოსტერი", wheelLabel: "ტოსტერი" },
  { label: "სათამაშო დათვი", wheelLabel: "დათვი" }
];

const wheelColors = [
  "#ffcf59",
  "#ff7f6e",
  "#6be4ff",
  "#92f28d",
  "#ffb35b",
  "#ff87d7",
  "#8d92ff",
  "#70f2f6",
  "#ffd772",
  "#ff6688"
];

const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");

const elements = {
  setupScreen: document.getElementById("setupScreen"),
  gameScreen: document.getElementById("gameScreen"),
  playerForm: document.getElementById("playerForm"),
  playerNameInput: document.getElementById("playerNameInput"),
  addPlayerButton: document.getElementById("addPlayerButton"),
  startGameButton: document.getElementById("startGameButton"),
  clearPlayersButton: document.getElementById("clearPlayersButton"),
  backToSetupButton: document.getElementById("backToSetupButton"),
  playersPreview: document.getElementById("playersPreview"),
  playersList: document.getElementById("playersList"),
  setupMessage: document.getElementById("setupMessage"),
  setupCount: document.getElementById("setupCount"),
  resultHeadline: document.getElementById("resultHeadline"),
  resultReveal: document.getElementById("resultReveal"),
  resultRevealText: document.getElementById("resultRevealText"),
  spinButton: document.getElementById("spinButton")
};

const state = {
  players: [],
  activePlayerIndex: 0,
  lastResult: null,
  rotation: 0,
  spinning: false,
  animationFrameId: 0,
  revealTimeoutId: 0
};

function sanitizeName(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 22);
}

function setSetupMessage(message) {
  elements.setupMessage.textContent = message || "";
}

function switchScreen(target) {
  const showSetup = target === "setup";
  elements.setupScreen.classList.toggle("screen-active", showSetup);
  elements.gameScreen.classList.toggle("screen-active", !showSetup);
}

function renderSetupPlayers() {
  elements.setupCount.textContent = `${state.players.length} მოთამაშე`;
  elements.startGameButton.disabled = state.players.length === 0;

  if (!state.players.length) {
    elements.playersPreview.className = "players-preview empty-state";
    elements.playersPreview.textContent = "ჯერ მოთამაშეები არ არიან დამატებული.";
    return;
  }

  elements.playersPreview.className = "players-preview";
  elements.playersPreview.innerHTML = state.players.map((player, index) => `
    <article class="player-chip">
      <strong>${index + 1}. ${escapeHtml(player)}</strong>
      <button class="remove-btn" type="button" data-remove-index="${index}" aria-label="${escapeHtml(player)}-ს წაშლა">×</button>
    </article>
  `).join("");

  elements.playersPreview.querySelectorAll("[data-remove-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeIndex);
      if (Number.isInteger(index)) {
        state.players.splice(index, 1);
        renderSetupPlayers();
      }
    });
  });
}

function renderPlayersList() {
  elements.playersList.innerHTML = state.players.map((player, index) => `
    <article class="player-card">
      <span class="player-card-index">${index + 1}</span>
      <strong>${escapeHtml(player)}</strong>
    </article>
  `).join("");
}

function hideResultReveal() {
  if (state.revealTimeoutId) {
    window.clearTimeout(state.revealTimeoutId);
    state.revealTimeoutId = 0;
  }
  elements.resultReveal.classList.remove("is-visible");
  elements.resultReveal.setAttribute("aria-hidden", "true");
}

function showResultReveal(label) {
  hideResultReveal();
  elements.resultRevealText.textContent = label;
  elements.resultReveal.classList.add("is-visible");
  elements.resultReveal.setAttribute("aria-hidden", "false");
  state.revealTimeoutId = window.setTimeout(() => {
    elements.resultReveal.classList.remove("is-visible");
    elements.resultReveal.setAttribute("aria-hidden", "true");
    state.revealTimeoutId = 0;
  }, 2600);
}

function renderResult() {
  elements.spinButton.disabled = state.spinning || state.players.length === 0;
  elements.spinButton.textContent = state.spinning ? "ტრიალებს..." : "დაატრიალე";

  if (!state.lastResult) {
    elements.resultHeadline.textContent = state.players.length ? "დაატრიალე ბორბალი" : "დაამატე მოთამაშეები";
    return;
  }

  elements.resultHeadline.textContent = state.lastResult.itemLabel;
}

function drawWheel() {
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 26;
  const segmentAngle = (Math.PI * 2) / items.length;

  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(state.rotation);

  for (let index = 0; index < items.length; index += 1) {
    const start = -Math.PI / 2 + index * segmentAngle;
    const end = start + segmentAngle;
    const color = wheelColors[index % wheelColors.length];

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(15, 19, 32, 0.38)";
    ctx.stroke();

    ctx.save();
    ctx.rotate(start + segmentAngle / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#151a2a";
    ctx.font = "700 13px 'Segoe UI', sans-serif";
    ctx.fillText(items[index].wheelLabel, radius - 20, 0);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "#fff7ea";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "#1b1d33";
  ctx.fill();

  ctx.fillStyle = "#fff7ea";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 32px 'Segoe UI', sans-serif";
  ctx.fillText("ბორბალი", 0, 2);
  ctx.restore();
}

function easeOutCubic(progress) {
  return 1 - Math.pow(1 - progress, 3);
}

function normalizeAngle(angle) {
  const full = Math.PI * 2;
  return ((angle % full) + full) % full;
}

function getSegmentAngle() {
  return (Math.PI * 2) / items.length;
}

function getRotationForItemIndex(itemIndex) {
  const segmentAngle = getSegmentAngle();
  return normalizeAngle(-(itemIndex * segmentAngle + segmentAngle / 2));
}

function getItemIndexAtPointer(rotation = state.rotation) {
  const segmentAngle = getSegmentAngle();
  const pointerAngle = normalizeAngle(-rotation);
  return Math.floor((pointerAngle + 0.000001) / segmentAngle) % items.length;
}

function finishSpin(playerIndex, itemIndex) {
  state.spinning = false;
  state.lastResult = {
    playerIndex,
    playerName: state.players[playerIndex],
    itemIndex,
    itemLabel: items[itemIndex].label
  };
  state.activePlayerIndex = (playerIndex + 1) % state.players.length;
  renderPlayersList();
  renderResult();
  showResultReveal(state.lastResult.itemLabel);
  drawWheel();
}

function spinWheel() {
  if (state.spinning || !state.players.length) {
    return;
  }

  cancelAnimationFrame(state.animationFrameId);
  hideResultReveal();

  const playerIndex = state.activePlayerIndex;
  const itemIndex = Math.floor(Math.random() * items.length);
  const full = Math.PI * 2;
  const targetNormalized = getRotationForItemIndex(itemIndex);
  const currentNormalized = normalizeAngle(state.rotation);
  const extraLoops = full * (7 + Math.random() * 2.5);
  const delta = extraLoops + normalizeAngle(targetNormalized - currentNormalized);
  const startRotation = state.rotation;
  const endRotation = state.rotation + delta;
  const duration = 4600 + Math.random() * 900;
  const startTime = performance.now();

  state.spinning = true;
  renderResult();

  function animate(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = easeOutCubic(progress);
    state.rotation = startRotation + delta * eased;
    drawWheel();

    if (progress < 1) {
      state.animationFrameId = requestAnimationFrame(animate);
      return;
    }

    state.rotation = endRotation;
    const stoppedIndex = getItemIndexAtPointer(state.rotation);
    state.rotation = getRotationForItemIndex(stoppedIndex);
    finishSpin(playerIndex, stoppedIndex);
  }

  state.animationFrameId = requestAnimationFrame(animate);
}

function startGame() {
  if (!state.players.length) {
    setSetupMessage("ჯერ მინიმუმ ერთი მოთამაშე დაამატე.");
    return;
  }

  state.activePlayerIndex = 0;
  state.lastResult = null;
  state.rotation = 0;
  hideResultReveal();
  switchScreen("game");
  renderPlayersList();
  renderResult();
  drawWheel();
}

function addPlayerFromInput() {
  const name = sanitizeName(elements.playerNameInput.value);
  if (!name) {
    setSetupMessage("ჯერ მოთამაშის სახელი ჩაწერე.");
    return;
  }

  if (state.players.includes(name)) {
    setSetupMessage("ეს სახელი უკვე დამატებულია.");
    return;
  }

  state.players.push(name);
  elements.playerNameInput.value = "";
  setSetupMessage(`${name} დაემატა სიას.`);
  renderSetupPlayers();
  elements.playerNameInput.focus();
}

function clearPlayers() {
  state.players = [];
  state.activePlayerIndex = 0;
  state.lastResult = null;
  hideResultReveal();
  setSetupMessage("სია გასუფთავდა.");
  renderSetupPlayers();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

elements.playerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addPlayerFromInput();
});

elements.clearPlayersButton.addEventListener("click", clearPlayers);
elements.startGameButton.addEventListener("click", startGame);
elements.backToSetupButton.addEventListener("click", () => {
  hideResultReveal();
  switchScreen("setup");
  renderSetupPlayers();
});
elements.spinButton.addEventListener("click", spinWheel);

window.addEventListener("resize", drawWheel);

renderSetupPlayers();
renderResult();
drawWheel();
