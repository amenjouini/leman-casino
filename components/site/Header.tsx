"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { t } from "@/lib/i18n";
import { Logo } from "./Logo";

const NAV = [
  { href: "/", label: t.nav.home },
  { href: "/poker", label: t.nav.poker },
  { href: "/tournois", label: t.nav.calendar },
  { href: "/resultats", label: t.nav.results },
  { href: "/#roulette", label: t.nav.roulette },
  { href: "/le-casino", label: t.nav.about },
  { href: "/contact", label: t.nav.contact },
];

export function Header({ casinoName, logoUrl }: { casinoName: string; logoUrl?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panelRef.current?.querySelector<HTMLElement>("a, button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
      if (e.key === "Tab" && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>("a, button"));
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`)));

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled || open ? "border-b border-white/[0.07] bg-night-900/85 backdrop-blur-xl" : "border-b border-transparent bg-transparent"
      }`}
    >
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-gold-400 focus:px-3 focus:py-2 focus:text-night-950">
        {t.nav.skip}
      </a>
      <div className="container-x flex h-[4.5rem] items-center justify-between gap-6 lg:h-20">
        <Logo src={logoUrl} name={casinoName} />

        <nav aria-label={t.nav.primary} className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`relative rounded-full px-3.5 py-2 text-[0.84rem] font-medium tracking-wide transition-colors ${
                    isActive(item.href) ? "text-gold-300" : "text-ivory-dim hover:text-ivory"
                  }`}
                >
                  {item.label}
                  {isActive(item.href) && <span className="absolute inset-x-3.5 -bottom-0.5 h-px bg-gold-400/70" aria-hidden />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/reserver" className="btn btn-gold btn-sm hidden sm:inline-flex">
            {t.nav.book}
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-ivory transition-colors hover:border-gold-400 xl:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? t.nav.close : t.nav.menu}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        id="menu-mobile"
        ref={panelRef}
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-[4.5rem] z-40 overflow-y-auto bg-night-900/[0.98] backdrop-blur-xl lg:top-20 xl:hidden"
      >
        <nav aria-label={t.nav.primary} className="container-x flex min-h-full flex-col py-8">
          <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {NAV.map((item, i) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex items-baseline justify-between py-4 font-display text-3xl transition-colors ${
                    isActive(item.href) ? "text-gold-300" : "text-ivory hover:text-gold-300"
                  }`}
                >
                  {item.label}
                  <span className="font-sans text-xs tracking-[0.2em] text-fog">0{i + 1}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/reserver" className="btn btn-gold mt-8 w-full">
            {t.nav.book}
          </Link>
        </nav>
      </div>
    </header>
  );
}
