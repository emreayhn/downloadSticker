"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MediaItem, TweetMedia } from "@/lib/tweet";
import { parseTweetId } from "@/lib/tweet";
import {
  composeStatic,
  drawCaption,
  encodeStatic,
  estimateAnimatedKb,
  fetchMedia,
  makeAnimated,
  removeBackground,
  MAX_ANIMATED_KB,
  MAX_SECONDS,
  MAX_STATIC_KB,
  SIZE,
  type Crop,
  type StickerResult,
} from "@/lib/client/sticker";
import { downloadBlob, shareToWhatsApp } from "@/lib/client/share";

type Source = {
  item: MediaItem;
  blob: Blob;
  url: string;
  w: number;
  h: number;
  duration: number;
  bitmap?: ImageBitmap; // images only
};

type Busy = { label: string; ratio?: number };
type Made = { key: string; res: StickerResult; url: string; name: string };

const LENGTHS = [2, 3, 5, 8];

const isVideo = (s: Source | null) => !!s && s.item.kind !== "image";
const fmt = (n: number) => n.toFixed(1).replace(".", ",");

function centerCrop(w: number, h: number): Crop {
  const size = Math.min(w, h);
  // Portrait media usually has the subject in the upper part.
  return { size, x: (w - size) / 2, y: h > w ? Math.min((h - size) / 2, h * 0.12) : (h - size) / 2 };
}

function loadVideoMeta(url: string): Promise<{ w: number; h: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => resolve({ w: v.videoWidth, h: v.videoHeight, duration: v.duration });
    v.onerror = () => reject(new Error("Video açılamadı."));
    v.src = url;
  });
}

