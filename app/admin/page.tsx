"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (email === adminEmail && password === adminPassword) {
      // Store a simple session flag
      sessionStorage.setItem("admin_authenticated", "true");
      router.push("/admin/dashboard");
    } else {
      setError("Invalid admin credentials.");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#11131A" }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="text-2xl font-medium tracking-tight" style={{ color: "#F0EEE8" }}>
            mayuri<span style={{ color: "#FF3B3B" }}>.</span>
          </Link>
          <p className="text-xs mt-2" style={{ color: "rgba(240,238,232,0.35)" }}>admin panel</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: "#1A1D26", border: "0.5px solid rgba(255,255,255,0.08)" }}>
          <h1 className="text-lg font-medium mb-1" style={{ color: "#F0EEE8" }}>admin login</h1>
          <p className="text-xs mb-7" style={{ color: "rgba(240,238,232,0.4)" }}>restricted access only</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "rgba(240,238,232,0.55)" }}>
                email
              </label>
              <input
                type="email"
                placeholder="admin@mayuri.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: "#11131A",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  color: "#F0EEE8",
                  caretColor: "#FF3B3B",
                }}
                onFocus={(e) => (e.target.style.border = "0.5px solid rgba(255,59,59,0.6)")}
                onBlur={(e) => (e.target.style.border = "0.5px solid rgba(255,255,255,0.12)")}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "rgba(240,238,232,0.55)" }}>
                password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: "#11131A",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  color: "#F0EEE8",
                  caretColor: "#FF3B3B",
                }}
                onFocus={(e) => (e.target.style.border = "0.5px solid rgba(255,59,59,0.6)")}
                onBlur={(e) => (e.target.style.border = "0.5px solid rgba(255,255,255,0.12)")}
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,59,59,0.1)", color: "#FF3B3B", border: "0.5px solid rgba(255,59,59,0.2)" }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-medium transition-opacity mt-1"
              style={{ background: "#FF3B3B", color: "#fff", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "verifying..." : "enter panel"}
            </button>

          </form>
        </div>

        <p className="text-center mt-6 text-xs">
          <Link href="/" style={{ color: "rgba(240,238,232,0.3)" }}>← back to home</Link>
        </p>

      </div>
    </div>
  );
}