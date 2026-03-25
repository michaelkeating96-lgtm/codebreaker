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
