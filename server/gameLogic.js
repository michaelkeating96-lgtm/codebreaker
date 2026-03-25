// Pure game scoring logic. No I/O or side effects. Consumed by socket handlers in socketHandlers.js.
const COLORS = ['R', 'G', 'B', 'Y', 'O', 'P'];
const CODE_LENGTH = 5;

/**
 * Evaluate a guess against the secret code.
 * Precondition: both `secret` and `guess` must be valid codes (call `isValidCode` first).
 * @param {string[]} secret - 5-element array of valid color codes
 * @param {string[]} guess  - 5-element array of valid color codes
 * @returns {{ exactHits: number, colorHits: number }}
 */
function evaluateGuess(secret, guess) {
  let exactHits = 0;
  const secretPool = [];
  const guessPool = [];

  for (let i = 0; i < CODE_LENGTH; i++) {
    if (secret[i] === guess[i]) {
      exactHits++;
    } else {
      secretPool.push(secret[i]);
      guessPool.push(guess[i]);
    }
  }

  let colorHits = 0;
  for (const color of guessPool) {
    const idx = secretPool.indexOf(color);
    if (idx !== -1) {
      colorHits++;
      secretPool.splice(idx, 1);
    }
  }

  return { exactHits, colorHits };
}

/** Check if a guess wins the game. */
function isWin(exactHits) {
  return exactHits === CODE_LENGTH;
}

/** Validate that a code/guess is legal (correct length, valid colors). */
function isValidCode(code) {
  return (
    Array.isArray(code) &&
    code.length === CODE_LENGTH &&
    code.every(c => COLORS.includes(c))
  );
}

module.exports = { evaluateGuess, isWin, isValidCode, COLORS, CODE_LENGTH };
