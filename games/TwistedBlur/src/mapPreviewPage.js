import { createMatchProps, getLevel, getLevels, renderLevel, renderProps } from "./levelManager.js";

const canvas = document.getElementById("mapPreviewCanvas");
const ctx = canvas.getContext("2d");
const params = new URLSearchParams(window.location.search);
const requestedLevelId = params.get("level");
const level = getLevel(requestedLevelId || getLevels()[0].id);
const props = createMatchProps(level);

function drawFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = level.palette.ground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padding = 18;
  const scale = Math.min(
    (canvas.width - padding * 2) / level.world.width,
    (canvas.height - padding * 2) / level.world.height,
  );
  const worldWidth = level.world.width * scale;
  const worldHeight = level.world.height * scale;
  const originX = (canvas.width - worldWidth) * 0.5;
  const originY = (canvas.height - worldHeight) * 0.5;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.scale(scale, scale);
  renderLevel(ctx, level, 0.8);
  renderProps(ctx, props, 0.8);
  ctx.restore();
}

drawFrame();
document.body.dataset.ready = "1";
