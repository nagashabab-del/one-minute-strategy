import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import type { LocalizationResource } from "@clerk/shared/types";
import { clerkUiEnabled } from "./clerk-runtime";
import "./globals.css";

export const metadata: Metadata = {
  title: "One Minute Strategy",
  description: "منصة ذكاء قرارات تنفيذية لإدارة المشاريع وتشغيل الفعاليات.",
};

export const dynamic = "force-dynamic";

const arabicClerkLocalization: LocalizationResource = {
  locale: "ar-SA",
  dividerText: "أو",
  socialButtonsBlockButton: "المتابعة عبر {{provider|titleize}}",
  formFieldLabel__emailAddress: "البريد الإلكتروني",
  formFieldLabel__emailAddress_username: "البريد الإلكتروني",
  formFieldLabel__password: "كلمة المرور",
  formFieldInputPlaceholder__emailAddress: "أدخل بريدك الإلكتروني",
  formFieldInputPlaceholder__emailAddress_username: "أدخل بريدك الإلكتروني",
  formFieldInputPlaceholder__password: "أدخل كلمة المرور",
  formButtonPrimary: "متابعة",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar">
      <body className="antialiased">
        {clerkUiEnabled ? (
          <ClerkProvider
            afterSignOutUrl="/sign-in"
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            localization={arabicClerkLocalization}
          >
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
