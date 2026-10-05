# Yapıştır

X (Twitter) linkini yapıştır, gönderideki videodan ya da resimden tek adımda WhatsApp sticker'ı yap.

- **Video / GIF →** hareketli WebP (512×512, ≤500 KB, ≤10 sn). Süre ve kare alan seçilir.
- **Resim →** statik WebP (512×512, ≤100 KB). İstenirse arka plan silinir, beyaz kenar eklenir.
- Üstüne yazı eklenebilir.
- İndirme bitince "WhatsApp'ta aç" penceresi çıkar. Telefonda paylaşım menüsü, bilgisayarda WhatsApp Web açılır.

Dönüştürme kullanıcının tarayıcısında yapılır (ffmpeg.wasm, @imgly/background-removal). Sunucu yalnızca linki çözer ve gerekirse X medyasını aktarır.

## Geliştirme

```bash
npm install
npm run dev        # http://localhost:3000
```

## Yapı

| Dosya | Görev |
| --- | --- |
| `lib/tweet.ts` | Linkten tweet ID'si çıkarır, X embed API'sinden (yedek: fxtwitter) medya listesini alır |
| `app/api/resolve` | `GET ?url=` → gönderideki medya listesi |
| `app/api/media` | `GET ?u=` → yalnızca `pbs.twimg.com` / `video.twimg.com` için aktarma (tarayıcı CORS'a takılırsa) |
| `lib/client/sticker.ts` | Kırpma, yazı, arka plan silme, WebP kodlama, WhatsApp boyut sınırına sığdırma |
| `lib/client/ffmpeg.ts` | ffmpeg.wasm yükleyici (çekirdek jsDelivr'dan, worker `public/ffmpeg`'den) |
| `lib/client/share.ts` | İndirme ve Web Share API ile WhatsApp'a gönderme |
| `components/StickerApp.tsx` | Arayüz |

## Cloudflare'de yayınlama

[OpenNext Cloudflare adaptörü](https://opennext.js.org/cloudflare) ile Workers'a çıkar.

```bash
npm run preview    # Cloudflare çalışma ortamında yerel önizleme
npm run deploy     # wrangler ile yayınla
```

Cloudflare panelinden GitHub'a bağlamak için: **Workers & Pages → Create → Import a repository**.
Build command: `npx opennextjs-cloudflare build`, deploy command: `npx opennextjs-cloudflare deploy`.

## Lisans

[AGPL-3.0](LICENSE). Arka plan silme için kullanılan `@imgly/background-removal` AGPL lisanslı olduğu için proje de açık kaynaktır.
