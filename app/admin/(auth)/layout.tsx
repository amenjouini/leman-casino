import type { Metadata } from "next";
import { LakeLines } from "@/components/site/LakeLines";

export const metadata: Metadata = { title: "Espace équipe", robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grain relative flex min-h-screen items-center justify-center overflow-hidden bg-night-950 px-4 py-12">
      <LakeLines className="pointer-events-none absolute inset-x-0 top-1/2 h-[36rem] w-full -translate-y-1/2 text-gold-400/[0.06]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-display text-4xl tracking-[0.2em] text-gold-300">LÉMAN</p>
          <p className="mt-1 text-xs uppercase tracking-[0.28em] text-fog">Espace équipe</p>
        </div>
        <div className="surface p-6 sm:p-8">{children}</div>
      </div>
    </main>
  );
}
