"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarCheck, ClipboardList, ExternalLink, History, LayoutDashboard, LogOut, Mail, Menu, Settings, Trophy, UserCog, Users, X } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";
import { can, type Permission } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { logoutAction } from "@/lib/admin/actions/auth";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; permission: Permission }[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/admin/reservations", label: "Réservations", icon: ClipboardList, permission: "bookings.view" },
  { href: "/admin/pointage", label: "Pointage du jour", icon: CalendarCheck, permission: "bookings.checkin" },
  { href: "/admin/tournois", label: "Tournois", icon: Trophy, permission: "tournaments.view" },
  { href: "/admin/joueurs", label: "Joueurs", icon: Users, permission: "players.view" },
  { href: "/admin/emails", label: "E-mails", icon: Mail, permission: "emails.view" },
  { href: "/admin/journal", label: "Journal d'activité", icon: History, permission: "audit.view" },
  { href: "/admin/parametres", label: "Paramètres du site", icon: Settings, permission: "settings.manage" },
  { href: "/admin/utilisateurs", label: "Équipe & accès", icon: UserCog, permission: "users.manage" },
];

export function AdminShell({ user, pendingCount, children }: { user: SessionUser; pendingCount: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const items = NAV.filter((n) => can(user.role, n.permission));
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Administration" className="flex h-full flex-col">
      <Link href="/admin" className="px-5 py-6">
        <span className="block font-display text-2xl tracking-[0.18em] text-gold-300">LÉMAN</span>
        <span className="text-[0.65rem] uppercase tracking-[0.24em] text-fog">Espace équipe</span>
      </Link>
      <ul className="flex-1 space-y-0.5 px-3">
        {items.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active(href) ? "bg-gold-400/12 text-gold-200" : "text-ivory-dim hover:bg-white/[0.04] hover:text-ivory"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1">{label}</span>
              {href === "/admin/reservations" && pendingCount > 0 && (
                <span className="rounded-full bg-warn px-2 py-0.5 text-[0.65rem] font-bold text-night-950" aria-label={`${pendingCount} en attente`}>
                  {pendingCount}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <div className="space-y-1 border-t border-white/[0.06] p-3">
        <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-mist hover:text-ivory">
          <ExternalLink className="h-4 w-4" aria-hidden /> Voir le site
        </Link>
        <Link href="/admin/compte" className="block rounded-xl px-3 py-2 hover:bg-white/[0.04]">
          <span className="block truncate text-sm text-ivory">{user.name}</span>
          <span className="block truncate text-xs text-fog">{ROLE_LABELS[user.role]}</span>
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-mist hover:text-danger">
            <LogOut className="h-4 w-4" aria-hidden /> Se déconnecter
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-night-900 lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-white/[0.06] bg-night-950 lg:block">{nav}</aside>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-night-950/95 px-4 backdrop-blur lg:hidden">
        <Link href="/admin" className="font-display text-xl tracking-[0.18em] text-gold-300">
          LÉMAN
        </Link>
        <button type="button" onClick={() => setOpen(!open)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15" aria-expanded={open} aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && <div className="fixed inset-x-0 bottom-0 top-14 z-30 overflow-y-auto bg-night-950 lg:hidden">{nav}</div>}
      <main id="contenu" className="min-w-0 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
