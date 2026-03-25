const DETECTIVE_SCENES = {
  "scene 1": {
    file: "scene 1.mp4",
    choices: [
      { key: 1, text: "Mila, open the door. My badge is glitching.", next: "scene 2a" },
      { key: 2, text: "Why are you looking at me like that?", next: "scene 2b" },
      { key: 3, text: "Did something happen in there?", next: "scene 2c" }
    ]
  },
  "scene 2a": {
    file: "scene 2a.mp4",
    next: "scene 3"
  },
  "scene 2b": {
    file: "scene 2b.mp4",
    next: "scene 3"
  },
  "scene 2c": {
    file: "scene 2c.mp4",
    next: "scene 3"
  },
  "scene 3": {
    file: "scene 3.mp4",
    next: "scene 4"
  },
  "scene 4": {
    file: "scene 4.mp4",
    choices: [
      { key: 1, text: "Processed out? Fired? By who?", next: "scene 5a" },
      { key: 2, text: "Who signed it?", next: "scene 5b" },
      { key: 3, text: "What aren't you telling me?", next: "scene 5c" }
    ]
  },
  "scene 5a": {
    file: "scene 5a.mp4",
    next: "scene 6"
  },
  "scene 5b": {
    file: "scene 5b.mp4",
    next: "scene 6"
  },
  "scene 5c": {
    file: "scene 5c.mp4",
    next: "scene 6"
  },
  "scene 6": {
    file: "scene 6.mp4",
    choices: [
      { key: 1, text: "You fired me?", next: "scene 7A" },
      { key: 2, text: "We need to talk. Now.", next: "scene 7b" },
      { key: 3, text: "What did you erase from my file?", next: "scene 7c" }
    ]
  },
  "scene 7A": {
    file: "scene 7A.mp4",
    next: "scene 8"
  },
  "scene 7b": {
    file: "scene 7b.mp4",
    next: "scene 8"
  },
  "scene 7c": {
    file: "scene 7c.mp4",
    next: "scene 8"
  },
  "scene 8": {
    file: "scene 8.mp4",
    next: "scene 9"
  },
  "scene 9": {
    file: "scene 9.mp4",
    choices: [
      { key: 1, text: "Did you know about this?", next: "scene 10a" },
      { key: 2, text: "Start talking, Reeves.", next: "scene 10b" },
      { key: 3, text: "If you're here to lie to me, leave.", next: "scene 10c" }
    ]
  },
  "scene 10a": {
    file: "scene 10a.mp4",
    next: "scene 11"
  },
  "scene 10b": {
    file: "scene 10b.mp4",
    next: "scene 11"
  },
  "scene 10c": {
    file: "scene 10c.mp4",
    next: "scene 11"
  },
  "scene 11": {
    file: "scene 11.mp4",
    next: "scene 12"
  },
  "scene 12": {
    file: "scene 12.mp4",
    choices: [
      { key: 1, text: "Who is this?", next: "scene 13a" },
      { key: 2, text: "You fired me because of file seventeen?", next: "scene 13b" },
      { key: 3, text: "I'm not stopping.", next: "scene 13c" }
    ]
  },
  "scene 13a": {
    file: "scene 13a.mp4",
    next: "scene 14"
  },
  "scene 13b": {
    file: "scene 13b.mp4",
    next: "scene 14"
  },
  "scene 13c": {
    file: "scene 13c.mp4",
    next: "scene 14"
  },
  "scene 14": {
    file: "scene 14.mp4",
    next: "scene 16"
  },
  "scene 16": {
    file: "scene 16.mp4",
    choices: [
      { key: 1, text: "They were looking for evidence.", next: "scene 16a" },
      { key: 2, text: "Reeves told them where I live.", next: "scene 16b" },
      { key: 3, text: "They missed something.", next: "scene 16c" }
    ]
  },
  "scene 16a": {
    file: "scene 16a.mp4",
    next: "scene 17"
  },
  "scene 16b": {
    file: "scene 16b.mp4",
    next: "scene 17"
  },
  "scene 16c": {
    file: "scene 16c.mp4",
    next: "scene 17"
  },
  "scene 17": {
    file: "scene 17.mp4",
    next: "scene 18"
  },
  "scene 18": {
    file: "scene 18.mp4",
    choices: [
      { key: 1, text: "Harlow! I know you're in there!", next: "scene 19a" },
      { key: 2, text: "Stay silent and enter carefully.", next: "scene 19b" },
      { key: 3, text: "If I don't walk out, someone gets everything.", next: "scene 19c" }
    ]
  },
  "scene 19a": {
    file: "scene 19a.mp4",
    next: "scene 20"
  },
  "scene 19b": {
    file: "scene 19b.mp4",
    next: "scene 20"
  },
  "scene 19c": {
    file: "scene 19c.mp4",
    next: "scene 20"
  },
  "scene 20": {
    file: "scene 20.mp4",
    next: "scene 21"
  },
  "scene 21": {
    file: "scene 21.mp4",
    choices: [
      { key: 1, text: "Expose everything to the public.", next: "scene 22a" },
      { key: 2, text: "Burn it all and disappear.", next: "scene 22b" },
      { key: 3, text: "Ask the question: Am I even real?", next: "scene 22c" }
    ]
  },
  "scene 22a": {
    file: "scene 22a.mp4"
  },
  "scene 22b": {
    file: "scene 22b.mp4"
  },
  "scene 22c": {
    file: "scene 22c.mp4"
  }
};

const DETECTIVE_PROGRESS = {
  "scene 1": 1,
  "scene 2a": 2,
  "scene 2b": 2,
  "scene 2c": 2,
  "scene 3": 3,
  "scene 4": 4,
  "scene 5a": 5,
  "scene 5b": 5,
  "scene 5c": 5,
  "scene 6": 6,
  "scene 7A": 7,
  "scene 7b": 7,
  "scene 7c": 7,
  "scene 8": 8,
  "scene 9": 9,
  "scene 10a": 10,
  "scene 10b": 10,
  "scene 10c": 10,
  "scene 11": 11,
  "scene 12": 12,
  "scene 13a": 13,
  "scene 13b": 13,
  "scene 13c": 13,
  "scene 14": 14,
  "scene 16": 15,
  "scene 16a": 16,
  "scene 16b": 16,
  "scene 16c": 16,
  "scene 17": 17,
  "scene 18": 18,
  "scene 19a": 19,
  "scene 19b": 19,
  "scene 19c": 19,
  "scene 20": 20,
  "scene 21": 21,
  "scene 22a": 22,
  "scene 22b": 22,
  "scene 22c": 22
};

