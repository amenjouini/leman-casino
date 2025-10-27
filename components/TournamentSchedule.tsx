"use client";

import { useState, useMemo } from "react";
// Imports externes comme 'react-datepicker' et 'next/navigation' retirés ou simulés
import { ArrowPathIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/solid';
import { useRouter } from "next/navigation";
import { useTranslation } from "../i18n"; 



// Custom Gold Color Definition 
const GOLD_COLOR = "text-yellow-400";
const BG_GOLD = "bg-yellow-500";
const BORDER_GOLD = "border-yellow-500";
const renentry = '/images/reentry.png';
const trophy = '/images/trophy.png';
const bounty = '/images/bounty.png';


const scheduleData = [
  { date: "di 26.10.2025 14:00", tournament: "Le Royal - 100k", canton: "VD", type: renentry, typeName: 'Re-entry', buyIn: "100+30", players: 100, guarantee: 130 },
  { date: "me 29.10.2025 19:00", tournament: "Road2 Vegas & Marrakech - LPSeries", canton: "VD", type: renentry, typeName: 'Re-entry', buyIn: "90+25", players: 120, guarantee: 90 },
  { date: "ve 31.10.2025 19:00", tournament: "Double-Chance - 80K", canton: "VD", type: trophy, typeName: 'Championship', buyIn: "100+30", players: 80, guarantee: 130 },
  { date: "sa 08.11.2025 17:30", tournament: "Master Freezout", canton: "VD", type: bounty, typeName: 'Bounty', buyIn: "200+40", players: 150, guarantee: 240 },
];

// Define the type for a tournament
type Tournament = {
  date: string;
  tournament: string;
  canton: string;
  type: string;
  buyIn: string;
  players: number;
  typeName: string;
  guarantee: number;
};

// Component for a single column header with border-r
const TableHeaderCell = ({ children }: { children: React.ReactNode }) => (
  // La bordure à droite crée la ligne verticale pour l'en-tête
  <div className="text-gray-300 font-bold uppercase text-xs sm:text-sm p-3 border-r border-gray-700 last:border-r-0">
    {children}
  </div>
);

// Helper function to format date (e.g., "Oct 11 2025" to "2025-10-11") for native input type="date"
const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString + " 2025");
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export function TournamentSchedule() {
    const { t } = useTranslation();
  const router = useRouter(); 
  
  const [selectedDateInput, setSelectedDateInput] = useState<string>(""); 
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [guaranteeRange, setGuaranteeRange] = useState<[number, number]>([90, 240]);
  const [modalData, setModalData] = useState<Tournament | null>(null);

  const filteredData = useMemo(() => {
    return scheduleData.filter((item) => {
      
      const itemDateFormatted = formatDateForInput(item.date);

      // Correspondance de la date: utilise la chaîne de date formatée
      const matchesDate = selectedDateInput 
        ? itemDateFormatted === selectedDateInput 
        : true;

      const matchesTournament = selectedTournament
        ? item.tournament === selectedTournament
        : true;

      const matchesGuarantee =
        item.guarantee >= guaranteeRange[0] && item.guarantee <= guaranteeRange[1];

      return matchesDate && matchesTournament && matchesGuarantee;
    });
  }, [selectedDateInput, selectedTournament, guaranteeRange]);

  const tournamentOptions = Array.from(new Set(scheduleData.map((i) => i.tournament)));
  
  // Custom styles for input fields
  const inputStyles = "px-4 py-3 rounded-xl shadow-inner bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full transition duration-150 ease-in-out cursor-pointer appearance-none";
  
  // Liste des dates uniques disponibles 
  const availableDates = useMemo(() => {
    return Array.from(new Set(scheduleData.map(item => formatDateForInput(item.date))))
                 .sort();
  }, []);

  const handleClearFilters = () => {
    setSelectedDateInput("");
    setSelectedTournament("");
    setGuaranteeRange([90, 240]);
  };

  // Function to render table cells (applying the vertical border and removing bottom border)
  const renderCell = (content: React.ReactNode, isLast: boolean = false) => (
    // Ce composant de cellule ne gère que les bordures verticales (droite)
    <div className={`text-white text-sm p-3 md:text-base md:p-4 ${!isLast ? 'md:border-r border-gray-700' : ''}`}>
      {content}
    </div>
  );

  return (
    <section className="py-12 md:py-20 bg-[#0B3725] min-h-screen font-inter">
      <div className="container mx-auto px-4 max-w-7xl">
        <h2 className={`text-4xl md:text-5xl font-extrabold mb-10 text-center ${GOLD_COLOR} uppercase tracking-wider`}>
          {t("toursch")}
        </h2>

        {/* Filter Controls */}
        <div className="bg-[#0A3021] p-6 rounded-2xl shadow-xl mb-10 flex flex-col lg:flex-row lg:items-center gap-6 border border-gray-700">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold uppercase text-gray-400 block mb-1">{t("date")}</label>
            <input
              type="date"
              value={selectedDateInput}
              onChange={(e) => setSelectedDateInput(e.target.value)}
              min={availableDates[0]}
              max={availableDates[availableDates.length - 1]}
              className={`${inputStyles} [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
              title="Select date"
            />
            {selectedDateInput && (
                <button 
                    onClick={() => setSelectedDateInput("")}
                    className="text-xs text-gray-400 hover:text-white mt-1 underline"
                >
                    Clear Date
                </button>
            )}
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold uppercase text-gray-400 block mb-1">{t("tournament")}</label>
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className={inputStyles}
            >
              <option value="" className="bg-gray-800 text-gray-400">{t("all_tour")}</option>
              {tournamentOptions.map((t) => (
                <option key={t} value={t} className="bg-gray-800 text-white">
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Guarantee Range */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold uppercase text-gray-400 block mb-1">{t("guar")}</label>
            <div className="relative pt-2">
              <input
                type="range"
                min={90}
                max={250}
                step={20}
                value={guaranteeRange[1]}
                onChange={(e) =>
                  setGuaranteeRange([guaranteeRange[0], Number(e.target.value)])
                }
                className="w-full h-2 bg-gray-600 rounded-lg accent-yellow-500 appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">€90</span>
                <span className={GOLD_COLOR}>€{guaranteeRange[1].toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleClearFilters}
            className={`mt-4 lg:mt-6 px-4 py-2 text-sm font-semibold rounded-xl bg-gray-600 text-white hover:bg-gray-500 transition-colors flex items-center justify-center lg:w-40`}
          >
            <ArrowPathIcon className="w-4 h-4 mr-1" /> {t("clr_filters")}
          </button>
        </div>

        {/* Table */}
 <div className="bg-[#0A3021] rounded-2xl shadow-2xl overflow-hidden border border-gray-700">

  {/* Header Row (Desktop) */}
  <div className="hidden md:grid md:grid-cols-[200px_3fr_1fr_1fr_1fr_1.5fr] items-stretch bg-[#072418] border-b border-gray-700 sticky top-0 z-10">
    <TableHeaderCell>{t("date")}</TableHeaderCell>
    <TableHeaderCell>{t("tournament")}</TableHeaderCell>
    <TableHeaderCell>{t("canton")}</TableHeaderCell>
    <TableHeaderCell>{t("type")}</TableHeaderCell>
    <TableHeaderCell>{t("joueurs")}</TableHeaderCell>
    <TableHeaderCell>{t("buyin")}</TableHeaderCell>
  </div>

  {/* Data Rows with Clean Lines Between */}
  <div className="border-t border-b border-[#134b36] ">
  {filteredData.map((item, index) => (
    <div
      key={index}
      className="grid grid-cols-1 md:grid-cols-[200px_3fr_1fr_1fr_1fr_1.5fr]
                 items-center border-t border-gray-700
                 hover:bg-gray-700/30 transition-colors cursor-pointer"
      onClick={() => setModalData(item)}
    >

      {/* Mobile View */}
<div className="md:hidden p-4 space-y-2">
  <div className="text-gray-400 text-sm flex items-center">
    <ClockIcon className="w-4 h-4 mr-2" />
    <span className="font-bold text-base text-white">{item.date}</span>
      <img 
        src={item.type} 
        alt="Tournament Type" 
        className="h-8 w-8 object-cover ml-30" 
      />
  </div>
 
  <div className="text-xl font-bold text-yellow-400">{item.tournament}</div>
  <div className="flex justify-between text-sm text-gray-300">
    <span className="flex items-center">
      <MapPinIcon className="w-4 h-4 mr-1 text-red-400" /> {item.canton}
    </span>
    
    <span className="font-semibold text-yellow-400">
      €{item.buyIn.toLocaleString()} GTD
    </span>
  </div>

  {/* Progress Bar Section */}
  <div className="flex flex-col gap-1 w-full">
    {(() => {
      // Generate random but static values for now
      const max = Math.floor(Math.random() * 80) + 40; // between 40–120
      const current = Math.floor(Math.random() * max); // less than max
      const fill = (current / max) * 100;

      // Pick color dynamically
      let color = '#16a34a'; // green
      if (current > max - 11) color = '#dc2626'; // red when nearly full
      else if (current > max / 2) color = '#ca8a04'; // yellow mid

      return (
        <>
          <div className="flex justify-between text-[12px] font-medium text-gray-300">
            <span className="text-white">{current}</span>
            <span className="text-gray-400">/ {max}</span>
          </div>

          <div className="relative w-full h-2 rounded-full bg-[#143d2b] overflow-hidden shadow-inner">
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-in-out"
              style={{
                width: `${fill}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </>
      );
    })()}
  </div>
