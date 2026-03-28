const bluffCaption = require("./bluffCaption");
const lieDetective = require("./lieDetective");
const pitchPanic = require("./pitchPanic");
const memeCourt = require("./memeCourt");
const secretSaboteur = require("./secretSaboteur");
const badTranslator = require("./badTranslator");
const drawAndDeceive = require("./drawAndDeceive");
const surviveScenario = require("./surviveScenario");

const gameRegistry = {
  "bluff-caption": bluffCaption,
  "lie-detective": lieDetective,
  "pitch-panic": pitchPanic,
  "meme-court": memeCourt,
  "secret-saboteur": secretSaboteur,
  "bad-translator": badTranslator,
  "draw-and-deceive": drawAndDeceive,
  "survive-scenario": surviveScenario,
};

function getGameModule(gameId) {
  return gameRegistry[gameId] || bluffCaption;
}

module.exports = {
  getGameModule,
};
