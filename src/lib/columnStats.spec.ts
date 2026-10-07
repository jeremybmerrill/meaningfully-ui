import { describe, it, expect } from 'vitest';
import { computeColumnStats, classifyColumn } from './columnStats.js';

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

  it('guesses what kind of data each column holds', () => {
    expect(stats.id.kind).toBe('id');
    expect(stats.status.kind).toBe('categorical');
    expect(stats.empty.kind).toBeUndefined();
  });
});

describe('classifyColumn', () => {
  const kindOf = (name: string, values: string[]) => {
    const stats = computeColumnStats(values.map(v => ({ [name]: v })), [name]);
    return stats[name].kind;
  };

  it('recognizes prose as text', () => {
    expect(kindOf('description', [
      'The streetlight at the corner has been out for two weeks.',
      'Large pothole in the right lane, near the bus stop.',
      'Neighbors report loud music after midnight most weekends.',
      'Graffiti on the north wall of the library.'
    ])).toBe('text');
  });

  it('recognizes repeated short values as categorical', () => {
    expect(kindOf('status', ['Open', 'Closed', 'Closed', 'Open', 'Pending', 'Closed'])).toBe('categorical');
  });

  it('counts numbers with a few repeated values, like years and ratings, as categorical', () => {
    expect(kindOf('year', ['2021', '2022', '2022', '2023', '2021', '2024', '2023', '2022'])).toBe('categorical');
    expect(kindOf('rating', ['4', '5', '3', '5', '4', '4', '1', '5'])).toBe('categorical');
  });

  it('recognizes numbers, money, percentages and dates as numeric', () => {
    expect(kindOf('amount', ['$1,200.50', '$35', '$980.00', '$12,000', '$7.25'])).toBe('numeric');
    expect(kindOf('rate', ['12%', '3.5%', '-0.25%', '40%'])).toBe('numeric');
    expect(kindOf('salary', ['52000', '61000', '48500', '75250', '99000'])).toBe('numeric');
    expect(kindOf('opened', ['2024-03-11', '2024-03-12', '2024-04-01T09:30:00Z', '2023-12-31'])).toBe('numeric');
    expect(kindOf('opened', ['3/11/2024', '3/12/2024', '12/1/23', '1/5/2024'])).toBe('numeric');
  });

  it('recognizes links, emails, codes and ID columns as IDs', () => {
    expect(kindOf('link', ['https://example.gov/1', 'https://example.gov/2', 'www.example.com/3'])).toBe('id');
    expect(kindOf('contact', ['a@example.com', 'b@example.org', 'c.d@example.net'])).toBe('id');
    expect(kindOf('case_number', ['CR-2024-0012', 'CR-2024-0013', 'CV-2023-0981', 'CR-2024-0101'])).toBe('id');
    expect(kindOf('id', ['48213', '48214', '48215', '48216'])).toBe('id');
    expect(kindOf('RecordID', ['1', '2', '3', '4'])).toBe('id');
  });

  it('tolerates a few stray values', () => {
    const amounts = Array.from({ length: 19 }, (_, i) => String(i * 10 + 5));
    expect(kindOf('amount', [...amounts, 'N/A'])).toBe('numeric');
  });

  it('returns undefined for empty columns', () => {
    expect(classifyColumn('x', [], 0, false)).toBeUndefined();
  });
});
