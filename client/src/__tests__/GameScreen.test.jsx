import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../socket', () => ({
  socket: { emit: vi.fn() },
}));

import GameScreen from '../screens/GameScreen';

describe('GameScreen', () => {
  it('renders 9 empty guess rows and 1 active guess row when no guesses yet', () => {
    render(<GameScreen guesses={[]} />);
    // Active row has testid="active-guess-row"; empty rows have testid="guess-row"
    expect(screen.getAllByTestId('guess-row')).toHaveLength(9);
    expect(screen.getByTestId('active-guess-row')).toBeInTheDocument();
  });

  it('renders completed GuessRow for each past guess', () => {
    const guesses = [{ colors: ['R','G','B','Y','O'], exactHits: 1, colorHits: 2 }];
    render(<GameScreen guesses={guesses} />);
    // 1 completed GuessRow (has slots) + 8 empty rows = 9 guess-row elements
    expect(screen.getAllByTestId('guess-row')).toHaveLength(9);
    expect(screen.getAllByTestId('slot')[0]).toHaveAttribute('data-color', 'R');
  });

  it('renders active guess row with submit button', () => {
    render(<GameScreen guesses={[]} />);
    expect(screen.getByTestId('active-guess-row')).toBeInTheDocument();
    expect(screen.getByText(/submit guess/i)).toBeInTheDocument();
  });
});
