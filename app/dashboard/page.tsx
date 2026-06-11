"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { LayoutDashboard, TrendingUp, DollarSign, Package, TrendingDown, Minus } from "lucide-react";

const TT = {
  background: "#0e1118", border: "1px solid #242b3d", borderRadius: 8,
  color: "#e6e8f0", fontFamily: "IBM Plex Mono, monospace", fontSize: 12,
};
const money = (n: number) => "$" + n.toLocaleString();
const pct = (n: number, d = 1) => n.toLocaleString(undefined, { maximumFractionDigits: d }) + "%";

type Tab = "overview" | "sales" | "finance" | "inventory";

const MONTHLY_MOCK = [
  { name: "Jan", value: 185000 }, { name: "Feb", value: 212000 },
  { name: "Mar", value: 248000 }, { name: "Apr", value: 229000 },
  { name: "May", value: 271000 }, { name: "Jun", value: 305000 },
  { name: "Jul", value: 288000 }, { name: "Aug", value: 322000 },
  { name: "Sep", value: 341000 }, { name: "Oct", value: 298000 },
  { name: "Nov", value: 360000 }, { name: "Dec", value: 0 },
];

const CUSTOMERS_MOCK = [
  { name: "Acme Corp", value: 284000 }, { name: "Globex Inc", value: 218000 },
  { name: "Initech", value: 175000 }, { name: "Umbrella Ltd", value: 142000 },
  { name: "Stark Ind.", value: 128000 },
];

const AGING_MOCK = [
  { name: "Current", value: 485200 }, { name: "1-30d", value: 182000 },
  { name: "31-60d", value: 94000 }, { name: "61-90d", value: 42100 },
  { name: ">90d", value: 18400 },
];

const INVENTORY_MOCK = [
  { name: "Electronics", value: 320000 }, { name: "Hardware", value: 185000 },
  { name: "Software", value: 142000 }, { name: "Services", value: 98000 },
  { name: "Other", value: 45000 },
];

const LOW_STOCK_MOCK = [
  { name: "SKU-1042", value: 3 }, { name: "SKU-2818", value: 5 },
  { name: "SKU-0391", value: 7 }, { name: "SKU-4420", value: 8 },
  { name: "SKU-1187", value: 11 },
];

function Trend({ val, up, neutral }: { val: string; up?: boolean; neutral?: boolean }) {
  const cls = neutral ? "neutral" : up ? "up" : "down";
  const Icon = neutral ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <div className={`k-trend ${cls}`}>
      <Icon size={11} /> {val}
    </div>
  );
}

