<script lang="ts">
  import { tick } from 'svelte';
  import { describeUniqueness, type ColumnStats, type ColumnKind } from '../columnStats.js';
  import { displayColumnName } from '../columnName.js';

  type Bin = 'text' | 'search' | 'show';
  type Target = Bin | 'none';

  interface Props {
    availableColumns: string[];
    columnStats?: Record<string, ColumnStats>;
    statsTruncated?: boolean; // stats only cover the first part of the file
    textColumns?: string[];   // searched separately, in order; the first is the "main" text column
    searchColumns?: string[]; // metadata that's shown and also embedded (searched) along with the text
    showColumns?: string[];   // metadata that's only shown (and filterable)
  }

  let {
    availableColumns,
    columnStats = {},
    statsTruncated = false,
    textColumns = $bindable([]),
    searchColumns = $bindable([]),
    showColumns = $bindable([])
  }: Props = $props();

  const bins: { id: Bin, title: string, badge: string, hint: string, placeholder: string }[] = [
    {
      id: 'text',
      title: 'Text columns to search',
      badge: 'required',
      hint: 'e.g. a description, narrative, complaint, or transcript. If you add more than one, each is searched separately and a row shows up in the results just once.',
      placeholder: 'Drag at least one column here'
    },
    {
      id: 'search',
      title: 'Additional details to search and show',
      badge: 'optional',
      hint: 'Columns containing short details that might be omitted from the main text column, like a title or a model number.',
      placeholder: 'e.g. Title, Neighborhood'
    },
    {
      id: 'show',
      title: 'Details to show only',
      badge: 'optional',
      hint: 'Shown alongside each result and available for filtering, but not searched. Good for dates, IDs, categories, applicant names, and links back to the original.',
      placeholder: 'e.g. Date, URL, Category'
    }
  ];

  const columnsIn = (bin: Bin) => bin === 'text' ? textColumns : bin === 'search' ? searchColumns : showColumns;
  const setColumnsIn = (bin: Bin, columns: string[]) => {
    if (bin === 'text') textColumns = columns;
    else if (bin === 'search') searchColumns = columns;
    else showColumns = columns;
  };

  // unused columns always stay in spreadsheet order
  let unusedColumns = $derived(availableColumns.filter(c =>
    !textColumns.includes(c) && !searchColumns.includes(c) && !showColumns.includes(c)));

  const binOf = (column: string): Target =>
    bins.find(b => columnsIn(b.id).includes(column))?.id ?? 'none';

  // Puts `column` in `target` (removing it from wherever it was), before `before` if given, else at the end.
  // A column is in at most one bin.
  const moveColumn = (column: string, target: Target, before: string | null = null) => {
    if (before === column) return;
    for (const b of bins) {
      if (columnsIn(b.id).includes(column)) setColumnsIn(b.id, columnsIn(b.id).filter(c => c !== column));
    }
    if (target === 'none') return;
    const columns = [...columnsIn(target)];
    const index = before ? columns.indexOf(before) : -1;
    columns.splice(index === -1 ? columns.length : index, 0, column);
    setColumnsIn(target, columns);
  };

  // --- click-to-move (keyboard, and anyone who'd rather not drag) ---
  let selectedColumn: string | null = $state(null);

  const focusChip = async (column: string) => {
    await tick();
    document.querySelector<HTMLElement>(`[data-column-chip="${CSS.escape(column)}"]`)?.focus();
  };

  const placeSelected = (target: Target) => {
    if (!selectedColumn) return;
    const column = selectedColumn;
    moveColumn(column, target);
    selectedColumn = null;
    focusChip(column);
  };

  const handleChipKeydown = (event: KeyboardEvent, column: string) => {
    if (event.key === 'Escape') {
      selectedColumn = null;
      return;
    }
    // arrow keys reorder a column within its bin
    const bin = binOf(column);
    if (bin === 'none') return;
    const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1
      : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0;
    if (!delta) return;
    event.preventDefault();
    const columns = [...columnsIn(bin)];
    const from = columns.indexOf(column);
    const to = from + delta;
    if (to < 0 || to >= columns.length) return;
    [columns[from], columns[to]] = [columns[to], columns[from]];
    setColumnsIn(bin, columns);
    focusChip(column);
  };

  // --- drag and drop ---
  let draggingColumn: string | null = $state(null);
  // where a drop would land: a bin, and (within it) the column it would go before
  let dropTarget: { target: Target, before: string | null } | null = $state(null);

  const handleDragStart = (event: DragEvent, column: string) => {
    event.dataTransfer?.setData('text/plain', column);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    draggingColumn = column;
    selectedColumn = null;
  };

  const handleDragEnd = () => {
    draggingColumn = null;
    dropTarget = null;
  };

  const handleZoneDragOver = (event: DragEvent, target: Target) => {
    if (!draggingColumn) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (dropTarget?.target !== target || dropTarget.before !== null) dropTarget = { target, before: null };
  };

  // over a chip in a bin: drop before it, or before the next one if the pointer is past its midpoint
  const handleChipDragOver = (event: DragEvent, column: string, target: Target) => {
    if (!draggingColumn || target === 'none') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const columns = columnsIn(target);
    const before = event.clientX < rect.left + rect.width / 2
      ? column
      : columns[columns.indexOf(column) + 1] ?? null;
    if (dropTarget?.target !== target || dropTarget.before !== before) dropTarget = { target, before };
  };

  const handleZoneDragLeave = (event: DragEvent, target: Target) => {
    const zone = event.currentTarget as HTMLElement;
    if (dropTarget?.target === target && !zone.contains(event.relatedTarget as Node | null)) dropTarget = null;
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    if (draggingColumn && dropTarget) moveColumn(draggingColumn, dropTarget.target, dropTarget.before);
    handleDragEnd();
  };

  // Each bin has a color, used for the top edge of the cards in it, and for a dot by its title
  // that matches the dot on cards whose column looks like it belongs there.
  const chipColor: Record<Target, string> = {
    none: 'border-t-gray-300',
    text: 'border-t-violet-600',
    search: 'border-t-[#5a8a76]',
    show: 'border-t-gray-400'
  };
  const dotColor: Record<Bin, string> = {
    text: 'bg-violet-600',
    search: 'bg-[#5a8a76]',
    show: 'bg-gray-400'
  };

  const suggestedBin: Record<ColumnKind, Bin> = {
    text: 'text',
    categorical: 'search',
    numeric: 'show',
    id: 'show'
  };
  const kindLabel: Record<ColumnKind, string> = {
    text: 'Looks like text',
    categorical: 'Looks like categories',
    numeric: 'Looks like numbers or dates',
    id: 'Looks like IDs or links'
  };
  const kindHint = (kind: ColumnKind) =>
    `${kindLabel[kind]}, which usually go in "${bins.find(b => b.id === suggestedBin[kind])?.title}"`;
