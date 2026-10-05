// Gives every locale exactly en.json's keys, in its order: existing translations stay,
// missing keys get the English text, keys English no longer has are dropped.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('../src/i18n/locales/', import.meta.url))
const read = file => JSON.parse(readFileSync(dir + file, 'utf8'))
const english = read('en.json')

function align(source, translated) {
  if (typeof source !== 'object' || source === null)
    return typeof translated === typeof source ? translated : source
  const out = {}
  for (const [key, value] of Object.entries(source))
    out[key] = align(value, translated && typeof translated === 'object' ? translated[key] : undefined)
  return out
}

for (const file of readdirSync(dir).filter(name => name.endsWith('.json') && name !== 'en.json')) {
  const current = read(file)
  const aligned = align(english, current)
  if (JSON.stringify(aligned) !== JSON.stringify(current))
    writeFileSync(dir + file, `${JSON.stringify(aligned, null, 2)}\n`)
}
