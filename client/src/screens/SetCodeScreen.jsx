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
