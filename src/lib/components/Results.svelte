<script lang="ts">
  import Table from './Table.svelte';
  import Papa from 'papaparse';
  
  interface Props {
    results?: Array<Record<string, any>>;
    textColumn: string;
    metadataColumns?: string[];
    loading?: boolean;
    hasMore?: boolean;
    loadingMore?: boolean;
    showMore?: () => void;
    // Re-runs the current search with the search mode toggled (semantic <-> hybrid).
    sortDifferently?: () => void;
    // Header text for the score column ('similarity' by default).
    scoreLabel?: string;
    originalDocumentClick?: (sourceNodeId: string) => void;
  }

  let {
    results = [],
    textColumn,
    metadataColumns = [],
    loading = false,
    hasMore = false,
    loadingMore = false,
    showMore = () => {},
    sortDifferently = () => {},
    scoreLabel = 'similarity',
    originalDocumentClick = () => {},
  }: Props = $props();

  // copied from https://github.com/run-llama/LlamaIndexTS/blob/main/packages/providers/storage/weaviate/src/sanitize.ts
  // weaviate requires property names (i.e. metadata column names) to start with a lowercase letter or underscore,
  // and only contain letters, numbers, and underscores.
  // If weaviate is used as the vector store, metadata column names will be sanitized on upload,
  // so we need to look for the sanitized version when displaying results.
  // If another store is used, the original names will be preserved, and so this won't get called.
  const sanitizePropertyName = (name: string): string => {
    // Replace invalid characters with underscores
    let sanitized = name.replace(/[^_A-Za-z0-9]/g, "_");

    // Ensure it starts with a letter or underscore
    if (!/^[_A-Za-z]/.test(sanitized)) {
      sanitized = "_" + sanitized;
    }

    // Remove consecutive underscores
    sanitized = sanitized.replace(/_+/g, "_");

    // Remove trailing underscores
    sanitized = sanitized.replace(/_+$/, "");

    // Ensure it's not empty
    if (!sanitized) {
      sanitized = "_property";
    }
    // lowercase first letter to match weaviate behavior
    sanitized = sanitized.charAt(0).toLowerCase() + sanitized.slice(1);

    return sanitized;
  };

  // Function to download results as CSV
  const downloadCSV = () => {
    if (results.length === 0) return;

    // Prepare data for Papa Parse
    const csvData = results.map(row => {
      const csvRow: Record<string, any> = {};
      
      // Add text column
      csvRow[textColumn] = row[textColumn] || '';
      
      // Add metadata columns
      // check the sanitized version if the original doesn't exist
      // certain characters aren't allowed in weaviate property names  -- if present, and if weaviate is used as storage, they will be returned as sanitized.
      metadataColumns.forEach(column => {
        csvRow[column] = row[column] || row[sanitizePropertyName(column)] ||  '';
      });
      
      // Add the score column, formatted to match how it's displayed on screen.
      if (row.similarity !== undefined) {
        csvRow[scoreLabel] = (row.similarity * 100).toFixed(1) + '%';
      }
      
      return csvRow;
    });
    
    // Generate CSV using Papa Parse
    const csvContent = Papa.unparse(csvData);
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'results.csv');
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 5000);
  };

</script>

<div class="space-y-4">
  <div class="flex justify-between items-center">
    <h2 class="text-xl font-semibold">Search Results</h2>
    {#if results.length > 0 && !loading}
      <div class="flex items-center gap-3">
        <button
          onclick={sortDifferently}
          disabled={loading || loadingMore}
          title="Re-run this search the other way: hybrid search boosts semantic search with exact-keyword (BM25) matching."
          data-testid="sort-differently-top"
          class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m18 14 4 4-4 4"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m18 2 4 4-4 4"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 6h1.972a4 4 0 0 1 3.6 2.2"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"></path>
          </svg>
          Sort Results Differently
        </button>
        <button
          onclick={downloadCSV}
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center gap-2"
          title="Download results as CSV"
          data-testid="download-csv"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          Download CSV
        </button>
      </div>
    {/if}
  </div>
  
  {#if loading}
  <div class="flex justify-center items-center h-full">
    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
  </div>
  {:else if results.length === 0}
    <div class="bg-white rounded-lg shadow text-black">
      <p>No results found. Is it possible there is no data in the dataset?</p>
    </div>
  {:else}
    <div class="bg-white rounded-lg shadow text-black">
      <Table
        data={results}
        {textColumn}
        {metadataColumns}
        showSimilarity={true}
        {scoreLabel}
        showShowOriginal={true}
        originalDocumentClick={originalDocumentClick}
      />
    </div>
    
    <div class="flex justify-center items-center gap-3 mt-4">
      {#if hasMore}
        <button
          onclick={showMore}
          disabled={loadingMore}
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingMore ? 'Loading...' : 'Show More'}
        </button>
      {/if}
      <button
        onclick={sortDifferently}
        disabled={loading || loadingMore}
        title="Re-run this search the other way: hybrid search boosts semantic search with exact-keyword (BM25) matching."
        data-testid="sort-differently"
        class="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m18 14 4 4-4 4"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m18 2 4 4-4 4"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2 6h1.972a4 4 0 0 1 3.6 2.2"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45"></path>
        </svg>
        Sort Results Differently
      </button>
    </div>
  {/if}
</div>