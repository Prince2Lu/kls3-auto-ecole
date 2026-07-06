# KLS3 Auto-École — Contexte complet projet

## Qui suis-je ?

**Eric Scarpino** — Fondateur de KLS3, actuellement en mission freelance Chef de projet à Post Luxembourg (fin 2026).
**Lilian Scarpino** — Directeur Commercial de KLS3 (fils d'Eric).

Ce projet est un produit dérivé de KLS3 (kls3-dev.com), construit comme preuve de concept commerciale et destiné à devenir un produit SaaS vertical réplicable.

---

## Objectif du produit

Automatiser l'onboarding des nouveaux élèves pour les auto-écoles : collecte de pièces, suivi de dossier, relances automatiques, sans toucher au logiciel métier existant (Code Rousseau, ECF, etc. — aucune API ouverte fiable dans ce secteur).

### Cible commerciale
- Auto-écoles en Moselle (Sarreguemines → Forbach → Saint-Avold → Boulay-Moselle → Thionville → Metz) pour démarrer
- TPE 1-10 salariés (secteur très atomisé : 8 677 auto-écoles en France, 612 dans le Grand-Est, quasi-totalité en 1-10 salariés)
- Décideur : gérant/fondateur, souvent seul décisionnaire

### Modèle économique
- Forfait de mise en place : 2 500 € (à valider/ajuster selon retours terrain)
- Abonnement mensuel : 250-350 €/mois (engagement 12 mois)
- Prix non figé : sonder le budget du prospect en échange direct avant de proposer un chiffre
- Vision long terme : industrialiser le déploiement pour baisser le coût marginal par client (produit multi-tenant, pas du sur-mesure à chaque fois)

---

## Périmètre fonctionnel validé

### Ce qu'on fait
1. **Formulaire d'inscription public** par auto-école (lien à partager : ex. `wagner.kls3-dev.com/inscription`)
2. **Collecte de pièces** : CNI, photo d'identité, attestation ASSR/ASR, RIB
3. **OCR avec validation humaine (Niveau 2)** : extraction automatique des données du RIB (IBAN/BIC/titulaire) et de la CNI (nom/prénom/date de naissance), validation par checksum (IBAN mod-97, MRZ ICAO 9303), présentée à la secrétaire pour confirmation en un clic avant export — jamais d'action autonome sur une donnée bancaire ou d'identité
4. **Tableau de bord collaborateur** : liste élèves type tableau dense, compteurs par statut en haut (document manquant / paiement en attente / dossier complet), filtres, détail au clic
5. **Relances automatiques** : email de relance après X jours sans action, visible dans le dashboard ("3 relances automatiques envoyées aujourd'hui")
6. **Magic link** : lien sécurisé envoyé à l'élève pour compléter son dossier sans créer de compte
7. **Transfert direct vers Google Drive du client** (OAuth par client) — zéro stockage de documents sensibles côté KLS3 (décision RGPD : pas de responsabilité de traitement sur des pièces d'identité, possiblement de mineurs)
8. **Export CSV structuré** vers le logiciel métier existant — pas d'intégration API (le secteur n'en propose pas de fiable)

### Ce qu'on ne fait PAS (périmètre exclu)
- Pas d'intégration directe avec Code Rousseau / ECF / autres logiciels métier (pas d'API disponible)
- Pas d'acquisition de nouveaux clients / marketing pour l'auto-école (hors positionnement KLS3 — "une équipe, pas une agence marketing")
- Pas de stockage de documents d'identité côté serveur KLS3

---

## Stack technique

