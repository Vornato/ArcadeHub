class Board {
    constructor(game, playerIdx, x, y, width, height) {
        this.game = game;
        this.playerIdx = playerIdx;
        // Visual bounds
        this.x = x;
        this.y = y;
        this.w = width;
        this.h = height;
        
        // State
        this.grid = []; // [col][row]
        this.cursor = Math.floor(CONSTANTS.COLS / 2);
        this.activeChain = { color: null, count: 0 };
        this.garbageQueue = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.status = 'playing'; // playing, win, lose
        this.projectiles = [];
        
        // Difficulty Config
        this.config = CONSTANTS.DIFFICULTY.NORMAL;

        this.initGrid();
    }

    initGrid() {
        // Empty grid
        this.grid = Array(CONSTANTS.COLS).fill().map(() => Array(CONSTANTS.ROWS).fill(null));
    }

    // Generate a solvable board by playing the game in reverse
    generatePuzzle(difficulty = 'NORMAL') {
        this.config = CONSTANTS.DIFFICULTY[difficulty];
        this.initGrid();
        
        // We fill about 60-70% of the board
        let tripletsToPlace = Math.floor((CONSTANTS.COLS * CONSTANTS.ROWS * 0.5) / 3);
        
        // Colors to use
        const availableColors = CONSTANTS.COLORS.slice(0, this.config.colors);

        while (tripletsToPlace > 0) {
            const color = availableColors[Math.floor(Math.random() * availableColors.length)];
            
            // Try to place 3 stones
            // Valid placement: Find 3 columns that are not full
            // In our data structure, 'top' is index 0. 'bottom' is index ROWS-1.
            // Stones hang from top. So we place at the lowest free index (visually highest tip).
            
            let attempts = 0;
            let placed = 0;
            let placementCols = [];

            // Helper to get tip index
            const getTip = (c) => {
                for (let r = CONSTANTS.ROWS - 1; r >= 0; r--) {
                    if (this.grid[c][r] !== null) return r + 1; // Valid spot is one below last stone
                }
                return 0; // Column empty
            };

            while (placed < 3 && attempts < 50) {
                let c = Utils.randomInt(0, CONSTANTS.COLS - 1);
                let r = getTip(c);
                
                // Check bounds and if we already picked this col (optional, but better distribution)
                if (r < CONSTANTS.ROWS) {
                    // Place temp
                    this.grid[c][r] = { color: color, id: Math.random(), type: 'normal' };
                    placementCols.push({c, r});
                    placed++;
                }
                attempts++;
            }

            if (placed < 3) {
                // Backtrack/Fail safe: clear partial
                placementCols.forEach(p => this.grid[p.c][p.r] = null);
                // If board is getting too full to place triplets, stop
                break;
            } else {
                tripletsToPlace--;
            }
        }
    }

    // Get the stone at the "Tip" of the stalactite (Visually bottom-most)
    getTipStone(col) {
        // Scan from bottom (ROWS-1) up to 0
        for (let r = CONSTANTS.ROWS - 1; r >= 0; r--) {
            if (this.grid[col][r]) return { r, stone: this.grid[col][r] };
        }
        return null;
    }

    update() {
        if (this.status !== 'playing') return;

        const ts = this.game.timeScale;

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.y -= 20 * ts; // Projectile speed
            if (p.y <= p.targetY) {
                this.resolveHit(p);
                this.projectiles.splice(i, 1);
            }
        }

        // Input
        if (this.game.input.getAction(this.playerIdx, 'LEFT')) {
            this.cursor = (this.cursor - 1 + CONSTANTS.COLS) % CONSTANTS.COLS;
            this.game.audio.sfx.move();
        }
        if (this.game.input.getAction(this.playerIdx, 'RIGHT')) {
            this.cursor = (this.cursor + 1) % CONSTANTS.COLS;
            this.game.audio.sfx.move();
        }
        if (this.game.input.getAction(this.playerIdx, 'RESET')) {
            this.game.audio.sfx.reset();
            this.generatePuzzle(this.game.mode === 'versus' ? 'NORMAL' : 'HARD'); // Quick reset
            this.activeChain = { color: null, count: 0 };
            this.game.effects.addShake(5);
        }
        if (this.game.input.getAction(this.playerIdx, 'ACTION')) {
            this.attemptPick();
        }

        // Combo Timer
        if (this.combo > 0) {
            this.comboTimer -= 1 * ts;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        // Garbage Processing
        if (this.garbageQueue > 0 && Math.random() < 0.05 * ts) {
            this.addGarbageRow();
            this.garbageQueue--;
        }
    }

    attemptPick() {
        // Prevent shooting if a projectile is already traveling in this column
        if (this.projectiles.some(p => p.col === this.cursor)) return;

        const target = this.getTipStone(this.cursor);
        if (!target) return; // Empty col

        // Check for Last Stone (Slow Motion trigger)
        let totalStones = 0;
        for(let c=0; c<CONSTANTS.COLS; c++) {
            for(let r=0; r<CONSTANTS.ROWS; r++) {
                if (this.grid[c][r]) totalStones++;
            }
        }
        if (totalStones === 1) {
            this.game.targetTimeScale = 0.1; // Slow motion
        }

        // Spawn Projectile
        const startX = this.x + (this.cursor * (CONSTANTS.TILE_SIZE + CONSTANTS.TILE_GAP)) + CONSTANTS.TILE_SIZE/2;
        const startY = this.y + this.h + 20;
        const targetY = this.y + (target.r * (CONSTANTS.TILE_SIZE + CONSTANTS.TILE_GAP)) + CONSTANTS.TILE_SIZE/2;

        this.projectiles.push({
            x: startX,
            y: startY,
            targetY: targetY,
            col: this.cursor,
            row: target.r,
            stone: target.stone
        });
    }

    resolveHit(p) {
        this.game.targetTimeScale = 1.0; // Reset time scale

        const stone = p.stone;
        // Ensure stone is still there
        if (this.grid[p.col][p.row] !== stone) return;

        // Logic
        if (this.activeChain.count === 0) {
            // Start Chain
            this.activeChain.color = stone.color.name;
            this.confirmPick(p.row, stone);
        } else {
            // Continue Chain
            if (stone.color.name === this.activeChain.color || stone.color.name === 'wild') {
                this.confirmPick(p.row, stone);
            } else {
                // Mistake
                this.game.audio.sfx.error();
                this.game.effects.addShake(5);
                // Penalty: Lose combo
                this.combo = 0;
            }
        }
    }

    confirmPick(r, stone) {
        this.grid[this.cursor][r] = null;
        this.activeChain.count++;
        
        // FX
        const screenX = this.x + (this.cursor * (CONSTANTS.TILE_SIZE + CONSTANTS.TILE_GAP)) + CONSTANTS.TILE_SIZE/2;
        const screenY = this.y + (r * (CONSTANTS.TILE_SIZE + CONSTANTS.TILE_GAP)) + CONSTANTS.TILE_SIZE/2;
        this.game.effects.spawnExplosion(screenX, screenY, stone.color.hex);
        
        // Audio
        this.game.audio.sfx.select(1 + (this.activeChain.count * 0.2));

        if (this.activeChain.count === 3) {
            this.completeTriplet();
        }
    }

    completeTriplet() {
        this.activeChain.count = 0;
        this.activeChain.color = null;
        this.combo++;
        this.comboTimer = CONSTANTS.COMBO_WINDOW;
        
        this.game.audio.sfx.clear();
        
        // Versus Attack
        if (this.game.mode === 'versus') {
            // Send garbage based on combo
            let lines = 1 + Math.floor(this.combo / 3);
            this.game.sendGarbage(this.playerIdx === 0 ? 1 : 0, lines);
        }

        // Check Win
        if (this.checkWin()) {
            this.status = 'win';
            this.game.audio.sfx.win();
            this.game.effects.spawnExplosion(this.x + this.w/2, this.y + this.h/2, '#fff');
        }
    }

    addGarbageRow() {
        // Shift everything DOWN (indexes increase)
        // Check if we die
        for(let c=0; c<CONSTANTS.COLS; c++) {
            if (this.grid[c][CONSTANTS.ROWS-1] !== null) {
                this.status = 'lose';
                return; // Game Over
            }
        }

        // Shift
        for(let c=0; c<CONSTANTS.COLS; c++) {
            for(let r=CONSTANTS.ROWS-1; r>0; r--) {
                this.grid[c][r] = this.grid[c][r-1];
            }
            // Add Gray/Garbage at top
            this.grid[c][0] = { 
                color: CONSTANTS.GARBAGE_COLOR, 
                id: Math.random(), 
                type: 'garbage' 
            };
        }
        this.game.audio.sfx.warning();
    }

    checkWin() {
        for(let c=0; c<CONSTANTS.COLS; c++) {
            // Check only top row? No, entire board must be clear
            if (this.getTipStone(c) !== null) return false;
        }
        return true;
    }

    draw(ctx) {
        // Draw Background Panel
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(this.x - 10, this.y - 10, this.w + 20, this.h + 20);
        
        // Draw Border
        ctx.strokeStyle = this.status === 'lose' ? '#555' : (this.playerIdx === 0 ? '#ff0055' : '#00e5ff');
        ctx.lineWidth = 3;
        ctx.strokeRect(this.x - 10, this.y - 10, this.w + 20, this.h + 20);

        // Draw Slots & Stones
        for (let c = 0; c < CONSTANTS.COLS; c++) {
            // Highlight active column
            if (c === this.cursor && this.status === 'playing') {
                ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
                ctx.fillRect(
                    this.x + c * (CONSTANTS.TILE_SIZE + CONSTANTS.TILE_GAP), 
                    this.y, 
                    CONSTANTS.TILE_SIZE, 
                    this.h
                );
            }

            for (let r = 0; r < CONSTANTS.ROWS; r++) {
                const stone = this.grid[c][r];
                if (stone) {
                    const tx = this.x + c * (CONSTANTS.TILE_SIZE + CONSTANTS.TILE_GAP);
                    const ty = this.y + r * (CONSTANTS.TILE_SIZE + CONSTANTS.TILE_GAP);
                    
                    this.drawStone(ctx, tx, ty, stone);
                }
            }
        }

        // Draw Cursor
        if (this.status === 'playing') {
            const cx = this.x + this.cursor * (CONSTANTS.TILE_SIZE + CONSTANTS.TILE_GAP) + CONSTANTS.TILE_SIZE/2;
            const cy = this.y + this.h + 15;
            
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx - 8, cy + 12);
            ctx.lineTo(cx + 8, cy + 12);
            ctx.fill();
            
            // Draw connector line
            ctx.strokeStyle = "rgba(255,255,255,0.3)";
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx, this.y + this.h);
            ctx.stroke();
        }

        // Draw Projectiles
        for (const p of this.projectiles) {
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
            ctx.fill();
            // Trail
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.beginPath();
            ctx.arc(p.x, p.y + 12, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawStone(ctx, x, y, stone) {
        const size = CONSTANTS.TILE_SIZE;
        const img = this.game.images[stone.color.name] || this.game.images[stone.color.name.toLowerCase()];
        
        // Dim if not matching active chain
        if (this.activeChain.color && stone.color.name !== this.activeChain.color && stone.color.name !== 'wild') {
            ctx.globalAlpha = 0.3;
        }

        if (img && img.complete) {
            ctx.drawImage(img, x, y, size, size);
        } else {
            // Fallback
            ctx.fillStyle = stone.color.hex;
            ctx.fillRect(x, y, size, size);
        }

        ctx.globalAlpha = 1.0;
    }
}