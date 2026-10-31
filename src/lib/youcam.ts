import "server-only";
import { CONCERNS, type Concern, type Scores } from "./types";

// YouCam AI API (Perfect Corp), V2 structure. Docs: https://docs.perfectcorp.com/
const BASE_URL = process.env.YOUCAM_API_BASE ?? "https://yce-api-01.makeupar.com";

export class YouCamError extends Error {
  constructor(message: string, public code?: string, public status?: number) {
    super(message);
  }
}

// Friendly text for the engine errors a user can actually fix.
const FRIENDLY: Record<string, string> = {
  error_below_min_image_size: "Photo is too small. Use at least 480px on the short side.",
  error_src_face_too_small: "Your face is too small in the frame. Move closer.",
  error_src_face_out_of_bound: "Your face is partly out of frame. Center it.",
  error_lighting_dark: "Too dark. Face a window or a lamp and try again.",
  error_no_face: "No face found. Look straight at the camera.",
  exceed_max_filesize: "Photo is over 10MB.",
  CreditInsufficiency: "The YouCam account is out of API units.",
  InvalidApiKey: "The YouCam API key is invalid.",
  InvalidAccessToken: "The YouCam API key is invalid.",
};

export function friendlyError(code?: string, fallback = "Skin scan failed.") {
  return (code && FRIENDLY[code]) || fallback;
}

export function hasYouCamKey() {
  return Boolean(process.env.YOUCAM_API_KEY);
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.YOUCAM_API_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || (body.status && body.status !== 200)) {
    const code = body.error_code ?? body.error;
    throw new YouCamError(friendlyError(code, `YouCam API error (${res.status})`), code, res.status);
  }
  return body.data as T;
}

interface FileResponse {
  files: {
    file_id: string;
    requests: { method: string; url: string; headers: Record<string, string> }[];
  }[];
}

// Step 1: register the file. Step 2: PUT the bytes to the signed URL we get back.
export async function uploadImage(bytes: Uint8Array, contentType: string, fileName: string) {
  const data = await call<FileResponse>("/s2s/v2.0/file", {
    method: "POST",
    body: JSON.stringify({
      files: [{ content_type: contentType, file_name: fileName, file_size: bytes.byteLength }],
    }),
  });
  const file = data.files[0];
  const upload = file.requests[0];
  const put = await fetch(upload.url, {
    method: upload.method ?? "PUT",
    headers: upload.headers,
    body: Buffer.from(bytes),
  });
  if (!put.ok) throw new YouCamError(`Image upload failed (${put.status})`, "error_upload");
  return file.file_id;
}

// SD actions: 480px minimum, 8 concerns = 12 units per scan.
const ACTIONS: Record<Concern, string> = {
  acne: "acne",
  redness: "redness",
  oiliness: "oiliness",
  pore: "pore",
  texture: "texture",
  moisture: "moisture",
  radiance: "radiance",
  wrinkle: "wrinkle",
};

interface SkinOutput {
  type: string;
  ui_score: number;
  raw_score?: number;
  mask_urls?: string[];
}

interface TaskResult {
  task_status: "running" | "success" | "error" | string;
  error?: string;
  error_message?: string;
  results?: { output?: SkinOutput[] } | SkinOutput[];
}

const SKIN_PATH = "/s2s/v2.1/task/skin-analysis";

export async function startSkinAnalysis(fileId: string) {
  const data = await call<{ task_id: string }>(SKIN_PATH, {
    method: "POST",
    body: JSON.stringify({
      src_file_id: fileId,
      dst_actions: CONCERNS.map((c) => ACTIONS[c]),
      miniserver_args: { enable_mask_overlay: true },
      format: "json",
    }),
  });
  return data.task_id;
}

export async function getSkinAnalysis(taskId: string) {
  return call<TaskResult>(`${SKIN_PATH}/${encodeURIComponent(taskId)}`);
}

export function parseSkinResult(result: TaskResult) {
  const output = Array.isArray(result.results) ? result.results : result.results?.output ?? [];
  const byType = new Map(output.map((o) => [o.type, o]));
  const scores = {} as Scores;
  const maskUrls: Partial<Record<Concern, string>> = {};
  for (const c of CONCERNS) {
    // Some versions suffix names (e.g. dark_circle_v2); match on prefix as a fallback.
    const hit = byType.get(ACTIONS[c]) ?? output.find((o) => o.type.startsWith(ACTIONS[c]));
    if (!hit) throw new YouCamError(`Scan result is missing "${c}".`, "missing_concern");
    scores[c] = Math.round(hit.ui_score);
    if (hit.mask_urls?.[0]) maskUrls[c] = hit.mask_urls[0];
  }
  return { scores, maskUrls };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Polls until done. Skin analysis usually finishes in a few seconds.
export async function analyzeSkin(bytes: Uint8Array, contentType: string) {
  const fileId = await uploadImage(bytes, contentType, `evidence-${Date.now()}.jpg`);
  const taskId = await startSkinAnalysis(fileId);
  const deadline = Date.now() + 90_000;
  let wait = 1500;
  while (Date.now() < deadline) {
    await sleep(wait);
    const result = await getSkinAnalysis(taskId);
    if (result.task_status === "success") return parseSkinResult(result);
    if (result.task_status === "error") {
      throw new YouCamError(friendlyError(result.error, result.error_message), result.error);
    }
    wait = Math.min(wait * 1.5, 5000);
  }
  throw new YouCamError("Skin scan timed out. Try again.", "timeout");
}
