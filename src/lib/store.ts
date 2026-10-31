"use client";

import { useSyncExternalStore } from "react";
import { sampleCases } from "./demo";
import type { Case } from "./types";

// Cases live in localStorage: skin photos never leave the device except for the scan itself.
const KEY = "pot.cases.v1";
const listeners = new Set<() => void>();
let cache: Case[] | null = null;

function read(): Case[] {
  if (cache) return cache;
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY);
  if (raw === null) {
    cache = sampleCases();
    write(cache);
  } else {
    try {
      cache = JSON.parse(raw) as Case[];
    } catch {
      cache = [];
    }
  }
  return cache;
}

function write(cases: Case[]) {
  cache = cases;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cases));
  } catch {
    // Storage full: drop the oldest thumbnails and retry once.
    const slim = cases.map((c) => ({
      ...c,
      evidence: c.evidence.map((e, i) => (i < c.evidence.length - 3 ? { ...e, thumbnail: undefined } : e)),
    }));
    window.localStorage.setItem(KEY, JSON.stringify(slim));
    cache = slim;
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: Case[] = [];

export function useCases() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useCase(id: string) {
  return useCases().find((c) => c.id === id);
}

export function saveCase(next: Case) {
  const cases = read();
  const exists = cases.some((c) => c.id === next.id);
  write(exists ? cases.map((c) => (c.id === next.id ? next : c)) : [next, ...cases]);
}

export function deleteCase(id: string) {
  write(read().filter((c) => c.id !== id));
}

export function restoreSamples() {
  const mine = read().filter((c) => !c.isSample);
  write([...mine, ...sampleCases()]);
}

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}
