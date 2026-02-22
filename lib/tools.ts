import { tool } from "ai"
import { z } from "zod"
import {
  getContracts,
  getSOV,
  getSOVBudget,
  getLaborLogs,
  getMaterialDeliveries,
  getChangeOrders,
  getRFIs,
  getFieldNotes,
  getBillingHistory,
  getBillingLineItems,
} from "./data"

interface BillingLineItemSummary {
  sov_line_id: string
  description: string
  scheduled_value: number
  total_billed: number
  pct_complete: number
  balance_to_finish: number
  application_number: number
}

export const agentTools = {
  getPortfolioOverview: tool({
    description:
      "Get a high-level overview of all projects in the portfolio including contract values, completion dates, and current billing status. Use this first to understand the full portfolio.",
    inputSchema: z.object({}),
    execute: async () => {
      const contracts = getContracts()
      const billing = getBillingHistory()
      const changeOrders = getChangeOrders()

      return contracts.map((c) => {
        const projectBilling = billing.filter(
          (b) => b.project_id === c.project_id
        )
        const latestBilling = projectBilling.sort(
          (a, b) => b.application_number - a.application_number
        )[0]
        const projectCOs = changeOrders.filter(
          (co) => co.project_id === c.project_id
        )
        const approvedCOs = projectCOs.filter(
          (co) => co.status === "Approved"
        )
        const pendingCOs = projectCOs.filter(
          (co) =>
            co.status === "Pending" || co.status === "Under Review"
        )

        return {
          project_id: c.project_id,
          project_name: c.project_name,
          original_contract_value: c.original_contract_value,
          contract_date: c.contract_date,
          substantial_completion_date: c.substantial_completion_date,
          gc_name: c.gc_name,
          retention_pct: c.retention_pct,
          cumulative_billed: latestBilling?.cumulative_billed ?? 0,
          pct_billed: latestBilling
            ? (
                (latestBilling.cumulative_billed / c.original_contract_value) *
                100
              ).toFixed(1)
            : "0",
          retention_held: latestBilling?.retention_held ?? 0,
          approved_co_count: approvedCOs.length,
          approved_co_value: approvedCOs.reduce(
            (sum, co) => sum + co.amount,
            0
          ),
          pending_co_count: pendingCOs.length,
          pending_co_value: pendingCOs.reduce(
            (sum, co) => sum + co.amount,
            0
          ),
          adjusted_contract_value:
            c.original_contract_value +
            approvedCOs.reduce((sum, co) => sum + co.amount, 0),
        }
      })
    },
  }),

  analyzeProjectMargin: tool({
    description:
      "Deep-dive margin analysis for a specific project. Compares actual labor & material costs against bid estimates to identify margin erosion. Returns cost breakdown by SOV line with variance analysis.",
    inputSchema: z.object({
      project_id: z.string().describe("The project ID, e.g. PRJ-2024-001"),
    }),
    execute: async ({ project_id }) => {
      const sov = getSOV().filter((s) => s.project_id === project_id)
      const budget = getSOVBudget().filter((b) => b.project_id === project_id)
      const labor = getLaborLogs().filter((l) => l.project_id === project_id)
      const materials = getMaterialDeliveries().filter(
        (m) => m.project_id === project_id
      )
      const contract = getContracts().find((c) => c.project_id === project_id)

      if (!contract) return { error: "Project not found" }

      const lineAnalysis = sov.map((line) => {
        const lineBudget = budget.find(
          (b) => b.sov_line_id === line.sov_line_id
        )
        const lineLabor = labor.filter(
          (l) => l.sov_line_id === line.sov_line_id
        )
        const lineMaterials = materials.filter(
          (m) => m.sov_line_id === line.sov_line_id
        )

        const actualLaborCost = lineLabor.reduce((sum, l) => {
          return (
            sum +
            (l.hours_st + l.hours_ot * 1.5) * l.hourly_rate * l.burden_multiplier
          )
        }, 0)
        const actualLaborHours = lineLabor.reduce(
          (sum, l) => sum + l.hours_st + l.hours_ot,
          0
        )
        const actualMaterialCost = lineMaterials.reduce(
          (sum, m) => sum + m.total_cost,
          0
        )

        const estimatedLaborCost = lineBudget?.estimated_labor_cost ?? 0
        const estimatedMaterialCost = lineBudget?.estimated_material_cost ?? 0
        const estimatedLaborHours = lineBudget?.estimated_labor_hours ?? 0

        const laborVariance = actualLaborCost - estimatedLaborCost
        const materialVariance = actualMaterialCost - estimatedMaterialCost
        const hoursVariance = actualLaborHours - estimatedLaborHours

        return {
          sov_line_id: line.sov_line_id,
          description: line.description,
          scheduled_value: line.scheduled_value,
          estimated_labor_cost: estimatedLaborCost,
          actual_labor_cost: Math.round(actualLaborCost),
          labor_variance: Math.round(laborVariance),
          labor_variance_pct:
            estimatedLaborCost > 0
              ? ((laborVariance / estimatedLaborCost) * 100).toFixed(1)
              : "N/A",
          estimated_labor_hours: estimatedLaborHours,
          actual_labor_hours: Math.round(actualLaborHours),
          hours_variance: Math.round(hoursVariance),
          estimated_material_cost: estimatedMaterialCost,
          actual_material_cost: Math.round(actualMaterialCost),
          material_variance: Math.round(materialVariance),
          material_variance_pct:
            estimatedMaterialCost > 0
              ? ((materialVariance / estimatedMaterialCost) * 100).toFixed(1)
              : "N/A",
          total_actual_cost: Math.round(actualLaborCost + actualMaterialCost),
          total_estimated_cost: estimatedLaborCost + estimatedMaterialCost,
          total_variance: Math.round(
            laborVariance + materialVariance
          ),
        }
      })

      const totalActualCost = lineAnalysis.reduce(
        (sum, l) => sum + l.total_actual_cost,
        0
      )
      const totalEstimatedCost = lineAnalysis.reduce(
        (sum, l) => sum + l.total_estimated_cost,
        0
      )
      const totalScheduledValue = lineAnalysis.reduce(
        (sum, l) => sum + l.scheduled_value,
        0
      )

      return {
        project_id,
        project_name: contract.project_name,
        original_contract_value: contract.original_contract_value,
        total_scheduled_value: totalScheduledValue,
        total_estimated_cost: totalEstimatedCost,
        total_actual_cost: totalActualCost,
        total_variance: totalActualCost - totalEstimatedCost,
        bid_margin_pct: (
          ((totalScheduledValue - totalEstimatedCost) / totalScheduledValue) *
          100
        ).toFixed(1),
        current_margin_pct: (
          ((totalScheduledValue - totalActualCost) / totalScheduledValue) *
          100
        ).toFixed(1),
        margin_erosion_pct: (
          ((totalActualCost - totalEstimatedCost) / totalScheduledValue) *
          100
        ).toFixed(1),
        line_analysis: lineAnalysis,
        worst_lines: lineAnalysis
          .filter((l) => l.total_variance > 0)
          .sort((a, b) => b.total_variance - a.total_variance)
          .slice(0, 5),
      }
    },
  }),

  analyzeLaborProductivity: tool({
    description:
      "Analyze labor productivity for a project — overtime trends, cost per hour by role, crew utilization, and productivity vs bid assumptions. Identifies labor cost drivers.",
    inputSchema: z.object({
      project_id: z.string().describe("The project ID"),
    }),
    execute: async ({ project_id }) => {
      const labor = getLaborLogs().filter((l) => l.project_id === project_id)
      const budget = getSOVBudget().filter((b) => b.project_id === project_id)

      // Role-level analysis
      const byRole: Record<
        string,
        {
          hours_st: number
          hours_ot: number
          cost: number
          count: number
          avg_rate: number
        }
      > = {}
      for (const l of labor) {
        if (!byRole[l.role]) {
          byRole[l.role] = {
            hours_st: 0,
            hours_ot: 0,
            cost: 0,
            count: 0,
            avg_rate: 0,
          }
        }
        byRole[l.role].hours_st += l.hours_st
        byRole[l.role].hours_ot += l.hours_ot
        byRole[l.role].cost +=
          (l.hours_st + l.hours_ot * 1.5) * l.hourly_rate * l.burden_multiplier
        byRole[l.role].count += 1
        byRole[l.role].avg_rate += l.hourly_rate
      }

      const roleAnalysis = Object.entries(byRole).map(([role, data]) => ({
        role,
        total_straight_time: Math.round(data.hours_st),
        total_overtime: Math.round(data.hours_ot),
        overtime_pct: ((data.hours_ot / (data.hours_st + data.hours_ot)) * 100).toFixed(1),
        total_cost: Math.round(data.cost),
        avg_hourly_rate: Math.round(data.avg_rate / data.count),
        entries: data.count,
      }))

      // Monthly trend
      const byMonth: Record<string, { hours_st: number; hours_ot: number; cost: number }> = {}
      for (const l of labor) {
        const month = l.date.substring(0, 7)
        if (!byMonth[month]) {
          byMonth[month] = { hours_st: 0, hours_ot: 0, cost: 0 }
        }
        byMonth[month].hours_st += l.hours_st
        byMonth[month].hours_ot += l.hours_ot
        byMonth[month].cost +=
          (l.hours_st + l.hours_ot * 1.5) * l.hourly_rate * l.burden_multiplier
      }

      const monthlyTrend = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          straight_time_hours: Math.round(data.hours_st),
          overtime_hours: Math.round(data.hours_ot),
          overtime_pct: ((data.hours_ot / (data.hours_st + data.hours_ot)) * 100).toFixed(1),
          total_cost: Math.round(data.cost),
        }))

      const totalBudgetedHours = budget.reduce(
        (sum, b) => sum + b.estimated_labor_hours,
        0
      )
      const totalActualHours = labor.reduce(
        (sum, l) => sum + l.hours_st + l.hours_ot,
        0
      )
      const totalOTHours = labor.reduce((sum, l) => sum + l.hours_ot, 0)

      return {
        project_id,
        total_budgeted_hours: totalBudgetedHours,
        total_actual_hours: Math.round(totalActualHours),
        hours_variance: Math.round(totalActualHours - totalBudgetedHours),
        hours_variance_pct: (
          ((totalActualHours - totalBudgetedHours) / totalBudgetedHours) *
          100
        ).toFixed(1),
        total_overtime_hours: Math.round(totalOTHours),
        overall_overtime_pct: (
          (totalOTHours / totalActualHours) *
          100
        ).toFixed(1),
        role_analysis: roleAnalysis.sort((a, b) => b.total_cost - a.total_cost),
        monthly_trend: monthlyTrend,
      }
    },
  }),

  getChangeOrders: tool({
    description:
      "Get all change orders for a project or the full portfolio. Shows status, amounts, reasons, and schedule impacts. Critical for understanding scope drift and unapproved cost exposure.",
    inputSchema: z.object({
      project_id: z
        .string()
        .nullable()
        .describe(
          "Optional project ID to filter. Pass null for all projects."
        ),
    }),
    execute: async ({ project_id }) => {
      let cos = getChangeOrders()
      if (project_id) {
        cos = cos.filter((co) => co.project_id === project_id)
      }

      const summary = {
        total_count: cos.length,
        approved: cos.filter((co) => co.status === "Approved"),
        pending: cos.filter(
          (co) => co.status === "Pending" || co.status === "Under Review"
        ),
        rejected: cos.filter((co) => co.status === "Rejected"),
      }

      return {
        total_count: summary.total_count,
        approved_count: summary.approved.length,
        approved_value: summary.approved.reduce(
          (sum, co) => sum + co.amount,
          0
        ),
        pending_count: summary.pending.length,
        pending_value: summary.pending.reduce(
          (sum, co) => sum + co.amount,
          0
        ),
        rejected_count: summary.rejected.length,
        total_schedule_impact_days: cos.reduce(
          (sum, co) => sum + co.schedule_impact_days,
          0
        ),
        by_reason: Object.entries(
          cos.reduce(
            (acc, co) => {
              if (!acc[co.reason_category]) acc[co.reason_category] = { count: 0, value: 0 }
              acc[co.reason_category].count += 1
              acc[co.reason_category].value += co.amount
              return acc
            },
            {} as Record<string, { count: number; value: number }>
          )
        ).map(([reason, data]) => ({ reason, ...data })),
        change_orders: cos.map((co) => ({
          co_number: co.co_number,
          project_id: co.project_id,
          date: co.date_submitted,
          reason: co.reason_category,
          description: co.description,
          amount: co.amount,
          status: co.status,
          schedule_impact_days: co.schedule_impact_days,
          labor_hours_impact: co.labor_hours_impact,
        })),
      }
    },
  }),

  analyzeBillingHealth: tool({
    description:
      "Analyze billing vs. earned value for a project. Identifies under-billing, billing lag, and cash flow risks. Compares what has been billed against actual work completion.",
    inputSchema: z.object({
      project_id: z.string().describe("The project ID"),
    }),
    execute: async ({ project_id }) => {
      const billing = getBillingHistory().filter(
        (b) => b.project_id === project_id
      )
      const lineItems = getBillingLineItems().filter(
        (li) => li.project_id === project_id
      )
      const sov = getSOV().filter((s) => s.project_id === project_id)
      const labor = getLaborLogs().filter((l) => l.project_id === project_id)
      const materials = getMaterialDeliveries().filter(
        (m) => m.project_id === project_id
      )
      const contract = getContracts().find((c) => c.project_id === project_id)

      if (!contract) return { error: "Project not found" }

      // Get latest billing per SOV line
      const latestBillingByLine: Record<string, BillingLineItemSummary> = {}
      for (const li of lineItems) {
        const key = li.sov_line_id
        if (
          !latestBillingByLine[key] ||
          li.application_number > latestBillingByLine[key].application_number
        ) {
          latestBillingByLine[key] = {
            sov_line_id: li.sov_line_id,
            description: li.description,
            scheduled_value: li.scheduled_value,
            total_billed: li.total_billed,
            pct_complete: li.pct_complete,
            balance_to_finish: li.balance_to_finish,
            application_number: li.application_number,
          }
        }
      }

      // Calculate actual cost per line
      const lineSummaries = sov.map((line) => {
        const lineLabor = labor.filter(
          (l) => l.sov_line_id === line.sov_line_id
        )
        const lineMaterials = materials.filter(
          (m) => m.sov_line_id === line.sov_line_id
        )
        const actualCost =
          lineLabor.reduce(
            (sum, l) =>
              sum +
              (l.hours_st + l.hours_ot * 1.5) *
                l.hourly_rate *
                l.burden_multiplier,
            0
          ) + lineMaterials.reduce((sum, m) => sum + m.total_cost, 0)

        const billed = latestBillingByLine[line.sov_line_id]
        const totalBilled = billed?.total_billed ?? 0
        const billingGap = actualCost - totalBilled

        return {
          sov_line_id: line.sov_line_id,
          description: line.description,
          scheduled_value: line.scheduled_value,
          total_billed: totalBilled,
          pct_billed: ((totalBilled / line.scheduled_value) * 100).toFixed(1),
          actual_cost: Math.round(actualCost),
          billing_gap: Math.round(billingGap),
          billing_gap_pct:
            actualCost > 0
              ? ((billingGap / actualCost) * 100).toFixed(1)
              : "0",
        }
      })

      const latestBilling = billing.sort(
        (a, b) => b.application_number - a.application_number
      )[0]

      return {
        project_id,
        project_name: contract.project_name,
        contract_value: contract.original_contract_value,
        total_billed: latestBilling?.cumulative_billed ?? 0,
        retention_held: latestBilling?.retention_held ?? 0,
        pct_billed: latestBilling
          ? (
              (latestBilling.cumulative_billed /
                contract.original_contract_value) *
              100
            ).toFixed(1)
          : "0",
        billing_periods: billing.length,
        line_summaries: lineSummaries,
        under_billed_lines: lineSummaries
          .filter((l) => l.billing_gap > 50000)
          .sort((a, b) => b.billing_gap - a.billing_gap),
        billing_timeline: billing
          .sort((a, b) => a.application_number - b.application_number)
          .map((b) => ({
            period: b.application_number,
            period_end: b.period_end,
            billed: b.period_total,
            cumulative: b.cumulative_billed,
            status: b.status,
            payment_date: b.payment_date,
          })),
      }
    },
  }),

  getRFIAnalysis: tool({
    description:
      "Analyze RFIs for a project — open items, response times, cost/schedule impact flags. RFIs often carry hidden cost exposure.",
    inputSchema: z.object({
      project_id: z.string().describe("The project ID"),
    }),
    execute: async ({ project_id }) => {
      const rfis = getRFIs().filter((r) => r.project_id === project_id)

      const openRFIs = rfis.filter(
        (r) => r.status === "Open" || r.status === "Pending Response"
      )
      const withCostImpact = rfis.filter(
        (r) =>
          r.cost_impact === true ||
          r.cost_impact === "True" ||
          r.cost_impact === "true"
      )
      const withScheduleImpact = rfis.filter(
        (r) =>
          r.schedule_impact === true ||
          r.schedule_impact === "True" ||
          r.schedule_impact === "true"
      )

      const responseTimes = rfis
        .filter((r) => r.date_responded)
        .map((r) => {
          const submitted = new Date(r.date_submitted)
          const responded = new Date(r.date_responded)
          return (responded.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24)
        })

      return {
        project_id,
        total_rfis: rfis.length,
        open_rfis: openRFIs.length,
        with_cost_impact: withCostImpact.length,
        with_schedule_impact: withScheduleImpact.length,
        avg_response_days:
          responseTimes.length > 0
            ? (
                responseTimes.reduce((a, b) => a + b, 0) /
                responseTimes.length
              ).toFixed(1)
            : "N/A",
        by_priority: {
          critical: rfis.filter((r) => r.priority === "Critical").length,
          high: rfis.filter((r) => r.priority === "High").length,
          medium: rfis.filter((r) => r.priority === "Medium").length,
          low: rfis.filter((r) => r.priority === "Low").length,
        },
        open_items: openRFIs.map((r) => ({
          rfi_number: r.rfi_number,
          subject: r.subject,
          priority: r.priority,
          date_submitted: r.date_submitted,
          date_required: r.date_required,
          assigned_to: r.assigned_to,
          cost_impact: r.cost_impact,
          schedule_impact: r.schedule_impact,
        })),
        cost_impact_items: withCostImpact.map((r) => ({
          rfi_number: r.rfi_number,
          subject: r.subject,
          status: r.status,
          response: r.response_summary,
        })),
      }
    },
  }),

  searchFieldNotes: tool({
    description:
      "Search unstructured field notes for a project. These daily reports from superintendents and foremen contain critical signals about verbal approvals, scope issues, delays, quality problems, and coordination conflicts that do not appear in structured data.",
    inputSchema: z.object({
      project_id: z.string().describe("The project ID"),
      search_terms: z
        .array(z.string())
        .describe(
          "Keywords to search for, e.g. ['delay', 'rework', 'overtime', 'change', 'waiting', 'short', 'damage', 'verbal']"
        ),
    }),
    execute: async ({ project_id, search_terms }) => {
      const notes = getFieldNotes().filter(
        (n) => n.project_id === project_id
      )

      const matches = notes.filter((note) => {
        const content = note.content.toLowerCase()
        return search_terms.some((term) => content.includes(term.toLowerCase()))
      })

      return {
        project_id,
        total_notes: notes.length,
        matching_notes: matches.length,
        search_terms,
        results: matches
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 30)
          .map((n) => ({
            date: n.date,
            author: n.author,
            type: n.note_type,
            content: n.content,
            weather: n.weather,
          })),
      }
    },
  }),

  calculateProjectForecast: tool({
    description:
      "Forecast project financial outcome based on current burn rate and trends. Estimates final cost, projected margin, and potential recovery actions with dollar values.",
    inputSchema: z.object({
      project_id: z.string().describe("The project ID"),
    }),
    execute: async ({ project_id }) => {
      const contract = getContracts().find((c) => c.project_id === project_id)
      const sov = getSOV().filter((s) => s.project_id === project_id)
      const budget = getSOVBudget().filter((b) => b.project_id === project_id)
      const labor = getLaborLogs().filter((l) => l.project_id === project_id)
      const materials = getMaterialDeliveries().filter(
        (m) => m.project_id === project_id
      )
      const changeOrders = getChangeOrders().filter(
        (co) => co.project_id === project_id
      )
      const billing = getBillingHistory().filter(
        (b) => b.project_id === project_id
      )

      if (!contract) return { error: "Project not found" }

      // Calculate total actual costs
      const totalLaborCost = labor.reduce(
        (sum, l) =>
          sum +
          (l.hours_st + l.hours_ot * 1.5) * l.hourly_rate * l.burden_multiplier,
        0
      )
      const totalMaterialCost = materials.reduce(
        (sum, m) => sum + m.total_cost,
        0
      )
      const totalActualCost = totalLaborCost + totalMaterialCost

      const totalEstimatedCost = budget.reduce(
        (sum, b) =>
          sum +
          b.estimated_labor_cost +
          b.estimated_material_cost +
          b.estimated_equipment_cost +
          b.estimated_sub_cost,
        0
      )

      // Get latest billing for % complete proxy
      const latestBilling = billing.sort(
        (a, b) => b.application_number - a.application_number
      )[0]
      const pctBilled = latestBilling
        ? latestBilling.cumulative_billed / contract.original_contract_value
        : 0

      // Forecast - estimate at completion (EAC)
      const costPerformanceIndex =
        pctBilled > 0 ? (totalEstimatedCost * pctBilled) / totalActualCost : 1
      const estimateAtCompletion =
        costPerformanceIndex > 0
          ? totalEstimatedCost / costPerformanceIndex
          : totalEstimatedCost

      const approvedCOs = changeOrders
        .filter((co) => co.status === "Approved")
        .reduce((sum, co) => sum + co.amount, 0)
      const pendingCOs = changeOrders
        .filter(
          (co) => co.status === "Pending" || co.status === "Under Review"
        )
        .reduce((sum, co) => sum + co.amount, 0)

      const adjustedContractValue = contract.original_contract_value + approvedCOs
      const projectedMargin = adjustedContractValue - estimateAtCompletion
      const projectedMarginPct = (projectedMargin / adjustedContractValue) * 100

      // Recovery actions
      const overtimeHours = labor.reduce((sum, l) => sum + l.hours_ot, 0)
      const avgOTRate = labor.length > 0
        ? labor.reduce((sum, l) => sum + l.hourly_rate * l.burden_multiplier, 0) / labor.length
        : 0
      const otPremiumCost = overtimeHours * 0.5 * avgOTRate

      return {
        project_id,
        project_name: contract.project_name,
        original_contract_value: contract.original_contract_value,
        approved_change_orders: approvedCOs,
        pending_change_orders: pendingCOs,
        adjusted_contract_value: adjustedContractValue,
        total_estimated_cost: Math.round(totalEstimatedCost),
        total_actual_cost: Math.round(totalActualCost),
        cost_variance: Math.round(totalActualCost - totalEstimatedCost),
        pct_complete_by_billing: (pctBilled * 100).toFixed(1),
        cost_performance_index: costPerformanceIndex.toFixed(3),
        estimate_at_completion: Math.round(estimateAtCompletion),
        projected_final_margin: Math.round(projectedMargin),
        projected_margin_pct: projectedMarginPct.toFixed(1),
        bid_margin_pct: (
          ((contract.original_contract_value - totalEstimatedCost) /
            contract.original_contract_value) *
          100
        ).toFixed(1),
        margin_erosion: Math.round(
          (contract.original_contract_value - totalEstimatedCost) -
            projectedMargin
        ),
        recovery_opportunities: {
          pending_change_orders_if_approved: Math.round(pendingCOs),
          overtime_premium_spent: Math.round(otPremiumCost),
          overtime_reduction_potential: Math.round(otPremiumCost * 0.5),
          total_potential_recovery: Math.round(
            pendingCOs + otPremiumCost * 0.5
          ),
        },
      }
    },
  }),

  getMaterialAnalysis: tool({
    description:
      "Analyze material deliveries and spending for a project. Shows vendor breakdown, delivery issues, cost vs budget by SOV line.",
    inputSchema: z.object({
      project_id: z.string().describe("The project ID"),
    }),
    execute: async ({ project_id }) => {
      const materials = getMaterialDeliveries().filter(
        (m) => m.project_id === project_id
      )
      const budget = getSOVBudget().filter((b) => b.project_id === project_id)

      const byVendor: Record<string, { count: number; total: number }> = {}
      const byCategory: Record<string, { count: number; total: number }> = {}
      const issues: typeof materials = []

      for (const m of materials) {
        if (!byVendor[m.vendor])
          byVendor[m.vendor] = { count: 0, total: 0 }
        byVendor[m.vendor].count += 1
        byVendor[m.vendor].total += m.total_cost

        if (!byCategory[m.material_category])
          byCategory[m.material_category] = { count: 0, total: 0 }
        byCategory[m.material_category].count += 1
        byCategory[m.material_category].total += m.total_cost

        if (
          m.condition_notes &&
          !m.condition_notes.toLowerCase().includes("good condition")
        ) {
          issues.push(m)
        }
      }

      const totalSpent = materials.reduce((sum, m) => sum + m.total_cost, 0)
      const totalBudgeted = budget.reduce(
        (sum, b) => sum + b.estimated_material_cost,
        0
      )

      return {
        project_id,
        total_deliveries: materials.length,
        total_spent: Math.round(totalSpent),
        total_budgeted: Math.round(totalBudgeted),
        variance: Math.round(totalSpent - totalBudgeted),
        variance_pct:
          totalBudgeted > 0
            ? (((totalSpent - totalBudgeted) / totalBudgeted) * 100).toFixed(1)
            : "N/A",
        by_vendor: Object.entries(byVendor)
          .map(([vendor, data]) => ({
            vendor,
            deliveries: data.count,
            total_cost: Math.round(data.total),
          }))
          .sort((a, b) => b.total_cost - a.total_cost),
        by_category: Object.entries(byCategory)
          .map(([category, data]) => ({
            category,
            deliveries: data.count,
            total_cost: Math.round(data.total),
          }))
          .sort((a, b) => b.total_cost - a.total_cost),
        delivery_issues: issues.map((m) => ({
          date: m.date,
          item: m.item_description,
          vendor: m.vendor,
          notes: m.condition_notes,
          cost: m.total_cost,
        })),
      }
    },
  }),

  sendEmailReport: tool({
    description:
      "Send an email report summarizing findings, alerts, or action items. Use this to proactively alert the CFO about margin issues, pending change orders, or other urgent matters.",
    inputSchema: z.object({
      to: z
        .string()
        .describe("Email address to send to"),
      subject: z.string().describe("Email subject line"),
      body: z
        .string()
        .describe(
          "The full email body in plain text. Include key findings, numbers, and recommended actions."
        ),
    }),
    execute: async ({ to, subject, body }) => {
      // Call our internal email API
      try {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000"

        const response = await fetch(`${baseUrl}/api/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, subject, body }),
        })

        if (!response.ok) {
          return {
            success: false,
            message: "Email delivery failed — API returned an error. The report content is available above.",
          }
        }

        return {
          success: true,
          message: `Email report sent to ${to} with subject: "${subject}"`,
        }
      } catch {
        return {
          success: false,
          message: "Email delivery could not be completed — network error. The report content is available above.",
        }
      }
    },
  }),
}
