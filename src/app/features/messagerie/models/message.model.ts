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

export type CibleGroupe = 'SPECIFIQUE' | 'TOUS_UTILISATEURS' | 'TOUS_CLIENTS' | 'TOUTES_ENTREPRISES';

export type StatutMessagePlanifie = 'EN_ATTENTE' | 'ENVOYE' | 'ANNULE';

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
    champSurveillableId: string;
    nbJoursAvant: number;
    actif: boolean;
    cibleGroupe: CibleGroupe;
    destinataireType: DestinataireType | null;
    destinataireId: string | null;
    sujet: string;
    contenu: string;
}

export interface CreateRegleAutomatisationRequest {
    nom: string;
    champSurveillableId: string;
    nbJoursAvant: number;
    cibleGroupe: CibleGroupe;
    destinataireType: DestinataireType | null;
    destinataireId: string | null;
    sujet: string;
    contenu: string;
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
