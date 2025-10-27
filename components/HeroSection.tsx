'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from "../i18n"; 

interface Picture {
  id: number;
  title: string;
  description: string;
  image: string; // relative path to /public
  logo: string;
}

export function HeroSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(true);

  const pictures: Picture[] = [
    { id: 1, title: t("welcome"), logo: '/images/6818cba7797af.png', description: t("welcome_desc"), image: '/images/welcome.png' },
    { id: 2, title: t("space"), description: t("space_desc"), image: '/images/space.png', logo: '/images/6818cba7797af.png' },
    { id: 3, title: t("tournmanets"), description: t("tournmanets_desc"), image: '/images/tournmanets.png', logo: '/images/6818cba7797af.png' },
    { id: 4, title: t("team"), description: t("team_desc"), image: '/images/team.png', logo: '/images/6818cba7797af.png' },
    { id: 5, title: t("club"), description: t("club_desc"), image: '/images/club.png', logo: '/images/6818cba7797af.png' },
  ];

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;

      setShowLeftButton(scrollLeft > 0);
      setShowRightButton(scrollLeft < scrollWidth - clientWidth);
    }
  };

  useEffect(() => {
    const currentRef = scrollRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll);
      return () => {
        currentRef.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  return (
    <section className="relative pt-32 pb-12 bg-black">
      <div className="container mx-auto px-4">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 mt-6">
            Léman Poker & Casino
          </h1>
          <p className="text-gray-400 text-lg">
            {t("title_desc")}
          </p>
        </div>

        {/* Picture Carousel */}
        <div className="relative">
          {showLeftButton && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-3 rounded-full transition-colors hidden md:block"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {pictures.map((pic) => (
              <div
                key={pic.id}
                className="flex-none w-80 md:w-96 group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-lg aspect-[4/5] bg-black">
                  <Image
                    src={pic.image}
                    alt={pic.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Content */}
                  <div className="absolute top-5 bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="text-xl md:text-2xl font-bold uppercase leading-tight mb-2">
                      {pic.title}
                    </h3>
                  </div>
                  <div className="absolute top-0 bottom-20 left-0 right-0 p-6 text-white flex flex-col items-center justify-center">
                    <Image 
                      src={pic.logo} 
                      alt="Logo" 
                      width={300}  // Set desired width
                      height={300} // Set desired height
                      className="mb-2"
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <p className="text-gray-300 text-sm">
                      {pic.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showRightButton && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/80 hover:bg-black text-white p-3 rounded-full transition-colors hidden md:block"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}