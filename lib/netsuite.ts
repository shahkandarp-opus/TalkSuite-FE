import { mockRows, type Rows } from "./mock";

// Executes a (already-validated, read-only) SuiteQL query via the SuiteQL REST
// endpoint. Falls back to DEMO MODE (simulated rows) when NetSuite is not configured.
// This is the single step you swap for live data — everything else stays the same.
export async function runSuiteQL(query: string): Promise<Rows> {
  const account = process.env.NETSUITE_ACCOUNT;
  const token = process.env.NETSUITE_ACCESS_TOKEN;
  if (!account || !token) return mockRows(query);

  try {
    const url = `https://${account}.suitetalk.api.netsuite.com/services/rest/query/v1/suiteql`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "transient",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ q: query }),
    });
    if (!res.ok) throw new Error(`SuiteQL HTTP ${res.status}`);
    const data = await res.json();
    const items: any[] = data.items || [];
    const keys = items.length ? Object.keys(items[0]).filter((k) => k !== "links") : [];
    return {
      columns: keys.map((k) => ({ key: k, label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) })),
      rows: items.map((it) => { const o: any = {}; keys.forEach((k) => (o[k] = it[k])); return o; }),
    };
  } catch (err) {
    console.error("SuiteQL call failed, using demo mode:", err);
    return mockRows(query);
  }
}
