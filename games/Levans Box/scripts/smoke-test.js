const http = require("http");
const { io: createSocket } = require("socket.io-client");

global.URL = require("url").URL;

process.env.PORT = process.env.PORT || "3195";
process.env.HOST = process.env.HOST || "127.0.0.1";

const { server, roomManager } = require("../server");

const PORT = Number(process.env.PORT);
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitFor(check, label, timeoutMs = 8000, intervalMs = 50) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const value = await check();
        if (value) {
          resolve(value);
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error(`Timeout: ${label}`));
        return;
      }

      setTimeout(tick, intervalMs);
    };

    tick();
  });
}

function httpRequest(pathname) {
  return new Promise((resolve, reject) => {
    const request = http.get(`${BASE_URL}${pathname}`, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        resolve({
          status: response.statusCode,
          headers: response.headers,
          body,
        });
      });
    });

    request.on("error", reject);
  });
}

function connectSocket() {
  return new Promise((resolve, reject) => {
    const socket = createSocket(BASE_URL, {
      transports: ["websocket"],
      reconnection: false,
      timeout: 5000,
    });

    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

function emitAck(socket, eventName, payload) {
  return new Promise((resolve, reject) => {
    socket.emit(eventName, payload, (response) => {
      if (!response) {
        reject(new Error(`No ack for ${eventName}`));
        return;
      }

      if (!response.ok) {
        reject(new Error(response.error || `Ack failed for ${eventName}`));
        return;
      }

      resolve(response);
    });
  });
}

function makeDrawing(label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" rx="24" fill="#13243b"/><circle cx="86" cy="92" r="36" fill="#ffcf5a"/><rect x="136" y="58" width="116" height="92" rx="18" fill="#ff7f50"/><path d="M52 176 Q160 120 268 176" stroke="#fff6e8" stroke-width="14" fill="none" stroke-linecap="round"/><text x="160" y="202" fill="#fff6e8" font-size="18" text-anchor="middle" font-family="sans-serif">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function makeText(client, phaseId, panel) {
  const base = `${client.name} ${phaseId}`;

  if (panel?.title?.includes("პიჩი")) {
    return `${base}: ეს პროდუქტი ისე ჟღერს, თითქოს ხვალვე მილიონერს გაგხდის.`;
  }

  if (panel?.title?.includes("საბოტ")) {
    return `${base}: ალბათ ესაა სწორი გზა, ოღონდ ცოტათი საეჭვო.`;
  }

  return `${base} - საცდელი პასუხი.`;
}

async function submitControllerAction(roomCode, client, phaseId) {
  const panel = client.state?.panel;
  if (!panel) return;

  if (panel.kind === "text") {
    await emitAck(client.socket, "player:action", {
      roomCode,
      sessionId: client.sessionId,
      type: "submit-text",
      value: makeText(client, phaseId, panel),
    });
    return;
  }

  if (panel.kind === "vote" && Array.isArray(panel.options) && panel.options.length) {
    await emitAck(client.socket, "player:action", {
      roomCode,
      sessionId: client.sessionId,
      type: "submit-vote",
      choiceId: panel.options[0].id,
    });
    return;
  }

  if (panel.kind === "category-vote" && Array.isArray(panel.categories) && panel.categories.length) {
    const votes = {};
    panel.categories.forEach((category) => {
      if (category.options?.length) {
        votes[category.id] = category.options[0].id;
      }
    });

    await emitAck(client.socket, "player:action", {
      roomCode,
      sessionId: client.sessionId,
      type: "submit-category-votes",
      votes,
    });
    return;
  }

  if (panel.kind === "draw") {
    await emitAck(client.socket, "player:action", {
      roomCode,
      sessionId: client.sessionId,
      type: "submit-drawing",
      drawingDataUrl: makeDrawing(client.name),
    });
  }
}

async function runGame(gameId) {
  const host = await connectSocket();
  let hostState = null;
  host.on("host:state", (state) => {
    hostState = state;
  });

  const created = await emitAck(host, "host:create-room", {
    gameId,
    rounds: 2,
    familyFriendly: true,
    moderationEnabled: false,
    audienceEnabled: true,
    funnyVoteEnabled: true,
  });

  const roomCode = created.roomCode;
  const hostSessionId = created.hostSessionId;
  const clients = [];

  for (let index = 0; index < 9; index += 1) {
    const socket = await connectSocket();
    const client = {
      socket,
      name: `ტესტი${index + 1}`,
      state: null,
      sessionId: "",
      role: "",
    };

    socket.on("controller:state", (state) => {
      client.state = state;
    });

    const joined = await emitAck(socket, "player:join", {
      roomCode,
      name: client.name,
    });

    client.sessionId = joined.sessionId;
    client.role = joined.role;
    clients.push(client);
  }

  if (clients.filter((entry) => entry.role === "player").length !== 8) {
    throw new Error(`${gameId}: expected 8 players`);
  }

  if (clients.filter((entry) => entry.role === "audience").length !== 1) {
    throw new Error(`${gameId}: expected 1 audience member`);
  }

  await waitFor(
    () => hostState && hostState.players.length === 8 && hostState.audienceCount === 1,
    `${gameId} lobby sync`
  );

  await emitAck(host, "host:action", {
    roomCode,
    sessionId: hostSessionId,
    type: "start-match",
  });

  await waitFor(() => hostState && hostState.status === "running", `${gameId} start`);

  for (let step = 0; step < 60; step += 1) {
    const phaseId = hostState.phaseId;
    if (hostState.status === "final" || phaseId === "final") break;

    await waitFor(
      () => clients.every((client) => client.state && client.state.phaseId === phaseId),
      `${gameId} controller sync ${phaseId}`,
      5000
    );

    for (const client of clients) {
      await submitControllerAction(roomCode, client, phaseId);
    }

    await sleep(350);

    const previousPhaseId = phaseId;
    await emitAck(host, "host:action", {
      roomCode,
      sessionId: hostSessionId,
      type: "next-phase",
    });

    await waitFor(
      () => hostState && (hostState.phaseId !== previousPhaseId || hostState.status === "final" || hostState.phaseId === "final"),
      `${gameId} advance ${previousPhaseId}`,
      6000
    );
  }

  if (!(hostState.status === "final" || hostState.phaseId === "final")) {
    throw new Error(`${gameId}: did not reach final`);
  }

  const result = {
    gameId,
    finalPhase: hostState.phaseId,
    topScore: hostState.scoreboard?.[0]?.score ?? 0,
  };

  host.disconnect();
  clients.forEach((client) => client.socket.disconnect());
  await sleep(80);
  return result;
}

async function main() {
  await waitFor(() => server.listening, "server listen", 5000, 100);

  const hostPage = await httpRequest("/");
  const playerPage = await httpRequest("/play");
  const presenterPage = await httpRequest("/tv");
  const bootstrapResponse = await httpRequest("/api/bootstrap");
  const bootstrap = JSON.parse(bootstrapResponse.body);

  if (hostPage.status !== 200 || playerPage.status !== 200 || presenterPage.status !== 200) {
    throw new Error(`Unexpected page status host=${hostPage.status} play=${playerPage.status} tv=${presenterPage.status}`);
  }

  if (!bootstrap.games || bootstrap.games.length !== 8) {
    throw new Error("Expected 8 games in bootstrap");
  }

  const results = [];
  for (const game of bootstrap.games) {
    results.push(await runGame(game.id));
  }

  console.log(JSON.stringify({
    hostStatus: hostPage.status,
    playStatus: playerPage.status,
    tvStatus: presenterPage.status,
    gameCount: bootstrap.games.length,
    results,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error && error.stack ? error.stack : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    clearInterval(roomManager.cleanupInterval);
    await new Promise((resolve) => server.close(resolve));
  });
