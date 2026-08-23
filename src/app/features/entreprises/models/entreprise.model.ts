export interface Entreprise {
    id: string;
    raisonSociale: string;
    siret?: string;
    adresse?: string;
    adresse2?: string;
    adresse3?: string;
    ville?: string;
    paysId?: string;
    corpsDeMetierId?: string;
    telephone?: string;
    telephone2?: string;
    telephone3?: string;
    email?: string;
    email2?: string;
    email3?: string;
    siren?: string;
    rcsRci?: string;
    tvaIntra?: string;
    numCotisant?: string;
    responsableSignataireAgrement?: string;
    commentaire?: string;
    dateDesactivation?: string;
    actif: boolean;
    // Nom du chantier sur lequel cette entreprise est actuellement affectée (absent/null
    // = aucun, affiché "Disponible") — à ne pas confondre avec `actif` ci-dessus, un
    // simple interrupteur administratif sans lien avec une affectation réelle.
    chantierActuel?: string | null;
    // Rang(s) (PRINCIPALE/STT1/STT2) sur ses chantiers en cours — absent/null = aucune
    // affectation active. Plusieurs rangs distincts possibles, séparés par ", ".
    rangActuel?: string | null;
    createdAt: string;
}

export interface CreateEntrepriseRequest {
    raisonSociale: string;
    siret?: string;
    adresse?: string;
    adresse2?: string;
    adresse3?: string;
    ville?: string;
    paysId?: string;
    corpsDeMetierId?: string;
    telephone?: string;
    telephone2?: string;
    telephone3?: string;
    email?: string;
    email2?: string;
    email3?: string;
    siren?: string;
    rcsRci?: string;
    tvaIntra?: string;
    numCotisant?: string;
    responsableSignataireAgrement?: string;
    commentaire?: string;
}

export type RoleEntreprise = 'PRINCIPALE' | 'STT1' | 'STT2';

export interface AffectationEntrepriseChantier {
    id: string;
    chantierId: string;
    // Nom du chantier, résolu côté backend — présent uniquement sur la liste transverse
    // (GET /entreprises/affectations), absente ailleurs (le chantier est déjà connu du contexte).
    nomChantier?: string;
    entrepriseId: string;
    // Raison sociale de l'entreprise affectée, résolue côté backend (une Entreprise n'a pas le
    // droit d'appeler /entreprises/{id} pour une autre entreprise) — absente sur les réponses
    // qui ne la fournissent pas (ex: GET /entreprises/{id}/chantiers, toujours "soi-même").
    raisonSocialeEntreprise?: string;
    role: RoleEntreprise;
    affectationParenteId?: string;
    dateDebut: string;
    dateFin?: string;
    statut: string;
    // Email/téléphone/adresse de contact propres à CETTE relation (entreprise, chantier),
    // distincts des coordonnées principales de l'entreprise — stockés seulement pour
    // l'instant, aucun envoi réel ne les utilise encore (voir modèle validé).
    emailContact?: string;
    telephoneContact?: string;
    adresseContact?: string;
}

export interface AffecterEntrepriseRequest {
    entrepriseId: string;
    role: RoleEntreprise;
    affectationParenteId?: string;
}
