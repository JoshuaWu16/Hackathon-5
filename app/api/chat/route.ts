import {
  convertToModelMessages,
  streamText,
  UIMessage,
  tool,
  stepCountIs,
} from "ai"
import { z } from "zod"
import { loadAndParseCSV } from "@/lib/load-csv"

export const maxDuration = 60

const systemPrompt = `You are an expert HVAC construction financial analyst and AI agent. You help a CFO analyze and protect margins across a portfolio of commercial HVAC construction projects.

You have access to tools that let you query project data including contracts, schedule of values (SOV), labor logs, material deliveries, change orders, RFIs, field notes, and billing history.

When analyzing projects:
- Calculate labor costs as: (straight_time_hrs + overtime_hrs * 1.5) * hourly_rate * burden_multiplier
- Compare actual costs against budgeted/scheduled values to find margin erosion
- Look for patterns: scope drift, verbal approvals in field notes, labor overruns, billing lags, pending change orders
- Be specific with numbers and percentages
- Recommend actionable steps, not just observations

When asked "How's my portfolio doing?" or similar broad questions, proactively scan all projects and identify the ones at risk.

Communicate in clear business English. Reference specific project names, dollar amounts, and percentages.`

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: "anthropic/claude-sonnet-4",
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
    tools: {
      getContracts: tool({
        description:
          "Get all contract information for the HVAC project portfolio. Returns project IDs, names, contract values, dates, and key parties.",
        inputSchema: z.object({}),
        execute: async () => {
          const data = loadAndParseCSV("contracts.csv")
          return { contracts: data }
        },
      }),
      getSOV: tool({
        description:
          "Get Schedule of Values (line-item breakdown) for a specific project or all projects. Each line has a scheduled dollar value, labor %, and material %.",
        inputSchema: z.object({
          projectId: z
            .string()
            .nullable()
            .describe(
              "Filter by project ID (e.g. PRJ-2024-001). Pass null for all projects."
            ),
        }),
        execute: async ({ projectId }) => {
          const data = loadAndParseCSV("sov.csv")
          const filtered = projectId
            ? data.filter((r) => r.project_id === projectId)
            : data
          return { sov: filtered }
        },
      }),
      getLaborLogs: tool({
        description:
          "Get labor log entries. Can filter by project and/or SOV line. Returns hours, rates, burden multipliers for cost calculation. Use this to calculate actual labor costs.",
        inputSchema: z.object({
          projectId: z
            .string()
            .nullable()
            .describe("Filter by project ID. Pass null for all."),
          sovLineId: z
            .string()
            .nullable()
            .describe("Filter by SOV line ID. Pass null for all."),
        }),
        execute: async ({ projectId, sovLineId }) => {
          const data = loadAndParseCSV("labor_logs.csv")
          let filtered = data
          if (projectId)
            filtered = filtered.filter((r) => r.project_id === projectId)
          if (sovLineId)
            filtered = filtered.filter((r) => r.sov_line_id === sovLineId)

          // Summarize to avoid token limits - aggregate by project and SOV line
          const summary: Record<
            string,
            {
              project_id: string
              sov_line_id: string
              total_st_hours: number
              total_ot_hours: number
              total_cost: number
              entry_count: number
            }
          > = {}

          for (const row of filtered) {
            const key = `${row.project_id}|${row.sov_line_id}`
            if (!summary[key]) {
              summary[key] = {
                project_id: row.project_id,
                sov_line_id: row.sov_line_id,
                total_st_hours: 0,
                total_ot_hours: 0,
                total_cost: 0,
                entry_count: 0,
              }
            }
            const st = parseFloat(row.hours_st) || 0
            const ot = parseFloat(row.hours_ot) || 0
            const rate = parseFloat(row.hourly_rate) || 0
            const burden = parseFloat(row.burden_multiplier) || 0
            summary[key].total_st_hours += st
            summary[key].total_ot_hours += ot
            summary[key].total_cost += (st + ot * 1.5) * rate * burden
            summary[key].entry_count += 1
          }

          return { laborSummary: Object.values(summary) }
        },
      }),
      getMaterialDeliveries: tool({
        description:
          "Get material delivery records. Can filter by project. Returns costs, vendors, items, and delivery dates.",
        inputSchema: z.object({
          projectId: z
            .string()
            .nullable()
            .describe("Filter by project ID. Pass null for all."),
        }),
        execute: async ({ projectId }) => {
          const data = loadAndParseCSV("material_deliveries.csv")
          const filtered = projectId
            ? data.filter((r) => r.project_id === projectId)
            : data
          return { deliveries: filtered }
        },
      }),
      getChangeOrders: tool({
        description:
          "Get change orders for a project or all projects. Includes status (Pending, Under Review, Approved, Rejected), amounts, and descriptions.",
        inputSchema: z.object({
          projectId: z
            .string()
            .nullable()
            .describe("Filter by project ID. Pass null for all."),
        }),
        execute: async ({ projectId }) => {
          const data = loadAndParseCSV("change_orders.csv")
          const filtered = projectId
            ? data.filter((r) => r.project_id === projectId)
            : data
          return { changeOrders: filtered }
        },
      }),
      getRFIs: tool({
        description:
          "Get RFIs (Requests for Information). Can filter by project. Includes priority, cost/schedule impact flags, and response status.",
        inputSchema: z.object({
          projectId: z
            .string()
            .nullable()
            .describe("Filter by project ID. Pass null for all."),
        }),
        execute: async ({ projectId }) => {
          const data = loadAndParseCSV("rfis.csv")
          const filtered = projectId
            ? data.filter((r) => r.project_id === projectId)
            : data
          return { rfis: filtered }
        },
      }),
      getFieldNotes: tool({
        description:
          "Get field notes (daily reports from site). These are unstructured text that may contain signals about scope drift, verbal approvals, issues, and delays. Can filter by project.",
        inputSchema: z.object({
          projectId: z
            .string()
            .nullable()
            .describe("Filter by project ID. Pass null for all."),
          searchTerm: z
            .string()
            .nullable()
            .describe(
              "Optional keyword search within note content (e.g. 'overtime', 'delay', 'change'). Pass null for all notes."
            ),
        }),
        execute: async ({ projectId, searchTerm }) => {
          const data = loadAndParseCSV("field_notes.csv")
          let filtered = data
          if (projectId)
            filtered = filtered.filter((r) => r.project_id === projectId)
          if (searchTerm) {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter((r) =>
              r.content?.toLowerCase().includes(term)
            )
          }
          // Limit to avoid token explosion
          return { fieldNotes: filtered.slice(0, 50), totalCount: filtered.length }
        },
      }),
      getBillingHistory: tool({
        description:
          "Get billing/pay application history. Can filter by project. Shows amounts billed, retention held, and payment status.",
        inputSchema: z.object({
          projectId: z
            .string()
            .nullable()
            .describe("Filter by project ID. Pass null for all."),
        }),
        execute: async ({ projectId }) => {
          const data = loadAndParseCSV("billing_history.csv")
          const filtered = projectId
            ? data.filter((r) => r.project_id === projectId)
            : data
          return { billingHistory: filtered }
        },
      }),
      getBillingLineItems: tool({
        description:
          "Get detailed billing line items showing per-SOV-line billing progress, percent complete, and balance to finish.",
        inputSchema: z.object({
          projectId: z
            .string()
            .nullable()
            .describe("Filter by project ID. Pass null for all."),
        }),
        execute: async ({ projectId }) => {
          const data = loadAndParseCSV("billing_line_items.csv")
          const filtered = projectId
            ? data.filter((r) => r.project_id === projectId)
            : data
          return { billingLineItems: filtered }
        },
      }),
      getSOVBudget: tool({
        description:
          "Get the original bid/budget estimates for SOV lines. Use this to compare actual costs against what was budgeted.",
        inputSchema: z.object({
          projectId: z
            .string()
            .nullable()
            .describe("Filter by project ID. Pass null for all."),
        }),
        execute: async ({ projectId }) => {
          const data = loadAndParseCSV("sov_budget.csv")
          const filtered = projectId
            ? data.filter((r) => r.project_id === projectId)
            : data
          return { sovBudget: filtered }
        },
      }),
      computeMarginAnalysis: tool({
        description:
          "Pre-compute a margin health summary for one or all projects. Compares actual labor + material costs against SOV budgets, includes billing progress, pending change orders, and an overall risk score. Use this for portfolio overviews or project-level health checks.",
        inputSchema: z.object({
          projectId: z
            .string()
            .nullable()
            .describe("Filter by project ID. Pass null for all projects."),
        }),
        execute: async ({ projectId }) => {
          const contracts = loadAndParseCSV("contracts.csv")
          const sov = loadAndParseCSV("sov.csv")
          const labor = loadAndParseCSV("labor_logs.csv")
          const materials = loadAndParseCSV("material_deliveries.csv")
          const changeOrders = loadAndParseCSV("change_orders.csv")
          const billing = loadAndParseCSV("billing_history.csv")
          const sovBudget = loadAndParseCSV("sov_budget.csv")

          const projectIds = projectId
            ? [projectId]
            : contracts.map((c) => c.project_id)

          const results = projectIds.map((pid) => {
            const contract = contracts.find((c) => c.project_id === pid)
            const contractValue = parseFloat(contract?.original_contract_value || "0")

            // Actual labor cost
            const projectLabor = labor.filter((l) => l.project_id === pid)
            const totalLaborCost = projectLabor.reduce((sum, row) => {
              const st = parseFloat(row.hours_st) || 0
              const ot = parseFloat(row.hours_ot) || 0
              const rate = parseFloat(row.hourly_rate) || 0
              const burden = parseFloat(row.burden_multiplier) || 0
              return sum + (st + ot * 1.5) * rate * burden
            }, 0)

            // Actual material cost
            const projectMaterials = materials.filter((m) => m.project_id === pid)
            const totalMaterialCost = projectMaterials.reduce(
              (sum, row) => sum + (parseFloat(row.total_cost) || 0),
              0
            )

            // Budget from SOV
            const projectSOV = sov.filter((s) => s.project_id === pid)
            const budgetedLabor = projectSOV.reduce(
              (sum, s) =>
                sum +
                (parseFloat(s.scheduled_value) || 0) *
                  (parseFloat(s.labor_pct) || 0),
              0
            )
            const budgetedMaterial = projectSOV.reduce(
              (sum, s) =>
                sum +
                (parseFloat(s.scheduled_value) || 0) *
                  (parseFloat(s.material_pct) || 0),
              0
            )

            // SOV budget (bid estimates)
            const projectBudget = sovBudget.filter(
              (b) => b.project_id === pid
            )
            const totalBudgetedCost = projectBudget.reduce(
              (sum, b) => sum + (parseFloat(b.estimated_total_cost) || 0),
              0
            )

            // Change orders
            const projectCOs = changeOrders.filter(
              (co) => co.project_id === pid
            )
            const approvedCOs = projectCOs.filter(
              (co) => co.status === "Approved"
            )
            const pendingCOs = projectCOs.filter(
              (co) => co.status === "Pending" || co.status === "Under Review"
            )
            const approvedCOValue = approvedCOs.reduce(
              (sum, co) => sum + (parseFloat(co.amount) || 0),
              0
            )
            const pendingCOValue = pendingCOs.reduce(
              (sum, co) => sum + (parseFloat(co.amount) || 0),
              0
            )

            // Billing
            const projectBilling = billing.filter(
              (b) => b.project_id === pid
            )
            const totalBilled = projectBilling.reduce(
              (sum, b) => sum + (parseFloat(b.cumulative_billed) || 0),
              0
            )
            const lastBill = projectBilling[projectBilling.length - 1]
            const cumulativeBilled = parseFloat(
              lastBill?.cumulative_billed || "0"
            )
            const billingPct =
              contractValue > 0
                ? ((cumulativeBilled / contractValue) * 100).toFixed(1)
                : "0"

            // Margin calculations
            const totalActualCost = totalLaborCost + totalMaterialCost
            const laborVariance = totalLaborCost - budgetedLabor
            const materialVariance = totalMaterialCost - budgetedMaterial
            const totalVariance = laborVariance + materialVariance
            const marginPct =
              contractValue > 0
                ? (
                    ((contractValue - totalActualCost) / contractValue) *
                    100
                  ).toFixed(1)
                : "0"

            // Risk score (0-100, higher = more risk)
            let risk = 0
            if (laborVariance > 0) risk += Math.min(40, (laborVariance / budgetedLabor) * 100)
            if (materialVariance > 0) risk += Math.min(20, (materialVariance / budgetedMaterial) * 100)
            if (pendingCOs.length > 3) risk += 15
            if (pendingCOValue > contractValue * 0.05) risk += 15
            risk = Math.min(100, Math.round(risk))

            return {
              project_id: pid,
              project_name: contract?.project_name || "Unknown",
              contract_value: contractValue,
              actual_labor_cost: Math.round(totalLaborCost),
              budgeted_labor: Math.round(budgetedLabor),
              labor_variance: Math.round(laborVariance),
              actual_material_cost: Math.round(totalMaterialCost),
              budgeted_material: Math.round(budgetedMaterial),
              material_variance: Math.round(materialVariance),
              total_actual_cost: Math.round(totalActualCost),
              total_budget: Math.round(totalBudgetedCost || budgetedLabor + budgetedMaterial),
              total_variance: Math.round(totalVariance),
              current_margin_pct: marginPct,
              billing_pct_complete: billingPct,
              cumulative_billed: Math.round(cumulativeBilled),
              approved_cos: approvedCOs.length,
              approved_co_value: Math.round(approvedCOValue),
              pending_cos: pendingCOs.length,
              pending_co_value: Math.round(pendingCOValue),
              risk_score: risk,
            }
          })

          return { marginAnalysis: results }
        },
      }),
    },
    stopWhen: stepCountIs(15),
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
  })
}
