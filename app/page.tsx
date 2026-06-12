"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Plus, Database, BookOpen, CircleHelp, Mic, MicOff,
  Send, X, Sparkles, Loader2, ChevronDown, Zap, Search,
} from "lucide-react";
import {
  createConversation, listConversations, getConversation,
  deleteConversation, sendMessage, healthCheck, transcribeAudio,
  type Conversation,
} from "@/lib/api";

// ─── types ───────────────────────────────────────────────────────────────────
type ChartBlock = {
  chart_type: "bar" | "line" | "area" | "none";
  title: string;
  data: any[];
  keys?: { x: string; y?: string; series?: string[] };
  options?: { y_label?: string; currency?: string; colors?: string[] };
};

type AiMsg = {
  id: string; role: "assistant";
  answer: string;
  chartBlock?: ChartBlock;
  suggestions?: string[];
  status?: "thinking" | "tool_call" | "streaming" | "done";
  toolName?: string;
  reasoning?: ReasoningStep[];
  error?: string;
};

type ReasoningStep = {
  type: "thinking" | "tool_call" | "tool_result" | "source";
  label: string;
  detail?: string;
};
type UserMsg = { id: string; role: "user"; question: string };
type Message = UserMsg | AiMsg;

// ─── parser for stored answers (extract chart + followups from raw text) ──────
function parseStoredAnswer(raw: string): {
  text: string;
  chartBlock?: ChartBlock;
  suggestions?: string[];
} {
  let text = raw;
  let chartBlock: ChartBlock | undefined;
  let suggestions: string[] | undefined;

  // Extract ```chartdata ... ``` block
  const chartMatch = text.match(/```chartdata\s*([\s\S]*?)```/);
  if (chartMatch) {
    try {
      chartBlock = JSON.parse(chartMatch[1].trim());
    } catch {}
    text = text.replace(chartMatch[0], "").trim();
  }

  // Extract ```followups ... ``` block
  const followMatch = text.match(/```followups\s*([\s\S]*?)```/);
  if (followMatch) {
    try {
      suggestions = JSON.parse(followMatch[1].trim());
    } catch {}
    text = text.replace(followMatch[0], "").trim();
  }

  // Also handle <followups>...</followups> tag format
  const followTag = text.match(/<followups>\s*([\s\S]*?)<\/followups>/);
  if (followTag) {
    try {
      suggestions = JSON.parse(followTag[1].trim());
    } catch {}
    text = text.replace(followTag[0], "").trim();
  }

  // Strip <thinking>...</thinking> tags
  text = text.replace(/<thinking>[\s\S]*?<\/thinking>/g, "").trim();

  return { text, chartBlock, suggestions };
}


type Chat = {
  id: string;         // frontend ID
  backendId: string;  // backend conversation UUID
  title: string;
  messages: Message[];
  updatedAt: number;
};

