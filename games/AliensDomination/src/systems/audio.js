function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export class AudioManager {
  constructor(options) {
    this.options = options;
    this.context = null;
    this.master = null;
    this.sfx = null;
    this.music = null;
    this.ufoHum = null;
    this.orbitHum = null;
    this.lastBoostReady = false;
  }

  ensureContext() {
    if (this.context) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.context = new AudioCtx();
    this.master = this.context.createGain();
    this.sfx = this.context.createGain();
    this.music = this.context.createGain();
    this.sfx.connect(this.master);
    this.music.connect(this.master);
    this.master.connect(this.context.destination);
  }

  updateVolumes() {
    if (!this.context) return;
    this.sfx.gain.value = clamp01(this.options.sfxVolume ?? 0.6);
    this.music.gain.value = this.options.musicEnabled ? clamp01(this.options.musicVolume ?? 0.35) : 0;
  }

  startUfoHum() {
    this.ensureContext();
    if (!this.context || this.ufoHum) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 76;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(this.music);
    osc.start();
    this.ufoHum = { osc, gain };
    this.updateVolumes();
  }

  startOrbitAmbience() {
    this.ensureContext();
    if (!this.context || this.orbitHum) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = "triangle";
    osc.frequency.value = 42;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(this.music);
    osc.start();
    this.orbitHum = { osc, gain };
    this.updateVolumes();
  }

  stopOrbitAmbience() {
    if (!this.orbitHum) return;
    this.orbitHum.osc.stop();
    this.orbitHum = null;
  }

  stopUfoHum() {
    if (!this.ufoHum) return;
    this.ufoHum.osc.stop();
    this.ufoHum = null;
  }

  playTone(frequency = 440, duration = 0.09, type = "square", gainValue = 0.08) {
    this.ensureContext();
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(this.sfx);
    osc.start();
    osc.stop(this.context.currentTime + duration);
  }

  playLaser() {
    this.playTone(760, 0.05, "sawtooth", 0.07);
  }

  playExplosion() {
    this.playTone(120, 0.14, "triangle", 0.11);
  }

  playBoost() {
    this.playTone(260, 0.1, "sawtooth", 0.09);
  }

  playBoostReady() {
    this.playTone(520, 0.08, "triangle", 0.07);
  }

  playOverheat() {
    this.playTone(220, 0.16, "square", 0.08);
  }

  playPanic() {
    this.playTone(920, 0.04, "square", 0.05);
  }
}
