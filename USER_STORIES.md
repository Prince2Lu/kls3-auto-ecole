# KLS3 Auto-École — User Stories

> Document vivant : à mettre à jour au fil des sessions, en fonction des besoins et retours terrain.
> Dernière mise à jour : 6 juillet 2026 — support PDF pour l'OCR RIB (US15) livré et testé.
> Structure par EPIC (parcours fonctionnel), fusion de la version persona du 30/06 et de la version EPIC retravaillée le même jour.

---

## EPIC 1 — Démarrer une inscription

**US1 — Accéder au formulaire**
En tant que futur élève, je veux accéder à un formulaire d'inscription en ligne afin de démarrer mon dossier sans me déplacer.

**US2 — Remplir mes informations**
En tant que futur élève, je veux renseigner mes informations personnelles afin de constituer mon dossier administratif.
Champs de base : nom, prénom, email, date de naissance, formule choisie.
*Décision actée (2 juillet 2026) : la date de naissance est collectée à l'inscription, en plus de l'extraction OCR CNI. Ce n'est pas une double saisie manuelle — l'élève la renseigne une seule fois, et l'OCR ne la re-demande à personne : il l'extrait automatiquement en arrière-plan et la compare à la valeur déclarée. Écart détecté → vérification secrétaire, même mécanisme que les autres écarts OCR (US16). L'OCR CNI passe ainsi d'un rôle de source unique de la donnée à un rôle de contrôle de cohérence a posteriori — plus robuste qu'avant (détecte aussi une éventuelle falsification, pas seulement un échec de lecture). Raison de la collecte anticipée : la date de naissance conditionne des pièces réglementaires (ASSR2 < 21 ans, JDC < 25 ans — voir US24bis) et la nécessité d'un représentant légal (mineur — voir US2bis), qui doivent être connues dès l'affichage de la liste de documents à fournir, avant tout upload/OCR. Téléphone et adresse restent hors formulaire.*
*Décision actée (3 juillet 2026) : l'adresse de référence est celle de la CNI (et non celle du justificatif de domicile, qui peut légitimement différer si l'élève a déménagé récemment). Charge à la secrétaire de corriger manuellement si l'adresse s'avère incorrecte ou périmée. Non implémenté à ce jour — `parse-cni.ts` n'extrait actuellement que nom/prénom/date de naissance, pas l'adresse ; à ajouter si le besoin d'exposer cette donnée en structuré se confirme (voir Parking Lot).*

**US2bis — Représentant légal (élève mineur)**
En tant que futur élève mineur, je veux que mon dossier intègre les informations et pièces de mon représentant légal afin de répondre à l'exigence réglementaire ANTS (mêmes pièces d'identité que l'élève, côté représentant).
*Décision actée (2 juillet 2026) : la majorité est calculée automatiquement dès l'inscription à partir de la date de naissance (US2). Modélisé comme un second profil léger rattaché au dossier élève (pas un simple champ texte), car le représentant légal doit fournir sa propre pièce d'identité — donc son propre document à uploader, son propre passage par le pipeline OCR CNI existant (réutilisé tel quel), et sa propre validation secrétaire. Déclenché uniquement si mineur détecté ; sans impact sur le parcours d'un élève majeur.*

**US3 — Recevoir un magic link**
En tant que futur élève, je veux recevoir un magic link par email afin d'accéder à mon espace sans mot de passe et sans création de compte.
*(Pas de SMS — email uniquement, décision actée.)*

**US4 — Reprendre mon dossier plus tard**
En tant que futur élève, je veux pouvoir reprendre mon dossier là où je l'ai laissé via mon magic link afin de ne pas recommencer mon inscription.

---

## EPIC 2 — Dépôt et validation des documents

**US5 — Déposer mes documents**
En tant que futur élève, je veux envoyer mes documents (CNI, photo, justificatif de domicile, ASSR/ASR le cas échéant, RIB) depuis mon téléphone ou ordinateur afin d'éviter les déplacements et échanges manuels.

**US5bis — Fournir un justificatif de domicile à jour**
En tant que futur élève, je veux déposer mon justificatif de domicile et déclarer sa date d'émission afin que l'auto-école puisse vérifier sa validité (moins de 6 mois — exigence ANTS).
*Décision actée (2 juillet 2026) : requis pour tous, sans condition (contrairement à ASSR2/JDC). Pas d'OCR sur ce document — format non standardisé (facture, quittance, attestation d'hébergement...), sans label ni position de date fiable à cibler par un parseur texte libre, contrairement à la CNI (MRZ normée ICAO) ou au RIB (structure IBAN/BIC universelle). Un OCR ici risquerait d'extraire silencieusement la mauvaise date (échéance au lieu d'émission) sans déclencher d'alerte. À la place : champ date déclaratif rempli par l'élève au moment de l'upload ("date d'émission du document"). Un document dont `date_document + 6 mois < aujourd'hui` passe au statut `perime` (distinct de `recu`), repasse le dossier en incomplet côté compteur secrétaire (US12), et déclenche un email automatique demandant un document à jour — via le même mécanisme de cron que les relances existantes (US7/US13), pas une nouvelle brique d'infra.*

