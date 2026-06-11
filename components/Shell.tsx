"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sparkles, LayoutDashboard, LogOut, User } from "lucide-react";
import { logout, getStoredUser } from "@/lib/api";

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const isChatPage = path === "/";
  const user = getStoredUser();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Opus_Inspection.png" alt="Opus Inspection" className="brand-logo-img" />
        </div>

        <div className="nav-section">
          <span className="nav-label">Intelligence</span>
          <nav className="nav">
            <Link href="/" className={isChatPage ? "active" : ""}>
              <Sparkles size={16} />
              <span>Ask AI</span>
            </Link>
          </nav>
        </div>

        <div className="nav-section">
          <span className="nav-label">Analytics</span>
          <nav className="nav">
            <Link href="/dashboard" className={path === "/dashboard" ? "active" : ""}>
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </Link>
          </nav>
        </div>

        <div className="sidebar-footer">
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
