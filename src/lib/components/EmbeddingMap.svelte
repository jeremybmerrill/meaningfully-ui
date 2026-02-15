<script lang="ts">
  import { onMount } from 'svelte';
  import Plotly from 'plotly.js-dist-min';
  import type { EmbeddingMapPoint, EmbeddingMapResponse, MeaningfullyAPI, TopicDefinition } from '../types';

  interface TopicRow {
    name: string;
    keywords: string;
    color?: string;
  }

  interface Props {
    documentSetId: number;
    api: MeaningfullyAPI;
  }

  let { documentSetId, api }: Props = $props();

  let method: 'pacmap' | 'umap' | 'tsne' = $state('pacmap');
  let topics: TopicRow[] = $state([
    { name: 'People', keywords: 'ceo, founder, employee, manager' },
    { name: 'Money', keywords: 'cost, price, dollars, budget' },
    { name: 'Product', keywords: 'feature, bug, launch, update' }
  ]);

  let loading = $state(false);
  let error: string | null = $state(null);
  let status: 'idle' | 'loading' | 'error' | 'ready' = $state('idle');
  let points: EmbeddingMapPoint[] = $state([]);
  let stats: EmbeddingMapResponse['stats'] | null = $state(null);
  let plotDiv: HTMLDivElement;

  const palette = ['#6366f1', '#22c55e', '#f97316', '#06b6d4', '#e11d48', '#f59e0b', '#8b5cf6', '#0ea5e9', '#14b8a6'];

  let topicColors = $derived(() => {
    const colorMap = new Map<string, string>();
    topics.forEach((topic, idx) => {
      const key = topic.name.trim() || `Topic ${idx + 1}`;
      colorMap.set(key, topic.color || palette[idx % palette.length]);
    });
    colorMap.set('Uncategorized', '#9ca3af');
    return colorMap;
  });

  let legendCounts = $derived(() => {
    const counts = new Map<string, number>();
    points.forEach((p) => counts.set(p.topic, (counts.get(p.topic) || 0) + 1));
    return counts;
  });

  $effect(() => {
    renderPlot();
  });

  function normalizeTopics(): TopicDefinition[] {
    return topics
      .filter((t) => t.name.trim() && t.keywords.trim())
      .map((t, idx) => ({
        name: t.name.trim(),
        keywords: t.keywords.split(',').map((k) => k.trim()).filter(Boolean),
        color: t.color || palette[idx % palette.length]
      }));
  }

  async function generateMap() {
    loading = true;
    error = null;
    status = 'loading';
    try {
      const payloadTopics = normalizeTopics();
      const response = await api.getEmbeddingMap({
        documentSetId,
        method,
        topics: payloadTopics.map(({ color, ...rest }) => rest),
      });
      points = response.points.map((p) => ({
        ...p,
        topic: p.topic || 'Uncategorized'
      }));
      stats = response.stats;
      status = 'ready';
    } catch (err: any) {
      error = err?.message || 'Failed to build the map.';
      status = 'error';
    } finally {
      loading = false;
    }
  }

  function addTopic() {
    topics = [...topics, { name: '', keywords: '' }];
  }

  function removeTopic(idx: number) {
    topics = topics.filter((_, i) => i !== idx);
  }

  function renderPlot() {
    if (!plotDiv || !points.length) return;

    const colorByTopic = points.map((p) => topicColors.get(p.topic) || '#9ca3af');
    const plotData = [
      {
        type: 'scattergl',
        mode: 'markers',
        x: points.map((p) => p.x),
        y: points.map((p) => p.y),
        text: points.map((p) => p.text),
        customdata: points.map((p) => p.topic),
        marker: {
          color: colorByTopic,
          size: 7,
          opacity: 0.8,
          line: { width: 0 }
        },
        hovertemplate: '%{text}<extra>%{customdata}</extra>',
      }
    ];

    const layout = {
      height: 520,
      margin: { l: 24, r: 12, t: 12, b: 24 },
      hovermode: 'closest',
      xaxis: { title: 'x', zeroline: false },
      yaxis: { title: 'y', zeroline: false },
    };

    Plotly.react(plotDiv, plotData, layout, { displaylogo: false, responsive: true });
  }

  onMount(() => {
    renderPlot();
  });
</script>

<div class="space-y-4">
  <div class="flex flex-wrap gap-4 items-end">
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Dimensionality reducer</label>
      <select bind:value={method} class="border rounded px-3 py-2 text-black">
        <option value="pacmap">PacMAP</option>
        <option value="umap">UMAP</option>
        <option value="tsne">t-SNE</option>
      </select>
    </div>
    <button class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50" onclick={generateMap} disabled={loading} aria-busy={loading}>
      {loading ? 'Building map...' : 'Build map'}
    </button>
    <div class="text-sm text-gray-600 min-h-[1.5rem] flex items-center gap-2">
      {#if status === 'loading'}
        <span>Building map...</span>
      {:else if status === 'error'}
        <span class="text-red-600">Map failed. Fix the error below and retry.</span>
      {:else if stats}
        <span>
          {stats.total - stats.missingEmbeddings} / {stats.total} rows mapped
        </span>
      {/if}
    </div>
  </div>

  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Topics & keywords</h3>
      <button class="text-blue-600 underline" onclick={addTopic}>Add topic</button>
    </div>
    <div class="space-y-3">
      {#each topics as topic, idx}
        <div class="grid grid-cols-12 gap-2 items-center">
          <input
            class="col-span-3 border rounded px-2 py-1 text-black"
            placeholder="Topic name"
            bind:value={topic.name}
          />
          <input
            class="col-span-8 border rounded px-2 py-1 text-black"
            placeholder="Comma-separated keywords"
            bind:value={topic.keywords}
          />
          <button class="col-span-1 text-red-600" onclick={() => removeTopic(idx)}>✕</button>
        </div>
      {/each}
    </div>
  </div>

  {#if error}
    <div class="p-3 rounded bg-red-100 text-red-700">{error}</div>
  {/if}

  <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
    <div class="lg:col-span-3 bg-white rounded shadow p-3 text-black min-h-[320px]">
      {#if loading}
        <div class="flex items-center justify-center h-64">Building map...</div>
      {:else if points.length === 0}
        <div class="text-gray-600">Run a map to see your documents laid out in 2D space.</div>
      {:else}
        <div bind:this={plotDiv}></div>
      {/if}
    </div>
    <div class="bg-white rounded shadow p-3 text-black space-y-2">
      <h4 class="font-semibold">Legend</h4>
      {#if points.length === 0}
        <p class="text-gray-500">Topics will appear here after you build the map.</p>
      {:else}
        {#each Array.from(legendCounts.entries()) as [topic, count]}
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" style={`background:${topicColors.get(topic) || '#9ca3af'}`}></span>
              <span class="text-sm">{topic}</span>
            </div>
            <span class="text-sm text-gray-600">{count}</span>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>
