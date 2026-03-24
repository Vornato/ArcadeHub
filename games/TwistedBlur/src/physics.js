import { PHYSICS_TUNING } from "./constants.js";

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function inverseLerp(a, b, value) {
  if (a === b) {
    return 0;
  }
  return clamp((value - a) / (b - a), 0, 1);
}

export function approach(value, target, delta) {
  if (value < target) {
    return Math.min(value + delta, target);
  }
  return Math.max(value - delta, target);
}

export function length(x, y) {
  return Math.hypot(x, y);
}

export function distance(aX, aY, bX, bY) {
  return Math.hypot(bX - aX, bY - aY);
}

export function angleToVector(angle) {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function dot(aX, aY, bX, bY) {
  return aX * bX + aY * bY;
}

export function wrapAngle(angle) {
  let wrapped = angle;
  while (wrapped > Math.PI) {
    wrapped -= Math.PI * 2;
  }
  while (wrapped < -Math.PI) {
    wrapped += Math.PI * 2;
  }
  return wrapped;
}

export function signedAngleToTarget(sourceAngle, sourceX, sourceY, targetX, targetY) {
  const desired = Math.atan2(targetY - sourceY, targetX - sourceX);
  return wrapAngle(desired - sourceAngle);
}

export function normalize(x, y) {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len, length: len };
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function circleRectHit(circleX, circleY, radius, rect) {
  const nearestX = clamp(circleX, rect.x, rect.x + rect.w);
  const nearestY = clamp(circleY, rect.y, rect.y + rect.h);
  const dx = circleX - nearestX;
  const dy = circleY - nearestY;
  return dx * dx + dy * dy <= radius * radius;
}

export function pointInCircle(x, y, circle) {
  return distance(x, y, circle.x, circle.y) <= circle.r;
}

export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

export function chooseWeighted(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;

  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.id;
    }
  }

  return entries[entries.length - 1]?.id ?? null;
}

export function formatTime(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function projectPointToSegment(px, py, ax, ay, bx, by) {
  const abX = bx - ax;
  const abY = by - ay;
  const abLengthSq = abX * abX + abY * abY || 1;
  const t = clamp(((px - ax) * abX + (py - ay) * abY) / abLengthSq, 0, 1);
  const x = ax + abX * t;
  const y = ay + abY * t;
  return { x, y, t, distance: Math.hypot(px - x, py - y) };
}

export function distanceToPolyline(px, py, points, closed = true) {
  if (!points || points.length < 2) {
    return { distance: Number.POSITIVE_INFINITY, point: { x: px, y: py }, index: -1, t: 0 };
  }

  let best = {
    distance: Number.POSITIVE_INFINITY,
    point: { x: px, y: py },
    index: -1,
    t: 0,
  };

  const end = closed ? points.length : points.length - 1;
  for (let index = 0; index < end; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const projection = projectPointToSegment(px, py, a.x, a.y, b.x, b.y);
    if (projection.distance < best.distance) {
      best = { distance: projection.distance, point: projection, index, t: projection.t };
    }
  }

  return best;
}

export function segmentCircleHit(ax, ay, bx, by, cx, cy, radius) {
  const projection = projectPointToSegment(cx, cy, ax, ay, bx, by);
  return projection.distance <= radius;
}

export function segmentRectHit(ax, ay, bx, by, rect) {
  if (pointInRect(ax, ay, rect) || pointInRect(bx, by, rect)) {
    return true;
  }

  const edges = [
    [rect.x, rect.y, rect.x + rect.w, rect.y],
    [rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h],
    [rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h],
    [rect.x, rect.y + rect.h, rect.x, rect.y],
  ];

  for (const [cx, cy, dx, dy] of edges) {
    if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) {
      return true;
    }
  }

  return false;
}

