<script lang="ts">
  import { onMount } from 'svelte';
  import { Router, Route, Link } from "svelte-routing";
  import SearchPage from './components/SearchPage.svelte'
  import FrontPage from './components/FrontPage.svelte'
  import DatabaseConfig from './components/DatabaseConfig.svelte'
  import ApiKeyPage from './components/ApiKeyPage.svelte'
  import HelpPage from './components/HelpPage.svelte'
  import ApiKeyStatus from './components/ApiKeyStatus.svelte'
  import type { MeaningfullyAPI } from './types.js';

  interface Props {
    api: MeaningfullyAPI;
    basePath: string;
  }
  let { api, basePath }: Props = $props();
  
  let basepath = $state(basePath || '');
  console.log("basepath App", basepath);
  let url = $state('');
  // Ensure $state returns Settings | null
  let settings = $state<Settings | null>(null);

  const getSettings = async () => {
      try {
          settings = await api.getSettings();
      } catch (error) {
          console.error('Error fetching settings:', error);
      }
  };
  
  let validApiKeysSet: boolean = $derived(
    !!settings && (
      (!!settings.openAIKey) || 
      (!!settings.oLlamaBaseURL) ||
      (!!settings.azureOpenAIKey && !!settings.azureOpenAIEndpoint) ||
      (!!settings.mistralApiKey) ||
      (!!settings.geminiApiKey)
    )
  );

  onMount(getSettings);

</script>

<!-- <img alt="logo" class="logo" src={electronLogo} /> -->

<Router url={url} basepath={basepath}>
  <Link to="/">
    <h1 class="text-2xl font-bold">
      Meaningfully
    </h1>
  </Link>

  <h2 class="text-xl font-semibold">
    Semantic search for your spreadsheets
  </h2>

  {#if settings}
    <ApiKeyStatus settings={settings} validApiKeysSet={validApiKeysSet} />
  {/if}

  <main class="container mx-auto px-4 py-8">
    <Route path="">
      <FrontPage validApiKeysSet={validApiKeysSet} api={api} />
    </Route>
    <Route path="configure-upload">
      <DatabaseConfig validApiKeysSet={validApiKeysSet} api={api} />
    </Route>
    <Route path="search/:id" let:params>
      <SearchPage validApiKeysSet={validApiKeysSet} documentSetId={Number(params.id)} api={api} />
    </Route>
    <Route path="help">
      <HelpPage />
    </Route>
    <Route path="settings">
      {#if settings}
        <ApiKeyPage settings={settings} settingsUpdated={() => getSettings() } api={api} />
      {/if}
    </Route>
  </main>

  <nav class="navbar">
    <Link to="" class="nav-link underline text-blue-600 hover:text-blue-800 visited:text-purple-600">Home</Link>
    <Link to="help" class="nav-link underline text-blue-600 hover:text-blue-800 visited:text-purple-600">Help</Link>
    <Link to="settings" class="nav-link underline text-blue-600 hover:text-blue-800 visited:text-purple-600">Settings / API Keys</Link>
    <a href="https://github.com/jeremybmerrill/meaningfully" target="_blank" class="nav-link underline text-blue-600 hover:text-blue-800 visited:text-purple-600">GitHub</a>
    <span class="nav-link creator">Built with ✨ by Jeremy</span>
    <span class="nav-link">© 2025</span>
  </nav>

</Router>
