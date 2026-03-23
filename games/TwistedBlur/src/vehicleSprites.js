const spriteCache = new Map();

function getSpriteAngleOffset(vehicleDef) {
  if (vehicleDef.spriteFacing === "left") {
    return Math.PI;
  }
  if (vehicleDef.spriteFacing === "up") {
    return Math.PI * 0.5;
  }
  if (vehicleDef.spriteFacing === "down") {
    return -Math.PI * 0.5;
  }
  return 0;
}

function getSpriteMetrics(vehicleDef, image, size) {
  const width = size * (vehicleDef.spriteScale ?? 1) * 3.3;
  const height = width * (image.height / image.width);
  return { width, height };
}

export function getVehicleSprite(vehicleDef) {
  if (!vehicleDef?.spritePath) {
    return null;
  }

  if (!spriteCache.has(vehicleDef.spritePath)) {
    const image = new Image();
    const record = {
      image,
      loaded: false,
      failed: false,
    };

    image.decoding = "async";
    image.onload = () => {
      record.loaded = true;
    };
    image.onerror = () => {
      record.failed = true;
    };
    image.src = new URL(vehicleDef.spritePath, import.meta.url).href;
    spriteCache.set(vehicleDef.spritePath, record);
  }

  return spriteCache.get(vehicleDef.spritePath);
}

export function drawVehicleSpriteLocal(ctx, vehicleDef, size, alpha = 1) {
  const record = getVehicleSprite(vehicleDef);
  if (!record?.loaded || record.failed) {
    return false;
  }

  const { width, height } = getSpriteMetrics(vehicleDef, record.image, size);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.rotate(getSpriteAngleOffset(vehicleDef));
  ctx.drawImage(record.image, -width * 0.5, -height * 0.5, width, height);
  ctx.restore();
  return true;
}

export function drawVehicleSpriteAt(ctx, vehicleDef, x, y, angle, size, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const drawn = drawVehicleSpriteLocal(ctx, vehicleDef, size, alpha);
  ctx.restore();
  return drawn;
}
