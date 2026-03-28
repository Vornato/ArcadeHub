import {
  emitAck,
  escapeHtml,
  formatTimer,
  loadJson,
  playCue,
  renderCards,
  renderMedia,
  renderScoreboard,
  saveJson,
  setBackgroundVideo,
} from "/static/common.js";

const HOST_STORAGE_KEY = "levans_box_host_session_v2";
const PREF_STORAGE_KEY = "levans_box_host_preferences_v2";
const URL_GAME_ID = new URLSearchParams(window.location.search).get("game") || "";

const els = {
  backgroundVideo: document.getElementById("backgroundVideo"),
  createRoomButton: document.getElementById("createRoomButton"),
  randomRoomButton: document.getElementById("randomRoomButton"),
  freshRoomButton: document.getElementById("freshRoomButton"),
  packList: document.getElementById("packList"),
  menuMeta: document.getElementById("menuMeta"),
  roundsSelect: document.getElementById("roundsSelect"),
  familyFriendlyInput: document.getElementById("familyFriendlyInput"),
  moderationInput: document.getElementById("moderationInput"),
  audienceInput: document.getElementById("audienceInput"),
  funnyVoteInput: document.getElementById("funnyVoteInput"),
  phaseTitle: document.getElementById("phaseTitle"),
  phaseSubtitle: document.getElementById("phaseSubtitle"),
  timerChip: document.getElementById("timerChip"),
  stagePanel: document.getElementById("stagePanel"),
  stageBody: document.getElementById("stageBody"),
  tvHud: document.getElementById("tvHud"),
  tvPlayersHud: document.getElementById("tvPlayersHud"),
  tvJoinHud: document.getElementById("tvJoinHud"),
  tvControlsHud: document.getElementById("tvControlsHud"),
  scoreboardBody: document.getElementById("scoreboardBody"),
  roomMeta: document.getElementById("roomMeta"),
  roomCard: document.getElementById("roomCard"),
  playerCount: document.getElementById("playerCount"),
  playerGrid: document.getElementById("playerGrid"),
  audienceCount: document.getElementById("audienceCount"),
  audienceGrid: document.getElementById("audienceGrid"),
  startButton: document.getElementById("startButton"),
  advanceButton: document.getElementById("advanceButton"),
  pauseButton: document.getElementById("pauseButton"),
  endButton: document.getElementById("endButton"),
  restartButton: document.getElementById("restartButton"),
  controlHint: document.getElementById("controlHint"),
};

const socket = window.io();

const state = {
  bootstrap: null,
  room: null,
  session: loadJson(HOST_STORAGE_KEY),
  preferences: loadJson(PREF_STORAGE_KEY) || {
    gameId: URL_GAME_ID || "bluff-caption",
    rounds: 3,
    familyFriendly: true,
    moderationEnabled: false,
    audienceEnabled: true,
    funnyVoteEnabled: true,
  },
  phaseId: "",
  lowTimerAlerted: false,
  previousScoreMap: {},
  tvDismissed: false,
  presenterWindow: null,
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

function syncPreferenceInputs() {
  els.roundsSelect.value = String(state.room?.settings?.rounds || state.preferences.rounds || 3);
  els.familyFriendlyInput.checked = state.room?.settings?.familyFriendly ?? state.preferences.familyFriendly;
  els.moderationInput.checked = state.room?.settings?.moderationEnabled ?? state.preferences.moderationEnabled;
  els.audienceInput.checked = state.room?.settings?.audienceEnabled ?? state.preferences.audienceEnabled;
  els.funnyVoteInput.checked = state.room?.settings?.funnyVoteEnabled ?? state.preferences.funnyVoteEnabled;
}

function getSelectedGameId() {
  return state.room?.selectedGameId || URL_GAME_ID || state.preferences.gameId || state.bootstrap?.games?.[0]?.id;
}

function getSelectedGameMeta() {
  const games = state.room?.games || state.bootstrap?.games || [];
  return games.find((game) => game.id === getSelectedGameId()) || games[0];
}

function updateVideo() {
  const game = getSelectedGameMeta();
  setBackgroundVideo(els.backgroundVideo, {
    src: game?.videoPath || "/videos/game bg 1.mp4",
    poster: game?.coverPath || "",
  });
}

function shouldUseTvMode() {
  return Boolean(state.room && state.room.status !== "lobby" && !state.tvDismissed);
}

function hasAnswerRevealLanguage(text = "") {
  return /(სწორი ტექსტი|სწორი ფრაზა|სწორი არჩევანი|ნამდვილი|ყალბი|სიმართლე)/i.test(String(text || ""));
}

function sanitizeRevealCopy(text, fallback) {
  if (!text) return fallback;
  return hasAnswerRevealLanguage(text) ? fallback : text;
}

async function requestFullscreenIfPossible() {
  if (!els.stagePanel?.requestFullscreen || document.fullscreenElement) return;
  try {
    await els.stagePanel.requestFullscreen();
  } catch {
    // Ignore fullscreen permission failures and keep TV mode layout.
  }
}

async function leaveTvMode() {
  state.tvDismissed = true;
  document.body.classList.remove("tv-mode");
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch {
      // Ignore fullscreen exit failures.
    }
  }
  render();
}

