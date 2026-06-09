import crypto from "node:crypto";

export type DeviceInfo = {
  userAgent: string;
  browser: string;
  os: string;
  deviceLabel: string;
  deviceHash: string;
  ip: string;
  country: string;
};

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "0.0.0.0";
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "0.0.0.0";
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  if (/Opera|OPR\//i.test(ua)) return "Opera";
  return "Unknown browser";
}

function detectOs(ua: string): string {
  if (/Windows NT/i.test(ua)) return "Windows";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown OS";
}

export function parseDeviceInfo(req: Request, userAgentHeader?: string | null): Omit<DeviceInfo, "country" | "ip"> {
  const userAgent = userAgentHeader?.trim() || req.headers.get("user-agent")?.trim() || "Unknown";
  const browser = detectBrowser(userAgent);
  const os = detectOs(userAgent);
  const deviceLabel = `${browser} on ${os}`;
  const deviceHash = crypto.createHash("sha256").update(userAgent).digest("hex");
  return { userAgent, browser, os, deviceLabel, deviceHash };
}

export async function lookupCountry(ip: string): Promise<string> {
  if (!ip || ip === "0.0.0.0" || ip === "127.0.0.1" || ip.startsWith("::1") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return "Local network";
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return "Unknown";
    const data = (await res.json()) as { status?: string; country?: string };
    if (data.status === "success" && data.country) return data.country;
    return "Unknown";
  } catch {
    return "Unknown";
  }
}

export async function resolveDeviceInfo(req: Request, userAgentHeader?: string | null): Promise<DeviceInfo> {
  const ip = getClientIp(req);
  const base = parseDeviceInfo(req, userAgentHeader);
  const country = await lookupCountry(ip);
  return { ...base, ip, country };
}
