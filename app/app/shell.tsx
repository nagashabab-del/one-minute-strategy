"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
};

type ProjectContext = {
  name: string;
  updatedAt: string;
};

const PROJECTS_REGISTRY_KEY = "oms_dashboard_projects_registry_v1";

const NAV_ITEMS: NavItem[] = [
  { href: "/app", label: "نظرة عامة", shortLabel: "نظرة عامة" },
  { href: "/app/workflows", label: "سير العمل", shortLabel: "السير" },
  { href: "/app/strategy", label: "الاستراتيجية", shortLabel: "الاستراتيجية" },
  { href: "/app/reports", label: "التقارير", shortLabel: "التقارير" },
  { href: "/app/settings", label: "الإعدادات", shortLabel: "الإعدادات" },
];

const MOBILE_ITEMS: NavItem[] = [
  { href: "/app", label: "نظرة عامة" },
  { href: "/app/strategy", label: "الاستراتيجية" },
  { href: "/app/reports", label: "التقارير" },
  { href: "/app/settings", label: "المزيد" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);

  const currentSection = useMemo(() => {
    if (pathname.startsWith("/app/strategy")) return "الاستراتيجية";
    if (pathname.startsWith("/app/reports")) return "التقارير";
    if (pathname.startsWith("/app/workflows")) return "سير العمل";
    if (pathname.startsWith("/app/settings")) return "الإعدادات";
    return "نظرة عامة";
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(PROJECTS_REGISTRY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        activeProjectId?: string;
        projects?: Array<{ id: string; name: string; updatedAt?: string }>;
      };
      const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
      const active = projects.find((item) => item.id === parsed.activeProjectId) ?? projects[0];
      if (!active) return;
      const updated = active.updatedAt ? new Date(active.updatedAt) : null;
      const updatedText =
        updated && !Number.isNaN(updated.getTime())
          ? `${updated.toLocaleDateString("en-CA")} ${updated.toLocaleTimeString("ar-SA", {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "غير متاح";
      setProjectContext({
        name: active.name?.trim() || "مشروع بدون اسم",
        updatedAt: updatedText,
      });
    } catch {
      setProjectContext(null);
    }
  }, [pathname]);

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 10%, rgba(121,41,255,0.20), transparent 36%), radial-gradient(circle at 85% 90%, rgba(0,229,255,0.12), transparent 36%), linear-gradient(180deg, #070a14, #090f1b 60%, #06080f)",
        color: "#F5F8FF",
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "16px 16px 86px" }}>
        <header
          style={{
            borderRadius: 16,
            border: "1px solid rgba(138,160,255,0.24)",
            background: "linear-gradient(180deg, rgba(11,16,32,0.90), rgba(8,12,23,0.82))",
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 900 }}>One Minute Strategy</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {clerkConfigured ? (
              <>
                <UserButton afterSignOutUrl="/" />
                <SignOutButton>
                  <button
                    type="button"
                    style={{
                      minHeight: 38,
                      borderRadius: 10,
                      border: "1px solid rgba(138,160,255,0.30)",
                      background: "rgba(10,15,28,0.80)",
                      color: "#F5F8FF",
                      fontWeight: 800,
                      padding: "0 12px",
                      cursor: "pointer",
                    }}
                  >
                    تسجيل الخروج
                  </button>
                </SignOutButton>
              </>
            ) : (
              <div
                style={{
                  minHeight: 38,
                  borderRadius: 10,
                  border: "1px solid rgba(138,160,255,0.30)",
                  background: "rgba(10,15,28,0.80)",
                  color: "rgba(245,248,255,0.76)",
                  fontWeight: 700,
                  padding: "0 12px",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                وضع تجريبي بدون Clerk
              </div>
            )}
          </div>
        </header>

        <section
          style={{
            marginTop: 12,
            borderRadius: 16,
            border: "1px solid rgba(138,160,255,0.20)",
            background: "linear-gradient(160deg, rgba(19,27,46,0.92), rgba(11,17,30,0.84))",
            padding: "12px 14px",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, color: "rgba(220,231,255,0.70)" }}>القسم الحالي</div>
              <div style={{ marginTop: 3, fontSize: 22, fontWeight: 900 }}>{currentSection}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "rgba(220,231,255,0.70)" }}>المشروع الحالي</div>
              <div style={{ marginTop: 3, fontSize: 16, fontWeight: 800 }}>
                {projectContext?.name ?? "غير محدد"}
              </div>
              <div style={{ marginTop: 2, fontSize: 12, color: "rgba(220,231,255,0.62)" }}>
                آخر تحديث: {projectContext?.updatedAt ?? "غير متاح"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/app/strategy" style={contextPrimaryBtnStyle}>
              بدء تحليل جديد
            </Link>
            <Link href="/app/workflows" style={contextGhostBtnStyle}>
              متابعة سير العمل
            </Link>
            <Link href="/app/reports" style={contextGhostBtnStyle}>
              فتح التقارير
            </Link>
          </div>
        </section>

        <div
          className="app-shell-mobile-stack"
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "minmax(220px, 250px) minmax(0, 1fr)",
            gap: 12,
          }}
        >
          <aside
            className="app-shell-sidebar"
            style={{
              borderRadius: 16,
              border: "1px solid rgba(138,160,255,0.22)",
              background: "linear-gradient(180deg, rgba(11,16,32,0.90), rgba(8,12,23,0.80))",
              padding: 10,
              height: "fit-content",
              position: "sticky",
              top: 12,
            }}
          >
              <div style={{ fontSize: 12, color: "rgba(225,233,255,0.72)", marginBottom: 8 }}>التنقل</div>
            <nav className="app-shell-nav" style={{ display: "grid", gap: 6 }}>
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    className="app-shell-nav-link"
                    key={item.href}
                    href={item.href}
                    style={{
                      minHeight: 42,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderRadius: 10,
                      border: active
                        ? "1px solid rgba(165,120,255,0.55)"
                        : "1px solid rgba(138,160,255,0.26)",
                      background: active
                        ? "linear-gradient(180deg, rgba(133,65,247,0.88), rgba(93,39,201,0.88))"
                        : "linear-gradient(180deg, rgba(11,18,33,0.88), rgba(8,13,24,0.84))",
                      color: "#F5F8FF",
                      fontWeight: 800,
                      textDecoration: "none",
                      padding: "0 12px",
                      fontSize: 15,
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <section
            className="app-shell-main"
            style={{
              borderRadius: 16,
              border: "1px solid rgba(138,160,255,0.20)",
              background: "linear-gradient(180deg, rgba(11,16,32,0.88), rgba(8,12,22,0.78))",
              padding: 14,
              minHeight: "calc(100vh - 120px)",
            }}
          >
            {children}
          </section>
        </div>

        <nav className="app-shell-mobile-bottom">
          {MOBILE_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  minHeight: 44,
                  borderRadius: 11,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#F5F8FF",
                  border: active
                    ? "1px solid rgba(165,120,255,0.52)"
                    : "1px solid rgba(138,160,255,0.26)",
                  background: active
                    ? "linear-gradient(180deg, rgba(133,65,247,0.92), rgba(93,39,201,0.90))"
                    : "linear-gradient(180deg, rgba(11,18,33,0.88), rgba(8,13,24,0.84))",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .app-shell-mobile-stack {
            grid-template-columns: 1fr !important;
          }

          .app-shell-sidebar {
            position: static !important;
            top: auto !important;
            padding: 10px 8px !important;
          }

          .app-shell-nav {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(120px, 1fr));
            gap: 8px !important;
          }

          .app-shell-main {
            min-height: auto !important;
          }
        }

        @media (max-width: 720px) {
          .app-shell-sidebar {
            display: none !important;
          }

          .app-shell-mobile-stack {
            grid-template-columns: 1fr !important;
          }

          .app-shell-nav {
            display: none !important;
          }

          .app-shell-mobile-bottom {
            position: fixed;
            left: 10px;
            right: 10px;
            bottom: 10px;
            z-index: 40;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
            border-radius: 14px;
            border: 1px solid rgba(138,160,255,0.24);
            background: linear-gradient(180deg, rgba(11,16,30,0.95), rgba(7,11,20,0.95));
            padding: 8px;
            backdrop-filter: blur(8px);
            box-shadow: 0 14px 30px rgba(0,0,0,0.45);
          }
        }

        @media (min-width: 721px) {
          .app-shell-mobile-bottom {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

const contextPrimaryBtnStyle = {
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid rgba(160,114,255,0.50)",
  background: "linear-gradient(180deg, rgba(131,64,242,0.94), rgba(88,39,187,0.92))",
  color: "#FFFFFF",
  fontWeight: 800,
  textDecoration: "none",
  padding: "0 12px",
  display: "inline-flex",
  alignItems: "center",
} as const;

const contextGhostBtnStyle = {
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid rgba(138,160,255,0.30)",
  background: "rgba(10,15,28,0.80)",
  color: "#F5F8FF",
  fontWeight: 800,
  textDecoration: "none",
  padding: "0 12px",
  display: "inline-flex",
  alignItems: "center",
} as const;
