// Server-side: turns an X/Twitter link into a list of downloadable media.

export type MediaKind = "image" | "video" | "gif";

export type MediaItem = {
  kind: MediaKind;
  url: string; // full-size image or mp4
  thumb: string;
  width: number;
  height: number;
  duration?: number; // seconds, videos only
};

export type TweetMedia = {
  id: string;
  author: string;
  text: string;
  media: MediaItem[];
};

export class TweetError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const LINK_RE =
  /(?:twitter\.com|x\.com|fxtwitter\.com|vxtwitter\.com|fixupx\.com|fixvx\.com)\/(?:i\/web\/|i\/|[^/?#]+\/)status(?:es)?\/(\d{5,25})/i;

export function parseTweetId(input: string): string | null {
  const s = input.trim();
  const m = s.match(LINK_RE) ?? s.match(/^(\d{5,25})$/);
  return m ? m[1] : null;
}

// Same token the official embed widget computes.
function syndicationToken(id: string) {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

type Variant = { url: string; bitrate?: number; content_type?: string };

function resolutionOf(url: string) {
  const m = url.match(/\/(\d{2,4})x(\d{2,4})\//);
  return m ? { w: +m[1], h: +m[2] } : null;
}

// Stickers are 512px, so take the smallest mp4 that still has >= 480px on its short side.
function pickMp4(variants: Variant[]): string | null {
  const mp4 = variants
    .filter((v) => (v.content_type ?? "video/mp4") === "video/mp4" && v.url.includes(".mp4"))
    .sort((a, b) => (a.bitrate ?? 0) - (b.bitrate ?? 0));
  if (!mp4.length) return null;
  const good = mp4.find((v) => {
    const r = resolutionOf(v.url);
    return r && Math.min(r.w, r.h) >= 480;
  });
  return (good ?? mp4[mp4.length - 1]).url;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function fromSyndicationMedia(list: any[] | undefined): MediaItem[] {
  if (!Array.isArray(list)) return [];
  const out: MediaItem[] = [];
  for (const m of list) {
    const base: string = m.media_url_https;
    const width = m.original_info?.width ?? 0;
    const height = m.original_info?.height ?? 0;
    if (m.type === "photo") {
      out.push({ kind: "image", url: `${base}?name=large`, thumb: `${base}?name=small`, width, height });
    } else if (m.type === "video" || m.type === "animated_gif") {
      const url = pickMp4(m.video_info?.variants ?? []);
      if (!url) continue;
      out.push({
        kind: m.type === "video" ? "video" : "gif",
        url,
        thumb: base,
        width,
        height,
        duration: m.video_info?.duration_millis ? m.video_info.duration_millis / 1000 : undefined,
      });
    }
  }
  return out;
}

async function viaSyndication(id: string): Promise<TweetMedia | null> {
  const res = await fetch(
    `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${syndicationToken(id)}&lang=tr`,
    { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" },
  );
  if (!res.ok) return null;
  const j: any = await res.json().catch(() => null);
  if (!j || j.__typename === "TweetTombstone" || j.tombstone || !j.id_str) return null;
  const media = [...fromSyndicationMedia(j.mediaDetails), ...fromSyndicationMedia(j.quoted_tweet?.mediaDetails)];
  return { id, author: j.user?.screen_name ?? "", text: j.text ?? "", media };
}

// Fallback for tweets the embed endpoint refuses (some sensitive or restricted posts).
async function viaFxTwitter(id: string): Promise<TweetMedia | null> {
  const res = await fetch(`https://api.fxtwitter.com/status/${id}`, {
    headers: { "User-Agent": "yapistir-sticker/1.0" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const j: any = await res.json().catch(() => null);
  const t = j?.tweet;
  if (!t) return null;
  const all: any[] = [...(t.media?.all ?? []), ...(t.quote?.media?.all ?? [])];
  const media: MediaItem[] = [];
  for (const m of all) {
    if (m.type === "photo") {
      media.push({ kind: "image", url: m.url, thumb: m.url, width: m.width ?? 0, height: m.height ?? 0 });
    } else if (m.type === "video" || m.type === "gif") {
      const url = (m.variants && pickMp4(m.variants)) || m.url;
      if (!url) continue;
      media.push({
        kind: m.type === "video" ? "video" : "gif",
        url,
        thumb: m.thumbnail_url ?? "",
        width: m.width ?? 0,
        height: m.height ?? 0,
        duration: m.duration ?? undefined,
      });
    }
  }
  return { id, author: t.author?.screen_name ?? "", text: t.text ?? "", media };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function resolveTweet(input: string): Promise<TweetMedia> {
  const id = parseTweetId(input);
  if (!id) throw new TweetError('Bu bir X gönderi linki gibi durmuyor. Link "x.com/kullanici/status/123…" şeklinde olmalı.', 400);

  let result = await viaSyndication(id).catch(() => null);
  if (!result || result.media.length === 0) {
    const fx = await viaFxTwitter(id).catch(() => null);
    if (fx && (fx.media.length > 0 || !result)) result = fx;
  }
  if (!result) throw new TweetError("Gönderi bulunamadı. Silinmiş, gizli ya da korumalı bir hesaba ait olabilir.", 404);
  if (result.media.length === 0) throw new TweetError("Bu gönderide resim ya da video yok.", 422);
  return result;
}