const CLUB_SCENES = {
  "scene 1": {
    file: "scene 1.mp4",
    choices: [
      { key: 1, text: "\"Yeah, give me all of them.\"", next: "scene 2a" },
      { key: 2, text: "\"Maybe half. I don't want to lose control.\"", next: "scene 2b" },
      { key: 3, text: "\"You take some first.\"", next: "scene 2c" }
    ]
  },
  "scene 2a": {
    file: "scene 2a.mp4",
    next: "scene 3"
  },
  "scene 2b": {
    file: "scene 2b.mp4",
    next: "scene 3"
  },
  "scene 2c": {
    file: "scene 2c.mp4",
    next: "scene 3"
  },
  "scene 3": {
    file: "scene 3.mp4",
    choices: [
      { key: 1, text: "Go deeper into the dance floor", next: "scene 4a" },
      { key: 2, text: "Go to the bar and ask for water", next: "scene 4b" },
      { key: 3, text: "Look for the friend immediately", next: "scene 4c" }
    ]
  },
  "scene 4a": {
    file: "scene 4a.mp4",
    next: "scene 5"
  },
  "scene 4b": {
    file: "scene 4b.mp4",
    next: "scene 5"
  },
  "scene 4c": {
    file: "scene 4c.mp4",
    next: "scene 5"
  },
  "scene 5": {
    file: "scene 5.mp4",
    choices: [
      { key: 1, text: "Speak to the reflection", next: "scene 6a" },
      { key: 2, text: "Smash the mirror", next: "scene 6b" },
      { key: 3, text: "Leave immediately and find the friend", next: "scene 6c" }
    ]
  },
  "scene 6a": {
    file: "scene 6a.mp4",
    next: "scene 7"
  },
  "scene 6b": {
    file: "scene 6b.mp4",
    next: "scene 7"
  },
  "scene 6c": {
    file: "scene 6c.mp4",
    next: "scene 7"
  },
  "scene 7": {
    file: "scene 7.mp4",
    choices: [
      { key: 1, text: "\"Don't mess with me. I remember everything.\"", next: "scene 8a" },
      { key: 2, text: "\"Then who brought me here?\"", next: "scene 8b" },
      { key: 3, text: "\"You're not my friend.\"", next: "scene 8c" }
    ]
  },
  "scene 8a": {
    file: "scene 8a.mp4",
    next: "scene 9"
  },
  "scene 8b": {
    file: "scene 8b.mp4",
    next: "scene 9"
  },
  "scene 8c": {
    file: "scene 8c.mp4",
    next: "scene 9"
  },
  "scene 9": {
    file: "scene 9.mp4",
    choices: [
      { key: 1, text: "Believe the screen", next: "scene 10a" },
      { key: 2, text: "Smash the screen", next: "scene 10b" },
      { key: 3, text: "Ask the woman who she is", next: "scene 10c" }
    ]
  },
  "scene 10a": {
    file: "scene 10a.mp4",
    next: "scene 11"
  },
  "scene 10b": {
    file: "scene 10b.mp4",
    fallbackFiles: ["cene 10b.mp4"],
    next: "scene 11"
  },
  "scene 10c": {
    file: "scene 10c.mp4",
    next: "scene 11"
  },
  "scene 11": {
    file: "scene 11.mp4",
    choices: [
      { key: 1, text: "\"Take me to the truth.\"", next: "scene 12a" },
      { key: 2, text: "\"I want out. Right now.\"", next: "scene 12b" },
      { key: 3, text: "\"What are you really?\"", next: "scene 12c" }
    ]
  },
  "scene 12a": {
    file: "scene 12a.mp4",
    next: "scene 13"
  },
  "scene 12b": {
    file: "scene 12b.mp4",
    next: "scene 13"
  },
  "scene 12c": {
    file: "scene 12c.mp4",
    next: "scene 13"
  },
  "scene 13": {
    file: "scene 13.mp4",
    choices: [
      { key: 1, text: "\"Wake me up.\"", next: "scene 14a" },
      { key: 2, text: "\"Show me what I forgot.\"", next: "scene 14b" },
      { key: 3, text: "\"If this is me, prove it.\"", next: "scene 14c" }
    ]
  },
  "scene 14a": {
    file: "scene 14a.mp4",
    endingResolver: true
  },
  "scene 14b": {
    file: "scene 14b.mp4",
    endingResolver: true
  },
  "scene 14c": {
    file: "scene 14c.mp4",
    endingResolver: true
  },
  "scene 15a": {
    file: "scene 15a.mp4"
  },
  "scene 15b": {
    file: "scene 15b.mp4"
  },
  "scene 15c": {
    file: "scene 15c.mp4"
  }
};

const CLUB_PROGRESS = {
  "scene 1": 1,
  "scene 2a": 2,
  "scene 2b": 2,
  "scene 2c": 2,
  "scene 3": 3,
  "scene 4a": 4,
  "scene 4b": 4,
  "scene 4c": 4,
  "scene 5": 5,
  "scene 6a": 6,
  "scene 6b": 6,
  "scene 6c": 6,
  "scene 7": 7,
  "scene 8a": 8,
  "scene 8b": 8,
  "scene 8c": 8,
  "scene 9": 9,
  "scene 10a": 10,
  "scene 10b": 10,
  "scene 10c": 10,
  "scene 11": 11,
  "scene 12a": 12,
  "scene 12b": 12,
  "scene 12c": 12,
  "scene 13": 13,
  "scene 14a": 14,
  "scene 14b": 14,
  "scene 14c": 14,
  "scene 15a": 15,
  "scene 15b": 15,
  "scene 15c": 15
};

const EPISODES = {
  detective: {
    id: "detective",
    title: "The Detective",
    seasonLabel: "Season 1 - The Detective",
    menuLabel: "Season 1",
    menuCopy: "Launches the fully authored detective episode from its opening clip.",
    startScene: "scene 1",
    poster: "posters/detective.jpg",
    totalBeats: 22,
    videoRoots: ["Detective", "video/Detective", "video", "."],
    scenes: DETECTIVE_SCENES,
    progress: DETECTIVE_PROGRESS,
    finalScenes: new Set(["scene 22a", "scene 22b", "scene 22c"])
  },
  club: {
    id: "club",
    title: "The Club",
    seasonLabel: "Season 2 - The Club",
    menuLabel: "Season 2",
    menuCopy: "Launches the fully authored Club episode with hidden psychological ending resolution.",
    startScene: "scene 1",
    poster: "posters/club.jpg",
    totalBeats: 15,
    videoRoots: ["Club", "video/Club", "video", "."],
    scenes: CLUB_SCENES,
    progress: CLUB_PROGRESS,
    finalScenes: new Set(["scene 15a", "scene 15b", "scene 15c"])
  }
};

const CLUB_CHOICE_EFFECTS = {
  "scene 1": {
    1: { denial: 1 },
    2: { surrender: 1 },
    3: { curiosity: 1 }
  },
  "scene 3": {
    1: { denial: 1 },
    2: { surrender: 1 },
    3: { curiosity: 1 }
  },
  "scene 5": {
    1: { curiosity: 1 },
    2: { denial: 1 },
    3: { surrender: 1 }
  },
  "scene 7": {
    1: { denial: 1 },
    2: { curiosity: 1 },
    3: { surrender: 1 }
  },
  "scene 9": {
    1: { surrender: 2 },
    2: { denial: 2 },
    3: { curiosity: 2 }
  },
  "scene 11": {
    1: { curiosity: 2 },
    2: { denial: 2 },
    3: { curiosity: 1, surrender: 1 }
  },
  "scene 13": {
    1: { surrender: 2 },
    2: { curiosity: 2 },
    3: { denial: 2 }
  }
};

