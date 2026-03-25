export class AudioSystem {
  constructor() {
    this.context = null;
    this.master = null;
    this.musicMode = "menu";
    this.musicTimer = 0;
    this.musicStep = 0;
    this.enabled = false;
    this.engineState = new Map();
    this.enginePulse = new Map();
  }

  ensureContext() {
    if (this.context) {
      return this.context;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      return null;
    }

    this.context = new Ctx();
    this.master = this.context.createGain();
    this.master.gain.value = 0.06;
    this.master.connect(this.context.destination);
    return this.context;
  }

  resume() {
    const context = this.ensureContext();
    if (!context) {
      return;
    }
    context.resume();
    this.enabled = true;
  }

  playMusic(mode) {
    this.musicMode = mode;
    this.musicStep = 0;
    this.musicTimer = 0;
  }

  clearDynamicState() {
    this.engineState.clear();
    this.enginePulse.clear();
  }

  setEngineState(id, rpm, boosting) {
    this.engineState.set(id, { rpm, boosting });
  }

  update(dt) {
    if (!this.context || this.context.state !== "running" || !this.enabled) {
      return;
    }

    for (const [id, state] of this.engineState.entries()) {
      const nextTimer = (this.enginePulse.get(id) ?? 0) - dt;
      if (nextTimer <= 0) {
        const rpm = Math.max(0, Math.min(1.25, state.rpm ?? 0));
        const boosting = !!state.boosting;
        this.beep(
          72 + rpm * 168 + (boosting ? 36 : 0),
          boosting ? 0.08 : 0.06,
          boosting ? "sawtooth" : "triangle",
          0.0025 + rpm * (boosting ? 0.01 : 0.006),
        );
        this.beep(
          36 + rpm * 74,
          boosting ? 0.09 : 0.07,
          boosting ? "square" : "sine",
          0.0012 + rpm * 0.004,
        );
        if (boosting || rpm > 0.82) {
          this.beep(
            140 + rpm * 220 + (boosting ? 48 : 0),
            0.04,
            boosting ? "triangle" : "square",
            0.0016 + rpm * 0.003,
            0.008,
          );
        }
        this.enginePulse.set(id, Math.max(0.04, 0.18 - rpm * 0.1 - (boosting ? 0.03 : 0)));
      } else {
        this.enginePulse.set(id, nextTimer);
      }
    }

    this.musicTimer -= dt;
    if (this.musicTimer > 0) {
      return;
    }

    if (this.musicMode === "menu") {
      const notes = [220, 247, 262, 247];
      this.beep(notes[this.musicStep % notes.length], 0.18, "triangle", 0.018);
      this.musicTimer = 0.45;
    } else if (this.musicMode === "hook") {
      const bass = [82, 82, 98, 110, 82, 92, 110, 123];
      const grind = [164, 196, 220, 247];
      this.beep(bass[this.musicStep % bass.length], 0.14, "sawtooth", 0.026);
      this.beep(grind[this.musicStep % grind.length], 0.08, "square", 0.012, 0.03);
      if (this.musicStep % 2 === 0) {
        this.beep(328, 0.045, "triangle", 0.009, 0.06);
      }
      this.musicTimer = 0.19;
    } else {
      const bass = [92, 110, 123, 110];
      const accent = [184, 220, 246, 220];
      this.beep(bass[this.musicStep % bass.length], 0.12, "sawtooth", 0.025);
      if (this.musicStep % 2 === 0) {
        this.beep(accent[this.musicStep % accent.length], 0.08, "square", 0.012, 0.04);
      }
      if (this.musicStep % 4 === 2) {
        this.beep(276, 0.05, "triangle", 0.008, 0.07);
      }
      this.musicTimer = 0.22;
    }
    this.musicStep += 1;
  }

  playSfx(name, intensity = 0.25) {
    if (!this.context || this.context.state !== "running" || !this.enabled) {
      return;
    }

    if (name === "gun") {
      this.beep(440, 0.04, "square", 0.01 * intensity);
    } else if (name === "impact") {
      this.beep(180, 0.05, "triangle", 0.014 * intensity);
    } else if (name === "pickup") {
      this.beep(660, 0.07, "triangle", 0.012 * intensity);
      this.beep(880, 0.05, "sine", 0.01 * intensity, 0.03);
    } else if (name === "rocket") {
      this.beep(140, 0.11, "sawtooth", 0.02 * intensity);
    } else if (name === "homing") {
      this.beep(280, 0.08, "triangle", 0.02 * intensity);
    } else if (name === "mine") {
      this.beep(120, 0.06, "square", 0.018 * intensity);
    } else if (name === "explosion") {
      this.beep(70, 0.18, "sawtooth", 0.035 * intensity);
      this.beep(120, 0.1, "triangle", 0.014 * intensity, 0.015);
    } else if (name === "emp") {
      this.beep(320, 0.18, "triangle", 0.024 * intensity);
    } else if (name === "shockwave") {
      this.beep(210, 0.12, "triangle", 0.026 * intensity);
    } else if (name === "shield") {
      this.beep(520, 0.15, "sine", 0.018 * intensity);
    } else if (name === "rail") {
      this.beep(780, 0.09, "square", 0.018 * intensity);
      this.beep(320, 0.12, "triangle", 0.012 * intensity, 0.02);
    } else if (name === "flak") {
      this.beep(210, 0.08, "sawtooth", 0.022 * intensity);
    } else if (name === "arc") {
      this.beep(460, 0.12, "triangle", 0.018 * intensity);
      this.beep(620, 0.09, "square", 0.01 * intensity, 0.025);
    } else if (name === "repair") {
      this.beep(520, 0.12, "sine", 0.018 * intensity);
      this.beep(680, 0.08, "triangle", 0.012 * intensity, 0.035);
    } else if (name === "turbo") {
      this.beep(180, 0.08, "sawtooth", 0.02 * intensity);
      this.beep(360, 0.12, "triangle", 0.012 * intensity, 0.02);
    } else if (name === "warning") {
      this.beep(880, 0.05, "square", 0.012 * intensity);
      this.beep(660, 0.05, "square", 0.01 * intensity, 0.08);
    } else if (name === "grappleFire") {
      this.beep(320, 0.05, "square", 0.014 * intensity);
      this.beep(180, 0.07, "triangle", 0.012 * intensity, 0.01);
    } else if (name === "grappleLatch") {
      this.beep(520, 0.06, "triangle", 0.014 * intensity);
      this.beep(260, 0.08, "sawtooth", 0.012 * intensity, 0.015);
    } else if (name === "grappleBreak") {
      this.beep(150, 0.06, "square", 0.014 * intensity);
      this.beep(90, 0.09, "sawtooth", 0.016 * intensity, 0.02);
    } else if (name === "grappleRetract") {
      this.beep(440, 0.05, "triangle", 0.01 * intensity);
      this.beep(660, 0.04, "sine", 0.008 * intensity, 0.015);
    }
  }

  beep(freq, duration, type = "sine", gainValue = 0.02, delay = 0) {
    const context = this.context;
    if (!context || context.state !== "running") {
      return;
    }

    const start = context.currentTime + delay;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
}
