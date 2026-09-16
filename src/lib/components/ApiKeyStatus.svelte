<script lang="ts">
    import { Link } from 'svelte-routing'
    interface Props {
        settings: Settings; // TODO: replace with $props call in Svelte5 
        validApiKeysSet: boolean;
    }

    let {  validApiKeysSet }: Props = $props();
</script>

{#if !validApiKeysSet }
    <div class="alert" data-testid="api-key-status">
        <p>No OpenAI API key is set. Please <Link to="settings" class="text-blue text-decoration-line"><span class="text-blue text-decoration-line">add one</span></Link> (or details for another provider) in order to use Meaningfully.</p>
    </div>
{/if}


<style>
.alert {
    padding: 10px;
    background-color: var(--color-alert-bg);
    color: var(--color-alert-text);
    border: 1px solid var(--color-alert-border);
    border-radius: var(--radius-md);
    margin-top: 20px;
    font-family: var(--font-body);
}
.alert :global(a) { /* hack */
    color: var(--color-blue-600);
    text-decoration: underline;
    cursor: pointer;
    font-weight: bold;
}
</style>
