# Léman Poker & Casino — site web

Site public, système de réservation de tournois, espace d’administration et roulette de divertissement.

**Stack** : Next.js 15 (App Router) · React 19 · Tailwind CSS 4 · Drizzle ORM · PostgreSQL (PGlite embarqué en développement) · Nodemailer (SMTP) · Vitest.

## Démarrage local

```bash
npm install
npm run db:migrate                 # crée la base embarquée .data/pglite
npm run db:seed-demo               # (optionnel) 5 tournois de démonstration, préfixés « [Démo] »
npm run admin:create -- --email leman.casino@gmail.ch --name "Leman Casino"   
# demande le mot de passe

#mdp: leman-casion2026

npm run dev
```

- Site : http://localhost:3000 — Administration : http://localhost:3000/admin
- Sans `DATABASE_URL`, une base PostgreSQL embarquée (PGlite) est utilisée : aucune installation requise. **Un seul processus** peut l’ouvrir à la fois (arrêtez `npm run dev` avant `db:migrate` ou `admin:create`).
- Sans configuration SMTP, aucun e-mail n’est envoyé ; les réservations sont enregistrées et le site l’indique clairement.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` / `build` / `start` | Développement, build et serveur de production |
| `npm run test` | Tests (Vitest, base PGlite en mémoire) |
| `npm run typecheck` · `npm run lint` | Vérifications TypeScript et ESLint |
| `npm run check` | Tout ce qui précède + build |
| `npm run db:generate` | Génère une migration SQL après modification de `lib/db/schema.ts` |
| `npm run db:migrate` | Applique les migrations (sans jamais supprimer de données) |
| `npm run admin:create` | Crée un compte (`--role owner\|manager\|staff`, mot de passe via `ADMIN_PASSWORD` ou saisie) |
| `npm run db:seed-demo` | Données de démonstration (refusé si `DATABASE_URL` est défini, sauf `--force`) |

## Organisation

```
app/(site)/        Pages publiques (accueil, poker, calendrier, fiche tournoi, réservation, roulette, contact, légal)
app/admin/         Connexion, configuration initiale et espace d’administration
app/api/           Réservation publique, sièges, médias, exports CSV, tâche de rappels
components/        site/, tournaments/, booking/, roulette/, admin/
lib/db/            Schéma Drizzle et connexion (Postgres ou PGlite)
lib/bookings.ts    Logique de réservation (capacité, doublons, sièges, statuts) — transactionnelle
lib/tournaments.ts Requêtes et administration des tournois
lib/email/         Transport SMTP, modèles et journal des envois
lib/auth/          Mots de passe (scrypt), sessions en base, rôles
lib/i18n/          Textes publics (français) — ajouter une langue = un fichier de même forme
drizzle/           Migrations SQL versionnées
tests/             Tests automatisés
```

Voir **[DEPLOYMENT.md](DEPLOYMENT.md)** pour la mise en production.
