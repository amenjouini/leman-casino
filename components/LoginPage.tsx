"use client";

import Link from "next/link";
import { useState } from "react";
import { COLORS } from "../styles/theme";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className={`min-h-screen flex items-center justify-center bg-black text-white font-inter px-4`}>
      <div className="bg-[#0A3021] backdrop-blur-md border border-yellow-500/30 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h2 className={`text-4xl font-extrabold text-center mb-6 uppercase tracking-wide ${COLORS.gold}`}>
          Login
        </h2>

        <form className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2 rounded-lg bg-gray-900/60 text-white border border-gray-700 focus:ring-2 focus:ring-yellow-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded-lg bg-gray-900/60 text-white border border-gray-700 focus:ring-2 focus:ring-yellow-500 outline-none"
            />
          </div>

          <button
            type="submit"
            className={`w-full ${COLORS.goldBg} text-black font-semibold py-2.5 rounded-xl hover:opacity-90 transition-transform duration-200 shadow-lg`}
          >
            Log In
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Don’t have an account?{" "}
          <Link href="/register" className={`${COLORS.gold} hover:underline`}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
