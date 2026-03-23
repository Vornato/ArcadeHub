// classes.js
// Character Roles and Abilities

const CharacterClasses = [
    {
        id: 'balanced',
        name: 'Classic Worker',
        icon: '👷',
        color: '#3498db',
        desc: 'Good all-around builder. No massive weaknesses.',
        stats: {
            speed: 4.5,
            jumpForce: -11,
            massMult: 1.0,  // Weight factor when carrying
            throwMult: 1.0,
            pushForce: 1.5,
            grabRange: 30
        }
    },
    {
        id: 'runner',
        name: 'Fast Runner',
        icon: '🏃',
        color: '#e74c3c',
        desc: 'Exceptional speed, but struggles heavily with lifting.',
        stats: {
            speed: 6.5,
            jumpForce: -12.5,
            massMult: 2.0,  // Objects feel 2x as heavy to them (slows them down)
            throwMult: 0.7,
            pushForce: 1.0,
            grabRange: 20
        }
    },
    {
        id: 'heavy',
        name: 'Strong Lifter',
        icon: '🏋️',
        color: '#2ecc71',
        desc: 'Can carry Pianos easily, but moves like a turtle.',
        stats: {
            speed: 3.2,
            jumpForce: -9.5,
            massMult: 0.3,  // Objects feel extremely light
            throwMult: 1.5,
            pushForce: 3.0,
            grabRange: 35
        }
    },
    {
        id: 'thrower',
        name: 'Throw Expert',
        icon: '🎯',
        color: '#9b59b6',
        desc: 'Can chuck objects ridiculous distances out of windows.',
        stats: {
            speed: 4.0,
            jumpForce: -10,
            massMult: 0.8,
            throwMult: 2.2, // Massive throw velocity
            pushForce: 1.5,
            grabRange: 40
        }
    },
    {
        id: 'chaos',
        name: 'Chaos Goblin',
        icon: '😈',
        color: '#e67e22',
        desc: 'Pushes everyone off the edge. Throws are wild.',
        stats: {
            speed: 5.0,
            jumpForce: -11.5,
            massMult: 1.0,
            throwMult: 1.2,
            pushForce: 5.0, // Yeets other players
            grabRange: 25
        }
    }
];

class ClassManager {
    static getClass(id) {
        return CharacterClasses.find(c => c.id === id) || CharacterClasses[0];
    }
    static getAll() {
        return CharacterClasses;
    }
}
