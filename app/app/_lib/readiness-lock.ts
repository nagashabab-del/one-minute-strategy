export const READINESS_LOCK_REASON =
  "الإجراء مغلق مؤقتًا حتى اكتمال الحقول الحرجة في موجز المشروع.";

export const READINESS_STATUS_GAP = "وضع البيانات: فجوة بيانات";
export const READINESS_STATUS_ADVISORY = "وضع البيانات: جاهز للاستشارة";

export const READINESS_STAGE_LOCK_REASON =
  "الإجراء مغلق مؤقتًا حتى اكتمال الحقول الحرجة في موجز المشروع.";

export function resolveQuickStartForReadiness(mode: "gap" | "advisory" | "loading") {
  if (mode === "gap") {
    return {
      href: "/app/strategy/brief",
      label: "استكمال موجز المشروع",
    };
  }

  return {
    href: "/app/strategy",
    label: "بدء تحليل جديد",
  };
}

export function isReadinessBlockedHref(href: string) {
  return !href.startsWith("/app/strategy");
}

