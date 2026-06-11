"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Plus, ShieldCheck, ShieldAlert, Database, BookOpen,
  CircleHelp, Code2, Mic, MicOff, Send, ClipboardList, X,
  Sparkles, RotateCcw,
} from "lucide-react";

// ─── types ───────────────────────────────────────────────────────────────────
type AiMsg = {
  id: string; role: "assistant";
  mode?: "data" | "help" | "clarify";
  answer?: string; query?: string; guardrail?: string; blocked?: boolean;
  columns?: any[]; rows?: any[]; chart?: string; suggestions?: string[];
  error?: string;
};
type UserMsg = { id: string; role: "user"; question: string };
type Message = UserMsg | AiMsg | { id: string; role: "loading" };

type Chat = { id: string; title: string; messages: Message[]; updatedAt: number };
type AuditEntry = { id: string; ts: number; question: string; mode: string; query: string; rows: number };

const LS_CHATS = "ts_chats";
const LS_AUDIT = "ts_audit";
const TT = {
  background: "#0e1118", border: "1px solid #242b3d", borderRadius: 8,
  color: "#e6e8f0", fontFamily: "IBM Plex Mono, monospace", fontSize: 12,
};
const fmt = (v: any) => typeof v === "number" ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v;
const uid = () => Math.random().toString(36).slice(2, 10);
const elapsed = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const STARTERS = [
  "Top 10 customers by revenue this year",
  "Total sales by month this year",
  "Which invoices are more than 60 days past due?",
  "How do I create a credit memo in NetSuite?",
  "Show me best-selling items by quantity",
];

