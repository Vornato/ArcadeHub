const {
  applyDeltas,
  beginMatch,
  countVotesForOption,
  createScoreMap,
  moveToNextRoundOrFinal,
  roundLabel,
  sanitizeSubmission,
  shuffleOptions,
} = require("./common");

const BLANK_DRAWING = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'%3E%3Crect width='640' height='420' rx='28' fill='%2313243b'/%3E%3Ctext x='320' y='210' fill='%23fff6e8' font-size='28' text-anchor='middle' font-family='sans-serif'%3E%E1%83%9C%E1%83%90%E1%83%AE%E1%83%90%E1%83%A2%E1%83%98%20%E1%83%93%E1%83%A0%E1%83%9D%E1%83%96%E1%83%94%20%E1%83%90%E1%83%A0%20%E1%83%9B%E1%83%9D%E1%83%95%E1%83%98%E1%83%93%E1%83%90%3C/text%3E%3C/svg%3E";

function startRound(room, ctx) {
  const item = room.gameState.deck[room.gameState.roundIndex];
  const artist = room.players[room.gameState.roundIndex % room.players.length];
  room.gameState.current = {
    item,
    artistId: artist.id,
    drawingDataUrl: "",
    fakeTitles: {},
    options: [],
    votes: {},
    reveal: null,
  };
  room.phase.id = "draw-write";
  ctx.startTimer(room, 36);
}

function ensureOptions(room) {
  const current = room.gameState.current;
  current.options = shuffleOptions([
    {
      id: "truth",
      text: current.item.prompt,
      authorId: current.artistId,
      isTruth: true,
    },
    ...room.players
      .filter((player) => player.id !== current.artistId)
      .map((player) => ({
        id: `fake-${player.id}`,
        text: current.fakeTitles[player.id] || `უცნაური სათაური ${player.name}`,
        authorId: player.id,
        isTruth: false,
      })),
  ]);
}