function getPresenterUrl() {
  if (!state.room?.roomCode) return "";
  return new URL(`/tv?room=${encodeURIComponent(state.room.roomCode)}`, window.location.href).href;
}

function openPresenterWindow() {
  const url = getPresenterUrl();
  if (!url) return false;

  const width = Math.max(1280, window.screen?.availWidth || 1600);
  const height = Math.max(820, window.screen?.availHeight || 900);
  const features = `popup=yes,width=${width},height=${height},left=0,top=0`;

  try {
    if (state.presenterWindow && !state.presenterWindow.closed) {
      state.presenterWindow.location.href = url;
      state.presenterWindow.focus();
      return true;
    }
    state.presenterWindow = window.open(url, "levans_box_presenter", features);
    if (state.presenterWindow) {
      state.presenterWindow.moveTo?.(0, 0);
      state.presenterWindow.resizeTo?.(width, height);
      state.presenterWindow.focus();
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

async function startMatchFromHost() {
  if (!state.room) return;
  const presenterOpened = openPresenterWindow();
  if (presenterOpened) {
    state.tvDismissed = true;
  } else {
    state.tvDismissed = false;
    await requestFullscreenIfPossible();
  }
  await hostAction("start-match");
}

function renderPack() {
  const games = state.room?.games || state.bootstrap?.games || [];
  const selectedGameId = getSelectedGameId();
  els.packList.innerHTML = games.map((game) => `
    <button
      class="slot-card pack-button ${game.id === selectedGameId ? "active" : ""}"
      data-game-id="${escapeHtml(game.id)}"
      style="--card-accent:${escapeHtml(game.accent || "#ffe66d")}"
      ${state.room && !state.room.controls.canSelectGame ? "disabled" : ""}
    >
      <div class="slot-card-top">
        <div class="slot-number">${String(game.slot).padStart(2, "0")}</div>
        <span class="status-pill ${game.id === selectedGameId ? "ready" : "pending"}">${game.id === selectedGameId ? "არჩეულია" : `საჭიროა ${escapeHtml(String(game.minPlayers))}`}</span>
      </div>
      <img class="slot-cover" src="${escapeHtml(game.coverPath)}" alt="${escapeHtml(game.title)}">
      <div class="pack-copy">
        <h3>${escapeHtml(game.title)}</h3>
        <p>${escapeHtml(game.description)}</p>
      </div>
    </button>
  `).join("");

  els.packList.querySelectorAll("[data-game-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.preferences.gameId = button.dataset.gameId;
      saveJson(PREF_STORAGE_KEY, state.preferences);
      if (state.room?.controls?.canSelectGame) {
        await hostAction("select-game", { gameId: button.dataset.gameId });
      } else {
        render();
      }
    });
  });
}

