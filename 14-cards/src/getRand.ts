// Simple seeded random number generator for consistent randomness
let seed = Date.now() % 2147483647;

function getRand(): () => number {
    return function () {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    }
}

export default getRand;
