export default function DisconnectScreen({ goHome }) {
  return (
    <div data-testid="disconnect-screen">
      <h2>Opponent disconnected</h2>
      <p>Your opponent has left the game.</p>
      <button onClick={goHome}>Return Home</button>
    </div>
  );
}
