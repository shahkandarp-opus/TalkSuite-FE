"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, UserPlus, Plus, Link2, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";
import {
  getStoredUser,
  adminListAccounts, adminCreateAccount, adminUpdateAccount, startPkce,
  adminListUsers, adminCreateUser, adminUpdateUser,
  type AdminAccount, type AdminUser, type AccountCreateInput, type AccountUpdateInput, type UserCreateInput,
} from "@/lib/api";

const ROLES = ["admin", "finance", "inventory"];

export default function AdminPage() {
  const router = useRouter();
  const user = getStoredUser();
  const [tab, setTab] = useState<"accounts" | "users">("accounts");
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/");
  }, [user, router]);

  async function refresh() {
    setLoading(true);
    try {
      const [accs, usrs] = await Promise.all([adminListAccounts(), adminListUsers()]);
      setAccounts(accs);
      setUsers(usrs);
    } catch (e: any) {
      setMsg(e.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, color: "#004851", marginBottom: 4 }}>Admin Portal</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 20 }}>
        Manage NetSuite accounts and users.
      </p>

      {msg && (
        <div style={{ padding: 10, background: "#fef2f2", color: "#b91c1c", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {msg}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid #e5e7eb" }}>
        <TabButton active={tab === "accounts"} onClick={() => setTab("accounts")} label="NetSuite Accounts" />
        <TabButton active={tab === "users"} onClick={() => setTab("users")} label="Users" />
      </div>

      {tab === "accounts"
        ? <AccountsTab accounts={accounts} loading={loading} onChange={refresh} setMsg={setMsg} />
        : <UsersTab users={users} accounts={accounts} loading={loading} onChange={refresh} setMsg={setMsg} />}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 16px", border: "none", background: "none", cursor: "pointer",
      fontSize: 14, fontWeight: active ? 600 : 400,
      color: active ? "#004851" : "#6b7280",
      borderBottom: active ? "2px solid #004851" : "2px solid transparent",
    }}>{label}</button>
  );
}

// ─── Accounts Tab ────────────────────────────────────────────────────────────

