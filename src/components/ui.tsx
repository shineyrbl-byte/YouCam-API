"use client";

import { useSyncExternalStore } from "react";
import type { VerdictKind } from "@/lib/types";

export const VERDICT_META: Record<VerdictKind, { label: string; color: string; blurb: string; icon: string }> = {
  acquitted: { label: "Acquitted", color: "var(--acquitted)", blurb: "Stays on the shelf", icon: "✅" },
  guilty: { label: "Guilty", color: "var(--guilty)", blurb: "Off to product jail", icon: "⛓️" },
  continued: { label: "Case continued", color: "var(--continued)", blurb: "Needs more evidence", icon: "⏳" },
};

export function VerdictStamp({ kind, size = "md", animate = false }: { kind: VerdictKind; size?: "sm" | "md" | "lg"; animate?: boolean }) {
  const m = VERDICT_META[kind];
  const cls = size === "lg" ? "text-3xl sm:text-4xl" : size === "sm" ? "text-xs" : "text-lg";
  return (
    <span className={`stamp ${cls} ${animate ? "stamp-in" : ""}`} style={{ color: m.color }}>
      {size === "lg" && kind === "continued" ? "Continued" : m.label}
    </span>
  );
}

const noop = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function daysAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Demo mode shows "time travel" buttons on case pages, for recording demos.
// Toggle it from the footer, or with ?demo=1 / ?demo=0. It is remembered in this browser.
const DEMO_KEY = "pot.demo";
const demoListeners = new Set<() => void>();

function readDemo() {
  const q = new URLSearchParams(window.location.search).get("demo");
  if (q === "1") localStorage.setItem(DEMO_KEY, "1");
  if (q === "0") localStorage.removeItem(DEMO_KEY);
  return localStorage.getItem(DEMO_KEY) === "1";
}

function subscribeDemo(listener: () => void) {
  demoListeners.add(listener);
  return () => demoListeners.delete(listener);
}

export function setDemoMode(on: boolean) {
  if (on) localStorage.setItem(DEMO_KEY, "1");
  else localStorage.removeItem(DEMO_KEY);
  // Drop ?demo=... from the address so it can't override the toggle.
  const url = new URL(window.location.href);
  if (url.searchParams.has("demo")) {
    url.searchParams.delete("demo");
    window.history.replaceState(null, "", url);
  }
  demoListeners.forEach((l) => l());
}

export function useDemoMode() {
  return useSyncExternalStore(subscribeDemo, readDemo, () => false);
}

export function DemoToggle() {
  const on = useDemoMode();
  return (
    <button onClick={() => setDemoMode(!on)} className="underline decoration-dotted underline-offset-2 hover:text-ink">
      {on ? "⏩ Demo mode: on (turn off)" : "Demo mode"}
    </button>
  );
}
