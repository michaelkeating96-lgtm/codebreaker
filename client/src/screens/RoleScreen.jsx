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
