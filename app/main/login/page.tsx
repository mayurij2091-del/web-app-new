
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  // 3D tilt effect on card
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(1000px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (card) {
      card.style.transform = "perspective(1000px) rotateY(0deg) rotateX(0deg)";
    }
  }, []);

  // Cursor glow
  const glowRef = useRef<HTMLDivElement>(null);
  const glowPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener("mousemove", handleMouseMove);

    let glowAnimId = 0;
    function animateGlow() {
      glowPosRef.current.x += (mouseRef.current.x - glowPosRef.current.x) * 0.1;
      glowPosRef.current.y += (mouseRef.current.y - glowPosRef.current.y) * 0.1;
      const glow = glowRef.current;
      if (glow) {
        glow.style.left = glowPosRef.current.x + "px";
        glow.style.top = glowPosRef.current.y + "px";
      }
      glowAnimId = requestAnimationFrame(animateGlow);
    }
    glowAnimId = requestAnimationFrame(animateGlow);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(glowAnimId);
    };
  }, []);

  // Floating particles
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Array<{
      x: number; y: number; size: number;
      speedX: number; speedY: number; opacity: number;
    }> = [];

    for (let i = 0; i < 25; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.2 + 0.05,
      });
    }

    let animId = 0;
    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = canvas!.width;
        if (p.x > canvas!.width) p.x = 0;
        if (p.y < 0) p.y = canvas!.height;
        if (p.y > canvas!.height) p.y = 0;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 59, 59, ${p.opacity})`;
        ctx!.fill();
      });
      animId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("phone", phone)
        .eq("password", password)
        .single();

      if (error || !data) {
        setError("Invalid phone number or password.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("user_phone", phone);
      router.push("/main/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        background: "#0D1017",
      }}
    >
      {/* Noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Cursor glow */}
      <div
        ref={glowRef}
        className="fixed w-[400px] h-[400px] rounded-full pointer-events-none z-0 hidden md:block"
        style={{
          background: "radial-gradient(circle, rgba(255,59,59,0.1) 0%, transparent 70%)",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Particles canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" />

      {/* Background Glows */}
      <div
        className="absolute top-[-120px] right-[-100px] w-[450px] h-[450px] rounded-full blur-[100px] opacity-25"
        style={{
          background: "radial-gradient(circle, #FF3B3B, transparent 70%)",
          animation: "float 8s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[-150px] left-[-100px] w-[350px] h-[350px] rounded-full blur-[100px] opacity-15"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.3), transparent 70%)",
          animation: "float 10s ease-in-out 2s infinite",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full blur-[120px] opacity-10"
        style={{
          background: "radial-gradient(circle, #7A5AF5, transparent 70%)",
          animation: "float 12s ease-in-out 4s infinite",
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo with animation */}
        <div className="text-center mb-10">
          <Link
            href="/"
            className="text-3xl font-semibold tracking-tight inline-block transition-transform hover:scale-105"
            style={{ color: "#F8F6F0", fontFamily: "'Playfair Display', serif" }}
          >
            mayuri<span style={{ color: "#FF3B3B" }}>.</span>
          </Link>

          <p
            className="text-sm mt-3 tracking-wide uppercase"
            style={{ color: "rgba(248,246,240,0.35)" }}
          >
            Premium Learning Platform
          </p>
        </div>

        {/* Login Card with 3D tilt */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="rounded-3xl p-8 backdrop-blur-xl transition-transform duration-200 ease-out"
          style={{
            background: "rgba(26,29,38,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 20px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,59,59,0.05)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Card shine effect */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(255,59,59,0.02) 100%)",
            }}
          />

          <div className="mb-8">
            <div
              className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full mb-4"
              style={{
                background: "rgba(255,59,59,0.1)",
                color: "#FF3B3B",
                border: "0.5px solid rgba(255,59,59,0.2)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Secure Login
            </div>

            <h1
              className="text-3xl font-semibold leading-tight"
              style={{ color: "#F8F6F0", fontFamily: "'Playfair Display', serif" }}
            >
              Login to your account
            </h1>

            <p
              className="text-sm mt-3 leading-relaxed"
              style={{ color: "rgba(248,246,240,0.5)" }}
            >
              Access your subscription, premium content and exclusive learning
              materials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone */}
            <div className="relative">
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "rgba(248,246,240,0.75)" }}
              >
                Phone Number
              </label>

              <div className="relative group">
                <div
                  className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{
                    color: focusedField === "phone" ? "#FF3B3B" : "rgba(248,246,240,0.3)",
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                </div>
                <input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onFocus={() => setFocusedField("phone")}
                  onBlur={() => setFocusedField(null)}
                  required
                  className="w-full rounded-xl pl-11 pr-4 py-4 text-sm outline-none transition-all duration-300"
                  style={{
                    background: "#11131A",
                    border: focusedField === "phone"
                      ? "1px solid rgba(255,59,59,0.4)"
                      : "1px solid rgba(255,255,255,0.08)",
                    color: "#F8F6F0",
                    boxShadow: focusedField === "phone" ? "0 0 20px rgba(255,59,59,0.1)" : "none",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="relative">
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "rgba(248,246,240,0.75)" }}
              >
                Password
              </label>

              <div className="relative group">
                <div
                  className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
                  style={{
                    color: focusedField === "password" ? "#FF3B3B" : "rgba(248,246,240,0.3)",
                  }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  required
                  className="w-full rounded-xl pl-11 pr-12 py-4 text-sm outline-none transition-all duration-300"
                  style={{
                    background: "#11131A",
                    border: focusedField === "password"
                      ? "1px solid rgba(255,59,59,0.4)"
                      : "1px solid rgba(255,255,255,0.08)",
                    color: "#F8F6F0",
                    boxShadow: focusedField === "password" ? "0 0 20px rgba(255,59,59,0.1)" : "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80"
                  style={{ color: "rgba(248,246,240,0.4)" }}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 animate-shake"
                style={{
                  background: "rgba(255,59,59,0.08)",
                  border: "1px solid rgba(255,59,59,0.18)",
                  color: "#FF5A5A",
                }}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, #FF3B3B 0%, #D62828 100%)",
                color: "#ffffff",
                opacity: loading ? 0.75 : 1,
                boxShadow: "0 10px 30px rgba(255,59,59,0.18)",
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                    Signing In...
                  </>
                ) : (
                  <>
                    Login Now
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="text-xs" style={{ color: "rgba(248,246,240,0.3)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* Admin contact hint */}
          <div
            className="rounded-xl p-4 text-center"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <p className="text-xs" style={{ color: "rgba(248,246,240,0.4)" }}>
              Need access? Contact admin at{" "}
              <a href="tel:+919082556465" className="font-medium hover:underline" style={{ color: "#FF3B3B" }}>
                +91 9082556465
              </a>
            </p>
          </div>
        </div>

        {/* Back Home */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-sm inline-flex items-center gap-2 transition-all hover:gap-3 group"
            style={{ color: "rgba(248,246,240,0.45)" }}
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            Back to Home
          </Link>
        </div>
      </div>

      {/* Global styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,500&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
        }
        
        ::selection {
          background: rgba(255,59,59,0.3);
          color: #fff;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

