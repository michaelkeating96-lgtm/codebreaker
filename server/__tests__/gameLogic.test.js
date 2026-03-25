const { evaluateGuess, isWin, isValidCode } = require('../gameLogic');

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

describe('isWin', () => {
  test('returns true when exactHits equals CODE_LENGTH (5)', () => {
    expect(isWin(5)).toBe(true);
  });

  test('returns false for 4 exact hits', () => {
    expect(isWin(4)).toBe(false);
  });

  test('returns false for 0 exact hits', () => {
    expect(isWin(0)).toBe(false);
  });
});

describe('isValidCode', () => {
  test('returns true for a valid 5-color code', () => {
    expect(isValidCode(['R', 'G', 'B', 'Y', 'O'])).toBe(true);
  });

  test('returns true when duplicates are present', () => {
    expect(isValidCode(['R', 'R', 'R', 'R', 'R'])).toBe(true);
  });

  test('returns false for array shorter than 5', () => {
    expect(isValidCode(['R', 'G', 'B'])).toBe(false);
  });

  test('returns false for array longer than 5', () => {
    expect(isValidCode(['R', 'G', 'B', 'Y', 'O', 'P'])).toBe(false);
  });

  test('returns false when a color is not in COLORS', () => {
    expect(isValidCode(['R', 'G', 'B', 'Y', 'X'])).toBe(false);
  });

  test('returns false for null', () => {
    expect(isValidCode(null)).toBe(false);
  });

  test('returns false for a string', () => {
    expect(isValidCode('RGBYO')).toBe(false);
  });

  test('returns false for empty array', () => {
    expect(isValidCode([])).toBe(false);
  });
});
