const {
  applyDeltas,
  beginMatch,
  buildEntryCards,
  buildVoteOptionsFromEntries,
  ensureTextEntries,
  moveToNextRoundOrFinal,
  roundLabel,
  sanitizeSubmission,
  tallyCategoryVotes,
} = require("./common");

function createMultiVoteGame(config) {
  function startRound(room, ctx) {
    const item = room.gameState.deck[room.gameState.roundIndex];
    const roles = config.assignRoles ? config.assignRoles(room, item, ctx) : {};
    room.gameState.current = {
      item,
      entries: {},
      votes: Object.fromEntries(config.categories.map((category) => [category.id, {}])),
      voteBreakdown: null,
      results: null,
      roles,
    };
    room.phase.id = config.submitPhaseId;
    ctx.startTimer(room, config.submitSeconds);
  }

  return {
    id: config.id,
    minPlayers: config.minPlayers || 2,
    startMatch(room, ctx) {
      beginMatch(room, ctx, config.id);
      startRound(room, ctx);
    },
    handlePlayerAction(room, participant, action, payload, ctx) {
      const current = room.gameState.current;
      if (!current) return;

      if (room.phase.id === config.submitPhaseId) {
        if (participant.role !== "player") throw new Error("აუდიტორია ამ ეტაპზე მხოლოდ ელოდება.");
        if (action !== "submit-text") throw new Error("ახლა ტექსტური პასუხია საჭირო.");
        const text = sanitizeSubmission(room, payload?.value, config.maxLength || 180);
        if (!text) throw new Error("ჯერ ტექსტი ჩაწერე.");
        current.entries[participant.id] = {
          text,
          sideLabel: config.getEntryLabel ? config.getEntryLabel(room, participant, current) : "",
        };
        return;
      }

      if (room.phase.id === config.votePhaseId) {
        if (action !== "submit-category-votes") throw new Error("ახლა ხმის მიცემის ეტაპია.");
        const votes = payload?.votes || {};
        config.categories.forEach((category) => {
          const choiceId = votes[category.id];
          if (!choiceId) return;
          if (!room.players.find((player) => player.id === choiceId)) throw new Error("არჩეული პასუხი ვერ მოიძებნა.");
          if (choiceId === participant.id) throw new Error("საკუთარ პასუხს ხმას ვერ მისცემ.");
          current.votes[category.id][participant.id] = choiceId;
        });
      }
    },
    advance(room, ctx) {
      const current = room.gameState.current;
      if (room.phase.id === config.submitPhaseId) {
        ensureTextEntries(room, config.fallbackPrefix || "პასუხი");
        room.phase.id = config.votePhaseId;
        ctx.startTimer(room, config.voteSeconds);
        return;
      }

      if (room.phase.id === config.votePhaseId) {
        const { deltas, breakdown } = tallyCategoryVotes(room, config.categories);
        current.voteBreakdown = breakdown;
        if (config.afterVote) {
          config.afterVote(room, deltas, breakdown, ctx);
        }
        applyDeltas(room, deltas);
        current.results = { deltas, breakdown };
        room.phase.id = config.revealPhaseId;
        ctx.clearTimer(room);
        return;
      }

      if (room.phase.id === config.revealPhaseId) {
        moveToNextRoundOrFinal(room, ctx, startRound);
      }
    },
    onTimerExpired(room, ctx) {
      this.advance(room, ctx);
    },
    buildHostStage(room) {
      const current = room.gameState.current;
      const roleNote = config.hostRoleNote ? config.hostRoleNote(room, current) : "";

      if (room.phase.id === config.submitPhaseId) {
        return {
          title: config.hostTitles.submit,
          subtitle: roundLabel(room),
          note: roleNote || config.getHostSubmitNote(room, current),
          media: config.getMedia(room, current),
          cards: [],
        };
      }

      if (room.phase.id === config.votePhaseId) {
        const cards = buildEntryCards(room, { includeAuthor: true });
        cards.forEach((card) => {
          card.body = "";
        });
        return {
          title: config.hostTitles.vote,
          subtitle: roundLabel(room),
          note: config.getHostVoteNote(room, current),
          media: config.getMedia(room, current),
          cards,
        };
      }

      if (room.phase.id === config.revealPhaseId) {
        const cards = buildEntryCards(room, { includeAuthor: true, includeCategories: true });
        if (config.decorateRevealCards) {
          config.decorateRevealCards(room, cards, current);
        }
        return {
          title: config.hostTitles.reveal,
          subtitle: roundLabel(room),
          note: config.getHostRevealNote(room, current),
          media: config.getMedia(room, current),
          cards,
        };
      }

      return null;
    },
    buildControllerState(room, participant) {
      const current = room.gameState.current;

      if (room.phase.id === config.submitPhaseId) {
        if (participant.role === "audience") {
          return {
            kind: "wait",
            title: "აუდიტორია ელოდება",
            subtitle: room.gameState.gameTitle,
            note: "ხმის მიცემის ეტაპზე შეძლებ ჩართვას.",
            media: config.getMedia(room, current),
          };
        }
        return {
          kind: "text",
          title: config.getPlayerSubmitTitle(room, participant, current),
          subtitle: roundLabel(room),
          note: config.getPlayerSubmitNote(room, participant, current),
          media: config.getMedia(room, current),
          fieldLabel: config.fieldLabel,
          placeholder: config.getPlaceholder(room, participant, current),
          maxLength: config.maxLength || 180,
          value: current.entries[participant.id]?.text || "",
          buttonLabel: current.entries[participant.id] ? "განახლება" : "გაგზავნა",
          actionId: "submit-text",
        };
      }

      if (room.phase.id === config.votePhaseId) {
        const currentVotes = Object.fromEntries(config.categories.map((category) => [category.id, current.votes[category.id]?.[participant.id] || ""]));
        return {
          kind: "category-vote",
          title: config.getPlayerVoteTitle(room, participant, current),
          subtitle: room.gameState.gameTitle,
          note: participant.role === "audience"
            ? "როგორც აუდიტორია, შეგიძლია ყველგან მისცე ხმა."
            : "საკუთარ პასუხს ხმა ვერ მიეცემა.",
          media: config.getMedia(room, current),
          categories: config.categories.map((category) => ({
            id: category.id,
            label: category.label,
            options: buildVoteOptionsFromEntries(room, participant.id),
          })),
          value: currentVotes,
          actionId: "submit-category-votes",
        };
      }

      if (room.phase.id === config.revealPhaseId) {
        return {
          kind: "reveal",
          title: config.hostTitles.reveal,
          subtitle: room.gameState.gameTitle,
          note: config.getPlayerRevealNote(room, participant, current),
          media: config.getMedia(room, current),
          cards: buildEntryCards(room, { includeAuthor: true, includeCategories: true }),
        };
      }

      return {
        kind: "wait",
        title: room.gameState.gameTitle,
        subtitle: roundLabel(room),
        note: "მოემზადე შემდეგი ეტაპისთვის.",
        media: config.getMedia(room, current),
      };
    },
  };
}

module.exports = {
  createMultiVoteGame,
};