**US6 — Voir les documents manquants**
En tant que futur élève, je veux voir les documents encore nécessaires afin de compléter mon dossier rapidement.

**US7 — Être relancé automatiquement**
En tant que futur élève, je veux recevoir des rappels automatiques si mon dossier reste incomplet après X jours (délai défini par mon auto-école) afin de ne pas oublier de le compléter.

**US8 — Être relancé en cas d'échec de lecture d'un document**
En tant que futur élève, si un document que j'ai envoyé n'a pas pu être lu automatiquement (photo illisible, mauvais document), je veux être prévenu afin de le re-uploader.

**US9 — Recevoir une confirmation**
En tant que futur élève, je veux être informé lorsque mon dossier est validé afin de savoir que mon inscription est finalisée.

---

## EPIC 3 — Gestion administrative côté auto-école

**US10 — Recevoir automatiquement les nouveaux dossiers**
En tant qu'auto-école, je veux voir apparaître automatiquement les nouvelles inscriptions afin d'éviter les saisies manuelles.

**US11 — Centraliser les documents**
En tant que secrétaire, je veux retrouver tous les documents d'un élève au même endroit afin de traiter les dossiers plus rapidement.

**US12 — Identifier les dossiers incomplets**
En tant que secrétaire, je veux voir immédiatement les dossiers incomplets (compteurs par statut) afin de prioriser les actions nécessaires.

**US13 — Automatiser les relances**
En tant que secrétaire, je veux que les relances soient envoyées automatiquement afin de réduire les tâches répétitives, tout en gardant une visibilité sur ce qui a été envoyé en mon nom (ex. "3 relances automatiques envoyées aujourd'hui").

**US14 — Déclencher une relance manuelle**
En tant que secrétaire, je veux pouvoir déclencher une relance manuelle à tout moment si besoin, en complément des relances automatiques.

**US15 — Valider les données extraites par OCR**
En tant que secrétaire, quand un élève dépose un RIB, je veux voir les données extraites automatiquement (IBAN, BIC, titulaire), déjà vérifiées par checksum, et les confirmer en un clic avant qu'elles soient considérées comme validées — jamais d'export automatique sans ma confirmation.
La même logique s'applique aux données extraites de la CNI (nom, prénom, date de naissance).
*Note technique (6 juillet 2026) : le RIB peut désormais être déposé en PDF natif (majorité des cas en pratique, RIB bancaires téléchargés) en plus de l'image — extraction du texte via `pdf-parse`, même pipeline de validation ensuite (checksum, confirmation secrétaire en un clic). Testé de bout en bout sur un RIB Caisse d'Épargne avec mise en page en tableau. PDF scanné (sans couche texte) : non couvert, route vers le fallback US16.*

**US16 — Saisir manuellement en cas d'échec OCR**
En tant que secrétaire, si l'OCR échoue malgré plusieurs tentatives, je veux pouvoir saisir manuellement les données (IBAN/BIC/titulaire, infos CNI) afin de débloquer le dossier sans dépendre de l'extraction automatique.
Statuts de dossier à distinguer : *en attente OCR* / *échec OCR — action élève requise* / *échec OCR — saisie manuelle secrétaire requise* / *validé*.

**US17 — Valider un dossier complet**
En tant que secrétaire, je veux valider un dossier complet en quelques clics (action explicite et unique) afin de simplifier le traitement administratif — c'est cette action, et uniquement elle, qui déclenche la suite (transfert + notification élève).

**US18 — Transfert automatique vers Google Drive**
En tant que secrétaire, quand je valide un dossier complet, je veux que les pièces soient automatiquement transférées vers mon Google Drive (connecté en OAuth) afin de ne pas avoir à les télécharger/reclasser manuellement, et de garantir qu'aucun document d'identité ne reste stocké côté serveur KLS3 (argument confiance/RGPD).

**US19 — Exporter les données vers mon logiciel métier**
En tant que secrétaire, je veux exporter un CSV structuré des élèves afin de l'importer dans mon logiciel métier existant (Code Rousseau, ECF...), en l'absence d'API fiable dans le secteur.

