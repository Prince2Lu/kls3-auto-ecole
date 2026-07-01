-- Ajout des nouvelles colonnes
alter table students add column nom text;
alter table students add column prenom text;

-- Migration des données existantes (split naïf sur le premier espace —
-- à corriger manuellement en base pour les cas particuliers si besoin)
update students
set
  prenom = split_part(full_name, ' ', 1),
  nom = nullif(trim(substring(full_name from position(' ' in full_name) + 1)), '')
where full_name is not null;

-- Rendre les nouvelles colonnes obligatoires une fois la migration de
-- données faite
alter table students alter column nom set not null;
alter table students alter column prenom set not null;

-- Supprimer l'ancienne colonne
alter table students drop column full_name;

-- Nombre de documents exigés par formule
alter table formulas add column documents_requis int not null default 4;
-- Ajuster manuellement les valeurs par formule après la migration si
-- certaines formules demandent un nombre différent (ex. Permis A2 = 3)
