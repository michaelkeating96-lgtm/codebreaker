const COLOR_MAP = { R: 'red', G: 'green', B: 'blue', Y: 'yellow', O: 'orange', P: 'purple' };

export default function CodeSlots({ slots, onSlotClick }) {
  return (
    <div className="code-slots">
      {slots.map((color, i) => (
        <div
          key={i}
          data-testid="slot"
          data-color={color || ''}
          onClick={() => onSlotClick?.(i)}
          style={{ backgroundColor: color ? COLOR_MAP[color] : '#ccc' }}
          className="slot"
        />
      ))}
    </div>
  );
}
