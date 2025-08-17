import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/pages/Book', () => ({ default: () => <div>BookPage</div> }));
vi.mock('@/pages/Playground', () => ({ default: () => <div>PlaygroundPage</div> }));

import App from '@/App';

describe('App routing', () => {
  it('renders Book at root', () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    expect(!!screen.getByText('BookPage')).toBe(true);
  });

  it('renders Playground at /playground', () => {
    render(
      <MemoryRouter initialEntries={["/playground"]}>
        <App />
      </MemoryRouter>
    );
    expect(!!screen.getByText('PlaygroundPage')).toBe(true);
  });
});
