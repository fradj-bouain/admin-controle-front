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
    siren?: string;
    rcsRci?: string;
    tvaIntra?: string;
    numCotisant?: string;
    responsableSignataireAgrement?: string;
    commentaire?: string;
    dateDesactivation?: string;
    actif: boolean;
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
    entrepriseId: string;
    role: RoleEntreprise;
    affectationParenteId?: string;
    dateDebut: string;
    dateFin?: string;
    statut: string;
}

export interface AffecterEntrepriseRequest {
    entrepriseId: string;
    role: RoleEntreprise;
    affectationParenteId?: string;
}
