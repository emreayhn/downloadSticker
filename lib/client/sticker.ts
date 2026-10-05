"use client";

import { getFFmpeg } from "./ffmpeg";

// WhatsApp sticker rules
export const SIZE = 512;
export const MAX_ANIMATED_KB = 500;
export const MAX_STATIC_KB = 100;
export const MAX_SECONDS = 10;

export type Crop = { x: number; y: number; size: number }; // in source pixels

export type StickerResult = { blob: Blob; kb: number; note: string };

type Progress = (label: string, ratio?: number) => void;

/* ---------- media download ---------- */

export async function fetchMedia(url: string, onProgress?: (ratio: number) => void): Promise<Blob> {
  const attempt = async (u: string) => {
    const res = await fetch(u, { mode: "cors" });
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
    const total = Number(res.headers.get("content-length") ?? 0);
    const reader = res.body.getReader();
    const chunks: BlobPart[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.byteLength;
      if (total && onProgress) onProgress(got / total);
    }
    return new Blob(chunks, { type: res.headers.get("content-type") ?? "" });
  };
  try {
    return await attempt(url);
  } catch {
    return attempt(`/api/media?u=${encodeURIComponent(url)}`);
  }
}

/* ---------- caption ---------- */

function displayFont() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--display").trim();
  return v || "'Trebuchet MS', sans-serif";
}

export function drawCaption(ctx: CanvasRenderingContext2D, text: string) {
  const t = text.trim();
  if (!t) return;
  const family = displayFont();
  let size = 56;
  ctx.save();
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  ctx.font = `800 ${size}px ${family}`;
  while (ctx.measureText(t).width > SIZE - 44 && size > 20) {
    size -= 2;
    ctx.font = `800 ${size}px ${family}`;
  }
  ctx.lineWidth = size * 0.28;
  ctx.strokeStyle = "#1C1A12";
  ctx.strokeText(t, SIZE / 2, SIZE - 30);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(t, SIZE / 2, SIZE - 30);
  ctx.restore();
}

function captionPng(text: string): Promise<Blob | null> {
  if (!text.trim()) return Promise.resolve(null);
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  drawCaption(c.getContext("2d")!, text);
  return new Promise((r) => c.toBlob(r, "image/png"));
}

/* ---------- static (image) stickers ---------- */

let bgModule: Promise<typeof import("@imgly/background-removal")> | null = null;

// Returns a cut-out version of the image (same aspect, max 1024px) with a transparent background.
export async function removeBackground(source: Blob, onProgress?: Progress): Promise<ImageBitmap> {
  bgModule ??= import("@imgly/background-removal");
  const { removeBackground } = await bgModule;
  const bmp = await createImageBitmap(source);
  const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const small = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/png"));
  const out = await removeBackground(small, {
    model: "isnet_quint8",
    output: { format: "image/png" },
    progress: (key, cur, total) => {
      if (key.startsWith("fetch")) onProgress?.("Arka plan modeli indiriliyor (yalnızca ilk sefer)", total ? cur / total : undefined);
      else onProgress?.("Arka plan siliniyor");
    },
  });
  return createImageBitmap(out);
}

/**
 * Draws the static sticker into ctx (512×512). `art` is the original image or its cut-out;
 * `srcW` is the width of the original so crop coordinates can be mapped onto the cut-out.
 */