function renderRoomCard() {
  if (!state.room) {
    els.roomMeta.textContent = "კოდი ჯერ არ არის შექმნილი";
    els.roomCard.className = "info-card empty-state";
    els.roomCard.innerHTML = `
      <div class="room-empty-callout">
        <h3>შექმენი ოთახი და აჩვენე კოდი დიდ ეკრანზე</h3>
        <p>ოთახის შექმნის შემდეგ აქ გამოჩნდება დიდი კოდი, QR და მოკლე ინსტრუქცია ტელეფონებისთვის.</p>
      </div>
    `;
    return;
  }

  const selectedGame = state.room.games.find((game) => game.id === state.room.selectedGameId);
  els.roomMeta.textContent = `${state.room.players.length} მოთამაშე | ${state.room.audienceCount} აუდიტორია`;
  els.roomCard.className = "info-card room-card-live";
  els.roomCard.innerHTML = `
    <div class="room-hero" style="--card-accent:${escapeHtml(selectedGame?.accent || "#ffe66d")}">
      <div class="room-hero-main">
        <div class="room-kicker">ტელეფონით შემოსასვლელი ოთახი</div>
        <div class="room-code-display">${escapeHtml(state.room.roomCode)}</div>
        <p class="room-hero-copy">ტელეფონზე გახსენით <strong>${escapeHtml(state.room.joinUrl)}</strong> და შეიყვანეთ ეს კოდი.</p>
        <div class="info-chip-row">
          <span class="info-chip tone-good">2-8 მოთამაშე</span>
          <span class="info-chip tone-accent">${state.room.settings.audienceEnabled ? "აუდიტორია ჩართულია" : "აუდიტორია გამორთულია"}</span>
          <span class="info-chip">${escapeHtml(selectedGame?.title || "")}</span>
        </div>
      </div>
      <div class="room-hero-side">
        <div class="qr-card">
          <img class="qr-image" src="${escapeHtml(state.room.qrDataUrl)}" alt="QR კოდი">
        </div>
      </div>
    </div>
    <div class="room-card-layout">
      <img class="room-cover" src="${escapeHtml(selectedGame?.coverPath || "")}" alt="${escapeHtml(selectedGame?.title || "")}">
      <div class="room-card-copy">
        <div class="info-row">
          <span class="info-label">არჩეული თამაში</span>
          <strong>${escapeHtml(selectedGame?.title || "")}</strong>
        </div>
        <div class="info-row">
          <span class="info-label">რაუნდები</span>
          <strong>${escapeHtml(String(state.room.settings.rounds))}</strong>
        </div>
        <div class="info-row">
          <span class="info-label">მობილურის მისამართი</span>
          <code>${escapeHtml(state.room.joinUrl)}</code>
        </div>
      </div>
    </div>
  `;
}

function renderParticipants() {
  const players = state.room?.players || [];
  const canKick = Boolean(state.room?.controls?.canKick);

  els.playerCount.textContent = `${players.length} / 8`;
  els.playerGrid.innerHTML = players.length ? players.map((player) => `
    <article class="player-card ${player.connected ? "is-online" : "is-offline"}" style="--card-accent:${escapeHtml(player.color)}">
      <div class="player-card-header">
        <div class="player-identity">
          <span class="player-avatar-badge">${escapeHtml(player.avatar)}</span>
          <div>
            <h3>${escapeHtml(player.name)}</h3>
            <p class="muted-text">${escapeHtml(player.status)}</p>
          </div>
        </div>
        <div class="player-side">
          <span class="player-status-pill ${player.connected ? "online" : "offline"}">${player.connected ? "აქაა" : "გათიშულია"}</span>
          <span class="score-badge">${escapeHtml(String(player.score))}</span>
        </div>
      </div>
      ${canKick ? `<button class="ghost-btn full-width kick-button" data-kick-id="${escapeHtml(player.id)}">გაგდება</button>` : ""}
    </article>
  `).join("") : `
    <div class="empty-stage">
      <h3>მოთამაშეები ჯერ არ შემოსულან</h3>
      <p>ტელეფონზე გახსენით მისამართი და შეიყვანეთ კოდი, რომ ლობი გაცოცხლდეს.</p>
    </div>
  `;

  const audience = state.room?.audience || [];
  els.audienceCount.textContent = String(state.room?.audienceCount || 0);
  els.audienceGrid.innerHTML = audience.length ? audience.map((participant) => `
    <article class="player-card audience-card ${participant.connected ? "is-online" : "is-offline"}">
      <div class="player-card-header">
        <div class="player-identity">
          <span class="player-avatar-badge">👀</span>
          <div>
            <h3>${escapeHtml(participant.name)}</h3>
            <p class="muted-text">${participant.connected ? "ელოდება ხმის მიცემას" : "დროებით გათიშულია"}</p>
          </div>
        </div>
        <span class="player-status-pill ${participant.connected ? "online" : "offline"}">${participant.connected ? "ონლაინ" : "ოფლაინ"}</span>
      </div>
      ${canKick ? `<button class="ghost-btn full-width kick-button" data-kick-id="${escapeHtml(participant.id)}">გაგდება</button>` : ""}
    </article>
  `).join("") : `<p class="muted-text">მერვე მოთამაშის შემდეგ შემომსვლელები აქ გამოჩნდებიან და ხმის მიცემაში ჩაერთვებიან.</p>`;

  document.querySelectorAll(".kick-button").forEach((button) => {
    button.addEventListener("click", () => hostAction("kick-participant", { participantId: button.dataset.kickId }));
  });
}

