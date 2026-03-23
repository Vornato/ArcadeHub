import { torusDelta } from "../world/world.js";

export class Minimap {
  constructor(canvas, worldSize = 1000) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d");
    this.worldSize = worldSize;
  }

  worldToMini(position) {
    const x = (position.x / this.worldSize) * this.canvas.width;
    const y = (position.z / this.worldSize) * this.canvas.height;
    return { x, y };
  }

  drawCircle(pos, radius, color) {
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  drawBase(world) {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = "rgba(8,22,42,0.95)";
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.strokeStyle = "rgba(130, 214, 255, 0.45)";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(1, 1, width - 2, height - 2);

    this.ctx.fillStyle = "rgba(70, 130, 190, 0.72)";
    for (const zone of world.waterZones) {
      if (zone.type === "rect") {
        const x = (zone.x / this.worldSize) * width;
        const y = (zone.z / this.worldSize) * height;
        const w = (zone.width / this.worldSize) * width;
        const h = (zone.height / this.worldSize) * height;
        this.ctx.fillRect(x, y, w, h);
      } else if (zone.type === "circle") {
        const pos = this.worldToMini(zone);
        const r = (zone.radius / this.worldSize) * width;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.strokeStyle = "rgba(130, 199, 132, 0.65)";
    this.ctx.lineWidth = 1;
    for (const farm of world.farmZones) {
      const center = this.worldToMini(farm);
      const radius = (farm.radius / this.worldSize) * width;
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  drawMarkers(markers, color, radius = 2) {
    this.ctx.fillStyle = color;
    for (const marker of markers) {
      const mini = this.worldToMini(marker);
      this.ctx.beginPath();
      this.ctx.arc(mini.x, mini.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawDirectionLine(from, to, color = "rgba(255,240,155,0.7)") {
    if (!from || !to) return;
    const delta = torusDelta(from, to, this.worldSize);
    const dir = delta.normalize();
    const miniFrom = this.worldToMini(from);
    const lineLen = 20;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(miniFrom.x, miniFrom.y);
    this.ctx.lineTo(miniFrom.x + dir.x * lineLen, miniFrom.y + dir.z * lineLen);
    this.ctx.stroke();
  }

  update({
    world,
    players,
    enemyMarkers,
    cowMarkers,
    techMarkers,
    objectives,
    scanPulseActive,
    pingMarker,
    waveMarker,
    currentObjectiveMarker
  }) {
    this.drawBase(world);

    this.drawMarkers(enemyMarkers, "rgba(255,92,92,0.88)", scanPulseActive ? 3 : 2);
    this.drawMarkers(cowMarkers, "rgba(255,255,255,0.85)", 2);
    this.drawMarkers(techMarkers, "rgba(120,255,247,0.95)", 2.5);
    this.drawMarkers(objectives, "rgba(255,219,92,0.95)", 3.2);
    this.drawMarkers(players.map((player) => player.root.position), "rgba(88,191,255,0.95)", 3.6);

    if (pingMarker) {
      this.drawMarkers([pingMarker], "rgba(150,235,255,0.95)", 4.2);
    }
    if (waveMarker) {
      this.drawMarkers([waveMarker], "rgba(255,126,126,0.95)", 5);
    }
    if (players[0] && currentObjectiveMarker) {
      this.drawDirectionLine(players[0].root.position, currentObjectiveMarker);
    }

    if (players[1]) {
      const second = this.worldToMini(players[1].root.position);
      this.drawCircle(second, 4.8, "rgba(112,255,154,0.32)");
    }
  }
}
