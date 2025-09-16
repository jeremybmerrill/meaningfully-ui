import type { MeaningfullyAPI } from '../types.js';
interface Props {
    api: MeaningfullyAPI;
}
declare const ExistingDatabases: import("svelte").Component<Props, {
    hide: () => void;
    show: () => void;
    loadDocumentSets: (page?: number) => Promise<void>;
}, "">;
type ExistingDatabases = ReturnType<typeof ExistingDatabases>;
export default ExistingDatabases;
