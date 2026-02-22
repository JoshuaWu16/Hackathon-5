import fs from "fs"
import path from "path"

export function loadCSV(filename: string): string {
  const filePath = path.join(
    process.cwd(),
    "hvac_construction_dataset",
    filename
  )
  return fs.readFileSync(filePath, "utf-8")
}

export function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n")
  const headers = lines[0].split(",").map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(",")
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = values[i]?.trim() || ""
    })
    return row
  })
}

export function loadAndParseCSV(filename: string): Record<string, string>[] {
  return parseCSV(loadCSV(filename))
}
