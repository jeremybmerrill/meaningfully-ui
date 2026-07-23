<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { debounce } from 'lodash';
  import Preview from './Preview.svelte';
  import { fileDataStore } from '../stores/fileDataStore';
  import type { MeaningfullyAPI } from '../types';

  interface Props {
    validApiKeysSet: boolean;
    api: MeaningfullyAPI;
  };

  let {
    validApiKeysSet,
    api,
    basepath
  } = $props();

  let fileData: any = $state(null);
  let uploading = $state(false);
  let error = $state('');
  let selectedTextColumn = $state('');
  let selectedMetadataColumns: string[] = $state([]);
  let generatingPreview = $state(false);
  let datasetName = $state('');
  const defaultChunkSize = 100;
  const defaultChunkOverlap = 20;
  let chunkSize = $state(defaultChunkSize);
  let chunkOverlap = $state(defaultChunkOverlap);
  
  // Model options grouped by provider - fetched from API
  let availableModelOptions: Record<string, string[]> = $state({});
  let allModelOptions: Record<string, string[]> = $state({});
  
  let modelProvider = $state("openai");
  let modelName = $state("text-embedding-3-small");
  let splitIntoSentences = $state(true);
  let combineSentencesIntoChunks = $state(true);
  let previewData: Array<Record<string, any>> = $state([]);
  let costEstimate: number = $state(0);
  let tokenCount: number = $state(0);
  let pricePer1M: number = $state(0);
  let isCollapsed = $state(true);

  // A small sample of raw (un-chunked) rows from the middle of the file, plus the total
  // document count -- returned once by generatePreviewData (which reads the whole CSV) so
  // that later config-only changes (chunk size, splitting, model) can re-preview via
  // refinePreviewSample instead of re-reading the file every time.
  let sampleDocs: SampleDocument[] = $state([]);
  let sampleDocumentCount = $state(0);
  
  // Update model name when provider changes
  $effect(() => {
    if (modelProvider && availableModelOptions[modelProvider]) {
      modelName = availableModelOptions[modelProvider][0];
    }
  });

  // Progress tracking
  let progress = $state(0);
  let progressTotal = $state(100);
  // let elapsedTimeMs = $state(0);
  let estimatedTimeRemainingMs: number | null = $state(null);

  // Helper function to format time in human-readable format
  const formatTime = (timeMs: number | null): string => {
    if (!timeMs || timeMs < 1000) return '<1s';
    
    const totalSeconds = Math.floor(timeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let result = '';
    if (hours > 0) result += `${hours}h`;
    if (minutes > 0) result += `${minutes}m`;
    if (seconds > 0 || result === '') result += `${seconds}s`;
    
    return result;
  };

  onMount(async () => {
    // Fetch available model options from API
    try {
      const modelOptionsData = await api.getAvailableModelOptions();
      availableModelOptions = modelOptionsData.availableModelOptions;
      allModelOptions = modelOptionsData.allModelOptions;
      
      // Set default provider to first available one
      const availableProviders = Object.keys(availableModelOptions);
      if (availableProviders.length > 0) {
        modelProvider = availableProviders[0];
        modelName = availableModelOptions[modelProvider][0];
      }
    } catch (e) {
      console.error('Error fetching available model options:', e);
    }

    // Subscribe to the file data store
    const unsubscribe = fileDataStore.subscribe((data: any) => {
      if (!data) {
        navigate(basepath.replace(/\/+$/g, "") + "/"); // Redirect back to home if no file data
        return;
      }
      fileData = data;
      datasetName = fileData.name.replace(/\.csv$/, '');
    });

    // Ensure cleanup on destroy
    // https://svelte.dev/docs/svelte/lifecycle-hooks
    // "If a function is returned from onMount, it will be called when the component is unmounted."
    return unsubscribe;
  });

  // Poll the backend every second for upload progress
  const pollProgress = async () => {
    if (!uploading) return;
    try {
      const result = await api.getUploadProgress();
      progress = result.progress;
      progressTotal = result.total;
      // // elapsedTimeMs = result.elapsedTimeMs;
      estimatedTimeRemainingMs = result.estimatedTimeRemainingMs;
    } catch(e) {
      console.error("Error fetching progress:", e);
    }
    if (uploading) setTimeout(pollProgress, 1000);
  };

  const generatePreview = async () => {
    if (!fileData || !selectedTextColumn) {
      error = 'Select a text column (or maybe something went wrong with the file you chose)';
      return;
    }
    
    try {
      error = '';
      generatingPreview = true;
      const previewResponse = await api.generatePreviewData({
        fileContent: fileData.fileContent,
        fileName: fileData.name,
        datasetName,
        description: 'TK',
        textColumns: [selectedTextColumn],
        metadataColumns: selectedMetadataColumns.map(c => c),
        splitIntoSentences,
        combineSentencesIntoChunks,
        sploderMaxSize: 100,
        modelName,
        modelProvider,
        chunkSize,
        chunkOverlap
      });

      if (previewResponse.success) {
        costEstimate = previewResponse.estimatedPrice;
        tokenCount = previewResponse.tokenCount;
        pricePer1M = previewResponse.pricePer1M;
        previewData = previewResponse.nodes.map((result: Record<string, any>) => ({
          ...result.metadata,
          [selectedTextColumn]: result.text
        }));
        sampleDocs = previewResponse.sample ?? [];
        sampleDocumentCount = previewResponse.documentCount ?? 0;
      } else {
        error = previewResponse.message || 'Preview generation failed'; // fastify responses don't throw

        console.error('Preview generation failed:', previewResponse);
      }
    } catch (e: any) {
      error = e.message; // electron errors throw
    } finally {
      generatingPreview = false;
    }
  };

  // Re-chunks the cached sample under the current config, without re-reading the CSV.
  // estimatedPrice/tokenCount come back extrapolated from the sample rather than exact,
  // which is the trade-off for not re-transforming the whole file on every slider tweak.
  const refinePreview = async () => {
    if (!selectedTextColumn || sampleDocs.length === 0) return;

    try {
      error = '';
      generatingPreview = true;
      const previewResponse = await api.refinePreviewSample({
        sample: sampleDocs,
        documentCount: sampleDocumentCount,
        datasetName,
        description: 'TK',
        textColumns: [selectedTextColumn],
        metadataColumns: selectedMetadataColumns.map(c => c),
        splitIntoSentences,
        combineSentencesIntoChunks,
        sploderMaxSize: 100,
        modelName,
        modelProvider,
        chunkSize,
        chunkOverlap
      });

      if (previewResponse.success) {
        costEstimate = previewResponse.estimatedPrice;
        tokenCount = previewResponse.tokenCount;
        pricePer1M = previewResponse.pricePer1M;
        previewData = previewResponse.nodes.map((result: Record<string, any>) => ({
          ...result.metadata,
          [selectedTextColumn]: result.text
        }));
      } else {
        error = previewResponse.message || 'Preview generation failed'; // fastify responses don't throw

        console.error('Preview generation failed:', previewResponse);
      }
    } catch (e: any) {
      error = e.message; // electron errors throw
    } finally {
      generatingPreview = false;
    }
  };

  const handleUpload = async () => {
    if (!fileData || !selectedTextColumn) {
      error = 'Select a text column (or maybe something went wrong with the file you chose)';
      return;
    }
    
    try {
      uploading = true;
      error = '';
      
      // Reset timing variables
      // elapsedTimeMs = 0;
      estimatedTimeRemainingMs = null;

      // Start polling for progress
      pollProgress();
      const uploadResponse = await api.uploadCsv({
        fileContent: fileData.fileContent,
        fileName: fileData.name,
        datasetName,
        description: 'TK',
        textColumns: [selectedTextColumn],
        metadataColumns: selectedMetadataColumns.map(c => c),
        splitIntoSentences,
        combineSentencesIntoChunks,
        sploderMaxSize: 100,
        chunkSize,
        chunkOverlap,
        modelName,
        modelProvider
      });

      if (uploadResponse.success) {
        navigate(basepath.replace(/\/+$/g, "") + "/search/" + uploadResponse.documentSetId);

      } else {
        error = uploadResponse.message || 'Upload failed'; // fastify responses don't throw
      }
    } catch (e: any) {                                     // in Electron, errors throw
      error = e.message;
    } finally {
      uploading = false;
      // Reset timing variables when upload finishes
      // elapsedTimeMs = 0;
      estimatedTimeRemainingMs = null;
    }
  };

  const toggleMetadataColumn = (column: string) => {
    if (column === selectedTextColumn) return;
    const index = selectedMetadataColumns.indexOf(column);
    if (index === -1) {
      selectedMetadataColumns = [...selectedMetadataColumns, column];
    } else {
      selectedMetadataColumns = selectedMetadataColumns.filter(c => c !== column);
    }
  };

  const toggleTextHandlingSectionCollapse = () => {
    isCollapsed = !isCollapsed;
  };

  const debouncedGeneratePreview = debounce(generatePreview, 1000);
  const debouncedRefinePreview = debounce(refinePreview, 1000);

  // Whole-file: only re-reads/re-transforms the CSV when the actual document set changes,
  // i.e. which column supplies the text. (selectedMetadataColumns is deliberately excluded:
  // it only controls which columns the already-fetched preview table displays client-side,
  // so it never affects pricing/splitting and shouldn't re-trigger a backend call.)
  $effect(() => {
    if (selectedTextColumn) {
      // Invalidate the cached sample immediately (generatePreview will repopulate it once it
      // resolves), so the sample-only effect below can't fire in the meantime using a sample
      // that belongs to the previous text column.
      sampleDocs = [];
      debouncedGeneratePreview();
    }
  });

  // Sample-only: re-previews the cached sample whenever chunking/model config changes.
  // selectedTextColumn and sampleDocs are read via untrack so this effect doesn't also fire
  // on text-column changes (handled above) or the moment the whole-file effect populates
  // sampleDocs (which would just re-run the same config against the same sample).
  $effect(() => {
    const params = {
      chunkSize,
      chunkOverlap,
      splitIntoSentences,
      combineSentencesIntoChunks,
      modelName,
      modelProvider,
    };

    const canRefine = untrack(() => !!selectedTextColumn && sampleDocs.length > 0);
    if (canRefine) {
      debouncedRefinePreview();
    }
  });

  const goBack = () => {
    navigate(basepath.replace(/\/+$/g, "") + "/");
  };
</script>

{#if fileData}
  <div class="bg-white p-6 rounded-lg shadow space-y-6 text-black mb-10">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">The Details: Set up semantic search for "{fileData.name}"</h2>
      <button
        onclick={goBack}
        class="text-sm text-gray-600 hover:text-gray-800 underline"
      >
        ← Choose A Different File
      </button>
    </div>
    
    <div class="text-sm text-gray-600">
      File size: {Math.round(fileData.size / 1024)} KB • 
      {fileData.availableColumns.length} columns detected
    </div>
  </div>

  <div data-testid="csv-upload-settings">
    <div class="bg-white p-6 rounded-lg shadow space-y-6 text-black mb-10">
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">
          Give the spreadsheet a name:
          <input
            type="text"
            data-testid="dataset-name-input"
            bind:value={datasetName}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
          />
        </label>
        <p class="text-xs text-gray-500">
          The name is just for you. Use something that will help you remember what this spreadsheet is.
        </p>
      </div>
      
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">
          What embedding provider should we use?
          <select
            bind:value={modelProvider}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500">
            <option value="openai" disabled={!availableModelOptions.openai}>OpenAI</option>
            <option value="azure" disabled={!availableModelOptions.azure}>Azure OpenAI</option>
            <option value="ollama" disabled={!availableModelOptions.ollama}>Ollama</option>
            <option value="mistral" disabled={!availableModelOptions.mistral}>Mistral AI</option>
            <option value="gemini" disabled={!availableModelOptions.gemini}>Google Gemini</option>
          </select>
        </label>  
        <p class="text-xs text-gray-500">
          The provider for the embedding model. {Object.keys(availableModelOptions).length === 0 ? 'No providers are configured yet. Please set up API keys in the settings.' : ''}
        </p>
      </div>
      
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">
          What embedding model should we use?
          <select
            bind:value={modelName}
            disabled={!availableModelOptions[modelProvider]}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed">
            {#each (availableModelOptions[modelProvider] || allModelOptions[modelProvider] || []) as modelNameChoice}
              <option value={modelNameChoice}>{modelNameChoice}</option>
            {/each}
          </select>
        </label>  
        <p class="text-xs text-gray-500">
          The model used to generate embeddings for the text.
        </p>
      </div>
    </div>
  
    <div class="bg-white p-6 rounded-lg shadow space-y-6 text-black mb-10">
      <h3>Column Configuration</h3>
      <div class="space-y-4">
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">
            Which column holds the text you want to search?
            <select
              bind:value={selectedTextColumn}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
              data-testid="column-to-embed-select"
            >
              <option value="">Select a column...</option>
              {#each fileData.availableColumns as column}
                <option value={column}>{column}</option>
              {/each}
            </select>
          </label>
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
            {#each fileData.availableColumns as column}
              <label class="inline-flex items-center">
                <input
                  type="checkbox"
                  id={`metadata-${column}`}
                  checked={selectedMetadataColumns.includes(column)}
                  disabled={column === selectedTextColumn}
                  onchange={() => toggleMetadataColumn(column)}
                  class="rounded border-gray-300 text-violet-600 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                />
                <span class="ml-2 text-sm text-gray-700">{column}</span>
              </label>
            {/each}
          </div>
        </div>
      </div>    
    </div>
    
    <div class="bg-white p-6 rounded-lg shadow space-y-6 text-black mb-10">
      <h3><button onclick={toggleTextHandlingSectionCollapse}>Text Handling Options {isCollapsed ? '›' : '⌄'}</button></h3>

      {#if !isCollapsed}
        <div class="space-y-6">
          <div class="space-y-2 flex flex-wrap gap-2">
            <p>Each text might contain multiple ideas. Meaningfully tries to represent these ideas at multiple levels, returning search results of a 1, 2 or 3 sentences long</p>
            <label class="inline-flex items-center">
              <input
                type="checkbox"
                bind:checked={splitIntoSentences}
                class="rounded border-gray-300 text-violet-600 shadow-sm focus:border-violet-500 focus:ring-violet-500"
              />
              <span class="ml-2 text-sm text-gray-700">Split into sentences?</span>
            </label>
            <label class="inline-flex items-center">
              <input
                type="checkbox"
                bind:checked={combineSentencesIntoChunks}
                class="rounded border-gray-300 text-violet-600 shadow-sm focus:border-violet-500 focus:ring-violet-500"
              />
              <span class="ml-2 text-sm text-gray-700">Combine sentences into chunks?</span>
            </label>
          </div>

          <div class="space-y-2">
            <h3>Split long sentences into chunks</h3>
            <div class="flex flex-wrap gap-2">
              <div class="inline-flex max-w-md p-2">
                <label class="block text-sm font-medium text-gray-700">
                  Chunk size:
                  <input
                    type="number"
                    bind:value={chunkSize}
                    min="50"
                    max="1000"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                  />
                </label>
              </div>
              <div class="inline-flex max-w-md p-2">
                <label class="block text-sm font-medium text-gray-700">
                  Chunk overlap:
                  <input
                    type="number"
                    bind:value={chunkOverlap}
                    min="0"
                    max="100"
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring-violet-500"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
    
    <div class="bg-white p-6 rounded-lg shadow space-y-6 text-black mb-10">
      {#key costEstimate}
        {#key tokenCount}
          {#key pricePer1M }
            {#if tokenCount > 0 && costEstimate > 0}
              <div data-testid="cost-estimate">
                <h3>Cost Estimate</h3>
                <p class="text-sm text-gray-600">
                  Estimated cost: <strong>${costEstimate.toFixed(4)}</strong> 
                  ({tokenCount.toLocaleString()} tokens at ${pricePer1M !== undefined ? pricePer1M.toFixed(2) : 'N/A'} per 1M tokens)
                </p>
              </div>
            {/if}
          {/key}
        {/key}
      {/key}
      
      {#key previewData}
        {#key selectedTextColumn}
          {#key selectedMetadataColumns}
            {#if (previewData.length > 0 || generatingPreview) && selectedTextColumn}
              <Preview
                previewData={previewData}
                textColumn={selectedTextColumn}
                metadataColumns={selectedMetadataColumns}
                loading={generatingPreview}
              />
            {/if}
          {/key}
        {/key}
      {/key}

      <button
        onclick={handleUpload}
        data-testid="upload-button"
        disabled={!selectedTextColumn || uploading || !validApiKeysSet}
        class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? 'Uploading...' : 'Upload Spreadsheet'}
      </button>
      
      {#if uploading}
        <p>This could take a few minutes. Go get a cup of coffee or re-arrange your MySpace Top 8.</p>
        <div class="w-full bg-gray-200 rounded-full h-4 mt-2">
          <div 
            class="bg-violet-600 h-4 rounded-full transition-all duration-500" 
            style="width: {Math.min(100, Math.round((progress / progressTotal) * 100))}%"
          ></div>
        </div>
        <div class="text-sm text-gray-600 mt-2 space-y-1">
          <p>
            Progress: {progress <= 5 ? 'processing upload' : ( progress >= 95 ? 'finishing up' : 'embedding') }  ({Math.round((progress / progressTotal) * 100)}%)
            {#if estimatedTimeRemainingMs !== null}
              | {formatTime(estimatedTimeRemainingMs)} remaining (est.)
            {/if}
          </p>
        </div>
      {/if }
    </div>
  </div>
{:else}
  <div class="bg-white p-6 rounded-lg shadow space-y-6 text-black mb-10">
    <p>Loading file data...</p>
  </div>
{/if}

{#if error}
  <div class="mt-4 text-red-600">{error}</div>
{/if}
