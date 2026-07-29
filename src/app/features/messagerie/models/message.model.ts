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

export type EvenementDeclencheur = 'DOCUMENT_EXPIRATION' | 'CHANTIER_CONTROLE_A_VENIR';

export type StatutMessagePlanifie = 'EN_ATTENTE' | 'ENVOYE' | 'ANNULE';

export interface RegleAutomatisation {
    id: string;
    nom: string;
    evenementDeclencheur: EvenementDeclencheur;
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
    evenementDeclencheur: EvenementDeclencheur;
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
