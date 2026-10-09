// How to show a column's name in the UI. A CSV can have a column with a blank header,
// which would otherwise show up as nothing at all.
export const displayColumnName = (name: string): string => name.trim() ? name : '<blank>';