</script>

{#snippet chip(column: string, target: Target)}
  <button
    type="button"
    draggable="true"
    data-column-chip={column}
    data-testid={`column-chip-${column}`}
    aria-pressed={selectedColumn === column}
    title="Drag to a box, or click and then choose where it goes"
    onclick={() => selectedColumn = selectedColumn === column ? null : column}
    onkeydown={(e) => handleChipKeydown(e, column)}
    ondragstart={(e) => handleDragStart(e, column)}
    ondragend={handleDragEnd}
    ondragover={(e) => handleChipDragOver(e, column, target)}
    class="relative flex flex-col items-start min-w-0 max-w-full text-left rounded-md border border-gray-300 border-t-[3px] {chipColor[target]} bg-white px-2.5 py-1 shadow cursor-grab hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
      {selectedColumn === column ? 'ring-2 ring-violet-500' : ''}
      {draggingColumn === column ? 'opacity-40' : ''}
      {target === 'none' ? 'w-full' : ''}"
  >
    {#if dropTarget?.target === target && dropTarget.before === column && draggingColumn !== column}
      <span class="absolute -left-[7px] top-0 bottom-0 w-[3px] rounded bg-violet-500" aria-hidden="true"></span>
    {/if}
    <span class="flex w-full flex-wrap items-baseline justify-between gap-x-2">
      <span class="text-sm font-semibold text-gray-800 break-all">
        {#if columnStats[column]?.kind}
          {@const kind = columnStats[column].kind}
          <span
            class="mr-1 inline-block size-2 rounded-full align-middle {dotColor[suggestedBin[kind]]}"
            title={kindHint(kind)}
            data-testid={`column-kind-${column}`}
            data-kind={kind}
          ></span><span class="sr-only">({kindHint(kind)})</span>
        {/if}{displayColumnName(column)}
      </span>
      {#if columnStats[column] && describeUniqueness(columnStats[column])}
        <span class="whitespace-nowrap text-[11px] text-gray-500" title={statsTruncated ? 'Based on the first part of the file' : undefined}>
          {describeUniqueness(columnStats[column])}
        </span>
      {/if}
    </span>
    {#if columnStats[column]}
      {@const stats = columnStats[column]}
      {#if stats.topValues}
        <span class="mt-0.5 flex flex-wrap gap-1 max-w-[30ch]">
          {#each stats.topValues as value}
            <span class="max-w-[14ch] truncate rounded bg-gray-100 px-1 text-xs text-gray-600" title={value}>{value}</span>
          {/each}
          {#if stats.uniqueCount > stats.topValues.length}
            <span class="text-xs text-gray-500">+{(stats.uniqueCount - stats.topValues.length).toLocaleString()} more</span>
          {/if}
        </span>
      {:else if stats.sample}
        <span class="block max-w-[26ch] truncate text-xs text-gray-500" title={stats.sample}>{stats.sample}</span>
      {/if}
    {/if}
  </button>
{/snippet}

<div class="space-y-3" data-testid="column-sorter">
  <p class="text-sm text-gray-700">
    Choose how to search each of your spreadsheet's columns by dragging them into the boxes on the right.
    Columns you leave on the left won't be searched or shown.
  </p>

  {#if selectedColumn}
    <div class="rounded-md border border-violet-500 bg-violet-50 px-3 py-2 text-sm text-gray-700" data-testid="column-move-menu">
      Move <strong>{displayColumnName(selectedColumn)}</strong> to:
      <span class="inline-flex flex-wrap gap-2 ml-1 align-middle">
        {#each bins as bin}
          <button
            type="button"
            data-testid={`move-to-${bin.id}`}
            disabled={binOf(selectedColumn) === bin.id}
            onclick={() => placeSelected(bin.id)}
            class="rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs hover:border-violet-500 disabled:opacity-40 disabled:cursor-default"
          >{bin.title}</button>
        {/each}
        {#if binOf(selectedColumn) !== 'none'}
          <button
            type="button"
            data-testid="move-to-none"
            onclick={() => placeSelected('none')}
            class="rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs hover:border-violet-500"
          >Don't use it</button>
        {/if}
        <button type="button" onclick={() => selectedColumn = null} class="text-xs text-gray-500 underline">Cancel</button>
      </span>
    </div>
  {/if}

  <!-- With lots of columns, the left list scrolls on its own: side by side, it takes zero height
       (md:h-0) and grows to fill the row, so the bins on the right set the height; stacked, it's capped. -->
  <div class="grid grid-cols-1 md:grid-cols-[minmax(13rem,1fr)_2fr] gap-5 items-start md:items-stretch">
    <div class="flex flex-col">
      <p class="mb-2 text-sm font-medium text-gray-700">Columns in your spreadsheet</p>
      <!-- drop target; the chips' move menu is the keyboard path -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        data-testid="column-bin-none"
        ondragover={(e) => handleZoneDragOver(e, 'none')}
        ondragleave={(e) => handleZoneDragLeave(e, 'none')}
        ondrop={handleDrop}
        class="flex flex-col gap-1.5 min-h-[7rem] max-h-[60vh] overflow-y-auto md:max-h-none md:h-0 md:grow rounded-lg border p-2.5 transition-colors
          {dropTarget?.target === 'none' ? 'border-violet-500 bg-violet-50' : 'border-gray-300 bg-gray-50'}"
      >
        {#each unusedColumns as column (column)}
          {@render chip(column, 'none')}
        {:else}
          <p class="px-1 py-2 text-sm italic text-gray-500">All columns are in use.</p>
        {/each}
      </div>
      <p class="mt-2 text-xs text-gray-500">Not using a column? Leave it here.</p>
    </div>

    <div>
      <p class="mb-2 text-sm font-medium text-gray-700">How Meaningfully should use them</p>
      <div class="flex flex-col gap-3.5">
        {#each bins as bin}
          {@const columns = columnsIn(bin.id)}
          <!-- drop target, and clicking it places the selected column (a mouse shortcut); the chips' move menu is the keyboard path -->
          <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
          <div
            data-testid={`column-bin-${bin.id}`}
            ondragover={(e) => handleZoneDragOver(e, bin.id)}
            ondragleave={(e) => handleZoneDragLeave(e, bin.id)}
            ondrop={handleDrop}
            onclick={(e) => { if (e.target === e.currentTarget || !(e.target as HTMLElement).closest('button')) placeSelected(bin.id); }}
            class="rounded-lg border-2 px-3.5 pt-3 pb-3.5 transition-colors
              {dropTarget?.target === bin.id ? 'border-violet-500 bg-violet-50' : columns.length ? 'border-solid border-gray-300' : 'border-dashed border-gray-300'}
              {selectedColumn && binOf(selectedColumn) !== bin.id ? 'cursor-pointer hover:bg-violet-50' : ''}"
          >
            <div class="flex flex-wrap items-baseline gap-2">
              <h4 class="text-base font-semibold">
                <span class="mr-1 inline-block size-2 rounded-full align-middle {dotColor[bin.id]}" aria-hidden="true"></span>{bin.title}
              </h4>
              <span class="rounded border px-1.5 text-[11px] {bin.badge === 'required' ? 'border-red-600 text-red-600' : 'border-gray-200 text-gray-500'}">{bin.badge}</span>
            </div>
            <p class="mt-1 mb-2.5 text-xs text-gray-600">{bin.hint}</p>
            <div class="flex flex-wrap gap-2 min-h-11 content-start">
              {#each columns as column (column)}
                {@render chip(column, bin.id)}
              {:else}
                <div class="flex flex-1 items-center justify-center min-h-11 rounded-md bg-gray-50 text-sm italic text-gray-400">
                  {bin.placeholder}
                </div>
              {/each}
              {#if dropTarget?.target === bin.id && dropTarget.before === null && columns.length && draggingColumn !== columns[columns.length - 1]}
                <span class="self-stretch w-[3px] rounded bg-violet-500" aria-hidden="true"></span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