function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const abX = bx - ax;
  const abY = by - ay;
  const cdX = dx - cx;
  const cdY = dy - cy;
  const denom = abX * cdY - abY * cdX;
  if (denom === 0) {
    return false;
  }
  const acX = cx - ax;
  const acY = cy - ay;
  const t = (acX * cdY - acY * cdX) / denom;
  const u = (acX * abY - acY * abX) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function resolveVehicleCollision(vehicleA, vehicleB) {
  if (!vehicleA.isSolid() || !vehicleB.isSolid() || vehicleA.airborne || vehicleB.airborne) {
    return null;
  }

  const dx = vehicleB.x - vehicleA.x;
  const dy = vehicleB.y - vehicleA.y;
  const minDistance = vehicleA.radius + vehicleB.radius;
  const dist = Math.hypot(dx, dy) || 0.0001;

  if (dist >= minDistance) {
    return null;
  }

  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDistance - dist;
  const totalMass = vehicleA.mass + vehicleB.mass;
  const aPush = vehicleB.mass / totalMass;
  const bPush = vehicleA.mass / totalMass;

  vehicleA.x -= nx * overlap * aPush;
  vehicleA.y -= ny * overlap * aPush;
  vehicleB.x += nx * overlap * bPush;
  vehicleB.y += ny * overlap * bPush;

  const relativeVX = vehicleB.vx - vehicleA.vx;
  const relativeVY = vehicleB.vy - vehicleA.vy;
  const separatingSpeed = dot(relativeVX, relativeVY, nx, ny);
  if (separatingSpeed > 0) {
    return { impactSpeed: separatingSpeed, x: vehicleA.x + dx * 0.5, y: vehicleA.y + dy * 0.5, nx, ny };
  }

  const impulse = (-(1 + PHYSICS_TUNING.collisionBounce) * separatingSpeed) / ((1 / vehicleA.mass) + (1 / vehicleB.mass));
  const impulseX = impulse * nx;
  const impulseY = impulse * ny;

  vehicleA.vx -= impulseX / vehicleA.mass;
  vehicleA.vy -= impulseY / vehicleA.mass;
  vehicleB.vx += impulseX / vehicleB.mass;
  vehicleB.vy += impulseY / vehicleB.mass;

  return {
    impactSpeed: Math.abs(separatingSpeed),
    x: vehicleA.x + dx * 0.5,
    y: vehicleA.y + dy * 0.5,
    nx,
    ny,
  };
}

export function constrainVehicleToLevel(vehicle, level, extraObstacles = []) {
  if (!vehicle.isSolid()) {
    return null;
  }

  let severity = 0;
  const r = vehicle.radius;
  const minX = 0;
  const minY = 0;
  const maxX = level.world.width;
  const maxY = level.world.height;

  if (vehicle.x - r < minX) {
    vehicle.x = minX + r;
    vehicle.vx = Math.abs(vehicle.vx) * 0.5;
    severity += 80;
  }
  if (vehicle.x + r > maxX) {
    vehicle.x = maxX - r;
    vehicle.vx = -Math.abs(vehicle.vx) * 0.5;
    severity += 80;
  }
  if (vehicle.y - r < minY) {
    vehicle.y = minY + r;
    vehicle.vy = Math.abs(vehicle.vy) * 0.5;
    severity += 80;
  }
  if (vehicle.y + r > maxY) {
    vehicle.y = maxY - r;
    vehicle.vy = -Math.abs(vehicle.vy) * 0.5;
    severity += 80;
  }

  const obstacles = vehicle.airborne ? [] : [...(level.obstacles ?? []), ...extraObstacles];
  for (const obstacle of obstacles) {
    const nearestX = clamp(vehicle.x, obstacle.x, obstacle.x + obstacle.w);
    const nearestY = clamp(vehicle.y, obstacle.y, obstacle.y + obstacle.h);
    const diffX = vehicle.x - nearestX;
    const diffY = vehicle.y - nearestY;
    const distSq = diffX * diffX + diffY * diffY;

    if (distSq >= r * r) {
      continue;
    }

    const dist = Math.sqrt(distSq) || 0.0001;
    const overlap = r - dist;
    const nx = distSq === 0 ? Math.sign(vehicle.x - (obstacle.x + obstacle.w * 0.5)) || 1 : diffX / dist;
    const ny = distSq === 0 ? Math.sign(vehicle.y - (obstacle.y + obstacle.h * 0.5)) || 0 : diffY / dist;
    vehicle.x += nx * overlap;
    vehicle.y += ny * overlap;

    const bounce = dot(vehicle.vx, vehicle.vy, nx, ny);
    if (bounce < 0) {
      vehicle.vx -= (1 + PHYSICS_TUNING.collisionBounce * 0.7) * bounce * nx;
      vehicle.vy -= (1 + PHYSICS_TUNING.collisionBounce * 0.7) * bounce * ny;
    }
    severity += Math.abs(bounce);
  }

  return severity > 0 ? severity : null;
}
