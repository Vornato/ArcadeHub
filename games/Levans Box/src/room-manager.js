const QRCode = require("qrcode");
const { getGameContent, getGameMeta, getManifest } = require("./content");
const { getGameModule } = require("./games");
const {
  assignPlayerDecor,
  buildShareBase,
  createRoomCode,
  ensureUniqueName,
  getLanAddresses,
  randomId,
  rankScoreboard,
  sample,
} = require("./utils");

const MAX_PLAYERS = 8;
const ROOM_TTL_MS = 1000 * 60 * 60 * 4;

class RoomManager {
  constructor({ io, port }) {
    this.io = io;
    this.port = port;
    this.rooms = new Map();
    this.cleanupInterval = setInterval(() => {
      this.cleanupRooms();
      this.tickTimers();
    }, 250);
  }

  getBootstrap() {
    return {
      ok: true,
      packTitle: "ლევანს ბოქსი",
      maxPlayers: MAX_PLAYERS,
      localUrl: `http://127.0.0.1:${this.port}`,
      lanUrl: getLanAddresses(this.port)[0] || `http://127.0.0.1:${this.port}`,
      games: getManifest(),
    };
  }

  sampleContent(gameId, count, settings) {
    const source = getGameContent(gameId, { familyFriendly: settings.familyFriendly });
    if (!source.length) return [];
    if (source.length <= count) {
      const repeated = [];
      while (repeated.length < count) {
        repeated.push(...source);
      }
      return repeated.slice(0, count);
    }
    return sample(source, count);
  }

  async createRoom(socket, payload = {}) {
    const selectedGameId = getGameMeta(payload.gameId || getManifest()[0]?.id).id;
    const shareBase = buildShareBase({ headers: socket.handshake.headers }, this.port);
    const code = createRoomCode(this.rooms);
    const hostSessionId = randomId();
    const gameMeta = getGameMeta(selectedGameId);
    const room = {
      code,
      selectedGameId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      shareBase,
      joinUrl: `${shareBase}/play?room=${encodeURIComponent(code)}`,
      qrDataUrl: "",
      host: {
        sessionId: hostSessionId,
        socketId: socket.id,
        connected: true,
      },
      settings: {
        rounds: Math.max(2, Math.min(6, Number(payload.rounds || gameMeta.roundsDefault || 3))),
        familyFriendly: payload.familyFriendly !== undefined ? Boolean(payload.familyFriendly) : true,
        moderationEnabled: payload.moderationEnabled !== undefined ? Boolean(payload.moderationEnabled) : false,
        audienceEnabled: payload.audienceEnabled !== undefined ? Boolean(payload.audienceEnabled) : true,
        funnyVoteEnabled: payload.funnyVoteEnabled !== undefined ? Boolean(payload.funnyVoteEnabled) : true,
      },
      players: [],
      audience: [],
      status: "lobby",
      phase: {
        id: "lobby",
        timer: null,
      },
      gameState: null,
      kickedSessionIds: new Set(),
      presenterSocketIds: new Set(),
    };

    room.qrDataUrl = await QRCode.toDataURL(room.joinUrl, {
      margin: 1,
      color: {
        dark: "#fff6e8",
        light: "#13243b",
      },
      width: 280,
    });

    this.rooms.set(code, room);
    socket.data = {
      roomCode: code,
      sessionId: hostSessionId,
      role: "host",
    };
    return { room, hostSessionId };
  }

  resumeHost(socket, roomCode, sessionId) {
    const room = this.requireRoom(roomCode);
    if (room.host.sessionId !== sessionId) throw new Error("ჰოსტის სესია ვერ დადასტურდა.");
    room.host.socketId = socket.id;
    room.host.connected = true;
    room.updatedAt = Date.now();
    socket.data = {
      roomCode: room.code,
      sessionId,
      role: "host",
    };
    this.emitRoomState(room);
    return room;
  }

