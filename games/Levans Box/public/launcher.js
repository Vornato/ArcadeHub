const HOST_URL = "http://127.0.0.1:3094/";
const PLAY_URL = `${HOST_URL}play`;
const READY_PING_URL = `${HOST_URL}assets/levans-box-cover.svg`;
const SERVER_TIMEOUT_MS = 26000;
const SERVER_RETRY_MS = 900;

const panelButtons = Array.from(document.querySelectorAll("[data-panel-target]"));
const panels = Array.from(document.querySelectorAll(".menu-panel"));
const gameCards = Array.from(document.querySelectorAll("[data-game-id]"));

const launcherStatus = document.getElementById("launcherStatus");
const launcherStatusText = document.getElementById("launcherStatusText");
const batLauncherLink = document.getElementById("batLauncherLink");
const selectedGameLabel = document.getElementById("selectedGameLabel");

const state = {
  selectedGameId: gameCards.find((card) => card.classList.contains("is-selected"))?.dataset.gameId || "bluff-caption",
  selectedGameTitle: gameCards.find((card) => card.classList.contains("is-selected"))?.dataset.gameTitle || "ცრუ წარწერა",
};

const hostOpenButtons = [
  document.getElementById("heroHostBtn"),
  document.getElementById("hostOpenBtn"),
  document.getElementById("joinPanelHostBtn"),
].filter(Boolean);

const hostDirectButtons = [
  document.getElementById("openHostDirectBtn"),
].filter(Boolean);

const playButtons = [
  document.getElementById("openPlayBtn"),
  document.getElementById("openPlayDirectBtn"),
  document.getElementById("joinPanelPlayBtn"),
].filter(Boolean);

function setStatus(message, tone = "neutral") {
  if (!launcherStatus || !launcherStatusText) {
    return;
  }

  launcherStatus.dataset.tone = tone;
  launcherStatusText.textContent = message;
}

function showPanel(targetPanel) {
  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === targetPanel);
  });

  panelButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.panelTarget === targetPanel);
  });
}

function resolveBatHref() {
  return new URL("./Start%20Levans%20Box%20Server.bat", window.location.href).href;
}

function updateBatLink() {
  if (!batLauncherLink) {
    return;
  }

  if (window.location.protocol === "file:") {
    batLauncherLink.href = resolveBatHref();
    batLauncherLink.target = "_blank";
    batLauncherLink.rel = "noopener";
  } else {
    batLauncherLink.href = "#";
  }
}

function pingServerOnce(timeoutMs = 1200) {
  return new Promise((resolve) => {
    const probe = new Image();
    let settled = false;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      probe.onload = null;
      probe.onerror = null;
      resolve(result);
    };

    const timeoutId = window.setTimeout(() => finish(false), timeoutMs);

    probe.onload = () => finish(true);
    probe.onerror = () => finish(false);
    probe.src = `${READY_PING_URL}?t=${Date.now()}-${Math.random().toString(36).slice(2)}`;
  });
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function updateSelectedGameUi() {
  gameCards.forEach((card) => {
    const active = card.dataset.gameId === state.selectedGameId;
    card.classList.toggle("is-selected", active);
    card.setAttribute("aria-pressed", active ? "true" : "false");
  });

  if (selectedGameLabel) {
    selectedGameLabel.textContent = `არჩეული თამაში: ${state.selectedGameTitle}`;
  }
}

function getHostUrl() {
  const url = new URL(HOST_URL);
  if (state.selectedGameId) {
    url.searchParams.set("game", state.selectedGameId);
  }
  return url.href;
}

function navigateTo(url) {
  const isPlay = url.includes("/play");
  const windowName = isPlay ? "levans_box_play" : "levans_box_host";
  const width = isPlay ? 460 : Math.max(1320, window.screen?.availWidth || 1440);
  const height = isPlay ? 920 : Math.max(860, window.screen?.availHeight || 920);
  const features = `popup=yes,width=${width},height=${height},left=0,top=0`;

  try {
    const popup = window.open(url, windowName, features);
    if (popup) {
      popup.focus();
      return;
    }
  } catch (_error) {
    // Fall back to same-window navigation.
  }

  try {
    if (window.top) {
      window.top.location.href = url;
      return;
    }
  } catch (_error) {
    // Ignore and fall back to the current frame.
  }

  window.location.href = url;
}

