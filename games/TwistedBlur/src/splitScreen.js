function padViewport(x, y, w, h, outer, gap) {
  return {
    x: x + gap,
    y: y + gap,
    w: w - gap * 2,
    h: h - gap * 2,
    outer,
  };
}

export function getSplitScreenLayout(playerCount, width, height) {
  const outer = Math.max(10, Math.min(width, height) * 0.012);
  const gap = Math.max(5, Math.min(width, height) * 0.004);
  const innerWidth = width - outer * 2;
  const innerHeight = height - outer * 2;
  const originX = outer;
  const originY = outer;

  if (playerCount <= 1) {
    return [padViewport(originX, originY, innerWidth, innerHeight, outer, gap)];
  }

  if (playerCount === 2) {
    if (width >= height * 1.15) {
      return [
        padViewport(originX, originY, innerWidth * 0.5, innerHeight, outer, gap),
        padViewport(originX + innerWidth * 0.5, originY, innerWidth * 0.5, innerHeight, outer, gap),
      ];
    }
    return [
      padViewport(originX, originY, innerWidth, innerHeight * 0.5, outer, gap),
      padViewport(originX, originY + innerHeight * 0.5, innerWidth, innerHeight * 0.5, outer, gap),
    ];
  }

  if (playerCount === 3) {
    return [
      padViewport(originX, originY, innerWidth, innerHeight * 0.52, outer, gap),
      padViewport(originX, originY + innerHeight * 0.52, innerWidth * 0.5, innerHeight * 0.48, outer, gap),
      padViewport(originX + innerWidth * 0.5, originY + innerHeight * 0.52, innerWidth * 0.5, innerHeight * 0.48, outer, gap),
    ];
  }

  return [
    padViewport(originX, originY, innerWidth * 0.5, innerHeight * 0.5, outer, gap),
    padViewport(originX + innerWidth * 0.5, originY, innerWidth * 0.5, innerHeight * 0.5, outer, gap),
    padViewport(originX, originY + innerHeight * 0.5, innerWidth * 0.5, innerHeight * 0.5, outer, gap),
    padViewport(originX + innerWidth * 0.5, originY + innerHeight * 0.5, innerWidth * 0.5, innerHeight * 0.5, outer, gap),
  ];
}