const CLUB_ENDING_WEIGHTS = {
  "scene 14a": { surrender: 1 },
  "scene 14b": { curiosity: 1 },
  "scene 14c": { denial: 1 }
};

const video = document.getElementById("scene-video");
const appSeasonLabel = document.getElementById("app-season-label");
const sceneIdLabel = document.getElementById("scene-id");
const sceneModeLabel = document.getElementById("scene-mode");
const hudKicker = document.getElementById("hud-kicker");
const hudHeadline = document.getElementById("hud-headline");
const hudCopy = document.getElementById("hud-copy");
const progressCopy = document.getElementById("progress-copy");
const progressFill = document.getElementById("progress-fill");
const inputStatus = document.getElementById("input-status");
const pauseButton = document.getElementById("pause-button");
const splitBanner = document.getElementById("split-banner");
const screenChoiceOverlay = document.getElementById("screen-choice-overlay");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");
const choiceList = document.getElementById("choice-list");
const decisionFeed = document.getElementById("decision-feed");
const focusFeed = document.getElementById("focus-feed");
const votePanel = document.getElementById("vote-panel");
const playerOneVote = document.getElementById("player-1-vote");
const playerTwoVote = document.getElementById("player-2-vote");
const decisionStatus = document.getElementById("decision-status");
const controlHint = document.getElementById("control-hint");
const introScreen = document.getElementById("intro-screen");
const menuOverlayLabel = document.getElementById("menu-overlay-label");
const menuCopy = document.getElementById("menu-copy");
const menuSelectedTitle = document.getElementById("menu-selected-title");
const menuSelectedCopy = document.getElementById("menu-selected-copy");
const episodeCards = Array.from(document.querySelectorAll(".episode-card"));
const pauseScreen = document.getElementById("pause-screen");
const pauseMessage = document.getElementById("pause-message");
const endScreen = document.getElementById("end-screen");
const endOverlayLabel = document.getElementById("end-overlay-label");
const endTitle = document.getElementById("end-title");
const endCopy = document.getElementById("end-copy");
const errorScreen = document.getElementById("error-screen");
const errorMessage = document.getElementById("error-message");
const startButton = document.getElementById("start-button");
const continueButton = document.getElementById("continue-button");
const pauseRestartButton = document.getElementById("pause-restart-button");
const restartButton = document.getElementById("restart-button");
const retryButton = document.getElementById("retry-button");

const state = {
  selectedEpisodeId: "detective",
  currentSceneId: null,
  episodeMindState: {
    surrender: 0,
    denial: 0,
    curiosity: 0,
    finalChoiceKey: null
  },
  votes: { 1: null, 2: null },
  focusChoice: { 1: 1, 2: 1 },
  waitingForVotes: false,
  resolvingChoice: false,
  selectedChoiceKey: null,
  randomResolution: false,
  loadToken: 0,
  resolveTimer: null,
  pendingNextSceneId: null,
  resolveRemainingMs: 0,
  resolveEndsAt: 0,
  started: false,
  isPaused: false,
  pauseWasPlaying: false,
  resumePlaybackOnUnpause: false,
  gamepadAssignments: { 1: null, 2: null },
  gamepadSnapshot: {},
  gamepadSignature: "",
  lastInputMethod: "mouse"
};

function isOverlayVisible(element) {
  return !element.hidden && element.classList.contains("is-visible");
}

function setOverlayVisibility(element, visible) {
  if (visible) {
    element.hidden = false;
    requestAnimationFrame(() => {
      element.classList.add("is-visible");
    });
    return;
  }

  element.classList.remove("is-visible");
  window.setTimeout(() => {
    if (!element.classList.contains("is-visible")) {
      element.hidden = true;
    }
  }, 240);
}

function showLoading(message) {
  loadingText.textContent = message;
  loadingOverlay.classList.add("is-visible");
}

function hideLoading() {
  loadingOverlay.classList.remove("is-visible");
}

function clearChoiceTimer() {
  if (state.resolveTimer) {
    window.clearTimeout(state.resolveTimer);
    state.resolveTimer = null;
  }

  state.pendingNextSceneId = null;
  state.resolveRemainingMs = 0;
  state.resolveEndsAt = 0;
}

function resetEpisodeMindState() {
  state.episodeMindState = {
    surrender: 0,
    denial: 0,
    curiosity: 0,
    finalChoiceKey: null
  };
}

function getCurrentEpisode() {
  return EPISODES[state.selectedEpisodeId];
}

function getCurrentScenes() {
  return getCurrentEpisode().scenes;
}

function getCurrentScene() {
  return getCurrentScenes()[state.currentSceneId];
}

function isFinalScene(sceneId) {
  return getCurrentEpisode().finalScenes.has(sceneId);
}

function getBeatNumber(sceneId) {
  return getCurrentEpisode().progress[sceneId] || 0;
}

function getChoiceText(choice) {
  if (!choice) {
    return "";
  }

  return choice.text || `Option ${choice.key}`;
}

function applyMindDelta(delta) {
  Object.entries(delta).forEach(([key, amount]) => {
    state.episodeMindState[key] += amount;
  });
}

function recordEpisodeChoiceOutcome(sceneId, choiceKey) {
  if (state.selectedEpisodeId !== "club") {
    return;
  }

  const delta = CLUB_CHOICE_EFFECTS[sceneId] && CLUB_CHOICE_EFFECTS[sceneId][choiceKey];
  if (delta) {
    applyMindDelta(delta);
  }

  if (sceneId === "scene 13") {
    state.episodeMindState.finalChoiceKey = choiceKey;
  }
}

function recordEpisodeSceneCompletion(sceneId) {
  if (state.selectedEpisodeId !== "club") {
    return;
  }

  const delta = CLUB_ENDING_WEIGHTS[sceneId];
  if (delta) {
    applyMindDelta(delta);
  }
}

function resolveEpisodeEndingScene(sceneId) {
  if (state.selectedEpisodeId !== "club") {
    return null;
  }

  recordEpisodeSceneCompletion(sceneId);

  const { surrender, denial, curiosity, finalChoiceKey } = state.episodeMindState;

  if (curiosity > surrender && curiosity > denial) {
    return "scene 15c";
  }

  if (surrender > curiosity && surrender > denial) {
    return "scene 15a";
  }

  if (denial > curiosity && denial > surrender) {
    return "scene 15b";
  }

  if (finalChoiceKey === 1) {
    return "scene 15a";
  }

  if (finalChoiceKey === 3) {
    return "scene 15b";
  }

  return "scene 15c";
}

