// Per-column summaries shown on the column cards when configuring an upload,
// to help users tell columns apart and decide what each one is for.

// A guess at what a column holds, used to hint which bin it belongs in:
//  - text: prose to search (descriptions, comments, transcripts)
//  - categorical: a handful of repeated values (status, category, neighborhood, year, rating)
//  - numeric: numbers and dates
//  - id: identifiers and links (IDs, codes, URLs, email addresses)
export type ColumnKind = 'text' | 'categorical' | 'numeric' | 'id';

export interface ColumnStats {
  uniqueCount: number;
  nonEmptyCount: number;
  sample?: string;       // first non-empty value
  topValues?: string[];  // for apparently categorical columns: the most common values, most common first
  kind?: ColumnKind;     // undefined for empty columns
}

// A column looks categorical if it has at least this many non-empty values...
export const MIN_CATEGORICAL_VALUES = 2;
// ...and either fewer unique values than this fraction of the rows,
export const MAX_CATEGORICAL_UNIQUE_RATIO = 0.33;
// ...or (so the ratio doesn't rule out nearly everything in small files) at most this many
// unique values, as long as some value repeats.
export const MAX_SMALL_CATEGORICAL_UNIQUE = 10;
export const TOP_VALUES_SHOWN = 5;

// A column "is" a type (numeric, URL, ...) if at least this fraction of its non-empty values look like it,
// so a few stray values (like "N/A") don't change the guess.
const TYPE_MATCH_RATIO = 0.9;
// A column looks like IDs if nearly every value is different...
const ID_UNIQUE_RATIO = 0.9;
// ...and values are short and have no spaces.
const MAX_ID_LENGTH = 40;

const NUMBER = /^[-+]?[$€£¥]?\s?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?(e[-+]?\d+)?\s?%?$/i;
const DATE = /^(\d{4}-\d{1,2}-\d{1,2}([T ]\S.*)?|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}( .*)?)$/;
const INTEGER = /^\d+$/;
const LINK = /^(https?:\/\/|www\.)\S+$|^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
// column names like "id", "case_id", "RecordID", "key", "case no", "#"
const ID_NAME = /(^|[\s_-])(id|key|no|num|#)$|[a-z]Id$|^#|^id[\s_-]/i;

const mostly = (values: string[], test: (value: string) => boolean) =>
  values.filter(test).length >= values.length * TYPE_MATCH_RATIO;

export function classifyColumn(name: string, values: string[], uniqueCount: number, isCategorical: boolean): ColumnKind | undefined {
  if (values.length === 0) return undefined;
  const mostlyUnique = uniqueCount >= values.length * ID_UNIQUE_RATIO;
  if (mostly(values, v => LINK.test(v))) return 'id';
  // unique whole numbers could be IDs or amounts; go by the column's name
  if (mostlyUnique && ID_NAME.test(name) && mostly(values, v => INTEGER.test(v))) return 'id';
  // checked before numeric, so numbers with a few repeated values (years, ratings) count as categories
  if (isCategorical) return 'categorical';
  if (mostly(values, v => (NUMBER.test(v) && /\d/.test(v)) || DATE.test(v))) return 'numeric';
  if (mostlyUnique && mostly(values, v => v.length <= MAX_ID_LENGTH && !/\s/.test(v))) return 'id';
  return 'text';
}

export function computeColumnStats(rows: Record<string, unknown>[], columns: string[]): Record<string, ColumnStats> {
  const stats: Record<string, ColumnStats> = {};
  for (const column of columns) {
    const counts = new Map<string, number>();
    const values: string[] = [];
    for (const row of rows) {
      const value = String(row[column] ?? '').trim();
      if (!value) continue;
      values.push(value);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const nonEmptyCount = values.length;
    const sample = values[0];
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
        : undefined,
      kind: classifyColumn(column, values, uniqueCount, isCategorical)
    };
  }
  return stats;
}
