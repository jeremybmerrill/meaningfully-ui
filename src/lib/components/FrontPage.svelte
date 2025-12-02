<script lang="ts">
    import ExistingDatabases from './ExistingDatabases.svelte'
    import CsvUpload from './CsvUpload.svelte'
    import type { MeaningfullyAPI } from '../types';
    import { Link } from 'svelte-routing';

    interface Props {
      validApiKeysSet: boolean;
      api: MeaningfullyAPI;
      basepath: string;
    }

    let { validApiKeysSet, api, basepath }: Props = $props();
</script>

<div class="container mx-auto px-4 space-y-8">
    <CsvUpload validApiKeysSet={validApiKeysSet} basepath={basepath} />
    <ExistingDatabases api={api} />
    <div class="max-w-2xl mx-auto text-left leading-tight space-y-2">
      Meaningfully is a semantic search tool for text data in spreadsheets. Search by the meaning of a sentence instead of keywords. <Link to="help" class="nav-link underline text-blue-600 hover:text-blue-800 visited:text-purple-600">Learn more</Link>.
    </div>
</div>
