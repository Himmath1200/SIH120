import type { AllResult, Kpi } from "../types";

/** Downloads the current well KPIs (and before/after results when available) as a CSV file. */
export function exportReport(wellId: string, kpi?: Kpi, all?: AllResult) {
  const rows: (string | number)[][] = [["DEMO / SIMULATION ONLY - synthetic data, not Baghewala field measurements"], [], ["Well", wellId], []];
  if (kpi) {
    rows.push(["Baseline KPI", "Value"]);
    Object.entries(kpi).forEach(([k, v]) => rows.push([k, v]));
    rows.push([]);
  }
  if (all) {
    rows.push(["Metric", "Before", "After"]);
    const b = all.combined.before, a = all.combined.after;
    (Object.keys(b) as (keyof typeof b)[]).forEach((k) => rows.push([k, b[k], a[k]]));
    rows.push([], ["Recommended CSS", JSON.stringify(all.css.recommended)], ["Recommended SRP", JSON.stringify(all.srp.recommended)],
      ["Production improvement %", all.css.production_improvement_pct]);
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${wellId}-report.csv`; a.click();
  URL.revokeObjectURL(url);
}
