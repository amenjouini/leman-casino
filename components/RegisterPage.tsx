"use client";

import Link from "next/link";
import { useState } from "react";
import { COLORS } from "../styles/theme";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-black text-white font-inter px-4`}>
      <div className="bg-[#0A3021] backdrop-blur-md border border-yellow-500/30 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h2 className={`text-4xl font-extrabold text-center mb-6 uppercase tracking-wide ${COLORS.gold}`}>
          Register
        </h2>

        <form className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full px-4 py-2 rounded-lg bg-gray-900/60 text-white border border-gray-700 focus:ring-2 focus:ring-yellow-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full px-4 py-2 rounded-lg bg-gray-900/60 text-white border border-gray-700 focus:ring-2 focus:ring-yellow-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded-lg bg-gray-900/60 text-white border border-gray-700 focus:ring-2 focus:ring-yellow-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirm Password</label>
            <input
              type="password"
              name="confirm"
              value={formData.confirm}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded-lg bg-gray-900/60 text-white border border-gray-700 focus:ring-2 focus:ring-yellow-500 outline-none"
            />
          </div>

          <button
            type="submit"
            className={`w-full ${COLORS.goldBg} text-black font-semibold py-2.5 rounded-xl hover:opacity-90 transition-transform duration-200 shadow-lg`}
          >
            Create Account
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className={`${COLORS.gold} hover:underline`}>
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}
