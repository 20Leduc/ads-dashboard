// Liens d'invitation /invite/<code> : une invitation = un client + un email.
// Le rattachement du compte se fait côté base (claim_client_invites) à la connexion.

export const isInviteCode = (code) => typeof code === 'string' && /^[0-9a-f]{32}$/.test(code)

// L'invitation n'expose qu'un email masqué ("l***@gmail.com") : on vérifie au moins
// la première lettre et le domaine avant d'envoyer le lien de connexion.
export function emailMatchesHint(email, hint) {
  const typed = String(email || '').trim().toLowerCase()
  const [hintStart, hintDomain] = String(hint || '').toLowerCase().split('***@')
  const [local, domain] = typed.split('@')
  if (!local || !domain || !hintDomain) return false
  return local.startsWith(hintStart) && domain === hintDomain
}

export function inviteStatusMessage(status, clientName = 'ce client') {
  if (status === 'valid') return null
  if (status === 'expired') return `Cette invitation au dashboard ${clientName} a expiré. Demandez-en une nouvelle.`
  if (status === 'accepted') return `Cette invitation au dashboard ${clientName} a déjà été utilisée. Connectez-vous avec la même adresse email.`
  if (status === 'revoked') return `Cette invitation au dashboard ${clientName} a été désactivée.`
  return 'Invitation introuvable. Vérifiez le lien reçu.'
}
