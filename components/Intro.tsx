"use client";

import { useEffect, useRef } from "react";

const STEPS = [
  {
    title: "Linki yapıştır",
    text: "X'te gönderinin altındaki paylaş düğmesinden \"Linki kopyala\" de, buraya yapıştır.",
    icon: (
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    ),
  },
  {
    title: "Seç ve kırp",
    text: "Videoda en komik 2-3 saniyeyi, resimde kare alanı seç. İstersen üstüne yazı ekle.",
    icon: <path d="M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2" />,
  },
  {
    title: "WhatsApp'ta çıkartma yap",
    text: "GIF'i kendine ya da birine gönder. GIF'e dokun, paylaş düğmesinden \"Çıkartma oluştur\"u seç.",
    icon: <path d="M21 11.5a8.4 8.4 0 0 1-12.2 7.5L3 21l2-5.6A8.4 8.4 0 1 1 21 11.5z" />,
  },
];

export default function Intro({ onClose }: { onClose: () => void }) {
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sheet-bg intro-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="intro" role="dialog" aria-modal="true" aria-labelledby="introTitle">
        <div className="intro-head">
          <span className="intro-badge" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M8 14s1.5 2 4 2 4-2 4-2" /><circle cx="9" cy="9.5" r=".6" fill="#fff" /><circle cx="15" cy="9.5" r=".6" fill="#fff" /></svg>
          </span>
          <h2 id="introTitle">3 adımda <span className="stk">çıkartma</span></h2>
          <p>İndirme yok, uygulama yok. X linkinden WhatsApp çıkartmasına.</p>
        </div>
        <ol className="intro-steps">
          {STEPS.map((s, i) => (
            <li key={s.title} style={{ animationDelay: `${120 + i * 90}ms` }}>
              <span className="intro-n">{i + 1}</span>
              <span className="intro-ico" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{s.icon}</svg>
              </span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <button ref={startRef} className="btn btn-main btn-big intro-go" type="button" onClick={onClose}>
          Başla
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  );
}