function updateEpisodeChrome() {
  const episode = getCurrentEpisode();
  const beat = getBeatNumber(state.currentSceneId);

  appSeasonLabel.textContent = state.started ? episode.seasonLabel : "Select Episode";
  document.title = `Artificial Skin | ${episode.seasonLabel}`;
  menuOverlayLabel.textContent = episode.seasonLabel;
  endOverlayLabel.textContent = episode.title;
  endTitle.textContent = `${episode.title} Complete`;
  endCopy.textContent = `${episode.title} is finished.`;
  progressCopy.textContent = `Beat ${beat} / ${episode.totalBeats}`;
}

function updateMenuSelection() {
  const episode = getCurrentEpisode();

  episodeCards.forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.episode === state.selectedEpisodeId);
  });

  menuOverlayLabel.textContent = episode.seasonLabel;
  menuCopy.textContent = `Select a series card, then begin ${episode.title}. Poster images are pulled from the real opening clips.`;
  menuSelectedTitle.textContent = episode.title;
  menuSelectedCopy.textContent = episode.menuCopy;
  startButton.textContent = `Begin ${episode.title}`;
}

function selectEpisode(episodeId) {
  if (!EPISODES[episodeId]) {
    return;
  }

  state.selectedEpisodeId = episodeId;
  updateMenuSelection();
  updateEpisodeChrome();
  updateSceneHud();
  updateFocusFeed();
}

function handleEpisodeCardClick(event) {
  const card = event.target.closest(".episode-card");
  if (!card) {
    return;
  }

  selectEpisode(card.dataset.episode);
}

function getChoiceByKey(scene, choiceKey) {
  if (!scene || !scene.choices) {
    return null;
  }

  return scene.choices.find((choice) => choice.key === choiceKey) || null;
}

function setDecisionMessage(message) {
  decisionStatus.textContent = message;
  decisionFeed.textContent = message;
}

function setSplitBanner(message) {
  splitBanner.textContent = message;
  splitBanner.classList.toggle("is-visible", Boolean(message));
}

function refreshBodyState() {
  const scene = getCurrentScene();
  let mode = "idle";

  if (state.isPaused) {
    mode = "paused";
  } else if (isOverlayVisible(errorScreen)) {
    mode = "error";
  } else if (isOverlayVisible(endScreen)) {
    mode = "complete";
  } else if (state.resolvingChoice) {
    mode = "resolving";
  } else if (state.waitingForVotes) {
    mode = "choice";
  } else if (state.currentSceneId && isFinalScene(state.currentSceneId)) {
    mode = "ending";
  } else if (scene) {
    mode = "auto";
  }

  document.body.dataset.sceneState = mode;
}

function updateInputPrompts() {
  const gamepads = getConnectedGamepads();
  const padCount = gamepads.length;

  if (padCount === 0) {
    inputStatus.textContent = "Mouse and keyboard ready. Connect 1-2 gamepads for direct X / Y / B voting and Start-to-pause control.";
  } else if (padCount === 1) {
    inputStatus.textContent = "1 gamepad connected. It is mapped to Player 1 while Player 2 can use mouse or keyboard.";
  } else {
    inputStatus.textContent = `${padCount} gamepads connected. The first two are mapped to Player 1 and Player 2.`;
  }

  controlHint.textContent = "P1: 1 / 2 / 3 or A / D then W. P2: J / K / L, numpad, or arrows then Enter. Gamepad: X = 1, Y = 2, B = 3, Start = Pause.";
}

function buildChoiceHudCopy(scene) {
  const describePlayer = (player) => {
    const voteChoice = getChoiceByKey(scene, state.votes[player]);
    const focusChoice = getChoiceByKey(scene, state.focusChoice[player]) || scene.choices[0];

    if (voteChoice) {
      return `P${player} locked "${getChoiceText(voteChoice)}"`;
    }

    return `P${player} aiming "${getChoiceText(focusChoice)}"`;
  };

  return `${describePlayer(1)}. ${describePlayer(2)}.`;
}

function getHudDescriptor(scene) {
  const episode = getCurrentEpisode();

  if (!state.started) {
    return {
      kicker: "Casefile online",
      headline: episode.seasonLabel,
      copy: "Select a series card and begin the chosen episode."
    };
  }

  const beat = getBeatNumber(state.currentSceneId);
  const base = { kicker: `Beat ${beat} / ${episode.totalBeats}` };

  if (state.isPaused) {
    return {
      ...base,
      headline: "Paused",
      copy: "Playback, branching timers, and scene transitions are on hold until you continue."
    };
  }

  if (state.resolvingChoice && scene && scene.choices) {
    const chosenChoice = getChoiceByKey(scene, state.selectedChoiceKey);
    const voteOne = getChoiceByKey(scene, state.votes[1]);
    const voteTwo = getChoiceByKey(scene, state.votes[2]);

    if (voteOne && voteTwo && voteOne.key !== voteTwo.key) {
      return {
        ...base,
        headline: "Split Resolution",
        copy: `Split decision between "${getChoiceText(voteOne)}" and "${getChoiceText(voteTwo)}". Randomly selecting one of the two chosen paths.`
      };
    }

    return {
      ...base,
      headline: "Consensus Locked",
      copy: chosenChoice ? `Both players aligned on "${getChoiceText(chosenChoice)}". Loading the next clip.` : "Both players aligned. Loading the next clip."
    };
  }

  if (state.waitingForVotes && scene && scene.choices) {
    return {
      ...base,
      headline: "Decision Point",
      copy: buildChoiceHudCopy(scene)
    };
  }

  if (scene && isFinalScene(state.currentSceneId)) {
    return {
      ...base,
      headline: "Ending Sequence",
      copy: "The final consequence is playing out. The season overlay appears when this clip ends."
    };
  }

  if (scene && scene.choices) {
    return {
      ...base,
      headline: "Choice Scene Incoming",
      copy: "This clip will pause on a decision point when it ends."
    };
  }

  if (scene && scene.next) {
    return {
      ...base,
      headline: "Branch Playback",
      copy: "This clip advances automatically when it ends."
    };
  }

  return {
    ...base,
    headline: "Season Complete",
    copy: `${getCurrentEpisode().title} is complete.`
  };
}

