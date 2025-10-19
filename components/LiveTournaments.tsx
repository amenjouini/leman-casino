export function LiveTournaments() {
  const liveTournament = {
    event: 'WSOP Circuit',
    tournament: 'Main Event',
    level: 'Level 12',
    blinds: '1,500/3,000',
    ante: '3,000',
    players: 248,
    chipLeader: 'John Smith',
    chips: '523,000',
  };

  return (
    <section className="py-16 bg-[#19181c]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 uppercase flex items-center gap-3">
          <span className="text-gold">📺</span>
          Live Tournaments
        </h2>

        <div className="bg-black rounded-lg overflow-hidden border border-white/10">
          {/* Live Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-3 flex items-center gap-3">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="text-white font-bold uppercase text-sm">LIVE NOW</span>
          </div>

          {/* Tournament Info Grid */}
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gold mb-2">
                    {liveTournament.event}
                  </h3>
                  <p className="text-xl text-white">{liveTournament.tournament}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-4 rounded">
                    <div className="text-sm text-gray-400 mb-1">Level</div>
                    <div className="text-xl font-bold text-white">{liveTournament.level}</div>
                  </div>
                  <div className="bg-black/40 p-4 rounded">
                    <div className="text-sm text-gray-400 mb-1">Players Remaining</div>
                    <div className="text-xl font-bold text-gold">{liveTournament.players}</div>
                  </div>
                </div>

                <div className="bg-black/40 p-4 rounded">
                  <div className="text-sm text-gray-400 mb-2">Blinds / Ante</div>
                  <div className="text-2xl font-bold text-white">
                    {liveTournament.blinds} / {liveTournament.ante}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="bg-gradient-to-br from-gold/20 to-gold/5 p-6 rounded-lg border border-gold/30">
                <div className="text-sm text-gold font-semibold mb-3 uppercase">
                  Chip Leader
                </div>
                <div className="text-2xl font-bold text-white mb-2">
                  {liveTournament.chipLeader}
                </div>
                <div className="text-3xl font-bold text-gold">
                  {liveTournament.chips}
                </div>

                <button className="mt-6 w-full bg-gold hover:bg-gold/90 text-black px-6 py-3 rounded font-bold transition-colors uppercase text-sm">
                  Watch Live Stream
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