const TT = {
  background: "#ffffff", border: "1px solid #ccd3d4", borderRadius: 0,
  color: "#131e29", fontFamily: "'Brokman', sans-serif", fontSize: 12,
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
  const [showReasoning, setShowReasoning] = useState(false);
  const chart = msg.chartBlock;
  const chartData = chart?.data || [];
  const showChart = chart && chart.chart_type !== "none" && chartData.length > 0;
  const xKey = chart?.keys?.x || "name";
  const yKey = chart?.keys?.y || "value";
  const hasReasoning = msg.reasoning && msg.reasoning.length > 0;

  return (
    <div className="ai-body">
      {/* reasoning section (collapsible, at top like Gemini) */}
      {hasReasoning && msg.status === "done" && (
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={() => setShowReasoning((s) => !s)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "1px solid var(--border)", borderRadius: 6,
              padding: "6px 10px", cursor: "pointer", color: "var(--muted)",
              fontSize: 11, fontFamily: "var(--mono)", width: "fit-content",
            }}
          >
            <Zap size={11} />
            Reasoning ({msg.reasoning!.length} step{msg.reasoning!.length !== 1 ? "s" : ""})
            <ChevronDown
              size={12}
              style={{ transform: showReasoning ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            />
          </button>
          {showReasoning && (
            <div style={{
              marginTop: 8, padding: "10px 12px", background: "var(--card)",
              border: "1px solid var(--border)", borderRadius: 8, fontSize: 12,
            }}>
              {msg.reasoning!.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: i < msg.reasoning!.length - 1 ? 8 : 0 }}>
                  <div style={{
                    minWidth: 20, height: 20, borderRadius: "50%",
                    background: step.type === "tool_call" ? "#FF820022" : step.type === "tool_result" ? "#4c9c2e22" : step.type === "source" ? "#004a9822" : "#f0f4f511",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {step.type === "tool_call" && <Database size={10} style={{ color: "#FF8200" }} />}
                    {step.type === "tool_result" && <Zap size={10} style={{ color: "#4c9c2e" }} />}
                    {step.type === "source" && <Search size={10} style={{ color: "#004a98" }} />}
                    {step.type === "thinking" && <Loader2 size={10} style={{ color: "var(--muted)" }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "var(--fg)", fontWeight: 500 }}>{step.label}</div>
                    {step.detail && (
                      <div style={{ color: "var(--muted2)", marginTop: 2, fontSize: 11 }}>{step.detail}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* status indicator (while streaming) */}
      {msg.status === "thinking" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted2)", fontSize: 12 }}>
          <Loader2 size={12} className="spin" /> Thinking...
        </div>
      )}
      {msg.status === "tool_call" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#FF8200", fontSize: 12 }}>
          <Database size={12} /> Querying: {msg.toolName}
        </div>
      )}

      {/* error */}
      {msg.error && <div className="guard bad">{msg.error}</div>}

      {/* answer text */}
      {msg.answer && <div className="ai-answer"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.answer}</ReactMarkdown></div>}

      {/* chart */}
      {showChart && (
        <div className="chart" style={{ padding: "14px 12px 8px" }}>
          {chart.title && (
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, fontWeight: 500 }}>
              {chart.title}
            </div>
          )}
          <ResponsiveContainer width="100%" height={240}>
            {chart.chart_type === "line" || chart.chart_type === "area" ? (
              <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id={`g${msg.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#004851" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#004851" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e0e4e5" vertical={false} />
                <XAxis dataKey={xKey} tick={{ fill: "#54565a", fontSize: 11 }} stroke="#ccd3d4" />
                <YAxis tick={{ fill: "#54565a", fontSize: 11 }} stroke="#ccd3d4" />
                <Tooltip contentStyle={TT} cursor={{ stroke: "#004851", strokeOpacity: .3 }} />
                <Area type="monotone" dataKey={yKey} stroke="#004851" strokeWidth={2.5}
                  fill={`url(#g${msg.id})`} dot={{ r: 3, fill: "#004851" }} />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: chartData.length > 6 ? 44 : 4 }}>
                <CartesianGrid stroke="#e0e4e5" vertical={false} />
                <XAxis dataKey={xKey} tick={{ fill: "#54565a", fontSize: 11 }} stroke="#ccd3d4"
                  interval={0} angle={chartData.length > 6 ? -25 : 0}
                  textAnchor={chartData.length > 6 ? "end" : "middle"}
                  height={chartData.length > 6 ? 60 : 30} />
                <YAxis tick={{ fill: "#54565a", fontSize: 11 }} stroke="#ccd3d4" />
                <Tooltip contentStyle={TT} cursor={{ fill: "rgba(0,72,81,.07)" }} />
                <Bar dataKey={yKey} radius={[4, 4, 0, 0]}>
                  {chartData.map((_: any, i: number) => (
                    <Cell key={i} fill="#004851" fillOpacity={0.5 + 0.5 * (1 - i / Math.max(chartData.length, 1))} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* follow-up suggestions */}
      {msg.suggestions && msg.suggestions.length > 0 && msg.status === "done" && (
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

// ─── main page ────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [convosLoading, setConvosLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const activeChat = chats.find(c => c.id === activeId) || null;

  // Load conversations from backend on mount
  useEffect(() => {
    listConversations()
      .then((convs) => {
        const loaded: Chat[] = convs.map((c) => ({
          id: c.id,
          backendId: c.id,
          title: c.title,
          messages: [],
          updatedAt: new Date(c.updated_at).getTime(),
        }));
        setChats(loaded);
      })
      .catch(() => {
        // Backend not reachable, start with empty state
      })
      .finally(() => setConvosLoading(false));
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeId) return;
    const chat = chats.find((c) => c.id === activeId);
    if (!chat || chat.messages.length > 0) return; // already loaded

    setMessagesLoading(true);
    getConversation(chat.backendId)
      .then((detail) => {
        const messages: Message[] = detail.messages.map((m) => {
          if (m.role === "user") {
            return { id: m.id, role: "user" as const, question: m.content };
          }
          const parsed = parseStoredAnswer(m.content);
          return {
            id: m.id,
            role: "assistant" as const,
            answer: parsed.text,
            chartBlock: parsed.chartBlock,
            suggestions: parsed.suggestions,
            status: "done" as const,
          };
        });
        updateChat(activeId, (c) => ({ ...c, messages }));
      })
      .catch(() => {})
      .finally(() => setMessagesLoading(false));
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages?.length, loading]);

  // Update a specific chat in state
  const updateChat = useCallback((chatId: string, updater: (c: Chat) => Chat) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? updater(c) : c)));
  }, []);

  async function newChat() {
    try {
      const conv = await createConversation("New chat");
      const chat: Chat = {
        id: conv.id,
        backendId: conv.id,
        title: conv.title,
        messages: [],
        updatedAt: Date.now(),
      };
      setChats((prev) => [chat, ...prev]);
      setActiveId(chat.id);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }

  async function deleteChat(chatId: string) {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;

    try {
      await deleteConversation(chat.backendId);
    } catch {}

    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeId === chatId) {
      const remaining = chats.filter((c) => c.id !== chatId);
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
  }

  async function ask(question?: string) {
    const text = (question ?? input).trim();
    if (!text || loading) return;

    // Ensure there's an active chat — create one if needed
    let chatId = activeId;
    if (!chatId) {
      try {
        const title = text.split(" ").slice(0, 6).join(" ");
        const conv = await createConversation(title);
        const chat: Chat = {
          id: conv.id,
          backendId: conv.id,
          title,
          messages: [],
          updatedAt: Date.now(),
        };
        setChats((prev) => [chat, ...prev]);
        chatId = chat.id;
        setActiveId(chat.id);
      } catch {
        return;
      }
    }

    // Add user message + create placeholder AI message
    const userMsg: UserMsg = { id: uid(), role: "user", question: text };
    const aiMsgId = uid();
    const aiMsg: AiMsg = { id: aiMsgId, role: "assistant", answer: "", status: "thinking" };

    updateChat(chatId, (c) => ({
      ...c,
      messages: [...c.messages, userMsg, aiMsg],
      updatedAt: Date.now(),
    }));
    setInput("");
    setLoading(true);

    // Abort controller for cancellation
    const abort = new AbortController();
    abortRef.current = abort;

    const currentChatId = chatId;
    const chat = chats.find((c) => c.id === currentChatId) || { backendId: currentChatId };

    // Stream the response via SSE
    await sendMessage(
      (chat as Chat).backendId || currentChatId,
      text,
      {
        onThinking: () => {
          updateChat(currentChatId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    status: "thinking",
                    reasoning: [...((m as AiMsg).reasoning || []), { type: "thinking", label: "Analyzing your question" }],
                  } as AiMsg
                : m
            ),
          }));
        },
        onToolCall: (toolName) => {
          const isKB = toolName === "search_knowledge_base";
          const label = isKB ? "Searching knowledge base" : `Calling tool: ${toolName}`;
          const source = isKB ? "Knowledge Base (RAG)" : "NetSuite MCP Server";
          updateChat(currentChatId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    status: "tool_call",
                    toolName,
                    reasoning: [
                      ...((m as AiMsg).reasoning || []),
                      { type: "tool_call", label, detail: `Source: ${source}` },
                    ],
                  } as AiMsg
                : m
            ),
          }));
        },
        onToolResult: (toolName, resultSummary) => {
          updateChat(currentChatId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    status: "streaming",
                    reasoning: [
                      ...((m as AiMsg).reasoning || []),
                      { type: "tool_result", label: `Got result from ${toolName}`, detail: resultSummary },
                    ],
                  } as AiMsg
                : m
            ),
          }));
        },
        onTextChunk: (text) => {
          updateChat(currentChatId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === aiMsgId
                ? { ...m, answer: ((m as AiMsg).answer || "") + (((m as AiMsg).answer) ? "\n" : "") + text, status: "streaming" } as AiMsg
                : m
            ),
          }));
        },
        onDataBlock: (chartData) => {
          updateChat(currentChatId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === aiMsgId ? { ...m, chartBlock: chartData } as AiMsg : m
            ),
          }));
        },
        onFollowUps: (questions) => {
          updateChat(currentChatId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === aiMsgId ? { ...m, suggestions: questions } as AiMsg : m
            ),
          }));
        },
        onTitleGenerated: (title) => {
          updateChat(currentChatId, (c) => ({ ...c, title }));
        },
        onDone: () => {
          updateChat(currentChatId, (c) => ({
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== aiMsgId) return m;
              const aiM = m as AiMsg;
              const steps = aiM.reasoning || [];
              // Add a final "source" step summarizing where data came from
              const hadToolCalls = steps.some((s) => s.type === "tool_call");
              const hadKB = steps.some((s) => s.detail?.includes("Knowledge Base"));
              const sourceLabel = hadKB
                ? "Answer generated from Knowledge Base documentation"
                : hadToolCalls
                  ? "Answer generated from live NetSuite data via MCP"
                  : "Answer generated from Claude's reasoning (no tools used)";
              return {
                ...aiM,
                status: "done",
                reasoning: [...steps, { type: "source", label: sourceLabel }],
              } as AiMsg;
            }),
          }));
        },
        onError: (message) => {
          updateChat(currentChatId, (c) => ({
            ...c,
            messages: c.messages.map((m) =>
              m.id === aiMsgId ? { ...m, error: message, status: "done" } as AiMsg : m
            ),
          }));
        },
      },
      abort.signal,
    );

    setLoading(false);
    abortRef.current = null;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); }
  }

  function startListening() {
    if (listening) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        mediaRecorderRef.current = mediaRecorder;
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          setListening(false);
          stream.getTracks().forEach((t) => t.stop());

          const audioBlob = new Blob(chunks, { type: "audio/webm;codecs=opus" });
          try {
            const text = await transcribeAudio(audioBlob);
            if (text && !text.startsWith("[MOCK]") && !text.startsWith("Transcription failed")) {
              setInput(text);
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          } catch (err) {
            console.error("Transcription failed:", err);
          }
        };

        mediaRecorder.onerror = () => {
          setListening(false);
          stream.getTracks().forEach((t) => t.stop());
        };

        mediaRecorder.start();
        setListening(true);
      })
      .catch(() => {
        // Microphone permission denied or not available
        setListening(false);
      });
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
          {convosLoading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "20px 10px", color: "var(--muted2)", fontSize: 12 }}>
              <Loader2 size={14} className="spin" /> Loading chats...
            </div>
          )}
          {!convosLoading && chats.length === 0 && (
            <div style={{ padding: "20px 10px", color: "var(--muted2)", fontSize: 12, textAlign: "center", fontFamily: "var(--mono)" }}>
              No chats yet
            </div>
          )}
          {!convosLoading && chats.map(chat => (
            <div
              key={chat.id}
              className={`ch-item${chat.id === activeId ? " ch-active" : ""}`}
              onClick={() => setActiveId(chat.id)}
              style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
            >
              <span className="ch-title" style={{ flex: 1 }}>{chat.title}</span>
              <span className="ch-time">{elapsed(chat.updatedAt)}</span>
              <button
                className="ch-delete-btn"
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(chat.id); }}
                title="Delete chat"
                style={{
                  background: "none", border: "none", color: "var(--muted2)",
                  cursor: "pointer", padding: "2px 4px", marginLeft: 4,
                  borderRadius: 4, display: "flex", alignItems: "center",
                }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
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
            </div>

            {/* messages */}
            <div className="messages-area">
              {messagesLoading && activeChat.messages.length === 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "40px", color: "var(--muted2)", fontSize: 13 }}>
                  <Loader2 size={18} className="spin" /> Loading conversation...
                </div>
              )}
              {activeChat.messages.map(msg => {
                if (msg.role === "user") {
                  return (
                    <div key={msg.id} className="msg-user">
                      <div className="msg-user-bubble">{(msg as UserMsg).question}</div>
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
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Opus_Inspection.png" alt="Opus Inspection" style={{ height: 48 }} />
                <div className="cw-title" style={{ marginBottom: 0 }}>TalkSuite</div>
              </div>
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

      {/* ── delete confirmation dialog ── */}
      {confirmDeleteId && (
        <div
          className="modal-overlay"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 380, padding: 24 }}
          >
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: "var(--fg)" }}>Delete conversation?</h3>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>
                This will permanently delete this conversation and all its messages. This action cannot be undone.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border)",
                  background: "transparent", color: "var(--fg)", cursor: "pointer", fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteChat(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                style={{
                  padding: "8px 16px", borderRadius: 6, border: "none",
                  background: "#ef4444", color: "#fff", cursor: "pointer", fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
