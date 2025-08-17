import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    render(<Book />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    expect(global.fetch).toHaveBeenCalled();
  });
});
