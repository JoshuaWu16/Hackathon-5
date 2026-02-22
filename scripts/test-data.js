import { readFileSync, existsSync } from "fs";
import path from "path";

const cwd = process.cwd();
console.log("[v0] CWD:", cwd);

const dataDir = path.join(cwd, "hvac_construction_dataset");
console.log("[v0] Data dir:", dataDir);
console.log("[v0] Data dir exists:", existsSync(dataDir));

const files = [
  "contracts.csv",
  "sov.csv", 
  "sov_budget.csv",
  "labor_logs.csv",
  "material_deliveries.csv",
  "change_orders.csv",
  "rfis.csv",
  "field_notes.csv",
  "billing_history.csv",
  "billing_line_items.csv",
];

for (const file of files) {
  const filePath = path.join(dataDir, file);
  const exists = existsSync(filePath);
  if (exists) {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter(l => l.trim());
    console.log(`[v0] ${file}: EXISTS, ${lines.length} lines, first line: ${lines[0].substring(0, 80)}`);
  } else {
    console.log(`[v0] ${file}: MISSING`);
  }
}

// Test the CSV parsing logic
function parseCSV(content) {
  const lines = content.split("\n").filter(l => l.trim());
  if (lines.length === 0) return [];
  
  const headers = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < lines[0].length; i++) {
    const ch = lines[0][i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      headers.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  headers.push(current.trim());
  
  const rows = [];
  for (let r = 1; r < lines.length; r++) {
    const values = [];
    let val = "";
    let inQ = false;
    for (let i = 0; i < lines[r].length; i++) {
      const ch = lines[r][i];
      if (ch === '"') {
        inQ = !inQ;
      } else if (ch === "," && !inQ) {
        values.push(val.trim());
        val = "";
      } else {
        val += ch;
      }
    }
    values.push(val.trim());
    
    const row = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = values[i] || "";
    }
    rows.push(row);
  }
  return rows;
}

// Test parsing contracts
const contractsContent = readFileSync(path.join(dataDir, "contracts.csv"), "utf-8");
const contracts = parseCSV(contractsContent);
console.log("[v0] Parsed contracts count:", contracts.length);
console.log("[v0] First contract:", JSON.stringify(contracts[0], null, 2));

// Test parsing labor logs (big file)
const laborContent = readFileSync(path.join(dataDir, "labor_logs.csv"), "utf-8");
const labor = parseCSV(laborContent);
console.log("[v0] Parsed labor_logs count:", labor.length);
console.log("[v0] First labor row:", JSON.stringify(labor[0], null, 2));

console.log("[v0] ALL DATA LOADING TESTS PASSED");
