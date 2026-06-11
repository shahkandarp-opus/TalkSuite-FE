// Demo dashboard data. Used when the backend dashboard endpoint isn't available.

const YEAR = new Date().getFullYear();
const CUSTOMERS = ["Northwind Traders", "Globex Corp", "Initech LLC", "Umbrella Foods", "Stark Industries", "Wayne Supplies"];

export function mockDashboard() {
  const months = ["01", "02", "03", "04", "05", "06"];
  const base = [128000, 141500, 119800, 168200, 175400, 162900];
  const totals = [482000, 391500, 357200, 298400, 264900, 231000];

  return {
    kpis: [
      { label: "Revenue (YTD)", value: 1896700, prefix: "$" },
      { label: "Open Invoices", value: 38 },
      { label: "Overdue > 60d", value: 6 },
      { label: "Active Customers", value: 142 },
    ],
    monthly: months.map((m, i) => ({ month: `${YEAR}-${m}`, total_sales: base[i] })),
    topCustomers: CUSTOMERS.map((c, i) => ({ customer: c, total_invoiced: totals[i] })),
  };
}
