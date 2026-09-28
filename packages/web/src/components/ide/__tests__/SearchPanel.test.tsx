import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../../lib/axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { results: [] } }),
    put: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../../store/ideStore', () => ({
  useIDEStore: (selector: (state: any) => any) =>
    selector({
      fileContentsCache: {},
      addOpenFile: vi.fn(),
      setTargetJump: vi.fn(),
      setFileContent: vi.fn(),
      setSavedContent: vi.fn(),
      recordTimeline: vi.fn(),
      searchQuery: '',
    }),
}));

import { SearchPanel } from '../SearchPanel';

describe('SearchPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the search input and header', () => {
    const { getByText, getByPlaceholderText } = render(<SearchPanel />);
    expect(getByText('Code Search')).toBeInTheDocument();
    expect(getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('shows empty state prompt when no query is entered', () => {
    const { getByText } = render(<SearchPanel />);
    expect(getByText('Type to search in workspace files.')).toBeInTheDocument();
  });

  it('updates the query as the user types', async () => {
    const user = userEvent.setup();
    const { getByPlaceholderText } = render(<SearchPanel />);
    const input = getByPlaceholderText('Search');
    await user.type(input, 'hello');
    expect(input).toHaveValue('hello');
  });

  it('toggles match case option', async () => {
    const user = userEvent.setup();
    render(<SearchPanel />);
    const matchCase = screen.getByTitle('Match Case (Alt+C)');
    await user.click(matchCase);
    expect(matchCase).toHaveClass('bg-blue-600');
  });
});
