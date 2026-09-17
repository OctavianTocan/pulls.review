import type { DiffsPayload } from '../../../types/diff'
import { describe, expect, it } from 'vitest'
import { noneAdapter } from './index'

function file(path: string): DiffsPayload['files'][number] {
  return { path, status: 'modified', additions: 1, deletions: 0, isBinary: false, sha: path, hunks: [] }
}

describe('noneAdapter', () => {
  it('puts every file into a single flat group', async () => {
    const diff: DiffsPayload = {
      provider: 'github',
      id: 'github:o/r#1',
      title: 't',
      description: '',
      files: [file('src/index.ts'), file('README.md'), file('package.json')],
    }
    const result = await noneAdapter.analyze(diff)

    expect(result.source).toBe('none')
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0]?.children).toBeUndefined()
    expect(result.groups[0]?.filePaths).toEqual(['src/index.ts', 'README.md', 'package.json'])
  })

  it('is always available and needs no network', () => {
    expect(noneAdapter.available).toBe(true)
  })
})
