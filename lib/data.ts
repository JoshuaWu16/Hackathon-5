import { readFileSync } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "hvac_construction_dataset")

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((l) => l.trim())
  if (lines.length === 0) return []
  const headers = parseCSVLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = values[i] ?? ""
    })
    return row
  })
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function castValue(val: string): string | number | boolean {
  if (val === "") return val
  if (val === "true" || val === "True") return true
  if (val === "false" || val === "False") return false
  const num = Number(val)
  if (!isNaN(num) && val !== "") return num
  return val
}

function loadCSV<T>(filename: string): T[] {
  try {
    const filePath = path.join(DATA_DIR, filename)
    console.log("[v0] Loading CSV:", filePath)
    const content = readFileSync(filePath, "utf-8")
    console.log("[v0] CSV loaded, rows:", content.split("\n").length - 1)
    const rows = parseCSV(content)
    return rows.map((row) => {
      const typed: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(row)) {
        typed[key] = castValue(val)
      }
      return typed as T
    })
  } catch (error) {
    console.error("[v0] Failed to load CSV:", filename, error)
    return []
  }
}

export interface Contract {
  project_id: string
  project_name: string
  original_contract_value: number
  contract_date: string
  substantial_completion_date: string
  retention_pct: number
  payment_terms: string
  gc_name: string
  architect: string
  engineer_of_record: string
}

export interface SOVLine {
  project_id: string
  sov_line_id: string
  line_number: number
  description: string
  scheduled_value: number
  labor_pct: number
  material_pct: number
}

export interface SOVBudget {
  project_id: string
  sov_line_id: string
  estimated_labor_hours: number
  estimated_labor_cost: number
  estimated_material_cost: number
  estimated_equipment_cost: number
  estimated_sub_cost: number
  productivity_factor: number
  key_assumptions: string
}

export interface LaborLog {
  project_id: string
  log_id: string
  date: string
  employee_id: string
  role: string
  sov_line_id: string
  hours_st: number
  hours_ot: number
  hourly_rate: number
  burden_multiplier: number
  work_area: string
  cost_code: number
}

export interface MaterialDelivery {
  project_id: string
  delivery_id: string
  date: string
  sov_line_id: string
  material_category: string
  item_description: string
  quantity: number
  unit: string
  unit_cost: number
  total_cost: number
  po_number: string
  vendor: string
  received_by: string
  condition_notes: string
}

export interface ChangeOrder {
  project_id: string
  co_number: string
  date_submitted: string
  reason_category: string
  description: string
  amount: number
  status: string
  related_rfi: string
  affected_sov_lines: string
  labor_hours_impact: number
  schedule_impact_days: number
  submitted_by: string
  approved_by: string
}

export interface RFI {
  project_id: string
  rfi_number: string
  date_submitted: string
  subject: string
  submitted_by: string
  assigned_to: string
  priority: string
  status: string
  date_required: string
  date_responded: string
  response_summary: string
  cost_impact: boolean | string
  schedule_impact: boolean | string
}

export interface FieldNote {
  project_id: string
  note_id: string
  date: string
  author: string
  note_type: string
  content: string
  photos_attached: number
  weather: string
  temp_high: number
  temp_low: number
}

export interface BillingHistory {
  project_id: string
  application_number: number
  period_end: string
  period_total: number
  cumulative_billed: number
  retention_held: number
  net_payment_due: number
  status: string
  payment_date: string
  line_item_count: number
}

export interface BillingLineItem {
  sov_line_id: string
  description: string
  scheduled_value: number
  previous_billed: number
  this_period: number
  total_billed: number
  pct_complete: number
  balance_to_finish: number
  project_id: string
  application_number: number
}

let _contracts: Contract[] | null = null
let _sov: SOVLine[] | null = null
let _sovBudget: SOVBudget[] | null = null
let _laborLogs: LaborLog[] | null = null
let _materialDeliveries: MaterialDelivery[] | null = null
let _changeOrders: ChangeOrder[] | null = null
let _rfis: RFI[] | null = null
let _fieldNotes: FieldNote[] | null = null
let _billingHistory: BillingHistory[] | null = null
let _billingLineItems: BillingLineItem[] | null = null

export function getContracts(): Contract[] {
  if (!_contracts) _contracts = loadCSV<Contract>("contracts.csv")
  return _contracts
}

export function getSOV(): SOVLine[] {
  if (!_sov) _sov = loadCSV<SOVLine>("sov.csv")
  return _sov
}

export function getSOVBudget(): SOVBudget[] {
  if (!_sovBudget) _sovBudget = loadCSV<SOVBudget>("sov_budget.csv")
  return _sovBudget
}

export function getLaborLogs(): LaborLog[] {
  if (!_laborLogs) _laborLogs = loadCSV<LaborLog>("labor_logs.csv")
  return _laborLogs
}

export function getMaterialDeliveries(): MaterialDelivery[] {
  if (!_materialDeliveries)
    _materialDeliveries = loadCSV<MaterialDelivery>("material_deliveries.csv")
  return _materialDeliveries
}

export function getChangeOrders(): ChangeOrder[] {
  if (!_changeOrders)
    _changeOrders = loadCSV<ChangeOrder>("change_orders.csv")
  return _changeOrders
}

export function getRFIs(): RFI[] {
  if (!_rfis) _rfis = loadCSV<RFI>("rfis.csv")
  return _rfis
}

export function getFieldNotes(): FieldNote[] {
  if (!_fieldNotes) _fieldNotes = loadCSV<FieldNote>("field_notes.csv")
  return _fieldNotes
}

export function getBillingHistory(): BillingHistory[] {
  if (!_billingHistory)
    _billingHistory = loadCSV<BillingHistory>("billing_history.csv")
  return _billingHistory
}

export function getBillingLineItems(): BillingLineItem[] {
  if (!_billingLineItems)
    _billingLineItems = loadCSV<BillingLineItem>("billing_line_items.csv")
  return _billingLineItems
}
