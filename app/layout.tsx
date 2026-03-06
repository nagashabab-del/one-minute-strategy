import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkUiEnabled } from "./clerk-runtime";
import "./globals.css";

export const metadata: Metadata = {
  title: "One Minute Strategy",
  description: "منصة ذكاء قرارات تنفيذية لإدارة المشاريع وتشغيل الفعاليات.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar">
      <body className="antialiased">
        {clerkUiEnabled ? <ClerkProvider>{children}</ClerkProvider> : children}
      </body>
    </html>
  );
}
