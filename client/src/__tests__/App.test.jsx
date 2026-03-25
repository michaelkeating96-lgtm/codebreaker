import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock socket so tests don't need a real server
vi.mock('../socket', () => ({
  socket: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    id: 'test-socket-id',
  },
}));

import App from '../App';

describe('App', () => {
  it('renders HomeScreen by default', () => {
    render(<App />);
    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
  });
});