module.exports = {
  id: "draw-and-deceive",
  minPlayers: 2,
  startMatch(room, ctx) {
    beginMatch(room, ctx, "draw-and-deceive");
    startRound(room, ctx);
  },
  handlePlayerAction(room, participant, action, payload) {
    const current = room.gameState.current;

    if (room.phase.id === "draw-write") {
      if (participant.id !== current.artistId) throw new Error("ამ რაუნდში მხოლოდ ერთი მხატვარი ხატავს.");
      if (action !== "submit-drawing") throw new Error("ახლა ნახატის გაგზავნაა საჭირო.");
      if (!payload?.drawingDataUrl) throw new Error("ნახატი ვერ მივიღეთ.");
      current.drawingDataUrl = payload.drawingDataUrl;
      return;
    }

    if (room.phase.id === "draw-bluff") {
      if (participant.role !== "player" || participant.id === current.artistId) throw new Error("ამ ეტაპზე მხატვარი არ წერს ყალბ სათაურს.");
      if (action !== "submit-text") throw new Error("ახლა ყალბი სათაურია საჭირო.");
      const text = sanitizeSubmission(room, payload?.value, 80);
      if (!text) throw new Error("ჯერ ყალბი სათაური ჩაწერე.");
      current.fakeTitles[participant.id] = text;
      return;
    }

    if (room.phase.id === "draw-vote") {
      if (participant.id === current.artistId) throw new Error("მხატვარი ამ ეტაპზე ხმას არ აძლევს.");
      if (action !== "submit-vote") throw new Error("ახლა ხმის მიცემაა.");
      const option = current.options.find((entry) => entry.id === payload?.choiceId);
      if (!option) throw new Error("ეს ვარიანტი ვერ მოიძებნა.");
      if (!participant.role || (option.authorId === participant.id && !option.isTruth)) throw new Error("საკუთარ ვარიანტს ვერ აირჩევ.");
      current.votes[participant.id] = option.id;
    }
  },
  advance(room, ctx) {
    const current = room.gameState.current;
    if (room.phase.id === "draw-write") {
      if (!current.drawingDataUrl) {
        current.drawingDataUrl = BLANK_DRAWING;
      }
      room.phase.id = "draw-bluff";
      ctx.startTimer(room, 24);
      return;
    }

    if (room.phase.id === "draw-bluff") {
      ensureOptions(room);
      room.phase.id = "draw-vote";
      ctx.startTimer(room, 22);
      return;
    }

    if (room.phase.id === "draw-vote") {
      const deltas = createScoreMap(room);
      const fooledBy = {};
      room.players.forEach((player) => {
        fooledBy[player.id] = [];
      });
      Object.entries(current.votes).forEach(([voterId, optionId]) => {
        const option = current.options.find((entry) => entry.id === optionId);
        if (!option) return;
        if (option.isTruth) {
          if (deltas[voterId] !== undefined) deltas[voterId] += 420;
          deltas[current.artistId] += room.audience.some((entry) => entry.id === voterId) ? 120 : 260;
        } else if (option.authorId && deltas[option.authorId] !== undefined) {
          deltas[option.authorId] += room.audience.some((entry) => entry.id === voterId) ? 150 : 300;
          fooledBy[option.authorId].push(voterId);
        }
      });
      applyDeltas(room, deltas);
      current.reveal = { deltas, fooledBy };
      room.phase.id = "draw-reveal";
      ctx.clearTimer(room);
      return;
    }

    if (room.phase.id === "draw-reveal") {
      moveToNextRoundOrFinal(room, ctx, startRound);
    }
  },
  onTimerExpired(room, ctx) {
    this.advance(room, ctx);
  },
  buildHostStage(room) {
    const current = room.gameState.current;
    const artistName = room.players.find((player) => player.id === current.artistId)?.name || "უცნობი";
    const media = {
      kind: current.drawingDataUrl ? "image" : "text",
      label: "ნახატი",
      title: `მხატვარი: ${artistName}`,
      text: current.item.prompt,
      imageUrl: current.drawingDataUrl || BLANK_DRAWING,
    };

    if (room.phase.id === "draw-write") {
      return {
        title: "მხატვარი მუშაობს",
        subtitle: roundLabel(room),
        note: `${artistName} ამ რაუნდში ნამდვილ თემას ხატავს.`,
        media,
        cards: [],
      };
    }

    if (room.phase.id === "draw-bluff") {
      return {
        title: "დააწერეთ ყალბი მნიშვნელობა",
        subtitle: roundLabel(room),
        note: "დანარჩენები წერენ, თითქოს ეს იყო ნამდვილი თემა.",
        media,
        cards: [],
      };
    }

    if (room.phase.id === "draw-vote") {
      return {
        title: "აირჩიე ნამდვილი თემა",
        subtitle: roundLabel(room),
        note: "ყველა პასუხი ნახატს ეკუთვნის, მაგრამ მხოლოდ ერთი იყო ნამდვილი.",
        media,
        cards: current.options.map((option) => ({
          id: option.id,
          tag: option.isTruth ? "ნამდვილი" : "ყალბი",
          title: option.text,
          body: "",
          meta: "",
        })),
      };
    }

    return {
      title: "ნახატის შედეგი",
      subtitle: roundLabel(room),
      note: `ნამდვილი თემა იყო: ${current.item.prompt}`,
      media,
      cards: current.options.map((option) => ({
        id: option.id,
        tag: option.isTruth ? "ნამდვილი" : room.players.find((player) => player.id === option.authorId)?.name || "უცნობი",
        title: option.text,
        body: option.isTruth
          ? `სწორი ხმები: ${countVotesForOption(current.votes, option.id)}`
          : `მოტყუებულები: ${(current.reveal?.fooledBy?.[option.authorId] || []).map((id) => room.players.find((player) => player.id === id)?.name || "აუდიტორია").join(", ") || "არავინ"}`,
        meta: "",
        highlight: option.isTruth,
      })),
    };
  },
  buildControllerState(room, participant) {
    const current = room.gameState.current;
    const isArtist = participant.id === current.artistId;
    const media = {
      kind: current.drawingDataUrl ? "image" : "text",
      label: "ნახატი",
      title: isArtist ? "შენი ნახატი" : "მხატვრის ნახატი",
      text: isArtist ? current.item.prompt : "გაიყალბე სათაური ან იპოვე ნამდვილი.",
      imageUrl: current.drawingDataUrl || "",
    };

    if (room.phase.id === "draw-write") {
      if (!isArtist) {
        return {
          kind: "wait",
          title: "მხატვარი ხატავს",
          subtitle: room.gameState.gameTitle,
          note: "ცოტა ხანში შენს ტელეფონზე ყალბი სათაურის ეტაპი გაიხსნება.",
          media,
        };
      }
      return {
        kind: "draw",
        title: "დახატე სწრაფად",
        subtitle: roundLabel(room),
        note: `ნამდვილი თემა: ${current.item.prompt}`,
        media,
        buttonLabel: current.drawingDataUrl ? "განახლება" : "გაგზავნა",
        drawingDataUrl: current.drawingDataUrl || "",
        actionId: "submit-drawing",
      };
    }

    if (room.phase.id === "draw-bluff") {
      if (isArtist || participant.role === "audience") {
        return {
          kind: "wait",
          title: isArtist ? "დანარჩენები ტყუილს წერენ" : "აუდიტორია ელოდება",
          subtitle: room.gameState.gameTitle,
          note: isArtist ? "შენი ნახატი უკვე ეკრანზეა." : "ხმის მიცემის ეტაპზე შემოუერთდები.",
          media,
        };
      }
      return {
        kind: "text",
        title: "შექმენი ყალბი სათაური",
        subtitle: roundLabel(room),
        note: "თითქოს ეს იყო ნამდვილი დავალება.",
        media,
        fieldLabel: "ყალბი სათაური",
        placeholder: "რას შეიძლებოდა ერქვას ეს?",
        maxLength: 80,
        value: current.fakeTitles[participant.id] || "",
        buttonLabel: current.fakeTitles[participant.id] ? "განახლება" : "გაგზავნა",
        actionId: "submit-text",
      };
    }

    if (room.phase.id === "draw-vote") {
      if (isArtist) {
        return {
          kind: "wait",
          title: "დანარჩენები არჩევენ ნამდვილ თემას",
          subtitle: room.gameState.gameTitle,
          note: "ამ ეტაპზე მხატვარი ხმას არ აძლევს.",
          media,
        };
      }
      return {
        kind: "vote",
        title: "აირჩიე ნამდვილი თემა",
        subtitle: room.gameState.gameTitle,
        note: participant.role === "audience" ? "აუდიტორიის ხმა ასევე ითვლება." : "საკუთარ ვარიანტს ვერ აირჩევ.",
        media,
        options: current.options
          .filter((option) => option.isTruth || option.authorId !== participant.id)
          .map((option) => ({
            id: option.id,
            label: option.text,
            meta: "",
          })),
        actionId: "submit-vote",
        value: current.votes[participant.id] || "",
      };
    }

    return {
      kind: "reveal",
      title: "ნამდვილი თემა გამოჩნდა",
      subtitle: room.gameState.gameTitle,
      note: `ნახატი სინამდვილეში იყო: ${current.item.prompt}`,
      media,
      cards: [],
    };
  },
};
