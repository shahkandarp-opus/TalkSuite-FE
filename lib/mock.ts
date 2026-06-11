// DEMO MODE data. Used whenever Bedrock / NetSuite env vars are not set,
// so the app is fully runnable out of the box. Replace by configuring .env.

export type Plan = {
  mode: "data" | "help" | "clarify";
  query: string;
  chart: "bar" | "line" | "none";
  answer: string;
  suggestions?: string[];
};
export type Rows = { columns: { key: string; label: string }[]; rows: Record<string, any>[] };

const YEAR = new Date().getFullYear();

export function mockPlan(question: string): Plan {
  const q = question.toLowerCase();
  if (q.includes("margin") || q.includes("profit"))
    return {
      mode: "clarify", query: "", chart: "none",
      answer: "I can see revenue, but the data here doesn't include cost of goods, so I can't compute margin. Try asking about revenue or invoiced totals instead.",
      suggestions: ["Show me total revenue by customer", "Which customers grew the most this year?", "What's our revenue trend this year?"],
    };
  if (q.startsWith("how") || q.includes("credit memo") || q.includes("how do") || q.includes("create a") || q.includes("what is"))
    return {
      mode: "help", query: "", chart: "none",
      answer: "To create a credit memo: go to Transactions > Customers > Issue Credit Memo. Pick the customer, add the item or amount to credit, and Save. To apply it to an open invoice, open the invoice and use Accept Payment, or apply the credit from the customer record.",
      suggestions: ["How do I apply it to an open invoice?", "What's the approval workflow for credit memos?", "How do I create a sales order?"],
    };
  if (q.includes("month"))
    return {
      mode: "data",
      query: `SELECT TO_CHAR(t.trandate,'YYYY-MM') AS month, SUM(t.foreigntotal) AS total_sales FROM transaction t WHERE t.type IN ('CustInvc','CashSale') AND t.trandate >= TO_DATE('${YEAR}-01-01','YYYY-MM-DD') GROUP BY TO_CHAR(t.trandate,'YYYY-MM') ORDER BY month`,
      chart: "line",
      answer: `Monthly total sales (invoices + cash sales) for ${YEAR}.`,
      suggestions: ["Which customers drove the highest month?", "Compare that to last year", "Break down the top month by item"],
    };
  if (q.includes("item"))
    return {
      mode: "data",
      query: "SELECT BUILTIN.DF(tl.item) AS item, SUM(ABS(tl.quantity)) AS qty_sold FROM transactionline tl JOIN transaction t ON t.id = tl.transaction WHERE t.type IN ('CustInvc','CashSale') AND tl.item IS NOT NULL GROUP BY tl.item ORDER BY qty_sold DESC FETCH FIRST 5 ROWS ONLY",
      chart: "bar",
      answer: "The five best-selling items by quantity.",
      suggestions: ["Show revenue per item instead of quantity", "Which customers buy Steel Bracket A2?", "Show me low-stock items"],
    };
  if (q.includes("past due") || q.includes("overdue"))
    return {
      mode: "data",
      query: "SELECT t.tranid AS invoice, BUILTIN.DF(t.entity) AS customer, t.duedate, t.foreigntotal AS amount FROM transaction t WHERE t.type = 'CustInvc' AND t.status = 'CustInvc:A' AND t.duedate < (CURRENT_DATE - 60) ORDER BY t.duedate FETCH FIRST 50 ROWS ONLY",
      chart: "none",
      answer: "Open invoices more than 60 days past due, oldest first.",
      suggestions: ["What's the total overdue amount?", "Show only invoices over $10,000", "Which customer has the most overdue invoices?"],
    };
  // default: top customers
  return {
    mode: "data",
    query: `SELECT BUILTIN.DF(t.entity) AS customer, SUM(t.foreigntotal) AS total_invoiced FROM transaction t WHERE t.type = 'CustInvc' AND t.trandate >= TO_DATE('${YEAR}-01-01','YYYY-MM-DD') GROUP BY t.entity ORDER BY total_invoiced DESC FETCH FIRST 10 ROWS ONLY`,
    chart: "bar",
    answer: `The ten customers with the highest total invoiced amount this year.`,
    suggestions: ["Show all open invoices for Northwind Traders", "Which of these have overdue balances?", "Compare top customers to last year"],
  };
}

const CUSTOMERS = ["Northwind Traders", "Globex Corp", "Initech LLC", "Umbrella Foods", "Stark Industries", "Wayne Supplies", "Acme Co", "Hooli Retail", "Soylent Group", "Vandelay Imports"];
const ITEMS = ["Steel Bracket A2", "Hydraulic Hose 1/2\"", "Control Module X", "Filter Pack 12", "Sensor Array S3"];

export function mockRows(query: string): Rows {
  if (query.includes("TO_CHAR(t.trandate")) {
    const months = ["01", "02", "03", "04", "05", "06"];
    const base = [128000, 141500, 119800, 168200, 175400, 162900];
    return { columns: [{ key: "month", label: "Month" }, { key: "total_sales", label: "Total Sales" }],
      rows: months.map((m, i) => ({ month: `${YEAR}-${m}`, total_sales: base[i] })) };
  }
  if (query.includes("tl.item")) {
    const qty = [1840, 1520, 1310, 980, 760];
    return { columns: [{ key: "item", label: "Item" }, { key: "qty_sold", label: "Qty Sold" }],
      rows: ITEMS.map((it, i) => ({ item: it, qty_sold: qty[i] })) };
  }
  if (query.includes("duedate")) {
    const rows = CUSTOMERS.slice(0, 6).map((c, i) => ({
      invoice: `INV10${42 + i}`, customer: c,
      duedate: `${YEAR}-0${(i % 3) + 1}-1${i}`, amount: [12400, 8800, 23150, 5400, 17600, 9900][i],
    }));
    return { columns: [{ key: "invoice", label: "Invoice" }, { key: "customer", label: "Customer" }, { key: "duedate", label: "Due Date" }, { key: "amount", label: "Amount" }], rows };
  }
  // top customers (default)
  const totals = [482000, 391500, 357200, 298400, 264900, 231000, 198700, 176500, 142300, 121800];
  return { columns: [{ key: "customer", label: "Customer" }, { key: "total_invoiced", label: "Total Invoiced" }],
    rows: CUSTOMERS.map((c, i) => ({ customer: c, total_invoiced: totals[i] })) };
}

export function mockDashboard() {
  return {
    kpis: [
      { label: "Revenue (YTD)", value: 1896700, prefix: "$" },
      { label: "Open Invoices", value: 38 },
      { label: "Overdue > 60d", value: 6 },
      { label: "Active Customers", value: 142 },
    ],
    monthly: mockRows("TO_CHAR(t.trandate").rows,
    topCustomers: mockRows("BUILTIN.DF(t.entity)").rows.slice(0, 6),
  };
}
