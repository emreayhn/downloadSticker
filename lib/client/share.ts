"use client";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export type ShareOutcome = "shared" | "cancelled" | "downloaded";

export function canShareFiles(blob: Blob, filename: string) {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  return navigator.canShare({ files: [new File([blob], filename, { type: blob.type })] });
}

/**
 * Must be called directly from a tap: browsers only open the share sheet during a user gesture.
 * Phones get the native share sheet (user picks WhatsApp). Desktops get the file plus WhatsApp Web.
 */
export async function shareToWhatsApp(blob: Blob, filename: string, alreadyDownloaded = false): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: blob.type });
  if (canShareFiles(blob, filename)) {
    try {
      // No text/title: WhatsApp would send them as a separate message.
      await navigator.share({ files: [file] });
      return "shared";
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return "cancelled";
    }
  }
  if (!alreadyDownloaded) downloadBlob(blob, filename);
  window.open("https://web.whatsapp.com/", "_blank", "noopener");
  return "downloaded";
}
