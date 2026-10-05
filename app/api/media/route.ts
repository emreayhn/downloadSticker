// Fallback proxy for when the browser cannot fetch X media directly (CORS refused).
// Only X's own media hosts are allowed, so this cannot be used as an open proxy.
const ALLOWED_HOSTS = new Set(["pbs.twimg.com", "video.twimg.com"]);
const MAX_BYTES = 60 * 1024 * 1024;

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("u") ?? "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("Geçersiz adres", { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return new Response("Bu adrese izin verilmiyor", { status: 403 });
  }

  const upstream = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0" } }).catch(() => null);
  if (!upstream || !upstream.ok || !upstream.body) {
    return new Response("Medya alınamadı", { status: 502 });
  }
  const length = Number(upstream.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return new Response("Dosya çok büyük", { status: 413 });

  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
    "Cache-Control": "public, max-age=86400",
  });
  if (length) headers.set("Content-Length", String(length));
  return new Response(upstream.body, { headers });
}
