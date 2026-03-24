# Codebreaker Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-player browser-based Mastermind-style code-breaking game with real-time Socket.io communication between a React/Vite frontend and Node.js/Express backend.

**Architecture:** Backend owns all game state and logic; frontend is a pure render layer that mirrors server state via Socket.io events. Rooms are ephemeral (in-memory); no database required. The server designates which player may pick roles each round via `eligiblePickerId`.

**Tech Stack:** React 18, Vite 5, Node.js 20, Express 4, Socket.io 4, Jest (server tests), Vitest + React Testing Library (client tests)

---

## File Structure

### Server (`server/`)
| File | Responsibility |
|---|---|
| `server/index.js` | Express + Socket.io bootstrap, listen on port |
| `server/socketHandlers.js` | Register all socket event handlers |
| `server/roomStore.js` | In-memory room CRUD; single source of truth for game state |
| `server/gameLogic.js` | Pure functions: evaluate guesses, detect win/loss |
| `server/__tests__/gameLogic.test.js` | Unit tests for game logic |
| `server/__tests__/roomStore.test.js` | Unit tests for room store |
| `server/__tests__/socketHandlers.test.js` | Integration tests for socket events |

### Client (`client/`)
| File | Responsibility |
|---|---|
| `client/src/main.jsx` | React entry point |
| `client/src/socket.js` | Socket.io client singleton |
| `client/src/App.jsx` | Root component: screen state machine |
| `client/src/screens/HomeScreen.jsx` | Name entry + create/join room |
| `client/src/screens/LobbyScreen.jsx` | Waiting room (shows room code while creator waits for second player) |
| `client/src/screens/RoleScreen.jsx` | Role selection for eligible player; waiting view for other |
| `client/src/screens/SetCodeScreen.jsx` | Code setter picks 5-color secret |
| `client/src/screens/GameScreen.jsx` | Guesser's 10-row board + active guess row |
| `client/src/screens/ResultScreen.jsx` | Win/loss display + play again prompt |
| `client/src/screens/DisconnectScreen.jsx` | Opponent disconnected, return home |
| `client/src/components/ColorPicker.jsx` | Row of 6 clickable color swatches |
| `client/src/components/CodeSlots.jsx` | 5 slots showing selected colors |
| `client/src/components/GuessRow.jsx` | One completed guess row: colors + hit indicators |

---

## Task 1: Server Project Scaffold

**Files:**
- Create: `server/package.json`
- Create: `server/index.js`

- [ ] **Step 1: Create server directory and initialize package.json**

```bash
mkdir server && cd server
npm init -y
```

- [ ] **Step 2: Install production dependencies**

```bash
npm install express socket.io cors
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install --save-dev jest
```

- [ ] **Step 4: Add scripts to package.json**

Edit `server/package.json`:
```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "test": "jest --testPathPattern='__tests__'"
  }
}
```

- [ ] **Step 5: Create minimal index.js (will be fleshed out in Task 4)**

```js
// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { io, server };
```

- [ ] **Step 6: Verify server starts**

```bash
node index.js
```
Expected: `Server running on port 3001`

- [ ] **Step 7: Commit**

```bash
git add server/
git commit -m "feat: scaffold server with Express + Socket.io"
```

---

## Task 2: Game Logic (Pure Functions)

**Files:**
- Create: `server/gameLogic.js`
- Create: `server/__tests__/gameLogic.test.js`

The `evaluateGuess` function is the core algorithm. It must correctly compute exact hits (right color, right position) and color hits (right color, wrong position), accounting for duplicates without double-counting.

- [ ] **Step 1: Write failing tests**

```js
// server/__tests__/gameLogic.test.js
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && npx jest __tests__/gameLogic.test.js
```
Expected: FAIL — `Cannot find module '../gameLogic'`

- [ ] **Step 3: Implement gameLogic.js**

```js
// server/gameLogic.js
const COLORS = ['R', 'G', 'B', 'Y', 'O', 'P'];
const CODE_LENGTH = 5;

/**
 * Evaluate a guess against the secret code.
 * @param {string[]} secret - 5-element array of color codes
 * @param {string[]} guess  - 5-element array of color codes
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/gameLogic.test.js
```
Expected: PASS — 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add server/gameLogic.js server/__tests__/gameLogic.test.js
git commit -m "feat: implement game logic — evaluateGuess, isWin, isValidCode"
```

---

## Task 3: Room Store

**Files:**
- Create: `server/roomStore.js`
- Create: `server/__tests__/roomStore.test.js`

Room state tracks `eligiblePickerId` (who may pick roles this round) and `lastWinnerId` (used to set eligible picker on rematch).

- [ ] **Step 1: Write failing tests**

```js
// server/__tests__/roomStore.test.js
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
    resetForRematch(code, 's2');
    const room = getRoom(code);
    expect(room.guesses).toHaveLength(0);
    expect(room.secretCode).toBeNull();
    expect(room.eligiblePickerId).toBe('s2');
    expect(room.status).toBe('waiting');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/roomStore.test.js
```
Expected: FAIL — `Cannot find module '../roomStore'`

- [ ] **Step 3: Implement roomStore.js**

```js
// server/roomStore.js
const rooms = {};         // code → room
const socketToRoom = {};  // socketId → room code

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function createRoom(socketId, playerName) {
  let code;
  do { code = generateCode(); } while (rooms[code]);

  rooms[code] = {
    code,
    players: [{ id: socketId, name: playerName, role: null }],
    secretCode: null,
    guesses: [],
    status: 'waiting',
    rematchVotes: {},
    eligiblePickerId: socketId, // creator picks first on round 1
    lastWinnerId: null,
  };
  socketToRoom[socketId] = code;
  return { code, room: rooms[code] };
}

function getRoom(code) {
  return rooms[code];
}

function getRoomBySocket(socketId) {
  const code = socketToRoom[socketId];
  return code ? rooms[code] : undefined;
}

function joinRoom(code, socketId, playerName) {
  const room = rooms[code];
  if (!room) return { error: 'Room not found' };
  if (room.players.length >= 2) return { error: 'Room is full' };

  room.players.push({ id: socketId, name: playerName, role: null });
  socketToRoom[socketId] = code;
  return { room };
}

function removePlayer(socketId) {
  const code = socketToRoom[socketId];
  if (!code) return null;
  const room = rooms[code];
  if (!room) return null;

  room.players = room.players.filter(p => p.id !== socketId);
  delete socketToRoom[socketId];
  if (room.players.length === 0) {
    delete rooms[code];
    return { roomDeleted: true, code };
  }
  return { room, code };
}

