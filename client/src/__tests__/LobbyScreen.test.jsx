import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LobbyScreen from '../screens/LobbyScreen';

describe('LobbyScreen', () => {
  it('displays the room code', () => {
    render(<LobbyScreen roomCode="ABC123" />);
    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });

  it('shows waiting message', () => {
    render(<LobbyScreen roomCode="ABC123" />);
    expect(screen.getByText(/waiting/i)).toBeInTheDocument();
  });
});
