const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const OUT_DIR = path.join(__dirname, "output", "web-game", "verify-lan-shared-start");
const HOST_URL = "http://127.0.0.1:4173";
const PORT = 4173;
const VIEWPORT = { width: 1440, height: 900 };

function scoreLanAddress(address) {
  if (/^192\.168\./.test(address)) return 0;
  if (/^10\./.test(address)) return 1;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) return 2;
  if (/^25\./.test(address)) return 3;
  if (/^169\.254\./.test(address)) return 8;
  return 4;
}

function getExpectedLanBase() {
  const candidates = [];
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    if (!entries) continue;
    for (const entry of entries) {
      if (!entry || entry.internal || entry.family !== "IPv4") continue;
      candidates.push({
        name,
        address: entry.address,
        score: scoreLanAddress(entry.address),
      });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name) || a.address.localeCompare(b.address));
  return `http://${candidates[0].address}:${PORT}`;
}

function worldToScreen(camera, world, viewport = VIEWPORT) {
  const dx = world.x - camera.x;
  const dy = world.y - camera.y;
  const cos = Math.cos(camera.rotation);
  const sin = Math.sin(camera.rotation);
  return {
    x: viewport.width / 2 + (dx * cos - dy * sin) * camera.zoom,
    y: viewport.height / 2 + (dx * sin + dy * cos) * camera.zoom,
  };
}

function boundsFromPoints(points, padding = 18) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x1: Math.min(...xs) - padding,
    y1: Math.min(...ys) - padding,
    x2: Math.max(...xs) + padding,
    y2: Math.max(...ys) + padding,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function getState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

async function waitForState(page, predicate, timeoutMs = 12000) {
  const startedAt = Date.now();
  let lastState = null;
  while (Date.now() - startedAt < timeoutMs) {
    lastState = await getState(page);
    if (predicate(lastState)) return lastState;
    await page.waitForTimeout(120);
  }
  throw new Error(`Timed out waiting for state. Last state: ${JSON.stringify(lastState)}`);
}

function getPlayerState(state, owner) {
  return (state.players || []).find((player) => player.owner === owner) || null;
}

function getLocalPlayerState(state) {
  return getPlayerState(state, state.lan && state.lan.localOwner);
}

function pickControllableUnits(playerState, count = 2) {
  const units = (playerState && playerState.units) || [];
  const preferred = units.filter((unit) => unit.role !== "captain");
  const picked = (preferred.length ? preferred : units).slice(0, count);
  if (!picked.length) throw new Error(`No controllable units found for ${playerState ? playerState.owner : "unknown owner"}.`);
  return picked;
}

function pickMoveTarget(playerState, units) {
  const centroid = units.reduce((sum, unit) => ({
    x: sum.x + unit.x,
    y: sum.y + unit.y,
  }), { x: 0, y: 0 });
  centroid.x /= units.length;
  centroid.y /= units.length;
  const offsets = [
    { x: 240, y: 120 },
    { x: 240, y: -120 },
    { x: -240, y: 120 },
    { x: -240, y: -120 },
    { x: 0, y: 260 },
    { x: 0, y: -260 },
  ];
  for (const offset of offsets) {
    const world = { x: centroid.x + offset.x, y: centroid.y + offset.y };
    const screen = worldToScreen(playerState.camera, world);
    if (screen.x >= 120 && screen.x <= VIEWPORT.width - 120 && screen.y >= 120 && screen.y <= VIEWPORT.height - 180) {
      return { world, screen };
    }
  }
  const fallbackWorld = { x: centroid.x + 160, y: centroid.y + 160 };
  const fallbackScreen = worldToScreen(playerState.camera, fallbackWorld);
  return {
    world: fallbackWorld,
    screen: {
      x: clamp(fallbackScreen.x, 120, VIEWPORT.width - 120),
      y: clamp(fallbackScreen.y, 120, VIEWPORT.height - 180),
    },
  };
}

async function hostRoom(page) {
  await page.evaluate(() => document.getElementById("multiplayer-btn").click());
  await page.waitForTimeout(200);
  await page.evaluate(() => document.getElementById("menu-host-lan-versus-btn").click());
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('.map-card[data-map-preset="green"]').click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById("host-lan-btn").click());
  await page.waitForFunction(() => document.getElementById("lan-link-input").value.includes("?room="), { timeout: 15000 });
  return page.locator("#lan-link-input").inputValue();
}

async function joinSharedRoom(page) {
  await page.evaluate(() => document.getElementById("menu-start-btn").click());
}

async function dragSelect(page, playerState, units) {
  const points = units.map((unit) => worldToScreen(playerState.camera, unit));
  const bounds = boundsFromPoints(points, 20);
  await page.mouse.move(bounds.x1, bounds.y1);
  await page.mouse.down({ button: "left" });
  await page.mouse.move(bounds.x2, bounds.y2, { steps: 8 });
  await page.mouse.up({ button: "left" });
  await page.waitForTimeout(180);
}

async function issueMoveOrder(page, playerState, units) {
  await dragSelect(page, playerState, units);
  const target = pickMoveTarget(playerState, units);
  await page.mouse.click(target.screen.x, target.screen.y, { button: "left" });
  return {
    selectedUnitIds: units.map((unit) => unit.id),
    targetWorld: {
      x: Math.round(target.world.x),
      y: Math.round(target.world.y),
    },
    targetScreen: {
      x: Math.round(target.screen.x),
      y: Math.round(target.screen.y),
    },
  };
}

