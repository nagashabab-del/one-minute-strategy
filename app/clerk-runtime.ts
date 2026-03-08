const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
const runtimeEnv = (process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "")
  .trim()
  .toLowerCase();
const isProductionRuntime = runtimeEnv === "production";
const clerkUsesTestKey = clerkPublishableKey.startsWith("pk_test_");

export const clerkUiEnabled = clerkPublishableKey.length > 0 && !(isProductionRuntime && clerkUsesTestKey);

export function readClerkUiIssueMessage() {
  if (!clerkPublishableKey) {
    return "تعذر تحميل المصادقة. أضف NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY في إعدادات البيئة.";
  }

  if (isProductionRuntime && clerkUsesTestKey) {
    return "تم تعطيل المصادقة لأن بيئة الإنتاج تستخدم مفتاح Clerk تجريبي. استخدم مفتاح pk_live_.";
  }

  return "";
}
