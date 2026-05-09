"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { DS, supabase } from "../../main/lib/shared";

const navItems = [
  { path: "/admin/users", label: "Users", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { path: "/admin/maincourses", label: "Main Courses", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
  { path: "/admin/subcourses", label: "Subcourses", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  { path: "/admin/assign", label: "Assign", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { path: "/admin/analytics", label: "Analytics", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { path: "/admin/announcement", label: "Announcements", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
];

const pageMeta: Record<string, { title: string; desc: string }> = {
  "/admin/users": { title: "User Management", desc: "Create, manage, and view assignments for all users" },
  "/admin/maincourses": { title: "Main Courses", desc: "Create main courses with images, link subcourses and assign users" },
  "/admin/subcourses": { title: "Subcourses", desc: "Create and edit subcourses that go inside main courses" },
  "/admin/assign": { title: "Assign Courses", desc: "Assign subcourses directly to users" },
  "/admin/analytics": { title: "Analytics", desc: "Per-user lesson completion tracking and progress details" },
  "/admin/announcement": { title: "Announcements", desc: "Post notices visible to all users on their dashboard" },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin_sidebar_collapsed") === "true";
    }
    return false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem("admin_authenticated");
    if (!auth) router.replace("/admin");

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const auth = sessionStorage.getItem("admin_authenticated");
        if (!auth) router.replace("/admin");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authenticated");
    router.push("/admin");
  };

  const normalizedPath = pathname.replace(/\/$/, "");
  const meta = pageMeta[normalizedPath] || { title: "Dashboard", desc: "Admin dashboard" };

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("admin_sidebar_collapsed", String(next));
      return next;
    });
  };

  return (
    <div className="flex min-h-screen" style={{ background: DS.bg.base, color: DS.text.primary, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between"
        style={{ background: DS.bg.sidebar, borderBottom: `1px solid ${DS.border.default}` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: DS.accentSoft }}>
            <span className="text-sm font-bold" style={{ color: DS.accent }}>M</span>
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight">mayuri<span style={{ color: DS.accent }}>.</span></p>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: DS.text.dim }}>admin</p>
          </div>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg" style={{ color: DS.text.secondary }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {mobileMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`flex-col justify-between shrink-0 transition-all duration-300 fixed md:relative z-40 h-screen md:h-auto
        ${mobileMenuOpen ? "flex" : "hidden md:flex"}`}
        style={{ width: sidebarCollapsed ? "72px" : "240px", background: DS.bg.sidebar, borderRight: `1px solid ${DS.border.default}` }}>
        <div>
          <div className="px-5 py-6 flex items-center gap-3" style={{ borderBottom: `1px solid ${DS.border.default}` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: DS.accentSoft }}>
              <span className="text-sm font-bold" style={{ color: DS.accent }}>M</span>
            </div>
            {!sidebarCollapsed && (
              <div>
                <p className="text-base font-semibold tracking-tight">mayuri<span style={{ color: DS.accent }}>.</span></p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: DS.text.dim }}>admin</p>
              </div>
            )}
          </div>

          <nav className="px-2.5 py-4 flex flex-col gap-0.5">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left text-sm transition-all duration-200 group"
                style={pathname === item.path
                  ? { background: DS.accentSoft, color: DS.accent, border: "0.5px solid rgba(99,102,241,0.2)" }
                  : { color: DS.text.secondary, border: "0.5px solid transparent" }}
                title={sidebarCollapsed ? item.label : undefined}
                onClick={() => setMobileMenuOpen(false)}>
                <span className="shrink-0" style={{ opacity: pathname === item.path ? 1 : 0.7 }}>{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>

        <div className="px-2.5 py-4" style={{ borderTop: `1px solid ${DS.border.default}` }}>
          <div className="flex flex-col gap-2">
            <button onClick={toggleSidebar}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.04)", color: DS.text.muted, border: `0.5px solid ${DS.border.default}` }}
              title={sidebarCollapsed ? "Expand" : "Collapse"}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: sidebarCollapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              {!sidebarCollapsed && <span>collapse</span>}
            </button>
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all hover:opacity-80"
              style={{ background: DS.accentSoft, color: DS.accent, border: "0.5px solid rgba(99,102,241,0.18)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DS.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {!sidebarCollapsed && <span>Log out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
      )}

      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="sticky top-0 z-10 px-8 py-4 flex items-center justify-between backdrop-blur-xl"
          style={{ background: "rgba(11,13,20,0.8)", borderBottom: `1px solid ${DS.border.default}` }}>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{meta.title}</h1>
            <p className="text-xs mt-0.5" style={{ color: DS.text.muted }}>{meta.desc}</p>
          </div>
          <div className="px-3 py-1.5 rounded-full text-xs" style={{ background: "rgba(255,255,255,0.04)", border: `0.5px solid ${DS.border.default}`, color: DS.text.muted }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </div>
        </div>

        <div className="px-8 py-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}