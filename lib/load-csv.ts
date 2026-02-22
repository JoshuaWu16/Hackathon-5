import fs from "fs"
import path from "path"

export function loadCSV(filename: string): string {
  const filePath = path.join(process.cwd(), "hvac_construction_dataset", filename)
  return fs.readFileSync(filePath, "utf-8")
}

/**
 * Parse a CSV line handling quoted fields with embedded commas.
 */
function parseLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ",") {
        fields.push(current.trim())
        current = ""
      } else {
        current += ch
      }
    }
  }
  fields.push(current.trim())
  return fields
}

export function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n")
  const headers = parseLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = values[i] || ""
    })
    return row
  })
}

export function loadAndParseCSV(filename: string): Record<string, string>[] {
  return parseCSV(loadCSV(filename))
}
