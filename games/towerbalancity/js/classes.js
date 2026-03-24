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
            bodyMass: 1.0,
            carryStrength: 1.0,
            throwMult: 1.0,
            pushForce: 1.5,
            grabRange: 30,
            slideResistance: 1.0,
            braceGrip: 1.35
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
            bodyMass: 0.88,
            carryStrength: 0.78,
            throwMult: 0.7,
            pushForce: 1.0,
            grabRange: 20,
            slideResistance: 0.9,
            braceGrip: 1.2
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
            bodyMass: 1.45,
            carryStrength: 1.8,
            throwMult: 1.5,
            pushForce: 3.0,
            grabRange: 35,
            slideResistance: 1.4,
            braceGrip: 1.55
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
            bodyMass: 0.96,
            carryStrength: 1.05,
            throwMult: 2.2, // Massive throw velocity
            pushForce: 1.5,
            grabRange: 40,
            slideResistance: 0.95,
            braceGrip: 1.25
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
            bodyMass: 1.08,
            carryStrength: 0.95,
            throwMult: 1.2,
            pushForce: 5.0, // Yeets other players
            grabRange: 25,
            slideResistance: 0.92,
            braceGrip: 1.15
        }
    },
    {
        id: 'juggernaut',
        name: 'Juggernaut',
        icon: 'JUG',
        color: '#f39c12',
        desc: 'Huge mass and push force. Slow, stubborn, hard to slide.',
        stats: {
            speed: 2.8,
            jumpForce: -8.8,
            bodyMass: 1.95,
            carryStrength: 2.15,
            throwMult: 1.1,
            pushForce: 4.3,
            grabRange: 34,
            slideResistance: 1.9,
            braceGrip: 1.75
        }
    },
    {
        id: 'acrobat',
        name: 'Acrobat',
        icon: 'ACR',
        color: '#55efc4',
        desc: 'Low mass, fast feet, high jump, and surprisingly good footing.',
        stats: {
            speed: 6.2,
            jumpForce: -13.2,
            bodyMass: 0.72,
            carryStrength: 0.76,
            throwMult: 0.95,
            pushForce: 0.95,
            grabRange: 24,
            slideResistance: 1.45,
            braceGrip: 1.6
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