function unitsHaveMoveOrder(state, owner, unitIds) {
  const player = getPlayerState(state, owner);
  if (!player) return false;
  const matching = (player.units || []).filter((unit) => unitIds.includes(unit.id));
  return matching.length > 0 && matching.every((unit) => unit.order === "move");
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const hostContext = await browser.newContext({ viewport: VIEWPORT });
  const guestContext = await browser.newContext({ viewport: VIEWPORT });
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();

  await hostPage.goto(HOST_URL, { waitUntil: "domcontentloaded" });
  const shareLink = await hostRoom(hostPage);
  console.log(`[verify-lan] hosted room link: ${shareLink}`);
  const expectedLanBase = getExpectedLanBase();
  if (!shareLink) throw new Error("Host did not receive a generated LAN share link.");
  if (expectedLanBase && !shareLink.startsWith(expectedLanBase)) {
    throw new Error(`Expected share link to use ${expectedLanBase}, received ${shareLink}`);
  }

  await guestPage.goto(shareLink, { waitUntil: "domcontentloaded" });
  await joinSharedRoom(guestPage);
  console.log("[verify-lan] guest opened shared link and pressed Start");

  const hostPlayingState = await waitForState(
    hostPage,
    (state) => state.mode === "playing" && state.matchType === "lan" && state.lan && state.lan.started,
    30000,
  );
  console.log("[verify-lan] host entered live LAN match");
  const guestPlayingState = await waitForState(
    guestPage,
    (state) => state.mode === "playing" && state.matchType === "lan" && state.lan && state.lan.started,
    30000,
  );
  console.log("[verify-lan] guest entered live LAN match");

  if ((hostPlayingState.players || []).length !== 2 || (guestPlayingState.players || []).length !== 2) {
    throw new Error("Expected both host and guest to see both LAN players in the live match.");
  }

  const hostLocalOwner = hostPlayingState.lan.localOwner;
  const guestLocalOwner = guestPlayingState.lan.localOwner;
  const hostLocalPlayer = getLocalPlayerState(hostPlayingState);
  const guestLocalPlayer = getLocalPlayerState(guestPlayingState);
  if (!hostLocalPlayer || !guestLocalPlayer) throw new Error("Missing local player state after LAN match start.");

  const hostUnits = pickControllableUnits(hostLocalPlayer);
  const hostMove = await issueMoveOrder(hostPage, hostLocalPlayer, hostUnits);
  console.log(`[verify-lan] host issued move order with units: ${hostMove.selectedUnitIds.join(", ")}`);
  await waitForState(hostPage, (state) => unitsHaveMoveOrder(state, hostLocalOwner, hostMove.selectedUnitIds));
  await waitForState(guestPage, (state) => unitsHaveMoveOrder(state, hostLocalOwner, hostMove.selectedUnitIds));
  console.log("[verify-lan] guest received host move order state");

  const guestStateBeforeMove = await getState(guestPage);
  const guestPlayerBeforeMove = getLocalPlayerState(guestStateBeforeMove);
  const guestUnits = pickControllableUnits(guestPlayerBeforeMove);
  const guestMove = await issueMoveOrder(guestPage, guestPlayerBeforeMove, guestUnits);
  console.log(`[verify-lan] guest issued move order with units: ${guestMove.selectedUnitIds.join(", ")}`);
  await waitForState(hostPage, (state) => unitsHaveMoveOrder(state, guestLocalOwner, guestMove.selectedUnitIds));
  const guestFinalState = await waitForState(guestPage, (state) => unitsHaveMoveOrder(state, guestLocalOwner, guestMove.selectedUnitIds));
  const hostFinalState = await getState(hostPage);
  console.log("[verify-lan] host and guest both received guest move order state");

  await hostPage.screenshot({ path: path.join(OUT_DIR, "host-room-live.png"), fullPage: true });
  await guestPage.screenshot({ path: path.join(OUT_DIR, "guest-room-live.png"), fullPage: true });

  const summary = {
    expectedLanBase,
    shareLink,
    host: {
      localOwner: hostLocalOwner,
      lan: hostFinalState.lan,
      playerCountVisible: (hostFinalState.players || []).length,
      moveOrder: hostMove,
      hostViewOfGuestMoveApplied: unitsHaveMoveOrder(hostFinalState, guestLocalOwner, guestMove.selectedUnitIds),
    },
    guest: {
      localOwner: guestLocalOwner,
      lan: guestFinalState.lan,
      playerCountVisible: (guestFinalState.players || []).length,
      moveOrder: guestMove,
      guestViewOfHostMoveApplied: unitsHaveMoveOrder(guestFinalState, hostLocalOwner, hostMove.selectedUnitIds),
    },
    orders: {
      hostUnitsAfterHostMove: getPlayerState(hostFinalState, hostLocalOwner).units.filter((unit) => hostMove.selectedUnitIds.includes(unit.id)),
      guestUnitsSeenByGuestAfterGuestMove: getPlayerState(guestFinalState, guestLocalOwner).units.filter((unit) => guestMove.selectedUnitIds.includes(unit.id)),
      hostViewOfGuestUnitsAfterGuestMove: getPlayerState(hostFinalState, guestLocalOwner).units.filter((unit) => guestMove.selectedUnitIds.includes(unit.id)),
    },
  };

  await fs.writeFile(path.join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));
  console.log("[verify-lan] verification complete");
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
