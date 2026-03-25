import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../socket', () => ({
  socket: { emit: vi.fn() },
}));

import SetCodeScreen from '../screens/SetCodeScreen';
import { socket } from '../socket';

describe('SetCodeScreen', () => {
  it('renders 5 slots', () => {
    render(<SetCodeScreen />);
    expect(screen.getAllByTestId('slot')).toHaveLength(5);
  });

  it('submit button is disabled until all 5 slots are filled', () => {
    render(<SetCodeScreen />);
    expect(screen.getByText(/set code/i)).toBeDisabled();
  });

  it('emits set_code when all slots filled and submitted', () => {
    render(<SetCodeScreen />);
    // Each aria-label button is a color swatch; click first swatch 5 times to fill all slots
    const swatches = screen.getAllByRole('button').filter(b => b.getAttribute('aria-label'));
    for (let i = 0; i < 5; i++) {
      fireEvent.click(swatches[0]);
    }
    fireEvent.click(screen.getByText(/set code/i));
    expect(socket.emit).toHaveBeenCalledWith('set_code', { code: ['R','R','R','R','R'] });
  });
});