// ─── sub-components ───────────────────────────────────────────────────────────
function AiResultCard({ msg, onFollowUp }: { msg: AiMsg; onFollowUp: (q: string) => void }) {
  const [showQuery, setShowQuery] = useState(false);
  const cols = msg.columns || [];
  const rows = msg.rows || [];
  const xKey = cols[0]?.key;
  const numKey = cols.find((c: any) => c.key !== xKey && rows.some((r: any) => typeof r[c.key] === "number"))?.key;
  const chartData = xKey && numKey ? rows.map((r: any) => ({ name: String(r[xKey]), value: Number(r[numKey]) })) : [];
  const showChart = msg.chart && msg.chart !== "none" && chartData.length > 0;

  return (
    <div className="ai-body">
      {/* mode tag */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className={`tag ${msg.mode}`}>
          {msg.mode === "data" ? <Database size={11} /> : msg.mode === "help" ? <BookOpen size={11} /> : <CircleHelp size={11} />}
          {msg.mode?.toUpperCase()}
        </span>
      </div>

      {/* answer */}
      {msg.error
        ? <div className="guard bad"><ShieldAlert size={14} />{msg.error}</div>
        : <div className="ai-answer">{msg.answer}</div>}

      {/* guardrail */}
      {msg.mode === "data" && !msg.error && (
        msg.blocked
          ? <div className="guard bad"><ShieldAlert size={14} />Blocked: {msg.guardrail}</div>
          : <div className="guard"><ShieldCheck size={14} />{msg.guardrail}</div>
      )}

      {/* table */}
      {!msg.blocked && !msg.error && cols.length > 0 && (
        <div className="card" style={{ overflow: "hidden" }}>
          <table>
            <thead><tr>{cols.map((c: any) => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {rows.map((r: any, i: number) => (
                <tr key={i}>{cols.map((c: any) => <td key={c.key}>{fmt(r[c.key])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* chart */}
      {showChart && (
        <div className="chart" style={{ padding: "14px 12px 8px" }}>
          <ResponsiveContainer width="100%" height={240}>
            {msg.chart === "line" ? (
              <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id={`g${msg.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2db82d" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2db82d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1c2132" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                <YAxis tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                <Tooltip contentStyle={TT} cursor={{ stroke: "#2db82d", strokeOpacity: .3 }} />
                <Area type="monotone" dataKey="value" stroke="#2db82d" strokeWidth={2.5}
                  fill={`url(#g${msg.id})`} dot={{ r: 3, fill: "#2db82d" }} />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: chartData.length > 6 ? 44 : 4 }}>
                <CartesianGrid stroke="#1c2132" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d"
                  interval={0} angle={chartData.length > 6 ? -25 : 0}
                  textAnchor={chartData.length > 6 ? "end" : "middle"}
                  height={chartData.length > 6 ? 60 : 30} />
                <YAxis tick={{ fill: "#717a96", fontSize: 11 }} stroke="#242b3d" />
                <Tooltip contentStyle={TT} cursor={{ fill: "rgba(45,184,45,.07)" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((_: any, i: number) => (
                    <Cell key={i} fill="#2db82d" fillOpacity={0.5 + 0.5 * (1 - i / Math.max(chartData.length, 1))} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* show SuiteQL toggle */}
      {!msg.blocked && !msg.error && msg.query && (
        <>
          <button className="toggle" onClick={() => setShowQuery(s => !s)}>
            <Code2 size={13} />{showQuery ? "Hide" : "Show"} SuiteQL
          </button>
          {showQuery && <pre className="code">{msg.query}</pre>}
        </>
      )}

      {/* follow-up suggestions */}
      {msg.suggestions && msg.suggestions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <div className="suggestions-label">Follow up</div>
          <div className="suggestions">
            {msg.suggestions.map((s) => (
              <button key={s} className="sug-chip" onClick={() => onFollowUp(s)}>{s}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── audit modal ──────────────────────────────────────────────────────────────
function AuditModal({ entries, onClose }: { entries: AuditEntry[]; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-hd">
          <h2>Audit Log</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {entries.length === 0
            ? <div className="audit-empty">No queries logged yet.</div>
            : (
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Time</th><th>Question</th><th>Mode</th><th>SuiteQL</th><th>Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {[...entries].reverse().map(e => (
                    <tr key={e.id}>
                      <td style={{ whiteSpace: "nowrap", fontFamily: "var(--mono)", fontSize: 11 }}>
                        {new Date(e.ts).toLocaleTimeString()}
                      </td>
                      <td><div className="audit-q">{e.question}</div></td>
                      <td>
                        <span className={`tag ${e.mode}`} style={{ fontSize: 9 }}>
                          {e.mode.toUpperCase()}
                        </span>
                      </td>
                      <td><div className="audit-sql">{e.query || "—"}</div></td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{e.rows || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_CHATS);
      if (raw) setChats(JSON.parse(raw));
      const rawAudit = localStorage.getItem(LS_AUDIT);
      if (rawAudit) setAudit(JSON.parse(rawAudit));
    } catch {}
  }, []);

  // persist chats
  const persistChats = useCallback((updated: Chat[]) => {
    setChats(updated);
    try { localStorage.setItem(LS_CHATS, JSON.stringify(updated.slice(-30))); } catch {}
  }, []);

  const persistAudit = useCallback((updated: AuditEntry[]) => {
    setAudit(updated);
    try { localStorage.setItem(LS_AUDIT, JSON.stringify(updated.slice(-200))); } catch {}
  }, []);

  const activeChat = chats.find(c => c.id === activeId) || null;

  // scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages?.length, loading]);

  function newChat() {
    const id = uid();
    const chat: Chat = { id, title: "New chat", messages: [], updatedAt: Date.now() };
    persistChats([...chats, chat]);
    setActiveId(id);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function clearContext() {
    if (!activeId) return;
    persistChats(chats.map(c => c.id === activeId ? { ...c, messages: [], updatedAt: Date.now() } : c));
  }

  // build conversation history for API (last 12 messages, text only)
  function buildHistory(messages: Message[]) {
    return messages.slice(-12).flatMap((m): { role: "user" | "assistant"; content: string }[] => {
      if (m.role === "user") return [{ role: "user", content: (m as UserMsg).question }];
      if (m.role === "assistant") {
        const a = m as AiMsg;
        const content = `[${(a.mode || "").toUpperCase()}] ${a.answer || ""}${a.rows?.length ? ` Returned ${a.rows.length} rows.` : ""}`;
        return [{ role: "assistant", content }];
      }
      return [];
    });
  }

  async function ask(question?: string) {
    const text = (question ?? input).trim();
    if (!text || loading) return;

    // ensure there's an active chat
    let chatId = activeId;
    let currentChats = chats;
    if (!chatId) {
      const id = uid();
      const words = text.split(" ").slice(0, 6).join(" ");
      const newC: Chat = { id, title: words, messages: [], updatedAt: Date.now() };
      currentChats = [...chats, newC];
      persistChats(currentChats);
      chatId = id;
      setActiveId(id);
    }

    const chat = currentChats.find(c => c.id === chatId)!;

    // auto-title from first real message
    const isFirst = chat.messages.filter(m => m.role === "user").length === 0;
    const title = isFirst ? text.split(" ").slice(0, 6).join(" ") : chat.title;

    const userMsg: UserMsg = { id: uid(), role: "user", question: text };
    const loadingMsg: Message = { id: uid(), role: "loading" };
    const history = buildHistory(chat.messages);

    const updated = currentChats.map(c =>
      c.id === chatId ? { ...c, title, messages: [...c.messages, userMsg, loadingMsg], updatedAt: Date.now() } : c
    );
    persistChats(updated);
    setInput("");
    setLoading(true);

    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, history }),
      });
      const data = await r.json();

      const aiMsg: AiMsg = {
        id: uid(), role: "assistant",
        mode: data.mode, answer: data.answer, query: data.query,
        guardrail: data.guardrail, blocked: data.blocked,
        columns: data.columns, rows: data.rows, chart: data.chart,
        suggestions: data.suggestions,
        error: data.error,
      };

      // log to audit
      const entry: AuditEntry = {
        id: uid(), ts: Date.now(), question: text,
        mode: data.mode || "unknown", query: data.query || "",
        rows: data.rows?.length || 0,
      };
      persistAudit([...audit, entry]);

      const final = updated.map(c =>
        c.id === chatId
          ? { ...c, messages: [...c.messages.filter(m => m.role !== "loading"), aiMsg], updatedAt: Date.now() }
          : c
      );
      persistChats(final);
    } catch {
      const errMsg: AiMsg = { id: uid(), role: "assistant", error: "Request failed. Please try again." };
      const final = updated.map(c =>
        c.id === chatId
          ? { ...c, messages: [...c.messages.filter(m => m.role !== "loading"), errMsg], updatedAt: Date.now() }
          : c
      );
      persistChats(final);
    }
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); }
  }

  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    rec.onerror = () => setListening(false);
    rec.start();
  }

  return (
    <div className="chat-layout">
      {/* ── history sidebar ── */}
      <aside className="chat-hist">
        <div className="ch-top">
          <button className="new-chat-btn" onClick={newChat}>
            <Plus size={14} /> New Chat
          </button>
        </div>

        <div className="ch-list">
          {chats.length === 0 && (
            <div style={{ padding: "20px 10px", color: "var(--muted2)", fontSize: 12, textAlign: "center", fontFamily: "var(--mono)" }}>
              No chats yet
            </div>
          )}
          {[...chats].reverse().map(chat => (
            <button
              key={chat.id}
              className={`ch-item${chat.id === activeId ? " ch-active" : ""}`}
              onClick={() => setActiveId(chat.id)}
            >
              <span className="ch-title">{chat.title}</span>
              <span className="ch-time">{elapsed(chat.updatedAt)}</span>
            </button>
          ))}
        </div>

        <div className="ch-footer">
          <button className="audit-btn" onClick={() => setShowAudit(true)}>
            <ClipboardList size={13} /> Audit Log
          </button>
        </div>
      </aside>

      {/* ── chat thread ── */}
      <div className="chat-thread">
        {activeChat ? (
          <>
            {/* header */}
            <div className="chat-hd">
              <div>
                <div className="chat-hd-title">{activeChat.title}</div>
                <div className="chat-hd-sub">
                  {activeChat.messages.filter(m => m.role === "user").length} question
                  {activeChat.messages.filter(m => m.role === "user").length !== 1 ? "s" : ""} in this session
                </div>
              </div>
              <button className="clear-ctx-btn" onClick={clearContext}>
                <RotateCcw size={13} /> Clear context
              </button>
            </div>

            {/* messages */}
            <div className="messages-area">
              {activeChat.messages.map(msg => {
                if (msg.role === "user") {
                  return (
                    <div key={msg.id} className="msg-user">
                      <div className="msg-user-bubble">{(msg as UserMsg).question}</div>
                    </div>
                  );
                }
                if (msg.role === "loading") {
                  return (
                    <div key={msg.id} className="msg-ai">
                      <div className="ai-header">
                        <div className="ai-avatar">TS</div>
                      </div>
                      <div className="ai-body">
                        <div className="ai-loading">
                          <span /><span /><span />
                        </div>
                      </div>
                    </div>
                  );
                }
                const m = msg as AiMsg;
                return (
                  <div key={msg.id} className="msg-ai">
                    <div className="ai-header">
                      <div className="ai-avatar">TS</div>
                    </div>
                    <AiResultCard msg={m} onFollowUp={ask} />
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* input */}
            <div className="input-bar">
              <div className="input-row">
                <div className="input-wrap">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask NetSuite anything in plain English…"
                    disabled={loading}
                  />
                  <button
                    className={`mic-btn${listening ? " listening" : ""}`}
                    onClick={startListening}
                    title="Voice input"
                    disabled={loading}
                  >
                    {listening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                </div>
                <button className="send-btn" onClick={() => ask()} disabled={loading || !input.trim()}>
                  {loading ? <Sparkles size={15} className="spin" /> : <Send size={15} />}
                  {loading ? "WORKING" : "SEND"}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* welcome / empty state */
          <>
            <div className="chat-welcome">
              <div className="cw-logo">🌐</div>
              <div className="cw-title">Opus AI</div>
              <div className="cw-sub">
                Opus Inspection's NetSuite assistant. Ask about invoices, inventory,
                customers, or how-to guidance — in plain English, no training needed.
              </div>
              <div className="cw-chips">
                {STARTERS.map(s => (
                  <button key={s} className="chip" onClick={() => ask(s)}>{s}</button>
                ))}
              </div>
            </div>
            {/* floating input bar at bottom of empty state */}
            <div className="input-bar">
              <div className="input-row">
                <div className="input-wrap">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask NetSuite anything in plain English…"
                    disabled={loading}
                  />
                  <button
                    className={`mic-btn${listening ? " listening" : ""}`}
                    onClick={startListening}
                    title="Voice input"
                    disabled={loading}
                  >
                    {listening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                </div>
                <button className="send-btn" onClick={() => ask()} disabled={loading || !input.trim()}>
                  {loading ? <Sparkles size={15} className="spin" /> : <Send size={15} />}
                  {loading ? "WORKING" : "SEND"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* audit modal */}
      {showAudit && <AuditModal entries={audit} onClose={() => setShowAudit(false)} />}
    </div>
  );
}
