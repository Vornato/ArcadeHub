import {
  emitAck,
  escapeHtml,
  formatTimer,
  loadJson,
  playCue,
  qs,
  renderCards,
  renderMedia,
  renderScoreboard,
  saveJson,
  setBackgroundVideo,
  updateQuery,
  vibrate,
} from "/static/common.js";

const PLAYER_STORAGE_KEY = "levans_box_player_session_v2";

const els = {
  backgroundVideo: document.getElementById("backgroundVideo"),
  playerTopCover: document.getElementById("playerTopCover"),
  timerChip: document.getElementById("timerChip"),
  joinPanel: document.getElementById("joinPanel"),
  controllerPanel: document.getElementById("controllerPanel"),
  joinForm: document.getElementById("joinForm"),
  roomCodeInput: document.getElementById("roomCodeInput"),
  playerNameInput: document.getElementById("playerNameInput"),
  joinMessage: document.getElementById("joinMessage"),
  controllerPhase: document.getElementById("controllerPhase"),
  controllerRoomMeta: document.getElementById("controllerRoomMeta"),
  playerIdentity: document.getElementById("playerIdentity"),
  myScoreBadge: document.getElementById("myScoreBadge"),
  controllerBody: document.getElementById("controllerBody"),
  leaveButton: document.getElementById("leaveButton"),
};

const socket = window.io();

const state = {
  bootstrap: null,
  session: loadJson(PLAYER_STORAGE_KEY),
  room: null,
  phaseId: "",
  lowTimerAlerted: false,
  previousScoreMap: {},
};

function getScoreMap(players = []) {
  return Object.fromEntries(players.map((player) => [player.id, player.score]));
}

