const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

function readJson(fileName, fallback = []) {
  try {
    const fullPath = path.join(DATA_DIR, fileName);
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    console.warn(`[Levans Box] JSON ჩაიტვირთა fallback-ით: ${fileName}`, error.message);
    return fallback;
  }
}

const manifest = readJson("manifest.json", []).map((entry) => ({
  ...entry,
  videoPath: entry.videoPath || `/videos/game bg ${entry.slot}.mp4`,
}));

const content = {
  "bluff-caption": readJson("bluff-caption.json", []),
  "lie-detective": readJson("lie-detective.json", []),
  "pitch-panic": readJson("pitch-panic.json", []),
  "meme-court": readJson("meme-court.json", []),
  "secret-saboteur": readJson("secret-saboteur.json", []),
  "bad-translator": readJson("bad-translator.json", []),
  "draw-and-deceive": readJson("draw-and-deceive.json", []),
  "survive-scenario": readJson("survive-scenario.json", []),
};

function getManifest() {
  return manifest;
}

function getGameMeta(gameId) {
  return manifest.find((entry) => entry.id === gameId) || manifest[0];
}

function getGameContent(gameId, { familyFriendly = true } = {}) {
  const list = content[gameId] || [];
  if (!familyFriendly) return list;
  return list.filter((entry) => entry.familySafe !== false);
}

module.exports = {
  getGameContent,
  getGameMeta,
  getManifest,
};