**US20 — Suivre l'avancement des dossiers**
En tant que responsable d'auto-école, je veux suivre l'état des dossiers afin d'avoir une visibilité opérationnelle.
Statuts réels : `en_attente` (dossier créé, pas encore de documents) / `documents_attente` (documents manquants) / `documents_complets` (tous les documents requis reçus, en attente de validation secrétaire — calculé automatiquement) / `paiement_attente` / `complet` (validé manuellement par la secrétaire, US17) / `refuse`.
*Le passage à `documents_complets` est automatique (dès que les 4 documents requis sont `recu`). Le passage à `complet` reste exclusivement une action secrétaire explicite (US17) — jamais automatique, même si tous les documents sont reçus.*

**US21 — Supprimer les données d'un élève sur demande**
En tant que secrétaire, je veux pouvoir purger manuellement la fiche d'un élève (métadonnées + traces) suite à une demande explicite de sa part (ou de son représentant légal si mineur), afin de répondre à une demande RGPD.
*Décision actée : pas de purge automatique programmée — rétention indéfinie par défaut, pour permettre une éventuelle relance commerciale future (voir Parking Lot). À mentionner dans les CGU/mentions RGPD du client final.*

---

## EPIC 4 — Paramétrage de l'expérience

**US22 — Personnaliser l'identité visuelle**
En tant qu'auto-école, je veux ajouter mon logo et mes couleurs afin que le parcours soit cohérent avec mon image.

**US23 — Configurer les types de dossiers**
En tant qu'auto-école, je veux créer différents types de dossiers (ex. Permis B, AAC, Moto, CPF) afin d'adapter les documents demandés selon le besoin.
*⚠️ À discuter à part avant développement : ça dépasse la notion de "formule" déjà actée dans CLAUDE.md, ça touche potentiellement la structure des documents requis et le pricing. Ne pas l'enterrer comme un simple champ de paramétrage tant que ce n'est pas tranché.*

**US24 — Définir les documents requis**
En tant qu'auto-école, je veux choisir les documents obligatoires par formule/type de dossier afin d'automatiser la collecte documentaire.
*Note actée (2 juillet 2026) : distinguer deux catégories de documents plutôt qu'une liste plate — pièces réglementaires `ants` (à transmettre au client via US18) vs pièce `facturation_kls3` (le RIB, qui n'apparaît dans aucune liste réglementaire ANTS et ne doit pas forcément suivre le même sort dans le transfert Drive). Impact à retrancher précisément lors de la session US18.*

**US24bis — Documents conditionnés par l'âge**
En tant qu'auto-école, je veux que la liste de documents demandés à l'élève s'adapte automatiquement à son âge (ASSR2/ASR si moins de 21 ans, attestation de recensement/JDC si 17 à 25 ans inclus) afin de ne demander que les pièces réellement exigées par l'ANTS.
*Décision actée (2 juillet 2026) : rendu possible par la collecte de la date de naissance dès l'inscription (US2) — la liste de documents affichée à l'élève est donc correcte dès le départ, pas de "deuxième vague" de pièces demandées après coup (ce qui aurait contredit l'esprit d'US6). Bornes précisées le 3 juillet, à l'implémentation : ASSR2/ASR sans borne basse (< 21 ans strict), JDC avec borne basse à 17 ans (en dessous, l'élève n'a généralement pas encore pu faire sa JDC) — 17 ≤ âge ≤ 25 ans, les deux bornes incluses. Élèves sans date de naissance en base (inscrits avant le 3 juillet, champ non collecté à l'époque) : ni ASSR2 ni JDC exigés par défaut, comportement sûr qui n'ajoute pas d'exigence surprise sur un dossier déjà en cours.*

**US25 — Personnaliser les messages automatiques**
En tant qu'auto-école, je veux modifier les emails automatiques (relance, confirmation) afin d'adapter la communication à mon établissement.

**US26 — Configurer les relances**
En tant qu'auto-école, je veux définir le délai (en jours) avant déclenchement d'une relance automatique, propre à mon établissement.

**US27 — Définir l'email de notification**
En tant que gérant, je veux définir l'email qui reçoit une alerte à chaque nouvelle inscription élève.

**US28 — Connecter mon Google Drive**
En tant que gérant, je veux connecter mon compte Google Drive en OAuth afin de recevoir automatiquement les documents validés.

---

## EPIC 5 — Vision et pilotage

**US29 — Voir les statistiques d'onboarding**
En tant que responsable d'auto-école, je veux visualiser des statistiques (dossiers incomplets, temps moyen de validation, documents les plus manquants, taux de finalisation) afin d'identifier les frictions administratives.

---

## EPIC 6 — KLS3 (admin produit, côté éditeur)

**US30 — Créer un nouveau tenant**
En tant que KLS3, je peux créer un nouveau tenant (auto-école) avec son slug, sans toucher au code métier.

**US31 — Configurer les valeurs par défaut d'un nouveau client**
En tant que KLS3, je peux configurer les pièces requises et formules par défaut pour accélérer l'onboarding d'un nouveau client.

