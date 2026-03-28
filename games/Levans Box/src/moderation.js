const { canonicalize } = require("./utils");

const BLOCKED_WORDS = [
  "ცუდსიტყვა1",
  "ცუდსიტყვა2",
  "idiot",
  "stupid",
];

function containsBlockedWord(text) {
  const normalized = canonicalize(text);
  return BLOCKED_WORDS.some((word) => normalized.includes(canonicalize(word)));
}

function moderateOrThrow(text, enabled) {
  if (!enabled) return text;
  if (containsBlockedWord(text)) {
    throw new Error("ამ რეჟიმში ეს ტექსტი ვერ გავატარეთ. სცადე უფრო რბილი ვერსია.");
  }
  return text;
}

module.exports = {
  moderateOrThrow,
};