function setCode(code, secretCode) {
  const room = rooms[code];
  if (!room) return;
  room.secretCode = secretCode;
  room.status = 'guessing';
}

function addGuess(code, guessResult) {
  const room = rooms[code];
  if (!room) return;
  room.guesses.push(guessResult);
}

function assignRoles(code, firstPickerId, firstPickerRole) {
  const room = rooms[code];
  if (!room) return;
  const otherRole = firstPickerRole === 'setter' ? 'guesser' : 'setter';
  room.players.forEach(p => {
    p.role = p.id === firstPickerId ? firstPickerRole : otherRole;
  });
  room.eligiblePickerId = null; // consumed — no longer valid
  room.status = 'setting';
}

function setRematchVote(code, socketId, vote) {
  const room = rooms[code];
  if (!room) return false;
  room.rematchVotes[socketId] = vote;
  return room.players.every(p => room.rematchVotes[p.id] === true);
}

/**
 * Reset room for a new round. winnerId becomes the eligible role picker.
 */
function resetForRematch(code, winnerId) {
  const room = rooms[code];
  if (!room) return;
  room.secretCode = null;
  room.guesses = [];
  room.rematchVotes = {};
  room.status = 'waiting';
  room.eligiblePickerId = winnerId;
  room.lastWinnerId = null;
  room.players.forEach(p => { p.role = null; });
}

// Test helper — clears all in-memory state
function clearRoom() {
  Object.keys(rooms).forEach(k => delete rooms[k]);
  Object.keys(socketToRoom).forEach(k => delete socketToRoom[k]);
}

module.exports = {
  createRoom, getRoom, getRoomBySocket, joinRoom,
  removePlayer, setCode, addGuess, assignRoles,
  setRematchVote, resetForRematch, clearRoom,
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/roomStore.test.js
```
Expected: PASS — all tests pass

- [ ] **Step 5: Commit**

```bash
git add server/roomStore.js server/__tests__/roomStore.test.js
git commit -m "feat: implement in-memory room store with eligiblePickerId tracking"
```

---

## Task 4: Socket Event Handlers

**Files:**
- Create: `server/socketHandlers.js`
- Create: `server/__tests__/socketHandlers.test.js`

These are integration tests — they spin up a real Socket.io server and connect test clients. Key design rules enforced here:
- Only the `eligiblePickerId` player may call `pick_role`
- Only the guesser may call `submit_guess`
- `decline_rematch` returns both players to the home screen
- All evaluation is server-side

- [ ] **Step 1: Install socket.io-client for tests**

```bash
npm install --save-dev socket.io-client
```

- [ ] **Step 2: Write failing integration tests**

```js
// server/__tests__/socketHandlers.test.js
const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const { registerHandlers } = require('../socketHandlers');
const { clearRoom } = require('../roomStore');

let io, server, port;

beforeAll((done) => {
  server = createServer();
  io = new Server(server);
  io.on('connection', (socket) => registerHandlers(io, socket));
  server.listen(() => {
    port = server.address().port;
    done();
  });
});

afterAll((done) => {
  io.close();
  server.close(done);
});

beforeEach(() => clearRoom());

function connectClient() {
  return new Promise((resolve) => {
    const client = Client(`http://localhost:${port}`);
    client.once('connect', () => resolve(client));
  });
}

function waitFor(client, event) {
  return new Promise((resolve) => client.once(event, resolve));
}

describe('create_room', () => {
  test('emits room code back to creator', async () => {
    const alice = await connectClient();
    alice.emit('create_room', { name: 'Alice' });
    const data = await waitFor(alice, 'room_created');
    expect(data.code).toMatch(/^[A-Z0-9]{6}$/);
    alice.disconnect();
  });
});

describe('join_room', () => {
  test('second player triggers room_joined for both with eligiblePickerId', async () => {
    const alice = await connectClient();
    alice.emit('create_room', { name: 'Alice' });
    const { code } = await waitFor(alice, 'room_created');

    const bob = await connectClient();
    const aliceJoined = waitFor(alice, 'room_joined');
    bob.emit('join_room', { code, name: 'Bob' });

    const payload = await aliceJoined;
    expect(payload.players).toHaveLength(2);
    // eligiblePickerId is the creator (Alice), not Bob
    expect(payload.eligiblePickerId).toBeDefined();
    alice.disconnect();
    bob.disconnect();
  });

  test('creator also receives room_joined with their socket id as eligiblePickerId', async () => {
    const alice = await connectClient();
    alice.emit('create_room', { name: 'Alice' });
    const { code } = await waitFor(alice, 'room_created');

    const bob = await connectClient();
    const aliceReceivesRoomJoined = waitFor(alice, 'room_joined');
    bob.emit('join_room', { code, name: 'Bob' });

    const payload = await aliceReceivesRoomJoined;
    // Creator should receive room_joined so they can transition out of Lobby screen
    expect(payload.eligiblePickerId).toBe(alice.id);
    expect(payload.players).toHaveLength(2);
    alice.disconnect();
    bob.disconnect();
  });

  test('emits join_error for non-existent room', async () => {
    const alice = await connectClient();
    alice.emit('join_room', { code: 'XXXXXX', name: 'Alice' });
    const err = await waitFor(alice, 'join_error');
    expect(err.reason).toBe('Room not found');
    alice.disconnect();
  });
});

describe('pick_role — authorization', () => {
  test('non-eligible player cannot pick role', async () => {
    const alice = await connectClient();
    const bob = await connectClient();

    alice.emit('create_room', { name: 'Alice' });
    const { code } = await waitFor(alice, 'room_created');
    const bobJoined = waitFor(bob, 'room_joined');
    bob.emit('join_room', { code, name: 'Bob' });
    await bobJoined;

    // Bob is NOT the eligible picker (Alice/creator is)
    // Bob picks — should be silently ignored
    bob.emit('pick_role', { role: 'setter' });

    // Wait briefly — no roles_assigned should fire
    const result = await Promise.race([
      waitFor(alice, 'roles_assigned').then(() => 'assigned'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 300)),
    ]);
    expect(result).toBe('timeout');
    alice.disconnect();
    bob.disconnect();
  });
});

