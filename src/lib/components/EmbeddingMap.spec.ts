import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import EmbeddingMap from './EmbeddingMap.svelte';

vi.mock('plotly.js-dist-min', () => ({
  default: {
    react: vi.fn(),
  },
}));

const sampleResponse = {
  method: 'umap' as const,
  points: [
    {
      id: '1',
      text: 'hello world',
      metadata: {},
      topic: 'People',
      x: 0.1,
      y: -0.2,
    },
  ],
  stats: {
    total: 1,
    missingEmbeddings: 0,
  },
};

describe('EmbeddingMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading then mapped counts on success', async () => {
    const api = {
      getEmbeddingMap: vi.fn().mockResolvedValue(sampleResponse),
    } as any;

    render(EmbeddingMap, { documentSetId: 1, api });

    const button = page.getByRole('button', { name: 'Build map' });
    await button.click();

    await expect.element(page.getByText('Building map...')).toBeInTheDocument();
    await expect.poll(() => api.getEmbeddingMap.mock.calls.length).toBe(1);
    await expect.element(page.getByText(/rows mapped/)).toBeInTheDocument();
  });

  it('shows an error message when the API call fails', async () => {
    const api = {
      getEmbeddingMap: vi.fn().mockRejectedValue(new Error('boom')),
    } as any;

    render(EmbeddingMap, { documentSetId: 2, api });

    const button = page.getByRole('button', { name: 'Build map' });
    await button.click();

    await expect.poll(() => api.getEmbeddingMap.mock.calls.length).toBe(1);
    await expect.element(page.getByText(/Map failed/)).toBeInTheDocument();
  });
});
