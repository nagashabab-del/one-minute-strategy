export type ClerkProductionIssue = {
  code: string;
  error: string;
};

export function getClerkProductionIssue(): ClerkProductionIssue | null {
  const deploymentEnv = (process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "").trim().toLowerCase();
  if (deploymentEnv !== "production") return null;

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
  const secretKey = process.env.CLERK_SECRET_KEY?.trim() ?? "";

  if (!publishableKey) {
    return {
      code: "CONFIG_MISSING_CLERK_PUBLISHABLE_KEY",
      error: "إعداد المصادقة غير مكتمل: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY غير موجود في بيئة الإنتاج.",
    };
  }

  if (publishableKey.startsWith("pk_test_") || secretKey.startsWith("sk_test_")) {
    return {
      code: "CONFIG_CLERK_TEST_KEY_IN_PRODUCTION",
      error: "إعداد المصادقة غير صالح: تم اكتشاف مفاتيح Clerk تجريبية في بيئة الإنتاج.",
    };
  }

  if (!secretKey) {
    return {
      code: "CONFIG_MISSING_CLERK_SECRET_KEY",
      error: "إعداد المصادقة غير مكتمل: CLERK_SECRET_KEY غير موجود في بيئة الإنتاج.",
    };
  }

  return null;
}
