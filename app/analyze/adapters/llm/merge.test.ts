import type { DiffGroup } from '../../../types/analyze'
import { describe, expect, it } from 'vitest'
import { mergeGroups } from './merge'

describe('mergeGroups', () => {
  it('keeps groups with distinct keys separate', () => {
    const groups: DiffGroup[] = [
      { key: 'code', label: 'Code', filePaths: ['a.ts'] },
      { key: 'docs', label: 'Docs', filePaths: ['README.md'] },
    ]
    expect(mergeGroups(groups)).toEqual(groups)
  })

  it('merges same-key groups across chunks, concatenating filePaths and summaries', () => {
    const groups: DiffGroup[] = [
      { key: 'tests', label: 'Tests', summary: 'Part one.', filePaths: ['a.test.ts'] },
      { key: 'tests', label: 'Tests', summary: 'Part two.', filePaths: ['b.test.ts'] },
    ]
    const merged = mergeGroups(groups)
    expect(merged).toHaveLength(1)
    expect(merged[0]?.filePaths).toEqual(['a.test.ts', 'b.test.ts'])
    expect(merged[0]?.summary).toBe('Part one. Part two.')
  })

  it('merges children with matching keys across chunks', () => {
    const groups: DiffGroup[] = [
      { key: 'feature', label: 'Feature', filePaths: [], children: [{ key: 'feature/a', label: 'A', filePaths: ['a.ts'] }] },
      { key: 'feature', label: 'Feature', filePaths: [], children: [{ key: 'feature/a', label: 'A', filePaths: ['a2.ts'] }, { key: 'feature/b', label: 'B', filePaths: ['b.ts'] }] },
    ]
    const merged = mergeGroups(groups)
    expect(merged).toHaveLength(1)
    expect(merged[0]?.children).toHaveLength(2)
    expect(merged[0]?.children?.find(c => c.key === 'feature/a')?.filePaths).toEqual(['a.ts', 'a2.ts'])
    expect(merged[0]?.children?.find(c => c.key === 'feature/b')?.filePaths).toEqual(['b.ts'])
  })

  it('does not mutate the input groups', () => {
    const groups: DiffGroup[] = [{ key: 'code', label: 'Code', filePaths: ['a.ts'] }]
    mergeGroups(groups)[0]!.filePaths.push('mutated.ts')
    expect(groups[0]?.filePaths).toEqual(['a.ts'])
  })
})
