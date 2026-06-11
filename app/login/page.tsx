"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe2, Loader2 } from "lucide-react";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)",
    }}>
      <div style={{
        width: 380, padding: 32, background: "var(--card)",
        border: "1px solid var(--border)", borderRadius: 12,
      }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "linear-gradient(135deg, #2db82d, #1a8a1a)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 12,
          }}>
            <Globe2 size={24} color="#fff" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "var(--fg)" }}>TalkSuite</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
            Sign in to access your NetSuite AI assistant
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "10px 12px", background: "#ef444420", border: "1px solid #ef444440",
            borderRadius: 6, color: "#ef4444", fontSize: 13, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={{
                width: "100%", padding: "10px 12px", background: "var(--bg)",
                border: "1px solid var(--border)", borderRadius: 6,
                color: "var(--fg)", fontSize: 14, outline: "none",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%", padding: "10px 12px", background: "var(--bg)",
                border: "1px solid var(--border)", borderRadius: 6,
                color: "var(--fg)", fontSize: 14, outline: "none",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              marginTop: 6, padding: "12px 16px", borderRadius: 6,
              border: "none", background: "#2db82d", color: "#fff",
              fontSize: 14, fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading && <Loader2 size={14} className="spin" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Demo credentials hint */}
        <div style={{
          marginTop: 20, padding: "10px 12px", background: "var(--bg)",
          borderRadius: 6, fontSize: 11, color: "var(--muted2)",
          fontFamily: "var(--mono)",
        }}>
          <div style={{ marginBottom: 4, fontWeight: 500, color: "var(--muted)" }}>Demo accounts:</div>
          <div>admin: test@talksuite.dev / admin123</div>
          <div>finance: finance@talksuite.dev / finance123</div>
          <div>inventory: inventory@talksuite.dev / inventory123</div>
        </div>
      </div>
    </div>
  );
}
