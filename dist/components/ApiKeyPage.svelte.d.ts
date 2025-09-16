import type { MeaningfullyAPI } from '../types';
interface Props {
    settings: Settings;
    settingsUpdated: () => void;
    api: MeaningfullyAPI;
}
declare const ApiKeyPage: import("svelte").Component<Props, {}, "">;
type ApiKeyPage = ReturnType<typeof ApiKeyPage>;
export default ApiKeyPage;
