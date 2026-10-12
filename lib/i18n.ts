export type Lang = "tr" | "en";

export const LANGS: Lang[] = ["tr", "en"];
export const LANG_KEY = "yapistir:lang";

const tr = {
  locale: "tr-TR",
  num: (n: number) => n.toFixed(1).replace(".", ","),
  pct: (n: number) => `%${Math.round(n * 100)}`,
  sec: "sn",

  // header + hero
  help: "Nasıl çalışır?",
  langLabel: "Dil",
  heroA: "X linkini yapıştır, ",
  heroB: " hazır.",
  lede: "Videoyu ya da resmi telefonuna indirmen gerekmiyor. Linki ver, en komik saniyeyi seç, WhatsApp'a gönder.",
  linkAria: "X gönderi linki",
  make: "Sticker yap",
  reading: "Okunuyor…",

  // status
  statusResolving: "Gönderi okunuyor…",
  statusFound: (author: string, n: number) => `@${author} gönderisinde ${n} medya bulundu.`,
  statusIdle: "Linki yapıştırman yeterli, gerisini sayfa halleder.",
  errBadLink: 'Bu bir X gönderi linki gibi durmuyor. Link "x.com/kullanici/status/123…" şeklinde olmalı.',
  errNotFound: "Gönderi bulunamadı. Silinmiş, gizli ya da korumalı bir hesaba ait olabilir.",
  errNoMedia: "Bu gönderide resim ya da video yok.",
  errUpstream: "X'e şu an ulaşılamıyor. Birazdan tekrar dene.",
  errRead: "Gönderi okunamadı.",

  // media panel
  mediaTitle: "Gönderideki medya",
  pickOne: "Birini seç",
  kindImage: "Resim",
  kindVideo: "Video",
  selectedImage: "Seçilen resim",
  cropAria: "Kare kırpma alanı. Ok tuşlarıyla kaydır.",
  cropHint: "Sürükle · kare alan",
  downloading: (p: string) => `Medya indiriliyor… ${p}`,
  emptyStage: "Linki yapıştırınca gönderideki resim ve videolar burada görünür.",
  whichSeconds: "Hangi saniyeler?",
  windowAria: "Seçili bölüm. Ok tuşlarıyla kaydır.",
  bgTitle: "Arka planı sil",
  bgHint: "Karakteri keser, kenarına beyaz çizgi ekler",
  captionLabel: "Üstüne yazı (isteğe bağlı)",
  captionPh: "ör. PAZARTESİ ÖZETİ",

  // preview panel
  previewTitle: "Sohbette böyle görünecek",
  chat1: "Bu tweeti gördün mü?",
  chat2: "Sticker yaptım bile",
  previewEmpty: "Sticker'ın burada belirecek",
  fileSize: "Dosya boyutu",
  estAnimated: "Sticker: hareketli WebP · 512×512 · tahmini boyut",
  estStatic: (cut: boolean) => `Statik WebP · 512×512${cut ? " · şeffaf arka plan" : ""} · tahmini`,

  // actions
  sendGif: "WhatsApp'ta GIF olarak gönder",
  sendPhoto: "WhatsApp'ta fotoğraf olarak gönder",
  savePhoto: "Sticker'ı fotoğraf olarak kaydet",
  saveVideoAria: "Sticker'ı video olarak kaydet",
  webpFile: "WhatsApp Web için sticker dosyası (.webp)",
  noteGif: "WhatsApp'ta GIF'i kendine ya da herhangi birine gönder. Sonra GIF'e dokunup paylaş düğmesinden \"Çıkartma oluştur\"u seç. İstersen çıkartmayı favorilerine ekleyebilirsin.",
  noteImage: "WhatsApp'ta resmi kendine ya da herhangi birine gönder. Sonra resme dokunup paylaş düğmesinden \"Çıkartma oluştur\"u seç. İstersen çıkartmayı favorilerine ekleyebilirsin.",

  // how it works + intro
  introTitleA: "3 adımda ",
  introTitleB: "çıkartma",
  introLede: "İndirme yok, uygulama yok. X linkinden WhatsApp çıkartmasına.",
  start: "Başla",
  step1: "Linki yapıştır",
  step1Intro: "X'te gönderinin altındaki paylaş düğmesinden \"Linki kopyala\" de, buraya yapıştır.",
  step1Short: "X'te gönderinin altındaki paylaş düğmesinden \"Linki kopyala\" de.",
  step2: "Seç ve kırp",
  step2Intro: "Videoda en komik 2-3 saniyeyi, resimde kare alanı seç. İstersen üstüne yazı ekle.",
  step2Short: "Videoda en iyi 2-3 saniyeyi, resimde kare alanı seç. İstersen yazı ekle.",
  step3: "WhatsApp'a gönder",
  step3Intro: "WhatsApp'ta çıkartma yap",
  step3IntroText: "GIF'i kendine ya da birine gönder. GIF'e dokun, paylaş düğmesinden \"Çıkartma oluştur\"u seç.",
  step3Short: "GIF'i kendine ya da birine gönder, paylaş düğmesinden \"Çıkartma oluştur\"u seç.",

  specsAria: "WhatsApp sticker kuralları",
  specsLbl: "WhatsApp kuralları, otomatik uygulanır:",
  specStatic: "statik",
  specAnimated: "hareketli",
  specLength: "süre",
  specFormat: "format",
  contact: "Görüş, öneri ve iletişim için:",
  footer: "Dönüştürme senin cihazında yapılır, dosyaların sunucuya yüklenmez. Yalnızca paylaşma hakkın olan içeriklerden sticker yap.",

  // sheet
  close: "Kapat",
  madeAlt: "Hazırlanan sticker",
  sheetVideoSaved: "Videon kaydedildi!",
  sheetGifReady: "GIF'in hazır!",
  sheetSaved: "Sticker'ın kaydedildi!",
  sheetDownloaded: "Sticker'ın indi!",
  sheetReady: "Sticker'ın hazır!",
  savedToDevice: " cihazına kaydedildi.",
  openWa: "WhatsApp'ta aç",
  notNow: "Şimdi değil",

  // toasts
  bgFailed: "Arka plan silinemedi. Resmi olduğu gibi kullanabilirsin.",
  mediaFailed: "Medya indirilemedi. Bağlantını kontrol edip tekrar dene.",
  waitCutout: "Arka plan silme bitmeden sticker hazırlanamaz. Birkaç saniye bekle.",
  stickerFailed: "Sticker hazırlanamadı. Tekrar dene.",
  savedHint: (video: boolean) => `Kaydettiysen WhatsApp'ta ${video ? "videoyu" : "resmi"} kendine gönder, sonra paylaş düğmesinden "Çıkartma oluştur"u seç.`,
  sentGif: "Gönderildi. Şimdi GIF'e dokun, paylaş düğmesinden \"Çıkartma oluştur\"u seç.",
  sentImage: "Gönderildi. Şimdi resme dokun, paylaş düğmesinden \"Çıkartma oluştur\"u seç.",
  webVideo: "Video indi ve WhatsApp Web açıldı. Videoyu sohbete sürükleyip bırakabilirsin.",
  webFile: "Dosya indi ve WhatsApp Web açıldı. Sohbete sürükleyip bırakınca sticker olarak gider.",

  // conversion
  videoOpenFail: "Video açılamadı.",
  bgModel: "Arka plan modeli indiriliyor (yalnızca ilk sefer)",
  bgRemoving: "Arka plan siliniyor",
  preparing: "Hazırlanıyor",
  stickerPreparing: "Sticker hazırlanıyor",
  converterLoading: "Dönüştürücü yükleniyor",
  converterFirst: "Dönüştürücü yükleniyor (ilk sefer ~30 MB)",
  videoPreparing: "Video hazırlanıyor",
  videoFailed: "Video hazırlanamadı.",
  fitting: "WhatsApp sınırına sığdırılıyor",
  convertFailed: "Dönüştürme başarısız oldu.",
  tooBig: "Bu bölüm WhatsApp'ın 500 KB sınırına sığmadı. Daha kısa bir süre seç.",
  noteStatic: "Statik WebP · 512×512",
  notePng: "PNG · 512×512 · galeriye kaydedilir",
  noteMp4: (cutTo?: number) => `Sessiz MP4 · 512×512 · WhatsApp'ta GIF olarak gider${cutTo ? ` (GIF için ${cutTo} sn'ye kısaltıldı)` : ""}`,
  noteAnimated: (fps: number, slowed: boolean) => `Hareketli WebP · 512×512 · ${fps} fps${slowed ? " (sığması için kare hızı düşürüldü)" : ""}`,
};

export type Dict = typeof tr;

const en: Dict = {
  locale: "en-US",
  num: (n: number) => n.toFixed(1),
  pct: (n: number) => `${Math.round(n * 100)}%`,
  sec: "s",

  help: "How it works",
  langLabel: "Language",
  heroA: "Paste an X link, your ",
  heroB: " is ready.",
  lede: "No need to download the video or image to your phone. Paste the link, pick the funniest second, send it to WhatsApp.",
  linkAria: "X post link",
  make: "Make sticker",
  reading: "Reading…",

  statusResolving: "Reading the post…",
  statusFound: (author: string, n: number) => `Found ${n} media in @${author}'s post.`,
  statusIdle: "Just paste the link, the page does the rest.",
  errBadLink: 'This doesn\'t look like an X post link. It should look like "x.com/user/status/123…".',
  errNotFound: "Post not found. It may be deleted, hidden or from a protected account.",
  errNoMedia: "This post has no image or video.",
  errUpstream: "Can't reach X right now. Try again in a moment.",
  errRead: "Couldn't read the post.",

  mediaTitle: "Media in the post",
  pickOne: "Pick one",
  kindImage: "Image",
  kindVideo: "Video",
  selectedImage: "Selected image",
  cropAria: "Square crop area. Move it with the arrow keys.",
  cropHint: "Drag · square area",
  downloading: (p: string) => `Downloading media… ${p}`,
  emptyStage: "Images and videos from the post show up here once you paste a link.",
  whichSeconds: "Which seconds?",
  windowAria: "Selected part. Move it with the arrow keys.",
  bgTitle: "Remove background",
  bgHint: "Cuts out the subject and adds a white outline",
  captionLabel: "Caption (optional)",
  captionPh: "e.g. MONDAY MOOD",

  previewTitle: "How it will look in chat",
  chat1: "Did you see this tweet?",
  chat2: "Already made a sticker",
  previewEmpty: "Your sticker will appear here",
  fileSize: "File size",
  estAnimated: "Sticker: animated WebP · 512×512 · estimated size",
  estStatic: (cut: boolean) => `Static WebP · 512×512${cut ? " · transparent background" : ""} · estimated`,

  sendGif: "Send as GIF on WhatsApp",
  sendPhoto: "Send as photo on WhatsApp",
  savePhoto: "Save sticker as photo",
  saveVideoAria: "Save sticker as video",
  webpFile: "Sticker file for WhatsApp Web (.webp)",
  noteGif: "On WhatsApp, send the GIF to yourself or anyone. Then tap the GIF and choose \"Create sticker\" from the share button. You can add the sticker to your favorites if you like.",
  noteImage: "On WhatsApp, send the image to yourself or anyone. Then tap the image and choose \"Create sticker\" from the share button. You can add the sticker to your favorites if you like.",

  introTitleA: "A sticker in ",
  introTitleB: "3 steps",
  introLede: "No downloads, no apps. From an X link to a WhatsApp sticker.",
  start: "Start",
  step1: "Paste the link",
  step1Intro: "On X, tap the share button under the post, choose \"Copy link\" and paste it here.",
  step1Short: "On X, tap the share button under the post and choose \"Copy link\".",
  step2: "Pick and crop",
  step2Intro: "Pick the funniest 2-3 seconds of a video or a square area of an image. Add a caption if you like.",
  step2Short: "Pick the best 2-3 seconds of a video or a square area of an image. Add a caption if you like.",
  step3: "Send to WhatsApp",
  step3Intro: "Make the sticker on WhatsApp",
  step3IntroText: "Send the GIF to yourself or someone. Tap the GIF and choose \"Create sticker\" from the share button.",
  step3Short: "Send the GIF to yourself or someone, then choose \"Create sticker\" from the share button.",

  specsAria: "WhatsApp sticker rules",
  specsLbl: "WhatsApp rules, applied automatically:",
  specStatic: "static",
  specAnimated: "animated",
  specLength: "length",
  specFormat: "format",
  contact: "Feedback, ideas or questions:",
  footer: "Conversion happens on your device; your files are never uploaded. Only make stickers from content you have the right to share.",

  close: "Close",
  madeAlt: "Your sticker",
  sheetVideoSaved: "Your video is saved!",
  sheetGifReady: "Your GIF is ready!",
  sheetSaved: "Your sticker is saved!",
  sheetDownloaded: "Your sticker is downloaded!",
  sheetReady: "Your sticker is ready!",
  savedToDevice: " saved to your device.",
  openWa: "Open in WhatsApp",
  notNow: "Not now",

  bgFailed: "Couldn't remove the background. You can use the image as it is.",
  mediaFailed: "Couldn't download the media. Check your connection and try again.",
  waitCutout: "The sticker can't be made until background removal finishes. Wait a few seconds.",
  stickerFailed: "Couldn't make the sticker. Try again.",
  savedHint: (video: boolean) => `Once saved, send the ${video ? "video" : "image"} to yourself on WhatsApp, then choose "Create sticker" from the share button.`,
  sentGif: "Sent. Now tap the GIF and choose \"Create sticker\" from the share button.",
  sentImage: "Sent. Now tap the image and choose \"Create sticker\" from the share button.",
  webVideo: "Video downloaded and WhatsApp Web opened. Drag the video into the chat.",
  webFile: "File downloaded and WhatsApp Web opened. Drag it into the chat to send it as a sticker.",

  videoOpenFail: "Couldn't open the video.",
  bgModel: "Downloading background model (first time only)",
  bgRemoving: "Removing background",
  preparing: "Preparing",
  stickerPreparing: "Making sticker",
  converterLoading: "Loading converter",
  converterFirst: "Loading converter (~30 MB the first time)",
  videoPreparing: "Preparing video",
  videoFailed: "Couldn't prepare the video.",
  fitting: "Fitting WhatsApp's size limit",
  convertFailed: "Conversion failed.",
  tooBig: "This part doesn't fit WhatsApp's 500 KB limit. Pick a shorter length.",
  noteStatic: "Static WebP · 512×512",
  notePng: "PNG · 512×512 · saved to gallery",
  noteMp4: (cutTo?: number) => `Muted MP4 · 512×512 · sent as a GIF on WhatsApp${cutTo ? ` (trimmed to ${cutTo} s for GIF)` : ""}`,
  noteAnimated: (fps: number, slowed: boolean) => `Animated WebP · 512×512 · ${fps} fps${slowed ? " (frame rate lowered to fit)" : ""}`,
};

export const DICTS: Record<Lang, Dict> = { tr, en };

// Code outside React (conversion, progress labels) reads the active language from here.
let current: Lang = "tr";
export const setCurrentLang = (l: Lang) => {
  current = l;
};
export const msg = () => DICTS[current];

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "tr" || saved === "en") return saved;
  } catch {}
  return navigator.language?.toLowerCase().startsWith("tr") ? "tr" : "en";
}