export function composeStatic(
  ctx: CanvasRenderingContext2D,
  art: CanvasImageSource & { width: number },
  srcW: number,
  crop: Crop,
  opts: { cutout: boolean; caption: string },
) {
  const k = art.width / srcW;
  const sx = crop.x * k, sy = crop.y * k, ss = crop.size * k;
  ctx.clearRect(0, 0, SIZE, SIZE);
  if (!opts.cutout) {
    ctx.drawImage(art, sx, sy, ss, ss, 0, 0, SIZE, SIZE);
  } else {
    // Leave room for the white die-cut outline WhatsApp stickers usually have.
    const pad = 22, inner = SIZE - pad * 2, r = 9;
    const shape = document.createElement("canvas");
    shape.width = shape.height = SIZE;
    const sc = shape.getContext("2d")!;
    sc.drawImage(art, sx, sy, ss, ss, pad, pad, inner, inner);
    const white = document.createElement("canvas");
    white.width = white.height = SIZE;
    const wc = white.getContext("2d")!;
    wc.drawImage(shape, 0, 0);
    wc.globalCompositeOperation = "source-in";
    wc.fillStyle = "#fff";
    wc.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.drawImage(white, Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.drawImage(shape, 0, 0);
  }
  drawCaption(ctx, opts.caption);
}

async function canvasWebp(c: HTMLCanvasElement, q: number): Promise<Blob | null> {
  const b = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", q));
  return b && b.type === "image/webp" ? b : null; // Safari silently returns PNG
}

export async function encodeStatic(canvas: HTMLCanvasElement, onProgress?: Progress): Promise<StickerResult> {
  onProgress?.("Sticker hazırlanıyor");
  for (const q of [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]) {
    const b = await canvasWebp(canvas, q);
    if (!b) break;
    if (b.size <= MAX_STATIC_KB * 1024) return { blob: b, kb: Math.ceil(b.size / 1024), note: "Statik WebP · 512×512" };
  }
  // Browser can't encode WebP (Safari) or file is still too big: use ffmpeg.
  onProgress?.("Dönüştürücü yükleniyor");
  const ff = await getFFmpeg();
  const png = await new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/png"));
  await ff.writeFile("in.png", new Uint8Array(await png.arrayBuffer()));
  let last: Uint8Array | null = null;
  for (const q of [85, 70, 55, 40, 25]) {
    await ff.exec(["-y", "-i", "in.png", "-c:v", "libwebp", "-lossless", "0", "-quality", String(q), "out.webp"]);
    last = (await ff.readFile("out.webp")) as Uint8Array;
    if (last.byteLength <= MAX_STATIC_KB * 1024) break;
  }
  await ff.deleteFile("in.png").catch(() => {});
  const blob = new Blob([last as BlobPart], { type: "image/webp" });
  return { blob, kb: Math.ceil(blob.size / 1024), note: "Statik WebP · 512×512" };
}

/* ---------- animated (video) stickers ---------- */

// `rel` is the rough output size relative to the first attempt, used to jump straight
// to a setting that fits instead of re-encoding the whole clip step by step.
// Quality drops before frame rate, so motion stays smooth as long as possible.
const ATTEMPTS = [
  { fps: 15, q: 70, rel: 1 },
  { fps: 15, q: 50, rel: 0.72 },
  { fps: 15, q: 35, rel: 0.55 },
  { fps: 12, q: 30, rel: 0.4 },
  { fps: 10, q: 25, rel: 0.31 },
  { fps: 8, q: 20, rel: 0.23 },
  { fps: 6, q: 15, rel: 0.15 },
];

export function estimateAnimatedKb(seconds: number) {
  return Math.round(seconds * 90);
}

export async function makeAnimated(
  video: Blob,
  o: { start: number; length: number; crop: Crop; caption: string },
  onProgress?: Progress,
): Promise<StickerResult> {
  onProgress?.("Dönüştürücü yükleniyor (ilk sefer ~30 MB)");
  const ff = await getFFmpeg();
  await ff.writeFile("in.mp4", new Uint8Array(await video.arrayBuffer()));
  const cap = await captionPng(o.caption);
  if (cap) await ff.writeFile("cap.png", new Uint8Array(await cap.arrayBuffer()));

  const { x, y, size } = o.crop;
  const cropF = `crop=${Math.floor(size)}:${Math.floor(size)}:${Math.floor(x)}:${Math.floor(y)}`;
  let pass = 0;
  const onFF = ({ progress }: { progress: number }) =>
    onProgress?.(pass === 0 ? "Sticker hazırlanıyor" : "WhatsApp sınırına sığdırılıyor", Math.max(0, Math.min(1, progress)));
  ff.on("progress", onFF);

  try {
    const limit = MAX_ANIMATED_KB * 1024;
    let out: Uint8Array | null = null, used = ATTEMPTS[0], firstSize = 0, i = 0;
    while (i < ATTEMPTS.length) {
      const a = (used = ATTEMPTS[i]);
      const chain = `[0:v]fps=${a.fps},${cropF},scale=${SIZE}:${SIZE}:flags=bilinear${cap ? "[v];[v][1:v]overlay=0:0" : ""}`;
      await ff.exec([
        "-y", "-ss", o.start.toFixed(2), "-t", o.length.toFixed(2), "-i", "in.mp4",
        ...(cap ? ["-i", "cap.png"] : []),
        "-filter_complex", chain,
        "-an", "-c:v", "libwebp", "-lossless", "0", "-quality", String(a.q),
        "-compression_level", "4", "-loop", "0", "out.webp",
      ]);
      out = (await ff.readFile("out.webp")) as Uint8Array;
      if (out.byteLength <= limit) break;
      if (!firstSize) firstSize = out.byteLength / a.rel;
      // Jump to the first setting predicted to fit, with a 10% safety margin.
      const need = (limit * 0.9) / firstSize;
      let next = ATTEMPTS.findIndex((x, j) => j > i && x.rel <= need);
      if (next === -1) next = i + 1;
      i = next;
      pass++;
    }
    if (!out || out.byteLength === 0) throw new Error("Dönüştürme başarısız oldu.");
    if (out.byteLength > MAX_ANIMATED_KB * 1024) {
      throw new Error("Bu bölüm WhatsApp'ın 500 KB sınırına sığmadı. Daha kısa bir süre seç.");
    }
    const blob = new Blob([out as BlobPart], { type: "image/webp" });
    const slowed = used.fps < 15 ? " (sığması için kare hızı düşürüldü)" : "";
    return { blob, kb: Math.ceil(blob.size / 1024), note: `Hareketli WebP · 512×512 · ${used.fps} fps${slowed}` };
  } finally {
    ff.off("progress", onFF);
    await ff.deleteFile("in.mp4").catch(() => {});
    if (cap) await ff.deleteFile("cap.png").catch(() => {});
  }
}
