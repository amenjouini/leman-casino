"use client";

import { useState, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useRouter } from "next/navigation";

const scheduleData = [
  { date: "Oct 11", tournament: "BALKAN POKER CIRCUIT - Day 1A", guarantee: 1000000, buyIn: "€550" },
  { date: "Oct 12", tournament: "BALKAN POKER CIRCUIT - Day 1B", guarantee: 1000000, buyIn: "€550" },
  { date: "Oct 13", tournament: "DUTCH POKER MASTERS - Opening Event", guarantee: 500000, buyIn: "€330" },
  { date: "Oct 14", tournament: "DUTCH POKER MASTERS - Main Event Day 1A", guarantee: 500000, buyIn: "€550" },
  { date: "Oct 15", tournament: "DUTCH POKER MASTERS - Main Event Day 1B", guarantee: 500000, buyIn: "€550" },
];

// Define the type for a tournament
type Tournament = {
  date: string;
  tournament: string;
  guarantee: number;
  buyIn: string;
};

export function TournamentSchedule() {
  const router = useRouter(); // ✅ must be inside component
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [guaranteeRange, setGuaranteeRange] = useState<[number, number]>([250000, 1000000]);
const [modalData, setModalData] = useState<Tournament | null>(null);

  const filteredData = useMemo(() => {
    return scheduleData.filter((item) => {
      const matchesDate = selectedDate
        ? new Date(item.date + " 2025").getTime() === selectedDate.getTime()
        : true;

      const matchesTournament = selectedTournament
        ? item.tournament === selectedTournament
        : true;

      const matchesGuarantee =
        item.guarantee >= guaranteeRange[0] && item.guarantee <= guaranteeRange[1];

      return matchesDate && matchesTournament && matchesGuarantee;
    });
  }, [selectedDate, selectedTournament, guaranteeRange]);

  const tournamentOptions = Array.from(new Set(scheduleData.map((i) => i.tournament)));

  return (
    <section className="py-16 bg-[#CDA951]">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-black mb-6 uppercase">
          Tournament Schedule
        </h2>

        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          {/* Date Picker */}
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            placeholderText="Select date"
            className="px-4 py-2 rounded bg-black/40 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-gold w-full md:w-64"
            dateFormat="MMM dd"
          />

          {/* Tournament Dropdown */}
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            className="px-4 py-2 rounded bg-black/40 text-white focus:outline-none focus:ring-2 focus:ring-gold w-full md:w-64"
          >
            <option value="">All Tournaments</option>
            {tournamentOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Guarantee Range */}
          <div className="flex flex-col gap-2 w-full md:w-64 text-white">
            <label className="text-sm font-semibold">Guarantee (€)</label>
            <input
              type="range"
              min={250000}
              max={1000000}
              step={50000}
              value={guaranteeRange[1]}
              onChange={(e) =>
                setGuaranteeRange([guaranteeRange[0], Number(e.target.value)])
              }
              className="w-full h-2 bg-black rounded-lg accent-black appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-gold [&::-webkit-slider-thumb]:rounded-full
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:bg-gold [&::-moz-range-thumb]:rounded-full"
            />
            <div className="flex justify-between text-sm text-gold">
              <span>€250,000</span>
              <span>€{guaranteeRange[1].toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-black/40 rounded-lg overflow-hidden border border-white/10">
          <div className="hidden md:grid md:grid-cols-4 gap-4 px-6 py-4 bg-black/60 border-b border-white/10">
            <div className="text-white font-semibold uppercase text-m">Date</div>
            <div className="text-white font-semibold uppercase text-m col-span-2">Tournament</div>
            <div className="text-white font-semibold uppercase text-m text-right">Guarantee</div>
          </div>

          <div className="divide-y divide-white/10">
            {filteredData.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 px-6 py-4 hover:bg-white/5 transition-colors"
              >
                <div className="text-white font-medium">{item.date}</div>
                <div className="text-gray-300 col-span-1 md:col-span-2">
                  {item.tournament}
                  <div className="text-sm text-black mt-1">Buy-in: {item.buyIn}</div>
                </div>

                <div className="text-gold font-semibold md:text-right">
                  €{item.guarantee.toLocaleString()}
                  <div className="mt-2">
                    <button
                      onClick={() => setModalData(item)}
                      className="bg-gradient-to-r from-yellow-500 to-yellow-700 text-black px-4 py-1 rounded-lg text-sm font-semibold hover:scale-105 transition-transform duration-200"
                    >
                      Reserve
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredData.length === 0 && (
              <div className="px-6 py-4 text-white text-center">No tournaments found</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[90%] md:w-[400px] shadow-lg relative">
            <button
              onClick={() => setModalData(null)}
              className="absolute top-3 right-3 text-black/60 hover:text-black text-lg font-bold"
            >
              ×
            </button>

            <h3 className="text-xl font-bold text-black mb-2">{modalData.tournament}</h3>
            <p className="text-gray-700 mb-2">
              <strong>Date:</strong> {modalData.date}
            </p>
            <p className="text-gray-700 mb-2">
              <strong>Guarantee:</strong> €{modalData.guarantee.toLocaleString()}
            </p>
            <p className="text-gray-700 mb-4">
              <strong>Buy-in:</strong> {modalData.buyIn}
            </p>


            <div className="flex justify-between gap-4">
              <button
                onClick={() => router.push("/login")}
                className="flex-1 bg-black text-white py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => router.push("/register")}
                className="flex-1 bg-gold text-black py-2 rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
