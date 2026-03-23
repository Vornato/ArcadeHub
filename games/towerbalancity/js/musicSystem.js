// musicSystem.js
// Procedural multi-layered reactive music system

class ProceduralMusicSystem {
    constructor(audioSystem) {
        this.audio = audioSystem;
        this.ctx = null;
        
        this.baseLayerGain = null;
        this.tensionLayerGain = null;
        this.dangerLayerGain = null;
        
        this.isPlaying = false;
        this.currentStep = 0;
        this.tempo = 120; // BPM
        this.nextNoteTime = 0;
        this.scheduleAheadTime = 0.1;
        
        this.targetBaseVol = 0;
        this.targetTensionVol = 0;
        this.targetDangerVol = 0;
        
        this.basePattern = [1, 0, 0, 0, 1, 0, 0, 0]; // Kick
        this.tensionPattern = [1, 1, 0, 1, 0, 1, 1, 0]; // Fast perc/arp
        this.dangerPattern = [1, 0, 1, 0, 1, 1, 1, 0]; // Aggressive
        
        this.intensityMod = 1.0;
    }
    
    init() {
        if (this.audio.enabled && this.audio.ctx && !this.ctx) {
            this.ctx = this.audio.ctx;
            
            this.baseLayerGain = this.ctx.createGain();
            this.baseLayerGain.connect(this.audio.musicGain);
            this.baseLayerGain.gain.value = 0;
            
            this.tensionLayerGain = this.ctx.createGain();
            this.tensionLayerGain.connect(this.audio.musicGain);
            this.tensionLayerGain.gain.value = 0;
            
            this.dangerLayerGain = this.ctx.createGain();
            this.dangerLayerGain.connect(this.audio.musicGain);
            this.dangerLayerGain.gain.value = 0;
        }
    }

    start() {
        this.init();
        if (!this.ctx) return;
        this.isPlaying = true;
        this.currentStep = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.targetBaseVol = 0.3;
        this.targetTensionVol = 0;
        this.targetDangerVol = 0;
    }
    
    stop() {
        this.isPlaying = false;
        this.targetBaseVol = 0;
        this.targetTensionVol = 0;
        this.targetDangerVol = 0;
    }

    updateGameplayState(dangerLevel, chapter, isCollapse) {
        if (!this.isPlaying) return;
        
        this.intensityMod = this.audio.reducedIntensity ? 0.5 : 1.0;
        
        if (isCollapse) {
            this.targetBaseVol = 0;
            this.targetTensionVol = 0;
            this.targetDangerVol = 0;
            return;
        }
        
        this.targetBaseVol = 0.3 * this.intensityMod;
        
        if (chapter >= 3 || dangerLevel >= 1) {
            this.targetTensionVol = 0.4 * this.intensityMod;
        } else {
            this.targetTensionVol = 0;
        }
        
        if (chapter >= 6 || dangerLevel >= 2) {
            this.targetDangerVol = 0.5 * this.intensityMod;
            this.tempo = 140;
        } else {
            this.targetDangerVol = 0;
            this.tempo = 120 + (dangerLevel * 10);
        }
    }

    update() {
        if (!this.isPlaying || !this.ctx) return;
        
        // Smoothly adjust volumes
        this.baseLayerGain.gain.value += (this.targetBaseVol - this.baseLayerGain.gain.value) * 0.05;
        this.tensionLayerGain.gain.value += (this.targetTensionVol - this.tensionLayerGain.gain.value) * 0.05;
        this.dangerLayerGain.gain.value += (this.targetDangerVol - this.dangerLayerGain.gain.value) * 0.05;

        // Scheduler
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentStep, this.nextNoteTime);
            this.nextNote();
        }
    }

    nextNote() {
        const secondsPerBeat = 60.0 / (this.tempo * 2); // 8th notes
        this.nextNoteTime += secondsPerBeat;
        this.currentStep++;
        if (this.currentStep > 7) this.currentStep = 0;
    }

    scheduleNote(step, time) {
        // Base Layer: Deep Sine
        if (this.basePattern[step] && this.baseLayerGain.gain.value > 0.01) {
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.baseLayerGain);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(60, time);
            osc.frequency.exponentialRampToValueAtTime(30, time + 0.2);
            gain.gain.setValueAtTime(1, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
            osc.start(time); osc.stop(time + 0.2);
        }
        
        // Tension: Hi-hat / perc synth
        if (this.tensionPattern[step] && this.tensionLayerGain.gain.value > 0.01) {
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.tensionLayerGain);
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, time);
            gain.gain.setValueAtTime(0.2, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
            osc.start(time); osc.stop(time + 0.05);
        }

        // Danger: Angry bass synth
        if (this.dangerPattern[step] && this.dangerLayerGain.gain.value > 0.01) {
            let osc = this.ctx.createOscillator();
            let gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.dangerLayerGain);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, time);
            osc.frequency.linearRampToValueAtTime(80, time + 0.1);
            gain.gain.setValueAtTime(0.4, time);
            gain.gain.linearRampToValueAtTime(0.01, time + 0.1);
            osc.start(time); osc.stop(time + 0.1);
        }
    }
}
