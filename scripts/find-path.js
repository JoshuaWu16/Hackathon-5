import { readdirSync, readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const thisFile = fileURLToPath(import.meta.url)
const thisDir = path.dirname(thisFile)

console.log("process.cwd():", process.cwd())
console.log("import.meta.url:", import.meta.url)
console.log("thisDir:", thisDir)

const candidates = [
  process.cwd(),
  '/vercel/share/v0-project',
  '/vercel/path0',
  path.resolve(thisDir, '..'),
]

for (const c of candidates) {
  const dataDir = path.join(c, 'hvac_construction_dataset')
  const exists = existsSync(dataDir)
  console.log(`\n${dataDir} => exists: ${exists}`)
  if (exists) {
    const files = readdirSync(dataDir)
    console.log('  FILES:', files.join(', '))
    const csv = files.find(f => f.endsWith('.csv'))
    if (csv) {
      const content = readFileSync(path.join(dataDir, csv), 'utf-8')
      const lines = content.split('\n')
      console.log(`  ${csv}: ${lines.length} lines, header: ${lines[0].substring(0, 80)}`)
    }
  }
}