function renderStage() {
  const stage = state.room?.stage || {
    title: "აირჩიე თამაში",
    subtitle: "ჯერ მონიშნე თამაში და შექმენი ოთახი.",
    note: "ოთახის შექმნის შემდეგ აქ გამოჩნდება მთავარი prompt, პასუხები, reveal-ები და ქულები.",
    media: null,
    cards: [],
  };

  const phaseId = state.room?.phaseId || "";
  const tone = phaseId.includes("vote")
    ? "vote"
    : phaseId.includes("reveal") || phaseId === "final"
      ? "reveal"
      : phaseId.includes("write") || phaseId.includes("draw") || phaseId.includes("question")
        ? "write"
        : "lobby";
  const isRevealPhase = phaseId.includes("reveal");
  const stageTitle = isRevealPhase
    ? sanitizeRevealCopy(stage.title, "რაუნდის შედეგები")
    : stage.title || "ლევანს ბოქსი";
  const stageSubtitle = isRevealPhase
    ? sanitizeRevealCopy(stage.subtitle, state.room?.gameTitle || "რაუნდი")
    : stage.subtitle || "";
  const stageNote = isRevealPhase
    ? sanitizeRevealCopy(stage.note, "შედეგები ჩანს ეკრანზე და ქულები ითვლება.")
    : stage.note || "მზად ვართ შემდეგი ქაოსისთვის.";
  const cardOptions = isRevealPhase
    ? { showTags: false, showBody: false, showMeta: false, showHighlight: false }
    : {};
  const showLobbyStart = state.room?.status === "lobby";
  const startDisabled = !state.room?.controls?.canStart;

  const chips = [];
  if (state.room?.gameTitle) chips.push({ label: state.room.gameTitle, tone: "accent" });
  if (state.room?.players?.length) chips.push({ label: `${state.room.players.length} მოთამაშე`, tone: "good" });
  if ((state.room?.audienceCount || 0) > 0) chips.push({ label: `${state.room.audienceCount} აუდიტორია` });
  if (state.room?.timer) chips.push({ label: `ტაიმერი ${formatTimer(state.room.timer)}`, tone: "warning" });

  els.phaseTitle.textContent = stageTitle;
  els.phaseSubtitle.textContent = stageSubtitle;
  els.stageBody.innerHTML = `
    <section class="stage-focus stage-tone-${tone}">
      <div class="stage-focus-copy">
        <div class="stage-kicker">${escapeHtml(stageSubtitle || state.room?.gameTitle || "წვეულების ეტაპი")}</div>
        <p class="stage-focus-note">${escapeHtml(stageNote)}</p>
        <div class="info-chip-row">
          ${chips.map((chip) => `<span class="info-chip ${chip.tone ? `tone-${chip.tone}` : ""}">${escapeHtml(chip.label)}</span>`).join("")}
        </div>
      </div>
    </section>
    ${renderMedia(stage.media)}
    ${showLobbyStart ? `
      <section class="stage-start-panel">
        <div class="stage-start-copy">
          <div class="stage-kicker">საერთო ეკრანის გაშვება</div>
          <p class="stage-start-note">${escapeHtml(state.room?.controls?.reason || "როცა ყველა შემოვა, დაიწყე თამაში.")}</p>
        </div>
        <button id="stageStartButton" class="primary-btn stage-start-btn" type="button" ${startDisabled ? "disabled" : ""}>დაწყება</button>
      </section>
    ` : ""}
    ${(stage.cards || []).length ? `
      <section class="answers-showcase">
        <div class="section-heading">
          <h3>${isRevealPhase ? "შედეგები" : phaseId.includes("vote") ? "არჩევანის ვარიანტები" : "ეკრანზე მიმდინარე ეტაპი"}</h3>
          <span class="mini-label">${escapeHtml(String(stage.cards.length))} ბარათი</span>
        </div>
        ${renderCards(stage.cards || [], cardOptions)}
      </section>
    ` : ""}
  `;
  document.getElementById("stageStartButton")?.addEventListener("click", startMatchFromHost);
}

