const {
  applyDeltas,
  beginMatch,
  buildVoteOptionsFromEntries,
  createScoreMap,
  moveToNextRoundOrFinal,
  roundLabel,
  sanitizeSubmission,
} = require("./common");

function startRound(room, ctx) {
  const item = room.gameState.deck[room.gameState.roundIndex];
  const truthHolder = room.players[room.gameState.roundIndex % room.players.length];

  room.gameState.current = {
    item,
    truthHolderId: truthHolder.id,
    answers: {},
    entries: {},
    votes: {},
    reveal: null,
  };
  room.phase.id = "detective-write";
  ctx.startTimer(room, 40);
}

function getMedia(current, truthHolder, isTruthHolder = false) {
  return {
    kind: "text",
    label: current.item.category,
    title: current.item.question,
    text: isTruthHolder
      ? `ფარული სიმართლე შენთანაა: ${current.item.secret}`
      : `ამ რაუნდში სიმართლე აქვს ${truthHolder?.name || "უცნობს"}.`,
  };
}

module.exports = {
  id: "lie-detective",
  minPlayers: 2,
  startMatch(room, ctx) {
    beginMatch(room, ctx, "lie-detective");
    startRound(room, ctx);
  },
  handlePlayerAction(room, participant, action, payload) {
    const current = room.gameState.current;

    if (room.phase.id === "detective-write") {
      if (participant.role !== "player") {
        throw new Error("აუდიტორია ჯერ მხოლოდ აკვირდება.");
      }
      if (action !== "submit-text") {
        throw new Error("ახლა მოკლე პასუხია საჭირო.");
      }

      const text = sanitizeSubmission(room, payload?.value, 140);
      if (!text) {
        throw new Error("ჯერ პასუხი ჩაწერე.");
      }

      current.answers[participant.id] = { text };
      return;
    }

    if (room.phase.id === "detective-vote") {
      if (action !== "submit-vote") {
        throw new Error("ახლა ხმის მიცემაა.");
      }
      if (!room.players.find((player) => player.id === payload?.choiceId)) {
        throw new Error("ეს პასუხი ვერ მოიძებნა.");
      }
      if (participant.role === "player" && payload?.choiceId === participant.id) {
        throw new Error("საკუთარ თავს ვერ აირჩევ.");
      }

      current.votes[participant.id] = payload.choiceId;
    }
  },
  advance(room, ctx) {
    const current = room.gameState.current;

    if (room.phase.id === "detective-write") {
      current.entries = Object.fromEntries(
        room.players.map((player) => [
          player.id,
          current.answers[player.id] || { text: `ვერსია ${player.name}` },
        ])
      );
      room.phase.id = "detective-vote";
      ctx.startTimer(room, 24);
      return;
    }

    if (room.phase.id === "detective-vote") {
      const deltas = createScoreMap(room);
      const fooledBy = {};

      room.players.forEach((player) => {
        fooledBy[player.id] = [];
      });

      Object.entries(current.votes).forEach(([voterId, choiceId]) => {
        if (choiceId === current.truthHolderId) {
          if (deltas[voterId] !== undefined) {
            deltas[voterId] += 520;
          }
          return;
        }

        if (deltas[choiceId] !== undefined) {
          const isAudienceVote = room.audience.some((entry) => entry.id === voterId);
          deltas[choiceId] += isAudienceVote ? 180 : 300;
          fooledBy[choiceId].push(voterId);
        }
      });

      const wrongVotes = Object.values(current.votes).filter((choiceId) => choiceId !== current.truthHolderId).length;
      deltas[current.truthHolderId] += 320 + wrongVotes * 120;

      applyDeltas(room, deltas);
      current.reveal = { deltas, fooledBy };
      room.phase.id = "detective-reveal";
      ctx.clearTimer(room);
      return;
    }

    if (room.phase.id === "detective-reveal") {
      moveToNextRoundOrFinal(room, ctx, startRound);
    }
  },
  onTimerExpired(room, ctx) {
    this.advance(room, ctx);
  },
  buildHostStage(room) {
    const current = room.gameState.current;
    const truthHolder = room.players.find((player) => player.id === current.truthHolderId);
    const media = getMedia(current, truthHolder);

    if (room.phase.id === "detective-write") {
      return {
        title: "დეტექტივები წერენ ვერსიებს",
        subtitle: roundLabel(room),
        note: "ერთი მოთამაშე ფარულ სიმართლეს იღებს, დანარჩენები კი იმავე თემაზე დამაჯერებელ ტყუილებს ქმნიან.",
        media,
        cards: [],
      };
    }

    if (room.phase.id === "detective-vote") {
      return {
        title: "ვის აქვს სიმართლე?",
        subtitle: roundLabel(room),
        note: "ყველა პასუხი ანონიმურია.",
        media,
        cards: room.players.map((player) => ({
          id: player.id,
          tag: "ვერსია",
          title: current.entries[player.id]?.text || "ვერსია",
          body: "",
          meta: "",
        })),
      };
    }

    return {
      title: "სიმართლე გაიხსნა",
      subtitle: roundLabel(room),
      note: `ფარული თემა: ${current.item.secret}`,
      media,
      cards: room.players.map((player) => ({
        id: player.id,
        tag: player.id === current.truthHolderId ? "სიმართლე" : player.name,
        title: current.entries[player.id]?.text || "პასუხი",
        body: player.id === current.truthHolderId
          ? `${player.name} ამ რაუნდის სიმართლის მფლობელი იყო.`
          : `მოტყუებულები: ${(current.reveal?.fooledBy?.[player.id] || [])
            .map((id) => room.players.find((entry) => entry.id === id)?.name || "აუდიტორია")
            .join(", ") || "არავინ"}`,
        meta: "",
        highlight: player.id === current.truthHolderId,
      })),
    };
  },
  buildControllerState(room, participant) {
    const current = room.gameState.current;
    const truthHolder = room.players.find((player) => player.id === current.truthHolderId);
    const isTruthHolder = participant.id === current.truthHolderId;
    const media = getMedia(current, truthHolder, isTruthHolder);

    if (room.phase.id === "detective-write") {
      if (participant.role === "audience") {
        return {
          kind: "wait",
          title: "აუდიტორია ელოდება",
          subtitle: room.gameState.gameTitle,
          note: "ხმის მიცემა ცოტა ხანში გაიხსნება.",
          media,
        };
      }

      return {
        kind: "text",
        title: isTruthHolder ? "უპასუხე ნამდვილ კვალით" : "შექმენი დამაჯერებელი ტყუილი",
        subtitle: roundLabel(room),
        note: isTruthHolder ? current.item.followup : "იმავე კატეგორიაში მოკლე ტყუილი დაწერე.",
        media,
        fieldLabel: "შენი პასუხი",
        placeholder: isTruthHolder
          ? "სწორ პასუხს ცოტა ბუნებრივად მოექეცი"
          : "რა დაწერდა სიმართლის მფლობელი?",
        maxLength: 140,
        value: current.answers[participant.id]?.text || "",
        buttonLabel: current.answers[participant.id] ? "განახლება" : "გაგზავნა",
        actionId: "submit-text",
      };
    }

    if (room.phase.id === "detective-vote") {
      return {
        kind: "vote",
        title: participant.role === "audience" ? "აუდიტორიის ეჭვი" : "ვის ენდობი სიმართლეს?",
        subtitle: room.gameState.gameTitle,
        note: "საკუთარ ვერსიას ვერ აირჩევ.",
        media,
        options: buildVoteOptionsFromEntries(room, participant.id),
        actionId: "submit-vote",
        value: current.votes[participant.id] || "",
      };
    }

    return {
      kind: "reveal",
      title: "სიმართლე გაიხსნა",
      subtitle: room.gameState.gameTitle,
      note: `ნამდვილი საიდუმლო იყო: ${current.item.secret}`,
      media,
      cards: [],
    };
  },
};
