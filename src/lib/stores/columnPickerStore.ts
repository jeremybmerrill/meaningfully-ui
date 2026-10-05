import { writable } from 'svelte/store';

// When true, the upload settings page shows the previous column-selection interface
// (LegacyColumnPicker) instead of ColumnSorter. Toggled by typing "oldpicker" (see App.svelte).
export const useLegacyColumnPicker = writable(false);
