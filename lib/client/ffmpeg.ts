"use client";

import type { FFmpeg } from "@ffmpeg/ffmpeg";

// Must match a published @ffmpeg/core release compatible with @ffmpeg/ffmpeg 0.12.
const CORE_BASE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";

let loading: Promise<FFmpeg> | null = null;

// Loads ffmpeg.wasm once per page. The worker is served unbundled from /public/ffmpeg.
export function getFFmpeg(): Promise<FFmpeg> {
  if (!loading) {
    loading = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const ff = new FFmpeg();
      // Keep the last log lines around for debugging (read window.__ffLog in devtools).
      const log: string[] = ((window as unknown as { __ffLog: string[] }).__ffLog = []);
      ff.on("log", ({ message }) => {
        log.push(message);
        if (log.length > 200) log.shift();
      });
      await ff.load({
        classWorkerURL: new URL("/ffmpeg/worker.js", window.location.href).href,
        coreURL: `${CORE_BASE}/ffmpeg-core.js`,
        wasmURL: `${CORE_BASE}/ffmpeg-core.wasm`,
      });
      return ff;
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}
