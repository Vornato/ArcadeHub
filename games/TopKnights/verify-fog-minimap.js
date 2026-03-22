const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright");

const OUT_DIR = path.join(__dirname, "output", "web-game", "verify-fog-minimap");
const URL = "http://127.0.0.1:4173";

function worldToScreen(camera, world, viewport) {
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

async function getState(page) {
  return page.evaluate(() => JSON.parse(window.render_game_to_text()));
}

async function advance(page, ms) {
  await page.evaluate((duration) => window.advanceTime(duration), ms);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.click("#start-btn");
  await page.waitForTimeout(250);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);

  const initial = await getState(page);
  const player = initial.players[0];
  const initialExplored = player.fog.exploredPct;
  const unitPoints = player.units.map((unit) => worldToScreen(player.camera, unit, { width: 1280, height: 720 }));
  const unitBounds = boundsFromPoints(unitPoints, 16);

  await page.mouse.move(unitBounds.x1, unitBounds.y1);
  await page.mouse.down();
  await page.mouse.move(unitBounds.x2, unitBounds.y2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(120);

  const moveTarget = { x: -480, y: 1080 };
  const targetScreen = worldToScreen(player.camera, moveTarget, { width: 1280, height: 720 });
  await page.mouse.click(targetScreen.x, targetScreen.y);
  await page.waitForTimeout(120);
  await advance(page, 26000);

  const afterMove = await getState(page);
  const returnTarget = { x: -1080, y: 930 };
  const returnScreen = worldToScreen(afterMove.players[0].camera, returnTarget, { width: 1280, height: 720 });
  await page.mouse.click(returnScreen.x, returnScreen.y);
  await page.waitForTimeout(120);
  await advance(page, 22000);

  const afterReturn = await getState(page);
  await page.screenshot({ path: path.join(OUT_DIR, "fog-minimap.png"), fullPage: true });

  if (afterReturn.players[0].fog.exploredPct + 0.05 < afterMove.players[0].fog.exploredPct) {
    throw new Error(`Explored fog regressed after moving back. Expanded=${afterMove.players[0].fog.exploredPct}, final=${afterReturn.players[0].fog.exploredPct}`);
  }

  const summary = {
    initialExplored,
    expandedExplored: afterMove.players[0].fog.exploredPct,
    finalExplored: afterReturn.players[0].fog.exploredPct,
    minimapExplored: afterReturn.minimap && afterReturn.minimap.exploredPct,
    selectedAfterMove: afterReturn.players[0].selection.map((unit) => ({
      id: unit.id,
      role: unit.role,
      x: unit.x,
      y: unit.y,
      order: unit.order,
    })),
    camera: afterReturn.players[0].camera,
    resources: afterReturn.players[0].resources,
  };

  await fs.writeFile(path.join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
