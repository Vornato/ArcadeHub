const COLS = 8;
const ROWS = 10;
const TILE_SIZE = 40;
const TILE_GAP = 4;
const BOARD_WIDTH = (COLS * (TILE_SIZE + TILE_GAP)) + TILE_GAP;
const BOARD_HEIGHT = (ROWS * (TILE_SIZE + TILE_GAP)) + TILE_GAP;

const COLORS = [
    { name: 'red', hex: '#FF4136' },
    { name: 'pink', hex: '#FF69B4' },
    { name: 'green', hex: '#2ECC40' },
    { name: 'yellow', hex: '#FFDC00' },
    { name: 'purple', hex: '#B10DC9' },
    { name: 'orange', hex: '#FF851B' }
];

const GARBAGE_STONE = { name: 'garbage', hex: '#7B8798', isGarbage: true };
const BUILD_INFO = 'Shipped source of truth: playable.js';
const STORAGE_KEY = 'stone-shooter-progress-v2';
const COMBO_WINDOW_FRAMES = 120;
const GARBAGE_WARNING_FRAMES = 180;
const SCORE_ATTACK_DURATION_MS = 120000;
const ENDURANCE_BASE_PRESSURE_MS = 18000;
const PLAYER_GLOW = [
    'rgba(255, 65, 54, 0.7)',
    'rgba(0, 116, 217, 0.7)',
    'rgba(46, 204, 64, 0.7)',
    'rgba(255, 220, 0, 0.7)'
];
const VARIANT_LABELS = {
    tutorial: 'GUIDED TUTORIAL',
    practice: 'SOLO PRACTICE',
    scoreAttack: 'SCORE ATTACK',
    daily: 'DAILY BOARD',
    endurance: 'ENDURANCE',
    versus: 'LOCAL VERSUS'
};

const COLOR_MAP = Object.fromEntries(COLORS.map((color) => [color.name, color]));
const KEY_BINDINGS = [
    {
        left: ['KeyA', 'ArrowLeft'],
        right: ['KeyD', 'ArrowRight'],
        action: ['Space', 'Enter'],
        reset: ['KeyR']
    },
    {
        left: ['KeyJ'],
        right: ['KeyL'],
        action: ['ShiftRight', 'Numpad0'],
        reset: ['KeyU']
    },
    { left: [], right: [], action: [], reset: [] },
    { left: [], right: [], action: [], reset: [] }
];
const GLOBAL_BINDINGS = {
    pause: ['KeyP', 'Escape'],
    menu: ['KeyM'],
    debug: ['KeyG']
};

const IMAGES = {};
COLORS.forEach((color) => {
    const img = new Image();
    img.src = `Colors/${color.name}.png`;
    IMAGES[color.name] = img;
});

function createDefaultProgress() {
    return {
        practice: {},
        scoreAttack: {},
        daily: {},
        endurance: {}
    };
}

function loadProgress() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return createDefaultProgress();
        return { ...createDefaultProgress(), ...JSON.parse(raw) };
    } catch (err) {
        return createDefaultProgress();
    }
}

function saveProgress(progress) {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (err) {
        // Storage access can fail in restricted environments.
    }
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach((screen) => {
        screen.style.display = 'none';
        screen.classList.remove('active');
    });
}

function showScreen(id) {
    hideAllScreens();
    if (id === 'none') return;

    const target = document.getElementById(`${id}-screen`);
    if (target) {
        target.style.display = 'flex';
        target.classList.add('active');
        if (window.game) window.game.menuIndex = 0;
    }
}

