<script lang="ts">
    import ExistingDatabases from './ExistingDatabases.svelte'
    import CsvUpload from './CsvUpload.svelte'
  import type { MeaningfullyAPI } from '../types';

    interface Props {
      validApiKeysSet: boolean;
      api: MeaningfullyAPI;
    }

    let { validApiKeysSet, api }: Props = $props();
</script>

<div class="container mx-auto px-4 space-y-8">
    <CsvUpload validApiKeysSet={validApiKeysSet} />
    <ExistingDatabases api={api} />
</div>
  