describe('full round — guesser wins', () => {
  test('complete happy path from room creation to game over', async () => {
    const alice = await connectClient();
    const bob = await connectClient();

    alice.emit('create_room', { name: 'Alice' });
    const { code } = await waitFor(alice, 'room_created');

    const bobJoined = waitFor(bob, 'room_joined');
    bob.emit('join_room', { code, name: 'Bob' });
    const joinPayload = await bobJoined;
    // Alice is eligible picker (she created the room)
    expect(joinPayload.eligiblePickerId).toBe(alice.id);

    // Alice picks setter
    alice.emit('pick_role', { role: 'setter' });
    const aliceRoles = waitFor(alice, 'roles_assigned');
    const bobRoles = waitFor(bob, 'roles_assigned');
    const roles = await aliceRoles;
    await bobRoles;
    expect(roles.players.find(p => p.name === 'Alice').role).toBe('setter');
    expect(roles.players.find(p => p.name === 'Bob').role).toBe('guesser');

    // Alice sets code
    alice.emit('set_code', { code: ['R','G','B','Y','O'] });
    await waitFor(bob, 'code_set');

    // Bob guesses correctly (guessIndex = 0 since no previous guesses)
    bob.emit('submit_guess', { guess: ['R','G','B','Y','O'], guessIndex: 0 });
    const result = await waitFor(bob, 'guess_result');
    expect(result.exactHits).toBe(5);

    const gameOver = await waitFor(bob, 'game_over');
    expect(gameOver.winner).toBe('guesser');
    expect(gameOver.secretCode).toEqual(['R','G','B','Y','O']);

    alice.disconnect();
    bob.disconnect();
  });
});

describe('duplicate submit_guess guard', () => {
  test('second submission with same guessIndex is rejected', async () => {
    const alice = await connectClient();
    const bob = await connectClient();

    alice.emit('create_room', { name: 'Alice' });
    const { code } = await waitFor(alice, 'room_created');
    const bobJoined = waitFor(bob, 'room_joined');
    bob.emit('join_room', { code, name: 'Bob' });
    await bobJoined;

    alice.emit('pick_role', { role: 'setter' });
    await waitFor(alice, 'roles_assigned');
    alice.emit('set_code', { code: ['R','G','B','Y','O'] });
    await waitFor(bob, 'code_set');

    // First guess — accepted (guessIndex=0 matches guesses.length=0)
    bob.emit('submit_guess', { guess: ['R','R','R','R','R'], guessIndex: 0 });
    await waitFor(bob, 'guess_result');

    // Duplicate — rejected (guessIndex=0 but guesses.length is now 1)
    bob.emit('submit_guess', { guess: ['G','G','G','G','G'], guessIndex: 0 });
    const duplicateResult = await Promise.race([
      waitFor(bob, 'guess_result').then(() => 'processed'),
      new Promise(resolve => setTimeout(() => resolve('rejected'), 300)),
    ]);
    expect(duplicateResult).toBe('rejected');

    alice.disconnect();
    bob.disconnect();
  });
});

describe('decline_rematch', () => {
  test('emits rematch_declined to both players when one declines', async () => {
    const alice = await connectClient();
    const bob = await connectClient();

    alice.emit('create_room', { name: 'Alice' });
    const { code } = await waitFor(alice, 'room_created');
    const bobJoined = waitFor(bob, 'room_joined');
    bob.emit('join_room', { code, name: 'Bob' });
    await bobJoined;

    const aliceDeclined = waitFor(alice, 'rematch_declined');
    const bobDeclined = waitFor(bob, 'rematch_declined');
    alice.emit('decline_rematch');

    await Promise.all([aliceDeclined, bobDeclined]);
    alice.disconnect();
    bob.disconnect();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx jest __tests__/socketHandlers.test.js
```
Expected: FAIL — `Cannot find module '../socketHandlers'`

- [ ] **Step 4: Implement socketHandlers.js**

```js
// server/socketHandlers.js
const {
  createRoom, getRoom, getRoomBySocket, joinRoom,
  removePlayer, setCode, addGuess, assignRoles,
  setRematchVote, resetForRematch,
} = require('./roomStore');
const { evaluateGuess, isWin, isValidCode } = require('./gameLogic');

function registerHandlers(io, socket) {
  socket.on('create_room', ({ name }) => {
    const { code, room } = createRoom(socket.id, name);
    socket.join(code);
    socket.emit('room_created', { code });
  });

  socket.on('join_room', ({ code, name }) => {
    const result = joinRoom(code, socket.id, name);
    if (result.error) {
      socket.emit('join_error', { reason: result.error });
      return;
    }
    socket.join(code);
    const room = result.room;
    io.to(code).emit('room_joined', {
      players: room.players.map(p => ({ id: p.id, name: p.name })),
      eligiblePickerId: room.eligiblePickerId, // tells clients who may pick roles
    });
  });

  socket.on('pick_role', ({ role }) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    // Only the designated player may pick roles this round
    if (room.eligiblePickerId !== socket.id) return;
    assignRoles(room.code, socket.id, role);
    const updated = getRoom(room.code);
    io.to(room.code).emit('roles_assigned', { players: updated.players });
  });

  socket.on('set_code', ({ code: secretCode }) => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.secretCode) return; // ignore if already set
    if (!isValidCode(secretCode)) return;
    setCode(room.code, secretCode);
    // Only notify the guesser — don't reveal the code to them, just signal "ready to guess"
    const guesser = getRoom(room.code).players.find(p => p.role === 'guesser');
    if (guesser) io.to(guesser.id).emit('code_set');
  });

  socket.on('submit_guess', ({ guess, guessIndex }) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const currentRoom = getRoom(room.code);
    if (currentRoom.status !== 'guessing') return;
    // Only the guesser may submit guesses
    const player = currentRoom.players.find(p => p.id === socket.id);
    if (!player || player.role !== 'guesser') return;
    if (!isValidCode(guess)) return;
    // Reject duplicate submissions — guessIndex must match current guess count
    // This prevents a double-fired event from being processed twice for the same turn
    if (guessIndex !== currentRoom.guesses.length) return;

    const { exactHits, colorHits } = evaluateGuess(currentRoom.secretCode, guess);
    const guessRecord = { colors: guess, exactHits, colorHits };
    addGuess(room.code, guessRecord);

    io.to(room.code).emit('guess_result', guessRecord);

    if (isWin(exactHits)) {
      currentRoom.status = 'finished';
      currentRoom.lastWinnerId = socket.id; // guesser wins
      io.to(room.code).emit('game_over', {
        winner: 'guesser',
        secretCode: currentRoom.secretCode,
      });
    } else if (currentRoom.guesses.length >= 10) {
      currentRoom.status = 'finished';
      const setter = currentRoom.players.find(p => p.role === 'setter');
      currentRoom.lastWinnerId = setter?.id; // setter wins
      io.to(room.code).emit('game_over', {
        winner: 'setter',
        secretCode: currentRoom.secretCode,
      });
    }
  });

  socket.on('play_again', () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const allReady = setRematchVote(room.code, socket.id, true);
    if (allReady) {
      const winnerId = room.lastWinnerId;
      resetForRematch(room.code, winnerId);
      const updated = getRoom(room.code);
      io.to(room.code).emit('rematch_ready', {
        players: updated.players,
        eligiblePickerId: winnerId, // winner picks role first
      });
    }
  });

  socket.on('decline_rematch', () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    // Notify both players — each client calls goHome() on receiving this
    io.to(room.code).emit('rematch_declined');
  });

  socket.on('disconnect', () => {
    const result = removePlayer(socket.id);
    if (result && !result.roomDeleted) {
      io.to(result.code).emit('opponent_disconnected');
    }
  });
}