function triggerMotion(element, className = "panel-bounce") {
  if (!element) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function getActiveGameMeta() {
  const bootstrapGames = state.bootstrap?.games || [];
  if (state.room?.selectedGameId) {
    return bootstrapGames.find((game) => game.id === state.room.selectedGameId) || {
      id: state.room.selectedGameId,
      title: state.room.gameTitle,
      coverPath: state.room.gameCoverPath,
      videoPath: state.room.gameVideoPath,
    };
  }
  return bootstrapGames[0] || null;
}

function isCompactViewport() {
  return window.matchMedia("(max-width: 760px)").matches;
}

function renderTopCover() {
  const game = getActiveGameMeta();
  if (!game?.coverPath) {
    els.playerTopCover.innerHTML = "";
    return;
  }

  const eyebrow = state.room
    ? `${state.room.roomCode} | ${state.room.me?.role === "audience" ? "აუდიტორია" : "მოთამაშე"}`
    : "მობილური პულტი";
  const title = state.room?.gameTitle || game.title || "ლევანს ბოქსი";
  const description = state.room
    ? state.room.panel?.subtitle || state.room.panel?.note || game.description || "აქედან გააგზავნი პასუხებს, ნახატებს და ხმებს."
    : "შედი ოთახში, ჩაწერე მეტსახელი და ითამაშე პირდაპირ ტელეფონიდან.";

  els.playerTopCover.innerHTML = `
    <div class="player-top-cover-frame">
      <img class="player-top-cover-image" src="${escapeHtml(game.coverPath)}" alt="${escapeHtml(title)}">
      <div class="player-top-cover-copy">
        <div class="eyebrow">${escapeHtml(eyebrow)}</div>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(description)}</p>
      </div>
    </div>
  `;
}

function updateVideo() {
  const game = getActiveGameMeta();
  if (isCompactViewport()) {
    setBackgroundVideo(els.backgroundVideo, {
      src: "",
      poster: game?.coverPath || "",
    });
    return;
  }

  setBackgroundVideo(els.backgroundVideo, {
    src: state.room?.gameVideoPath || game?.videoPath || "/videos/game bg 1.mp4",
    poster: state.room?.gameCoverPath || game?.coverPath || "",
  });
}

function showJoin(message = "ჰოსტის კოდი და შენი მეტსახელი ჩაწერე.") {
  document.body.classList.remove("controller-live");
  els.joinPanel.classList.remove("hidden");
  els.controllerPanel.classList.add("hidden");
  els.joinMessage.textContent = message;
  renderTopCover();
  updateVideo();
}

function showController() {
  document.body.classList.add("controller-live");
  els.joinPanel.classList.add("hidden");
  els.controllerPanel.classList.remove("hidden");
}

function saveSession(session) {
  state.session = session;
  saveJson(PLAYER_STORAGE_KEY, session);
  updateQuery({ room: session?.roomCode || qs("room") || null });
}

function renderTimer() {
  if (!state.room?.timer) {
    els.timerChip.textContent = "00:00";
    els.timerChip.classList.remove("danger");
    return;
  }

  const text = formatTimer(state.room.timer);
  els.timerChip.textContent = text;

  const remainingMs = state.room.timer.paused
    ? state.room.timer.remainingMs
    : Math.max(0, state.room.timer.endsAt - Date.now());
  const isLow = remainingMs <= 5000;
  els.timerChip.classList.toggle("danger", isLow);

  if (isLow && !state.lowTimerAlerted) {
    state.lowTimerAlerted = true;
    playCue("alert");
    vibrate([24, 30, 24]);
  }

  if (remainingMs > 5000) {
    state.lowTimerAlerted = false;
  }
}

function renderVoteOptions(options = [], selectedId = "") {
  return `
    <div class="vote-options">
      ${options.map((option) => `
        <button type="button" class="vote-option ${selectedId === option.id ? "active" : ""}" data-option-id="${escapeHtml(option.id)}">
          <span>${escapeHtml(option.label)}</span>
          ${option.meta ? `<small class="option-meta">${escapeHtml(option.meta)}</small>` : ""}
        </button>
      `).join("")}
    </div>
  `;
}

function renderPanel(panel) {
  const mediaHtml = renderMedia(panel.media);
  const cardsHtml = renderCards(panel.cards || []);
  const leaderboardHtml = renderScoreboard(state.room?.players || [], { previousScores: state.previousScoreMap, compact: true });

  if (panel.kind === "text") {
    return `
      ${mediaHtml}
      <article class="controller-card">
        <h3>${escapeHtml(panel.title)}</h3>
        ${panel.subtitle ? `<p class="muted-text">${escapeHtml(panel.subtitle)}</p>` : ""}
        ${panel.note ? `<p class="muted-text">${escapeHtml(panel.note)}</p>` : ""}
        <form id="textActionForm" class="form-stack">
          <label>
            <span>${escapeHtml(panel.fieldLabel || "შენი პასუხი")}</span>
            <textarea id="textActionInput" rows="5" maxlength="${escapeHtml(String(panel.maxLength || 180))}" placeholder="${escapeHtml(panel.placeholder || "")}">${escapeHtml(panel.value || "")}</textarea>
          </label>
          <button class="primary-btn full-width" type="submit">${escapeHtml(panel.buttonLabel || "გაგზავნა")}</button>
        </form>
      </article>
      <article class="controller-card">
        <h3>ქულები</h3>
        ${leaderboardHtml}
      </article>
      ${cardsHtml}
    `;
  }

  if (panel.kind === "vote") {
    return `
      ${mediaHtml}
      <article class="controller-card">
        <h3>${escapeHtml(panel.title)}</h3>
        ${panel.subtitle ? `<p class="muted-text">${escapeHtml(panel.subtitle)}</p>` : ""}
        ${panel.note ? `<p class="muted-text">${escapeHtml(panel.note)}</p>` : ""}
        <form id="voteForm" class="form-stack">
          ${renderVoteOptions(panel.options, panel.value || "")}
          <button class="primary-btn full-width" type="submit">ხმის მიცემა</button>
        </form>
      </article>
      ${cardsHtml}
    `;
  }

  if (panel.kind === "category-vote") {
    return `
      ${mediaHtml}
      <article class="controller-card">
        <h3>${escapeHtml(panel.title)}</h3>
        ${panel.subtitle ? `<p class="muted-text">${escapeHtml(panel.subtitle)}</p>` : ""}
        ${panel.note ? `<p class="muted-text">${escapeHtml(panel.note)}</p>` : ""}
        <form id="categoryVoteForm" class="form-stack">
          <div class="vote-categories">
            ${(panel.categories || []).map((category) => `
              <section class="vote-category" data-category-id="${escapeHtml(category.id)}">
                <h4>${escapeHtml(category.label)}</h4>
                ${renderVoteOptions(category.options, panel.value?.[category.id] || "")}
              </section>
            `).join("")}
          </div>
          <button class="primary-btn full-width" type="submit">ხმების დადასტურება</button>
        </form>
      </article>
      ${cardsHtml}
    `;
  }

  if (panel.kind === "draw") {
    return `
      ${mediaHtml}
      <article class="controller-card">
        <h3>${escapeHtml(panel.title)}</h3>
        ${panel.subtitle ? `<p class="muted-text">${escapeHtml(panel.subtitle)}</p>` : ""}
        ${panel.note ? `<p class="muted-text">${escapeHtml(panel.note)}</p>` : ""}
        <form id="drawForm" class="draw-shell">
          <canvas id="drawCanvas" class="draw-canvas" width="640" height="420"></canvas>
          <div class="draw-tools">
            <button class="ghost-btn full-width" id="undoDrawButton" type="button">უკან</button>
            <button class="ghost-btn full-width" id="clearDrawButton" type="button">გასუფთავება</button>
          </div>
          <button class="primary-btn full-width" type="submit">${escapeHtml(panel.buttonLabel || "გაგზავნა")}</button>
        </form>
      </article>
    `;
  }

  return `
    ${mediaHtml}
    <article class="controller-card">
      <h3>${escapeHtml(panel.title || "მოლოდინი")}</h3>
      ${panel.subtitle ? `<p class="muted-text">${escapeHtml(panel.subtitle)}</p>` : ""}
      ${panel.note ? `<p class="muted-text">${escapeHtml(panel.note)}</p>` : ""}
    </article>
    ${cardsHtml}
    <article class="controller-card">
      <h3>ქულები</h3>
      ${leaderboardHtml}
    </article>
  `;
}

function render() {
  updateVideo();
  renderTopCover();
  renderTimer();

  if (!state.room) {
    showJoin();
    return;
  }

  showController();
  els.controllerPhase.textContent = state.room.panel.title || state.room.gameTitle || "ლევანს ბოქსი";
  els.controllerRoomMeta.textContent = `ოთახი ${state.room.roomCode} | ${state.room.gameTitle}`;
  els.playerIdentity.textContent = `${state.room.me.avatar || ""} ${state.room.me.name} | ${state.room.me.role === "audience" ? "აუდიტორია" : "მოთამაშე"}`;
  els.myScoreBadge.textContent = `${state.room.me.score} ქულა`;
  els.controllerBody.innerHTML = renderPanel(state.room.panel);
  bindPanelEvents();
}

async function sendPlayerAction(type, extra = {}) {
  if (!state.session) return;
  await emitAck(socket, "player:action", {
    roomCode: state.session.roomCode,
    sessionId: state.session.sessionId,
    type,
    ...extra,
  });
  playCue("soft");
  vibrate(18);
}

function bindVoteButtons(scope = document) {
  scope.querySelectorAll(".vote-option").forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.closest(".vote-options");
      group.querySelectorAll(".vote-option").forEach((entry) => entry.classList.remove("active"));
      button.classList.add("active");
    });
  });
}

