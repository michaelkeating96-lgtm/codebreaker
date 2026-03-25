import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import GuessRow from '../components/GuessRow';

describe('GuessRow', () => {
  it('renders 5 color slots', () => {
    render(<GuessRow colors={['R','G','B','Y','O']} exactHits={2} colorHits={1} />);
    expect(screen.getAllByTestId('slot')).toHaveLength(5);
  });

  it('shows exact and color hit counts', () => {
    render(<GuessRow colors={['R','G','B','Y','O']} exactHits={3} colorHits={1} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
