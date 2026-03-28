function createChoices(entries) {
  return entries.map(([key, text, next = null, extra = null]) => ({
    key,
    text,
    ...(next ? { next } : {}),
    ...(extra || {})
  }));
}

function createProgressMap(groups) {
  return groups.reduce((progressMap, [beat, ...sceneIds]) => {
    sceneIds.forEach((sceneId) => {
      progressMap[sceneId] = beat;
    });

    return progressMap;
  }, {});
}

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

const UNKNOWN_CHARACTER_CHOICES = createChoices([
  [1, "Kael", "right player 2", { fighter: "kael" }],
  [2, "Zyra", "right player 1", { fighter: "zyra" }]
]);

const UNKNOWN_ATTACK_CHOICES = createChoices([
  [1, "Power"],
  [2, "Speed"],
  [3, "Guard Break"]
]);

const UNKNOWN_SCENES = {
  "left player 1": {
    file: "left player 1.mp4",
    choices: UNKNOWN_CHARACTER_CHOICES,
    choicePlayers: [1],
    choiceResolver: "unknown-character-select",
    openChoicesOnLoad: true
  },
  "left player 2": {
    file: "left player 2.mp4",
    next: "scene 1-10"
  },
  "right player 1": {
    file: "right player 1.mp4",
    next: "left player 2"
  },
  "right player 2": {
    file: "right player 2.mp4",
    next: "scene 1-10"
  },
  "scene 1-10": {
    file: "Scene 1-10.mp4",
    choices: createChoices([
      [1, "I didn't choose this. Did you?", "scene 11a"],
      [2, "If you hesitate, they'll bury us both.", "scene 11b"],
      [3, "Maybe we kill the crowd's show before it starts.", "scene 11c"]
    ])
  },
  "scene 11a": {
    file: "scene 11a.mp4",
    next: "scene 12"
  },
  "scene 11b": {
    file: "scene 11b.mp4",
    next: "scene 12"
  },
  "scene 11c": {
    file: "scene 11c.mp4",
    next: "scene 12"
  },
  "scene 12": {
    file: "scene 12.mp4",
    choices: UNKNOWN_ATTACK_CHOICES,
    choiceResolver: "unknown-combat",
    combatResultScenes: {
      draw: "scene 13a draw",
      kael: "scene 13b kael wins",
      zyra: "scene 13c zyra wins"
    }
  },
  "scene 13a draw": {
    file: "scene 13a draw.mp4",
    next: "scene 14-18"
  },
  "scene 13b kael wins": {
    file: "scene 13b kael wins.mp4",
    next: "scene 14-18"
  },
  "scene 13c zyra wins": {
    file: "scene 13c zyra wins.mp4",
    next: "scene 14-18"
  },
  "scene 14-18": {
    file: "scene 14-18.mp4",
    choices: UNKNOWN_ATTACK_CHOICES,
    choiceResolver: "unknown-combat",
    combatResultScenes: {
      draw: "scene 19a draw",
      kael: "scene 19b kael wins",
      zyra: "scene 19c zyra wins"
    }
  },
  "scene 19a draw": {
    file: "scene 19a draw.mp4",
    next: "scene 20-23"
  },
  "scene 19b kael wins": {
    file: "scene 19b kael wins.mp4",
    next: "scene 20-23"
  },
  "scene 19c zyra wins": {
    file: "scene 19c zyra wins.mp4",
    next: "scene 20-23"
  },
  "scene 20-23": {
    file: "scene 20-23.mp4",
    choices: UNKNOWN_ATTACK_CHOICES,
    choiceResolver: "unknown-combat",
    combatResultScenes: {
      draw: "scene 25a draw",
      kael: "scene 25b kael wins",
      zyra: "scene 25c zyra wins"
    }
  },
  "scene 25a draw": {
    file: "scene 25a draw.mp4",
    next: "scene 26-28"
  },
  "scene 25b kael wins": {
    file: "scene 25b kael wins.mp4",
    next: "scene 26-28"
  },
  "scene 25c zyra wins": {
    file: "scene 25c zyra wins.mp4",
    next: "scene 26-28"
  },
  "scene 26-28": {
    file: "scene 26-28.mp4",
    choices: createChoices([
      [1, "Finish it. One of us leaves.", "scene 29a"],
      [2, "Use the drop. Feed the monster.", "scene 29b"],
      [3, "Forget the duel. Kill the emperor.", "scene 29c"]
    ])
  },
  "scene 29a": {
    file: "scene 29a.mp4",
    next: "scene 30"
  },
  "scene 29b": {
    file: "scene 29b.mp4",
    next: "scene 30"
  },
  "scene 29c": {
    file: "scene 29c.mp4",
    next: "scene 30"
  },
  "scene 30": {
    file: "scene 30.mp4",
    next: "scene 31"
  },
  "scene 31": {
    file: "scene 31.mp4",
    choices: UNKNOWN_ATTACK_CHOICES,
    choiceResolver: "unknown-combat",
    combatResultScenes: {
      draw: "scene 32a draw",
      kael: "scene 32b kael wins",
      zyra: "scene 32c zyra wins"
    }
  },
  "scene 32a draw": {
    file: "scene 32a draw.mp4",
    next: "scene 33"
  },
  "scene 32b kael wins": {
    file: "scene 32b kael wins.mp4",
    next: "scene 33"
  },
  "scene 32c zyra wins": {
    file: "scene 32c zyra wins.mp4",
    next: "scene 33"
  },
  "scene 33": {
    file: "scene 33.mp4",
    choices: createChoices([
      [1, "Turn on each other and finish the duel.", "scene 34a"],
      [2, "Drop the sacrifice and feed the monster.", "scene 34b"],
      [3, "Break the ritual. Kill the emperor.", "scene 34c"]
    ])
  },
  "scene 34a": {
    file: "scene 34a.mp4"
  },
  "scene 34b": {
    file: "scene 34b.mp4"
  },
  "scene 34c": {
    file: "scene 34c.mp4"
  }
};

