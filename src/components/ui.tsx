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
  const cls = size === "lg" ? "text-4xl sm:text-5xl" : size === "sm" ? "text-xs" : "text-lg";
  return (
    <span className={`stamp ${cls} ${animate ? "stamp-in" : ""}`} style={{ color: m.color }}>
      {m.label}
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
