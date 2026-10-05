// Per-column summaries shown on the column cards when configuring an upload,
// to help users tell columns apart and decide what each one is for.

export interface ColumnStats {
  uniqueCount: number;
  nonEmptyCount: number;
  sample?: string;       // first non-empty value
  topValues?: string[];  // for apparently categorical columns: the most common values, most common first
}

// A column looks categorical if it has at least this many non-empty values...
export const MIN_CATEGORICAL_VALUES = 2;
// ...and either fewer unique values than this fraction of the rows,
export const MAX_CATEGORICAL_UNIQUE_RATIO = 0.33;
// ...or (so the ratio doesn't rule out nearly everything in small files) at most this many
// unique values, as long as some value repeats.
export const MAX_SMALL_CATEGORICAL_UNIQUE = 10;
export const TOP_VALUES_SHOWN = 5;

export function computeColumnStats(rows: Record<string, unknown>[], columns: string[]): Record<string, ColumnStats> {
  const stats: Record<string, ColumnStats> = {};
  for (const column of columns) {
    const counts = new Map<string, number>();
    let nonEmptyCount = 0;
    let sample: string | undefined;
    for (const row of rows) {
      const value = String(row[column] ?? '').trim();
      if (!value) continue;
      nonEmptyCount++;
      sample ??= value;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const uniqueCount = counts.size;
    const isCategorical = nonEmptyCount >= MIN_CATEGORICAL_VALUES && (
      uniqueCount < rows.length * MAX_CATEGORICAL_UNIQUE_RATIO ||
      (uniqueCount <= MAX_SMALL_CATEGORICAL_UNIQUE && uniqueCount < nonEmptyCount)
    );
    stats[column] = {
      uniqueCount,
      nonEmptyCount,
      sample,
      // sort is stable, so ties stay in order of first appearance
      topValues: isCategorical
        ? [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_VALUES_SHOWN).map(([value]) => value)
        : undefined
    };
  }
  return stats;
}
