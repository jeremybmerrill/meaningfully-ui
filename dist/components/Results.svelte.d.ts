interface Props {
    results?: Array<Record<string, any>>;
    textColumn: string;
    metadataColumns?: string[];
    loading?: boolean;
    originalDocumentClick?: (sourceNodeId: string) => void;
}
declare const Results: import("svelte").Component<Props, {}, "">;
type Results = ReturnType<typeof Results>;
export default Results;
