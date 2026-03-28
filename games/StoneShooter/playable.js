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
const VERSUS_TARGET_SCORE = 5;
const SOLO_TARGET_LEVELS = 5;
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
const SHOOTER_IMAGE = new Image();
SHOOTER_IMAGE.src = 'Assets/shooter.png';

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

function createEmptyGrid(cols = COLS, rows = ROWS) {
    return Array.from({ length: cols }, () => Array(rows).fill(null));
}

function cloneStone(stone) {
    return stone ? { ...stone } : null;
}

function cloneGrid(grid) {
    return grid.map((column) => column.map((stone) => cloneStone(stone)));
}

function countStonesInGrid(grid) {
    let total = 0;
    for (let c = 0; c < grid.length; c++) {
        for (let r = 0; r < grid[c].length; r++) {
            if (grid[c][r]) total++;
        }
    }
    return total;
}

function countColoredStonesInGrid(grid) {
    let total = 0;
    for (let c = 0; c < grid.length; c++) {
        for (let r = 0; r < grid[c].length; r++) {
            if (grid[c][r] && !grid[c][r].isGarbage) total++;
        }
    }
    return total;
}

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function lerp(start, end, amount) {
    return start + ((end - start) * amount);
}

function getBoardWidth(cols) {
    return (cols * (TILE_SIZE + TILE_GAP)) + TILE_GAP;
}

function getBoardHeight(rows) {
    return (rows * (TILE_SIZE + TILE_GAP)) + TILE_GAP;
}

function getDifficultyProfile(level) {
    const stage = Math.max(1, level);
    const baseStages = [
        { cols: 5, rows: 6, fillRatio: 0.38, paletteSize: 3 },
        { cols: 6, rows: 7, fillRatio: 0.45, paletteSize: 4 },
        { cols: 6, rows: 8, fillRatio: 0.5, paletteSize: 4 },
        { cols: 7, rows: 9, fillRatio: 0.56, paletteSize: 5 },
        { cols: 8, rows: 10, fillRatio: 0.62, paletteSize: 5 }
    ];
    const stageIndex = Math.min(baseStages.length - 1, stage - 1);
    const profile = { ...baseStages[stageIndex] };

    if (stage > baseStages.length) {
        const overflow = stage - baseStages.length;
        profile.fillRatio = Math.min(0.78, profile.fillRatio + (overflow * 0.03));
        profile.paletteSize = Math.min(COLORS.length, profile.paletteSize + Math.floor((overflow + 1) / 2));
    }

    profile.minUsedCols = Math.min(profile.cols, Math.max(4, profile.cols - 1));
    return profile;
}

function getBottomStoneFromGrid(grid, col) {
    if (!grid[col]) return null;
    for (let row = grid[col].length - 1; row >= 0; row--) {
        if (grid[col][row]) return { r: row, stone: grid[col][row] };
    }
    return null;
}

