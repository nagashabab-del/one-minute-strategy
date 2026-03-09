import { isReadinessBlockedHref, READINESS_LOCK_REASON } from "./readiness-lock";

export const READINESS_FALLBACK_HREF = "/app/strategy/brief";

export function isReadinessActionBlocked(inGapMode: boolean, href: string) {
  return inGapMode && isReadinessBlockedHref(href);
}

export function resolveReadinessNavigationHref(inGapMode: boolean, href: string) {
  return inGapMode ? READINESS_FALLBACK_HREF : href;
}

export function resolveReadinessBlockedHint(inGapMode: boolean) {
  return inGapMode ? READINESS_LOCK_REASON : undefined;
}
