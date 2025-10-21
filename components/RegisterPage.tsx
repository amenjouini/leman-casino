"use client";

import Link from "next/link";
import { useState } from "react";

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
    <div className="min-h-screen flex items-center justify-center bg-black text-white font-[Brandon] px-4">
      <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-lg">
        <h2 className="text-3xl font-bold text-center text-gold mb-6 uppercase tracking-wide">
          Register
        </h2>

        <form className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full px-4 py-2 rounded-md bg-black/40 text-white border border-white/20 focus:ring-2 focus:ring-gold outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full px-4 py-2 rounded-md bg-black/40 text-white border border-white/20 focus:ring-2 focus:ring-gold outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded-md bg-black/40 text-white border border-white/20 focus:ring-2 focus:ring-gold outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirm"
              value={formData.confirm}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-2 rounded-md bg-black/40 text-white border border-white/20 focus:ring-2 focus:ring-gold outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-700 text-black font-semibold py-2 rounded-lg hover:scale-105 transition-transform duration-200"
          >
            Create Account
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-gold hover:underline">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}