function updateSceneHud() {
  const scene = getCurrentScene();
  const descriptor = getHudDescriptor(scene);
  const beat = getBeatNumber(state.currentSceneId);
  const episode = getCurrentEpisode();
  const canPause = state.started && Boolean(state.currentSceneId) && !isOverlayVisible(introScreen) && !isOverlayVisible(endScreen) && !isOverlayVisible(errorScreen);

  sceneIdLabel.textContent = state.currentSceneId || "scene 1";

  if (!state.started) {
    sceneModeLabel.textContent = "Press Begin Episode";
  } else if (state.isPaused) {
    sceneModeLabel.textContent = "Paused";
  } else if (state.resolvingChoice) {
    sceneModeLabel.textContent = "Resolving votes";
  } else if (state.waitingForVotes) {
    sceneModeLabel.textContent = "Awaiting both votes";
  } else if (scene && isFinalScene(state.currentSceneId)) {
    sceneModeLabel.textContent = "Final ending";
  } else if (scene && scene.choices) {
    sceneModeLabel.textContent = "Choice scene";
  } else if (scene && scene.next) {
    sceneModeLabel.textContent = "Automatic scene";
  } else if (state.started) {
    sceneModeLabel.textContent = "Season complete";
  }

  hudKicker.textContent = descriptor.kicker;
  hudHeadline.textContent = descriptor.headline;
  hudCopy.textContent = descriptor.copy;
  progressCopy.textContent = `Beat ${beat} / ${episode.totalBeats}`;
  progressFill.style.width = `${(beat / episode.totalBeats) * 100}%`;
  pauseButton.disabled = !canPause;
  pauseButton.textContent = state.isPaused ? "Continue" : "Pause";
  pauseMessage.textContent = state.resolvingChoice
    ? "Playback is paused and the branch resolution timer is frozen."
    : state.waitingForVotes
      ? "The investigation is paused at a decision point. No votes or timers will advance until you continue."
      : "Playback, branch resolution, and scene transitions are paused.";

  updateEpisodeChrome();
  updateInputPrompts();
  refreshBodyState();
}

function updateFocusFeed() {
  const scene = getCurrentScene();

  if (!scene) {
    focusFeed.textContent = "Player focus indicators will activate during choice scenes.";
    return;
  }

  if (state.isPaused) {
    focusFeed.textContent = "Paused. Scene inputs are frozen until you continue.";
    return;
  }

  if (!scene.choices && isFinalScene(state.currentSceneId)) {
    focusFeed.textContent = "Final ending in progress. No votes are required in this clip.";
    return;
  }

  if (!scene.choices) {
    focusFeed.textContent = "Automatic clip in progress. Voting resumes at the next decision point.";
    return;
  }

  const playerMessage = (player) => {
    const voteChoice = getChoiceByKey(scene, state.votes[player]);

    if (voteChoice) {
      return `P${player} locked Choice ${voteChoice.key}`;
    }

    return `P${player} focus on Choice ${state.focusChoice[player]}`;
  };

  focusFeed.textContent = `${playerMessage(1)}. ${playerMessage(2)}.`;
}

function updateVoteReadout() {
  setVoteCopy(playerOneVote, state.votes[1]);
  setVoteCopy(playerTwoVote, state.votes[2]);
}

function setVoteCopy(element, value) {
  if (value == null) {
    element.textContent = "Pending";
    element.classList.add("is-pending");
    return;
  }

  element.textContent = `Choice ${value}`;
  element.classList.remove("is-pending");
}

function resetVotes() {
  state.votes = { 1: null, 2: null };
  state.waitingForVotes = false;
  state.resolvingChoice = false;
  state.selectedChoiceKey = null;
  state.randomResolution = false;
  updateVoteReadout();
}

function getSceneSources(file) {
  return getCurrentEpisode().videoRoots.map((root) => root === "." ? file : `${root}/${file}`);
}

function loadSceneVideo(sceneOrFile) {
  state.loadToken += 1;
  const loadToken = state.loadToken;
  const primaryFile = typeof sceneOrFile === "string" ? sceneOrFile : sceneOrFile.file;
  const fallbackFiles = typeof sceneOrFile === "string" ? [] : (sceneOrFile.fallbackFiles || []);
  const candidates = [primaryFile, ...fallbackFiles].flatMap((file) => getSceneSources(file));

  return new Promise((resolve, reject) => {
    let candidateIndex = 0;

    const tryNextSource = () => {
      if (loadToken !== state.loadToken) {
        return;
      }

      if (candidateIndex >= candidates.length) {
        reject(new Error(`Unable to load ${primaryFile}`));
        return;
      }

      const source = encodeURI(candidates[candidateIndex]);
      candidateIndex += 1;

      const cleanup = () => {
        video.removeEventListener("loadeddata", handleLoaded);
        video.removeEventListener("error", handleError);
      };

      const handleLoaded = () => {
        cleanup();
        resolve(source);
      };

      const handleError = () => {
        cleanup();
        tryNextSource();
      };

      video.addEventListener("loadeddata", handleLoaded, { once: true });
      video.addEventListener("error", handleError, { once: true });
      video.src = source;
      video.load();
    };

    tryNextSource();
  });
}

function setDefaultFocus(scene) {
  if (!scene || !scene.choices || !scene.choices.length) {
    return;
  }

  const defaultChoiceKey = scene.choices[0].key;
  state.focusChoice = {
    1: state.votes[1] ?? defaultChoiceKey,
    2: state.votes[2] ?? defaultChoiceKey
  };
}

function renderScreenChoiceOverlay(scene) {
  if (!scene || !scene.choices) {
    screenChoiceOverlay.hidden = true;
    screenChoiceOverlay.innerHTML = "";
    return;
  }

  const gamepadLabels = { 1: "X", 2: "Y", 3: "B" };

  screenChoiceOverlay.innerHTML = scene.choices.map((choice) => `
    <article class="screen-choice-card" data-choice="${choice.key}">
      <div class="screen-choice-header">
        <span class="screen-choice-label">Option ${choice.key}</span>
      <div class="screen-choice-keys">
          <span>${choice.key}</span>
          <span>${gamepadLabels[choice.key]}</span>
        </div>
      </div>
      <p class="screen-choice-text">${getChoiceText(choice)}</p>
    </article>
  `).join("");

  screenChoiceOverlay.hidden = false;
}

function updateChoiceVisualState() {
  const scene = getCurrentScene();
  const cards = choiceList.querySelectorAll(".choice-card");
  const buttons = choiceList.querySelectorAll(".choice-vote");
  const screenCards = screenChoiceOverlay.querySelectorAll(".screen-choice-card");

  cards.forEach((card) => {
    const choiceKey = Number(card.dataset.choice);
    const wasVoted = state.votes[1] === choiceKey || state.votes[2] === choiceKey;

    card.classList.toggle("is-voted", wasVoted);
    card.classList.toggle("is-selected", state.selectedChoiceKey === choiceKey);
    card.classList.toggle("is-random", state.randomResolution && state.selectedChoiceKey === choiceKey);
    card.classList.toggle("is-focused-p1", scene && scene.choices && state.focusChoice[1] === choiceKey && state.waitingForVotes && !state.resolvingChoice);
    card.classList.toggle("is-focused-p2", scene && scene.choices && state.focusChoice[2] === choiceKey && state.waitingForVotes && !state.resolvingChoice);
  });

  buttons.forEach((button) => {
    const player = Number(button.dataset.player);
    const choiceKey = Number(button.dataset.choice);
    const isLocked = state.votes[player] === choiceKey;

    button.classList.toggle("is-locked", isLocked);
    button.classList.toggle("is-focused-player-1", player === 1 && state.focusChoice[1] === choiceKey && state.waitingForVotes && !state.resolvingChoice);
    button.classList.toggle("is-focused-player-2", player === 2 && state.focusChoice[2] === choiceKey && state.waitingForVotes && !state.resolvingChoice);
    button.disabled = state.resolvingChoice;
    button.setAttribute("aria-pressed", isLocked ? "true" : "false");
  });

  screenCards.forEach((card) => {
    const choiceKey = Number(card.dataset.choice);
    const wasVoted = state.votes[1] === choiceKey || state.votes[2] === choiceKey;

    card.classList.toggle("is-voted", wasVoted);
    card.classList.toggle("is-selected", state.selectedChoiceKey === choiceKey);
    card.classList.toggle("is-random", state.randomResolution && state.selectedChoiceKey === choiceKey);
    card.classList.toggle("is-focused-p1", scene && scene.choices && state.focusChoice[1] === choiceKey && state.waitingForVotes && !state.resolvingChoice);
    card.classList.toggle("is-focused-p2", scene && scene.choices && state.focusChoice[2] === choiceKey && state.waitingForVotes && !state.resolvingChoice);
  });

  updateFocusFeed();
}

