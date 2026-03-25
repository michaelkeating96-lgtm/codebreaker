import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CodeSlots from '../components/CodeSlots';

describe('CodeSlots', () => {
  it('renders 5 slots', () => {
    render(<CodeSlots slots={[null, null, null, null, null]} />);
    expect(screen.getAllByTestId('slot')).toHaveLength(5);
  });

  it('shows colors in filled slots via data-color attribute', () => {
    render(<CodeSlots slots={['R', null, 'B', null, null]} />);
    const slots = screen.getAllByTestId('slot');
    expect(slots[0]).toHaveAttribute('data-color', 'R');
    expect(slots[2]).toHaveAttribute('data-color', 'B');
  });
});
