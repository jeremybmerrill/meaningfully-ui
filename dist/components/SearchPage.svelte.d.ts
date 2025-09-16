import type { MeaningfullyAPI } from '../types';
interface Props {
    validApiKeysSet: boolean;
    documentSetId: number;
    api: MeaningfullyAPI;
}
declare const SearchPage: import("svelte").Component<Props, {}, "">;
type SearchPage = ReturnType<typeof SearchPage>;
export default SearchPage;
