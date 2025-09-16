interface Props {
    previewData?: Array<Record<string, any>>;
    textColumn: string;
    metadataColumns?: string[];
    loading?: boolean;
}
declare const Preview: import("svelte").Component<Props, {}, "">;
type Preview = ReturnType<typeof Preview>;
export default Preview;
