<script lang="ts">
  import { displayColumnName } from '../columnName.js';
  // The previous column-selection interface (a dropdown or checkboxes for the text column(s),
  // and checkboxes for metadata columns with "also search" sub-checkboxes), kept so it can be
  // compared live with ColumnSorter: type "oldpicker" to switch. It binds the same three lists
  // as ColumnSorter, so switching keeps the current selection.

  interface Props {
    availableColumns: string[];
    textColumns?: string[];   // searched separately, in order; the first is the "main" text column
    searchColumns?: string[]; // metadata that's shown and also embedded (searched) along with the text
    showColumns?: string[];   // metadata that's only shown (and filterable)
  }

  let {
    availableColumns,
    textColumns = $bindable([]),
    searchColumns = $bindable([]),
    showColumns = $bindable([])
  }: Props = $props();

  // "Search multiple columns" mode shows checkboxes instead of a dropdown
  let multiTextColumns = $state(textColumns.length > 1);
  let selectedMetadataColumns = $derived([...searchColumns, ...showColumns]);

  const setSingleTextColumn = (column: string) => {
    textColumns = column ? [column] : [];
    // a text column can't also be a metadata column
    searchColumns = searchColumns.filter(c => c !== column);
    showColumns = showColumns.filter(c => c !== column);
  };

  const toggleTextColumn = (column: string) => {
    textColumns = textColumns.includes(column)
      ? textColumns.filter(c => c !== column)
      : [...textColumns, column];
    searchColumns = searchColumns.filter(c => !textColumns.includes(c));
    showColumns = showColumns.filter(c => !textColumns.includes(c));
  };

  const toggleMultiTextColumns = () => {
    multiTextColumns = !multiTextColumns;
    textColumns = textColumns.slice(0, 1);
  };

  const toggleMetadataColumn = (column: string) => {
    if (textColumns.includes(column)) return;
    if (selectedMetadataColumns.includes(column)) {
      searchColumns = searchColumns.filter(c => c !== column);
      showColumns = showColumns.filter(c => c !== column);
    } else {
      showColumns = [...showColumns, column];
    }
  };

  const toggleEmbeddedMetadataColumn = (column: string) => {
    if (searchColumns.includes(column)) {
      searchColumns = searchColumns.filter(c => c !== column);
      showColumns = [...showColumns, column];
    } else {
      showColumns = showColumns.filter(c => c !== column);
      searchColumns = [...searchColumns, column];
    }
  };
</script>

<div class="space-y-4" data-testid="legacy-column-picker">
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <p class="block text-sm font-medium text-gray-700">
        Which column holds the text you want to search?
      </p>
      <button
        type="button"
        onclick={toggleMultiTextColumns}
        class="text-xs text-gray-500 hover:text-gray-700 underline"
        data-testid="toggle-multiple-text-columns"
      >
        {multiTextColumns ? 'Search a single column' : 'Search multiple columns'}
      </button>
    </div>
    {#if multiTextColumns}
      <div class="flex flex-wrap gap-2" data-testid="columns-to-embed-checkboxes">
        {#each availableColumns as column}
          <label class="inline-flex items-center">
            <input
              type="checkbox"
              id={`text-${column}`}
              checked={textColumns.includes(column)}
              onchange={() => toggleTextColumn(column)}
              class="rounded border-gray-300 text-violet-600 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            />
            <span class="ml-2 text-sm text-gray-700">{displayColumnName(column)}</span>
          </label>
        {/each}
      </div>
    {:else}
      <select
        value={textColumns[0] ?? ''}
        onchange={(e) => setSingleTextColumn((e.target as HTMLSelectElement).value)}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
        data-testid="column-to-embed-select"
        aria-label="Which column holds the text you want to search?"
      >
        <option value="">Select a column...</option>
        {#each availableColumns as column}
          <option value={column}>{displayColumnName(column)}</option>
        {/each}
      </select>
    {/if}
  </div>

  <div class="space-y-2">
    <p class="block text-sm font-medium text-gray-700">
      Which other columns should be shown in the results, and available for filtering?
    </p>
    <p class="text-xs text-gray-500">
      For instance, if your spreadsheet has a <code>Category</code> column, you might want to select it so you can filter by it when searching. If it has a
      <code>URL</code>, you might select it so you can click through to the original.
    </p>
    <div class="flex flex-wrap gap-2">
      {#each availableColumns as column}
        <label class="inline-flex items-center">
          <input
            type="checkbox"
            id={`metadata-${column}`}
            checked={selectedMetadataColumns.includes(column)}
            disabled={textColumns.includes(column)}
            onchange={() => toggleMetadataColumn(column)}
            class="rounded border-gray-300 text-violet-600 shadow-sm focus:border-violet-500 focus:ring-violet-500"
          />
          <span class="ml-2 text-sm text-gray-700">{displayColumnName(column)}</span>
        </label>
        {#if selectedMetadataColumns.includes(column)}
          <label class="inline-flex items-center -ml-1" title="Also search the contents of this column, along with the text">
            <input
              type="checkbox"
              id={`embed-${column}`}
              checked={searchColumns.includes(column)}
              onchange={() => toggleEmbeddedMetadataColumn(column)}
              class="rounded border-gray-300 text-violet-600 shadow-sm focus:border-violet-500 focus:ring-violet-500"
            />
            <span class="ml-1 text-xs text-gray-500">also search</span>
          </label>
        {/if}
      {/each}
    </div>
    <p class="text-xs text-gray-500">
      Checking "also search" for a column includes its contents when searching, which is useful if the text doesn't mention those details itself.
      It's added to every passage of the text, so it works best for short values.
    </p>
  </div>
</div>
