interface Props {
    data?: Array<Record<string, any>>;
    textColumn: string;
    metadataColumns?: string[];
    showSimilarity?: boolean;
    showShowOriginal?: boolean;
    originalDocumentClick?: (sourceNodeId: string) => void;
}
declare const Table: import("svelte").Component<Props, {}, "">;
type Table = ReturnType<typeof Table>;
export default Table;
