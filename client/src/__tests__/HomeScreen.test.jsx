import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../socket', () => ({
  socket: { emit: vi.fn(), connect: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

import HomeScreen from '../screens/HomeScreen';
import { socket } from '../socket';

beforeEach(() => vi.clearAllMocks());

describe('HomeScreen', () => {
  it('renders name input and two buttons', () => {
    render(<HomeScreen />);
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
    expect(screen.getByText(/create room/i)).toBeInTheDocument();
    expect(screen.getByText(/join room/i)).toBeInTheDocument();
  });

  it('emits create_room with name on Create Room click', () => {
    render(<HomeScreen />);
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: 'Alice' } });
    fireEvent.click(screen.getByText(/create room/i));
    expect(socket.emit).toHaveBeenCalledWith('create_room', { name: 'Alice' });
  });

  it('shows join input after clicking Join Room', () => {
    render(<HomeScreen />);
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: 'Bob' } });
    fireEvent.click(screen.getByText(/join room/i));
    expect(screen.getByPlaceholderText(/room code/i)).toBeInTheDocument();
  });

  it('emits join_room when code submitted', () => {
    render(<HomeScreen />);
    fireEvent.change(screen.getByPlaceholderText(/your name/i), { target: { value: 'Bob' } });
    fireEvent.click(screen.getByText(/join room/i));
    fireEvent.change(screen.getByPlaceholderText(/room code/i), { target: { value: 'ABC123' } });
    fireEvent.click(screen.getByText(/^join$/i));
    expect(socket.emit).toHaveBeenCalledWith('join_room', { code: 'ABC123', name: 'Bob' });
  });

  it('does not emit if name is empty', () => {
    render(<HomeScreen />);
    fireEvent.click(screen.getByText(/create room/i));
    expect(socket.emit).not.toHaveBeenCalled();
  });
});
