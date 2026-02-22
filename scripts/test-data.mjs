import fs from "fs"
import path from "path"

const dataDir = path.join(process.cwd(), "hvac_construction_dataset")

console.log("[v0] CWD:", process.cwd())
console.log("[v0] Data dir:", dataDir)
console.log("[v0] Data dir exists:", fs.existsSync(dataDir))

if (fs.existsSync(dataDir)) {
  const files = fs.readdirSync(dataDir)
  console.log("[v0] Files in data dir:", files)
  
  // Try reading contracts.csv
  const contractsPath = path.join(dataDir, "contracts.csv")
  console.log("[v0] contracts.csv exists:", fs.existsSync(contractsPath))
  
  if (fs.existsSync(contractsPath)) {
    const raw = fs.readFileSync(contractsPath, "utf-8")
    const lines = raw.trim().split("\n")
    console.log("[v0] contracts.csv lines:", lines.length)
    console.log("[v0] Header:", lines[0])
    console.log("[v0] First row:", lines[1])
    
    // Parse it the same way data.ts does
    const headers = []
    let current = ""
    let inQuotes = false
    for (const ch of lines[0]) {
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { headers.push(current.trim()); current = "" }
      else { current += ch }
    }
    headers.push(current.trim())
    console.log("[v0] Parsed headers:", headers)
  }
  
  // Try reading labor_logs.csv  
  const laborPath = path.join(dataDir, "labor_logs.csv")
  console.log("[v0] labor_logs.csv exists:", fs.existsSync(laborPath))
  if (fs.existsSync(laborPath)) {
    const raw = fs.readFileSync(laborPath, "utf-8")
    const lines = raw.trim().split("\n")
    console.log("[v0] labor_logs.csv lines:", lines.length)
  }
} else {
  // Try finding it elsewhere
  console.log("[v0] Searching for dataset...")
  const tryPaths = [
    "/vercel/share/v0-project/hvac_construction_dataset",
    "./hvac_construction_dataset",
    "../hvac_construction_dataset",
  ]
  for (const p of tryPaths) {
    console.log(`[v0] ${p} exists:`, fs.existsSync(p))
  }
}
