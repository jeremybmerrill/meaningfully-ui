import { describe, it, expect } from 'vitest';
import { computeColumnStats } from './columnStats.js';

const rows = [
  { id: '1', status: 'Open', notes: 'first', empty: '' },
  { id: '2', status: 'Closed', notes: '', empty: '' },
  { id: '3', status: 'Closed', notes: 'third', empty: ' ' },
  { id: '4', status: 'Closed', notes: 'fourth', empty: '' },
  { id: '5', status: 'Open', notes: 'fifth', empty: '' },
  { id: '6', status: 'Pending', notes: 'sixth', empty: '' },
  { id: '7', status: 'Closed', notes: 'seventh', empty: '' },
  { id: '8', status: ' Closed ', notes: 'eighth', empty: '' },
  { id: '9', status: 'Open', notes: 'ninth', empty: '' },
  { id: '10', status: 'Closed', notes: 'tenth', empty: '' }
];

describe('computeColumnStats', () => {
  const stats = computeColumnStats(rows, ['id', 'status', 'notes', 'empty']);

  it('counts unique and non-empty values, trimming whitespace', () => {
    expect(stats.id).toMatchObject({ uniqueCount: 10, nonEmptyCount: 10, sample: '1' });
    expect(stats.status).toMatchObject({ uniqueCount: 3, nonEmptyCount: 10, sample: 'Open' });
    expect(stats.notes).toMatchObject({ uniqueCount: 9, nonEmptyCount: 9, sample: 'first' });
    expect(stats.empty).toMatchObject({ uniqueCount: 0, nonEmptyCount: 0, sample: undefined });
  });

  it('lists the most common values for categorical columns', () => {
    expect(stats.status.topValues).toEqual(['Closed', 'Open', 'Pending']);
  });

  it('does not treat mostly-unique or empty columns as categorical', () => {
    expect(stats.id.topValues).toBeUndefined();
    expect(stats.notes.topValues).toBeUndefined();
    expect(stats.empty.topValues).toBeUndefined();
  });

  it('treats columns with a few repeated values as categorical, even in small files', () => {
    // 4 unique values in 6 rows is over the ratio, but small enough to list
    const small = computeColumnStats(['a', 'b', 'a', 'c', 'd', 'a'].map(a => ({ a })), ['a']);
    expect(small.a.topValues).toEqual(['a', 'b', 'c', 'd']);
    // ...unless nothing repeats, like an ID column
    const ids = computeColumnStats(['1', '2', '3', '4'].map(a => ({ a })), ['a']);
    expect(ids.a.topValues).toBeUndefined();
    // ...or there are too many unique values
    const many = computeColumnStats([...'abcdefghijkk'].map(a => ({ a })), ['a']);
    expect(many.a.topValues).toBeUndefined();
  });

  it('needs at least two non-empty values to be categorical', () => {
    const sparse = computeColumnStats([{ a: 'x' }, { a: '' }, { a: '' }, { a: '' }], ['a']);
    expect(sparse.a.topValues).toBeUndefined();
    const two = computeColumnStats([{ a: 'x' }, { a: 'x' }, { a: '' }, { a: '' }], ['a']);
    expect(two.a.topValues).toEqual(['x']);
  });
});
