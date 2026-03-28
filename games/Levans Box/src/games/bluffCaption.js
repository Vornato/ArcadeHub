const {
  applyDeltas,
  beginMatch,
  countVotesForOption,
  createScoreMap,
  getVotingParticipants,
  moveToNextRoundOrFinal,
  roundLabel,
  sanitizeSubmission,
  shuffleOptions,
} = require("./common");

function makeMedia(item) {
  return {
    kind: "illustration",
    label: item.label,
    title: item.title,
    text: item.detail,
    emojiLine: item.emojiLine,
  };
}

function startRound(room, ctx) {
  const item = room.gameState.deck[room.gameState.roundIndex];
  room.gameState.current = {
    item,
    submissions: {},
    options: [],
    votes: {},
    funnyVotes: {},
    reveal: null,
  };
  room.phase.id = "bluff-write";
  ctx.startTimer(room, 40);
}

function ensureOptions(room) {
  const current = room.gameState.current;
  const fakeOptions = room.players.map((player) => ({
    id: `fake-${player.id}`,
    text: current.submissions[player.id] || `უცნაური ახსნა ${player.name}`,
    authorId: player.id,
    isTruth: false,
  }));
  current.options = shuffleOptions([
    {
      id: "truth",
      text: current.item.truth,
      authorId: null,
      isTruth: true,
    },
    ...fakeOptions,
  ]);
}

