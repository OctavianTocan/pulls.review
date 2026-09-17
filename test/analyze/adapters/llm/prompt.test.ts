import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { buildDiffPrompt } from '../../../../app/analyze/adapters/llm/prompt'

const fixturesDir = join(process.cwd(), 'test/fixtures/real')
const fixtureNames = readdirSync(fixturesDir).filter(name => name.endsWith('.json')).sort()

describe('buildDiffPrompt snapshot', () => {
  it.each(fixtureNames)('matches the snapshot for fixtures/real/%s', async (name) => {
    const { diff } = JSON.parse(readFileSync(join(fixturesDir, name), 'utf-8'))
    const prompt = buildDiffPrompt(diff.meta.title, diff.meta.description, diff.files)
    await expect(prompt).toMatchFileSnapshot(
      `./__snapshots__/${name}.prompt.snap.md`,
    )
  })
})
