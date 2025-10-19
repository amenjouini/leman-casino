'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Tournament {
  id: number;
  title: string;
  guarantee: string;
  dates: string;
  image: string;
  subtitle?: string;
}

const tournaments: Tournament[] = [
  {
    id: 1,
    title: 'BALKAN POKER CIRCUIT 1MILLION',
    guarantee: '€1.000.000',
    dates: '3. 10. 2025 - 12. 10. 2025',
    image: 'https://ext.same-assets.com/462040507/3074127459.jpeg',
  },
  {
    id: 2,
    title: 'DUTCH POKER MASTERS',
    guarantee: '€500.000',
    dates: '13. 10. 2025 - 20. 10. 2025',
    image: 'https://ext.same-assets.com/462040507/2754846710.jpeg',
  },
  {
    id: 3,
    title: 'IPS ITALIAN POKER SPORT €1,5MILLION',
    guarantee: '€1.500.000',
    dates: '10. 11. 2025 - 17. 11. 2025',
    image: 'https://ext.same-assets.com/462040507/860334551.jpeg',
  },
  {
    id: 4,
    title: "LEMAN'S MILLION PLO",
    guarantee: '€2.000.000',
    dates: '18. 11. 2025 - 24. 11. 2025',
    image: 'https://ext.same-assets.com/462040507/1875776768.jpeg',
  },
  {
    id: 5,
    title: 'GERMAN POKER MASTERS €1MILLION',
    guarantee: '€1.000.000',
    dates: '23. 11. 2025 - 12. 12. 2025',
    image: 'https://ext.same-assets.com/462040507/1641122060.jpeg',
  },
  {
    id: 6,
    title: 'GERMAN POKER DAYS',
    guarantee: '€300.000',
    dates: '3. 10. 2025 - 12. 10. 2025',
    image: 'https://ext.same-assets.com/462040507/2714698928.jpeg',
  },
];

export function HeroSection() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="relative pt-32 pb-12 bg-gradient-to-b from-black to-[#19181c]">
      <div className="container mx-auto px-4">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 mt-6">
          Léman Poker & Casino 
          </h1>
          <p className="text-gray-400 text-lg">
            Biggest Poker Room in Europe
          </p>
        </div>

        {/* Tournament Cards Carousel */}
        <div className="relative">
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-3 rounded-full transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="flex-none w-80 md:w-96 group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-lg aspect-[4/5] bg-black">
                  <img
                    src={tournament.image}
                    alt={tournament.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="mb-4">
                      <div className="text-sm text-gold font-semibold mb-2 uppercase">
                        Guarantee
                      </div>
                      <div className="text-4xl md:text-5xl font-bold text-gold mb-3">
                        {tournament.guarantee}
                      </div>
                    </div>

                    <div className="text-xs text-gray-300 mb-2">
                      {tournament.dates}
                    </div>

                    <h3 className="text-lg md:text-xl font-bold uppercase leading-tight">
                      {tournament.title}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-3 rounded-full transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </section>
  );
}
