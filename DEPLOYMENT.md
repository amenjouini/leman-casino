# Mise en production

## 1. Base de données PostgreSQL (obligatoire)

L’hébergement Vercel n’a pas de disque persistant : il faut une base PostgreSQL gérée (Neon, Supabase, Vercel Postgres, Infomaniak…).

1. Créez la base et récupérez l’URL de connexion.
2. Définissez `DATABASE_URL` dans les variables d’environnement du projet.
3. Les migrations sont appliquées par `npm run db:migrate`. Sur Vercel, le script `vercel-build` les exécute automatiquement avant chaque build.
   Les migrations sont additives (fichiers `drizzle/*.sql`) : un déploiement ne réinitialise jamais les données.

> Serveur unique avec disque persistant et sans PostgreSQL : `ALLOW_EMBEDDED_DB=true` + `PGLITE_DIR=/chemin/persistant` (une seule instance de l’application).

## 2. Variables d’environnement

Voir `.env.example`. Minimum en production :

| Variable | Obligatoire | Rôle |
| --- | --- | --- |
| `DATABASE_URL` | oui | Base PostgreSQL |
| `SITE_URL` | oui | URL publique (liens des e-mails, sitemap) |
| `APP_SECRET` | oui | Signe les liens personnels « Gérer ma réservation » (32 caractères aléatoires min.) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | pour envoyer des e-mails | Fournisseur SMTP (l’adresse `SMTP_FROM` doit être autorisée/SPF/DKIM) |
| `SMTP_SECURE` | selon fournisseur | `true` pour le port 465 |
| `CRON_SECRET` | pour les rappels | Protège `/api/cron/reminders` |
| `ADMIN_SETUP_TOKEN` | facultatif | Active `/admin/setup` tant qu’aucun compte n’existe |

Les identifiants ne sont jamais envoyés au navigateur ni affichés dans l’administration (seule leur présence est indiquée sur la page E-mails).

## 3. Premier compte propriétaire

Au choix :

- **En ligne de commande** (recommandé) : `DATABASE_URL=… npm run admin:create -- --email proprietaire@… --name "Prénom Nom"`
- **Par le navigateur** : définissez `ADMIN_SETUP_TOKEN` (16 caractères aléatoires min.), ouvrez `/admin/setup`, saisissez le jeton. La page se désactive dès qu’un compte existe ; supprimez ensuite la variable.

Les autres membres de l’équipe se créent ensuite dans **Administration › Équipe & accès** (rôles : propriétaire, responsable tournois, accueil/check-in).

## 4. Rappels automatiques

`vercel.json` planifie `/api/cron/reminders` une fois par jour (08:00 UTC, compatible avec l’offre gratuite de Vercel). Activez les rappels et le délai dans **Administration › E-mails**. Pour un envoi plus fin (horaire), passez la planification à `0 * * * *` (offre Vercel Pro) ou appelez l’URL depuis tout planificateur avec l’en-tête `Authorization: Bearer <CRON_SECRET>`.

## 5. Après la mise en ligne : informations à compléter par l’établissement

Dans **Administration › Paramètres du site** :

- Adresse postale exacte, NPA, lien d’itinéraire, horaires d’ouverture (actuellement vides : rien n’est affiché tant qu’ils ne sont pas renseignés).
- Vérifier l’e-mail de contact repris de l’ancien site (`event.relation@lemon-casino.com`) et le numéro `+41 21 553 00 80`.
- Mentions légales, politique de confidentialité, raison sociale, texte « jeu responsable » et âge minimum.
- Politique d’annulation et conditions de réservation.
- Points forts : repris du texte de l’ancien site (10 tables, vidéo-surveillance, tournois autorisés…) — à confirmer.
- Image d’accueil et logo en haute définition (les photos actuelles font 500 px).

Dans **Administration › Tournois** : archiver les tournois « [Démo] » s’ils ont été importés, puis créer les vrais tournois.

## 6. Limites connues

- Le rate-limit public (10 demandes / 15 min / IP) s’appuie sur l’en-tête `X-Forwarded-For` fourni par l’hébergeur (Vercel le garantit ; derrière un autre proxy, vérifiez qu’il écrase cet en-tête).
- Les images importées sont stockées en base (3 Mo max., JPEG/PNG/WebP/AVIF). Pour de gros volumes, préférez un stockage objet et collez l’URL.
- Le site public est en français ; la structure `lib/i18n` permet d’ajouter l’anglais/allemand.

## 7. Base embarquée endommagée (développement local)

Symptôme : `npm run db:migrate` échoue avec `RuntimeError: Aborted()` ou « La base embarquée … ne peut pas démarrer ».
Cause : le processus qui avait ouvert `.data/pglite` a été tué (fenêtre fermée, `Stop-Process`, crash) avant que PGlite ne ferme la base ; le dernier point de contrôle du journal WAL est alors illisible (`PANIC: could not locate a valid checkpoint record`). Les scripts et serveurs ferment désormais la base proprement à l’arrêt (Ctrl+C), ce qui évite le problème.

Récupération **sans perte** (sur une copie, jamais sur l’original) :

1. Arrêtez tout processus utilisant la base et copiez `.data/pglite` ailleurs.
2. Avec PostgreSQL **18** natif (ou Docker : `docker run --rm -v <copie>:/data postgres:18 pg_resetwal -f /data`), exécutez `pg_resetwal -f <copie>`.
3. Vérifiez la copie : `PGLITE_DIR=<copie> npm run db:migrate`.
4. Si tout est correct, renommez `.data/pglite` (gardez-le) et placez la copie réparée à sa place.

En attendant, vous pouvez travailler sur une base séparée : `PGLITE_DIR=.data/pglite-dev npm run dev`.

Sur Vercel, `vercel-build` exige `DATABASE_URL` (PostgreSQL) : la base embarquée n’est jamais utilisée en production.

## 8. Mode démonstration (présentation au client)

`DEMO_MODE=true` (actif par défaut en local sans `DATABASE_URL`) : au premier affichage, le site se remplit seul de données fictives — 7 tournois à venir (complet avec liste d’attente, presque complet, ouverture prochaine, choix de siège…), ~60 réservations avec pseudos, placement tiré au sort, 2 tournois passés avec résultats publiés, et 3 comptes :

| Rôle | E-mail | Mot de passe |
| --- | --- | --- |
| Propriétaire | proprietaire@demo.ch | LemanDemo2026 |
| Responsable tournois | manager@demo.ch | LemanDemo2026 |
| Accueil / check-in | accueil@demo.ch | LemanDemo2026 |

- Les tournois sont datés par rapport à aujourd’hui ; quand il n’y a plus de tournoi à venir, une nouvelle série est générée automatiquement.
- **Réinitialiser la démo** (tableau de bord, compte propriétaire) efface réservations/tournois et régénère tout.
- Si la base embarquée est endommagée par un arrêt brutal, elle est mise de côté et une démo neuve démarre (rien n’est supprimé).
- **Sur Vercel sans PostgreSQL** : définissez `DEMO_MODE=true` (et `APP_SECRET`). Chaque instance a sa propre base dans `/tmp`, effacée lors des redémarrages : parfait pour essayer, pas pour garder des données. Pour une démo persistante et partagée, ajoutez une base PostgreSQL gratuite (Neon) via `DATABASE_URL` + `DEMO_MODE=true`.
- À désactiver (`DEMO_MODE=false` ou retirer la variable) avant la mise en production réelle.
