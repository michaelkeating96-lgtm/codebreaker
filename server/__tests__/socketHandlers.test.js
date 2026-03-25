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

describe('set_code — authorization', () => {
  test('guesser cannot set the code', async () => {
    const alice = await connectClient();
    const bob = await connectClient();

    alice.emit('create_room', { name: 'Alice' });
    const { code } = await waitFor(alice, 'room_created');
    const bobJoined = waitFor(bob, 'room_joined');
    bob.emit('join_room', { code, name: 'Bob' });
    await bobJoined;

    // Alice picks setter, making Bob the guesser
    alice.emit('pick_role', { role: 'setter' });
    await waitFor(alice, 'roles_assigned');

    // Bob (the guesser) tries to set the code — should be silently ignored
    bob.emit('set_code', { code: ['R','G','B','Y','O'] });

    const result = await Promise.race([
      waitFor(bob, 'code_set').then(() => 'code_set'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 300)),
    ]);
    expect(result).toBe('timeout');

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
