const Utils = {
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    
    randomColor: (count = 5) => {
        return CONSTANTS.COLORS[Math.floor(Math.random() * count)];
    },

    lerp: (start, end, amt) => (1 - amt) * start + amt * end,

    // Easing for animations
    easeOutBack: (x) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    },
    
    shuffleArray: (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
};