const http = require("http");
const path = require("path");
const express = require("express");
const { Server } = require("socket.io");
const { RoomManager } = require("./src/room-manager");

const PORT = Number(process.env.PORT || 3094);
const HOST = process.env.HOST || "0.0.0.0";
const ROOT = __dirname;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1_500_000,
});

const roomManager = new RoomManager({ io, port: PORT });

app.use(express.json({ limit: "1mb" }));
app.use("/static", express.static(path.join(ROOT, "public")));
app.use("/covers", express.static(path.join(ROOT, "Covers")));
app.use("/videos", express.static(path.join(ROOT, "videos")));
app.use("/assets", express.static(path.join(ROOT, "assets")));
app.use("/data", express.static(path.join(ROOT, "data")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(ROOT, "public", "host.html"));
});

app.get("/play", (_req, res) => {
  res.sendFile(path.join(ROOT, "public", "player.html"));
});

app.get("/tv", (_req, res) => {
  res.sendFile(path.join(ROOT, "public", "presenter.html"));
});

app.get("/index.html", (_req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.get("/api/bootstrap", (_req, res) => {
  res.json(roomManager.getBootstrap());
});

function ackOk(ack, payload = {}) {
  if (typeof ack === "function") {
    ack({ ok: true, ...payload });
  }
}

function ackError(ack, error) {
  if (typeof ack === "function") {
    ack({ ok: false, error: error.message || "უცნობი შეცდომა" });
  }
}

io.on("connection", (socket) => {
  socket.emit("bootstrap", roomManager.getBootstrap());

  socket.on("host:create-room", async (payload, ack) => {
    try {
      const { room, hostSessionId } = await roomManager.createRoom(socket, payload);
      roomManager.emitRoomState(room);
      ackOk(ack, { roomCode: room.code, hostSessionId });
    } catch (error) {
      ackError(ack, error);
    }
  });

  socket.on("host:resume-room", (payload, ack) => {
    try {
      const room = roomManager.resumeHost(socket, payload?.roomCode, payload?.sessionId);
      ackOk(ack, { roomCode: room.code, hostSessionId: room.host.sessionId });
    } catch (error) {
      ackError(ack, error);
    }
  });

  socket.on("presenter:watch", (payload, ack) => {
    try {
      const room = roomManager.watchPresenter(socket, payload?.roomCode);
      ackOk(ack, { roomCode: room.code });
    } catch (error) {
      ackError(ack, error);
    }
  });

  socket.on("player:join", (payload, ack) => {
    try {
      const participant = roomManager.joinParticipant(socket, payload);
      ackOk(ack, {
        roomCode: payload.roomCode?.toUpperCase(),
        sessionId: participant.sessionId,
        participantId: participant.id,
        role: participant.role,
        name: participant.name,
      });
    } catch (error) {
      ackError(ack, error);
    }
  });

  socket.on("player:resume", (payload, ack) => {
    try {
      const { room, participant } = roomManager.resumeParticipant(socket, payload?.roomCode, payload?.sessionId);
      ackOk(ack, {
        roomCode: room.code,
        sessionId: participant.sessionId,
        participantId: participant.id,
        role: participant.role,
        name: participant.name,
      });
    } catch (error) {
      ackError(ack, error);
    }
  });

  socket.on("host:action", (payload, ack) => {
    try {
      roomManager.handleHostAction(socket, payload);
      ackOk(ack);
    } catch (error) {
      ackError(ack, error);
    }
  });

  socket.on("player:action", (payload, ack) => {
    try {
      roomManager.handlePlayerAction(socket, payload);
      ackOk(ack);
    } catch (error) {
      ackError(ack, error);
    }
  });

  socket.on("disconnect", () => {
    roomManager.handleDisconnect(socket);
  });
});

server.listen(PORT, HOST, () => {
  const bootstrap = roomManager.getBootstrap();
  console.log(`Levans Box host: http://127.0.0.1:${PORT}/`);
  console.log(`Levans Box play: ${bootstrap.lanUrl}/play`);
  console.log(`Listening on ${HOST}:${PORT}`);
});

module.exports = {
  app,
  server,
  io,
  roomManager,
};
