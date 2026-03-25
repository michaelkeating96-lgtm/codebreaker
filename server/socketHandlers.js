// server/socketHandlers.js
const {
  createRoom, getRoom, getRoomBySocket, joinRoom,
  removePlayer, setCode, addGuess, assignRoles,
  setRematchVote, resetForRematch,
} = require('./roomStore');
const { evaluateGuess, isWin, isValidCode } = require('./gameLogic');

function registerHandlers(io, socket) {
  socket.on('create_room', ({ name }) => {
    if (!name || typeof name !== 'string' || !name.trim()) return;
    const safeName = name.trim().slice(0, 30);
    const { code } = createRoom(socket.id, safeName);
    socket.join(code);
    socket.emit('room_created', { code });
  });

  socket.on('join_room', ({ code, name }) => {
    if (!name || typeof name !== 'string' || !name.trim()) return;
    if (!code || typeof code !== 'string') return;
    const safeName = name.trim().slice(0, 30);
    const safeCode = code.trim().toUpperCase().slice(0, 6);
    const result = joinRoom(safeCode, socket.id, safeName);
    if (result.error) {
      socket.emit('join_error', { reason: result.error });
      return;
    }
    socket.join(safeCode);
    const room = result.room;
    io.to(safeCode).emit('room_joined', {
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
    if (!room || room.status !== 'setting') return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.role !== 'setter') return; // only setter may set the code
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

    // Defer game_over by one event-loop tick so clients receive guess_result first,
    // process it, and attach their game_over listener before the event arrives.
    if (isWin(exactHits)) {
      currentRoom.status = 'finished';
      currentRoom.lastWinnerId = socket.id; // guesser wins
      const roomCode = room.code;
      const secretCode = currentRoom.secretCode;
      setTimeout(() => {
        io.to(roomCode).emit('game_over', {
          winner: 'guesser',
          secretCode,
        });
      }, 50);
    } else if (currentRoom.guesses.length >= 10) {
      currentRoom.status = 'finished';
      const setter = currentRoom.players.find(p => p.role === 'setter');
      currentRoom.lastWinnerId = setter?.id; // setter wins
      const roomCode = room.code;
      const secretCode = currentRoom.secretCode;
      setTimeout(() => {
        io.to(roomCode).emit('game_over', {
          winner: 'setter',
          secretCode,
        });
      }, 50);
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
    if (!room || room.status !== 'finished') return;
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
