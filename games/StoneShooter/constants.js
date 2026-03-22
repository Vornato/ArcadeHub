const CONSTANTS = {
    COLS: 8,
    ROWS: 12, // Increased height for more space
    TILE_SIZE: 42,
    TILE_GAP: 4,
    
    // Colors
    COLORS: [
        { name: 'red', hex: '#FF2A68', mark: '' },
        { name: 'purple', hex: '#0582CA', mark: '' },
        { name: 'green', hex: '#00D664', mark: '' },
        { name: 'yellow', hex: '#FFCC00', mark: '' },
        { name: 'pink', hex: '#AF52DE', mark: '' },
        { name: 'orange', hex: '#FF9500', mark: '' }
    ],
    WILDCARD_COLOR: { name: 'WildcardYellow', hex: '#FFFFFF', mark: '' },
    GARBAGE_COLOR: { name: 'garbage', hex: '#555555', mark: '' },

    // Input Keys
    KEYS: {
        P1: {
            LEFT: ['KeyA', 'ArrowLeft'],
            RIGHT: ['KeyD', 'ArrowRight'],
            ACTION: ['Space', 'KeyS', 'ArrowDown'],
            RESET: ['KeyR', 'ArrowUp']
        },
        P2: {
            LEFT: ['KeyJ', 'Numpad4'],
            RIGHT: ['KeyL', 'Numpad6'],
            ACTION: ['KeyK', 'Numpad2', 'Numpad0'],
            RESET: ['KeyI', 'Numpad8', 'Numpad5']
        },
        GLOBAL: {
            PAUSE: ['KeyP', 'Escape'],
            MUTE: ['KeyM']
        }
    },

    // Gameplay
    GRAVITY_DELAY: 15, // Frames to wait before gravity falls
    COMBO_WINDOW: 120, // Frames (approx 2s) to keep combo alive
    GARBAGE_DELAY: 60, // Frames before garbage drops
    
    // Difficulties
    DIFFICULTY: {
        EASY: { colors: 4, speed: 1.0 },
        NORMAL: { colors: 5, speed: 1.2 },
        HARD: { colors: 6, speed: 1.4 },
        EXPERT: { colors: 6, speed: 1.5, wildcards: false }
    }
};