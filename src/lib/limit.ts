import "server-only";

// Protects the YouCam unit balance on a public deployment. Counters live in memory,
// so on serverless they are per instance and reset on cold starts: a soft cap, not billing-grade.
const PER_IP = Number(process.env.SCANS_PER_IP_PER_DAY ?? 8);
const GLOBAL = Number(process.env.SCANS_PER_DAY ?? 40);

let day = "";
let total = 0;
const byIp = new Map<string, number>();

function rollover() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    total = 0;
    byIp.clear();
  }
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

/** Reserves one real scan. Returns false when this visitor or the whole app is over today's limit. */
export function takeScan(ip: string) {
  rollover();
  const used = byIp.get(ip) ?? 0;
  if (used >= PER_IP || total >= GLOBAL) return false;
  byIp.set(ip, used + 1);
  total += 1;
  return true;
}

/** Gives the scan back when YouCam rejected the photo (no units are charged for failed tasks). */
export function refundScan(ip: string) {
  byIp.set(ip, Math.max(0, (byIp.get(ip) ?? 1) - 1));
  total = Math.max(0, total - 1);
}