function AccountsTab({ accounts, loading, onChange, setMsg }: {
  accounts: AdminAccount[]; loading: boolean; onChange: () => void; setMsg: (s: string) => void;
}) {
  const [form, setForm] = useState<AccountCreateInput>({
    name: "", account_id: "", client_id: "", client_secret: "", mcp_url: "", scope: "mcp",
  });
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AccountUpdateInput>({});
  const [savingEdit, setSavingEdit] = useState(false);

  async function create() {
    if (!form.name.trim() || !form.account_id.trim() || !form.client_id.trim()) {
      setMsg("Name, Account ID, and Client ID are required.");
      return;
    }
    setCreating(true);
    try {
      await adminCreateAccount(form);
      setForm({ name: "", account_id: "", client_id: "", client_secret: "", mcp_url: "", scope: "mcp" });
      setShowForm(false);
      onChange();
    } catch (e: any) { setMsg(e.message); }
    finally { setCreating(false); }
  }

  function startEdit(a: AdminAccount) {
    setEditingId(a.id);
    setEditForm({
      name: a.name,
      account_id: a.account_id,
      client_id: a.client_id,
      client_secret: "",
      mcp_url: a.mcp_url || "",
      scope: a.scope,
    });
  }

  async function saveEdit(accountId: string) {
    if (!editForm.name?.trim() || !editForm.account_id?.trim() || !editForm.client_id?.trim()) {
      setMsg("Name, Account ID, and Client ID are required.");
      return;
    }
    setSavingEdit(true);
    try {
      await adminUpdateAccount(accountId, editForm);
      setEditingId(null);
      onChange();
    } catch (e: any) { setMsg(e.message); }
    finally { setSavingEdit(false); }
  }

  async function connect(accountId: string) {
    try {
      const url = await startPkce(accountId);
      const popup = window.open(url, "ns_pkce", "width=600,height=750");
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          setTimeout(onChange, 800);
        }
      }, 700);
    } catch (e: any) { setMsg(e.message); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <button className="btn-secondary" onClick={onChange} style={btnGhost}><RefreshCw size={14} /> Refresh</button>
        <button onClick={() => setShowForm(!showForm)} style={btnPrimary}><Plus size={14} /> Add Account</button>
      </div>

      {showForm && (
        <div style={cardStyle}>
          <Field label="Display Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. Opus Production" required />
          <Field label="Account ID" value={form.account_id} onChange={(v) => setForm({ ...form, account_id: v })} placeholder="e.g. 661135_SB2" required />
          <Field label="Client ID (Public Client)" value={form.client_id} onChange={(v) => setForm({ ...form, client_id: v })} required />
          <Field label="Client Secret (optional for public client)" value={form.client_secret || ""} onChange={(v) => setForm({ ...form, client_secret: v })} />
          <Field label="MCP URL (optional — auto-built if blank)" value={form.mcp_url || ""} onChange={(v) => setForm({ ...form, mcp_url: v })} placeholder="https://<acct>.suitetalk.api.netsuite.com/services/mcp/v1/all" />
          <Field label="Scope" value={form.scope || "mcp"} onChange={(v) => setForm({ ...form, scope: v })} />
          <button onClick={create} style={btnPrimary} disabled={creating}>
            {creating ? <><Loader2 size={14} className="spin" /> Creating...</> : "Create Account"}
          </button>
        </div>
      )}

      <table style={tableStyle}>
        <thead>
          <tr><Th>Name</Th><Th>Account ID</Th><Th>Status</Th><Th>Action</Th></tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><Td colSpan={4}><TableLoader label="Loading accounts..." /></Td></tr>
          ) : accounts.length === 0 ? (
            <tr><Td colSpan={4}>No accounts yet.</Td></tr>
          ) : accounts.map((a) => (
            <tr key={a.id}>
              <Td><Building2 size={13} style={{ verticalAlign: "middle", marginRight: 6, color: "#004851" }} />{a.name}</Td>
              <Td>{a.account_id}</Td>
              <Td>
                {a.connected
                  ? <span style={{ color: "#059669", display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={14} /> Connected</span>
                  : <span style={{ color: "#d97706", display: "inline-flex", alignItems: "center", gap: 4 }}><XCircle size={14} /> Not connected</span>}
              </Td>
              <Td>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => startEdit(a)} style={btnGhost}>Edit</button>
                  <button onClick={() => connect(a.id)} style={btnGhost}>
                    <Link2 size={13} /> {a.connected ? "Reconnect" : "Connect"}
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingId && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={{ fontSize: 14, color: "#004851", margin: "0 0 8px" }}>Edit Account</h3>
          <Field label="Display Name" value={editForm.name || ""} onChange={(v) => setEditForm({ ...editForm, name: v })} required />
          <Field label="Account ID" value={editForm.account_id || ""} onChange={(v) => setEditForm({ ...editForm, account_id: v })} required />
          <Field label="Client ID" value={editForm.client_id || ""} onChange={(v) => setEditForm({ ...editForm, client_id: v })} required />
          <Field label="Client Secret (leave blank to keep current)" value={editForm.client_secret || ""} onChange={(v) => setEditForm({ ...editForm, client_secret: v })} />
          <Field label="MCP URL (optional)" value={editForm.mcp_url || ""} onChange={(v) => setEditForm({ ...editForm, mcp_url: v })} />
          <Field label="Scope" value={editForm.scope || "mcp"} onChange={(v) => setEditForm({ ...editForm, scope: v })} />
          <p style={{ fontSize: 12, color: "#d97706", margin: "0 0 8px" }}>
            Note: changing Account ID or Client ID clears the saved connection — you'll need to reconnect.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => saveEdit(editingId)} style={btnPrimary} disabled={savingEdit}>
              {savingEdit ? <><Loader2 size={14} className="spin" /> Saving...</> : "Save Changes"}
            </button>
            <button onClick={() => setEditingId(null)} style={btnGhost} disabled={savingEdit}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────

function UsersTab({ users, accounts, loading, onChange, setMsg }: {
  users: AdminUser[]; accounts: AdminAccount[]; loading: boolean; onChange: () => void; setMsg: (s: string) => void;
}) {
  const [form, setForm] = useState<UserCreateInput>({
    email: "", name: "", password: "", role: "finance", account_ids: [],
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; role: string; password: string; account_ids: string[] }>({
    name: "", role: "finance", password: "", account_ids: [],
  });
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  function toggleAccount(id: string) {
    setForm((f) => ({
      ...f,
      account_ids: f.account_ids.includes(id)
        ? f.account_ids.filter((x) => x !== id)
        : [...f.account_ids, id],
    }));
  }

  function toggleEditAccount(id: string) {
    setEditForm((f) => ({
      ...f,
      account_ids: f.account_ids.includes(id)
        ? f.account_ids.filter((x) => x !== id)
        : [...f.account_ids, id],
    }));
  }

  function startEdit(u: AdminUser) {
    setEditingId(u.id);
    setEditForm({
      name: u.name,
      role: u.role,
      password: "",
      account_ids: u.accounts.map((a) => a.id),
    });
  }

  async function create() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setMsg("Name, email, and password are required.");
      return;
    }
    if (form.account_ids.length === 0) { setMsg("Assign at least one account."); return; }
    setCreating(true);
    try {
      await adminCreateUser(form);
      setForm({ email: "", name: "", password: "", role: "finance", account_ids: [] });
      setShowForm(false);
      onChange();
    } catch (e: any) { setMsg(e.message); }
    finally { setCreating(false); }
  }

  async function saveEdit(userId: string) {
    if (!editForm.name.trim()) { setMsg("Name is required."); return; }
    if (editForm.account_ids.length === 0) { setMsg("Assign at least one account."); return; }
    setSaving(true);
    try {
      await adminUpdateUser(userId, {
        name: editForm.name,
        role: editForm.role,
        account_ids: editForm.account_ids,
        ...(editForm.password.trim() ? { password: editForm.password } : {}),
      });
      setEditingId(null);
      onChange();
    } catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={() => setShowForm(!showForm)} style={btnPrimary}><UserPlus size={14} /> Add User</button>
      </div>

      {showForm && (
        <div style={cardStyle}>
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
          <Field label="Password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} type="password" required />
          <label style={labelStyle}>Role</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={inputStyle}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <label style={labelStyle}>Assign Accounts (at least one)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {accounts.map((a) => (
              <label key={a.id} style={chip(form.account_ids.includes(a.id))}>
                <input type="checkbox" checked={form.account_ids.includes(a.id)} onChange={() => toggleAccount(a.id)} />
                {a.name}
              </label>
            ))}
          </div>
          <button onClick={create} style={btnPrimary} disabled={creating}>
            {creating ? <><Loader2 size={14} className="spin" /> Creating...</> : "Create User"}
          </button>
        </div>
      )}

      <table style={tableStyle}>
        <thead>
          <tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Accounts</Th><Th>Action</Th></tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><Td colSpan={5}><TableLoader label="Loading users..." /></Td></tr>
          ) : users.length === 0 ? (
            <tr><Td colSpan={5}>No users yet.</Td></tr>
          ) : users.map((u) => (
            <tr key={u.id}>
              <Td>{u.name}</Td>
              <Td>{u.email}</Td>
              <Td>{u.role}</Td>
              <Td>{u.accounts.map((a) => a.name).join(", ") || "—"}</Td>
              <Td>
                <button onClick={() => startEdit(u)} style={btnGhost}>Edit</button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingId && (
        <div style={{ ...cardStyle, marginTop: 16 }}>
          <h3 style={{ fontSize: 14, color: "#004851", margin: "0 0 8px" }}>
            Edit User
          </h3>
          <Field label="Name" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} required />
          <label style={labelStyle}>Role</label>
          <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} style={inputStyle}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <Field label="New Password (leave blank to keep current)" value={editForm.password} onChange={(v) => setEditForm({ ...editForm, password: v })} type="password" />
          <label style={labelStyle}>Assigned Accounts (at least one)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {accounts.map((a) => (
              <label key={a.id} style={chip(editForm.account_ids.includes(a.id))}>
                <input type="checkbox" checked={editForm.account_ids.includes(a.id)} onChange={() => toggleEditAccount(a.id)} />
                {a.name}
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => saveEdit(editingId)} style={btnPrimary} disabled={saving}>
              {saving ? <><Loader2 size={14} className="spin" /> Saving...</> : "Save Changes"}
            </button>
            <button onClick={() => setEditingId(null)} style={btnGhost} disabled={saving}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── small UI helpers ─────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, type = "text", required = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
      </label>
      <input type={type} value={value} placeholder={placeholder} required={required}
        onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function TableLoader({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "24px", color: "#6b7280", fontSize: 13 }}>
      <Loader2 size={16} className="spin" /> {label}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 11, color: "#6b7280", textTransform: "uppercase", borderBottom: "1px solid #e5e7eb" }}>{children}</th>;
}
function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} style={{ padding: "10px", fontSize: 13, borderBottom: "1px solid #f1f5f9" }}>{children}</td>;
}

const cardStyle: React.CSSProperties = {
  background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
  padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 4,
};
const tableStyle: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse", background: "#fff",
  border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden",
};
const labelStyle: React.CSSProperties = { fontSize: 12, color: "#374151", marginTop: 8, marginBottom: 2 };
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", border: "1px solid #d1d5db",
  borderRadius: 6, fontSize: 13, marginBottom: 8,
};
const btnPrimary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px",
  background: "#004851", color: "#fff", border: "none", borderRadius: 6,
  fontSize: 13, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px",
  background: "#fff", color: "#004851", border: "1px solid #004851",
  borderRadius: 6, fontSize: 12, cursor: "pointer",
};

function chip(active: boolean): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 6, fontSize: 13,
    padding: "4px 10px", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer",
    background: active ? "rgba(0,72,81,.08)" : "#fff",
  };
}