function KpiCard({
  label, value, trend, up, neutral, accent,
}: {
  label: string; value: string | number; trend: string;
  up?: boolean; neutral?: boolean; accent: string;
}) {
  return (
    <div className="kpi">
      <div className="kpi-accent" style={{ background: accent }} />
      <div className="k-label">{label}</div>
      <div className="k-val">{value}</div>
      <Trend val={trend} up={up} neutral={neutral} />
    </div>
  );
}

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [apiData, setApiData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setApiData).catch(() => {});
  }, []);

  const monthly = apiData
    ? (apiData.monthly || []).map((m: any) => ({ name: m.month, value: m.total_sales }))
    : MONTHLY_MOCK;
  const topCustomers = apiData
    ? (apiData.topCustomers || []).map((c: any) => ({ name: c.customer, value: c.total_invoiced }))
    : CUSTOMERS_MOCK;
  const overviewKpis = apiData?.kpis || [
    { label: "Revenue YTD", value: 2859000, prefix: "$" },
    { label: "Open Invoices", value: 485200, prefix: "$" },
    { label: "Overdue >60d", value: 42100, prefix: "$" },
    { label: "Active Customers", value: 214 },
  ];

  const TABS: { id: Tab; label: string; icon: any; cls: string }[] = [
    { id: "overview",   label: "Overview",   icon: LayoutDashboard, cls: "" },
    { id: "sales",      label: "Sales",      icon: TrendingUp,      cls: "t-sales" },
    { id: "finance",    label: "Finance",    icon: DollarSign,      cls: "t-finance" },
    { id: "inventory",  label: "Inventory",  icon: Package,         cls: "t-inv" },
  ];

  return (
    <div>
      <div className="pg-badge teal"><LayoutDashboard size={11} /> Live Dashboard</div>
      <h1 className="page-h">Business Dashboard</h1>
      <p className="page-sub">
        Real-time KPIs and charts for your Sales, Finance, and Inventory teams — sourced from NetSuite.
      </p>

      <div className="demo-banner">
        ⚡ DEMO DATA — connect .env.local with NETSUITE_ACCOUNT to see live SuiteQL data
      </div>

      <div className="dash-tabs">
        {TABS.map(({ id, label, icon: Icon, cls }) => (
          <button
            key={id}
            className={`dash-tab ${cls} ${tab === id ? "t-active" : ""}`}
            onClick={() => setTab(id)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <>
          <div className="kpis">
            {overviewKpis.map((k: any) => (
              <KpiCard
                key={k.label}
                label={k.label}
                value={k.prefix === "$" ? money(k.value) : k.value.toLocaleString()}
                trend="vs last year"
                neutral
                accent="var(--accent)"
              />
            ))}
          </div>

          <div className="sec-head"><span className="sec-title">Monthly Sales</span><div className="sec-line" /></div>
          <div className="charts" style={{ marginBottom: 24 }}>
            <div className="chart">
              <h3>Revenue by Month</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthly} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2db82d" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2db82d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1c2132" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                  <YAxis tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                  <Tooltip contentStyle={TT} cursor={{ stroke: "#2db82d", strokeOpacity: .3 }} />
                  <Area type="monotone" dataKey="value" stroke="#2db82d" strokeWidth={2.5}
                    fill="url(#salesGrad)" dot={{ r: 3, fill: "#2db82d" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="chart">
              <h3>Top Customers YTD</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topCustomers} margin={{ top: 8, right: 16, left: 0, bottom: 44 }}>
                  <CartesianGrid stroke="#1c2132" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#717a96", fontSize: 10 }} stroke="#242b3d"
                    interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                  <Tooltip contentStyle={TT} cursor={{ fill: "rgba(45,184,45,.07)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {topCustomers.map((_: any, i: number) => (
                      <Cell key={i} fill="#2db82d" fillOpacity={0.5 + 0.5 * (1 - i / Math.max(topCustomers.length, 1))} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ── Sales ── */}
      {tab === "sales" && (
        <>
          <div className="kpis">
            <KpiCard label="Revenue YTD"   value={money(2859000)} trend="+12.4% vs last year" up accent="var(--sales)" />
            <KpiCard label="Open Quotes"   value="148"           trend="+8 this week"          up accent="var(--sales)" />
            <KpiCard label="Won Deals"     value="89"            trend="+15.2% win rate"        up accent="var(--sales)" />
            <KpiCard label="Avg Deal Size" value={money(32100)}  trend="+$1.8k vs last month"   up accent="var(--sales)" />
          </div>

          <div className="sec-head"><span className="sec-title">Revenue Trend</span><div className="sec-line" /></div>
          <div className="charts" style={{ marginBottom: 24 }}>
            <div className="chart">
              <h3>Monthly Revenue</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={MONTHLY_MOCK} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="salesG2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2db82d" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2db82d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1c2132" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                  <YAxis tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                  <Tooltip contentStyle={TT} />
                  <Area type="monotone" dataKey="value" stroke="#2db82d" strokeWidth={2.5}
                    fill="url(#salesG2)" dot={{ r: 3, fill: "#2db82d" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="chart">
              <h3>Top Customers</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={CUSTOMERS_MOCK} margin={{ top: 8, right: 16, left: 0, bottom: 44 }}>
                  <CartesianGrid stroke="#1c2132" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#717a96", fontSize: 10 }} stroke="#242b3d"
                    interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                  <Tooltip contentStyle={TT} cursor={{ fill: "rgba(45,184,45,.07)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {CUSTOMERS_MOCK.map((_, i) => (
                      <Cell key={i} fill="#2db82d" fillOpacity={0.5 + 0.5 * (1 - i / 5)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ── Finance ── */}
      {tab === "finance" && (
        <>
          <div className="kpis">
            <KpiCard label="Open Invoices"  value={money(485200)}  trend="+3.1% vs last month" accent="var(--finance)" />
            <KpiCard label="Overdue >60d"   value={money(42100)}   trend="-18% improvement"  up accent="var(--finance)" />
            <KpiCard label="Cash on Hand"   value={money(1240000)} trend="+5.2% this month"  up accent="var(--finance)" />
            <KpiCard label="DSO (Days)"     value="38"             trend="-2d improvement"   up accent="var(--finance)" />
          </div>

          <div className="sec-head"><span className="sec-title">Receivables</span><div className="sec-line" /></div>
          <div className="charts" style={{ marginBottom: 24 }}>
            <div className="chart">
              <h3>AR Aging Buckets</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={AGING_MOCK} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke="#1c2132" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                  <YAxis tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                  <Tooltip contentStyle={TT} cursor={{ fill: "rgba(79,207,133,.07)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {AGING_MOCK.map((_, i) => (
                      <Cell key={i} fill={i >= 3 ? "#f06b6b" : "#4fcf85"}
                        fillOpacity={i >= 3 ? 0.85 : 0.7 - i * 0.08} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart">
              <h3>Cash Flow (Monthly)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={MONTHLY_MOCK} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="cashG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4fcf85" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4fcf85" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1c2132" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                  <YAxis tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                  <Tooltip contentStyle={TT} />
                  <Area type="monotone" dataKey="value" stroke="#4fcf85" strokeWidth={2.5}
                    fill="url(#cashG)" dot={{ r: 3, fill: "#4fcf85" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ── Inventory ── */}
      {tab === "inventory" && (
        <>
          <div className="kpis">
            <KpiCard label="Items In Stock"   value="4,820"        trend="+120 received"      up accent="var(--inventory)" />
            <KpiCard label="Low Stock Alerts" value="23"           trend="+7 new alerts"             accent="var(--inventory)" />
            <KpiCard label="Open PO Value"    value={money(285000)} trend="+$42k this week"   up accent="var(--inventory)" />
            <KpiCard label="Fulfillment Rate" value={pct(97.2)}    trend="+0.8% improvement"  up accent="var(--inventory)" />
          </div>

          <div className="sec-head"><span className="sec-title">Stock Overview</span><div className="sec-line" /></div>
          <div className="charts" style={{ marginBottom: 24 }}>
            <div className="chart">
              <h3>Value by Category</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={INVENTORY_MOCK} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke="#1c2132" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                  <YAxis tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                  <Tooltip contentStyle={TT} cursor={{ fill: "rgba(61,213,213,.07)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {INVENTORY_MOCK.map((_, i) => (
                      <Cell key={i} fill="#3dd5d5" fillOpacity={0.85 - i * 0.1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart">
              <h3>Low Stock Items (Units)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={LOW_STOCK_MOCK} layout="vertical"
                  margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
                  <CartesianGrid stroke="#1c2132" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" width={68} />
                  <Tooltip contentStyle={TT} cursor={{ fill: "rgba(240,107,107,.06)" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {LOW_STOCK_MOCK.map((_, i) => (
                      <Cell key={i} fill="#f06b6b" fillOpacity={0.75 + i * 0.04} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
