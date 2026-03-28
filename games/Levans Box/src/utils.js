const crypto = require("crypto");
const os = require("os");

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PLAYER_COLORS = ["#ff9f68", "#7bdff2", "#ffd166", "#c0f55d", "#ff70a6", "#b8c0ff", "#06d6a0", "#f9844a"];
const PLAYER_AVATARS = ["🪩", "🎈", "🎭", "🦆", "🍕", "🧃", "🎲", "🎺", "🪴", "🛰️", "🐙", "🍀"];

function randomId() {
  return crypto.randomUUID();
}

function clampText(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function sanitizeName(value) {
  const cleaned = clampText(value, 24);
  return cleaned || "მოთამაშე";
}

function sanitizeText(value, maxLength = 180) {
  return clampText(value, maxLength);
}

function canonicalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shuffle(list) {
  const result = [...list];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function sample(list, count) {
  return shuffle(list).slice(0, count);
}

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function createRoomCode(existing) {
  let code = "";
  do {
    code = Array.from({ length: 5 }, () => ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)]).join("");
  } while (existing.has(code));
  return code;
}

function assignPlayerDecor(index) {
  return {
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    avatar: PLAYER_AVATARS[index % PLAYER_AVATARS.length],
  };
}

function scoreLanAddress(address) {
  if (/^192\.168\./.test(address)) return 0;
  if (/^10\./.test(address)) return 1;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) return 2;
  if (/^169\.254\./.test(address)) return 8;
  return 3;
}

function getLanAddresses(port) {
  const interfaces = os.networkInterfaces();
  const urls = [];
  for (const [name, entries] of Object.entries(interfaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (!entry || entry.internal || entry.family !== "IPv4") continue;
      urls.push({
        name,
        address: entry.address,
        score: scoreLanAddress(entry.address),
        url: `http://${entry.address}:${port}`,
      });
    }
  }
  return urls
    .sort((left, right) => left.score - right.score || left.name.localeCompare(right.name) || left.address.localeCompare(right.address))
    .map((entry) => entry.url);
}

function buildShareBase(req, port) {
  const hostHeader = String(req?.headers?.host || "").trim();
  if (hostHeader) {
    const lowerHost = hostHeader.toLowerCase();
    if (!lowerHost.startsWith("localhost") && !lowerHost.startsWith("127.0.0.1") && !lowerHost.startsWith("0.0.0.0")) {
      return `http://${hostHeader}`;
    }
  }
  return getLanAddresses(port)[0] || `http://127.0.0.1:${port}`;
}

function similarityScore(left, right) {
  const a = canonicalize(left).split(" ").filter(Boolean);
  const b = canonicalize(right).split(" ").filter(Boolean);
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let shared = 0;
  for (const word of setA) {
    if (setB.has(word)) shared += 1;
  }
  const ratio = shared / Math.max(setA.size, setB.size);
  return Math.round(ratio * 100);
}

function ensureUniqueName(existingNames, desiredName) {
  const baseName = sanitizeName(desiredName);
  const normalized = new Set(existingNames.map((name) => canonicalize(name)));
  if (!normalized.has(canonicalize(baseName))) return baseName;
  let index = 2;
  let candidate = `${baseName} ${index}`;
  while (normalized.has(canonicalize(candidate))) {
    index += 1;
    candidate = `${baseName} ${index}`;
  }
  return candidate;
}

function getVoteCount(votes, targetId) {
  return Object.values(votes || {}).filter((value) => value === targetId).length;
}

function rankScoreboard(players) {
  return [...players].sort((left, right) => right.score - left.score || left.joinedAt - right.joinedAt);
}

module.exports = {
  assignPlayerDecor,
  buildShareBase,
  canonicalize,
  clampText,
  createRoomCode,
  ensureUniqueName,
  getLanAddresses,
  getVoteCount,
  randomChoice,
  randomId,
  rankScoreboard,
  sample,
  sanitizeName,
  sanitizeText,
  shuffle,
  similarityScore,
};
