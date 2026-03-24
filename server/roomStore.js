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
  room.lastWinnerId = winnerId;
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
