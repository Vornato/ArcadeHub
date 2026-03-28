const { canonicalize, getVoteCount, randomChoice, rankScoreboard, sanitizeText, similarityScore, shuffle } = require("../utils");
const { moderateOrThrow } = require("../moderation");

function roundLabel(room) {
  return `რაუნდი ${room.gameState.roundIndex + 1}/${room.gameState.totalRounds}`;
}

function getActivePlayers(room) {
  return room.players;
}

function getAudience(room) {
  return room.settings.audienceEnabled ? room.audience : [];
}

function getVotingParticipants(room) {
  return [...room.players, ...getAudience(room)];
}

function beginMatch(room, ctx, gameId) {
  const gameMeta = ctx.getGameMeta(gameId);
  room.selectedGameId = gameId;
  room.status = "running";
  room.gameState = {
    gameId,
    gameTitle: gameMeta.title,
    roundIndex: 0,
    totalRounds: room.settings.rounds,
    history: [],
    deck: ctx.sampleContent(gameId, room.settings.rounds, room.settings),
    current: null,
    lastScore: {},
    lastWinners: [],
  };
}

function moveToNextRoundOrFinal(room, ctx, startRound) {
  const nextRoundIndex = room.gameState.roundIndex + 1;
  if (nextRoundIndex >= room.gameState.totalRounds) {
    room.phase.id = "final";
    ctx.clearTimer(room);
    room.status = "final";
    room.gameState.winners = rankScoreboard(room.players)
      .filter((player, index, list) => player.score === list[0].score)
      .map((player) => player.id);
    return;
  }
  room.gameState.roundIndex = nextRoundIndex;
  startRound(room, ctx);
}

function createScoreMap(room) {
  const scoreMap = {};
  room.players.forEach((player) => {
    scoreMap[player.id] = 0;
  });
  return scoreMap;
}

function applyDeltas(room, deltas) {
  room.players.forEach((player) => {
    player.score += deltas[player.id] || 0;
  });
  room.gameState.lastScore = deltas;
}

function sanitizeSubmission(room, rawText, maxLength) {
  return moderateOrThrow(sanitizeText(rawText, maxLength), room.settings.moderationEnabled);
}

function ensureAllPlayersSubmitted(room, bucketName) {
  const bucket = room.gameState.current?.[bucketName] || {};
  return room.players.every((player) => bucket[player.id]);
}

function safeEntryText(room, playerId, fallbackPrefix = "პასუხი") {
  return room.gameState.current.entries[playerId]?.text || `${fallbackPrefix} ${room.players.findIndex((player) => player.id === playerId) + 1}`;
}

function ensureTextEntries(room, fallbackPrefix = "პასუხი") {
  room.players.forEach((player) => {
    if (!room.gameState.current.entries[player.id]) {
      room.gameState.current.entries[player.id] = {
        text: `${fallbackPrefix} ${player.name}`,
        autoFilled: true,
      };
    }
  });
}

function tallyCategoryVotes(room, categories, { allowAudience = true, selfVoteBlocked = true } = {}) {
  const current = room.gameState.current;
  const deltas = createScoreMap(room);
  const breakdown = {};

  categories.forEach((category) => {
    breakdown[category.id] = {};
    const voteMap = current.votes?.[category.id] || {};
    Object.entries(voteMap).forEach(([voterId, targetId]) => {
      const voter = room.players.find((entry) => entry.id === voterId) || room.audience.find((entry) => entry.id === voterId);
      if (!voter) return;
      if (!allowAudience && voter.role === "audience") return;
      if (selfVoteBlocked && room.players.some((player) => player.id === voterId && player.id === targetId)) return;
      breakdown[category.id][targetId] = (breakdown[category.id][targetId] || 0) + 1;
      if (deltas[targetId] !== undefined) {
        deltas[targetId] += voter.role === "audience" ? Math.round(category.points * 0.6) : category.points;
      }
    });
  });

  return { deltas, breakdown };
}

function buildEntryCards(room, { includeAuthor = false, includeCategories = false } = {}) {
  const current = room.gameState.current;
  return room.players.map((player) => {
    const entry = current.entries[player.id];
    const categories = includeCategories && current.voteBreakdown
      ? Object.entries(current.voteBreakdown)
        .map(([categoryId, breakdown]) => `${categoryId}: ${breakdown[player.id] || 0}`)
        .join(" | ")
      : "";

    return {
      id: player.id,
      tag: includeAuthor ? `${player.avatar} ${player.name}` : "",
      title: entry?.text || "პასუხი არ მოვიდა",
      body: entry?.sideLabel || "",
      meta: categories,
      accent: player.color,
    };
  });
}

function buildVoteOptionsFromEntries(room, participantId, { includeSelf = false } = {}) {
  return room.players
    .filter((player) => includeSelf || player.id !== participantId)
    .map((player) => ({
      id: player.id,
      label: room.gameState.current.entries[player.id]?.text || safeEntryText(room, player.id),
      meta: room.gameState.current.entries[player.id]?.sideLabel || player.name,
      accent: player.color,
    }));
}

function countVotesForOption(voteMap, optionId) {
  return getVoteCount(voteMap, optionId);
}

function scoreSimilarityRanking(room, correctAnswer) {
  const deltas = createScoreMap(room);
  const ranking = room.players.map((player) => ({
    playerId: player.id,
    score: similarityScore(room.gameState.current.entries[player.id]?.text || "", correctAnswer),
  })).sort((left, right) => right.score - left.score);

  const points = [700, 450, 250];
  ranking.slice(0, 3).forEach((entry, index) => {
    deltas[entry.playerId] += points[index] || 100;
  });
  return { deltas, ranking };
}

function shuffleOptions(list) {
  return shuffle(list);
}

module.exports = {
  applyDeltas,
  beginMatch,
  buildEntryCards,
  buildVoteOptionsFromEntries,
  countVotesForOption,
  createScoreMap,
  ensureAllPlayersSubmitted,
  ensureTextEntries,
  getActivePlayers,
  getAudience,
  getVotingParticipants,
  moveToNextRoundOrFinal,
  randomChoice,
  roundLabel,
  sanitizeSubmission,
  similarityScore,
  scoreSimilarityRanking,
  shuffleOptions,
  tallyCategoryVotes,
};