function renderScoreboardPanel() {
  const scoreboard = state.room?.scoreboard || [];
  const leader = scoreboard[0];
  els.scoreboardBody.innerHTML = `
    ${leader ? `
      <div class="scoreboard-leader">
        <span class="mini-label">წინ მიდის</span>
        <strong>${escapeHtml(leader.avatar || "")} ${escapeHtml(leader.name)}</strong>
        <span class="score-badge">${escapeHtml(String(leader.score))}</span>
      </div>
    ` : ""}
    ${renderScoreboard(scoreboard, { previousScores: state.previousScoreMap })}
  `;
}

function renderTvHud() {
  const active = shouldUseTvMode();
  els.tvHud.classList.toggle("hidden", !active);
  els.tvHud.setAttribute("aria-hidden", active ? "false" : "true");
  if (!active || !state.room) {
    els.tvPlayersHud.innerHTML = "";
    els.tvJoinHud.innerHTML = "";
    els.tvControlsHud.innerHTML = "";
    return;
  }

  const controls = state.room.controls || {};
  const scoreboard = state.room.scoreboard || [];
  const timerLabel = state.room.timer ? formatTimer(state.room.timer) : "00:00";

  els.tvPlayersHud.innerHTML = `
    <section class="tv-card">
      <div class="tv-card-head">
        <h3>მოთამაშეები</h3>
        <span class="mini-label">${escapeHtml(String(state.room.players.length))} / 8</span>
      </div>
      ${renderScoreboard(scoreboard, { previousScores: state.previousScoreMap, compact: true })}
    </section>
  `;

  els.tvJoinHud.innerHTML = `
    <button id="tvExitButton" class="ghost-btn tv-exit-button" type="button">გასვლა</button>
    <section class="tv-card tv-join-card">
      <div class="tv-card-head">
        <h3>შეერთება</h3>
        <span id="tvTimerChip" class="timer-chip tv-timer-chip">${escapeHtml(timerLabel)}</span>
      </div>
      <div class="tv-room-code">${escapeHtml(state.room.roomCode)}</div>
      <p class="tv-join-copy">ტელეფონზე გახსენით <strong>${escapeHtml(state.room.joinUrl)}</strong> და შეიყვანეთ კოდი.</p>
      <img class="tv-qr-image" src="${escapeHtml(state.room.qrDataUrl)}" alt="QR კოდი">
    </section>
  `;

  const tvButtons = [];
  if (controls.canAdvance) {
    tvButtons.push(`<button type="button" class="primary-btn tv-control-btn" data-tv-action="next-phase">${escapeHtml(controls.advanceLabel || "შემდეგი ეტაპი")}</button>`);
  }
  if (controls.canPause) {
    tvButtons.push(`<button type="button" class="secondary-btn tv-control-btn" data-tv-action="pause-timer">${escapeHtml(controls.pauseLabel || "პაუზა")}</button>`);
  }
  if (controls.canRestart) {
    tvButtons.push(`<button type="button" class="ghost-btn tv-control-btn" data-tv-action="restart-lobby">ლობიში დაბრუნება</button>`);
  }
  if (controls.canEnd) {
    tvButtons.push(`<button type="button" class="ghost-btn tv-control-btn" data-tv-action="end-match">მატჩის დასრულება</button>`);
  }

  els.tvControlsHud.innerHTML = `
    <section class="tv-card tv-control-card">
      <div class="tv-card-head">
        <h3>ჰოსტის მართვა</h3>
      </div>
      <div class="tv-control-grid">${tvButtons.join("")}</div>
      <p class="tv-hint">${escapeHtml(controls.reason || "ჰოსტი აკონტროლებს ტემპს.")}</p>
    </section>
  `;

  document.getElementById("tvExitButton")?.addEventListener("click", leaveTvMode);
  els.tvControlsHud.querySelectorAll("[data-tv-action]").forEach((button) => {
    button.addEventListener("click", () => hostAction(button.dataset.tvAction));
  });
}

