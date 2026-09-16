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
    basepath: string;
  }
  let { api, basepath }: Props = $props();
  
  // basepath must not be blank;
  // unclear if it needs a trailing slash when using a subpath.
  let basepath_app = $state(basepath || '/');
  console.log(`basepath App "${basepath_app}" (prop: "${basepath}")`);
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

  // Secret: typing "top8" (outside a form field) flips the app into the
  // "Personal Page" look. Typing it again flips back to the Card Catalog default.
  const secretPassword = 'top8';
  let secretBuffer = '';

  const isTypingInAField = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
  };

  const applyPersonalPageTheme = (enabled: boolean) => {
    if (enabled) {
      document.documentElement.setAttribute('data-theme', 'personal-page');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const handleSecretKeydown = (event: KeyboardEvent) => {
    if (isTypingInAField(event.target) || event.key.length !== 1) return;
    secretBuffer = (secretBuffer + event.key.toLowerCase()).slice(-secretPassword.length);
    if (secretBuffer === secretPassword) {
      secretBuffer = '';
      applyPersonalPageTheme(document.documentElement.getAttribute('data-theme') !== 'personal-page');
    }
  };

  let validApiKeysSet: boolean = $derived(
    !!settings && (
      (!!settings.openAIKey) || 
      (!!settings.oLlamaBaseURL) ||
      (!!settings.lmStudioBaseURL) ||
      (!!settings.azureOpenAIKey && !!settings.azureOpenAIEndpoint) ||
      (!!settings.mistralApiKey) ||
      (!!settings.geminiApiKey)
    )
  );

  onMount(() => {
    getSettings();
    window.addEventListener('keydown', handleSecretKeydown);
    return () => window.removeEventListener('keydown', handleSecretKeydown);
  });

</script>

<!-- <img alt="logo" class="logo" src={electronLogo} /> -->

<Router url={url} basepath={basepath_app}>
  <header class="mf-header">
    <div>
      <Link to="/">
        <div class="mf-wordmark-row">
          <span class="mf-sparkle" aria-hidden="true">✦</span>
          <h1 class="mf-wordmark">Meaningfully</h1>
          <span class="mf-sparkle" aria-hidden="true">✦</span>
        </div>
      </Link>
      <h2 class="mf-tagline">
        Semantic search for your spreadsheets
      </h2>
    </div>
  </header>

  {#if settings}
    <ApiKeyStatus settings={settings} validApiKeysSet={validApiKeysSet} />
  {/if}

  <main class="container mx-auto px-4 py-8">
    <Route path="">
      <FrontPage validApiKeysSet={validApiKeysSet} api={api} basepath={basepath_app} />
    </Route>
    <Route path="configure-upload">
      <DatabaseConfig validApiKeysSet={validApiKeysSet} api={api} basepath={basepath_app} />
    </Route>
    <Route path="search/:id" let:params>
      <SearchPage validApiKeysSet={validApiKeysSet} documentSetId={Number(params.id)} api={api} basepath={basepath_app} />
    </Route>
    <Route path="help">
      <HelpPage />
    </Route>
    <Route path="settings">
      {#if settings}
        <ApiKeyPage settings={settings} settingsUpdated={() => getSettings() } api={api} basepath={basepath_app} />
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
