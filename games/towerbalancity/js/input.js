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
        // Each has defined input source: { type: 'gamepad'|'keyboard', index: 0 }
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

    getPlayerState(playerSlot) {
        const source = this.playerMappings[playerSlot];
        if (!source) return this.getEmptyState();

        if (source.type === 'gamepad') {
            return this.getGamepadState(source.index);
        } else if (source.type === 'keyboard') {
            return this.getKeyboardState(source.index);
        }
        return this.getEmptyState();
    }

    getEmptyState() {
        return {
            left: false, right: false,
            jump: false, jumpJustPressed: false,
            action1: false, action1JustPressed: false,
            action2: false, action2JustPressed: false,
            bumperLJustPressed: false, bumperRJustPressed: false,
            startJustPressed: false
        };
    }

    getGamepadState(gpIndex) {
        const leftStick = this.gm.getAxis(gpIndex, 'LeftStickX');
        return {
            left: this.gm.isButtonPressed(gpIndex, 'LEFT') || leftStick < -0.5,
            right: this.gm.isButtonPressed(gpIndex, 'RIGHT') || leftStick > 0.5,
            jump: this.gm.isButtonPressed(gpIndex, 'A'),
            jumpJustPressed: this.gm.isButtonJustPressed(gpIndex, 'A'),
            action1: this.gm.isButtonPressed(gpIndex, 'X') || this.gm.isButtonPressed(gpIndex, 'A'), // X to grab, A to drop for floor planner
            action1JustPressed: this.gm.isButtonJustPressed(gpIndex, 'X') || this.gm.isButtonJustPressed(gpIndex, 'A'),
            action2: this.gm.isButtonPressed(gpIndex, 'B'),
            action2JustPressed: this.gm.isButtonJustPressed(gpIndex, 'B'),
            bumperLJustPressed: this.gm.isButtonJustPressed(gpIndex, 'LB'),
            bumperRJustPressed: this.gm.isButtonJustPressed(gpIndex, 'RB'),
            startJustPressed: this.gm.isButtonJustPressed(gpIndex, 'START')
        };
    }

    getKeyboardState(kbIndex) {
        const map = KEYBOARD_MAPS[kbIndex];
        return {
            left: this.isKey(map.Left),
            right: this.isKey(map.Right),
            jump: this.isKey(map.Jump),
            jumpJustPressed: this.isKeyJustPressed(map.Jump),
            action1: this.isKey(map.Action1),
            action1JustPressed: this.isKeyJustPressed(map.Action1),
            action2: this.isKey(map.Action2),
            action2JustPressed: this.isKeyJustPressed(map.Action2),
            bumperLJustPressed: this.isKeyJustPressed(map.BumperL),
            bumperRJustPressed: this.isKeyJustPressed(map.BumperR),
            startJustPressed: this.isKeyJustPressed(map.Start)
        };
    }

    isKey(code) {
        return !!this.keys[code];
    }

    isKeyJustPressed(code) {
        return !!this.keys[code] && !this.prevKeys[code];
    }
}
