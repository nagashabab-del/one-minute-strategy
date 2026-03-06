"use client";

export type FirstRunOnboardingState = {
  version: number;
  completedAt: string;
  skipped: boolean;
};

const FIRST_RUN_ONBOARDING_KEY = "oms_first_run_onboarding_v1";
const FIRST_RUN_ONBOARDING_VERSION = 1;

function isBrowser() {
  return typeof window !== "undefined";
}

function safeParse(raw: string | null): FirstRunOnboardingState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<FirstRunOnboardingState>;
    if (typeof parsed.version !== "number") return null;
    if (typeof parsed.completedAt !== "string") return null;
    if (typeof parsed.skipped !== "boolean") return null;
    return {
      version: parsed.version,
      completedAt: parsed.completedAt,
      skipped: parsed.skipped,
    };
  } catch {
    return null;
  }
}

export function readFirstRunOnboardingState(): FirstRunOnboardingState | null {
  if (!isBrowser()) return null;
  return safeParse(window.localStorage.getItem(FIRST_RUN_ONBOARDING_KEY));
}

export function shouldShowFirstRunOnboarding(): boolean {
  const state = readFirstRunOnboardingState();
  if (!state) return true;
  return state.version < FIRST_RUN_ONBOARDING_VERSION;
}

export function completeFirstRunOnboarding(skipped: boolean) {
  if (!isBrowser()) return;
  const nextState: FirstRunOnboardingState = {
    version: FIRST_RUN_ONBOARDING_VERSION,
    completedAt: new Date().toISOString(),
    skipped,
  };
  window.localStorage.setItem(FIRST_RUN_ONBOARDING_KEY, JSON.stringify(nextState));
}

export function resetFirstRunOnboardingForDebug() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(FIRST_RUN_ONBOARDING_KEY);
}
