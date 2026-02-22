import { readdirSync, existsSync } from 'fs'
import path from 'path'

const candidates = [
  process.cwd(),
  '/vercel/share/v0-project',
  '/vercel/path0',
  path.resolve('.'),
  path.resolve(__dirname || '.'),
]

for (const c of candidates) {
  const dataDir = path.join(c, 'hvac_construction_dataset')
  const exists = existsSync(dataDir)
  console.log(`${c}/hvac_construction_dataset => exists: ${exists}`)
  if (exists) {
    console.log('  FILES:', readdirSync(dataDir).join(', '))
  }
}

// Also try import.meta
console.log('import.meta.url:', import.meta.url)
const thisDir = new URL('.', import.meta.url).pathname
console.log('thisDir:', thisDir)
const projectDir = path.resolve(thisDir, '..')
const dataDir2 = path.join(projectDir, 'hvac_construction_dataset')
console.log(`${projectDir}/hvac_construction_dataset => exists: ${existsSync(dataDir2)}`)
