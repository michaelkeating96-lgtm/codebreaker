const {
  createRoom, getRoom, joinRoom, removePlayer,
  setCode, addGuess, setRematchVote, resetForRematch, clearRoom
} = require('../roomStore');

beforeEach(() => clearRoom());

describe('createRoom', () => {
  test('returns a 6-char alphanumeric room code', () => {
    const { code } = createRoom('socket1', 'Alice');
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  test('stores the creator as first player', () => {
    const { code } = createRoom('socket1', 'Alice');
    const room = getRoom(code);
    expect(room.players).toHaveLength(1);
    expect(room.players[0]).toMatchObject({ id: 'socket1', name: 'Alice' });
  });

  test('room status starts as "waiting"', () => {
    const { code } = createRoom('socket1', 'Alice');
    expect(getRoom(code).status).toBe('waiting');
  });

  test('eligiblePickerId is set to creator', () => {
    const { code } = createRoom('socket1', 'Alice');
    expect(getRoom(code).eligiblePickerId).toBe('socket1');
  });
});

describe('joinRoom', () => {
  test('adds second player and returns room', () => {
    const { code } = createRoom('socket1', 'Alice');
    const result = joinRoom(code, 'socket2', 'Bob');
    expect(result.error).toBeUndefined();
    expect(result.room.players).toHaveLength(2);
  });

  test('returns error for non-existent room', () => {
    const result = joinRoom('XXXXXX', 'socket2', 'Bob');
    expect(result.error).toBe('Room not found');
  });

  test('returns error when room is full', () => {
    const { code } = createRoom('s1', 'Alice');
    joinRoom(code, 's2', 'Bob');
    const result = joinRoom(code, 's3', 'Carol');
    expect(result.error).toBe('Room is full');
  });
});

describe('removePlayer', () => {
  test('removes a player from the room', () => {
    const { code } = createRoom('socket1', 'Alice');
    joinRoom(code, 'socket2', 'Bob');
    removePlayer('socket1');
    const room = getRoom(code);
    expect(room.players).toHaveLength(1);
    expect(room.players[0].id).toBe('socket2');
  });

  test('deletes room if last player leaves', () => {
    const { code } = createRoom('socket1', 'Alice');
    removePlayer('socket1');
    expect(getRoom(code)).toBeUndefined();
  });
});

describe('setCode', () => {
  test('sets the secret code and changes status to guessing', () => {
    const { code } = createRoom('s1', 'Alice');
    joinRoom(code, 's2', 'Bob');
    setCode(code, ['R','G','B','Y','O']);
    const room = getRoom(code);
    expect(room.secretCode).toEqual(['R','G','B','Y','O']);
    expect(room.status).toBe('guessing');
  });
});

describe('addGuess', () => {
  test('appends guess result to room', () => {
    const { code } = createRoom('s1', 'Alice');
    joinRoom(code, 's2', 'Bob');
    setCode(code, ['R','G','B','Y','O']);
    addGuess(code, { colors: ['R','R','R','R','R'], exactHits: 1, colorHits: 0 });
    expect(getRoom(code).guesses).toHaveLength(1);
  });
});

describe('setRematchVote', () => {
  test('records a player vote', () => {
    const { code } = createRoom('s1', 'Alice');
    setRematchVote(code, 's1', true);
    expect(getRoom(code).rematchVotes['s1']).toBe(true);
  });

  test('returns true when both players voted yes', () => {
    const { code } = createRoom('s1', 'Alice');
    joinRoom(code, 's2', 'Bob');
    setRematchVote(code, 's1', true);
    const bothReady = setRematchVote(code, 's2', true);
    expect(bothReady).toBe(true);
  });
});

describe('resetForRematch', () => {
  test('clears guesses, secretCode, votes, and sets eligiblePickerId to winner', () => {
    const { code } = createRoom('s1', 'Alice');
    joinRoom(code, 's2', 'Bob');
    setCode(code, ['R','G','B','Y','O']);
    addGuess(code, { colors: ['R','R','R','R','R'], exactHits: 1, colorHits: 0 });
    setRematchVote(code, 's1', true);   // add a vote so there's something to clear
    resetForRematch(code, 's2');
    const room = getRoom(code);
    expect(room.guesses).toHaveLength(0);
    expect(room.secretCode).toBeNull();
    expect(room.eligiblePickerId).toBe('s2');
    expect(room.status).toBe('waiting');
    expect(room.rematchVotes).toEqual({});  // add this assertion
  });
});
