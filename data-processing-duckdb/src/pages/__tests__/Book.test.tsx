import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Book from '@/pages/Book';

beforeEach(() => {
  // Mock fetch to return markdown content
  global.fetch = vi.fn(async () => ({
    text: async () => '# Title',
  } as any)) as any;
});

describe('Book', () => {
  it('loads and displays chapter content', async () => {
    render(<Book />);
    await waitFor(() => expect(!!screen.getByText('Title')).toBe(true));
  });

  it('switches chapters on click', async () => {
    const user = userEvent.setup();
    render(<Book />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]);
    expect(global.fetch).toHaveBeenCalled();
  });
});
