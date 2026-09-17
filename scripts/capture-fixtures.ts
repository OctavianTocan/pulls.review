// One-off script: captures real GitHub PRs through GithubProvider + ruleBasedAdapter
// into test/fixtures/real/*.json, for Storybook and manual testing against real data.
// Run with: pnpm exec vite-node scripts/capture-fixtures.ts
import { writeFileSync } from 'node:fs'
import process from 'node:process'
import { ruleBasedAdapter } from '../app/analyze/adapters/rule-based'
import { GithubProvider } from '../app/providers/github'

const targets = [
  { name: 'small', owner: 'antfu', repo: 'eslint-config', number: '861' },
  { name: 'large', owner: 'vuejs', repo: 'core', number: '12349' },
]

async function main() {
  for (const target of targets) {
    console.log(`Fetching ${target.owner}/${target.repo}#${target.number}...`)
    const diff = await GithubProvider.fetchDiff(
      { kind: 'github-pr', owner: target.owner, repo: target.repo, number: target.number },
      { token: process.env.GITHUB_TOKEN },
    )
    const grouped = await ruleBasedAdapter.analyze(diff)
    const path = `test/fixtures/real/${target.name}.json`
    writeFileSync(path, `${JSON.stringify({ diff, grouped }, null, 2)}\n`)
    console.log(`Wrote ${path} (${diff.files.length} files)`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
