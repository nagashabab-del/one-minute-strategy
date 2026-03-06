"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { clerkUiEnabled } from "../clerk-runtime";
import {
  READINESS_LOCK_REASON,
  READINESS_STATUS_ADVISORY,
  READINESS_STATUS_GAP,
  resolveQuickStartForReadiness,
} from "./_lib/readiness-lock";
import { installWorkspaceSyncBridge } from "./_lib/workspace-backend";
import { readReports } from "./reports/report-store";
import { evaluateStrategyReadiness, readActiveStrategyProject } from "./strategy/_lib/readiness";

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
  const clerkConfigured = clerkUiEnabled;
  const demoModeEnabled =
    process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_OMS_ALLOW_DEMO_MODE === "true";
  const inStrategyFlow = pathname.startsWith("/app/strategy");
  const [hasReports, setHasReports] = useState(false);
  const [gapMode, setGapMode] = useState(false);

  const currentSection = useMemo(() => {
    if (pathname.startsWith("/app/strategy")) return "الاستراتيجية";
    if (pathname.startsWith("/app/reports")) return "التقارير";
    if (pathname.startsWith("/app/workflows")) return "سير العمل";
    if (pathname.startsWith("/app/settings")) return "الإعدادات";
    return "نظرة عامة";
  }, [pathname]);

  const projectContext = useMemo<ProjectContext | null>(() => {
    if (typeof window === "undefined") return null;
    if (!pathname) return null;
    try {
      const raw = localStorage.getItem(PROJECTS_REGISTRY_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        activeProjectId?: string;
        projects?: Array<{ id: string; name: string; updatedAt?: string }>;
      };
      const projects = Array.isArray(parsed.projects) ? parsed.projects : [];
      const active = projects.find((item) => item.id === parsed.activeProjectId) ?? projects[0];
      if (!active) return null;
      const updated = active.updatedAt ? new Date(active.updatedAt) : null;
      const updatedText =
        updated && !Number.isNaN(updated.getTime())
          ? `${updated.toLocaleDateString("en-CA")} ${updated.toLocaleTimeString("ar-SA", {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : "غير متاح";
      return {
        name: active.name?.trim() || "مشروع بدون اسم",
        updatedAt: updatedText,
      };
    } catch {
      return null;
    }
  }, [pathname]);

  useEffect(() => {
    const refreshContextState = () => {
      setHasReports(readReports().length > 0);
      const readiness = readStrategyReadiness();
      setGapMode(readiness.mode === "gap");
    };
    refreshContextState();
    window.addEventListener("storage", refreshContextState);
    return () => window.removeEventListener("storage", refreshContextState);
  }, [pathname]);

  const shouldShowReportsShortcut = !inStrategyFlow || hasReports;
  const quickStart = resolveQuickStartForReadiness(gapMode ? "gap" : "advisory");
  const quickActionBlockedHint = READINESS_LOCK_REASON;

  useEffect(() => {
    installWorkspaceSyncBridge();
  }, []);

  return (
    <div
      className="app-shell-root"
      dir="rtl"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 10%, rgba(121,41,255,0.20), transparent 36%), radial-gradient(circle at 85% 90%, rgba(0,229,255,0.12), transparent 36%), linear-gradient(180deg, #070a14, #090f1b 60%, #06080f)",
        color: "#F5F8FF",
      }}
    >
      <div
        className={`app-shell-inner ${inStrategyFlow ? "in-strategy-flow" : ""}`}
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          padding: "calc(env(safe-area-inset-top, 0px) + 16px) 16px 86px",
        }}
      >
        <header
          className="app-shell-header"
          style={{
            borderRadius: 16,
            border: "1px solid rgba(138,160,255,0.24)",
            background: "linear-gradient(180deg, rgba(11,16,32,0.90), rgba(8,12,23,0.82))",
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            rowGap: 8,
            flexWrap: "wrap",
          }}
        >
          <div className="app-shell-brand" style={{ fontSize: 17, fontWeight: 900 }}>
            One Minute Strategy
          </div>
          <div className="app-shell-user-zone" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {clerkConfigured ? (
              <>
                <UserButton afterSignOutUrl="/" />
                <SignOutButton>
                  <button
                    className="oms-btn oms-btn-ghost"
                    type="button"
                    style={{
                      cursor: "pointer",
                    }}
                  >
                    تسجيل الخروج
                  </button>
                </SignOutButton>
              </>
            ) : (
              <div
                className="oms-btn oms-btn-ghost"
                style={{
                  color: demoModeEnabled ? "rgba(245,248,255,0.76)" : "#ffb3b3",
                  fontWeight: 700,
                }}
              >
                {demoModeEnabled ? "وضع تجريبي بدون Clerk" : "المصادقة غير مفعّلة"}
              </div>
            )}
          </div>
        </header>

        <section
          className="app-shell-context"
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
          <div
            className="app-shell-context-row"
            style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}
          >
            <div>
              <div style={{ fontSize: 12, color: "rgba(220,231,255,0.70)" }}>القسم الحالي</div>
              <div style={{ marginTop: 3, fontSize: 22, fontWeight: 900 }}>{currentSection}</div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: gapMode ? "#ffb3b3" : "rgba(138,255,214,0.88)",
                  fontWeight: 700,
                }}
              >
                {gapMode ? READINESS_STATUS_GAP : READINESS_STATUS_ADVISORY}
              </div>
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
          <div className="app-shell-context-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href={quickStart.href} className="oms-btn oms-btn-primary">
              {quickStart.label}
            </Link>
            {gapMode ? (
              <button
                type="button"
                className="context-btn-mobile-hide oms-btn oms-btn-ghost app-shell-action-disabled"
                title={quickActionBlockedHint}
                disabled
              >
                متابعة سير العمل
              </button>
            ) : (
              <Link className="context-btn-mobile-hide oms-btn oms-btn-ghost" href="/app/workflows">
                متابعة سير العمل
              </Link>
            )}
            {shouldShowReportsShortcut ? (
              gapMode ? (
                <button
                  type="button"
                  className="oms-btn oms-btn-ghost app-shell-action-disabled"
                  title={quickActionBlockedHint}
                  disabled
                >
                  فتح التقارير
                </button>
              ) : (
                <Link className="oms-btn oms-btn-ghost" href="/app/reports">
                  فتح التقارير
                </Link>
              )
            ) : null}
          </div>
        </section>

        <div
          className="app-shell-mobile-stack"
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: inStrategyFlow
              ? "minmax(0, 1fr)"
              : "minmax(220px, 250px) minmax(0, 1fr)",
            gap: 12,
          }}
        >
          {!inStrategyFlow ? (
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
          ) : null}

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

        {!inStrategyFlow ? (
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
        ) : null}
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
          .app-shell-inner {
            padding-top: max(22px, calc(env(safe-area-inset-top, 0px) + 14px)) !important;
            padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 148px) !important;
          }

          .app-shell-inner.in-strategy-flow {
            padding-bottom: 20px !important;
          }

          .app-shell-header {
            padding: 10px 10px !important;
          }

          .app-shell-brand {
            font-size: 15px !important;
          }

          .app-shell-user-zone {
            gap: 8px !important;
          }

          .app-shell-context {
            padding: 10px 10px !important;
            gap: 8px !important;
          }

          .app-shell-context-row {
            display: grid !important;
            grid-template-columns: 1fr;
            gap: 8px !important;
          }

          .app-shell-context-actions {
            display: grid !important;
            grid-template-columns: 1fr;
          }

          .app-shell-sidebar {
            display: none !important;
          }

          .app-shell-mobile-stack {
            grid-template-columns: 1fr !important;
          }

          .app-shell-nav {
            display: none !important;
          }

          .context-btn-mobile-hide {
            display: none !important;
          }

          .app-shell-mobile-bottom {
            position: fixed;
            left: max(8px, calc(env(safe-area-inset-left, 0px) + 8px));
            right: max(8px, calc(env(safe-area-inset-right, 0px) + 8px));
            bottom: max(8px, calc(env(safe-area-inset-bottom, 0px) + 8px));
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

        @media (max-width: 980px) {
          .app-shell-context-actions {
            gap: 6px !important;
          }
        }

        .app-shell-action-disabled {
          opacity: 0.58;
          cursor: not-allowed;
          border-color: rgba(244,126,126,0.42) !important;
          color: #ffb3b3 !important;
        }
      `}</style>
    </div>
  );
}

function readStrategyReadiness() {
  const project = readActiveStrategyProject();
  return evaluateStrategyReadiness(project.snapshot);
}
