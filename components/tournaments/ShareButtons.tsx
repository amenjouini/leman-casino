"use client";

import { useState } from "react";
import { Check, Link2, Send, Share2 } from "lucide-react";

/** Share a tournament (native share sheet when available, WhatsApp, Telegram, copy link). */
export function ShareButtons({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const url = () => (typeof window === "undefined" ? path : new URL(path, window.location.origin).toString());
  const btn = "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-ivory-dim transition-colors hover:border-gold-400 hover:text-gold-300";

  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-fog">Partager</span>
      <button
        type="button"
        className={btn}
        aria-label="Partager"
        onClick={async () => {
          if (navigator.share) {
            try {
              await navigator.share({ title, url: url() });
            } catch {
              /* cancelled */
            }
          } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url()}`)}`, "_blank", "noopener");
          }
        }}
      >
        <Share2 className="h-4 w-4" />
      </button>
      <a className={btn} aria-label="Partager sur WhatsApp (nouvel onglet)" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(title + " ")}${encodeURIComponent(path)}`}
        onClick={(e) => {
          e.currentTarget.href = `https://wa.me/?text=${encodeURIComponent(`${title} ${url()}`)}`;
        }}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z" />
        </svg>
      </a>
      <a className={btn} aria-label="Partager sur Telegram (nouvel onglet)" target="_blank" rel="noopener noreferrer" href={`https://t.me/share/url?url=${encodeURIComponent(path)}&text=${encodeURIComponent(title)}`}
        onClick={(e) => {
          e.currentTarget.href = `https://t.me/share/url?url=${encodeURIComponent(url())}&text=${encodeURIComponent(title)}`;
        }}
      >
        <Send className="h-4 w-4" />
      </a>
      <button
        type="button"
        className={btn}
        aria-label={copied ? "Lien copié" : "Copier le lien"}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url());
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            /* clipboard unavailable */
          }
        }}
      >
        {copied ? <Check className="h-4 w-4 text-ok" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
