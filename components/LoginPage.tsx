"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white font-[Brandon] px-4">
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-lg">
        <h2 className="text-3xl font-bold text-center text-gold mb-6 uppercase tracking-wide">
          Login
        </h2>

        <form className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2 rounded-md bg-black/40 text-white border border-white/20 focus:ring-2 focus:ring-gold outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded-md bg-black/40 text-white border border-white/20 focus:ring-2 focus:ring-gold outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-700 text-black font-semibold py-2 rounded-lg hover:scale-105 transition-transform duration-200"
          >
            Log In
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Don’t have an account?{" "}
          <Link href="/register" className="text-gold hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
