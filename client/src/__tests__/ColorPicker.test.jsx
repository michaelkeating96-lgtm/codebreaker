import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ColorPicker from '../components/ColorPicker';

describe('ColorPicker', () => {
  it('renders 6 color swatches', () => {
    render(<ColorPicker onSelect={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(6);
  });

  it('calls onSelect with color code when swatch clicked', () => {
    const onSelect = vi.fn();
    render(<ColorPicker onSelect={onSelect} />);
    // First button is 'R' (red)
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onSelect).toHaveBeenCalledWith('R');
  });

  it('buttons are disabled when disabled prop is true', () => {
    render(<ColorPicker onSelect={vi.fn()} disabled={true} />);
    screen.getAllByRole('button').forEach(btn => expect(btn).toBeDisabled());
  });
});
