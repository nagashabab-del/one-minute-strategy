import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "One Minute Strategy",
  description: "منصة ذكاء قرارات تنفيذية لإدارة المشاريع وتشغيل الفعاليات.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar">
      <body className="antialiased">{children}</body>
    </html>
  );
}
