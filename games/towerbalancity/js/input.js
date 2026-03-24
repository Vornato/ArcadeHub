// input.js
// Merges Gamepad and Keyboard input into logical Player Actions

// Keyboard map for 4 local players fallback
// Slot 0: Crane
// Slot 1-3: Builders
const KEYBOARD_MAPS = [
    { // Keyboard Slot 1 : Drop Player
        'Left': 'ArrowLeft',
        'Right': 'ArrowRight',
        'Down': 'ArrowDown',
        'Action1': 'Enter', // Drop
        'Start': 'Escape'
    },
    { // Keyboard Slot 2 : Inside Player
        'Left': 'KeyA',
        'Right': 'KeyD',
        'Down': 'KeyS',
        'Jump': 'Space',
        'Action1': 'KeyF',   // Grab
        'Action2': 'KeyG',   // Throw
        'BumperL': 'KeyQ',   // Class Left
        'BumperR': 'KeyE',   // Class Right
        'Start': 'Escape'
    },
    { // Keyboard Slot 3 : Inside Player
        'Left': 'KeyJ',
        'Right': 'KeyL',
        'Down': 'KeyK',
        'Jump': 'KeyI',
        'Action1': 'KeyO',
        'Action2': 'KeyP',
        'BumperL': 'KeyU',
        'BumperR': 'KeyY',
        'Start': 'Escape'
    },
    { // Keyboard Slot 4 : Inside Player
        'Left': 'Numpad4',
        'Right': 'Numpad6',
        'Down': 'Numpad2',
        'Jump': 'Numpad8',
        'Action1': 'Numpad7',
        'Action2': 'Numpad9',
        'BumperL': 'Numpad1',
        'BumperR': 'Numpad3',
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
            const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'Numpad1', 'Numpad3', 'Numpad4', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9'];
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
        if (this.gm && typeof this.gm.postUpdate === 'function') {
            this.gm.postUpdate();
        }
    }

    handleAnyKeyPress(code) {
        if (this.onAnyInputCallback) {
            let kbIndex = 0;
            for (let i = 0; i < KEYBOARD_MAPS.length; i++) {
                if (Object.values(KEYBOARD_MAPS[i]).includes(code)) {
                    kbIndex = i;
                    break;
                }
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
            down: false,
            jump: false,
            downJustPressed: false,
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
            if (map.Down) {
                state.down = this.isKeyPressed(map.Down);
                state.downJustPressed = this.isKeyJustPressed(map.Down);
            }

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
            const stickY = this.gm.getAxis(gpIndex, 'LeftStickY');

            state.left =
                this.gm.isButtonPressed(gpIndex, 'LEFT') ||
                stickX < -0.4;

            state.right =
                this.gm.isButtonPressed(gpIndex, 'RIGHT') ||
                stickX > 0.4;

            state.down =
                this.gm.isButtonPressed(gpIndex, 'DOWN') ||
                stickY > 0.45;
            state.downJustPressed = this.gm.isButtonJustPressed(gpIndex, 'DOWN');

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
