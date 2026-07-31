export type DestinataireType = 'CLIENT' | 'ENTREPRISE' | 'UTILISATEUR';

export interface Message {
    id: string;
    expediteurUtilisateurId: string;
    destinataireType: DestinataireType;
    destinataireId: string;
    sujet: string;
    contenu: string;
    lu: boolean;
    createdAt: string;
}

export interface SendMessageRequest {
    destinataireType: DestinataireType;
    destinataireId: string;
    sujet: string;
    contenu: string;
}

export type CibleGroupe = 'SPECIFIQUE' | 'TOUS_UTILISATEURS' | 'TOUS_CLIENTS' | 'TOUTES_ENTREPRISES' | 'TOUS_SALARIES';

export type StatutMessagePlanifie = 'EN_ATTENTE' | 'ENVOYE' | 'ANNULE';

// Pas de compte/boîte de réception propre aux salariés dans cette appli :
// TOUS_SALARIES route côté backend vers l'entreprise employeuse.
export type TypeDeclencheur =
    | 'CHAMP_SURVEILLABLE'
    | 'CREATION_SALARIE'
    | 'CREATION_ENTREPRISE'
    | 'AFFECTATION_ENTREPRISE_CHANTIER'
    | 'PERIODIQUE'
    | 'MANUEL';

// Catalogue dynamique servi par GET /champs-surveillables : la liste des sources
// disponibles n'est plus figée côté frontend, elle reflète ce que le backend
// sait réellement détecter (voir ChampSurveillableRegistry côté backend).
export interface ChampSurveillable {
    id: string;
    entiteLibelle: string;
    champLibelle: string;
}

export interface RegleAutomatisation {
    id: string;
    nom: string;
    typeDeclencheur: TypeDeclencheur;
    champSurveillableId: string | null;
    nbJoursAvant: number;
    actif: boolean;
    cibleGroupe: CibleGroupe;
    destinataireType: DestinataireType | null;
    destinataireId: string | null;
    sujet: string;
    contenu: string;
    numeroInterne: string | null;
    titreInterne: string | null;
    nbEnvois: number;
    dernierEnvoi: string | null;
}

export interface CreateRegleAutomatisationRequest {
    nom: string;
    typeDeclencheur: TypeDeclencheur;
    champSurveillableId: string | null;
    nbJoursAvant: number;
    cibleGroupe: CibleGroupe;
    destinataireType: DestinataireType | null;
    destinataireId: string | null;
    sujet: string;
    contenu: string;
    numeroInterne: string | null;
    titreInterne: string | null;
}

export interface MessagePlanifie {
    id: string;
    regleId: string | null;
    expediteurUtilisateurId: string | null;
    cibleGroupe: CibleGroupe;
    destinataireType: DestinataireType | null;
    destinataireId: string | null;
    chantierId: string | null;
    sujet: string;
    contenu: string;
    dateEnvoiPrevue: string;
    statut: StatutMessagePlanifie;
    dateEnvoiReelle: string | null;
    createdAt: string;
}

export interface PlanifierMessageRequest {
    cibleGroupe: CibleGroupe;
    destinataireType: DestinataireType | null;
    destinataireId: string | null;
    chantierId: string | null;
    sujet: string;
    contenu: string;
    dateEnvoiPrevue: string;
}
