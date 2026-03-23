export class AlertSystem {
  constructor(decayRate = 0.3) {
    this.level = 0;
    this.max = 5;
    this.decayRate = decayRate;
    this.waveMarker = null;
    this.waveMarkerTimer = 0;
  }

  add(amount) {
    this.level = Math.min(this.max, this.level + amount);
  }

  update(dt, options) {
    const decay = (options.alertDecayRate ?? this.decayRate) * dt;
    this.level = Math.max(0, this.level - decay);
    this.waveMarkerTimer = Math.max(0, this.waveMarkerTimer - dt);
    if (this.waveMarkerTimer <= 0) {
      this.waveMarker = null;
    }
  }

  registerTownAttack() {
    this.add(0.42);
  }

  registerMilitaryKill() {
    this.add(0.25);
  }

  registerWave(point) {
    this.waveMarker = point.clone();
    this.waveMarkerTimer = 16;
    this.add(0.8);
  }
}
