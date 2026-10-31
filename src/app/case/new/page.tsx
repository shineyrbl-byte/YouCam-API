"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES, CONCERN_INFO } from "@/lib/claims";
import { newId, saveCase } from "@/lib/store";
import { CONCERNS, type Concern } from "@/lib/types";

export default function NewCase() {
  const router = useRouter();
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("Serum");
  const [price, setPrice] = useState("");
  const [claims, setClaims] = useState<Concern[]>([]);

  const ready = productName.trim().length > 1 && claims.length > 0;

  function file() {
    const id = newId();
    saveCase({
      id,
      productName: productName.trim(),
      brand: brand.trim() || undefined,
      category,
      price: price ? Number(price) : undefined,
      claims,
      startedAt: new Date().toISOString(),
      evidence: [],
    });
    router.push(`/case/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mahogany">New case</p>
      <h1 className="mt-1 font-serif text-4xl font-black">Who&apos;s the defendant?</h1>
      <p className="mt-2 text-ink-2">Tell the court which product is on trial and what it promises. Those promises are what it gets judged on.</p>

      <div className="card mt-8 space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-semibold">Product name</span>
            <input className="input" placeholder="e.g. Niacinamide 10% Serum" value={productName} onChange={(e) => setProductName(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Brand <span className="font-normal text-muted">(optional)</span></span>
            <input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Price <span className="font-normal text-muted">(optional, $)</span></span>
            <input className="input" type="number" min="0" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
        </div>

        <div>
          <span className="mb-2 block text-sm font-semibold">Type</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat} className="chip" aria-pressed={category === cat} onClick={() => setCategory(cat)}>{cat}</button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1 block text-sm font-semibold">What does it claim to do?</span>
          <p className="mb-3 text-sm text-ink-2">Pick everything on the label. The court tracks all 8 concerns anyway to catch side effects.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CONCERNS.map((k) => {
              const on = claims.includes(k);
              return (
                <button
                  key={k}
                  aria-pressed={on}
                  onClick={() => setClaims((cur) => (on ? cur.filter((x) => x !== k) : [...cur, k]))}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${on ? "border-ink bg-ink text-paper-2" : "border-line bg-paper-2 hover:bg-paper"}`}
                >
                  <span className="text-xl">{CONCERN_INFO[k].emoji}</span>
                  <span>
                    <span className="block font-semibold">{CONCERN_INFO[k].claim}</span>
                    <span className={`block text-xs ${on ? "text-paper/70" : "text-muted"}`}>Fair verdict after ~{CONCERN_INFO[k].expectedDays} days</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={file} disabled={!ready} className="btn btn-primary w-full text-base">
          📁 File the case &amp; take baseline scan
        </button>
      </div>
    </div>
  );
}
