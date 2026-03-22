const fs = require("fs/promises");
const path = require("path");
const { chromium } = require("playwright");

const OUT_DIR = path.join(__dirname, "output", "web-game", "verify-resource-economy");
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

function boundsFromPoints(points, padding = 16) {
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

async function panCameraTo(page, target, startingState) {
  let current = startingState;
  for (let step = 0; step < 8; step += 1) {
    const camera = current.players[0].camera;
    const deltaCamX = target.x - camera.x;
    const deltaCamY = target.y - camera.y;
    if (Math.hypot(deltaCamX, deltaCamY) < 140) return current;
    const rawDx = -camera.zoom * (deltaCamX * Math.cos(camera.rotation) + deltaCamY * Math.sin(camera.rotation));
    const rawDy = camera.zoom * (deltaCamX * Math.sin(camera.rotation) - deltaCamY * Math.cos(camera.rotation));
    const limit = 260;
    const scale = Math.min(1, limit / Math.max(1, Math.abs(rawDx), Math.abs(rawDy)));
    const dragDx = rawDx * scale;
    const dragDy = rawDy * scale;
    await page.mouse.move(640, 360);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(640 + dragDx, 360 + dragDy, { steps: 8 });
    await page.mouse.up({ button: "right" });
    await page.waitForTimeout(80);
    current = await getState(page);
  }
  return current;
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

  let state = await getState(page);
  const player = state.players[0];
  const unitPoints = player.units.map((unit) => worldToScreen(player.camera, unit, { width: 1280, height: 720 }));
  const unitBounds = boundsFromPoints(unitPoints, 18);
  await page.mouse.move(unitBounds.x1, unitBounds.y1);
  await page.mouse.down();
  await page.mouse.move(unitBounds.x2, unitBounds.y2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(120);

  state = await getState(page);
  const selectionAfterBox = state.players[0].selection.length;
  if (!selectionAfterBox) throw new Error("Selection box did not capture any starting units.");

  const resourceTarget = state.resourceNodes.find((node) => node.kind === "tree") || state.resourceNodes[0];
  if (!resourceTarget) throw new Error("No nearby resource node found in render_game_to_text output.");
  const resourceBefore = state.resourceNodes.find((node) => node.id === resourceTarget.id);
  const resourcesBefore = { ...state.players[0].resources };
  const resourceScreen = worldToScreen(state.players[0].camera, resourceTarget, { width: 1280, height: 720 });
  await page.mouse.click(resourceScreen.x, resourceScreen.y);
  await page.waitForTimeout(80);
  await advance(page, 14000);

  const afterHarvest = await getState(page);
  const resourceAfter = afterHarvest.resourceNodes.find((node) => node.id === resourceTarget.id) || null;
  const resourcesAfterHarvest = { ...afterHarvest.players[0].resources };

  let taxViewState = await panCameraTo(page, afterHarvest.neutralEconomy.buildings[0], afterHarvest);
  const taxTarget = taxViewState.neutralEconomy.buildings.find((building) => building.reserve >= 12) || taxViewState.neutralEconomy.civilians[0];
  if (!taxTarget) throw new Error("No neutral economy target found for tax verification.");
  const taxBefore = taxViewState.neutralEconomy.buildings.find((building) => building.id === taxTarget.id)
    || taxViewState.neutralEconomy.civilians.find((civilian) => civilian.id === taxTarget.id);
  const taxScreen = worldToScreen(taxViewState.players[0].camera, taxTarget, { width: 1280, height: 720 });
  await page.mouse.click(taxScreen.x, taxScreen.y);
  await page.waitForTimeout(80);
  let taxCommandState = await getState(page);
  let afterTax = taxCommandState;
  for (let step = 0; step < 10; step += 1) {
    await advance(page, 5000);
    afterTax = await getState(page);
    const currentTaxTarget = afterTax.neutralEconomy.buildings.find((building) => building.id === taxTarget.id)
      || afterTax.neutralEconomy.civilians.find((civilian) => civilian.id === taxTarget.id)
      || null;
    if (!currentTaxTarget || currentTaxTarget.reserve < taxBefore.reserve) break;
  }
  const taxAfter = afterTax.neutralEconomy.buildings.find((building) => building.id === taxTarget.id)
    || afterTax.neutralEconomy.civilians.find((civilian) => civilian.id === taxTarget.id)
    || null;
  const resourcesAfterTax = { ...afterTax.players[0].resources };

  await page.screenshot({ path: path.join(OUT_DIR, "resource-economy.png"), fullPage: true });

  const summary = {
    selectionAfterBox,
    initialResources: resourcesBefore,
    afterHarvestResources: resourcesAfterHarvest,
    afterTaxResources: resourcesAfterTax,
    passiveIncome: afterTax.players[0].economy.passiveIncome,
    resourceTargetId: resourceTarget.id,
    resourceBefore,
    resourceAfter,
    taxTargetId: taxTarget.id,
    taxCommandSelection: taxCommandState.players[0].selection.map((unit) => ({
      id: unit.id,
      order: unit.order,
      interactKind: unit.interactKind,
      interactTargetId: unit.interactTargetId,
    })),
    taxBefore,
    taxAfter,
    selectedOrdersAfterTax: afterTax.players[0].selection.map((unit) => ({
      id: unit.id,
      order: unit.order,
      interactKind: unit.interactKind,
      interactTargetId: unit.interactTargetId,
    })),
  };

  await fs.writeFile(path.join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2));
  await browser.close();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
