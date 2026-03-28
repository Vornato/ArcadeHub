export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function loadJson(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveJson(key, value) {
  if (value === null || value === undefined) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function updateQuery(values) {
  const url = new URL(window.location.href);
  Object.entries(values).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  });
  window.history.replaceState({}, "", url);
}

export function emitAck(socket, event, payload = {}) {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (response = {}) => {
      if (response.ok === false) {
        reject(new Error(response.error || "უცნობი შეცდომა"));
        return;
      }
      resolve(response);
    });
  });
}

export function formatTimer(timer) {
  if (!timer) return "00:00";
  const remainingMs = timer.paused ? timer.remainingMs : Math.max(0, timer.endsAt - Date.now());
  const seconds = Math.ceil(remainingMs / 1000);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function vibrate(pattern = 18) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

export function playCue(kind = "soft") {
  const AudioContextRef = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextRef) return;

  try {
    const audioContext = playCue.ctx || (playCue.ctx = new AudioContextRef());
    if (audioContext.state === "suspended") audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const presets = {
      soft: { start: 620, end: 980, gain: 0.08, duration: 0.2 },
      vote: { start: 760, end: 1180, gain: 0.1, duration: 0.22 },
      alert: { start: 440, end: 280, gain: 0.1, duration: 0.22 },
      reveal: { start: 420, end: 1320, gain: 0.12, duration: 0.3 },
      score: { start: 680, end: 1440, gain: 0.12, duration: 0.28 },
    };

    const preset = presets[kind] || presets.soft;
    const now = audioContext.currentTime;
    oscillator.frequency.setValueAtTime(preset.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(preset.end, now + preset.duration * 0.72);
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(preset.gain, now + 0.018);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);
    oscillator.start(now);
    oscillator.stop(now + preset.duration + 0.02);
  } catch {
    // Ignore autoplay or audio-init issues.
  }
}

export function setBackgroundVideo(videoElement, { src = "", poster = "" } = {}) {
  if (!videoElement) return;

  if (!src) {
    videoElement.pause();
    videoElement.removeAttribute("src");
    if (poster) videoElement.poster = poster;
    videoElement.load();
    delete videoElement.dataset.src;
    return;
  }

  if (videoElement.dataset.src === src && videoElement.poster === poster) {
    return;
  }

  videoElement.dataset.src = src;
  videoElement.src = src;
  if (poster) videoElement.poster = poster;
  videoElement.load();
  const playAttempt = videoElement.play();
  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {});
  }
}

function renderInfoChips(chips = []) {
  if (!chips.length) return "";
  return `
    <div class="info-chip-row">
      ${chips.map((chip) => `<span class="info-chip ${chip.tone ? `tone-${escapeHtml(chip.tone)}` : ""}">${escapeHtml(chip.label)}</span>`).join("")}
    </div>
  `;
}

export function renderMedia(media) {
  if (!media) return "";

  const chips = [];
  if (media.label) chips.push({ label: media.label, tone: "accent" });

  if (media.kind === "image") {
    return `
      <article class="media-card media-card-prominent media-image-card">
        <div class="media-visual">
          <img class="media-image" src="${escapeHtml(media.imageUrl)}" alt="${escapeHtml(media.title || media.label || "მედია")}">
        </div>
        <div class="media-copy">
          ${renderInfoChips(chips)}
          ${media.title ? `<h3>${escapeHtml(media.title)}</h3>` : ""}
          ${media.text ? `<p class="muted-text">${escapeHtml(media.text)}</p>` : ""}
        </div>
      </article>
    `;
  }

  if (media.kind === "illustration") {
    return `
      <article class="media-card media-card-prominent illustration-card">
        ${renderInfoChips(chips)}
        <div class="emoji-stage">${escapeHtml(media.emojiLine || "🎉 🪩 🎈")}</div>
        ${media.title ? `<h3>${escapeHtml(media.title)}</h3>` : ""}
        ${media.text ? `<p class="muted-text">${escapeHtml(media.text)}</p>` : ""}
      </article>
    `;
  }

  if (media.kind === "path") {
    return `
      <article class="media-card media-card-prominent">
        ${renderInfoChips(chips)}
        ${media.title ? `<h3>${escapeHtml(media.title)}</h3>` : ""}
        <div class="path-row">${(media.path || []).map((item) => `<span class="path-pill">${escapeHtml(item)}</span>`).join("")}</div>
        ${media.text ? `<p class="muted-text">${escapeHtml(media.text)}</p>` : ""}
      </article>
    `;
  }

  return `
    <article class="media-card media-card-prominent">
      <div class="media-copy">
        ${renderInfoChips(chips)}
        ${media.title ? `<h3>${escapeHtml(media.title)}</h3>` : ""}
        ${media.text ? `<p class="muted-text">${escapeHtml(media.text)}</p>` : ""}
      </div>
    </article>
  `;
}

export function renderCards(cards = [], options = {}) {
  if (!cards.length) return "";

  const showTags = options.showTags !== false;
  const showBody = options.showBody !== false;
  const showMeta = options.showMeta !== false;
  const showHighlight = options.showHighlight !== false;

  return `
    <div class="answer-grid">
      ${cards.map((card, index) => `
        <article class="answer-card ${card.highlight && showHighlight ? "truth-card" : ""}" style="${card.accent ? `--card-accent:${card.accent}` : ""}; animation-delay:${index * 55}ms">
          <div class="answer-card-top">
            <span class="answer-index">${String(index + 1).padStart(2, "0")}</span>
            ${showTags && card.tag ? `<div class="answer-pill">${escapeHtml(card.tag)}</div>` : ""}
          </div>
          <h3>${escapeHtml(card.title || "")}</h3>
          ${showBody && card.body ? `<p class="muted-text">${escapeHtml(card.body)}</p>` : ""}
          ${showMeta && card.meta ? `<p class="card-meta">${escapeHtml(card.meta)}</p>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

export function renderScoreboard(players = [], options = {}) {
  if (!players.length) return "";

  const previousScores = options.previousScores || {};
  return `
    <div class="roster-list scoreboard-list ${options.compact ? "compact" : ""}">
      ${players.map((player, index) => {
        const previousScore = previousScores[player.id];
        const delta = typeof previousScore === "number" ? player.score - previousScore : 0;
        const isLeader = index === 0;
        return `
          <div class="score-row ${delta > 0 ? "score-row-up" : ""}" style="${player.color ? `--card-accent:${player.color}` : ""}">
            <div class="score-main">
              <span class="score-rank">${isLeader ? "★" : index + 1}</span>
              <span class="score-name">${escapeHtml(player.avatar || "")} ${escapeHtml(player.name)}</span>
              ${player.connected === false ? `<span class="score-state">გათიშულია</span>` : ""}
            </div>
            <div class="score-side">
              ${delta > 0 ? `<span class="score-delta">+${escapeHtml(String(delta))}</span>` : ""}
              <strong>${escapeHtml(String(player.score))}</strong>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}
