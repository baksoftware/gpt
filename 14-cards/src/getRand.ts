// Simple seeded random number generator for consistent randomness
let seed = Date.now() % 2147483647;

export function setRandSeed(newSeed: number) {
    seed = newSeed;
}

// Create a single random function instance that properly manages the seed
function createRandFunction(): () => number {
    return function () {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    }
}

// Create the shared random instance
const randInstance = createRandFunction();

export function getRand(): () => number {
    return randInstance;
}

export default getRand;