function hashSeed(input) {
    let h = 1779033703 ^ input.length;
    for (let i = 0; i < input.length; i++) {
        h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
}

function createRng(seedInput) {
    let seed = typeof seedInput === 'number' ? (seedInput >>> 0) : hashSeed(String(seedInput));
    return () => {
        seed += 0x6D2B79F5;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function rngInt(rng, min, max) {
    return min + Math.floor(rng() * ((max - min) + 1));
}

function chooseWeighted(rng, items, weightFn) {
    let total = 0;
    const weights = items.map((item) => {
        const weight = Math.max(0.05, weightFn(item));
        total += weight;
        return weight;
    });

    let roll = rng() * total;
    for (let i = 0; i < items.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
}

function makeStone(name, rng = Math.random) {
    if (name === 'garbage') {
        return {
            ...GARBAGE_STONE,
            id: Math.floor(rng() * 0x7fffffff),
            yOff: 0,
            yVel: 0
        };
    }

    const color = COLOR_MAP[name];
    return {
        ...color,
        id: Math.floor(rng() * 0x7fffffff),
        yOff: 0,
        yVel: 0,
        isGarbage: false
    };
}

function createEmptyGrid() {
    return Array.from({ length: COLS }, () => Array(ROWS).fill(null));
}

function cloneStone(stone) {
    return stone ? { ...stone } : null;
}

function cloneGrid(grid) {
    return grid.map((column) => column.map((stone) => cloneStone(stone)));
}

function countStonesInGrid(grid) {
    let total = 0;
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (grid[c][r]) total++;
        }
    }
    return total;
}

function getBottomStoneFromGrid(grid, col) {
    for (let row = ROWS - 1; row >= 0; row--) {
        if (grid[col][row]) return { r: row, stone: grid[col][row] };
    }
    return null;
}

function createPuzzleBlueprint(options = {}) {
    const paletteSize = Math.max(3, Math.min(options.paletteSize || 5, COLORS.length));
    const fillRatio = Math.max(0.35, Math.min(options.fillRatio || 0.58, 0.8));
    const baseSeed = String(options.seed || `${Date.now()}`);
    const targetStones = Math.max(18, Math.floor((COLS * ROWS * fillRatio) / 3) * 3);
    const tripletCount = Math.floor(targetStones / 3);
    for (let attempt = 0; attempt < 32; attempt++) {
        const seed = `${baseSeed}|${attempt}`;
        const rng = createRng(seed);
        const grid = createEmptyGrid();
        const heights = Array(COLS).fill(0);
        const triplets = [];
        let success = true;

        for (let t = 0; t < tripletCount; t++) {
            const color = COLORS[rngInt(rng, 0, paletteSize - 1)];
            const picks = [];
            const previous = triplets.length ? triplets[triplets.length - 1].picks : [];

            for (let s = 0; s < 3; s++) {
                const openCols = [];
                for (let c = 0; c < COLS; c++) {
                    if (heights[c] < ROWS) openCols.push(c);
                }

                if (!openCols.length) {
                    success = false;
                    break;
                }

                const pickedCol = chooseWeighted(rng, openCols, (col) => {
                    let weight = 1 + ((ROWS - heights[col]) * 0.45);
                    if (!picks.includes(col)) weight += 0.65;
                    if (previous.includes(col)) weight -= 0.25;
                    if (heights[col] === 0) weight += 0.15;
                    return weight;
                });

                const row = heights[pickedCol];
                grid[pickedCol][row] = makeStone(color.name, rng);
                heights[pickedCol]++;
                picks.push(pickedCol);
            }

            if (!success) break;
            triplets.push({ color: color.name, picks: picks.slice() });
        }

        const usedCols = heights.filter((height) => height > 0).length;
        const validation = validateBlueprint({ grid, triplets });
        if (success && validation.valid && usedCols >= 5) {
            return {
                seed,
                grid,
                triplets,
                meta: {
                    label: options.label || 'Puzzle',
                    paletteSize,
                    fillRatio,
                    targetStones,
                    usedCols,
                    maxHeight: Math.max(...heights),
                    validation
                }
            };
        }
    }

    throw new Error(`Failed to build puzzle blueprint for seed ${baseSeed}`);
}

function validateBlueprint(blueprint) {
    const sim = cloneGrid(blueprint.grid);
    let forcedPicks = 0;
    let maxBranching = 0;

    for (let t = blueprint.triplets.length - 1; t >= 0; t--) {
        const triplet = blueprint.triplets[t];
        let lock = null;

        for (let i = triplet.picks.length - 1; i >= 0; i--) {
            const playableCols = [];
            for (let c = 0; c < COLS; c++) {
                const bottom = getBottomStoneFromGrid(sim, c);
                if (!bottom) continue;
                if (!lock || bottom.stone.name === lock) playableCols.push(c);
            }

            maxBranching = Math.max(maxBranching, playableCols.length);
            if (playableCols.length === 1) forcedPicks++;

            const expectedCol = triplet.picks[i];
            const target = getBottomStoneFromGrid(sim, expectedCol);
            if (!target || target.stone.name !== triplet.color) {
                return { valid: false, reason: 'Validation replay failed.' };
            }

            lock = triplet.color;
            sim[expectedCol][target.r] = null;
        }
    }

    return {
        valid: countStonesInGrid(sim) === 0,
        forcedPicks,
        maxBranching
    };
}

function createBlueprintFromColumns(columnMap) {
    const grid = createEmptyGrid();
    Object.entries(columnMap).forEach(([colKey, column]) => {
        const col = Number(colKey);
        column.forEach((stoneName, row) => {
            grid[col][row] = makeStone(stoneName);
        });
    });

    return {
        seed: 'tutorial',
        grid,
        triplets: [],
        meta: {
            label: 'Tutorial'
        }
    };
}

function createTutorialBlueprint() {
    return createBlueprintFromColumns({
        0: ['green'],
        1: ['purple', 'red'],
        2: ['yellow'],
        3: ['green'],
        4: ['purple', 'red'],
        5: ['yellow'],
        6: ['purple', 'red'],
        7: ['green']
    });
}

function createSessionStats() {
    return {
        triplets: 0,
        resets: 0,
        wrongColorRejects: 0,
        garbageSent: 0,
        garbageCanceled: 0,
        garbageDropped: 0,
        garbageBroken: 0,
        bestStreak: 0,
        boardClears: 0
    };
}

function formatClock(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function formatCountdown(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function formatQueueFrames(frames) {
    return `${(Math.max(0, frames) / 60).toFixed(1)}s`;
}

function getDailyKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function medalForVariant(variant, summary) {
    if (variant === 'practice') {
        if (summary.timeMs <= 45000) return 'gold';
        if (summary.timeMs <= 70000) return 'silver';
        if (summary.timeMs <= 95000) return 'bronze';
        return 'none';
    }

    if (variant === 'daily') {
        if (summary.timeMs <= 55000) return 'gold';
        if (summary.timeMs <= 80000) return 'silver';
        if (summary.timeMs <= 110000) return 'bronze';
        return 'none';
    }

    if (variant === 'scoreAttack') {
        if (summary.score >= 18000) return 'gold';
        if (summary.score >= 11000) return 'silver';
        if (summary.score >= 6500) return 'bronze';
        return 'none';
    }

    if (variant === 'endurance') {
        if (summary.wave >= 8) return 'gold';
        if (summary.wave >= 5) return 'silver';
        if (summary.wave >= 3) return 'bronze';
        return 'none';
    }

    return 'none';
}

function medalLabel(medal) {
    if (medal === 'gold') return 'Gold';
    if (medal === 'silver') return 'Silver';
    if (medal === 'bronze') return 'Bronze';
    return 'Clear';
}

class InputManager {
    constructor() {
        this.keys = {};
        this.prevKeys = {};
        this.gamepads = [null, null, null, null];
        this.gpState = [{}, {}, {}, {}];
        this.gpPrevState = [{}, {}, {}, {}];
        this.lastActions = [{}, {}, {}, {}];

        window.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
        });
        window.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
    }

    prepareFrame() {
        this.gpPrevState = this.gpState.map((state) => ({ ...state }));
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < 4; i++) {
            const pad = pads[i];
            this.gamepads[i] = pad;
            if (!pad) {
                this.gpState[i] = {};
                continue;
            }

            this.gpState[i] = {
                left: pad.axes[0] < -0.5 || (pad.buttons[14] && pad.buttons[14].pressed),
                right: pad.axes[0] > 0.5 || (pad.buttons[15] && pad.buttons[15].pressed),
                up: pad.axes[1] < -0.5 || (pad.buttons[12] && pad.buttons[12].pressed),
                down: pad.axes[1] > 0.5 || (pad.buttons[13] && pad.buttons[13].pressed),
                action: pad.buttons[0] && pad.buttons[0].pressed,
                reset: pad.buttons[1] && pad.buttons[1].pressed,
                pause: pad.buttons[9] && pad.buttons[9].pressed
            };
        }
    }

    isDown(action, playerIdx = 0) {
        const bindings = KEY_BINDINGS[playerIdx] || KEY_BINDINGS[0];
        let keyDown = false;

        if (action === 'left') keyDown = bindings.left.some((code) => this.keys[code]);
        if (action === 'right') keyDown = bindings.right.some((code) => this.keys[code]);
        if (action === 'action') keyDown = bindings.action.some((code) => this.keys[code]);
        if (action === 'reset') keyDown = bindings.reset.some((code) => this.keys[code]);
        if (action === 'pause') keyDown = GLOBAL_BINDINGS.pause.some((code) => this.keys[code]);
        if (action === 'menu') keyDown = GLOBAL_BINDINGS.menu.some((code) => this.keys[code]);
        if (action === 'debug') keyDown = GLOBAL_BINDINGS.debug.some((code) => this.keys[code]);

        const gp = this.gpState[playerIdx] || {};
        if (action === 'left' && gp.left) keyDown = true;
        if (action === 'right' && gp.right) keyDown = true;
        if (action === 'action' && gp.action) keyDown = true;
        if (action === 'reset' && gp.reset) keyDown = true;
        if (action === 'pause' && gp.pause) keyDown = true;

        return keyDown;
    }

    isJustPressed(action, playerIdx = 0) {
        return this.isDown(action, playerIdx) && !this.lastActions[playerIdx][action];
    }

    isKeyJustPressed(code) {
        return !!this.keys[code] && !this.prevKeys[code];
    }

    anyGamepadJustPressed(field) {
        for (let i = 0; i < 4; i++) {
            const current = this.gpState[i] || {};
            const previous = this.gpPrevState[i] || {};
            if (current[field] && !previous[field]) return true;
        }
        return false;
    }

    endFrame() {
        this.prevKeys = { ...this.keys };
        for (let i = 0; i < 4; i++) {
            this.lastActions[i] = {
                left: this.isDown('left', i),
                right: this.isDown('right', i),
                action: this.isDown('action', i),
                reset: this.isDown('reset', i),
                pause: this.isDown('pause', i),
                menu: this.isDown('menu', 0),
                debug: this.isDown('debug', 0)
            };
        }
    }
}

class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.muted = false;
    }

    playTone(freq, type, duration, vol = 0.1) {
        if (this.muted) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playMove() {
        this.playTone(200, 'triangle', 0.1, 0.05);
    }

    playPick(chainCount) {
        const freqs = [300, 450, 600];
        this.playTone(freqs[Math.max(0, Math.min(chainCount, freqs.length - 1))], 'sine', 0.2, 0.1);
    }

    playError() {
        this.playTone(100, 'sawtooth', 0.3, 0.1);
    }

    playClear() {
        this.playTone(800, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(1200, 'square', 0.2, 0.1), 100);
    }

    playGarbage() {
        this.playTone(150, 'square', 0.4, 0.1);
    }

    playWin() {
        this.playTone(920, 'triangle', 0.12, 0.12);
        setTimeout(() => this.playTone(1320, 'sine', 0.2, 0.1), 110);
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1.0;
        this.size = Math.random() * 8 + 4;
    }

    update() {
        this.vx *= 0.94;
        this.vy *= 0.94;
        this.x += this.vx;
        this.y += this.vy;
        this.size *= 0.95;
        this.life -= 0.02;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class Board {
    constructor(game, playerIdx, isVersus) {
        this.game = game;
        this.playerIdx = playerIdx;
        this.isVersus = isVersus;
        this.sound = game.sound;
        this.grid = createEmptyGrid();
        this.cursor = Math.floor(COLS / 2);
        this.vCursor = this.cursor * (TILE_SIZE + TILE_GAP);
        this.chainColor = null;
        this.chainCount = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.pendingGarbage = 0;
        this.garbageWarning = 0;
        this.shake = 0;
        this.particles = [];
        this.projectiles = [];
        this.state = 'playing';
        this.msg = '';
        this.msgTimer = 0;
        this.msgScale = 1.0;
        this.baseBlueprint = null;
        this.seed = null;
    }

    loadBlueprint(blueprint) {
        this.baseBlueprint = {
            ...blueprint,
            grid: cloneGrid(blueprint.grid)
        };
        this.grid = cloneGrid(blueprint.grid);
        this.seed = blueprint.seed;
        this.cursor = Math.floor(COLS / 2);
        this.vCursor = this.cursor * (TILE_SIZE + TILE_GAP);
        this.chainColor = null;
        this.chainCount = 0;
        this.combo = 0;
        this.comboTimer = 0;
        this.pendingGarbage = 0;
        this.garbageWarning = 0;
        this.shake = 0;
        this.particles = [];
        this.projectiles = [];
        this.state = 'playing';
        this.msg = '';
        this.msgTimer = 0;
        this.msgScale = 1.0;
    }

    restoreBaseBlueprint() {
        if (this.baseBlueprint) this.loadBlueprint(this.baseBlueprint);
    }

    getBottomStone(col) {
        return getBottomStoneFromGrid(this.grid, col);
    }

    handleInput(input) {
        if (this.state !== 'playing' || this.game.roundEnding) return;

        if (input.isJustPressed('left', this.playerIdx)) {
            this.cursor = (this.cursor - 1 + COLS) % COLS;
            this.sound.playMove();
        }

        if (input.isJustPressed('right', this.playerIdx)) {
            this.cursor = (this.cursor + 1) % COLS;
            this.sound.playMove();
        }

        if (input.isJustPressed('reset', this.playerIdx)) {
            this.game.handleBoardReset(this);
        }

        if (input.isJustPressed('action', this.playerIdx)) {
            this.attemptPick();
        }
    }

    attemptPick() {
        if (this.projectiles.some((projectile) => projectile.c === this.cursor)) return;

        const target = this.getBottomStone(this.cursor);
        if (!target) return;

        const stone = target.stone;
        if (!stone.isGarbage && this.chainCount > 0 && stone.name !== this.chainColor) {
            this.shake = 10;
            this.sound.playError();
            this.game.stats.wrongColorRejects++;
            this.showMsg(`LOCKED TO ${this.chainColor.toUpperCase()}`);
            return;
        }

        if (countStonesInGrid(this.grid) === 1 && !stone.isGarbage) {
            this.game.targetTimeScale = 0.15;
        }

        this.projectiles.push({
            x: this.cursor * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2,
            y: BOARD_HEIGHT + 20,
            targetY: target.r * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2,
            stone,
            r: target.r,
            c: this.cursor
        });

        this.sound.playTone(400, 'square', 0.1, 0.05);
    }

    resolveHit(projectile) {
        if (this.game.targetTimeScale < 1.0) {
            this.game.targetTimeScale = 1.0;
        }

        const { r, c, stone } = projectile;
        if (this.grid[c][r] !== stone) return;

        if (stone.isGarbage) {
            this.destroyGarbage(r, c);
            return;
        }

        if (this.chainCount === 0) {
            this.chainColor = stone.name;
        }

        this.processPick(stone, r, c);
    }

    destroyGarbage(row, col) {
        this.grid[col][row] = null;
        this.createExplosion(col, row, '#C9D2E3', 10);
        this.shake = 12;
        this.sound.playGarbage();
        this.game.stats.garbageBroken++;

        if (this.chainCount > 0) {
            this.chainCount = 0;
            this.chainColor = null;
            this.combo = 0;
            this.comboTimer = 0;
            this.showMsg('CHAIN BROKEN');
        } else {
            this.showMsg('BLOCK BROKEN');
        }
    }

    processPick(stone, row, col) {
        this.grid[col][row] = null;
        this.chainCount++;
        this.sound.playPick(this.chainCount - 1);
        this.createExplosion(col, row, stone.hex);
        this.shake = 5;

        if (this.chainCount === 3) {
            this.finishTriplet();
        }
    }

    finishTriplet() {
        const streak = this.comboTimer > 0 ? this.combo + 1 : 1;
        const attack = 1 + Math.floor((streak - 1) / 2);

        this.chainCount = 0;
        this.chainColor = null;
        this.combo = streak;
        this.comboTimer = COMBO_WINDOW_FRAMES;

        this.sound.playClear();
        this.shake = 20;
        this.game.hitStop = 80;
        this.game.flash = 0.45;

        const canceled = this.cancelPendingGarbage(attack);
        const outgoing = this.isVersus ? Math.max(0, attack - canceled) : 0;

        if (canceled > 0 && outgoing > 0) this.showMsg(`CANCEL ${canceled} / SEND ${outgoing}`);
        else if (canceled > 0) this.showMsg(`CANCEL ${canceled}`);
        else if (outgoing > 0) this.showMsg(`SEND ${outgoing}`);
        else if (streak > 1) this.showMsg(`STREAK x${streak}`);

        this.game.handleTriplet(this, {
            streak,
            attack,
            canceled,
            outgoing,
            remainingStones: countStonesInGrid(this.grid)
        });

        if (outgoing > 0) {
            this.game.dispatchGarbage(this, outgoing);
        }

        if (this.checkWin()) {
            this.state = 'win';
            this.sound.playWin();
            this.createExplosion(Math.floor(COLS / 2), Math.floor(ROWS / 2), '#FFFFFF', 20);
            if (this.isVersus) {
                this.game.boards.forEach((board) => {
                    if (board !== this) board.shatterAll();
                });
            }
        }
    }

    queueGarbage(amount, delayFrames = GARBAGE_WARNING_FRAMES) {
        if (this.state !== 'playing' || amount <= 0) return;
        this.pendingGarbage += amount;
        if (this.garbageWarning <= 0) this.garbageWarning = delayFrames;
        this.showMsg(`INCOMING x${this.pendingGarbage}`);
    }

    cancelPendingGarbage(amount) {
        if (amount <= 0 || this.pendingGarbage <= 0) return 0;

        const canceled = Math.min(amount, this.pendingGarbage);
        this.pendingGarbage -= canceled;
        if (this.pendingGarbage <= 0) this.garbageWarning = 0;
        this.game.stats.garbageCanceled += canceled;
        this.sound.playTone(620, 'triangle', 0.1, 0.06);
        return canceled;
    }

    dropGarbageRow() {
        for (let c = 0; c < COLS; c++) {
            if (this.grid[c][ROWS - 1] !== null) {
                this.state = 'lose';
                this.showMsg('BOARD CRUSHED');
                this.sound.playError();
                return;
            }
        }

        for (let c = 0; c < COLS; c++) {
            for (let r = ROWS - 1; r > 0; r--) {
                const moved = this.grid[c][r - 1];
                if (moved) {
                    moved.yOff = (moved.yOff || 0) - (TILE_SIZE + TILE_GAP);
                    moved.yVel = 0;
                }
                this.grid[c][r] = moved;
            }

            const garbage = makeStone('garbage');
            garbage.yOff = -(TILE_SIZE + TILE_GAP);
            garbage.yVel = 0;
            this.grid[c][0] = garbage;
        }

        this.pendingGarbage = Math.max(0, this.pendingGarbage - 1);
        this.garbageWarning = this.pendingGarbage > 0 ? GARBAGE_WARNING_FRAMES : 0;
        this.shake = 8;
        this.sound.playGarbage();
        this.game.stats.garbageDropped++;
        this.showMsg(this.pendingGarbage > 0 ? `JUNK x${this.pendingGarbage}` : 'JUNK LANDED');
    }

    checkWin() {
        return countStonesInGrid(this.grid) === 0;
    }

    showMsg(text) {
        this.msg = text;
        this.msgTimer = 90;
        this.msgScale = 1.9;
    }

    createExplosion(col, row, color, count = 8) {
        const x = col * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
        const y = row * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2;
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    shatterAll() {
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                if (this.grid[c][r]) {
                    this.createExplosion(c, r, this.grid[c][r].hex, 10);
                    this.grid[c][r] = null;
                }
            }
        }
        this.shake = 18;
    }

    update() {
        const speedScale = this.game.timeScale;
        this.vCursor += (this.cursor * (TILE_SIZE + TILE_GAP) - this.vCursor) * 0.3;
        this.msgScale += (1.0 - this.msgScale) * 0.2;

        if (this.comboTimer > 0) {
            this.comboTimer -= speedScale;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        if (this.pendingGarbage > 0) {
            this.garbageWarning -= speedScale;
            if (this.garbageWarning <= 0) this.dropGarbageRow();
        }

        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                const stone = this.grid[c][r];
                if (!stone) continue;

                if (stone.yOff === undefined) {
                    stone.yOff = 0;
                    stone.yVel = 0;
                }

                if (stone.yOff < 0) {
                    stone.yVel += 2.5 * speedScale;
                    stone.yOff += stone.yVel;
                    if (stone.yOff > 0) {
                        stone.yOff = 0;
                        stone.yVel = -stone.yVel * 0.35;
                        if (Math.abs(stone.yVel) < 1) stone.yVel = 0;
                    }
                }
            }
        }

        if (this.shake > 0) this.shake *= 0.85;
        if (this.shake < 0.5) this.shake = 0;
        if (this.msgTimer > 0) this.msgTimer--;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) this.particles.splice(i, 1);
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.y -= 40 * speedScale;

            const trail = new Particle(
                projectile.x + ((Math.random() - 0.5) * 10),
                projectile.y + 10 + (Math.random() * 20),
                projectile.stone.hex
            );
            trail.vx *= 0.1;
            trail.vy = Math.random() * 2;
            trail.life = 0.6;
            this.particles.push(trail);

            if (projectile.y <= projectile.targetY) {
                this.resolveHit(projectile);
                this.projectiles.splice(i, 1);
            }
        }
    }

    drawChip(ctx, x, y, width, text, color = '#DCE8FF', align = 'center') {
        ctx.fillStyle = 'rgba(8, 12, 20, 0.88)';
        ctx.fillRect(x, y, width, 24);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.strokeRect(x, y, width, 24);
        ctx.fillStyle = color;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';

        if (align === 'left') ctx.fillText(text, x + 8, y + 12);
        else if (align === 'right') ctx.fillText(text, x + width - 8, y + 12);
        else ctx.fillText(text, x + (width / 2), y + 12);
    }

    drawStone(ctx, tx, ty, stone, isBottomStone, isValidBottom) {
        const yDraw = ty + (stone.yOff || 0);

        if (stone.isGarbage) {
            ctx.fillStyle = '#5E6A79';
            ctx.fillRect(tx + 2, yDraw + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.fillStyle = 'rgba(255,255,255,0.14)';
            ctx.fillRect(tx + 4, yDraw + 6, TILE_SIZE - 8, 4);
            ctx.fillRect(tx + 4, yDraw + 16, TILE_SIZE - 12, 4);
            ctx.fillRect(tx + 4, yDraw + 26, TILE_SIZE - 10, 4);
            ctx.strokeStyle = isBottomStone ? '#FFC857' : 'rgba(0,0,0,0.25)';
            ctx.lineWidth = isBottomStone ? 2.5 : 1;
            ctx.strokeRect(tx + 2, yDraw + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            return;
        }

        const pulse = Math.sin(Date.now() / 250 + (tx * 0.02) + (ty * 0.02)) * 1.5;
        const drawSize = TILE_SIZE - 4 + pulse;
        const halfPulse = pulse / 2;

        if (IMAGES[stone.name] && IMAGES[stone.name].complete) {
            ctx.drawImage(IMAGES[stone.name], tx + 2 - halfPulse, yDraw + 2 - halfPulse, drawSize, drawSize);
        } else {
            ctx.fillStyle = stone.hex;
            ctx.fillRect(tx + 2 - halfPulse, yDraw + 2 - halfPulse, drawSize, drawSize);
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(tx + 2 - halfPulse, yDraw + 2 - halfPulse, drawSize, 5);
        }

        const sweep = (Date.now() / 5 + (tx * 2.5) + (ty * 4)) % 800;
        if (sweep < drawSize * 2.5) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(tx + 2 - halfPulse, yDraw + 2 - halfPulse, drawSize, drawSize);
            ctx.clip();
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.translate(tx + sweep - drawSize, yDraw);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(0, -drawSize * 2, 8, drawSize * 4);
            ctx.restore();
        }

        if (isBottomStone && this.chainCount > 0) {
            if (isValidBottom) {
                ctx.strokeStyle = stone.hex;
                ctx.lineWidth = 3;
                ctx.strokeRect(tx + 1, yDraw + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                ctx.fillStyle = `rgba(255,255,255,${0.12 + (Math.sin(Date.now() / 160) * 0.08)})`;
                ctx.fillRect(tx + 1, yDraw + 1, TILE_SIZE - 2, TILE_SIZE - 2);
            } else {
                ctx.fillStyle = 'rgba(0,0,0,0.42)';
                ctx.fillRect(tx + 1, yDraw + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                ctx.strokeStyle = 'rgba(255,255,255,0.22)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(tx + 8, yDraw + 8);
                ctx.lineTo(tx + TILE_SIZE - 8, yDraw + TILE_SIZE - 8);
                ctx.moveTo(tx + TILE_SIZE - 8, yDraw + 8);
                ctx.lineTo(tx + 8, yDraw + TILE_SIZE - 8);
                ctx.stroke();
            }
        } else if (this.chainColor && stone.name !== this.chainColor) {
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.fillRect(tx, yDraw, TILE_SIZE, TILE_SIZE);
        }
    }

    draw(ctx, xOffset, yOffset) {
        ctx.save();
        ctx.translate(xOffset, yOffset);

        if (this.shake > 0) {
            ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
        }

        const playerColor = PLAYER_GLOW[this.playerIdx % PLAYER_GLOW.length];
        const banner = this.isVersus ? `P${this.playerIdx + 1}` :
            (this.game.mode === 'tutorial' ? 'TUTORIAL' :
            (this.game.variant === 'scoreAttack' || this.game.variant === 'endurance' ? `WAVE ${this.game.wave}` : 'SOLO'));
        const statusText = this.chainCount > 0 ?
            `LOCK ${this.chainColor.toUpperCase()} ${this.chainCount}/3` :
            (this.combo > 1 ? `STREAK x${this.combo}` : 'READY');
        const statusColor = this.chainColor && COLOR_MAP[this.chainColor] ? COLOR_MAP[this.chainColor].hex : '#DCE8FF';
        const queueText = this.pendingGarbage > 0 ?
            `QUEUE ${this.pendingGarbage} ${formatQueueFrames(this.garbageWarning)}` :
            'QUEUE SAFE';

        ctx.fillStyle = '#1E1E2F';
        ctx.fillRect(-10, -10, BOARD_WIDTH + 20, BOARD_HEIGHT + 20);
        ctx.strokeStyle = this.state === 'lose' ? '#555' : playerColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.lineWidth = 3 + (Math.sin(Date.now() / 200) * 1);
        ctx.strokeRect(-10, -10, BOARD_WIDTH + 20, BOARD_HEIGHT + 20);
        ctx.shadowBlur = 0;

        this.drawChip(ctx, 0, -40, 70, banner, '#FFFFFF');
        this.drawChip(ctx, 76, -40, BOARD_WIDTH - 188, statusText, statusColor);
        this.drawChip(ctx, BOARD_WIDTH - 106, -40, 106, queueText, this.pendingGarbage > 0 ? '#FFC857' : '#9FD8FF');

        const bottomStones = Array.from({ length: COLS }, (_, col) => this.getBottomStone(col));
        const tutorialHighlights = this.game.getHighlightedColumns(this);

        for (let c = 0; c < COLS; c++) {
            const tx = c * (TILE_SIZE + TILE_GAP);
            const bottom = bottomStones[c];
            const bottomStone = bottom ? bottom.stone : null;
            const isValidBottom = this.chainCount > 0 && bottomStone && !bottomStone.isGarbage && bottomStone.name === this.chainColor;

            if (this.chainCount > 0 && bottomStone) {
                ctx.fillStyle = isValidBottom ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
                ctx.fillRect(tx, 0, TILE_SIZE, BOARD_HEIGHT - TILE_GAP);
            }

            if (tutorialHighlights.includes(c)) {
                ctx.strokeStyle = 'rgba(255,255,255,0.85)';
                ctx.lineWidth = 2;
                ctx.strokeRect(tx - 2, -2, TILE_SIZE + 4, BOARD_HEIGHT - TILE_GAP + 4);
            }

            if (c === this.cursor && this.state === 'playing') {
                ctx.fillStyle = 'rgba(255,255,255,0.12)';
                ctx.fillRect(tx, 0, TILE_SIZE, BOARD_HEIGHT - TILE_GAP);
            }

            for (let r = 0; r < ROWS; r++) {
                const ty = r * (TILE_SIZE + TILE_GAP);
                ctx.fillStyle = '#252535';
                ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);

                const stone = this.grid[c][r];
                if (!stone) continue;
                this.drawStone(ctx, tx, ty, stone, bottom ? bottom.r === r : false, isValidBottom);
            }
        }

        const cx = this.vCursor + (TILE_SIZE / 2);
        const cy = BOARD_HEIGHT + 10 + (Math.sin(Date.now() / 150) * 4);
        ctx.fillStyle = PLAYER_GLOW[this.playerIdx % PLAYER_GLOW.length].replace('0.7', '1');
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 12 - (Math.sin(Date.now() / 100) * 2), cy + 18);
        ctx.lineTo(cx + 12 + (Math.sin(Date.now() / 100) * 2), cy + 18);
        ctx.fill();

        this.projectiles.forEach((projectile) => {
            ctx.shadowBlur = 15;
            ctx.shadowColor = projectile.stone.hex;
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(projectile.x, projectile.y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.fillRect(projectile.x - 2, projectile.y - 20, 4, 40);
            ctx.fillRect(projectile.x - 20, projectile.y - 2, 40, 4);
            ctx.shadowBlur = 0;
        });

        this.particles.forEach((particle) => particle.draw(ctx));

        if (this.msgTimer > 0) {
            ctx.save();
            ctx.translate(BOARD_WIDTH / 2, BOARD_HEIGHT / 2);
            ctx.scale(this.msgScale, this.msgScale);
            ctx.fillStyle = '#FFF';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#FF0055';
            ctx.strokeText(this.msg, 0, 0);
            ctx.fillText(this.msg, 0, 0);
            ctx.restore();
        }

        if (this.state === 'lose') {
            ctx.fillStyle = 'rgba(0,0,0,0.72)';
            ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
            ctx.fillStyle = '#FF4136';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('DEFEAT', BOARD_WIDTH / 2, BOARD_HEIGHT / 2);
        }

        ctx.restore();
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.input = new InputManager();
        this.sound = new SoundManager();
        this.progress = loadProgress();

        this.mode = 'menu';
        this.variant = 'practice';
        this.paused = false;
        this.boards = [];
        this.debug = false;
        this.lastTime = 0;
        this.menuIndex = 0;
        this.timeScale = 1.0;
        this.targetTimeScale = 1.0;
        this.hitStop = 0;
        this.flash = 0;

        this.joinedPlayers = [];
        this.scores = [0, 0, 0, 0];
        this.roundIndex = 0;
        this.roundEnding = false;
        this.sessionSeed = '';
        this.currentBlueprint = null;
        this.elapsedMs = 0;
        this.remainingMs = 0;
        this.score = 0;
        this.wave = 1;
        this.stats = createSessionStats();
        this.summary = null;
        this.lastStartConfig = null;
        this.endurancePressureMs = ENDURANCE_BASE_PRESSURE_MS;
        this.endurancePressureClock = ENDURANCE_BASE_PRESSURE_MS;
        this.tutorialState = null;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        requestAnimationFrame((timestamp) => this.loop(timestamp));
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.cx = this.canvas.width / 2;
        this.cy = this.canvas.height / 2;
    }

    buildSessionSeed() {
        if (this.variant === 'daily') return `daily:${getDailyKey()}`;
        return `${this.mode}:${this.variant}:${Date.now().toString(36)}:${Math.random().toString(16).slice(2, 8)}`;
    }

    getBestRecord() {
        if (!this.progress[this.variant]) return null;
        const key = this.variant === 'daily' ? getDailyKey() : 'default';
        return this.progress[this.variant][key] || null;
    }

    start(config) {
        this.mode = config.mode;
        this.variant = config.variant || (config.mode === 'versus' ? 'versus' : 'practice');
        this.joinedPlayers = config.joinedPlayers ? config.joinedPlayers.slice() : (config.mode === 'versus' ? [0, 1] : [0]);
        this.paused = false;
        this.roundEnding = false;
        this.roundIndex = 0;
        this.scores = [0, 0, 0, 0];
        this.elapsedMs = 0;
        this.remainingMs = this.variant === 'scoreAttack' ? SCORE_ATTACK_DURATION_MS : 0;
        this.score = 0;
        this.wave = 1;
        this.stats = createSessionStats();
        this.summary = null;
        this.timeScale = 1.0;
        this.targetTimeScale = 1.0;
        this.hitStop = 0;
        this.flash = 0;
        this.sessionSeed = this.buildSessionSeed();
        this.endurancePressureMs = ENDURANCE_BASE_PRESSURE_MS;
        this.endurancePressureClock = this.endurancePressureMs;
        this.tutorialState = this.mode === 'tutorial' ? this.createTutorialState() : null;
        this.lastStartConfig = {
            mode: this.mode,
            variant: this.variant,
            joinedPlayers: this.joinedPlayers.slice()
        };

        hideAllScreens();
        document.getElementById('game-hud').style.display = 'flex';
        document.getElementById('go-stats').innerHTML = '';
        this.startNextRound();
    }

    startNextRound() {
        const players = this.mode === 'versus' ? this.joinedPlayers.slice() : [0];
        this.currentBlueprint = this.buildBlueprint();
        this.boards = players.map((playerIdx) => {
            const board = new Board(this, playerIdx, this.mode === 'versus');
            board.loadBlueprint(this.currentBlueprint);
            return board;
        });
        if (this.mode === 'tutorial') {
            this.tutorialState = this.createTutorialState();
        }
        this.roundEnding = false;
        this.updateHud();
    }

    buildBlueprint() {
        if (this.mode === 'tutorial') {
            return createTutorialBlueprint();
        }

        if (this.mode === 'versus') {
            return createPuzzleBlueprint({
                seed: `${this.sessionSeed}:round:${this.roundIndex}`,
                paletteSize: 4,
                fillRatio: 0.55,
                label: `Round ${this.roundIndex + 1}`
            });
        }

        if (this.variant === 'practice') {
            return createPuzzleBlueprint({
                seed: `${this.sessionSeed}:practice`,
                paletteSize: 5,
                fillRatio: 0.58,
                label: 'Practice'
            });
        }

        if (this.variant === 'scoreAttack') {
            return createPuzzleBlueprint({
                seed: `${this.sessionSeed}:score:${this.wave}`,
                paletteSize: Math.min(5, 4 + Math.floor((this.wave - 1) / 3)),
                fillRatio: Math.min(0.62, 0.5 + ((this.wave - 1) * 0.02)),
                label: `Score ${this.wave}`
            });
        }

        if (this.variant === 'daily') {
            return createPuzzleBlueprint({
                seed: `${this.sessionSeed}:daily`,
                paletteSize: 5,
                fillRatio: 0.6,
                label: getDailyKey()
            });
        }

        return createPuzzleBlueprint({
            seed: `${this.sessionSeed}:endurance:${this.wave}`,
            paletteSize: Math.min(6, 4 + Math.floor((this.wave - 1) / 2)),
            fillRatio: Math.min(0.72, 0.5 + ((this.wave - 1) * 0.025)),
            label: `Endurance ${this.wave}`
        });
    }

    createTutorialState() {
        return {
            step: 0,
            steps: [
                'Move to a glowing red column and fire.',
                'Locked in. Only red bottoms stay bright. Pick the second red.',
                'Finish the red triplet.',
                'Incoming garbage is queued. Clear the purple triplet before it lands to cancel it.'
            ]
        };
    }

    getHighlightedColumns(board) {
        if (this.mode !== 'tutorial' || board.playerIdx !== 0) return [];
        return [1, 4, 6];
    }

    handleBoardReset(board) {
        if (this.mode === 'versus') {
            board.showMsg('NO RESET IN VERSUS');
            this.sound.playError();
            return;
        }

        this.stats.resets++;

        if (this.mode === 'tutorial') {
            this.elapsedMs = 0;
            this.startNextRound();
            return;
        }

        board.restoreBaseBlueprint();

        if (this.variant === 'practice' || this.variant === 'daily') {
            this.elapsedMs += 5000;
            board.showMsg('+5S RESET');
        } else if (this.variant === 'scoreAttack') {
            this.remainingMs = Math.max(0, this.remainingMs - 10000);
            this.score = Math.max(0, this.score - 750);
            board.showMsg('-10S RESET');
        } else {
            board.queueGarbage(1, 90);
            board.showMsg('PRESSURE UP');
        }

        this.sound.playError();
        this.updateHud();
    }

    handleTriplet(board, info) {
        this.stats.triplets++;
        this.stats.bestStreak = Math.max(this.stats.bestStreak, info.streak);

        if (this.mode !== 'versus') {
            let points = 100 + ((info.streak - 1) * 75) + (info.canceled * 150);
            if (this.variant === 'endurance') points += this.wave * 20;
            this.score += points;
        }

        if (this.variant === 'scoreAttack') {
            this.remainingMs = Math.min(SCORE_ATTACK_DURATION_MS, this.remainingMs + 1500);
        }

        this.updateHud();
    }

    dispatchGarbage(attacker, amount) {
        const enemies = this.boards
            .filter((board) => board !== attacker && board.state === 'playing')
            .sort((a, b) => {
                const aDelta = (a.playerIdx - attacker.playerIdx + 4) % 4;
                const bDelta = (b.playerIdx - attacker.playerIdx + 4) % 4;
                return aDelta - bDelta;
            });

        if (!enemies.length) return;
        enemies[0].queueGarbage(amount);
        this.stats.garbageSent += amount;
    }

    updateHud() {
        const left = document.getElementById('p1-score');
        const center = document.getElementById('center-msg');
        const right = document.getElementById('p2-score');

        if (this.mode === 'versus') {
            left.innerText = 'FIRST TO 5';
            center.innerText = this.joinedPlayers.map((playerIdx) => `P${playerIdx + 1}: ${this.scores[playerIdx]}`).join('   ');
            right.innerText = `ROUND ${this.roundIndex + 1}`;
            return;
        }

        if (this.mode === 'tutorial') {
            const stepCount = this.tutorialState ? this.tutorialState.steps.length : 0;
            const step = this.tutorialState ? Math.min(this.tutorialState.step, stepCount - 1) : 0;
            left.innerText = `STEP ${step + 1}/${stepCount}`;
            center.innerText = this.tutorialState ? this.tutorialState.steps[step] : VARIANT_LABELS.tutorial;
            right.innerText = 'READ THE BOARD';
            return;
        }

        if (this.variant === 'practice') {
            left.innerText = `TIME ${formatClock(this.elapsedMs)}`;
            center.innerText = VARIANT_LABELS.practice;
            right.innerText = 'RESET +5S';
            return;
        }

        if (this.variant === 'daily') {
            const best = this.getBestRecord();
            left.innerText = `TIME ${formatClock(this.elapsedMs)}`;
            center.innerText = `${VARIANT_LABELS.daily} ${getDailyKey()}`;
            right.innerText = best && best.timeMs ? `BEST ${formatClock(best.timeMs)}` : 'UNSET';
            return;
        }

        if (this.variant === 'scoreAttack') {
            left.innerText = `SCORE ${this.score.toLocaleString()}`;
            center.innerText = VARIANT_LABELS.scoreAttack;
            right.innerText = `TIME ${formatCountdown(this.remainingMs)}`;
            return;
        }

        left.innerText = `SCORE ${this.score.toLocaleString()}`;
        center.innerText = `${VARIANT_LABELS.endurance} WAVE ${this.wave}`;
        right.innerText = `PRESSURE ${formatCountdown(this.endurancePressureClock)}`;
    }

    updateTutorialState() {
        const board = this.boards[0];
        if (!board || !this.tutorialState) return;

        if (this.tutorialState.step === 0 && board.chainColor === 'red' && board.chainCount === 1) {
            this.tutorialState.step = 1;
        } else if (this.tutorialState.step === 1 && board.chainColor === 'red' && board.chainCount === 2) {
            this.tutorialState.step = 2;
        } else if (this.tutorialState.step === 2 && this.stats.triplets >= 1) {
            this.tutorialState.step = 3;
            if (board.pendingGarbage === 0) board.queueGarbage(1, 300);
        } else if (this.tutorialState.step === 3 && this.stats.garbageCanceled >= 1 && !this.roundEnding) {
            this.roundEnding = true;
            setTimeout(() => {
                this.gameOver(
                    'TUTORIAL COMPLETE',
                    'Core loop learned.',
                    {
                        variant: 'tutorial',
                        timeMs: this.elapsedMs,
                        triplets: this.stats.triplets,
                        bestStreak: this.stats.bestStreak,
                        garbageCanceled: this.stats.garbageCanceled
                    }
                );
            }, 1000);
        }

        this.updateHud();
    }

    buildSummary(overrides = {}) {
        const summary = {
            mode: this.mode,
            variant: this.mode === 'versus' ? 'versus' : this.variant,
            timeMs: this.elapsedMs,
            score: this.score,
            wave: this.wave,
            triplets: this.stats.triplets,
            bestStreak: this.stats.bestStreak,
            garbageSent: this.stats.garbageSent,
            garbageCanceled: this.stats.garbageCanceled,
            garbageBroken: this.stats.garbageBroken,
            resets: this.stats.resets,
            boardsCleared: this.stats.boardClears,
            seed: this.currentBlueprint ? this.currentBlueprint.seed : this.sessionSeed,
            ...overrides
        };

        if (summary.variant !== 'versus' && summary.variant !== 'tutorial') {
            const qualifies = summary.variant === 'practice' || summary.variant === 'daily' ? !!summary.won : true;
            summary.medal = qualifies ? medalForVariant(summary.variant, summary) : 'none';
        }

        return summary;
    }

    commitProgress(summary) {
        if (!this.progress[summary.variant]) return summary;

        const key = summary.variant === 'daily' ? getDailyKey() : 'default';
        const current = this.progress[summary.variant][key];
        let isNewBest = false;

        if (summary.variant === 'practice' || summary.variant === 'daily') {
            if (summary.won && (!current || summary.timeMs < current.timeMs)) isNewBest = true;
        } else if (summary.variant === 'scoreAttack') {
            if (!current || summary.score > current.score) isNewBest = true;
        } else if (summary.variant === 'endurance') {
            if (!current || summary.wave > current.wave || (summary.wave === current.wave && summary.score > current.score)) {
                isNewBest = true;
            }
        }

        if (isNewBest) {
            this.progress[summary.variant][key] = {
                timeMs: summary.timeMs,
                score: summary.score,
                wave: summary.wave,
                boardsCleared: summary.boardsCleared,
                medal: summary.medal,
                at: Date.now()
            };
            saveProgress(this.progress);
        }

        summary.bestRecord = this.progress[summary.variant][key] || current || null;
        summary.isNewBest = isNewBest;
        return summary;
    }

    buildSummaryMarkup(summary) {
        if (!summary) return '';

        const rows = [];
        if (summary.variant === 'tutorial') {
            rows.push(['Time', formatClock(summary.timeMs)]);
            rows.push(['Triplets', String(summary.triplets)]);
            rows.push(['Garbage Canceled', String(summary.garbageCanceled)]);
        } else if (summary.variant === 'versus') {
            rows.push(['Winner', summary.winnerLabel || 'Match Complete']);
            rows.push(['Rounds', String(this.roundIndex + 1)]);
            rows.push(['Seed', String(summary.seed).slice(-10)]);
        } else {
            rows.push(['Mode', VARIANT_LABELS[summary.variant]]);
            if (summary.variant === 'practice' || summary.variant === 'daily') {
                rows.push(['Time', formatClock(summary.timeMs)]);
            } else {
                rows.push(['Score', summary.score.toLocaleString()]);
            }
            if (summary.variant === 'scoreAttack') rows.push(['Boards', String(summary.boardsCleared)]);
            if (summary.variant === 'endurance') rows.push(['Wave', String(summary.wave)]);
            rows.push(['Best Streak', `x${summary.bestStreak}`]);
            rows.push(['Triplets', String(summary.triplets)]);
            rows.push(['Garbage Canceled', String(summary.garbageCanceled)]);
            rows.push(['Medal', `${medalLabel(summary.medal)}${summary.isNewBest ? ' / New Best' : ''}`]);

            if (summary.bestRecord) {
                if (summary.variant === 'practice' || summary.variant === 'daily') {
                    rows.push(['Best', formatClock(summary.bestRecord.timeMs)]);
                } else if (summary.variant === 'scoreAttack') {
                    rows.push(['Best', summary.bestRecord.score.toLocaleString()]);
                } else {
                    rows.push(['Best', `Wave ${summary.bestRecord.wave} / ${summary.bestRecord.score.toLocaleString()}`]);
                }
            }
        }

        return rows
            .map(([label, value]) => `<div class="summary-row"><span>${label}</span><strong>${value}</strong></div>`)
            .join('');
    }

    gameOver(title, msg, summary = null) {
        this.paused = true;
        this.roundEnding = true;
        document.getElementById('go-title').innerText = title;
        document.getElementById('go-msg').innerText = msg;
        document.getElementById('go-stats').innerHTML = this.buildSummaryMarkup(summary);
        showScreen('gameover');
    }

    finishSoloClear(title, msg) {
        let summary = this.buildSummary({ won: true });
        summary = this.commitProgress(summary);
        this.gameOver(title, msg, summary);
    }

    finishSoloLoss(title, msg) {
        const summary = this.buildSummary({ won: false });
        this.gameOver(title, msg, summary);
    }

    finishScoreAttack(title = 'TIME UP', msg = 'Score attack complete.') {
        if (this.roundEnding) return;
        this.roundEnding = true;
        let summary = this.buildSummary({ won: true });
        summary = this.commitProgress(summary);
        this.gameOver(title, msg, summary);
    }

    finishEndurance(title = 'RUN OVER', msg = 'Pressure finally won.') {
        if (this.roundEnding) return;
        this.roundEnding = true;
        let summary = this.buildSummary({ won: false });
        summary = this.commitProgress(summary);
        this.gameOver(title, msg, summary);
    }

    handleMenus() {
        const activeScreen = document.querySelector('.screen.active');
        if (!activeScreen) return;

        const buttons = Array.from(activeScreen.querySelectorAll('button'));
        if (!buttons.length) return;

        let moved = 0;
        if (this.input.isKeyJustPressed('ArrowDown') || this.input.isKeyJustPressed('KeyS') || this.input.anyGamepadJustPressed('down')) moved = 1;
        if (this.input.isKeyJustPressed('ArrowUp') || this.input.isKeyJustPressed('KeyW') || this.input.anyGamepadJustPressed('up')) moved = -1;

        if (moved !== 0) {
            this.menuIndex = (this.menuIndex + moved + buttons.length) % buttons.length;
            buttons[this.menuIndex].focus();
            this.sound.playMove();
        }

        if (this.input.isKeyJustPressed('Enter') || this.input.isKeyJustPressed('Space') || this.input.anyGamepadJustPressed('action')) {
            const button = buttons[this.menuIndex] || buttons[0];
            button.focus();
            button.click();
        }
    }

    togglePause() {
        if (this.mode === 'menu') return;
        const gameover = document.getElementById('gameover-screen');
        if (gameover.classList.contains('active')) return;

        this.paused = !this.paused;
        if (this.paused) showScreen('pause');
        else showScreen('none');
    }

    quitToMenu() {
        this.mode = 'menu';
        this.variant = 'practice';
        this.paused = false;
        this.roundEnding = false;
        this.boards = [];
        document.getElementById('game-hud').style.display = 'none';
        showScreen('menu');
    }

    restartLastSession() {
        if (!this.lastStartConfig) return;
        this.start(this.lastStartConfig);
    }

    update(dt) {
        if (!this.roundEnding) {
            this.elapsedMs += dt * 1000;
        }

        this.boards.forEach((board) => {
            board.handleInput(this.input);
            board.update();
        });

        if (this.mode === 'tutorial') {
            const board = this.boards[0];
            if (board && board.state === 'lose' && !this.roundEnding) {
                this.finishSoloLoss('TUTORIAL FAILED', 'Restart and follow the guided route.');
                return;
            }
            this.updateTutorialState();
            return;
        }

        if (this.mode === 'versus') {
            const winnerBoard = this.boards.find((board) => board.state === 'win');
            const loserBoard = this.boards.find((board) => board.state === 'lose');
            const resolvedWinner = winnerBoard || (loserBoard ? this.boards.find((board) => board !== loserBoard && board.state === 'playing') : null);

            if (resolvedWinner && !this.roundEnding) {
                this.roundEnding = true;
                this.scores[resolvedWinner.playerIdx]++;
                if (this.scores[resolvedWinner.playerIdx] >= 5) {
                    const summary = this.buildSummary({
                        variant: 'versus',
                        winnerLabel: `Player ${resolvedWinner.playerIdx + 1}`
                    });
                    setTimeout(() => {
                        this.gameOver(`PLAYER ${resolvedWinner.playerIdx + 1} WINS MATCH`, 'First to 5 points.', summary);
                    }, 1200);
                } else {
                    setTimeout(() => {
                        this.roundIndex++;
                        this.startNextRound();
                    }, 1200);
                }
            }

            this.updateHud();
            return;
        }

        const board = this.boards[0];
        if (!board) return;

        if (this.variant === 'scoreAttack') {
            this.remainingMs -= dt * 1000;
            if (this.remainingMs <= 0) {
                this.remainingMs = 0;
                this.finishScoreAttack();
                return;
            }

            if (board.state === 'win' && !this.roundEnding) {
                this.roundEnding = true;
                this.stats.boardClears++;
                this.score += 1000 + (this.stats.bestStreak * 50);
                setTimeout(() => {
                    this.wave++;
                    this.startNextRound();
                }, 650);
                return;
            }

            if (board.state === 'lose' && !this.roundEnding) {
                this.finishScoreAttack('BOARD CRUSHED', 'Score attack ended early.');
                return;
            }
        } else if (this.variant === 'endurance') {
            this.endurancePressureClock -= dt * 1000;
            if (this.endurancePressureClock <= 0) {
                board.queueGarbage(1);
                this.endurancePressureMs = Math.max(7000, ENDURANCE_BASE_PRESSURE_MS - ((this.wave - 1) * 1200));
                this.endurancePressureClock = this.endurancePressureMs;
            }

            if (board.state === 'win' && !this.roundEnding) {
                this.roundEnding = true;
                this.stats.boardClears++;
                this.score += 800 + (this.wave * 120);
                setTimeout(() => {
                    this.wave++;
                    this.endurancePressureClock = this.endurancePressureMs;
                    this.startNextRound();
                }, 700);
                return;
            }

            if (board.state === 'lose' && !this.roundEnding) {
                this.finishEndurance();
                return;
            }
        } else {
            if (board.state === 'win' && !this.roundEnding) {
                this.finishSoloClear('BOARD CLEARED', 'Validated run complete.');
                return;
            }

            if (board.state === 'lose' && !this.roundEnding) {
                this.finishSoloLoss('BOARD CRUSHED', 'Try a cleaner route.');
                return;
            }
        }

        this.updateHud();
    }

    updateDebugPanel() {
        if (!this.debug) return;

        let html = `${BUILD_INFO}<br>`;
        html += `Mode: ${this.mode}<br>`;
        html += `Variant: ${this.variant}<br>`;
        html += `Seed: ${this.currentBlueprint ? this.currentBlueprint.seed : this.sessionSeed}<br>`;
        this.boards.forEach((board) => {
            html += `P${board.playerIdx + 1}: cursor ${board.cursor}, lock ${board.chainColor || '-'} ${board.chainCount}/3, queue ${board.pendingGarbage}<br>`;
        });
        document.getElementById('debug-panel').innerHTML = html;
    }

    drawTutorialOverlay() {
        if (this.mode !== 'tutorial' || !this.tutorialState) return;

        const prompt = this.tutorialState.steps[Math.min(this.tutorialState.step, this.tutorialState.steps.length - 1)];
        const width = Math.min(560, this.canvas.width - 40);
        const height = 84;
        const x = (this.canvas.width - width) / 2;
        const y = this.canvas.height - height - 26;

        this.ctx.fillStyle = 'rgba(8, 12, 20, 0.88)';
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.14)';
        this.ctx.strokeRect(x, y, width, height);
        this.ctx.fillStyle = '#DCE8FF';
        this.ctx.font = 'bold 15px Segoe UI';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Guided Tutorial', this.canvas.width / 2, y + 22);
        this.ctx.font = '13px Segoe UI';
        this.ctx.fillText(prompt, this.canvas.width / 2, y + 50);
    }

    draw() {
        const time = Date.now();
        if (this.mode === 'menu') {
            this.ctx.fillStyle = `hsl(${(time / 50) % 360}, 50%, 10%)`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.globalCompositeOperation = 'screen';
            for (let i = 0; i < 30; i++) {
                const cx = (Math.sin(time / 2000 + i) * 600) + this.canvas.width / 2;
                const cy = (Math.cos(time / 1500 + i * 1.5) * 400) + this.canvas.height / 2;
                const size = 100 + (Math.sin(time / 500 + i) * 50);

                this.ctx.beginPath();
                const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, size);
                grad.addColorStop(0, `hsla(${(time / 20 + i * 10) % 360}, 80%, 60%, 0.15)`);
                grad.addColorStop(1, 'transparent');
                this.ctx.fillStyle = grad;
                this.ctx.arc(cx, cy, size, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.globalCompositeOperation = 'source-over';
        } else {
            this.ctx.fillStyle = `hsl(${(time / 100) % 360}, 20%, 5%)`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            for (let i = 0; i < this.canvas.width; i += 100) {
                const shiftX = (i + (time / 20)) % this.canvas.width;
                this.ctx.moveTo(shiftX, 0);
                this.ctx.lineTo(shiftX, this.canvas.height);
            }
            for (let i = 0; i < this.canvas.height; i += 100) {
                const shiftY = (i + (time / 20)) % this.canvas.height;
                this.ctx.moveTo(0, shiftY);
                this.ctx.lineTo(this.canvas.width, shiftY);
            }
            this.ctx.stroke();

            this.ctx.globalCompositeOperation = 'screen';
            for (let i = 0; i < 25; i++) {
                const x = (((i * 123) + (Math.sin(time / 1000 + i) * 100)) % this.canvas.width + this.canvas.width) % this.canvas.width;
                const y = this.canvas.height - ((time / 20 + i * 50) % this.canvas.height);
                this.ctx.fillStyle = `hsla(${(time / 30 + i * 20) % 360}, 100%, 60%, 0.2)`;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 4 + (Math.sin(time / 200 + i) * 3), 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.globalCompositeOperation = 'source-over';
        }

        if (this.mode === 'solo' || this.mode === 'tutorial') {
            if (this.boards[0]) {
                this.boards[0].draw(this.ctx, this.cx - (BOARD_WIDTH / 2), this.cy - (BOARD_HEIGHT / 2));
            }
        } else if (this.mode === 'versus') {
            const count = this.boards.length;
            const gap = count >= 4 ? 28 : 50;
            const totalW = (BOARD_WIDTH * count) + (gap * (count - 1));

            this.ctx.save();
            if (totalW > this.canvas.width - 60) {
                const scale = (this.canvas.width - 60) / totalW;
                this.ctx.translate(this.cx, this.cy);
                this.ctx.scale(scale, scale);
                this.ctx.translate(-this.cx, -this.cy);
            }

            const startX = this.cx - (totalW / 2);
            this.boards.forEach((board, index) => {
                board.draw(this.ctx, startX + ((BOARD_WIDTH + gap) * index), this.cy - (BOARD_HEIGHT / 2));
            });
            this.ctx.restore();
        }

        if (this.flash > 0) {
            this.ctx.fillStyle = `rgba(255,255,255,${this.flash})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.drawTutorialOverlay();
    }

    loop(timestamp) {
        const dt = this.lastTime ? ((timestamp - this.lastTime) / 1000) : (1 / 60);
        this.lastTime = timestamp;

        this.input.prepareFrame();

        if (this.input.isJustPressed('debug', 0)) {
            this.debug = !this.debug;
            document.getElementById('debug-panel').style.display = this.debug ? 'block' : 'none';
        }

        if (this.mode !== 'menu' && (this.input.isJustPressed('pause', 0) || this.input.isJustPressed('pause', 1))) {
            this.togglePause();
        }

        if (this.mode !== 'menu' && this.input.isJustPressed('menu', 0) && !this.paused) {
            this.quitToMenu();
        }

        const diff = this.targetTimeScale - this.timeScale;
        if (Math.abs(diff) > 0.01) this.timeScale += diff * 0.1;
        else this.timeScale = this.targetTimeScale;

        if (this.hitStop > 0) {
            this.hitStop -= dt * 1000;
        } else if (!this.paused && this.mode !== 'menu') {
            this.update(dt * this.timeScale);
        } else {
            this.handleMenus();
        }

        if (this.flash > 0) this.flash = Math.max(0, this.flash - (dt * 2.5));
        this.updateDebugPanel();
        this.draw();
        this.input.endFrame();
        requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
    }
}

const game = new Game();
window.game = game;

function startGame(mode, option) {
    if (mode === 'versus') {
        const count = typeof option === 'number' ? option : 2;
        const joinedPlayers = [];
        for (let i = 0; i < count; i++) joinedPlayers.push(i);
        game.start({
            mode: 'versus',
            variant: 'versus',
            joinedPlayers
        });
        return;
    }

    if (mode === 'tutorial') {
        game.start({
            mode: 'tutorial',
            variant: 'tutorial',
            joinedPlayers: [0]
        });
        return;
    }

    game.start({
        mode: 'solo',
        variant: option || 'practice',
        joinedPlayers: [0]
    });
}

function resumeGame() {
    game.togglePause();
}

function resetCurrentMatch() {
    game.restartLastSession();
}

function quitToMenu() {
    game.quitToMenu();
}

window.showScreen = showScreen;
window.startGame = startGame;
window.resumeGame = resumeGame;
window.resetCurrentMatch = resetCurrentMatch;
window.quitToMenu = quitToMenu;

window.render_game_to_text = () => JSON.stringify({
    mode: game.mode,
    variant: game.variant,
    paused: game.paused,
    joinedPlayers: game.joinedPlayers,
    scores: game.scores,
    hud: {
        left: document.getElementById('p1-score').innerText,
        center: document.getElementById('center-msg').innerText,
        right: document.getElementById('p2-score').innerText
    },
    boards: game.boards.map((board) => ({
        playerIdx: board.playerIdx,
        state: board.state,
        chainCount: board.chainCount,
        chainColor: board.chainColor,
        pendingGarbage: board.pendingGarbage,
        remaining: countStonesInGrid(board.grid)
    }))
});

window.advanceTime = (ms) => {
    const frames = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < frames; i++) {
        if (!game.paused && game.mode !== 'menu') {
            game.update(1 / 60);
        }
    }
    game.draw();
    return Promise.resolve();
};
