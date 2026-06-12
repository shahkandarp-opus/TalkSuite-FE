"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
      justifyContent: "center", background: "#f5f5f5",
    }}>
      <div style={{
        width: 400, padding: 36, background: "#ffffff",
        border: "1px solid #e0e4e5",
      }}>
        {/* Opus Brand Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Opus_Inspection.png"
            alt="Opus Inspection"
            style={{ height: 50, marginBottom: 16 }}
          />
          <div style={{ fontSize: 20, fontWeight: 700, color: "#004851" }}>TalkSuite</div>
          <div style={{ fontSize: 12, color: "#54565a", marginTop: 4 }}>
            Sign in to access your NetSuite AI assistant
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "10px 12px", background: "#ef444410", border: "1px solid #ef444440",
            color: "#ef4444", fontSize: 13, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "#54565a", display: "block", marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={{
                width: "100%", padding: "10px 12px", background: "#f5f5f5",
                border: "1px solid #e0e4e5",
                color: "#131e29", fontSize: 14, outline: "none",
                fontFamily: "'Brokman', sans-serif",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#54565a", display: "block", marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%", padding: "10px 12px", background: "#f5f5f5",
                border: "1px solid #e0e4e5",
                color: "#131e29", fontSize: 14, outline: "none",
                fontFamily: "'Brokman', sans-serif",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              marginTop: 6, padding: "12px 16px",
              border: "none", background: "#004851", color: "#ffffff",
              fontSize: 14, fontWeight: 500, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: loading ? 0.7 : 1,
              fontFamily: "'Brokman', sans-serif",
            }}
          >
            {loading && <Loader2 size={14} className="spin" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
