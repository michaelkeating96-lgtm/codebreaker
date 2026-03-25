export default function LobbyScreen({ roomCode }) {
  return (
    <div data-testid="lobby-screen">
      <h2>Waiting for opponent...</h2>
      <p>Share this room code:</p>
      <div className="room-code">{roomCode}</div>
    </div>
  );
}
