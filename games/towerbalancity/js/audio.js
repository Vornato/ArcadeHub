// audio.js
// Enhanced Web Audio manager with Mixer and contextual SFX

class AudioSystem {
    constructor() {
        this.ctx = null;
        this.enabled = false;
        
        this.masterVol = 1.0;
        this.sfxVol = 1.0;
        this.musicVol = 1.0;
        this.reducedIntensity = false;
        
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.tensionRumbleGain = null;
        this.tensionCreakGain = null;
        this.windAmbienceGain = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.connect(this.masterGain);
            
            this.musicGain = this.ctx.createGain();
            this.musicGain.connect(this.masterGain);

            this.setupAmbience();
            
            this.updateVolumes();
            this.enabled = true;
        }
    }

    setupAmbience() {
        if (!this.ctx || this.tensionRumbleGain) return;

        this.tensionRumbleGain = this.ctx.createGain();
        this.tensionRumbleGain.gain.value = 0;
        this.tensionRumbleGain.connect(this.sfxGain);

        const rumbleLow = this.ctx.createOscillator();
        rumbleLow.type = 'sine';
        rumbleLow.frequency.value = 28;
        rumbleLow.connect(this.tensionRumbleGain);
        rumbleLow.start();

        const rumbleMid = this.ctx.createOscillator();
        rumbleMid.type = 'triangle';
        rumbleMid.frequency.value = 42;
        rumbleMid.connect(this.tensionRumbleGain);
        rumbleMid.start();

        this.tensionCreakGain = this.ctx.createGain();
        this.tensionCreakGain.gain.value = 0;
        const creakFilter = this.ctx.createBiquadFilter();
        creakFilter.type = 'bandpass';
        creakFilter.frequency.value = 140;
        creakFilter.Q.value = 0.6;
        this.tensionCreakGain.connect(creakFilter);
        creakFilter.connect(this.sfxGain);

        const creakOsc = this.ctx.createOscillator();
        creakOsc.type = 'sawtooth';
        creakOsc.frequency.value = 88;
        creakOsc.connect(this.tensionCreakGain);
        creakOsc.start();

        this.windAmbienceGain = this.ctx.createGain();
        this.windAmbienceGain.gain.value = 0;
        const windFilter = this.ctx.createBiquadFilter();
        windFilter.type = 'highpass';
        windFilter.frequency.value = 240;
        this.windAmbienceGain.connect(windFilter);
        windFilter.connect(this.sfxGain);
        this.playNoiseBed(this.windAmbienceGain);
    }

    playNoiseBed(outputGain) {
        if (!this.ctx || !outputGain) return;
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.35;

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(outputGain);
        source.start();
    }

    setVolumes(master, sfx, music, reduced) {
        this.masterVol = master;
        this.sfxVol = sfx;
        this.musicVol = music;
        this.reducedIntensity = reduced;
        this.updateVolumes();
    }

    updateVolumes() {
        if (!this.ctx) return;
        this.masterGain.gain.value = this.masterVol;
        this.sfxGain.gain.value = this.sfxVol;
        this.musicGain.gain.value = this.musicVol;
    }

    updateTension(balanceStress = 0, stormLevel = 0, rainLevel = 0) {
        if (!this.ctx || !this.enabled) return;
        const now = this.ctx.currentTime;
        const intensity = this.reducedIntensity ? 0.55 : 1.0;
        const rumbleTarget = Utils.clamp((balanceStress * 0.16) + (stormLevel * 0.02), 0, 0.18) * intensity;
        const creakTarget = Utils.clamp(Math.max(0, balanceStress - 0.28) * 0.11, 0, 0.12) * intensity;
        const windTarget = Utils.clamp((stormLevel * 0.035) + (rainLevel * 0.025), 0, 0.09) * intensity;

        if (this.tensionRumbleGain) this.tensionRumbleGain.gain.setTargetAtTime(rumbleTarget, now, 0.12);
        if (this.tensionCreakGain) this.tensionCreakGain.gain.setTargetAtTime(creakTarget, now, 0.18);
        if (this.windAmbienceGain) this.windAmbienceGain.gain.setTargetAtTime(windTarget, now, 0.2);
    }

    play(soundName, mass = 10, vel = 1) {
        if (!this.enabled || !this.ctx || this.sfxVol <= 0) return;
        
        const now = this.ctx.currentTime;
        let osc, gain;

        const createSynth = (type = 'sine') => {
            osc = this.ctx.createOscillator();
            gain = this.ctx.createGain();
            osc.type = type;
            osc.connect(gain);
            gain.connect(this.sfxGain);
            return { osc, gain };
        };

        let intensity = this.reducedIntensity ? 0.5 : 1.0;
        
        switch(soundName) {
            case 'drop': // generic floor or object drop
                let d = createSynth('sine');
                let baseFreq = Math.max(30, 200 - mass); 
                d.osc.frequency.setValueAtTime(baseFreq, now);
                d.osc.frequency.exponentialRampToValueAtTime(baseFreq/4, now + 0.15);
                d.gain.gain.setValueAtTime(Math.min(1.0, (mass/100)) * intensity, now);
                d.gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                d.osc.start(now); d.osc.stop(now + 0.15);
                break;
                
            case 'perfect': // perfect drop chime
                let p = createSynth('triangle');
                p.osc.frequency.setValueAtTime(440, now);
                p.osc.frequency.setValueAtTime(880, now + 0.1);
                p.gain.gain.setValueAtTime(0.5 * intensity, now);
                p.gain.gain.linearRampToValueAtTime(0, now + 0.5);
                p.osc.start(now); p.osc.stop(now + 0.5);
                
                // chord
                let p2 = createSynth('triangle');
                p2.osc.frequency.setValueAtTime(554.37, now); // C#
                p2.osc.frequency.setValueAtTime(1108.73, now + 0.1);
                p2.gain.gain.setValueAtTime(0.3 * intensity, now);
                p2.gain.gain.linearRampToValueAtTime(0, now + 0.5);
                p2.osc.start(now); p2.osc.stop(now + 0.5);
                break;
                
            case 'creak': // structural warning
                let c = createSynth('sawtooth');
                c.osc.frequency.setValueAtTime(30, now);
                c.osc.frequency.linearRampToValueAtTime(70, now + 0.3);
                c.gain.gain.setValueAtTime(0.15 * intensity, now);
                c.gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
                c.osc.start(now); c.osc.stop(now + 0.3);
                break;

            case 'throw':
                let t = createSynth('triangle');
                t.osc.frequency.setValueAtTime(400, now);
                t.osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
                t.gain.gain.setValueAtTime(0.3 * intensity, now);
                t.gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
                t.osc.start(now); t.osc.stop(now + 0.15);
                break;

            case 'slide':
                let s = createSynth('square');
                s.osc.frequency.setValueAtTime(80, now);
                s.gain.gain.setValueAtTime(0.05 * intensity, now);
                s.gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
                s.osc.start(now); s.osc.stop(now + 0.2);
                break;

            case 'rope':
                let r = createSynth('sine');
                r.osc.frequency.setValueAtTime(180, now);
                r.osc.frequency.linearRampToValueAtTime(260, now + 0.08);
                r.gain.gain.setValueAtTime(0.08 * intensity, now);
                r.gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
                r.osc.start(now); r.osc.stop(now + 0.12);
                break;

            case 'saw':
                this.playNoise(now, 0.18, 0.18 * intensity);
                let sw = createSynth('square');
                sw.osc.frequency.setValueAtTime(260, now);
                sw.osc.frequency.linearRampToValueAtTime(200, now + 0.18);
                sw.gain.gain.setValueAtTime(0.08 * intensity, now);
                sw.gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
                sw.osc.start(now); sw.osc.stop(now + 0.18);
                break;

            case 'lightning':
                this.playNoise(now, 0.5, 0.5 * intensity);
                let l = createSynth('triangle');
                l.osc.frequency.setValueAtTime(1200, now);
                l.osc.frequency.exponentialRampToValueAtTime(80, now + 0.35);
                l.gain.gain.setValueAtTime(0.45 * intensity, now);
                l.gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                l.osc.start(now); l.osc.stop(now + 0.35);
                break;

            case 'thunder':
                this.playNoise(now, 0.9, 0.65 * intensity);
                let th = createSynth('sine');
                th.osc.frequency.setValueAtTime(90, now);
                th.osc.frequency.exponentialRampToValueAtTime(24, now + 0.9);
                th.gain.gain.setValueAtTime(0.45 * intensity, now);
                th.gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
                th.osc.start(now); th.osc.stop(now + 0.9);
                break;

            case 'meteor':
                this.playNoise(now, 0.35, 0.45 * intensity);
                let m = createSynth('sawtooth');
                m.osc.frequency.setValueAtTime(90, now);
                m.osc.frequency.exponentialRampToValueAtTime(28, now + 0.45);
                m.gain.gain.setValueAtTime(0.4 * intensity, now);
                m.gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
                m.osc.start(now); m.osc.stop(now + 0.45);
                break;
                
            case 'pickup':
                let pk = createSynth('sine');
                pk.osc.frequency.setValueAtTime(600, now);
                pk.osc.frequency.linearRampToValueAtTime(800, now + 0.05);
                pk.gain.gain.setValueAtTime(0.1 * intensity, now);
                pk.gain.gain.linearRampToValueAtTime(0, now + 0.1);
                pk.osc.start(now); pk.osc.stop(now + 0.1);
                break;

            case 'crash':
                this.playNoise(now, 1.5, 1.0 * intensity);
                // Sub impact
                let sub = createSynth('square');
                sub.osc.frequency.setValueAtTime(100, now);
                sub.osc.frequency.exponentialRampToValueAtTime(10, now + 1.0);
                sub.gain.gain.setValueAtTime(0.8 * intensity, now);
                sub.gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
                sub.osc.start(now); sub.osc.stop(now + 1.0);
                break;
                
            case 'snap': // collapse start snap
                this.playNoise(now, 0.3, 0.8 * intensity);
                let sn = createSynth('sawtooth');
                sn.osc.frequency.setValueAtTime(1000, now);
                sn.osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);
                sn.gain.gain.setValueAtTime(0.6 * intensity, now);
                sn.gain.gain.linearRampToValueAtTime(0, now + 0.2);
                sn.osc.start(now); sn.osc.stop(now + 0.2);
                break;
        }
    }

    playNoise(time, duration, vol) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * Math.max(0.1, duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 800;
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(vol, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + duration);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(time);
        noise.stop(time + duration);
    }
}
