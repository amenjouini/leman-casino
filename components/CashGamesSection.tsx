export function CashGamesSection() {
  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Cash Games Running */}
          <div className="bg-[#19181c] rounded-lg p-8 border border-white/10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 uppercase flex items-center gap-3">
              <span className="text-gold">💰</span>
              Cash Games Running
            </h2>

            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-full mb-4">
                <div className="w-3 h-3 bg-gold rounded-full animate-pulse" />
              </div>
              <p className="text-gray-400 text-lg">Loading...</p>
              <p className="text-sm text-gray-500 mt-2">
                Fetching live cash game information
              </p>
            </div>

            {/* Sample Data - Replace with live data */}
            <div className="space-y-3 mt-6">
              <div className="flex justify-between items-center p-4 bg-black/40 rounded border border-white/10 hover:border-gold/50 transition-colors">
                <div>
                  <div className="text-white font-semibold">NL Hold'em</div>
                  <div className="text-sm text-gray-400">€2/€5</div>
                </div>
                <div className="text-gold font-bold">3 Tables</div>
              </div>
              <div className="flex justify-between items-center p-4 bg-black/40 rounded border border-white/10 hover:border-gold/50 transition-colors">
                <div>
                  <div className="text-white font-semibold">PLO</div>
                  <div className="text-sm text-gray-400">€5/€10</div>
                </div>
                <div className="text-gold font-bold">2 Tables</div>
              </div>
            </div>
          </div>

          {/* KingsBet Promo */}
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-700/40 rounded-lg overflow-hidden border border-purple-500/30 relative">
            <div className="absolute inset-0 bg-[url('https://ext.same-assets.com/462040507/1191508824.jpeg')] opacity-20 bg-cover bg-center" />
            <div className="relative p-8 flex flex-col justify-center h-full">
              <div className="mb-4">
                <div className="inline-block bg-gold text-black px-4 py-1 rounded-full font-bold text-sm mb-4">
                  24/7
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Play in
                </h3>
                <h3 className="text-4xl md:text-5xl font-bold text-gold mb-4">
                  Léman Poker & Casino
                </h3>
                <p className="text-white text-lg mb-6">Now online</p>
              </div>
              <button className="bg-gold hover:bg-gold/90 text-black px-8 py-4 rounded font-bold text-lg transition-colors inline-flex items-center gap-2 w-fit">
                Visit Léman Poker & Casino
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
