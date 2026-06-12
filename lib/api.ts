/**
 * API service layer — communicates directly with the TalkSuite FastAPI backend.
 * No Next.js API routes involved. This is a pure client-side service.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// ─── Auth Token Management ────────────────────────────────────────────────────

const TOKEN_KEY = "ts_token";
const USER_KEY = "ts_user";
const ACCOUNTS_KEY = "ts_accounts";
const ACTIVE_ACCOUNT_KEY = "ts_active_account";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type Account = {
  id: string;
  name: string;
  account_id: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function getStoredAccounts(): Account[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function getActiveAccountId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_ACCOUNT_KEY);
}

export function setActiveAccountId(id: string): void {
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
}

export function setAuth(token: string, user: AuthUser, accounts: Account[]): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  // Default the active account to the first one
  if (accounts.length > 0 && !localStorage.getItem(ACTIVE_ACCOUNT_KEY)) {
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, accounts[0].id);
  }
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCOUNTS_KEY);
  localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const accountId = getActiveAccountId();
  if (accountId) headers["X-Account-Id"] = accountId;
  return headers;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail || "Invalid credentials");
  }

  const data = await res.json();
  setAuth(data.access_token, data.user, data.accounts || []);
  return data.user;
}

export function logout(): void {
  clearAuth();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ConversationDetail = Conversation & {
  messages: BackendMessage[];
};

export type BackendMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls: any[] | null;
  created_at: string;
};

// ─── Conversation CRUD ────────────────────────────────────────────────────────

export async function createConversation(title: string): Promise<Conversation> {
  const res = await fetch(`${BACKEND_URL}/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to create conversation: ${res.status}`);
  return res.json();
}

export async function listConversations(): Promise<Conversation[]> {
  const res = await fetch(`${BACKEND_URL}/conversations`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to list conversations: ${res.status}`);
  return res.json();
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  const res = await fetch(`${BACKEND_URL}/conversations/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to get conversation: ${res.status}`);
  return res.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/conversations/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete: ${res.status}`);
}

// ─── Message Streaming (SSE) ──────────────────────────────────────────────────

export type StreamCallbacks = {
  onThinking?: () => void;
  onTextChunk?: (text: string) => void;
  onDataBlock?: (chartData: any) => void;
  onToolCall?: (toolName: string, input: any) => void;
  onToolResult?: (toolName: string, resultSummary: string) => void;
  onFollowUps?: (questions: string[]) => void;
  onTitleGenerated?: (title: string) => void;
  onDone?: (messageId: string) => void;
  onError?: (message: string) => void;
};

/**
 * Send a message and consume the SSE stream directly in the browser.
 * Calls callbacks as events arrive for real-time UI updates.
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...authHeaders(),
    },
    body: JSON.stringify({ content }),
    signal,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    callbacks.onError?.(error.detail || `HTTP ${res.status}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError?.("No response stream available");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent = "";
      let currentData = "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          currentData = line.slice(6);
        } else if (line.startsWith(":")) {
          // SSE comment (keep-alive), ignore
        } else if (line === "" && currentEvent && currentData) {
          try {
            const data = JSON.parse(currentData);
            switch (currentEvent) {
              case "thinking":
                callbacks.onThinking?.();
                break;
              case "text_chunk":
                callbacks.onTextChunk?.(data.text);
                break;
              case "data_block":
                callbacks.onDataBlock?.(data);
                break;
              case "tool_call":
                callbacks.onToolCall?.(data.tool_name, data.input);
                break;
              case "tool_result":
                callbacks.onToolResult?.(data.tool_name, data.result_summary);
                break;
              case "follow_ups":
                callbacks.onFollowUps?.(data.questions);
                break;
              case "title_generated":
                callbacks.onTitleGenerated?.(data.title);
                break;
              case "done":
                callbacks.onDone?.(data.message_id);
                break;
              case "error":
                callbacks.onError?.(data.message);
                break;
            }
          } catch {}
          currentEvent = "";
          currentData = "";
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Voice Transcription ──────────────────────────────────────────────────────

/**
 * Send an audio blob to the backend for transcription via AWS Transcribe.
 * Returns the transcribed text.
 */
export async function transcribeAudio(
  audioBlob: Blob,
  language: string = "en-US",
): Promise<string> {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
  formData.append("language", language);

  const res = await fetch(`${BACKEND_URL}/transcribe`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Transcription failed: ${res.status}`);
  }

  const data = await res.json();
  return data.text;
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function fetchMyAccounts(): Promise<Account[]> {
  const res = await fetch(`${BACKEND_URL}/accounts/me`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch accounts: ${res.status}`);
  return res.json();
}

// ─── Admin: Accounts ──────────────────────────────────────────────────────────

export type AdminAccount = {
  id: string;
  name: string;
  account_id: string;
  client_id: string;
  mcp_url: string | null;
  scope: string;
  is_active: boolean;
  connected: boolean;
  created_at: string;
};

export type AccountCreateInput = {
  name: string;
  account_id: string;
  client_id: string;
  client_secret?: string;
  mcp_url?: string;
  redirect_uri?: string;
  scope?: string;
};

export async function adminListAccounts(): Promise<AdminAccount[]> {
  const res = await fetch(`${BACKEND_URL}/admin/accounts`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to list accounts: ${res.status}`);
  return res.json();
}

export async function adminCreateAccount(input: AccountCreateInput): Promise<AdminAccount> {
  const res = await fetch(`${BACKEND_URL}/admin/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export type AccountUpdateInput = {
  name?: string;
  account_id?: string;
  client_id?: string;
  client_secret?: string;
  mcp_url?: string;
  redirect_uri?: string;
  scope?: string;
};

export async function adminUpdateAccount(accountId: string, input: AccountUpdateInput): Promise<AdminAccount> {
  const res = await fetch(`${BACKEND_URL}/admin/accounts/${accountId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Begin PKCE for an account; returns the NetSuite authorize URL. */
export async function startPkce(accountId: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/accounts/${accountId}/pkce/start`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.auth_url;
}

// ─── Admin: Users ───────────────────────────────────────────────────────────

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  accounts: Account[];
};

export type UserCreateInput = {
  email: string;
  name: string;
  password: string;
  role: string;
  account_ids: string[];
};

export async function adminListUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${BACKEND_URL}/admin/users`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to list users: ${res.status}`);
  return res.json();
}

export async function adminCreateUser(input: UserCreateInput): Promise<AdminUser> {
  const res = await fetch(`${BACKEND_URL}/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function adminAssignAccounts(userId: string, accountIds: string[]): Promise<AdminUser> {
  const res = await fetch(`${BACKEND_URL}/admin/users/${userId}/accounts`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ account_ids: accountIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function adminUpdateUserRole(userId: string, role: string): Promise<AdminUser> {
  const res = await fetch(`${BACKEND_URL}/admin/users/${userId}/role`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export type UserUpdateInput = {
  name?: string;
  role?: string;
  password?: string;
  account_ids?: string[];
};

export async function adminUpdateUser(userId: string, input: UserUpdateInput): Promise<AdminUser> {
  const res = await fetch(`${BACKEND_URL}/admin/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}