export default function StickerApp() {
  const [link, setLink] = useState("");
  const [phase, setPhase] = useState<"idle" | "resolving" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const [tweet, setTweet] = useState<TweetMedia | null>(null);
  const [sel, setSel] = useState(0);
  const [src, setSrc] = useState<Source | null>(null);
  const [srcProgress, setSrcProgress] = useState<number | null>(null);
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, size: 1 });
  const [start, setStart] = useState(0);
  const [len, setLen] = useState(3);
  const [cutout, setCutout] = useState(true);
  const [cutoutBmp, setCutoutBmp] = useState<ImageBitmap | null>(null);
  const [cutoutBusy, setCutoutBusy] = useState<Busy | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState<Busy | null>(null);
  const [made, setMade] = useState<Made | null>(null);
  const [sheet, setSheet] = useState<null | "downloaded" | "ready">(null);
  const [toast, setToast] = useState("");

  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const stripCanvas = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const waRef = useRef<HTMLButtonElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const loadToken = useRef(0);
  const cutoutWanted = useRef(true);

  const say = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5000);
  }, []);

  /* ---------- loading a tweet and its media ---------- */

  // Background removal runs once per image, the first time it is needed.
  const startCutout = useCallback((s: Source) => {
    const token = loadToken.current;
    const alive = () => token === loadToken.current;
    setCutoutBusy({ label: "Arka plan siliniyor" });
    removeBackground(s.blob, (label, ratio) => alive() && setCutoutBusy({ label, ratio }))
      .then((bmp) => alive() && setCutoutBmp(bmp))
      .catch(() => {
        if (!alive()) return;
        setCutout(false);
        say("Arka plan silinemedi. Resmi olduğu gibi kullanabilirsin.");
      })
      .finally(() => alive() && setCutoutBusy(null));
  }, [say]);

  const selectMedia = useCallback(async (t: TweetMedia, i: number) => {
    const token = ++loadToken.current;
    const item = t.media[i];
    setSel(i);
    setSrc((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return null;
    });
    setCutoutBmp(null);
    setMade(null);
    setSrcProgress(0);
    try {
      const blob = await fetchMedia(item.url, (p) => token === loadToken.current && setSrcProgress(p));
      if (token !== loadToken.current) return;
      const url = URL.createObjectURL(blob);
      let next: Source;
      if (item.kind === "image") {
        const bitmap = await createImageBitmap(blob);
        next = { item, blob, url, w: bitmap.width, h: bitmap.height, duration: 0, bitmap };
      } else {
        const m = await loadVideoMeta(url);
        next = { item, blob, url, ...m };
        setStart(0);
        setLen(Math.min(3, m.duration));
      }
      if (token !== loadToken.current) return URL.revokeObjectURL(url);
      setCrop(centerCrop(next.w, next.h));
      setSrc(next);
      if (next.item.kind === "image" && cutoutWanted.current) startCutout(next);
    } catch {
      if (token === loadToken.current) say("Medya indirilemedi. Bağlantını kontrol edip tekrar dene.");
    } finally {
      if (token === loadToken.current) setSrcProgress(null);
    }
  }, [say, startCutout]);

  const resolve = useCallback(async (value: string) => {
    if (!parseTweetId(value)) {
      setPhase("error");
      setError('Bu bir X gönderi linki gibi durmuyor. Link "x.com/kullanici/status/123…" şeklinde olmalı.');
      return;
    }
    setPhase("resolving");
    setError("");
    try {
      const res = await fetch(`/api/resolve?url=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gönderi okunamadı.");
      setTweet(data);
      setPhase("ready");
      setCaption("");
      selectMedia(data, 0);
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Gönderi okunamadı.");
    }
  }, [selectMedia]);

  // Supports /?url=… (and ?text=… from a share target) so links can open the site pre-filled.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const incoming = q.get("url") || q.get("text") || "";
    if (!incoming || !parseTweetId(incoming)) return;
    const t = setTimeout(() => {
      setLink(incoming);
      resolve(incoming);
    });
    return () => clearTimeout(t);
  }, [resolve]);

  /* ---------- crop + trim interaction ---------- */

  const drag = (onMove: (dx: number, dy: number) => void) => (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    let lx = e.clientX, ly = e.clientY;
    const move = (ev: PointerEvent) => {
      onMove(ev.clientX - lx, ev.clientY - ly);
      lx = ev.clientX;
      ly = ev.clientY;
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  const moveCrop = (dx: number, dy: number) => {
    if (!src || !stageRef.current) return;
    const k = src.w / stageRef.current.clientWidth;
    setCrop((c) => ({
      ...c,
      x: Math.max(0, Math.min(src.w - c.size, c.x + dx * k)),
      y: Math.max(0, Math.min(src.h - c.size, c.y + dy * k)),
    }));
  };

  const moveWindow = (dx: number) => {
    if (!src || !stripRef.current) return;
    const k = src.duration / stripRef.current.clientWidth;
    setStart((s) => Math.max(0, Math.min(src.duration - len, s + dx * k)));
  };

  const lengths = useMemo(() => {
    if (!src || !isVideo(src)) return [];
    const max = Math.min(src.duration, MAX_SECONDS);
    const l = LENGTHS.filter((n) => n <= max + 0.05);
    return l.length ? l : [Math.round(max * 10) / 10];
  }, [src]);

  // Thumbnail strip for the trim timeline.
  useEffect(() => {
    if (!src || !isVideo(src) || !stripCanvas.current) return;
    let cancelled = false;
    const c = stripCanvas.current, ctx = c.getContext("2d")!;
    const v = document.createElement("video");
    v.muted = true;
    v.preload = "auto";
    v.src = src.url;
    const n = 10, fw = c.width / n;
    (async () => {
      await new Promise((r) => (v.onloadeddata = r));
      for (let i = 0; i < n && !cancelled; i++) {
        v.currentTime = ((i + 0.5) * src.duration) / n;
        await new Promise((r) => (v.onseeked = r));
        const s = Math.min(v.videoWidth, v.videoHeight);
        ctx.drawImage(v, (v.videoWidth - s) / 2, (v.videoHeight - s) / 2, s, s, i * fw, 0, fw, c.height);
      }
    })();
    return () => {
      cancelled = true;
      v.removeAttribute("src");
    };
  }, [src]);

  // Live preview: video plays inside the chosen window; images re-render on change.
  useEffect(() => {
    const canvas = previewRef.current;
    if (!src || !canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!isVideo(src)) {
      const useCut = cutout && !!cutoutBmp;
      composeStatic(ctx, useCut ? cutoutBmp! : src.bitmap!, src.w, crop, { cutout: useCut, caption });
      return;
    }
    const v = videoRef.current!;
    let raf = 0;
    const tick = () => {
      if (v.currentTime < start - 0.05 || v.currentTime >= start + len) v.currentTime = start;
      if (v.readyState >= 2) {
        ctx.clearRect(0, 0, SIZE, SIZE);
        ctx.drawImage(v, crop.x, crop.y, crop.size, crop.size, 0, 0, SIZE, SIZE);
        drawCaption(ctx, caption);
      }
      if (playheadRef.current) playheadRef.current.style.left = `${Math.max(0, Math.min(100, ((v.currentTime - start) / len) * 100))}%`;
      raf = requestAnimationFrame(tick);
    };
    v.play().catch(() => {});
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [src, crop, start, len, caption, cutout, cutoutBmp]);


  /* ---------- making the sticker ---------- */

  const useCut = !!src && !isVideo(src) && cutout && !!cutoutBmp;
  const key = src
    ? JSON.stringify({ u: src.item.url, crop, start, len, cut: useCut, caption: caption.trim() })
    : "";
  const fresh = made && made.key === key ? made : null;

  const generate = async (): Promise<Made | null> => {
    if (!src) return null;
    if (fresh) return fresh;
    if (!isVideo(src) && cutout && !cutoutBmp) {
      say("Arka plan silme bitmeden sticker hazırlanamaz. Birkaç saniye bekle.");
      return null;
    }
    setBusy({ label: "Hazırlanıyor" });
    try {
      let res: StickerResult;
      const onP = (label: string, ratio?: number) => setBusy({ label, ratio });
      if (isVideo(src)) {
        res = await makeAnimated(src.blob, { start, length: len, crop, caption }, onP);
      } else {
        const c = document.createElement("canvas");
        c.width = c.height = SIZE;
        composeStatic(c.getContext("2d")!, useCut ? cutoutBmp! : src.bitmap!, src.w, crop, { cutout: useCut, caption });
        res = await encodeStatic(c, onP);
      }
      if (made) URL.revokeObjectURL(made.url);
      const m: Made = { key, res, url: URL.createObjectURL(res.blob), name: `sticker-${tweet?.author || "x"}-${Date.now().toString(36)}.webp` };
      setMade(m);
      return m;
    } catch (e) {
      console.error("sticker failed", e);
      say(e instanceof Error && e.message ? e.message : "Sticker hazırlanamadı. Tekrar dene.");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const onDownload = async () => {
    const m = await generate();
    if (!m) return;
    downloadBlob(m.res.blob, m.name);
    setSheet("downloaded");
  };

  const onWhatsApp = async () => {
    if (fresh) return share(fresh, false); // tap is still "live", share sheet may open
    const m = await generate();
    if (m) setSheet("ready"); // conversion took too long for the tap to count; ask for one more tap
  };

  const share = async (m: Made, downloaded: boolean) => {
    const out = await shareToWhatsApp(m.res.blob, m.name, downloaded);
    setSheet(null);
    if (out === "shared") say("Gönderildi. Sohbette sticker'a basılı tut ve \"Favorilere ekle\" de.");
    else if (out === "downloaded") say("Dosya indi ve WhatsApp Web açıldı. Sticker'ı sohbete sürükleyip bırakabilirsin.");
  };

  useEffect(() => {
    if (sheet) waRef.current?.focus();
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  /* ---------- size meter ---------- */

  const meter = (() => {
    if (!src) return null;
    if (isVideo(src)) {
      const kb = fresh ? fresh.res.kb : estimateAnimatedKb(len);
      return { kb, max: MAX_ANIMATED_KB, note: fresh ? fresh.res.note : "Hareketli WebP · 512×512 · tahmini boyut" };
    }
    const kb = fresh ? fresh.res.kb : useCut ? 40 : 70;
    return { kb, max: MAX_STATIC_KB, note: fresh ? fresh.res.note : `Statik WebP · 512×512${useCut ? " · şeffaf arka plan" : ""} · tahmini` };
  })();

  /* ---------- render ---------- */

  const stageW = src ? `min(100%, ${(440 * src.w) / src.h}px)` : undefined;
  const statusText =
    phase === "resolving" ? "Gönderi okunuyor…"
      : phase === "error" ? error
      : tweet ? `@${tweet.author} gönderisinde ${tweet.media.length} medya bulundu.`
      : "Linki yapıştırman yeterli, gerisini sayfa halleder.";

  return (
    <div className="wrap">
      <header className="top">
        <span className="logo">
          <span className="logo-badge" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M8 14s1.5 2 4 2 4-2 4-2" /><circle cx="9" cy="9.5" r=".6" fill="#fff" /><circle cx="15" cy="9.5" r=".6" fill="#fff" /></svg>
          </span>
          Yapıştır
        </span>
        <span className="pill">Ücretsiz · Uygulama yok</span>
      </header>

      <section className="hero">
        <h1>X linkini yapıştır, <span className="stk">sticker</span> hazır.</h1>
        <p className="lede">Videoyu ya da resmi telefonuna indirmen gerekmiyor. Linki ver, en komik saniyeyi seç, WhatsApp&apos;a gönder.</p>
      </section>

      <form
        className="linkbar"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          resolve(link);
        }}
      >
        <label htmlFor="link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
          <input
            id="link"
            type="url"
            inputMode="url"
            value={link}
            placeholder="https://x.com/…/status/…"
            aria-label="X gönderi linki"
            onChange={(e) => setLink(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              if (parseTweetId(text)) {
                e.preventDefault();
                setLink(text.trim());
                resolve(text.trim());
              }
            }}
          />
        </label>
        <button className="btn btn-main" type="submit" disabled={phase === "resolving"}>
          {phase === "resolving" ? "Okunuyor…" : "Sticker yap"}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </form>
      <p className={`status${phase === "error" ? " err" : ""}`} role="status">{statusText}</p>

      <section className="work">
        <div className="panel">
          <div className="row">
            <h2>Gönderideki medya</h2>
            {tweet && tweet.media.length > 1 && <span className="lbl">Birini seç</span>}
          </div>

          {tweet && (
            <div className="media">
              {tweet.media.map((m, i) => (
                <button key={m.url} className="thumb" type="button" aria-pressed={i === sel} onClick={() => i !== sel && selectMedia(tweet, i)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.thumb} alt="" referrerPolicy="no-referrer" />
                  <span className="tag">
                    {m.kind === "image" ? "Resim" : m.kind === "gif" ? "GIF" : `▶ ${m.duration ? `${Math.floor(m.duration / 60)}:${String(Math.round(m.duration % 60)).padStart(2, "0")}` : "Video"}`}
                  </span>
                </button>
              ))}
            </div>
          )}

          {src ? (
            <div className="stage" ref={stageRef} style={{ aspectRatio: `${src.w} / ${src.h}`, width: stageW }}>
              {isVideo(src) ? (
                <video ref={videoRef} src={src.url} muted playsInline loop autoPlay />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src.url} alt="Seçilen resim" />
              )}
              <div
                className="crop"
                tabIndex={0}
                aria-label="Kare kırpma alanı. Ok tuşlarıyla kaydır."
                style={{
                  left: `${(crop.x / src.w) * 100}%`,
                  top: `${(crop.y / src.h) * 100}%`,
                  width: `${(crop.size / src.w) * 100}%`,
                  height: `${(crop.size / src.h) * 100}%`,
                }}
                onPointerDown={(e) => drag(moveCrop)(e)}
                onKeyDown={(e) => {
                  const step = src.w / 30;
                  const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
                  if (!d || !stageRef.current) return;
                  e.preventDefault();
                  moveCrop(d[0] / (src.w / stageRef.current.clientWidth), d[1] / (src.w / stageRef.current.clientWidth));
                }}
              >
                <span>Sürükle · kare alan</span>
              </div>
            </div>
          ) : (
            <div className="stage-empty">
              {srcProgress !== null
                ? `Medya indiriliyor… %${Math.round(srcProgress * 100)}`
                : phase === "resolving"
                  ? "Gönderi okunuyor…"
                  : "Linki yapıştırınca gönderideki resim ve videolar burada görünür."}
            </div>
          )}

          {src && isVideo(src) && (
            <div className="timeline">
              <div className="row">
                <span className="lbl">Hangi saniyeler?</span>
                <span className="lbl">{fmt(start)} – {fmt(start + len)} sn</span>
              </div>
              <div className="strip" ref={stripRef}>
                <canvas ref={stripCanvas} width={800} height={70} />
                <div
                  className="win"
                  style={{ left: `${(start / src.duration) * 100}%`, width: `${(len / src.duration) * 100}%` }}
                  onPointerDown={(e) => drag((dx) => moveWindow(dx))(e)}
                  tabIndex={0}
                  aria-label="Seçili bölüm. Ok tuşlarıyla kaydır."
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                    e.preventDefault();
                    setStart((s) => Math.max(0, Math.min(src.duration - len, s + (e.key === "ArrowLeft" ? -0.25 : 0.25))));
                  }}
                >
                  <div className="playhead" ref={playheadRef} />
                </div>
              </div>
              <div className="chips">
                {lengths.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="chip"
                    aria-pressed={Math.abs(len - n) < 0.01}
                    onClick={() => {
                      setLen(n);
                      setStart((s) => Math.max(0, Math.min(s, src.duration - n)));
                    }}
                  >
                    {fmt(n).replace(",0", "")} sn
                  </button>
                ))}
              </div>
            </div>
          )}

          {src && !isVideo(src) && (
            <div className="toggle">
              <div>
                <b>Arka planı sil</b>
                <small>
                  {cutoutBusy
                    ? `${cutoutBusy.label}${cutoutBusy.ratio !== undefined ? ` · %${Math.round(cutoutBusy.ratio * 100)}` : "…"}`
                    : "Karakteri keser, kenarına beyaz çizgi ekler"}
                </small>
              </div>
              <input type="checkbox" className="switch" id="bgOff" checked={cutout} disabled={!!cutoutBusy} onChange={(e) => {
                  const on = e.target.checked;
                  setCutout(on);
                  cutoutWanted.current = on;
                  if (on && !cutoutBmp && !cutoutBusy) startCutout(src);
                }} aria-label="Arka planı sil" />
            </div>
          )}

          {src && (
            <div className="field">
              <label className="lbl" htmlFor="caption">Üstüne yazı (isteğe bağlı)</label>
              <input type="text" id="caption" maxLength={28} value={caption} placeholder="ör. PAZARTESİ ÖZETİ" onChange={(e) => setCaption(e.target.value.toLocaleUpperCase("tr-TR"))} />
            </div>
          )}
        </div>

        <aside className="panel">
          <h2>Sohbette böyle görünecek</h2>
          <div className="chat">
            <div className="msg">Bu tweeti gördün mü?<time>21:46</time></div>
            <div className="msg me">Sticker yaptım bile<time>21:47</time></div>
            <div className="sticker-wrap">
              {src ? (
                <canvas ref={previewRef} width={SIZE} height={SIZE} className={`preview ${useCut ? "cut" : "boxed"}`} />
              ) : (
                <div className="preview-empty">Sticker&apos;ın burada belirecek</div>
              )}
              <time>21:47 ✓✓</time>
            </div>
          </div>

          {meter && (
            <div className="meter">
              <div className="row">
                <span className="lbl">Dosya boyutu</span>
                <span>{meter.kb} / {meter.max} KB</span>
              </div>
              <div className={`bar${meter.kb / meter.max > 0.9 ? " warn" : ""}`}>
                <i style={{ width: `${Math.min(100, (meter.kb / meter.max) * 100)}%` }} />
              </div>
              <p className="note">{meter.note}</p>
            </div>
          )}

          <div className="actions">
            <button className="btn btn-main btn-big" type="button" onClick={onDownload} disabled={!src || !!busy}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></svg>
              Sticker&apos;ı indir
            </button>
            {busy && (
              <div className="busy" role="status">
                <span className="note">{busy.label}{busy.ratio !== undefined ? ` · %${Math.round(busy.ratio * 100)}` : "…"}</span>
                <div className="bar"><i style={{ width: `${(busy.ratio ?? 0.08) * 100}%` }} /></div>
              </div>
            )}
            <button className="btn btn-wa" type="button" onClick={onWhatsApp} disabled={!src || !!busy}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M12 3v12M7 8l5-5 5 5" /></svg>
              WhatsApp&apos;ta aç
            </button>
            <p className="note">İndirince WhatsApp&apos;ı tek dokunuşla açabileceğin bir pencere çıkar. Telefonda paylaşım menüsünden WhatsApp&apos;ı seçersin.</p>
          </div>
        </aside>
      </section>

      <section className="how" aria-label="Nasıl çalışır">
        <div className="step"><span className="n">1</span><div><h3>Linki yapıştır</h3><p>X&apos;te gönderinin altındaki paylaş düğmesinden &quot;Linki kopyala&quot; de.</p></div></div>
        <div className="step"><span className="n">2</span><div><h3>Seç ve kırp</h3><p>Videoda en iyi 2-3 saniyeyi, resimde kare alanı seç. İstersen yazı ekle.</p></div></div>
        <div className="step"><span className="n">3</span><div><h3>WhatsApp&apos;a gönder</h3><p>Tek dokunuşla paylaş. Sohbette sticker&apos;a basılı tut, &quot;Favorilere ekle&quot; de.</p></div></div>
      </section>

      <div className="specs" aria-label="WhatsApp sticker kuralları">
        <span className="lbl">WhatsApp kuralları, otomatik uygulanır:</span>
        <span className="spec"><b>512×512</b> px</span>
        <span className="spec">statik <b>≤100 KB</b></span>
        <span className="spec">hareketli <b>≤500 KB</b></span>
        <span className="spec">süre <b>≤10 sn</b></span>
        <span className="spec">format <b>WebP</b></span>
      </div>

      <footer>Dönüştürme senin cihazında yapılır, dosyaların sunucuya yüklenmez. Yalnızca paylaşma hakkın olan içeriklerden sticker yap.</footer>

      <div className={`toast${toast ? " show" : ""}`} role="status">{toast}</div>

      {sheet && fresh && (
        <div className="sheet-bg" onClick={(e) => e.target === e.currentTarget && setSheet(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
            <button className="x" type="button" aria-label="Kapat" onClick={() => setSheet(null)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fresh.url} alt="Hazırlanan sticker" className={useCut ? "cut" : "boxed"} />
            <div>
              <h2 id="sheetTitle">{sheet === "downloaded" ? "Sticker'ın indi!" : "Sticker'ın hazır!"}</h2>
              <p>
                sticker.webp · {fresh.res.kb} KB
                {sheet === "downloaded" ? " cihazına kaydedildi." : "."} Şimdi WhatsApp&apos;a gönder, sohbette üstüne basılı tutup &quot;Favorilere ekle&quot; de.
              </p>
            </div>
            <button ref={waRef} className="btn btn-wa" type="button" onClick={() => share(fresh, sheet === "downloaded")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M12 3v12M7 8l5-5 5 5" /></svg>
              WhatsApp&apos;ta aç
            </button>
            <button className="btn-link" type="button" onClick={() => setSheet(null)}>Şimdi değil</button>
          </div>
        </div>
      )}
    </div>
  );
}