function renderControls() {
  const controls = state.room?.controls;
  els.startButton.disabled = !controls?.canStart;
  els.advanceButton.disabled = !controls?.canAdvance;
  els.pauseButton.disabled = !controls?.canPause;
  els.endButton.disabled = !controls?.canEnd;
  els.restartButton.disabled = !controls?.canRestart;
  els.pauseButton.textContent = controls?.pauseLabel || "პაუზა";
  els.controlHint.textContent = controls?.reason || "აირჩიე თამაში ან შექმენი ოთახი.";
}

function renderTimer() {
  const tvTimerChip = document.getElementById("tvTimerChip");
  if (!state.room?.timer) {
    els.timerChip.textContent = "00:00";
    els.timerChip.classList.remove("danger");
    if (tvTimerChip) {
      tvTimerChip.textContent = "00:00";
      tvTimerChip.classList.remove("danger");
    }
    return;
  }

  const text = formatTimer(state.room.timer);
  els.timerChip.textContent = text;
  if (tvTimerChip) tvTimerChip.textContent = text;
  const remainingMs = state.room.timer.paused
    ? state.room.timer.remainingMs
    : Math.max(0, state.room.timer.endsAt - Date.now());
  const isLow = remainingMs <= 5000;
  els.timerChip.classList.toggle("danger", isLow);
  if (tvTimerChip) tvTimerChip.classList.toggle("danger", isLow);

  if (isLow && !state.lowTimerAlerted) {
    state.lowTimerAlerted = true;
    playCue("alert");
    triggerMotion(els.timerChip, "timer-flash");
  }

  if (remainingMs > 5000) {
    state.lowTimerAlerted = false;
  }
}

function formatStatusLabel(status) {
  if (status === "lobby") return "ლობი";
  if (status === "running") return "თამაში მიმდინარეობს";
  if (status === "final") return "ფინალი";
  return "მზადაა";
}

