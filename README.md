# TalkSuite — Next.js

Your team's plain-English line to NetSuite. Ask a question, get data (table + chart) or a how-to answer.
Includes a **Dashboard** of sales & receivables.

## Run it (works immediately, no AWS/NetSuite needed)

```bash
npm install
npm run dev
```

Open http://localhost:3000

It boots in **DEMO MODE**: the Ask page and Dashboard run on built-in mock data so you can see
the whole thing working before wiring anything up.

## Pages
- `/` — **Ask**: plain-English question → routed to data / help / clarify, with the read-only guardrail and a "Show SuiteQL" toggle.
- `/dashboard` — KPI cards + monthly sales and top-customers charts.

## Going live
Copy `.env.example` to `.env.local` and fill in:

1. **Bedrock** (the brain) — set `BEDROCK_MODEL_ID` + AWS creds. Then the question is turned into SuiteQL by Claude on Bedrock instead of the mock. See `lib/bedrock.ts`.
2. **NetSuite** (the data) — set `NETSUITE_ACCOUNT` + `NETSUITE_ACCESS_TOKEN` (OAuth 2.0 bearer for your read-only role). Then queries run against the real SuiteQL REST endpoint. See `lib/netsuite.ts`.

Each is independent — wire one or both. With neither set, you stay in demo mode.

## How a request flows
`app/api/ask/route.ts` → route + generate (`lib/bedrock.ts`) → **guardrail** (`lib/guardrail.ts`, rejects anything that isn't a single SELECT) → run (`lib/netsuite.ts`) → table + chart.

## Notes
- The guardrail runs **server-side, before execution** — it's the safety net.
- The dashboard currently returns mock metrics from `lib/mock.ts`; swap `app/api/dashboard/route.ts` to run fixed SuiteQL queries when live.
- Validate the SCHEMA field names in `lib/prompt.ts` against your own NetSuite account.
