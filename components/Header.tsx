"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import logo from "../public/leman.png";
import Image from "next/image";

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
   // Close dropdown when clicking outside
 useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-sm flex items-center justify-center">
              <Image
                src={logo}
                alt="Leman Poker Casino Logo"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
            </div>
          <div className="block">
              <div className="text-white font-bold text-lg leading-tight">Léman</div>
              <div className="text-white text-xs uppercase tracking-wide">Poker & Casino</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link href="/" className="text-white hover:text-gold transition-colors font-medium">
              Tournaments
            </Link>
            <Link href="/" className="text-white hover:text-gold transition-colors font-medium">
              Info
            </Link>
            <Link href="/" className="text-white hover:text-gold transition-colors font-medium">
              Advertising
            </Link>
            <Link href="/" className="text-white hover:text-gold transition-colors font-medium">
              Contact
            </Link>
  
          </nav>

         {/* Right Actions */}
                    <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 text-white hover:text-gold transition-colors px-2 py-1 rounded md:flex"
              >
                <span className="text-sm font-medium">English</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-28 bg-black border border-white/20 rounded shadow-lg z-50">
                  <button
                    className="w-full text-left px-4 py-2 text-white hover:bg-white/10"
                    onClick={() => {
                      console.log("Switched to Deutsch");
                      setIsLangOpen(false);
                    }}
                  >
                    Deutsch
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-white hover:bg-white/10"
                    onClick={() => {
                      console.log("Switched to French");
                      setIsLangOpen(false);
                    }}
                  >
                    French
                  </button>
                </div>
              )}
            </div>

            {/* Poker Events Button */}
            <button className="bg-gold hover:bg-gold/90 text-black px-6 py-3 rounded font-bold transition-colors uppercase text-sm hidden lg:block">
              Poker Events
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden text-white p-2"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>



      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="lg:hidden bg-black/95 backdrop-blur-md border-t border-white/10">
          <nav className="flex flex-col items-center py-6 space-y-4">
            {["POKER", "CASINO", "HOTEL", "WELLNESS", "RESTAURANT", "SHOP"].map(
              (item) => (
                <Link
                  key={item}
                  href={`/${item.toLowerCase()}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-white hover:text-gold text-lg font-medium transition-colors"
                >
                  {item}
                </Link>
              )
            )}
            <button className="bg-gold hover:bg-gold/90 text-black px-6 py-3 rounded font-bold uppercase text-sm mt-4">
              Poker Events
            </button>
          </nav>
        </div>
              )}


      {/* Sub Navigation */}
      {/* <div className="border-t border-white/10 bg-black/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-8 h-12 text-sm overflow-x-auto">
            <Link href="/poker/schedule" className="text-white hover:text-gold transition-colors whitespace-nowrap flex items-center gap-2">
              <span>📅</span>
              SCHEDULE
            </Link>
            <Link href="/poker/cash-games" className="text-white hover:text-gold transition-colors whitespace-nowrap flex items-center gap-2">
              <span>💰</span>
              CASH GAMES
            </Link>
            <Link href="/poker/live" className="text-white hover:text-gold transition-colors whitespace-nowrap flex items-center gap-2">
              <span>📺</span>
              LIVE AT KING'S
            </Link>
            <Link href="/poker/results" className="text-white hover:text-gold transition-colors whitespace-nowrap flex items-center gap-2">
              <span>🏆</span>
              RESULTS
            </Link>
            <Link href="/poker/livestream" className="text-white hover:text-gold transition-colors whitespace-nowrap flex items-center gap-2">
              <span>📡</span>
              LIVESTREAM
            </Link>
          </div>
        </div>
      </div> */}
    </header>
  );
}