function render() {
  const tvMode = shouldUseTvMode();
  document.body.classList.toggle("room-live", Boolean(state.room));
  document.body.classList.toggle("tv-mode", tvMode);
  if (!tvMode && document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  syncPreferenceInputs();
  renderPack();
  renderRoomCard();
  renderParticipants();
  renderStage();
  renderScoreboardPanel();
  renderTvHud();
  renderControls();
  renderTimer();
  updateVideo();
  els.menuMeta.textContent = state.room
    ? `${formatStatusLabel(state.room.status)} | ${state.room.players.length} მოთამაშე`
    : "8 რეჟიმი";
}

async function createRoom(randomGame = false) {
  const settings = collectSettings();
  const payload = {
    gameId: randomGame && state.bootstrap?.games?.length
      ? state.bootstrap.games[Math.floor(Math.random() * state.bootstrap.games.length)].id
      : getSelectedGameId(),
    rounds: settings.rounds,
    familyFriendly: settings.familyFriendly,
    moderationEnabled: settings.moderationEnabled,
    audienceEnabled: settings.audienceEnabled,
    funnyVoteEnabled: settings.funnyVoteEnabled,
  };

  const response = await emitAck(socket, "host:create-room", payload);
  state.session = {
    roomCode: response.roomCode,
    sessionId: response.hostSessionId,
  };
  saveJson(HOST_STORAGE_KEY, state.session);
}

async function hostAction(type, extra = {}) {
  if (!state.session) return;
  await emitAck(socket, "host:action", {
    roomCode: state.session.roomCode,
    sessionId: state.session.sessionId,
    type,
    ...extra,
  });
}

async function resumeHost() {
  if (!state.session?.roomCode || !state.session?.sessionId) return false;
  try {
    await emitAck(socket, "host:resume-room", state.session);
    return true;
  } catch {
    state.session = null;
    saveJson(HOST_STORAGE_KEY, null);
    return false;
  }
}

function collectSettings() {
  return {
    rounds: Number(els.roundsSelect.value || 3),
    familyFriendly: els.familyFriendlyInput.checked,
    moderationEnabled: els.moderationInput.checked,
    audienceEnabled: els.audienceInput.checked,
    funnyVoteEnabled: els.funnyVoteInput.checked,
  };
}

function savePreferences() {
  state.preferences = {
    ...state.preferences,
    ...collectSettings(),
    gameId: getSelectedGameId(),
  };
  saveJson(PREF_STORAGE_KEY, state.preferences);
}

function bindSettings() {
  [
    els.roundsSelect,
    els.familyFriendlyInput,
    els.moderationInput,
    els.audienceInput,
    els.funnyVoteInput,
  ].forEach((element) => {
    element.addEventListener("change", async () => {
      savePreferences();
      if (state.room?.status === "lobby") {
        await hostAction("update-settings", { settings: collectSettings() });
      } else {
        render();
      }
    });
  });
}

socket.on("bootstrap", (payload) => {
  state.bootstrap = payload;
  render();
});

socket.on("host:state", (roomState) => {
  const previousPhaseId = state.phaseId;
  const previousRoom = state.room;
  if (roomState.status === "lobby") state.tvDismissed = false;
  state.previousScoreMap = getScoreMap(previousRoom?.scoreboard || []);
  state.phaseId = roomState.phaseId;
  state.room = roomState;
  syncPreferenceInputs();
  render();

  const phaseChanged = previousPhaseId && previousPhaseId !== roomState.phaseId;
  const scoreChanged = (roomState.scoreboard || []).some((player) => player.score !== (state.previousScoreMap[player.id] || 0));

  if (phaseChanged) {
    triggerMotion(els.stageBody);
    playCue(roomState.phaseId.includes("vote") ? "vote" : roomState.phaseId.includes("reveal") ? "reveal" : "soft");
  }

  if (scoreChanged) {
    triggerMotion(els.scoreboardBody, "scoreboard-pop");
    playCue("score");
  }
});

socket.on("disconnect", () => {
  els.controlHint.textContent = "კავშირი დროებით გაწყდა. ავტომატური დაბრუნება მიმდინარეობს...";
});

socket.on("connect", async () => {
  const resumed = await resumeHost();
  if (!resumed) render();
});

els.createRoomButton.addEventListener("click", async () => {
  savePreferences();
  state.tvDismissed = false;
  await createRoom(false);
});

els.randomRoomButton.addEventListener("click", async () => {
  savePreferences();
  state.tvDismissed = false;
  if (state.room?.controls?.canSelectGame) {
    await hostAction("random-game");
    return;
  }
  await createRoom(true);
});

els.freshRoomButton.addEventListener("click", async () => {
  savePreferences();
  state.tvDismissed = false;
  state.session = null;
  saveJson(HOST_STORAGE_KEY, null);
  state.room = null;
  await createRoom(false);
});

els.startButton.addEventListener("click", startMatchFromHost);
els.advanceButton.addEventListener("click", () => hostAction("next-phase"));
els.pauseButton.addEventListener("click", () => hostAction("pause-timer"));
els.endButton.addEventListener("click", () => hostAction("end-match"));
els.restartButton.addEventListener("click", () => hostAction("restart-lobby"));

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && state.room?.status !== "lobby" && document.body.classList.contains("tv-mode")) {
    state.tvDismissed = true;
    render();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.target?.matches("input, textarea, select")) return;
  if (event.code === "Space" && !els.advanceButton.disabled) {
    event.preventDefault();
    els.advanceButton.click();
  }
  if (event.key.toLowerCase() === "p" && !els.pauseButton.disabled) els.pauseButton.click();
  if (event.key.toLowerCase() === "r" && !els.restartButton.disabled) els.restartButton.click();
});

setInterval(renderTimer, 250);
bindSettings();
if (URL_GAME_ID) {
  state.preferences.gameId = URL_GAME_ID;
  saveJson(PREF_STORAGE_KEY, state.preferences);
}
render();
