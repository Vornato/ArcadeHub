class InputManager {
    constructor() {
        this.keys = {};
        this.lastKeys = {};
        this.gamepads = [null, null];
        this.gpState = [{}, {}];
        this.gpLastState = [{}, {}];
        
        // Cooldowns to prevent super fast repeat on menus
        this.repeatTimers = [0, 0];

        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);
    }

    update() {
        // Clone previous state
        this.lastKeys = { ...this.keys };
        
        // Poll Gamepads
        const gps = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < 2; i++) {
            this.gpLastState[i] = { ...this.gpState[i] };
            
            if (gps[i]) {
                const gp = gps[i];
                // Deadzone
                const dz = 0.5;
                this.gpState[i] = {
                    left: gp.axes[0] < -dz || gp.buttons[14].pressed,
                    right: gp.axes[0] > dz || gp.buttons[15].pressed,
                    up: gp.axes[1] < -dz || gp.buttons[12].pressed,
                    down: gp.axes[1] > dz || gp.buttons[13].pressed,
                    action: gp.buttons[0].pressed || gp.buttons[1].pressed, // A or B
                    reset: gp.buttons[2].pressed || gp.buttons[3].pressed, // X or Y
                    start: gp.buttons[9].pressed
                };
            } else {
                this.gpState[i] = { left:0, right:0, up:0, down:0, action:0, reset:0, start:0 };
            }
        }
    }

    // Abstraction for actions
    getAction(playerIdx, actionName) {
        // Map abstract action to specific keys/buttons
        const kConfig = playerIdx === 0 ? CONSTANTS.KEYS.P1 : CONSTANTS.KEYS.P2;
        const gp = this.gpState[playerIdx];
        const gpLast = this.gpLastState[playerIdx];

        // Helper for "Just Pressed"
        const isKeyJustPressed = (codes) => codes.some(c => this.keys[c] && !this.lastKeys[c]);
        const isGpJustPressed = (prop) => gp[prop] && !gpLast[prop];

        if (actionName === 'LEFT') return isKeyJustPressed(kConfig.LEFT) || isGpJustPressed('left');
        if (actionName === 'RIGHT') return isKeyJustPressed(kConfig.RIGHT) || isGpJustPressed('right');
        if (actionName === 'ACTION') return isKeyJustPressed(kConfig.ACTION) || isGpJustPressed('action');
        if (actionName === 'RESET') return isKeyJustPressed(kConfig.RESET) || isGpJustPressed('reset');
        
        return false;
    }

    getGlobalAction(actionName) {
        const k = CONSTANTS.KEYS.GLOBAL;
        const isKeyJustPressed = (codes) => codes && codes.some(c => this.keys[c] && !this.lastKeys[c]);
        
        // Check both gamepads for start
        const gpStart = (this.gpState[0].start && !this.gpLastState[0].start) || 
                        (this.gpState[1].start && !this.gpLastState[1].start);

        if (actionName === 'PAUSE') return isKeyJustPressed(k.PAUSE) || gpStart;
        return false;
    }
}