module.exports = {
  id: "bluff-caption",
  minPlayers: 2,
  startMatch(room, ctx) {
    beginMatch(room, ctx, "bluff-caption");
    startRound(room, ctx);
  },
  handlePlayerAction(room, participant, action, payload) {
    const current = room.gameState.current;
    if (room.phase.id === "bluff-write") {
      if (participant.role !== "player") throw new Error("აუდიტორია ამ ეტაპზე მხოლოდ ელოდება.");
      if (action !== "submit-text") throw new Error("ახლა ყალბი წარწერაა საჭირო.");
      const text = sanitizeSubmission(room, payload?.value, 110);
      if (!text) throw new Error("ჯერ ყალბი წარწერა ჩაწერე.");
      if (text === current.item.truth) throw new Error("ნამდვილ წარწერას ზუსტად ვერ დააკოპირებ.");
      current.submissions[participant.id] = text;
      return;
    }

    if (room.phase.id === "bluff-vote") {
      if (action !== "submit-vote") throw new Error("ახლა ხმის მიცემაა.");
      const option = current.options.find((entry) => entry.id === payload?.choiceId);
      if (!option) throw new Error("ეს ვარიანტი ვერ მოიძებნა.");
      if (option.authorId && option.authorId === participant.id) throw new Error("საკუთარ ვარიანტს ხმას ვერ მისცემ.");
      current.votes[participant.id] = option.id;
      return;
    }

    if (room.phase.id === "bluff-funny") {
      if (action !== "submit-vote") throw new Error("ახლა მხიარული ხმის მიცემაა.");
      const option = current.options.find((entry) => entry.id === payload?.choiceId && !entry.isTruth);
      if (!option) throw new Error("ეს სასაცილო ვარიანტი ვერ მოიძებნა.");
      if (option.authorId === participant.id) throw new Error("საკუთარ ვარიანტს ხმას ვერ მისცემ.");
      current.funnyVotes[participant.id] = option.id;
    }
  },
  advance(room, ctx) {
    const current = room.gameState.current;

    if (room.phase.id === "bluff-write") {
      ensureOptions(room);
      room.phase.id = "bluff-vote";
      ctx.startTimer(room, 25);
      return;
    }

    if (room.phase.id === "bluff-vote") {
      if (room.settings.funnyVoteEnabled) {
        room.phase.id = "bluff-funny";
        ctx.startTimer(room, 18);
        return;
      }
      const deltas = createScoreMap(room);
      const fooledBy = {};
      room.players.forEach((player) => {
        fooledBy[player.id] = [];
      });
      Object.entries(current.votes).forEach(([voterId, optionId]) => {
        const option = current.options.find((entry) => entry.id === optionId);
        if (!option) return;
        if (option.isTruth) {
          if (deltas[voterId] !== undefined) deltas[voterId] += 520;
        } else if (option.authorId && deltas[option.authorId] !== undefined) {
          deltas[option.authorId] += room.audience.some((entry) => entry.id === voterId) ? 180 : 320;
          fooledBy[option.authorId].push(voterId);
        }
      });
      applyDeltas(room, deltas);
      current.reveal = { deltas, fooledBy };
      room.phase.id = "bluff-reveal";
      ctx.clearTimer(room);
      return;
    }

    if (room.phase.id === "bluff-funny") {
      const deltas = createScoreMap(room);
      const fooledBy = {};
      room.players.forEach((player) => {
        fooledBy[player.id] = [];
      });
      Object.entries(current.votes).forEach(([voterId, optionId]) => {
        const option = current.options.find((entry) => entry.id === optionId);
        if (!option) return;
        if (option.isTruth) {
          if (deltas[voterId] !== undefined) deltas[voterId] += 520;
        } else if (option.authorId && deltas[option.authorId] !== undefined) {
          deltas[option.authorId] += room.audience.some((entry) => entry.id === voterId) ? 180 : 320;
          fooledBy[option.authorId].push(voterId);
        }
      });
      Object.entries(current.funnyVotes).forEach(([voterId, optionId]) => {
        const option = current.options.find((entry) => entry.id === optionId);
        if (!option?.authorId || deltas[option.authorId] === undefined) return;
        deltas[option.authorId] += room.audience.some((entry) => entry.id === voterId) ? 120 : 180;
      });
      applyDeltas(room, deltas);
      current.reveal = { deltas, fooledBy };
      room.phase.id = "bluff-reveal";
      ctx.clearTimer(room);
      return;
    }

    if (room.phase.id === "bluff-reveal") {
      moveToNextRoundOrFinal(room, ctx, startRound);
    }
  },
  onTimerExpired(room, ctx) {
    this.advance(room, ctx);
  },
  buildHostStage(room) {
    const current = room.gameState.current;
    const media = makeMedia(current.item);

    if (room.phase.id === "bluff-write") {
      return {
        title: "დაწერე ყალბი წარწერა",
        subtitle: roundLabel(room),
        note: `${Object.keys(current.submissions).length}/${room.players.length} მოთამაშემ უკვე გაგზავნა პასუხი.`,
        media,
        cards: [],
      };
    }

    if (room.phase.id === "bluff-vote") {
      return {
        title: "აირჩიე ნამდვილი ახსნა",
        subtitle: roundLabel(room),
        note: "ყალბი პასუხების ავტორები დამალულია.",
        media,
        cards: current.options.map((option, index) => ({
          id: option.id,
          tag: option.isTruth ? "ნამდვილიც აქაა" : `ვარიანტი ${index + 1}`,
          title: option.text,
          body: "",
          meta: "",
        })),
      };
    }

    if (room.phase.id === "bluff-funny") {
      return {
        title: "ახლა ყველაზე სასაცილო",
        subtitle: roundLabel(room),
        note: "მეორე ხმა ბონუს ქულას იძლევა.",
        media,
        cards: current.options.filter((option) => !option.isTruth).map((option) => ({
          id: option.id,
          tag: "ყალბი",
          title: option.text,
          body: "",
          meta: "",
        })),
      };
    }

    return {
      title: "ნამდვილი პასუხის გახსნა",
      subtitle: roundLabel(room),
      note: `ნამდვილი პასუხი: ${current.item.truth}`,
      media,
      cards: current.options.map((option) => ({
        id: option.id,
        tag: option.isTruth ? "ნამდვილი" : option.authorId ? room.players.find((player) => player.id === option.authorId)?.name || "უცნობი" : "",
        title: option.text,
        body: option.authorId ? `მოტყუებულები: ${(current.reveal?.fooledBy?.[option.authorId] || []).map((id) => room.players.find((player) => player.id === id)?.name || "აუდიტორია").join(", ") || "არავინ"}` : "სწორი არჩევანი",
        meta: `${countVotesForOption(current.votes, option.id)} ხმა`,
        highlight: option.isTruth,
      })),
    };
  },
  buildControllerState(room, participant) {
    const current = room.gameState.current;
    const media = makeMedia(current.item);

    if (room.phase.id === "bluff-write") {
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
        title: "შექმენი დამაჯერებელი ტყუილი",
        subtitle: roundLabel(room),
        note: "მოკლე, სასაცილო ან ძალიან დამაჯერებელი წარწერა დაწერე.",
        media,
        fieldLabel: "ყალბი წარწერა",
        placeholder: "რას ნიშნავს ეს ვითომ სინამდვილეში?",
        maxLength: 110,
        value: current.submissions[participant.id] || "",
        buttonLabel: current.submissions[participant.id] ? "განახლება" : "გაგზავნა",
        actionId: "submit-text",
      };
    }

    if (room.phase.id === "bluff-vote") {
      return {
        kind: "vote",
        title: participant.role === "audience" ? "აუდიტორიის ხმა" : "იპოვე ნამდვილი პასუხი",
        subtitle: room.gameState.gameTitle,
        note: participant.role === "audience" ? "შენი ხმა ქულებზეც აისახება." : "საკუთარ ვარიანტს ვერ აირჩევ.",
        media,
        options: current.options
          .filter((option) => option.authorId !== participant.id)
          .map((option) => ({
            id: option.id,
            label: option.text,
            meta: option.isTruth ? "ერთ-ერთი ვარიანტი" : "",
          })),
        actionId: "submit-vote",
        value: current.votes[participant.id] || "",
      };
    }

    if (room.phase.id === "bluff-funny") {
      return {
        kind: "vote",
        title: "აირჩიე ყველაზე სასაცილო",
        subtitle: room.gameState.gameTitle,
        note: "ახლა მხოლოდ ბონუს-ხმაა.",
        media,
        options: current.options
          .filter((option) => !option.isTruth && option.authorId !== participant.id)
          .map((option) => ({
            id: option.id,
            label: option.text,
            meta: "",
          })),
        actionId: "submit-vote",
        value: current.funnyVotes[participant.id] || "",
      };
    }

    return {
      kind: "reveal",
      title: "ნამდვილი პასუხი გამოჩნდა",
      subtitle: room.gameState.gameTitle,
      note: `სწორი ტექსტი იყო: ${current.item.truth}`,
      media,
      cards: [],
    };
  },
};
