"use client";

import { useEffect, useRef, useState } from "react";
import { prepareImage } from "@/lib/image";
import { newId } from "@/lib/store";
import { CONFOUNDERS, type Case, type Confounder, type Evidence } from "@/lib/types";

type Step = "capture" | "statement" | "scanning" | "error";

export function EvidenceCapture({ c, onClose, onAdded }: { c: Case; onClose: () => void; onAdded: (e: Evidence) => void }) {
  const isBaseline = c.evidence.length === 0;
  const [step, setStep] = useState<Step>("capture");
  const [photo, setPhoto] = useState<{ upload: Blob; thumbnail: string } | null>(null);
  const [confounders, setConfounders] = useState<Confounder[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [camOn, setCamOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1600 }, height: { ideal: 1200 } },
        audio: false,
      });
      streamRef.current = stream;
      setCamOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setError("Camera unavailable. Upload a photo instead.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  }

  async function snap() {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")!.drawImage(v, 0, 0);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.95));
    stopCamera();
    if (blob) await accept(blob);
  }

  async function accept(file: Blob) {
    setError("");
    try {
      const p = await prepareImage(file);
      if (p.shortSide < 480) {
        setError("That photo is too small. The scanner needs at least 480px on the short side.");
        return;
      }
      setPhoto(p);
      setStep(isBaseline ? "scanning" : "statement");
      if (isBaseline) await submit(p);
    } catch {
      setError("Couldn't read that photo. Try a JPG or PNG.");
    }
  }

  async function submit(p = photo) {
    if (!p) return;
    setStep("scanning");
    const form = new FormData();
    form.append("image", p.upload, "evidence.jpg");
    form.append("claims", JSON.stringify(c.claims));
    const prev = c.evidence.at(-1);
    if (prev) form.append("previous", JSON.stringify(prev.scores));
    try {
      const res = await fetch("/api/scan", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      onAdded({
        id: newId(),
        takenAt: new Date().toISOString(),
        scores: data.scores,
        maskUrls: data.maskUrls,
        source: data.source,
        thumbnail: p.thumbnail,
        confounders,
        note: note.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
      setStep("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="card fade-up w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="font-serif text-lg font-bold">{isBaseline ? "Exhibit A: Baseline scan" : `Exhibit ${String.fromCharCode(65 + c.evidence.length)}: Check-in scan`}</p>
          {step !== "scanning" && <button onClick={() => { stopCamera(); onClose(); }} className="text-2xl leading-none text-muted" aria-label="Close">×</button>}
        </div>

        {step === "capture" && (
          <div className="space-y-4 p-5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink">
              {camOn ? (
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
              ) : (
                <MugshotBackdrop />
              )}
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[78%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-white/70" />
            </div>
            <ul className="grid grid-cols-3 gap-2 text-center text-xs text-ink-2">
              <li className="rounded-xl bg-paper p-2">🪟 Face a window</li>
              <li className="rounded-xl bg-paper p-2">🧼 Bare skin, no makeup</li>
              <li className="rounded-xl bg-paper p-2">📍 Same spot every time</li>
            </ul>
            {error && <p className="text-sm text-guilty">{error}</p>}
            <div className="flex gap-2">
              {camOn ? (
                <button onClick={snap} className="btn btn-primary flex-1">📸 Take mugshot</button>
              ) : (
                <button onClick={startCamera} className="btn btn-primary flex-1">📷 Use camera</button>
              )}
              <label className="btn btn-ghost flex-1 cursor-pointer">
                ⬆️ Upload photo
                <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => e.target.files?.[0] && accept(e.target.files[0])} />
              </label>
            </div>
          </div>
        )}

        {step === "statement" && photo && (
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumbnail} alt="Your check-in photo" className="h-20 w-20 rounded-xl object-cover" />
              <div>
                <p className="font-semibold">Witness statement</p>
                <p className="text-sm text-ink-2">Did anything else change since your last scan? The judge weighs this so the product isn&apos;t blamed (or credited) unfairly.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {CONFOUNDERS.map((cf) => (
                <button
                  key={cf}
                  className="chip"
                  aria-pressed={confounders.includes(cf)}
                  onClick={() => setConfounders((cur) => (cur.includes(cf) ? cur.filter((x) => x !== cf) : [...cur, cf]))}
                >
                  {cf}
                </button>
              ))}
            </div>
            <textarea className="input" rows={2} placeholder="Anything else for the record? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <button onClick={() => submit()} className="btn btn-primary w-full">Submit evidence to the lab</button>
          </div>
        )}

        {step === "scanning" && (
          <div className="space-y-4 p-5 text-center">
            <div className="relative mx-auto aspect-square w-56 overflow-hidden rounded-2xl bg-ink">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {photo && <img src={photo.thumbnail} alt="" className="h-full w-full object-cover opacity-80" />}
              <div className="scan-line" />
            </div>
            <p className="font-semibold">The forensic lab is examining the evidence…</p>
            <p className="text-sm text-ink-2">YouCam Skin AI is scoring acne, redness, oiliness, pores, texture, moisture, radiance and fine lines.</p>
          </div>
        )}

        {step === "error" && (
          <div className="space-y-4 p-5 text-center">
            <p className="text-4xl">🙅</p>
            <p className="font-semibold">Evidence rejected</p>
            <p className="text-sm text-guilty">{error}</p>
            <button onClick={() => { setPhoto(null); setStep("capture"); }} className="btn btn-primary">Retake photo</button>
          </div>
        )}
      </div>
    </div>
  );
}

function MugshotBackdrop() {
  return (
    <div className="flex h-full w-full flex-col justify-between bg-[#2b2622] py-3">
      {[7, 6, 5, 4].map((ft) => (
        <div key={ft} className="flex items-center gap-2 px-3 text-[10px] text-white/40">
          <span className="w-6">{ft}&apos;</span>
          <span className="h-px flex-1 bg-white/20" />
        </div>
      ))}
    </div>
  );
}
