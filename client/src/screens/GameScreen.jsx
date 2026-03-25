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