- **Frontend** : Next.js 14 App Router + TypeScript + Tailwind CSS + Framer Motion
- **Base de données** : Supabase (PostgreSQL géré + Row Level Security pour l'isolation multi-tenant)
- **Auth collaborateurs** : Supabase Auth, email + mot de passe classique
- **Auth élève** : magic link (pas de compte/mot de passe)
- **Email** : Resend — magic link élève + notification auto-école à chaque inscription
- **Stockage documents** : Supabase Storage (bucket privé `documents-eleves`), zone de transit temporaire avant transfert Google Drive du client (OAuth par tenant)
- **OCR** : Google Cloud Vision API (`DOCUMENT_TEXT_DETECTION`, auth par clé API REST — pas de SDK), MRZ (ICAO 9303, verso CNIe) pour la CNI récente + repli texte libre pour l'ancien format/recto seul, parsing par labels pour le RIB, validation par checksum obligatoire avant tout export. **Limite connue : images uniquement (jpg/png), pas de PDF** — gap fonctionnel prioritaire (majorité des RIB bancaires sont des PDF natifs numériques). Piste retenue : `pdf-parse` pour extraire le texte brut avant d'appeler Vision, réutilisant `parseRibText()` tel quel.
- **Déploiement** : Vercel, projet séparé du site vitrine kls3-dev.com
- **Repo** : Prince2Lu/kls3-auto-ecole (séparé de Prince2Lu/kls3-dev — ne pas mélanger)
- **Local** : /Users/Eric2/kls3-dev/kls3-auto-ecole

### Architecture multi-tenant
- ⚠️ Pas de wildcard `*.kls3-dev.com` chez Vercel : Cloudflare ne peut pas satisfaire le défi DNS-01 requis pour un certificat SSL wildcard sans déléguer les nameservers (ce qu'on évite, d'autres services dépendent de Cloudflare). À la place : un sous-domaine = un CNAME individuel.
- Un sous-domaine par client : `wagner.kls3-dev.com`, `dupont-conduite.kls3-dev.com`, etc.
- `auto-ecole.kls3-dev.com` réservé à la page produit/démo publique (pas de données réelles)
- Isolation des données par tenant via Row Level Security Supabase dès la conception du schéma (tenant_id sur chaque table, jamais en rétrofit)
- Setup d'un nouveau client = configuration (logo, couleurs, formules, pièces requises, connexion Drive), pas redéveloppement

#### Process d'onboarding client (DNS + email)

Pour chaque nouveau client :
1. Vercel → Domains → ajouter le sous-domaine (ex. `wagner.kls3-dev.com`)
2. Cloudflare → DNS → ajouter un CNAME :
   - Nom : le slug du sous-domaine (ex. "wagner")
   - Cible : `cname.vercel-dns.com`
   - Mode : DNS uniquement (nuage gris, PAS orange/proxié)
3. Attendre la validation Vercel (quelques minutes, statut "Valid Configuration")
4. Créer la ligne correspondante dans la table `tenants` (slug = sous-domaine)
5. Vérifier le domaine expéditeur email du client dans Resend (ajouter les enregistrements DNS chez le client) → renseigner `email_expediteur` dans la table `tenants` (ex. `noreply@wagner-autoecole.fr`). En attendant la vérification : fallback automatique sur `onboarding@resend.dev`.

~5-10 min de setup manuel par client, à industrialiser plus tard si le volume de clients le justifie (API Cloudflare + API Vercel + API Resend scriptables).

---

## État actuel du setup (6 juillet 2026)

- [x] Repo GitHub Prince2Lu/kls3-auto-ecole créé
- [x] Projet Next.js initialisé en local
- [x] Projet Supabase créé (après mise en pause de Calymia Dev pour libérer un slot du plan gratuit)
- [x] Projet Vercel créé et déployé
- [x] Décision DNS : abandon du wildcard `*.kls3-dev.com` — passage en CNAME individuel par sous-domaine client
- [x] `wagner.kls3-dev.com` et `auto-ecole.kls3-dev.com` ajoutés et validés dans Vercel
- [x] Schéma de base de données Supabase — migrations 0001 à 0014 appliquées
- [x] Architecture middleware Next.js pour résoudre le tenant depuis le sous-domaine (`app/tenant/[tenant]/`)
- [x] Tableau de bord collaborateur — vue d'ensemble, liste élèves, détail élève + carte OCR
- [x] Schéma élèves : `nom`/`prenom` séparés, `formulas.documents_requis` pour le ratio docs
- [x] EPIC 1 complet : formulaire d'inscription, magic link (Resend), reprise de dossier
- [x] EPIC 2 complet : upload élève vers Supabase Storage (`documents-eleves`), statut `documents_complets` calculé automatiquement
- [x] EPIC 3 partiel : US17 validation secrétaire explicite, US7/US13 relances automatiques (cron Vercel), US14 relance manuelle
- [x] US15/US16 : OCR réel (Google Vision) implémenté ET testé de bout en bout (2 juillet) — statuts `pending` / `failed_student_action` / `failed_secretary_entry` / `validated`, checksum IBAN + MRZ, saisie manuelle secrétaire pré-remplie, pipeline validé sur un vrai document (CNI Eric Scarpino, extraction texte libre correcte : nom/prénom/date de naissance)
- [x] Migration 0013 poussée en prod, code mergé sur `main`
- [x] US2 (date de naissance) : champ ajouté au formulaire d'inscription, validation client + serveur (âge ≥ 12 ans, non future), stocké dans `students.date_of_birth`. Contrôle de cohérence OCR CNI implémenté et testé (3 juillet) — chemin MRZ uniquement (`confirmOcrExtraction`). Code poussé sur `main`.
- [x] US24bis (documents conditionnés par l'âge) : `lib/students/age.ts` (`calculateAge`) + `computeRequiredDocumentTypes()` dans `lib/constants/documents.ts`. ASSR2/ASR requis si âge < 21 ans, JDC requis si 17 ≤ âge ≤ 25 ans. Testé sur les 4 bornes exactes + cas sans date. Code poussé sur `main`.
- [x] US5bis (justificatif de domicile) : migration 0014 (`documents.date_document`), statut `perime`, cron `checkAndNotifyDomicilePerimes` greffé sur `/api/cron/relances`. Testé de bout en bout (3 juillet). Code poussé sur `main`.
- [x] Session fixes 3 juillet après-midi : `formatDateOnly()` dans `lib/utils/date.ts`, inspection `last_activity_at` concluante, purge élève "Client Test". Code poussé sur `main`.
- [x] **Session design/UI — 6 juillet 2026 : fondation visuelle complète posée**
  - Tailwind v4 via `globals.css` (`@import "tailwindcss"` + `@theme inline`), `tailwind.config.ts` ajouté pour les tokens custom, branché via `@config "../tailwind.config.ts"`
  - `lib/fonts.ts` : Manrope (display, `--font-display`) + Inter (body, `--font-body`) via `next/font/google`
  - Tokens couleur : `--brand` (marque tenant, depuis `tenants.primary_color`, fallback `#3454D1`) injecté dans `app/tenant/[tenant]/layout.tsx` ; palette statuts sémantiques fixes (`success`/`warning`/`danger`/`neutral`) indépendants du tenant
  - Neutres chauds custom : `--ink` `#1C1917`, `--surface` `#FAFAF9`, `--surface-muted` `#F0EFED`, `--border` `#E5E3E0`
  - `components/ui/Badge.tsx`, `Card.tsx`, `Button.tsx` créés
  - Badges de statut migrés dans `StudentsTable.tsx`, `eleves/[studentId]/page.tsx`, `DocumentUploadCard.tsx`, `OcrValidationCard.tsx`
  - Mapping statuts → variantes : `complete`/`recu`/`validated` → `success` ; `payment_pending`/`documents_complets`/`pending` → `warning` ; `perime`/`failed_*` → `danger` ; `en_attente`/`manquant` → `neutral`
  - Page `/inscription` restructurée : layout 2 colonnes desktop / 1 colonne mobile, états erreur et succès
  - `components/ui/Stepper.tsx` : stepper vertical 3 étapes (Inscription / Dépôt pièces / Validation secrétaire)
  - `components/ui/TrustBox.tsx` : encart confiance RGPD (chiffrement bout en bout, hébergement France)
  - `components/ui/Input.tsx` : wrapper `<input>`/`<select>` avec label et état erreur intégré (`error?: string`)
  - Point ouvert : couleur teal (~`#0E6E64`) explorée via Claude Design pour `/inscription` — à trancher comme nouveau fallback `--brand` ou garder cobalt `#3454D1`. Un changement d'une ligne dans le layout tenant.
- [x] **Support PDF pour l'OCR** (RIB) — 6 juillet 2026. `pdf-parse` v1.1.1, importé via le sous-module `pdf-parse/lib/pdf-parse.js` (contournement d'un bug connu du point d'entrée principal — voir Pièges résolus). Testé de bout en bout sur un vrai RIB Caisse d'Épargne (mise en page en tableau, cas le plus exigeant identifié) : IBAN/BIC/titulaire extraits correctement, checksum IBAN valide, statut `pending` comme un succès Vision classique. `parseRibText()` étendu avec des fallbacks additifs uniquement (texte compacté pour IBAN/BIC fragmentés en cellules, label alternatif "Intitulé du compte" pour le titulaire) — comportement existant sur images (Vision) non modifié, non-régression vérifiée sur un cas texte simple.
- [ ] Connexion OAuth Google Drive par tenant (US18)
- [ ] Export CSV structuré (US19)
- [ ] Page Paramètres tenant (email notification, email expéditeur, délai relance)

### Schéma Supabase — tables et colonnes clés (état migration 0014)

| Table | Colonnes notables |
|---|---|
| `tenants` | id, slug, name, logo_url, primary_color, notification_email, email_expediteur, relance_delai_jours (default 3) |
| `tenant_members` | id, tenant_id, user_id, role |
| `students` | id, tenant_id, formula_id, nom, prenom, email, date_of_birth, status, validated_at, validated_by, last_activity_at |
| `representants_legaux` | id, tenant_id, student_id, nom, prenom, email (table décidée le 3 juillet, schéma détaillé à concevoir en session technique) |
| `formulas` | id, tenant_id, name, documents_requis (jsonb) |
| `documents` | id, tenant_id, student_id, type, category (`ants` \| `facturation_kls3`), status (dont `perime`), date_document (déclaratif, justificatif de domicile), file_path, original_filename, mime_type, size_bytes, uploaded_at |
| `reminders` | id, tenant_id, student_id, sent_at, type |
| `magic_links` | id, tenant_id, student_id, token, expires_at, used_at, created_at |
| `ocr_extractions` | id, tenant_id, document_id, document_type, extracted_data, iban_checksum_valid, mrz_checksum_valid, status, attempt_count, entry_method, validated_at, validated_by |
| `public_tenant_branding` | vue : id, slug, name, logo_url, primary_color (security_invoker = false) |

### Pièges résolus à ne pas refaire

- **Dossier `_tenant`** : jamais de préfixe `_` sur un dossier de route Next.js (exclu du routing). Le bon dossier est `app/tenant/[tenant]/`.
- **RLS récursive** : toute policy filtrant par appartenance tenant doit passer par la fonction `security definer` `get_my_tenant_ids()` plutôt qu'une sous-requête directe sur `tenant_members` (sinon récursion/erreur 500).
- **RLS avec get_my_tenant_ids()** : la fonction retourne un `SETOF uuid` (pas un tableau `uuid[]`). Le seul pattern valide dans une policy est :
  ```sql
  USING (tenant_id IN (SELECT * FROM get_my_tenant_ids()))
  ```
  — jamais `ANY()`, jamais `unnest()`.
- **gen_random_bytes sur Supabase** : la fonction appartient au schema `extensions`, pas `public`. Toujours écrire `extensions.gen_random_bytes(32)`, jamais `gen_random_bytes(32)` seul. Requiert l'extension `pgcrypto` activée (Dashboard → Database → Extensions).
- **Résolution tenant publique** : la table `tenants` reste protégée par RLS stricte. La résolution publique passe par la vue `public_tenant_branding` (security_invoker = false). Ne jamais lire `tenants` directement depuis une page sans auth.
- **Service role key** : utiliser `SUPABASE_SERVICE_ROLE_KEY` uniquement dans les Server Actions et Server Components côté serveur — jamais dans un Client Component, jamais exposé au navigateur.
- **Middleware** : strip du port dynamiquement (`/:\d+$/`), gérer `pathname === '/'` pour éviter un double slash, exclure `/login` du rewrite tenant.
- **Ports locaux** : plusieurs projets peuvent tourner en parallèle — toujours vérifier le port réel affiché par `npm run dev`.
- **Email expéditeur** : adresse dynamique selon `tenants.email_expediteur`. Pattern à utiliser dans toutes les Server Actions email :
  ```ts
  const from = tenant.email_expediteur
    ? `${tenant.name} <${tenant.email_expediteur}>`
    : 'KLS3 Auto-École <onboarding@resend.dev>'
  ```
- **Après toute migration** : `supabase db push` obligatoire pour rafraîchir le cache de schéma PostgREST — `NOTIFY pgrst, 'reload schema'` seul est insuffisant. Pour régénérer les types TypeScript sans Docker Desktop lancé : `supabase gen types typescript --linked` (pas `--local`, qui requiert Docker). **Piège testé en session** : la commande `supabase gen types ... > lib/types/database.ts` vide le fichier de destination via la redirection shell *avant* de savoir si la commande réussit — si elle échoue (Docker non lancé, etc.), le fichier reste vide et casse tout le typage du projet. Toujours vérifier `git diff` juste après.
- **`ocr_extractions` — une ligne par document** : index unique sur `document_id` (depuis migration 0013). Un re-upload fait un upsert sur la même ligne et réinitialise systématiquement `validated_at`/`validated_by`.
- **Vision API et PDF** : le client Vision REST (`images:annotate`) ne traite que des images (jpg/png), pas les PDF. Résolu le 6 juillet 2026 pour les PDF natifs numériques (couche texte présente, cas très majoritaire pour les RIB bancaires) — voir `lib/ocr/extract-pdf-text.ts`. PDF scannés (image sans couche texte) : toujours non couverts, routent vers le fallback élève/secrétaire (US8/US16) — pas de rasterisation en repli (pas de binaire système sur Vercel serverless), à évaluer si le volume s'avère significatif en usage réel.
- **`pdf-parse` v1.1.1 — piège du point d'entrée principal** : le fichier `pdf-parse/index.js` contient un bloc de code de debug resté par erreur dans le package publié, protégé par la condition `!module.parent`. Sous Webpack/Next.js, cette condition se comporte différemment qu'en Node CommonJS classique et se déclenche à tort au chargement du module, tentant de lire un PDF d'exemple fourni avec les tests internes du package (`./test/data/05-versions-space.pdf`) → crash `ENOENT` en dev comme en build. **Toujours importer `pdf-parse/lib/pdf-parse.js` (le sous-module réel), jamais `pdf-parse` directement.** Nécessite une déclaration de type locale (`lib/ocr/pdf-parse-lib.d.ts`), `@types/pdf-parse` ne couvrant que le point d'entrée principal. Fixé sur v1.1.1 volontairement (pas v2, API différente — exports multiples ESM/CJS/worker, non testée).
- **`pdf-parse` et RIB en tableau (mise en page en cellules)** : un RIB avec une mise en page en tableau (cases séparées par groupe pour l'IBAN, une lettre par cellule pour le BIC — observé sur Caisse d'Épargne, probablement répandu chez d'autres banques) produit, une fois passé par `pdf-parse`, un texte où les segments sont fragmentés et collés sans séparateur cohérent, réparti sur des lignes imprévisibles selon la géométrie du PDF (pas selon une logique de colonne). `parseRibText()` dans `lib/ocr/parse-rib.ts` gère ce cas via des fallbacks additifs sur texte compacté (suppression de tous les espaces/retours, recherche ancrée juste après le label) — jamais un remplacement de la logique ligne-par-ligne existante, qui reste le premier essai. Piège annexe découvert en cours de route : un libellé complet entre parenthèses (ex. `"BIC (Identifiant international de l'établissement)"`) peut contenir un mot qui matche accidentellement le pattern de la valeur cherchée (`IDENTIFIANT` ressemble à un BIC) — `findNearLabel` exclut désormais le contenu entre parenthèses avant de chercher une valeur sur la même ligne.
- **Parsing texte libre CNI (`parse-cni.ts`)** : label et valeur quasi toujours sur deux lignes séparées dans la sortie Vision. Les dates sur le recto d'une CNIe sont séparées par des espaces (`07 06 1974`) — le regex de date doit accepter l'espace comme séparateur.
- **Champs de saisie manuelle (`OcrValidationCard.tsx`)** : mettre `autoComplete="off"` et `text-zinc-900` sur les inputs — sans ça le texte pré-rempli peut apparaître illisible selon le navigateur/extensions.
- **CNI recto seul → toujours `failed_student_action`** : `ocrSucceeded` codé en dur à `false` sur `parseCniFreeText` — aucun checksum possible sur ce chemin. Seul le verso CNIe récente (MRZ, format 2021+) peut atteindre `pending`. Par design, pas un bug.
- **Nom de colonne date de naissance** : colonne réelle en base = `students.date_of_birth`, pas `date_naissance`. Le nom français n'existe que dans `extracted_data.date_naissance` (OCR) et l'UI.
- **Formatage date d'affichage** : utiliser `formatDateOnly()` de `lib/utils/date.ts` (format `dd/mm/yyyy`). Format ISO (`YYYY-MM-DD`) pour le stockage et les comparaisons internes.
- **Tailwind v4 + config custom** : le projet utilise Tailwind v4 via `@import "tailwindcss"` dans `globals.css`. Pour les tokens custom, un `tailwind.config.ts` est branché via `@config "../tailwind.config.ts"` dans `globals.css` — sans ça, les classes custom ne sont pas reconnues.
- **`--brand` vs statuts sémantiques** : `--brand` est exclusivement réservé aux actions primaires (bouton, nav active, accent UI). Les statuts dossier/document utilisent une palette fixe (`success`/`warning`/`danger`/`neutral`). Ne jamais utiliser `--brand` pour signifier un état métier.

### Décisions produit — session pièces réglementaires ANTS (3 juillet 2026)

Voir USER_STORIES.md (US2, US2bis, US5bis, US24, US24bis) pour le détail produit complet. Résumé technique :

- **Date de naissance** : collectée au formulaire. L'OCR CNI est un contrôle de cohérence a posteriori — écart → vérification secrétaire (même mécanisme US16).
- **Représentant légal (US2bis)** : majorité calculée à l'inscription. Table `representants_legaux` à concevoir, pipeline OCR CNI existant réutilisé.
- **Justificatif de domicile (US5bis)** : requis pour tous. Date déclarative, statut `perime` à 6 mois, cron existant.
- **Documents conditionnés par l'âge (US24bis)** : ASSR2/ASR < 21 ans, JDC 17-25 ans inclus.
- **Catégorisation documents** : `ants` vs `facturation_kls3` (RIB). Impact sur US18 à trancher.
- **Candidat libre** : Parking Lot, en attente validation terrain.

### Notes d'infrastructure temporaires

- **Projet GCP KLS3** : projet par défaut `oceanic-base-147508` réutilisé (renommé "KLS3 Auto-École"). `GOOGLE_VISION_API_KEY` restreinte à Cloud Vision API. À migrer vers un projet GCP dédié si le volume le justifie.

---

## Démo / preuve de concept

Objectif : `auto-ecole.kls3-dev.com`, utilisable comme support commercial. Données 100% fictives.
Élèves seed Wagner : Dupont Marie, Martin Lucas, Bernard Sophie (3 fictifs, aucune donnée réelle après purge du 3 juillet).

---

## Prochaines étapes

### Court terme (priorité décroissante)

- [ ] **Design — Parcours élève `/dossier`** : retouche visuelle (checklist, upload cards, `OcrValidationCard`). Magic link de test requis pour l'inspection en live.
- [ ] **Design — Dashboard `/eleves`** : hiérarchie typographique tableau, compteurs statuts visuels. Badges déjà migrés → effort réduit.
- [ ] **Design — Fiche élève détail** : cohérence post-dashboard.
- [ ] **Cohérence date de naissance — chemin saisie manuelle (US16)** : le contrôle ne couvre que `confirmOcrExtraction` (chemin MRZ). Sur `submitManualOcrEntry` : avertissement visuel non bloquant à implémenter.
- [ ] **Table `representants_legaux`** (US2bis) : session technique dédiée — schéma, déclenchement conditionnel, pipeline OCR CNI réutilisé.
- [ ] **Catégorisation `ants` / `facturation_kls3`** : migration + impact transfert Drive (US18) à trancher.
- [ ] Décider si US17 (validation secrétaire) doit être gatée sur le statut des `ocr_extractions` avant US18.
- [ ] Point ouvert couleur teal (`#0E6E64`) vs cobalt (`#3454D1`) comme fallback `--brand` — 1 ligne à changer dans le layout tenant.
- [ ] **PDF scanné sans couche texte (RIB)** : non couvert par le fix du 6 juillet — route actuellement vers l'échec OCR classique (US8/US16), pas de rasterisation en repli (pas de binaire système sur Vercel serverless). À évaluer si le volume de PDF scannés s'avère significatif en usage réel.

### Moyen terme
- [ ] OAuth Google Drive par tenant (US18)
- [ ] Export CSV structuré (US19)
- [ ] Page Paramètres tenant (email notification, email expéditeur, délai relance)
- [ ] Premier client pilote

---

## Git standard

```bash
cd /Users/Eric2/kls3-dev/kls3-auto-ecole
git add .
git commit -m "feat: description"
git pull origin main --no-rebase
git push origin main
```

---

## Pour démarrer une nouvelle discussion

Colle ce fichier en début de conversation avec :

> "Voici le contexte complet de KLS3 Auto-École. Aujourd'hui je veux travailler sur [sujet]."