const UNKNOWN_PROGRESS = createProgressMap([
  [1, "left player 1", "left player 2", "right player 1", "right player 2"],
  [2, "scene 1-10"],
  [3, "scene 11a", "scene 11b", "scene 11c"],
  [4, "scene 12"],
  [5, "scene 13a draw", "scene 13b kael wins", "scene 13c zyra wins"],
  [6, "scene 14-18"],
  [7, "scene 19a draw", "scene 19b kael wins", "scene 19c zyra wins"],
  [8, "scene 20-23"],
  [9, "scene 25a draw", "scene 25b kael wins", "scene 25c zyra wins"],
  [10, "scene 26-28"],
  [11, "scene 29a", "scene 29b", "scene 29c"],
  [12, "scene 30"],
  [13, "scene 31"],
  [14, "scene 32a draw", "scene 32b kael wins", "scene 32c zyra wins"],
  [15, "scene 33"],
  [16, "scene 34a", "scene 34b", "scene 34c"]
]);

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
  },
  unknown: {
    id: "unknown",
    title: "Unknown is Calling",
    seasonLabel: "Series 3 - Unknown is Calling",
    menuLabel: "Series 3",
    menuCopy: "Two-player alien arena ritual with locked Kael and Zyra assignments, branching dialogue, and combat resolution clips.",
    startScene: "left player 1",
    poster: "posters/unknown-is-calling.jpg",
    totalBeats: 16,
    videoRoots: ["Unknown_is_calling", "video/Unknown_is_calling", "video", "."],
    scenes: UNKNOWN_SCENES,
    progress: UNKNOWN_PROGRESS,
    finalScenes: new Set(["scene 34a", "scene 34b", "scene 34c"]),
    allowedPlayerCounts: [2]
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

const DEVICE_OPTIONS = ["keyboard", "gamepad1", "gamepad2"];
const DEVICE_LABELS = {
  keyboard: "Keyboard",
  gamepad1: "Gamepad 1",
  gamepad2: "Gamepad 2"
};
const GAMEPAD_OPTION_LABELS = { 1: "X", 2: "Y", 3: "B" };
const KEYBOARD_OPTION_LABELS = { 1: "A", 2: "S", 3: "D" };
const GAMEPAD_CONNECTION_GRACE_MS = 1800;
const SCENE_SKIP_HOLD_MS = 1400;
const SCENE_SKIP_GAMEPAD_BUTTON_INDEX = 5;
const SKIP_KEY_CODES = new Set(["Space"]);

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
const combatResolutionFlash = document.getElementById("combat-resolution-flash");
const screenChoiceOverlay = document.getElementById("screen-choice-overlay");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingTitle = document.getElementById("loading-title");
const loadingDetail = document.getElementById("loading-detail");
const loadingProgressFill = document.getElementById("loading-progress-fill");
const loadingProgressCopy = document.getElementById("loading-progress-copy");
const choiceList = document.getElementById("choice-list");
const decisionFeed = document.getElementById("decision-feed");
const focusFeed = document.getElementById("focus-feed");
const inputGrid = document.querySelector(".input-grid");
const playerOneInputCard = document.getElementById("player-1-input-card");
const playerOneInputLabel = document.getElementById("player-1-input-label");
const playerOneInputCopy = document.getElementById("player-1-input-copy");
const playerTwoInputCard = document.getElementById("player-2-input-card");
const playerTwoInputLabel = document.getElementById("player-2-input-label");
const playerTwoInputCopy = document.getElementById("player-2-input-copy");
const mouseInputCopy = document.getElementById("mouse-input-copy");
const votePanel = document.getElementById("vote-panel");
const voteReadout = document.querySelector(".vote-readout");
const playerOneVoteCard = document.getElementById("player-1-vote-card");
const playerOneVoteLabel = document.getElementById("player-1-vote-label");
const playerOneVote = document.getElementById("player-1-vote");
const playerTwoVoteCard = document.getElementById("player-2-vote-card");
const playerTwoVoteLabel = document.getElementById("player-2-vote-label");
const playerTwoVote = document.getElementById("player-2-vote");
const decisionStatus = document.getElementById("decision-status");
const controlHint = document.getElementById("control-hint");
const introScreen = document.getElementById("intro-screen");
const menuOverlayLabel = document.getElementById("menu-overlay-label");
const menuCopy = document.getElementById("menu-copy");
const menuSelectedTitle = document.getElementById("menu-selected-title");
const menuSelectedCopy = document.getElementById("menu-selected-copy");
const playerCountOneButton = document.getElementById("player-count-1");
const playerCountTwoButton = document.getElementById("player-count-2");
const playerOneDeviceSelect = document.getElementById("player-1-device");
const playerTwoDeviceField = document.getElementById("player-2-device-field");
const playerTwoDeviceSelect = document.getElementById("player-2-device");
const menuSetupStatus = document.getElementById("menu-setup-status");
const episodeCards = Array.from(document.querySelectorAll(".episode-card"));
const pauseScreen = document.getElementById("pause-screen");
const pauseMessage = document.getElementById("pause-message");
const endScreen = document.getElementById("end-screen");
const endOverlayLabel = document.getElementById("end-overlay-label");
const endTitle = document.getElementById("end-title");
const endCopy = document.getElementById("end-copy");
const errorScreen = document.getElementById("error-screen");
const errorTitle = document.getElementById("error-title");
const errorMessage = document.getElementById("error-message");
const menuFullscreenButton = document.getElementById("menu-fullscreen-button");
const videoFullscreenButton = document.getElementById("video-fullscreen-button");
const skipHoldIndicator = document.getElementById("skip-hold-indicator");
const skipHoldLabel = document.getElementById("skip-hold-label");
const skipHoldMeta = document.getElementById("skip-hold-meta");
const skipHoldFill = document.getElementById("skip-hold-fill");
const startButton = document.getElementById("start-button");
const continueButton = document.getElementById("continue-button");
const pauseRestartButton = document.getElementById("pause-restart-button");
const restartButton = document.getElementById("restart-button");
const retryButton = document.getElementById("retry-button");

function createEpisodeBranchState() {
  return {
    finalChoiceKey: null,
    fighterByPlayer: { 1: null, 2: null },
    playerByFighter: { kael: null, zyra: null }
  };
}

const episodePreloadCache = new Map();
const episodePreloadPromises = new Map();
let combatResolutionTimer = null;

const state = {
  selectedEpisodeId: "detective",
  playerSetup: {
    count: 1,
    assignments: { 1: "keyboard", 2: "gamepad1" }
  },
  currentSceneId: null,
  episodeMindState: {
    surrender: 0,
    denial: 0,
    curiosity: 0,
    finalChoiceKey: null
  },
  episodeBranchState: createEpisodeBranchState(),
  votes: { 1: null, 2: null },
  focusChoice: { 1: 1, 2: 1 },
  waitingForVotes: false,
  resolvingChoice: false,
  selectedChoiceKey: null,
  randomResolution: false,
  resolutionMode: null,
  resolvedCombatOutcome: null,
  loadToken: 0,
  resolveTimer: null,
  pendingNextSceneId: null,
  resolveRemainingMs: 0,
  resolveEndsAt: 0,
  started: false,
  isPreparingEpisode: false,
  isPaused: false,
  pauseWasPlaying: false,
  resumePlaybackOnUnpause: false,
  errorRecoveryAction: "scene",
  gamepadSnapshot: {},
  gamepadSignature: "",
  gamepadConnectionSignature: "",
  gamepadLastSeenAt: { gamepad1: 0, gamepad2: 0 },
  lastInputMethod: "mouse",
  isFullscreenActive: false,
  skipHold: {
    keyboardPressed: false,
    keyboardStartedAt: 0,
    keyboardLatched: false,
    gamepadPressed: { gamepad1: false, gamepad2: false },
    gamepadStartedAt: { gamepad1: 0, gamepad2: 0 },
    gamepadLatched: { gamepad1: false, gamepad2: false },
    progress: 0,
    source: null
  }
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

function updateLoadingOverlay(content = {}) {
  const {
    title = "Episode standing by...",
    detail = "",
    progress = null,
    progressLabel = ""
  } = typeof content === "string" ? { title: content } : content;

  loadingTitle.textContent = title;
  loadingDetail.textContent = detail;
  loadingDetail.hidden = !detail;
  loadingProgressCopy.textContent = progressLabel;
  loadingProgressCopy.hidden = !progressLabel;
  loadingProgressFill.classList.toggle("is-indeterminate", typeof progress !== "number");
  loadingProgressFill.style.width = typeof progress === "number"
    ? `${Math.max(0, Math.min(progress, 1)) * 100}%`
    : "34%";
}

function showLoading(content) {
  updateLoadingOverlay(content);
  loadingOverlay.classList.add("is-visible");
}

function hideLoading() {
  loadingOverlay.classList.remove("is-visible");
}

function isFullscreenSupported() {
  return Boolean(document.fullscreenEnabled || document.documentElement.requestFullscreen);
}

function updateFullscreenUi() {
  const supported = isFullscreenSupported();
  const active = Boolean(document.fullscreenElement);

  state.isFullscreenActive = active;
  document.body.classList.toggle("is-fullscreen-active", active);

  [menuFullscreenButton, videoFullscreenButton].forEach((button) => {
    if (!button) {
      return;
    }

    button.hidden = !supported;
    button.disabled = !supported;
    button.textContent = active ? "Exit Fullscreen" : "Enter Fullscreen";
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

async function toggleAppFullscreen() {
  if (!isFullscreenSupported()) {
    setDecisionMessage("Fullscreen is not supported in this browser.");
    updateSceneHud();
    return false;
  }

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }

    return true;
  } catch (error) {
    setDecisionMessage("Fullscreen request was blocked.");
    updateSceneHud();
    return false;
  }
}

function handleFullscreenChange() {
  updateFullscreenUi();
  updateSceneHud();
  updateFocusFeed();
}

function isEditableTarget(target) {
  return target instanceof HTMLElement
    && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(target.tagName));
}

function isShortcutPassthroughTarget(target) {
  return target instanceof HTMLElement && Boolean(target.closest("button, a, summary, [role='button']"));
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

function clearSkipHoldState(options = {}) {
  const { latchPressed = false, clearAll = false } = options;

  state.skipHold.progress = 0;
  state.skipHold.source = null;
  state.skipHold.keyboardStartedAt = 0;

  if (clearAll) {
    state.skipHold.keyboardPressed = false;
    state.skipHold.keyboardLatched = false;
  } else if (latchPressed && state.skipHold.keyboardPressed) {
    state.skipHold.keyboardLatched = true;
  }

  Object.keys(state.skipHold.gamepadStartedAt).forEach((device) => {
    state.skipHold.gamepadStartedAt[device] = 0;

    if (clearAll) {
      state.skipHold.gamepadPressed[device] = false;
      state.skipHold.gamepadLatched[device] = false;
    } else if (latchPressed && state.skipHold.gamepadPressed[device]) {
      state.skipHold.gamepadLatched[device] = true;
    }
  });

  updateSkipIndicator();
}

function resetEpisodeMindState() {
  state.episodeMindState = {
    surrender: 0,
    denial: 0,
    curiosity: 0,
    finalChoiceKey: null
  };
}

function resetEpisodeBranchState() {
  state.episodeBranchState = createEpisodeBranchState();
}

function getCurrentEpisode() {
  return EPISODES[state.selectedEpisodeId];
}

function getAllowedPlayerCounts(episode = getCurrentEpisode()) {
  return episode.allowedPlayerCounts || [1, 2];
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

function getActiveSkipGamepadDevices() {
  return Array.from(new Set(
    getActivePlayers()
      .map((player) => getAssignedDevice(player))
      .filter((device) => isGamepadDevice(device))
  ));
}

function isSceneSkippingAvailable(scene = getCurrentScene()) {
  return Boolean(
    state.started
    && !state.isPreparingEpisode
    && scene
    && state.currentSceneId
    && !state.isPaused
    && !state.waitingForVotes
    && !state.resolvingChoice
    && !isOverlayVisible(introScreen)
    && !isOverlayVisible(endScreen)
    && !isOverlayVisible(errorScreen)
    && !loadingOverlay.classList.contains("is-visible")
  );
}

function getSkipHoldTitle(scene = getCurrentScene()) {
  if (!scene) {
    return "Skip Scene";
  }

  if (scene.choices) {
    return "Skip To Choice";
  }

  if (isFinalScene(state.currentSceneId) || (!scene.next && !scene.endingResolver)) {
    return "Skip Ending";
  }

  return "Skip Scene";
}

function updateSkipIndicator() {
  if (!skipHoldIndicator || !skipHoldLabel || !skipHoldMeta || !skipHoldFill) {
    return;
  }

  const scene = getCurrentScene();
  const available = isSceneSkippingAvailable(scene);
  if (!available) {
    skipHoldIndicator.hidden = true;
    skipHoldIndicator.classList.remove("is-armed");
    skipHoldFill.style.width = "0%";
    return;
  }

  const hasConnectedSkipGamepad = getActiveSkipGamepadDevices().some((device) => getGamepadConnectionState(device));
  const idleHint = hasConnectedSkipGamepad ? "Hold Space or RB" : "Hold Space";
  const remainingSeconds = Math.max(0, SCENE_SKIP_HOLD_MS * (1 - state.skipHold.progress)) / 1000;

  skipHoldIndicator.hidden = false;
  skipHoldIndicator.classList.toggle("is-armed", state.skipHold.progress > 0);
  skipHoldLabel.textContent = getSkipHoldTitle(scene);
  skipHoldMeta.textContent = state.skipHold.progress > 0
    ? `Release to cancel | ${remainingSeconds.toFixed(1)}s`
    : idleHint;
  skipHoldFill.style.width = `${Math.max(0, Math.min(state.skipHold.progress, 1)) * 100}%`;
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

function formatFighterName(fighter) {
  if (!fighter) {
    return "";
  }

  return fighter.charAt(0).toUpperCase() + fighter.slice(1);
}

function getAssignedFighter(player) {
  if (state.selectedEpisodeId !== "unknown") {
    return null;
  }

  return state.episodeBranchState.fighterByPlayer[player];
}

function isCombatChoiceScene(scene = getCurrentScene()) {
  return Boolean(scene && scene.choiceResolver === "unknown-combat");
}

function getCombatOutcomeLabel(outcome) {
  if (outcome === "kael") {
    return "Kael Wins";
  }

  if (outcome === "zyra") {
    return "Zyra Wins";
  }

  return "Draw";
}

function hideCombatResolutionFlash() {
  if (combatResolutionTimer) {
    window.clearTimeout(combatResolutionTimer);
    combatResolutionTimer = null;
  }

  combatResolutionFlash.classList.remove("is-visible");
  combatResolutionFlash.textContent = "";
  delete combatResolutionFlash.dataset.outcome;
  combatResolutionFlash.hidden = true;
}

function showCombatResolutionFlash(outcome) {
  hideCombatResolutionFlash();
  combatResolutionFlash.dataset.outcome = outcome;
  combatResolutionFlash.innerHTML = `<div class="combat-resolution-copy">${getCombatOutcomeLabel(outcome)}</div>`;
  combatResolutionFlash.hidden = false;
  requestAnimationFrame(() => {
    combatResolutionFlash.classList.add("is-visible");
  });

  combatResolutionTimer = window.setTimeout(() => {
    combatResolutionFlash.classList.remove("is-visible");
    window.setTimeout(() => {
      if (!combatResolutionFlash.classList.contains("is-visible")) {
        combatResolutionFlash.hidden = true;
        combatResolutionFlash.textContent = "";
      }
    }, 220);
  }, 900);
}

function getPlayerLabel(player) {
  const fighter = getAssignedFighter(player);
  return fighter ? `Player ${player} - ${formatFighterName(fighter)}` : `Player ${player}`;
}

function getActivePlayers() {
  return state.playerSetup.count === 2 ? [1, 2] : [1];
}

function isPlayerActive(player) {
  return getActivePlayers().includes(player);
}

function getSceneParticipants(scene = getCurrentScene()) {
  const activePlayers = getActivePlayers();

  if (!scene || !scene.choicePlayers) {
    return activePlayers;
  }

  return scene.choicePlayers.filter((player) => activePlayers.includes(player));
}

function isPlayerRequiredForScene(player, scene = getCurrentScene()) {
  return getSceneParticipants(scene).includes(player);
}

function getAssignedDevice(player) {
  return state.playerSetup.assignments[player] || "keyboard";
}

function getCurrentTimestamp() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function beginKeyboardSkipHold(timestamp = getCurrentTimestamp()) {
  state.skipHold.keyboardPressed = true;

  if (!isSceneSkippingAvailable()) {
    state.skipHold.keyboardStartedAt = 0;
    state.skipHold.keyboardLatched = true;
    updateSkipIndicator();
    return;
  }

  if (!state.skipHold.keyboardLatched && !state.skipHold.keyboardStartedAt) {
    state.skipHold.keyboardStartedAt = timestamp;
  }

  updateSkipIndicator();
}

function releaseKeyboardSkipHold() {
  state.skipHold.keyboardPressed = false;
  state.skipHold.keyboardStartedAt = 0;
  state.skipHold.keyboardLatched = false;

  if (state.skipHold.source === "keyboard") {
    state.skipHold.progress = 0;
    state.skipHold.source = null;
  }

  updateSkipIndicator();
}

function isGamepadDevice(device) {
  return typeof device === "string" && device.startsWith("gamepad");
}

function getGamepadSlot(device) {
  if (!isGamepadDevice(device)) {
    return null;
  }

  return Number(device.replace("gamepad", ""));
}

function getDeviceLabel(device) {
  return DEVICE_LABELS[device] || "Unknown Device";
}

function getPlayerDeviceLabel(player) {
  return `${getPlayerLabel(player)} • ${getDeviceLabel(getAssignedDevice(player))}`;
}

function getGamepadByDevice(device) {
  const slot = getGamepadSlot(device);
  if (!slot) {
    return null;
  }

  return getConnectedGamepads()[slot - 1] || null;
}

function getGamepadConnectionState(device, connectedPads = null) {
  if (device === "keyboard") {
    return true;
  }

  const slot = getGamepadSlot(device);
  if (!slot) {
    return false;
  }

  const gamepads = connectedPads || getConnectedGamepads();
  if (gamepads[slot - 1]) {
    return true;
  }

  const lastSeenAt = state.gamepadLastSeenAt[device] || 0;
  return lastSeenAt > 0 && (getCurrentTimestamp() - lastSeenAt) <= GAMEPAD_CONNECTION_GRACE_MS;
}

function isDeviceConnected(device) {
  return getGamepadConnectionState(device);
}

function getKeyboardPlayer() {
  return getActivePlayers().find((player) => getAssignedDevice(player) === "keyboard") || null;
}

function canMouseVoteForPlayer(player) {
  return isPlayerActive(player) && getAssignedDevice(player) === "keyboard";
}

function getChoiceBadgeText(player, choiceKey) {
  const device = getAssignedDevice(player);

  if (device === "keyboard") {
    return `P${player} KB ${KEYBOARD_OPTION_LABELS[choiceKey]}`;
  }

  return `P${player} G${getGamepadSlot(device)} ${GAMEPAD_OPTION_LABELS[choiceKey]}`;
}

function getKeyboardInstruction() {
  return "Keyboard: A = 1, S = 2, D = 3. Pressing a key locks instantly.";
}

function getGamepadInstruction(device) {
  return `${getDeviceLabel(device)}: X = 1, Y = 2, B = 3 lock instantly, or move focus and press A. Start pauses.`;
}

function getPlayerInputDescription(player) {
  const device = getAssignedDevice(player);
  const connectionNote = isDeviceConnected(device) ? "" : ` ${getDeviceLabel(device)} is not connected.`;

  if (device === "keyboard") {
    return `${getKeyboardInstruction()} Mouse clicks also vote for this player.${connectionNote}`;
  }

  return `${getGamepadInstruction(device)}${connectionNote}`;
}

function getMouseInstruction() {
  const keyboardPlayer = getKeyboardPlayer();

  if (!keyboardPlayer) {
    return "Mouse voting is offline because no active player is assigned Keyboard.";
  }

  return `Mouse is mapped to Player ${keyboardPlayer}. Click that player's vote button under a choice to lock instantly.`;
}

function getPlayerSetupValidation() {
  const allowedPlayerCounts = getAllowedPlayerCounts();

  if (!allowedPlayerCounts.includes(state.playerSetup.count)) {
    return {
      valid: false,
      message: allowedPlayerCounts.length === 1 && allowedPlayerCounts[0] === 2
        ? `${getCurrentEpisode().title} requires two players.`
        : "The selected series does not support that player count."
    };
  }

  const activePlayers = getActivePlayers();
  const devices = activePlayers.map((player) => getAssignedDevice(player));
  const duplicates = new Set(devices).size !== devices.length;

  if (duplicates) {
    return {
      valid: false,
      message: "Assign different devices to each active player."
    };
  }

  const missingPlayer = activePlayers.find((player) => !isDeviceConnected(getAssignedDevice(player)));
  if (missingPlayer) {
    return {
      valid: false,
      message: `${getDeviceLabel(getAssignedDevice(missingPlayer))} is not connected for Player ${missingPlayer}. Connect it or choose another device.`
    };
  }

  const summary = activePlayers
    .map((player) => `P${player} on ${getDeviceLabel(getAssignedDevice(player))}.`)
    .join(" ");
  const mouseNote = getKeyboardPlayer()
    ? `Mouse follows Player ${getKeyboardPlayer()}.`
    : "Mouse voting is off.";

  return {
    valid: true,
    message: `${state.playerSetup.count === 1 ? "Solo mode ready." : "Two-player mode ready."} ${summary} ${mouseNote}`
  };
}

function getWaitingPlayers() {
  return getSceneParticipants().filter((player) => state.votes[player] == null);
}

function hasAllRequiredVotes() {
  return getWaitingPlayers().length === 0;
}

function getChoiceButtonLabel(player) {
  const fighter = getAssignedFighter(player);
  const label = fighter ? formatFighterName(fighter) : `P${player}`;

  return getAssignedDevice(player) === "keyboard"
    ? `${label} • Keyboard / Mouse`
    : `${label} • ${getDeviceLabel(getAssignedDevice(player))}`;
}

function updateDeviceSelectOptions(select) {
  Array.from(select.options).forEach((option) => {
    if (option.value === "keyboard") {
      option.textContent = "Keyboard / Mouse";
      return;
    }

    option.textContent = `${getDeviceLabel(option.value)}${isDeviceConnected(option.value) ? " (connected)" : " (not connected)"}`;
  });
}

function syncGameplayPlayerUi() {
  playerOneInputLabel.textContent = getPlayerDeviceLabel(1);
  playerOneInputCopy.textContent = getPlayerInputDescription(1);
  playerOneVoteLabel.textContent = getPlayerDeviceLabel(1);
  playerTwoInputCard.hidden = !isPlayerActive(2);
  playerTwoVoteCard.hidden = !isPlayerActive(2);

  if (isPlayerActive(2)) {
    playerTwoInputLabel.textContent = getPlayerDeviceLabel(2);
    playerTwoInputCopy.textContent = getPlayerInputDescription(2);
    playerTwoVoteLabel.textContent = getPlayerDeviceLabel(2);
  }

  mouseInputCopy.textContent = getMouseInstruction();

  if (inputGrid) {
    inputGrid.dataset.playerCount = String(state.playerSetup.count);
  }

  if (voteReadout) {
    voteReadout.dataset.playerCount = String(state.playerSetup.count);
  }
}

function updatePlayerSetupUi() {
  const validation = getPlayerSetupValidation();
  const allowedPlayerCounts = getAllowedPlayerCounts();

  playerCountOneButton.classList.toggle("is-selected", state.playerSetup.count === 1);
  playerCountTwoButton.classList.toggle("is-selected", state.playerSetup.count === 2);
  playerCountOneButton.disabled = !allowedPlayerCounts.includes(1);
  playerCountTwoButton.disabled = !allowedPlayerCounts.includes(2);
  playerTwoDeviceField.hidden = state.playerSetup.count === 1;

  updateDeviceSelectOptions(playerOneDeviceSelect);
  updateDeviceSelectOptions(playerTwoDeviceSelect);
  playerOneDeviceSelect.value = getAssignedDevice(1);
  playerTwoDeviceSelect.value = getAssignedDevice(2);

  menuSetupStatus.textContent = validation.message;
  menuSetupStatus.classList.toggle("is-error", !validation.valid);
  startButton.disabled = !validation.valid;

  syncGameplayPlayerUi();
}

function setPlayerCount(count) {
  const allowedPlayerCounts = getAllowedPlayerCounts();
  const normalizedCount = count === 2 ? 2 : 1;
  state.playerSetup.count = allowedPlayerCounts.includes(normalizedCount) ? normalizedCount : allowedPlayerCounts[0];
  state.gamepadSnapshot = {};
  updatePlayerSetupUi();
}

function setPlayerDevice(player, device) {
  if (!DEVICE_OPTIONS.includes(device)) {
    return;
  }

  state.playerSetup.assignments[player] = device;
  state.gamepadSnapshot = {};
  updatePlayerSetupUi();
}

function handleMissingAssignedDevice() {
  const validation = getPlayerSetupValidation();

  if (validation.valid || !state.started || state.isPaused || isOverlayVisible(introScreen) || !canTogglePause()) {
    return;
  }

  pauseGame();
  setDecisionMessage(validation.message);
  updateSceneHud();
  pauseMessage.textContent = validation.message;
}

function applyMindDelta(delta) {
  Object.entries(delta).forEach(([key, amount]) => {
    state.episodeMindState[key] += amount;
  });
}

function recordEpisodeChoiceOutcome(sceneId, choiceKey) {
  if (state.selectedEpisodeId === "unknown" && sceneId === "scene 33") {
    state.episodeBranchState.finalChoiceKey = choiceKey;
    return;
  }

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

function applyUnknownCharacterAssignment(fighter) {
  const opposingFighter = fighter === "kael" ? "zyra" : "kael";

  state.episodeBranchState.fighterByPlayer = {
    1: fighter,
    2: opposingFighter
  };
  state.episodeBranchState.playerByFighter = {
    kael: fighter === "kael" ? 1 : 2,
    zyra: fighter === "zyra" ? 1 : 2
  };
}

function resolveUnknownCombatOutcome(kaelChoiceKey, zyraChoiceKey) {
  if (kaelChoiceKey == null || zyraChoiceKey == null || kaelChoiceKey === zyraChoiceKey) {
    return "draw";
  }

  const kaelWins = (kaelChoiceKey === 1 && zyraChoiceKey === 3)
    || (kaelChoiceKey === 3 && zyraChoiceKey === 2)
    || (kaelChoiceKey === 2 && zyraChoiceKey === 1);

  return kaelWins ? "kael" : "zyra";
}

function resolveEpisodeEndingScene(sceneId) {
  if (state.selectedEpisodeId === "unknown") {
    if (sceneId !== "scene 33") {
      return null;
    }

    if (state.episodeBranchState.finalChoiceKey === 1) {
      return "scene 34a";
    }

    if (state.episodeBranchState.finalChoiceKey === 2) {
      return "scene 34b";
    }

    return "scene 34c";
  }

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
  const playerCountCopy = getAllowedPlayerCounts().length === 1 && getAllowedPlayerCounts()[0] === 2
    ? "This series requires 2 players. Assign both devices, then begin"
    : "Select a series card, choose 1 or 2 players, assign devices, then begin";

  episodeCards.forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.episode === state.selectedEpisodeId);
  });

  menuOverlayLabel.textContent = episode.seasonLabel;
  menuCopy.textContent = `${playerCountCopy} ${episode.title}. Poster images are pulled from the real opening clips.`;
  menuSelectedTitle.textContent = episode.title;
  menuSelectedCopy.textContent = episode.menuCopy;
  startButton.textContent = `Begin ${episode.title}`;
  updatePlayerSetupUi();
}

function selectEpisode(episodeId) {
  if (!EPISODES[episodeId]) {
    return;
  }

  state.selectedEpisodeId = episodeId;
  if (!getAllowedPlayerCounts().includes(state.playerSetup.count)) {
    state.playerSetup.count = getAllowedPlayerCounts()[0];
  }
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

function handlePlayerCountClick(event) {
  const button = event.target.closest("[data-player-count]");
  if (!button) {
    return;
  }

  setPlayerCount(Number(button.dataset.playerCount));
  updateSceneHud();
  updateFocusFeed();
}

function handlePlayerDeviceChange(event) {
  if (event.target === playerOneDeviceSelect) {
    setPlayerDevice(1, playerOneDeviceSelect.value);
  } else if (event.target === playerTwoDeviceSelect) {
    setPlayerDevice(2, playerTwoDeviceSelect.value);
  } else {
    return;
  }

  updateSceneHud();
  updateFocusFeed();
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

function setGamepadSkipPressed(device, pressed, timestamp = getCurrentTimestamp()) {
  state.skipHold.gamepadPressed[device] = pressed;

  if (!pressed) {
    state.skipHold.gamepadStartedAt[device] = 0;
    state.skipHold.gamepadLatched[device] = false;

    if (state.skipHold.source === device) {
      state.skipHold.progress = 0;
      state.skipHold.source = null;
    }

    return;
  }

  if (!isSceneSkippingAvailable()) {
    state.skipHold.gamepadStartedAt[device] = 0;
    state.skipHold.gamepadLatched[device] = true;
    return;
  }

  if (!state.skipHold.gamepadLatched[device] && !state.skipHold.gamepadStartedAt[device]) {
    state.skipHold.gamepadStartedAt[device] = timestamp;
  }
}

function updateInputPrompts() {
  const validation = getPlayerSetupValidation();
  const activePlayers = getActivePlayers();
  const playerSummaries = activePlayers
    .map((player) => `P${player}: ${getDeviceLabel(getAssignedDevice(player))}`)
    .join(" | ");

  inputStatus.textContent = validation.valid
    ? `${state.playerSetup.count === 1 ? "1 player active." : "2 players active."} ${playerSummaries}.`
    : `Setup issue: ${validation.message}`;

  controlHint.textContent = activePlayers.map((player) => {
    const device = getAssignedDevice(player);

    if (device === "keyboard") {
      return `P${player} Keyboard: A = 1, S = 2, D = 3. Locks instantly.`;
    }

    return `P${player} ${getDeviceLabel(device)}: X = 1, Y = 2, B = 3. Or move focus and press A. Start pauses.`;
  }).concat(getKeyboardPlayer() ? [`Mouse votes for P${getKeyboardPlayer()}`] : ["Mouse voting off"])
    .concat(isFullscreenSupported() ? ["F toggles fullscreen"] : [])
    .join(". ");
}

function getChoiceParticipantLabel(player) {
  const fighter = getAssignedFighter(player);
  return fighter ? `${formatFighterName(fighter)} / P${player}` : `P${player}`;
}

function buildChoiceHudCopy(scene) {
  const activePlayers = getSceneParticipants(scene);

  if (isCombatChoiceScene(scene)) {
    return activePlayers.map((player) => (
      state.votes[player] != null
        ? `${getChoiceParticipantLabel(player)} locked in`
        : `${getChoiceParticipantLabel(player)} choosing in secret`
    )).join(". ") + ".";
  }

  const describePlayer = (player) => {
    const voteChoice = getChoiceByKey(scene, state.votes[player]);
    const focusChoice = getChoiceByKey(scene, state.focusChoice[player]) || scene.choices[0];

    if (voteChoice) {
      return `${getChoiceParticipantLabel(player)} on ${getDeviceLabel(getAssignedDevice(player))} locked "${getChoiceText(voteChoice)}"`;
    }

    return `${getChoiceParticipantLabel(player)} on ${getDeviceLabel(getAssignedDevice(player))} aiming "${getChoiceText(focusChoice)}"`;
  };

  return activePlayers.map(describePlayer).join(". ") + ".";
}

function getAssignmentResolutionDescriptor(base) {
  const playerOneFighter = formatFighterName(state.episodeBranchState.fighterByPlayer[1]);
  const playerTwoFighter = formatFighterName(state.episodeBranchState.fighterByPlayer[2]);

  return {
    ...base,
    headline: "Fighters Assigned",
    copy: `Player 1 locked ${playerOneFighter}. Player 2 is assigned ${playerTwoFighter}.`
  };
}

function getCombatResolutionDescriptor(scene, base) {
  const outcomeHeadlines = {
    draw: "Combat Draw",
    kael: "Kael Wins The Exchange",
    zyra: "Zyra Wins The Exchange"
  };

  return {
    ...base,
    headline: outcomeHeadlines[state.resolvedCombatOutcome] || "Combat Locked",
    copy: `${getCombatOutcomeLabel(state.resolvedCombatOutcome)}. Loading the combat result clip.`
  };
}

function getHudDescriptor(scene) {
  const episode = getCurrentEpisode();

  if (!state.started) {
    return {
      kicker: "Casefile online",
      headline: episode.seasonLabel,
      copy: "Select a series card, choose one or two players, assign devices, and begin the chosen episode."
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
    const activePlayers = getSceneParticipants(scene);

    if (state.resolutionMode === "assignment") {
      return getAssignmentResolutionDescriptor(base);
    }

    if (state.resolutionMode === "combat") {
      return getCombatResolutionDescriptor(scene, base);
    }

    if (activePlayers.length === 2 && voteOne && voteTwo && voteOne.key !== voteTwo.key) {
      return {
        ...base,
        headline: "Split Resolution",
        copy: `Split decision between "${getChoiceText(voteOne)}" and "${getChoiceText(voteTwo)}". Randomly selecting one of the two chosen paths.`
      };
    }

    return {
      ...base,
      headline: activePlayers.length === 1 ? "Choice Locked" : "Consensus Locked",
      copy: chosenChoice
        ? `${activePlayers.length === 1 ? "The active player chose" : "Both active players aligned on"} "${getChoiceText(chosenChoice)}". Loading the next clip.`
        : `${activePlayers.length === 1 ? "The active player locked a choice." : "Both active players aligned. Loading the next clip."}`
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
    sceneModeLabel.textContent = state.resolutionMode === "combat"
      ? "Resolving combat"
      : state.resolutionMode === "assignment"
        ? "Assigning fighters"
        : "Resolving votes";
  } else if (state.waitingForVotes) {
    const participants = getSceneParticipants(scene);
    sceneModeLabel.textContent = participants.length === 1
      ? `Awaiting ${getPlayerLabel(participants[0])}`
      : state.playerSetup.count === 1
        ? "Awaiting solo vote"
        : "Awaiting active votes";
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
  updateSkipIndicator();
  updateTextDump();
}

function updateFocusFeed() {
  const scene = getCurrentScene();
  const activePlayers = getSceneParticipants(scene);

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

  if (isCombatChoiceScene(scene)) {
    focusFeed.textContent = activePlayers.map((player) => (
      state.votes[player] != null
        ? `${getChoiceParticipantLabel(player)} locked in`
        : `${getChoiceParticipantLabel(player)} is choosing in secret`
    )).join(". ") + ".";
    return;
  }

  const playerMessage = (player) => {
    const voteChoice = getChoiceByKey(scene, state.votes[player]);

    if (voteChoice) {
      return `${getChoiceParticipantLabel(player)} locked "${getChoiceText(voteChoice)}"`;
    }

    return `${getChoiceParticipantLabel(player)} focus on Choice ${state.focusChoice[player]}`;
  };

  focusFeed.textContent = activePlayers.map(playerMessage).join(". ") + ".";
}

function updateVoteReadout() {
  const participants = getSceneParticipants();
  playerOneVoteCard.hidden = !participants.includes(1);
  playerTwoVoteCard.hidden = !participants.includes(2);
  setVoteCopy(playerOneVote, state.votes[1]);

  if (participants.includes(2)) {
    setVoteCopy(playerTwoVote, state.votes[2]);
  }
}

function setVoteCopy(element, value) {
  if (value == null) {
    element.textContent = "Pending";
    element.classList.add("is-pending");
    return;
  }

  if (isCombatChoiceScene()) {
    element.textContent = "Locked";
    element.classList.remove("is-pending");
    return;
  }

  const choice = getChoiceByKey(getCurrentScene(), value);
  element.textContent = choice ? getChoiceText(choice) : `Choice ${value}`;
  element.classList.remove("is-pending");
}

function resetVotes() {
  state.votes = { 1: null, 2: null };
  state.waitingForVotes = false;
  state.resolvingChoice = false;
  state.selectedChoiceKey = null;
  state.randomResolution = false;
  state.resolutionMode = null;
  state.resolvedCombatOutcome = null;
  updateVoteReadout();
}

function getEpisodeSceneSources(file, episode = getCurrentEpisode()) {
  return episode.videoRoots.map((root) => root === "." ? file : `${root}/${file}`);
}

function getSceneSources(file) {
  return getEpisodeSceneSources(file, getCurrentEpisode());
}

function getEpisodePreloadTargets(episode = getCurrentEpisode()) {
  const seenFiles = new Set();

  return Object.values(episode.scenes).reduce((targets, scene) => {
    if (!scene || !scene.file || seenFiles.has(scene.file)) {
      return targets;
    }

    seenFiles.add(scene.file);
    targets.push({
      file: scene.file,
      fallbackFiles: scene.fallbackFiles || []
    });
    return targets;
  }, []);
}

function getEpisodePreloadRecord(episodeId) {
  return episodePreloadCache.get(episodeId) || null;
}

function ensureEpisodePreloadRecord(episode) {
  if (!episodePreloadCache.has(episode.id)) {
    episodePreloadCache.set(episode.id, {
      ready: false,
      sourcesByFile: {}
    });
  }

  return episodePreloadCache.get(episode.id);
}

function getCachedSceneSource(file, episode = getCurrentEpisode()) {
  const record = getEpisodePreloadRecord(episode.id);
  const entry = record && record.sourcesByFile[file];
  return entry ? entry.source : null;
}

function cacheEpisodeSceneSource(episode, file, source, options = {}) {
  const { isObjectUrl = false } = options;
  const record = ensureEpisodePreloadRecord(episode);
  const existing = record.sourcesByFile[file];

  if (existing && existing.isObjectUrl && existing.source !== source) {
    URL.revokeObjectURL(existing.source);
  }

  record.sourcesByFile[file] = { source, isObjectUrl };
}

function releaseEpisodePreload(episodeId) {
  const record = getEpisodePreloadRecord(episodeId);

  if (!record) {
    return;
  }

  Object.values(record.sourcesByFile).forEach((entry) => {
    if (entry && entry.isObjectUrl) {
      URL.revokeObjectURL(entry.source);
    }
  });

  episodePreloadCache.delete(episodeId);
}

function releaseUnusedEpisodePreloads(activeEpisodeId) {
  Array.from(episodePreloadCache.keys()).forEach((episodeId) => {
    if (episodeId !== activeEpisodeId) {
      releaseEpisodePreload(episodeId);
    }
  });
}

function isScenePreloaded(scene, episode = getCurrentEpisode()) {
  return Boolean(scene && scene.file && getCachedSceneSource(scene.file, episode));
}

function getVideoLoadCandidates(sceneOrFile, episode = getCurrentEpisode()) {
  const primaryFile = typeof sceneOrFile === "string" ? sceneOrFile : sceneOrFile.file;
  const fallbackFiles = typeof sceneOrFile === "string" ? [] : (sceneOrFile.fallbackFiles || []);
  const seenSources = new Set();
  const candidates = [];

  [primaryFile, ...fallbackFiles].forEach((file) => {
    const cachedSource = getCachedSceneSource(file, episode);
    if (cachedSource && !seenSources.has(cachedSource)) {
      seenSources.add(cachedSource);
      candidates.push({ file, source: cachedSource });
    }

    getEpisodeSceneSources(file, episode).forEach((source) => {
      const normalizedSource = encodeURI(source);
      if (!seenSources.has(normalizedSource)) {
        seenSources.add(normalizedSource);
        candidates.push({ file, source: normalizedSource });
      }
    });
  });

  return { primaryFile, candidates };
}

function warmVideoSource(source) {
  return new Promise((resolve, reject) => {
    const preloadVideo = document.createElement("video");
    preloadVideo.preload = "auto";
    preloadVideo.muted = true;
    preloadVideo.playsInline = true;

    const cleanup = () => {
      preloadVideo.removeEventListener("loadeddata", handleLoaded);
      preloadVideo.removeEventListener("error", handleError);
      preloadVideo.pause();
      preloadVideo.removeAttribute("src");
      preloadVideo.load();
    };

    const handleLoaded = () => {
      cleanup();
      resolve({ source, isObjectUrl: false });
    };

    const handleError = () => {
      cleanup();
      reject(new Error(`Unable to load ${source}`));
    };

    preloadVideo.addEventListener("loadeddata", handleLoaded, { once: true });
    preloadVideo.addEventListener("error", handleError, { once: true });
    preloadVideo.src = source;
    preloadVideo.load();
  });
}

async function fetchVideoObjectUrl(source) {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Unable to fetch ${source}`);
  }

  const blob = await response.blob();
  return {
    source: URL.createObjectURL(blob),
    isObjectUrl: true
  };
}

async function preloadVideoAsset(sceneOrFile, episode = getCurrentEpisode()) {
  const { primaryFile, candidates } = getVideoLoadCandidates(sceneOrFile, episode);
  const cachedSource = getCachedSceneSource(primaryFile, episode);

  if (cachedSource) {
    return cachedSource;
  }

  let lastError = null;

  for (const candidate of candidates) {
    try {
      const preloadedSource = window.location.protocol === "file:"
        ? await warmVideoSource(candidate.source)
        : await fetchVideoObjectUrl(candidate.source).catch(() => warmVideoSource(candidate.source));

      cacheEpisodeSceneSource(episode, primaryFile, preloadedSource.source, { isObjectUrl: preloadedSource.isObjectUrl });
      return preloadedSource.source;
    } catch (error) {
      lastError = error;
    }
  }

  const failure = new Error(`Unable to load ${primaryFile}`);
  failure.file = primaryFile;
  if (lastError) {
    failure.cause = lastError;
  }
  throw failure;
}

async function ensureEpisodePreloaded(episode = getCurrentEpisode()) {
  releaseUnusedEpisodePreloads(episode.id);

  const existingRecord = getEpisodePreloadRecord(episode.id);
  if (existingRecord && existingRecord.ready) {
    return existingRecord;
  }

  if (episodePreloadPromises.has(episode.id)) {
    return episodePreloadPromises.get(episode.id);
  }

  const targets = getEpisodePreloadTargets(episode);
  const record = ensureEpisodePreloadRecord(episode);
  const preloadPromise = (async () => {
    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      showLoading({
        title: `Preloading ${episode.title}`,
        detail: `Caching ${target.file}`,
        progress: targets.length ? index / targets.length : 1,
        progressLabel: `${index}/${targets.length} clips cached`
      });
      await preloadVideoAsset(target, episode);
    }

    record.ready = true;
    showLoading({
      title: `${episode.title} Ready`,
      detail: "All episode clips are cached for smoother scene transitions.",
      progress: 1,
      progressLabel: `${targets.length}/${targets.length} clips cached`
    });
    return record;
  })().finally(() => {
    episodePreloadPromises.delete(episode.id);
  });

  episodePreloadPromises.set(episode.id, preloadPromise);
  return preloadPromise;
}

function loadSceneVideo(sceneOrFile) {
  state.loadToken += 1;
  const loadToken = state.loadToken;
  const episode = getCurrentEpisode();
  const { primaryFile, candidates } = getVideoLoadCandidates(sceneOrFile, episode);

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

      const candidate = candidates[candidateIndex];
      const source = candidate.source;
      candidateIndex += 1;

      const cleanup = () => {
        video.removeEventListener("loadeddata", handleLoaded);
        video.removeEventListener("error", handleError);
      };

      const handleLoaded = () => {
        cleanup();
        cacheEpisodeSceneSource(episode, primaryFile, source, { isObjectUrl: source.startsWith("blob:") });
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

  const activePlayers = getSceneParticipants(scene);

  screenChoiceOverlay.innerHTML = scene.choices.map((choice) => `
    <article class="screen-choice-card" data-choice="${choice.key}">
      <div class="screen-choice-header">
        <span class="screen-choice-label">Option ${choice.key}</span>
        <div class="screen-choice-keys">
          ${activePlayers.map((player) => `<span>${getChoiceBadgeText(player, choice.key)}</span>`).join("")}
        </div>
      </div>
      <p class="screen-choice-text">${getChoiceText(choice)}</p>
    </article>
  `).join("");

  screenChoiceOverlay.hidden = false;
}

function updateChoiceVisualState() {
  const scene = getCurrentScene();
  const participants = getSceneParticipants(scene);
  const playerOneParticipating = participants.includes(1);
  const playerTwoParticipating = participants.includes(2);
  const hideCombatSelections = isCombatChoiceScene(scene);
  const cards = choiceList.querySelectorAll(".choice-card");
  const buttons = choiceList.querySelectorAll(".choice-vote");
  const screenCards = screenChoiceOverlay.querySelectorAll(".screen-choice-card");

  cards.forEach((card) => {
    const choiceKey = Number(card.dataset.choice);
    const showChoiceState = !hideCombatSelections;
    const wasVoted = showChoiceState && (state.votes[1] === choiceKey || state.votes[2] === choiceKey);

    card.classList.toggle("is-voted", wasVoted);
    card.classList.toggle("is-selected", showChoiceState && state.selectedChoiceKey === choiceKey);
    card.classList.toggle("is-random", showChoiceState && state.randomResolution && state.selectedChoiceKey === choiceKey);
    card.classList.toggle("is-focused-p1", showChoiceState && playerOneParticipating && scene && scene.choices && state.focusChoice[1] === choiceKey && state.waitingForVotes && !state.resolvingChoice);
    card.classList.toggle("is-focused-p2", showChoiceState && playerTwoParticipating && scene && scene.choices && state.focusChoice[2] === choiceKey && state.waitingForVotes && !state.resolvingChoice);
  });

  buttons.forEach((button) => {
    const player = Number(button.dataset.player);
    const choiceKey = Number(button.dataset.choice);
    const isLocked = !hideCombatSelections && state.votes[player] === choiceKey;
    const canMouseVote = canMouseVoteForPlayer(player);

    button.classList.toggle("is-locked", isLocked);
    button.classList.toggle("is-focused-player-1", !hideCombatSelections && player === 1 && state.focusChoice[1] === choiceKey && state.waitingForVotes && !state.resolvingChoice);
    button.classList.toggle("is-focused-player-2", !hideCombatSelections && player === 2 && state.focusChoice[2] === choiceKey && state.waitingForVotes && !state.resolvingChoice);
    button.classList.toggle("is-device-assigned", !canMouseVote);
    button.disabled = state.resolvingChoice || !canMouseVote;
    button.setAttribute("aria-pressed", isLocked ? "true" : "false");
  });

  screenCards.forEach((card) => {
    const choiceKey = Number(card.dataset.choice);
    const showChoiceState = !hideCombatSelections;
    const wasVoted = showChoiceState && (state.votes[1] === choiceKey || state.votes[2] === choiceKey);

    card.classList.toggle("is-voted", wasVoted);
    card.classList.toggle("is-selected", showChoiceState && state.selectedChoiceKey === choiceKey);
    card.classList.toggle("is-random", showChoiceState && state.randomResolution && state.selectedChoiceKey === choiceKey);
    card.classList.toggle("is-focused-p1", showChoiceState && playerOneParticipating && scene && scene.choices && state.focusChoice[1] === choiceKey && state.waitingForVotes && !state.resolvingChoice);
    card.classList.toggle("is-focused-p2", showChoiceState && playerTwoParticipating && scene && scene.choices && state.focusChoice[2] === choiceKey && state.waitingForVotes && !state.resolvingChoice);
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

  const activePlayers = getSceneParticipants(scene);
  const isCombatScene = isCombatChoiceScene(scene);

  choiceList.innerHTML = scene.choices.map((choice, index) => `
    <article class="choice-card${isCombatScene ? " choice-card--combat" : ""}" data-choice="${choice.key}" style="--card-index:${index};">
      <span class="choice-number">${choice.key}</span>
      <p class="choice-text">${getChoiceText(choice)}</p>
      ${isCombatScene
        ? `<div class="choice-control-indicators">
          ${activePlayers.map((player) => `<span class="choice-control-indicator">${getChoiceBadgeText(player, choice.key)}</span>`).join("")}
        </div>
        <p class="choice-secret-hint">Indicator only. Selections stay hidden until both fighters lock in.</p>`
        : `<div class="choice-actions">
          ${activePlayers.map((player) => `
            <button class="choice-vote" type="button" data-player="${player}" data-choice="${choice.key}">${getChoiceButtonLabel(player)}</button>
          `).join("")}
        </div>`}
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

  clearSkipHoldState({ latchPressed: true });
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

  const validation = getPlayerSetupValidation();
  if (!validation.valid) {
    setDecisionMessage(validation.message);
    updateSceneHud();
    pauseMessage.textContent = validation.message;
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
    const scene = getCurrentScene();
    if (scene && scene.choiceResolver === "unknown-character-select") {
      setDecisionMessage("Decision point resumed. Player 1 chooses the opening fighter.");
    } else if (scene && scene.choiceResolver === "unknown-combat") {
      setDecisionMessage("Decision point resumed. Combat choices stay hidden until both fighters lock in.");
    } else {
      setDecisionMessage(state.playerSetup.count === 1 ? "Decision point resumed. Choose one option." : "Decision point resumed. Active players can vote.");
    }
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

  if (!scene || !scene.choices || state.resolvingChoice || state.isPaused || !isPlayerRequiredForScene(player, scene)) {
    return;
  }

  state.focusChoice[player] = choiceKey;
  state.lastInputMethod = inputMethod;
  updateChoiceVisualState();
  updateSceneHud();
}

function moveFocus(player, direction, inputMethod) {
  const scene = getCurrentScene();

  if (!scene || !scene.choices || !state.waitingForVotes || state.resolvingChoice || state.isPaused || !isPlayerRequiredForScene(player, scene)) {
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

  if (!scene || !scene.choices || !state.waitingForVotes || state.resolvingChoice || state.isPaused || !isPlayerRequiredForScene(player, scene)) {
    return;
  }

  registerVote(player, state.focusChoice[player], inputMethod);
}

function registerVote(player, choiceKey, inputMethod) {
  const scene = getCurrentScene();

  if (!scene || !scene.choices || !state.waitingForVotes || state.resolvingChoice || state.isPaused || !isPlayerRequiredForScene(player, scene)) {
    return;
  }

  state.focusChoice[player] = choiceKey;
  state.votes[player] = choiceKey;
  state.lastInputMethod = inputMethod;
  updateVoteReadout();
  updateChoiceVisualState();
  updateSceneHud();

  const choice = getChoiceByKey(scene, choiceKey);

  if (hasAllRequiredVotes()) {
    resolveSceneChoice();
  } else if (isCombatChoiceScene(scene)) {
    const waitingPlayers = getWaitingPlayers().map((waitingPlayer) => getPlayerLabel(waitingPlayer)).join(" and ");
    setDecisionMessage(`${getPlayerLabel(player)} locked in. Waiting for ${waitingPlayers}.`);
  } else if (choice) {
    const waitingPlayers = getWaitingPlayers().map((waitingPlayer) => getPlayerLabel(waitingPlayer)).join(" and ");
    setDecisionMessage(`${getPlayerLabel(player)} locked "${getChoiceText(choice)}". Waiting for ${waitingPlayers}.`);
  } else {
    const waitingPlayers = getWaitingPlayers().map((waitingPlayer) => getPlayerLabel(waitingPlayer)).join(" and ");
    setDecisionMessage(`${getPlayerLabel(player)} locked a vote. Waiting for ${waitingPlayers}.`);
  }
}

function resolveSceneChoice() {
  const scene = getCurrentScene();

  if (!scene || !scene.choices) {
    return;
  }

  const activePlayers = getSceneParticipants(scene);
  const activeVotes = activePlayers.map((player) => state.votes[player]);

  if (activeVotes.some((choiceKey) => choiceKey == null)) {
    return;
  }

  state.resolvingChoice = true;
  state.randomResolution = false;

  if (scene.choiceResolver === "unknown-character-select") {
    state.resolutionMode = "assignment";
    state.selectedChoiceKey = activeVotes[0];
    const selectedChoice = getChoiceByKey(scene, state.selectedChoiceKey);
    const selectedFighter = selectedChoice && selectedChoice.fighter ? selectedChoice.fighter : "kael";

    applyUnknownCharacterAssignment(selectedFighter);
    syncGameplayPlayerUi();
    setSplitBanner("");
    setDecisionMessage(`Player 1 locked ${formatFighterName(selectedFighter)}. Player 2 is assigned ${formatFighterName(state.episodeBranchState.fighterByPlayer[2])}.`);
    updateChoiceVisualState();
    updateSceneHud();
    scheduleSceneTransition(selectedChoice ? selectedChoice.next : null, 950);
    return;
  }

  if (scene.choiceResolver === "unknown-combat") {
    const kaelPlayer = state.episodeBranchState.playerByFighter.kael || 1;
    const zyraPlayer = state.episodeBranchState.playerByFighter.zyra || 2;
    const kaelChoiceKey = state.votes[kaelPlayer];
    const zyraChoiceKey = state.votes[zyraPlayer];
    const outcome = resolveUnknownCombatOutcome(kaelChoiceKey, zyraChoiceKey);

    state.resolutionMode = "combat";
    state.resolvedCombatOutcome = outcome;
    state.selectedChoiceKey = outcome === "kael"
      ? kaelChoiceKey
      : outcome === "zyra"
        ? zyraChoiceKey
        : kaelChoiceKey;
    setSplitBanner("");
    showCombatResolutionFlash(outcome);
    setDecisionMessage(
      outcome === "draw"
        ? "Draw. Loading the combat result clip."
        : `${outcome === "kael" ? "Kael" : "Zyra"} wins the exchange. Loading the result clip.`
    );
    updateChoiceVisualState();
    updateSceneHud();
    scheduleSceneTransition(scene.combatResultScenes ? scene.combatResultScenes[outcome] : null, 1250);
    return;
  }

  const splitDecision = activePlayers.length === 2 && activeVotes[0] !== activeVotes[1];

  state.resolutionMode = "standard";
  state.randomResolution = splitDecision;
  state.selectedChoiceKey = splitDecision
    ? (Math.random() < 0.5 ? activeVotes[0] : activeVotes[1])
    : activeVotes[0];
  const selectedChoice = getChoiceByKey(scene, state.selectedChoiceKey);
  recordEpisodeChoiceOutcome(state.currentSceneId, state.selectedChoiceKey);

  if (splitDecision) {
    setSplitBanner("Split decision...");
    setDecisionMessage("Split decision detected. Randomly selecting one of the two chosen options.");
  } else {
    setSplitBanner("");
    setDecisionMessage(selectedChoice
      ? `${activePlayers.length === 1 ? "Choice locked." : "Consensus reached."} "${getChoiceText(selectedChoice)}" locked.`
      : `${activePlayers.length === 1 ? "Choice locked." : "Consensus reached."} Choice ${state.selectedChoiceKey} locked.`);
  }

  updateChoiceVisualState();
  updateSceneHud();

  scheduleSceneTransition(selectedChoice ? selectedChoice.next : null, splitDecision ? 1500 : 950);
}

function getVoteStateMessage(scene, options = {}) {
  const { skipped = false } = options;
  const prefix = skipped ? "Scene skipped. " : "";

  if (scene.choiceResolver === "unknown-character-select") {
    return `${prefix}Player 1 chooses Kael or Zyra first. Player 2 receives the remaining fighter automatically.`;
  }

  if (scene.choiceResolver === "unknown-combat") {
    return `${prefix}Kael and Zyra lock attacks in secret. The winner is revealed after both fighters commit.`;
  }

  return `${prefix}${state.playerSetup.count === 1 ? "Choose one option to continue." : "Votes will resolve after both active players lock in."}`;
}

function enterVoteState(scene, options = {}) {
  const { skipped = false } = options;
  state.waitingForVotes = true;
  clearSkipHoldState({ latchPressed: true });
  setDefaultFocus(scene);
  renderChoices(scene);
  setDecisionMessage(getVoteStateMessage(scene, { skipped }));
  updateSceneHud();
  updateFocusFeed();
}

function showCompletion() {
  const episode = getCurrentEpisode();

  clearChoiceTimer();
  clearSkipHoldState({ latchPressed: true });
  state.waitingForVotes = false;
  state.resolvingChoice = false;
  state.isPaused = false;
  state.pauseWasPlaying = false;
  state.resumePlaybackOnUnpause = false;
  video.pause();
  setSplitBanner("");
  hideCombatResolutionFlash();
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
  clearSkipHoldState({ latchPressed: true });
  state.isPaused = false;
  state.pauseWasPlaying = false;
  state.resumePlaybackOnUnpause = false;
  state.errorRecoveryAction = "scene";
  hideCombatResolutionFlash();
  showLoading("Playback halted");
  errorTitle.textContent = isMissingClip ? "Video clip not found" : "Playback blocked";
  retryButton.textContent = "Retry Scene";
  errorMessage.textContent = isMissingClip
    ? `Could not load ${getCurrentScene().file}. Keep the ${episode.title} clips in ${episode.videoRoots[0]}/ or move them into a matching video folder.`
    : "Playback was blocked by the browser. Press Retry Scene or use keyboard, mouse, or gamepad confirm to continue.";
  setDecisionMessage("Playback halted. Retry the current scene.");
  setOverlayVisibility(pauseScreen, false);
  setOverlayVisibility(errorScreen, true);
  updateSceneHud();
  window.requestAnimationFrame(updateSceneHud);
}

function showPreloadError(error) {
  const episode = getCurrentEpisode();
  const file = error && error.file ? error.file : "one of the episode clips";

  video.pause();
  clearSkipHoldState({ latchPressed: true });
  state.isPaused = false;
  state.pauseWasPlaying = false;
  state.resumePlaybackOnUnpause = false;
  state.errorRecoveryAction = "preload";
  hideCombatResolutionFlash();
  showLoading("Preload halted");
  errorTitle.textContent = "Episode preload failed";
  retryButton.textContent = "Retry Preload";
  errorMessage.textContent = `Could not preload ${file}. Keep the ${episode.title} clips in ${episode.videoRoots[0]}/ or move them into a matching video folder, then retry the preload.`;
  setDecisionMessage(`Preload halted on ${file}. Retry the episode preload.`);
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
  clearSkipHoldState({ latchPressed: true });
  state.resumePlaybackOnUnpause = false;
  state.pauseWasPlaying = false;
  resetVotes();
  hideCombatResolutionFlash();
  hideChoices();
  setSplitBanner("");
  setOverlayVisibility(errorScreen, false);
  const sceneWasPreloaded = isScenePreloaded(scene);

  if (sceneWasPreloaded) {
    hideLoading();
    setDecisionMessage(`Opening ${state.currentSceneId}.`);
  } else {
    showLoading({
      title: `Loading ${state.currentSceneId}...`,
      detail: scene.file,
      progressLabel: "Streaming clip into player"
    });
    setDecisionMessage(`Loading ${state.currentSceneId}...`);
  }

  updateSceneHud();
  updateFocusFeed();

  try {
    await loadSceneVideo(scene);
    if (!sceneWasPreloaded) {
      hideLoading();
    }

    if (scene.openChoicesOnLoad) {
      video.pause();
      enterVoteState(scene);
      return;
    }

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

async function restartGame() {
  if (state.isPreparingEpisode) {
    return;
  }

  const episode = getCurrentEpisode();
  const validation = getPlayerSetupValidation();

  if (!validation.valid) {
    setDecisionMessage(validation.message);
    updateSceneHud();
    pauseMessage.textContent = validation.message;
    return;
  }

  state.isPreparingEpisode = true;
  clearChoiceTimer();
  clearSkipHoldState({ clearAll: true });
  resetEpisodeMindState();
  resetEpisodeBranchState();
  state.currentSceneId = null;
  state.isPaused = false;
  state.pauseWasPlaying = false;
  state.resumePlaybackOnUnpause = false;
  hideCombatResolutionFlash();
  setOverlayVisibility(endScreen, false);
  setOverlayVisibility(pauseScreen, false);
  setOverlayVisibility(errorScreen, false);
  syncGameplayPlayerUi();
  setDecisionMessage(`Preloading ${episode.title}...`);
  updateSceneHud();
  updateFocusFeed();

  try {
    await ensureEpisodePreloaded(episode);
    hideLoading();
    state.currentSceneId = episode.startScene;
    setDecisionMessage(`Opening ${episode.title}.`);
    updateSceneHud();
    await playCurrentScene();
  } catch (error) {
    showPreloadError(error);
  } finally {
    state.isPreparingEpisode = false;
  }
}

function advanceCurrentScene(options = {}) {
  const { skipped = false } = options;
  const scene = getCurrentScene();

  if (!scene || state.isPaused) {
    return false;
  }

  if (scene.choices) {
    video.pause();
    enterVoteState(scene, { skipped });
    return true;
  }

  if (scene.endingResolver) {
    const endingSceneId = resolveEpisodeEndingScene(state.currentSceneId);
    setDecisionMessage(skipped ? "Scene skipped. Resolving the ending route." : "Resolving the ending route.");
    updateSceneHud();
    if (skipped && endingSceneId) {
      queueNextScene(endingSceneId);
    } else {
      scheduleSceneTransition(endingSceneId, 700);
    }

    return true;
  }

  if (scene.next) {
    setDecisionMessage(skipped ? "Scene skipped. Advancing to the next clip." : "Advancing to the next clip.");
    updateSceneHud();
    queueNextScene(scene.next);
    return true;
  }

  showCompletion();
  return true;
}

function skipCurrentScene() {
  if (!isSceneSkippingAvailable()) {
    return false;
  }

  clearSkipHoldState({ latchPressed: true });
  video.pause();
  state.pauseWasPlaying = false;
  state.resumePlaybackOnUnpause = false;
  return advanceCurrentScene({ skipped: true });
}

function updateSceneSkipHold(timestamp = getCurrentTimestamp()) {
  if (!isSceneSkippingAvailable()) {
    state.skipHold.progress = 0;
    state.skipHold.source = null;
    updateSkipIndicator();
    return;
  }

  const activeSources = [];
  if (state.skipHold.keyboardPressed && !state.skipHold.keyboardLatched && state.skipHold.keyboardStartedAt) {
    activeSources.push(["keyboard", state.skipHold.keyboardStartedAt]);
  }

  getActiveSkipGamepadDevices().forEach((device) => {
    if (state.skipHold.gamepadPressed[device] && !state.skipHold.gamepadLatched[device] && state.skipHold.gamepadStartedAt[device]) {
      activeSources.push([device, state.skipHold.gamepadStartedAt[device]]);
    }
  });

  if (!activeSources.length) {
    state.skipHold.progress = 0;
    state.skipHold.source = null;
    updateSkipIndicator();
    return;
  }

  activeSources.sort((a, b) => a[1] - b[1]);
  const [source, startedAt] = activeSources[0];
  state.skipHold.source = source;
  state.skipHold.progress = Math.max(0, Math.min(1, (timestamp - startedAt) / SCENE_SKIP_HOLD_MS));
  updateSkipIndicator();

  if (state.skipHold.progress >= 1) {
    skipCurrentScene();
  }
}

function handleSceneEnded() {
  advanceCurrentScene();
}

function handleChoiceClick(event) {
  if (state.isPaused) {
    return;
  }

  const button = event.target.closest(".choice-vote");
  if (!button || button.disabled) {
    return;
  }

  registerVote(Number(button.dataset.player), Number(button.dataset.choice), "mouse");
}

function handleChoicePointer(event) {
  if (state.isPaused) {
    return;
  }

  const button = event.target.closest(".choice-vote");
  if (!button || button.disabled) {
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
    return beginEpisode();
  }

  if (isOverlayVisible(endScreen)) {
    void restartGame();
    return true;
  }

  if (isOverlayVisible(errorScreen)) {
    handleRetryAction();
    return true;
  }

  return false;
}

function handleKeydown(event) {
  if (event.code === "KeyF" && !event.repeat && !isEditableTarget(event.target)) {
    event.preventDefault();
    void toggleAppFullscreen();
    return;
  }

  if ((event.code === "KeyP" || (event.code === "Escape" && !state.isFullscreenActive)) && (state.isPaused || canTogglePause())) {
    event.preventDefault();
    togglePause();
    return;
  }

  const overlayHandled = ["Enter", "Space"].includes(event.code) && handleOverlayPrimaryAction();
  if (overlayHandled) {
    event.preventDefault();
    return;
  }

  if (SKIP_KEY_CODES.has(event.code) && !isEditableTarget(event.target) && !isShortcutPassthroughTarget(event.target)) {
    event.preventDefault();

    if (!event.repeat) {
      beginKeyboardSkipHold();
    }

    return;
  }

  if (!state.waitingForVotes || state.resolvingChoice || state.isPaused) {
    return;
  }

  const keyboardPlayer = getKeyboardPlayer();
  if (!keyboardPlayer) {
    return;
  }

  const directKeyMap = { KeyA: 1, KeyS: 2, KeyD: 3 };
  const directVote = directKeyMap[event.code];

  if (directVote != null) {
    event.preventDefault();
    registerVote(keyboardPlayer, directVote, "keyboard");
    return;
  }
}

function handleKeyup(event) {
  if (SKIP_KEY_CODES.has(event.code)) {
    releaseKeyboardSkipHold();
  }
}

function handleWindowBlur() {
  clearSkipHoldState({ latchPressed: true });
  releaseKeyboardSkipHold();
}

function beginEpisode() {
  const validation = getPlayerSetupValidation();

  updatePlayerSetupUi();
  if (!validation.valid || state.started || state.isPreparingEpisode) {
    if (!validation.valid) {
      setDecisionMessage(validation.message);
    }

    return false;
  }

  state.started = true;
  state.isPaused = false;
  setOverlayVisibility(introScreen, false);
  void restartGame();
  return true;
}

function handleRetryAction() {
  setOverlayVisibility(errorScreen, false);

  if (state.errorRecoveryAction === "preload") {
    void restartGame();
    return;
  }

  void playCurrentScene();
}

function getConnectedGamepads() {
  if (typeof navigator.getGamepads !== "function") {
    return [];
  }

  return Array.from(navigator.getGamepads())
    .filter((gamepad) => Boolean(gamepad) && gamepad.connected !== false)
    .sort((a, b) => a.index - b.index);
}

function recordConnectedGamepads(connectedPads) {
  const timestamp = getCurrentTimestamp();

  connectedPads.forEach((gamepad, index) => {
    const device = `gamepad${index + 1}`;
    if (isGamepadDevice(device) && gamepad) {
      state.gamepadLastSeenAt[device] = timestamp;
    }
  });
}

function updateGamepadAssignments() {
  const connectedPads = getConnectedGamepads();
  recordConnectedGamepads(connectedPads);
  const signature = connectedPads.map((gamepad) => gamepad.index).join(",");
  const connectionSignature = ["gamepad1", "gamepad2"]
    .map((device) => `${device}:${getGamepadConnectionState(device, connectedPads) ? 1 : 0}`)
    .join(",");

  if (signature === state.gamepadSignature && connectionSignature === state.gamepadConnectionSignature) {
    return;
  }

  state.gamepadSignature = signature;
  state.gamepadConnectionSignature = connectionSignature;

  Object.keys(state.gamepadSnapshot).forEach((device) => {
    if (isGamepadDevice(device) && !getGamepadConnectionState(device, connectedPads)) {
      delete state.gamepadSnapshot[device];
    }
  });

  updatePlayerSetupUi();
  updateInputPrompts();
  handleMissingAssignedDevice();
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
  const timestamp = getCurrentTimestamp();
  recordConnectedGamepads(connectedPads);
  const connectedByDevice = {
    gamepad1: connectedPads[0] || null,
    gamepad2: connectedPads[1] || null
  };
  const activeSkipDevices = new Set(getActiveSkipGamepadDevices());

  ["gamepad1", "gamepad2"].forEach((device) => {
    if (!activeSkipDevices.has(device)) {
      setGamepadSkipPressed(device, false, timestamp);
    }
  });

  getActivePlayers().forEach((player) => {
    const assignedDevice = getAssignedDevice(player);
    if (!isGamepadDevice(assignedDevice)) {
      return;
    }

    const gamepad = connectedByDevice[assignedDevice];
    if (!gamepad) {
      setGamepadSkipPressed(assignedDevice, false, timestamp);
      return;
    }

    const snapshot = state.gamepadSnapshot[assignedDevice] || {
      horizontal: 0,
      confirm: false,
      optionOne: false,
      optionTwo: false,
      optionThree: false,
      pause: false,
      skip: false
    };
    const horizontal = getHorizontalIntent(gamepad);
    const confirm = Boolean(gamepad.buttons[0] && gamepad.buttons[0].pressed);
    const optionOne = Boolean(gamepad.buttons[2] && gamepad.buttons[2].pressed);
    const optionTwo = Boolean(gamepad.buttons[3] && gamepad.buttons[3].pressed);
    const optionThree = Boolean(gamepad.buttons[1] && gamepad.buttons[1].pressed);
    const pause = Boolean(gamepad.buttons[9] && gamepad.buttons[9].pressed);
    const skip = Boolean(gamepad.buttons[SCENE_SKIP_GAMEPAD_BUTTON_INDEX] && gamepad.buttons[SCENE_SKIP_GAMEPAD_BUTTON_INDEX].pressed);

    setGamepadSkipPressed(assignedDevice, skip, timestamp);

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
      snapshot.skip = skip;
      state.gamepadSnapshot[assignedDevice] = snapshot;
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
    snapshot.skip = skip;
    state.gamepadSnapshot[assignedDevice] = snapshot;
  });

  updateSceneSkipHold(timestamp);
  window.requestAnimationFrame(pollGamepads);
}

video.addEventListener("ended", handleSceneEnded);
choiceList.addEventListener("click", handleChoiceClick);
choiceList.addEventListener("mouseover", handleChoicePointer);
choiceList.addEventListener("focusin", handleChoicePointer);
episodeCards.forEach((card) => card.addEventListener("click", handleEpisodeCardClick));
playerCountOneButton.addEventListener("click", handlePlayerCountClick);
playerCountTwoButton.addEventListener("click", handlePlayerCountClick);
playerOneDeviceSelect.addEventListener("change", handlePlayerDeviceChange);
playerTwoDeviceSelect.addEventListener("change", handlePlayerDeviceChange);
document.addEventListener("keydown", handleKeydown);
document.addEventListener("keyup", handleKeyup);
document.addEventListener("fullscreenchange", handleFullscreenChange);
window.addEventListener("blur", handleWindowBlur);
window.addEventListener("gamepadconnected", updateGamepadAssignments);
window.addEventListener("gamepaddisconnected", updateGamepadAssignments);

menuFullscreenButton.addEventListener("click", () => {
  void toggleAppFullscreen();
});
videoFullscreenButton.addEventListener("click", () => {
  void toggleAppFullscreen();
});
startButton.addEventListener("click", beginEpisode);
pauseButton.addEventListener("click", togglePause);
continueButton.addEventListener("click", resumeGame);
pauseRestartButton.addEventListener("click", () => {
  void restartGame();
});
restartButton.addEventListener("click", () => {
  void restartGame();
});
retryButton.addEventListener("click", handleRetryAction);

updateFullscreenUi();

function renderGameToText() {
  const scene = getCurrentScene();
  const episode = getCurrentEpisode();
  const choiceParticipants = getSceneParticipants(scene);

  return JSON.stringify({
    episode: episode.id,
    title: episode.title,
    sceneId: state.currentSceneId,
    mode: document.body.dataset.sceneState || "idle",
    started: state.started,
    preparingEpisode: state.isPreparingEpisode,
    paused: state.isPaused,
    waitingForVotes: state.waitingForVotes,
    resolvingChoice: state.resolvingChoice,
    pendingNextSceneId: state.pendingNextSceneId,
    errorRecoveryAction: state.errorRecoveryAction,
    loadingVisible: loadingOverlay.classList.contains("is-visible"),
    playerCount: state.playerSetup.count,
    players: getActivePlayers().map((player) => ({
      player,
      fighter: getAssignedFighter(player),
      device: getAssignedDevice(player),
      vote: state.votes[player],
      focus: state.focusChoice[player]
    })),
    choiceParticipants,
    choices: scene && scene.choices
      ? scene.choices.map((choice) => ({ key: choice.key, text: getChoiceText(choice) }))
      : [],
    finalChoiceKey: state.episodeBranchState.finalChoiceKey,
    resolutionMode: state.resolutionMode,
    resolvedCombatOutcome: state.resolvedCombatOutcome,
    skipHoldProgress: Number(state.skipHold.progress.toFixed(3)),
    skipHoldSource: state.skipHold.source,
    videoTime: Number.isFinite(video.currentTime) ? Number(video.currentTime.toFixed(3)) : 0
  });
}

const urlParams = new URLSearchParams(window.location.search);
const autotestScenarioId = urlParams.get("autotest");
const textDumpEnabled = urlParams.has("textdump") || Boolean(autotestScenarioId);
let textDumpNode = null;
let autotestSummary = null;

function ensureTextDumpNode() {
  if (!textDumpEnabled) {
    return null;
  }

  if (!textDumpNode) {
    textDumpNode = document.createElement("pre");
    textDumpNode.id = "text-dump";
    textDumpNode.hidden = true;
    document.body.appendChild(textDumpNode);
  }

  return textDumpNode;
}

function updateTextDump() {
  const node = ensureTextDumpNode();

  if (!node) {
    return;
  }

  node.textContent = JSON.stringify({
    state: JSON.parse(renderGameToText()),
    autotest: autotestSummary
  }, null, 2);
}

function clearAutotestPlaybackState() {
  clearChoiceTimer();
  resetVotes();
  state.waitingForVotes = false;
  state.resolvingChoice = false;
  state.selectedChoiceKey = null;
  state.randomResolution = false;
  state.resolutionMode = null;
  state.resolvedCombatOutcome = null;
}

function resolveAutotestChoice(sceneId, votesByPlayer) {
  state.currentSceneId = sceneId;
  clearAutotestPlaybackState();
  state.waitingForVotes = true;

  Object.entries(votesByPlayer).forEach(([player, choiceKey]) => {
    state.focusChoice[player] = choiceKey;
    state.votes[player] = choiceKey;
  });

  resolveSceneChoice();

  const result = {
    sceneId,
    votes: { ...state.votes },
    selectedChoiceKey: state.selectedChoiceKey,
    resolutionMode: state.resolutionMode,
    resolvedCombatOutcome: state.resolvedCombatOutcome,
    nextSceneId: state.pendingNextSceneId
  };

  clearChoiceTimer();
  state.waitingForVotes = false;
  state.resolvingChoice = false;
  return result;
}

function followAutotestScenePath(startSceneId, trace) {
  let sceneId = startSceneId;

  while (sceneId) {
    state.currentSceneId = sceneId;
    trace.push(sceneId);

    if (isFinalScene(sceneId)) {
      return sceneId;
    }

    const scene = getCurrentScene();

    if (!scene) {
      return null;
    }

    if (scene.endingResolver) {
      sceneId = resolveEpisodeEndingScene(sceneId);
      continue;
    }

    if (scene.choices) {
      return sceneId;
    }

    sceneId = scene.next || null;
  }

  return sceneId;
}

const UNKNOWN_AUTOTEST_SCENARIOS = {
  "unknown-kael-rebellion": {
    openingChoice: 1,
    expectedIntroTrace: ["right player 2", "scene 1-10"],
    choices: {
      "scene 1-10": { 1: 3, 2: 3 },
      "scene 12": { kael: 1, zyra: 1 },
      "scene 14-18": { kael: 1, zyra: 3 },
      "scene 20-23": { kael: 2, zyra: 2 },
      "scene 26-28": { 1: 3, 2: 3 },
      "scene 31": { kael: 3, zyra: 2 },
      "scene 33": { 1: 3, 2: 3 }
    },
    expectedFinalScene: "scene 34c",
    expectedAssignments: { 1: "kael", 2: "zyra" }
  },
  "unknown-zyra-sacrifice": {
    openingChoice: 2,
    expectedIntroTrace: ["right player 1", "left player 2", "scene 1-10"],
    choices: {
      "scene 1-10": { 1: 2, 2: 2 },
      "scene 12": { kael: 2, zyra: 3 },
      "scene 14-18": { kael: 3, zyra: 3 },
      "scene 20-23": { kael: 1, zyra: 2 },
      "scene 26-28": { 1: 2, 2: 2 },
      "scene 31": { kael: 1, zyra: 2 },
      "scene 33": { 1: 2, 2: 2 }
    },
    expectedFinalScene: "scene 34b",
    expectedAssignments: { 1: "zyra", 2: "kael" }
  },
  "unknown-kael-duel": {
    openingChoice: 1,
    expectedIntroTrace: ["right player 2", "scene 1-10"],
    choices: {
      "scene 1-10": { 1: 1, 2: 1 },
      "scene 12": { kael: 2, zyra: 1 },
      "scene 14-18": { kael: 3, zyra: 1 },
      "scene 20-23": { kael: 1, zyra: 1 },
      "scene 26-28": { 1: 1, 2: 1 },
      "scene 31": { kael: 2, zyra: 2 },
      "scene 33": { 1: 1, 2: 1 }
    },
    expectedFinalScene: "scene 34a",
    expectedAssignments: { 1: "kael", 2: "zyra" }
  }
};

function runUnknownAutotestScenario(scenarioId, definition) {
  const trace = [];

  selectEpisode("unknown");
  state.playerSetup.count = 2;
  updatePlayerSetupUi();
  state.started = true;
  resetEpisodeMindState();
  resetEpisodeBranchState();
  clearAutotestPlaybackState();
  syncGameplayPlayerUi();
  setOverlayVisibility(introScreen, false);
  setOverlayVisibility(endScreen, false);
  setOverlayVisibility(pauseScreen, false);
  setOverlayVisibility(errorScreen, false);
  hideLoading();

  const openingResolution = resolveAutotestChoice("left player 1", { 1: definition.openingChoice });
  const openingAssignments = { ...state.episodeBranchState.fighterByPlayer };
  let nextSceneId = openingResolution.nextSceneId;
  let currentSceneId = followAutotestScenePath(nextSceneId, trace);

  while (currentSceneId && !isFinalScene(currentSceneId)) {
    const scene = getCurrentScene();

    if (!scene || !scene.choices) {
      break;
    }

    const scriptedChoice = definition.choices[currentSceneId];
    if (!scriptedChoice) {
      throw new Error(`Missing autotest choice for ${currentSceneId}`);
    }

    let votesByPlayer = scriptedChoice;

    if (scene.choiceResolver === "unknown-combat") {
      votesByPlayer = {
        [state.episodeBranchState.playerByFighter.kael]: scriptedChoice.kael,
        [state.episodeBranchState.playerByFighter.zyra]: scriptedChoice.zyra
      };
    }

    const resolution = resolveAutotestChoice(currentSceneId, votesByPlayer);
    trace.push({
      sceneId: currentSceneId,
      selectedChoiceKey: resolution.selectedChoiceKey,
      resolutionMode: resolution.resolutionMode,
      resolvedCombatOutcome: resolution.resolvedCombatOutcome,
      nextSceneId: resolution.nextSceneId
    });
    nextSceneId = resolution.nextSceneId;
    currentSceneId = followAutotestScenePath(nextSceneId, trace);
  }

  state.currentSceneId = currentSceneId;
  updateSceneHud();
  updateFocusFeed();

  return {
    scenario: scenarioId,
    trace,
    finalSceneId: currentSceneId,
    finalChoiceKey: state.episodeBranchState.finalChoiceKey,
    assignments: { ...state.episodeBranchState.fighterByPlayer },
    expectedFinalScene: definition.expectedFinalScene,
    expectedAssignments: definition.expectedAssignments,
    expectedIntroTrace: definition.expectedIntroTrace,
    passed: currentSceneId === definition.expectedFinalScene
      && definition.expectedIntroTrace.every((sceneId, index) => trace[index] === sceneId)
      && state.episodeBranchState.fighterByPlayer[1] === definition.expectedAssignments[1]
      && state.episodeBranchState.fighterByPlayer[2] === definition.expectedAssignments[2]
  };
}

function runAutotestFromQuery() {
  if (!autotestScenarioId) {
    updateTextDump();
    return;
  }

  try {
    if (!UNKNOWN_AUTOTEST_SCENARIOS[autotestScenarioId]) {
      throw new Error(`Unknown autotest scenario: ${autotestScenarioId}`);
    }

    const scenarioResults = Object.entries(UNKNOWN_AUTOTEST_SCENARIOS).map(([scenarioId, definition]) =>
      runUnknownAutotestScenario(scenarioId, definition)
    );

    autotestSummary = {
      requestedScenario: autotestScenarioId,
      passed: scenarioResults.every((result) => result.passed),
      scenarios: scenarioResults
    };
  } catch (error) {
    autotestSummary = {
      scenario: autotestScenarioId,
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  updateTextDump();
}

window.render_game_to_text = renderGameToText;
window.advanceTime = (ms = 0) => {
  const seconds = Math.max(0, Number(ms) || 0) / 1000;

  if (seconds > 0 && !video.paused && Number.isFinite(video.duration)) {
    video.currentTime = Math.min(video.duration, video.currentTime + seconds);
  }

  return renderGameToText();
};

selectEpisode(state.selectedEpisodeId);
updatePlayerSetupUi();
updateInputPrompts();
updateSceneHud();
updateFocusFeed();
setDecisionMessage("Episode standing by.");
updateTextDump();
window.setTimeout(runAutotestFromQuery, 0);
window.requestAnimationFrame(pollGamepads);