**US32 — Process d'ajout de sous-domaine reproductible**
En tant que KLS3, je veux que l'ajout d'un sous-domaine reste un processus reproductible (~5 min documentés dans CLAUDE.md), idéalement scriptable plus tard.

**US33 — Démo commerciale sans données réelles**
En tant que KLS3, je veux pouvoir démontrer le produit via `auto-ecole.kls3-dev.com` sans exposer de vraies données client.

**US34 — Principe de non-redéveloppement**
En tant que KLS3 (vision long terme), je veux que chaque nouveau client soit une opération de configuration (logo, couleurs, formules, documents requis, connexion Drive), pas de redéveloppement — ce principe doit guider toutes les US ci-dessus : tout doit rester pilotable par paramétrage tenant.

---

## Décisions de scope actées

| Sujet | Décision |
|---|---|
| Délai de relance | Configurable par tenant dès le départ (US26), pas de valeur en dur. |
| Fallback échec OCR | Double voie : relance élève pour re-upload (US8) **et** saisie manuelle secrétaire en dernier recours (US16). |
| Déclencheur transfert Drive | Action explicite "dossier complet et validé" par la secrétaire (US17 → US18) — un seul déclencheur, pas de transfert pièce par pièce. |
| Suppression RGPD | Sur demande uniquement (US21), pas de purge automatique programmée. Rétention indéfinie assumée comme choix produit. |
| Magic link | Email uniquement, pas de SMS. |
| Statut "documents complets" | Calculé automatiquement dès que tous les documents requis sont reçus (`documents_complets`), mais ne déclenche jamais `complet` — ce dernier reste une action secrétaire explicite (US17), seul déclencheur du transfert Drive (US18). |
| Date de naissance (US2) | Collectée au formulaire d'inscription, en plus de l'OCR CNI. L'OCR devient un contrôle de cohérence a posteriori, pas la source unique — écart détecté → vérification secrétaire (même mécanisme qu'US16). |
| Représentant légal (US2bis) | Majorité calculée automatiquement dès l'inscription. Modélisé comme un second profil léger rattaché au dossier, avec son propre jeu de documents et son propre passage OCR CNI — pas un simple champ. |
| Justificatif de domicile (US5bis) | Requis pour tous, sans condition. Pas d'OCR — date d'émission déclarative, péremption à 6 mois, statut `perime`, email automatique via le cron existant. |
| Documents conditionnés par l'âge (US24bis) | ASSR2/ASR (< 21 ans, sans borne basse) et JDC (17-25 ans inclus) déterminés dès l'inscription grâce à la date de naissance — pas de liste en deux temps. Élève sans date de naissance en base : aucun des deux exigé par défaut. |
| Catégorisation des documents | Deux catégories : `ants` (pièce réglementaire à transmettre) vs `facturation_kls3` (RIB) — impact sur le transfert Drive (US18) à retrancher lors de cette session. |

---

## Parking Lot (idées notées, hors scope actuel)

- **Relance commerciale annuelle** : s'appuyer sur l'historique élève conservé (pas de purge auto) pour proposer des offres ultérieures (perfectionnement, stage récupération de points, etc.). Nécessitera un consentement marketing explicite à l'inscription si activé un jour.
- **Types de dossiers multiples** (Permis B, AAC, Moto, CPF — US23) : changement de scope potentiellement structurant (documents requis, pricing). À cadrer dans une session dédiée avant implémentation.
- **Candidat libre (parcours NEPH, code seul)** : possible troisième axe de typage de dossier (orthogonal ou superposé à US23 — à trancher). En attente de validation terrain par Eric auprès de plusieurs auto-écoles : proposent-elles réellement un accompagnement administratif candidat libre ? Ne pas modéliser tant que ce n'est pas confirmé côté marché.
- **Champ téléphone au formulaire initial** : reste un point ouvert, non traité dans cette session (date de naissance et adresse sont désormais réglées — voir US2 et Décisions de scope actées).
- **Extraction OCR de l'adresse CNI** : décision actée le 3 juillet que l'adresse de référence est celle de la CNI (correction manuelle secrétaire si besoin), mais l'extraction elle-même n'est pas implémentée — `parse-cni.ts` ne couvre que nom/prénom/date de naissance. À ajouter seulement si un besoin concret d'exposer l'adresse en donnée structurée se confirme (aujourd'hui, la secrétaire peut lire le document directement).

---

## Note de process

Ce document évolue au fil des sessions et des retours terrain (premier client pilote notamment). Mettre à jour ce fichier plutôt que de le considérer figé — comme CLAUDE.md, il fait partie du contexte à coller en début de nouvelle discussion si besoin de revenir sur le scope produit.
