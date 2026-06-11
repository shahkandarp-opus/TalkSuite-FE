"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, LayoutDashboard, Globe2 } from "lucide-react";

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isChatPage = path === "/";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo"><Globe2 size={18} /></div>
          <div className="brand-text">
            <div className="brand-name">TalkSuite</div>
            <div className="brand-sub">OPUS INSPECTION</div>
          </div>
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
          <div className="ns-pill">
            <div className="ns-dot" />
            <div className="ns-info">
              <div className="ns-info-label">NetSuite</div>
              <div className="ns-info-val">Demo Mode</div>
            </div>
          </div>
        </div>
      </aside>

      <main className={`main${isChatPage ? " main-chat" : ""}`}>
        {children}
      </main>
    </div>
  );
}
