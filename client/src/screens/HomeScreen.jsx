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