module.exports = { registerHandlers };
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest __tests__/socketHandlers.test.js
```
Expected: PASS

- [ ] **Step 6: Update index.js to use handlers**

```js
// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { registerHandlers } = require('./socketHandlers');

const app = express();
app.use(cors());
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  registerHandlers(io, socket);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

- [ ] **Step 7: Run all server tests**

```bash
npx jest
```
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add server/
git commit -m "feat: implement socket event handlers and wire up server"
```

---

## Task 5: Client Project Scaffold

**Files:**
- Create: `client/` (Vite React project)

- [ ] **Step 1: Scaffold Vite React project**

```bash
npm create vite@latest client -- --template react
cd client
npm install
```

- [ ] **Step 2: Install Socket.io client**

```bash
npm install socket.io-client
```

- [ ] **Step 3: Install Vitest and React Testing Library**

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 4: Configure Vitest in vite.config.js**

```js
// client/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
  },
})
```

- [ ] **Step 5: Create test setup file**

```js
// client/src/test-setup.js
import '@testing-library/jest-dom';
```

- [ ] **Step 6: Add test script to client/package.json**

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 7: Delete Vite boilerplate**

Delete: `client/src/App.css`, `client/src/assets/react.svg`, `client/public/vite.svg`
Clear contents of `client/src/index.css` (keep the file)

- [ ] **Step 8: Add .env.production to .gitignore**

Add to `client/.gitignore`:
```
.env.production
.env.local
```

Note: Production server URL will be set via Vercel's environment variable dashboard at deploy time, not in a committed file.

- [ ] **Step 9: Commit**

```bash
git add client/
git commit -m "feat: scaffold React + Vite client with Vitest"
```

---

## Task 6: Socket Singleton + App State Machine

**Files:**
- Create: `client/src/socket.js`
- Create: `client/src/App.jsx`
- Create: `client/src/main.jsx`
- Create: `client/src/screens/` (stub files)

The App component is a screen router — it listens to socket events and sets the current screen. `eligiblePickerId` from server determines which player sees the role-picker UI vs. waiting UI.

- [ ] **Step 1: Create socket singleton**

```js
// client/src/socket.js
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const socket = io(SERVER_URL, { autoConnect: false });
```

- [ ] **Step 2: Write App test**

```jsx
// client/src/__tests__/App.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock socket so tests don't need a real server
vi.mock('../socket', () => ({
  socket: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    id: 'test-socket-id',
  },
}));

import App from '../App';

