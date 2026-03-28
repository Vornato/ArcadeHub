import {
  emitAck,
  escapeHtml,
  formatTimer,
  qs,
  renderCards,
  renderMedia,
  renderScoreboard,
  setBackgroundVideo,
} from "/static/common.js";

const socket = window.io();

const els = {
  backgroundVideo: document.getElementById("backgroundVideo"),
  presenterRoot: document.getElementById("presenterRoot"),
};

const state = {
  roomCode: qs("room") || "",
  room: null,
  fullscreenAttempted: false,
  previousScoreMap: {},
};

function getScoreMap(players = []) {
  return Object.fromEntries(players.map((player) => [player.id, player.score]));
}

function hasAnswerRevealLanguage(text = "") {
  return /(სწორი ტექსტი|სწორი ფრაზა|სწორი არჩევანი|ნამდვილი|ყალბი|სიმართლე)/i.test(String(text || ""));
}

function sanitizeRevealCopy(text, fallback) {
  if (!text) return fallback;
  return hasAnswerRevealLanguage(text) ? fallback : text;
}

async function requestFullscreenIfPossible() {
  if (state.fullscreenAttempted || document.fullscreenElement || !document.documentElement.requestFullscreen) {
    return;
  }
  state.fullscreenAttempted = true;
  try {
    await document.documentElement.requestFullscreen();
  } catch {
    // Ignore fullscreen failures.
  }
}

function updateVideo() {
  setBackgroundVideo(els.backgroundVideo, {
    src: state.room?.gameVideoPath || "/videos/game bg 1.mp4",
    poster: state.room?.gameCoverPath || "",
  });
}

function renderWaiting() {
  els.presenterRoot.innerHTML = `
    <section class="presenter-card presenter-empty">
      <div class="eyebrow">საერთო ეკრანი</div>
      <h1>ლევანს ბოქსი</h1>
      <p class="hero-copy">თუ ეს ფანჯარა ცარიელია, ჰოსტის ეკრანიდან გაუშვი თამაში და გახსენი საერთო ეკრანი ახალი ფანჯრით.</p>
    </section>
  `;
}

function renderLobby(room) {
  const scoreboard = renderScoreboard(room.scoreboard || [], {
    previousScores: state.previousScoreMap,
    compact: true,
  });

  els.presenterRoot.innerHTML = `
    <section class="presenter-card presenter-lobby-card">
      <div class="eyebrow">საერთო ეკრანი • ლობი</div>
      <h1>${escapeHtml(room.gameTitle || room.stage?.title || "ლევანს ბოქსი")}</h1>
      <p class="presenter-copy">${escapeHtml(room.stage?.subtitle || "")}</p>

      <div class="presenter-cover-wrap">
        <img class="presenter-cover" src="${escapeHtml(room.gameCoverPath || "")}" alt="${escapeHtml(room.gameTitle || "ლევანს ბოქსი")}">
      </div>

      <div class="presenter-join-card">
        <div class="presenter-room-code">${escapeHtml(room.roomCode)}</div>
        <p class="presenter-copy">ტელეფონზე გახსენით <strong>${escapeHtml(room.joinUrl)}</strong> და შეიყვანეთ ეს კოდი.</p>
        <img class="presenter-qr" src="${escapeHtml(room.qrDataUrl)}" alt="QR კოდი">
      </div>

      <div class="presenter-start-zone">
        <button class="primary-btn presenter-start-btn" type="button" disabled>დაწყება</button>
        <p class="presenter-hint">ჰოსტი კონტროლის ფანჯრიდან დაიწყებს თამაშს.</p>
      </div>

      ${(room.scoreboard || []).length ? `
        <section class="presenter-score-panel">
          <div class="section-heading presenter-score-heading">
            <h3>მოთამაშეები და ქულები</h3>
          </div>
          ${scoreboard}
        </section>
      ` : ""}
    </section>
  `;
}

function renderRunning(room) {
  const phaseId = room.phaseId || "";
  const isRevealPhase = phaseId.includes("reveal");
  const title = isRevealPhase
    ? sanitizeRevealCopy(room.stage?.title, "რაუნდის შედეგები")
    : room.stage?.title || room.gameTitle || "ლევანს ბოქსი";
  const subtitle = isRevealPhase
    ? sanitizeRevealCopy(room.stage?.subtitle, room.gameTitle || "რაუნდი")
    : room.stage?.subtitle || room.gameTitle || "";
  const note = isRevealPhase
    ? sanitizeRevealCopy(room.stage?.note, "შედეგები ჩანს ეკრანზე.")
    : room.stage?.note || "";
  const tone = phaseId.includes("vote")
    ? "vote"
    : phaseId.includes("reveal") || phaseId === "final"
      ? "reveal"
      : phaseId.includes("write") || phaseId.includes("draw") || phaseId.includes("question")
        ? "write"
        : "lobby";
  const cardsHtml = renderCards(room.stage?.cards || [], isRevealPhase
    ? { showTags: false, showBody: false, showMeta: false, showHighlight: false }
    : {});

  els.presenterRoot.innerHTML = `
    <div class="presenter-topline">
      <div class="timer-chip presenter-top-chip">${escapeHtml(room.gameTitle || "ლევანს ბოქსი")}</div>
      <div class="timer-chip presenter-top-chip ${room.timer ? "" : ""}">${escapeHtml(room.timer ? formatTimer(room.timer) : "00:00")}</div>
    </div>

    <section class="presenter-live-join">
      <div class="presenter-live-join-copy">
        <span class="mini-label">ოთახის კოდი</span>
        <div class="presenter-live-code">${escapeHtml(room.roomCode)}</div>
        <p class="presenter-hint">ტელეფონზე გახსენით <strong>${escapeHtml(room.joinUrl)}</strong> და შეიყვანეთ კოდი.</p>
      </div>
      <img class="presenter-live-qr" src="${escapeHtml(room.qrDataUrl)}" alt="ოთახის QR კოდი">
    </section>

    <section class="presenter-card presenter-stage-card">
      <div class="stage-focus stage-tone-${tone}">
        <div class="stage-focus-copy presenter-focus-copy">
          <div class="stage-kicker">${escapeHtml(subtitle)}</div>
          <h1 class="presenter-stage-title">${escapeHtml(title)}</h1>
          ${note ? `<p class="stage-focus-note presenter-stage-note">${escapeHtml(note)}</p>` : ""}
        </div>
      </div>

      ${renderMedia(room.stage?.media)}
      ${cardsHtml ? `<section class="presenter-card-grid">${cardsHtml}</section>` : ""}

      ${(room.scoreboard || []).length ? `
        <section class="presenter-score-panel">
          ${renderScoreboard(room.scoreboard, { previousScores: state.previousScoreMap, compact: true })}
        </section>
      ` : ""}
    </section>
  `;
}

function render() {
  updateVideo();
  if (!state.room) {
    renderWaiting();
    return;
  }

  if (state.room.status === "lobby") {
    renderLobby(state.room);
    return;
  }

  renderRunning(state.room);
}

async function watchRoom() {
  if (!state.roomCode) {
    renderWaiting();
    return;
  }

  await emitAck(socket, "presenter:watch", { roomCode: state.roomCode });
}

socket.on("connect", async () => {
  try {
    await watchRoom();
  } catch {
    renderWaiting();
  }
});

socket.on("presenter:state", (roomState) => {
  state.previousScoreMap = getScoreMap(state.room?.scoreboard || []);
  state.room = roomState;
  render();
  if (roomState.status !== "lobby") {
    requestFullscreenIfPossible();
  }
});

socket.on("disconnect", () => {
  render();
});

render();
