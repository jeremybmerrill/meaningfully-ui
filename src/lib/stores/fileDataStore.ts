import { writable } from 'svelte/store';
import type { ColumnStats } from '../columnStats.js';

// Define the interface for file data
export interface FileData {
    name: string;
    size: number;
    lastModified: number;
    availableColumns: string[];
    // summaries of each column, to help users tell columns apart; computed from the first statsRowCount rows
    columnStats?: Record<string, ColumnStats>;
    statsRowCount?: number;
    statsTruncated?: boolean; // true if the file has more rows than were used for columnStats
    fileContent: string; // or ArrayBuffer, depending on usage
}

// Define a Svelte writable store for file data
export const fileDataStore = writable<FileData | null>(null);
