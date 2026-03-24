import { GAME_TITLE, MODE_DEFS, UI_COLORS, VEHICLE_DEFS } from "./constants.js";
import { formatTime } from "./physics.js";
import { getLevel, renderMinimap } from "./levelManager.js";
import { drawVehicleSpriteAt } from "./vehicleSprites.js";

function fillTextGlow(ctx, text, x, y, size, color = "#f4f8ff", align = "center") {
  ctx.save();
  ctx.textAlign = align;
  ctx.font = `900 ${size}px Trebuchet MS`;
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.3;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function withAlpha(color, alpha) {
  if (color.startsWith("#")) {
    const hex = Math.round(alpha * 255).toString(16).padStart(2, "0");
    return `${color}${hex}`;
  }
  if (color.startsWith("rgba(")) {
    return color.replace(/rgba\(([^)]+),\s*[\d.]+\)/, `rgba($1, ${alpha})`);
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
  }
  return color;
}

function drawPanel(ctx, x, y, w, h, accent = UI_COLORS.accentCyan, alpha = 0.82) {
  ctx.save();
  ctx.fillStyle = `rgba(7, 11, 20, ${alpha})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = withAlpha(accent, 0.55);
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = withAlpha(accent, 0.14);
  ctx.fillRect(x + 12, y + 12, w - 24, h - 24);
  ctx.restore();
}

function drawCutPanel(ctx, x, y, w, h, accent = UI_COLORS.accentHot, alpha = 0.86) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + 18, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - 18);
  ctx.lineTo(x + w - 18, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + 18);
  ctx.closePath();
  ctx.fillStyle = `rgba(6, 10, 17, ${alpha})`;
  ctx.fill();
  ctx.strokeStyle = withAlpha(accent, 0.8);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = withAlpha(accent, 0.18);
  ctx.fillRect(x + 14, y + 14, w - 28, h - 28);
  ctx.restore();
}

function drawStatBar(ctx, x, y, label, value, max = 1, color = "#2ef0ff", width = 180) {
  ctx.fillStyle = UI_COLORS.dim;
  ctx.font = "12px Trebuchet MS";
  ctx.textAlign = "left";
  ctx.fillText(label, x, y - 4);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x, y, width, 10);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * Math.max(0, Math.min(1, value / max)), 10);
}

function drawBackground(ctx, width, height, time, accentA = UI_COLORS.accentCyan, accentB = UI_COLORS.accentHot) {
  ctx.fillStyle = "#05070d";
  ctx.fillRect(0, 0, width, height);

  const glowA = ctx.createRadialGradient(width * 0.18, height * 0.24, 20, width * 0.18, height * 0.24, width * 0.38);
  glowA.addColorStop(0, `${accentA}44`);
  glowA.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, width, height);

  const glowB = ctx.createRadialGradient(width * 0.8, height * 0.76, 20, width * 0.8, height * 0.76, width * 0.42);
  glowB.addColorStop(0, `${accentB}44`);
  glowB.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 70) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(46,240,255,0.08)";
  ctx.lineWidth = 2;
  for (let index = 0; index < 12; index += 1) {
    const y = 90 + index * 90 + Math.sin(time * 0.8 + index) * 12;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + Math.cos(time * 0.6 + index) * 18);
    ctx.stroke();
  }
}

function drawVehicleGlyph(ctx, vehicle, x, y, scale = 1) {
  if (drawVehicleSpriteAt(ctx, vehicle, x, y, -Math.PI * 0.5, 38 * scale, 1)) {
    return;
  }

  const radius = 56 * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = vehicle.bodyColor;
  ctx.beginPath();
  ctx.moveTo(radius * 1.05, 0);
  ctx.lineTo(radius * 0.42, -radius * 0.8);
  ctx.lineTo(-radius * 0.58, -radius * 0.8);
  ctx.lineTo(-radius, -radius * 0.18);
  ctx.lineTo(-radius, radius * 0.18);
  ctx.lineTo(-radius * 0.58, radius * 0.8);
  ctx.lineTo(radius * 0.42, radius * 0.8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(8,12,20,0.72)";
  ctx.beginPath();
  ctx.moveTo(radius * 0.22, -radius * 0.48);
  ctx.lineTo(-radius * 0.34, -radius * 0.34);
  ctx.lineTo(-radius * 0.12, 0);
  ctx.lineTo(radius * 0.34, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = vehicle.trimColor;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.42, -radius * 0.42);
  ctx.lineTo(radius * 0.42, -radius * 0.22);
  ctx.lineTo(radius * 0.34, 0);
  ctx.lineTo(radius * 0.42, radius * 0.22);
  ctx.lineTo(-radius * 0.42, radius * 0.42);
  ctx.stroke();
  ctx.restore();
}

export class UIRenderer {
  renderTitle(ctx, width, height, time, connectedGamepads = [], playerCount = 1) {
    drawBackground(ctx, width, height, time, UI_COLORS.accentCyan, UI_COLORS.accentHot);

    fillTextGlow(ctx, GAME_TITLE, width * 0.5, 170, 94, "#f4f8ff");
    fillTextGlow(ctx, "ARCADE COMBAT RACING", width * 0.5, 226, 28, UI_COLORS.accentCyan);

    drawCutPanel(ctx, width * 0.5 - 390, 290, 780, 250, UI_COLORS.accentHot);
    ctx.fillStyle = UI_COLORS.text;
    ctx.font = "22px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText("Boost. Slam. Fire. Finish.", width * 0.5, 346);
    ctx.fillStyle = UI_COLORS.dim;
    ctx.font = "18px Trebuchet MS";
    [
      "Original local multiplayer vehicle combat with split-screen chaos",
      "Gamepad-first join flow, aggressive HUD, announcer calls, and arcade handling",
      "Race circuits, arenas, weapons, destructible props, and AI rivals",
    ].forEach((line, index) => ctx.fillText(line, width * 0.5, 394 + index * 34));

    drawPanel(ctx, 70, height - 250, 340, 160, UI_COLORS.accentCyan, 0.8);
    ctx.fillStyle = UI_COLORS.text;
    ctx.textAlign = "left";
    ctx.font = "bold 24px Trebuchet MS";
    ctx.fillText("Join Status", 96, height - 208);
    ctx.font = "18px Trebuchet MS";
    ctx.fillText(`Connected pads: ${connectedGamepads.length}`, 96, height - 164);
    ctx.fillText(`Current local drivers: ${playerCount}`, 96, height - 132);
    ctx.fillStyle = UI_COLORS.dim;
    ctx.fillText("Press A/Start on a controller to pre-join", 96, height - 102);

    drawPanel(ctx, width - 410, height - 250, 340, 160, UI_COLORS.accentHot, 0.8);
    ctx.fillStyle = UI_COLORS.text;
    ctx.textAlign = "left";
    ctx.font = "bold 24px Trebuchet MS";
    ctx.fillText("Modes Online", width - 384, height - 208);
    ctx.font = "18px Trebuchet MS";
    ctx.fillText("Combat Race  |  Arena Deathmatch", width - 384, height - 164);
    ctx.fillText("Survival  |  Drift Attack  |  Quick Battle", width - 384, height - 132);
    ctx.fillStyle = UI_COLORS.dim;
    ctx.fillText("Original vehicles, pickups, bots, and maps", width - 384, height - 102);

    fillTextGlow(ctx, "PRESS ENTER, SPACE, A, OR START", width * 0.5, height - 72, 28, UI_COLORS.accentHot);
  }

  renderLobby(ctx, width, height, menu, connectedGamepads, time) {
    drawBackground(ctx, width, height, time, UI_COLORS.accentCyan, UI_COLORS.accentLime);
    fillTextGlow(ctx, "DRIVER LOBBY", width * 0.5, 92, 52, UI_COLORS.accentCyan);

    const panelWidth = Math.min(280, width * 0.2);
    const gap = 18;
    const totalWidth = panelWidth * 4 + gap * 3;
    const originX = width * 0.5 - totalWidth * 0.5;

    for (let index = 0; index < 4; index += 1) {
      const x = originX + index * (panelWidth + gap);
      const y = 160;
      const player = menu.players[index];
      const accent = player ? player.color : "rgba(255,255,255,0.14)";
      drawCutPanel(ctx, x, y, panelWidth, 300, accent, player ? 0.88 : 0.36);

      ctx.fillStyle = player ? UI_COLORS.text : UI_COLORS.dim;
      ctx.font = "bold 24px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillText(player ? player.label : `OPEN ${index + 1}`, x + panelWidth * 0.5, y + 46);

      if (player) {
        const vehicle = VEHICLE_DEFS.find((entry) => entry.id === player.vehicleId) ?? VEHICLE_DEFS[0];
        drawVehicleGlyph(ctx, vehicle, x + panelWidth * 0.5, y + 128, 0.7);
        ctx.fillStyle = UI_COLORS.text;
        ctx.font = "bold 20px Trebuchet MS";
        ctx.fillText(vehicle.name, x + panelWidth * 0.5, y + 214);
        ctx.fillStyle = UI_COLORS.dim;
        ctx.font = "16px Trebuchet MS";
        ctx.fillText(player.type === "gamepad" ? `Pad ${player.gamepadIndex + 1}` : `Keyboard ${player.schemeIndex + 1}`, x + panelWidth * 0.5, y + 246);
        ctx.fillText(vehicle.archetype, x + panelWidth * 0.5, y + 272);
      } else {
        ctx.fillStyle = UI_COLORS.dim;
        ctx.font = "18px Trebuchet MS";
        ctx.fillText("Press A / START", x + panelWidth * 0.5, y + 134);
        ctx.fillText("or 2 / 3 / 4", x + panelWidth * 0.5, y + 168);
      }
    }

    drawPanel(ctx, width * 0.5 - 430, 500, 860, 170, UI_COLORS.accentHot, 0.82);
    ctx.fillStyle = UI_COLORS.text;
    ctx.textAlign = "left";
    ctx.font = "bold 20px Trebuchet MS";
    ctx.fillText(`AI Fill: ${menu.aiFill}`, width * 0.5 - 392, 546);
    ctx.fillText(`Bot Skill: ${menu.getBotDifficulty().name}`, width * 0.5 - 392, 582);
    ctx.fillText(`Connected Pads: ${connectedGamepads.length}`, width * 0.5 - 392, 618);
    ctx.fillStyle = UI_COLORS.dim;
    ctx.font = "18px Trebuchet MS";
    ctx.fillText("Left/Right changes AI fill. Up/Down changes bot skill.", width * 0.5 - 90, 546);
    ctx.fillText("Press B on a joined gamepad to leave that slot.", width * 0.5 - 90, 582);
    ctx.fillText("Delete removes the last human. Enter or Start locks the lobby.", width * 0.5 - 90, 618);
  }

  renderVehicleSelect(ctx, width, height, menu) {
    drawBackground(ctx, width, height, 0.6, UI_COLORS.accentHot, UI_COLORS.accentCyan);
    fillTextGlow(ctx, "VEHICLE SELECT", width * 0.5, 88, 56, UI_COLORS.accentHot);

    const focusPlayer = menu.players[menu.vehicleCursor];
    const focusVehicle = VEHICLE_DEFS.find((entry) => entry.id === focusPlayer.vehicleId) ?? VEHICLE_DEFS[0];

    drawCutPanel(ctx, 80, 150, 420, 520, focusPlayer.color, 0.9);
    drawVehicleGlyph(ctx, focusVehicle, 290, 310, 1.55);
    fillTextGlow(ctx, focusVehicle.name, 290, 430, 34, "#f4f8ff");
    fillTextGlow(ctx, focusVehicle.archetype, 290, 468, 18, UI_COLORS.dim);
    drawStatBar(ctx, 116, 516, "Speed", focusVehicle.speed, 600, UI_COLORS.accentCyan, 250);
    drawStatBar(ctx, 116, 552, "Acceleration", focusVehicle.acceleration, 420, UI_COLORS.accentHot, 250);
    drawStatBar(ctx, 116, 588, "Handling", focusVehicle.handling, 3.1, UI_COLORS.accentLime, 250);
    drawStatBar(ctx, 116, 624, "Armor", focusVehicle.armor, 180, UI_COLORS.danger, 250);

    drawPanel(ctx, 540, 150, width - 620, 520, UI_COLORS.accentCyan, 0.84);
    fillTextGlow(ctx, "DRIVER GRID", 610, 196, 22, UI_COLORS.accentCyan, "left");
    menu.players.forEach((player, index) => {
      const vehicle = VEHICLE_DEFS.find((entry) => entry.id === player.vehicleId) ?? VEHICLE_DEFS[0];
      const rowY = 238 + index * 96;
      drawCutPanel(ctx, 574, rowY - 26, width - 688, 78, index === menu.vehicleCursor ? player.color : "rgba(255,255,255,0.14)", 0.84);
      ctx.fillStyle = UI_COLORS.text;
      ctx.textAlign = "left";
      ctx.font = "bold 22px Trebuchet MS";
      ctx.fillText(`${player.label}  ${vehicle.name}`, 604, rowY + 2);
      ctx.fillStyle = UI_COLORS.dim;
      ctx.font = "16px Trebuchet MS";
      ctx.fillText(player.type === "gamepad" ? `Pad ${player.gamepadIndex + 1}` : `Keyboard ${player.schemeIndex + 1}`, 604, rowY + 28);
      ctx.fillText(vehicle.description, 860, rowY + 2);
      ctx.fillText(vehicle.archetype, 860, rowY + 28);
    });

    fillTextGlow(ctx, "UP / DOWN selects driver, LEFT / RIGHT changes vehicle", width * 0.5, height - 76, 20, UI_COLORS.dim);
  }

  renderModeSelect(ctx, width, height, menu) {
    const mode = MODE_DEFS[menu.modeId];
    drawBackground(ctx, width, height, 0.4, UI_COLORS.accentCyan, UI_COLORS.accentHot);
    fillTextGlow(ctx, "MODE SELECT", width * 0.5, 92, 54, UI_COLORS.accentCyan);

    drawCutPanel(ctx, width * 0.5 - 370, 180, 740, 360, UI_COLORS.accentCyan, 0.9);
    fillTextGlow(ctx, mode.name, width * 0.5, 252, 44, "#f4f8ff");
    fillTextGlow(ctx, mode.description, width * 0.5, 308, 20, UI_COLORS.dim);

    ctx.textAlign = "center";
    ctx.font = "bold 22px Trebuchet MS";
    ctx.fillStyle = UI_COLORS.text;
    if (mode.laps) {
      ctx.fillText(`Laps: ${mode.laps}`, width * 0.5, 390);
    }
    if (mode.killTarget) {
      ctx.fillText(`Kill Target: ${mode.killTarget}`, width * 0.5, 390);
    }
    ctx.fillText(`Time Limit: ${mode.timeLimit >= 999 ? "Open End" : formatTime(mode.timeLimit)}`, width * 0.5, 432);
    ctx.fillText(`Respawns: ${mode.respawn ? "Enabled" : "Disabled"}`, width * 0.5, 474);

    fillTextGlow(ctx, "LEFT / RIGHT changes mode. ENTER confirms.", width * 0.5, height - 76, 22, UI_COLORS.dim);
  }

  renderMapSelect(ctx, width, height, menu) {
    const level = getLevel(menu.selectedLevelId);
    drawBackground(ctx, width, height, 0.5, UI_COLORS.accentLime, UI_COLORS.accentCyan);
    fillTextGlow(ctx, "MAP SELECT", width * 0.5, 92, 54, UI_COLORS.accentLime);

    drawCutPanel(ctx, width * 0.5 - 460, 154, 920, 500, UI_COLORS.accentLime, 0.9);
    fillTextGlow(ctx, level.name, width * 0.5, 228, 42, "#f4f8ff");
    fillTextGlow(ctx, level.intro, width * 0.5, 272, 20, UI_COLORS.dim);
    fillTextGlow(ctx, `${level.category.toUpperCase()} MAP`, width * 0.5, 312, 18, UI_COLORS.accentHot);

    renderMinimap(ctx, level, width * 0.5 - 300, 360, 600, 230, [], null);
    fillTextGlow(ctx, "LEFT / RIGHT changes map. ENTER launches the match.", width * 0.5, height - 76, 22, UI_COLORS.dim);
  }

  renderPause(ctx, width, height, modeName, pauseIndex) {
    ctx.fillStyle = "rgba(3, 7, 12, 0.86)";
    ctx.fillRect(0, 0, width, height);
    fillTextGlow(ctx, "PAUSED", width * 0.5, 200, 72, UI_COLORS.accentHot);
    fillTextGlow(ctx, modeName, width * 0.5, 248, 24, UI_COLORS.dim);

    const options = ["Resume", "Restart Match", "Quit To Lobby"];
    options.forEach((option, index) => {
      const y = 354 + index * 78;
      drawCutPanel(ctx, width * 0.5 - 220, y - 34, 440, 56, index === pauseIndex ? UI_COLORS.accentCyan : "rgba(255,255,255,0.14)", 0.9);
      fillTextGlow(ctx, option, width * 0.5, y, 24, "#f4f8ff");
    });
  }

  renderResults(ctx, width, height, results) {
    drawBackground(ctx, width, height, 0.3, UI_COLORS.accentCyan, UI_COLORS.accentHot);
    fillTextGlow(ctx, "RESULTS", width * 0.5, 90, 58, UI_COLORS.accentCyan);
    fillTextGlow(ctx, `${results.modeName}  |  ${results.levelName}`, width * 0.5, 128, 22, UI_COLORS.dim);

    drawCutPanel(ctx, width * 0.5 - 440, 174, 880, 430, UI_COLORS.accentHot, 0.9);
    results.standings.forEach((entry, index) => {
      const y = 244 + index * 62;
      ctx.fillStyle = index === 0 ? UI_COLORS.warning : UI_COLORS.text;
      ctx.font = "bold 24px Trebuchet MS";
      ctx.textAlign = "left";
      ctx.fillText(`${index + 1}. ${entry.label}`, width * 0.5 - 384, y);
      ctx.textAlign = "right";
      ctx.fillText(entry.summary, width * 0.5 + 384, y);
    });

    fillTextGlow(ctx, "ENTER OR START RETURNS TO THE LOBBY", width * 0.5, height - 80, 22, UI_COLORS.dim);
  }

  renderGlobalMatchBanner(ctx, width, height, match) {
    const bannerWidth = match.mode.id === "driftAttack" ? 500 : 360;
    drawCutPanel(ctx, width * 0.5 - bannerWidth * 0.5, 12, bannerWidth, 62, UI_COLORS.accentHot, 0.88);
    ctx.fillStyle = UI_COLORS.text;
    ctx.font = "bold 18px Trebuchet MS";
    ctx.textAlign = "center";
    const timer = match.mode.timeLimit >= 999 ? formatTime(match.elapsed) : formatTime(Math.max(0, match.mode.timeLimit - match.elapsed));
    const suffix = match.mode.id === "driftAttack" ? `  |  Lead ${Math.round(match.driftLeadScore ?? 0)}` : "";
    ctx.fillText(`${match.mode.name}  |  ${timer}${suffix}`, width * 0.5, 50);
  }

  renderViewportFrame(ctx, viewport, participant) {
    ctx.save();
    ctx.strokeStyle = `${participant.color}cc`;
    ctx.lineWidth = 2;
    ctx.strokeRect(viewport.x - 1, viewport.y - 1, viewport.w + 2, viewport.h + 2);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 4;
    ctx.strokeRect(viewport.x - 4, viewport.y - 4, viewport.w + 8, viewport.h + 8);
    ctx.fillStyle = `${participant.color}66`;
    ctx.fillRect(viewport.x + 10, viewport.y + 10, 36, 5);
    ctx.restore();
  }

  renderHud(ctx, viewport, participant, match, level, pickups = []) {
    const vehicle = participant.vehicle;
    const x = viewport.x;
    const y = viewport.y;
    const w = viewport.w;
    const h = viewport.h;
    const compact = w < 520 || h < 320;
    const leftWidth = compact ? 234 : 274;

    drawPanel(ctx, x + 14, y + 14, leftWidth, compact ? 118 : 132, participant.color, 0.78);
    ctx.fillStyle = UI_COLORS.text;
    ctx.font = compact ? "bold 16px Trebuchet MS" : "bold 18px Trebuchet MS";
    ctx.textAlign = "left";
    ctx.fillText(`${participant.label}  ${vehicle.definition.name}`, x + 28, y + 38);
    ctx.fillStyle = UI_COLORS.dim;
    ctx.font = compact ? "13px Trebuchet MS" : "14px Trebuchet MS";
    ctx.fillText(`${vehicle.definition.archetype}  |  ${Math.round(vehicle.speed)} u/s`, x + 28, y + 58);

    const healthRatio = vehicle.health / vehicle.maxHealth;
    const boostRatio = vehicle.boost / vehicle.maxBoost;
    const barWidth = leftWidth - 56;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x + 28, y + 72, barWidth, 11);
    ctx.fillRect(x + 28, y + 98, barWidth, 11);
    ctx.fillStyle = healthRatio < 0.3 ? UI_COLORS.danger : UI_COLORS.good;
    ctx.fillRect(x + 28, y + 72, barWidth * healthRatio, 11);
    ctx.fillStyle = UI_COLORS.accentCyan;
    ctx.fillRect(x + 28, y + 98, barWidth * Math.min(1, boostRatio), 11);
    if (boostRatio > 1) {
      ctx.fillStyle = UI_COLORS.accentHot;
      ctx.fillRect(x + 28 + barWidth, y + 98, Math.min(barWidth * 0.35, barWidth * (boostRatio - 1)), 11);
    }

    ctx.fillStyle = UI_COLORS.text;
    ctx.textAlign = "right";
    ctx.fillText(vehicle.specialWeaponId ? `${vehicle.specialWeaponId.toUpperCase()} x${vehicle.specialAmmo}` : "AUTOCANNON", x + leftWidth - 24, y + 58);

    const rightWidth = compact ? 152 : 186;
    drawPanel(ctx, x + w - rightWidth - 14, y + 14, rightWidth, compact ? 118 : 132, UI_COLORS.accentCyan, 0.76);
    ctx.fillStyle = UI_COLORS.text;
    ctx.textAlign = "left";
    ctx.font = compact ? "bold 16px Trebuchet MS" : "bold 18px Trebuchet MS";
    ctx.fillText(`#${vehicle.place}`, x + w - rightWidth + 4, y + 38);
    ctx.font = compact ? "13px Trebuchet MS" : "15px Trebuchet MS";
    if (match.mode.id === "combatRace") {
      ctx.fillText(`Lap ${Math.min(match.mode.laps, vehicle.lap + 1)}/${match.mode.laps}`, x + w - rightWidth + 4, y + 60);
      ctx.fillText(vehicle.wrongWay ? "Wrong Way" : "Race Line", x + w - rightWidth + 4, y + 82);
      ctx.fillText(`Kills ${vehicle.kills}`, x + w - rightWidth + 4, y + 104);
    } else if (match.mode.id === "driftAttack") {
      ctx.fillText(`Score ${Math.round(vehicle.score)}`, x + w - rightWidth + 4, y + 60);
      ctx.fillText(`Drift ${Math.round(vehicle.driftScore)}`, x + w - rightWidth + 4, y + 82);
      ctx.fillText(`Chain x${Math.max(1, vehicle.streakLevel + 1)}`, x + w - rightWidth + 4, y + 104);
    } else {
      ctx.fillText(`Kills ${vehicle.kills}`, x + w - rightWidth + 4, y + 60);
      ctx.fillText(`Deaths ${vehicle.deaths}`, x + w - rightWidth + 4, y + 82);
      ctx.fillText(`Score ${vehicle.score}`, x + w - rightWidth + 4, y + 104);
    }

    if (!compact) {
      renderMinimap(ctx, level, x + w - 204, y + h - 166, 190, 152, match.participants, participant.id, {
        rotateWithFocus: true,
        time: match.elapsed,
        pickups,
      });
    }

    if (vehicle.streakLevel > 0) {
      drawCutPanel(ctx, x + 20, y + h - 68, compact ? 136 : 156, 42, UI_COLORS.warning, 0.82);
      fillTextGlow(ctx, `OVERDRIVE x${vehicle.streakLevel + 1}`, x + (compact ? 88 : 98), y + h - 40, compact ? 13 : 14, UI_COLORS.warning);
    }

    if (!vehicle.isAlive() && !vehicle.eliminated) {
      fillTextGlow(ctx, `RESPAWNING ${vehicle.respawnTimer.toFixed(1)}`, x + w * 0.5, y + h * 0.5, compact ? 26 : 34, UI_COLORS.accentHot);
    }
    if (vehicle.eliminated) {
      fillTextGlow(ctx, "ELIMINATED", x + w * 0.5, y + h * 0.5, compact ? 28 : 36, UI_COLORS.danger);
    }
  }

  renderAnnouncer(ctx, width, height, announcer) {
    const primary = announcer.getPrimary();
    if (!primary) {
      return;
    }

    const alpha = Math.min(1, primary.life / Math.max(0.25, primary.duration * 0.4));
    ctx.save();
    ctx.globalAlpha = alpha;
    drawCutPanel(ctx, width * 0.5 - 260, height * 0.12, 520, 90, primary.accent, 0.84);
    fillTextGlow(ctx, primary.text, width * 0.5, height * 0.12 + 44, 34, primary.color);
    if (primary.subtext) {
      fillTextGlow(ctx, primary.subtext, width * 0.5, height * 0.12 + 72, 16, UI_COLORS.dim);
    }
    ctx.restore();

    announcer.getSecondary().forEach((message, index) => {
      ctx.save();
      ctx.globalAlpha = 0.8 * (message.life / message.duration);
      drawPanel(ctx, width * 0.5 - 170, height * 0.12 + 108 + index * 48, 340, 36, message.accent, 0.7);
      fillTextGlow(ctx, message.text, width * 0.5, height * 0.12 + 133 + index * 48, 16, message.color);
      ctx.restore();
    });
  }
}
