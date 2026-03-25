import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../socket', () => ({
  socket: { emit: vi.fn() },
}));

import RoleScreen from '../screens/RoleScreen';
import { socket } from '../socket';

describe('RoleScreen', () => {
  it('shows role buttons when canPickRole is true', () => {
    render(<RoleScreen canPickRole={true} players={[]} />);
    expect(screen.getByText(/code setter/i)).toBeInTheDocument();
    expect(screen.getByText(/guesser/i)).toBeInTheDocument();
  });

  it('emits pick_role when a role is selected', () => {
    render(<RoleScreen canPickRole={true} players={[]} />);
    fireEvent.click(screen.getByText(/code setter/i));
    expect(socket.emit).toHaveBeenCalledWith('pick_role', { role: 'setter' });
  });

  it('shows waiting message when canPickRole is false', () => {
    render(<RoleScreen canPickRole={false} players={[]} />);
    expect(screen.getByText(/waiting/i)).toBeInTheDocument();
    expect(screen.queryByText(/code setter/i)).not.toBeInTheDocument();
  });
});