  joinParticipant(socket, payload = {}) {
    const room = this.requireRoom(payload.roomCode);
    const existing = payload.sessionId ? this.findParticipantBySession(room, payload.sessionId) : null;
    if (existing) {
      existing.socketId = socket.id;
      existing.connected = true;
      existing.lastSeenAt = Date.now();
      socket.data = {
        roomCode: room.code,
        sessionId: existing.sessionId,
        role: existing.role,
      };
      this.emitRoomState(room);
      return existing;
    }

    if (room.kickedSessionIds.has(payload.sessionId)) {
      throw new Error("ამ სესიას ოთახში დაბრუნების უფლება აღარ აქვს.");
    }

    const activePlayerCount = room.players.length;
    const role = activePlayerCount < MAX_PLAYERS ? "player" : (room.settings.audienceEnabled ? "audience" : null);
    if (!role) throw new Error("ოთახი უკვე სავსეა და აუდიტორია გამორთულია.");

    const targetCollection = role === "player" ? room.players : room.audience;
    const allNames = [...room.players, ...room.audience].map((entry) => entry.name);
    const decor = assignPlayerDecor(room.players.length + room.audience.length);
    const participant = {
      id: randomId(),
      sessionId: randomId(),
      socketId: socket.id,
      role,
      name: ensureUniqueName(allNames, payload.name || (role === "player" ? "მოთამაშე" : "მაყურებელი")),
      connected: true,
      joinedAt: Date.now(),
      lastSeenAt: Date.now(),
      lastActionAt: 0,
      score: 0,
      color: decor.color,
      avatar: decor.avatar,
    };

    targetCollection.push(participant);
    room.updatedAt = Date.now();
    socket.data = {
      roomCode: room.code,
      sessionId: participant.sessionId,
      role: participant.role,
    };
    this.emitRoomState(room);
    return participant;
  }

  resumeParticipant(socket, roomCode, sessionId) {
    const room = this.requireRoom(roomCode);
    const participant = this.findParticipantBySession(room, sessionId);
    if (!participant) throw new Error("სესია ვერ მოიძებნა.");
    participant.socketId = socket.id;
    participant.connected = true;
    participant.lastSeenAt = Date.now();
    socket.data = {
      roomCode: room.code,
      sessionId: participant.sessionId,
      role: participant.role,
    };
    this.emitRoomState(room);
    return { room, participant };
  }

  watchPresenter(socket, roomCode) {
    const room = this.requireRoom(roomCode);
    room.presenterSocketIds.add(socket.id);
    room.updatedAt = Date.now();
    socket.data = {
      roomCode: room.code,
      sessionId: null,
      role: "presenter",
    };
    this.io.to(socket.id).emit("presenter:state", this.buildPresenterState(room));
    return room;
  }