async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await pingServerOnce()) {
      return true;
    }
    await sleep(SERVER_RETRY_MS);
  }

  return false;
}

function tryLaunchBat() {
  if (window.location.protocol !== "file:") {
    setStatus("ეს გვერდი BAT ფაილს მხოლოდ ლოკალური ArcadeHub ფაილიდან უკეთ გახსნის. თუ სერვერი ჯერ არ მუშაობს, გაუშვი BAT ხელით.", "warning");
    return;
  }

  const batHref = resolveBatHref();

  const link = document.createElement("a");
  link.href = batHref;
  link.target = "_blank";
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();

  const helperFrame = document.createElement("iframe");
  helperFrame.className = "hidden";
  helperFrame.src = batHref;
  document.body.appendChild(helperFrame);
  window.setTimeout(() => helperFrame.remove(), 3000);
}

async function openHostFlow() {
  showPanel("start");
  const hostUrl = getHostUrl();

  if (await pingServerOnce(800)) {
    setStatus("სერვერი უკვე ჩართულია. ჰოსტის ეკრანს ვხსნი...", "success");
    navigateTo(hostUrl);
    return;
  }

  setStatus("ვეცდები BAT გამშვების გახსნას. თუ ბრაუზერმა გაფრთხილება გაჩვენა, დაუშვი გახსნა.", "warning");
  tryLaunchBat();

  const isReady = await waitForServer(SERVER_TIMEOUT_MS);

  if (isReady) {
    setStatus("სერვერი ჩაირთო. ჰოსტის ეკრანს ვხსნი...", "success");
    await sleep(450);
    navigateTo(hostUrl);
    return;
  }

  setStatus("სერვერი ჯერ ვერ მოიძებნა. თუ BAT არ გაიხსნა, გაუშვი Start Levans Box Server.bat ხელით და შემდეგ ისევ დააჭირე ამ ღილაკს.", "danger");
}

function openHostDirect() {
  navigateTo(getHostUrl());
}

function openPlayDirect() {
  navigateTo(PLAY_URL);
}

panelButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showPanel(button.dataset.panelTarget);
  });
});

gameCards.forEach((card) => {
  card.addEventListener("click", () => {
    state.selectedGameId = card.dataset.gameId || state.selectedGameId;
    state.selectedGameTitle = card.dataset.gameTitle || state.selectedGameTitle;
    updateSelectedGameUi();
    showPanel("start");
    setStatus(`არჩეულია „${state.selectedGameTitle}“. ახლა შეგიძლია ჰოსტის გახსნა.`, "success");
  });
});

hostOpenButtons.forEach((button) => {
  button.addEventListener("click", openHostFlow);
});

hostDirectButtons.forEach((button) => {
  button.addEventListener("click", openHostDirect);
});

playButtons.forEach((button) => {
  button.addEventListener("click", openPlayDirect);
});

if (batLauncherLink) {
  batLauncherLink.addEventListener("click", (event) => {
    if (window.location.protocol !== "file:") {
      event.preventDefault();
      setStatus("აქედან BAT ფაილი ვერ გაიხსნება, რადგან გვერდი ფაილად არ არის გახსნილი. გაუშვი იგი ხელით Games\\Levans Box საქაღალდიდან.", "warning");
      return;
    }

    setStatus("BAT გამშვების გახსნა ვცადე. თუ არაფერი მოხდა, გახსენი ის ხელით Games\\Levans Box საქაღალდიდან.", "warning");
    tryLaunchBat();
    event.preventDefault();
  });
}

updateBatLink();
updateSelectedGameUi();
setStatus("დააჭირე „ჰოსტის გახსნა“-ს, ან გადადი სხვა ჩანართზე თამაშებისა და შეერთების ინსტრუქციებისთვის.");
