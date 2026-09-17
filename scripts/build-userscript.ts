// Stamps `userscript/diffs-github.user.js` (the checked-in template) with a
// build-specific version and a cache-busted `@require` URL, writing the result to
// `public/diffs-github.user.js` (gitignored, like `public/embed/` - see
// scripts/build-embed-css.ts) so Vite's publicDir copy serves it at
// https://diffs.antfu.dev/diffs-github.user.js. `@updateURL`/`@downloadURL` in the
// template already point userscript managers at that same URL for auto-updates.
import { execSync } from 'node:child_process'
import fs from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

export function getSha(): string {
  return execSync('git rev-parse --short HEAD', { cwd: fileURLToPath(new URL('..', import.meta.url)) }).toString().trim()
}

export async function buildUserscript() {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const pkg = JSON.parse(await fs.readFile(join(root, 'package.json'), 'utf-8')) as { version: string }
  const sha = getSha()
  const version = `${pkg.version}.${formatDate(new Date())}-${sha}`

  const source = `
// ==UserScript==
// @name         Diffs for GitHub Pull Requests
// @namespace    https://diffs.antfu.dev
// @version      ${version}
// @description  Adds a Diffs-powered review drawer to GitHub pull request pages
// @author       antfu
// @match        https://github.com/*/*/pull/*
// @icon         https://github.com/favicon.ico
// @require      https://diffs.antfu.dev/embed/diffs-embed.js?${sha}
// @grant        none
// @run-at       document-idle
// @updateURL    https://diffs.antfu.dev/diffs-github.user.js
// @downloadURL  https://diffs.antfu.dev/diffs-github.user.js
// @supportURL   https://github.com/antfu/diffs/issues
// @homepageURL  https://diffs.antfu.dev
// ==/UserScript==

;(() => {
  // Mount the Diffs embed panel Web Component from diffs.antfu.dev
  if (!document.querySelector('diffs-embed-panel'))
    document.body.appendChild(document.createElement('diffs-embed-panel'))
})()
`

  const outFile = join(root, 'public/diffs-github.user.js')
  await fs.writeFile(outFile, source)
  process.stdout.write(`✓ userscript built (version ${version})\n`)
}
