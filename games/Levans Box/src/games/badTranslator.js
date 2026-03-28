const {
  applyDeltas,
  beginMatch,
  countVotesForOption,
  createScoreMap,
  moveToNextRoundOrFinal,
  roundLabel,
  sanitizeSubmission,
  scoreSimilarityRanking,
} = require("./common");

function startRound(room, ctx) {
  const item = room.gameState.deck[room.gameState.roundIndex];
  room.gameState.current = {
    item,
    entries: {},
    funnyVotes: {},
    ranking: [],
    reveal: null,
  };
  room.phase.id = "translator-write";
  ctx.startTimer(room, 35);
}

module.exports = {
  id: "bad-translator",
  minPlayers: 2,
  startMatch(room, ctx) {
    beginMatch(room, ctx, "bad-translator");
    startRound(room, ctx);
  },
  handlePlayerAction(room, participant, action, payload) {
    const current = room.gameState.current;
    if (room.phase.id === "translator-write") {
      if (participant.role !== "player") throw new Error("აუდიტორია ჯერ მხოლოდ ელოდება.");
      if (action !== "submit-text") throw new Error("ახლა აღდგენა უნდა დაწერო.");
      const text = sanitizeSubmission(room, payload?.value, 140);
      if (!text) throw new Error("ჯერ ვერსია ჩაწერე.");
      current.entries[participant.id] = { text };
      return;
    }

    if (room.phase.id === "translator-vote") {
      if (action !== "submit-vote") throw new Error("ახლა სასაცილო ვერსიას აძლევ ხმას.");
      if (!room.players.find((player) => player.id === payload?.choiceId)) throw new Error("ეს ვერსია ვერ მოიძებნა.");
      if (payload?.choiceId === participant.id) throw new Error("საკუთარ პასუხს ხმას ვერ მისცემ.");
      current.funnyVotes[participant.id] = payload.choiceId;
    }
  },
  advance(room, ctx) {
    const current = room.gameState.current;
    if (room.phase.id === "translator-write") {
      room.players.forEach((player) => {
        if (!current.entries[player.id]) current.entries[player.id] = { text: "პასუხი დროზე არ მოვიდა." };
      });
      room.phase.id = "translator-vote";
      ctx.startTimer(room, 20);
      return;
    }

    if (room.phase.id === "translator-vote") {
      const { deltas, ranking } = scoreSimilarityRanking(room, current.item.original);
      Object.entries(current.funnyVotes).forEach(([voterId, targetId]) => {
        if (deltas[targetId] !== undefined) {
          deltas[targetId] += room.audience.some((entry) => entry.id === voterId) ? 100 : 160;
        }
      });
      applyDeltas(room, deltas);
      current.ranking = ranking;
      current.reveal = { deltas };
      room.phase.id = "translator-reveal";
      ctx.clearTimer(room);
      return;
    }

    if (room.phase.id === "translator-reveal") {
      moveToNextRoundOrFinal(room, ctx, startRound);
    }
  },
  onTimerExpired(room, ctx) {
    this.advance(room, ctx);
  },
  buildHostStage(room) {
    const current = room.gameState.current;
    const media = {
      kind: "path",
      label: "გაფუჭებული ფრაზა",
      title: current.item.mangled,
      text: "გამოიცანი, რა იყო საწყისად.",
      path: current.item.path,
    };

    if (room.phase.id === "translator-write") {
      return {
        title: "აღადგინე საწყისი ფრაზა",
        subtitle: roundLabel(room),
        note: "ახლა ყველანი წერენ საკუთარ საუკეთესო ვერსიას.",
        media,
        cards: [],
      };
    }

    if (room.phase.id === "translator-vote") {
      return {
        title: "ყველაზე სასაცილო შეცდომა",
        subtitle: roundLabel(room),
        note: "სიზუსტის ქულას სისტემა ცალკე დაითვლის.",
        media,
        cards: room.players.map((player) => ({
          id: player.id,
          tag: "ვერსია",
          title: current.entries[player.id].text,
          body: "",
          meta: "",
        })),
      };
    }

    return {
      title: "თარგმანის შედეგი",
      subtitle: roundLabel(room),
      note: `საწყისი ფრაზა იყო: ${current.item.original}`,
      media,
      cards: room.players.map((player) => {
        const rank = current.ranking.findIndex((entry) => entry.playerId === player.id);
        return {
          id: player.id,
          tag: rank >= 0 ? `მსგავსება ${current.ranking[rank].score}%` : "",
          title: current.entries[player.id].text,
          body: player.name,
          meta: `${countVotesForOption(current.funnyVotes, player.id)} მხიარული ხმა`,
        };
      }),
    };
  },
  buildControllerState(room, participant) {
    const current = room.gameState.current;
    const media = {
      kind: "path",
      label: "გაფუჭებული ფრაზა",
      title: current.item.mangled,
      text: "გაიხსენე, რა შეიძლებოდა ყოფილიყო საწყისი ტექსტი.",
      path: current.item.path,
    };

    if (room.phase.id === "translator-write") {
      if (participant.role === "audience") {
        return {
          kind: "wait",
          title: "აუდიტორია ელოდება",
          subtitle: room.gameState.gameTitle,
          note: "ცოტა ხანში მხიარულ ვერსიებს მისცემ ხმას.",
          media,
        };
      }
      return {
        kind: "text",
        title: "რა იყო ორიგინალი?",
        subtitle: roundLabel(room),
        note: "შეეცადე იყოს ახლოსაც და სასაცილოც.",
        media,
        fieldLabel: "შენი აღდგენა",
        placeholder: "ალბათ ასე ჟღერდა...",
        maxLength: 140,
        value: current.entries[participant.id]?.text || "",
        buttonLabel: current.entries[participant.id] ? "განახლება" : "გაგზავნა",
        actionId: "submit-text",
      };
    }

    if (room.phase.id === "translator-vote") {
      return {
        kind: "vote",
        title: "აირჩიე ყველაზე სასაცილო ვერსია",
        subtitle: room.gameState.gameTitle,
        note: "საკუთარ ვარიანტს ვერ აირჩევ.",
        media,
        options: room.players
          .filter((player) => player.id !== participant.id)
          .map((player) => ({
            id: player.id,
            label: current.entries[player.id].text,
            meta: "",
          })),
        actionId: "submit-vote",
        value: current.funnyVotes[participant.id] || "",
      };
    }

    return {
      kind: "reveal",
      title: "სწორი ფრაზა გამოჩნდა",
      subtitle: room.gameState.gameTitle,
      note: `ორიგინალი იყო: ${current.item.original}`,
      media,
      cards: [],
    };
  },
};