describe('App', () => {
  it('renders HomeScreen by default', () => {
    render(<App />);
    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd client && npx vitest run src/__tests__/App.test.jsx
```
Expected: FAIL

- [ ] **Step 4: Create stub screen files so App.jsx compiles**

```jsx
// client/src/screens/HomeScreen.jsx
export default function HomeScreen() { return <div data-testid="home-screen">Home</div>; }
```

```jsx
// client/src/screens/LobbyScreen.jsx
export default function LobbyScreen() { return <div data-testid="lobby-screen">Lobby</div>; }
```

```jsx
// client/src/screens/RoleScreen.jsx
export default function RoleScreen() { return <div data-testid="role-screen">Role</div>; }
```

```jsx
// client/src/screens/SetCodeScreen.jsx
export default function SetCodeScreen() { return <div data-testid="set-code-screen">SetCode</div>; }
```

```jsx
// client/src/screens/GameScreen.jsx
export default function GameScreen() { return <div data-testid="game-screen">Game</div>; }
```

```jsx
// client/src/screens/ResultScreen.jsx
export default function ResultScreen() { return <div data-testid="result-screen">Result</div>; }
```

```jsx
// client/src/screens/DisconnectScreen.jsx
export default function DisconnectScreen() { return <div data-testid="disconnect-screen">Disconnect</div>; }
```

- [ ] **Step 5: Implement App.jsx**

```jsx
// client/src/App.jsx
import { useState, useEffect } from 'react';
import { socket } from './socket';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import RoleScreen from './screens/RoleScreen';
import SetCodeScreen from './screens/SetCodeScreen';
import GameScreen from './screens/GameScreen';
import ResultScreen from './screens/ResultScreen';
import DisconnectScreen from './screens/DisconnectScreen';

const SCREENS = {
  HOME: 'HOME', LOBBY: 'LOBBY', ROLE: 'ROLE',
  SET_CODE: 'SET_CODE', GAME: 'GAME', RESULT: 'RESULT', DISCONNECT: 'DISCONNECT',
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [myRole, setMyRole] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [canPickRole, setCanPickRole] = useState(false);

  useEffect(() => {
    socket.connect();

    socket.on('room_created', ({ code }) => {
      setRoomCode(code);
      setScreen(SCREENS.LOBBY);
    });

    socket.on('room_joined', ({ players, eligiblePickerId }) => {
      setPlayers(players);
      // Only the designated player (creator on round 1, winner on rematch) sees role buttons
      setCanPickRole(eligiblePickerId === socket.id);
      setScreen(SCREENS.ROLE);
    });

    socket.on('join_error', ({ reason }) => {
      alert(`Could not join room: ${reason}`);
    });

    socket.on('roles_assigned', ({ players }) => {
      setPlayers(players);
      const me = players.find(p => p.id === socket.id);
      setMyRole(me?.role);
      setScreen(me?.role === 'setter' ? SCREENS.SET_CODE : SCREENS.GAME);
    });

    socket.on('guess_result', (guessRecord) => {
      setGuesses(prev => [...prev, guessRecord]);
    });

    socket.on('game_over', ({ winner, secretCode }) => {
      setGameResult({ winner, secretCode });
      setScreen(SCREENS.RESULT);
    });

    socket.on('rematch_ready', ({ eligiblePickerId }) => {
      setGuesses([]);
      setGameResult(null);
      setMyRole(null);
      setCanPickRole(eligiblePickerId === socket.id);
      setScreen(SCREENS.ROLE);
    });

    socket.on('rematch_declined', () => {
      // Triggered for the OTHER player when one player clicks "No Thanks"
      goHome();
    });

    socket.on('opponent_disconnected', () => {
      setScreen(SCREENS.DISCONNECT);
    });

    return () => {
      [
        'room_created', 'room_joined', 'join_error', 'roles_assigned',
        'guess_result', 'game_over', 'rematch_ready', 'rematch_declined',
        'opponent_disconnected',
      ].forEach(e => socket.off(e));
      socket.disconnect();
    };
  }, []);

  function goHome() {
    setScreen(SCREENS.HOME);
    setRoomCode('');
    setPlayers([]);
    setMyRole(null);
    setGuesses([]);
    setGameResult(null);
    setCanPickRole(false);
  }

  const screenProps = { roomCode, players, myRole, guesses, gameResult, goHome };

  return (
    <div className="app">
      {screen === SCREENS.HOME && <HomeScreen />}
      {screen === SCREENS.LOBBY && <LobbyScreen {...screenProps} />}
      {screen === SCREENS.ROLE && <RoleScreen {...screenProps} canPickRole={canPickRole} />}
      {screen === SCREENS.SET_CODE && <SetCodeScreen />}
      {screen === SCREENS.GAME && <GameScreen guesses={guesses} />}
      {screen === SCREENS.RESULT && <ResultScreen {...screenProps} />}
      {screen === SCREENS.DISCONNECT && <DisconnectScreen goHome={goHome} />}
    </div>
  );
}
```

- [ ] **Step 6: Update main.jsx**

```jsx
// client/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 7: Run test to verify it passes**

```bash
npx vitest run src/__tests__/App.test.jsx
```
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add client/src/
git commit -m "feat: add socket singleton and App screen state machine"
```

---

## Task 7: HomeScreen

**Files:**
- Modify: `client/src/screens/HomeScreen.jsx`
- Create: `client/src/__tests__/HomeScreen.test.jsx`

- [ ] **Step 1: Write failing tests**

```jsx
// client/src/__tests__/HomeScreen.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../socket', () => ({
  socket: { emit: vi.fn(), connect: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

import HomeScreen from '../screens/HomeScreen';
import { socket } from '../socket';

beforeEach(() => vi.clearAllMocks());

describe('HomeScreen', () => {
  it('renders name input and two buttons', () => {
    render(<HomeScreen />);
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
    expect(screen.getByText(/create room/i)).toBeInTheDocument();
    expect(screen.getByText(/join room/i)).toBeInTheDocument();
  });

  it('emits create_room with name on Create Room click', () => {
    render(<HomeScreen />);
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByText(/create room/i));
    expect(socket.emit).toHaveBeenCalledWith('create_room', { name: 'Alice' });
  });

  it('shows join input after clicking Join Room', () => {
    render(<HomeScreen />);
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: 'Bob' } });
    fireEvent.click(screen.getByText(/join room/i));
    expect(screen.getByPlaceholderText(/room code/i)).toBeInTheDocument();
  });

  it('emits join_room when code submitted', () => {
    render(<HomeScreen />);
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: 'Bob' } });
    fireEvent.click(screen.getByText(/join room/i));
    fireEvent.change(screen.getByPlaceholderText(/room code/i), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByText(/^join$/i));
    expect(socket.emit).toHaveBeenCalledWith('join_room', { code: 'ABC123', name: 'Bob' });
  });

  it('does not emit if name is empty', () => {
    render(<HomeScreen />);
    fireEvent.click(screen.getByText(/create room/i));
    expect(socket.emit).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/HomeScreen.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Implement HomeScreen**

```jsx
// client/src/screens/HomeScreen.jsx
import { useState } from 'react';
import { socket } from '../socket';

export default function HomeScreen() {
  const [name, setName] = useState('');
  const [joiningMode, setJoiningMode] = useState(false);
  const [roomCode, setRoomCode] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    socket.emit('create_room', { name: name.trim() });
  };

  const handleJoinClick = () => {
    if (!name.trim()) return;
    setJoiningMode(true);
  };

  const handleJoin = () => {
    socket.emit('join_room', { code: roomCode.toUpperCase(), name: name.trim() });
  };

  return (
    <div data-testid="home-screen">
      <h1>Codebreaker</h1>
      <input
        placeholder="Your name"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      {!joiningMode ? (
        <div>
          <button onClick={handleCreate}>Create Room</button>
          <button onClick={handleJoinClick}>Join Room</button>
        </div>
      ) : (
        <div>
          <input
            placeholder="Room code"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button onClick={handleJoin}>Join</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/HomeScreen.test.jsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/screens/HomeScreen.jsx client/src/__tests__/HomeScreen.test.jsx
git commit -m "feat: implement HomeScreen — create/join room"
```

---

## Task 8: LobbyScreen + RoleScreen

**Files:**
- Modify: `client/src/screens/LobbyScreen.jsx`
- Modify: `client/src/screens/RoleScreen.jsx`
- Create: `client/src/__tests__/LobbyScreen.test.jsx`
- Create: `client/src/__tests__/RoleScreen.test.jsx`

- [ ] **Step 1: Write failing tests for LobbyScreen**

```jsx
// client/src/__tests__/LobbyScreen.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LobbyScreen from '../screens/LobbyScreen';

describe('LobbyScreen', () => {
  it('displays the room code', () => {
    render(<LobbyScreen roomCode="ABC123" />);
    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });

  it('shows waiting message', () => {
    render(<LobbyScreen roomCode="ABC123" />);
    expect(screen.getByText(/waiting/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write failing tests for RoleScreen**

```jsx
// client/src/__tests__/RoleScreen.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../socket', () => ({
  socket: { emit: vi.fn() },
}));

import RoleScreen from '../screens/RoleScreen';
import { socket } from '../socket';