function renderChoices(scene) {
  if (!scene || !scene.choices) {
    choiceList.hidden = true;
    votePanel.hidden = true;
    choiceList.innerHTML = "";
    updateFocusFeed();
    return;
  }

  setDefaultFocus(scene);
  renderScreenChoiceOverlay(scene);

  choiceList.innerHTML = scene.choices.map((choice, index) => `
    <article class="choice-card" data-choice="${choice.key}" style="--card-index:${index};">
      <span class="choice-number">${choice.key}</span>
      <p class="choice-text">${getChoiceText(choice)}</p>
      <div class="choice-actions">
        <button class="choice-vote" type="button" data-player="1" data-choice="${choice.key}">P1 Vote</button>
        <button class="choice-vote" type="button" data-player="2" data-choice="${choice.key}">P2 Vote</button>
      </div>
    </article>
  `).join("");

  choiceList.hidden = false;
  votePanel.hidden = false;
  updateChoiceVisualState();
}

function hideChoices() {
  choiceList.hidden = true;
  votePanel.hidden = true;
  choiceList.innerHTML = "";
  screenChoiceOverlay.hidden = true;
  screenChoiceOverlay.innerHTML = "";
}

function scheduleSceneTransition(nextSceneId, delayMs) {
  if (!nextSceneId) {
    return;
  }

  clearChoiceTimer();
  state.pendingNextSceneId = nextSceneId;
  state.resolveRemainingMs = delayMs;
  state.resolveEndsAt = performance.now() + delayMs;

  if (state.isPaused) {
    return;
  }

  state.resolveTimer = window.setTimeout(() => {
    const sceneId = state.pendingNextSceneId;
    clearChoiceTimer();

    if (sceneId) {
      queueNextScene(sceneId);
    }
  }, delayMs);
}

async function resumeCurrentVideoPlayback() {
  if (state.isPaused || state.waitingForVotes || state.resolvingChoice || isOverlayVisible(errorScreen) || isOverlayVisible(endScreen)) {
    return false;
  }

  try {
    await video.play();
    state.resumePlaybackOnUnpause = false;
    return true;
  } catch (error) {
    showPlaybackError(error);
    return false;
  }
}

function canTogglePause() {
  return state.started && Boolean(state.currentSceneId) && !isOverlayVisible(introScreen) && !isOverlayVisible(endScreen) && !isOverlayVisible(errorScreen);
}

function pauseGame() {
  if (!canTogglePause() || state.isPaused) {
    return;
  }

  state.isPaused = true;
  state.pauseWasPlaying = !video.paused && !video.ended;

  if (state.pauseWasPlaying) {
    video.pause();
  }

  if (state.resolveTimer && state.pendingNextSceneId) {
    state.resolveRemainingMs = Math.max(0, state.resolveEndsAt - performance.now());
    window.clearTimeout(state.resolveTimer);
    state.resolveTimer = null;
  }

  setDecisionMessage("Paused. Continue to resume the investigation.");
  setOverlayVisibility(pauseScreen, true);
  updateSceneHud();
  updateFocusFeed();
}

function resumeGame() {
  if (!state.isPaused) {
    return;
  }

  state.isPaused = false;
  setOverlayVisibility(pauseScreen, false);

  if (state.pendingNextSceneId) {
    scheduleSceneTransition(state.pendingNextSceneId, Math.max(50, state.resolveRemainingMs || 0));
    setDecisionMessage("Resuming branch resolution.");
  } else if (state.resumePlaybackOnUnpause || state.pauseWasPlaying) {
    setDecisionMessage("Resuming playback.");
    resumeCurrentVideoPlayback();
  } else if (state.waitingForVotes) {
    setDecisionMessage("Decision point resumed. Both players can vote.");
  } else {
    setDecisionMessage("Investigation resumed.");
  }

  state.pauseWasPlaying = false;
  updateSceneHud();
  updateFocusFeed();
}

function togglePause() {
  if (state.isPaused) {
    resumeGame();
    return;
  }

  pauseGame();
}

function focusChoice(player, choiceKey, inputMethod) {
  const scene = getCurrentScene();

  if (!scene || !scene.choices || state.resolvingChoice || state.isPaused) {
    return;
  }

  state.focusChoice[player] = choiceKey;
  state.lastInputMethod = inputMethod;
  updateChoiceVisualState();
  updateSceneHud();
}

function moveFocus(player, direction, inputMethod) {
  const scene = getCurrentScene();

  if (!scene || !scene.choices || !state.waitingForVotes || state.resolvingChoice || state.isPaused) {
    return;
  }

  const currentIndex = scene.choices.findIndex((choice) => choice.key === state.focusChoice[player]);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const nextIndex = (safeIndex + direction + scene.choices.length) % scene.choices.length;

  state.focusChoice[player] = scene.choices[nextIndex].key;
  state.lastInputMethod = inputMethod;
  updateChoiceVisualState();
  updateSceneHud();
}

function confirmFocusedChoice(player, inputMethod) {
  const scene = getCurrentScene();

  if (!scene || !scene.choices || !state.waitingForVotes || state.resolvingChoice || state.isPaused) {
    return;
  }

  registerVote(player, state.focusChoice[player], inputMethod);
}

function registerVote(player, choiceKey, inputMethod) {
  const scene = getCurrentScene();

  if (!scene || !scene.choices || !state.waitingForVotes || state.resolvingChoice || state.isPaused) {
    return;
  }

  state.focusChoice[player] = choiceKey;
  state.votes[player] = choiceKey;
  state.lastInputMethod = inputMethod;
  updateVoteReadout();
  updateChoiceVisualState();
  updateSceneHud();

  const choice = getChoiceByKey(scene, choiceKey);

  if (state.votes[1] != null && state.votes[2] != null) {
    resolveSceneChoice();
  } else if (choice) {
    setDecisionMessage(`Player ${player} locked "${getChoiceText(choice)}". Waiting for both players to vote.`);
  } else {
    setDecisionMessage(`Player ${player} locked a vote. Waiting for both players to vote.`);
  }
}

