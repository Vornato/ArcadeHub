class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.muted = localStorage.getItem('tb_muted') === 'true';
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : 0.3;
        this.masterGain.connect(this.ctx.destination);
    }

    toggleMute() {
        this.muted = !this.muted;
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.3, this.ctx.currentTime);
        localStorage.setItem('tb_muted', this.muted);
        return this.muted;
    }

    resume() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    playTone(freq, type, duration, vol = 1.0, slide = 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slide !== 0) {
            osc.frequency.linearRampToValueAtTime(freq + slide, this.ctx.currentTime + duration);
        }
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // SFX Library
    sfx = {
        move: () => this.playTone(300, 'triangle', 0.05, 0.2),
        select: (pitch = 1) => this.playTone(400 * pitch, 'sine', 0.1, 0.3),
        error: () => {
            this.playTone(150, 'sawtooth', 0.2, 0.3, -50);
            this.playTone(100, 'square', 0.2, 0.3, -20);
        },
        clear: () => {
            this.playTone(800, 'sine', 0.15, 0.4);
            setTimeout(() => this.playTone(1200, 'triangle', 0.2, 0.4), 100);
        },
        bigClear: () => {
            [0, 100, 200].forEach((d, i) => {
                setTimeout(() => this.playTone(600 + (i*200), 'square', 0.3, 0.3), d);
            });
        },
        reset: () => this.playTone(200, 'sawtooth', 0.4, 0.5, -100),
        warning: () => this.playTone(1000, 'square', 0.1, 0.2),
        win: () => {
            // Simple arpeggio
            [0, 150, 300, 450, 600].forEach((d, i) => {
                const note = 440 * Math.pow(1.5, i); // Fifths
                setTimeout(() => this.playTone(note, 'triangle', 0.4, 0.3), d);
            });
        }
    };
}