const { applyDeltas, beginMatch, createScoreMap, moveToNextRoundOrFinal, roundLabel, sanitizeSubmission, similarityScore } = require("./common");
const { randomChoice } = require("../utils");

const SABOTEUR_STYLES = [
  "დაემსგავსე ადამიანს, რომელსაც ზედმეტი თავდაჯერება აქვს.",
  "უპასუხე ოდნავ გვერდულად, მაგრამ ისე, რომ აშკარა არ იყო.",
  "ეცადე, ჯგუფი არასწორი მიმართულებით წაიყვანო, ზედმეტი თეატრის გარეშე.",
];

function startQuestion(room, ctx) {
  const item = room.gameState.deck[room.gameState.roundIndex];
  room.gameState.current = {
    item,
    answers: {},
    reveal: null,
    suspectVotes: room.gameState.current?.suspectVotes || {},
  };
  room.phase.id = "saboteur-question";
  ctx.startTimer(room, 32);
}

module.exports = {
  id: "secret-saboteur",
  minPlayers: 3,
  startMatch(room, ctx) {
    beginMatch(room, ctx, "secret-saboteur");
    room.gameState.saboteurId = randomChoice(room.players).id;
    room.gameState.saboteurStyle = randomChoice(SABOTEUR_STYLES);
    startQuestion(room, ctx);
  },
  handlePlayerAction(room, participant, action, payload) {
    const current = room.gameState.current;
    if (room.phase.id === "saboteur-question") {
      if (participant.role !== "player") throw new Error("აუდიტორია ჯერ მხოლოდ აკვირდება.");
      if (action !== "submit-text") throw new Error("ახლა კითხვაზე პასუხია საჭირო.");
      const text = sanitizeSubmission(room, payload?.value, 130);
      if (!text) throw new Error("ჯერ პასუხი ჩაწერე.");
      current.answers[participant.id] = text;
      return;
    }

    if (room.phase.id === "saboteur-vote") {
      if (action !== "submit-vote") throw new Error("ახლა ეჭვმიტანილს ირჩევ.");
      if (!room.players.find((player) => player.id === payload?.choiceId)) throw new Error("ეს მოთამაშე ვერ მოიძებნა.");
      if (payload?.choiceId === participant.id) throw new Error("საკუთარ თავს ვერ აირჩევ.");
      room.gameState.current.suspectVotes[participant.id] = payload.choiceId;
    }
  },
  advance(room, ctx) {
    const current = room.gameState.current;

    if (room.phase.id === "saboteur-question") {
      room.players.forEach((player) => {
        if (!current.answers[player.id]) current.answers[player.id] = "პასუხი დროზე არ მოვიდა.";
      });

      const deltas = createScoreMap(room);
      if (current.item.type === "factual" && current.item.reference) {
        room.players.forEach((player) => {
          if (player.id === room.gameState.saboteurId) return;
          const score = similarityScore(current.answers[player.id], current.item.reference);
          if (score >= 90) deltas[player.id] += 220;
          else if (score >= 50) deltas[player.id] += 120;
        });
      }

      applyDeltas(room, deltas);
      current.reveal = { deltas };
      room.phase.id = "saboteur-question-reveal";
      ctx.clearTimer(room);
      return;
    }

    if (room.phase.id === "saboteur-question-reveal") {
      if (room.gameState.roundIndex + 1 >= room.gameState.totalRounds) {
        room.phase.id = "saboteur-vote";
        ctx.startTimer(room, 28);
        return;
      }
      moveToNextRoundOrFinal(room, ctx, startQuestion);
      if (room.status === "final") {
        room.status = "running";
        room.phase.id = "saboteur-vote";
        ctx.startTimer(room, 28);
      }
      return;
    }

    if (room.phase.id === "saboteur-vote") {
      const deltas = createScoreMap(room);
      const tally = {};
      room.players.forEach((player) => {
        tally[player.id] = 0;
      });
      Object.values(room.gameState.current.suspectVotes).forEach((targetId) => {
        tally[targetId] += 1;
      });

      const highest = Math.max(...Object.values(tally));
      const suspects = Object.keys(tally).filter((playerId) => tally[playerId] === highest);
      const saboteurId = room.gameState.saboteurId;
      const caught = suspects.includes(saboteurId);

      if (caught) {
        Object.entries(room.gameState.current.suspectVotes).forEach(([voterId, targetId]) => {
          if (targetId === saboteurId && deltas[voterId] !== undefined) deltas[voterId] += 900;
        });
      } else {
        deltas[saboteurId] += 1600;
      }

      applyDeltas(room, deltas);
      current.reveal = {
        deltas,
        tally,
        saboteurId,
        caught,
      };
      room.phase.id = "saboteur-reveal";
      ctx.clearTimer(room);
      return;
    }

    if (room.phase.id === "saboteur-reveal") {
      room.phase.id = "final";
      room.status = "final";
    }
  },
  onTimerExpired(room, ctx) {
    this.advance(room, ctx);
  },
  buildHostStage(room) {
    const current = room.gameState.current;
    if (room.phase.id === "saboteur-question") {
      return {
        title: "ვინ აფუჭებს რაუნდს?",
        subtitle: roundLabel(room),
        note: `${current.item.category}. ერთი მოთამაშე ცდილობს გუნდი ცუდ პასუხამდე მიიყვანოს.`,
        media: {
          kind: "text",
          label: current.item.category,
          title: "კითხვა",
          text: current.item.prompt,
        },
        cards: [],
      };
    }

    if (room.phase.id === "saboteur-question-reveal") {
      return {
        title: "პასუხების შეჯამება",
        subtitle: roundLabel(room),
        note: current.item.reference ? `სისტემური მინიშნება: ${current.item.reference}` : "აქ ქულა უფრო ბუნებრივი პასუხისთვის იყო.",
        media: {
          kind: "text",
          label: current.item.category,
          title: current.item.prompt,
          text: "საბოტიორი ჯერ ისევ დამალულია.",
        },
        cards: room.players.map((player) => ({
          id: player.id,
          tag: player.name,
          title: current.answers[player.id],
          body: player.id === room.gameState.saboteurId ? "აქ სადღაც ფარული გეგმაცაა." : "",
          meta: `${current.reveal?.deltas?.[player.id] || 0} ქულა`,
        })),
      };
    }

    if (room.phase.id === "saboteur-vote") {
      return {
        title: "აირჩიე საბოტიორი",
        subtitle: room.gameState.gameTitle,
        note: "ყველა წინა პასუხი გაიხსენე და ახლა დაასახელე ეჭვმიტანილი.",
        media: {
          kind: "text",
          label: "ფინალური ბრალდება",
          title: "ვინ აფუჭებდა გუნდს?",
          text: "აუდიტორიაც ერთვება ეჭვის ეტაპში.",
        },
        cards: room.players.map((player) => ({
          id: player.id,
          tag: player.avatar,
          title: player.name,
          body: "",
          meta: `${player.score} ქულა`,
        })),
      };
    }

    return {
      title: "საბოტიორი გაიხსნა",
      subtitle: room.gameState.gameTitle,
      note: current.reveal?.caught ? "გუნდმა საბოტიორი დააფიქსირა." : "საბოტიორმა ამჯერად გაძვრა.",
      media: {
        kind: "text",
        label: "ფარული როლი",
        title: room.players.find((player) => player.id === room.gameState.saboteurId)?.name || "უცნობი",
        text: room.gameState.saboteurStyle,
      },
      cards: room.players.map((player) => ({
        id: player.id,
        tag: player.id === room.gameState.saboteurId ? "საბოტიორი" : player.name,
        title: player.name,
        body: `მიღებული ხმები: ${current.reveal?.tally?.[player.id] || 0}`,
        meta: `${current.reveal?.deltas?.[player.id] || 0} ქულა`,
        highlight: player.id === room.gameState.saboteurId,
      })),
    };
  },
  buildControllerState(room, participant) {
    const current = room.gameState.current;
    const isSaboteur = participant.id === room.gameState.saboteurId;

    if (room.phase.id === "saboteur-question") {
      if (participant.role === "audience") {
        return {
          kind: "wait",
          title: "აუდიტორია აკვირდება",
          subtitle: room.gameState.gameTitle,
          note: "ბრალდების ეტაპზე შენც შეძლებ ხმის მიცემას.",
          media: {
            kind: "text",
            label: current.item.category,
            title: current.item.prompt,
            text: "",
          },
        };
      }
      return {
        kind: "text",
        title: isSaboteur ? "აფუჭე ისე, რომ ვერ დაგიჭირონ" : "უპასუხე ბუნებრივად",
        subtitle: roundLabel(room),
        note: isSaboteur ? room.gameState.saboteurStyle : "უპასუხე ისე, როგორც მართლა ფიქრობ ან იცი.",
        media: {
          kind: "text",
          label: current.item.category,
          title: current.item.prompt,
          text: isSaboteur && current.item.reference ? `სისტემა ვარაუდობს პასუხს: ${current.item.reference}` : "",
        },
        fieldLabel: "შენი პასუხი",
        placeholder: "მოკლე პასუხი",
        maxLength: 130,
        value: current.answers[participant.id] || "",
        buttonLabel: current.answers[participant.id] ? "განახლება" : "გაგზავნა",
        actionId: "submit-text",
      };
    }

    if (room.phase.id === "saboteur-question-reveal") {
      return {
        kind: "reveal",
        title: "პასუხების შეჯამება",
        subtitle: room.gameState.gameTitle,
        note: "ეჭვი ჯერ კიდევ ცოცხალია.",
        media: {
          kind: "text",
          label: current.item.category,
          title: current.item.prompt,
          text: "",
        },
        cards: [],
      };
    }

    if (room.phase.id === "saboteur-vote") {
      return {
        kind: "vote",
        title: "ვის ამხელ საბოტაჟში?",
        subtitle: room.gameState.gameTitle,
        note: "საკუთარ თავს ვერ აირჩევ.",
        media: {
          kind: "text",
          label: "ფინალური არჩევანი",
          title: "აირჩიე ეჭვმიტანილი",
          text: "",
        },
        options: room.players
          .filter((player) => player.id !== participant.id)
          .map((player) => ({
            id: player.id,
            label: player.name,
            meta: `${player.avatar} ${player.score} ქულა`,
          })),
        actionId: "submit-vote",
        value: room.gameState.current.suspectVotes[participant.id] || "",
      };
    }

    return {
      kind: "reveal",
      title: "საბოტიორი გაიხსნა",
      subtitle: room.gameState.gameTitle,
      note: current.reveal?.caught ? "გუნდმა სწორი ეჭვი დააფიქსირა." : "საბოტაჟი წარმატებით დამალეს.",
      media: {
        kind: "text",
        label: "ფარული როლი",
        title: room.players.find((player) => player.id === room.gameState.saboteurId)?.name || "",
        text: room.gameState.saboteurStyle,
      },
      cards: [],
    };
  },
};
