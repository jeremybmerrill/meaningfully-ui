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
  let isDragOver = $state(false);
  let fileInput: HTMLInputElement | undefined = $state();

  const selectFile = (file: File) => {
    error = '';
    selectedFile = file;
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
    if (!validApiKeysSet) return;
    fileInput?.click();
  };

  const handleDropzoneKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFilePicker();
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    const file = selectedFile;

    // Parse CSV to get column names and validate it's a valid CSV
    Papa.parse(file, {
      complete: async (results) => {
        if (results.errors.length > 0) {
          error = 'Invalid CSV file';
          console.error('CSV parsing errors:', results.errors);
          return;
        }

        const availableColumns = results.meta.fields || [];
        if (availableColumns.length === 0) {
          error = 'CSV file has no columns';
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
    disabled={!validApiKeysSet}
    class="hidden"
  />

  <div
    role="button"
    tabindex={validApiKeysSet ? 0 : -1}
    aria-disabled={!validApiKeysSet}
    onclick={openFilePicker}
    onkeydown={handleDropzoneKeydown}
    ondrop={handleDrop}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    class="block w-full rounded-lg border-2 border-dashed p-6 text-center text-sm text-slate-500 transition-colors
      {isDragOver ? 'border-violet-500 bg-violet-50' : 'border-slate-300'}
      {validApiKeysSet ? 'cursor-pointer hover:border-violet-400 hover:bg-violet-50' : 'opacity-50 cursor-not-allowed'}
    "
  >
    {#if selectedFile}
      <span class="font-semibold text-violet-700">{selectedFile.name}</span>
      <span class="block text-xs text-slate-400 mt-1">Click or drag a different CSV file to replace it</span>
    {:else}
      Drag and drop a CSV file here, or click to choose a file
    {/if}
  </div>

  {#if selectedFile}
    <button
      type="button"
      data-testid="upload-file-button"
      onclick={handleUpload}
      disabled={!validApiKeysSet}
      class="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white
        hover:bg-violet-700
        disabled:opacity-50 disabled:cursor-not-allowed
      "
    >
      Upload
    </button>
  {/if}

  {#if !validApiKeysSet}
    <p class="text-sm text-gray-600">
      Please configure your API keys in Settings before uploading a file.
    </p>
  {/if}

  {#if error}
    <div class="mt-4 text-red-600">{error}</div>
  {/if}
</div>
