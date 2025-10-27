"use client";

import Link from 'next/link';
import Image from "next/image";
import logo from "../public/leman.png";
import { useTranslation } from "../i18n"; 

export function Footer() {
    const { t } = useTranslation();

  return (
    <footer className="bg-black border-t border-white/10">
      {/* Experience Sections */}
       <div className="border-b border-white/10">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row gap-4">
            {/* MAP */}
            <div className="w-full md:w-1/2 h-64 md:h-[420px] rounded-lg overflow-hidden">
              <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d352235.414911131!2d6.003625997103758!3d46.39241466843236!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x478c335cd5230951%3A0xc9a5a0c852b5ab3e!2sL%C3%A9man%20Poker%20%26%20Casino%20Formation!5e0!3m2!1sen!2stn!4v1761584625631!5m2!1sen!2stn"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
            </div>

            {/* Experience Boxes */}
            <div className="grid grid-cols-2 grid-rows-2 gap-4 w-full md:w-1/2">
              {/* PLAY */}
              <div className="relative group cursor-pointer overflow-hidden rounded-lg aspect-video">
                <img
                  src="https://ext.same-assets.com/462040507/2993477537.jpeg"
                  alt="Poker & Casino"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <h3 className="text-2xl md:text-3xl font-bold mb-1">PLAY</h3>
                  <p className="text-sm text-gold">In Léman</p>
                </div>
              </div>

              {/* DINE */}
              <div className="relative group cursor-pointer overflow-hidden rounded-lg aspect-video">
                <img
                  src="https://ext.same-assets.com/462040507/403213658.jpeg"
                  alt="Restaurant & Buffet"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <h3 className="text-2xl md:text-3xl font-bold mb-1">DINE</h3>
                  <p className="text-sm text-gold">In Léman</p>
                </div>
              </div>

              {/* RELAX */}
              <div className="relative group cursor-pointer overflow-hidden rounded-lg aspect-video">
                <img
                  src="https://ext.same-assets.com/462040507/2283141159.jpeg"
                  alt="Wellness"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <h3 className="text-2xl md:text-3xl font-bold mb-1">RELAX</h3>
                  <p className="text-sm text-gold">In Léman</p>
                </div>
              </div>

              {/* SLEEP */}
              <div className="relative group cursor-pointer overflow-hidden rounded-lg aspect-video">
                <img
                  src="https://ext.same-assets.com/462040507/3415231920.jpeg"
                  alt="Hotel"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <h3 className="text-2xl md:text-3xl font-bold mb-1">SLEEP</h3>
                  <p className="text-sm text-gold">In Léman</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Logo & About */}
          <div>
            <div className="flex items-center gap-3 mb-6">
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
              <div>
                <div className="text-white font-bold text-lg">Léman</div>
                <div className="text-white text-xs uppercase tracking-wide">Poker & Casino</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              {t("title_desc")}
            </p>
            <div className="flex gap-4">
              <a  target="_blank" href="https://www.facebook.com/profile.php?id=61550649364939" className="text-gray-400 hover:text-gold transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a  target="_blank" href="#" className="text-gray-400 hover:text-gold transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a target="_blank" href="https://www.instagram.com/lemanpokercasino/" className="text-gray-400 hover:text-gold transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Poker Links */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm">Poker</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/poker" className="text-gray-400 hover:text-gold transition-colors">Poker</Link></li>
              <li><Link href="/poker/schedule" className="text-gray-400 hover:text-gold transition-colors">Schedule</Link></li>
              <li><Link href="/poker/cash-games" className="text-gray-400 hover:text-gold transition-colors">Cash Games</Link></li>
              <li><Link href="/poker/live" className="text-gray-400 hover:text-gold transition-colors">Live at Léman&apos;s</Link></li>
              <li><Link href="/poker/results" className="text-gray-400 hover:text-gold transition-colors">Results</Link></li>
              <li><Link href="/poker/livestream" className="text-gray-400 hover:text-gold transition-colors">Live Stream</Link></li>
            </ul>
          </div>

          {/* Other Links */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm">You May Like</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/casino" className="text-gray-400 hover:text-gold transition-colors">Casino</Link></li>
              <li><Link href="/hotel" className="text-gray-400 hover:text-gold transition-colors">Hotel</Link></li>
              <li><Link href="/wellness" className="text-gray-400 hover:text-gold transition-colors">Wellness</Link></li>
              <li><Link href="/restaurant" className="text-gray-400 hover:text-gold transition-colors">Restaurant</Link></li>
              <li><Link href="/bank-transfer" className="text-gray-400 hover:text-gold transition-colors">Bank Transfer</Link></li>
              <li><Link href="/transport" className="text-gray-400 hover:text-gold transition-colors">Transport</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm">Need Any Help?</h4>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-400">+41 21 553 00 80</p>
              </div>
              <div>
                <p className="text-gray-400">event.relation@lemon-casino.com</p>
              </div>
              <button className="bg-gold hover:bg-gold/90 text-black px-6 py-2 rounded font-bold transition-colors uppercase text-sm w-full">
                Contact
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>© 2025 Léman Poker & Casino. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-gold transition-colors">Privacy Policy</Link>
              <Link href="/cookies" className="hover:text-gold transition-colors">Cookies</Link>
              <Link href="/terms" className="hover:text-gold transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
