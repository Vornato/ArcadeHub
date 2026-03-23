export class AudioSystem {
  constructor() {
    this.context = null;
    this.master = null;
    this.musicMode = "menu";
    this.musicTimer = 0;
    this.musicStep = 0;
    this.enabled = false;
    this.engineState = new Map();
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

  setEngineState(id, rpm, boosting) {
    this.engineState.set(id, { rpm, boosting });
  }

  update(dt) {
    if (!this.context || this.context.state !== "running" || !this.enabled) {
      return;
    }

    this.musicTimer -= dt;
    if (this.musicTimer > 0) {
      return;
    }

    if (this.musicMode === "menu") {
      const notes = [220, 247, 262, 247];
      this.beep(notes[this.musicStep % notes.length], 0.18, "triangle", 0.018);
      this.musicTimer = 0.45;
    } else {
      const bass = [92, 110, 123, 110];
      const accent = [184, 220, 246, 220];
      this.beep(bass[this.musicStep % bass.length], 0.12, "sawtooth", 0.025);
      if (this.musicStep % 2 === 0) {
        this.beep(accent[this.musicStep % accent.length], 0.08, "square", 0.012, 0.04);
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
