export interface FileData {
    name: string;
    size: number;
    lastModified: number;
    availableColumns: string[];
    fileContent: string;
}
export declare const fileDataStore: import("svelte/store").Writable<FileData | null>;
