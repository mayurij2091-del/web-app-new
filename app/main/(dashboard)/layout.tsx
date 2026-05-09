"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { DS } from "../lib/shared";

type Tab = "overview" | "mycourses" | "announcements";

const navItems: { key: Tab; label: string; href: string; icon: ReactNode }[] = [
  {
    key: "overview",
    label: "Overview",
    href: "/main/dashboard",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
  },
  {
    key: "mycourses",
    label: "My Courses",
    href: "/main/courses",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
  },
  {
    key: "announcements",
    label: "Announcements",
    href: "/main/announcements",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  },
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userPhone, setUserPhone] = useState("");

  // 3. Persist sidebar collapse state in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar_collapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    const checkAuth = () => {
      const phone = sessionStorage.getItem("user_phone");
      if (!phone) {
        router.replace("/main/login");
        return;
      }
      setUserPhone(phone);
    };
    checkAuth();

    const handlePopState = () => {
      const phone = sessionStorage.getItem("user_phone");
      if (!phone) {
        router.replace("/main/login");
      }
    };
    window.addEventListener("popstate", handlePopState);

    // 2. Re-check auth when user returns to the tab (catches cross-tab or mid-session clears)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const phone = sessionStorage.getItem("user_phone");
        if (!phone) {
          router.replace("/main/login");
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname]);

  const handleLogout = () => {
    sessionStorage.removeItem("user_phone");
    router.replace("/main/login");
  };

  // 1. Explicit null return for unrecognized paths instead of silent fallback
  const getTabFromPathname = (path: string): Tab | null => {
    if (path === "/main/dashboard") return "overview";
    if (path === "/main/courses") return "mycourses";
    if (path === "/main/announcements") return "announcements";
    return null;
  };

  const tab = getTabFromPathname(pathname);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="flex min-h-screen" style={{ background: DS.bg.base, color: DS.text.primary, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col justify-between shrink-0 transition-all duration-300"
        style={{ width: sidebarCollapsed ? "72px" : "240px", background: DS.bg.sidebar, borderRight: `1px solid ${DS.border.default}` }}>
        <div>
          <div className="px-5 py-6 flex items-center gap-3" style={{ borderBottom: `1px solid ${DS.border.default}` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: DS.accentSoft }}>
              <span className="text-sm font-bold" style={{ color: DS.accent }}>M</span>
            </div>
            {!sidebarCollapsed && (
              <div>
                <p className="text-base font-semibold tracking-tight">mayuri<span style={{ color: DS.accent }}>.</span></p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: DS.text.dim }}>learning portal</p>
              </div>
            )}
          </div>
          <nav className="px-2.5 py-4 flex flex-col gap-0.5">
            {navItems.map((item) => (
              <Link key={item.key} href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left text-sm transition-all duration-200 group"
                style={tab === item.key
                  ? { background: DS.accentSoft, color: DS.accent, border: "0.5px solid rgba(99,102,241,0.2)" }
                  : { color: DS.text.secondary, border: "0.5px solid transparent" }}
                title={sidebarCollapsed ? item.label : undefined}>
                <span className="shrink-0" style={{ opacity: tab === item.key ? 1 : 0.7 }}>{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>
        <div className="px-2.5 py-4" style={{ borderTop: `1px solid ${DS.border.default}` }}>
          {!sidebarCollapsed && (
            <div className="px-3 py-2 mb-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: DS.text.dim }}>Logged in as</p>
              <p className="text-xs font-medium truncate" style={{ color: DS.text.secondary }}>{userPhone}</p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button onClick={toggleSidebar}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.04)", color: DS.text.muted, border: `0.5px solid ${DS.border.default}` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: sidebarCollapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              {!sidebarCollapsed && <span>collapse</span>}
            </button>
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all hover:opacity-80"
              style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.18)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {!sidebarCollapsed && <span>Log out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2"
        style={{ background: "rgba(17,19,30,0.95)", backdropFilter: "blur(12px)", borderTop: `1px solid ${DS.border.default}` }}>
        {/* 4. Small avatar / initials badge so the user knows who's logged in */}
        <div className="flex flex-col items-center gap-1 px-2 py-1.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: DS.accentSoft, color: DS.accent }}>
            {userPhone ? userPhone[0].toUpperCase() : "?"}
          </div>
          <span className="text-[10px] font-medium" style={{ color: DS.text.muted }}>You</span>
        </div>
        {navItems.map((item) => (
          <Link key={item.key} href={item.href}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all"
            style={tab === item.key ? { color: DS.accent } : { color: DS.text.muted }}>
            <span style={{ opacity: tab === item.key ? 1 : 0.6 }}>{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
        <button onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all"
          style={{ color: "#EF4444" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}