describe('RoleScreen', () => {
  it('shows role buttons when canPickRole is true', () => {
    render(<RoleScreen canPickRole={true} players={[]} />);
    expect(screen.getByText(/code setter/i)).toBeInTheDocument();
    expect(screen.getByText(/guesser/i)).toBeInTheDocument();
  });

  it('emits pick_role when a role is selected', () => {
    render(<RoleScreen canPickRole={true} players={[]} />);
    fireEvent.click(screen.getByText(/code setter/i));
    expect(socket.emit).toHaveBeenCalledWith('pick_role', { role: 'setter' });
  });

  it('shows waiting message when canPickRole is false', () => {
    render(<RoleScreen canPickRole={false} players={[]} />);
    expect(screen.getByText(/waiting/i)).toBeInTheDocument();
    expect(screen.queryByText(/code setter/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/LobbyScreen.test.jsx src/__tests__/RoleScreen.test.jsx
```
Expected: FAIL

- [ ] **Step 4: Implement LobbyScreen**

```jsx
// client/src/screens/LobbyScreen.jsx
export default function LobbyScreen({ roomCode }) {
  return (
    <div data-testid="lobby-screen">
      <h2>Waiting for opponent...</h2>
      <p>Share this room code:</p>
      <div className="room-code">{roomCode}</div>
    </div>
  );
}
```

- [ ] **Step 5: Implement RoleScreen**

```jsx
// client/src/screens/RoleScreen.jsx
import { socket } from '../socket';

export default function RoleScreen({ canPickRole }) {
  const handlePick = (role) => socket.emit('pick_role', { role });

  if (!canPickRole) {
    return (
      <div data-testid="role-screen">
        <p>Waiting for opponent to pick role...</p>
      </div>
    );
  }

  return (
    <div data-testid="role-screen">
      <h2>Pick your role</h2>
      <button onClick={() => handlePick('setter')}>Code Setter</button>
      <button onClick={() => handlePick('guesser')}>Guesser</button>
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/LobbyScreen.test.jsx src/__tests__/RoleScreen.test.jsx
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add client/src/screens/LobbyScreen.jsx client/src/screens/RoleScreen.jsx client/src/__tests__/
git commit -m "feat: implement LobbyScreen and RoleScreen"
```

---

## Task 9: ColorPicker + CodeSlots Components

**Files:**
- Create: `client/src/components/ColorPicker.jsx`
- Create: `client/src/components/CodeSlots.jsx`
- Create: `client/src/__tests__/ColorPicker.test.jsx`
- Create: `client/src/__tests__/CodeSlots.test.jsx`

Colors: `R=red, G=green, B=blue, Y=yellow, O=orange, P=purple`

- [ ] **Step 1: Write failing tests for ColorPicker**

```jsx
// client/src/__tests__/ColorPicker.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ColorPicker from '../components/ColorPicker';

describe('ColorPicker', () => {
  it('renders 6 color swatches', () => {
    render(<ColorPicker onSelect={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(6);
  });

  it('calls onSelect with color code when swatch clicked', () => {
    const onSelect = vi.fn();
    render(<ColorPicker onSelect={onSelect} />);
    // First button is 'R' (red)
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onSelect).toHaveBeenCalledWith('R');
  });

  it('buttons are disabled when disabled prop is true', () => {
    render(<ColorPicker onSelect={vi.fn()} disabled={true} />);
    screen.getAllByRole('button').forEach(btn => expect(btn).toBeDisabled());
  });
});
```

- [ ] **Step 2: Write failing tests for CodeSlots**

```jsx
// client/src/__tests__/CodeSlots.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CodeSlots from '../components/CodeSlots';

describe('CodeSlots', () => {
  it('renders 5 slots', () => {
    render(<CodeSlots slots={[null, null, null, null, null]} />);
    expect(screen.getAllByTestId('slot')).toHaveLength(5);
  });

  it('shows colors in filled slots via data-color attribute', () => {
    render(<CodeSlots slots={['R', null, 'B', null, null]} />);
    const slots = screen.getAllByTestId('slot');
    expect(slots[0]).toHaveAttribute('data-color', 'R');
    expect(slots[2]).toHaveAttribute('data-color', 'B');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/ColorPicker.test.jsx src/__tests__/CodeSlots.test.jsx
```
Expected: FAIL

- [ ] **Step 4: Implement ColorPicker**

```jsx
// client/src/components/ColorPicker.jsx
const COLORS = ['R', 'G', 'B', 'Y', 'O', 'P'];
const COLOR_MAP = { R: 'red', G: 'green', B: 'blue', Y: 'yellow', O: 'orange', P: 'purple' };

export default function ColorPicker({ onSelect, disabled }) {
  return (
    <div className="color-picker">
      {COLORS.map(color => (
        <button
          key={color}
          disabled={disabled}
          onClick={() => onSelect(color)}
          style={{ backgroundColor: COLOR_MAP[color] }}
          aria-label={COLOR_MAP[color]}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Implement CodeSlots**

```jsx
// client/src/components/CodeSlots.jsx
const COLOR_MAP = { R: 'red', G: 'green', B: 'blue', Y: 'yellow', O: 'orange', P: 'purple' };

export default function CodeSlots({ slots, onSlotClick }) {
  return (
    <div className="code-slots">
      {slots.map((color, i) => (
        <div
          key={i}
          data-testid="slot"
          data-color={color || ''}
          onClick={() => onSlotClick?.(i)}
          style={{ backgroundColor: color ? COLOR_MAP[color] : '#ccc' }}
          className="slot"
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/ColorPicker.test.jsx src/__tests__/CodeSlots.test.jsx
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ client/src/__tests__/ColorPicker.test.jsx client/src/__tests__/CodeSlots.test.jsx
git commit -m "feat: add ColorPicker and CodeSlots components"
```

---

## Task 10: SetCodeScreen

**Files:**
- Modify: `client/src/screens/SetCodeScreen.jsx`
- Create: `client/src/__tests__/SetCodeScreen.test.jsx`

- [ ] **Step 1: Write failing tests**

```jsx
// client/src/__tests__/SetCodeScreen.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../socket', () => ({
  socket: { emit: vi.fn() },
}));

import SetCodeScreen from '../screens/SetCodeScreen';
import { socket } from '../socket';

describe('SetCodeScreen', () => {
  it('renders 5 slots', () => {
    render(<SetCodeScreen />);
    expect(screen.getAllByTestId('slot')).toHaveLength(5);
  });

  it('submit button is disabled until all 5 slots are filled', () => {
    render(<SetCodeScreen />);
    expect(screen.getByText(/set code/i)).toBeDisabled();
  });

  it('emits set_code when all slots filled and submitted', () => {
    render(<SetCodeScreen />);
    // Each aria-label button is a color swatch; click first swatch 5 times to fill all slots
    const swatches = screen.getAllByRole('button').filter(b => b.getAttribute('aria-label'));
    for (let i = 0; i < 5; i++) {
      fireEvent.click(swatches[0]);
    }
    fireEvent.click(screen.getByText(/set code/i));
    expect(socket.emit).toHaveBeenCalledWith('set_code', { code: ['R','R','R','R','R'] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/SetCodeScreen.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Implement SetCodeScreen**

```jsx
// client/src/screens/SetCodeScreen.jsx
import { useState } from 'react';
import { socket } from '../socket';
import ColorPicker from '../components/ColorPicker';
import CodeSlots from '../components/CodeSlots';

export default function SetCodeScreen() {
  const [slots, setSlots] = useState([null, null, null, null, null]);
  const [submitted, setSubmitted] = useState(false);

  const handleColorSelect = (color) => {
    setSlots(prev => {
      const next = [...prev];
      const emptyIdx = next.indexOf(null);
      if (emptyIdx !== -1) next[emptyIdx] = color;
      return next;
    });
  };

  const handleSlotClick = (i) => {
    setSlots(prev => {
      const next = [...prev];
      next[i] = null;
      return next;
    });
  };

  const isReady = slots.every(s => s !== null);

  const handleSubmit = () => {
    socket.emit('set_code', { code: slots });
    setSubmitted(true);
  };

  if (submitted) {
    return <div data-testid="set-code-screen"><p>Code set! Waiting for guesser...</p></div>;
  }

  return (
    <div data-testid="set-code-screen">
      <h2>Set the secret code</h2>
      <CodeSlots slots={slots} onSlotClick={handleSlotClick} />
      <ColorPicker onSelect={handleColorSelect} disabled={isReady} />
      <button onClick={handleSubmit} disabled={!isReady}>Set Code</button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/SetCodeScreen.test.jsx
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add client/src/screens/SetCodeScreen.jsx client/src/__tests__/SetCodeScreen.test.jsx
git commit -m "feat: implement SetCodeScreen"
```

---

## Task 11: GuessRow + GameScreen

**Files:**
- Create: `client/src/components/GuessRow.jsx`
- Modify: `client/src/screens/GameScreen.jsx`
- Create: `client/src/__tests__/GuessRow.test.jsx`
- Create: `client/src/__tests__/GameScreen.test.jsx`

Note on row counts: with 0 guesses, the board has 1 active row (testid `active-guess-row`) + 9 empty rows (testid `guess-row`) = 9 `guess-row` elements. The active row has a distinct testid.

- [ ] **Step 1: Write failing tests for GuessRow**

```jsx
// client/src/__tests__/GuessRow.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GuessRow from '../components/GuessRow';

describe('GuessRow', () => {
  it('renders 5 color slots', () => {
    render(<GuessRow colors={['R','G','B','Y','O']} exactHits={2} colorHits={1} />);
    expect(screen.getAllByTestId('slot')).toHaveLength(5);
  });

  it('shows exact and color hit counts', () => {
    render(<GuessRow colors={['R','G','B','Y','O']} exactHits={3} colorHits={1} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write failing tests for GameScreen**

```jsx
// client/src/__tests__/GameScreen.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../socket', () => ({
  socket: { emit: vi.fn() },
}));

import GameScreen from '../screens/GameScreen';

describe('GameScreen', () => {
  it('renders 9 empty guess rows and 1 active guess row when no guesses yet', () => {
    render(<GameScreen guesses={[]} />);
    // Active row has testid="active-guess-row"; empty rows have testid="guess-row"
    expect(screen.getAllByTestId('guess-row')).toHaveLength(9);
    expect(screen.getByTestId('active-guess-row')).toBeInTheDocument();
  });

  it('renders completed GuessRow for each past guess', () => {
    const guesses = [{ colors: ['R','G','B','Y','O'], exactHits: 1, colorHits: 2 }];
    render(<GameScreen guesses={guesses} />);
    // 1 completed GuessRow (has slots) + 8 empty rows = 9 guess-row elements
    expect(screen.getAllByTestId('guess-row')).toHaveLength(9);
    expect(screen.getAllByTestId('slot')[0]).toHaveAttribute('data-color', 'R');
  });

  it('renders active guess row with submit button', () => {
    render(<GameScreen guesses={[]} />);
    expect(screen.getByTestId('active-guess-row')).toBeInTheDocument();
    expect(screen.getByText(/submit guess/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/GuessRow.test.jsx src/__tests__/GameScreen.test.jsx
```
Expected: FAIL

- [ ] **Step 4: Implement GuessRow**

```jsx
// client/src/components/GuessRow.jsx
import CodeSlots from './CodeSlots';

export default function GuessRow({ colors, exactHits, colorHits }) {
  return (
    <div data-testid="guess-row" className="guess-row">
      <CodeSlots slots={colors} />
      <div className="hit-indicators">
        <span title="Exact hits">{exactHits}</span>
        <span title="Color hits">{colorHits}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement GameScreen**

```jsx
// client/src/screens/GameScreen.jsx
import { useState } from 'react';
import { socket } from '../socket';
import GuessRow from '../components/GuessRow';
import ColorPicker from '../components/ColorPicker';
import CodeSlots from '../components/CodeSlots';

const MAX_GUESSES = 10;

export default function GameScreen({ guesses }) {
  const [currentSlots, setCurrentSlots] = useState([null, null, null, null, null]);

  const handleColorSelect = (color) => {
    setCurrentSlots(prev => {
      const next = [...prev];
      const emptyIdx = next.indexOf(null);
      if (emptyIdx !== -1) next[emptyIdx] = color;
      return next;
    });
  };

  const handleSlotClick = (i) => {
    setCurrentSlots(prev => {
      const next = [...prev];
      next[i] = null;
      return next;
    });
  };

  const handleSubmit = () => {
    // guessIndex tells the server which turn this is; prevents duplicate processing
    socket.emit('submit_guess', { guess: currentSlots, guessIndex: guesses.length });
    setCurrentSlots([null, null, null, null, null]);
  };

  const isReady = currentSlots.every(s => s !== null);
  const completedCount = guesses.length;
  // Layout: completedCount GuessRows + 1 active-guess-row + (MAX_GUESSES - completedCount - 1) empty rows
  const emptyRowCount = MAX_GUESSES - completedCount - 1;

  return (
    <div data-testid="game-screen">
      <h2>Guess the code ({MAX_GUESSES - completedCount} attempts left)</h2>

      {guesses.map((g, i) => (
        <GuessRow key={i} colors={g.colors} exactHits={g.exactHits} colorHits={g.colorHits} />
      ))}

      {completedCount < MAX_GUESSES && (
        <div data-testid="active-guess-row">
          <CodeSlots slots={currentSlots} onSlotClick={handleSlotClick} />
          <ColorPicker onSelect={handleColorSelect} disabled={isReady} />
          <button onClick={handleSubmit} disabled={!isReady}>Submit Guess</button>
        </div>
      )}

      {Array.from({ length: Math.max(0, emptyRowCount) }, (_, i) => (
        <div key={`empty-${i}`} data-testid="guess-row" className="guess-row empty" />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/GuessRow.test.jsx src/__tests__/GameScreen.test.jsx
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add client/src/components/GuessRow.jsx client/src/screens/GameScreen.jsx client/src/__tests__/
git commit -m "feat: implement GuessRow and GameScreen"
```

---

## Task 12: ResultScreen + DisconnectScreen

**Files:**
- Modify: `client/src/screens/ResultScreen.jsx`
- Modify: `client/src/screens/DisconnectScreen.jsx`
- Create: `client/src/__tests__/ResultScreen.test.jsx`

When a player clicks "No Thanks", the client emits `decline_rematch` (so the server can notify the other player) and immediately calls `goHome()` locally. The other player receives `rematch_declined` from the server via App.jsx and is also sent home.

- [ ] **Step 1: Write failing tests**

```jsx
// client/src/__tests__/ResultScreen.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../socket', () => ({
  socket: { emit: vi.fn() },
}));

import ResultScreen from '../screens/ResultScreen';
import { socket } from '../socket';

const defaultProps = {
  gameResult: { winner: 'guesser', secretCode: ['R','G','B','Y','O'] },
  myRole: 'guesser',
  goHome: vi.fn(),
};

describe('ResultScreen', () => {
  it('shows win message when guesser wins and I am guesser', () => {
    render(<ResultScreen {...defaultProps} />);
    expect(screen.getByText(/you win/i)).toBeInTheDocument();
  });

  it('shows lose message when setter wins and I am guesser', () => {
    render(<ResultScreen
      {...defaultProps}
      gameResult={{ winner: 'setter', secretCode: ['R','G','B','Y','O'] }}
    />);
    expect(screen.getByText(/you lose/i)).toBeInTheDocument();
  });

  it('reveals the secret code (5 slots)', () => {
    render(<ResultScreen {...defaultProps} />);
    expect(screen.getAllByTestId('slot')).toHaveLength(5);
  });

  it('emits play_again when Play Again clicked', () => {
    render(<ResultScreen {...defaultProps} />);
    fireEvent.click(screen.getByText(/play again/i));
    expect(socket.emit).toHaveBeenCalledWith('play_again');
  });

  it('emits decline_rematch and calls goHome when No Thanks clicked', () => {
    const goHome = vi.fn();
    render(<ResultScreen {...defaultProps} goHome={goHome} />);
    fireEvent.click(screen.getByText(/no thanks/i));
    expect(socket.emit).toHaveBeenCalledWith('decline_rematch');
    expect(goHome).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/ResultScreen.test.jsx
```
Expected: FAIL

- [ ] **Step 3: Implement ResultScreen**

```jsx
// client/src/screens/ResultScreen.jsx
import { socket } from '../socket';
import CodeSlots from '../components/CodeSlots';

export default function ResultScreen({ gameResult, myRole, goHome }) {
  const { winner, secretCode } = gameResult;
  const iWon = (myRole === 'guesser' && winner === 'guesser') ||
               (myRole === 'setter' && winner === 'setter');

  const handleDecline = () => {
    socket.emit('decline_rematch'); // notifies other player via server
    goHome();                       // navigate locally without waiting for round-trip
  };

  return (
    <div data-testid="result-screen">
      <h2>{iWon ? 'You Win!' : 'You Lose!'}</h2>
      <p>The secret code was:</p>
      <CodeSlots slots={secretCode} />
      <button onClick={() => socket.emit('play_again')}>Play Again</button>
      <button onClick={handleDecline}>No Thanks</button>
    </div>
  );
}
```

- [ ] **Step 4: Implement DisconnectScreen**

```jsx
// client/src/screens/DisconnectScreen.jsx
export default function DisconnectScreen({ goHome }) {
  return (
    <div data-testid="disconnect-screen">
      <h2>Opponent disconnected</h2>
      <p>Your opponent has left the game.</p>
      <button onClick={goHome}>Return Home</button>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/ResultScreen.test.jsx
```
Expected: PASS

- [ ] **Step 6: Run all client tests**

```bash
npx vitest run
```
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add client/src/screens/ResultScreen.jsx client/src/screens/DisconnectScreen.jsx client/src/__tests__/ResultScreen.test.jsx
git commit -m "feat: implement ResultScreen and DisconnectScreen"
```

---

## Task 13: Deployment Configuration + Smoke Test

**Files:**
- Create: `client/vercel.json`

- [ ] **Step 1: Create Vercel SPA routing config**

```json
// client/vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Configure production environment variables (do NOT commit)**

In **Vercel dashboard** → Project Settings → Environment Variables:
- `VITE_SERVER_URL` = `https://your-render-app.onrender.com`

In **Render dashboard** → Environment:
- `CLIENT_ORIGIN` = `https://your-vercel-app.vercel.app`
- `PORT` = `3001` (Render sets this automatically)

Note: `client/.env.production` is in `.gitignore` (added in Task 5). Set all production URLs via the hosting dashboards, not committed files.

- [ ] **Step 3: Run final test suite**

```bash
cd server && npx jest
cd ../client && npx vitest run
```
Expected: All tests pass

- [ ] **Step 4: Local smoke test — open two browser tabs**

Run server: `cd server && node index.js`
Run client: `cd client && npm run dev`
Open two browser tabs to `http://localhost:5173`

Manual flow to verify:
1. Tab 1: Enter "Alice", click Create Room — copy the room code, see Lobby screen
2. Tab 2: Enter "Bob", click Join Room, enter code, click Join
3. Both tabs show Role screen — Alice sees role buttons (she's eligible), Bob sees waiting message
4. Alice clicks "Code Setter" — both tabs transition: Alice to SetCode, Bob to Game
5. Alice fills 5 color slots, clicks Set Code — she sees "Waiting for guesser..."
6. Bob fills active guess row with wrong colors, clicks Submit Guess
7. Both tabs see the guess row update with exact/color hit counts
8. Bob enters the correct 5 colors — both tabs see Result screen
9. Both click Play Again — Role screen appears; Bob is eligible this time (he won)
10. Bob picks a role — game restarts with reversed eligibility

- [ ] **Step 5: Final commit**

```bash
git add client/vercel.json
git commit -m "feat: add Vercel SPA routing config for deployment"
```

---

## Summary

| Task | Focus | Tests |
|---|---|---|
| 1 | Server scaffold | None |
| 2 | Game logic (pure functions) | 6 unit tests |
| 3 | Room store + eligiblePickerId tracking | 9 unit tests |
| 4 | Socket handlers (integration) with auth + decline_rematch | 6 integration tests |
| 5 | Client scaffold | None |
| 6 | App + socket singleton + eligiblePickerId routing | 1 test |
| 7 | HomeScreen | 5 tests |
| 8 | LobbyScreen + RoleScreen | 5 tests |
| 9 | ColorPicker + CodeSlots | 4 tests |
| 10 | SetCodeScreen | 3 tests |
| 11 | GuessRow + GameScreen | 5 tests |
| 12 | ResultScreen + DisconnectScreen + decline_rematch | 5 tests |
| 13 | Deployment config + smoke test | Manual |
