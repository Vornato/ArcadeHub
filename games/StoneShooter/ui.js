class UIManager {
    constructor() {
        this.elements = {
            mainMenu: document.getElementById('main-menu'),
            pauseMenu: document.getElementById('pause-menu'),
            gameOver: document.getElementById('game-over'),
            hud: document.getElementById('hud'),
            timer: document.getElementById('timer'),
            p1Score: document.getElementById('p1-score'),
            p2Score: document.getElementById('p2-score'),
            p1Combo: document.getElementById('p1-combo'),
            p1ComboBox: document.getElementById('p1-combo-box'),
            // ... add others as needed
        };
    }

    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.menu-screen').forEach(el => el.classList.add('hidden'));
        
        if (screenId === 'hud') {
            this.elements.hud.classList.remove('hidden');
        } else if (screenId === 'none') {
            // playing
        } else {
            const el = document.getElementById(screenId);
            if(el) el.classList.remove('hidden');
        }
    }

    updateHUD(game) {
        // Timer
        if (game.state === 'playing') {
            const elapsed = Math.floor((Date.now() - game.startTime) / 1000);
            const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const s = (elapsed % 60).toString().padStart(2, '0');
            this.elements.timer.innerText = `${m}:${s}`;
        }

        // P1 Stats
        const p1 = game.boards[0];
        if (p1) {
            this.elements.p1Score.innerText = (p1.combo * 100).toString();
            if (p1.combo > 1) {
                this.elements.p1ComboBox.classList.remove('hidden');
                this.elements.p1Combo.innerText = p1.combo;
            } else {
                this.elements.p1ComboBox.classList.add('hidden');
            }
        }
        
        // P2 Stats (if versus)
        if (game.mode === 'versus') {
            const p2 = game.boards[1];
            if (p2) {
                this.elements.p2Score.innerText = (p2.combo * 100).toString();
            }
        }
    }

    showToast(msg) {
        const area = document.getElementById('notification-area');
        const el = document.createElement('div');
        el.className = 'toast';
        el.innerText = msg;
        area.appendChild(el);
        setTimeout(() => el.remove(), 2000);
    }
}