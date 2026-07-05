"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "./main/lib/shared";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [countersVisible, setCountersVisible] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userPhone, setUserPhone] = useState("");
  const [videoPlaying, setVideoPlaying] = useState(false);

  // NEW: main courses state
  const [mainCourses, setMainCourses] = useState<Array<{
    id: string;
    name: string;
    description: string;
    image_url: string;
    total_lessons: number;
    created_at: string;
  }>>([]);
  const [loadingMainCourses, setLoadingMainCourses] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const statsRef = useRef<HTMLDivElement | null>(null);
  const particlesRef = useRef<Array<{
    x: number; y: number; size: number;
    speedX: number; speedY: number; opacity: number;
    reset: (w: number, h: number) => void;
    update: (w: number, h: number) => void;
    draw: (ctx: CanvasRenderingContext2D) => void;
  }>>([]);
  const animFrameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const glowPosRef = useRef({ x: 0, y: 0 });

  const revealRefs = useRef<HTMLElement[]>([]);
  const addRevealRef = useCallback((el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    const phone = sessionStorage.getItem("user_phone");
    if (phone) {
      setIsLoggedIn(true);
      setUserPhone(phone);
    }
  }, []);

  // NEW: fetch main courses
  useEffect(() => {
    const fetchMainCourses = async () => {
      setLoadingMainCourses(true);
      const { data, error } = await supabase
        .from("main_courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        // If more than 6, shuffle and pick 6
        if (data.length > 6) {
          const shuffled = [...data].sort(() => 0.5 - Math.random());
          setMainCourses(shuffled.slice(0, 6));
        } else {
          setMainCourses(data);
        }
      } else {
        setMainCourses([]);
      }
      setLoadingMainCourses(false);
    };
    fetchMainCourses();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);

    const glow = glowRef.current;
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    document.addEventListener("mousemove", handleMouseMove);

    let glowAnimId = 0;
    function animateGlow() {
      glowPosRef.current.x += (mouseRef.current.x - glowPosRef.current.x) * 0.08;
      glowPosRef.current.y += (mouseRef.current.y - glowPosRef.current.y) * 0.08;
      if (glow) {
        glow.style.left = glowPosRef.current.x + "px";
        glow.style.top = glowPosRef.current.y + "px";
      }
      glowAnimId = requestAnimationFrame(animateGlow);
    }
    glowAnimId = requestAnimationFrame(animateGlow);

    const canvas = canvasRef.current;
    let cleanupResize: (() => void) | null = null;

    if (canvas && typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
      cleanupResize = () => window.removeEventListener("resize", resizeCanvas);

      const particles: typeof particlesRef.current = [];
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speedX: (Math.random() - 0.5) * 0.25,
          speedY: (Math.random() - 0.5) * 0.25,
          opacity: Math.random() * 0.4 + 0.1,
          reset(w: number, h: number) {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
          },
          update(w: number, h: number) {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) {
              this.reset(w, h);
            }
          },
          draw(ctx: CanvasRenderingContext2D) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(99, 102, 241, ${this.opacity})`;
            ctx.fill();
          },
        });
      }
      particlesRef.current = particles;

      function animateParticles() {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach((p) => {
          p.update(canvas!.width, canvas!.height);
          p.draw(ctx!);
        });

        particles.forEach((p1, i) => {
          particles.slice(i + 1).forEach((p2) => {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 180 && ctx) {
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(99, 102, 241, ${0.06 * (1 - dist / 180)})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          });
        });

        animFrameRef.current = requestAnimationFrame(animateParticles);
      }
      animateParticles();
    }

    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCountersVisible(true);
            statsObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    if (statsRef.current) statsObserver.observe(statsRef.current);

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.revealId;
            if (id) {
              setRevealed((prev) => ({ ...prev, [id]: true }));
              revealObserver.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    revealRefs.current.forEach((el) => {
      if (el) revealObserver.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(glowAnimId);
      cancelAnimationFrame(animFrameRef.current);
      statsObserver.disconnect();
      revealObserver.disconnect();
      if (cleanupResize) cleanupResize();
    };
  }, []);

  const handleMagneticMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`;
  };
  const handleMagneticLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.transform = "translate(0, 0)";
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--mouse-x", x + "%");
    card.style.setProperty("--mouse-y", y + "%");
  };

  const Counter = ({ target, decimal, suffix = "" }: { target: number; decimal?: boolean; suffix?: string }) => {
    const [value, setValue] = useState(0);
    const startedRef = useRef(false);

    useEffect(() => {
      if (!countersVisible || startedRef.current) return;
      startedRef.current = true;
      const duration = 2200;
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);
        const current = target * easeOut;
        setValue(decimal ? parseFloat(current.toFixed(1)) : Math.floor(current));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, [countersVisible, target, decimal]);

    return <span>{decimal ? value.toFixed(1) : value}{suffix}</span>;
  };

  const isRevealed = (id: string) => !!revealed[id];



  return (
    <div className="min-h-screen font-sans relative" style={{ background: "#0A0B14", color: "#E8E6F1" }}>
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
          background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Particles canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1] hidden md:block" />

      {/* NAV */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          borderBottom: "0.5px solid rgba(255,255,255,0.06)",
          background: scrolled ? "rgba(10,11,20,0.98)" : "rgba(10,11,20,0.92)",
          backdropFilter: scrolled ? "blur(20px)" : "blur(10px)",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "blur(10px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "#E8E6F1", fontFamily: "'Playfair Display', serif" }}
            >
              mayuri<span style={{ color: "#6366F1" }}>.</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
<Link
  href="#courses"
  className="text-sm transition-colors relative pb-0.5 group"
  style={{ color: "rgba(232,230,241,0.55)" }}
>
  courses
  <span className="absolute bottom-0 left-0 w-0 h-px bg-[#6366F1] transition-all duration-300 ease-out group-hover:w-full" />
</Link>
<a
  href="https://wa.me/c/919082556465"
  target="_blank"
  rel="noopener noreferrer"
  className="text-sm transition-colors relative pb-0.5 group"
  style={{ color: "rgba(232,230,241,0.55)" }}
>
  contact
  <span className="absolute bottom-0 left-0 w-0 h-px bg-[#6366F1] transition-all duration-300 ease-out group-hover:w-full" />
</a>
              {isLoggedIn ? (
                <Link
                  href="/main/dashboard"
                  className="text-sm font-medium px-5 py-2.5 rounded-xl transition-all duration-300 hover:shadow-lg flex items-center gap-2"
                  style={{ background: "rgba(99,102,241,0.15)", color: "#818CF8", border: "0.5px solid rgba(99,102,241,0.25)" }}
                  onMouseMove={handleMagneticMove}
                  onMouseLeave={handleMagneticLeave}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: "#6366F1", color: "#fff" }}>
                    {userPhone.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[100px] truncate">{userPhone}</span>
                </Link>
              ) : (
                <Link
                  href="/main/login"
                  className="text-sm font-medium px-5 py-2.5 rounded-xl transition-all duration-300 hover:shadow-lg"
                  style={{ background: "#6366F1", color: "#fff", boxShadow: "0 4px 20px rgba(99,102,241,0.25)" }}
                  onMouseMove={handleMagneticMove}
                  onMouseLeave={handleMagneticLeave}
                >
                  log in
                </Link>
              )}
            </div>

            <button
              className="md:hidden p-2 rounded-lg"
              style={{ color: "rgba(232,230,241,0.7)" }}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {menuOpen ? (
                  <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
                ) : (
                  <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
                )}
              </svg>
            </button>
          </div>
        </div>

       
{/* Mobile menu */}
{menuOpen && (
  <div className="md:hidden" style={{ background: "rgba(10,11,20,0.98)", borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
    <div className="px-6 py-4 space-y-3">
      <a
        href="https://wa.me/c/919082556465"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm py-2"
        style={{ color: "rgba(232,230,241,0.7)" }}
      >
        courses
      </a>
      <a
        href="https://wa.me/c/919082556465"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-sm py-2"
        style={{ color: "rgba(232,230,241,0.7)" }}
      >
        contact
      </a>
      {isLoggedIn ? (
        <Link
          href="/main/dashboard"
          className="block text-sm font-medium px-5 py-2.5 rounded-xl text-center mt-4 flex items-center justify-center gap-2"
          style={{ background: "rgba(99,102,241,0.15)", color: "#818CF8", border: "0.5px solid rgba(99,102,241,0.25)" }}
        >
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: "#6366F1", color: "#fff" }}>
            {userPhone.charAt(0).toUpperCase()}
          </div>
          {userPhone}
        </Link>
      ) : (
        <Link
          href="/main/login"
          className="block text-sm font-medium px-5 py-2.5 rounded-xl text-center mt-4"
          style={{ background: "#6366F1", color: "#fff" }}
        >
          log in
        </Link>
      )}
    </div>
  </div>
)}
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background orbs */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-[0.12] pointer-events-none hidden md:block"
          style={{ top: "5%", left: "-10%", background: "#6366F1", animation: "float 8s ease-in-out infinite" }}
        />
        <div
          className="absolute w-96 h-96 rounded-full blur-[100px] opacity-[0.1] pointer-events-none hidden md:block"
          style={{ top: "50%", right: "5%", background: "#8B5CF6", animation: "float 8s ease-in-out 3s infinite" }}
        />
        <div
          className="absolute w-72 h-72 rounded-full blur-[100px] opacity-[0.08] pointer-events-none hidden md:block"
          style={{ bottom: "5%", left: "25%", background: "#6366F1", animation: "float 8s ease-in-out 5s infinite" }}
        />

        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24 relative z-10 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 max-w-2xl">
              <div
                className="inline-flex items-center gap-2 text-xs font-medium px-4 py-1.5 rounded-full mb-6 relative overflow-hidden"
                style={{ background: "rgba(99,102,241,0.1)", color: "#818CF8", border: "0.5px solid rgba(99,102,241,0.2)" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] animate-pulse" />
                47+ courses available
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
              </div>

              <h1
                className="text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.1] tracking-tight mb-6"
                style={{ color: "#E8E6F1", fontFamily: "'Playfair Display', serif" }}
              >
                learn from an
                <br />
                expert who{" "}
                <span
                  className="italic"
                  style={{
                    background: "linear-gradient(135deg, #6366F1, #A5B4FC)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  actually
                </span>
                <br />
                cares
              </h1>

              <p className="text-lg md:text-xl leading-relaxed mb-10 max-w-lg" style={{ color: "rgba(232,230,241,0.45)" }}>
                Practical courses, real skills. Join thousands of students learning from Mayuri&apos;s in-depth video lessons.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href={isLoggedIn ? "/main/dashboard" : "/main/login"}
                  className="group relative font-medium px-8 py-4 rounded-xl transition-all duration-300 overflow-hidden inline-flex items-center gap-2"
                  style={{ background: "#6366F1", color: "#fff" }}
                  onMouseMove={handleMagneticMove}
                  onMouseLeave={handleMagneticLeave}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isLoggedIn ? "go to dashboard" : "browse courses"}
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </span>
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </Link>
                <Link
                  href={isLoggedIn ? "/main/dashboard" : "/main/login"}
                  className="group font-medium px-8 py-4 rounded-xl transition-all duration-300 hover:border-[#6366F1]/30 inline-flex items-center gap-2"
                  style={{ border: "0.5px solid rgba(255,255,255,0.15)", color: "#E8E6F1" }}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                  {isLoggedIn ? "my profile" : "log in"}
                </Link>
              </div>

              {/* Social proof */}
              <div className="flex items-center gap-4 mt-12">
                <div className="flex -space-x-2">
                  {["A", "S", "M", "+"].map((letter, i) => (
                    <div
                      key={letter}
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium"
                      style={{ background: ["#1E1B4B", "#312E81", "#4338CA", "#0A0B14"][i], borderColor: "#0A0B14", color: "#E8E6F1" }}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                <p className="text-sm" style={{ color: "rgba(232,230,241,0.35)" }}>
                  <span style={{ color: "#E8E6F1" }}>5,000+</span> students enrolled
                </p>
              </div>
            </div>

            {/* Video Card */}
            <div className="w-full max-w-md lg:w-96 shrink-0 relative">
              <div
                className="rounded-3xl overflow-hidden relative group"
                style={{
                  border: "0.5px solid rgba(255,255,255,0.08)",
                  background: "#12131F",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)",
                }}
              >
                <div className="aspect-video relative overflow-hidden bg-black">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/4hF0k7anviI?rel=0&modestbranding=1${videoPlaying ? "&autoplay=1" : ""}`}
                    title="Welcome to Mayuri's platform"
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  {!videoPlaying && (
                    <>
                      <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full border border-white/20 animate-pulse" />
                        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 rounded-full border border-white/10 animate-pulse" style={{ animationDelay: "1s" }} />
                      </div>
                      <button
                        onClick={() => setVideoPlaying(true)}
                        className="absolute inset-0 m-auto w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-400 hover:scale-[1.15] hover:shadow-[0_0_40px_rgba(99,102,241,0.3)] active:scale-95 z-10"
                        style={{ border: "1.5px solid rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}
                      >
                        <div className="w-0 h-0 border-t-[10px] border-b-[10px] border-l-[16px] border-transparent border-l-white ml-1" />
                        <div className="absolute inset-0 rounded-full border border-white/30 animate-ping" style={{ animationDuration: "2s" }} />
                      </button>
                    </>
                  )}
                </div>
                <div className="p-5" style={{ background: "#12131F" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm" style={{ color: "#E8E6F1" }}>Welcome to Mayuri&apos;s platform</p>
                      <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "rgba(232,230,241,0.4)" }}>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
                        Intro · 3 min preview
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(99,102,241,0.1)" }}>
                      <svg className="w-4 h-4" style={{ color: "#6366F1" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div
                className="absolute -bottom-4 -right-4 md:right-8 rounded-2xl px-4 py-3"
                style={{
                  background: "rgba(18, 19, 31, 0.8)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className="w-3 h-3 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    ))}
                  </div>
                  <span className="text-xs font-medium" style={{ color: "#E8E6F1" }}>4.9 rating</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-xs tracking-widest uppercase" style={{ color: "rgba(232,230,241,0.25)" }}>Scroll</span>
          <div className="w-5 h-8 rounded-full border flex items-start justify-center p-1" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
            <div className="w-1 h-2 rounded-full bg-white/40 animate-bounce" />
          </div>
        </div>
      </section>

      {/* STATS */}
      <div ref={statsRef} style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)", borderBottom: "0.5px solid rgba(255,255,255,0.06)", background: "#07080F" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              { target: 47, suffix: "+", label: "courses" },
              { target: 200, suffix: "+", label: "video lessons" },
              { target: 5, suffix: "k+", label: "students" },
              { target: 4.9, suffix: "", label: "avg rating", decimal: true },
            ].map((s, i) => (
              <div
                key={s.label}
                className="py-10 md:py-12 text-center relative overflow-hidden group"
                style={{ borderLeft: i > 0 ? "0.5px solid rgba(255,255,255,0.06)" : "none" }}
              >
                <div className="text-4xl md:text-5xl font-semibold mb-1" style={{ color: "#6366F1", fontFamily: "'Playfair Display', serif" }}>
                  <Counter target={s.target} decimal={s.decimal} suffix={s.suffix} />
                </div>
                <div className="text-sm tracking-wide uppercase" style={{ color: "rgba(232,230,241,0.35)" }}>{s.label}</div>
                <div className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-[#6366F1] transition-all duration-500 ease-out -translate-x-1/2 group-hover:w-[60%]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* COURSES */}
      <section id="courses" className="max-w-7xl mx-auto px-6 lg:px-10 py-24 relative">
        <div
          ref={addRevealRef}
          data-reveal-id="courses-header"
          className={`flex flex-col sm:flex-row justify-between items-start sm:items-baseline mb-12 transition-all duration-700 ${isRevealed("courses-header") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="mb-4 sm:mb-0">
            <h2 className="text-3xl md:text-4xl font-medium" style={{ color: "#E8E6F1", fontFamily: "'Playfair Display', serif" }}>popular courses</h2>
            <p className="text-sm mt-2" style={{ color: "rgba(232,230,241,0.35)" }}>Hand-picked favorites from our community</p>
          </div>
          <Link href="/main/login" className="group text-sm font-medium flex items-center gap-1 transition-all hover:gap-2 shrink-0" style={{ color: "#818CF8" }}>
            view all
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </Link>
        </div>

        {loadingMainCourses ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(99,102,241,0.3)", borderTopColor: "#6366F1" }} />
            <span className="text-sm ml-3" style={{ color: "rgba(232,230,241,0.35)" }}>Loading courses...</span>
          </div>
        ) : mainCourses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: "rgba(232,230,241,0.35)" }}>No main courses yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {mainCourses.map((c, i) => (
              <Link
                key={c.id}
                href="/main/login"
                className="course-card block rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer transition-all duration-700 opacity-100 translate-y-0"
                style={{
                  border: "0.5px solid rgba(255,255,255,0.06)",
                  background: "#12131F",
                  transitionDelay: `${i * 80}ms`,
                }}
                onMouseMove={handleCardMouseMove}
              >
                <div className="h-44 sm:h-48 md:h-52 flex items-center justify-center relative overflow-hidden" style={{ background: "rgba(99,102,241,0.08)" }}>
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(99,102,241,0.08)" }}>
                      <span className="text-4xl font-semibold" style={{ color: "#6366F1", fontFamily: "'Playfair Display', serif" }}>{c.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.25), transparent 70%)" }} />
                </div>
                <div className="p-5 md:p-6 relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] md:text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(99,102,241,0.12)", color: "#818CF8", border: "0.5px solid rgba(99,102,241,0.25)" }}>main course</span>
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3" style={{ color: "rgba(232,230,241,0.3)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      <span className="text-[11px] md:text-xs" style={{ color: "rgba(232,230,241,0.3)" }}>{c.total_lessons || 0} lessons</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-base md:text-lg leading-snug mb-2" style={{ color: "#E8E6F1" }}>{c.name}</h3>
                  <p className="text-xs md:text-sm leading-relaxed mb-4 line-clamp-2" style={{ color: "rgba(232,230,241,0.35)" }}>{c.description || "No description available."}</p>
                  <div className="flex justify-between items-center pt-3" style={{ borderTop: "0.5px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-[11px] md:text-xs flex items-center gap-1" style={{ color: "rgba(232,230,241,0.3)" }}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
                      {c.total_lessons || 0} lessons
                    </span>
                    <span className="text-[11px] md:text-xs flex items-center gap-1 font-medium" style={{ color: "rgba(232,230,241,0.45)" }}>
                      <svg className="w-3 h-3 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                      4.9
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div
          ref={addRevealRef}
          data-reveal-id="testimonials-header"
          className={`text-center mb-12 transition-all duration-700 ${isRevealed("testimonials-header") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <h2 className="text-3xl md:text-4xl font-medium mb-3" style={{ color: "#E8E6F1", fontFamily: "'Playfair Display', serif" }}>What students say</h2>
          <p className="text-sm" style={{ color: "rgba(232,230,241,0.35)" }}>Real feedback from real learners</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              text: "Mayuri's teaching style is incredible. The way she breaks down complex topics into digestible lessons changed how I approach learning entirely.",
              initials: "JD",
              name: "James Davidson",
              role: "Product Designer",
              color: "rgba(99,102,241,0.15)",
              textColor: "#818CF8",
            },
            {
              text: "I've tried many online courses before, but nothing compares to the depth and care put into each lesson here. Truly transformative.",
              initials: "SK",
              name: "Sarah Kim",
              role: "Software Engineer",
              color: "rgba(16,185,129,0.15)",
              textColor: "#34D399",
            },
            {
              text: "The community and the quality of content is unmatched. Every course feels like a personal mentorship session. Worth every penny.",
              initials: "MR",
              name: "Marcus Rivera",
              role: "Entrepreneur",
              color: "rgba(139,92,246,0.15)",
              textColor: "#A78BFA",
            },
          ].map((t, i) => (
            <div
              key={t.name}
              ref={addRevealRef}
              data-reveal-id={`testimonial-${i}`}
              className={`rounded-2xl p-6 transition-all duration-700 ${isRevealed(`testimonial-${i}`) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ background: "#12131F", border: "0.5px solid rgba(255,255,255,0.05)", transitionDelay: `${i * 100}ms` }}
            >
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                ))}
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "rgba(232,230,241,0.65)" }}>&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{ background: t.color, color: t.textColor }}>{t.initials}</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#E8E6F1" }}>{t.name}</p>
                  <p className="text-xs" style={{ color: "rgba(232,230,241,0.25)" }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="about" className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <div
          ref={addRevealRef}
          data-reveal-id="cta"
          className={`rounded-3xl p-12 md:p-20 text-center relative overflow-hidden transition-all duration-700 ${isRevealed("cta") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{
            background: "linear-gradient(135deg, #4338CA 0%, #6366F1 50%, #818CF8 100%)",
            backgroundSize: "200% 200%",
            animation: "gradientShift 8s ease infinite",
          }}
        >
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 rounded-full border border-white/10" />
            <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full border border-white/5" />
            <div className="absolute top-1/2 left-1/4 w-2 h-2 rounded-full bg-white/20" />
            <div className="absolute top-1/3 right-1/3 w-3 h-3 rounded-full bg-white/10" />
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-medium mb-4" style={{ color: "#fff", fontFamily: "'Playfair Display', serif" }}>Ready to start learning?</h2>
            <p className="text-base md:text-lg mb-10 max-w-md mx-auto" style={{ color: "rgba(255,255,255,0.85)" }}>Create your free account and get instant access to preview lessons.</p>
            <Link
              href="/main/login"
              className="inline-flex items-center gap-2 font-semibold px-10 py-4 rounded-xl transition-all duration-300 hover:shadow-2xl hover:scale-105"
              style={{ background: "#0A0B14", color: "#E8E6F1" }}
              onMouseMove={handleMagneticMove}
              onMouseLeave={handleMagneticLeave}
            >
              get started right now
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            </Link>
            <p className="text-xs mt-6" style={{ color: "rgba(255,255,255,0.5)" }}>No credit card required · Free preview access</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 lg:px-10 py-8" style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm" style={{ color: "rgba(232,230,241,0.25)" }}>© 2026 mayuri. all rights reserved.</p>
          <div className="flex gap-8">
<Link
  href="#"
  className="text-sm relative group transition-colors hover:!text-[#E8E6F1]"
  style={{ color: "rgba(232,230,241,0.25)" }}
>
  privacy
  <span className="absolute bottom-[-2px] left-0 w-0 h-px bg-[#E8E6F1] transition-all duration-300 group-hover:w-full" />
</Link>
<Link
  href="#"
  className="text-sm relative group transition-colors hover:!text-[#E8E6F1]"
  style={{ color: "rgba(232,230,241,0.25)" }}
>
  terms
  <span className="absolute bottom-[-2px] left-0 w-0 h-px bg-[#E8E6F1] transition-all duration-300 group-hover:w-full" />
</Link>
<a
  href="https://wa.me/919082556465"
  target="_blank"
  rel="noopener noreferrer"
  className="text-sm relative group transition-colors hover:!text-[#E8E6F1]"
  style={{ color: "rgba(232,230,241,0.25)" }}
>
  support
  <span className="absolute bottom-[-2px] left-0 w-0 h-px bg-[#E8E6F1] transition-all duration-300 group-hover:w-full" />
</a>
          </div>
        </div>
      </footer>

      {/* Global styles for animations */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,500&display=swap');

        html {
          scroll-behavior: smooth;
        }

        body {
          font-family: 'Inter', sans-serif;
        }

        ::selection {
          background: rgba(99,102,241,0.3);
          color: #fff;
        }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0A0B14; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.5); }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-shimmer {
          animation: shimmer 3s infinite;
        }

        .course-card:hover {
          transform: translateY(-8px);
          border-color: rgba(99,102,241,0.2) !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.1);
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}