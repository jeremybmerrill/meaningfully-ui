<script lang="ts">
  import { navigate } from 'svelte-routing';
  import Papa from 'papaparse';
  import { fileDataStore } from '../stores/fileDataStore.js';

  let {
    validApiKeysSet,
    basepath
  } = $props();

  let error = $state('');
  let selectedFile: File | null = $state(null);
  let isProcessing = $state(false);
  let isDragOver = $state(false);
  let fileInput: HTMLInputElement | undefined = $state();
  // Incremented on each selection so stale Papa.parse/FileReader callbacks from a superseded file can be ignored.
  let selectionToken = 0;

  const selectFile = (file: File) => {
    if (isProcessing) return;
    error = '';
    selectedFile = file;
    isProcessing = true;
    handleUpload(file, ++selectionToken);
  };

  const handleFileInputChange = (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    selectFile(input.files[0]);
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    isDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) selectFile(file);
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    isDragOver = true;
  };

  const handleDragLeave = () => {
    isDragOver = false;
  };

  const openFilePicker = () => {
    if (!validApiKeysSet || isProcessing) return;
    fileInput?.click();
  };

  const handleDropzoneKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFilePicker();
    }
  };

  const handleUpload = async (file: File, token: number) => {
    if (!validApiKeysSet) return;

    // Parse CSV to get column names and validate it's a valid CSV
    Papa.parse(file, {
      complete: async (results) => {
        if (token !== selectionToken) return;

        if (results.errors.length > 0) {
          isProcessing = false;
          error = `That file (${file.name}) is invalid. Choose another CSV file`;
          console.error('CSV parsing errors:', results.errors);
          return;
        }

        const availableColumns = results.meta.fields || [];
        if (availableColumns.length === 0) {
          isProcessing = false;
          error = `That file (${file.name}) is invalid. Choose another CSV file`;
          return;
        }

        // Store file data in sessionStorage for the next step
        const fileData = {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          availableColumns,
        };

        // Store the actual file as a base64 string
        const reader = new FileReader();
        reader.onload = () => {
          if (token !== selectionToken) return;

          let fileContent = reader.result as string;

          // Check if it's already a file URL encoded -- which is base64 encoded and starts with data:text/csv;base64, prefix
          // in real life it always will be since we used readAsDataURL, but not in test, for some reason
          // probably due to a webdriver quirk.
          // or maybe due to me understanding my build pipeline wrong? in which case this might be unnecessary.
          if (!fileContent.startsWith('data:')) {
            // only needed in test.
            fileContent = 'data:text/csv;base64,' + btoa(fileContent);
          }

          fileDataStore.set({
            ...fileData,
            fileContent
          });
          isProcessing = false;
          // Navigate to configuration page
          navigate(basepath.replace(/\/+$/g, "") + "/configure-upload");

        };
        reader.readAsDataURL(file);
      },
      header: true,
      skipEmptyLines: true,
      preview: 10 // Only parse first 10 rows for validation
    });
  };
</script>

<div class="bg-white p-6 rounded-lg shadow space-y-6 text-black mb-10" data-testid="upload-a-spreadsheet">
  <h2 class="text-xl font-semibold mb-[2px]">Upload a Spreadsheet</h2>

  <p class="text-gray-700 text-[10px]">CSVs up to 10,000 rows work great. Those with more than 10,000 rows may be slow or could fail. Modify the CSV beforehand to ensure the CSV has exactly one header row.</p>

  <input
    bind:this={fileInput}
    type="file"
    accept=".csv"
    onchange={handleFileInputChange}
    disabled={!validApiKeysSet || isProcessing}
    class="hidden"
  />

  <div
    role="button"
    tabindex={validApiKeysSet && !isProcessing ? 0 : -1}
    aria-disabled={!validApiKeysSet || isProcessing}
    onclick={openFilePicker}
    onkeydown={handleDropzoneKeydown}
    ondrop={handleDrop}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    class="block w-full rounded-lg border-2 border-dashed p-6 text-center text-sm text-slate-500 transition-colors
      {isDragOver ? 'border-violet-500 bg-violet-50' : 'border-slate-300'}
      {validApiKeysSet && !isProcessing ? 'cursor-pointer hover:border-violet-400 hover:bg-violet-50' : 'opacity-50 cursor-not-allowed'}
    "
  >
    {#if selectedFile}
      <span class="font-semibold text-violet-700">{selectedFile.name}</span>
      {#if isProcessing}
        <span class="block text-xs text-slate-400 mt-1">processing...</span>
      {/if}
    {:else}
      Drag and drop a CSV file here, or click to choose a file
    {/if}
  </div>

  {#if !validApiKeysSet}
    <p class="text-sm text-gray-600">
      Please configure your API keys in Settings before uploading a file.
    </p>
  {/if}

  {#if error}
    <div class="mt-4 text-red-600">{error}</div>
  {/if}
</div>