function createPuzzleBlueprint(options = {}) {
    const cols = Math.max(5, Math.min(options.cols || COLS, COLS));
    const rows = Math.max(6, Math.min(options.rows || ROWS, ROWS));
    const paletteSize = Math.max(3, Math.min(options.paletteSize || 5, COLORS.length));
    const fillRatio = Math.max(0.35, Math.min(options.fillRatio || 0.58, 0.8));
    const minUsedCols = Math.min(cols, options.minUsedCols || Math.max(4, cols - 1));
    const baseSeed = String(options.seed || `${Date.now()}`);
    const targetStones = Math.max(9, Math.floor((cols * rows * fillRatio) / 3) * 3);
    const tripletCount = Math.floor(targetStones / 3);
    for (let attempt = 0; attempt < 32; attempt++) {
        const seed = `${baseSeed}|${attempt}`;
        const rng = createRng(seed);
        const grid = createEmptyGrid(cols, rows);
        const heights = Array(cols).fill(0);
        const triplets = [];
        let success = true;

        for (let t = 0; t < tripletCount; t++) {
            const color = COLORS[rngInt(rng, 0, paletteSize - 1)];
            const picks = [];
            const previous = triplets.length ? triplets[triplets.length - 1].picks : [];

            for (let s = 0; s < 3; s++) {
                const openCols = [];
                for (let c = 0; c < cols; c++) {
                    if (heights[c] < rows) openCols.push(c);
                }

                if (!openCols.length) {
                    success = false;
                    break;
                }

                const pickedCol = chooseWeighted(rng, openCols, (col) => {
                    let weight = 1 + ((rows - heights[col]) * 0.45);
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
        if (success && validation.valid && usedCols >= minUsedCols) {
            return {
                seed,
                grid,
                triplets,
                meta: {
                    label: options.label || 'Puzzle',
                    cols,
                    rows,
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
    const cols = sim.length;
    let forcedPicks = 0;
    let maxBranching = 0;

    for (let t = blueprint.triplets.length - 1; t >= 0; t--) {
        const triplet = blueprint.triplets[t];
        let lock = null;

        for (let i = triplet.picks.length - 1; i >= 0; i--) {
            const playableCols = [];
            for (let c = 0; c < cols; c++) {
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

function createBlueprintFromColumns(columnMap, options = {}) {
    const mappedCols = Object.keys(columnMap).map((key) => Number(key));
    const cols = Math.max(options.cols || 0, mappedCols.length ? Math.max(...mappedCols) + 1 : 0, 1);
    const rows = Math.max(options.rows || 0, ...Object.values(columnMap).map((column) => column.length), 1);
    const grid = createEmptyGrid(cols, rows);
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
            label: options.label || 'Tutorial',
            cols,
            rows
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
    }, {
        cols: COLS,
        rows: ROWS,
        label: 'Tutorial'
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
                action:
                    (pad.buttons[0] && pad.buttons[0].pressed) ||
                    (pad.buttons[2] && pad.buttons[2].pressed) ||
                    (pad.buttons[7] && (pad.buttons[7].pressed || pad.buttons[7].value > 0.35)),
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

    playGarbage(level = 1) {
        const vol = 0.045 * Math.max(0.35, level);
        this.playTone(138, 'triangle', 0.18, vol);
        setTimeout(() => this.playTone(96, 'sine', 0.12, vol * 0.45), 28);
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
        this.cols = COLS;
        this.rows = ROWS;
        this.boardWidth = getBoardWidth(this.cols);
        this.boardHeight = getBoardHeight(this.rows);
        this.cursor = Math.floor(this.cols / 2);
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
        this.baseStoneCount = 0;
        this.seed = null;
    }

    loadBlueprint(blueprint) {
        this.baseBlueprint = {
            ...blueprint,
            grid: cloneGrid(blueprint.grid),
            meta: { ...(blueprint.meta || {}) }
        };
        this.grid = cloneGrid(blueprint.grid);
        this.seed = blueprint.seed;
        this.cols = blueprint.meta?.cols || blueprint.grid.length;
        this.rows = blueprint.meta?.rows || (blueprint.grid[0] ? blueprint.grid[0].length : ROWS);
        this.boardWidth = getBoardWidth(this.cols);
        this.boardHeight = getBoardHeight(this.rows);
        this.baseStoneCount = Math.max(1, countColoredStonesInGrid(blueprint.grid));
        this.cursor = Math.floor(this.cols / 2);
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

    getRemainingStoneCount() {
        return countColoredStonesInGrid(this.grid);
    }

    getBackdropMetrics() {
        const baseCount = Math.max(1, this.baseStoneCount || 1);
        const remaining = this.getRemainingStoneCount();
        const fillRatio = Math.max(0, remaining / baseCount);
        const normalizedFill = clamp01(fillRatio);
        return {
            remaining,
            baseCount,
            fillRatio,
            crowdedRatio: Math.min(1.35, fillRatio),
            clearRatio: clamp01(1 - normalizedFill)
        };
    }

    getBottomStone(col) {
        return getBottomStoneFromGrid(this.grid, col);
    }

    handleInput(input) {
        if (this.game.roundEnding) return;

        if (input.isJustPressed('reset', this.playerIdx)) {
            this.game.handleBoardReset(this);
            return;
        }

        if (this.state !== 'playing') return;

        if (input.isJustPressed('left', this.playerIdx)) {
            this.cursor = (this.cursor - 1 + this.cols) % this.cols;
            this.sound.playMove();
        }

        if (input.isJustPressed('right', this.playerIdx)) {
            this.cursor = (this.cursor + 1) % this.cols;
            this.sound.playMove();
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

        if (countColoredStonesInGrid(this.grid) === 1 && !stone.isGarbage) {
            this.game.targetTimeScale = 0.15;
        }

        this.projectiles.push({
            x: this.cursor * (TILE_SIZE + TILE_GAP) + TILE_SIZE / 2,
            y: this.boardHeight + 6,
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
        this.sound.playGarbage(0.8);
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
            remainingStones: countColoredStonesInGrid(this.grid)
        });

        if (outgoing > 0) {
            this.game.dispatchGarbage(this, outgoing);
        }

        if (this.checkWin()) {
            this.state = 'win';
            this.sound.playWin();
            this.createExplosion(Math.floor(this.cols / 2), Math.floor(this.rows / 2), '#FFFFFF', 20);
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
        if (this.state !== 'playing' || this.game.roundEnding) {
            this.pendingGarbage = 0;
            this.garbageWarning = 0;
            return;
        }

        for (let c = 0; c < this.cols; c++) {
            if (this.grid[c][this.rows - 1] !== null) {
                this.state = 'lose';
                this.showMsg('BOARD CRUSHED');
                this.sound.playError();
                return;
            }
        }

        for (let c = 0; c < this.cols; c++) {
            for (let r = this.rows - 1; r > 0; r--) {
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
        this.sound.playGarbage(0.65);
        this.game.stats.garbageDropped++;
        this.showMsg(this.pendingGarbage > 0 ? `JUNK x${this.pendingGarbage}` : 'JUNK LANDED');
    }

    checkWin() {
        return countColoredStonesInGrid(this.grid) === 0;
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
        this.pendingGarbage = 0;
        this.garbageWarning = 0;
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
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

        if (this.state === 'playing' && !this.game.roundEnding && this.pendingGarbage > 0) {
            this.garbageWarning -= speedScale;
            if (this.garbageWarning <= 0) this.dropGarbageRow();
        }

        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
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

    drawBoardBackdrop(ctx) {
        const time = Date.now();
        const { crowdedRatio, clearRatio } = this.getBackdropMetrics();
        const winBoost = this.state === 'win' ? 0.16 : 0;
        const loseBoost = this.state === 'lose' ? 0.2 : 0;
        const revealRatio = clamp01(clearRatio + winBoost);
        const density = clamp01(crowdedRatio / 1.15);
        const topHue = lerp(232, 198, revealRatio);
        const midHue = lerp(255, 214, revealRatio);
        const lowHue = lerp(292, 24, revealRatio);

        const sky = ctx.createLinearGradient(0, -10, 0, this.boardHeight + 34);
        sky.addColorStop(0, `hsl(${topHue}, ${lerp(46, 78, revealRatio)}%, ${lerp(7, 24, revealRatio)}%)`);
        sky.addColorStop(0.32, `hsl(${midHue}, ${lerp(44, 72, revealRatio)}%, ${lerp(12, 30, revealRatio)}%)`);
        sky.addColorStop(0.7, `hsl(${lerp(246, 216, revealRatio)}, ${lerp(52, 70, revealRatio)}%, ${lerp(16, 34, revealRatio)}%)`);
        sky.addColorStop(1, `hsl(${lowHue}, ${lerp(58, 84, revealRatio)}%, ${lerp(14, 42, revealRatio)}%)`);
        ctx.fillStyle = sky;
        ctx.fillRect(-10, -10, this.boardWidth + 20, this.boardHeight + 24);

        const orbX = lerp(this.boardWidth * 0.22, this.boardWidth * 0.78, (Math.sin((time / 4800) + this.playerIdx) + 1) / 2);
        const orbY = lerp(74, 104, revealRatio);
        const orb = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, 138);
        orb.addColorStop(0, `hsla(${lerp(196, 30, revealRatio)}, 96%, ${lerp(78, 72, revealRatio)}%, ${0.28 + (revealRatio * 0.18)})`);
        orb.addColorStop(0.24, `hsla(${lerp(202, 36, revealRatio)}, 92%, ${lerp(66, 64, revealRatio)}%, ${0.16 + (revealRatio * 0.12)})`);
        orb.addColorStop(1, 'transparent');
        ctx.fillStyle = orb;
        ctx.fillRect(-10, -10, this.boardWidth + 20, this.boardHeight * 0.72);

        for (let i = 0; i < 3; i++) {
            const beamBaseX = this.boardWidth * (0.16 + (i * 0.28)) + Math.sin((time / (2600 + (i * 700))) + this.playerIdx + i) * 24;
            const beamWidth = 34 + (i * 10);
            const beamTopX = beamBaseX - 20 + Math.sin((time / 1800) + i) * 14;
            ctx.fillStyle = `rgba(120, ${160 + (i * 18)}, 255, ${0.03 + (revealRatio * 0.025)})`;
            ctx.beginPath();
            ctx.moveTo(beamBaseX - beamWidth, this.boardHeight);
            ctx.lineTo(beamBaseX + beamWidth, this.boardHeight);
            ctx.lineTo(beamTopX + 18, -10);
            ctx.lineTo(beamTopX - 18, -10);
            ctx.closePath();
            ctx.fill();
        }

        if (revealRatio < 0.82) {
            for (let i = 0; i < 18; i++) {
                const starX = 16 + (((i * 31) + (this.playerIdx * 23)) % Math.max(24, this.boardWidth - 24));
                const starY = 14 + (((i * 21) + (this.playerIdx * 9)) % 124);
                const starSize = 1 + (((i + this.playerIdx) % 4) * 0.65);
                ctx.fillStyle = `rgba(255,255,255,${(0.18 + (Math.sin((time / 520) + i) * 0.12)) * (0.92 - revealRatio)})`;
                ctx.fillRect(starX, starY, starSize, starSize);
            }
        }

        for (let i = 0; i < 4; i++) {
            const cloudX = ((time * (0.0022 + (i * 0.0006))) + (this.playerIdx * 72) + (i * 150)) % (this.boardWidth + 220) - 110;
            const cloudY = 42 + (i * 25) + (Math.sin((time / 2600) + i + this.playerIdx) * 8);
            ctx.fillStyle = `rgba(255,255,255,${0.024 + (revealRatio * 0.024)})`;
            ctx.beginPath();
            ctx.ellipse(cloudX, cloudY, 72 + (i * 18), 18 + (i * 4), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cloudX + 42, cloudY + 4, 50 + (i * 12), 14 + (i * 4), 0, 0, Math.PI * 2);
            ctx.fill();
        }

        const horizonGlow = ctx.createLinearGradient(0, this.boardHeight * 0.34, 0, this.boardHeight + 16);
        horizonGlow.addColorStop(0, 'transparent');
        horizonGlow.addColorStop(0.36, `rgba(255,255,255,${0.03 + (revealRatio * 0.04)})`);
        horizonGlow.addColorStop(0.74, `rgba(255,${Math.round(lerp(120, 188, revealRatio))},${Math.round(lerp(164, 126, revealRatio))},${0.06 + (revealRatio * 0.12)})`);
        horizonGlow.addColorStop(1, `rgba(5, 8, 18, ${0.52 + (density * 0.16) + loseBoost})`);
        ctx.fillStyle = horizonGlow;
        ctx.fillRect(-10, this.boardHeight * 0.32, this.boardWidth + 20, this.boardHeight * 0.72);

        for (let layer = 0; layer < 4; layer++) {
            const depth = layer / 3;
            const baseY = this.boardHeight - 8 - (layer * 14);
            let x = -30 - (layer * 14);
            let index = 0;

            while (x < this.boardWidth + 40) {
                const width = 18 + (((index * 17) + (layer * 19) + (this.playerIdx * 7)) % 34);
                const gap = 5 + (((index * 9) + (layer * 3)) % 8);
                const heightSeed = (((index * 29) + (layer * 31) + (this.playerIdx * 11)) % 100) / 100;
                let height = lerp(42 + (layer * 16), 132 + (layer * 34), heightSeed);
                height *= lerp(1.14, 0.8, revealRatio);
                if (layer === 0) height *= lerp(1.08, 1.22, density);
                const y = baseY - height;

                const facade = ctx.createLinearGradient(x, y, x + width, baseY);
                facade.addColorStop(0, `hsla(${lerp(226, 212, revealRatio)}, ${lerp(26, 38, revealRatio)}%, ${lerp(7 + (layer * 3), 20 + (layer * 5), revealRatio)}%, ${0.34 + (depth * 0.18)})`);
                facade.addColorStop(0.55, `hsla(${lerp(236, 220, revealRatio)}, ${lerp(24, 34, revealRatio)}%, ${lerp(10 + (layer * 3), 24 + (layer * 4), revealRatio)}%, ${0.46 + (depth * 0.16)})`);
                facade.addColorStop(1, `hsla(${lerp(244, 226, revealRatio)}, ${lerp(20, 30, revealRatio)}%, ${lerp(6 + (layer * 2), 18 + (layer * 3), revealRatio)}%, ${0.54 + (depth * 0.14)})`);
                ctx.fillStyle = facade;
                ctx.fillRect(x, y, width, height);

                ctx.fillStyle = `rgba(255,255,255,${0.03 + (layer === 0 ? 0.04 : 0.015)})`;
                ctx.fillRect(x + 2, y + 2, Math.max(3, width * 0.18), Math.max(24, height * 0.55));
                ctx.fillStyle = `rgba(0,0,0,${0.12 + (layer * 0.06)})`;
                ctx.fillRect(x + width - Math.max(4, width * 0.18), y, Math.max(4, width * 0.18), height);

                if ((index + layer + this.playerIdx) % 3 === 0) {
                    ctx.fillStyle = `rgba(160, 230, 255, ${0.1 + (revealRatio * 0.08)})`;
                    ctx.fillRect(x + 4, y + 4, Math.max(8, width - 8), 2);
                }

                if ((index + layer + this.playerIdx) % 4 === 0) {
                    ctx.fillStyle = `rgba(255, ${Math.round(lerp(96, 178, revealRatio))}, 188, ${0.18 + (revealRatio * 0.1)})`;
                    ctx.fillRect(x + (width * 0.2), y + 14, Math.max(7, width * 0.58), 2);
                }

                if ((index + layer + this.playerIdx) % 5 === 0) {
                    ctx.fillStyle = `rgba(255,255,255,${0.14 + (revealRatio * 0.08)})`;
                    ctx.fillRect(x + (width * 0.46), y - 7, 2, 7);
                    ctx.beginPath();
                    ctx.arc(x + (width * 0.46) + 1, y - 9, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                }

                if (layer < 3 && width > 18) {
                    const windowCols = Math.max(1, Math.floor((width - 8) / 7));
                    const windowRows = Math.max(2, Math.floor((height - 18) / 11));
                    for (let wx = 0; wx < windowCols; wx++) {
                        for (let wy = 0; wy < windowRows; wy++) {
                            if (((wx + (wy * 2) + index + layer + this.playerIdx) % 3) !== 0) continue;
                            const warm = (wx + wy + index + layer) % 2 === 0;
                            ctx.fillStyle = warm ?
                                `rgba(255, 208, ${Math.round(lerp(116, 86, revealRatio))}, ${0.16 + (density * 0.14) - (layer * 0.03)})` :
                                `rgba(120, 242, 255, ${0.08 + (revealRatio * 0.08) - (layer * 0.02)})`;
                            ctx.fillRect(x + 4 + (wx * 7), y + 8 + (wy * 11), 2.6, 5.2);
                        }
                    }
                }

                if (layer < 2 && width > 24 && ((index + this.playerIdx) % 6 === 0)) {
                    ctx.fillStyle = `rgba(120, 255, 222, ${0.12 + (revealRatio * 0.08)})`;
                    ctx.fillRect(x + (width * 0.1), y + (height * 0.2), Math.max(7, width * 0.18), Math.min(16, height * 0.18));
                }

                x += width + gap;
                index++;
            }
        }

        for (let i = 0; i < 6; i++) {
            const laneY = this.boardHeight - 74 - (i * 10);
            const laneX = ((time * (0.14 + (i * 0.025))) + (i * 92) + (this.playerIdx * 38)) % (this.boardWidth + 120) - 70;
            ctx.fillStyle = `rgba(255, ${168 + (i * 10)}, ${120 + (i * 8)}, ${0.08 + (revealRatio * 0.08)})`;
            ctx.fillRect(laneX, laneY, 74 + (i * 8), 2);
            ctx.fillStyle = `rgba(120, 236, 255, ${0.06 + (revealRatio * 0.06)})`;
            ctx.fillRect(laneX - 20, laneY + 4, 48, 1.5);
        }

        const streetGlow = ctx.createLinearGradient(0, this.boardHeight - 72, 0, this.boardHeight + 16);
        streetGlow.addColorStop(0, 'transparent');
        streetGlow.addColorStop(0.5, `rgba(255, ${Math.round(lerp(140, 188, revealRatio))}, 102, ${0.1 + (revealRatio * 0.08)})`);
        streetGlow.addColorStop(1, `rgba(6, 10, 20, ${0.82 + loseBoost})`);
        ctx.fillStyle = streetGlow;
        ctx.fillRect(-10, this.boardHeight - 72, this.boardWidth + 20, 90);

        ctx.fillStyle = 'rgba(7, 10, 18, 0.88)';
        ctx.fillRect(-10, this.boardHeight - 18, this.boardWidth + 20, 28);
        ctx.fillStyle = `rgba(255,255,255,${0.1 + (revealRatio * 0.08)})`;
        ctx.fillRect(-10, this.boardHeight - 18, this.boardWidth + 20, 1.5);
        ctx.fillStyle = `rgba(100, 236, 255, ${0.08 + (revealRatio * 0.08)})`;
        ctx.fillRect(-10, this.boardHeight - 8, this.boardWidth + 20, 1.5);

        if (loseBoost > 0) {
            ctx.fillStyle = `rgba(110, 12, 22, ${loseBoost})`;
            ctx.fillRect(-10, -10, this.boardWidth + 20, this.boardHeight + 20);
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

    drawStatusChip(ctx, x, y, width, fallbackText, fallbackColor = '#DCE8FF') {
        ctx.fillStyle = 'rgba(8, 12, 20, 0.88)';
        ctx.fillRect(x, y, width, 24);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.strokeRect(x, y, width, 24);

        if (!(this.chainCount > 0 && this.chainColor && COLOR_MAP[this.chainColor])) {
            ctx.fillStyle = fallbackColor;
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(fallbackText, x + (width / 2), y + 12);
            return;
        }

        const lockColor = COLOR_MAP[this.chainColor];
        const iconSize = 14;
        const gap = 7;
        const countText = `${this.chainCount}/3`;
        ctx.font = 'bold 11px Arial';
        const countWidth = ctx.measureText(countText).width;
        const groupWidth = iconSize + gap + countWidth;
        const groupX = x + ((width - groupWidth) / 2);
        const iconX = groupX;
        const iconY = y + 5;
        const textX = iconX + iconSize + gap;

        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(iconX - 2, iconY - 2, iconSize + 4, iconSize + 4);

        if (IMAGES[this.chainColor] && IMAGES[this.chainColor].complete) {
            ctx.drawImage(IMAGES[this.chainColor], iconX, iconY, iconSize, iconSize);
        } else {
            ctx.fillStyle = lockColor.hex;
            ctx.fillRect(iconX, iconY, iconSize, iconSize);
            ctx.fillStyle = 'rgba(255,255,255,0.24)';
            ctx.fillRect(iconX, iconY, iconSize, 3);
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(iconX - 0.5, iconY - 0.5, iconSize + 1, iconSize + 1);

        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(countText, textX, y + 12);
    }

    drawShooter(ctx) {
        const playerGlow = PLAYER_GLOW[this.playerIdx % PLAYER_GLOW.length];
        const playerColor = PLAYER_GLOW[this.playerIdx % PLAYER_GLOW.length].replace('0.7', '1');
        const bob = Math.sin(Date.now() / 170 + (this.playerIdx * 0.75)) * 3;
        const recoil = this.projectiles.length > 0 ? Math.abs(Math.sin(Date.now() / 65)) * 4.5 : 0;
        const pulse = 0.55 + (Math.sin(Date.now() / 190 + this.playerIdx) * 0.45);
        const cx = this.vCursor + (TILE_SIZE / 2);
        const baseY = this.boardHeight + 20 + bob;
        const alpha = this.state === 'lose' ? 0.55 : 1;

        ctx.save();
        ctx.translate(cx, baseY);
        ctx.globalAlpha = alpha;

        if (SHOOTER_IMAGE.complete && SHOOTER_IMAGE.naturalWidth > 0) {
            const aura = ctx.createRadialGradient(0, 0, 10, 0, 6, 46);
            aura.addColorStop(0, playerGlow.replace('0.7', `${(0.18 + (pulse * 0.16)).toFixed(2)}`));
            aura.addColorStop(0.45, 'rgba(110, 236, 255, 0.14)');
            aura.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = aura;
            ctx.beginPath();
            ctx.ellipse(0, 5, 40, 34, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.drawImage(SHOOTER_IMAGE, -46, -60 - (recoil * 0.18), 92, 92);

            if (this.projectiles.length > 0) {
                const muzzleY = -51 - (recoil * 0.2);
                const muzzleGlow = ctx.createRadialGradient(0, muzzleY, 0, 0, muzzleY, 14);
                muzzleGlow.addColorStop(0, 'rgba(255, 248, 210, 0.42)');
                muzzleGlow.addColorStop(0.5, playerGlow.replace('0.7', `${(0.18 + (pulse * 0.18)).toFixed(2)}`));
                muzzleGlow.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = muzzleGlow;
                ctx.beginPath();
                ctx.arc(0, muzzleY, 14, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'rgba(255, 245, 180, 0.94)';
                ctx.beginPath();
                ctx.arc(0, muzzleY - 1.5, 5.5, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
            return;
        }

        const bodyGrad = ctx.createLinearGradient(-24, -16, 24, 28);
        bodyGrad.addColorStop(0, 'rgba(10, 14, 24, 1)');
        bodyGrad.addColorStop(0.55, playerColor);
        bodyGrad.addColorStop(1, 'rgba(18, 28, 48, 1)');
        const canopyGrad = ctx.createLinearGradient(0, -24, 0, 6);
        canopyGrad.addColorStop(0, 'rgba(210, 246, 255, 0.96)');
        canopyGrad.addColorStop(1, 'rgba(84, 164, 255, 0.3)');

        ctx.fillStyle = 'rgba(0,0,0,0.34)';
        ctx.beginPath();
        ctx.ellipse(0, 27, 28, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        const hoverGlow = ctx.createRadialGradient(0, 18, 2, 0, 18, 36);
        hoverGlow.addColorStop(0, `rgba(110, 236, 255, ${0.22 + (pulse * 0.08)})`);
        hoverGlow.addColorStop(0.5, `rgba(255, 150, 210, ${0.1 + (pulse * 0.06)})`);
        hoverGlow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hoverGlow;
        ctx.beginPath();
        ctx.ellipse(0, 17, 30, 13, 0, 0, Math.PI * 2);
        ctx.fill();

        for (const thrusterX of [-18, 18]) {
            const exhaust = ctx.createLinearGradient(thrusterX, 10, thrusterX, 34);
            exhaust.addColorStop(0, `rgba(255, 246, 200, ${0.26 + (pulse * 0.08)})`);
            exhaust.addColorStop(0.5, `rgba(255, 154, 92, ${0.2 + (pulse * 0.08)})`);
            exhaust.addColorStop(1, 'rgba(110, 236, 255, 0)');
            ctx.fillStyle = exhaust;
            ctx.beginPath();
            ctx.moveTo(thrusterX - 5, 12);
            ctx.lineTo(thrusterX + 5, 12);
            ctx.lineTo(thrusterX + 9, 28 + (pulse * 6));
            ctx.lineTo(thrusterX, 22 + (pulse * 7));
            ctx.lineTo(thrusterX - 9, 28 + (pulse * 6));
            ctx.closePath();
            ctx.fill();
        }

        ctx.fillStyle = '#0E1524';
        ctx.beginPath();
        ctx.ellipse(-20, 10, 8, 10, 0, 0, Math.PI * 2);
        ctx.ellipse(20, 10, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = playerColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(-20, 10, 8, 10, 0, 0, Math.PI * 2);
        ctx.ellipse(20, 10, 8, 10, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(-22, 8);
        ctx.lineTo(-13, -2);
        ctx.lineTo(14, -2);
        ctx.lineTo(24, 8);
        ctx.lineTo(18, 22);
        ctx.lineTo(-18, 22);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fillRect(-12, 2, 24, 3);
        ctx.fillRect(-8, 9, 16, 2.5);

        ctx.fillStyle = playerColor;
        ctx.beginPath();
        ctx.moveTo(-26, 12);
        ctx.lineTo(-14, 6);
        ctx.lineTo(-13, 18);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(26, 12);
        ctx.lineTo(14, 6);
        ctx.lineTo(13, 18);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0B101C';
        ctx.fillRect(-5, -17, 10, 7);
        ctx.fillStyle = playerColor;
        ctx.fillRect(-3, -21, 6, 5);

        ctx.fillStyle = canopyGrad;
        ctx.beginPath();
        ctx.ellipse(0, -10, 13, 12, 0, Math.PI, 0, true);
        ctx.lineTo(13, -4);
        ctx.ellipse(0, -4, 13, 9, 0, 0, Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.46)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#13213E';
        ctx.beginPath();
        ctx.ellipse(0, -9, 7.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(-4, -12, 5, 1.8);

        ctx.strokeStyle = '#09111C';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(0, -24 - recoil);
        ctx.stroke();

        ctx.strokeStyle = playerColor;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(0, -24 - recoil);
        ctx.stroke();

        ctx.fillStyle = '#09111C';
        ctx.fillRect(-6, -10, 12, 6);
        ctx.fillStyle = playerColor;
        ctx.fillRect(-4, -8, 8, 3);

        ctx.fillStyle = '#11182A';
        ctx.fillRect(-8, 16, 16, 8);
        ctx.strokeStyle = `rgba(255,255,255,${0.2 + (pulse * 0.08)})`;
        ctx.strokeRect(-8, 16, 16, 8);

        const muzzleGlow = ctx.createRadialGradient(0, -27 - recoil, 0, 0, -27 - recoil, 12);
        muzzleGlow.addColorStop(0, `rgba(255, 248, 210, ${0.3 + (pulse * 0.22)})`);
        muzzleGlow.addColorStop(0.5, `rgba(120, 236, 255, ${0.16 + (pulse * 0.08)})`);
        muzzleGlow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = muzzleGlow;
        ctx.beginPath();
        ctx.arc(0, -27 - recoil, 12, 0, Math.PI * 2);
        ctx.fill();

        if (this.projectiles.length > 0) {
            ctx.fillStyle = 'rgba(255, 245, 180, 0.9)';
            ctx.beginPath();
            ctx.arc(0, -28 - recoil, 5.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = 'rgba(9, 13, 22, 0.98)';
        ctx.beginPath();
        ctx.ellipse(0, 20, 24, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = playerColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.beginPath();
        ctx.ellipse(0, 16, 13, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
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
        const statusText = this.combo > 1 ? (this.boardWidth < 280 ? `x${this.combo}` : `STREAK x${this.combo}`) : 'READY';
        const statusColor = this.chainColor && COLOR_MAP[this.chainColor] ? COLOR_MAP[this.chainColor].hex : '#DCE8FF';
        const queueText = this.pendingGarbage > 0 ?
            (this.boardWidth < 280 ? `Q${this.pendingGarbage}` : `QUEUE ${this.pendingGarbage} ${formatQueueFrames(this.garbageWarning)}`) :
            (this.boardWidth < 280 ? 'SAFE' : 'QUEUE SAFE');

        this.drawBoardBackdrop(ctx);
        const boardGlass = ctx.createLinearGradient(0, -10, 0, this.boardHeight + 10);
        boardGlass.addColorStop(0, 'rgba(7, 10, 20, 0.2)');
        boardGlass.addColorStop(1, 'rgba(7, 10, 20, 0.42)');
        ctx.fillStyle = boardGlass;
        ctx.fillRect(-10, -10, this.boardWidth + 20, this.boardHeight + 20);
        ctx.strokeStyle = this.state === 'lose' ? '#555' : playerColor;
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.lineWidth = 3 + (Math.sin(Date.now() / 200) * 1);
        ctx.strokeRect(-10, -10, this.boardWidth + 20, this.boardHeight + 20);
        ctx.shadowBlur = 0;

        const leftChipWidth = this.boardWidth < 280 ? 54 : 70;
        const rightChipWidth = this.boardWidth < 280 ? 74 : 106;
        const middleX = leftChipWidth + 6;
        const middleWidth = Math.max(56, this.boardWidth - middleX - 6 - rightChipWidth);
        this.drawChip(ctx, 0, -40, leftChipWidth, banner, '#FFFFFF');
        this.drawStatusChip(ctx, middleX, -40, middleWidth, statusText, statusColor);
        this.drawChip(ctx, this.boardWidth - rightChipWidth, -40, rightChipWidth, queueText, this.pendingGarbage > 0 ? '#FFC857' : '#9FD8FF');

        const bottomStones = Array.from({ length: this.cols }, (_, col) => this.getBottomStone(col));
        const tutorialHighlights = this.game.getHighlightedColumns(this);

        for (let c = 0; c < this.cols; c++) {
            const tx = c * (TILE_SIZE + TILE_GAP);
            const bottom = bottomStones[c];
            const bottomStone = bottom ? bottom.stone : null;
            const isValidBottom = this.chainCount > 0 && bottomStone && !bottomStone.isGarbage && bottomStone.name === this.chainColor;

            if (this.chainCount > 0 && bottomStone) {
                ctx.fillStyle = isValidBottom ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
                ctx.fillRect(tx, 0, TILE_SIZE, this.boardHeight - TILE_GAP);
            }

            if (tutorialHighlights.includes(c)) {
                ctx.strokeStyle = 'rgba(255,255,255,0.85)';
                ctx.lineWidth = 2;
                ctx.strokeRect(tx - 2, -2, TILE_SIZE + 4, this.boardHeight - TILE_GAP + 4);
            }

            if (c === this.cursor && this.state === 'playing') {
                ctx.fillStyle = 'rgba(255,255,255,0.12)';
                ctx.fillRect(tx, 0, TILE_SIZE, this.boardHeight - TILE_GAP);
            }

            for (let r = 0; r < this.rows; r++) {
                const ty = r * (TILE_SIZE + TILE_GAP);
                ctx.fillStyle = 'rgba(18, 24, 42, 0.58)';
                ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = 'rgba(255,255,255,0.04)';
                ctx.fillRect(tx, ty, TILE_SIZE, 5);

                const stone = this.grid[c][r];
                if (!stone) continue;
                this.drawStone(ctx, tx, ty, stone, bottom ? bottom.r === r : false, isValidBottom);
            }
        }

        this.drawShooter(ctx);

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
            ctx.translate(this.boardWidth / 2, this.boardHeight / 2);
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
            ctx.fillRect(0, 0, this.boardWidth, this.boardHeight);
            ctx.fillStyle = '#FF4136';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.isVersus ? 'OUT' : 'DEFEAT', this.boardWidth / 2, this.boardHeight / 2 - (this.isVersus ? 14 : 0));
            if (this.isVersus && !this.game.roundEnding) {
                ctx.fillStyle = '#DCE8FF';
                ctx.font = 'bold 13px Arial';
                ctx.fillText('PRESS RESET TO REJOIN', this.boardWidth / 2, this.boardHeight / 2 + 18);
            }
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
        this.roundWinnerIdx = null;
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
        this.roundWinnerIdx = null;
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
        this.roundWinnerIdx = null;
        this.updateHud();
    }

    getProgressionLevel() {
        if (this.mode === 'versus') return this.roundIndex + 1;
        if (this.mode === 'tutorial') return 1;
        return this.wave;
    }

    getSoloTargetLevels() {
        if (this.variant === 'practice' || this.variant === 'daily') return SOLO_TARGET_LEVELS;
        return null;
    }

    buildBlueprint() {
        if (this.mode === 'tutorial') {
            return createTutorialBlueprint();
        }

        const level = this.getProgressionLevel();
        const difficulty = getDifficultyProfile(level);

        if (this.mode === 'versus') {
            return createPuzzleBlueprint({
                seed: `${this.sessionSeed}:round:${this.roundIndex}`,
                cols: difficulty.cols,
                rows: difficulty.rows,
                paletteSize: difficulty.paletteSize,
                fillRatio: difficulty.fillRatio,
                minUsedCols: difficulty.minUsedCols,
                label: `Round ${this.roundIndex + 1}`
            });
        }

        if (this.variant === 'practice') {
            return createPuzzleBlueprint({
                seed: `${this.sessionSeed}:practice:${this.wave}`,
                cols: difficulty.cols,
                rows: difficulty.rows,
                paletteSize: difficulty.paletteSize,
                fillRatio: difficulty.fillRatio,
                minUsedCols: difficulty.minUsedCols,
                label: `Practice ${this.wave}`
            });
        }

        if (this.variant === 'scoreAttack') {
            return createPuzzleBlueprint({
                seed: `${this.sessionSeed}:score:${this.wave}`,
                cols: difficulty.cols,
                rows: difficulty.rows,
                paletteSize: Math.min(COLORS.length, difficulty.paletteSize + Math.floor((this.wave - 1) / 3)),
                fillRatio: Math.min(0.8, difficulty.fillRatio + ((this.wave - 1) * 0.015)),
                minUsedCols: difficulty.minUsedCols,
                label: `Score ${this.wave}`
            });
        }

        if (this.variant === 'daily') {
            return createPuzzleBlueprint({
                seed: `${this.sessionSeed}:daily:${this.wave}`,
                cols: difficulty.cols,
                rows: difficulty.rows,
                paletteSize: difficulty.paletteSize,
                fillRatio: difficulty.fillRatio,
                minUsedCols: difficulty.minUsedCols,
                label: `${getDailyKey()} / ${this.wave}`
            });
        }

        return createPuzzleBlueprint({
            seed: `${this.sessionSeed}:endurance:${this.wave}`,
            cols: difficulty.cols,
            rows: difficulty.rows,
            paletteSize: Math.min(COLORS.length, difficulty.paletteSize + Math.floor((this.wave - 1) / 2)),
            fillRatio: Math.min(0.82, difficulty.fillRatio + ((this.wave - 1) * 0.02)),
            minUsedCols: difficulty.minUsedCols,
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
            board.restoreBaseBlueprint();
            board.showMsg('BOARD RESET');
            board.shake = 10;
            board.createExplosion(Math.floor(board.cols / 2), Math.floor(board.rows / 2), '#FFFFFF', 14);
            this.sound.playTone(260, 'triangle', 0.12, 0.06);
            this.updateHud();
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

    getVersusScoreLine() {
        return this.joinedPlayers
            .map((playerIdx) => `P${playerIdx + 1} ${this.scores[playerIdx]}`)
            .join('   ');
    }

    updateHud() {
        const left = document.getElementById('p1-score');
        const center = document.getElementById('center-msg');
        const right = document.getElementById('p2-score');

        if (this.mode === 'versus') {
            left.innerText = `FIRST TO ${VERSUS_TARGET_SCORE}`;
            if (this.roundEnding && this.roundWinnerIdx !== null) {
                center.innerText = `P${this.roundWinnerIdx + 1} TAKES ROUND`;
                right.innerText = this.scores[this.roundWinnerIdx] >= VERSUS_TARGET_SCORE ? 'MATCH POINT LOCKED' : 'NEXT BOARD LOADING';
            } else {
                center.innerText = this.getVersusScoreLine();
                right.innerText = `ROUND ${this.roundIndex + 1}`;
            }
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
            right.innerText = `LEVEL ${this.wave}/${SOLO_TARGET_LEVELS}`;
            return;
        }

        if (this.variant === 'daily') {
            left.innerText = `TIME ${formatClock(this.elapsedMs)}`;
            center.innerText = `${VARIANT_LABELS.daily} ${getDailyKey()}`;
            right.innerText = `LEVEL ${this.wave}/${SOLO_TARGET_LEVELS}`;
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
            rows.push(['Score', this.getVersusScoreLine()]);
            rows.push(['Rounds', String(this.roundIndex + 1)]);
            rows.push(['Players', String(this.joinedPlayers.length)]);
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
            if (winnerBoard && !this.roundEnding) {
                this.roundEnding = true;
                this.roundWinnerIdx = winnerBoard.playerIdx;
                this.stats.boardClears++;
                this.scores[winnerBoard.playerIdx]++;
                this.updateHud();

                if (this.scores[winnerBoard.playerIdx] >= VERSUS_TARGET_SCORE) {
                    const summary = this.buildSummary({
                        variant: 'versus',
                        winnerLabel: `Player ${winnerBoard.playerIdx + 1}`
                    });
                    setTimeout(() => {
                        this.gameOver(`PLAYER ${winnerBoard.playerIdx + 1} WINS MATCH`, `First to ${VERSUS_TARGET_SCORE} points.`, summary);
                    }, 1300);
                } else {
                    setTimeout(() => {
                        this.roundIndex++;
                        this.startNextRound();
                    }, 1300);
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
                const targetLevels = this.getSoloTargetLevels();
                if (targetLevels) this.stats.boardClears++;
                if (targetLevels && this.wave < targetLevels) {
                    this.roundEnding = true;
                    setTimeout(() => {
                        this.wave++;
                        this.startNextRound();
                    }, 850);
                } else {
                    this.finishSoloClear('BOARD CLEARED', 'Validated run complete.');
                }
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

    getAverageBackdropClearRatio() {
        if (!this.boards.length) return 0;
        const total = this.boards.reduce((sum, board) => sum + board.getBackdropMetrics().clearRatio, 0);
        return total / this.boards.length;
    }

    drawGameplayBackdrop(time) {
        const clearRatio = this.getAverageBackdropClearRatio();
        const tensionRatio = clamp01(1 - clearRatio);
        const sky = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        sky.addColorStop(0, `hsl(${lerp(232, 198, clearRatio)}, ${lerp(42, 76, clearRatio)}%, ${lerp(6, 20, clearRatio)}%)`);
        sky.addColorStop(0.28, `hsl(${lerp(246, 214, clearRatio)}, ${lerp(44, 72, clearRatio)}%, ${lerp(10, 24, clearRatio)}%)`);
        sky.addColorStop(0.62, `hsl(${lerp(254, 222, clearRatio)}, ${lerp(50, 70, clearRatio)}%, ${lerp(13, 30, clearRatio)}%)`);
        sky.addColorStop(1, `hsl(${lerp(288, 24, clearRatio)}, ${lerp(60, 84, clearRatio)}%, ${lerp(12, 38, clearRatio)}%)`);
        this.ctx.fillStyle = sky;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const orbX = this.canvas.width * (0.24 + (Math.sin(time / 7200) * 0.1));
        const orbY = lerp(this.canvas.height * 0.15, this.canvas.height * 0.22, clearRatio);
        const orb = this.ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, this.canvas.height * 0.34);
        orb.addColorStop(0, `rgba(255, 242, 214, ${0.18 + (clearRatio * 0.12)})`);
        orb.addColorStop(0.22, `rgba(120, 236, 255, ${0.14 + (clearRatio * 0.1)})`);
        orb.addColorStop(1, 'transparent');
        this.ctx.fillStyle = orb;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height * 0.72);

        for (let i = 0; i < 4; i++) {
            const beamBaseX = this.canvas.width * (0.12 + (i * 0.23)) + Math.sin((time / (2600 + (i * 600))) + i) * 36;
            const beamTopX = beamBaseX - 30 + Math.sin((time / 1600) + i) * 24;
            this.ctx.fillStyle = `rgba(110, ${170 + (i * 15)}, 255, ${0.02 + (clearRatio * 0.03)})`;
            this.ctx.beginPath();
            this.ctx.moveTo(beamBaseX - 52, this.canvas.height);
            this.ctx.lineTo(beamBaseX + 52, this.canvas.height);
            this.ctx.lineTo(beamTopX + 24, 0);
            this.ctx.lineTo(beamTopX - 24, 0);
            this.ctx.closePath();
            this.ctx.fill();
        }

        if (clearRatio < 0.82) {
            for (let i = 0; i < 36; i++) {
                const starX = 18 + (((i * 53) + (i * 7)) % Math.max(36, this.canvas.width - 36));
                const starY = 18 + (((i * 29) + (i * 11)) % Math.max(80, (this.canvas.height * 0.34)));
                const starSize = 1 + ((i % 3) * 0.7);
                this.ctx.fillStyle = `rgba(255,255,255,${(0.16 + (Math.sin((time / 600) + i) * 0.08)) * (0.9 - clearRatio)})`;
                this.ctx.fillRect(starX, starY, starSize, starSize);
            }
        }

        this.ctx.fillStyle = `rgba(255,255,255,${0.022 + (clearRatio * 0.02)})`;
        for (let i = 0; i < 6; i++) {
            const cloudX = ((time * (0.0016 + (i * 0.00035))) + (i * 320)) % (this.canvas.width + 340) - 170;
            const cloudY = 80 + (i * 50) + (Math.sin((time / 2400) + i) * 14);
            this.ctx.beginPath();
            this.ctx.ellipse(cloudX, cloudY, 132 + (i * 20), 34 + (i * 6), 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.ellipse(cloudX + 92, cloudY + 8, 92 + (i * 12), 28 + (i * 5), 0, 0, Math.PI * 2);
            this.ctx.fill();
        }

        const haze = this.ctx.createLinearGradient(0, this.canvas.height * 0.4, 0, this.canvas.height);
        haze.addColorStop(0, 'transparent');
        haze.addColorStop(0.42, `rgba(255,255,255,${0.025 + (clearRatio * 0.035)})`);
        haze.addColorStop(0.72, `rgba(255, 164, 102, ${0.08 + (clearRatio * 0.08)})`);
        haze.addColorStop(1, `rgba(6, 10, 18, ${0.86 + (tensionRatio * 0.08)})`);
        this.ctx.fillStyle = haze;
        this.ctx.fillRect(0, this.canvas.height * 0.38, this.canvas.width, this.canvas.height * 0.62);

        for (let layer = 0; layer < 4; layer++) {
            const depth = layer / 3;
            const baseY = this.canvas.height - 26 - (layer * 34);
            let x = -50 - (layer * 28);
            let index = 0;

            while (x < this.canvas.width + 90) {
                const width = 34 + (((index * 19) + (layer * 11)) % 58);
                const gap = 8 + (((index * 7) + (layer * 5)) % 14);
                const heightSeed = (((index * 37) + (layer * 17)) % 100) / 100;
                let height = lerp(96 + (layer * 36), 278 + (layer * 78), heightSeed);
                height *= lerp(1.14, 0.84, clearRatio);
                if (layer === 0) height *= lerp(1.05, 1.18, tensionRatio);
                const y = baseY - height;

                const facade = this.ctx.createLinearGradient(x, y, x + width, baseY);
                facade.addColorStop(0, `hsla(${lerp(228, 214, clearRatio)}, ${lerp(24, 36, clearRatio)}%, ${lerp(7 + (layer * 3), 18 + (layer * 5), clearRatio)}%, ${0.24 + (depth * 0.14)})`);
                facade.addColorStop(0.56, `hsla(${lerp(236, 220, clearRatio)}, ${lerp(24, 34, clearRatio)}%, ${lerp(10 + (layer * 3), 22 + (layer * 4), clearRatio)}%, ${0.32 + (depth * 0.16)})`);
                facade.addColorStop(1, `hsla(${lerp(244, 228, clearRatio)}, ${lerp(18, 28, clearRatio)}%, ${lerp(6 + (layer * 2), 16 + (layer * 3), clearRatio)}%, ${0.4 + (depth * 0.16)})`);
                this.ctx.fillStyle = facade;
                this.ctx.fillRect(x, y, width, height);

                this.ctx.fillStyle = `rgba(255,255,255,${0.025 + (layer === 0 ? 0.04 : 0.01)})`;
                this.ctx.fillRect(x + 3, y + 4, Math.max(5, width * 0.15), Math.max(40, height * 0.5));
                this.ctx.fillStyle = `rgba(0,0,0,${0.14 + (layer * 0.05)})`;
                this.ctx.fillRect(x + width - Math.max(6, width * 0.18), y, Math.max(6, width * 0.18), height);

                if ((index + layer) % 3 === 0) {
                    this.ctx.fillStyle = `rgba(130, 240, 255, ${0.08 + (clearRatio * 0.08)})`;
                    this.ctx.fillRect(x + 6, y + 6, Math.max(12, width - 12), 3);
                }

                if ((index + layer) % 5 === 0) {
                    this.ctx.fillStyle = `rgba(255, 120, 196, ${0.1 + (clearRatio * 0.08)})`;
                    this.ctx.fillRect(x + (width * 0.18), y + 18, Math.max(10, width * 0.52), 2);
                }

                if ((index + layer) % 7 === 0) {
                    this.ctx.fillStyle = `rgba(255,255,255,${0.12 + (clearRatio * 0.08)})`;
                    this.ctx.fillRect(x + (width * 0.48), y - 10, 2, 10);
                    this.ctx.beginPath();
                    this.ctx.arc(x + (width * 0.48) + 1, y - 13, 3, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                if (layer < 3) {
                    const windowAlphaWarm = 0.1 + (tensionRatio * 0.08) - (layer * 0.02);
                    const windowAlphaCool = 0.08 + (clearRatio * 0.08) - (layer * 0.015);
                    for (let wy = y + 18; wy < baseY - 16; wy += 16) {
                        for (let wx = x + 8; wx < x + width - 10; wx += 10) {
                            if (((wx + wy + index) % 4) !== 0) continue;
                            this.ctx.fillStyle = ((wx + wy + index) % 2 === 0) ?
                                `rgba(255, 214, 132, ${windowAlphaWarm})` :
                                `rgba(120, 242, 255, ${windowAlphaCool})`;
                            this.ctx.fillRect(wx, wy, 3.4, 6.5);
                        }
                    }
                }

                x += width + gap;
                index++;
            }
        }

        this.ctx.fillStyle = 'rgba(7, 10, 18, 0.72)';
        this.ctx.fillRect(0, this.canvas.height - 86, this.canvas.width, 86);
        for (let i = 0; i < 8; i++) {
            const trailY = this.canvas.height - 46 - (i * 10);
            const trailX = ((time * (0.18 + (i * 0.022))) + (i * 220)) % (this.canvas.width + 260) - 130;
            this.ctx.fillStyle = `rgba(255, ${176 + (i * 8)}, ${118 + (i * 6)}, ${0.08 + (clearRatio * 0.08)})`;
            this.ctx.fillRect(trailX, trailY, 132 + (i * 10), 2);
            this.ctx.fillStyle = `rgba(110, 236, 255, ${0.06 + (clearRatio * 0.06)})`;
            this.ctx.fillRect(trailX - 24, trailY + 5, 74, 1.5);
        }

        this.ctx.fillStyle = `rgba(255,255,255,${0.08 + (clearRatio * 0.06)})`;
        this.ctx.fillRect(0, this.canvas.height - 86, this.canvas.width, 2);
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
            this.drawGameplayBackdrop(time);
        }

        if (this.mode === 'solo' || this.mode === 'tutorial') {
            if (this.boards[0]) {
                const board = this.boards[0];
                board.draw(this.ctx, this.cx - (board.boardWidth / 2), this.cy - (board.boardHeight / 2));
            }
        } else if (this.mode === 'versus') {
            const count = this.boards.length;
            const gap = count >= 4 ? 28 : 50;
            const boardWidths = this.boards.map((board) => board.boardWidth);
            const boardHeights = this.boards.map((board) => board.boardHeight);
            const totalW = boardWidths.reduce((sum, width) => sum + width, 0) + (gap * Math.max(0, count - 1));
            const maxBoardHeight = boardHeights.length ? Math.max(...boardHeights) : getBoardHeight(ROWS);

            this.ctx.save();
            if (totalW > this.canvas.width - 60) {
                const scale = (this.canvas.width - 60) / totalW;
                this.ctx.translate(this.cx, this.cy);
                this.ctx.scale(scale, scale);
                this.ctx.translate(-this.cx, -this.cy);
            }

            const startX = this.cx - (totalW / 2);
            let xCursor = startX;
            this.boards.forEach((board, index) => {
                const yOffset = this.cy - (maxBoardHeight / 2) + ((maxBoardHeight - board.boardHeight) / 2);
                board.draw(this.ctx, xCursor, yOffset);
                xCursor += board.boardWidth + gap;
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
    wave: game.wave,
    roundIndex: game.roundIndex,
    hud: {
        left: document.getElementById('p1-score').innerText,
        center: document.getElementById('center-msg').innerText,
        right: document.getElementById('p2-score').innerText
    },
    boards: game.boards.map((board) => ({
        playerIdx: board.playerIdx,
        cols: board.cols,
        rows: board.rows,
        state: board.state,
        chainCount: board.chainCount,
        chainColor: board.chainColor,
        pendingGarbage: board.pendingGarbage,
        remaining: countColoredStonesInGrid(board.grid)
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