function resolveSceneChoice() {
  const scene = getCurrentScene();

  if (!scene || !scene.choices) {
    return;
  }

  const choiceOne = state.votes[1];
  const choiceTwo = state.votes[2];
  const splitDecision = choiceOne !== choiceTwo;

  state.resolvingChoice = true;
  state.randomResolution = splitDecision;
  state.selectedChoiceKey = splitDecision
    ? (Math.random() < 0.5 ? choiceOne : choiceTwo)
    : choiceOne;
  const selectedChoice = getChoiceByKey(scene, state.selectedChoiceKey);
  recordEpisodeChoiceOutcome(state.currentSceneId, state.selectedChoiceKey);

  if (splitDecision) {
    setSplitBanner("Split decision...");
    setDecisionMessage("Split decision detected. Randomly selecting one of the two chosen options.");
  } else {
    setSplitBanner("");
    setDecisionMessage(selectedChoice ? `Consensus reached. "${getChoiceText(selectedChoice)}" locked.` : `Consensus reached. Choice ${state.selectedChoiceKey} locked.`);
  }

  updateChoiceVisualState();
  updateSceneHud();

  scheduleSceneTransition(selectedChoice ? selectedChoice.next : null, splitDecision ? 1500 : 950);
}

function enterVoteState(scene) {
  state.waitingForVotes = true;
  setDefaultFocus(scene);
  renderChoices(scene);
  setDecisionMessage("Votes will resolve after both players lock in.");
  updateSceneHud();
}

function showCompletion() {
  const episode = getCurrentEpisode();

  clearChoiceTimer();
  state.waitingForVotes = false;
  state.resolvingChoice = false;
  state.isPaused = false;
  state.pauseWasPlaying = false;
  state.resumePlaybackOnUnpause = false;
  video.pause();
  setSplitBanner("");
  hideChoices();
  hideLoading();
  setDecisionMessage(`${episode.title} complete.`);
  setOverlayVisibility(pauseScreen, false);
  setOverlayVisibility(endScreen, true);
  updateSceneHud();
  updateFocusFeed();
  window.requestAnimationFrame(updateSceneHud);
}

function showPlaybackError(error) {
  const isMissingClip = error && error.message && error.message.includes("Unable to load");
  const episode = getCurrentEpisode();

  video.pause();
  state.isPaused = false;
  state.pauseWasPlaying = false;
  state.resumePlaybackOnUnpause = false;
  showLoading("Playback halted");
  errorMessage.textContent = isMissingClip
    ? `Could not load ${getCurrentScene().file}. Keep the ${episode.title} clips in ${episode.videoRoots[0]}/ or move them into a matching video folder.`
    : "Playback was blocked by the browser. Press Retry Scene or use keyboard, mouse, or gamepad confirm to continue.";
  setDecisionMessage("Playback halted. Retry the current scene.");
  setOverlayVisibility(pauseScreen, false);
  setOverlayVisibility(errorScreen, true);
  updateSceneHud();
  window.requestAnimationFrame(updateSceneHud);
}

async function playCurrentScene() {
  const scene = getCurrentScene();

  if (!scene) {
    return;
  }

  clearChoiceTimer();
  state.resumePlaybackOnUnpause = false;
  state.pauseWasPlaying = false;
  resetVotes();
  hideChoices();
  setSplitBanner("");
  setOverlayVisibility(errorScreen, false);
  showLoading(`Loading ${state.currentSceneId}...`);
  setDecisionMessage(`Loading ${state.currentSceneId}...`);
  updateSceneHud();
  updateFocusFeed();

  try {
    await loadSceneVideo(scene);
    hideLoading();

    if (state.isPaused) {
      state.resumePlaybackOnUnpause = true;
      setDecisionMessage("Paused while loading. Continue to resume the clip.");
      updateSceneHud();
      updateFocusFeed();
      return;
    }

    const didResume = await resumeCurrentVideoPlayback();
    if (!didResume) {
      return;
    }

    if (isFinalScene(state.currentSceneId)) {
      setDecisionMessage("Final ending clip in progress.");
    } else if (scene.choices) {
      setDecisionMessage("Watch the clip. The vote opens when it ends.");
    } else {
      setDecisionMessage("Automatic clip in progress. The next scene loads when this one ends.");
    }

    updateSceneHud();
    updateFocusFeed();
  } catch (error) {
    showPlaybackError(error);
  }
}

function queueNextScene(nextSceneId) {
  state.currentSceneId = nextSceneId;
  playCurrentScene();
}

function restartGame() {
  const episode = getCurrentEpisode();

  clearChoiceTimer();
  resetEpisodeMindState();
  state.isPaused = false;
  state.pauseWasPlaying = false;
  state.resumePlaybackOnUnpause = false;
  setOverlayVisibility(endScreen, false);
  setOverlayVisibility(pauseScreen, false);
  setOverlayVisibility(errorScreen, false);
  state.currentSceneId = episode.startScene;
  setDecisionMessage(`Opening ${episode.title}.`);
  updateSceneHud();
  playCurrentScene();
}

function handleSceneEnded() {
  const scene = getCurrentScene();

  if (!scene || state.isPaused) {
    return;
  }

  if (scene.choices) {
    video.pause();
    enterVoteState(scene);
    return;
  }

  if (scene.endingResolver) {
    const endingSceneId = resolveEpisodeEndingScene(state.currentSceneId);
    setDecisionMessage("Resolving the ending route.");
    updateSceneHud();
    scheduleSceneTransition(endingSceneId, 700);
    return;
  }

  if (scene.next) {
    setDecisionMessage("Advancing to the next clip.");
    updateSceneHud();
    queueNextScene(scene.next);
    return;
  }

  showCompletion();
}

function handleChoiceClick(event) {
  if (state.isPaused) {
    return;
  }

  const button = event.target.closest(".choice-vote");
  if (!button) {
    return;
  }

  registerVote(Number(button.dataset.player), Number(button.dataset.choice), "mouse");
}

function handleChoicePointer(event) {
  if (state.isPaused) {
    return;
  }

  const button = event.target.closest(".choice-vote");
  if (!button) {
    return;
  }

  focusChoice(Number(button.dataset.player), Number(button.dataset.choice), "mouse");
}

function handleOverlayPrimaryAction() {
  if (isOverlayVisible(pauseScreen)) {
    resumeGame();
    return true;
  }

  if (isOverlayVisible(introScreen)) {
    beginEpisode();
    return true;
  }

  if (isOverlayVisible(endScreen)) {
    restartGame();
    return true;
  }

  if (isOverlayVisible(errorScreen)) {
    setOverlayVisibility(errorScreen, false);
    playCurrentScene();
    return true;
  }

  return false;
}

