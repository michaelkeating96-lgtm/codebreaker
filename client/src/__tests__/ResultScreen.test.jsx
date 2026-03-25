import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../socket', () => ({
  socket: { emit: vi.fn() },
}));

import ResultScreen from '../screens/ResultScreen';
import { socket } from '../socket';

const defaultProps = {
  gameResult: { winner: 'guesser', secretCode: ['R','G','B','Y','O'] },
  myRole: 'guesser',
  goHome: vi.fn(),
};

describe('ResultScreen', () => {
  it('shows win message when guesser wins and I am guesser', () => {
    render(<ResultScreen {...defaultProps} />);
    expect(screen.getByText(/you win/i)).toBeInTheDocument();
  });

  it('shows lose message when setter wins and I am guesser', () => {
    render(<ResultScreen
      {...defaultProps}
      gameResult={{ winner: 'setter', secretCode: ['R','G','B','Y','O'] }}
    />);
    expect(screen.getByText(/you lose/i)).toBeInTheDocument();
  });

  it('reveals the secret code (5 slots)', () => {
    render(<ResultScreen {...defaultProps} />);
    expect(screen.getAllByTestId('slot')).toHaveLength(5);
  });

  it('emits play_again when Play Again clicked', () => {
    render(<ResultScreen {...defaultProps} />);
    fireEvent.click(screen.getByText(/play again/i));
    expect(socket.emit).toHaveBeenCalledWith('play_again');
  });

  it('emits decline_rematch and calls goHome when No Thanks clicked', () => {
    const goHome = vi.fn();
    render(<ResultScreen {...defaultProps} goHome={goHome} />);
    fireEvent.click(screen.getByText(/no thanks/i));
    expect(socket.emit).toHaveBeenCalledWith('decline_rematch');
    expect(goHome).toHaveBeenCalled();
  });
});
