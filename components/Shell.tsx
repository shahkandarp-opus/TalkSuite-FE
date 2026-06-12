"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, LogOut, User, Building2, Shield } from "lucide-react";
import {
  logout,
  getStoredUser,
  getStoredAccounts,
  getActiveAccountId,
  setActiveAccountId,
} from "@/lib/api";

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const normalizedPath = path !== "/" ? path.replace(/\/$/, "") : path;
  const isChatPage = normalizedPath === "/";
  const isAdminPage = normalizedPath === "/admin";
  const user = getStoredUser();
  const accounts = getStoredAccounts();
  const activeAccountId = getActiveAccountId();
  const isAdmin = user?.role === "admin";

  function handleLogout() {
    logout();
    router.push("/login");
  }

  function handleAccountChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setActiveAccountId(e.target.value);
    // Reload so the active page picks up the new account's conversations
    window.location.reload();
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Opus_Inspection.png" alt="Opus Inspection" className="brand-logo-img" />
        </div>

        {/* Account selector — shown when the user has >1 account. Disabled on the
            admin page (account context isn't relevant there, and switching would
            trigger a reload that breaks the /admin deep route on static hosting). */}
        {accounts.length > 1 && (
          <div className="nav-section">
            <span className="nav-label">NetSuite Account</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
              <Building2 size={14} style={{ color: "#004851", flexShrink: 0 }} />
              <select
                value={activeAccountId || ""}
                onChange={handleAccountChange}
                disabled={isAdminPage}
                title={isAdminPage ? "Switch account from the Ask AI page" : undefined}
                style={{
                  width: "100%", padding: "6px 8px", borderRadius: 6,
                  border: "1px solid var(--border)", fontSize: 12,
                  background: isAdminPage ? "#f1f5f9" : "#fff",
                  color: isAdminPage ? "#9ca3af" : "#1a1a1a",
                  cursor: isAdminPage ? "not-allowed" : "pointer",
                }}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="nav-section">
          <span className="nav-label">Intelligence</span>
          <nav className="nav">
            <Link href="/" className={isChatPage ? "active" : ""}>
              <Sparkles size={16} />
              <span>Ask AI</span>
            </Link>
          </nav>
        </div>

        {isAdmin && (
          <div className="nav-section">
            <span className="nav-label">Administration</span>
            <nav className="nav">
              <Link href="/admin" className={isAdminPage ? "active" : ""}>
                <Shield size={16} />
                <span>Admin Portal</span>
              </Link>
            </nav>
          </div>
        )}

        <div className="sidebar-footer">
          {/* Single-account label (shown when exactly one account) */}
          {accounts.length === 1 && (
            <div className="ns-pill" style={{ marginBottom: 8 }}>
              <Building2 size={12} style={{ color: "#004851" }} />
              <div className="ns-info">
                <div className="ns-info-label">{accounts[0].name}</div>
                <div className="ns-info-val">{accounts[0].account_id}</div>
              </div>
            </div>
          )}

          {/* User info */}
          {user && (
            <div className="ns-pill" style={{ marginBottom: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: "rgba(0,72,81,.1)", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <User size={12} style={{ color: "#004851" }} />
              </div>
              <div className="ns-info">
                <div className="ns-info-label">{user.name}</div>
                <div className="ns-info-val">{user.role.toUpperCase()}</div>
              </div>
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", background: "none",
              border: "1px solid var(--border)", borderRadius: 6,
              color: "var(--muted)", cursor: "pointer", fontSize: 12,
            }}
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className={`main${isChatPage ? " main-chat" : ""}`}>
        {children}
      </main>
    </div>
  );
}