function handleKeydown(event) {
  if (["Escape", "KeyP"].includes(event.code) && (state.isPaused || canTogglePause())) {
    event.preventDefault();
    togglePause();
    return;
  }

  const overlayHandled = ["Enter", "Space"].includes(event.code) && handleOverlayPrimaryAction();
  if (overlayHandled) {
    event.preventDefault();
    return;
  }

  if (!state.waitingForVotes || state.resolvingChoice || state.isPaused) {
    return;
  }

  const directKeyMap = {
    Digit1: [1, 1],
    Digit2: [1, 2],
    Digit3: [1, 3],
    KeyJ: [2, 1],
    KeyK: [2, 2],
    KeyL: [2, 3],
    Numpad1: [2, 1],
    Numpad2: [2, 2],
    Numpad3: [2, 3]
  };

  const directVote = directKeyMap[event.code];
  if (directVote) {
    event.preventDefault();
    registerVote(directVote[0], directVote[1], "keyboard");
    return;
  }

  const navigationMap = {
    KeyA: () => moveFocus(1, -1, "keyboard"),
    KeyD: () => moveFocus(1, 1, "keyboard"),
    KeyW: () => confirmFocusedChoice(1, "keyboard"),
    ArrowLeft: () => moveFocus(2, -1, "keyboard"),
    ArrowRight: () => moveFocus(2, 1, "keyboard"),
    ArrowUp: () => confirmFocusedChoice(2, "keyboard"),
    Enter: () => confirmFocusedChoice(2, "keyboard")
  };

  const action = navigationMap[event.code];
  if (!action) {
    return;
  }

  event.preventDefault();
  action();
}

function beginEpisode() {
  if (state.started) {
    return;
  }

  state.started = true;
  state.isPaused = false;
  setOverlayVisibility(introScreen, false);
  restartGame();
}

function getConnectedGamepads() {
  if (typeof navigator.getGamepads !== "function") {
    return [];
  }

  return Array.from(navigator.getGamepads())
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);
}

function updateGamepadAssignments() {
  const connectedPads = getConnectedGamepads();
  const signature = connectedPads.map((gamepad) => gamepad.index).join(",");

  if (signature === state.gamepadSignature) {
    return;
  }

  state.gamepadSignature = signature;

  state.gamepadAssignments[1] = connectedPads[0] ? connectedPads[0].index : null;
  state.gamepadAssignments[2] = connectedPads[1] ? connectedPads[1].index : null;

  const connectedIndices = new Set(connectedPads.map((gamepad) => gamepad.index));
  Object.keys(state.gamepadSnapshot).forEach((index) => {
    if (!connectedIndices.has(Number(index))) {
      delete state.gamepadSnapshot[index];
    }
  });

  updateInputPrompts();
}

function getHorizontalIntent(gamepad) {
  if (gamepad.buttons[14] && gamepad.buttons[14].pressed) {
    return -1;
  }

  if (gamepad.buttons[15] && gamepad.buttons[15].pressed) {
    return 1;
  }

  const axis = gamepad.axes[0] || 0;
  if (Math.abs(axis) > 0.55) {
    return axis > 0 ? 1 : -1;
  }

  return 0;
}

function handleGamepadConfirm(player) {
  if (handleOverlayPrimaryAction()) {
    return;
  }

  confirmFocusedChoice(player, "gamepad");
}

function pollGamepads() {
  updateGamepadAssignments();

  const connectedPads = getConnectedGamepads();
  const byIndex = new Map(connectedPads.map((gamepad) => [gamepad.index, gamepad]));

  [1, 2].forEach((player) => {
    const assignedIndex = state.gamepadAssignments[player];
    if (assignedIndex == null) {
      return;
    }

    const gamepad = byIndex.get(assignedIndex);
    if (!gamepad) {
      return;
    }

    const snapshot = state.gamepadSnapshot[assignedIndex] || {
      horizontal: 0,
      confirm: false,
      optionOne: false,
      optionTwo: false,
      optionThree: false,
      pause: false
    };
    const horizontal = getHorizontalIntent(gamepad);
    const confirm = Boolean(gamepad.buttons[0] && gamepad.buttons[0].pressed);
    const optionOne = Boolean(gamepad.buttons[2] && gamepad.buttons[2].pressed);
    const optionTwo = Boolean(gamepad.buttons[3] && gamepad.buttons[3].pressed);
    const optionThree = Boolean(gamepad.buttons[1] && gamepad.buttons[1].pressed);
    const pause = Boolean(gamepad.buttons[9] && gamepad.buttons[9].pressed);

    if (pause && !snapshot.pause) {
      if (state.isPaused || canTogglePause()) {
        togglePause();
      } else {
        handleOverlayPrimaryAction();
      }
    }

    if (state.isPaused) {
      if (confirm && !snapshot.confirm) {
        handleOverlayPrimaryAction();
      }

      snapshot.horizontal = horizontal;
      snapshot.confirm = confirm;
      snapshot.optionOne = optionOne;
      snapshot.optionTwo = optionTwo;
      snapshot.optionThree = optionThree;
      snapshot.pause = pause;
      state.gamepadSnapshot[assignedIndex] = snapshot;
      return;
    }

    if (horizontal !== 0 && snapshot.horizontal !== horizontal) {
      moveFocus(player, horizontal, "gamepad");
    }

    if (optionOne && !snapshot.optionOne) {
      registerVote(player, 1, "gamepad");
    }

    if (optionTwo && !snapshot.optionTwo) {
      registerVote(player, 2, "gamepad");
    }

    if (optionThree && !snapshot.optionThree) {
      registerVote(player, 3, "gamepad");
    }

    if (confirm && !snapshot.confirm) {
      handleGamepadConfirm(player);
    }

    snapshot.horizontal = horizontal;
    snapshot.confirm = confirm;
    snapshot.optionOne = optionOne;
    snapshot.optionTwo = optionTwo;
    snapshot.optionThree = optionThree;
    snapshot.pause = pause;
    state.gamepadSnapshot[assignedIndex] = snapshot;
  });

  window.requestAnimationFrame(pollGamepads);
}

video.addEventListener("ended", handleSceneEnded);
choiceList.addEventListener("click", handleChoiceClick);
choiceList.addEventListener("mouseover", handleChoicePointer);
choiceList.addEventListener("focusin", handleChoicePointer);
episodeCards.forEach((card) => card.addEventListener("click", handleEpisodeCardClick));
document.addEventListener("keydown", handleKeydown);
window.addEventListener("gamepadconnected", updateGamepadAssignments);
window.addEventListener("gamepaddisconnected", updateGamepadAssignments);

startButton.addEventListener("click", beginEpisode);
pauseButton.addEventListener("click", togglePause);
continueButton.addEventListener("click", resumeGame);
pauseRestartButton.addEventListener("click", restartGame);
restartButton.addEventListener("click", restartGame);
retryButton.addEventListener("click", () => {
  setOverlayVisibility(errorScreen, false);
  playCurrentScene();
});

selectEpisode(state.selectedEpisodeId);
updateInputPrompts();
updateSceneHud();
updateFocusFeed();
setDecisionMessage("Episode standing by.");
window.requestAnimationFrame(pollGamepads);