</div>

        {/* Desktop View */}
        <div className="hidden md:contents">
          {renderCell(<span className="font-bold text-base text-white">{item.date}</span>)}
          {renderCell(item.tournament)}
          {renderCell(item.canton)}
          {renderCell(
    <div className="flex items-center">
      <img 
        src={item.type} 
        alt="Tournament Type" 
        className="h-8 w-8 object-cover mr-2" 
      />
    </div>
  )}
        {renderCell(
  <div className="flex flex-col gap-1 w-full max-w-[140px]">
    {(() => {
      // Generate random but static values for now
      const max = Math.floor(Math.random() * 80) + 40; // between 40–120
      const current = Math.floor(Math.random() * max); // less than max
      // modalData.players=current;
      const fill = (current / max) * 100;

      // Pick color dynamically
      let color = '#16a34a'; // green
      if (current > max-11) color = '#dc2626'; // red when nearly full
      else if (current > max/2) color = '#ca8a04'; // yellow mid

      return (
        <>
          <div className="flex justify-between text-[13px] font-medium text-gray-300">
            <span className="text-white">{current}</span>
            <span className="text-gray-400">/ {max}</span>
          </div>

          <div className="relative w-full h-2.5 rounded-full bg-[#143d2b] overflow-hidden shadow-inner">
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-in-out"
              style={{
                width: `${fill}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </>
      );
    })()}
  </div>
)}
          {renderCell(
            <div className="flex flex-col md:items-end">
              <span className={`${GOLD_COLOR} font-bold text-lg`}>
                €{item.buyIn.toLocaleString()}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push("/login");
                }}
                className={`mt-1 ${BG_GOLD} text-black px-3 py-1 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity duration-200 shadow-md`}
              >
                {t("reserve_spot")}
              </button>
            </div>,
            true
          )}
        </div>
      </div>
    ))}

    {/* No Data Message */}
    {filteredData.length === 0 && (
      <div className="px-6 py-10 text-gray-400 text-center text-lg border-t border-gray-800">
        <p className="mb-2">No tournaments match your current filters.</p>
        <button
          onClick={handleClearFilters}
          className="text-sm font-semibold rounded-lg text-yellow-500 hover:text-yellow-400 transition-colors"
        >
          Clear Filters
        </button>
      </div>
    )}
  </div>
</div>
<div className="flex justify-end items-center space-x-4 mt-5">
  <div className="flex items-center">
    <img 
      src={renentry} 
      alt="Re-entry" 
      className="h-8 w-8 object-cover mr-2" 
    />
    <span className="text-gray-400">Re-entry</span>
  </div>
  
  <div className="flex items-center">
    <img 
      src={bounty} 
      alt="Bounty" 
      className="h-8 w-8 object-cover mr-2" 
    />
    <span className="text-gray-400">Bounty</span>
  </div>
  
  <div className="flex items-center">
    <img 
      src={trophy} 
      alt="Trophy" 
      className="h-8 w-8 object-cover mr-2" 
    />
    <span className="text-gray-400">Championship</span>
  </div>
</div>


      </div>

      {/* Modal - Improved Design */}
      {modalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-[#0A3021] rounded-xl p-8 w-full max-w-sm shadow-2xl relative border ${BORDER_GOLD}`}>
            <button
              onClick={() => setModalData(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-2xl font-light"
            >
              ×
            </button>

            <h3 className={`text-2xl font-extrabold mb-4 ${GOLD_COLOR}`}>{modalData.tournament}</h3>
            
            <div className="space-y-3 text-white mb-6">
                <p>
                    <strong className="text-gray-400">{t("date")}:</strong> {modalData.date}
                </p>
                <p>
                    <strong className="text-gray-400">{t("canton")}:</strong> {modalData.canton}
                </p>
                <p>
                  <strong className="text-gray-400">{t("event_type")}:</strong> {modalData.typeName}
              </p>
                <p>
                    <strong className="text-gray-400">{t("buyin")}</strong> <span className="font-bold text-lg">{modalData.buyIn}</span>
                </p>
  
                {/* <p className="text-xs text-gray-500">
                    Join the {modalData.players} current registered players!
                </p> */}
            </div>

            <div className="flex justify-between gap-4 pt-4 border-t border-gray-700">
              <button
                // Simulation du routeur
                onClick={() => router.push("/login")}
                className="flex-1 bg-gray-600 text-white py-3 rounded-xl font-semibold hover:bg-gray-500 transition-colors shadow-lg"
              >
                {t("login")}
              </button>
              <button
                // Simulation du routeur
                onClick={() => router.push("/register")}
                className="flex-1 bg-yellow-500 text-black py-3 rounded-xl font-semibold hover:bg-yellow-400 transition-colors shadow-lg"
              >
                {t("register")}
                              </button>
            </div>
          </div>
        </div>
      )} 
    </section>
  );
}