  handleHostAction(socket, payload = {}) {
    const room = this.requireHost(socket, payload.roomCode, payload.sessionId);

    switch (payload.type) {
      case "select-game":
        if (room.status !== "lobby") throw new Error("თამაშის შეცვლა მხოლოდ ლობიში შეიძლება.");
        room.selectedGameId = getGameMeta(payload.gameId).id;
        room.settings.rounds = Math.max(2, Math.min(6, Number(room.settings.rounds || getGameMeta(room.selectedGameId).roundsDefault || 3)));
        break;
      case "random-game": {
        if (room.status !== "lobby") throw new Error("შემთხვევითი თამაში მხოლოდ ლობიში შეიძლება.");
        const games = getManifest();
        room.selectedGameId = games[Math.floor(Math.random() * games.length)].id;
        break;
      }
      case "update-settings":
        if (room.status !== "lobby") throw new Error("სეტინგები მხოლოდ ლობიში იცვლება.");
        room.settings = {
          ...room.settings,
          rounds: Math.max(2, Math.min(6, Number(payload.settings?.rounds || room.settings.rounds))),
          familyFriendly: Boolean(payload.settings?.familyFriendly),
          moderationEnabled: Boolean(payload.settings?.moderationEnabled),
          audienceEnabled: Boolean(payload.settings?.audienceEnabled),
          funnyVoteEnabled: Boolean(payload.settings?.funnyVoteEnabled),
        };
        if (!room.settings.audienceEnabled) {
          room.audience.forEach((entry) => {
            this.disconnectParticipant(room, entry.sessionId, true);
          });
          room.audience = [];
        }
        break;
      case "start-match":
        this.startMatch(room);
        break;
      case "next-phase":
        this.advanceRoom(room);
        break;
      case "pause-timer":
        this.togglePause(room);
        break;
      case "restart-lobby":
        this.resetToLobby(room);
        break;
      case "end-match":
        room.phase.id = "final";
        room.status = "final";
        this.clearTimer(room);
        break;
      case "kick-participant":
        this.kickParticipant(room, payload.participantId);
        break;
      default:
        throw new Error("უცნობი ჰოსტის ქმედება.");
    }

    room.updatedAt = Date.now();
    this.emitRoomState(room);
    return room;
  }

  handlePlayerAction(socket, payload = {}) {
    const { room, participant } = this.requireParticipant(socket, payload.roomCode, payload.sessionId);
    this.checkRateLimit(participant);
    const module = getGameModule(room.selectedGameId);
    module.handlePlayerAction(room, participant, payload.type, payload, this.createGameContext(room));
    room.updatedAt = Date.now();
    this.emitRoomState(room);
    return { room, participant };
  }

  startMatch(room) {
    const meta = getGameMeta(room.selectedGameId);
    if (room.players.length < meta.minPlayers) {
      throw new Error(`ამ თამაშს მინიმუმ ${meta.minPlayers} მოთამაშე სჭირდება.`);
    }
    room.players.forEach((player) => {
      player.score = 0;
    });
    room.status = "running";
    const module = getGameModule(room.selectedGameId);
    module.startMatch(room, this.createGameContext(room));
    this.emitRoomState(room);
  }

  advanceRoom(room) {
    if (room.status === "lobby") {
      this.startMatch(room);
      return;
    }
    if (room.phase.id === "final") {
      this.resetToLobby(room);
      return;
    }
    const module = getGameModule(room.selectedGameId);
    module.advance(room, this.createGameContext(room));
    room.updatedAt = Date.now();
    this.emitRoomState(room);
  }

  resetToLobby(room) {
    this.clearTimer(room);
    room.status = "lobby";
    room.phase.id = "lobby";
    room.gameState = null;
    room.players.forEach((player) => {
      player.score = 0;
    });
  }

  togglePause(room) {
    if (!room.phase.timer) return;
    const timer = room.phase.timer;
    if (timer.paused) {
      timer.endsAt = Date.now() + timer.remainingMs;
      timer.paused = false;
    } else {
      timer.remainingMs = Math.max(0, timer.endsAt - Date.now());
      timer.paused = true;
    }
  }

  startTimer(room, seconds) {
    room.phase.timer = {
      durationMs: seconds * 1000,
      endsAt: Date.now() + seconds * 1000,
      remainingMs: seconds * 1000,
      paused: false,
    };
  }

  clearTimer(room) {
    room.phase.timer = null;
  }

