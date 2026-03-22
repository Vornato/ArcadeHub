class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.input = new InputManager();
        this.audio = new AudioManager();
        this.effects = new EffectsManager();
        this.ui = new UIManager();
        
        this.boards = [];
        this.mode = 'menu'; // menu, solo, versus
        this.state = 'menu'; // menu, playing, paused, gameover
        
        this.lastTime = 0;
        this.startTime = 0;
        
        this.timeScale = 1.0;
        this.targetTimeScale = 1.0;
        this.images = {};
        this.loadImages();
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    loadImages() {
        const names = CONSTANTS.COLORS.map(c => c.name).concat(['WildcardYellow', 'garbage']);
        names.forEach(name => {
            const img = new Image();
            img.src = `Colors/${name}.png`;
            this.images[name] = img;
            this.images[name.toLowerCase()] = img;
        });
    }

    start(mode) {
        this.mode = mode;
        this.state = 'playing';
        this.boards = [];
        this.startTime = Date.now();
        this.ui.showScreen('none');
        this.ui.elements.hud.classList.remove('hidden');
        this.audio.resume();

        // Calculate board positions
        const boardW = (CONSTANTS.COLS * (CONSTANTS.TILE_SIZE + CONSTANTS.TILE_GAP));
        const boardH = (CONSTANTS.ROWS * (CONSTANTS.TILE_SIZE + CONSTANTS.TILE_GAP));
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2 - boardH/2 + 20;

        if (mode === 'solo' || mode === 'solo-challenge') {
            this.boards.push(new Board(this, 0, cx - boardW/2, cy, boardW, boardH));
            this.boards[0].generatePuzzle('NORMAL');
        } else {
            // Versus
            const gap = 100;
            this.boards.push(new Board(this, 0, cx - boardW - gap/2, cy, boardW, boardH));
            this.boards.push(new Board(this, 1, cx + gap/2, cy, boardW, boardH));
            
            // Seeded generation for fairness
            const seed = Math.random();
            // TODO: Implement actual seeded RNG in utils if strict fairness needed
            // For now, just generate random
            this.boards[0].generatePuzzle('NORMAL');
            this.boards[1].generatePuzzle('NORMAL');
        }
    }

    sendGarbage(targetIdx, amount) {
        if (this.boards[targetIdx]) {
            this.boards[targetIdx].garbageQueue += amount;
            this.ui.showToast(`P${targetIdx === 0 ? 2 : 1} Attacked!`);
        }
    }

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.ui.showScreen('pause-menu');
        } else if (this.state === 'paused') {
            this.state = 'playing';
            this.ui.showScreen('none');
        }
    }

    loop(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        // Smoothly interpolate time scale for slow motion effects
        const diff = this.targetTimeScale - this.timeScale;
        if (Math.abs(diff) > 0.01) this.timeScale += diff * 0.1;
        else this.timeScale = this.targetTimeScale;

        this.input.update();
        this.effects.update();

        if (this.state === 'playing') {
            this.boards.forEach(b => b.update());
            this.ui.updateHUD(this);
            
            // Check End Game Global
            if (this.mode === 'solo') {
                if (this.boards[0].status === 'win') this.endGame('win', 'Cleared!');
                if (this.boards[0].status === 'lose') this.endGame('lose', 'Defeat');
            } else if (this.mode === 'versus') {
                if (this.boards[0].status === 'win') this.endGame('P1', 'P1 Wins!');
                if (this.boards[1].status === 'win') this.endGame('P2', 'P2 Wins!');
                if (this.boards[0].status === 'lose') this.endGame('P2', 'P1 Eliminated!');
                if (this.boards[1].status === 'lose') this.endGame('P1', 'P2 Eliminated!');
            }

            if (this.input.getGlobalAction('PAUSE')) this.togglePause();
        }

        this.draw();
        requestAnimationFrame(t => this.loop(t));
    }

    endGame(winner, msg) {
        this.state = 'gameover';
        document.getElementById('winner-title').innerText = msg;
        this.ui.showScreen('game-over');
    }

    draw() {
        // Clear
        this.ctx.fillStyle = "#1a1a24";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Shake offset
        this.ctx.save();
        if (this.effects.shake > 0) {
            const s = this.effects.shake;
            this.ctx.translate((Math.random()-0.5)*s, (Math.random()-0.5)*s);
        }

        // Draw Boards
        if (this.state !== 'menu') {
            this.boards.forEach(b => b.draw(this.ctx));
        }

        this.effects.draw(this.ctx);
        this.ctx.restore();
    }
}