function setupDrawPanel(panel) {
  const canvas = document.getElementById("drawCanvas");
  const clearButton = document.getElementById("clearDrawButton");
  const undoButton = document.getElementById("undoDrawButton");
  const form = document.getElementById("drawForm");
  if (!canvas || !form) return;

  const context = canvas.getContext("2d");
  const history = [];
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = 7;
  context.strokeStyle = "#fff7e7";
  context.fillStyle = "#13243b";
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (panel.drawingDataUrl) {
    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = panel.drawingDataUrl;
  }

  let drawing = false;

  const saveHistory = () => {
    history.push(canvas.toDataURL("image/png"));
    if (history.length > 16) history.shift();
  };

  const getPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    return {
      x: ((source.clientX - rect.left) / rect.width) * canvas.width,
      y: ((source.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (event) => {
    drawing = true;
    const point = getPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    event.preventDefault();
  };

  const move = (event) => {
    if (!drawing) return;
    const point = getPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    event.preventDefault();
  };

  const end = () => {
    if (!drawing) return;
    drawing = false;
    saveHistory();
  };

  ["mousedown", "touchstart"].forEach((name) => canvas.addEventListener(name, start, { passive: false }));
  ["mousemove", "touchmove"].forEach((name) => canvas.addEventListener(name, move, { passive: false }));
  ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach((name) => canvas.addEventListener(name, end, { passive: false }));

  clearButton?.addEventListener("click", () => {
    context.fillStyle = "#13243b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    saveHistory();
  });

  undoButton?.addEventListener("click", () => {
    history.pop();
    const previous = history[history.length - 1];
    context.fillStyle = "#13243b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (!previous) return;
    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = previous;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendPlayerAction(panel.actionId, {
      drawingDataUrl: canvas.toDataURL("image/png"),
    });
  });
}

function bindPanelEvents() {
  const panel = state.room?.panel;
  if (!panel) return;

  if (panel.kind === "text") {
    document.getElementById("textActionForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = document.getElementById("textActionInput");
      await sendPlayerAction(panel.actionId, { value: input.value });
    });
    return;
  }

  if (panel.kind === "vote") {
    bindVoteButtons();
    document.getElementById("voteForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const selected = document.querySelector(".vote-option.active");
      if (!selected) return;
      await sendPlayerAction(panel.actionId, { choiceId: selected.dataset.optionId });
    });
    return;
  }

  if (panel.kind === "category-vote") {
    bindVoteButtons();
    document.getElementById("categoryVoteForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const votes = {};
      document.querySelectorAll("[data-category-id]").forEach((section) => {
        const active = section.querySelector(".vote-option.active");
        if (active) votes[section.dataset.categoryId] = active.dataset.optionId;
      });
      await sendPlayerAction(panel.actionId, { votes });
    });
    return;
  }

  if (panel.kind === "draw") {
    setupDrawPanel(panel);
  }
}

