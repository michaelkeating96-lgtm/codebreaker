import CodeSlots from './CodeSlots';

export default function GuessRow({ colors, exactHits, colorHits }) {
  return (
    <div data-testid="guess-row" className="guess-row">
      <CodeSlots slots={colors} />
      <div className="hit-indicators">
        <span title="Exact hits">{exactHits}</span>
        <span title="Color hits">{colorHits}</span>
      </div>
    </div>
  );
}
