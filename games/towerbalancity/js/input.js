// input.js
// Merges Gamepad and Keyboard input into logical Player Actions

// Keyboard map for 2 players fallback
// Player 1 (Keyboard): Arrow keys, Enter to Drop
// Player 2 (Keyboard): WASD, Space to Jump, F to grab, G to throw
const KEYBOARD_MAPS = [
    { // Keyboard Slot 1 : Drop Player
        'Left': 'ArrowLeft',
        'Right': 'ArrowRight',
        'Action1': 'Enter', // Drop
        'Start': 'Escape'
    },
    { // Keyboard Slot 2 : Inside Player
        'Left': 'KeyA',
        'Right': 'KeyD',
        'Jump': 'Space',
        'Action1': 'KeyF',   // Grab
        'Action2': 'KeyG',   // Throw
        'BumperL': 'KeyQ',   // Class Left
        'BumperR': 'KeyE',   // Class Right
        'Start': 'Escape'
    }
];

class InputManager {
    constructor(gamepadManager) {
        this.gm = gamepadManager;

        // Track logical players (max 4)
        // Each has defined input source: { type: 'gamepad'|'keyboard'|'bot', index: 0 }
        this.playerMappings = [null, null, null, null];

        this.keys = {};
        this.prevKeys = {};

        window.addEventListener('keydown', (e) => {
            // Prevent default browser scrolling/actions for game keys
            const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter'];
            if (gameKeys.includes(e.code)) {
                e.preventDefault();
            }
            if (e.repeat) return;
            this.keys[e.code] = true;
            this.handleAnyKeyPress(e.code);
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        this.onAnyInputCallback = null;
    }

    update() {
        this.gm.update();

        // Check for any gamepad input via poll
        if (this.onAnyInputCallback) {
            const active = this.gm.getActiveGamepadIndices();
            for (let i of active) {
                if (this.gm.anyButtonJustPressed(i)) {
                    this.onAnyInputCallback({ type: 'gamepad', index: i });
                }
            }
        }
    }

    postUpdate() {
        // Copy keys to prevKeys for next frame 'justPressed' checks
        this.prevKeys = { ...this.keys };
    }

    handleAnyKeyPress(code) {
        if (this.onAnyInputCallback) {
            // Determine if this is kb setup 1 or 2
            let kbIndex = 0;
            if (Object.values(KEYBOARD_MAPS[1]).includes(code)) {
                kbIndex = 1;
            }
            this.onAnyInputCallback({ type: 'keyboard', index: kbIndex, code: code });
        }
    }

    assignPlayer(playerSlot, source) {
        // Check if source already used
        for (let i = 0; i < 4; i++) {
            const existing = this.playerMappings[i];
            if (existing && existing.type === source.type && existing.index === source.index) {
                return false; // Already assigned
            }
        }
        this.playerMappings[playerSlot] = source;
        return true;
    }

    isAssigned(playerSlot) {
        return this.playerMappings[playerSlot] !== null;
    }

    isKeyPressed(code) {
        return !!this.keys[code];
    }

    isKeyJustPressed(code) {
        return !!this.keys[code] && !this.prevKeys[code];
    }

    getPlayerState(playerSlot) {
        const mapping = this.playerMappings[playerSlot];

        const state = {
            left: false,
            right: false,
            jump: false,
            jumpJustPressed: false,
            action1: false,
            action1JustPressed: false,
            action2: false,
            action2JustPressed: false,
            bumperL: false,
            bumperLJustPressed: false,
            bumperR: false,
            bumperRJustPressed: false,
            start: false,
            startJustPressed: false
        };

        if (!mapping || mapping.type === 'bot') return state;

        if (mapping.type === 'keyboard') {
            const map = KEYBOARD_MAPS[mapping.index];
            if (!map) return state;

            state.left = this.isKeyPressed(map.Left);
            state.right = this.isKeyPressed(map.Right);

            if (map.Jump) {
                state.jump = this.isKeyPressed(map.Jump);
                state.jumpJustPressed = this.isKeyJustPressed(map.Jump);
            }

            if (map.Action1) {
                state.action1 = this.isKeyPressed(map.Action1);
                state.action1JustPressed = this.isKeyJustPressed(map.Action1);
            }

            if (map.Action2) {
                state.action2 = this.isKeyPressed(map.Action2);
                state.action2JustPressed = this.isKeyJustPressed(map.Action2);
            }

            if (map.BumperL) {
                state.bumperL = this.isKeyPressed(map.BumperL);
                state.bumperLJustPressed = this.isKeyJustPressed(map.BumperL);
            }

            if (map.BumperR) {
                state.bumperR = this.isKeyPressed(map.BumperR);
                state.bumperRJustPressed = this.isKeyJustPressed(map.BumperR);
            }

            if (map.Start) {
                state.start = this.isKeyPressed(map.Start);
                state.startJustPressed = this.isKeyJustPressed(map.Start);
            }

            return state;
        }

        if (mapping.type === 'gamepad') {
            const gpIndex = mapping.index;

            const stickX = this.gm.getAxis(gpIndex, 'LeftStickX');

            state.left =
                this.gm.isButtonPressed(gpIndex, 'LEFT') ||
                stickX < -0.4;

            state.right =
                this.gm.isButtonPressed(gpIndex, 'RIGHT') ||
                stickX > 0.4;

            state.jump = this.gm.isButtonPressed(gpIndex, 'A');
            state.jumpJustPressed = this.gm.isButtonJustPressed(gpIndex, 'A');

            state.action1 = this.gm.isButtonPressed(gpIndex, 'X');
            state.action1JustPressed = this.gm.isButtonJustPressed(gpIndex, 'X');

            state.action2 = this.gm.isButtonPressed(gpIndex, 'B');
            state.action2JustPressed = this.gm.isButtonJustPressed(gpIndex, 'B');

            state.bumperL = this.gm.isButtonPressed(gpIndex, 'LB');
            state.bumperLJustPressed = this.gm.isButtonJustPressed(gpIndex, 'LB');

            state.bumperR = this.gm.isButtonPressed(gpIndex, 'RB');
            state.bumperRJustPressed = this.gm.isButtonJustPressed(gpIndex, 'RB');

            state.start = this.gm.isButtonPressed(gpIndex, 'START');
            state.startJustPressed = this.gm.isButtonJustPressed(gpIndex, 'START');

            // Crane on slot 0 uses A to drop too, matching your UI hint
            if (playerSlot === 0) {
                state.action1 = this.gm.isButtonPressed(gpIndex, 'A');
                state.action1JustPressed = this.gm.isButtonJustPressed(gpIndex, 'A');
            }

            return state;
        }

        return state;
    }
}