async function joinRoom(event) {
  event.preventDefault();
  const roomCode = els.roomCodeInput.value.trim().toUpperCase();
  const name = els.playerNameInput.value.trim();
  if (!roomCode || !name) {
    showJoin("ჯერ კოდიც შეიყვანე და მეტსახელიც.");
    return;
  }

  try {
    const response = await emitAck(socket, "player:join", {
      roomCode,
      name,
      sessionId: state.session?.sessionId || null,
    });

    saveSession({
      roomCode: response.roomCode,
      sessionId: response.sessionId,
      participantId: response.participantId,
      role: response.role,
      name: response.name,
    });

    showJoin("შენახულია. ოთახში შედიხარ...");
  } catch (error) {
    showJoin(error.message);
  }
}

async function resumeSession() {
  if (!state.session?.roomCode || !state.session?.sessionId) return false;

  try {
    await emitAck(socket, "player:resume", state.session);
    return true;
  } catch {
    saveSession(null);
    return false;
  }
}

socket.on("bootstrap", (payload) => {
  state.bootstrap = payload;
  renderTopCover();
  updateVideo();
});

socket.on("controller:state", (payload) => {
  const phaseChanged = state.phaseId && state.phaseId !== payload.phaseId;
  const previousRoom = state.room;
  state.previousScoreMap = getScoreMap(previousRoom?.players || []);
  state.phaseId = payload.phaseId;
  state.room = payload;
  render();
  const previousMyScore = previousRoom?.me?.score || 0;
  if ((payload.me?.score || 0) > previousMyScore) {
    triggerMotion(els.myScoreBadge, "scoreboard-pop");
    playCue("score");
  }
  if (phaseChanged) {
    triggerMotion(els.controllerBody);
    playCue(payload.phaseId.includes("vote") ? "vote" : "soft");
    vibrate(payload.phaseId.includes("vote") ? [20, 24, 20] : 14);
  }
});

socket.on("session:kicked", (payload) => {
  saveSession(null);
  state.room = null;
  showJoin(payload.error || "ოთახიდან გაგთიშეს.");
});

socket.on("disconnect", () => {
  if (state.session) {
    showJoin("კავშირი დროებით გაწყდა. ავტომატური დაბრუნება მიმდინარეობს...");
  }
});

socket.on("connect", async () => {
  const resumed = await resumeSession();
  if (!resumed && qs("room")) {
    els.roomCodeInput.value = qs("room").toUpperCase();
  }
  render();
});

els.joinForm.addEventListener("submit", joinRoom);
els.leaveButton.addEventListener("click", () => {
  saveSession(null);
  state.room = null;
  showJoin("ოთახიდან გამოხვედი.");
});

els.roomCodeInput.value = (qs("room") || state.session?.roomCode || "").toUpperCase();
els.playerNameInput.value = state.session?.name || "";
setInterval(renderTimer, 250);
window.addEventListener("resize", () => {
  renderTopCover();
  updateVideo();
});
showJoin();
