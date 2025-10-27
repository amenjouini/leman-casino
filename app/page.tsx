import { Header } from '../components/Header';
import { HeroSection } from '../components/HeroSection';
import { TournamentSchedule } from '../components/TournamentSchedule';
import { CashGamesSection } from '../components/CashGamesSection';
import { LiveTournaments } from '../components/LiveTournaments';
import { Footer } from '../components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <TournamentSchedule />
        <CashGamesSection />
        <LiveTournaments />
      </main>
      <Footer />
    </div>
  );
}
