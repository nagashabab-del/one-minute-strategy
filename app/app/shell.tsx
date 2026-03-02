"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, UserButton } from "@clerk/nextjs";

const NAV_ITEMS = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/strategy", label: "Strategy" },
  { href: "/app/reports", label: "Reports" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px" }}>
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
          </div>
        </header>

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
            <nav style={{ display: "grid", gap: 6 }}>
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
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
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <section
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
      </div>

      <style>{`
        @media (max-width: 980px) {
          .app-shell-mobile-stack {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
