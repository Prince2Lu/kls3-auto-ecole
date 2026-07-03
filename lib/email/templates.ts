export function magicLinkEmail(
  prenom: string,
  lien: string
): { subject: string; html: string } {
  return {
    subject: "Complétez votre dossier",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#18181b">
        <p>Bonjour ${escapeHtml(prenom)},</p>
        <p>Votre inscription a bien été enregistrée.</p>
        <p>Cliquez sur le bouton ci-dessous pour compléter votre dossier et déposer vos pièces justificatives :</p>
        <p style="margin:32px 0">
          <a href="${lien}" style="background:#4B7BF5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
            Compléter mon dossier
          </a>
        </p>
        <p style="font-size:13px;color:#71717a">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
        <a href="${lien}">${lien}</a></p>
        <p style="font-size:13px;color:#71717a;margin-top:32px">Ce lien est personnel — ne le partagez pas.</p>
      </div>
    `,
  };
}

export function notificationNouvelleInscription(params: {
  nom: string;
  prenom: string;
  email: string;
  formule: string;
  tenantName: string;
}): { subject: string; html: string } {
  const fullName = `${params.prenom} ${params.nom}`;
  return {
    subject: `Nouvelle inscription — ${fullName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#18181b">
        <p>Une nouvelle inscription vient d'être enregistrée sur <strong>${escapeHtml(params.tenantName)}</strong>.</p>
        <ul style="line-height:1.8">
          <li><strong>Élève :</strong> ${escapeHtml(fullName)}</li>
          <li><strong>Email :</strong> ${escapeHtml(params.email)}</li>
          <li><strong>Formule :</strong> ${escapeHtml(params.formule)}</li>
        </ul>
        <p style="font-size:13px;color:#71717a">Connectez-vous à votre espace collaborateur pour suivre le dossier.</p>
      </div>
    `,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function reminderEmail(
  prenom: string,
  lien: string,
  tenantName: string
): { subject: string; html: string } {
  return {
    subject: `Rappel — complétez votre dossier — ${tenantName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#18181b">
        <p>Bonjour ${escapeHtml(prenom)},</p>
        <p>Il manque encore des pièces justificatives dans votre dossier chez <strong>${escapeHtml(tenantName)}</strong>.</p>
        <p>Cliquez sur le bouton ci-dessous pour reprendre votre dossier et déposer les documents manquants :</p>
        <p style="margin:32px 0">
          <a href="${lien}" style="background:#4B7BF5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
            Compléter mon dossier
          </a>
        </p>
        <p style="font-size:13px;color:#71717a">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
        <a href="${lien}">${lien}</a></p>
      </div>
    `,
  };
}

export function documentPerimeEmail(
  prenom: string,
  lien: string,
  tenantName: string
): { subject: string; html: string } {
  return {
    subject: "Votre justificatif de domicile a expiré",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#18181b">
        <p>Bonjour ${escapeHtml(prenom)},</p>
        <p>Le justificatif de domicile que vous avez déposé chez <strong>${escapeHtml(tenantName)}</strong> a plus de 6 mois et n'est plus valide.</p>
        <p>Cliquez sur le bouton ci-dessous pour accéder à votre dossier et déposer un nouveau justificatif de domicile :</p>
        <p style="margin:32px 0">
          <a href="${lien}" style="background:#4B7BF5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
            Mettre à jour mon dossier
          </a>
        </p>
        <p style="font-size:13px;color:#71717a">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
        <a href="${lien}">${lien}</a></p>
      </div>
    `,
  };
}
