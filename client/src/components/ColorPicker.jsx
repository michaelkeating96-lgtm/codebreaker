const COLORS = ['R', 'G', 'B', 'Y', 'O', 'P'];
const COLOR_MAP = { R: 'red', G: 'green', B: 'blue', Y: 'yellow', O: 'orange', P: 'purple' };

export default function ColorPicker({ onSelect, disabled }) {
  return (
    <div className="color-picker">
      {COLORS.map(color => (
        <button
          key={color}
          disabled={disabled}
          onClick={() => onSelect(color)}
          style={{ backgroundColor: COLOR_MAP[color] }}
          aria-label={COLOR_MAP[color]}
        />
      ))}
    </div>
  );
}