  tickTimers() {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      const timer = room.phase.timer;
      if (!timer || timer.paused) continue;
      if (timer.endsAt <= now) {
        this.clearTimer(room);
        const module = getGameModule(room.selectedGameId);
        if (room.status === "running" && typeof module.onTimerExpired === "function") {
          module.onTimerExpired(room, this.createGameContext(room));
        }
        room.updatedAt = now;
        this.emitRoomState(room);
      }
    }
  }

  cleanupRooms() {
    const cutoff = Date.now() - ROOM_TTL_MS;
    for (const [code, room] of this.rooms.entries()) {
      if (room.updatedAt < cutoff) {
        this.rooms.delete(code);
      }
    }
  }

  kickParticipant(room, participantId) {
    const playerIndex = room.players.findIndex((entry) => entry.id === participantId);
    const audienceIndex = room.audience.findIndex((entry) => entry.id === participantId);
    if (playerIndex === -1 && audienceIndex === -1) throw new Error("ეს მონაწილე ვერ მოიძებნა.");

    const participant = playerIndex >= 0 ? room.players[playerIndex] : room.audience[audienceIndex];
    room.kickedSessionIds.add(participant.sessionId);
    const socketId = participant.socketId;
    if (socketId) {
      this.io.to(socketId).emit("session:kicked", {
        ok: false,
        error: "ჰოსტმა ოთახიდან გაგთიშა.",
      });
    }

    if (playerIndex >= 0) room.players.splice(playerIndex, 1);
    else room.audience.splice(audienceIndex, 1);
  }

  disconnectParticipant(room, sessionId, silent = false) {
    const participant = this.findParticipantBySession(room, sessionId);
    if (!participant) return;
    participant.connected = false;
    participant.socketId = null;
    participant.lastSeenAt = Date.now();
    if (!silent) this.emitRoomState(room);
  }

  handleDisconnect(socket) {
    const { roomCode, sessionId, role } = socket.data || {};
    if (!roomCode) return;
    const room = this.rooms.get(roomCode);
    if (!room) return;
    if (role === "presenter") {
      room.presenterSocketIds.delete(socket.id);
      room.updatedAt = Date.now();
      return;
    }
    if (!sessionId) return;
    if (role === "host" && room.host.sessionId === sessionId) {
      room.host.connected = false;
      room.host.socketId = null;
      room.updatedAt = Date.now();
      return;
    }
    this.disconnectParticipant(room, sessionId, true);
    room.updatedAt = Date.now();
    this.emitRoomState(room);
  }

  createGameContext(room) {
    return {
      clearTimer: () => this.clearTimer(room),
      getGameMeta,
      sampleContent: (gameId, count, settings = room.settings) => this.sampleContent(gameId, count, settings),
      startTimer: (targetRoom, seconds) => this.startTimer(targetRoom, seconds),
    };
  }

  buildLobbyStage(room) {
    const game = getGameMeta(room.selectedGameId);
    return {
      title: game.title,
      subtitle: game.description,
      note: `მინ ${game.minPlayers} | მაქს ${MAX_PLAYERS} | რაუნდები ${room.settings.rounds}`,
      media: {
        kind: "image",
        label: "არჩეული თამაში",
        title: game.title,
        text: game.description,
        imageUrl: game.coverPath,
      },
      cards: [],
    };
  }

  buildFinalStage(room) {
    const winners = rankScoreboard(room.players);
    return {
      title: "ფინალური ქულები",
      subtitle: getGameMeta(room.selectedGameId).title,
      note: winners.length ? `ლიდერი: ${winners[0].name}` : "ქულები მზადაა.",
      media: {
        kind: "image",
        label: "მატჩი დასრულდა",
        title: getGameMeta(room.selectedGameId).title,
        text: "ჰოსტს შეუძლია ახალი თამაში აირჩიოს ან იგივე თავიდან დაიწყოს.",
        imageUrl: getGameMeta(room.selectedGameId).coverPath,
      },
      cards: winners.map((player, index) => ({
        id: player.id,
        tag: index === 0 ? "გამარჯვებული" : `${index + 1} ადგილი`,
        title: `${player.avatar} ${player.name}`,
        body: player.connected ? "ონლაინ" : "გათიშულია",
        meta: `${player.score} ქულა`,
        highlight: index === 0,
      })),
    };
  }

  buildHostState(room) {
    const module = getGameModule(room.selectedGameId);
    const stage = room.status === "lobby"
      ? this.buildLobbyStage(room)
      : room.phase.id === "final"
        ? this.buildFinalStage(room)
        : module.buildHostStage(room, this.createGameContext(room));

    return {
      ok: true,
      roomCode: room.code,
      joinUrl: room.joinUrl,
      shareBase: room.shareBase,
      qrDataUrl: room.qrDataUrl,
      selectedGameId: room.selectedGameId,
      settings: room.settings,
      status: room.status,
      phaseId: room.phase.id,
      timer: this.serializeTimer(room.phase.timer),
      audienceCount: room.audience.length,
      games: getManifest(),
      players: room.players.map((player) => ({
        id: player.id,
        name: player.name,
        score: player.score,
        color: player.color,
        avatar: player.avatar,
        connected: player.connected,
        role: player.role,
        status: this.getParticipantStatus(room, player),
      })),
      audience: room.audience.map((participant) => ({
        id: participant.id,
        name: participant.name,
        connected: participant.connected,
      })),
      controls: this.buildHostControls(room),
      stage,
      scoreboard: rankScoreboard(room.players),
    };
  }

  buildControllerState(room, participant) {
    const module = getGameModule(room.selectedGameId);
    const game = getGameMeta(room.selectedGameId);
    const panel = room.status === "lobby"
      ? {
        kind: "lobby",
        title: game.title,
        subtitle: game.description,
        note: participant.role === "audience"
          ? "შენ აუდიტორიაში ხარ. ხმის მიცემის ფაზებზე ჩაერთვები."
          : "ჰოსტის დაწყებას ელოდები.",
        media: {
          kind: "image",
          label: "არჩეული თამაში",
          title: game.title,
          text: game.description,
          imageUrl: game.coverPath,
        },
      }
      : room.phase.id === "final"
        ? {
          kind: "final",
          title: "მატჩი დასრულდა",
          subtitle: game.title,
          note: "ჰოსტი ახლავე გადაგიყვანთ შემდეგ თამაშზე ან ლობიში.",
          media: {
            kind: "image",
            label: "ფინალი",
            title: game.title,
            text: "",
            imageUrl: game.coverPath,
          },
        }
        : module.buildControllerState(room, participant, this.createGameContext(room));

    return {
      ok: true,
      roomCode: room.code,
      status: room.status,
      phaseId: room.phase.id,
      timer: this.serializeTimer(room.phase.timer),
      selectedGameId: room.selectedGameId,
      gameTitle: game.title,
      gameCoverPath: game.coverPath,
      gameVideoPath: game.videoPath,
      me: {
        id: participant.id,
        name: participant.name,
        role: participant.role,
        color: participant.color,
        avatar: participant.avatar,
        score: participant.score,
      },
      players: rankScoreboard(room.players).map((player) => ({
        id: player.id,
        name: player.name,
        score: player.score,
        avatar: player.avatar,
        color: player.color,
        role: player.role,
        connected: player.connected,
      })),
      audienceCount: room.audience.length,
      panel,
    };
  }

  buildPresenterState(room) {
    const hostState = this.buildHostState(room);
    const game = getGameMeta(room.selectedGameId);
    return {
      ...hostState,
      gameTitle: game.title,
      gameCoverPath: game.coverPath,
      gameVideoPath: game.videoPath,
    };
  }

  buildHostControls(room) {
    const meta = getGameMeta(room.selectedGameId);
    if (room.status === "lobby") {
      return {
        canStart: room.players.length >= meta.minPlayers,
        canAdvance: false,
        canPause: false,
        canEnd: room.players.length > 0,
        canRestart: room.players.length > 0,
        canSelectGame: true,
        canKick: true,
        startLabel: "დაწყება",
        advanceLabel: "შემდეგი",
        pauseLabel: "პაუზა",
        reason: room.players.length >= meta.minPlayers
          ? "ყველაფერი მზადაა. შეგიძლია თამაში დაიწყო."
          : `ამ თამაშს მინიმუმ ${meta.minPlayers} მოთამაშე სჭირდება.`,
      };
    }

    if (room.phase.id === "final") {
      return {
        canStart: false,
        canAdvance: true,
        canPause: false,
        canEnd: false,
        canRestart: true,
        canSelectGame: false,
        canKick: false,
        startLabel: "დაწყება",
        advanceLabel: "ლობიში დაბრუნება",
        pauseLabel: "პაუზა",
        reason: "მატჩი დასრულდა.",
      };
    }

    return {
      canStart: false,
      canAdvance: true,
      canPause: Boolean(room.phase.timer),
      canEnd: true,
      canRestart: true,
      canSelectGame: false,
      canKick: true,
      startLabel: "დაწყება",
      advanceLabel: "შემდეგი ეტაპი",
      pauseLabel: room.phase.timer?.paused ? "გაგრძელება" : "პაუზა",
      reason: room.phase.timer?.paused ? "ტაიმერი დაპაუზებულია." : "ჰოსტი აკონტროლებს ტემპს.",
    };
  }

  serializeTimer(timer) {
    if (!timer) return null;
    return {
      durationMs: timer.durationMs,
      endsAt: timer.paused ? null : timer.endsAt,
      remainingMs: timer.paused ? timer.remainingMs : Math.max(0, timer.endsAt - Date.now()),
      paused: timer.paused,
    };
  }

  getParticipantStatus(room, participant) {
    if (!participant.connected) return "გათიშულია";
    if (room.status === "lobby") return participant.role === "audience" ? "აუდიტორია" : "ელოდება დაწყებას";
    if (room.phase.id.includes("write") || room.phase.id.includes("question")) return "პასუხობს";
    if (room.phase.id.includes("vote")) return "ხმის მიცემა";
    if (room.phase.id.includes("reveal")) return "შედეგები";
    return "აქტიურია";
  }

  emitRoomState(room) {
    if (room.host.socketId) {
      this.io.to(room.host.socketId).emit("host:state", this.buildHostState(room));
    }

    room.presenterSocketIds.forEach((socketId) => {
      this.io.to(socketId).emit("presenter:state", this.buildPresenterState(room));
    });

    [...room.players, ...room.audience].forEach((participant) => {
      if (participant.socketId) {
        this.io.to(participant.socketId).emit("controller:state", this.buildControllerState(room, participant));
      }
    });
  }

  checkRateLimit(participant) {
    const now = Date.now();
    if (now - participant.lastActionAt < 250) {
      throw new Error("ცოტა ნელა. სისტემამ ზედმეტად სწრაფი შეყვანა შეაჩერა.");
    }
    participant.lastActionAt = now;
  }

  requireRoom(roomCode) {
    const room = this.rooms.get(String(roomCode || "").trim().toUpperCase());
    if (!room) throw new Error("ოთახი ვერ მოიძებნა.");
    return room;
  }

  requireHost(socket, roomCode, sessionId) {
    const room = this.requireRoom(roomCode);
    if (room.host.sessionId !== sessionId) throw new Error("ჰოსტის სესია ვერ დადასტურდა.");
    if (room.host.socketId !== socket.id) {
      room.host.socketId = socket.id;
    }
    return room;
  }

  requireParticipant(socket, roomCode, sessionId) {
    const room = this.requireRoom(roomCode);
    const participant = this.findParticipantBySession(room, sessionId);
    if (!participant) throw new Error("მონაწილის სესია ვერ მოიძებნა.");
    if (participant.socketId !== socket.id) {
      participant.socketId = socket.id;
    }
    return { room, participant };
  }

  findParticipantBySession(room, sessionId) {
    return [...room.players, ...room.audience].find((entry) => entry.sessionId === sessionId) || null;
  }
}

module.exports = {
  MAX_PLAYERS,
  RoomManager,
};
