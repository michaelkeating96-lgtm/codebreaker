const { evaluateGuess } = require('../gameLogic');

describe('evaluateGuess', () => {
  test('all exact hits', () => {
    const result = evaluateGuess(['R','G','B','Y','O'], ['R','G','B','Y','O']);
    expect(result).toEqual({ exactHits: 5, colorHits: 0 });
  });

  test('no hits', () => {
    const result = evaluateGuess(['R','R','R','R','R'], ['G','G','G','G','G']);
    expect(result).toEqual({ exactHits: 0, colorHits: 0 });
  });

  test('color hits only (no exact)', () => {
    const result = evaluateGuess(['R','G','B','Y','O'], ['G','R','Y','B','P']);
    expect(result).toEqual({ exactHits: 0, colorHits: 4 });
  });

  test('mix of exact and color hits', () => {
    const result = evaluateGuess(['R','G','B','Y','O'], ['R','B','G','Y','P']);
    expect(result).toEqual({ exactHits: 2, colorHits: 2 });
  });

  test('duplicate in secret — does not double-count color hits', () => {
    // Secret: R R G B Y, Guess: R G R R R
    // Position 0: R=R exact. Remaining secret pool: [R, G, B, Y]. Remaining guess pool: [G, R, R, R]
    // G matches G (color hit), R matches R (color hit) → colorHits=2
    const result = evaluateGuess(['R','R','G','B','Y'], ['R','G','R','R','R']);
    expect(result).toEqual({ exactHits: 1, colorHits: 2 });
  });

  test('duplicate in guess — does not double-count', () => {
    // Secret: R G B Y O, Guess: R R R R R
    // exactHits: 1 (position 0). Secret pool after exact: [G, B, Y, O]. Guess pool: [R, R, R, R]
    // No R in remaining secret pool → colorHits: 0
    const result = evaluateGuess(['R','G','B','Y','O'], ['R','R','R','R','R']);
    expect(result).toEqual({ exactHits: 1, colorHits: 0 });
  });
});
